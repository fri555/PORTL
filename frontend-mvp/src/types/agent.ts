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
  useDepartments?: string[]
  status: 'online' | 'offline' | 'maintenance'
  reviewStatus: 'draft' | 'pending' | 'approved' | 'rejected'
  systemPrompt: string
  defaultModel: string
  welcomeMessage: string
  quickCommands: string[]
  quickPromptDefinitions?: { title: string; content: string }[]
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
  usageInstructions: string
  firstPublishedAt?: string
  publishedAt?: string
  capabilities?: {
    internetEnabled?: boolean
    supportedFileFormats?: string[]
    connectedSystems?: string[]
    selectedDocumentNames?: string[]
    selectedToolNames?: string[]
    knowledgeDocuments?: { id: string; name: string; lastSuccessfulSyncAt?: string }[]
    connectors?: { id: string; name: string; protocol?: string; description?: string }[]
    tools?: { id: string; name: string; description?: string }[]
    skills?: { id: string; name: string; identifier?: string; description?: string }[]
    knowledgeBases?: { id: string; name: string; lastSuccessfulSyncAt?: string }[]
  }
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
  finance_admin: { label: '通用', icon: 'Sparkles', color: '#8b5cf6' },
  supply_chain: { label: '商品', icon: 'Package', color: '#06b6d4' },
  marketing: { label: '直播', icon: 'Video', color: '#f97316' },
  tech_dev: { label: 'B2B', icon: 'Building2', color: '#ec4899' },
  customer_service: { label: 'B2C', icon: 'Users', color: '#6366f1' },
  retail_ops: { label: '门店', icon: 'Store', color: '#10b981' },
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


