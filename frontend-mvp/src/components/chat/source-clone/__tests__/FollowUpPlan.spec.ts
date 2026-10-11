import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FollowUpPlan from '../FollowUpPlan.vue'
import ApprovalModeControl from '../ApprovalModeControl.vue'
import { readPrototypeChatValue, writePrototypeChatValue } from '@/utils/prototypeChatStore'

const wrappers: VueWrapper[] = []
const baseProps = { active: true, draftActivity: 0, hasDraft: false, templateLabel: '测试模板' }
function plan(overrides: Record<string, unknown> = {}) {
  const wrapper = mount(FollowUpPlan, { props: { ...baseProps, ...overrides } })
  wrappers.push(wrapper)
  return wrapper
}
function button(wrapper: VueWrapper, text: string) {
  return wrapper.findAll('button').find(item => item.text() === text)!
}
function snapshot(stateKey: string) {
  return readPrototypeChatValue<{ status: string; startedAt: number | null }>('follow-plan:' + stateKey)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-10T04:00:00Z'))
  localStorage.clear()
})
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  vi.useRealTimers()
})

describe('follow-up plan execution modes', () => {
  it('keeps a default plan waiting until the user explicitly runs it', async () => {
    const wrapper = plan()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(wrapper.text()).toContain('等待执行')
    expect(wrapper.emitted('running')).toBeUndefined()
    await button(wrapper, '立即执行').trigger('click')
    expect(wrapper.emitted('running')).toEqual([[true]])
  })

  it('allows manual execution while the next message has a draft', async () => {
    const wrapper = plan({ hasDraft: true })
    await wrapper.setProps({ draftActivity: 1 })
    expect(wrapper.text()).toContain('等待执行')
    expect(button(wrapper, '立即执行').attributes('disabled')).toBeUndefined()
    await button(wrapper, '立即执行').trigger('click')
    expect(wrapper.emitted('running')).toEqual([[true]])
  })

  it('starts an active autonomous plan immediately despite a draft', async () => {
    const wrapper = plan({ approvalMode: 'autonomous', hasDraft: true })
    expect(wrapper.emitted('running')).toEqual([[true]])
    await wrapper.setProps({ draftActivity: 1, hasDraft: false })
    expect(wrapper.text()).toContain('正在模拟执行')
    await vi.advanceTimersByTimeAsync(1800)
    expect(wrapper.emitted('running')).toEqual([[true], [false]])
    expect(wrapper.text()).toContain('模拟执行完成')
  })

  it('does not automatically run an inactive autonomous plan', async () => {
    const wrapper = plan({ active: false, approvalMode: 'autonomous' })
    await vi.advanceTimersByTimeAsync(120_000)
    expect(wrapper.emitted('running')).toBeUndefined()
    expect(wrapper.text()).toContain('已被新计划替代')
  })

  it('starts at most once when the run button receives repeated clicks', async () => {
    const wrapper = plan()
    const run = button(wrapper, '立即执行')
    await run.trigger('click')
    await run.trigger('click')
    expect(wrapper.emitted('running')).toEqual([[true]])
    await vi.advanceTimersByTimeAsync(1800)
    expect(wrapper.emitted('running')).toEqual([[true], [false]])
  })

  it('restores a completed plan without starting it again in autonomous mode', async () => {
    const first = plan({ stateKey: 'completed', approvalMode: 'autonomous' })
    expect(first.emitted('running')).toEqual([[true]])
    await vi.advanceTimersByTimeAsync(1800)
    first.unmount()
    const second = plan({ stateKey: 'completed', approvalMode: 'autonomous' })
    await vi.advanceTimersByTimeAsync(120_000)
    expect(second.text()).toContain('模拟执行完成')
    expect(second.emitted('running')).toBeUndefined()
  })

  it('resumes a running plan from its original start time after refresh', async () => {
    const first = plan({ stateKey: 'running', approvalMode: 'autonomous' })
    expect(first.emitted('running')).toEqual([[true]])
    const startedAt = Date.now()
    await vi.advanceTimersByTimeAsync(600)
    first.unmount()
    const second = plan({ stateKey: 'running', approvalMode: 'autonomous' })
    expect(snapshot('running')).toEqual({ status: 'running', startedAt })
    await vi.advanceTimersByTimeAsync(1199)
    expect(second.text()).toContain('正在模拟执行')
    await vi.advanceTimersByTimeAsync(1)
    expect(second.text()).toContain('模拟执行完成')
    expect(snapshot('running')).toEqual({ status: 'done', startedAt })
  })

  it('keeps a stopped plan cancelled after refresh', async () => {
    const first = plan({ stateKey: 'cancelled' })
    await button(first, '立即执行').trigger('click')
    await button(first, '停止执行').trigger('click')
    first.unmount()
    const second = plan({ stateKey: 'cancelled', approvalMode: 'autonomous' })
    await vi.advanceTimersByTimeAsync(120_000)
    expect(second.text()).toContain('已取消')
    expect(second.emitted('running')).toBeUndefined()
    expect(snapshot('cancelled')?.status).toBe('cancelled')
  })

  it('migrates a paused legacy plan to manual waiting and ignores its deadline', async () => {
    writePrototypeChatValue('follow-plan:legacy', {
      status: 'paused', deadline: Date.now() - 60_000, startedAt: null,
    })
    const wrapper = plan({ stateKey: 'legacy', hasDraft: true })
    await vi.advanceTimersByTimeAsync(120_000)
    expect(wrapper.text()).toContain('等待执行')
    expect(wrapper.emitted('running')).toBeUndefined()
    expect(snapshot('legacy')).toEqual({ status: 'waiting', startedAt: null })
  })

  it.each([
    { label: 'missing', startedAt: undefined },
    { label: 'null', startedAt: null },
    { label: 'invalid text', startedAt: 'not-a-time' },
    { label: 'negative', startedAt: -1 },
    { label: 'future', startedAt: 1791604800001 },
  ])('does not infer completion for a running plan with a $label start time', async ({ startedAt }) => {
    writePrototypeChatValue('follow-plan:unverified-running', { status: 'running', startedAt })
    const wrapper = plan({ stateKey: 'unverified-running', approvalMode: 'autonomous' })
    await vi.advanceTimersByTimeAsync(120_000)
    expect(wrapper.text()).toContain('执行结果待核实')
    expect(wrapper.emitted('blocked')).toEqual([[true]])
    expect(wrapper.emitted('running')).toBeUndefined()
    expect(wrapper.find('.follow-result').exists()).toBe(false)
    expect(snapshot('unverified-running')).toEqual({ status: 'unknown', startedAt: null })
  })

  it.each(['unknown', 'unrecognized'])('does not restart a persisted %s plan after refresh', async status => {
    writePrototypeChatValue('follow-plan:unverified-status', { status, startedAt: null })
    const first = plan({ stateKey: 'unverified-status', approvalMode: 'autonomous' })
    await vi.advanceTimersByTimeAsync(120_000)
    expect(first.text()).toContain('执行结果待核实')
    expect(first.emitted('blocked')).toEqual([[true]])
    expect(first.emitted('running')).toBeUndefined()
    first.unmount()
    const second = plan({ stateKey: 'unverified-status', approvalMode: 'autonomous' })
    await vi.advanceTimersByTimeAsync(120_000)
    expect(second.text()).toContain('执行结果待核实')
    expect(second.emitted('blocked')).toEqual([[true]])
    expect(second.emitted('running')).toBeUndefined()
    expect(second.find('.follow-result').exists()).toBe(false)
  })

  it('keeps an edited default plan waiting for manual execution', async () => {
    const wrapper = plan()
    await button(wrapper, '修改计划').trigger('click')
    expect(wrapper.emitted('modify')).toEqual([[]])
    await vi.advanceTimersByTimeAsync(120_000)
    expect(wrapper.text()).toContain('等待执行')
    expect(wrapper.emitted('running')).toBeUndefined()
  })
})

describe('approval mode locking', () => {
  it('ignores a stale selection event after the conversation mode becomes readonly', async () => {
    const wrapper = mount(ApprovalModeControl, { props: { modelValue: 'default' } })
    wrappers.push(wrapper)
    await wrapper.get('[data-testid="approval-mode-trigger"]').trigger('click')
    const oldSelection = wrapper.get('[data-testid="approval-mode-autonomous"]')
    await wrapper.setProps({ readonly: true })
    await oldSelection.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.get('[data-testid="conversation-approval-mode"]').text()).toContain('默认权限')
  })
})




