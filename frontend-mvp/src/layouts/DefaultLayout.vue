<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import AppFooter from '@/components/common/AppFooter.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-muted/30">
    <AppHeader />
    <main class="mobile-safe-bottom flex-1 md:pb-0">
      <RouterView />
    </main>
    <AppFooter class="hidden md:block" />
  </div>
</template>
