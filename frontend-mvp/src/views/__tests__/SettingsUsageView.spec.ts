import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import SettingsUsageView from '@/views/SettingsUsageView.vue'
import { useAppStore } from '@/stores/app'
import type { MockUser } from '@/types/user'

const admin: MockUser = { id: 'u_001', displayName: '朝暮', department: '天马集团', role: 'admin', avatarUrl: '' }
const manager: MockUser = { id: 'manager-zhang', displayName: '张婷', department: '数字技术中心', role: 'user', avatarUrl: '' }
const wrappers: ReturnType<typeof mount>[] = []
beforeEach(() => localStorage.clear())
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))

async function page(user = admin) {
  const pinia = createPinia(); setActivePinia(pinia); useAppStore().login(user)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/settings/:section', component: SettingsUsageView }] })
  await router.push('/settings/usage'); await router.isReady()
  const wrapper = mount(SettingsUsageView, { global: { plugins: [pinia, router], stubs: { Teleport: true } } })
  wrappers.push(wrapper); await flushPromises(); return wrapper
}

describe('production quota management page', () => {
  it('renders the online quota table and opens the administrator list from permission settings', async () => {
    const wrapper = await page()
    expect(wrapper.get('h1').text()).toBe('用量额度')
    expect(wrapper.findAll('table[aria-label="用量额度"] thead th').map(cell => cell.text())).toEqual(['姓名', '额度', '消耗', '使用率', '更新时间', '操作'])
    await wrapper.get('button[aria-label="权限设置"]').trigger('click')
    const dialog = wrapper.get('[role="dialog"][aria-label="权限设置"]')
    expect(dialog.text()).toContain('张婷（AIBP）')
    expect(dialog.text()).toContain('设置范围')
    expect(dialog.text()).toContain('添加成员')
  })

  it('limits a quota administrator to authorized members and hides system-wide controls', async () => {
    const wrapper = await page(manager)
    expect(wrapper.findAll('table[aria-label="用量额度"] tbody tr[data-member-id]')).toHaveLength(5)
    expect(wrapper.text()).toContain('赵伟朝（朝暮）')
    expect(wrapper.text()).not.toContain('王蕾（白露）')
    expect(wrapper.find('button[aria-label="权限设置"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="全局额度"]').exists()).toBe(false)
    expect(wrapper.get('nav[aria-label="设置导航"]').findAll('a')).toHaveLength(1)
  })

  it('supports explicit search and changes an authorized member quota through the row menu', async () => {
    const wrapper = await page(manager)
    await wrapper.get('input[aria-label="搜索本名或花名"]').setValue('朝暮')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.findAll('tr[data-member-id]')).toHaveLength(1)
    await wrapper.get('button[aria-label="赵伟朝（朝暮）操作菜单"]').trigger('click')
    await wrapper.get('[role="menuitem"][data-action="set-quota"]').trigger('click')
    await wrapper.get('input[aria-label="个人额度"]').setValue('500')
    await wrapper.get('[role="dialog"][aria-label="额度设置"] form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('tr[data-member-id="user-chaomu"]').text()).toContain('¥500.00')
  })
})
