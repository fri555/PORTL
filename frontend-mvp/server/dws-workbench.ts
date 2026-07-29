import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import type { Connect, Plugin } from 'vite'
import type { DigestWatchRule, TodoComment } from '../src/types/workbench'
import { buildDigestItems, type RawDigestMessage } from './information-digest'

const execFileAsync = promisify(execFile)
const DWS_BINARY = process.env.DWS_BIN || (existsSync('/opt/homebrew/bin/dws') ? '/opt/homebrew/bin/dws' : 'dws')
const SNAPSHOT_PATH = path.resolve(process.cwd(), '.local/dws/chao-mu.json')
const messageTargets = new Map<string, { group?: string; user?: string }>()
const contactSuggestions = new Map<string, { name: string; department: string; avatar?: string }>()
let currentIdentityUserId = ''
let currentIdentityName = ''

type JsonRecord = Record<string, unknown>

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

function nestedRecord(value: unknown): JsonRecord {
  const root = record(value)
  return record(root.data ?? root.result ?? root)
}

function arrayAt(value: unknown, ...keys: string[]): JsonRecord[] {
  const queue: unknown[] = [value]
  for (let depth = 0; depth < 4 && queue.length; depth += 1) {
    const breadth = queue.splice(0)
    for (const item of breadth) {
      const root = record(item)
      for (const key of keys) {
        const candidate = root[key]
        if (Array.isArray(candidate)) return candidate.map(record)
      }
      for (const candidate of Object.values(root)) {
        if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) queue.push(candidate)
      }
    }
  }
  return []
}

export function contactSearchCandidates(value: unknown): JsonRecord[] {
  const directResult = record(value).result
  if (Array.isArray(directResult)) return directResult.map(record)
  return arrayAt(value, 'users', 'items', 'list', 'records')
}

function contactNames(item: JsonRecord) {
  return [item.name, item.userName, item.nick, item.flowerName].map((value) => text(value)).filter(Boolean)
}

export function selectUniqueContact(candidates: JsonRecord[], query: string) {
  const exact = candidates.filter((item) => contactNames(item).includes(query))
  if (exact.length > 1) throw new Error(`找到多位同名人员：${query}，请在通讯录中选择具体人员`)
  if (exact.length === 1) return exact[0]
  if (candidates.length > 1) throw new Error(`无法唯一确认人员：${query}，请在通讯录中选择具体人员`)
  return candidates[0]
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function findText(value: unknown, keys: string[]) {
  const queue: unknown[] = [value]
  for (let depth = 0; depth < 5 && queue.length; depth += 1) {
    const breadth = queue.splice(0)
    for (const item of breadth) {
      const root = record(item)
      for (const key of keys) {
        const found = text(root[key])
        if (found) return found
      }
      for (const candidate of Object.values(root)) {
        if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) queue.push(candidate)
      }
    }
  }
  return ''
}

function dateTime(value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const item = record(value)
    return dateTime(
      item.dateTime
      ?? item.datetime
      ?? item.date_time
      ?? item.startTime
      ?? item.endTime
      ?? item.timestamp
      ?? item.time
      ?? item.value,
    )
  }
  if (typeof value === 'number') {
    const milliseconds = value < 10_000_000_000 ? value * 1000 : value
    return dateTime(new Date(milliseconds).toISOString())
  }
  const raw = text(value)
  if (!raw) return ''
  if (/^\d{10,13}$/.test(raw)) {
    const numeric = Number(raw)
    const milliseconds = raw.length === 10 ? numeric * 1000 : numeric
    return dateTime(new Date(milliseconds).toISOString())
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)) return raw.slice(0, 16)
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed)
}

function messageText(value: unknown) {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return messageText(parsed) || value
    } catch {
      return value
    }
  }
  const item = record(value)
  return text(item.text ?? item.content ?? item.title ?? item.message)
}

function collectConversationMessages(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.flatMap((item) => collectConversationMessages(item))
  const rootValue = record(value)
  if (Array.isArray(rootValue.pages)) return rootValue.pages.flatMap((page) => collectConversationMessages(page))
  const conversations = arrayAt(value, 'conversationMessagesList')
  if (!conversations.length) return arrayAt(value, 'messages', 'messageList', 'items', 'records', 'list')
  return conversations.flatMap((conversation) => {
    const conversationName = text(conversation.title ?? conversation.conversationName, '钉钉会话')
    const conversationId = text(conversation.openConversationId ?? conversation.conversationId)
    return arrayAt(conversation, 'messages').map((message) => ({
      ...message,
      conversationName,
      openConversationId: message.openConversationId ?? conversationId,
      singleChat: conversation.singleChat,
    }))
  })
}

