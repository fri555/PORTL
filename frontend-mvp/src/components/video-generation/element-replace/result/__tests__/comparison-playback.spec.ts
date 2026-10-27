import { describe, expect, it } from 'vitest'
import { createVideoComparison, type ComparisonState } from '../comparison-playback'

class VideoDouble extends EventTarget {
  currentTime = 0
  readyState = 4
  paused = true
  error: unknown = null
  playImplementation: (() => Promise<void>) | null = null
  constructor(public duration: number) { super() }
  play() {
    this.paused = false
    this.dispatchEvent(new Event('play'))
    return this.playImplementation?.() ?? Promise.resolve()
  }
  pause() {
    const wasPlaying = !this.paused
    this.paused = true
    if (wasPlaying) this.dispatchEvent(new Event('pause'))
  }
  fire(type: string) { this.dispatchEvent(new Event(type)) }
}

describe('video comparison playback', () => {
  it('clamps shared seeking to the shorter actual duration', () => {
    const original = new VideoDouble(30)
    const result = new VideoDouble(12)
    const controller = createVideoComparison(original, result)
    controller.seek(25)
    expect(original.currentTime).toBe(12)
    expect(result.currentTime).toBe(12)
    expect(controller.state).toMatchObject({ originalDuration: 30, resultDuration: 12, commonDuration: 12, currentTime: 12 })
    controller.seek(-4)
    expect(original.currentTime).toBe(0)
    expect(result.currentTime).toBe(0)
    controller.destroy()
  })

  it('pauses both players on buffering and allows an explicit retry after readiness returns', async () => {
    const original = new VideoDouble(30)
    const result = new VideoDouble(12)
    const controller = createVideoComparison(original, result)
    await controller.play()
    expect(controller.state.playing).toBe(true)
    result.readyState = 1
    result.fire('waiting')
    expect(original.paused).toBe(true)
    expect(result.paused).toBe(true)
    expect(controller.state.status).toBe('buffering')
    result.readyState = 4
    result.fire('canplay')
    expect(controller.state.playing).toBe(false)
    await controller.play()
    expect(original.paused).toBe(false)
    expect(result.paused).toBe(false)
    controller.destroy()
  })

  it('stops both at the common boundary when the shorter video ends', async () => {
    const original = new VideoDouble(30)
    const result = new VideoDouble(12)
    const controller = createVideoComparison(original, result)
    await controller.play()
    result.currentTime = 12
    result.fire('ended')
    expect(original.paused).toBe(true)
    expect(result.paused).toBe(true)
    expect(original.currentTime).toBe(12)
    expect(controller.state).toMatchObject({ status: 'ended', currentTime: 12 })
    controller.destroy()
  })

  it('pauses both videos and reports media errors', async () => {
    const original = new VideoDouble(30)
    const result = new VideoDouble(12)
    const controller = createVideoComparison(original, result)
    await controller.play()
    original.error = { code: 4 }
    original.fire('error')
    expect(original.paused).toBe(true)
    expect(result.paused).toBe(true)
    expect(controller.state.status).toBe('error')
    expect(controller.state.message).toContain('原视频')
    controller.destroy()
  })

  it('handles rejected play promises without leaving either player running and supports retry', async () => {
    const original = new VideoDouble(30)
    const result = new VideoDouble(12)
    result.playImplementation = () => Promise.reject(new Error('NotAllowedError'))
    const controller = createVideoComparison(original, result)
    expect(await controller.play()).toBe(false)
    expect(original.paused).toBe(true)
    expect(result.paused).toBe(true)
    expect(controller.state.status).toBe('play-rejected')
    expect(controller.state.message).toContain('重试')
    result.playImplementation = null
    expect(await controller.play()).toBe(true)
    expect(controller.state.playing).toBe(true)
    controller.destroy()
  })

  it('keeps playback and seeking independent when synchronization is disabled', async () => {
    const original = new VideoDouble(30)
    const result = new VideoDouble(12)
    const controller = createVideoComparison(original, result)
    controller.setSynchronized(false)
    await original.play()
    original.currentTime = 9
    original.fire('seeking')
    expect(result.paused).toBe(true)
    expect(result.currentTime).toBe(0)
    await result.play()
    original.fire('waiting')
    expect(result.paused).toBe(false)
    controller.setSynchronized(true)
    expect(original.paused).toBe(true)
    expect(result.paused).toBe(true)
    expect(result.currentTime).toBe(9)
    controller.destroy()
  })

  it('ignores a pending play completion after the user pauses', async () => {
    const original = new VideoDouble(30)
    const result = new VideoDouble(12)
    let resolvePlay!: () => void
    original.playImplementation = () => new Promise<void>(resolve => { resolvePlay = resolve })
    const controller = createVideoComparison(original, result)
    const pending = controller.play()
    controller.pause()
    resolvePlay()
    await pending
    expect(controller.state.playing).toBe(false)
    expect(original.paused).toBe(true)
    expect(result.paused).toBe(true)
    controller.destroy()
  })

  it('unbinds all media listeners and pauses both players on destroy', async () => {
    const original = new VideoDouble(30)
    const result = new VideoDouble(12)
    const observed: ComparisonState[] = []
    const controller = createVideoComparison(original, result, state => observed.push(state))
    await controller.play()
    expect(original.paused).toBe(false)
    expect(result.paused).toBe(false)
    controller.destroy()
    const count = observed.length
    original.currentTime = 7
    original.fire('seeking')
    original.fire('waiting')
    result.fire('error')
    expect(original.paused).toBe(true)
    expect(result.paused).toBe(true)
    expect(result.currentTime).toBe(0)
    expect(observed).toHaveLength(count)
  })

  it('keeps playing when asynchronous seeking events acknowledge a drift correction', async () => {
    const original = new VideoDouble(30)
    const result = new VideoDouble(12)
    const controller = createVideoComparison(original, result)
    await controller.play()
    original.currentTime = 6
    result.currentTime = 5
    original.fire('timeupdate')
    expect(result.currentTime).toBe(6)
    result.fire('seeking')
    expect(controller.state.playing).toBe(true)
    expect(original.paused).toBe(false)
    expect(result.paused).toBe(false)
    controller.destroy()
  })
})
