import { computed, reactive } from 'vue'
import { listPrototypeChatSessions, readPrototypeChatValue, writePrototypeChatValue } from './prototypeChatStore'
import { useTaskCenterStore } from '@/stores/taskCenter'

/**
 * 会话执行运行时（原型级单例）。
 * 支撑「智能体并行开展多个会话」：记录哪些会话正在执行；
 * 组件卸载（用户切走）后由本模块继续倒计时，到点把持久化快照落成 done，
 * 执行结果因此不随页面切换丢失。
 * 执行中的会话同步登记进全局任务中心（M6 联动），悬浮球角标与任务列表可见。
 */

/** 原型演示的单轮执行时长，与 SourceChatDetail 的 scheduleExecution 保持一致。 */
export const SESSION_EXECUTION_DURATION_MS = 1800

export interface SessionRuntimeRecord {
  startedAt: number
  finishesAt: number
  /** 前台：会话详情页挂载中，由组件自己驱动完成；后台：组件已卸载，由本模块倒计时完成。 */
  background: boolean
}

const state = reactive<Record<string, SessionRuntimeRecord>>({})

export const runningSessions = computed(() => Object.keys(state))

export function isSessionRunning(sessionId: string): boolean {
  return !!state[sessionId]
}

/** 开始（或重新登记）一个执行中的会话，默认前台；durationMs 用于演示拉长执行窗口。 */
export function markSessionRunning(sessionId: string, startedAt: number, opts: { background?: boolean; durationMs?: number } = {}) {
  state[sessionId] = {
    startedAt,
    finishesAt: startedAt + (opts.durationMs ?? SESSION_EXECUTION_DURATION_MS),
    background: !!opts.background,
  }
  syncTaskCenter(sessionId, startedAt)
  ensureTicker()
}

/** 用户回到正在执行的会话：转前台，进度由详情页接管。 */
export function markSessionForeground(sessionId: string, startedAt: number, durationMs?: number) {
  if (state[sessionId]) state[sessionId].background = false
  else markSessionRunning(sessionId, startedAt, { durationMs })
  ensureTicker()
}

/** 用户切走正在执行的会话：转后台，由本模块倒计时完成。 */
export function markSessionBackground(sessionId: string, startedAt: number, durationMs?: number) {
  markSessionRunning(sessionId, startedAt, { background: true, durationMs })
}

/** 执行结束后清除运行时记录；result 传入时同步更新任务中心里的会话任务状态。 */
export function clearSessionRuntime(sessionId: string, result?: 'success' | 'cancelled' | 'failed') {
  delete state[sessionId]
  if (result) finishTaskCenterSession(sessionId, result)
}

// ─── 任务中心联动 ───────────────────────────────────────────────────────────

function sessionTaskName(sessionId: string): string {
  const session = listPrototypeChatSessions().find(item => item.id === sessionId)
  const prompt = session?.prompt?.trim()
  if (prompt) return prompt.length > 24 ? prompt.slice(0, 24) + '…' : prompt
  return `智能体会话 ${sessionId}`
}

function syncTaskCenter(sessionId: string, startedAt: number) {
  try {
    useTaskCenterStore().registerSessionTask({ sessionId, name: sessionTaskName(sessionId), startedAt })
  } catch { /* 任务中心不可用时（极端测试环境）不影响会话执行 */ }
}

function finishTaskCenterSession(sessionId: string, status: 'success' | 'cancelled' | 'failed') {
  try {
    useTaskCenterStore().finishSessionTask(sessionId, status)
  } catch { /* 同上 */ }
}

let ticker: number | undefined
function ensureTicker() {
  if (ticker !== undefined) return
  ticker = window.setInterval(tick, 200)
}
function tick() {
  const now = Date.now()
  let backgroundLeft = false
  for (const id of Object.keys(state)) {
    const record = state[id]
    if (!record.background) continue
    if (now >= record.finishesAt) finishBackgroundSession(id)
    else backgroundLeft = true
  }
  if (!backgroundLeft) {
    window.clearInterval(ticker)
    ticker = undefined
  }
}

/** 后台到点：把持久化快照从 running 落成 done，结果写回原会话，并同步任务中心。 */
function finishBackgroundSession(id: string) {
  const record = state[id]
  const snapshot = readPrototypeChatValue<Record<string, unknown>>('plan:' + id)
  if (snapshot && typeof snapshot === 'object' && snapshot.status === 'running') {
    writePrototypeChatValue('plan:' + id, { ...snapshot, status: 'done', finishedAt: record.finishesAt })
  }
  delete state[id]
  finishTaskCenterSession(id, 'success')
}
