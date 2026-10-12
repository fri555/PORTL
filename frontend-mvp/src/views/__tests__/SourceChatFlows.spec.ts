import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import SourceChatView from '@/views/SourceChatView.vue'
import TaskFilesView from '@/views/TaskFilesView.vue'
import { homeDraft } from '@/composables/useHomeDraft'
import { agents } from '@/mock/agents'

const wrappers: ReturnType<typeof mount>[] = []
async function openCreatePrompt(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('button[aria-label="快捷提示语"]').trigger('click')
  const list = wrapper.get('[role="dialog"][aria-label="快捷提示语列表"]')
  await list.get('button.create-btn').trigger('click')
  return wrapper.get('[role="dialog"][aria-label="新建快捷提示语"]')
}
async function closeQuickPromptList(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('[role="dialog"][aria-label="快捷提示语列表"] button.close-btn').trigger('click')
}

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
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

describe('authenticated source chat flows', () => {
  beforeEach(() => {
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

  it('opens the existing conversation search when forwarded from expert center', async () => {
    const { wrapper } = await mountAt('/chat?sidebar=1&action=search')
    expect(wrapper.find('[role="dialog"][aria-label="搜索会话"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="source-chat-sidebar"]').isVisible()).toBe(true)
  })

  it('forwards rename and deletion to confirmations without deleting the session', async () => {
    const { wrapper, router } = await mountAt('/chat/daily-auth?sidebar=1&action=rename&target=daily-auth')
    expect(wrapper.find('[role="dialog"][aria-label="重命名会话"]').exists()).toBe(true)
    await router.push('/chat/daily-auth?sidebar=1&action=delete&target=daily-auth')
    await flushPromises()
    expect(wrapper.find('[role="alertdialog"][aria-label="删除会话"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-daily-auth"]').exists()).toBe(true)
    const confirmation = wrapper.get('[role="alertdialog"][aria-label="删除会话"]')
    await confirmation.findAll('button').find(button => button.text() === '取消')!.trigger('click')
    expect(wrapper.find('[data-testid="session-daily-auth"]').exists()).toBe(true)
    expect(router.currentRoute.value.path).toBe('/chat/daily-auth')
  })

  // 收藏功能已移除，相关测试延至v2
//   it('shows only favorite experts on the home page, filters their business groups, and selects a compact card', async () => {
//     const { wrapper } = await mountAt('/chat')
//     const modeSwitcher = wrapper.get('[data-testid="mode-switcher"]')
//     expect(modeSwitcher.findAll('button').map(button => button.text())).toEqual(['日常办公', '业务专家'])
//     await wrapper.get('button[data-mode="expert"]').trigger('click')
//     expect(wrapper.findAll('[data-testid="expert-card"]')).toHaveLength(0)
//     expect(wrapper.text()).toContain('还没有收藏专家')
//
//     seedFavorites(['biz-04', 'biz-01', 'biz-09'])
//     window.dispatchEvent(new StorageEvent('storage', { key: favoriteStorage }))
//     await flushPromises()
//     expect(wrapper.findAll('[data-testid="expert-card"]')).toHaveLength(3)
//     const first = agents.find(agent => agent.id === 'biz-04')!
//     const firstExpertCard = wrapper.get('[data-testid="expert-card"]')
//     expect(firstExpertCard.get('[data-testid="expert-name-row"]').text()).toBe(first.name)
//     expect(firstExpertCard.get('[data-testid="expert-description-row"]').text()).toBe(first.description)
//     expect(firstExpertCard.get('[data-testid="expert-description-row"]').attributes('title')).toBe(first.description)
//     expect(firstExpertCard.find('[data-testid="readonly-expert-tags"]').exists()).toBe(false)
//     expect(firstExpertCard.find('.source-chat-home__expert-arrow').exists()).toBe(true)
//     expect(firstExpertCard.get('.source-chat-home__unfavorite').attributes('aria-label')).toBe('取消收藏' + first.name)
//
//     expect(wrapper.get('[data-testid="expert-department-tabs"]').findAll('button').map(tab => tab.text()))
//       .toEqual(['收藏', '通用', '直播', '门店'])
//     await wrapper.get('button[data-department="通用"]').trigger('click')
//     expect(wrapper.findAll('[data-testid="expert-card"]')).toHaveLength(1)
//     expect(wrapper.get('[data-testid="expert-card"]').text()).toContain('数据分析师')
//     await wrapper.get('button[data-department="收藏"]').trigger('click')
//     await wrapper.get('input[aria-label="搜索专家"]').setValue('视频脚本')
//     expect(wrapper.findAll('[data-testid="expert-card"]')).toHaveLength(1)
//     expect(wrapper.get('[data-testid="expert-card"]').text()).toContain('视频脚本大师')
//     await wrapper.get('input[aria-label="搜索专家"]').setValue('营销图文')
//     await wrapper.get('[data-testid="expert-card"]').trigger('click')
//     expect(wrapper.get('[data-testid="selected-expert-chip"]').text()).toContain(first.name)
//   })

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
      '账号授权成功，操作仍需你确认',
    )
    const confirmCard = wrapper.get('[data-testid="dws-confirm-card"]')
    expect(confirmCard.text()).toContain('确认后才会创建待办')
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

  it('searches message content with cascading conversation filters, loads older results, and opens the matching message', async () => {
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
    expect(dialog.findAll('.cascade-col')[1]!.findAll('button').map(button => button.text())).toEqual([
      '数据分析师', '组货专家', '评论分析师', '营销图文设计师', '销售订单分析师', '现货销售分析师',
      '全网比价助手', 'TOP款分析师', '视频脚本大师', '企微沟通分析师', '跟进记录分析师', '商品问数/分货专家',
      '商品信息查询助手', '运动健康专家', '门店经营分析师', '综合画像分析师', 'AI标题大师', '链接分析师',
    ])
    await dialog.findAll('.cascade-col button').find(button => button.text() === '数据分析师')!.trigger('click')
    expect(dialog.findAll('[data-testid="search-result-message"]')).toHaveLength(12)
    await dialog.get('.cascade-trigger').trigger('click')
    await dialog.findAll('.cascade-col button').find(button => button.text() === '组货专家')!.trigger('click')
    expect(dialog.text()).toContain('没有找到符合筛选条件的消息')
    await dialog.get('.cascade-trigger').trigger('click')
    await dialog.findAll('.cascade-col button').find(button => button.text() === '全部')!.trigger('click')

    await dialog.get('input[aria-label="搜索会话关键词"]').setValue('预约下周二')
    expect(dialog.findAll('[data-testid="search-result-message"]')).toHaveLength(6)
    expect(dialog.get('[data-testid="search-result-message"]').text()).toContain('工作日志')
    const matchedExcerpt = dialog.get('[data-testid="search-result-message"] .result-excerpt')
    expect(matchedExcerpt.text()).toContain('预约下周二专项培训会议')
    expect(matchedExcerpt.get('mark').text()).toBe('预约下周二')
    await dialog.get('[data-testid="search-result-message"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.params.sessionId).toBe('daily-auth')
    expect(router.currentRoute.value.query.message).toBeTruthy()
    expect(wrapper.find('[role="dialog"][aria-label="搜索会话"]').exists()).toBe(false)
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
    const dialog = await openCreatePrompt(wrapper)
    expect(wrapper.find('[data-testid="quick-prompt-popover"]').exists()).toBe(false)
    expect(wrapper.find('[role="dialog"][aria-label="管理快捷提示语"]').exists()).toBe(false)
    await dialog.get('input[aria-label="提示语名称"]').setValue('晨会速记')
    await dialog.get('textarea[aria-label="提示语内容"]').setValue('整理今天晨会的结论与待办。')
    await dialog.trigger('submit')
    await closeQuickPromptList(wrapper)

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
      const dialog = await openCreatePrompt(wrapper)
      await dialog.get('input[aria-label="提示语名称"]').setValue(title)
      await dialog.get('textarea[aria-label="提示语内容"]').setValue(content)
      await dialog.trigger('submit')
    await closeQuickPromptList(wrapper)
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

  // 收藏功能已移除，相关测试延至v2
//   it('starts a separate expert conversation after choosing a favorite expert', async () => {
//     seedFavorites()
//     const { wrapper, router } = await mountAt('/chat')
//     await wrapper.get('button[data-mode="expert"]').trigger('click')
//     await wrapper.findAll('[data-testid="expert-card"]')[0].trigger('click')
//     await wrapper.get('textarea[aria-label="向小马提问"]').setValue('帮我完成专项分析')
//     await wrapper.get('button[aria-label="发送"]').trigger('click')
//     await flushPromises()
//
//     expect(router.currentRoute.value.path).toMatch(/^\/chat\/expert-plan-/)
//     expect(wrapper.get('.answer-agent strong').text()).toBe('营销图文设计师')
//   })

//   it('shows the selected favorite expert shortcuts and prepends its own quick prompts', async () => {
//     seedFavorites()
//     const { wrapper } = await mountAt('/chat')
//     await wrapper.get('button[data-mode="expert"]').trigger('click')
//     await wrapper.get('[data-testid="expert-card"]').trigger('click')
//     const chosen = agents.find(agent => agent.id === 'biz-04')!
//     expect(wrapper.get('[data-testid="selected-expert-chip"]').text()).toContain(chosen.name)
//     expect(wrapper.get('[data-testid="quick-prompt-entry"]').text()).toContain(chosen.name + '专属')
//     expect(wrapper.get('[data-testid="expert-shortcut-grid"]').findAll('button').map(button => button.text())).toEqual(chosen.quickCommands)
//
//     const dialog = await openCreatePrompt(wrapper)
//     await dialog.get('input[aria-label="提示语名称"]').setValue('周经营复盘')
//     await dialog.get('textarea[aria-label="提示语内容"]').setValue('分析本周经营指标和异常原因')
//     await dialog.trigger('submit')
//     await closeQuickPromptList(wrapper)
//
//     const expertButtons = wrapper.get('[data-testid="expert-shortcut-grid"]').findAll('button')
//     expect(expertButtons[0].attributes('data-testid')).toBe('user-quick-prompt-card')
//     expect(expertButtons[0].text()).toContain('周经营复盘')
//     await expertButtons[0].trigger('click')
//     expect((wrapper.get('textarea[aria-label="向小马提问"]').element as HTMLTextAreaElement).value).toBe('分析本周经营指标和异常原因')
//   })

  it('isolates newly created quick prompts by mode', async () => {
    const { wrapper } = await mountAt('/chat')
    const dialog = await openCreatePrompt(wrapper)
    await dialog.get('input[aria-label="提示语名称"]').setValue('仅日常可见')
    await dialog.get('textarea[aria-label="提示语内容"]').setValue('日常提示语内容')
    await dialog.trigger('submit')
    await closeQuickPromptList(wrapper)
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


