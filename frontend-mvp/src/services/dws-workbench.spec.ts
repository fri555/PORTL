import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearDwsWorkbenchCache,
  fetchDwsWorkbench,
  getCachedDwsWorkbench,
  searchDwsContacts,
} from './dws-workbench'

const payload = {
  source: 'live' as const,
  connected: true,
  refreshedAt: '2026-07-23T17:30:00+08:00',
  identity: { name: '朝暮', department: 'AI项目组', organization: '天马' },
  schedules: [],
  todos: [],
  approvals: [],
  minutesCount: 0,
  messages: [],
  accessIssues: [],
}

describe('DWS workbench session cache', () => {
  beforeEach(() => {
    clearDwsWorkbenchCache()
    vi.restoreAllMocks()
  })

  it('returns cached data immediately without issuing another request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchDwsWorkbench({ force: true })).resolves.toEqual(payload)
    expect(getCachedDwsWorkbench()).toEqual(payload)
    await expect(fetchDwsWorkbench()).resolves.toEqual(payload)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent forced refreshes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    })
    vi.stubGlobal('fetch', fetchMock)

    const first = fetchDwsWorkbench({ force: true })
    const second = fetchDwsWorkbench({ force: true })
    await Promise.all([first, second])

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps the last successful cache when a forced refresh fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => payload })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await fetchDwsWorkbench({ force: true })
    await expect(fetchDwsWorkbench({ force: true })).rejects.toThrow('DWS 工作数据暂时不可用')

    expect(getCachedDwsWorkbench()).toEqual(payload)
  })

  it('serializes at most twenty watch rules for live scoring', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    })
    vi.stubGlobal('fetch', fetchMock)
    const watchRules = Array.from({ length: 22 }, (_, index) => ({
      id: `watch-${index}`,
      type: 'keyword' as const,
      value: `关键词${index}`,
      label: `关键词${index}`,
    }))

    await fetchDwsWorkbench({ force: true, watchRules })

    const requestUrl = String(fetchMock.mock.calls[0]?.[0])
    const serialized = new URL(requestUrl, 'http://localhost').searchParams.get('watchRules')
    expect(JSON.parse(serialized ?? '[]')).toHaveLength(20)
  })

  it('searches the enterprise address book without exposing user ids', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ contacts: [{ ref: 'opaque-contact-ref', name: '李娜', department: '财务部' }] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(searchDwsContacts('李娜')).resolves.toEqual([{ ref: 'opaque-contact-ref', name: '李娜', department: '财务部' }])
    expect(fetchMock).toHaveBeenCalledWith('/api/dws/contacts?query=%E6%9D%8E%E5%A8%9C')
  })
})
