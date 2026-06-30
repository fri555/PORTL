<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HomeComponent, ComponentSize } from '@/types/home'
import { SIZE_GRID, COMPONENT_META } from '@/types/home'
import {
  X,
  ChevronUp,
  ChevronDown,
  Maximize2,
  ExternalLink,
  LayoutGrid,
  Search,
  Swords,
  Globe,
  BarChart3,
  ClipboardList,
  LayoutPanelTop,
  Zap,
  UserRound,
  Trophy,
  type LucideIcon,
} from 'lucide-vue-next'
import SizeSwitcher from './SizeSwitcher.vue'
import GlobalSearch from './GlobalSearch.vue'
import ToolShortcutGroup from './ToolShortcutGroup.vue'
import CompetitorSnapshot from './CompetitorSnapshot.vue'
import IndustryHeadlines from './IndustryHeadlines.vue'
import BusinessDataCard from './BusinessDataCard.vue'
import MyTodoWidget from './MyTodoWidget.vue'
import SystemShortcuts from './SystemShortcuts.vue'
import ModelUsageWidget from './ModelUsageWidget.vue'
import DigitalHumanEntry from './DigitalHumanEntry.vue'
import DeptValueRanking from './DeptValueRanking.vue'

const props = defineProps<{
  component: HomeComponent
  isFirst: boolean
  isLast: boolean
  dragging?: boolean
}>()

const emit = defineEmits<{
  remove: [id: string]
  moveUp: [id: string]
  moveDown: [id: string]
  resize: [id: string, size: ComponentSize]
  dragStart: [id: string]
  dragEnd: []
}>()

const showSizePopover = ref(false)
const showContextMenu = ref(false)
const dragOver = ref(false)
const menuPosition = ref({ x: 0, y: 0, maxHeight: 360 })

const gridStyle = computed(() => {
  const size = SIZE_GRID[props.component.size]
  const layout = props.component.layout ?? { x: 0, y: 0 }
  return {
    gridColumn: `${layout.x + 1} / span ${size.cols}`,
    gridRow: `${layout.y + 1} / span ${size.rows}`,
  }
})

const meta = computed(() => COMPONENT_META[props.component.type])
const isIconTile = computed(() => props.component.size === '1x1')
const iconLabel = computed(() => String(props.component.config.title || meta.value.name))
const iconUrl = computed(() => String(props.component.config.url || ''))
const iconColor = computed(() => String(props.component.config.color || '#ff6a00'))

const iconMap: Record<string, LucideIcon> = {
  LayoutGrid,
  Search,
  Swords,
  Globe,
  BarChart3,
  ClipboardList,
  LayoutPanelTop,
  Zap,
  UserRound,
  Trophy,
}

const iconComponent = computed(() => iconMap[meta.value.icon] || LayoutGrid)

const componentMap: Record<string, any> = {
  global_search: GlobalSearch,
  tool_shortcuts: ToolShortcutGroup,
  competitor_snapshot: CompetitorSnapshot,
  industry_headlines: IndustryHeadlines,
  business_data: BusinessDataCard,
  my_todo: MyTodoWidget,
  system_shortcuts: SystemShortcuts,
  model_usage: ModelUsageWidget,
  digital_human: DigitalHumanEntry,
  dept_value_ranking: DeptValueRanking,
}

const childComponent = computed(() => componentMap[props.component.type])

function estimateMenuHeight(withSizes: boolean) {
  const baseHeight = props.component.size === '1x1' ? 260 : 216
  const sizeHeight = withSizes ? 42 + meta.value.allowedSizes.length * 42 : 0
  return Math.min(520, baseHeight + sizeHeight)
}

function placeMenu(x: number, y: number, estimatedHeight = 320) {
  const margin = 12
  const width = 196
  const safeHeight = Math.min(estimatedHeight, window.innerHeight - margin * 2)

  menuPosition.value = {
    x: Math.max(margin, Math.min(x, window.innerWidth - width - margin)),
    y: Math.max(margin, Math.min(y, window.innerHeight - safeHeight - margin)),
    maxHeight: safeHeight,
  }
}

function toggleSizePopover() {
  const next = !showSizePopover.value
  showSizePopover.value = next
  if (next) {
    placeMenu(menuPosition.value.x, menuPosition.value.y, estimateMenuHeight(true))
  }
}

