<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Boxes,
  Check,
  Clock3,
  Coins,
  Database,
  Download,
  Eye,
  FileClock,
  Filter,
  Gauge,
  KeyRound,
  Layers3,
  LockKeyhole,
  PlugZap,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-vue-next'

type AdminTab = 'overview' | 'capabilities' | 'tasks' | 'permissions' | 'audit'

interface DepartmentUsage {
  id: string
  name: string
  owner: string
  tokenUsed: number
  tokenQuota: number
  spend: number
  agents: string[]
  skills: string[]
  mcp: string[]
  runtimeHours: number
  tasks: number
  errorRate: number
}

interface CapabilityRecord {
  id: string
  name: string
  type: '智能体' | 'Skill' | 'MCP'
  owner: string
  scope: string
  calls: number
  tokens: number
  avgLatency: string
  status: '运行中' | '待审核' | '需授权'
}

interface PermissionRow {
  id: string
  department: string
  agentAccess: boolean
  skillDeploy: boolean
  mcpAccess: boolean
  taskSchedule: boolean
  monthlyQuota: number
}

const activeTab = ref<AdminTab>('overview')
const selectedDepartment = ref('all')
const searchKeyword = ref('')
const selectedPermission = ref<PermissionRow | null>(null)
const showAdvancedFilters = ref(false)
const showExportDialog = ref(false)
const showQuotaDialog = ref(false)
const selectedCapability = ref<CapabilityRecord | null>(null)
const quotaTargetDepartment = ref('all')
const quotaDraft = ref(200)

const departments = ref<DepartmentUsage[]>([
  {
    id: 'marketing',
    name: '市场营销部',
    owner: '王五',
    tokenUsed: 152_000_000,
    tokenQuota: 220_000_000,
    spend: 18300,
    agents: ['营销内容创作助手', '品牌内容主理人', '新品上市专家团'],
    skills: ['小红书种草文案', '抖音视频脚本', '营销文案多平台适配'],
    mcp: ['素材库检索', '经营报表中心'],
    runtimeHours: 286,
    tasks: 18,
    errorRate: 1.8,
  },
  {
    id: 'ecommerce',
    name: '电商运营部',
    owner: '张三',
    tokenUsed: 141_000_000,
    tokenQuota: 180_000_000,
    spend: 15680,
    agents: ['鞋类电商运营专家', '商品比价分析师'],
    skills: ['竞品价格比对', '商品描述生成'],
    mcp: ['ERP商品主数据', '订单履约查询'],
    runtimeHours: 224,
    tasks: 15,
    errorRate: 2.1,
  },
  {
    id: 'supply',
    name: '仓储部',
    owner: '赵六',
    tokenUsed: 128_000_000,
    tokenQuota: 160_000_000,
    spend: 13220,
    agents: ['仓储优化顾问', '供应链策略顾问'],
    skills: ['库存预警分析', '销量预测', '供应商评估'],
    mcp: ['WMS库存接口', 'ERP商品主数据'],
    runtimeHours: 198,
    tasks: 12,
    errorRate: 1.2,
  },
  {
    id: 'customer',
    name: '客服部',
    owner: '钱七',
    tokenUsed: 105_000_000,
    tokenQuota: 130_000_000,
    spend: 9240,
    agents: ['智能客服质检员', '经营风险巡检组'],
    skills: ['客户情绪分析', '会议纪要整理'],
    mcp: ['订单履约查询', '客服会话检索'],
    runtimeHours: 172,
    tasks: 9,
    errorRate: 3.4,
  },
  {
    id: 'finance',
    name: '财务部',
    owner: '周八',
    tokenUsed: 68_000_000,
    tokenQuota: 100_000_000,
    spend: 7800,
    agents: ['财务AI分析师'],
    skills: ['财务报表解读', '费用异常检测'],
    mcp: ['经营报表中心', '费用系统只读接口'],
    runtimeHours: 96,
    tasks: 7,
    errorRate: 0.9,
  },
])

