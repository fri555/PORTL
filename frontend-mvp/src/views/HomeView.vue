<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  ArrowUp,
  Bot,
  BarChart3,
  BookOpen,
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
 status: 'running' | 'completed' | 'failed' | 'cancelled'
}
type IntentRoute = 'greeting' | 'office-rag' | 'expert-task'
type CaseItem = {
  title: string
  icon?: unknown
  desc: string
  prompt: string
  bubble?: string
  kb?: string
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
  emoji?: string
  avatarUrl?: string
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
// 专家 / 案例 3×3 分页（最多 9 条/页）
const EXPERT_PAGE_SIZE = 9
const expertPage = ref(1)
const casePage = ref(1)
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
const expertAvatarUrls = {
  solution: `${import.meta.env.BASE_URL}assets/expert-solution.png`,
  analysis: `${import.meta.env.BASE_URL}assets/expert-analysis.png`,
  marketing: `${import.meta.env.BASE_URL}assets/expert-marketing.png`,
}

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
  { id: 'conv-7', title: 'Q3营销策划方案', time: '06-30', mode: '专家模式', pinned: false, status: 'cancelled' },
])

const officeAgents = [
  { value: 'allround', label: '全能助手', desc: '日常办公、调研、知识检索和轻量任务整理' },
]

const expertAgents: ExpertAgent[] = [
  {
    value: 'xuanpin',
    label: '选品王',
    role: '商品选品专家',
    desc: '基于销售数据、库存与趋势，为不同渠道推荐选品组合',
    level: 'P7',
    accent: '#ff5530',
    emoji: '🛒',
    prompts: [
      { title: 'B2C爆品推荐', desc: '根据上月B2C渠道销售数据，推荐5个本季度潜力爆品组合，并说明选品逻辑', prompt: '根据上月B2C渠道销售数据，推荐5个本季度潜力爆品组合，并说明选品逻辑', bubble: 'B2C爆品推荐', kb: '选品知识库' },
      { title: '门店清货调拨', desc: '线下门店A库存周转超过60天，给出清货与跨店调拨的选品建议', prompt: '线下门店A库存周转超过60天，给出清货与跨店调拨的选品建议', bubble: '门店清货调拨', kb: '选品知识库' },
      { title: '得物渠道选品', desc: '为新开拓的得物渠道做一份运动户外品类选品清单，区分引流款与利润款', prompt: '为新开拓的得物渠道做一份运动户外品类选品清单，区分引流款与利润款', bubble: '得物渠道选品', kb: '选品知识库' },
      { title: '夏日场景选品', desc: '结合夏季销售趋势，推荐3款适合泳池/沙滩场景的鞋服配组合', prompt: '结合夏季销售趋势，推荐3款适合泳池/沙滩场景的鞋服配组合', bubble: '夏日场景选品', kb: '选品知识库' },
      { title: '断货替代选品', desc: '某爆品突然断货，给出3个替代选品并对比转化预期', prompt: '某爆品突然断货，给出3个替代选品并对比转化预期', bubble: '断货替代选品', kb: '选品知识库' },
      { title: 'Z世代选品', desc: '针对Z世代客群，输出一批高颜值、强社交属性的选品方向', prompt: '针对Z世代客群，输出一批高颜值、强社交属性的选品方向', bubble: 'Z世代选品', kb: '选品知识库' },
      { title: '双11清仓选品', desc: '双11前梳理全年滞销TOP20 SKU，给出清仓选品与捆绑建议', prompt: '双11前梳理全年滞销TOP20 SKU，给出清仓选品与捆绑建议', bubble: '双11清仓选品', kb: '选品知识库' },
      { title: '竞品选品缺口', desc: '分析竞品上新节奏，给出本季度我方应跟进的选品缺口', prompt: '分析竞品上新节奏，给出本季度我方应跟进的选品缺口', bubble: '竞品选品缺口', kb: '选品知识库' },
      { title: '会员日复购组合', desc: '为会员日策划一份高复购的选品组合，提升客单价', prompt: '为会员日策划一份高复购的选品组合，提升客单价', bubble: '会员日复购组合', kb: '选品知识库' },
      { title: '补货优先级', desc: '依据库存深度与动销率，输出下周补货优先级清单', prompt: '依据库存深度与动销率，输出下周补货优先级清单', bubble: '补货优先级', kb: '选品知识库' },
    ],
  },
  {
    value: 'daigou',
    label: '带货一姐',
    role: '智能导购专家',
    desc: '7×24h解答商品问题，根据用户画像做个性化推荐',
    level: 'P6',
    accent: '#ea5ec1',
    emoji: '💁‍♀️',
    prompts: [
      { title: '通勤跑鞋推荐', desc: '用户想买一双适合通勤、预算500以内的跑步鞋，帮我做个性化推荐并说明卖点', prompt: '用户想买一双适合通勤、预算500以内的跑步鞋，帮我做个性化推荐并说明卖点', bubble: '通勤跑鞋推荐', kb: '导购话术库' },
      { title: '宝妈导购话术', desc: '生成一段面向宝妈群体的儿童运动服导购话术，突出安全与透气', prompt: '生成一段面向宝妈群体的儿童运动服导购话术，突出安全与透气', bubble: '宝妈导购话术', kb: '导购话术库' },
      { title: 'B2B询盘对比', desc: '针对B2B客户批量询盘，输出标准商品参数对比表与推荐结论', prompt: '针对B2B客户批量询盘，输出标准商品参数对比表与推荐结论', bubble: 'B2B询盘对比', kb: '导购话术库' },
      { title: '跑鞋对比决策', desc: '用户犹豫两款跑鞋，生成对比话术帮助决策', prompt: '用户犹豫两款跑鞋，生成对比话术帮助决策', bubble: '跑鞋对比决策', kb: '导购话术库' },
      { title: '直播高频问答', desc: '为直播间观众设计3组高频问答话术，覆盖尺码与材质', prompt: '为直播间观众设计3组高频问答话术，覆盖尺码与材质', bubble: '直播高频问答', kb: '导购话术库' },
      { title: '个性化复购', desc: '基于用户历史浏览，生成个性化复购推荐理由', prompt: '基于用户历史浏览，生成个性化复购推荐理由', bubble: '个性化复购', kb: '导购话术库' },
      { title: '新客引导提问', desc: '新客首单转化低，给出引导式提问话术挖掘真实需求', prompt: '新客首单转化低，给出引导式提问话术挖掘真实需求', bubble: '新客引导提问', kb: '导购话术库' },
      { title: '大促紧迫感', desc: '大促期间生成限时紧迫感话术，但不夸大宣传', prompt: '大促期间生成限时紧迫感话术，但不夸大宣传', bubble: '大促紧迫感', kb: '导购话术库' },
      { title: '专业概念科普', desc: '针对运动小白，用通俗语言解释缓震/支撑等专业概念', prompt: '针对运动小白，用通俗语言解释缓震/支撑等专业概念', bubble: '专业概念科普', kb: '导购话术库' },
      { title: '退换货挽留', desc: '输出一套退换货场景的友好挽留话术', prompt: '输出一套退换货场景的友好挽留话术', bubble: '退换货挽留', kb: '导购话术库' },
    ],
  },
  {
    value: 'lvyue',
    label: '飞毛腿',
    role: '库存与履约专家',
    desc: '实时查询库存、推荐最近发货仓、预估配送时间',
    level: 'P6',
    accent: '#1456f0',
    emoji: '🏃‍♀️',
    prompts: [
      { title: '就近发货仓', desc: '查询上海仓运动鞋SKU的实时库存，并推荐离杭州收件人最近的发货仓', prompt: '查询上海仓运动鞋SKU的实时库存，并推荐离杭州收件人最近的发货仓', bubble: '就近发货仓', kb: 'WMS库存' },
      { title: '门店调拨预估', desc: '广州门店某款卫衣缺货，给出周边可调拨门店与预计送达时间', prompt: '广州门店某款卫衣缺货，给出周边可调拨门店与预计送达时间', bubble: '门店调拨预估', kb: 'WMS库存' },
      { title: '履约时效预估', desc: '结合在途物流状态，预估这批订单的履约时效并标注风险单', prompt: '结合在途物流状态，预估这批订单的履约时效并标注风险单', bubble: '履约时效预估', kb: 'WMS库存' },
      { title: '大促铺货', desc: '大促期间预估各仓承压，给出前置铺货建议', prompt: '大促期间预估各仓承压，给出前置铺货建议', bubble: '大促铺货', kb: 'WMS库存' },
      { title: '全国库存调拨', desc: '查询某SKU全国库存分布，输出可调拨方案', prompt: '查询某SKU全国库存分布，输出可调拨方案', bubble: '全国库存调拨', kb: 'WMS库存' },
      { title: '精准送达', desc: '用户催单，给出基于LBS的精准预计送达时间', prompt: '用户催单，给出基于LBS的精准预计送达时间', bubble: '精准送达', kb: 'WMS库存' },
      { title: '跨境清关补救', desc: '跨境订单清关延误，给出履约补救与沟通口径', prompt: '跨境订单清关延误，给出履约补救与沟通口径', bubble: '跨境清关补救', kb: 'WMS库存' },
      { title: '自动调拨规则', desc: '门店调拨审批慢，梳理自动化调拨规则建议', prompt: '门店调拨审批慢，梳理自动化调拨规则建议', bubble: '自动调拨规则', kb: 'WMS库存' },
      { title: '前置仓优化', desc: '根据退货率高的区域，建议前置仓布局优化', prompt: '根据退货率高的区域，建议前置仓布局优化', bubble: '前置仓优化', kb: 'WMS库存' },
      { title: '双11履约预案', desc: '生成双11履约保障预案，含峰值分流', prompt: '生成双11履约保障预案，含峰值分流', bubble: '双11履约预案', kb: 'WMS库存' },
    ],
  },
  {
    value: 'yingxiao',
    label: '点子王',
    role: '营销策略专家',
    desc: '策划促销方案、匹配用户可用的优惠、生成营销素材',
    level: 'P7',
    accent: '#a855f7',
    emoji: '💡',
    prompts: [
      { title: '618促销方案', desc: '为618大促设计一套满减+会员专享的促销方案，并匹配不同用户分群', prompt: '为618大促设计一套满减+会员专享的促销方案，并匹配不同用户分群', bubble: '618促销方案', kb: '营销策略库' },
      { title: '朋友圈素材', desc: '生成3套朋友圈投放素材文案，分别对应新品、清仓、会员日', prompt: '生成3套朋友圈投放素材文案，分别对应新品、清仓、会员日', bubble: '朋友圈素材', kb: '营销策略库' },
      { title: 'B2B返利政策', desc: '针对B2B大客户设计阶梯式返利激励政策，输出规则与测算表', prompt: '针对B2B大客户设计阶梯式返利激励政策，输出规则与测算表', bubble: 'B2B返利政策', kb: '营销策略库' },
      { title: '新品上市活动', desc: '为新产品上市策划主题营销活动，含节奏与权益', prompt: '为新产品上市策划主题营销活动，含节奏与权益', bubble: '新品上市活动', kb: '营销策略库' },
      { title: '私域裂变', desc: '设计私域社群裂变活动，给出邀请机制与奖品', prompt: '设计私域社群裂变活动，给出邀请机制与奖品', bubble: '私域裂变', kb: '营销策略库' },
      { title: '节日营销日历', desc: '输出一份节日营销日历，覆盖关键节点', prompt: '输出一份节日营销日历，覆盖关键节点', bubble: '节日营销日历', kb: '营销策略库' },
      { title: '流失用户召回', desc: '针对流失用户设计召回方案与权益', prompt: '针对流失用户设计召回方案与权益', bubble: '流失用户召回', kb: '营销策略库' },
      { title: '门店开业引流', desc: '生成门店开业引流活动方案', prompt: '生成门店开业引流活动方案', bubble: '门店开业引流', kb: '营销策略库' },
      { title: 'KOL合作分成', desc: '为KOL合作设计分成与内容方向', prompt: '为KOL合作设计分成与内容方向', bubble: 'KOL合作分成', kb: '营销策略库' },
      { title: '大促复盘', desc: '输出大促复盘框架与下阶段优化', prompt: '输出大促复盘框架与下阶段优化', bubble: '大促复盘', kb: '营销策略库' },
    ],
  },
  {
    value: 'jieyou',
    label: '解忧姐',
    role: '客服与售后专家',
    desc: '处理退换货、保固咨询、安抚情绪、简化售后流程',
    level: 'P6',
    accent: '#ff5530',
    emoji: '🛟',
    prompts: [
      { title: '情绪激动安抚', desc: '用户收到鞋子开胶要求退货，情绪激动，帮我起草一段安抚并给出处理方案', prompt: '用户收到鞋子开胶要求退货，情绪激动，帮我起草一段安抚并给出处理方案', bubble: '情绪激动安抚', kb: '售后知识库' },
      { title: '保固FAQ', desc: '整理常见保固咨询的FAQ话术，覆盖运动鞋开胶、衣物褪色等情形', prompt: '整理常见保固咨询的FAQ话术，覆盖运动鞋开胶、衣物褪色等情形', bubble: '保固FAQ', kb: '售后知识库' },
      { title: '退换货指引', desc: '把这条退换货流程简化成3步图文指引，降低人工客服介入率', prompt: '把这条退换货流程简化成3步图文指引，降低人工客服介入率', bubble: '退换货指引', kb: '售后知识库' },
      { title: '尺码不符换货', desc: '用户投诉尺码不符，给出换货引导与防错提示', prompt: '用户投诉尺码不符，给出换货引导与防错提示', bubble: '尺码不符换货', kb: '售后知识库' },
      { title: '满意度回访', desc: '生成售后满意度回访话术', prompt: '生成售后满意度回访话术', bubble: '满意度回访', kb: '售后知识库' },
      { title: '批量质量问题', desc: '针对批量质量问题，起草统一公告与补偿方案', prompt: '针对批量质量问题，起草统一公告与补偿方案', bubble: '批量质量问题', kb: '售后知识库' },
      { title: '加急处理', desc: '用户要求加急处理，给出优先级与时效承诺话术', prompt: '用户要求加急处理，给出优先级与时效承诺话术', bubble: '加急处理', kb: '售后知识库' },
      { title: '运费责任界定', desc: '整理退换货运费责任界定规则', prompt: '整理退换货运费责任界定规则', bubble: '运费责任界定', kb: '售后知识库' },
      { title: '情绪降级', desc: '设计情绪识别后的降级话术', prompt: '设计情绪识别后的降级话术', bubble: '情绪降级', kb: '售后知识库' },
      { title: '售后周报', desc: '输出售后数据周报结构', prompt: '输出售后数据周报结构', bubble: '售后周报', kb: '售后知识库' },
    ],
  },
  {
    value: 'shuju',
    label: '大表姐',
    role: '数据分析专家',
    desc: '输出经营报表、诊断异常指标（如转化率下降原因）',
    level: 'P7',
    accent: '#ea5ec1',
    emoji: '📊',
    prompts: [
      { title: '经营周报', desc: '输出上周经营数据报告，覆盖GMV、转化率、客单价与环比', prompt: '输出上周经营数据报告，覆盖GMV、转化率、客单价与环比', bubble: '经营周报', kb: '经营分析库' },
      { title: '转化归因', desc: '本周转化率环比下降15%，帮我做归因分析并列出可能原因优先级', prompt: '本周转化率环比下降15%，帮我做归因分析并列出可能原因优先级', bubble: '转化归因', kb: '经营分析库' },
      { title: '复盘看板', desc: '搭建一个运营复盘看板结构，包含核心指标与下钻维度', prompt: '搭建一个运营复盘看板结构，包含核心指标与下钻维度', bubble: '复盘看板', kb: '经营分析库' },
      { title: '渠道ROI', desc: '分析各渠道ROI，给出预算再分配建议', prompt: '分析各渠道ROI，给出预算再分配建议', bubble: '渠道ROI', kb: '经营分析库' },
      { title: '会员留存', desc: '输出会员留存分析报告，定位流失节点', prompt: '输出会员留存分析报告，定位流失节点', bubble: '会员留存', kb: '经营分析库' },
      { title: '同期对比', desc: '对比去年同期，输出增长归因', prompt: '对比去年同期，输出增长归因', bubble: '同期对比', kb: '经营分析库' },
      { title: '滞销预警', desc: '监控库存周转，预警滞销风险', prompt: '监控库存周转，预警滞销风险', bubble: '滞销预警', kb: '经营分析库' },
      { title: '驾驶舱指标', desc: '生成月度经营驾驶舱指标定义', prompt: '生成月度经营驾驶舱指标定义', bubble: '驾驶舱指标', kb: '经营分析库' },
      { title: '客单价提升', desc: '分析客单价结构，给出提升建议', prompt: '分析客单价结构，给出提升建议', bubble: '客单价提升', kb: '经营分析库' },
      { title: '活动复盘', desc: '输出活动的投入产出复盘', prompt: '输出活动的投入产出复盘', bubble: '活动复盘', kb: '经营分析库' },
    ],
  },
  {
    value: 'b2b',
    label: '大客户一哥',
    role: 'B2B客户经理专家',
    desc: '协助处理大客户询价、合同条款、账期查询等B端专属事务',
    level: 'P7',
    accent: '#1456f0',
    emoji: '💼',
    prompts: [
      { title: '询价响应模板', desc: '帮我对A级客户做一份询价响应模板，含阶梯报价与账期方案', prompt: '帮我对A级客户做一份询价响应模板，含阶梯报价与账期方案', bubble: '询价响应模板', kb: 'B2B客户库' },
      { title: '授信评估', desc: '查询某大客户的历史交易与回款记录，评估本次授信额度', prompt: '查询某大客户的历史交易与回款记录，评估本次授信额度', bubble: '授信评估', kb: 'B2B客户库' },
      { title: '经销合同', desc: '起草一份标准经销合同的核心条款说明，突出账期与退换政策', prompt: '起草一份标准经销合同的核心条款说明，突出账期与退换政策', bubble: '经销合同', kb: 'B2B客户库' },
      { title: '年度框架协议', desc: '为大客户定制年度框架协议要点', prompt: '为大客户定制年度框架协议要点', bubble: '年度框架协议', kb: 'B2B客户库' },
      { title: '客户分级', desc: '评估客户分级规则，给出调整建议', prompt: '评估客户分级规则，给出调整建议', bubble: '客户分级', kb: 'B2B客户库' },
      { title: '季度回顾', desc: '生成大客户季度回顾报告结构', prompt: '生成大客户季度回顾报告结构', bubble: '季度回顾', kb: 'B2B客户库' },
      { title: '丢单挽回', desc: '针对丢单客户做竞品对比与挽回方案', prompt: '针对丢单客户做竞品对比与挽回方案', bubble: '丢单挽回', kb: 'B2B客户库' },
      { title: '专属权益', desc: '设计大客户专属权益体系', prompt: '设计大客户专属权益体系', bubble: '专属权益', kb: 'B2B客户库' },
      { title: '授信审批优化', desc: '输出授信审批流程优化建议', prompt: '输出授信审批流程优化建议', bubble: '授信审批优化', kb: 'B2B客户库' },
      { title: '合同风险清单', desc: '整理合同风险条款检查清单', prompt: '整理合同风险条款检查清单', bubble: '合同风险清单', kb: 'B2B客户库' },
    ],
  },
  {
    value: 'zhibo',
    label: '操盘手',
    role: '直播运营专家',
    desc: '覆盖直播前中后全链路：策划排品、实时场控、数据复盘',
    level: 'P6',
    accent: '#a855f7',
    emoji: '🎬',
    prompts: [
      { title: '排品节奏', desc: '为一场2小时的运动鞋品牌自播设计排品节奏与秒杀节点', prompt: '为一场2小时的运动鞋品牌自播设计排品节奏与秒杀节点', bubble: '排品节奏', kb: '直播运营库' },
      { title: '弹幕互动', desc: '直播中弹幕集中问尺码，给我一套即时互动话术与转粉钩子', prompt: '直播中弹幕集中问尺码，给我一套即时互动话术与转粉钩子', bubble: '弹幕互动', kb: '直播运营库' },
      { title: '直播复盘', desc: '根据昨晚直播数据生成复盘报告，指出停留与转化的薄弱环节', prompt: '根据昨晚直播数据生成复盘报告，指出停留与转化的薄弱环节', bubble: '直播复盘', kb: '直播运营库' },
      { title: '预热短视频', desc: '设计直播前预热短视频脚本', prompt: '设计直播前预热短视频脚本', bubble: '预热短视频', kb: '直播运营库' },
      { title: '达人合作', desc: '规划达人合作直播的分工与利益分配', prompt: '规划达人合作直播的分工与利益分配', bubble: '达人合作', kb: '直播运营库' },
      { title: '中控SOP', desc: '生成直播中控台操作SOP', prompt: '生成直播中控台操作SOP', bubble: '中控SOP', kb: '直播运营库' },
      { title: '福袋互动', desc: '针对低转化时段设计福袋互动方案', prompt: '针对低转化时段设计福袋互动方案', bubble: '福袋互动', kb: '直播运营库' },
      { title: '大促排期', desc: '输出大促直播排期与人员排班', prompt: '输出大促直播排期与人员排班', bubble: '大促排期', kb: '直播运营库' },
      { title: '话术库', desc: '设计直播话术库，覆盖开场/卖点/逼单', prompt: '设计直播话术库，覆盖开场/卖点/逼单', bubble: '话术库', kb: '直播运营库' },
      { title: '数据看板', desc: '生成直播数据看板指标定义', prompt: '生成直播数据看板指标定义', bubble: '数据看板', kb: '直播运营库' },
    ],
  },
  {
    value: 'toufang',
    label: '老王',
    role: '流量投放专家',
    desc: '监控多平台投放计划的ROI、消耗节奏，预警异常波动并给出调优建议',
    level: 'P6',
    accent: '#ff5530',
    emoji: '📈',
    prompts: [
      { title: '投放ROI看板', desc: '汇总抖音+小红书本周投放ROI看板，标注消耗异常的计划', prompt: '汇总抖音+小红书本周投放ROI看板，标注消耗异常的计划', bubble: '投放ROI看板', kb: '投放数据台' },
      { title: '转化诊断', desc: '某计划CTR正常但转化骤降，帮我诊断并给出调价与素材建议', prompt: '某计划CTR正常但转化骤降，帮我诊断并给出调价与素材建议', bubble: '转化诊断', kb: '投放数据台' },
      { title: '大促调优', desc: '大促当天高频调优节奏怎么排，给出分时段预算分配方案', prompt: '大促当天高频调优节奏怎么排，给出分时段预算分配方案', bubble: '大促调优', kb: '投放数据台' },
      { title: '预算倾斜', desc: '分析各平台CPA，给出预算倾斜建议', prompt: '分析各平台CPA，给出预算倾斜建议', bubble: '预算倾斜', kb: '投放数据台' },
      { title: '冷启动出价', desc: '新计划冷启动期如何设置出价与定向', prompt: '新计划冷启动期如何设置出价与定向', bubble: '冷启动出价', kb: '投放数据台' },
      { title: '创意衰退', desc: '诊断创意衰退，给出迭代方向', prompt: '诊断创意衰退，给出迭代方向', bubble: '创意衰退', kb: '投放数据台' },
      { title: '投放日报', desc: '生成投放日报结构', prompt: '生成投放日报结构', bubble: '投放日报', kb: '投放数据台' },
      { title: '计划优化', desc: '针对ROI低于阈值的计划给出暂停/优化建议', prompt: '针对ROI低于阈值的计划给出暂停/优化建议', bubble: '计划优化', kb: '投放数据台' },
      { title: 'A/B测试', desc: '设计A/B测试方案对比素材', prompt: '设计A/B测试方案对比素材', bubble: 'A/B测试', kb: '投放数据台' },
      { title: '月度复盘', desc: '输出月度投放复盘与下月规划', prompt: '输出月度投放复盘与下月规划', bubble: '月度复盘', kb: '投放数据台' },
    ],
  },
  {
    value: 'hegui',
    label: '老纠',
    role: '质量合规专家',
    desc: '监控商品质量与合规风险，建立质检标准与售后责任界定',
    level: 'P7',
    accent: '#ea5ec1',
    emoji: '🔍',
    prompts: [
      { title: '质检标准', desc: '为新上架运动鞋建立质检标准清单，覆盖开胶、脱线等常见缺陷', prompt: '为新上架运动鞋建立质检标准清单，覆盖开胶、脱线等常见缺陷', bubble: '质检标准', kb: '质量合规库' },
      { title: '文案合规', desc: '审查一批新品宣传文案，标注可能违规的夸大用语', prompt: '审查一批新品宣传文案，标注可能违规的夸大用语', bubble: '文案合规', kb: '质量合规库' },
      { title: '召回责任', desc: '某批次服装检出pH值超标，给出召回与责任界定流程', prompt: '某批次服装检出pH值超标，给出召回与责任界定流程', bubble: '召回责任', kb: '质量合规库' },
      { title: '售后责任', desc: '建立售后质量问题责任界定规则，区分厂家与物流', prompt: '建立售后质量问题责任界定规则，区分厂家与物流', bubble: '售后责任', kb: '质量合规库' },
      { title: '合规自查', desc: '针对平台合规新规，输出商品信息自查清单', prompt: '针对平台合规新规，输出商品信息自查清单', bubble: '合规自查', kb: '质量合规库' },
      { title: '质量评分卡', desc: '生成供应商质量评分卡模板', prompt: '生成供应商质量评分卡模板', bubble: '质量评分卡', kb: '质量合规库' },
      { title: '客诉根因', desc: '某SKU客诉集中，给出根因分析与整改建议', prompt: '某SKU客诉集中，给出根因分析与整改建议', bubble: '客诉根因', kb: '质量合规库' },
      { title: '合同合规', desc: '审查经销合同条款的合规风险', prompt: '审查经销合同条款的合规风险', bubble: '合同合规', kb: '质量合规库' },
      { title: '风险预警', desc: '输出月度质量合规风险预警报告结构', prompt: '输出月度质量合规风险预警报告结构', bubble: '风险预警', kb: '质量合规库' },
      { title: '闭环SOP', desc: '设计质量问题闭环处理SOP', prompt: '设计质量问题闭环处理SOP', bubble: '闭环SOP', kb: '质量合规库' },
    ],
  },
]

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

