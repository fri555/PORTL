<script setup lang="ts">
import { LayoutPanelTop, ShoppingCart, Building2, FileText, Users, Settings, type LucideIcon } from 'lucide-vue-next'
import type { ComponentSize } from '@/types/home'

defineProps<{ size?: ComponentSize }>()

interface Shortcut {
  name: string
  url: string
  icon: string
  color: string
}

const iconMap: Record<string, LucideIcon> = {
  ShoppingCart, Building2, FileText, Users, Settings, LayoutPanelTop,
}

const shortcuts: Shortcut[] = [
  { name: 'ERP系统', url: '#', icon: 'Building2', color: '#3b82f6' },
  { name: '电商后台', url: '#', icon: 'ShoppingCart', color: '#f59e0b' },
  { name: 'OA办公', url: '#', icon: 'FileText', color: '#8b5cf6' },
  { name: 'HR系统', url: '#', icon: 'Users', color: '#06b6d4' },
  { name: '更多系统', url: '#', icon: 'LayoutPanelTop', color: '#6b7280' },
]

function openShortcut(shortcut: Shortcut) {
  console.log('Open shortcut:', shortcut.name)
}
</script>

<template>
  <div class="flex h-full flex-col rounded-xl border border-zinc-200/60 bg-white p-4 shadow-sm">
    <div class="mb-3 flex items-center gap-2">
      <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 shadow-sm shadow-violet-200">
        <LayoutPanelTop class="h-4 w-4 text-white" />
      </div>
      <h3 class="text-sm font-bold tracking-tight text-zinc-800">系统快捷入口</h3>
    </div>

    <div :class="['grid flex-1 gap-2', size === '2x1' ? 'grid-cols-5' : 'grid-cols-2']">
      <button
        v-for="shortcut in shortcuts"
        :key="shortcut.name"
        class="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-zinc-100 bg-zinc-50/50 p-2 transition-all hover:border-violet-200 hover:bg-violet-50/50 hover:shadow-sm"
        @click="openShortcut(shortcut)"
      >
        <div
          class="flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110"
          :style="{ backgroundColor: `${shortcut.color}14` }"
        >
          <component :is="iconMap[shortcut.icon]" class="h-4.5 w-4.5" :style="{ color: shortcut.color }" />
        </div>
        <span class="text-[11px] font-medium text-zinc-500">{{ shortcut.name }}</span>
      </button>
    </div>
  </div>
</template>
