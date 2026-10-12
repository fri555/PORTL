from pathlib import Path
p=Path(r"D:\工作\portal\frontend-mvp\src\views\__tests__\SourceChatFlows.spec.ts")
s=p.read_text(encoding="utf-8-sig")
s=s.replace("import TaskFilesView from '@/views/TaskFilesView.vue'", """import TaskFilesView from '@/views/TaskFilesView.vue'
import { FAVORITES_KEY } from '@/composables/useExpertCatalog'
import { homeDraft } from '@/composables/useHomeDraft'
import { agents } from '@/mock/agents'

const wrappers: ReturnType<typeof mount>[] = []
function seedFavorites(ids = ['ag03']) { localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids)) }
async function openCreatePrompt(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('button[aria-label="快捷提示语"]').trigger('click')
  const list = wrapper.get('[role="dialog"][aria-label="快捷提示语列表"]')
  await list.get('button.create-btn').trigger('click')
  return wrapper.get('[role="dialog"][aria-label="新建快捷提示语"]')
}
async function closeQuickPromptList(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('[role="dialog"][aria-label="快捷提示语列表"] button.close-btn').trigger('click')
}""")
s=s.replace("  await flushPromises()\n  return { wrapper, router }", "  wrappers.push(wrapper)\n  await flushPromises()\n  return { wrapper, router }",1)
s=s.replace("""  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })""", """  beforeEach(() => {
    localStorage.clear()
    homeDraft.value = ''
    document.body.innerHTML = ''
    window.history.replaceState({}, '', '/')
  })
  afterEach(() => {
    wrappers.splice(0).forEach(wrapper => wrapper.unmount())
    vi.restoreAllMocks()
    localStorage.clear()
    homeDraft.value = ''
  })""")
def test_replace(name,next_name,replacement):
    global s
    start=s.index("  it('"+name)
    end=s.index("  it('"+next_name,start)
    s=s[:start]+replacement+"\n\n"+s[end:]
test_replace("renders the M12 experts from the approved information table in a three-row card","shows the M10 DingTalk authorization and write-confirmation flow in the conversation", """  it('shows only favorite experts on the home page, filters their departments, and selects a compact card', async () => {
    const { wrapper } = await mountAt('/chat')
    const modeSwitcher = wrapper.get('[data-testid="mode-switcher"]')
    expect(modeSwitcher.findAll('button').map(button => button.text())).toEqual(['日常办公', '业务专家'])
    await wrapper.get('button[data-mode="expert"]').trigger('click')
    expect(wrapper.findAll('[data-testid="expert-card"]')).toHaveLength(0)
    expect(wrapper.text()).toContain('还没有收藏专家')

    seedFavorites(['ag03', 'ag01', 'ag06'])
    window.dispatchEvent(new StorageEvent('storage', { key: FAVORITES_KEY }))
    await flushPromises()
    expect(wrapper.findAll('[data-testid="expert-card"]')).toHaveLength(3)
    const first = agents.find(agent => agent.id === 'ag03')!
    const firstExpertCard = wrapper.get('[data-testid="expert-card"]')
    expect(firstExpertCard.get('[data-testid="expert-name-row"]').text()).toBe(first.name)
    expect(firstExpertCard.get('[data-testid="expert-description-row"]').text()).toBe(first.description)
    expect(firstExpertCard.get('[data-testid="expert-description-row"]').attributes('title')).toBe(first.description)
    const readonlyTags = firstExpertCard.get('[data-testid="readonly-expert-tags"]')
    expect(readonlyTags.attributes('aria-label')).toBe('专家标签')
    expect(readonlyTags.find('input').exists()).toBe(false)
    expect(readonlyTags.find('button').exists()).toBe(false)

    expect(wrapper.get('[data-testid="expert-department-tabs"]').findAll('button').map(tab => tab.text()))
      .toEqual(['全部', '市场营销部', '电商运营部', '财务部'])
    await wrapper.get('button[data-department="财务部"]').trigger('click')
    expect(wrapper.findAll('[data-testid="expert-card"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="expert-card"]').text()).toContain('财务AI分析师')
    await wrapper.get('button[data-department="全部"]').trigger('click')
    await wrapper.get('input[aria-label="搜索专家"]').setValue('全链路')
    expect(wrapper.findAll('[data-testid="expert-card"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="expert-card"]').text()).toContain('鞋类电商运营专家')
    await wrapper.get('input[aria-label="搜索专家"]').setValue('营销内容')
    await wrapper.get('[data-testid="expert-card"]').trigger('click')
    expect(wrapper.get('[data-testid="selected-expert-chip"]').text()).toContain(first.name)
  })""")
