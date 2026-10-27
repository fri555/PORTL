import { shallowReactive } from 'vue'

// Object URLs belong to this document. Persist source IDs and file metadata only.
const previews = shallowReactive(new Map<string, string>())

export function registerLocalVideo(file: File): string {
  const identifier = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  const sourceId = `local-video:${identifier}`
  previews.set(sourceId, URL.createObjectURL(file))
  return sourceId
}

export function getLocalVideoPreview(sourceId: string): string {
  return previews.get(sourceId) ?? ''
}

export function releaseLocalVideo(sourceId: string): void {
  const preview = previews.get(sourceId)
  if (!preview) return
  previews.delete(sourceId)
  URL.revokeObjectURL(preview)
}
