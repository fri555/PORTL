<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6">
    <div v-if="title || $slots.header" class="mb-6">
      <slot name="header">
        <h1 class="text-heading-sm font-semibold text-ink">{{ title }}</h1>
        <p v-if="description" class="mt-1 text-body-sm text-stone">{{ description }}</p>
      </slot>
    </div>
    <slot />
  </div>
</template>