function readableTime(value: unknown) {
  const formatted = dateTime(value)
  if (!formatted) return '近 7 天'
  return formatted.slice(0, 10) === dateTime(new Date().toISOString()).slice(0, 10)
    ? `今天 ${formatted.slice(11, 16)}`
    : formatted.slice(5)
}

function todoPriority(value: unknown) {
  const priority = Number(value)
  if (priority >= 40) return '紧急' as const
  if (priority >= 30) return '较高' as const
  if (priority >= 20) return '普通' as const
  return '较低' as const
}

function todoScopes(value: unknown) {
  const roles = Array.isArray(value) ? value.map(String) : text(value).split(',').filter(Boolean)
  const scopes: Array<'responsible' | 'created' | 'assigned'> = []
  if (roles.includes('creator')) scopes.push('created')
  if (roles.includes('executor')) scopes.push('responsible')
  if (roles.includes('participant')) scopes.push('assigned')
  return scopes.length ? scopes : ['responsible']
}

function collectTodoCards(value: unknown) {
  const collected = new Map<string, JsonRecord & { __roles: string[]; __completed?: boolean }>()
  const visit = (input: unknown, roles: string[] = [], completed?: boolean) => {
    if (!input || typeof input !== 'object') return
    if (Array.isArray(input)) {
      input.forEach((item) => visit(item, roles, completed))
      return
    }
    const item = record(input)
    const nextRoles = [...roles]
    const role = text(item.role)
    if (role && !nextRoles.includes(role)) nextRoles.push(role)
    const roleTypes = Array.isArray(item.roleTypes) ? item.roleTypes.map(String) : []
    for (const roleType of roleTypes) if (!nextRoles.includes(roleType)) nextRoles.push(roleType)
    const completedHint = typeof item.completed === 'boolean' ? item.completed : completed
    const cards = item.todoCards
    if (Array.isArray(cards)) {
      for (const rawCard of cards) {
        const card = record(rawCard)
        const key = text(card.taskId, `${text(card.subject ?? card.title)}-${text(card.createdTime)}`)
        const existing = collected.get(key)
        const mergedRoles = [...new Set([...(existing?.__roles ?? []), ...nextRoles, ...(Array.isArray(card.roleTypes) ? card.roleTypes.map(String) : [])])]
        collected.set(key, { ...(existing ?? {}), ...card, __roles: mergedRoles, __completed: completedHint })
      }
    }
    for (const [key, nested] of Object.entries(item)) {
      if (key === 'todoCards') continue
      const keyedRole = ['creator', 'executor', 'participant'].includes(key) ? key : undefined
      const keyedCompleted = key === 'completed' ? true : key === 'pending' ? false : completedHint
      visit(nested, keyedRole ? [...nextRoles, keyedRole] : nextRoles, keyedCompleted)
    }
  }
  visit(value)
  return [...collected.values()]
}

function normalizedMeetingTitle(value: unknown) {
  return text(value)
    .toLowerCase()
    .replace(/[（）()【】[\]\s·_\-—:：,，。.!！?？]/g, '')
    .replace(/会议|视频|钉钉/g, '')
}

