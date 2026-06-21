<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Flame, Eye, MessageSquare } from 'lucide-vue-next'
import type { Article } from '@/types/article'
import { formatNumber } from '@/lib/format'

defineProps<{ items: Article[] }>()

const rankClass = (i: number) => {
  if (i === 0) return 'bg-primary text-primary-foreground'
  if (i === 1) return 'bg-orange-400 text-white'
  if (i === 2) return 'bg-amber-300 text-amber-900'
  return 'bg-muted text-muted-foreground'
}
</script>

<template>
  <div class="flex h-full flex-col rounded-xl border bg-white p-5 shadow-sm">
    <div class="mb-4 flex items-center gap-2">
      <Flame class="h-5 w-5 text-primary" />
      <h2 class="text-lg font-bold tracking-tight">AI热榜</h2>
    </div>

    <ul class="space-y-1">
      <li v-for="(item, i) in items" :key="item.id">
        <RouterLink
          :to="{ name: 'article-detail', params: { id: item.id } }"
          class="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
        >
          <span
            :class="['flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold', rankClass(i)]"
          >
            {{ i + 1 }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="line-clamp-1 text-sm font-medium transition-colors group-hover:text-primary">
              {{ item.title }}
            </p>
            <div class="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span class="flex items-center gap-1"><Eye class="h-3 w-3" />{{ formatNumber(item.viewCount) }}</span>
              <span class="flex items-center gap-1"><MessageSquare class="h-3 w-3" />{{ item.commentCount }}</span>
              <Flame v-if="i < 2" class="h-3 w-3 text-red-500" />
            </div>
          </div>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
