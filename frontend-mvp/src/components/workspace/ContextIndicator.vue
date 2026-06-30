<script setup lang="ts">
import { computed } from 'vue'
import { useAIChat } from '@/composables/useAIChat'

const { contextStats } = useAIChat()

const levelLabel = computed(() => {
  const pct = contextStats.value.usagePercent
  if (pct >= 90) return '即将超出'
  if (pct >= 70) return '较满'
  return '正常'
})

const ringStyle = computed(() => {
  const pct = Math.min(Math.max(contextStats.value.usagePercent, 0), 100)
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : pct >= 40 ? '#3b82f6' : '#94a3b8'
  return {
    background: `conic-gradient(${color} ${pct * 3.6}deg, #e4e4e7 0deg)`,
  }
})
</script>

<template>
  <div class="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white p-1" :title="`上下文 ${levelLabel}`">
    <span class="grid h-5 w-5 place-items-center rounded-full" :style="ringStyle">
      <span class="h-2.5 w-2.5 rounded-full bg-white" />
    </span>
  </div>
</template>
