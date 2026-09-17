import { computed, inject, nextTick, onBeforeUnmount, onMounted, provide, ref, watch, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { stripModePrefix, summarizeConversationTitle, useAIChat, type ChatMessage, type Conversation, type ThinkingStep, type ChatAttachment } from '@/composables/useAIChat'
import { experts as mockExperts, type Expert } from '@/mock/experts'

// ---- types ----
export type RunMode = 'quick' | 'task'
export type SubPanel = 'knowledge' | 'expert' | 'mcp' | 'skills' | 'more' | null

export interface KbFile {
  id: string
  name: string
  type: string // pdf | doc | docx | md | txt | xlsx | folder
  size: string
  updatedAt: string
  owner: string
  folder?: string // kb folder id
}

export interface KbFolderNode {
  id: string
  name: string
  parentId: string | null
}

export interface ChatController {
  // state (exposed as refs)
  chatInput: Ref<string>
  quotedChatMessage: Ref<{ id: string; content: string } | null>
  messageReplyRefs: Ref<Record<string, string>>
  memoryEnabled: Ref<boolean>
  sidebarSearch: Ref<string>
  sidebarModeFilter: Ref<'all' | RunMode>
  runMode: Ref<RunMode>
  attachedFileCount: Ref<number>
  leftCollapsed: Ref<boolean>
  rightCollapsed: Ref<boolean>
  thinkingCollapsed: Ref<boolean>
  messagesContainer: Ref<HTMLElement | null>
  isAutoScroll: Ref<boolean>
  showBackToLatest: Ref<boolean>
  abortController: Ref<AbortController | null>
  streamingContent: Ref<string>
  showConfirmDelete: Ref<string | null>
  renamingConversationId: Ref<string | null>
  renameDraft: Ref<string>
  showDislikeModal: Ref<boolean>
  dislikeMsgId: Ref<string>
  dislikeReasons: Ref<string[]>
  dislikeComment: Ref<string>
  showSearchDialog: Ref<boolean>
  messageFeedback: Ref<Record<string, 'up' | 'down' | null>>
  uploadedFiles: Ref<string[]>
  selectedAgent: Ref<string>
  selectedKnowledgeRefs: Ref<{ title: string; kb: string; desc: string; agent: string }[]>
  referenceFiles: Ref<{ name: string; desc: string; status: string }[]>
  outputArtifacts: Ref<{ name: string; status: string; tone: string }[]>
  knowledgeGaps: Ref<string[]>
  activeSubPanel: Ref<SubPanel>
  showMoreMenu: Ref<boolean>
  // new UI states
  attachedFiles: Ref<ChatAttachment[]>
  maxChars: number
  warnAt: number
  selectedExperts: Ref<Expert[]>
  showUploadModal: Ref<boolean>
  uploadTab: Ref<'local' | 'kb'>
  localFiles: Ref<ChatAttachment[]>
  kbFiles: Ref<KbFile[]>
  kbSearch: Ref<string>
  kbTypeFilter: Ref<string>
  kbFolders: Ref<KbFolderNode[]>
  kbCurrentFolder: Ref<string>
  kbPage: Ref<number>
  kbBreadcrumb: ComputedRef<KbFolderNode[]>
  kbPageTotal: ComputedRef<number>
  kbPageFiles: ComputedRef<KbFile[]>
  kbFilteredAll: ComputedRef<KbFile[]>
  kbSelectedCount: ComputedRef<number>
  networkOn: Ref<boolean>
  experts: Expert[]
  searchDialogMode: Ref<'search' | 'history'>
  textPreview: Ref<{ name: string; size?: number; content?: string } | null>
  knowledgeBases: { name: string; docs: number; status: string; desc: string }[]
  mcpConnections: { name: string; type: string; desc: string; status: string }[]
  skillsList: { name: string; desc: string; from: string }[]
  moreMenuItems: { id: string; label: string; desc: string; icon: string }[]
  modeMeta: Record<RunMode, { label: string; desc: string; tone: string }>
  agentOptions: Ref<string[]>
  agentSelectLabel: ComputedRef<string>
  // computed
  sortedConversations: ComputedRef<Conversation[]>
  filteredSidebarConversations: ComputedRef<Conversation[]>
  displayConversationTitle: ComputedRef<string>
  gridTemplate: ComputedRef<string>
  sidebarGroups: ComputedRef<{ key: string; label: string; items: Conversation[] }[]>
  charCount: ComputedRef<number>
  isNearLimit: ComputedRef<boolean>
  isOverLimit: ComputedRef<boolean>
  subPanelTitle: ComputedRef<string>
  // methods
  handleSend: (text?: string) => Promise<void>
  handleStop: () => void
  toggleFeedback: (msgId: string, type: 'up' | 'down') => void
  openDislikeModal: (msgId: string) => void
  submitDislike: () => void
  openSearchDialog: (mode?: 'search' | 'history') => void
  closeSearchDialog: () => void
  copyMessage: (content: string) => void
  quoteMessage: (id: string, content: string) => void
  regenerateMessage: (msgId: string) => void
  handleNewConversation: () => void
  handleSwitchSession: (id: string) => void
  handleDeleteSession: (id: string) => void
  confirmDelete: () => void
  beginRenameConversation: (conv: Conversation) => void
  cancelRenameConversation: () => void
  commitRenameConversation: () => void
  handleToggleFavorite: (id: string) => void
  triggerChatUpload: () => void
  handleChatUpload: (event: Event) => void
  isSupportedUpload: (file: File) => boolean
  addAttachedFile: (file: ChatAttachment) => void
  removeAttachedFile: (index: number) => void
  handlePaste: (e: ClipboardEvent) => void
  onKeydown: (e: KeyboardEvent) => void
  handleInput: (e: Event) => void
  scrollToBottom: (force?: boolean) => void
  handleMessagesScroll: () => void
  markUserScrollIntent: () => void
  handleSelectionChange: () => void
  formatConversationTitle: (title: string) => string
  formatTime: (ts: number) => string
  getLastThinking: (msg: ChatMessage) => ThinkingStep[] | undefined
  renderMarkdown: (text: string) => string
  elide: (text: string, max: number) => string
  openSubPanel: (panel: string) => void
  closeSubPanel: () => void
  // new methods
  openUploadModal: () => void
  closeUploadModal: () => void
  toggleExpert: (expert: Expert) => void
  removeExpert: (id: string) => void
  applyExpertPrompt: (expert: Expert, prompt: string) => void
  openTextPreview: (payload: { name: string; size?: number; content?: string }) => void
  closeTextPreview: () => void
  confirmLocalUpload: () => void
  toggleKbFile: (file: KbFile) => void
  isKbSelected: (id: string) => boolean
  confirmKbUpload: () => void
  selectKbFolder: (id: string) => void
  changeKbPage: (delta: number) => void
}

export const CHAT_KEY: InjectionKey<ChatController> = Symbol('chat-controller')

// ---- factory ----
export function createChatController() {
  const ai = useAIChat()
  const route = useRoute()
  const router = useRouter()

  const chatInput = ref('')
  const quotedChatMessage = ref<{ id: string; content: string } | null>(null)
  const messageReplyRefs = ref<Record<string, string>>({})
  const memoryEnabled = ref(true)
  const sidebarSearch = ref('')
  const sidebarModeFilter = ref<'all' | RunMode>('all')

  const runMode = ref<RunMode>(route.query.mode === 'task' ? 'task' : 'quick')
  const attachedFileCount = ref(Number(route.query.files || 0))
  const leftCollapsed = ref(false)
  const rightCollapsed = ref(true)
  const thinkingCollapsed = ref(false)
  const messagesContainer = ref<HTMLElement | null>(null)
  const isAutoScroll = ref(true)
  const showBackToLatest = ref(false)
  const isTextSelecting = ref(false)
  const isProgrammaticScroll = ref(false)
  const userScrollIntent = ref(false)
  const abortController = ref<AbortController | null>(null)
  const streamingContent = ref('')
  const showConfirmDelete = ref<string | null>(null)
  const renamingConversationId = ref<string | null>(null)
  const renameDraft = ref('')
  const showDislikeModal = ref(false)
  const dislikeMsgId = ref('')
  const dislikeReasons = ref<string[]>([])
  const dislikeComment = ref('')
  const showSearchDialog = ref(false)
  const searchDialogMode = ref<'search' | 'history'>('search')
  const textPreview = ref<{ name: string; size?: number; content?: string } | null>(null)
  const DISLIKE_REASONS = ['匹配不准', '内容有误', '答非所问', '格式问题', '其他']

  const messageFeedback = ref<Record<string, 'up' | 'down' | null>>({})

  const chatUploadInput = ref<HTMLInputElement | null>(null)
  const uploadedFiles = ref<string[]>([])
  const selectedAgent = ref(String(route.query.agentLabel || (runMode.value === 'task' ? '组货专家' : '调研帮手')))
  const selectedKnowledgeRefs = ref([
    { title: String(route.query.caseTitle || '首页案例'), kb: String(route.query.kb || '方案中心案例库'), desc: '从首页推荐案例带入，保留当前智能体与知识库引用', agent: selectedAgent.value },
  ])

  // ---- new input states ----
  const attachedFiles = ref<ChatAttachment[]>([])
  const maxChars = 10000
  const warnAt = 9000
  const selectedExperts = ref<Expert[]>([])
  const showUploadModal = ref(false)
  const uploadTab = ref<'local' | 'kb'>('local')
  const localFiles = ref<ChatAttachment[]>([])
  const kbSearch = ref('')
  const kbTypeFilter = ref('all')
  const networkOn = ref(false)

  // 知识中心目录树
  const kbFolders = ref<KbFolderNode[]>([
    { id: 'sp', name: '个人空间', parentId: null },
    { id: 'ss', name: '共享空间', parentId: null },
    { id: 'lanbu', name: '蓝步文件夹', parentId: 'sp' },
    { id: 'anta', name: '安踏文件夹', parentId: 'sp' },
    { id: 'nike', name: '耐克', parentId: 'ss' },
    { id: 'northface', name: '北面', parentId: 'ss' },
  ])
  const kbCurrentFolder = ref<string>('sp')
  const kbPage = ref(1)
  const KB_PAGE_SIZE = 4

  // ---- mock data ----
  const experts = mockExperts

  const knowledgeBases = [
    { name: '组货方案知识库', docs: 23, status: 'active', desc: '沉淀组货案例、预算池、SKU组合策略' },
    { name: '组货逻辑知识库', docs: 15, status: 'active', desc: '组货规则、分档逻辑、品牌偏好权重' },
    { name: '商品素材库', docs: 8, status: 'building', desc: 'SPU/SKU图片、描述、规格参数' },
  ]
  const mcpConnections = [
    { name: '知识库管理', type: 'MCP', desc: '文档上传、解析入库、切片检索、版本管理', status: 'connected' },
    { name: '钉钉文档', type: 'MCP', desc: '创建/读取/更新钉钉在线文档、表格、脑图', status: 'connected' },
    { name: '钉钉AI表格', type: 'MCP', desc: '字段表、SKU清单、台账的自动写入与查询', status: 'connected' },
    { name: '钉钉待办', type: 'MCP', desc: '创建任务、设置截止时间、指派责任人', status: 'configured' },
    { name: 'ERP商品主数据', type: 'MCP', desc: '读取SKU、成本、库存、价格带数据', status: 'pending' },
  ]
  const skillsList = [
    { name: '字段校验', desc: '判断必填字段是否完整，缺失时生成追问', from: '方案中心主管' },
    { name: '预算分档', desc: '按预算生成经济型/均衡型/品质型三档策略', from: '组货方案专家' },
    { name: '营销文案生成', desc: '根据商品信息生成多平台营销文案', from: '营销文案专家' },
    { name: 'PPT提纲生成', desc: '将方案内容转为PPT汇报大纲', from: '更多能力（二期）' },
    { name: '文档总结', desc: '对上传文档进行结构化摘要', from: '更多能力（二期）' },
  ]
  const kbFiles = ref<KbFile[]>([
    { id: 'kb1', name: '团购通用预算池.md', type: 'md', size: '128 KB', updatedAt: '2026-07-01', owner: '方案中心', folder: 'lanbu' },
    { id: 'kb2', name: '运动鞋团购成功案例.pdf', type: 'pdf', size: '2.4 MB', updatedAt: '2026-06-28', owner: '方案中心', folder: 'lanbu' },
    { id: 'kb3', name: '方案中心字段模板.docx', type: 'docx', size: '64 KB', updatedAt: '2026-06-25', owner: '方案中心', folder: 'anta' },
    { id: 'kb4', name: '商品素材库说明.txt', type: 'txt', size: '12 KB', updatedAt: '2026-06-20', owner: '商品部', folder: 'sp' },
    { id: 'kb5', name: '品牌偏好权重表.xlsx', type: 'xlsx', size: '88 KB', updatedAt: '2026-06-18', owner: '数据组', folder: 'nike' },
    { id: 'kb6', name: '门店需求采集模板.pdf', type: 'pdf', size: '1.1 MB', updatedAt: '2026-06-15', owner: '门店运营', folder: 'northface' },
  ])

  // 知识中心：按当前文件夹 + 搜索 + 类型过滤，再分页
  const kbFilteredAll = computed(() => {
    const kw = kbSearch.value.trim().toLowerCase()
    const type = kbTypeFilter.value
    return kbFiles.value.filter((f) => {
      const matchFolder = f.folder === kbCurrentFolder.value
      const matchKw = !kw || f.name.toLowerCase().includes(kw)
      const matchType = type === 'all' || f.type === type
      return matchFolder && matchKw && matchType
    })
  })
  const kbPageTotal = computed(() => Math.max(1, Math.ceil(kbFilteredAll.value.length / KB_PAGE_SIZE)))
  const kbPageFiles = computed(() => {
    const start = (kbPage.value - 1) * KB_PAGE_SIZE
    return kbFilteredAll.value.slice(start, start + KB_PAGE_SIZE)
  })
  const kbBreadcrumb = computed(() => {
    const path: KbFolderNode[] = []
    let cur = kbFolders.value.find((f) => f.id === kbCurrentFolder.value)
    while (cur) {
      path.unshift(cur)
      cur = cur.parentId ? kbFolders.value.find((f) => f.id === cur!.parentId) : undefined
    }
    return path
  })
  function selectKbFolder(id: string) {
    kbCurrentFolder.value = id
    kbPage.value = 1
  }
  const kbSelectedCount = computed(() => localFiles.value.length)
  function changeKbPage(delta: number) {
    kbPage.value = Math.min(kbPageTotal.value, Math.max(1, kbPage.value + delta))
  }

  const kbTypeOptions = [
    { value: 'all', label: '所有类型' },
    { value: 'pdf', label: 'PDF 文档' },
    { value: 'doc', label: 'Word 文档' },
    { value: 'docx', label: 'Word 文档' },
    { value: 'md', label: 'Markdown' },
    { value: 'txt', label: '文本文件' },
    { value: 'xlsx', label: 'Excel 表格' },
  ]

  const modeMeta: Record<RunMode, { label: string; desc: string; tone: string }> = {
    quick: { label: '日常办公', desc: 'RAG架构，适合问答、检索和轻量办公', tone: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
    task: { label: '专家模式', desc: 'P&E架构，可调用工具和MCP完成复杂任务', tone: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
  }

  const agentOptions = computed(() => runMode.value === 'task'
    ? ['组货专家', '敬请期待']
    : ['调研帮手', '钉钉助理', '知识顾问', '写作助理'])
  const agentSelectLabel = computed(() => runMode.value === 'task' ? '专家' : '助理')

  const referenceFiles = ref([
    { name: '团购通用预算池.md', desc: '预算段、价格带、组合策略', status: 'ready' },
    { name: '运动鞋团购成功案例.md', desc: 'B2B线下成交案例库', status: 'ready' },
    { name: '方案中心字段模板.docx', desc: '客户类型、数量、预算、场景字段', status: 'ready' },
  ])
  const outputArtifacts = ref([
    { name: 'Excel 组货清单', status: '等待生成', tone: 'bg-zinc-50 text-zinc-500' },
    { name: 'PPT 客户方案', status: '等待生成', tone: 'bg-zinc-50 text-zinc-500' },
    { name: 'PDF 方案画册', status: '等待生成', tone: 'bg-zinc-50 text-zinc-500' },
  ])
  const knowledgeGaps = ref<string[]>([])

  // ---- sub-panels ----
  const activeSubPanel = ref<SubPanel>(null)
  const showMoreMenu = ref(false)

  const moreMenuItems: { id: string; label: string; desc: string; icon: string }[] = [
    { id: 'expert', label: '专家智能体', desc: '主管智能体与子智能体', icon: 'users' },
    { id: 'mcp', label: 'MCP 连接器', desc: '知识库、钉钉文档、AI表格等', icon: 'plug' },
    { id: 'skills', label: '技能 Skill', desc: '字段校验、预算分档、文案生成', icon: 'wrench' },
  ]

  const sortedConversations = computed(() =>
    [...ai.conversations.value].sort((a, b) => b.updatedAt - a.updatedAt),
  )

  function inferConversationMode(conv: Conversation): RunMode {
    if (conv.mode) return conv.mode
    return /方案|组货|导出|客户|预算/.test(conv.title) ? 'task' : 'quick'
  }

  const filteredSidebarConversations = computed(() => {
    const keyword = sidebarSearch.value.trim().toLowerCase()
    return sortedConversations.value.filter((conv) => {
      const matchKeyword = !keyword || conv.title.toLowerCase().includes(keyword)
      const matchMode = sidebarModeFilter.value === 'all' || inferConversationMode(conv) === sidebarModeFilter.value
      return matchKeyword && matchMode
    })
  })

  const sidebarGroups = computed(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startOfYesterday = startOfToday - 86400000
    const groups: { key: string; label: string; items: Conversation[] }[] = [
      { key: 'today', label: '今天', items: [] },
      { key: 'yesterday', label: '昨天', items: [] },
      { key: 'earlier', label: '更早', items: [] },
    ]
    for (const conv of filteredSidebarConversations.value) {
      if (conv.updatedAt >= startOfToday) groups[0].items.push(conv)
      else if (conv.updatedAt >= startOfYesterday) groups[1].items.push(conv)
      else groups[2].items.push(conv)
    }
    return groups.filter((g) => g.items.length > 0)
  })

  const displayConversationTitle = computed(() => {
    const title = ai.activeConversation.value?.title || '工作会话'
    return title === '新会话' || title === '工作会话' ? title : summarizeConversationTitle(title)
  })

  const gridTemplate = computed(() => {
    const left = leftCollapsed.value ? '0px' : '280px'
    const right = rightCollapsed.value ? '0px' : '300px'
    return `${left} minmax(0, 1fr) ${right}`
  })

  const charCount = computed(() => chatInput.value.length)
  const isNearLimit = computed(() => charCount.value >= warnAt)
  const isOverLimit = computed(() => charCount.value >= maxChars)

  const subPanelTitle = computed(() => {
    const key = activeSubPanel.value
    if (!key) return ''
    const map: Record<string, string> = {
      knowledge: '知识库', expert: '专家',
      mcp: 'MCP 连接器', skills: '技能 Skill',
    }
    return map[key] ?? ''
  })

  // ---- scroll ----
  function isNearBottom(el: HTMLElement) {
    return el.scrollHeight - el.scrollTop - el.clientHeight <= 50
  }
  function scrollToBottom(force = false) {
    nextTick(() => {
      const el = messagesContainer.value
      if (!el) return
      if (!force && !isAutoScroll.value) { showBackToLatest.value = true; return }
      isProgrammaticScroll.value = true
      if (force) { isAutoScroll.value = true; userScrollIntent.value = false }
      if (typeof el.scrollTo === 'function') el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      else el.scrollTop = el.scrollHeight
      showBackToLatest.value = false
      window.setTimeout(() => {
        if (force || isAutoScroll.value) el.scrollTop = el.scrollHeight
        isProgrammaticScroll.value = false
      }, 120)
    })
  }
  function handleMessagesScroll() {
    const el = messagesContainer.value
    if (!el || isTextSelecting.value) return
    if (isProgrammaticScroll.value) return
    const nearBottom = isNearBottom(el)
    if (nearBottom) { isAutoScroll.value = true; userScrollIntent.value = false; showBackToLatest.value = false }
    else if (userScrollIntent.value) { isAutoScroll.value = false }
  }
  function markUserScrollIntent() { userScrollIntent.value = true }
  function handleSelectionChange() {
    const text = window.getSelection()?.toString()
    isTextSelecting.value = Boolean(text)
    if (isTextSelecting.value) isAutoScroll.value = false
    else handleMessagesScroll()
  }

  watch(ai.activeMessages, () => scrollToBottom(), { deep: true })
  watch(streamingContent, () => scrollToBottom())
  watch(runMode, (mode) => {
    selectedAgent.value = mode === 'task' ? '组货专家' : '调研帮手'
    // 规格书模块8：离开专家模式时自动取消已选专家
    if (mode !== 'task') selectedExperts.value = []
  })

  // ---- send ----
  async function handleSend(text?: string) {
    const content = (text ?? chatInput.value).trim()
    if (!content || ai.isStreaming.value) return
    const quoted = quotedChatMessage.value
    chatInput.value = ''
    attachedFiles.value = []
    isAutoScroll.value = true
    showBackToLatest.value = false
    userScrollIntent.value = false
    thinkingCollapsed.value = false
    streamingContent.value = ''
    abortController.value = new AbortController()

    const modeLabel = modeMeta[runMode.value].label
    const modePrefix = `[${modeLabel}：${modeMeta[runMode.value].desc}]`
    const messageContent = `${modePrefix}\n${content}`

    const attachmentsSnapshot = attachedFiles.value.slice()

    if (ai.isApiConfigured()) {
      try {
        await ai.sendMessage(content, attachmentsSnapshot, {
          conversationId: ai.activeConversationId.value ?? undefined,
          onThinkingStart: () => scrollToBottom(),
          onThinkingUpdate: () => scrollToBottom(),
          onResponseStart: () => scrollToBottom(),
          onResponseChunk: (chunk: string) => {
            if (abortController.value?.signal.aborted) return
            streamingContent.value += chunk; scrollToBottom()
          },
          signal: abortController.value.signal,
        })
      } catch { /* handled */ }
      streamingContent.value = ''
    } else {
      await ai.sendMessage(content, attachmentsSnapshot, {
        conversationId: ai.activeConversationId.value ?? undefined,
        onThinkingStart: () => scrollToBottom(),
        onThinkingUpdate: () => scrollToBottom(),
      })
    }

    if (quoted && ai.activeConversation.value) {
      const sentUserMessage = [...ai.activeConversation.value.messages].reverse().find(msg => msg.role === 'user' && msg.content === messageContent)
      if (sentUserMessage) {
        messageReplyRefs.value = { ...messageReplyRefs.value, [sentUserMessage.id]: quoted.content.slice(0, 100) }
      }
    }
    quotedChatMessage.value = null

    const msgs = ai.activeConversation.value?.messages
    const lastMsg = msgs ? msgs[msgs.length - 1] : undefined
    if (lastMsg?.role === 'assistant') {
      outputArtifacts.value = [
        { name: 'Excel 组货清单', status: '已生成', tone: 'bg-emerald-50 text-emerald-700' },
        { name: 'PPT 客户方案', status: '草稿', tone: 'bg-zinc-100 text-zinc-700' },
        { name: 'PDF 方案画册', status: '待确认', tone: 'bg-amber-50 text-amber-700' },
      ]
      if (lastMsg.content.includes('知识缺口')) {
        knowledgeGaps.value = ['部分品牌最新库存及价格待确认', '建议补充SKU级尺码覆盖数据']
      }
    }
    thinkingCollapsed.value = true
    abortController.value = null
  }

  function handleStop() {
    abortController.value?.abort()
    if (streamingContent.value && ai.activeConversation.value) {
      ai.activeConversation.value.messages.push({
        id: 'msg-' + Date.now(),
        role: 'assistant',
        content: streamingContent.value + '\n\n⏹ *已停止生成*',
        timestamp: Date.now(),
      })
    }
    ai.stopStreaming()
    streamingContent.value = ''
    thinkingCollapsed.value = true
  }

  // ---- feedback ----
  function toggleFeedback(msgId: string, type: 'up' | 'down') {
    messageFeedback.value[msgId] = messageFeedback.value[msgId] === type ? null : type
  }
  function openDislikeModal(msgId: string) {
    dislikeMsgId.value = msgId
    dislikeReasons.value = []
    dislikeComment.value = ''
    showDislikeModal.value = true
  }
  function submitDislike() {
    toggleFeedback(dislikeMsgId.value, 'down')
    showDislikeModal.value = false
  }
  function openSearchDialog(mode: 'search' | 'history' = 'search') {
    searchDialogMode.value = mode
    showSearchDialog.value = true
  }
  function openTextPreview(payload: { name: string; size?: number; content?: string }) { textPreview.value = payload }
  function closeTextPreview() { textPreview.value = null }
  function closeSearchDialog() { showSearchDialog.value = false }
  function copyMessage(content: string) {
    navigator.clipboard?.writeText(content).catch(() => {})
  }
  function quoteMessage(id: string, content: string) {
    quotedChatMessage.value = { id, content }
  }
  function regenerateMessage(msgId: string) {
    if (ai.activeConversation.value) {
      const idx = ai.activeConversation.value.messages.findIndex(m => m.id === msgId)
      if (idx >= 0) { ai.activeConversation.value.messages.splice(idx); handleSend('') }
    }
  }

  // ---- conversation management ----
  function handleNewConversation() {
    const conv = ai.createConversation()
    conv.messages.push({
      id: 'welcome-' + Date.now(),
      role: 'assistant',
      content: '🐴 小马在线，有事随时说',
      timestamp: Date.now(),
    })
    chatInput.value = ''; streamingContent.value = ''
    knowledgeGaps.value = []
    outputArtifacts.value = outputArtifacts.value.map(a => ({ ...a, status: '等待生成', tone: 'bg-zinc-50 text-zinc-500' }))
  }
  function handleSwitchSession(id: string) {
    if (id === ai.activeConversationId.value) return
    renamingConversationId.value = null
    ai.switchConversation(id)
    chatInput.value = ''; streamingContent.value = ''
  }
  function handleDeleteSession(id: string) { showConfirmDelete.value = id }
  function confirmDelete() {
    if (showConfirmDelete.value) { ai.deleteConversation(showConfirmDelete.value); showConfirmDelete.value = null }
  }
  function beginRenameConversation(conv: Conversation) {
    renamingConversationId.value = conv.id
    renameDraft.value = formatConversationTitle(conv.title)
  }
  function cancelRenameConversation() { renamingConversationId.value = null; renameDraft.value = '' }
  function commitRenameConversation() {
    const id = renamingConversationId.value
    const nextTitle = renameDraft.value.trim()
    if (id && nextTitle) ai.updateConversationTitle(id, nextTitle)
    cancelRenameConversation()
  }
  function handleToggleFavorite(id: string) { ai.toggleConversationFavorite(id) }

  // ---- upload ----
  function triggerChatUpload() { chatUploadInput.value?.click() }
  function handleChatUpload(event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files || [])
    const accepted = files.filter(isSupportedUpload)
    if (!accepted.length) return
    accepted.forEach((f) => addAttachedFile({ name: f.name, ext: (f.name.split('.').pop() || 'file').toLowerCase(), size: f.size }))
    attachedFileCount.value += accepted.length
  }
  function isSupportedUpload(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    return ['pdf', 'doc', 'docx', 'md', 'txt'].includes(ext || '')
  }
  function addAttachedFile(file: ChatAttachment) {
    if (attachedFiles.value.some(f => f.name === file.name)) return
    attachedFiles.value.push(file)
  }
  function removeAttachedFile(index: number) {
    attachedFiles.value.splice(index, 1)
  }
  function handlePaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text/plain') || ''
    if (text && text.length > 200 && !e.clipboardData?.files?.length) {
      e.preventDefault()
      const name = `粘贴文本-${new Date().toISOString().slice(0, 10)}.txt`
      addAttachedFile({ name, ext: 'txt', size: text.length })
      // notify via toast
      import('vue-sonner').then(({ toast }) => toast.info('已粘贴为文本文件', { description: name }))
    }
  }

  // ---- input ----
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isOverLimit.value) handleSend() }
    if (e.key === 'Escape') { (e.target as HTMLTextAreaElement)?.blur() }
  }
  function handleInput(e: Event) {
    const el = e.target as HTMLTextAreaElement
    if (isOverLimit.value) {
      el.value = el.value.slice(0, maxChars)
      chatInput.value = el.value
    }
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  // ---- sub-panels ----
  function openSubPanel(panel: string) {
    activeSubPanel.value = activeSubPanel.value === panel ? null : (panel as SubPanel)
    showMoreMenu.value = false
  }
  function closeSubPanel() { activeSubPanel.value = null }

  // ---- upload modal ----
  function openUploadModal() { showUploadModal.value = true; localFiles.value = [] }
  function closeUploadModal() { showUploadModal.value = false }
  function confirmLocalUpload() {
    localFiles.value.forEach((f) => addAttachedFile(f))
    attachedFileCount.value += localFiles.value.length
    closeUploadModal()
  }
  function toggleKbFile(file: KbFile) {
    const idx = localFiles.value.findIndex(f => f.name === file.name)
    if (idx >= 0) localFiles.value.splice(idx, 1)
    else localFiles.value.push({ name: file.name, ext: file.type, size: parseInt(file.size) || 0 })
  }
  function isKbSelected(id: string) {
    const f = kbFiles.value.find(k => k.id === id)
    return !!f && localFiles.value.some(l => l.name === f.name)
  }
  function confirmKbUpload() {
    localFiles.value.forEach((f) => addAttachedFile(f))
    attachedFileCount.value += localFiles.value.length
    closeUploadModal()
  }

  // ---- experts ----
  function toggleExpert(expert: Expert) {
    const idx = selectedExperts.value.findIndex(e => e.id === expert.id)
    if (idx >= 0) selectedExperts.value.splice(idx, 1)
    else selectedExperts.value.push(expert)
  }
  function removeExpert(id: string) {
    selectedExperts.value = selectedExperts.value.filter(e => e.id !== id)
  }
  function applyExpertPrompt(expert: Expert, prompt: string) {
    chatInput.value = prompt
    selectedExperts.value = [expert]
    nextTick(() => {
      const el = document.querySelector('textarea')
      if (el) (el as HTMLTextAreaElement).dispatchEvent(new Event('input'))
    })
  }
  // ---- helpers ----
  function elide(text: string, max: number) { return text.length > max ? text.slice(0, max) + '...' : text }
  function formatConversationTitle(title: string) { return title === '新会话' ? title : summarizeConversationTitle(title) }
  function formatTime(ts: number): string {
    const d = new Date(ts); const now = new Date(); const diff = now.getTime() - d.getTime()
    if (diff < 60_000) return '刚刚'
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}分前`
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}时前`
    return d.toLocaleDateString('zh-CN')
  }
  function getLastThinking(msg: ChatMessage): ThinkingStep[] | undefined { return msg.thinking }

  function renderMarkdown(text: string): string {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1 text-zinc-900">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2 text-zinc-900">$1</h2>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="break-words rounded bg-zinc-100 px-1 py-0.5 font-mono text-[13px]">$1</code>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>')
      .replace(/---/g, '<hr class="my-2 border-zinc-200"/>')
      .replace(/\|(.+)\|/g, (_: string) => {
        const cells = _.split('|').filter(c => c.trim())
        if (cells.some(c => c.includes('---'))) return ''
        return '<div class="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(90px,1fr))] gap-2 overflow-x-auto py-1 text-[13px] leading-5">' + cells.map(c => `<span class="min-w-0 break-words rounded bg-zinc-50 px-2 py-1">${c.trim()}</span>`).join('') + '</div>'
      })
  }

  // ---- init ----
  onMounted(async () => {
    document.addEventListener('selectionchange', handleSelectionChange)
    const q = route.query.q
    const source = route.query.source
    if (q && source === 'home') {
      router.replace({ name: 'workspace-chat' })
      await nextTick()
      handleSend(String(q))
    } else if (!ai.activeConversationId.value && ai.conversations.value.length === 0) {
      const conv = ai.createConversation()
      conv.messages.push({
        id: 'welcome',
        role: 'assistant',
        content: `🐴 **小马在线，有事随时说**\n\n当前为 **${modeMeta[runMode.value].label}**：${modeMeta[runMode.value].desc}。\n\n你可以直接提问、上传文件、让我搜索最新信息，或者切换到专家模式做复杂方案。`,
        timestamp: Date.now(),
      })
    }
  })
  onBeforeUnmount(() => {
    document.removeEventListener('selectionchange', handleSelectionChange)
  })

  const controller: ChatController = {
    chatInput, quotedChatMessage, messageReplyRefs, memoryEnabled, sidebarSearch, sidebarModeFilter,
    runMode, attachedFileCount, leftCollapsed, rightCollapsed, thinkingCollapsed, messagesContainer,
    isAutoScroll, showBackToLatest, abortController, streamingContent, showConfirmDelete,
    renamingConversationId, renameDraft, showDislikeModal, dislikeMsgId, dislikeReasons, dislikeComment,
    messageFeedback, uploadedFiles, selectedAgent, selectedKnowledgeRefs, referenceFiles, outputArtifacts,
    knowledgeGaps, activeSubPanel, showMoreMenu, showSearchDialog, searchDialogMode, textPreview,
    attachedFiles, maxChars, warnAt, selectedExperts, showUploadModal, uploadTab,
    localFiles, kbFiles, kbSearch, kbTypeFilter, kbFolders, kbCurrentFolder, kbPage, kbBreadcrumb, kbPageTotal, kbPageFiles, kbFilteredAll, kbSelectedCount, networkOn, experts, knowledgeBases, mcpConnections, skillsList, moreMenuItems, modeMeta,
    agentOptions, agentSelectLabel,
    sortedConversations, filteredSidebarConversations, displayConversationTitle, gridTemplate,
    sidebarGroups, charCount, isNearLimit, isOverLimit, subPanelTitle,
    handleSend, handleStop, toggleFeedback, openDislikeModal, submitDislike, openSearchDialog, closeSearchDialog, copyMessage, quoteMessage,
    regenerateMessage, handleNewConversation, handleSwitchSession, handleDeleteSession, confirmDelete,
    beginRenameConversation, cancelRenameConversation, commitRenameConversation, handleToggleFavorite,
    triggerChatUpload, handleChatUpload, isSupportedUpload, addAttachedFile, removeAttachedFile, handlePaste,
    onKeydown, handleInput, scrollToBottom, handleMessagesScroll, markUserScrollIntent, handleSelectionChange,
    formatConversationTitle, formatTime, getLastThinking, renderMarkdown, elide,
    openSubPanel, closeSubPanel,
    openUploadModal, closeUploadModal, toggleExpert, removeExpert, applyExpertPrompt, openTextPreview, closeTextPreview,
    confirmLocalUpload, toggleKbFile, isKbSelected, confirmKbUpload, selectKbFolder, changeKbPage,
  }

  provide(CHAT_KEY, controller)
  return controller
}

export function useChatController(): ChatController {
  const ctrl = inject(CHAT_KEY)
  if (!ctrl) throw new Error('ChatController not provided')
  return ctrl
}
