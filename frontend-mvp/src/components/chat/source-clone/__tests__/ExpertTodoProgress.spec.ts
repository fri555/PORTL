import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ExpertTodoProgress from '../ExpertTodoProgress.vue'

const steps = [
  { title: '理解任务', detail: '已确认目标与范围', status: 'done', duration: '0.8 秒' },
  { title: '读取授权资料', detail: '正在读取资料', status: 'running', duration: '1.4 秒' },
  { title: '生成结果', detail: '等待资料处理完成', status: 'waiting', duration: '—' },
] as const

describe('ExpertTodoProgress', () => {
  it('shows one-line progress and reveals task details on hover', async () => {
    const wrapper = mount(ExpertTodoProgress, { props: { steps: [...steps] } })

    expect(wrapper.get('[data-testid="expert-todo-progress"]').text()).toContain('进度 1/3')
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('33')
    expect(wrapper.find('[data-testid="expert-todo-details"]').exists()).toBe(false)

    await wrapper.get('[data-testid="expert-todo-progress"]').trigger('mouseenter')
    const details = wrapper.get('[data-testid="expert-todo-details"]')
    expect(details.text()).toContain('理解任务')
    expect(details.text()).toContain('读取授权资料')
    expect(details.text()).toContain('执行中')
  })

  it('keeps the completed summary available above the composer', () => {
    const wrapper = mount(ExpertTodoProgress, {
      props: { steps: steps.map(step => ({ ...step, status: 'done' as const })) },
    })

    expect(wrapper.get('[data-testid="expert-todo-progress"]').text()).toContain('进度 3/3')
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
  })
})