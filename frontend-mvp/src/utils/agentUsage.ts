import type { Agent } from '@/types/agent'
import { knowledgeBases } from '@/mock/knowledge'

export const USAGE_TEXT_MAX_LENGTH = 500
export const USAGE_HEADINGS = ['能力范围', '能力边界'] as const
export const USAGE_TEMPLATE = '1. 能力范围\n能力标签：\n输入要求：\n输出形式：\n\n2. 能力边界\n使用限制：'
export const USAGE_PLACEHOLDER = '请填写能力标签和使用限制'
export const FIXED_USAGE_NOTICE = 'AI 生成内容仅供辅助参考，可能存在理解偏差、信息遗漏或生成错误。涉及关键数据、业务结论及发送、删除、发布、审批、下单、对外分享等操作时，必须核对原始来源并由责任人确认。'
export type UsageForm = { systems: string[]; input: string; output: string; limits: string }
export function createUsageForm(): UsageForm { return { systems: [], input: '', output: '', limits: '' } }
export function normalizeSystemTags(values: string[] = []) { return [...new Set(values.map(value => value.trim()).filter(Boolean))] }
export type AutomaticSystemSources = { connectedSystems?: string[]; hasKnowledge?: boolean; internetEnabled?: boolean }
export function stripAutomaticSystemTags(values: string[] = [], sources: AutomaticSystemSources = {}) {
  const automatic = new Set<string>()
  if (sources.hasKnowledge) ['知识库', '企业知识库'].forEach(value => automatic.add(value))
  if (sources.internetEnabled === true) ['联网', '联网查询', '互联网', '网络搜索'].forEach(value => automatic.add(value))
  return normalizeSystemTags(values).filter(value => !automatic.has(value))
}