const capabilities = ref<CapabilityRecord[]>([
  { id: 'cap-1', name: '鞋类电商运营专家', type: '智能体', owner: '电商运营部', scope: '全员市场', calls: 12500, tokens: 36_400_000, avgLatency: '2.8s', status: '运行中' },
  { id: 'cap-2', name: 'ERP商品主数据', type: 'MCP', owner: '系统集成组', scope: '电商/仓储/财务', calls: 38200, tokens: 8_900_000, avgLatency: '420ms', status: '运行中' },
  { id: 'cap-3', name: '小红书种草文案', type: 'Skill', owner: '市场营销部', scope: '市场营销部', calls: 21000, tokens: 42_600_000, avgLatency: '1.9s', status: '运行中' },
  { id: 'cap-4', name: '费用异常检测', type: 'Skill', owner: '财务部', scope: '财务部', calls: 600, tokens: 3_500_000, avgLatency: '3.4s', status: '需授权' },
  { id: 'cap-5', name: '新品上市专家团', type: '智能体', owner: 'AI项目组', scope: '待发布', calls: 860, tokens: 5_900_000, avgLatency: '5.1s', status: '待审核' },
])

const taskRuns = [
  { id: 'run-1', name: '每日经营风险巡检', department: '客服部', agent: '经营风险巡检组', duration: '03:18', tokens: 6200, status: '成功', nextRun: '明天 08:00' },
  { id: 'run-2', name: '竞品价格监控周报', department: '电商运营部', agent: '商品比价分析师', duration: '02:55', tokens: 3900, status: '成功', nextRun: '周一 09:00' },
  { id: 'run-3', name: '库存预警扫描', department: '仓储部', agent: '仓储优化顾问', duration: '00:45', tokens: 1800, status: '成功', nextRun: '每天 08:00' },
  { id: 'run-4', name: '月度经营分析', department: '财务部', agent: '财务AI分析师', duration: '05:30', tokens: 8500, status: '成功', nextRun: '下月 1日' },
  { id: 'run-5', name: '达人素材批量生成', department: '市场营销部', agent: '营销内容创作助手', duration: '09:42', tokens: 14200, status: '告警', nextRun: '暂停确认' },
]

const permissionRows = ref<PermissionRow[]>([
  { id: 'marketing', department: '市场营销部', agentAccess: true, skillDeploy: true, mcpAccess: false, taskSchedule: true, monthlyQuota: 220 },
  { id: 'ecommerce', department: '电商运营部', agentAccess: true, skillDeploy: true, mcpAccess: true, taskSchedule: true, monthlyQuota: 180 },
  { id: 'supply', department: '仓储部', agentAccess: true, skillDeploy: false, mcpAccess: true, taskSchedule: true, monthlyQuota: 160 },
  { id: 'customer', department: '客服部', agentAccess: true, skillDeploy: false, mcpAccess: true, taskSchedule: true, monthlyQuota: 130 },
  { id: 'finance', department: '财务部', agentAccess: true, skillDeploy: true, mcpAccess: true, taskSchedule: false, monthlyQuota: 100 },
])

const auditLogs = [
  { time: '14:32', actor: '王五', action: '发布Skill', target: '小红书种草文案 v3.0', result: '通过', risk: '低' },
  { time: '13:51', actor: '系统', action: '额度告警', target: '市场营销部 token 使用率 69%', result: '通知AI BP', risk: '中' },
  { time: '11:26', actor: '周八', action: '申请MCP权限', target: '费用系统只读接口', result: '待审批', risk: '高' },
  { time: '10:05', actor: '赵六', action: '启用定时任务', target: '库存预警扫描', result: '成功', risk: '低' },
]

const adminTabs: { id: AdminTab; label: string; icon: unknown }[] = [
  { id: 'overview', label: '运营总览', icon: BarChart3 },
  { id: 'capabilities', label: '能力治理', icon: Layers3 },
  { id: 'tasks', label: '任务运行', icon: FileClock },
  { id: 'permissions', label: '权限分配', icon: KeyRound },
  { id: 'audit', label: '审计日志', icon: ShieldCheck },
]

const filteredDepartments = computed(() => {
  if (selectedDepartment.value === 'all') return departments.value
  return departments.value.filter((dept) => dept.id === selectedDepartment.value)
})

const filteredCapabilities = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return capabilities.value
  return capabilities.value.filter((item) =>
    `${item.name}${item.type}${item.owner}${item.scope}`.toLowerCase().includes(keyword),
  )
})

const totals = computed(() => {
  const tokenUsed = departments.value.reduce((sum, dept) => sum + dept.tokenUsed, 0)
  const tokenQuota = departments.value.reduce((sum, dept) => sum + dept.tokenQuota, 0)
  const spend = departments.value.reduce((sum, dept) => sum + dept.spend, 0)
  const runtimeHours = departments.value.reduce((sum, dept) => sum + dept.runtimeHours, 0)
  return {
    tokenUsed,
    tokenQuota,
    spend,
    runtimeHours,
    tokenRate: Math.round((tokenUsed / tokenQuota) * 100),
  }
})

