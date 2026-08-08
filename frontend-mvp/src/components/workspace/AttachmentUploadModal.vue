<script setup lang="ts">
import { computed, ref } from 'vue'
import { useChatController, type KbFile } from '@/composables/useWorkspaceChat'
import {
  Check, ChevronRight, FileText, Folder, FolderOpen, Search, UploadCloud, X,
} from 'lucide-vue-next'

const chat = useChatController()
const localFileInput = ref<HTMLInputElement | null>(null)
const dragActive = ref(false)

const kbTypeOptions = [
  { value: 'all', label: '所有类型' },
  { value: 'pdf', label: 'PDF 文档' },
  { value: 'doc', label: 'Word 文档' },
  { value: 'docx', label: 'Word 文档' },
  { value: 'md', label: 'Markdown' },
  { value: 'txt', label: '文本文件' },
  { value: 'xlsx', label: 'Excel 表格' },
]

const ALLOWED = ['pdf', 'doc', 'docx', 'txt', 'md', 'xlsx', 'xls', 'csv']
const MAX_SIZE = 100 * 1024 * 1024

function validateFile(f: { ext: string; size?: number }) {
  if (!ALLOWED.includes(f.ext)) return { valid: false, msg: '不支持的格式' }
  if (typeof f.size === 'number' && f.size > MAX_SIZE) return { valid: false, msg: '超过 100MB 限制' }
  return { valid: true, msg: '' }
}

const hasInvalidLocal = computed(() => chat.localFiles.value.some((f) => !validateFile(f).valid))

