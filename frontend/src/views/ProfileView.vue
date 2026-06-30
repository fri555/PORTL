<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  User, Settings, Award, TrendingUp, Clock, Gift, Zap, Cpu,
  Bookmark, ExternalLink, ChevronRight, BarChart3,
} from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { pointsBalance, pointsTransactions } from '@/mock/points'
import { demands } from '@/mock/demands'
import { agents } from '@/mock/agents'
import { skills } from '@/mock/skills'
import { timeAgo, formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DEMAND_STATUS_META, type DemandStatus } from '@/types/demand'

const store = useAppStore()
const user = computed(() => store.user)

const myDemands = computed(() => demands.slice(0, 4))
const favoritedAgents = computed(() => agents.slice(0, 3))
const favoritedSkills = computed(() => skills.slice(0, 3))

const modelUsage = {
  monthlyCalls: 1240,
  monthlyTokens: '38.5M',
  topModel: 'claude-sonnet-4-6',
  topModelPercentage: 45,
  compareAvg: '+35%',
}

function statusLabel(s: DemandStatus) { return DEMAND_STATUS_META[s]?.label ?? s }
function statusColor(s: DemandStatus) { return DEMAND_STATUS_META[s]?.color ?? '#6b7280' }
</script>

<template>
  <div class="mx-auto max-w-5xl px-6 py-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold">个人中心</h1>
      <p class="mt-1 text-sm text-muted-foreground">管理你的账户、积分与学习记录</p>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Left column -->
      <div class="space-y-6 lg:col-span-1">
        <!-- User Info Card -->
        <div class="rounded-xl border bg-white p-5 shadow-sm">
          <div class="flex items-center gap-4">
            <Avatar class="h-16 w-16">
              <AvatarImage :src="user?.avatarUrl ?? ''" />
              <AvatarFallback class="text-xl bg-primary/10 text-primary">{{ user?.displayName?.[0] ?? '?' }}</AvatarFallback>
            </Avatar>
            <div>
              <h2 class="text-lg font-bold">{{ user?.displayName ?? '用户' }}</h2>
              <p class="text-sm text-muted-foreground">{{ user?.department ?? '--' }}</p>
              <Badge variant="secondary" class="mt-1 text-[10px]">{{ user?.role ?? '成员' }}</Badge>
            </div>
          </div>
          <div class="mt-4 border-t pt-4 text-sm text-muted-foreground">
            <div class="flex justify-between py-1">
              <span>加入时间</span>
              <span class="text-foreground">2025-03-15</span>
            </div>
            <div class="flex justify-between py-1">
              <span>本月调用次数</span>
              <span class="text-foreground">{{ formatNumber(modelUsage.monthlyCalls) }}</span>
            </div>
          </div>
        </div>

        <!-- Points Card -->
        <div class="rounded-xl border bg-white p-5 shadow-sm">
          <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Award class="h-4 w-4 text-amber-500" /> 我的积分
          </h3>
          <div class="mb-4 flex items-end justify-between">
            <div>
              <p class="text-3xl font-bold text-foreground">{{ pointsBalance.total }}</p>
              <p class="text-xs text-muted-foreground">总积分</p>
            </div>
            <Button variant="outline" size="sm" class="gap-1.5">
              <Gift class="h-4 w-4" /> 积分兑换
            </Button>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="rounded-lg bg-primary/5 p-2">
              <p class="text-lg font-bold text-primary">{{ pointsBalance.thisMonth }}</p>
              <p class="text-[10px] text-muted-foreground">本月</p>
            </div>
            <div class="rounded-lg bg-emerald-50 p-2">
              <p class="text-lg font-bold text-emerald-600">{{ pointsBalance.thisWeek }}</p>
              <p class="text-[10px] text-muted-foreground">本周</p>
            </div>
            <div class="rounded-lg bg-blue-50 p-2">
              <p class="text-lg font-bold text-blue-600">{{ pointsBalance.available }}</p>
              <p class="text-[10px] text-muted-foreground">可用</p>
            </div>
          </div>
        </div>

        <!-- Model Usage Summary -->
        <div class="rounded-xl border bg-white p-5 shadow-sm">
          <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Cpu class="h-4 w-4 text-purple-500" /> 本月模型用量
          </h3>
          <div class="space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">总调用次数</span>
              <span class="font-medium">{{ formatNumber(modelUsage.monthlyCalls) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Token消耗</span>
              <span class="font-medium">{{ modelUsage.monthlyTokens }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">最常用模型</span>
              <span class="font-medium">{{ modelUsage.topModel }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">对比部门均值</span>
              <span class="font-medium text-emerald-600">{{ modelUsage.compareAvg }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div class="space-y-6 lg:col-span-2">
        <!-- Points Transactions -->
        <div class="rounded-xl border bg-white p-5 shadow-sm">
          <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Clock class="h-4 w-4 text-primary" /> 积分明细
          </h3>
          <div class="space-y-1 max-h-[280px] overflow-y-auto">
            <div v-for="tx in pointsTransactions.slice(0, 8)" :key="tx.id" class="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent">
              <div :class="['flex h-8 w-8 shrink-0 items-center justify-center rounded-full', tx.action === 'earn' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500']">
                {{ tx.action === 'earn' ? '+' : '-' }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm truncate">{{ tx.description }}</p>
                <p class="text-xs text-muted-foreground">{{ timeAgo(tx.createdAt) }}</p>
              </div>
              <span :class="['text-sm font-semibold', tx.points > 0 ? 'text-emerald-600' : 'text-red-500']">
                {{ tx.points > 0 ? '+' : '' }}{{ tx.points }}
              </span>
            </div>
          </div>
        </div>

        <!-- My Demands -->
        <div class="rounded-xl border bg-white p-5 shadow-sm">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 class="h-4 w-4 text-blue-500" /> 我的需求
            </h3>
            <RouterLink to="/demands" class="text-xs text-primary hover:underline flex items-center gap-1">
              查看全部 <ChevronRight class="h-3 w-3" />
            </RouterLink>
          </div>
          <div class="space-y-2">
            <div v-for="d in myDemands" :key="d.id" class="flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium truncate">{{ d.title }}</p>
                <div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{{ d.department }}</span>
                  <span class="text-muted-foreground/40">|</span>
                  <span :style="{ color: statusColor(d.status) }">{{ statusLabel(d.status) }}</span>
                </div>
              </div>
              <Badge variant="secondary" class="shrink-0 text-[10px]">{{ d.voteCount }}票</Badge>
            </div>
          </div>
        </div>

        <!-- My Favorites -->
        <div class="rounded-xl border bg-white p-5 shadow-sm">
          <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Bookmark class="h-4 w-4 text-amber-500" /> 我的收藏
          </h3>
          <Tabs default-value="agents">
            <TabsList class="mb-3">
              <TabsTrigger value="agents">智能体 ({{ favoritedAgents.length }})</TabsTrigger>
              <TabsTrigger value="skills">Skills ({{ favoritedSkills.length }})</TabsTrigger>
            </TabsList>
            <TabsContent value="agents">
              <div class="grid gap-3 sm:grid-cols-3">
                <div v-for="ag in favoritedAgents" :key="ag.id" class="rounded-lg border p-3 text-center transition-colors hover:bg-accent">
                  <Avatar class="mx-auto mb-2 h-10 w-10">
                    <AvatarFallback class="text-sm bg-primary/10 text-primary">{{ ag.name[0] }}</AvatarFallback>
                  </Avatar>
                  <p class="text-xs font-medium line-clamp-1">{{ ag.name }}</p>
                  <div class="mt-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                    <Star class="h-3 w-3 fill-amber-400 text-amber-400" /> {{ ag.avgRating }}
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="skills">
              <div class="grid gap-3 sm:grid-cols-3">
                <div v-for="sk in favoritedSkills" :key="sk.id" class="rounded-lg border p-3 transition-colors hover:bg-accent">
                  <p class="text-xs font-medium line-clamp-1">{{ sk.name }}</p>
                  <p class="mt-1 text-[10px] text-muted-foreground line-clamp-2">{{ sk.description }}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  </div>
</template>
