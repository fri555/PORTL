import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const wrappers: ReturnType<typeof mount>[] = []
const tagStub = { props: ['modelValue'], emits: ['update:modelValue'], template: '<input data-testid="manual-systems" :value="(modelValue || []).join(\',\')" @input="$emit(\'update:modelValue\', $event.target.value.split(\',\'))" />' }
beforeEach(() => { localStorage.clear(); vi.resetModules() })
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.restoreAllMocks() })

async function settings() {
  const { default: AgentSettings } = await import('@/components/settings/AgentSettingsView.vue')
  const wrapper = mount(AgentSettings, { global: { stubs: { ElInputTag: tagStub, ElSelect: { template: '<select><slot /></select>' }, ElOption: { template: '<option><slot /></option>' } } } })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
async function action(wrapper: ReturnType<typeof mount>, id: string, label: string) {
  await wrapper.get(`[data-testid="settings-agent-row-${id}"] [aria-label="更多操作"]`).trigger('click')
  await wrapper.findAll('[role="menuitem"]').find(button => button.text() === label)!.trigger('click')
  await flushPromises()
}
async function step(wrapper: ReturnType<typeof mount>, label: string) {
  await wrapper.findAll('[role="tab"]').find(button => button.text().includes(label))!.trigger('click')
  await flushPromises()
}
async function publish(wrapper: ReturnType<typeof mount>) {
  await step(wrapper, '使用说明')
  await wrapper.findAll('button').find(button => button.text() === '保存')!.trigger('click')
  await flushPromises()
}

describe('source expert settings persistence', () => {
  it('refreshes imported knowledge files and binds only the selected local file ID when names collide', async () => {
    const wrapper = await settings()
    localStorage.setItem('tianma.prototype.knowledge-items.v2', JSON.stringify([{
      id: 'kb-imported', name: '项目资料', owner: '当前用户', createdAt: '2026-10-30', space: 'public', nodes: [
        { id: 'folder-a', name: '一组', kind: 'folder', owner: '当前用户', updatedAt: '2026-10-30', children: [
          { id: 'file-a', name: '同名流程.docx', kind: 'file', owner: '当前用户', updatedAt: '2026-10-30', format: 'DOCX', size: '10 KB' },
        ] },
        { id: 'folder-b', name: '二组', kind: 'folder', owner: '当前用户', updatedAt: '2026-10-30', children: [
          { id: 'file-b', name: '同名流程.docx', kind: 'file', owner: '当前用户', updatedAt: '2026-10-30', format: 'DOCX', size: '20 KB' },
        ] },
      ],
    }]))
    await wrapper.findAll('button').find(button => button.text() === '创建智能体')!.trigger('click')
    await wrapper.get('input[placeholder="请输入智能体名称"]').setValue('文档引用测试')
    await wrapper.get('textarea[placeholder="简短描述它的功能..."]').setValue('验证同名文档引用不会串联')
    await step(wrapper, '能力扩展')
    expect(wrapper.get('[data-testid="agent-knowledge-file-file-a"]').text()).toContain('一组')
    expect(wrapper.get('[data-testid="agent-knowledge-file-file-b"]').text()).toContain('二组')
    await wrapper.get('input[placeholder="搜索文档名称..."]').setValue('二组')
    expect(wrapper.find('[data-testid="agent-knowledge-file-file-a"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="agent-knowledge-file-file-b"]').exists()).toBe(true)
    await wrapper.get('input[placeholder="搜索文档名称..."]').setValue('')
    await wrapper.get('[data-testid="agent-knowledge-file-file-b"]').trigger('click')
    expect((wrapper.get('[data-testid="agent-knowledge-file-file-a"] input[type="checkbox"]').element as HTMLInputElement).checked).toBe(false)
    expect((wrapper.get('[data-testid="agent-knowledge-file-file-b"] input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true)
    await step(wrapper, '使用说明')
    await wrapper.get('[data-testid="usage-field-systems"]').setValue('知识')
    await wrapper.get('[data-testid="usage-field-limits"]').setValue('仅引用授权文档')
    await publish(wrapper)
    const store = await import('@/utils/expertPrototypeStore')
    const row = wrapper.findAll('[data-testid^="settings-agent-row-"]').find(item => item.text().includes('文档引用测试'))!
    const id = row.attributes('data-testid')!.replace('settings-agent-row-', '')
    expect(store.getPublishedExpert(id)?.capabilities?.selectedDocumentIds).toEqual(['file-b'])
    expect(store.getPublishedExpert(id)?.capabilities?.selectedDocumentNames).toEqual(['同名流程.docx'])
    await action(wrapper, id, '编辑')
    await step(wrapper, '能力扩展')
    expect((wrapper.get('[data-testid="agent-knowledge-file-file-a"] input[type="checkbox"]').element as HTMLInputElement).checked).toBe(false)
    expect((wrapper.get('[data-testid="agent-knowledge-file-file-b"] input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true)
  }, 15000)

  it('shows legacy document names without auto-binding a same-named knowledge file', async () => {
    const store = await import('@/utils/expertPrototypeStore')
    const expert = store.getPublishedExpert('biz-01')!
    expect(store.publishExpertDraft({ ...expert, capabilities: {
      ...expert.capabilities, selectedDocumentIds: [], selectedDocumentNames: ['新员工入职指南.docx'],
    } })).toBeNull()
    const wrapper = await settings()
    await action(wrapper, 'biz-01', '编辑')
    await step(wrapper, '能力扩展')
    expect(wrapper.text()).toContain('新员工入职指南.docx')
    expect((wrapper.get('[data-testid="agent-knowledge-file-policy-import-onboarding"] input[type="checkbox"]').element as HTMLInputElement).checked).toBe(false)
    await publish(wrapper)
    const updated = store.getPublishedExpert('biz-01')!
    expect(updated.capabilities?.selectedDocumentNames).toContain('新员工入职指南.docx')
    expect(updated.capabilities?.selectedDocumentIds).toEqual([])
  }, 15000)

  it('updates the open document picker after a knowledge cache change in another tab', async () => {
    const wrapper = await settings()
    await wrapper.findAll('button').find(button => button.text() === '创建智能体')!.trigger('click')
    await step(wrapper, '能力扩展')
    expect(wrapper.find('[data-testid="agent-knowledge-file-late-import"]').exists()).toBe(false)
    localStorage.setItem('tianma.prototype.knowledge-items.v2', JSON.stringify([{
      id: 'kb-late', name: '项目资料', owner: '当前用户', createdAt: '2026-10-30', space: 'public', nodes: [
        { id: 'late-import', name: '新导入项目说明.docx', kind: 'file', owner: '当前用户', updatedAt: '2026-10-30', format: 'DOCX', size: '12 KB' },
      ],
    }]))
    window.dispatchEvent(new StorageEvent('storage', { key: 'tianma.prototype.knowledge-items.v2' }))
    await flushPromises()
    expect(wrapper.get('[data-testid="agent-knowledge-file-late-import"]').text()).toContain('新导入项目说明.docx')
  }, 15000)

  it('edits the existing daily assistant using its existing avatar without uploading a new icon', async () => {
    const wrapper = await settings()
    const store = await import('@/utils/expertPrototypeStore')
    const before = store.getPublishedExpert('daily-assistant')!
    await action(wrapper, 'daily-assistant', '编辑')
    await step(wrapper, '使用说明')
    await wrapper.get('[data-testid="usage-field-limits"]').setValue('只处理当前账号已授权的信息')
    await publish(wrapper)
    expect(wrapper.find('[data-testid="settings-agent-row-daily-assistant"]').exists()).toBe(true)
    const current = store.getPublishedExpert('daily-assistant')!
    expect(current.usageInstructions).toContain('只处理当前账号已授权的信息')
    expect(current.avatarUrl).toBe(before.avatarUrl)
    expect(current.firstPublishedAt).toBe(before.firstPublishedAt)
    expect(store.expertAgents.some(agent => agent.id === 'daily-assistant')).toBe(false)
  }, 15000)

  it('persists an explicit model and role change on an existing source expert', async () => {
    const wrapper = await settings()
    await action(wrapper, 'biz-01', '编辑')
    await wrapper.findAll('select')[1]!.setValue('Qwen3 企业主模型')
    await step(wrapper, '角色设定')
    await wrapper.get('textarea').setValue('只分析用户授权的数据，并明确说明缺失字段')
    await publish(wrapper)
    const store = await import('@/utils/expertPrototypeStore')
    expect(store.getPublishedExpert('biz-01')?.defaultModel).toBe('Qwen3 企业主模型')
    expect(store.getPublishedExpert('biz-01')?.systemPrompt).toBe('只分析用户授权的数据，并明确说明缺失字段')
    await action(wrapper, 'biz-01', '编辑')
    expect((wrapper.findAll('select')[1]!.element as HTMLSelectElement).value).toBe('Qwen3 企业主模型')
    await step(wrapper, '角色设定')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('只分析用户授权的数据，并明确说明缺失字段')
  }, 15000)

  it('loads source shortcuts and persists a user shortcut title and content across edit', async () => {
    const wrapper = await settings()
    const store = await import('@/utils/expertPrototypeStore')
    const originalCommands = store.getPublishedExpert('biz-01')!.quickCommands
    await action(wrapper, 'biz-01', '编辑')
    expect(wrapper.text()).toContain(originalCommands[0])
    await wrapper.findAll('button').find(button => button.text().trim() === '添加提示词')!.trigger('click')
    await wrapper.get('input[placeholder="用于在列表中快速识别该提示词"]').setValue('自定义月报')
    await wrapper.get('textarea[placeholder="详细的提示词内容..."]').setValue('分析本月营收并列出需复核的异常')
    await wrapper.findAll('button').find(button => button.text() === '确定')!.trigger('click')
    await publish(wrapper)
    expect(store.getPublishedExpert('biz-01')?.quickCommands).toEqual([...originalCommands, '分析本月营收并列出需复核的异常'])
    await action(wrapper, 'biz-01', '编辑')
    expect(wrapper.text()).toContain('自定义月报')
    expect(wrapper.text()).toContain('分析本月营收并列出需复核的异常')
  }, 15000)

  it('deletes a published business expert and keeps its last publication available to history after reload', async () => {
    const wrapper = await settings()
    let store = await import('@/utils/expertPrototypeStore')
    const before = store.getPublishedExpert('biz-02')!
    await action(wrapper, 'biz-02', '删除')
    expect(wrapper.find('[data-testid="settings-agent-row-biz-02"]').exists()).toBe(false)
    expect(store.expertAgents.some(agent => agent.id === 'biz-02')).toBe(false)
    expect(store.getExpertDraft('biz-02')).toBeNull()
    expect(store.getPublishedExpert('biz-02')).toBeNull()
    expect(store.getHistoricalExpert('biz-02')).toEqual(before)
    vi.resetModules()
    store = await import('@/utils/expertPrototypeStore')
    const reloaded = await settings()
    expect(reloaded.find('[data-testid="settings-agent-row-biz-02"]').exists()).toBe(false)
    expect(store.expertAgents.some(agent => agent.id === 'biz-02')).toBe(false)
    expect(store.getHistoricalExpert('biz-02')).toEqual(before)
  }, 15000)

  it('does not restore the static daily row after deleting its persisted record', async () => {
    const wrapper = await settings()
    const store = await import('@/utils/expertPrototypeStore')
    const before = store.getPublishedExpert('daily-assistant')!
    await action(wrapper, 'daily-assistant', '删除')
    expect(wrapper.find('[data-testid="settings-agent-row-daily-assistant"]').exists()).toBe(false)
    vi.resetModules()
    const reloaded = await settings()
    const reloadedStore = await import('@/utils/expertPrototypeStore')
    expect(reloaded.find('[data-testid="settings-agent-row-daily-assistant"]').exists()).toBe(false)
    expect(reloadedStore.getHistoricalExpert('daily-assistant')).toEqual(before)
    expect(reloadedStore.expertAgents.some(agent => agent.id === 'daily-assistant')).toBe(false)
  }, 15000)

  it('keeps the visible and published expert if deletion cannot be persisted', async () => {
    const wrapper = await settings()
    const store = await import('@/utils/expertPrototypeStore')
    const before = store.getPublishedExpert('biz-02')!
    vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => { throw new Error('Storage unavailable') })
    await action(wrapper, 'biz-02', '删除')
    expect(wrapper.find('[data-testid="settings-agent-row-biz-02"]').exists()).toBe(true)
    expect(store.getPublishedExpert('biz-02')).toEqual(before)
    expect(store.expertAgents.find(agent => agent.id === 'biz-02')).toEqual(before)
    expect(wrapper.text()).not.toContain('智能体已删除')
  }, 15000)

  it('rejects stale saves, publications and status changes for a deleted expert', async () => {
    const store = await import('@/utils/expertPrototypeStore')
    const before = store.getPublishedExpert('biz-02')!
    expect(store.deleteExpert('biz-02')).toBeNull()
    expect(store.saveExpertDraft(before)).toBeTruthy()
    expect(store.publishExpertDraft(before)).toBeTruthy()
    expect(store.setExpertStatus('biz-02', 'online')).toBeTruthy()
    expect(store.expertAgents.some(agent => agent.id === 'biz-02')).toBe(false)
    expect(store.getHistoricalExpert('biz-02')).toEqual(before)
  })
})
