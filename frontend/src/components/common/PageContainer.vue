<script setup lang="ts">
defineProps<{ title?: string; breadcrumb?: string[] }>()
</script>

<template>
  <div class="container py-4 md:py-6">
    <div v-if="title || breadcrumb" class="mb-4 md:mb-6">
      <nav v-if="breadcrumb" class="mb-1.5 flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap text-xs text-muted-foreground">
        <template v-for="(b, i) in breadcrumb" :key="i">
          <span :class="i === breadcrumb.length - 1 ? 'text-foreground' : ''">{{ b }}</span>
          <span v-if="i < breadcrumb.length - 1">/</span>
        </template>
      </nav>
      <h1 v-if="title" class="text-xl font-bold tracking-tight md:text-2xl">{{ title }}</h1>
    </div>
    <slot />
  </div>
</template>
