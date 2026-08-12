import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ResourcePermissionDialog from '@/components/common/ResourcePermissionDialog.vue'

describe('ResourcePermissionDialog', () => {
  it('keeps changes as a draft, deduplicates members, and saves the full permission list', async () => {
    const wrapper = mount(ResourcePermissionDialog, {
      props: { resourceName: '集团制度', resourceKind: '知识库' },
      global: { stubs: { Teleport: true } },
    })

    expect(wrapper.text()).toContain('权限设置 - 集团制度')
    expect(wrapper.text()).toContain('RAG 检索链路')
    expect(wrapper.find('button[aria-label="移除系统管理员"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="permission-save"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="permission-add-member"]').trigger('click')
    await wrapper.findAll('label').find((label) => label.text().includes('直播事业部'))!.find('input').setValue(true)
    await wrapper.findAll('button').find((button) => button.text() === '人员')!.trigger('click')
    const chen = wrapper.findAll('label').find((label) => label.text().includes('陈晨'))!
    await chen.find('input').setValue(true)
    await wrapper.get('[data-testid="permission-confirm-add"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('直播事业部')
    expect(wrapper.text()).toContain('陈晨')
    expect(wrapper.get('[data-testid="permission-save"]').attributes('disabled')).toBeUndefined()

    await wrapper.get('[data-testid="permission-save"]').trigger('click')
    await flushPromises()
    const saved = wrapper.emitted('save')?.[0]?.[0] as Array<{ id: string; type: string }>
    expect(saved.some((member) => member.id === 'live-business' && member.type === 'department')).toBe(true)
    expect(saved.some((member) => member.id === 'chen-chen' && member.type === 'person')).toBe(true)
    expect(new Set(saved.map((member) => `${member.type}:${member.id}`)).size).toBe(saved.length)
    expect(wrapper.text()).toContain('权限设置已保存并配置生效')
  })

  it('omits the knowledge retrieval message for intelligent agents', () => {
    const wrapper = mount(ResourcePermissionDialog, {
      props: { resourceName: '组货专家', resourceKind: '智能体' },
      global: { stubs: { Teleport: true } },
    })
    expect(wrapper.text()).not.toContain('RAG 检索链路')
  })
})
