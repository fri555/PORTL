<script setup lang="ts">
import { computed } from 'vue'
import { FileText, X } from 'lucide-vue-next'
import type { DocItem } from '@/types/knowledge'

const props = defineProps<{
  tabs: DocItem[]
  activeTab: string
}>()

const emit = defineEmits<{
  close: []
  closeTab: [name: string]
  'update:activeTab': [name: string]
}>()

const activeDoc = computed(() => props.tabs.find(d => d.name === props.activeTab) ?? props.tabs[0])
</script>

<template>
  <aside class="flex w-[420px] shrink-0 flex-col border-l border-hairline bg-white">
    <!-- Tab bar -->
    <div class="flex items-center justify-between border-b border-hairline px-3 py-2.5">
      <span class="text-xs font-semibold text-charcoal">预览</span>
      <button class="rounded-lg p-1 text-stone hover:bg-surface" @click="$emit('close')">
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- Multi-tab -->
    <div v-if="tabs.length > 1" class="flex gap-1 overflow-x-auto border-b border-hairline bg-surface px-3 py-2">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        class="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium"
        :class="activeTab === tab.name ? 'bg-white text-ink ring-1 ring-hairline' : 'text-stone hover:bg-white'"
        @click="$emit('update:activeTab', tab.name)"
      >
        <FileText class="h-3 w-3" />
        <span class="max-w-[120px] truncate">{{ tab.name }}</span>
        <X class="h-3 w-3 rounded hover:bg-hairline" @click.stop="$emit('closeTab', tab.name)" />
      </button>
    </div>

    <!-- Content -->
    <div v-if="activeDoc" class="flex-1 overflow-y-auto px-6 py-6">
      <div class="mb-4 text-xs text-muted">
        修改于 {{ activeDoc.updatedAt }} · {{ activeDoc.uploadedBy }}
      </div>
      <h1 class="text-xl font-bold text-ink">{{ activeDoc.name?.replace(/\.[^.]+$/, '') }}</h1>
      <div class="mt-6 space-y-4 text-body-sm leading-relaxed text-charcoal">
        <h2 class="border-l-4 border-ink pl-3 text-lg font-bold">文档预览</h2>
        <p>本文档为知识库中已索引的文件，预览内容基于文件解析结果生成。</p>
        <p>PDF、DOCX、XLSX 等格式的完整渲染需要后端解析服务支持。</p>
        <div class="mt-4 rounded-lg bg-surface p-4 text-xs text-stone">
          <p><strong>文件名：</strong>{{ activeDoc.name }}</p>
          <p><strong>格式：</strong>{{ activeDoc.format }}</p>
          <p><strong>状态：</strong>{{ activeDoc.status }}</p>
          <p><strong>上传者：</strong>{{ activeDoc.uploadedBy }}</p>
        </div>
      </div>
    </div>
  </aside>
</template>
