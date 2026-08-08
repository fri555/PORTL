<script setup lang="ts">
import { computed } from 'vue'
import { Globe, ExternalLink } from 'lucide-vue-next'
import { articles } from '@/mock/articles'
import { timeAgo } from '@/lib/format'
import type { ComponentSize } from '@/types/home'

const props = defineProps<{ size?: ComponentSize }>()

const headlines = articles
  .filter((a) => a.category === 'industry')
  .slice(0, 8)

const visibleHeadlines = computed(() => {
  return headlines
})

const isCompact = computed(() => props.size === '1x2' || props.size === '2x1')
const isLarge = computed(() => props.size === '4x2')
</script>

<template>
  <div class="flex h-full min-h-0 flex-col rounded-xl border border-zinc-200/60 bg-white shadow-sm" :class="isCompact ? 'p-3' : 'p-4'">
    <div class="flex items-center gap-2" :class="isCompact ? 'mb-2' : 'mb-3'">
      <div class="flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 shadow-sm shadow-blue-200" :class="isCompact ? 'h-7 w-7' : 'h-8 w-8'">
        <Globe class="h-4 w-4 text-white" />
      </div>
      <h3 class="text-sm font-bold tracking-tight text-zinc-800">行业头条</h3>
    </div>

    <ul class="soft-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
      <li
        v-for="item in visibleHeadlines"
        :key="item.id"
        class="group flex items-start gap-2.5 rounded-md px-2 transition-colors hover:bg-zinc-50"
        :class="isCompact ? 'py-1.5' : 'py-2'"
      >
        <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500/60" />
        <div class="min-w-0 flex-1">
          <p class="text-[13px] leading-snug text-zinc-700" :class="isCompact || isLarge ? 'line-clamp-1' : 'line-clamp-2'">
            {{ item.title }}
          </p>
          <span v-if="!isCompact" class="mt-1 inline-block text-[10px] text-zinc-400/50">
            {{ timeAgo(item.publishedAt) }} · {{ item.source }}
          </span>
        </div>
        <ExternalLink v-if="!isCompact" class="mt-1 h-3 w-3 shrink-0 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100" />
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
