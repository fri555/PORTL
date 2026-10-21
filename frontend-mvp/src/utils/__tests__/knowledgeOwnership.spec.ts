import { describe, expect, it } from 'vitest'
import { applyKnowledgeOwnershipTransfer } from '../knowledgeOwnership'
import { knowledgeRoleForPerson } from '@/types/knowledge-permission'
import type { KnowledgeOwnershipTransfer, SourceKnowledgeBase, SourceKnowledgeNode } from '@/types/knowledge-source'

const permission = (owner: string, inheritParent: boolean) => ({ owner, members: ['向阳'], roles: { 向阳: 'READER' as const }, inheritParent, revision: 3 })
function fixture(): SourceKnowledgeBase {
  return { id: 'kb', name: '制度库', owner: '朝暮', space: 'public', createdAt: '', permission: permission('朝暮', false), nodes: [
    { id: 'own-folder', name: '本人目录', kind: 'folder', owner: '朝暮', updatedAt: '', permission: permission('朝暮', true), children: [
      { id: 'independent', name: '独立文件', kind: 'file', owner: '朝暮', updatedAt: '', permission: permission('朝暮', false) },
    ] },
  ] }
}
const intent = (overrides: Partial<KnowledgeOwnershipTransfer> = {}): KnowledgeOwnershipTransfer => ({ previousOwner: '朝暮', newOwner: '清晖', ...overrides })

describe('knowledge creator reassignment', () => {
  it('transfers only the selected resource, fixing the new creator at manager and the former creator direct grant at view', () => {
    const root = fixture()
    const before = structuredClone(root.nodes)
    expect(applyKnowledgeOwnershipTransfer(root, intent())).toBe(1)
    expect(root.owner).toBe('清晖')
    expect(root.permission?.roles['朝暮']).toBe('DOWNLOADER')
    expect(knowledgeRoleForPerson(root.permission!, '清晖')).toBe('MANAGER')
    expect(root.nodes).toEqual(before)
  })
  it('preserves folder inheritance and child permissions', () => {
    const folder = fixture().nodes![0] as SourceKnowledgeNode
    const before = structuredClone(folder.children)
    applyKnowledgeOwnershipTransfer(folder, intent())
    expect(folder.children).toEqual(before)
    expect(folder.permission?.inheritParent).toBe(true)
  })
  it('retains unrelated department authorization and chooses the strongest effective role after transfer', () => {
    const root = fixture()
    root.permission = { ...root.permission!, members: ['朝暮', '清晖', '向阳', '管理层'], roles: { 朝暮: 'MANAGER', 清晖: 'READER', 向阳: 'READER', 管理层: 'DOWNLOADER' } }
    const previous = structuredClone(root.permission)
    applyKnowledgeOwnershipTransfer(root, intent())
    expect(root.permission?.roles).toEqual({ 朝暮: 'DOWNLOADER', 向阳: 'READER', 管理层: 'DOWNLOADER' })
    expect(knowledgeRoleForPerson(root.permission!, '朝暮', { 管理层: ['朝暮'] })).toBe('DOWNLOADER')
    expect(previous.roles.朝暮).toBe('MANAGER')
  })
  it('flattens legacy synced grants into editable local permission without resurrecting prior creator manager rights', () => {
    const root = fixture()
    root.permission = { ...root.permission!, syncedRoles: { 朝暮: 'MANAGER', 希范: 'EDITOR' } }
    applyKnowledgeOwnershipTransfer(root, intent())
    expect(root.permission?.roles).toMatchObject({ 朝暮: 'DOWNLOADER', 希范: 'DOWNLOADER' })
    expect(knowledgeRoleForPerson(root.permission!, '朝暮')).toBe('DOWNLOADER')
    expect(root.permission?.syncedRoles ?? {}).toEqual({})
  })
  it('retains initial source origins only for surviving collaborators after creator reassignment', () => {
    const root = fixture()
    root.permission = { ...root.permission!, members: ['朝暮', '清晖', '向阳'], roles: { 朝暮: 'MANAGER', 清晖: 'READER', 向阳: 'DOWNLOADER' }, initialPermissionSubjects: ['朝暮', '清晖', '向阳', '已移除成员'] }
    applyKnowledgeOwnershipTransfer(root, intent())
    expect(root.permission?.initialPermissionSubjects).toEqual(['向阳'])
  })
  it('records legacy synchronized collaborators as initial source origins when transferring', () => {
    const root = fixture()
    root.permission = { ...root.permission!, syncedRoles: { 希范: 'EDITOR', 朝暮: 'MANAGER' } }
    applyKnowledgeOwnershipTransfer(root, intent())
    expect(root.permission?.initialPermissionSubjects).toEqual(['希范'])
  })
  it('rejects a stale creator before changing any resource', () => {
    const root = fixture()
    const before = structuredClone(root)
    expect(() => applyKnowledgeOwnershipTransfer(root, intent({ previousOwner: '已变化' }))).toThrow('创建者已变更')
    expect(root).toEqual(before)
  })
})
