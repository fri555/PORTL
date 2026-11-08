import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import KnowledgeBaseView from '@/views/KnowledgeBaseView.vue'
import { useAppStore } from '@/stores/app'
import { mockUser } from '@/mock/user'

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 }); vi.restoreAllMocks() })
async function page(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  const pinia = createPinia(); setActivePinia(pinia); useAppStore().login({ ...mockUser, role: 'admin' })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/knowledge', component: KnowledgeBaseView }] })
  await router.push('/knowledge'); await router.isReady()
  const wrapper = mount(KnowledgeBaseView, { global: { plugins: [pinia, router], stubs: { Teleport: true, ElSelect: true, ElOption: true } } })
  wrappers.push(wrapper); await flushPromises(); return wrapper
}

describe('knowledge shell sidebar', () => {
  it('starts open on desktop and follows the shared header toggle without resetting content', async () => {
    const wrapper = await page(1280)
    expect(wrapper.get('[data-testid="knowledge-sidebar"]').classes()).toContain('knowledge-sidebar--open')
    window.dispatchEvent(new Event('tianma:toggle-sidebar')); await flushPromises()
    expect(wrapper.get('[data-testid="knowledge-sidebar"]').classes()).not.toContain('knowledge-sidebar--open')
    window.dispatchEvent(new Event('tianma:toggle-sidebar')); await flushPromises()
    expect(wrapper.get('[data-testid="knowledge-sidebar"]').classes()).toContain('knowledge-sidebar--open')
  })
  it('starts closed on mobile, opens from the shared event and closes from its backdrop', async () => {
    const wrapper = await page(700)
    expect(wrapper.get('[data-testid="knowledge-sidebar"]').classes()).not.toContain('knowledge-sidebar--open')
    window.dispatchEvent(new Event('tianma:toggle-sidebar')); await flushPromises()
    expect(wrapper.get('[data-testid="knowledge-sidebar"]').classes()).toContain('knowledge-sidebar--open')
    await wrapper.get('button[aria-label="关闭知识侧栏"]').trigger('click')
    expect(wrapper.get('[data-testid="knowledge-sidebar"]').classes()).not.toContain('knowledge-sidebar--open')
  })
})
