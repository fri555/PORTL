import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises'
import { isIP } from 'node:net'
import { join, resolve } from 'node:path'
import type { Connect, Plugin } from 'vite'
import type { ElementReplacementJob, ElementReplacementJobStatus, UploadedReplacementMedia } from '../src/types/element-replacement-job'
import { composeReplacementPrompt, replacementSourceDuration } from '../src/utils/elementReplacementPrompt'
import type { ReplacementType } from '../src/types/element-replacement'

type Model = 'seedance-2.0' | 'seedance-2.0-fast' | 'seedance-2.0-mini'
export interface ElementReplacementServerConfig {
  apiKey: string
  apiBase?: string
  fileUploadUrl?: string
  modelOverrides?: Partial<Record<Model, string>>
}
export interface ElementReplacementPluginOptions {
  getConfig: () => ElementReplacementServerConfig
  storageDir: string
  fetch?: typeof globalThis.fetch
  uploadMedia?: (config: ElementReplacementServerConfig, bytes: Buffer, name: string, kind: 'video' | 'image') => Promise<UploadedReplacementMedia>
}
interface StoredJob { fingerprint: string; job: ElementReplacementJob }
type JsonRecord = Record<string, unknown>
const prefix = '/api/video/element-replacement'
const defaultModels: Record<Model, string> = {
  'seedance-2.0': 'doubao-seedance-2-0-260128',
  'seedance-2.0-fast': 'doubao-seedance-2-0-fast-260128',
  'seedance-2.0-mini': 'doubao-seedance-2-0-mini-260615',
}
const statuses: Record<string, ElementReplacementJobStatus> = { PENDING: 'pending', RUNNING: 'running', COMPLETED: 'completed', FAILED: 'failed', TIMEOUT: 'timeout' }
const terminal = new Set<ElementReplacementJobStatus>(['completed', 'failed', 'timeout', 'submission-unknown'])
const submissions = new Map<string, Promise<StoredJob>>()
const polling = new Map<string, Promise<StoredJob>>()

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message) }
}
const record = (value: unknown): JsonRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
function fail(message: string): never { throw new ApiError(400, 'INVALID_INPUT', message) }
function cleanMessage(value: unknown, config: ElementReplacementServerConfig, fallback: string) {
  let message = text(value) || fallback
  if (config.apiKey) message = message.split(config.apiKey).join('[已隐藏]')
  return message.replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [已隐藏]').slice(0, 500)
}

function privateHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || !host.includes('.') && !host.includes(':')) return true
  if (isIP(host) === 4) {
    const [a, b] = host.split('.').map(Number) as [number, number]
    return a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 100 && b >= 64 && b <= 127
  }
  if (isIP(host) === 6) {
    if (host === '::' || host === '::1' || /^(fc|fd|fe[89ab])/i.test(host)) return true
    // IPv4-mapped IPv6 addresses must not bypass the IPv4 restrictions.
    if (host.startsWith('::ffff:')) {
      const suffix = host.slice(7)
      if (suffix.includes('.')) return privateHost(suffix)
      const groups = suffix.split(':')
      if (groups.length === 2) {
        const number = Number.parseInt(groups[0]!, 16) * 65536 + Number.parseInt(groups[1]!, 16)
        return privateHost([number >>> 24, number >>> 16 & 255, number >>> 8 & 255, number & 255].join('.'))
      }
      return true
    }
  }
  return false
}

function remoteReference(value: unknown, kind: 'video' | 'image' | 'audio') {
  const candidate = text(value)
  if (!candidate || /[\s\\]/.test(candidate)) return false
  if (kind === 'video' && /^[a-z\d][a-z\d_-]*$/i.test(candidate)) return true
  try {
    const url = new URL(candidate)
    if (url.username || url.password) return false
    if (url.protocol === 'tos:') return !!url.hostname && url.pathname.length > 1
    if (url.protocol === 'asset:') return !!url.hostname && (!url.pathname || url.pathname === '/')
    return ['http:', 'https:'].includes(url.protocol) && !!url.hostname && !privateHost(url.hostname)
  } catch { return false }
}

function mediaReference(value: unknown, kind: 'video' | 'image') {
  const media = record(value)
  const reference = text(media.remoteUrl) || text(media.url)
  if (!remoteReference(reference, kind)) fail(kind === 'video' ? '原视频需先上传，或提供公网视频、TOS、LAS 素材引用' : '参考图需先上传，或提供公网图片、TOS、LAS 素材引用')
  return reference
}

