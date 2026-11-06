import { describe, expect, it } from 'vitest'
import { quotaMembers } from '@/mock/settings-quota'
import { filteredQuotaRows, quotaUsageRecords, quotaCsvRows } from '../quota-usage'

describe('quota usage filters', () => {
  const filters = { query: '', start: '2026-11-01', end: '2026-11-05', department: '', module: '' }
  it('preserves totals and combines date, name, descendant department and module filters', () => {
    expect(filteredQuotaRows(quotaMembers, filters).find(row => row.id === 'user-chaomu')?.consumed).toBe(78.69)
    const rows = filteredQuotaRows(quotaMembers, { ...filters, query: '朝暮', department: 'dept-137517219', module: '天马智擎', end: '2026-11-03' })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.consumed).toBe(47.21)
    expect(filteredQuotaRows(quotaMembers, { ...filters, department: 'dept-137304912', query: '朝暮' })).toEqual([])
  })
  it('exports only supplied authorized rows and filtered usage records', () => {
    const records = quotaUsageRecords('user-chaomu').filter(row => row.module === '知识中心')
    expect(records).toHaveLength(1)
    expect(quotaCsvRows(filteredQuotaRows([quotaMembers[0]!], filters)).join('\n')).not.toContain('白露')
    expect(filteredQuotaRows([quotaMembers[0]!], { ...filters, start: '2026-11-05' })[0]?.consumed).toBe(0)
  })
})
