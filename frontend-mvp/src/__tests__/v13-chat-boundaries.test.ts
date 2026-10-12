import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import ChatView from '@/views/SourceChatView.vue'
import ChatDetail from '@/components/chat/source-clone/SourceChatDetail.vue'
import FollowUpPlan from '@/components/chat/source-clone/FollowUpPlan.vue'
import ApprovalModeControl from '@/components/chat/source-clone/ApprovalModeControl.vue'
import { homeDraft } from '@/composables/useHomeDraft'

const wrappers: ReturnType<typeof mount>[] = []
function keep(wrapper: ReturnType<typeof mount>) { wrappers.push(wrapper); return wrapper }
async function click(wrapper: ReturnType<typeof mount>, label: string) {
  const button = wrapper.findAll('button').find(item => item.text() === label)
  expect(button, label).toBeTruthy()
  await button!.trigger('click')
  await flushPromises()
}
async function mountChat(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/chat/:sessionId?', component: ChatView }] })
  await router.push(path)
  await router.isReady()
  const wrapper = keep(mount(ChatView, { global: { plugins: [router], stubs: { Teleport: true } } }))
  await flushPromises()
  return { wrapper, router }
}
beforeEach(() => {
  localStorage.clear()
  homeDraft.value = ''
  window.history.replaceState({}, '', '/')
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.useRealTimers()
  vi.restoreAllMocks()
  localStorage.clear()
  homeDraft.value = ''
  window.history.replaceState({}, '', '/')
})

