import type { ReplacementType } from '../types/element-replacement'

export function composeReplacementPrompt(type: ReplacementType, descriptions: string[], instructions: string): string {
  const target = type === 'person' ? '人物' : type === 'background' ? '背景' : '产品'
  return [
    ...descriptions.map((description, index) => `将视频中的${description.trim() || '【原元素说明】'}${type === 'person' ? '完整' : ''}替换为参考图${index + 1}中的${target}`),
    instructions.trim(),
    '保持原视频时长和时间线',
  ].filter(Boolean).join('；')
}

export function replacementSourceDuration(duration: unknown): number | null {
  return typeof duration === 'number' && Number.isFinite(duration) && duration > 0 ? Math.max(1, Math.round(duration)) : null
}
