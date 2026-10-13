import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import InlineExecutionTrace from '../InlineExecutionTrace.vue'

const steps = [
  { title: '读取需求', detail: '已确认目标与范围', status: 'done', duration: '0.8 秒' },
  { title: '读取文件', detail: '正在读取已授权资料', status: 'running', duration: '1.4 秒' },
  { title: '生成结果', detail: '等待资料处理完成', status: 'waiting', duration: '—' },
] as const

describe('InlineExecutionTrace', () => {
  it('uses an inline narrative and an expanded scrollable command group while running', () => {
    const wrapper = mount(InlineExecutionTrace, { props: { status: 'running', headline: '执行中', steps: [...steps] } })

    expect(wrapper.get('[data-testid="inline-execution-trace"]').text()).toContain('正在处理')
    expect(wrapper.get('[data-testid="execution-process-trigger"]').attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[data-testid="execution-command-list"]').classes()).toContain('execution-trace__command-list')
    expect(wrapper.findAll('[data-testid="execution-command-row"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('正在运行命令')
  })

  it('collapses the command group after completion and keeps it available for review', async () => {
    const wrapper = mount(InlineExecutionTrace, {
      props: { status: 'done', headline: '处理完成', steps: steps.map(step => ({ ...step, status: 'done' as const })) },
    })

    const trigger = wrapper.get('[data-testid="execution-process-trigger"]')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-testid="execution-command-list"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('完成处理')

    await trigger.trigger('click')
    expect(wrapper.find('[data-testid="execution-command-list"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('已运行命令')
  })
})
