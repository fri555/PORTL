<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Eye, MessageSquare, Clock } from 'lucide-vue-next'
import type { Article } from '@/types/article'
import { timeAgo, formatNumber } from '@/lib/format'
import SectionHeader from '@/components/common/SectionHeader.vue'

defineProps<{ items: Article[] }>()
</script>

<template>
  <section>
    <SectionHeader title="行业前沿" icon="📰" more-to="/news?category=industry" />
    <div class="space-y-3">
      <RouterLink
        v-for="a in items"
        :key="a.id"
        :to="{ name: 'article-detail', params: { id: a.id } }"
        class="group flex gap-4 rounded-xl border bg-white p-3 shadow-sm transition-all hover:shadow-md"
      >
        <img
          :src="a.coverImage"
          :alt="a.title"
          class="h-20 w-28 shrink-0 rounded-lg object-cover"
        />
        <div class="min-w-0 flex-1">
          <h3 class="line-clamp-1 text-sm font-semibold transition-colors group-hover:text-primary">{{ a.title }}</h3>
          <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{{ a.summary }}</p>
          <div class="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span class="flex items-center gap-1"><Clock class="h-3 w-3" />{{ timeAgo(a.publishedAt) }}</span>
            <span class="flex items-center gap-1"><Eye class="h-3 w-3" />{{ formatNumber(a.viewCount) }}</span>
            <span class="flex items-center gap-1"><MessageSquare class="h-3 w-3" />{{ a.commentCount }}</span>
          </div>
        </div>
      </RouterLink>
    </div>
  </section>
</template>
