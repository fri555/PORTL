<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAIChat, type ChatMessage, type Conversation, type ThinkingStep } from '@/composables/useAIChat'
import ThinkingChain from '@/components/workspace/ThinkingChain.vue'
import ContextIndicator from '@/components/workspace/ContextIndicator.vue'
import {
  Activity,
  Archive,
  ArrowLeft,
  Bell,
  Bot,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Database,
  FileSpreadsheet,
  FileText,
  Globe,
  History,
  Layers,
  Lightbulb,
  Loader2,
  MoreHorizontal,
  Paperclip,
  Pencil,
  PieChart,
  Pin,
  Play,
  Plus,
  Search,
  SendHorizontal,
  Settings,
  Sparkles,
  Square,
  Star,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Trash2,
  User,
  Users,
  Workflow,
  Wrench,
  X,
  Zap,
  Plug2,
} from 'lucide-vue-next'

// ---- composables ----
const {
  config,
  conversations,
  activeConversationId,
  activeConversation,
  activeMessages,
  isStreaming,
  currentThinking,
  contextStats,
  createConversation,
  switchConversation,
  deleteConversation,
  updateConversationTitle,
  toggleConversationFavorite,
  toggleConversationPinned,
  sendMessage,
  stopStreaming,
  isApiConfigured,
} = useAIChat()

const route = useRoute()
const router = useRouter()
const chatInput = ref('')
type RunMode = 'fast' | 'smart' | 'task'
const runMode = ref<RunMode>((route.query.mode === 'smart' || route.query.mode === 'task') ? route.query.mode : 'fast')
const attachedFileCount = ref(Number(route.query.files || 0))
const leftCollapsed = ref(false)
const rightCollapsed = ref(true)
const thinkingCollapsed = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const abortController = ref<AbortController | null>(null)
const streamingContent = ref('')
const showConfirmDelete = ref<string | null>(null)
const renamingConversationId = ref<string | null>(null)
const renameDraft = ref('')

// ---- sub-panels ----
type SubPanel = 'knowledge' | 'automation' | 'expert' | 'mcp' | 'skills' | 'more' | null
const activeSubPanel = ref<SubPanel>(null)
const showMoreMenu = ref(false)

// ---- feedback ----
const messageFeedback = ref<Record<string, 'up' | 'down' | null>>({})

// ---- knowledge upload ----
const knowledgeUploadInput = ref<HTMLInputElement | null>(null)
const uploadedFiles = ref<string[]>([])

