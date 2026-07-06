/* 知识中心类型 - 基于 PRD V2.1 */

export type SpaceKey = 'public' | 'personal'
export type PermissionRole = 'OWNER' | 'MANAGER' | 'EDITOR' | 'VIEWER'
export type UploadTaskStatus = 'uploading' | 'processing' | 'done' | 'upload_failed' | 'process_failed'

export interface KnowledgeBaseItem {
  id: string
  name: string
  docs: number
  owner: string
  department: string
  visibility: string
  space: SpaceKey
  canEdit: boolean
  pinned?: boolean
  recent: string
}

export interface DocItem {
  name: string
  format: string
  status: string
  updatedAt: string
  uploadedBy: string
}

export interface TreeNode {
  id: string
  label: string
  type: 'folder' | 'file'
  kbId?: string
  docName?: string
  isKnowledgeBase?: boolean
  children?: TreeNode[]
}

export interface QaMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  citations?: string[]
}

export interface PermissionEntry {
  id: string
  name: string
  scope: string
  department: string
  role: PermissionRole
  joinedAt: string
}

export interface AuditLog {
  user: string
  action: string
  time: string
  ip: string
  result: string
  sensitive: boolean
}
