import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'

describe('DashboardView', () => {
  it('matches the signed-in production permission state', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }, { path: '/dashboards', component: DashboardView }],
    })
    const wrapper = mount(DashboardView, { global: { plugins: [router] } })
    expect(wrapper.text()).toContain('无访问权限')
    expect(wrapper.text()).toContain('当前账号无权打开该页面')
    expect(wrapper.text()).toContain('/dashboards')
    expect(wrapper.text()).toContain('刷新权限并重试')
    expect(wrapper.text()).toContain('返回可用页面')
  })
})
