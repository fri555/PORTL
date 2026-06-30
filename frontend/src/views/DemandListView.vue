<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  MessageSquare, ThumbsUp, TrendingUp, Search, Filter,
  Trophy, Flame, ArrowUp, ArrowDown, Minus, Megaphone, BarChart3, List,
  Sparkles, Send, BellRing, MessageCircle,
} from 'lucide-vue-next'
import { demands } from '@/mock/demands'
import { usageRanking, demandRanking, opinionLeaderRanking } from '@/mock/rankings'
import { DEMAND_STATUS_META, type DemandStatus, type DemandTimelineEntry } from '@/types/demand'
import type { RankingPeriod, RankingType } from '@/types/points'
import { RANKING_META } from '@/types/points'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { timeAgo, formatNumber } from '@/lib/format'

const router = useRouter()

// Filters
const statusFilter = ref<string>('')
const deptFilter = ref<string>('')
const searchQuery = ref('')
const sidebarTab = ref<'rankings' | 'dashboard'>('rankings')
const funnelModalOpen = ref(false)
const funnelStage = ref<DemandStatus | 'all'>('all')
const assistantInput = ref('')
const assistantLoading = ref(false)
const assistantMessages = ref<Array<{ id: string; role: 'assistant' | 'user'; text: string }>>([
  { id: 'm1', role: 'assistant' as const, text: '你好，我可以帮你查询需求流转、查看最近上线功能、或者设置定时提醒。' },
])

const funnelData = computed(() => {
  const stages: { status: DemandStatus; label: string; count: number; color: string }[] = [
    { status: 'pending_review', label: '提交', count: demands.filter(d => d.status === 'pending_review').length, color: '#f59e0b' },
    { status: 'scheduled', label: '初审通过', count: demands.filter(d => d.status === 'scheduled').length, color: '#06b6d4' },
    { status: 'developing', label: '已排期', count: demands.filter(d => d.status === 'developing').length, color: '#6366f1' },
    { status: 'testing', label: '开发中', count: demands.filter(d => d.status === 'testing').length, color: '#8b5cf6' },
    { status: 'online', label: '已上线', count: demands.filter(d => d.status === 'online').length, color: '#10b981' },
    { status: 'completed', label: '已完成', count: demands.filter(d => d.status === 'completed').length, color: '#6b7280' },
  ]
  return stages
})

const totalDemands = demands.length
const closureRate = computed(() => {
  const closed = demands.filter(d => d.status === 'online' || d.status === 'completed').length
  return Math.round((closed / totalDemands) * 100)
})

const departments = computed(() => {
  const depts = new Set(demands.map((d) => d.department))
  return [...depts]
})

const filteredDemands = computed(() => {
  let list = demands
  if (statusFilter.value) list = list.filter((d) => d.status === statusFilter.value)
  if (deptFilter.value) list = list.filter((d) => d.department === deptFilter.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter((d) => d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || d.tags.some((t) => t.toLowerCase().includes(q)))
  }
  return list
})

const demandFlowOverview = computed(() => {
  const statusOrder: DemandStatus[] = ['pending_review', 'scheduled', 'developing', 'testing', 'online', 'completed']
  return statusOrder.map((status) => {
    const items = demands.filter((d) => d.status === status)
    return {
      status,
      label: DEMAND_STATUS_META[status].label,
      color: DEMAND_STATUS_META[status].color,
      count: items.length,
      items,
    }
  })
})

const recentFlowItems = computed(() =>
  [...demands]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 4)
    .map((d) => ({
      ...d,
      lastStep: d.timeline[d.timeline.length - 1],
      currentOwner: d.timeline[d.timeline.length - 1]?.operatorName ?? d.submitterName,
      currentRole: d.timeline[d.timeline.length - 1]?.operatorRole ?? '需求提出人',
    })),
)

const funnelDetails = computed(() => {
  if (funnelStage.value === 'all') return demands
  return demands.filter((d) => d.status === funnelStage.value)
})

