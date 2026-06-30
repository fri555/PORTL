<script setup lang="ts">
import type { DeptRankItem } from '@/types/home'
import SectionHeader from '@/components/common/SectionHeader.vue'

defineProps<{ items: DeptRankItem[] }>()

const medals = ['🥇', '🥈', '🥉']
</script>

<template>
  <section class="rounded-xl border bg-white p-5 shadow-sm">
    <SectionHeader title="部门AI价值榜" icon="🏆" more-label="完整榜单" more-disabled />
    <ul class="space-y-1">
      <li
        v-for="item in items"
        :key="item.rank"
        class="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
      >
        <span class="flex h-7 w-7 shrink-0 items-center justify-center text-base">
          <template v-if="item.rank <= 3">{{ medals[item.rank - 1] }}</template>
          <template v-else><span class="text-sm font-bold text-muted-foreground">{{ item.rank }}</span></template>
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold">{{ item.department }}</p>
          <p class="truncate text-xs text-muted-foreground">{{ item.metric }}</p>
        </div>
        <span class="shrink-0 text-sm font-bold text-primary">{{ item.score }}</span>
      </li>
    </ul>
    <p class="mt-3 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
      💡 按业务价值排名，非单纯活跃度
    </p>
  </section>
</template>
