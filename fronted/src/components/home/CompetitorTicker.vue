<script setup lang="ts">
import type { Article } from '@/types/article'
import CompetitorCard from '@/components/competitor/CompetitorCard.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'

defineProps<{ items: Article[] }>()
</script>

<template>
  <section>
    <SectionHeader
      title="竞对情报"
      icon="⚔️"
      more-to="/news/competitor"
      more-label="更多"
    />
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <CompetitorCard v-for="a in items" :key="a.id" :article="a" />
    </div>
  </section>
</template>
