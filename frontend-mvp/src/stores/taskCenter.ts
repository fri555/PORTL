import { computed, reactive, ref, watch, type UnwrapNestedRefs } from 'vue'
import { EMPTY_CUSTOM_RANGE, matchesRange, type CustomRange, type QuickRange } from '@/utils/dateRange'

/** 全局任务中心：本期只接入「商品作业系统文件下载」，字段与状态机按公共框架定义。 */
export type TaskStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled'

export interface GlobalTask {
  id: string
  name: string
  type: string
  sourceModule: string
  sourceLabel: string
  sourcePath: string
  sourceAvailable: boolean
  status: TaskStatus
  progress?: number
  failureReason?: string
  artifactName?: string
  artifactSize?: string
  artifactExpiresAt?: string
  createdAt: string
  updatedAt: string
  deleted?: boolean
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  queued: '排队中',
  running: '处理中',
  success: '成功',
  failed: '失败',
  cancelled: '已取消',
}

const STORAGE_KEY = 'tianma.prototype.task-center.v1'
const DOWNLOAD_TYPE = '商品作业系统文件下载'
const SOURCE_MODULE = '商品作业系统'

function nowText(offsetMs = 0): string {
  const d = new Date(Date.now() + offsetMs)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function isoText(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString()
}

function seedTasks(): GlobalTask[] {
  const h = 3600_000
  const d = 24 * h
  return [
    {
      id: 'task-download-running', name: '8月商品全量出价明细导出', type: DOWNLOAD_TYPE,
      sourceModule: SOURCE_MODULE, sourceLabel: '商品作业系统 · 出价数据', sourcePath: '/portals', sourceAvailable: true,
      status: 'running', progress: 62, createdAt: nowText(-12 * 60_000), updatedAt: nowText(-40_000),
    },
    {
      id: 'task-download-queued', name: '双店透出率周报数据包', type: DOWNLOAD_TYPE,
      sourceModule: SOURCE_MODULE, sourceLabel: '商品作业系统 · 透出率报表', sourcePath: '/portals', sourceAvailable: true,
      status: 'queued', createdAt: nowText(-4 * 60_000), updatedAt: nowText(-4 * 60_000),
    },
    {
      id: 'task-download-success', name: 'SKU 价格异动清单（近30天）', type: DOWNLOAD_TYPE,
      sourceModule: SOURCE_MODULE, sourceLabel: '商品作业系统 · 价格监控', sourcePath: '/portals', sourceAvailable: true,
      status: 'success', artifactName: 'SKU价格异动清单_近30天.xlsx', artifactSize: '186.4 KB',
      artifactExpiresAt: isoText(26 * d), createdAt: nowText(-2 * h), updatedAt: nowText(-2 * h + 90_000),
    },
    {
      id: 'task-download-success-2', name: '店铺重点货号销售汇总', type: DOWNLOAD_TYPE,
      sourceModule: SOURCE_MODULE, sourceLabel: '商品作业系统 · 销售汇总', sourcePath: '/portals', sourceAvailable: true,
      status: 'success', artifactName: '店铺重点货号销售汇总.xlsx', artifactSize: '42.0 KB',
      artifactExpiresAt: isoText(31 * d + 2 * h), createdAt: nowText(-3 * d), updatedAt: nowText(-3 * d),
    },
    {
      id: 'task-download-expired', name: '618 活动商品库存快照', type: DOWNLOAD_TYPE,
      sourceModule: SOURCE_MODULE, sourceLabel: '商品作业系统 · 库存快照', sourcePath: '/portals', sourceAvailable: true,
      status: 'success', artifactName: '618活动商品库存快照.xlsx', artifactSize: '512.0 KB',
      artifactExpiresAt: isoText(-2 * d), createdAt: nowText(-33 * d), updatedAt: nowText(-33 * d),
    },
    {
      id: 'task-download-failed', name: '竞品价格抓取结果导出', type: DOWNLOAD_TYPE,
      sourceModule: SOURCE_MODULE, sourceLabel: '商品作业系统 · 竞品价格', sourcePath: '/portals', sourceAvailable: true,
      status: 'failed', failureReason: '源数据拉取超时，请在来源页面重新发起', createdAt: nowText(-6 * h), updatedAt: nowText(-5 * h),
    },
    {
      id: 'task-download-cancelled', name: '清鸿叶店铺商品主图批量下载', type: DOWNLOAD_TYPE,
      sourceModule: SOURCE_MODULE, sourceLabel: '商品作业系统 · 商品素材', sourcePath: '/portals', sourceAvailable: true,
      status: 'cancelled', createdAt: nowText(-2 * d), updatedAt: nowText(-2 * d + 10 * 60_000),
    },
    {
      id: 'task-terminate-fail', name: '全量商品类目映射表生成', type: DOWNLOAD_TYPE,
      sourceModule: SOURCE_MODULE, sourceLabel: '商品作业系统 · 类目映射', sourcePath: '/portals', sourceAvailable: true,
      status: 'running', progress: 18, createdAt: nowText(-8 * 60_000), updatedAt: nowText(-60_000),
    },
    {
      id: 'task-source-gone', name: '骏凡店铺历史出价归档', type: DOWNLOAD_TYPE,
      sourceModule: SOURCE_MODULE, sourceLabel: '商品作业系统 · 历史归档', sourcePath: '/portals', sourceAvailable: false,
      status: 'success', artifactName: '骏凡历史出价归档.xlsx', artifactSize: '88.2 KB',
      artifactExpiresAt: isoText(20 * d), createdAt: nowText(-5 * d), updatedAt: nowText(-5 * d),
    },
  ]
}

function load(): GlobalTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedTasks()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return seedTasks()
    return parsed.filter((item): item is GlobalTask =>
      !!item && typeof item === 'object' && typeof (item as GlobalTask).id === 'string'
      && typeof (item as GlobalTask).status === 'string',
    )
  } catch {
    return seedTasks()
  }
}

