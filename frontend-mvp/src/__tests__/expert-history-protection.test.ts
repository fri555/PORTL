import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { legacyAgents } from '@/mock/legacyAgents'

const publicationKey = 'tianma.prototype.expert-publications.v1'
const planKey = (id: string) => `tianma.prototype.chat.v1:prototype-anonymous:plan:${id}`
const wrappers: ReturnType<typeof mount>[] = []
const legacyExpert = () => ({ ...legacyAgents[0]!, name: '历史已发布专家' })

beforeEach(() => { localStorage.clear(); vi.resetModules() })
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.restoreAllMocks() })

function rememberPlan(sessionId: string, selectedExpertId: string) {
  localStorage.setItem(planKey(sessionId), JSON.stringify({
    status: 'paused', deadlineAt: Date.now() + 60000, startedAt: null, finishedAt: null,
    attempt: 1, failedAttempts: [], stoppedSteps: null, draft: '保留未发送的任务要求',
    followUps: [], selectedExpertId, officialTemplate: false, dwsStage: 'auth',
  }))
}

async function detail(sessionId: string, agentId = '') {
  const { default: ChatDetail } = await import('@/components/chat/source-clone/SourceChatDetail.vue')
  const wrapper = mount(ChatDetail, { props: { sessionId, agentId, persistState: true }, global: { stubs: { QuickPromptPanel: true } } })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

describe('expert catalogue history protection', () => {
  it('keeps cached legacy publications and drafts out of the current catalogue', async () => {
    const published = legacyExpert()
    const record = { draft: { ...published, name: '历史未发布草稿' }, published }
    const saved = JSON.stringify({ ag01: record })
    localStorage.setItem(publicationKey, saved)
    const store = await import('@/utils/expertPrototypeStore')
    expect(store.expertAgents.some(agent => agent.id === 'ag01')).toBe(false)
    expect(store.expertDrafts.value.some(agent => agent.id === 'ag01')).toBe(false)
    expect(store.getExpertDraft('ag01')?.name).toBe('历史未发布草稿')
    expect(store.getHistoricalExpert('ag01')?.name).toBe('历史已发布专家')
    expect(localStorage.getItem(publicationKey)).toBe(saved)
  })

  it('resolves a legacy default snapshot when no publication was saved', async () => {
    const store = await import('@/utils/expertPrototypeStore')
    expect(store.getHistoricalExpert('ag02')?.name).toBe('门店智能运营助手')
    expect(store.getHistoricalExpert('unknown-expert')).toBeNull()
    const snapshot = store.getHistoricalExpert('ag02')!
    snapshot.name = '外部修改'
    expect(store.getHistoricalExpert('ag02')?.name).toBe('门店智能运营助手')
  })

  it('still adds a newly created expert only after a valid publication', async () => {
    const store = await import('@/utils/expertPrototypeStore')
    const expert = { ...legacyExpert(), id: 'custom-history-test', name: '用户新建专家' }
    expect(store.saveExpertDraft(expert)).toBeNull()
    expect(store.expertAgents.some(agent => agent.id === expert.id)).toBe(false)
    expect(store.publishExpertDraft(expert)).toBeNull()
    expect(store.expertAgents.find(agent => agent.id === expert.id)?.name).toBe('用户新建专家')
    expect(store.getHistoricalExpert(expert.id)?.name).toBe('用户新建专家')
  })

  it('makes the daily assistant editable without publishing it into the expert catalogue', async () => {
    const store = await import('@/utils/expertPrototypeStore')
    expect(store.getExpertDraft('daily-assistant')?.name).toBe('耶虎')
    const assistant = { ...legacyExpert(), id: 'daily-assistant', name: '耶虎' }
    expect(store.publishExpertDraft(assistant)).toBeNull()
    expect(store.expertDrafts.value.some(agent => agent.id === 'daily-assistant')).toBe(true)
    expect(store.expertAgents.some(agent => agent.id === 'daily-assistant')).toBe(false)
    expect(store.getHistoricalExpert('assistant')?.name).toBe('耶虎')
  })
  it('keeps a cached former daily-assistant record out of both selectable and editable experts', async () => {
    const former = { ...legacyExpert(), id: 'assistant', name: '历史日常助手名称' }
    localStorage.setItem(publicationKey, JSON.stringify({ assistant: { draft: former, published: former } }))
    const store = await import('@/utils/expertPrototypeStore')
    expect(store.expertAgents.some(agent => agent.id === 'assistant')).toBe(false)
    expect(store.expertDrafts.value.some(agent => agent.id === 'assistant')).toBe(false)
    expect(store.getHistoricalExpert('assistant')?.name).toBe('历史日常助手名称')
  })
})

describe('saved conversation expert selection', () => {
  it('shows the saved legacy publication name on the historical reply', async () => {
    const published = legacyExpert()
    localStorage.setItem(publicationKey, JSON.stringify({ ag01: { draft: published, published } }))
    const wrapper = await detail('expert-historical-answer', 'ag01')
    expect(wrapper.get('.answer-agent strong').text()).toBe('历史已发布专家')
    const store = await import('@/utils/expertPrototypeStore')
    expect(store.expertAgents.some(agent => agent.id === 'ag01')).toBe(false)
  }, 15000)

  it.each(['ag01', 'unknown-legacy-expert'])('preserves unavailable selection %s and draft when opening a daily task', async selectedExpertId => {
    const sessionId = 'daily-auth-history-' + selectedExpertId
    rememberPlan(sessionId, selectedExpertId)
    const wrapper = await detail(sessionId)
    expect(JSON.parse(localStorage.getItem(planKey(sessionId))!).selectedExpertId).toBe(selectedExpertId)
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('保留未发送的任务要求')
    expect(wrapper.find('[data-testid="selected-expert-chip"]').exists()).toBe(true)
    await wrapper.get('[aria-label="发送"]').trigger('click')
    await flushPromises()
    const saved = JSON.parse(localStorage.getItem(planKey(sessionId))!)
    expect(saved.selectedExpertId).toBe(selectedExpertId)
    expect(saved.draft).toBe('保留未发送的任务要求')
    expect(saved.followUps).toEqual([])
  }, 15000)

  it('clears an unavailable selection only after explicit removal and resumes daily conversation', async () => {
    const sessionId = 'daily-auth-history-removal'
    rememberPlan(sessionId, 'unknown-legacy-expert')
    const wrapper = await detail(sessionId)
    await wrapper.get('[aria-label="移除所选专家"]').trigger('click')
    expect(JSON.parse(localStorage.getItem(planKey(sessionId))!).selectedExpertId).toBe('')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('保留未发送的任务要求')
    await wrapper.get('[aria-label="发送"]').trigger('click')
    await flushPromises()
    const saved = JSON.parse(localStorage.getItem(planKey(sessionId))!)
    expect(saved.followUps).toHaveLength(1)
    expect(saved.followUps[0]).toMatchObject({ text: '保留未发送的任务要求', expert: '耶虎', usesExpert: false })
  }, 15000)
  it('replaces an unavailable selection through @ while keeping earlier reply names', async () => {
    const sessionId = 'daily-auth-history-replacement'
    rememberPlan(sessionId, 'unknown-legacy-expert')
    const earlierReply = { id: 1, text: '此前的任务', expert: '历史专家原名称', usesExpert: true, time: '2026-08-01 10:00', templateLabel: '普通模板' }
    const original = JSON.parse(localStorage.getItem(planKey(sessionId))!)
    localStorage.setItem(planKey(sessionId), JSON.stringify({ ...original, followUps: [earlierReply] }))
    const wrapper = await detail(sessionId)
    const { agents } = await import('@/mock/agents')
    const chosen = agents[0]!
    const textarea = wrapper.get('textarea')
    const text = '新的任务 @' + chosen.name
    await textarea.setValue(text)
    ;(textarea.element as HTMLTextAreaElement).setSelectionRange(text.length, text.length)
    await textarea.trigger('input'); await flushPromises()
    await textarea.trigger('keydown', { key: 'Enter' }); await flushPromises()
    expect(JSON.parse(localStorage.getItem(planKey(sessionId))!).selectedExpertId).toBe(chosen.id)
    expect(wrapper.get('[data-testid="selected-expert-chip"]').text()).toContain(chosen.name)
    await wrapper.get('[aria-label="发送"]').trigger('click'); await flushPromises()
    const saved = JSON.parse(localStorage.getItem(planKey(sessionId))!)
    expect(saved.followUps).toHaveLength(2)
    expect(saved.followUps[0]).toEqual(earlierReply)
    expect(saved.followUps[1]).toMatchObject({ text: '新的任务', expert: chosen.name, usesExpert: true })
  }, 15000)
})

describe('expert status persistence', () => {
  it('persists the daily assistant status without changing publication metadata or adding a selectable expert', async () => {
    let store = await import('@/utils/expertPrototypeStore')
    const draft = store.getExpertDraft('daily-assistant')!
    const published = store.getPublishedExpert('daily-assistant')!
    expect(store.setExpertStatus('daily-assistant', 'offline')).toBeNull()
    expect(store.getExpertDraft('daily-assistant')).toEqual({ ...draft, status: 'offline' })
    expect(store.getPublishedExpert('daily-assistant')).toEqual({ ...published, status: 'offline' })
    expect(store.expertAgents.some(agent => agent.id === 'daily-assistant')).toBe(false)
    vi.resetModules()
    store = await import('@/utils/expertPrototypeStore')
    expect(store.getExpertDraft('daily-assistant')).toEqual({ ...draft, status: 'offline' })
    expect(store.getPublishedExpert('daily-assistant')).toEqual({ ...published, status: 'offline' })
    expect(store.expertDrafts.value.find(agent => agent.id === 'daily-assistant')?.status).toBe('offline')
    expect(store.expertAgents.some(agent => agent.id === 'daily-assistant')).toBe(false)
    expect(store.setExpertStatus('daily-assistant', 'online')).toBeNull()
    expect(store.getExpertDraft('daily-assistant')).toEqual({ ...draft, status: 'online' })
  })

  it('updates published availability without exposing unpublished content or rewriting dates', async () => {
    const store = await import('@/utils/expertPrototypeStore')
    const { agents } = await import('@/mock/agents')
    const id = agents[0]!.id
    const published = store.getPublishedExpert(id)!
    const draft = { ...store.getExpertDraft(id)!, description: '尚未发布的草稿说明', version: 'draft-version' }
    expect(store.saveExpertDraft(draft)).toBeNull()
    expect(store.setExpertStatus(id, 'offline')).toBeNull()
    expect(store.getExpertDraft(id)).toEqual({ ...draft, status: 'offline' })
    expect(store.getPublishedExpert(id)).toEqual({ ...published, status: 'offline' })
    expect(store.expertAgents.find(agent => agent.id === id)).toEqual({ ...published, status: 'offline' })
    expect(store.setExpertStatus(id, 'online')).toBeNull()
    expect(store.expertAgents.find(agent => agent.id === id)).toEqual({ ...published, status: 'online' })
  })

  it('leaves the stored and visible states unchanged if status persistence fails', async () => {
    const store = await import('@/utils/expertPrototypeStore')
    const { agents } = await import('@/mock/agents')
    const id = agents[0]!.id
    const draft = store.getExpertDraft(id)
    const published = store.getPublishedExpert(id)
    const visible = { ...store.expertAgents.find(agent => agent.id === id)! }
    const originalStorage = localStorage.getItem(publicationKey)
    expect(store.setExpertStatus('unknown-status-expert', 'offline')).toBeTruthy()
    vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => { throw new Error('Storage unavailable') })
    expect(store.setExpertStatus(id, 'offline')).toBeTruthy()
    expect(store.getExpertDraft(id)).toEqual(draft)
    expect(store.getPublishedExpert(id)).toEqual(published)
    expect(store.expertAgents.find(agent => agent.id === id)).toEqual(visible)
    expect(localStorage.getItem(publicationKey)).toBe(originalStorage)
  })
})
