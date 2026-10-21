import { normalizeKnowledgeRole } from '@/types/knowledge-permission'
import type { KnowledgeOwnershipTransfer, KnowledgePermissionSnapshot, SourceKnowledgeBase, SourceKnowledgeNode } from '@/types/knowledge-source'

type KnowledgeResource = SourceKnowledgeBase | SourceKnowledgeNode
const currentCreator = (resource: KnowledgeResource) => resource.permission?.owner ?? resource.owner

/** Applies a system-admin-confirmed reassignment to the selected resource only. */
export function applyKnowledgeOwnershipTransfer(resource: KnowledgeResource, transfer: KnowledgeOwnershipTransfer) {
  if (currentCreator(resource) !== transfer.previousOwner) throw new Error('创建者已变更，请刷新后重试')
  if (!transfer.newOwner || transfer.newOwner === transfer.previousOwner) throw new Error('请选择其他在职人员')
  const previous = resource.permission
  const roles = Object.fromEntries(Object.entries({ ...previous?.syncedRoles, ...previous?.roles }).map(([person, role]) => [person, normalizeKnowledgeRole(role)]))
  delete roles[transfer.newOwner]
  roles[transfer.previousOwner] = 'DOWNLOADER'
  const members = [...new Set([...(previous?.members ?? []), ...Object.keys(roles), transfer.previousOwner])].filter(person => person !== transfer.newOwner)
  const permission: KnowledgePermissionSnapshot = {
    owner: transfer.newOwner,
    members,
    roles,
    initialPermissionSubjects: [...new Set([...(previous?.initialPermissionSubjects ?? []), ...Object.keys(previous?.syncedRoles ?? {})])].filter(subject => members.includes(subject) && subject !== transfer.previousOwner && subject !== transfer.newOwner),
    ...(previous?.subjectKinds ? { subjectKinds: { ...previous.subjectKinds } } : {}),
    inheritParent: previous?.inheritParent ?? ('kind' in resource && !resource.sourceDocumentId),
    revision: (previous?.revision ?? 0) + 1,
  }
  resource.owner = transfer.newOwner
  resource.permission = permission
  return 1
}
