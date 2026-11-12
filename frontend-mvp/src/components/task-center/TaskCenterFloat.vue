<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlertCircle, CheckCircle2, ChevronRight, Clock3, Download, ExternalLink,
  FileText, ListChecks, Loader2, Trash2, X,
} from 'lucide-vue-next'
import { useTaskCenterStore, TASK_STATUS_LABEL, type GlobalTask, type TaskStatus } from '@/stores/taskCenter'
import { rangeSummary, validateRange, type QuickRange } from '@/utils/dateRange'

const store = useTaskCenterStore()
const router = useRouter()
const confirmId = ref('')
const notice = ref('')
let noticeTimer: number | undefined

function flash(message: string) {
  notice.value = message
  if (noticeTimer) window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => { notice.value = '' }, 3200)
}

const typeFilter = computed<string>({
  get: () => store.filter.type,
  set: value => { store.filter.type = value },
})
const statusFilter = computed<TaskStatus | 'all'>({
  get: () => store.filter.status,
  set: value => { store.filter.status = value },
})
const periodFilter = computed<QuickRange>({
  get: () => store.filter.period,
  set: value => { store.filter.period = value },
})
const customStart = computed<string>({
  get: () => store.filter.customRange.start,
  set: value => { store.filter.customRange.start = value },
})
const customEnd = computed<string>({
  get: () => store.filter.customRange.end,
  set: value => { store.filter.customRange.end = value },
})
const rangeCheck = computed(() => validateRange(store.filter.customRange))
const rangeText = computed(() => rangeSummary(store.filter.period, store.filter.customRange))
function clearCustomRange() {
  store.filter.customRange.start = ''
  store.filter.customRange.end = ''
}

function remainingDays(task: GlobalTask): string {
  if (!task.artifactExpiresAt) return ''
  const stamp = Date.parse(task.artifactExpiresAt)
  if (!Number.isFinite(stamp)) return ''
  const days = Math.ceil((stamp - Date.now()) / (24 * 3600_000))
  return days > 0 ? `剩余 ${days} 天` : '已过期'
}

function goSource(task: GlobalTask) {
  if (!task.sourceAvailable) { flash('来源页面不可用'); return }
  store.open = false
  router.push(task.sourcePath)
}

function download(task: GlobalTask) {
  const result = store.downloadArtifact(task)
  flash(result.ok ? '已开始下载产物' : (result.reason ?? '下载失败'))
}

function askDelete(task: GlobalTask) {
  confirmId.value = task.id
}

function confirmDelete() {
  const id = confirmId.value
  confirmId.value = ''
  const result = store.removeTask(id)
  flash(result.ok ? '任务已删除' : (result.reason ?? '删除失败，请稍后重试'))
}

function statusClass(status: TaskStatus): string {
  return `task-status task-status--${status}`
}
</script>

