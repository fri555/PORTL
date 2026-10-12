import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { expertAgents } from '@/utils/expertPrototypeStore'
import { useAppStore } from '@/stores/app'
import AgentSettings from '@/components/settings/AgentSettingsView.vue'

const original = JSON.parse(JSON.stringify(expertAgents))
const wrappers: ReturnType<typeof mount>[] = []
function login(id = 'user-a') {
  const pinia = createPinia(); setActivePinia(pinia)
  const app = useAppStore()
  app.login({ id, displayName: id, department: '天马', role: 'user', avatarUrl: '' })
  return { pinia, app }
}
beforeEach(() => { localStorage.clear(); expertAgents.splice(0, expertAgents.length, ...JSON.parse(JSON.stringify(original))) })
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); expertAgents.splice(0, expertAgents.length, ...JSON.parse(JSON.stringify(original))); document.body.innerHTML = '' })

// 收藏功能已移除，相关测试延至v2
// describe('expert favorite rollout and limit', () => {
//   it('initializes all visible published experts once, including temporarily unavailable ones', async () => {
//     const { pinia } = login()
//     expertAgents[0]!.status = 'maintenance'; expertAgents[1]!.status = 'offline'
//     const api = catalogue(pinia); await flushPromises()
//     expect(api.favoriteIds.value.has('biz-01')).toBe(true)
//     expect(api.favoriteIds.value.has('biz-02')).toBe(true)
//     const persisted = JSON.parse(localStorage.getItem(key('user-a')) ?? '{}')
//     expect(persisted.initialized).toBe(true)
//   })
//   it('does not include a new publication when a user first visits after the rollout', async () => {
//     const { pinia } = login()
//     expertAgents.push({ ...expertAgents[0]!, id: 'published-after-rollout-before-visit', name: '上线后发布' })
//     const api = catalogue(pinia); await flushPromises()
//     expect(api.favoriteIds.value.has('biz-01')).toBe(true)
//     expect(api.favoriteIds.value.has('published-after-rollout-before-visit')).toBe(false)
//   })
//   it('never restores a removed favorite or auto-adds a later publication', async () => {
//     const { pinia } = login(); const api = catalogue(pinia); await flushPromises()
//     api.toggleFavorite(expertAgents[0]!)
//     expertAgents.push({ ...expertAgents[0]!, id: 'published-later', name: '后发布' })
//     const reloaded = catalogue(pinia); await flushPromises()
//     expect(reloaded.favoriteIds.value.has('biz-01')).toBe(false)
//     expect(reloaded.favoriteIds.value.has('published-later')).toBe(false)
//   })
//   it('preserves an intentionally empty migrated favorite list', async () => {
//     const { pinia } = login()
//     localStorage.setItem(key('user-a'), JSON.stringify({ initialized: true, ids: [] }))
//     const api = catalogue(pinia); await flushPromises()
//     expect(api.favoriteExperts.value).toHaveLength(0)
//   })
//   it('preserves previous favorites when the rollout adds current accessible experts', async () => {
//     const { pinia } = login()
//     localStorage.setItem('tianma.prototype.expert-favorites.v1', JSON.stringify(['legacy-retained']))
//     const api = catalogue(pinia); await flushPromises()
//     expect(api.favoriteIds.value.has('legacy-retained')).toBe(true)
//     expect(api.favoriteIds.value.has('biz-01')).toBe(true)
//   })
//   it('blocks the nineteenth addition but always permits removal and then replacement', async () => {
//     const { pinia } = login()
//     const fixture = Array.from({ length: 20 }, (_, i) => ({ ...expertAgents[0]!, id: 'limit-' + i, name: '限额专家' + i }))
//     expertAgents.splice(0, expertAgents.length, ...fixture)
//     localStorage.setItem(key('user-a'), JSON.stringify({ initialized: true, ids: fixture.slice(0, 17).map(item => item.id) }))
//     const api = catalogue(pinia); await flushPromises()
//     expect(api.toggleFavorite(fixture[17]!)).toBe(true)
//     expect(api.toggleFavorite(fixture[18]!)).toBe(false)
//     expect(api.favoriteIds.value.has('limit-18')).toBe(false)
//     expect(api.toggleFavorite(fixture[0]!)).toBe(true)
//     expect(api.toggleFavorite(fixture[18]!)).toBe(true)
//     expect(api.favoriteIds.value.size).toBe(18)
//   })
//   it('preserves over-limit rollout favorites while preventing new additions', async () => {
//     const { pinia } = login()
//     const fixture = Array.from({ length: 20 }, (_, i) => ({ ...expertAgents[0]!, id: 'rollout-' + i, name: '存量专家' + i }))
//     expertAgents.splice(0, expertAgents.length, ...fixture)
//     localStorage.setItem(key('user-a'), JSON.stringify({ initialized: true, ids: fixture.map(item => item.id) }))
//     const api = catalogue(pinia); await flushPromises()
//     expect(api.favoriteIds.value.size).toBe(20)
//     expertAgents.push({ ...fixture[0]!, id: 'new-after-rollout' })
//     expect(api.toggleFavorite(expertAgents[20]!)).toBe(false)
//     expect(api.toggleFavorite(fixture[0]!)).toBe(true)
//     expect(api.favoriteIds.value.size).toBe(19)
//   })
//   it('isolates favorite changes when the signed-in user changes', async () => {
//     const { pinia, app } = login()
//     const api = catalogue(pinia); await flushPromises()
//     api.toggleFavorite(expertAgents[0]!)
//     app.login({ id: 'user-b', displayName: 'B', department: '天马', role: 'user', avatarUrl: '' }); await flushPromises()
//     expect(api.favoriteIds.value.has('biz-01')).toBe(true)
//     app.login({ id: 'user-a', displayName: 'A', department: '天马', role: 'user', avatarUrl: '' }); await flushPromises()
//     expect(api.favoriteIds.value.has('biz-01')).toBe(false)
//   })
// })

