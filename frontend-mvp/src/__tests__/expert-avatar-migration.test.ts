import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Agent } from '@/types/agent'

const publicationKey = 'tianma.prototype.expert-publications.v1'
const favoriteKey = 'tianma.prototype.expert-favorites.v2:avatar-migration-user'
const planKey = 'tianma.prototype.chat.v1:avatar-migration-user:plan:existing-task'
const legacyFiles: Record<string, string> = {
  'biz-02': 'assortment-expert.png', 'biz-03': 'review-analyst.png',
  'biz-04': 'inspiration-king.png', 'biz-09': 'inspiration-king.png',
}
const businessIds = Array.from({ length: 18 }, (_, index) => 'biz-' + String(index + 1).padStart(2, '0'))
const oldAvatar = (id: string, prefix = '/PORTL') => prefix + '/assets/agents-online/' + (legacyFiles[id] ?? 'data-analysis.png')
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

beforeEach(() => { localStorage.clear(); vi.resetModules() })
afterEach(() => { vi.restoreAllMocks() })

async function agent(id: string, avatarUrl: string): Promise<Agent> {
  const { agents, dailyAssistant } = await import('@/mock/agents')
  const supplied = agents.find(item => item.id === id) ?? dailyAssistant
  return {
    ...clone(supplied), id, avatarUrl,
    name: '用户编辑的名称-' + id, description: '已保存的业务正文',
    usageInstructions: '用户保留的使用说明；不能被头像迁移改写',
    systemPrompt: '用户角色正文', defaultModel: '用户自选模型',
    quickCommands: ['用户保存的快捷词'], quickPromptDefinitions: [{ title: '我的快捷词', content: '用户保存的快捷词' }],
    version: '2.4.1', firstPublishedAt: '2026-08-07T00:00:00+08:00', publishedAt: '2026-10-09T12:00:00Z',
    createdAt: '2026-08-07T00:00:00+08:00', updatedAt: '2026-10-09T12:00:00Z',
  }
}

async function expectedAvatar(id: string) {
  const { agents } = await import('@/mock/agents')
  return agents.find(item => item.id === id)!.avatarUrl
}

