<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  CheckSquare,
  Clock,
  Play,
  Pause,
  Eye,
  Edit3,
  RefreshCw,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Wand2,
  FileText,
  Database,
  Bell,
  CalendarDays,
  Swords,
} from 'lucide-vue-next'
import { scheduledTasks, taskLogs, officeTaskTemplates } from '@/mock/tasks'
import type { ScheduledTask } from '@/types/task'
import WorkspaceBackButton from '@/components/common/WorkspaceBackButton.vue'

// ---- Tab ----
const activeTab = ref<'instant' | 'scheduled'>('scheduled')

// ---- Task List ----
const tasks = computed(() => scheduledTasks)

// ---- Task Detail Dialog ----
const showDetailDialog = ref(false)
const detailTask = ref<ScheduledTask | null>(null)
const showTaskLogs = ref(false)

const taskLogsForDetail = computed(() => {
  if (!detailTask.value) return []
  return taskLogs.filter((l) => l.taskId === detailTask.value!.id)
})

function openDetail(task: ScheduledTask) {
  detailTask.value = task
  showTaskLogs.value = false
  showDetailDialog.value = true
}

function closeDetail() {
  showDetailDialog.value = false
  detailTask.value = null
}

// ---- Create Task Dialog ----
const showCreateDialog = ref(false)
const createForm = ref({
  name: '',
  description: '',
  agentId: 'ag01',
  cronExpression: '',
  cronNaturalLanguage: '',
  timezone: 'Asia/Shanghai',
  executionConfig: {
    instruction: '',
    dataSources: [] as string[],
    outputFormat: 'markdown_report' as 'markdown_report' | 'json' | 'text' | 'csv',
  },
  notificationConfig: {
    dingtalkTodo: false,
    dingtalkGroupWebhook: '',
    inAppNotification: true,
  },
  retryConfig: {
    maxRetries: 3,
    retryDelaySeconds: 300,
    alertOnFailure: true,
  },
  pointsCostPerRun: 5,
})

// NL to Cron
const nlInput = ref('')
const cronResult = ref('')
const cronGenerating = ref(false)

function generateCron() {
  if (!nlInput.value.trim()) return
  cronGenerating.value = true
  setTimeout(() => {
    // Simple NL to cron simulation
    const text = nlInput.value.trim()
    if (text.includes('周') && text.includes('一')) cronResult.value = '0 9 * * 1'
    else if (text.includes('周') && text.includes('五')) cronResult.value = '0 17 * * 5'
    else if (text.includes('每天')) cronResult.value = '0 8 * * *'
    else if (text.includes('每月') && text.includes('1')) cronResult.value = '0 9 1 * *'
    else cronResult.value = '0 9 * * 1'
    createForm.value.cronExpression = cronResult.value
    createForm.value.cronNaturalLanguage = nlInput.value
    cronGenerating.value = false
  }, 800)
}

function confirmCron() {
  createForm.value.cronExpression = cronResult.value
  createForm.value.cronNaturalLanguage = nlInput.value
}

function closeCreateDialog() {
  showCreateDialog.value = false
  nlInput.value = ''
  cronResult.value = ''
}

// ---- Helpers ----
function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    active: '运行中',
    paused: '已暂停',
    stopped: '已停止',
    error: '异常',
  }
  return map[status] ?? status
}

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-amber-100 text-amber-700',
    stopped: 'bg-zinc-100 text-zinc-500',
    error: 'bg-red-100 text-red-700',
  }
  return map[status] ?? 'bg-zinc-100 text-zinc-500'
}

function getLogStatusColor(status: string) {
  const map: Record<string, string> = {
    success: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    running: 'bg-blue-100 text-blue-700',
  }
  return map[status] ?? 'bg-zinc-100 text-zinc-500'
}

