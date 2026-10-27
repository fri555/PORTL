export type ReplacementType = 'person' | 'product' | 'background'
export interface ReplacementMedia {
  id: string
  name: string
  kind: 'video' | 'image'
  source: 'upload' | 'url' | 'material' | 'demo'
  url: string
  remoteUrl?: string
  poster?: string
  duration?: number
}
export interface ReplacementGroup {
  id: string
  description: string
  reference: ReplacementMedia | null
}
export interface ReplacementSettings {
  model: 'seedance-2.0' | 'seedance-2.0-fast' | 'seedance-2.0-mini'
  resolution: '480p' | '720p'
  ratio: 'adaptive' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9'
  generateAudio: boolean
  duration: number | null
  watermark: boolean
  returnLastFrame: boolean
  priority: number
  executionExpiresAfter: number
}
export interface ElementReplacementInput {
  replacementType: ReplacementType
  sourceVideo: ReplacementMedia | null
  groups: ReplacementGroup[]
  preservePrompt: string
  audioUrls: string[]
  settings: ReplacementSettings
  prototypeDemo: boolean
  resultVideo?: ReplacementMedia | null
  resultUsesOriginal?: boolean
}
