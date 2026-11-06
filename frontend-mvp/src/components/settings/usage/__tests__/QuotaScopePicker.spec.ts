import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import QuotaScopePicker from '../QuotaScopePicker.vue'

let wrapper: VueWrapper<InstanceType<typeof QuotaScopePicker>>
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = '' })
async function open() {
  wrapper = mount(QuotaScopePicker, { props: { modelValue: [{ id: 'user-qinghui', kind: 'person', name: '李清（清晖）' }] }, attachTo: document.body, global: { stubs: { Teleport: true } } })
  await flushPromises()
}
describe('quota scope picker', () => {
  it('isolates scope edits, validates empty selections and confirms canonical person and department IDs', async () => {
    await open()
    await wrapper.get('[role="tab"][data-kind="person"]').trigger('click')
    await wrapper.get('input[value="person:user-qinghui"]').setValue(false)
    await wrapper.get('button[type="submit"]').trigger('submit')
    expect(wrapper.get('[role="alert"]').text()).toBe('请至少选择一个人员或部门')
    expect(wrapper.emitted('confirm')).toBeUndefined()
    await wrapper.get('input[aria-label="搜索人员或部门"]').setValue('人力资源中心')
    await wrapper.get('[role="tab"][data-kind="department"]').trigger('click')
    await wrapper.get('input[value="department:dept-137304912"]').setValue(true)
    await wrapper.get('[role="tab"][data-kind="person"]').trigger('click')
    await wrapper.get('input[value="person:user-bailu"]').setValue(true)
    await wrapper.get('button[type="submit"]').trigger('submit')
    expect(wrapper.emitted('confirm')?.[0]?.[0]).toEqual([
      { id: 'dept-137304912', kind: 'department', name: '人力资源中心' },
      { id: 'user-bailu', kind: 'person', name: '王蕾（白露）' },
    ])
    expect(wrapper.props('modelValue')).toHaveLength(1)
  })
  it('cancels local changes without confirming them', async () => {
    await open()
    await wrapper.get('[role="tab"][data-kind="person"]').trigger('click')
    await wrapper.get('input[value="person:user-qinghui"]').setValue(false)
    await wrapper.get('button[aria-label="取消范围选择"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('closes with Escape without confirming a changed scope', async () => {
    await open()
    await wrapper.get('[role="tab"][data-kind="person"]').trigger('click')
    await wrapper.get('input[value="person:user-qinghui"]').setValue(false)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('recognizes selections across tabs and removes a selected chip without changing input props', async () => {
    await open()
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toBe('部门')
    expect(wrapper.get('[aria-label="已选范围"]').text()).toContain('已选：1个')
    expect(wrapper.get('[aria-label="已选范围"]').text()).toContain('李清（清晖）')
    await wrapper.get('[role="tab"][data-kind="department"]').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toBe('人员')
    expect(wrapper.find('input[value="person:user-qinghui"]').exists()).toBe(true)
    expect(wrapper.find('input[value="department:dept-1"]').exists()).toBe(false)
    await wrapper.get('button[aria-label="移除范围李清（清晖）"]').trigger('click')
    expect((wrapper.get('input[value="person:user-qinghui"]').element as HTMLInputElement).checked).toBe(false)
    expect(wrapper.get('[aria-label="已选范围"]').text()).not.toContain('李清（清晖）')
    expect(wrapper.props('modelValue')).toHaveLength(1)
  })

  it('uses the existing two-column member picker layout', async () => {
    await open()
    expect(wrapper.find('[data-testid="scope-picker-left"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="scope-picker-selected"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="scope-picker-selected"]').text()).toContain('已选：1个')
  })
})
