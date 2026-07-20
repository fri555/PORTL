import { describe, expect, it, vi } from 'vitest'
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
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/workspace/chat', component: { template: '<div />' } },
      { path: '/knowledge', component: { template: '<div />' } },
    ],
  })
  return mount(SystemPortalsView, { global: { plugins: [pinia, testRouter] } })
}

describe('workbench routes', () => {
  it('keeps knowledge, workbench, and settings routes available', () => {
    expect(router.resolve('/knowledge').name).toBe('knowledge')
    expect(router.resolve('/portals').name).toBe('portals')
    expect(router.resolve('/settings').name).toBe('settings')
  })
})

describe('SystemPortalsView', () => {
  it('renders the MiniMax-style MVP workbench modules', () => {
    const wrapper = mountWorkbench()

    expect(wrapper.find('[data-testid="workbench-dashboard"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="workbench-main-grid"]').attributes('style')).toContain(
      'minmax(0, 1.55fr) minmax(420px, 0.9fr)',
    )
    expect(wrapper.text()).toContain('常用工作助手')
    expect(wrapper.text()).toContain('全能助手')
    expect(wrapper.text()).toContain('系统入口')
    expect(wrapper.text()).toContain('自营系统')
    expect(wrapper.text()).toContain('大库存查询系统')
    expect(wrapper.text()).toContain('今日日程')
    expect(wrapper.text()).toContain('任务')
    expect(wrapper.find('[data-testid="portal-scroll-area"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="schedule-scroll-area"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="todo-scroll-area"]').exists()).toBe(true)
  })

  it('switches assistant shortcuts and portal tabs', async () => {
    const wrapper = mountWorkbench()

    expect(wrapper.text()).toContain('数据分析助手')
    await wrapper.get('[data-testid="shortcut-tab-cases"]').trigger('click')
    expect(wrapper.text()).toContain('生成团购方案')
    expect(wrapper.text()).not.toContain('数据分析助手')
    await wrapper.get('[data-testid="shortcut-tab-knowledge"]').trigger('click')
    expect(wrapper.text()).toContain('商品知识库')

    expect(wrapper.text()).toContain('OA系统')
    expect(wrapper.text()).not.toContain('财务供销系统')
    await wrapper.get('[data-testid="portal-category-all"]').trigger('click')
    expect(wrapper.text()).toContain('财务供销系统')
    expect(wrapper.text()).toContain('苏体项目')
    await wrapper.get('[data-testid="portal-category-common"]').trigger('click')
    expect(wrapper.text()).toContain('OA系统')
    expect(wrapper.text()).not.toContain('财务供销系统')
  })

  it('filters schedules, navigates calendar, and switches task scopes', async () => {
    const wrapper = mountWorkbench()

    await wrapper.get('[aria-label="搜索今日日程"]').setValue('供应链')
    expect(wrapper.text()).toContain('供应链库存同步')
    expect(wrapper.text()).not.toContain('项目周会')
    await wrapper.get('[aria-label="搜索今日日程"]').setValue('不存在')
    expect(wrapper.text()).toContain('今天暂无日程')

    const monthBefore = wrapper.get('[data-testid="calendar-month-label"]').text()
    await wrapper.get('[aria-label="下个月"]').trigger('click')
    expect(wrapper.get('[data-testid="calendar-month-label"]').text()).not.toBe(monthBefore)
    await wrapper.get('[aria-label="回到今天"]').trigger('click')
    expect(wrapper.get('[data-testid="calendar-month-label"]').text()).toBe(monthBefore)

    await wrapper.get('[data-testid="todo-tab-assigned"]').trigger('click')
    expect(wrapper.text()).toContain('客户反馈跟进')
    expect(wrapper.text()).toContain('执行人：王杰')
    expect(wrapper.text()).not.toContain('撰写项目需求文档')
    await wrapper.get('[data-testid="todo-tab-created"]').trigger('click')
    expect(wrapper.text()).toContain('设计评审材料准备')
    expect(wrapper.text()).toContain('负责人：张明')
  })

  it('opens real portal links in a new tab', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const wrapper = mountWorkbench()

    await wrapper.get('[data-testid="portal-card-self"]').trigger('click')

    expect(openSpy).toHaveBeenCalledWith(
      'https://self.xingyunyezi.com/',
      '_blank',
      'noopener,noreferrer',
    )
    openSpy.mockRestore()
  })

  it('adds and removes systems from common portals', async () => {
    const wrapper = mountWorkbench()

    expect(wrapper.text()).not.toContain('财务供销系统')
    await wrapper.get('[data-testid="portal-category-all"]').trigger('click')
    await wrapper.get('[data-testid="favorite-portal-finance-supply"]').trigger('click')
    await wrapper.get('[data-testid="portal-category-common"]').trigger('click')
    expect(wrapper.text()).toContain('财务供销系统')

    await wrapper.get('[data-testid="favorite-portal-finance-supply"]').trigger('click')
    expect(wrapper.text()).not.toContain('财务供销系统')
  })

  it('searches portals with fuzzy matching in the active tab', async () => {
    const wrapper = mountWorkbench()

    await wrapper.get('[aria-label="搜索系统入口"]').setValue('需求')
    expect(wrapper.text()).toContain('需求管理系统')
    expect(wrapper.text()).not.toContain('自营系统')

    await wrapper.get('[data-testid="portal-category-all"]').trigger('click')
    await wrapper.get('[aria-label="搜索系统入口"]').setValue('微信小程序')
    expect(wrapper.text()).toContain('天马运动马达端小程序')
    expect(wrapper.text()).toContain('团购小程序')
    expect(wrapper.text()).not.toContain('自营系统')
  })

  it('uploads a local logo preview for a portal card', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:portal-logo')
    const wrapper = mountWorkbench()

    await wrapper.get('[data-testid="upload-logo-self"]').trigger('click')
    const input = wrapper.get<HTMLInputElement>('[data-testid="portal-logo-input"]')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [new File(['logo'], 'logo.png', { type: 'image/png' })],
    })
    await input.trigger('change')

    expect(createObjectURL).toHaveBeenCalled()
    expect(wrapper.get('[alt="自营系统 logo"]').attributes('src')).toBe('blob:portal-logo')
    createObjectURL.mockRestore()
  })
})
