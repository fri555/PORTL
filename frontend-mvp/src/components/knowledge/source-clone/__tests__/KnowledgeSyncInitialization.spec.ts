import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import KnowledgeAccessPanel from '../KnowledgeAccessPanel.vue'
import type { DingTalkDocumentMapping, DingTalkImportTask } from '@/types/knowledge-source'

async function openDetails(mappings: DingTalkDocumentMapping[]) {
  const record: DingTalkImportTask = { importTaskId: 'import-1', recordId: 'run-1', platformUserId: 'u_001', userAlias: '朝暮', destinationId: 'kb', destinationPath: '制度库', frequency: '每天', schedule: '00:00', latestSyncAt: '2026-10-20 00:00', status: '部分失败', documentMappings: mappings }
  const wrapper = mount(KnowledgeAccessPanel, { props: { destinations: [], records: [record], canManage: true }, global: { stubs: { Teleport: true, ElDialog: { template: '<div><slot/><slot name="footer"/></div>' }, ElSelect: { template: '<div><slot/></div>' }, ElOption: true } } })
  await wrapper.findAll('.records-tabs button').find(button => button.text() === '记录')!.trigger('click')
  await wrapper.get('[aria-label="查看同步记录run-1"]').trigger('click')
  return wrapper
}

describe('DingTalk per-document sync details', () => {
  it('lists every document with one sync status and a separate failure reason', async () => {
    const wrapper = await openDetails([
      { sourceDocumentId: 'first', sourceName: '人事 / 员工手册', localFileId: 'file-1', status: '成功', sourceModifiedAt: '2026-10-20 09:00', contentResult: '已更新', permissionResult: '首次初始化', permissionMemberCount: 12 },
      { sourceDocumentId: 'next', sourceName: '行政 / 费用制度', localFileId: 'file-2', status: '成功', sourceModifiedAt: '2026-10-19 18:00', contentResult: '未变化', permissionResult: '后续不更新' },
      { sourceDocumentId: 'failed-first', sourceName: '技术 / 新文档', localFileId: '', status: '失败', failureReason: '人员映射失败', permissionResult: '失败' },
      { sourceDocumentId: 'failed-update', sourceName: '商品 / 原有文档', localFileId: 'file-4', status: '失败', failureReason: '源文档下载权限已失效', permissionResult: '后续不更新' },
    ])
    try {
      const detail = wrapper.get('[data-testid="dingtalk-sync-detail"]')
      expect(detail.findAll('th').map(cell => cell.text())).toEqual(['来源文档', '源更新时间', '同步状态', '失败原因'])
      const rows = detail.findAll('tbody tr').map(row => row.findAll('td').map(cell => cell.text()))
      expect(rows).toEqual([
        ['人事 / 员工手册', '2026-10-20 09:00', '成功', '—'],
        ['行政 / 费用制度', '2026-10-19 18:00', '跳过', '—'],
        ['技术 / 新文档', '—', '失败', '人员映射失败；本次未导入'],
        ['商品 / 原有文档', '—', '失败', '源文档下载权限已失效；保留最近成功版本'],
      ])
      expect(detail.find('thead').text()).not.toContain('内容结果')
      expect(detail.find('thead').text()).not.toContain('权限处理')
      expect(detail.find('thead').text()).not.toContain('初始化授权数')
      expect(detail.find('tbody').text()).not.toContain('后续不更新')
    } finally { wrapper.unmount() }
  })
  it('provides a clear fallback when a failed document has no returned reason', async () => {
    const wrapper = await openDetails([{ sourceDocumentId: 'failed', sourceName: '无具体原因的文档', localFileId: '', status: '失败', failureReason: '  ' }])
    try {
      expect(wrapper.get('[data-testid="dingtalk-sync-detail"] tbody tr').findAll('td').at(-1)!.text()).toBe('未返回具体失败原因；本次未导入')
    } finally { wrapper.unmount() }
  })
  it('shows a dash for successful documents even if the source record retains an old failure reason', async () => {
    const wrapper = await openDetails([{ sourceDocumentId: 'success', sourceName: '重试成功文档', localFileId: 'file', status: '成功', contentResult: '已更新', failureReason: '上次同步失败' }])
    try {
      expect(wrapper.get('[data-testid="dingtalk-sync-detail"] tbody tr').findAll('td').at(-1)!.text()).toBe('—')
      expect(wrapper.get('[data-testid="dingtalk-sync-detail"] tbody tr').text()).not.toContain('上次同步失败')
    } finally { wrapper.unmount() }
  })
})