const fieldLabels = ['能力标签', '接入系统', '典型使用场景', '输入要求', '输出形式', '使用限制', '不支持的任务类型', '不支持的任务', '不覆盖的部门 / 品类 / 渠道 / 时间段', '业务范围']
const labelPattern = /^\s*([^：:]+)[：:]\s*(.*)$/
function recognizedLabel(line: string) { const match = labelPattern.exec(line); return match && fieldLabels.includes(match[1]!.trim()) ? match : null }
function isStructured(content: string) { return /(?:^|\n)\s*(?:\d+[.、．]\s*)?(?:能力范围|能力边界|能做什么|不能做什么)/u.test(content) && content.split('\n').some(line => recognizedLabel(line)) }
function parseLabel(content: string, labels: string[]) {
  const result: string[] = []
  let capturing = false
  for (const line of content.split('\n')) {
    const match = recognizedLabel(line)
    if (match) {
      if (capturing) break
      capturing = labels.includes(match[1]!.trim())
      if (capturing) result.push(match[2] ?? '')
    } else if (capturing) {
      if (/^\s*\d+[.、．]\s*(?:能力范围|能力边界|基本信息|能做什么|不能做什么|知识边界|置信与使用约束|使用约束)/u.test(line)) break
      result.push(line)
    }
  }
  return result.join('\n').trim()
}
export function usageFormFromContent(content: string): UsageForm {
  const form = createUsageForm()
  if (!isStructured(content)) { form.limits = content.trim(); return form }
  form.systems = normalizeSystemTags(parseLabel(content, ['能力标签', '接入系统', '典型使用场景']).split(/[、,，]/))
  form.input = parseLabel(content, ['输入要求'])
  form.output = parseLabel(content, ['输出形式'])
  const unsupported = parseLabel(content, ['使用限制', '不支持的任务类型', '不支持的任务'])
  const scope = parseLabel(content, ['不覆盖的部门 / 品类 / 渠道 / 时间段', '业务范围'])
  form.limits = [unsupported, scope].filter(Boolean).join('；')
  return form
}
export function usageContentFromForm(form: UsageForm, _meta: Record<string, unknown> = {}) {
  return `1. 能力范围\n能力标签：${normalizeSystemTags(form.systems).join('、')}\n输入要求：${form.input.trim()}\n输出形式：${form.output.trim()}\n\n2. 能力边界\n使用限制：${form.limits.trim()}`
}
export function validateUsageForm(form: UsageForm, forPublication = true): string | null {
  const systems = normalizeSystemTags(form.systems)
  if (systems.length > 8) return '「接入系统」最多 8 项'
  if (systems.some(value => value.length < 1 || value.length > 8)) return '每个「接入系统」需为 1–8 个字符'
  if (form.input.length > USAGE_TEXT_MAX_LENGTH) return '「输入要求」最多 500 字符'
  if (form.output.length > USAGE_TEXT_MAX_LENGTH) return '「输出形式」最多 500 字符'
  if (form.limits.length > USAGE_TEXT_MAX_LENGTH) return '「使用限制」最多 500 字符'
  if (!forPublication) return null
  if (!systems.length) return '请填写「接入系统」'
  if (!form.limits.trim()) return '请填写「使用限制」'
  return null
}
export function validateUsageInstructions(content: string, forPublication = true): string | null {
  return validateUsageForm(usageFormFromContent(content), forPublication)
}
export function usageSections(content: string) {
  if (!content.trim()) return []
  if (!isStructured(content)) return [{ title: '使用说明', body: content }]
  const form = usageFormFromContent(content)
  return [
    { title: '能力范围', body: `能力标签：${form.systems.join('、')}\n输入要求：${form.input}\n输出形式：${form.output}` },
    { title: '能力边界', body: `使用限制：${form.limits}` },
  ]
}
export type UsageDetailSection = { title: string; fields: { label: string; value: string }[] }
const PLATFORM_FORMATS = new Set(['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'TXT', 'MD', 'CSV', 'PPTX', 'JPG', 'JPEG'])
function dateLabel(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return '未提供'
  const parts = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-')
}
export function usageDetailSections(content: string, agent?: Agent): UsageDetailSection[] {
  const form = usageFormFromContent(content)
  const sections: UsageDetailSection[] = []
  if (agent) {
    const formats = agent.capabilities?.supportedFileFormats
    const allowedFormats = formats?.map(value => value.replace(/^\./, '').toUpperCase()).filter(value => PLATFORM_FORMATS.has(value))
    sections.push({ title: '基本信息', fields: [
      { label: '负责人', value: agent.developerName ? `${agent.developerName}${agent.developerDepartment ? `（${agent.developerDepartment}）` : ''}` : '未提供' },
      { label: '上线时间', value: dateLabel(agent.firstPublishedAt) },
      { label: '更新时间', value: dateLabel(agent.publishedAt) },
      { label: '支持文件格式', value: allowedFormats === undefined ? '未提供' : [...new Set(allowedFormats)].join('、') || '未配置' },
    ] })
  }
  sections.push({ title: '能力范围', fields: [
    { label: '能力标签', value: form.systems.join('、') || '暂未配置' },
    ...(form.input ? [{ label: '输入要求', value: form.input }] : []),
    ...(form.output ? [{ label: '输出形式', value: form.output }] : []),
  ] })
  sections.push({ title: '能力边界', fields: [{ label: '使用限制', value: form.limits || '暂未配置' }] })
  if (agent) {
    const knowledge = (agent.capabilities?.knowledgeBases ?? agent.knowledgeBaseIds.map(id => ({ id, name: knowledgeBases.find(item => item.id === id)?.name || '未提供名称', lastSuccessfulSyncAt: undefined })))
      .map(item => ({ ...item, name: item.name?.trim() || '未提供名称' }))
    const internet = agent.capabilities?.internetEnabled
    sections.push({ title: '知识边界', fields: [
      { label: '引用知识库', value: knowledge.map(item => item.name).join('、') || (agent.capabilities?.selectedDocumentNames?.length ? '未提供' : '未引用知识库') },
      { label: '是否支持联网', value: internet === undefined ? '未提供' : internet ? '支持' : '不支持' },
      { label: '知识更新时间', value: knowledge.length ? knowledge.map(item => `${item.name}：${dateLabel(item.lastSuccessfulSyncAt)}`).join('\n') : agent.capabilities?.selectedDocumentNames?.length ? '未提供' : '未引用知识库' },
    ] })
    sections.push({ title: '使用约束', fields: [{ label: '', value: FIXED_USAGE_NOTICE }] })
  }
  return sections
}
export function demoUsageInstructions(agent: Agent) {
  const systemByCategory: Record<Agent['category'], string[]> = {
    finance_admin: ['企业知识库'], supply_chain: ['商品中心', '数据平台'], marketing: ['内容平台', '联网'],
    tech_dev: ['数据平台'], customer_service: ['客服系统'], retail_ops: ['门店系统', '商品中心'],
  }
  return usageContentFromForm({ systems: systemByCategory[agent.category], input: '说明任务目标、业务范围和时间；按需上传已授权文件', output: '分析结论、说明、表格或报告', limits: '不支持未授权数据；不支持超出已接入业务范围的查询；关键结论需人工复核' })
}
