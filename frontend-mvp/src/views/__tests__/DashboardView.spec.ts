import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import DashboardView from '@/views/DashboardView.vue'
import { useAppStore } from '@/stores/app'

describe('DashboardView', () => {
  it('shows the Guandata menu and enforces administrator permission', () => {
    localStorage.clear()
    const pinia = createPinia()
    setActivePinia(pinia)
    useAppStore().login({ id: 'admin-1', displayName: '朝暮', department: '平台部', role: 'admin', avatarUrl: '' })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }, { path: '/dashboards', component: DashboardView }],
    })
    const wrapper = mount(DashboardView, { global: { plugins: [pinia, router] } })
    expect(wrapper.text()).toContain('观远运营看板')
    expect(wrapper.text()).toContain('权限设置')
    expect(wrapper.text()).toContain('观远 BI 内嵌区域')
    expect(wrapper.text()).toContain('次日重算')
  })
})
