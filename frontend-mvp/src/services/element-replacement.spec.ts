// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerLocalVideo, releaseLocalVideo } from '@/components/video-generation/storyboard/local-preview'
import { getDemoElementReplacementInput } from '@/composables/useElementReplacement'
import type { ElementReplacementJob } from '@/types/element-replacement-job'
import {
  ElementReplacementApiError,
  fetchElementReplacementConnection,
  fetchElementReplacementJob,
  prepareElementReplacementInput,
  submitElementReplacementJob,
} from './element-replacement'

const prefix = '/api/video/element-replacement'
const pending: ElementReplacementJob = { id: 'request-1', providerTaskId: 'provider-1', status: 'pending', createdAt: '2026-10-26T03:00:00.000Z', updatedAt: '2026-10-26T03:00:00.000Z' }
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const remoteInput = () => {
  const input = getDemoElementReplacementInput()
  input.sourceVideo!.url = 'https://example.com/source.mp4'
  input.groups[0]!.reference!.url = 'tos://bucket/person-a.png'
  input.groups[1]!.reference!.url = 'asset://person-b'
  return input
}

describe('real element replacement service', () => {
  beforeEach(() => { vi.spyOn(globalThis, 'fetch') })
  afterEach(() => { vi.restoreAllMocks() })

  it('returns server connection without exposing or requiring browser credentials', async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ configured: true, uploadAvailable: true }))
    expect(await fetchElementReplacementConnection()).toEqual({ configured: true, uploadAvailable: true })
    expect(fetch).toHaveBeenCalledWith(`${prefix}/connection`)
  })

  it.each([{}, { configured: true }, { configured: 'true', uploadAvailable: true }])('rejects malformed connection DTO %o', async (dto) => {
    vi.mocked(fetch).mockResolvedValue(reply(dto))
    await expect(fetchElementReplacementConnection()).rejects.toThrow(/连接.*响应/)
  })

  it('posts the request id and prepared configuration exactly once and returns the recorded task', async () => {
    const input = remoteInput()
    input.prototypeDemo = false
    vi.mocked(fetch).mockResolvedValue(reply(pending, 201))
    expect(await submitElementReplacementJob('request-1', input)).toEqual(pending)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(`${prefix}/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: 'request-1', input }) })
  })

  it('queries an existing request without submitting another job', async () => {
    vi.mocked(fetch).mockResolvedValue(reply(pending))
    expect(await fetchElementReplacementJob('request/id')).toEqual(pending)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(`${prefix}/jobs/request%2Fid`)
  })

  it('preserves the real completed video and returned metadata', async () => {
    const completed = { ...pending, status: 'completed', result: { videoUrl: 'https://example.com/result.mp4', lastFrameUrl: 'https://example.com/last.png', model: 'seedance_2.0_mini', resolution: '720p', duration: 8, usage: { total_tokens: 40 } } }
    vi.mocked(fetch).mockResolvedValue(reply(completed))
    expect(await fetchElementReplacementJob(pending.id)).toEqual(completed)
  })

  it.each([
    { ...pending, id: '' }, { ...pending, status: 'success' }, { ...pending, createdAt: null },
    { ...pending, status: 'completed' }, { ...pending, status: 'completed', result: { videoUrl: 'blob:original' } },
    { ...pending, error: { code: 'failed' } },
  ])('rejects an unusable task DTO rather than fabricating a result: %o', async (dto) => {
    vi.mocked(fetch).mockResolvedValue(reply(dto))
    await expect(fetchElementReplacementJob('request-1')).rejects.toThrow(/任务.*响应/)
  })

  it('retains upstream rejection status, code, and readable message', async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ code: 'MODEL_DISABLED', message: '当前模型尚未开通' }, 422))
    await expect(submitElementReplacementJob('request-1', remoteInput())).rejects.toMatchObject({ name: 'ElementReplacementApiError', status: 422, code: 'MODEL_DISABLED', message: '当前模型尚未开通' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('does not retry or turn a disconnected submission into a successful or rejected task', async () => {
    const failure = new TypeError('Failed to fetch')
    vi.mocked(fetch).mockRejectedValue(failure)
    await expect(submitElementReplacementJob('request-1', remoteInput())).rejects.toBe(failure)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('reports an HTTP failure even when the proxy returned HTML', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('<html>bad gateway</html>', { status: 502 }))
    const failure = await fetchElementReplacementConnection().catch(error => error)
    expect(failure).toBeInstanceOf(ElementReplacementApiError)
    expect(failure).toMatchObject({ status: 502, code: 'HTTP_502' })
  })

  it('rejects a successful response with invalid JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('invalid json', { status: 200 }))
    await expect(fetchElementReplacementConnection()).rejects.toThrow(/响应/)
  })

  it.each(['http://example.com/source.mp4', 'https://example.com/source.mp4', 'tos://bucket/source.mp4', 'asset://source-video', 'source-video-id'])('keeps accepted remote video %s without uploading', async url => {
    const input = remoteInput()
    input.sourceVideo!.url = url
    const prepared = await prepareElementReplacementInput(input)
    expect(prepared.sourceVideo!.url).toBe(url)
    expect(prepared.groups.map(group => group.reference!.url)).toEqual(['tos://bucket/person-a.png', 'asset://person-b'])
    expect(prepared.prototypeDemo).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
    expect(input.prototypeDemo).toBe(true)
    prepared.settings.resolution = '480p'
    prepared.groups[0]!.description = 'changed'
    prepared.audioUrls.push('asset://changed')
    expect(input.settings.resolution).toBe('720p')
    expect(input.groups[0]!.description).toBe('画面左侧穿黑色西装的女性')
    expect(input.audioUrls).toEqual([])
  })

  it('reuses uploaded references even if the original browser preview has expired', async () => {
    const input = remoteInput()
    input.sourceVideo = { ...input.sourceVideo!, url: 'local-video:expired', remoteUrl: 'tos://bucket/source.mp4' }
    input.groups[0]!.reference = { ...input.groups[0]!.reference!, url: 'data:image/png;base64,YQ==', remoteUrl: 'asset://already-uploaded' }
    const prepared = await prepareElementReplacementInput(input)
    expect(prepared.sourceVideo!.remoteUrl).toBe('tos://bucket/source.mp4')
    expect(prepared.groups[0]!.reference!.remoteUrl).toBe('asset://already-uploaded')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('uploads real local-video bytes then images in mapping order and keeps durable preview URLs', async () => {
    const input = remoteInput()
    const sourceId = registerLocalVideo(new File(['real video bytes'], '本地视频.mp4', { type: 'video/mp4' }))
    input.sourceVideo = { ...input.sourceVideo!, source: 'upload', name: '本地视频.mp4', url: sourceId }
    input.groups[0]!.reference = { ...input.groups[0]!.reference!, source: 'upload', name: '目标.png', url: 'data:image/png;base64,YQ==' }
    input.groups[1]!.reference!.url = '/PORTL/assets/video-generation/element-replace/person-b.png'
    const requests: { url: string; method?: string; contentType?: string; body?: Blob }[] = []
    const originalFetch = vi.mocked(fetch).getMockImplementation()
    vi.mocked(fetch).mockImplementation(async (url, options) => {
      const address = String(url)
      requests.push({ url: address, method: options?.method, contentType: (options?.headers as Record<string, string> | undefined)?.['Content-Type'], body: options?.body as Blob | undefined })
      if (address.startsWith('blob:')) return new Response(new Blob(['real video bytes'], { type: 'video/mp4' }))
      if (address.startsWith('data:') || address.startsWith('/PORTL/')) return new Response(new Blob(['image bytes'], { type: 'image/png' }))
      const index = requests.filter(request => request.method === 'POST').length
      return reply({ remoteUrl: `tos://bucket/${index}`, previewUrl: `https://example.com/signed-${index}` })
    })
    try {
      const prepared = await prepareElementReplacementInput(input)
      expect(requests.filter(request => request.method === 'POST').map(request => request.url)).toEqual([
        `${prefix}/media?kind=video&name=${encodeURIComponent('本地视频.mp4')}`,
        `${prefix}/media?kind=image&name=${encodeURIComponent('目标.png')}`,
        `${prefix}/media?kind=image&name=${encodeURIComponent('模特 B · 演示参考图')}`,
      ])
      const uploads = requests.filter(request => request.method === 'POST')
      expect(uploads.map(request => request.contentType)).toEqual(['video/mp4', 'image/png', 'image/png'])
      expect(await uploads[0]!.body!.text()).toBe('real video bytes')
      expect(await uploads[1]!.body!.text()).toBe('image bytes')
      expect(prepared.sourceVideo).toMatchObject({ url: 'https://example.com/signed-1', remoteUrl: 'tos://bucket/1', name: '本地视频.mp4' })
      expect(prepared.groups.map(group => [group.reference!.url, group.reference!.remoteUrl])).toEqual([['https://example.com/signed-2', 'tos://bucket/2'], ['https://example.com/signed-3', 'tos://bucket/3']])
      expect(input.sourceVideo!.url).toBe(sourceId)
      expect(input.sourceVideo!.remoteUrl).toBeUndefined()
      expect(requests.some(request => request.url === `${prefix}/jobs`)).toBe(false)
    } finally {
      releaseLocalVideo(sourceId)
      if (originalFetch) vi.mocked(fetch).mockImplementation(originalFetch)
    }
  })

  it('uploads public demo source video instead of sending a localhost reference to LAS', async () => {
    const input = remoteInput()
    input.sourceVideo!.url = '/PORTL/assets/video-generation/element-replace/demo-source.mp4'
    vi.mocked(fetch).mockResolvedValueOnce(new Response(new Blob(['video'], { type: 'video/mp4' }))).mockResolvedValueOnce(reply({ remoteUrl: 'asset://demo-upload', previewUrl: 'https://example.com/demo.mp4' }))
    expect((await prepareElementReplacementInput(input)).sourceVideo!.remoteUrl).toBe('asset://demo-upload')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('stops after a failed upload, preserves configuration, and never submits a job', async () => {
    const input = getDemoElementReplacementInput()
    const original = JSON.parse(JSON.stringify(input))
    vi.mocked(fetch).mockResolvedValueOnce(new Response(new Blob(['video'], { type: 'video/mp4' }))).mockResolvedValueOnce(reply({ code: 'UPLOAD_FAILED', message: '素材上传失败，请稍后再试' }, 503))
    await expect(prepareElementReplacementInput(input)).rejects.toMatchObject({ status: 503, code: 'UPLOAD_FAILED', message: '素材上传失败，请稍后再试' })
    expect(input).toEqual(original)
    expect(vi.mocked(fetch).mock.calls.map(([url]) => String(url))).not.toContain(`${prefix}/jobs`)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it.each([
    { remoteUrl: 'tos://bucket/image.png' },
    { remoteUrl: 'blob:bad', previewUrl: 'https://example.com/image.png' },
    { remoteUrl: 'tos://bucket/image.png', previewUrl: 'data:image/png;base64,YQ==' },
  ])('rejects unusable upload response %o', async dto => {
    const input = remoteInput()
    input.groups[0]!.reference!.url = 'data:image/png;base64,YQ=='
    vi.mocked(fetch).mockResolvedValueOnce(new Response(new Blob(['image'], { type: 'image/png' }))).mockResolvedValueOnce(reply(dto))
    await expect(prepareElementReplacementInput(input)).rejects.toThrow(/上传.*响应/)
  })

  it('rejects expired browser media before any upload or job submission', async () => {
    const input = remoteInput()
    input.sourceVideo!.url = 'local-video:expired'
    await expect(prepareElementReplacementInput(input)).rejects.toThrow(/重新选择.*视频|视频.*重新选择/)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not upload an empty or failed local media response', async () => {
    const input = remoteInput()
    input.groups[0]!.reference!.url = '/PORTL/missing.png'
    vi.mocked(fetch).mockResolvedValueOnce(new Response('not found', { status: 404 }))
    await expect(prepareElementReplacementInput(input)).rejects.toThrow(/读取.*参考图/)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('reports a readable media upload network failure without retrying or submitting', async () => {
    const input = remoteInput()
    input.groups[0]!.reference!.url = 'data:image/png;base64,YQ=='
    vi.mocked(fetch).mockResolvedValueOnce(new Response(new Blob(['image'], { type: 'image/png' }))).mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(prepareElementReplacementInput(input)).rejects.toThrow(/参考图.*上传.*网络|上传.*参考图.*网络/)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does not upload empty media when a stale public URL returns an empty body', async () => {
    const input = remoteInput()
    input.groups[0]!.reference!.url = '/PORTL/empty.png'
    vi.mocked(fetch).mockResolvedValueOnce(new Response(new Blob([], { type: 'image/png' })))
    await expect(prepareElementReplacementInput(input)).rejects.toThrow(/素材为空/)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
