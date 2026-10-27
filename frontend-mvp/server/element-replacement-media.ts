import { randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import type { UploadedReplacementMedia } from '../src/types/element-replacement-job'

const endpoint = 'https://sd7gf0bn2atgtkgkm07a0.apigateway-cn-beijing.volceapi.com/api/v1/files/upload'
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
function publicPreview(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
    if (url.protocol !== 'https:' || url.username || url.password || !host.includes('.') || host.endsWith('.local') || host.endsWith('.localhost')) return false
    // Provider previews should use public DNS names, never literal network addresses.
    return !isIP(host)
  } catch { return false }
}

export async function uploadElementReplacementMedia(config: { apiKey: string; fileUploadUrl?: string }, bytes: Buffer, name: string, kind: 'video' | 'image', fetchImpl: typeof fetch = globalThis.fetch): Promise<UploadedReplacementMedia> {
  if (!config.apiKey.trim()) throw new Error('素材上传尚未配置 LAS_API_KEY')
  if (!bytes.length) throw new Error('素材上传文件为空')
  const filename = name.replaceAll('\\', '/').split('/').pop()?.replace(/[\r\n]/g, '') || (kind === 'video' ? 'video.mp4' : 'image.png')
  const extension = filename.split('.').pop()?.toLowerCase() || ''
  const mime: Record<string, string> = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' }
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(bytes)], { type: mime[extension] || 'application/octet-stream' }), filename)
  try {
    const response = await fetchImpl(config.fileUploadUrl || endpoint, { method: 'POST', headers: { Authorization: `Bearer ${config.apiKey}`, 'X-Request-Id': randomUUID() }, body: form, signal: AbortSignal.timeout(120000) })
    const payload = record(await response.json())
    const data = record(payload.data)
    if (!response.ok || payload.code !== 0) throw new Error(typeof payload.message === 'string' ? payload.message : `HTTP ${response.status}`)
    if (typeof data.bucket !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(data.bucket)
      || typeof data.object_key !== 'string' || !data.object_key || /^[\/]/.test(data.object_key) || /[\\\r\n]/.test(data.object_key)
      || data.object_key.split('/').includes('..') || !publicPreview(data.presigned_url)) throw new Error('返回的素材引用或预览地址无效')
    return { remoteUrl: `tos://${data.bucket}/${data.object_key.split('/').map(encodeURIComponent).join('/')}`, previewUrl: data.presigned_url }
  } catch (error) {
    const detail = (error instanceof Error ? error.message : '连接失败').split(config.apiKey).join('[已隐藏]').replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [已隐藏]').slice(0, 500)
    throw new Error(`素材上传失败：${detail}`)
  }
}