function buildSubmit(inputValue: unknown, config: ElementReplacementServerConfig) {
  const input = record(inputValue)
  const kind = input.replacementType
  if (!['person', 'product', 'background'].includes(String(kind))) fail('请选择有效的替换类型')
  const video = mediaReference(input.sourceVideo, 'video')
  if (!Array.isArray(input.groups) || !input.groups.length) fail('至少添加一组替换说明与参考图')
  const images: string[] = []
  const descriptions = input.groups.map((value) => {
    const group = record(value)
    const description = text(group.description)
    if (!description) fail('请填写每组原元素说明')
    images.push(mediaReference(group.reference, 'image'))
    return description
  })
  const preserve = text(input.preservePrompt)
  const duration = replacementSourceDuration(record(input.sourceVideo).duration)
  const settings = record(input.settings)
  const model = text(settings.model) as Model
  if (!Object.hasOwn(defaultModels, model)) fail('不支持所选模型')
  if (!['480p', '720p'].includes(String(settings.resolution))) fail('分辨率仅支持 480P、720P')
  if (!['adaptive', '16:9', '4:3', '1:1', '3:4', '9:16', '21:9'].includes(String(settings.ratio))) fail('不支持所选比例')
  for (const field of ['generateAudio', 'watermark', 'returnLastFrame']) if (typeof settings[field] !== 'boolean') fail('生成音频、水印及尾帧参数必须为开关值')
  if (!Number.isInteger(settings.priority)) fail('任务优先级必须为整数')
  if (!Number.isInteger(settings.executionExpiresAfter) || Number(settings.executionExpiresAfter) < 3600 || Number(settings.executionExpiresAfter) > 259200) fail('任务有效期须为 3600 至 259200 秒')
  const deployedModel = text(config.modelOverrides?.[model]) || defaultModels[model]
  return {
    operator_id: 'las_video_edit_enhance', operator_version: 'v1',
    data: {
      video_url: video, template: { id: kind === 'person' ? 'replace/person_replace' : 'replace/subject_replace' },
      user_prompt: composeReplacementPrompt(kind as ReplacementType, descriptions, preserve), image_urls: images,
      allow_fallback: false, ...(kind === 'person' ? { use_asset_api: true } : {}), model: deployedModel,
      ...(duration === null ? {} : { duration }),
      resolution: settings.resolution, ratio: settings.ratio, generate_audio: settings.generateAudio,
      watermark: settings.watermark, return_last_frame: settings.returnLastFrame, priority: settings.priority, execution_expires_after: settings.executionExpiresAfter,
    },
  }
}

async function readStored(file: string): Promise<StoredJob | null> {
  try {
    const saved = JSON.parse(await readFile(file, 'utf8')) as StoredJob
    if (!saved?.job?.id || !saved.fingerprint) throw new Error('invalid record')
    return saved
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw new ApiError(500, 'STORAGE_ERROR', '任务记录无法读取，请先检查本地存储，避免重复提交')
  }
}

async function saveStored(file: string, saved: StoredJob) {
  const temporary = `${file}.${randomUUID()}.tmp`
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(temporary, 'wx', 0o600)
    await handle.writeFile(JSON.stringify(saved), 'utf8')
    await handle.sync()
    await handle.close(); handle = undefined
    await rename(temporary, file)
  } catch {
    throw new ApiError(500, 'STORAGE_ERROR', '无法保存任务状态，请检查本地存储后再查询，勿重新提交')
  } finally {
    await handle?.close().catch(() => {})
    await unlink(temporary).catch(() => {})
  }
}

async function createStored(file: string, saved: StoredJob) {
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(file, 'wx', 0o600)
    await handle.writeFile(JSON.stringify(saved), 'utf8')
    await handle.sync()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false
    throw new ApiError(500, 'STORAGE_ERROR', '任务无法保存，尚未向生成服务提交，请检查本地存储')
  } finally { await handle?.close().catch(() => {}) }
  return true
}

async function bodyBytes(request: Connect.IncomingMessage, maximum: number) {
  const contentLength = Number(request.headers['content-length'] || 0)
  if (contentLength > maximum) throw new ApiError(413, 'BODY_TOO_LARGE', '上传内容超过本机测试服务的大小限制')
  const chunks: Buffer[] = []
  let length = 0
  for await (const value of request) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value)
    length += chunk.length
    if (length > maximum) throw new ApiError(413, 'BODY_TOO_LARGE', '上传内容超过本机测试服务的大小限制')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