test_replace("searches messages with role and conversation-mode filters and highlights contextual matches","opens a create dialog and places the saved quick prompt before system cards", """  it('searches message content with cascading conversation filters, loads older results, and opens the matching message', async () => {
    const { wrapper, router } = await mountAt('/chat')
    await wrapper.get('button[aria-label="搜索会话"]').trigger('click')
    const dialog = wrapper.get('[role="dialog"][aria-label="搜索会话"]')
    expect(dialog.get('.cascade-trigger').text()).toContain('全部会话')
    expect(dialog.findAll('[data-testid="search-result-message"]')).toHaveLength(20)
    expect(dialog.find('button[aria-label="查看3个月前的消息"]').exists()).toBe(false)
    await dialog.get('.results').trigger('scroll')
    expect(dialog.findAll('[data-testid="search-result-message"]')).toHaveLength(24)
    await dialog.get('button[aria-label="查看3个月前的消息"]').trigger('click')
    expect(dialog.findAll('[data-testid="search-result-message"]')).toHaveLength(44)

    await dialog.get('.cascade-trigger').trigger('click')
    await dialog.findAll('.cascade-col button').find(button => button.text() === '业务专家')!.trigger('click')
    expect(dialog.findAll('[data-testid="search-result-message"]')).toHaveLength(12)
    expect(dialog.findAll('[data-testid="search-result-message"]').every(row => !row.text().includes('主对话') && !row.text().includes('工作日志'))).toBe(true)
    await dialog.findAll('.cascade-col button').find(button => button.text() === '组货专家')!.trigger('click')
    expect(dialog.text()).toContain('没有找到符合筛选条件的消息')
    await dialog.get('.cascade-trigger').trigger('click')
    await dialog.findAll('.cascade-col button').find(button => button.text() === '全部')!.trigger('click')

    await dialog.get('input[aria-label="搜索会话关键词"]').setValue('预约下周二')
    expect(dialog.findAll('[data-testid="search-result-message"]')).toHaveLength(6)
    expect(dialog.get('[data-testid="search-result-message"]').text()).toContain('工作日志')
    await dialog.get('[data-testid="search-result-message"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.params.sessionId).toBe('daily-auth')
    expect(router.currentRoute.value.query.message).toBeTruthy()
    expect(wrapper.find('[role="dialog"][aria-label="搜索会话"]').exists()).toBe(false)
  })""")
s=s.replace("""    await wrapper.get('button[aria-label="快捷提示语"]').trigger('click')
    const dialog = wrapper.get('[role="dialog"][aria-label="新建快捷提示语"]')""", """    const dialog = await openCreatePrompt(wrapper)""")
s=s.replace("""      await wrapper.get('button[aria-label="快捷提示语"]').trigger('click')
      const dialog = wrapper.get('[role="dialog"][aria-label="新建快捷提示语"]')""", """      const dialog = await openCreatePrompt(wrapper)""")
s=s.replace("    await dialog.trigger('submit')", "    await dialog.trigger('submit')\n    await closeQuickPromptList(wrapper)")
# One loop's deeper indentation keeps the same await behavior.
s=s.replace("""  it('starts an expert conversation after choosing an expert', async () => {
    const { wrapper, router }""", """  it('starts a separate expert conversation after choosing a favorite expert', async () => {
    seedFavorites()
    const { wrapper, router }""")
s=s.replace("    expect(router.currentRoute.value.path).toBe('/chat/expert-plan')", """    expect(router.currentRoute.value.path).toMatch(/^\\/chat\\/expert-plan-/)
    expect(wrapper.get('.answer-agent strong').text()).toBe('营销内容创作助手')""")
test_replace("shows expert shortcuts below the composer and prepends expert-owned quick prompts","isolates newly created quick prompts by mode", """  it('shows the selected favorite expert shortcuts and prepends its own quick prompts', async () => {
    seedFavorites()
    const { wrapper } = await mountAt('/chat')
    await wrapper.get('button[data-mode="expert"]').trigger('click')
    await wrapper.get('[data-testid="expert-card"]').trigger('click')
    const chosen = agents.find(agent => agent.id === 'ag03')!
    expect(wrapper.get('[data-testid="selected-expert-chip"]').text()).toContain(chosen.name)
    expect(wrapper.get('[data-testid="quick-prompt-entry"]').text()).toContain(chosen.name + '专属')
    expect(wrapper.get('[data-testid="expert-shortcut-grid"]').findAll('button').map(button => button.text())).toEqual(chosen.quickCommands)

    const dialog = await openCreatePrompt(wrapper)
    await dialog.get('input[aria-label="提示语名称"]').setValue('周经营复盘')
    await dialog.get('textarea[aria-label="提示语内容"]').setValue('分析本周经营指标和异常原因')
    await dialog.trigger('submit')
    await closeQuickPromptList(wrapper)

    const expertButtons = wrapper.get('[data-testid="expert-shortcut-grid"]').findAll('button')
    expect(expertButtons[0].attributes('data-testid')).toBe('user-quick-prompt-card')
    expect(expertButtons[0].text()).toContain('周经营复盘')
    await expertButtons[0].trigger('click')
    expect((wrapper.get('textarea[aria-label="向小马提问"]').element as HTMLTextAreaElement).value).toBe('分析本周经营指标和异常原因')
  })""")
p.write_text(s,encoding="utf-8")

