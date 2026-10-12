import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { agents } from '@/mock/agents'
import { useExpertMention } from '@/composables/useExpertMention'
import { expertSendRecentStorageKey } from '@/utils/expertSendRecent'
import ChatDetail from '@/components/chat/source-clone/SourceChatDetail.vue'
import { expertAgents } from '@/utils/expertPrototypeStore'
import ChatHome from '@/components/chat/source-clone/SourceChatHome.vue'
import MentionMenu from '@/components/chat/source-clone/ExpertMentionMenu.vue'
import { homeDraft } from '@/composables/useHomeDraft'
import type { Agent } from '@/types/agent'
import { createMemoryHistory, createRouter } from 'vue-router'

const wrappers: ReturnType<typeof mount>[] = []
beforeEach(() => { localStorage.clear(); homeDraft.value = '' })
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.restoreAllMocks() })
function keep<T extends ReturnType<typeof mount>>(w: T) { wrappers.push(w); return w }
function sampleExperts(): Agent[] { return Array.from({ length: 12 }, (_, i) => ({ ...agents[0]!, id: 'round3-' + i, name: '专家' + i })) }
async function fixture(initial = '@') {
  let mention!: ReturnType<typeof useExpertMention>
  const text = ref(initial), chosen = vi.fn(), directory = ref(sampleExperts())
  const w = keep(mount(defineComponent({ setup() {
    const input = ref<HTMLTextAreaElement | null>(null)
    mention = useExpertMention(text, input, directory, chosen)
    return { text, input }
  }, template: '<textarea ref="input" v-model="text" />' })))
  await flushPromises()
  return { w, mention, text, chosen, directory, input: w.get('textarea').element as HTMLTextAreaElement }
}
async function home(props = {}) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: ChatHome }, { path: '/agent-square', component: { template: '<div/>' } }] })
  await router.push('/'); await router.isReady()
  const w = keep(mount(ChatHome, { props, global: { plugins: [router], stubs: { QuickPromptPanel: true } } }))
  await flushPromises(); return w
}

describe('expert shortcut latest specification', () => {
  it('opens for every at sign including emails, numbers and the full-width sign', async () => {
    const f = await fixture()
    for (const text of ['test@', '123@', 'test@example.com', '文案＠专家']) {
      f.text.value = text; await flushPromises(); f.input.setSelectionRange(text.length, text.length); f.mention.update()
      expect(f.mention.open.value, text).toBe(true)
    }
  })
  it('loads five at a time and lets the keyboard move into the next batch', async () => {
    const f = await fixture()
    expect(f.mention.results.value).toHaveLength(5)
    f.mention.activeIndex.value = 4
    f.mention.keydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(f.mention.results.value).toHaveLength(10)
    expect(f.mention.activeIndex.value).toBe(5)
    f.mention.loadMore(); f.mention.loadMore()
    expect(f.mention.results.value).toHaveLength(12)
    expect(f.mention.hasMore.value).toBe(false)
  })
  it('replaces only the active token on repeated selection and preserves text after the caret', async () => {
    const f = await fixture('正文 @专家0 后文')
    f.input.setSelectionRange(7, 7); f.mention.update()
    expect(f.mention.keyword.value).toBe('专家0')
    f.mention.choose(f.directory.value[0]!)
    await flushPromises()
    expect(f.text.value).toBe('正文  后文')
    f.text.value = '正文  后文@专家1'; await flushPromises(); f.input.setSelectionRange(f.text.value.length, f.text.value.length); f.mention.update()
    f.mention.choose(f.directory.value[1]!)
    await flushPromises()
    expect(f.text.value).toBe('正文  后文')
    expect(f.chosen.mock.calls.map(call => call[0].id)).toEqual(['round3-0', 'round3-1'])
  })
  it('sorts all experts only by the last successful send and resets the loaded batch on a new search', async () => {
    localStorage.setItem(expertSendRecentStorageKey('prototype'), JSON.stringify({ 'round3-8': 500, 'round3-4': 1000, 'round3-1': '99999' }))
    const f = await fixture()
    expect(f.mention.results.value[0]?.id).toBe('round3-4')
    expect(f.mention.results.value[1]?.id).toBe('round3-8')
    f.mention.loadMore(); expect(f.mention.results.value).toHaveLength(10)
    f.text.value = '@专家1'; await flushPromises(); f.input.setSelectionRange(4, 4); f.mention.update(); await flushPromises()
    expect(f.mention.page.value).toBe(1)
    expect(f.mention.allResults.value.map(item => item.name)).toEqual(['专家1', '专家10', '专家11'])
  })
  it('does not confirm a selection while Chinese input is composing and Esc keeps the typed token', async () => {
    const f = await fixture()
    f.mention.startComposition()
    expect(f.mention.keydown(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true }))).toBe(true)
    expect(f.chosen).not.toHaveBeenCalled()
    f.mention.endComposition(); await flushPromises()
    f.mention.keydown(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(f.text.value).toBe('@'); expect(f.mention.open.value).toBe(false)
  })
  it('loads from list scrolling without pagination buttons and renders only avatars and names', async () => {
    const w = keep(mount(MentionMenu, { props: { experts: sampleExperts().slice(0, 5), activeIndex: 0, id: 'round3-menu', total: 12, hasMore: true } }))
    await flushPromises()
    const list = w.get('.mention-list')
    Object.defineProperties(list.element, { scrollTop: { configurable: true, value: 40 }, clientHeight: { configurable: true, value: 218 }, scrollHeight: { configurable: true, value: 240 } })
    await list.trigger('scroll')
    expect(w.emitted('loadMore')).toHaveLength(1)
    expect(w.find('[aria-label="上一页"]').exists()).toBe(false)
    expect(w.find('[aria-label="下一页"]').exists()).toBe(false)
    expect(w.find('[role="option"] small').exists()).toBe(false)
    expect(w.find('.mention-search').exists()).toBe(false)
    expect(w.find('.mention-panel footer').exists()).toBe(false)
    expect(w.get('.mention-heading').text()).toBe('专家')
  })
})

