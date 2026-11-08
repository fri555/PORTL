import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import SettingsSidebar from '@/components/settings/SettingsSidebar.vue'
import SystemPortalsView from '@/views/SystemPortalsView.vue'
import { useAppStore } from '@/stores/app'

const wrappers: ReturnType<typeof mount>[] = []
const originalWidth = window.innerWidth
function resize(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  window.dispatchEvent(new Event('resize'))
}
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  resize(originalWidth)
})

async function render(module: 'settings' | 'portals', width: number) {
  resize(width)
  localStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  useAppStore().login({ id: 'u_001', displayName: '朝暮', department: '天马集团', role: 'admin', avatarUrl: '' })
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/settings/:section', component: { template: '<div />' } },
    { path: '/portals', component: { template: '<div />' } },
    { path: '/:pathMatch(.*)*', component: { template: '<div />' } },
  ] })
  await router.push(module === 'settings' ? '/settings/agents' : '/portals')
  const wrapper = mount(defineComponent({
    components: { AppHeader, SettingsSidebar, SystemPortalsView },
    template: module === 'settings' ? '<AppHeader/><SettingsSidebar user-id="u_001"/>' : '<AppHeader/><SystemPortalsView/>',
  }), { global: { plugins: [pinia, router] }, attachTo: document.body })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

describe.each(['settings', 'portals'] as const)('%s module sidebar', module => {
  const nav = module === 'settings' ? 'nav[aria-label="设置导航"]' : 'nav[aria-label="工作台"]'

  it('collapses and reopens from the real header action on desktop', async () => {
    const { wrapper } = await render(module, 1280)
    expect(wrapper.find(nav).exists()).toBe(true)
    await wrapper.get('button[aria-label="展开或收起侧边栏"]').trigger('click')
    expect(wrapper.find(nav).exists()).toBe(false)
    await wrapper.get('button[aria-label="展开或收起侧边栏"]').trigger('click')
    expect(wrapper.find(nav).exists()).toBe(true)
  })

  it('starts unobstructed on mobile and closes on backdrop, Escape, and navigation', async () => {
    const { wrapper, router } = await render(module, 390)
    expect(wrapper.find(nav).exists()).toBe(false)
    expect(wrapper.find('button[aria-label="关闭侧边栏"]').exists()).toBe(false)
    const toggle = wrapper.get('button[aria-label="展开或收起侧边栏"]')
    await toggle.trigger('click')
    expect(wrapper.find(nav).exists()).toBe(true)
    await wrapper.get('button[aria-label="关闭侧边栏"]').trigger('click')
    expect(wrapper.find(nav).exists()).toBe(false)
    await toggle.trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.find(nav).exists()).toBe(false)
    await toggle.trigger('click')
    if (module === 'settings') await wrapper.get(`${nav} a[href="/settings/usage"]`).trigger('click')
    else await wrapper.findAll(`${nav} button`).find(button => button.text() === '待办管理')!.trigger('click')
    await flushPromises()
    expect(wrapper.find(nav).exists()).toBe(false)
    await toggle.trigger('click')
    await router.push('/settings/models')
    await flushPromises()
    expect(wrapper.find(nav).exists()).toBe(false)
  })

  it('resets to closed when the viewport becomes mobile', async () => {
    const { wrapper } = await render(module, 1280)
    resize(390)
    await nextTick()
    expect(wrapper.find(nav).exists()).toBe(false)
    resize(1280)
    await nextTick()
    expect(wrapper.find(nav).exists()).toBe(true)
  })
})
