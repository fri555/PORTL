import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SpeechSynthesisConfig from '../SpeechSynthesisConfig.vue'

describe('speech configuration validation recovery', () => {
  // Catches an error message that leaves keyboard users at the bottom of the form.
  it('focuses the first invalid field and then the text field after the name is corrected', async () => {
    const wrapper = mount(SpeechSynthesisConfig, { props: { initialName: '   ' }, attachTo: document.body })
    try {
      const name = wrapper.get('input[aria-label="任务名称"]')
      const text = wrapper.get('textarea[aria-label="合成文本"]')
      const submit = wrapper.get('[data-testid="speech-submit"]')
      ;(submit.element as HTMLButtonElement).focus()
      await wrapper.get('form').trigger('submit')
      expect(document.activeElement).toBe(name.element)
      expect(name.attributes('aria-invalid')).toBe('true')
      expect(wrapper.emitted('submit')).toBeUndefined()

      await name.setValue('活动开场配音')
      ;(submit.element as HTMLButtonElement).focus()
      await wrapper.get('form').trigger('submit')
      expect(document.activeElement).toBe(text.element)
      expect(text.attributes('aria-invalid')).toBe('true')
      expect(wrapper.emitted('submit')).toBeUndefined()
    } finally { wrapper.unmount() }
  })
})
