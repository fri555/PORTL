import { ref } from 'vue'
import type { ElementReplacementInput } from '@/types/element-replacement'
import type { ElementReplacementConnection, ElementReplacementJob } from '@/types/element-replacement-job'
import type { VideoTask } from '@/types/video-generation'
import { replacementSourceDuration } from '@/utils/elementReplacementPrompt'

interface RunnerOptions {
  list: () => VideoTask[]
  save: (task: VideoTask) => void
  api: {
    connection: () => Promise<ElementReplacementConnection>
    prepare: (input: ElementReplacementInput) => Promise<ElementReplacementInput>
    submit: (id: string, input: ElementReplacementInput) => Promise<ElementReplacementJob>
    poll: (id: string) => Promise<ElementReplacementJob>
  }
}
const message = (error: unknown) => error instanceof Error ? error.message : '视频服务暂时不可用'
const terminal = (job: ElementReplacementJob) => ['completed', 'failed', 'timeout'].includes(job.status)

export function createElementReplacementRunner(options: RunnerOptions) {
  const submitting = ref(false)
  const stage = ref('')
  const queryErrors = ref<Record<string, string>>({})
  const querying = new Set<string>()

  function applyJob(task: VideoTask, remoteJob: ElementReplacementJob): VideoTask {
    const input: Record<string, any> = { ...task.input, prototypeDemo: false }
    if (remoteJob.status === 'completed' && remoteJob.result?.videoUrl) {
      input.resultVideo = { id: remoteJob.providerTaskId ?? remoteJob.id, kind: 'video', source: 'url', name: `${task.name}.mp4`, url: remoteJob.result.videoUrl, duration: remoteJob.result.duration }
      input.resultUsesOriginal = false
    }
    const status = remoteJob.status === 'completed' ? 'completed'
      : remoteJob.status === 'timeout' ? 'timeout'
        : remoteJob.status === 'failed' ? 'failed'
          : 'processing'
    return { ...task, input, remoteJob, status }
  }
  function current(id: string, requestId: string) {
    return options.list().find(task => task.id === id && task.remoteJob?.id === requestId)
  }
  function persistJob(id: string, remoteJob: ElementReplacementJob) {
    const task = current(id, remoteJob.id)
    if (!task) return null
    const next = applyJob(task, remoteJob)
    try { options.save(next); delete queryErrors.value[id] }
    catch { queryErrors.value[id] = `任务已受理，本地记录更新失败；请重试查询。任务号：${remoteJob.providerTaskId ?? remoteJob.id}` }
    return next
  }
  async function start(input: ElementReplacementInput, rawName: string, previous?: VideoTask): Promise<VideoTask | null> {
    if (submitting.value) return null
    const name = rawName.trim()
    if (!name || name.length > 20) throw new Error('请输入20个字符以内的任务名称')
    submitting.value = true
    try {
      stage.value = '正在连接视频服务'
      if (!(await options.api.connection()).configured) throw new Error('视频服务尚未配置，请在 backend/.env 中设置 LAS_API_KEY')
      stage.value = '正在准备和上传素材'
      const prepared = await options.api.prepare(input)
      const clean = { ...prepared, prototypeDemo: false, audioUrls: [], settings: { ...prepared.settings, duration: replacementSourceDuration(prepared.sourceVideo?.duration) } }
      delete clean.resultVideo
      delete clean.resultUsesOriginal
      const now = new Date().toISOString()
      const requestId = crypto.randomUUID()
      const task: VideoTask = { id: previous?.id ?? `video-${crypto.randomUUID()}`, name, operator: 'element-replace', status: 'processing', createdAt: previous?.createdAt ?? now, input: clean,
        remoteJob: { id: requestId, status: 'submitting', createdAt: now, updatedAt: now } }
      try { options.save(task) } catch { throw new Error('本地任务保存失败，尚未提交生成，请释放浏览器存储空间后重试') }
      stage.value = '正在提交生成任务'
      let remoteJob: ElementReplacementJob
      try { remoteJob = await options.api.submit(requestId, clean) }
      catch (error) {
        const failure = error as { status?: number; code?: string }
        remoteJob = { ...task.remoteJob!, status: failure.status && failure.status < 500 ? 'failed' : 'submission-unknown', updatedAt: new Date().toISOString(), error: { code: failure.code ?? 'Submission.Unconfirmed', message: message(error) } }
      }
      return persistJob(task.id, remoteJob) ?? task
    } finally { submitting.value = false; stage.value = '' }
  }
  async function refresh(id: string): Promise<void> {
    const task = options.list().find(item => item.id === id)
    const remote = task?.remoteJob
    if (!task || !remote || terminal(remote) || querying.has(remote.id)) return
    querying.add(remote.id)
    try {
      const job = await options.api.poll(remote.id)
      if (!current(id, remote.id)) return
      if (job.id !== remote.id) throw new Error('任务查询返回了不匹配的任务记录')
      const significant = (value: ElementReplacementJob) => JSON.stringify([value.status, value.providerTaskId, value.error, value.result])
      if (significant(job) !== significant(remote)) persistJob(id, job)
      else delete queryErrors.value[id]
    } catch (error) {
      if (current(id, remote.id)) queryErrors.value[id] = message(error)
    } finally { querying.delete(remote.id) }
  }
  async function refreshPending() {
    await Promise.all(options.list().filter(task => task.operator === 'element-replace' && ['queued', 'processing'].includes(task.status) && task.remoteJob).map(task => refresh(task.id)))
  }
  return { start, refresh, refreshPending, submitting, stage, queryErrors }
}
