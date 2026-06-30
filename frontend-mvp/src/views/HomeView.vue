<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ArrowUp,
  Bot,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Folder,
  Globe2,
  History,
  LayoutGrid,
  Link2,
  Loader2,
  PanelTop,
  Paperclip,
  Pencil,
  Pin,
  Plus,
  Quote,
  Search,
  SendHorizontal,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
  Zap,
} from 'lucide-vue-next'

type RunMode = 'quick' | 'task'
type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  workDuration?: string
  processEvents?: ProcessEvent[]
}
type ProcessEvent = {
  id: string
  phase: 'analysis' | 'plan' | 'step' | 'reflection' | 'final'
  label: string
  action?: string
  target?: string
  summary: string
  detail: string
  status: 'done' | 'active' | 'adjusted'
}
type ConversationItem = {
  id: string
  title: string
  time: string
  mode: '日常办公' | '专家模式'
  pinned: boolean
}
type IntentRoute = 'greeting' | 'office-rag' | 'expert-task'
type CaseItem = {
  title: string
  icon?: unknown
  desc: string
  prompt: string
  kb?: string
}
type ActiveReference = {
  title: string
  mode: string
  agent: string
  kb: string
  desc: string
}

const query = ref('')
const runMode = ref<RunMode>('quick')
const webSearchEnabled = ref(true)
const selectedAgent = ref('research')
const showRecommendations = ref(false)
const showHistory = ref(false)
const isChatActive = ref(false)
const isThinking = ref(false)
const generationInterrupted = ref(false)
const isRightPanelCollapsed = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const composer = ref<HTMLTextAreaElement | null>(null)
const messageList = ref<HTMLElement | null>(null)
const selectedFiles = ref<string[]>([])
const showUploadTip = ref(false)
const uploadHintText = '支持 PDF、Word、Excel、PPT、TXT、PNG、JPG，单个文件 20MB 内'
const messages = ref<Message[]>([])
const feedbackByMessage = ref<Record<string, 'up' | 'down' | undefined>>({})
const copiedMessageId = ref('')
const quotedMessageId = ref('')
const hasGeneratedAssets = ref(false)
const activeReference = ref<ActiveReference | null>(null)
const selectedKnowledgeRefs = ref<ActiveReference[]>([])
const expandedProcessEventIds = ref<string[]>([])
const editingConversationId = ref('')
const editingConversationTitle = ref('')
const activeConversationTitle = ref('新会话')
const isAutoScroll = ref(true)
const showBackToLatest = ref(false)
const isTextSelecting = ref(false)
const isProgrammaticScroll = ref(false)
const userScrollIntent = ref(false)
let generationToken = 0
const generationDelayFactor = import.meta.env.MODE === 'test' ? 0.001 : 1

const solutionProcessEvents: ProcessEvent[] = [
  {
    id: 'analysis',
    phase: 'analysis',
    label: '小马理解需求',
    summary: '明确目标、约束与交付标准',
    detail: '小马识别到这是专家模式任务：需要生成团购方案，并沉淀可导出的 Excel 组货清单、PPT 客户方案和 PDF 方案画册。\n约束条件：总预算、品类偏好、客户现场沟通速度优先；缺失字段需要先标注待确认。',
    status: 'done',
  },
  {
    id: 'plan',
    phase: 'plan',
    label: '小马制定计划',
    summary: '拆成需求校验、方案匹配、产物生成、结果整合',
    detail: '小马采用 Plan-and-Execute：\n1. 校验预算、品类、客户类型与交付时间。\n2. 调用知识库和方案匹配工具检索相似案例。\n3. 按保守档、均衡档、品质档组织内容。\n4. 生成产物并把引用、文件同步到右侧资产栏。\n5. 整合为可直接发给业务的 Markdown 回答。',
    status: 'done',
  },
  {
    id: 'kb',
    phase: 'step',
    label: '小马查阅知识库',
    action: '调用知识库',
    target: '方案中心案例库',
    summary: '读取成功案例和预算池',
    detail: '召回「运动鞋团购成功案例.md」与「团购通用预算池.xlsx」，用于支撑预算分档、SKU 组合策略和门店话术。',
    status: 'done',
  },
  {
    id: 'tool',
    phase: 'step',
    label: '小马调用工具',
    action: '调用工具',
    target: 'search_solution / calculate_budget',
    summary: '匹配到 5 个可复用方案',
    detail: '参数摘要：场景=团购，品类=运动鞋，预算=10万，方案类型=成功案例+专项方案。\n观察结果：命中 5 个候选方案，其中 3 个适合当前预算和交付周期。\n工具返回后小马继续复核预算分档，避免直接照搬工具结果。',
    status: 'done',
  },
  {
    id: 'web',
    phase: 'step',
    label: '小马查看网页',
    action: '搜索网络资料',
    target: '行业案例',
    summary: '补充近期团购沟通口径',
    detail: '查看网页：钉钉开放平台能力说明、近期团购公开案例、行业资讯页。\n联网搜索用于补充当前行业趋势和表达方式；所有网络信息仅作为话术参考，不替代内部方案池依据。',
    status: 'done',
  },
  {
    id: 'reflection',
    phase: 'reflection',
    label: '小马复核计划',
    summary: '原计划可继续执行，无需插入新步骤',
    detail: '方案数量、引用来源和产物类型均满足本轮交付标准；品牌库存和实时价格仍需业务确认，已记录为知识缺口并同步右侧资产栏。',
    status: 'done',
  },
  {
    id: 'final',
    phase: 'final',
    label: '小马整理交付',
    action: '生成产物',
    target: '方案交付物',
    summary: '整合为 Markdown 回答并准备导出文件',
    detail: '已将需求校验、匹配结果、引用来源和产物入口整合为最终回答；Excel/PPT/PDF 作为会话产物进入右侧资产栏。',
    status: 'done',
  },
]

const quickProcessEvents: ProcessEvent[] = [
  {
    id: 'office-intent',
    phase: 'analysis',
    label: '小马理解需求',
    action: '识别意图',
    target: '日常办公 RAG',
    summary: '判断为日常办公任务',
    detail: '小马先判断用户意图，再决定是否调用知识库和网络搜索；此模式不会进入多步骤专家工作流。',
    status: 'done',
  },
  {
    id: 'office-kb',
    phase: 'step',
    label: '小马查阅资料',
    action: '调用知识库',
    target: '集团制度知识库 / 方案中心案例库',
    summary: '召回相关制度、案例和字段模板',
    detail: '查看文件：员工手册2026版.docx、运动鞋团购成功案例.md、方案中心字段模板.xlsx。\n小马只抽取与当前问题相关的片段，避免把整份文档塞进上下文。',
    status: 'done',
  },
  {
    id: 'office-web',
    phase: 'step',
    label: '小马搜索信息',
    action: '搜索网络资料',
    target: '公开网页',
    summary: '补充外部背景信息',
    detail: '查看网页：钉钉开放平台文档、行业资讯页面、公开案例页面。\n网络资料只作为补充参考，最终回答优先引用内部知识库。',
    status: 'done',
  },
  {
    id: 'office-final',
    phase: 'final',
    label: '小马整理回答',
    summary: '整合为可直接阅读的回答',
    detail: '小马将意图识别、知识库片段和网络资料合并，生成简洁回答，并保留引用入口。',
    status: 'done',
  },
]

const greetingProcessEvents: ProcessEvent[] = [
  {
    id: 'greeting-intent',
    phase: 'analysis',
    label: '小马理解需求',
    action: '识别意图',
    target: '轻量对话',
    summary: '识别为寒暄闲聊',
    detail: '用户输入属于纯寒暄，没有明确的信息检索、知识库查询、联网搜索或交付物诉求。小马直接走轻量对话链路，不触发 RAG、P&E、MCP 或任何工具调用。',
    status: 'done',
  },
  {
    id: 'greeting-answer',
    phase: 'final',
    label: '小马直接回复',
    summary: '无需调用工具',
    detail: 'Function Calling 工具必要性判断未命中任何工具；检索必要性校验也判定无需查知识库或网络资料。',
    status: 'done',
  },
]

