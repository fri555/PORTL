import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Sidebar from '@/components/chat/source-clone/SourceChatSidebar.vue'
import Detail from '@/components/chat/source-clone/SourceChatDetail.vue'
import Citations from '@/components/chat/source-clone/AnswerCitations.vue'
import { citationSources, citedParagraphs } from '@/mock/citations'
const wrappers: ReturnType<typeof mount>[]=[]
afterEach(()=>{wrappers.splice(0).forEach(w=>w.unmount());vi.useRealTimers();localStorage.clear();window.history.replaceState({},'', '/')})
function keep(w:ReturnType<typeof mount>){wrappers.push(w);return w}
describe('October 12 chat review requirements',()=>{
  it('adds a top pinned group while retaining sessions in their original group',async()=>{
    const w=keep(mount(Sidebar,{props:{dailySessions:[{id:'unique-daily',title:'日常任务',timestamp:'2026-10-12 10:00',mode:'daily'}],expertSessions:[]}}))
    expect(w.find('[data-testid="pinned-group"]').exists()).toBe(false)
    await w.get('[data-testid="session-unique-daily"] [aria-label="置顶"]').trigger('click')
    expect(w.get('[data-testid="pinned-group"]').text()).toContain('日常任务')
    expect(w.get('[aria-labelledby="daily-session-heading"]').text()).toContain('日常任务')
    await w.get('[data-testid="pinned-group"] [aria-label="取消置顶"]').trigger('click')
    expect(w.find('[data-testid="pinned-group"]').exists()).toBe(false)
  })
  it('renders date/time below both the user bubble and the AI answer',()=>{
    const w=keep(mount(Detail,{props:{sessionId:'citation-demo'}}))
    expect(w.get('.user-message > time.message-time').text()).toMatch(/2026-\d\d-\d\d \d\d:\d\d/)
    expect(w.get('article.answer > time.message-time').text()).toMatch(/2026-\d\d-\d\d \d\d:\d\d/)
    expect(w.get('.user-message').element.lastElementChild?.tagName).toBe('TIME')
  })
  it('keeps compact processing collapsed and offers the stalled reminder prototype',()=>{
    window.history.replaceState({},'', '/?planState=awaiting_confirmation')
    const w=keep(mount(Detail,{props:{sessionId:'expert-plan',approvalMode:'autonomous'}}))
    expect(w.get('[data-testid="execution-process-trigger"]').attributes('aria-expanded')).toBe('false')
    expect(w.find('[data-testid="execution-reminder"]').exists()).toBe(true)
    expect(w.find('[data-testid="execution-process"]').exists()).toBe(false)
  })
  it('differentiates website and knowledge references and uses a simple source list',()=>{
    const w=keep(mount(Citations,{props:{answerId:'review',paragraphs:citedParagraphs,sources:citationSources}}))
    expect(w.find('.inline-citation.web').exists()).toBe(true)
    expect(w.find('.inline-citation.knowledge').exists()).toBe(true)
    expect(w.find('.source-card.web-source').exists()).toBe(true)
    expect(w.find('.source-card.knowledge-source').exists()).toBe(true)
    expect(w.get('[aria-label="回答引用来源"]').text()).toContain('参考')
  })
})
