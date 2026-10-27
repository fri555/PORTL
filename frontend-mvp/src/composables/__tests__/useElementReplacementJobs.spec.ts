import { describe, expect, it, vi } from 'vitest'
import { createElementReplacementRunner } from '../useElementReplacementJobs'
import { getDemoElementReplacementInput } from '../useElementReplacement'
import type { VideoTask } from '@/types/video-generation'
import type { ElementReplacementJob } from '@/types/element-replacement-job'
const date = '2026-10-26T03:00:00.000Z'
function job(status: ElementReplacementJob['status'] = 'pending'): ElementReplacementJob {
  return { id: 'request-11111111', providerTaskId: 'task-actual', status, createdAt: date, updatedAt: date, ...(status === 'completed' ? { result: { videoUrl: 'https://results.example.com/replaced.mp4', resolution: '720p', duration: 6 } } : {}) }
}
function setup(initial: VideoTask[] = []) {
  let tasks = initial
  const api = {
    connection: vi.fn(async () => ({ configured: true, uploadAvailable: true })),
    prepare: vi.fn(async (input: ReturnType<typeof getDemoElementReplacementInput>) => ({ ...structuredClone(input), prototypeDemo: false })),
    submit: vi.fn(async (id: string) => ({ ...job(), id })),
    poll: vi.fn(async (id: string) => ({ ...job('completed'), id })),
  }
  const save = vi.fn((task: VideoTask) => { tasks = [structuredClone(task), ...tasks.filter(item => item.id !== task.id)] })
  const runner = createElementReplacementRunner({ list: () => tasks, save, api })
  return { runner, api, save, list: () => tasks }
}
describe('real element replacement task lifecycle', () => {
  it('does not create or submit a task when the service is unconfigured', async () => {
    const { runner, api, list } = setup()
    api.connection.mockResolvedValue({ configured: false, uploadAvailable: false })
    await expect(runner.start(getDemoElementReplacementInput(), '替换测试')).rejects.toThrow(/LAS_API_KEY/)
    expect(list()).toEqual([])
    expect(api.submit).not.toHaveBeenCalled()
  })
  it('stops before the paid request if local task persistence fails', async () => {
    const { runner, api, save } = setup()
    save.mockImplementation(() => { throw new Error('quota') })
    await expect(runner.start(getDemoElementReplacementInput(), '替换测试')).rejects.toThrow(/保存/)
    expect(api.submit).not.toHaveBeenCalled()
    expect(runner.submitting.value).toBe(false)
  })
  it('persists a recovery request before submitting and blocks concurrent generation', async () => {
    const { runner, api, list } = setup()
    let finish!: (value: ElementReplacementJob) => void
    api.submit.mockImplementation(async id => {
      expect(list()[0]?.remoteJob?.id).toBe(id)
      return new Promise(resolve => { finish = resolve })
    })
    const start = runner.start(getDemoElementReplacementInput(), '  替换测试  ')
    await vi.waitFor(() => expect(api.submit).toHaveBeenCalledTimes(1))
    expect(await runner.start(getDemoElementReplacementInput(), '重复提交')).toBeNull()
    finish({ ...job(), id: list()[0]!.remoteJob!.id })
    await start
    expect(list()).toHaveLength(1)
    expect(list()[0]?.name).toBe('替换测试')
    expect(list()[0]?.input.prototypeDemo).toBe(false)
  })
  it('updates the same task and clears the previous result after saving succeeds', async () => {
    const input = { ...getDemoElementReplacementInput(), resultVideo: { id: 'old', name: 'old.mp4', kind: 'video' as const, source: 'url' as const, url: 'https://example.com/old.mp4' }, resultUsesOriginal: true }
    const old: VideoTask = { id: 'existing-task', name: '旧名称', operator: 'element-replace', status: 'completed', createdAt: date, input }
    const { runner, list } = setup([old])
    await runner.start(input, '新名称', old)
    expect(list()).toHaveLength(1)
    expect(list()[0]).toMatchObject({ id: 'existing-task', name: '新名称', createdAt: date, status: 'queued' })
    expect(list()[0]?.input).not.toHaveProperty('resultVideo')
    expect(list()[0]?.input).not.toHaveProperty('resultUsesOriginal')
    expect(old.input.resultVideo.url).toBe('https://example.com/old.mp4')
  })
  it('queries an uncertain submission without resubmitting it', async () => {
    const { runner, api, list } = setup()
    api.submit.mockRejectedValue(new TypeError('network disconnected'))
    const task = await runner.start(getDemoElementReplacementInput(), '替换测试')
    if (!task?.remoteJob) throw new Error('missing recovery task')
    expect(task.remoteJob.status).toBe('submission-unknown')
    await runner.refresh(task.id)
    expect(api.submit).toHaveBeenCalledTimes(1)
    expect(api.poll).toHaveBeenCalledWith(task.remoteJob.id)
    expect(list()[0]?.status).toBe('completed')
  })
  it('persists the actual cloud video while preserving the source after polling', async () => {
    const input = getDemoElementReplacementInput()
    const old: VideoTask = { id: 'task-view', name: '真实替换', operator: 'element-replace', status: 'processing', createdAt: date, input: { ...input, prototypeDemo: false }, remoteJob: job() }
    const { runner, list } = setup([old])
    await runner.refresh(old.id)
    expect(list()[0]?.input.sourceVideo.url).toBe(input.sourceVideo?.url)
    expect(list()[0]?.input.resultVideo.url).toBe('https://results.example.com/replaced.mp4')
    expect(list()[0]?.input.resultUsesOriginal).toBe(false)
    expect(list()[0]?.status).toBe('completed')
  })
  it('keeps temporary query errors separate from provider generation failures', async () => {
    const old: VideoTask = { id: 'task-view', name: '真实替换', operator: 'element-replace', status: 'processing', createdAt: date, input: { ...getDemoElementReplacementInput(), prototypeDemo: false }, remoteJob: job() }
    const { runner, api, list } = setup([old])
    api.poll.mockRejectedValue(new Error('网络暂时不可用'))
    await runner.refresh(old.id)
    expect(list()[0]?.status).toBe('processing')
    expect(runner.queryErrors.value[old.id]).toContain('网络暂时不可用')
    api.poll.mockResolvedValue({ ...job('failed'), error: { code: 'Content.Invalid', message: '参考图无法读取' } })
    await runner.refresh(old.id)
    expect(list()[0]?.status).toBe('failed')
    expect(list()[0]?.remoteJob?.error?.message).toBe('参考图无法读取')
  })
  it('preserves pending and timeout as distinct product statuses', async () => {
    const pending: VideoTask = { id: 'task-status', name: '状态映射', operator: 'element-replace', status: 'processing', createdAt: date, input: { ...getDemoElementReplacementInput(), prototypeDemo: false }, remoteJob: job('running') }
    const { runner, api, list } = setup([pending])
    api.poll.mockResolvedValue(job('pending'))
    await runner.refresh(pending.id)
    expect(list()[0]?.status).toBe('queued')
    api.poll.mockResolvedValue(job('timeout'))
    await runner.refresh(pending.id)
    expect(list()[0]?.status).toBe('timeout')
  })
  it('ignores a late response for an older generation request', async () => {
    const old: VideoTask = { id: 'task-view', name: '真实替换', operator: 'element-replace', status: 'processing', createdAt: date, input: { ...getDemoElementReplacementInput(), prototypeDemo: false }, remoteJob: job() }
    const { runner, api, save, list } = setup([old])
    let resolve!: (value: ElementReplacementJob) => void
    api.poll.mockImplementation(() => new Promise(r => { resolve = r }))
    const polling = runner.refresh(old.id)
    save({ ...old, remoteJob: { ...job(), id: 'request-new-22222222' } })
    resolve(job('completed'))
    await polling
    expect(list()[0]?.remoteJob?.id).toBe('request-new-22222222')
    expect(list()[0]?.status).toBe('processing')
  })
})
