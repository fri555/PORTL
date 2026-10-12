import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import Citations from '@/components/chat/source-clone/AnswerCitations.vue'
import AccessPanel from '@/components/knowledge/source-clone/KnowledgeAccessPanel.vue'
import { citationSources, citedParagraphs } from '@/mock/citations'

const wrappers:ReturnType<typeof mount>[]=[]
afterEach(()=>wrappers.splice(0).forEach(wrapper=>wrapper.unmount()))
function preview(){const wrapper=mount(Citations,{props:{answerId:'round2',paragraphs:citedParagraphs,sources:citationSources},global:{stubs:{Teleport:true}}});wrappers.push(wrapper);return wrapper}

describe('knowledge and citation review recovery',()=>{
  it('refreshes an opened knowledge preview when late excerpt data arrives',async()=>{
    const wrapper=preview();await wrapper.setProps({sources:citationSources.map(source=>({...source,fragments:[]}))});await wrapper.get('[data-citation-number="1"]').trigger('click');await flushPromises();expect(wrapper.find('[data-testid="preview-error"]').exists()).toBe(true);await wrapper.setProps({sources:citationSources});await flushPromises();expect(wrapper.get('.matched-fragment').text()).toContain('适用范围')
  })
  it('hides unresolved-source counts after citations are removed',async()=>{
    const wrapper=preview();await wrapper.setProps({paragraphs:[{text:'已经移除引用的回答',citations:[]}]});expect(wrapper.text()).not.toContain('另有');expect(wrapper.find('.answer-sources').exists()).toBe(false)
  })
  it('renders nothing for direct admin navigation without permission',()=>{
    const wrapper=mount(AccessPanel,{props:{destinations:[],canManage:false}});wrappers.push(wrapper);expect(wrapper.find('[data-testid="knowledge-access-admin"]').exists()).toBe(false);expect(wrapper.findAll('button')).toHaveLength(0)
  })
  it('keeps admin settings limited to connection and synchronization records',()=>{
    const wrapper=mount(AccessPanel,{props:{destinations:[],canManage:true},global:{stubs:{Teleport:true}}});wrappers.push(wrapper);expect(wrapper.text()).toContain('数据源');expect(wrapper.text()).toContain('配置连接');expect(wrapper.text()).toContain('同步记录');expect(wrapper.text()).not.toContain('新建数据源');expect(wrapper.text()).not.toContain('指定同步执行身份')
  })
  it('records the initiating user for every synchronization job',()=>{
    const wrapper=mount(AccessPanel,{props:{destinations:[],canManage:true},global:{stubs:{Teleport:true}}});wrappers.push(wrapper);expect(wrapper.get('.record-table').text()).toContain('朝暮');expect(wrapper.get('.record-table').text()).toContain('清晖');expect(wrapper.get('.record-table').text()).toContain('知夏')
  })
})
