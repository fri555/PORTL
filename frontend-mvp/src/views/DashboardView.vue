<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  LayoutDashboard, TrendingUp, ShoppingCart, Truck, Megaphone, Cpu,
  User, Users, Plus, Download, Share2, ChevronRight, ChevronDown,
  GanttChartSquare, BarChart3, PieChart, X, Calendar, Filter,
  Sparkles, ChevronLeft, Zap, Brain, MessageCircle, Send, Loader2, Search,
  Building2, Globe, MapPin, Store, Package, Target, Eye, MousePointerClick,
  TrendingDown, AlertTriangle, CheckCircle, Clock, Wrench,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import OrganizationScopeDrawer from '@/components/common/OrganizationScopeDrawer.vue'
import { defaultOrganizationScopeId, findOrganizationScopeLabel } from '@/mock/organization'
import { cn } from '@/lib/utils'

// ---- sidebar tree ----
type TreeNode = {
  id: string
  label: string
  icon?: string
  children?: TreeNode[]
  category: 'official' | 'mine' | 'shared'
}

const officialTree: TreeNode[] = [
  {
    id: 'off_root', label: '官方看板', category: 'official',
    children: [
      { id: 'off_general', label: '经营总览', category: 'official' },
      { id: 'off_retail', label: '零售销售', category: 'official' },
      { id: 'off_supply', label: '供应链', category: 'official' },
      { id: 'off_mkt', label: '营销', category: 'official' },
      { id: 'off_ai', label: 'AI运营', category: 'official' },
    ],
  },
]

const mineTree: TreeNode[] = [
  { id: 'mine_root', label: '我的看板', category: 'mine' },
]

const sharedTree: TreeNode[] = [
  { id: 'shared_root', label: '共享看板', category: 'shared' },
]

let nextMineId = 1

interface MyDashboard {
  id: string; name: string; description: string; category: string;
  businessDomain: string; ownerName: string; charts: unknown[];
  createdAt: string; updatedAt: string; viewCount: number; isStarred: boolean;
}
const myDashboards = ref<MyDashboard[]>([
  { id: 'mine1', name: 'Q2营销活动ROI', description: '二季度各渠道营销活动效果对比', category: 'mine', businessDomain: '营销', ownerName: '王五', charts: [], createdAt: '2026-06-01', updatedAt: '2026-06-20', viewCount: 128, isStarred: true },
])

const expandedNodes = ref<Set<string>>(new Set(['off_root']))
const selectedNode = ref<string>('off_general')
const selectedOrganizationScope = ref(defaultOrganizationScopeId)
const selectedOrganizationLabel = computed(() => findOrganizationScopeLabel(selectedOrganizationScope.value))
const timeFilter = ref<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly')
const showCreateDialog = ref(false)
const assistantRailCollapsed = ref(false)
const mobileSidebarOpen = ref(false)

const newDashboardForm = ref({
  name: '',
  description: '',
  businessDomain: '零售销售',
})

function toggleNode(id: string) {
  if (expandedNodes.value.has(id)) {
    expandedNodes.value.delete(id)
  } else {
    expandedNodes.value.add(id)
  }
}

function selectNode(node: TreeNode) {
  selectedNode.value = node.id
  mobileSidebarOpen.value = false
  drillLevel.value = 0
  drillPath.value = []
  drillChannel.value = ''
  drillStore.value = ''
}

function selectMineNode(id: string) {
  selectedNode.value = id
  mobileSidebarOpen.value = false
  drillLevel.value = 0
  drillPath.value = []
  drillChannel.value = ''
  drillStore.value = ''
}

const selectedDashboardTitle = computed(() => {
  for (const n of officialTree[0].children ?? []) {
    if (n.id === selectedNode.value) return n.label
  }
  const mine = myDashboards.value.find((d) => d.id === selectedNode.value)
  if (mine) return mine.name
  return '经营指标'
})

type FocusMetric = {
  label: string
  value: string
  unit?: string
  yoy: string
  mom: string
  tone: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'slate'
  summary: string
  drill: ChartData[]
}

const metricToneClass: Record<FocusMetric['tone'], string> = {
  blue: 'from-[#eef5ff] to-white text-[#1769e0]',
  green: 'from-[#ecfdf5] to-white text-[#059669]',
  orange: 'from-[#fff7ed] to-white text-[#ea580c]',
  purple: 'from-[#f5f3ff] to-white text-[#7c3aed]',
  red: 'from-[#fef2f2] to-white text-[#dc2626]',
  slate: 'from-[#f8fafc] to-white text-[#334155]',
}

