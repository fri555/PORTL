import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ElementReplacementInput } from '@/types/element-replacement'
import ElementReplacementConfig from '../ElementReplacementConfig.vue'
import { releaseLocalVideo } from '@/components/video-generation/storyboard/local-preview'

const wrappers: VueWrapper[] = []
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB'
function input(): ElementReplacementInput {
  return {
    replacementType: 'person',
    sourceVideo: { id: 'source', kind: 'video', source: 'url', name: 'runway.mp4', url: 'https://example.com/runway.mp4' },
    groups: [{ id: 'group-1', description: '左侧黑衣模特', reference: { id: 'reference-1', kind: 'image', source: 'upload', name: 'reference.png', url: image } }],
    preservePrompt: '保持原视频的动作、镜头和背景',
    settings: { model: 'seedance-2.0', resolution: '720p', ratio: 'adaptive', generateAudio: false, duration: null, watermark: false, returnLastFrame: true, priority: 0, executionExpiresAfter: 172800 },
    audioUrls: [],
    prototypeDemo: true,
  }
}
function mountConfig(initialData?: Record<string, any>, props: Record<string, any> = {}) {
  const wrapper = mount(ElementReplacementConfig, { props: { initialData, ...props }, attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('元素替换配置', () => {
  it('starts with one empty group, renumbers after deletion and keeps at least one group', async () => {
    const wrapper = mountConfig()
    expect(wrapper.findAll('[data-testid="replacement-group"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="remove-group"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="add-group"]').trigger('click')
    await wrapper.get('[data-testid="add-group"]').trigger('click')
    await wrapper.get('[aria-label="替换 3 原元素说明"]').setValue('第三组描述')
    await wrapper.findAll('[data-testid="remove-group"]')[1]!.trigger('click')
    expect(wrapper.findAll('[data-testid="group-title"]').map((node) => node.text())).toEqual(['替换 1', '替换 2'])
    expect(wrapper.get('[aria-label="替换 2 原元素说明"]').element).toHaveProperty('value', '第三组描述')
    await wrapper.findAll('[data-testid="remove-group"]')[0]!.trigger('click')
    expect(wrapper.findAll('[data-testid="replacement-group"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="remove-group"]').attributes('disabled')).toBeDefined()
  })

  it('shows validation and does not submit an empty configuration', async () => {
    const wrapper = mountConfig()
    await wrapper.get('[data-testid="generate-replacement"]').trigger('click')
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.get('[role="alert"]').text()).toMatch(/视频/)
  })

  it('accepts only http or https links and keeps the mapping when a bad link is rejected', async () => {
    const wrapper = mountConfig(input())
    await wrapper.get('[data-testid="video-link"]').trigger('click')
    await wrapper.get('[aria-label="素材链接"]').setValue('javascript:alert(1)')
    await wrapper.get('[data-testid="confirm-media-link"]').trigger('click')
    expect(wrapper.get('[role="dialog"]').text()).toContain('http')
    expect(wrapper.emitted('submit')).toBeUndefined()
    await wrapper.get('[aria-label="素材链接"]').setValue('https://example.com/new-video.mp4')
    await wrapper.get('[data-testid="confirm-media-link"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.emitted('submit')).toBeUndefined()
    await wrapper.get('[aria-label="替换 1 参考图链接"]').trigger('click')
    await wrapper.get('[aria-label="素材链接"]').setValue('file:///image.png')
    await wrapper.get('[data-testid="confirm-media-link"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    await wrapper.get('[aria-label="关闭素材对话框"]').trigger('click')
    await wrapper.get('[data-testid="generate-replacement"]').trigger('click')
    const payload = wrapper.emitted('submit')?.[0]?.[0] as ElementReplacementInput
    expect(payload.sourceVideo?.url).toBe('https://example.com/new-video.mp4')
    expect(payload.groups[0]?.reference?.url).toBe(image)
  })

  it('selects existing video and image materials through the media dialogs', async () => {
    const wrapper = mountConfig()
    await wrapper.get('[data-testid="video-materials"]').trigger('click')
    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe('素材库')
    await wrapper.findAll('[data-testid="material-choice"]')[0]!.trigger('click')
    await wrapper.get('[data-testid="confirm-material"]').trigger('click')
    expect(wrapper.find('video').exists()).toBe(true)
    await wrapper.get('[aria-label="替换 1 选择素材库"]').trigger('click')
    await wrapper.findAll('[data-testid="material-choice"]')[0]!.trigger('click')
    await wrapper.get('[data-testid="confirm-material"]').trigger('click')
    expect(wrapper.get('[data-testid="reference-preview"]').attributes('src')).toBeTruthy()
    await wrapper.get('[aria-label="替换 1 原元素说明"]').setValue('左侧原模特')
    await wrapper.get('[data-testid="generate-replacement"]').trigger('click')
    const payload = wrapper.emitted('submit')?.[0]?.[0] as ElementReplacementInput
    expect(payload.sourceVideo?.source).toMatch(/material|demo/)
    expect(payload.groups[0]?.reference?.kind).toBe('image')
  })

  it('preserves mappings while switching among the three allowed models at low resolution', async () => {
    const wrapper = mountConfig(input())
    await wrapper.get('[data-testid="advanced-settings"]').trigger('click')
    await wrapper.get('[aria-label="输出分辨率"]').setValue('480p')
    await wrapper.get('[aria-label="画面比例"]').setValue('9:16')
    await wrapper.get('[aria-label="生成同步音频"]').setValue(true)
    await wrapper.get('[data-type="product"]').trigger('click')
    expect(wrapper.get('[aria-label="替换 1 原元素说明"]').element).toHaveProperty('value', '左侧黑衣模特')
    expect(wrapper.get('[aria-label="输出分辨率"]').element).toHaveProperty('value', '480p')
    expect(wrapper.get('[aria-label="视频模型"]').findAll('option').map(option => option.attributes('value'))).toEqual(['seedance-2.0', 'seedance-2.0-fast', 'seedance-2.0-mini'])
    await wrapper.get('[aria-label="视频模型"]').setValue('seedance-2.0-fast')
    expect(wrapper.get('[aria-label="输出分辨率"]').findAll('option').map(option => option.attributes('value'))).toEqual(['480p', '720p'])
    await wrapper.get('[data-testid="generate-replacement"]').trigger('click')
    const payload = wrapper.emitted('submit')?.[0]?.[0] as ElementReplacementInput
    expect(payload.replacementType).toBe('product')
    expect(payload.settings).toMatchObject({ model: 'seedance-2.0-fast', resolution: '480p', ratio: '9:16', generateAudio: true })
    expect(payload.groups[0]?.reference?.url).toBe(image)
    expect(payload.prototypeDemo).toBe(false)
  })

  it('validates the task name in the configuration and submits a trimmed name separately from operator input', async () => {
    const wrapper = mountConfig(input())
    const name = wrapper.get('[aria-label="任务名称"]')
    await name.setValue('   ')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.get('[role="alert"]').text()).toContain('任务名称')
    await name.setValue('x'.repeat(21))
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    await name.setValue('  商品视频替换  ')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]?.[1]).toBe('商品视频替换')
    expect(wrapper.emitted('submit')?.[0]?.[0]).not.toHaveProperty('taskName')
  })

  it('removes manual duration, reference audio, watermark and last-frame controls and derives duration from the source on submit', async () => {
    const initial = input()
    delete (initial.settings as Partial<ElementReplacementInput['settings']>).returnLastFrame
    initial.sourceVideo!.duration = 6.6
    initial.settings.duration = -1
    initial.audioUrls = ['https://example.com/old-audio.mp3']
    const wrapper = mountConfig(initial)
    await wrapper.get('[data-testid="advanced-settings"]').trigger('click')
    expect(wrapper.find('[aria-label="输出时长（秒）"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="参考音频链接"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="显示AI生成水印"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="返回视频尾帧"]').exists()).toBe(false)
    expect(wrapper.findAll('.generation-switches input').map(node => node.attributes('aria-label'))).toEqual(['生成同步音频'])
    await wrapper.get('form').trigger('submit')
    const payload = wrapper.emitted('submit')?.[0]?.[0] as ElementReplacementInput
    expect(payload.audioUrls).toEqual([])
    expect(payload.settings).toMatchObject({ duration: 7, watermark: false, returnLastFrame: true })
    expect(payload.prototypeDemo).toBe(false)
  })

  it('loads demo media only on request and keeps navigation in the breadcrumb', async () => {
    const wrapper = mountConfig()
    expect(wrapper.find('video').exists()).toBe(false)
    await wrapper.get('[data-testid="use-demo-media"]').trigger('click')
    expect(wrapper.find('video').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="reference-preview"]').length).toBeGreaterThan(0)
    expect(wrapper.find('[data-testid="replacement-back"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('素材将上传并提交真实生成任务')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('releases an unsaved local video when the configuration is closed', async () => {
    const revoke = vi.fn()
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn(() => 'blob:replacement-unsaved')
      static revokeObjectURL = revoke
    })
    const wrapper = mountConfig()
    const fileInput = wrapper.get('[data-testid="replacement-video-file"]')
    Object.defineProperty(fileInput.element, 'files', { configurable: true, value: [new File(['video'], 'clip.mp4', { type: 'video/mp4' })] })
    await fileInput.trigger('change')
    expect(wrapper.get('video').attributes('src')).toBe('blob:replacement-unsaved')
    wrapper.unmount()
    expect(revoke).toHaveBeenCalledWith('blob:replacement-unsaved')
  })

  it('keeps a local video preview once a saved task references its source identifier', async () => {
    const revoke = vi.fn()
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn(() => 'blob:replacement-saved')
      static revokeObjectURL = revoke
    })
    const wrapper = mountConfig(input())
    const fileInput = wrapper.get('[data-testid="replacement-video-file"]')
    Object.defineProperty(fileInput.element, 'files', { configurable: true, value: [new File(['video'], 'clip.mp4', { type: 'video/mp4' })] })
    await fileInput.trigger('change')
    await wrapper.get('[data-testid="generate-replacement"]').trigger('click')
    const payload = wrapper.emitted('submit')?.[0]?.[0] as ElementReplacementInput
    expect(payload.sourceVideo?.url).toMatch(/^local-video:/)
    localStorage.setItem('tianma-video-prototype-v1', JSON.stringify([{ id: 'saved-task', operator: 'storyboard', name: '已保存任务', status: 'completed', createdAt: new Date().toISOString(), input: payload }]))
    wrapper.unmount()
    expect(revoke).not.toHaveBeenCalled()
    releaseLocalVideo(payload.sourceVideo!.url)
  })

  it('stores uploaded reference images as data URLs for the submitted configuration', async () => {
    const wrapper = mountConfig(input())
    await wrapper.get('[aria-label="替换 1 上传参考图"]').trigger('click')
    const fileInput = wrapper.get('[data-testid="replacement-reference-file"]')
    Object.defineProperty(fileInput.element, 'files', { configurable: true, value: [new File(['image'], 'person.png', { type: 'image/png' })] })
    await fileInput.trigger('change')
    await vi.waitFor(() => expect(wrapper.get('[data-testid="reference-preview"]').attributes('alt')).toBe('person.png'))
    await wrapper.get('[data-testid="generate-replacement"]').trigger('click')
    const payload = wrapper.emitted('submit')?.[0]?.[0] as ElementReplacementInput
    expect(payload.groups[0]?.reference).toMatchObject({ name: 'person.png', source: 'upload', kind: 'image' })
    expect(payload.groups[0]?.reference?.url).toMatch(/^data:image\/png;base64,/)
  })

  it('shows upload constraints and keeps the selected video when a replacement exceeds 100 MiB', async () => {
    const createObjectURL = vi.fn(() => 'blob:should-not-exist')
    vi.stubGlobal('URL', class extends URL { static createObjectURL = createObjectURL; static revokeObjectURL = vi.fn() })
    const wrapper = mountConfig(input())
    expect(wrapper.text()).toContain('MP4、MOV')
    expect(wrapper.text()).toContain('100 MiB')
    await wrapper.findAll('.video-sources button')[1]!.trigger('click')
    const file = new File(['small'], 'oversized.mp4', { type: 'video/mp4' })
    Object.defineProperty(file, 'size', { value: 100 * 1024 * 1024 + 1 })
    const fileInput = wrapper.get('[data-testid="replacement-video-file"]')
    Object.defineProperty(fileInput.element, 'files', { configurable: true, value: [file] })
    await fileInput.trigger('change')
    expect(wrapper.text()).toContain('视频不能超过 100 MiB')
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="video-link"]').classes()).toContain('active')
    await wrapper.get('form').trigger('submit')
    expect((wrapper.emitted('submit')?.[0]?.[0] as ElementReplacementInput).sourceVideo?.url).toBe('https://example.com/runway.mp4')
  })

  it('requires matching supported image extension and MIME without replacing the selected reference', async () => {
    const reader = vi.fn()
    vi.stubGlobal('FileReader', class { readAsDataURL = reader })
    const wrapper = mountConfig(input())
    expect(wrapper.text()).toContain('JPG、JPEG、PNG、WEBP、GIF、BMP')
    expect(wrapper.text()).toContain('10 MiB')
    await wrapper.get('[aria-label="替换 1 上传参考图"]').trigger('click')
    const fileInput = wrapper.get('[data-testid="replacement-reference-file"]')
    Object.defineProperty(fileInput.element, 'files', { configurable: true, value: [new File(['image'], 'portrait.png', { type: 'image/jpeg' })] })
    await fileInput.trigger('change')
    expect(wrapper.text()).toContain('扩展名与实际类型一致')
    expect(reader).not.toHaveBeenCalled()
    await wrapper.get('form').trigger('submit')
    expect((wrapper.emitted('submit')?.[0]?.[0] as ElementReplacementInput).groups[0]?.reference?.url).toBe(image)
  })

  it('rejects TIFF outside the production image whitelist and keeps the selected reference', async () => {
    const reader = vi.fn()
    vi.stubGlobal('FileReader', class { readAsDataURL = reader })
    const wrapper = mountConfig(input())
    const fileInput = wrapper.get('[data-testid="replacement-reference-file"]')
    expect(fileInput.attributes('accept')).toBe('.jpg,.jpeg,.png,.webp,.gif,.bmp,image/jpeg,image/png,image/webp,image/gif,image/bmp')
    await wrapper.get('[aria-label="替换 1 上传参考图"]').trigger('click')
    Object.defineProperty(fileInput.element, 'files', { configurable: true, value: [new File(['image'], 'portrait.tiff', { type: 'image/tiff' })] })
    await fileInput.trigger('change')
    expect(wrapper.text()).toContain('仅支持 JPG、JPEG、PNG、WEBP、GIF、BMP')
    expect(reader).not.toHaveBeenCalled()
    await wrapper.get('form').trigger('submit')
    expect((wrapper.emitted('submit')?.[0]?.[0] as ElementReplacementInput).groups[0]?.reference?.url).toBe(image)
  })

  it('shows 保存修改 for a queued task and still blocks repeat submission while submitting', async () => {
    const wrapper = mountConfig(input(), { queued: true })
    expect(wrapper.get('[data-testid="generate-replacement"]').text()).toBe('保存修改')
    await wrapper.setProps({ submitting: true, submissionStage: '正在保存' })
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.get('[data-testid="generate-replacement"]').text()).toBe('正在保存')
  })

  it('rejects credential-bearing links consistently with shared media validation', async () => {
    const wrapper = mountConfig()
    await wrapper.get('[data-testid="video-link"]').trigger('click')
    await wrapper.get('[aria-label="素材链接"]').setValue('https://user:password@example.com/video.mp4')
    await wrapper.get('[data-testid="confirm-media-link"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.get('[role="dialog"] [role="alert"]').text()).toContain('http')
  })

  it('supports keyboard navigation of the replacement type radio group', async () => {
    const wrapper = mountConfig()
    await wrapper.get('[data-type="person"]').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.get('[data-type="product"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.get('[data-type="product"]').attributes('tabindex')).toBe('0')
    expect(wrapper.get('[data-type="person"]').attributes('tabindex')).toBe('-1')
  })

  it('shows actionable media failure states without replacing a failed reference image with invented artwork', async () => {
    const wrapper = mountConfig(input())
    await wrapper.get('[data-testid="reference-preview"]').trigger('error')
    expect(wrapper.text()).toContain('参考图暂时无法加载，请检查链接或重新选择')
    await wrapper.get('video').trigger('error')
    expect(wrapper.text()).toContain('当前视频暂时无法播放，可更换视频或检查链接')
  })

  it('updates system preservation defaults for background replacement and keeps custom instructions', async () => {
    const wrapper = mountConfig(input())
    await wrapper.get('[data-type="background"]').trigger('click')
    expect(wrapper.get('[aria-label="补充要求"]').element).toHaveProperty('value', '保持原视频的人物、动作和镜头')
    await wrapper.get('[data-type="person"]').trigger('click')
    expect(wrapper.get('[aria-label="补充要求"]').element).toHaveProperty('value', '保持原视频的动作、镜头和背景')
    await wrapper.get('[aria-label="补充要求"]').setValue('保持运动轨迹和画面字幕')
    await wrapper.get('[data-type="background"]').trigger('click')
    expect(wrapper.get('[aria-label="补充要求"]').element).toHaveProperty('value', '保持运动轨迹和画面字幕')
  })

  it('prioritizes the material library and requires explicit media selection', async () => {
    const wrapper = mountConfig()
    expect(wrapper.findAll('.video-sources button').map(node => node.text())).toEqual(['素材库', '本地上传', '视频链接'])
    expect(wrapper.get('[data-testid="video-materials"]').classes()).toContain('active')
    expect(wrapper.findAll('[role="radio"]').map(node => node.text())).toEqual(['模特', '商品', '场景'])
    expect(wrapper.findAll('.reference-actions button').map(node => node.text())).toEqual(['素材库', '上传', '链接'])
    await wrapper.get('[data-testid="video-materials"]').trigger('click')
    expect(wrapper.get('[data-testid="confirm-material"]').attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('[data-testid="material-choice"]').every(node => node.attributes('aria-selected') === 'false')).toBe(true)
    await wrapper.get('[data-testid="confirm-material"]').trigger('click')
    expect(wrapper.find('video').exists()).toBe(false)
  })

  it('replaces custom text with the selected common requirement', async () => {
    const wrapper = mountConfig(input())
    const field = wrapper.get('[aria-label="补充要求"]')
    await field.setValue('保留品牌 Logo，不添加字幕')
    const preset = wrapper.get('[aria-label="选择常用要求"]')
    expect((preset.element as HTMLSelectElement).value).toBe('')
    await preset.setValue('保持原视频的动作、镜头和背景')
    expect(field.element).toHaveProperty('value', '保持原视频的动作、镜头和背景')
    expect((preset.element as HTMLSelectElement).value).toBe('保持原视频的动作、镜头和背景')
    expect(wrapper.find('[data-testid="final-prompt-preview"]').exists()).toBe(false)
  })

  it('updates a selected system preset for scene replacement without changing custom text', async () => {
    const wrapper = mountConfig(input())
    await wrapper.get('[aria-label="补充要求"]').setValue('保持原视频的动作、镜头和背景； 保留品牌 Logo ')
    await wrapper.get('[data-type="background"]').trigger('click')
    expect(wrapper.get('[aria-label="补充要求"]').element).toHaveProperty('value', '保持原视频的人物、动作和镜头； 保留品牌 Logo ')
    expect(wrapper.get('[aria-label="选择常用要求"]').findAll('option')).toHaveLength(4)
  })

  it('does not submit again while uploading or submitting and shows the current stage', async () => {
    const wrapper = mountConfig(input())
    await wrapper.setProps({ submitting: true, submissionStage: '正在上传视频' })
    expect(wrapper.get('[data-testid="generate-replacement"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="generate-replacement"]').text()).toBe('正在上传视频')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    await wrapper.setProps({ submitting: false })
    await wrapper.get('form').trigger('submit')
    expect((wrapper.emitted('submit')?.[0]?.[0] as ElementReplacementInput).settings.duration).toBeNull()
    expect(wrapper.text()).not.toContain('原型演示 · 生成结果仅供交互体验')
  })

  it('keeps a newly selected reference when an earlier upload finishes reading later', async () => {
    let finishRead: (() => void) | undefined
    vi.stubGlobal('FileReader', class {
      result = 'data:image/png;base64,b2xkLXVwbG9hZA=='
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      onabort: (() => void) | null = null
      readAsDataURL() { finishRead = () => this.onload?.() }
      abort() { this.onabort?.() }
    })
    const wrapper = mountConfig(input())
    await wrapper.get('[aria-label="替换 1 上传参考图"]').trigger('click')
    const fileInput = wrapper.get('[data-testid="replacement-reference-file"]')
    Object.defineProperty(fileInput.element, 'files', { configurable: true, value: [new File(['image'], 'older-upload.png', { type: 'image/png' })] })
    await fileInput.trigger('change')
    await wrapper.get('[aria-label="替换 1 参考图链接"]').trigger('click')
    await wrapper.get('[aria-label="素材链接"]').setValue('https://example.com/new-reference.png')
    await wrapper.get('[data-testid="confirm-media-link"]').trigger('click')
    finishRead?.()
    await flushPromises()
    await wrapper.get('[data-testid="generate-replacement"]').trigger('click')
    const payload = wrapper.emitted('submit')?.[0]?.[0] as ElementReplacementInput
    expect(payload.groups[0]?.reference?.url).toBe('https://example.com/new-reference.png')
  })
})
