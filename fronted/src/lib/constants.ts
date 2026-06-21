import type { ArticleCategory, ThreatLevel } from '@/types/article'

export interface CategoryMeta {
  key: ArticleCategory | 'all'
  label: string
  short: string
  color: string
  hue: number
}

export const CATEGORIES: CategoryMeta[] = [
  { key: 'competitor', label: '⚔️ 竞对情报', short: '竞对', color: 'text-red-600 bg-red-50 border-red-200', hue: 0 },
  { key: 'industry', label: '🌐 行业前沿', short: '行业', color: 'text-blue-600 bg-blue-50 border-blue-200', hue: 210 },
  { key: 'internal', label: '🏢 集团动态', short: '集团', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', hue: 150 },
  { key: 'tech', label: '📚 技术分享', short: '技术', color: 'text-violet-600 bg-violet-50 border-violet-200', hue: 265 },
  { key: 'product', label: '📢 产品更新', short: '产品', color: 'text-amber-600 bg-amber-50 border-amber-200', hue: 40 },
]

export function catMeta(key: string): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.key === key)
}

export const THREAT_META: Record<ThreatLevel, { label: string; color: string; dot: string }> = {
  high: { label: '高威胁', color: 'text-red-700 bg-red-100 border-red-300', dot: 'bg-red-500' },
  medium: { label: '中威胁', color: 'text-orange-700 bg-orange-100 border-orange-300', dot: 'bg-orange-500' },
  low: { label: '低威胁', color: 'text-amber-700 bg-amber-100 border-amber-300', dot: 'bg-amber-500' },
}

export const SUB_CATEGORIES: Record<string, string[]> = {
  competitor: ['竞品动态', '行业对标', '威胁预警'],
  industry: ['大模型进展', 'AI应用趋势', '政策法规'],
  internal: ['项目里程碑', '效率提升', '领导讲话'],
  tech: ['使用心得', 'Prompt技巧', '踩坑记录'],
  product: ['新功能上线', '维护通知'],
}
