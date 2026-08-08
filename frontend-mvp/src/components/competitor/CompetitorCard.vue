<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Eye, Clock, ImageIcon } from 'lucide-vue-next'
import type { Article } from '@/types/article'
import { timeAgo, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

const props = defineProps<{ article: Article }>()
const isHighThreat = props.article.threatLevel === 'high'
</script>

<template>
  <RouterLink
    :to="{ name: 'article-detail', params: { id: article.id } }"
    :class="
      cn(
        'group flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
        isHighThreat && 'ring-2 ring-red-500/50',
      )
    "
  >
    <!-- cover image placeholder -->
    <div class="aspect-[16/9] w-full bg-muted flex items-center justify-center">
      <ImageIcon class="h-8 w-8 text-muted-foreground/30" />
    </div>

    <div class="flex flex-1 flex-col p-4">
      <div class="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span class="font-semibold text-foreground">{{ article.competitorName }}</span>
        <span v-if="article.subCategory" class="rounded bg-muted px-1.5 py-0.5">{{ article.subCategory }}</span>
      </div>

      <h3 class="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
        {{ article.title }}
      </h3>
      <p class="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{{ article.summary }}</p>

      <div class="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span class="flex items-center gap-1"><Clock class="h-3 w-3" />{{ timeAgo(article.publishedAt) }}</span>
        <span class="flex items-center gap-1"><Eye class="h-3 w-3" />{{ formatNumber(article.viewCount) }}</span>
      </div>
    </div>
  </RouterLink>
</template>
