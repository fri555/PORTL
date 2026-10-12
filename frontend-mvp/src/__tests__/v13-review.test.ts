import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Sidebar from '@/components/chat/source-clone/SourceChatSidebar.vue'
import { getExpertDraft, getPublishedExpert, saveExpertDraft, publishExpertDraft } from '@/utils/expertPrototypeStore'
import { createUsageForm, usageContentFromForm, usageFormFromContent, validateUsageInstructions, USAGE_TEMPLATE } from '@/utils/agentUsage'

describe('review changes', () => {
  it('round-trips the concise usage form into the published text format', () => {
    const form = createUsageForm()
    form.systems = ['商品中心', '数据平台']
    form.input = 'SKU、时间范围'
    form.output = '分析报告'
    form.limits = '不支持链接维度查询；不覆盖未授权数据'
    const content = usageContentFromForm(form)
    expect(validateUsageInstructions(content)).toBeNull()
    expect(usageFormFromContent(content)).toEqual(form)
  })
  it('pins directly without opening a task, keeps five rows, and reorders on unpin', async () => {
    const dailySessions=Array.from({length:7},(_,i)=>({id:`t${i}`,title:`任务${i}`,timestamp:`2026-10-0${7-i} 10:00`,mode:'daily' as const}))
    const w=mount(Sidebar,{props:{dailySessions,expertSessions:[]}})
    expect(w.findAll('.source-chat-sidebar__session')).toHaveLength(5)
    await w.findAll('.source-chat-sidebar__pin')[3]!.trigger('click')
    expect(w.find('.source-chat-sidebar__session-main').text()).toContain('任务3')
    expect(w.emitted('open-session')).toBeUndefined()
    await w.get('[aria-label="取消置顶"]').trigger('click')
    expect(w.find('.source-chat-sidebar__session-main').text()).toContain('任务0')
    await w.findAll('button').find(b=>b.text()==='查看更多')!.trigger('click')
    expect(w.findAll('.source-chat-sidebar__session')).toHaveLength(7)
    w.unmount()
  })
  it('does not expose a saved draft until publication and validates the required usage fields', () => {
    const original=getExpertDraft('biz-01')!
    const before=getPublishedExpert('biz-01')!
    const draft={...original,usageInstructions:original.usageInstructions+'\n新增复核说明'}
    expect(saveExpertDraft(draft)).toBeNull()
    expect(getExpertDraft('biz-01')!.usageInstructions).toBe(draft.usageInstructions)
    expect(getPublishedExpert('biz-01')!.usageInstructions).toBe(before.usageInstructions)
    expect(publishExpertDraft({...draft,usageInstructions:USAGE_TEMPLATE})).toBeTruthy()
    expect(publishExpertDraft(draft)).toBeNull()
    expect(getPublishedExpert('biz-01')!.usageInstructions).toBe(draft.usageInstructions)
    publishExpertDraft(before)
    expect(validateUsageInstructions('字'.repeat(1001),false)).toBeTruthy()
  })
})



