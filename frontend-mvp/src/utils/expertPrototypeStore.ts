import { computed, reactive } from 'vue'
import { agents, dailyAssistant } from '@/mock/agents'
import { legacyAgents } from '@/mock/legacyAgents'
import { getBusinessExpertAvatarUrl } from '@/mock/businessExpertAvatars'
import type { Agent } from '@/types/agent'
import { validateUsageInstructions } from '@/utils/agentUsage'

// Local prototype only: publication mirrors an approved release, not a real approval service.
export const EXPERT_PROTOTYPE_KEY = 'tianma.prototype.expert-publications.v1'
const legacyExpertIds = new Set(legacyAgents.map(agent => agent.id))
const isCurrentExpert = (agent: Agent) => !legacyExpertIds.has(agent.id) && agent.id !== 'assistant' && agent.id !== dailyAssistant.id
// Release snapshot: later local publications must not enter the one-time favorites rollout.
export const EXPERT_FAVORITE_ROLLOUT_IDS: readonly string[] = agents.filter(agent => isCurrentExpert(agent) && agent.isPublished && agent.reviewStatus === 'approved').map(agent => agent.id)
export const expertAgents = reactive(agents.filter(isCurrentExpert))
type Publication = { draft: Agent; published: Agent | null; deleted?: true }
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const publications = reactive<Record<string, Publication>>({})
for (const agent of [...agents, dailyAssistant]) {
  publications[agent.id] = { draft: clone(agent), published: agent.isPublished && agent.reviewStatus === 'approved' ? clone(agent) : null }
}

function isAgent(value: unknown): value is Agent {
  if (!value || typeof value !== 'object') return false
  const agent = value as Partial<Agent>
  return typeof agent.id === 'string' && typeof agent.name === 'string' && typeof agent.usageInstructions === 'string' && Array.isArray(agent.quickCommands) && typeof agent.category === 'string'
}
const legacyBusinessAvatarFiles: Readonly<Record<string, string>> = {
  'biz-02': 'assortment-expert.png', 'biz-03': 'review-analyst.png',
  'biz-04': 'inspiration-king.png', 'biz-09': 'inspiration-king.png',
}
function migrateBusinessAvatar(agent: Agent): boolean {
  if (!/^biz-(0[1-9]|1[0-8])$/.test(agent.id)) return false
  const replacement = getBusinessExpertAvatarUrl(agent.id)
  const oldFile = legacyBusinessAvatarFiles[agent.id] ?? 'data-analysis.png'
  if (!replacement || !['/PORTL/assets/agents-online/' + oldFile, '/assets/agents-online/' + oldFile].includes(agent.avatarUrl)) return false
  agent.avatarUrl = replacement
  return true
}

try {
  const saved: unknown = JSON.parse(localStorage.getItem(EXPERT_PROTOTYPE_KEY) ?? '{}')
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    const savedRecords = saved as Record<string, unknown>
    let avatarsChanged = false
    for (const [id, value] of Object.entries(savedRecords)) {
      const record = value as Publication
      if (!record || !isAgent(record.draft) || record.draft.id !== id || (record.published !== null && (!isAgent(record.published) || record.published.id !== id))) continue
      const hydrated = clone(record)
      const draftAvatarChanged = migrateBusinessAvatar(hydrated.draft)
      const publishedAvatarChanged = hydrated.published ? migrateBusinessAvatar(hydrated.published) : false
      if (draftAvatarChanged || publishedAvatarChanged) {
        savedRecords[id] = clone(hydrated)
        avatarsChanged = true
      }
      publications[id] = hydrated
      if (hydrated.deleted) removeCurrentExpert(id)
      else if (hydrated.published) syncPublished(hydrated.published)
    }
    if (avatarsChanged) {
      // Only replace known illustrations; a failed cache write must not interrupt loading.
      try { localStorage.setItem(EXPERT_PROTOTYPE_KEY, JSON.stringify(savedRecords)) } catch { /* Retry from the old cache on the next load. */ }
    }
  }
} catch { /* Unavailable or invalid local prototype storage leaves the supplied examples intact. */ }

