export interface PrototypeSegment {
  segmentId: string
  startTime: number
  endTime: number
  visualDescription: string
  referenceImages: string[]
}

export interface PrototypePrompt {
  segmentId: string
  prompt: string
  references: { name: string; uri: string }[]
}

export function sourceLabel(input: Record<string, any>, fallback = '视频主体'): string {
  if (input.fileName) return String(input.fileName)
  try {
    const name = new URL(String(input.videoUrl || input.sourceVideoUrl)).pathname.split('/').pop()
    return name ? decodeURIComponent(name) : fallback
  } catch { return fallback }
}

export function storyboardSegments(input: Record<string, any>, fallback = '视频主体'): PrototypeSegment[] {
  if (Array.isArray(input.segments) && input.segments.length) {
    return input.segments.slice(0, 24).map((segment: Record<string, any>, index: number) => ({
      segmentId: String(segment.segmentId ?? segment.id ?? `segment-${index + 1}`),
      startTime: Number(segment.startTime) || 0,
      endTime: Number(segment.endTime) || 0,
      visualDescription: String(segment.visualDescription ?? segment.description ?? ''),
      referenceImages: Array.isArray(segment.referenceImages) ? segment.referenceImages.filter((image: unknown) => typeof image === 'string') : [],
    }))
  }
  const min = Math.min(14, Math.max(4, Number(input.minDuration) || 4))
  const max = Math.min(15, Math.max(min + 1, Number(input.maxDuration) || 14))
  const duration = Math.floor((min + max) / 2)
  const subject = sourceLabel(input, fallback)
  const actions = ['开场建立主体与环境，镜头缓慢推进。', '中景展示主体细节与动作，保持画面连贯。', '特写呈现关键细节，镜头平稳收束。']
  return actions.map((action, index) => ({
    segmentId: `segment-${String(index + 1).padStart(2, '0')}`,
    startTime: index * duration,
    endTime: (index + 1) * duration,
    visualDescription: `${subject}：${action}`,
    referenceImages: [],
  }))
}

export function reversePrompts(segments: PrototypeSegment[]): PrototypePrompt[] {
  return segments.map(segment => ({
    segmentId: segment.segmentId,
    prompt: `【原型演示】\n画面内容：${segment.visualDescription}\n时长：${segment.endTime - segment.startTime} 秒。\n镜头：平稳运镜，主体清晰，保持相邻画面的视觉连续性。\n风格：自然光线，真实质感。`,
    references: segment.referenceImages.map((uri, index) => ({ name: `参考图片 ${index + 1}`, uri })),
  }))
}

export function formatTime(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

export function imageSource(value: unknown): string {
  return typeof value === 'string' && /^(https?:\/\/|blob:|data:image\/)/i.test(value) ? value : ''
}
