import { onScopeDispose, shallowRef, watch, type Ref } from 'vue'
import { createVideoComparison, emptyComparisonState } from './comparison-playback'

export function useComparisonPlayback(original: Ref<HTMLVideoElement | null>, result: Ref<HTMLVideoElement | null>) {
  const state = shallowRef(emptyComparisonState())
  let controller: ReturnType<typeof createVideoComparison> | null = null
  const stopWatching = watch([original, result], ([left, right]) => {
    const synchronized = state.value.synchronized
    controller?.destroy()
    controller = null
    state.value = { ...emptyComparisonState(), synchronized }
    if (left && right) {
      controller = createVideoComparison(left, right, next => { state.value = next })
      controller.setSynchronized(synchronized)
    }
  }, { immediate: true, flush: 'post' })
  onScopeDispose(() => { stopWatching(); controller?.destroy(); controller = null })
  return {
    state,
    play: () => controller?.play(),
    pause: () => controller?.pause(),
    seek: (seconds: number) => controller?.seek(seconds),
    reset: () => controller?.reset(),
    setSynchronized: (enabled: boolean) => {
      if (controller) controller.setSynchronized(enabled)
      else state.value = { ...state.value, synchronized: enabled }
    },
  }
}
