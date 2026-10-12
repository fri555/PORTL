import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const wrappers: ReturnType<typeof mount>[] = []
const tagStub = { props: ['modelValue', 'max'], emits: ['update:modelValue'], template: `<input data-testid="manual-systems" :value="(modelValue || []).join(',')" @input="$emit('update:modelValue', $event.target.value.split(','))" />` }
beforeEach(() => { localStorage.clear(); vi.resetModules() })
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.restoreAllMocks() })
async function settings() {
  const { default: View } = await import('@/components/settings/AgentSettingsView.vue')
  const wrapper = mount(View, { global: { stubs: { ElInputTag: tagStub, ElSelect: { template: '<select><slot /></select>' }, ElOption: { template: '<option><slot /></option>' } } } })
  wrappers.push(wrapper); await flushPromises(); return wrapper
}
async function edit(w: ReturnType<typeof mount>, id = 'biz-01') {
  await w.get(`[data-testid="settings-agent-row-${id}"] [aria-label="更多操作"]`).trigger('click')
  await w.findAll('[role="menuitem"]').find(item => item.text() === '编辑')!.trigger('click'); await flushPromises()
}
async function usage(w: ReturnType<typeof mount>) {
  await w.findAll('[role="tab"]').find(item => item.text().includes('使用说明'))!.trigger('click'); await flushPromises()
}
async function save(w: ReturnType<typeof mount>) {
  await w.findAll('button').find(item => item.text() === '保存')!.trigger('click'); await flushPromises()
}

describe('usage instructions simplified form', () => {
  it('accepts each 500-character text independently and keeps optional systems empty', async () => {
    const { validateUsageForm, validateUsageInstructions, usageContentFromForm } = await import('@/utils/agentUsage')
    const form = { systems: [], input: '入'.repeat(500), output: '出'.repeat(500), limits: '限'.repeat(500) }
    expect(validateUsageForm(form)).toBeNull()
    expect(validateUsageInstructions(usageContentFromForm(form))).toBeNull()
    for (const key of ['input', 'output', 'limits'] as const) expect(validateUsageForm({ ...form, [key]: '字'.repeat(501) })).not.toBeNull()
    expect(validateUsageForm({ systems: [], input: '', output: '', limits: '' })).toBe('请填写「使用限制」')
  })
  it('only removes confirmed automatic tags and retains real business-system labels', async () => {
    const { stripAutomaticSystemTags } = await import('@/utils/agentUsage')
    const systems = ['知识库', '企业知识库', '联网查询', '商品中心', '门店系统', '自营系统', '数据平台']
    expect(stripAutomaticSystemTags(systems, { connectedSystems: ['数据平台'], hasKnowledge: true, internetEnabled: true })).toEqual(['商品中心', '门店系统', '自营系统'])
    expect(stripAutomaticSystemTags(systems, {})).toEqual(systems)
  })
  it('shows only manual systems in the settings form and preserves capability metadata on save', async () => {
    const store = await import('@/utils/expertPrototypeStore')
    const { usageContentFromForm } = await import('@/utils/agentUsage')
    const before = store.getPublishedExpert('biz-01')!
    const metadata = { ...before.capabilities, connectedSystems: ['知识库', '数据平台'], selectedDocumentNames: ['授权制度.docx'], knowledgeDocuments: [{ id: 'doc-real', name: '授权制度.docx', lastSuccessfulSyncAt: '2026-10-09T01:00:00Z' }], internetEnabled: true, connectors: [{ id: 'connector-real', name: '业务连接器', protocol: 'STREAMABLE-HTTP' }], skills: [{ id: 'skill-real', name: '业务技能', identifier: 'BUSINESS' }] }
    expect(store.saveExpertDraft({ ...before, useDepartments: ['商品部'], capabilities: metadata, usageInstructions: usageContentFromForm({ systems: ['知识库', '联网查询', '商品中心'], input: '', output: '', limits: '仅处理授权数据' }) })).toBeNull()
    const w = await settings(); await edit(w); await usage(w)
    expect((w.get('[data-testid="usage-field-systems"]').element as HTMLInputElement).value).toBe('商品中心')
    expect(w.find('[data-testid="automatic-systems"]').exists()).toBe(false)
    expect(w.text()).not.toContain('保存草稿')
    expect(w.text()).not.toContain('当前编辑草稿')
    expect(w.findAll('button').filter(item => ['保存', '发布', '模拟发布'].includes(item.text()))).toHaveLength(1)
    await w.get('[data-testid="usage-field-systems"]').setValue(Array.from({ length: 8 }, (_, i) => `业务系统${i}`).join(','))
    await save(w)
    const after = store.getPublishedExpert('biz-01')!
    expect(after.capabilities?.connectors).toEqual(metadata.connectors)
    expect(after.capabilities?.skills).toEqual(metadata.skills)
    expect(after.capabilities?.knowledgeDocuments).toEqual(metadata.knowledgeDocuments)
    expect(after.useDepartments).toEqual(['商品部'])
    expect(after.usageInstructions).toContain('业务系统7')
    expect(after.usageInstructions).not.toContain('知识库')
  }, 15000)
  it('exposes 500-character limits and publishes an automatic-only expert without fictitious manual tags', async () => {
    const w = await settings(); await edit(w); await usage(w)
    for (const field of ['input', 'output', 'limits']) expect(w.get(`[data-testid="usage-field-${field}"]`).attributes('maxlength')).toBe('500')
    await w.get('[data-testid="usage-field-systems"]').setValue('')
    await w.get('[data-testid="usage-field-input"]').setValue('字'.repeat(500))
    await w.get('[data-testid="usage-field-output"]').setValue('字'.repeat(500))
    await w.get('[data-testid="usage-field-limits"]').setValue('字'.repeat(500))
    await save(w)
    const store = await import('@/utils/expertPrototypeStore')
    expect(store.getPublishedExpert('biz-01')?.usageInstructions).toContain('字'.repeat(500))
    expect(w.find('[data-testid="usage-field-limits"]').exists()).toBe(false)
  }, 15000)
})
