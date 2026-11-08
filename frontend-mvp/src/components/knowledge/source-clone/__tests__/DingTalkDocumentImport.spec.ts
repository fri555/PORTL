import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DingTalkDocumentImport from '../DingTalkDocumentImport.vue'
import * as prototype from '../dingtalkPrototype'

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => { wrappers.forEach(wrapper => wrapper.unmount()); wrappers.length = 0; vi.restoreAllMocks(); vi.useRealTimers() })
function open(document: Record<string, unknown>, extraProps: Record<string, unknown> = {}) {
  vi.spyOn(prototype, 'personalDingTalkDocuments').mockReturnValue([document] as unknown as prototype.ImportableDocument[])
  const wrapper = mount(DingTalkDocumentImport, {
    props: { identity: { platformUserId: 'u_001', displayName: '朝暮', dingUserId: 'ding-demo-chaomu', status: 'bound' }, destinations: [{ id: 'kb-public-1', name: '制度库', space: 'public' }], defaultDestinationId: 'kb-public-1', ...extraProps },
    global: { stubs: { Teleport: true, ElDialog: { props: ['title', 'modelValue'], template: '<section v-if="modelValue !== false" role="dialog" :aria-label="title"><h2>{{ title }}</h2><slot/><slot name="footer"/></section>' } } },
  })
  wrappers.push(wrapper)
  return wrapper
}
const doc = { id: 'onboarding', name: '新员工入职指南', format: 'DOCX', updatedAt: '2026-10-08 09:30', exportable: true, sourceRole: 'DOWNLOADER' }
const click = async (wrapper: ReturnType<typeof mount>, label: string) => {
  const button = wrapper.findAll('button').find(item => item.text().trim() === label)
  expect(button, `button ${label}`).toBeDefined()
  await button!.trigger('click')
  await flushPromises()
}
const openPicker = async (wrapper: ReturnType<typeof mount>) => {
  await wrapper.get('[data-testid="choose-dingtalk-documents"]').trigger('click')
  await flushPromises()
}
const confirmPicker = async (wrapper: ReturnType<typeof mount>) => {
  await wrapper.get('[data-testid="confirm-document-picker"]').trigger('click')
  await flushPromises()
}
const submitImport = async (wrapper: ReturnType<typeof mount>) => {
  await wrapper.get('[data-testid="submit-import"]').trigger('click')
  await flushPromises()
}
async function choose(wrapper: ReturnType<typeof mount>) {
  await openPicker(wrapper)
  await wrapper.get('[aria-label="进入知识库"]').trigger('click')
  await wrapper.get('[aria-label="选择集团制度知识库"]').setValue(true)
  await confirmPicker(wrapper)
}

describe('DingTalk document import and task editing', () => {
  it('keeps the existing daily, weekly and monthly scheduling fields', async () => {
    vi.useFakeTimers()
    const wrapper = open({ ...doc, initialPermissions: { complete: true, grants: [] } })
    expect(wrapper.find('[aria-label="同步频率"]').exists()).toBe(true)
    expect(wrapper.get('[aria-label="同步频率"]').text()).toContain('每天')
    expect(wrapper.get('[aria-label="同步频率"]').text()).toContain('每周')
    expect(wrapper.get('[aria-label="同步频率"]').text()).toContain('每月')
    await choose(wrapper)
    await submitImport(wrapper)
    await click(wrapper, '确认')
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    expect(wrapper.emitted('complete')?.[0]?.[0]).toMatchObject({ destinationId: 'kb-public-1', platformUserId: 'u_001', documents: [expect.objectContaining({ id: 'onboarding' })], frequency: '每天', schedule: '00:00' })
  })

  it('shows knowledge base and my documents before the document tree', async () => {
    const wrapper = open({ ...doc, initialPermissions: { complete: true, grants: [] } })
    await openPicker(wrapper)
    expect(wrapper.get('[aria-label="钉钉文档来源"]').text()).toContain('知识库')
    expect(wrapper.get('[aria-label="钉钉文档来源"]').text()).toContain('我的文档')
    expect(wrapper.find('[aria-label="钉钉文档目录"]').exists()).toBe(false)
  })

  it('prefills and returns a historical task when editing', async () => {
    vi.useFakeTimers()
    const initialTask = { importTaskId: 'task-old', platformUserId: 'u_001', userAlias: '朝暮', destinationId: 'kb-public-1', destinationPath: '制度库', frequency: '每月', schedule: '15日 10:30', latestSyncAt: '2026-11-05 10:30', status: '同步成功', documentMappings: [{ sourceDocumentId: 'onboarding', sourceName: '知识库 / 新员工入职指南', localFileId: 'file-1', status: '成功' }] }
    const wrapper = open({ ...doc, initialPermissions: { complete: true, grants: [] } }, { initialTask })
    expect(wrapper.text()).toContain('编辑任务')
    expect((wrapper.get('[aria-label="同步频率"]').element as HTMLSelectElement).value).toBe('每月')
    expect(wrapper.text()).toContain('新员工入职指南')
    await submitImport(wrapper)
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    expect(wrapper.emitted('complete')?.[0]?.[0]).toMatchObject({ importTaskId: 'task-old', frequency: '每月', schedule: '15日 10:30' })
  })

  it('excludes source documents with preview-only permission', async () => {
    const wrapper = open({ ...doc, sourceRole: 'READER' })
    await openPicker(wrapper)
    await wrapper.get('[aria-label="进入知识库"]').trigger('click')
    expect(wrapper.find('[aria-label="选择集团制度知识库"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('暂无可导入文档')
  })

  it('fails without publishing when initial permission members cannot be fully resolved', async () => {
    vi.useFakeTimers()
    const wrapper = open({ ...doc, initialPermissions: { complete: false, grants: [] } })
    await choose(wrapper)
    await submitImport(wrapper)
    await click(wrapper, '确认')
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    expect(wrapper.emitted('complete')).toBeUndefined()
    expect(wrapper.text()).toContain('权限成员未完整获取')
  })
})
