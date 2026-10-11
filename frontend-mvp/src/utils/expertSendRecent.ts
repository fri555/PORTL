import { expertAgents } from '@/utils/expertPrototypeStore'

// This prototype records accepted user messages, never candidate clicks or page views.
// Production supplies this same per-user timestamp from its successful-send response.
export const EXPERT_SEND_RECENT_KEY = 'tianma.prototype.expert-send-recent.v1'
export type ExpertSendRecent = Record<string, number>
export const expertSendRecentStorageKey = (userId: string) => EXPERT_SEND_RECENT_KEY + ':' + encodeURIComponent(userId)
export function expertRecentUserId(): string {
  try {
    const user: unknown = JSON.parse(localStorage.getItem('tianma_ai_user') ?? 'null')
    if (user && typeof user === 'object' && 'id' in user && typeof user.id === 'string' && user.id) return user.id
  } catch { /* Anonymous prototype context. */ }
  return 'prototype'
}
export function readExpertSendRecent(userId = expertRecentUserId()): ExpertSendRecent {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(expertSendRecentStorageKey(userId)) ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter(([, stamp]) => typeof stamp === 'number' && Number.isSafeInteger(stamp) && stamp > 0 && stamp < Number.MAX_SAFE_INTEGER)) as ExpertSendRecent
  } catch { return {} }
}
export function recordExpertSuccessfulSend(expertId: string, userId = expertRecentUserId()): boolean {
  const expert = expertAgents.find(agent => agent.id === expertId)
  if (!expert || !expert.isPublished || expert.reviewStatus !== 'approved' || expert.status !== 'online') return false
  const recent = readExpertSendRecent(userId)
  const previous = Math.max(0, ...Object.values(recent))
  const stamp = Math.max(Date.now(), previous + 1)
  try {
    localStorage.setItem(expertSendRecentStorageKey(userId), JSON.stringify({ ...recent, [expertId]: stamp }))
    return true
  } catch { return false }
}
