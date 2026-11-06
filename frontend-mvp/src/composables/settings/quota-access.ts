import type { MockUser } from '@/types/user'
import { configuredSystemAdministratorIds, type QuotaAdministratorGrant, type QuotaMember } from '@/mock/settings-quota'
import { useSettingsQuotaStore } from '@/stores/settings-quota'

export function isSystemAdministrator(userId?: string | null) { return Boolean(userId && configuredSystemAdministratorIds.includes(userId)) }
export function quotaGrantForUser(userId?: string | null): QuotaAdministratorGrant | null { return userId ? useSettingsQuotaStore().grants.find(grant => grant.administratorId === userId) ?? null : null }
export function canManageQuota(userId?: string | null) { return isSystemAdministrator(userId) || Boolean(quotaGrantForUser(userId)) }
export function canOpenSettings(userId?: string | null) { return canManageQuota(userId) }

export function quotaMembersForUser(user: MockUser | null): QuotaMember[] {
  return user ? useSettingsQuotaStore().visibleMembers(user.id) : []
}
