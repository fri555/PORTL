<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Bot,
  Check,
  ChevronLeft,
  CircleDollarSign,
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
  Wrench,
  X,
} from 'lucide-vue-next'
import AgentSettingsView from '@/components/settings/AgentSettingsView.vue'

type SettingDomain = 'quota' | 'model' | 'tool' | 'agent'
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
  quota: 'quota',
  models: 'model',
  tools: 'tool',
  agents: 'agent',
}

const domainRouteMap: Record<SettingDomain, string> = {
  quota: '/settings/quota',
  model: '/settings/models',
  tool: '/settings/tools',
  agent: '/settings/agents',
}

function getDomainFromRoute() {
  const segments = route.path.split('/').filter(Boolean)
  const slug = segments[segments.length - 1] ?? ''
  return routeDomainMap[slug] ?? 'quota'
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
  quota: {
    label: '额度管理',
    subtitle: '按部门、角色和场景分配金币与 token 预算',
    icon: CircleDollarSign,
    createLabel: '新建额度策略',
    fields: { primary: '额度对象', secondary: '结算周期', limit: '额度上限' },
  },
  model: {
    label: '模型管理',
    subtitle: '配置模型供应商、默认路由、上下文窗口和降级策略',
    icon: Cpu,
    createLabel: '接入模型',
    fields: { primary: '模型标识', secondary: '供应商', limit: '上下文窗口' },
  },
  tool: {
    label: '工具管理',
    subtitle: '维护 Tool/MCP/Skill 能力，定义权限与人工确认规则',
    icon: Wrench,
    createLabel: '新建工具',
    fields: { primary: '工具类型', secondary: '调用方式', limit: '权限策略' },
  },
  agent: {
    label: '智能体管理',
    subtitle: '管理专家智能体、Prompt、知识库引用与可用工具池',
    icon: Bot,
    createLabel: '新建智能体',
    fields: { primary: '智能体类型', secondary: '默认模型', limit: '可用工具' },
  },
}

const records = reactive<Record<SettingDomain, SettingRecord[]>>({
  quota: [
    { id: 'quota-brand', name: '品牌营销部月度额度', owner: '运营中台', scope: '品牌营销部', status: 'active', primary: '部门', secondary: '自然月', limit: '260万 tokens / 1200 金币', updatedAt: '今天 10:26', tags: ['预警80%', '超额需审批'] },
    { id: 'quota-b2b', name: 'B2B大客户专项额度', owner: '大客户部', scope: 'B2B项目组', status: 'active', primary: '项目', secondary: '季度', limit: '480万 tokens / 2400 金币', updatedAt: '昨天 18:40', tags: ['专项预算', '可转结'] },
    { id: 'quota-personal', name: '普通员工基础额度', owner: 'AI项目小组', scope: '全员', status: 'paused', primary: '角色', secondary: '自然月', limit: '20万 tokens / 80 金币', updatedAt: '07-18 14:21', tags: ['默认策略'] },
  ],
  model: [
    { id: 'model-qwen', name: 'Qwen3 企业主模型', owner: '模型平台', scope: '日常办公', status: 'active', primary: 'qwen3-max', secondary: '阿里云百炼', limit: '128K', updatedAt: '今天 09:12', tags: ['默认路由', 'RAG'] },
    { id: 'model-deepseek', name: 'DeepSeek 推理模型', owner: 'AI项目小组', scope: '专家模式', status: 'active', primary: 'deepseek-r1', secondary: '火山引擎', limit: '64K', updatedAt: '昨天 16:08', tags: ['Plan-Execute', '强推理'] },
    { id: 'model-vision', name: '多模态识别模型', owner: '内容中心', scope: '图片/附件解析', status: 'draft', primary: 'vision-pro', secondary: '内部网关', limit: '32K', updatedAt: '07-17 11:20', tags: ['待压测'] },
  ],
  tool: [
    { id: 'tool-dingtalk', name: '钉钉文档 MCP', owner: 'AI项目小组', scope: '知识中心/对话', status: 'active', primary: 'MCP Server', secondary: 'Streamable HTTP', limit: '写入需确认', updatedAt: '刚刚', tags: ['文档读取', '知识库'] },
    { id: 'tool-rag', name: 'LanceDB 语义检索', owner: '研发中心', scope: '企业知识 RAG', status: 'active', primary: 'Tool', secondary: '本地服务', limit: '只读自动执行', updatedAt: '今天 08:50', tags: ['向量检索', '混合搜索'] },
    { id: 'tool-web', name: 'Web Search 路由', owner: '运营中台', scope: '公开信息检索', status: 'paused', primary: 'Tool', secondary: 'API Key', limit: '外网审批', updatedAt: '07-16 19:30', tags: ['Tavily', 'Firecrawl'] },
  ],
  agent: [
    { id: 'agent-sourcing', name: '选品王', owner: '商品中心', scope: '专家模式', status: 'active', primary: '单专家', secondary: 'DeepSeek 推理模型', limit: '库存/销售/RAG', updatedAt: '今天 12:08', tags: ['P&E', '商品选品'] },
    { id: 'agent-data', name: '大表姐', owner: '经营分析组', scope: '数据分析', status: 'active', primary: '单专家', secondary: 'Qwen3 企业主模型', limit: 'Excel/Pandas/RAG', updatedAt: '昨天 13:44', tags: ['报表', '归因'] },
    { id: 'agent-service', name: '解忧姐', owner: '客服部', scope: '售后服务', status: 'draft', primary: '专家团成员', secondary: 'Qwen3 企业主模型', limit: '售后知识库', updatedAt: '07-15 17:06', tags: ['待审核'] },
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
      <aside class="hidden w-[256px] shrink-0 border-r border-[#e5e5e7] bg-white px-3 py-5 lg:block">
        <div class="px-2">
          <p class="text-[12px] font-medium uppercase tracking-[0.12em] text-zinc-400">Settings</p>
          <h1 class="mt-2 text-xl font-semibold tracking-normal">设置</h1>
        </div>
        <nav class="mt-5 space-y-1">
          <button
            v-for="(meta, key) in domainMeta"
            :key="key"
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition"
            :class="activeDomain === key ? 'bg-[#111] text-white' : 'text-zinc-600 hover:bg-[#f4f4f5] hover:text-zinc-950'"
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
