<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Eye, MessageSquare, ThumbsUp, Pin, Clock } from 'lucide-vue-next'
import type { Article } from '@/types/article'
import { THREAT_META } from '@/lib/constants'
import { timeAgo, formatNumber } from '@/lib/format'
import CategoryBadge from '@/components/common/CategoryBadge.vue'
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
    <div class="relative aspect-[16/9] overflow-hidden bg-muted">
      <img
        :src="article.coverImage"
        :alt="article.title"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <CategoryBadge :category="article.category" size="sm" class="absolute left-3 top-3 shadow-sm" />
      <span
        v-if="article.isPinned"
        class="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground shadow-sm"
      >
        <Pin class="h-3 w-3" /> 置顶
      </span>
      <span
        v-else-if="article.threatLevel"
        :class="['absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium shadow-sm', THREAT_META[article.threatLevel].color]"
      >
        <span :class="['h-1.5 w-1.5 rounded-full', THREAT_META[article.threatLevel].dot]" />
        {{ THREAT_META[article.threatLevel].label }}
      </span>
    </div>

    <div class="flex flex-1 flex-col p-4">
      <h3 class="line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary">
        {{ article.title }}
      </h3>
      <p class="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{{ article.summary }}</p>

      <div class="mt-auto flex items-center gap-3 pt-3 text-xs text-muted-foreground">
        <span class="truncate">{{ article.department }}</span>
        <span class="flex items-center gap-1 whitespace-nowrap"><Clock class="h-3 w-3" />{{ timeAgo(article.publishedAt) }}</span>
        <span class="ml-auto flex items-center gap-3">
          <span class="flex items-center gap-1"><Eye class="h-3 w-3" />{{ formatNumber(article.viewCount) }}</span>
          <span class="flex items-center gap-1"><MessageSquare class="h-3 w-3" />{{ article.commentCount }}</span>
          <span class="flex items-center gap-1"><ThumbsUp class="h-3 w-3" />{{ article.likeCount }}</span>
        </span>
      </div>
    </div>
  </RouterLink>
</template>