describe('V1.3 conversation review fixes', () => {
  it('restores the fixed approval mode and expert after history/search re-entry and ignores query overrides', async () => {
    const { wrapper, router } = await mountChat('/chat/expert-capability?agent=biz-04&prompt=整理营销方案&approvalMode=autonomous')
    expect(wrapper.get('[data-testid="conversation-approval-mode"]').text()).toContain('自主执行')
    await router.push('/chat')
    await router.push('/chat/expert-capability?message=answer-01')
    await flushPromises()
    expect(wrapper.get('[data-testid="conversation-approval-mode"]').text()).toContain('自主执行')
    expect(wrapper.get('.user-bubble').text()).toBe('整理营销方案')
    expect(wrapper.get('.answer-agent strong').text()).toBe('营销图文设计师')
    await router.push('/chat/expert-capability?approvalMode=default')
    await flushPromises()
    expect(wrapper.get('[data-testid="conversation-approval-mode"]').text()).toContain('自主执行')
  })

  it('creates distinct conversations and resets a new conversation to default permissions', async () => {
    const { wrapper, router } = await mountChat('/chat')
    await wrapper.get('[data-testid="approval-mode-trigger"]').trigger('click')
    await wrapper.get('[data-testid="approval-mode-autonomous"]').trigger('click')
    await wrapper.get('textarea').setValue('整理本周工作')
    await wrapper.get('[aria-label="发送"]').trigger('click')
    await flushPromises()
    const firstId = router.currentRoute.value.params.sessionId
    expect(wrapper.get('[data-testid="conversation-approval-mode"]').text()).toContain('自主执行')
    await wrapper.get('button[title="新对话"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="approval-mode-trigger"]').text()).toContain('默认权限')
    await wrapper.get('textarea').setValue('整理第二条任务')
    await wrapper.get('[aria-label="发送"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.params.sessionId).not.toBe(firstId)
    expect(wrapper.get('[data-testid="conversation-approval-mode"]').text()).toContain('默认权限')
    await router.push('/chat/' + firstId)
    await flushPromises()
    expect(wrapper.get('[data-testid="conversation-approval-mode"]').text()).toContain('自主执行')
  })

  it('routes a preselected expert-mode home through the expert actually chosen before sending', async () => {
    localStorage.setItem('tianma.prototype.expert-favorites.v1', JSON.stringify(['biz-04']))
    const { wrapper, router } = await mountChat('/chat?mode=expert')
    await wrapper.get('[data-testid="expert-card"]').trigger('click')
    await wrapper.get('textarea').setValue('整理营销方案')
    await wrapper.get('[aria-label="发送"]').trigger('click')
    await flushPromises()
    expect(String(router.currentRoute.value.params.sessionId)).toMatch(/^expert-plan-/)
    expect(wrapper.get('.answer-agent strong').text()).toBe('营销图文设计师')
  })

  it('isolates conversation mode records by current user', async () => {
    localStorage.setItem('tianma_ai_user', JSON.stringify({ id: 'review-user-a' }))
    const first = await mountChat('/chat/daily-auth?approvalMode=autonomous')
    first.wrapper.unmount()
    localStorage.setItem('tianma_ai_user', JSON.stringify({ id: 'review-user-b' }))
    const second = await mountChat('/chat/daily-auth')
    expect(second.wrapper.get('[data-testid="conversation-approval-mode"]').text()).toContain('默认权限')
  })

  it('does not derive a completed daily process tone from the expert demo plan state', () => {
    window.history.replaceState({}, '', '/?planState=failed')
    const wrapper = keep(mount(ChatDetail, { props: { sessionId: 'daily-auth' } }))
    expect(wrapper.get('.process-summary').classes()).toContain('done')
    expect(wrapper.get('.process-summary').classes()).not.toContain('failed')
  })

  it('keeps the actual DingTalk action in its completed execution timeline after manual confirmation', async () => {
    const wrapper = keep(mount(ChatDetail, { props: { sessionId: 'dws-action', approvalMode: 'default' } }))
    await wrapper.get('[aria-label="已完成钉钉授权"]').trigger('click')
    expect(wrapper.find('[data-testid="dws-confirm-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dws-result-card"]').exists()).toBe(false)
    await wrapper.get('[aria-label="确认执行钉钉操作"]').trigger('click')
    await wrapper.get('[data-testid="execution-process-trigger"]').trigger('click')
    const process = wrapper.get('[data-testid="execution-process"]')
    expect(process.text()).toContain('工具调用 · 创建钉钉待办')
    expect(process.text()).toContain('AI 回复')
    expect(process.text()).not.toContain('读取授权资料')
    expect(process.findAll('.tool-call-row')).toHaveLength(1)
    expect(process.findAll('[data-testid="execution-step"]')).toHaveLength(0)
  })

  it('lets the user expand and collapse the complete expert plan', async () => {
    const wrapper = keep(mount(ChatDetail, { props: { sessionId: 'expert-plan' } }))
    const trigger = wrapper.get('[aria-label="查看完整执行计划"]')
    expect(wrapper.find('[data-testid="expert-plan-details"]').exists()).toBe(false)
    await trigger.trigger('click')
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[data-testid="expert-plan-details"]').findAll('li')).toHaveLength(3)
    await trigger.trigger('click')
    expect(wrapper.find('[data-testid="expert-plan-details"]').exists()).toBe(false)
  })

  it('collapses an expanded process when execution completes and allows reopening it', async () => {
    vi.useFakeTimers()
    const wrapper = keep(mount(ChatDetail, { props: { sessionId: 'expert-plan', approvalMode: 'autonomous' } }))
    const trigger = wrapper.get('[data-testid="execution-process-trigger"]')
    await trigger.trigger('click')
    expect(wrapper.find('[data-testid="execution-process"]').exists()).toBe(true)
    await vi.advanceTimersByTimeAsync(1800)
    expect(wrapper.find('[data-testid="execution-process"]').exists()).toBe(false)
    expect(wrapper.find('.deliverables').exists()).toBe(true)
    await trigger.trigger('click')
    expect(wrapper.get('[data-testid="execution-process"]').text()).toContain('已完成')
  })

  it('retains failed execution records when an explicit retry creates a new version', async () => {
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/?planState=failed')
    const wrapper = keep(mount(ChatDetail, { props: { sessionId: 'expert-plan' } }))
    await click(wrapper, '重试执行')
    expect(wrapper.text()).toContain('第 2 次执行')
    await vi.advanceTimersByTimeAsync(1800)
    await wrapper.get('[data-testid="execution-process-trigger"]').trigger('click')
    const history = wrapper.get('[data-testid="execution-attempt-history"]')
    expect(history.text()).toContain('第 1 次执行')
    expect(history.text()).toContain('读取超时')
    expect(history.text()).toContain('3.8 秒')
    expect(wrapper.get('[data-testid="execution-process"]').text()).toContain('已完成')
  })

  it('retains an immediately started autonomous execution after refreshing', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-09T02:00:00Z'))
    const props = { sessionId: 'expert-refresh', approvalMode: 'autonomous' as const, persistState: true }
    const first = keep(mount(ChatDetail, { props }))
    await vi.advanceTimersByTimeAsync(600)
    first.unmount()
    await vi.advanceTimersByTimeAsync(500)
    const second = keep(mount(ChatDetail, { props }))
    expect(second.get('[data-testid="expert-auto-plan"]').text()).toContain('正在自主执行')
    await vi.advanceTimersByTimeAsync(700)
    expect(second.get('[data-testid="expert-auto-plan"]').text()).toContain('模拟执行完成')
  })

  it('keeps a default follow-up waiting until manual start regardless of draft activity', async () => {
    vi.useFakeTimers()
    const wrapper = keep(mount(FollowUpPlan, { props: { active: true, draftActivity: 1, hasDraft: true, templateLabel: '普通模板' } }))
    expect(wrapper.text()).toContain('等待执行')
    await wrapper.setProps({ hasDraft: false })
    await vi.advanceTimersByTimeAsync(61000)
    expect(wrapper.text()).toContain('等待执行')
    expect(wrapper.emitted('running')).toBeUndefined()
    await click(wrapper, '立即执行')
    expect(wrapper.emitted('running')).toEqual([[true]])
  })

  it('keeps a default expert follow-up waiting after @ selection without pausing it', async () => {
    vi.useFakeTimers()
    const wrapper = keep(mount(ChatDetail, { props: { sessionId: 'daily-auth' } }))
    const input = wrapper.get('textarea')
    await input.setValue('@营销')
    await input.trigger('input')
    await flushPromises()
    await input.trigger('keydown', { key: 'Enter' })
    await input.setValue('帮我写营销方案')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    await input.setValue('@营销')
    await input.trigger('input')
    await flushPromises()
    await input.trigger('keydown', { key: 'Enter' })
    await vi.advanceTimersByTimeAsync(61000)
    expect(wrapper.get('[data-testid="follow-up-plan"]').text()).toContain('等待执行')
    expect(wrapper.get('[data-testid="follow-up-plan"]').text()).not.toContain('本轮模拟执行完成')
  })

  it('keeps high-impact confirmation blocking autonomous execution and reports the actual plan state', async () => {
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/?planState=awaiting_confirmation')
    const wrapper = keep(mount(ChatDetail, { props: { sessionId: 'expert-plan', approvalMode: 'autonomous' } }))
    expect(wrapper.get('[data-testid="expert-auto-plan"] header strong').text()).toBe('等待操作确认')
    await vi.advanceTimersByTimeAsync(61000)
    expect(wrapper.text()).toContain('对外分享前需要你确认')
    expect(wrapper.find('.deliverables').exists()).toBe(false)
    await click(wrapper, '拒绝并停止')
    expect(wrapper.get('[data-testid="expert-auto-plan"] header strong').text()).toBe('执行已停止')
    expect(wrapper.find('.deliverables').exists()).toBe(false)
  })

  it('cancels a default-mode tool confirmation without showing successful external results', async () => {
    const wrapper = keep(mount(ChatDetail, { props: { sessionId: 'dws-action' } }))
    await wrapper.get('[aria-label="已完成钉钉授权"]').trigger('click')
    await click(wrapper, '取消')
    expect(wrapper.find('[data-testid="dws-confirm-card"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="dws-result-card"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="execution-process-trigger"]').text()).toContain('已取消')
    expect(wrapper.text()).toContain('待办尚未创建')
  })

  it('retains the start and terminal result of a persisted autonomous follow-up plan', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-09T02:00:00Z'))
    const props = { active: true, approvalMode: 'autonomous' as const, templateLabel: '普通模板', stateKey: 'review-follow-up' }
    const first = keep(mount(FollowUpPlan, { props }))
    await vi.advanceTimersByTimeAsync(400)
    first.unmount()
    await vi.advanceTimersByTimeAsync(600)
    const second = keep(mount(FollowUpPlan, { props }))
    expect(second.text()).toContain('正在模拟执行')
    await vi.advanceTimersByTimeAsync(800)
    expect(second.text()).toContain('本轮模拟执行完成')
    second.unmount()
    const third = keep(mount(FollowUpPlan, { props }))
    expect(third.text()).toContain('本轮模拟执行完成')
    expect(third.emitted('running')).toBeUndefined()
  })

  it('closes the approval picker when interacting outside or pressing Escape', async () => {
    const wrapper = keep(mount(ApprovalModeControl, { props: { modelValue: 'default' }, attachTo: document.body }))
    await wrapper.get('[data-testid="approval-mode-trigger"]').trigger('click')
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await flushPromises()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    await wrapper.get('[data-testid="approval-mode-trigger"]').trigger('click')
    await wrapper.get('[data-testid="approval-mode-autonomous"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })
})