const tagStub = { props: ['modelValue'], emits: ['update:modelValue'], template: "<input />" }
async function settings() {
  const w = mount(AgentSettings, { attachTo: document.body, global: { stubs: { ElInputTag: tagStub, ElSelect: { template: '<select><slot/></select>' }, ElOption: { template: '<option><slot/></option>' } } } })
  wrappers.push(w)
  await w.findAll('button').find(b => b.text() === '创建智能体')!.trigger('click')
  await w.get('input[placeholder="请输入智能体名称"]').setValue('校验专家')
  await w.get('textarea[placeholder="简短描述它的功能..."]').setValue('验证使用说明字段')
  await w.findAll('[role="tab"]').find(b => b.text().includes('使用说明'))!.trigger('click')
  return w
}
describe('publication missing field presentation', () => {
  it('highlights and focuses a missing required field without error copy', async () => {
    login()
    const w = await settings()
    await w.findAll('button').find(b => b.text() === '保存')!.trigger('click'); await flushPromises()
    const field = w.get('[data-testid="usage-field-limits"]')
    expect(field.attributes('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(field.element)
    expect(w.text()).not.toContain('请填写「使用限制」')
    expect(w.find('[role="alert"]').exists()).toBe(false)
    await field.setValue('不支持未授权查询')
    expect(field.attributes('aria-invalid')).not.toBe('true')
  })
  it('still blocks an oversized optional field with a clear length error', async () => {
    login()
    const w = await settings()
    await w.get('[data-testid="usage-field-limits"]').setValue('不支持未授权查询')
    await w.get('[data-testid="usage-field-input"]').setValue('字'.repeat(501))
    await w.findAll('button').find(b => b.text() === '保存')!.trigger('click'); await flushPromises()
    expect(w.get('[data-testid="usage-field-input"]').attributes('aria-invalid')).toBe('true')
    expect(w.get('[role="alert"]').text()).toContain('最多 500')
    await w.get('[data-testid="usage-field-input"]').setValue('提供货号')
    expect(w.find('[role="alert"]').exists()).toBe(false)
  })
})