function assistantReply(text: string) {
  const query = text.trim()
  const lower = query.toLowerCase()
  if (!query) return '你可以直接问我：我的需求到哪了、最近上线了什么、帮我设置提醒。'
  if (lower.includes('提醒') || lower.includes('定时')) {
    return '可以，我会帮你设置定时提醒。比如：每周一早上 9 点提醒你查看需求流转，或者需求状态变更后同步钉钉通知。'
  }
  if (lower.includes('上线') || lower.includes('新功能') || lower.includes('功能')) {
    const latestOnline = [...demands].filter((d) => d.status === 'online' || d.status === 'completed').sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 3)
    return `最近上线的功能包括：${latestOnline.map((d) => d.title).join('、')}。如果你要，我也可以继续帮你按部门或按时间筛选。`
  }
  if (lower.includes('流转') || lower.includes('需求') || lower.includes('状态')) {
    const pending = demands.filter((d) => d.status === 'pending_review').length
    const developing = demands.filter((d) => d.status === 'developing' || d.status === 'testing').length
    const online = demands.filter((d) => d.status === 'online' || d.status === 'completed').length
    return `当前需求池里，待评审 ${pending} 条，开发/测试中 ${developing} 条，已上线/完成 ${online} 条。你点上面的阶段卡片可以进一步查看具体需求和当前负责人。`
  }
  return '我已经收到你的问题了。你可以继续问我需求状态、负责人、上线功能，或者让我帮你生成提醒。'
}

async function submitAssistantPrompt(prompt?: string) {
  const text = (prompt ?? assistantInput.value).trim()
  if (!text) return
  assistantMessages.value.push({ id: `u-${Date.now()}`, role: 'user', text })
  assistantInput.value = ''
  assistantLoading.value = true
  await new Promise((resolve) => setTimeout(resolve, 500))
  assistantMessages.value.push({
    id: `a-${Date.now()}`,
    role: 'assistant',
    text: assistantReply(text),
  })
  assistantLoading.value = false
}

// Ranking sidebar
const rankingPeriod = ref<RankingPeriod>('weekly')
const rankingType = ref<RankingType>('usage')

const rankingData = computed(() => {
  if (rankingType.value === 'usage') return usageRanking[rankingPeriod.value]
  if (rankingType.value === 'demand') return demandRanking[rankingPeriod.value]
  return opinionLeaderRanking[rankingPeriod.value]
})

function goToDetail(id: string) {
  router.push({ name: 'demand-detail', params: { id } })
}

function goToCreate() {
  router.push({ name: 'demand-create' })
}

function goToRanking() {
  router.push({ name: 'rankings' })
}

function statusLabel(s: DemandStatus) { return DEMAND_STATUS_META[s]?.label ?? s }
function statusColor(s: DemandStatus) { return DEMAND_STATUS_META[s]?.color ?? '#6b7280' }

function openFunnelDetail(stage: DemandStatus | 'all') {
  funnelStage.value = stage
  funnelModalOpen.value = true
}

function getCurrentOwner(d: { timeline: DemandTimelineEntry[]; submitterName: string }) {
  return d.timeline[d.timeline.length - 1]?.operatorName ?? d.submitterName
}

