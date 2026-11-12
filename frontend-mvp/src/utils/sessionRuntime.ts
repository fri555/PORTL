import { computed, reactive } from 'vue'
import { readPrototypeChatValue, writePrototypeChatValue } from './prototypeChatStore'

/**
 * 会话执行运行时（原型级单例）。
 * 支撑「智能体并行开展多个会话」：记录哪些会话正在执行；
 * 组件卸载（用户切走）后由本模块继续倒计时，到点把持久化快照落成 done，
 * 执行结果因此不随页面切换丢失。
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

/** 执行结束（完成/停止/取消/失败等）后清除运行时记录。 */
export function clearSessionRuntime(sessionId: string) {
  delete state[sessionId]
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

/** 后台到点：把持久化快照从 running 落成 done，结果写回原会话。 */
function finishBackgroundSession(id: string) {
  const record = state[id]
  const snapshot = readPrototypeChatValue<Record<string, unknown>>('plan:' + id)
  if (snapshot && typeof snapshot === 'object' && snapshot.status === 'running') {
    writePrototypeChatValue('plan:' + id, { ...snapshot, status: 'done', finishedAt: record.finishesAt })
  }
  delete state[id]
}
