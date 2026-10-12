import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ExpertSystemTags from '@/components/expert/ExpertSystemTags.vue'
import AgentSquare from '@/views/AgentSquareView.vue'
import { expertAgents } from '@/utils/expertPrototypeStore'
import { homeDraft } from '@/composables/useHomeDraft'
import { usageContentFromForm } from '@/utils/agentUsage'

const originals = JSON.parse(JSON.stringify(expertAgents))
const wrappers: ReturnType<typeof mount>[] = []
beforeEach(() => { localStorage.clear(); expertAgents.splice(0, expertAgents.length, ...JSON.parse(JSON.stringify(originals))); homeDraft.value = '' })
afterEach(() => { vi.restoreAllMocks(); wrappers.splice(0).forEach(wrapper => wrapper.unmount()); expertAgents.splice(0, expertAgents.length, ...JSON.parse(JSON.stringify(originals))) })
async function centre() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: AgentSquare }, { path: '/chat', component: { template: '<div>chat</div>' } }] })
  await router.push('/'); await router.isReady()
  const wrapper = mount(AgentSquare, { global: { plugins: [router], stubs: { ElDialog: { props: ['modelValue'], template: '<section v-if="modelValue"><slot /></section>' } } } })
  wrappers.push(wrapper); await flushPromises(); return { wrapper, router }
}
describe('expert presentation and navigation', () => {
  it('searches only the name and introduction', async () => {
    const expert = expertAgents[0]!
    expert.developerDepartment = '专属部门关键词'; expert.quickCommands = ['独有快捷问法关键词']
    const { wrapper } = await centre()
    await wrapper.get('[aria-label="搜索专家"]').setValue('专属部门关键词')
    expect(wrapper.findAll('.agent-card')).toHaveLength(0)
    await wrapper.get('[aria-label="搜索专家"]').setValue('独有快捷问法关键词')
    expect(wrapper.findAll('.agent-card')).toHaveLength(0)
    await wrapper.get('[aria-label="搜索专家"]').setValue(expert.name)
    expect(wrapper.findAll('.agent-card')).toHaveLength(1)
  })
  it('moves introduction and applicable departments into basic information and removes the version', async () => {
    Object.assign(expertAgents[0]!, { description: '完整能力简介', useDepartments: ['商品部', '门店部'], developerDepartment: '研发部', version: '999.9' })
    const { wrapper } = await centre(); await wrapper.get('.agent-card').trigger('click')
    expect(wrapper.get('[data-testid="expert-basic-info"]').text()).toContain('完整能力简介')
    expect(wrapper.get('[data-testid="expert-use-departments"]').findAll('.department-tag').map(tag => tag.text())).toEqual(['商品部', '门店部'])
    expect(wrapper.get('.modal-hero').text()).not.toContain('完整能力简介')
    expect(wrapper.get('.expert-modal').text()).not.toContain('999.9')
  })
  it('keeps manual system labels before inferred capability labels and reveals all labels from +N', async () => {
    expertAgents[0]!.usageInstructions = usageContentFromForm({ systems: ['商品中心', '门店系统', '客户系统', '库存系统'], input: '', output: '', limits: '' })
    expertAgents[0]!.capabilities = { connectedSystems: ['DWS', '商品中心'], selectedDocumentNames: ['制度.docx'], internetEnabled: true }
    const { wrapper } = await centre()
    const tags = wrapper.get('.agent-card [data-testid="expert-system-tags"]')
    expect(tags.findAll('.system-tag').map(tag => tag.text())).toEqual(['商品中心', '门店系统', '客户系统'])
    expect(tags.get('.system-overflow').text()).toBe('+4')
    await tags.get('.system-overflow').trigger('click')
    expect(wrapper.find('.expert-modal').exists()).toBe(false)
    expect(tags.get('.system-tag-popover').text()).toContain('库存系统')
    expect(tags.get('.system-tag-popover').text()).toContain('知识库')
    expect(tags.get('.system-tag-popover').text()).toContain('联网')
  })
  it.each([false, undefined])('does not claim knowledge or internet from platform system labels when actual capabilities are absent (%j)', async internetEnabled => {
    expertAgents[0]!.knowledgeBaseIds = []
    expertAgents[0]!.usageInstructions = usageContentFromForm({ systems: ['商品中心'], input: '', output: '', limits: '' })
    expertAgents[0]!.capabilities = { connectedSystems: ['知识库', '联网查询', '联网', '商品中心'], internetEnabled, selectedDocumentNames: [] }
    const { wrapper } = await centre()
    expect(wrapper.get('.agent-card [data-testid="expert-system-tags"]').findAll('.system-tag').map(tag => tag.text())).toEqual(['商品中心'])
  })
  it('keeps empty boundaries and nonempty quick starts while hiding technical capability lists', async () => {
    expertAgents[0]!.usageInstructions = usageContentFromForm({ systems: [], input: '', output: '', limits: '' })
    expertAgents[0]!.quickCommands = [' ', '', '真实快捷问题']
    expertAgents[0]!.capabilities = { connectors: [{ id: 'c1', name: '' }], skills: [{ id: 's1', name: '  ' }] }
    const { wrapper } = await centre(); await wrapper.get('.agent-card').trigger('click')
    expect(wrapper.get('[data-testid="expert-boundary"]').text()).toContain('暂未配置')
    expect(wrapper.findAll('.prompt-list button')).toHaveLength(1)
    expect(wrapper.get('.prompt-list button').text()).toBe('真实快捷问题')
    expect(wrapper.find('[data-testid="expert-capability-connectors"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="expert-capability-skills"]').exists()).toBe(false)
  })
  it('shows actual documents with local expansion instead of granting an entire library', async () => {
    expertAgents[0]!.capabilities = { selectedDocumentNames: ['文档1.docx', '文档2.pdf', '文档3.md', '文档4.txt', '文档5.csv'], knowledgeBases: [{ id: 'library', name: '整个知识库' }] }
    const { wrapper } = await centre(); await wrapper.get('.agent-card').trigger('click')
    expect(wrapper.findAll('[data-testid="knowledge-entry"]')).toHaveLength(3)
    expect(wrapper.get('[data-testid="expert-knowledge-content"]').text()).not.toContain('整个知识库')
    await wrapper.get('[data-testid="knowledge-expand"]').trigger('click')
    expect(wrapper.findAll('[data-testid="knowledge-entry"]')).toHaveLength(5)
    expect(wrapper.get('[data-testid="expert-knowledge-content"]').classes()).toContain('expanded')
  })
  it('retains a library-level legacy binding with an explicit level marker and no invented document', async () => {
    expertAgents[0]!.knowledgeBaseIds = []
    expertAgents[0]!.capabilities = { knowledgeBases: [{ id: 'library', name: '历史商品库' }] }
    const { wrapper } = await centre(); await wrapper.get('.agent-card').trigger('click')
    const entry = wrapper.get('[data-testid="knowledge-entry"]')
    expect(entry.text()).toContain('历史商品库'); expect(entry.text()).toContain('知识库')
    expect(entry.attributes('data-kind')).toBe('library')
  })
  it('shows named format icons without exposing connector and skill metadata', async () => {
    expertAgents[0]!.capabilities = { supportedFileFormats: ['pdf', '.docx', 'exe'], connectors: [{ id: 'c1', name: '商品查询', protocol: 'STREAMABLE-HTTP' }], skills: [{ id: 's1', name: '标题生成', identifier: 'AI-TITLE', description: '商品标题生成能力' }] }
    const { wrapper } = await centre(); await wrapper.get('.agent-card').trigger('click')
    expect(wrapper.get('[data-testid="expert-file-formats"]').text()).toBe('PDFDOCX')
    expect(wrapper.find('[data-testid="expert-capability-connectors"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="expert-capability-skills"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="expert-capability-tools"]').exists()).toBe(false)
  })
  it('navigates without a prompt for use, and replaces the unsent draft for quick start without confirmation or sending', async () => {
    homeDraft.value = '已有未发送正文'
    const { wrapper, router } = await centre(); await wrapper.get('.agent-card').trigger('click')
    await wrapper.get('.modal-footer .primary').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({ mode: 'expert', agent: 'biz-01' })
    expect(router.currentRoute.value.query.prompt).toBeUndefined()
    await router.push('/'); await wrapper.get('.agent-card').trigger('click')
    await wrapper.get('.prompt-list button').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.query.prompt).toBe(expertAgents[0]!.quickCommands[0])
    expect(router.currentRoute.value.query).not.toHaveProperty('autosend')
    expect(homeDraft.value).toBe(expertAgents[0]!.quickCommands[0])
  })
})

