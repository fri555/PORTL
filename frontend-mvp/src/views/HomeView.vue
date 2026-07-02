<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  ArrowUp,
  Bot,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
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
  MoreHorizontal,
 PanelTop,
  Paperclip,
  Pencil,
  Plus,
 Quote,
  RotateCw,
 Search,
  SendHorizontal,
  Sparkles,
  Square,
  Trash2,
  X,
  Zap,
} from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'

type RunMode = 'quick' | 'task' | 'schedule'
type ScheduleCycle = 'once' | 'daily' | 'workday' | 'weekly' | 'monthly' | 'cron'
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
  mode: '日常办公' | '专家模式' | '定时任务'
  pinned: boolean
 status: 'running' | 'completed' | 'failed' | 'cancelled'
}
type IntentRoute = 'greeting' | 'office-rag' | 'expert-task' | 'schedule-task'
type CaseItem = {
  title: string
  icon?: unknown
  desc: string
  prompt: string
  bubble?: string
  kb?: string
  schedule?: Partial<{
    cycle: ScheduleCycle
    date: string
    time: string
    weekday: string
    monthDay: string
  }>
}
type GeneratedArtifact = {
  name: string
  type: 'Excel' | 'PPT' | 'PDF' | 'Word' | 'MD'
  size: string
  icon: unknown
  summary: string
  sections: string[]
  paragraphs: string[]
  rows: string[][]
}
type ExpertAgent = {
  value: string
  label: string
  role: string
  desc: string
  level: string
  accent: string
  prompts: CaseItem[]
}
type ActiveReference = {
  title: string
  mode: string
  agent: string
  kb: string
  desc: string
}
type AttachmentSpace = 'public' | 'personal'
type AttachmentNode = {
  id: string
  label: string
  type: 'folder' | 'file'
  children?: AttachmentNode[]
  meta?: string
}
const store = useAppStore()
const route = useRoute()

const query = ref('')
const runMode = ref<RunMode>('quick')
const webSearchEnabled = ref(true)
const selectedAgent = ref('allround')
const scheduleCycle = ref<ScheduleCycle>('daily')
const scheduleDate = ref('2026-07-02')
const scheduleTime = ref('09:00')
const scheduleWeekday = ref('周一')
const scheduleMonthDay = ref('1号')
const scheduleCron = ref('0 9 * * *')
const activeCaseCategory = ref('精选案例')
const showRecommendations = ref(true)
const modeMenuOpen = ref(false)
const agentMenuOpen = ref(false)
const showHistory = ref(false)
const sidebarTitle = ref('任务导航')
const editingSidebarTitle = ref(false)
const sidebarTitleDraft = ref('任务导航')
const collapsedSidebarGroups = ref<RunMode[]>([])
const showHistoryBrowser = ref(false)
const isChatActive = ref(false)
const isThinking = ref(false)
const generationInterrupted = ref(false)
const isRightPanelCollapsed = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const composer = ref<HTMLTextAreaElement | null>(null)
const messageList = ref<HTMLElement | null>(null)
const selectedFiles = ref<string[]>([])
const conversationSearch = ref('')
const historyBrowserSearch = ref('')
const historyBrowserModeFilter = ref<'all' | RunMode>('all')
const attachmentModalOpen = ref(false)
const activeAttachmentTab = ref<'local' | 'knowledge'>('local')
const kbAttachmentSearch = ref('')
const selectedKbDocNames = ref<string[]>([])
const attachmentSpace = ref<AttachmentSpace>('public')
const attachmentScope = ref<'all' | AttachmentSpace>('all')
const attachmentPath = ref<string[]>([])
const showUploadTip = ref(false)
const uploadHintText = '支持 PDF、Word、Excel、PPT、TXT、PNG、JPG，单个文件 20MB 内'
const messages = ref<Message[]>([])
const feedbackByMessage = ref<Record<string, 'up' | 'down' | undefined>>({})
const copiedMessageId = ref('')
const quotedMessageId = ref('')
const editingUserMessageId = ref('')
const editingUserMessageDraft = ref('')
const hasGeneratedAssets = ref(false)
const activeArtifactPreview = ref<GeneratedArtifact | null>(null)
const activeReference = ref<ActiveReference | null>(null)
const selectedKnowledgeRefs = ref<ActiveReference[]>([])
const expandedProcessEventIds = ref<string[]>([])
const editingConversationId = ref('')
const editingConversationTitle = ref('')
const activeMenuConversationId = ref<string | null>(null)
const activeConversationTitle = ref('新会话')
const activeConversationId = ref('')
const isAutoScroll = ref(true)
const showBackToLatest = ref(false)
const isTextSelecting = ref(false)
const isProgrammaticScroll = ref(false)
const userScrollIntent = ref(false)
let generationToken = 0
const generationDelayFactor = import.meta.env.MODE === 'test' ? 0.001 : 1
const ponyAvatarUrl = `${import.meta.env.BASE_URL}assets/pony-avatar.png`

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
  { id: 'conv-1', title: 'B2B团购组货方案', time: '12分钟前', mode: '专家模式', pinned: true, status: 'running' },
  { id: 'conv-2', title: '客户A福利方案优化', time: '昨天', mode: '专家模式', pinned: false, status: 'completed' },
  { id: 'conv-3', title: '考勤制度问答', time: '周二', mode: '日常办公', pinned: true, status: 'failed' },
  { id: 'conv-4', title: '门店需求字段表', time: '06-18', mode: '专家模式', pinned: false, status: 'completed' },
  { id: 'conv-5', title: '行业动态简报', time: '刚刚', mode: '日常办公', pinned: false, status: 'running' },
 { id: 'conv-6', title: '每日方案池监控', time: '明早4:00', mode: '定时任务', pinned: false, status: 'running' },
  { id: 'conv-7', title: 'Q3营销策划方案', time: '06-30', mode: '专家模式', pinned: false, status: 'cancelled' },
])

const officeAgents = [
  { value: 'allround', label: '全能助手', desc: '日常办公、调研、知识检索和轻量任务整理' },
]

const expertAgents: ExpertAgent[] = [
  {
    value: 'solution',
    label: '组货专家',
    role: '方案落地专家',
    desc: '匹配方案池、组织组货清单、生成客户交付物',
    level: 'P7',
    accent: 'from-orange-500 to-amber-400',
    prompts: [
      {
        title: 'B2B线下团购方案',
        desc: '预算10万，运动鞋类目，输出三档组合。',
        prompt: '帮我给B2B线下客户出一版团购方案。已知：总预算10万，偏运动鞋类目，客户在门店等待，需要先给一版可沟通初稿。请先列出必须追问字段，再按保守档、均衡档、品质档输出组货方案。',
        bubble: '10万预算团购方案',
        kb: '方案中心案例库',
      },
      {
        title: '门店需求采集',
        desc: '把客户口述需求整理成标准字段。',
        prompt: '请把门店客户的团购需求整理成标准字段表。字段包括客户类型、数量、预算范围、活动场景、品类需求、品牌偏好、交付时间、风险备注。',
        bubble: '门店需求字段表',
        kb: '方案中心字段模板',
      },
      {
        title: '成功案例复用',
        desc: '匹配案例池并给出引用依据。',
        prompt: '请基于方案中心成功案例池，帮我匹配适合运动鞋团购的相似案例，并说明适用条件、引用依据和可复用话术。',
        bubble: '匹配相似成功案例',
        kb: '成功案例池',
      },
      { title: '预算分档', desc: '按预算拆三档方案。', prompt: '请按保守档、均衡档、品质档拆解一版团购预算分档，并标注每档适用客户。', bubble: '预算三档拆解', kb: '团购预算池' },
      { title: '客户话术', desc: '生成现场沟通话术。', prompt: '请把当前团购方案整理成门店可直接沟通的话术，包含开场、推荐理由和异议回应。', bubble: '门店沟通话术', kb: '销售话术库' },
      { title: '导出清单', desc: '生成可导出字段清单。', prompt: '请把团购方案整理成可导出的 Excel 字段清单，包含品类、数量、价格带、推荐理由和风险备注。', bubble: '导出 Excel 清单', kb: '方案清单模板' },
    ],
  },
  {
    value: 'analysis',
    label: '分析专家',
    role: '经营分析专家',
    desc: '拆解业务指标、定位变化原因、输出经营诊断',
    level: 'P6',
    accent: 'from-blue-500 to-cyan-400',
    prompts: [
      { title: '经营周报诊断', desc: '定位指标波动和后续动作。', prompt: '帮我分析本周经营周报，重点看销售额、毛利、转化率变化，并输出原因假设和下周动作。', bubble: '本周经营周报诊断', kb: '经营分析知识库' },
      { title: '客户分层洞察', desc: '按行业、规模、预算拆分机会。', prompt: '请把客户线索按行业、规模、预算和成交概率做分层，并给出优先跟进建议。', bubble: '客户分层机会分析', kb: '客户线索库' },
      { title: '毛利波动分析', desc: '分析毛利变化原因。', prompt: '请分析本月毛利波动，拆解品类、客户、价格带三个维度，并给出改善建议。', bubble: '毛利波动原因拆解', kb: '经营分析知识库' },
      { title: '转化漏斗', desc: '定位转化漏斗卡点。', prompt: '请基于销售漏斗数据找出转化率下降的关键节点，并输出下一步验证动作。', bubble: '转化漏斗卡点定位', kb: '销售漏斗看板' },
      { title: '预算使用', desc: '检查预算使用效率。', prompt: '请分析当前预算使用效率，判断哪些项目投入产出不合理，并给出优先级建议。', bubble: '预算使用效率分析', kb: '预算台账' },
    ],
  },
  {
    value: 'marketing',
    label: '营销大师',
    role: '内容增长专家',
    desc: '生成活动方案、营销话术和传播素材框架',
    level: 'P7',
    accent: 'from-fuchsia-500 to-rose-400',
    prompts: [
      { title: '新品活动策划', desc: '活动节奏、权益、传播内容。', prompt: '帮我设计一版新品上市营销方案，包含活动主题、用户权益、渠道节奏和核心文案。', bubble: '新品上市活动方案', kb: '营销活动模板库' },
      { title: '客户邀约话术', desc: '多渠道邀约和异议处理。', prompt: '请生成一组客户邀约话术，分别适用于钉钉、电话和面谈场景，并补充常见异议回应。', bubble: '客户邀约话术', kb: '销售话术库' },
      { title: '私域推文', desc: '生成社群传播素材。', prompt: '请为这次活动生成一组私域社群推文，包含标题、正文和行动按钮文案。', bubble: '私域社群推文', kb: '内容素材库' },
      { title: '活动复盘', desc: '输出活动复盘框架。', prompt: '请帮我设计活动复盘框架，包含目标达成、渠道表现、用户反馈和下次优化。', bubble: '活动复盘框架', kb: '营销复盘模板' },
    ],
  },
  {
    value: 'design',
    label: '高级设计师',
    role: '视觉设计专家',
    desc: '整理设计需求、输出视觉方向和页面结构建议',
    level: 'P6',
    accent: 'from-violet-500 to-indigo-400',
    prompts: [
      { title: '方案页视觉优化', desc: '重构页面信息层级和风格。', prompt: '请帮我优化一版方案页视觉结构，要求更商务、更清晰，输出版式层级、视觉关键词和模块顺序。', bubble: '方案页视觉优化', kb: '品牌设计规范' },
      { title: 'PPT视觉方向', desc: '生成汇报型PPT设计建议。', prompt: '帮我给客户方案PPT设定视觉方向，包含封面、目录、方案页、报价页和结束页建议。', bubble: 'PPT视觉方向', kb: 'PPT模板库' },
      { title: '页面信息层级', desc: '整理页面主次关系。', prompt: '请重排这个页面的信息层级，让客户先看到结论、价值和关键数据。', bubble: '页面信息层级调整', kb: '设计规范库' },
      { title: '视觉关键词', desc: '提炼视觉方向。', prompt: '请基于商务、科技、可信三个关键词，输出一组视觉设计方向建议。', bubble: '商务科技视觉方向', kb: '品牌设计规范' },
    ],
  },
  {
    value: 'ops',
    label: '运营策略师',
    role: '流程运营专家',
    desc: '梳理协同流程、负责人、节点和风险预案',
    level: 'P5',
    accent: 'from-emerald-500 to-lime-400',
    prompts: [
      { title: '交付排期拆解', desc: '拆任务、排负责人和里程碑。', prompt: '帮我把这个客户交付任务拆成排期计划，包含负责人、截止时间、风险点和验收标准。', bubble: '交付排期拆解', kb: '项目管理模板库' },
      { title: '风险预案', desc: '识别风险和应对。', prompt: '请识别这个项目可能出现的交付风险，并给出预案、负责人和触发条件。', bubble: '项目风险预案', kb: '项目管理模板库' },
      { title: '验收标准', desc: '生成验收口径。', prompt: '请把当前任务整理成可执行的验收标准，包含交付物、质量要求和确认方式。', bubble: '交付验收标准', kb: '项目验收模板' },
    ],
  },
  {
    value: 'soon',
    label: '敬请期待',
    role: '更多专家',
    desc: '更多行业专家正在接入',
    level: '--',
    accent: 'from-zinc-300 to-zinc-200',
    prompts: [],
  },
]

