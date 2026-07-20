<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAIChat, type Conversation } from '@/composables/useAIChat'
import { useChatController } from '@/composables/useWorkspaceChat'
import {
  Database, FileText, MessageSquareText, Plug2, Plus,
  Search, User, X, Zap,
} from 'lucide-vue-next'

const ai = useAIChat()
const chat = useChatController()

const query = ref('')
const selectedId = ref<string | null>(null)

interface Group { key: string; label: string; items: Conversation[] }

const groups = computed<Group[]>(() => {
  const kw = query.value.trim().toLowerCase()
  const list = [...ai.conversations.value]
    .filter((c) => !kw || c.title.toLowerCase().includes(kw))
    .sort((a, b) => b.updatedAt - a.updatedAt)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 86400000
  const buckets: Group[] = [
    { key: 'today', label: '今天', items: [] },
    { key: 'yesterday', label: '昨天', items: [] },
    { key: 'earlier', label: '更早', items: [] },
  ]
  for (const c of list) {
    if (c.updatedAt >= startOfToday) buckets[0].items.push(c)
    else if (c.updatedAt >= startOfYesterday) buckets[1].items.push(c)
    else buckets[2].items.push(c)
  }
  return buckets.filter((g) => g.items.length > 0)
})

const totalResults = computed(() => groups.value.reduce((n, g) => n + g.items.length, 0))

// 空搜索时：搜索模式显示「更多」能力；历史模式直接展示已选对话预览
const showMore = computed(() => !query.value.trim() && chat.searchDialogMode.value === 'search')

const selectedConv = computed<Conversation | undefined>(() =>
  ai.conversations.value.find((c) => c.id === selectedId.value),
)

const previewMessages = computed(() => {
  const conv = selectedConv.value
  if (!conv) return []
  return conv.messages
    .filter((m) => m.role !== 'system')
    .slice(-8)
    .map((m) => ({
      role: m.role,
      content: m.content.replace(/^\[[^\]]*\]\n/, '').slice(0, 120),
    }))
})

// 「更多」能力：空搜索时展示，统一三模式的快捷入口
const quickActions = [
  { id: 'new', label: '新对话', desc: '开始一轮新会话', icon: Plus, run: () => { chat.handleNewConversation(); chat.closeSearchDialog() } },
  { id: 'expert', label: '专家模式', desc: '切换到专家模式', icon: User, run: () => { chat.runMode.value = 'task'; chat.closeSearchDialog() } },
  { id: 'quick', label: '日常办公', desc: '切换到日常办公', icon: Zap, run: () => { chat.runMode.value = 'quick'; chat.closeSearchDialog() } },
  { id: 'kb', label: '知识库', desc: '查看已接入知识库', icon: Database, run: () => { chat.openSubPanel('knowledge'); chat.closeSearchDialog() } },
  { id: 'mcp', label: 'MCP 连接器', desc: '查看已连接连接器', icon: Plug2, run: () => { chat.openSubPanel('mcp'); chat.closeSearchDialog() } },
]

function selectConv(c: Conversation) {
  selectedId.value = c.id
}
function openConv(c: Conversation) {
  chat.handleSwitchSession(c.id)
  chat.closeSearchDialog()
}

