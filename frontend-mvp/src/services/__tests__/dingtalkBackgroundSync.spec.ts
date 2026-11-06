import { describe, expect, it } from 'vitest'
import type { DingTalkDocumentMapping, DingTalkImportTask, SourceKnowledgeNode } from '@/types/knowledge-source'
import { checkDingTalkDocumentUpdate, describeDingTalkSyncTask } from '../dingtalkBackgroundSync'

const file: SourceKnowledgeNode = { id: 'file-1', name: '制度.docx', kind: 'file', owner: '朝暮', updatedAt: '2026-10-20 09:00', sourceDocumentId: 'source-1', content: '成功内容',
  permission: { owner: '朝暮', members: ['向阳'], roles: { 向阳: 'READER' }, inheritParent: false, revision: 4 } }
const mapping: DingTalkDocumentMapping = { sourceDocumentId: 'source-1', sourceName: '制度', localFileId: 'file-1', status: '成功', sourceModifiedAt: 'v1', lastSuccessfulModifiedAt: 'v1', lastSuccessfulContentHash: 'hash-1' }
const agents = [{ id: 'agent-a', documentIds: ['file-1', 'file-1'] }, { id: 'agent-b', documentIds: ['file-1'] }, { id: 'other', documentIds: ['another-file'] }]
async function sync(options: { modifiedAt?: string; hash?: string; agents?: typeof agents; exportError?: boolean; refreshError?: boolean } = {}) {
  const operations: string[] = []
  const result = await checkDingTalkDocumentUpdate({ mapping, file, agents: options.agents ?? agents, checkedAt: '2026-11-05 10:00' }, {
    async readMetadata(id: string) { expect(id).toBe('source-1'); operations.push('metadata'); return { modifiedAt: options.modifiedAt ?? 'v2' } },
    async exportContent(id: string) { expect(id).toBe('source-1'); operations.push('export'); if (options.exportError) throw new Error('源文档下载权限已失效'); return { content: '更新内容', contentHash: options.hash ?? 'hash-2' } },
    async refreshReferences(input: { localFileId: string; agentIds: string[]; contentHash: string }) {
      operations.push('refresh'); expect(input).toEqual({ localFileId: 'file-1', agentIds: ['agent-a', 'agent-b'], contentHash: 'hash-2' })
      if (options.refreshError) throw new Error('索引刷新失败')
    },
  })
  return { result, operations }
}
describe('DingTalk background document check contract', () => {
  it('reconciles the current reference set without rewriting the stored task result', () => {
    const task: DingTalkImportTask = { importTaskId: 'task-1', platformUserId: 'u-1', userAlias: '朝暮', destinationId: 'kb-1', destinationPath: '知识库', latestSyncAt: '2026-11-05 10:00', status: '同步成功', syncMode: 'backend-managed', referenceRefreshResult: '无引用', referencedAgentIds: [], documentMappings: [mapping] }
    const attached = describeDingTalkSyncTask(task, agents, () => true)
    expect(attached).toMatchObject({ referencedAgentIds: ['agent-a', 'agent-b'], referenceRefreshResult: '待后台接入' })
    expect(task).toMatchObject({ referencedAgentIds: [], referenceRefreshResult: '无引用' })
    expect(describeDingTalkSyncTask({ ...attached, referenceRefreshResult: '已刷新' }, [], () => true)).toMatchObject({ referencedAgentIds: [], referenceRefreshResult: '无引用' })
  })
  it('checks modifiedAt first and keeps content when the source has not changed', async () => {
    const { result, operations } = await sync({ modifiedAt: 'v1' })
    expect(operations).toEqual(['metadata'])
    expect(result.file.content).toBe('成功内容')
    expect(result.mapping.contentResult).toBe('未变化')
    expect(result.mapping.referenceRefreshResult).toBe('未变化')
  })
  it('checks the exported content hash before updating files or refreshing agents', async () => {
    const { result, operations } = await sync({ hash: 'hash-1' })
    expect(operations).toEqual(['metadata', 'export'])
    expect(result.file.updatedAt).toBe('2026-10-20 09:00')
    expect(result.mapping).toMatchObject({ lastSuccessfulModifiedAt: 'v2', lastSuccessfulContentHash: 'hash-1', contentResult: '未变化' })
  })
  it('preserves file identity and platform permissions while refreshing every referencing agent once', async () => {
    const { result, operations } = await sync()
    expect(operations).toEqual(['metadata', 'export', 'refresh'])
    expect(result.file).toMatchObject({ id: 'file-1', content: '更新内容', permission: { owner: '朝暮', roles: { 向阳: 'READER' }, revision: 4 } })
    expect(result.mapping).toMatchObject({ localFileId: 'file-1', referencedAgentIds: ['agent-a', 'agent-b'], referenceRefreshResult: '已刷新', permissionResult: '后续不更新', lastSuccessfulContentHash: 'hash-2', lastSuccessfulModifiedAt: 'v2' })
    expect(file.content).toBe('成功内容')
    expect(mapping.lastSuccessfulModifiedAt).toBe('v1')
  })
  it('updates an unreferenced document without fabricating agent refreshes', async () => {
    const { result, operations } = await sync({ agents: [] })
    expect(operations).toEqual(['metadata', 'export'])
    expect(result.file.content).toBe('更新内容')
    expect(result.mapping).toMatchObject({ status: '成功', referencedAgentIds: [], referenceRefreshResult: '无引用' })
  })
  it('retains the last successful file and platform permissions when export fails', async () => {
    const { result, operations } = await sync({ exportError: true })
    expect(operations).toEqual(['metadata', 'export'])
    expect(result.file).toEqual(file)
    expect(result.mapping).toMatchObject({ status: '失败', failureReason: '源文档下载权限已失效', lastSuccessfulModifiedAt: 'v1', lastSuccessfulContentHash: 'hash-1', permissionResult: '后续不更新' })
  })
  it('does not publish a new content version when reference indexing fails', async () => {
    const { result } = await sync({ refreshError: true })
    expect(result.file).toEqual(file)
    expect(result.mapping).toMatchObject({ status: '失败', referenceRefreshResult: '刷新失败', failureReason: '索引刷新失败', lastSuccessfulContentHash: 'hash-1' })
  })
})