const scheduleCycles = [
  { value: 'once', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'workday', label: '工作日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'cron', label: '自定义 Cron' },
] as const
const weekdayOptions = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const monthDayOptions = Array.from({ length: 28 }, (_, index) => `${index + 1}号`)
const scheduleTimeOptions = ['04:00', '08:00', '09:00', '12:00', '18:00', '21:00']
const generatedArtifactCards: GeneratedArtifact[] = [
  {
    name: 'B2B团购组货清单.xlsx',
    type: 'Excel',
    size: '128 KB',
    icon: FileSpreadsheet,
    summary: '三档组货预算清单，含品类、数量、预算占比和沟通口径。',
    sections: ['组货清单', '预算分档', '执行备注'],
    paragraphs: [
      '该 Excel 用于门店现场快速沟通，先按预算约束给出三档组合，再补充适用场景和风险备注。',
      '均衡档可作为默认沟通稿，保守档用于压预算，品质档用于客户重视员工体验的场景。',
    ],
    rows: [
      ['档位', '核心组合', '预算', '适用场景'],
      ['保守档', '基础运动鞋 + 通勤袜', '8.6 万', '预算敏感客户'],
      ['均衡档', '主推运动鞋 + 配件礼包', '9.8 万', '门店快速沟通'],
      ['品质档', '品牌运动鞋 + 定制礼盒', '10.4 万', '员工体验优先'],
    ],
  },
  {
    name: '客户方案沟通稿.pptx',
    type: 'PPT',
    size: '2.4 MB',
    icon: FileText,
    summary: '客户现场沟通用 PPT，包含方案目标、三档报价和交付节奏。',
    sections: ['01 客户需求理解', '02 三档方案对比', '03 下一步确认'],
    paragraphs: [
      'PPT 面向客户现场沟通，第一页先说明需求理解和约束条件，避免直接进入报价造成理解偏差。',
      '中间页面突出三档方案差异，最后沉淀待确认字段、样品确认和交付排期。',
    ],
    rows: [
      ['页码', '页面主题', '内容摘要'],
      ['01', '客户需求理解', '预算、品类、交付时间与风险假设'],
      ['02', '三档方案对比', '保守档、均衡档、品质档差异'],
      ['03', '下一步确认', '待补字段、样品确认和交付排期'],
    ],
  },
  {
    name: '方案画册预览.pdf',
    type: 'PDF',
    size: '860 KB',
    icon: FileText,
    summary: '面向客户转发的 PDF 预览稿，突出组合亮点和交付说明。',
    sections: ['方案概览', '产品组合', '交付说明'],
    paragraphs: [
      'PDF 版本适合转发给客户复核，正文保留方案亮点、预算边界和交付说明。',
      '内容会弱化内部工具调用过程，只展示客户需要理解和确认的信息。',
    ],
    rows: [
      ['章节', '内容'],
      ['方案概览', '客户背景、预算边界、推荐路径'],
      ['产品组合', '运动鞋主推款、补充配件、包装建议'],
      ['交付说明', '排期、验收标准、风险备注'],
    ],
  },
]

const quickCases: CaseItem[] = [
  {
    title: 'AI复合型岗位趋势',
    icon: BarChart3,
    desc: '生成趋势洞察和岗位能力框架',
    prompt: '帮我整理一份AI复合型岗位趋势分析，包含岗位变化、能力要求和企业落地建议。',
    kb: '组织发展知识库',
  },
  {
    title: '品牌调研报告',
    icon: Globe2,
    desc: '汇总竞品信息和市场机会',
    prompt: '帮我生成一份品牌调研报告，包含竞品动态、用户偏好和可执行建议。',
    kb: '调研资料库',
  },
  {
    title: '名单双表格',
    icon: FileSpreadsheet,
    desc: '把名单整理成可筛选表格',
    prompt: '帮我把名单信息整理成表格，字段包括姓名、部门、角色、联系方式和跟进状态。',
    kb: '办公模板库',
  },
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

const hasSessionAssets = computed(() => hasGeneratedAssets.value)
const rightPanelVisible = computed(() => false)
const sortedConversations = computed(() => [...conversations.value])
const sidebarConversationGroups = computed(() => [
  { key: 'task' as const, label: '专家模式', items: sortedConversations.value.filter((item) => item.mode === '专家模式') },
  { key: 'quick' as const, label: '日常办公', items: sortedConversations.value.filter((item) => item.mode === '日常办公') },
  { key: 'schedule' as const, label: '定时任务', items: sortedConversations.value.filter((item) => item.mode === '定时任务') },
].filter((group) => group.items.length))
const historyBrowserConversations = computed(() => {
  const keyword = historyBrowserSearch.value.trim().toLowerCase()
  return sortedConversations.value.filter((item) => {
    const modeMatched = historyBrowserModeFilter.value === 'all'
      || (historyBrowserModeFilter.value === 'quick' && item.mode === '日常办公')
      || (historyBrowserModeFilter.value === 'task' && item.mode === '专家模式')
      || (historyBrowserModeFilter.value === 'schedule' && item.mode === '定时任务')
    if (!modeMatched) return false
    if (!keyword) return true
    return `${item.title}${item.mode}${item.time}${getConversationDetail(item)}${getConversationStatusLabel(item.status)}`.toLowerCase().includes(keyword)
  })
})
const currentAgentOptions = computed(() => (runMode.value === 'task' ? expertAgents : officeAgents))
const currentAgentLabel = computed(() => currentAgentOptions.value.find((agent) => agent.value === selectedAgent.value)?.label ?? '')
const selectedExpert = computed(() => expertAgents.find((agent) => agent.value === selectedAgent.value && agent.value !== 'soon') ?? null)
const needsExpertSelection = computed(() => runMode.value === 'task' && !selectedExpert.value)
const canSend = computed(() =>
  !isThinking.value
  && Boolean(query.value.trim() || selectedFiles.value.length || selectedKnowledgeRefs.value.length)
  && !needsExpertSelection.value,
)
const currentAgentDescription = computed(() => {
  if (runMode.value === 'task') return selectedExpert.value?.desc ?? '先选择一个专家，小马会把任务交给合适的专家执行。'
  if (runMode.value === 'schedule') return '定时任务用于周期性执行检索、提醒、日报、知识库更新等固定动作。'
  return '全能助手擅长处理日常办公、知识查询、资料整理和轻量协同任务。'
})
const visibleCases = computed<CaseItem[]>(() => {
  if (runMode.value === 'task') return selectedExpert.value?.prompts ?? []
  if (runMode.value === 'schedule') return [
    { title: '每日方案池监控', icon: CalendarDays, desc: '每天 09:00 检查新增方案和过期字段', prompt: '每天早上9点检查方案中心是否有新增或过期字段，并生成一段摘要提醒我。', kb: '方案中心', schedule: { cycle: 'daily', time: '09:00' } },
    { title: '每周经营简报', icon: FileText, desc: '每周一 09:00 生成经营摘要', prompt: '每周一上午9点汇总上周经营数据、重点风险和建议动作，输出一份简报。', kb: '经营分析知识库', schedule: { cycle: 'weekly', weekday: '周一', time: '09:00' } },
    { title: '工作日待办巡检', icon: CheckCircle2, desc: '工作日 18:00 提醒未完成任务', prompt: '每个工作日下午6点检查我未完成的钉钉待办，并按优先级提醒。', kb: '钉钉待办', schedule: { cycle: 'workday', time: '18:00' } },
    { title: '单次客户提醒', icon: Bell, desc: '2026-07-02 14:41 提醒客户跟进', prompt: '在指定时间提醒我跟进客户团购方案，并附上上次沟通要点。', kb: '客户跟进记录', schedule: { cycle: 'once', date: '2026-07-02', time: '14:41' } },
  ]
  if (selectedAgent.value === 'allround') {
    if (activeCaseCategory.value === '咨询调研') return quickCases.filter((item) => item.title === '品牌调研报告' || item.title === '搜行业动态')
    if (activeCaseCategory.value === 'office办公') return [...dingtalkCases, quickCases.find((item) => item.title === '名单双表格')].filter(Boolean) as CaseItem[]
    if (activeCaseCategory.value === '应用开发') return [{ title: '应用需求拆解', icon: LayoutGrid, desc: '把想法拆成页面和接口清单', prompt: '帮我把一个内部工具需求拆成页面、字段、交互和接口清单。', kb: '应用开发模板库' }]
    return quickCases.filter((item) => ['AI复合型岗位趋势', '品牌调研报告', '名单双表格'].includes(item.title))
  }
  return quickCases.filter((item) => ['AI复合型岗位趋势', '品牌调研报告', '名单双表格'].includes(item.title))
})
const artifactPreviewVisible = computed(() => Boolean(activeArtifactPreview.value))
const placeholder = computed(() => {
  if (runMode.value === 'task' && !selectedExpert.value) return '请在下方选择合适的专家，小马会把任务托付给他/她高效完成'
  if (runMode.value === 'task') return `${selectedExpert.value?.label ?? '专家'}已就绪，说说具体任务目标吧`
  if (runMode.value === 'schedule') return '描述要周期执行的任务，例如每天早上生成方案池更新摘要'
  return '全能助手在线，试试提问、上传文件或引用知识库吧'
})
const modeLabel = computed(() => {
  if (runMode.value === 'task') return '专家模式'
  if (runMode.value === 'schedule') return '定时任务'
  return '日常办公'
})
const agentSelectLabel = computed(() => runMode.value === 'task' ? '专家' : '助手')
const scheduleCycleLabel = computed(() => scheduleCycles.find((item) => item.value === scheduleCycle.value)?.label ?? '每天')
const scheduleSummary = computed(() => {
  if (scheduleCycle.value === 'cron') return `Cron：${scheduleCron.value}`
  if (scheduleCycle.value === 'once') return `${scheduleDate.value} ${scheduleTime.value}`
  if (scheduleCycle.value === 'weekly') return `${scheduleCycleLabel.value} ${scheduleWeekday.value} ${scheduleTime.value}`
  if (scheduleCycle.value === 'monthly') return `${scheduleCycleLabel.value} ${scheduleMonthDay.value} ${scheduleTime.value}`
  return `${scheduleCycleLabel.value} ${scheduleTime.value}`
})
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
  '--right-inset': artifactPreviewVisible.value ? 'clamp(420px,42vw,760px)' : '0px',
  width: 'min(calc(100vw - var(--left-inset) - var(--right-inset) - clamp(36px,5vw,88px)), clamp(760px,74vw,1320px))',
  transform: 'translateX(calc((var(--left-inset) - var(--right-inset)) / 2))',
}))
const chatTitleLayerStyle = computed(() => ({
  '--left-inset': isChatActive.value && showHistory.value ? 'clamp(286px,21vw,400px)' : '0px',
  '--right-inset': artifactPreviewVisible.value ? 'clamp(420px,42vw,760px)' : '0px',
  left: 'var(--left-inset)',
  right: 'var(--right-inset)',
}))
const homeHeroStyle = computed(() => ({
  '--left-inset': showHistory.value ? 'clamp(286px,21vw,400px)' : '0px',
  '--right-inset': rightPanelVisible.value ? 'clamp(286px,21vw,400px)' : '0px',
  width: 'min(calc(100vw - var(--left-inset) - var(--right-inset) - clamp(36px,5vw,88px)), clamp(760px,72vw,1280px))',
  transform: 'translateX(calc((var(--left-inset) - var(--right-inset)) / 2))',
}))
const attachmentTrees: Record<AttachmentSpace, AttachmentNode[]> = {
  public: [
    {
      id: 'attach-solution',
      label: '方案中心',
      type: 'folder',
      children: [
        {
          id: 'attach-solution-cases',
          label: '方案中心案例库',
          type: 'folder',
          children: [
            { id: 'attach-sneaker-case', label: '运动鞋团购成功案例.md', type: 'file', meta: 'MD · 61.09 KB · 2026/6/25' },
            { id: 'attach-budget', label: '团购通用预算池.xlsx', type: 'file', meta: 'XLSX · 11.76 KB · 2026/6/24' },
          ],
        },
        {
          id: 'attach-budget-pool',
          label: '团购预算池',
          type: 'folder',
          children: [
            { id: 'attach-q1-budget', label: '2026Q1预算执行表.xlsx', type: 'file', meta: 'XLSX · 18.24 KB · 2026/6/20' },
          ],
        },
      ],
    },
    {
      id: 'attach-product',
      label: '商品资料',
      type: 'folder',
      children: [
        { id: 'attach-product-dict', label: '商品数据字典.xlsx', type: 'file', meta: 'XLSX · 13.47 KB · 2026/6/1' },
      ],
    },
  ],
  personal: [
    {
      id: 'attach-my-customer',
      label: '我的客户资料',
      type: 'folder',
      children: [
        { id: 'attach-customer-a', label: '客户A需求记录.md', type: 'file', meta: 'MD · 9.8 KB · 2026/6/28' },
      ],
    },
    {
      id: 'attach-drafts',
      label: '临时方案草稿',
      type: 'folder',
      children: [
        { id: 'attach-draft-note', label: '临时方案笔记.md', type: 'file', meta: 'MD · 7.2 KB · 2026/6/27' },
      ],
    },
  ],
}
const currentAttachmentNode = computed(() => findAttachmentNode(attachmentTrees[attachmentSpace.value], attachmentPath.value.at(-1) ?? ''))
const currentAttachmentItems = computed(() => currentAttachmentNode.value?.children ?? attachmentTrees[attachmentSpace.value])
const filteredAttachmentItems = computed(() => {
  const q = kbAttachmentSearch.value.trim().toLowerCase()
  return q ? currentAttachmentItems.value.filter((item) => item.label.toLowerCase().includes(q)) : currentAttachmentItems.value
})

