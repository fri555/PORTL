import type { DingTalkDocumentMapping, DingTalkImportTask, SourceKnowledgeNode } from '@/types/knowledge-source'

export interface DingTalkAgentReference { id: string; documentIds: readonly string[] }
export interface DingTalkSyncGateway {
  readMetadata(sourceDocumentId: string): Promise<{ modifiedAt: string }>
  exportContent(sourceDocumentId: string): Promise<{ content: string; contentHash: string }>
  /** The backend adapter must stage all reference indexes before publishing the version. */
  refreshReferences(input: { localFileId: string; agentIds: string[]; contentHash: string }): Promise<void>
}

/** Read model only. Neither loading this module nor opening a page starts a scheduler. */
export function describeDingTalkSyncTask(
  task: DingTalkImportTask,
  agents: readonly DingTalkAgentReference[],
  hasLiveFile: (mapping: DingTalkDocumentMapping) => boolean,
): DingTalkImportTask {
  const localIds = new Set(task.documentMappings.filter(hasLiveFile).map(mapping => mapping.localFileId))
  const referencedAgentIds = [...new Set(agents.filter(agent => agent.documentIds.some(id => localIds.has(id))).map(agent => agent.id))]
  const previousAgentIds = task.referencedAgentIds ?? []
  const sameReferences = previousAgentIds.length === referencedAgentIds.length && previousAgentIds.every(id => referencedAgentIds.includes(id))
  const referenceRefreshResult = referencedAgentIds.length === 0
    ? '无引用'
    : !sameReferences || task.referenceRefreshResult === '无引用'
      ? '待后台接入'
      : task.referenceRefreshResult ?? '待后台接入'
  return { ...task, syncMode: 'backend-managed', syncRuntime: task.syncRuntime ?? 'prototype', referencedAgentIds,
    referenceRefreshResult }
}

/**
 * Executable prototype of one backend check. A future backend adapter owns
 * polling, identity, parsing/hashing and atomic persistence; the Vue page never
 * invokes this operation on a timer or claims that these gateways are connected.
 * Source ACLs intentionally are not part of this content-only contract.
 */
export async function checkDingTalkDocumentUpdate(
  input: { mapping: DingTalkDocumentMapping; file: SourceKnowledgeNode; agents: readonly DingTalkAgentReference[]; checkedAt: string },
  gateway: DingTalkSyncGateway,
): Promise<{ mapping: DingTalkDocumentMapping; file: SourceKnowledgeNode }> {
  const { mapping, file, agents, checkedAt } = input
  const referencedAgentIds = [...new Set(agents.filter(agent => agent.documentIds.includes(file.id)).map(agent => agent.id))]
  const next: DingTalkDocumentMapping = { ...mapping, referencedAgentIds, permissionResult: '后续不更新' }
  let refreshing = false
  try {
    if (file.id !== mapping.localFileId || file.sourceDocumentId !== mapping.sourceDocumentId) throw new Error('知识文件不存在或来源已变更')
    const metadata = await gateway.readMetadata(mapping.sourceDocumentId)
    next.sourceModifiedAt = metadata.modifiedAt
    if (metadata.modifiedAt && metadata.modifiedAt === mapping.lastSuccessfulModifiedAt) {
      return { file, mapping: { ...next, status: '成功', failureReason: undefined, contentResult: '未变化', referenceRefreshResult: referencedAgentIds.length ? '未变化' : '无引用' } }
    }
    const exported = await gateway.exportContent(mapping.sourceDocumentId)
    if (!exported.contentHash.trim()) throw new Error('文档内容校验失败')
    if (exported.contentHash === mapping.lastSuccessfulContentHash) {
      return { file, mapping: { ...next, status: '成功', failureReason: undefined, lastSuccessfulModifiedAt: metadata.modifiedAt,
        contentResult: '未变化', referenceRefreshResult: referencedAgentIds.length ? '未变化' : '无引用' } }
    }
    if (referencedAgentIds.length) {
      refreshing = true
      await gateway.refreshReferences({ localFileId: file.id, agentIds: referencedAgentIds, contentHash: exported.contentHash })
    }
    return {
      file: { ...file, content: exported.content, updatedAt: checkedAt },
      mapping: { ...next, status: '成功', failureReason: undefined, lastSuccessfulModifiedAt: metadata.modifiedAt,
        lastSuccessfulContentHash: exported.contentHash, contentResult: '已更新', referenceRefreshResult: referencedAgentIds.length ? '已刷新' : '无引用' },
    }
  } catch (cause) {
    return { file, mapping: { ...next, status: '失败', contentResult: '失败', failureReason: cause instanceof Error ? cause.message : '同步失败',
      referenceRefreshResult: refreshing ? '刷新失败' : referencedAgentIds.length ? '未变化' : '无引用' } }
  }
}