// 收藏功能已移除，相关测试延至v2
// describe('home expert favorites and inline prefix', () => {
//   it('shows only nonempty favorite groups in their fixed order, no tags, and places the removal heart beside the upper-right arrow', async () => {
//     localStorage.setItem(favoritesStorageKey('prototype'), JSON.stringify({ initialized: true, ids: ['biz-01', 'biz-04', 'biz-09'] }))
//     const w = await home({ initialMode: 'expert' })
//     expect(w.findAll('[data-testid="expert-department-tabs"] button').map(button => button.text())).toEqual(['收藏','通用','直播','门店'])
//     const card = w.get('[data-testid="expert-card"]')
//     expect(card.find('.source-chat-home__expert-arrow').exists()).toBe(true)
//     expect(card.find('.source-chat-home__unfavorite').exists()).toBe(true)
//     expect(card.find('.readonly-tags').exists()).toBe(false)
//     expect(w.text()).not.toContain('去专家市场')
//   })
//   it('returns to favorites when the last expert in the selected group is removed, without losing the draft', async () => {
//     localStorage.setItem(favoritesStorageKey('prototype'), JSON.stringify({ initialized: true, ids: ['biz-01', 'biz-04', 'biz-09'] }))
//     const w = await home({ initialMode: 'expert' })
//     await w.get('textarea').setValue('保留待发送的任务')
//     await w.get('[data-department="通用"]').trigger('click')
//     expect(w.findAll('[data-testid="expert-card"]')).toHaveLength(1)
//     await w.get('.source-chat-home__unfavorite').trigger('click')
//     expect(w.findAll('[data-testid="expert-department-tabs"] button').map(button => button.text())).toEqual(['收藏', '直播', '门店'])
//     expect(w.get('[data-department="收藏"]').attributes('aria-selected')).toBe('true')
//     expect(w.findAll('[data-testid="expert-card"]')).toHaveLength(2)
//     expect((w.get('textarea').element as HTMLTextAreaElement).value).toBe('保留待发送的任务')
//     expect(w.emitted('expert-selected')).toBeUndefined()
//   })
//   it('removes a favorite without selecting an expert, sending a message or losing the draft', async () => {
//     const w = await home({ initialMode: 'expert' })
//     await w.get('textarea').setValue('待处理的草稿')
//     const before = w.findAll('[data-testid="expert-card"]').length
//     await w.get('.source-chat-home__unfavorite').trigger('click')
//     expect(w.findAll('[data-testid="expert-card"]')).toHaveLength(before - 1)
//     expect(w.emitted('expert-selected')).toBeUndefined()
//     expect(w.emitted('send')).toBeUndefined()
//     expect((w.get('textarea').element as HTMLTextAreaElement).value).toBe('待处理的草稿')
//   })
//   it('keeps the expert chip and the native textarea in the same input row when an expert is selected', async () => {
//     const w = await home({ initialAgentId: 'biz-01', initialPrompt: '保留正文' })
//     const row = w.get('[data-testid="expert-inline-input"]')
//     expect(row.find('[data-testid="selected-expert-chip"]').exists()).toBe(true)
//     expect(row.find('textarea').exists()).toBe(true)
//     expect((row.get('textarea').element as HTMLTextAreaElement).value).toBe('保留正文')
//     expect(w.emitted('send')).toBeUndefined()
//   })
// })

describe('expert send-time permissions', () => {
  it('blocks a selected expert when the catalogue was replaced with an unavailable release', async () => {
    const w = keep(mount(ChatDetail, { props: { sessionId: 'daily-auth' }, global: { stubs: { QuickPromptPanel: true } } }))
    const textarea = w.get('textarea')
    await textarea.setValue('待处理 @营销图文')
    ;(textarea.element as HTMLTextAreaElement).setSelectionRange(10, 10)
    await textarea.trigger('input'); await flushPromises()
    await textarea.trigger('keydown', { key: 'Enter' }); await flushPromises()
    expect(w.get('[data-testid="selected-expert-chip"]').text()).toContain('营销')
    const index = expertAgents.findIndex(agent => agent.id === 'biz-04')
    const original = expertAgents[index]!
    try {
      expertAgents.splice(index, 1, { ...original, status: 'offline' })
      await textarea.trigger('keydown', { key: 'Enter' }); await flushPromises()
      expect(w.find('[data-testid="follow-up-expert"]').exists()).toBe(false)
      expect((textarea.element as HTMLTextAreaElement).value).toBe('待处理 ')
    } finally { expertAgents.splice(index, 1, original) }
  })
})


