<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'

defineProps<{ title: string; description?: string }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
    <Inbox class="mb-3 h-10 w-10 text-muted-foreground/40" />
    <p class="font-medium text-foreground">{{ title }}</p>
    <p v-if="description" class="mt-1 text-sm text-muted-foreground">{{ description }}</p>
    <slot />
  </div>
</template>
