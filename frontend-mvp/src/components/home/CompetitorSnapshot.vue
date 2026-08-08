<script setup lang="ts">
import { computed } from 'vue'
import { Swords, ExternalLink } from 'lucide-vue-next'
import { articles } from '@/mock/articles'
import type { ComponentSize } from '@/types/home'

const props = defineProps<{
  size?: ComponentSize
}>()

const competitorNews = articles
  .filter((a) => a.category === 'competitor')
  .slice(0, 6)

const isNarrow = computed(() => props.size === '1x2')
const isTiny = computed(() => props.size === '2x1')
const isLarge = computed(() => props.size === '4x2')
const visibleNews = computed(() => {
  return competitorNews
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col rounded-xl border border-zinc-200/60 bg-white shadow-sm" :class="isNarrow || isTiny ? 'p-3' : 'p-5'">
    <div class="flex items-center justify-between" :class="isNarrow ? 'mb-2' : 'mb-3'">
      <div class="flex items-center gap-2">
        <div class="flex items-center justify-center rounded-xl bg-gradient-to-br from-red-400 to-rose-500 shadow-sm shadow-red-200" :class="isNarrow ? 'h-7 w-7' : 'h-8 w-8'">
          <Swords class="h-4 w-4 text-white" />
        </div>
        <h3 class="truncate text-sm font-bold tracking-tight text-zinc-800">竞对快照</h3>
      </div>
      <span v-if="!isNarrow && !isTiny" class="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">TOP {{ visibleNews.length }}</span>
    </div>

    <div class="soft-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
      <div
        v-for="(item, idx) in visibleNews"
        :key="item.id"
        class="group flex min-w-0 items-start rounded-lg transition-colors hover:bg-zinc-50"
        :class="isNarrow || isTiny ? 'gap-2 px-1.5 py-1.5' : 'gap-3 p-2.5'"
      >
        <span
          class="flex shrink-0 items-center justify-center rounded-full font-bold"
          :class="[isNarrow ? 'h-5 w-5 text-[10px]' : 'mt-0.5 h-5 w-5 text-[11px]', idx === 0 ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-500']"
        >
          {{ idx + 1 }}
        </span>
        <div class="min-w-0 flex-1">
          <p class="font-medium leading-snug text-zinc-700" :class="isNarrow || isTiny || isLarge ? 'line-clamp-1 text-[12px]' : 'line-clamp-2 text-[13px]'">
            {{ item.title }}
          </p>
          <div v-if="!isNarrow && !isTiny" class="mt-1 flex items-center gap-2 text-[10px] text-zinc-400/60">
            <span>{{ item.competitorName }}</span>
            <span class="h-1 w-1 rounded-full bg-zinc-300" />
            <span>{{ item.subCategory }}</span>
          </div>
        </div>
        <ExternalLink v-if="!isNarrow && !isTiny" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.soft-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(148 163 184 / 0.35) transparent;
}

.soft-scroll::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

.soft-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgb(148 163 184 / 0.35);
}
</style>
