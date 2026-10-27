export type NodeType = 'department' | 'person' | 'module' | 'feature' | 'session'
export type UsageNode = {
  id: string
  type: NodeType
  name: string
  subtitle?: string
  mode?: '日常办公' | '专家模式'
  model?: string
  tokens: number
  calls: number
  coins: number
  amount: number
  quota: number
  quotaRate: number
  quotaSource?: '全局默认' | '个人设置'
  updatedAt?: string
  date?: string
  sessionId?: string
  children?: UsageNode[]
}
export type DeptNode = {
  id: string
  name: string
  children?: DeptNode[]
}

export type VisibleUsageRow = UsageNode & { level: number }
export type AuditRecord = {
  id: string
  bizType: string
  bizId: string
  bizName: string
  operationType: 'CREATE' | 'UPDATE' | 'DELETE'
  operationDesc: string
  beforeContent: string
  afterContent: string
  source: '管理端' | '用户端' | '系统任务'
  ip: string
  traceId: string
  createUserId: string
  createUser: string
  createRealName: string
  createTime: string
}
export type PersonalUsageRecord = {
  id: string
  time: string
  request: string
  requestId: string
  tokens: number
  amount: number
  agent: string
  model: string
  client: string
}
export type QuotaPolicy = {
  id: string
  month: string
  object: string
  scope: '人员' | '全局'
  quotaType: '默认' | '临时'
  cycle: '当月' | '每日' | '每周' | '总量'
  total: number
  used: number
  defaultQuota: number
  temporaryQuota: number
}

export type UsageFilters = { start: string; end: string; person: string; module: string }
export type AuditFilters = {
  start: string
  end: string
  actor: string
  actorId: string
  module: string
  objectQuery: string
  action: string
}
