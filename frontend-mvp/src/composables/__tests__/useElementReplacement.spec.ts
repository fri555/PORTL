import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createElementReplacementInput, validateElementReplacement, buildElementReplacementPrompt, getReplacementMediaUrl, listReplacementMedia, getDemoElementReplacementInput } from '../useElementReplacement'
import { saveVideoTask } from '../useVideoPrototype'

describe('element replacement input and media recovery', () => {
  beforeEach(() => localStorage.clear())
  it('preserves real uploaded references and explicit live mode during recovery', () => {
    const input = getDemoElementReplacementInput()
    const restored = createElementReplacementInput({ ...input, prototypeDemo: false, sourceVideo: { ...input.sourceVideo!, url: 'local-video:expired', remoteUrl: 'tos://bucket/source.mp4' }, groups: [{ id: 'one', description: '人物', reference: { ...input.groups[0]!.reference!, url: '', remoteUrl: 'asset://image-id' } }] })
    expect(restored.prototypeDemo).toBe(false)
    expect(restored.sourceVideo!.remoteUrl).toBe('tos://bucket/source.mp4')
    expect(restored.groups[0]!.reference!.remoteUrl).toBe('asset://image-id')
    expect(validateElementReplacement(restored)).toEqual([])
    expect(createElementReplacementInput().prototypeDemo).toBe(true)
  })
  it('starts one empty mapping and normalizes unsupported settings during recovery', () => {
    const input = createElementReplacementInput()
    expect(input.groups).toHaveLength(1)
    expect(input.sourceVideo).toBeNull()
    expect(input.settings).toEqual({ model: 'seedance-2.0-mini', resolution: '720p', ratio: 'adaptive', generateAudio: true, duration: null, watermark: false, returnLastFrame: true, priority: 0, executionExpiresAfter: 172800 })
    expect(input.audioUrls).toEqual([])
    const restored = createElementReplacementInput({ settings: { model: 'seedance-2.5', resolution: '4k', ratio: 'bad' }, groups: [null] })
    expect(restored.settings.model).toBe('seedance-2.0-mini')
    expect(restored.settings.resolution).toBe('720p')
    expect(restored.settings.ratio).toBe('adaptive')
    expect(restored.groups).toHaveLength(1)
  })
  it.each(['seedance-2.0', 'seedance-2.0-fast', 'seedance-2.0-mini'])('recovers the allowed %s model without changing valid settings', (model) => {
    const restored = createElementReplacementInput({ settings: { model, resolution: '480p', ratio: '9:16', generateAudio: false, duration: 18, watermark: true, returnLastFrame: true, priority: -3, executionExpiresAfter: 259200 }, audioUrls: ['https://example.com/audio.mp3', 'tos://bucket/audio.mp3', 'asset://audio-id'] })
    expect(restored.settings).toEqual({ model, resolution: '480p', ratio: '9:16', generateAudio: false, duration: 18, watermark: true, returnLastFrame: true, priority: -3, executionExpiresAfter: 259200 })
    expect(restored.audioUrls).toEqual(['https://example.com/audio.mp3', 'tos://bucket/audio.mp3', 'asset://audio-id'])
  })
  it.each(['1080p', '4k'])('restores a retired %s resolution with the new default', (resolution) => {
    expect(createElementReplacementInput({ settings: { model: 'seedance-2.0-fast', resolution } }).settings).toMatchObject({ model: 'seedance-2.0-fast', resolution: '720p' })
  })
  it('recovers invalid advanced parameters to defaults and isolates audio references', () => {
    const initial = { settings: { duration: -2, watermark: 'false', returnLastFrame: 1, priority: 1.5, executionExpiresAfter: 3599 }, audioUrls: ['https://example.com/audio.mp3'] }
    const restored = createElementReplacementInput(initial)
    expect(restored.settings).toMatchObject({ duration: null, watermark: false, returnLastFrame: true, priority: 0, executionExpiresAfter: 172800 })
    restored.audioUrls.push('asset://another-audio')
    expect(initial.audioUrls).toEqual(['https://example.com/audio.mp3'])
  })
  it.each([
    ['model', 'seedance-2.5'], ['model', 'unknown'], ['resolution', '1080p'], ['resolution', '4k'], ['ratio', '2:1'],
    ['duration', -2], ['duration', 1.5], ['duration', '8'], ['duration', Infinity],
    ['generateAudio', 'true'], ['watermark', 1], ['returnLastFrame', null], ['priority', 0.5], ['priority', Infinity],
    ['executionExpiresAfter', 3599], ['executionExpiresAfter', 259201], ['executionExpiresAfter', 3600.5],
  ])('rejects unsupported %s value %s before generation', (key, value) => {
    const input = getDemoElementReplacementInput()
    Object.assign(input.settings, { [key as string]: value })
    expect(validateElementReplacement(input).length).toBeGreaterThan(0)
  })
  it.each([
    { duration: null, priority: 0, executionExpiresAfter: 172800 },
    { duration: -1, priority: -1000000, executionExpiresAfter: 3600 },
    { duration: 0, priority: 1000000, executionExpiresAfter: 259200 },
    { duration: 1000000, priority: 2, executionExpiresAfter: 5000 },
  ])('accepts documented integer boundaries without inventing duration or priority limits: %o', (settings) => {
    const input = getDemoElementReplacementInput()
    Object.assign(input.settings, settings)
    input.audioUrls = ['http://example.com/audio.mp3', 'https://example.com/audio.mp3', 'tos://bucket/audio.mp3', 'asset://audio-id']
    expect(validateElementReplacement(input)).toEqual([])
  })
  it.each(['javascript:alert(1)', 'file:///audio.mp3', 'audio-id', 'asset://', 'tos://', 'https://', 'https://user:password@example.com/audio.mp3', 'https://example.com/audio.mp3\n'])('rejects invalid audio reference %s', (url) => {
    const input = getDemoElementReplacementInput()
    input.audioUrls = [url]
    expect(validateElementReplacement(input).join(' ')).toContain('音频')
  })
  it('requires usable video, descriptions and one image for every mapping', () => {
    expect(validateElementReplacement(createElementReplacementInput()).length).toBeGreaterThan(0)
    const demo = getDemoElementReplacementInput()
    expect(validateElementReplacement(demo)).toEqual([])
    demo.groups[1]!.reference = null
    expect(validateElementReplacement(demo).join(' ')).toContain('第2组')
    demo.sourceVideo!.url = 'local-video:expired'
    expect(validateElementReplacement(demo).join(' ')).toContain('源视频')
  })
  it('renumbers reference images after deleting or reordering mapping groups', () => {
    const input = getDemoElementReplacementInput()
    input.groups.reverse()
    expect(buildElementReplacementPrompt(input)).toContain(`${input.groups[0]!.description}完整替换为参考图1`)
    expect(buildElementReplacementPrompt(input)).toContain('保持原视频时长和时间线')
    input.groups.shift()
    expect(buildElementReplacementPrompt(input)).not.toContain('参考图2')
    expect(buildElementReplacementPrompt(input)).toContain(input.preservePrompt)
  })
  it('rejects unsafe and expired media URLs', () => {
    const video = getDemoElementReplacementInput().sourceVideo!
    expect(getReplacementMediaUrl({ ...video, url: 'javascript:alert(1)' })).toBe('')
    expect(getReplacementMediaUrl({ ...video, url: 'local-video:expired' })).toBe('')
    expect(getReplacementMediaUrl({ ...video, url: 'https://example.com/a.mp4' })).toContain('https://')
    expect(getReplacementMediaUrl({ ...video, kind: 'video', url: 'data:text/html,a' })).toBe('')
  })
  it.each(['tos://bucket/source.mp4', 'asset://video-id', 'asset-video-id'])('submits remote video reference %s without treating it as a browser preview', (url) => {
    const input = getDemoElementReplacementInput()
    input.sourceVideo!.url = url
    expect(validateElementReplacement(input)).toEqual([])
    expect(getReplacementMediaUrl(input.sourceVideo)).toBe('')
  })
  it.each(['tos://bucket/image.png', 'asset://image-id'])('submits remote image reference %s without treating it as a browser preview', (url) => {
    const input = getDemoElementReplacementInput()
    input.groups[0]!.reference!.url = url
    expect(validateElementReplacement(input)).toEqual([])
    expect(getReplacementMediaUrl(input.groups[0]!.reference)).toBe('')
  })
  it.each(['javascript:alert(1)', 'file:///source.mp4', 'https://user:password@example.com/source.mp4', 'asset://', 'tos://bucket', 'source.mp4', '../source', 'local-video:expired'])('rejects invalid remote video reference %s', (url) => {
    const input = getDemoElementReplacementInput()
    input.sourceVideo!.url = url
    expect(validateElementReplacement(input).join(' ')).toContain('源视频')
  })
  it('does not accept bare asset identifiers as image or audio references', () => {
    const input = getDemoElementReplacementInput()
    input.groups[0]!.reference!.url = 'asset-image-id'
    input.audioUrls = ['asset-audio-id']
    expect(validateElementReplacement(input).join(' ')).toContain('目标参考图')
    expect(validateElementReplacement(input).join(' ')).toContain('音频')
  })
  it('keeps valid nonpreviewable remote references in the media library', () => {
    localStorage.setItem('tianma-video-materials-v1', JSON.stringify([{ id: 'model-1', materialType: 'MODEL', materialName: '远程模特', status: 'completed', resultImage: 'asset://image-id' }]))
    saveVideoTask({ id: 'remote-video', operator: 'storyboard', name: '远程视频', status: 'completed', createdAt: new Date().toISOString(), input: { videoUrl: 'tos://bucket/source.mp4' } })
    expect(listReplacementMedia('image', 'person').find(item => item.name === '远程模特')?.url).toBe('asset://image-id')
    expect(listReplacementMedia('video').find(item => item.name === '远程视频')?.url).toBe('tos://bucket/source.mp4')
  })
  it('lists completed library media and ignores malformed records without crashing', () => {
    localStorage.setItem('tianma-video-materials-v1', JSON.stringify([null, { id: 'bad' }, { id: 'model-1', materialType: 'MODEL', materialName: '模特参考', status: 'completed', resultImage: 'data:image/png;base64,YQ==' }]))
    saveVideoTask({ id: 'video-1', operator: 'storyboard', name: '商品视频', status: 'completed', createdAt: new Date().toISOString(), input: { videoUrl: 'https://example.com/source.mp4' } })
    expect(listReplacementMedia('image', 'person').some(item => item.name === '模特参考')).toBe(true)
    expect(listReplacementMedia('image', 'product').some(item => item.name === '模特参考')).toBe(false)
    expect(listReplacementMedia('video').some(item => item.name === '商品视频')).toBe(true)
    localStorage.setItem('tianma-video-materials-v1', 'bad')
    expect(() => listReplacementMedia('image')).not.toThrow()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => { throw new Error('blocked') })
    expect(() => listReplacementMedia('image')).not.toThrow()
    vi.restoreAllMocks()
  })
  it('returns isolated drafts so edits do not mutate stored input or demo defaults', () => {
    const demo = getDemoElementReplacementInput()
    const copy = createElementReplacementInput(demo)
    copy.groups[0]!.description = 'changed'
    expect(demo.groups[0]!.description).not.toBe('changed')
    expect(getDemoElementReplacementInput().groups[0]!.description).not.toBe('changed')
  })
})
