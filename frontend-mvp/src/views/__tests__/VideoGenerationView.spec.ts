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
  it('handles stale task links and keeps the unavailable video creator in list view', async () => {
    const { wrapper, router } = await open('/video-gen/prompt-generate?view=result&id=deleted')
    expect(wrapper.text()).toContain('任务不存在或已删除')
    await router.push('/video-gen/video-generate?view=config'); await flushPromises()
    expect(wrapper.get('[data-testid="new-task"]').attributes('disabled')).toBeDefined()
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
    expect(wrapper.text()).toContain('结果视频暂不可用')
    expect(wrapper.find('video[aria-label="替换结果播放器"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('查看演示结果')
    wrapper.unmount()
  })
})