const conversations = ref<ConversationItem[]>([
  { id: 'conv-1', title: 'B2B团购组货方案', time: '12分钟前', mode: '专家模式', pinned: true },
  { id: 'conv-2', title: '客户A福利方案优化', time: '昨天', mode: '专家模式', pinned: false },
  { id: 'conv-3', title: '考勤制度问答', time: '周二', mode: '日常办公', pinned: false },
  { id: 'conv-4', title: '门店需求字段表', time: '06-18', mode: '专家模式', pinned: false },
])

const officeAgents = [
  { value: 'research', label: '调研帮手', desc: '搜索资料、汇总重点、生成调研提纲' },
  { value: 'dingtalk', label: '钉钉助理', desc: '日程、待办、文档和表格快捷处理' },
  { value: 'knowledge', label: '知识顾问', desc: '查询制度、流程、产品资料并给出引用' },
  { value: 'writing', label: '写作助理', desc: '润色文案、生成报告、整理纪要' },
]

const expertAgents = [
  { value: 'solution', label: '组货专家', desc: '方案匹配、组货清单和客户交付物生成' },
  { value: 'soon', label: '敬请期待', desc: '更多专家即将上线' },
]

const quickCases: CaseItem[] = [
  {
    title: '查知识库',
    icon: Database,
    desc: '查制度、流程、产品资料',
    prompt: '小马帮我查知识库里的考勤规定，并标出引用来源。',
    kb: '集团制度知识库',
  },
  {
    title: '搜行业动态',
    icon: Globe2,
    desc: '联网搜索并汇总重点',
    prompt: '小马搜一下最新的行业动态，整理成3条对方案中心有用的信息。',
    kb: '外部公开资料',
  },
  {
    title: '生成分析报告',
    icon: FileText,
    desc: '把材料整理成结构化内容',
    prompt: '小马生成一份分析报告，包含背景、关键发现、建议动作。',
    kb: '经营分析知识库',
  },
]

const dingtalkCases: CaseItem[] = [
  {
    title: '定日程',
    icon: CalendarDays,
    desc: '安排会议并同步日程',
    prompt: '帮我在明天下午3点安排一场方案评审会，时长1小时，参会人：张明、李娟。',
    kb: '钉钉办公助手',
  },
  {
    title: '创建AI表格',
    icon: FileSpreadsheet,
    desc: '把清单整理成结构化表格',
    prompt: '将方案中的SPU/SKU清单转为AI表格结构，字段包含品类、数量、价格带、推荐理由。',
    kb: '钉钉AI表格模板',
  },
  {
    title: '创建待办',
    icon: CheckCircle2,
    desc: '沉淀执行项与负责人',
    prompt: '将方案执行步骤生成钉钉待办清单，每项设置负责人和截止时间。',
    kb: '钉钉待办规则',
  },
]

const solutionCases: CaseItem[] = [
  {
    title: 'B2B线下团购方案',
    desc: '预算10万，运动鞋类目，输出三档组合。',
    prompt: '帮我给B2B线下客户出一版团购方案。已知：总预算10万，偏运动鞋类目，客户在门店等待，需要先给一版可沟通初稿。请先列出必须追问字段，再按保守档、均衡档、品质档输出组货方案。',
    kb: '方案中心案例库',
  },
  {
    title: '门店需求采集',
    desc: '把客户口述需求整理成标准字段。',
    prompt: '请把门店客户的团购需求整理成标准字段表。字段包括客户类型、数量、预算范围、活动场景、品类需求、品牌偏好、交付时间、风险备注。',
    kb: '方案中心字段模板',
  },
  {
    title: '成功案例复用',
    desc: '匹配案例池并给出引用依据。',
    prompt: '请基于方案中心成功案例池，帮我匹配适合运动鞋团购的相似案例，并说明适用条件、引用依据和可复用话术。',
    kb: '成功案例池',
  },
]

const hasSessionAssets = computed(() => selectedFiles.value.length > 0 || hasGeneratedAssets.value || selectedKnowledgeRefs.value.length > 0)
const rightPanelVisible = computed(() => hasSessionAssets.value && !isRightPanelCollapsed.value)
const sortedConversations = computed(() => [...conversations.value].sort((a, b) => Number(b.pinned) - Number(a.pinned)))
const pinnedConversations = computed(() => sortedConversations.value.filter((item) => item.pinned))
const regularConversations = computed(() => sortedConversations.value.filter((item) => !item.pinned))
const currentAgentOptions = computed(() => (runMode.value === 'quick' ? officeAgents : expertAgents))
const currentAgentLabel = computed(() => currentAgentOptions.value.find((agent) => agent.value === selectedAgent.value)?.label ?? '')
const visibleCases = computed(() => (runMode.value === 'task' ? solutionCases : [...quickCases, ...dingtalkCases]))
const caseTitle = computed(() => (runMode.value === 'task' ? `${currentAgentLabel.value}推荐案例` : `${currentAgentLabel.value}推荐案例`))
const placeholder = computed(() =>
  runMode.value === 'quick'
    ? `${currentAgentLabel.value || '助理'}在线，试试提问或上传文件吧`
    : `${currentAgentLabel.value || '专家'}已就绪，说说具体任务目标吧`,
)
const modeLabel = computed(() => runMode.value === 'quick' ? '日常办公' : '专家模式')
const agentSelectLabel = computed(() => runMode.value === 'quick' ? '助理' : '专家')
const chatTitle = computed(() => activeConversationTitle.value || '新会话')
const contextPercent = computed(() => {
  const messageText = messages.value.reduce((total, message) => total + message.content.length, 0)
  const draftText = query.value.length
  const fileLoad = selectedFiles.value.length * 8
  return Math.min(92, Math.round(18 + messageText / 80 + draftText / 120 + fileLoad))
})
const contextRingStyle = computed(() => ({
  background: `conic-gradient(#f97316 ${contextPercent.value * 3.6}deg, #e4e4e7 0deg)`,
}))
const chatShellStyle = computed(() => ({
  '--left-inset': isChatActive.value && showHistory.value ? 'clamp(286px,21vw,400px)' : '0px',
  '--right-inset': rightPanelVisible.value ? 'clamp(286px,21vw,400px)' : '0px',
  width: 'min(calc(100vw - var(--left-inset) - var(--right-inset) - clamp(36px,5vw,88px)), clamp(760px,74vw,1320px))',
  transform: 'translateX(calc((var(--left-inset) - var(--right-inset)) / 2))',
}))

function selectMode(mode: RunMode) {
  runMode.value = mode
  selectedAgent.value = mode === 'quick' ? 'research' : 'solution'
  showRecommendations.value = true
}

function createReferenceFromCase(item: CaseItem, mode: RunMode): ActiveReference {
  const nextMode = mode === 'quick' ? '日常办公' : '专家模式'
  const agent = currentAgentOptions.value.find((option) => option.value === selectedAgent.value)?.label
    ?? (mode === 'quick' ? '调研帮手' : '组货专家')
  return {
    title: item.title,
    mode: nextMode,
    agent,
    kb: item.kb ?? (mode === 'quick' ? '办公知识库' : '方案中心知识库'),
    desc: item.desc,
  }
}

async function fillPrompt(item: CaseItem | string, mode: RunMode = runMode.value) {
  selectMode(mode)
  if (typeof item === 'string') {
    query.value = item
  } else {
    query.value = item.prompt
    activeReference.value = createReferenceFromCase(item, mode)
    selectedKnowledgeRefs.value = [activeReference.value]
    hasGeneratedAssets.value = true
    isRightPanelCollapsed.value = false
  }
  await nextTick()
  resizeComposer()
}

function triggerFilePicker() {
  fileInput.value?.click()
}

function handleFiles(event: Event) {
  const files = Array.from((event.target as HTMLInputElement).files || [])
  selectedFiles.value = [...selectedFiles.value, ...files.filter(isSupportedUpload).map((file) => file.name)]
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1)
}

function handlePaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items
  if (!items) return
  for (const item of Array.from(items)) {
    if (item.type !== 'image/png' && item.type !== 'image/jpeg') continue
    event.preventDefault()
    selectedFiles.value.push(`paste-image-${Date.now()}.png`)
  }
}

function isSupportedUpload(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg'].includes(ext || '')
}

