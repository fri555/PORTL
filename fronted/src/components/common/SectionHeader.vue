<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ChevronRight } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    title: string
    icon?: string
    moreTo?: string
    moreLabel?: string
    moreDisabled?: boolean
  }>(),
  { moreLabel: '更多' },
)
</script>

<template>
  <div class="mb-4 flex items-center justify-between">
    <h2 class="flex items-center gap-2 text-lg font-bold tracking-tight">
      <span v-if="icon">{{ icon }}</span>
      <span>{{ title }}</span>
    </h2>
    <RouterLink
      v-if="moreTo"
      :to="moreTo"
      class="flex items-center gap-0.5 text-sm text-muted-foreground transition-colors hover:text-primary"
    >
      {{ moreLabel }}<ChevronRight class="h-4 w-4" />
    </RouterLink>
    <span
      v-else-if="moreDisabled"
      class="cursor-not-allowed text-sm text-muted-foreground/40"
      title="即将上线"
    >
      {{ moreLabel }}
    </span>
  </div>
</template>
