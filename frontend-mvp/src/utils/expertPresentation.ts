import type { Agent } from '@/types/agent'
import { knowledgeBases } from '@/mock/knowledge'
import { normalizeSystemTags, usageFormFromContent } from '@/utils/agentUsage'

export function expertDateLabel(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return '未提供'
  const parts = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-')
}
export function expertOwnerLabel(agent: Agent) { const name=agent.creator?.name?.trim() || agent.developerName?.trim(); const alias=agent.creator?.alias?.trim() || agent.developerAlias?.trim(); return name ? name + (alias && alias!==name ? '（'+alias+'）' : '') : '未配置负责人' }
export function expertDepartmentLabels(agent: Agent) { return agent.serviceBusiness?.trim() ? [agent.serviceBusiness.trim()] : normalizeSystemTags(agent.useDepartments) }
export type ExpertKnowledgeEntry = { id: string; name: string; kind: 'library'; ownerName?: string; lastUploadedAt?: string; lastSuccessfulSyncAt?: string }
export function expertKnowledgeEntries(agent: Agent): ExpertKnowledgeEntry[] {
 const result: ExpertKnowledgeEntry[]=[]
 if(agent.capabilities?.personalKnowledgeEnabled) result.push({id:'personal',name:'个人知识库',kind:'library'})
 if(agent.capabilities?.publicKnowledgeEnabled===false)return result
 const bound=agent.capabilities?.knowledgeBases ?? agent.knowledgeBaseIds.map(id=>({id,name:knowledgeBases.find(k=>k.id===id)?.name || '未提供名称'}))
 const fromDocs=(agent.capabilities?.knowledgeDocuments ?? []).filter(d=>d.knowledgeBaseId).map(d=>({id:d.knowledgeBaseId!,name:d.knowledgeBaseName || knowledgeBases.find(k=>k.id===d.knowledgeBaseId)?.name || '未提供名称'}))
 for(const item of [...bound,...fromDocs]) if(!result.some(k=>k.id===item.id)) result.push({...item,kind:'library'})
 return result
}
export function expertSystemTags(agent: Agent) {
 const hasKnowledge=agent.capabilities?.publicKnowledgeEnabled===true || agent.capabilities?.personalKnowledgeEnabled===true || (agent.capabilities?.publicKnowledgeEnabled===undefined && expertKnowledgeEntries(agent).length>0)
 const manual=usageFormFromContent(agent.usageInstructions).systems.filter(value=>!['知识库','联网'].includes(value))
 return normalizeSystemTags([...manual,...(hasKnowledge?['知识库']:[]),...(agent.capabilities?.internetEnabled?['联网']:[])])
}
const PLATFORM_FORMATS = new Set(['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'TXT', 'MD', 'CSV', 'PPTX', 'JPG', 'JPEG', 'PNG', 'WEBP'])
export function expertFileFormats(agent: Agent): string[] | undefined {
  const values = agent.capabilities?.supportedFileFormats
  return values === undefined ? undefined : normalizeSystemTags(values.map(value => value.replace(/^\./, '').toUpperCase()).filter(value => PLATFORM_FORMATS.has(value)))
}
export function expertMatchesSearch(agent: Agent, query: string) {
  const search = query.trim().toLowerCase()
  return !search || [agent.name, agent.description].some(value => value.toLowerCase().includes(search))
}
