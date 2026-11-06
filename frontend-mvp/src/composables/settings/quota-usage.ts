import { quotaConsumptionRecords, type QuotaMember } from '@/mock/settings-quota'
import { departmentScopeIds } from '@/stores/settings-quota'
export type QuotaUsageFilters = { query: string; start: string; end: string; department: string; module: string }
export type QuotaUsageRecord = { id: string; memberId: string; module: string; date: string; consumed: number }
export function quotaUsageRecords(memberId: string, filters?: QuotaUsageFilters): QuotaUsageRecord[] {
  return quotaConsumptionRecords.filter(row => row.memberId === memberId && (!filters ||
    ((!filters.start || row.date.slice(0, 10) >= filters.start) && (!filters.end || row.date.slice(0, 10) <= filters.end) && (!filters.module || row.module === filters.module))))
}
export function quotaRate(member: QuotaMember) {
  return member.quota > 0 ? member.consumed / member.quota * 100 : member.consumed > 0 ? Infinity : 0
}
export function quotaRateLabel(member: QuotaMember) { const rate = quotaRate(member); return Number.isFinite(rate) ? `${rate.toFixed(2)}%` : '已超额' }
export function filteredQuotaRows(members: QuotaMember[], filters: QuotaUsageFilters): QuotaMember[] {
  const departments = filters.department ? departmentScopeIds(filters.department) : null
  const query = filters.query.trim().toLocaleLowerCase()
  return members.filter(member => (!query || member.name.toLocaleLowerCase().includes(query)) && (!departments || departments.has(member.departmentId)))
    .map(member => ({ ...member, consumed: quotaUsageRecords(member.id, filters).reduce((sum, record) => sum + Math.round(record.consumed * 100), 0) / 100 }))
}
export function quotaCsvRows(rows: QuotaMember[]): string[] {
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
  return ['姓名,部门,额度,额度来源,消耗,使用率,更新时间', ...rows.map(row => [row.name, row.departmentName, row.quota.toFixed(2), row.quotaSource, row.consumed.toFixed(2), quotaRateLabel(row), row.updatedAt].map(cell).join(','))]
}
