export interface Skill {
  id: string
  name: string
  description: string
  icon: string
  category: SkillCategory
  developerId: string
  developerName: string
  status: 'online' | 'offline'
  reviewStatus: 'draft' | 'pending' | 'approved' | 'rejected'
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  promptTemplate: string
  recommendedModel: string
  apiEndpoint: string
  isPublished: boolean
  version: string
  totalCalls: number
  createdAt: string
  updatedAt: string
}

export type SkillCategory = 'content_generation' | 'data_analysis' | 'image_processing' | 'nlp' | 'automation' | 'other'

export const SKILL_CATEGORY_META: Record<SkillCategory, { label: string; color: string }> = {
  content_generation: { label: '内容生成', color: '#f97316' },
  data_analysis: { label: '数据分析', color: '#06b6d4' },
  image_processing: { label: '图像处理', color: '#10b981' },
  nlp: { label: '自然语言', color: '#6366f1' },
  automation: { label: '流程自动化', color: '#8b5cf6' },
  other: { label: '其他', color: '#6b7280' },
}
