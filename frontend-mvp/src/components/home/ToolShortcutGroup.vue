<script setup lang="ts">
import { LayoutGrid, ExternalLink, Truck, PenTool, Search, BarChart3, FileText } from 'lucide-vue-next'
import type { ComponentSize } from '@/types/home'

const props = defineProps<{ size?: ComponentSize }>()

interface Tool {
  name: string
  description: string
  icon: string
  color: string
}

const iconComponentMap: Record<string, any> = {
  PenTool, Search, BarChart3, FileText, Truck, LayoutGrid,
}

const tools: Tool[] = [
  { name: 'AI写作', description: '营销文案、标书生成', icon: 'PenTool', color: '#f97316' },
  { name: '智能搜索', description: '文档/知识库搜索', icon: 'Search', color: '#3b82f6' },
  { name: '数据分析', description: 'ChatBI自动分析', icon: 'BarChart3', color: '#8b5cf6' },
  { name: '文档处理', description: '合同审查、摘要', icon: 'FileText', color: '#10b981' },
  { name: '智能仓储', description: '仓储智能优化', icon: 'Truck', color: '#f59e0b' },
  { name: '更多工具', description: '探索所有AI工具', icon: 'LayoutGrid', color: '#6b7280' },
]

function openTool(tool: Tool) {
  console.log('Open tool:', tool.name)
}
</script>

<template>
  <div class="flex h-full flex-col rounded-xl border border-zinc-200/60 bg-white p-4 shadow-sm">
    <div class="mb-3 flex items-center gap-2">
      <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-sm shadow-teal-200">
        <LayoutGrid class="h-4 w-4 text-white" />
      </div>
      <h3 class="text-sm font-bold tracking-tight text-zinc-800">智能工具</h3>
    </div>

    <div :class="['grid flex-1 gap-2.5', props.size === '2x1' ? 'grid-cols-2' : props.size === '4x2' ? 'grid-cols-3' : 'grid-cols-2']">
      <button
        v-for="tool in (props.size === '2x1' ? tools.slice(0, 2) : tools)"
        :key="tool.name"
        class="group flex flex-col items-center justify-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 transition-all hover:border-teal-200 hover:bg-teal-50/30 hover:shadow-sm"
        @click="openTool(tool)"
      >
        <div
          class="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm transition-transform duration-200 group-hover:scale-110"
          :style="{
            backgroundImage: `linear-gradient(135deg, ${tool.color}DD, ${tool.color}99)`,
          }"
        >
          <component :is="iconComponentMap[tool.icon]" class="h-5 w-5 text-white" />
        </div>
        <div class="text-center">
          <p class="text-[12px] font-semibold text-zinc-700">{{ tool.name }}</p>
          <p v-if="props.size !== '2x1'" class="mt-0.5 text-[10px] text-zinc-400/60">{{ tool.description }}</p>
        </div>
        <ExternalLink class="absolute right-2 top-2 h-3 w-3 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-60" />
      </button>
    </div>
  </div>
</template>
