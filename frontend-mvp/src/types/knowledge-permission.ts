/** OWNER / EDITOR are accepted only when reading existing snapshots. */
export type KnowledgeRole = 'OWNER' | 'MANAGER' | 'EDITOR' | 'DOWNLOADER' | 'READER'
export type PublicKnowledgeRole = 'MANAGER' | 'DOWNLOADER' | 'READER'

export const knowledgeRoles: { value: PublicKnowledgeRole; label: string; description: string }[] = [
  { value: 'MANAGER', label: '可管理', description: '可上传/同步/重命名/下载/删除' },
  { value: 'DOWNLOADER', label: '可查看', description: '可查看/检索/下载' },
  { value: 'READER', label: '仅可查看', description: '可预览/检索/问答，不能下载' },
]

const rank: Record<PublicKnowledgeRole, number> = { MANAGER: 3, DOWNLOADER: 2, READER: 1 }
export function normalizeKnowledgeRole(role: KnowledgeRole): PublicKnowledgeRole {
  if (role === 'OWNER') return 'MANAGER'
  if (role === 'EDITOR') return 'DOWNLOADER'
  return role
}
export function canPreviewKnowledge(role?: KnowledgeRole | null) { return Boolean(role) }
export function canRetrieveKnowledge(role?: KnowledgeRole | null) { return Boolean(role) }
export function canDownloadKnowledge(role?: KnowledgeRole | null) { return Boolean(role && normalizeKnowledgeRole(role) !== 'READER') }

/** Resolve direct and current department membership against local grants. */
export function knowledgeRoleForPerson(
  permission: { owner: string; members: readonly string[]; roles: Record<string, KnowledgeRole>; subjectKinds?: Record<string, 'person' | 'department'>; syncedRoles?: Record<string, KnowledgeRole> },
  person: string,
  departmentMembers: Record<string, readonly string[]> = {},
): PublicKnowledgeRole | null {
  if (permission.owner === person) return 'MANAGER'
  let strongest: PublicKnowledgeRole | null = null
  const apply = (subject: string, storedRole: KnowledgeRole) => {
    if (subject !== person && !departmentMembers[subject]?.includes(person)) return
    const normalizedRole = normalizeKnowledgeRole(storedRole)
    const isDepartment = permission.subjectKinds?.[subject] === 'department' || Object.hasOwn(departmentMembers, subject)
    const role = isDepartment && normalizedRole === 'MANAGER' ? 'DOWNLOADER' : normalizedRole
    if (!strongest || rank[role] > rank[strongest]) strongest = role
  }
  for (const subject of permission.members) apply(subject, permission.roles[subject] ?? 'DOWNLOADER')
  // Read compatibility; the editor migrates these values into writable local grants.
  for (const [subject, role] of Object.entries(permission.syncedRoles ?? {})) apply(subject, role)
  return strongest
}
export function canConfigureKnowledge(role: KnowledgeRole, systemAdmin = false) { return systemAdmin || normalizeKnowledgeRole(role) === 'MANAGER' }
export function canGrantKnowledge(actor: KnowledgeRole, target: KnowledgeRole, systemAdmin = false) {
  return target !== 'OWNER' && canConfigureKnowledge(actor, systemAdmin) && (systemAdmin || rank[normalizeKnowledgeRole(target)] <= rank[normalizeKnowledgeRole(actor)])
}
export function canChangeKnowledgeMember(actor: KnowledgeRole, existing: KnowledgeRole, systemAdmin = false) {
  return existing !== 'OWNER' && canConfigureKnowledge(actor, systemAdmin) && (systemAdmin || rank[normalizeKnowledgeRole(existing)] <= rank[normalizeKnowledgeRole(actor)])
}
export function canRemoveKnowledgeMember(actor: KnowledgeRole, existing: KnowledgeRole, systemAdmin = false) {
  return existing !== 'OWNER' && canConfigureKnowledge(actor, systemAdmin) && (systemAdmin || rank[normalizeKnowledgeRole(existing)] < rank[normalizeKnowledgeRole(actor)])
}
export function canDeleteKnowledge(role: KnowledgeRole, _permissionRoot: boolean, systemAdmin = false) {
  return systemAdmin || normalizeKnowledgeRole(role) === 'MANAGER'
}
export function sourceContentNeedsUpdate(remoteModifiedAt: string, successfulModifiedAt?: string) {
  return !successfulModifiedAt || !remoteModifiedAt || remoteModifiedAt !== successfulModifiedAt
}
