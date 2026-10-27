import { speechBitRates, speechFormats, speechSampleRates, speechVoices } from '@/mock/speech-synthesis'
import type { SpeechFormat, SpeechSynthesisInput } from '@/types/speech-synthesis'

function boundedInteger(value: unknown, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(100, Math.max(-50, Math.round(number))) : fallback
}

/** Keeps both newly selected and restored settings valid without leaking hidden additions. */
export function normalizeSpeechInput(value: Record<string, any> = {}): SpeechSynthesisInput {
  const format: SpeechFormat = speechFormats.some(item => item.value === value.format) ? value.format : 'mp3'
  const sampleRate = format === 'ogg_opus' ? 48000 : speechSampleRates.includes(Number(value.sampleRate)) ? Number(value.sampleRate) : 24000
  const bitRate = ['mp3', 'ogg_opus'].includes(format) ? speechBitRates.includes(Number(value.bitRate)) ? Number(value.bitRate) : 64000 : undefined
  const voice = speechVoices.find(item => item.id === value.speaker) ?? speechVoices[0]!
  return {
    text: typeof value.text === 'string' ? value.text : '',
    speaker: voice.id,
    format,
    sampleRate,
    ...(bitRate !== undefined ? { bitRate } : {}),
    speechRate: boundedInteger(value.speechRate),
    loudnessRate: boundedInteger(value.loudnessRate),
    enableSubtitle: voice.language === '中文' || voice.language === '英文' ? value.enableSubtitle !== false : false,
    prototypeDemo: true,
  }
}

export function speechValidationMessage(name: string, input: Record<string, any>): string {
  if (!name.trim()) return '请输入任务名称'
  if (name.trim().length > 20) return '任务名称不能超过20个字符'
  if (typeof input.text !== 'string' || !input.text.trim()) return '请输入合成文本'
  if (!speechVoices.some(voice => voice.id === input.speaker)) return '请选择音色'
  return ''
}

export function speechVoiceName(speaker: unknown): string {
  return speechVoices.find(voice => voice.id === speaker)?.name ?? '未知音色'
}

export function speechFormatLabel(format: unknown): string {
  return speechFormats.find(item => item.value === format)?.label ?? 'MP3'
}

export function speechCharacterCount(text: unknown): number {
  return typeof text === 'string' ? Array.from(text).length : 0
}
