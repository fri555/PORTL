import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ThinkingProgressBar from '@/components/workspace/ThinkingProgressBar.vue'
import type { ThinkingStep } from '@/composables/useAIChat'

const todos: ThinkingStep[] = [
  { id: '1', label: '校验需求字段', detail: '', status: 'completed', icon: 'check', module: 'todo', kind: 'todo' },
  { id: '2', label: '查询商品资料', detail: '', status: 'completed', icon: 'check', module: 'todo', kind: 'todo' },
  { id: '3', label: '生成组货方案', detail: '', status: 'running', icon: 'loader', module: 'todo', kind: 'todo' },
  { id: '4', label: '检查交付文件', detail: '', status: 'pending', icon: 'circle', module: 'todo', kind: 'todo' },
  { id: '5', label: '整理最终回复', detail: '', status: 'pending', icon: 'circle', module: 'todo', kind: 'todo' },
]

describe('ThinkingProgressBar', () => {
  it('renders one compact progress row with an independently derived completion rate', () => {
    const wrapper = mount(ThinkingProgressBar, { props: { steps: todos } })
    expect(wrapper.get('[data-testid="expert-todo-progress"]').text()).toContain('进度 2/5')
    expect(wrapper.get('[data-testid="expert-todo-progress-fill"]').attributes('style')).toContain('40%')
  })

  it('keeps task details in a hoverable tooltip instead of expanding the composer vertically', () => {
    const wrapper = mount(ThinkingProgressBar, { props: { steps: todos } })
    const tooltip = wrapper.get('[role="tooltip"]')
    expect(tooltip.text()).toContain('校验需求字段')
    expect(tooltip.text()).toContain('生成组货方案')
    expect(tooltip.text()).toContain('执行中')
    expect(tooltip.text()).toContain('待执行')
  })
})