const organizationMetricSets: Record<string, FocusMetric[]> = {
  management: [
    { label: '集团 GMV', value: '12,850', unit: '万元', yoy: '+18.6%', mom: '+12.5%', tone: 'blue', summary: 'C端电商和B端团购共同拉动，本月活动期订单集中释放。', drill: [{ label: 'C端线上', value: 6850 }, { label: 'B端平台', value: 3920 }, { label: '线下/加盟', value: 2080 }] },
    { label: '净利润', value: '2,340', unit: '万元', yoy: '+9.2%', mom: '+8.3%', tone: 'green', summary: '毛利率改善来自供应链议价和高毛利鞋服配占比提升。', drill: [{ label: '鞋类', value: 1320 }, { label: '服饰', value: 620 }, { label: '配件', value: 400 }] },
    { label: '总订单', value: '48.6', unit: '万单', yoy: '+21.4%', mom: '+15.2%', tone: 'orange', summary: '淘天、京东、抖音活动订单增长明显，仓储履约压力上升。', drill: [{ label: '淘天', value: 18.5 }, { label: '京东', value: 11.2 }, { label: '抖音', value: 9.8 }, { label: 'B端', value: 9.1 }] },
    { label: '库存周转', value: '28', unit: '天', yoy: '-4天', mom: '-3天', tone: 'purple', summary: '核心畅销款周转改善，但部分尺码仍有断码风险。', drill: [{ label: '跑鞋', value: 22 }, { label: '户外鞋', value: 31 }, { label: '服装', value: 35 }] },
    { label: '履约及时率', value: '96.8', unit: '%', yoy: '+1.9pct', mom: '+0.8pct', tone: 'green', summary: '云仓波次优化后整体准时率提升，活动峰值仍需提前排班。', drill: [{ label: '华东仓', value: 97 }, { label: '华南仓', value: 96 }, { label: '华北仓', value: 94 }] },
    { label: '售后率', value: '4.2', unit: '%', yoy: '-0.6pct', mom: '-0.3pct', tone: 'slate', summary: '尺码问题仍是主要售后原因，跑鞋品类需加强尺码推荐。', drill: [{ label: '尺码', value: 42 }, { label: '质量', value: 18 }, { label: '物流', value: 15 }, { label: '其他', value: 25 }] },
  ],
  'ye-sports': [
    { label: 'C端线上 GMV', value: '6,850', unit: '万元', yoy: '+22.8%', mom: '+14.6%', tone: 'blue', summary: '幸运叶子、添柏岚、安德玛多平台促销拉动。', drill: [{ label: '幸运叶子', value: 3120 }, { label: '添柏岚', value: 1460 }, { label: '安德玛', value: 1280 }, { label: '茵特', value: 990 }] },
    { label: '多平台订单', value: '31.8', unit: '万单', yoy: '+26.1%', mom: '+17.5%', tone: 'orange', summary: '淘天仍是主力，抖音直播贡献增量最快。', drill: [{ label: '淘天', value: 13.2 }, { label: '京东', value: 7.6 }, { label: '抖音', value: 8.1 }, { label: '得物', value: 2.9 }] },
    { label: '直播转化率', value: '5.8', unit: '%', yoy: '+1.2pct', mom: '+0.7pct', tone: 'purple', summary: '直播间跑鞋和户外鞋爆款组合表现稳定。', drill: [{ label: '跑鞋', value: 6.4 }, { label: '户外鞋', value: 5.9 }, { label: '训练服', value: 4.8 }] },
    { label: '缺货风险 SKU', value: '18', unit: '个', yoy: '-6', mom: '+4', tone: 'red', summary: '活动期热门尺码可售库存偏低，需要跨仓调拨。', drill: [{ label: '幸运叶子', value: 7 }, { label: '添柏岚', value: 5 }, { label: '安德玛', value: 4 }, { label: '茵特', value: 2 }] },
  ],
  'tianma-platform': [
    { label: 'B端成交额', value: '3,920', unit: '万元', yoy: '+16.9%', mom: '+9.4%', tone: 'blue', summary: '团购销售和KA客户补货需求同步增长。', drill: [{ label: '团购销售', value: 1680 }, { label: 'KA事业部', value: 1220 }, { label: '平台销售', value: 1020 }] },
    { label: '活跃客户', value: '1,286', unit: '家', yoy: '+11.3%', mom: '+4.2%', tone: 'green', summary: '平台活跃客户保持增长，重点客户复购率提升。', drill: [{ label: 'KA客户', value: 286 }, { label: '团购客户', value: 520 }, { label: '加盟/渠道', value: 480 }] },
    { label: '补货需求', value: '438', unit: '条', yoy: '+19.8%', mom: '+12.1%', tone: 'orange', summary: '跑鞋、篮球鞋和团购服饰补货需求较集中。', drill: [{ label: '跑鞋', value: 146 }, { label: '篮球鞋', value: 118 }, { label: '团购服饰', value: 96 }, { label: '配件', value: 78 }] },
    { label: '货源满足率', value: '93.5', unit: '%', yoy: '+2.4pct', mom: '+1.1pct', tone: 'purple', summary: '货源响应有所改善，但大促款仍需提前锁货。', drill: [{ label: '现货', value: 68 }, { label: '预售', value: 18 }, { label: '缺口', value: 7 }] },
  ],
  warehouse: [
    { label: '当日出库单量', value: '8.6', unit: '万单', yoy: '+24.2%', mom: '+18.1%', tone: 'blue', summary: 'C端大促订单集中出库，波次压力偏高。', drill: [{ label: 'B2C', value: 5.8 }, { label: 'B2B', value: 1.9 }, { label: '代运营', value: 0.9 }] },
    { label: '发货及时率', value: '96.8', unit: '%', yoy: '+1.9pct', mom: '+0.8pct', tone: 'green', summary: '整体及时率健康，晚间波次仍需加班保障。', drill: [{ label: '上午波次', value: 98 }, { label: '下午波次', value: 96 }, { label: '晚间波次', value: 93 }] },
    { label: '库存准确率', value: '99.1', unit: '%', yoy: '+0.4pct', mom: '+0.2pct', tone: 'purple', summary: '盘点差异收敛，主要差异来自跨仓调拨在途。', drill: [{ label: '华东仓', value: 99.3 }, { label: '云仓', value: 98.9 }, { label: '代运营仓', value: 98.7 }] },
    { label: '待处理售后', value: '1,428', unit: '件', yoy: '-8.6%', mom: '+3.2%', tone: 'red', summary: '活动售后略有抬头，尺码换货占比较高。', drill: [{ label: '换货', value: 620 }, { label: '退货', value: 540 }, { label: '质检', value: 268 }] },
  ],
  finance: [
    { label: '收入确认', value: '11,960', unit: '万元', yoy: '+15.4%', mom: '+8.7%', tone: 'blue', summary: '线上平台结算节奏稳定，B端回款略滞后。', drill: [{ label: '线上C端', value: 6820 }, { label: 'B端平台', value: 3460 }, { label: '线下/加盟', value: 1680 }] },
    { label: '毛利率', value: '39.1', unit: '%', yoy: '+1.5pct', mom: '+0.6pct', tone: 'green', summary: '高毛利户外鞋服配占比提升。', drill: [{ label: '鞋类', value: 41 }, { label: '服饰', value: 36 }, { label: '配件', value: 44 }] },
    { label: '费用率', value: '21.3', unit: '%', yoy: '-0.8pct', mom: '-0.4pct', tone: 'purple', summary: '投放费用效率改善，仓配成本略升。', drill: [{ label: '营销', value: 11 }, { label: '仓配', value: 6 }, { label: '人工', value: 4 }] },
    { label: '回款完成率', value: '94.6', unit: '%', yoy: '+2.1pct', mom: '+1.0pct', tone: 'orange', summary: 'KA客户回款需持续跟进。', drill: [{ label: 'C端平台', value: 98 }, { label: 'B端客户', value: 91 }, { label: '加盟', value: 93 }] },
  ],
  hr: [
    { label: '人效产出', value: '18.6', unit: '万元/人', yoy: '+7.2%', mom: '+3.4%', tone: 'blue', summary: '线上销售与仓储协同效率提升。', drill: [{ label: '线上', value: 22 }, { label: 'B端', value: 18 }, { label: '仓储', value: 15 }] },
    { label: '在招岗位', value: '42', unit: '个', yoy: '+6', mom: '+3', tone: 'orange', summary: '直播运营、数据分析和仓储管理岗位需求集中。', drill: [{ label: '直播运营', value: 12 }, { label: '数据分析', value: 8 }, { label: '仓储', value: 10 }, { label: '销售', value: 12 }] },
    { label: '培训完成率', value: '86.5', unit: '%', yoy: '+9.1pct', mom: '+4.6pct', tone: 'green', summary: 'AI工具培训覆盖率提升。', drill: [{ label: 'COE', value: 92 }, { label: 'SSC', value: 88 }, { label: 'HRBP', value: 82 }] },
    { label: '关键岗位稳定率', value: '97.2', unit: '%', yoy: '+1.1pct', mom: '+0.5pct', tone: 'purple', summary: '核心业务岗位整体稳定。', drill: [{ label: '管理岗', value: 98 }, { label: '运营岗', value: 96 }, { label: '仓储岗', value: 95 }] },
  ],
  brand: [
    { label: '内容曝光', value: '1,286', unit: '万次', yoy: '+31.5%', mom: '+18.9%', tone: 'blue', summary: '户外鞋服场景内容和短视频素材表现较好。', drill: [{ label: '短视频', value: 720 }, { label: '图文', value: 286 }, { label: '直播切片', value: 280 }] },
    { label: '品牌搜索指数', value: '118', unit: '', yoy: '+12.4%', mom: '+6.8%', tone: 'green', summary: '幸运叶子和添柏岚相关搜索增长明显。', drill: [{ label: '幸运叶子', value: 48 }, { label: '添柏岚', value: 32 }, { label: '安德玛', value: 24 }, { label: '茵特', value: 14 }] },
    { label: '素材复用率', value: '64.2', unit: '%', yoy: '+8.8pct', mom: '+3.5pct', tone: 'purple', summary: '内容中心沉淀后，活动素材复用效率提升。', drill: [{ label: '商品图', value: 42 }, { label: '活动KV', value: 18 }, { label: '短视频', value: 4 }] },
    { label: '活动转化贡献', value: '1,420', unit: '万元', yoy: '+20.2%', mom: '+10.6%', tone: 'orange', summary: '品牌内容对大促转化贡献提升。', drill: [{ label: '淘天', value: 620 }, { label: '抖音', value: 520 }, { label: '京东', value: 280 }] },
  ],
}

function metricSetKey(scopeId: string) {
  if (scopeId === 'management') return 'management'
  if (scopeId === 'ye-sports' || ['dewu', 'b2c-online', 'live', 'digital-marketing', 'online-sales-3', 'badminton'].includes(scopeId)) return 'ye-sports'
  if (scopeId === 'tianma-platform' || ['tt1', 'group-buying', 'ka', 'platform-sales', 'platform-sales-middle', 'platform-ops', 'sourcing'].includes(scopeId)) return 'tianma-platform'
  if (scopeId === 'ecommerce-park' || scopeId === 'warehouse') return 'warehouse'
  if (scopeId === 'finance-center' || ['finance-business', 'finance-accounting'].includes(scopeId)) return 'finance'
  if (scopeId === 'hr-center' || ['coe', 'ssc', 'hrbp'].includes(scopeId)) return 'hr'
  if (scopeId === 'brand-center' || ['brand', 'barrel'].includes(scopeId)) return 'brand'
  return 'management'
}

const currentMetrics = computed(() => organizationMetricSets[metricSetKey(selectedOrganizationScope.value)])
const metricScopeTitle = computed(() => `${selectedOrganizationLabel.value}重点指标`)

function openMetricDrill(metric: FocusMetric) {
  drillTitle.value = `${selectedOrganizationLabel.value} · ${metric.label}`
  drillTypeChart.value = 'bar'
  drillData.value = metric.drill
  showDrillModal.value = true
}

