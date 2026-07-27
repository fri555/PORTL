import type { EmailSummaryItem } from '@/types/workbench'

export interface EmailSummaryPayload {
  connected: boolean
  refreshedAt: string
  items: EmailSummaryItem[]
  accessIssues: string[]
}

export async function fetchEmailSummaries(): Promise<EmailSummaryPayload> {
  const response = await fetch('/api/email/summaries')
  const payload = await response.json().catch(() => ({})) as Partial<EmailSummaryPayload> & { message?: string }
  if (!response.ok) throw new Error(payload.message || '企业邮箱摘要暂时不可用')
  return {
    connected: payload.connected === true,
    refreshedAt: payload.refreshedAt || new Date().toISOString(),
    items: payload.items || [],
    accessIssues: payload.accessIssues || [],
  }
}
