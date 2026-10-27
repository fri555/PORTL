import type { ReplacementMedia } from '@/types/element-replacement'

const asset = (name: string) => `${import.meta.env.BASE_URL}assets/video-generation/element-replace/${name}`
export const demoReplacementVideo: ReplacementMedia = {
  id: 'demo-courtyard-video', name: '双人模特展示 · 演示视频', kind: 'video', source: 'demo',
  url: asset('demo-source.mp4'), poster: asset('source-poster.png'), duration: 8,
}
export const demoReplacementReferences: ReplacementMedia[] = [
  { id: 'demo-person-a', name: '模特 A · 演示参考图', kind: 'image', source: 'demo', url: asset('person-a.png') },
  { id: 'demo-person-b', name: '模特 B · 演示参考图', kind: 'image', source: 'demo', url: asset('person-b.png') },
]
