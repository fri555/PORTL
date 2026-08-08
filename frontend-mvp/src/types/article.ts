export type ArticleCategory = 'competitor' | 'industry' | 'internal' | 'tech' | 'product'

export type ThreatLevel = 'high' | 'medium' | 'low'

export interface Article {
  id: string
  title: string
  summary: string
  content: string
  category: ArticleCategory
  subCategory?: string
  threatLevel?: ThreatLevel
  competitorName?: string
  source?: string
  sourceUrl?: string
  coverImage: string
  author: string
  department: string
  viewCount: number
  likeCount: number
  commentCount: number
  tags: string[]
  publishedAt: string
  isHeadline?: boolean
  isPinned?: boolean
}