function selectMode(mode: RunMode) {
  runMode.value = mode
  selectedAgent.value = mode === 'task' ? '' : 'allround'
  activeCaseCategory.value = '精选案例'
  showRecommendations.value = true
  modeMenuOpen.value = false
  agentMenuOpen.value = false
}
function selectAgent(agentValue: string) {
  if (agentValue.startsWith('soon')) return
  selectedAgent.value = agentValue
  activeCaseCategory.value = '精选案例'
  showRecommendations.value = true
  agentMenuOpen.value = false
}

function clearSelectedExpert() {
  if (runMode.value !== 'task') return
  selectedAgent.value = ''
  query.value = ''
  activeReference.value = null
  showRecommendations.value = true
}

function updateScheduleCycle(value: ScheduleCycle) {
  scheduleCycle.value = value
  if (!scheduleTimeOptions.includes(scheduleTime.value)) scheduleTime.value = '09:00'
}

function applySchedulePreset(item: CaseItem) {
  if (!item.schedule) return
  if (item.schedule.cycle) scheduleCycle.value = item.schedule.cycle
  if (item.schedule.date) scheduleDate.value = item.schedule.date
  if (item.schedule.time) scheduleTime.value = item.schedule.time
  if (item.schedule.weekday) scheduleWeekday.value = item.schedule.weekday
  if (item.schedule.monthDay) scheduleMonthDay.value = item.schedule.monthDay
}

function updateComposerGlow(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  target.style.setProperty('--composer-x', `${((event.clientX - rect.left) / rect.width) * 100}%`)
  target.style.setProperty('--composer-y', `${((event.clientY - rect.top) / rect.height) * 100}%`)
}

function resetComposerGlow(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  target.style.setProperty('--composer-x', '50%')
  target.style.setProperty('--composer-y', '50%')
}

function createReferenceFromCase(item: CaseItem, mode: RunMode): ActiveReference {
  const nextMode = mode === 'task' ? '专家模式' : mode === 'schedule' ? '定时任务' : '日常办公'
  const agent = currentAgentOptions.value.find((option) => option.value === selectedAgent.value)?.label
    ?? (mode === 'task' ? '未选择专家' : '全能助手')
  return {
    title: item.title,
    mode: nextMode,
    agent,
    kb: item.kb ?? (mode === 'quick' ? '办公知识库' : '方案中心知识库'),
    desc: item.desc,
  }
}

async function fillPrompt(item: CaseItem | string, mode: RunMode = runMode.value) {
  if (runMode.value !== mode) selectMode(mode)
  if (typeof item === 'string') {
    query.value = item
  } else {
    query.value = item.prompt
    if (mode === 'schedule') applySchedulePreset(item)
  }
  await nextTick()
  resizeComposer()
}

function triggerFilePicker() {
  attachmentModalOpen.value = true
  activeAttachmentTab.value = 'local'
}

function chooseLocalFiles() {
  fileInput.value?.click()
}

function handleFiles(event: Event) {
  const files = Array.from((event.target as HTMLInputElement).files || [])
  selectedFiles.value = [...selectedFiles.value, ...files.filter(isSupportedUpload).map((file) => file.name)]
  ;(event.target as HTMLInputElement).value = ''
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1)
}

function addKnowledgeAttachment(name: string) {
  if (!selectedFiles.value.includes(name)) selectedFiles.value.push(name)
  if (!selectedKbDocNames.value.includes(name)) selectedKbDocNames.value.push(name)
}

function switchAttachmentSpace(space: AttachmentSpace, scope: 'all' | AttachmentSpace = space) {
  attachmentSpace.value = space
  attachmentScope.value = scope
  attachmentPath.value = []
  kbAttachmentSearch.value = ''
}

function chooseAttachmentNode(node: AttachmentNode) {
  if (node.type === 'file') {
    addKnowledgeAttachment(node.label)
    return
  }
  attachmentPath.value = [...attachmentPath.value, node.id]
  kbAttachmentSearch.value = ''
}

function backAttachmentFolder() {
  attachmentPath.value = attachmentPath.value.slice(0, -1)
}

function addAttachmentsAndClose() {
  for (const name of selectedKbDocNames.value) {
    if (!selectedFiles.value.includes(name)) {
      selectedFiles.value.push(name)
    }
  }
  selectedKbDocNames.value = []
  attachmentModalOpen.value = false
}

function findAttachmentNode(nodes: AttachmentNode[], id: string): AttachmentNode | undefined {
  if (!id) return undefined
  for (const node of nodes) {
    if (node.id === id) return node
    const child = node.children ? findAttachmentNode(node.children, id) : undefined
    if (child) return child
  }
  return undefined
}

function removeAttachmentByName(name: string) {
  selectedFiles.value = selectedFiles.value.filter((file) => file !== name)
  selectedKbDocNames.value = selectedKbDocNames.value.filter((file) => file !== name)
}

function getConversationStatusLabel(status: ConversationItem['status']) {
  if (status === 'running') return '运行中'
  if (status === 'failed') return '失败'
  if (status === 'cancelled') return '已取消'
  return '已完成'
}

function getConversationStatusClass(status: ConversationItem['status']) {
  if (status === 'running') return 'bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.12)] animate-pulse'
  if (status === 'failed') return 'bg-rose-500'
  if (status === 'cancelled') return 'bg-zinc-400'
  return 'bg-emerald-500'
}

function getConversationDetail(item: ConversationItem) {
  if (item.mode === '专家模式') {
    if (item.title.includes('团购')) return '围绕客户预算、品类偏好和现场沟通诉求，沉淀方案匹配、组货清单和交付建议。'
    if (item.title.includes('门店')) return '把门店客户口述需求整理为标准字段，便于后续进入组货专家流程。'
    return '复杂专项任务，包含任务理解、计划拆解、工具调用和最终方案整合。'
  }
  if (item.mode === '定时任务') return '周期性自动化任务，用于监控方案池、提醒待办或生成固定简报。'
  if (item.title.includes('考勤')) return '围绕集团考勤制度进行轻量问答，未触发复杂专家流程。'
  return '日常办公对话，适合资料整理、知识库查询、联网检索和轻量协同。'
}

function isSidebarGroupCollapsed(key: RunMode) {
  return collapsedSidebarGroups.value.includes(key)
}

function toggleSidebarGroup(key: RunMode) {
  collapsedSidebarGroups.value = isSidebarGroupCollapsed(key)
    ? collapsedSidebarGroups.value.filter((item) => item !== key)
    : [...collapsedSidebarGroups.value, key]
}

function beginEditSidebarTitle() {
  sidebarTitleDraft.value = sidebarTitle.value
  editingSidebarTitle.value = true
}

function commitSidebarTitle() {
  const next = sidebarTitleDraft.value.trim()
  if (next) sidebarTitle.value = next
  editingSidebarTitle.value = false
}

