export type SpeechFormat = 'mp3' | 'wav' | 'ogg_opus' | 'pcm'

export interface SpeechSynthesisInput {
  text: string
  speaker: string
  format: SpeechFormat
  sampleRate: number
  bitRate?: number
  speechRate: number
  loudnessRate: number
  enableSubtitle: boolean
  prototypeDemo: true
}

export interface SpeechVoice {
  id: string
  name: string
  language: string
  style: string
  gender: '女声' | '男声'
  sampleUrl?: string
}

export interface SpeechDemoManifest {
  text?: string
  sampleText?: string
  duration?: number
  sampleRate?: number
  channels?: number
  previewUrl?: string
  subtitleUrl?: string
  notice?: string
  files?: Record<string, { sampleRate?: number; duration?: number; channels?: number; bitRate?: number | null; bitDepth?: number | null; filename?: string; url?: string }>
  subtitles?: { index: number; start: number; end: number; text: string }[]
}
