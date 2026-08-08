<script setup lang="ts">
import { ref, computed } from 'vue'
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Medal, Star } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { usageRanking, demandRanking, opinionLeaderRanking, departmentRanking } from '@/mock/rankings'
import { RANKING_META, type RankingPeriod, type RankingType, type RankingEntry, type DeptRankingEntry } from '@/types/points'
import { cn } from '@/lib/utils'

const rankingTab = ref<RankingType>('usage')
const period = ref<RankingPeriod>('monthly')

const periods: { key: RankingPeriod; label: string }[] = [
  { key: 'daily', label: '日榜' },
  { key: 'weekly', label: '周榜' },
  { key: 'monthly', label: '月榜' },
]

const rankingTabs: { key: RankingType; label: string }[] = [
  { key: 'usage', label: '使用者排名' },
  { key: 'demand', label: '提需求排名' },
  { key: 'opinion_leader', label: '意见领袖' },
  { key: 'department', label: '部门价值排名' },
]

const userData = computed<RankingEntry[]>(() => {
  const map: Record<Exclude<RankingType, 'department'>, Record<RankingPeriod, RankingEntry[]>> = {
    usage: usageRanking,
    demand: demandRanking,
    opinion_leader: opinionLeaderRanking,
  }
  if (rankingTab.value === 'department') return []
  return map[rankingTab.value as Exclude<RankingType, 'department'>]?.[period.value] ?? []
})

const deptData = computed<DeptRankingEntry[]>(() => {
  if (rankingTab.value === 'department') return departmentRanking[period.value] ?? []
  return []
})

const isDept = computed(() => rankingTab.value === 'department')

const userTop3 = computed(() => userData.value.slice(0, 3))
const userRest = computed(() => userData.value.slice(3))
const deptTop3 = computed(() => deptData.value.slice(0, 3))
const deptRest = computed(() => deptData.value.slice(3))

function rankChangeIcon(change: number) {
  if (change > 0) return TrendingUp
  if (change < 0) return TrendingDown
  return Minus
}
function rankChangeColor(change: number) {
  if (change > 0) return 'text-emerald-500'
  if (change < 0) return 'text-red-500'
  return 'text-muted-foreground'
}
function rankChangeSymbol(change: number) {
  if (change > 0) return `↑${change}`
  if (change < 0) return `↓${Math.abs(change)}`
  return '-'
}

const podiumColors = ['bg-amber-400', 'bg-zinc-300', 'bg-amber-700']
const podiumIcons = [Trophy, Medal, Star]
</script>