describe('responsive system tag list', () => {
  it('leaves an empty card tag row blank while marking an unconfigured detail', async () => {
    const card = mount(ExpertSystemTags, { props: { tags: [] } }); wrappers.push(card)
    expect(card.text()).toBe('')
    const detail = mount(ExpertSystemTags, { props: { tags: [], detail: true } }); wrappers.push(detail)
    expect(detail.text()).toBe('暂未配置')
  })

  it('folds by actual row width and restores tags on a wider viewport', async () => {
    let width = 150
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const itemWidth = this.classList.contains('measure-overflow') ? 24 : 80
      return { width: itemWidth, height: 24, top: 0, bottom: 24, left: 0, right: itemWidth, x: 0, y: 0, toJSON() {} }
    })
    const wrapper = mount(ExpertSystemTags, { props: { tags: ['商品系统', '仓储系统', '门店系统'] } })
    wrappers.push(wrapper); await flushPromises()
    expect(wrapper.findAll('.system-tag').map(tag => tag.text())).toEqual(['商品系统'])
    expect(wrapper.get('.system-overflow').text()).toBe('+2')
    await wrapper.get('.system-overflow').trigger('click')
    expect(wrapper.get('.system-tag-popover').text()).toContain('门店系统')
    width = 300; window.dispatchEvent(new Event('resize')); await flushPromises()
    expect(wrapper.findAll('.system-tag')).toHaveLength(3)
    expect(wrapper.find('.system-overflow').exists()).toBe(false)
  })
})
