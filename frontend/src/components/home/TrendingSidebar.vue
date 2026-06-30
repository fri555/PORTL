<script setup lang="ts">
import {
  Bot, Cpu, Activity, UserCircle, Truck, LayoutGrid, AppWindow,
  type LucideIcon,
} from 'lucide-vue-next'
import type { ToolItem } from '@/types/home'

defineProps<{ items: ToolItem[] }>()

const iconMap: Record<string, LucideIcon> = {
  Bot, Cpu, Activity, UserCircle, Truck, LayoutGrid,
}

function handleToolClick(tool: ToolItem) {
  // TODO: route to tool page or open in new tab
  console.log('Open tool:', tool.name)
}
</script>

<template>
  <div class="flex h-full flex-col rounded-xl border bg-white p-5 shadow-sm">
    <div class="mb-4 flex items-center gap-2">
      <AppWindow class="h-5 w-5 text-indigo-500" />
      <h2 class="text-lg font-bold tracking-tight">智能工作台</h2>
    </div>

    <ul class="flex-1 space-y-2">
      <li v-for="t in items" :key="t.id">
        <button
          class="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all hover:bg-accent"
          @click="handleToolClick(t)"
        >
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110"
            :style="{ backgroundColor: `${t.color}18` }"
          >
            <component :is="iconMap[t.icon]" class="h-4.5 w-4.5" :style="{ color: t.color }" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold text-foreground">{{ t.name }}</div>
            <div class="mt-0.5 text-[11px] text-muted-foreground/70 leading-tight">{{ t.description }}</div>
          </div>
          <span class="shrink-0 text-[10px] text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100">进入 →</span>
        </button>
      </li>
    </ul>

    <p class="mt-3 text-center text-[11px] text-muted-foreground/50">
      更多应用接入中，敬请期待
    </p>
  </div>
</template>