export type TaskFilter = {
  type: string
  status: TaskStatus | 'all'
  period: QuickRange
  customRange: CustomRange
}

function createTaskCenterStore() {
  const tasks = ref<GlobalTask[]>(load())
  const open = ref(false)
  const filter = ref<TaskFilter>({ type: 'all', status: 'all', period: 'all', customRange: { ...EMPTY_CUSTOM_RANGE } })

  watch(tasks, value => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)) } catch { /* 原型内存态 */ }
  }, { deep: true })

  const visibleTasks = computed(() => tasks.value.filter(task => task.deleted !== true))
  const pendingCount = computed(() => visibleTasks.value.filter(t => t.status === 'queued' || t.status === 'running').length)
  const failedCount = computed(() => visibleTasks.value.filter(t => t.status === 'failed').length)
  const badgeCount = computed(() => pendingCount.value + failedCount.value)

  const filteredTasks = computed(() => visibleTasks.value
    .filter(task => filter.value.type === 'all' || task.type === filter.value.type)
    .filter(task => filter.value.status === 'all' || task.status === filter.value.status)
    .filter(task => matchesRange(task.createdAt, filter.value.period, filter.value.customRange))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)))

  const taskTypes = computed(() => [...new Set(visibleTasks.value.map(task => task.type))])

  function resetFilter() {
    filter.value = { type: 'all', status: 'all', period: 'all', customRange: { ...EMPTY_CUSTOM_RANGE } }
  }

  function artifactExpired(task: GlobalTask): boolean {
    if (!task.artifactExpiresAt) return true
    const stamp = Date.parse(task.artifactExpiresAt)
    return !Number.isFinite(stamp) || stamp <= Date.now()
  }

  /** 运行中删除先真正终止；终止失败或结果未知时保留任务。 */
  function terminate(taskId: string): { ok: boolean; reason?: string } {
    const task = tasks.value.find(item => item.id === taskId)
    if (!task) return { ok: false, reason: '任务不存在' }
    if (task.status === 'queued' || task.status === 'running') {
      // 原型模拟来源模块未响应终止请求的场景
      if (task.id === 'task-terminate-fail') return { ok: false, reason: '终止失败，请稍后重试' }
      task.status = 'cancelled'
      task.updatedAt = nowText()
      return { ok: true }
    }
    return { ok: true }
  }

  function removeTask(taskId: string): { ok: boolean; reason?: string } {
    const result = terminate(taskId)
    if (!result.ok) return result
    const task = tasks.value.find(item => item.id === taskId)
    if (!task) return { ok: false, reason: '任务不存在' }
    task.deleted = true
    task.updatedAt = nowText()
    return { ok: true }
  }

  function downloadArtifact(task: GlobalTask): { ok: boolean; reason?: string } {
    if (task.status !== 'success' || !task.artifactName) return { ok: false, reason: '当前任务没有可下载产物' }
    if (artifactExpired(task)) return { ok: false, reason: '产物已过期，请重新发起任务' }
    const body = `${task.artifactName}\n来源：${task.sourceLabel}\n任务：${task.name}\n本地原型演示文件`
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = task.artifactName.replace(/\.[^.]+$/, '.txt')
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return { ok: true }
  }

  return {
    tasks, open, filter, visibleTasks, filteredTasks, taskTypes,
    pendingCount, failedCount, badgeCount,
    resetFilter, artifactExpired, terminate, removeTask, downloadArtifact,
  }
}

type TaskCenterStore = UnwrapNestedRefs<ReturnType<typeof createTaskCenterStore>>
let instance: TaskCenterStore | null = null
/** 模块级单例：原型在无 Pinia 的测试环境里也能渲染。 */
export function useTaskCenterStore(): TaskCenterStore {
  if (!instance) instance = reactive(createTaskCenterStore())
  return instance
}
