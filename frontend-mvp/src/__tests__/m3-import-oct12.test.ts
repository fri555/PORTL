import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import KnowledgeBaseView from '@/views/KnowledgeBaseView.vue'
import KnowledgeDestinationSelect from '@/components/knowledge/source-clone/KnowledgeDestinationSelect.vue'
import ImportDialog from '@/components/knowledge/source-clone/DingTalkDocumentImport.vue'
import AccessPanel from '@/components/knowledge/source-clone/KnowledgeAccessPanel.vue'
import { boundDingTalkIdentity, personalDingTalkDocuments } from '@/components/knowledge/source-clone/dingtalkPrototype'
import { useAppStore } from '@/stores/app'
import { dingTalkImportTaskFixtures, scopedDingTalkImportTasks } from '@/mock/dingtalk-import-tasks'
import { mockUser } from '@/mock/user'
import type { DingTalkImportTask } from '@/types/knowledge-source'
const wrappers: ReturnType<typeof mount>[] = []
const dialogStub = { props: ['modelValue'], template: '<section v-if="modelValue"><slot/><slot name="footer"/></section>' }
const stubs = { ElDialog: dialogStub, Teleport: true, ElSelect: { props: ['modelValue'], template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot/></select>' }, ElOption: { props: ['value', 'label'], template: '<option :value="value">{{label}}</option>' } }
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); localStorage.clear() })
async function page(url = '/knowledge', role: 'admin' | 'user' = 'admin') {
  const pinia = createPinia(); setActivePinia(pinia); useAppStore().login({ ...mockUser, role })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/knowledge', component: KnowledgeBaseView }] })
  await router.push(url); await router.isReady()
  const w = mount(KnowledgeBaseView, { attachTo: document.body, global: { plugins: [pinia, router], stubs } }); wrappers.push(w); await flushPromises(); return w
}
async function menu(w: ReturnType<typeof mount>) {
  await w.get('[aria-label="新建"]').trigger('click')
  return w.get('[aria-label="新建菜单"]').findAll('[role="menuitem"]').map(button => button.attributes('aria-label'))
}
describe('M3 context, tree destinations and task records', () => {
  it('scopes task data by logged-in user and role before the UI renders it', () => {
    expect(scopedDingTalkImportTasks(dingTalkImportTaskFixtures, 'u_001', 'user').map(task => task.importTaskId)).toEqual(['DT-20261012-0001', 'DT-20261006-0007'])
    expect(scopedDingTalkImportTasks(dingTalkImportTaskFixtures, 'u_001', 'admin')).toHaveLength(7)
    expect(scopedDingTalkImportTasks(dingTalkImportTaskFixtures, undefined, 'admin')).toEqual([])
    expect(scopedDingTalkImportTasks(dingTalkImportTaskFixtures, 'unknown', 'user')).toEqual([])
  })
  it('opens own sync records from the toolbar and hides all connection configuration', async () => {
    const w = await page('/knowledge', 'user')
    await w.get('.knowledge-sidebar__access').trigger('click')
    expect(w.find('[data-testid="knowledge-sync-personal"]').exists()).toBe(true)
    expect(w.find('[data-testid="knowledge-access-admin"]').exists()).toBe(false)
    expect(w.find('[data-testid="dingtalk-connection-card"]').exists()).toBe(false)
    expect(w.text()).not.toContain('配置连接')
    await w.findAll('.records-tabs button').find(button => button.text() === '记录')!.trigger('click')
    expect(w.findAll('[data-testid="dingtalk-sync-record"]')).toHaveLength(2)
    expect(w.text()).not.toContain('清晖')
    expect(w.text()).not.toContain('知夏')
  })
  it('allows own schedule updates but rejects a forged other-user task update', async () => {
    const w = await page('/knowledge?view=sync', 'user')
    const panel = w.getComponent(AccessPanel)
    const before = (panel.props('records') as DingTalkImportTask[])[0]!
    panel.vm.$emit('update-schedule', 'DT-20261011-0002', '每天', '10:00')
    await w.vm.$nextTick()
    expect((panel.props('records') as DingTalkImportTask[]).map(task => task.importTaskId)).toEqual(['DT-20261012-0001', 'DT-20261006-0007'])
    panel.vm.$emit('update-schedule', before.importTaskId, '不自动同步', '—')
    await w.vm.$nextTick()
    expect((panel.props('records') as DingTalkImportTask[])[0]!.frequency).toBe('不自动同步')
    expect((panel.props('records') as DingTalkImportTask[])[0]!.importTaskId).toBe(before.importTaskId)
  })
  it('blocks ordinary-user direct navigation to admin connection settings', async () => {
    const w = await page('/knowledge?view=access', 'user')
    expect(w.findComponent(AccessPanel).exists()).toBe(false)
    expect(w.find('[data-testid="knowledge-access-admin"]').exists()).toBe(false)
  })
  it('shows four root actions, three KB actions and two folder actions', async () => {
    expect(await menu(await page())).toEqual(['新建知识库', '新建文件夹', '上传文件', '从钉钉导入'])
    expect(await menu(await page('/knowledge?kb=kb-public-1'))).toEqual(['新建文件夹', '上传文件', '从钉钉导入'])
    expect(await menu(await page('/knowledge?kb=kb-public-1&folder=policy-hr'))).toEqual(['上传文件', '从钉钉导入'])
  })
  it('starts root import empty and defaults KB/folder import to its current writable node', async () => {
    const root = await page('/knowledge?import=dingtalk')
    expect(root.getComponent(ImportDialog).get('[aria-label="上传至"]').text()).toContain('请选择知识库或文件夹')
    const kb = await page('/knowledge?kb=kb-public-1&import=dingtalk')
    expect(kb.getComponent(ImportDialog).get('[aria-label="上传至"]').text()).toContain('集团制度知识库')
    const folder = await page('/knowledge?kb=kb-public-1&folder=policy-hr&import=dingtalk')
    expect(folder.getComponent(ImportDialog).get('[aria-label="上传至"]').text()).toContain('集团制度知识库 / 人事制度')
    await folder.getComponent(ImportDialog).get('[aria-label="上传至"]').trigger('click')
    await folder.get('[aria-label="存放至AI学习笔记"]').trigger('click')
    expect(folder.getComponent(ImportDialog).get('[aria-label="上传至"]').text()).toBe('AI学习笔记')
  })
  it('uses the same single-select KB→folder tree for upload and import and hides nested folder creation', async () => {
    const w = await page('/knowledge?kb=kb-public-1&folder=policy-hr&upload=true')
    const selector = w.getComponent(KnowledgeDestinationSelect)
    expect(selector.get('[aria-label="上传至"]').text()).toContain('人事制度')
    await selector.get('[aria-label="上传至"]').trigger('click')
    expect(selector.findAll('[role="treeitem"][aria-level="2"]').map(row => row.text())).toContain('人事制度')
    expect(selector.find('[role="treeitem"][aria-level="3"]').exists()).toBe(false)
    expect(selector.find('input[type="checkbox"]').exists()).toBe(false)
  })
  it('offers ordinary users only writable personal destinations including their folders', async () => {
    const w = await page('/knowledge?import=dingtalk', 'user')
    const destinations = w.getComponent(ImportDialog).props('destinations')
    expect(destinations.some(item => item.id === 'kb-public-1')).toBe(true)
    expect(destinations.some(item => item.id === 'policy-hr')).toBe(true)
    expect(destinations.some(item => item.id === 'personal-key-customers' && item.parentId === 'kb-personal-1')).toBe(true)
    expect(w.find('.knowledge-sidebar__access').exists()).toBe(true)
  })
  it('creates one task with two source-to-local mappings and saves into the selected folder', async () => {
    const w = await page('/knowledge?kb=kb-public-1&folder=policy-hr&import=dingtalk')
    // The existing onboarding/attendance fixture is already imported to this KB.
    const docs = personalDingTalkDocuments(boundDingTalkIdentity(mockUser)).filter(item => ['catalog', 'launch'].includes(item.id))
    w.getComponent(ImportDialog).vm.$emit('complete', { destinationId: 'policy-hr', documents: docs, platformUserId: mockUser.id, frequency: '每天', schedule: '00:00' })
    await w.vm.$nextTick()
    expect(w.text()).toContain('商品分类说明.xlsx'); expect(w.text()).toContain('新品上架流程.docx')
    await w.get('[aria-label="展开侧栏"]').trigger('click'); await w.get('.knowledge-sidebar__access').trigger('click')
    const panel = w.getComponent(AccessPanel)
    const records = panel.props('records') as DingTalkImportTask[]
    expect(records).toHaveLength(8)
    const task = records[0]!
    expect(task.importTaskId).toMatch(/^DT-/)
    expect(task.documentMappings.map(item => item.sourceDocumentId)).toEqual(['catalog', 'launch'])
    expect(task.documentMappings.every(item => item.localFileId)).toBe(true)
    expect(task.destinationId).toBe('policy-hr')
    const originalMappings = task.documentMappings.map(item => item.localFileId)
    panel.vm.$emit('update-schedule', task.importTaskId, '每周', '周一 09:00'); await w.vm.$nextTick()
    expect(records[0]!.importTaskId).toBe(task.importTaskId)
    expect(records[0]!.documentMappings.map(item => item.localFileId)).toEqual(originalMappings)
    expect(records[0]!.frequency).toBe('每周')
  })
  it('separates sources/destination, joins multiple document sources with semicolons, and searches alias/source/destination', async () => {
    const w = await page('/knowledge?view=access')
    await w.findAll('.records-tabs button').find(button => button.text() === '记录')!.trigger('click')
    expect(w.get('.record-head').text()).toContain('来源')
    const rows = w.findAll('[data-testid="dingtalk-sync-record"]')
    expect(rows).toHaveLength(7)
    expect(rows[0]!.get('.source-cell').text()).toContain('；')
    expect(rows[0]!.get('.destination-cell').text()).toBe('集团制度知识库 / 人事制度')
    const search = w.get('input[aria-label="搜索同步记录"]')
    for (const keyword of ['朝暮', '集团制度知识库']) {
      await search.setValue(keyword)
      expect(w.findAll('[data-testid="dingtalk-sync-record"]')).toHaveLength(2)
    }
    await search.setValue('新员工入职指南')
    expect(w.findAll('[data-testid="dingtalk-sync-record"]')).toHaveLength(1)
    await search.setValue('没有匹配'); expect(w.text()).toContain('暂无匹配的同步记录')
  })
  it('creates a root folder only after selecting a writable knowledge base', async () => {
    const w = await page()
    await w.get('[aria-label="新建"]').trigger('click'); await w.get('[aria-label="新建文件夹"]').trigger('click')
    await w.get('#folder-name').setValue('评审资料')
    expect(w.get('form button[type="submit"]').attributes('disabled')).toBeDefined()
    await w.get('#folder-kb').trigger('click'); await w.get('[aria-label="存放至集团制度知识库"]').trigger('click')
    await w.get('form').trigger('submit')
    await w.findAll('[data-testid="knowledge-kb-row"]')[0]!.trigger('click')
    expect(w.text()).toContain('评审资料')
  })
})
