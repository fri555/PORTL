export type PortalTone = 'coral' | 'blue' | 'magenta' | 'purple' | 'cyan' | 'slate'
export type PortalArchitecture = 'B2B' | 'B2C' | '中台' | '对外'
export type PortalCategoryId =
  | 'common'
  | 'all'
  | 'b2c'
  | 'b2b'
  | 'live'
  | 'supply'
  | 'warehouse'
  | 'finance'
  | 'service'
  | 'data'
  | 'tech'
  | 'content'
  | 'external'
  | 'management'

export type AssistantShortcutTab = 'agents' | 'cases' | 'knowledge'
export type ScheduleStatus = '进行中' | '即将开始' | '未开始' | '已结束'
export type TodoScope = 'all' | 'responsible' | 'created' | 'assigned'
export type TodoPriority = '高' | '中' | '普通'
export type TodoStatus = '待处理' | '进行中' | '已逾期' | '已完成'
export type MessagePriority = '高' | '中' | '低'
export type ApprovalScope = 'pending' | 'done' | 'initiated' | 'cc'
export type CreationKind = 'schedule' | 'todo'

export interface WorkbenchAssistantShortcut {
  id: string
  tab: AssistantShortcutTab
  name: string
  description: string
  meta: string
  icon: string
  tone: PortalTone
  prompt?: string
  targetRoute: string
}

export interface PortalCategory {
  id: PortalCategoryId
  label: string
}

export interface WorkbenchPortal {
  id: string
  name: string
  description: string
  department: string
  architecture: PortalArchitecture
  categoryIds: PortalCategoryId[]
  icon: string
  tone: PortalTone
  url: string
  accessHint?: string
  isCommon?: boolean
  ssoEnabled?: boolean
}

export interface ScheduleItem {
  id: string
  date: string
  start: string
  end: string
  title: string
  location: string
  participantCount: number
  status: ScheduleStatus
}

export interface TodoItem {
  id: string
  title: string
  scopes: Exclude<TodoScope, 'all'>[]
  due: string
  priority: TodoPriority
  status: TodoStatus
  source: string
  owner: string
  creator: string
  assignee: string
  latestUpdate: string
  risk?: string
  completed: boolean
}

export interface MessageSummaryItem {
  id: string
  sender: string
  source: string
  unreadCount: number
  priority: MessagePriority
  reason: string
  summary: string
  actionHint: string
}

export interface ApprovalItem {
  id: string
  title: string
  scope: ApprovalScope
  applicant: string
  due: string
  priority: TodoPriority
  status: TodoStatus
  source: string
}

export interface CalendarDay {
  key: string
  date: Date
  day: number
  inCurrentMonth: boolean
  isToday: boolean
}
