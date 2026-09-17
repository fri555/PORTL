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
const employee: MockUser = {
  id: 'user-1',
  displayName: '清晖',
  department: '商品部',
  role: 'user',
  avatarUrl: '',
}

async function mountPage(path: string, user: MockUser) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAppStore().login(user)
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

describe('SettingsInsightsView', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
  })

  it('shows personal cost and quota without administrator navigation', async () => {
    const wrapper = await mountPage('/settings/usage', employee)

    expect(wrapper.text()).toContain('个人消耗明细')
    expect(wrapper.text()).toContain('¥12.68')
    expect(wrapper.text()).not.toContain('金币')
    expect(wrapper.text()).toContain('系统额度')
    expect(wrapper.text()).toContain('来源：全局默认')
    expect(wrapper.text()).toContain('数据更新')
    expect(wrapper.text()).toContain('次日重算')
    expect(wrapper.find('[data-testid="settings-admin-nav"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="调整额度"]').exists()).toBe(false)
  })

  it('shows a personal consumption ledger with quick periods and export', async () => {
    const wrapper = await mountPage('/settings/usage?scope=personal', admin)

    expect(wrapper.text()).toContain('个人消耗明细')
    expect(wrapper.get('[role="tablist"][aria-label="个人明细时间范围"]').text()).toContain('今天')
    expect(wrapper.get('[role="tablist"][aria-label="个人明细时间范围"]').text()).toContain('7 天')
    expect(wrapper.get('[role="tablist"][aria-label="个人明细时间范围"]').text()).toContain('30 天')
    expect(wrapper.get('table[aria-label="个人消耗明细"]').text()).toContain('请求')
    expect(wrapper.get('table[aria-label="个人消耗明细"]').text()).toContain('Token 消耗')
    expect(wrapper.get('table[aria-label="个人消耗明细"]').text()).toContain('金额消耗')
    expect(wrapper.get('table[aria-label="个人消耗明细"]').text()).not.toContain('金币')
    expect(wrapper.get('table[aria-label="个人消耗明细"]').text()).toContain('智能体')
    expect(wrapper.get('table[aria-label="个人消耗明细"]').text()).toContain('使用端')
    expect(wrapper.get('button[aria-label="导出个人消耗明细"]').element).toBeTruthy()
  })

  it('combines usage and quota into one filter-driven tree table', async () => {
    const wrapper = await mountPage('/settings/usage', admin)
    expect(wrapper.find('[role="tablist"][aria-label="用量管理视图"]').exists()).toBe(false)
    expect(wrapper.get('select[aria-label="周期"]').text()).toContain('今日')
    expect(wrapper.get('input[aria-label="开始日期"]').element).toBeTruthy()
    expect(wrapper.get('input[aria-label="结束日期"]').element).toBeTruthy()
    expect(wrapper.get('input[aria-label="人员筛选"]').element).toBeTruthy()
    expect(wrapper.get('select[aria-label="模块"]').element).toBeTruthy()
    expect(wrapper.get('select[aria-label="智能体"]').element).toBeTruthy()
    expect(wrapper.get('button[aria-label="查询用量"]').element).toBeTruthy()
    expect(wrapper.get('button[aria-label="清空用量筛选"]').element).toBeTruthy()
    expect(wrapper.text()).toContain('系统额度')
    expect(wrapper.text()).not.toContain('调用次数')
    const table = wrapper.get('table.usage-tree')
    for (const heading of ['分类', '系统额度', '使用率', '金额消耗', '操作']) expect(table.text()).toContain(heading)
    expect(wrapper.get('button[aria-label="配置全局默认额度"]').element).toBeTruthy()
  })

  it('applies filters on query and keeps metric cards synchronized', async () => {
    const wrapper = await mountPage('/settings/usage', admin)
    const before = wrapper.get('.metric-grid').text()
    await wrapper.get('input[aria-label="人员筛选"]').setValue('李清（清晖）')
    await wrapper.get('button[aria-label="查询用量"]').trigger('click')
    expect(wrapper.find('[data-testid="usage-row-dept-online"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="usage-row-dept-product"]').exists()).toBe(false)
    expect(wrapper.get('.metric-grid').text()).not.toBe(before)
    await wrapper.get('button[aria-label="清空用量筛选"]').trigger('click')
    expect(wrapper.find('[data-testid="usage-row-dept-product"]').exists()).toBe(true)
  })

  it('drills directly from person to requests titled with conversation and time', async () => {
    const wrapper = await mountPage('/settings/usage', admin)

    await wrapper.get('button[aria-label="展开商品部"]').trigger('click')
    expect(wrapper.get('[data-testid="usage-row-user-chaomu"]').text()).toContain('张明（朝暮）')
    await wrapper.get('button[aria-label="展开张明（朝暮）"]').trigger('click')
    const request = wrapper.get('[data-testid="usage-row-session-assortment-0916"]')
    expect(request.text()).toContain('秋冬团购组货方案')
    expect(request.text()).toContain('2026-09-16')
    expect(wrapper.find('[data-testid="usage-row-module-agent"]').exists()).toBe(false)
  })

  it('sets quota only for a person and displays one low-quota warning', async () => {
    const wrapper = await mountPage('/settings/usage', admin)
    expect(wrapper.get('[role="alert"]').text()).toContain('额度即将用尽')
    expect(wrapper.get('[role="alert"]').text()).toContain('仅剩 6%')
    await wrapper.get('button[aria-label="展开商品部"]').trigger('click')
    const person = wrapper.get('[data-testid="usage-row-user-chaomu"]')
    await person.findAll('button').find((b) => b.text() === '设置额度')!.trigger('click')
    expect(wrapper.get('[role="dialog"]').text()).toContain('张明（朝暮）')
    expect(wrapper.get('select[aria-label="额度周期"]').text()).toContain('每日')
    expect(wrapper.get('[role="dialog"]').text()).toContain('删除个人额度')
  })

  it('opens usage detail in a centered modal with token breakdown', async () => {
    const wrapper = await mountPage('/settings/usage', admin)

    await wrapper.get('button[aria-label="展开商品部"]').trigger('click')
    await wrapper.get('button[aria-label="展开张明（朝暮）"]').trigger('click')
    await wrapper.get('[data-testid="usage-row-session-assortment-0916"] .row-actions button').trigger('click')
    const dialog = wrapper.get('[role="dialog"][aria-label="用量明细详情"]')
    expect(dialog.classes()).toContain('usage-detail-modal')
    expect(dialog.text()).toContain('输入 Token')
    expect(dialog.text()).toContain('输出 Token')
    expect(dialog.text()).toContain('缓存命中 Token')
  })

  it('exports the currently filtered usage rows', async () => {
    const wrapper = await mountPage('/settings/usage', admin)

    await wrapper.get('button[aria-label="导出用量明细"]').trigger('click')

    expect(wrapper.text()).toContain('已导出当前筛选范围的会话明细')
  })

  it('uses one audit page with the agreed filters, schema and centered detail modal', async () => {
    const wrapper = await mountPage('/settings/audit', admin)

    expect(wrapper.find('[role="tablist"][aria-label="日志类型"]').exists()).toBe(false)
    expect(wrapper.get('input[aria-label="操作人员"]').element).toBeTruthy()
    expect(wrapper.get('input[aria-label="开始时间"]').element).toBeTruthy()
    expect(wrapper.get('select[aria-label="日志模块"]').element).toBeTruthy()
    expect(wrapper.find('input[aria-label="对象名称或 Trace ID"]').exists()).toBe(false)
    expect(wrapper.get('select[aria-label="来源"]').element).toBeTruthy()
    expect(wrapper.get('select[aria-label="对象类型"]').element).toBeTruthy()
    expect(wrapper.get('button[aria-label="导出当前筛选结果"]').element).toBeTruthy()
    const table = wrapper.get('table[aria-label="日志列表"]')
    for (const heading of ['操作时间','人员','模块','操作类型','操作对象','修改前','修改后','描述']) expect(table.text()).toContain(heading)
    expect(table.findAll('th').map((cell) => cell.text())).toEqual(['操作时间','人员','模块','操作类型','操作对象','修改前','修改后','描述'])
    expect(table.text()).not.toContain('操作对象 ID')
    await wrapper.get('[data-testid="audit-row-audit-001"]').trigger('click')
    const dialog = wrapper.get('[role="dialog"][aria-label="审计日志详情"]')
    expect(dialog.classes()).toContain('audit-detail-modal')
    expect(dialog.text()).toContain('agent_top_001')
    expect(dialog.text()).not.toContain('结果成功')
    expect(wrapper.get('button[aria-label="清空审计筛选"]').element).toBeTruthy()
  })
})
