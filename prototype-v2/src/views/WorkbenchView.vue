<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, ExternalLink, Grid3X3 } from 'lucide-vue-next'
import { portalItems } from '@/mock/portals'
import type { PortalItem } from '@/types'

const searchQuery = ref('')
const activeCategory = ref('全部')

const categories = computed(() => {
  const cats = [...new Set(portalItems.map(p => p.category))]
  return ['全部', ...cats]
})

const filtered = computed(() => {
  let items = portalItems
  if (activeCategory.value !== '全部') {
    items = items.filter(p => p.category === activeCategory.value)
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    items = items.filter(p => p.name.toLowerCase().includes(q))
  }
  return items
})

const iconMap: Record<string, string> = {
  Database: '🗄️', FileText: '📄', Users: '👥', UserCheck: '✅',
  BarChart3: '📊', Kanban: '📋', BookOpen: '📚', Receipt: '🧾',
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <div class="mb-6">
      <h1 class="text-heading-sm font-semibold text-ink">工作台</h1>
      <p class="mt-1 text-body-sm text-stone">企业系统快捷入口</p>
    </div>

    <!-- Search -->
    <div class="relative mb-6 max-w-md">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索系统名称..."
        class="w-full rounded-xl border border-hairline bg-white py-2.5 pl-10 pr-4 text-body-sm outline-none transition placeholder:text-muted focus:border-brand-blue"
      />
    </div>

    <!-- Category tabs -->
    <div class="mb-6 flex flex-wrap gap-2">
      <button
        v-for="cat in categories"
        :key="cat"
        class="rounded-full border px-3 py-1.5 text-xs font-medium transition"
        :class="activeCategory === cat ? 'border-ink bg-ink text-white' : 'border-hairline text-stone hover:bg-surface'"
        @click="activeCategory = cat"
      >
        {{ cat }}
      </button>
    </div>

    <!-- Grid -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <button
        v-for="portal in filtered"
        :key="portal.id"
        class="group rounded-xl border border-hairline bg-white p-5 text-left transition hover:border-brand-blue hover:shadow-elevated"
      >
        <div class="mb-3 text-3xl">{{ iconMap[portal.icon] || '🔗' }}</div>
        <h3 class="text-body-md font-semibold text-charcoal">{{ portal.name }}</h3>
        <p class="mt-1 text-body-sm text-stone">{{ portal.description }}</p>
        <div class="mt-3 flex items-center gap-1 text-xs text-brand-blue opacity-0 transition group-hover:opacity-100">
          <span>打开 <ExternalLink class="h-3 w-3" /></span>
        </div>
      </button>
    </div>

    <div v-if="filtered.length === 0" class="py-16 text-center text-body-sm text-muted">
      无匹配系统
    </div>
  </div>
</template>
