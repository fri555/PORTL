<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  BadgeCheck,
  BarChart3,
  Bot,
  Boxes,
  Brain,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Clock3,
  Database,
  FileText,
  Globe,
  MessageCircle,
  MonitorPlay,
  Paperclip,
  Play,
  PlugZap,
  Plus,
  Radio,
  Search,
  SendHorizontal,
  Sparkles,
  Store,
  UserCircle,
  Users,
  Workflow,
  Wrench,
  X,
  Zap,
} from 'lucide-vue-next'
import { agents } from '@/mock/agents'
import { activeLiveSession, digitalHumans, liveStats, recentSessions, scheduledSessions } from '@/mock/digitalHuman'
import { skills } from '@/mock/skills'
import { knowledgeBases } from '@/mock/knowledge'
import type { Agent } from '@/types/agent'

type CreateType = 'agent' | 'knowledge' | 'skill' | 'task'
type MarketTab = 'experts' | 'teams' | 'agents' | 'mcp' | 'skills'

interface MarketCard {
  id: string
  title: string
  description: string
  meta: string
  badge: string
  score?: string
  icon: unknown
  tone: string
}

const router = useRouter()
const selectedAgent = ref<Agent>(agents[0])
const chatInput = ref('')
const searchKeyword = ref('')
const activeMarketTab = ref<MarketTab>('experts')
const showMarket = ref(false)
const showDigitalHuman = ref(false)
const showCreateDialog = ref(false)
const createType = ref<CreateType>('agent')
const selectedMarketCard = ref<MarketCard | null>(null)
const selectedMarketContext = ref<MarketTab>('experts')
const deployedCapabilities = ref<string[]>([])
const deployConfig = ref({
  workspace: '我的工作台',
  targetAgent: 'ag01',
  departments: ['电商运营部'],
})
const createForm = ref({
  name: '',
  description: '',
  target: '',
  schedule: '每天 09:00',
})

const createMeta: Record<CreateType, { title: string; subtitle: string; icon: unknown; primary: string }> = {
  agent: {
    title: '创建智能体',
    subtitle: '配置角色、人设、模型、知识库和可调用技能，发布后可以进入市场或团队空间。',
    icon: Bot,
    primary: '创建草稿',
  },
  knowledge: {
    title: '创建知识库',
    subtitle: '沉淀制度、商品、运营、客服等文档，供智能体检索引用。',
    icon: Database,
    primary: '新建知识库',
  },
  skill: {
    title: '创建技能',
    subtitle: '把稳定的提示词、工作流或接口封装为可复用技能。',
    icon: Wrench,
    primary: '创建技能',
  },
  task: {
    title: '设置定时任务',
    subtitle: '让智能体按固定时间触发日报、巡检、提醒、数据同步等任务。',
    icon: CalendarClock,
    primary: '保存任务',
  },
}

const quickActions = [
  {
    type: 'agent' as const,
    title: '创建智能体',
    desc: '角色设定、工具、知识库、欢迎语',
    icon: Bot,
    tone: 'from-blue-50 to-cyan-50 text-blue-700',
  },
  {
    type: 'knowledge' as const,
    title: '创建知识库',
    desc: '文档入库、向量检索、引用设置',
    icon: Database,
    tone: 'from-emerald-50 to-teal-50 text-emerald-700',
  },
  {
    type: 'skill' as const,
    title: '创建技能',
    desc: 'Prompt、工作流、API 能力封装',
    icon: Wrench,
    tone: 'from-violet-50 to-fuchsia-50 text-violet-700',
  },
  {
    type: 'task' as const,
    title: '定时任务',
    desc: '日报、巡检、提醒、自动推送',
    icon: CalendarClock,
    tone: 'from-amber-50 to-orange-50 text-amber-700',
  },
]

const marketTabs: { id: MarketTab; label: string; icon: unknown }[] = [
  { id: 'experts', label: '专家', icon: BadgeCheck },
  { id: 'teams', label: '专家团', icon: Users },
  { id: 'agents', label: '智能体', icon: Bot },
  { id: 'mcp', label: 'MCP能力', icon: PlugZap },
  { id: 'skills', label: '技能', icon: Wrench },
]

