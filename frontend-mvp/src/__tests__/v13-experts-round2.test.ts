import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { agents } from '@/mock/agents'
import { expertSystemTags } from '@/utils/expertPresentation'
import { usageContentFromForm, usageDetailSections, usageFormFromContent, usageSections, validateUsageForm } from '@/utils/agentUsage'
import { useExpertMention } from '@/composables/useExpertMention'
import { getPublishedExpert, publishExpertDraft, saveExpertDraft } from '@/utils/expertPrototypeStore'
const dataAnalyst = agents.find(agent => agent.id === 'biz-01')!
const marketingDesigner = agents.find(agent => agent.id === 'biz-04')!
const base = () => ({ ...dataAnalyst, knowledgeBaseIds: [], toolIds: [] })
afterEach(() => { vi.restoreAllMocks() })
describe('expert field and mention review', () => {
  it('preserves paragraphs when a saved usage form is reopened', () => {
    const form = { systems: ['商品中心'], input: '提供货号\n提供时间范围', output: '分析表格\n结论摘要', limits: '1. 不支持链接查询\n2. 不支持未授权业务' }
    expect(usageFormFromContent(usageContentFromForm(form))).toEqual(form)
  })
  it('preserves unstructured legacy text including colons', () => {
    const legacy = '操作提示：请先选择业务范围\n注意：数据非实时。'
    expect(usageFormFromContent(legacy).limits).toBe(legacy)
    expect(usageSections(legacy)).toEqual([{ title: '使用说明', body: legacy }])
    expect(usageDetailSections(legacy).flatMap(section => section.fields).some(field => field.value.includes(legacy))).toBe(true)
  })
  it('validates optional text and draft lengths without silently truncating tags', () => {
    const valid = { systems: ['商品中心'], input: '', output: '', limits: '不支持未授权查询' }
    expect(validateUsageForm({ ...valid, input: '字'.repeat(501) }, false)).toContain('输入要求')
    expect(validateUsageForm({ ...valid, output: '字'.repeat(501) })).toContain('输出形式')
    expect(validateUsageForm({ ...valid, limits: '字'.repeat(501) })).toContain('使用限制')
    expect(validateUsageForm({ ...valid, systems: Array.from({ length: 30 }, (_, i) => `标签${i}`) })).toBeNull()
    expect(validateUsageForm({ ...valid, systems: [] }, false)).toBeNull()
  })
  it('does not invent capability metadata from generic tools or creation time', () => {
    const agent = { ...base(), toolIds: ['calculator'], knowledgeBaseIds: ['kb01'], capabilities: undefined, firstPublishedAt: undefined, publishedAt: undefined, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z' }
    const fields = usageDetailSections(agent.usageInstructions, agent).flatMap(section => section.fields)
    const value = (label: string) => fields.find(field => field.label === label)?.value
    expect(value('是否支持联网')).toBe('未提供')
    expect(value('上线时间')).toBe('未提供')
    expect(value('支持文件格式')).toBe('未提供')
    expect(value('引用知识库')).toContain('商品知识库')
    expect(value('引用知识库')).not.toContain('kb01')
    expect(value('知识更新时间')).not.toBe(agent.updatedAt.slice(0, 10))
  })
  it('uses explicit capabilities and publication timestamps in the detail drawer', () => {
    const agent = { ...base(), firstPublishedAt: '2026-09-01T00:00:00Z', publishedAt: '2026-10-09T00:00:00Z', capabilities: { internetEnabled: false, supportedFileFormats: ['pdf', '.docx', 'exe'], knowledgeBases: [{ id: 'test', name: '运营制度', lastSuccessfulSyncAt: '2026-10-07T01:00:00Z' }] } }
    const fields = usageDetailSections(agent.usageInstructions, agent).flatMap(section => section.fields)
    const value = (label: string) => fields.find(field => field.label === label)?.value
    expect(value('是否支持联网')).toBe('不支持')
    expect(value('上线时间')).toBe('2026-09-01')
    expect(value('更新时间')).toBe('2026-10-09')
    expect(value('支持文件格式')).toBe('PDF、DOCX')
    expect(value('引用知识库')).toBe('运营制度')
    expect(value('知识更新时间')).toContain('2026-10-07')
  })
  it('retains first publication time and updates only the successful release time', () => {
    const original = getPublishedExpert('biz-01')!
    const candidate = { ...original, id: 'round2-publication', firstPublishedAt: undefined, publishedAt: undefined }
    expect(saveExpertDraft(candidate)).toBeNull()
    expect(getPublishedExpert(candidate.id)).toBeNull()
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-09T01:00:00Z'))
    expect(publishExpertDraft(candidate)).toBeNull()
    const first = getPublishedExpert(candidate.id)!
    expect(first.firstPublishedAt).toBe('2026-10-09T01:00:00.000Z')
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-10T01:00:00Z'))
    expect(publishExpertDraft(first)).toBeNull()
    const next = getPublishedExpert(candidate.id)!
    expect(next.firstPublishedAt).toBe(first.firstPublishedAt)
    expect(next.publishedAt).toBe('2026-10-10T01:00:00.000Z')
  })
  it('never removes changed draft text using a stale mention range', async () => {
    let mention!: ReturnType<typeof useExpertMention>
    const text = ref('@营销')
    const select = vi.fn()
    const wrapper = mount(defineComponent({ setup() {
      const input = ref<HTMLTextAreaElement | null>(null)
      mention = useExpertMention(text, input, ref([marketingDesigner]), select)
      return { text, input }
    }, template: '<textarea ref="input" v-model="text" />' }))
    await flushPromises(); mention.update()
    expect(mention.open.value).toBe(true)
    text.value = '新的正文'; await flushPromises(); mention.choose(marketingDesigner)
    expect(text.value).toBe('新的正文'); expect(select).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
import AgentSettings from '@/components/settings/AgentSettingsView.vue'
const tagStub = { props: ['modelValue'], emits: ['update:modelValue', 'change'], template: `<input data-testid="manual-systems" :value="(modelValue || []).join(',')" @input="$emit('update:modelValue', $event.target.value.split(',')); $emit('change', $event.target.value.split(','))"/>` }
async function openSettings() {
  const w = mount(AgentSettings, { global: { stubs: { ElInputTag: tagStub, ElSelect: { template: '<select><slot/></select>' }, ElOption: { template: '<option><slot/></option>' } } } })
  await w.findAll('button').find(button => button.text() === '创建智能体')!.trigger('click')
  await w.get('input[placeholder="请输入智能体名称"]').setValue('回归专家')
  await w.get('textarea[placeholder="简短描述它的功能..."]').setValue('验证能力配置的发布与回显')
  return w
}
async function step(w: ReturnType<typeof mount>, label: string) { await w.findAll('[role="tab"]').find(button => button.text().includes(label))!.trigger('click'); await flushPromises() }
describe('expert settings publication closure', () => {
  it('keeps automatic systems out of the manual usage form', async () => {
    const w = await openSettings(); await step(w, '使用说明')
    expect(w.find('[data-testid="automatic-systems"]').exists()).toBe(false)
    await w.get('[data-testid="usage-field-systems"]').setValue('商品中心')
    await w.get('[data-testid="usage-field-systems"]').setValue('')
    expect((w.get('[data-testid="usage-field-systems"]').element as HTMLInputElement).value).toBe('')
    w.unmount()
  })
  it('publishes capability selections and restores them on edit', async () => {
    const w = await openSettings(); await step(w, '能力扩展')
    await w.findAll('button').find(button => button.text().includes('Brave网络搜索'))!.trigger('click')
    await w.findAll('button').find(button => button.text().includes('AM-014-天马集团车辆管理制度'))!.trigger('click')
    await step(w, '使用说明')
    await w.get('[data-testid="usage-field-limits"]').setValue('不支持未授权查询')
    await w.findAll('button').find(button => button.text() === '保存')!.trigger('click'); await flushPromises()
    const rows = w.findAll('[data-testid^="settings-agent-row-"]')
    const row = rows.find(row => row.text().includes('回归专家'))!
    const id = row.attributes('data-testid')!.replace('settings-agent-row-', '')
    const published = getPublishedExpert(id)!
    expect(published.capabilities?.internetEnabled).toBe(true)
    expect(published.capabilities?.selectedDocumentNames).toContain('AM-014-天马集团车辆管理制度20260324.docx')
    expect(published.capabilities?.connectedSystems).toEqual([])
    expect(expertSystemTags(published)).toContain('知识库')
    await row.get('[aria-label="更多操作"]').trigger('click')
    await w.findAll('button').find(button => button.text() === '编辑')!.trigger('click')
    await step(w, '能力扩展')
    const tool = w.findAll('button').find(button => button.text().includes('Brave网络搜索'))!
    expect((tool.get('input').element as HTMLInputElement).checked).toBe(true)
    w.unmount()
  })
})
import MentionMenu from '@/components/chat/source-clone/ExpertMentionMenu.vue'
describe('mention menu viewport placement', () => {
  const props = { experts: agents.slice(0, 5), favoriteIds: new Set<string>(), activeIndex: 0, id: 'placement-menu', page: 1, pageCount: 2 }
  it('stays above and shrinks the scrollable list when there is more room below', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 330, bottom: 500, height: 170, left: 0, right: 600, width: 600, x: 0, y: 330, toJSON() {} })
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(1000)
    const w = mount(MentionMenu, { props, attachTo: document.body })
    await flushPromises()
    expect(w.classes()).not.toContain('mention-panel--below')
    expect(Number.parseFloat(w.get('.mention-list').attributes('style')!.match(/max-height: ([\d.]+)px/)![1]!)).toBeLessThan(218)
    w.unmount()
  })
  it('keeps a bottom composer menu above the input without crossing the top safe area', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 650, bottom: 820, height: 170, left: 0, right: 600, width: 600, x: 0, y: 650, toJSON() {} })
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(900)
    const w = mount(MentionMenu, { props, attachTo: document.body })
    await flushPromises()
    expect(w.classes()).not.toContain('mention-panel--below')
    expect(w.attributes('style')).toContain('max-height: 562px')
    w.unmount()
  })
})
describe('expert version and local date preservation', () => {
  it('keeps the current semantic version when publishing only usage changes', async () => {
    const versionFixture = { ...base(), id: 'round2-version-preservation', name: '版本保留测试专家', version: '2.4.1' }
    expect(publishExpertDraft(versionFixture)).toBeNull()
    const before = getPublishedExpert(versionFixture.id)!
    const w = mount(AgentSettings, { global: { stubs: { ElInputTag: tagStub, ElSelect: { template: '<select><slot/></select>' }, ElOption: { template: '<option><slot/></option>' } } } })
    await w.get('[data-testid="settings-agent-row-round2-version-preservation"] [aria-label="更多操作"]').trigger('click')
    await w.findAll('button').find(button => button.text() === '编辑')!.trigger('click')
    expect((w.get('[aria-label="版本"]').element as HTMLInputElement).value).toBe(before.version)
    await step(w, '使用说明')
    await w.get('[data-testid="usage-field-limits"]').setValue('仅修改说明，不变更版本')
    await w.findAll('button').find(button => button.text() === '保存')!.trigger('click'); await flushPromises()
    expect(getPublishedExpert(versionFixture.id)!.version).toBe(before.version)
    w.unmount()
  })
  it('renders a UTC evening publication timestamp as the next Beijing date', () => {
    const agent = { ...base(), firstPublishedAt: '2026-10-08T23:00:00Z', publishedAt: '2026-10-08T23:21:00Z' }
    const fields = usageDetailSections(agent.usageInstructions, agent).flatMap(section => section.fields)
    expect(fields.find(field => field.label === '上线时间')?.value).toBe('2026-10-09')
    expect(fields.find(field => field.label === '更新时间')?.value).toBe('2026-10-09')
  })
})