// 日常办公模式「快捷指令区」（PRD P0-4）：生成钉钉待办 / 生成需求草稿 / 封装成技能（提示词预填）
const quickInstructionCases: CaseItem[] = [
  {
    title: '生成钉钉待办',
    icon: CheckCircle2,
    desc: '把任务一键沉淀为钉钉待办清单',
    prompt: '帮我把以下任务生成钉钉待办清单，每项标注负责人和截止时间：',
    kb: '钉钉待办规则',
  },
  {
    title: '生成需求草稿',
    icon: FileText,
    desc: '按模板快速产出结构化需求',
    prompt: '帮我写一份需求草稿，包含背景、目标、范围、关键流程和验收标准。',
    kb: '需求模板库',
  },
  {
    title: '封装成技能',
    icon: Sparkles,
    desc: '把重复流程沉淀为可复用技能',
    prompt: '把这段工作流程封装成一个可复用的技能，说明触发条件、输入和产出。',
    kb: '技能模板库',
  },
]

const hasSessionAssets = computed(() => hasGeneratedAssets.value)
const rightPanelVisible = computed(() => false)
const sortedConversations = computed(() => [...conversations.value])
const filteredConversations = computed(() => {
  const q = conversationSearch.value.trim().toLowerCase()
  if (!q) return sortedConversations.value
  return sortedConversations.value.filter((item) =>
    item.title.toLowerCase().includes(q) || item.mode.includes(q)
  )
})
const sidebarConversationGroups = computed(() => [
  { key: 'task' as const, label: '专家模式', items: filteredConversations.value.filter((item) => item.mode === '专家模式') },
  { key: 'quick' as const, label: '日常办公', items: filteredConversations.value.filter((item) => item.mode === '日常办公') },
].filter((group) => group.items.length))
const historyBrowserConversations = computed(() => {
  const keyword = historyBrowserSearch.value.trim().toLowerCase()
  return sortedConversations.value.filter((item) => {
    const modeMatched = historyBrowserModeFilter.value === 'all'
      || (historyBrowserModeFilter.value === 'quick' && item.mode === '日常办公')
      || (historyBrowserModeFilter.value === 'task' && item.mode === '专家模式')
    if (!modeMatched) return false
    if (!keyword) return true
    return `${item.title}${item.mode}${item.time}${getConversationDetail(item)}${getConversationStatusLabel(item.status)}`.toLowerCase().includes(keyword)
  })
})
const currentAgentOptions = computed(() => (runMode.value === 'task' ? expertAgents : officeAgents))
const currentAgentLabel = computed(() => currentAgentOptions.value.find((agent) => agent.value === selectedAgent.value)?.label ?? '')
const selectedExpert = computed(() => expertAgents.find((agent) => agent.value === selectedAgent.value && agent.value !== 'soon') ?? null)
const featuredExpertAgents = computed(() => expertAgents.filter((agent) => agent.value !== 'soon'))
const pagedExperts = computed(() => {
  const start = (expertPage.value - 1) * EXPERT_PAGE_SIZE
  return featuredExpertAgents.value.slice(start, start + EXPERT_PAGE_SIZE)
})
const expertTotalPages = computed(() => Math.max(1, Math.ceil(featuredExpertAgents.value.length / EXPERT_PAGE_SIZE)))
const pagedCases = computed(() => {
  if (!selectedExpert.value) return []
  const start = (casePage.value - 1) * EXPERT_PAGE_SIZE
  return selectedExpert.value.prompts.slice(start, start + EXPERT_PAGE_SIZE)
})
const caseTotalPages = computed(() =>
  selectedExpert.value ? Math.max(1, Math.ceil(selectedExpert.value.prompts.length / EXPERT_PAGE_SIZE)) : 1,
)
watch(selectedExpert, () => {
  casePage.value = 1
})
watch(runMode, () => {
  expertPage.value = 1
  casePage.value = 1
})
const needsExpertSelection = computed(() => runMode.value === 'task' && !selectedExpert.value)
const canSend = computed(() =>
  !isThinking.value
  && Boolean(query.value.trim() || selectedFiles.value.length || selectedKnowledgeRefs.value.length)
  && !needsExpertSelection.value,
)
const currentAgentDescription = computed(() => {
  if (runMode.value === 'task') return selectedExpert.value?.desc ?? '先选择一个专家，小马会把任务交给合适的专家执行。'
  return '全能助手擅长处理日常办公、知识查询、资料整理和轻量协同任务。'
})
const visibleCases = computed<CaseItem[]>(() => {
  if (runMode.value === 'task') return selectedExpert.value?.prompts ?? []
  return quickInstructionCases
})
const artifactPreviewVisible = computed(() => Boolean(activeArtifactPreview.value))
const placeholder = computed(() => {
  if (runMode.value === 'task' && !selectedExpert.value) return '请在下方选择合适的专家，小马会把任务托付给他/她高效完成'
  if (runMode.value === 'task') return `${selectedExpert.value?.label ?? '专家'}已就绪，说说具体任务目标吧`
  return '小马在线，随时向我提问或上传文件...'
})
const modeLabel = computed(() => {
  if (runMode.value === 'task') return '专家模式'
  return '日常办公'
})
const agentSelectLabel = computed(() => runMode.value === 'task' ? '专家' : '助手')
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
  '--left-inset': isChatActive.value && showHistory.value ? '270px' : '0px',
  '--right-inset': artifactPreviewVisible.value ? 'clamp(420px,42vw,760px)' : '0px',
  width: 'min(calc(100vw - var(--left-inset) - var(--right-inset) - clamp(36px,5vw,88px)), clamp(760px,74vw,1320px))',
  transform: 'translateX(calc((var(--left-inset) - var(--right-inset)) / 2))',
}))
const chatTitleLayerStyle = computed(() => ({
  '--left-inset': isChatActive.value && showHistory.value ? '270px' : '0px',
  '--right-inset': artifactPreviewVisible.value ? 'clamp(420px,42vw,760px)' : '0px',
  left: 'var(--left-inset)',
  right: 'var(--right-inset)',
}))
const homeHeroStyle = computed(() => ({
  '--left-inset': showHistory.value ? '270px' : '0px',
  '--right-inset': rightPanelVisible.value ? 'clamp(286px,21vw,400px)' : '0px',
  width: runMode.value === 'quick'
    ? 'min(calc(100vw - var(--left-inset) - var(--right-inset) - clamp(36px,5vw,88px)), 860px)'
    : 'min(calc(100vw - var(--left-inset) - var(--right-inset) - clamp(36px,5vw,88px)), clamp(760px,72vw,1280px))',
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
  showRecommendations.value = true
  modeMenuOpen.value = false
  agentMenuOpen.value = false
}
function selectAgent(agentValue: string) {
  if (agentValue.startsWith('soon')) return
  selectedAgent.value = agentValue
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
  const nextMode = mode === 'task' ? '专家模式' : '日常办公'
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
  <div class="min-h-[calc(100vh-3.5rem)] bg-white text-zinc-950 md:min-h-[calc(100vh-4rem)]">
    <div v-if="!showHistory" data-testid="home-side-dock" class="fixed left-3 top-[4.75rem] z-40 flex items-center gap-1 rounded-xl border border-zinc-200 bg-white/95 p-1 shadow-sm backdrop-blur">
      <button
        type="button"
        data-testid="home-sidebar-toggle"
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
        aria-label="展开历史对话栏"
        @click="showHistory = true"
      >
        <ChevronsRight class="h-4 w-4" />
      </button>
      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950 text-white transition hover:bg-zinc-800"
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
        class="fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-[#eaeaea] bg-white transition-transform duration-300 lg:top-16 lg:h-[calc(100vh-4rem)]"
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
        <div class="border-b border-zinc-100 px-3 py-2">
          <label class="flex h-8 items-center gap-2 rounded-lg bg-zinc-50 px-2.5 text-xs text-zinc-400 ring-1 ring-zinc-200/0 focus-within:ring-blue-300">
            <Search class="h-3.5 w-3.5 shrink-0" />
            <input v-model="conversationSearch" class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-zinc-300" placeholder="搜索会话..." />
            <button v-if="conversationSearch" type="button" class="rounded p-0.5 hover:bg-zinc-200" aria-label="清除搜索" @click="conversationSearch = ''">
              <X class="h-3 w-3" />
            </button>
          </label>
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

      <main class="flex min-h-[calc(100vh-3.5rem)] flex-col px-[clamp(12px,2.2vw,34px)] py-[clamp(10px,1.4vw,18px)] md:min-h-[calc(100vh-4rem)]">
        <input ref="fileInput" class="hidden" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg" @change="handleFiles" />
        <section
          v-if="!isChatActive && !showHistoryBrowser"
          data-testid="home-hero-section"
          class="mx-auto flex flex-1 flex-col items-center justify-start pb-[clamp(18px,3vw,36px)] pt-[clamp(72px,12vh,134px)] transition-[width,transform] duration-300"
          :style="homeHeroStyle"
        >
          <div class="mb-6 text-center">
            <img :src="ponyAvatarUrl" alt="小马头像" class="mx-auto mb-4 h-[clamp(78px,5.6vw,104px)] w-[clamp(78px,5.6vw,104px)] object-contain drop-shadow-[0_14px_24px_rgba(15,23,42,0.1)]" />
            <h1 class="text-[clamp(22px,1.5vw,26px)] font-semibold leading-tight tracking-normal text-zinc-950">小马在线，有事随时说</h1>
          </div>

          <div data-testid="hero-composer" class="composer-shell mx-auto min-h-[112px] w-full max-w-[800px] rounded-[24px] border border-[#e5e5e5] bg-white p-4 shadow-[0_24px_20px_-28px_rgba(0,0,0,0.16)]" @pointermove="updateComposerGlow" @pointerleave="resetComposerGlow">
            <div class="flex items-start gap-2 px-2">
              <div v-if="runMode === 'task' && selectedExpert" class="mt-2 inline-flex max-w-[180px] shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium" :style="{ borderColor: (selectedExpert.accent || '#0a0a0a') + '40', backgroundColor: (selectedExpert.accent || '#0a0a0a') + '12', color: selectedExpert.accent || '#0a0a0a' }">
                <Sparkles class="h-3.5 w-3.5 shrink-0" />
                <span class="truncate">{{ selectedExpert.label }}</span>
                <button type="button" class="rounded-md p-0.5 hover:bg-black/5" aria-label="移除已选专家" @click="clearSelectedExpert">
                  <X class="h-3.5 w-3.5" />
                </button>
              </div>
              <textarea
                ref="composer"
                v-model="query"
                rows="1"
                class="max-h-[168px] min-h-10 flex-1 resize-none bg-transparent py-2 text-base leading-7 outline-none placeholder:text-zinc-400"
                :placeholder="placeholder"
                :disabled="isThinking"
                @input="resizeComposer"
                @paste="handlePaste"
                @focus="showRecommendations = true"
                @keydown.enter.exact.prevent="sendMessage"
              />
              <button
                class="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition"
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



            <div class="flex flex-wrap items-center gap-2 border-t border-transparent px-2 pt-3">
              <div class="relative">
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
                :class="webSearchEnabled ? 'border-blue-100 bg-[#f1f7ff] text-blue-600' : 'border-zinc-200 bg-zinc-50 text-zinc-400'"
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
                  <Bot v-else class="h-3.5 w-3.5" />
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
                    <CheckCircle2 v-if="runMode === 'quick'" class="mt-0.5 h-4 w-4 text-[#0a0a0a]" />
                  </button>
                  <button type="button" data-testid="mode-option-task" class="flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-zinc-50" @click.stop="selectMode('task')">
                    <Bot class="mt-0.5 h-4 w-4 text-[#0a0a0a]" />
                    <span class="min-w-0 flex-1">
                      <span class="block text-sm font-medium text-zinc-900">专家模式</span>
                      <span class="block text-xs leading-5 text-zinc-400">处理复杂的专项类任务</span>
                    </span>
                    <CheckCircle2 v-if="runMode === 'task'" class="mt-0.5 h-4 w-4 text-[#0a0a0a]" />
                  </button>
                </div>
              </div>
              <div v-if="runMode === 'task' && selectedExpert" class="group/agent relative ml-auto">
                <button
                  type="button"
                  class="inline-flex h-8 min-w-28 items-center justify-between gap-2 px-2 text-xs font-medium"
                  :style="{ color: (selectedExpert?.accent || '#0a0a0a') }"
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
                    <Sparkles class="h-4 w-4 shrink-0 text-zinc-400" />
                    <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ agent.label }}</span>
                    <CheckCircle2 v-if="selectedAgent === agent.value" class="h-4 w-4 shrink-0 text-blue-600" />
                  </button>
                </div>
              </div>
            </div>

          </div>

          <Transition name="recommend">
            <div v-if="showRecommendations" data-testid="home-case-section" class="mt-5 w-full">
              <div v-if="runMode === 'task' && !selectedExpert" class="mx-auto w-full max-w-[920px]">
                <div class="grid grid-cols-3 gap-3">
                  <button
                    v-for="expert in pagedExperts"
                    :key="expert.value"
                    type="button"
                    class="group flex min-h-[96px] items-center overflow-hidden rounded-2xl p-4 text-left text-white transition hover:opacity-90" :style="{ backgroundColor: expert.accent }"
                    @click="selectAgent(expert.value)"
                  >
                    <div class="flex w-full items-center gap-3">
                      <div class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20 text-xl">{{ expert.emoji }}</div>
                      <div class="min-w-0">
                        <div class="truncate font-semibold text-sm text-zinc-950">{{ expert.label }}</div>
                        <div class="truncate text-[11px] text-zinc-400">{{ expert.role }}</div>
                        <div class="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{{ expert.desc }}</div>
                      </div>
                    </div>
                  </button>
                </div>
                <div v-if="expertTotalPages > 1" class="mt-4 flex items-center justify-center gap-2 text-sm">
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                    :disabled="expertPage === 1"
                    @click="expertPage = Math.max(1, expertPage - 1)"
                  >‹</button>
                  <button
                    v-for="p in expertTotalPages"
                    :key="p"
                    type="button"
                    class="h-8 min-w-8 rounded-full border px-2 transition"
                    :class="p === expertPage ? 'border-[#0a0a0a] bg-[#0a0a0a] font-medium text-white' : 'border-zinc-200 text-zinc-500 hover:bg-zinc-100'"
                    @click="expertPage = p"
                  >{{ p }}</button>
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                    :disabled="expertPage === expertTotalPages"
                    @click="expertPage = Math.min(expertTotalPages, expertPage + 1)"
                  >›</button>
                </div>
              </div>

              <div v-else-if="runMode === 'task' && selectedExpert" class="mx-auto w-full max-w-[920px]">
                <button type="button" class="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-900" @click="clearSelectedExpert">
                  <span class="text-base leading-none">‹</span> 返回专家列表
                </button>
                <div class="mb-4 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
                  <div class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl text-white" :style="{ backgroundColor: selectedExpert.accent }">{{ selectedExpert.emoji }}</div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-base font-semibold text-zinc-950">{{ selectedExpert.label }}</span>
                      <span class="rounded-full border border-zinc-200 px-2 py-px text-[11px] text-zinc-500">{{ selectedExpert.role }}</span>
                    </div>
                    <p class="mt-0.5 truncate text-xs text-zinc-400">{{ selectedExpert.desc }}</p>
                  </div>
                </div>
                <div class="mx-auto max-w-[620px]">
                  <div class="flex flex-wrap justify-center gap-2">
                    <button
                      v-for="(item, index) in visibleCases"
                      :key="item.title"
                      type="button"
                      class="max-w-[min(520px,100%)] rounded-full bg-zinc-100 px-4 py-2.5 text-left text-sm leading-5 text-zinc-800 transition hover:bg-[#f2f3f5]"
                      :class="[
                        index % 5 === 0 ? 'w-[256px]' : '',
                        index % 5 === 1 ? 'w-[172px]' : '',
                        index % 5 === 2 ? 'w-[340px]' : '',
                        index % 5 === 3 ? 'w-[186px]' : '',
                        index % 5 === 4 ? 'w-[396px]' : '',
                      ]"
                      @click="fillPrompt(item, runMode); showRecommendations = true"
                    >
                      <span class="block truncate">{{ item.bubble ?? item.title }}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div
                v-else
                class="mx-auto w-full max-w-[920px]"
              >
                <div class="grid grid-cols-3 gap-3">
                  <button
                    v-for="(item, i) in quickInstructionCases"
                    :key="item.title"
                    type="button"
                    class="group flex min-h-[96px] items-center rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
                    @click="fillPrompt(item, runMode); showRecommendations = true"
                  >
                    <div class="flex w-full items-center gap-3">
                      <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl" :class="i % 3 === 0 ? 'bg-[#ff5530]/10 text-[#ff5530]' : i % 3 === 1 ? 'bg-[#ea5ec1]/10 text-[#ea5ec1]' : 'bg-[#1456f0]/10 text-[#1456f0]'">
                        <component :is="'icon' in item ? item.icon : FileText" class="h-5 w-5" />
                      </div>
                      <div class="min-w-0">
                        <div class="truncate font-semibold text-sm text-zinc-950">{{ item.title }}</div>
                        <div class="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{{ item.desc }}</div>
                        <div v-if="item.kb" class="mt-1 text-[11px] text-blue-500">引用 {{ item.kb }}</div>
                      </div>
                    </div>
                  </button>
                </div>
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
                <div v-if="message.role === 'user' && editingUserMessageId === message.id" class="rounded-2xl bg-zinc-100 px-4 py-3 shadow-sm">
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
                    <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800" :aria-label="copiedMessageId === message.id ? '已复制回答' : '复制回答'" :title="copiedMessageId === message.id ? '已复制回答' : '复制回答'" @click="copyAnswer(message)">
                      <CheckCircle2 v-if="copiedMessageId === message.id" class="h-4 w-4 text-emerald-600" />
                      <Copy v-else class="h-4 w-4" />
                    </button>
                    <span class="h-4 w-px bg-zinc-200" />
                    <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800" aria-label="引用回答" title="引用回答" @click="quoteAnswer(message)">
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

            <div v-if="isThinking" class="flex items-center justify-center gap-2 py-3">
              <div class="flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-1.5">
                <Loader2 class="h-3.5 w-3.5 animate-spin text-blue-600" />
                <span class="text-xs text-zinc-500">小马正在生成回答...</span>
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
              <div v-if="quotedMessageId" class="mb-2 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
                <Quote class="h-3.5 w-3.5 shrink-0" />
                <span class="min-w-0 flex-1 truncate">
                  正在引用：{{ messages.find(m => m.id === quotedMessageId)?.content.slice(0, 80) }}
                </span>
                <button type="button" class="rounded p-1 hover:bg-blue-100" aria-label="取消引用" @click="quotedMessageId = ''">
                  <X class="h-3.5 w-3.5" />
                </button>
              </div>
            <div class="flex items-end gap-2">
              <div v-if="runMode === 'task' && selectedExpert" class="mb-1 inline-flex max-w-[160px] shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium" :style="{ borderColor: (selectedExpert.accent || '#0a0a0a') + '40', backgroundColor: (selectedExpert.accent || '#0a0a0a') + '12', color: selectedExpert.accent || '#0a0a0a' }">
                <Sparkles class="h-3.5 w-3.5 shrink-0" />
                <span class="truncate">{{ selectedExpert.label }}</span>
                <button type="button" class="rounded p-0.5 hover:bg-black/5" aria-label="移除已选专家" @click="clearSelectedExpert">
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
                <div class="relative">
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
                  :class="webSearchEnabled ? 'border-blue-100 bg-[#f1f7ff] text-blue-600' : 'border-zinc-200 bg-zinc-50 text-zinc-400'"
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
                    <Bot v-else class="h-3.5 w-3.5" />
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
                      <CheckCircle2 v-if="runMode === 'quick'" class="mt-0.5 h-4 w-4 text-[#0a0a0a]" />
                    </button>
                    <button type="button" data-testid="mode-option-task" class="flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-zinc-50" @click.stop="selectMode('task')">
                      <Bot class="mt-0.5 h-4 w-4 text-[#0a0a0a]" />
                      <span class="min-w-0 flex-1">
                        <span class="block text-sm font-medium text-zinc-900">专家模式</span>
                        <span class="block text-xs leading-5 text-zinc-400">处理复杂的专项类任务</span>
                      </span>
                      <CheckCircle2 v-if="runMode === 'task'" class="mt-0.5 h-4 w-4 text-[#0a0a0a]" />
                    </button>
                  </div>
                </div>
                <div v-if="runMode === 'task' && selectedExpert" class="relative ml-auto">
                  <button
                    type="button"
                    class="inline-flex h-8 min-w-28 items-center justify-between gap-2 px-2 text-xs font-medium"
                    :style="{ color: (selectedExpert?.accent || '#0a0a0a') }"
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
                      <Sparkles class="h-4 w-4 shrink-0 text-zinc-400" />
                      <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ agent.label }}</span>
                      <CheckCircle2 v-if="selectedAgent === agent.value" class="h-4 w-4 shrink-0 text-blue-600" />
                    </button>
                  </div>
                </div>
                <span class="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white p-2" :style="contextRingStyle" title="上下文">
                  <span class="h-3.5 w-3.5 rounded-full bg-white" />
                </span>
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

          <section v-if="hasGeneratedAssets" class="rounded-lg border border-transparent px-3 py-2.5 hover:border-zinc-200 hover:bg-zinc-50">
            <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-800">
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
                <div class="w-1/3 rounded-t-md bg-zinc-300" style="height: 54%"></div>
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
  transition: box-shadow 180ms ease, border-color 180ms ease;
  --composer-x: 50%;
  --composer-y: 50%;
}

.composer-shell::before {
  content: '';
  position: absolute;
  left: 18%;
  right: 18%;
  bottom: -18px;
  height: 42px;
  z-index: -1;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  filter: blur(22px);
  opacity: 0.18;
  transition: opacity 220ms ease;
}

.composer-shell:hover,
.composer-shell:focus-within {
  border-color: rgba(203, 213, 225, 0.95);
  box-shadow: 0 24px 24px -28px rgba(0, 0, 0, 0.28);
}

.composer-shell:hover::before,
.composer-shell:focus-within::before {
  opacity: 0.24;
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
