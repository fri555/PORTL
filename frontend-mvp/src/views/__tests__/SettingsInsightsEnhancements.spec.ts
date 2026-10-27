import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import SettingsInsightsView from '@/views/SettingsInsightsView.vue'
import { useAppStore } from '@/stores/app'
import type { MockUser } from '@/types/user'

const admin: MockUser = {
  id: 'admin-1',
  displayName: '朝暮',
  department: '天马集团',
  role: 'admin',
  avatarUrl: '',
}

async function mountPage(path: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAppStore().login(admin)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/settings/usage', component: SettingsInsightsView },
      { path: '/settings/audit', component: SettingsInsightsView },
      { path: '/settings/agents', component: { template: '<div>智能体管理</div>' } },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(SettingsInsightsView, {
    attachTo: document.body,
    global: { plugins: [pinia, router], stubs: { Teleport: true } },
  })
  await flushPromises()
  return wrapper
}

function visibleNumbers(wrapper: Awaited<ReturnType<typeof mountPage>>, selector: string) {
  return wrapper.findAll('table.usage-flat tbody tr.person-row').map((row) => {
    const text = row.get(selector).text().replace(/[^\d.-]/g, '')
    return Number(text)
  })
}

describe('usage detail and quota list refinements', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
  })

  it('opens personal usage details as a compact label-value list', async () => {
    const wrapper = await mountPage('/settings/usage?scope=personal')

    await wrapper.get('table[aria-label="个人消耗明细"] tbody tr').trigger('click')

    const dialog = wrapper.get('[role="dialog"][aria-label="个人用量详情"]')
    expect(dialog.get('header strong').text()).toBe('用量详情')
    expect(dialog.findAll('.usage-detail-row')).toHaveLength(7)
    expect(dialog.findAll('.usage-detail-row dt').map((item) => item.text())).toEqual([
      '请求',
      '会话',
      '模型',
      '输入 / 输出 / 缓存 Token',
      '金额消耗',
      '数据状态',
      '请求时间',
    ])
  })

  it('sorts quota rows by usage rate descending by default and toggles sortable columns', async () => {
    const wrapper = await mountPage('/settings/usage')

    for (const label of ['额度', '消耗', '使用率', '更新时间']) {
      expect(wrapper.find(`button[aria-label="按${label}排序"]`).exists()).toBe(true)
    }

    const defaultRates = visibleNumbers(wrapper, '.quota-rate')
    expect(defaultRates).toEqual([...defaultRates].sort((a, b) => b - a))

    await wrapper.get('button[aria-label="按额度排序"]').trigger('click')
    const descendingQuota = visibleNumbers(wrapper, 'td:nth-child(2) > span')
    expect(descendingQuota).toEqual([...descendingQuota].sort((a, b) => b - a))

    await wrapper.get('button[aria-label="按额度排序"]').trigger('click')
    const ascendingQuota = visibleNumbers(wrapper, 'td:nth-child(2) > span')
    expect(ascendingQuota).toEqual([...ascendingQuota].sort((a, b) => a - b))
  })
})