function fileIconColor(ext: string) {
  switch (ext) {
    case 'pdf': return 'text-red-500'
    case 'doc':
    case 'docx': return 'text-blue-500'
    case 'txt': return 'text-amber-500'
    case 'md': return 'text-emerald-500'
    case 'xlsx': return 'text-emerald-600'
    case 'folder': return 'text-zinc-400'
    default: return 'text-zinc-400'
  }
}
function formatSize(size?: string | number) {
  if (!size) return ''
  if (typeof size === 'number') {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`
    return `${(size / 1024 / 1024).toFixed(1)} MB`
  }
  return size
}

function addFiles(files: File[]) {
  files.forEach((f) => {
    chat.localFiles.value.push({ name: f.name, ext: (f.name.split('.').pop() || 'file').toLowerCase(), size: f.size })
  })
}
function handleLocalSelect(e: Event) {
  addFiles(Array.from((e.target as HTMLInputElement).files || []))
  ;(e.target as HTMLInputElement).value = ''
}
function triggerLocal() { localFileInput.value?.click() }
function onDrop(e: DragEvent) {
  dragActive.value = false
  addFiles(Array.from(e.dataTransfer?.files || []))
}
function removeLocal(idx: number) {
  chat.localFiles.value.splice(idx, 1)
}

// 知识中心：目录树 + 面包屑 + 分页
function kbChildren(id: string) {
  return chat.kbFolders.value.filter((f) => f.parentId === id)
}
function isFolderSelected(id: string) {
  return chat.kbCurrentFolder.value === id
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="chat.showUploadModal.value"
      class="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/40 p-4"
      @click.self="chat.closeUploadModal()"
    >
      <div class="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
          <div>
            <div class="text-base font-semibold text-zinc-900">添加附件</div>
            <p class="mt-0.5 text-xs text-zinc-400">支持上传本地文件或从知识库中选择</p>
          </div>
          <button type="button" class="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" @click="chat.closeUploadModal()">
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 border-b border-zinc-100 px-5">
          <button
            type="button"
            class="border-b-2 px-3 py-2.5 text-sm font-medium transition"
            :class="chat.uploadTab.value === 'local' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-700'"
            @click="chat.uploadTab.value = 'local'"
          >
            本地文件
          </button>
          <button
            type="button"
            class="border-b-2 px-3 py-2.5 text-sm font-medium transition"
            :class="chat.uploadTab.value === 'kb' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-700'"
            @click="chat.uploadTab.value = 'kb'"
          >
            知识中心
          </button>
        </div>

        <!-- Body -->
        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <!-- ========== 本地文件 ========== -->
          <div v-if="chat.uploadTab.value === 'local'">
            <div
              class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 transition"
              :class="dragActive ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'"
              @click="triggerLocal"
              @dragenter.prevent="dragActive = true"
              @dragover.prevent="dragActive = true"
              @dragleave.prevent="dragActive = false"
              @drop.prevent="onDrop"
            >
              <UploadCloud class="h-7 w-7" :class="dragActive ? 'text-zinc-900' : 'text-zinc-300'" />
              <p class="mt-2 text-sm font-medium text-zinc-600">点击上传文件或拖拽至此区域</p>
              <p class="mt-0.5 text-xs text-zinc-400">支持 PDF、DOC/DOCX、Markdown、TXT、XLSX、CSV，单文件 ≤ 100MB</p>
            </div>
            <input ref="localFileInput" class="hidden" type="file" multiple accept=".pdf,.doc,.docx,.md,.txt,.xlsx,.xls,.csv" @change="handleLocalSelect" />

            <div v-if="chat.localFiles.value.length" class="mt-3 space-y-2">
              <div
                v-for="(f, i) in chat.localFiles.value"
                :key="i"
                class="flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 transition hover:border-zinc-300"
                :class="validateFile(f).valid ? 'border-zinc-200 bg-white' : 'border-red-300 bg-red-50'"
                @click="f.ext === 'txt' ? chat.openTextPreview({ name: f.name, size: f.size }) : null"
              >
                <FileText class="h-4 w-4 shrink-0" :class="validateFile(f).valid ? fileIconColor(f.ext) : 'text-red-500'" />
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-medium text-zinc-800">{{ f.name }}</div>
                  <div class="text-[11px]" :class="validateFile(f).valid ? 'text-zinc-400' : 'text-red-500'">
                    {{ validateFile(f).valid ? formatSize(f.size) : validateFile(f).msg }}
                  </div>
                </div>
                <button type="button" class="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-red-500" @click.stop="removeLocal(i)">
                  <X class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div v-else class="mt-4 text-center text-xs text-zinc-300">暂无本地文件</div>
          </div>

          <!-- ========== 知识中心 ========== -->
          <div v-else class="flex gap-4">
            <!-- 左侧目录树 -->
            <div class="w-44 shrink-0 border-r border-zinc-100 pr-3">
              <div class="mb-1.5 text-[11px] font-medium text-zinc-400">知识空间</div>
              <div class="space-y-0.5">
                <template v-for="top in chat.kbFolders.value.filter(f => f.parentId === null)" :key="top.id">
                  <button
                    type="button"
                    class="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs transition"
                    :class="isFolderSelected(top.id) ? 'bg-zinc-100 font-medium text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50'"
                    @click="chat.selectKbFolder(top.id)"
                  >
                    <Folder class="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                    <span class="truncate">{{ top.name }}</span>
                    <ChevronRight class="ml-auto h-3 w-3 text-zinc-300" />
                  </button>
                  <button
                    v-for="child in kbChildren(top.id)"
                    :key="child.id"
                    type="button"
                    class="flex w-full items-center gap-1.5 rounded-lg py-1.5 pl-7 pr-2 text-left text-xs transition"
                    :class="isFolderSelected(child.id) ? 'bg-zinc-100 font-medium text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50'"
                    @click="chat.selectKbFolder(child.id)"
                  >
                    <FolderOpen class="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                    <span class="truncate">{{ child.name }}</span>
                  </button>
                </template>
              </div>
            </div>

            <!-- 右侧文件区 -->
            <div class="min-w-0 flex-1">
              <div class="mb-3 flex items-center gap-2">
                <div class="flex flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5">
                  <Search class="h-3.5 w-3.5 text-zinc-400" />
                  <input v-model="chat.kbSearch.value" type="text" placeholder="搜索文档名称" class="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-zinc-400" />
                </div>
                <select v-model="chat.kbTypeFilter.value" class="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700 outline-none">
                  <option v-for="t in kbTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
                </select>
              </div>

              <!-- 面包屑 -->
              <div class="mb-2 flex items-center gap-1 text-[11px] text-zinc-400">
                <template v-for="(node, i) in chat.kbBreadcrumb.value" :key="node.id">
                  <span v-if="i > 0" class="text-zinc-300">/</span>
                  <span :class="i === chat.kbBreadcrumb.value.length - 1 ? 'font-medium text-zinc-600' : ''">{{ node.name }}</span>
                </template>
              </div>

              <div v-if="chat.kbPageFiles.value.length" class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  v-for="f in chat.kbPageFiles.value"
                  :key="f.id"
                  type="button"
                  class="flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition"
                  :class="chat.isKbSelected(f.id) ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'"
                  @click="chat.toggleKbFile(f)"
                >
                  <FileText class="h-4 w-4 shrink-0 cursor-pointer" :class="fileIconColor(f.type)" @click.stop="f.type === 'txt' ? chat.openTextPreview({ name: f.name }) : null" />
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-medium text-zinc-800">{{ f.name }}</div>
                    <div class="text-[11px] text-zinc-400">{{ f.updatedAt }} · {{ f.owner }}</div>
                  </div>
                  <span
                    class="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                    :class="chat.isKbSelected(f.id) ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 text-transparent'"
                  >
                    <Check class="h-3 w-3" />
                  </span>
                </button>
              </div>
              <div v-else class="py-10 text-center">
                <FolderOpen class="mx-auto h-8 w-8 text-zinc-200" />
                <p class="mt-2 text-xs text-zinc-400">未找到相关文档，请尝试调整搜索关键词或筛选条件</p>
              </div>

              <!-- 分页 -->
              <div v-if="chat.kbPageFiles.value.length" class="mt-3 flex items-center justify-between text-[11px] text-zinc-400">
                <span>共 {{ chat.kbFilteredAll.value.length }} 项，第 {{ chat.kbPage.value }}/{{ chat.kbPageTotal.value }} 页</span>
                <div class="flex gap-1">
                  <button
                    type="button"
                    class="rounded-md border border-zinc-200 px-2 py-1 text-zinc-500 transition hover:bg-zinc-50 disabled:opacity-40"
                    :disabled="chat.kbPage.value <= 1"
                    @click="chat.changeKbPage(-1)"
                  >上一页</button>
                  <button
                    type="button"
                    class="rounded-md border border-zinc-200 px-2 py-1 text-zinc-500 transition hover:bg-zinc-50 disabled:opacity-40"
                    :disabled="chat.kbPage.value >= chat.kbPageTotal.value"
                    @click="chat.changeKbPage(1)"
                  >下一页</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between border-t border-zinc-100 px-5 py-3">
          <span class="text-xs text-zinc-400">
            <template v-if="chat.uploadTab.value === 'local'">已选择文件 {{ chat.localFiles.value.length }}</template>
            <template v-else>已选择 {{ chat.kbSelectedCount.value }} 个知识文档</template>
          </span>
          <div class="flex gap-2">
            <button class="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50" @click="chat.closeUploadModal()">取消</button>
            <button
              class="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-40"
              :disabled="chat.uploadTab.value === 'local' ? !chat.localFiles.value.length || hasInvalidLocal : chat.kbSelectedCount.value === 0"
              @click="chat.uploadTab.value === 'local' ? chat.confirmLocalUpload() : chat.confirmKbUpload()"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
