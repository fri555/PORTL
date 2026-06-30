export interface PointsBalance {
  total: number
  thisMonth: number
  thisWeek: number
  available: number
}

export interface PointsTransaction {
  id: string
  userId: string
  action: string
  points: number
  refType: string | null
  refId: string | null
  description: string
  createdAt: string
}

export interface RankingEntry {
  rank: number
  rankChange: number
  userId: string
  userName: string
  department: string
  avatarUrl: string
  score: number
  highlights: string
}

export interface DeptRankingEntry {
  rank: number
  rankChange: number
  department: string
  score: number
  aiPenetration: string
  efficiencyGain: string
  tokenConsumed: string
}

export type RankingType = 'usage' | 'demand' | 'opinion_leader' | 'department'
export type RankingPeriod = 'daily' | 'weekly' | 'monthly'

export const RANKING_META: Record<RankingType, { label: string; description: string }> = {
  usage: { label: '使用者排名', description: '按AI工具使用频次与时长排名' },
  demand: { label: '提需求排名', description: '按提交需求数+被采纳权重排名' },
  opinion_leader: { label: '意见领袖', description: '按投稿/评论/被点赞综合排名' },
  department: { label: '部门价值排名', description: '按AI渗透率与提效数据排名' },
}
