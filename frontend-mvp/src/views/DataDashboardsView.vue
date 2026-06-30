<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { LayoutDashboard, Loader2 } from 'lucide-vue-next'

const store = useAppStore()

interface DashboardItem { id: string; name: string; category: string; url: string }

const dashboards = ref<DashboardItem[]>([
  { id: '1', name: '销售核心看板', category: '销售', url: 'https://bi.tianma.com/sales' },
  { id: '2', name: '方案中心效能', category: '方案', url: 'https://bi.tianma.com/solution' },
  { id: '3', name: '商品库存大盘', category: '商品', url: 'https://bi.tianma.com/inventory' },
  { id: '4', name: '客户分析', category: '客户', url: 'https://bi.tianma.com/customers' },
])

const activeDashboard = ref<DashboardItem>(dashboards.value[0])
const iframeLoading = ref(true)

function switchDashboard(d: DashboardItem) { activeDashboard.value = d; iframeLoading.value = true }
function onIframeLoad() { iframeLoading.value = false }
function dashboardUrl(d: DashboardItem): string {
  const token = (store.user as Record<string, unknown>)?.token || ''
  return `${d.url}?token=${token}`
}
</script>

<template>
  <div class="flex h-[calc(100vh-64px)] flex-col">
    <div class="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-zinc-200 px-4 py-3">
      <LayoutDashboard class="mr-2 h-5 w-5 text-blue-600" />
      <button v-for="d in dashboards" :key="d.id" class="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition" :class="activeDashboard.id === d.id ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'" @click="switchDashboard(d)">{{ d.name }}</button>
    </div>
    <div class="relative flex-1">
      <div v-if="iframeLoading" class="absolute inset-0 flex items-center justify-center bg-zinc-50">
        <div class="flex flex-col items-center gap-3"><Loader2 class="h-8 w-8 animate-spin text-blue-600" /><span class="text-sm text-zinc-400">加载看板中...</span></div>
      </div>
      <iframe :src="dashboardUrl(activeDashboard)" class="h-full w-full border-0" sandbox="allow-scripts allow-same-origin allow-forms" @load="onIframeLoad" />
    </div>
  </div>
</template>