function handleCreateDashboard() {
  if (!newDashboardForm.value.name.trim()) return
  const id = `mine_${nextMineId++}`
  myDashboards.value.push({
    id, name: newDashboardForm.value.name, description: newDashboardForm.value.description,
    category: 'mine', businessDomain: newDashboardForm.value.businessDomain,
    ownerName: '当前用户', charts: [], createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(), viewCount: 0, isStarred: false,
  })
  selectedNode.value = id
  showCreateDialog.value = false
  newDashboardForm.value = { name: '', description: '', businessDomain: '零售销售' }
}

// ---- Multi-level drill-down ----
type DrillLevel = 0 | 1 | 2 | 3
const drillLevel = ref<DrillLevel>(0)
const drillPath = ref<{ label: string; key: string }[]>([])
const drillChannel = ref('')
const drillStore = ref('')

function drillInto(channel: string) {
  drillLevel.value = 1
  drillChannel.value = channel
  drillPath.value = [{ label: '销售总览', key: 'root' }, { label: getChannelLabel(channel), key: channel }]
}

function drillIntoStore(store: string) {
  drillLevel.value = 2
  drillStore.value = store
  drillPath.value = [{ label: '销售总览', key: 'root' }, { label: getChannelLabel(drillChannel.value), key: drillChannel.value }, { label: store, key: store }]
}

function goBackToLevel(level: number) {
  if (level <= 0) {
    drillLevel.value = 0
    drillChannel.value = ''
    drillStore.value = ''
    drillPath.value = []
  } else if (level === 1) {
    drillLevel.value = 1
    drillStore.value = ''
    drillPath.value = drillPath.value.slice(0, 2)
  } else if (level === 2) {
    drillLevel.value = 2
    drillPath.value = drillPath.value.slice(0, 3)
  }
}

function openQuickQuestion() {
  selectedNode.value = 'off_general'
  drillLevel.value = 0
  drillChannel.value = ''
  drillStore.value = ''
  aiAnalysisExpanded.value = true
  aiDeepAnalysisExpanded.value = false
  aiFollowUpQuestion.value = ''
  aiFollowUpAnswer.value = ''
}

function openQuickQuery() {
  openDrill('快捷查数', 'bar', [
    { label: '本月营收', value: 12850, color: '#f97316' },
    { label: '净利润', value: 2340, color: '#06b6d4' },
    { label: '订单量', value: 486000, color: '#8b5cf6' },
  ])
}

function openQuickBuild() {
  showCreateDialog.value = true
}

function openQuickAnalysis() {
  selectedNode.value = 'off_ai'
  drillLevel.value = 0
  drillChannel.value = ''
  drillStore.value = ''
  aiAnalysisExpanded.value = true
  aiDeepAnalysisExpanded.value = true
}

async function openQuickStrategy() {
  selectedNode.value = 'off_mkt'
  drillLevel.value = 0
  drillChannel.value = ''
  drillStore.value = ''
  aiAnalysisExpanded.value = true
  aiDeepAnalysisExpanded.value = false
  aiFollowUpQuestion.value = '给我一版本月经营策略建议'
  await askFollowUp()
}

function getChannelLabel(channel: string): string {
  const map: Record<string, string> = {
    tmall: '天猫', jd: '京东', douyin: '抖音', offline: '线下门店',
    online: '线上', wechat: '微信小程序', xiaohongshu: '小红书',
  }
  return map[channel] ?? channel
}

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(0)
  return String(n)
}

// ---- Category-specific data ----
// 经营总览
const generalKPIs = [
  { value: 12850, unit: '万元', change: 12.5, trend: 'up' as const, label: '总营收' },
  { value: 2340, unit: '万元', change: 8.3, trend: 'up' as const, label: '净利润' },
  { value: 486000, unit: '单', change: 15.2, trend: 'up' as const, label: '总订单' },
  { value: 264, unit: '元', change: -2.1, trend: 'down' as const, label: '客单价' },
]

const generalTrend = [
  { label: '1月', value: 10800 }, { label: '2月', value: 9500 }, { label: '3月', value: 11200 },
  { label: '4月', value: 12100 }, { label: '5月', value: 11800 }, { label: '6月', value: 12850 },
]

// 零售销售
const channels = [
  { key: 'tmall', label: '天猫', revenue: 3850, orders: 145000, growth: 8.5, color: '#f97316' },
  { key: 'jd', label: '京东', revenue: 2980, orders: 112000, growth: 5.2, color: '#ef4444' },
  { key: 'douyin', label: '抖音', revenue: 2540, orders: 98000, growth: 28.3, color: '#ec4899' },
  { key: 'offline', label: '线下门店', revenue: 3480, orders: 131000, growth: -3.1, color: '#8b5cf6' },
]

const regions = [
  { label: '华东', revenue: 4520, growth: 10.2 },
  { label: '华南', revenue: 3210, growth: 7.8 },
  { label: '华北', revenue: 2450, growth: 4.5 },
  { label: '西南', revenue: 1820, growth: 12.1 },
  { label: '华中', revenue: 1650, growth: 6.3 },
]

const storeRankings = [
  { name: '上海南京东路旗舰店', region: '华东', revenue: 520, growth: 12.5 },
  { name: '北京王府井店', region: '华北', revenue: 480, growth: 8.2 },
  { name: '广州天河城店', region: '华南', revenue: 435, growth: 15.1 },
  { name: '深圳万象城店', region: '华南', revenue: 412, growth: 6.8 },
  { name: '成都太古里店', region: '西南', revenue: 389, growth: 18.3 },
  { name: '杭州大厦店', region: '华东', revenue: 356, growth: 9.7 },
  { name: '南京德基广场店', region: '华东', revenue: 332, growth: 5.4 },
  { name: '武汉武广店', region: '华中', revenue: 298, growth: 11.2 },
]

const defaultSKUs = [
  { name: 'Air Max 270 男款跑步鞋', clicks: 12500, conversion: 4.8, returns: 3.2, revenue: 85 },
  { name: 'Ultra Boost 23 女款休闲鞋', clicks: 9800, conversion: 5.2, returns: 2.8, revenue: 72 },
  { name: 'ZoomX Vaporfly 竞速跑鞋', clicks: 6200, conversion: 3.5, returns: 1.5, revenue: 58 },
  { name: 'Classic Leather 复古板鞋', clicks: 8100, conversion: 6.1, returns: 4.5, revenue: 45 },
]

const storeSKUData: Record<string, { name: string; clicks: number; conversion: number; returns: number; revenue: number }[]> = {
  '上海南京东路旗舰店': [
    { name: 'Air Max 270 男款跑步鞋', clicks: 12500, conversion: 4.8, returns: 3.2, revenue: 85 },
    { name: 'Ultra Boost 23 女款休闲鞋', clicks: 9800, conversion: 5.2, returns: 2.8, revenue: 72 },
    { name: 'ZoomX Vaporfly 竞速跑鞋', clicks: 6200, conversion: 3.5, returns: 1.5, revenue: 58 },
    { name: 'Classic Leather 复古板鞋', clicks: 8100, conversion: 6.1, returns: 4.5, revenue: 45 },
  ],
  '北京王府井店': [
    { name: 'Dunk Low Retro 男款板鞋', clicks: 10800, conversion: 5.5, returns: 3.8, revenue: 78 },
    { name: 'Air Force 1 经典白', clicks: 14200, conversion: 7.2, returns: 2.1, revenue: 95 },
    { name: 'React Infinity 跑步鞋', clicks: 5600, conversion: 3.8, returns: 2.5, revenue: 62 },
    { name: 'Lifestyle Slip-On 懒人鞋', clicks: 4500, conversion: 4.2, returns: 5.5, revenue: 38 },
  ],
}

// 供应链
const supplyKPIs = [
  { value: 28, unit: '天', change: -3, trend: 'up' as const, label: '库存周转天数' },
  { value: 12, unit: '个', change: -5, trend: 'down' as const, label: '库存预警SKU' },
  { value: 94.5, unit: '%', change: 2.3, trend: 'up' as const, label: '订单满足率' },
  { value: 87, unit: '分', change: 4.2, trend: 'up' as const, label: '供应商评分' },
]

const supplierPerformance = [
  { name: '福建华丰鞋业', score: 92, onTime: 98.5, quality: 96, orders: 320 },
  { name: '广东协力纺织', score: 88, onTime: 95.2, quality: 92, orders: 280 },
  { name: '浙江新达科技', score: 85, onTime: 91.8, quality: 94, orders: 240 },
  { name: '江苏宏盛物流', score: 82, onTime: 89.5, quality: 90, orders: 310 },
  { name: '山东鲁泰包装', score: 80, onTime: 87.3, quality: 88, orders: 195 },
]