function getLogStatusLabel(status: string) {
  const map: Record<string, string> = {
    success: '成功',
    failed: '失败',
    running: '运行中',
  }
  return map[status] ?? status
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getOutputFormatLabel(format: string): string {
  const map: Record<string, string> = {
    markdown_report: 'Markdown报告',
    json: 'JSON',
    text: '纯文本',
    csv: 'CSV',
  }
  return map[format] ?? format
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <WorkspaceBackButton class="mb-3" />
        <h1 class="text-2xl font-bold text-zinc-900">我的任务</h1>
        <p class="text-sm text-zinc-500 mt-1">管理和监控定时任务与即时任务执行情况</p>
      </div>
      <button
        v-if="activeTab === 'scheduled'"
        @click="showCreateDialog = true"
        class="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
      >
        <Plus class="size-4" />
        创建任务
      </button>
    </div>

    <!-- Tab Switcher -->
    <div class="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
      <button
        @click="activeTab = 'instant'"
        :class="[
          'rounded-md px-4 py-2 text-sm font-medium transition-colors',
          activeTab === 'instant'
            ? 'bg-white text-zinc-900 shadow-sm'
            : 'text-zinc-500 hover:text-zinc-700',
        ]"
      >
        <Clock class="size-3.5 inline mr-1.5" />
        即时任务
      </button>
      <button
        @click="activeTab = 'scheduled'"
        :class="[
          'rounded-md px-4 py-2 text-sm font-medium transition-colors',
          activeTab === 'scheduled'
            ? 'bg-white text-zinc-900 shadow-sm'
            : 'text-zinc-500 hover:text-zinc-700',
        ]"
      >
        <RefreshCw class="size-3.5 inline mr-1.5" />
        定时任务
      </button>
    </div>

    <!-- Quick-Create Office Automation Templates -->
    <div v-if="activeTab === 'scheduled'" class="space-y-3">
      <h2 class="text-sm font-semibold text-zinc-500 uppercase tracking-wider">快速创建 · 办公自动化模板</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <button
          v-for="tpl in officeTaskTemplates"
          :key="tpl.id"
          class="rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm hover:shadow-md hover:border-orange-300 transition-all group"
          @click="showCreateDialog = true; createForm.name = tpl.name; createForm.description = tpl.description; createForm.agentId = tpl.agentId; createForm.cronExpression = tpl.cronExpression; createForm.cronNaturalLanguage = tpl.cronNaturalLanguage; createForm.executionConfig.instruction = tpl.instruction"
        >
          <div class="flex items-center gap-2 mb-2">
            <div
              class="size-8 rounded-lg flex items-center justify-center text-white"
              :style="{ backgroundColor: tpl.color }"
            >
              <component :is="tpl.icon === 'FileText' ? FileText : tpl.icon === 'Database' ? Database : tpl.icon === 'Bell' ? Bell : tpl.icon === 'CalendarDays' ? CalendarDays : Swords" class="size-4" />
            </div>
            <span class="text-xs text-orange-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">一键创建</span>
          </div>
          <h3 class="text-sm font-semibold text-zinc-900">{{ tpl.name }}</h3>
          <p class="text-xs text-zinc-500 mt-1">{{ tpl.description }}</p>
          <div class="mt-2 flex items-center gap-2 text-xs text-zinc-400">
            <code class="font-mono bg-zinc-100 px-1 rounded">{{ tpl.cronNaturalLanguage }}</code>
            <span class="text-zinc-300">|</span>
            <span>{{ tpl.agentName }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Task List -->
    <div v-if="tasks.length > 0" class="space-y-3">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-zinc-900">{{ task.name }}</h3>
              <span
                :class="['rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(task.status)]"
              >
                {{ getStatusBadge(task.status) }}
              </span>
            </div>
            <p class="text-sm text-zinc-500 mt-1">{{ task.description }}</p>
            <div class="mt-2 flex items-center gap-3 text-xs text-zinc-400">
              <span>关联智能体：{{ task.agentName }}</span>
              <span class="text-zinc-300">|</span>
              <span>Cron: <code class="font-mono bg-zinc-100 px-1 rounded">{{ task.cronExpression }}</code></span>
              <span class="text-zinc-300">|</span>
              <span>{{ task.cronNaturalLanguage }}</span>
            </div>
            <div class="mt-2 flex items-center gap-3 text-xs text-zinc-400">
              <span>上次运行：{{ formatDate(task.lastRunAt) }}</span>
              <span
                v-if="task.lastRunStatus"
                :class="[
                  'rounded-full px-1.5 py-0.5 text-xs font-medium',
                  task.lastRunStatus === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                ]"
              >
                {{ task.lastRunStatus === 'success' ? '成功' : '失败' }}
              </span>
              <span class="text-zinc-300">|</span>
              <span>下次运行：{{ formatDate(task.nextRunAt) }}</span>
              <span class="text-zinc-300">|</span>
              <span>{{ task.pointsCostPerRun }} 积分/次</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1.5 shrink-0 ml-4">
            <button
              @click="openDetail(task)"
              class="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
              title="查看详情"
            >
              <Eye class="size-4" />
            </button>
            <button
              class="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
              title="编辑"
            >
              <Edit3 class="size-4" />
            </button>
            <button
              class="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-orange-500 transition-colors"
              title="手动触发"
            >
              <Play class="size-4" />
            </button>
            <button
              class="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
              :title="task.status === 'active' ? '暂停' : '启用'"
            >
              <Pause class="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center py-20 text-zinc-400">
      <CheckSquare class="size-16 mb-4" />
      <p class="text-lg font-medium">暂无定时任务</p>
      <p class="text-sm mt-1">创建你的第一个定时任务来自动化重复工作</p>
    </div>

    <!-- Task Detail Dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showDetailDialog && detailTask"
          class="fixed inset-0 z-50 flex items-center justify-center"
          @click.self="closeDetail"
        >
          <div class="absolute inset-0 bg-black/40" />
          <div class="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-zinc-900">{{ detailTask.name }}</h2>
              <button
                @click="closeDetail"
                class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X class="size-5" />
              </button>
            </div>

            <!-- Execution Config -->
            <section class="mb-6">
              <h3 class="text-sm font-semibold text-zinc-700 mb-3 pb-2 border-b border-zinc-100">执行配置</h3>
              <dl class="space-y-3 text-sm">
                <div class="flex gap-3">
                  <dt class="shrink-0 w-24 text-zinc-400">指令内容</dt>
                  <dd class="text-zinc-700">{{ detailTask.executionConfig.instruction }}</dd>
                </div>
                <div class="flex gap-3">
                  <dt class="shrink-0 w-24 text-zinc-400">数据来源</dt>
                  <dd class="text-zinc-700">
                    <span
                      v-for="(ds, i) in detailTask.executionConfig.dataSources"
                      :key="i"
                      class="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 mr-1"
                    >
                      {{ ds }}
                    </span>
                    <span v-if="detailTask.executionConfig.dataSources.length === 0" class="text-zinc-400">无</span>
                  </dd>
                </div>
                <div class="flex gap-3">
                  <dt class="shrink-0 w-24 text-zinc-400">输出格式</dt>
                  <dd class="text-zinc-700">{{ getOutputFormatLabel(detailTask.executionConfig.outputFormat) }}</dd>
                </div>
                <div class="flex gap-3">
                  <dt class="shrink-0 w-24 text-zinc-400">Cron表达式</dt>
                  <dd class="text-zinc-700">
                    <code class="font-mono bg-zinc-100 px-1.5 py-0.5 rounded text-orange-600">{{ detailTask.cronExpression }}</code>
                    <span class="text-zinc-400 ml-2">({{ detailTask.cronNaturalLanguage }})</span>
                  </dd>
                </div>
                <div class="flex gap-3">
                  <dt class="shrink-0 w-24 text-zinc-400">时区</dt>
                  <dd class="text-zinc-700">{{ detailTask.timezone }}</dd>
                </div>
              </dl>
            </section>

            <!-- Notification Config -->
            <section class="mb-6">
              <h3 class="text-sm font-semibold text-zinc-700 mb-3 pb-2 border-b border-zinc-100">通知配置</h3>
              <dl class="space-y-3 text-sm">
                <div class="flex gap-3">
                  <dt class="shrink-0 w-24 text-zinc-400">钉钉待办</dt>
                  <dd>
                    <span
                      :class="[
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        detailTask.notificationConfig.dingtalkTodo
                          ? 'bg-green-100 text-green-700'
                          : 'bg-zinc-100 text-zinc-500',
                      ]"
                    >
                      {{ detailTask.notificationConfig.dingtalkTodo ? '开启' : '关闭' }}
                    </span>
                  </dd>
                </div>
                <div class="flex gap-3">
                  <dt class="shrink-0 w-24 text-zinc-400">群机器人</dt>
                  <dd class="text-zinc-700 font-mono text-xs truncate">
                    {{ detailTask.notificationConfig.dingtalkGroupWebhook || '未配置' }}
                  </dd>
                </div>
                <div class="flex gap-3">
                  <dt class="shrink-0 w-24 text-zinc-400">站内通知</dt>
                  <dd>
                    <span
                      :class="[
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        detailTask.notificationConfig.inAppNotification
                          ? 'bg-green-100 text-green-700'
                          : 'bg-zinc-100 text-zinc-500',
                      ]"
                    >
                      {{ detailTask.notificationConfig.inAppNotification ? '开启' : '关闭' }}
                    </span>
                  </dd>
                </div>
              </dl>
            </section>

            <!-- Retry Config -->
            <section class="mb-6">
              <h3 class="text-sm font-semibold text-zinc-700 mb-3 pb-2 border-b border-zinc-100">重试配置</h3>
              <dl class="space-y-3 text-sm">
                <div class="flex gap-3">
                  <dt class="shrink-0 w-24 text-zinc-400">最大重试</dt>
                  <dd class="text-zinc-700">{{ detailTask.retryConfig.maxRetries }} 次</dd>
                </div>
                <div class="flex gap-3">
                  <dt class="shrink-0 w-24 text-zinc-400">重试间隔</dt>
                  <dd class="text-zinc-700">{{ detailTask.retryConfig.retryDelaySeconds }} 秒</dd>
                </div>
                <div class="flex gap-3">
                  <dt class="shrink-0 w-24 text-zinc-400">失败告警</dt>
                  <dd>
                    <span
                      :class="[
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        detailTask.retryConfig.alertOnFailure
                          ? 'bg-green-100 text-green-700'
                          : 'bg-zinc-100 text-zinc-500',
                      ]"
                    >
                      {{ detailTask.retryConfig.alertOnFailure ? '开启' : '关闭' }}
                    </span>
                  </dd>
                </div>
              </dl>
            </section>

            <!-- Task Logs -->
            <section>
              <button
                @click="showTaskLogs = !showTaskLogs"
                class="flex items-center gap-2 text-sm font-semibold text-zinc-700 mb-3 pb-2 border-b border-zinc-100 w-full"
              >
                <component :is="showTaskLogs ? ChevronDown : ChevronRight" class="size-4" />
                运行日志（{{ taskLogsForDetail.length }}）
              </button>
              <div v-if="showTaskLogs" class="space-y-2">
                <div
                  v-for="log in taskLogsForDetail"
                  :key="log.id"
                  class="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                >
                  <div class="flex items-center justify-between mb-1.5">
                    <div class="flex items-center gap-2">
                      <span
                        :class="['rounded-full px-2 py-0.5 text-xs font-medium', getLogStatusColor(log.status)]"
                      >
                        {{ getLogStatusLabel(log.status) }}
                      </span>
                      <span class="text-xs text-zinc-400">{{ formatDate(log.startedAt) }}</span>
                    </div>
                    <div class="flex items-center gap-2 text-xs text-zinc-400">
                      <span>{{ log.tokensUsed.toLocaleString() }} Tokens</span>
                      <span>|</span>
                      <span>{{ log.pointsConsumed }} 积分</span>
                    </div>
                  </div>
                  <p v-if="log.output" class="text-xs text-zinc-600 line-clamp-2 font-mono">{{ log.output.slice(0, 200) }}</p>
                  <p v-if="log.errorMessage" class="text-xs text-red-600">{{ log.errorMessage }}</p>
                </div>
                <div v-if="taskLogsForDetail.length === 0" class="text-sm text-zinc-400 text-center py-4">
                  暂无运行日志
                </div>
              </div>
            </section>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Create Task Dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showCreateDialog"
          class="fixed inset-0 z-50 flex items-center justify-center"
          @click.self="closeCreateDialog"
        >
          <div class="absolute inset-0 bg-black/40" />
          <div class="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-zinc-900">创建定时任务</h2>
              <button
                @click="closeCreateDialog"
                class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X class="size-5" />
              </button>
            </div>

            <div class="space-y-4">
              <!-- Basic Info -->
              <div>
                <label class="block text-sm font-medium text-zinc-700 mb-1">任务名称</label>
                <input
                  v-model="createForm.name"
                  type="text"
                  placeholder="输入任务名称"
                  class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-zinc-700 mb-1">任务描述</label>
                <textarea
                  v-model="createForm.description"
                  rows="2"
                  placeholder="描述任务的目的和内容"
                  class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 resize-none"
                />
              </div>

              <!-- NL to Cron -->
              <div class="rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                <h3 class="text-sm font-semibold text-orange-800 mb-3 flex items-center gap-2">
                  <Wand2 class="size-4" />
                  自然语言生成Cron表达式
                </h3>
                <div class="flex gap-2">
                  <input
                    v-model="nlInput"
                    type="text"
                    placeholder="例如：每周一9点、每天8点、每月1号9点"
                    class="flex-1 rounded-lg border border-orange-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                  />
                  <button
                    @click="generateCron"
                    :disabled="!nlInput.trim() || cronGenerating"
                    class="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
                  >
                    <span v-if="cronGenerating" class="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {{ cronGenerating ? '生成中' : '生成' }}
                  </button>
                </div>
                <div v-if="cronResult" class="mt-3 flex items-center gap-3">
                  <code class="rounded-lg bg-white border border-orange-200 px-3 py-1.5 text-sm font-mono text-orange-600">{{ cronResult }}</code>
                  <button
                    @click="confirmCron"
                    class="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    确认使用
                  </button>
                </div>
              </div>

              <!-- Execution Config -->
              <div>
                <label class="block text-sm font-medium text-zinc-700 mb-1">执行指令</label>
                <textarea
                  v-model="createForm.executionConfig.instruction"
                  rows="3"
                  placeholder="描述任务执行时AI应该做什么..."
                  class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 resize-none"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-zinc-700 mb-1">输出格式</label>
                  <select
                    v-model="createForm.executionConfig.outputFormat"
                    class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                  >
                    <option value="markdown_report">Markdown报告</option>
                    <option value="json">JSON</option>
                    <option value="text">纯文本</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-zinc-700 mb-1">每次消耗积分</label>
                  <input
                    v-model.number="createForm.pointsCostPerRun"
                    type="number"
                    min="1"
                    class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-zinc-700 mb-1">最大重试次数</label>
                <input
                  v-model.number="createForm.retryConfig.maxRetries"
                  type="number"
                  min="0"
                  max="10"
                  class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                />
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-3">
              <button
                @click="closeCreateDialog"
                class="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                取消
              </button>
              <button
                class="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
              >
                创建任务
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