function onRemove() {
  emit('remove', props.component.id)
  showContextMenu.value = false
}

function onMoveUp() {
  emit('moveUp', props.component.id)
}

function onMoveDown() {
  emit('moveDown', props.component.id)
}

function onResize(size: ComponentSize) {
  emit('resize', props.component.id, size)
  showSizePopover.value = false
  showContextMenu.value = false
}

// ---- Drag and Drop ----
function onDragStart(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', props.component.id)
  }
  emit('dragStart', props.component.id)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  e.preventDefault()
}

function onContextMenu(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  placeMenu(e.clientX, e.clientY, estimateMenuHeight(false))
  showContextMenu.value = true
}

function openIconLink() {
  if (iconUrl.value) window.open(iconUrl.value, '_blank', 'noopener')
}
</script>

<template>
  <div
    :class="[
      'desktop-widget group/card relative z-10 min-h-0 transition-all duration-200',
      dragOver && !dragging && 'rounded-2xl bg-primary/10 ring-2 ring-primary/50',
      dragging && 'scale-[0.98] opacity-45',
    ]"
    :style="gridStyle"
    draggable="true"
    @dragstart="onDragStart"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @dragend="emit('dragEnd')"
    @contextmenu="onContextMenu"
  >
    <button
      v-if="isIconTile"
      class="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl text-center transition-transform hover:-translate-y-0.5"
      @click="openIconLink"
    >
      <span
        class="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
        :style="{ backgroundColor: iconColor }"
      >
        <component :is="iconComponent" class="h-7 w-7" />
      </span>
      <span class="line-clamp-2 text-xs font-medium leading-tight text-zinc-700">{{ iconLabel }}</span>
    </button>

    <component v-else :is="childComponent" :size="component.size" v-bind="component.config" />

    <Teleport to="body">
    <Transition name="popover">
      <div
        v-if="showContextMenu"
        class="soft-menu fixed z-[9999] w-44 overflow-y-auto overscroll-contain rounded-2xl border bg-white p-2 text-sm text-zinc-700 shadow-2xl"
        :style="{ left: `${menuPosition.x}px`, top: `${menuPosition.y}px`, maxHeight: `${menuPosition.maxHeight}px` }"
        @pointerdown.stop
        @click.stop
        @mouseleave="showContextMenu = false"
      >
        <button class="flex w-full items-center gap-2 rounded-xl px-3 py-2 hover:bg-zinc-50" @click.stop="toggleSizePopover">
          <Maximize2 class="h-4 w-4" />
          调整尺寸
        </button>
        <button class="flex w-full items-center gap-2 rounded-xl px-3 py-2 hover:bg-zinc-50 disabled:opacity-40" :disabled="isFirst" @click.stop="onMoveUp">
          <ChevronUp class="h-4 w-4" />
          前移
        </button>
        <button class="flex w-full items-center gap-2 rounded-xl px-3 py-2 hover:bg-zinc-50 disabled:opacity-40" :disabled="isLast" @click.stop="onMoveDown">
          <ChevronDown class="h-4 w-4" />
          后移
        </button>
        <button v-if="isIconTile" class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-zinc-400" disabled>
          <ExternalLink class="h-4 w-4" />
          编辑图标
        </button>
        <button class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-red-500 hover:bg-red-50" @click.stop="onRemove">
          <X class="h-4 w-4" />
          删除
        </button>
        <div v-if="showSizePopover" class="mt-2 border-t pt-2">
          <SizeSwitcher
            :current-size="component.size"
            :allowed-sizes="meta.allowedSizes"
            @select="onResize"
          />
        </div>
      </div>
    </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.desktop-widget {
  overflow: visible;
}

.desktop-widget :deep(> *:not(.absolute)) {
  height: 100%;
  overflow: hidden;
}

@media (min-width: 1024px) {
  .desktop-widget {
    min-height: 0;
  }
}

.popover-enter-active,
.popover-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.soft-menu {
  scrollbar-width: thin;
  scrollbar-color: rgb(148 163 184 / 0.35) transparent;
}

.soft-menu::-webkit-scrollbar {
  width: 5px;
}

.soft-menu::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgb(148 163 184 / 0.35);
}
</style>
