<script setup lang="ts">
import {
  Bot, Cpu, Activity, UserCircle, Truck, LayoutGrid,
  type LucideIcon,
} from 'lucide-vue-next'
import type { ToolItem } from '@/types/home'

defineProps<{ items: ToolItem[] }>()

const iconMap: Record<string, LucideIcon> = {
  Bot, Cpu, Activity, UserCircle, Truck, LayoutGrid,
}
</script>

<template>
  <section class="rounded-xl border bg-white p-6 shadow-sm">
    <div class="mb-5 flex items-center gap-2">
      <span class="text-xl"></span>
      <h2 class="text-lg font-bold tracking-tight">智能工作台</h2>
      <span class="ml-auto rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-0.5 text-xs text-white">智能应用</span>
    </div>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <button
        v-for="t in items"
        :key="t.id"
        class="group relative flex cursor-pointer flex-col items-center gap-2.5 rounded-xl border border-transparent p-4 transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/50 hover:shadow-md"
      >
        <div
          class="flex h-11 w-11 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110"
          :style="{ backgroundColor: `${t.color}15` }"
        >
          <component
            :is="iconMap[t.icon]"
            class="h-5 w-5"
            :style="{ color: t.color }"
          />
        </div>
        <div class="text-center">
          <div class="text-sm font-semibold text-foreground">{{ t.name }}</div>
          <div class="mt-0.5 text-[11px] text-muted-foreground/60">{{ t.description }}</div>
        </div>
      </button>
    </div>
  </section>
</template>
