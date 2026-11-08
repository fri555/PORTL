import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import VideoGenerationView from '../VideoGenerationView.vue'
import { listVideoTasks } from '@/composables/useVideoPrototype'
import { getDemoElementReplacementInput } from '@/composables/useElementReplacement'
import { ElMessage } from 'element-plus'

async function open(path = '/video-gen/capability-square') {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/video-gen/:capability', component: VideoGenerationView }] })
  await router.push(path); await router.isReady()
  const wrapper = mount(VideoGenerationView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}
describe('video prototype complete flow', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
  it('aligns the video sidebar around 爆款发现、能力广场 and 素材库', async () => {
    const { wrapper } = await open('/video-gen/douyin-hot-video')
    const navigation = wrapper.get('[aria-label="视频生成菜单"]')
    expect(navigation.findAll('button').map(button => button.text())).toEqual([
      '爆款发现',
      '能力广场',
      '素材库',
    ])
    expect(navigation.findAll('button')[0]?.classes()).toContain('active')
    expect(wrapper.get('.list-header h1').text()).toBe('爆款发现')
    wrapper.unmount()
  })
  it('creates a storyboard task, completes the demo and restores the task in its list', async () => {
    const { wrapper, router } = await open()
    await wrapper.get('[data-testid="capability-storyboard"]').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.path).toBe('/video-gen/storyboard')
    await wrapper.get('[data-testid="new-task"]').trigger('click')
    await wrapper.get('input[aria-label="任务名称"]').setValue('运动鞋镜头')
    await wrapper.get('form').trigger('submit'); await flushPromises()
    await wrapper.get('[data-testid="video-url-input"]').setValue('https://example.com/shoe.mp4')
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(listVideoTasks()[0]?.status).toBe('processing')
    const complete = wrapper.findAll('button').find(button => button.text() === '查看演示结果')!
    await complete.trigger('click'); await flushPromises()
    expect(listVideoTasks()[0]?.status).toBe('completed')
    expect(wrapper.text()).toContain('原型演示')
    await router.push('/video-gen/storyboard'); await flushPromises()
    expect(wrapper.get('[data-testid="task-card"]').text()).toContain('运动鞋镜头')
    wrapper.unmount()
  })
  it('handles stale task links and opens the production-aligned video creator', async () => {
    const { wrapper, router } = await open('/video-gen/prompt-generate?view=result&id=deleted')
    expect(wrapper.text()).toContain('任务不存在或已删除')
    await router.push('/video-gen/video-generate?view=config'); await flushPromises()
    expect(wrapper.findComponent({ name: 'VideoGenerateConfig' }).exists()).toBe(true)
    expect((wrapper.get('input[aria-label="生成同步音频"]').element as HTMLInputElement).checked).toBe(true)
    wrapper.unmount()
  })
  it('copies a prompt result into a numbered new editable task', async () => {
    localStorage.setItem('tianma-video-prototype-v1', JSON.stringify([
      { id: 'prompt-1', operator: 'prompt-generate', name: '羽绒服 Prompt', status: 'completed', createdAt: '2026-10-26T00:00:00Z', input: { requirements: '雪景展示', references: [{ id: 'ref-1', name: 'coat.png', kind: 'image', uri: 'blob:coat' }], parameters: { normalizedPrompt: '雪景展示羽绒服' }, generatedPrompt: '使用 @coat 展示羽绒服' } },
    ]))
    const { wrapper, router } = await open('/video-gen/prompt-generate?view=result&id=prompt-1')
    await wrapper.get('[data-testid="recreate-prompt-btn"]').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.query.view).toBe('config')
    expect(router.currentRoute.value.query.copyFrom).toBe('prompt-1')
    expect(wrapper.get('input[aria-label="任务名称"]').element).toMatchObject({ value: '羽绒服 Prompt（2）' })
    expect(wrapper.findComponent({ name: 'PromptConfig' }).props('initialData').references).toHaveLength(1)
    wrapper.unmount()
  })
  it('uses the shared breadcrumb to leave completed element replacement results', async () => {
    const input = getDemoElementReplacementInput()
    localStorage.setItem('tianma-video-prototype-v1', JSON.stringify([
      { id: 'element-complete', operator: 'element-replace', name: '城市模特替换', status: 'completed', createdAt: '2026-10-26T00:00:00Z', input },
      { id: 'story-complete', operator: 'storyboard', name: '原有分镜页面', status: 'completed', createdAt: '2026-10-26T00:00:00Z', input: { videoUrl: 'https://example.com/video.mp4', segments: [] } },
    ]))
    const { wrapper, router } = await open('/video-gen/element-replace?view=result&id=element-complete')
    expect(wrapper.get('.video-breadcrumb').text()).toContain('城市模特替换')
    expect(wrapper.get('.video-breadcrumb .video-status').text()).toBe('已完成')
    expect(wrapper.find('[data-testid="element-result-header"]').exists()).toBe(false)
    const elementCrumb = wrapper.findAll('.video-breadcrumb button').find(button => button.text() === '元素替换')!
    await elementCrumb.trigger('click'); await flushPromises()
    expect(router.currentRoute.value.path).toBe('/video-gen/element-replace')
    expect(router.currentRoute.value.query.view).toBeUndefined()
    expect(wrapper.find('[data-testid="element-result-header"]').exists()).toBe(false)
    await router.push('/video-gen/storyboard?view=result&id=story-complete'); await flushPromises()
    expect(wrapper.find('[data-testid="element-result-header"]').exists()).toBe(false)
    expect(wrapper.get('.video-breadcrumb').text()).toContain('原有分镜页面')
    wrapper.unmount()
  })
  it('creates a local element replacement prototype and completes it after three seconds', async () => {
    vi.useFakeTimers()
    const errors = vi.spyOn(ElMessage, 'error').mockReturnValue({ close: vi.fn() })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { wrapper, router } = await open()
    await wrapper.get('[data-testid="capability-element-replace"]').trigger('click'); await flushPromises()
    await wrapper.get('[data-testid="new-task"]').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.query.view).toBe('config')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(listVideoTasks()).toHaveLength(0)
    await wrapper.get('input[aria-label="任务名称"]').setValue('模特替换')
    const config = wrapper.findComponent({ name: 'ElementReplacementConfig' })
    config.vm.$emit('submit', getDemoElementReplacementInput(), '模特替换'); await flushPromises()
    expect(errors.mock.calls).toEqual([])
    expect(listVideoTasks()[0]?.operator).toBe('element-replace')
    expect(listVideoTasks()[0]?.name).toBe('模特替换')
    expect(listVideoTasks()[0]?.remoteJob).toBeUndefined()
    expect(listVideoTasks()[0]?.input.prototypeDemo).toBe(true)
    expect(wrapper.text()).toContain('视频生成中')
    expect(wrapper.text()).not.toContain('查看演示结果')
    expect(wrapper.text()).not.toContain('重新查询')
    expect(fetchMock).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(3000); await flushPromises()
    const task = listVideoTasks()[0]!
    expect(task.status).toBe('completed')
    expect(task.input.resultUsesOriginal).toBe(true)
    expect(task.input.resultVideo.url).toBe(task.input.sourceVideo.url)
    expect(task.input.prototypeDemo).toBe(true)
    const elementCrumb = wrapper.findAll('.video-breadcrumb button').find(button => button.text() === '元素替换')!
    await elementCrumb.trigger('click'); await flushPromises()
    await wrapper.get('button[aria-label="复制模特替换"]').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.query.view).toBe('config')
    expect(router.currentRoute.value.query.copyFrom).toBe(task.id)
    expect(wrapper.findComponent({ name: 'ElementReplacementConfig' }).props('initialData').groups).toHaveLength(2)
    wrapper.unmount()
    vi.useRealTimers()
  })
  it('keeps a historical provider failure without inventing a result', async () => {
    localStorage.setItem('tianma-video-prototype-v1', JSON.stringify([{ id: 'failed-real', operator: 'element-replace', name: '真实失败任务', status: 'failed', createdAt: '2026-10-26T00:00:00Z', input: { ...getDemoElementReplacementInput(), prototypeDemo: false }, remoteJob: { id: 'request-failed-real', status: 'failed', providerTaskId: 'task-failed-real', createdAt: '2026-10-26T00:00:00Z', updatedAt: '2026-10-26T00:00:00Z', error: { code: 'Content.Invalid', message: '参考素材不可读取' } } }]))
    const { wrapper } = await open('/video-gen/element-replace?view=result&id=failed-real')
    expect(wrapper.text()).toContain('失败')
    expect(wrapper.text()).toContain('参考素材不可读取')
    expect(wrapper.find('video[aria-label="替换结果播放器"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'ElementReplacementResult' }).exists()).toBe(false)
    expect(wrapper.text()).not.toContain('查看演示结果')
    wrapper.unmount()
  })
})
