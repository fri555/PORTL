<script setup lang="ts">
import { ref, computed } from 'vue'
import { TrendingUp, TrendingDown, Zap, Coins, DollarSign, Database, Search } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import WorkspaceBackButton from '@/components/common/WorkspaceBackButton.vue'

const store = useAppStore()

// ---- Filters ----
const timeRange = ref<'day' | 'week' | 'month' | 'custom'>('week')
const modelType = ref<string>('all')
const dimension = ref<'personal' | 'department' | 'app'>('personal')

const timeRanges = [
  { key: 'day' as const, label: '日' },
  { key: 'week' as const, label: '周' },
  { key: 'month' as const, label: '月' },
  { key: 'custom' as const, label: '自定义' },
]

const modelTypes = [
  { key: 'all', label: '全部模型' },
  { key: 'claude', label: 'Claude系列' },
  { key: 'deepseek', label: 'DeepSeek系列' },
  { key: 'embedding', label: 'Embedding' },
]

// ---- Mock Usage Data ----
const metricCards = computed(() => {
  // Simulate different data per time range
  const multiplier = timeRange.value === 'day' ? 1 : timeRange.value === 'week' ? 7 : 30
  return [
    {
      label: '总调用次数',
      value: (12500 * multiplier).toLocaleString(),
      trend: '+12.5%',
      trendUp: true,
      icon: Zap,
      color: '#f97316',
    },
    {
      label: '消耗Token量',
      value: (multiplier * 850000).toLocaleString(),
      trend: '+8.3%',
      trendUp: true,
      icon: Database,
      color: '#6366f1',
    },
    {
      label: '预估费用',
      value: `$${(multiplier * 125).toLocaleString()}`,
      trend: '-3.2%',
      trendUp: false,
      icon: DollarSign,
      color: '#10b981',
    },
    {
      label: '积分消耗',
      value: (multiplier * 380).toLocaleString(),
      trend: '+5.1%',
      trendUp: true,
      icon: Coins,
      color: '#f59e0b',
    },
  ]
})

// ---- Trend Chart Data (simulated) ----
const chartLabels = computed(() => {
  if (timeRange.value === 'day') return ['0h', '4h', '8h', '12h', '16h', '20h', '24h']
  if (timeRange.value === 'week') return ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return ['6/1', '6/5', '6/10', '6/14', '6/18', '6/20', '6/22']
})

const chartData = computed(() => {
  if (timeRange.value === 'day') return [45, 38, 52, 67, 89, 76, 55]
  if (timeRange.value === 'week') return [320, 280, 410, 450, 390, 210, 180]
  return [2800, 3100, 3500, 4200, 3800, 4500, 4100]
})

const maxChartValue = computed(() => Math.max(...chartData.value))

// ---- Usage Detail Table ----
const usageRecords = [
  {
    id: 'rec01',
    time: '2026-06-22 14:32:10',
    model: 'claude-sonnet-4-6',
    agent: '营销内容创作助手',
    inputTokens: 2400,
    outputTokens: 850,
    cost: 0.012,
    points: 2,
  },
  {
    id: 'rec02',
    time: '2026-06-22 14:15:44',
    model: 'deepseek-v4-pro',
    agent: '门店智能运营助手',
    inputTokens: 1800,
    outputTokens: 620,
    cost: 0.004,
    points: 1,
  },
  {
    id: 'rec03',
    time: '2026-06-22 13:50:22',
    model: 'claude-opus-4-8',
    agent: '数据看板生成器',
    inputTokens: 4500,
    outputTokens: 2100,
    cost: 0.065,
    points: 5,
  },
  {
    id: 'rec04',
    time: '2026-06-22 11:20:08',
    model: 'claude-fable-5',
    agent: '营销内容创作助手',
    inputTokens: 1200,
    outputTokens: 3400,
    cost: 0.018,
    points: 3,
  },
  {
    id: 'rec05',
    time: '2026-06-22 10:05:33',
    model: 'claude-haiku-4-5',
    agent: '智能客服质检员',
    inputTokens: 3200,
    outputTokens: 420,
    cost: 0.002,
    points: 1,
  },
  {
    id: 'rec06',
    time: '2026-06-22 09:30:15',
    model: 'claude-sonnet-4-6',
    agent: '财务AI分析师',
    inputTokens: 5600,
    outputTokens: 1800,
    cost: 0.028,
    points: 3,
  },
  {
    id: 'rec07',
    time: '2026-06-22 08:45:00',
    model: 'text-embedding-3-large',
    agent: '知识库检索',
    inputTokens: 8000,
    outputTokens: 0,
    cost: 0.001,
    points: 1,
  },
  {
    id: 'rec08',
    time: '2026-06-22 08:00:05',
    model: 'claude-sonnet-4-6',
    agent: '仓储优化顾问',
    inputTokens: 1900,
    outputTokens: 750,
    cost: 0.010,
    points: 2,
  },
]

// ---- Role Selector ----
const selectedRole = ref(store.user?.role ?? 'user')

