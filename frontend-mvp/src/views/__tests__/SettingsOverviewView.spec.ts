import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import SettingsPlaceholderView from '@/views/SettingsPlaceholderView.vue'
import { useAppStore } from '@/stores/app'

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))
async function page(path: string) {
  const pinia = createPinia(); setActivePinia(pinia); useAppStore().login({ id: 'u_001', displayName: '朝暮', department: '天马集团', role: 'admin', avatarUrl: '' })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/settings/:section', component: SettingsPlaceholderView }] })
  await router.push(path); await router.isReady()
  const wrapper = mount(SettingsPlaceholderView, { global: { plugins: [pinia, router] } }); wrappers.push(wrapper); await flushPromises(); return wrapper
}
describe('settings overview destinations', () => {
  it('renders a filterable operations overview instead of a blank route', async () => {
    const wrapper = await page('/settings/operations')
    expect(wrapper.get('table[aria-label="运营模块数据"]').findAll('tbody tr')).toHaveLength(4)
    await wrapper.get('input[aria-label="搜索运营模块"]').setValue('知识')
    expect(wrapper.get('table[aria-label="运营模块数据"]').findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.text()).toContain('知识中心')
  })
  it('filters monitored agents by status and name', async () => {
    const wrapper = await page('/settings/monitor')
    await wrapper.get('button[aria-label="仅看异常智能体"]').trigger('click')
    expect(wrapper.get('table[aria-label="智能体监控"]').findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.text()).toContain('视频内容助手')
    await wrapper.get('input[aria-label="搜索智能体"]').setValue('不存在')
    expect(wrapper.get('table[aria-label="智能体监控"]').findAll('tbody tr')).toHaveLength(0)
  })
})
