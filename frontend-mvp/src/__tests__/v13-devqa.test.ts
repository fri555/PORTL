import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AccessForm from '@/components/knowledge/source-clone/DingTalkAccessForm.vue'
import AccessPanel from '@/components/knowledge/source-clone/KnowledgeAccessPanel.vue'
import Citations from '@/components/chat/source-clone/AnswerCitations.vue'
import { citationSources, citedParagraphs } from '@/mock/citations'
import ChatDetail from '@/components/chat/source-clone/SourceChatDetail.vue'
import ChatHome from '@/components/chat/source-clone/SourceChatHome.vue'
import { homeDraft } from '@/composables/useHomeDraft'
import Sidebar from '@/components/chat/source-clone/SourceChatSidebar.vue'
import ChatView from '@/views/SourceChatView.vue'
import { createMemoryHistory, createRouter } from 'vue-router'

const wrappers: ReturnType<typeof mount>[] = []
const dialog = { props: ['modelValue'], template: '<div v-if="modelValue"><slot/><slot name="footer"/></div>' }
const stubs = { ElDialog: dialog, Teleport: true, ElSelect: { props:['modelValue'], template:'<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot/></select>' }, ElOption: {props:['value','label'],template:'<option :value="value">{{label}}</option>'} }
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); homeDraft.value=''; window.history.replaceState({}, '', '/') })
function keep(w: ReturnType<typeof mount>) { wrappers.push(w); return w }
async function click(w: ReturnType<typeof mount>, label: string) {
  const button = w.findAll('button').find(b => b.text() === label)
  expect(button, label).toBeTruthy(); await button!.trigger('click'); await flushPromises()
}
async function configuredForm() {
  vi.useFakeTimers()
  const w = keep(mount(AccessForm, { props: { destinations: [{id:'kb',name:'测试库'}] }, global:{ stubs } }))
  await click(w,'填入示例'); await click(w,'测试连接并继续'); await vi.advanceTimersByTimeAsync(500)
  await w.findAll('input[type="checkbox"]')[0]!.setValue(true); await flushPromises()
  return w
}
describe('development and QA review boundaries', () => {
  it('selects an approval mode before sending and keeps it fixed in the conversation', async () => {
    const home = keep(mount(ChatHome, { global: { stubs } }))
    expect(home.get('[data-testid="approval-mode-trigger"]').text()).toContain('默认权限')
    await home.get('[data-testid="approval-mode-trigger"]').trigger('click')
    await home.get('[data-testid="approval-mode-autonomous"]').trigger('click')
    expect(home.get('[data-testid="approval-mode-trigger"]').text()).toContain('自主执行')
    await home.get('textarea').setValue('整理本周工作')
    await home.get('[aria-label="发送"]').trigger('click')
    expect(home.emitted('send')?.[0]).toEqual(['整理本周工作', 'autonomous'])

    const detail = keep(mount(ChatDetail, { props: { sessionId: 'daily-auth', approvalMode: 'autonomous' }, global: { stubs } }))
    expect(detail.get('[data-testid="conversation-approval-mode"]').text()).toContain('自主执行')
    expect(detail.find('[data-testid="approval-mode-trigger"]').exists()).toBe(false)
  })

  it('preserves explicit mandatory-human approval in both modes', async () => {
    window.history.replaceState({}, '', '/?humanRequired=1')
    for (const approvalMode of ['autonomous', 'default'] as const) {
      const detail = keep(mount(ChatDetail, { props: { sessionId: 'dws-action', approvalMode }, global: { stubs } }))
      expect(detail.get('[data-testid="execution-process-trigger"]').text()).toContain('等待账号授权')
      await detail.get('[aria-label="已完成钉钉授权"]').trigger('click')
      expect(detail.get('[data-testid="dws-confirm-card"]').text()).toContain('确认创建待办')
      expect(detail.get('[data-testid="execution-process-trigger"]').text()).toContain('等待操作确认')
      expect(detail.find('[data-testid="dws-result-card"]').exists()).toBe(false)
      await detail.get('[aria-label="确认执行钉钉操作"]').trigger('click')
      expect(detail.get('[data-testid="dws-result-card"]').text()).toContain('待办创建成功')
      expect(detail.get('[data-testid="execution-process-trigger"]').text()).toContain('处理完成')
    }
  })

  it('keeps reasoning collapsed and shows one tool call with the AI reply when expanded', async () => {
    window.history.replaceState({}, '', '/?planState=failed')
    const w = keep(mount(ChatDetail, { props: { sessionId: 'expert-plan' }, global: { stubs } }))
    const trigger = w.get('[data-testid="execution-process-trigger"]')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(trigger.text()).toContain('执行失败')
    expect(w.find('[data-testid="execution-process"]').exists()).toBe(false)
    await trigger.trigger('click')
    const timeline = w.get('[data-testid="execution-process"]')
    expect(timeline.text()).toContain('处理过程')
    expect(timeline.text()).toContain('工具调用')
    expect(timeline.text()).toContain('AI 回复')
    expect(timeline.text()).toContain('读取超时')
    expect(timeline.findAll('.tool-call-row')).toHaveLength(1)
    expect(timeline.findAll('[data-testid="execution-step"]')).toHaveLength(0)
    expect(timeline.text()).not.toContain('隐藏提示词正文')
  })
  it('keeps the fixed approval mode in the current conversation share link', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    const router=createRouter({history:createMemoryHistory(),routes:[{path:'/chat/:sessionId?',component:ChatView}]})
    await router.push('/chat/expert-plan?agent=biz-01&approvalMode=autonomous&share=1'); await router.isReady()
    const w=keep(mount(ChatView,{global:{plugins:[router],stubs:{...stubs,SourceChatSidebar:true,SourceChatHome:true,SourceChatDetail:true}}}))
    await click(w,'复制链接')
    expect((w.get('[aria-label="分享链接"]').element as HTMLInputElement).value).toContain('approvalMode=autonomous')
  })

  it('does not reopen a copy fallback in another conversation after a late rejection', async () => {
    let reject!: (reason:Error)=>void
    vi.stubGlobal('navigator',{clipboard:{writeText:()=>new Promise((_r,j)=>{reject=j})}})
    const router=createRouter({history:createMemoryHistory(),routes:[{path:'/chat/:sessionId?',component:ChatView}]})
    await router.push('/chat/first?share=1'); await router.isReady()
    const w=keep(mount(ChatView,{global:{plugins:[router],stubs:{...stubs,SourceChatSidebar:true,SourceChatHome:true,SourceChatDetail:true}}}))
    await click(w,'复制链接'); await router.push('/chat/second')
    reject(new Error('denied'));await flushPromises()
    expect(w.find('[aria-label="手动复制链接"]').exists()).toBe(false)
  })
  it('does not restore a removed task to the pinned area', async () => {
    const task={id:'daily-auth',title:'待恢复任务',timestamp:'2026-10-06 09:00',mode:'daily' as const}
    const w=keep(mount(Sidebar,{props:{dailySessions:[task],expertSessions:[]}}))
    expect(w.find('[aria-label="已置顶"]').exists()).toBe(true)
    await w.setProps({dailySessions:[]})
    expect(w.text()).not.toContain('待恢复任务')
    await w.setProps({dailySessions:[task]})
    expect(w.find('[aria-label="已置顶"]').exists()).toBe(false)
  })
  it('does not select an official template from a negative instruction', () => {
    const w = keep(mount(ChatDetail,{props:{sessionId:'expert-plan',initialPrompt:'生成 PPT，不要使用官方模板'},global:{stubs}}))
    expect(w.text()).toContain('普通模板')
    expect(w.text()).not.toContain('已选择天马官方模板')
  })
  it('accepts a user PPT template through the template skill and uses its name in the plan', async () => {
    const w = keep(mount(ChatDetail,{props:{sessionId:'expert-template'},global:{stubs}}))
    const skill = w.get('[data-testid="ppt-template-skill"]')
    expect(skill.text()).toContain('PPT 模板（技能待选型）')
    const input = skill.get('input[type="file"]')
    const file = new File(['pptx'], '季度复盘模板.pptx', { type:'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
    Object.defineProperty(input.element, 'files', { value:[file], configurable:true })
    await input.trigger('change')
    expect(skill.text()).toContain('季度复盘模板.pptx')
    expect(w.get('[data-testid="expert-plan-one-line"]').text()).toContain('季度复盘模板.pptx')
  })
  it('preserves completed deliverables and every follow-up message', async () => {
    vi.useFakeTimers()
    const w = keep(mount(ChatDetail,{props:{sessionId:'expert-plan'},global:{stubs}}))
    await click(w,'立即执行'); await vi.advanceTimersByTimeAsync(2000)
    const input=w.get('textarea')
    await input.setValue('第一条修改意见'); await input.trigger('keydown',{key:'Enter'})
    expect(w.find('.deliverables').exists()).toBe(true)
    await input.setValue('第二条修改意见'); await input.trigger('keydown',{key:'Enter'})
    expect(w.findAll('[data-testid="sent-follow-up"]').map(m=>m.text())).toEqual(['第一条修改意见','第二条修改意见'])
    expect(w.text()).toContain('已被新计划替代')
  })
  it('closes mention candidates after keyboard selection leaves the trigger', async () => {
    homeDraft.value=''
    const w=keep(mount(ChatHome,{global:{stubs}})); const input=w.get('textarea')
    await input.setValue('前文 @营销'); await input.trigger('input'); await flushPromises()
    expect(w.find('[role="listbox"]').exists()).toBe(true)
    ;(input.element as HTMLTextAreaElement).setSelectionRange(0,0)
    await input.trigger('keyup',{key:'Home'}); await flushPromises()
    expect(w.find('[role="listbox"]').exists()).toBe(false)
  })
  it('clears scope bound to old credentials when returning and changing credentials', async () => {
    const w = await configuredForm(); expect(w.text()).toContain('已选 3 篇')
    await click(w,'上一步'); await w.get('input[aria-label="App Key"]').setValue('new-app')
    await click(w,'测试连接并继续'); await vi.advanceTimersByTimeAsync(500)
    expect(w.text()).toContain('已选 0 篇')
  })
  it('does not convert individually selected documents into a dynamic folder scope', async () => {
    const w = await configuredForm()
    await w.findAll('input[type="checkbox"]')[0]!.setValue(false)
    await flushPromises()
    for (const index of [2,3,4]) { await w.findAll('input[type="checkbox"]')[index]!.setValue(true); await flushPromises() }
    expect(w.text(), JSON.stringify(w.findAll('input[type="checkbox"]').map(input=>({checked:(input.element as HTMLInputElement).checked,label:input.element.closest('.el-tree-node__content')?.textContent})))).toContain('已选 3 篇')
    await click(w,'下一步'); await w.get('select[aria-label="保存位置"]').setValue('kb'); await click(w,'创建数据源并同步 3 篇')
    expect((w.emitted('complete')?.[0]?.[0] as {selectedKeys:string[]}).selectedKeys).toEqual(['onboarding','attendance','expense'])
  })
  it('checks concurrent connection names again at final submission', async () => {
    const w = await configuredForm(); await click(w,'下一步')
    await w.get('select[aria-label="保存位置"]').setValue('kb')
    await w.setProps({existingNames:['钉钉 · 集团制度知识库']})
    await click(w,'创建数据源并同步 3 篇')
    expect(w.emitted('complete')).toBeUndefined(); expect(w.text()).toContain('连接名称已存在')
  })
  it('limits knowledge access settings to connection configuration and sync records', async () => {
    const w = keep(mount(AccessPanel,{props:{destinations:[{id:'kb',name:'测试库'}]},global:{stubs}}))
    expect(w.text()).toContain('数据源')
    expect(w.text()).toContain('配置连接')
    expect(w.text()).toContain('同步记录')
    expect(w.text()).not.toContain('新建数据源')
    expect(w.text()).not.toContain('指定同步执行身份')
  })
  it('allows an administrator to update a sync schedule from a record', async () => {
    const w = keep(mount(AccessPanel,{props:{destinations:[{id:'kb',name:'测试库'}]},global:{stubs}}))
    await click(w,'同步设置')
    expect(w.text()).toContain('同步频率')
    expect(w.text()).toContain('每日执行时间')
    await click(w,'保存')
    expect(w.text()).toContain('同步记录')
  })
  it('keeps the initiating user visible in every sync record', () => {
    const w = keep(mount(AccessPanel,{props:{destinations:[{id:'kb',name:'测试库'}]},global:{stubs}}))
    expect(w.text()).toContain('朝暮')
    expect(w.text()).toContain('清晖')
    expect(w.text()).toContain('知夏')
  })
  it('reserves citation numbers before late source metadata arrives', async () => {
    const w = keep(mount(Citations,{props:{answerId:'late',paragraphs:citedParagraphs,sources:citationSources.slice(1)},global:{stubs}}))
    const before = w.findAll('[data-citation-number]').map(b=>b.attributes('data-citation-number'))
    expect(before).toEqual(['2','3','4'])
    await w.setProps({sources:citationSources})
    expect(w.findAll('[data-citation-number]').map(b=>b.attributes('data-citation-number'))).toEqual(['1','1','2','3','4'])
  })
  it('reloads the selected preview after access is restored', async () => {
    const w = keep(mount(Citations,{props:{answerId:'acl',paragraphs:citedParagraphs,sources:citationSources},global:{stubs}}))
    await w.get('[data-citation-number="1"]').trigger('click'); await flushPromises()
    await w.setProps({sources:citationSources.map(s=>({...s,access:'forbidden' as const}))})
    await w.setProps({sources:citationSources}); await flushPromises()
    expect(w.get('.matched-fragment').text()).toContain('适用范围')
  })
  it('closes the source panel and releases the layout when its source disappears', async () => {
    const w = keep(mount(Citations,{props:{answerId:'missing',paragraphs:citedParagraphs,sources:citationSources},global:{stubs}}))
    await w.get('[data-citation-number="1"]').trigger('click'); await flushPromises()
    await w.setProps({sources:citationSources.slice(1)})
    expect(w.emitted('panel-change')?.at(-1)).toEqual([false])
  })
})