const stockAlerts = [
  { sku: 'Air Max 270 (42码)', warehouse: '华东仓', stock: 12, threshold: 50, severity: 'high' as const },
  { sku: 'Ultra Boost 23 (38码)', warehouse: '华南仓', stock: 25, threshold: 40, severity: 'medium' as const },
  { sku: 'Classic Leather (40码)', warehouse: '华北仓', stock: 8, threshold: 30, severity: 'high' as const },
  { sku: 'Dunk Low Retro (41码)', warehouse: '西南仓', stock: 35, threshold: 45, severity: 'medium' as const },
]

// 营销
const mktKPIs = [
  { value: 3.2, unit: '', change: 0.5, trend: 'up' as const, label: '营销ROI' },
  { value: 1250, unit: '万元', change: -8.2, trend: 'down' as const, label: '营销总花费' },
  { value: 4.8, unit: '%', change: 0.6, trend: 'up' as const, label: '整体转化率' },
  { value: 28500, unit: '人', change: 22.3, trend: 'up' as const, label: '新客获取' },
]

const campaigns = [
  { name: '618年中大促', roi: 4.5, spend: 380, revenue: 1710, conversion: 6.2 },
  { name: '抖音直播专场', roi: 3.8, spend: 220, revenue: 836, conversion: 5.5 },
  { name: '小红书种草季', roi: 2.9, spend: 180, revenue: 522, conversion: 3.8 },
  { name: '京东超级品牌日', roi: 3.5, spend: 250, revenue: 875, conversion: 5.1 },
  { name: '线下门店促销', roi: 2.1, spend: 220, revenue: 462, conversion: 2.8 },
]

const trafficSources = [
  { source: '抖音', visits: 285000, percentage: 32, conversion: 4.5 },
  { source: '淘宝/天猫', visits: 242000, percentage: 27, conversion: 5.8 },
  { source: '微信', visits: 158000, percentage: 18, conversion: 3.2 },
  { source: '京东', visits: 125000, percentage: 14, conversion: 5.2 },
  { source: '小红书', visits: 82000, percentage: 9, conversion: 3.9 },
]

// AI运营
const aiKPIs = [
  { value: 125800, unit: '次', change: 18.5, trend: 'up' as const, label: '月AI调用量' },
  { value: 68, unit: '%', change: 15, trend: 'up' as const, label: 'AI渗透率' },
  { value: 72.5, unit: '%', change: 8.3, trend: 'up' as const, label: '需求闭环率' },
  { value: 2.8, unit: '秒', change: -35, trend: 'down' as const, label: '平均响应时间' },
]

const deptAIPenetration = [
  { dept: '市场营销部', penetration: 92, usage: 28500, efficiency: 200 },
  { dept: '电商运营部', penetration: 85, usage: 24200, efficiency: 120 },
  { dept: '供应链部', penetration: 78, usage: 19500, efficiency: 65 },
  { dept: '客服部', penetration: 70, usage: 18200, efficiency: 55 },
  { dept: '法务部', penetration: 58, usage: 8500, efficiency: 80 },
  { dept: '财务部', penetration: 52, usage: 6200, efficiency: 45 },
  { dept: '人力资源部', penetration: 45, usage: 4800, efficiency: 30 },
  { dept: '零售运营部', penetration: 65, usage: 15800, efficiency: 40 },
]

const toolUsageRanking = [
  { name: 'AI对话助手', usage: 42500, growth: 28, category: '对话' },
  { name: 'AI数据分析', usage: 28500, growth: 35, category: '分析' },
  { name: 'AI商品图生成', usage: 18200, growth: 52, category: '图像' },
  { name: '竞品价格比对Skill', usage: 15500, growth: 18, category: '分析' },
  { name: '智能排班优化', usage: 11200, growth: 15, category: '运营' },
  { name: '库存预警分析', usage: 9900, growth: 22, category: '供应链' },
]

// ---- AI Analysis ----
const aiAnalysisExpanded = ref(false)
const aiDeepAnalysisExpanded = ref(false)
const aiFollowUpQuestion = ref('')
const aiFollowUpAnswer = ref('')
const aiGeneratingAnswer = ref(false)

const aiAnalysisContent = computed(() => {
  const id = selectedNode.value
  if (id === 'off_general' || drillLevel.value === 0) {
    if (drillLevel.value >= 1) {
      const ch = drillChannel.value
      return `${getChannelLabel(ch) || '全渠道'}本月表现优异。${ch === 'douyin' ? '抖音渠道增长28.3%，是增速最快的渠道。直播带货贡献了渠道60%的销售额，建议继续加大直播投入。' :
      ch === 'tmall' ? '天猫渠道仍是最大的销售渠道，贡献了30%的营收。搜索流量占比下降，推荐流量占比上升至45%，内容化策略效果显著。' :
      ch === 'offline' ? '线下门店渠道环比下降3.1%，但成都太古里店（+18.3%）和武汉武广店（+11.2%）表现突出。建议分析标杆门店经验并推广。' :
      '各渠道表现分化明显，线上渠道整体增长12%，线下渠道略有下滑。建议加强线上线下联动。'}`
    }
    return `本月总营收12,850万元，环比增长12.5%，主要增长来自抖音渠道（+28.3%）和华南区域（+7.8%）。净利润2,340万元，利润率18.2%，较上月提升0.8个百分点。\n\n但需关注：客单价环比下降2.1%，可能与促销活动力度加大有关。建议在保证销量的同时，优化产品组合提升客单价。`
  }
  if (id === 'off_retail' && (drillLevel.value as number) === 0) {
    return `零售销售整体表现稳健。线上渠道增长强劲，抖音渠道增长28.3%领跑。区域上看，华东仍是最大市场，西南增长潜力大（+12.1%）。线下门店面临压力（-3.1%），需要加快数字化转型。\n\n门店层面，标杆门店成都太古里（+18.3%）和广州天河城（+15.1%）增长突出，建议总结标杆经验进行推广。`
  }
  if (id === 'off_supply') {
    return `库存周转天数28天，较上月优化3天。但库存预警SKU仍有12个，主要集中在华东仓。供应商整体评分87分，福建华丰鞋业表现最优（92分）。\n\n建议：重点关注华东仓缺货预警的Air Max 270和Classic Leather两款SKU，考虑从华南仓调拨或加快供应商补货节奏。`
  }
  if (id === 'off_mkt') {
    return `本月营销ROI为3.2，较上月提升0.5。618年中大促贡献了最高的ROI（4.5），抖音直播专场紧随其后（3.8）。但线下门店促销ROI仅2.1，效率偏低。\n\n新客获取28,500人，环比增长22.3%，抖音和微信是最大的新客来源渠道。建议将更多预算向高ROI渠道倾斜，并优化线下促销方案。`
  }
  return `本月AI工具调用量125,800次，环比增长18.5%。市场营销部AI渗透率最高（92%），人力资源部最低（45%），差距明显。\n\n需求闭环率72.5%，仍有提升空间。建议：对低渗透率部门开展专项培训，同时分析已闭环需求的成功经验进行推广。`
})

const aiDepthAnalysisContent = computed(() => {
  if (selectedNode.value === 'off_general') {
    return `【深度分析】\n1. 营收增长驱动因素拆解：\n   - 量价分析：销量增长15.8%，均价下降2.1%，增长主要由销量驱动\n   - 渠道分析：抖音贡献了增长增量的42%，是最大增长引擎\n   - 品类分析：运动鞋品类增长最快（+22%），服装品类持平\n\n2. 利润分析：\n   - 毛利率从38.5%提升至39.1%，主要因供应链优化\n   - 营销费用占比从15.2%降至14.1%\n\n3. 风险提示：\n   - 客单价持续下降趋势需关注，建议Q3推出中高端新品\n   - 线下渠道降幅扩大，需评估门店结构调整方案`
  }
  return `【深度分析】\n1. 当前指标的核心驱动因素正在从"规模扩张"转向"效率优化"\n2. 对比行业基准，我方在数字化运营方面仍有15-20%的提升空间\n3. 建议Q3重点投入：AI赋能效率提升、高价值客户精细化运营、供应链响应速度优化\n4. 预计Q3整体指标将改善8-12%，前提是上述举措按时落地`
})

