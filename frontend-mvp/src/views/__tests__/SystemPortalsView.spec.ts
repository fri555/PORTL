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
  it('shows the current system directory and its eleven entries', () => {
    const wrapper = mount(SystemPortalsView)
    expect(wrapper.get('h1').text()).toBe('系统入口')
    expect(wrapper.findAll('button')).toHaveLength(11)
    expect(wrapper.text()).toContain('集团统一工作台')
    expect(wrapper.text()).toContain('需求管理系统')
    wrapper.unmount()
  })

  it('filters entries by their system name', async () => {
    const wrapper = mount(SystemPortalsView)
    await wrapper.get('input').setValue('订单')
    expect(wrapper.findAll('button')).toHaveLength(1)
    expect(wrapper.get('button').text()).toContain('【自营】订单系统')
    wrapper.unmount()
  })

  it('matches descriptions and ignores letter case', async () => {
    const wrapper = mount(SystemPortalsView)
    await wrapper.get('input').setValue('供应链')
    expect(wrapper.get('button').text()).toContain('天马运动')
    await wrapper.get('input').setValue('ai')
    expect(wrapper.findAll('button')).toHaveLength(1)
    expect(wrapper.get('button').text()).toContain('AI大模型')
    wrapper.unmount()
  })

  it('shows no matches and restores all entries after clearing the query', async () => {
    const wrapper = mount(SystemPortalsView)
    await wrapper.get('input').setValue('__missing_system__')
    expect(wrapper.findAll('button')).toHaveLength(0)
    await wrapper.get('input').setValue('')
    expect(wrapper.findAll('button')).toHaveLength(11)
    wrapper.unmount()
  })

  it('keeps a whitespace-only query equivalent to the unfiltered directory', async () => {
    const wrapper = mount(SystemPortalsView)
    await wrapper.get('input').setValue('   ')
    expect(wrapper.findAll('button')).toHaveLength(11)
    wrapper.unmount()
  })
})

// Shared data vocabulary remains in use even though the old workbench UI is retired.
import { workbenchTodos } from '@/mock/workbench'
describe('SystemPortalsView', () => {
  it('stores task statuses and priorities with the product vocabulary', () => {
    expect(new Set(workbenchTodos.map((item) => item.status))).toEqual(new Set(['未完成', '已完成']))
    expect(new Set(workbenchTodos.map((item) => item.priority))).toEqual(new Set(['紧急', '较高', '普通', '较低']))
  })
})
