import { ref, shallowRef, type Ref, type ShallowRef } from 'vue'

interface CachedBoardState<T> {
  data: T
  refreshedAt: string
}

function hasData(value: unknown) {
  if (Array.isArray(value)) return value.length > 0
  return value !== null && value !== undefined
}

export function useWorkbenchBoardState<T>(
  identity: string,
  board: string,
  loader: () => Promise<T>,
  fallback: T,
): {
  data: ShallowRef<T>
  refreshedAt: Ref<string>
  refreshing: Ref<boolean>
  error: Ref<string>
  refresh: () => Promise<void>
} {
  const key = `workbench:${identity}:${board}`
  let cached: CachedBoardState<T> | null = null
  try {
    const raw = window.sessionStorage.getItem(key)
    cached = raw ? JSON.parse(raw) as CachedBoardState<T> : null
  } catch {
    cached = null
  }

  const data = shallowRef<T>(cached?.data ?? fallback)
  const refreshedAt = ref(cached?.refreshedAt ?? '')
  const refreshing = ref(false)
  const error = ref('')

  async function refresh() {
    if (refreshing.value) return
    refreshing.value = true
    error.value = ''
    try {
      data.value = await loader()
      refreshedAt.value = new Date().toISOString()
      window.sessionStorage.setItem(key, JSON.stringify({ data: data.value, refreshedAt: refreshedAt.value }))
    } catch (caught) {
      const reason = caught instanceof Error ? caught.message : '数据加载失败'
      error.value = hasData(data.value) ? `${reason}；当前展示上次数据` : reason
    } finally {
      refreshing.value = false
    }
  }

  return { data, refreshedAt, refreshing, error, refresh }
}
