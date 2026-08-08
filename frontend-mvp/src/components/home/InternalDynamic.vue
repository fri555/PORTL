<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Pin } from 'lucide-vue-next'
import type { Article } from '@/types/article'
import { timeAgo } from '@/lib/format'
import SectionHeader from '@/components/common/SectionHeader.vue'

defineProps<{ items: Article[] }>()
</script>

<template>
  <section class="rounded-xl border bg-white p-5 shadow-sm">
    <SectionHeader title="集团动态" icon="🏢" more-to="/news?category=internal" />
    <ul class="space-y-1">
      <li v-for="a in items" :key="a.id">
        <RouterLink
          :to="{ name: 'article-detail', params: { id: a.id } }"
          class="group flex items-start gap-2.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
        >
          <Pin class="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <div class="min-w-0 flex-1">
            <p class="line-clamp-1 text-sm font-medium transition-colors group-hover:text-primary">{{ a.title }}</p>
            <div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{{ a.department }}</span>
              <span v-if="a.subCategory" class="rounded bg-muted px-1.5 py-0.5">{{ a.subCategory }}</span>
              <span>· {{ timeAgo(a.publishedAt) }}</span>
            </div>
          </div>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
