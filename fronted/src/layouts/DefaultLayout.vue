<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import AppFooter from '@/components/common/AppFooter.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-muted/30">
    <AppHeader />
    <main class="flex-1">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>
