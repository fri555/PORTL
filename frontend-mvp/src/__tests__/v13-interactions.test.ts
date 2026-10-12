import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { agents } from '@/mock/agents'
import { expertAgents } from '@/utils/expertPrototypeStore'
import AgentSquare from '@/views/AgentSquareView.vue'
import ChatHome from '@/components/chat/source-clone/SourceChatHome.vue'
import ChatDetail from '@/components/chat/source-clone/SourceChatDetail.vue'
import AccessPanel from '@/components/knowledge/source-clone/KnowledgeAccessPanel.vue'
import { copyTextWithTimeout } from '@/utils/copyText'
import { homeDraft } from '@/composables/useHomeDraft'

const wrappers: ReturnType<typeof mount>[] = []
beforeEach(() => { homeDraft.value = '' })
const dialogStub = {
  props: ['modelValue'],
  template: '<section v-if="modelValue"><slot/><slot name="footer"/></section>',
}
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
function track(wrapper: ReturnType<typeof mount>) {
  wrappers.push(wrapper)
  return wrapper
}
async function click(wrapper: ReturnType<typeof mount>, label: string) {
  const button = wrapper.findAll('button').find((item) => item.text() === label)
  expect(button, label).toBeTruthy()
  await button!.trigger('click')
  await flushPromises()
}

describe('V1.3 approved interaction paths', () => {
  it('carries the selected expert and prompt into the composer without sending', async () => {
    const wrapper = track(
      mount(ChatHome, { props: { initialAgentId: 'biz-04', initialPrompt: '帮我写营销文案' } }),
    )
    expect(wrapper.text()).toContain('营销图文设计师')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('帮我写营销文案')
    expect(wrapper.emitted('send')).toBeUndefined()
    expect(wrapper.emitted('expert-selected')?.[0]).toEqual(['biz-04'])
  })

  it('opens the expert drawer by keyboard and sends the chosen prompt to the composer route', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/agent-square', component: AgentSquare },
        { path: '/chat', component: { template: '<div/>' } },
      ],
    })
    await router.push('/agent-square')
    await router.isReady()
    const wrapper = track(
      mount(AgentSquare, { global: { plugins: [router], stubs: { ElDialog: dialogStub } } }),
    )
    await wrapper.get('.agent-card').trigger('keydown', { key: 'Enter' })
    expect(wrapper.find('.expert-modal').exists()).toBe(true)
    const prompt = agents.find(agent => agent.id === 'biz-01')!.quickCommands[0]!
    await wrapper.get('.prompt-list button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({ mode: 'expert', agent: 'biz-01', prompt })
  })

  it('does not expose unpublished experts in discovery', async () => {
    const unpublished = { ...agents.find(agent => agent.id === 'biz-01')!, id: 'interaction-unpublished', name: '未发布行为测试专家', isPublished: false, reviewStatus: 'draft' as const }
    expertAgents.push(unpublished)
    try {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/', component: AgentSquare }],
      })
      await router.push('/')
      await router.isReady()
      const wrapper = track(
        mount(AgentSquare, { global: { plugins: [router], stubs: { ElDialog: dialogStub } } }),
      )
      expect(wrapper.findAll('.agent-card').length).toBeGreaterThan(0)
      expect(wrapper.findAll('.agent-card').some(card => card.text().includes(unpublished.name))).toBe(false)
      for (const agent of agents.filter((item) => !item.isPublished))
        expect(wrapper.findAll('.agent-card').some((card) => card.text().includes(agent.name))).toBe(
          false,
        )
    } finally {
      const index = expertAgents.findIndex(agent => agent.id === unpublished.id)
      if (index >= 0) expertAgents.splice(index, 1)
    }
  })

  it('keeps default permissions manual when whitespace is typed and cleared', async () => {
    vi.useFakeTimers()
    const wrapper = track(mount(ChatDetail, { props: { sessionId: 'expert-plan', agentId: 'biz-04' } }))
    expect(wrapper.text()).toContain('营销图文设计师')
    await wrapper.get('textarea').setValue(' ')
    await wrapper.get('textarea').setValue('')
    await vi.advanceTimersByTimeAsync(61000)
    expect(wrapper.get('.plan-state').text()).toBe('等待执行')
    expect(wrapper.find('.deliverables').exists()).toBe(false)
    await click(wrapper, '立即执行')
    expect(wrapper.get('.plan-state').text()).toBe('执行中')
  })

  it('starts once after manual confirmation, allows explicit PPT choice, and labels demo outputs', async () => {
    vi.useFakeTimers()
    const wrapper = track(mount(ChatDetail, { props: { sessionId: 'expert-template', initialPrompt: '生成 PPT' } }))
    expect(wrapper.text()).toContain('普通模板')
    await click(wrapper, '使用天马官方模板')
    expect(wrapper.text()).toContain('已选择天马官方模板')
    await vi.advanceTimersByTimeAsync(61000)
    expect(wrapper.get('.plan-state').text()).toBe('等待执行')
    await click(wrapper, '立即执行')
    expect(wrapper.text()).toContain('正在模拟执行')
    expect(wrapper.find('.run-now').exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(1800)
    expect(wrapper.text()).toContain('模拟执行完成')
    expect(wrapper.findAll('.deliverables button').every(button => button.attributes('disabled') !== undefined)).toBe(true)
  })

  it('keeps management edits cancellable and prevents a pending sync from reconnecting after disconnect', async () => {
    vi.useFakeTimers()
    const wrapper = track(
      mount(AccessPanel, {
        props: { destinations: [{ id: 'kb1', name: '集团公共知识库' }] },
        global: { stubs: { ElDialog: dialogStub } },
      }),
    )
    await click(wrapper, '管理')
    await click(wrapper, '修改名称')
    expect(wrapper.text()).not.toContain('后将停止正在进行和后续的同步')
    await wrapper.get('input[aria-label="连接名称"]').setValue('修改后不保存')
    await click(wrapper, '取消')
    expect(wrapper.text()).not.toContain('修改后不保存')
    await click(wrapper, '修改时间')
    await wrapper.get('input[aria-label="同步时间"]').setValue('04:45')
    await click(wrapper, '取消')
    expect(wrapper.text()).not.toContain('每天 04:45')
    await click(wrapper, '修改时间')
    await wrapper.get('input[aria-label="同步时间"]').setValue('04:45')
    await click(wrapper, '保存')
    expect(wrapper.text()).toContain('每天 04:45')
    await wrapper.get('.sync-button').trigger('click')
    await click(wrapper, '断开连接')
    await click(wrapper, '确认断开')
    await vi.advanceTimersByTimeAsync(1500)
    expect(wrapper.get('.health-card').text()).toContain('已断开')
    expect(wrapper.get('.sync-button').attributes('disabled')).toBeDefined()
  })

  it('reaches completion on clipboard success and rejects stalled attempts after three seconds', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await expect(copyTextWithTimeout('https://example.com')).resolves.toBeUndefined()
    let finish!: () => void
    writeText.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    const pending = copyTextWithTimeout('https://example.com')
    const assertion = expect(pending).rejects.toThrow('Copy timeout')
    await vi.advanceTimersByTimeAsync(3000)
    await assertion
    finish()
    await flushPromises()
    expect(writeText).toHaveBeenCalledTimes(2)
  })
})
