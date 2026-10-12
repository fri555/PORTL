import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AgentSquare from '@/views/AgentSquareView.vue'
import { expertAgents } from '@/utils/expertPrototypeStore'
import { isExpertAvailable } from '@/composables/useExpertCatalog'
import { usageContentFromForm, usageFormFromContent, validateUsageForm } from '@/utils/agentUsage'
const original = JSON.parse(JSON.stringify(expertAgents))
const wrappers: ReturnType<typeof mount>[] = []
beforeEach(() => { localStorage.clear(); localStorage.setItem('tianma_ai_user', JSON.stringify({ id: 'prototype', displayName: '测试申请人' })); expertAgents.splice(0, expertAgents.length, ...JSON.parse(JSON.stringify(original))) })
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); expertAgents.splice(0, expertAgents.length, ...JSON.parse(JSON.stringify(original))) })
async function market(query = '') {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: AgentSquare }, { path: '/chat', component: { template: '<div />' } }] })
  await router.push('/' + query); await router.isReady()
  const wrapper = mount(AgentSquare, { global: { plugins: [router], stubs: { SourceChatSidebar: true, ElDialog: { props: ['modelValue'], template: '<section v-if="modelValue"><slot /></section>' } } } })
  wrappers.push(wrapper); await flushPromises(); return { wrapper, router }
}
describe('expert market permission and public metadata', () => {
  it('keeps an unpermitted published expert visible and never applies from hovering', async () => {
    Object.assign(expertAgents[0]!, { usePermission: false, developerId: 'configured-owner-id', developerName: '负责人甲', useDepartments: ['商品部', '门店部'] }); expertAgents[1]!.isPublished = false
    const { wrapper, router } = await market()
    expect(wrapper.get('h1').text()).toBe('专家中心v1（市场）'); expect(wrapper.findAll('.agent-card')).toHaveLength(original.length)
    const card = wrapper.get('.agent-card')
    expect(card.classes()).toContain('no-permission'); expect(card.attributes('title')).toContain('钉钉联系负责人甲'); expect(card.text()).toContain('负责人甲'); expect(card.text()).toContain('商品部')
    expect(card.get('[data-testid="expert-primary-action"]').text()).toBe('申请权限')
    await card.trigger('mouseenter'); expect(wrapper.find('[data-testid="expert-permission-request"]').exists()).toBe(false); expect(router.currentRoute.value.path).toBe('/'); expect(isExpertAvailable(expertAgents[0]!)).toBe(false)
    await card.get('[data-testid="expert-primary-action"]').trigger('click')
    const request = wrapper.get('[data-testid="expert-permission-request"]')
    expect(request.text()).toContain('你好，我希望申请使用「数据分析师」智能体。申请人：测试申请人。请协助开通使用权限，谢谢。'); expect(request.text()).toContain('负责人甲')
    expect(request.text()).toContain('已模拟发送'); expect(router.currentRoute.value.path).toBe('/'); expect(expertAgents[0]!.usePermission).toBe(false)
  })
  it('blocks unpermitted detail chat, hides technical lists, and handles missing owner', async () => {
    expertAgents[1]!.usePermission = false
    const { wrapper, router } = await market(); await wrapper.findAll('.agent-card')[1]!.trigger('click')
    expect(wrapper.get('.modal-body').text()).not.toContain('连接器'); expect(wrapper.find('[data-testid="expert-capability-tools"]').exists()).toBe(false); expect(wrapper.find('[data-testid="expert-capability-skills"]').exists()).toBe(false)
    expect(wrapper.get('.prompt-list button').attributes('disabled')).toBeDefined(); expect(wrapper.get('.modal-footer .primary').text()).toContain('申请权限')
    await wrapper.get('.modal-footer .primary').trigger('click')
    expect(wrapper.get('[data-testid="expert-permission-request"]').text()).toContain('未配置负责人'); expect(wrapper.find('[data-testid="submit-permission-request"]').exists()).toBe(false); expect(wrapper.get('[data-testid="expert-permission-request"]').text()).not.toContain('已模拟发送'); expect(router.currentRoute.value.path).toBe('/')
  })
  it('shows the formally published daily assistant without changing it into a business expert', async () => {
    const { wrapper, router } = await market()
    const card = wrapper.findAll('.agent-card').find(item => item.text().includes('耶虎'))!
    expect(card.exists()).toBe(true); expect(card.get('[data-testid="expert-primary-action"]').text()).toBe('对话')
    await card.get('[data-testid="expert-primary-action"]').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.query.mode).toBe('daily'); expect(router.currentRoute.value.query.agent).toBeUndefined()
  })
  it('does not simulate sending when the current applicant is unknown', async () => {
    localStorage.removeItem('tianma_ai_user'); Object.assign(expertAgents[0]!, { usePermission: false, developerId: 'configured-owner-id', developerName: '负责人甲' })
    const { wrapper } = await market(); await wrapper.get('.agent-card [data-testid="expert-primary-action"]').trigger('click')
    expect(wrapper.get('[data-testid="expert-permission-request"]').text()).toContain('无法识别当前登录用户'); expect(wrapper.get('[data-testid="expert-permission-request"]').text()).not.toContain('已模拟发送')
  })
  it('excludes offline publications while keeping the published daily assistant', async () => {
    expertAgents[2]!.status = 'offline'
    const { wrapper } = await market()
    expect(wrapper.findAll('.agent-card')).toHaveLength(original.length)
    expect(wrapper.findAll('.agent-card').some(card => card.text().includes(expertAgents[2]!.name))).toBe(false)
    expect(wrapper.findAll('.agent-card').some(card => card.text().includes('耶虎'))).toBe(true)
  })
  it('provides an isolated demo without changing supplied agent records', async () => {
    const before = JSON.stringify(expertAgents); const { wrapper } = await market('?permissionDemo=1'); const card = wrapper.findAll('.agent-card')[1]!
    expect(card.classes()).toContain('no-permission'); expect(card.text()).toContain('演示负责人'); expect(JSON.stringify(expertAgents)).toBe(before)
  })
})
describe('unlimited capability labels', () => {
  it('accepts more than eight labels and reads new and legacy descriptions', () => {
    const systems = Array.from({ length: 30 }, (_, i) => '能力标签' + i); const form = { systems, input: '', output: '', limits: '不支持未授权数据' }
    expect(validateUsageForm(form)).toBeNull(); const content = usageContentFromForm(form); expect(content).toContain('能力标签：'); expect(usageFormFromContent(content).systems).toEqual(systems); expect(usageFormFromContent(content.replace('能力标签：', '接入系统：')).systems).toEqual(systems)
  })
})
