import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import SourceChatView from '@/views/SourceChatView.vue'
import TaskFilesView from '@/views/TaskFilesView.vue'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/chat', name: 'chat', component: SourceChatView },
      { path: '/chat/:sessionId', name: 'chat-session', component: SourceChatView },
      { path: '/files', name: 'task-files', component: TaskFilesView },
    ],
  })
}

async function mountAt(path: string) {
  const router = makeRouter()
  await router.push(path)
  await router.isReady()
  const wrapper = mount(
    { template: '<router-view />' },
    {
      attachTo: document.body,
      global: { plugins: [router], stubs: { Teleport: true } },
    },
  )
  await flushPromises()
  return { wrapper, router }
}

describe('authenticated source chat flows', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('navigates histories, task files, and new conversation as distinct routes', async () => {
    const { wrapper, router } = await mountAt('/chat')
    expect(wrapper.text()).toContain('天马智擎助手 通用助手 默认智能体 已启用 20')
    expect(wrapper.text()).toContain('任务文件')
    await wrapper
      .get('[data-testid="session-daily-auth"] .source-chat-sidebar__session-main')
      .trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toContain('/chat/')
    expect(wrapper.get('[data-testid="conversation-log"]').attributes('role')).toBe('log')
    await wrapper.get('button[title="新对话"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/chat')
  })

  it('renders the M12 experts from the approved information table in a three-row card', async () => {
    const { wrapper } = await mountAt('/chat')
    const modeSwitcher = wrapper.get('[data-testid="mode-switcher"]')
    expect(modeSwitcher.findAll('button').map((button) => button.text())).toEqual([
      '日常办公',
      '业务专家',
    ])
    await wrapper.get('button[data-mode="expert"]').trigger('click')
    expect(wrapper.findAll('[data-testid="expert-card"]')).toHaveLength(9)

    const firstExpertCard = wrapper.findAll('[data-testid="expert-card"]')[0]
    expect(firstExpertCard.get('[data-testid="expert-name-row"]').text()).toBe('天马智擎助手')
    expect(firstExpertCard.get('[data-testid="expert-name-row"]').find('small').exists()).toBe(
      false,
    )
    expect(firstExpertCard.get('[data-testid="expert-description-row"]').text()).toBe('暂无简介')
    expect(firstExpertCard.get('[data-testid="expert-description-row"]').attributes('title')).toBe(
      '暂无简介',
    )
    const readonlyTags = firstExpertCard.get('[data-testid="readonly-expert-tags"]')
    expect(readonlyTags.attributes('aria-label')).toBe('专家标签')
    expect(readonlyTags.find('input').exists()).toBe(false)
    expect(readonlyTags.find('button').exists()).toBe(false)
    expect(readonlyTags.text()).toContain('钉钉')
    expect(readonlyTags.text()).toContain('商品信息')
    expect(readonlyTags.text()).toContain('日常办公')

    const toolbar = wrapper.get('[data-testid="expert-toolbar"]')
    expect(toolbar.get('[data-testid="expert-department-tabs"]').element).toBeTruthy()
    expect(toolbar.get('input[aria-label="搜索专家"]').element).toBeTruthy()
    expect(
      wrapper
        .get('[data-testid="expert-department-tabs"]')
        .findAll('button')
        .map((tab) => tab.text()),
    ).toEqual(['全部', '通用', '商品', '直播', 'B2B', 'B2C', '门店'])
    await wrapper.get('button[data-department="商品"]').trigger('click')
    expect(wrapper.findAll('[data-testid="expert-card"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="expert-card"]').text()).toContain('现货销售分析师')

    await wrapper.get('button[data-department="全部"]').trigger('click')
    await wrapper.get('input[aria-label="搜索专家"]').setValue('CRM订单')
    expect(wrapper.findAll('[data-testid="expert-card"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="expert-card"]').text()).toContain('销售订单分析师')

    await wrapper.get('input[aria-label="搜索专家"]').setValue('评论分析师')
    await wrapper.findAll('[data-testid="expert-card"]')[0].trigger('click')
    expect(wrapper.get('[data-testid="selected-expert-chip"]').text()).toContain('评论分析师')
  })

  it('shows the M10 DingTalk authorization and write-confirmation flow in the conversation', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const { wrapper } = await mountAt('/chat/dws-action')
    const authCard = wrapper.get('[data-testid="dws-auth-card"]')
    expect(authCard.text()).toContain('需要授权钉钉账号')
    expect(authCard.text()).toContain('日程、待办、消息和文档')

    const authorizeButton = authCard.get('button[aria-label="去授权钉钉账号"]')
    const authorizedButton = authCard.get('button[aria-label="已完成钉钉授权"]')
    expect(authCard.findAll('button')).toHaveLength(2)
    expect(authorizeButton.text()).toContain('去授权')
    expect(authorizedButton.text()).toContain('已授权')
    await authorizeButton.trigger('click')
    expect(openSpy).toHaveBeenCalledOnce()
    expect(wrapper.find('[data-testid="dws-confirm-card"]').exists()).toBe(false)

    await authorizedButton.trigger('click')
    expect(wrapper.get('[data-testid="dws-auth-success"]').text()).toContain(
      '授权成功，正在继续执行',
    )
    const confirmCard = wrapper.get('[data-testid="dws-confirm-card"]')
    expect(confirmCard.text()).toContain('将对钉钉产生实际操作')
    expect(confirmCard.text()).toContain('创建待办')

    await confirmCard.get('button[aria-label="确认执行钉钉操作"]').trigger('click')
    expect(wrapper.get('[data-testid="dws-result-card"]').text()).toContain('待办创建成功')
  })

  it('renders daily and expert session detail actions and task files', async () => {
    const { wrapper } = await mountAt('/chat/daily-auth')
    expect(wrapper.text()).toContain('全部完成')
    expect(wrapper.text()).toContain('回答锚点')
    expect(wrapper.text()).toContain('展开任务文件')
    expect(wrapper.find('button[aria-label="复制回答"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="引用回答"]').exists()).toBe(true)
    await wrapper.get('button[aria-label="分享回答"]').trigger('click')
    expect(wrapper.get('[data-testid="share-bar"]').text()).toContain('发送到钉钉')
  })

  it('expands a task group and opens a working preview drawer', async () => {
    const { wrapper } = await mountAt('/files')
    expect(wrapper.text()).toContain('本页面展示所有任务中系统产生的文件')
    await wrapper.get('[data-testid="task-group-0"]').trigger('click')
    expect(wrapper.text()).toContain('天猫耶运动旗舰店_重点货号_20260819-20260825.html')
    await wrapper.get('[data-testid="task-file-html"]').trigger('click')
    expect(wrapper.get('[data-testid="file-preview-drawer"]').text()).toContain('HTML')
    expect(wrapper.get('[data-testid="file-preview-content"]').text()).toContain('TOP款经营分析')
  })

  it('exposes hover help on icon-only controls', async () => {
    const { wrapper } = await mountAt('/chat')
    expect(wrapper.get('button[aria-label="搜索会话"]').attributes('title')).toBe('搜索会话')
    expect(wrapper.get('button[aria-label="添加参考文件"]').attributes('title')).toBe(
      '添加参考文件',
    )
    expect(wrapper.get('button[aria-label="发送"]').attributes('title')).toBe('请输入内容')
  })

  it('opens session search and all secondary menu states', async () => {
    const { wrapper } = await mountAt('/chat')
    await wrapper.get('button[aria-label="搜索会话"]').trigger('click')
    expect(wrapper.get('[role="dialog"][aria-label="搜索会话"]').text()).toContain('主对话')
    await wrapper.get('button[aria-label="关闭搜索"]').trigger('click')

    const row = wrapper.get('[data-testid="session-daily-auth"]')
    await row.get('button[aria-label="更多操作"]').trigger('click')
    expect(row.get('[role="menu"]').text()).toContain('重命名')
    await row.findAll('[role="menuitem"]')[0].trigger('click')
    expect(wrapper.get('[role="dialog"][aria-label="重命名会话"]').element).toBeTruthy()
    await wrapper.get('button[aria-label="关闭重命名"]').trigger('click')

    await row.get('button[aria-label="更多操作"]').trigger('click')
    await row.findAll('[role="menuitem"]')[2].trigger('click')
    expect(wrapper.get('[role="alertdialog"][aria-label="删除会话"]').text()).toContain('无法恢复')
  })

  it('searches messages with role and conversation-mode filters and highlights contextual matches', async () => {
    const { wrapper, router } = await mountAt('/chat')
    await wrapper.get('button[aria-label="搜索会话"]').trigger('click')
    const dialog = wrapper.get('[role="dialog"][aria-label="搜索会话"]')
    expect(dialog.get('[role="tablist"][aria-label="消息角色筛选"]').element).toBeTruthy()
    expect(dialog.get('select[aria-label="对话模式筛选"]').element).toBeTruthy()
    expect(dialog.find('.source-chip').exists()).toBe(false)
    expect(dialog.findAll('[data-testid="search-result-message"]')).toHaveLength(20)
    expect(dialog.find('button[aria-label="查看3个月前的消息"]').exists()).toBe(false)
    await dialog.get('.results').trigger('scroll')
    expect(dialog.findAll('[data-testid="search-result-message"]')).toHaveLength(24)
    expect(dialog.get('button[aria-label="查看3个月前的消息"]').text()).toContain('3 个月前')
    expect(dialog.text()).toContain('全部')
    await dialog.get('button[role="tab"]:nth-child(3)').trigger('click')
    expect(dialog.text()).toContain('AI 回复')
    await dialog.get('input[aria-label="搜索会话关键词"]').setValue('会议')
    expect(dialog.get('mark').text()).toBe('会议')
    expect(dialog.text()).toContain('…')
    await dialog.get('[data-testid="search-result-message"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.message).toBeTruthy()
  })

  it('opens a create dialog and places the saved quick prompt before system cards', async () => {
    const { wrapper } = await mountAt('/chat')
    const composer = wrapper.get('[data-testid="hero-composer"]').element
    const quickEntry = wrapper.get('[data-testid="quick-prompt-entry"]').element
    const cards = wrapper.get('[data-testid="daily-prompt-grid"]').element
    expect(
      composer.compareDocumentPosition(quickEntry) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      quickEntry.compareDocumentPosition(cards) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    await wrapper.get('button[aria-label="快捷提示语"]').trigger('click')
    const dialog = wrapper.get('[role="dialog"][aria-label="新建快捷提示语"]')
    expect(wrapper.find('[data-testid="quick-prompt-popover"]').exists()).toBe(false)
    expect(wrapper.find('[role="dialog"][aria-label="管理快捷提示语"]').exists()).toBe(false)
    await dialog.get('input[aria-label="提示语名称"]').setValue('晨会速记')
    await dialog.get('textarea[aria-label="提示语内容"]').setValue('整理今天晨会的结论与待办。')
    await dialog.trigger('submit')

    const customCards = wrapper.findAll('[data-testid="user-quick-prompt-card"]')
    expect(customCards).toHaveLength(1)
    expect(customCards[0].text()).toContain('晨会速记')
    expect(
      customCards[0].element.compareDocumentPosition(
        wrapper.findAll('[data-testid="daily-prompt-grid"] > button')[1].element,
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    await customCards[0].trigger('click')
    expect(
      (wrapper.get('textarea[aria-label="向小马提问"]').element as HTMLTextAreaElement).value,
    ).toBe('整理今天晨会的结论与待办。')
    expect(wrapper.find('[data-testid="conversation-log"]').exists()).toBe(false)
  })

  it('shows the newest saved quick prompt first', async () => {
    const { wrapper } = await mountAt('/chat')
    for (const [title, content] of [
      ['第一条', '第一条内容'],
      ['第二条', '第二条内容'],
    ]) {
      await wrapper.get('button[aria-label="快捷提示语"]').trigger('click')
      const dialog = wrapper.get('[role="dialog"][aria-label="新建快捷提示语"]')
      await dialog.get('input[aria-label="提示语名称"]').setValue(title)
      await dialog.get('textarea[aria-label="提示语内容"]').setValue(content)
      await dialog.trigger('submit')
    }
    expect(
      wrapper.findAll('[data-testid="user-quick-prompt-card"]').map((item) => item.text()),
    ).toEqual([expect.stringContaining('第二条'), expect.stringContaining('第一条')])
  })

  it('matches the production home hierarchy and exposes the added product lookup card', async () => {
    const { wrapper } = await mountAt('/chat')
    const welcome = wrapper.get('[data-testid="home-welcome"]')
    const switcher = wrapper.get('[data-testid="mode-switcher"]')
    const composer = wrapper.get('[data-testid="hero-composer"]')
    expect(
      welcome.element.compareDocumentPosition(switcher.element) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      switcher.element.compareDocumentPosition(composer.element) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(wrapper.findAll('[data-testid="daily-prompt-grid"] > button')).toHaveLength(7)
    const productCard = wrapper.get('[data-testid="daily-card-product"]')
    expect(productCard.text()).toContain('查商品')
    expect(productCard.text()).toContain('NEW')
    await productCard.trigger('click')
    expect(
      (wrapper.get('textarea[aria-label="向小马提问"]').element as HTMLTextAreaElement).value,
    ).toContain('商品')
  })

  it('starts an expert conversation after choosing an expert', async () => {
    const { wrapper, router } = await mountAt('/chat')
    await wrapper.get('button[data-mode="expert"]').trigger('click')
    await wrapper.findAll('[data-testid="expert-card"]')[0].trigger('click')
    await wrapper.get('textarea[aria-label="向小马提问"]').setValue('帮我完成专项分析')
    await wrapper.get('button[aria-label="发送"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/chat/expert-plan')
  })

  it('shows expert shortcuts below the composer and prepends expert-owned quick prompts', async () => {
    const { wrapper } = await mountAt('/chat')
    await wrapper.get('button[data-mode="expert"]').trigger('click')
    const dataAnalyst = wrapper
      .findAll('[data-testid="expert-card"]')
      .find((card) => card.text().includes('数据分析师'))!
    await dataAnalyst.trigger('click')

    expect(wrapper.get('[data-testid="selected-expert-chip"]').text()).toContain('数据分析师')
    expect(wrapper.get('[data-testid="quick-prompt-entry"]').text()).toContain('数据分析师专属')
    const shortcutGrid = wrapper.get('[data-testid="expert-shortcut-grid"]')
    expect(shortcutGrid.findAll('button').map((button) => button.text())).toEqual([
      expect.stringContaining('需求池分析'),
      expect.stringContaining('商品池分析'),
      expect.stringContaining('经营数据分析'),
    ])

    await wrapper.get('button[aria-label="快捷提示语"]').trigger('click')
    const dialog = wrapper.get('[role="dialog"][aria-label="新建快捷提示语"]')
    await dialog.get('input[aria-label="提示语名称"]').setValue('周经营复盘')
    await dialog.get('textarea[aria-label="提示语内容"]').setValue('分析本周经营指标和异常原因')
    await dialog.trigger('submit')

    const expertButtons = wrapper.get('[data-testid="expert-shortcut-grid"]').findAll('button')
    expect(expertButtons[0].attributes('data-testid')).toBe('user-quick-prompt-card')
    expect(expertButtons[0].text()).toContain('周经营复盘')
    expect(expertButtons[0].text()).not.toContain('我的')
    await expertButtons[0].trigger('click')
    expect(
      (wrapper.get('textarea[aria-label="向小马提问"]').element as HTMLTextAreaElement).value,
    ).toBe('分析本周经营指标和异常原因')
  })

  it('isolates newly created quick prompts by mode', async () => {
    const { wrapper } = await mountAt('/chat')
    await wrapper.get('button[aria-label="快捷提示语"]').trigger('click')
    const dialog = wrapper.get('[role="dialog"][aria-label="新建快捷提示语"]')
    await dialog.get('input[aria-label="提示语名称"]').setValue('仅日常可见')
    await dialog.get('textarea[aria-label="提示语内容"]').setValue('日常提示语内容')
    await dialog.trigger('submit')
    expect(wrapper.text()).toContain('仅日常可见')
    await wrapper.get('button[data-mode="expert"]').trigger('click')
    expect(wrapper.text()).not.toContain('仅日常可见')
    await wrapper.get('button[data-mode="daily"]').trigger('click')
    expect(wrapper.text()).toContain('仅日常可见')
  })

  it('shows three contextual follow-ups and consumes them after a click', async () => {
    const { wrapper } = await mountAt('/chat/daily-auth')
    const suggestions = wrapper.get('[data-testid="context-suggestions"]')
    expect(suggestions.findAll('button')).toHaveLength(3)
    const selected = suggestions.findAll('button')[0].text()
    await suggestions.findAll('button')[0].trigger('click')
    expect(wrapper.find('[data-testid="context-suggestions"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="sent-follow-up"]').text()).toContain(selected)
  })
})
