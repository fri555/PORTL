import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ElDialog } from 'element-plus'
import AgentSquare from '@/views/AgentSquareView.vue'
import { expertAgents } from '@/utils/expertPrototypeStore'
import { homeDraft } from '@/composables/useHomeDraft'

const originals = JSON.parse(JSON.stringify(expertAgents))
const wrappers: ReturnType<typeof mount>[] = []
const dialogStub = { props: ['modelValue'], template: '<section v-if="modelValue" role="dialog"><slot /></section>' }
beforeEach(() => {
  localStorage.clear()
  homeDraft.value = ''
  expertAgents.splice(0, expertAgents.length, ...JSON.parse(JSON.stringify(originals)))
})
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); expertAgents.splice(0, expertAgents.length, ...JSON.parse(JSON.stringify(originals))) })
async function centre() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: AgentSquare }, { path: '/chat', component: { template: '<div>聊天</div>' } }] })
  await router.push('/'); await router.isReady()
  const wrapper = mount(AgentSquare, { global: { plugins: [router], stubs: { ElDialog: dialogStub } } })
  wrappers.push(wrapper); await flushPromises()
  return { wrapper, router }
}
// 收藏功能已移除，相关测试延至v2
// describe('expert centre full-card actions', () => {
//   it('collects from the primary action without opening detail or navigating, then exposes dialogue', async () => {
//     const { wrapper, router } = await centre()
//     const card = wrapper.get('.agent-card')
//     expect(card.get('[data-testid="expert-primary-action"]').text()).toBe('收藏')
//     await card.get('[data-testid="expert-primary-action"]').trigger('click'); await flushPromises()
//     expect(card.get('[data-testid="expert-primary-action"]').text()).toBe('对话')
//     expect(wrapper.find('.expert-modal').exists()).toBe(false)
//     expect(router.currentRoute.value.path).toBe('/')
//   })
//   it('starts a collected expert dialogue while preserving the existing unsent draft', async () => {
//     localStorage.setItem(favoritesStorageKey('prototype'), JSON.stringify({ initialized: true, ids: ['biz-01'] }))
//     homeDraft.value = '保留已有问题'
//     const { wrapper, router } = await centre()
//     await wrapper.get('.agent-card [data-testid="expert-primary-action"]').trigger('click'); await flushPromises()
//     expect(router.currentRoute.value.path).toBe('/chat')
//     expect(router.currentRoute.value.query).toMatchObject({ mode: 'expert', agent: 'biz-01' })
//     expect(homeDraft.value).toBe('保留已有问题')
//   })
//   it('keeps the upper-right heart independent and changes the primary action after cancellation', async () => {
//     localStorage.setItem(favoritesStorageKey('prototype'), JSON.stringify({ initialized: true, ids: ['biz-01'] }))
//     const { wrapper, router } = await centre()
//     const card = wrapper.get('.agent-card')
//     await card.get('.heart').trigger('click'); await flushPromises()
//     expect(card.get('[data-testid="expert-primary-action"]').text()).toBe('收藏')
//     expect(card.get('.heart').attributes('aria-pressed')).toBe('false')
//     expect(wrapper.find('.expert-modal').exists()).toBe(false)
//     expect(router.currentRoute.value.path).toBe('/')
//   })
  it('opens structured details in a centered dialog and keeps the action footer separate from the scrolling body', async () => {
    const { wrapper } = await centre()
    await wrapper.get('.agent-card').trigger('click'); await flushPromises()
    expect(wrapper.findComponent(ElDialog).exists()).toBe(true)
    expect(wrapper.get('.modal-body').text()).toContain('能力范围')
    expect(wrapper.get('.modal-body').text()).toContain('使用约束')
    expect(wrapper.get('.modal-footer').element.parentElement).toBe(wrapper.get('.modal-body').element.parentElement)
    expect(wrapper.get('.modal-body').find('.modal-footer').exists()).toBe(false)
  })
//   it('retains a migrated unavailable expert but blocks dialogue and still permits unfavoriting', async () => {
//     expertAgents[0]!.status = 'maintenance'
//     localStorage.setItem(favoritesStorageKey('prototype'), JSON.stringify({ initialized: true, ids: ['biz-01'] }))
//     const { wrapper } = await centre()
//     const card = wrapper.get('.agent-card')
//     expect(card.get('[data-testid="expert-primary-action"]').attributes('disabled')).toBeDefined()
//     await card.get('.heart').trigger('click'); await flushPromises()
//     expect(card.get('.heart').attributes('aria-pressed')).toBe('false')
//   })
// })
