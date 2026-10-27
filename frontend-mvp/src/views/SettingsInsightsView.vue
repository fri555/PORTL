<script setup lang="ts">
import { computed, reactive, ref, toRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  CircleHelp,
  Download,
  Gauge,
  MinusSquare,
  MoreHorizontal,
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
import type { DeptNode, UsageNode, VisibleUsageRow, QuotaPolicy } from '@/types/settings-insights'
import {
  createUsageTrees,
  createQuotaPolicies,
  deptTree,
  moduleCascade,
  personalUsageRecords,
  actorDirectory,
} from '@/mock/settings-insights'
import {
  allDeptIds,
  filterDepartmentTree,
  filterPersons,
  quotaBand,
  containsModule,
  matchesUsageFilters,
  flattenPersons,
  sessionsWithPath,
  typeLabels,
  number,
  money,
  compact,
  downloadCsv,
  leafSessions,
  operationTypeLabels,
  actorDisplayName,
} from '@/composables/settings/insights-helpers'
import { usageCsvRows, personalUsageCsvRows } from '@/composables/settings/insights-export'
import { useAuditInsights } from '@/composables/settings/useAuditInsights'
import PersonalUsagePanel from '@/components/settings/insights/PersonalUsagePanel.vue'
import AuditInsightsPanel from '@/components/settings/insights/AuditInsightsPanel.vue'

const route = useRoute()
const router = useRouter()
const store = useAppStore()
const isAudit = computed(() => route.path.endsWith('/audit'))
const isAdmin = computed(() => store.user?.role === 'admin' && route.query.scope !== 'personal')
const { adminTree, personalTree } = createUsageTrees()
const quotaPolicies = ref<QuotaPolicy[]>(createQuotaPolicies())
const audit = reactive(useAuditInsights(showFeedback))
const selectedAudit = toRef(audit, 'selectedAudit')

const selectedUsage = ref<UsageNode | null>(null)
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

const deptOpen = ref(false)
const selectedDeptIds = ref(new Set<string>())
const deptSearchQuery = ref('')
const deptExpandedPath = ref<string[]>([]) // 级联面板展开路径（支持多层）

function isDeptSelected(node: DeptNode): 'all' | 'partial' | 'none' {
  const ids = allDeptIds([node])
  const selected = ids.filter((id) => selectedDeptIds.value.has(id))
  if (selected.length === 0) return 'none'
  if (selected.length === ids.length) return 'all'
  return 'partial'
}
function toggleDept(node: DeptNode) {
  const ids = allDeptIds([node])
  const allSelected = ids.every((id) => selectedDeptIds.value.has(id))
  const next = new Set(selectedDeptIds.value)
  if (allSelected) ids.forEach((id) => next.delete(id))
  else ids.forEach((id) => next.add(id))
  selectedDeptIds.value = next
}
function toggleAllDepts() {
  const all = allDeptIds(deptTree)
  const allSelected = all.every((id) => selectedDeptIds.value.has(id))
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
    const found = currentChildren.find((n) => n.id === pathId)
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
  const walk = (nodes: DeptNode[]) =>
    nodes.forEach((n) => {
      if (selectedDeptIds.value.has(n.id)) names.push(n.name)
      if (n.children) walk(n.children)
    })
  walk(deptTree)
  return names.length > 2 ? `${names[0]} 等 ${names.length} 个部门` : names.join('、')
}

const filteredDeptTree = computed(() => filterDepartmentTree(deptTree, deptSearchQuery.value))

const startDate = ref('2026-09-01')
const endDate = ref('2026-09-16')
const peopleQuery = ref('')
const appliedUsage = ref({ start: startDate.value, end: endDate.value, person: '', module: '' })

// 模块级联数据（两级，单选）
const moduleOpen = ref(false)
const selectedModuleId = ref('')
const moduleExpandedPath = ref<string[]>([]) // 级联面板展开路径
function moduleDisplayName(): string {
  if (!selectedModuleId.value) return '选择模块'
  const findName = (
    nodes: { id: string; name: string; children?: { id: string; name: string }[] }[],
  ): string => {
    for (const g of nodes) {
      if (g.id === selectedModuleId.value) return g.name
      if ('children' in g && g.children) {
        const child = g.children.find((c) => c.id === selectedModuleId.value)
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
    const found = current.find((g) => g.id === pathId)
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
const allPersons = computed(() =>
  flattenPersons(adminTree).map((p) => ({ id: p.id, name: p.name })),
)
const personalPeriod = ref<'today' | '7d' | '30d' | 'custom'>('7d')
const quotaWarningOpen = ref(true)

function matchesFilters(node: UsageNode) {
  return matchesUsageFilters(node, appliedUsage.value)
}

// 扁平人员列表（从 adminTree 提取所有 person 节点）
const flatPersonList = computed(() =>
  filterPersons(adminTree, deptTree, peopleQuery.value, selectedDeptIds.value),
)

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
watch(flatPersonList, () => {
  usagePage.value = 1
})

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
          .filter(
            ({ row, path }) =>
              matchesFilters(row) &&
              (!appliedUsage.value.module || path.includes(appliedUsage.value.module)),
          )
          .forEach(({ row: request }) =>
            rows.push({
              ...request,
              name: `${request.name} · ${request.date ?? ''}`,
              subtitle: request.model,
              level: level + 1,
            }),
          )
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

const totals = computed(() => {
  if (isAdmin.value) {
    const filters = appliedUsage.value
    const rows = sessionsWithPath(filteredRoots.value).filter(
      ({ row, path }) => matchesFilters(row) && (!filters.module || path.includes(filters.module)),
    )
    return rows.reduce(
      (sum, { row }) => ({
        amount: sum.amount + row.amount,
        coins: 0,
        tokens: sum.tokens + row.tokens,
        calls: 0,
        quota: sum.quota,
      }),
      {
        amount: 0,
        coins: 0,
        tokens: 0,
        calls: 0,
        quota: filteredRoots.value.reduce((sum, row) => sum + row.quota, 0),
      },
    )
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
const displayRate = computed(() => (isAdmin.value ? summaryRow.value.rate : personalRate.value))
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
  appliedUsage.value = {
    start: startDate.value,
    end: endDate.value,
    person: peopleQuery.value,
    module: selectedModuleId.value,
  }
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
function exportUsage() {
  const rows = leafSessions(filteredRoots.value)
  downloadCsv('用量管理-会话明细.csv', usageCsvRows(rows))
  showFeedback('已导出当前筛选范围的会话明细')
}
function exportPersonalUsage() {
  downloadCsv('个人消耗明细.csv', personalUsageCsvRows(personalUsageRecords))
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
    const applyInheritedQuota = (nodes: UsageNode[]) =>
      nodes.forEach((node) => {
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
function resetPersonalQuota() {
  if (!quotaTarget.value) return
  const inherited = globalQuotaDefaults.value[quotaCycle.value]
  quotaTarget.value.quota = inherited
  quotaTarget.value.quotaSource = '全局默认'
  quotaTarget.value.quotaRate = (quotaTarget.value.amount / inherited) * 100
  quotaOpen.value = false
  showFeedback(`已重置额度，清除默认额度和临时额度，恢复使用${quotaCycle.value}全局默认额度`)
}
function openPersonDetail(row: UsageNode) {
  selectedPersonDetail.value = row
}
function openQuotaFromDetail() {
  const person = selectedPersonDetail.value
  if (!person) return
  selectedPersonDetail.value = null
  openPersonQuota(person)
}
const selectedPersonDetail = ref<UsageNode | null>(null)
const personMenuId = ref('')

function togglePersonMenu(id: string, ev: MouseEvent) {
  ev.stopPropagation()
  personMenuId.value = personMenuId.value === id ? '' : id
}
function closePersonMenu() {
  personMenuId.value = ''
}
const personRequests = computed(() => {
  if (!selectedPersonDetail.value) return []
  const person = selectedPersonDetail.value
  const sessions: UsageNode[] = []
  const collect = (nodes: UsageNode[]) =>
    nodes.forEach((n) => {
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
const personInputTokens = computed(() =>
  selectedPersonDetail.value ? Math.round(selectedPersonDetail.value.tokens * 0.62) : 0,
)
const personOutputTokens = computed(() =>
  selectedPersonDetail.value ? Math.round(selectedPersonDetail.value.tokens * 0.28) : 0,
)
const personCacheTokens = computed(() =>
  selectedPersonDetail.value ? Math.round(selectedPersonDetail.value.tokens * 0.1) : 0,
)
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
      <PersonalUsagePanel
        v-if="!isAudit && !isAdmin"
        v-model:start-date="startDate"
        v-model:end-date="endDate"
        v-model:personal-period="personalPeriod"
        :metrics="metrics"
        :display-rate="displayRate"
        :personal-usage-records="personalUsageRecords"
        @choose-period="choosePersonalPeriod"
        @export="exportPersonalUsage"
      />

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
            ><input
              v-model="peopleQuery"
              list="usage-person-options"
              aria-label="人员"
              placeholder="输入本名或花名筛选"
            /><datalist id="usage-person-options">
              <option v-for="p in allPersons" :key="p.id" :value="p.name">{{ p.name }}</option>
            </datalist></label
          ><label class="dept-field"
            ><span>部门</span>
            <div class="dept-select-wrap">
              <button type="button" class="dept-select-btn" @click="deptOpen = !deptOpen">
                <span :class="{ placeholder: selectedDeptIds.size === 0 }">{{
                  deptDisplayName()
                }}</span>
                <ChevronDown :size="14" :class="{ 'dept-rotate': deptOpen }" />
              </button>
              <div v-if="deptOpen" class="cascader-dropdown" @mousedown.stop>
                <div class="cascader-header">
                  <input v-model="deptSearchQuery" placeholder="搜索部门" class="dept-search" />
                  <button type="button" class="dept-toggle-all" @click="toggleAllDepts">
                    {{ selectedDeptIds.size === allDeptIds(deptTree).length ? '取消全选' : '全选' }}
                  </button>
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
                      :class="{
                        active: deptExpandedPath[colIdx] === node.id,
                        selected: isDeptSelected(node) !== 'none',
                      }"
                      @mouseenter="
                        node.children?.length ? hoverDeptColumn(node.id, colIdx) : undefined
                      "
                    >
                      <label class="cascader-check" @click.stop>
                        <input
                          type="checkbox"
                          :checked="isDeptSelected(node) !== 'none'"
                          :indeterminate="isDeptSelected(node) === 'partial'"
                          @change="toggleDept(node)"
                        />
                      </label>
                      <span class="cascader-name">{{ node.name }}</span>
                      <ChevronRight
                        v-if="node.children?.length"
                        :size="12"
                        class="cascader-arrow"
                      />
                    </button>
                  </div>
                </div>
              </div></div></label
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
                      v-for="item in column as any[]"
                      :key="item.id"
                      type="button"
                      class="cascader-item"
                      :class="{
                        active: moduleExpandedPath[colIdx] === item.id,
                        selected: selectedModuleId === item.id,
                      }"
                      @mouseenter="
                        item.children?.length ? hoverModuleColumn(item.id, colIdx) : undefined
                      "
                      @click="!item.children?.length ? selectModule(item.id) : undefined"
                    >
                      <span class="cascader-name">{{ item.name }}</span>
                      <ChevronRight
                        v-if="item.children?.length"
                        :size="12"
                        class="cascader-arrow"
                      />
                    </button>
                  </div>
                </div>
              </div></div
          ></label>
          <div class="filter-actions">
            <button
              type="button"
              class="filter-reset"
              aria-label="清空用量筛选"
              @click="resetUsageFilters"
            >
              <RotateCcw :size="14" />清空</button
            ><button
              type="button"
              class="primary-button"
              aria-label="查询用量"
              @click="applyUsageFilters"
            >
              查询
            </button>
          </div>
        </section>
        <section class="panel detail-panel">
          <header>
            <div>
              <h2>组织用量明细</h2>
              <p>按人员汇总，点击行查看请求明细</p>
            </div>
            <div class="table-actions">
              <button type="button" aria-label="配置全局默认额度" @click="openGlobalQuota">
                <Settings2 :size="15" />全局默认额度
              </button>
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
          <div class="table-scroll" @click="closePersonMenu">
            <table class="usage-flat">
              <thead>
                <tr>
                  <th>人员</th>
                  <th>
                    <span class="th-label"
                      >额度<span
                        class="help-tip"
                        title="以月为单位设置的金额消耗上限，耗尽后可联系管理员调整"
                        ><CircleHelp :size="13" /></span
                    ></span>
                  </th>
                  <th>
                    <span class="th-label"
                      >消耗<span
                        class="help-tip"
                        title="根据每次任务大模型实际返回的token消耗及单价计算汇总得到"
                        ><CircleHelp :size="13" /></span
                    ></span>
                  </th>
                  <th>使用率</th>
                  <th>更新时间</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <!-- 汇总行 -->
                <tr class="summary-row">
                  <td><strong>汇总</strong></td>
                  <td>
                    <strong>{{ money(summaryRow.quota) }}</strong>
                  </td>
                  <td>
                    <strong>{{ money(summaryRow.amount) }}</strong>
                  </td>
                  <td>
                    <div class="quota-cell">
                      <span class="quota-track"
                        ><i
                          :class="{ warning: summaryRow.rate >= 80, danger: summaryRow.rate >= 90 }"
                          :style="{ width: `${Math.min(summaryRow.rate, 100)}%` }"
                      /></span>
                      <b
                        :class="[
                          'quota-rate',
                          {
                            'quota-rate--warning': summaryRow.rate >= 80,
                            'quota-rate--danger': summaryRow.rate >= 90,
                          },
                        ]"
                        >{{ summaryRow.rate.toFixed(0) }}%</b
                      >
                    </div>
                  </td>
                  <td>—</td>
                  <td>—</td>
                  <td></td>
                </tr>
                <!-- 人员行 -->
                <tr
                  v-for="person in paginatedPersonList"
                  :key="person.id"
                  class="person-row clickable"
                  @click="openPersonDetail(person)"
                >
                  <td>
                    <strong>{{ person.name }}</strong
                    ><small v-if="person.subtitle">{{ person.subtitle }}</small>
                  </td>
                  <td>
                    <span>{{ person.quota ? money(person.quota) : '—' }}</span
                    ><small v-if="person.quotaSource" class="quota-source">{{
                      person.quotaSource
                    }}</small>
                  </td>
                  <td>{{ money(person.amount) }}</td>
                  <td>
                    <div v-if="person.quota" class="quota-cell">
                      <span class="quota-track"
                        ><i
                          :class="{
                            warning: person.quotaRate >= 80,
                            danger: person.quotaRate >= 90,
                          }"
                          :style="{ width: `${Math.min(person.quotaRate, 100)}%` }"
                      /></span>
                      <b
                        :class="[
                          'quota-rate',
                          {
                            'quota-rate--warning': person.quotaRate >= 80,
                            'quota-rate--danger': person.quotaRate >= 90,
                          },
                        ]"
                        >{{ person.quotaRate.toFixed(0) }}%</b
                      >
                    </div>
                    <span v-else>—</span>
                  </td>
                  <td class="text-zinc-500">{{ person.updatedAt || '—' }}</td>
                  <td class="menu-cell" @click.stop>
                    <button
                      type="button"
                      class="menu-trigger"
                      aria-label="操作菜单"
                      @click="togglePersonMenu(person.id, $event)"
                    >
                      <MoreHorizontal :size="16" />
                    </button>
                    <div v-if="personMenuId === person.id" class="person-menu" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        @click="
                          personMenuId = ''; openPersonDetail(person)
                        "
                      >
                        详情
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        @click="
                          personMenuId = ''; openPersonQuota(person)
                        "
                      >
                        设置
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="!paginatedPersonList.length">
                  <td colspan="6" class="empty-cell">
                    当前条件下暂无数据
                    <button type="button" @click="resetUsageFilters">清空筛选</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="usageTotalPages > 1" class="pagination">
            <span class="pagination-info"
              >共 {{ flatPersonList.length }} 人，第 {{ usagePage }} /
              {{ usageTotalPages }} 页</span
            >
            <div class="pagination-btns">
              <button type="button" :disabled="usagePage <= 1" @click="usagePage--">上一页</button>
              <button
                v-for="p in usageTotalPages"
                :key="p"
                type="button"
                :class="{ active: p === usagePage }"
                @click="usagePage = p"
              >
                {{ p }}
              </button>
              <button type="button" :disabled="usagePage >= usageTotalPages" @click="usagePage++">
                下一页
              </button>
            </div>
          </div>
        </section>
      </template>

      <AuditInsightsPanel v-else :state="audit" />
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
                <strong
                  >{{ quotaScope === '全局' ? '全局额度设置' : '用户额度设置'
                  }}<span
                    class="help-tip"
                    :title="
                      quotaScope === '全局'
                        ? '全局额度调整每个用户每个月的默认额度，单位：人民币'
                        : '默认额度调整当前用户每个月的默认额度，及时生效，次月充值；临时额度调整当前用户当月的临时额度，及时生效，优先级>默认额度，单位：人民币'
                    "
                    ><CircleHelp :size="14" /></span
                ></strong>
                <p>
                  {{
                    quotaScope === '全局'
                      ? '调整每个用户每个月的默认额度'
                      : `${quotaObject} · 2026 年 9 月`
                  }}
                </p>
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
                <span
                  >全局额度<span class="help-tip" title="系统为每位用户每月自动分配的默认额度"
                    ><CircleHelp :size="12" /></span
                ></span>
                <strong>{{ money(globalQuotaDefaults['每月']) }}</strong>
                <small>（当前额度）</small>
              </div>
              <label class="full"
                ><span>变更额度（人民币）</span
                ><input
                  v-model="quotaAmount"
                  aria-label="变更额度"
                  type="number"
                  min="1"
                  placeholder="变更后额度"
              /></label>
              <label class="full"
                ><span>调整原因</span
                ><textarea
                  v-model="quotaReason"
                  aria-label="调整原因"
                  rows="3"
                  placeholder="请填写调整原因"
                />
              </label>
            </template>
            <!-- 用户额度模式 -->
            <template v-else>
              <div class="quota-current">
                <span
                  >用户额度<span class="help-tip" title="管理员为该用户单独设置的个性化额度"
                    ><CircleHelp :size="12" /></span
                ></span>
                <strong>{{ money(quotaTarget?.quota || 0) }}</strong>
                <small>（当前额度）</small>
              </div>
              <label
                ><span
                  >额度类型<span
                    class="help-tip"
                    title="默认为每月自动分配的额度；临时为当月追加的额度，次月失效"
                    ><CircleHelp :size="12" /></span></span
                ><select v-model="quotaType" aria-label="额度类型">
                  <option>默认</option>
                  <option>临时</option>
                </select></label
              >
              <label class="full"
                ><span>变更额度（人民币）</span
                ><input
                  v-model="quotaAmount"
                  aria-label="变更额度"
                  type="number"
                  min="1"
                  placeholder="变更后额度"
              /></label>
              <label class="full"
                ><span>调整原因</span
                ><textarea
                  v-model="quotaReason"
                  aria-label="调整原因"
                  rows="3"
                  placeholder="请填写调整原因"
                />
              </label>
            </template>
            <p v-if="quotaError" class="form-error full">{{ quotaError }}</p>
          </div>
          <footer>
            <button
              v-if="quotaTarget?.quotaSource === '个人设置'"
              type="button"
              class="danger-text"
              aria-label="重置额度"
              @click="resetPersonalQuota"
            >
              重置
            </button>
            <button type="button" @click="quotaOpen = false">取消</button>
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
                  <dt>
                    人民币消耗<span
                      class="help-tip"
                      title="根据大模型实际消耗的 token 及单价计算的费用"
                      ><CircleHelp :size="12"
                    /></span>
                  </dt>
                  <dd>{{ money(selectedUsage.amount) }}</dd>
                </div>
                <div>
                  <dt>
                    输入 Token<span
                      class="help-tip"
                      title="发送给大模型的输入文本所消耗的 token 数量"
                      ><CircleHelp :size="12"
                    /></span>
                  </dt>
                  <dd>{{ compact(Math.round(selectedUsage.tokens * 0.62)) }}</dd>
                </div>
                <div>
                  <dt>
                    输出 Token<span class="help-tip" title="大模型生成的回复文本所消耗的 token 数量"
                      ><CircleHelp :size="12"
                    /></span>
                  </dt>
                  <dd>{{ compact(Math.round(selectedUsage.tokens * 0.28)) }}</dd>
                </div>
                <div>
                  <dt>
                    缓存命中 Token<span
                      class="help-tip"
                      title="命中缓存的重复请求所节省的 token 数量"
                      ><CircleHelp :size="12"
                    /></span>
                  </dt>
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
                <p>
                  {{ actorDisplayName(selectedAudit) }} ·
                  {{
                    operationTypeLabels[selectedAudit.operationType] || selectedAudit.operationType
                  }}
                </p>
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
                  <dd>
                    {{
                      operationTypeLabels[selectedAudit.operationType] ||
                      selectedAudit.operationType
                    }}
                  </dd>
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
      <div
        v-if="selectedPersonDetail"
        class="modal-layer"
        @mousedown.self="selectedPersonDetail = null"
      >
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
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="settings-btn"
                aria-label="设置额度"
                @click="openQuotaFromDetail"
              >
                <Settings2 :size="14" />设置
              </button>
              <button type="button" aria-label="关闭人员详情" @click="selectedPersonDetail = null">
                <X :size="18" />
              </button>
            </div>
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
                  <dt>
                    全局额度<span class="help-tip" title="系统为每位用户每月自动分配的默认额度"
                      ><CircleHelp :size="12"
                    /></span>
                  </dt>
                  <dd>{{ money(personGlobalQuota) }}</dd>
                </div>
                <div>
                  <dt>
                    用户额度<span class="help-tip" title="管理员为该用户单独设置的个性化额度"
                      ><CircleHelp :size="12"
                    /></span>
                  </dt>
                  <dd>{{ personUserQuota ? money(personUserQuota) : '—' }}</dd>
                </div>
                <div>
                  <dt>
                    临时额度<span
                      class="help-tip"
                      title="当月临时追加的额度，优先级高于默认额度，次月失效"
                      ><CircleHelp :size="12"
                    /></span>
                  </dt>
                  <dd>{{ personTempQuota ? money(personTempQuota) : '—' }}</dd>
                </div>
              </dl>
            </section>
            <section>
              <h2>消耗明细</h2>
              <dl>
                <div>
                  <dt>
                    金额消耗<span
                      class="help-tip"
                      title="根据大模型实际消耗的 token 及单价计算的费用"
                      ><CircleHelp :size="12"
                    /></span>
                  </dt>
                  <dd>{{ money(selectedPersonDetail.amount) }}</dd>
                </div>
                <div>
                  <dt>
                    输入 Token<span
                      class="help-tip"
                      title="发送给大模型的输入文本所消耗的 token 数量"
                      ><CircleHelp :size="12"
                    /></span>
                  </dt>
                  <dd>{{ compact(personInputTokens) }}</dd>
                </div>
                <div>
                  <dt>
                    输出 Token<span class="help-tip" title="大模型生成的回复文本所消耗的 token 数量"
                      ><CircleHelp :size="12"
                    /></span>
                  </dt>
                  <dd>{{ compact(personOutputTokens) }}</dd>
                </div>
                <div>
                  <dt>
                    缓存命中 Token<span
                      class="help-tip"
                      title="命中缓存缓存的重复请求所节省的 token 数量"
                      ><CircleHelp :size="12"
                    /></span>
                  </dt>
                  <dd>{{ compact(personCacheTokens) }}</dd>
                </div>
              </dl>
            </section>
          </div>
        </section>
      </div>
      <aside v-if="!isAudit && isAdmin && quotaWarningOpen" class="quota-warning" role="alert">
        <span class="warning-icon">!</span>
        <div>
          <strong>额度即将用尽</strong>
          <p>李清（清晖）的本周期额度仅剩 6%，请及时调整额度，避免任务中断。</p>
        </div>
        <button type="button" aria-label="关闭额度预警" @click="quotaWarningOpen = false">
          <X :size="15" />
        </button>
      </aside>
    </Teleport>
  </div>
</template>

<style scoped src="@/components/settings/insights/insights.css"></style>
