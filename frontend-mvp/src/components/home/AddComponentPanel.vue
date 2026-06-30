<script setup lang="ts">
import { ref, computed } from 'vue'
import type { HomeComponentType, ComponentSize } from '@/types/home'
import { COMPONENT_META } from '@/types/home'
import {
  Search, LayoutGrid, Swords, Globe, BarChart3,
  ClipboardList, LayoutPanelTop, Zap, UserRound, Trophy,
  X, Plus,
  type LucideIcon,
} from 'lucide-vue-next'

const props = defineProps<{
  existingTypes: HomeComponentType[]
}>()

const emit = defineEmits<{
  add: [type: HomeComponentType, size?: ComponentSize]
  close: []
}>()

const searchQuery = ref('')
const activeCategory = ref<'widgets' | 'links' | 'custom'>('widgets')

const iconMap: Record<string, LucideIcon> = {
  Search, LayoutGrid, Swords, Globe, BarChart3,
  ClipboardList, LayoutPanelTop, Zap, UserRound, Trophy,
}

const allTypes: HomeComponentType[] = [
  'tool_shortcuts',
  'competitor_snapshot',
  'industry_headlines',
  'business_data',
  'my_todo',
  'system_shortcuts',
  'model_usage',
  'digital_human',
  'dept_value_ranking',
]

const categoryTypes: Record<typeof activeCategory.value, HomeComponentType[]> = {
  widgets: [
    'business_data',
    'industry_headlines',
    'competitor_snapshot',
    'my_todo',
    'model_usage',
    'digital_human',
    'dept_value_ranking',
  ],
  links: ['tool_shortcuts', 'system_shortcuts'],
  custom: ['tool_shortcuts', 'system_shortcuts'],
}

const categoryTabs = [
  { key: 'widgets', label: '小组件' },
  { key: 'links', label: '网址导航' },
  { key: 'custom', label: '自定义图标' },
] as const

void props

const filteredTypes = computed(() => {
  const scoped = categoryTypes[activeCategory.value] ?? allTypes
  if (!searchQuery.value.trim()) return scoped
  const q = searchQuery.value.toLowerCase()
  return scoped.filter((t) => {
    const meta = COMPONENT_META[t]
    return meta.name.toLowerCase().includes(q)
  })
})

function onAdd(type: HomeComponentType, size?: ComponentSize) {
  emit('add', type, size)
}

function onClose() {
  emit('close')
}
</script>

<template>
  <Transition name="modal">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 p-4 backdrop-blur-sm" @click.self="onClose">
      <div class="flex max-h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border bg-white shadow-2xl">
      <div class="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h3 class="text-base font-bold tracking-tight">新增组件</h3>
          <p class="mt-0.5 text-xs text-muted-foreground">选择小组件、工具入口或系统快捷方式添加到首页桌面</p>
        </div>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-zinc-100"
          @click="onClose"
        >
          <X class="h-4 w-4 text-zinc-500" />
        </button>
      </div>

      <!-- Search -->
      <div class="border-b px-5 py-3">
        <div class="flex items-center gap-2 rounded-lg border bg-zinc-50 px-3 py-2">
          <Search class="h-4 w-4 text-zinc-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索组件..."
            class="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-zinc-400 focus:outline-none"
          />
        </div>
      </div>

      <!-- Component list -->
      <div class="flex-1 overflow-y-auto p-5">
        <div v-if="filteredTypes.length === 0" class="py-8 text-center">
          <p class="text-[13px] text-muted-foreground/60">没有可添加的组件</p>
        </div>

        <div class="mb-4 flex flex-wrap gap-2">
          <button
            v-for="tab in categoryTabs"
            :key="tab.key"
            :class="[
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              activeCategory === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
            ]"
            @click="activeCategory = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
        <div
          v-for="type in filteredTypes"
          :key="type"
          class="rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4 text-left transition-all hover:border-primary/20 hover:bg-accent hover:shadow-sm"
        >
          <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-orange-400/20">
            <component :is="iconMap[COMPONENT_META[type].icon]" class="h-4.5 w-4.5 text-primary" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-[13px] font-medium text-foreground">{{ COMPONENT_META[type].name }}</div>
            <div class="mt-0.5 text-[11px] text-muted-foreground/60">
              选择尺寸后添加
            </div>
          </div>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <button
              v-for="size in COMPONENT_META[type].allowedSizes"
              :key="size"
              class="flex items-center gap-2 rounded-xl border bg-white px-2.5 py-1.5 text-xs text-zinc-600 transition-colors hover:border-primary/40 hover:text-primary"
              @click="onAdd(type, size)"
            >
              <span
                class="grid h-8 place-items-center rounded-lg bg-zinc-100 px-2 text-[10px] font-semibold"
                :class="size === '1x1' ? 'w-8' : size === '4x4' || size === '4x2' ? 'w-16' : size === '2x4' ? 'w-12' : 'w-10'"
              >
                {{ size }}
              </span>
              <Plus class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        </div>
      </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
