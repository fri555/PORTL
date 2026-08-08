import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchEmailSummaries } from './email-summary'

describe('fetchEmailSummaries', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('sends pagination parameters and preserves the next-page contract', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      connected: true,
      refreshedAt: '2026-07-30T10:00:00+08:00',
      items: [],
      accessIssues: [],
      hasMore: true,
      nextCursor: '104',
    }), { status: 200 }))

    const payload = await fetchEmailSummaries({ limit: 20, cursor: '120' })

    expect(fetch).toHaveBeenCalledWith('/api/email/summaries?limit=20&cursor=120')
    expect(payload.hasMore).toBe(true)
    expect(payload.nextCursor).toBe('104')
  })
})