const modeMeta: Record<RunMode, { label: string; desc: string; tone: string }> = {
  fast: {
    label: '快速',
    desc: '不挂知识库，直接回答；适合轻量问答和方案草稿',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  smart: {
    label: '智能',
    desc: '先判断意图，再决定是否挂知识库和工具',
    tone: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  task: {
    label: '任务',
    desc: '默认挂知识库和工具，展示完整执行链路',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
  },
}

// ---- mock data for panels ----
const referenceFiles = ref([
  { name: '团购通用预算池.xlsx', desc: '预算段、价格带、组合策略', status: 'ready' },
  { name: '运动鞋团购成功案例.md', desc: 'B2B线下成交案例库', status: 'ready' },
  { name: '方案中心字段模板.xlsx', desc: '客户类型、数量、预算、场景字段', status: 'ready' },
])

const outputArtifacts = ref([
  { name: 'Excel 组货清单', status: '等待生成', tone: 'bg-zinc-50 text-zinc-500' },
  { name: 'PPT 客户方案', status: '等待生成', tone: 'bg-zinc-50 text-zinc-500' },
  { name: 'PDF 方案画册', status: '等待生成', tone: 'bg-zinc-50 text-zinc-500' },
])

const knowledgeGaps = ref<string[]>([])

// ---- knowledge base mock data ----
const knowledgeBases = [
  { name: '组货方案知识库', docs: 23, status: 'active', desc: '沉淀组货案例、预算池、SKU组合策略' },
  { name: '组货逻辑知识库', docs: 15, status: 'active', desc: '组货规则、分档逻辑、品牌偏好权重' },
  { name: '商品素材库', docs: 8, status: 'building', desc: 'SPU/SKU图片、描述、规格参数' },
]

// ---- automation mock data ----
const automations = [
  { name: '周一竞品动态汇总', trigger: '每周一 09:00', agent: '竞品分析助手', status: 'active' },
  { name: '知识缺口周报', trigger: '每周五 17:00', agent: '知识库管理员', status: 'active' },
  { name: '方案模板更新检查', trigger: '每天 08:00', agent: '方案中心主管', status: 'paused' },
]

// ---- expert mock data ----
const experts = [
  { name: '组货方案专家', role: '子智能体', desc: '检索案例池、预算池，生成三档组货方案，输出Excel/PPT/PDF', skills: ['预算分档', '案例匹配', 'SPU组合', '产物生成'], status: 'active' },
  { name: '方案中心主管', role: '主智能体', desc: '字段澄清、任务拆解、协调子智能体、输出业务方案', skills: ['意图识别', '字段校验', '任务编排', '知识缺口检测'], status: 'active' },
  { name: '营销文案专家', role: '子智能体', desc: '根据商品和场景生成多版本营销文案', skills: ['文案生成', '风格适配', 'AB测试'], status: 'draft' },
]

// ---- MCP mock data ----
const mcpConnections = [
  { name: '知识库管理', type: 'MCP', desc: '文档上传、解析入库、切片检索、版本管理', status: 'connected' },
  { name: '钉钉文档', type: 'MCP', desc: '创建/读取/更新钉钉在线文档、表格、脑图', status: 'connected' },
  { name: '钉钉AI表格', type: 'MCP', desc: '字段表、SKU清单、台账的自动写入与查询', status: 'connected' },
  { name: '钉钉待办', type: 'MCP', desc: '创建任务、设置截止时间、指派责任人', status: 'configured' },
  { name: 'ERP商品主数据', type: 'MCP', desc: '读取SKU、成本、库存、价格带数据', status: 'pending' },
]

// ---- skills mock data ----
const skillsList = [
  { name: '字段校验', desc: '判断必填字段是否完整，缺失时生成追问', from: '方案中心主管' },
  { name: '预算分档', desc: '按预算生成经济型/均衡型/品质型三档策略', from: '组货方案专家' },
  { name: '营销文案生成', desc: '根据商品信息生成多平台营销文案', from: '营销文案专家' },
  { name: 'PPT提纲生成', desc: '将方案内容转为PPT汇报大纲', from: '首页快捷能力' },
  { name: '文档总结', desc: '对上传文档进行结构化摘要', from: '首页快捷能力' },
]

// ---- more menu items ----
const moreMenuItems: { id: string; label: string; desc: string; icon: unknown }[] = [
  { id: 'mcp', label: 'MCP 连接器', desc: '知识库、钉钉文档、AI表格等', icon: Plug2 },
  { id: 'skills', label: '技能 Skill', desc: '字段校验、预算分档、文案生成', icon: Wrench },
  { id: 'automation', label: '触发器', desc: '定时任务与事件触发', icon: Timer },
]

// Import missing icon

// ---- sub-panel helpers ----
function openSubPanel(panel: string) {
  activeSubPanel.value = activeSubPanel.value === panel ? null : (panel as SubPanel)
  showMoreMenu.value = false
}
function closeSubPanel() { activeSubPanel.value = null }

const subPanelTitle = computed(() => {
  const key = activeSubPanel.value
  if (!key) return ''
  const map: Record<string, string> = {
    knowledge: '知识库', automation: '自动化', expert: '专家',
    mcp: 'MCP 连接器', skills: '技能 Skill',
  }
  return map[key] ?? ''
})

const sortedConversations = computed(() =>
  [...conversations.value].sort((a, b) => {
    if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1
    return b.updatedAt - a.updatedAt
  }),
)

// ---- init ----
onMounted(async () => {
  const q = route.query.q
  const source = route.query.source
  if (q && source === 'home') {
    router.replace({ name: 'workspace-chat' })
    await nextTick()
    handleSend(String(q))
  } else if (!activeConversationId.value && conversations.value.length === 0) {
    createConversation()
    const conv = activeConversation.value
    if (conv) {
      conv.messages.push({
        id: 'welcome',
        role: 'assistant',
        content: `你好，我是**方案中心主管**。\n\n当前为 **${modeMeta[runMode.value].label}模式**：${modeMeta[runMode.value].desc}。\n\n我可以帮你分析组货需求、提取关键字段、检索成功案例和预算池、生成多档组货方案，并把无法回答的问题沉淀为知识缺口。`,
        timestamp: Date.now(),
      })
    }
  }
})

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}
watch(activeMessages, () => scrollToBottom(), { deep: true })
watch(streamingContent, () => scrollToBottom())

// ---- send message ----
async function handleSend(text?: string) {
  const content = (text ?? chatInput.value).trim()
  if (!content || isStreaming.value) return
  chatInput.value = ''
  thinkingCollapsed.value = false
  streamingContent.value = ''
  abortController.value = new AbortController()
  const modePrefix = `[${modeMeta[runMode.value].label}模式：${modeMeta[runMode.value].desc}]`
  const messageContent = `${modePrefix}\n${content}`

  if (isApiConfigured()) {
    try {
      await sendMessage(messageContent, {
        onThinkingStart: () => scrollToBottom(),
        onThinkingUpdate: () => scrollToBottom(),
        onResponseStart: () => scrollToBottom(),
        onResponseChunk: (chunk: string) => { streamingContent.value += chunk; scrollToBottom() },
        signal: abortController.value.signal,
      })
    } catch { /* handled in composable */ }
    streamingContent.value = ''
  } else {
    await sendMessage(messageContent, { onThinkingStart: () => scrollToBottom(), onThinkingUpdate: () => scrollToBottom() })
  }

  const msgs = activeConversation.value?.messages
  const lastMsg = msgs ? msgs[msgs.length - 1] : undefined
  if (lastMsg?.role === 'assistant') {
    outputArtifacts.value = [
      { name: 'Excel 组货清单', status: '已生成', tone: 'bg-emerald-50 text-emerald-700' },
      { name: 'PPT 客户方案', status: '草稿', tone: 'bg-blue-50 text-blue-700' },
      { name: 'PDF 方案画册', status: '待确认', tone: 'bg-amber-50 text-amber-700' },
    ]
    rightCollapsed.value = false
    if (lastMsg.content.includes('知识缺口')) {
      knowledgeGaps.value = ['部分品牌最新库存及价格待确认', '建议补充SKU级尺码覆盖数据']
      rightCollapsed.value = false
    }
  }
  thinkingCollapsed.value = true
  abortController.value = null
}

function handleStop() {
  abortController.value?.abort()
  stopStreaming()
  streamingContent.value = ''
  thinkingCollapsed.value = true
}

// ---- feedback ----
function toggleFeedback(msgId: string, type: 'up' | 'down') {
  messageFeedback.value[msgId] = messageFeedback.value[msgId] === type ? null : type
}

// ---- conversation management ----
function handleNewConversation() {
  const conv = createConversation()
  conv.messages.push({
    id: 'welcome-' + Date.now(),
    role: 'assistant',
    content: '👋 新会话已创建。告诉我你的需求，我来帮你完成方案！',
    timestamp: Date.now(),
  })
  chatInput.value = ''; streamingContent.value = ''
  knowledgeGaps.value = []
  outputArtifacts.value = outputArtifacts.value.map(a => ({ ...a, status: '等待生成', tone: 'bg-zinc-50 text-zinc-500' }))
}

function handleSwitchSession(id: string) {
  if (id === activeConversationId.value) return
  renamingConversationId.value = null
  switchConversation(id)
  chatInput.value = ''; streamingContent.value = ''
}

function handleDeleteSession(id: string) { showConfirmDelete.value = id }
function confirmDelete() {
  if (showConfirmDelete.value) { deleteConversation(showConfirmDelete.value); showConfirmDelete.value = null }
}

function beginRenameConversation(conv: Conversation) {
  renamingConversationId.value = conv.id
  renameDraft.value = conv.title
}

function cancelRenameConversation() {
  renamingConversationId.value = null
  renameDraft.value = ''
}

function commitRenameConversation() {
  const id = renamingConversationId.value
  const nextTitle = renameDraft.value.trim()
  if (id && nextTitle) updateConversationTitle(id, nextTitle)
  cancelRenameConversation()
}

function handleToggleFavorite(id: string) {
  toggleConversationFavorite(id)
}

function handleTogglePinned(id: string) {
  toggleConversationPinned(id)
}

// ---- knowledge upload ----
function triggerKnowledgeUpload() { knowledgeUploadInput.value?.click() }
function handleKnowledgeUpload(event: Event) {
  const files = Array.from((event.target as HTMLInputElement).files || [])
  if (!files.length) return
  uploadedFiles.value.push(...files.map(f => f.name))
  referenceFiles.value.push(...files.map(f => ({ name: f.name, desc: '待解析入库', status: 'pending' })))
  rightCollapsed.value = false
}

// ---- keyboard ----
function onKeydown(e: KeyboardEvent) {
  // Enter 发送（不含 Shift）
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  // Escape 取消焦点
  if (e.key === 'Escape') { (e.target as HTMLTextAreaElement)?.blur() }
}

// ---- grid layout ----
const gridTemplate = computed(() => {
  const left = leftCollapsed.value ? '48px' : '248px'
  const right = rightCollapsed.value ? '48px' : '280px'
  return `${left} minmax(0, 1fr) ${right}`
})

// ---- text elide ----
function elide(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + '...' : text
}

// ---- display helpers ----
function getLastThinking(msg: ChatMessage): ThinkingStep[] | undefined { return msg.thinking }
function formatTime(ts: number): string {
  const d = new Date(ts); const now = new Date(); const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return '刚刚'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}分前`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}时前`
  return d.toLocaleDateString('zh-CN')
}

