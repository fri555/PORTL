import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import KnowledgeDialogs from '../KnowledgeDialogs.vue'
import { canChangeKnowledgeMember, canConfigureKnowledge, canDeleteKnowledge, canGrantKnowledge, canDownloadKnowledge, canPreviewKnowledge, canRemoveKnowledgeMember, canRetrieveKnowledge, knowledgeRoleForPerson, knowledgeRoles, normalizeKnowledgeRole, sourceContentNeedsUpdate } from '@/types/knowledge-permission'
import type { KnowledgeRole } from '@/types/knowledge-permission'
import type { KnowledgePermissionSnapshot } from '@/types/knowledge-source'

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => { wrappers.forEach(item => item.unmount()); wrappers.length = 0 })
const snapshot = (roles: Record<string, KnowledgeRole> = {}, inheritParent = false): KnowledgePermissionSnapshot => ({ owner: '朝暮', members: Object.keys(roles), roles, inheritParent, revision: 1 })
function open(actorRole: KnowledgeRole = 'MANAGER', systemAdmin = false, permission = snapshot()) {
  const wrapper = mount(KnowledgeDialogs, { props: { kind: 'permission', target: { id: 'kb', name: '制度库', owner: '朝暮', space: 'public', createdAt: '', nodes: [], permission }, actorRole, systemAdmin }, global: { stubs: { Teleport: true } } })
  wrappers.push(wrapper)
  return wrapper
}
async function addPerson(wrapper: ReturnType<typeof open>, person: string) {
  await wrapper.get('[aria-label="添加成员"]').trigger('click')
  await wrapper.get('.picker-tabs button:nth-child(2)').trigger('click')
  await wrapper.get(`[aria-label="选择${person}"]`).trigger('click')
  await wrapper.get('[data-testid="add-member-dialog"] .picker-footer .primary').trigger('click')
}
async function save(wrapper: ReturnType<typeof open>) {
  await wrapper.get('form.permission-form').trigger('submit')
  await wrapper.get('[data-testid="permission-impact-dialog"] .primary').trigger('click')
  return wrapper.emitted('permission')![0][0] as KnowledgePermissionSnapshot
}
async function chooseTransfer(wrapper: ReturnType<typeof open>, person: string) {
  await wrapper.get('[aria-label="新创建者"]').trigger('click')
  await wrapper.get(`[role="option"][aria-label="选择新创建者${person}"]`).trigger('click')
  await wrapper.get('[data-testid="ownership-transfer-dialog"] .primary').trigger('click')
}

