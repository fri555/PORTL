<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Archive,
  Bot,
  Boxes,
  ChevronDown,
  ClipboardCheck,
  Database,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wrench,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import GovernanceDrawer from '@/components/governance/GovernanceDrawer.vue'
import GovernanceMetricCard from '@/components/governance/GovernanceMetricCard.vue'
import GovernanceModal from '@/components/governance/GovernanceModal.vue'
import GovernanceStatusBadge from '@/components/governance/GovernanceStatusBadge.vue'
import { evaluationRecords, governanceMetrics, governanceRecords } from '@/mock/governance'
import type { EvaluationSubview, GovernanceRecord, GovernanceTab } from '@/types/governance'

const activeTab = ref<GovernanceTab>('agents')
const evaluationSubview = ref<EvaluationSubview>('tasks')
const searchKeyword = ref('')
const statusFilter = ref('全部状态')
const categoryFilter = ref('全部类型')
const selectedRecord = ref<GovernanceRecord | null>(null)
const showCreateModal = ref(false)
const confirmRecord = ref<GovernanceRecord | null>(null)
const openActionId = ref<string | null>(null)

const tabs: { id: GovernanceTab; label: string; count: number; icon: typeof Bot }[] = [
  { id: 'agents', label: '智能体管理', count: 24, icon: Bot },
  { id: 'models', label: '模型管理', count: 12, icon: Server },
  { id: 'tools', label: '工具管理', count: 38, icon: Wrench },
  { id: 'evaluations', label: '智能评估', count: 8, icon: ClipboardCheck },
]

const tabMeta: Record<GovernanceTab, { action: string; search: string; columns: string[] }> = {
  agents: {
    action: '新建智能体',
    search: '搜索名称、slug 或负责人',
    columns: ['智能体', '状态', '当前版本', '绑定模型', '24h 调用', '负责人'],
  },
  models: {
    action: '注册模型',
    search: '搜索显示名、模型 ID 或提供方',
    columns: ['模型', '状态', '连通性', '档位', '24h 调用', '24h 成本', 'P95 延迟', '负责人'],
  },
  tools: {
    action: '注册工具',
    search: '搜索名称、slug、类型或负责人',
    columns: ['工具', '状态', '类型', '版本', '引用数', '负责人'],
  },
  evaluations: {
    action: '创建评估任务',
    search: '搜索任务、数据集、指标或报告',
    columns: ['评估任务', '状态', '目标智能体', '数据集', '进度', '综合得分', '负责人'],
  },
}

const evaluationTabs: { id: EvaluationSubview; label: string; icon: typeof Database }[] = [
  { id: 'tasks', label: '评估任务', icon: ClipboardCheck },
  { id: 'datasets', label: '数据集', icon: Database },
  { id: 'metrics', label: '指标库', icon: SlidersHorizontal },
  { id: 'reports', label: '报告', icon: ShieldCheck },
]

const evaluationColumns: Record<EvaluationSubview, string[]> = {
  tasks: tabMeta.evaluations.columns,
  datasets: ['数据集', '状态', '样本数', '当前版本', '使用记录', '负责人'],
  metrics: ['指标', '状态', '指标维度', '评估方式', '使用次数', '负责人'],
  reports: ['报告', '状态', '报告编号', '综合得分', '风险项', '负责人'],
}

const currentColumns = computed(() =>
  activeTab.value === 'evaluations'
    ? evaluationColumns[evaluationSubview.value]
    : tabMeta[activeTab.value].columns,
)
const sourceRecords = computed(() =>
  activeTab.value === 'evaluations'
    ? evaluationRecords[evaluationSubview.value]
    : governanceRecords[activeTab.value],
)
const categories = computed(() => [
  '全部类型',
  ...new Set(sourceRecords.value.map((item) => item.category)),
])
const statuses = computed(() => [
  '全部状态',
  ...new Set(sourceRecords.value.map((item) => item.status)),
])
const filteredRecords = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  return sourceRecords.value.filter((item) => {
    const matchesKeyword =
      !keyword ||
      `${item.name}${item.code}${item.owner}${item.category}`.toLowerCase().includes(keyword)
    const matchesStatus = statusFilter.value === '全部状态' || item.status === statusFilter.value
    const matchesCategory =
      categoryFilter.value === '全部类型' || item.category === categoryFilter.value
    return matchesKeyword && matchesStatus && matchesCategory
  })
})

