import { describe, expect, it } from 'vitest'
import { canImportDingTalkSource, initializeDingTalkPermissions, type DingTalkInitialGrant } from '../dingtalkPermissionInitialization'

describe('DingTalk first-import authorization', () => {
  it('maps source people by role and caps department grants while keeping department subjects', () => {
    const grants: DingTalkInitialGrant[] = [
      { kind: 'person', subject: '源所有者', role: 'OWNER' },
      { kind: 'person', subject: '源管理员', role: 'MANAGER' },
      { kind: 'person', subject: '源编辑者', role: 'EDITOR' },
      { kind: 'person', subject: '源查看者', role: 'DOWNLOADER' },
      { kind: 'person', subject: '源预览者', role: 'READER' },
      { kind: 'department', subject: '技术中心', role: 'MANAGER' },
      { kind: 'department', subject: '财务中心', role: 'READER' },
    ]
    expect(initializeDingTalkPermissions('导入人', { complete: true, grants })).toEqual({
      owner: '导入人', members: ['源所有者', '源管理员', '源编辑者', '源查看者', '源预览者', '技术中心', '财务中心'],
      roles: { 源所有者: 'MANAGER', 源管理员: 'MANAGER', 源编辑者: 'DOWNLOADER', 源查看者: 'DOWNLOADER', 源预览者: 'READER', 技术中心: 'DOWNLOADER', 财务中心: 'READER' },
      subjectKinds: { 源所有者: 'person', 源管理员: 'person', 源编辑者: 'person', 源查看者: 'person', 源预览者: 'person', 技术中心: 'department', 财务中心: 'department' },
      initialPermissionSubjects: ['源所有者', '源管理员', '源编辑者', '源查看者', '源预览者', '技术中心', '财务中心'],
      inheritParent: false, revision: 1,
    })
  })
  it('keeps the highest person grant, protects the creator, and skips all group grants', () => {
    const permissions = initializeDingTalkPermissions('导入人', { complete: true, grants: [
      { kind: 'person', subject: '导入人', role: 'READER' },
      { kind: 'person', subject: '成员', role: 'MANAGER' },
      { kind: 'person', subject: '成员', role: 'READER' },
      { kind: 'group', subject: '项目群', role: 'MANAGER' },
    ] })
    expect(permissions).toMatchObject({ owner: '导入人', members: ['成员'], roles: { 成员: 'MANAGER' } })
    expect(permissions).not.toHaveProperty('syncedRoles')
  })
  it.each([undefined, { complete: false, grants: [] }, { complete: true, grants: [{ kind: 'person', subject: '', role: 'DOWNLOADER' }] }])('rejects an incomplete permission snapshot: %j', source => {
    expect(() => initializeDingTalkPermissions('导入人', source as Parameters<typeof initializeDingTalkPermissions>[1])).toThrow('权限成员未完整获取')
  })
  it.each(['OWNER', 'MANAGER', 'EDITOR', 'DOWNLOADER'])('allows source role %s to import when export is available', role => {
    expect(canImportDingTalkSource(role)).toBe(true)
  })
  it.each(['READER', '', undefined, 'UNKNOWN'])('rejects source role %s', role => {
    expect(canImportDingTalkSource(role)).toBe(false)
  })
})
