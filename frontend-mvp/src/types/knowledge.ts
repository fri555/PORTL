export interface KnowledgeBase {
  id: string
  name: string
  departmentId: string
  departmentName: string
  description: string
  visibility: 'all' | 'department' | 'specific'
  visibleDepartments: string[]
  totalDocuments: number
  totalChunks: number
  embeddingModel: string
  vectorStore: string
  retrievalConfig: {
    similarityThreshold: number
    topK: number
    showCitation: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface KnowledgeDocument {
  id: string
  knowledgeBaseId: string
  name: string
  format: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'txt'
  size: string
  status: 'processing' | 'indexed' | 'failed'
  uploadedBy: string
  uploadedAt: string
  updatedAt: string
}

export interface SemanticEntity {
  id: string
  knowledgeBaseId: string
  entityType: string
  entityName: string
  properties: Record<string, string | number>
  relations: { targetEntityId: string; relation: string }[]
}

// ─── 权限模型 ───

export type PermissionRole = 'OWNER' | 'MANAGER' | 'EDITOR' | 'VIEWER'

export type SecurityLevel = '全员' | '部门' | '秘密' | '机密'

export interface PermissionEntry {
  id: string
  name: string
  scope: string    // '部门' | '个人' | '系统'
  department: string
  role: PermissionRole
  /** 安全许可等级，决定能查看什么密级的文件。默认从角色派生，管理员可手动调整。 */
  securityClearance?: SecurityLevel
  joinedAt: string
}

export type PermissionMode = 'inherit' | 'independent'

export interface TreeNode {
  id: string
  label: string
  type: 'folder' | 'file'
  kbId?: string
  docName?: string
  isKnowledgeBase?: boolean
  isBuiltIn?: boolean
  children?: TreeNode[]
  permissionMode?: PermissionMode
  permissions?: PermissionEntry[]
}

/** 获取权限条目的中文 label */
export function getPermissionLabel(role: PermissionRole): string {
  const map: Record<PermissionRole, string> = {
    OWNER: '所有者',
    MANAGER: '管理员',
    EDITOR: '编辑者',
    VIEWER: '查看者',
  }
  return map[role]
}

/** 获取权限条目的 Tailwind 样式类 */
export function getPermissionBadgeClass(role: PermissionRole): string {
  const map: Record<PermissionRole, string> = {
    OWNER: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    MANAGER: 'border-blue-200 bg-blue-50 text-blue-700',
    EDITOR: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    VIEWER: 'border-zinc-200 bg-zinc-50 text-zinc-500',
  }
  return map[role]
}

/**
 * 获取节点的有效权限列表
 *
 * @param node 当前节点
 * @param parentPermissions 父节点的有效权限列表（当 node.permissionMode === 'inherit' 时使用）
 * @param ownerOverride 可选的所有者权限（OWNER/MANAGER 始终保留）
 * @returns 合并后的有效权限列表
 */
export function getEffectivePermissions(
  node: { permissionMode: PermissionMode; permissions?: PermissionEntry[] },
  parentPermissions?: PermissionEntry[],
  ownerOverride?: PermissionEntry[],
): PermissionEntry[] {
  let base: PermissionEntry[]

  if (node.permissionMode === 'independent') {
    base = node.permissions ?? []
  } else {
    base = parentPermissions ?? []
  }

  // 如果存在所有者覆盖权限（OWNER/MANAGER 穿透），合并进去
  if (ownerOverride && ownerOverride.length) {
    const ownerIds = new Set(ownerOverride.map(o => o.id))
    return [...ownerOverride, ...base.filter(b => !ownerIds.has(b.id))]
  }

  return base
}
