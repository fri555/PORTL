import { createServer, type Server } from 'node:http'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { elementReplacementPlugin } from './element-replacement'

const stores: string[] = []
const servers: Server[] = []
const key = 'private-test-api-key'
const input = () => ({
  replacementType: 'person',
  sourceVideo: { url: 'blob:local', remoteUrl: 'tos://test/source.mp4' },
  groups: [
    { description: '左边女子', reference: { url: 'https://example.com/woman.jpg' } },
    { description: '右边男子', reference: { url: 'https://example.com/man.jpg' } },
  ],
  preservePrompt: '保留动作和背景', audioUrls: ['tos://test/audio.mp3'],
  settings: { model: 'seedance-2.0-mini', resolution: '720p', ratio: 'adaptive', generateAudio: true, duration: null as number | null, watermark: false, returnLastFrame: true, priority: 0, executionExpiresAfter: 172800 },
  prototypeDemo: true,
})
const pending = (id = 'provider-1') => new Response(JSON.stringify({ metadata: { task_id: id, task_status: 'PENDING', business_code: '0', error_msg: '' } }))

async function start(options: { fetch?: typeof fetch; getConfig?: () => any; storageDir?: string; uploadMedia?: any } = {}) {
  const storageDir = options.storageDir ?? await mkdtemp(join(tmpdir(), 'element-replacement-'))
  if (!options.storageDir) stores.push(storageDir)
  const plugin = elementReplacementPlugin({ getConfig: () => ({ apiKey: key }), storageDir, ...options })
  let middleware: any
  const hook = plugin.configureServer as any
  hook({ middlewares: { use(value: any) { middleware = value } } })
  const server = createServer((req, res) => middleware(req, res, () => { res.statusCode = 404; res.end() }))
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as { port: number }).port
  const base = `http://127.0.0.1:${port}`
  const call = async (path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const response = await fetch(`${base}/api/video/element-replacement${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) })
    return { status: response.status, data: await response.json() }
  }
  return { call, storageDir, base }
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))))
  await Promise.all(stores.splice(0).map(dir => rm(dir, { force: true, recursive: true })))
})

describe('real element replacement API', () => {
  it('derives duration from the source instead of old controls and omits audio references', async () => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(pending())
    const api = await start({ fetch: upstream })
    const request = { ...input(), sourceVideo: { ...input().sourceVideo, duration: 6.7 }, settings: { ...input().settings, duration: 99 } }
    await api.call('/jobs', { requestId: 'source-duration', input: request })
    const body = JSON.parse(String(upstream.mock.calls[0]![1]?.body))
    expect(body.data.duration).toBe(7)
    expect(body.data).not.toHaveProperty('audio_urls')
  })
  it('reports missing connection without exposing server configuration', async () => {
    const api = await start({ getConfig: () => ({ apiKey: '' }) })
    expect(await api.call('/connection')).toEqual({ status: 200, data: { configured: false, uploadAvailable: false } })
    expect((await api.call('/jobs', { requestId: 'request-1', input: input() })).status).toBe(503)
  })

  it('submits the documented envelope, ordered references and only allowed parameters', async () => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(pending())
    const api = await start({ fetch: upstream })
    const submitted = input()
    ;(submitted.settings as any).apiKey = key
    ;(submitted as any).callback_url = 'http://localhost:4444'
    const response = await api.call('/jobs', { requestId: 'request-2', input: submitted })
    expect(response.status).toBe(200)
    expect(response.data).toMatchObject({ id: 'request-2', providerTaskId: 'provider-1', status: 'pending' })
    const [url, init] = upstream.mock.calls[0]!
    expect(url).toBe('https://operator.las.cn-beijing.volces.com/api/v1/submit')
    expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${key}`)
    expect(JSON.parse(String(init?.body))).toEqual({
      operator_id: 'las_video_edit_enhance', operator_version: 'v1',
      data: {
        video_url: 'tos://test/source.mp4', template: { id: 'replace/person_replace' },
        user_prompt: '将视频中的左边女子完整替换为参考图1中的人物；将视频中的右边男子完整替换为参考图2中的人物；保留动作和背景；保持原视频时长和时间线',
        image_urls: ['https://example.com/woman.jpg', 'https://example.com/man.jpg'],
        allow_fallback: false, use_asset_api: true, model: 'doubao-seedance-2-0-mini-260615',
        resolution: '720p', ratio: 'adaptive', generate_audio: true, watermark: false, return_last_frame: true, priority: 0, execution_expires_after: 172800,
      },
    })
    expect(JSON.stringify(response.data)).not.toContain(key)
    const persisted = await readFile(join(api.storageDir, 'request-2.json'), 'utf8')
    expect(persisted).toContain('provider-1')
    expect(persisted).not.toContain(key)
  })

  it.each([
    ['seedance-2.0', 'doubao-seedance-2-0-260128'],
    ['seedance-2.0-fast', 'doubao-seedance-2-0-fast-260128'],
    ['seedance-2.0-mini', 'doubao-seedance-2-0-mini-260615'],
  ])('maps %s to its deployed model', async (model, expected) => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(pending())
    const api = await start({ fetch: upstream })
    const submitted = input(); submitted.settings.model = model
    submitted.replacementType = 'product'; submitted.settings.duration = -1
    expect((await api.call('/jobs', { requestId: 'model-test', input: submitted })).status).toBe(200)
    expect(JSON.parse(String(upstream.mock.calls[0]![1]?.body)).data).toMatchObject({ model: expected, template: { id: 'replace/subject_replace' } })
  })

  it.each([
    ['sourceVideo', { url: 'http://127.0.0.1/video.mp4' }],
    ['sourceVideo', { url: 'http://192.168.1.5/video.mp4' }],
    ['sourceVideo', { url: 'http://[::1]/video.mp4' }],
    ['sourceVideo', { url: 'http://[::ffff:7f00:1]/video.mp4' }],
    ['sourceVideo', { url: 'http://2130706433/video.mp4' }],
    ['sourceVideo', { url: 'blob:http://localhost/local' }],
    ['sourceVideo', { url: 'data:video/mp4;base64,abc' }],
    ['settings', { ...input().settings, resolution: '1080p' }],
    ['settings', { ...input().settings, model: 'seedance-2.5' }],
    ['settings', { ...input().settings, executionExpiresAfter: 3599 }],
    ['groups', [{ description: '人物', reference: { url: 'http://localhost/photo.jpg' } }]],
  ])('rejects unsafe or unsupported %s before charging', async (field, value) => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
    const api = await start({ fetch: upstream })
    const submitted = { ...input(), [field]: value }
    expect((await api.call('/jobs', { requestId: 'invalid-test', input: submitted })).status).toBe(400)
    expect(upstream).not.toHaveBeenCalled()
  })

  it('rejects cross-origin mutation requests', async () => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
    const api = await start({ fetch: upstream })
    expect((await api.call('/jobs', { requestId: 'foreign', input: input() }, { Origin: 'https://evil.example' })).status).toBe(403)
    expect(upstream).not.toHaveBeenCalled()
  })

  it('deduplicates concurrent submits and refuses reuse for a different input', async () => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockImplementation(async () => { await new Promise(resolve => setTimeout(resolve, 25)); return pending() })
    const api = await start({ fetch: upstream })
    const body = { requestId: 'same-request', input: input() }
    const responses = await Promise.all([api.call('/jobs', body), api.call('/jobs', body)])
    expect(responses.map(value => value.data.providerTaskId)).toEqual(['provider-1', 'provider-1'])
    expect(upstream).toHaveBeenCalledTimes(1)
    body.input.preservePrompt = 'different request'
    expect((await api.call('/jobs', body)).status).toBe(409)
  })

  it('recovers a persisted job after service recreation and returns actual generated output', async () => {
    const submit = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(pending('actual-provider'))
    const api = await start({ fetch: submit })
    await api.call('/jobs', { requestId: 'resume-request', input: input() })
    const poll = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(new Response(JSON.stringify({
      metadata: { task_status: 'COMPLETED', business_code: '0', operator_id: 'las_video_edit_enhance', operator_version: 'v1' },
      data: { id: 'cgt-result', status: 'succeeded', model: 'actual-model', resolution: '720p', ratio: '16:9', duration: 6, usage: { total_tokens: 15 }, content: { video_url: 'https://public.example/output.mp4', last_frame_url: 'https://public.example/frame.jpg' } },
    })))
    const recreated = await start({ storageDir: api.storageDir, fetch: poll })
    const result = await recreated.call('/jobs/resume-request')
    expect(result).toMatchObject({ status: 200, data: { status: 'completed', providerTaskId: 'actual-provider', result: { videoUrl: 'https://public.example/output.mp4', lastFrameUrl: 'https://public.example/frame.jpg', model: 'actual-model', resolution: '720p', ratio: '16:9', duration: 6, usage: { total_tokens: 15 } } } })
    expect(JSON.parse(String(poll.mock.calls[0]![1]?.body))).toEqual({ operator_id: 'las_video_edit_enhance', operator_version: 'v1', task_id: 'actual-provider' })
    expect((await recreated.call('/jobs/resume-request')).data.status).toBe('completed')
    expect(poll).toHaveBeenCalledTimes(1)
  })

  it.each([['RUNNING', 'running'], ['FAILED', 'failed'], ['TIMEOUT', 'timeout']])('maps provider %s accurately', async (provider, wanted) => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValueOnce(pending()).mockResolvedValueOnce(new Response(JSON.stringify({ metadata: { task_status: provider, business_code: provider === 'FAILED' ? 'InvalidInput' : '0', error_msg: provider === 'FAILED' ? '素材不支持' : '' } })))
    const api = await start({ fetch: upstream })
    await api.call('/jobs', { requestId: 'status-request', input: input() })
    expect((await api.call('/jobs/status-request')).data.status).toBe(wanted)
  })

  it.each([['FAILED', 'failed'], ['TIMEOUT', 'timeout']])('keeps the actual error when submit immediately reports %s with business code zero', async (provider, wanted) => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(new Response(JSON.stringify({ metadata: { task_id: 'rejected-provider', task_status: provider, business_code: '0', error_msg: '原视频无法处理' } })))
    const api = await start({ fetch: upstream })
    const response = await api.call('/jobs', { requestId: 'immediate-failure', input: input() })
    expect(response.data).toMatchObject({ status: wanted, error: { message: '原视频无法处理' } })
    const stored = JSON.parse(await readFile(join(api.storageDir, 'immediate-failure.json'), 'utf8'))
    expect(stored.job.error.message).toBe('原视频无法处理')
  })

  it.each([['FAILED', 'failed'], ['TIMEOUT', 'timeout']])('keeps definitive submit status %s even without a task id', async (provider, wanted) => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(new Response(JSON.stringify({ metadata: { task_status: provider, business_code: 0, error_msg: '服务拒绝了该素材' } })))
    const api = await start({ fetch: upstream })
    const response = await api.call('/jobs', { requestId: 'failure-without-id', input: input() })
    expect(response.data).toMatchObject({ status: wanted, error: { message: '服务拒绝了该素材' } })
  })

  it('polls a submit response marked completed before exposing it as a completed result', async () => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ metadata: { task_id: 'immediate-provider', task_status: 'COMPLETED', business_code: '0' } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ metadata: { task_status: 'COMPLETED', business_code: '0' }, data: { content: { video_url: 'https://public.example/actual-output.mp4' } } })))
    const api = await start({ fetch: upstream })
    const submitted = await api.call('/jobs', { requestId: 'immediate-completed', input: input() })
    expect(submitted.data).toMatchObject({ status: 'pending', providerTaskId: 'immediate-provider' })
    const polled = await api.call('/jobs/immediate-completed')
    expect(polled.data).toMatchObject({ status: 'completed', result: { videoUrl: 'https://public.example/actual-output.mp4' } })
    expect(upstream).toHaveBeenCalledTimes(2)
  })

  it.each([4201, 'PermissionDenied'])('does not accept a completed poll result carrying business error %s', async (code) => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValueOnce(pending()).mockResolvedValueOnce(new Response(JSON.stringify({ metadata: { task_status: 'COMPLETED', business_code: code, error_msg: '当前账号无权读取此结果' }, data: { content: { video_url: 'https://public.example/rejected-output.mp4' } } })))
    const api = await start({ fetch: upstream })
    await api.call('/jobs', { requestId: 'poll-business-error', input: input() })
    const result = await api.call('/jobs/poll-business-error')
    expect(result).toEqual({ status: 502, data: { code: String(code), message: '当前账号无权读取此结果' } })
    const saved = JSON.parse(await readFile(join(api.storageDir, 'poll-business-error.json'), 'utf8'))
    expect(saved.job.status).toBe('pending')
    expect(saved.job.result).toBeUndefined()
  })

  it('persists an uncertain paid submission and never automatically resubmits it', async () => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockRejectedValue(new Error(`network timeout ${key}`))
    const api = await start({ fetch: upstream })
    const body = { requestId: 'uncertain-request', input: input() }
    const first = await api.call('/jobs', body)
    expect(first.data.status).toBe('submission-unknown')
    expect(JSON.stringify(first.data)).not.toContain(key)
    const recreated = await start({ fetch: upstream, storageDir: api.storageDir })
    expect((await recreated.call('/jobs', body)).data.status).toBe('submission-unknown')
    expect((await recreated.call('/jobs/uncertain-request')).data.status).toBe('submission-unknown')
    expect(upstream).toHaveBeenCalledTimes(1)
  })

  it('treats a successful response without provider task id as uncertain', async () => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(new Response('{}'))
    const api = await start({ fetch: upstream })
    expect((await api.call('/jobs', { requestId: 'missing-id', input: input() })).data.status).toBe('submission-unknown')
  })

  it('recovers an interrupted initial submit as uncertain without issuing a second request', async () => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(pending())
    const api = await start({ fetch: upstream })
    const body = { requestId: 'interrupted', input: input() }
    await api.call('/jobs', body)
    const file = join(api.storageDir, 'interrupted.json')
    const saved = JSON.parse(await readFile(file, 'utf8'))
    delete saved.job.providerTaskId
    saved.job.status = 'submitting'
    await writeFile(file, JSON.stringify(saved))
    const recreated = await start({ fetch: upstream, storageDir: api.storageDir })
    expect((await recreated.call('/jobs', body)).data.status).toBe('submission-unknown')
    expect(upstream).toHaveBeenCalledTimes(1)
  })

  it('records a definitive provider rejection and removes the API key from its error', async () => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(new Response(JSON.stringify({ metadata: { business_code: 'Unauthorized', error_msg: `invalid Bearer ${key}` } }), { status: 401 }))
    const api = await start({ fetch: upstream })
    const result = await api.call('/jobs', { requestId: 'rejected', input: input() })
    expect(result.data).toMatchObject({ status: 'failed', error: { code: 'Unauthorized' } })
    expect(JSON.stringify(result.data)).not.toContain(key)
    expect(await readFile(join(api.storageDir, 'rejected.json'), 'utf8')).not.toContain(key)
  })

  it('retains the paid provider task id when replacing the main record fails', async () => {
    let storageDir = ''
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockImplementation(async () => {
      const file = join(storageDir, 'recovery.json')
      await rm(file)
      await mkdir(file)
      return pending('paid-provider')
    })
    const api = await start({ fetch: upstream }); storageDir = api.storageDir
    const result = await api.call('/jobs', { requestId: 'recovery', input: input() })
    expect(result.data).toMatchObject({ providerTaskId: 'paid-provider', error: { code: 'STORAGE_ERROR' } })
    expect(await readFile(join(api.storageDir, 'recovery.json.provider'), 'utf8')).toContain('paid-provider')
  })

  it('keeps a recovered completed result after recreation without polling an expired provider task', async () => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValueOnce(pending('paid-recovery')).mockResolvedValueOnce(new Response(JSON.stringify({ metadata: { task_status: 'COMPLETED', business_code: '0' }, data: { content: { video_url: 'https://public.example/recovered-output.mp4' } } })))
    const api = await start({ fetch: upstream })
    await api.call('/jobs', { requestId: 'recovered-result', input: input() })
    const file = join(api.storageDir, 'recovered-result.json')
    const original = JSON.parse(await readFile(file, 'utf8'))
    const interrupted = structuredClone(original)
    interrupted.job.status = 'submitting'
    delete interrupted.job.providerTaskId
    await writeFile(file, JSON.stringify(interrupted))
    await writeFile(`${file}.provider`, JSON.stringify(original))
    expect((await api.call('/jobs/recovered-result')).data.status).toBe('completed')
    const expired = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(new Response('{}', { status: 410 }))
    const recreated = await start({ fetch: expired, storageDir: api.storageDir })
    expect((await recreated.call('/jobs/recovered-result')).data).toMatchObject({ status: 'completed', result: { videoUrl: 'https://public.example/recovered-output.mp4' } })
    expect(expired).not.toHaveBeenCalled()
  })

  it('prefers a newer completed main record when an older recovery record remains', async () => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValueOnce(pending()).mockResolvedValueOnce(new Response(JSON.stringify({ metadata: { task_status: 'COMPLETED', business_code: '0' }, data: { content: { video_url: 'https://public.example/newer-result.mp4' } } })))
    const api = await start({ fetch: upstream })
    await api.call('/jobs', { requestId: 'newer-result', input: input() })
    const file = join(api.storageDir, 'newer-result.json')
    const outdated = JSON.parse(await readFile(file, 'utf8'))
    outdated.job.updatedAt = '2020-01-01T00:00:00.000Z'
    await api.call('/jobs/newer-result')
    await writeFile(`${file}.provider`, JSON.stringify(outdated))
    const expired = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(new Response('{}', { status: 410 }))
    const recreated = await start({ fetch: expired, storageDir: api.storageDir })
    expect((await recreated.call('/jobs/newer-result')).data).toMatchObject({ status: 'completed', result: { videoUrl: 'https://public.example/newer-result.mp4' } })
    expect(expired).not.toHaveBeenCalled()
  })

  it('does not present the source video as a successful result when output is missing', async () => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValueOnce(pending()).mockResolvedValueOnce(new Response(JSON.stringify({ metadata: { task_status: 'COMPLETED', business_code: '0' }, data: { status: 'succeeded', content: {} } })))
    const api = await start({ fetch: upstream })
    await api.call('/jobs', { requestId: 'missing-output', input: input() })
    const result = await api.call('/jobs/missing-output')
    expect(result.status).toBe(502)
    expect(result.data.code).toBe('RESULT_UNAVAILABLE')
    const stored = JSON.parse(await readFile(join(api.storageDir, 'missing-output.json'), 'utf8'))
    expect(stored.job.status).toBe('pending')
    expect(stored.job.result).toBeUndefined()
  })

  it('rejects oversized JSON before sending any provider request', async () => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
    const api = await start({ fetch: upstream })
    const submitted = input(); submitted.preservePrompt = 'x'.repeat(1024 * 1024)
    expect((await api.call('/jobs', { requestId: 'too-large', input: submitted })).status).toBe(413)
    expect(upstream).not.toHaveBeenCalled()
  })

  it('preserves a pending task when polling temporarily fails', async () => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValueOnce(pending()).mockRejectedValueOnce(new Error(key)).mockResolvedValueOnce(new Response(JSON.stringify({ metadata: { task_status: 'RUNNING', business_code: '0' } })))
    const api = await start({ fetch: upstream })
    await api.call('/jobs', { requestId: 'poll-error', input: input() })
    const failed = await api.call('/jobs/poll-error')
    expect(failed.status).toBe(502)
    expect(JSON.stringify(failed)).not.toContain(key)
    expect((await api.call('/jobs/poll-error')).data.status).toBe('running')
  })

  it('returns the sanitized provider HTTP error and keeps the task available for another query', async () => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValueOnce(pending()).mockResolvedValueOnce(new Response(JSON.stringify({ metadata: { business_code: 'AccessDenied', error_msg: `当前账号无查询权限 ${key}` } }), { status: 403 })).mockResolvedValueOnce(new Response(JSON.stringify({ metadata: { task_status: 'RUNNING', business_code: '0' } })))
    const api = await start({ fetch: upstream })
    await api.call('/jobs', { requestId: 'http-query-error', input: input() })
    const result = await api.call('/jobs/http-query-error')
    expect(result.status).toBe(502)
    expect(result.data.code).toBe('AccessDenied')
    expect(result.data.message).toContain('当前账号无查询权限')
    expect(JSON.stringify(result.data)).not.toContain(key)
    const saved = JSON.parse(await readFile(join(api.storageDir, 'http-query-error.json'), 'utf8'))
    expect(saved.job.status).toBe('pending')
    expect((await api.call('/jobs/http-query-error')).data.status).toBe('running')
  })

  it('requires durable request storage before any paid submit', async () => {
    const api = await start({ fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>() })
    const path = join(api.storageDir, 'not-a-directory')
    await writeFile(path, 'occupied')
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
    const broken = await start({ storageDir: path, fetch: upstream })
    expect((await broken.call('/jobs', { requestId: 'durable-request', input: input() })).status).toBe(500)
    expect(upstream).not.toHaveBeenCalled()
    expect(await readdir(api.storageDir)).toContain('not-a-directory')
  })

  it('passes raw media to the upload boundary and returns references without a key', async () => {
    const uploadMedia = vi.fn().mockResolvedValue({ remoteUrl: 'tos://bucket/new.mp4', previewUrl: 'https://public.example/new.mp4' })
    const api = await start({ uploadMedia })
    expect((await api.call('/connection')).data).toEqual({ configured: true, uploadAvailable: true })
    const response = await fetch(`${api.base}/api/video/element-replacement/media?kind=video&name=clip.mp4`, { method: 'POST', headers: { 'Content-Type': 'video/mp4' }, body: new Uint8Array([1, 2, 3]) })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ remoteUrl: 'tos://bucket/new.mp4', previewUrl: 'https://public.example/new.mp4' })
    expect(uploadMedia.mock.calls[0]![1]).toEqual(Buffer.from([1, 2, 3]))
    expect(uploadMedia.mock.calls[0]!.slice(2)).toEqual(['clip.mp4', 'video'])
  })
})