function openHistoryBrowser() {
  showHistoryBrowser.value = true
  isChatActive.value = false
  showHistory.value = true
  showRecommendations.value = true
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
  if (typeof el.scrollTo === 'function') el.scrollTo({ top: el.scrollHeight, behavior: isThinking.value ? 'auto' : 'smooth' })
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
  const nearBottom = isNearBottom(el)
  if (nearBottom) {
    isAutoScroll.value = true
    userScrollIntent.value = false
    showBackToLatest.value = false
    return
  }
  if (userScrollIntent.value || !nearBottom) {
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
  if (runMode.value === 'schedule') return 'schedule-task'
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
  if (route === 'schedule-task') return quickProcessEvents
  return route === 'expert-task' ? solutionProcessEvents : quickProcessEvents
}

function getGenerationChunks(route: IntentRoute, prompt = '') {
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
  if (route === 'schedule-task') {
    return [
      '## 定时任务已安排\n\n',
      `### 执行周期\n${scheduleSummary.value}\n\n`,
      '### 任务内容\n',
      `${prompt || '按当前设置周期执行提醒与资料整理。'}\n\n`,
      '### 后续管理\n',
      '- 可在左侧栏「自动化」中查看状态、暂停任务或立即启动。\n',
      '- 执行结果会沉淀到对应会话，涉及文件的产物会以文件卡片展示在对话中。',
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
    '- 已生成 Excel 组货清单、PPT 客户方案和 PDF 方案画册，可在下方文件卡片中预览或下载。',
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
  if (runMode.value === 'schedule') return '定时任务安排'
  if (content.includes('团购')) return 'B2B团购组货方案'
  if (content.includes('考勤')) return '考勤制度问答'
  if (content.includes('待办')) return '钉钉待办创建'
  const compact = content.replace(/\s+/g, '').slice(0, 12)
  return compact || '新会话'
}

async function sendMessage() {
  if (!canSend.value) return
  const content = query.value.trim()

  const token = ++generationToken
  const conversationId = activeConversationId.value || `conv-${Date.now()}`
  const draftTitle = summarizeDraftTitle(content)
  activeConversationId.value = conversationId
  activeConversationTitle.value = draftTitle
  if (!conversations.value.some((item) => item.id === conversationId)) {
    conversations.value = [
      {
        id: conversationId,
        title: draftTitle,
        time: '刚刚',
        mode: modeLabel.value,
        pinned: false,
        status: 'running',
      },
      ...conversations.value,
    ]
  } else {
    conversations.value = conversations.value.map((item) => (
      item.id === conversationId ? { ...item, title: draftTitle, mode: modeLabel.value, time: '刚刚', status: 'running' } : item
    ))
  }
  generationInterrupted.value = false
  isChatActive.value = true
  showHistoryBrowser.value = false
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
  query.value = ''
  resizeComposer()
  await generateAssistantReply(content, conversationId, draftTitle, token, selectedFiles.value.length > 0)
}

async function generateAssistantReply(content: string, conversationId: string, draftTitle: string, token: number, hasFiles = false) {
  isThinking.value = true
  await scrollToLatest(true)

  const route = classifyIntent(content, hasFiles)
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

  const chunks = getGenerationChunks(route, content)
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
    conversations.value = conversations.value.map((item) => (
      item.id === conversationId ? { ...item, status: generationInterrupted.value ? 'failed' : 'completed' } : item
    ))
    if (!generationInterrupted.value) {
      store.addTaskNotification({
        conversationId,
        messageId: assistantId,
        title: `${draftTitle} 已完成`,
      })
    }
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
  if (activeConversationId.value) {
    conversations.value = conversations.value.map((item) => (
      item.id === activeConversationId.value ? { ...item, status: 'failed' } : item
    ))
  }
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

function closeFloatingMenus() {
  modeMenuOpen.value = false
  agentMenuOpen.value = false
  activeMenuConversationId.value = null
}

async function copyAnswer(message: Message) {
  copiedMessageId.value = message.id
  try {
    await navigator.clipboard?.writeText(message.content)
  } catch {
    // Mock prototype fallback: state feedback is enough when clipboard is unavailable in tests.
  }
}

async function copyUserMessage(message: Message) {
  copiedMessageId.value = message.id
  try {
    await navigator.clipboard?.writeText(message.content)
  } catch {
    // Prototype feedback is enough when clipboard is blocked.
  }
}

function openArtifactPreview(file: GeneratedArtifact) {
  activeArtifactPreview.value = file
}

function closeArtifactPreview() {
  activeArtifactPreview.value = null
}

function downloadArtifact(file: GeneratedArtifact) {
  copiedMessageId.value = `download:${file.name}`
  window.setTimeout(() => {
    if (copiedMessageId.value === `download:${file.name}`) copiedMessageId.value = ''
  }, 1600)
}

function beginEditUserMessage(message: Message) {
  editingUserMessageId.value = message.id
  editingUserMessageDraft.value = message.content
}

async function saveAndResendUserMessage(message: Message) {
  const nextContent = editingUserMessageDraft.value.trim()
  if (!nextContent) return
  const token = ++generationToken
  message.content = nextContent
  const messageIndex = messages.value.findIndex((item) => item.id === message.id)
  if (messageIndex >= 0) messages.value = messages.value.slice(0, messageIndex + 1)
  const conversationId = activeConversationId.value || `conv-${Date.now()}`
  const draftTitle = summarizeDraftTitle(nextContent)
  activeConversationId.value = conversationId
  activeConversationTitle.value = draftTitle
  conversations.value = conversations.value.map((item) => (
    item.id === conversationId ? { ...item, title: draftTitle, time: '刚刚', status: 'running' } : item
  ))
  query.value = ''
  resizeComposer()
  editingUserMessageId.value = ''
  editingUserMessageDraft.value = ''
  generationInterrupted.value = false
  await generateAssistantReply(nextContent, conversationId, draftTitle, token)
}

function quoteAnswer(message: Message) {
  quotedMessageId.value = message.id
  query.value = `引用上一条回答继续：${message.content.slice(0, 60)}...`
  nextTick(() => composer.value?.focus())
}

function retryUserMessage(message: Message) {
  const msgIndex = messages.value.findIndex((m) => m.id === message.id)
  if (msgIndex >= 0) {
    messages.value = messages.value.slice(0, msgIndex)
  }
  query.value = message.content
  sendMessage()
}

function resetConversationDraft() {
  generationInterrupted.value = false
  generationToken += 1
  isThinking.value = false
  messages.value = []
  query.value = ''
  selectedFiles.value = []
  selectedKbDocNames.value = []
  attachmentModalOpen.value = false
  activeAttachmentTab.value = 'local'
  attachmentScope.value = 'all'
  attachmentSpace.value = 'public'
  attachmentPath.value = []
  hasGeneratedAssets.value = false
  activeArtifactPreview.value = null
  activeReference.value = null
  selectedKnowledgeRefs.value = []
  isRightPanelCollapsed.value = false
  selectedAgent.value = 'allround'
  runMode.value = 'quick'
  activeConversationTitle.value = '新会话'
  activeConversationId.value = ''
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
  isChatActive.value = false
  showHistoryBrowser.value = false
  showHistory.value = true
  showRecommendations.value = true
}

function openConversation(item: ConversationItem) {
  isChatActive.value = true
  showHistoryBrowser.value = false
  showHistory.value = true
  activeConversationId.value = item.id
  activeConversationTitle.value = item.title
  runMode.value = item.mode === '专家模式' ? 'task' : 'quick'
  selectedAgent.value = item.mode === '专家模式' ? 'solution' : 'knowledge'
  hasGeneratedAssets.value = item.mode === '专家模式'
  activeArtifactPreview.value = null
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
  store.clearConversationNotification(item.id)
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
  showHistoryBrowser.value = false
  showHistory.value = false
  resetConversationDraft()
}

function toggleConversationMenu(id: string, event: MouseEvent) {
  event.stopPropagation()
  activeMenuConversationId.value = activeMenuConversationId.value === id ? null : id
}

onMounted(() => {
  window.addEventListener('tianma:home-reset', resetToHome)
  document.addEventListener('selectionchange', handleSelectionChange)
  document.addEventListener('click', closeFloatingMenus)
})

watch(() => route.query.conversationId, (id) => {
  if (!id || typeof id !== 'string') return
  const item = conversations.value.find((conversation) => conversation.id === id)
  if (item) {
    openConversation(item)
    nextTick(() => {
      const target = document.querySelector(`[data-conversation-anchor="${id}"]`)
      target?.scrollIntoView({ block: 'center' })
    })
  } else {
    isChatActive.value = true
    showHistory.value = true
    activeConversationId.value = id
    activeConversationTitle.value = '任务结果'
  }
}, { immediate: true })

onBeforeUnmount(() => {
  window.removeEventListener('tianma:home-reset', resetToHome)
  document.removeEventListener('selectionchange', handleSelectionChange)
  document.removeEventListener('click', closeFloatingMenus)
  generationToken += 1
})
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] bg-[#f6f7f9] text-zinc-950 md:min-h-[calc(100vh-4rem)]">
    <div v-if="!showHistory" data-testid="home-side-dock" class="fixed left-3 top-[4.75rem] z-40 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white/95 p-1 shadow-sm backdrop-blur">
      <button
        type="button"
        data-testid="home-sidebar-toggle"
        class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-zinc-100"
        aria-label="展开历史对话栏"
        @click="showHistory = true"
      >
        <ChevronsRight class="h-4 w-4" />
      </button>
      <button
        type="button"
        class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700"
        aria-label="新建对话"
        title="新建对话"
        @click="newTask"
      >
        <Plus class="h-4 w-4" />
      </button>
    </div>
    <div v-if="false" data-testid="home-right-dock" class="fixed right-3 top-[4.75rem] z-40">
      <div class="flex items-center gap-2">
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
          aria-label="展开资产栏"
          @click="isRightPanelCollapsed = false"
        >
          <ChevronsLeft class="h-4 w-4" />
        </button>
      </div>
    </div>
    <div class="relative mx-auto min-h-[calc(100vh-3.5rem)] w-full max-w-[1800px] md:min-h-[calc(100vh-4rem)]">
      <aside
        class="fixed inset-y-0 left-0 z-50 flex w-[clamp(286px,21vw,400px)] flex-col border-r border-zinc-200 bg-white transition-transform duration-300 lg:top-16 lg:h-[calc(100vh-4rem)]"
        :class="showHistory ? 'translate-x-0' : '-translate-x-full'"
      >
        <div data-testid="home-sidebar-subheader" class="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-3">
          <div class="group/title min-w-0 flex-1">
            <div v-if="editingSidebarTitle" class="flex items-center gap-1">
              <input
                v-model="sidebarTitleDraft"
                class="h-7 min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-2 text-sm font-semibold text-zinc-900 outline-none ring-2 ring-blue-50"
                aria-label="修改侧边栏标题"
                @keydown.enter.prevent="commitSidebarTitle"
                @keydown.esc.prevent="editingSidebarTitle = false"
                @blur="commitSidebarTitle"
              />
            </div>
            <div v-else class="flex min-w-0 items-center gap-1">
              <div class="truncate text-sm font-semibold text-zinc-900">{{ sidebarTitle }}</div>
              <button type="button" class="rounded-md p-1 text-zinc-300 opacity-0 transition hover:bg-zinc-100 hover:text-zinc-700 group-hover/title:opacity-100" aria-label="修改侧边栏标题" @click="beginEditSidebarTitle">
                <Pencil class="h-3.5 w-3.5" />
              </button>
            </div>
            <div class="mt-0.5 text-[11px] text-zinc-400">按模式预览最近任务</div>
          </div>
          <button
            type="button"
            data-testid="home-sidebar-toggle"
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
            aria-label="收起历史对话栏"
            @click="showHistory = false"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
        </div>
        <div class="space-y-3 border-b border-zinc-100 p-3">
          <div class="grid gap-1">
            <button type="button" class="flex min-h-[38px] items-center gap-2 rounded-lg px-2.5 text-left text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900" @click="newTask">
              <Plus class="h-3.5 w-3.5" />
              <span class="min-w-0 flex-1">新对话</span>
            </button>
            <button type="button" class="flex min-h-[38px] items-center gap-2 rounded-lg px-2.5 text-left text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900" @click="openHistoryBrowser">
              <History class="h-3.5 w-3.5" />
              <span class="min-w-0 flex-1">历史会话</span>
            </button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-2">
          <div v-for="group in sidebarConversationGroups" :key="group.key" class="mb-4">
            <button type="button" class="mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] font-medium text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-700" :aria-expanded="!isSidebarGroupCollapsed(group.key)" @click="toggleSidebarGroup(group.key)">
              <span class="inline-flex min-w-0 items-center gap-1.5">
                <ChevronRight class="h-3.5 w-3.5 transition" :class="isSidebarGroupCollapsed(group.key) ? '' : 'rotate-90'" />
                <span>{{ group.label }}</span>
              </span>
              <span>{{ group.items.length }}</span>
            </button>
           <template v-if="!isSidebarGroupCollapsed(group.key)">
            <div
              v-for="item in group.items.slice(0, 3)"
              :key="item.id"
              class="group relative mb-1"
            >
              <button
                data-testid="history-conversation-item"
                type="button"
                class="w-full rounded-lg border border-transparent px-3 py-2.5 pr-9 text-left transition hover:border-blue-200 hover:bg-blue-50"
                :class="activeConversationId === item.id ? 'border-blue-200 bg-blue-50' : ''"
                @click="openConversation(item)"
              >
                <div class="flex items-center gap-2">
                  <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="getConversationStatusClass(item.status)" />
                  <span class="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800">{{ item.title }}</span>
                </div>
                <div class="mt-1.5 truncate pl-4 text-[11px] leading-5 text-zinc-400">{{ item.time }} · {{ getConversationStatusLabel(item.status) }}</div>
              </button>
              <button
                type="button"
                class="absolute right-1.5 top-2 hidden h-6 w-6 items-center justify-center rounded-md text-zinc-400 opacity-0 transition hover:bg-zinc-200 hover:text-zinc-600 group-hover:flex group-hover:opacity-100"
                @click="toggleConversationMenu(item.id, $event)"
              >
                <MoreHorizontal class="h-3.5 w-3.5" />
              </button>
              <div
                v-if="activeMenuConversationId === item.id"
                class="absolute right-0 top-9 z-50 w-32 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
                @click.stop
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
                  @click="beginRenameConversation(item); activeMenuConversationId = null"
                >
                  <Pencil class="h-3.5 w-3.5 text-zinc-400" />
                  <span>重命名</span>
                </button>
                <button
                  type="button"
                  class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                  @click="deleteConversation(item.id); activeMenuConversationId = null"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                  <span>删除</span>
                </button>
              </div>
            </div>
            <button
              v-if="group.items.length > 3"
              type="button"
              class="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
              @click="openHistoryBrowser"
            >
              更多 {{ group.label }} 会话...
            </button>
            </template>
          </div>
        </div>
      </aside>

      <main class="flex min-h-[calc(100vh-3.5rem)] flex-col px-[clamp(12px,2.2vw,34px)] py-[clamp(14px,1.6vw,24px)] md:min-h-[calc(100vh-4rem)]">
        <input ref="fileInput" class="hidden" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg" @change="handleFiles" />
        <section
          v-if="!isChatActive && !showHistoryBrowser"
          data-testid="home-hero-section"
          class="mx-auto flex flex-1 flex-col items-center justify-start pb-[clamp(18px,3vw,36px)] pt-[clamp(58px,10vh,118px)] transition-[width,transform] duration-300"
          :style="homeHeroStyle"
        >
          <div class="mb-7 text-center">
            <img :src="ponyAvatarUrl" alt="小马头像" class="mx-auto mb-5 h-[clamp(92px,7vw,132px)] w-[clamp(92px,7vw,132px)] object-contain drop-shadow-[0_18px_32px_rgba(15,23,42,0.12)]" />
            <h1 class="text-[clamp(24px,2.2vw,40px)] font-semibold leading-tight tracking-tight text-zinc-950">小马在线，有事随时说</h1>
          </div>

          <div data-testid="hero-composer" class="composer-shell mx-auto w-full max-w-[920px] rounded-[28px] border border-zinc-200 bg-white p-3 shadow-[0_18px_60px_rgba(15,23,42,0.08)]" @pointermove="updateComposerGlow" @pointerleave="resetComposerGlow">
            <div class="flex items-start gap-2 px-2">
              <div v-if="runMode === 'task' && selectedExpert" class="mt-2 inline-flex max-w-[180px] shrink-0 items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700">
                <Sparkles class="h-3.5 w-3.5 shrink-0" />
                <span class="truncate">{{ selectedExpert.label }}</span>
                <button type="button" class="rounded-md p-0.5 hover:bg-violet-100" aria-label="移除已选专家" @click="clearSelectedExpert">
                  <X class="h-3.5 w-3.5" />
                </button>
              </div>
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
                :class="canSend ? 'bg-zinc-950 text-white hover:bg-zinc-800' : 'cursor-not-allowed bg-zinc-100 text-zinc-300'"
                :disabled="!canSend"
                :aria-label="isThinking ? '小马正在生成中' : '发送给小马'"
                @click="sendMessage"
              >
                <ArrowUp class="h-5 w-5" />
              </button>
            </div>
            <div v-if="query" class="flex justify-end px-2 pb-1">
              <button type="button" class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="清空输入内容" @click="query = ''; resizeComposer()">
                <X class="h-3.5 w-3.5" /> 清空
              </button>
            </div>



            <div class="flex flex-wrap items-center gap-2 border-t border-zinc-100 px-2 pt-3">
              <div v-if="runMode !== 'schedule'" class="relative">
                <button
                  class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  aria-label="添加附件"
                  @mouseenter="showUploadTip = true"
                  @mouseleave="showUploadTip = false"
                  @focus="showUploadTip = true"
                  @blur="showUploadTip = false"
                  @click="triggerFilePicker"
                >
                  <Paperclip class="h-3.5 w-3.5" />
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
              <div class="relative">
                <button
                  type="button"
                  class="inline-flex h-8 items-center gap-1.5 px-2 text-xs font-medium transition"
                  :class="'text-zinc-950'"
                  aria-label="选择模式"
                  @click.stop="modeMenuOpen = !modeMenuOpen; agentMenuOpen = false"
                >
                  <Zap v-if="runMode === 'quick'" class="h-3.5 w-3.5" />
                  <Bot v-else-if="runMode === 'task'" class="h-3.5 w-3.5" />
                  <CalendarDays v-else class="h-3.5 w-3.5" />
                  {{ modeLabel }}
                  <ChevronDown class="h-3.5 w-3.5" />
                </button>
                <div v-if="modeMenuOpen" class="absolute bottom-full left-0 z-50 mb-2 w-56 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1 shadow-2xl">
                  <button type="button" data-testid="mode-option-quick" class="flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-zinc-50" @click.stop="selectMode('quick')">
                    <Zap class="mt-0.5 h-4 w-4 text-orange-500" />
                    <span class="min-w-0 flex-1">
                      <span class="block text-sm font-medium text-zinc-900">日常办公</span>
                      <span class="block text-xs leading-5 text-zinc-400">适合日常轻度办公任务</span>
                    </span>
                    <CheckCircle2 v-if="runMode === 'quick'" class="mt-0.5 h-4 w-4 text-blue-600" />
                  </button>
                  <button type="button" data-testid="mode-option-task" class="flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-zinc-50" @click.stop="selectMode('task')">
                    <Bot class="mt-0.5 h-4 w-4 text-violet-600" />
                    <span class="min-w-0 flex-1">
                      <span class="block text-sm font-medium text-zinc-900">专家模式</span>
                      <span class="block text-xs leading-5 text-zinc-400">处理复杂的专项类任务</span>
                    </span>
                    <CheckCircle2 v-if="runMode === 'task'" class="mt-0.5 h-4 w-4 text-blue-600" />
                  </button>
                  <button type="button" data-testid="mode-option-schedule" class="flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-zinc-50" @click.stop="selectMode('schedule')">
                    <CalendarDays class="mt-0.5 h-4 w-4 text-blue-600" />
                    <span class="min-w-0 flex-1">
                      <span class="block text-sm font-medium text-zinc-900">定时任务</span>
                      <span class="block text-xs leading-5 text-zinc-400">设置周期性自动化任务</span>
                    </span>
                    <CheckCircle2 v-if="runMode === 'schedule'" class="mt-0.5 h-4 w-4 text-blue-600" />
                  </button>
                </div>
              </div>
              <div v-if="runMode === 'task' && selectedExpert" class="group/agent relative ml-auto">
                <button
                  type="button"
                  class="inline-flex h-8 min-w-28 items-center justify-between gap-2 px-2 text-xs font-medium text-violet-700"
                  :aria-label="`选择${agentSelectLabel}`"
                  @click.stop="agentMenuOpen = !agentMenuOpen; modeMenuOpen = false"
                >
                  <span class="truncate">{{ currentAgentLabel }}</span>
                  <ChevronDown class="h-3.5 w-3.5 shrink-0" />
                </button>
                <div class="pointer-events-none absolute bottom-full right-0 z-40 mb-2 w-64 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left text-xs leading-5 text-zinc-500 opacity-0 shadow-xl transition group-hover/agent:opacity-100 group-focus-within/agent:opacity-100">
                  {{ currentAgentDescription }}
                </div>
                <div v-if="agentMenuOpen" class="absolute bottom-full right-0 z-50 mb-2 w-60 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1 shadow-2xl">
                  <button
                    v-for="agent in currentAgentOptions"
                    :key="agent.value"
                    type="button"
                    :data-testid="`agent-option-${agent.value}`"
                    class="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition"
                    :class="agent.value.startsWith('soon') ? 'cursor-not-allowed text-zinc-300' : 'text-zinc-700 hover:bg-zinc-50'"
                    @click.stop="selectAgent(agent.value)"
                  >
                    <Sparkles class="h-4 w-4 shrink-0 text-violet-500" />
                    <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ agent.label }}</span>
                    <CheckCircle2 v-if="selectedAgent === agent.value" class="h-4 w-4 shrink-0 text-blue-600" />
                  </button>
                </div>
              </div>
            </div>

         <div v-if="runMode === 'schedule'" class="schedule-panel mt-3">
           <div class="schedule-layer schedule-layer-top">
             <span class="schedule-title">周期</span>
             <select :value="scheduleCycle" class="schedule-field schedule-field-main" aria-label="选择定时周期" @change="updateScheduleCycle(($event.target as HTMLSelectElement).value as ScheduleCycle)">
               <option v-for="cycle in scheduleCycles" :key="cycle.value" :value="cycle.value">{{ cycle.label }}</option>
             </select>
           </div>
           <div class="schedule-layer schedule-layer-bottom">
             <template v-if="scheduleCycle === 'once'">
               <input v-model="scheduleDate" type="date" class="schedule-field schedule-field-main" aria-label="选择执行日期" />
               <input v-model="scheduleTime" type="time" class="schedule-field schedule-field-main" aria-label="输入执行时间" />
             </template>
             <template v-else-if="scheduleCycle === 'weekly'">
               <select v-model="scheduleWeekday" class="schedule-field schedule-field-main" aria-label="选择星期">
                 <option v-for="day in weekdayOptions" :key="day" :value="day">{{ day }}</option>
               </select>
               <input v-model="scheduleTime" type="time" class="schedule-field schedule-field-main" aria-label="输入执行时间" />
             </template>
             <template v-else-if="scheduleCycle === 'monthly'">
               <select v-model="scheduleMonthDay" class="schedule-field schedule-field-main" aria-label="选择日期">
                 <option v-for="day in monthDayOptions" :key="day" :value="day">{{ day }}</option>
               </select>
               <input v-model="scheduleTime" type="time" class="schedule-field schedule-field-main" aria-label="输入执行时间" />
             </template>
             <template v-else-if="scheduleCycle === 'cron'">
               <input v-model="scheduleCron" class="schedule-field schedule-field-cron font-mono" placeholder="0 9 * * *" aria-label="输入 Cron 表达式" />
             </template>
             <template v-else>
               <span class="schedule-field schedule-field-main schedule-field-muted">{{ scheduleCycle === 'daily' ? '每天' : '周一至周五' }}</span>
               <input v-model="scheduleTime" type="time" class="schedule-field schedule-field-main" aria-label="输入执行时间" />
             </template>
             <span class="schedule-summary">{{ scheduleCycle === 'cron' ? 'Cron 例：0 9 * * *' : scheduleSummary }}</span>
           </div>
         </div>
            <div v-if="runMode === 'schedule'" class="mt-3 space-y-1.5">
              <div class="schedule-card">
                <span class="schedule-card-label">执行</span>
                <template v-if="scheduleCycle === 'once'">
                  <input v-model="scheduleDate" type="date" class="schedule-card-input" aria-label="选择执行日期" />
                </template>
                <template v-else-if="scheduleCycle === 'weekly'">
                  <select v-model="scheduleWeekday" class="schedule-card-input" aria-label="选择星期">
                    <option v-for="day in weekdayOptions" :key="day" :value="day">{{ day }}</option>
                  </select>
                </template>
                <template v-else-if="scheduleCycle === 'monthly'">
                  <select v-model="scheduleMonthDay" class="schedule-card-input" aria-label="选择日期">
                    <option v-for="day in monthDayOptions" :key="day" :value="day">{{ day }}</option>
                  </select>
                </template>
                <input v-if="scheduleCycle === 'cron'" v-model="scheduleCron" class="schedule-card-input schedule-card-cron font-mono" placeholder="0 9 * * *" aria-label="输入 Cron 表达式" />
                <input v-else v-model="scheduleTime" type="time" class="schedule-card-input" aria-label="输入执行时间" />
                <span class="schedule-card-summary">{{ scheduleCycle === 'cron' ? '例：0 9 * * *' : scheduleSummary }}</span>
              </div>
              <div class="schedule-card">
                <span class="schedule-card-label">周期</span>
                <select :value="scheduleCycle" class="schedule-card-input" aria-label="选择定时周期" @change="updateScheduleCycle(($event.target as HTMLSelectElement).value as ScheduleCycle)">
                  <option v-for="cycle in scheduleCycles" :key="cycle.value" :value="cycle.value">{{ cycle.label }}</option>
                </select>
              </div>
            </div>

          </div>

          <Transition name="recommend">
            <div v-if="showRecommendations" data-testid="home-case-section" class="mt-8 w-full">
              <div v-if="runMode === 'quick'" class="mb-7 flex justify-center gap-10 text-sm">
                <button
                  v-for="category in ['精选案例', '咨询调研', 'office办公', '应用开发']"
                  :key="category"
                  type="button"
                  class="border-b-2 px-1 pb-1 transition"
                  :class="activeCaseCategory === category ? 'border-zinc-950 font-semibold text-zinc-950' : 'border-transparent text-zinc-400 hover:text-zinc-500'"
                  @click="activeCaseCategory = category"
                >
                  {{ category }}
                </button>
              </div>

              <div v-if="runMode === 'task' && !selectedExpert" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <button
                  v-for="expert in expertAgents"
                  :key="expert.value"
                  type="button"
                  class="group min-h-56 rounded-2xl border border-zinc-200 bg-white p-5 text-center transition hover:border-violet-200 hover:bg-violet-50/30"
                  :class="expert.value === 'soon' ? 'cursor-not-allowed opacity-60' : ''"
                  @click="selectAgent(expert.value)"
                >
                  <div class="relative mx-auto grid h-20 w-20 place-items-center rounded-full border border-violet-100 bg-white">
                    <div class="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-lg font-semibold text-white" :class="expert.accent">
                      {{ expert.label.slice(0, 1) }}
                    </div>
                    <span class="absolute right-0 top-0 rounded-lg border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600">{{ expert.level }}</span>
                  </div>
                  <div class="mt-4 text-base font-semibold text-zinc-950">{{ expert.label }}</div>
                  <div class="mt-2 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-600">{{ expert.role }}</div>
                  <p class="mx-auto mt-3 line-clamp-2 max-w-52 text-sm leading-6 text-zinc-500">{{ expert.desc }}</p>
                </button>
              </div>

              <div v-else-if="runMode === 'task' && selectedExpert" class="grid items-start gap-5 lg:grid-cols-[280px_1fr]">
                <div class="group relative min-h-56 rounded-2xl border border-violet-200 bg-white p-5 text-center transition hover:bg-violet-50/40">
                  <button type="button" class="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-300 opacity-0 transition hover:bg-white hover:text-zinc-700 group-hover:opacity-100" aria-label="移除已选专家" @click.stop="clearSelectedExpert">
                    <X class="h-3.5 w-3.5" />
                  </button>
                  <button type="button" class="block w-full text-center" @click="clearSelectedExpert">
                  <div class="relative mx-auto grid h-20 w-20 place-items-center rounded-full border border-violet-100 bg-white">
                    <div class="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-lg font-semibold text-white" :class="selectedExpert.accent">
                      {{ selectedExpert.label.slice(0, 1) }}
                    </div>
                    <span class="absolute right-0 top-0 rounded-lg border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600">{{ selectedExpert.level }}</span>
                  </div>
                  <div class="mt-4 text-base font-semibold text-zinc-950">{{ selectedExpert.label }}</div>
                  <div class="mt-2 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-600">{{ selectedExpert.role }}</div>
                  <p class="mx-auto mt-3 line-clamp-2 max-w-52 text-sm leading-6 text-zinc-500">{{ selectedExpert.desc }}</p>
                  </button>
                </div>
                <div class="min-w-0 pt-1">
                  <div class="mb-3 text-left text-sm font-semibold text-zinc-900">精选示例</div>
                  <div class="flex flex-wrap content-start gap-3">
                  <button
                    v-for="(item, index) in visibleCases"
                    :key="item.title"
                    type="button"
                    class="max-w-[min(520px,100%)] rounded-[22px] bg-zinc-100 px-5 py-3 text-left text-base leading-7 text-zinc-900 transition hover:bg-violet-50 hover:text-violet-700"
                    :class="[
                      index % 5 === 0 ? 'w-[280px]' : '',
                      index % 5 === 1 ? 'w-[220px]' : '',
                      index % 5 === 2 ? 'w-[340px]' : '',
                      index % 5 === 3 ? 'w-[260px]' : '',
                      index % 5 === 4 ? 'w-[300px]' : '',
                    ]"
                    @click="fillPrompt(item, runMode); showRecommendations = true"
                  >
                    <span class="block truncate">{{ item.bubble ?? item.title }}</span>
                  </button>
                  </div>
                </div>
              </div>

              <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <button
                  v-for="(item, index) in visibleCases"
                  :key="item.title"
                  class="group min-h-32 rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/30"
                  @click="fillPrompt(item, runMode); showRecommendations = true"
                >
                  <div class="flex h-full gap-3">
                    <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl" :class="index % 3 === 0 ? 'bg-blue-50 text-blue-600' : index % 3 === 1 ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'">
                      <component :is="'icon' in item ? item.icon : LayoutGrid" class="h-5 w-5" />
                    </div>
                    <div class="min-w-0">
                      <div class="truncate text-base font-semibold text-zinc-950">{{ item.title }}</div>
                      <div class="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">{{ item.desc }}</div>
                      <div class="mt-3 text-xs text-blue-500">引用 {{ item.kb }}</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </Transition>
        </section>

        <section
          v-else-if="showHistoryBrowser"
          data-testid="history-browser-section"
          class="mx-auto flex h-[calc(100vh-5.5rem)] w-full max-w-[1180px] flex-col transition-[width,transform] duration-300"
          :style="homeHeroStyle"
        >
          <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 class="text-2xl font-semibold tracking-tight text-zinc-950">历史会话</h1>
              <p class="mt-1 text-sm text-zinc-500">按任务模式浏览全部会话，侧边栏只保留最近预览。</p>
            </div>
            <button type="button" class="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800" @click="newTask">
              <Plus class="h-4 w-4" />
              新对话
            </button>
          </div>
          <div class="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3">
            <label class="flex h-10 min-w-[260px] flex-1 items-center gap-2 rounded-xl bg-zinc-50 px-3 text-sm text-zinc-400">
              <Search class="h-4 w-4" />
              <input v-model="historyBrowserSearch" class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-zinc-300" placeholder="搜索标题、内容、时间或状态" />
            </label>
            <div class="inline-flex rounded-xl bg-zinc-100 p-1">
              <button
                v-for="option in [
                  { key: 'all', label: '全部' },
                  { key: 'task', label: '专家模式' },
                  { key: 'quick', label: '日常办公' },
                  { key: 'schedule', label: '定时任务' },
                ]"
                :key="option.key"
                type="button"
                class="rounded-lg px-3 py-2 text-xs font-medium transition"
                :class="historyBrowserModeFilter === option.key ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'"
                @click="historyBrowserModeFilter = option.key as 'all' | RunMode"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white">
            <button
              v-for="item in historyBrowserConversations"
              :key="item.id"
              type="button"
              class="group grid w-full gap-3 border-b border-zinc-100 px-5 py-4 text-left transition last:border-b-0 hover:bg-zinc-50 md:grid-cols-[1fr_160px_120px]"
              @click="openConversation(item)"
            >
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="getConversationStatusClass(item.status)" />
                  <span class="truncate text-sm font-semibold text-zinc-950">{{ item.title }}</span>
                </div>
                <p class="mt-1 line-clamp-2 pl-4 text-xs leading-5 text-zinc-500">{{ getConversationDetail(item) }}</p>
              </div>
              <div class="flex items-center gap-2 text-xs text-zinc-500 md:justify-end">
                <span class="rounded-full border border-zinc-200 bg-white px-2 py-1">{{ item.mode }}</span>
                <span>{{ getConversationStatusLabel(item.status) }}</span>
              </div>
              <div class="flex items-center text-xs text-zinc-400 md:justify-end">{{ item.time }}</div>
            </button>
            <div v-if="!historyBrowserConversations.length" class="grid h-64 place-items-center text-sm text-zinc-400">
              没有找到匹配的历史会话
            </div>
          </div>
        </section>

        <section
          v-else
          data-testid="responsive-chat-shell"
          :data-conversation-anchor="activeConversationId || 'draft'"
          class="mx-auto flex h-[calc(100vh-5.5rem)] w-full flex-1 flex-col"
          :style="chatShellStyle"
        >
          <div class="fixed top-[4.25rem] z-30 flex h-10 items-center justify-center pointer-events-none" :style="chatTitleLayerStyle">
            <div class="flex items-center gap-2" data-testid="workspace-title-controls">
              <div class="pointer-events-auto flex items-center justify-center gap-2 rounded-full bg-[#f6f7f9]/90 px-3 py-1 backdrop-blur">
                <h1 class="truncate text-center text-base font-semibold">{{ chatTitle }}</h1>
                <span class="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-500">{{ modeLabel }}</span>
              </div>
            </div>
          </div>

          <div
            ref="messageList"
            class="min-h-0 flex-1 scroll-smooth space-y-5 overflow-y-auto px-0 pb-36 pt-14 md:px-2"
            @scroll.passive="handleMessageScroll"
            @wheel.passive="markUserScrollIntent"
            @touchstart.passive="markUserScrollIntent"
            @pointerdown="markUserScrollIntent"
          >
            <div v-for="message in messages" :key="message.id" class="group/message flex gap-3" :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
              <div v-if="message.role === 'assistant'" class="mt-1 h-10 w-10 shrink-0">
                <img :src="ponyAvatarUrl" alt="小马头像" class="h-full w-full object-contain" />
              </div>
              <div class="min-w-0" :class="message.role === 'user' ? (editingUserMessageId === message.id ? 'max-w-[88%] flex-1' : 'max-w-[72%]') : 'max-w-[88%] flex-1'">
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
                <div v-if="message.role === 'user' && editingUserMessageId === message.id" class="flex w-full items-center gap-4 py-1">
                  <button
                    type="button"
                    class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                    aria-label="取消编辑"
                    title="取消编辑"
                    @click="editingUserMessageId = ''; editingUserMessageDraft = ''"
                  >
                    <X class="h-6 w-6" />
                  </button>
                  <textarea
                    v-model="editingUserMessageDraft"
                    aria-label="编辑已发送消息"
                    class="min-h-20 flex-1 resize-none rounded-2xl border-2 border-blue-600 bg-white px-4 py-3 text-base leading-7 text-zinc-950 outline-none placeholder:text-zinc-400"
                  />
                  <button
                    type="button"
                    class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700"
                    aria-label="保存并重新发送"
                    title="发送修改"
                    @click="saveAndResendUserMessage(message)"
                  >
                    <ArrowUp class="h-5 w-5" />
                  </button>
                </div>
                <div
                  v-else
                  class="text-sm leading-7"
                  :class="message.role === 'user' ? 'rounded-2xl bg-zinc-100 px-4 py-3 text-zinc-900 shadow-sm' : 'prose prose-zinc max-w-none text-zinc-800'"
                >
                  <div v-if="message.role === 'assistant'" class="ai-markdown" v-html="renderMarkdown(message.content)" />
                  <div v-else class="whitespace-pre-wrap">{{ message.content }}</div>
                  <div v-if="message.role === 'assistant' && hasGeneratedAssets" class="not-prose mt-4 space-y-2">
                    <div
                      v-for="file in generatedArtifactCards"
                      :key="file.name"
                      class="group flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                      :class="activeArtifactPreview?.name === file.name ? 'border-blue-300 bg-blue-50/50' : ''"
                      @click="openArtifactPreview(file)"
                    >
                      <div class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                        <component :is="file.icon" class="h-5 w-5" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="truncate text-xs font-semibold text-zinc-900">{{ file.name }}</div>
                        <div class="mt-1 text-[11px] text-zinc-400">{{ file.type }} · {{ file.size }}</div>
                      </div>
                      <div class="flex shrink-0 items-center gap-1 text-[11px] font-medium text-blue-600">
                        <button type="button" class="rounded px-2 py-1 hover:bg-blue-100" @click.stop="openArtifactPreview(file)">预览</button>
                        <button type="button" class="rounded px-2 py-1 hover:bg-blue-100" @click.stop="downloadArtifact(file)">
                          {{ copiedMessageId === `download:${file.name}` ? '已加入下载' : '下载' }}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div v-if="message.role === 'assistant'" class="not-prose mt-3 flex flex-wrap items-center gap-1.5 pt-2 opacity-0 transition group-hover/message:opacity-100 group-focus-within/message:opacity-100">
                    <button class="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800" :aria-label="copiedMessageId === message.id ? '已复制回答' : '复制回答'" :title="copiedMessageId === message.id ? '已复制回答' : '复制回答'" @click="copyAnswer(message)">
                      <CheckCircle2 v-if="copiedMessageId === message.id" class="h-4 w-4 text-emerald-600" />
                      <Copy v-else class="h-4 w-4" />
                    </button>
                    <button class="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800" aria-label="引用回答" title="引用回答" @click="quoteAnswer(message)">
                      <Quote class="h-4 w-4" :class="quotedMessageId === message.id ? 'text-blue-600' : ''" />
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
                <div v-if="message.role === 'user' && editingUserMessageId !== message.id" class="mt-2 flex justify-end gap-1.5 pr-1 opacity-0 transition group-hover/message:opacity-100 group-focus-within/message:opacity-100">
                  <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-200/70 hover:text-zinc-900" :aria-label="copiedMessageId === message.id ? '已复制消息' : '复制消息'" :title="copiedMessageId === message.id ? '已复制消息' : '复制消息'" @click="copyUserMessage(message)">
                    <CheckCircle2 v-if="copiedMessageId === message.id" class="h-4 w-4 text-emerald-500" />
                    <Copy v-else class="h-4 w-4" />
                  </button>
                 <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-200/70 hover:text-zinc-900" aria-label="编辑消息" title="编辑消息" @click="beginEditUserMessage(message)">
                   <Pencil class="h-4 w-4" />
                 </button>
                  <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-200/70 hover:text-zinc-900" aria-label="重试" title="重试" @click="retryUserMessage(message)">
                    <RotateCw class="h-4 w-4" />
                  </button>
                </div>
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
            <div data-testid="responsive-composer" class="composer-shell mx-auto w-full max-w-[clamp(720px,72vw,1180px)] rounded-2xl border border-white/80 bg-white/80 p-3 shadow-2xl shadow-zinc-300/40 ring-1 ring-white/70 backdrop-blur-2xl" @pointermove="updateComposerGlow" @pointerleave="resetComposerGlow">
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
                  <button class="rounded-md p-1 text-zinc-400 opacity-0 transition hover:bg-zinc-100 hover:text-zinc-700 group-hover:opacity-100" :aria-label="`移除附件 ${file}`" @click="removeFile(index)"><X class="h-3 w-3" /></button>
                </div>
              </div>
            <div class="flex items-end gap-2">
              <div v-if="runMode === 'task' && selectedExpert" class="mb-1 inline-flex max-w-[160px] shrink-0 items-center gap-1.5 rounded-xl bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-700">
                <Sparkles class="h-3.5 w-3.5 shrink-0" />
                <span class="truncate">{{ selectedExpert.label }}</span>
                <button type="button" class="rounded p-0.5 hover:bg-violet-100" aria-label="移除已选专家" @click="clearSelectedExpert">
                  <X class="h-3 w-3" />
                </button>
              </div>
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
                :disabled="!isThinking && !canSend"
                @click="isThinking ? pauseThinking() : sendMessage()"
              >
                <Square v-if="isThinking" class="h-4 w-4 fill-current" />
                <SendHorizontal v-else class="h-5 w-5" />
              </button>
            </div>
              <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 px-1 pt-3">
                <div v-if="runMode !== 'schedule'" class="relative">
                  <button
                    class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                    aria-label="添加附件"
                    @mouseenter="showUploadTip = true"
                    @mouseleave="showUploadTip = false"
                    @focus="showUploadTip = true"
                    @blur="showUploadTip = false"
                    @click="triggerFilePicker"
                  >
                    <Paperclip class="h-3.5 w-3.5" />
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
                <div class="relative">
                  <button
                    type="button"
                    class="inline-flex h-8 items-center gap-1.5 px-2 text-xs font-medium transition"
                    :class="'text-zinc-950'"
                    aria-label="选择模式"
                    @click.stop="modeMenuOpen = !modeMenuOpen; agentMenuOpen = false"
                  >
                    <Zap v-if="runMode === 'quick'" class="h-3.5 w-3.5" />
                    <Bot v-else-if="runMode === 'task'" class="h-3.5 w-3.5" />
                    <CalendarDays v-else class="h-3.5 w-3.5" />
                    {{ modeLabel }}
                    <ChevronDown class="h-3.5 w-3.5" />
                  </button>
                  <div v-if="modeMenuOpen" class="absolute bottom-full left-0 z-50 mb-2 w-56 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1 shadow-2xl">
                    <button type="button" data-testid="mode-option-quick" class="flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-zinc-50" @click.stop="selectMode('quick')">
                      <Zap class="mt-0.5 h-4 w-4 text-orange-500" />
                      <span class="min-w-0 flex-1">
                        <span class="block text-sm font-medium text-zinc-900">日常办公</span>
                        <span class="block text-xs leading-5 text-zinc-400">适合日常轻度办公任务</span>
                      </span>
                      <CheckCircle2 v-if="runMode === 'quick'" class="mt-0.5 h-4 w-4 text-blue-600" />
                    </button>
                    <button type="button" data-testid="mode-option-task" class="flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-zinc-50" @click.stop="selectMode('task')">
                      <Bot class="mt-0.5 h-4 w-4 text-violet-600" />
                      <span class="min-w-0 flex-1">
                        <span class="block text-sm font-medium text-zinc-900">专家模式</span>
                        <span class="block text-xs leading-5 text-zinc-400">处理复杂的专项类任务</span>
                      </span>
                      <CheckCircle2 v-if="runMode === 'task'" class="mt-0.5 h-4 w-4 text-blue-600" />
                    </button>
                    <button type="button" data-testid="mode-option-schedule" class="flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-zinc-50" @click.stop="selectMode('schedule')">
                      <CalendarDays class="mt-0.5 h-4 w-4 text-blue-600" />
                      <span class="min-w-0 flex-1">
                        <span class="block text-sm font-medium text-zinc-900">定时任务</span>
                        <span class="block text-xs leading-5 text-zinc-400">设置周期性自动化任务</span>
                      </span>
                      <CheckCircle2 v-if="runMode === 'schedule'" class="mt-0.5 h-4 w-4 text-blue-600" />
                    </button>
                  </div>
                </div>
                <div v-if="runMode === 'task' && selectedExpert" class="relative ml-auto">
                  <button
                    type="button"
                    class="inline-flex h-8 min-w-28 items-center justify-between gap-2 px-2 text-xs font-medium text-violet-700"
                    :aria-label="`选择${agentSelectLabel}`"
                    @click.stop="agentMenuOpen = !agentMenuOpen; modeMenuOpen = false"
                  >
                    <span class="truncate">{{ currentAgentLabel }}</span>
                    <ChevronDown class="h-3.5 w-3.5 shrink-0" />
                  </button>
                  <div v-if="agentMenuOpen" class="absolute bottom-full right-0 z-50 mb-2 w-60 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1 shadow-2xl">
                    <button
                      v-for="agent in currentAgentOptions"
                      :key="agent.value"
                      type="button"
                      :data-testid="`agent-option-${agent.value}`"
                      class="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition"
                      :class="agent.value.startsWith('soon') ? 'cursor-not-allowed text-zinc-300' : 'text-zinc-700 hover:bg-zinc-50'"
                      @click.stop="selectAgent(agent.value)"
                    >
                      <Sparkles class="h-4 w-4 shrink-0 text-violet-500" />
                      <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ agent.label }}</span>
                      <CheckCircle2 v-if="selectedAgent === agent.value" class="h-4 w-4 shrink-0 text-blue-600" />
                    </button>
                  </div>
                </div>
                <span class="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white p-2" :style="contextRingStyle" title="上下文">
                  <span class="h-3.5 w-3.5 rounded-full bg-white" />
                </span>
              </div>
             <div v-if="runMode === 'schedule'" class="schedule-panel mt-3">
                <div class="schedule-layer schedule-layer-top">
                  <span class="schedule-title">周期</span>
                  <select :value="scheduleCycle" class="schedule-field schedule-field-main" aria-label="选择定时周期" @change="updateScheduleCycle(($event.target as HTMLSelectElement).value as ScheduleCycle)">
                    <option v-for="cycle in scheduleCycles" :key="cycle.value" :value="cycle.value">{{ cycle.label }}</option>
                  </select>
                </div>
                <div class="schedule-layer schedule-layer-bottom">
                  <template v-if="scheduleCycle === 'once'">
                    <input v-model="scheduleDate" type="date" class="schedule-field schedule-field-main" aria-label="选择执行日期" />
                    <input v-model="scheduleTime" type="time" class="schedule-field schedule-field-main" aria-label="输入执行时间" />
                  </template>
                  <template v-else-if="scheduleCycle === 'weekly'">
                    <select v-model="scheduleWeekday" class="schedule-field schedule-field-main" aria-label="选择星期">
                      <option v-for="day in weekdayOptions" :key="day" :value="day">{{ day }}</option>
                    </select>
                    <input v-model="scheduleTime" type="time" class="schedule-field schedule-field-main" aria-label="输入执行时间" />
                  </template>
                  <template v-else-if="scheduleCycle === 'monthly'">
                    <select v-model="scheduleMonthDay" class="schedule-field schedule-field-main" aria-label="选择日期">
                      <option v-for="day in monthDayOptions" :key="day" :value="day">{{ day }}</option>
                    </select>
                    <input v-model="scheduleTime" type="time" class="schedule-field schedule-field-main" aria-label="输入执行时间" />
                  </template>
                  <template v-else-if="scheduleCycle === 'cron'">
                    <input v-model="scheduleCron" class="schedule-field schedule-field-cron font-mono" placeholder="0 9 * * *" aria-label="输入 Cron 表达式" />
                  </template>
                  <template v-else>
                    <span class="schedule-field schedule-field-main schedule-field-muted">{{ scheduleCycle === 'daily' ? '每天' : '周一至周五' }}</span>
                    <input v-model="scheduleTime" type="time" class="schedule-field schedule-field-main" aria-label="输入执行时间" />
                  </template>
                  <span class="schedule-summary">{{ scheduleCycle === 'cron' ? 'Cron 例：0 9 * * *' : scheduleSummary }}</span>
                </div>
             </div>
            </div>
          </div>
        </section>
      </main>

      <aside
        v-if="activeArtifactPreview"
        data-testid="artifact-preview-panel"
        class="fixed bottom-0 right-0 top-14 z-40 hidden w-[clamp(420px,42vw,760px)] border-l border-zinc-200 bg-white lg:top-16 lg:block"
      >
        <div class="flex h-full flex-col">
          <header class="flex h-14 shrink-0 items-center justify-between border-b border-zinc-100 px-4">
            <div class="min-w-0">
              <div class="truncate text-sm font-semibold text-zinc-950">{{ activeArtifactPreview.name }}</div>
              <div class="mt-0.5 text-xs text-zinc-400">{{ activeArtifactPreview.type }} · {{ activeArtifactPreview.size }}</div>
            </div>
            <div class="flex items-center gap-1">
              <button type="button" class="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900" @click="downloadArtifact(activeArtifactPreview)">
                <Download class="h-4 w-4" />
                下载
              </button>
              <button
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                aria-label="关闭预览"
                @click="closeArtifactPreview"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </header>
          <div class="grid min-h-0 flex-1 grid-cols-[156px_1fr] overflow-hidden">
            <nav class="overflow-y-auto border-r border-zinc-100 bg-zinc-50 px-4 py-5 text-sm">
              <button type="button" class="mb-5 inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-700" @click="closeArtifactPreview">
                <ChevronLeft class="h-4 w-4" />
                返回
              </button>
              <div class="mb-3 truncate font-semibold text-blue-600">{{ activeArtifactPreview.name }}</div>
              <div class="space-y-3 text-zinc-500">
                <div
                  v-for="section in activeArtifactPreview.sections"
                  :key="section"
                  class="border-l-4 border-zinc-300 pl-3"
                  :class="section === activeArtifactPreview.sections[0] ? 'border-blue-500 text-zinc-800' : ''"
                >
                  {{ section }}
                </div>
              </div>
            </nav>
            <article class="overflow-y-auto px-8 py-8 text-zinc-900">
              <div class="mb-6 flex items-start gap-3">
                <div class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                  <component :is="activeArtifactPreview.icon" class="h-6 w-6" />
                </div>
                <div class="min-w-0">
                  <h1 class="truncate text-2xl font-bold tracking-normal">{{ activeArtifactPreview.name.replace(/\.[^.]+$/, '') }}</h1>
                  <p class="mt-2 text-sm leading-6 text-zinc-500">{{ activeArtifactPreview.summary }}</p>
                </div>
              </div>
              <section class="space-y-4 text-base leading-8">
                <h2 class="border-l-4 border-zinc-900 pl-3 text-xl font-bold">{{ activeArtifactPreview.sections[0] }}</h2>
                <p v-for="paragraph in activeArtifactPreview.paragraphs" :key="paragraph">{{ paragraph }}</p>
              </section>
              <section class="mt-8">
                <h2 class="mb-4 border-l-4 border-zinc-900 pl-3 text-xl font-bold">
                  {{ activeArtifactPreview.type === 'Excel' ? '表格预览' : activeArtifactPreview.type === 'PPT' ? '页面预览' : '内容摘录' }}
                </h2>
                <div class="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                  <div class="overflow-x-auto">
                    <table class="w-full min-w-[520px] text-left text-sm">
                      <tbody>
                        <tr
                          v-for="(row, rowIndex) in activeArtifactPreview.rows"
                          :key="`${activeArtifactPreview.name}-${rowIndex}`"
                          class="border-b border-zinc-100 last:border-b-0"
                          :class="rowIndex === 0 ? 'bg-zinc-50 font-semibold text-zinc-700' : 'text-zinc-600'"
                        >
                          <td v-for="cell in row" :key="cell" class="px-4 py-3">{{ cell }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </article>
          </div>
        </div>
      </aside>

      <aside v-if="rightPanelVisible" data-testid="right-asset-panel" class="fixed bottom-0 right-0 top-14 z-30 hidden w-[clamp(286px,21vw,400px)] border-l border-zinc-200 bg-white lg:top-16 lg:block">
        <div class="flex h-full flex-col">
          <div class="flex h-14 items-center justify-between border-b border-zinc-100 px-4">
            <div class="text-sm font-semibold text-zinc-900">会话产物栏</div>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
              aria-label="折叠资产栏"
              @click="isRightPanelCollapsed = true"
            >
              <ChevronRight class="h-4 w-4" />
            </button>
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

  <!-- Attachment modal -->
  <Teleport to="body">
    <div v-if="attachmentModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4 py-8" @click.self="attachmentModalOpen = false">
      <div class="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200">
        <div class="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4">
          <div class="flex min-w-0 items-center gap-5">
            <h3 class="shrink-0 text-base font-semibold text-zinc-950">添加附件</h3>
            <span class="h-5 w-px bg-zinc-200" />
            <p class="truncate text-sm text-slate-500">支持上传本地文件或从知识库中选择。</p>
          </div>
          <button type="button" class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" aria-label="关闭附件弹窗" @click="attachmentModalOpen = false">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="border-b border-zinc-200 px-6">
          <div class="flex gap-2">
            <button
              type="button"
              class="border-b-2 px-4 py-3 text-sm font-semibold transition"
              :class="activeAttachmentTab === 'local' ? 'border-blue-600 text-zinc-950' : 'border-transparent text-slate-500 hover:text-zinc-800'"
              @click="activeAttachmentTab = 'local'"
            >
              本地文件
            </button>
            <button
              type="button"
              class="border-b-2 px-4 py-3 text-sm font-semibold transition"
              :class="activeAttachmentTab === 'knowledge' ? 'border-blue-600 text-zinc-950' : 'border-transparent text-slate-500 hover:text-zinc-800'"
              @click="activeAttachmentTab = 'knowledge'"
            >
              知识库文档
            </button>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div v-if="activeAttachmentTab === 'local'" class="space-y-4">
            <button
              type="button"
              class="flex min-h-40 w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center transition hover:border-blue-300 hover:bg-blue-50/40"
              @click="chooseLocalFiles"
            >
              <div class="flex items-center gap-5 text-slate-500">
                <div class="grid h-12 w-12 place-items-center rounded-full bg-slate-100"><Paperclip class="h-5 w-5" /></div>
              </div>
              <div class="mt-5 text-sm font-semibold text-zinc-950">点击上传文件</div>
              <div class="mt-2 text-xs text-slate-500">{{ uploadHintText }}</div>
            </button>
            <div class="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-blue-100 bg-blue-50/20 text-center">
              <FileText class="h-8 w-8 text-blue-500" />
              <div class="mt-3 text-sm font-semibold text-zinc-900">{{ selectedFiles.length ? `已选择 ${selectedFiles.length} 个文件` : '暂无本地文件' }}</div>
              <div class="mt-1 text-xs text-slate-500">请在上方点击或拖拽上传文件</div>
            </div>
          </div>

          <div v-else class="space-y-4">
            <div class="flex flex-wrap items-center gap-3 border-b border-zinc-200 pb-4">
              <label class="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-slate-400 shadow-sm">
                <Search class="h-4 w-4" />
                <input v-model="kbAttachmentSearch" class="min-w-0 flex-1 bg-transparent outline-none" placeholder="搜索文件夹或文档..." />
              </label>
              <div class="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 shadow-sm">
                <button
                  type="button"
                  class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
                  :class="attachmentScope === 'all' ? 'bg-white text-zinc-950 shadow-sm' : 'text-slate-500 hover:text-zinc-800'"
                  @click="switchAttachmentSpace('public', 'all')"
                >
                  全部
                </button>
                <button
                  type="button"
                  class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
                  :class="attachmentScope === 'public' ? 'bg-white text-zinc-950 shadow-sm' : 'text-slate-500 hover:text-zinc-800'"
                  @click="switchAttachmentSpace('public')"
                >
                  公共空间
                </button>
                <button
                  type="button"
                  class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
                  :class="attachmentScope === 'personal' ? 'bg-white text-zinc-950 shadow-sm' : 'text-slate-500 hover:text-zinc-800'"
                  @click="switchAttachmentSpace('personal')"
                >
                  个人空间
                </button>
              </div>
              <button type="button" class="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50">
                所有类型
                <ChevronDown class="h-4 w-4 text-zinc-400" />
              </button>
            </div>

            <div class="flex items-center gap-2 text-xs text-slate-500">
              <button
                v-if="attachmentPath.length"
                type="button"
                class="rounded-lg border border-zinc-200 px-2 py-1 text-zinc-600 hover:bg-zinc-50"
                @click="backAttachmentFolder"
              >
                返回上级
              </button>
              <span class="font-medium text-zinc-800">{{ attachmentSpace === 'public' ? '公共空间' : '个人空间' }}</span>
              <span v-if="attachmentSpace === 'public'" class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">共享空间</span>
              <template v-if="currentAttachmentNode">
                <ChevronRight class="h-3 w-3 text-zinc-300" />
                <span class="font-medium text-zinc-800">{{ currentAttachmentNode.label }}</span>
              </template>
              <span class="ml-auto text-slate-400">{{ filteredAttachmentItems.length }} 项</span>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <button
                v-for="item in filteredAttachmentItems"
                :key="item.id"
                type="button"
                class="flex min-h-20 items-center gap-3 rounded-xl border p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
                :class="item.type === 'file' && selectedKbDocNames.includes(item.label) ? 'border-blue-500 bg-blue-50' : 'border-zinc-200 bg-white'"
                @click="chooseAttachmentNode(item)"
              >
                <div class="grid h-10 w-10 shrink-0 place-items-center rounded-lg" :class="item.type === 'folder' ? 'bg-sky-50 text-sky-600' : 'bg-blue-50 text-blue-600'">
                  <Folder v-if="item.type === 'folder'" class="h-5 w-5" />
                  <FileText v-else class="h-5 w-5" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-semibold text-zinc-950">{{ item.label }}</div>
                  <div class="mt-1 text-xs text-slate-500">{{ item.type === 'folder' ? `${item.children?.length ?? 0} 项 · 文件夹` : item.meta }}</div>
                </div>
                <ChevronRight v-if="item.type === 'folder'" class="h-4 w-4 text-zinc-300" />
                <span v-else class="h-5 w-5 rounded-full border" :class="selectedKbDocNames.includes(item.label) ? 'border-blue-600 bg-blue-600' : 'border-blue-600 bg-white'" />
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 border-t border-zinc-200 px-6 py-4">
          <div class="min-w-0 text-sm text-slate-500">
            <span v-if="selectedFiles.length">已选择 {{ selectedFiles.length }} 个文件</span>
            <span v-else>请选择文件</span>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" class="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50" @click="attachmentModalOpen = false">取消</button>
            <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50" :disabled="selectedFiles.length === 0 && selectedKbDocNames.length === 0" @click="addAttachmentsAndClose()">确认上传</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

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

.composer-shell {
  position: relative;
  isolation: isolate;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
  --composer-x: 50%;
  --composer-y: 50%;
}

.composer-shell::before {
  content: '';
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: -22px;
  height: 74px;
  z-index: -1;
  border-radius: 999px;
  background:
    radial-gradient(circle at var(--composer-x) 55%, rgba(59, 130, 246, 0.14), transparent 34%),
    radial-gradient(circle at calc(var(--composer-x) + 18%) 70%, rgba(249, 115, 22, 0.1), transparent 38%),
    linear-gradient(100deg, rgba(59, 130, 246, 0.05), rgba(139, 92, 246, 0.07), rgba(249, 115, 22, 0.05));
  filter: blur(18px);
  opacity: 0.22;
  transition: opacity 220ms ease, transform 220ms ease;
  animation: composer-ambient 8s ease-in-out infinite alternate;
}

.composer-shell:hover,
.composer-shell:focus-within {
  transform: translateY(-3px);
  border-color: rgba(212, 212, 216, 0.95);
  box-shadow: 0 26px 76px rgba(15, 23, 42, 0.13);
}

.composer-shell:hover::before,
.composer-shell:focus-within::before {
  opacity: 0.38;
  transform: translateY(3px) scale(1.01);
}

.schedule-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f4f4f5;
  border-radius: 12px;
  padding: 8px 12px;
}

