/**
 * Browser-only persistence for the review prototype.
 * Production must load the immutable conversation mode and plan state from the authenticated service.
 */
export type PrototypeApprovalMode = 'default' | 'autonomous'
export interface PrototypeChatSession {
  id: string
  approvalMode: PrototypeApprovalMode
  agentId: string
  prompt: string
  mode: 'daily' | 'expert'
  timestamp: string
  createdLocally: boolean
}
const CHAT_STORAGE_PREFIX = 'tianma.prototype.chat.v1'
const unavailableStorage = new Map<string, unknown>()

function scope() {
  try {
    const user: unknown = JSON.parse(localStorage.getItem('tianma_ai_user') ?? 'null')
    if (user && typeof user === 'object' && 'id' in user && typeof user.id === 'string' && user.id) return user.id
  } catch { /* No signed-in user in this prototype context. */ }
  return 'prototype-anonymous'
}
function key(name: string) { return CHAT_STORAGE_PREFIX + ':' + encodeURIComponent(scope()) + ':' + name }
export function readPrototypeChatValue<T>(name: string): T | null {
  const storageKey = key(name)
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) as T : null
  } catch { return unavailableStorage.get(storageKey) as T ?? null }
}
export function writePrototypeChatValue(name: string, value: unknown) {
  const storageKey = key(name)
  try { localStorage.setItem(storageKey, JSON.stringify(value)) }
  catch { unavailableStorage.set(storageKey, value) }
}
export function listPrototypeChatSessions(): PrototypeChatSession[] {
  const records = readPrototypeChatValue<unknown>('sessions')
  if (!Array.isArray(records)) return []
  return records.filter((record): record is PrototypeChatSession =>
    !!record && typeof record === 'object' && typeof record.id === 'string'
    && (record.approvalMode === 'default' || record.approvalMode === 'autonomous')
    && typeof record.agentId === 'string' && typeof record.prompt === 'string'
    && (record.mode === 'daily' || record.mode === 'expert')
    && typeof record.timestamp === 'string' && typeof record.createdLocally === 'boolean',
  )
}
export function rememberPrototypeChatSession(session: PrototypeChatSession): PrototypeChatSession {
  const records = listPrototypeChatSessions()
  const existing = records.find(record => record.id === session.id)
  if (existing) return existing
  writePrototypeChatValue('sessions', [...records, session])
  return session
}
export function removePrototypeChatSession(id: string) {
  writePrototypeChatValue('sessions', listPrototypeChatSessions().filter(record => record.id !== id))
  writePrototypeChatValue('plan:' + id, null)
}

