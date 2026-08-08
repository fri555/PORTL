<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Zap, Eye, MessageSquare, ExternalLink } from 'lucide-vue-next'
import type { Article } from '@/types/article'
import { THREAT_META } from '@/lib/constants'
import { timeAgo, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

const props = defineProps<{ article: Article }>()
const isHigh = props.article.threatLevel === 'high'
</script>

<template>
  <div
    :class="
      cn(
        'rounded-xl border p-4',
        isHigh ? 'border-red-200 bg-red-50/70' : 'border-orange-200 bg-orange-50/70',
      )
    "
  >
    <div class="flex items-start gap-3">
      <span
        :class="[
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white',
          isHigh ? 'bg-red-500' : 'bg-orange-500',
        ]"
      >
        <Zap class="h-4 w-4" />
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <span
            :class="['inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', THREAT_META[article.threatLevel!].color]"
          >
            <span :class="['h-1.5 w-1.5 rounded-full', THREAT_META[article.threatLevel!].dot]" />
            {{ THREAT_META[article.threatLevel!].label }}
          </span>
          <span v-if="article.competitorName" class="text-xs font-medium text-muted-foreground">{{ article.competitorName }}</span>
        </div>
        <RouterLink :to="{ name: 'article-detail', params: { id: article.id } }" class="mt-1.5 block font-semibold leading-snug transition-colors hover:text-primary">
          {{ article.title }}
        </RouterLink>
        <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{{ article.summary }}</p>
        <div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span v-if="article.source">{{ article.source }}</span>
          <span>{{ timeAgo(article.publishedAt) }}</span>
          <span class="flex items-center gap-1"><Eye class="h-3 w-3" />{{ formatNumber(article.viewCount) }}</span>
          <span class="flex items-center gap-1"><MessageSquare class="h-3 w-3" />{{ article.commentCount }}</span>
          <RouterLink :to="{ name: 'article-detail', params: { id: article.id } }" class="ml-auto flex items-center gap-1 font-medium text-primary hover:underline">
            查看应对建议 <ExternalLink class="h-3 w-3" />
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
