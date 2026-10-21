<script setup lang="ts">
import { computed } from 'vue'
import { Download } from 'lucide-vue-next'
import { canDownloadKnowledge, type KnowledgeRole } from '@/types/knowledge-permission'

const props = defineProps<{ role?: KnowledgeRole | null; downloadUrl?: string; fileName?: string }>()
const allowed = computed(() => canDownloadKnowledge(props.role))
const fileUrl = computed(() => {
  if (!allowed.value || !props.downloadUrl?.trim()) return ''
  try {
    const url = new URL(props.downloadUrl, window.location.origin)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''
  } catch { return '' }
})
</script>

<template>
  <a v-if="allowed && fileUrl" class="knowledge-download" aria-label="下载文件" :href="fileUrl" :download="fileName || ''" rel="noopener noreferrer"><Download :size="15" />下载</a>
  <button v-else-if="allowed" type="button" class="knowledge-download" aria-label="下载文件" disabled title="文件暂不可下载"><Download :size="15" />下载</button>
</template>

<style scoped>
.knowledge-download{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid #e3e5e8;border-radius:7px;background:#fff;padding:6px 10px;color:#444;font:12px/18px inherit;text-decoration:none;white-space:nowrap}.knowledge-download:hover{background:#f7f8fa}.knowledge-download:disabled{color:#aaa;cursor:not-allowed;background:#fafafa}
</style>