<template>
  <div class="task-center" data-testid="global-task-center">
    <button
      v-if="!store.open"
      class="task-center__float"
      type="button"
      title="全局任务中心"
      aria-label="打开全局任务中心"
      @click="store.open = true"
    >
      <ListChecks :size="20" />
      <span class="task-center__float-text">任务</span>
      <span v-if="store.badgeCount" class="task-center__badge">{{ store.badgeCount }}</span>
    </button>

    <template v-if="store.open">
      <div class="task-center__mask" @click="store.open = false" />
      <aside class="task-center__drawer" role="dialog" aria-modal="true" aria-label="全局任务中心">
        <header class="task-center__head">
          <div>
            <strong>全局任务中心</strong>
            <small>进行中 {{ store.pendingCount }} · 失败 {{ store.failedCount }}</small>
          </div>
          <button type="button" aria-label="关闭任务中心" title="关闭" @click="store.open = false"><X :size="18" /></button>
        </header>

        <div class="task-center__filters">
          <label>
            <span>任务类型</span>
            <select v-model="typeFilter" aria-label="任务类型筛选">
              <option value="all">全部类型</option>
              <option v-for="type in store.taskTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </label>
          <label>
            <span>状态</span>
            <select v-model="statusFilter" aria-label="任务状态筛选">
              <option value="all">全部状态</option>
              <option value="queued">排队中</option>
              <option value="running">处理中</option>
              <option value="success">成功</option>
              <option value="failed">失败</option>
              <option value="cancelled">已取消</option>
            </select>
          </label>
          <label>
            <span>创建时间</span>
            <select v-model="periodFilter" aria-label="创建时间筛选">
              <option value="all">全部时间</option>
              <option value="today">今日</option>
              <option value="week">近一周</option>
              <option value="month">近一月</option>
              <option value="custom">自定义范围</option>
            </select>
          </label>
        </div>

        <div v-if="periodFilter === 'custom'" class="task-center__custom" data-testid="task-custom-range">
          <label><span>开始日期</span><input v-model="customStart" type="date" aria-label="开始日期" /></label>
          <span class="task-center__custom-sep">至</span>
          <label><span>结束日期</span><input v-model="customEnd" type="date" aria-label="结束日期" /></label>
          <button v-if="customStart || customEnd" type="button" title="清空日期" @click="clearCustomRange">清空</button>
          <small :class="{ 'is-error': !rangeCheck.ok }">{{ rangeCheck.ok ? '当前范围：' + rangeText : rangeCheck.reason }}</small>
        </div>
        <p v-else-if="periodFilter !== 'all'" class="task-center__range-note">当前范围：{{ rangeText }}</p>

        <div class="task-center__list">
          <p v-if="!store.filteredTasks.length" class="task-center__empty">暂无符合条件的任务，换个筛选条件看看。</p>
          <article v-for="task in store.filteredTasks" :key="task.id" class="task-card">
            <div class="task-card__top">
              <span :class="statusClass(task.status)">
                <Loader2 v-if="task.status === 'running'" :size="12" class="spin" />
                <Clock3 v-else-if="task.status === 'queued'" :size="12" />
                <CheckCircle2 v-else-if="task.status === 'success'" :size="12" />
                <AlertCircle v-else-if="task.status === 'failed'" :size="12" />
                <X v-else :size="12" />
                {{ TASK_STATUS_LABEL[task.status] }}
              </span>
              <time>{{ task.createdAt }}</time>
            </div>
            <h3>{{ task.name }}</h3>
            <p class="task-card__source">{{ task.sourceModule }} · {{ task.sourceLabel }}</p>

            <div v-if="task.status === 'running' && task.progress !== undefined" class="task-card__progress">
              <span :style="{ width: task.progress + '%' }" />
              <small>{{ task.progress }}%</small>
            </div>
            <p v-if="task.status === 'failed' && task.failureReason" class="task-card__reason">{{ task.failureReason }}</p>
            <p v-if="task.status === 'success'" class="task-card__artifact">
              <FileText :size="14" />{{ task.artifactName }}
              <em v-if="store.artifactExpired(task)">产物已过期，请重新发起任务</em>
              <em v-else>{{ remainingDays(task) }}</em>
            </p>

            <footer class="task-card__actions">
              <button type="button" @click="goSource(task)"><ExternalLink :size="13" />回来源</button>
              <button v-if="task.status === 'success'" type="button" :disabled="store.artifactExpired(task)" @click="download(task)">
                <Download :size="13" />取文件
              </button>
              <button class="task-card__delete" type="button" @click="askDelete(task)"><Trash2 :size="13" />删除</button>
              <ChevronRight :size="14" class="task-card__chevron" />
            </footer>
          </article>
        </div>

        <footer class="task-center__foot">本期只接入商品作业系统文件下载 · 任务只展示本人有权限查看的内容</footer>
      </aside>
    </template>

    <div v-if="notice" class="task-center__toast" role="status">{{ notice }}</div>

    <div v-if="confirmId" class="task-center__overlay" @mousedown.self="confirmId = ''">
      <section class="task-center__confirm" role="alertdialog" aria-modal="true" aria-label="删除任务确认">
        <strong>删除任务</strong>
        <p>删除后将无法在任务中心恢复。运行中的任务会同时终止后台执行，是否确认删除？</p>
        <footer>
          <button type="button" @click="confirmId = ''">取消</button>
          <button class="danger" type="button" @click="confirmDelete">确认删除</button>
        </footer>
      </section>
    </div>
  </div>
</template>

