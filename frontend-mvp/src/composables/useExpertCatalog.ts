import { computed, getCurrentInstance, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { Pinia } from 'pinia'
import { useAppStore } from '@/stores/app'
import { expertAgents as agents, EXPERT_FAVORITE_ROLLOUT_IDS } from '@/utils/expertPrototypeStore'
import type { Agent } from '@/types/agent'

// Local prototype only. The production catalogue and favorites APIs are scoped to the signed-in user.
export const LEGACY_FAVORITES_KEY = 'tianma.prototype.expert-favorites.v1'
export const FAVORITES_KEY = 'tianma.prototype.expert-favorites.v2'
export const FAVORITES_LIMIT = 18
const LEGACY_OWNER_KEY = LEGACY_FAVORITES_KEY + ':owner'
export const favoritesStorageKey = (userId: string) => FAVORITES_KEY + ':' + encodeURIComponent(userId)
type FavoriteRecord = { initialized: true; ids: string[] }
const favoritesByUser = reactive<Record<string, string[]>>({})
const uniqueIds = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && !!id))] : []
const isExpertPublished = (agent: Agent) => agent.isPublished && agent.reviewStatus === 'approved'
export const isExpertAvailable = (agent: Agent) => isExpertPublished(agent) && agent.status === 'online'
function storedUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('tianma_ai_user') ?? 'null')
    return typeof user?.id === 'string' ? user.id : 'prototype'
  } catch { return 'prototype' }
}
function loadFavorites(userId: string) {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(favoritesStorageKey(userId)) ?? 'null')
    const record = value as Partial<FavoriteRecord> | null
    if (record && record.initialized === true && Array.isArray(record.ids)) {
      const savedIds = uniqueIds(record.ids)
      const oldDefaultIds = Array.from({ length: 9 }, (_, index) => 'ag0' + (index + 1))
      // Replace the untouched placeholder default only. Never refill a user's empty or edited list.
      if (savedIds.length === oldDefaultIds.length && oldDefaultIds.every(id => savedIds.includes(id))) {
        const currentIds = agents.filter(agent => isExpertPublished(agent) && EXPERT_FAVORITE_ROLLOUT_IDS.includes(agent.id)).map(agent => agent.id)
        try {
          localStorage.setItem(favoritesStorageKey(userId), JSON.stringify({ initialized: true, ids: currentIds }))
          favoritesByUser[userId] = currentIds
        } catch { favoritesByUser[userId] = savedIds }
      } else favoritesByUser[userId] = savedIds
      return
    }
    // One-time rollout: keep previous IDs and add the release snapshot, filtered to the user's currently visible published catalogue.
    // A completed empty list must never be treated as an uninitialized account.
    let legacy: string[] = []
    const owner = localStorage.getItem(LEGACY_OWNER_KEY)
    if (!owner || owner === userId) legacy = uniqueIds(JSON.parse(localStorage.getItem(LEGACY_FAVORITES_KEY) ?? '[]'))
    const ids = [...new Set([...legacy, ...agents.filter(agent => isExpertPublished(agent) && EXPERT_FAVORITE_ROLLOUT_IDS.includes(agent.id)).map(agent => agent.id)])]
    localStorage.setItem(favoritesStorageKey(userId), JSON.stringify({ initialized: true, ids }))
    if (legacy.length && !owner) localStorage.setItem(LEGACY_OWNER_KEY, userId)
    favoritesByUser[userId] = ids
  } catch { favoritesByUser[userId] = [] }
}

export function useExpertCatalog() {
  const pinia = getCurrentInstance()?.appContext.config.globalProperties.$pinia as Pinia | undefined
  const app = pinia ? useAppStore(pinia) : null
  const identityRevision = ref(0)
  const userId = computed(() => { void identityRevision.value; return app ? app.user?.id ?? 'prototype' : storedUserId() })
  const favoriteError = ref('')
  const reload = () => { loadFavorites(userId.value); favoriteError.value = '' }
  watch(userId, reload, { immediate: true })
  const sync = (event: StorageEvent) => {
    if (event.key === 'tianma_ai_user' || event.key === null) identityRevision.value++
    if (event.key === favoritesStorageKey(userId.value) || event.key === null) reload()
  }
  onMounted(() => { reload(); window.addEventListener('storage', sync) })
  onBeforeUnmount(() => window.removeEventListener('storage', sync))
  const favoriteOrder = computed(() => favoritesByUser[userId.value] ?? [])
  const favoriteIds = computed(() => new Set(favoriteOrder.value))
  const favoriteExperts = computed(() => favoriteOrder.value.map(id => agents.find(agent => agent.id === id)).filter((agent): agent is Agent => !!agent && isExpertPublished(agent)))
  const favoriteCount = computed(() => favoriteExperts.value.length)
  const favoriteLimitReached = computed(() => favoriteCount.value >= FAVORITES_LIMIT)
  const availableExperts = computed(() => agents.filter(isExpertAvailable).sort((a, b) => a.id.localeCompare(b.id)))
  function toggleFavorite(agent: Agent) {
    favoriteError.value = ''
    const removing = favoriteIds.value.has(agent.id)
    if (!removing && !isExpertAvailable(agent)) { favoriteError.value = '该专家暂不可收藏'; return false }
    if (!removing && favoriteLimitReached.value) { favoriteError.value = '最多收藏 ' + FAVORITES_LIMIT + ' 位专家，请先取消其他收藏'; return false }
    const next = removing ? favoriteOrder.value.filter(id => id !== agent.id) : [agent.id, ...favoriteOrder.value]
    try {
      localStorage.setItem(favoritesStorageKey(userId.value), JSON.stringify({ initialized: true, ids: next }))
      favoritesByUser[userId.value] = next
      return true
    } catch { favoriteError.value = '收藏未保存，请重试'; return false }
  }
  return { favoriteIds, favoriteExperts, availableExperts, toggleFavorite, favoriteCount, favoriteLimitReached, favoriteError }
}
