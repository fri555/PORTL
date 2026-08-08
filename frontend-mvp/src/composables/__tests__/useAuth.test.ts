import { describe, it, expect, beforeEach } from 'vitest'
import { useAuth } from '../useAuth'

describe('useAuth state machine', () => {
  beforeEach(() => {
    useAuth().reset()
  })

  it('starts in pending', () => {
    const { status } = useAuth()
    expect(status.value).toBe('pending')
  })

  it('confirmMock jumps to confirmed', () => {
    const { status, confirmMock } = useAuth()
    confirmMock()
    expect(status.value).toBe('confirmed')
  })

  it('reset returns to pending from confirmed', () => {
    const { status, confirmMock, reset } = useAuth()
    confirmMock()
    reset()
    expect(status.value).toBe('pending')
  })

  it('scan only transitions from pending', () => {
    const { status, scan, confirmMock } = useAuth()
    scan()
    expect(status.value).toBe('scanned')
    // already scanned -> scan should be no-op
    scan()
    expect(status.value).toBe('scanned')
    confirmMock()
    scan() // confirmed -> scan no-op
    expect(status.value).toBe('confirmed')
  })
})
