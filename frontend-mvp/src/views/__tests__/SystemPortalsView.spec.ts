import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import router from '@/router'
import SystemPortalsView from '@/views/SystemPortalsView.vue'
import { workbenchTodos } from '@/mock/workbench'
import { clearDwsWorkbenchCache } from '@/services/dws-workbench'

const currentDateKey = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())

function mountWorkbench() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const testRouter = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/workspace/chat', component: { template: '<div />' } },
      { path: '/dashboards', component: { template: '<div />' } },
      { path: '/knowledge', component: { template: '<div />' } },
    ],
  })
  return mount(SystemPortalsView, { global: { plugins: [pinia, testRouter] } })
}

describe('workbench routes', () => {
  it('keeps knowledge, workbench, and settings routes available', () => {
    expect(router.resolve('/knowledge').name).toBe('knowledge')
    expect(router.resolve('/portals').name).toBe('portals')
    expect(router.resolve('/dashboards').name).toBe('dashboards')
    expect(router.resolve('/settings').name).toBe('settings')
  })
})

describe('SystemPortalsView', () => {
  beforeEach(() => {
    clearDwsWorkbenchCache()
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('manually refreshes personal DWS data without changing the card layout', async () => {
    const response = (title: string, refreshedAt: string) => ({
      source: 'live',
      connected: true,
      refreshedAt,
      identity: { name: '朝暮', department: 'AI项目组', organization: '天马' },
      schedules: [{
        id: 'dws-schedule-1',
        date: currentDateKey,
        start: '13:30',
        end: '14:30',
        title,
        location: '钉钉日程',
        participantCount: 0,
        status: '未开始',
        aiInsight: title === '刷新后的真实日程' ? {
          kind: 'AI 听记',
          summary: '已同步听记摘要',
          points: ['确认后续动作'],
          basisNote: '来自钉钉 AI 听记',
        } : undefined,
      }],
      todos: [],
      approvals: [],
      minutesCount: title === '刷新后的真实日程' ? 1 : 0,
      messages: [],
      accessIssues: [],
    })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => response('首次真实日程', '2026-07-23T14:36:00+08:00') })
      .mockResolvedValueOnce({ ok: true, json: async () => response('刷新后的真实日程', '2026-07-23T14:37:00+08:00') })
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mountWorkbench()

    await wrapper.get('[data-testid="org-scope-open"]').trigger('click')
    await wrapper.get('[data-testid="org-scope-node-chao-mu"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('首次真实日程')
    await wrapper.get('[aria-label="刷新日程看板"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('首次真实日程')
    await wrapper.get('[aria-label="刷新日程看板"]').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('刷新后的真实日程')
    expect(wrapper.get('[data-testid="schedule-ai-detail-dws-schedule-1"]').attributes('aria-label')).toContain('AI听记')
    expect(wrapper.get('[data-testid="information-digest-panel"]').classes()).toContain('h-[470px]')
  })

  it('isolates the DWS-backed 朝暮 identity from management mock data', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        source: 'live',
        connected: true,
        refreshedAt: '2026-07-23T14:36:00+08:00',
        identity: {
          name: '朝暮',
          department: 'AI项目组',
          organization: '江苏天马网络科技集团有限公司',
        },
        schedules: [
          {
            id: 'dws-schedule-1',
            date: currentDateKey,
            start: '13:30',
            end: '14:30',
            title: 'AIGC讨论推进',
            location: '钉钉日程',
            participantCount: 0,
            status: '未开始',
          },
        ],
        todos: [],
        approvals: [],
        minutesCount: 0,
        messages: [
          {
            id: 'dws-message-1',
            category: 'followup',
            title: 'AIGC项目跟进',
            priority: 'mid',
            score: 72,
            isConflict: false,
            latestTime: '2026-07-24 12:20',
            sourceCount: 1,
            businessDomain: '项目协作',
            summary: '请同步今天会议确认的后续动作。',
            impact: '需要及时完成项目协同',
            sources: [{
              id: 'source-1',
              conversationName: 'AIGC讨论推进群',
              conversationId: 'group-1',
              senderName: 'AI项目组',
              senderId: 'user-1',
              sentAt: '2026-07-24 12:20',
              content: '请同步今天会议确认的后续动作。',
              openMessageId: 'message-1',
            }],
            aiAnalysis: ['讨论热度 72 分：真实规则计算'],
            scoreTrace: {
              ruleVersion: 'prd-3.9-rules-1',
              factors: [],
              matchedSignals: [],
              degradationReasons: [],
            },
            actions: [
              { type: 'send_msg', enabled: true, actionRef: 'message-ref-1' },
              { type: 'create_todo', enabled: true },
              { type: 'create_calendar', enabled: true },
            ],
          },
        ],
        accessIssues: [],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mountWorkbench()

    await wrapper.get('[data-testid="org-scope-open"]').trigger('click')
    await wrapper.get('[data-testid="org-scope-node-chao-mu"]').trigger('click')
    await flushPromises()

    expect(fetchMock).not.toHaveBeenCalled()
    await wrapper.get('[aria-label="刷新信息摘要"]').trigger('click')
    await wrapper.get('[aria-label="刷新日程看板"]').trigger('click')
    await wrapper.get('[aria-label="刷新待办中心"]').trigger('click')
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledWith('/api/dws/workbench')
    expect(wrapper.find('[data-testid="personal-workspace-panel"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="information-digest-panel"]').classes()).toContain('h-[470px]')
    expect(wrapper.get('[data-testid="information-digest-panel"]').text()).toContain('AIGC项目跟进')
    expect(wrapper.get('[data-testid="information-digest-panel"]').text()).toContain('实时连接')
    expect(wrapper.get('[data-testid="schedule-load-summary"]').text()).toContain('近 7 天日程')
    expect(wrapper.get('[data-testid="todo-pressure-summary"]').text()).toContain('当前账号工作项')
    expect(wrapper.text()).toContain('AIGC讨论推进')
    expect(wrapper.text()).toContain('当前钉钉账号暂无待办或待审批')
    expect(wrapper.get('[data-testid="email-summary-panel"]').text()).toContain('待接入')
    expect(wrapper.get('[data-testid="email-summary-panel"]').text()).not.toContain('2026年下半年预算调整方案待确认')
    expect(wrapper.text()).not.toContain('大促库存调拨')
    expect(wrapper.text()).toContain('系统入口')

    await wrapper.get('[data-testid="digest-action-send_msg-dws-message-1"]').trigger('click')
    expect(wrapper.find('[data-testid="digest-detail-drawer"]').exists()).toBe(false)
    await wrapper.get('[data-testid="digest-action-confirm"]').trigger('click')
    await flushPromises()
    const actionCall = fetchMock.mock.calls.find((call) => call[0] === '/api/dws/actions')
    expect(actionCall).toEqual(['/api/dws/actions', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })])
    expect(JSON.parse(String(actionCall?.[1]?.body))).toMatchObject({
      action: 'message',
      actionRef: 'message-ref-1',
    })

    await wrapper.get('[data-testid="org-scope-node-management"]').trigger('click')
    expect(wrapper.get('[data-testid="information-digest-panel"]').text()).toContain('大促库存调拨')
    expect(wrapper.text()).not.toContain('AIGC讨论推进')
  })

  it('creates confirmed meeting todos in DingTalk only for a live personal workspace', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          source: 'live',
          connected: true,
          refreshedAt: '2026-07-26T09:30:00+08:00',
          identity: { name: '朝暮', department: 'AI项目组', organization: '天马' },
          schedules: [{
            id: 'dws-meeting-note',
            date: currentDateKey,
            start: '10:00',
            end: '11:00',
            title: '需求确认会',
            location: '钉钉会议',
            participantCount: 3,
            status: '未开始',
          }],
          todos: [],
          approvals: [],
          minutesCount: 0,
          messages: [],
          accessIssues: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          mode: 'ai',
          items: [{
            title: '提交需求基线',
            description: '根据需求确认会结论提交需求基线',
            executors: ['朝暮'],
            participants: [],
            due: `${currentDateKey}T18:00`,
            priority: 'high',
            tags: ['产品'],
          }],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, action: 'todo', message: '待办已创建到钉钉' }) })
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mountWorkbench()

    await wrapper.get('[data-testid="org-scope-open"]').trigger('click')
    await wrapper.get('[data-testid="org-scope-node-chao-mu"]').trigger('click')
    await flushPromises()
    await wrapper.get('[aria-label="刷新日程看板"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="schedule-note-dws-meeting-note"]').trigger('click')
    const dialog = wrapper.get('[data-testid="meeting-notes-dialog"]')
    await dialog.get('[data-testid="meeting-note-editor"]').setValue('朝暮负责今天提交需求基线')
    await dialog.get('[data-testid="extract-meeting-todos"]').trigger('click')
    await flushPromises()
    await dialog.get('[data-testid="confirm-meeting-todos"]').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/dws/todo-extract', expect.objectContaining({ method: 'POST' }))
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/dws/actions', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toMatchObject({
      action: 'todo',
      executors: ['朝暮'],
      description: '根据需求确认会结论提交需求基线',
      priority: 'high',
      tags: ['产品'],
    })
    expect(dialog.get('[data-testid="meeting-todo-feedback"]').text()).toContain('已创建 1 条钉钉待办')
  })

  it('renders the 50:50 information workbench without global search or create controls', () => {
    const wrapper = mountWorkbench()

    expect(wrapper.find('[data-testid="workbench-dashboard"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="workbench-main-grid"]').attributes('style')).toContain('repeat(2, minmax(0, 1fr))')
    expect(wrapper.text()).toContain('专注工作，成就不凡')
    expect(wrapper.text()).toContain('下午好，用户')
    expect(wrapper.text()).not.toContain('【用户】')
    expect(wrapper.find('[data-testid="greeting-weather-visual"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('28°')
    expect(wrapper.text()).toContain('今日管理风险总览')
    expect(wrapper.text()).toContain('信息摘要')
    expect(wrapper.text()).toContain('待办中心')
    expect(wrapper.text()).toContain('日程看板')
    expect(wrapper.text()).toContain('我创建的临期事项')
    expect(wrapper.get('[data-testid="overview-strip"]').findAll('article')).toHaveLength(4)
    expect(wrapper.get('[data-testid="overview-strip"]').text()).toContain('5昨日高优信息')
    expect(wrapper.get('[data-testid="overview-strip"]').text()).not.toContain('较多重点事项')
    expect(wrapper.text()).not.toContain('未读消息')
    expect(wrapper.text()).toContain('信息摘要')
    expect(wrapper.text()).toContain('大促库存调拨')
    expect(wrapper.text()).toContain('双11价格跟进')
    expect(wrapper.text()).toContain('川渝门店补货')
    expect(wrapper.text()).toContain('云仓峰值预案')
    expect(wrapper.text()).toContain('会员复购提升')
    expect(wrapper.text()).not.toContain('新能源基地')
    expect(wrapper.text()).not.toContain('董事会')
    expect(wrapper.text()).not.toContain('投委会')
    expect(wrapper.text()).toContain('系统入口')
    expect(wrapper.text()).toContain('自营系统')
    expect(wrapper.text()).toContain('大库存查询系统')
    expect(wrapper.text()).toContain('日程看板')
    expect(wrapper.text()).toContain('待办中心')
    expect(wrapper.text()).not.toContain('300 条未读消息已聚合为需要关注的事项')
    expect(wrapper.text()).not.toContain('日历、会议安排与 AI 听记')
    expect(wrapper.text()).not.toContain('全部系统 · 78 个')
    expect(wrapper.text()).not.toContain('审批与任务统一查看')
    expect(wrapper.get('[data-testid="overview-strip"]').classes()).toContain('justify-end')
    expect(wrapper.get('[data-testid="overview-strip"]').classes()).not.toContain('border-y')
    expect(wrapper.find('[data-testid="portal-scroll-area"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="schedule-scroll-area"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="todo-scroll-area"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="assistant-command-input"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('＋ 新建')
  })

  it('uses the same refresh and search controls on all five boards', () => {
    const wrapper = mountWorkbench()

    for (const title of ['信息摘要', '邮件摘要', '日程看板', '待办中心', '系统入口']) {
      expect(wrapper.find(`[aria-label="刷新${title}"]`).exists()).toBe(true)
      expect(wrapper.find(`[aria-label="搜索${title}"]`).exists()).toBe(true)
    }
  })

  it('shows AI urgency and group, person, and keyword types in 我的关注', async () => {
    const wrapper = mountWorkbench()

    await wrapper.get('[data-testid="digest-tab-watch"]').trigger('click')

    const panel = wrapper.get('[data-testid="information-digest-panel"]')
    expect(panel.text()).toContain('高')
    expect(panel.text()).toContain('群')
    expect(panel.text()).toContain('人员')
    expect(panel.text()).toContain('关键词')
    expect(panel.text()).not.toContain('高优先')
  })

  it('renders Tencent Exmail as an independent one-email-per-row summary card', () => {
    const wrapper = mountWorkbench()

    const panel = wrapper.get('[data-testid="email-summary-panel"]')
    expect(panel.text()).toContain('邮件摘要')
    expect(panel.find('.lucide-mail').exists()).toBe(false)
    expect(panel.text()).not.toContain('腾讯企业邮')
    expect(panel.text()).not.toContain('一封邮件对应一条 AI 摘要')
    expect(panel.findAll('[data-testid^="email-summary-item-"]')).toHaveLength(4)
    const email = panel.get('[data-testid="email-summary-item-email-budget-review"]')
    expect(email.text()).toContain('2026年下半年预算调整方案待确认')
    expect(email.text()).toContain('王敏')
    expect(email.get('[data-testid="email-title-email-budget-review"]').text()).toBe('2026年下半年预算调整方案待确认')
    expect(email.get('[data-testid="email-tag-email-budget-review"]').text()).toBe('重要')
    expect(email.get('[data-testid="email-time-email-budget-review"]').text()).toBe('今天 08:42')
    expect(wrapper.get('[data-testid="information-digest-panel"]').find('[data-testid="email-summary-panel"]').exists()).toBe(false)
  })

  it('opens the selected original email through the SSO precision-link contract', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const wrapper = mountWorkbench()

    await wrapper.get('[data-testid="email-open-original-email-budget-review"]').trigger('click')

    expect(openSpy).toHaveBeenCalledWith(
      '/api/email/sso/open?mailId=mail-budget-review-20260726',
      '_blank',
      'noopener,noreferrer',
    )
    openSpy.mockRestore()
  })

  it('uses a collapsible organization sidebar that resizes the content area', async () => {
    const wrapper = mountWorkbench()

    expect(wrapper.get('[data-testid="org-scope-sidebar"]').classes()).toContain('w-0')
    expect(wrapper.get('[data-testid="org-scope-open"]').classes()).toContain('h-8')
    expect(wrapper.get('[data-testid="org-scope-open"]').classes()).toContain('w-8')
    expect(wrapper.get('[data-testid="org-scope-open"]').find('.lucide-building-2').exists()).toBe(false)
    expect(wrapper.find('[data-testid="org-scope-current"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="org-scope-drawer"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="information-digest-panel"]').text()).not.toContain('AI 已整理')

    await wrapper.get('[data-testid="org-scope-open"]').trigger('click')
    expect(wrapper.get('[data-testid="org-scope-sidebar"]').classes()).toContain('w-[270px]')
    expect(wrapper.get('[data-testid="org-scope-drawer"]').text()).toContain('管理层')
    expect(wrapper.get('[data-testid="org-scope-drawer"]').text()).toContain('耶运动事业部')
    expect(wrapper.get('[data-testid="org-scope-drawer"]').text()).toContain('直播部')

    await wrapper.get('[data-testid="org-scope-node-live"]').trigger('click')
    expect(wrapper.get('[data-testid="information-digest-panel"]').text()).not.toContain('直播部')
  })

  it('shows complete source evidence in a read-only hover detail', async () => {
    const wrapper = mountWorkbench()

    expect(wrapper.text()).toContain('大促库存调拨')
    await wrapper.get('[data-testid="digest-tab-risk"]').trigger('click')
    expect(wrapper.text()).toContain('旗舰店错价')

    await wrapper.get('[data-testid="digest-detail-trigger-digest-risk-price"]').trigger('mouseenter')
    const detail = wrapper.get('[data-testid="digest-detail-floating"]')
    expect(detail.text()).toContain('AI 分析')
    expect(detail.text()).toContain('消息来源')
    expect(detail.text()).not.toContain('消息 ID')
    expect(detail.text()).not.toContain('规则版本')
    expect(detail.find('[data-action-type]').exists()).toBe(false)
    expect(detail.find('a[target="_blank"]').exists()).toBe(false)
  })

  it('presents digest rows as business items with independent action buttons', async () => {
    const wrapper = mountWorkbench()

    const item = wrapper.get('[data-testid="digest-item-digest-followup-stock"]')
    expect(item.text()).not.toContain('供应链')
    expect(item.text()).toContain('高')
    expect(item.text()).toContain('影响')
    expect(item.get('[data-testid="digest-action-send_msg-digest-followup-stock"]').text()).toBe('发消息')
    expect(item.get('[data-testid="digest-action-create_todo-digest-followup-stock"]').text()).toBe('建待办')
    expect(item.findAll('[data-action-type]')).toHaveLength(2)

    await item.get('[data-testid="digest-action-send_msg-digest-followup-stock"]').trigger('click')
    expect(wrapper.get('[data-testid="digest-action-dialog"]').text()).not.toContain('钉钉原文')
    expect(wrapper.find('[data-testid="digest-detail-drawer"]').exists()).toBe(false)
  })

  it('keeps digest actions before a source-count hover bubble and never opens detail from the row body', async () => {
    const wrapper = mountWorkbench()
    const item = wrapper.get('[data-testid="digest-item-digest-followup-stock"]')
    const controls = item.get('[data-testid="digest-card-controls-digest-followup-stock"]')

    expect(controls.findAll('button').map((button) => button.text())).toEqual(['发消息', '建待办', '1'])
    expect(item.get('[data-testid="digest-title-row-digest-followup-stock"]').text()).toContain('大促库存调拨')
    expect(item.get('[data-testid="digest-title-row-digest-followup-stock"]').text()).toContain('高')
    expect(item.find('[data-testid="digest-domain-digest-followup-stock"]').exists()).toBe(false)
    expect(item.get('[data-testid="digest-summary-digest-followup-stock"]').text()).toContain('摘要：')
    expect(item.get('[data-testid="digest-impact-digest-followup-stock"]').text()).toContain('影响：')
    expect(item.get('[data-testid="digest-summary-digest-followup-stock"]').classes()).toContain('text-xs')
    expect(item.get('[data-testid="digest-impact-digest-followup-stock"]').classes()).toContain('text-xs')
    expect(item.find('[data-testid="digest-accent-digest-followup-stock"]').exists()).toBe(true)
    expect(item.get('[data-testid="digest-time-digest-followup-stock"]').text()).toBe('2026-07-23 10:00')
    expect(item.get('[data-testid="digest-detail-trigger-digest-followup-stock"]').classes()).not.toContain('border')
    await item.get('[data-testid="digest-item-main-digest-followup-stock"]').trigger('click')
    expect(wrapper.find('[data-testid="digest-detail-floating"]').exists()).toBe(false)

    await item.get('[data-testid="digest-detail-trigger-digest-followup-stock"]').trigger('mouseenter')
    const detail = wrapper.get('[data-testid="digest-detail-floating"]')
    expect(detail.text()).toContain('AI 分析')
    expect(detail.text()).toContain('消息来源')
    expect(detail.classes()).toContain('absolute')
    expect(detail.attributes('data-bound-to')).toBe('digest-followup-stock')
    expect(detail.find('[data-testid="digest-detail-pointer"]').exists()).toBe(true)
    expect(detail.find('[data-testid^="digest-source-avatar-"]').exists()).toBe(true)
    expect(detail.text()).not.toContain('消息 ID')
    expect(detail.find('[data-action-type]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="digest-detail-drawer"]').exists()).toBe(false)
  })

  it('starts with a full-width schedule list and expands the calendar from the header', async () => {
    const wrapper = mountWorkbench()

    expect(wrapper.find('[data-testid="calendar-month-grid"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="schedule-list-pane"]').classes()).toContain('w-full')
    expect(wrapper.get('[data-testid="schedule-header"]').find('[data-testid="calendar-collapse-toggle"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="calendar-collapse-toggle"]').attributes('aria-label')).toBe('展开日历')
    expect(wrapper.get('[data-testid="calendar-collapse-toggle"]').find('.lucide-calendar-days').exists()).toBe(true)
    expect(wrapper.get('[data-testid="calendar-collapse-toggle"]').find('.lucide-chevrons-right').exists()).toBe(false)
    await wrapper.get('[data-testid="calendar-collapse-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="calendar-month-grid"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="schedule-scroll-area"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="calendar-collapse-toggle"]').attributes('aria-label')).toBe('收起日历')
  })

  it('shows AI meeting notes in a top-layer hover panel', async () => {
    const wrapper = mountWorkbench()

    const noteButton = wrapper.get('[data-testid="schedule-ai-detail-schedule-completed-review"]')
    expect(noteButton.attributes('aria-label')).toContain('AI听记')
    await noteButton.trigger('mouseenter')
    const notePreview = wrapper.get('[data-testid="schedule-ai-detail-floating"]')
    expect(notePreview.text()).toContain('会议确认新版需求范围，接口联调提前至周三')
    expect(notePreview.attributes('data-placement')).toBe('left-of-trigger')
    expect(notePreview.classes()).not.toContain('right-8')
    expect(notePreview.classes()).toContain('pointer-events-auto')
    expect(notePreview.attributes('style')).toContain('left:')
    expect(notePreview.get('[data-testid="schedule-open-dingtalk"]').text()).toContain('查看完整听记')
    expect(wrapper.find('[data-testid="schedule-ai-detail-schedule-5"]').exists()).toBe(false)
  })

  it('opens the focused AI todo generator and restores the manually entered draft', async () => {
    const wrapper = mountWorkbench()

    await wrapper.get('[data-testid="schedule-note-schedule-1"]').trigger('click')
    const dialog = wrapper.get('[data-testid="meeting-notes-dialog"]')
    expect(dialog.text()).toContain('AI生成待办')
    expect(dialog.text()).not.toContain('产品需求评审会')
    expect(dialog.text()).not.toContain('粘贴会议纪要，也可以直接记录')
    expect(dialog.text()).not.toContain('一行一条，点击事项展开修改')
    expect(dialog.get('[data-testid="meeting-note-editor"]').attributes('placeholder')).toBe('输入文本，从文本中提取待办事项')
    expect(dialog.get('[data-testid="extract-meeting-todos"]').attributes('disabled')).toBeDefined()

    const editor = dialog.get('[data-testid="meeting-note-editor"]')
    await editor.setValue('   ')
    expect(dialog.get('[data-testid="extract-meeting-todos"]').attributes('disabled')).toBeDefined()
    await editor.setValue('张明负责周三前更新需求基线。')
    expect(dialog.get('[data-testid="extract-meeting-todos"]').attributes('disabled')).toBeUndefined()
    expect(dialog.find('[data-testid="meeting-note-save-state"]').exists()).toBe(false)

    await dialog.get('[aria-label="关闭AI生成待办"]').trigger('click')
    await wrapper.get('[data-testid="schedule-note-schedule-1"]').trigger('click')
    expect(wrapper.get('[data-testid="meeting-note-editor"]').element).toHaveProperty('value', '张明负责周三前更新需求基线。')
  })

  it('places a visible note action immediately before the schedule status', () => {
    const wrapper = mountWorkbench()
    const actions = wrapper.get('[data-testid="schedule-row-actions-schedule-completed-review"]')

    expect(actions.findAll('button').at(0)?.text()).toBe('笔记')
    expect(actions.text()).toContain('已结束')
  })

  it('shows meeting background AI details before an upcoming meeting starts', async () => {
    const wrapper = mountWorkbench()

    const backgroundButton = wrapper.get('[data-testid="schedule-ai-detail-schedule-2"]')
    expect(backgroundButton.attributes('aria-label')).toContain('会前背景')
    await backgroundButton.trigger('mouseenter')
    const detail = wrapper.get('[data-testid="schedule-ai-detail-floating"]')
    expect(detail.text()).toContain('会前背景')
    expect(detail.text()).toContain('项目进展与待决事项')
  })

  it('extracts multiple editable todo candidates and confirms only selected items', async () => {
    const wrapper = mountWorkbench()

    await wrapper.get('[data-testid="schedule-note-schedule-1"]').trigger('click')
    const dialog = wrapper.get('[data-testid="meeting-notes-dialog"]')
    await dialog.get('[data-testid="meeting-note-editor"]').setValue([
      '产品部负责今天更新需求基线',
      '技术部负责周三前完成接口联调',
      '测试部补充回归清单',
    ].join('\n'))
    await dialog.get('[data-testid="extract-meeting-todos"]').trigger('click')

    expect(dialog.findAll('[data-testid^="meeting-todo-candidate-"]')).toHaveLength(3)
    expect(dialog.get('[data-testid="meeting-todo-candidate-0"]').text()).toContain('DDL：')
    expect(dialog.get('[data-testid="meeting-todo-candidate-0"]').text()).toContain('负责人：产品部')
    expect(dialog.get('[data-testid="meeting-todo-candidate-0"]').text()).toContain('：产品部负责今天更新需求基线')
    expect(dialog.get('[data-testid="meeting-todo-candidate-0"]').text()).not.toContain('提醒')
    expect(dialog.get('[data-testid="confirm-meeting-todos"]').text()).toContain('创建 3 条待办')
    await dialog.get('[data-testid="meeting-todo-selected-0"]').setValue(false)
    expect(dialog.get('[data-testid="confirm-meeting-todos"]').text()).toContain('创建 2 条待办')

    await dialog.get('[data-testid="edit-meeting-todo-1"]').trigger('click')
    expect(dialog.get('[data-testid="meeting-todo-candidate-1"]').text()).not.toContain('提醒')
    expect(dialog.get('[data-testid="meeting-todo-candidate-1"]').findAll('span').filter((item) => item.text() === '*')).toHaveLength(4)
    expect(dialog.find('[data-testid="meeting-todo-description-1"]').exists()).toBe(true)
    expect(dialog.find('[data-testid="meeting-todo-participants-1"]').exists()).toBe(true)
    expect(dialog.find('[data-testid="meeting-todo-priority-1"]').exists()).toBe(true)
    expect(dialog.find('[data-testid="meeting-todo-tags-1"]').exists()).toBe(true)
    const title = dialog.get('[data-testid="meeting-todo-title-1"]')
    expect(title.attributes('maxlength')).toBe('10')
    await title.setValue('完成接口联调')
    expect(title.element).toHaveProperty('value', '完成接口联调')

    await dialog.get('[data-testid="confirm-meeting-todos"]').trigger('click')
    expect(dialog.get('[data-testid="meeting-todo-feedback"]').text()).toContain('已确认 2 条待办')
    expect(dialog.get('[data-testid="meeting-todo-feedback"]').text()).toContain('未写入钉钉')
  })

  it('removes the OneNote, clipboard, and explicit save controls', async () => {
    const wrapper = mountWorkbench()

    await wrapper.get('[data-testid="schedule-note-schedule-1"]').trigger('click')
    const dialog = wrapper.get('[data-testid="meeting-notes-dialog"]')
    expect(dialog.find('[data-testid="sync-onenote-note"]').exists()).toBe(false)
    expect(dialog.find('[data-testid="paste-meeting-note"]').exists()).toBe(false)
    expect(dialog.find('[data-testid="copy-meeting-note"]').exists()).toBe(false)
    expect(dialog.find('[data-testid="save-meeting-note"]').exists()).toBe(false)
    expect(dialog.find('[data-testid="onenote-sync-panel"]').exists()).toBe(false)
    expect(dialog.find('[data-testid="extract-meeting-todos"]').exists()).toBe(true)
  })

  it('lets the user add and remove todo candidates before confirmation', async () => {
    const wrapper = mountWorkbench()

    await wrapper.get('[data-testid="schedule-note-schedule-1"]').trigger('click')
    const dialog = wrapper.get('[data-testid="meeting-notes-dialog"]')
    await dialog.get('[data-testid="meeting-note-editor"]').setValue('产品部负责更新需求基线')
    await dialog.get('[data-testid="extract-meeting-todos"]').trigger('click')
    expect(dialog.findAll('[data-testid^="meeting-todo-candidate-"]')).toHaveLength(1)

    await dialog.get('[data-testid="add-meeting-todo"]').trigger('click')
    expect(dialog.findAll('[data-testid^="meeting-todo-candidate-"]')).toHaveLength(2)
    await dialog.get('[data-testid="remove-meeting-todo-0"]').trigger('click')
    expect(dialog.findAll('[data-testid^="meeting-todo-candidate-"]')).toHaveLength(1)
  })

  it('shows schedule load analysis and pre-meeting context only when base information is sufficient', async () => {
    const wrapper = mountWorkbench()

    const loadSummary = wrapper.get('[data-testid="schedule-load-summary"]')
    expect(loadSummary.text()).toContain('日程偏满')
    expect(loadSummary.text()).not.toContain('冲突 2 个')
    expect(loadSummary.find('[data-testid="schedule-summary-tag"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="schedule-action-schedule-2"]').text()).toBe('释放')
    expect(wrapper.get('[data-testid="schedule-action-schedule-6"]').text()).toBe('释放')
    expect(wrapper.get('[data-testid="schedule-action-schedule-1"]').text()).toBe('重要')
    expect(wrapper.find('[data-testid^="schedule-action-"]').find('button').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('高重要')

    const contextButton = wrapper.get('[data-testid="schedule-ai-detail-schedule-4"]')
    expect(contextButton.attributes('aria-label')).toContain('会前背景')
    await contextButton.trigger('mouseenter')
    const contextPanel = wrapper.get('[data-testid="schedule-ai-detail-floating"]')
    expect(contextPanel.text()).toContain('会前背景')
    expect(contextPanel.text()).toContain('AI 判断')
    expect(contextPanel.text()).toContain('重要')
    expect(contextPanel.text()).toContain('本次复盘聚焦直营与加盟门店')
    expect(contextPanel.text()).toContain('仅基于日程已有信息整理')
    expect(contextPanel.text()).toContain('AI 建议，需人工确认')

    expect(wrapper.get('[data-testid="schedule-item-schedule-4"]').findAll('[data-testid^="schedule-ai-detail-"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="schedule-item-schedule-6"]').findAll('[data-testid^="schedule-ai-detail-"]')).toHaveLength(1)
  })

  it('shows five complete digest rows and six comfortable system entries', () => {
    const wrapper = mountWorkbench()

    expect(wrapper.get('[data-testid="information-digest-panel"]').classes()).toContain('h-[470px]')
    expect(wrapper.findAll('article[data-testid^="digest-item-"]')).toHaveLength(5)
    expect(wrapper.get('[data-testid="system-portal-panel"]').classes()).toContain('h-[316px]')
    expect(wrapper.get('[data-testid="portal-grid"]').classes()).toContain('auto-rows-[96px]')
    expect(wrapper.get('[data-testid="system-portal-panel"]').text()).toContain('系统入口')
    expect(wrapper.get('[data-testid="portal-scroll-area"]').classes()).toContain('overflow-y-auto')
  })

  it('keeps todo pressure and priority signals without any item hover detail', () => {
    const wrapper = mountWorkbench()

    const pressure = wrapper.get('[data-testid="todo-pressure-summary"]')
    expect(pressure.text()).toContain('今日优先 2')
    expect(pressure.text()).toContain('逾期 1')
    expect(pressure.text()).toContain('我创建临期 3')

    expect(wrapper.get('[data-testid="approval-priority-approval-1"]').text()).toBe('高')
    expect(wrapper.get('[data-testid="todo-priority-todo-2"]').text()).toBe('中')
    expect(wrapper.get('[data-testid="todo-priority-todo-3"]').text()).toBe('中')
    expect(wrapper.get('[data-testid="todo-priority-todo-4"]').text()).toBe('低')

    expect(wrapper.find('[data-testid^="todo-ai-detail-"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="todo-detail-floating"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="todo-item-todo-2"]').text()).toContain('跟进')
  })

  it('opens DingTalk-compatible draft forms from AI details', async () => {
    const wrapper = mountWorkbench()

    await wrapper.get('[data-testid="digest-action-send_msg-digest-followup-stock"]').trigger('click')
    const messageForm = wrapper.get('[data-testid="digest-action-dialog"]')
    expect(messageForm.text()).toContain('发消息')
    expect(messageForm.text()).toContain('发送给')
    expect(messageForm.text()).not.toContain('消息标题')
    expect(messageForm.text()).toContain('发送内容')
    expect(messageForm.text()).not.toContain('业务影响')
    await messageForm.get('[aria-label="关闭动作表单"]').trigger('click')

    await wrapper.get('[data-testid="schedule-ai-detail-schedule-4"]').trigger('mouseenter')
    await wrapper.get('[data-testid="schedule-create-draft"]').trigger('click')
    const scheduleForm = wrapper.get('[data-testid="schedule-draft-form"]')
    expect(scheduleForm.text()).toContain('钉钉日程草稿')
    expect(scheduleForm.text()).toContain('开始时间')
    expect(scheduleForm.text()).toContain('必需参与人')
    expect(scheduleForm.text()).toContain('确认创建日程')

    expect(wrapper.find('[data-testid="todo-detail-floating"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="todo-draft-form"]').exists()).toBe(false)
  })

  it('shows today todo count and uses one status pill format for approvals and tasks', () => {
    const wrapper = mountWorkbench()

    expect(wrapper.get('[data-testid="todo-today-count"]').text()).toContain('今天')
    expect(wrapper.get('[data-testid="todo-today-count"]').text()).toContain('4 项')
    const approvalStatus = wrapper.get('[data-testid="approval-status-approval-1"]')
    const taskStatus = wrapper.get('[data-testid="todo-status-todo-2"]')
    for (const className of ['rounded-full', 'px-2', 'h-7', 'text-[10px]', 'font-medium']) {
      expect(approvalStatus.classes()).toContain(className)
      expect(taskStatus.classes()).toContain(className)
    }
  })

  it('does not show AI hover icons for approvals or tasks', () => {
    const wrapper = mountWorkbench()

    expect(wrapper.find('[data-testid="todo-ai-detail-approval-1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="todo-ai-detail-todo-2"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="approval-open-dingtalk-approval-1"]').attributes('href')).toBe('https://www.dingtalk.com/')
  })

  it('orders the unified todo pool by AI action and then by deadline', () => {
    const wrapper = mountWorkbench()
    const orderedIds = wrapper.findAll('[data-testid^="work-item-"]').map((item) => item.attributes('data-testid'))

    expect(orderedIds.slice(0, 4)).toEqual([
      'work-item-approval-1',
      'work-item-todo-2',
      'work-item-todo-3',
      'work-item-todo-4',
    ])
  })

  it('shows all systems without MVP favorites and keeps secondary card copy', () => {
    const wrapper = mountWorkbench()

    expect(wrapper.text()).toContain('OA系统')
    expect(wrapper.text()).toContain('财务供销系统')
    expect(wrapper.text()).toContain('苏体项目')
    expect(wrapper.text()).toContain('线上 B2C、直播与品牌业务入口')
    expect(wrapper.find('[data-testid^="portal-category-"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid^="favorite-portal-"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="portal-arrow-self"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="portal-monogram-self"]').text()).toBe('自营')
    expect(wrapper.get('[data-testid="portal-monogram-finance-supply"]').text()).toBe('供销')
    expect(wrapper.get('[data-testid="portal-monogram-tm-crm"]').text()).toBe('CRM')
  })

  it('filters schedules, navigates calendar, and switches task scopes', async () => {
    const wrapper = mountWorkbench()

    await wrapper.get('[aria-label="搜索日程看板"]').setValue('供应链')
    expect(wrapper.text()).toContain('供应链库存同步')
    expect(wrapper.text()).not.toContain('项目周会')
    await wrapper.get('[aria-label="搜索日程看板"]').setValue('不存在')
    expect(wrapper.text()).toContain('未找到匹配日程')
    expect(wrapper.find('[data-testid="clear-schedule-search"]').exists()).toBe(true)
    await wrapper.get('[data-testid="clear-schedule-search"]').trigger('click')
    expect(wrapper.text()).toContain('项目周会')

    await wrapper.get('[data-testid="calendar-collapse-toggle"]').trigger('click')
    const monthBefore = wrapper.get('[data-testid="calendar-month-label"]').text()
    await wrapper.get('[aria-label="下个月"]').trigger('click')
    expect(wrapper.get('[data-testid="calendar-month-label"]').text()).not.toBe(monthBefore)
    expect(wrapper.find('[aria-label="回到今天"]').exists()).toBe(false)

    await wrapper.get('[data-testid="todo-type-task"]').trigger('click')
    await wrapper.get('[data-testid="todo-scope-participated"]').trigger('click')
    expect(wrapper.text()).toContain('客户反馈跟进')
    expect(wrapper.text()).toContain('撰写项目需求文档')
    await wrapper.get('[data-testid="todo-scope-created"]').trigger('click')
    expect(wrapper.text()).toContain('设计评审材料准备')
  })

  it('uses one item-type control and one shared status tab bar', async () => {
    const wrapper = mountWorkbench()

    expect(wrapper.text()).toContain('采购预算申请')
    expect(wrapper.find('[data-testid="approval-checkbox-approval-1"]').exists()).toBe(false)
    const approvalLink = wrapper.get('[data-testid="approval-open-dingtalk-approval-1"]')
    expect(approvalLink.attributes('href')).toBe('https://www.dingtalk.com/')
    expect(approvalLink.attributes('target')).toBe('_blank')
    expect(approvalLink.attributes('aria-label')).toContain('前往钉钉处理审批')
    expect(approvalLink.attributes('title')).toBe('前往钉钉处理审批')
    expect(approvalLink.find('.lucide-external-link').exists()).toBe(true)
    expect(wrapper.get('[data-testid="todo-item-todo-2"]').find('[aria-label^="完成任务"]').exists()).toBe(true)
    await wrapper.get('[data-testid="todo-type-approval"]').trigger('click')
    await wrapper.get('[data-testid="todo-scope-done"]').trigger('click')
    expect(wrapper.text()).toContain('合同用印申请')
    expect(wrapper.text()).not.toContain('采购预算申请')
    expect(wrapper.text()).toContain('审批通过')
    await wrapper.get('[data-testid="todo-scope-created"]').trigger('click')
    expect(wrapper.text()).toContain('外出申请')
    await wrapper.get('[data-testid="todo-scope-participated"]').trigger('click')
    expect(wrapper.text()).toContain('订单付款审核')
  })

  it('lets the creator review comments and confirm an editable AI follow-up draft', async () => {
    const wrapper = mountWorkbench()

    await wrapper.get('[data-testid="todo-scope-created"]').trigger('click')
    expect(wrapper.get('[data-testid="todo-comments-todo-2"]').text()).toBe('跟进')
    await wrapper.get('[data-testid="todo-comments-todo-2"]').trigger('click')
    const panel = wrapper.get('[data-testid="todo-comments-floating"]')
    expect(panel.text()).toContain('评论动态')
    expect(panel.text()).toContain('材料框架已完成')
    expect(panel.text()).toContain('AI 跟进草稿')

    await panel.get('[data-testid="todo-comment-draft"]').setValue('请在今天 16:00 前同步最终材料。')
    await panel.get('[data-testid="todo-comment-publish"]').trigger('click')
    expect(panel.get('[data-testid="todo-comment-feedback"]').text()).toContain('演示评论已确认，未写入钉钉')
  })

  it('loads and publishes comments for a live DingTalk todo created by the current user', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        source: 'live', connected: true, refreshedAt: '2026-07-26T10:00:00+08:00',
        identity: { name: '朝暮', department: 'AI项目组', organization: '天马' },
        schedules: [], approvals: [], minutesCount: 0, messages: [], accessIssues: [],
        todos: [{ id: 'dws-todo-task-live-1', externalId: 'task-live-1', title: '跟进评审材料', scopes: ['created'], due: '今天 18:00 截止', priority: '普通', status: '未完成', source: '钉钉待办', owner: '朝暮', creator: '朝暮', assignee: '王杰', latestUpdate: '今天 09:30', completed: false }],
      }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ comments: [{ id: 'c-1', author: '王杰', content: '已完成初稿', createdAt: '今天 09:40' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ comment: { id: 'c-2', author: '朝暮', content: '请同步最终稿', createdAt: '刚刚' } }) })
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mountWorkbench()

    await wrapper.get('[data-testid="org-scope-open"]').trigger('click')
    await wrapper.get('[data-testid="org-scope-node-chao-mu"]').trigger('click')
    await flushPromises()
    await wrapper.get('[aria-label="刷新待办中心"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="todo-scope-created"]').trigger('click')
    await wrapper.get('[data-testid="todo-comments-dws-todo-task-live-1"]').trigger('click')
    await flushPromises()
    const panel = wrapper.get('[data-testid="todo-comments-floating"]')
    expect(panel.text()).toContain('已完成初稿')
    await panel.get('[data-testid="todo-comment-draft"]').setValue('请同步最终稿')
    await panel.get('[data-testid="todo-comment-publish"]').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/dws/todos/comments?taskId=task-live-1')
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual({ taskId: 'task-live-1', content: '请同步最终稿' })
    expect(panel.get('[data-testid="todo-comment-feedback"]').text()).toContain('评论已发布到钉钉')
  })

  it('shows business states with priority labels from the source interface', async () => {
    const wrapper = mountWorkbench()

    await wrapper.get('[data-testid="todo-type-approval"]').trigger('click')
    await wrapper.get('[data-testid="todo-scope-done"]').trigger('click')
    expect(wrapper.text()).toContain('审批通过')
    expect(wrapper.text()).toContain('审批被拒绝')
    expect(wrapper.text()).toContain('已撤销')

    await wrapper.get('[data-testid="todo-type-task"]').trigger('click')
    await wrapper.get('[data-testid="todo-scope-all"]').trigger('click')
    expect(wrapper.text()).toContain('未完成')
    expect(wrapper.text()).toContain('已完成')
    expect(wrapper.get('[data-testid="todo-scroll-area"]').text()).toContain('高')
    expect(wrapper.get('[data-testid="todo-scroll-area"]').text()).toContain('中')
    expect(wrapper.get('[data-testid="todo-scroll-area"]').text()).toContain('低')
  })

  it('uses one fixed typography scale across matching hierarchy levels', () => {
    const wrapper = mountWorkbench()

    const cardTitles = wrapper.findAll('.workbench-card-title')
    expect(cardTitles).toHaveLength(5)
    expect(cardTitles.every((title) => title.classes().includes('text-[14px]'))).toBe(true)
    expect(wrapper.findAll('.workbench-item-title').every((title) => title.classes().includes('text-[14px]'))).toBe(true)
    expect(wrapper.findAll('.workbench-body-copy').every((copy) => copy.classes().includes('text-xs'))).toBe(true)
    expect(wrapper.findAll('.workbench-meta-copy').every((copy) => copy.classes().includes('text-[10px]'))).toBe(true)
  })

  it('stores task statuses and priorities with the product vocabulary', () => {
    expect(new Set(workbenchTodos.map((item) => item.status))).toEqual(new Set(['未完成', '已完成']))
    expect(new Set(workbenchTodos.map((item) => item.priority))).toEqual(new Set(['紧急', '较高', '普通', '较低']))
  })

  it('renders schedules as clear time blocks without the rejected timeline', () => {
    const wrapper = mountWorkbench()

    expect(wrapper.find('[data-testid="schedule-timeline"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="schedule-time-block"]').length).toBeGreaterThan(2)
  })

  it('opens real portal links in a new tab', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const wrapper = mountWorkbench()

    await wrapper.get('[data-testid="portal-card-self"]').trigger('click')

    expect(openSpy).toHaveBeenCalledWith(
      'https://self.xingyunyezi.com/',
      '_blank',
      'noopener,noreferrer',
    )
    openSpy.mockRestore()
  })

  it('searches all portals with fuzzy matching', async () => {
    const wrapper = mountWorkbench()

    await wrapper.get('[aria-label="搜索系统入口"]').setValue('需求')
    expect(wrapper.text()).toContain('需求管理系统')
    expect(wrapper.text()).not.toContain('自营系统')

    await wrapper.get('[aria-label="搜索系统入口"]').setValue('微信小程序')
    expect(wrapper.text()).toContain('天马运动马达端小程序')
    expect(wrapper.text()).toContain('团购小程序')
    expect(wrapper.text()).not.toContain('自营系统')
    expect(wrapper.find('[data-testid="clear-portal-search"]').exists()).toBe(true)
    await wrapper.get('[data-testid="clear-portal-search"]').trigger('click')
    expect(wrapper.text()).toContain('自营系统')
  })

  it('clears todo search and shows a dedicated empty state', async () => {
    const wrapper = mountWorkbench()

    await wrapper.get('[aria-label="搜索待办中心"]').setValue('完全不存在的事项')
    expect(wrapper.text()).toContain('未找到匹配待办')
    expect(wrapper.find('[data-testid="clear-todo-search"]').exists()).toBe(true)
    await wrapper.get('[data-testid="clear-todo-search"]').trigger('click')
    expect(wrapper.text()).toContain('采购预算申请')
  })

  it('uploads a local logo preview for a portal card', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:portal-logo')
    const wrapper = mountWorkbench()

    await wrapper.get('[data-testid="upload-logo-self"]').trigger('click')
    const input = wrapper.get<HTMLInputElement>('[data-testid="portal-logo-input"]')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [new File(['logo'], 'logo.png', { type: 'image/png' })],
    })
    await input.trigger('change')

    expect(createObjectURL).toHaveBeenCalled()
    expect(wrapper.get('[alt="自营系统 logo"]').attributes('src')).toBe('blob:portal-logo')
    createObjectURL.mockRestore()
  })
})
