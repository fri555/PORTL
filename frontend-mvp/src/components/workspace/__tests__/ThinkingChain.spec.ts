import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ThinkingChain from '@/components/workspace/ThinkingChain.vue'
import type { ThinkingStep } from '@/composables/useAIChat'

const steps: ThinkingStep[] = [
  { id: 'understand', label: '理解任务', detail: '已确认目标、范围和交付要求。', status: 'completed', icon: 'sparkles', module: 'status', kind: 'summary', elapsed: 800 },
  { id: 'plan', label: '制定执行计划', detail: '校验需求、检索资料、生成方案。', status: 'completed', icon: 'list', module: 'plan', kind: 'plan', elapsed: 600 },
  { id: 'search-1', label: '查询商品资料', detail: '返回 12 条可用商品记录。', status: 'completed', icon: 'database', module: 'status', kind: 'tool', toolName: 'catalog_search', toolLabel: '商品资料查询', elapsed: 1200 },
  { id: 'search-2', label: '补充查询库存', detail: '返回 8 条有库存商品记录。', status: 'completed', icon: 'database', module: 'status', kind: 'tool', toolName: 'catalog_search', toolLabel: '商品资料查询', elapsed: 900 },
  { id: 'todo-1', label: '校验需求字段', detail: '需求字段已校验。', status: 'completed', icon: 'check', module: 'todo', kind: 'todo' },
  { id: 'reply', label: '生成最终回复', detail: '最终回复已生成。', status: 'completed', icon: 'message', module: 'reply', kind: 'reply' },
]

describe('ThinkingChain execution summary', () => {
  it('collapses a completed run into one summary and keeps todo and reply outside the process detail', () => {
    const wrapper = mount(ThinkingChain, { props: { steps, isCollapsed: true } })
    expect(wrapper.get('[data-testid="thinking-summary"]').text()).toContain('处理完成')
    expect(wrapper.get('[data-testid="thinking-summary"]').text()).toContain('调用 2 个工具')
    expect(wrapper.find('[data-testid="thinking-process-detail"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('专家待办')
    expect(wrapper.text()).not.toContain('生成最终回复')
  })

  it('groups repeated tool calls into one expandable block with result summaries', async () => {
    const wrapper = mount(ThinkingChain, { props: { steps, isCollapsed: false } })
    const group = wrapper.get('[data-testid="tool-group-catalog_search"]')
    expect(group.text()).toContain('商品资料查询')
    expect(group.text()).toContain('2 次调用')
    expect(group.text()).not.toContain('返回 12 条可用商品记录。')
    await group.get('button').trigger('click')
    expect(group.text()).toContain('返回 12 条可用商品记录。')
    expect(group.text()).toContain('返回 8 条有库存商品记录。')
  })

  it('shows the active tool call as a dynamic block and expands errors by default', () => {
    const activeSteps: ThinkingStep[] = [
      { ...steps[2], id: 'running-tool', status: 'running', detail: '正在读取当前用户有权限的商品资料。' },
      { ...steps[3], id: 'failed-tool', status: 'error', detail: '库存服务返回超时。', errorMsg: '连接超时，请重试。' },
    ]
    const wrapper = mount(ThinkingChain, { props: { steps: activeSteps, isCollapsed: false } })
    expect(wrapper.get('[data-testid="thinking-summary"]').text()).toContain('处理中')
    expect(wrapper.get('[data-testid="tool-group-catalog_search"]').text()).toContain('调用中')
    expect(wrapper.get('[data-testid="tool-group-catalog_search"]').text()).toContain('连接超时，请重试。')
  })
})