function toggleAIAnalysis() {
  aiAnalysisExpanded.value = !aiAnalysisExpanded.value
  if (!aiAnalysisExpanded.value) {
    aiDeepAnalysisExpanded.value = false
    aiFollowUpAnswer.value = ''
  }
}

async function askFollowUp() {
  if (!aiFollowUpQuestion.value.trim()) return
  aiGeneratingAnswer.value = true
  aiFollowUpAnswer.value = ''
  await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800))
  aiFollowUpAnswer.value = `针对"${aiFollowUpQuestion.value}"的分析：\n\n根据当前数据，建议从以下几个维度深入分析：\n1. 按时间维度对比近3个月趋势变化\n2. 按部门/渠道维度拆解具体贡献\n3. 参考行业基准数据判断当前表现水平\n\n如需更详细的专项分析，可通过AI生成看板功能创建定制化看板。`
  aiGeneratingAnswer.value = false
}

// ---- chart drill-down ----
type ChartData = { label: string; value: number; color?: string }

const showDrillModal = ref(false)
const drillTitle = ref('')
const drillData = ref<ChartData[]>([])
const drillTypeChart = ref<'bar' | 'line' | 'pie'>('bar')

function openDrill(title: string, type: 'bar' | 'line' | 'pie', data: ChartData[]) {
  drillTitle.value = title
  drillTypeChart.value = type
  drillData.value = data
  showDrillModal.value = true
}

function maxVal(data: ChartData[]) { return Math.max(...data.map((d) => d.value)) }
</script>

