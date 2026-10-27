import type { SpeechFormat, SpeechVoice } from '@/types/speech-synthesis'

export const speechVoices: SpeechVoice[] = [
  { id: 'zh_female_vv_uranus_bigtts', name: 'Vivi 2.0', language: '中文', style: '通用', gender: '女声' },
  { id: 'zh_female_xiaohe_uranus_bigtts', name: '小何', language: '中文', style: '通用', gender: '女声' },
  { id: 'zh_male_m191_uranus_bigtts', name: '云舟', language: '中文', style: '通用', gender: '男声' },
  { id: 'zh_male_taocheng_uranus_bigtts', name: '小天', language: '中文', style: '通用', gender: '男声' },
  { id: 'zh_female_qingxinnvsheng_uranus_bigtts', name: '清新女声', language: '中文', style: '通用', gender: '女声' },
  { id: 'zh_male_jieshuoxiaoming_uranus_bigtts', name: '解说小明', language: '中文', style: '解说', gender: '男声' },
]

export const speechFormats: { value: SpeechFormat; label: string; extension: string }[] = [
  { value: 'mp3', label: 'MP3', extension: 'mp3' },
  { value: 'wav', label: 'WAV', extension: 'wav' },
  { value: 'ogg_opus', label: 'OGG Opus', extension: 'ogg' },
  { value: 'pcm', label: 'PCM（原始音频）', extension: 'pcm' },
]
export const speechSampleRates = [8000, 16000, 22050, 24000, 32000, 44100, 48000]
export const speechBitRates = [64000, 160000]
export const speechDemoBase = `${import.meta.env.BASE_URL}assets/video-generation/speech-synthesis/`
