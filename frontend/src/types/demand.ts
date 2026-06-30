export interface Demand {
  id: string
  title: string
  description: string
  department: string
  submitterId: string
  submitterName: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  status: DemandStatus
  voteCount: number
  commentCount: number
  tags: string[]
  attachments: { name: string; url: string; type: 'image' | 'file' }[]
  aiExtractedDesc: string | null
  timeline: DemandTimelineEntry[]
  createdAt: string
  updatedAt: string
}

export type DemandStatus = 'pending_review' | 'scheduled' | 'developing' | 'testing' | 'online' | 'completed' | 'rejected'

export const DEMAND_STATUS_META: Record<DemandStatus, { label: string; color: string }> = {
  pending_review: { label: '待评审', color: '#f59e0b' },
  scheduled: { label: '已排期', color: '#06b6d4' },
  developing: { label: '开发中', color: '#6366f1' },
  testing: { label: '测试验收', color: '#8b5cf6' },
  online: { label: '已上线', color: '#10b981' },
  completed: { label: '已完成', color: '#6b7280' },
  rejected: { label: '已退回', color: '#ef4444' },
}

export interface DemandTimelineEntry {
  id: string
  fromStatus: string | null
  toStatus: string
  operatorId: string
  operatorName: string
  operatorRole: string
  remark: string
  createdAt: string
}

export interface DemandComment {
  id: string
  demandId: string
  userId: string
  userName: string
  content: string
  createdAt: string
}
