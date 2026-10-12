import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useExpertMention } from '@/composables/useExpertMention'
import { expertAgents } from '@/utils/expertPrototypeStore'
import SourceChatView from '@/views/SourceChatView.vue'
import ChatDetail from '@/components/chat/source-clone/SourceChatDetail.vue'
import MentionMenu from '@/components/chat/source-clone/ExpertMentionMenu.vue'
import { homeDraft } from '@/composables/useHomeDraft'
import { listPrototypeChatSessions } from '@/utils/prototypeChatStore'

const wrappers: ReturnType<typeof mount>[] = []
const recentKey = (user = 'prototype') => 'tianma.prototype.expert-send-recent.v1:' + encodeURIComponent(user)
const read = (user = 'prototype') => JSON.parse(localStorage.getItem(recentKey(user)) ?? '{}')
beforeEach(() => { localStorage.clear(); homeDraft.value = ''; window.history.replaceState({}, '', '/'); vi.useRealTimers() })
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.restoreAllMocks(); vi.useRealTimers() })
async function fixture() {
  const text = ref('@')
  let mention!: ReturnType<typeof useExpertMention>
  const directory = ref(expertAgents.slice())
  const w = mount(defineComponent({ setup() {
    const input = ref<HTMLTextAreaElement | null>(null)
    mention = useExpertMention(text, input, directory, () => {})
    return { text, input }
  }, template: '<textarea ref="input" v-model="text" />' }))
  wrappers.push(w); await flushPromises()
  return { w, text, mention, input: w.get('textarea').element as HTMLTextAreaElement }
}
async function openView(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/chat', component: SourceChatView }, { path: '/chat/:sessionId', component: SourceChatView },
  ] })
  await router.push(path); await router.isReady()
  const w = mount({ template: '<router-view />' }, { global: { plugins: [router], stubs: { QuickPromptPanel: true, Teleport: true } } })
  wrappers.push(w); await flushPromises(); return { w, router }
}
async function detail(agentId = 'biz-01') {
  const w = mount(ChatDetail, { props: { sessionId: 'expert-plan', agentId }, global: { stubs: { QuickPromptPanel: true } } })
  wrappers.push(w); await flushPromises(); return w
}

