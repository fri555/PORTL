<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Bot,
  Check,
  ChevronLeft,
  Copy,
  Cpu,
  Edit3,
  KeyRound,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Cable,
  Wrench,
  X,
} from 'lucide-vue-next'
import AgentSettingsView from '@/components/settings/AgentSettingsView.vue'

type SettingDomain = 'agent' | 'model' | 'skill' | 'connector'
type Status = 'active' | 'paused' | 'draft'

type SettingRecord = {
  id: string
  name: string
  owner: string
  scope: string
  status: Status
  primary: string
  secondary: string
  limit: string
  updatedAt: string
  tags: string[]
}

const route = useRoute()
const router = useRouter()

const routeDomainMap: Record<string, SettingDomain> = {
  models: 'model',
  skills: 'skill',
  agents: 'agent',
  connectors: 'connector',
}

const domainRouteMap: Record<SettingDomain, string> = {
  model: '/settings/models',
  skill: '/settings/skills',
  agent: '/settings/agents',
  connector: '/settings/connectors',
}

function getDomainFromRoute() {
  const segments = route.path.split('/').filter(Boolean)
  const slug = segments[segments.length - 1] ?? ''
  return routeDomainMap[slug] ?? 'agent'
}

const activeDomain = ref<SettingDomain>(getDomainFromRoute())
const query = ref('')
const statusFilter = ref<'all' | Status>('all')
const viewMode = ref<'card' | 'list'>('card')
const formMode = ref<'create' | 'edit' | null>(null)
const editingId = ref('')
const menuId = ref('')
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined

const domainMeta: Record<SettingDomain, {
  label: string
  subtitle: string
  icon: any
  createLabel: string
  fields: {
    primary: string
    secondary: string
    limit: string
  }
}> = {
  agent: {
    label: '智能体管理',
    subtitle: '管理专家智能体、Prompt、知识库引用与可用工具池',
    icon: Bot,
    createLabel: '新建智能体',
    fields: { primary: '智能体类型', secondary: '默认模型', limit: '可用工具' },
  },
  model: {
    label: '模型管理',
    subtitle: '配置模型供应商、默认路由、上下文窗口和降级策略',
    icon: Cpu,
    createLabel: '接入模型',
    fields: { primary: '模型标识', secondary: '供应商', limit: '上下文窗口' },
  },
  skill: {
    label: '技能管理',
    subtitle: '维护 Tool/MCP/Skill 能力，定义权限与人工确认规则',
    icon: Wrench,
    createLabel: '创建工具',
    fields: { primary: '类型', secondary: '描述', limit: '来源' },
  },
  connector: {
    label: '连接器管理',
    subtitle: '管理外部系统连接器、数据源接入与连接状态监控',
    icon: Cable,
    createLabel: '接入连接器',
    fields: { primary: '连接类型', secondary: '状态', limit: '数据源' },
  },
}