function switchTab(tab: GovernanceTab) {
  activeTab.value = tab
  clearFilters()
  openActionId.value = null
}

function switchEvaluationSubview(subview: EvaluationSubview) {
  evaluationSubview.value = subview
  clearFilters()
}

function openDetails(record: GovernanceRecord) {
  selectedRecord.value = record
  openActionId.value = null
}

function saveDraft() {
  showCreateModal.value = false
  toast.success('已保存草稿')
}

function clearFilters() {
  searchKeyword.value = ''
  statusFilter.value = '全部状态'
  categoryFilter.value = '全部类型'
}

function confirmArchive() {
  if (!confirmRecord.value) return
  confirmRecord.value.status = '已归档'
  toast.success(`已归档：${confirmRecord.value.name}`)
  confirmRecord.value = null
  openActionId.value = null
}
</script>

<template>
  <div data-testid="ai-governance-view" class="min-h-[calc(100vh-4rem)] bg-[#f7f8fa] text-zinc-950">
    <div class="mx-auto w-full max-w-[1480px] px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
      <header class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div
            class="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#ff5530]"
          >
            <Sparkles class="h-3.5 w-3.5" /> AI Governance
          </div>
          <h1 class="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">AI 治理中心</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            统一管理智能体、模型、工具与评估资产，确保每次变更可见、可控、可追溯。
          </p>
        </div>
        <button
          data-testid="primary-governance-action"
          class="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5530]"
          @click="showCreateModal = true"
        >
          <Plus class="h-4 w-4" />{{ tabMeta[activeTab].action }}
        </button>
      </header>

      <nav class="mt-8 flex gap-7 overflow-x-auto border-b border-zinc-200" aria-label="治理模块">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :data-testid="`tab-${tab.id}`"
          class="group flex shrink-0 items-center gap-2 border-b-2 px-0.5 pb-3 text-sm font-medium transition"
          :class="
            activeTab === tab.id
              ? 'border-zinc-950 text-zinc-950'
              : 'border-transparent text-zinc-500 hover:text-zinc-950'
          "
          @click="switchTab(tab.id)"
        >
          <component :is="tab.icon" class="h-4 w-4" /><span>{{ tab.label }}</span
          ><span
            class="rounded-full px-2 py-0.5 text-[10px]"
            :class="
              activeTab === tab.id ? 'bg-[#ffded6] text-[#c93312]' : 'bg-zinc-200/70 text-zinc-500'
            "
            >{{ tab.count }}</span
          >
        </button>
      </nav>

      <section class="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <GovernanceMetricCard
          v-for="metric in governanceMetrics[activeTab]"
          :key="metric.label"
          :metric="metric"
        />
      </section>

      <section v-if="activeTab === 'evaluations'" class="mt-5 flex flex-wrap gap-2">
        <button
          v-for="item in evaluationTabs"
          :key="item.id"
          :data-testid="`evaluation-subtab-${item.id}`"
          class="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition"
          :class="
            evaluationSubview === item.id
              ? 'border-zinc-950 bg-zinc-950 text-white'
              : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400'
          "
          @click="switchEvaluationSubview(item.id)"
        >
          <component :is="item.icon" class="h-3.5 w-3.5" />{{ item.label }}
        </button>
      </section>

      <section
        class="mt-5 overflow-visible rounded-2xl border border-zinc-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]"
      >
        <div
          class="flex flex-col gap-3 border-b border-zinc-200 p-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <label class="relative block w-full lg:max-w-sm"
            ><Search
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><input
              v-model="searchKeyword"
              aria-label="搜索当前资产"
              :placeholder="tabMeta[activeTab].search"
              class="h-10 w-full rounded-xl border border-zinc-200 bg-[#f7f8fa] pl-9 pr-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white"
          /></label>
          <div class="flex flex-wrap items-center gap-2">
            <div class="inline-flex items-center gap-2 text-xs font-medium text-zinc-500">
              <Filter class="h-4 w-4" />筛选
            </div>
            <label class="relative"
              ><select
                v-model="statusFilter"
                aria-label="按状态筛选"
                class="h-9 appearance-none rounded-full border border-zinc-200 bg-white pl-3 pr-8 text-xs text-zinc-700 outline-none focus:border-zinc-950"
              >
                <option v-for="status in statuses" :key="status">{{ status }}</option></select
              ><ChevronDown
                class="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" /></label
            ><label class="relative"
              ><select
                v-model="categoryFilter"
                aria-label="按类型筛选"
                class="h-9 appearance-none rounded-full border border-zinc-200 bg-white pl-3 pr-8 text-xs text-zinc-700 outline-none focus:border-zinc-950"
              >
                <option v-for="category in categories" :key="category">
                  {{ category }}
                </option></select
              ><ChevronDown
                class="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
            /></label>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr
                class="bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400"
              >
                <th
                  v-for="column in currentColumns"
                  :key="column"
                  class="whitespace-nowrap px-4 py-3 first:pl-5"
                >
                  {{ column }}
                </th>
                <th class="w-16 px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody v-if="filteredRecords.length">
              <tr
                v-for="record in filteredRecords"
                :key="record.id"
                class="border-t border-zinc-100 text-sm transition hover:bg-zinc-50/60"
              >
                <td class="px-4 py-4 pl-5">
                  <button
                    :data-testid="`open-details-${record.id}`"
                    class="text-left"
                    @click="selectedRecord = record"
                  >
                    <span class="block font-semibold text-zinc-950 hover:underline">{{
                      record.name
                    }}</span
                    ><span class="mt-1 block font-mono text-[11px] text-zinc-400">{{
                      record.code
                    }}</span>
                  </button>
                </td>
                <td class="whitespace-nowrap px-4 py-4">
                  <GovernanceStatusBadge :status="record.status" />
                </td>
                <td
                  v-for="field in record.fields"
                  :key="field"
                  class="whitespace-nowrap px-4 py-4 text-xs text-zinc-600"
                >
                  {{ field }}
                </td>
                <td class="whitespace-nowrap px-4 py-4 text-xs text-zinc-600">
                  <span
                    class="mr-2 inline-grid h-7 w-7 place-items-center rounded-full bg-zinc-100 font-semibold"
                    >{{ record.owner[0] }}</span
                  >{{ record.owner }}
                </td>
                <td class="relative px-4 py-4 text-right">
                  <button
                    :data-testid="`toggle-actions-${record.id}`"
                    :aria-label="`打开 ${record.name} 操作菜单`"
                    class="rounded-full p-2 text-zinc-500 hover:bg-zinc-100"
                    @click="openActionId = openActionId === record.id ? null : record.id"
                  >
                    <MoreHorizontal class="h-4 w-4" />
                  </button>
                  <div
                    v-if="openActionId === record.id"
                    class="absolute right-4 top-12 z-20 w-36 rounded-xl border border-zinc-200 bg-white p-1 text-left shadow-xl"
                  >
                    <button
                      class="w-full rounded-lg px-3 py-2 text-xs hover:bg-zinc-50"
                      @click="openDetails(record)"
                    >
                      查看详情</button
                    ><button
                      :data-testid="`state-action-${record.id}`"
                      class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-600 hover:bg-rose-50"
                      @click="confirmRecord = record"
                    >
                      <Archive class="h-3.5 w-3.5" />归档
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div
            v-if="!filteredRecords.length"
            class="grid min-h-64 place-items-center p-8 text-center"
          >
            <div>
              <div class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-zinc-100">
                <Boxes class="h-5 w-5 text-zinc-400" />
              </div>
              <h3 class="mt-4 font-semibold">没有符合条件的资产</h3>
              <p class="mt-1 text-sm text-zinc-500">调整关键词或筛选条件后再试。</p>
              <button
                data-testid="clear-governance-filters"
                class="mt-4 rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold"
                @click="clearFilters"
              >
                清空筛选
              </button>
            </div>
          </div>
        </div>
        <footer
          v-if="filteredRecords.length"
          class="flex items-center justify-between border-t border-zinc-200 px-5 py-3 text-xs text-zinc-500"
        >
          <span>共 {{ filteredRecords.length }} 条记录</span>
          <div class="flex items-center gap-1">
            <button class="rounded-lg border border-zinc-200 px-2.5 py-1.5">上一页</button
            ><span class="grid h-8 w-8 place-items-center rounded-lg bg-zinc-950 text-white">1</span
            ><button class="rounded-lg border border-zinc-200 px-2.5 py-1.5">下一页</button>
          </div>
        </footer>
      </section>
    </div>

    <GovernanceDrawer
      :open="Boolean(selectedRecord)"
      :title="selectedRecord?.name ?? ''"
      @close="selectedRecord = null"
      ><template v-if="selectedRecord"
        ><div class="rounded-2xl bg-[#f7f8fa] p-5">
          <p class="font-mono text-xs text-zinc-400">{{ selectedRecord.code }}</p>
          <p class="mt-3 text-sm leading-6 text-zinc-700">{{ selectedRecord.detail }}</p>
        </div>
        <dl class="mt-6 grid grid-cols-2 gap-4">
          <div class="rounded-xl border border-zinc-200 p-4">
            <dt class="text-xs text-zinc-400">状态</dt>
            <dd class="mt-2"><GovernanceStatusBadge :status="selectedRecord.status" /></dd>
          </div>
          <div class="rounded-xl border border-zinc-200 p-4">
            <dt class="text-xs text-zinc-400">负责人</dt>
            <dd class="mt-2 text-sm font-semibold">{{ selectedRecord.owner }}</dd>
          </div>
          <div class="rounded-xl border border-zinc-200 p-4">
            <dt class="text-xs text-zinc-400">分类</dt>
            <dd class="mt-2 text-sm font-semibold">{{ selectedRecord.category }}</dd>
          </div>
          <div class="rounded-xl border border-zinc-200 p-4">
            <dt class="text-xs text-zinc-400">最近更新</dt>
            <dd class="mt-2 text-sm font-semibold">今天 10:32</dd>
          </div>
        </dl></template
      ></GovernanceDrawer
    >

    <GovernanceModal
      :open="showCreateModal"
      :title="tabMeta[activeTab].action"
      close-label="关闭创建面板"
      @close="showCreateModal = false"
      ><div class="space-y-4">
        <label class="block text-sm font-medium"
          >名称<input
            class="mt-2 h-11 w-full rounded-xl border border-zinc-200 px-3 outline-none focus:border-zinc-950"
            placeholder="输入资产名称" /></label
        ><label class="block text-sm font-medium"
          >唯一标识<input
            class="mt-2 h-11 w-full rounded-xl border border-zinc-200 px-3 font-mono text-sm outline-none focus:border-zinc-950"
            placeholder="lowercase-slug" /></label
        ><label class="block text-sm font-medium"
          >说明<textarea
            class="mt-2 min-h-24 w-full rounded-xl border border-zinc-200 p-3 outline-none focus:border-zinc-950"
            placeholder="说明用途和适用范围"
          />
        </label>
        <div class="flex justify-end gap-2 pt-2">
          <button
            class="rounded-full border border-zinc-300 px-4 py-2 text-sm"
            @click="showCreateModal = false"
          >
            保存草稿</button
          ><button
            class="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
            @click="saveDraft"
          >
            保存并继续
          </button>
        </div>
      </div></GovernanceModal
    >

    <GovernanceModal
      :open="Boolean(confirmRecord)"
      title="确认归档"
      alert
      @close="confirmRecord = null"
      @confirm="confirmArchive"
      ><div v-if="confirmRecord">
        <p class="text-sm leading-6 text-zinc-600">
          归档后，<strong class="text-zinc-950">{{ confirmRecord.name }}</strong>
          将不再对新的调用可用，历史记录会继续保留。
        </p>
        <div
          class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800"
        >
          请先确认下游引用和当前运行任务不受影响。此操作会记录到审计日志。
        </div>
      </div></GovernanceModal
    >
  </div>
</template>