describe('expert recency follows successful sends', () => {
  it('ignores the old click-history key and does not record a candidate choice', async () => {
    localStorage.setItem('tianma.prototype.mention-recent.v1', JSON.stringify({ 'biz-18': 1000 }))
    const f = await fixture()
    expect(f.mention.results.value[0]?.id).toBe('biz-01')
    f.mention.choose(f.mention.results.value[0]!)
    expect(read()).toEqual({})
    expect(JSON.parse(localStorage.getItem('tianma.prototype.mention-recent.v1')!)).toEqual({ 'biz-18': 1000 })
  })
  it('uses the current user send history and freezes its order until the next opening', async () => {
    localStorage.setItem('tianma_ai_user', JSON.stringify({ id: 'user-a' }))
    localStorage.setItem(recentKey('user-a'), JSON.stringify({ 'biz-03': 300, 'biz-08': 800, 'biz-02': '9999' }))
    localStorage.setItem(recentKey('user-b'), JSON.stringify({ 'biz-18': 900 }))
    const f = await fixture()
    expect(f.mention.results.value.slice(0, 3).map(a => a.id)).toEqual(['biz-08', 'biz-03', 'biz-01'])
    localStorage.setItem(recentKey('user-a'), JSON.stringify({ 'biz-04': 1000 }))
    f.mention.loadMore()
    expect(f.mention.results.value[0]?.id).toBe('biz-08')
    f.mention.keydown(new KeyboardEvent('keydown', { key: 'Escape' }))
    f.mention.update()
    expect(f.mention.results.value[0]?.id).toBe('biz-04')
  })
  it('searches names and descriptions without matching a department-only keyword', async () => {
    const f = await fixture()
    f.text.value = '@研发测试部'; await flushPromises(); f.input.setSelectionRange(6, 6)
    // Every fixture has this department, but it is not searchable content.
    const originals = expertAgents.map(a => a.developerDepartment)
    try {
      expertAgents.forEach(a => { a.developerDepartment = '研发测试部' })
      f.mention.update()
      expect(f.mention.allResults.value).toHaveLength(0)
    } finally { expertAgents.forEach((a, i) => { a.developerDepartment = originals[i]! }) }
  })
  it('does not count browsing a composed expert page or an existing conversation', async () => {
    const { router } = await openView('/chat?mode=expert&agent=biz-03&prompt=待发送问题')
    expect(read()).toEqual({})
    await router.push('/chat/expert-existing?agent=biz-03'); await flushPromises()
    expect(read()).toEqual({})
  })
  it('records the expert bound to a successful first send, after entering the conversation', async () => {
    const { w, router } = await openView('/chat?mode=expert&agent=biz-03')
    await w.get('textarea').setValue('请分析评价')
    await w.get('button[aria-label="发送"]').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.path).toMatch(/^\/chat\/expert-plan-/)
    expect(Object.keys(read())).toEqual(['biz-03'])
    expect(read()['biz-03']).toBeGreaterThan(0)
  })
  it('does not record a first send if entering the conversation is rejected', async () => {
    const { w, router } = await openView('/chat?mode=expert&agent=biz-03')
    router.beforeEach(to => to.path.includes('/expert-plan-') ? false : true)
    await w.get('textarea').setValue('请分析评价')
    await w.get('button[aria-label="发送"]').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.path).toBe('/chat')
    expect(read()).toEqual({})
    expect(listPrototypeChatSessions().filter(s => s.createdLocally)).toHaveLength(0)
    expect((w.get('textarea').element as HTMLTextAreaElement).value).toBe('请分析评价')
  })
  it('records only the selected expert of an accepted follow-up while preserving the old answer expert', async () => {
    const w = await detail()
    const input = w.get('textarea')
    await input.setValue('请帮我 @评论分析师'); (input.element as HTMLTextAreaElement).setSelectionRange(10, 10); await input.trigger('input'); await flushPromises()
    await input.trigger('keydown', { key: 'Enter' }); await flushPromises()
    expect(read()).toEqual({})
    await input.trigger('keydown', { key: 'Enter' }); await flushPromises()
    expect(w.get('[data-testid="follow-up-expert"]').text()).toContain('评论分析师')
    expect(w.get('.answer-agent').text()).toContain('数据分析师')
    expect(Object.keys(read())).toEqual(['biz-03'])
  })
  it('does not count a send blocked by the currently running plan', async () => {
    const w = await detail()
    await w.get('.run-now').trigger('click'); await flushPromises()
    await w.get('textarea').setValue('暂不能发送的消息')
    await w.get('textarea').trigger('keydown', { key: 'Enter' }); await flushPromises()
    expect(w.find('[data-testid="sent-follow-up"]').exists()).toBe(false)
    expect(read()).toEqual({})
  })
  it('keeps an accepted conversation usable when recording recency cannot persist', async () => {
    const w = await detail()
    const original = vi.mocked(localStorage.setItem).getMockImplementation()!
    vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
      if (key.startsWith('tianma.prototype.expert-send-recent.v1:')) throw new Error('storage unavailable')
      original(key, value)
    })
    await w.get('textarea').setValue('继续分析'); await w.get('button[aria-label="发送"]').trigger('click'); await flushPromises()
    expect(w.get('[data-testid="sent-follow-up"]').text()).toBe('继续分析')
    expect(w.get('[data-testid="follow-up-expert"]').text()).toContain('数据分析师')
    expect(read()).toEqual({})
  })
  it('records a continued send to the current expert without an at selection and advances at equal clock times', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(12345000)
    const w = await detail()
    await w.get('textarea').setValue('继续分析'); await w.get('button[aria-label="发送"]').trigger('click'); await flushPromises()
    const first = read()['biz-01']
    expect(first).toBe(12345000)
    await w.get('textarea').setValue('换个角度'); await w.get('button[aria-label="发送"]').trigger('click'); await flushPromises()
    expect(read()['biz-01']).toBeGreaterThan(first)
  })
  it('does not record a send rejected by expert availability or a daily-office send', async () => {
    const w = await detail()
    const agent = expertAgents.find(a => a.id === 'biz-01')!, status = agent.status
    try {
      agent.status = 'offline'
      await w.get('textarea').setValue('继续分析'); await w.get('button[aria-label="发送"]').trigger('click')
      expect(w.find('[data-testid="sent-follow-up"]').exists()).toBe(false)
      expect(read()).toEqual({})
    } finally { agent.status = status }
    w.unmount()
    const daily = mount(ChatDetail, { props: { sessionId: 'daily-auth' }, global: { stubs: { QuickPromptPanel: true } } })
    wrappers.push(daily)
    await daily.get('textarea').setValue('处理日常办公'); await daily.get('button[aria-label="发送"]').trigger('click'); await flushPromises()
    expect(read()).toEqual({})
  })
})

describe('expert candidates always stay above the composer', () => {
  it('shrinks into scrollable space above a high composer instead of moving below it', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 220, bottom: 390, height: 170, left: 0, right: 600, width: 600, x: 0, y: 220, toJSON() {} })
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(1000)
    const w = mount(MentionMenu, { props: { experts: expertAgents.slice(0, 5), activeIndex: 0, id: 'new-placement' }, attachTo: document.body })
    wrappers.push(w); await flushPromises()
    expect(w.classes()).not.toContain('mention-panel--below')
    expect(Number.parseFloat(w.get('.mention-list').attributes('style')!.match(/max-height: ([\d.]+)px/)![1]!)).toBeLessThan(150)
  })
})


