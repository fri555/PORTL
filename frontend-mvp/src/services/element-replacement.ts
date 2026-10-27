import { getReplacementMediaUrl, isReplacementRemoteReference } from '@/composables/useElementReplacement'
import type { ElementReplacementInput, ReplacementMedia } from '@/types/element-replacement'
import type { ElementReplacementConnection, ElementReplacementJob, UploadedReplacementMedia } from '@/types/element-replacement-job'

const prefix = '/api/video/element-replacement'
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const nonempty = (value: unknown): value is string => typeof value === 'string' && !!value.trim()
const optionalString = (value: unknown) => value === undefined || nonempty(value)
function webUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return false
  return isReplacementRemoteReference(value, 'video')
}

export class ElementReplacementApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message)
    this.name = 'ElementReplacementApiError'
  }
}

async function readResponse(response: Response): Promise<unknown> {
  let body: unknown
  try { body = await response.json() } catch {
    if (response.ok) throw new Error('元素替换接口响应无法解析，请重试查询任务状态')
  }
  if (!response.ok) {
    throw new ElementReplacementApiError(response.status,
      record(body) && nonempty(body.code) ? body.code : `HTTP_${response.status}`,
      record(body) && nonempty(body.message) ? body.message : `元素替换接口请求失败（HTTP ${response.status}）`)
  }
  return body
}

function readJob(body: unknown): ElementReplacementJob {
  const statuses: ElementReplacementJob['status'][] = ['submitting', 'pending', 'running', 'completed', 'failed', 'timeout', 'submission-unknown']
  if (!record(body) || !nonempty(body.id) || !statuses.includes(body.status as ElementReplacementJob['status'])
    || !nonempty(body.createdAt) || !nonempty(body.updatedAt) || !optionalString(body.providerTaskId)) {
    throw new Error('元素替换任务接口响应不完整，请重试查询任务状态')
  }
  if (body.error !== undefined && (!record(body.error) || !nonempty(body.error.code) || !nonempty(body.error.message))) {
    throw new Error('元素替换任务接口响应中的错误信息不完整')
  }
  if (body.result !== undefined || body.status === 'completed') {
    const result = body.result
    if (!record(result) || !webUrl(result.videoUrl)
      || (result.lastFrameUrl !== undefined && !webUrl(result.lastFrameUrl))
      || !optionalString(result.model) || !optionalString(result.resolution) || !optionalString(result.ratio)
      || (result.duration !== undefined && (typeof result.duration !== 'number' || !Number.isFinite(result.duration)))
      || (result.usage !== undefined && !record(result.usage))) {
      throw new Error('元素替换任务接口响应中的生成结果不可用，请重试查询任务状态')
    }
  }
  return body as unknown as ElementReplacementJob
}

export async function fetchElementReplacementConnection(): Promise<ElementReplacementConnection> {
  const body = await readResponse(await fetch(`${prefix}/connection`))
  if (!record(body) || typeof body.configured !== 'boolean' || typeof body.uploadAvailable !== 'boolean') {
    throw new Error('元素替换连接接口响应不完整')
  }
  return { configured: body.configured, uploadAvailable: body.uploadAvailable }
}

async function prepareMedia(media: ReplacementMedia | null, kind: ReplacementMedia['kind']): Promise<ReplacementMedia> {
  const label = kind === 'video' ? '源视频' : '参考图'
  if (!media) throw new Error(`请重新选择${label}`)
  const prepared = { ...media }
  if (isReplacementRemoteReference(prepared.remoteUrl ?? '', kind)) return prepared
  delete prepared.remoteUrl
  if (isReplacementRemoteReference(prepared.url, kind)) return prepared
  const preview = getReplacementMediaUrl(prepared)
  if (!preview) throw new Error(`请重新选择${label}；本地素材的预览可能已失效`)
  let blob: Blob
  try {
    const response = await fetch(preview)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    blob = await response.blob()
    if (!blob.size) throw new Error('素材为空')
  } catch (error) {
    throw new Error(`读取${label}失败，请重新选择素材${error instanceof Error ? `：${error.message}` : ''}`)
  }
  const endpoint = `${prefix}/media?kind=${kind}&name=${encodeURIComponent(prepared.name)}`
  let uploadedResponse: Response
  try {
    uploadedResponse = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob,
    })
  } catch (error) {
    throw new Error(`${label}上传失败，请检查网络连接${error instanceof Error ? `：${error.message}` : ''}`)
  }
  const body = await readResponse(uploadedResponse)
  if (!record(body) || !isReplacementRemoteReference(body.remoteUrl as string, kind)
    || !webUrl(body.previewUrl) || !body.previewUrl.toLowerCase().startsWith('https://')) {
    throw new Error(`${label}上传接口响应不完整，未返回可用的素材与预览地址`)
  }
  const uploaded = body as unknown as UploadedReplacementMedia
  return { ...prepared, url: uploaded.previewUrl, remoteUrl: uploaded.remoteUrl }
}

export async function prepareElementReplacementInput(input: ElementReplacementInput): Promise<ElementReplacementInput> {
  const prepared: ElementReplacementInput = {
    ...input,
    settings: { ...input.settings },
    audioUrls: [...input.audioUrls],
    sourceVideo: input.sourceVideo ? { ...input.sourceVideo } : null,
    groups: input.groups.map(group => ({ ...group, reference: group.reference ? { ...group.reference } : null })),
    ...(input.resultVideo ? { resultVideo: { ...input.resultVideo } } : {}),
    prototypeDemo: false,
  }
  prepared.sourceVideo = await prepareMedia(prepared.sourceVideo, 'video')
  for (const group of prepared.groups) group.reference = await prepareMedia(group.reference, 'image')
  return prepared
}

export async function submitElementReplacementJob(requestId: string, input: ElementReplacementInput): Promise<ElementReplacementJob> {
  return readJob(await readResponse(await fetch(`${prefix}/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId, input }),
  })))
}

export async function fetchElementReplacementJob(id: string): Promise<ElementReplacementJob> {
  return readJob(await readResponse(await fetch(`${prefix}/jobs/${encodeURIComponent(id)}`)))
}
