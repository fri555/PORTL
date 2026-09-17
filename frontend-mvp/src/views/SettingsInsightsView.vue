<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Download,
  Gauge,
  MinusSquare,
  PlusSquare,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'

type NodeType = 'department' | 'person' | 'module' | 'feature' | 'session'
type UsageNode = {
  id: string
  type: NodeType
  name: string
  subtitle?: string
  mode?: '日常办公' | '专家模式'
  model?: string
  tokens: number
  calls: number
  coins: number
  amount: number
  quota: number
  quotaRate: number
  quotaSource?: '全局默认' | '个人设置'
  date?: string
  sessionId?: string
  children?: UsageNode[]
}
type VisibleUsageRow = UsageNode & { level: number }
type AuditRecord = {
  id: string
  logType: 'system' | 'user' | 'login'
  time: string
  actor: string
  actorId: string
  module: string
  action: string
  objectType: string
  objectId: string
  objectName: string
  description: string
  source: string
  traceId: string
  before: string
  after: string
}
type PersonalUsageRecord = {
  id: string
  time: string
  request: string
  requestId: string
  tokens: number
  amount: number
  agent: string
  model: string
  client: string
}
type QuotaPolicy = {
  id: string
  month: string
  object: string
  scope: '人员' | '全局'
  quotaType: '默认' | '临时'
  cycle: '当月' | '每日' | '每周' | '总量'
  total: number
  used: number
  defaultQuota: number
  temporaryQuota: number
}

const route = useRoute()
const router = useRouter()
const store = useAppStore()
const isAudit = computed(() => route.path.endsWith('/audit'))
const isAdmin = computed(() => store.user?.role === 'admin' && route.query.scope !== 'personal')
const selectedUsage = ref<UsageNode | null>(null)
const selectedAudit = ref<AuditRecord | null>(null)
const expandedIds = ref(new Set<string>())
const feedback = ref('')
const quotaOpen = ref(false)
const quotaDialogMode = ref<'adjust' | 'create'>('adjust')
const quotaError = ref('')
const quotaAmount = ref('1200000')
const quotaReason = ref('业务增长，调整本月团队额度')
const quotaScope = ref<'人员' | '全局'>('全局')
const quotaObject = ref('天马集团')
const quotaType = ref<'默认' | '临时'>('默认')
const quotaCycle = ref<'每日' | '每周' | '每月'>('每月')
const monthlyQuota = ref(40_000)
const quotaTarget = ref<UsageNode | null>(null)
const globalQuotaDefaults = ref<Record<'每日' | '每周' | '每月', number>>({
  每日: 300,
  每周: 1500,
  每月: 6000,
})
const personalQuotaSource = ref<'全局默认' | '个人设置'>('全局默认')

const startDate = ref('2026-09-01')
const endDate = ref('2026-09-16')
const usagePeriod = ref('本月')
const peopleQuery = ref('')
const usageModule = ref('全部模块')
const usageAgent = ref('全部智能体')
const appliedUsage = ref({ start: startDate.value, end: endDate.value, person: '', module: '全部模块', agent: '全部智能体' })
const personalPeriod = ref<'today' | '7d' | '30d' | 'custom'>('7d')
const quotaWarningOpen = ref(true)

const auditStart = ref('2026-09-01T00:00')
const auditEnd = ref('2026-09-16T23:59')
const actorQuery = ref('')
const auditModule = ref('全部模块')
const auditAction = ref('全部操作')
const appliedAudit = ref({
  start: auditStart.value,
  end: auditEnd.value,
  actor: '',
  actorId: '',
  module: '全部模块',
  action: '全部操作',
})

const personalUsageRecords: PersonalUsageRecord[] = [
  {
    id: 'personal-001',
    time: '2026-09-16 15:06:00',
    request: '请生成本周经营复盘，列出核心指标和行动项',
    requestId: 'conv_review_0916',
    tokens: 82400,
    amount: 5.82,
    agent: '数据分析师',
    model: 'DeepSeek R1',
    client: '天马智擎 Web',
  },
  {
    id: 'personal-002',
    time: '2026-09-16 11:40:00',
    request: '提取今天会议中的待办并同步到钉钉',
    requestId: 'conv_todo_0916',
    tokens: 61800,
    amount: 4.06,
    agent: '待办提取',
    model: 'Qwen3 Max',
    client: '天马智擎 Web',
  },
  {
    id: 'personal-003',
    time: '2026-09-15 09:18:00',
    request: '查询秋冬商品知识库并总结重点',
    requestId: 'conv_kb_0915',
    tokens: 42200,
    amount: 2.8,
    agent: '小智问答',
    model: 'Qwen3 Plus',
    client: '钉钉工作台',
  },
]

const quotaPolicies = ref<QuotaPolicy[]>([
  {
    id: 'quota-global-month',
    month: '2026-09',
    object: '天马集团',
    scope: '全局',
    quotaType: '默认',
    cycle: '当月',
    total: 1200000,
    used: 620680,
    defaultQuota: 1200000,
    temporaryQuota: 0,
  },
  {
    id: 'quota-chaomu-month',
    month: '2026-09',
    object: '朝暮',
    scope: '人员',
    quotaType: '默认',
    cycle: '当月',
    total: 220000,
    used: 186420,
    defaultQuota: 200000,
    temporaryQuota: 20000,
  },
  {
    id: 'quota-qinghui-week',
    month: '2026-09',
    object: '清晖',
    scope: '人员',
    quotaType: '临时',
    cycle: '每周',
    total: 50000,
    used: 47000,
    defaultQuota: 40000,
    temporaryQuota: 10000,
  },
  {
    id: 'quota-bailu-total',
    month: '2026-09',
    object: '白露',
    scope: '人员',
    quotaType: '默认',
    cycle: '总量',
    total: 200000,
    used: 148620,
    defaultQuota: 200000,
    temporaryQuota: 0,
  },
])

function session(
  id: string,
  name: string,
  mode: UsageNode['mode'],
  model: string,
  tokens: number,
  calls: number,
  coins: number,
  amount: number,
  date: string,
): UsageNode {
  return {
    id,
    type: 'session',
    name,
    mode,
    model,
    tokens,
    calls,
    coins,
    amount,
    quota: 0,
    quotaRate: 0,
    date,
    sessionId: `conv_${id.replace('session-', '')}`,
  }
}

