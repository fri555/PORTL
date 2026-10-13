import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SourceChatDetail from '../SourceChatDetail.vue'

describe('SourceChatDetail expert todo progress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/PORTL/chat/expert-plan-demo?planState=running&agent=bswjqns001')
  })
  afterEach(() => {
    vi.useRealTimers()
    window.history.replaceState({}, '', '/')
  })

  it('mounts the progress line immediately above the active input in an expert conversation', async () => {
    const wrapper = mount(SourceChatDetail, {
      props: { sessionId: 'expert-plan-demo', agentId: 'bswjqns001', persistState: false },
      global: { stubs: { Teleport: true } },
    })
    await flushPromises()

    const progress = wrapper.get('[data-testid="expert-todo-progress"]')
    const inputLine = wrapper.get('[data-testid="expert-inline-input"]')
    expect(progress.text()).toContain('进度 1/3')
    expect(progress.element.nextElementSibling).toBe(inputLine.element)
    wrapper.unmount()
  })
})