const workspaceActions: { key: string; label: string; icon: unknown; desc: string }[] = [
  { key: 'knowledge', label: '知识库', icon: Database, desc: '组货方案·组货逻辑知识库' },
  { key: 'automation', label: '自动化', icon: Calendar, desc: '定时任务与触发器' },
  { key: 'expert', label: '专家', icon: Users, desc: '方案中心主管·组货方案专家' },
  { key: 'mcp', label: 'MCP', icon: Plug2, desc: '知识库·钉钉文档·AI表格' },
  { key: 'skills', label: '技能', icon: Wrench, desc: '字段校验·预算分档·文案' },
  { key: 'more', label: '更多', icon: MoreHorizontal, desc: '连接器·权限·设置' },
]

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1 text-zinc-900">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2 text-zinc-900">$1</h2>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-zinc-100 rounded px-1 py-0.5 text-xs font-mono">$1</code>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
    .replace(/---/g, '<hr class="my-2 border-zinc-200"/>')
    .replace(/\|(.+)\|/g, (_: string) => {
      const cells = _.split('|').filter(c => c.trim())
      if (cells.some(c => c.includes('---'))) return ''
      return '<div class="flex gap-2 text-xs py-0.5">' + cells.map(c => `<span class="flex-1">${c.trim()}</span>`).join('') + '</div>'
    })
}
</script>