function removeCurrentExpert(id: string) {
  const index = expertAgents.findIndex(item => item.id === id)
  if (index >= 0) expertAgents.splice(index, 1)
}
function syncPublished(agent: Agent) {
  // Retain legacy publications for history without restoring them to selectable experts.
  if (!isCurrentExpert(agent) || isExpertDeleted(agent.id)) return
  const index = expertAgents.findIndex(item => item.id === agent.id)
  if (index < 0) expertAgents.push(clone(agent))
  else expertAgents.splice(index, 1, clone(agent))
}

export const expertDrafts = computed(() => Object.values(publications).filter(record => !record.deleted && !legacyExpertIds.has(record.draft.id) && record.draft.id !== 'assistant').map(record => clone(record.draft)))
export function isExpertDeleted(id: string) { return publications[id]?.deleted === true }
export function getExpertDraft(id: string) { return publications[id] && !isExpertDeleted(id) ? clone(publications[id]!.draft) : null }
export function getPublishedExpert(id: string) { return !isExpertDeleted(id) && publications[id]?.published ? clone(publications[id]!.published) : null }
export function getHistoricalExpert(id: string): Agent | null {
  const mappedId = id === 'assistant' ? dailyAssistant.id : id
  // Deleted records retain their last publication only for existing conversation history.
  const published = publications[id]?.published ?? (mappedId !== id ? publications[mappedId]?.published : null)
  if (published) return clone(published)
  const supplied = legacyAgents.find(agent => agent.id === id) ?? (mappedId === dailyAssistant.id ? dailyAssistant : null)
  return supplied ? clone(supplied) : null
}

function persist(id: string, record: Publication): string | null {
  try {
    localStorage.setItem(EXPERT_PROTOTYPE_KEY, JSON.stringify({ ...publications, [id]: record }))
    publications[id] = clone(record)
    return null
  } catch { return '本地保存失败，请重试；已发布内容未改变' }
}

export function deleteExpert(id: string): string | null {
  const current = publications[id]
  if (!current || current.deleted) return '未找到该智能体，请刷新后重试'
  // A tombstone prevents supplied defaults from restoring a locally deleted expert.
  const error = persist(id, { ...clone(current), deleted: true })
  if (error) return error
  removeCurrentExpert(id)
  return null
}

export function setExpertStatus(id: string, status: Agent['status']): string | null {
  const current = publications[id]
  if (!current || current.deleted) return '未找到该智能体，请刷新后重试'
  const next: Publication = {
    draft: { ...clone(current.draft), status },
    published: current.published ? { ...clone(current.published), status } : null,
  }
  const error = persist(id, next)
  if (error) return error
  if (next.published) syncPublished(next.published)
  return null
}
export function saveExpertDraft(agent: Agent): string | null {
  if (isExpertDeleted(agent.id)) return '该智能体已删除，请关闭编辑后重试'
  const error = validateUsageInstructions(agent.usageInstructions, false)
  if (error) return error
  return persist(agent.id, { draft: clone(agent), published: getPublishedExpert(agent.id) })
}

export function publishExpertDraft(agent: Agent): string | null {
  if (isExpertDeleted(agent.id)) return '该智能体已删除，请关闭编辑后重试'
  const error = validateUsageInstructions(agent.usageInstructions)
  if (error) return error
  const previous = getPublishedExpert(agent.id)
  const releasedAt = new Date(Date.now()).toISOString()
  const snapshot = { ...clone(agent), isPublished: true, reviewStatus: 'approved' as const, firstPublishedAt: previous ? previous.firstPublishedAt : releasedAt, publishedAt: releasedAt }
  const persistError = persist(agent.id, { draft: clone(snapshot), published: clone(snapshot) })
  if (persistError) return persistError
  syncPublished(snapshot)
  return null
}