function authorizeMutation(request: Connect.IncomingMessage) {
  const host = request.headers.host || ''
  let expected: URL
  try { expected = new URL(`http://${host}`) } catch { throw new ApiError(403, 'FORBIDDEN', '仅允许本机测试页面调用') }
  const hostname = expected.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!['localhost', '127.0.0.1', '::1'].includes(hostname)) throw new ApiError(403, 'FORBIDDEN', '仅允许本机测试页面调用')
  const origin = request.headers.origin
  if (origin && origin !== expected.origin) throw new ApiError(403, 'FORBIDDEN', '仅允许同源测试页面调用')
  const remote = request.socket.remoteAddress || ''
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) throw new ApiError(403, 'FORBIDDEN', '仅允许本机测试页面调用')
}

async function providerCall(fetcher: typeof fetch, config: ElementReplacementServerConfig, action: 'submit' | 'poll', body: unknown) {
  const base = (config.apiBase || 'https://operator.las.cn-beijing.volces.com/api/v1').replace(/\/$/, '')
  const response = await fetcher(`${base}/${action}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify(body), signal: AbortSignal.timeout(action === 'submit' ? 60000 : 30000), redirect: 'error',
  })
  let payload: JsonRecord
  try { payload = record(await response.json()) } catch { payload = {} }
  return { response, payload }
}

function providerFailure(payload: JsonRecord, config: ElementReplacementServerConfig, fallback: string) {
  const metadata = record(payload.metadata)
  const code = providerBusinessCode(metadata)
  return { code: code && code !== '0' ? code : text(metadata.task_status) || 'PROVIDER_ERROR', message: cleanMessage(metadata.error_msg || payload.message, config, fallback) }
}

function providerBusinessCode(metadata: JsonRecord) {
  return typeof metadata.business_code === 'number' ? String(metadata.business_code) : text(metadata.business_code)
}

async function submitJob(options: ElementReplacementPluginOptions, id: string, file: string, fingerprint: string, body: unknown, config: ElementReplacementServerConfig) {
  const previous = await loadJob(file)
  if (previous) return previous
  try { await mkdir(options.storageDir, { recursive: true }) } catch { throw new ApiError(500, 'STORAGE_ERROR', '本地任务存储不可用，尚未向生成服务提交') }
  const now = new Date().toISOString()
  const saved: StoredJob = { fingerprint, job: { id, status: 'submitting', createdAt: now, updatedAt: now } }
  if (!await createStored(file, saved)) return (await readStored(file))!
  let receivedId = false
  try {
    const { response, payload } = await providerCall(options.fetch || globalThis.fetch, config, 'submit', body)
    const metadata = record(payload.metadata)
    const businessCode = providerBusinessCode(metadata)
    const businessError = businessCode !== '' && businessCode !== '0'
    const providerTaskId = text(metadata.task_id)
    if (providerTaskId) {
      receivedId = true
      saved.job.providerTaskId = providerTaskId
      saved.job.status = statuses[text(metadata.task_status)] || 'pending'
      if (businessError) {
        saved.job.status = 'failed'; saved.job.error = providerFailure(payload, config, '生成服务拒绝该任务')
      } else if (saved.job.status === 'failed' || saved.job.status === 'timeout') {
        saved.job.error = providerFailure(payload, config, saved.job.status === 'timeout' ? '生成任务已超时' : '生成任务失败')
      } else if (saved.job.status === 'completed') {
        // Submit acknowledges the task; Poll supplies the playable result envelope.
        saved.job.status = 'pending'
      }
    } else if (['FAILED', 'TIMEOUT'].includes(text(metadata.task_status))) {
      saved.job.status = text(metadata.task_status) === 'TIMEOUT' ? 'timeout' : 'failed'
      saved.job.error = providerFailure(payload, config, saved.job.status === 'timeout' ? '生成任务已超时' : '生成任务失败')
    } else if (response.status >= 400 && response.status < 500 || businessError) {
      saved.job.status = 'failed'; saved.job.error = providerFailure(payload, config, '生成服务拒绝该任务，请检查密钥、权限和素材')
    } else {
      saved.job.status = 'submission-unknown'
      saved.job.error = { code: 'SUBMISSION_UNKNOWN', message: '生成服务未返回任务号，提交状态无法确认。请先核对 LAS 控制台，勿重复提交' }
    }
  } catch {
    saved.job.status = 'submission-unknown'
    saved.job.error = { code: 'SUBMISSION_UNKNOWN', message: '提交连接中断，无法确认任务是否创建。请先核对 LAS 控制台，勿重复提交' }
  }
  saved.job.updatedAt = new Date().toISOString()
  try { await saveStored(file, saved) } catch (error) {
    if (receivedId) {
      // A second durable record preserves a returned paid task id if replacing the primary file fails.
      try { await saveStored(`${file}.provider`, saved) } catch { /* Return the known id so the browser can retain it too. */ }
      saved.job.error = { code: 'STORAGE_ERROR', message: '任务已提交，但本地状态保存失败。请保留此任务号，勿重新提交' }
      return saved
    }
    throw error
  }
  return saved
}

async function loadJob(file: string) {
  const recovery = await readStored(`${file}.provider`)
  let primary: StoredJob | null
  try { primary = await readStored(file) } catch (error) {
    if (recovery) return recovery
    throw error
  }
  if (!recovery) return primary
  if (!primary) return recovery
  // A known paid task id takes precedence over an interrupted initial record.
  if (!primary.job.providerTaskId && recovery.job.providerTaskId) return recovery
  if (!recovery.job.providerTaskId && primary.job.providerTaskId) return primary
  const primaryTime = Date.parse(primary.job.updatedAt) || 0
  const recoveryTime = Date.parse(recovery.job.updatedAt) || 0
  if (primaryTime !== recoveryTime) return primaryTime > recoveryTime ? primary : recovery
  if (terminal.has(recovery.job.status) && !terminal.has(primary.job.status)) return recovery
  return primary
}

async function pollJob(options: ElementReplacementPluginOptions, file: string, config: ElementReplacementServerConfig) {
  const saved = await loadJob(file)
  if (!saved) throw new ApiError(404, 'JOB_NOT_FOUND', '未找到该生成任务')
  if (terminal.has(saved.job.status)) return saved
  if (!saved.job.providerTaskId) {
    saved.job.status = 'submission-unknown'
    saved.job.error = { code: 'SUBMISSION_UNKNOWN', message: '服务重启前的提交状态无法确认，请先核对 LAS 控制台，勿重复提交' }
    saved.job.updatedAt = new Date().toISOString()
    await saveStored(file, saved)
    return saved
  }
  if (!config.apiKey) throw new ApiError(503, 'LAS_NOT_CONFIGURED', '请先配置服务端 LAS_API_KEY 后查询任务')
  let result: Awaited<ReturnType<typeof providerCall>>
  try {
    result = await providerCall(options.fetch || globalThis.fetch, config, 'poll', { operator_id: 'las_video_edit_enhance', operator_version: 'v1', task_id: saved.job.providerTaskId })
  } catch { throw new ApiError(502, 'POLL_UNAVAILABLE', '暂时无法查询生成状态，请稍后重试查询；现有任务仍保留') }
  const payload = result.payload
  if (!result.response.ok) {
    const error = providerFailure(payload, config, `生成服务查询失败（HTTP ${result.response.status}），请稍后重试查询`)
    throw new ApiError(502, error.code === 'PROVIDER_ERROR' ? `HTTP_${result.response.status}` : error.code, error.message)
  }
  const metadata = record(payload.metadata)
  const next = statuses[text(metadata.task_status)]
  const businessCode = providerBusinessCode(metadata)
  if (businessCode !== '' && businessCode !== '0' && next !== 'failed' && next !== 'timeout') {
    const error = providerFailure(payload, config, '生成服务查询失败，请稍后重试查询')
    throw new ApiError(502, error.code, error.message)
  }
  if (!next) throw new ApiError(502, 'INVALID_PROVIDER_RESPONSE', '生成服务返回了无法识别的任务状态，请稍后重试查询')
  saved.job.status = next
  delete saved.job.error
  if (next === 'failed' || next === 'timeout') saved.job.error = providerFailure(payload, config, next === 'timeout' ? '生成任务已超时' : '生成任务失败')
  if (next === 'completed') {
    const data = record(payload.data)
    const content = record(data.content)
    const videoUrl = text(content.video_url)
    if (!remoteReference(videoUrl, 'video') || !/^https?:\/\//i.test(videoUrl)) throw new ApiError(502, 'RESULT_UNAVAILABLE', '任务已完成，但服务未返回可播放的视频地址，请重试查询')
    saved.job.result = {
      videoUrl,
      ...(remoteReference(content.last_frame_url, 'image') ? { lastFrameUrl: text(content.last_frame_url) } : {}),
      ...(text(data.model) ? { model: text(data.model) } : {}),
      ...(text(data.resolution) ? { resolution: text(data.resolution) } : {}),
      ...(text(data.ratio) ? { ratio: text(data.ratio) } : {}),
      ...(typeof data.duration === 'number' ? { duration: data.duration } : {}),
      ...(Object.keys(record(data.usage)).length ? { usage: record(data.usage) } : {}),
    }
  }
  saved.job.updatedAt = new Date().toISOString()
  await saveStored(file, saved)
  await unlink(`${file}.provider`).catch(() => {})
  return saved
}

export function elementReplacementPlugin(options: ElementReplacementPluginOptions): Plugin {
  const storage = resolve(options.storageDir)
  const handler = (): Connect.NextHandleFunction => async (request, response, next) => {
    const url = new URL(request.url || '/', 'http://localhost')
    if (!url.pathname.startsWith(`${prefix}/`)) return next()
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.setHeader('Cache-Control', 'no-store')
    const send = (value: unknown) => { response.statusCode = 200; response.end(JSON.stringify(value)) }
    try {
      const config = options.getConfig()
      if (url.pathname === `${prefix}/connection` && request.method === 'GET') {
        send({ configured: !!config.apiKey, uploadAvailable: !!config.apiKey && !!options.uploadMedia }); return
      }
      if (request.method === 'POST') authorizeMutation(request)
      if (url.pathname === `${prefix}/media` && request.method === 'POST') {
        if (!config.apiKey) throw new ApiError(503, 'LAS_NOT_CONFIGURED', '请先配置服务端 LAS_API_KEY')
        if (!options.uploadMedia) throw new ApiError(503, 'UPLOAD_UNAVAILABLE', '尚未配置官方素材上传服务')
        const kind = url.searchParams.get('kind')
        if (kind !== 'video' && kind !== 'image') fail('仅支持上传视频或参考图片')
        const name = text(url.searchParams.get('name')).replace(/[\r\n]/g, '').slice(0, 200)
        if (!name) fail('请提供素材文件名')
        const bytes = await bodyBytes(request, 200 * 1024 * 1024)
        if (!bytes.length) fail('上传文件为空')
        const result = await options.uploadMedia(config, bytes, name, kind)
        send(result); return
      }
      if (url.pathname === `${prefix}/jobs` && request.method === 'POST') {
        if (!config.apiKey) throw new ApiError(503, 'LAS_NOT_CONFIGURED', '请先配置服务端 LAS_API_KEY')
        let body: JsonRecord
        try { body = record(JSON.parse((await bodyBytes(request, 1024 * 1024)).toString('utf8'))) } catch (error) {
          if (error instanceof ApiError) throw error
          fail('请求内容不是有效的 JSON')
        }
        const id = text(body.requestId)
        if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(id)) fail('请提供有效的请求编号')
        const submit = buildSubmit(body.input, config)
        const fingerprint = createHash('sha256').update(JSON.stringify(submit)).digest('hex')
        const file = join(storage, `${id}.json`)
        let active = submissions.get(file)
        if (!active) {
          active = submitJob({ ...options, storageDir: storage }, id, file, fingerprint, submit, config)
          submissions.set(file, active)
          void active.finally(() => { if (submissions.get(file) === active) submissions.delete(file) }).catch(() => {})
        }
        const saved = await active
        if (saved.fingerprint !== fingerprint) throw new ApiError(409, 'REQUEST_CONFLICT', '该请求编号已用于其他配置，请保留原任务并重新发起新任务')
        if (saved.job.status === 'submitting' && !saved.job.providerTaskId) {
          saved.job.status = 'submission-unknown'
          saved.job.error = { code: 'SUBMISSION_UNKNOWN', message: '之前提交的状态无法确认，请先核对 LAS 控制台，勿重复提交' }
          await saveStored(file, saved)
        }
        send(saved.job); return
      }
      const match = url.pathname.match(new RegExp(`^${prefix}/jobs/([a-zA-Z0-9][a-zA-Z0-9_-]{0,99})$`))
      if (match && request.method === 'GET') {
        const file = join(storage, `${match[1]}.json`)
        const submitting = submissions.get(file)
        if (submitting) { send((await submitting).job); return }
        let active = polling.get(file)
        if (!active) {
          active = pollJob(options, file, config); polling.set(file, active)
          void active.finally(() => { if (polling.get(file) === active) polling.delete(file) }).catch(() => {})
        }
        send((await active).job); return
      }
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', '此接口不支持当前请求方式')
    } catch (error) {
      const config = options.getConfig()
      response.statusCode = error instanceof ApiError ? error.status : 500
      response.end(JSON.stringify({ code: error instanceof ApiError ? error.code : 'SERVICE_ERROR', message: cleanMessage(error instanceof Error ? error.message : '', config, '本地生成服务暂时不可用') }))
    }
  }
  return {
    name: 'element-replacement-api',
    configureServer(server) { server.middlewares.use(handler()) },
    configurePreviewServer(server) { server.middlewares.use(handler()) },
  }
}
