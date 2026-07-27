import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkbenchBoardState } from '../useWorkbenchBoardState'

describe('useWorkbenchBoardState', () => {
  beforeEach(() => sessionStorage.clear())

  it('uses session data without loading until manual refresh', async () => {
    sessionStorage.setItem('workbench:live:email', JSON.stringify({
      data: [{ id: 'm1' }],
      refreshedAt: '2026-07-26T10:00:00+08:00',
    }))
    const loader = vi.fn().mockResolvedValue([{ id: 'm2' }])

    const state = useWorkbenchBoardState('live', 'email', loader, [] as Array<{ id: string }>)

    expect(state.data.value).toEqual([{ id: 'm1' }])
    expect(loader).not.toHaveBeenCalled()
    await state.refresh()
    expect(state.data.value).toEqual([{ id: 'm2' }])
    expect(loader).toHaveBeenCalledTimes(1)
    expect(JSON.parse(sessionStorage.getItem('workbench:live:email') ?? '{}').data).toEqual([{ id: 'm2' }])
  })

  it('keeps stale data after a failed refresh', async () => {
    const state = useWorkbenchBoardState(
      'live',
      'todo',
      vi.fn().mockRejectedValue(new Error('DWS unavailable')),
      [{ id: 'old' }],
    )

    await state.refresh()

    expect(state.data.value).toEqual([{ id: 'old' }])
    expect(state.error.value).toBe('DWS unavailable；当前展示上次数据')
  })

  it('does not execute duplicate refreshes', async () => {
    let resolve!: (value: string[]) => void
    const loader = vi.fn(() => new Promise<string[]>((done) => { resolve = done }))
    const state = useWorkbenchBoardState('live', 'digest', loader, [])

    const first = state.refresh()
    const second = state.refresh()
    expect(loader).toHaveBeenCalledTimes(1)
    resolve(['done'])
    await Promise.all([first, second])
    expect(state.data.value).toEqual(['done'])
  })
})
