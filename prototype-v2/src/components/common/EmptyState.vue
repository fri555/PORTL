<script setup lang="ts">
defineProps<{
  icon?: string
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <div class="mb-4 text-4xl text-muted">{{ icon || '📭' }}</div>
    <p class="text-sm font-medium text-charcoal">{{ title || '暂无内容' }}</p>
    <p v-if="description" class="mt-1 text-xs text-muted">{{ description }}</p>
  </div>
</template>
