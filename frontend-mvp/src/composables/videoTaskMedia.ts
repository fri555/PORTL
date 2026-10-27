import { releaseLocalVideo } from '@/components/video-generation/storyboard/local-preview'
import type { VideoTask } from '@/types/video-generation'

function localVideoIds(value: unknown, identifiers = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    if (value.startsWith('local-video:')) identifiers.add(value)
  } else if (Array.isArray(value)) {
    value.forEach(item => localVideoIds(item, identifiers))
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach(item => localVideoIds(item, identifiers))
  }
  return identifiers
}

// Call after persistence succeeds so failed writes keep the previous task playable.
export function releaseUnusedTaskVideos(previous: VideoTask | undefined, remaining: readonly VideoTask[]): void {
  if (!previous) return
  const retained = new Set<string>()
  remaining.forEach(task => localVideoIds(task.input, retained))
  for (const identifier of localVideoIds(previous.input)) {
    if (!retained.has(identifier)) releaseLocalVideo(identifier)
  }
}