const expertCards: MarketCard[] = [
  {
    id: 'expert-retail',
    title: '零售增长专家',
    description: '诊断门店销量、客单价、连带率，输出行动清单和复盘模板。',
    meta: '零售运营部 · 18个案例',
    badge: '推荐',
    score: '4.9',
    icon: Store,
    tone: 'bg-blue-50 text-blue-700',
  },
  {
    id: 'expert-supply',
    title: '供应链策略顾问',
    description: '覆盖补货、调拨、供应商绩效和库存周转，适合周例会前快速拉齐事实。',
    meta: '供应链中心 · 12个流程',
    badge: '高频',
    score: '4.8',
    icon: Boxes,
    tone: 'bg-cyan-50 text-cyan-700',
  },
  {
    id: 'expert-brand',
    title: '品牌内容主理人',
    description: '把活动主题拆成海报文案、短视频脚本、小红书种草和达人brief。',
    meta: '市场营销部 · 26个模板',
    badge: '新',
    score: '4.7',
    icon: Sparkles,
    tone: 'bg-rose-50 text-rose-700',
  },
]

const teamCards: MarketCard[] = [
  {
    id: 'team-launch',
    title: '新品上市专家团',
    description: '商品、内容、投放、门店、客服五类专家协作，生成上市全链路作战表。',
    meta: '5个专家 · 9个技能 · 3个知识库',
    badge: '协作',
    icon: Users,
    tone: 'bg-indigo-50 text-indigo-700',
  },
  {
    id: 'team-risk',
    title: '经营风险巡检组',
    description: '自动检查库存、价格、舆情、客服投诉和费用异常，适合做每日早报。',
    meta: '4个专家 · 支持定时任务',
    badge: '可调度',
    icon: Workflow,
    tone: 'bg-amber-50 text-amber-700',
  },
  {
    id: 'team-data',
    title: '数据分析专家团',
    description: '把自然语言需求拆成指标口径、SQL、图表和经营解释。',
    meta: '数据部 · BI联动',
    badge: '数据',
    icon: Brain,
    tone: 'bg-emerald-50 text-emerald-700',
  },
]

const mcpCards: MarketCard[] = [
  {
    id: 'mcp-erp',
    title: 'ERP商品主数据',
    description: '读取SKU、成本、库存、价格带和上下架状态，可用于补货与定价智能体。',
    meta: '内部MCP · 已授权',
    badge: '企业',
    icon: PlugZap,
    tone: 'bg-sky-50 text-sky-700',
  },
  {
    id: 'mcp-oms',
    title: '订单履约查询',
    description: '查询订单、发货、退换货和异常履约记录，支持客服和门店助手调用。',
    meta: 'OMS · 8个动作',
    badge: '工具',
    icon: Workflow,
    tone: 'bg-violet-50 text-violet-700',
  },
  {
    id: 'mcp-report',
    title: '经营报表中心',
    description: '按权限拉取日报、周报、活动报表和部门指标，支持自动摘要。',
    meta: 'BI平台 · 只读',
    badge: '报表',
    icon: FileText,
    tone: 'bg-orange-50 text-orange-700',
  },
]

const agentCards = computed<MarketCard[]>(() =>
  agents.slice(0, 6).map((agent) => ({
    id: agent.id,
    title: agent.name,
    description: agent.description,
    meta: `${agent.developerDepartment} · ${formatNumber(agent.totalCalls)}次调用`,
    badge: `${agent.toolCount}工具`,
    score: agent.avgRating.toFixed(1),
    icon: Bot,
    tone: 'bg-blue-50 text-blue-700',
  })),
)

const skillCards = computed<MarketCard[]>(() =>
  skills.slice(0, 6).map((skill) => ({
    id: skill.id,
    title: skill.name,
    description: skill.description,
    meta: `${skill.developerName} · ${formatNumber(skill.totalCalls)}次调用`,
    badge: skill.category === 'automation' ? '自动化' : '技能',
    icon: Wrench,
    tone: 'bg-violet-50 text-violet-700',
  })),
)

const marketCards = computed<MarketCard[]>(() => {
  const map: Record<MarketTab, MarketCard[]> = {
    experts: expertCards,
    teams: teamCards,
    agents: agentCards.value,
    mcp: mcpCards,
    skills: skillCards.value,
  }
  const keyword = searchKeyword.value.trim().toLowerCase()
  const list = map[activeMarketTab.value]
  if (!keyword) return list
  return list.filter((item) => `${item.title}${item.description}${item.meta}`.toLowerCase().includes(keyword))
})

const capabilityStats = computed(() => [
  { label: '我的智能体', value: agents.length, icon: Bot, route: 'agent-market' },
  { label: '知识库', value: knowledgeBases.length, icon: Database, route: 'knowledge-base' },
  { label: '已发布技能', value: skills.length, icon: Wrench, route: 'skill-market' },
  { label: '定时任务', value: 12, icon: Clock3, route: 'my-tasks' },
])

