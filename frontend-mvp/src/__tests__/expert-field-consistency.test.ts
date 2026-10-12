import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'

const wrappers: ReturnType<typeof mount>[] = []
const tagStub = { props: ['modelValue'], emits: ['update:modelValue'], template: `<input :value="(modelValue || []).join(',')" @input="$emit('update:modelValue', $event.target.value.split(','))" />` }
const dialogStub = { props: ['modelValue'], template: '<section v-if="modelValue" role="dialog"><slot /></section>' }

beforeEach(() => { localStorage.clear(); vi.resetModules() })
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks() })

async function settings() {
  const { default: AgentSettings } = await import('@/components/settings/AgentSettingsView.vue')
  const wrapper = mount(AgentSettings, { attachTo: document.body, global: { stubs: { ElInputTag: tagStub, ElSelect: { template: '<select><slot /></select>' }, ElOption: { template: '<option><slot /></option>' } } } })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
async function step(wrapper: ReturnType<typeof mount>, name: string) {
  await wrapper.findAll('[role="tab"]').find(tab => tab.text().includes(name))!.trigger('click')
  await flushPromises()
}
async function edit(wrapper: ReturnType<typeof mount>, id: string) {
  await wrapper.get('[data-testid="settings-agent-row-' + id + '"] [aria-label="更多操作"]').trigger('click')
  await wrapper.findAll('[role="menuitem"]').find(button => button.text() === '编辑')!.trigger('click')
  await flushPromises()
}
async function save(wrapper: ReturnType<typeof mount>, _publish = true) {
  await step(wrapper, '使用说明')
  await wrapper.findAll('button').find(button => button.text() === '保存')!.trigger('click')
  await flushPromises()
}
async function centre() {
  const { default: AgentSquare } = await import('@/views/AgentSquareView.vue')
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: AgentSquare }] })
  await router.push('/'); await router.isReady()
  const wrapper = mount(AgentSquare, { global: { plugins: [router], stubs: { ElDialog: dialogStub } } })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

