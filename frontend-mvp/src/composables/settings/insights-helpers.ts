import type {
  AuditRecord,
  DeptNode,
  NodeType,
  UsageNode,
  UsageFilters,
} from '@/types/settings-insights'

export function allDeptIds(nodes: DeptNode[]): string[] {
  return nodes.flatMap((n) => [n.id, ...(n.children ? allDeptIds(n.children) : [])])
}

export function quotaBand(rate: number) {
  return rate >= 90 ? '高风险' : rate >= 80 ? '预警' : '正常'
}
export function containsModule(node: UsageNode, module: string): boolean {
  return (
    module === '全部模块' ||
    node.name === module ||
    Boolean(node.children?.some((child) => containsModule(child, module)))
  )
}

export function flattenPersons(nodes: UsageNode[]): UsageNode[] {
  return nodes.flatMap((n) => (n.type === 'person' ? [n] : flattenPersons(n.children ?? [])))
}

export function sessionsWithPath(
  nodes: UsageNode[],
  path: string[] = [],
): Array<{ row: UsageNode; path: string[] }> {
  return nodes.flatMap((node) =>
    node.type === 'session'
      ? [{ row: node, path }]
      : sessionsWithPath(node.children ?? [], [...path, node.name]),
  )
}

export const typeLabels: Record<NodeType, string> = {
  department: '部门',
  person: '人员',
  module: '模块',
  feature: '子功能',
  session: '会话',
}
export function number(value: number) {
  return Math.round(value).toLocaleString('zh-CN')
}
export function money(value: number) {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
export function compact(value: number) {
  return value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
      ? `${(value / 1_000).toFixed(1)}K`
      : number(value)
}

export function downloadCsv(filename: string, rows: string[]) {
  if (typeof URL.createObjectURL !== 'function') return
  const href = URL.createObjectURL(
    new Blob([`\uFEFF${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' }),
  )
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(href)
}
export function leafSessions(nodes: UsageNode[]): UsageNode[] {
  return nodes.flatMap((node) =>
    node.type === 'session' ? [node] : leafSessions(node.children ?? []),
  )
}

export const operationTypeLabels: Record<string, string> = {
  CREATE: '新增',
  UPDATE: '修改',
  DELETE: '删除',
}
export function actorDisplayName(record: AuditRecord): string {
  if (record.createUserId === '0') return '系统任务'
  return record.createRealName && record.createUser
    ? `${record.createRealName}（${record.createUser}）`
    : record.createUser || record.createRealName || record.createUserId
}

export function matchesUsageFilters(node: UsageNode, filters: UsageFilters) {
  const dateMatched =
    node.type !== 'session' ||
    ((!filters.start || (node.date ?? '') >= `${filters.start} 00:00`) &&
      (!filters.end || (node.date ?? '') <= `${filters.end} 23:59`))
  return dateMatched && containsModule(node, filters.module)
}

export function filterDepartmentTree(deptTree: DeptNode[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return deptTree
  const match = (nodes: DeptNode[]): DeptNode[] =>
    nodes.reduce<DeptNode[]>((acc, n) => {
      const childMatch = n.children ? match(n.children) : []
      const nameMatch = n.name.toLowerCase().includes(q)
      if (nameMatch || childMatch.length) {
        acc.push({ ...n, children: childMatch.length ? childMatch : n.children })
      }
      return acc
    }, [])
  return match(deptTree)
}

export function filterPersons(
  adminTree: UsageNode[],
  deptTree: DeptNode[],
  personQuery: string,
  deptIds: Set<string>,
) {
  const persons = flattenPersons(adminTree)
  const query = personQuery.trim().toLowerCase()
  const allIds = allDeptIds(deptTree)
  const noDeptFilter = deptIds.size === 0 || deptIds.size === allIds.length
  return persons
    .filter((p) => !query || p.name.toLowerCase().includes(query))
    .filter((p) => {
      if (noDeptFilter) return true
      // 找到该人员所属的部门（通过 adminTree 反向查找）
      const findDept = (nodes: UsageNode[], parentDept?: string): string | null => {
        for (const n of nodes) {
          if (n.type === 'person' && n.id === p.id) return parentDept ?? null
          if (n.type === 'department' && n.children) {
            const found = findDept(n.children, n.id)
            if (found) return found
          }
        }
        return null
      }
      const deptId = findDept(adminTree)
      return deptId ? deptIds.has(deptId) : true
    })
    .sort((a, b) => b.amount - a.amount)
}
