<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Eye, ArrowRight } from 'lucide-vue-next'
import type { Article } from '@/types/article'
import { THREAT_META } from '@/lib/constants'
import { timeAgo, formatNumber } from '@/lib/format'
import CategoryBadge from '@/components/common/CategoryBadge.vue'

defineProps<{ article: Article }>()
</script>

<template>
  <RouterLink
    :to="{ name: 'article-detail', params: { id: article.id } }"
    class="group relative block overflow-hidden rounded-xl bg-zinc-900 shadow-sm transition-shadow hover:shadow-lg"
  >
    <img
      :src="article.coverImage"
      :alt="article.title"
      class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
    <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />

    <div class="relative flex h-full min-h-[320px] flex-col justify-end p-6">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <CategoryBadge :category="article.category" />
        <span
          v-if="article.threatLevel"
          :class="['inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', THREAT_META[article.threatLevel].color]"
        >
          <span :class="['h-1.5 w-1.5 rounded-full', THREAT_META[article.threatLevel].dot]" />
          {{ THREAT_META[article.threatLevel].label }}
        </span>
        <span class="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur">
          头条焦点
        </span>
      </div>

      <h3 class="max-w-2xl text-balance text-2xl font-bold leading-snug text-white md:text-3xl">
        {{ article.title }}
      </h3>
      <p class="mt-2 max-w-xl line-clamp-2 text-sm text-white/75">{{ article.summary }}</p>

      <div class="mt-4 flex items-center gap-4 text-xs text-white/60">
        <span>{{ timeAgo(article.publishedAt) }}</span>
        <span class="flex items-center gap-1"><Eye class="h-3.5 w-3.5" />{{ formatNumber(article.viewCount) }}阅读</span>
        <span v-if="article.competitorName" class="text-white/70">· {{ article.competitorName }}</span>
        <span class="ml-auto flex items-center gap-1 font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          阅读全文 <ArrowRight class="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  </RouterLink>
</template>
