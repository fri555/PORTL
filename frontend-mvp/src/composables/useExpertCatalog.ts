import { computed } from 'vue'
import { expertAgents as agents } from '@/utils/expertPrototypeStore'
import type { Agent } from '@/types/agent'

const isExpertPublished = (agent: Agent) => agent.isPublished && agent.reviewStatus === 'approved'
export const isExpertAvailable = (agent: Agent) => isExpertPublished(agent) && agent.status === 'online' && agent.usePermission !== false

export function useExpertCatalog() {
  const availableExperts = computed(() => agents.filter(isExpertAvailable).sort((a, b) => a.id.localeCompare(b.id)))
  return { availableExperts }
}
