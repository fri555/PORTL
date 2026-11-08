import type { KnowledgeRole } from './knowledge-permission'
export interface KnowledgeOwnershipTransfer {
  previousOwner: string
  newOwner: string
}
export interface KnowledgePermissionSnapshot {
  members: string[]
  roles: Record<string, KnowledgeRole>
  subjectKinds?: Record<string, 'person' | 'department'>
  /** Initial DingTalk authorization provenance; editing roles never re-fetches source ACLs. */
  initialPermissionSubjects?: string[]
  syncedRoles?: Record<string, KnowledgeRole>
  owner: string
  inheritParent: boolean
  revision: number
}
export type KnowledgeSpace = 'public' | 'personal'

export type SourceKnowledgeNodeKind = 'folder' | 'file'

export interface SourceKnowledgeNode {
  id: string
  name: string
  kind: SourceKnowledgeNodeKind
  owner: string
  updatedAt: string
  format?: string
  size?: string
  children?: SourceKnowledgeNode[]
  permission?: KnowledgePermissionSnapshot
  sourceDocumentId?: string
  downloadUrl?: string
  /** Text of a document created inside the knowledge center. */
  content?: string
}

export interface SourceKnowledgeNavigation {
  kbId: string
  nodeId?: string
  kind: 'kb' | SourceKnowledgeNodeKind
}

export interface SourceKnowledgeBase {
  id: string
  name: string
  owner: string
  createdAt: string
  count?: number
  space: KnowledgeSpace
  nodes?: SourceKnowledgeNode[]
  /** @deprecated Use nodes for hierarchical content. */
  documents?: string[]
  permission?: KnowledgePermissionSnapshot
}

export type KnowledgeDialogKind = 'create' | 'folder' | 'document' | 'edit-document' | 'upload' | 'permission' | 'rename' | 'delete' | null

export interface QaPanelMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  citation?: string
}

/** A single writable knowledge-base or first-level folder destination. */
export interface KnowledgeDestination {
  id: string
  name: string
  kind?: 'kb' | 'folder'
  parentId?: string
  path?: string
  space?: KnowledgeSpace
}

export type DingTalkSyncFrequency = '不自动同步' | '每天' | '每周' | '每月'
export type DingTalkReferenceRefreshResult = '待后台接入' | '已刷新' | '无引用' | '未变化' | '刷新失败'
export interface DingTalkDocumentMapping {
  sourceDocumentId: string
  sourceName: string
  localFileId: string
  status: '成功' | '失败'
  failureReason?: string
  sourceModifiedAt?: string
  lastSuccessfulModifiedAt?: string
  lastSuccessfulContentHash?: string
  referencedAgentIds?: string[]
  referenceRefreshResult?: DingTalkReferenceRefreshResult
  contentResult?: '已更新' | '未变化' | '失败'
  permissionResult?: '首次初始化' | '后续不更新' | '已同步' | '未变化' | '失败'
  permissionSyncedAt?: string
  permissionMemberCount?: number
  expandedGroupMemberCount?: number
}
export interface DingTalkImportTask {
  importTaskId: string
  syncMode?: 'backend-managed'
  /** This local prototype does not run a live DingTalk scheduler. */
  syncRuntime?: 'prototype' | 'connected'
  referencedAgentIds?: string[]
  referenceRefreshResult?: DingTalkReferenceRefreshResult
  recordId?: string
  taskId?: string
  /** Human-readable label; old records fall back to their source documents. */
  name?: string
  /** Pausing a task never removes its imported files or execution history. */
  enabled?: boolean
  taskKind?: 'document-import' | 'agent-reference'
  /** Agent references point to stable local file IDs, not file names. */
  agentIds?: string[]
  platformUserId: string
  userAlias: string
  destinationId: string
  destinationPath: string
  /** Existing DingTalk document task schedule. The backend executes this rule. */
  frequency?: DingTalkSyncFrequency
  schedule?: string
  latestSyncAt: string
  /** Epoch milliseconds of the latest user-triggered execution submission. */
  lastManualSubmittedAt?: number
  executedAt?: string
  status: '待执行' | '同步成功' | '同步中' | '部分失败' | '同步失败'
  failureReason?: string
  documentMappings: DingTalkDocumentMapping[]
}
