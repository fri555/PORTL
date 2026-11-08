import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import KnowledgeBaseView from '@/views/KnowledgeBaseView.vue'
import KnowledgeSidebar from '@/components/knowledge/source-clone/KnowledgeSidebar.vue'
import KnowledgeDialogs from '@/components/knowledge/source-clone/KnowledgeDialogs.vue'
import KnowledgeAccessPanel from '@/components/knowledge/source-clone/KnowledgeAccessPanel.vue'
import DingTalkDocumentImport from '@/components/knowledge/source-clone/DingTalkDocumentImport.vue'
import { personalDingTalkDocuments } from '@/components/knowledge/source-clone/dingtalkPrototype'
import { useAppStore } from '@/stores/app'
import { mockUser } from '@/mock/user'
import type { DingTalkImportTask, SourceKnowledgeBase } from '@/types/knowledge-source'
import { toast } from 'vue-sonner'

vi.mock('vue-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const wrappers: ReturnType<typeof mount>[] = []
const selectStub = { props: ['modelValue'], template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot/></select>' }
const optionStub = { props: ['value', 'label'], template: '<option :value="value">{{label}}</option>' }
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); localStorage.clear(); vi.clearAllMocks(); vi.useRealTimers() })
async function page(url = '/knowledge?view=sync', role: 'admin' | 'user' = 'user') {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAppStore().login({ ...mockUser, role })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/knowledge', component: KnowledgeBaseView }] })
  await router.push(url)
  await router.isReady()
  const wrapper = mount(KnowledgeBaseView, { global: { plugins: [pinia, router], stubs: { Teleport: true, ElSelect: selectStub, ElOption: optionStub } } })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

// The knowledge center keeps its task list with edit and schedule controls; the
// backend owns execution. These cover stable references, import registration and history.
describe('knowledge center background sync integration', () => {
  it('uses the clicked sidebar folder as the upload target', async () => {
    const wrapper = await page('/knowledge', 'admin')
    const sidebar = wrapper.getComponent(KnowledgeSidebar)
    const base = (sidebar.props('items') as SourceKnowledgeBase[]).find(item => item.id === 'kb-public-1')!
    const folder = base.nodes!.find(node => node.id === 'policy-hr')!
    sidebar.vm.$emit('node-action', { kind: 'upload', target: folder, kbId: base.id })
    await flushPromises()
    expect(wrapper.getComponent(KnowledgeDialogs).props('kind')).toBe('upload')
    expect(wrapper.getComponent(KnowledgeDialogs).props('target')?.id).toBe('policy-hr')
  })

  it('derives every referencing agent from stable local file IDs without creating agent tasks', async () => {
    const wrapper = await page()
    const tasks = wrapper.getComponent(KnowledgeAccessPanel).props('records') as DingTalkImportTask[]
    const task = tasks.find(item => item.importTaskId === 'DT-20261012-0001')!
    expect(task).toMatchObject({ syncMode: 'backend-managed', syncRuntime: 'prototype', referencedAgentIds: ['biz-01', 'biz-02'], referenceRefreshResult: '待后台接入' })
    expect(tasks.some(item => item.taskKind === 'agent-reference')).toBe(false)
    expect(wrapper.find('[data-action="create-agent-task"]').exists()).toBe(false)
    await wrapper.findAll('.records-tabs button').find(button => button.text() === '记录')!.trigger('click')
    expect(wrapper.get('[data-testid="dingtalk-sync-record"]').text()).toContain('待后台接入')
  })

  it('registers an import with its schedule and retains an execution record', async () => {
    const wrapper = await page('/knowledge?import=dingtalk', 'admin')
    const importer = wrapper.getComponent(DingTalkDocumentImport)
    const document = personalDingTalkDocuments(importer.props('identity')).find(item => item.id === 'catalog')!
    importer.vm.$emit('complete', { destinationId: 'kb-public-2', documents: [document], platformUserId: mockUser.id, frequency: '每天', schedule: '00:00' })
    await flushPromises()
    await wrapper.get('[data-testid="knowledge-action-row"]').get('[aria-label="知识接入"]').trigger('click')
    const panel = wrapper.getComponent(KnowledgeAccessPanel)
    const task = (panel.props('records') as DingTalkImportTask[]).find(item => item.documentMappings.some(mapping => mapping.sourceDocumentId === 'catalog'))!
    expect(task).toMatchObject({ syncMode: 'backend-managed', syncRuntime: 'prototype', referencedAgentIds: [], referenceRefreshResult: '无引用' })
    expect(task.frequency).toBe('每天')
    expect(task.schedule).toBe('00:00')
    expect(task.recordId).toMatch(/^R-/)
    expect(task.executedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
    expect((panel.props('executionRecords') as DingTalkImportTask[]).some(record => record.recordId === task.recordId)).toBe(true)
    await wrapper.findAll('.records-tabs button').find(button => button.text() === '记录')!.trigger('click')
    expect(wrapper.find(`[aria-label="查看同步记录${task.recordId}"]`).exists()).toBe(true)
  })

  it('does not run a browser scheduler or fabricate later sync executions', async () => {
    const wrapper = await page()
    const before = wrapper.getComponent(KnowledgeAccessPanel).props('executionRecords') as DingTalkImportTask[]
    const recordIds = before.map(record => record.recordId)
    vi.useFakeTimers()
    await vi.advanceTimersByTimeAsync(2 * 24 * 60 * 60 * 1000)
    const after = wrapper.getComponent(KnowledgeAccessPanel).props('executionRecords') as DingTalkImportTask[]
    expect(after.map(record => record.recordId)).toEqual(recordIds)
    expect(after.some(record => record.referenceRefreshResult === '已刷新')).toBe(false)
  })

  it('submits one immediate execution and blocks another submission for ten minutes', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-08T10:00:00+08:00'))
    const wrapper = await page('/knowledge?view=access', 'admin')
    const panel = wrapper.getComponent(KnowledgeAccessPanel)
    const before = (panel.props('executionRecords') as DingTalkImportTask[]).length
    const task = (panel.props('records') as DingTalkImportTask[])[0]!

    panel.vm.$emit('execute-task', task)
    await flushPromises()
    expect((wrapper.getComponent(KnowledgeAccessPanel).props('executionRecords') as DingTalkImportTask[])).toHaveLength(before + 1)
    expect((wrapper.getComponent(KnowledgeAccessPanel).props('executionRecords') as DingTalkImportTask[])[0]).toMatchObject({
      importTaskId: task.importTaskId,
      status: '同步中',
    })
    expect(toast.success).toHaveBeenCalledWith('已提交执行，请在知识接入-同步记录界面查看')

    panel.vm.$emit('execute-task', (panel.props('records') as DingTalkImportTask[])[0]!)
    await flushPromises()
    expect((wrapper.getComponent(KnowledgeAccessPanel).props('executionRecords') as DingTalkImportTask[])).toHaveLength(before + 1)
    expect(toast.error).toHaveBeenCalledWith('该同步任务正在进行中，请10分钟后重试')

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000)
    panel.vm.$emit('execute-task', (panel.props('records') as DingTalkImportTask[])[0]!)
    await flushPromises()
    expect((wrapper.getComponent(KnowledgeAccessPanel).props('executionRecords') as DingTalkImportTask[])).toHaveLength(before + 2)
  })

  it('deletes an unreferenced imported file and detaches automatic sync while keeping history', async () => {
    const wrapper = await page()
    const sidebar = wrapper.getComponent(KnowledgeSidebar)
    const base = (sidebar.props('items') as SourceKnowledgeBase[]).find(item => item.id === 'kb-public-1')!
    const folder = base.nodes!.find(node => node.id === 'policy-hr')!
    const file = folder.children!.find(node => node.id === 'policy-import-attendance')!
    sidebar.vm.$emit('node-action', { kind: 'delete', target: file, kbId: base.id })
    await flushPromises()
    expect(wrapper.getComponent(KnowledgeDialogs).props('kind')).toBe('delete')
    wrapper.getComponent(KnowledgeDialogs).vm.$emit('confirm-delete')
    await flushPromises()
    expect(folder.children?.some(node => node.id === file.id)).toBe(false)
    await wrapper.get('[data-testid="knowledge-action-row"]').get('[aria-label="同步记录"]').trigger('click')
    const panel = wrapper.getComponent(KnowledgeAccessPanel)
    const task = (panel.props('records') as DingTalkImportTask[]).find(item => item.importTaskId === 'DT-20261012-0001')!
    expect(task.documentMappings.map(mapping => mapping.localFileId)).toEqual(['policy-import-onboarding'])
    expect((panel.props('executionRecords') as DingTalkImportTask[]).find(record => record.recordId === 'R001')?.documentMappings.some(mapping => mapping.localFileId === file.id)).toBe(true)
  })

  it.each(['file', 'folder', 'kb'] as const)('preserves a referenced file when deleting its %s target', async kind => {
    const wrapper = await page('/knowledge', 'admin')
    const sidebar = wrapper.getComponent(KnowledgeSidebar)
    const base = (sidebar.props('items') as SourceKnowledgeBase[]).find(item => item.id === 'kb-public-1')!
    const folder = base.nodes!.find(node => node.id === 'policy-hr')!
    const file = folder.children!.find(node => node.id === 'policy-import-onboarding')!
    const target = kind === 'kb' ? base : kind === 'folder' ? folder : file
    sidebar.vm.$emit('node-action', { kind: 'delete', target, kbId: base.id })
    await flushPromises()
    expect(wrapper.getComponent(KnowledgeDialogs).props('kind')).toBeNull()
    expect(folder.children?.some(node => node.id === file.id)).toBe(true)
    expect((sidebar.props('items') as SourceKnowledgeBase[]).some(item => item.id === base.id)).toBe(true)
  })
})
