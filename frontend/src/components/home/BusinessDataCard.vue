<script setup lang="ts">
import { computed } from 'vue'
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-vue-next'
import type { ComponentSize } from '@/types/home'

const props = defineProps<{ size?: ComponentSize }>()

interface MetricItem {
  label: string
  value: string
  change: number
  changeLabel: string
}

const metrics: MetricItem[] = [
  { label: '本月GMV', value: '¥8,523万', change: 12.5, changeLabel: '环比' },
  { label: '库存周转天数', value: '42天', change: -8.3, changeLabel: '环比' },
  { label: 'AI辅助订单占比', value: '34.6%', change: 5.2, changeLabel: '环比' },
  { label: '客单价', value: '¥286', change: 2.1, changeLabel: '环比' },
]

const additionalMetrics: MetricItem[] = [
  { label: 'SKU动销率', value: '78.3%', change: 1.8, changeLabel: '环比' },
  { label: '退货率', value: '4.2%', change: -0.5, changeLabel: '环比' },
]

function changeColor(change: number): string {
  if (change > 0) return 'text-emerald-600'
  if (change < 0) return 'text-red-500'
  return 'text-zinc-400'
}

const visibleMetrics = computed(() => {
  if (props.size === '2x1') return metrics.slice(0, 3)
  if (props.size === '2x4' || props.size === '4x4') return [...metrics, ...additionalMetrics]
  return [...metrics, ...additionalMetrics].slice(0, 4)
})

const gridClass = computed(() => {
  if (props.size === '2x1') return 'grid-cols-2'
  if (props.size === '4x4') return 'grid-cols-2'
  return 'grid-cols-2'
})
</script>

<template>
  <div class="flex h-full flex-col rounded-xl border border-zinc-200/60 bg-white p-4 shadow-sm">
    <div class="mb-3 flex items-center gap-2">
      <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 shadow-sm shadow-emerald-200">
        <BarChart3 class="h-4 w-4 text-white" />
      </div>
      <h3 class="text-sm font-bold tracking-tight text-zinc-800">经营数据</h3>
      <span class="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">今日更新</span>
    </div>

    <div :class="['grid min-h-0 flex-1 gap-3 overflow-hidden', gridClass]">
      <div
        v-for="metric in visibleMetrics"
        :key="metric.label"
        class="flex flex-col justify-center rounded-lg bg-zinc-50/60 px-3 py-2.5"
      >
        <span class="text-[11px] text-zinc-400/80">{{ metric.label }}</span>
        <span :class="['mt-1 font-bold tabular-nums tracking-tight text-zinc-800', props.size === '2x1' ? 'text-base' : 'text-lg']">{{ metric.value }}</span>
        <div class="mt-0.5 flex items-center gap-1">
          <TrendingUp v-if="metric.change > 0" class="h-3 w-3 text-emerald-500" />
          <TrendingDown v-else-if="metric.change < 0" class="h-3 w-3 text-red-400" />
          <Minus v-else class="h-3 w-3 text-zinc-400" />
          <span :class="['text-[11px] font-medium tabular-nums', changeColor(metric.change)]">
            {{ metric.change > 0 ? '+' : '' }}{{ metric.change }}%
          </span>
          <span class="text-[10px] text-zinc-400/50">{{ metric.changeLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