const records = reactive<Record<SettingDomain, SettingRecord[]>>({
  agent: [
    { id: 'agent-tianma', name: '天马智擎助手', owner: '朝暮', scope: '日常办公', status: 'active', primary: '通用助手', secondary: 'Qwen3 企业主模型', limit: '钉钉/RAG/搜索', updatedAt: '今天 16:30', tags: ['默认'] },
    { id: 'agent-data', name: '数据分析', owner: '朝暮', scope: '专家模式', status: 'active', primary: '数据专家', secondary: 'DeepSeek 推理模型', limit: 'Excel/Pandas/RAG', updatedAt: '今天 15:00', tags: ['报表', '归因'] },
    { id: 'agent-sourcing', name: '组货专家', owner: '朝暮', scope: '专家模式', status: 'active', primary: '商品专家', secondary: 'DeepSeek 推理模型', limit: '库存/销售/RAG', updatedAt: '今天 14:30', tags: ['P&E', '商品选品'] },
    { id: 'agent-review', name: '评价分析师', owner: '朝暮', scope: '专家模式', status: 'active', primary: '评价专家', secondary: 'Qwen3 企业主模型', limit: '评价数据/RAG', updatedAt: '今天 13:00', tags: ['评价分析'] },
    { id: 'agent-inspire', name: '灵感大王', owner: '朝暮', scope: '专家模式', status: 'active', primary: '创意专家', secondary: 'Qwen3 企业主模型', limit: '图文生成/RAG', updatedAt: '今天 12:00', tags: ['内容创作'] },
    { id: 'agent-b2b', name: 'B2B销售分析师', owner: '朝暮', scope: '专家模式', status: 'active', primary: '销售专家', secondary: 'DeepSeek 推理模型', limit: '销售数据/RAG', updatedAt: '今天 11:00', tags: ['B2B', '销售分析'] },
    { id: 'agent-stock', name: '现货销售分析-商品', owner: '朝暮', scope: '专家模式', status: 'active', primary: '商品专家', secondary: 'Qwen3 企业主模型', limit: '商品数据/RAG', updatedAt: '今天 10:00', tags: ['现货', '商品分析'] },
    { id: 'agent-b2c', name: 'B2C比价助手', owner: '朝暮', scope: '专家模式', status: 'active', primary: '比价专家', secondary: 'Qwen3 企业主模型', limit: '价格数据/搜索', updatedAt: '昨天 18:00', tags: ['B2C', '比价'] },
    { id: 'agent-top', name: 'TOP款经营分析', owner: '朝暮', scope: '专家模式', status: 'active', primary: '经营专家', secondary: 'DeepSeek 推理模型', limit: '经营数据/RAG', updatedAt: '昨天 16:00', tags: ['TOP款', '经营分析'] },
  ],
  model: [
    { id: 'model-ds-flash', name: 'deepseek-v4-flash', owner: '朝暮', scope: '日常办公', status: 'active', primary: 'deepseek-v4-flash', secondary: '深度求索', limit: '128K', updatedAt: '今天 09:00', tags: ['快速响应'] },
    { id: 'model-ds-pro', name: 'deepseek-v4-pro', owner: '朝暮', scope: '专家模式', status: 'active', primary: 'deepseek-v4-pro', secondary: '深度求索', limit: '128K', updatedAt: '今天 09:00', tags: ['强推理'] },
    { id: 'model-qwen', name: 'qwen3.8-max', owner: '朝暮', scope: '通用', status: 'active', primary: 'qwen3.8-max', secondary: '阿里百练', limit: '128K', updatedAt: '今天 09:00', tags: ['默认路由'] },
  ],
  skill: [
    { id: 'skill-iqs-readpage', name: 'iqs-mcp-server-readpage', owner: '平台配置', scope: 'MCP', status: 'active', primary: 'MCP', secondary: '网页解析工具', limit: '自动执行', updatedAt: '今天 09:00', tags: ['网页解析'] },
    { id: 'skill-iqs-search', name: 'iqs-mcp-server-search', owner: '平台配置', scope: 'MCP', status: 'active', primary: 'MCP', secondary: '搜索工具', limit: '自动执行', updatedAt: '今天 09:00', tags: ['搜索'] },
    { id: 'skill-rag', name: '知识库检索', owner: '演示数据', scope: 'Skill', status: 'active', primary: 'Skill', secondary: '按问题召回知识库片段', limit: '自动执行', updatedAt: '今天 08:50', tags: ['RAG', '检索'] },
    { id: 'skill-nl2sql', name: 'NL2SQL查询', owner: '演示数据', scope: 'Skill', status: 'active', primary: 'Skill', secondary: '自然语言转SQL', limit: '自动执行', updatedAt: '今天 08:00', tags: ['SQL', '查询'] },
    { id: 'skill-report', name: '报告大纲生成', owner: '演示数据', scope: 'Skill', status: 'active', primary: 'Skill', secondary: '结构化报告大纲', limit: '自动执行', updatedAt: '昨天 16:00', tags: ['报告', '大纲'] },
    { id: 'skill-complaint', name: '客诉处理流程', owner: '演示数据', scope: 'Skill', status: 'active', primary: 'Skill', secondary: '多步工作流', limit: '需确认', updatedAt: '昨天 14:00', tags: ['工作流', '客诉'] },
  ],
  connector: [
    { id: 'conn-dingtalk', name: '钉钉连接器', owner: '平台配置', scope: 'IM', status: 'active', primary: '钉钉开放平台', secondary: '已连接', limit: '消息/待办/日历', updatedAt: '今天 09:00', tags: ['钉钉', 'IM'] },
    { id: 'conn-yuque', name: '语雀连接器', owner: '平台配置', scope: '知识库', status: 'active', primary: '语雀 API', secondary: '已连接', limit: '文档/知识库', updatedAt: '今天 09:00', tags: ['语雀', '文档'] },
  ],
})

