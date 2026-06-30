<script setup lang="ts">
import { computed } from 'vue'
import { useAIChat } from '@/composables/useAIChat'
import { Brain } from 'lucide-vue-next'

const { contextStats, isStreaming } = useAIChat()

const levelClass = computed(() => {
  const pct = contextStats.value.usagePercent
  if (pct >= 90) return 'text-red-600 bg-red-50 border-red-200'
  if (pct >= 70) return 'text-amber-600 bg-amber-50 border-amber-200'
  if (pct >= 40) return 'text-blue-600 bg-blue-50 border-blue-200'
  return 'text-zinc-500 bg-zinc-50 border-zinc-200'
})

const levelLabel = computed(() => {
  const pct = contextStats.value.usagePercent
  if (pct >= 90) return '即将超出'
  if (pct >= 70) return '较满'
  return '正常'
})
</script>

<template>
  <div
    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
    :class="levelClass"
    title="消息数 · 估算 Token 用量 · 窗口上限"
  >
    <Brain class="h-3 w-3" />
    <span class="tabular-nums">{{ contextStats.messageCount }}</span>
    <span class="opacity-60">条</span>
    <span class="tabular-nums">~{{ (contextStats.estimatedTokens / 1000).toFixed(1) }}k</span>
    <span class="opacity-60">/</span>
    <span class="tabular-nums">{{ (contextStats.maxTokens / 1000).toFixed(0) }}k</span>
    <span class="rounded-full bg-white/60 px-1.5 py-0.5 text-[10px]">{{ levelLabel }}</span>
  </div>
</template>
