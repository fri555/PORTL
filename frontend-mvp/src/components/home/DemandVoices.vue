<script setup lang="ts">
import { Flame } from 'lucide-vue-next'
import type { DemandVoice } from '@/types/home'
import SectionHeader from '@/components/common/SectionHeader.vue'

defineProps<{ items: DemandVoice[] }>()

const statusClass: Record<string, string> = {
  已排期: 'bg-blue-50 text-blue-600',
  评审中: 'bg-amber-50 text-amber-600',
  开发中: 'bg-violet-50 text-violet-600',
  已上线: 'bg-emerald-50 text-emerald-600',
}
</script>

<template>
  <section class="rounded-xl border bg-white p-5 shadow-sm">
    <SectionHeader title="需求之声" icon="💬" more-label="查看全部" more-disabled />

    <ul class="space-y-1">
      <li
        v-for="(d, i) in items"
        :key="d.id"
        class="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
      >
        <Flame class="mt-0.5 h-4 w-4 shrink-0" :class="i === 0 ? 'text-red-500' : 'text-orange-400'" />
        <div class="min-w-0 flex-1">
          <p class="line-clamp-1 text-sm font-medium">{{ d.title }}</p>
          <div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{{ d.department }}</span>
            <span :class="['rounded px-1.5 py-0.5 font-medium', statusClass[d.status] ?? 'bg-muted text-muted-foreground']">{{ d.status }}</span>
          </div>
        </div>
        <span class="shrink-0 text-sm font-bold text-primary">{{ d.voteCount }}票</span>
      </li>
    </ul>

    <div class="mt-4 flex gap-2">
      <button
        disabled
        class="flex-1 cursor-not-allowed rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary/50"
        title="即将上线"
      >
        我要提需求
      </button>
      <button
        disabled
        class="cursor-not-allowed rounded-md border px-3 py-2 text-sm text-muted-foreground/40"
        title="即将上线"
      >
        查看全部
      </button>
    </div>
  </section>
</template>
