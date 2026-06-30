<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentSize } from '@/types/home'
import { SIZE_GRID } from '@/types/home'

const props = defineProps<{
  currentSize: ComponentSize
  allowedSizes: ComponentSize[]
}>()

const emit = defineEmits<{
  select: [size: ComponentSize]
}>()

const sizes = computed(() => props.allowedSizes)
</script>

<template>
  <div class="soft-size-list flex max-h-60 flex-col gap-1 overflow-y-auto p-1.5 pr-2">
    <span class="mb-1 text-[11px] font-medium text-muted-foreground">选择尺寸</span>
    <button
      v-for="size in sizes"
      :key="size"
      :class="[
        'group relative flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-all',
        'cursor-pointer hover:bg-accent',
        currentSize === size ? 'bg-accent text-accent-foreground ring-1 ring-primary/30' : 'text-foreground/70',
      ]"
      @click="emit('select', size)"
    >
      <!-- Grid icon -->
      <div class="grid h-7 w-9 shrink-0 gap-0.5" :style="{ gridTemplateColumns: `repeat(${Math.min(SIZE_GRID[size].cols, 4)}, minmax(0, 1fr))` }">
        <div
          v-for="cell in Math.min(SIZE_GRID[size].cols, 4) * Math.min(SIZE_GRID[size].rows, 4)"
          :key="cell"
          class="rounded-[2px] border"
          :class="currentSize === size ? 'border-primary/60 bg-primary/20' : 'border-zinc-300 bg-zinc-100'"
        />
      </div>
      <span class="font-medium tabular-nums">{{ size }}</span>
      <span class="ml-auto text-[10px] tabular-nums text-muted-foreground/50">
        {{ SIZE_GRID[size].cols }}x{{ SIZE_GRID[size].rows }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.soft-size-list {
  scrollbar-width: thin;
  scrollbar-color: rgb(148 163 184 / 0.35) transparent;
}

.soft-size-list::-webkit-scrollbar {
  width: 5px;
}

.soft-size-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgb(148 163 184 / 0.35);
}
</style>
