import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import router from '@/router'
import SystemPortalsView from '@/views/SystemPortalsView.vue'

function mountWorkbench() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const testRouter = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  return mount(SystemPortalsView, { global: { plugins: [pinia, testRouter] } })
}

describe('workbench routes', () => {
  it('keeps knowledge, workbench, and governance routes available', () => {
    expect(router.resolve('/knowledge').name).toBe('knowledge')
    expect(router.resolve('/portals').name).toBe('portals')
    expect(router.resolve('/admin/governance').name).toBe('ai-governance')
  })
})

describe('SystemPortalsView', () => {
  it('renders the 60:40 enterprise workbench modules and real systems', () => {
    const wrapper = mountWorkbench()

    expect(wrapper.find('[data-testid="workbench-dashboard"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="workbench-main-grid"]').attributes('style')).toContain(
      'minmax(0, 3fr) minmax(430px, 2fr)',
    )
    expect(wrapper.text()).toContain('系统入口')
    expect(wrapper.text()).toContain('AI大模型')
    expect(wrapper.text()).toContain('天马运动')
    expect(wrapper.text()).toContain('耶运动-视觉内容中心')
    expect(wrapper.text()).toContain('日历')
    expect(wrapper.text()).toContain('今日日程')
    expect(wrapper.text()).toContain('待办事项')
  })

  it('supports system search, calendar navigation, and todo interactions', async () => {
    const wrapper = mountWorkbench()

    await wrapper.get('[aria-label="搜索系统入口"]').setValue('AI大模型')
    expect(wrapper.text()).toContain('AI大模型问答')
    expect(wrapper.text()).not.toContain('天马运动')
    await wrapper.get('[aria-label="搜索系统入口"]').setValue('不存在')
    expect(wrapper.text()).toContain('没有匹配的系统入口')
    await wrapper.get('[data-testid="clear-portal-search"]').trigger('click')
    expect(wrapper.text()).toContain('天马运动')

    const monthBefore = wrapper.get('[data-testid="calendar-month-label"]').text()
    await wrapper.get('[aria-label="下个月"]').trigger('click')
    expect(wrapper.get('[data-testid="calendar-month-label"]').text()).not.toBe(monthBefore)
    await wrapper.get('[aria-label="回到今天"]').trigger('click')
    expect(wrapper.get('[data-testid="calendar-month-label"]').text()).toBe(monthBefore)

    await wrapper.get('[data-testid="todo-tab-responsible"]').trigger('click')
    expect(wrapper.text()).toContain('撰写项目需求文档')
    expect(wrapper.text()).not.toContain('客户反馈跟进')
    await wrapper.get('[aria-label="完成待办：撰写项目需求文档"]').trigger('click')
    expect(wrapper.get('[data-testid="todo-item-todo-1"]').classes()).toContain('opacity-60')
  })
})
