<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
type DeptNode = {
  id: string
  name: string
  children?: DeptNode[]
}

type VisibleUsageRow = UsageNode & { level: number }
type AuditRecord = {
  id: string
  bizType: string
  bizId: string
  bizName: string
  operationType: 'CREATE' | 'UPDATE' | 'DELETE'
  operationDesc: string
  beforeContent: string
  afterContent: string
  source: '管理端' | '用户端' | '系统任务'
  ip: string
  traceId: string
  createUserId: string
  createUser: string
  createRealName: string
  createTime: string
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

const deptTree: DeptNode[] = [
  { id: 'dept-1', name: '江苏天马网络科技集团有限公司', children: [
    { id: 'dept-1053410329', name: '耶运动事业部', children: [
      { id: 'dept-137376821', name: '线上B2C', children: [
        { id: 'dept-978318956', name: '淘天平台', children: [
          { id: 'dept-140013601', name: '幸运叶子官方旗舰店', children: [
            { id: 'dept-339214594', name: '售后组' },
            { id: 'dept-339874464', name: '运动顾问组' },
            { id: 'dept-339586550', name: '运营师组' },
            { id: 'dept-339707458', name: '运营助理组' },
            { id: 'dept-500962847', name: '直播间组' },
          ]},
          { id: 'dept-140042408', name: 'Intersport旗舰店' },
          { id: 'dept-992941473', name: '淘宝店群' },
          { id: 'dept-992978471', name: '天猫店群' },
        ]},
        { id: 'dept-552181249', name: '京东平台' },
        { id: 'dept-987551908', name: '供货平台' },
        { id: 'dept-150482645', name: '拼多多平台' },
        { id: 'dept-394506571', name: '新平台事业部' },
        { id: 'dept-813466728', name: '育泰事业部' },
        { id: 'dept-852492792', name: '销售服务中台' },
        { id: 'dept-1030042091', name: '南京线上B2C' },
      ]},
      { id: 'dept-982359842', name: '直播部' },
      { id: 'dept-908985193', name: '数字营销中心' },
      { id: 'dept-908932220', name: '跑步基地' },
      { id: 'dept-1075164350', name: '羽毛球事业部' },
      { id: 'dept-1020138491', name: '营运部' },
    ]},
    { id: 'dept-137375891', name: '天马运动平台部', children: [
      { id: 'dept-986605928', name: '平台销售部' },
      { id: 'dept-373331238', name: '货源管理部' },
      { id: 'dept-926552193', name: '平台销售中台' },
      { id: 'dept-1054345229', name: '天团1号' },
    ]},
    { id: 'dept-1071573128', name: '线下业务部' },
    { id: 'dept-1106809551', name: '商品专卖店', children: [
      { id: 'dept-331005663', name: '斯凯奇事业部' },
      { id: 'dept-436958637', name: '京东MLB专卖店' },
      { id: 'dept-340339227', name: '京东哥伦比亚专卖店' },
      { id: 'dept-997494168', name: '特步销售运营组' },
    ]},
    { id: 'dept-479037415', name: '商品运营中心', children: [
      { id: 'dept-1013947821', name: '商品运营部' },
      { id: 'dept-867348644', name: '品牌商务部' },
    ]},
    { id: 'dept-137517219', name: '数字技术中心', children: [
      { id: 'dept-970183179', name: 'B2C研发部' },
      { id: 'dept-1043637071', name: '技术服务部' },
      { id: 'dept-1043596048', name: '中台研发部' },
      { id: 'dept-1079461197', name: '算法研发部' },
      { id: 'dept-861256974', name: 'B2B研发部' },
      { id: 'dept-1079268216', name: '零售研发部' },
      { id: 'dept-1075739175', name: 'AI项目组' },
    ]},
    { id: 'dept-141074384', name: '电商产业园', children: [
      { id: 'dept-1049798148', name: '产业园中台组' },
      { id: 'dept-599017054', name: '淮安自营业务部' },
      { id: 'dept-917643376', name: '代运营服务部' },
      { id: 'dept-581162735', name: '连云港自营业务部' },
    ]},
    { id: 'dept-997606961', name: '品牌中心', children: [
      { id: 'dept-1085091614', name: 'Barrel项目组' },
      { id: 'dept-1089627316', name: 'Stance项目组' },
      { id: 'dept-1089386382', name: 'WGWG项目组' },
      { id: 'dept-1093297348', name: '品牌运营组' },
      { id: 'dept-1093368335', name: '商品企划组' },
      { id: 'dept-1085642067', name: '项目中台组' },
      { id: 'dept-635042107', name: '蓝步事业部' },
    ]},
    { id: 'dept-564799263', name: '财务管理中心' },
    { id: 'dept-137304912', name: '人力资源中心' },
    { id: 'dept-1043298232', name: '运营办公室' },
    { id: 'dept-734674019', name: '总裁办' },
    { id: 'dept-565011789', name: '党委' },
  ]},
]

const deptOpen = ref(false)
const selectedDeptIds = ref(new Set<string>())
const deptSearchQuery = ref('')
const deptExpandedPath = ref<string[]>([])  // 级联面板展开路径（支持多层）

function allDeptIds(nodes: DeptNode[]): string[] {
  return nodes.flatMap(n => [n.id, ...(n.children ? allDeptIds(n.children) : [])])
}
function isDeptSelected(node: DeptNode): 'all' | 'partial' | 'none' {
  const ids = allDeptIds([node])
  const selected = ids.filter(id => selectedDeptIds.value.has(id))
  if (selected.length === 0) return 'none'
  if (selected.length === ids.length) return 'all'
  return 'partial'
}
function toggleDept(node: DeptNode) {
  const ids = allDeptIds([node])
  const allSelected = ids.every(id => selectedDeptIds.value.has(id))
  const next = new Set(selectedDeptIds.value)
  if (allSelected) ids.forEach(id => next.delete(id))
  else ids.forEach(id => next.add(id))
  selectedDeptIds.value = next
}
function toggleAllDepts() {
  const all = allDeptIds(deptTree)
  const allSelected = all.every(id => selectedDeptIds.value.has(id))
  selectedDeptIds.value = allSelected ? new Set() : new Set(all)
}
// 级联面板列数据（支持任意深度）
const deptCascadeColumns = computed<DeptNode[][]>(() => {
  const columns: DeptNode[][] = []
  // 第一列始终是根节点
  const root = deptTree[0]
  if (!root) return []
  columns.push(root.children ?? [])
  // 根据展开路径逐层生成后续列
  let currentChildren = root.children ?? []
  for (const pathId of deptExpandedPath.value) {
    const found = currentChildren.find(n => n.id === pathId)
    if (!found?.children?.length) break
    columns.push(found.children)
    currentChildren = found.children
  }
  return columns
})
// 悬停展开某节点（在指定列索引）
function hoverDeptColumn(nodeId: string, colIndex: number) {
  // 截断路径到当前列，然后追加当前节点
  deptExpandedPath.value = [...deptExpandedPath.value.slice(0, colIndex), nodeId]
}
function deptDisplayName(): string {
  if (selectedDeptIds.value.size === 0) return '选择部门'
  if (selectedDeptIds.value.size === allDeptIds(deptTree).length) return '选择部门'
  const names: string[] = []
  const walk = (nodes: DeptNode[]) => nodes.forEach(n => {
    if (selectedDeptIds.value.has(n.id)) names.push(n.name)
    if (n.children) walk(n.children)
  })
  walk(deptTree)
  return names.length > 2 ? `${names[0]} 等 ${names.length} 个部门` : names.join('、')
}

const filteredDeptTree = computed(() => {
  const q = deptSearchQuery.value.trim().toLowerCase()
  if (!q) return deptTree
  const match = (nodes: DeptNode[]): DeptNode[] =>
    nodes.reduce<DeptNode[]>((acc, n) => {
      const childMatch = n.children ? match(n.children) : []
      const nameMatch = n.name.toLowerCase().includes(q)
      if (nameMatch || childMatch.length) {
        acc.push({ ...n, children: childMatch.length ? childMatch : n.children })
      }
      return acc
    }, [])
  return match(deptTree)
})

const startDate = ref('2026-09-01')
const endDate = ref('2026-09-16')
const peopleQuery = ref('')
const appliedUsage = ref({ start: startDate.value, end: endDate.value, person: '', module: '' })

// 模块级联数据（两级，单选）
const moduleCascade = [
  { id: 'mc-agent', name: '智能体对话', children: [
    { id: 'mc-agent-data', name: '数据分析师' },
    { id: 'mc-agent-top', name: 'TOP款分析师' },
    { id: 'mc-agent-assort', name: '组货专家' },
  ]},
  { id: 'mc-knowledge', name: '知识中心', children: [
    { id: 'mc-knowledge-xiaozhi', name: '小智问答' },
  ]},
  { id: 'mc-workbench', name: '工作台', children: [
    { id: 'mc-workbench-todo', name: '待办提取' },
  ]},
]
const moduleOpen = ref(false)
const selectedModuleId = ref('')
const moduleExpandedPath = ref<string[]>([])  // 级联面板展开路径
function moduleDisplayName(): string {
  if (!selectedModuleId.value) return '选择模块'
  const findName = (nodes: { id: string; name: string; children?: { id: string; name: string }[] }[]): string => {
    for (const g of nodes) {
      if (g.id === selectedModuleId.value) return g.name
      if ('children' in g && g.children) {
        const child = g.children.find(c => c.id === selectedModuleId.value)
        if (child) return `${g.name} - ${child.name}`
      }
    }
    return '全部模块'
  }
  return findName(moduleCascade as any)
}
function selectModule(id: string) {
  selectedModuleId.value = selectedModuleId.value === id ? '' : id
  moduleOpen.value = false
}
// 模块级联面板列数据
const moduleCascadeColumns = computed(() => {
  const columns: { id: string; name: string; children?: { id: string; name: string }[] }[][] = []
  columns.push(moduleCascade)
  let current = moduleCascade
  for (const pathId of moduleExpandedPath.value) {
    const found = current.find(g => g.id === pathId)
    if (!found?.children?.length) break
    columns.push(found.children as any)
    current = found.children as any
  }
  return columns
})
function hoverModuleColumn(nodeId: string, colIndex: number) {
  moduleExpandedPath.value = [...moduleExpandedPath.value.slice(0, colIndex), nodeId]
}

// 人员筛选列表
const allPersons = computed(() => flattenPersons(adminTree).map(p => ({ id: p.id, name: p.name })))
const personalPeriod = ref<'today' | '7d' | '30d' | 'custom'>('7d')
const quotaWarningOpen = ref(true)

const auditStart = ref('2026-09-01T00:00')
const auditEnd = ref('2026-09-16T23:59')
const actorQuery = ref('')
const auditModule = ref('')
const auditObjectQuery = ref('')
const auditAction = ref('')
const appliedAudit = ref({
  start: auditStart.value,
  end: auditEnd.value,
  actor: '',
  actorId: '',
  module: '',
  objectQuery: '',
  action: '',
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
    id: 'dept-479037415',
    type: 'department',
    name: '商品运营中心',
    subtitle: '4 人',
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
      {
        id: 'user-muxin', type: 'person', name: '刘洋（沐心）', subtitle: '商品企划',
        tokens: 45_200_000, calls: 32_100, coins: 89_400, amount: 4128.30,
        quota: 150_000, quotaRate: 62, quotaSource: '全局默认',
        children: [session('s-prod-0916', '秋冬企划分析', '专家模式', 'Qwen3 Max', 45_200_000, 32_100, 89_400, 4128.30, '2026-09-16 09:30')],
      },
      {
        id: 'user-ranqiu', type: 'person', name: '赵婷（染秋）', subtitle: '商品运营',
        tokens: 38_600_000, calls: 28_400, coins: 76_200, amount: 3512.80,
        quota: 120_000, quotaRate: 58, quotaSource: '全局默认',
        children: [session('s-prod-0915', '商品详情页优化', '日常办公', 'Qwen3 Plus', 38_600_000, 28_400, 76_200, 3512.80, '2026-09-15 14:20')],
      },
      {
        id: 'user-chunyuan', type: 'person', name: '孙鹏（淳远）', subtitle: '商品数据分析',
        tokens: 22_100_000, calls: 16_800, coins: 43_600, amount: 2016.50,
        quota: 100_000, quotaRate: 40, quotaSource: '全局默认',
        children: [session('s-prod-0914', '销售趋势分析', '日常办公', 'Qwen3 Plus', 22_100_000, 16_800, 43_600, 2016.50, '2026-09-14 11:00')],
      },
    ],
  },
  {
    id: 'dept-137375891',
    type: 'department',
    name: '天马运动平台部',
    subtitle: '4 人',
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
      {
        id: 'user-lanxin', type: 'person', name: '周琳（蓝心）', subtitle: '天猫店长',
        tokens: 52_300_000, calls: 48_200, coins: 103_600, amount: 4786.40,
        quota: 160_000, quotaRate: 78, quotaSource: '个人设置',
        children: [session('s-online-0916', '天猫活动策划', '专家模式', 'DeepSeek R1', 52_300_000, 48_200, 103_600, 4786.40, '2026-09-16 13:15')],
      },
      {
        id: 'user-fenglai', type: 'person', name: '吴磊（枫来）', subtitle: '抖音运营',
        tokens: 41_800_000, calls: 39_600, coins: 82_800, amount: 3818.60,
        quota: 140_000, quotaRate: 68, quotaSource: '全局默认',
        children: [session('s-online-0915', '短视频脚本生成', '日常办公', 'Qwen3 Max', 41_800_000, 39_600, 82_800, 3818.60, '2026-09-15 16:40')],
      },
      {
        id: 'user-yingshi', type: 'person', name: '郑欣（映时）', subtitle: '店铺数据分析',
        tokens: 28_500_000, calls: 26_100, coins: 56_400, amount: 2604.20,
        quota: 100_000, quotaRate: 52, quotaSource: '全局默认',
        children: [session('s-online-0914', '店铺流量分析', '日常办公', 'Qwen3 Plus', 28_500_000, 26_100, 56_400, 2604.20, '2026-09-14 10:20')],
      },
    ],
  },
  {
    id: 'dept-997606961',
    type: 'department',
    name: '品牌中心',
    subtitle: '3 人',
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
      {
        id: 'user-hanyi', type: 'person', name: '黄莉（涵意）', subtitle: '品牌经理',
        tokens: 35_400_000, calls: 26_800, coins: 70_200, amount: 3240.60,
        quota: 120_000, quotaRate: 55, quotaSource: '全局默认',
        children: [session('s-mkt-0916', '品牌故事撰写', '日常办公', 'Qwen3 Max', 35_400_000, 26_800, 70_200, 3240.60, '2026-09-16 11:30')],
      },
      {
        id: 'user-qianyu', type: 'person', name: '林峰（千语）', subtitle: '数字营销',
        tokens: 19_800_000, calls: 15_200, coins: 39_200, amount: 1808.40,
        quota: 80_000, quotaRate: 45, quotaSource: '全局默认',
        children: [session('s-mkt-0915', '投放效果分析', '日常办公', 'Qwen3 Plus', 19_800_000, 15_200, 39_200, 1808.40, '2026-09-15 09:50')],
      },
    ],
  },
  {
    id: 'dept-137517219',
    type: 'department',
    name: '数字技术中心',
    subtitle: '3 人',
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
      {
        id: 'user-mochen', type: 'person', name: '何芳（墨尘）', subtitle: '采购专员',
        tokens: 28_600_000, calls: 22_400, coins: 56_800, amount: 2618.90,
        quota: 100_000, quotaRate: 52, quotaSource: '全局默认',
        children: [session('s-supply-0916', '供应商比价分析', '专家模式', 'DeepSeek R1', 28_600_000, 22_400, 56_800, 2618.90, '2026-09-16 14:50')],
      },
      {
        id: 'user-zhiqiu', type: 'person', name: '徐强（知秋）', subtitle: '物流调度',
        tokens: 18_200_000, calls: 14_600, coins: 36_000, amount: 1660.30,
        quota: 80_000, quotaRate: 38, quotaSource: '全局默认',
        children: [session('s-supply-0915', '配送路线优化', '日常办公', 'Qwen3 Plus', 18_200_000, 14_600, 36_000, 1660.30, '2026-09-15 15:10')],
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
    containsModule(node, filters.module)
  )
}

