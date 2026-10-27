import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
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
const employee: MockUser = { ...admin, id: 'employee-1', role: 'user' }
let wrapper: VueWrapper
let csv: Blob | undefined
let filename = ''
async function page(path: string, user = admin) {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAppStore().login(user)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/settings/usage', component: SettingsInsightsView },
      { path: '/settings/audit', component: SettingsInsightsView },
    ],
  })
  await router.push(path)
  await router.isReady()
  wrapper = mount(SettingsInsightsView, {
    attachTo: document.body,
    global: { plugins: [pinia, router], stubs: { Teleport: true } },
  })
  await flushPromises()
  return router
}
async function csvText() {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsText(csv!)
  })
}
describe('settings insights existing behavior contract', () => {
  beforeEach(() => {
    localStorage.clear()
    csv = undefined
    filename = ''
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob: Blob) => {
        csv = blob
        return 'blob:contract'
      }),
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      filename = this.download
    })
  })
  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
  it('retains personal role branch, period selection and exact ledger export', async () => {
    await page('/settings/usage', employee)
    expect(wrapper.find('[data-testid="settings-admin-nav"]').exists()).toBe(false)
    expect(wrapper.get('table[aria-label="个人消耗明细"]').findAll('tbody tr')).toHaveLength(3)
    expect(wrapper.get('.personal-metrics').text()).toContain('¥0.00')
    await wrapper.get('[role="tablist"] [role="tab"]').trigger('click')
    expect(wrapper.get('input[aria-label="开始日期"]').element).toHaveProperty(
      'value',
      '2026-09-16',
    )
    expect(wrapper.get('[role="tab"]').attributes('aria-selected')).toBe('true')
    await wrapper.get('button[aria-label="导出个人消耗明细"]').trigger('click')
    expect(filename).toBe('个人消耗明细.csv')
    expect(await csvText()).toBe(
      [
        '时间,请求,模块,智能体,金额消耗',
        '2026-09-16 15:06:00,请生成本周经营复盘，列出核心指标和行动项,天马智擎 Web,数据分析师,5.82',
        '2026-09-16 11:40:00,提取今天会议中的待办并同步到钉钉,天马智擎 Web,待办提取,4.06',
        '2026-09-15 09:18:00,查询秋冬商品知识库并总结重点,钉钉工作台,小智问答,2.8',
      ].join('\n'),
    )
    expect(wrapper.get('[role="status"]').text()).toContain('已导出个人消耗明细')
  })
  it('updates the role branch when route switches to personal scope', async () => {
    const router = await page('/settings/usage')
    expect(wrapper.find('table.usage-flat').exists()).toBe(true)
    await router.push('/settings/usage?scope=personal')
    await flushPromises()
    expect(wrapper.find('table.usage-flat').exists()).toBe(false)
    expect(wrapper.find('table[aria-label="个人消耗明细"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="settings-admin-nav"]').exists()).toBe(false)
  })
  it('preserves immediate personnel search, query feedback, detail requests and reset', async () => {
    await page('/settings/usage')
    const count = wrapper.findAll('tr.person-row').length
    expect(count).toBeGreaterThan(1)
    await wrapper.get('input[aria-label="人员"]').setValue('张明')
    expect(wrapper.findAll('tr.person-row')).toHaveLength(1)
    expect(wrapper.get('tr.person-row').text()).toContain('张明（朝暮）')
    await wrapper.get('button[aria-label="查询用量"]').trigger('click')
    expect(wrapper.get('[role="status"]').text()).toContain('当前展示 1 人')
    await wrapper.get('tr.person-row').trigger('click')
    const detail = wrapper.get('[role="dialog"].person-detail-modal')
    expect(detail.text()).toContain('张明（朝暮）')
    expect(detail.text()).toContain('输入 Token')
    await wrapper.get('button[aria-label="关闭人员详情"]').trigger('click')
    await wrapper.get('button[aria-label="清空用量筛选"]').trigger('click')
    expect(wrapper.findAll('tr.person-row')).toHaveLength(count)
  })
  it('exports organization sessions with existing column order and format', async () => {
    await page('/settings/usage')
    await wrapper.get('button[aria-label="导出用量明细"]').trigger('click')
    expect(filename).toBe('用量管理-会话明细.csv')
    const lines = (await csvText()).split('\n')
    expect(lines[0]).toBe('部门/人员/模块/子功能/会话,模式,模型,Token,人民币,时间')
    expect(lines).toHaveLength(1)

    expect(wrapper.get('[role="status"]').text()).toContain('已导出当前筛选范围的会话明细')
  })
  it('applies audit search on query and preserves detail, empty and export behavior', async () => {
    await page('/settings/audit')
    const originalRows = wrapper.get('table[aria-label="日志列表"]').findAll('tbody tr').length
    expect(originalRows).toBeGreaterThan(1)
    await wrapper.get('input[aria-label="操作人员"]').setValue('张明')
    expect(wrapper.get('table[aria-label="日志列表"]').findAll('tbody tr')).toHaveLength(
      originalRows,
    )
    await wrapper.get('button[aria-label="应用审计筛选"]').trigger('click')
    const rows = wrapper.findAll('[data-testid^="audit-row-"]')
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(row.text()).toContain('张明（朝暮）')
    await rows[0]!.trigger('keydown.enter')
    expect(wrapper.get('[role="dialog"][aria-label="审计日志详情"]').text()).toContain(
      '张明（朝暮）',
    )
    await wrapper.get('button[aria-label="关闭日志详情"]').trigger('click')
    await wrapper.get('button[aria-label="导出当前筛选结果"]').trigger('click')
    expect(filename).toBe('日志管理.csv')
    const lines = (await csvText()).split('\n')
    expect(lines[0]).toBe('操作时间,操作人员,操作模块,操作对象,描述')
    for (const line of lines.slice(1)) expect(line).toContain('张明（朝暮）')
    await wrapper.get('input[aria-label="操作对象"]').setValue('__missing__')
    await wrapper.get('button[aria-label="应用审计筛选"]').trigger('click')
    expect(wrapper.get('table[aria-label="日志列表"]').text()).toContain('当前条件下暂无日志')
    await wrapper.get('button[aria-label="清空审计筛选"]').trigger('click')
    expect(wrapper.findAll('[data-testid^="audit-row-"]')).toHaveLength(originalRows)
  })
})
