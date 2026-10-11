import type { Agent } from '@/types/agent'
import { knowledgeBases } from '@/mock/knowledge'
import { normalizeSystemTags, stripAutomaticSystemTags, usageFormFromContent } from '@/utils/agentUsage'

export function expertDateLabel(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return '未提供'
  const parts = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-')
}
export type ExpertKnowledgeEntry = { id: string; name: string; kind: 'document' | 'library'; lastSuccessfulSyncAt?: string }
export function expertKnowledgeEntries(agent: Agent): ExpertKnowledgeEntry[] {
  const explicit = agent.capabilities?.knowledgeDocuments
  if (explicit !== undefined) return explicit.map(item => ({ ...item, name: item.name?.trim() || '未提供名称', kind: 'document' }))
  const documentNames = normalizeSystemTags(agent.capabilities?.selectedDocumentNames)
  if (documentNames.length) return documentNames.map((name, index) => ({ id: 'document-' + index, name, kind: 'document' }))
  return (agent.capabilities?.knowledgeBases ?? agent.knowledgeBaseIds.map(id => ({ id, name: knowledgeBases.find(item => item.id === id)?.name || '未提供名称' })))
    .map(item => ({ ...item, name: item.name?.trim() || '未提供名称', kind: 'library' }))
}
export function expertSystemTags(agent: Agent) {
  const hasKnowledge = expertKnowledgeEntries(agent).length > 0
  const sources = { connectedSystems: agent.capabilities?.connectedSystems, hasKnowledge, internetEnabled: agent.capabilities?.internetEnabled }
  const manual = stripAutomaticSystemTags(usageFormFromContent(agent.usageInstructions).systems, sources)
  const platformKnowledge = new Set(['知识库', '企业知识库'])
  const platformInternet = new Set(['联网', '联网查询', '互联网', '网络搜索'])
  const suppliedSystems = (agent.capabilities?.connectedSystems ?? []).filter(value => !platformKnowledge.has(value.trim()) && !platformInternet.has(value.trim()))
  const automatic = normalizeSystemTags([
    ...suppliedSystems,
    ...(hasKnowledge ? ['知识库'] : []),
    ...(agent.capabilities?.internetEnabled === true ? ['联网'] : []),
  ])
  return normalizeSystemTags([...manual, ...automatic])
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