const chatMessages = ref([
  {
    role: 'assistant',
    content: '我可以帮你创建智能体、检索知识库、调用技能，或者把任务设置成定时执行。',
  },
])

const suggestedPrompts = [
  '帮我创建一个每日经营早报任务',
  '给新品上市搭一个专家团',
  '把客服质检流程封装成技能',
  '为商品知识库配置检索策略',
]

// Digital human live streaming
const selectedDigitalHuman = ref<string | null>(null)
const liveElapsed = ref(formatDigitalHumanElapsed())

function formatDigitalHumanElapsed() {
  if (!activeLiveSession) return ''
  const started = new Date(activeLiveSession.startTime).getTime()
  const diff = Date.now() - started
  const hours = Math.floor(diff / 3600_000)
  const minutes = Math.floor((diff % 3600_000) / 60_000)
  if (hours > 0) return `${hours}小时${minutes}分`
  return `${minutes}分钟`
}

function updateDigitalHumanElapsed() {
  liveElapsed.value = formatDigitalHumanElapsed()
}

function formatGmv(v: number) {
  if (v >= 10000) return `¥${(v / 10000).toFixed(1)}万`
  return `¥${v.toLocaleString()}`
}

function selectDigitalHuman(id: string) {
  selectedDigitalHuman.value = selectedDigitalHuman.value === id ? null : id
}

function startDigitalHumanLive(humanId: string) {
  const human = digitalHumans.find((h) => h.id === humanId)
  if (!human) return
  chatMessages.value.push({
    role: 'assistant',
    content: `正在为「${human.name}」创建直播间...请选择商品、配置话术模板并设置开播时间。`,
  })
}

let digitalHumanTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  digitalHumanTimer = setInterval(() => {
    updateDigitalHumanElapsed()
  }, 30_000)
})
onUnmounted(() => {
  if (digitalHumanTimer) clearInterval(digitalHumanTimer)
})

function formatNumber(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return `${value}`
}

function openCreate(type: CreateType) {
  createType.value = type
  createForm.value = {
    name: '',
    description: '',
    target: '',
    schedule: type === 'task' ? '每天 09:00' : '',
  }
  showCreateDialog.value = true
}

function submitCreate() {
  showCreateDialog.value = false
  const title = createMeta[createType.value].title
  chatMessages.value.push({
    role: 'assistant',
    content: `${title}已保存为草稿。下一步可以继续补充权限、知识库和发布范围。`,
  })
}

function sendChat() {
  const value = chatInput.value.trim()
  if (!value) return
  router.push({
    name: 'workspace-chat',
    query: {
      q: value,
      agent: selectedAgent.value.name,
      source: 'workspace',
    },
  })
}

function usePrompt(prompt: string) {
  chatInput.value = prompt
}

function goRoute(route: string) {
  router.push({ name: route })
}

function openMarketCard(item: MarketCard) {
  selectedMarketContext.value = activeMarketTab.value
  selectedMarketCard.value = item
}

const selectedMarketAction = computed(() => {
  if (selectedMarketContext.value === 'mcp') return '部署到智能体'
  if (selectedMarketContext.value === 'skills') return '部署Skill'
  if (selectedMarketContext.value === 'teams') return '安装专家团'
  return '安装到工作台'
})

const selectedMarketStatus = computed(() => {
  if (!selectedMarketCard.value) return '未安装'
  return deployedCapabilities.value.includes(selectedMarketCard.value.id) ? '已安装' : '未安装'
})

function submitDeployment() {
  if (!selectedMarketCard.value) return
  if (!deployedCapabilities.value.includes(selectedMarketCard.value.id)) {
    deployedCapabilities.value.push(selectedMarketCard.value.id)
  }
  chatMessages.value.push({
    role: 'assistant',
    content: `「${selectedMarketCard.value.title}」已${selectedMarketContext.value === 'mcp' ? '部署并进入权限校验' : '安装到你的工作台'}。管理员可在后台查看用量、授权范围和审计记录。`,
  })
  selectedMarketCard.value = null
}
</script>

