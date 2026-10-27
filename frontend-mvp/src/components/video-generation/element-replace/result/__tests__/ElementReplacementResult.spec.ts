import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ElementReplacementResult from '../ElementReplacementResult.vue'
import type { VideoTask } from '@/types/video-generation'
import { createElementReplacementInput } from '@/composables/useElementReplacement'

const task: VideoTask = {
  id: 'element-1', operator: 'element-replace' as VideoTask['operator'], name: '模特替换', status: 'completed', createdAt: '2026-10-22T00:00:00Z',
  input: { replacementType: 'person', sourceVideo: { id: 'source', name: 'runway.mp4', kind: 'video', source: 'url', url: 'https://example.com/runway.mp4' },
    groups: [{ id: 'g-1', description: '左侧穿黑色外套的模特', reference: { id: 'image-1', name: '人物参考图', kind: 'image', source: 'url', url: 'https://example.com/person.jpg' } }],
    preservePrompt: '保持原视频动作、镜头和背景', settings: { model: 'seedance-2.0', resolution: '1080p', ratio: 'adaptive', generateAudio: true }, prototypeDemo: true, resultUsesOriginal: true },
}

describe('element replacement result', () => {
  beforeEach(() => { vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {}) })
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it('shows original media on both sides without prototype or navigation actions', () => {
    const wrapper = mount(ElementReplacementResult, { props: { task } })
    expect(wrapper.findAll('video')).toHaveLength(2)
    expect(wrapper.findAll('video').map(video => video.attributes('src'))).toEqual(['https://example.com/runway.mp4', 'https://example.com/runway.mp4'])
    expect(wrapper.text()).not.toContain('原型演示')
    expect(wrapper.find('[data-testid="replacement-edit"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="replacement-back"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('plays the actual result in live mode without any demonstration label or source fallback', () => {
    const liveTask: VideoTask = { ...task, input: { ...task.input, prototypeDemo: false,
      resultUsesOriginal: true,
      resultVideo: { id: 'real-result', name: '真实替换视频.mp4', kind: 'video', source: 'url', url: 'https://example.com/real-result.mp4' } } }
    const wrapper = mount(ElementReplacementResult, { props: { task: liveTask } })
    expect(wrapper.findAll('video').map(video => video.attributes('src'))).toEqual(['https://example.com/runway.mp4', 'https://example.com/real-result.mp4'])
    expect(wrapper.text()).not.toContain('原型演示')
    expect(wrapper.text()).not.toContain('使用源视频演示')
    expect(wrapper.get('[data-testid="replacement-download"]').attributes('href')).toBe('https://example.com/real-result.mp4')
    expect(wrapper.get('[data-testid="replacement-download"]').attributes('download')).toBe('真实替换视频.mp4')
    wrapper.unmount()
  })

  it('keeps a live task without a result visibly unavailable instead of playing its source as a result', () => {
    const wrapper = mount(ElementReplacementResult, { props: { task: { ...task, input: { ...task.input, prototypeDemo: false } } } })
    expect(wrapper.findAll('video')).toHaveLength(1)
    expect(wrapper.find('[aria-label="替换结果播放器"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('结果视频暂不可用')
    expect(wrapper.text()).not.toContain('原型演示')
    expect(wrapper.get('[data-testid="replacement-download"]').attributes('aria-disabled')).toBe('true')
    expect(wrapper.get('[data-testid="replacement-download"]').attributes('href')).toBeUndefined()
    wrapper.unmount()
  })

  it('keeps historical tasks without an explicit mode on the existing media flow', () => {
    const historicalInput = { ...task.input }
    delete historicalInput.prototypeDemo
    const wrapper = mount(ElementReplacementResult, { props: { task: { ...task, input: historicalInput } } })
    expect(wrapper.text()).not.toContain('原型演示')
    expect(wrapper.findAll('video')).toHaveLength(2)
    wrapper.unmount()
  })

  it('provides the real last frame as a separate download when the service returned it', () => {
    const wrapper = mount(ElementReplacementResult, { props: { task: { ...task,
      input: { ...task.input, prototypeDemo: false, resultVideo: { ...task.input.sourceVideo, url: 'https://example.com/real-result.mp4' } },
      remoteJob: { id: 'job-1', status: 'completed', createdAt: task.createdAt, updatedAt: task.createdAt, result: { videoUrl: 'https://example.com/real-result.mp4', lastFrameUrl: 'https://example.com/result-last.jpg?signature=value' } },
    } } })
    const frame = wrapper.get('[data-testid="replacement-last-frame-download"]')
    expect(frame.text()).toContain('下载尾帧')
    expect(frame.attributes('href')).toBe('https://example.com/result-last.jpg?signature=value')
    expect(frame.attributes('download')).toContain('模特替换-尾帧')
    wrapper.unmount()
  })

  it.each([
    ['doubao-seedance-2-0-260128', 'Seedance 2.0'],
    ['doubao-seedance-2-0-fast-260128', 'Seedance 2.0 Fast'],
    ['doubao-seedance-2-0-mini-260615', 'Seedance 2.0 Mini'],
  ])('shows the actual returned model %s and resolution without changing saved settings', async (model, label) => {
    const actualTask: VideoTask = { ...task, input: { ...task.input, prototypeDemo: false }, remoteJob: { id: 'job-1', status: 'completed', createdAt: task.createdAt, updatedAt: task.createdAt, result: { videoUrl: 'https://example.com/real.mp4', model, resolution: '720p' } } }
    const wrapper = mount(ElementReplacementResult, { props: { task: actualTask } })
    expect(wrapper.get('[data-testid="replacement-details-toggle"]').text()).toContain('720P')
    await wrapper.get('[data-testid="replacement-details-toggle"]').trigger('click')
    expect(wrapper.get('[data-testid="replacement-details"]').text()).toContain(`模型${label}`)
    expect(wrapper.get('[data-testid="replacement-details"]').text()).toContain('分辨率720P')
    expect(actualTask.input.settings).toMatchObject({ model: 'seedance-2.0', resolution: '1080p' })
    wrapper.unmount()
  })

  it('keeps native controls and synchronized playback without exposing timing diagnostics', async () => {
    const wrapper = mount(ElementReplacementResult, { props: { task } })
    const videos = wrapper.findAll('video')
    Object.defineProperty(videos[0]!.element, 'duration', { configurable: true, value: 30 })
    Object.defineProperty(videos[1]!.element, 'duration', { configurable: true, value: 12 })
    await videos[0]!.trigger('loadedmetadata')
    await videos[1]!.trigger('loadedmetadata')
    await flushPromises()
    expect(wrapper.find('[data-testid="original-duration"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="result-duration"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="common-duration"]').exists()).toBe(false)
    expect(videos[0]!.attributes('controls')).toBeDefined()
    expect(videos[1]!.attributes('controls')).toBeDefined()
    expect((videos[1]!.element as HTMLVideoElement).muted).toBe(true)
    ;(videos[1]!.element as HTMLVideoElement).muted = false
    await videos[1]!.trigger('volumechange')
    expect((videos[1]!.element as HTMLVideoElement).muted).toBe(true)
    wrapper.unmount()
  })

  it('copies a complete address for an application demo asset', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const wrapper = mount(ElementReplacementResult, { props: { task: { ...task, input: { ...task.input,
      sourceVideo: { ...task.input.sourceVideo, url: '/PORTL/assets/demo-video.mp4' },
    } } } })
    const address = `${window.location.origin}/PORTL/assets/demo-video.mp4`
    expect((wrapper.get('input[aria-label="输出地址"]').element as HTMLInputElement).value).toBe(address)
    await wrapper.get('[data-testid="replacement-copy"]').trigger('click'); await flushPromises()
    expect(writeText).toHaveBeenCalledWith(address)
    wrapper.unmount()
  })

  it('omits the resolution comparison strip from the result page', () => {
    const wrapper = mount(ElementReplacementResult, { props: { task } })
    expect(wrapper.find('[aria-label="视频输出信息"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="source-resolution"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="output-width"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('uses the returned actual resolution before video metadata without guessing its output width', () => {
    const wrapper = mount(ElementReplacementResult, { props: { task: { ...task,
      input: { ...task.input, prototypeDemo: false, resultVideo: { ...task.input.sourceVideo, url: 'https://example.com/real-result.mp4' } },
      remoteJob: { id: 'real', status: 'completed', createdAt: task.createdAt, updatedAt: task.createdAt, result: { videoUrl: 'https://example.com/real-result.mp4', resolution: '480p' } },
    } } })
    expect(wrapper.get('[data-testid="result-resolution-badge"]').text()).toBe('480p')
    wrapper.unmount()
  })

  it('keeps the output address read-only and reports copy failures with a usable retry', async () => {
    const writeText = vi.fn().mockRejectedValueOnce(new Error('clipboard denied')).mockResolvedValueOnce(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const wrapper = mount(ElementReplacementResult, { props: { task } })
    const address = wrapper.get('input[aria-label="输出地址"]')
    expect((address.element as HTMLInputElement).value).toBe('https://example.com/runway.mp4')
    expect(address.attributes('readonly')).toBeDefined()
    await wrapper.get('[data-testid="replacement-copy"]').trigger('click'); await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('复制失败')
    expect((address.element as HTMLInputElement).value).toBe('https://example.com/runway.mp4')
    await wrapper.get('[data-testid="replacement-copy"]').trigger('click'); await flushPromises()
    expect(wrapper.text()).toContain('已复制输出地址')
    expect(writeText).toHaveBeenLastCalledWith('https://example.com/runway.mp4')
    wrapper.unmount()
  })

  it('uses the single sync playback button to play or pause both native players', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    const wrapper = mount(ElementReplacementResult, { props: { task } })
    for (const video of wrapper.findAll('video')) {
      Object.defineProperties(video.element, { duration: { configurable: true, value: 8 }, readyState: { configurable: true, value: 4 } })
      await video.trigger('loadedmetadata')
    }
    await flushPromises()
    const control = wrapper.get('[data-testid="comparison-play"]')
    expect(control.text()).toBe('同步播放')
    await control.trigger('click'); await flushPromises()
    expect(play).toHaveBeenCalledTimes(2)
    expect(control.text()).toBe('暂停播放')
    await control.trigger('click'); await flushPromises()
    expect(control.text()).toBe('同步播放')
    expect(wrapper.findAll('video').every(video => video.attributes('controls') !== undefined)).toBe(true)
    wrapper.unmount()
  })

  it('keeps expired local media out of video src and offers configuration recovery', async () => {
    const wrapper = mount(ElementReplacementResult, { props: { task: { ...task, input: { ...task.input,
      sourceVideo: { ...task.input.sourceVideo, source: 'upload', url: 'local-video:expired-source' } } } } })
    expect(wrapper.find('video').exists()).toBe(false)
    expect(wrapper.text()).toContain('重新选择')
    expect(wrapper.get('[data-testid="replacement-download"]').attributes('aria-disabled')).toBe('true')
    wrapper.unmount()
  })

  it('shows the image-backed mapping, the assembled prompt and configuration rows', async () => {
    const wrapper = mount(ElementReplacementResult, { props: { task } })
    await wrapper.get('[data-testid="replacement-details-toggle"]').trigger('click')
    const details = wrapper.get('[data-testid="replacement-details"]')
    expect(details.find('[data-testid="replacement-detail-prompt"]').exists()).toBe(false)
    expect(details.text()).not.toContain('输入提示词')
    const mappings = details.findAll('[data-testid="replacement-detail-mapping"]')
    expect(mappings).toHaveLength(1)
    expect(mappings[0]!.text()).toContain('左侧穿黑色外套的模特')
    expect(mappings[0]!.get('img').attributes('src')).toBe('https://example.com/person.jpg')
    expect(mappings[0]!.get('img').attributes('alt')).toBe('人物参考图')
    expect(details.get('[data-testid="replacement-detail-final-prompt"]').text()).toContain('完整提示词')
    expect(details.get('[data-testid="replacement-detail-final-prompt"]').text()).toContain('将视频中的左侧穿黑色外套的模特完整替换为参考图1中的人物；保持原视频动作、镜头和背景；保持原视频时长和时间线')
    const config = details.get('[data-testid="replacement-detail-config"]')
    expect(config.get('[data-testid="replacement-detail-row"]').text()).toContain('替换类型')
    expect(config.findAll('[data-testid="replacement-detail-row"]').length).toBeGreaterThanOrEqual(6)
    expect(config.text()).not.toContain('AI 水印')
    expect(config.text()).not.toContain('返回尾帧')
    wrapper.unmount()
  })

  it.each([['person', '模特'], ['product', '商品'], ['background', '场景']])('shows the current user-facing %s category label', (replacementType, label) => {
    const wrapper = mount(ElementReplacementResult, { props: { task: { ...task, input: { ...task.input, replacementType } } } })
    expect(wrapper.get('[data-testid="replacement-details-toggle"]').text()).toContain(`${label} · 1 组`)
    wrapper.unmount()
  })

  it('omits retired audio references and manual duration from the visible configuration summary', async () => {
    const wrapper = mount(ElementReplacementResult, { props: { task: { ...task, input: { ...task.input, audioUrls: ['https://example.com/audio.mp3'], settings: { ...task.input.settings, duration: -1 } } } } })
    await wrapper.get('[data-testid="replacement-details-toggle"]').trigger('click')
    expect(wrapper.get('[data-testid="replacement-details"]').text()).not.toContain('参考音频')
    expect(wrapper.get('[data-testid="replacement-details"]').text()).not.toContain('audio.mp3')
    expect(wrapper.get('[data-testid="replacement-details"]').text()).not.toContain('自动时长')
    wrapper.unmount()
  })

  it.each([
    ['seedance-2.5', '1080p', 'Seedance 2.5', '1080P'],
    ['seedance-2.0', '4k', 'Seedance 2.0', '4K'],
    ['seedance-2.0-fast', '480p', 'Seedance 2.0 Fast', '480P'],
    ['seedance-2.0-mini', '720p', 'Seedance 2.0 Mini', '720P'],
    ['private-model-v3', 'original', 'private-model-v3', 'original'],
  ])('shows stored result model %s and resolution %s instead of current edit defaults', async (model, resolution, modelLabel, resolutionLabel) => {
    const storedTask = { ...task, input: { ...task.input, settings: { ...task.input.settings, model, resolution } } }
    const wrapper = mount(ElementReplacementResult, { props: { task: storedTask } })
    expect(wrapper.get('[data-testid="replacement-details-toggle"]').text()).toContain(resolutionLabel)
    await wrapper.get('[data-testid="replacement-details-toggle"]').trigger('click')
    expect(wrapper.get('[data-testid="replacement-details"]').text()).toContain(`模型${modelLabel}`)
    expect(wrapper.get('[data-testid="replacement-details"]').text()).toContain(`分辨率${resolutionLabel}`)
    expect(storedTask.input.settings).toEqual({ ...task.input.settings, model, resolution })
    wrapper.unmount()
  })

  it('preserves historical result details while the edit normalizer still retires old choices', async () => {
    const historicalTask = { ...task, input: { ...task.input, settings: { ...task.input.settings, model: 'seedance-2.5', resolution: '4k' } } }
    const wrapper = mount(ElementReplacementResult, { props: { task: historicalTask } })
    await wrapper.get('[data-testid="replacement-details-toggle"]').trigger('click')
    expect(wrapper.get('[data-testid="replacement-details"]').text()).toContain('模型Seedance 2.5')
    expect(wrapper.get('[data-testid="replacement-details"]').text()).toContain('分辨率4K')
    expect(createElementReplacementInput(historicalTask.input).settings).toMatchObject({ model: 'seedance-2.0-mini', resolution: '720p' })
    expect(historicalTask.input.settings).toMatchObject({ model: 'seedance-2.5', resolution: '4k' })
    wrapper.unmount()
  })
})
