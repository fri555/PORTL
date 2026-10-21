import type { KnowledgePermissionSnapshot } from '@/types/knowledge-source'

export type DingTalkSourceRole = 'OWNER' | 'MANAGER' | 'EDITOR' | 'DOWNLOADER' | 'READER'
export interface DingTalkInitialGrant {
  kind: 'person' | 'department' | 'group'
  subject: string
  role: DingTalkSourceRole
}
export interface DingTalkInitialPermissions {
  complete: boolean
  grants: readonly DingTalkInitialGrant[]
}
const roleMap = { OWNER: 'MANAGER', MANAGER: 'MANAGER', EDITOR: 'DOWNLOADER', DOWNLOADER: 'DOWNLOADER', READER: 'READER' } as const
const rank = { MANAGER: 3, DOWNLOADER: 2, READER: 1 } as const

export function canImportDingTalkSource(role?: string) {
  return role === 'OWNER' || role === 'MANAGER' || role === 'EDITOR' || role === 'DOWNLOADER'
}

/** First-import snapshot only; source groups are explicitly outside this release. */
export function initializeDingTalkPermissions(creator: string, source?: DingTalkInitialPermissions): KnowledgePermissionSnapshot {
  if (!creator.trim() || !source?.complete) throw new Error('权限成员未完整获取，本次未导入，请重试。')
  const roles: Record<string, 'MANAGER' | 'DOWNLOADER' | 'READER'> = {}
  const subjectKinds: Record<string, 'person' | 'department'> = {}
  for (const grant of source.grants) {
    if (grant.kind === 'group') continue
    if (!grant.subject.trim() || !Object.prototype.hasOwnProperty.call(roleMap, grant.role)
      || !['person', 'department'].includes(grant.kind)) {
      throw new Error('权限成员未完整获取，本次未导入，请重试。')
    }
    const role = grant.kind === 'department' && rank[roleMap[grant.role]] > rank.DOWNLOADER ? 'DOWNLOADER' : roleMap[grant.role]
    if (grant.subject === creator) continue
    if (!roles[grant.subject] || rank[role] > rank[roles[grant.subject]]) roles[grant.subject] = role
    subjectKinds[grant.subject] = grant.kind
  }
  return { owner: creator, members: Object.keys(roles), roles, subjectKinds, initialPermissionSubjects: Object.keys(roles), inheritParent: false, revision: 1 }
}