const adminTree: UsageNode[] = [
  {
    id: 'dept-product',
    type: 'department',
    name: '商品部',
    subtitle: '2 人',
    tokens: 92_600_000,
    calls: 68_420,
    coins: 186_420,
    amount: 8712.56,
    quota: 260_000,
    quotaRate: 72,
    children: [
      {
        id: 'user-chaomu',
        type: 'person',
        name: '张明（朝暮）',
        subtitle: '商品运营',
        tokens: 92_600_000,
        calls: 68_420,
        coins: 186_420,
        amount: 8712.56,
        quota: 220_000,
        quotaRate: 85,
        quotaSource: '个人设置',
        children: [
          {
            id: 'module-agent',
            type: 'module',
            name: '智能体',
            subtitle: '专家模式',
            tokens: 92_600_000,
            calls: 68_420,
            coins: 186_420,
            amount: 8712.56,
            quota: 220_000,
            quotaRate: 85,
            children: [
              {
                id: 'feature-assortment',
                type: 'feature',
                name: '组货专家',
                subtitle: '模块 / 子功能',
                tokens: 92_600_000,
                calls: 68_420,
                coins: 186_420,
                amount: 8712.56,
                quota: 220_000,
                quotaRate: 85,
                children: [
                  session(
                    'session-assortment-0916',
                    '秋冬团购组货方案',
                    '专家模式',
                    'DeepSeek R1',
                    92_600_000,
                    68_420,
                    186_420,
                    8712.56,
                    '2026-09-16 14:20',
                  ),
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'dept-online',
    type: 'department',
    name: '线上店铺',
    subtitle: '2 人',
    tokens: 81_400_000,
    calls: 76_108,
    coins: 161_280,
    amount: 7906.32,
    quota: 171_574,
    quotaRate: 94,
    children: [
      {
        id: 'user-qinghui',
        type: 'person',
        name: '李清（清晖）',
        subtitle: '平台销售经理',
        tokens: 81_400_000,
        calls: 76_108,
        coins: 161_280,
        amount: 7906.32,
        quota: 171_574,
        quotaRate: 94,
        quotaSource: '全局默认',
        children: [
          {
            id: 'module-xiaozhi',
            type: 'module',
            name: '小智问答',
            subtitle: '日常办公',
            tokens: 81_400_000,
            calls: 76_108,
            coins: 161_280,
            amount: 7906.32,
            quota: 171_574,
            quotaRate: 94,
            children: [
              {
                id: 'feature-knowledge-qa',
                type: 'feature',
                name: '知识库问答',
                tokens: 81_400_000,
                calls: 76_108,
                coins: 161_280,
                amount: 7906.32,
                quota: 171_574,
                quotaRate: 94,
                children: [
                  session(
                    'session-store-0916',
                    '店铺经营问题分析',
                    '日常办公',
                    'Qwen3 Max',
                    81_400_000,
                    76_108,
                    161_280,
                    7906.32,
                    '2026-09-16 10:08',
                  ),
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'dept-marketing',
    type: 'department',
    name: '市场营销部',
    subtitle: '1 人',
    tokens: 74_200_000,
    calls: 55_430,
    coins: 148_620,
    amount: 6863.04,
    quota: 200_000,
    quotaRate: 74,
    children: [
      {
        id: 'user-bailu',
        type: 'person',
        name: '王蕾（白露）',
        subtitle: '营销策划',
        tokens: 74_200_000,
        calls: 55_430,
        coins: 148_620,
        amount: 6863.04,
        quota: 200_000,
        quotaRate: 74,
        quotaSource: '全局默认',
        children: [
          {
            id: 'module-agent-marketing',
            type: 'module',
            name: '智能体',
            tokens: 74_200_000,
            calls: 55_430,
            coins: 148_620,
            amount: 6863.04,
            quota: 200_000,
            quotaRate: 74,
            children: [
              {
                id: 'feature-marketing',
                type: 'feature',
                name: '营销图文设计师',
                tokens: 74_200_000,
                calls: 55_430,
                coins: 148_620,
                amount: 6863.04,
                quota: 200_000,
                quotaRate: 74,
                children: [
                  session(
                    'session-marketing-0915',
                    '秋季新品营销图文',
                    '专家模式',
                    'Qwen3 Max',
                    74_200_000,
                    55_430,
                    148_620,
                    6863.04,
                    '2026-09-15 18:26',
                  ),
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'dept-supply',
    type: 'department',
    name: '供应链中心',
    subtitle: '1 人',
    tokens: 62_800_000,
    calls: 49_026,
    coins: 124_360,
    amount: 5625.18,
    quota: 180_000,
    quotaRate: 69,
    children: [
      {
        id: 'user-ziyun',
        type: 'person',
        name: '子云',
        subtitle: '供应链主管',
        tokens: 62_800_000,
        calls: 49_026,
        coins: 124_360,
        amount: 5625.18,
        quota: 180_000,
        quotaRate: 69,
        quotaSource: '全局默认',
        children: [
          {
            id: 'module-todo',
            type: 'module',
            name: '办公助手',
            tokens: 62_800_000,
            calls: 49_026,
            coins: 124_360,
            amount: 5625.18,
            quota: 180_000,
            quotaRate: 69,
            children: [
              {
                id: 'feature-todo-extract',
                type: 'feature',
                name: '待办提取',
                tokens: 62_800_000,
                calls: 49_026,
                coins: 124_360,
                amount: 5625.18,
                quota: 180_000,
                quotaRate: 69,
                children: [
                  session(
                    'session-todo-0915',
                    '周会行动项提取',
                    '日常办公',
                    'Qwen3 Plus',
                    62_800_000,
                    49_026,
                    124_360,
                    5625.18,
                    '2026-09-15 16:41',
                  ),
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]

const personalTree: UsageNode[] = [
  {
    id: 'personal-agent',
    type: 'module',
    name: '智能体',
    subtitle: '专家模式',
    tokens: 82_400,
    calls: 42,
    coins: 126,
    amount: 5.82,
    quota: 500,
    quotaRate: 25.2,
    children: [
      {
        id: 'personal-data',
        type: 'feature',
        name: '数据分析师',
        tokens: 82_400,
        calls: 42,
        coins: 126,
        amount: 5.82,
        quota: 500,
        quotaRate: 25.2,
        children: [
          session(
            'personal-session-review',
            '经营数据复盘',
            '专家模式',
            'DeepSeek R1',
            82_400,
            42,
            126,
            5.82,
            '2026-09-16 15:06',
          ),
        ],
      },
    ],
  },
  {
    id: 'personal-office',
    type: 'module',
    name: '办公助手',
    subtitle: '日常办公',
    tokens: 61_800,
    calls: 38,
    coins: 84,
    amount: 4.06,
    quota: 300,
    quotaRate: 28,
    children: [
      {
        id: 'personal-todo',
        type: 'feature',
        name: '待办提取',
        tokens: 61_800,
        calls: 38,
        coins: 84,
        amount: 4.06,
        quota: 300,
        quotaRate: 28,
        children: [
          session(
            'personal-session-todo',
            '钉钉日程与待办',
            '日常办公',
            'Qwen3 Max',
            61_800,
            38,
            84,
            4.06,
            '2026-09-15 11:40',
          ),
        ],
      },
    ],
  },
  {
    id: 'personal-xiaozhi',
    type: 'module',
    name: '小智问答',
    subtitle: '日常办公',
    tokens: 42_200,
    calls: 23,
    coins: 58,
    amount: 2.8,
    quota: 200,
    quotaRate: 29,
    children: [
      {
        id: 'personal-knowledge',
        type: 'feature',
        name: '知识库问答',
        tokens: 42_200,
        calls: 23,
        coins: 58,
        amount: 2.8,
        quota: 200,
        quotaRate: 29,
        children: [
          session(
            'personal-session-knowledge',
            '知识库问答',
            '日常办公',
            'Qwen3 Plus',
            42_200,
            23,
            58,
            2.8,
            '2026-09-12 09:18',
          ),
        ],
      },
    ],
  },
]

function quotaBand(rate: number) {
  return rate >= 90 ? '高风险' : rate >= 80 ? '预警' : '正常'
}
function containsModule(node: UsageNode, module: string): boolean {
  return (
    module === '全部模块' ||
    node.name === module ||
    Boolean(node.children?.some((child) => containsModule(child, module)))
  )
}
function matchesFilters(node: UsageNode) {
  const filters = appliedUsage.value
  const dateMatched =
    node.type !== 'session' ||
    ((!filters.start || (node.date ?? '') >= `${filters.start} 00:00`) &&
      (!filters.end || (node.date ?? '') <= `${filters.end} 23:59`))
  return (
    dateMatched &&
    containsModule(node, filters.module) &&
    (filters.agent === '全部智能体' || containsModule(node, filters.agent))
  )
}

const filteredRoots = computed(() => {
  const roots = isAdmin.value ? adminTree : personalTree
  const query = appliedUsage.value.person.trim().toLowerCase()
  return roots.filter((root) => {
    if (!matchesFilters(root)) return false
    if (!query || !isAdmin.value) return true
    return (
      root.name.toLowerCase().includes(query) ||
      Boolean(root.children?.some((person) => person.name.toLowerCase().includes(query)))
    )
  })
})

const visibleRows = computed<VisibleUsageRow[]>(() => {
  const rows: VisibleUsageRow[] = []
  const query = appliedUsage.value.person.trim().toLowerCase()
  const walk = (nodes: UsageNode[], level: number) => {
    nodes.forEach((node) => {
      rows.push({ ...node, level })
      if (!node.children?.length) return
      if (node.type === 'person' && expandedIds.value.has(node.id)) {
        sessionsWithPath(node.children)
          .filter(({ row, path }) => matchesFilters(row) && (appliedUsage.value.module === '全部模块' || path.includes(appliedUsage.value.module)) && (appliedUsage.value.agent === '全部智能体' || path.includes(appliedUsage.value.agent)))
          .forEach(({ row: request }) => rows.push({ ...request, name: `${request.name} · ${request.date ?? ''}`, subtitle: request.model, level: level + 1 }))
        return
      }
      if (query && isAdmin.value) {
        if (node.type === 'department') {
          const matchedPeople = node.children.filter((person) =>
            person.name.toLowerCase().includes(query),
          )
          if (node.name.toLowerCase().includes(query)) walk(node.children, level + 1)
          else matchedPeople.forEach((person) => rows.push({ ...person, level: level + 1 }))
        }
        return
      }
      if (expandedIds.value.has(node.id)) walk(node.children, level + 1)
    })
  }
  walk(filteredRoots.value, 0)
  return rows
})

function sessionsWithPath(nodes: UsageNode[], path: string[] = []): Array<{ row: UsageNode; path: string[] }> {
  return nodes.flatMap((node) => node.type === 'session'
    ? [{ row: node, path }]
    : sessionsWithPath(node.children ?? [], [...path, node.name]))
}
const totals = computed(() => {
  if (isAdmin.value) {
    const filters = appliedUsage.value
    const rows = sessionsWithPath(filteredRoots.value).filter(({ row, path }) =>
      matchesFilters(row) &&
      (filters.module === '全部模块' || path.includes(filters.module)) &&
      (filters.agent === '全部智能体' || path.includes(filters.agent)))
    return rows.reduce((sum, { row }) => ({ amount: sum.amount + row.amount, coins: 0, tokens: sum.tokens + row.tokens, calls: 0, quota: sum.quota }), {
      amount: 0, coins: 0, tokens: 0, calls: 0, quota: filteredRoots.value.reduce((sum, row) => sum + row.quota, 0),
    })
  }
  return filteredRoots.value.reduce(
    (sum, row) => ({
      amount: sum.amount + row.amount,
      coins: sum.coins + row.coins,
      tokens: sum.tokens + row.tokens,
      calls: sum.calls + row.calls,
      quota: sum.quota + row.quota,
    }),
    { amount: 0, coins: 0, tokens: 0, calls: 0, quota: 0 },
  )
})
const personalRate = computed(() =>
  totals.value.quota ? (totals.value.amount / totals.value.quota) * 100 : 0,
)
const displayQuota = computed(() => (isAdmin.value ? monthlyQuota.value : totals.value.quota))
const displayRate = computed(() =>
  isAdmin.value
    ? (totals.value.amount / Math.max(1, monthlyQuota.value)) * 100
    : personalRate.value,
)
const remainingQuota = computed(() => Math.max(0, displayQuota.value - totals.value.amount))
const metrics = computed(() => [
  {
    label: '人民币消耗',
    value: money(totals.value.amount),
    note: `${startDate.value} 至 ${endDate.value}`,
    icon: CircleDollarSign,
  },
  {
    label: '系统额度',
    value: money(displayQuota.value),
    note: `${isAdmin.value ? '' : `来源：${personalQuotaSource.value} · `}使用率 ${displayRate.value.toFixed(1)}%`,
    icon: Gauge,
  },
  {
    label: '剩余额度',
    value: money(remainingQuota.value),
    note: quotaBand(displayRate.value),
    icon: ShieldCheck,
  },
  {
    label: '总 Token',
    value: compact(totals.value.tokens),
    note: '输入与输出合计',
    icon: Sparkles,
  },
])

const navItems = computed(() => [
  { label: '用量管理', path: '/settings/usage', icon: CircleDollarSign },
  { label: '日志管理', path: '/settings/audit', icon: ShieldCheck },
  { label: '智能体管理', path: '/settings/agents', icon: Bot },
])
const typeLabels: Record<NodeType, string> = {
  department: '部门',
  person: '人员',
  module: '模块',
  feature: '子功能',
  session: '会话',
}
function number(value: number) {
  return Math.round(value).toLocaleString('zh-CN')
}
function money(value: number) {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function compact(value: number) {
  return value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
      ? `${(value / 1_000).toFixed(1)}K`
      : number(value)
}
function toggleNode(id: string) {
  const next = new Set(expandedIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expandedIds.value = next
}
function expandAll() {
  const next = new Set<string>()
  const walk = (nodes: UsageNode[]) =>
    nodes.forEach((node) => {
      if (node.children?.length) {
        next.add(node.id)
        walk(node.children)
      }
    })
  walk(filteredRoots.value)
  expandedIds.value = next
}
function collapseAll() {
  expandedIds.value = new Set()
}
function applyUsageFilters() {
  if (usagePeriod.value === '今日') startDate.value = endDate.value = '2026-09-17'
  else if (usagePeriod.value === '本周') { startDate.value = '2026-09-14'; endDate.value = '2026-09-20' }
  else if (usagePeriod.value === '本月') { startDate.value = '2026-09-01'; endDate.value = '2026-09-30' }
  appliedUsage.value = { start: startDate.value, end: endDate.value, person: peopleQuery.value, module: usageModule.value, agent: usageAgent.value }
  collapseAll()
  showFeedback(`查询已生效，当前展示 ${visibleRows.value.length} 条`)
}
function resetUsageFilters() {
  startDate.value = '2026-09-01'
  endDate.value = '2026-09-30'
  usagePeriod.value = '本月'
  peopleQuery.value = ''
  usageModule.value = '全部模块'
  usageAgent.value = '全部智能体'
  appliedUsage.value = { start: startDate.value, end: endDate.value, person: '', module: '全部模块', agent: '全部智能体' }
  collapseAll()
}
function showFeedback(message: string) {
  feedback.value = message
}
function downloadCsv(filename: string, rows: string[]) {
  if (typeof URL.createObjectURL !== 'function') return
  const href = URL.createObjectURL(
    new Blob([`\uFEFF${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' }),
  )
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(href)
}
function leafSessions(nodes: UsageNode[]): UsageNode[] {
  return nodes.flatMap((node) =>
    node.type === 'session' ? [node] : leafSessions(node.children ?? []),
  )
}
function exportUsage() {
  const rows = leafSessions(filteredRoots.value)
  downloadCsv('用量管理-会话明细.csv', [
    '部门/人员/模块/子功能/会话,模式,模型,Token,人民币,时间',
    ...rows.map((row) =>
      [row.name, row.mode, row.model, row.tokens, row.amount, row.date].join(','),
    ),
  ])
  showFeedback('已导出当前筛选范围的会话明细')
}
function exportPersonalUsage() {
  downloadCsv('个人消耗明细.csv', [
    '时间,请求,请求ID,Token消耗,金额消耗,智能体,模型,使用端',
    ...personalUsageRecords.map((row) =>
      [
        row.time,
        row.request,
        row.requestId,
        row.tokens,
        row.amount,
        row.agent,
        row.model,
        row.client,
      ].join(','),
    ),
  ])
  showFeedback('已导出个人消耗明细')
}
function choosePersonalPeriod(period: 'today' | '7d' | '30d') {
  personalPeriod.value = period
  const dates = { today: '2026-09-16', '7d': '2026-09-10', '30d': '2026-08-18' }
  startDate.value = dates[period]
  endDate.value = '2026-09-16'
}
function openQuotaDialog(mode: 'adjust' | 'create') {
  quotaDialogMode.value = mode
  quotaAmount.value = mode === 'adjust' ? monthlyQuota.value.toString() : '100000'
  quotaScope.value = mode === 'adjust' ? '全局' : '人员'
  quotaObject.value = mode === 'adjust' ? '天马集团' : ''
  quotaType.value = '默认'
  quotaCycle.value = '每月'
  quotaTarget.value = null
  quotaError.value = ''
  quotaOpen.value = true
}
function openPersonQuota(row: UsageNode) {
  quotaDialogMode.value = 'create'
  quotaScope.value = '人员'
  quotaObject.value = row.name
  quotaAmount.value = row.quota ? row.quota.toString() : '1000'
  quotaType.value = '默认'
  quotaCycle.value = '每月'
  quotaTarget.value = row
  quotaReason.value = '业务使用需要'
  quotaError.value = ''
  quotaOpen.value = true
}
function openGlobalQuota() {
  quotaDialogMode.value = 'adjust'
  quotaScope.value = '全局'
  quotaObject.value = '全局默认额度'
  quotaType.value = '默认'
  quotaCycle.value = '每月'
  quotaAmount.value = globalQuotaDefaults.value['每月'].toString()
  quotaReason.value = '调整全局默认额度'
  quotaTarget.value = null
  quotaError.value = ''
  quotaOpen.value = true
}
function confirmQuota() {
  const next = Number(quotaAmount.value)
  if (!Number.isFinite(next) || next <= 0) {
    quotaError.value = '请输入大于 0 的额度'
    return
  }
  if (!quotaObject.value.trim()) {
    quotaError.value = '请填写额度对象'
    return
  }
  if (!quotaReason.value.trim()) {
    quotaError.value = '请填写调整原因'
    return
  }
  if (quotaScope.value === '全局') {
    globalQuotaDefaults.value[quotaCycle.value] = next
    monthlyQuota.value = quotaCycle.value === '每月' ? next : monthlyQuota.value
    const applyInheritedQuota = (nodes: UsageNode[]) => nodes.forEach((node) => {
      if (node.type === 'person' && node.quotaSource === '全局默认') {
        node.quota = next
        node.quotaRate = (node.amount / next) * 100
      }
      if (node.children) applyInheritedQuota(node.children)
    })
    applyInheritedQuota(adminTree)
    showFeedback(`已更新${quotaCycle.value}全局默认额度，仅影响未设置个人额度的用户`)
  } else if (quotaDialogMode.value === 'create') {
    quotaPolicies.value.unshift({
      id: `quota-${Date.now()}`,
      month: '2026-09',
      object: quotaObject.value.trim(),
      scope: quotaScope.value,
      quotaType: quotaType.value,
      cycle: quotaCycle.value === '每月' ? '当月' : quotaCycle.value,
      total: next,
      used: 0,
      defaultQuota: quotaType.value === '默认' ? next : 0,
      temporaryQuota: quotaType.value === '临时' ? next : 0,
    })
    if (quotaTarget.value) {
      quotaTarget.value.quota = next
      quotaTarget.value.quotaSource = '个人设置'
      quotaTarget.value.quotaRate = (quotaTarget.value.amount / next) * 100
    }
    showFeedback('个人额度已保存，并覆盖同周期全局默认额度')
  } else {
    monthlyQuota.value = next
    showFeedback('额度已调整，新的月度额度已生效')
  }
  quotaOpen.value = false
  quotaError.value = ''
}
function deletePersonalQuota() {
  if (!quotaTarget.value) return
  const inherited = globalQuotaDefaults.value[quotaCycle.value]
  quotaTarget.value.quota = inherited
  quotaTarget.value.quotaSource = '全局默认'
  quotaTarget.value.quotaRate = (quotaTarget.value.amount / inherited) * 100
  quotaOpen.value = false
  showFeedback(`已删除个人额度，恢复使用${quotaCycle.value}全局默认额度`)
}
function openRow(row: UsageNode) {
  if (row.type !== 'department' && row.type !== 'person' && !row.children?.length) selectedUsage.value = row
  else if (row.children?.length) toggleNode(row.id)
}

const auditRecords: AuditRecord[] = [
  {
    id: 'audit-001',
    logType: 'system',
    time: '2026-09-16 14:32:18',
    actor: '张明（朝暮）',
    actorId: 'user-chaomu',
    module: '智能体管理',
    action: '修改',
    objectType: '智能体',
    objectId: 'agent_top_001',
    objectName: 'TOP款分析师',
    description: '调整默认模型与可见范围',
    source: '管理端',
    traceId: 'tr_9d21f8c2',
    before: '默认模型：Qwen3 Max\n可见范围：商品部',
    after: '默认模型：DeepSeek R1\n可见范围：商品部、线上店铺',
  },
  {
    id: 'audit-002',
    logType: 'system',
    time: '2026-09-16 11:08:44',
    actor: '李清（清晖）',
    actorId: 'user-qinghui',
    module: '知识中心',
    action: '新增',
    objectType: '知识库',
    objectId: 'kb_aw_2026',
    objectName: '秋冬商品知识库',
    description: '创建部门共享知识库',
    source: '用户端',
    traceId: 'tr_46a0c19e',
    before: '—',
    after: '名称：秋冬商品知识库\n权限：部门可见',
  },
  {
    id: 'audit-003',
    logType: 'system',
    time: '2026-09-15 18:26:09',
    actor: '系统任务',
    actorId: 'system-task',
    module: '模型管理',
    action: '修改',
    objectType: '模型',
    objectId: 'model_qwen3',
    objectName: 'Qwen3 企业主模型',
    description: '恢复模型服务状态',
    source: '系统任务',
    traceId: 'tr_7bc8e410',
    before: '状态：降级',
    after: '状态：运行中',
  },
  {
    id: 'audit-004',
    logType: 'system',
    time: '2026-09-15 16:41:27',
    actor: '王蕾（白露）',
    actorId: 'user-bailu',
    module: '工具管理',
    action: '删除',
    objectType: '工具',
    objectId: 'tool_report_old',
    objectName: '旧版报表导出工具',
    description: '清理停用工具',
    source: '管理端',
    traceId: 'tr_1fb602a8',
    before: '状态：已暂停',
    after: '对象已删除',
  },
  {
    id: 'audit-user-001',
    logType: 'user',
    time: '2026-09-16 09:12:00',
    actor: '李清（清晖）',
    actorId: 'user-qinghui',
    module: '会话',
    action: '授权',
    objectType: '会话',
    objectId: 'conv_review_0916',
    objectName: '经营复盘会话',
    description: '授权商品部成员查看',
    source: '用户端',
    traceId: 'tr_user_001',
    before: '仅本人',
    after: '商品部可见',
  },
  {
    id: 'audit-login-001',
    logType: 'login',
    time: '2026-09-16 08:42:10',
    actor: '张明（朝暮）',
    actorId: 'user-chaomu',
    module: '身份认证',
    action: '登录',
    objectType: '账号',
    objectId: 'admin-1',
    objectName: '朝暮',
    description: '通过钉钉 SSO 登录',
    source: 'Web',
    traceId: 'tr_login_001',
    before: '未登录',
    after: '已登录',
  },
]
const actorDirectory = [
  { id: 'user-chaomu', label: '张明（朝暮）', department: '商品部' },
  { id: 'user-qinghui', label: '李清（清晖）', department: '线上店铺' },
  { id: 'user-bailu', label: '王蕾（白露）', department: '市场营销部' },
  { id: 'system-task', label: '系统任务', department: '系统' },
]
const filteredAuditRecords = computed(() =>
  auditRecords.filter((record) => {
    const f = appliedAudit.value
    const time = new Date(record.time.replace(' ', 'T')).getTime()
    return (
      (!f.start || time >= new Date(f.start).getTime()) &&
      (!f.end || time <= new Date(f.end).getTime()) &&
      (!f.actorId || record.actorId === f.actorId) &&
      (f.module === '全部模块' || record.module === f.module) &&
      (f.action === '全部操作' || record.action === f.action)
    )
  }),
)
function applyAuditFilters() {
  const keyword = actorQuery.value.trim().toLowerCase()
  const selectedActor = actorDirectory.find((actor) =>
    actor.label.toLowerCase() === keyword || actor.label.toLowerCase().includes(keyword),
  )
  appliedAudit.value = {
    start: auditStart.value,
    end: auditEnd.value,
    actor: actorQuery.value,
    actorId: keyword ? selectedActor?.id ?? '__no_match__' : '',
    module: auditModule.value,
    action: auditAction.value,
  }
  showFeedback(`筛选已应用，共 ${filteredAuditRecords.value.length} 条记录`)
}
function resetAuditFilters() {
  auditStart.value = '2026-09-01T00:00'
  auditEnd.value = '2026-09-16T23:59'
  actorQuery.value = ''
  auditModule.value = '全部模块'
  auditAction.value = '全部操作'
  applyAuditFilters()
}
function exportAudit() {
  downloadCsv('日志管理.csv', [
    '操作时间,人员,模块,操作类型,操作对象ID,名称,描述,修改前,修改后',
    ...filteredAuditRecords.value.map((r) =>
      [
        r.time,
        r.actor,
        r.module,
        r.action,
        r.objectId,
        r.objectName,
        r.description,
        r.before,
        r.after,
      ].join(','),
    ),
  ])
  showFeedback(`已导出 ${filteredAuditRecords.value.length} 条日志记录`)
}
</script>

<template>
  <div
    data-testid="settings-insights-shell"
    class="settings-insights"
    :class="{ 'settings-insights--personal': !isAdmin }"
  >
    <aside v-if="isAdmin" class="settings-side" data-testid="settings-admin-nav">
      <div class="settings-brand"><span>SETTINGS</span><strong>设置</strong></div>
      <nav aria-label="设置导航">
        <button
          v-for="item in navItems"
          :key="item.path"
          type="button"
          :class="{ active: route.path === item.path }"
          @click="router.push(item.path)"
        >
          <component :is="item.icon" :size="17" /><span>{{ item.label }}</span
          ><ChevronRight :size="14" />
        </button>
      </nav>
      <div class="settings-user-scope">
        <Users :size="16" />
        <div>
          <strong>{{ store.user?.displayName }}</strong
          ><small>超级管理员 · 全组织数据</small>
        </div>
      </div>
    </aside>

    <main data-testid="settings-insights-card" class="settings-content">
      <template v-if="!isAudit && !isAdmin">
        <header class="personal-head">
          <div>
            <span class="personal-breadcrumb">我的用量</span>
            <h1>个人消耗明细</h1>
            <p>查看每次请求产生的费用与智能体消耗</p>
          </div>
          <div class="personal-actions">
            <div role="tablist" aria-label="个人明细时间范围" class="segmented">
              <button
                type="button"
                role="tab"
                :aria-selected="personalPeriod === 'today'"
                @click="choosePersonalPeriod('today')"
              >
                今天</button
              ><button
                type="button"
                role="tab"
                :aria-selected="personalPeriod === '7d'"
                @click="choosePersonalPeriod('7d')"
              >
                7 天</button
              ><button
                type="button"
                role="tab"
                :aria-selected="personalPeriod === '30d'"
                @click="choosePersonalPeriod('30d')"
              >
                30 天
              </button>
            </div>
            <div class="personal-date">
              <input
                v-model="startDate"
                type="date"
                aria-label="开始日期"
                @change="personalPeriod = 'custom'"
              /><span>至</span
              ><input
                v-model="endDate"
                type="date"
                aria-label="结束日期"
                @change="personalPeriod = 'custom'"
              />
            </div>
            <button
              type="button"
              class="secondary-button"
              aria-label="导出个人消耗明细"
              @click="exportPersonalUsage"
            >
              <Download :size="15" />导出
            </button>
          </div>
        </header>
        <section class="metric-grid personal-metrics">
          <article
            v-for="item in metrics.slice(0, 4)"
            :key="item.label"
            class="metric-card"
            :class="{
              danger: item.label === '系统额度' && displayRate >= 90,
              warning: item.label === '系统额度' && displayRate >= 80 && displayRate < 90,
            }"
          >
            <div>
              <span>{{ item.label }}</span
              ><component :is="item.icon" :size="17" />
            </div>
            <strong>{{ item.value }}</strong
            ><small>{{ item.note }}</small>
          </article>
        </section>
        <section class="panel personal-ledger">
          <div class="table-scroll">
            <table aria-label="个人消耗明细">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>请求</th>
                  <th>Token 消耗</th>
                  <th>金额消耗</th>
                  <th>智能体</th>
                  <th>模型</th>
                  <th>使用端</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in personalUsageRecords" :key="record.id">
                  <td>{{ record.time }}</td>
                  <td>
                    <div class="request-cell">
                      <strong>{{ record.request }}</strong
                      ><small>{{ record.requestId }}</small>
                    </div>
                  </td>
                  <td>{{ number(record.tokens) }}</td>
                  <td>{{ money(record.amount) }}</td>
                  <td>{{ record.agent }}</td>
                  <td>{{ record.model }}</td>
                  <td>{{ record.client }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <template v-else-if="!isAudit">
        <header class="page-head">
          <div>
            <span class="eyebrow">USAGE MANAGEMENT</span>
            <h1>用量管理</h1>
            <p>从部门逐层下钻至每一次会话，统一核对额度与费用</p>
            <p class="freshness-note">
              数据更新：请求完成后实时初算；次日重算前一日 Token 并回写人民币金额 · 最近更新
              2026-09-17 09:10
            </p>
          </div>
        </header>
        <section class="filter-panel" aria-label="用量筛选">
            <label><span>周期</span><select v-model="usagePeriod" aria-label="周期"><option>今日</option><option>本周</option><option>本月</option><option>自定义</option></select></label>
            <label
              ><span>开始日期</span
              ><input v-model="startDate" type="date" aria-label="开始日期" @change="usagePeriod = '自定义'" /></label
            ><label
              ><span>结束日期</span
              ><input v-model="endDate" type="date" aria-label="结束日期" @change="usagePeriod = '自定义'" /></label
            ><label class="search-field wide"
              ><span>人员</span>
              <div>
                <Search :size="15" /><input
                  v-model="peopleQuery"
                  list="usage-person-options"
                  aria-label="人员筛选"
                  placeholder="输入本名或花名筛选"
                /><datalist id="usage-person-options"><option>张明（朝暮）</option><option>李清（清晖）</option><option>王蕾（白露）</option></datalist></div></label
            ><label
              ><span>模块</span
              ><select v-model="usageModule" aria-label="模块">
                <option>全部模块</option>
                <option>智能体</option>
                <option>小智问答</option>
                <option>办公助手</option>
              </select></label
            ><label
              ><span>智能体</span
              ><select v-model="usageAgent" aria-label="智能体">
                <option>全部智能体</option>
                <option>数据分析师</option>
                <option>TOP 款分析师</option>
                <option>小智问答</option>
              </select></label
            ><div class="filter-actions"><button type="button" class="filter-reset" aria-label="清空用量筛选" @click="resetUsageFilters"><RotateCcw :size="14" />清空</button><button type="button" class="primary-button" aria-label="查询用量" @click="applyUsageFilters">查询</button></div>
        </section>
        <section class="metric-grid">
          <article v-for="item in metrics" :key="item.label" class="metric-card" :class="{ danger: item.label === '系统额度' && displayRate >= 90, warning: item.label === '系统额度' && displayRate >= 80 && displayRate < 90 }">
            <div><span>{{ item.label }}</span><component :is="item.icon" :size="17" /></div><strong>{{ item.value }}</strong><small>{{ item.note }}</small>
          </article>
        </section>
          <section class="panel detail-panel">
            <header>
              <div>
                <h2>组织用量明细</h2>
                <p>部门 → 人员 → 请求（会话名称 · 时间）</p>
              </div>
              <div class="table-actions">
                <button type="button" aria-label="配置全局默认额度" @click="openGlobalQuota"><Settings2 :size="15" />全局默认额度</button>
                <button type="button" aria-label="全部展开" @click="expandAll">
                  <PlusSquare :size="15" />全部展开</button
                ><button type="button" aria-label="全部收起" @click="collapseAll">
                  <MinusSquare :size="15" />全部收起</button
                ><button
                  type="button"
                  class="secondary-button"
                  aria-label="导出用量明细"
                  @click="exportUsage"
                >
                  <Download :size="15" />导出明细
                </button>
              </div>
            </header>
            <div class="table-scroll">
              <table class="usage-tree">
                <thead>
                  <tr>
                    <th>分类</th>
                    <th>系统额度</th>
                    <th>使用率</th>
                    <th>金额消耗</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in visibleRows"
                    :key="row.id"
                    :data-testid="`usage-row-${row.id}`"
                    :class="[
                      'tree-row',
                      `tree-row--${row.type}`,
                      { clickable: row.type === 'session' },
                    ]"
                    :tabindex="row.type === 'session' ? 0 : undefined"
                    @click="openRow(row)"
                    @keydown.enter="openRow(row)"
                  >
                    <td>
                      <div class="tree-cell" :style="{ paddingLeft: `${row.level * 22}px` }">
                        <button
                          v-if="row.children?.length"
                          type="button"
                          class="tree-toggle"
                          :aria-label="`${expandedIds.has(row.id) ? '收起' : '展开'}${row.name}`"
                          @click.stop="toggleNode(row.id)"
                        >
                          <ChevronDown v-if="expandedIds.has(row.id)" :size="15" /><ChevronRight
                            v-else
                            :size="15"
                          /></button
                        ><span v-else class="tree-dot" /><strong>{{ row.name }}</strong
                        ><small v-if="row.subtitle">{{ row.subtitle }}</small>
                      </div>
                    </td>
                    <td><span>{{ row.quota ? money(row.quota) : '—' }}</span><small v-if="row.type === 'person' && row.quotaSource" class="quota-source">{{ row.quotaSource }}</small></td>
                    <td>
                      <div v-if="row.quota" class="quota-cell">
                        <span class="quota-track"
                          ><i
                            :class="{ warning: row.quotaRate >= 80, danger: row.quotaRate >= 90 }"
                            :style="{ width: `${Math.min(row.quotaRate, 100)}%` }" /></span
                        ><b
                          :data-testid="`quota-rate-${row.id}`"
                          :class="[
                            'quota-rate',
                            {
                              'quota-rate--warning': row.quotaRate >= 80,
                              'quota-rate--danger': row.quotaRate >= 90,
                            },
                          ]"
                          >{{ row.quotaRate.toFixed(0) }}%</b
                        >
                      </div>
                      <span v-else>—</span>
                    </td>
                    <td>{{ money(row.amount) }}</td>
                    <td class="row-actions"><button v-if="row.type === 'person'" type="button" @click.stop="openPersonQuota(row)">设置额度</button><button v-if="row.type !== 'department'" type="button" @click.stop="selectedUsage = row">详情</button><span v-if="row.type === 'department'">—</span></td>
                  </tr>
                  <tr v-if="!visibleRows.length">
                    <td colspan="5" class="empty-cell">
                      当前条件下暂无数据
                      <button type="button" @click="resetUsageFilters">清空筛选</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
      </template>

      <template v-else>
        <header class="page-head">
          <div>
            <span class="eyebrow">LOG MANAGEMENT</span>
            <h1>日志管理</h1>
            <p>查看新增、修改、删除与授权操作的完整字段差异</p>
          </div>
          <button
            type="button"
            class="secondary-button"
            aria-label="导出当前筛选结果"
            @click="exportAudit"
          >
            <Download :size="16" />导出当前结果
          </button>
        </header>
        <section class="filter-panel audit-filters">
          <label
            ><span>开始时间</span
            ><input v-model="auditStart" aria-label="开始时间" type="datetime-local" /></label
          ><label
            ><span>结束时间</span
            ><input v-model="auditEnd" aria-label="结束时间" type="datetime-local" /></label
          ><label
            ><span>操作人员</span
            ><input v-model="actorQuery" list="audit-actor-options" aria-label="操作人员" placeholder="输入本名或当前花名筛选" /><datalist id="audit-actor-options"><option v-for="actor in actorDirectory" :key="actor.id" :value="actor.label">{{ actor.label }}＋{{ actor.department }}</option></datalist></label
          ><label><span>模块</span><select v-model="auditModule" aria-label="日志模块"><option>全部模块</option><option>智能体管理</option><option>知识中心</option><option>模型管理</option><option>工具管理</option><option>会话</option></select></label
          ><label
            ><span>操作类型</span
            ><select v-model="auditAction" aria-label="操作类型">
              <option>全部操作</option>
              <option>新增</option>
              <option>修改</option>
              <option>删除</option>
              <option>授权</option>
            </select></label
          >
          <div class="filter-actions">
            <button
              type="button"
              class="filter-reset"
              aria-label="清空审计筛选"
              @click="resetAuditFilters"
            >
              <RotateCcw :size="14" />清空</button
            ><button
              type="button"
              class="primary-button"
              aria-label="应用审计筛选"
              @click="applyAuditFilters"
            >
              查询
            </button>
          </div>
        </section>
        <section class="panel audit-panel">
          <div class="table-scroll">
            <table aria-label="日志列表">
              <thead>
                <tr>
                  <th>操作时间</th>
                  <th>人员</th>
                  <th>模块</th>
                  <th>操作类型</th>
                  <th>操作对象</th>
                  <th>修改前</th>
                  <th>修改后</th>
                  <th>描述</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="record in filteredAuditRecords"
                  :key="record.id"
                  :data-testid="`audit-row-${record.id}`"
                  class="clickable"
                  tabindex="0"
                  @click="selectedAudit = record"
                  @keydown.enter="selectedAudit = record"
                >
                  <td>{{ record.time }}</td>
                  <td>{{ record.actor }}</td>
                  <td>{{ record.module }}</td>
                  <td>{{ record.action }}</td>
                  <td>
                    <strong>{{ record.objectName }}</strong>
                  </td>
                  <td class="change-cell">{{ record.before }}</td>
                  <td class="change-cell">{{ record.after }}</td>
                  <td>{{ record.description }}</td>
                  <td>
                    <button type="button" class="detail-btn" @click.stop="selectedAudit = record">详情</button>
                  </td>
                </tr>
                <tr v-if="!filteredAuditRecords.length">
                  <td colspan="9" class="empty-cell">当前条件下暂无日志</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
      <div v-if="feedback" class="toast" role="status">
        <CheckCircle2 :size="16" />{{ feedback
        }}<button type="button" aria-label="关闭提示" @click="feedback = ''">
          <X :size="14" />
        </button>
      </div>
    </main>

    <Teleport to="body">
      <div v-if="quotaOpen" class="modal-layer" @mousedown.self="quotaOpen = false">
        <section
          class="quota-dialog"
          role="dialog"
          aria-modal="true"
          :aria-label="quotaDialogMode === 'create' ? '新增额度策略' : '调整月度额度'"
        >
          <header>
            <div>
              <span class="dialog-icon"><CircleDollarSign :size="18" /></span>
              <div>
                <strong>{{
                  quotaDialogMode === 'create' ? `为 ${quotaObject || '指定人员'} 设置额度` : '调整月度额度'
                }}</strong>
                <p>2026 年 9 月 · 人民币额度</p>
              </div>
            </div>
            <button type="button" aria-label="关闭" @click="quotaOpen = false">
              <X :size="18" />
            </button>
          </header>
          <div class="dialog-body quota-form">
            <label
              ><span>额度范围</span
              ><select v-model="quotaScope" aria-label="额度范围">
                <option>人员</option>
                <option>全局</option>
              </select></label
            >
            <label
              ><span>额度对象</span
              ><input
                v-model="quotaObject"
                aria-label="额度对象"
                placeholder="输入人员花名或全局名称"
            /></label>
            <label
              ><span>额度类型</span
              ><select v-model="quotaType" aria-label="额度类型">
                <option>默认</option>
                <option>临时</option>
              </select></label
            >
            <label
              ><span>额度周期</span
              ><select v-model="quotaCycle" aria-label="额度周期">
                <option>每日</option>
                <option>每周</option>
                <option>每月</option>
              </select></label
            >
            <label class="full"
              ><span>{{
                quotaDialogMode === 'create' ? '额度总量（人民币）' : '调整后额度（人民币）'
              }}</span
              ><input v-model="quotaAmount" aria-label="调整后额度（人民币）" type="number" min="1"
            /></label>
            <label class="full"
              ><span>调整原因</span
              ><textarea v-model="quotaReason" aria-label="调整原因" rows="3" />
            </label>
            <p v-if="quotaError" class="form-error full">{{ quotaError }}</p>
          </div>
          <footer>
            <button v-if="quotaTarget?.quotaSource === '个人设置'" type="button" class="danger-text" aria-label="删除个人额度" @click="deletePersonalQuota">删除个人额度</button>
            <button type="button" @click="quotaOpen = false">取消</button
            ><button
              type="button"
              class="primary-button"
              aria-label="确认调整额度"
              @click="confirmQuota"
            >
              {{ quotaDialogMode === 'create' ? '创建额度' : '确认调整' }}
            </button>
          </footer>
        </section>
      </div>
      <div v-if="selectedUsage" class="modal-layer" @mousedown.self="selectedUsage = null">
        <section
          class="usage-detail-modal"
          role="dialog"
          aria-modal="true"
          aria-label="用量明细详情"
        >
          <header>
            <div>
              <span class="dialog-icon"><CircleDollarSign :size="18" /></span>
              <div>
                <strong>{{ selectedUsage.name }}</strong>
                <p>{{ selectedUsage.sessionId }}</p>
              </div>
            </div>
            <button type="button" aria-label="关闭用量详情" @click="selectedUsage = null">
              <X :size="18" />
            </button>
          </header>
          <div class="dialog-body usage-detail-body">
            <section>
              <h2>会话信息</h2>
              <dl>
                <div>
                  <dt>会话名称</dt>
                  <dd>{{ selectedUsage.name }}</dd>
                </div>
                <div>
                  <dt>最近调用</dt>
                  <dd>{{ selectedUsage.date }}</dd>
                </div>
                <div>
                  <dt>对话模式</dt>
                  <dd>{{ selectedUsage.mode }}</dd>
                </div>
                <div>
                  <dt>模型</dt>
                  <dd>{{ selectedUsage.model }}</dd>
                </div>
              </dl>
            </section>
            <section>
              <h2>消耗明细</h2>
              <dl>
                <div>
                  <dt>人民币消耗</dt>
                  <dd>{{ money(selectedUsage.amount) }}</dd>
                </div>
                <div>
                  <dt>输入 Token</dt>
                  <dd>{{ compact(Math.round(selectedUsage.tokens * 0.62)) }}</dd>
                </div>
                <div>
                  <dt>输出 Token</dt>
                  <dd>{{ compact(Math.round(selectedUsage.tokens * 0.28)) }}</dd>
                </div>
                <div>
                  <dt>缓存命中 Token</dt>
                  <dd>{{ compact(Math.round(selectedUsage.tokens * 0.1)) }}</dd>
                </div>
              </dl>
            </section>
          </div>
        </section>
      </div>
      <div v-if="selectedAudit" class="modal-layer" @mousedown.self="selectedAudit = null">
        <section
          class="audit-detail-modal"
          role="dialog"
          aria-modal="true"
          aria-label="审计日志详情"
        >
          <header>
            <div>
              <span class="dialog-icon"><ShieldCheck :size="18" /></span>
              <div>
                <strong>日志详情</strong>
                <p>{{ selectedAudit.id }}</p>
              </div>
            </div>
            <button type="button" aria-label="关闭日志详情" @click="selectedAudit = null">
              <X :size="18" />
            </button>
          </header>
          <div class="dialog-body audit-detail-body">
            <section>
              <h2>基本信息</h2>
              <dl>
                <div>
                  <dt>操作时间</dt>
                  <dd>{{ selectedAudit.time }}</dd>
                </div>
                <div>
                  <dt>操作人</dt>
                  <dd>{{ selectedAudit.actor }}</dd>
                </div>
                <div>
                  <dt>模块</dt>
                  <dd>{{ selectedAudit.module }}</dd>
                </div>
                <div>
                  <dt>来源</dt>
                  <dd>{{ selectedAudit.source }}</dd>
                </div>
                <div>
                  <dt>Trace ID</dt>
                  <dd>
                    <code>{{ selectedAudit.traceId }}</code>
                  </dd>
                </div>
              </dl>
            </section>
            <section>
              <h2>操作对象</h2>
              <dl>
                <div>
                  <dt>对象类型</dt>
                  <dd>{{ selectedAudit.objectType }}</dd>
                </div>
                <div>
                  <dt>对象名称</dt>
                  <dd>{{ selectedAudit.objectName }}</dd>
                </div>
                <div>
                  <dt>操作对象 ID</dt>
                  <dd>
                    <code>{{ selectedAudit.objectId }}</code>
                  </dd>
                </div>
                <div>
                  <dt>描述</dt>
                  <dd>{{ selectedAudit.description }}</dd>
                </div>
                <div>
                  <dt>操作</dt>
                  <dd>{{ selectedAudit.action }}</dd>
                </div>
              </dl>
            </section>
            <section>
              <h2>字段变更</h2>
              <div class="diff-grid">
                <article>
                  <span>变更前</span>
                  <pre>{{ selectedAudit.before }}</pre>
                </article>
                <article class="after">
                  <span>变更后</span>
                  <pre>{{ selectedAudit.after }}</pre>
                </article>
              </div>
            </section>
          </div>
        </section>
      </div>
      <aside v-if="!isAudit && isAdmin && quotaWarningOpen" class="quota-warning" role="alert">
        <span class="warning-icon">!</span><div><strong>额度即将用尽</strong><p>李清（清晖）的本周期额度仅剩 6%，请及时调整额度，避免任务中断。</p></div><button type="button" aria-label="关闭额度预警" @click="quotaWarningOpen = false"><X :size="15" /></button>
      </aside>
    </Teleport>
  </div>
</template>

<style scoped>
.settings-insights {
  box-sizing: border-box;
  display: flex;
  min-height: calc(100vh - 57px);
  gap: 8px;
  background: #f5f5f6;
  padding: 8px;
  color: #18181b;
  font-family:
    system-ui,
    -apple-system,
    'Segoe UI',
    'PingFang SC',
    'Microsoft YaHei',
    sans-serif;
}
.settings-side {
  position: sticky;
  top: 65px;
  display: flex;
  width: 218px;
  height: calc(100vh - 73px);
  box-sizing: border-box;
  flex: 0 0 218px;
  flex-direction: column;
  border: 1px solid #ececef;
  border-radius: 8px;
  background: #fff;
  padding: 20px 14px 16px;
}
.settings-brand {
  padding: 0 10px;
}
.settings-brand span {
  display: block;
  color: #a1a1aa;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
}
.settings-brand strong {
  display: block;
  margin-top: 5px;
  font-size: 18px;
}
.settings-side nav {
  margin-top: 20px;
}
.settings-side nav button {
  display: flex;
  width: 100%;
  height: 40px;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 8px;
  padding: 0 12px;
  background: transparent;
  color: #666;
  font: 13px inherit;
  cursor: pointer;
}
.settings-side nav button svg:last-child {
  margin-left: auto;
}
.settings-side nav button.active {
  background: #18181b;
  color: #fff;
}
.settings-user-scope {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  border-top: 1px solid #eee;
  padding: 17px 10px 0;
}
.settings-user-scope strong,
.settings-user-scope small {
  display: block;
}
.settings-user-scope small {
  margin-top: 2px;
  color: #999;
  font-size: 10px;
}
.settings-content {
  position: relative;
  min-width: 0;
  flex: 1;
  border: 1px solid #ececef;
  border-radius: 8px;
  background: #fff;
  padding: 24px clamp(22px, 2.5vw, 36px) 70px;
}
.settings-insights--personal .settings-content {
  width: min(1320px, 100%);
  margin: 0 auto;
}
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}
.eyebrow {
  display: none;
}
.page-head h1 {
  margin: 0;
  font-size: 18px;
}
.page-head p {
  margin: 5px 0 0;
  color: #71717a;
  font-size: 12px;
}
.personal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.personal-head h1 {
  margin: 0;
  font-size: 20px;
}
.personal-breadcrumb { display:block; margin-bottom:6px; color:#888; font-size:11px; }
.personal-head p {
  margin: 5px 0 0;
  color: #8b8b92;
  font-size: 12px;
}
.page-head .freshness-note,
.personal-head .freshness-note {
  margin-top: 9px;
  color: #4f6b94;
}
.personal-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.segmented {
  display: flex;
  height: 34px;
  align-items: center;
  border-radius: 18px;
  background: #f1f1f3;
  padding: 2px;
}
.segmented button {
  height: 30px;
  border: 0;
  border-radius: 16px;
  padding: 0 15px;
  background: transparent;
  color: #4d4d53;
  font: 12px inherit;
  cursor: pointer;
}
.segmented button[aria-selected='true'] {
  background: #fff;
  color: #111;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  font-weight: 600;
}
.personal-date {
  display: flex;
  height: 34px;
  align-items: center;
  gap: 7px;
  border-radius: 18px;
  background: #f5f5f6;
  padding: 0 12px;
  color: #999;
}
.personal-date input {
  width: 118px;
  border: 0;
  background: transparent;
  color: #333;
  font: 12px inherit;
  outline: none;
}
.personal-metrics {
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  margin-top: 22px;
}
.personal-ledger {
  margin-top: 14px;
  overflow: hidden;
  border-radius: 18px;
}
.personal-ledger table {
  min-width: 1120px;
}
.personal-ledger th {
  height: 54px;
  background: #fff;
  color: #3f3f46;
}
.personal-ledger td {
  height: 82px;
}
.request-cell {
  display: grid;
  width: 280px;
  gap: 5px;
}
.request-cell strong,
.request-cell small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.request-cell strong {
  font-weight: 500;
}
.request-cell small {
  color: #a1a1aa;
  font-size: 11px;
}
.page-tabs {
  display: flex;
  height: 44px;
  align-items: flex-end;
  gap: 28px;
  margin-top: 18px;
  border-bottom: 1px solid #e5e5e7;
}
.page-tabs button {
  position: relative;
  height: 44px;
  border: 0;
  background: transparent;
  color: #666;
  font: 13px inherit;
  cursor: pointer;
}
.page-tabs button::after {
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: #18181b;
  content: '';
  opacity: 0;
}
.page-tabs button[aria-selected='true'] {
  color: #18181b;
  font-weight: 600;
}
.page-tabs button[aria-selected='true']::after {
  opacity: 1;
}
.primary-button,
.secondary-button,
.filter-reset,
.table-actions button {
  display: inline-flex;
  height: 34px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 7px;
  padding: 0 13px;
  font: 13px inherit;
  cursor: pointer;
}
.primary-button {
  border: 1px solid #18181b;
  background: #18181b;
  color: #fff;
}
.secondary-button,
.filter-reset,
.table-actions button {
  border: 1px solid #dedfe2;
  background: #fff;
  color: #3f3f46;
}
.filter-panel {
  display: grid;
  grid-template-columns: repeat(5, minmax(130px, 1fr)) auto;
  gap: 10px;
  margin-top: 18px;
  border: 1px solid #ececef;
  border-radius: 8px;
  background: #fafafa;
  padding: 12px;
}
.filter-panel label > span {
  display: block;
  margin-bottom: 6px;
  color: #71717a;
  font-size: 11px;
}
.filter-panel input,
.filter-panel select {
  box-sizing: border-box;
  width: 100%;
  height: 34px;
  border: 1px solid #dedfe2;
  border-radius: 7px;
  background: #fff;
  padding: 0 9px;
  color: #27272a;
  font: 12px inherit;
  outline: none;
}
.filter-panel input:focus,
.filter-panel select:focus {
  border-color: #71717a;
  box-shadow: 0 0 0 3px rgba(24, 24, 27, 0.07);
}
.search-field > div {
  display: flex;
  height: 34px;
  align-items: center;
  gap: 6px;
  border: 1px solid #dedfe2;
  border-radius: 7px;
  background: #fff;
  padding: 0 8px;
}
.search-field > div input {
  height: 30px;
  border: 0;
  padding: 0;
}
.filter-reset {
  align-self: end;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(140px, 1fr));
  gap: 10px;
  margin-top: 14px;
}
.metric-card {
  min-width: 0;
  border: 1px solid #e2e3e6;
  border-radius: 8px;
  background: #fff;
  padding: 14px;
}
.metric-card > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #71717a;
  font-size: 11px;
}
.metric-card strong {
  display: block;
  margin-top: 13px;
  overflow: hidden;
  font-size: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.metric-card small {
  display: block;
  margin-top: 6px;
  color: #a1a1aa;
  font-size: 10px;
}
.metric-card.warning {
  border-color: #f2c76f;
  background: #fffbeb;
}
.metric-card.danger {
  border-color: #ef9a9a;
  background: #fff5f5;
}
.panel {
  border: 1px solid #e2e3e6;
  border-radius: 8px;
  background: #fff;
}
.detail-panel,
.audit-panel,
.quota-panel {
  margin-top: 14px;
}
.panel > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #eee;
  padding: 14px 16px;
}
.panel h2 {
  margin: 0;
  font-size: 15px;
}
.panel header p {
  margin: 4px 0 0;
  color: #999;
  font-size: 11px;
}
.table-actions {
  display: flex;
  gap: 7px;
}
.table-scroll {
  overflow: auto;
}
.panel table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
  font-size: 12px;
}
.panel th {
  height: 40px;
  background: #fafafa;
  color: #71717a;
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
}
.panel td {
  height: 56px;
  border-top: 1px solid #ededee;
  color: #52525b;
  white-space: nowrap;
}
.panel th,
.panel td {
  padding: 0 14px;
}
.tree-row:hover td,
.clickable:hover td,
.clickable:focus td {
  background: #fafafa;
}
.tree-row--department td {
  background: #fcfcfd;
}
.tree-row--department .tree-cell strong {
  font-size: 13px;
}
.tree-cell {
  display: flex;
  min-width: 245px;
  align-items: center;
  gap: 7px;
}
.tree-toggle {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #52525b;
  cursor: pointer;
}
.tree-toggle:hover {
  background: #eee;
}
.tree-dot {
  width: 5px;
  height: 5px;
  margin: 0 10px;
  border-radius: 50%;
  background: #c5c7cc;
}
.tree-cell small {
  border-radius: 4px;
  background: #f0f1f3;
  padding: 2px 5px;
  color: #8b8d94;
  font-size: 10px;
}
.type-chip {
  border-radius: 999px;
  background: #f1f2f4;
  padding: 3px 8px;
  color: #666;
  font-size: 10px;
}
.quota-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.quota-track {
  width: 58px;
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: #eceef1;
}
.quota-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #5b8def;
}
.quota-track i.warning {
  background: #e7a328;
}
.quota-track i.danger {
  background: #dc4343;
}
.quota-rate {
  min-width: 30px;
  font-size: 11px;
}
.quota-rate--warning {
  color: #b26b00;
}
.quota-rate--danger {
  color: #c93232;
  font-weight: 700;
}
.empty-cell {
  height: 170px !important;
  text-align: center;
}
.empty-cell button {
  border: 0;
  background: transparent;
  text-decoration: underline;
}
.clickable {
  cursor: pointer;
}
.status {
  border-radius: 999px;
  background: #eaf7ef;
  padding: 3px 8px;
  color: #2a8652;
}
.audit-filters {
  grid-template-columns: repeat(6, minmax(120px, 1fr)) minmax(190px, 1.4fr) auto;
}
.audit-panel table {
  min-width: 1480px;
}
.change-cell {
  max-width: 200px;
  overflow: hidden;
  color: #777;
  text-overflow: ellipsis;
  white-space: pre-line !important;
}
.detail-btn {
  padding: 4px 12px;
  border: 1px solid #dedfe2;
  border-radius: 6px;
  background: #fff;
  color: #2563eb;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.detail-btn:hover {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}
.filter-actions {
  display: flex;
  align-self: end;
  gap: 7px;
}
.panel code {
  border-radius: 4px;
  background: #f3f3f4;
  padding: 3px 6px;
  font:
    10px ui-monospace,
    monospace;
}
.toast {
  position: fixed;
  z-index: 900;
  right: 30px;
  bottom: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #d8e8dc;
  border-radius: 10px;
  background: #f5fbf7;
  padding: 11px 12px;
  color: #286a42;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  font-size: 12px;
}
.toast button {
  border: 0;
  background: transparent;
}
.modal-layer,
.drawer-layer {
  position: fixed;
  z-index: 800;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
}
.modal-layer {
  display: grid;
  place-items: center;
}
.quota-dialog {
  width: min(480px, calc(100vw - 32px));
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.22);
}
.quota-dialog header,
.audit-detail-modal > header,
.usage-detail-modal > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
  padding: 18px 20px;
}
.quota-dialog header > div,
.audit-detail-modal > header > div,
.usage-detail-modal > header > div {
  display: flex;
  align-items: center;
  gap: 11px;
}
.quota-dialog header strong,
.audit-detail-modal header strong,
.usage-detail-modal header strong {
  display: block;
  font-size: 15px;
}
.quota-dialog header p,
.audit-detail-modal header p,
.usage-detail-modal header p {
  margin: 3px 0 0;
  color: #999;
  font-size: 10px;
}
.quota-dialog header button,
.audit-detail-modal header button,
.usage-detail-modal header button {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
}
.dialog-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 9px;
  background: #f1f1f2;
}
.dialog-body {
  padding: 20px;
}
.dialog-body label {
  display: block;
  margin-bottom: 16px;
}
.dialog-body label span {
  display: block;
  margin-bottom: 7px;
  color: #666;
  font-size: 12px;
}
.dialog-body input,
.dialog-body textarea,
.dialog-body select {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  background: #fff;
  font: 13px inherit;
}
.dialog-body select {
  height: 40px;
  padding: 0 10px;
}
.quota-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.quota-form label {
  margin: 0;
}
.quota-form .full {
  grid-column: 1 / -1;
}
.form-error {
  color: #b42318;
  font-size: 12px;
}
.quota-dialog footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #eee;
  padding: 14px 20px;
}
.quota-dialog footer > button:not(.primary-button) {
  height: 36px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  padding: 0 14px;
}
.audit-detail-modal,
.usage-detail-modal {
  width: min(720px, calc(100vw - 40px));
  max-height: calc(100vh - 70px);
  overflow: auto;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.22);
}
.audit-detail-body section,
.usage-detail-body section {
  border-bottom: 1px solid #eee;
  padding: 22px 0;
}
.audit-detail-body h2,
.usage-detail-body h2 {
  margin: 0 0 14px;
  font-size: 14px;
}
.audit-detail-body dl,
.usage-detail-body dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin: 0;
}
.audit-detail-body dt,
.usage-detail-body dt {
  color: #999;
  font-size: 10px;
}
.audit-detail-body dd,
.usage-detail-body dd {
  margin: 5px 0 0;
  color: #333;
  font-size: 12px;
}
.row-actions { display:flex; align-items:center; gap:8px; }
.row-actions button { border:0; background:transparent; color:#176fe8; cursor:pointer; font:12px inherit; }
.quota-source { display:block; width:max-content; margin:4px auto 0; border-radius:999px; background:#f1f6ff; padding:2px 7px; color:#3974c9; font-size:10px; }
.quota-dialog footer .danger-text { margin-right:auto; border-color:#ffd4d4; color:#c73535; }
.quota-warning { position:fixed; z-index:750; right:24px; bottom:24px; display:grid; width:min(390px,calc(100vw - 48px)); grid-template-columns:32px 1fr 24px; gap:10px; border:1px solid #ffc9c9; border-radius:12px; background:#fff7f7; padding:15px; box-shadow:0 14px 40px rgba(93,24,24,.16); }
.quota-warning .warning-icon { display:grid; width:30px; height:30px; place-items:center; border-radius:50%; background:#e5484d; color:#fff; font-weight:800; }
.quota-warning strong { color:#7f1d1d; font-size:14px; }
.quota-warning p { margin:5px 0 0; color:#9f3a3a; font-size:12px; line-height:1.55; }
.quota-warning button { border:0; background:transparent; color:#9f3a3a; cursor:pointer; }
.diff-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.diff-grid article {
  border: 1px solid #eee;
  border-radius: 9px;
  background: #fafafa;
  padding: 12px;
}
.diff-grid article.after {
  border-color: #d9e9de;
  background: #f7fbf8;
}
.diff-grid span {
  color: #888;
  font-size: 10px;
}
.diff-grid pre {
  margin: 9px 0 0;
  white-space: pre-wrap;
  font:
    11px/1.7 ui-monospace,
    monospace;
}
@media (max-width: 1280px) {
  .metric-grid {
    grid-template-columns: repeat(3, minmax(140px, 1fr));
  }
  .personal-metrics {
    grid-template-columns: repeat(4, minmax(140px, 1fr));
  }
  .personal-head {
    align-items: flex-start;
    flex-direction: column;
  }
  .filter-panel,
  .audit-filters {
    grid-template-columns: repeat(3, minmax(130px, 1fr));
  }
}
@media (max-width: 900px) {
  .settings-insights {
    padding: 0;
  }
  .settings-side {
    display: none;
  }
  .settings-content {
    border: 0;
    border-radius: 0;
    padding: 22px 16px 60px;
  }
  .metric-grid {
    grid-template-columns: repeat(2, minmax(140px, 1fr));
  }
  .filter-panel,
  .audit-filters {
    grid-template-columns: repeat(2, minmax(130px, 1fr));
  }
  .page-head {
    align-items: flex-start;
  }
  .personal-actions {
    width: 100%;
    flex-wrap: wrap;
  }
  .personal-date {
    order: 3;
  }
  .personal-metrics {
    grid-template-columns: repeat(2, minmax(140px, 1fr));
  }
  .quota-form {
    grid-template-columns: 1fr;
  }
  .quota-form .full {
    grid-column: auto;
  }
  .table-actions button:not(.secondary-button) {
    display: none;
  }
}
</style>