.schedule-bar-label {
  color: #71717a;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.schedule-bar-select {
  height: 32px;
  border-radius: 8px;
  border: none;
  background: #fff;
  padding: 0 10px;
  color: #27272a;
  font-size: 0.8rem;
  outline: none;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  cursor: pointer;
  min-width: 0;
}

.schedule-bar-input {
  height: 32px;
  width: auto;
  min-width: 0;
  border-radius: 8px;
  border: none;
  background: #fff;
  padding: 0 10px;
  color: #27272a;
  font-size: 0.8rem;
  outline: none;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}

.schedule-bar-cron {
  flex: 1 1 auto;
  font-family: ui-monospace, monospace;
  max-width: 200px;
}

.schedule-bar-muted {
  display: inline-flex;
  align-items: center;
  height: 32px;
  border-radius: 8px;
  background: #fff;
  padding: 0 10px;
  color: #71717a;
  font-size: 0.8rem;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}

.schedule-bar-summary {
  flex: 0 0 auto;
  color: #a1a1aa;
  font-size: 0.75rem;
  margin-left: auto;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .schedule-bar {
    flex-wrap: wrap;
    gap: 6px;
  }
  .schedule-bar-summary {
    margin-left: 0;
    order: 10;
  }
}

@keyframes process-flow {
  from {
    background-position: 120% 0;
  }

  to {
    background-position: -120% 0;
  }
}

@keyframes composer-ambient {
  from {
    transform: translate3d(-4px, 0, 0) scale(1);
  }

  to {
    transform: translate3d(4px, 2px, 0) scale(1.015);
  }
}
</style>
