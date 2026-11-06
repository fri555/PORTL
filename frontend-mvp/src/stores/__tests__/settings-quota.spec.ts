import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsQuotaStore } from '@/stores/settings-quota'
import { canManageQuota, quotaMembersForUser } from '@/composables/settings/quota-access'
import type { MockUser } from '@/types/user'

const manager: MockUser = { id: 'manager-chen', displayName: '陈峰', department: '数字技术中心', role: 'user', avatarUrl: '' }

describe('quota grants and mutation boundaries', () => {
  beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()) })

  it('saves people and descendant-department scopes and uses them for both entry and member access', () => {
    const store = useSettingsQuotaStore()
    expect(canManageQuota(manager.id)).toBe(false)
    expect(store.saveGrants('u_001', [{ id: 'grant-chen', administratorId: manager.id, administratorName: '陈峰', department: '数字技术中心', scopes: [
      { id: 'dept-137517219', kind: 'department', name: '数字技术中心' },
      { id: 'user-chaomu', kind: 'person', name: '赵伟朝（朝暮）' },
      { id: 'user-bailu', kind: 'person', name: '王蕾（白露）' },
    ] }])).toBe(true)
    expect(canManageQuota(manager.id)).toBe(true)
    expect(quotaMembersForUser(manager).map(member => member.id)).toEqual(['user-chaomu', 'user-yuanguang', 'user-dongli', 'user-jinxing', 'user-shuangzi', 'user-bailu'])
    expect(new Set(quotaMembersForUser(manager).map(member => member.id)).size).toBe(6)
    setActivePinia(createPinia())
    expect(canManageQuota(manager.id)).toBe(true)
    expect(quotaMembersForUser(manager)).toHaveLength(6)
  })

  it('rejects out-of-scope writes and prevents managers from changing grants or the global quota', () => {
    const store = useSettingsQuotaStore()
    expect(store.setQuota('manager-zhang', 'user-chaomu', 500)).toBe(true)
    expect(store.setQuota('manager-zhang', 'user-bailu', 500)).toBe(false)
    expect(store.members.find(member => member.id === 'user-bailu')?.quota).toBe(100)
    expect(store.setGlobalQuota('manager-zhang', 200)).toBe(false)
    expect(store.saveGrants('manager-zhang', [])).toBe(false)
    expect(store.grants).toHaveLength(2)
  })

  it('revokes entry and quota writes immediately when a system administrator removes the grant', () => {
    const store = useSettingsQuotaStore()
    expect(canManageQuota('manager-zhang')).toBe(true)
    expect(store.saveGrants('u_001', store.grants.filter(grant => grant.administratorId !== 'manager-zhang'))).toBe(true)
    expect(canManageQuota('manager-zhang')).toBe(false)
    expect(store.setQuota('manager-zhang', 'user-chaomu', 500)).toBe(false)
  })

  it('rejects invalid quota values and applies global changes only to members using the default', () => {
    const store = useSettingsQuotaStore()
    expect(store.setQuota('u_001', 'user-chaomu', -1)).toBe(false)
    expect(store.setQuota('u_001', 'user-chaomu', Number.NaN)).toBe(false)
    expect(store.setGlobalQuota('u_001', 200)).toBe(true)
    expect(store.members.find(member => member.id === 'user-chaomu')?.quota).toBe(300)
    expect(store.members.find(member => member.id === 'user-bailu')?.quota).toBe(200)
    expect(store.resetQuota('u_001', 'user-chaomu')).toBe(true)
    expect(store.members.find(member => member.id === 'user-chaomu')?.quota).toBe(200)
  })
})
