export type ComparisonStatus = 'loading' | 'paused' | 'playing' | 'buffering' | 'ended' | 'error' | 'play-rejected'
export interface ComparisonState {
  synchronized: boolean
  playing: boolean
  busy: boolean
  currentTime: number
  originalDuration: number
  resultDuration: number
  commonDuration: number
  status: ComparisonStatus
  message: string
}
export interface ComparisonVideo extends EventTarget {
  currentTime: number
  readonly duration: number
  readonly paused: boolean
  readonly readyState: number
  readonly error: unknown
  play(): Promise<void>
  pause(): void
}
export function emptyComparisonState(): ComparisonState {
  return { synchronized: true, playing: false, busy: false, currentTime: 0, originalDuration: 0,
    resultDuration: 0, commonDuration: 0, status: 'loading', message: '' }
}
export function createVideoComparison(original: ComparisonVideo, result: ComparisonVideo, onChange: (state: ComparisonState) => void = () => {}) {
  const state = emptyComparisonState()
  const videos = [original, result]
  const bindings: { video: ComparisonVideo; type: string; listener: EventListener }[] = []
  const pendingSeekTargets = new Map<ComparisonVideo, number>()
  let destroyed = false
  let playAttempt = 0
  let aligning = false
  const validDuration = (duration: number) => Number.isFinite(duration) && duration > 0 ? duration : 0
  const publish = () => { if (!destroyed) onChange({ ...state }) }

  function pauseVideos() {
    for (const video of videos) {
      try { video.pause() } catch { /* Cleanup must continue for the other player. */ }
    }
  }
  function stop(status: ComparisonStatus = 'paused', message = '') {
    playAttempt++
    state.playing = false
    state.busy = false
    state.status = status
    state.message = message
    pauseVideos()
    publish()
  }
  function refreshDurations() {
    if (destroyed) return
    state.originalDuration = validDuration(original.duration)
    state.resultDuration = validDuration(result.duration)
    state.commonDuration = Math.min(state.originalDuration, state.resultDuration)
    if (state.status === 'loading' && state.commonDuration > 0 && !state.busy) state.status = 'paused'
    publish()
  }
  function align(seconds: number): boolean {
    const target = Math.max(0, Math.min(Number.isFinite(seconds) ? seconds : 0, state.commonDuration))
    aligning = true
    state.currentTime = target
    try {
      for (const video of videos) if (Math.abs(video.currentTime - target) > 0.01) {
        pendingSeekTargets.set(video, target)
        video.currentTime = target
      }
      return true
    } catch {
      stop('error', '视频暂时无法定位，请等待视频加载后重试。')
      return false
    } finally { aligning = false }
  }
  function finish() {
    if (destroyed || !state.synchronized) return
    stop('ended', '已到达公共可同步区间末尾。')
    align(state.commonDuration)
    publish()
  }
  function seek(seconds: number) {
    if (destroyed) return
    stop()
    align(seconds)
    publish()
  }
  async function play(): Promise<boolean> {
    if (destroyed || !state.synchronized || state.busy) return false
    refreshDurations()
    if (videos.some(video => video.error)) {
      stop('error', '视频无法播放，请检查链接或重新选择视频。')
      return false
    }
    if (!state.commonDuration || videos.some(video => video.readyState < 2)) {
      stop('buffering', '视频正在加载，准备就绪后可重试播放。')
      return false
    }
    if (!align(original.currentTime >= state.commonDuration ? 0 : original.currentTime)) return false
    const attempt = ++playAttempt
    state.busy = true
    state.playing = false
    state.message = '正在准备同步播放…'
    publish()
    const outcomes = await Promise.allSettled(videos.map(video => {
      try { return Promise.resolve(video.play()) }
      catch (error) { return Promise.reject(error) }
    }))
    if (destroyed || attempt !== playAttempt || !state.synchronized) return false
    if (outcomes.some(outcome => outcome.status === 'rejected')) {
      stop('play-rejected', '同步播放未能开始，请点击重试播放。')
      return false
    }
    state.busy = false
    state.playing = true
    state.status = 'playing'
    state.message = ''
    publish()
    return true
  }
  function setSynchronized(enabled: boolean) {
    if (destroyed || enabled === state.synchronized) return
    stop()
    state.synchronized = enabled
    if (enabled) align(original.currentTime)
    publish()
  }
  function bind(video: ComparisonVideo, type: string, callback: () => void) {
    const listener: EventListener = () => { if (!destroyed) callback() }
    video.addEventListener(type, listener)
    bindings.push({ video, type, listener })
  }
  for (const [index, video] of videos.entries()) {
    for (const event of ['loadedmetadata', 'durationchange']) bind(video, event, () => {
      refreshDurations()
      if (state.synchronized && state.commonDuration > 0 && original.currentTime > state.commonDuration) finish()
    })
    for (const event of ['waiting', 'stalled']) bind(video, event, () => {
      if (state.synchronized) stop('buffering', `${index === 0 ? '原视频' : '替换结果'}正在缓冲，两侧已暂停。准备就绪后可重试播放。`)
    })
    for (const event of ['canplay', 'loadeddata']) bind(video, event, () => {
      refreshDurations()
      if (state.status === 'buffering' && videos.every(item => item.readyState >= 2 && !item.error)) {
        state.status = 'paused'
        state.message = '视频已就绪，可重试播放。'
        publish()
      }
    })
    bind(video, 'error', () => {
      if (state.synchronized) stop('error', `${index === 0 ? '原视频' : '替换结果'}无法播放，两侧已暂停。请检查链接或重新选择视频。`)
      else {
        state.message = `${index === 0 ? '原视频' : '替换结果'}无法播放，请检查链接或重新选择视频。`
        state.status = 'error'
        publish()
      }
    })
    bind(video, 'ended', finish)
    bind(video, 'pause', () => {
      if (state.synchronized && (state.playing || state.busy)) stop()
    })
    bind(video, 'play', () => {
      if (state.synchronized && !state.playing && !state.busy) void play()
    })
    bind(video, 'seeking', () => {
      const expected = pendingSeekTargets.get(video)
      if (expected !== undefined && Math.abs(video.currentTime - expected) < 0.05) return
      pendingSeekTargets.delete(video)
      if (state.synchronized && !aligning) {
        stop()
        align(video.currentTime)
        publish()
      }
    })
    bind(video, 'seeked', () => { pendingSeekTargets.delete(video) })
    bind(video, 'timeupdate', () => {
      if (!state.synchronized || aligning) return
      if (state.commonDuration > 0 && video.currentTime >= state.commonDuration) { finish(); return }
      if (video !== original) return
      state.currentTime = Math.max(0, original.currentTime)
      if (state.playing && Math.abs(result.currentTime - original.currentTime) > 0.25) align(original.currentTime)
      publish()
    })
  }
  refreshDurations()
  function destroy() {
    if (destroyed) return
    destroyed = true
    playAttempt++
    for (const binding of bindings) binding.video.removeEventListener(binding.type, binding.listener)
    bindings.length = 0
    pendingSeekTargets.clear()
    state.playing = false
    state.busy = false
    pauseVideos()
  }
  return { state, play, pause: () => { if (!destroyed) stop() }, seek, reset: () => seek(0), setSynchronized, destroy }
}
