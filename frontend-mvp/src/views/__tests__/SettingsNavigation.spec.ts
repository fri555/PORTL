import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import SettingsManagementView from '@/views/SettingsManagementView.vue'
import SettingsInsightsView from '@/views/SettingsInsightsView.vue'
import { useAppStore } from '@/stores/app'

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))

describe('settings navigation reachability', () => {
  it('keeps the production settings sidebar visible on agent management and reaches usage quota', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useAppStore().login({ id: 'u_001', displayName: '朝暮', department: '天马集团', role: 'admin', avatarUrl: '' })
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/settings/agents', component: SettingsManagementView },
      { path: '/settings/usage', component: { template: '<div>用量额度页面</div>' } },
      { path: '/settings/:section', component: { template: '<div />' } },
    ] })
    await router.push('/settings/agents')
    await router.isReady()
    const wrapper = mount(SettingsManagementView, { global: { plugins: [pinia, router] } })
    wrappers.push(wrapper)
    await flushPromises()

    const navigation = wrapper.get('nav[aria-label="设置导航"]')
    expect(navigation.findAll('a').map(link => link.text())).toEqual(['智能体管理', '模型管理', '技能', '连接器', '日志管理', '用量额度', '运营看板', '智能体监控'])
    await navigation.findAll('a').find(link => link.text() === '用量额度')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/settings/usage')
  })

  it('keeps the shared settings sidebar on audit and responds to the header toggle', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useAppStore().login({ id: 'u_001', displayName: '朝暮', department: '天马集团', role: 'user', avatarUrl: '' })
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/settings/audit', component: SettingsInsightsView },
      { path: '/settings/:section', component: { template: '<div />' } },
    ] })
    await router.push('/settings/audit'); await router.isReady()
    const wrapper = mount(SettingsInsightsView, { global: { plugins: [pinia, router] } })
    wrappers.push(wrapper); await flushPromises()
    expect(wrapper.get('nav[aria-label="设置导航"]').findAll('a')).toHaveLength(8)
    window.dispatchEvent(new Event('tianma:toggle-sidebar')); await flushPromises()
    expect(wrapper.find('nav[aria-label="设置导航"]').exists()).toBe(false)
    window.dispatchEvent(new Event('tianma:toggle-sidebar')); await flushPromises()
    expect(wrapper.get('nav[aria-label="设置导航"]').text()).toContain('用量额度')
  })
})
