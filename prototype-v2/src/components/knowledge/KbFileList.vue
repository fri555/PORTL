<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  FileText, Folder, Eye, Trash2, Upload, CheckSquare, Square, FolderPlus,
} from 'lucide-vue-next'
import type { KnowledgeBaseItem, DocItem, TreeNode } from '@/types/knowledge'

const props = defineProps<{
  kb: KnowledgeBaseItem
  docs: DocItem[]
  search: string
  tree: TreeNode[]
  previewOpen: boolean
}>()

const emit = defineEmits<{
  'selectFile': [doc: DocItem]
  'update:search': [value: string]
}>()

const selectedIds = ref<string[]>([])

const filtered = computed(() => {
  const q = props.search.trim().toLowerCase()
  if (!q) return props.docs
  return props.docs.filter(d => d.name.toLowerCase().includes(q))
})

function toggleSelect(name: string) {
  const i = selectedIds.value.indexOf(name)
  if (i >= 0) selectedIds.value.splice(i, 1)
  else selectedIds.value.push(name)
}

function getIcon(format: string) {
  if (['XLSX', 'XLS', 'CSV'].includes(format)) return FileText
  if (['DOCX', 'DOC', 'MD', 'TXT'].includes(format)) return FileText
  if (format === 'PDF') return FileText
  if (['PPTX', 'PPT'].includes(format)) return FileText
  return FileText
}

function getIconColor(format: string) {
  if (['XLSX', 'XLS', 'CSV'].includes(format)) return 'text-emerald-500 bg-emerald-50'
  if (['DOCX', 'DOC'].includes(format)) return 'text-blue-500 bg-blue-50'
  if (format === 'PDF') return 'text-red-500 bg-red-50'
  if (format === 'MD') return 'text-violet-500 bg-violet-50'
  return 'text-stone bg-zinc-50'
}

function getStatusClass(status: string) {
  return status === '已索引' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
}
</script>

<template>
  <div class="space-y-4">
    <!-- Actions -->
    <div class="flex items-center gap-2">
      <button class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline bg-white px-3 text-xs font-medium text-charcoal hover:bg-surface">
        <Upload class="h-3.5 w-3.5" />
        <span>上传文件</span>
      </button>
      <button class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline bg-white px-3 text-xs font-medium text-charcoal hover:bg-surface">
        <FolderPlus class="h-3.5 w-3.5" />
        <span>新建文件夹</span>
      </button>
    </div>

    <!-- Selection bar -->
    <div v-if="selectedIds.length" class="flex items-center gap-2 rounded-lg border border-brand-blue/20 bg-blue-50 px-3 py-2">
      <span class="text-xs font-medium text-brand-blue">已选 {{ selectedIds.length }} 项</span>
      <button class="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50">
        <Trash2 class="h-3 w-3" />删除
      </button>
    </div>

    <!-- List -->
    <div class="overflow-hidden rounded-xl border border-hairline bg-white">
      <table class="w-full">
        <thead class="border-b border-hairline bg-surface">
          <tr>
            <th class="w-8 px-2 py-2.5"></th>
            <th class="px-0 py-2.5 text-left text-xs font-medium text-stone">名称</th>
            <th class="hidden px-4 py-2.5 text-left text-xs font-medium text-stone sm:table-cell">格式</th>
            <th class="hidden px-4 py-2.5 text-left text-xs font-medium text-stone lg:table-cell">状态</th>
            <th class="hidden px-4 py-2.5 text-left text-xs font-medium text-stone xl:table-cell">更新时间</th>
            <th class="px-4 py-2.5 text-right text-xs font-medium text-stone">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="doc in filtered"
            :key="doc.name"
            class="cursor-pointer border-b border-hairline last:border-0 hover:bg-surface"
            :class="{ 'bg-blue-50/30': selectedIds.includes(doc.name) }"
            @click="$emit('selectFile', doc)"
          >
            <td class="px-2 py-2.5">
              <button class="text-muted hover:text-brand-blue" @click.stop="toggleSelect(doc.name)">
                <CheckSquare v-if="selectedIds.includes(doc.name)" class="h-4 w-4 text-brand-blue" />
                <Square v-else class="h-4 w-4" />
              </button>
            </td>
            <td class="py-2.5">
              <div class="flex items-center gap-2 text-sm text-charcoal">
                <component :is="getIcon(doc.format)" class="h-4 w-4" :class="getIconColor(doc.format)" />
                <span class="truncate">{{ doc.name }}</span>
              </div>
            </td>
            <td class="hidden px-4 py-2.5 sm:table-cell">
              <span class="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-stone">{{ doc.format }}</span>
            </td>
            <td class="hidden px-4 py-2.5 lg:table-cell">
              <span class="rounded-full px-2 py-0.5 text-[11px] font-medium" :class="getStatusClass(doc.status)">{{ doc.status }}</span>
            </td>
            <td class="hidden px-4 py-2.5 text-xs text-muted xl:table-cell">{{ doc.updatedAt }}</td>
            <td class="px-4 py-2.5">
              <div class="flex justify-end gap-1">
                <button class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-brand-blue hover:bg-blue-50" @click.stop="$emit('selectFile', doc)">
                  <Eye class="h-3.5 w-3.5" /><span v-if="!previewOpen">预览</span>
                </button>
                <button class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50" @click.stop>
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="filtered.length === 0" class="py-12 text-center text-body-sm text-muted">
      此知识库暂无文档
    </div>
  </div>
</template>
