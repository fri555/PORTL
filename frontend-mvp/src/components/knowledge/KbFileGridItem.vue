<script setup lang="ts">
import type { TreeNode } from '@/types/knowledge'
import { computed } from 'vue'
import { File, FileSpreadsheet, FileText, Folder, Square, CheckSquare } from 'lucide-vue-next'

interface FileDocLike {
  name: string
  label?: string
  format?: string
  updatedAt?: string
  tags?: string[]
}

const props = defineProps<{
  item: TreeNode | FileDocLike
  type: 'folder' | 'file'
  selected?: boolean
  compact?: boolean
  canEdit?: boolean
  tags?: string[]
  docFormat?: string
  folderCount?: number
}>()

const emit = defineEmits<{
  click: []
  toggleSelect: []
  open: []
  rename: []
  delete: []
}>()

function getFileIcon(format?: string) {
  if (format === 'XLSX' || format === 'XLS') return FileSpreadsheet
  if (format === 'DOCX' || format === 'MD' || format === 'PDF' || format === 'PPTX') return FileText
  return File
}

function getIconColor(format?: string) {
  if (format === 'XLSX' || format === 'XLS') return 'text-emerald-500 bg-emerald-50'
  if (format === 'DOCX') return 'text-blue-500 bg-blue-50'
  if (format === 'PDF') return 'text-red-500 bg-red-50'
  if (format === 'MD') return 'text-violet-500 bg-violet-50'
  if (format === 'PPTX') return 'text-orange-500 bg-orange-50'
  return 'text-zinc-500 bg-zinc-50'
}

const icon = computed(() => props.type === 'folder' ? Folder : getFileIcon(props.docFormat))
const iconColor = computed(() => props.type === 'folder' ? 'text-zinc-600 bg-zinc-50' : getIconColor(props.docFormat))
const label = computed(() => {
  const item = props.item as any
  return item.label ?? item.name ?? ''
})
</script>

<template>
  <div
    class="relative rounded-xl border border-zinc-200 bg-white transition"
    :class="[
      type === 'folder'
        ? 'cursor-pointer hover:border-blue-300 hover:bg-blue-50/30'
        : selected
          ? 'ring-2 ring-blue-300'
          : 'hover:border-orange-300',
      type === 'file' && !selected ? 'cursor-pointer' : '',
      compact ? 'p-3' : 'p-4',
    ]"
    @click="$emit('click')"
  >
    <!-- Select checkbox -->
    <button
      v-if="type === 'file'"
      class="absolute left-3 top-3 z-10 rounded p-0.5 bg-white/80 backdrop-blur"
      @click.stop="$emit('toggleSelect')"
    >
      <CheckSquare v-if="selected" class="h-4 w-4 text-blue-500" />
      <Square v-else class="h-4 w-4 text-zinc-300" />
    </button>

    <!-- Icon -->
    <div
      class="mb-3 mt-3 flex items-center justify-center rounded-xl shadow-sm"
      :class="[iconColor, compact ? 'h-12 w-12' : 'h-14 w-14']"
    >
      <component :is="icon" class="h-6 w-6" />
    </div>

    <!-- Label -->
    <strong class="block truncate text-sm font-semibold text-zinc-900" :title="label">{{ label }}</strong>

    <!-- Subtitle -->
    <span v-if="!compact && type === 'folder'" class="mt-1 text-[11px] text-zinc-400">
      文件夹 · {{ folderCount ?? 0 }} 项
    </span>
    <span v-if="!compact && type === 'file' && docFormat" class="mt-1 text-[11px] text-zinc-400">
      {{ docFormat }}
    </span>

    <!-- Tags -->
    <div v-if="!compact && tags?.length" class="mt-1.5 flex flex-wrap gap-1">
      <span
        v-for="tag in tags"
        :key="tag"
        class="rounded px-1 py-0.5 text-[10px] font-medium bg-zinc-100 text-zinc-600"
      >{{ tag }}</span>
    </div>

    <!-- Actions -->
    <div v-if="!compact" class="mt-3 flex gap-1">
      <button
        type="button"
        class="rounded-md px-2 py-1 text-[11px] text-blue-600 hover:bg-blue-50"
        @click.stop="$emit('open')"
      >{{ type === 'folder' ? '打开' : '预览' }}</button>
      <button
        v-if="type === 'folder' && canEdit"
        type="button"
        class="rounded-md px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-100"
        @click.stop="$emit('rename')"
      >改名</button>
      <button
        v-if="canEdit"
        type="button"
        class="rounded-md px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"
        @click.stop="$emit('delete')"
      >删除</button>
    </div>
  </div>
</template>
