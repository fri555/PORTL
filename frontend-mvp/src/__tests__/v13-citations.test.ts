import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AnswerCitations from '@/components/chat/source-clone/AnswerCitations.vue'
import { citationSources, citedParagraphs } from '@/mock/citations'
import { safeCitationUrl, type CitationSource } from '@/types/citation'

const wrappers: ReturnType<typeof mount>[]=[]
afterEach(()=>{wrappers.splice(0).forEach(wrapper=>wrapper.unmount());vi.restoreAllMocks()})
function preview(props:Record<string,unknown>={}){const wrapper=mount(AnswerCitations,{props:{answerId:'answer-test',paragraphs:citedParagraphs,sources:citationSources,...props},attachTo:document.body,global:{stubs:{Teleport:true}}});wrappers.push(wrapper);return wrapper}

describe('answer citations',()=>{
  it('shows inline web citation hover information and opens the source directly',async()=>{
    const open=vi.spyOn(window,'open').mockImplementation(()=>null)
    const wrapper=preview()
    const trigger=wrapper.get('[data-citation-number="3"]')
    expect(trigger.get('.citation-hover').text()).toContain('DeepSeek V2 系列收官')
    expect(trigger.get('.citation-hover').text()).toContain('联网搜索入口')
    await trigger.trigger('click')
    expect(open).toHaveBeenCalledWith('https://www.deepseek.com/news/v2-5-final/','_blank','noopener,noreferrer')
    expect(wrapper.find('[data-testid="citation-preview"]').exists()).toBe(false)
  })
  it('lists references below the answer with clickable page titles',async()=>{
    const open=vi.spyOn(window,'open').mockImplementation(()=>null)
    const wrapper=preview()
    expect(wrapper.get('.answer-sources>header').text()).toContain('参考 4 篇资料')
    expect(wrapper.get('[data-source-card="3"]').text()).toContain('DeepSeek V2 系列收官')
    await wrapper.get('[data-source-card="3"]').trigger('click')
    expect(open).toHaveBeenCalledOnce()
  })
  it('keeps knowledge citations in the existing fragment preview',async()=>{
    const wrapper=preview()
    await wrapper.findAll('[data-citation-number="1"]')[1]!.trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="citation-preview"]').text()).toContain('知识中心使用规范')
    expect(wrapper.get('.matched-fragment').text()).toContain('权限说明')
  })
  it('deduplicates footer sources while preserving inline numbering',()=>{
    const wrapper=preview()
    expect(wrapper.findAll('[data-citation-number]').map(item=>item.attributes('data-citation-number'))).toEqual(['1','1','2','3','4'])
    expect(wrapper.findAll('[data-source-card]')).toHaveLength(3)
  })
  it('shows a four-line-clamped web summary in the footer',()=>{
    const wrapper=preview()
    const teaser=wrapper.get('[data-source-card="3"] .web-source-teaser')
    expect(teaser.text()).toContain('官方公告介绍')
    expect(teaser.findAll('span')[1]!.classes()).toEqual([])
  })
  it('does not expose inaccessible source content',async()=>{
    const wrapper=preview({sources:citationSources.map(source=>({...source,access:'forbidden' as const}))})
    await wrapper.get('[data-citation-number="1"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="citation-preview"]').text()).toContain('当前无权查看')
    expect(wrapper.find('.source-excerpts').exists()).toBe(false)
  })
  it('does not render a references section when no source was used',()=>{
    const wrapper=preview({paragraphs:[{text:'未使用外部资料',citations:[]}]})
    expect(wrapper.find('.answer-sources').exists()).toBe(false)
  })
  it('allows only safe public HTTP links',()=>{
    const source=citationSources[2]!
    expect(safeCitationUrl(source)).toBe(source.url)
    for(const url of ['javascript:alert(1)','data:text/html,private','/relative','https://user:secret@example.com']) expect(safeCitationUrl({...source,url} as CitationSource)).toBe('')
  })
})
