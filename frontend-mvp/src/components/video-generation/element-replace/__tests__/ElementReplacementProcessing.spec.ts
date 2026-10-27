import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ElementReplacementProcessing from '../ElementReplacementProcessing.vue'

describe('element replacement processing', () => {
  afterEach(() => { vi.useRealTimers() })

  it('shows only the loading state and completes after three seconds', async () => {
    vi.useFakeTimers()
    const wrapper = mount(ElementReplacementProcessing)
    expect(wrapper.text()).toBe('视频生成中')
    expect(wrapper.find('button').exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(2999)
    expect(wrapper.emitted('complete')).toBeUndefined()
    await vi.advanceTimersByTimeAsync(1)
    expect(wrapper.emitted('complete')).toHaveLength(1)
    wrapper.unmount()
  })
})
