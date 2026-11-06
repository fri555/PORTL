export type QuotaScopeKind = 'department' | 'person'

export type QuotaScope = { id: string; kind: QuotaScopeKind; name: string }
export type QuotaAdministratorGrant = { id: string; administratorId: string; administratorName: string; department: string; scopes: QuotaScope[] }
export type QuotaMember = { id: string; name: string; departmentId: string; departmentName: string; quota: number; consumed: number; quotaSource: '全局默认' | '个人设置'; updatedAt: string }

export const configuredSystemAdministratorIds = ['u_001', 'admin-1']

export const initialQuotaAdministratorGrants: QuotaAdministratorGrant[] = [
  { id: 'grant-manager-zhang', administratorId: 'manager-zhang', administratorName: '张婷（AIBP）', department: '数字技术中心', scopes: [{ id: 'dept-137517219', kind: 'department', name: '数字技术中心' }] },
  { id: 'grant-manager-zhou', administratorId: 'manager-zhou', administratorName: '周悦（AIBP）', department: '人力资源中心', scopes: [{ id: 'user-qinghui', kind: 'person', name: '李清（清晖）' }, { id: 'user-bailu', kind: 'person', name: '王蕾（白露）' }] },
]

export const quotaMembers: QuotaMember[] = [
  { id: 'user-chaomu', name: '赵伟朝（朝暮）', departmentId: 'dept-1075739175', departmentName: 'AI项目组', quota: 300, consumed: 78.69, quotaSource: '个人设置', updatedAt: '2026-10-26 16:46:45' },
  { id: 'user-yuanguang', name: '邹昌宇（元亮）', departmentId: 'dept-970183179', departmentName: 'B2C研发部', quota: 400, consumed: 91.57, quotaSource: '个人设置', updatedAt: '2026-11-03 10:18:20' },
  { id: 'user-dongli', name: '刘爽（东离）', departmentId: 'dept-1043596048', departmentName: '中台研发部', quota: 400, consumed: 84.53, quotaSource: '个人设置', updatedAt: '2026-10-08 09:39:01' },
  { id: 'user-qinghui', name: '李清（清晖）', departmentId: 'dept-137304912', departmentName: '人力资源中心', quota: 100, consumed: 53.76, quotaSource: '全局默认', updatedAt: '2026-10-08 18:43:04' },
  { id: 'user-wuzi', name: '许文浩（无字）', departmentId: 'dept-479037415', departmentName: '商品运营中心', quota: 100, consumed: 22.82, quotaSource: '全局默认', updatedAt: '2026-10-08 18:43:04' },
  { id: 'user-jinxing', name: '韦昊泽（谨行）', departmentId: 'dept-1079461197', departmentName: '算法研发部', quota: 100, consumed: 15.52, quotaSource: '全局默认', updatedAt: '2026-10-08 18:43:04' },
  { id: 'user-shuangzi', name: '韩兴（双子）', departmentId: 'dept-861256974', departmentName: 'B2B研发部', quota: 100, consumed: 15.04, quotaSource: '全局默认', updatedAt: '2026-10-08 18:43:04' },
  { id: 'user-bailu', name: '王蕾（白露）', departmentId: 'dept-137304912', departmentName: '人力资源中心', quota: 100, consumed: 11.52, quotaSource: '全局默认', updatedAt: '2026-10-08 18:43:04' },
]

export const quotaAdministratorCandidates = [
  { id: 'manager-chen', name: '陈峰（AIBP）', department: '数字技术中心' },
  { id: 'manager-zhang', name: '张婷（AIBP）', department: '数字技术中心' },
  { id: 'manager-zhou', name: '周悦（AIBP）', department: '人力资源中心' },
]

// Prototype ledger: amounts are in cents to keep table and detail totals identical.
export const quotaConsumptionRecords = quotaMembers.flatMap(member => {
  const total = Math.round(member.consumed * 100)
  const chat = Math.round(total * 0.6)
  return [
    { id: `${member.id}-chat`, memberId: member.id, module: '天马智擎', date: '2026-11-03 10:36:20', consumed: chat / 100 },
    { id: `${member.id}-knowledge`, memberId: member.id, module: '知识中心', date: '2026-11-04 15:12:08', consumed: (total - chat) / 100 },
  ]
})