function formatTokens(value: number) {
  return `${Math.round(value / 1_000_000)}M`
}

function formatCurrency(value: number) {
  return `¥${value.toLocaleString()}`
}

function quotaRate(dept: DepartmentUsage) {
  return Math.round((dept.tokenUsed / dept.tokenQuota) * 100)
}

function togglePermission(row: PermissionRow, key: keyof Pick<PermissionRow, 'agentAccess' | 'skillDeploy' | 'mcpAccess' | 'taskSchedule'>) {
  row[key] = !row[key]
}

function openPermission(row: PermissionRow) {
  selectedPermission.value = { ...row }
}

function savePermission() {
  if (!selectedPermission.value) return
  const index = permissionRows.value.findIndex((row) => row.id === selectedPermission.value?.id)
  if (index >= 0) permissionRows.value[index] = { ...selectedPermission.value }
  selectedPermission.value = null
}

function openCapabilityDetail(item: CapabilityRecord) {
  selectedCapability.value = item
}

function openExportDialog() {
  showExportDialog.value = true
}

function openQuotaDialog() {
  quotaTargetDepartment.value = selectedDepartment.value
  const target = departments.value.find((dept) => dept.id === quotaTargetDepartment.value)
  quotaDraft.value = target ? Math.round(target.tokenQuota / 1_000_000) : 200
  showQuotaDialog.value = true
}

function applyQuotaChange() {
  const target = departments.value.find((dept) => dept.id === quotaTargetDepartment.value)
  if (target) {
    target.tokenQuota = quotaDraft.value * 1_000_000
  }
  showQuotaDialog.value = false
}

function applyAdvancedPreset(preset: 'top_users' | 'pending_capabilities' | 'quota_warning') {
  if (preset === 'top_users') {
    activeTab.value = 'overview'
    selectedDepartment.value = 'all'
    searchKeyword.value = ''
  } else if (preset === 'pending_capabilities') {
    activeTab.value = 'capabilities'
    searchKeyword.value = '待审核'
  } else {
    activeTab.value = 'overview'
    searchKeyword.value = ''
    selectedDepartment.value = departments.value
      .slice()
      .sort((a, b) => b.tokenUsed / b.tokenQuota - a.tokenUsed / a.tokenQuota)[0]?.id ?? 'all'
  }
  showAdvancedFilters.value = false
}
</script>

