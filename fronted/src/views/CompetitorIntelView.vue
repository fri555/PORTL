<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search } from 'lucide-vue-next'
import { useCompetitors } from '@/composables/useCompetitors'
import { Input } from '@/components/ui/input'
import PageContainer from '@/components/common/PageContainer.vue'
import CompetitorCard from '@/components/competitor/CompetitorCard.vue'
import ThreatAlert from '@/components/competitor/ThreatAlert.vue'
import BenchmarkTable from '@/components/competitor/BenchmarkTable.vue'
import { cn } from '@/lib/utils'

const { competitorArticles, threatAlerts, benchmark } = useCompetitors()

type SubTab = 'all' | '竞品动态' | '行业对标' | '威胁预警'
const sub = ref<SubTab>('all')
const search = ref('')

const subTabs: { key: SubTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: '竞品动态', label: '竞品动态' },
  { key: '行业对标', label: '行业对标' },
  { key: '威胁预警', label: '威胁预警' },
]

const filtered = computed(() => {
  let list =
    sub.value === 'all' || sub.value === '威胁预警'
      ? competitorArticles()
      : competitorArticles(sub.value)
  if (sub.value === '威胁预警') list = list.filter((a) => a.threatLevel)
  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (a) => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q),
    )
  }
  return list
})

const threats = computed(() =>
  threatAlerts().filter((a) => a.threatLevel === 'high').slice(0, 2),
)
const bench = benchmark()
</script>

<template>
  <PageContainer title="⚔️ 竞对情报" :breadcrumb="['首页', '竞对情报']">
    <p class="-mt-4 mb-6 text-sm text-muted-foreground">同行动态，知己知彼 · 让全员感受"对手在用AI抢跑，我们必须行动"</p>

    <!-- threat alerts -->
    <div v-if="threats.length && (sub === 'all' || sub === '威胁预警')" class="mb-6 space-y-3">
      <h3 class="flex items-center gap-2 text-sm font-semibold text-red-600">
        🔴 威胁预警
      </h3>
      <ThreatAlert v-for="a in threats" :key="a.id" :article="a" />
    </div>

    <!-- sub tabs + search -->
    <div class="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
      <div class="flex flex-wrap items-center gap-1 rounded-md border p-1">
        <button
          v-for="t in subTabs"
          :key="t.key"
          :class="
            cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              sub === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )
          "
          @click="sub = t.key"
        >
          {{ t.label }}
        </button>
      </div>
      <div class="relative lg:ml-auto lg:w-64">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="search" placeholder="搜索情报…" class="pl-9" />
      </div>
    </div>

    <p class="mb-4 text-sm text-muted-foreground">共 {{ filtered.length }} 条情报</p>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <CompetitorCard v-for="a in filtered" :key="a.id" :article="a" />
    </div>

    <div class="mt-10">
      <BenchmarkTable :rows="bench.rows" :self="bench.self" />
    </div>
  </PageContainer>
</template>
