<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HomeComponent, ComponentSize, GridPosition } from '@/types/home'
import { SIZE_GRID } from '@/types/home'
import ComponentCard from './ComponentCard.vue'

const props = defineProps<{
  components: HomeComponent[]
  density?: 'relaxed' | 'balanced' | 'compact'
}>()

const emit = defineEmits<{
  remove: [id: string]
  moveUp: [id: string]
  moveDown: [id: string]
  resize: [id: string, size: ComponentSize]
  reorder: [fromId: string, toId: string]
  move: [id: string, position: GridPosition, cols: number]
}>()

function isFirst(id: string): boolean {
  const idx = props.components.findIndex((c) => c.id === id)
  return idx === 0
}

function isLast(id: string): boolean {
  const idx = props.components.findIndex((c) => c.id === id)
  return idx === props.components.length - 1
}

function onRemove(id: string) {
  emit('remove', id)
}

function onMoveUp(id: string) {
  emit('moveUp', id)
}

function onMoveDown(id: string) {
  emit('moveDown', id)
}

function onResize(id: string, size: ComponentSize) {
  emit('resize', id, size)
}

function onReorder(fromId: string, toId: string) {
  emit('reorder', fromId, toId)
}

const gridRef = ref<HTMLElement | null>(null)
const draggingId = ref<string | null>(null)
const hoverCell = ref<GridPosition | null>(null)

const densityConfig = computed(() => {
  const density = props.density ?? 'balanced'
  if (density === 'relaxed') return { cols: 12, rows: 2, rowSize: 108, gap: 16 }
  if (density === 'compact') return { cols: 16, rows: 5, rowSize: 68, gap: 8 }
  return { cols: 14, rows: 4, rowSize: 88, gap: 10 }
})

const draggingComponent = computed(() =>
  props.components.find((component) => component.id === draggingId.value),
)

const gridCellCount = computed(() => {
  const { cols, rows } = densityConfig.value
  return cols * rows
})

const dropPreviewStyle = computed(() => {
  if (!draggingComponent.value || !hoverCell.value) return {}
  const size = SIZE_GRID[draggingComponent.value.size]
  return {
    gridColumn: `${hoverCell.value.x + 1} / span ${size.cols}`,
    gridRow: `${hoverCell.value.y + 1} / span ${size.rows}`,
  }
})

function onDragStart(id: string) {
  draggingId.value = id
}

function updateHoverCell(event: DragEvent) {
  if (!draggingComponent.value || !gridRef.value) return

  const rect = gridRef.value.getBoundingClientRect()
  const { cols, rowSize, gap } = densityConfig.value
  const padding = 8
  const innerWidth = rect.width - padding * 2
  const colWidth = (innerWidth - gap * (cols - 1)) / cols
  const xRaw = Math.floor((event.clientX - rect.left - padding) / (colWidth + gap))
  const yRaw = Math.floor((event.clientY - rect.top - padding) / (rowSize + gap))
  const size = SIZE_GRID[draggingComponent.value.size]

  hoverCell.value = {
    x: Math.max(0, Math.min(xRaw, cols - size.cols)),
    y: Math.max(0, yRaw),
  }
}

function onGridDragOver(event: DragEvent) {
  event.preventDefault()
  updateHoverCell(event)
}

function onGridDrop(event: DragEvent) {
  event.preventDefault()
  updateHoverCell(event)
  if (draggingId.value && hoverCell.value) {
    emit('move', draggingId.value, hoverCell.value, densityConfig.value.cols)
  }
  clearDragState()
}

function clearDragState() {
  draggingId.value = null
  hoverCell.value = null
}
</script>

<template>
  <div
    ref="gridRef"
    :class="[
      'home-desktop-grid',
      `density-${props.density ?? 'balanced'}`,
      draggingId && 'is-dragging',
    ]"
    @dragover="onGridDragOver"
    @drop="onGridDrop"
    @dragend="clearDragState"
  >
    <div v-if="draggingId" class="grid-guide" aria-hidden="true">
      <span v-for="cell in gridCellCount" :key="cell" />
    </div>
    <div v-if="draggingId && hoverCell" class="drop-preview" :style="dropPreviewStyle" aria-hidden="true" />

    <ComponentCard
      v-for="comp in components"
      :key="comp.id"
      :component="comp"
      :is-first="isFirst(comp.id)"
      :is-last="isLast(comp.id)"
      :dragging="draggingId === comp.id"
      @remove="onRemove"
      @move-up="onMoveUp"
      @move-down="onMoveDown"
      @resize="onResize"
      @drag-start="onDragStart"
      @drag-end="clearDragState"
    />
  </div>
</template>

<style scoped>
.home-desktop-grid {
  --grid-row-size: 88px;
  --grid-gap: 10px;
  --grid-cols: 14;
  --grid-rows: 4;
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--grid-cols), minmax(0, 1fr));
  grid-auto-rows: var(--grid-row-size);
  gap: var(--grid-gap);
  border-radius: 22px;
  padding: 8px;
  transition: background-color 180ms ease, outline-color 180ms ease;
}

.home-desktop-grid.is-dragging {
  outline: 1px dashed rgb(37 99 235 / 0.28);
  outline-offset: 6px;
}

.grid-guide {
  pointer-events: none;
  position: absolute;
  inset: 8px;
  z-index: 0;
  display: grid;
  grid-template-columns: repeat(var(--grid-cols), minmax(0, 1fr));
  grid-template-rows: repeat(var(--grid-rows), var(--grid-row-size));
  gap: var(--grid-gap);
}

.grid-guide span {
  border: 1px dashed rgb(37 99 235 / 0.28);
  border-radius: 10px;
  background: transparent;
}

.drop-preview {
  z-index: 1;
  border: 2px dashed rgb(37 99 235 / 0.55);
  border-radius: 18px;
  background: rgb(37 99 235 / 0.06);
}

@media (min-width: 1024px) {
  .home-desktop-grid {
    grid-template-columns: repeat(var(--grid-cols), minmax(0, 1fr));
    min-height: calc(var(--grid-row-size) * var(--grid-rows) + var(--grid-gap) * (var(--grid-rows) - 1));
  }
}

.density-relaxed {
  --grid-cols: 12;
  --grid-rows: 2;
  --grid-row-size: 108px;
  --grid-gap: 16px;
}

.density-balanced {
  --grid-cols: 14;
  --grid-rows: 4;
  --grid-row-size: 88px;
  --grid-gap: 10px;
}

.density-compact {
  --grid-cols: 16;
  --grid-rows: 5;
  --grid-row-size: 68px;
  --grid-gap: 8px;
}
</style>