<template>
  <div class="container py-6">
    <h1 class="mb-2 text-2xl font-bold tracking-tight">排名中心</h1>
    <p class="mb-6 text-sm text-muted-foreground">全集团AI参与度排名，日/周/月持续更新</p>

    <!-- Period Tabs -->
    <div class="mb-4 flex items-center gap-1 rounded-lg border p-1 w-fit">
      <Button
        v-for="p in periods"
        :key="p.key"
        :variant="period === p.key ? 'default' : 'ghost'"
        size="sm"
        @click="period = p.key"
      >
        {{ p.label }}
      </Button>
    </div>

    <!-- Ranking Type Tabs -->
    <div class="mb-8 flex flex-wrap gap-1 rounded-lg border p-1 w-fit">
      <Button
        v-for="t in rankingTabs"
        :key="t.key"
        :variant="rankingTab === t.key ? 'default' : 'ghost'"
        size="sm"
        @click="rankingTab = t.key"
      >
        {{ t.label }}
      </Button>
    </div>

    <p class="mb-4 text-sm text-muted-foreground">{{ RANKING_META[rankingTab].description }}</p>

    <!-- User Rankings -->
    <template v-if="!isDept">
      <!-- Podium TOP 3 -->
      <div v-if="userTop3.length >= 3" class="mb-10 grid grid-cols-3 gap-4 items-end max-w-xl mx-auto">
        <!-- 2nd -->
        <div class="flex flex-col items-center gap-2">
          <Avatar class="h-14 w-14 ring-2 ring-zinc-300">
            <AvatarFallback class="bg-zinc-200 text-zinc-600 text-lg font-bold">{{ userTop3[1].userName[0] }}</AvatarFallback>
          </Avatar>
          <span class="text-sm font-semibold">{{ userTop3[1].userName }}</span>
          <span class="text-xs text-muted-foreground">{{ userTop3[1].department }}</span>
          <div class="flex items-center gap-1 text-xl font-bold text-zinc-500">2</div>
          <div class="w-full rounded-t-lg bg-zinc-300 h-20 flex items-center justify-center">
            <Medal class="h-8 w-8 text-white" />
          </div>
        </div>
        <!-- 1st -->
        <div class="flex flex-col items-center gap-2">
          <div class="relative">
            <Crown class="absolute -top-4 -right-2 h-6 w-6 text-amber-400 rotate-12" />
            <Avatar class="h-16 w-16 ring-2 ring-amber-400">
              <AvatarFallback class="bg-amber-100 text-amber-600 text-xl font-bold">{{ userTop3[0].userName[0] }}</AvatarFallback>
            </Avatar>
          </div>
          <span class="text-sm font-semibold">{{ userTop3[0].userName }}</span>
          <span class="text-xs text-muted-foreground">{{ userTop3[0].department }}</span>
          <div class="flex items-center gap-1 text-2xl font-bold text-amber-500">1</div>
          <div class="w-full rounded-t-lg bg-amber-400 h-28 flex items-center justify-center">
            <Trophy class="h-10 w-10 text-white" />
          </div>
        </div>
        <!-- 3rd -->
        <div class="flex flex-col items-center gap-2">
          <Avatar class="h-12 w-12 ring-2 ring-amber-700">
            <AvatarFallback class="bg-amber-200 text-amber-800 text-lg font-bold">{{ userTop3[2].userName[0] }}</AvatarFallback>
          </Avatar>
          <span class="text-sm font-semibold">{{ userTop3[2].userName }}</span>
          <span class="text-xs text-muted-foreground">{{ userTop3[2].department }}</span>
          <div class="flex items-center gap-1 text-xl font-bold text-amber-700">3</div>
          <div class="w-full rounded-t-lg bg-amber-700 h-16 flex items-center justify-center">
            <Star class="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      <!-- Rest of list -->
      <div class="space-y-2 max-w-xl">
        <div
          v-for="item in userRest"
          :key="item.userId"
          class="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors"
        >
          <span class="w-8 text-center text-lg font-bold text-muted-foreground">{{ item.rank }}</span>
          <span :class="cn('flex items-center gap-1 text-xs min-w-10', rankChangeColor(item.rankChange))">
            <component :is="rankChangeIcon(item.rankChange)" class="h-3 w-3" />
            {{ rankChangeSymbol(item.rankChange) }}
          </span>
          <Avatar class="h-8 w-8">
            <AvatarFallback class="text-xs">{{ item.userName[0] }}</AvatarFallback>
          </Avatar>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ item.userName }}</p>
            <p class="text-xs text-muted-foreground">{{ item.department }}</p>
          </div>
          <span class="text-sm font-semibold text-primary">{{ item.score }}分</span>
        </div>
      </div>
    </template>

    <!-- Department Rankings -->
    <template v-else>
      <div class="space-y-3 max-w-2xl">
        <div
          v-for="item in deptData"
          :key="item.department"
          class="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/30 transition-colors"
        >
          <span class="text-2xl font-bold min-w-10" :class="item.rank <= 3 ? 'text-primary' : 'text-muted-foreground'">{{ item.rank }}</span>
          <span :class="cn('flex items-center gap-1 text-xs min-w-10', rankChangeColor(item.rankChange))">
            <component :is="rankChangeIcon(item.rankChange)" class="h-3 w-3" />
            {{ rankChangeSymbol(item.rankChange) }}
          </span>
          <div class="flex-1">
            <p class="text-sm font-semibold">{{ item.department }}</p>
            <p class="text-xs text-muted-foreground">AI渗透率：{{ item.aiPenetration }} · 提效：{{ item.efficiencyGain }}</p>
          </div>
          <div class="grid grid-cols-3 gap-3 text-right text-xs">
            <div><span class="text-muted-foreground">Token</span><br/><span class="font-semibold">{{ item.tokenConsumed }}</span></div>
            <div><span class="text-muted-foreground">AI渗透率</span><br/><span class="font-semibold">{{ item.aiPenetration }}</span></div>
            <div><span class="text-muted-foreground">提效</span><br/><span class="font-semibold text-emerald-500">{{ item.efficiencyGain }}</span></div>
          </div>
          <span class="text-lg font-bold text-primary min-w-16 text-right">{{ item.score }}分</span>
        </div>
      </div>
    </template>
  </div>
</template>
