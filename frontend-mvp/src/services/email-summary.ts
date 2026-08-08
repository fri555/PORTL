import type { EmailSummaryItem } from '@/types/workbench'

export interface EmailSummaryPayload {
  connected: boolean
  refreshedAt: string
  items: EmailSummaryItem[]
  accessIssues: string[]
  hasMore: boolean
  nextCursor?: string
}

export async function fetchEmailSummaries(options: { limit?: number; cursor?: string } = {}): Promise<EmailSummaryPayload> {
  const search = new URLSearchParams()
  if (options.limit) search.set('limit', String(options.limit))
  if (options.cursor) search.set('cursor', options.cursor)
  const response = await fetch(`/api/email/summaries${search.size ? `?${search.toString()}` : ''}`)
  const payload = await response.json().catch(() => ({})) as Partial<EmailSummaryPayload> & { message?: string }
  if (!response.ok) throw new Error(payload.message || '企业邮箱摘要暂时不可用')
  return {
    connected: payload.connected === true,
    refreshedAt: payload.refreshedAt || new Date().toISOString(),
    items: payload.items || [],
    accessIssues: payload.accessIssues || [],
    hasMore: payload.hasMore === true,
    nextCursor: payload.nextCursor,
  }
}