function minuteSummaryText(value: unknown) {
  if (typeof value === 'string') return value.trim()
  const result = record(value).result
  if (typeof result === 'string') return result.trim()
  return findText(value, ['fullSummary', 'summary', 'content']).replace(/^#+\s*/gm, '').trim()
}

function summaryPoints(summary: string) {
  return summary
    .split(/\n+|(?<=[。！？])/)
    .map((item) => item.replace(/^[-*•\d.\s]+/, '').trim())
    .filter((item) => item.length >= 6)
    .slice(0, 3)
}

function matchingMinute(event: JsonRecord, minuteDetails: JsonRecord[]) {
  const eventTitle = normalizedMeetingTitle(event.title ?? event.summary)
  const eventStart = dateTime(event.start ?? event.startTime)
  const candidates = minuteDetails.filter((minute) => {
    const minuteTitle = normalizedMeetingTitle(minute.title ?? minute.name)
    const titleMatches = Boolean(eventTitle && minuteTitle) && (eventTitle === minuteTitle
      || (Math.min(eventTitle.length, minuteTitle.length) >= 4 && (eventTitle.includes(minuteTitle) || minuteTitle.includes(eventTitle)))
    )
    const minuteStart = dateTime(minute.startTime ?? minute.start)
    if (!minuteStart || !eventStart) return titleMatches && eventTitle === minuteTitle
    const distance = Math.abs(new Date(`${minuteStart.replace(' ', 'T')}:00+08:00`).getTime() - new Date(`${eventStart.replace(' ', 'T')}:00+08:00`).getTime())
    const sameDay = minuteStart.slice(0, 10) === eventStart.slice(0, 10)
    return sameDay && (distance <= 30 * 60 * 1000 || (titleMatches && distance <= 6 * 60 * 60 * 1000))
  })
  return candidates.length === 1 ? candidates[0] : undefined
}

function scheduleStatus(start: string, end: string) {
  const current = Date.now()
  const startTime = new Date(start.replace(' ', 'T') + ':00+08:00').getTime()
  const endTime = new Date(end.replace(' ', 'T') + ':00+08:00').getTime()
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return '未开始'
  if (current >= endTime) return '已结束'
  if (current >= startTime) return '进行中'
  if (startTime - current <= 30 * 60 * 1000) return '即将开始'
  return '未开始'
}

export function sanitizeSnapshot(
  raw: unknown,
  source: 'live' | 'snapshot',
  accessIssues: string[] = [],
  watchRules: DigestWatchRule[] = [],
) {
  const root = nestedRecord(raw)
  const identitySource = nestedRecord(root.identity ?? root.me)
  const calendarSource = root.calendar ?? root
  const todoSource = root.todos ?? root
  const approvalSource = root.approvals ?? root
  const minutesSource = nestedRecord(root.minutes ?? {})
  const events = arrayAt(calendarSource, 'events', 'items')
  const structuredTodos = collectTodoCards(todoSource)
  const todos = structuredTodos.length ? structuredTodos : arrayAt(todoSource, 'todos', 'tasks', 'items', 'todoCards')
  const approvals = arrayAt(approvalSource, 'instances', 'approvals', 'items')
  const rawMinutes = record(root.minutes)
  const detailedMinutes = arrayAt(rawMinutes.details, 'minutesDetails', 'minutes', 'items', 'records')
  const listedMinutes = arrayAt(rawMinutes.list ?? rawMinutes, 'itemList', 'items', 'list', 'records', 'minutes')
  const minuteDetails = detailedMinutes.length ? detailedMinutes : listedMinutes
  const minuteSummaries = record(rawMinutes.summaries)
  const rawMessages = collectConversationMessages(root.messages)
  const identityId = text(identitySource.userId ?? identitySource.userid ?? identitySource.staffId)
  const identityName = text(identitySource.name ?? identitySource.userName, '当前用户')
  const rawDigestMessages: RawDigestMessage[] = rawMessages.map((message, index) => ({
    id: text(message.msgId ?? message.messageId ?? message.openMsgId, `dws-message-${index + 1}`),
    conversationId: text(message.openConversationId ?? message.conversationId ?? message.chatId),
    conversationName: text(message.conversationName ?? message.chatName ?? message.groupName, '钉钉会话'),
    singleChat: message.singleChat === true,
    senderId: text(message.senderUserId ?? message.senderOpenDingTalkId ?? message.userId),
    senderName: text(message.senderName ?? message.senderNick ?? message.sender, '钉钉用户'),
    sentAt: dateTime(message.createTime ?? message.sendTime ?? message.createdAt),
    content: messageText(message.content ?? message.message ?? message.text),
    openMessageId: text(message.openMsgId ?? message.msgId ?? message.messageId),
  }))
  if (source === 'live') {
    contactSuggestions.clear()
    if (identityId && identityName) {
      contactSuggestions.set(identityId, {
        name: identityName,
        department: text(identitySource.department ?? identitySource.dept ?? identitySource.deptName, '当前账号'),
        avatar: text(identitySource.avatar ?? identitySource.avatarUrl) || undefined,
      })
    }
    rawDigestMessages.forEach((message) => {
      if (!message.senderId || !message.senderName || message.senderId === identityId || message.senderName === '钉钉用户') return
      contactSuggestions.set(message.senderId, {
        name: message.senderName,
        department: message.singleChat ? '最近联系人' : message.conversationName,
      })
    })
  }
  const messages = buildDigestItems({
    currentUser: { id: identityId, name: identityName },
    messages: rawDigestMessages,
    watchRules,
  }).map((item) => {
    const sources = item.sources.map((sourceRecord) => {
      const groupActionRef = sourceRecord.conversationId ? randomUUID() : undefined
      const userActionRef = sourceRecord.senderId ? randomUUID() : undefined
      if (groupActionRef) messageTargets.set(groupActionRef, { group: sourceRecord.conversationId })
      if (userActionRef) messageTargets.set(userActionRef, { user: sourceRecord.senderId })
      return { ...sourceRecord, groupActionRef, userActionRef }
    })
    const actionRef = sources[0]?.groupActionRef ?? sources[0]?.userActionRef
    return {
      ...item,
      sources,
      actions: item.actions.map((action) => {
        if (action.type === 'send_msg') {
          return actionRef
            ? { ...action, enabled: true, disabledReason: undefined, actionRef }
            : { ...action, enabled: false, disabledReason: '消息来源缺少可发送目标' }
        }
        return identityId
          ? { ...action, enabled: true, disabledReason: undefined }
          : { ...action, enabled: false, disabledReason: '当前身份不可用于写入' }
      }),
    }
  })

  const schedules = events.map((event, index) => {
    const start = dateTime(event.start ?? event.startTime)
    const end = dateTime(event.end ?? event.endTime)
    const minute = matchingMinute(event, minuteDetails)
    const minuteId = text(minute?.taskUuid ?? minute?.uuid ?? minute?.id)
    const summary = minuteId ? minuteSummaryText(minuteSummaries[minuteId]) : ''
    return {
      id: `dws-schedule-${index + 1}`,
      date: start.slice(0, 10),
      start: start.slice(11, 16),
      end: end.slice(11, 16),
      title: text(event.title ?? event.summary, '未命名日程'),
      location: text(event.location, '钉钉日程'),
      participantCount: Number(event.participantCount ?? 0),
      status: scheduleStatus(start, end),
      ...(summary ? {
        aiInsight: {
          kind: 'AI 听记' as const,
          summary: summary.slice(0, 360),
          points: summaryPoints(summary),
          basisNote: '来自当前用户有权限访问的钉钉 AI 听记；按会议标题和时间高置信匹配。',
        },
      } : {}),
    }
  })
  const mappedTodos = todos.slice(0, 60).map((todo, index) => {
    const completed = todo.__completed === true || Number(todo.finalStatusStage) >= 2 || text(todo.status) === '已完成'
    return {
      id: `dws-todo-${text(todo.taskId, String(index + 1))}`,
      externalId: text(todo.taskId) || undefined,
      title: text(todo.title ?? todo.subject, '未命名待办'),
      scopes: todoScopes(todo.__roles ?? todo.roleTypes),
      due: todo.dueTime || todo.due ? readableTime(todo.dueTime ?? todo.due) + (completed ? '' : ' 截止') : '暂无截止时间',
      priority: todoPriority(todo.priority),
      status: completed ? '已完成' as const : '未完成' as const,
      source: '钉钉待办',
      owner: '朝暮',
      creator: text(todo.creatorName, todoScopes(todo.__roles ?? todo.roleTypes).includes('created') ? '朝暮' : '钉钉用户'),
      assignee: '朝暮',
      latestUpdate: readableTime(todo.updatedAt ?? todo.createdTime),
      completed,
    }
  })
  return {
    source,
    connected: true,
    refreshedAt: text(root.capturedAt, new Date().toISOString()),
    identity: {
      name: text(identitySource.name ?? identitySource.userName, '朝暮'),
      department: text(identitySource.department ?? identitySource.dept ?? identitySource.deptName, 'AI项目组'),
      organization: text(identitySource.organization ?? identitySource.org ?? identitySource.corpName, '江苏天马网络科技集团有限公司'),
    },
    schedules,
    todos: mappedTodos,
    approvals: approvals.slice(0, 30).map((approval, index) => ({
      id: `dws-approval-${index + 1}`,
      title: text(approval.title ?? approval.processInstanceName, '待处理审批'),
      scope: 'pending' as const,
      applicant: text(approval.applicantName ?? approval.originatorUserName, '钉钉用户'),
      due: text(approval.due, '待处理'),
      priority: '普通' as const,
      status: '待审批' as const,
      source: '钉钉 OA',
    })),
    minutesCount: Number(minutesSource.count ?? minuteDetails.length ?? 0),
    messages,
    accessIssues,
  }
}

async function runDws(args: string[]) {
  const { stdout } = await execFileAsync(DWS_BINARY, [...args, '--format', 'json'], {
    timeout: 20_000,
    maxBuffer: 2 * 1024 * 1024,
  })
  return JSON.parse(stdout)
}

type DwsRunner = (args: string[]) => Promise<unknown>

export function executeTodoCommentRequest(run: DwsRunner, method: 'GET', taskId: string): Promise<TodoComment[]>
export function executeTodoCommentRequest(run: DwsRunner, method: 'POST', taskId: string, content: string): Promise<TodoComment>
export async function executeTodoCommentRequest(run: DwsRunner, method: 'GET' | 'POST', taskId: string, content = ''): Promise<TodoComment[] | TodoComment> {
  if (!taskId.trim() || taskId.length > 200) throw new Error('待办任务 ID 无效')
  if (method === 'GET') {
    const payload = await run(['todo', 'comment', 'list', '--task-id', taskId, '--page', '1', '--size', '20'])
    return arrayAt(payload, 'comments', 'list', 'items', 'records').map((value, index) => ({
      id: text(value.commentId ?? value.id, `comment-${index + 1}`),
      author: text(value.creatorName ?? value.authorName ?? value.userName, '钉钉用户'),
      content: text(value.content ?? value.text),
      createdAt: dateTime(value.createTime ?? value.createdAt) || '时间未知',
    })).filter((comment) => comment.content)
  }
  if (!content.trim() || content.length > 2000) throw new Error('评论内容无效')
  const payload = await run(['todo', 'comment', 'add', '--task-id', taskId, '--content', content.trim()])
  const value = nestedRecord(payload)
  return {
    id: text(value.commentId ?? value.id, `comment-${Date.now()}`),
    author: text(value.creatorName ?? value.authorName ?? value.userName, '当前用户'),
    content: text(value.content ?? value.text, content.trim()),
    createdAt: dateTime(value.createTime ?? value.createdAt) || '刚刚',
  }
}

export async function loadAllChatMessages(
  run: DwsRunner,
  start: string,
  end: string,
) {
  const pages: unknown[] = []
  let cursor = '0'
  let total = 0
  while (total < 2000) {
    const payload = await run([
      'chat', 'message', 'list-all',
      '--start', start,
      '--end', end,
      '--limit', '100',
      '--cursor', cursor,
    ])
    pages.push(payload)
    const root = nestedRecord(payload)
    total += collectConversationMessages(payload).length
    if (root.hasMore !== true || !text(root.nextCursor)) break
    cursor = text(root.nextCursor)
  }
  return { pages }
}

async function loadTodoBuckets() {
  const roles = ['creator', 'executor', 'participant'] as const
  const statuses = [
    { completed: false, value: 'false' },
    { completed: true, value: 'true' },
  ] as const
  const results = await Promise.allSettled(statuses.flatMap((status) => roles.map(async (role) => ({
    role,
    completed: status.completed,
    payload: await runDws([
      'todo', 'task', 'list',
      '--page', '1',
      '--size', '30',
      '--status', status.value,
      '--role-types', role,
    ]),
  }))))
  const buckets = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
  if (!buckets.length) throw new Error('钉钉待办暂不可读取')
  return { buckets }
}

async function loadMinutesData(rangeStart: string, rangeEnd: string) {
  const list = await runDws(['minutes', 'list', 'all', '--start', rangeStart, '--end', rangeEnd, '--limit', '30'])
  const listedMinutes = arrayAt(list, 'itemList', 'items', 'list', 'records', 'minutes')
  const ids = [...new Set(listedMinutes.map((minute) => text(minute.taskUuid ?? minute.uuid ?? minute.id)).filter(Boolean))].slice(0, 30)
  if (!ids.length) return { list, details: {}, summaries: {} }
  const details = await runDws(['minutes', 'get', 'batch', '--ids', ids.join(',')]).catch(() => ({}))
  const detailRows = arrayAt(details, 'minutesDetails', 'minutes', 'items', 'records')
  const summaryIds = [...new Set((detailRows.length ? detailRows : listedMinutes)
    .map((minute) => text(minute.taskUuid ?? minute.uuid ?? minute.id))
    .filter(Boolean))]
    .slice(0, 10)
  const summaryResults = await Promise.allSettled(summaryIds.map(async (id) => ({
    id,
    payload: await runDws(['minutes', 'get', 'summary', '--id', id]),
  })))
  const summaries = Object.fromEntries(summaryResults.flatMap((result) => result.status === 'fulfilled' ? [[result.value.id, result.value.payload]] : []))
  return { list, details, summaries }
}

async function loadLiveData(watchRules: DigestWatchRule[] = []) {
  const rangeEnd = new Date()
  rangeEnd.setHours(23, 59, 59, 999)
  const rangeStart = new Date()
  rangeStart.setDate(rangeStart.getDate() - 6)
  rangeStart.setHours(0, 0, 0, 0)
  const iso = (value: Date) => `${new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(value).replace(' ', 'T')}+08:00`
  const chatTime = (value: Date) => new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(value)
  const identity = await runDws(['contact', '+me'])
  const identityRecord = nestedRecord(identity)
  currentIdentityUserId = findText(identityRecord, ['userId', 'userid', 'staffId', 'unionId'])
  currentIdentityName = findText(identityRecord, ['name', 'userName'])
  const rangeStartIso = iso(rangeStart)
  const rangeEndIso = iso(rangeEnd)
  const sources = await Promise.allSettled([
    runDws(['calendar', '+agenda', '--start', rangeStartIso, '--end', rangeEndIso, '--limit', '100']),
    loadTodoBuckets(),
    runDws(['oa', '+list-pending', '--start', String(rangeStart.getTime()), '--end', String(rangeEnd.getTime()), '--page', '1', '--limit', '30']),
    loadMinutesData(rangeStartIso, rangeEndIso),
    loadAllChatMessages(runDws, chatTime(rangeStart), chatTime(rangeEnd)),
  ])
  const labels = ['近 7 天日程', '钉钉待办', '近 7 天审批', 'AI 听记', '近 7 天消息']
  const issues = sources.flatMap((result, index) => result.status === 'rejected' ? [`${labels[index]}暂不可读取`] : [])
  const value = (index: number) => sources[index]?.status === 'fulfilled' ? sources[index].value : {}
  return sanitizeSnapshot({
    identity,
    calendar: value(0),
    todos: value(1),
    approvals: value(2),
    minutes: value(3),
    messages: value(4),
    capturedAt: new Date().toISOString(),
  }, 'live', issues, watchRules)
}

async function loadSnapshot() {
  const raw = JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8'))
  return sanitizeSnapshot(raw, 'snapshot')
}

async function readJsonBody(request: Connect.IncomingMessage) {
  return await new Promise<JsonRecord>((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    request.on('data', (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += buffer.length
      if (size > 32 * 1024) {
        reject(new Error('请求内容过大'))
        request.destroy()
        return
      }
      chunks.push(buffer)
    })
    request.on('end', () => {
      try {
        resolve(record(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')))
      } catch {
        reject(new Error('请求格式无效'))
      }
    })
    request.on('error', reject)
  })
}

function watchRulesFromUrl(requestUrl = ''): DigestWatchRule[] {
  const raw = new URL(requestUrl, 'http://localhost').searchParams.get('watchRules')
  if (!raw) return []
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed) || parsed.length > 20) throw new Error('关注规则无效')
  return parsed.map((value, index) => {
    const item = record(value)
    const type = text(item.type)
    const ruleValue = text(item.value)
    if (!['group', 'user', 'keyword'].includes(type) || !ruleValue) throw new Error('关注规则无效')
    return {
      id: text(item.id, `watch-${index + 1}`),
      type: type as DigestWatchRule['type'],
      value: ruleValue,
      label: text(item.label, ruleValue),
    }
  })
}

function requiredString(body: JsonRecord, key: string, maxLength: number) {
  const value = text(body[key])
  if (!value) throw new Error(`${key} 不能为空`)
  if (value.length > maxLength) throw new Error(`${key} 内容过长`)
  return value
}

function optionalString(body: JsonRecord, key: string, maxLength: number) {
  const value = text(body[key])
  if (value.length > maxLength) throw new Error(`${key} 内容过长`)
  return value
}

function isoDate(body: JsonRecord, key: string) {
  const value = requiredString(body, key, 40)
  if (Number.isNaN(new Date(value).getTime())) throw new Error(`${key} 时间格式无效`)
  return value
}

function requiredStringArray(body: JsonRecord, key: string, maxItems = 100) {
  const value = body[key]
  if (!Array.isArray(value) || !value.length || value.length > maxItems) throw new Error(`${key} 不能为空`)
  const items = value.map((item) => text(item)).filter(Boolean)
  if (items.length !== value.length) throw new Error(`${key} 格式无效`)
  return items
}

function optionalStringArray(body: JsonRecord, key: string, maxItems = 100) {
  const value = body[key]
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(`${key} 格式无效`)
  const items = value.map((item) => text(item)).filter(Boolean)
  if (items.length !== value.length) throw new Error(`${key} 格式无效`)
  return [...new Set(items)]
}

async function resolveUserIds(names: string[]) {
  const ids: string[] = []
  for (const name of names) {
    if (['current-user', '当前用户', '我', currentIdentityName].includes(name)) {
      ids.push(currentIdentityUserId)
      continue
    }
    const referencedUserId = messageTargets.get(name)?.user
    if (referencedUserId) {
      ids.push(referencedUserId)
      continue
    }
    const result = await runDws(['contact', 'user', 'search', '--query', name])
    const candidates = contactSearchCandidates(result)
    const exact = selectUniqueContact(candidates, name)
    const userId = exact && findText(exact, ['userId', 'userid', 'staffId', 'unionId'])
    if (!userId) throw new Error(`未找到执行人或参与人：${name}`)
    ids.push(userId)
  }
  return [...new Set(ids)]
}

async function searchContacts(query: string) {
  const result = await runDws(['contact', 'user', 'search', '--query', query])
  return contactSearchCandidates(result).slice(0, 12).flatMap((item) => {
    const userId = findText(item, ['userId', 'userid', 'staffId', 'unionId'])
    const name = findText(item, ['name', 'userName', 'nick', 'flowerName'])
    if (!userId || !name) return []
    const ref = randomUUID()
    messageTargets.set(ref, { user: userId })
    return [{
      ref,
      name,
      department: findText(item, ['departmentName', 'deptName', 'department']),
      avatar: findText(item, ['avatar', 'avatarUrl']),
    }]
  })
}

export function suggestedContacts() {
  return [...contactSuggestions.entries()].slice(0, 12).map(([userId, item]) => {
    const ref = randomUUID()
    messageTargets.set(ref, { user: userId })
    return { ref, ...item }
  })
}

async function executeAction(body: JsonRecord) {
  const action = text(body.action)
  if (action === 'message') {
    const actionRef = requiredString(body, 'actionRef', 100)
    const target = messageTargets.get(actionRef)
    if (!target) throw new Error('消息来源已失效，请刷新工作台后重试')
    const content = requiredString(body, 'text', 5000)
    const targetFlag = target.group ? '--group' : '--user'
    const targetId = target.group ?? target.user
    if (!targetId) throw new Error('当前消息没有可用的发送对象')
    await runDws(['chat', 'message', 'send', targetFlag, targetId, '--text', content, '--uuid', randomUUID()])
    return { success: true, action, message: '消息已发送至钉钉' }
  }

  if (!currentIdentityUserId) throw new Error('当前为快照模式，请恢复 DWS 实时连接后执行')

  if (action === 'todo') {
    const title = requiredString(body, 'title', 200)
    const description = optionalString(body, 'description', 5000)
    const due = isoDate(body, 'due')
    const executorIds = await resolveUserIds(requiredStringArray(body, 'executors', 20))
    const participantRefs = optionalStringArray(body, 'participants', 50)
    const participantIds = participantRefs.length ? await resolveUserIds(participantRefs) : []
    const tags = optionalStringArray(body, 'tags', 10)
    const priority = text(body.priority, 'normal')
    const priorityValue = ({ high: '40', normal: '20', low: '10' } as Record<string, string>)[priority]
    if (!priorityValue) throw new Error('priority 仅支持 high、normal、low')
    const args = ['todo', 'task', 'create', '--title', title, '--executors', executorIds.join(','), '--due', due, '--priority', priorityValue]
    const created = await runDws(args)
    const taskId = findText(created, ['taskId', 'task_id', 'id'])
    const warnings: string[] = []
    if (participantIds.length && taskId) {
      try {
        await runDws(['todo', 'task', 'add-participant', '--task-id', taskId, '--participants', participantIds.join(',')])
      } catch {
        warnings.push('参与人未能同步')
      }
    } else if (participantIds.length) warnings.push('参与人未能同步')
    const note = [description, tags.length ? `标签：${tags.join('、')}` : ''].filter(Boolean).join('\n').slice(0, 2000)
    if (note && taskId) {
      try {
        await runDws(['todo', 'comment', 'add', '--task-id', taskId, '--content', note])
      } catch {
        warnings.push('描述或标签未能同步')
      }
    } else if (note) warnings.push('描述或标签未能同步')
    return { success: true, action, message: warnings.length ? `待办已创建到钉钉；${warnings.join('、')}` : '待办已创建到钉钉' }
  }

  if (action === 'calendar') {
    const title = requiredString(body, 'title', 200)
    const start = isoDate(body, 'start')
    const end = isoDate(body, 'end')
    if (new Date(start).getTime() >= new Date(end).getTime()) throw new Error('日程结束时间必须晚于开始时间')
    const desc = optionalString(body, 'desc', 5000)
    const location = optionalString(body, 'location', 500)
    const room = optionalString(body, 'room', 200)
    const timezone = requiredString(body, 'timezone', 80)
    const requiredAttendees = requiredStringArray(body, 'requiredAttendees', 500)
    const optionalAttendees = Array.isArray(body.optionalAttendees) ? body.optionalAttendees.map(text).filter(Boolean) : []
    const attendeeIds = await resolveUserIds([...requiredAttendees, ...optionalAttendees])
    const remindMinutes = Array.isArray(body.remindMinutes) ? body.remindMinutes.map(Number) : [15]
    if (remindMinutes.some((value) => !Number.isInteger(value) || value < 0 || value > 10080)) throw new Error('提醒时间无效')
    const args = ['calendar', 'event', 'create', '--title', title, '--start', start, '--end', end, '--timezone', timezone, '--attendees', attendeeIds.join(','), '--remind-minutes', remindMinutes.join(',')]
    if (desc) args.push('--desc', desc)
    if (location) args.push('--location', location)
    if (room) args.push('--rooms', room)
    await runDws(args)
    return { success: true, action, message: '日程已创建到钉钉' }
  }

  throw new Error('不支持的钉钉操作')
}

function handler(): Connect.NextHandleFunction {
  return async (request, response, next) => {
    const pathname = request.url?.split('?')[0]
    if (pathname !== '/api/dws/workbench' && pathname !== '/api/dws/actions' && pathname !== '/api/dws/todos/comments' && pathname !== '/api/dws/contacts') return next()
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.setHeader('Cache-Control', 'no-store')
    if (pathname === '/api/dws/contacts') {
      if (request.method !== 'GET') {
        response.statusCode = 405
        response.end(JSON.stringify({ message: '仅支持 GET 请求' }))
        return
      }
      try {
        const searchParams = new URL(request.url ?? '', 'http://localhost').searchParams
        const query = searchParams.get('query')?.trim() ?? ''
        const suggestions = searchParams.get('suggest') === '1'
        if (suggestions) {
          response.statusCode = 200
          response.end(JSON.stringify({ contacts: suggestedContacts() }))
          return
        }
        if (!query) throw new Error('请输入姓名或部门')
        response.statusCode = 200
        response.end(JSON.stringify({ contacts: await searchContacts(query) }))
      } catch (error) {
        response.statusCode = 400
        response.end(JSON.stringify({ message: error instanceof Error ? error.message : '通讯录搜索失败' }))
      }
      return
    }
    if (pathname === '/api/dws/todos/comments') {
      try {
        if (request.method === 'GET') {
          const taskId = new URL(request.url ?? '', 'http://localhost').searchParams.get('taskId') ?? ''
          const comments = await executeTodoCommentRequest(runDws, 'GET', taskId)
          response.statusCode = 200
          response.end(JSON.stringify({ comments }))
          return
        }
        if (request.method === 'POST') {
          const body = await readJsonBody(request)
          const comment = await executeTodoCommentRequest(runDws, 'POST', requiredString(body, 'taskId', 200), requiredString(body, 'content', 2000))
          response.statusCode = 200
          response.end(JSON.stringify({ comment }))
          return
        }
        response.statusCode = 405
        response.end(JSON.stringify({ message: '仅支持 GET 或 POST 请求' }))
      } catch (error) {
        response.statusCode = 400
        response.end(JSON.stringify({ message: error instanceof Error ? error.message : '钉钉评论操作失败' }))
      }
      return
    }
    if (pathname === '/api/dws/actions') {
      if (request.method !== 'POST') {
        response.statusCode = 405
        response.end(JSON.stringify({ message: '仅支持 POST 请求' }))
        return
      }
      try {
        const result = await executeAction(await readJsonBody(request))
        response.statusCode = 200
        response.end(JSON.stringify(result))
      } catch (error) {
        response.statusCode = 400
        response.end(JSON.stringify({ message: error instanceof Error ? error.message : '钉钉操作执行失败' }))
      }
      return
    }
    if (request.method !== 'GET') {
      response.statusCode = 405
      response.end(JSON.stringify({ message: '仅支持 GET 请求' }))
      return
    }
    try {
      const data = await loadLiveData(watchRulesFromUrl(request.url))
      response.statusCode = 200
      response.end(JSON.stringify(data))
    } catch {
      response.statusCode = 503
      response.end(JSON.stringify({ message: 'DWS 工作数据暂时不可用' }))
    }
  }
}

export function dwsWorkbenchPlugin(): Plugin {
  return {
    name: 'tianma-dws-workbench',
    configureServer(server) {
      server.middlewares.use(handler())
    },
  }
}
