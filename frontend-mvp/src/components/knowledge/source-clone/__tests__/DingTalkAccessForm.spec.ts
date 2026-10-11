import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import DingTalkAccessForm from '../DingTalkAccessForm.vue'

describe('DingTalk access prototype', () => {
  it('validates configuration, preserves selection on back, and completes a demo import', async () => {
    vi.useFakeTimers()
    const wrapper = mount(DingTalkAccessForm, {
      props: { destinations: [{ id: 'kb', name: '测试知识库' }] },
      global: { stubs: { ElDialog: { template: '<div><slot/><slot name="footer"/></div>' } } },
    })
    const click = async (text: string) => {
      await wrapper
        .findAll('button')
        .find((button) => button.text() === text)!
        .trigger('click')
      await flushPromises()
    }
    await click('测试连接并继续')
    expect(wrapper.text()).toContain('连接名称、App Key、App Secret')
    await click('填入示例')
    await click('测试连接')
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    expect(wrapper.text()).toContain('连接成功')
    await click('下一步')
    await click('下一步')
    expect(wrapper.text()).toContain('请至少选择一篇文档')
    await wrapper.findAll('input[type="checkbox"]')[0]!.setValue(true)
    await flushPromises()
    expect(wrapper.text()).toContain('已选 3 篇')
    await click('下一步')
    await click('创建数据源并同步 3 篇')
    expect(wrapper.text()).toContain('请选择或新建目标知识库')
    wrapper.findComponent({ name: 'ElSelect' }).vm.$emit('update:modelValue', 'kb')
    await flushPromises()
    await click('上一步')
    expect(wrapper.text()).toContain('已选 3 篇')
    await click('下一步')
    await click('创建数据源并同步 3 篇')
    expect(wrapper.emitted('complete')?.[0]).toEqual([
      {
        name: '钉钉 · 集团制度知识库',
        destination: '测试知识库',
        count: 3,
        folder: '钉钉制度文档',
        source: '集团制度知识库 / 已选 3 篇',
        sourceId: 'policies',
        selectedKeys: ['policies'],
        schedule: '每天 00:00',
      },
    ])
    wrapper.unmount()
    vi.useRealTimers()
  })
  it('invalidates a pending credential check after editing credentials', async () => {
    vi.useFakeTimers()
    const wrapper = mount(DingTalkAccessForm, {
      props: { destinations: [] },
      global: { stubs: { ElDialog: { template: '<div><slot/><slot name="footer"/></div>' } } },
    })
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '填入示例')!
      .trigger('click')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '测试连接并继续')!
      .trigger('click')
    await wrapper.get('input[aria-label="App Key"]').setValue('changed-key')
    await vi.advanceTimersByTimeAsync(500)
    expect(wrapper.text()).not.toContain('模拟连接成功')
    expect(wrapper.text()).toContain('连接钉钉企业内部应用')
    wrapper.unmount()
    vi.useRealTimers()
  })
})
