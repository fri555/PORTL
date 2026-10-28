import { getCurrentScope, onScopeDispose, ref } from 'vue'
import type { VideoOperator, VideoTask } from '@/types/video-generation'

const STORAGE_KEY = 'tianma-video-prototype-v1'
const operators: VideoOperator[] = ['storyboard', 'prompt-reverse', 'image-generate', 'prompt-generate', 'video-generate', 'element-replace', 'speech-synthesis']
function isTask(value: unknown): value is VideoTask {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<VideoTask>
  return typeof item.id === 'string' && !!item.id && typeof item.name === 'string'
    && operators.includes(item.operator as VideoOperator)
    && ['draft', 'queued', 'processing', 'completed', 'failed', 'timeout'].includes(item.status ?? '')
    && typeof item.createdAt === 'string' && !!item.input && typeof item.input === 'object' && !Array.isArray(item.input)
}
export function listVideoTasks(): VideoTask[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter(isTask) : []
  } catch { return [] }
}
export function saveVideoTask(task: VideoTask): void {
  if (!isTask(task)) throw new Error('任务数据不完整')
  const tasks = listVideoTasks().filter(item => item.id !== task.id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([task, ...tasks]))
  window.dispatchEvent(new Event('tianma:video-tasks-changed'))
}
export function removeVideoTask(id: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listVideoTasks().filter(item => item.id !== id)))
  window.dispatchEvent(new Event('tianma:video-tasks-changed'))
}

/** Local interaction prototype; production requires server-owned execution and timestamps. */
export function advancePrototypeVideoQueue(now = Date.now()) {
  const tasks = listVideoTasks()
  let changed = false
  const completed: string[] = []
  for (const operator of ['element-replace', 'speech-synthesis'] as const) {
    let availableAt = now
    for (let attempt = 0; attempt <= tasks.length; attempt++) {
      const running = tasks.find(task => task.operator === operator && task.status === 'processing' && task.prototypeQueue)
      if (running) {
        const end = Date.parse(running.startedAt ?? '') + running.prototypeQueue!.durationMs
        if (!Number.isFinite(end) || end > now) break
        running.status = 'completed'
        running.completedAt = new Date(end).toISOString()
        if (operator === 'element-replace') running.input = { ...running.input, resultVideo: running.input.sourceVideo, resultUsesOriginal: true }
        running.revision = (running.revision ?? 0) + 1
        availableAt = end
        completed.push(running.id)
        changed = true
      }
      const next = tasks.filter(task => task.operator === operator && task.status === 'queued' && task.prototypeQueue)
        .sort((a, b) => a.prototypeQueue!.order - b.prototypeQueue!.order)[0]
      if (!next) break
      const queuedAt = Date.parse(next.prototypeQueue!.queuedAt)
      next.status = 'processing'
      next.startedAt = new Date(Math.max(availableAt, Number.isFinite(queuedAt) ? queuedAt : now)).toISOString()
      next.revision = (next.revision ?? 0) + 1
      changed = true
    }
  }
  if (changed) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
    window.dispatchEvent(new Event('tianma:video-tasks-changed'))
    completed.forEach(id => window.dispatchEvent(new CustomEvent('tianma:video-task-completed', { detail: id })))
  }
}

let queueUsers = 0
let queueTimer: ReturnType<typeof setInterval> | undefined
export function startPrototypeVideoQueue() {
  queueUsers++
  if (!queueTimer) {
    advancePrototypeVideoQueue()
    queueTimer = setInterval(() => { try { advancePrototypeVideoQueue() } catch { /* Keep saved tasks for recovery. */ } }, 1000)
  }
  return () => {
    queueUsers--
    if (queueUsers <= 0) { if (queueTimer) clearInterval(queueTimer); queueTimer = undefined; queueUsers = 0 }
  }
}

export function enqueuePrototypeVideoTask(task: VideoTask) {
  const now = new Date().toISOString()
  saveVideoTask({ ...task, status: 'queued', startedAt: null, revision: 1,
    prototypeQueue: { order: Math.max(Date.now(), ...listVideoTasks().map(item => (item.prototypeQueue?.order ?? 0) + 1)), queuedAt: now, durationMs: 3000 } })
  advancePrototypeVideoQueue()
}

export function updateQueuedPrototypeVideoTask(id: string, revision: number | undefined, name: string, input: Record<string, any>) {
  advancePrototypeVideoQueue()
  const latest = listVideoTasks().find(task => task.id === id)
  if (!latest || latest.status !== 'queued' || latest.revision !== revision) throw new Error('任务已开始执行或配置已更新，本次修改未保存，请查看最新任务')
  saveVideoTask({ ...latest, name, input, revision: (latest.revision ?? 0) + 1 })
}
export function useVideoPrototype() {
  const tasks = ref(listVideoTasks())
  const refresh = () => { tasks.value = listVideoTasks() }
  window.addEventListener('tianma:video-tasks-changed', refresh)
  window.addEventListener('storage', refresh)
  if (getCurrentScope()) onScopeDispose(() => {
    window.removeEventListener('tianma:video-tasks-changed', refresh)
    window.removeEventListener('storage', refresh)
  })
  function save(task: VideoTask) { saveVideoTask(task); refresh() }
  function remove(id: string) { removeVideoTask(id); refresh() }
  return { tasks, refresh, save, remove }
}
