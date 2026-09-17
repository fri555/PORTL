import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import EmailSummaryPanel from '../EmailSummaryPanel.vue'
import type { EmailSummaryItem } from '@/types/workbench'

const items: EmailSummaryItem[] = [
  {
    id: 'unread-mail',
    mailId: 'INBOX:10',
    subject: '未读经营邮件',
    senderName: '王敏',
    senderEmail: 'wangmin@example.com',
    receivedAt: '今天 10:30',
    summary: '需要确认本周经营方案。',
    unread: true,
  },
  {
    id: 'read-mail',
    mailId: 'INBOX:9',
    subject: '已读通知邮件',
    senderName: '信息技术部',
    senderEmail: 'it@example.com',
    receivedAt: '昨天 16:20',
    summary: '账号安全检查通知。',
    unread: false,
  },
]

describe('EmailSummaryPanel', () => {
  it('shows read state returned by the mailbox without changing it', () => {
    const wrapper = mount(EmailSummaryPanel, { props: { items } })

    expect(wrapper.get('[data-testid="email-read-state-unread-mail"]').text()).toBe('未读')
    expect(wrapper.get('[data-testid="email-read-state-read-mail"]').text()).toBe('已读')
  })

  it('requests the next page and prevents repeated requests while loading', async () => {
    const wrapper = mount(EmailSummaryPanel, { props: { items, hasMore: true } })

    await wrapper.get('[data-testid="email-load-more"]').trigger('click')
    expect(wrapper.emitted('loadMore')).toHaveLength(1)

    await wrapper.setProps({ loadingMore: true })
    expect(wrapper.get('[data-testid="email-load-more"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="email-load-more"]').text()).toContain('加载中')
  })
})
