import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StoryboardConfig from '../StoryboardConfig.vue'
import ReverseConfig from '../ReverseConfig.vue'
import StoryboardResult from '../StoryboardResult.vue'
import ReverseResult from '../ReverseResult.vue'
import { saveVideoTask } from '@/composables/useVideoPrototype'
import { getLocalVideoPreview, releaseLocalVideo } from '../local-preview'
import type { VideoTask } from '@/types/video-generation'

const task: VideoTask = {
  id: 'storyboard-1', operator: 'storyboard', name: '咖啡机展示', status: 'completed', createdAt: '2026-10-21T00:00:00Z',
  input: { videoUrl: 'https://example.com/coffee.mp4', minDuration: 4, maxDuration: 14,
    segments: [{ segmentId: 'shot-1', startTime: 0, endTime: 8, visualDescription: '银色咖啡机在清晨厨房完成研磨和萃取', referenceImages: [] }] },
}

describe('video storyboard prototype', () => {
  beforeEach(() => { localStorage.clear() })
  afterEach(() => { vi.restoreAllMocks() })

  it('requires a video source and an ordered, bounded segment duration before submitting', async () => {
    const wrapper = mount(StoryboardConfig)
    expect(wrapper.get('[data-testid="storyboard-submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="video-url-input"]').setValue('https://example.com/demo.mp4')
    await wrapper.get('[data-testid="min-duration"]').setValue('14')
    await wrapper.get('[data-testid="max-duration"]').setValue('5')
    expect(wrapper.get('[data-testid="storyboard-submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="min-duration"]').setValue('4')
    await wrapper.get('[data-testid="max-duration"]').setValue('14')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({ videoUrl: 'https://example.com/demo.mp4', minDuration: 4, maxDuration: 14 })
  })

  it('does not submit fractional or out of range segment durations', async () => {
    const wrapper = mount(StoryboardConfig, { props: { initialData: { videoUrl: 'https://example.com/demo.mp4' } } })
    for (const [minimum, maximum] of [[3, 14], [4, 16], [14, 14.5]]) {
      await wrapper.get('[data-testid="min-duration"]').setValue(String(minimum))
      await wrapper.get('[data-testid="max-duration"]').setValue(String(maximum))
      await wrapper.get('form').trigger('submit')
    }
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('rejects unsupported and oversized local videos without replacing the source', async () => {
    const wrapper = mount(StoryboardConfig)
    await wrapper.get('[data-testid="video-url-input"]').setValue('https://example.com/keep.mp4')
    const input = wrapper.get<HTMLInputElement>('[data-testid="video-file-input"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [new File(['abc'], 'clip.avi', { type: 'video/avi' })] })
    await input.trigger('change')
    expect(wrapper.get('[role="alert"]').text()).toContain('.mov / .mp4')
    const oversized = new File(['abc'], 'clip.mp4', { type: 'video/mp4' })
    Object.defineProperty(oversized, 'size', { value: 100 * 1024 * 1024 + 1 })
    Object.defineProperty(input.element, 'files', { configurable: true, value: [oversized] })
    await input.trigger('change')
    expect(wrapper.get('[role="alert"]').text()).toContain('100MB')
    expect(wrapper.get<HTMLInputElement>('[data-testid="video-url-input"]').element.value).toBe('https://example.com/keep.mp4')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('previews a supported local video and submits local file metadata for the prototype', async () => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:local-coffee') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    const wrapper = mount(StoryboardConfig)
    const input = wrapper.get<HTMLInputElement>('[data-testid="video-file-input"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [new File(['abc'], 'coffee.mp4', { type: 'video/mp4' })] })
    await input.trigger('change')
    expect(wrapper.get('video').attributes('src')).toBe('blob:local-coffee')
    await wrapper.get('form').trigger('submit')
    const payload = wrapper.emitted('submit')?.[0]?.[0] as Record<string, any>
    expect(payload).toMatchObject({ localVideo: true, fileName: 'coffee.mp4', fileSize: 3 })
    expect(payload.videoUrl).toMatch(/^local-video:/)
    expect(JSON.stringify(payload)).not.toContain('blob:')
    expect(getLocalVideoPreview(payload.videoUrl)).toBe('blob:local-coffee')
    saveVideoTask({ ...task, input: payload })
    wrapper.unmount()
    const result = mount(StoryboardResult, { props: { task: { ...task, input: payload } } })
    expect(result.get('video').attributes('src')).toBe('blob:local-coffee')
    result.unmount()
    releaseLocalVideo(payload.videoUrl)
    expect(getLocalVideoPreview(payload.videoUrl)).toBe('')
  })

  it('restores task details after refresh without requesting an expired local video URL', () => {
    const restoredTask = { ...task, input: { ...task.input, videoUrl: 'local-video:previous-page', localVideo: true, fileName: 'coffee.mp4' } }
    const result = mount(StoryboardResult, { props: { task: restoredTask } })
    expect(result.find('video').exists()).toBe(false)
    expect(result.get('[role="status"]').text()).toContain('重新选择本地视频后预览')
    expect(result.text()).toContain('银色咖啡机')
    result.unmount()
  })

  it('releases an unsubmitted local video when the source is changed', async () => {
    const revoked: string[] = []
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:unsaved-coffee' })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: (url: string) => revoked.push(url) })
    const wrapper = mount(StoryboardConfig)
    const input = wrapper.get<HTMLInputElement>('[data-testid="video-file-input"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [new File(['abc'], 'coffee.mp4')] })
    await input.trigger('change')
    await wrapper.get('[data-testid="video-url-input"]').setValue('https://example.com/replacement.mp4')
    expect(revoked).toEqual(['blob:unsaved-coffee'])
    expect(wrapper.get('video').attributes('src')).toBe('https://example.com/replacement.mp4')
    wrapper.unmount()
  })

  it('imports completed storyboard tasks and submits their segments with reusable demo prompts', async () => {
    saveVideoTask(task)
    saveVideoTask({ ...task, id: 'unfinished', name: '尚未完成', status: 'processing' })
    const wrapper = mount(ReverseConfig)
    await wrapper.get('[data-testid="reverse-import-btn"]').trigger('click')
    expect(wrapper.findAll('[data-testid="import-task-item"]')).toHaveLength(1)
    expect(wrapper.get('[role="dialog"]').text()).not.toContain('尚未完成')
    await wrapper.get('[data-testid="import-confirm"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({ sourceVideoUrl: 'https://example.com/coffee.mp4', segments: [{ segmentId: 'shot-1', startTime: 0, endTime: 8 }] })
    const payload = wrapper.emitted('submit')?.[0]?.[0] as Record<string, any>
    expect(payload.results[0].prompt).toContain('银色咖啡机')
    expect(payload.results[0].prompt).toContain('原型演示')
  })

  it('keeps generation unavailable until a storyboard is imported and preserves imported fields as read only', async () => {
    const wrapper = mount(ReverseConfig)
    expect(wrapper.get('[data-testid="reverse-submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.get('[data-testid="segment-description"]').attributes('disabled')).toBeDefined()
    saveVideoTask({ ...task, input: { ...task.input, segments: [{ segmentId: 'empty', startTime: 0, endTime: 8, visualDescription: '', referenceImages: [] }] } })
    await wrapper.get('[data-testid="reverse-import-btn"]').trigger('click')
    await wrapper.get('[data-testid="import-confirm"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.get('[role="alert"]').text()).toContain('视觉描述')
  })

  it('opens storyboard asset and script drawers with task-derived demonstration content', async () => {
    const wrapper = mount(StoryboardResult, { props: { task } })
    expect(wrapper.text()).toContain('原型演示')
    expect(wrapper.text()).toContain('银色咖啡机')
    await wrapper.get('[data-testid="asset-drawer-open"]').trigger('click')
    expect(wrapper.get('[role="dialog"]').text()).toContain('素材管理')
    await wrapper.get('[data-testid="asset-tab-scripts"]').trigger('click')
    await wrapper.get('[data-testid="script-expand"]').trigger('click')
    expect(wrapper.get('[data-testid="script-prompt"]').text()).toContain('银色咖啡机')
    await wrapper.get('[data-testid="drawer-close"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('selects a different storyboard segment from the timeline', async () => {
    const wrapper = mount(StoryboardResult, { props: { task: { ...task, input: { ...task.input,
      segments: [...task.input.segments, { segmentId: 'shot-2', startTime: 8, endTime: 16, visualDescription: '咖啡流入杯中', referenceImages: [] }] } } } })
    const segments = wrapper.findAll('[aria-pressed]')
    await segments[1]!.trigger('click')
    expect(segments[1]!.attributes('aria-pressed')).toBe('true')
    expect(segments[0]!.attributes('aria-pressed')).toBe('false')
  })

  it('copies the selected reverse prompt and exposes generated data for persistence', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const wrapper = mount(ReverseResult, { props: { task: { ...task, operator: 'prompt-reverse' } } })
    const input = wrapper.emitted('update-input')?.[0]?.[0] as Record<string, any>
    expect(input.results[0].prompt).toContain('银色咖啡机')
    await wrapper.get('[data-testid="reverse-copy"]').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('银色咖啡机'))
    expect(wrapper.text()).toContain('已复制')
  })
})