describe('expert field publication and empty values', () => {
  it.each(['', '   '])('blocks publication of a blank introduction without replacing the previous publication (%j)', async description => {
    const wrapper = await settings()
    const store = await import('@/utils/expertPrototypeStore')
    const before = store.getPublishedExpert('biz-01')!
    await edit(wrapper, 'biz-01')
    await wrapper.get('textarea[placeholder="简短描述它的功能..."]').setValue(description)
    await save(wrapper, true)
    const field = wrapper.find('textarea[placeholder="简短描述它的功能..."]')
    expect(field.exists()).toBe(true)
    expect(field.attributes('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(field.element)
    expect(store.getPublishedExpert('biz-01')).toEqual(before)
  })

  it('uses the existing platform icon and keeps a newly published expert owner unknown', async () => {
    const wrapper = await settings()
    await wrapper.findAll('button').find(button => button.text() === '创建智能体')!.trigger('click')
    await wrapper.get('input[placeholder="请输入智能体名称"]').setValue('默认图标专家')
    await wrapper.get('textarea[placeholder="简短描述它的功能..."]').setValue('说明任务的能力与范围')
    await step(wrapper, '使用说明')
    await wrapper.get('[data-testid="usage-field-limits"]').setValue('不处理未授权数据')
    await save(wrapper, true)
    const store = await import('@/utils/expertPrototypeStore')
    const published = store.expertAgents.find(agent => agent.name === '默认图标专家')!
    expect(published.avatarUrl).toContain('/assets/agents-online/tianma-assistant.png')
    expect(published.developerName).toBe('')
    expect(published.developerDepartment).toBe('')
    const { usageDetailSections } = await import('@/utils/agentUsage')
    expect(usageDetailSections(published.usageInstructions, published)[0]!.fields[0]!.value).toBe('未提供')
  })

  it.each(['', '   '])('keeps an unknown applicable department distinct from the owner department (%j)', async empty => {
    const store = await import('@/utils/expertPrototypeStore')
    store.expertAgents[0]!.developerDepartment = empty
    store.expertAgents[0]!.version = empty
    const wrapper = await centre()
    await wrapper.get('.agent-card').trigger('click'); await flushPromises()
    expect(wrapper.find('.modal-hero > div:last-child > span').exists()).toBe(false)
    expect(wrapper.get('[data-testid="expert-use-departments"]').text()).toBe('未提供')
    expect(wrapper.get('.modal-meta').text()).toBe('在线')
  })

  it('uses the configured applicable department in basic information without exposing the version', async () => {
    const store = await import('@/utils/expertPrototypeStore')
    store.expertAgents[0]!.developerDepartment = '数据部门'
    store.expertAgents[0]!.version = '2.1'
    store.expertAgents[0]!.useDepartments = ['商品部']
    const wrapper = await centre()
    await wrapper.get('.agent-card').trigger('click'); await flushPromises()
    expect(wrapper.find('.modal-hero > div:last-child > span').exists()).toBe(false)
    expect(wrapper.get('[data-testid="expert-use-departments"]').text()).toBe('商品部')
    expect(wrapper.get('.modal-meta').text()).toBe('在线')
  })

  it('shows the historical introduction fallback in both the card and detail without rewriting the record', async () => {
    const store = await import('@/utils/expertPrototypeStore')
    store.expertAgents[0]!.description = '   '
    const wrapper = await centre()
    expect(wrapper.get('.agent-card .agent-copy p').text()).toBe('默认智能体')
    await wrapper.get('.agent-card').trigger('click'); await flushPromises()
    expect(wrapper.get('.detail-description').text()).toBe('默认智能体')
    expect(store.expertAgents[0]!.description).toBe('   ')
  })
})

async function createExpert(wrapper: ReturnType<typeof mount>, name = '字段边界专家') {
  await wrapper.findAll('button').find(button => button.text() === '创建智能体')!.trigger('click')
  await wrapper.get('input[placeholder="请输入智能体名称"]').setValue(name)
  await wrapper.get('textarea[placeholder="简短描述它的功能..."]').setValue('说明能力配置与字段边界')
  await step(wrapper, '使用说明')
  await wrapper.get('[data-testid="usage-field-limits"]').setValue('不处理未授权数据')
  await step(wrapper, '基础设定')
}

describe('expert capability sources and new version validation', () => {
  it.each([false, true])('does not enable internet from a basic or manual system label (manual=%j)', async manual => {
    const wrapper = await settings()
    await createExpert(wrapper)
    if (manual) {
      await step(wrapper, '使用说明')
      await wrapper.get('[data-testid="usage-field-systems"]').setValue('联网')
    } else {
      await wrapper.findAll('button').find(button => button.text() === 'DWS')!.trigger('click')
    }
    await save(wrapper, true)
    const store = await import('@/utils/expertPrototypeStore')
    const published = store.expertAgents.find(agent => agent.name === '字段边界专家')!
    expect(published.capabilities?.internetEnabled).toBe(false)
    expect(published.usageInstructions.includes('联网')).toBe(manual)
  })

  it('follows enabling and removing the actual internet tool even when a system label remains', async () => {
    const wrapper = await settings()
    await createExpert(wrapper)
    await wrapper.findAll('button').find(button => button.text() === 'DWS')!.trigger('click')
    await step(wrapper, '能力扩展')
    await wrapper.findAll('button').find(button => button.text().includes('Brave网络搜索'))!.trigger('click')
    await save(wrapper, true)
    const store = await import('@/utils/expertPrototypeStore')
    const published = store.expertAgents.find(agent => agent.name === '字段边界专家')!
    expect(published.capabilities?.internetEnabled).toBe(true)
    await edit(wrapper, published.id)
    await step(wrapper, '能力扩展')
    await wrapper.findAll('button').find(button => button.text().includes('Brave网络搜索'))!.trigger('click')
    await save(wrapper, true)
    expect(store.getPublishedExpert(published.id)?.capabilities?.internetEnabled).toBe(false)
    expect(store.getPublishedExpert(published.id)?.usageInstructions).not.toContain('联网')
  })

  it.each([true, false, undefined])('keeps the existing capability state when only a system label changes (%j)', async internetEnabled => {
    const store = await import('@/utils/expertPrototypeStore')
    const before = store.getPublishedExpert('biz-01')!
    const candidate = { ...before, capabilities: { ...before.capabilities, connectedSystems: ['知识库'], selectedToolNames: [], internetEnabled } }
    expect(store.saveExpertDraft(candidate)).toBeNull()
    const wrapper = await settings()
    await edit(wrapper, 'biz-01')
    await wrapper.findAll('button').find(button => button.text() === 'DWS')!.trigger('click')
    await save(wrapper, true)
    expect(store.getPublishedExpert('biz-01')?.capabilities?.internetEnabled).toBe(internetEnabled)
  })

  it.each(['0', '-1', '1.5', ''])('rejects an invalid new numeric version with focus and without saving (%j)', async version => {
    const wrapper = await settings()
    await createExpert(wrapper)
    const store = await import('@/utils/expertPrototypeStore')
    const before = localStorage.getItem(store.EXPERT_PROTOTYPE_KEY)
    await wrapper.get('[aria-label="版本"]').setValue(version)
    await save(wrapper, true)
    const field = wrapper.find('[aria-label="版本"]')
    expect(field.exists()).toBe(true)
    expect(field.attributes('aria-invalid')).toBe('true')
    expect(field.classes()).toContain('usage-invalid')
    expect(document.activeElement).toBe(field.element)
    expect((field.element as HTMLInputElement).value).toBe(version)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(localStorage.getItem(store.EXPERT_PROTOTYPE_KEY)).toBe(before)
    expect(store.expertDrafts.value.some(agent => agent.name === '字段边界专家')).toBe(false)
    await field.setValue('2')
    await save(wrapper, true)
    expect(store.expertDrafts.value.find(agent => agent.name === '字段边界专家')?.version).toBe('2')
  })

  it.each(['2.4.1-rc1', ''])('keeps the existing edit version text without applying the new numeric restriction (%j)', async version => {
    const store = await import('@/utils/expertPrototypeStore')
    const candidate = { ...store.getPublishedExpert('biz-01')!, version }
    expect(store.saveExpertDraft(candidate)).toBeNull()
    const wrapper = await settings()
    await edit(wrapper, 'biz-01')
    expect(wrapper.get('[aria-label="版本"]').attributes('type')).toBe('text')
    await save(wrapper, true)
    expect(store.getPublishedExpert('biz-01')?.version).toBe(version)
  })

  it.each(['', '   '])('uses the missing knowledge name fallback without losing its successful update (%j)', async name => {
    const store = await import('@/utils/expertPrototypeStore')
    const agent = { ...store.getPublishedExpert('biz-01')!, capabilities: { knowledgeBases: [{ id: 'known-id', name, lastSuccessfulSyncAt: '2026-10-07T01:00:00Z' }] } }
    const { usageDetailSections } = await import('@/utils/agentUsage')
    const fields = usageDetailSections(agent.usageInstructions, agent).flatMap(section => section.fields)
    expect(fields.find(field => field.label === '引用知识库')?.value).toBe('未提供名称')
    expect(fields.find(field => field.label === '知识更新时间')?.value).toBe('未提供名称：2026-10-07')
    expect(agent.capabilities.knowledgeBases[0]!.name).toBe(name)
    expect(agent.capabilities.knowledgeBases[0]!.lastSuccessfulSyncAt).toBe('2026-10-07T01:00:00Z')
  })
})

describe('expert capability tool selection order', () => {
  it('does not rewrite an unknown capability when only the existing tool selection order changes', async () => {
    const store = await import('@/utils/expertPrototypeStore')
    const before = store.getPublishedExpert('biz-01')!
    const candidate = { ...before, capabilities: { ...before.capabilities, selectedToolNames: ['CSV工具', '计算器'], internetEnabled: undefined } }
    expect(store.saveExpertDraft(candidate)).toBeNull()
    const wrapper = await settings()
    await edit(wrapper, 'biz-01')
    await step(wrapper, '能力扩展')
    const csvTool = wrapper.findAll('button').find(button => button.text().includes('CSV工具'))!
    await csvTool.trigger('click')
    await csvTool.trigger('click')
    await save(wrapper, true)
    expect(store.getPublishedExpert('biz-01')?.capabilities?.selectedToolNames).toEqual(['计算器', 'CSV工具'])
    expect(store.getPublishedExpert('biz-01')?.capabilities?.internetEnabled).toBeUndefined()
  })
})