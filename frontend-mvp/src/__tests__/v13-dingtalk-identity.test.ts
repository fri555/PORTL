import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PersonalImport from '@/components/knowledge/source-clone/DingTalkDocumentImport.vue'
import AccessPanel from '@/components/knowledge/source-clone/KnowledgeAccessPanel.vue'
import { boundDingTalkIdentity, nextScheduledSync, personalDingTalkDocuments, prototypeCanWriteKnowledge } from '@/components/knowledge/source-clone/dingtalkPrototype'
const wrappers: ReturnType<typeof mount>[] = []
const stubs = {
  ElDialog: { props: ['modelValue'], template: '<section v-if="modelValue"><slot/><slot name="footer"/></section>' },
  ElSelect: { props: ['modelValue'], template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot/></select>' },
  ElOption: { props: ['value', 'label'], template: '<option :value="value">{{label}}</option>' },
}
const identity = () => boundDingTalkIdentity({ id: 'u-personal-demo', displayName: '普通用户' })
const destinations = [{ id: 'kb-personal-1', name: '我的客户资料' }]
beforeEach(() => { localStorage.clear(); window.history.replaceState({}, '', '/') })
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.useRealTimers(); window.history.replaceState({}, '', '/') })
function dialog() { const w = mount(PersonalImport, { props: { identity: identity(), destinations }, global: { stubs } }); wrappers.push(w); return w }
async function button(w: ReturnType<typeof mount>, text: string) {
  const target = w.findAll('button').find(item => item.text() === text); expect(target, text).toBeTruthy(); await target!.trigger('click'); await flushPromises()
}
async function selectFirst(w: ReturnType<typeof mount>) {
  await w.get('[aria-label="上传至"]').trigger('click'); await w.get('[aria-label="存放至我的客户资料"]').trigger('click')
  await button(w, '选择文件'); await w.get('input[aria-label="搜索钉钉文档"]').setValue('入职')
  await w.get('input[aria-label="选择新员工入职指南"]').setValue(true); await button(w, '确认导入 1 项')
}
describe('M3 current-user permissions and import boundaries', () => {
  it('lists only source documents readable by the bound user and ignores supplied identity query values', () => {
    window.history.replaceState({}, '', '/?userId=ding-demo-chaomu')
    expect(personalDingTalkDocuments(identity()).map(item => item.id)).toEqual(['onboarding', 'attendance', 'catalog', 'native-table'])
    expect(personalDingTalkDocuments({ ...identity(), dingUserId: 'ding-demo-chaomu' })).toEqual([])
    expect(personalDingTalkDocuments(boundDingTalkIdentity({ id: 'unknown', displayName: '未知用户' }))).toEqual([])
    expect(prototypeCanWriteKnowledge('kb-public-1', 'user')).toBe(false)
  })
  it('keeps identity and credentials out of the ordinary-user import form', async () => {
    const w = dialog(); expect(w.text()).not.toContain('我的钉钉身份')
    expect(w.find('[aria-label="App Key"]').exists()).toBe(false)
    expect(w.find('[aria-label="User ID"]').exists()).toBe(false)
    await button(w, '选择文件'); await w.get('input[aria-label="搜索钉钉文档"]').setValue('报销')
    expect(w.get('[role="tree"]').findAll('[role="treeitem"]')).toHaveLength(0)
  })
  it('marks an unsupported file in the tree and selected panel and requires its removal before importing', async () => {
    const w = dialog(); await selectFirst(w); await button(w, '选择文件')
    await w.get('input[aria-label="搜索钉钉文档"]').setValue('多维表')
    expect(w.get('[role="tree"]').text()).toContain('格式暂不支持')
    await w.get('input[aria-label="选择商品运营多维表"]').setValue(true); await button(w, '确认导入 2 项')
    expect(w.get('[aria-label="已选钉钉文档"]').text()).toContain('暂不支持')
    expect(w.findAll('button').find(item => item.text() === '确认导入')!.attributes('disabled')).toBeDefined()
    await w.get('[aria-label="移除商品运营多维表"]').trigger('click')
    expect(w.findAll('button').find(item => item.text() === '确认导入')!.attributes('disabled')).toBeUndefined()
  })
  it('requires a bound identity and available application connection', async () => {
    const w = dialog(); await w.setProps({ applicationAvailable: false })
    expect(w.findAll('button').find(item => item.text() === '选择文件')!.attributes('disabled')).toBeDefined()
    await w.setProps({ applicationAvailable: true, identity: { ...identity(), status: 'expired' } })
    expect(w.findAll('button').find(item => item.text() === '选择文件')!.attributes('disabled')).toBeDefined()
    expect(w.emitted('complete')).toBeUndefined()
  })
  it('submits one batch with target, current user and synchronization schedule', async () => {
    vi.useFakeTimers(); const w = dialog(); await selectFirst(w)
    await button(w, '确认导入'); await vi.advanceTimersByTimeAsync(500)
    expect(w.emitted('complete')).toHaveLength(1)
    expect(w.emitted('complete')![0]![0]).toMatchObject({ destinationId: 'kb-personal-1', platformUserId: 'u-personal-demo', documents: [{ id: 'onboarding' }], frequency: '每天', schedule: '00:00' })
    expect(w.emitted('close')).toHaveLength(1)
  })
  it('cancels pending import and source selections if the logged identity changes', async () => {
    vi.useFakeTimers(); const w = dialog(); await selectFirst(w); await button(w, '确认导入')
    await w.setProps({ identity: boundDingTalkIdentity({ id: 'u_001', displayName: '朝暮' }) }); await vi.advanceTimersByTimeAsync(500)
    expect(w.emitted('complete')).toBeUndefined()
    expect(w.get('[aria-label="已选钉钉文档"]').findAll('article')).toHaveLength(0)
  })
  it('rechecks write permission and app availability before in-flight import completes', async () => {
    for (const changed of [{ destinations: [] }, { applicationAvailable: false }]) {
      vi.useFakeTimers(); const w = dialog(); await selectFirst(w); await button(w, '确认导入')
      await w.setProps(changed); await vi.advanceTimersByTimeAsync(500)
      expect(w.emitted('complete')).toBeUndefined(); expect(w.text()).toContain('本次未导入')
      vi.useRealTimers()
    }
  })
  it('has no admin-management interface for ordinary users', () => {
    const w = mount(AccessPanel, { props: { destinations, canManage: false } }); wrappers.push(w)
    expect(w.find('[data-testid="knowledge-access-admin"]').exists()).toBe(false)
  })
  it('computes daily schedules in Beijing time and rejects invalid hours', () => {
    const anchor = Date.parse('2026-10-09T02:37:00Z')
    expect(nextScheduledSync('每天 00:00', anchor, anchor)).toBe('2026-10-10 00:00')
    expect(nextScheduledSync('每天 25:00', anchor, anchor)).toBe('—')
  })
})