const draft = reactive({
  name: '',
  owner: '',
  scope: '',
  primary: '',
  secondary: '',
  limit: '',
  tags: '',
})

const currentMeta = computed(() => domainMeta[activeDomain.value])
const activeRecords = computed(() => records[activeDomain.value])
const filteredRecords = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return activeRecords.value.filter((item) => {
    const statusMatched = statusFilter.value === 'all' || item.status === statusFilter.value
    const keywordMatched = !keyword || [
      item.name,
      item.owner,
      item.scope,
      item.primary,
      item.secondary,
      item.limit,
      item.tags.join(' '),
    ].join(' ').toLowerCase().includes(keyword)
    return statusMatched && keywordMatched
  })
})
const summary = computed(() => ({
  total: activeRecords.value.length,
  active: activeRecords.value.filter((item) => item.status === 'active').length,
  paused: activeRecords.value.filter((item) => item.status === 'paused').length,
  draft: activeRecords.value.filter((item) => item.status === 'draft').length,
}))
const pageTitle = computed(() => formMode.value ? `${formMode.value === 'create' ? '新建' : '编辑'}${currentMeta.value.label.replace('管理', '')}` : currentMeta.value.label)
const agentPublishSummary = computed(() => {
  const agentRecords = records.agent
  const activeAgents = agentRecords.filter((item) => item.status === 'active')
  return [
    { label: '已发布', value: `${activeAgents.length}/${agentRecords.length}`, detail: '仅启用中的智能体对员工可见' },
    { label: '待审核', value: String(agentRecords.filter((item) => item.status === 'draft').length), detail: '草稿需补齐 Prompt、工具和知识引用' },
    { label: '能力池', value: '6', detail: '工具、知识库和执行器统一授权' },
  ]
})

watch(
  () => route.path,
  () => {
    const nextDomain = getDomainFromRoute()
    if (nextDomain !== activeDomain.value) {
      activeDomain.value = nextDomain
      query.value = ''
      statusFilter.value = 'all'
      menuId.value = ''
      closeForm()
    }
  },
)

function notify(message: string) {
  toast.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2600)
}

function switchDomain(domain: SettingDomain) {
  activeDomain.value = domain
  query.value = ''
  statusFilter.value = 'all'
  menuId.value = ''
  closeForm()
  if (route.path !== domainRouteMap[domain]) {
    router.push(domainRouteMap[domain])
  }
}

function resetDraft() {
  draft.name = ''
  draft.owner = ''
  draft.scope = ''
  draft.primary = ''
  draft.secondary = ''
  draft.limit = ''
  draft.tags = ''
}

function openCreate() {
  resetDraft()
  formMode.value = 'create'
  editingId.value = ''
}

function openEdit(item: SettingRecord) {
  draft.name = item.name
  draft.owner = item.owner
  draft.scope = item.scope
  draft.primary = item.primary
  draft.secondary = item.secondary
  draft.limit = item.limit
  draft.tags = item.tags.join('、')
  formMode.value = 'edit'
  editingId.value = item.id
  menuId.value = ''
}

function closeForm() {
  formMode.value = null
  editingId.value = ''
  resetDraft()
}

function saveRecord() {
  const name = draft.name.trim()
  if (!name) {
    notify('请填写名称')
    return
  }
  const payload = {
    name,
    owner: draft.owner.trim() || 'AI项目小组',
    scope: draft.scope.trim() || '全员',
    primary: draft.primary.trim() || currentMeta.value.fields.primary,
    secondary: draft.secondary.trim() || currentMeta.value.fields.secondary,
    limit: draft.limit.trim() || '按需配置',
    tags: draft.tags.split(/[、,，]/).map((tag) => tag.trim()).filter(Boolean),
    updatedAt: '刚刚',
  }
  if (formMode.value === 'edit') {
    const target = activeRecords.value.find((item) => item.id === editingId.value)
    if (target) Object.assign(target, payload)
    notify('已保存修改')
  } else {
    activeRecords.value.unshift({
      id: `${activeDomain.value}-${Date.now()}`,
      status: 'draft',
      ...payload,
    })
    notify('已创建草稿')
  }
  closeForm()
}

function duplicateRecord(item: SettingRecord) {
  activeRecords.value.unshift({
    ...item,
    id: `${item.id}-copy-${Date.now()}`,
    name: `${item.name} 副本`,
    status: 'draft',
    updatedAt: '刚刚',
  })
  menuId.value = ''
  notify('已复制为草稿')
}

