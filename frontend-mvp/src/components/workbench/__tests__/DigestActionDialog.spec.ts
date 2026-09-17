import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import DigestActionDialog from '../DigestActionDialog.vue'
import type { DigestActionOption, MessageSummaryItem } from '@/types/workbench'

const item: MessageSummaryItem = {
  id: 'digest-1', category: 'followup', title: '库存调拨', summary: '库存不足', impact: '影响履约', priority: 'high', score: 90,
  isConflict: false, latestTime: '2026-07-26 10:00', sourceCount: 2, businessDomain: '供应链', aiAnalysis: [],
  scoreTrace: { ruleVersion: 'test', factors: [], matchedSignals: [], degradationReasons: [] }, actions: [],
  sources: [
    { id: 's1', conversationName: '供应链群', conversationId: 'g1', senderName: '李娜', senderId: 'u1', sentAt: '10:00', content: '请确认库存', groupActionRef: 'group-ref', userActionRef: 'user-ref' },
    { id: 's2', conversationName: '经营群', conversationId: 'g2', senderName: '王敏', senderId: 'u2', sentAt: '09:00', content: '关注履约', groupActionRef: 'group-ref-2', userActionRef: 'user-ref-2' },
  ],
}

function mountDialog(action: DigestActionOption) {
  return mount(DigestActionDialog, { props: { item, action, pending: false } })
}

describe('DigestActionDialog', () => {
  it('shows recipient and content without a message title', async () => {
    const wrapper = mountDialog({ type: 'send_msg', enabled: true, actionRef: 'group-ref' })

    expect(wrapper.get('[data-testid="message-recipient"]').text()).toContain('供应链群')
    expect(wrapper.find('[data-testid="message-content"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="message-title"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('*')
  })

  it('shows the complete DingTalk todo fields', () => {
    const wrapper = mountDialog({ type: 'create_todo', enabled: true })

    expect(wrapper.find('[data-testid="todo-title"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="todo-description"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="todo-executors"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="todo-participants"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="todo-due"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="todo-reminder"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="todo-priority"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="todo-priority"]').findAll('button').map((button) => button.text())).toEqual(['较低', '普通', '较高', '紧急'])
    expect(wrapper.find('[data-testid="todo-tags"]').exists()).toBe(false)
    expect(wrapper.findAll('.text-red-500')).toHaveLength(1)
    expect(wrapper.get('[data-testid="todo-title-priority-row"]').classes()).toContain('grid-cols-[minmax(0,1fr)_132px]')
    expect(wrapper.get('[data-testid="todo-people-row"]').classes()).toContain('sm:grid-cols-2')
    expect(wrapper.get('[data-testid="todo-participants"]').text()).toContain('当前用户')
    expect(wrapper.get('[data-testid="todo-time-row"]').classes()).toContain('sm:grid-cols-2')
    expect(wrapper.find('[data-testid="todo-due-date"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="todo-due-time"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="todo-reminder-date"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="todo-reminder-time"]').exists()).toBe(true)
  })

  it('submits DingTalk urgent priority without collapsing it into high priority', async () => {
    const wrapper = mountDialog({ type: 'create_todo', enabled: true })
    await wrapper.get('[data-testid="todo-priority-urgent"]').trigger('click')
    await wrapper.get('[data-testid="digest-action-confirm"]').trigger('click')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({ priority: 'urgent' })
  })

  it('submits description, priority, participants, and reminder time with a todo', async () => {
    const wrapper = mountDialog({ type: 'create_todo', enabled: true })
    await wrapper.get('[data-testid="todo-description"]').setValue('确认跨仓调拨数量并回传结果')
    await wrapper.get('[data-testid="todo-priority-low"]').trigger('click')
    await wrapper.get('[data-testid="todo-reminder-date"]').setValue('2026-07-30')
    await wrapper.get('[data-testid="todo-reminder-time"]').setValue('17:00')
    await wrapper.get('[data-testid="digest-action-confirm"]').trigger('click')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      action: 'todo',
      description: '确认跨仓调拨数量并回传结果',
      priority: 'low',
      reminderTime: '2026-07-30T17:00',
      participants: ['current-user'],
    })
    expect(wrapper.emitted('submit')?.[0]?.[0]).not.toHaveProperty('tags')
  })

  it('emits the selected target reference and editable message content', async () => {
    const wrapper = mountDialog({ type: 'send_msg', enabled: true, actionRef: 'group-ref' })
    await wrapper.get('[data-testid="message-content"]').setValue('请今天确认库存调拨方案。')
    await wrapper.get('[data-testid="digest-action-confirm"]').trigger('click')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({ action: 'message', actionRef: 'group-ref', text: '请今天确认库存调拨方案。' })
  })

  it('offers common message shortcuts and keeps the button type scale below the title', async () => {
    const wrapper = mountDialog({ type: 'send_msg', enabled: true, actionRef: 'group-ref' })
    await wrapper.get('[data-testid="message-template-推进"]').trigger('click')

    expect((wrapper.get('[data-testid="message-content"]').element as HTMLTextAreaElement).value).toContain('明确责任人与完成时间')
    expect(wrapper.get('[data-testid="message-template-推进"]').classes()).toContain('text-[10px]')
    expect(wrapper.get('h3').classes()).toContain('text-[14px]')
  })

  it('searches and selects a recipient from the enterprise address book', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ contacts: [{ ref: 'contact-li', name: '李娜', department: '财务部' }] }) }))
    const wrapper = mountDialog({ type: 'send_msg', enabled: true, actionRef: 'group-ref' })

    await wrapper.get('[data-testid="message-recipient-input"]').setValue('李娜')
    await wrapper.get('[data-testid="message-recipient-input"]').trigger('keydown.enter')
    await flushPromises()
    await wrapper.get('[data-testid="message-recipient"]').findAll('button').find((button) => button.text().includes('李娜'))!.trigger('click')

    expect(wrapper.get('[data-testid="message-recipient"]').text()).toContain('李娜')
    vi.unstubAllGlobals()
  })
})