<template>
  <div class="relative flex h-[calc(100vh-4rem)] overflow-hidden">
    <OrganizationScopeDrawer v-model="selectedOrganizationScope" context-label="仪表盘组织口径" />
    <div class="min-w-0 flex-1 overflow-y-auto bg-zinc-50/50 p-4 md:p-6">
      <!-- Top Bar -->
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3 pl-24">
        <div class="min-w-0">
          <h1 class="truncate text-xl font-bold">{{ selectedDashboardTitle }}</h1>
          <p class="text-sm text-muted-foreground">组织口径：{{ selectedOrganizationLabel }} · 数据更新时间：2026-06-22 10:30</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex items-center rounded-lg border bg-white p-0.5">
            <button
              v-for="tf in (['daily','weekly','monthly','custom'] as const)"
              :key="tf"
              :class="cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                timeFilter === tf ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )"
              @click="timeFilter = tf"
            >
              {{ tf === 'daily' ? '日' : tf === 'weekly' ? '周' : tf === 'monthly' ? '月' : '自定义' }}
            </button>
          </div>
          <RouterLink :to="{ name: 'workspace-chat', query: { source: 'AI生成看板', prompt: '帮我基于当前组织口径生成一张经营看板' } }">
            <Button variant="outline" size="sm" class="gap-1.5">
              <Cpu class="h-3.5 w-3.5" /> AI生成看板
            </Button>
          </RouterLink>
          <Button variant="outline" size="sm" class="gap-1.5">
            <Download class="h-3.5 w-3.5" /> 导出
          </Button>
          <Button variant="outline" size="sm" class="gap-1.5">
            <Share2 class="h-3.5 w-3.5" /> 分享
          </Button>
        </div>
      </div>

      <!-- Breadcrumb for drill-down -->
      <div v-if="drillPath.length > 0" class="mb-4 flex items-center gap-1.5 text-sm">
        <button class="text-muted-foreground hover:text-primary transition-colors" @click="goBackToLevel(0)">首页</button>
        <template v-for="(item, idx) in drillPath" :key="item.key">
          <ChevronRight class="h-3.5 w-3.5 text-muted-foreground" />
          <button
            v-if="idx < drillPath.length - 1"
            class="text-muted-foreground hover:text-primary transition-colors"
            @click="goBackToLevel(idx + 1)"
          >
            {{ item.label }}
          </button>
          <span v-else class="font-medium text-foreground">{{ item.label }}</span>
        </template>
      </div>

      <section data-testid="dashboard-metric-wall" class="space-y-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="text-xs font-medium text-muted-foreground">当前组织口径</p>
            <h2 class="mt-1 text-2xl font-semibold tracking-tight text-[#111827]">{{ metricScopeTitle }}</h2>
          </div>
          <p class="text-xs text-muted-foreground">点击指标卡查看渠道、品类或部门拆解</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <button
            v-for="metric in currentMetrics"
            :key="metric.label"
            type="button"
            class="group min-h-44 rounded-[24px] border border-[#eaecf0] bg-gradient-to-br p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#d0d5dd] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111827]"
            :class="metricToneClass[metric.tone]"
            @click="openMetricDrill(metric)"
          >
            <div class="flex items-start justify-between gap-3">
              <span class="text-sm font-semibold text-[#344054]">{{ metric.label }}</span>
              <ChevronRight class="h-4 w-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-70" />
            </div>
            <div class="mt-6 flex items-end gap-1">
              <strong class="text-4xl font-semibold tracking-tight text-[#101828]">{{ metric.value }}</strong>
              <span v-if="metric.unit" class="mb-1 text-sm font-medium text-[#667085]">{{ metric.unit }}</span>
            </div>
            <div class="mt-4 flex gap-2 text-xs">
              <span class="rounded-full bg-white/70 px-2.5 py-1 font-semibold text-[#344054]">同比 {{ metric.yoy }}</span>
              <span class="rounded-full bg-white/70 px-2.5 py-1 font-semibold text-[#344054]">环比 {{ metric.mom }}</span>
            </div>
            <p class="mt-4 line-clamp-2 text-xs leading-5 text-[#667085]">{{ metric.summary }}</p>
          </button>
        </div>
      </section>

      <!-- ==================== 经营总览 ==================== -->
      <template v-if="false && selectedNode === 'off_general' && drillLevel === 0">
        <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="kpi in generalKPIs"
            :key="kpi.label"
            class="cursor-pointer rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            :class="kpi.label === '总营收' ? 'ring-1 ring-primary/20' : ''"
            @click="kpi.label === '总营收' ? drillInto('tmall') : null"
          >
            <p class="text-xs text-muted-foreground">{{ kpi.label }}</p>
            <p class="mt-1 text-2xl font-bold text-foreground">
              {{ kpi.value.toLocaleString() }}<span class="text-sm font-normal text-muted-foreground"> {{ kpi.unit }}</span>
            </p>
            <p
              :class="cn(
                'mt-1 text-xs',
                kpi.trend === 'up' ? (kpi.label === '客单价' ? 'text-red-500' : 'text-emerald-600') : (kpi.label === '客单价' ? 'text-emerald-600' : 'text-red-500'),
              )"
            >
              {{ kpi.change > 0 ? '+' : '' }}{{ kpi.change }}% 环比
            </p>
          </div>
        </div>

        <div class="mb-4 grid gap-4 lg:grid-cols-2">
          <div class="cursor-pointer rounded-xl border bg-white p-5 shadow-sm hover:shadow-md" @click="openDrill('月度营收趋势 (万元)', 'line', generalTrend)">
            <h3 class="mb-1 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp class="h-4 w-4 text-primary" /> 月度营收趋势
            </h3>
            <p class="mb-4 text-xs text-muted-foreground">2026年1-6月营收趋势</p>
            <svg viewBox="0 0 400 140" class="h-[140px] w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#f97316" stop-opacity="0.25" />
                  <stop offset="100%" stop-color="#f97316" stop-opacity="0.02" />
                </linearGradient>
              </defs>
              <polygon
                :points="`0,140 ${generalTrend.map((p, i) => `${(i / (generalTrend.length - 1)) * 400},${140 - (p.value / maxVal(generalTrend)) * 120}`).join(' ')} 400,140`"
                fill="url(#revenueGrad)"
              />
              <polyline
                :points="generalTrend.map((p, i) => `${(i / (generalTrend.length - 1)) * 400},${140 - (p.value / maxVal(generalTrend)) * 120}`).join(' ')"
                fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round"
              />
            </svg>
          </div>

          <div class="cursor-pointer rounded-xl border bg-white p-5 shadow-sm hover:shadow-md" @click="openDrill('利润构成', 'pie', [
            { label: '零售销售', value: 55, color: '#f97316' },
            { label: '电商平台', value: 30, color: '#06b6d4' },
            { label: '其他业务', value: 15, color: '#8b5cf6' },
          ])">
            <h3 class="mb-1 flex items-center gap-2 text-sm font-semibold">
              <PieChart class="h-4 w-4 text-purple-500" /> 利润构成
            </h3>
            <p class="mb-4 text-xs text-muted-foreground">各业务线利润占比</p>
            <div class="flex items-center gap-4">
              <div class="relative h-28 w-28 shrink-0">
                <svg viewBox="0 0 64 64" class="h-full w-full -rotate-90">
                  <circle cx="32" cy="32" r="24" fill="none" stroke="#f4f4f5" stroke-width="12" />
                  <circle cx="32" cy="32" r="24" fill="none" stroke="#f97316" stroke-width="12" stroke-dasharray="82.9 150.8" />
                  <circle cx="32" cy="32" r="24" fill="none" stroke="#06b6d4" stroke-width="12" stroke-dasharray="45.2 150.8" stroke-dashoffset="-82.9" />
                  <circle cx="32" cy="32" r="24" fill="none" stroke="#8b5cf6" stroke-width="12" stroke-dasharray="22.6 150.8" stroke-dashoffset="-128.1" />
                </svg>
              </div>
              <div class="space-y-1.5">
                <div class="flex items-center gap-2 text-xs"><span class="h-2.5 w-2.5 rounded-full bg-[#f97316]" /><span class="text-muted-foreground">零售销售</span><span class="ml-auto font-medium">55%</span></div>
                <div class="flex items-center gap-2 text-xs"><span class="h-2.5 w-2.5 rounded-full bg-[#06b6d4]" /><span class="text-muted-foreground">电商平台</span><span class="ml-auto font-medium">30%</span></div>
                <div class="flex items-center gap-2 text-xs"><span class="h-2.5 w-2.5 rounded-full bg-[#8b5cf6]" /><span class="text-muted-foreground">其他业务</span><span class="ml-auto font-medium">15%</span></div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ==================== 零售销售 (Level 0) ==================== -->
      <template v-if="false && selectedNode === 'off_retail' && drillLevel === 0">
        <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="ch in channels"
            :key="ch.key"
            class="cursor-pointer rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            @click="drillInto(ch.key)"
          >
            <div class="mb-1 flex items-center gap-2">
              <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: ch.color }" />
              <span class="text-sm font-semibold">{{ ch.label }}</span>
            </div>
            <p class="text-xl font-bold">{{ formatNum(ch.revenue) }}<span class="text-sm font-normal text-muted-foreground">万</span></p>
            <p class="text-xs text-muted-foreground">{{ formatNum(ch.orders) }}单</p>
            <p :class="cn('mt-1 text-xs', ch.growth >= 0 ? 'text-emerald-600' : 'text-red-500')">
              {{ ch.growth >= 0 ? '+' : '' }}{{ ch.growth }}% 环比
            </p>
          </div>
        </div>

        <div class="mb-4 grid gap-4 lg:grid-cols-2">
          <!-- Region Bar -->
          <div class="cursor-pointer rounded-xl border bg-white p-5 shadow-sm hover:shadow-md"
            @click="openDrill('各区域销售额 (万元)', 'bar', regions.map(r => ({ label: r.label, value: r.revenue, color: '#f97316' })))">
            <h3 class="mb-1 flex items-center gap-2 text-sm font-semibold">
              <MapPin class="h-4 w-4 text-primary" /> 区域销售对比
            </h3>
            <p class="mb-4 text-xs text-muted-foreground">本月各区域销售额及环比增长</p>
            <div class="space-y-3">
              <div v-for="r in regions" :key="r.label" class="flex items-center gap-3">
                <span class="w-10 text-xs text-muted-foreground shrink-0">{{ r.label }}</span>
                <div class="flex-1 h-5 rounded bg-zinc-100 overflow-hidden">
                  <div class="h-full rounded bg-gradient-to-r from-primary to-orange-400 transition-all" :style="{ width: `${(r.revenue / 4520) * 100}%` }" />
                </div>
                <span class="text-xs font-medium w-12 text-right">{{ formatNum(r.revenue) }}</span>
                <span :class="cn('text-xs w-12', r.growth >= 0 ? 'text-emerald-600' : 'text-red-500')">{{ r.growth >= 0 ? '+' : '' }}{{ r.growth }}%</span>
              </div>
            </div>
          </div>

          <!-- Store ranking -->
          <div class="rounded-xl border bg-white p-5 shadow-sm">
            <h3 class="mb-1 flex items-center gap-2 text-sm font-semibold">
              <Store class="h-4 w-4 text-primary" /> 门店销售排行 TOP8
            </h3>
            <p class="mb-3 text-xs text-muted-foreground">点击门店查看SKU明细</p>
            <div class="space-y-1.5">
              <div
                v-for="(store, idx) in storeRankings"
                :key="store.name"
                class="flex items-center gap-3 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-accent transition-colors"
                @click="drillIntoStore(store.name)"
              >
                <span :class="cn('w-5 text-center text-xs font-bold shrink-0', idx < 3 ? 'text-primary' : 'text-muted-foreground')">{{ idx + 1 }}</span>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium truncate">{{ store.name }}</p>
                  <p class="text-[10px] text-muted-foreground">{{ store.region }}</p>
                </div>
                <span class="text-xs font-medium">{{ store.revenue }}万</span>
                <span :class="cn('text-xs w-12 text-right', store.growth >= 0 ? 'text-emerald-600' : 'text-red-500')">{{ store.growth >= 0 ? '+' : '' }}{{ store.growth }}%</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ==================== 零售销售 - Channel Level (Level 1) ==================== -->
      <template v-if="false && selectedNode === 'off_retail' && drillLevel >= 1">
        <div class="mb-6 grid gap-4 sm:grid-cols-3">
          <div class="rounded-xl border bg-white p-4 shadow-sm"><p class="text-xs text-muted-foreground">渠道销售额</p><p class="mt-1 text-xl font-bold">{{ drillChannel === 'douyin' ? '2,540' : drillChannel === 'tmall' ? '3,850' : drillChannel === 'jd' ? '2,980' : '3,480' }}<span class="text-sm font-normal text-muted-foreground"> 万元</span></p></div>
          <div class="rounded-xl border bg-white p-4 shadow-sm"><p class="text-xs text-muted-foreground">订单量</p><p class="mt-1 text-xl font-bold">{{ drillChannel === 'douyin' ? '98,000' : drillChannel === 'tmall' ? '145,000' : drillChannel === 'jd' ? '112,000' : '131,000' }}<span class="text-sm font-normal text-muted-foreground"> 单</span></p></div>
          <div class="rounded-xl border bg-white p-4 shadow-sm"><p class="text-xs text-muted-foreground">环比增长</p><p class="mt-1 text-xl font-bold" :class="drillChannel === 'offline' ? 'text-red-500' : 'text-emerald-600'">{{ drillChannel === 'douyin' ? '+28.3' : drillChannel === 'tmall' ? '+8.5' : drillChannel === 'jd' ? '+5.2' : '-3.1' }}<span class="text-sm font-normal text-muted-foreground">%</span></p></div>
        </div>

        <!-- Store breakdown for channel -->
        <div v-if="drillLevel === 1" class="rounded-xl border bg-white p-5 shadow-sm">
          <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Store class="h-4 w-4 text-primary" /> {{ getChannelLabel(drillChannel) }} - 门店明细
          </h3>
          <p class="mb-3 text-xs text-muted-foreground">点击门店名进入SKU详情</p>
          <div class="space-y-1.5">
            <div
              v-for="(store, idx) in storeRankings.slice(0, 5)"
              :key="store.name"
              class="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-accent transition-colors"
              @click="drillIntoStore(store.name)"
            >
              <span class="w-5 text-center text-xs font-bold shrink-0 text-muted-foreground">{{ idx + 1 }}</span>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium truncate">{{ store.name }}</p>
                <p class="text-[10px] text-muted-foreground">{{ store.region }}</p>
              </div>
              <span class="text-sm font-medium">{{ store.revenue }}万</span>
              <ChevronRight class="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        <!-- Store Level (Level 2) -->
        <div v-if="drillLevel >= 2">
          <div class="mb-4 grid gap-4 sm:grid-cols-3">
            <div class="rounded-xl border bg-white p-4 shadow-sm"><p class="text-xs text-muted-foreground">门店月销售额</p><p class="mt-1 text-xl font-bold">{{ drillStore.includes('上海') ? '520' : drillStore.includes('北京') ? '480' : drillStore.includes('广州') ? '435' : '389' }}<span class="text-sm font-normal text-muted-foreground"> 万元</span></p></div>
            <div class="rounded-xl border bg-white p-4 shadow-sm"><p class="text-xs text-muted-foreground">门店月订单量</p><p class="mt-1 text-xl font-bold">{{ formatNum(drillStore.includes('上海') ? 19500 : drillStore.includes('北京') ? 18200 : 15800) }}<span class="text-sm font-normal text-muted-foreground"> 单</span></p></div>
            <div class="rounded-xl border bg-white p-4 shadow-sm"><p class="text-xs text-muted-foreground">转化率</p><p class="mt-1 text-xl font-bold text-emerald-600">5.2<span class="text-sm font-normal text-muted-foreground">%</span></p></div>
          </div>

          <!-- SKU detail table -->
          <div class="rounded-xl border bg-white p-5 shadow-sm">
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Package class="h-4 w-4 text-primary" /> SKU明细
            </h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b text-left text-muted-foreground">
                    <th class="py-2 font-medium text-xs">商品名称</th>
                    <th class="py-2 text-right font-medium text-xs">访客点击</th>
                    <th class="py-2 text-right font-medium text-xs">转化率</th>
                    <th class="py-2 text-right font-medium text-xs">退货率</th>
                    <th class="py-2 text-right font-medium text-xs">销售额(万)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="sku in (storeSKUData[drillStore] ?? defaultSKUs)" :key="sku.name" class="border-b last:border-0 hover:bg-accent/50">
                    <td class="py-2.5 text-xs">{{ sku.name }}</td>
                    <td class="py-2.5 text-right text-xs">{{ formatNum(sku.clicks) }}</td>
                    <td class="py-2.5 text-right text-xs">{{ sku.conversion }}%</td>
                    <td class="py-2.5 text-right text-xs" :class="sku.returns > 4 ? 'text-red-500' : 'text-muted-foreground'">{{ sku.returns }}%</td>
                    <td class="py-2.5 text-right text-xs font-medium">{{ sku.revenue }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>

      <!-- ==================== 供应链 ==================== -->
      <template v-if="false && selectedNode === 'off_supply'">
        <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="kpi in supplyKPIs" :key="kpi.label"
            class="rounded-xl border bg-white p-5 shadow-sm">
            <p class="text-xs text-muted-foreground">{{ kpi.label }}</p>
            <p class="mt-1 text-2xl font-bold">{{ kpi.value }}<span class="text-sm font-normal text-muted-foreground"> {{ kpi.unit }}</span></p>
            <p :class="cn(
              'mt-1 text-xs',
              kpi.trend === 'up' ? (kpi.label.includes('预警') ? 'text-red-500' : 'text-emerald-600') : (kpi.label.includes('预警') ? 'text-emerald-600' : 'text-red-500'),
            )">
              {{ kpi.change > 0 ? '+' : '' }}{{ kpi.change }}{{ kpi.unit === '%' ? '%' : kpi.unit }}
            </p>
          </div>
        </div>
        <div class="mb-4 grid gap-4 lg:grid-cols-2">
          <!-- Stock Alerts -->
          <div class="rounded-xl border bg-white p-5 shadow-sm">
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle class="h-4 w-4 text-red-500" /> 库存预警
            </h3>
            <div class="space-y-2">
              <div v-for="alert in stockAlerts" :key="alert.sku" :class="cn(
                'flex items-start gap-3 rounded-lg border p-2.5',
                alert.severity === 'high' ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/50',
              )">
                <AlertTriangle :class="cn('h-4 w-4 mt-0.5 shrink-0', alert.severity === 'high' ? 'text-red-500' : 'text-amber-500')" />
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium truncate">{{ alert.sku }}</p>
                  <p class="text-[10px] text-muted-foreground">{{ alert.warehouse }} · 当前库存{{ alert.stock }}/安全库存{{ alert.threshold }}</p>
                </div>
                <span :class="cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-medium',
                  alert.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
                )">{{ alert.severity === 'high' ? '紧急' : '预警' }}</span>
              </div>
            </div>
          </div>
          <!-- Supplier Performance -->
          <div class="cursor-pointer rounded-xl border bg-white p-5 shadow-sm hover:shadow-md"
            @click="openDrill('供应商表现', 'bar', supplierPerformance.map(s => ({ label: s.name, value: s.score, color: '#f97316' })))">
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Truck class="h-4 w-4 text-primary" /> 供应商表现
            </h3>
            <div class="space-y-3">
              <div v-for="s in supplierPerformance" :key="s.name" class="flex items-center gap-2">
                <span class="text-xs w-28 truncate text-muted-foreground">{{ s.name }}</span>
                <div class="flex-1 h-4 rounded bg-zinc-100 overflow-hidden">
                  <div class="h-full rounded bg-gradient-to-r from-primary to-orange-400" :style="{ width: `${s.score}%` }" />
                </div>
                <span class="text-xs font-medium w-8 text-right">{{ s.score }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ==================== 营销 ==================== -->
      <template v-if="false && selectedNode === 'off_mkt'">
        <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="kpi in mktKPIs" :key="kpi.label"
            class="rounded-xl border bg-white p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            @click="kpi.label === '营销ROI' ? openDrill('各渠道ROI对比', 'bar', campaigns.map(c => ({ label: c.name, value: c.roi, color: '#f97316' }))) : null">
            <p class="text-xs text-muted-foreground">{{ kpi.label }}</p>
            <p class="mt-1 text-2xl font-bold">{{ kpi.value }}<span class="text-sm font-normal text-muted-foreground">{{ kpi.unit }}</span></p>
            <p :class="cn(
              'mt-1 text-xs',
              kpi.trend === 'up' ? (kpi.label === '营销总花费' ? 'text-red-500' : 'text-emerald-600') : (kpi.label === '营销总花费' ? 'text-emerald-600' : 'text-red-500'),
            )">
              {{ kpi.change > 0 ? '+' : '' }}{{ kpi.change }}% 环比
            </p>
          </div>
        </div>
        <div class="mb-4 grid gap-4 lg:grid-cols-2">
          <!-- Campaign ROI -->
          <div class="rounded-xl border bg-white p-5 shadow-sm">
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Target class="h-4 w-4 text-primary" /> 活动ROI对比
            </h3>
            <div class="space-y-3">
              <div v-for="c in campaigns" :key="c.name" class="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors cursor-pointer" @click="openDrill(`${c.name} - ROI分析`, 'bar', [{ label: '花费(万)', value: c.spend }, { label: '收入(万)', value: c.revenue }])">
                <span class="text-sm font-medium w-28 truncate">{{ c.name }}</span>
                <div class="flex-1 h-5 rounded bg-zinc-100 overflow-hidden">
                  <div class="h-full rounded bg-gradient-to-r from-primary to-orange-400" :style="{ width: `${(c.roi / 5) * 100}%` }" />
                </div>
                <span class="text-xs font-medium w-10 text-right">ROI {{ c.roi }}</span>
                <span class="text-xs text-muted-foreground w-10 text-right">{{ c.conversion }}%</span>
              </div>
            </div>
          </div>
          <!-- Traffic Sources -->
          <div class="cursor-pointer rounded-xl border bg-white p-5 shadow-sm hover:shadow-md"
            @click="openDrill('流量来源分析', 'pie', trafficSources.map(ts => ({ label: ts.source, value: ts.percentage, color: ts.source === '抖音' ? '#ec4899' : ts.source === '淘宝/天猫' ? '#f97316' : ts.source === '微信' ? '#10b981' : ts.source === '京东' ? '#ef4444' : '#8b5cf6' })))">
            <h3 class="mb-1 flex items-center gap-2 text-sm font-semibold">
              <Eye class="h-4 w-4 text-primary" /> 流量来源分布
            </h3>
            <p class="mb-4 text-xs text-muted-foreground">本月各渠道访问量及转化率</p>
            <div class="space-y-2">
              <div v-for="ts in trafficSources" :key="ts.source" class="flex items-center gap-2">
                <span class="text-xs w-16 text-muted-foreground">{{ ts.source }}</span>
                <div class="flex-1 h-4 rounded bg-zinc-100 overflow-hidden">
                  <div class="h-full rounded bg-gradient-to-r from-primary to-orange-400" :style="{ width: `${ts.percentage}%` }" />
                </div>
                <span class="text-xs font-medium w-10 text-right">{{ ts.percentage }}%</span>
                <span class="text-xs text-muted-foreground w-10 text-right">{{ ts.conversion }}%</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ==================== AI运营 ==================== -->
      <template v-if="false && selectedNode === 'off_ai'">
        <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="kpi in aiKPIs" :key="kpi.label"
            class="rounded-xl border bg-white p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
            <p class="text-xs text-muted-foreground">{{ kpi.label }}</p>
            <p class="mt-1 text-2xl font-bold">{{ kpi.value }}<span class="text-sm font-normal text-muted-foreground">{{ kpi.unit }}</span></p>
            <p :class="cn(
              'mt-1 text-xs',
              kpi.trend === 'up' ? (kpi.label === '平均响应时间' ? 'text-red-500' : 'text-emerald-600') : (kpi.label === '平均响应时间' ? 'text-emerald-600' : 'text-red-500'),
            )">
              {{ kpi.change > 0 ? '+' : '' }}{{ kpi.change }}{{ kpi.label === '需求闭环率' || kpi.label === 'AI渗透率' ? '个百分点' : '%' }} 环比
            </p>
          </div>
        </div>
        <div class="mb-4 grid gap-4 lg:grid-cols-2">
          <!-- Dept AI Penetration -->
          <div class="rounded-xl border bg-white p-5 shadow-sm cursor-pointer hover:shadow-md"
            @click="openDrill('各部门AI渗透率', 'bar', deptAIPenetration.map(d => ({ label: d.dept, value: d.penetration, color: '#f97316' })))">
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Brain class="h-4 w-4 text-primary" /> 部门AI渗透率
            </h3>
            <div class="space-y-2.5">
              <div v-for="d in deptAIPenetration" :key="d.dept" class="flex items-center gap-2">
                <span class="text-xs w-20 truncate text-muted-foreground">{{ d.dept }}</span>
                <div class="flex-1 h-5 rounded bg-zinc-100 overflow-hidden">
                  <div class="h-full rounded bg-gradient-to-r from-primary to-orange-400 flex items-center justify-end pr-1.5" :style="{ width: `${d.penetration}%` }">
                    <span v-if="d.penetration > 50" class="text-[10px] text-white font-medium">{{ d.penetration }}%</span>
                  </div>
                </div>
                <span v-if="d.penetration <= 50" class="text-xs text-muted-foreground w-8 text-right">{{ d.penetration }}%</span>
              </div>
            </div>
          </div>
          <!-- Tool Usage Ranking -->
          <div class="rounded-xl border bg-white p-5 shadow-sm">
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Zap class="h-4 w-4 text-amber-500" /> AI工具使用排行
            </h3>
            <div class="space-y-2">
              <div v-for="(tool, idx) in toolUsageRanking" :key="tool.name" class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors">
                <span :class="cn('w-5 text-center text-xs font-bold', idx < 3 ? 'text-primary' : 'text-muted-foreground')">{{ idx + 1 }}</span>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-medium truncate">{{ tool.name }}</p>
                  <p class="text-[10px] text-muted-foreground">{{ tool.category }}</p>
                </div>
                <span class="text-xs font-medium">{{ formatNum(tool.usage) }}次</span>
                <span class="text-xs text-emerald-600">+{{ tool.growth }}%</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ==================== AI Analysis Panel ==================== -->
      <div class="mt-6 rounded-xl border bg-white shadow-sm overflow-hidden">
        <button
          class="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-accent/20 transition-colors"
          @click="toggleAIAnalysis"
        >
          <div class="flex items-center gap-2">
            <Sparkles class="h-5 w-5 text-amber-500" />
            <span class="text-sm font-semibold">AI数据解读</span>
            <span class="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-medium">Beta</span>
          </div>
          <ChevronDown :class="cn('h-4 w-4 text-muted-foreground transition-transform', aiAnalysisExpanded && 'rotate-180')" />
        </button>

        <div v-if="aiAnalysisExpanded" class="border-t px-5 py-4 space-y-4">
          <div class="rounded-lg bg-amber-50/50 p-4">
            <p class="text-sm leading-relaxed text-foreground whitespace-pre-line">{{ aiAnalysisContent }}</p>
          </div>

          <div>
            <Button
              variant="outline"
              size="sm"
              class="gap-1.5"
              @click="aiDeepAnalysisExpanded = !aiDeepAnalysisExpanded"
            >
              <Brain class="h-3.5 w-3.5" />
              {{ aiDeepAnalysisExpanded ? '收起深度分析' : '深度分析' }}
            </Button>
            <div v-if="aiDeepAnalysisExpanded" class="mt-3 rounded-lg border bg-blue-50/50 p-4">
              <p class="text-sm leading-relaxed text-foreground whitespace-pre-line">{{ aiDepthAnalysisContent }}</p>
            </div>
          </div>

          <div>
            <p class="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MessageCircle class="h-3.5 w-3.5" /> 追问AI
            </p>
            <div class="flex gap-2">
              <input
                v-model="aiFollowUpQuestion"
                class="flex-1 rounded-lg border bg-white px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="例如：抖音渠道增长的主要品类是什么？..."
                @keydown.enter="askFollowUp"
              />
              <Button size="sm" class="gap-1.5" :disabled="!aiFollowUpQuestion.trim() || aiGeneratingAnswer" @click="askFollowUp">
                <Loader2 v-if="aiGeneratingAnswer" class="h-3.5 w-3.5 animate-spin" />
                <Send v-else class="h-3.5 w-3.5" />
                {{ aiGeneratingAnswer ? '分析中...' : '提问' }}
              </Button>
            </div>
            <div v-if="aiFollowUpAnswer" class="mt-3 rounded-lg border bg-zinc-50 p-3">
              <p class="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{{ aiFollowUpAnswer }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Drill-down Modal -->
      <Dialog :open="showDrillModal" @update:open="showDrillModal = $event">
        <DialogContent class="max-w-2xl">
          <DialogHeader>
            <DialogTitle class="flex items-center gap-2">
              <BarChart3 v-if="drillTypeChart === 'bar'" class="h-5 w-5 text-primary" />
              <TrendingUp v-if="drillTypeChart === 'line'" class="h-5 w-5 text-emerald-500" />
              <PieChart v-if="drillTypeChart === 'pie'" class="h-5 w-5 text-purple-500" />
              {{ drillTitle }} - 明细
            </DialogTitle>
          </DialogHeader>
          <div class="mt-4">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b text-left text-muted-foreground">
                  <th class="py-2 font-medium">{{ drillTypeChart === 'pie' ? '品类' : '维度' }}</th>
                  <th class="py-2 text-right font-medium">{{ drillTypeChart === 'pie' ? '占比' : '数值' }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in drillData" :key="d.label" class="border-b last:border-0 hover:bg-accent/50">
                  <td class="py-2.5">
                    <span class="flex items-center gap-2">
                      <span v-if="drillTypeChart === 'pie'" class="h-3 w-3 rounded-full" :style="{ backgroundColor: d.color }" />
                      {{ d.label }}
                    </span>
                  </td>
                  <td class="py-2.5 text-right font-medium">{{ drillTypeChart === 'pie' ? `${d.value}%` : d.value }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <!-- Create Dashboard Modal -->
      <Dialog :open="showCreateDialog" @update:open="showCreateDialog = $event">
        <DialogContent class="max-w-md">
          <DialogHeader>
            <DialogTitle class="flex items-center gap-2">
              <Plus class="h-5 w-5 text-primary" /> 新建看板
            </DialogTitle>
          </DialogHeader>
          <div class="mt-4 space-y-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium">看板名称</label>
              <Input v-model="newDashboardForm.name" placeholder="输入看板名称..." />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium">描述</label>
              <Input v-model="newDashboardForm.description" placeholder="输入看板描述..." />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium">业务领域</label>
              <select v-model="newDashboardForm.businessDomain" class="w-full rounded-lg border px-3 py-2 text-sm">
                <option>零售销售</option>
                <option>供应链</option>
                <option>营销</option>
                <option>AI运营</option>
                <option>人力资源</option>
              </select>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <Button variant="outline" @click="showCreateDialog = false">取消</Button>
              <Button @click="handleCreateDashboard">创建看板</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  </div>
</template>
