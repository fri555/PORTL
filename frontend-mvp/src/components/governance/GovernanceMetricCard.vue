<script setup lang="ts">
import type { GovernanceMetric } from '@/types/governance'
defineProps<{ metric: GovernanceMetric }>()
</script>

<template>
  <article
    class="rounded-2xl border p-4 md:p-5"
    :class="
      metric.tone === 'accent'
        ? 'border-[#ff5530] bg-[#ff5530] text-white'
        : 'border-zinc-200 bg-white text-zinc-950'
    "
  >
    <p class="text-xs" :class="metric.tone === 'accent' ? 'text-white/75' : 'text-zinc-500'">
      {{ metric.label }}
    </p>
    <strong class="mt-2 block text-2xl font-semibold tracking-tight md:text-3xl">{{
      metric.value
    }}</strong>
    <p
      class="mt-1 text-xs"
      :class="
        metric.tone === 'accent'
          ? 'text-white/85'
          : metric.tone === 'warning'
            ? 'text-rose-600'
            : 'text-emerald-600'
      "
    >
      {{ metric.note }}
    </p>
  </article>
</template>