function toggleStatus(item: SettingRecord) {
  item.status = item.status === 'active' ? 'paused' : 'active'
  item.updatedAt = '刚刚'
  notify(item.status === 'active' ? '已启用' : '已暂停')
}

function deleteRecord(item: SettingRecord) {
  const list = activeRecords.value
  const index = list.findIndex((record) => record.id === item.id)
  if (index >= 0) list.splice(index, 1)
  menuId.value = ''
  notify('已删除')
}

function statusText(status: Status) {
  if (status === 'active') return '启用中'
  if (status === 'paused') return '已暂停'
  return '草稿'
}

function statusClass(status: Status) {
  if (status === 'active') return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
  if (status === 'paused') return 'bg-zinc-100 text-zinc-500 ring-zinc-200'
  return 'bg-amber-50 text-amber-700 ring-amber-100'
}
</script>

<template>
  <AgentSettingsView v-if="activeDomain === 'agent'" />
  <div v-else class="min-h-[calc(100vh-3.5rem)] bg-[#f6f6f7] text-[#111]">
    <div class="flex min-h-[calc(100vh-3.5rem)] w-full">
      <aside class="hidden w-[270px] shrink-0 border-r border-[#eaeaea] bg-white px-3 py-4 lg:block">
        <div class="px-2">
          <h1 class="text-base font-semibold">设置</h1>
        </div>
        <nav class="mt-4 space-y-1">
          <button
            v-for="(meta, key) in domainMeta"
            :key="key"
            type="button"
            class="flex h-9 w-full items-center gap-3 rounded-lg px-3 py-[7px] text-left text-[14px] font-normal transition"
            :class="activeDomain === key ? 'bg-[#edeef1] text-[#111] font-medium' : 'text-[#666] font-normal hover:bg-[#f4f4f5]'"
            :aria-current="activeDomain === key ? 'page' : undefined"
            @click="switchDomain(key as SettingDomain)"
          >
            <component :is="meta.icon" class="h-4 w-4" />
            <span>{{ meta.label }}</span>
          </button>
        </nav>
      </aside>

      <main class="min-w-0 flex-1">
        <template v-if="!formMode">
          <section class="w-full border-b border-[#e5e5e7] bg-white px-5 py-5 sm:px-8">
            <div class="flex flex-wrap items-start gap-4">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-3">
                  <div class="grid h-10 w-10 place-items-center rounded-lg bg-[#111] text-white">
                    <component :is="currentMeta.icon" class="h-5 w-5" />
                  </div>
                  <div>
                    <h2 class="text-2xl font-semibold tracking-normal">{{ pageTitle }}</h2>
                    <p class="mt-1 text-sm text-zinc-500">{{ currentMeta.subtitle }}</p>
                  </div>
                </div>
              </div>
              <button type="button" class="inline-flex h-9 items-center gap-2 rounded-lg bg-[#111] px-4 text-sm font-medium text-white hover:bg-[#333]" @click="openCreate">
                <Plus class="h-4 w-4" />
                {{ currentMeta.createLabel }}
              </button>
            </div>
          </section>

          <section class="w-full px-5 py-5 sm:px-8">
            <div class="grid gap-3 sm:grid-cols-4">
              <div class="rounded-lg border border-[#e5e5e7] bg-white px-4 py-3">
                <div class="text-xs text-zinc-400">总数</div>
                <div class="mt-2 text-2xl font-semibold">{{ summary.total }}</div>
              </div>
              <div class="rounded-lg border border-[#e5e5e7] bg-white px-4 py-3">
                <div class="text-xs text-zinc-400">启用中</div>
                <div class="mt-2 text-2xl font-semibold text-emerald-600">{{ summary.active }}</div>
              </div>
              <div class="rounded-lg border border-[#e5e5e7] bg-white px-4 py-3">
                <div class="text-xs text-zinc-400">已暂停</div>
                <div class="mt-2 text-2xl font-semibold text-zinc-500">{{ summary.paused }}</div>
              </div>
              <div class="rounded-lg border border-[#e5e5e7] bg-white px-4 py-3">
                <div class="text-xs text-zinc-400">草稿</div>
                <div class="mt-2 text-2xl font-semibold text-amber-600">{{ summary.draft }}</div>
              </div>
            </div>

            <div class="mt-4 flex flex-col gap-3 rounded-lg border border-[#e5e5e7] bg-white p-3 sm:flex-row sm:items-center">
              <div class="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#e5e5e7] bg-[#f8f8f9] px-3">
                <Search class="h-4 w-4 text-zinc-400" />
                <input v-model="query" class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400" placeholder="搜索名称、负责人、范围或标签" />
              </div>
              <div class="inline-flex h-9 rounded-lg bg-[#f4f4f5] p-1">
                <button
                  v-for="item in [{ key: 'all', label: '全部' }, { key: 'active', label: '启用' }, { key: 'paused', label: '暂停' }, { key: 'draft', label: '草稿' }]"
                  :key="item.key"
                  type="button"
                  class="rounded-md px-3 text-xs font-medium transition"
                  :class="statusFilter === item.key ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'"
                  @click="statusFilter = item.key as any"
                >
                  {{ item.label }}
                </button>
              </div>
              <div class="inline-flex h-9 rounded-lg border border-[#e5e5e7] bg-white p-1" aria-label="展示方式">
                <button
                  type="button"
                  class="grid h-7 w-8 place-items-center rounded-md transition"
                  :class="viewMode === 'card' ? 'bg-[#111] text-white' : 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700'"
                  aria-label="卡片样式"
                  title="卡片样式"
                  @click="viewMode = 'card'"
                >
                  <LayoutGrid class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  class="grid h-7 w-8 place-items-center rounded-md transition"
                  :class="viewMode === 'list' ? 'bg-[#111] text-white' : 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700'"
                  aria-label="列表样式"
                  title="列表样式"
                  @click="viewMode = 'list'"
                >
                  <List class="h-4 w-4" />
                </button>
              </div>
            </div>

            <div v-if="viewMode === 'card'" class="mt-4 grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
              <article
                v-for="item in filteredRecords"
                :key="item.id"
                class="relative min-h-[188px] rounded-lg border border-[#e5e5e7] bg-white p-4 shadow-[0_1px_0_rgba(17,17,17,0.02)] transition hover:border-zinc-300 hover:shadow-[0_12px_30px_rgba(17,17,17,0.06)]"
              >
                <div class="flex items-start gap-3">
                  <div class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#f4f4f5] text-zinc-700">
                    <component :is="currentMeta.icon" class="h-5 w-5" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <h3 class="truncate text-base font-semibold text-zinc-950">{{ item.name }}</h3>
                      <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1" :class="statusClass(item.status)">{{ statusText(item.status) }}</span>
                    </div>
                    <p class="mt-1 truncate text-xs text-zinc-400">{{ item.owner }} · {{ item.scope }} · {{ item.updatedAt }}</p>
                  </div>
                  <div class="relative shrink-0">
                    <button type="button" class="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800" @click="menuId = menuId === item.id ? '' : item.id">
                      <MoreHorizontal class="h-4 w-4" />
                    </button>
                    <div v-if="menuId === item.id" class="fixed inset-0 z-30" @click="menuId = ''" />
                    <div v-if="menuId === item.id" class="absolute right-0 top-9 z-40 w-36 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 shadow-xl">
                      <button type="button" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50" @click="openEdit(item)"><Edit3 class="h-3.5 w-3.5" />编辑</button>
                      <button type="button" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50" @click="duplicateRecord(item)"><Copy class="h-3.5 w-3.5" />复制</button>
                      <button type="button" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50" @click="toggleStatus(item)"><SlidersHorizontal class="h-3.5 w-3.5" />{{ item.status === 'active' ? '暂停' : '启用' }}</button>
                      <button type="button" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50" @click="deleteRecord(item)"><Trash2 class="h-3.5 w-3.5" />删除</button>
                    </div>
                  </div>
                </div>

                <div class="mt-5 grid gap-3 sm:grid-cols-3">
                  <div class="rounded-lg bg-[#f8f8f9] px-3 py-2">
                    <div class="text-[11px] text-zinc-400">{{ currentMeta.fields.primary }}</div>
                    <div class="mt-1 truncate text-sm font-medium text-zinc-800">{{ item.primary }}</div>
                  </div>
                  <div class="rounded-lg bg-[#f8f8f9] px-3 py-2">
                    <div class="text-[11px] text-zinc-400">{{ currentMeta.fields.secondary }}</div>
                    <div class="mt-1 truncate text-sm font-medium text-zinc-800">{{ item.secondary }}</div>
                  </div>
                  <div class="rounded-lg bg-[#f8f8f9] px-3 py-2">
                    <div class="text-[11px] text-zinc-400">{{ currentMeta.fields.limit }}</div>
                    <div class="mt-1 truncate text-sm font-medium text-zinc-800">{{ item.limit }}</div>
                  </div>
                </div>

                <div class="mt-4 flex flex-wrap gap-1.5">
                  <span v-for="tag in item.tags" :key="tag" class="rounded-md bg-zinc-100 px-2 py-1 text-[11px] text-zinc-500">{{ tag }}</span>
                </div>
              </article>
            </div>

            <div v-else class="mt-4 overflow-hidden rounded-lg border border-[#e5e5e7] bg-white">
              <div class="grid min-h-11 grid-cols-[minmax(260px,1.5fr)_120px_minmax(150px,1fr)_minmax(160px,1fr)_120px_72px] items-center border-b border-[#ededee] bg-[#fbfbfc] px-4 text-xs font-medium text-zinc-500">
                <span>名称</span>
                <span>状态</span>
                <span>{{ currentMeta.fields.primary }}</span>
                <span>{{ currentMeta.fields.limit }}</span>
                <span>更新时间</span>
                <span class="text-right">操作</span>
              </div>
              <div
                v-for="item in filteredRecords"
                :key="item.id"
                class="grid min-h-[72px] grid-cols-[minmax(260px,1.5fr)_120px_minmax(150px,1fr)_minmax(160px,1fr)_120px_72px] items-center border-b border-[#f0f0f1] px-4 text-sm last:border-b-0 hover:bg-[#fafafa]"
              >
                <div class="min-w-0">
                  <div class="truncate font-semibold text-zinc-950">{{ item.name }}</div>
                  <div class="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
                    <span>{{ item.owner }}</span>
                    <span>·</span>
                    <span>{{ item.scope }}</span>
                    <span v-for="tag in item.tags" :key="tag" class="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">{{ tag }}</span>
                  </div>
                </div>
                <div>
                  <span class="inline-flex rounded-full px-2 py-1 text-xs font-medium ring-1" :class="statusClass(item.status)">{{ statusText(item.status) }}</span>
                </div>
                <div class="truncate text-zinc-600">
                  <div>{{ item.primary }}</div>
                  <div class="mt-0.5 text-xs text-zinc-400">{{ item.secondary }}</div>
                </div>
                <div class="truncate text-zinc-600">{{ item.limit }}</div>
                <div class="text-xs text-zinc-400">{{ item.updatedAt }}</div>
                <div class="relative flex justify-end">
                  <button type="button" class="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800" @click="menuId = menuId === item.id ? '' : item.id">
                    <MoreHorizontal class="h-4 w-4" />
                  </button>
                  <div v-if="menuId === item.id" class="fixed inset-0 z-30" @click="menuId = ''" />
                  <div v-if="menuId === item.id" class="absolute right-0 top-9 z-40 w-36 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 shadow-xl">
                    <button type="button" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50" @click="openEdit(item)"><Edit3 class="h-3.5 w-3.5" />编辑</button>
                    <button type="button" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50" @click="duplicateRecord(item)"><Copy class="h-3.5 w-3.5" />复制</button>
                    <button type="button" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50" @click="toggleStatus(item)"><SlidersHorizontal class="h-3.5 w-3.5" />{{ item.status === 'active' ? '暂停' : '启用' }}</button>
                    <button type="button" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50" @click="deleteRecord(item)"><Trash2 class="h-3.5 w-3.5" />删除</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </template>

        <template v-else>
          <section class="grid min-h-[calc(100vh-3.5rem)] grid-cols-1 bg-white lg:grid-cols-[240px_minmax(520px,760px)_1fr]">
            <aside class="border-b border-[#e5e5e7] bg-[#fbfbfc] px-5 py-5 lg:border-b-0 lg:border-r">
              <button type="button" class="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm text-zinc-600 hover:bg-zinc-100" @click="closeForm">
                <ChevronLeft class="h-4 w-4" />
                返回列表
              </button>
              <h1 class="mt-5 text-xl font-semibold">{{ pageTitle }}</h1>
              <div class="mt-6 space-y-3">
                <div v-for="(step, index) in ['基础信息', '能力配置', '权限与发布']" :key="step" class="flex gap-3">
                  <div class="grid h-7 w-7 shrink-0 place-items-center rounded-full" :class="index === 0 ? 'bg-[#111] text-white' : 'bg-white text-zinc-400 ring-1 ring-zinc-200'">
                    <Check v-if="index === 0" class="h-3.5 w-3.5" />
                    <span v-else class="text-xs">{{ index + 1 }}</span>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-zinc-900">{{ step }}</div>
                    <div class="mt-0.5 text-xs text-zinc-400">{{ index === 0 ? '当前步骤' : '后续完善' }}</div>
                  </div>
                </div>
              </div>
            </aside>

            <section class="border-r border-[#e5e5e7] px-6 py-6">
              <div class="flex items-center gap-3">
                <div class="grid h-10 w-10 place-items-center rounded-lg bg-[#111] text-white">
                  <component :is="currentMeta.icon" class="h-5 w-5" />
                </div>
                <div>
                  <h2 class="text-lg font-semibold">具体设置</h2>
                  <p class="mt-1 text-sm text-zinc-500">{{ currentMeta.subtitle }}</p>
                </div>
              </div>

              <div class="mt-6 space-y-5">
                <label class="block">
                  <span class="text-xs font-medium text-zinc-500">名称</span>
                  <input v-model="draft.name" class="mt-2 h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400" placeholder="输入名称" />
                </label>
                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="block">
                    <span class="text-xs font-medium text-zinc-500">负责人</span>
                    <input v-model="draft.owner" class="mt-2 h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400" placeholder="例如：AI项目小组" />
                  </label>
                  <label class="block">
                    <span class="text-xs font-medium text-zinc-500">适用范围</span>
                    <input v-model="draft.scope" class="mt-2 h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400" placeholder="部门、角色或项目" />
                  </label>
                </div>
                <label class="block">
                  <span class="text-xs font-medium text-zinc-500">{{ currentMeta.fields.primary }}</span>
                  <input v-model="draft.primary" class="mt-2 h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400" placeholder="填写关键配置" />
                </label>
                <label class="block">
                  <span class="text-xs font-medium text-zinc-500">{{ currentMeta.fields.secondary }}</span>
                  <input v-model="draft.secondary" class="mt-2 h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400" placeholder="填写补充配置" />
                </label>
                <label class="block">
                  <span class="text-xs font-medium text-zinc-500">{{ currentMeta.fields.limit }}</span>
                  <input v-model="draft.limit" class="mt-2 h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400" placeholder="额度、窗口或权限范围" />
                </label>
                <label class="block">
                  <span class="text-xs font-medium text-zinc-500">标签</span>
                  <input v-model="draft.tags" class="mt-2 h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400" placeholder="用顿号或逗号分隔" />
                </label>
              </div>

              <div class="mt-7 flex justify-end gap-3 border-t border-zinc-100 pt-5">
                <button type="button" class="h-9 rounded-lg border border-zinc-200 px-4 text-sm text-zinc-600 hover:bg-zinc-50" @click="closeForm">取消</button>
                <button type="button" class="h-9 rounded-lg bg-[#111] px-4 text-sm font-medium text-white hover:bg-[#333]" @click="saveRecord">保存</button>
              </div>
            </section>

            <aside class="hidden bg-[#fbfbfc] px-6 py-6 lg:block">
              <div class="rounded-lg border border-dashed border-zinc-300 bg-white/60 p-6 text-center">
                <div class="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-zinc-100 text-zinc-400">
                  <ShieldCheck class="h-5 w-5" />
                </div>
                <p class="mt-3 text-sm font-medium text-zinc-700">右侧扩展区</p>
                <p class="mt-1 text-xs leading-5 text-zinc-400">后续可放预览、审批流、调用日志、版本差异或智能评估结果。</p>
              </div>
            </aside>
          </section>
        </template>
      </main>
    </div>

    <Transition enter-active-class="transition duration-200" enter-from-class="-translate-y-2 opacity-0" enter-to-class="translate-y-0 opacity-100" leave-active-class="transition duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="toast" class="fixed left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-800 shadow-xl">
        <KeyRound class="h-4 w-4 text-zinc-400" />
        <span>{{ toast }}</span>
        <button type="button" class="rounded-md p-1 text-zinc-400 hover:bg-zinc-100" @click="toast = ''"><X class="h-3.5 w-3.5" /></button>
      </div>
    </Transition>
  </div>
</template>
