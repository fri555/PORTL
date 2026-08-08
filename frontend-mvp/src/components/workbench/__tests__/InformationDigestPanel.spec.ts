import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { MessageSummaryItem } from '@/types/workbench'
import InformationDigestPanel from '../InformationDigestPanel.vue'

function item(
  id: string,
  category: MessageSummaryItem['category'] = 'followup',
  actions: MessageSummaryItem['actions'] = [],
): MessageSummaryItem {
  return {
    id,
    category,
    title: `事项${id}`,
    summary: '这里是事项摘要',
    impact: '需要及时处理',
    priority: 'mid',
    score: 68,
    isConflict: id === 'conflict',
    conflictDetail: id === 'conflict' ? 'GMV 出现不同来源值：120万、98万' : undefined,
    latestTime: '2026-07-23 10:30',
    sourceCount: 1,
    sources: [{
      id: `source-${id}`,
      conversationName: '经营群',
      conversationId: 'group-1',
      senderName: '运营负责人',
      senderId: 'user-1',
      sentAt: '2026-07-23 10:30',
      content: '旗舰店 GMV 跌破目标 20%',
      openMessageId: `message-${id}`,
    }],
    businessDomain: '销售',
    aiAnalysis: ['变化显著性 100 分：命中破线词'],
    scoreTrace: {
      ruleVersion: 'prd-3.9-rules-1',
      factors: [{
        key: 'significance',
        label: '变化显著性',
        level: 'message',
        rawValue: 100,
        weight: 0.4,
        contribution: 40,
        basis: '命中破线词',
      }],
      matchedSignals: ['经营破线'],
      degradationReasons: [],
    },
    actions,
  }
}

const items = [
  item('1', 'followup', [{ type: 'send_msg', enabled: true, actionRef: 'action-1' }]),
  item('2'),
  item('3'),
  item('4'),
  item('5'),
  item('6'),
  item('decision', 'decision'),
  item('business', 'business'),
]

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(InformationDigestPanel, {
    props: {
      items,
      dataMode: 'demo',
      refreshedAt: '2026-07-23T10:30:00+08:00',
      ...props,
    },
    attachTo: document.body,
  })
}

describe('InformationDigestPanel v3.9', () => {
  it('renders the five PRD tabs in order', () => {
    const wrapper = mountPanel()
    const labels = wrapper.findAll('[role="tab"]').map((node) => node.text())
    expect(labels).toEqual(['重点跟进', '待我决策', '风险预警', '经营动态', '我的关注'])
  })

  it('shows only five items before the first lazy-load boundary', () => {
    const wrapper = mountPanel()
    expect(wrapper.findAll('article[data-testid^="digest-item-"]')).toHaveLength(5)
    const row = wrapper.get('[data-testid="digest-item-1"]')
    expect(row.find('[data-testid="digest-domain-1"]').exists()).toBe(false)
    expect(row.get('[data-testid="digest-summary-1"]').text()).toContain('摘要：')
    expect(row.get('[data-testid="digest-impact-1"]').text()).toContain('影响：')
    expect(row.find('[data-testid="digest-accent-1"]').exists()).toBe(true)
  })

  it('shows a concise bound detail after hovering the source-count icon', async () => {
    const wrapper = mountPanel()

    await wrapper.get('[data-testid="digest-detail-trigger-1"]').trigger('mouseenter')

    const detail = wrapper.get('[data-testid="digest-detail-floating"]')
    expect(detail.text()).toContain('AI 分析')
    expect(detail.text()).toContain('消息来源')
    expect(detail.text()).not.toContain('消息 ID')
    expect(detail.text()).not.toContain('规则版本')
    expect(detail.classes()).toContain('absolute')
    expect(detail.attributes('data-bound-to')).toBe('1')
    expect(detail.find('[data-action-type]').exists()).toBe(false)
    expect(detail.find('a[target="_blank"]').exists()).toBe(false)
  })

  it('opens an action-only dialog without opening details', async () => {
    const wrapper = mountPanel()

    await wrapper.get('[data-testid="digest-action-send_msg-1"]').trigger('click')

    const dialog = wrapper.get('[data-testid="digest-action-dialog"]')
    expect(wrapper.find('[data-testid="digest-detail-floating"]').exists()).toBe(false)
    expect(dialog.text()).not.toContain('评分：')
    expect(dialog.text()).not.toContain('钉钉原文')
    expect(dialog.text()).not.toContain('影响')
  })

  it('uses directed empty copy for risk and watch', async () => {
    const wrapper = mountPanel({ items: [] })

    await wrapper.get('[data-testid="digest-tab-risk"]').trigger('click')
    expect(wrapper.text()).toContain('近期平稳')

    await wrapper.get('[data-testid="digest-tab-watch"]').trigger('click')
    expect(wrapper.text()).toContain('暂无关注项')
    expect(wrapper.text()).toContain('新增关注')
  })

  it('emits refresh without changing the active tab', async () => {
    const wrapper = mountPanel()
    await wrapper.get('[data-testid="digest-tab-business"]').trigger('click')
    await wrapper.get('[data-testid="digest-refresh"]').trigger('click')

    expect(wrapper.emitted('refresh')).toHaveLength(1)
    expect(wrapper.get('[data-testid="digest-tab-business"]').attributes('aria-selected')).toBe('true')
  })

  it('removes a dismissed item from the current view', async () => {
    const wrapper = mountPanel()

    await wrapper.get('[data-testid="digest-dismiss-1"]').trigger('click')

    expect(wrapper.find('[data-testid="digest-item-1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="digest-item-6"]').exists()).toBe(true)
  })

  it('reveals the next batch near the scroll bottom', async () => {
    const wrapper = mountPanel()
    const area = wrapper.get('[data-testid="digest-scroll-area"]')
    Object.defineProperties(area.element, {
      scrollTop: { value: 320, configurable: true },
      scrollHeight: { value: 600, configurable: true },
      clientHeight: { value: 300, configurable: true },
    })

    await area.trigger('scroll')

    expect(wrapper.findAll('article[data-testid^="digest-item-"]')).toHaveLength(6)
  })

  it('keeps a visible conflict example in the default mock data', async () => {
    const wrapper = mount(InformationDigestPanel, { props: { dataMode: 'demo' }, attachTo: document.body })
    const conflictItem = wrapper.get('[data-testid="digest-item-digest-followup-price"]')

    expect(conflictItem.text()).toContain('冲突')
    await conflictItem.get('[data-testid="digest-detail-trigger-digest-followup-price"]').trigger('mouseenter')
    expect(wrapper.get('[data-testid="digest-detail-floating"]').text()).toContain('平台反馈活动底价为 299 元')
  })
})
