import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import ChatHome from '@/components/chat/source-clone/SourceChatHome.vue'
import ChatDetail from '@/components/chat/source-clone/SourceChatDetail.vue'
import AgentSquare from '@/views/AgentSquareView.vue'
import { agents } from '@/mock/agents'
import { usageDetailSections, usageSections } from '@/utils/agentUsage'
import { homeDraft } from '@/composables/useHomeDraft'
import { MENTION_PAGE_SIZE } from '@/composables/useExpertMention'
import { expertSendRecentStorageKey, recordExpertSuccessfulSend } from '@/utils/expertSendRecent'

const wrappers: ReturnType<typeof mount>[] = []
const dataAnalyst = agents.find(agent => agent.id === 'biz-01')!
const dialogStub = { props: ['modelValue'], template: '<section v-if="modelValue"><slot/><slot name="footer"/></section>' }
beforeEach(() => {
  localStorage.removeItem(expertSendRecentStorageKey('prototype'))
  homeDraft.value = ''
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.restoreAllMocks(); vi.useRealTimers() })
async function home(props: Record<string, string> = {}) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: ChatHome }, { path: '/agent-square', component: AgentSquare }] })
  await router.push('/'); await router.isReady()
  const wrapper = mount(ChatHome, { props, global: { plugins: [router] } }); wrappers.push(wrapper)
  await flushPromises(); return wrapper
}
async function market() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: AgentSquare }, { path: '/chat', component: ChatHome }] })
  await router.push('/'); await router.isReady()
  const wrapper = mount(AgentSquare, { global: { plugins: [router], stubs: { ElDialog: dialogStub } } }); wrappers.push(wrapper)
  await flushPromises(); return wrapper
}
async function type(wrapper: ReturnType<typeof mount>, value: string) {
  const textarea = wrapper.get('textarea')
  await textarea.setValue(value)
  const element = textarea.element as HTMLTextAreaElement
  element.setSelectionRange(value.length, value.length)
  await textarea.trigger('input'); await flushPromises()
  return textarea
}
describe('expert favorite, instructions and mention closure', () => {
// 收藏功能已移除，相关测试延至v2
//   it('keeps the expert market focused on search, category tabs and cards with full card actions', async () => {
//     const store = await market()
//     expect(store.find('.hero').exists()).toBe(false)
//     expect(store.find('input[placeholder="搜索名称或简介"]').exists()).toBe(true)
//     expect(store.findAll('.category-tabs button').length).toBeGreaterThan(1)
//     expect(store.findAll('.agent-card').length).toBeGreaterThan(0)
//     expect(store.find('.system-tags').exists()).toBe(true)
//     expect(store.get('.agent-card [data-testid="expert-primary-action"]').text()).toBe('收藏')
//     expect(store.text()).not.toContain('天马业务专家库')
//     expect(store.text()).not.toContain('次使用')
//     expect(store.text()).not.toContain('我的收藏')
//     expect(store.text()).not.toContain('发现专家')
//   })

  it('uses the agreed business groups and filters store experts', async () => {
    const store = await market()
    expect(store.findAll('.category-tabs button').map(button => button.text())).toEqual([
      '全部', '通用', '商品', '直播', 'B2B', 'B2C', '门店',
    ])
    await store.findAll('.category-tabs button').find(button => button.text() === '门店')!.trigger('click')
    expect(store.findAll('.agent-card').length).toBeGreaterThan(0)
    expect(store.text()).toContain('门店经营分析师')
  })
  it('keeps selection history separate and moves an expert forward only after a successful send', async () => {
    const page = await home()
    const textarea = await type(page, '@')
    expect(page.findAll('[role="option"]')).toHaveLength(MENTION_PAGE_SIZE)
    expect(page.find('[aria-label="下一页"]').exists()).toBe(false)
    const usedName = page.findAll('[role="option"]')[2]!.text()
    const initialName = page.findAll('[role="option"]')[0]!.text()
    await page.findAll('[role="option"]')[2]!.trigger('click')
    await type(page, '@')
    expect(page.findAll('[role="option"]')[0]!.text()).toBe(initialName)
    recordExpertSuccessfulSend(agents.find(agent => agent.name === usedName)!.id)
    await textarea.trigger('keydown', { key: 'Escape' })
    await type(page, '@')
    expect(page.findAll('[role="option"]')[0]!.text()).toContain(usedName)
    expect(textarea.element).toBeTruthy()
  })
  it('filters through the composer while keeping the expert list free of search chrome', async () => {
    const page = await home()
    await type(page, '@营销')
    expect(page.find('.mention-search').exists()).toBe(false)
    expect(page.get('.mention-heading').text()).toBe('专家')
    expect(page.find('.mention-panel footer').exists()).toBe(false)
    expect(page.findAll('[role="option"]').length).toBeGreaterThan(0)
    expect(page.find('[role="option"] small').exists()).toBe(false)
    expect(page.text()).not.toContain('召唤更多专家')
  })
  // 收藏功能已移除，相关测试延至v2
//   it('keeps a post-migration empty list, reflects favorites immediately, persists and removes them', async () => {
//     const page = await home({ initialMode: 'expert' })
//     expect(page.findAll('[data-testid="expert-card"]')).toHaveLength(0)
//     expect(page.text()).toContain('还没有收藏专家')
//     const store = await market()
//     await store.get(`button[aria-label="收藏${dataAnalyst.name}"]`).trigger('click')
//     expect(page.findAll('[data-testid="expert-card"]')).toHaveLength(1)
//     expect(JSON.parse(localStorage.getItem(favoritesStorageKey('prototype'))!).ids).toEqual(['biz-01'])
//     const reloaded = await home({ initialMode: 'expert' })
//     expect(reloaded.findAll('[data-testid="expert-card"]')).toHaveLength(1)
//     await store.get(`button[aria-label="取消收藏${dataAnalyst.name}"]`).trigger('click')
//     expect(page.findAll('[data-testid="expert-card"]')).toHaveLength(0)
//     expect(reloaded.findAll('[data-testid="expert-card"]')).toHaveLength(0)
//   })
//   it('does not silently apply a favorite when persistence fails', async () => {
//     const store = await market()
//     vi.mocked(localStorage.setItem).mockImplementationOnce(() => { throw new Error('unavailable') })
//     await store.get(`button[aria-label="收藏${dataAnalyst.name}"]`).trigger('click')
//     expect(store.get(`button[aria-label="收藏${dataAnalyst.name}"]`).attributes('aria-pressed')).toBe('false')
//   })
  it('renders the exact saved usage text, preserving legacy unstructured instructions', async () => {
    const store = await market()
    await store.get('.agent-card').trigger('click')
    for (const section of usageDetailSections(dataAnalyst.usageInstructions)) {
      expect(store.get('.modal-body').text()).toContain(section.title)
      for (const field of section.fields) {
        if (field.label === '能力标签') expect(store.get('.modal-body .system-tags').text()).toContain('联网')
        else expect(store.get('.modal-body').text()).toContain(field.value)
      }
    }
    expect(store.findAll('.usage-field').length).toBeGreaterThanOrEqual(2)
    expect(store.text()).not.toContain('添加到我的专家')
    expect(usageSections('不按模板填写的说明')).toEqual([{ title: '使用说明', body: '不按模板填写的说明' }])
  })
  // 收藏功能已移除，相关测试延至v2
//   it('searches all available experts, sorts by recent usage only, and does not auto-favorite a selection', async () => {
//     localStorage.setItem(favoritesStorageKey('prototype'), JSON.stringify({ initialized: true, ids: ['biz-04'] }))
//     localStorage.setItem(expertSendRecentStorageKey('prototype'), JSON.stringify({ 'biz-09': Date.now() }))
//     const page = await home()
//     const textarea = await type(page, '@')
//     const options = page.findAll('[role="option"]')
//     expect(options[0]!.text()).toContain(agents.find(agent => agent.id === 'biz-09')!.name)
//     expect(options.length).toBeGreaterThan(1)
//     await textarea.trigger('keydown', { key: 'ArrowDown' })
//     await textarea.trigger('keydown', { key: 'Enter' })
//     expect(page.find('[role="listbox"]').exists()).toBe(false)
//     expect(page.emitted('send')).toBeUndefined()
//     expect(JSON.parse(localStorage.getItem(favoritesStorageKey('prototype'))!).ids).toEqual(['biz-04'])
//   })
  it('replaces only the mention token, keeps the draft, and allows removing the expert', async () => {
    const page = await home()
    const textarea = await type(page, '请帮我@营销图文')
    await textarea.trigger('keydown', { key: 'Enter' }); await flushPromises()
    expect((textarea.element as HTMLTextAreaElement).value).toBe('请帮我')
    expect(page.get('[data-testid="selected-expert-chip"]').text()).toContain('营销')
    expect(page.emitted('send')).toBeUndefined()
    await page.get('[aria-label="移除所选专家"]').trigger('click')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('请帮我')
    expect(page.emitted('expert-selected')!.at(-1)).toEqual([''])
  })
  it('triggers for email at signs but never submits empty results or a Chinese IME confirmation', async () => {
    const page = await home()
    let textarea = await type(page, 'test@example.com')
    expect(page.find('[role="listbox"]').exists()).toBe(true)
    textarea = await type(page, '@不存在的专家')
    expect(page.findAll('[role="option"]')).toHaveLength(0)
    await textarea.trigger('keydown', { key: 'Enter' })
    expect(page.emitted('send')).toBeUndefined()
    await textarea.trigger('keydown', { key: 'Escape' })
    expect((textarea.element as HTMLTextAreaElement).value).toBe('@不存在的专家')
    await textarea.trigger('compositionstart')
    await textarea.trigger('keydown', { key: 'Enter', isComposing: true })
    expect(page.emitted('send')).toBeUndefined()
  })
  it('keeps the old conversation identity when another expert is selected for the next message', async () => {
    vi.useFakeTimers()
    const page = mount(ChatDetail, { props: { sessionId: 'expert-plan', agentId: 'biz-01' } }); wrappers.push(page)
    const textarea = await type(page, '帮我写文案 @营销图文')
    await textarea.trigger('keydown', { key: 'Enter' }); await flushPromises()
    expect(page.get('.plan-state').text()).toBe('等待执行')
    expect(page.find('[data-testid="follow-up-expert"]').exists()).toBe(false)
    await textarea.trigger('keydown', { key: 'Enter' })
    expect(page.get('[data-testid="follow-up-expert"]').text()).toContain('营销图文设计师')
    expect(page.text()).toContain(dataAnalyst.name)
    await vi.advanceTimersByTimeAsync(61000)
    expect(page.find('.deliverables').exists()).toBe(false)
  })
})













