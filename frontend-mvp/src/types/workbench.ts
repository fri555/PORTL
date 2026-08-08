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
export type ScheduleStatus = '进行中' | '即将开始' | '未开始' | '已结束' | '已取消'
export type TodoScope = 'all' | 'responsible' | 'created' | 'assigned'
export type TodoPriority = '紧急' | '较高' | '普通' | '较低'
export type TodoStatus = '未完成' | '已完成'
export type ApprovalPriority = '高' | '中' | '普通'
export type MessagePriority = 'high' | 'mid' | 'low'
export type BusinessItemStatus = '待关注' | '已关注' | '暂不关注' | '已关闭'
export type ScheduleInsightKind = '会前背景' | 'AI 听记'
export type ScheduleAiAction = '重要' | '释放'
export type TodoAiAction = '优先' | '委派'
export type MessageSummaryCategory = 'followup' | 'decision' | 'risk' | 'business' | 'watch'
export type DigestActionType = 'send_msg' | 'create_todo' | 'create_calendar'
export type DigestWatchType = 'group' | 'user' | 'keyword'
export type ApprovalScope = 'pending' | 'done' | 'initiated' | 'cc'
export type ApprovalStatus = '待审批' | '审批通过' | '审批被拒绝' | '已撤销'
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
  aiAction?: ScheduleAiAction
  aiRationale?: string
  aiActionSuggestion?: string
  aiInsight?: {
    kind: ScheduleInsightKind
    summary: string
    points: string[]
    basisNote: string
  }
  aiMinutes?: {
    summary: string
    actionItems: string[]
  }
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
  sourceDetail?: string
  aiSuggestion?: string
  aiAction?: TodoAiAction
  aiRationale?: string
  delegatable?: boolean
  completed: boolean
  externalId?: string
  comments?: TodoComment[]
}

export interface TodoComment {
  id: string
  author: string
  content: string
  createdAt: string
}

export interface DigestSource {
  id: string
  conversationName: string
  conversationId?: string
  senderName: string
  senderId?: string
  sentAt: string
  content: string
  openMessageId?: string
  groupActionRef?: string
  userActionRef?: string
}

export interface DigestScoreFactor {
  key: string
  label: string
  level: 'message' | 'item'
  rawValue: number
  weight: number
  contribution: number
  basis: string
}

export interface DigestScoreTrace {
  ruleVersion: string
  factors: DigestScoreFactor[]
  matchedSignals: string[]
  degradationReasons: string[]
}

export interface DigestActionOption {
  type: DigestActionType
  enabled: boolean
  disabledReason?: string
  actionRef?: string
}

export interface MessageSummaryItem {
  id: string
  category: MessageSummaryCategory
  title: string
  summary: string
  impact: string
  priority: MessagePriority
  score: number
  isConflict: boolean
  conflictDetail?: string
  latestTime: string
  sourceCount: number
  sources: DigestSource[]
  businessDomain: string
  aiAnalysis: string[]
  scoreTrace: DigestScoreTrace
  actions: DigestActionOption[]
  watchType?: DigestWatchType
  hasHardRisk?: boolean
  hasBreakLine?: boolean
}

export interface EmailSummaryItem {
  id: string
  mailId: string
  subject: string
  senderName: string
  senderEmail: string
  receivedAt: string
  summary: string
  unread: boolean
  important?: boolean
  attachmentCount?: number
}

export interface DigestWatchRule {
  id: string
  type: DigestWatchType
  value: string
  label: string
}

export interface WorkbenchOverviewMetric {
  label: '昨日高优信息' | '今日待决' | '高管日程冲突' | '我创建的临期事项'
  value: string
  note: string
  tone: 'coral' | 'violet' | 'amber' | 'green'
}

export interface ScheduleLoadSummary {
  level: '轻松' | '适中' | '日程偏满'
  meetingCount: number
  occupiedHours: number
  consecutiveCount: number
  releasableCount: number
  suggestion: string
}

export interface TodoPressureSummary {
  mustDoToday: number
  overdue: number
  blocked: number
  delegatable: number
  suggestion: string
}

export interface ApprovalItem {
  id: string
  title: string
  scope: ApprovalScope
  applicant: string
  due: string
  priority: ApprovalPriority
  status: ApprovalStatus
  source: string
  sourceDetail?: string
  aiAction?: '优先'
  aiRationale?: string
  aiSuggestion?: string
}

export interface CalendarDay {
  key: string
  date: Date
  day: number
  inCurrentMonth: boolean
  isToday: boolean
}
