export interface Agent {
  id: string
  name: string
  description: string
  avatarUrl: string
  category: AgentCategory
  capabilityLevel: 1 | 2 | 3 | 4 | 5
  developerId: string
  developerName: string
  developerDepartment: string
  status: 'online' | 'offline' | 'maintenance'
  reviewStatus: 'draft' | 'pending' | 'approved' | 'rejected'
  systemPrompt: string
  defaultModel: string
  welcomeMessage: string
  quickCommands: string[]
  knowledgeBaseIds: string[]
  toolIds: string[]
  skillIds: string[]
  skillCount: number
  toolCount: number
  isPublished: boolean
  version: string
  totalCalls: number
  avgRating: number
  favoriteCount: number
  createdAt: string
  updatedAt: string
}

export type AgentCategory =
  | 'marketing'
  | 'supply_chain'
  | 'retail_ops'
  | 'customer_service'
  | 'finance_admin'
  | 'tech_dev'

export const AGENT_CATEGORY_META: Record<AgentCategory, { label: string; icon: string; color: string }> = {
  marketing: { label: '营销内容', icon: 'Megaphone', color: '#f97316' },
  supply_chain: { label: '仓储管理', icon: 'Package', color: '#06b6d4' },
  retail_ops: { label: '零售运营', icon: 'Store', color: '#10b981' },
  customer_service: { label: '客户服务', icon: 'Headphones', color: '#6366f1' },
  finance_admin: { label: '财务行政', icon: 'Calculator', color: '#8b5cf6' },
  tech_dev: { label: '技术研发', icon: 'Code2', color: '#ec4899' },
}

export interface AgentConversation {
  id: string
  agentId: string
  messages: AgentMessage[]
  createdAt: string
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments?: { name: string; url: string; type: string }[]
  timestamp: string
}
