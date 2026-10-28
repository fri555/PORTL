import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import VideoTaskList from '../VideoTaskList.vue'
import type { VideoTask } from '@/types/video-generation'
const meta = { operator: 'storyboard' as const, title: '视频分镜', description: '', namePrefix: '视频分镜', processingLabel: '拆解中' }
const tasks: VideoTask[] = [
  { id: '1', operator: 'storyboard', name: '运动鞋展示', status: 'completed', createdAt: '2026-10-21T10:00:00Z', input: {} },
  { id: '2', operator: 'storyboard', name: '外套展示', status: 'processing', createdAt: '2026-10-21T11:00:00Z', input: {} },
]
describe('video capability task list', () => {
  it.each(['failed', 'timeout'] as const)('opens failure details for a real element replacement task in %s state', async (status) => {
    const task: VideoTask = {
      id: 'replacement-failed', operator: 'element-replace', name: '真实替换失败', status: 'failed', createdAt: '2026-10-26T03:00:00Z', input: { prototypeDemo: false },
      remoteJob: { id: 'request-failed', providerTaskId: 'provider-failed', status, createdAt: '2026-10-26T03:00:00Z', updatedAt: '2026-10-26T03:01:00Z', error: { code: 'Generation.Failed', message: '视频服务返回失败原因' } },
    }
    const wrapper = mount(VideoTaskList, { props: { meta: { ...meta, operator: 'element-replace', title: '元素替换' }, tasks: [task] } })
    const view = wrapper.get('button[aria-label="查看真实替换失败"]')
    expect(view.attributes('disabled')).toBeUndefined()
    await view.trigger('click')
    expect(wrapper.emitted('view')).toEqual([['replacement-failed']])
    wrapper.unmount()
  })
  it.each([
    { operator: 'storyboard' as const, remoteJob: true, unavailable: false },
    { operator: 'element-replace' as const, remoteJob: true, unavailable: true },
  ])('keeps failed task viewing disabled outside the real replacement exception: %o', async ({ operator, remoteJob, unavailable }) => {
    const task: VideoTask = {
      id: 'failed-other', operator, name: '失败记录', status: 'failed', createdAt: '2026-10-26T03:00:00Z', input: {},
      ...(remoteJob ? { remoteJob: { id: 'request-failed', status: 'failed' as const, createdAt: '2026-10-26T03:00:00Z', updatedAt: '2026-10-26T03:01:00Z' } } : {}),
    }
    const wrapper = mount(VideoTaskList, { props: { meta: { ...meta, operator }, tasks: [task], unavailable } })
    const view = wrapper.get('button[aria-label="查看失败记录"]')
    expect(view.attributes('disabled')).toBeDefined()
    await view.trigger('click')
    expect(wrapper.emitted('view')).toBeUndefined()
    wrapper.unmount()
  })
  it('opens element replacement configuration directly without a naming dialog', async () => {
    const wrapper = mount(VideoTaskList, { props: { meta: { ...meta, operator: 'element-replace', title: '元素替换', namePrefix: '元素替换' }, tasks: [] } })
    await wrapper.get('[data-testid="new-task"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.emitted('create')?.[0]?.[0]).toMatch(/^元素替换-/)
    wrapper.unmount()
  })
  it('combines name search and task status filtering', async () => {
    const wrapper = mount(VideoTaskList, { props: { meta, tasks } })
    await wrapper.get('input[aria-label="搜索任务"]').setValue('运动鞋')
    expect(wrapper.findAll('[data-testid="task-card"]')).toHaveLength(1)
    await wrapper.get('[data-status="processing"]').trigger('click')
    expect(wrapper.findAll('[data-testid="task-card"]')).toHaveLength(0)
    await wrapper.get('input[aria-label="搜索任务"]').setValue('')
    expect(wrapper.text()).toContain('外套展示')
    expect(wrapper.text()).not.toContain('运动鞋展示')
    wrapper.unmount()
  })
  it('copies an editable capability task instead of editing it in place', async () => {
    const wrapper = mount(VideoTaskList, { props: { meta: { ...meta, operator: 'speech-synthesis', title: '语音合成' }, tasks: [tasks[0]!] } })
    const copy = wrapper.get('button[aria-label="复制运动鞋展示"]')
    expect(copy.attributes('title')).toBe('复制')
    await copy.trigger('click')
    expect(wrapper.emitted('copy')).toEqual([['1']])
    expect(wrapper.find('button[aria-label="编辑运动鞋展示"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('已超时')
    expect(wrapper.text()).not.toContain('已取消')
    wrapper.unmount()
  })
  it('shows the element status set as 全部、排队中、处理中、已完成、失败、超时', () => {
    const wrapper = mount(VideoTaskList, { props: { meta: { ...meta, operator: 'element-replace', title: '元素替换' }, tasks: [{ ...tasks[0]!, operator: 'element-replace' }] } })
    expect(wrapper.findAll('[role="tab"]').map(node => node.text().replace(/\d+$/, ''))).toEqual(['全部', '排队中', '处理中', '已完成', '失败', '超时'])
    expect(wrapper.text()).not.toContain('已取消')
    expect(wrapper.text()).not.toContain('替换中')
    wrapper.unmount()
  })
  it('shows the speech status set including the platform queue', () => {
    const wrapper = mount(VideoTaskList, { props: { meta: { ...meta, operator: 'speech-synthesis', title: '语音合成', processingLabel: '合成中' }, tasks: [{ ...tasks[0]!, operator: 'speech-synthesis' }] } })
    expect(wrapper.findAll('[role="tab"]').map(node => node.text().replace(/\d+$/, ''))).toEqual(['全部', '排队中', '合成中', '已完成', '失败'])
    expect(wrapper.text()).not.toContain('超时')
    wrapper.unmount()
  })
  it('keeps new tasks in the name dialog until a nonblank name is confirmed', async () => {
    const wrapper = mount(VideoTaskList, { props: { meta, tasks: [] }, attachTo: document.body })
    await wrapper.get('[data-testid="new-task"]').trigger('click')
    await wrapper.get('input[aria-label="任务名称"]').setValue('   ')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('create')).toBeUndefined()
    await wrapper.get('input[aria-label="任务名称"]').setValue('鞋款分镜')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('create')?.[0]).toEqual(['鞋款分镜'])
    wrapper.unmount()
  })
  it('shows execution time instead of creation time and leaves queued tasks editable', async () => {
    const queued: VideoTask = { ...tasks[0]!, operator: 'speech-synthesis', status: 'queued', startedAt: null }
    const wrapper = mount(VideoTaskList, { props: { meta: { ...meta, operator: 'speech-synthesis' }, tasks: [queued] } })
    expect(wrapper.text()).toContain('尚未开始')
    expect(wrapper.text()).not.toContain('2026-10-21')
    const view = wrapper.get('button[aria-label="查看运动鞋展示"]')
    expect(view.attributes('title')).toBe('查看并修改配置')
    await view.trigger('click'); expect(wrapper.emitted('view')).toEqual([['1']])
    await wrapper.setProps({ tasks: [{ ...queued, status: 'completed', startedAt: '2026-10-28T02:00:00Z' }] })
    expect(wrapper.text()).toContain('开始执行：2026-10-28 10:00:00')
    wrapper.unmount()
  })
  it('requires confirmation before removing an existing task', async () => {
    const wrapper = mount(VideoTaskList, { props: { meta, tasks }, attachTo: document.body })
    await wrapper.get('button[aria-label="删除运动鞋展示"]').trigger('click')
    expect(wrapper.emitted('remove')).toBeUndefined()
    await wrapper.get('[data-testid="confirm-delete"]').trigger('click')
    expect(wrapper.emitted('remove')?.[0]).toEqual(['1'])
    wrapper.unmount()
  })
  it('keeps the unimplemented online video creator unavailable', async () => {
    const wrapper = mount(VideoTaskList, { props: { meta: { ...meta, operator: 'video-generate' }, tasks: [], unavailable: true } })
    expect(wrapper.get('[data-testid="new-task"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
})
