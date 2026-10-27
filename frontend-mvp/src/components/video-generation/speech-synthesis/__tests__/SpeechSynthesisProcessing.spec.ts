import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SpeechSynthesisProcessing from '../SpeechSynthesisProcessing.vue'

describe('speech synthesis processing', () => {
  afterEach(() => { vi.useRealTimers() })

  it('shows only the loading state and completes after three seconds', async () => {
    vi.useFakeTimers()
    const wrapper = mount(SpeechSynthesisProcessing)
    expect(wrapper.text()).toBe('语音合成中')
    expect(wrapper.emitted('complete')).toBeUndefined()
    await vi.advanceTimersByTimeAsync(2999)
    expect(wrapper.emitted('complete')).toBeUndefined()
    await vi.advanceTimersByTimeAsync(1)
    expect(wrapper.emitted('complete')).toHaveLength(1)
    wrapper.unmount()
  })
})