<style scoped>
.task-center { position: relative; z-index: 900; font-family: system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; }
.task-center__float {
  position: fixed; right: 24px; bottom: 24px; z-index: 901;
  display: flex; align-items: center; gap: 7px;
  height: 46px; padding: 0 16px;
  border: 0; border-radius: 24px;
  color: #fff; background: #1c1c1e;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .22);
  font-size: 14px; cursor: pointer;
}
.task-center__float:hover { background: #333; }
.task-center__float-text { font-size: 13px; }
.task-center__badge {
  display: grid; place-items: center; min-width: 19px; height: 19px; padding: 0 5px;
  border-radius: 10px; background: #e5484d; color: #fff; font-size: 11px; font-weight: 600;
}
.task-center__mask { position: fixed; inset: 0; z-index: 902; background: rgba(15, 18, 24, .18); }
.task-center__drawer {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 903;
  display: flex; flex-direction: column;
  width: min(430px, 100vw);
  background: #fff; box-shadow: -12px 0 36px rgba(0, 0, 0, .12);
}
.task-center__head {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 20px 20px 14px; border-bottom: 1px solid #ededed;
}
.task-center__head strong { display: block; font-size: 16px; font-weight: 600; }
.task-center__head small { display: block; margin-top: 5px; color: #8a8f98; font-size: 12px; }
.task-center__head button { display: grid; place-items: center; width: 30px; height: 30px; border: 0; border-radius: 8px; background: transparent; color: #666; cursor: pointer; }
.task-center__head button:hover { background: #f4f4f5; }
.task-center__filters { display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 20px; border-bottom: 1px solid #f2f2f3; }
.task-center__filters label { display: flex; flex-direction: column; gap: 4px; flex: 1 1 110px; min-width: 100px; }
.task-center__filters label span { color: #8a8f98; font-size: 11px; }
.task-center__filters select { height: 30px; padding: 0 8px; border: 1px solid #e4e5e8; border-radius: 7px; background: #fff; color: #333; font-size: 12px; }
.task-center__custom { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px; padding: 10px 20px 12px; border-bottom: 1px solid #f2f2f3; background: #fafbfc; }
.task-center__custom label { display: flex; flex: 0 1 150px; flex-direction: column; gap: 4px; }
.task-center__custom label span { color: #8a8f98; font-size: 11px; }
.task-center__custom input { height: 30px; padding: 0 7px; border: 1px solid #e4e5e8; border-radius: 7px; background: #fff; color: #333; font-size: 12px; }
.task-center__custom-sep { padding-bottom: 7px; color: #9298a1; font-size: 12px; }
.task-center__custom button { height: 30px; padding: 0 10px; border: 1px solid #e4e5e8; border-radius: 7px; background: #fff; color: #666; font-size: 12px; cursor: pointer; }
.task-center__custom small { flex: 1 1 100%; color: #7a8390; font-size: 11px; }
.task-center__custom small.is-error { color: #c53b3b; }
.task-center__range-note { margin: 0; padding: 8px 20px; border-bottom: 1px solid #f2f2f3; color: #8a8f98; font-size: 11px; }
.task-center__list { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 20px 24px; }
.task-center__empty { padding: 40px 0; text-align: center; color: #9aa0a8; font-size: 13px; }
.task-card { margin-bottom: 10px; padding: 14px; border: 1px solid #eceef1; border-radius: 11px; background: #fff; }
.task-card:hover { border-color: #d9dde3; box-shadow: 0 3px 12px rgba(0, 0, 0, .04); }
.task-card__top { display: flex; align-items: center; justify-content: space-between; }
.task-card__top time { color: #a2a7af; font-size: 11px; }
.task-status { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
.task-status--queued { color: #8a6d1f; background: #fdf5dd; }
.task-status--running { color: #2469c8; background: #eaf2ff; }
.task-status--success { color: #1d8a55; background: #e8f7ee; }
.task-status--failed { color: #c53b3b; background: #fdecec; }
.task-status--cancelled { color: #777; background: #f1f1f2; }
.spin { animation: task-spin 1s linear infinite; }
@keyframes task-spin { to { transform: rotate(360deg); } }
.task-card h3 { margin: 9px 0 4px; color: #1c1c1e; font-size: 14px; font-weight: 500; line-height: 20px; }
.task-card__source { margin: 0; color: #9298a1; font-size: 11px; }
.task-card__progress { position: relative; height: 5px; margin: 10px 0 4px; border-radius: 3px; background: #eef1f5; }
.task-card__progress span { display: block; height: 100%; border-radius: 3px; background: #3b7ae0; }
.task-card__progress small { position: absolute; right: 0; top: 7px; color: #9298a1; font-size: 10px; }
.task-card__reason { margin: 10px 0 0; padding: 7px 9px; border-radius: 7px; color: #b23b3b; background: #fff5f5; font-size: 12px; line-height: 18px; }
.task-card__artifact { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin: 10px 0 0; color: #4a505a; font-size: 12px; }
.task-card__artifact em { margin-left: auto; color: #9298a1; font-size: 11px; font-style: normal; }
.task-card__actions { display: flex; align-items: center; gap: 6px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #f2f2f3; }
.task-card__actions button { display: inline-flex; align-items: center; gap: 4px; height: 27px; padding: 0 9px; border: 1px solid #e6e8eb; border-radius: 7px; background: #fff; color: #4a505a; font-size: 11px; cursor: pointer; }
.task-card__actions button:hover { background: #f7f8fa; }
.task-card__actions button:disabled { color: #b9bec6; cursor: not-allowed; }
.task-card__actions .task-card__delete { color: #c53b3b; }
.task-card__chevron { margin-left: auto; color: #c3c7cd; }
.task-center__foot { padding: 12px 20px; border-top: 1px solid #ededed; color: #9aa0a8; font-size: 11px; line-height: 17px; }
.task-center__toast { position: fixed; right: 24px; bottom: 82px; z-index: 950; padding: 10px 16px; border-radius: 9px; color: #fff; background: #1c1c1e; box-shadow: 0 6px 20px rgba(0, 0, 0, .2); font-size: 13px; }
.task-center__overlay { position: fixed; inset: 0; z-index: 960; display: grid; place-items: center; background: rgba(15, 18, 24, .35); }
.task-center__confirm { width: min(360px, calc(100vw - 40px)); padding: 20px; border-radius: 13px; background: #fff; box-shadow: 0 18px 50px rgba(0, 0, 0, .2); }
.task-center__confirm strong { font-size: 15px; }
.task-center__confirm p { margin: 12px 0 18px; color: #5c626b; font-size: 13px; line-height: 21px; }
.task-center__confirm footer { display: flex; justify-content: flex-end; gap: 8px; }
.task-center__confirm footer button { height: 32px; padding: 0 14px; border: 1px solid #e4e5e8; border-radius: 8px; background: #fff; color: #444; font-size: 13px; cursor: pointer; }
.task-center__confirm footer .danger { border-color: #e5484d; background: #e5484d; color: #fff; }
</style>
