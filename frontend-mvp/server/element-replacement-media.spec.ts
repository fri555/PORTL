// @vitest-environment node
import { Buffer } from 'node:buffer'
import { describe, expect, it, vi } from 'vitest'
import { uploadElementReplacementMedia } from './element-replacement-media'

const key = 'file-upload-test-secret'
const bytes = Buffer.from([0, 1, 2, 128, 255])
const success = (data: Record<string, unknown> = {}) => ({
  code: 0, message: '',
  data: { bucket: 'las-media-test', object_key: 'inputs/clip.mp4', file_name: 'clip.mp4', file_size: 5, etag: 'test-etag', presigned_url: 'https://las-media-test.tos-cn-beijing.volces.com/inputs/clip.mp4?X-Tos-Signature=test', expires_at: '2026-10-27T12:00:00Z', ...data },
})
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })

describe('LAS media upload', () => {
  it('uploads the exact file bytes through the official multipart contract and returns remote references', async () => {
    let request: Request | undefined
    const upstream: typeof fetch = async (url, init) => {
      request = new Request(url, init)
      return json(success())
    }
    const result = await uploadElementReplacementMedia({ apiKey: key }, bytes, 'C:\\private\\demo\r\n.mp4', 'video', upstream)
    expect(result).toEqual({ remoteUrl: 'tos://las-media-test/inputs/clip.mp4', previewUrl: 'https://las-media-test.tos-cn-beijing.volces.com/inputs/clip.mp4?X-Tos-Signature=test' })
    expect(request!.url).toBe('https://sd7gf0bn2atgtkgkm07a0.apigateway-cn-beijing.volceapi.com/api/v1/files/upload')
    expect(request!.method).toBe('POST')
    expect(request!.headers.get('Authorization')).toBe(`Bearer ${key}`)
    const form = await request!.formData()
    expect([...form.keys()]).toEqual(['file'])
    const file = form.get('file') as File
    expect(file.name).toBe('demo.mp4')
    expect(file.type).toBe('video/mp4')
    expect(Buffer.from(await file.arrayBuffer())).toEqual(bytes)
    expect(JSON.stringify(result)).not.toContain(key)
  })

  it.each([
    ['photo.PNG', 'image', 'image/png'], ['photo.JPEG', 'image', 'image/jpeg'],
    ['photo.webp', 'image', 'image/webp'], ['clip.mov', 'video', 'video/quicktime'],
    ['clip.webm', 'video', 'video/webm'], ['unknown.bin', 'video', 'application/octet-stream'],
  ] as const)('sets the upload MIME type for %s', async (name, kind, expectedType) => {
    const upstream: typeof fetch = async (url, init) => {
      const form = await new Request(url, init).formData()
      expect((form.get('file') as File).type).toBe(expectedType)
      return json(success())
    }
    await uploadElementReplacementMedia({ apiKey: key, fileUploadUrl: 'https://upload.example.com/files' }, bytes, `/private/${name}`, kind, upstream)
  })

  it.each(['', '   '])('rejects an unconfigured key before uploading', async (apiKey) => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
    await expect(uploadElementReplacementMedia({ apiKey }, bytes, 'clip.mp4', 'video', upstream)).rejects.toThrow()
    expect(upstream).not.toHaveBeenCalled()
  })

  it('rejects an empty local file before uploading', async () => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
    await expect(uploadElementReplacementMedia({ apiKey: key }, Buffer.alloc(0), 'clip.mp4', 'video', upstream)).rejects.toThrow()
    expect(upstream).not.toHaveBeenCalled()
  })

  it.each([
    { code: 0, data: null }, { code: 0, data: {} }, { code: '0', data: success().data },
    { code: 17, message: `bad ${key} Bearer additional-secret`, data: success().data },
  ])('rejects malformed or failed provider responses without exposing credentials', async value => {
    const upstream = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(json(value))
    const message = await uploadElementReplacementMedia({ apiKey: key }, bytes, 'clip.mp4', 'video', upstream).catch(error => String(error))
    expect(message).toMatch(/上传|返回/)
    expect(message).not.toContain(key)
    expect(message).not.toContain('additional-secret')
    expect(upstream).toHaveBeenCalledTimes(1)
  })

  it.each([
    'http://example.com/clip.mp4', 'https://127.0.0.1/clip.mp4', 'https://192.168.1.2/clip.mp4',
    'https://[::1]/clip.mp4', 'https://[::ffff:7f00:1]/clip.mp4', 'https://media.local/clip.mp4',
    'https://user:password@example.com/clip.mp4', 'data:video/mp4;base64,AA==',
  ])('rejects an unsafe provider preview URL: %s', async presigned_url => {
    const upstream: typeof fetch = async () => json(success({ presigned_url }))
    await expect(uploadElementReplacementMedia({ apiKey: key }, bytes, 'clip.mp4', 'video', upstream)).rejects.toThrow(/上传|返回/)
  })

  it.each([
    { bucket: '' }, { bucket: '../other' }, { bucket: 'bucket/other' },
    { object_key: '' }, { object_key: '/absolute.mp4' }, { object_key: '../clip.mp4' }, { object_key: 'folder\\clip.mp4' },
  ])('rejects invalid provider object references: %j', async data => {
    const upstream: typeof fetch = async () => json(success(data))
    await expect(uploadElementReplacementMedia({ apiKey: key }, bytes, 'clip.mp4', 'video', upstream)).rejects.toThrow(/上传|返回/)
  })

  it('encodes spaces and reserved characters in a valid object key', async () => {
    const upstream: typeof fetch = async () => json(success({ object_key: 'inputs/商品 1#2.png' }))
    const result = await uploadElementReplacementMedia({ apiKey: key }, bytes, '商品.png', 'image', upstream)
    expect(result.remoteUrl).toBe('tos://las-media-test/inputs/%E5%95%86%E5%93%81%201%232.png')
  })

  it('does not retry a failed upload and redacts network error credentials', async () => {
    let calls = 0
    const upstream: typeof fetch = async (_url, init) => {
      calls++
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      throw new Error(`network ${key}`)
    }
    await expect(uploadElementReplacementMedia({ apiKey: key }, bytes, 'clip.mp4', 'video', upstream)).rejects.toThrow(/上传/)
    expect(calls).toBe(1)
  })

  it('redacts an HTTP error response instead of returning its credential echo', async () => {
    const upstream: typeof fetch = async () => json({ code: 401, message: `invalid ${key}` }, 401)
    try {
      await uploadElementReplacementMedia({ apiKey: key }, bytes, 'clip.mp4', 'video', upstream)
      expect.unreachable()
    } catch (error) {
      expect(String(error)).toMatch(/上传/)
      expect(String(error)).not.toContain(key)
    }
  })
})