<template>
  <div class="min-h-[calc(100vh-4rem)] bg-zinc-50 pb-20 md:pb-8">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6">
      <section class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div class="flex items-center gap-2 text-sm font-medium text-blue-600">
              <Sparkles class="h-4 w-4" />
              AI 能力编排中心
            </div>
            <h1 class="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">智能工作台</h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              在这里创建智能体、知识库和技能，把常用流程沉淀成专家或专家团，并通过定时任务自动执行。
            </p>
          </div>

          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
            <button
              v-for="action in quickActions"
              :key="action.type"
              type="button"
              class="group rounded-lg border border-zinc-200 bg-gradient-to-br p-3 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              :class="action.tone"
              @click="openCreate(action.type)"
            >
              <component :is="action.icon" class="h-5 w-5" />
              <div class="mt-3 text-sm font-semibold text-zinc-950">{{ action.title }}</div>
              <div class="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600">{{ action.desc }}</div>
            </button>
          </div>
        </div>
      </section>

      <section class="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div class="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div class="flex flex-col gap-3 border-b border-zinc-100 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-base font-semibold text-zinc-950">对话式工作台</h2>
              <p class="mt-1 text-xs text-zinc-500">先对话确认目标，再绑定专家、知识库、技能和定时规则。</p>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                class="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-700"
                @click="router.push({ name: 'workspace-chat', query: { agent: selectedAgent.name, source: 'workspace' } })"
              >
                <MessageCircle class="h-4 w-4" />
                全屏对话
              </button>
              <select
                v-model="selectedAgent"
                class="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option v-for="agent in agents.slice(0, 6)" :key="agent.id" :value="agent">
                  {{ agent.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="grid gap-4 p-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside class="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div class="flex items-center gap-3">
                <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Bot class="h-5 w-5" />
                </div>
                <div class="min-w-0">
                  <div class="truncate text-sm font-semibold text-zinc-950">{{ selectedAgent.name }}</div>
                  <div class="mt-1 text-xs text-zinc-500">{{ selectedAgent.developerDepartment }}</div>
                </div>
              </div>
              <p class="mt-3 line-clamp-4 text-xs leading-5 text-zinc-600">{{ selectedAgent.description }}</p>
              <div class="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div class="rounded-md bg-white p-2">
                  <div class="font-semibold text-zinc-950">{{ selectedAgent.toolCount }}</div>
                  <div class="mt-0.5 text-zinc-500">工具</div>
                </div>
                <div class="rounded-md bg-white p-2">
                  <div class="font-semibold text-zinc-950">{{ selectedAgent.skillCount }}</div>
                  <div class="mt-0.5 text-zinc-500">技能</div>
                </div>
                <div class="rounded-md bg-white p-2">
                  <div class="font-semibold text-zinc-950">{{ selectedAgent.avgRating.toFixed(1) }}</div>
                  <div class="mt-0.5 text-zinc-500">评分</div>
                </div>
              </div>
            </aside>

            <div class="flex min-h-[310px] flex-col rounded-lg border border-zinc-200 bg-white">
              <div class="flex-1 space-y-3 overflow-y-auto p-4">
                <div
                  v-for="(message, index) in chatMessages"
                  :key="index"
                  class="flex"
                  :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
                >
                  <div
                    class="max-w-[82%] rounded-lg px-3 py-2 text-sm leading-6"
                    :class="message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-700'"
                  >
                    {{ message.content }}
                  </div>
                </div>
              </div>

              <div class="border-t border-zinc-100 p-3">
                <div class="mb-2 flex flex-wrap gap-2">
                  <button
                    v-for="prompt in suggestedPrompts"
                    :key="prompt"
                    type="button"
                    class="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    @click="usePrompt(prompt)"
                  >
                    {{ prompt }}
                  </button>
                </div>
                <div class="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                  <button type="button" class="rounded-md p-2 text-zinc-500 transition hover:bg-white hover:text-zinc-900" aria-label="添加附件">
                    <Paperclip class="h-4 w-4" />
                  </button>
                  <input
                    v-model="chatInput"
                    class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
                    placeholder="描述你要创建、查询或定时执行的工作..."
                    @keydown.enter.prevent="sendChat"
                  />
                  <button
                    type="button"
                    class="rounded-md bg-blue-600 p-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                    :disabled="!chatInput.trim()"
                    aria-label="发送"
                    @click="sendChat"
                  >
                    <SendHorizontal class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <button
            v-for="stat in capabilityStats"
            :key="stat.label"
            type="button"
            class="group flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            @click="goRoute(stat.route)"
          >
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                <component :is="stat.icon" class="h-5 w-5" />
              </div>
              <div>
                <div class="text-2xl font-semibold text-zinc-950">{{ stat.value }}</div>
                <div class="mt-0.5 text-sm text-zinc-500">{{ stat.label }}</div>
              </div>
            </div>
            <ChevronRight class="h-5 w-5 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" />
          </button>
        </div>
      </section>

      <!-- 数字人直播智能体 -->
      <section v-if="false" class="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <!-- Header bar -->
        <div
          class="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"
          :class="showDigitalHuman ? 'border-b border-zinc-100' : ''"
        >
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm">
              <Radio class="h-5 w-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-semibold text-zinc-950">数字人直播智能体</h2>
                <span class="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                  <Sparkles class="h-3 w-3" />
                  热门
                </span>
              </div>
              <p class="mt-0.5 text-xs text-zinc-500">AI虚拟主播全流程管理：形象定制、智能话术、实时互动、数据复盘</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
              @click="startDigitalHumanLive(selectedDigitalHuman ?? digitalHumans[0].id)"
            >
              <Play class="h-3.5 w-3.5 text-violet-600" />
              创建直播
            </button>
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-medium text-white transition hover:bg-violet-700"
            >
              <Plus class="h-3.5 w-3.5" />
              新建数字人
            </button>
            <button
              type="button"
              class="ml-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:text-zinc-800"
              @click="showDigitalHuman = !showDigitalHuman"
            >
              <ChevronDown v-if="showDigitalHuman" class="h-4 w-4" />
              <ChevronRight v-else class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Collapsible body -->
        <div v-if="showDigitalHuman" class="p-4">
          <!-- Main content grid -->
          <div class="grid gap-4 lg:grid-cols-3">
            <!-- Left: Digital human avatars -->
            <div>
              <h3 class="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                数字人形象
                <span class="ml-1 font-normal text-zinc-400">5位</span>
              </h3>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="human in digitalHumans"
                  :key="human.id"
                  type="button"
                  class="flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition"
                  :class="[
                    selectedDigitalHuman === human.id
                      ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-300'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50',
                  ]"
                  @click="selectDigitalHuman(human.id)"
                >
                  <div class="relative">
                    <div
                      class="flex h-12 w-12 items-center justify-center rounded-full text-lg"
                      :class="human.gender === 'female' ? 'bg-pink-50 text-pink-500' : 'bg-blue-50 text-blue-500'"
                    >
                      <UserCircle class="h-12 w-12" />
                    </div>
                    <span
                      class="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white"
                      :class="human.status === 'streaming' ? 'bg-emerald-500' : human.status === 'idle' ? 'bg-zinc-300' : 'bg-zinc-400'"
                    />
                  </div>
                  <span class="text-xs font-medium text-zinc-800">{{ human.name }}</span>
                  <span class="text-[10px] text-zinc-400 leading-tight">{{ human.style }}</span>
                </button>
                <!-- Add new digital human placeholder -->
                <button
                  type="button"
                  class="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-3 text-center transition hover:border-violet-300 hover:bg-violet-50/30"
                >
                  <div class="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                    <Plus class="h-5 w-5" />
                  </div>
                  <span class="text-[10px] text-zinc-400">新建形象</span>
                </button>
              </div>
            </div>

            <!-- Center: Current live session -->
            <div>
              <h3 class="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">当前直播</h3>
              <div v-if="activeLiveSession" class="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
                <div class="flex items-center gap-2">
                  <span class="relative flex h-2.5 w-2.5">
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  </span>
                  <span class="text-xs font-semibold text-red-600 uppercase tracking-wider">Live</span>
                  <span class="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-600">{{ activeLiveSession.platform }}</span>
                </div>
                <p class="mt-1.5 text-sm font-semibold text-zinc-900">{{ activeLiveSession.title }}</p>
                <p class="mt-0.5 text-xs text-zinc-500">主播：{{ activeLiveSession.digitalHumanName }} · 开播 {{ liveElapsed }}</p>
                <div class="mt-3 grid grid-cols-3 gap-2">
                  <div class="rounded-lg bg-white px-2 py-1.5 text-center shadow-sm">
                    <div class="text-sm font-semibold text-zinc-900">{{ activeLiveSession.viewers.toLocaleString() }}</div>
                    <div class="text-[10px] text-zinc-400">观看</div>
                  </div>
                  <div class="rounded-lg bg-white px-2 py-1.5 text-center shadow-sm">
                    <div class="text-sm font-semibold text-zinc-900">{{ activeLiveSession.orders.toLocaleString() }}</div>
                    <div class="text-[10px] text-zinc-400">成交(件)</div>
                  </div>
                  <div class="rounded-lg bg-white px-2 py-1.5 text-center shadow-sm">
                    <div class="text-sm font-semibold text-zinc-900">{{ activeLiveSession.gmv >= 10000 ? (activeLiveSession.gmv / 10000).toFixed(1) + '万' : activeLiveSession.gmv.toLocaleString() }}</div>
                    <div class="text-[10px] text-zinc-400">GMV</div>
                  </div>
                </div>
                <button
                  type="button"
                  class="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-100"
                >
                  <MonitorPlay class="h-3.5 w-3.5" />
                  进入直播间
                </button>
              </div>
              <div v-else class="flex h-full min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-3 text-center">
                <Radio class="mb-1.5 h-6 w-6 text-zinc-300" />
                <p class="text-xs text-zinc-400">暂无进行中的直播</p>
                <p class="mt-0.5 text-[10px] text-zinc-300">选择一个数字人形象开始直播</p>
              </div>
            </div>

            <!-- Right: Stats + Quick capabilities -->
            <div>
              <h3 class="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">直播数据总览</h3>
              <div class="grid grid-cols-2 gap-2">
                <div class="rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2">
                  <div class="flex items-center gap-1.5">
                    <Radio class="h-3.5 w-3.5 text-violet-500" />
                    <div class="text-lg font-semibold text-zinc-900">{{ liveStats.todaySessions }}</div>
                  </div>
                  <div class="text-[10px] text-zinc-400">今日直播场次</div>
                </div>
                <div class="rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2">
                  <div class="flex items-center gap-1.5">
                    <BarChart3 class="h-3.5 w-3.5 text-emerald-500" />
                    <div class="text-lg font-semibold text-zinc-900">{{ (liveStats.todayGmv / 10000).toFixed(1) }}万</div>
                  </div>
                  <div class="text-[10px] text-zinc-400">今日GMV</div>
                </div>
                <div class="rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2">
                  <div class="flex items-center gap-1.5">
                    <MonitorPlay class="h-3.5 w-3.5 text-blue-500" />
                    <div class="text-lg font-semibold text-zinc-900">{{ liveStats.totalSessions }}</div>
                  </div>
                  <div class="text-[10px] text-zinc-400">累计场次</div>
                </div>
                <div class="rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2">
                  <div class="flex items-center gap-1.5">
                    <Zap class="h-3.5 w-3.5 text-amber-500" />
                    <div class="text-lg font-semibold text-zinc-900">{{ liveStats.avgConversionRate }}%</div>
                  </div>
                  <div class="text-[10px] text-zinc-400">平均转化率</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent sessions + Scheduled -->
          <div class="mt-5 border-t border-zinc-100 pt-4">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                近期直播
                <span class="ml-1 font-normal text-zinc-400">{{ recentSessions.length + scheduledSessions.length }}场</span>
              </h3>
              <button type="button" class="text-xs text-violet-600 hover:text-violet-700">查看全部</button>
            </div>
            <div class="mt-2 space-y-1.5">
              <!-- Active / recent sessions -->
              <div
                v-for="session in recentSessions"
                :key="session.id"
                class="flex items-center justify-between rounded-lg px-3 py-2 transition hover:bg-zinc-50"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    :class="session.status === 'live' ? 'bg-red-50 text-red-500' : 'bg-zinc-100 text-zinc-400'"
                  >
                    <Play v-if="session.status === 'live'" class="h-3.5 w-3.5" />
                    <BarChart3 v-else class="h-3.5 w-3.5" />
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="text-sm font-medium text-zinc-800 truncate">{{ session.title }}</span>
                      <span
                        class="shrink-0 rounded px-1 py-0.5 text-[10px] font-medium"
                        :class="session.status === 'live' ? 'bg-red-50 text-red-600' : 'bg-zinc-100 text-zinc-500'"
                      >
                        {{ session.status === 'live' ? '直播中' : '已结束' }}
                      </span>
                    </div>
                    <div class="text-[10px] text-zinc-400">
                      {{ session.digitalHumanName }} · {{ session.platform }} · {{ session.durationMinutes }}分钟 · {{ session.viewers.toLocaleString() }}观看
                    </div>
                  </div>
                </div>
                <div class="shrink-0 text-right">
                  <div class="text-sm font-semibold text-zinc-800">{{ session.gmv >= 10000 ? (session.gmv / 10000).toFixed(1) + '万' : session.gmv.toLocaleString() }}</div>
                  <div class="text-[10px] text-zinc-400">{{ session.orders.toLocaleString() }}件</div>
                </div>
              </div>
              <!-- Scheduled sessions -->
              <div
                v-for="session in scheduledSessions"
                :key="'sched-' + session.id"
                class="flex items-center justify-between rounded-lg px-3 py-2 transition hover:bg-zinc-50"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                    <CalendarClock class="h-3.5 w-3.5" />
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="text-sm font-medium text-zinc-800 truncate">{{ session.title }}</span>
                      <span class="shrink-0 rounded bg-amber-50 px-1 py-0.5 text-[10px] font-medium text-amber-600">
                        待开播
                      </span>
                    </div>
                    <div class="text-[10px] text-zinc-400">
                      {{ session.digitalHumanName }} · {{ session.platform }} · {{ session.productCount }}件商品
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  class="shrink-0 inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-[10px] font-medium text-zinc-600 transition hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700"
                >
                  <Play class="h-3 w-3" />
                  开播
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div class="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between" :class="showMarket ? 'border-b border-zinc-100' : ''">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base font-semibold text-zinc-950">能力市场</h2>
              <span class="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-500">{{ deployedCapabilities.length }} 个已安装</span>
            </div>
            <p class="mt-1 text-xs text-zinc-500">折叠显示，展开后可发现专家、专家团、智能体、MCP能力和技能。</p>
          </div>
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 lg:order-3"
            @click="showMarket = !showMarket"
          >
            {{ showMarket ? '收起能力市场' : '展开能力市场' }}
            <ChevronDown class="h-4 w-4 transition" :class="showMarket ? 'rotate-180' : ''" />
          </button>
          <div v-if="showMarket" class="relative w-full lg:w-80">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              v-model="searchKeyword"
              class="h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              placeholder="搜索能力、场景、部门"
            />
          </div>
        </div>

        <div v-if="showMarket" class="flex gap-2 overflow-x-auto border-b border-zinc-100 px-4 py-3">
          <button
            v-for="tab in marketTabs"
            :key="tab.id"
            type="button"
            class="flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition"
            :class="activeMarketTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950'"
            @click="activeMarketTab = tab.id"
          >
            <component :is="tab.icon" class="h-4 w-4" />
            {{ tab.label }}
          </button>
        </div>

        <div v-if="showMarket" class="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="item in marketCards"
            :key="item.id"
            class="group flex min-h-[180px] flex-col rounded-lg border border-zinc-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" :class="item.tone">
                  <component :is="item.icon" class="h-5 w-5" />
                </div>
                <div class="min-w-0">
                  <h3 class="truncate text-sm font-semibold text-zinc-950">{{ item.title }}</h3>
                  <p class="mt-1 truncate text-xs text-zinc-500">{{ item.meta }}</p>
                </div>
              </div>
              <span class="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">{{ item.badge }}</span>
            </div>
            <p class="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-zinc-600">{{ item.description }}</p>
            <div class="mt-4 flex items-center justify-between">
              <div class="flex items-center gap-1 text-xs text-zinc-500">
                <Zap class="h-3.5 w-3.5 text-amber-500" />
                <span>{{ deployedCapabilities.includes(item.id) ? '已安装' : item.score ? `${item.score} 评分` : '可部署' }}</span>
              </div>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                @click="openMarketCard(item)"
              >
                查看
                <ChevronRight class="h-3.5 w-3.5" />
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>

    <div v-if="selectedMarketCard" class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 p-4 backdrop-blur-sm" @click.self="selectedMarketCard = null">
      <div class="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-white/40 bg-white shadow-2xl">
        <div class="flex items-start justify-between gap-4 border-b border-zinc-100 p-5">
          <div class="flex gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" :class="selectedMarketCard.tone">
              <component :is="selectedMarketCard.icon" class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-lg font-semibold text-zinc-950">{{ selectedMarketCard.title }}</h2>
              <p class="mt-1 text-sm text-zinc-500">{{ selectedMarketCard.meta }}</p>
            </div>
          </div>
          <button type="button" class="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900" aria-label="关闭" @click="selectedMarketCard = null">
            <X class="h-5 w-5" />
          </button>
        </div>
        <div class="flex-1 space-y-4 overflow-y-auto p-5">
          <p class="text-sm leading-6 text-zinc-700">{{ selectedMarketCard.description }}</p>
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-lg bg-zinc-50 p-3">
              <div class="text-xs text-zinc-500">状态</div>
              <div class="mt-1 text-sm font-semibold text-zinc-950">{{ selectedMarketStatus }}</div>
            </div>
            <div class="rounded-lg bg-zinc-50 p-3">
              <div class="text-xs text-zinc-500">接入方式</div>
              <div class="mt-1 text-sm font-semibold text-zinc-950">{{ selectedMarketContext === 'mcp' ? '后台部署' : '前台安装' }}</div>
            </div>
            <div class="rounded-lg bg-zinc-50 p-3">
              <div class="text-xs text-zinc-500">推荐动作</div>
              <div class="mt-1 text-sm font-semibold text-zinc-950">{{ selectedMarketAction }}</div>
            </div>
          </div>
          <div class="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div class="mb-3 flex items-center justify-between">
              <div>
                <div class="text-sm font-semibold text-zinc-950">部署配置</div>
                <div class="mt-0.5 text-xs text-zinc-500">安装后可在管理后台追踪用量、授权范围和审计日志。</div>
              </div>
              <span class="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{{ selectedMarketCard.badge }}</span>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block">
                <span class="text-xs font-medium text-zinc-500">安装位置</span>
                <select v-model="deployConfig.workspace" class="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                  <option>我的工作台</option>
                  <option>部门工作台</option>
                  <option>专家团模板</option>
                </select>
              </label>
              <label class="block">
                <span class="text-xs font-medium text-zinc-500">绑定智能体</span>
                <select v-model="deployConfig.targetAgent" class="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                  <option v-for="agent in agents.slice(0, 5)" :key="agent.id" :value="agent.id">{{ agent.name }}</option>
                </select>
              </label>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <label
                v-for="dept in ['电商运营部', '市场营销部', '仓储部', '客服部', '财务部']"
                :key="dept"
                class="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600"
              >
                <input v-model="deployConfig.departments" type="checkbox" :value="dept" class="h-3.5 w-3.5 accent-blue-600" />
                {{ dept }}
              </label>
            </div>
          </div>
        </div>
        <div class="flex shrink-0 justify-end gap-2 border-t border-zinc-100 bg-white p-4">
          <button type="button" class="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50" @click="selectedMarketCard = null">
            关闭
          </button>
          <button
            type="button"
            class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            @click="submitDeployment"
          >
            {{ selectedMarketAction }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showCreateDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 p-4 backdrop-blur-sm" @click.self="showCreateDialog = false">
      <div class="w-full max-w-xl rounded-xl border border-white/40 bg-white shadow-2xl">
        <div class="flex items-start justify-between gap-4 border-b border-zinc-100 p-5">
          <div class="flex gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <component :is="createMeta[createType].icon" class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-lg font-semibold text-zinc-950">{{ createMeta[createType].title }}</h2>
              <p class="mt-1 text-sm leading-6 text-zinc-600">{{ createMeta[createType].subtitle }}</p>
            </div>
          </div>
          <button type="button" class="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900" aria-label="关闭" @click="showCreateDialog = false">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="space-y-4 p-5">
          <label class="block">
            <span class="text-sm font-medium text-zinc-700">名称</span>
            <input
              v-model="createForm.name"
              class="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              :placeholder="createType === 'task' ? '例如：每日经营风险巡检' : '给这个能力起一个清晰的名称'"
            />
          </label>
          <label class="block">
            <span class="text-sm font-medium text-zinc-700">目标说明</span>
            <textarea
              v-model="createForm.description"
              rows="4"
              class="mt-2 w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm leading-6 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="描述使用场景、输入输出、权限边界和希望调用的知识或工具"
            />
          </label>
          <div v-if="createType === 'task'" class="grid gap-4 sm:grid-cols-2">
            <label class="block">
              <span class="text-sm font-medium text-zinc-700">执行智能体</span>
              <select
                v-model="createForm.target"
                class="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">选择智能体</option>
                <option v-for="agent in agents.slice(0, 6)" :key="agent.id" :value="agent.id">{{ agent.name }}</option>
              </select>
            </label>
            <label class="block">
              <span class="text-sm font-medium text-zinc-700">执行时间</span>
              <input
                v-model="createForm.schedule"
                class="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="每天 09:00"
              />
            </label>
          </div>
          <div v-else class="grid gap-4 sm:grid-cols-2">
            <label class="block">
              <span class="text-sm font-medium text-zinc-700">关联知识库</span>
              <select class="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                <option>暂不关联</option>
                <option v-for="kb in knowledgeBases.slice(0, 5)" :key="kb.id">{{ kb.name }}</option>
              </select>
            </label>
            <label class="block">
              <span class="text-sm font-medium text-zinc-700">发布范围</span>
              <select class="mt-2 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                <option>仅自己可见</option>
                <option>部门可见</option>
                <option>全员市场</option>
              </select>
            </label>
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t border-zinc-100 p-4">
          <button type="button" class="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50" @click="showCreateDialog = false">
            取消
          </button>
          <button type="button" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700" @click="submitCreate">
            {{ createMeta[createType].primary }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
