import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import { useAppStore } from '@/stores/app'
import type { MockUser } from '@/types/user'

const routes = [
  '/chat', '/video-gen/capability-square', '/automation', '/portals', '/dashboards', '/knowledge', '/settings/usage', '/settings/agents',
].map(path => ({ path, component: { template: '<div />' } }))

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))

async function mountHeader(path: string, user: MockUser) {
  localStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  useAppStore().login(user)
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(AppHeader, { global: { plugins: [pinia, router] }, attachTo: document.body })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

function navigationLabels(wrapper: ReturnType<typeof mount>) {
  return wrapper.get('nav[aria-label="主导航"]').findAll('.nav-label').map(label => label.text().trim())
}

describe('AppHeader production navigation', () => {
  const systemAdmin: MockUser = { id: 'u_001', displayName: '朝暮', department: '天马集团', role: 'admin', avatarUrl: '' }
  const quotaAdmin: MockUser = { id: 'manager-zhang', displayName: '张婷', department: '数字技术中心', role: 'editor', avatarUrl: '' }

  it('keeps one navigation structure and production labels across modules', async () => {
    const expected = ['天马智擎', '内容中心', '自动化', '工作台', '数据中心', '知识中心', '设置']
    expect(navigationLabels(await mountHeader('/chat', systemAdmin))).toEqual(expected)
    expect(navigationLabels(await mountHeader('/video-gen/capability-square', systemAdmin))).toEqual(expected)
    expect(navigationLabels(await mountHeader('/settings/usage', systemAdmin))).toEqual(expected)
  })

  it('shows settings to a configured quota administrator even without the system-admin role', async () => {
    expect(navigationLabels(await mountHeader('/chat', quotaAdmin))).toContain('设置')
  })
})
