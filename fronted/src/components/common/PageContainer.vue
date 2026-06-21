<script setup lang="ts">
defineProps<{ title?: string; breadcrumb?: string[] }>()
</script>

<template>
  <div class="container py-6">
    <div v-if="title || breadcrumb" class="mb-6">
      <nav v-if="breadcrumb" class="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
        <template v-for="(b, i) in breadcrumb" :key="i">
          <span :class="i === breadcrumb.length - 1 ? 'text-foreground' : ''">{{ b }}</span>
          <span v-if="i < breadcrumb.length - 1">/</span>
        </template>
      </nav>
      <h1 v-if="title" class="text-2xl font-bold tracking-tight">{{ title }}</h1>
    </div>
    <slot />
  </div>
</template>
