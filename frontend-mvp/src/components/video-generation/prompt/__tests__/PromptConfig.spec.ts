import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PromptConfig from '../PromptConfig.vue'
import { saveVideoTask } from '@/composables/useVideoPrototype'

async function addFiles(wrapper: ReturnType<typeof mount>, files: File[]) {
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', { configurable: true, value: files })
  await input.trigger('change')
  await flushPromises()
  await new Promise((resolve) => setTimeout(resolve, 20))
  await flushPromises()
}

describe('PromptConfig', () => {
  beforeEach(() => localStorage.clear())

  it('requires a nonempty creative requirement and keeps the unavailable template disabled', async () => {
    const wrapper = mount(PromptConfig)
    expect(wrapper.get('[data-testid="template-card-spoken"]').attributes()).toHaveProperty(
      'disabled',
    )
    expect(wrapper.get('[data-testid="promptgen-submit"]').attributes()).toHaveProperty('disabled')
    await wrapper.get('[data-testid="requirement-input"]').setValue('   ')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    await wrapper
      .get('[data-testid="requirement-input"]')
      .setValue('  雪地中的红色羽绒服，镜头缓慢推进  ')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      templateId: 'video-prompt-from-requirements',
      parameters: { locale: 'zh-CN', requirements: '雪地中的红色羽绒服，镜头缓慢推进' },
      references: [],
      convertedFrom: null,
    })
  })

  it('restores an editable task and submits renamed reference images', async () => {
    const wrapper = mount(PromptConfig, {
      props: {
        initialData: {
          parameters: { requirements: '沿海城市慢跑' },
          references: [{ name: 'sc_coast', uri: 'data:image/png;base64,YQ==' }],
          convertedFrom: { reverseTaskId: 'reverse-one', segmentId: 'one' },
        },
      },
    })
    expect(
      (wrapper.get('[data-testid="requirement-input"]').element as HTMLTextAreaElement).value,
    ).toBe('沿海城市慢跑')
    await wrapper.get('input[aria-label="参考图名称 1"]').setValue('sc_beach')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      references: [{ name: 'sc_beach', type: 'image', referenceId: 'ref-1', position: 1 }],
      convertedFrom: { reverseTaskId: 'reverse-one', segmentId: 'one' },
    })
  })

  it('rejects unsupported and oversized references and lets an accepted image be removed', async () => {
    const wrapper = mount(PromptConfig)
    const huge = new File(['x'], 'huge.png', { type: 'image/png' })
    Object.defineProperty(huge, 'size', { value: 10 * 1024 * 1024 + 1 })
    await addFiles(wrapper, [new File(['x'], 'brief.pdf'), huge])
    expect(wrapper.findAll('[data-testid="reference-row"]')).toHaveLength(0)
    expect(wrapper.get('[role="alert"]').text()).toContain('10MB')
    await addFiles(wrapper, [new File(['image'], 'sc_snow.png', { type: 'image/png' })])
    expect(wrapper.findAll('[data-testid="reference-row"]')).toHaveLength(1)
    expect(wrapper.get('img').attributes('src')).toMatch(/^data:image\/png/)
    await wrapper.get('button[aria-label="移除参考图 1"]').trigger('click')
    expect(wrapper.findAll('[data-testid="reference-row"]')).toHaveLength(0)
  })

  it('caps references at nine and inserts an image mention at the current caret', async () => {
    const wrapper = mount(PromptConfig, {
      props: {
        initialData: {
          references: Array.from({ length: 9 }, (_, i) => ({
            name: `sc_${i + 1}`,
            uri: 'data:image/png;base64,YQ==',
          })),
        },
      },
    })
    await addFiles(wrapper, [new File(['x'], 'overflow.png', { type: 'image/png' })])
    expect(wrapper.findAll('[data-testid="reference-row"]')).toHaveLength(9)
    const textarea = wrapper.get('[data-testid="requirement-input"]')
    await textarea.setValue('使用@sc_1 展示')
    ;(textarea.element as HTMLTextAreaElement).setSelectionRange(7, 7)
    await textarea.trigger('input')
    await wrapper.get('[data-testid="mention-item"]').trigger('click')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('使用@sc_1  展示')
  })

  it('imports prompts only from completed reverse tasks and can submit the imported requirement', async () => {
    saveVideoTask({
      id: 'reverse-done',
      name: '羽绒服逆向',
      operator: 'prompt-reverse',
      status: 'completed',
      createdAt: '2026-10-21',
      input: {
        results: [
          {
            segmentId: 'segment-one',
            prompt: '原型演示：@sc_snow 雪地运镜',
            references: [{ name: 'sc_snow', uri: 'data:image/png;base64,YQ==' }],
          },
        ],
      },
    })
    saveVideoTask({
      id: 'reverse-draft',
      name: '尚未完成的逆向',
      operator: 'prompt-reverse',
      status: 'draft',
      createdAt: '2026-10-21',
      input: {},
    })
    saveVideoTask({
      id: 'storyboard-done',
      name: '已完成分镜',
      operator: 'storyboard',
      status: 'completed',
      createdAt: '2026-10-21',
      input: {},
    })
    const wrapper = mount(PromptConfig)
    await wrapper.get('[data-testid="import-reverse-btn"]').trigger('click')
    expect(wrapper.findAll('[data-testid="import-reverse-item"]')).toHaveLength(1)
    await wrapper.get('[data-testid="import-reverse-item"]').trigger('click')
    expect(wrapper.get('[data-testid="imported-prompt"]').text()).toContain('羽绒服逆向')
    expect(wrapper.get('[data-testid="imported-prompt"]').text()).toContain('@sc_snow 雪地运镜')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      parameters: { requirements: '原型演示：@sc_snow 雪地运镜' },
      convertedFrom: { reverseTaskId: 'reverse-done', segmentId: 'segment-one' },
    })
  })

  it('blocks blank or duplicate reference names before emitting a task', async () => {
    const wrapper = mount(PromptConfig, {
      props: {
        initialData: {
          parameters: { requirements: '拍摄商品' },
          references: [
            { name: 'coat', uri: 'data:image/png;base64,YQ==' },
            { name: 'cloth', uri: 'data:image/png;base64,YQ==' },
          ],
        },
      },
    })
    await wrapper.get('input[aria-label="参考图名称 1"]').setValue(' ')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.get('[role="alert"]').text()).toContain('参考图名称')
    await wrapper.get('input[aria-label="参考图名称 1"]').setValue('cloth')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.get('[role="alert"]').text()).toContain('重复')
  })
})
