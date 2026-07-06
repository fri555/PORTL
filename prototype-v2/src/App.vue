<script setup lang="ts">
import AppHeader from '@/components/common/AppHeader.vue'
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-canvas text-charcoal">
    <AppHeader />
    <main class="flex-1">
      <RouterView />
    </main>
  </div>
</template>
