<script setup lang="ts">
import { Zap, Coins, TrendingUp } from 'lucide-vue-next'
import { computed } from 'vue'
import type { ComponentSize } from '@/types/home'

const props = defineProps<{
  size?: ComponentSize
}>()

const usageData = {
  tokenUsed: 128_500,
  tokenLimit: 200_000,
  coinBalance: 1860,
  coinLimit: 3000,
  monthlyRank: 'TOP 15%',
}

const tokenPercent = computed(() =>
  Math.round((usageData.tokenUsed / usageData.tokenLimit) * 100),
)

const coinPercent = computed(() =>
  Math.round((usageData.coinBalance / usageData.coinLimit) * 100),
)
const isWide = computed(() => props.size === '4x2')

function formatNumber(n: number): string {
  if (n >= 10_000) return (n / 10_000).toFixed(1) + '万'
  return n.toLocaleString()
}

function barColor(percent: number): string {
  if (percent > 80) return 'bg-red-500'
  if (percent > 60) return 'bg-amber-500'
  return 'bg-emerald-500'
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col rounded-xl border border-zinc-200/60 bg-white shadow-sm" :class="isWide ? 'p-4' : 'p-5'">
    <div class="mb-3 flex items-center gap-2">
      <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 shadow-sm shadow-indigo-200">
        <Zap class="h-4 w-4 text-white" />
      </div>
      <h3 class="truncate text-sm font-bold tracking-tight text-zinc-800">模型用量</h3>
    </div>

    <div class="min-h-0 flex-1" :class="isWide ? 'grid grid-cols-[1fr_1fr_auto] gap-3' : 'space-y-3'">
      <div class="min-w-0 rounded-xl bg-zinc-50/70 p-3">
        <div class="mb-1 flex items-center justify-between gap-2">
          <span class="text-[11px] text-zinc-400/70">Token消耗</span>
          <span class="shrink-0 text-[11px] font-medium tabular-nums">
            <span class="text-zinc-800">{{ formatNumber(usageData.tokenUsed) }}</span>
            <span class="text-zinc-400/50"> / {{ formatNumber(usageData.tokenLimit) }}</span>
          </span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            :class="['h-full rounded-full transition-all', barColor(tokenPercent)]"
            :style="{ width: `${tokenPercent}%` }"
          />
        </div>
      </div>

      <div class="min-w-0 rounded-xl bg-zinc-50/70 p-3">
        <div class="mb-1 flex items-center justify-between gap-2">
          <span class="inline-flex items-center gap-1 text-[11px] text-zinc-400/70">
            <Coins class="h-3 w-3" />
            金币余额
          </span>
          <span class="shrink-0 text-[11px] font-medium tabular-nums">
            <span class="text-zinc-800">{{ formatNumber(usageData.coinBalance) }}</span>
            <span class="text-zinc-400/50"> / {{ formatNumber(usageData.coinLimit) }}</span>
          </span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            :class="['h-full rounded-full transition-all', barColor(coinPercent)]"
            :style="{ width: `${coinPercent}%` }"
          />
        </div>
      </div>

      <div class="flex min-w-[128px] items-center justify-between rounded-xl bg-zinc-50/70 px-3 py-2" :class="isWide ? 'flex-col items-start' : ''">
        <span class="text-[11px] text-zinc-400/60">计费口径</span>
        <span class="text-xs font-medium text-zinc-700">金币抵扣</span>
        <span class="text-[11px] text-zinc-400/60" :class="isWide ? 'mt-2' : 'ml-auto'">本月排名</span>
        <span class="flex items-center gap-1 text-sm font-bold tabular-nums text-emerald-600">
          <TrendingUp class="h-3 w-3" />
          {{ usageData.monthlyRank }}
        </span>
      </div>
    </div>
  </div>
</template>