const roles = [
  { key: 'user', label: '普通用户视角' },
  { key: 'editor', label: '开发者视角' },
  { key: 'admin', label: '管理员视角' },
]
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <WorkspaceBackButton class="mb-3" />
        <h1 class="text-2xl font-bold text-zinc-900">模型用量</h1>
        <p class="text-sm text-zinc-500 mt-1">监控AI模型调用情况与资源消耗</p>
      </div>
      <!-- Role selector -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-zinc-500">视角：</span>
        <select
          v-model="selectedRole"
          class="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
        >
          <option v-for="r in roles" :key="r.key" :value="r.key">{{ r.label }}</option>
        </select>
      </div>
    </div>

    <!-- Top Filter Bar -->
    <div class="flex flex-wrap items-center gap-3">
      <!-- Time Range -->
      <div class="flex gap-1 rounded-lg bg-zinc-100 p-1">
        <button
          v-for="r in timeRanges"
          :key="r.key"
          @click="timeRange = r.key"
          :class="[
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            timeRange === r.key
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700',
          ]"
        >
          {{ r.label }}
        </button>
      </div>

      <span class="text-zinc-300">|</span>

      <!-- Model Type -->
      <div class="flex gap-1">
        <button
          v-for="mt in modelTypes"
          :key="mt.key"
          @click="modelType = mt.key"
          :class="[
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            modelType === mt.key
              ? 'bg-orange-50 text-orange-600'
              : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700',
          ]"
        >
          {{ mt.label }}
        </button>
      </div>

      <span class="text-zinc-300">|</span>

      <!-- Dimension -->
      <div class="flex gap-1 rounded-lg bg-zinc-100 p-1">
        <button
          v-for="dim in [{ key: 'personal', label: '个人' }, { key: 'department', label: '部门' }, { key: 'app', label: '我的应用' }]"
          :key="dim.key"
          @click="dimension = dim.key as 'personal' | 'department' | 'app'"
          :class="[
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            dimension === dim.key
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700',
          ]"
        >
          {{ dim.label }}
        </button>
      </div>
    </div>

    <!-- Metric Cards -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="card in metricCards"
        :key="card.label"
        class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
      >
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-zinc-500">{{ card.label }}</span>
          <div
            class="size-9 rounded-lg flex items-center justify-center"
            :style="{ backgroundColor: card.color + '15' }"
          >
            <component :is="card.icon" class="size-4" :style="{ color: card.color }" />
          </div>
        </div>
        <div class="text-2xl font-bold text-zinc-900">{{ card.value }}</div>
        <div class="mt-1.5 flex items-center gap-1">
          <component
            :is="card.trendUp ? TrendingUp : TrendingDown"
            class="size-3.5"
            :class="card.trendUp ? 'text-green-500' : 'text-red-500'"
          />
          <span
            :class="[
              'text-xs font-medium',
              card.trendUp ? 'text-green-600' : 'text-red-500',
            ]"
          >
            {{ card.trend }} 较上期
          </span>
        </div>
      </div>
    </div>

    <!-- Trend Chart -->
    <div class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 class="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-5">
        {{ timeRange === 'day' ? '今日调用趋势' : timeRange === 'week' ? '本周调用趋势' : '本月调用趋势' }}
      </h3>

      <!-- CSS-based bar chart -->
      <div class="flex items-end justify-between gap-1 h-48 px-2">
        <div
          v-for="(val, idx) in chartData"
          :key="idx"
          class="flex-1 flex flex-col items-center gap-2 h-full justify-end"
        >
          <span class="text-xs text-zinc-400 font-medium">{{ val.toLocaleString() }}</span>
          <div
            class="w-full rounded-t-lg transition-all duration-500"
            :style="{
              height: `${(val / maxChartValue) * 100}%`,
              backgroundColor: `hsl(${25 + idx * 3}, ${85 - idx * 2}%, ${55 - idx * 2}%)`,
              minHeight: '4px',
            }"
          />
          <span class="text-xs text-zinc-400 mt-1">{{ chartLabels[idx] }}</span>
        </div>
      </div>

      <!-- Legend -->
      <div class="mt-4 flex items-center justify-center gap-4 text-xs text-zinc-400">
        <div class="flex items-center gap-1.5">
          <div class="size-2.5 rounded-sm bg-orange-500" />
          调用次数
        </div>
      </div>
    </div>

    <!-- Usage Detail Table -->
    <div class="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
      <div class="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-zinc-500 uppercase tracking-wider">调用明细</h3>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="搜索..."
            class="w-48 rounded-lg border border-zinc-300 bg-zinc-50 py-1.5 pl-8 pr-3 text-xs placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
          />
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-zinc-200 bg-zinc-50">
              <th class="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">时间</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">模型</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">关联智能体/Skill</th>
              <th class="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">输入Token</th>
              <th class="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">输出Token</th>
              <th class="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">费用</th>
              <th class="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">积分</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in usageRecords"
              :key="record.id"
              class="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 transition-colors"
            >
              <td class="px-4 py-3 text-sm text-zinc-600 whitespace-nowrap">{{ record.time }}</td>
              <td class="px-4 py-3">
                <code class="text-xs bg-zinc-100 px-1.5 py-0.5 rounded font-mono text-zinc-700">{{ record.model }}</code>
              </td>
              <td class="px-4 py-3 text-sm text-zinc-600">{{ record.agent }}</td>
              <td class="px-4 py-3 text-sm text-zinc-600 text-right">{{ record.inputTokens.toLocaleString() }}</td>
              <td class="px-4 py-3 text-sm text-zinc-600 text-right">{{ record.outputTokens.toLocaleString() }}</td>
              <td class="px-4 py-3 text-sm text-zinc-600 text-right">${{ record.cost.toFixed(3) }}</td>
              <td class="px-4 py-3 text-sm text-zinc-600 text-right">{{ record.points }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
