import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'

function mountDashboard() {
  const testRouter = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/workspace/chat', name: 'workspace-chat', component: { template: '<div>工作会话</div>' } },
      { path: '/dashboards', name: 'dashboards', component: DashboardView },
    ],
  })

  return mount(DashboardView, { global: { plugins: [testRouter] } })
}

describe('DashboardView', () => {
  it('renders dashboard content without linking to removed routes', () => {
    const wrapper = mountDashboard()

    expect(wrapper.text()).toContain('经营总览')
    expect(wrapper.text()).toContain('AI生成看板')
    expect(wrapper.text()).toContain('组织口径：管理层')
    expect(wrapper.text()).toContain('管理层重点指标')
    expect(wrapper.text()).toContain('集团 GMV')
    expect(wrapper.text()).toContain('库存周转')
    expect(wrapper.find('[data-testid="dashboard-metric-wall"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('chat-bi')
    expect(wrapper.find('[data-testid="org-scope-sidebar"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="org-scope-sidebar"]').classes()).toContain('w-0')
  })

  it('changes metric cards when selecting an organization node', async () => {
    const wrapper = mountDashboard()

    expect(wrapper.text()).toContain('集团 GMV')
    await wrapper.get('[data-testid="org-scope-open"]').trigger('click')
    await wrapper.get('[data-testid="org-scope-node-live"]').trigger('click')

    expect(wrapper.text()).toContain('直播部重点指标')
    expect(wrapper.text()).toContain('C端线上 GMV')
    expect(wrapper.text()).toContain('直播转化率')
    expect(wrapper.text()).not.toContain('集团 GMV')
  })
})