<template>
  <div class="min-h-[calc(100vh-4rem)] bg-zinc-50 pb-20 md:pb-8">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6">
      <section class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:p-5">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              <ShieldCheck class="h-4 w-4" />
              集团AI治理后台
            </div>
            <h1 class="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">AI 管理控制台</h1>
            <p class="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
              汇总部门用量、能力部署、定时任务、权限分配与审计记录，用于支撑集团级AI运营、成本归集和合规追踪。
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <button class="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50" @click="openExportDialog">
              <Download class="h-4 w-4" />
              导出月报
            </button>
            <button class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700" @click="openQuotaDialog">
              <SlidersHorizontal class="h-4 w-4" />
              配置限额
            </button>
          </div>
        </div>
      </section>

      <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-sm text-zinc-500">本月Token</span>
            <Zap class="h-4 w-4 text-amber-500" />
          </div>
          <div class="mt-3 text-2xl font-semibold text-zinc-950">{{ formatTokens(totals.tokenUsed) }}</div>
          <div class="mt-3 h-2 rounded-full bg-zinc-100">
            <div class="h-full rounded-full bg-blue-600" :style="{ width: `${totals.tokenRate}%` }" />
          </div>
          <p class="mt-2 text-xs text-zinc-500">集团额度使用 {{ totals.tokenRate }}%</p>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-sm text-zinc-500">成本归集</span>
            <Coins class="h-4 w-4 text-emerald-500" />
          </div>
          <div class="mt-3 text-2xl font-semibold text-zinc-950">{{ formatCurrency(totals.spend) }}</div>
          <p class="mt-4 text-xs text-zinc-500">按部门、智能体、Skill 自动拆账</p>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-sm text-zinc-500">累计运行</span>
            <Clock3 class="h-4 w-4 text-blue-500" />
          </div>
          <div class="mt-3 text-2xl font-semibold text-zinc-950">{{ totals.runtimeHours }}h</div>
          <p class="mt-4 text-xs text-zinc-500">定时任务与智能体会话执行时长</p>
        </div>
        <div class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-sm text-zinc-500">活跃能力</span>
            <Server class="h-4 w-4 text-violet-500" />
          </div>
          <div class="mt-3 text-2xl font-semibold text-zinc-950">{{ capabilities.length }}</div>
          <p class="mt-4 text-xs text-zinc-500">智能体、Skill、MCP统一注册</p>
        </div>
      </section>

      <section class="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div class="flex gap-2 overflow-x-auto border-b border-zinc-100 p-3">
          <button
            v-for="tab in adminTabs"
            :key="tab.id"
            class="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition"
            :class="activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'"
            @click="activeTab = tab.id"
          >
            <component :is="tab.icon" class="h-4 w-4" />
            {{ tab.label }}
          </button>
        </div>

        <div class="grid gap-4 border-b border-zinc-100 p-4 lg:grid-cols-[220px_minmax(0,1fr)_220px]">
          <label class="block">
            <span class="text-xs font-medium text-zinc-500">部门</span>
            <select v-model="selectedDepartment" class="mt-1 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
              <option value="all">全部部门</option>
              <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs font-medium text-zinc-500">搜索能力/负责人/范围</span>
            <div class="relative mt-1">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input v-model="searchKeyword" class="h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100" placeholder="例如：ERP、营销、财务AI分析师" />
            </div>
          </label>
          <button class="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50" @click="showAdvancedFilters = !showAdvancedFilters">
            <Filter class="h-4 w-4" />
            高级筛选
          </button>
        </div>

        <div v-if="showAdvancedFilters" class="px-4 pb-4">
          <div class="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-medium text-blue-800">快速筛选：</span>
              <button class="rounded-full bg-white px-3 py-1 text-xs text-blue-700 shadow-sm hover:bg-blue-50" @click="applyAdvancedPreset('top_users')">看全部部门</button>
              <button class="rounded-full bg-white px-3 py-1 text-xs text-blue-700 shadow-sm hover:bg-blue-50" @click="applyAdvancedPreset('pending_capabilities')">仅看待审核能力</button>
              <button class="rounded-full bg-white px-3 py-1 text-xs text-blue-700 shadow-sm hover:bg-blue-50" @click="applyAdvancedPreset('quota_warning')">查看额度预警</button>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'overview'" class="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.85fr)]">
          <div class="overflow-hidden rounded-lg border border-zinc-200">
            <div class="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
              <h2 class="text-sm font-semibold text-zinc-950">部门用量与能力分布</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-[940px] w-full text-left text-sm">
                <thead class="bg-white text-xs text-zinc-500">
                  <tr>
                    <th class="px-4 py-3 font-medium">部门</th>
                    <th class="px-4 py-3 font-medium">Token / 额度</th>
                    <th class="px-4 py-3 font-medium">在用技能</th>
                    <th class="px-4 py-3 font-medium">已设计智能体</th>
                    <th class="px-4 py-3 font-medium">MCP</th>
                    <th class="px-4 py-3 font-medium">运行时长</th>
                    <th class="px-4 py-3 font-medium">异常率</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100">
                  <tr v-for="dept in filteredDepartments" :key="dept.id" class="bg-white align-top hover:bg-zinc-50">
                    <td class="px-4 py-3">
                      <div class="font-medium text-zinc-950">{{ dept.name }}</div>
                      <div class="mt-0.5 text-xs text-zinc-500">AI BP：{{ dept.owner }}</div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="font-medium text-zinc-900">{{ formatTokens(dept.tokenUsed) }} / {{ formatTokens(dept.tokenQuota) }}</div>
                      <div class="mt-2 h-1.5 rounded-full bg-zinc-100">
                        <div class="h-full rounded-full" :class="quotaRate(dept) > 80 ? 'bg-red-500' : 'bg-blue-600'" :style="{ width: `${quotaRate(dept)}%` }" />
                      </div>
                    </td>
                    <td class="px-4 py-3 text-zinc-600">{{ dept.skills.join('、') }}</td>
                    <td class="px-4 py-3 text-zinc-600">{{ dept.agents.join('、') }}</td>
                    <td class="px-4 py-3 text-zinc-600">{{ dept.mcp.join('、') }}</td>
                    <td class="px-4 py-3 text-zinc-700">{{ dept.runtimeHours }}h · {{ dept.tasks }}任务</td>
                    <td class="px-4 py-3">
                      <span class="rounded-full px-2 py-1 text-xs font-medium" :class="dept.errorRate > 3 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'">{{ dept.errorRate }}%</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="space-y-4">
            <div class="rounded-lg border border-zinc-200 bg-white p-4">
              <h2 class="text-sm font-semibold text-zinc-950">治理告警</h2>
              <div class="mt-3 space-y-3">
                <div class="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div class="flex items-center gap-2 text-sm font-medium text-amber-800">
                    <AlertTriangle class="h-4 w-4" />
                    市场营销部素材任务消耗偏高
                  </div>
                  <p class="mt-1 text-xs leading-5 text-amber-700">连续3天超过单任务 token 均值 2.4 倍，建议复核提示词和批量策略。</p>
                </div>
                <div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div class="flex items-center gap-2 text-sm font-medium text-blue-800">
                    <Gauge class="h-4 w-4" />
                    财务部MCP权限待审批
                  </div>
                  <p class="mt-1 text-xs leading-5 text-blue-700">费用系统接口为高敏资源，需要系统集成管理员二次确认。</p>
                </div>
              </div>
            </div>
            <div class="rounded-lg border border-zinc-200 bg-white p-4">
              <h2 class="text-sm font-semibold text-zinc-950">部门Token排行</h2>
              <div class="mt-3 space-y-3">
                <div v-for="dept in departments.slice(0, 5)" :key="dept.id">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-medium text-zinc-700">{{ dept.name }}</span>
                    <span class="text-zinc-500">{{ formatTokens(dept.tokenUsed) }}</span>
                  </div>
                  <div class="mt-1 h-2 rounded-full bg-zinc-100">
                    <div class="h-full rounded-full bg-zinc-800" :style="{ width: `${Math.max(18, quotaRate(dept))}%` }" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'capabilities'" class="p-4">
          <div class="grid gap-3 md:grid-cols-3">
            <article v-for="item in filteredCapabilities" :key="item.id" class="rounded-lg border border-zinc-200 bg-white p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <component :is="item.type === 'MCP' ? PlugZap : item.type === 'Skill' ? Wrench : Bot" class="h-4 w-4 text-blue-600" />
                    <h3 class="font-semibold text-zinc-950">{{ item.name }}</h3>
                  </div>
                  <p class="mt-1 text-xs text-zinc-500">{{ item.owner }} · {{ item.scope }}</p>
                </div>
                <span class="rounded-full px-2 py-1 text-xs font-medium" :class="item.status === '运行中' ? 'bg-emerald-50 text-emerald-700' : item.status === '待审核' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'">{{ item.status }}</span>
              </div>
              <div class="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div class="rounded-md bg-zinc-50 p-2"><div class="font-semibold text-zinc-950">{{ item.calls.toLocaleString() }}</div><div class="mt-1 text-zinc-500">调用</div></div>
                <div class="rounded-md bg-zinc-50 p-2"><div class="font-semibold text-zinc-950">{{ formatTokens(item.tokens) }}</div><div class="mt-1 text-zinc-500">Token</div></div>
                <div class="rounded-md bg-zinc-50 p-2"><div class="font-semibold text-zinc-950">{{ item.avgLatency }}</div><div class="mt-1 text-zinc-500">延迟</div></div>
              </div>
              <div class="mt-4 flex justify-end gap-2">
                <button class="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50" @click="openCapabilityDetail(item)"><Eye class="mr-1 inline h-3.5 w-3.5" />详情</button>
                <button class="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700" @click="openCapabilityDetail(item)"><LockKeyhole class="mr-1 inline h-3.5 w-3.5" />授权</button>
              </div>
            </article>
          </div>
        </div>

        <div v-else-if="activeTab === 'tasks'" class="overflow-x-auto p-4">
          <table class="min-w-[860px] w-full text-left text-sm">
            <thead class="text-xs text-zinc-500">
              <tr>
                <th class="px-3 py-2 font-medium">任务</th>
                <th class="px-3 py-2 font-medium">部门</th>
                <th class="px-3 py-2 font-medium">执行智能体</th>
                <th class="px-3 py-2 font-medium">运行时长</th>
                <th class="px-3 py-2 font-medium">Token</th>
                <th class="px-3 py-2 font-medium">状态</th>
                <th class="px-3 py-2 font-medium">下次运行</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100">
              <tr v-for="run in taskRuns" :key="run.id" class="hover:bg-zinc-50">
                <td class="px-3 py-3 font-medium text-zinc-950">{{ run.name }}</td>
                <td class="px-3 py-3 text-zinc-600">{{ run.department }}</td>
                <td class="px-3 py-3 text-zinc-600">{{ run.agent }}</td>
                <td class="px-3 py-3 text-zinc-700">{{ run.duration }}</td>
                <td class="px-3 py-3 text-zinc-700">{{ run.tokens.toLocaleString() }}</td>
                <td class="px-3 py-3"><span class="rounded-full px-2 py-1 text-xs font-medium" :class="run.status === '成功' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">{{ run.status }}</span></td>
                <td class="px-3 py-3 text-zinc-600">{{ run.nextRun }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="activeTab === 'permissions'" class="overflow-x-auto p-4">
          <table class="min-w-[900px] w-full text-left text-sm">
            <thead class="text-xs text-zinc-500">
              <tr>
                <th class="px-3 py-2 font-medium">部门</th>
                <th class="px-3 py-2 font-medium">智能体使用</th>
                <th class="px-3 py-2 font-medium">Skill部署</th>
                <th class="px-3 py-2 font-medium">MCP接入</th>
                <th class="px-3 py-2 font-medium">定时任务</th>
                <th class="px-3 py-2 font-medium">月额度</th>
                <th class="px-3 py-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100">
              <tr v-for="row in permissionRows" :key="row.id" class="hover:bg-zinc-50">
                <td class="px-3 py-3 font-medium text-zinc-950">{{ row.department }}</td>
                <td class="px-3 py-3"><button class="rounded-full px-2 py-1 text-xs font-medium" :class="row.agentAccess ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'" @click="togglePermission(row, 'agentAccess')">{{ row.agentAccess ? '已开通' : '未开通' }}</button></td>
                <td class="px-3 py-3"><button class="rounded-full px-2 py-1 text-xs font-medium" :class="row.skillDeploy ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'" @click="togglePermission(row, 'skillDeploy')">{{ row.skillDeploy ? '已开通' : '未开通' }}</button></td>
                <td class="px-3 py-3"><button class="rounded-full px-2 py-1 text-xs font-medium" :class="row.mcpAccess ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'" @click="togglePermission(row, 'mcpAccess')">{{ row.mcpAccess ? '已开通' : '未开通' }}</button></td>
                <td class="px-3 py-3"><button class="rounded-full px-2 py-1 text-xs font-medium" :class="row.taskSchedule ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'" @click="togglePermission(row, 'taskSchedule')">{{ row.taskSchedule ? '已开通' : '未开通' }}</button></td>
                <td class="px-3 py-3 text-zinc-700">{{ row.monthlyQuota }}M Token</td>
                <td class="px-3 py-3"><button class="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50" @click="openPermission(row)">分配权限</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="p-4">
          <div class="space-y-3">
            <div v-for="log in auditLogs" :key="`${log.time}-${log.target}`" class="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
              <div class="flex items-start gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                  <Activity class="h-4 w-4" />
                </div>
                <div>
                  <div class="text-sm font-medium text-zinc-950">{{ log.actor }} · {{ log.action }}</div>
                  <div class="mt-1 text-xs text-zinc-500">{{ log.time }} · {{ log.target }}</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600">{{ log.result }}</span>
                <span class="rounded-full px-2 py-1 text-xs font-medium" :class="log.risk === '高' ? 'bg-red-50 text-red-700' : log.risk === '中' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'">{{ log.risk }}风险</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-if="selectedPermission" class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 p-4 backdrop-blur-sm" @click.self="selectedPermission = null">
      <div class="w-full max-w-lg rounded-xl border border-white/40 bg-white shadow-2xl">
        <div class="flex items-start justify-between border-b border-zinc-100 p-5">
          <div>
            <h2 class="text-lg font-semibold text-zinc-950">分配部门权限</h2>
            <p class="mt-1 text-sm text-zinc-500">{{ selectedPermission.department }}</p>
          </div>
          <button class="rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900" @click="selectedPermission = null"><X class="h-5 w-5" /></button>
        </div>
        <div class="space-y-4 p-5">
          <label class="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
            <span class="text-sm font-medium text-zinc-700">允许使用市场智能体</span>
            <input v-model="selectedPermission.agentAccess" type="checkbox" class="h-4 w-4 accent-blue-600" />
          </label>
          <label class="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
            <span class="text-sm font-medium text-zinc-700">允许部署Skill到智能体</span>
            <input v-model="selectedPermission.skillDeploy" type="checkbox" class="h-4 w-4 accent-blue-600" />
          </label>
          <label class="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
            <span class="text-sm font-medium text-zinc-700">允许接入MCP能力</span>
            <input v-model="selectedPermission.mcpAccess" type="checkbox" class="h-4 w-4 accent-blue-600" />
          </label>
          <label class="block">
            <span class="text-sm font-medium text-zinc-700">月度Token额度</span>
            <input v-model.number="selectedPermission.monthlyQuota" type="number" class="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
        </div>
        <div class="flex justify-end gap-2 border-t border-zinc-100 p-4">
          <button class="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50" @click="selectedPermission = null">取消</button>
          <button class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" @click="savePermission">
            <Check class="h-4 w-4" />
            保存权限
          </button>
        </div>
      </div>
    </div>

    <div v-if="selectedCapability" class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 p-4 backdrop-blur-sm" @click.self="selectedCapability = null">
      <div class="w-full max-w-xl rounded-xl border border-white/40 bg-white shadow-2xl">
        <div class="flex items-start justify-between border-b border-zinc-100 p-5">
          <div>
            <h2 class="text-lg font-semibold text-zinc-950">{{ selectedCapability.name }}</h2>
            <p class="mt-1 text-sm text-zinc-500">{{ selectedCapability.type }} · {{ selectedCapability.owner }} · {{ selectedCapability.scope }}</p>
          </div>
          <button class="rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900" @click="selectedCapability = null"><X class="h-5 w-5" /></button>
        </div>
        <div class="grid gap-3 p-5 md:grid-cols-3">
          <div class="rounded-lg bg-zinc-50 p-3">
            <p class="text-xs text-zinc-500">调用次数</p>
            <p class="mt-1 text-lg font-semibold text-zinc-950">{{ selectedCapability.calls.toLocaleString() }}</p>
          </div>
          <div class="rounded-lg bg-zinc-50 p-3">
            <p class="text-xs text-zinc-500">Token消耗</p>
            <p class="mt-1 text-lg font-semibold text-zinc-950">{{ formatTokens(selectedCapability.tokens) }}</p>
          </div>
          <div class="rounded-lg bg-zinc-50 p-3">
            <p class="text-xs text-zinc-500">平均延迟</p>
            <p class="mt-1 text-lg font-semibold text-zinc-950">{{ selectedCapability.avgLatency }}</p>
          </div>
        </div>
        <div class="flex justify-end gap-2 border-t border-zinc-100 p-4">
          <button class="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50" @click="selectedCapability = null">关闭</button>
          <button class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" @click="selectedCapability = null">
            <Check class="h-4 w-4" />
            应用到权限
          </button>
        </div>
      </div>
    </div>

    <Dialog :open="showExportDialog" @update:open="showExportDialog = $event">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2"><Download class="h-5 w-5 text-primary" /> 导出月报</DialogTitle>
        </DialogHeader>
        <div class="mt-4 space-y-3 text-sm text-zinc-600">
          <p>将导出部门 token 使用、能力部署、任务运行与权限变更摘要。</p>
          <div class="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500">
            当前导出范围：全集团 · {{ departments.length }} 个部门 · {{ capabilities.length }} 项能力
          </div>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <Button variant="outline" @click="showExportDialog = false">取消</Button>
          <Button @click="showExportDialog = false">确认导出</Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog :open="showQuotaDialog" @update:open="showQuotaDialog = $event">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2"><SlidersHorizontal class="h-5 w-5 text-primary" /> 配置限额</DialogTitle>
        </DialogHeader>
        <div class="mt-4 space-y-3">
          <label class="block text-sm">
            <span class="mb-1.5 block font-medium text-zinc-700">部门</span>
            <select v-model="quotaTargetDepartment" class="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
              <option value="all">全部部门</option>
              <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
            </select>
          </label>
          <label class="block text-sm">
            <span class="mb-1.5 block font-medium text-zinc-700">月度 Token 额度（M）</span>
            <input v-model.number="quotaDraft" type="number" min="10" step="10" class="h-10 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </label>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <Button variant="outline" @click="showQuotaDialog = false">取消</Button>
          <Button @click="applyQuotaChange">保存限额</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
