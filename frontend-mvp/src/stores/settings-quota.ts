import { defineStore } from 'pinia'
import { ref } from 'vue'
import { configuredSystemAdministratorIds, initialQuotaAdministratorGrants, quotaAdministratorCandidates, quotaMembers, type QuotaAdministratorGrant, type QuotaMember } from '@/mock/settings-quota'
import { deptTree } from '@/mock/settings-insights'

const storageKey = 'tianma.prototype.quota-administration.v1'
const validAmount = (amount: number) => Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000 && Math.abs(amount * 100 - Math.round(amount * 100)) < 0.00001
const systemAdmin = (id: string) => configuredSystemAdministratorIds.includes(id)
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export function departmentScopeIds(rootId: string) {
  const result = new Set<string>()
  function visit(nodes: typeof deptTree, parentIncluded = false) {
    for (const node of nodes) {
      const included = parentIncluded || node.id === rootId
      if (included) result.add(node.id)
      if (node.children) visit(node.children, included)
    }
  }
  visit(deptTree)
  return result
}

function validGrants(value: unknown): value is QuotaAdministratorGrant[] {
  if (!Array.isArray(value)) return false
  const administrators = new Set<string>()
  return value.every((grant: QuotaAdministratorGrant) => {
    if (!grant || typeof grant.id !== 'string' || typeof grant.administratorName !== 'string' || typeof grant.department !== 'string' || administrators.has(grant.administratorId) || systemAdmin(grant.administratorId)) return false
    if (!quotaAdministratorCandidates.some(candidate => candidate.id === grant.administratorId) && !quotaMembers.some(member => member.id === grant.administratorId)) return false
    administrators.add(grant.administratorId)
    return Array.isArray(grant.scopes) && grant.scopes.length > 0 && grant.scopes.every(scope => scope && typeof scope.name === 'string' && (scope.kind === 'person' ? quotaMembers.some(member => member.id === scope.id) : scope.kind === 'department' && departmentScopeIds(scope.id).size > 0))
  })
}

function readSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (saved && validGrants(saved.grants) && validAmount(saved.globalQuota) && Array.isArray(saved.members)) {
      const members = quotaMembers.map(member => {
        const stored = saved.members.find((item: QuotaMember) => item.id === member.id)
        return stored && validAmount(stored.quota) && ['个人设置', '全局默认'].includes(stored.quotaSource)
          ? { ...member, quota: stored.quota, quotaSource: stored.quotaSource, updatedAt: typeof stored.updatedAt === 'string' ? stored.updatedAt : member.updatedAt }
          : { ...member }
      })
      return { grants: saved.grants, members, globalQuota: saved.globalQuota as number }
    }
  } catch { /* An invalid prototype cache must not grant additional access. */ }
  return { grants: clone(initialQuotaAdministratorGrants), members: clone(quotaMembers), globalQuota: 100 }
}

export const useSettingsQuotaStore = defineStore('settings-quota', () => {
  const saved = readSavedState()
  const grants = ref<QuotaAdministratorGrant[]>(saved.grants)
  const members = ref<QuotaMember[]>(saved.members)
  const globalQuota = ref(saved.globalQuota)
  const error = ref('')

  function visibleMembers(userId: string) {
    if (systemAdmin(userId)) return members.value
    const grant = grants.value.find(item => item.administratorId === userId)
    if (!grant) return []
    return members.value.filter(member => grant.scopes.some(scope => scope.kind === 'person' ? scope.id === member.id : departmentScopeIds(scope.id).has(member.departmentId)))
  }
  function persist(next: { grants: QuotaAdministratorGrant[]; members: QuotaMember[]; globalQuota: number }) {
    try {
      const plain = clone(next)
      localStorage.setItem(storageKey, JSON.stringify(plain))
      grants.value = plain.grants; members.value = plain.members; globalQuota.value = plain.globalQuota; error.value = ''
      return true
    } catch { error.value = '保存失败，请重试'; return false }
  }
  function saveGrants(actorId: string, next: QuotaAdministratorGrant[]) {
    if (!systemAdmin(actorId) || !validGrants(next)) { error.value = '请检查管理员与管理范围'; return false }
    return persist({ grants: next, members: members.value, globalQuota: globalQuota.value })
  }
  function setQuota(actorId: string, memberId: string, quota: number) {
    if (!validAmount(quota) || !visibleMembers(actorId).some(member => member.id === memberId)) { error.value = '无法设置此成员额度'; return false }
    const updatedAt = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' })
    return persist({ grants: grants.value, members: members.value.map(member => member.id === memberId ? { ...member, quota, quotaSource: '个人设置', updatedAt } : member), globalQuota: globalQuota.value })
  }
  function resetQuota(actorId: string, memberId: string) {
    if (!visibleMembers(actorId).some(member => member.id === memberId)) { error.value = '无法设置此成员额度'; return false }
    const updatedAt = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' })
    return persist({ grants: grants.value, members: members.value.map(member => member.id === memberId ? { ...member, quota: globalQuota.value, quotaSource: '全局默认', updatedAt } : member), globalQuota: globalQuota.value })
  }
  function setGlobalQuota(actorId: string, quota: number) {
    if (!systemAdmin(actorId) || !validAmount(quota)) { error.value = '无法设置全局额度'; return false }
    const updatedAt = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' })
    return persist({ grants: grants.value, members: members.value.map(member => member.quotaSource === '全局默认' ? { ...member, quota, updatedAt } : member), globalQuota: quota })
  }
  return { grants, members, globalQuota, error, visibleMembers, saveGrants, setQuota, resetQuota, setGlobalQuota }
})