watch(() => chat.showSearchDialog.value, (open) => {
  if (open) {
    query.value = ''
    if (chat.searchDialogMode.value === 'history') {
      const first = [...ai.conversations.value].sort((a, b) => b.updatedAt - a.updatedAt)[0]
      selectedId.value = first ? first.id : null
    } else {
      selectedId.value = ai.activeConversationId.value
    }
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="chat.showSearchDialog.value"
      class="fixed inset-0 z-[95] flex items-start justify-center bg-zinc-950/40 p-4 pt-[8vh]"
      @click.self="chat.closeSearchDialog()"
    >
      <div class="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <!-- Header -->
        <div class="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
          <div class="flex flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2">
            <Search class="h-4 w-4 text-zinc-400" />
            <input
              v-model="query"
              type="text"
              placeholder="搜索或更多"
              class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </div>
          <button
            type="button"
            class="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="关闭搜索"
            @click="chat.closeSearchDialog()"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Body -->
        <div class="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[320px_1fr]">
          <!-- Left: grouped results -->
          <div class="no-scrollbar min-h-0 overflow-y-auto border-b border-zinc-100 sm:border-b-0 sm:border-r">
            <template v-for="group in groups" :key="group.key">
              <div class="px-3 pb-1 pt-3 text-[11px] font-medium text-zinc-400">{{ group.label }}</div>
              <button
                v-for="conv in group.items"
                :key="conv.id"
                type="button"
                class="flex w-full items-center gap-2.5 px-3 py-2 text-left transition"
                :class="selectedId === conv.id ? 'bg-zinc-50' : 'hover:bg-zinc-50'"
                @click="selectConv(conv)"
                @dblclick="openConv(conv)"
              >
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-medium text-zinc-500">
                  {{ conv.title.slice(0, 1) }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-[13px] font-medium text-zinc-900">{{ chat.formatConversationTitle(conv.title) }}</div>
                  <div class="text-[10px] text-zinc-400">{{ chat.formatTime(conv.updatedAt) }}</div>
                </div>
              </button>
            </template>
            <div v-if="totalResults === 0" class="flex flex-col items-center py-12 text-center">
              <Search class="h-7 w-7 text-zinc-200" />
              <p class="mt-2 text-xs text-zinc-400">暂无相关结果</p>
            </div>
          </div>

          <!-- Right: 更多（空搜索）/ 对话预览（有搜索词） -->
          <div class="min-h-0 overflow-y-auto p-4">
            <!-- 空搜索（搜索模式）：更多能力；历史模式则显示已选对话预览 -->
            <template v-if="showMore">
              <div class="mb-3 text-[11px] font-medium text-zinc-400">更多</div>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="a in quickActions"
                  :key="a.id"
                  type="button"
                  class="flex items-center gap-2.5 rounded-xl border border-zinc-200 p-3 text-left transition hover:bg-zinc-50"
                  @click="a.run()"
                >
                  <component :is="a.icon" class="h-4 w-4 shrink-0 text-zinc-500" />
                  <span class="min-w-0">
                    <span class="block truncate text-xs font-medium text-zinc-900">{{ a.label }}</span>
                    <span class="block truncate text-[10px] text-zinc-400">{{ a.desc }}</span>
                  </span>
                </button>
              </div>
            </template>

            <!-- 有搜索词：对话内容预览 -->
            <template v-else-if="selectedConv">
              <div class="mb-3 flex items-center gap-2">
                <MessageSquareText class="h-4 w-4 text-zinc-400" />
                <h3 class="text-sm font-semibold text-zinc-900">{{ chat.formatConversationTitle(selectedConv.title) }}</h3>
              </div>
              <div class="space-y-2">
                <div
                  v-for="(m, i) in previewMessages"
                  :key="i"
                  class="rounded-lg border px-3 py-2 text-xs leading-5"
                  :class="m.role === 'user' ? 'border-zinc-200 bg-white text-zinc-700' : 'border-zinc-100 bg-zinc-50 text-zinc-600'"
                >
                  <span class="mb-0.5 block text-[10px] font-medium" :class="m.role === 'user' ? 'text-zinc-500' : 'text-emerald-600'">
                    {{ m.role === 'user' ? '我' : '小马' }}
                  </span>
                  <span class="whitespace-pre-wrap">{{ m.content }}</span>
                </div>
              </div>
              <button
                type="button"
                class="mt-4 w-full rounded-lg bg-zinc-900 py-2 text-xs font-medium text-white hover:bg-zinc-800"
                @click="openConv(selectedConv)"
              >
                打开此对话
              </button>
            </template>

            <!-- 有搜索词但未选对话 -->
            <div v-else class="flex h-full flex-col items-center justify-center py-12 text-center">
              <FileText class="h-7 w-7 text-zinc-200" />
              <p class="mt-2 text-xs text-zinc-400">输入关键词搜索历史对话</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
