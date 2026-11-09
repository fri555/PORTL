import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import KnowledgeAccessPanel from '../KnowledgeAccessPanel.vue'
import type { DingTalkImportTask } from '@/types/knowledge-source'

const dialogStub = { props: ['modelValue'], template: '<section v-if="modelValue"><slot/><slot name="footer"/></section>' }
const baseTask = {
  importTaskId: 'task-1', taskId: '25', recordId: 'R1', executedAt: '2026-10-29 09:00', platformUserId: 'u1', userAlias: '朝暮',
  destinationId: 'kb1', destinationPath: '制度库 / 人事', frequency: '每天', schedule: '00:00', enabled: true,
  latestSyncAt: '2026-10-29 09:00', status: '同步成功', syncMode: 'backend-managed', syncRuntime: 'prototype',
  referencedAgentIds: ['agent-1'], referenceRefreshResult: '已刷新',
  documentMappings: [{ sourceDocumentId: 'doc-a', sourceName: '知识库 / 制度 A', localFileId: 'file-a', status: '成功', contentResult: '已更新' }],
} as DingTalkImportTask
const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))
function createPanel(overrides: Record<string, unknown> = {}) {
  const wrapper = mount(KnowledgeAccessPanel, {
    props: { destinations: [{ id: 'kb1', name: '制度库' }], records: [structuredClone(baseTask)], canManage: true, viewerUserId: 'u1',
      agentReferenceOptions: [{ id: 'agent-1', name: '制度助手', documentIds: ['file-a'] }], ...overrides },
    global: { stubs: { Teleport: true, ElDialog: dialogStub } },
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('DingTalk sync task management', () => {
  it('keeps the existing task and record tabs with task controls', () => {
    const wrapper = createPanel()
    expect(wrapper.get('.page-head h1').text()).toBe('数据源')
    expect(wrapper.get('[data-testid="dingtalk-connection-card"]').element.tagName).toBe('BUTTON')
    expect(wrapper.get('.records-tabs [aria-selected="true"]').text()).toBe('任务')
    expect(wrapper.findAll('.task-head span').map(cell => cell.text())).toEqual([
      '任务 ID', '所有者', '来源文档', '保存位置', '同步规则', '最新执行时间', '状态', '操作',
    ])
    expect(wrapper.get('[data-testid="dingtalk-sync-task"]').text()).toContain('每天 00:00')
    expect(wrapper.get('[data-testid="dingtalk-sync-task"]').find('[role="switch"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('后台自动同步')
  })

  it('offers execute and edit without a separate schedule action', async () => {
    const wrapper = createPanel()
    await wrapper.get('button[aria-label="任务25操作菜单"]').trigger('click')
    expect(wrapper.get('[role="menu"]').text()).toContain('编辑')
    expect(wrapper.get('[role="menu"]').text()).toContain('执行')
    expect(wrapper.get('[role="menu"]').text()).not.toContain('调整频率')
    await wrapper.get('button[aria-label="执行任务25"]').trigger('click')
    expect(wrapper.emitted('execute-task')?.[0]?.[0]).toMatchObject({ importTaskId: 'task-1', destinationId: 'kb1' })
    await wrapper.get('button[aria-label="任务25操作菜单"]').trigger('click')
    await wrapper.get('button[aria-label="编辑任务25"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('edit-task')?.[0]?.[0]).toMatchObject({ importTaskId: 'task-1', destinationId: 'kb1' })
  })

  it('opens the last nonautomatic task menu upward so execute remains visible', async () => {
    const wrapper = createPanel({ records: [
      baseTask,
      { ...baseTask, importTaskId: 'task-2', taskId: '26' },
      { ...baseTask, importTaskId: 'task-manual', taskId: '27', frequency: '不自动同步', schedule: '—', enabled: false },
    ] })

    await wrapper.get('button[aria-label="任务27操作菜单"]').trigger('click')

    const menu = wrapper.get('[role="menu"]')
    expect(menu.text()).toContain('执行')
    expect(menu.classes()).toContain('open-up')
  })

  it('makes long task values discoverable', () => {
    const destinationPath = '公共空间 / 集团制度知识库 / 人力资源中心 / 规章制度归档'
    const wrapper = createPanel({ records: [{ ...baseTask, destinationPath }] })
    const row = wrapper.get('[data-testid="dingtalk-sync-task"]')
    expect(row.get('.destination-cell').attributes('title')).toBe(destinationPath)
    expect(row.get('.source-cell').attributes('title')).toBe('知识库 / 制度 A')
    expect(row.get('.exec-time').attributes('title')).toBe('2026-10-29 09:00')
  })

  it('filters tasks by source, destination and date', async () => {
    const wrapper = createPanel({ records: [baseTask, { ...baseTask, importTaskId: 'task-2', taskId: '24', destinationPath: '项目库', latestSyncAt: '2026-10-30 10:00',
      documentMappings: [{ sourceDocumentId: 'doc-b', sourceName: '我的文档 / 项目规范', localFileId: 'file-b', status: '失败' }] }] })
    await wrapper.get('[aria-label="搜索同步记录"]').setValue('项目规范')
    expect(wrapper.findAll('[data-testid="dingtalk-sync-task"]')).toHaveLength(1)
    await wrapper.get('[aria-label="开始日期"]').setValue('2026-10-31')
    expect(wrapper.findAll('[data-testid="dingtalk-sync-task"]')).toHaveLength(0)
  })

  it('limits ordinary users to their own tasks and hides connection configuration', () => {
    const wrapper = createPanel({ canManage: false, records: [baseTask, { ...baseTask, importTaskId: 'other', platformUserId: 'u2' }] })
    expect(wrapper.findAll('[data-testid="dingtalk-sync-task"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="dingtalk-connection-card"]').exists()).toBe(false)
    expect(wrapper.find('.connection-settings').exists()).toBe(false)
  })

  it('shows reference refresh outcomes on the record tab', async () => {
    const wrapper = createPanel({ records: [{ ...baseTask, referencedAgentIds: [], referenceRefreshResult: '无引用' }] })
    await wrapper.findAll('.records-tabs button').find(button => button.text() === '记录')!.trigger('click')
    expect(wrapper.get('[data-testid="dingtalk-sync-record"]').text()).toContain('无引用')
    await wrapper.setProps({ records: [{ ...baseTask, referenceRefreshResult: '待后台接入' }] })
    expect(wrapper.get('[data-testid="dingtalk-sync-record"]').text()).toContain('待后台接入')
  })

  it('keeps historical executions visible when a source is no longer managed', async () => {
    const wrapper = createPanel({ records: [], executionRecords: [baseTask] })
    expect(wrapper.findAll('[data-testid="dingtalk-sync-task"]')).toHaveLength(0)
    await wrapper.findAll('.records-tabs button').find(button => button.text() === '记录')!.trigger('click')
    expect(wrapper.findAll('[data-testid="dingtalk-sync-record"]')).toHaveLength(1)
    await wrapper.get('[aria-label="查看同步记录R1"]').trigger('click')
    expect(wrapper.get('[data-testid="dingtalk-sync-detail"]').text()).toContain('知识库 / 制度 A')
  })

  it('keeps document sync details focused on source status and failure reason for every viewer', async () => {
    const wrapper = createPanel({ records: [], executionRecords: [{ ...baseTask, referenceRefreshResult: '待后台接入' }] })
    await wrapper.findAll('.records-tabs button').find(button => button.text() === '记录')!.trigger('click')
    await wrapper.get('[aria-label="查看同步记录R1"]').trigger('click')
    expect(wrapper.get('[data-testid="dingtalk-sync-detail"]').findAll('th').map(cell => cell.text())).toEqual([
      '来源文档', '源更新时间', '同步状态', '失败原因',
    ])

    const ordinary = createPanel({ canManage: false, records: [], executionRecords: [baseTask] })
    await ordinary.findAll('.records-tabs button').find(button => button.text() === '记录')!.trigger('click')
    await ordinary.get('[aria-label="查看同步记录R1"]').trigger('click')
    expect(ordinary.get('[data-testid="dingtalk-sync-detail"]').findAll('th').map(cell => cell.text())).toEqual([
      '来源文档', '源更新时间', '同步状态', '失败原因',
    ])
  })

  it('does not invent an execution for a pending registration', async () => {
    const wrapper = createPanel({ records: [{ ...baseTask, recordId: undefined, executedAt: undefined, status: '待执行' }] })
    await wrapper.findAll('.records-tabs button').find(button => button.text() === '记录')!.trigger('click')
    expect(wrapper.findAll('[data-testid="dingtalk-sync-record"]')).toHaveLength(0)
  })
})
