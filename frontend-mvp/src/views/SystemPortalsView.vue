<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { Globe, ExternalLink, Search } from 'lucide-vue-next'

const store = useAppStore()
const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)

interface PortalItem {
  id: string; name: string; logo: string; description: string
  category: string; url: string; ssoEnabled: boolean; sort: number
}

const portals = ref<PortalItem[]>([
  { id: '1', name: 'ERP 系统', logo: '📊', description: '企业资源计划管理系统', category: '业务系统', url: 'https://erp.tianma.com', ssoEnabled: true, sort: 1 },
  { id: '2', name: 'OA 办公', logo: '📋', description: '协同办公与流程审批', category: '协同工具', url: 'https://oa.tianma.com', ssoEnabled: true, sort: 2 },
  { id: '3', name: '钉钉工作台', logo: '💬', description: '即时通讯与协作平台', category: '协同工具', url: 'https://www.dingtalk.com', ssoEnabled: false, sort: 3 },
  { id: '4', name: 'HR 系统', logo: '👥', description: '人力资源管理平台', category: '业务系统', url: 'https://hr.tianma.com', ssoEnabled: true, sort: 4 },
  { id: '5', name: 'CRM 客户管理', logo: '🤝', description: '客户关系管理系统', category: '业务系统', url: 'https://crm.tianma.com', ssoEnabled: true, sort: 5 },
  { id: '6', name: 'BI 数据平台', logo: '📈', description: '商业智能与数据分析', category: '数据平台', url: 'https://bi.tianma.com', ssoEnabled: false, sort: 6 },
  { id: '7', name: '财务系统', logo: '💰', description: '财务管理与报销', category: '业务系统', url: 'https://finance.tianma.com', ssoEnabled: true, sort: 7 },
  { id: '8', name: '企业邮箱', logo: '📧', description: '企业邮件系统', category: '协同工具', url: 'https://mail.tianma.com', ssoEnabled: false, sort: 8 },
])

const categories = computed(() => [...new Set(portals.value.map(p => p.category))])
const filteredPortals = computed(() => {
  let result = portals.value
  if (selectedCategory.value) result = result.filter(p => p.category === selectedCategory.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    result = result.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
  }
  return result.sort((a, b) => a.sort - b.sort)
})

function handlePortalClick(portal: PortalItem) {
  if (portal.ssoEnabled) {
    const token = (store.user as Record<string, unknown>)?.token || ''
    window.open(`${portal.url}/sso/callback?token=${token}`, '_blank')
  } else {
    window.open(portal.url, '_blank')
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8">
    <div class="mb-8">
      <div class="flex items-center gap-3">
        <Globe class="h-7 w-7 text-blue-600" />
        <h1 class="text-2xl font-bold text-zinc-900">系统门户</h1>
      </div>
      <p class="mt-2 text-sm text-zinc-500">统一入口访问所有内部业务系统，无需重复登录</p>
    </div>
    <div class="mb-6 flex flex-wrap items-center gap-3">
      <div class="relative flex-1 max-w-sm">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input v-model="searchQuery" type="text" placeholder="搜索系统..." class="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100" />
      </div>
      <button v-for="cat in categories" :key="cat" class="rounded-full border px-3 py-1.5 text-xs font-medium transition" :class="selectedCategory === cat ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'" @click="selectedCategory = selectedCategory === cat ? null : cat">{{ cat }}</button>
    </div>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <button v-for="portal in filteredPortals" :key="portal.id" type="button" class="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md" @click="handlePortalClick(portal)">
        <div class="mb-3 flex items-start justify-between">
          <span class="text-3xl">{{ portal.logo }}</span>
          <ExternalLink class="mt-0.5 h-4 w-4 text-zinc-300 transition group-hover:text-blue-500" />
        </div>
        <strong class="mb-1 text-sm font-semibold text-zinc-900">{{ portal.name }}</strong>
        <p class="mb-3 text-xs leading-relaxed text-zinc-500">{{ portal.description }}</p>
        <div class="mt-auto flex items-center gap-2">
          <span class="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">{{ portal.category }}</span>
          <span v-if="portal.ssoEnabled" class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">免登</span>
        </div>
      </button>
    </div>
    <div v-if="filteredPortals.length === 0" class="py-20 text-center">
      <Globe class="mx-auto h-10 w-10 text-zinc-200" />
      <p class="mt-3 text-sm text-zinc-400">未找到匹配的系统</p>
    </div>
  </div>
</template>
