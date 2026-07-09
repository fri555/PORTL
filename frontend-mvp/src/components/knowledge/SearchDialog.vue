<script setup lang="ts">
/**
 * SearchDialog.vue — 全局搜索弹窗
 *
 * 点击侧栏搜索框弹出，4 个 Tab 分组展示检索结果
 */
import { computed, ref, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search, BookOpen, Folder, FileText, X } from 'lucide-vue-next'
import type { KnowledgeBaseItem, DocItem } from '@/types/knowledge'

const props = defineProps<{
  open: boolean
  knowledgeBases: KnowledgeBaseItem[]
  allDocs: Record<string, DocItem[]>
}>()

const emit = defineEmits<{
  'update:open': [v: boolean]
  selectKb: [id: string]
  selectDoc: [doc: DocItem]
}>()

type SearchTab = 'all' | 'kb' | 'folder' | 'file'

const keyword = ref('')
const activeTab = ref<SearchTab>('all')
const debouncedKeyword = ref('')
let timer: ReturnType<typeof setTimeout> | undefined

watch(keyword, (v) => {
  clearTimeout(timer)
  timer = setTimeout(() => { debouncedKeyword.value = v }, 300)
})

function filter<T>(items: T[], fields: (keyof T)[], kw: string): T[] {
  if (!kw.trim()) return items
  const q = kw.toLowerCase()
  return items.filter(item => fields.some(f => String(item[f]).toLowerCase().includes(q)))
}

const tabList: { key: SearchTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'kb', label: '知识库' },
  { key: 'folder', label: '文件夹' },
  { key: 'file', label: '文件' },
]

interface SearchResult {
  type: 'kb' | 'folder' | 'file'
  name: string
  parentPath: string
  kbId?: string
  doc?: DocItem
}

const allResults = computed<SearchResult[]>(() => {
  const kw = debouncedKeyword.value.trim()
  if (!kw) return []
  const q = kw.toLowerCase()
  const results: SearchResult[] = []
  // KBs
  for (const kb of props.knowledgeBases) {
    if (kb.name.toLowerCase().includes(q)) {
      results.push({ type: 'kb', name: kb.name, parentPath: kb.department, kbId: kb.id })
    }
  }
  // Docs (flatten all)
  for (const [kbId, docs] of Object.entries(props.allDocs)) {
    const kb = props.knowledgeBases.find(k => k.id === kbId)
    for (const doc of docs) {
      if (doc.name.toLowerCase().includes(q)) {
        results.push({ type: 'file', name: doc.name, parentPath: kb?.name ?? '', kbId, doc })
      }
    }
  }
  return results
})

const filteredResults = computed(() => {
  if (activeTab.value === 'all') return allResults.value
  return allResults.value.filter(r => r.type === activeTab.value.slice(0, -1))
})

const grouped = computed(() => {
  const groups: { type: string; label: string; items: SearchResult[] }[] = []
  const order = ['kb', 'folder', 'file']
  const labels: Record<string, string> = { kb: '知识库', folder: '文件夹', file: '文件' }
  for (const t of order) {
    const items = allResults.value.filter(r => r.type === t)
    if (items.length) groups.push({ type: t, label: labels[t], items })
  }
  return groups
})

function onSelect(result: SearchResult) {
  keyword.value = ''
  activeTab.value = 'all'
  emit('update:open', false)
  if (result.type === 'kb' && result.kbId) emit('selectKb', result.kbId)
  else if (result.type === 'file' && result.doc) emit('selectDoc', result.doc)
}

function getIcon(type: string) {
  if (type === 'kb') return BookOpen
  if (type === 'folder') return Folder
  return FileText
}

function getIconColor(type: string) {
  if (type === 'kb') return 'text-[#ff5530]'
  if (type === 'folder') return 'text-zinc-500'
  return 'text-zinc-400'
}
</script>

<template>
  <Dialog :open="open" @update:open="(v: boolean) => { emit('update:open', v); if (!v) { keyword = ''; activeTab = 'all' } }">
    <DialogContent class="max-w-2xl max-h-[70vh] flex flex-col p-0 gap-0" @open-auto-focus.prevent>
      <div class="px-4 pt-4 pb-2">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            v-model="keyword"
            placeholder="搜索知识库、文件夹、文件..."
            class="h-10 pl-9 pr-8 text-sm"
            autofocus
          />
          <button
            v-if="keyword"
            class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-700"
            @click="keyword = ''"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 px-4 pb-2 border-b border-zinc-100">
        <button
          v-for="tab in tabList"
          :key="tab.key"
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-medium transition"
          :class="activeTab === tab.key ? 'bg-[#1456f0] text-white' : 'text-zinc-500 hover:bg-zinc-100'"
          @click="activeTab = tab.key"
        >{{ tab.label }}</button>
      </div>

      <!-- Results -->
      <div class="flex-1 overflow-y-auto px-4 py-3 text-sm">
        <div v-if="!debouncedKeyword.trim()" class="py-12 text-center text-xs text-zinc-400">
          输入关键词开始搜索
        </div>
        <div v-else-if="allResults.length === 0" class="py-12 text-center text-xs text-zinc-400">
          未找到匹配结果
        </div>

        <!-- Tab: 全部（按类型分组） -->
        <template v-if="activeTab === 'all'">
          <div v-for="group in grouped" :key="group.type" class="mb-4 last:mb-0">
            <div class="mb-1.5 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">{{ group.label }}</div>
            <div class="space-y-0.5">
              <button
                v-for="item in group.items"
                :key="`${item.type}-${item.name}`"
                type="button"
                class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-[#f7f8fa]"
                @click="onSelect(item)"
              >
                <component :is="getIcon(item.type)" class="h-4 w-4 shrink-0" :class="getIconColor(item.type)" />
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-medium text-zinc-800">{{ item.name }}</div>
                  <div v-if="item.parentPath" class="truncate text-[11px] text-zinc-400">{{ item.parentPath }}</div>
                </div>
              </button>
            </div>
          </div>
        </template>

        <!-- Tab: 知识库 -->
        <template v-else-if="activeTab === 'kb'">
          <div class="space-y-0.5">
            <button
              v-for="r in filteredResults"
              :key="r.name"
              type="button"
              class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-[#f7f8fa]"
              @click="onSelect(r)"
            >
              <BookOpen class="h-4 w-4 shrink-0 text-[#ff5530]" />
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium text-zinc-800">{{ r.name }}</div>
                <div class="truncate text-[11px] text-zinc-400">{{ r.parentPath }}</div>
              </div>
            </button>
          </div>
        </template>

        <!-- Tab: 文件 -->
        <template v-else-if="activeTab === 'file'">
          <div class="space-y-0.5">
            <button
              v-for="r in filteredResults"
              :key="r.name"
              type="button"
              class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-[#f7f8fa]"
              @click="onSelect(r)"
            >
              <FileText class="h-4 w-4 shrink-0 text-zinc-400" />
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium text-zinc-800">{{ r.name }}</div>
                <div class="truncate text-[11px] text-zinc-400">{{ r.parentPath }}</div>
              </div>
            </button>
          </div>
        </template>

        <!-- Tab: 文件夹 -->
        <template v-else>
          <div class="py-12 text-center text-xs text-zinc-400">暂无文件夹匹配结果</div>
        </template>
      </div>
    </DialogContent>
  </Dialog>
</template>
