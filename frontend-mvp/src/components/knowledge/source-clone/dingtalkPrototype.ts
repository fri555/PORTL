import type { DingTalkInitialPermissions, DingTalkSourceRole } from '@/utils/dingtalkPermissionInitialization'

export type CredentialStatus = 'valid' | 'invalid' | 'unknown'
export type PermissionStatus = 'normal' | 'abnormal' | 'unknown'

export const credentialStatusText: Record<CredentialStatus, string> = {
  valid: '有效', invalid: '已失效', unknown: '未校验',
}
export const permissionStatusText: Record<PermissionStatus, string> = {
  normal: '正常', abnormal: '异常', unknown: '未知',
}

// Explicit, allow-listed fixture states for reviewing this interaction prototype.
const prototypeScenarios = [
  'normal', 'credentials-expired', 'permission-denied', 'unknown', 'empty',
  'no-scope', 'no-libraries', 'no-permission', 'required-error', 'create-scope',
  'create-rules', 'edit-name', 'edit-scope', 'edit-destination', 'edit-schedule',
  'disconnect', 'disconnected', 'reconnect', 'partial', 'scope-loading', 'scope-error',
  'personal-import', 'personal-partial', 'identity-unbound', 'identity-expired', 'export-unavailable', 'no-write-target',
] as const
export type PrototypeScenario = typeof prototypeScenarios[number]
export function getPrototypeScenario(): PrototypeScenario {
  const scenario = new URLSearchParams(window.location.search).get('prototype')
  return prototypeScenarios.includes(scenario as PrototypeScenario)
    ? scenario as PrototypeScenario
    : 'normal'
}

type ScopeNode = { id: string; label?: string; type: string; children?: ScopeNode[] }
export function scopeDocuments(selectedKeys: string[], root: ScopeNode): { id: string; name: string }[] {
  const selected = new Set(selectedKeys)
  const result: { id: string; name: string }[] = []
  const visit = (node: ScopeNode, included: boolean) => {
    const selectedHere = included || selected.has(node.id)
    if (node.type === 'doc' && selectedHere) result.push({ id: node.id, name: node.label ?? node.id })
    else node.children?.forEach(child => visit(child, selectedHere))
  }
  visit(root, false)
  return result
}
export function scopeDocumentIds(selectedKeys: string[], root: ScopeNode): string[] {
  return scopeDocuments(selectedKeys, root).map(document => document.id)
}
export function selectScope(previous: string[], clicked: ScopeNode, checked: string[], root: ScopeNode): string[] {
  const nodes: ScopeNode[] = []
  const visit = (node: ScopeNode) => { nodes.push(node); node.children?.forEach(visit) }; visit(root)
  const chosen = new Set(checked)
  const folders = new Set(previous.filter(id => chosen.has(id) && nodes.find(n=>n.id===id)?.type !== 'doc'))
  if (clicked.type !== 'doc' && chosen.has(clicked.id)) folders.add(clicked.id)
  const result: string[]=[]
  const collect=(node:ScopeNode)=>{if(folders.has(node.id)){result.push(node.id);return}if(node.type==='doc'&&chosen.has(node.id))result.push(node.id);else node.children?.forEach(collect)}
  collect(root); return result
}
// Only fixture content representing opened, readable and parsable types is listed.
// This is not a supported-format list or an implementation of source ACL syncing.
export const documents = [
  {
    id: 'policies',
    label: '集团制度知识库',
    type: 'knowledge',
    children: [
      {
        id: 'hr',
        label: '人事制度',
        type: 'folder',
        children: [
          { id: 'onboarding', label: '新员工入职指南', type: 'doc' },
          { id: 'attendance', label: '考勤与休假制度', type: 'doc' },
        ],
      },
      { id: 'expense', label: '费用报销规范', type: 'doc' },
    ],
  },
  {
    id: 'products',
    label: '商品运营知识库',
    type: 'knowledge',
    children: [
      { id: 'catalog', label: '商品分类说明', type: 'doc' },
      { id: 'launch', label: '新品上架流程', type: 'doc' },
    ],
  },
]




