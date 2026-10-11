import { getBusinessExpertAvatarUrl } from './businessExpertAvatars'
import type { Agent } from '@/types/agent'
import { usageContentFromForm } from '@/utils/agentUsage'
import { businessExpertProfiles, dailyAssistantProfile, type BusinessExpertProfile } from './businessExpertProfiles'

const dailyAvatar = import.meta.env.BASE_URL + 'assets/agents-online/tianma-assistant.png'

// Unknown source values remain empty; the IDs are local prototype identifiers.
function toAgent(profile: BusinessExpertProfile): Agent {
  const firstPublishedAt = profile.firstPublishedAt ? profile.firstPublishedAt + 'T00:00:00+08:00' : undefined
  return {
    id: profile.id, name: profile.name, description: profile.description,
    avatarUrl: getBusinessExpertAvatarUrl(profile.id) ?? dailyAvatar,
    category: profile.category, capabilityLevel: 1,
    developerId: '', developerName: '', developerDepartment: '',
    status: 'online', reviewStatus: 'approved', isPublished: true,
    systemPrompt: '', defaultModel: '', welcomeMessage: '', quickCommands: [...profile.quickCommands],
    knowledgeBaseIds: [], toolIds: [], skillIds: [], skillCount: 0, toolCount: 0,
    version: '', totalCalls: 0, avgRating: 0, favoriteCount: 0,
    usageInstructions: usageContentFromForm(profile),
    firstPublishedAt, createdAt: '', updatedAt: '',
    capabilities: {
      connectedSystems: [...profile.systems],
      internetEnabled: profile.internetEnabled,
      supportedFileFormats: profile.supportedFileFormats ? [...profile.supportedFileFormats] : undefined,
      selectedToolNames: [],
      knowledgeBases: profile.knowledgeNames.map((name, index) => ({
        id: 'prototype-source:' + profile.id + ':' + index, name,
      })),
      ...(profile.id === 'biz-02' ? {
        tools: [
          { id: 't1', name: '联网搜索', description: '实时联网检索信息' },
          { id: 't2', name: '数据分析', description: '表格数据计算与可视化' },
          { id: 't3', name: '文档生成', description: '自动生成报告文档' },
        ],
        connectors: [
          { id: 'c1', name: 'iqs-mcp-server-search', protocol: 'STREAMABLE-HTTP', description: '商品搜索连接器' },
          { id: 'c2', name: 'iqs-mcp-server-readpage', protocol: 'STREAMABLE-HTTP', description: '页面内容读取' },
          { id: 'c3', name: 'product-mcp-server', protocol: 'STREAMABLE-HTTP', description: '商品数据服务' },
        ],
        skills: [
          { id: 's1', name: '钉钉dws', identifier: 'DINGTALK-DWS', description: '钉钉文档操作技能' },
          { id: 's2', name: '商品文搜图/图搜文', identifier: 'GOODS-WORD-IMAGE-SEARCH', description: '商品图文互搜' },
        ],
      } : {}),
    },
  }
}

export const agents: Agent[] = businessExpertProfiles.map(toAgent)
export const dailyAssistant: Agent = toAgent(dailyAssistantProfile)
export function getAgent(id: string): Agent | undefined {
  return id === dailyAssistant.id ? dailyAssistant : agents.find(agent => agent.id === id)
}
