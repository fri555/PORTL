import type { ApprovalItem, DigestWatchRule, MessageSummaryItem, ScheduleItem, TodoComment, TodoItem } from '@/types/workbench'

export type DwsDataSource = 'live' | 'snapshot'

export interface DwsWorkbenchPayload {
  source: DwsDataSource
  connected: boolean
  refreshedAt: string
  identity: {
    name: string
    department: string
    organization: string
  }
  schedules: ScheduleItem[]
  todos: TodoItem[]
  approvals: ApprovalItem[]
  minutesCount: number
  messages: MessageSummaryItem[]
  accessIssues: string[]
}

let cachedWorkbench: DwsWorkbenchPayload | null = null
let inflightWorkbench: Promise<DwsWorkbenchPayload> | null = null

export function getCachedDwsWorkbench() {
  return cachedWorkbench
}

export function clearDwsWorkbenchCache() {
  cachedWorkbench = null
  inflightWorkbench = null
}

async function requestWorkbench(watchRules: DigestWatchRule[] = []) {
  const query = new URLSearchParams()
  if (watchRules.length) query.set('watchRules', JSON.stringify(watchRules.slice(0, 20)))
  const response = await fetch(`/api/dws/workbench${query.size ? `?${query}` : ''}`)
  if (!response.ok) throw new Error('DWS 工作数据暂时不可用')
  return await response.json() as DwsWorkbenchPayload
}

export async function fetchDwsWorkbench(
  options: { force?: boolean; watchRules?: DigestWatchRule[] } = {},
): Promise<DwsWorkbenchPayload> {
  if (!options.force && cachedWorkbench) return cachedWorkbench
  if (inflightWorkbench) return inflightWorkbench

  inflightWorkbench = requestWorkbench(options.watchRules)

  try {
    const payload = await inflightWorkbench
    cachedWorkbench = payload
    return payload
  } finally {
    inflightWorkbench = null
  }
}

export type DwsActionRequest =
  | { action: 'message'; actionRef: string; text: string }
  | {
      action: 'todo'
      executors: string[]
      participants?: string[]
      title: string
      description?: string
      due: string
      reminderTime?: string
      priority: 'urgent' | 'high' | 'normal' | 'low'
    }
  | {
      action: 'calendar'
      title: string
      start: string
      end: string
      timezone: string
      requiredAttendees: string[]
      optionalAttendees?: string[]
      room?: string
      location?: string
      desc?: string
      remindMinutes?: number[]
    }

export interface DwsActionResult {
  success: boolean
  action: DwsActionRequest['action']
  message: string
}

export interface DwsContact {
  ref: string
  name: string
  department?: string
  avatar?: string
}

export interface ExtractedDwsTodo {
  title: string
  description: string
  executors: string[]
  participants: string[]
  due: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
  tags: string[]
}

export async function extractDwsTodos(text: string, now?: string): Promise<{ items: ExtractedDwsTodo[]; mode: 'ai' | 'rules' }> {
  const response = await fetch('/api/dws/todo-extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, now }),
  })
  const payload = await response.json().catch(() => ({})) as { items?: ExtractedDwsTodo[]; mode?: 'ai' | 'rules'; message?: string }
  if (!response.ok) throw new Error(payload.message || '待办提取暂时不可用')
  return { items: payload.items ?? [], mode: payload.mode ?? 'rules' }
}

export async function searchDwsContacts(query: string): Promise<DwsContact[]> {
  const keyword = query.trim()
  if (!keyword) return []
  const response = await fetch(`/api/dws/contacts?query=${encodeURIComponent(keyword)}`)
  const payload = await response.json().catch(() => ({})) as { contacts?: DwsContact[]; message?: string }
  if (!response.ok) throw new Error(payload.message || '通讯录暂时不可用')
  return payload.contacts ?? []
}

export async function suggestDwsContacts(): Promise<DwsContact[]> {
  const response = await fetch('/api/dws/contacts?suggest=1')
  const payload = await response.json().catch(() => ({})) as { contacts?: DwsContact[]; message?: string }
  if (!response.ok) throw new Error(payload.message || '通讯录建议暂时不可用')
  return payload.contacts ?? []
}

export async function executeDwsAction(request: DwsActionRequest): Promise<DwsActionResult> {
  const response = await fetch('/api/dws/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  const payload = await response.json().catch(() => ({})) as Partial<DwsActionResult> & { message?: string }
  if (!response.ok) throw new Error(payload.message || '钉钉操作暂时无法执行')
  return {
    success: payload.success !== false,
    action: payload.action ?? request.action,
    message: payload.message ?? '操作已完成',
  }
}

export async function fetchDwsTodoComments(taskId: string): Promise<TodoComment[]> {
  const response = await fetch(`/api/dws/todos/comments?taskId=${encodeURIComponent(taskId)}`)
  const payload = await response.json().catch(() => ({})) as { comments?: TodoComment[]; message?: string }
  if (!response.ok) throw new Error(payload.message || '待办评论暂时无法读取')
  return payload.comments ?? []
}

export async function publishDwsTodoComment(taskId: string, content: string): Promise<TodoComment> {
  const response = await fetch('/api/dws/todos/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, content }),
  })
  const payload = await response.json().catch(() => ({})) as { comment?: TodoComment; message?: string }
  if (!response.ok || !payload.comment) throw new Error(payload.message || '待办评论发布失败')
  return payload.comment
}
