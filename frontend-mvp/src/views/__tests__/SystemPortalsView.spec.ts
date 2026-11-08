import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import router from '@/router'
import SystemPortalsView from '@/views/SystemPortalsView.vue'

// Retain the current navigation contract; retired workbench modules are archived.
describe('workbench routes', () => {
  it('keeps knowledge, workbench, and settings routes available', () => {
    expect(router.resolve('/knowledge').name).toBe('knowledge')
    expect(router.resolve('/portals').name).toBe('portals')
    expect(router.resolve('/dashboards').name).toBe('dashboards')
    expect(router.resolve('/settings').name).toBe('settings')
    expect(router.resolve('/settings/agents').name).toBe('settings-agents')
  })
})

describe('current system portal directory', () => {
  const approvalUrl =
    'dingtalk://dingtalkclient/action/openapp?app_id=-4&container_type=work_platform&corpid=dingaed79d9c350e396c35c2f4657eb6378f&ddtab=true&redirect_type=jump&redirect_url=https%3A%2F%2Faflow.dingtalk.com%2Fdingtalk%2Fmobile%2Fhomepage.htm%3Fbackcontrol%3Dfalse%26corpid%3Ddingaed79d9c350e396c35c2f4657eb6378f%26dd_progress%3Dfalse%26dd_share%3Dfalse%26ddtab%3Dtrue%26showmenu%3Dfalse%23%2Fcustom%3Fpcredirect%3Dself%26processCode%3DPROC-0E4D5BC5-026C-456D-8FEB-274184F6A3C8'

  it('identifies the system directory within the workbench navigation', () => {
    const wrapper = mount(SystemPortalsView)
    const navigation = wrapper.get('nav[aria-label="工作台"]')

    expect(navigation.get('[aria-current="page"]').text()).toBe('系统入口')
    expect(navigation.text()).toContain('待办管理')
    expect(navigation.text()).toContain('商品综合查询')
    expect(wrapper.get('section[aria-labelledby="system-portals-title"]').text()).toContain(
      '选择要进入的企业系统',
    )
    wrapper.unmount()
  })

  it('lets the merchandise menu collapse and reopen its child entries', async () => {
    const wrapper = mount(SystemPortalsView)
    const merchandiseToggle = wrapper.get('button[aria-controls="merchandise-navigation"]')

    expect(merchandiseToggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('#merchandise-navigation').text()).toContain('现货补货')
    expect(wrapper.get('#merchandise-navigation').text()).toContain('期货订货')

    await merchandiseToggle.trigger('click')
    expect(merchandiseToggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('#merchandise-navigation').exists()).toBe(false)

    await merchandiseToggle.trigger('click')
    expect(merchandiseToggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('#merchandise-navigation').text()).toContain('现货补货')
    wrapper.unmount()
  })

  it('lets a labelled search field find a system without requiring its exact name', async () => {
    const wrapper = mount(SystemPortalsView)

    await wrapper.get('input[aria-label="搜索系统入口"]').setValue('供应链')

    expect(wrapper.findAll('[data-testid="system-portal-card"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="system-portal-card"]').text()).toContain('天马运动')
    wrapper.unmount()
  })

  it.each([
    { label: '待办管理', names: ['售后工单', '需求管理系统'] },
    { label: '商品综合查询', names: ['天马运动', '大库存'] },
    { label: '现货补货', names: ['天马运动', '新零售', '大库存'] },
    { label: '期货订货', names: ['天马运动', '【自营】订单系统'] },
  ])('opens the relevant searchable system entries from $label', async ({ label, names }) => {
    const wrapper = mount(SystemPortalsView)
    const item = wrapper.findAll('nav button').find((button) => button.text() === label)

    expect(item, `${label} should be an operable menu item`).toBeDefined()
    await item!.trigger('click')

    expect(wrapper.get('h1').text()).toBe(`${label} · 系统入口`)
    const cards = wrapper.findAll('[data-testid="system-portal-card"]')
    expect(cards).toHaveLength(names.length)
    names.forEach((name, index) => expect(cards[index]!.text()).toContain(name))
    expect(wrapper.get('nav [aria-current="page"]').text()).toBe(label)
    wrapper.unmount()
  })

  it('searches the selected category and restores all systems when returning to the directory', async () => {
    const wrapper = mount(SystemPortalsView)
    const queryMenu = wrapper
      .findAll('nav button')
      .find((button) => button.text() === '商品综合查询')

    expect(queryMenu, '商品综合查询 should be an operable menu item').toBeDefined()
    await queryMenu!.trigger('click')
    await wrapper.get('input').setValue('库存')
    expect(wrapper.findAll('[data-testid="system-portal-card"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="system-portal-card"]').text()).toContain('大库存')

    await wrapper
      .findAll('nav button')
      .find((button) => button.text() === '系统入口')!
      .trigger('click')
    expect(wrapper.get('h1').text()).toBe('系统入口')
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('')
    expect(wrapper.findAll('[data-testid="system-portal-card"]')).toHaveLength(11)
    wrapper.unmount()
  })

  it('shows every system entry and keeps unauthorized entries visible', () => {
    const wrapper = mount(SystemPortalsView)
    expect(wrapper.get('h1').text()).toBe('系统入口')
    expect(wrapper.findAll('[data-testid="system-portal-card"]')).toHaveLength(11)
    expect(wrapper.text()).toContain('集团统一工作台')
    expect(wrapper.text()).toContain('需求管理系统')
    expect(wrapper.findAll('[data-testid="portal-apply-access"]').length).toBeGreaterThan(0)
    expect(wrapper.get('[data-testid="portal-apply-access"]').attributes('href')).toBe(approvalUrl)
    expect(wrapper.findAll('[data-testid="portal-enter"]').length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('makes every portal card keyboard focusable so its hover action is also discoverable without a mouse', () => {
    const wrapper = mount(SystemPortalsView)
    const cards = wrapper.findAll('[data-testid="system-portal-card"]')

    expect(cards.every((card) => card.attributes('tabindex') === '0')).toBe(true)
    expect(wrapper.get('[data-testid="portal-enter"]').text()).toContain('进入')
    expect(wrapper.get('[data-testid="portal-apply-access"]').text()).toBe('申请')
    expect(wrapper.get('[data-testid="portal-apply-access"]').classes()).toContain('border-[#111]')
    expect(wrapper.get('[data-testid="portal-apply-access"]').classes()).toContain('text-[#111]')
    expect(wrapper.get('[data-testid="portal-apply-access"]').classes()).toContain('top-3')
    expect(wrapper.get('[data-testid="portal-apply-access"]').classes()).toContain('right-3')
    expect(wrapper.get('[data-testid="portal-apply-access"]').classes()).not.toContain('bottom-2')
  })

  it('filters entries by their system name', async () => {
    const wrapper = mount(SystemPortalsView)
    await wrapper.get('input').setValue('订单')
    expect(wrapper.findAll('[data-testid="system-portal-card"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="system-portal-card"]').text()).toContain('【自营】订单系统')
    wrapper.unmount()
  })

  it('matches descriptions and ignores letter case', async () => {
    const wrapper = mount(SystemPortalsView)
    await wrapper.get('input').setValue('供应链')
    expect(wrapper.get('[data-testid="system-portal-card"]').text()).toContain('天马运动')
    await wrapper.get('input').setValue('ai')
    expect(wrapper.findAll('[data-testid="system-portal-card"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="system-portal-card"]').text()).toContain('AI大模型')
    wrapper.unmount()
  })

  it('shows no matches and restores all entries after clearing the query', async () => {
    const wrapper = mount(SystemPortalsView)
    await wrapper.get('input').setValue('__missing_system__')
    expect(wrapper.findAll('[data-testid="system-portal-card"]')).toHaveLength(0)
    await wrapper.get('input').setValue('')
    expect(wrapper.findAll('[data-testid="system-portal-card"]')).toHaveLength(11)
    wrapper.unmount()
  })

  it('keeps a whitespace-only query equivalent to the unfiltered directory', async () => {
    const wrapper = mount(SystemPortalsView)
    await wrapper.get('input').setValue('   ')
    expect(wrapper.findAll('[data-testid="system-portal-card"]')).toHaveLength(11)
    wrapper.unmount()
  })
})

// Shared data vocabulary remains in use even though the old workbench UI is retired.
import { workbenchTodos } from '@/mock/workbench'
describe('SystemPortalsView', () => {
  it('stores task statuses and priorities with the product vocabulary', () => {
    expect(new Set(workbenchTodos.map((item) => item.status))).toEqual(
      new Set(['未完成', '已完成']),
    )
    expect(new Set(workbenchTodos.map((item) => item.priority))).toEqual(
      new Set(['紧急', '较高', '普通', '较低']),
    )
  })
})