describe('V1.4.0 three public-space roles', () => {
  it('offers three roles and normalizes previous editor and owner values', () => {
    expect(knowledgeRoles.map(role => role.value)).toEqual(['MANAGER', 'DOWNLOADER', 'READER'])
    expect(normalizeKnowledgeRole('EDITOR')).toBe('DOWNLOADER')
    expect(normalizeKnowledgeRole('OWNER')).toBe('MANAGER')
    expect(canConfigureKnowledge('EDITOR')).toBe(false)
  })
  it.each(['MANAGER', 'DOWNLOADER', 'READER'] as const)('allows %s preview and retrieval', role => {
    expect(canPreviewKnowledge(role)).toBe(true)
    expect(canRetrieveKnowledge(role)).toBe(true)
    expect(canDownloadKnowledge(role)).toBe(role !== 'READER')
  })
  it('allows managers to grant and change peers but remove only lower roles', () => {
    expect(canGrantKnowledge('MANAGER', 'MANAGER')).toBe(true)
    expect(canChangeKnowledgeMember('MANAGER', 'MANAGER')).toBe(true)
    expect(canRemoveKnowledgeMember('MANAGER', 'MANAGER')).toBe(false)
    expect(canRemoveKnowledgeMember('MANAGER', 'DOWNLOADER')).toBe(true)
    expect(canGrantKnowledge('DOWNLOADER', 'READER')).toBe(false)
    expect(canRemoveKnowledgeMember('READER', 'READER', true)).toBe(true)
  })
  it('allows managers to delete ordinary nodes and their permission roots', () => {
    expect(canDeleteKnowledge('MANAGER', true)).toBe(true)
    expect(canDeleteKnowledge('MANAGER', false)).toBe(true)
    expect(canDeleteKnowledge('DOWNLOADER', false)).toBe(false)
    expect(canDeleteKnowledge('READER', true, true)).toBe(true)
  })
  it('keeps the creator at resource-manager level and merges direct and department roles', () => {
    expect(knowledgeRoleForPerson(snapshot(), '朝暮')).toBe('MANAGER')
    const grants = snapshot({ 朝暮: 'DOWNLOADER', 管理层: 'DOWNLOADER', 向阳: 'MANAGER' })
    expect(knowledgeRoleForPerson(grants, '向阳', { 管理层: ['向阳'] })).toBe('MANAGER')
    expect(knowledgeRoleForPerson(grants, '清晖', { 管理层: ['清晖'] })).toBe('DOWNLOADER')
    expect(knowledgeRoleForPerson(grants, '未知')).toBeNull()
  })
  it('caps legacy manager department grants during effective-role resolution', () => {
    const typed = { ...snapshot({ '跨区业务部': 'MANAGER' }), subjectKinds: { '跨区业务部': 'department' as const } }
    expect(knowledgeRoleForPerson(typed, '清晖', { '跨区业务部': ['清晖'] })).toBe('DOWNLOADER')
    const legacy = snapshot({ '旧部门': 'MANAGER' })
    expect(knowledgeRoleForPerson(legacy, '清晖', { '旧部门': ['清晖'] })).toBe('DOWNLOADER')
    const synced = { ...snapshot(), syncedRoles: { '跨区业务部': 'MANAGER' as const }, subjectKinds: { '跨区业务部': 'department' as const } }
    expect(knowledgeRoleForPerson(synced, '清晖', { '跨区业务部': ['清晖'] })).toBe('DOWNLOADER')
    const direct = { ...typed, members: ['跨区业务部', '清晖'], roles: { '跨区业务部': 'MANAGER' as const, 清晖: 'MANAGER' as const } }
    expect(knowledgeRoleForPerson(direct, '清晖', { '跨区业务部': ['清晖'] })).toBe('MANAGER')
  })
  it('keeps creation protected and can save without other members', async () => {
    const wrapper = open()
    expect(wrapper.get('[data-testid="knowledge-owner-row"]').text()).toContain('创建者')
    expect(wrapper.get('[data-testid="knowledge-owner-row"]').text()).toContain('可管理')
    expect(wrapper.get('[data-testid="knowledge-owner-row"]').find('.role-control').exists()).toBe(false)
    expect(wrapper.find('[aria-label="转交所有权"]').exists()).toBe(false)
    expect(await save(wrapper)).toMatchObject({ owner: '朝暮', members: [] })
  })
  it('defaults new personnel to view and keeps removal in their role menu', async () => {
    const wrapper = open()
    await addPerson(wrapper, '清晖')
    expect(wrapper.get('[aria-label="清晖权限"]').text()).toContain('可查看')
    await wrapper.get('[aria-label="清晖权限"]').trigger('click')
    const menu = wrapper.get('[aria-label="清晖权限选项"]')
    expect(menu.text()).not.toContain('可编辑')
    expect(menu.text()).not.toContain('设为创建者')
    await menu.get('[aria-label="移除清晖直接设置"]').trigger('click')
    expect(wrapper.find('[aria-label="清晖权限"]').exists()).toBe(false)
  })
  it('can change peer manager grants while omitting peer removal', async () => {
    const wrapper = open('MANAGER', false, snapshot({ 清晖: 'MANAGER' }))
    await wrapper.get('[aria-label="清晖权限"]').trigger('click')
    const menu = wrapper.get('[aria-label="清晖权限选项"]')
    expect(menu.find('[aria-label="移除清晖直接设置"]').exists()).toBe(false)
    expect(menu.findAll('[role="menuitem"]').map(item => item.text())).toEqual(expect.arrayContaining([expect.stringContaining('可管理')]))
    await menu.findAll('[role="menuitem"]')[1]!.trigger('click')
    expect(wrapper.get('[aria-label="清晖权限"]').text()).toContain('可查看')
  })
  it('validates removal against the saved role when a peer is demoted in the current draft', async () => {
    const wrapper = open('MANAGER', false, snapshot({ 清晖: 'MANAGER' }))
    await wrapper.get('[aria-label="清晖权限"]').trigger('click')
    await wrapper.get('[aria-label="清晖权限选项"]').findAll('[role="menuitem"]')[1]!.trigger('click')
    await wrapper.get('[aria-label="清晖权限"]').trigger('click')
    expect(wrapper.get('[aria-label="清晖权限选项"]').find('[aria-label="移除清晖直接设置"]').exists()).toBe(false)
    await wrapper.get('[aria-label="添加成员"]').trigger('click')
    await wrapper.get('.picker-tabs button:nth-child(2)').trigger('click')
    expect(wrapper.get('[aria-label="取消选择清晖"]').attributes()).toHaveProperty('disabled')
  })
  it('does not bypass peer removal through the add-member picker', async () => {
    const wrapper = open('MANAGER', false, snapshot({ 清晖: 'MANAGER' }))
    await wrapper.get('[aria-label="添加成员"]').trigger('click')
    await wrapper.get('.picker-tabs button:nth-child(2)').trigger('click')
    const peer = wrapper.get('[aria-label="取消选择清晖"]')
    expect(peer.attributes()).toHaveProperty('disabled')
    await peer.trigger('click')
    await wrapper.get('[data-testid="add-member-dialog"] .primary').trigger('click')
    expect((await save(wrapper)).members).toContain('清晖')
  })
  it('allows deselecting a newly selected person before the picker is confirmed', async () => {
    const wrapper = open()
    await wrapper.get('[aria-label="添加成员"]').trigger('click')
    await wrapper.get('.picker-tabs button:nth-child(2)').trigger('click')
    await wrapper.get('[aria-label="选择清晖"]').trigger('click')
    const remove = wrapper.get('[aria-label="取消选择清晖"]')
    expect(remove.attributes()).not.toHaveProperty('disabled')
    await remove.trigger('click')
    await wrapper.get('[data-testid="add-member-dialog"] .primary').trigger('click')
    expect((await save(wrapper)).members).not.toContain('清晖')
  })
  it('allows a system admin to remove a manager grant', async () => {
    const wrapper = open('MANAGER', true, snapshot({ 清晖: 'MANAGER' }))
    await wrapper.get('[aria-label="清晖权限"]').trigger('click')
    await wrapper.get('[aria-label="移除清晖直接设置"]').trigger('click')
    expect(wrapper.find('[aria-label="清晖权限"]').exists()).toBe(false)
  })
  it('caps department grants at view even for system administrators', async () => {
    const wrapper = open('MANAGER', true, snapshot({ 管理层: 'DOWNLOADER' }))
    await wrapper.get('[aria-label="管理层权限"]').trigger('click')
    const managerOption = wrapper.get('[aria-label="管理层权限选项"]').findAll('[role="menuitem"]')[0]!
    expect(managerOption.attributes()).toHaveProperty('disabled')
    await managerOption.trigger('click')
    expect(wrapper.get('[aria-label="管理层权限"]').text()).toContain('可查看')
  })
  it('caps imported department subjects outside the demo directory using their subject type', async () => {
    const wrapper = open('MANAGER', true, { ...snapshot({ '跨区业务部': 'DOWNLOADER' }), subjectKinds: { '跨区业务部': 'department' } })
    await wrapper.get('[aria-label="跨区业务部权限"]').trigger('click')
    const menu = wrapper.get('[aria-label="跨区业务部权限选项"]')
    expect(menu.findAll('[role="menuitem"]')[0]!.attributes()).toHaveProperty('disabled')
    expect((await save(wrapper)).subjectKinds).toMatchObject({ '跨区业务部': 'department' })
  })
  it('offers department and person tabs without group authorization', async () => {
    const wrapper = open()
    expect(wrapper.get('.search-field input').attributes('aria-label')).toBe('搜索部门/人员')
    await wrapper.get('[aria-label="添加成员"]').trigger('click')
    expect(wrapper.findAll('.picker-tabs button').map(item => item.text())).toEqual(['部门', '人员'])
    expect(wrapper.get('[data-testid="add-member-dialog"]').text()).not.toContain('群')
  })
  it('labels initial people and departments as permission sync while leaving them editable', async () => {
    const wrapper = open('MANAGER', false, { ...snapshot({ 清晖: 'DOWNLOADER', 管理层: 'DOWNLOADER', 向阳: 'DOWNLOADER' }), subjectKinds: { 清晖: 'person', 管理层: 'department', 向阳: 'person' }, initialPermissionSubjects: ['清晖', '管理层', '朝暮'] })
    const sourceRow = wrapper.findAll('.member-area li').find(row => row.text().includes('清晖'))!
    const departmentRow = wrapper.findAll('.member-area li').find(row => row.text().includes('管理层'))!
    expect(sourceRow.get('[data-testid="permission-sync-origin"]').text()).toBe('权限同步')
    expect(departmentRow.get('[data-testid="permission-sync-origin"]').text()).toBe('权限同步')
    expect(sourceRow.find('.direct-badge').exists()).toBe(false)
    expect(wrapper.get('[data-testid="knowledge-owner-row"]').find('[data-testid="permission-sync-origin"]').exists()).toBe(false)
    expect(wrapper.findAll('.member-area li').find(row => row.text().includes('向阳'))!.get('.direct-badge').text()).toBe('直接设置')
    expect(wrapper.get('[aria-label="清晖权限"]').attributes()).not.toHaveProperty('disabled')
    await wrapper.get('[aria-label="清晖权限"]').trigger('click')
    await wrapper.get('[aria-label="清晖权限选项"]').findAll('[role="menuitem"]')[2]!.trigger('click')
    const saved = await save(wrapper)
    expect(saved.roles.清晖).toBe('READER')
    expect(saved.initialPermissionSubjects).toEqual(['清晖', '管理层'])
    await wrapper.setProps({ kind: null })
    await wrapper.setProps({ kind: 'permission', target: { ...wrapper.props('target')!, permission: saved } })
    expect(wrapper.findAll('[data-testid="permission-sync-origin"]')).toHaveLength(2)
  })
  it.each(['menu', 'picker'] as const)('clears imported origin when removed via %s and does not revive it on manual add', async via => {
    const wrapper = open('MANAGER', false, { ...snapshot({ 清晖: 'DOWNLOADER' }), initialPermissionSubjects: ['清晖'] })
    if (via === 'menu') {
      await wrapper.get('[aria-label="清晖权限"]').trigger('click')
      await wrapper.get('[aria-label="移除清晖直接设置"]').trigger('click')
    } else {
      await wrapper.get('[aria-label="添加成员"]').trigger('click')
      await wrapper.get('.picker-tabs button:nth-child(2)').trigger('click')
      await wrapper.get('[aria-label="取消选择清晖"]').trigger('click')
      await wrapper.get('[data-testid="add-member-dialog"] .primary').trigger('click')
    }
    await addPerson(wrapper, '清晖')
    const row = wrapper.findAll('.member-area li').find(item => item.text().includes('清晖'))!
    expect(row.get('.direct-badge').text()).toBe('直接设置')
    expect(row.find('[data-testid="permission-sync-origin"]').exists()).toBe(false)
    expect((await save(wrapper)).initialPermissionSubjects).toEqual([])
  })
  it('retains other source origins when replacing a pending creator transfer', async () => {
    const wrapper = open('MANAGER', true, { ...snapshot({ 清晖: 'DOWNLOADER', 向阳: 'READER' }), initialPermissionSubjects: ['清晖', '向阳'] })
    await wrapper.get('[aria-label="转交所有权"]').trigger('click')
    await chooseTransfer(wrapper, '清晖')
    await wrapper.get('[aria-label="转交所有权"]').trigger('click')
    await chooseTransfer(wrapper, '临川')
    expect((await save(wrapper)).initialPermissionSubjects).toEqual(['向阳', '清晖'])
  })
  it('converts historical synced grants into editable local grants', async () => {
    const wrapper = open('MANAGER', false, { ...snapshot(), syncedRoles: { 清晖: 'EDITOR' } })
    expect(wrapper.get('[aria-label="清晖权限"]').text()).toContain('可查看')
    expect(wrapper.get('[data-testid="permission-sync-origin"]').text()).toBe('权限同步')
    expect(wrapper.get('[aria-label="清晖权限"]').attributes()).not.toHaveProperty('disabled')
    await wrapper.get('[aria-label="清晖权限"]').trigger('click')
    await wrapper.get('[aria-label="移除清晖直接设置"]').trigger('click')
    const result = await save(wrapper)
    expect(result.members).not.toContain('清晖')
    expect(result.syncedRoles ?? {}).toEqual({})
  })
  it.each(['DOWNLOADER', 'READER', 'EDITOR'] as const)('disables configuration for %s', actor => {
    const wrapper = open(actor)
    expect(wrapper.get('[aria-label="添加成员"]').attributes()).toHaveProperty('disabled')
    expect(wrapper.get('button[type="submit"]').attributes()).toHaveProperty('disabled')
    expect(wrapper.find('[aria-label="转交所有权"]').exists()).toBe(false)
  })
  it('limits creator reassignment to system admins, fixes former creator at direct-view and saves atomically', async () => {
    const wrapper = open('MANAGER', true, snapshot({ 清晖: 'DOWNLOADER' }))
    await wrapper.get('[aria-label="清晖权限"]').trigger('click')
    await wrapper.get('[aria-label="清晖权限选项"]').findAll('[role="menuitem"]').find(item => item.text().startsWith('设为创建者'))!.trigger('click')
    const dialog = wrapper.get('[data-testid="ownership-transfer-dialog"]')
    expect(dialog.find('input[type="checkbox"]').exists()).toBe(false)
    expect(dialog.find('select').exists()).toBe(false)
    await dialog.get('.primary').trigger('click')
    expect(wrapper.emitted('permission')).toBeUndefined()
    expect(await save(wrapper)).toMatchObject({ owner: '清晖', roles: { 朝暮: 'DOWNLOADER' }, ownershipTransfer: { previousOwner: '朝暮', newOwner: '清晖' } })
  })
  it('replaces a pending creator without leaving an intermediate creator grant', async () => {
    const wrapper = open('MANAGER', true, snapshot({ 清晖: 'DOWNLOADER' }))
    await wrapper.get('[aria-label="转交所有权"]').trigger('click')
    await chooseTransfer(wrapper, '清晖')
    await addPerson(wrapper, '希范')
    await wrapper.get('[aria-label="转交所有权"]').trigger('click')
    await chooseTransfer(wrapper, '临川')
    expect(await save(wrapper)).toMatchObject({ owner: '临川', roles: { 朝暮: 'DOWNLOADER', 清晖: 'DOWNLOADER', 希范: 'DOWNLOADER' }, ownershipTransfer: { previousOwner: '朝暮', newOwner: '临川' } })
  })
  it('retains existing inheritance controls and source-linked document independence', async () => {
    const wrapper = open()
    await wrapper.setProps({ target: { id: 'folder', name: '文件夹', kind: 'folder', updatedAt: '', owner: '朝暮', permission: snapshot({ 向阳: 'DOWNLOADER' }, true) } })
    expect((wrapper.get('[aria-label="继承上级权限"]').element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.text()).toContain('来自上级')
    await wrapper.setProps({ target: { id: 'source', name: '同步文件', kind: 'file', updatedAt: '', owner: '朝暮', sourceDocumentId: 'doc', permission: snapshot({ 向阳: 'DOWNLOADER' }, true) } })
    expect(wrapper.get('[aria-label="继承上级权限"]').attributes()).toHaveProperty('disabled')
    expect((await save(wrapper)).inheritParent).toBe(false)
  })
  it('treats a changed source timestamp in either direction as a content candidate', () => {
    expect(sourceContentNeedsUpdate('2026-10-10', '2026-10-10')).toBe(false)
    expect(sourceContentNeedsUpdate('2026-10-09', '2026-10-10')).toBe(true)
    expect(sourceContentNeedsUpdate('', '2026-10-10')).toBe(true)
  })
})