// 扁平人员列表（从 adminTree 提取所有 person 节点）
function flattenPersons(nodes: UsageNode[]): UsageNode[] {
  return nodes.flatMap(n =>
    n.type === 'person' ? [n] : flattenPersons(n.children ?? []),
  )
}

const flatPersonList = computed(() => {
  const persons = flattenPersons(adminTree)
  const query = peopleQuery.value.trim().toLowerCase()
  const deptIds = selectedDeptIds.value
  const allIds = allDeptIds(deptTree)
  const noDeptFilter = deptIds.size === 0 || deptIds.size === allIds.length
  return persons
    .filter(p => !query || p.name.toLowerCase().includes(query))
    .filter(p => {
      if (noDeptFilter) return true
      // 找到该人员所属的部门（通过 adminTree 反向查找）
      const findDept = (nodes: UsageNode[], parentDept?: string): string | null => {
        for (const n of nodes) {
          if (n.type === 'person' && n.id === p.id) return parentDept ?? null
          if (n.type === 'department' && n.children) {
            const found = findDept(n.children, n.id)
            if (found) return found
          }
        }
        return null
      }
      const deptId = findDept(adminTree)
      return deptId ? deptIds.has(deptId) : true
    })
    .sort((a, b) => b.amount - a.amount)
})