describe('business expert avatar cache migration', () => {
  it.each(businessIds)('updates only the known draft and published illustration for %s', async id => {
    const draft = await agent(id, oldAvatar(id))
    const published = { ...clone(draft), avatarUrl: oldAvatar(id, ''), description: '最近一次已发布正文' }
    localStorage.setItem(publicationKey, JSON.stringify({ [id]: { draft, published } }))
    const store = await import('@/utils/expertPrototypeStore')
    expect(store.getExpertDraft(id)?.avatarUrl).toContain('/assets/business-experts-v1/')
    const avatarUrl = await expectedAvatar(id)
    expect(avatarUrl).toContain('/assets/business-experts-v1/')
    expect(store.getExpertDraft(id)).toEqual({ ...draft, avatarUrl })
    expect(store.getPublishedExpert(id)).toEqual({ ...published, avatarUrl })
    expect(store.expertAgents.find(item => item.id === id)).toEqual({ ...published, avatarUrl })
    expect(JSON.parse(localStorage.getItem(publicationKey)!)).toEqual({ [id]: {
      draft: { ...draft, avatarUrl }, published: { ...published, avatarUrl },
    } })
  })

  it.each([
    'data:image/png;base64,dXNlci1hdmF0YXI=',
    'https://example.com/my-tiger.png',
    '/assets/uploads/user-tiger.png',
    '/assets/agents-online/inspiration-king.png',
    '/PORTL/assets/agents-online/data-analysis.png?custom=1',
  ])('preserves the custom draft avatar %s while migrating its old published illustration', async avatarUrl => {
    const draft = await agent('biz-01', avatarUrl)
    const published = { ...clone(draft), avatarUrl: oldAvatar('biz-01') }
    localStorage.setItem(publicationKey, JSON.stringify({ 'biz-01': { draft, published } }))
    const store = await import('@/utils/expertPrototypeStore')
    expect(store.getPublishedExpert('biz-01')?.avatarUrl).toContain('/assets/business-experts-v1/')
    expect(store.getExpertDraft('biz-01')).toEqual(draft)
    expect(store.getPublishedExpert('biz-01')).toEqual({ ...published, avatarUrl: await expectedAvatar('biz-01') })
    expect(JSON.parse(localStorage.getItem(publicationKey)!)['biz-01'].draft).toEqual(draft)
  })

  it('preserves a custom published avatar while migrating its old draft illustration', async () => {
    const draft = await agent('biz-02', oldAvatar('biz-02', ''))
    const published = { ...clone(draft), avatarUrl: 'data:image/webp;base64,bXktdGlnZXI=' }
    localStorage.setItem(publicationKey, JSON.stringify({ 'biz-02': { draft, published } }))
    const store = await import('@/utils/expertPrototypeStore')
    expect(store.getExpertDraft('biz-02')?.avatarUrl).toContain('/assets/business-experts-v1/')
    expect(store.getExpertDraft('biz-02')).toEqual({ ...draft, avatarUrl: await expectedAvatar('biz-02') })
    expect(store.getPublishedExpert('biz-02')).toEqual(published)
    expect(store.expertAgents.find(item => item.id === 'biz-02')).toEqual(published)
  })

  it('keeps deleted records hidden, legacy history untouched, and favorites and conversation text unchanged', async () => {
    const deleted = await agent('biz-02', oldAvatar('biz-02'))
    const { legacyAgents } = await import('@/mock/legacyAgents')
    const historical = { ...clone(legacyAgents[0]!), name: '旧专家历史名称', avatarUrl: oldAvatar('biz-01'), systemPrompt: '历史正文' }
    const daily = await agent('daily-assistant', '/PORTL/assets/agents-online/tianma-assistant.png')
    const custom = { ...clone(deleted), id: 'user-created-expert', avatarUrl: oldAvatar('biz-01') }
    const records = {
      'biz-02': { draft: deleted, published: deleted, deleted: true },
      ag01: { draft: historical, published: historical },
      'daily-assistant': { draft: daily, published: daily },
      'user-created-expert': { draft: custom, published: custom },
    }
    const favorites = JSON.stringify({ initialized: true, ids: ['biz-03', 'biz-01', 'biz-02', 'ag01'] })
    const plan = JSON.stringify({ draft: '用户尚未发送的任务正文', selectedExpertId: 'ag01', followUps: [{ content: '已发送任务正文' }] })
    localStorage.setItem(publicationKey, JSON.stringify(records))
    localStorage.setItem(favoriteKey, favorites)
    localStorage.setItem(planKey, plan)
    const store = await import('@/utils/expertPrototypeStore')
    expect(store.getHistoricalExpert('biz-02')?.avatarUrl).toContain('/assets/business-experts-v1/')
    const migratedDeleted = { ...deleted, avatarUrl: await expectedAvatar('biz-02') }
    expect(store.isExpertDeleted('biz-02')).toBe(true)
    expect(store.getExpertDraft('biz-02')).toBeNull()
    expect(store.getPublishedExpert('biz-02')).toBeNull()
    expect(store.expertAgents.some(item => item.id === 'biz-02' || item.id === 'ag01')).toBe(false)
    expect(store.getHistoricalExpert('biz-02')).toEqual(migratedDeleted)
    expect(store.getHistoricalExpert('ag01')).toEqual(historical)
    expect(store.getPublishedExpert('daily-assistant')).toEqual(daily)
    expect(store.getPublishedExpert(custom.id)).toEqual(custom)
    expect(JSON.parse(localStorage.getItem(publicationKey)!)).toEqual({
      ...records, 'biz-02': { draft: migratedDeleted, published: migratedDeleted, deleted: true },
    })
    expect(localStorage.getItem(favoriteKey)).toBe(favorites)
    expect(localStorage.getItem(planKey)).toBe(plan)
    vi.resetModules()
    const reloaded = await import('@/utils/expertPrototypeStore')
    expect(reloaded.expertAgents.some(item => item.id === 'biz-02')).toBe(false)
    expect(reloaded.getHistoricalExpert('ag01')).toEqual(historical)
    expect(localStorage.getItem(favoriteKey)).toBe(favorites)
    expect(localStorage.getItem(planKey)).toBe(plan)
  })

  it('finishes loading all records with new in-memory avatars when migration storage fails', async () => {
    const first = await agent('biz-01', oldAvatar('biz-01'))
    const second = await agent('biz-18', oldAvatar('biz-18', ''))
    const saved = JSON.stringify({ 'biz-01': { draft: first, published: first }, 'biz-18': { draft: second, published: second } })
    localStorage.setItem(publicationKey, saved)
    const write = vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => { throw new Error('Storage full') })
    const store = await import('@/utils/expertPrototypeStore')
    expect(store.getExpertDraft('biz-01')?.avatarUrl).toContain('/assets/business-experts-v1/')
    expect(store.getExpertDraft('biz-01')).toEqual({ ...first, avatarUrl: await expectedAvatar('biz-01') })
    expect(store.getPublishedExpert('biz-18')).toEqual({ ...second, avatarUrl: await expectedAvatar('biz-18') })
    expect(store.expertAgents.find(item => item.id === 'biz-18')?.name).toBe(second.name)
    expect(write).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(publicationKey)).toBe(saved)
  })

  it('writes a changed cache once and does not rewrite already migrated or custom avatars', async () => {
    const draft = await agent('biz-01', oldAvatar('biz-01'))
    const custom = await agent('biz-18', 'https://example.com/custom-avatar.png')
    localStorage.setItem(publicationKey, JSON.stringify({ 'biz-01': { draft, published: draft }, 'biz-18': { draft: custom, published: custom } }))
    const write = vi.spyOn(localStorage, 'setItem')
    await import('@/utils/expertPrototypeStore')
    expect(write).toHaveBeenCalledTimes(1)
    const saved = localStorage.getItem(publicationKey)
    vi.resetModules()
    const store = await import('@/utils/expertPrototypeStore')
    expect(write).toHaveBeenCalledTimes(1)
    expect(store.getPublishedExpert('biz-18')).toEqual(custom)
    expect(localStorage.getItem(publicationKey)).toBe(saved)
  })
})
