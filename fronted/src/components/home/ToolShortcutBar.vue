<script setup lang="ts">
import {
  MessageSquare, BarChart3, FileText, Image, Search, LayoutGrid,
  type LucideIcon,
} from 'lucide-vue-next'
import type { ToolItem } from '@/types/home'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

defineProps<{ items: ToolItem[] }>()

const iconMap: Record<string, LucideIcon> = {
  MessageSquare, BarChart3, FileText, Image, Search, LayoutGrid,
}
</script>

<template>
  <section class="rounded-xl border bg-white p-5 shadow-sm">
    <div class="mb-4 flex items-center gap-2">
      <span>🛠</span>
      <h2 class="text-lg font-bold tracking-tight">AI工具箱</h2>
      <span class="ml-auto text-sm text-muted-foreground/40" title="即将上线">全部</span>
    </div>
    <TooltipProvider :delay-duration="200">
      <div class="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <Tooltip v-for="t in items" :key="t.id">
          <TooltipTrigger as-child>
            <button
              class="flex cursor-not-allowed flex-col items-center gap-2 rounded-lg border bg-muted/30 px-2 py-3 text-muted-foreground/60 transition-colors hover:bg-muted"
              tabindex="-1"
            >
              <component :is="iconMap[t.icon]" class="h-5 w-5" />
              <span class="text-xs">{{ t.name }}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>即将上线</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  </section>
</template>