// 汇总行
const summaryRow = computed(() => {
  const persons = flatPersonList.value
  const totalAmount = persons.reduce((s, p) => s + p.amount, 0)
  const totalQuota = persons.reduce((s, p) => s + p.quota, 0)
  const totalTokens = persons.reduce((s, p) => s + p.tokens, 0)
  const remaining = Math.max(0, totalQuota - totalAmount)
  const rate = totalQuota ? (totalAmount / totalQuota) * 100 : 0
  return { amount: totalAmount, quota: totalQuota, tokens: totalTokens, remaining, rate }
})

// 用量分页
const usagePageSize = 10
const usagePage = ref(1)
const paginatedPersonList = computed(() => {
  const start = (usagePage.value - 1) * usagePageSize
  return flatPersonList.value.slice(start, start + usagePageSize)
})
const usageTotalPages = computed(() =>
  Math.max(1, Math.ceil(flatPersonList.value.length / usagePageSize)),
)
watch(flatPersonList, () => { usagePage.value = 1 })

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
          .filter(({ row, path }) => matchesFilters(row) && (!appliedUsage.value.module || path.includes(appliedUsage.value.module)))
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
      (!filters.module || path.includes(filters.module)))
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
const displayQuota = computed(() => (isAdmin.value ? summaryRow.value.quota : totals.value.quota))
const displayRate = computed(() =>
  isAdmin.value
    ? summaryRow.value.rate
    : personalRate.value,
)
const remainingQuota = computed(() => Math.max(0, displayQuota.value - totals.value.amount))
const metrics = computed(() => [
  {
    label: '人民币消耗',
    value: money(isAdmin.value ? summaryRow.value.amount : totals.value.amount),
    note: `${startDate.value} 至 ${endDate.value}`,
    icon: CircleDollarSign,
  },
  {
    label: '个人额度',
    value: money(displayQuota.value),
    note: `${isAdmin.value ? '' : `来源：${personalQuotaSource.value} · `}使用率 ${displayRate.value.toFixed(1)}%`,
    icon: Gauge,
  },
  {
    label: '剩余额度',
    value: money(isAdmin.value ? summaryRow.value.remaining : remainingQuota.value),
    note: quotaBand(displayRate.value),
    icon: ShieldCheck,
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
  appliedUsage.value = { start: startDate.value, end: endDate.value, person: peopleQuery.value, module: selectedModuleId.value }
  showFeedback(`查询已生效，当前展示 ${flatPersonList.value.length} 人`)
}
function resetUsageFilters() {
  startDate.value = '2026-09-01'
  endDate.value = '2026-09-30'
  peopleQuery.value = ''
  selectedDeptIds.value = new Set()
  selectedModuleId.value = ''
  appliedUsage.value = { start: startDate.value, end: endDate.value, person: '', module: '' }
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
    '时间,请求,模块,智能体,金额消耗',
    ...personalUsageRecords.map((row) =>
      [
        row.time,
        row.request,
        row.client,
        row.agent,
        row.amount,
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
function openPersonDetail(row: UsageNode) {
  selectedPersonDetail.value = row
}
const selectedPersonDetail = ref<UsageNode | null>(null)
const personRequests = computed(() => {
  if (!selectedPersonDetail.value) return []
  const person = selectedPersonDetail.value
  const sessions: UsageNode[] = []
  const collect = (nodes: UsageNode[]) => nodes.forEach(n => {
    if (n.type === 'session') sessions.push(n)
    if (n.children) collect(n.children)
  })
  collect(person.children ?? [])
  return sessions
})
// 额度分解（基本信息）
const personGlobalQuota = computed(() => {
  if (!selectedPersonDetail.value) return 0
  const p = selectedPersonDetail.value
  return p.quotaSource === '全局默认' ? p.quota : 100_000
})
const personUserQuota = computed(() => {
  if (!selectedPersonDetail.value) return 0
  const p = selectedPersonDetail.value
  return p.quotaSource === '个人设置' ? p.quota : 0
})
const personTempQuota = computed(() => {
  if (!selectedPersonDetail.value) return 0
  return Math.round(selectedPersonDetail.value.quota * 0.1)
})
// 消耗明细 token 分解
const personInputTokens = computed(() => selectedPersonDetail.value ? Math.round(selectedPersonDetail.value.tokens * 0.62) : 0)
const personOutputTokens = computed(() => selectedPersonDetail.value ? Math.round(selectedPersonDetail.value.tokens * 0.28) : 0)
const personCacheTokens = computed(() => selectedPersonDetail.value ? Math.round(selectedPersonDetail.value.tokens * 0.10) : 0)

const auditRecords: AuditRecord[] = [
  {
    id: '10001',
    bizType: '智能体',
    bizId: 'agent_top_001',
    bizName: 'TOP款分析师',
    operationType: 'UPDATE',
    operationDesc: '调整默认模型与可见范围',
    beforeContent: '{"defaultModel":"Qwen3 Max","visibility":"商品部"}',
    afterContent: '{"defaultModel":"DeepSeek R1","visibility":"商品部、线上店铺"}',
    source: '管理端',
    ip: '192.168.1.101',
    traceId: 'tr_9d21f8c2',
    createUserId: 'user-chaomu',
    createUser: '朝暮',
    createRealName: '张明',
    createTime: '2026-09-16 14:32:18',
  },
  {
    id: '10002',
    bizType: '知识库',
    bizId: 'kb_aw_2026',
    bizName: '秋冬商品知识库',
    operationType: 'CREATE',
    operationDesc: '创建部门共享知识库',
    beforeContent: '',
    afterContent: '{"name":"秋冬商品知识库","permission":"部门可见"}',
    source: '用户端',
    ip: '192.168.1.102',
    traceId: 'tr_46a0c19e',
    createUserId: 'user-qinghui',
    createUser: '清晖',
    createRealName: '李清',
    createTime: '2026-09-16 11:08:44',
  },
  {
    id: '10003',
    bizType: '模型',
    bizId: 'model_qwen3',
    bizName: 'Qwen3 企业主模型',
    operationType: 'UPDATE',
    operationDesc: '恢复模型服务状态',
    beforeContent: '{"status":"降级"}',
    afterContent: '{"status":"运行中"}',
    source: '系统任务',
    ip: '',
    traceId: 'tr_7bc8e410',
    createUserId: '0',
    createUser: '',
    createRealName: '系统任务',
    createTime: '2026-09-15 18:26:09',
  },
  {
    id: '10004',
    bizType: '技能',
    bizId: 'skill_report_old',
    bizName: '旧版报表导出工具',
    operationType: 'DELETE',
    operationDesc: '清理停用技能',
    beforeContent: '{"status":"已暂停"}',
    afterContent: '',
    source: '管理端',
    ip: '192.168.1.105',
    traceId: 'tr_1fb602a8',
    createUserId: 'user-bailu',
    createUser: '白露',
    createRealName: '王蕾',
    createTime: '2026-09-15 16:41:27',
  },
  {
    id: '10005',
    bizType: '知识文档',
    bizId: 'doc_seasonal_001',
    bizName: '秋冬商品上架指南',
    operationType: 'CREATE',
    operationDesc: '上传季节商品文档',
    beforeContent: '',
    afterContent: '{"name":"秋冬商品上架指南","format":"pdf"}',
    source: '用户端',
    ip: '192.168.1.108',
    traceId: 'tr_doc_001',
    createUserId: 'user-qinghui',
    createUser: '清晖',
    createRealName: '李清',
    createTime: '2026-09-15 10:22:00',
  },
  {
    id: '10006',
    bizType: '模型供应商',
    bizId: 'provider_deepseek',
    bizName: 'DeepSeek 供应商',
    operationType: 'UPDATE',
    operationDesc: '更新供应商 API 密钥',
    beforeContent: '{"apiKey":"***old***"}',
    afterContent: '{"apiKey":"***new***"}',
    source: '管理端',
    ip: '192.168.1.101',
    traceId: 'tr_provider_001',
    createUserId: 'user-chaomu',
    createUser: '朝暮',
    createRealName: '张明',
    createTime: '2026-09-14 16:05:33',
  },
  {
    id: '10007', bizType: '连接器', bizId: 'conn_dingtalk_01', bizName: '钉钉消息连接器',
    operationType: 'CREATE', operationDesc: '新增钉钉消息推送连接器',
    beforeContent: '', afterContent: '{"name":"钉钉消息连接器","type":"dingtalk"}',
    source: '管理端', ip: '192.168.1.101', traceId: 'tr_conn_001',
    createUserId: 'user-chaomu', createUser: '朝暮', createRealName: '张明',
    createTime: '2026-09-14 11:20:15',
  },
  {
    id: '10008', bizType: '智能体', bizId: 'agent_data_002', bizName: '数据分析师',
    operationType: 'UPDATE', operationDesc: '更新智能体提示词',
    beforeContent: '{"prompt":"v1.2"}', afterContent: '{"prompt":"v1.3"}',
    source: '管理端', ip: '192.168.1.101', traceId: 'tr_agent_002',
    createUserId: 'user-chaomu', createUser: '朝暮', createRealName: '张明',
    createTime: '2026-09-13 17:45:02',
  },
  {
    id: '10009', bizType: '知识文件夹', bizId: 'folder_fw_001', bizName: '秋冬商品资料',
    operationType: 'CREATE', operationDesc: '创建知识文件夹',
    beforeContent: '', afterContent: '{"name":"秋冬商品资料","parent":"根目录"}',
    source: '用户端', ip: '192.168.1.108', traceId: 'tr_folder_001',
    createUserId: 'user-qinghui', createUser: '清晖', createRealName: '李清',
    createTime: '2026-09-13 14:30:00',
  },
  {
    id: '10010', bizType: '模型', bizId: 'model_deepseek', bizName: 'DeepSeek R1',
    operationType: 'UPDATE', operationDesc: '调整模型并发上限',
    beforeContent: '{"maxConcurrency":10}', afterContent: '{"maxConcurrency":20}',
    source: '系统任务', ip: '', traceId: 'tr_model_003',
    createUserId: '0', createUser: '', createRealName: '系统任务',
    createTime: '2026-09-13 09:00:00',
  },
  {
    id: '10011', bizType: '技能', bizId: 'skill_review_01', bizName: '经营复盘技能',
    operationType: 'CREATE', operationDesc: '发布经营复盘技能',
    beforeContent: '', afterContent: '{"name":"经营复盘技能","agent":"数据分析师"}',
    source: '管理端', ip: '192.168.1.105', traceId: 'tr_skill_002',
    createUserId: 'user-bailu', createUser: '白露', createRealName: '王蕾',
    createTime: '2026-09-12 16:18:40',
  },
  {
    id: '10012', bizType: '知识库', bizId: 'kb_brand_2026', bizName: '品牌素材知识库',
    operationType: 'UPDATE', operationDesc: '更新知识库权限范围',
    beforeContent: '{"visibility":"市场营销部"}', afterContent: '{"visibility":"全公司"}',
    source: '管理端', ip: '192.168.1.105', traceId: 'tr_kb_002',
    createUserId: 'user-bailu', createUser: '白露', createRealName: '王蕾',
    createTime: '2026-09-12 11:05:22',
  },
  {
    id: '10013', bizType: '知识文档', bizId: 'doc_brand_v3', bizName: '品牌视觉规范 V3',
    operationType: 'CREATE', operationDesc: '上传品牌视觉规范文档',
    beforeContent: '', afterContent: '{"name":"品牌视觉规范 V3","format":"pdf","size":"12MB"}',
    source: '用户端', ip: '192.168.1.105', traceId: 'tr_doc_002',
    createUserId: 'user-bailu', createUser: '白露', createRealName: '王蕾',
    createTime: '2026-09-11 15:42:10',
  },
  {
    id: '10014', bizType: '智能体', bizId: 'agent_top_001', bizName: 'TOP款分析师',
    operationType: 'DELETE', operationDesc: '删除旧版 TOP 款分析师',
    beforeContent: '{"status":"已停用"}', afterContent: '',
    source: '管理端', ip: '192.168.1.101', traceId: 'tr_agent_del_001',
    createUserId: 'user-chaomu', createUser: '朝暮', createRealName: '张明',
    createTime: '2026-09-11 10:30:00',
  },
  {
    id: '10015', bizType: '模型供应商', bizId: 'provider_qwen', bizName: '通义千问供应商',
    operationType: 'UPDATE', operationDesc: '更新供应商额度配置',
    beforeContent: '{"monthlyLimit":500000}', afterContent: '{"monthlyLimit":800000}',
    source: '管理端', ip: '192.168.1.101', traceId: 'tr_prov_002',
    createUserId: 'user-chaomu', createUser: '朝暮', createRealName: '张明',
    createTime: '2026-09-10 14:22:18',
  },
  {
    id: '10016', bizType: '连接器', bizId: 'conn_erp_01', bizName: 'ERP库存连接器',
    operationType: 'UPDATE', operationDesc: '修复库存同步频率配置',
    beforeContent: '{"syncInterval":"6h"}', afterContent: '{"syncInterval":"1h"}',
    source: '管理端', ip: '192.168.1.102', traceId: 'tr_conn_002',
    createUserId: 'user-qinghui', createUser: '清晖', createRealName: '李清',
    createTime: '2026-09-10 09:55:30',
  },
  {
    id: '10017', bizType: '知识文档', bizId: 'doc_operation', bizName: '运营SOP手册',
    operationType: 'DELETE', operationDesc: '删除过期运营手册',
    beforeContent: '{"version":"v1"}', afterContent: '',
    source: '用户端', ip: '192.168.1.108', traceId: 'tr_doc_del_001',
    createUserId: 'user-qinghui', createUser: '清晖', createRealName: '李清',
    createTime: '2026-09-09 17:10:45',
  },
  {
    id: '10018', bizType: '模型', bizId: 'model_qwen3_plus', bizName: 'Qwen3 Plus',
    operationType: 'UPDATE', operationDesc: '开启模型缓存优化',
    beforeContent: '{"cacheEnabled":false}', afterContent: '{"cacheEnabled":true}',
    source: '系统任务', ip: '', traceId: 'tr_model_004',
    createUserId: '0', createUser: '', createRealName: '系统任务',
    createTime: '2026-09-09 08:00:00',
  },
  {
    id: '10019', bizType: '技能', bizId: 'skill_todo_ext', bizName: '待办提取技能',
    operationType: 'UPDATE', operationDesc: '优化待办提取规则',
    beforeContent: '{"rules":"v2"}', afterContent: '{"rules":"v3"}',
    source: '管理端', ip: '192.168.1.110', traceId: 'tr_skill_003',
    createUserId: 'user-ziyun', createUser: '子云', createRealName: '陈宇',
    createTime: '2026-09-08 16:33:12',
  },
  {
    id: '10020', bizType: '知识库', bizId: 'kb_supply', bizName: '供应链知识库',
    operationType: 'CREATE', operationDesc: '创建供应链专属知识库',
    beforeContent: '', afterContent: '{"name":"供应链知识库","permission":"供应链中心"}',
    source: '用户端', ip: '192.168.1.110', traceId: 'tr_kb_003',
    createUserId: 'user-ziyun', createUser: '子云', createRealName: '陈宇',
    createTime: '2026-09-08 10:15:00',
  },
]
const actorDirectory = [
  { id: 'user-chaomu', label: '张明（朝暮）', department: '商品部' },
  { id: 'user-qinghui', label: '李清（清晖）', department: '线上店铺' },
  { id: 'user-bailu', label: '王蕾（白露）', department: '市场营销部' },
  { id: 'user-ziyun', label: '陈宇（子云）', department: '供应链中心' },
  { id: '0', label: '系统任务', department: '系统' },
]
const operationTypeLabels: Record<string, string> = {
  CREATE: '新增',
  UPDATE: '修改',
  DELETE: '删除',
}
function actorDisplayName(record: AuditRecord): string {
  if (record.createUserId === '0') return '系统任务'
  return record.createRealName && record.createUser
    ? `${record.createRealName}（${record.createUser}）`
    : record.createUser || record.createRealName || record.createUserId
}
const filteredAuditRecords = computed(() =>
  auditRecords
    .filter((record) => {
      const f = appliedAudit.value
      const time = new Date(record.createTime.replace(' ', 'T')).getTime()
      const objQ = f.objectQuery.trim().toLowerCase()
      return (
        (!f.start || time >= new Date(f.start).getTime()) &&
        (!f.end || time <= new Date(f.end).getTime()) &&
        (!f.actorId || record.createUserId === f.actorId) &&
        (!f.module || record.bizType === f.module) &&
        (!f.action || record.operationType === f.action) &&
        (!objQ || record.bizName.toLowerCase().includes(objQ) || record.bizId.toLowerCase().includes(objQ))
      )
    })
    .sort((a, b) => b.createTime.localeCompare(a.createTime)),
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
    objectQuery: auditObjectQuery.value,
    action: auditAction.value,
  }
  showFeedback(`筛选已应用，共 ${filteredAuditRecords.value.length} 条记录`)
}
function resetAuditFilters() {
  auditStart.value = '2026-09-01T00:00'
  auditEnd.value = '2026-09-16T23:59'
  actorQuery.value = ''
  auditModule.value = ''
  auditObjectQuery.value = ''
  auditAction.value = ''
  applyAuditFilters()
}
function exportAudit() {
  downloadCsv('日志管理.csv', [
    '操作时间,操作人员,操作模块,操作对象,描述',
    ...filteredAuditRecords.value.map((r) =>
      [
        r.createTime,
        actorDisplayName(r),
        r.bizType,
        r.bizName,
        r.operationDesc,
      ].join(','),
    ),
  ])
  showFeedback(`已导出 ${filteredAuditRecords.value.length} 条日志记录`)
}

// 分页
const auditPageSize = 10
const auditPage = ref(1)
const paginatedAuditRecords = computed(() => {
  const start = (auditPage.value - 1) * auditPageSize
  return filteredAuditRecords.value.slice(start, start + auditPageSize)
})
const auditTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredAuditRecords.value.length / auditPageSize)),
)
watch(filteredAuditRecords, () => { auditPage.value = 1 })
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
            v-for="item in metrics.slice(0, 3)"
            :key="item.label"
            class="metric-card"
            :class="{
              danger: item.label === '个人额度' && displayRate >= 90,
              warning: item.label === '个人额度' && displayRate >= 80 && displayRate < 90,
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
                  <th>模块</th>
                  <th>智能体</th>
                  <th>金额消耗</th>
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
                  <td>{{ record.client }}</td>
                  <td>{{ record.agent }}</td>
                  <td>{{ money(record.amount) }}</td>
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
            <p>按部门筛选人员，一目了然查看每人消耗与额度，点击行查看请求明细</p>
            <p class="freshness-note">
              数据更新：请求完成后实时初算；次日重算前一日 Token 并回写人民币金额 · 最近更新
              2026-09-17 09:10
            </p>
          </div>
        </header>
        <section class="filter-panel" aria-label="用量筛选">
            <label
              ><span>开始日期</span
              ><input v-model="startDate" type="date" aria-label="开始日期" /></label
            ><label
              ><span>结束日期</span
              ><input v-model="endDate" type="date" aria-label="结束日期" /></label
            ><label
              ><span>人员</span
              ><input v-model="peopleQuery" list="usage-person-options" aria-label="人员" placeholder="输入本名或花名筛选" /><datalist id="usage-person-options"><option v-for="p in allPersons" :key="p.id" :value="p.name">{{ p.name }}</option></datalist></label
            ><label class="dept-field"
              ><span>部门</span>
              <div class="dept-select-wrap">
                <button type="button" class="dept-select-btn" @click="deptOpen = !deptOpen">
                  <span :class="{ placeholder: selectedDeptIds.size === 0 }">{{ deptDisplayName() }}</span>
                  <ChevronDown :size="14" :class="{ 'dept-rotate': deptOpen }" />
                </button>
                <div v-if="deptOpen" class="cascader-dropdown" @mousedown.stop>
                  <div class="cascader-header">
                    <input v-model="deptSearchQuery" placeholder="搜索部门" class="dept-search" />
                    <button type="button" class="dept-toggle-all" @click="toggleAllDepts">{{ selectedDeptIds.size === allDeptIds(deptTree).length ? '取消全选' : '全选' }}</button>
                  </div>
                  <div class="cascader-panels">
                    <div
                      v-for="(column, colIdx) in deptCascadeColumns"
                      :key="colIdx"
                      class="cascader-panel"
                    >
                      <button
                        v-for="node in column"
                        :key="node.id"
                        type="button"
                        class="cascader-item"
                        :class="{ active: deptExpandedPath[colIdx] === node.id, selected: isDeptSelected(node) !== 'none' }"
                        @mouseenter="node.children?.length ? hoverDeptColumn(node.id, colIdx) : undefined"
                      >
                        <label class="cascader-check" @click.stop>
                          <input type="checkbox" :checked="isDeptSelected(node) !== 'none'" :indeterminate="isDeptSelected(node) === 'partial'" @change="toggleDept(node)" />
                        </label>
                        <span class="cascader-name">{{ node.name }}</span>
                        <ChevronRight v-if="node.children?.length" :size="12" class="cascader-arrow" />
                      </button>
                    </div>
                  </div>
                </div>
              </div></label
            ><label class="dept-field"
              ><span>模块</span>
              <div class="dept-select-wrap">
                <button type="button" class="dept-select-btn" @click="moduleOpen = !moduleOpen">
                  <span :class="{ placeholder: !selectedModuleId }">{{ moduleDisplayName() }}</span>
                  <ChevronDown :size="14" :class="{ 'dept-rotate': moduleOpen }" />
                </button>
                <div v-if="moduleOpen" class="cascader-dropdown" @mousedown.stop>
                  <div class="cascader-panels">
                    <div
                      v-for="(column, colIdx) in moduleCascadeColumns"
                      :key="colIdx"
                      class="cascader-panel"
                    >
                      <button
                        v-for="item in (column as any[])"
                        :key="item.id"
                        type="button"
                        class="cascader-item"
                        :class="{ active: moduleExpandedPath[colIdx] === item.id, selected: selectedModuleId === item.id }"
                        @mouseenter="item.children?.length ? hoverModuleColumn(item.id, colIdx) : undefined"
                        @click="!item.children?.length ? selectModule(item.id) : undefined"
                      >
                        <span class="cascader-name">{{ item.name }}</span>
                        <ChevronRight v-if="item.children?.length" :size="12" class="cascader-arrow" />
                      </button>
                    </div>
                  </div>
                </div>
              </div></label
            ><div class="filter-actions"><button type="button" class="filter-reset" aria-label="清空用量筛选" @click="resetUsageFilters"><RotateCcw :size="14" />清空</button><button type="button" class="primary-button" aria-label="查询用量" @click="applyUsageFilters">查询</button></div>
        </section>
          <section class="panel detail-panel">
            <header>
              <div>
                <h2>组织用量明细</h2>
                <p>按人员汇总，点击行查看请求明细</p>
              </div>
              <div class="table-actions">
                <button type="button" aria-label="配置全局默认额度" @click="openGlobalQuota"><Settings2 :size="15" />全局默认额度</button>
                <button
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
              <table class="usage-flat">
                <thead>
                  <tr>
                    <th>人员</th>
                    <th>额度</th>
                    <th>消耗</th>
                    <th>使用率</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- 汇总行 -->
                  <tr class="summary-row">
                    <td><strong>汇总</strong></td>
                    <td><strong>{{ money(summaryRow.quota) }}</strong></td>
                    <td><strong>{{ money(summaryRow.amount) }}</strong></td>
                    <td>
                      <div class="quota-cell">
                        <span class="quota-track"><i :class="{ warning: summaryRow.rate >= 80, danger: summaryRow.rate >= 90 }" :style="{ width: `${Math.min(summaryRow.rate, 100)}%` }" /></span>
                        <b :class="['quota-rate', { 'quota-rate--warning': summaryRow.rate >= 80, 'quota-rate--danger': summaryRow.rate >= 90 }]">{{ summaryRow.rate.toFixed(0) }}%</b>
                      </div>
                    </td>
                    <td>—</td>
                  </tr>
                  <!-- 人员行 -->
                  <tr
                    v-for="person in paginatedPersonList"
                    :key="person.id"
                    class="person-row"
                  >
                    <td><strong>{{ person.name }}</strong><small v-if="person.subtitle">{{ person.subtitle }}</small></td>
                    <td><span>{{ person.quota ? money(person.quota) : '—' }}</span><small v-if="person.quotaSource" class="quota-source">{{ person.quotaSource }}</small></td>
                    <td>{{ money(person.amount) }}</td>
                    <td>
                      <div v-if="person.quota" class="quota-cell">
                        <span class="quota-track"><i :class="{ warning: person.quotaRate >= 80, danger: person.quotaRate >= 90 }" :style="{ width: `${Math.min(person.quotaRate, 100)}%` }" /></span>
                        <b :class="['quota-rate', { 'quota-rate--warning': person.quotaRate >= 80, 'quota-rate--danger': person.quotaRate >= 90 }]">{{ person.quotaRate.toFixed(0) }}%</b>
                      </div>
                      <span v-else>—</span>
                    </td>
                    <td class="row-actions">
                      <button type="button" @click.stop="openPersonDetail(person)">详情</button>
                      <button type="button" @click.stop="openPersonQuota(person)">设置</button>
                    </td>
                  </tr>
                  <tr v-if="!paginatedPersonList.length">
                    <td colspan="5" class="empty-cell">
                      当前条件下暂无数据
                      <button type="button" @click="resetUsageFilters">清空筛选</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="usageTotalPages > 1" class="pagination">
              <span class="pagination-info">共 {{ flatPersonList.length }} 人，第 {{ usagePage }} / {{ usageTotalPages }} 页</span>
              <div class="pagination-btns">
                <button type="button" :disabled="usagePage <= 1" @click="usagePage--">上一页</button>
                <button
                  v-for="p in usageTotalPages" :key="p" type="button"
                  :class="{ active: p === usagePage }"
                  @click="usagePage = p"
                >{{ p }}</button>
                <button type="button" :disabled="usagePage >= usageTotalPages" @click="usagePage++">下一页</button>
              </div>
            </div>
          </section>
      </template>

      <template v-else>
        <header class="page-head">
          <div>
            <span class="eyebrow">LOG MANAGEMENT</span>
            <h1>日志管理</h1>
            <p>查看新增、修改、删除操作的完整字段差异</p>
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
            ><input v-model="actorQuery" list="audit-actor-options" aria-label="操作人员" placeholder="输入本名或花名" /><datalist id="audit-actor-options"><option v-for="actor in actorDirectory" :key="actor.id" :value="actor.label">{{ actor.label }} · {{ actor.department }}</option></datalist></label
          ><label><span>操作模块</span><select v-model="auditModule" aria-label="操作模块" required><option value="" disabled>请选择模块</option><option value="智能体">智能体</option><option>连接器</option><option>技能</option><option>模型</option><option>模型供应商</option><option>知识库</option><option>知识文件夹</option><option>知识文档</option></select></label
          ><label
            ><span>操作对象</span
            ><input v-model="auditObjectQuery" aria-label="操作对象" placeholder="对象名称或 ID" /></label
          ><label
            ><span>操作类型</span
            ><select v-model="auditAction" aria-label="操作类型" required>
              <option value="" disabled>请选择类型</option>
              <option value="CREATE">新增</option>
              <option value="UPDATE">修改</option>
              <option value="DELETE">删除</option>
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
                  <th>时间</th>
                  <th>人员</th>
                  <th>模块</th>
                  <th>对象</th>
                  <th>描述</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="record in paginatedAuditRecords"
                  :key="record.id"
                  :data-testid="`audit-row-${record.id}`"
                  class="clickable"
                  tabindex="0"
                  @click="selectedAudit = record"
                  @keydown.enter="selectedAudit = record"
                >
                  <td>{{ record.createTime }}</td>
                  <td>{{ actorDisplayName(record) }}</td>
                  <td>{{ record.bizType }}</td>
                  <td>
                    <strong>{{ record.bizName }}</strong>
                  </td>
                  <td>{{ record.operationDesc }}</td>
                </tr>
                <tr v-if="!paginatedAuditRecords.length">
                  <td colspan="5" class="empty-cell">当前条件下暂无日志</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="auditTotalPages > 1" class="pagination">
            <span class="pagination-info">共 {{ filteredAuditRecords.length }} 条，第 {{ auditPage }} / {{ auditTotalPages }} 页</span>
            <div class="pagination-btns">
              <button type="button" :disabled="auditPage <= 1" @click="auditPage--">上一页</button>
              <button
                v-for="p in auditTotalPages" :key="p" type="button"
                :class="{ active: p === auditPage }"
                @click="auditPage = p"
              >{{ p }}</button>
              <button type="button" :disabled="auditPage >= auditTotalPages" @click="auditPage++">下一页</button>
            </div>
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
          :aria-label="quotaScope === '全局' ? '全局额度设置' : '用户额度设置'"
        >
          <header>
            <div>
              <span class="dialog-icon"><CircleDollarSign :size="18" /></span>
              <div>
                <strong>{{ quotaScope === '全局' ? '全局额度设置' : '用户额度设置' }}</strong>
                <p>{{ quotaScope === '全局' ? '调整每个用户每个月的默认额度' : `${quotaObject} · 2026 年 9 月` }}</p>
              </div>
            </div>
            <button type="button" aria-label="关闭" @click="quotaOpen = false">
              <X :size="18" />
            </button>
          </header>
          <div class="dialog-body quota-form">
            <!-- 全局额度模式 -->
            <template v-if="quotaScope === '全局'">
              <div class="quota-current">
                <span>全局额度</span>
                <strong>{{ money(globalQuotaDefaults['每月']) }}</strong>
                <small>（当前额度）</small>
              </div>
              <label class="full"
                ><span>变更额度（人民币）</span
                ><input v-model="quotaAmount" aria-label="变更额度" type="number" min="1" placeholder="变更后额度"
              /></label>
              <label class="full"
                ><span>调整原因</span
                ><textarea v-model="quotaReason" aria-label="调整原因" rows="3" placeholder="请填写调整原因" />
              </label>
              <p class="quota-hint full">全局额度调整每个用户每个月的默认额度，单位：人民币</p>
            </template>
            <!-- 用户额度模式 -->
            <template v-else>
              <div class="quota-current">
                <span>用户额度</span>
                <strong>{{ money(quotaTarget?.quota || 0) }}</strong>
                <small>（当前额度）</small>
              </div>
              <label
                ><span>额度类型</span
                ><select v-model="quotaType" aria-label="额度类型">
                  <option>默认</option>
                  <option>临时</option>
                </select></label
              >
              <label class="full"
                ><span>变更额度（人民币）</span
                ><input v-model="quotaAmount" aria-label="变更额度" type="number" min="1" placeholder="变更后额度"
              /></label>
              <label class="full"
                ><span>调整原因</span
                ><textarea v-model="quotaReason" aria-label="调整原因" rows="3" placeholder="请填写调整原因" />
              </label>
              <p class="quota-hint full">默认额度调整当前用户每个月的默认额度，及时生效，次月充值；临时额度调整当前用户当月的临时额度，及时生效，优先级 &gt; 默认额度，单位：人民币</p>
            </template>
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
              确认调整
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
                <strong>日志详情（{{ selectedAudit.id }}）</strong>
                <p>{{ actorDisplayName(selectedAudit) }} · {{ operationTypeLabels[selectedAudit.operationType] || selectedAudit.operationType }}</p>
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
                  <dd>{{ selectedAudit.createTime }}</dd>
                </div>
                <div>
                  <dt>操作人员</dt>
                  <dd>{{ actorDisplayName(selectedAudit) }}</dd>
                </div>
                <div>
                  <dt>操作模块</dt>
                  <dd>{{ selectedAudit.bizType }}</dd>
                </div>
                <div>
                  <dt>来源</dt>
                  <dd>{{ selectedAudit.source }}</dd>
                </div>
                <div>
                  <dt>IP 地址</dt>
                  <dd>{{ selectedAudit.ip || '—' }}</dd>
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
                  <dt>对象名称</dt>
                  <dd>{{ selectedAudit.bizName }}</dd>
                </div>
                <div>
                  <dt>对象 ID</dt>
                  <dd>
                    <code>{{ selectedAudit.bizId }}</code>
                  </dd>
                </div>
                <div>
                  <dt>操作类型</dt>
                  <dd>{{ operationTypeLabels[selectedAudit.operationType] || selectedAudit.operationType }}</dd>
                </div>
                <div>
                  <dt>描述</dt>
                  <dd>{{ selectedAudit.operationDesc }}</dd>
                </div>
              </dl>
            </section>
            <section>
              <h2>变更内容</h2>
              <div class="diff-grid">
                <article>
                  <span>变更前</span>
                  <pre>{{ selectedAudit.beforeContent || '（无）' }}</pre>
                </article>
                <article class="after">
                  <span>变更后</span>
                  <pre>{{ selectedAudit.afterContent || '（无）' }}</pre>
                </article>
              </div>
            </section>
          </div>
        </section>
      </div>
      <!-- 人员用量详情弹窗 -->
      <div v-if="selectedPersonDetail" class="modal-layer" @mousedown.self="selectedPersonDetail = null">
        <section
          class="person-detail-modal"
          role="dialog"
          aria-modal="true"
          :aria-label="`${selectedPersonDetail.name} 的用量详情`"
        >
          <header>
            <div>
              <span class="dialog-icon"><Users :size="18" /></span>
              <div>
                <strong>用量详情</strong>
                <p>{{ selectedPersonDetail.name }}</p>
              </div>
            </div>
            <button type="button" aria-label="关闭人员详情" @click="selectedPersonDetail = null">
              <X :size="18" />
            </button>
          </header>
          <div class="dialog-body audit-detail-body">
            <section>
              <h2>基本信息</h2>
              <dl>
                <div>
                  <dt>人员</dt>
                  <dd>{{ selectedPersonDetail.name }}</dd>
                </div>
                <div>
                  <dt>全局额度</dt>
                  <dd>{{ money(personGlobalQuota) }}</dd>
                </div>
                <div>
                  <dt>用户额度</dt>
                  <dd>{{ personUserQuota ? money(personUserQuota) : '—' }}</dd>
                </div>
                <div>
                  <dt>临时额度</dt>
                  <dd>{{ personTempQuota ? money(personTempQuota) : '—' }}</dd>
                </div>
              </dl>
            </section>
            <section>
              <h2>消耗明细</h2>
              <dl>
                <div>
                  <dt>金额消耗</dt>
                  <dd>{{ money(selectedPersonDetail.amount) }}</dd>
                </div>
                <div>
                  <dt>输入 Token</dt>
                  <dd>{{ compact(personInputTokens) }}</dd>
                </div>
                <div>
                  <dt>输出 Token</dt>
                  <dd>{{ compact(personOutputTokens) }}</dd>
                </div>
                <div>
                  <dt>缓存命中 Token</dt>
                  <dd>{{ compact(personCacheTokens) }}</dd>
                </div>
              </dl>
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
.filter-panel select:invalid,
.filter-panel select option[disabled] {
  color: #a1a1aa;
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
.quota-current {
  grid-column: 1 / -1;
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 12px 14px;
  background: #f8f9fb;
  border-radius: 8px;
  border: 1px solid #eee;
}
.quota-current span { font-size: 12px; color: #71717a; }
.quota-current strong { font-size: 18px; color: #18181b; }
.quota-current small { font-size: 11px; color: #a1a1aa; }
.quota-hint {
  font-size: 11px;
  color: #71717a;
  line-height: 1.5;
  margin: 0;
  padding: 8px 10px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #eee;
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
/* ── 部门级联多选下拉框 ── */
.dept-field { position: relative; }
.dept-select-wrap { position: relative; }
.dept-select-btn {
  display: flex; width: 100%; height: 34px; align-items: center; justify-content: space-between;
  gap: 6px; border: 1px solid #dedfe2; border-radius: 7px; background: #fff; padding: 0 9px;
  color: #27272a; font: 12px inherit; cursor: pointer; outline: none;
}
.dept-select-btn:focus { border-color: #71717a; box-shadow: 0 0 0 3px rgba(24,24,27,.07); }
.dept-select-btn span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dept-select-btn span.placeholder { color: #a1a1aa; }
.dept-rotate { transform: rotate(180deg); }
.dept-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; z-index: 40;
  width: 280px; border: 1px solid #e2e3e6; border-radius: 10px;
  background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,.12);
}
.dept-dropdown-header {
  display: flex; align-items: center; gap: 6px; padding: 8px 10px;
  border-bottom: 1px solid #eee;
}
.dept-search {
  flex: 1; height: 30px; border: 1px solid #dedfe2; border-radius: 6px;
  padding: 0 8px; font: 12px inherit; outline: none;
}
.dept-search:focus { border-color: #71717a; }
.dept-toggle-all {
  height: 30px; border: 1px solid #dedfe2; border-radius: 6px;
  background: #fff; padding: 0 10px; font: 11px inherit; cursor: pointer; white-space: nowrap;
}
.dept-toggle-all:hover { background: #f5f5f6; }
.dept-tree { max-height: 260px; overflow-y: auto; padding: 6px 0; }
.dept-item { padding: 0 10px; }
.dept-check {
  display: flex; align-items: center; gap: 7px; padding: 5px 4px;
  border-radius: 5px; cursor: pointer; font-size: 12px; color: #27272a;
}
.dept-check:hover { background: #f5f5f6; }
.dept-check input[type="checkbox"] { width: 15px; height: 15px; accent-color: #18181b; cursor: pointer; }
.dept-children { padding-left: 18px; }
.dept-child { }
.module-group-btn {
  background: none; border: none; width: 100%; text-align: left;
  font: inherit; color: inherit;
}
.module-group-btn.active { color: #18181b; font-weight: 600; background: #f0f4ff; }
/* ── 级联选择器面板 ── */
.cascader-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; z-index: 40;
  border: 1px solid #e2e3e6; border-radius: 10px;
  background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,.12);
}
.cascader-header {
  display: flex; align-items: center; gap: 6px; padding: 8px 10px;
  border-bottom: 1px solid #eee;
}
.cascader-panels {
  display: flex; max-height: 300px; overflow-x: auto;
}
.cascader-panel {
  flex: 0 0 auto; min-width: 160px; max-width: 200px;
  overflow-y: auto; padding: 4px 0;
  border-right: 1px solid #eee;
}
.cascader-panel:last-child { border-right: none; }
.cascader-item {
  display: flex; align-items: center; gap: 6px; width: 100%;
  padding: 7px 10px; border: none; background: none;
  font: 12px inherit; color: #27272a; cursor: pointer;
  text-align: left; transition: background .1s;
}
.cascader-item:hover { background: #f5f7ff; }
.cascader-item.active { background: #eef2ff; color: #18181b; font-weight: 500; }
.cascader-item.selected .cascader-name { font-weight: 600; }
.cascader-check { display: flex; align-items: center; }
.cascader-check input[type="checkbox"] { width: 14px; height: 14px; accent-color: #18181b; cursor: pointer; }
.cascader-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cascader-arrow { color: #a1a1aa; flex-shrink: 0; }
/* ── 平铺列表 ── */
.usage-flat { width: 100%; min-width: 900px; border-collapse: collapse; font-size: 12px; }
.usage-flat thead th {
  height: 42px; background: #fafafa; color: #71717a; font-weight: 500;
  text-align: left; white-space: nowrap; padding: 0 14px;
}
.usage-flat tbody td {
  height: 52px; border-top: 1px solid #ededee; color: #52525b;
  white-space: nowrap; padding: 0 14px; vertical-align: middle;
}
.usage-flat tbody td strong { font-size: 13px; }
.usage-flat tbody td small { display: block; color: #a1a1aa; font-size: 10px; margin-top: 2px; }
.summary-row td { background: #f8f9fb; border-bottom: 2px solid #e5e5e7; }
.person-row { cursor: pointer; transition: background .12s; }
.person-row:hover td { background: #f5f7ff; }
.person-row:focus { outline: none; }
.person-row:focus td { background: #f0f4ff; }
/* ── 人员用量详情弹窗 ── */
.person-detail-modal {
  width: min(560px, calc(100vw - 40px));
  max-height: calc(100vh - 70px);
  overflow: auto;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 22px 60px rgba(0,0,0,.22);
}
.audit-detail-body { padding: 0 20px 20px; }
.audit-detail-body section { margin-top: 16px; }
.audit-detail-body h2 { font-size: 13px; font-weight: 600; color: #3f3f46; margin: 0 0 10px; padding-bottom: 6px; border-bottom: 1px solid #eee; }
.audit-detail-body dl { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
.audit-detail-body dl > div { display: flex; flex-direction: column; gap: 2px; }
.audit-detail-body dt { font-size: 11px; color: #71717a; }
.audit-detail-body dd { font-size: 14px; font-weight: 600; color: #18181b; margin: 0; }
/* ── 分页 ── */
.pagination {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 12px 16px; border-top: 1px solid #eee;
}
.pagination-info { color: #71717a; font-size: 12px; white-space: nowrap; }
.pagination-btns { display: flex; gap: 4px; }
.pagination-btns button {
  height: 30px; min-width: 30px; border: 1px solid #dedfe2; border-radius: 6px;
  background: #fff; padding: 0 8px; font: 12px inherit; cursor: pointer; color: #3f3f46;
}
.pagination-btns button:hover:not(:disabled):not(.active) { background: #f5f5f6; }
.pagination-btns button.active {
  border-color: #18181b; background: #18181b; color: #fff; font-weight: 600;
}
.pagination-btns button:disabled { opacity: .4; cursor: not-allowed; }
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
