<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'

const route = useRoute()
const showLayout = computed(() => !route.path.startsWith('/auth'))
</script>

<template>
  <div v-if="showLayout" class="flex min-h-screen flex-col bg-muted/30">
    <AppHeader />
    <main class="flex-1">
      <router-view />
    </main>
  </div>
  <router-view v-else />
</template>
