import { ref } from 'vue'
import { homeData } from '@/mock/home'
import type { HomeData } from '@/types/home'

const data = ref<HomeData | null>(null)
const loading = ref(false)
let loaded = false

export function useHome() {
  async function load(force = false) {
    if (loaded && !force) return
    loading.value = true
    await new Promise((r) => setTimeout(r, 600))
    data.value = homeData
    loaded = true
    loading.value = false
  }

  return { data, loading, load }
}