function resizeComposer() {
  const el = composer.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 168)}px`
}

async function scrollToLatest(force = false) {
  await nextTick()
  await new Promise((resolve) => window.requestAnimationFrame(resolve))
  const el = messageList.value
  if (!el) return
  if (!force && !isAutoScroll.value) {
    showBackToLatest.value = true
    return
  }
  isProgrammaticScroll.value = true
  if (force) {
    isAutoScroll.value = true
    userScrollIntent.value = false
  }
  if (typeof el.scrollTo === 'function') el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  else el.scrollTop = el.scrollHeight
  showBackToLatest.value = false
  await new Promise((resolve) => window.requestAnimationFrame(resolve))
  if (force || isAutoScroll.value) el.scrollTop = el.scrollHeight
  window.setTimeout(() => { isProgrammaticScroll.value = false }, 120)
}

function isNearBottom(el: HTMLElement) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= 50
}

function handleMessageScroll() {
  const el = messageList.value
  if (!el || isTextSelecting.value) return
  if (isProgrammaticScroll.value) {
    showBackToLatest.value = false
    return
  }
  const nearBottom = isNearBottom(el)
  if (nearBottom) {
    isAutoScroll.value = true
    userScrollIntent.value = false
    showBackToLatest.value = false
    return
  }
  if (userScrollIntent.value) {
    isAutoScroll.value = false
  }
}

function handleSelectionChange() {
  const selectedText = window.getSelection()?.toString()
  isTextSelecting.value = Boolean(selectedText)
  if (isTextSelecting.value) isAutoScroll.value = false
  else handleMessageScroll()
}

function markUserScrollIntent() {
  userScrollIntent.value = true
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms * generationDelayFactor))
}

function classifyIntent(content: string, hasFiles = false): IntentRoute {
  const normalized = content.trim().replace(/[!！。.\s]/g, '')
  const greetingPatterns = ['你好', '您好', '嗨', 'hi', 'hello', '哈喽', '在吗', '谢谢', '感谢', '再见', '拜拜', '你是谁']
  if (!hasFiles && greetingPatterns.some((item) => normalized.toLowerCase() === item.toLowerCase())) {
    return 'greeting'
  }

  const expertKeywords = ['方案', '团购', '组货', '导出', 'excel', 'ppt', 'pdf', '待办', '钉钉', '生成文件', '客户', '预算', '交付物']
  const ragKeywords = ['查', '搜索', '搜', '知识库', '资料', '制度', '流程', '新闻', '行业', '规定', '文档', '报告']
  if (runMode.value === 'task' && expertKeywords.some((keyword) => content.toLowerCase().includes(keyword.toLowerCase()))) {
    return 'expert-task'
  }
  if (ragKeywords.some((keyword) => content.toLowerCase().includes(keyword.toLowerCase()))) {
    return 'office-rag'
  }
  return runMode.value === 'task' && hasFiles ? 'expert-task' : 'greeting'
}

function getGenerationEvents(route: IntentRoute) {
  if (route === 'greeting') return greetingProcessEvents
  return route === 'expert-task' ? solutionProcessEvents : quickProcessEvents
}

function getGenerationChunks(route: IntentRoute) {
  if (route === 'greeting') {
    return [
      '你好，我是小马。有什么需要我帮你处理的，直接告诉我就行。',
    ]
  }
  if (route === 'office-rag') {
    return [
      '## 日常办公整理结果\n\n',
      '1. 已整理出当前问题的关键结论，并优先参考内部知识库内容。\n',
      '2. 相关制度、案例或外部背景会在引用区保留来源，方便继续追溯。\n',
      '3. 如果后续需要导出文件、创建待办或跨系统执行，可以切换到专家模式继续处理。',
    ]
  }
  return [
    '## B2B线下团购方案初稿\n\n',
    '### 一、需要先确认的字段\n',
    '客户类型、预算上限、交付时间、品牌偏好、是否需要门店现场快速沟通。\n\n',
    '### 二、当前推荐路径\n',
    '1. 保守档：优先控制预算，选择基础款和高周转 SKU。\n',
    '2. 均衡档：兼顾品牌感和数量，适合大多数团购客户。\n',
    '3. 品质档：提升单品质感，适合客户重视员工体验的场景。\n\n',
    '### 三、交付建议\n',
    '- 先用均衡档作为客户现场沟通初稿，保留保守档作为压预算备选。\n',
    '- 品质档适合客户重视员工体验、愿意提高单品预算的场景。\n',
    '- Excel 组货清单、PPT 客户方案和 PDF 方案画册已进入右侧会话产物栏。',
  ]
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderMarkdown(value: string) {
  const lines = escapeHtml(value).split('\n')
  const html: string[] = []
  let inList = false

  const closeList = () => {
    if (inList) {
      html.push('</ul>')
      inList = false
    }
  }

  for (const line of lines) {
    if (!line.trim()) {
      closeList()
      html.push('<br />')
      continue
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      closeList()
      const level = heading[1].length
      html.push(`<h${level}>${heading[2]}</h${level}>`)
      continue
    }
    const bullet = line.match(/^-\s+(.+)$/)
    if (bullet) {
      if (!inList) {
        html.push('<ul>')
        inList = true
      }
      html.push(`<li>${bullet[1]}</li>`)
      continue
    }
    closeList()
    html.push(`<p>${line}</p>`)
  }
  closeList()
  return html.join('')
}

function runningEvent(event: ProcessEvent): ProcessEvent {
  const summaryMap: Record<string, string> = {
    web: '小马正在帮你搜索相关信息...',
    kb: '小马正在查阅知识库...',
    tool: '小马正在调用方案工具...',
    final: '小马正在整理最终方案...',
  }
  return {
    ...event,
    status: 'active',
    summary: summaryMap[event.id] ?? '小马正在工作中...',
  }
}

function summarizeDraftTitle(content: string) {
  if (classifyIntent(content) === 'greeting') return '轻量问候'
  if (content.includes('团购')) return 'B2B团购组货方案'
  if (content.includes('考勤')) return '考勤制度问答'
  if (content.includes('待办')) return '钉钉待办创建'
  const compact = content.replace(/\s+/g, '').slice(0, 12)
  return compact || '新会话'
}

async function sendMessage() {
  if (isThinking.value) return
  const content = query.value.trim()
  if (!content && selectedFiles.value.length === 0) return

  const token = ++generationToken
  generationInterrupted.value = false
  isChatActive.value = true
  showHistory.value = true
  showRecommendations.value = false
  isAutoScroll.value = true
  showBackToLatest.value = false
  userScrollIntent.value = false
  messages.value.push({
    id: `user-${Date.now()}`,
    role: 'user',
    content: content || `已上传 ${selectedFiles.value.length} 个附件，请先解析并总结。`,
  })
  activeConversationTitle.value = summarizeDraftTitle(content)
  query.value = ''
  resizeComposer()
  isThinking.value = true
  await scrollToLatest(true)

  const route = classifyIntent(content, selectedFiles.value.length > 0)
  const shouldUseSolutionFlow = route === 'expert-task'
  const assistantId = `assistant-${Date.now()}`
  messages.value.push({
    id: assistantId,
    role: 'assistant',
    workDuration: route === 'greeting' ? '1 秒' : shouldUseSolutionFlow ? '16 秒' : '12 秒',
    processEvents: [],
    content: '',
  })
  await scrollToLatest()

  if (shouldUseSolutionFlow) {
    hasGeneratedAssets.value = true
    isRightPanelCollapsed.value = false
  }

  const events = getGenerationEvents(route)
  const eventDelay = route === 'greeting' ? 450 : shouldUseSolutionFlow ? 1450 : 1700
  for (const event of events) {
    if (token !== generationToken || generationInterrupted.value) break
    const message = messages.value.find((item) => item.id === assistantId)
    if (message) message.processEvents = [...(message.processEvents ?? []), runningEvent(event)]
    await scrollToLatest()
    await delay(eventDelay)
    const doneMessage = messages.value.find((item) => item.id === assistantId)
    if (doneMessage) {
      doneMessage.processEvents = (doneMessage.processEvents ?? []).map((item) => (
        item.id === event.id ? event : item
      ))
    }
    await scrollToLatest()
  }

  const chunks = getGenerationChunks(route)
  for (const chunk of chunks) {
    if (token !== generationToken || generationInterrupted.value) break
    await delay(route === 'greeting' ? 350 : shouldUseSolutionFlow ? 850 : 700)
    const message = messages.value.find((item) => item.id === assistantId)
    if (message) message.content += chunk
    await scrollToLatest()
  }

  if (generationInterrupted.value) {
    const message = messages.value.find((item) => item.id === assistantId)
    if (message) message.content += '\n\n小马已停止生成，你可以调整需求后发起新任务。'
  }
  if (token === generationToken) {
    isThinking.value = false
    await scrollToLatest()
    const el = messageList.value
    showBackToLatest.value = Boolean(el && !isNearBottom(el))
  }
}

function getProcessEventKey(messageId: string, eventId: string) {
  return `${messageId}:${eventId}`
}

function isProcessEventExpanded(messageId: string, eventId: string) {
  return expandedProcessEventIds.value.includes(getProcessEventKey(messageId, eventId))
}

function toggleProcessEvent(messageId: string, eventId: string) {
  const key = getProcessEventKey(messageId, eventId)
  expandedProcessEventIds.value = expandedProcessEventIds.value.includes(key)
    ? expandedProcessEventIds.value.filter((id) => id !== key)
    : [...expandedProcessEventIds.value, key]
}

function pauseThinking() {
  generationInterrupted.value = true
  generationToken += 1
  isThinking.value = false
}

function setFeedback(messageId: string, value: 'up' | 'down') {
  feedbackByMessage.value = {
    ...feedbackByMessage.value,
    [messageId]: feedbackByMessage.value[messageId] === value ? undefined : value,
  }
}

// Dislike modal
const showDislikeModal = ref(false)
const dislikeMsgId = ref('')
const dislikeReasons = ref<string[]>([])
const dislikeComment = ref('')
const DISLIKE_OPTIONS = ['匹配不准', '内容有误', '答非所问', '格式问题', '其他']

function openDislikeModal(msgId: string) {
  dislikeMsgId.value = msgId
  dislikeReasons.value = []
  dislikeComment.value = ''
  showDislikeModal.value = true
}
function submitDislike() {
  setFeedback(dislikeMsgId.value, 'down')
  showDislikeModal.value = false
}

async function copyAnswer(message: Message) {
  copiedMessageId.value = message.id
  try {
    await navigator.clipboard?.writeText(message.content)
  } catch {
    // Mock prototype fallback: state feedback is enough when clipboard is unavailable in tests.
  }
}

function quoteAnswer(message: Message) {
  quotedMessageId.value = message.id
  query.value = `引用上一条回答继续：${message.content.slice(0, 60)}...`
  nextTick(() => composer.value?.focus())
}

function resetConversationDraft() {
  generationInterrupted.value = false
  generationToken += 1
  isThinking.value = false
  messages.value = []
  query.value = ''
  selectedFiles.value = []
  hasGeneratedAssets.value = false
  activeReference.value = null
  selectedKnowledgeRefs.value = []
  isRightPanelCollapsed.value = false
  selectedAgent.value = 'research'
  runMode.value = 'quick'
  activeConversationTitle.value = '新会话'
  showRecommendations.value = false
  isAutoScroll.value = true
  showBackToLatest.value = false
  userScrollIntent.value = false
  feedbackByMessage.value = {}
  copiedMessageId.value = ''
  quotedMessageId.value = ''
  expandedProcessEventIds.value = []
}

async function newTask() {
  resetConversationDraft()
  isChatActive.value = true
  showHistory.value = true
  await nextTick()
  composer.value?.focus()
}

function openConversation(item: ConversationItem) {
  isChatActive.value = true
  showHistory.value = true
  activeConversationTitle.value = item.title
  runMode.value = item.mode === '专家模式' ? 'task' : 'quick'
  selectedAgent.value = item.mode === '专家模式' ? 'solution' : 'research'
  hasGeneratedAssets.value = item.mode === '专家模式'
  isRightPanelCollapsed.value = item.mode !== '专家模式'
  messages.value = [
    {
      id: `history-user-${item.id}`,
      role: 'user',
      content: item.mode === '专家模式' ? '继续这版团购方案，帮我看还有哪些字段要补。' : '继续刚才的问题。',
    },
    {
      id: `history-assistant-${item.id}`,
      role: 'assistant',
      workDuration: item.mode === '专家模式' ? '16 秒' : '12 秒',
      processEvents: item.mode === '专家模式' ? solutionProcessEvents.slice(0, 4) : quickProcessEvents,
      content: item.mode === '专家模式'
        ? `${item.title} 已载入。当前方案可以继续补充预算、交付时间、品牌偏好和产物格式。`
        : `${item.title} 已载入，可以继续追问或补充文件。`,
    },
  ]
  nextTick(() => { void scrollToLatest() })
}

function toggleConversationPinned(id: string) {
  conversations.value = conversations.value.map((item) => (
    item.id === id ? { ...item, pinned: !item.pinned } : item
  ))
}

function beginRenameConversation(item: ConversationItem) {
  editingConversationId.value = item.id
  editingConversationTitle.value = item.title
}

function commitRenameConversation(id: string) {
  const title = editingConversationTitle.value.trim()
  if (title) {
    conversations.value = conversations.value.map((item) => (
      item.id === id ? { ...item, title } : item
    ))
  }
  editingConversationId.value = ''
  editingConversationTitle.value = ''
}

function deleteConversation(id: string) {
  conversations.value = conversations.value.filter((item) => item.id !== id)
  if (editingConversationId.value === id) {
    editingConversationId.value = ''
    editingConversationTitle.value = ''
  }
}

function resetToHome() {
  isChatActive.value = false
  showHistory.value = false
  resetConversationDraft()
}

onMounted(() => {
  window.addEventListener('tianma:home-reset', resetToHome)
  document.addEventListener('selectionchange', handleSelectionChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('tianma:home-reset', resetToHome)
  document.removeEventListener('selectionchange', handleSelectionChange)
  generationToken += 1
})
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] bg-[#f6f7f9] text-zinc-950 md:min-h-[calc(100vh-4rem)]">
    <Teleport to="#app-header-left-control">
      <button
        type="button"
        data-testid="home-sidebar-toggle"
        class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
        :aria-label="showHistory ? '收起历史对话栏' : '展开历史对话栏'"
        @click="showHistory = !showHistory"
      >
        <ChevronLeft v-if="showHistory" class="h-4 w-4" />
        <ChevronsRight v-else class="h-4 w-4" />
      </button>
    </Teleport>
    <Teleport to="#app-header-right-control">
      <button
        v-if="hasSessionAssets"
        class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
        :aria-label="isRightPanelCollapsed ? '展开资产栏' : '折叠资产栏'"
        @click="isRightPanelCollapsed = !isRightPanelCollapsed"
      >
        <ChevronsLeft v-if="isRightPanelCollapsed" class="h-4 w-4" />
        <ChevronRight v-else class="h-4 w-4" />
      </button>
    </Teleport>
    <div class="relative mx-auto min-h-[calc(100vh-3.5rem)] w-full max-w-[1800px] md:min-h-[calc(100vh-4rem)]">
      <aside
        class="fixed inset-y-0 left-0 z-50 flex w-[clamp(286px,21vw,400px)] flex-col border-r border-zinc-200 bg-white transition-transform duration-300 lg:top-16 lg:h-[calc(100vh-4rem)]"
        :class="showHistory ? 'translate-x-0' : '-translate-x-full'"
      >
        <div class="flex h-14 items-center justify-between border-b border-zinc-100 px-4">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <History class="h-4 w-4 text-zinc-500" />
            历史对话
          </div>
          <button
            class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            aria-label="新建对话"
            @click="newTask"
          >
            <Plus class="h-3.5 w-3.5" />
            新建
          </button>
        </div>
        <div class="border-b border-zinc-100 p-3">
          <label class="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-400">
            <Search class="h-3.5 w-3.5" />
            <input class="min-w-0 flex-1 bg-transparent outline-none" placeholder="搜索历史对话..." />
          </label>
        </div>
        <div class="flex-1 space-y-1 overflow-y-auto p-2">
          <template v-if="pinnedConversations.length">
          <div
            v-for="item in pinnedConversations"
            :key="item.id"
            data-testid="history-conversation-item"
            class="group rounded-lg border border-transparent px-3 py-2.5 transition hover:border-amber-200 hover:bg-amber-50"
            :class="item.pinned ? 'bg-amber-50/70' : ''"
            @click="openConversation(item)"
          >
            <div class="flex items-center gap-2">
              <Pin v-if="item.pinned" class="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" />
              <input
                v-if="editingConversationId === item.id"
                v-model="editingConversationTitle"
                class="min-w-0 flex-1 rounded-md border border-amber-200 bg-white px-2 py-1 text-sm font-medium text-zinc-900 outline-none ring-2 ring-amber-100"
                aria-label="修改会话标题"
                @click.stop
                @keydown.enter.prevent.stop="commitRenameConversation(item.id)"
                @keydown.esc.prevent.stop="editingConversationId = ''; editingConversationTitle = ''"
                @blur="commitRenameConversation(item.id)"
              />
              <span v-else class="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800">{{ item.title }}</span>
              <span class="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] text-zinc-500">{{ item.mode }}</span>
            </div>
            <div class="mt-2 flex items-center justify-between gap-2">
              <div class="text-[11px] text-zinc-400">{{ item.time }}</div>
              <div class="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  class="rounded-md p-1 text-zinc-400 hover:bg-white hover:text-amber-600"
                  :aria-label="item.pinned ? '取消置顶' : '置顶会话'"
                  @click.stop="toggleConversationPinned(item.id)"
                >
                  <Pin class="h-3.5 w-3.5" :class="item.pinned ? 'fill-amber-500 text-amber-500' : ''" />
                </button>
                <button
                  type="button"
                  class="rounded-md p-1 text-zinc-400 hover:bg-white hover:text-zinc-800"
                  aria-label="修改标题"
                  @click.stop="beginRenameConversation(item)"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  class="rounded-md p-1 text-zinc-400 hover:bg-white hover:text-red-600"
                  aria-label="删除会话"
                  @click.stop="deleteConversation(item.id)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
          <div v-if="regularConversations.length" class="my-2 border-t border-zinc-200 pt-2 text-[11px] font-medium text-zinc-400">普通会话</div>
          </template>
          <div
            v-for="item in regularConversations"
            :key="item.id"
            data-testid="history-conversation-item"
            class="group rounded-lg border border-transparent px-3 py-2.5 transition hover:border-amber-200 hover:bg-amber-50"
            @click="openConversation(item)"
          >
            <div class="flex items-center gap-2">
              <input
                v-if="editingConversationId === item.id"
                v-model="editingConversationTitle"
                class="min-w-0 flex-1 rounded-md border border-amber-200 bg-white px-2 py-1 text-sm font-medium text-zinc-900 outline-none ring-2 ring-amber-100"
                aria-label="修改会话标题"
                @click.stop
                @keydown.enter.prevent.stop="commitRenameConversation(item.id)"
                @keydown.esc.prevent.stop="editingConversationId = ''; editingConversationTitle = ''"
                @blur="commitRenameConversation(item.id)"
              />
              <span v-else class="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800">{{ item.title }}</span>
              <span class="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] text-zinc-500">{{ item.mode }}</span>
            </div>
            <div class="mt-2 flex items-center justify-between gap-2">
              <div class="text-[11px] text-zinc-400">{{ item.time }}</div>
              <div class="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  class="rounded-md p-1 text-zinc-400 hover:bg-white hover:text-amber-600"
                  aria-label="置顶会话"
                  @click.stop="toggleConversationPinned(item.id)"
                >
                  <Pin class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  class="rounded-md p-1 text-zinc-400 hover:bg-white hover:text-zinc-800"
                  aria-label="修改标题"
                  @click.stop="beginRenameConversation(item)"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  class="rounded-md p-1 text-zinc-400 hover:bg-white hover:text-red-600"
                  aria-label="删除会话"
                  @click.stop="deleteConversation(item.id)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main class="flex min-h-[calc(100vh-3.5rem)] flex-col px-[clamp(12px,2.2vw,34px)] py-[clamp(14px,1.6vw,24px)] md:min-h-[calc(100vh-4rem)]">
        <input ref="fileInput" class="hidden" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg" @change="handleFiles" />
        <section v-if="!isChatActive" class="mx-auto flex w-full max-w-[clamp(680px,58vw,1040px)] flex-1 flex-col items-center justify-center pb-[clamp(24px,4vw,48px)]">
          <div class="mb-7 text-center">
            <img src="/assets/pony-avatar.png" alt="小马头像" class="mx-auto mb-4 h-[clamp(72px,5.4vw,96px)] w-[clamp(72px,5.4vw,96px)] object-contain" />
            <h1 class="text-[clamp(24px,2.2vw,40px)] font-semibold leading-tight tracking-tight text-zinc-950">小马在线，有事随时说</h1>
          </div>

          <div class="w-full rounded-[28px] border border-white/70 bg-white/65 p-3 shadow-2xl shadow-zinc-300/40 ring-1 ring-white/80 backdrop-blur-2xl">
            <div class="flex items-start gap-2">
              <textarea
                ref="composer"
                v-model="query"
                rows="1"
                class="max-h-[168px] min-h-12 flex-1 resize-none bg-transparent py-2 text-base leading-7 outline-none placeholder:text-zinc-400"
                :placeholder="placeholder"
                :disabled="isThinking"
                @input="resizeComposer"
                @paste="handlePaste"
                @focus="showRecommendations = true"
                @keydown.enter.exact.prevent="sendMessage"
              />
              <button
                class="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition"
                :class="query.trim() || selectedFiles.length ? 'bg-zinc-950 text-white hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-300'"
                :disabled="isThinking || (!query.trim() && !selectedFiles.length)"
                :aria-label="isThinking ? '小马正在生成中' : '发送给小马'"
                @click="sendMessage"
              >
                <ArrowUp class="h-5 w-5" />
              </button>
            </div>

            <div v-if="selectedFiles.length || selectedKnowledgeRefs.length" class="grid gap-2 px-2 pb-2 sm:grid-cols-2">
              <div v-for="refItem in selectedKnowledgeRefs" :key="refItem.kb" class="group flex min-w-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white/70 px-3 py-2 text-xs">
                <Database class="h-4 w-4 shrink-0 text-emerald-600" />
                <div class="min-w-0 flex-1">
                  <div class="truncate font-medium text-zinc-800">{{ refItem.kb }}</div>
                  <div class="truncate text-[11px] text-zinc-400">{{ refItem.mode }} · {{ refItem.agent }} · {{ refItem.title }}</div>
                </div>
              </div>
              <div v-for="(file, index) in selectedFiles" :key="file" class="group flex min-w-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white/70 px-3 py-2 text-xs">
                <FileText class="h-4 w-4 shrink-0 text-blue-600" />
                <div class="min-w-0 flex-1">
                  <div class="truncate font-medium text-zinc-800">{{ file }}</div>
                  <div class="text-[11px] text-zinc-400">等待小马解析</div>
                </div>
                <button class="rounded-md p-1 text-zinc-400 opacity-0 transition hover:bg-zinc-100 hover:text-zinc-700 group-hover:opacity-100" @click="removeFile(index)"><X class="h-3 w-3" /></button>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 border-t border-zinc-100 px-2 pt-3">
              <div class="relative">
                <button
                  class="inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                  aria-label="上传业务资料"
                  @mouseenter="showUploadTip = true"
                  @mouseleave="showUploadTip = false"
                  @focus="showUploadTip = true"
                  @blur="showUploadTip = false"
                  @click="triggerFilePicker"
                >
                  <Paperclip class="h-3.5 w-3.5" />
                  上传
                </button>
                <div v-if="showUploadTip" class="absolute bottom-full left-0 z-50 mb-2 w-[260px] rounded-lg border border-zinc-200 bg-white p-3 text-left shadow-[0_12px_36px_rgba(15,23,42,0.12)]">
                  <div class="text-xs font-semibold text-zinc-900">上传业务资料</div>
                  <p class="mt-1 text-[11px] leading-5 text-zinc-500">{{ uploadHintText }}</p>
                </div>
              </div>
              <button
                class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
                :class="webSearchEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-50 text-zinc-400'"
                @click="webSearchEnabled = !webSearchEnabled"
              >
                <Globe2 class="h-3.5 w-3.5" />
                联网
              </button>
              <div class="flex rounded-full border border-zinc-200 bg-zinc-50 p-1">
                <button
                  class="inline-flex h-8 w-24 items-center justify-center gap-1.5 rounded-full px-0 text-xs font-medium transition"
                  :class="runMode === 'quick' ? 'bg-orange-500 text-white shadow-sm' : 'text-zinc-500 hover:bg-white'"
                  aria-label="切换到日常办公"
                  @click="selectMode('quick')"
                >
                  <Zap class="h-3.5 w-3.5" />
                  日常办公
                </button>
                <button
                  class="inline-flex h-8 w-24 items-center justify-center gap-1.5 rounded-full px-0 text-xs font-medium transition"
                  :class="runMode === 'task' ? 'bg-violet-600 text-white shadow-sm' : 'text-zinc-500 hover:bg-white'"
                  aria-label="切换到专家模式"
                  @click="selectMode('task')"
                >
                  <Bot class="h-3.5 w-3.5" />
                  专家模式
                </button>
              </div>
              <label class="ml-auto inline-flex min-w-32 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium" :class="runMode === 'quick' ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-violet-200 bg-violet-50 text-violet-700'">
                {{ agentSelectLabel }}
                <select v-model="selectedAgent" class="bg-transparent text-xs font-semibold outline-none" :class="runMode === 'quick' ? 'text-orange-900' : 'text-violet-900'" :aria-label="`选择${agentSelectLabel}`" @change="showRecommendations = true">
                  <option v-for="agent in currentAgentOptions" :key="agent.value" :value="agent.value" :disabled="agent.value.startsWith('soon')">{{ agent.label }}</option>
                </select>
              </label>
            </div>

            <Transition name="recommend">
              <div v-if="showRecommendations" class="mt-3 rounded-2xl border border-white/80 bg-white/55 p-4 shadow-xl shadow-zinc-300/35 backdrop-blur-2xl ring-1 ring-white/70">
                <div class="mb-3 flex items-center justify-between">
                  <div class="text-xs font-semibold text-zinc-500">{{ caseTitle }}<span v-if="runMode === 'quick'"> · 日常办公</span></div>
                  <button class="rounded-lg p-1 text-zinc-400 hover:bg-white/80 hover:text-zinc-700" aria-label="关闭推荐案例" @click="showRecommendations = false">
                    <X class="h-4 w-4" />
                  </button>
                </div>
                <div class="grid gap-2 md:grid-cols-3">
                <button
                  v-for="item in visibleCases"
                  :key="item.title"
                  class="rounded-xl border border-white/80 bg-white/80 p-3 text-left transition hover:border-orange-200 hover:bg-orange-50"
                  @click="fillPrompt(item, runMode); showRecommendations = true"
                >
                  <component :is="'icon' in item ? item.icon : LayoutGrid" class="mb-2 h-4 w-4 text-violet-600" />
                  <div class="text-sm font-medium text-zinc-900">{{ item.title }}</div>
                  <div class="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{{ item.desc }}</div>
                </button>
                </div>
              </div>
            </Transition>
          </div>
        </section>

        <section
          v-else
          data-testid="responsive-chat-shell"
          class="mx-auto flex h-[calc(100vh-5.5rem)] w-full flex-1 flex-col"
          :style="chatShellStyle"
        >
          <div class="mb-3 flex h-10 items-center justify-center">
            <div class="flex items-center gap-2" data-testid="workspace-title-controls">
              <div class="flex items-center justify-center gap-2">
                <h1 class="truncate text-center text-base font-semibold">{{ chatTitle }}</h1>
                <span class="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-500">{{ modeLabel }}</span>
              </div>
            </div>
          </div>

          <div
            ref="messageList"
            class="min-h-0 flex-1 scroll-smooth space-y-5 overflow-y-auto px-0 pb-36 pt-3 md:px-2"
            @scroll.passive="handleMessageScroll"
            @wheel.passive="markUserScrollIntent"
            @touchstart.passive="markUserScrollIntent"
            @pointerdown="markUserScrollIntent"
          >
            <div v-for="message in messages" :key="message.id" class="flex gap-3" :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
              <div v-if="message.role === 'assistant'" class="mt-1 h-10 w-10 shrink-0">
                <img src="/assets/pony-avatar.png" alt="小马头像" class="h-full w-full object-contain" />
              </div>
              <div class="min-w-0" :class="message.role === 'user' ? 'max-w-[72%]' : 'max-w-[88%] flex-1'">
                <div v-if="message.role === 'assistant' && message.processEvents?.length" class="mb-4 border-l border-zinc-200 pl-4 text-sm">
                  <div class="mb-3 inline-flex items-center gap-2 rounded-md px-1 text-zinc-400">
                    <ChevronRight class="h-4 w-4" />
                    <span :class="{ 'process-flow-text': message.processEvents.some((event) => event.status === 'active') }">小马工作了 {{ message.workDuration }}</span>
                  </div>
                  <div class="space-y-4">
                    <div v-for="event in message.processEvents" :key="event.id" class="group relative pl-4">
                      <span
                        class="absolute -left-[22px] top-2 h-3 w-3 rounded-full ring-4 ring-[#f6f7f9]"
                        :class="event.status === 'active' ? 'bg-orange-400' : event.phase === 'step' || event.phase === 'final' ? 'bg-emerald-400' : 'bg-zinc-500'"
                      />
                      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-zinc-500">
                        <Loader2 v-if="event.status === 'active'" class="h-3.5 w-3.5 animate-spin text-orange-500" />
                        <span :class="{ 'process-flow-text': event.status === 'active' }">{{ event.label }}</span>
                        <template v-if="event.action">
                          <span class="font-semibold text-zinc-900">{{ event.action }}</span>
                          <span class="font-mono text-zinc-900">{{ event.target }}</span>
                        </template>
                        <span v-else class="text-zinc-400">{{ event.summary }}</span>
                        <button
                          type="button"
                          class="inline-flex items-center gap-1 rounded-md border border-transparent px-1.5 py-0.5 text-xs text-zinc-400 opacity-0 transition hover:border-orange-300 hover:bg-orange-50 hover:text-zinc-800 group-hover:opacity-100 focus:opacity-100"
                          :aria-label="isProcessEventExpanded(message.id, event.id) ? '收起P&E详情' : '展开P&E详情'"
                          :aria-expanded="isProcessEventExpanded(message.id, event.id)"
                          @click="toggleProcessEvent(message.id, event.id)"
                        >
                          {{ isProcessEventExpanded(message.id, event.id) ? '收起' : '展开' }}
                          <ChevronRight class="h-3.5 w-3.5 transition" :class="isProcessEventExpanded(message.id, event.id) ? 'rotate-90' : ''" />
                        </button>
                      </div>
                      <div
                        class="mt-1 inline-flex max-w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs leading-5"
                        :class="event.status === 'active' ? 'border-zinc-200 bg-zinc-100/80 text-zinc-500' : 'border-emerald-100 bg-emerald-50 text-emerald-700'"
                      >
                        <PanelTop v-if="event.phase === 'plan' || event.phase === 'analysis'" class="h-3.5 w-3.5 shrink-0" />
                        <Database v-else-if="event.action === '调用知识库'" class="h-3.5 w-3.5 shrink-0" />
                        <Globe2 v-else-if="event.action === '搜索网络资料'" class="h-3.5 w-3.5 shrink-0" />
                        <FileText v-else-if="event.action === '生成产物'" class="h-3.5 w-3.5 shrink-0" />
                        <Sparkles v-else class="h-3.5 w-3.5 shrink-0" />
                        <span class="min-w-0 truncate" :class="{ 'process-flow-text': event.status === 'active' }">{{ event.summary }}</span>
                      </div>
                      <div
                        v-if="isProcessEventExpanded(message.id, event.id)"
                        class="mt-2 whitespace-pre-wrap rounded-lg border border-zinc-100 bg-white/70 p-3 text-xs leading-6 text-zinc-600 shadow-sm"
                      >
                        {{ event.detail }}
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="text-sm leading-7"
                  :class="message.role === 'user' ? 'rounded-2xl bg-zinc-950 px-4 py-3 text-white shadow-sm' : 'prose prose-zinc max-w-none text-zinc-800'"
                >
                  <div v-if="message.role === 'assistant'" class="ai-markdown" v-html="renderMarkdown(message.content)" />
                  <div v-else class="whitespace-pre-wrap">{{ message.content }}</div>
                  <div v-if="message.role === 'assistant'" class="not-prose mt-3 flex flex-wrap items-center gap-1.5 pt-2">
                    <button
                      class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition"
                      :class="feedbackByMessage[message.id] === 'up' ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-500 hover:bg-emerald-50 hover:text-emerald-700'"
                      aria-label="点赞"
                      @click="setFeedback(message.id, 'up')"
                    >
                      <ThumbsUp class="h-3.5 w-3.5" />{{ feedbackByMessage[message.id] === 'up' ? '已点赞' : '点赞' }}
                    </button>
                    <button
                      class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition"
                      :class="feedbackByMessage[message.id] === 'down' ? 'bg-red-50 text-red-600' : 'text-zinc-500 hover:bg-red-50 hover:text-red-600'"
                      aria-label="点踩"
                      @click="openDislikeModal(message.id)"
                    >
                      <ThumbsDown class="h-3.5 w-3.5" />{{ feedbackByMessage[message.id] === 'down' ? '已点踩' : '点踩' }}
                    </button>
                    <button class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800" aria-label="复制回答" @click="copyAnswer(message)">
                      <Copy class="h-3.5 w-3.5" />{{ copiedMessageId === message.id ? '已复制' : '复制' }}
                    </button>
                    <button class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800" aria-label="引用回答" @click="quoteAnswer(message)">
                      <Quote class="h-3.5 w-3.5" />{{ quotedMessageId === message.id ? '已引用' : '引用' }}
                    </button>
                  </div>
                  <div v-if="message.role === 'assistant' && (selectedKnowledgeRefs.length || hasGeneratedAssets)" class="not-prose mt-3 rounded-xl border border-zinc-200 bg-white/70 p-3">
                    <div class="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-700">
                      <Link2 class="h-3.5 w-3.5 text-blue-600" />
                      来源引用
                    </div>
                    <div class="grid gap-2 md:grid-cols-2">
                      <div
                        v-for="refItem in selectedKnowledgeRefs.length ? selectedKnowledgeRefs : [{ title: 'B2B线下团购方案', mode: modeLabel, agent: currentAgentLabel, kb: '方案中心案例库', desc: '预算分档与门店话术' }]"
                        :key="refItem.kb"
                        class="group flex min-w-0 items-start gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs"
                      >
                        <Database class="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <div class="min-w-0 flex-1">
                          <div class="truncate font-medium text-zinc-800">{{ refItem.kb }}</div>
                          <div class="mt-0.5 line-clamp-2 text-[11px] leading-4 text-zinc-500">{{ refItem.desc }}</div>
                          <div class="mt-1 text-[10px] text-zinc-400">{{ refItem.mode }} · {{ refItem.agent }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="message.role === 'user'" class="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-600 text-sm font-bold text-white shadow-sm">
                张
              </div>
            </div>

          </div>

          <div class="sticky bottom-0 -mx-1 border-t border-transparent bg-gradient-to-t from-[#f6f7f9] via-[#f6f7f9]/95 to-transparent px-1 pb-3 pt-5">
            <button
              v-if="showBackToLatest"
              type="button"
              class="absolute right-4 top-[-40px] rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm hover:bg-zinc-50"
              @click="scrollToLatest(true)"
            >
              回到最新回复
            </button>
            <div data-testid="responsive-composer" class="mx-auto w-full max-w-[clamp(720px,72vw,1180px)] rounded-2xl border border-white/80 bg-white/80 p-3 shadow-2xl shadow-zinc-300/40 ring-1 ring-white/70 backdrop-blur-2xl">
              <div v-if="selectedFiles.length || selectedKnowledgeRefs.length" class="mb-2 grid gap-2 px-1 sm:grid-cols-2">
                <div v-for="refItem in selectedKnowledgeRefs" :key="refItem.kb" class="flex min-w-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs">
                  <Database class="h-4 w-4 shrink-0 text-emerald-600" />
                  <div class="min-w-0 flex-1">
                    <div class="truncate font-medium text-zinc-800">{{ refItem.kb }}</div>
                    <div class="truncate text-[11px] text-zinc-400">{{ refItem.mode }} · {{ refItem.agent }} · {{ refItem.title }}</div>
                  </div>
                </div>
                <div v-for="(file, index) in selectedFiles" :key="file" class="group flex min-w-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs">
                  <FileText class="h-4 w-4 shrink-0 text-blue-600" />
                  <div class="min-w-0 flex-1">
                    <div class="truncate font-medium text-zinc-800">{{ file }}</div>
                    <div class="text-[11px] text-zinc-400">等待小马解析</div>
                  </div>
                  <button class="rounded-md p-1 text-zinc-400 opacity-0 transition hover:bg-zinc-100 hover:text-zinc-700 group-hover:opacity-100" @click="removeFile(index)"><X class="h-3 w-3" /></button>
                </div>
              </div>
            <div class="flex items-end gap-2">
              <textarea
                ref="composer"
                v-model="query"
                rows="1"
                class="max-h-[168px] min-h-10 flex-1 resize-none bg-transparent py-2 text-sm leading-6 outline-none placeholder:text-zinc-400"
                :placeholder="placeholder"
                :disabled="isThinking"
                @input="resizeComposer"
                @paste="handlePaste"
                @keydown.enter.exact.prevent="sendMessage"
              />
              <button
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-300"
                :aria-label="isThinking ? '停止生成' : '发送给小马'"
                :disabled="!isThinking && !query.trim() && !selectedFiles.length"
                @click="isThinking ? pauseThinking() : sendMessage()"
              >
                <Square v-if="isThinking" class="h-4 w-4 fill-current" />
                <SendHorizontal v-else class="h-5 w-5" />
              </button>
            </div>
              <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 px-1 pt-3">
                <div class="relative">
                  <button
                    class="inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                    aria-label="上传业务资料"
                    @mouseenter="showUploadTip = true"
                    @mouseleave="showUploadTip = false"
                    @focus="showUploadTip = true"
                    @blur="showUploadTip = false"
                    @click="triggerFilePicker"
                  >
                    <Paperclip class="h-3.5 w-3.5" />
                    上传
                  </button>
                  <div v-if="showUploadTip" class="absolute bottom-full left-0 z-50 mb-2 w-[260px] rounded-lg border border-zinc-200 bg-white p-3 text-left shadow-[0_12px_36px_rgba(15,23,42,0.12)]">
                    <div class="text-xs font-semibold text-zinc-900">上传业务资料</div>
                    <p class="mt-1 text-[11px] leading-5 text-zinc-500">{{ uploadHintText }}</p>
                  </div>
                </div>
                <button
                  class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
                  :class="webSearchEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-50 text-zinc-400'"
                  @click="webSearchEnabled = !webSearchEnabled"
                >
                  <Globe2 class="h-3.5 w-3.5" />
                  联网
                </button>
                <div class="flex rounded-full border border-zinc-200 bg-zinc-50 p-1">
                  <button
                    class="inline-flex h-8 w-24 items-center justify-center gap-1.5 rounded-full px-0 text-xs font-medium transition"
                    :class="runMode === 'quick' ? 'bg-orange-500 text-white shadow-sm' : 'text-zinc-500 hover:bg-white'"
                    aria-label="切换到日常办公"
                    @click="selectMode('quick')"
                  >
                    <Zap class="h-3.5 w-3.5" />
                    日常办公
                  </button>
                  <button
                    class="inline-flex h-8 w-24 items-center justify-center gap-1.5 rounded-full px-0 text-xs font-medium transition"
                    :class="runMode === 'task' ? 'bg-violet-600 text-white shadow-sm' : 'text-zinc-500 hover:bg-white'"
                    aria-label="切换到专家模式"
                    @click="selectMode('task')"
                  >
                    <Bot class="h-3.5 w-3.5" />
                    专家模式
                  </button>
                </div>
                <label class="ml-auto inline-flex min-w-32 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium" :class="runMode === 'quick' ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-violet-200 bg-violet-50 text-violet-700'">
                  {{ agentSelectLabel }}
                  <select v-model="selectedAgent" class="bg-transparent text-xs font-semibold outline-none" :class="runMode === 'quick' ? 'text-orange-900' : 'text-violet-900'" :aria-label="`选择${agentSelectLabel}`">
                    <option v-for="agent in currentAgentOptions" :key="agent.value" :value="agent.value" :disabled="agent.value.startsWith('soon')">{{ agent.label }}</option>
                  </select>
                </label>
                <span class="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white p-2" :style="contextRingStyle" title="上下文">
                  <span class="h-3.5 w-3.5 rounded-full bg-white" />
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <aside v-if="rightPanelVisible" class="fixed bottom-0 right-0 top-14 z-30 hidden w-[clamp(286px,21vw,400px)] border-l border-zinc-200 bg-white lg:top-16 lg:block">
        <div class="flex h-full flex-col">
          <div class="flex h-14 items-center justify-between border-b border-zinc-100 px-4">
            <div class="text-sm font-semibold text-zinc-900">会话产物栏</div>
          </div>
          <div class="flex-1 space-y-2 overflow-y-auto p-2">
          <section class="rounded-lg border border-transparent px-3 py-2.5 hover:border-zinc-200 hover:bg-zinc-50">
            <div class="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Link2 class="h-4 w-4 text-blue-600" />
              引用溯源
            </div>
            <div class="space-y-2 text-xs leading-5 text-zinc-500">
              <div
                v-for="refItem in selectedKnowledgeRefs.length ? selectedKnowledgeRefs : [{ title: '成功案例复用', mode: modeLabel, agent: currentAgentLabel, kb: '运动鞋团购成功案例.md', desc: '匹配度 95%，引用预算分档与门店话术' }, { title: '预算池', mode: modeLabel, agent: currentAgentLabel, kb: '团购通用预算池.xlsx', desc: '匹配度 91%，引用价格带与 SKU 组合策略' }]"
                :key="refItem.kb"
                class="rounded-lg border border-zinc-100 bg-zinc-50 p-2"
              >
                <div class="flex items-center gap-2 font-medium text-zinc-800">
                  <Database class="h-3.5 w-3.5 text-emerald-600" />
                  <span class="min-w-0 flex-1 truncate">{{ refItem.kb }}</span>
                </div>
                <p class="mt-1 line-clamp-2">{{ refItem.desc }}</p>
                <div class="mt-1 text-[10px] text-zinc-400">由 {{ refItem.mode }} · {{ refItem.agent }} 引用</div>
              </div>
            </div>
          </section>

          <section class="rounded-lg border border-transparent px-3 py-2.5 hover:border-zinc-200 hover:bg-zinc-50">
            <div class="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Folder class="h-4 w-4 text-amber-600" />
              知识库文件夹
            </div>
            <div class="space-y-2">
              <div class="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs">
                <Folder class="h-4 w-4 shrink-0 text-amber-500" />
                <div class="min-w-0 flex-1">
                  <div class="truncate font-medium text-zinc-800">团购方案资料夹</div>
                  <div class="text-[11px] text-zinc-400">12 个文件 · 已接入引用</div>
                </div>
                <button class="rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:bg-white">打开</button>
              </div>
              <div class="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs">
                <BookOpen class="h-4 w-4 shrink-0 text-emerald-600" />
                <div class="min-w-0 flex-1">
                  <div class="truncate font-medium text-zinc-800">方案中心案例库</div>
                  <div class="text-[11px] text-zinc-400">公共空间 · 只读引用</div>
                </div>
              </div>
            </div>
          </section>

          <section v-if="hasGeneratedAssets" class="rounded-lg border border-transparent px-3 py-2.5 hover:border-zinc-200 hover:bg-zinc-50">
            <div class="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Download class="h-4 w-4 text-emerald-600" />
              生成产物
            </div>
            <div class="space-y-2">
              <div v-for="artifact in ['Excel 组货清单', 'PPT 客户方案', 'PDF 方案画册']" :key="artifact" class="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-xs">
                <span class="font-medium text-zinc-700">{{ artifact }}</span>
                <button type="button" class="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100">
                  <Download class="h-3.5 w-3.5" />
                  下载
                </button>
              </div>
            </div>
          </section>

          <section v-if="hasGeneratedAssets" class="rounded-lg border border-transparent px-3 py-2.5 hover:border-violet-200 hover:bg-violet-50">
            <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-violet-800">
              <BarChart3 class="h-4 w-4" />
              图表工具
            </div>
            <div class="rounded-lg bg-white/70 p-3">
              <div class="mb-2 flex items-center justify-between text-xs">
                <span class="font-medium text-zinc-800">预算分档占比</span>
                <span class="text-[10px] text-zinc-400">Mock</span>
              </div>
              <div class="flex h-20 items-end gap-2">
                <div class="w-1/3 rounded-t-md bg-orange-300" style="height: 42%"></div>
                <div class="w-1/3 rounded-t-md bg-blue-300" style="height: 72%"></div>
                <div class="w-1/3 rounded-t-md bg-violet-300" style="height: 54%"></div>
              </div>
              <div class="mt-2 grid grid-cols-3 text-center text-[10px] text-zinc-400">
                <span>保守</span><span>均衡</span><span>品质</span>
              </div>
            </div>
          </section>

          <section v-if="hasGeneratedAssets" class="rounded-lg border border-transparent px-3 py-2.5 hover:border-amber-200 hover:bg-amber-50">
            <div class="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
              <Sparkles class="h-4 w-4" />
              知识缺口
            </div>
            <p class="text-xs leading-5 text-amber-700">部分品牌最新库存及价格待确认，已记录为后续补充项。</p>
          </section>

          <section v-if="selectedFiles.length" class="rounded-lg border border-transparent px-3 py-2.5 hover:border-zinc-200 hover:bg-zinc-50">
            <div class="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Paperclip class="h-4 w-4 text-zinc-500" />
              已上传附件
            </div>
            <div class="space-y-2">
              <div v-for="(file, index) in selectedFiles" :key="file" class="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                <FileText class="h-3.5 w-3.5 shrink-0" />
                <span class="min-w-0 flex-1 truncate">{{ file }}</span>
                <button class="text-zinc-400 hover:text-red-500" @click="removeFile(index)"><Trash2 class="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </section>
          </div>
        </div>
      </aside>
    </div>
  </div>

  <!-- Dislike popup modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showDislikeModal" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="showDislikeModal = false">
        <div class="absolute inset-0 bg-black/40" />
        <div class="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
          <h3 class="text-base font-semibold text-zinc-900 mb-1">哪里不满意？</h3>
          <p class="text-xs text-zinc-400 mb-4">你的反馈会帮助小马变得更好</p>
          <div class="flex flex-wrap gap-2 mb-4">
            <button v-for="r in DISLIKE_OPTIONS" :key="r"
              class="rounded-full border px-3 py-1.5 text-xs font-medium transition"
              :class="dislikeReasons.includes(r) ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'"
              @click="dislikeReasons.includes(r) ? dislikeReasons = dislikeReasons.filter(x => x !== r) : dislikeReasons.push(r)"
            >{{ r }}</button>
          </div>
          <textarea v-if="dislikeReasons.includes('其他')" v-model="dislikeComment" rows="2" placeholder="请补充说明..." class="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-300 focus:border-rose-200 focus:outline-none mb-4 resize-none"></textarea>
          <div class="flex justify-end gap-2">
            <button class="rounded-lg px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-100" @click="showDislikeModal = false">取消</button>
            <button class="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600" @click="submitDislike">提交</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ai-markdown :deep(h1),
.ai-markdown :deep(h2),
.ai-markdown :deep(h3) {
  margin: 0.75rem 0 0.35rem;
  color: #18181b;
  font-weight: 700;
  line-height: 1.35;
}

.ai-markdown :deep(h1) {
  font-size: 1.25rem;
}

.ai-markdown :deep(h2) {
  font-size: 1.1rem;
}

.ai-markdown :deep(h3) {
  font-size: 1rem;
}

.ai-markdown :deep(p) {
  margin: 0.28rem 0;
}

.ai-markdown :deep(ul) {
  margin: 0.4rem 0 0.65rem 1.1rem;
  list-style: disc;
}

.ai-markdown :deep(li) {
  margin: 0.18rem 0;
}

.process-flow-text {
  background: linear-gradient(90deg, #a1a1aa 0%, #52525b 36%, #e4e4e7 50%, #71717a 68%, #a1a1aa 100%);
  background-size: 220% 100%;
  color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
  animation: process-flow 1.9s linear infinite;
}

@keyframes process-flow {
  from {
    background-position: 120% 0;
  }

  to {
    background-position: -120% 0;
  }
}
</style>
