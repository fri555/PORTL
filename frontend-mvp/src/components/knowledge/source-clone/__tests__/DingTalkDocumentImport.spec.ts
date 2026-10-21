import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DingTalkDocumentImport from '../DingTalkDocumentImport.vue'
import * as prototype from '../dingtalkPrototype'

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => { wrappers.forEach(wrapper => wrapper.unmount()); wrappers.length = 0; vi.restoreAllMocks(); vi.useRealTimers() })
function open(document: Record<string, unknown>) {
  vi.spyOn(prototype, 'personalDingTalkDocuments').mockReturnValue([document] as unknown as prototype.ImportableDocument[])
  const wrapper = mount(DingTalkDocumentImport, {
    props: { identity: { platformUserId: 'u_001', displayName: '朝暮', dingUserId: 'ding-demo-chaomu', status: 'bound' }, destinations: [{ id: 'kb-public-1', name: '制度库', space: 'public' }], defaultDestinationId: 'kb-public-1' },
    global: { stubs: { Teleport: true, ElDialog: { template: '<div><slot/><slot name="footer"/></div>' }, ElSelect: { template: '<div><slot/></div>' }, ElOption: true } },
  })
  wrappers.push(wrapper)
  return wrapper
}
const doc = { id: 'onboarding', name: '新员工入职指南', format: 'DOCX', updatedAt: '2026-10-08 09:30', exportable: true, sourceRole: 'DOWNLOADER' }
const click = async (wrapper: ReturnType<typeof mount>, label: string) => {
  await wrapper.findAll('button').find(button => button.text() === label)!.trigger('click')
  await flushPromises()
}
async function choose(wrapper: ReturnType<typeof mount>) {
  await click(wrapper, '选择文件')
  await wrapper.get('[aria-label="选择集团制度知识库"]').setValue(true)
  await click(wrapper, '确认导入 1 项')
}
describe('DingTalk import initial permissions', () => {
  it('requires a weekday when weekly sync is selected and saves it with the execution time', async () => {
    vi.useFakeTimers()
    const wrapper = open({ ...doc, initialPermissions: { complete: true, grants: [] } })
    ;(wrapper.vm as unknown as { frequency: string; weekDay: string }).frequency = '每周'
    ;(wrapper.vm as unknown as { frequency: string; weekDay: string }).weekDay = '周三'
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[aria-label="同步周期"]').exists()).toBe(true)
    await choose(wrapper)
    await click(wrapper, '确认导入')
    await click(wrapper, '确认')
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    expect(wrapper.emitted('complete')?.[0]?.[0]).toMatchObject({ frequency: '每周', schedule: '周三 00:00' })
  })
  it('excludes source documents with preview-only permission', async () => {
    const wrapper = open({ ...doc, sourceRole: 'READER' })
    await click(wrapper, '选择文件')
    expect(wrapper.find('[aria-label="选择集团制度知识库"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('没有匹配的文档')
  })
  it('fails without publishing when initial permission members cannot be fully resolved', async () => {
    vi.useFakeTimers()
    const wrapper = open({ ...doc, initialPermissions: { complete: false, grants: [] } })
    await choose(wrapper)
    await click(wrapper, '确认导入')
    await click(wrapper, '确认')
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    expect(wrapper.emitted('complete')).toBeUndefined()
    expect(wrapper.text()).toContain('权限成员未完整获取')
  })
})