export type SyncInterval = 'hourly' | 'daily'
export const syncIntervalText: Record<SyncInterval, string> = { hourly: '每小时', daily: '每天' }
export function syncSchedule(interval: SyncInterval, dailyTime = '00:00') {
  return interval === 'hourly' ? '每小时' : '每天 ' + dailyTime
}
/** Product schedule; this does not imply a DingTalk native sync/change-feed guarantee. */
export function nextScheduledSync(schedule: string, anchor = Date.now(), now = Date.now()): string {
  let next: Date
  if (schedule === '每小时') {
    next = new Date(anchor + Math.max(1, Math.floor((now - anchor) / 3600000) + 1) * 3600000)
  } else {
    const match = /^每天 ([01]\d|2[0-3]):([0-5]\d)$/.exec(schedule)
    if (!match) return '—'
    const beijing = new Date(now + 8 * 3600000)
    const nextUtc = Date.UTC(beijing.getUTCFullYear(), beijing.getUTCMonth(), beijing.getUTCDate(), Number(match[1]) - 8, Number(match[2]))
    next = new Date(nextUtc <= now ? nextUtc + 86400000 : nextUtc)
  }
  const local = new Date(next.getTime() + 8 * 3600000)
  return String(local.getUTCFullYear()) + '-' + String(local.getUTCMonth() + 1).padStart(2, '0') + '-' + String(local.getUTCDate()).padStart(2, '0') + ' ' + String(local.getUTCHours()).padStart(2, '0') + ':' + String(local.getUTCMinutes()).padStart(2, '0')
}

export interface BoundDingTalkIdentity {
  platformUserId: string
  displayName: string
  dingUserId: string
  status: 'bound' | 'unbound' | 'expired'
}
// Server-owned binding fixtures: no user-entered or query-supplied operator identity.
const prototypeIdentityBindings: Record<string, { dingUserId: string; readableIds: string[] }> = {
  u_001: { dingUserId: 'ding-demo-chaomu', readableIds: ['onboarding', 'attendance', 'expense', 'catalog', 'launch'] },
  'u-personal-demo': { dingUserId: 'ding-demo-user', readableIds: ['onboarding', 'attendance', 'catalog'] },
}
export function boundDingTalkIdentity(user: { id: string; displayName: string } | null | undefined, scenario: PrototypeScenario = 'normal'): BoundDingTalkIdentity {
  const binding = user ? prototypeIdentityBindings[user.id] : undefined
  return {
    platformUserId: user?.id ?? '', displayName: user?.displayName ?? '未登录',
    dingUserId: binding?.dingUserId ?? '',
    status: !binding || scenario === 'identity-unbound' ? 'unbound' : scenario === 'identity-expired' ? 'expired' : 'bound',
  }
}
export interface ImportableDocument {
  id: string
  name: string
  format: string
  updatedAt: string
  exportable: boolean
  exportReason?: string
  sourceRole?: DingTalkSourceRole
  initialPermissions?: DingTalkInitialPermissions
}
// Resolved identity fixtures retain departments and skip source groups.
const initialPermissionFixture: DingTalkInitialPermissions = {
  complete: true,
  grants: [
    { kind: 'person', subject: '清晖', role: 'OWNER' },
    { kind: 'person', subject: '向阳', role: 'EDITOR' },
    { kind: 'person', subject: '知夏', role: 'READER' },
    { kind: 'department', subject: '人力资源中心', role: 'MANAGER' },
    { kind: 'group', subject: '天马AI项目群', role: 'DOWNLOADER' },
  ],
}
const personalDocumentFixtures: ImportableDocument[] = [
  { id: 'onboarding', name: '新员工入职指南', format: 'DOCX', updatedAt: '2026-10-08 09:30', exportable: true },
  { id: 'attendance', name: '考勤与休假制度', format: 'PDF', updatedAt: '2026-10-08 10:20', exportable: true },
  { id: 'catalog', name: '商品分类说明', format: 'XLSX', updatedAt: '2026-10-08 14:10', exportable: true },
  { id: 'expense', name: '费用报销规范', format: 'DOCX', updatedAt: '2026-10-07 16:00', exportable: true },
  { id: 'launch', name: '新品上架流程', format: 'DOCX', updatedAt: '2026-10-08 11:00', exportable: true },
  { id: 'native-table', name: '商品运营多维表', format: '原生多维表', updatedAt: '2026-10-08 15:00', exportable: false, exportReason: '钉钉未开放本期所需导出能力' },
]
export function personalDingTalkDocuments(identity: BoundDingTalkIdentity, scenario: PrototypeScenario = 'normal'): ImportableDocument[] {
  if (identity.status !== 'bound') return []
  const binding = prototypeIdentityBindings[identity.platformUserId]
  if (!binding || binding.dingUserId !== identity.dingUserId) return []
  return personalDocumentFixtures.filter(document => binding.readableIds.includes(document.id) || document.id === 'native-table')
    .map(document => ({ ...document, sourceRole: 'DOWNLOADER' as const, initialPermissions: structuredClone(initialPermissionFixture),
      ...(scenario === 'export-unavailable' && document.exportable ? { exportable: false, exportReason: '当前身份无导出权限' } : {}) }))
}
/** Explicit fixture grants; app credentials are never a grant to ordinary users. */
export function prototypeCanWriteKnowledge(id: string, role: string | undefined) {
  if (!role) return false
  if (/^kb-personal-[1-4]$/.test(id) || id.startsWith('local-')) return true
  return role === 'admin' && /^kb-public-(?:[1-9]|1[0-2])$/.test(id)
}
