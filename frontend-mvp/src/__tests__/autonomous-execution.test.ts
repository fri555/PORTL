import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChatDetail from '@/components/chat/source-clone/SourceChatDetail.vue'
import { readPrototypeChatValue, writePrototypeChatValue } from '@/utils/prototypeChatStore'

const wrappers: ReturnType<typeof mount>[] = []
function detail(approvalMode: 'default' | 'autonomous' = 'autonomous', sessionId = 'expert-policy') {
  const wrapper = mount(ChatDetail, { props: { sessionId, approvalMode, persistState: true } })
  wrappers.push(wrapper)
  return wrapper
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-10T02:00:00Z'))
  localStorage.clear()
  window.history.replaceState({}, '', '/')
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.useRealTimers()
  localStorage.clear()
  window.history.replaceState({}, '', '/')
})

describe('expert execution permissions', () => {
  it('starts a complete autonomous plan immediately and input does not pause it', async () => {
    const wrapper = detail()
    await flushPromises()
    expect(wrapper.get('[data-testid="expert-auto-plan"] .plan-state').text()).toBe('执行中')
    expect(wrapper.text()).not.toContain('秒内未输入')
    await wrapper.get('textarea').setValue('稍后补充的草稿')
    await wrapper.get('textarea').trigger('compositionstart')
    await vi.advanceTimersByTimeAsync(1800)
    expect(wrapper.get('[data-testid="expert-auto-plan"] .plan-state').text()).toBe('模拟完成')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('稍后补充的草稿')
  })

  it('keeps default permissions waiting for a manual start without a deadline', async () => {
    const wrapper = detail('default')
    await vi.advanceTimersByTimeAsync(61000)
    expect(wrapper.get('.plan-state').text()).toBe('等待执行')
    expect(wrapper.find('.deliverables').exists()).toBe(false)
    const run = wrapper.findAll('button').find(button => button.text() === '立即执行')!
    await run.trigger('click')
    await run.trigger('click')
    await vi.advanceTimersByTimeAsync(1800)
    const saved = readPrototypeChatValue<{ attempt: number; status: string }>('plan:expert-policy')!
    expect(saved).toMatchObject({ attempt: 1, status: 'done' })
  })

  it.each([
    ['optional-default', 'DOCX'],
    ['optional-empty', ''],
    ['optional-invalid', ''],
  ])('skips %s and uses only a valid supplied default', async (scenario, expected) => {
    window.history.replaceState({}, '', '/?clarification=' + scenario)
    const wrapper = detail()
    await flushPromises()
    expect(wrapper.find('[data-testid="clarification-card"]').exists()).toBe(false)
    expect(wrapper.get('.plan-state').text()).toBe('执行中')
    const saved = readPrototypeChatValue<{ clarifications: { value: string }[] }>('plan:expert-policy')!
    expect(saved.clarifications[0]!.value).toBe(expected)
  })

  it('blocks a missing required clarification until the user supplies it', async () => {
    window.history.replaceState({}, '', '/?clarification=required')
    const wrapper = detail()
    await vi.advanceTimersByTimeAsync(61000)
    expect(wrapper.get('.plan-state').text()).toBe('待补充')
    expect(wrapper.find('.deliverables').exists()).toBe(false)
    const confirm = wrapper.get('[data-testid="confirm-clarifications"]')
    expect(confirm.attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="clarification-input"]').setValue('本周销售')
    await confirm.trigger('click')
    expect(wrapper.get('.plan-state').text()).toBe('执行中')
    await vi.advanceTimersByTimeAsync(1800)
    expect(wrapper.get('.plan-state').text()).toBe('模拟完成')
  })

  it('keeps optional clarification in the default manual flow', async () => {
    window.history.replaceState({}, '', '/?clarification=optional-default')
    const wrapper = detail('default')
    await vi.advanceTimersByTimeAsync(61000)
    expect(wrapper.get('[data-testid="clarification-card"]').text()).toContain('报告格式')
    await wrapper.get('[data-testid="confirm-clarifications"]').trigger('click')
    expect(wrapper.get('.plan-state').text()).toBe('等待执行')
  })

  it('requires account authorization before autonomously confirming the action', async () => {
    const wrapper = detail('autonomous', 'dws-action-policy')
    await vi.advanceTimersByTimeAsync(61000)
    expect(wrapper.find('[data-testid="dws-auth-card"]').exists()).toBe(true)
    await wrapper.get('[aria-label="已完成钉钉授权"]').trigger('click')
    await vi.advanceTimersByTimeAsync(61000)
    expect(wrapper.find('[data-testid="dws-confirm-card"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="dws-result-card"]').exists()).toBe(true)
  })

  it.each(['tool', 'business'])('keeps an explicitly non-delegable %s approval blocked', async authorization => {
    window.history.replaceState({}, '', '/?planState=awaiting_confirmation&humanRequired=1&authorization=' + authorization)
    const wrapper = detail()
    await vi.advanceTimersByTimeAsync(61000)
    expect(wrapper.get('.plan-state').text()).toBe('待确认')
    expect(wrapper.find('.deliverables').exists()).toBe(false)
    const confirm = wrapper.findAll('button').find(button => button.text() === '确认操作')!
    await confirm.trigger('click')
    await vi.advanceTimersByTimeAsync(1800)
    expect(wrapper.get('.plan-state').text()).toBe('模拟完成')
  })

  it.each(['tool', 'business'])('automatically agrees to an eligible %s execution approval', async authorization => {
    window.history.replaceState({}, '', '/?authorization=' + authorization)
    const wrapper = detail()
    await vi.advanceTimersByTimeAsync(61000)
    expect(wrapper.findAll('button').some(button => button.text() === '确认操作')).toBe(false)
    expect(wrapper.get('.plan-state').text()).toBe('模拟完成')
    expect(readPrototypeChatValue<{ attempt: number }>('plan:expert-policy')!.attempt).toBe(1)
  })

  it('keeps the creation mode fixed even if the conversation prop is changed', async () => {
    const wrapper = detail('default')
    await wrapper.setProps({ approvalMode: 'autonomous' })
    await vi.advanceTimersByTimeAsync(61000)
    expect(wrapper.get('[data-testid="conversation-approval-mode"]').text()).toContain('默认权限')
    expect(wrapper.get('.plan-state').text()).toBe('等待执行')
  })

  it('resumes a known running plan after refresh and never starts a completed plan again', async () => {
    const first = detail()
    await vi.advanceTimersByTimeAsync(600)
    const original = readPrototypeChatValue<{ startedAt: number }>('plan:expert-policy')!.startedAt
    first.unmount()
    await vi.advanceTimersByTimeAsync(500)
    const second = detail()
    await vi.advanceTimersByTimeAsync(700)
    expect(second.get('.plan-state').text()).toBe('模拟完成')
    expect(readPrototypeChatValue<{ startedAt: number }>('plan:expert-policy')!.startedAt).toBe(original)
    second.unmount()
    const third = detail()
    await vi.advanceTimersByTimeAsync(61000)
    expect(third.get('.plan-state').text()).toBe('模拟完成')
    expect(readPrototypeChatValue<{ startedAt: number }>('plan:expert-policy')!.startedAt).toBe(original)
  })

  it.each([undefined, null, 'invalid', -1, Date.parse('2026-10-10T02:01:00Z')])('does not retry or invent success with an invalid persisted start time %s', async startedAt => {
    writePrototypeChatValue('plan:expert-policy', { status: 'running', startedAt, deadlineAt: 1 })
    const wrapper = detail()
    await vi.advanceTimersByTimeAsync(61000)
    expect(wrapper.get('.plan-state').text()).toBe('结果待核实')
    expect(wrapper.find('.deliverables').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('重试执行')
  })

  it('blocks new execution while a saved follow-up result remains unknown', async () => {
    writePrototypeChatValue('plan:expert-policy', {
      status: 'done', followUps: [{ id: 1, text: '此前的任务', expert: '业务专家', usesExpert: true, time: '2026-10-10 10:00', templateLabel: '普通模板' }],
    })
    writePrototypeChatValue('follow-plan:expert-policy:turn:1', { status: 'unknown', startedAt: null })
    const wrapper = detail()
    await flushPromises()
    await wrapper.get('textarea').setValue('另一个任务')
    await wrapper.get('textarea').trigger('keydown', { key: 'Enter' })
    await vi.advanceTimersByTimeAsync(61000)
    expect(wrapper.findAll('[data-testid="follow-up-plan"]')).toHaveLength(1)
    expect(wrapper.get('[aria-label="发送"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="follow-up-plan"]').text()).toContain('执行结果待核实')
  })

  it('does not launch a concurrent follow-up while the current plan is running', async () => {
    const wrapper = detail()
    await wrapper.get('textarea').setValue('另一个任务')
    await wrapper.get('textarea').trigger('keydown', { key: 'Enter' })
    expect(wrapper.find('[data-testid="follow-up-plan"]').exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(1800)
    await wrapper.get('textarea').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wrapper.get('[data-testid="follow-up-plan"]').text()).toContain('正在模拟执行')
  })
})

