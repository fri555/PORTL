import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PromptResult from '../PromptResult.vue'
import type { VideoTask } from '@/types/video-generation'

function task(input: Record<string, any> = {}): VideoTask {
  return {
    id: 'prompt-one',
    name: '雪地羽绒服',
    operator: 'prompt-generate',
    status: 'completed',
    createdAt: '2026-10-21T08:00:00.000Z',
    input: { parameters: { requirements: '雪地中的红色羽绒服，镜头缓慢推进' }, ...input },
  }
}

describe('PromptResult', () => {
  it('derives the prototype result from the submitted requirement', () => {
    const wrapper = mount(PromptResult, { props: { task: task() } })
    expect(wrapper.text()).toContain('原型演示')
    expect(
      (wrapper.get('[data-testid="prompt-textarea"]').element as HTMLTextAreaElement).value,
    ).toContain('雪地中的红色羽绒服，镜头缓慢推进')
  })

  it('saves manual edits without dropping the original configuration', async () => {
    const wrapper = mount(PromptResult, {
      props: {
        task: task({ references: [{ name: 'sc_snow', uri: 'data:image/png;base64,YQ==' }] }),
      },
    })
    await wrapper.get('[data-testid="prompt-textarea"]').setValue('近景展示羽绒服纹理')
    await wrapper.get('[data-testid="save-version-btn"]').trigger('click')
    expect(wrapper.emitted('update-input')?.[0]?.[0]).toMatchObject({
      parameters: { requirements: '雪地中的红色羽绒服，镜头缓慢推进' },
      references: [{ name: 'sc_snow' }],
      prompt: '近景展示羽绒服纹理',
      promptVersions: [{ source: 'edit', prompt: '近景展示羽绒服纹理' }],
    })
  })

  it('previews an optimization and changes the active prompt only after adoption', async () => {
    const wrapper = mount(PromptResult, { props: { task: task({ prompt: '商品镜头' }) } })
    await wrapper.get('[data-testid="optimize-btn"]').trigger('click')
    expect(wrapper.get('[data-testid="optimize-generate"]').attributes()).toHaveProperty('disabled')
    await wrapper.get('[data-testid="optimize-requirement"]').setValue('增加面料特写')
    await wrapper.get('[data-testid="optimize-generate"]').trigger('click')
    expect(
      (wrapper.get('[data-testid="optimize-result"]').element as HTMLTextAreaElement).value,
    ).toContain('增加面料特写')
    expect(
      (wrapper.get('[data-testid="prompt-textarea"]').element as HTMLTextAreaElement).value,
    ).toBe('商品镜头')
    await wrapper.get('[data-testid="optimize-adopt"]').trigger('click')
    expect(
      (wrapper.get('[data-testid="prompt-textarea"]').element as HTMLTextAreaElement).value,
    ).toContain('增加面料特写')
    expect(wrapper.emitted('update-input')?.[0]?.[0]).toMatchObject({
      promptVersions: [{ source: 'optimize', optimizeDescription: '增加面料特写' }],
    })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('retains the editable text and exposes manual copying when clipboard is unavailable', async () => {
    const wrapper = mount(PromptResult, { props: { task: task({ prompt: '可手动复制的内容' }) } })
    await wrapper.get('[data-testid="copy-prompt-btn"]').trigger('click')
    expect(wrapper.get('[role="status"]').text()).toContain('手动复制')
    expect(
      (wrapper.get('[data-testid="prompt-textarea"]').element as HTMLTextAreaElement).value,
    ).toBe('可手动复制的内容')
  })
})
