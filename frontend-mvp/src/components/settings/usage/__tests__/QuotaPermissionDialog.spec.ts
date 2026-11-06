import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import QuotaPermissionDialog from '../QuotaPermissionDialog.vue'
import { useSettingsQuotaStore } from '@/stores/settings-quota'

const wrappers: VueWrapper[] = []
beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()) })
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); document.body.innerHTML = '' })
async function open(actorId = 'u_001') {
  const wrapper = mount(QuotaPermissionDialog, { props: { actorId }, attachTo: document.body, global: { stubs: { Teleport: true } } })
  wrappers.push(wrapper); await flushPromises(); return wrapper
}
async function click(wrapper: VueWrapper, text: string) {
  const button = wrapper.findAll('button').find(item => item.text() === text)
  expect(button, `button ${text}`).toBeDefined(); await button!.trigger('click'); await flushPromises()
}
async function clickWithin(wrapper: VueWrapper, dialogLabel: string, text: string) {
  const dialog = wrapper.get(`[role="dialog"][aria-label="${dialogLabel}"]`)
  const button = dialog.findAll('button').find(item => item.text() === text)
  expect(button, `button ${text} in ${dialogLabel}`).toBeDefined(); await button!.trigger('click'); await flushPromises()
}

describe('quota administrator permission drafts', () => {
  it('shows only granted administrators with name and row actions', async () => {
    const wrapper = await open()
    expect(wrapper.find('[role="dialog"][aria-label="权限设置"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('全部成员')
    expect(wrapper.text()).not.toContain('系统管理员')
    expect(wrapper.findAll('[data-system-administrator]')).toHaveLength(0)
    const row = wrapper.get('[data-administrator-id="manager-zhang"]')
    expect(row.text()).toContain('张婷（AIBP）')
    expect(row.text()).toContain('设置范围')
    expect(row.text()).toContain('移除')
    expect(row.text()).not.toContain('数字技术中心')
    expect(row.text()).not.toContain('全部人员')
    await wrapper.get('[data-administrator-id="manager-zhang"] button[aria-label="移除张婷（AIBP）"]').trigger('click')
    expect(useSettingsQuotaStore().visibleMembers('manager-zhang')).toHaveLength(5)
    await click(wrapper, '取消')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(useSettingsQuotaStore().grants).toHaveLength(2)
  })

  it('adds member identities without duplicates and requires a scope before saving', async () => {
    const wrapper = await open()
    await click(wrapper, '添加成员')
    expect(wrapper.get('[role="dialog"][aria-label="添加成员"]').text()).toContain('已选：0个')
    await wrapper.get('[role="tablist"][aria-label="成员类型"] [role="tab"]:last-child').trigger('click')
    await wrapper.get('input[aria-label="搜索成员"]').setValue('朝暮')
    await wrapper.get('input[value="user-chaomu"]').setValue(true)
    await click(wrapper, '确定')
    expect(wrapper.find('[data-administrator-id="user-chaomu"]').exists()).toBe(true)
    await click(wrapper, '保存')
    expect(wrapper.get('[role="alert"]').text()).toContain('请为赵伟朝（朝暮）设置管理范围')
    expect(useSettingsQuotaStore().grants).toHaveLength(2)
    await click(wrapper, '添加成员')
    await wrapper.get('[role="tablist"][aria-label="成员类型"] [role="tab"]:last-child').trigger('click')
    await wrapper.get('input[aria-label="搜索成员"]').setValue('朝暮')
    expect(wrapper.text()).toContain('无匹配人员')
    await clickWithin(wrapper, '添加成员', '取消')
    await wrapper.get('[data-administrator-id="user-chaomu"] button[aria-label="设置赵伟朝（朝暮）的管理范围"]').trigger('click')
    await flushPromises()
    await wrapper.get('input[aria-label="搜索人员或部门"]').setValue('数字技术中心')
    await wrapper.get('input[type="checkbox"][value="department:dept-137517219"]').setValue(true)
    await clickWithin(wrapper, '设置范围', '确定')
    expect(useSettingsQuotaStore().grants).toHaveLength(2)
    await click(wrapper, '保存')
    expect(useSettingsQuotaStore().visibleMembers('user-chaomu')).toHaveLength(5)
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })

  it('only revokes a removed administrator after main save', async () => {
    const wrapper = await open()
    await wrapper.get('[data-administrator-id="manager-zhou"] button[aria-label="移除周悦（AIBP）"]').trigger('click')
    expect(useSettingsQuotaStore().visibleMembers('manager-zhou')).toHaveLength(2)
    await click(wrapper, '保存')
    expect(useSettingsQuotaStore().visibleMembers('manager-zhou')).toEqual([])
  })

  it('discards a confirmed scope edit when the main dialog is cancelled', async () => {
    const wrapper = await open()
    await wrapper.get('[data-administrator-id="manager-zhou"] button[aria-label="设置周悦（AIBP）的管理范围"]').trigger('click')
    await flushPromises()
    await wrapper.get('[role="tab"][data-kind="person"]').trigger('click')
    await wrapper.get('input[value="person:user-qinghui"]').setValue(false)
    await wrapper.get('input[value="person:user-bailu"]').setValue(false)
    await wrapper.get('input[aria-label="搜索人员或部门"]').setValue('朝暮')
    await wrapper.get('input[value="person:user-chaomu"]').setValue(true)
    await click(wrapper, '确定')
    await click(wrapper, '取消')
    expect(useSettingsQuotaStore().visibleMembers('manager-zhou').map(member => member.id)).toEqual(['user-qinghui', 'user-bailu'])
  })

  it('keeps a rejected save open and exposes the store error', async () => {
    const wrapper = await open('manager-zhang')
    await click(wrapper, '保存')
    expect(wrapper.get('[role="alert"]').text()).toContain('请检查管理员与管理范围')
    expect(wrapper.emitted('saved')).toBeUndefined()
  })
})
