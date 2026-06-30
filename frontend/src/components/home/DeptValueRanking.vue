<script setup lang="ts">
import { computed } from 'vue'
import { Trophy, TrendingUp } from 'lucide-vue-next'
import { homeData } from '@/mock/home'
import type { ComponentSize } from '@/types/home'

const props = defineProps<{
  size?: ComponentSize
}>()

const rankings = homeData.deptRank
const isNarrow = computed(() => props.size === '1x2')
const isTiny = computed(() => props.size === '2x1')
const visibleRankings = computed(() => rankings)

function rankBadge(rank: number): string {
  if (rank === 1) return 'bg-amber-100 text-amber-700'
  if (rank === 2) return 'bg-zinc-200 text-zinc-600'
  if (rank === 3) return 'bg-orange-100 text-orange-700'
  return 'bg-zinc-100 text-zinc-500'
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col rounded-xl border border-zinc-200/60 bg-white shadow-sm" :class="isNarrow || isTiny ? 'p-3' : 'p-5'">
    <div class="flex items-center justify-between" :class="isNarrow ? 'mb-2' : 'mb-3'">
      <div class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm shadow-amber-200">
          <Trophy class="h-4 w-4 text-white" />
        </div>
        <h3 class="text-sm font-bold tracking-tight text-zinc-800">部门AI价值榜</h3>
      </div>
      <span v-if="!isNarrow" class="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">TOP {{ visibleRankings.length }}</span>
    </div>

    <ul class="soft-scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
      <li
        v-for="item in visibleRankings"
        :key="item.rank"
        class="group flex min-w-0 items-center rounded-lg transition-colors hover:bg-zinc-50"
        :class="isNarrow || isTiny ? 'gap-2 px-1.5 py-1.5' : 'gap-3 px-2.5 py-2'"
      >
        <div :class="['flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums', rankBadge(item.rank)]">
          {{ item.rank }}
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <span class="truncate font-medium text-zinc-700" :class="isNarrow ? 'text-[12px]' : 'text-[13px]'">{{ item.department }}</span>
            <TrendingUp v-if="!isNarrow" class="h-3 w-3 text-emerald-500" />
          </div>
          <p v-if="!isNarrow && !isTiny" class="mt-0.5 truncate text-[11px] text-zinc-400/60">{{ item.metric }}</p>
        </div>

        <div class="shrink-0 text-right">
          <span class="text-sm font-bold tabular-nums text-zinc-800">{{ item.score }}</span>
          <span v-if="!isNarrow && !isTiny" class="ml-0.5 text-[10px] text-zinc-400/50">分</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.soft-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(148 163 184 / 0.35) transparent;
}

.soft-scroll::-webkit-scrollbar {
  width: 5px;
}

.soft-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgb(148 163 184 / 0.35);
}
</style>