<template>
  <div class="fixed inset-x-0 bottom-0 top-14 z-30 overflow-hidden bg-zinc-50 md:top-16">
    <!-- Desktop 3-column layout -->
    <div class="hidden h-full min-h-0 transition-[grid-template-columns] duration-300 ease-out lg:grid" :style="{ gridTemplateColumns: gridTemplate }">
      <!-- ========== LEFT SIDEBAR ========== -->
      <aside class="min-h-0 overflow-hidden border-r border-zinc-200 bg-white transition-all duration-300">
        <div v-if="leftCollapsed" class="flex h-full flex-col items-center gap-1.5 overflow-y-auto p-1.5">
          <button type="button" class="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-100" @click="leftCollapsed = false"><ChevronsRight class="h-3.5 w-3.5" /></button>
          <button v-for="item in workspaceActions" :key="item.key" type="button" class="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700" :title="item.label" @click.stop="item.key === 'more' ? showMoreMenu = !showMoreMenu : openSubPanel(item.key)">
            <component :is="item.icon" class="h-4 w-4" />
          </button>
          <div class="my-1 w-6 border-t border-zinc-200" />
          <button type="button" class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700" title="新建会话" @click="handleNewConversation"><Plus class="h-4 w-4" /></button>
          <button v-for="conv in sortedConversations.slice(0, 10)" :key="conv.id" type="button" class="flex h-9 w-9 items-center justify-center rounded-lg border text-[10px] font-semibold" :class="conv.id === activeConversationId ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-zinc-200 text-zinc-500 hover:border-blue-200 hover:bg-blue-50'" :title="conv.title" @click="handleSwitchSession(conv.id)">{{ conv.isPinned ? '顶' : conv.isFavorite ? '★' : conv.title.slice(0, 1) }}</button>
        </div>

        <div v-else class="flex h-full flex-col">
          <div class="flex items-center justify-between px-2.5 pt-2.5 pb-2">
            <button type="button" class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-100" @click="leftCollapsed = true"><ChevronsLeft class="h-3.5 w-3.5" /></button>
            <button type="button" class="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700" @click="handleNewConversation"><Plus class="h-3.5 w-3.5" />新建会话</button>
          </div>

          <!-- Sidebar actions -->
          <div class="mx-2.5 mb-2.5 grid grid-cols-1 gap-0.5">
            <button v-for="item in workspaceActions" :key="item.key" type="button" class="flex min-h-[38px] items-center gap-2 rounded-lg px-2.5 text-left text-xs font-medium transition" :class="activeSubPanel === item.key ? 'bg-blue-50 text-blue-700' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'" @click="item.key === 'more' ? showMoreMenu = !showMoreMenu : openSubPanel(item.key)">
              <component :is="item.icon" class="h-3.5 w-3.5 shrink-0" />
              <div class="min-w-0 flex-1">
                <div>{{ item.label }}</div>
                <div class="text-[10px] text-zinc-400 leading-tight truncate">{{ item.desc }}</div>
              </div>
            </button>
          </div>

          <!-- More dropdown -->
          <div v-if="showMoreMenu" class="mx-2.5 mb-2 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">
            <button v-for="mi in moreMenuItems" :key="mi.id" class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-zinc-600 hover:bg-zinc-50" @click="openSubPanel(mi.id); showMoreMenu = false">
              <component :is="mi.icon" class="h-3.5 w-3.5" />
              <div>
                <div class="font-medium">{{ mi.label }}</div>
                <div class="text-[10px] text-zinc-400">{{ mi.desc }}</div>
              </div>
            </button>
          </div>

          <input ref="knowledgeUploadInput" class="hidden" type="file" multiple accept=".xlsx,.xls,.csv,.doc,.docx,.pdf,.ppt,.pptx,.md,.txt" @change="handleKnowledgeUpload" />

          <!-- Search -->
          <label class="mx-2.5 mb-2.5 flex h-7 items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-zinc-400">
            <Search class="h-3.5 w-3.5" />
            <input class="min-w-0 flex-1 bg-transparent text-[11px] outline-none" placeholder="搜索会话" />
          </label>

          <!-- Session list -->
          <div class="mx-2 mb-2 flex-1 space-y-1 overflow-y-auto">
            <button v-for="conv in sortedConversations" :key="conv.id" type="button" class="group relative w-full rounded-lg border p-2 text-left transition" :class="conv.id === activeConversationId ? 'border-blue-200 bg-blue-50' : 'border-transparent hover:border-blue-100 hover:bg-blue-50/50'" @click="handleSwitchSession(conv.id)">
              <div class="flex items-center justify-between gap-1.5">
                <div v-if="renamingConversationId === conv.id" class="flex min-w-0 flex-1 items-center gap-1" @click.stop>
                  <input v-model="renameDraft" class="h-6 min-w-0 flex-1 rounded-md border border-blue-200 bg-white px-2 text-[11px] font-medium text-zinc-900 outline-none ring-2 ring-blue-100" @keydown.enter.prevent.stop="commitRenameConversation" @keydown.esc.prevent.stop="cancelRenameConversation" />
                  <button type="button" class="shrink-0 rounded-md bg-blue-600 px-1.5 py-1 text-[10px] font-medium text-white hover:bg-blue-700" @click.stop="commitRenameConversation">保存</button>
                </div>
                <span v-else class="line-clamp-1 min-w-0 flex-1 text-[11px] font-medium text-zinc-900">
                  <Pin v-if="conv.isPinned" class="mr-1 inline h-3 w-3 text-blue-600" />
                  <Star v-if="conv.isFavorite" class="mr-1 inline h-3 w-3 fill-amber-400 text-amber-400" />
                  {{ conv.title }}
                </span>
                <span class="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px]" :class="conv.id === activeConversationId ? 'text-blue-600 bg-blue-100' : 'text-zinc-500'">{{ conv.messages.length }}条</span>
              </div>
              <div class="mt-0.5 flex items-center justify-between text-[10px] text-zinc-400">
                <div class="flex items-center gap-1"><History class="h-3 w-3" />{{ formatTime(conv.updatedAt) }}</div>
                <div class="flex items-center gap-0.5 transition-opacity group-hover:opacity-100" :class="(conv.isPinned || conv.isFavorite) ? 'opacity-100' : 'opacity-0'">
                  <button type="button" class="rounded p-0.5 hover:bg-blue-100 hover:text-blue-600" :class="conv.isPinned ? 'bg-blue-100 text-blue-600 opacity-100' : ''" title="置顶" @click.stop="handleTogglePinned(conv.id)"><Pin class="h-3 w-3" /></button>
                  <button type="button" class="rounded p-0.5 hover:bg-amber-100 hover:text-amber-600" :class="conv.isFavorite ? 'bg-amber-100 text-amber-600 opacity-100' : ''" title="收藏" @click.stop="handleToggleFavorite(conv.id)"><Star class="h-3 w-3" /></button>
                  <button type="button" class="rounded p-0.5 hover:bg-zinc-100 hover:text-zinc-700" title="重命名" @click.stop="beginRenameConversation(conv)"><Pencil class="h-3 w-3" /></button>
                  <button type="button" class="rounded p-0.5 hover:bg-red-100 hover:text-red-600" title="删除" @click.stop="handleDeleteSession(conv.id)"><Trash2 class="h-3 w-3" /></button>
                </div>
              </div>
            </button>
            <div v-if="conversations.length === 0" class="py-8 text-center text-[10px] text-zinc-400"><History class="mx-auto h-7 w-7 text-zinc-200 mb-1.5" />暂无会话</div>
          </div>
        </div>
      </aside>

      <!-- ========== CENTER: CHAT AREA ========== -->
      <main class="flex min-h-0 flex-col overflow-hidden bg-white relative">
        <!-- Header -->
        <header class="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 px-3 md:px-4">
          <div class="min-w-0 flex items-center gap-2">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white"><Sparkles class="h-3.5 w-3.5" /></div>
            <h1 class="truncate text-sm font-semibold text-zinc-950">{{ activeConversation?.title || '工作会话' }}</h1>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium" :class="modeMeta[runMode].tone">
              {{ modeMeta[runMode].label }}模式
            </span>
            <ContextIndicator />
          </div>
        </header>

        <!-- Messages -->
        <section ref="messagesContainer" class="min-h-0 flex-1 overflow-y-auto">
          <div class="mx-auto flex max-w-2xl flex-col gap-2.5 px-3 pb-36 pt-3 md:px-4">
            <!-- Empty state -->
            <div v-if="activeMessages.filter(m => !m.id.startsWith('welcome')).length === 0 && !isStreaming" class="flex flex-col items-center justify-center py-16 text-center">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 mb-2.5"><Sparkles class="h-6 w-6 text-blue-500" /></div>
              <p class="text-sm text-zinc-500">输入你的需求，我会帮你完成方案</p>
              <div class="mt-3 grid gap-1.5 w-full max-w-sm">
                <button v-for="q in ['帮我给B2B线下客户出一版团购方案，预算10万', '对比最近3个成功的门店团购案例', '把我的组货逻辑封装成一个技能']" :key="q" class="rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition text-left" @click="handleSend(q)">{{ q }}</button>
              </div>
            </div>

            <!-- Messages -->
            <div v-for="(message, index) in activeMessages" :key="message.id">
              <!-- System message -->
              <div v-if="message.role === 'system'" class="flex justify-center my-2">
                <div class="max-w-[80%] rounded-full bg-zinc-100 px-4 py-1 text-center text-[11px] text-zinc-500">{{ message.content }}</div>
              </div>

              <!-- User / Assistant message -->
              <div v-else class="flex gap-2" :class="message.role === 'user' ? 'flex-row-reverse' : ''">
                <!-- Avatar -->
                <div class="shrink-0 mt-0.5">
                  <div v-if="message.role === 'user'" class="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-zinc-600"><User class="h-3.5 w-3.5" /></div>
                  <div v-else class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white"><Sparkles class="h-3.5 w-3.5" /></div>
                </div>

                <!-- Content -->
                <div class="min-w-0" :class="message.role === 'user' ? 'max-w-[78%]' : 'max-w-[82%]'">
                  <!-- Thinking chain -->
                  <div v-if="getLastThinking(message) && message.id !== 'welcome'" class="mb-1.5">
                    <ThinkingChain :steps="getLastThinking(message)!" :is-collapsed="index !== activeMessages.length - 1 || thinkingCollapsed" @toggle="thinkingCollapsed = !thinkingCollapsed" />
                  </div>

                  <!-- Message bubble -->
                  <div class="rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm" :class="message.role === 'user' ? 'bg-blue-600 text-white rounded-tr-md' : 'border border-zinc-200 bg-white text-zinc-700 rounded-tl-md'">
                    <div v-if="message.role === 'assistant'" v-html="renderMarkdown(message.content)" />
                    <div v-else class="whitespace-pre-wrap">{{ message.content }}</div>
                  </div>

                  <!-- Feedback buttons (assistant only) -->
                  <div v-if="message.role === 'assistant' && message.id !== 'welcome'" class="mt-1 flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                    <button class="rounded p-0.5 text-zinc-300 hover:text-emerald-500 hover:bg-emerald-50" :class="{ 'text-emerald-500': messageFeedback[message.id] === 'up' }" @click="toggleFeedback(message.id, 'up')"><ThumbsUp class="h-3 w-3" /></button>
                    <button class="rounded p-0.5 text-zinc-300 hover:text-red-500 hover:bg-red-50" :class="{ 'text-red-500': messageFeedback[message.id] === 'down' }" @click="toggleFeedback(message.id, 'down')"><ThumbsDown class="h-3 w-3" /></button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Active thinking chain -->
            <div v-if="isStreaming && currentThinking.length > 0 && !isApiConfigured()" class="flex gap-2">
              <div class="shrink-0 mt-0.5"><div class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white"><Sparkles class="h-3.5 w-3.5" /></div></div>
              <div class="max-w-[82%] min-w-0"><ThinkingChain :steps="currentThinking" :is-collapsed="thinkingCollapsed" @toggle="thinkingCollapsed = !thinkingCollapsed" /></div>
            </div>

            <!-- Streaming response -->
            <div v-if="streamingContent" class="flex gap-2">
              <div class="shrink-0 mt-0.5"><div class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white"><Sparkles class="h-3.5 w-3.5" /></div></div>
              <div class="max-w-[82%] rounded-2xl rounded-tl-md border border-blue-200 bg-white px-3 py-2 text-sm leading-6 text-zinc-700 shadow-sm">{{ streamingContent }}<span class="inline-block w-1.5 h-4 bg-blue-500 ml-0.5 animate-pulse align-text-bottom" /></div>
            </div>

            <!-- Loading -->
            <div v-if="isStreaming && !streamingContent && currentThinking.length === 0" class="flex gap-2">
              <div class="shrink-0 mt-0.5"><div class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white"><Loader2 class="h-3.5 w-3.5 animate-spin" /></div></div>
              <div class="rounded-2xl rounded-tl-md border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-400 flex items-center gap-2"><Loader2 class="h-4 w-4 animate-spin" />正在思考...</div>
            </div>
          </div>
        </section>

        <!-- Input footer (always visible) -->
        <footer class="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-white via-white to-white/0 px-3 pb-3 pt-8 md:px-4">
          <div class="mx-auto max-w-2xl">
            <div class="mb-1.5 flex flex-wrap gap-1.5">
              <button class="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50">生成钉钉待办</button>
              <button class="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50">生成需求草稿</button>
              <button class="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50">封装成技能</button>
            </div>
            <div class="flex items-end gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition">
              <button type="button" class="rounded-lg p-1.5 text-zinc-400 hover:bg-white hover:text-zinc-600"><Paperclip class="h-4 w-4" /></button>
              <textarea v-model="chatInput" rows="1" class="min-w-0 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-zinc-400 py-0.5" placeholder="输入消息，Enter 发送 · Shift+Enter 换行" @keydown="onKeydown" @input="(e: Event) => { const el = e.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px' }" />
              <button v-if="isStreaming" type="button" class="rounded-lg bg-red-500 p-1.5 text-white hover:bg-red-600" @click="handleStop"><Square class="h-4 w-4" /></button>
              <template v-else>
                <span class="hidden sm:block text-[10px] text-zinc-400 select-none">Enter ↵</span>
                <button type="button" class="rounded-lg p-1.5 transition" :class="chatInput.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-zinc-200 text-zinc-400'" :disabled="!chatInput.trim()" @click="handleSend()"><SendHorizontal class="h-4 w-4" /></button>
              </template>
            </div>
          </div>
        </footer>

        <!-- ===== SUB-PANEL OVERLAY ===== -->
        <div v-if="activeSubPanel" class="absolute inset-0 z-20 flex flex-col bg-white">
          <!-- Panel header -->
          <div class="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 px-3">
            <button class="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-zinc-100" @click="closeSubPanel"><ArrowLeft class="h-4 w-4" /></button>
            <h2 class="text-sm font-semibold text-zinc-950">{{ subPanelTitle }}</h2>
          </div>

          <!-- Panel body -->
          <div class="flex-1 overflow-y-auto px-4 py-4">
            <!-- Knowledge Base -->
            <div v-if="activeSubPanel === 'knowledge'" class="max-w-2xl mx-auto space-y-4">
              <div class="flex items-center gap-2 text-sm"><Database class="h-4 w-4 text-emerald-600" /><span class="font-semibold text-zinc-900">知识库管理</span><span class="text-xs text-zinc-400">· 组货知识与逻辑沉淀</span></div>
              <div v-for="kb in knowledgeBases" :key="kb.name" class="rounded-xl border border-zinc-200 bg-white p-4 hover:border-emerald-200 transition">
                <div class="flex items-start justify-between">
                  <div>
                    <div class="flex items-center gap-2"><span class="text-sm font-semibold text-zinc-900">{{ kb.name }}</span><span class="rounded-full px-1.5 py-0.5 text-[9px] font-medium" :class="kb.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">{{ kb.status === 'active' ? '运行中' : '构建中' }}</span></div>
                    <p class="mt-1 text-xs text-zinc-500">{{ kb.desc }}</p>
                  </div>
                  <span class="text-xs text-zinc-400">{{ kb.docs }} 篇文档</span>
                </div>
                <div class="mt-3 flex gap-2">
                  <button class="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50">📄 查看文档</button>
                  <button class="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50" @click="triggerKnowledgeUpload">上传资料</button>
                </div>
              </div>
              <div class="rounded-xl border border-dashed border-zinc-300 p-6 text-center">
                <Plus class="mx-auto h-6 w-6 text-zinc-300 mb-1.5" />
                <p class="text-xs text-zinc-400">新建知识库</p>
                <p class="mt-1 text-[10px] text-zinc-300">组织知识资产，供智能体检索引用</p>
              </div>
            </div>

            <!-- Automation -->
            <div v-if="activeSubPanel === 'automation'" class="max-w-2xl mx-auto space-y-4">
              <div class="flex items-center gap-2 text-sm"><Calendar class="h-4 w-4 text-blue-600" /><span class="font-semibold text-zinc-900">定时任务与触发器</span><span class="text-xs text-zinc-400">· 自动化执行</span></div>
              <div v-for="auto in automations" :key="auto.name" class="rounded-xl border border-zinc-200 bg-white p-4">
                <div class="flex items-start justify-between">
                  <div>
                    <div class="flex items-center gap-2"><span class="text-sm font-semibold text-zinc-900">{{ auto.name }}</span><span class="rounded-full px-1.5 py-0.5 text-[9px] font-medium" :class="auto.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'">{{ auto.status === 'active' ? '运行中' : '暂停' }}</span></div>
                    <p class="mt-1 text-xs text-zinc-500">触发：{{ auto.trigger }} · 执行：{{ auto.agent }}</p>
                  </div>
                  <button v-if="auto.status === 'active'" class="rounded-lg border border-zinc-200 px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-50">暂停</button>
                  <button v-else class="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] text-blue-600 hover:bg-blue-100">启动</button>
                </div>
              </div>
              <button class="w-full rounded-xl border border-dashed border-zinc-300 p-4 text-center hover:border-blue-300 transition">
                <Plus class="mx-auto h-6 w-6 text-zinc-300 mb-1" />
                <p class="text-xs text-zinc-400">新建定时任务</p>
              </button>
            </div>

            <!-- Expert -->
            <div v-if="activeSubPanel === 'expert'" class="max-w-2xl mx-auto space-y-4">
              <div class="flex items-center gap-2 text-sm"><Users class="h-4 w-4 text-violet-600" /><span class="font-semibold text-zinc-900">专家智能体</span><span class="text-xs text-zinc-400">· 主智能体 + 子智能体</span></div>
              <div v-for="exp in experts" :key="exp.name" class="rounded-xl border border-zinc-200 bg-white p-4">
                <div class="flex items-start gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" :class="exp.status === 'active' ? 'bg-violet-50 text-violet-600' : 'bg-zinc-100 text-zinc-400'"><Bot class="h-5 w-5" /></div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2"><span class="text-sm font-semibold text-zinc-900">{{ exp.name }}</span><span class="text-[10px] text-zinc-400">{{ exp.role }}</span><span class="rounded-full px-1.5 py-0.5 text-[9px] font-medium" :class="exp.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'">{{ exp.status === 'active' ? '运行中' : '草稿' }}</span></div>
                    <p class="mt-1 text-xs text-zinc-500">{{ exp.desc }}</p>
                    <div class="mt-2 flex flex-wrap gap-1">
                      <span v-for="s in exp.skills" :key="s" class="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">{{ s }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- MCP -->
            <div v-if="activeSubPanel === 'mcp'" class="max-w-2xl mx-auto space-y-4">
              <div class="flex items-center gap-2 text-sm"><Plug2 class="h-4 w-4 text-sky-600" /><span class="font-semibold text-zinc-900">MCP 连接器</span><span class="text-xs text-zinc-400">· 外部能力接入</span></div>
              <div v-for="mcp in mcpConnections" :key="mcp.name" class="rounded-xl border border-zinc-200 bg-white p-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="flex h-8 w-8 items-center justify-center rounded-lg" :class="mcp.status === 'connected' ? 'bg-emerald-50 text-emerald-600' : mcp.status === 'configured' ? 'bg-blue-50 text-blue-600' : 'bg-zinc-100 text-zinc-400'"><Plug2 class="h-4 w-4" /></div>
                    <div>
                      <div class="text-xs font-semibold text-zinc-900">{{ mcp.name }}<span class="ml-1.5 text-[10px] text-zinc-400">{{ mcp.type }}</span></div>
                      <p class="mt-0.5 text-[10px] text-zinc-500">{{ mcp.desc }}</p>
                    </div>
                  </div>
                  <span class="rounded-full px-2 py-0.5 text-[9px] font-medium" :class="mcp.status === 'connected' ? 'bg-emerald-50 text-emerald-700' : mcp.status === 'configured' ? 'bg-blue-50 text-blue-700' : 'bg-zinc-100 text-zinc-500'">{{ mcp.status === 'connected' ? '已连接' : mcp.status === 'configured' ? '已配置' : '待接入' }}</span>
                </div>
              </div>
            </div>

            <!-- Skills -->
            <div v-if="activeSubPanel === 'skills'" class="max-w-2xl mx-auto space-y-4">
              <div class="flex items-center gap-2 text-sm"><Wrench class="h-4 w-4 text-amber-600" /><span class="font-semibold text-zinc-900">技能 Skill</span><span class="text-xs text-zinc-400">· 提示词、工作流封装</span></div>
              <div v-for="skill in skillsList" :key="skill.name" class="rounded-xl border border-zinc-200 bg-white p-3">
                <div class="flex items-start gap-2.5">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Wrench class="h-4 w-4" /></div>
                  <div>
                    <div class="text-xs font-semibold text-zinc-900">{{ skill.name }}</div>
                    <p class="mt-0.5 text-[10px] text-zinc-500">{{ skill.desc }}</p>
                    <p class="mt-1 text-[9px] text-zinc-400">来源：{{ skill.from }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- ========== RIGHT SIDEBAR ========== -->
      <aside class="hidden min-h-0 overflow-hidden border-l border-zinc-200 bg-white transition-all duration-300 lg:block">
        <div v-if="rightCollapsed" class="flex h-full flex-col items-center gap-2 overflow-y-auto p-1.5">
          <button type="button" class="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-100" @click="rightCollapsed = false"><ChevronsLeft class="h-3.5 w-3.5" /></button>
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700" title="引用"><Database class="h-4 w-4" /></div>
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700" title="产物"><FileSpreadsheet class="h-4 w-4" /></div>
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700" title="知识缺口"><Lightbulb class="h-4 w-4" /></div>
        </div>

        <div v-else class="flex h-full flex-col overflow-y-auto p-2.5">
          <button type="button" class="sticky top-0 z-10 mb-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-100" @click="rightCollapsed = true"><ChevronsRight class="h-3.5 w-3.5" /></button>

          <!-- References -->
          <div class="mb-2.5 rounded-xl border border-emerald-100 bg-emerald-50 p-2.5">
            <div class="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800"><Database class="h-3.5 w-3.5" />引用文件</div>
            <div class="mt-1.5 grid gap-1">
              <div v-for="file in referenceFiles" :key="file.name" class="rounded-lg bg-white px-2 py-1.5 text-[10px] leading-4 text-zinc-600">
                <div class="font-medium">{{ file.name }}</div>
                <div class="text-zinc-400">{{ file.desc }}<span class="ml-1.5" :class="file.status === 'ready' ? 'text-emerald-500' : 'text-amber-500'">{{ file.status === 'ready' ? '✓' : '解析中' }}</span></div>
              </div>
            </div>
          </div>

          <!-- Output artifacts -->
          <div class="mb-2.5 rounded-xl border border-blue-100 bg-blue-50 p-2.5">
            <div class="flex items-center gap-1.5 text-[11px] font-semibold text-blue-800"><FileSpreadsheet class="h-3.5 w-3.5" />输出文件</div>
            <div class="mt-1.5 grid gap-1">
              <div v-for="item in outputArtifacts" :key="item.name" class="flex min-h-8 items-center justify-between gap-2 rounded-lg bg-white px-2.5 text-[10px] font-semibold text-zinc-700">
                <span>{{ item.name }}</span>
                <span class="rounded-full px-1.5 py-0.5 text-[9px]" :class="item.tone">{{ item.status }}</span>
              </div>
            </div>
          </div>

          <!-- Knowledge gaps -->
          <div class="mb-2.5 rounded-xl border border-amber-100 bg-amber-50 p-2.5">
            <div class="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800"><Lightbulb class="h-3.5 w-3.5" />知识缺口</div>
            <ul v-if="knowledgeGaps.length > 0" class="mt-1.5 space-y-1 text-[10px] leading-4 text-amber-800"><li v-for="item in knowledgeGaps" :key="item">· {{ item }}</li></ul>
            <p v-else class="mt-1.5 text-[10px] text-amber-600/50">暂无知识缺口</p>
          </div>

          <!-- Context memory -->
          <div class="rounded-xl border border-zinc-100 bg-zinc-50 p-2.5">
            <div class="text-[11px] font-semibold text-zinc-700 mb-1.5">🧠 上下文记忆</div>
            <div class="space-y-0.5 text-[10px] text-zinc-500">
              <div class="flex justify-between"><span>执行模式</span><span class="font-medium">{{ modeMeta[runMode].label }}</span></div>
              <div class="flex justify-between"><span>首页附件</span><span class="font-mono">{{ attachedFileCount }} 个</span></div>
              <div class="flex justify-between"><span>消息数</span><span class="font-mono">{{ contextStats.messageCount }} 条</span></div>
              <div class="flex justify-between"><span>估算 Token</span><span class="font-mono">~{{ (contextStats.estimatedTokens / 1000).toFixed(1) }}k</span></div>
              <div class="flex justify-between"><span>窗口上限</span><span class="font-mono">{{ (contextStats.maxTokens / 1000).toFixed(0) }}k</span></div>
              <div class="mt-1.5"><div class="h-1 rounded-full bg-zinc-200 overflow-hidden"><div class="h-full rounded-full transition-all duration-500" :class="{'bg-emerald-400': contextStats.usagePercent < 40, 'bg-blue-400': contextStats.usagePercent >= 40 && contextStats.usagePercent < 70, 'bg-amber-400': contextStats.usagePercent >= 70 && contextStats.usagePercent < 90, 'bg-red-400': contextStats.usagePercent >= 90}" :style="{ width: `${Math.min(contextStats.usagePercent, 100)}%` }" /></div></div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- ===== MOBILE ===== -->
    <main class="relative flex h-full min-h-0 flex-col overflow-hidden lg:hidden">
      <header class="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-3">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white"><Sparkles class="h-3.5 w-3.5" /></div>
          <span class="truncate text-sm font-semibold text-zinc-950">{{ activeConversation?.title || '工作会话' }}</span>
        </div>
        <span class="mr-2 shrink-0 rounded-full border px-2 py-1 text-[10px] font-medium" :class="modeMeta[runMode].tone">{{ modeMeta[runMode].label }}</span>
        <ContextIndicator />
      </header>
      <section class="min-h-0 flex-1 overflow-y-auto px-3 pb-28 pt-3">
        <div class="flex flex-col gap-2.5">
          <div v-for="(message, index) in activeMessages" :key="'m-'+index">
            <div v-if="message.role === 'system'" class="flex justify-center my-1.5">
              <div class="rounded-full bg-zinc-100 px-3 py-1 text-[10px] text-zinc-500">{{ message.content }}</div>
            </div>
            <div v-else class="flex gap-1.5" :class="message.role === 'user' ? 'flex-row-reverse' : ''">
              <div class="shrink-0 mt-0.5">
                <div v-if="message.role === 'user'" class="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-zinc-600"><User class="h-3 w-3" /></div>
                <div v-else class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white"><Sparkles class="h-3 w-3" /></div>
              </div>
              <div class="min-w-0 max-w-[85%]">
                <div v-if="getLastThinking(message)" class="mb-1"><ThinkingChain :steps="getLastThinking(message)!" :is-collapsed="thinkingCollapsed" @toggle="thinkingCollapsed = !thinkingCollapsed" /></div>
                <div class="rounded-2xl px-3 py-2 text-sm leading-6" :class="message.role === 'user' ? 'bg-blue-600 text-white' : 'border border-zinc-200 bg-white text-zinc-700'">
                  <div v-if="message.role === 'assistant'" v-html="renderMarkdown(message.content)" />
                  <div v-else class="whitespace-pre-wrap">{{ message.content }}</div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="streamingContent" class="flex gap-1.5">
            <div class="shrink-0"><div class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white"><Sparkles class="h-3 w-3" /></div></div>
            <div class="max-w-[85%] rounded-2xl border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-700">{{ streamingContent }}<span class="inline-block w-1 h-4 bg-blue-500 ml-0.5 animate-pulse" /></div>
          </div>
        </div>
      </section>
      <footer class="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-white via-white to-white/0 px-3 pb-3 pt-8">
        <div class="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1.5">
          <textarea v-model="chatInput" rows="1" class="min-w-0 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-zinc-400" placeholder="继续补充..." @keydown="onKeydown" />
          <button v-if="isStreaming" type="button" class="rounded-lg bg-red-500 p-1.5 text-white" @click="handleStop"><Square class="h-4 w-4" /></button>
          <button v-else type="button" class="rounded-lg p-1.5" :class="chatInput.trim() ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-zinc-400'" :disabled="!chatInput.trim()" @click="handleSend()"><SendHorizontal class="h-4 w-4" /></button>
        </div>
      </footer>
    </main>

    <!-- Delete confirm -->
    <Teleport to="body">
      <div v-if="showConfirmDelete" class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm" @click.self="showConfirmDelete = null">
        <div class="w-full max-w-sm rounded-xl border bg-white p-5 shadow-2xl">
          <p class="text-sm font-medium text-zinc-900">确定删除这个会话？</p>
          <p class="mt-1 text-xs text-zinc-500">会话和其中的消息将被永久删除。</p>
          <div class="mt-4 flex justify-end gap-2">
            <button class="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50" @click="showConfirmDelete = null">取消</button>
            <button class="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700" @click="confirmDelete">删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