function getCurrentRole(d: { timeline: DemandTimelineEntry[]; submitterName: string }) {
  return d.timeline[d.timeline.length - 1]?.operatorRole ?? '需求提出人'
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">
    <div class="flex gap-6">
      <!-- Main Content -->
      <div class="min-w-0 flex-1">
        <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <h1 class="text-xl font-bold sm:text-2xl">需求池</h1>
            <p class="mt-1 text-sm text-muted-foreground">AI需求收集、评审、排期与进度追踪</p>
          </div>
          <Button size="lg" class="gap-2 text-base font-semibold shadow-md sm:self-start" @click="goToCreate">
            <Megaphone class="h-5 w-5" /> 我要提需求
          </Button>
        </div>

        <div class="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button
            v-for="stage in demandFlowOverview"
            :key="stage.status"
            class="rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            @click="openFunnelDetail(stage.status)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-medium text-zinc-700">{{ stage.label }}</span>
              <span class="rounded-full px-2 py-0.5 text-[10px] font-medium" :style="{ backgroundColor: stage.color + '18', color: stage.color }">{{ stage.count }} 条</span>
            </div>
            <div class="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <span>点击查看具体需求与流转到谁</span>
            </div>
          </button>
        </div>

        <div class="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
          <div class="rounded-xl border bg-white p-4 shadow-sm">
            <div class="flex items-center justify-between gap-2">
              <div>
                <h2 class="text-sm font-semibold text-zinc-950">最近处理状态</h2>
                <p class="mt-0.5 text-xs text-zinc-500">展示需求当前流转到谁、最近更新时间和下一步状态</p>
              </div>
              <span class="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-500">{{ recentFlowItems.length }} 条</span>
            </div>
            <div class="mt-4 space-y-3">
              <div
                v-for="item in recentFlowItems"
                :key="item.id"
                class="flex flex-col gap-2 rounded-lg border border-zinc-100 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-zinc-950">{{ item.title }}</p>
                  <p class="mt-0.5 text-xs text-zinc-500">
                    当前流转到 <span class="font-medium text-zinc-700">{{ item.currentOwner }}</span>
                    <span class="mx-1">·</span>{{ item.currentRole }}
                  </p>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <span class="rounded-full px-2 py-0.5 font-medium" :style="{ backgroundColor: statusColor(item.status) + '18', color: statusColor(item.status) }">{{ statusLabel(item.status) }}</span>
                  <span class="text-zinc-500">{{ timeAgo(item.updatedAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="flex h-[400px] flex-col rounded-xl border bg-white p-4 shadow-sm">
            <div class="flex items-center justify-between gap-2">
              <div>
                <h2 class="flex items-center gap-1.5 text-sm font-semibold text-zinc-950">
                  <MessageCircle class="h-4 w-4 text-blue-600" />
                  AI需求助手
                </h2>
                <p class="mt-0.5 text-xs text-zinc-500">问状态、问新功能、设提醒、等钉钉通知</p>
              </div>
              <span class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">
                <Sparkles class="h-3 w-3" />
                对话式
              </span>
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              <button class="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100" @click="submitAssistantPrompt('我的需求现在到哪了')">
                查看流转状态
              </button>
              <button class="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100" @click="submitAssistantPrompt('最近上线了什么新功能')">
                看新功能
              </button>
              <button class="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100" @click="submitAssistantPrompt('帮我设置需求提醒')">
                <BellRing class="mr-1 inline h-3.5 w-3.5" />
                设置提醒
              </button>
            </div>

            <div class="mt-3 flex-1 space-y-3 overflow-y-auto rounded-xl bg-zinc-50 p-3">
              <div v-for="msg in assistantMessages" :key="msg.id" class="flex" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
                <div
                  class="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm"
                  :class="msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-700'"
                >
                  {{ msg.text }}
                </div>
              </div>
              <div v-if="assistantLoading" class="flex justify-start">
                <div class="rounded-2xl bg-white px-3 py-2 text-sm text-zinc-400 shadow-sm">AI思考中...</div>
              </div>
            </div>

            <div class="mt-2 flex items-end gap-2">
              <textarea
                v-model="assistantInput"
                rows="3"
                class="min-h-[76px] flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="例如：帮我看看AI商品图批量生成现在流转到谁了？"
                @keydown.enter.exact.prevent="submitAssistantPrompt()"
              />
              <Button class="gap-2" :disabled="!assistantInput.trim() || assistantLoading" @click="submitAssistantPrompt()">
                <Send class="h-4 w-4" />
                发送
              </Button>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="mb-5 space-y-3">
          <!-- Status tabs -->
          <div class="-mx-1 flex flex-nowrap items-center gap-1.5 overflow-x-auto rounded-lg border bg-zinc-50 p-1 px-1 no-scrollbar">
            <button
              :class="[
                'shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                !statusFilter ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              ]"
              @click="statusFilter = ''"
            >全部</button>
            <button
              v-for="s in (['pending_review','scheduled','developing','testing','online','completed'] as DemandStatus[])"
              :key="s"
              :class="[
                'shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                statusFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              ]"
              @click="statusFilter = s"
            >{{ DEMAND_STATUS_META[s].label }}</button>
          </div>

          <!-- Dept + Search -->
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select v-model="deptFilter" class="w-full rounded-lg border px-3 py-2 text-xs text-muted-foreground sm:w-auto sm:py-1.5">
              <option value="">全部部门</option>
              <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
            </select>
            <div class="relative min-w-0 flex-1 sm:max-w-xs">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input v-model="searchQuery" placeholder="搜索需求..." class="pl-9 text-sm" />
            </div>
            <p class="text-sm text-muted-foreground sm:whitespace-nowrap">共 {{ filteredDemands.length }} 条需求</p>
          </div>
        </div>

        <!-- Demand Cards -->
        <div v-if="filteredDemands.length === 0" class="py-16 text-center">
          <Filter class="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p class="mt-3 text-sm text-muted-foreground">暂无符合条件的需求</p>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="d in filteredDemands"
            :key="d.id"
            class="cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4"
            @click="goToDetail(d.id)"
          >
            <div class="mb-2 flex flex-wrap items-start justify-between gap-2">
              <h3 class="text-sm font-semibold leading-tight">{{ d.title }}</h3>
              <div class="flex shrink-0 items-center gap-2">
                <span class="flex items-center gap-1 text-xs text-muted-foreground">
                  <ThumbsUp class="h-3.5 w-3.5" /> {{ d.voteCount }}
                </span>
                <span class="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare class="h-3.5 w-3.5" /> {{ d.commentCount }}
                </span>
              </div>
            </div>
            <p class="mb-3 text-xs text-muted-foreground line-clamp-2">{{ d.description }}</p>
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" class="text-[10px]">{{ d.department }}</Badge>
              <Badge
                class="text-[10px]"
                :style="{ backgroundColor: statusColor(d.status) + '18', color: statusColor(d.status), borderColor: 'transparent' }"
                variant="outline"
              >
                {{ statusLabel(d.status) }}
              </Badge>
              <span class="text-[11px] text-muted-foreground">{{ timeAgo(d.createdAt) }}</span>
              <div class="ml-auto flex flex-wrap gap-1">
                <span v-for="t in d.tags.slice(0, 3)" :key="t" class="rounded-full border bg-zinc-50 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {{ t }}
                </span>
              </div>
            </div>
          </div>
        </div>



      </div>

      <!-- Right Sidebar: Rankings -->
      <aside class="hidden w-72 shrink-0 lg:block">
        <div class="sticky top-20 space-y-4">
          <div class="rounded-xl border bg-white shadow-sm">
            <div class="flex items-center justify-between border-b px-4 py-3">
              <h3 class="flex items-center gap-1.5 text-sm font-semibold">
                <Trophy class="h-4 w-4 text-amber-500" /> 三榜排名
              </h3>
              <button class="text-xs text-primary hover:underline" @click="goToRanking">查看全部</button>
            </div>

            <!-- Ranking type tabs -->
            <div class="border-b p-2">
              <div class="grid grid-cols-3 gap-1">
                <button
                  v-for="rt in (['usage','demand','opinion_leader'] as RankingType[])"
                  :key="rt"
                  :class="[
                    'rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors text-center',
                    rankingType === rt ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
                  ]"
                  @click="rankingType = rt"
                >{{ RANKING_META[rt].label }}</button>
              </div>
            </div>

            <!-- Period toggle -->
            <div class="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
              <span>{{ RANKING_META[rankingType].description }}</span>
              <div class="flex rounded-md border p-0.5">
                <button
                  v-for="p in (['daily','weekly','monthly'] as RankingPeriod[])"
                  :key="p"
                  :class="[
                    'rounded px-2 py-0.5 text-[10px] transition-colors',
                    rankingPeriod === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  ]"
                  @click="rankingPeriod = p"
                >{{ p === 'daily' ? '日' : p === 'weekly' ? '周' : '月' }}</button>
              </div>
            </div>

            <!-- Ranking list -->
            <div class="px-3 py-2 space-y-1">
              <div
                v-for="entry in rankingData.slice(0, 5)"
                :key="entry.userId"
                class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent"
              >
                <span class="flex w-5 shrink-0 justify-center text-xs font-bold" :class="[
                  entry.rank === 1 ? 'text-amber-500' : entry.rank === 2 ? 'text-zinc-400' : entry.rank === 3 ? 'text-orange-700' : 'text-muted-foreground',
                ]">
                  {{ entry.rank }}
                </span>
                <Avatar class="h-6 w-6 shrink-0">
                  <AvatarFallback class="text-[10px] bg-primary/10 text-primary">{{ entry.userName[0] }}</AvatarFallback>
                </Avatar>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium truncate">{{ entry.userName }}</p>
                  <p class="text-[10px] text-muted-foreground truncate">{{ entry.department }}</p>
                </div>
                <div class="flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
                  <ArrowUp v-if="entry.rankChange > 0" class="h-3 w-3 text-emerald-500" />
                  <ArrowDown v-else-if="entry.rankChange < 0" class="h-3 w-3 text-red-500" />
                  <Minus v-else class="h-3 w-3" />
                  {{ Math.abs(entry.rankChange) }}
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-xl border bg-white p-4 shadow-sm">
            <div class="flex items-center justify-between">
              <h3 class="flex items-center gap-1.5 text-sm font-semibold">
                <BarChart3 class="h-4 w-4 text-primary" /> 需求流转看板
              </h3>
              <span class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">漏斗</span>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">展示用户提交需求的处理阶段和集团整体流转状态</p>
            <div class="mt-3 space-y-2">
              <button
                v-for="stage in funnelData"
                :key="stage.status"
                class="w-full rounded-lg border border-transparent px-2 py-2 text-left transition hover:border-zinc-200 hover:bg-zinc-50"
                @click="openFunnelDetail(stage.status)"
              >
                <div class="mb-1 flex items-center justify-between text-xs">
                  <span class="font-medium text-zinc-700">{{ stage.label }}</span>
                  <span class="text-zinc-500">{{ stage.count }} 条</span>
                </div>
                <div class="h-2 rounded-full bg-zinc-100">
                  <div class="h-full rounded-full" :style="{ width: `${Math.max(8, (stage.count / totalDemands) * 100)}%`, backgroundColor: stage.color }" />
                </div>
              </button>
            </div>
            <div class="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
              当前已完成/已上线占比 {{ closureRate }}%，用于管理人员查看需求从提交到交付的整体效率。
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>

  <Dialog :open="funnelModalOpen" @update:open="funnelModalOpen = $event">
    <DialogContent class="max-w-3xl">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <BarChart3 class="h-5 w-5 text-primary" />
          {{ funnelStage === 'all' ? '全部需求流转明细' : DEMAND_STATUS_META[funnelStage].label + '需求明细' }}
        </DialogTitle>
      </DialogHeader>
      <div class="mt-4 max-h-[65vh] overflow-y-auto pr-1">
        <div class="space-y-3">
          <div
            v-for="d in funnelDetails"
            :key="d.id"
            class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-sm font-semibold text-zinc-950">{{ d.title }}</h3>
                  <Badge variant="secondary" class="text-[10px]">{{ d.department }}</Badge>
                  <Badge class="text-[10px]" :style="{ backgroundColor: statusColor(d.status) + '18', color: statusColor(d.status), borderColor: 'transparent' }" variant="outline">
                    {{ statusLabel(d.status) }}
                  </Badge>
                </div>
                <p class="mt-1 text-xs text-zinc-500 line-clamp-2">{{ d.description }}</p>
                <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                  <span>提交人：{{ d.submitterName }}</span>
                  <span>当前流转到：{{ getCurrentOwner(d) }}</span>
                  <span>角色：{{ getCurrentRole(d) }}</span>
                  <span>更新时间：{{ timeAgo(d.updatedAt) }}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" @click="goToDetail(d.id)">查看详情</Button>
            </div>

            <div class="mt-4 rounded-lg bg-zinc-50 p-3">
              <div class="mb-2 flex items-center justify-between text-xs text-zinc-500">
                <span>最近流转记录</span>
                <span>{{ d.timeline.length }} 条</span>
              </div>
              <div class="space-y-2">
                <div
                  v-for="entry in d.timeline.slice().reverse()"
                  :key="entry.id"
                  class="flex flex-col gap-1 rounded-md border border-zinc-100 bg-white px-3 py-2 md:flex-row md:items-center md:justify-between"
                >
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-zinc-700">
                      {{ entry.fromStatus ? statusLabel(entry.fromStatus as DemandStatus) : '提交' }} → {{ statusLabel(entry.toStatus as DemandStatus) }}
                    </p>
                    <p class="mt-0.5 text-[11px] text-zinc-500">{{ entry.operatorName }} · {{ entry.operatorRole }} · {{ entry.remark }}</p>
                  </div>
                  <span class="text-[11px] text-zinc-400">{{ timeAgo(entry.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="funnelDetails.length === 0" class="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
            当前阶段暂无需求
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
