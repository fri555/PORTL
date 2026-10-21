<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { CheckCircle2, Link2, MoreHorizontal, RefreshCw, Search, Settings2 } from 'lucide-vue-next'
import { ElButton, ElDialog, ElForm, ElFormItem, ElInput, ElMessageBox, ElOption, ElSelect } from 'element-plus'
import { dingTalkImportTaskFixtures, scopedDingTalkImportTasks } from '@/mock/dingtalk-import-tasks'
import type { DingTalkDocumentMapping, DingTalkImportTask, DingTalkSyncFrequency, KnowledgeDestination } from '@/types/knowledge-source'
import { sourceContentNeedsUpdate } from '@/types/knowledge-permission'

const props = withDefaults(defineProps<{ destinations: KnowledgeDestination[]; canManage?: boolean; records?: DingTalkImportTask[]; viewerUserId?: string }>(), { canManage: true, viewerUserId: '' })
const emit = defineEmits<{ 'update-schedule': [importTaskId: string, frequency: DingTalkSyncFrequency, schedule: string] }>()
const fixtureRecords = ref<DingTalkImportTask[]>(structuredClone(dingTalkImportTaskFixtures))
const records = computed(() => props.canManage ? props.records ?? fixtureRecords.value : scopedDingTalkImportTasks(props.records ?? fixtureRecords.value, props.viewerUserId, 'user'))
const connectionOpen = ref(false), scheduleOpen = ref(false), connectionSaved = ref(true), connectionChecking = ref(false), notice = ref('')
const statusFilter = ref('all'), destinationFilter = ref('all'), keyword = ref('')
const dateStart = ref(''), dateEnd = ref('')
const recordPage = ref(1)
const activeRecord = ref<DingTalkImportTask | null>(null)
const detailRecord = ref<DingTalkImportTask | null>(null)
const connection = reactive({ clientId: 'dingxxxxxxxxxxxx', clientSecret: '' })
const scheduleDraft = reactive({ frequency: '不自动同步' as DingTalkSyncFrequency, time: '00:00', day: '周一' })
const dayOptions = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const canSaveSchedule = computed(() => scheduleDraft.frequency === '不自动同步' || /^([01]\d|2[0-3]):[0-5]\d$/.test(scheduleDraft.time))
const sourceNames = (record: DingTalkImportTask) => record.documentMappings.map(item => item.sourceName).join('；')
const documentSyncStatus = (mapping: DingTalkDocumentMapping) => {
  if (mapping.status === '失败') return '失败'
  const contentResult = mapping.contentResult ?? (sourceContentNeedsUpdate(mapping.sourceModifiedAt ?? '', mapping.lastSuccessfulModifiedAt) ? '已更新' : '未变化')
  return contentResult === '未变化' ? '跳过' : '成功'
}
const documentFailureReason = (mapping: DingTalkDocumentMapping) => {
  if (mapping.status !== '失败') return '—'
  const reason = mapping.failureReason?.trim() || '未返回具体失败原因'
  return `${reason}；${mapping.localFileId ? '保留最近成功版本' : '本次未导入'}`
}

const activeRecordsTab = ref<'tasks' | 'records'>('tasks')
const syncTasks = ref(records.value.map(record => ({
  taskId: record.taskId || record.importTaskId, importTaskId: record.importTaskId,
  user: record.userAlias, sourceDoc: sourceNames(record), destination: record.destinationPath,
  rule: `${record.frequency} ${record.schedule}`, latestExecutedAt: record.latestSyncAt,
  enabled: record.frequency !== '不自动同步',
})))
const taskMenuId = ref('')
function toggleTaskMenu(id: string) {
  taskMenuId.value = taskMenuId.value === id ? '' : id
}
function closeTaskMenu() {
  taskMenuId.value = ''
}

// 任务频率调整
const taskFreqOpen = ref(false)
const taskFreqTarget = ref<typeof syncTasks.value[number] | null>(null)
const taskFreqDraft = ref('每天')
const taskFreqTimeDraft = ref('09:00')
const taskFreqDayDraft = ref('周一')
function openTaskFreq(task: typeof syncTasks.value[number]) {
  taskFreqTarget.value = task
  const rule = task.rule
  if (rule.startsWith('每天')) {
    taskFreqDraft.value = '每天'
    const t = rule.match(/(\d{2}:\d{2})/)
    taskFreqTimeDraft.value = t ? t[1] : '09:00'
  } else if (rule.startsWith('每周')) {
    taskFreqDraft.value = '每周'
    const t = rule.match(/(\d{2}:\d{2})/)
    taskFreqTimeDraft.value = t ? t[1] : '09:00'
    const day = dayOptions.find(d => rule.includes(d))
    taskFreqDayDraft.value = day || '周一'
  } else {
    taskFreqDraft.value = '每天'
    taskFreqTimeDraft.value = '09:00'
  }
  taskFreqOpen.value = true
  closeTaskMenu()
}
function saveTaskFreq() {
  if (!taskFreqTarget.value) return
  let newRule: string
  if (taskFreqDraft.value === '每天') {
    newRule = `每天 ${taskFreqTimeDraft.value}`
  } else {
    newRule = `每周一次 ${taskFreqDayDraft.value} ${taskFreqTimeDraft.value}`
  }
  taskFreqTarget.value.rule = newRule
  const record = records.value.find(item => item.importTaskId === taskFreqTarget.value?.importTaskId)
  if (record) emit('update-schedule', record.importTaskId, taskFreqDraft.value as DingTalkSyncFrequency, taskFreqDraft.value === '每周' ? `${taskFreqDayDraft.value} ${taskFreqTimeDraft.value}` : taskFreqTimeDraft.value)
  taskFreqOpen.value = false
  notice.value = `已更新任务 ${taskFreqTarget.value.taskId} 的同步频率。`
}

// 删除确认
function deleteTask(taskId: string) {
  closeTaskMenu()
  ElMessageBox.confirm(
    '确认删除此项钉钉文档同步任务',
    '删除确认',
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    syncTasks.value = syncTasks.value.filter(t => t.taskId !== taskId)
    notice.value = `已删除任务 ${taskId}。`
  }).catch(() => {})
}

function toggleTaskStatus(taskId: string) {
  const task = syncTasks.value.find(t => t.taskId === taskId)
  if (task) {
    task.enabled = !task.enabled
    notice.value = `任务 ${taskId} 已${task.enabled ? '启用' : '停用'}。`
  }
}

// Mock 管理员权限
const isAdmin = ref(true)

// 通知弹窗
const notifyOpen = ref(false)
const notifyRecord = ref<DingTalkImportTask | null>(null)
function openNotify(record: DingTalkImportTask) {
  notifyRecord.value = record
  notifyOpen.value = true
}

// 保存位置选项
const destinationOptions = computed(() => {
  const set = new Set(records.value.map(r => r.destinationPath))
  return [...set]
})

const filteredRecords = computed(() => {
  const search = keyword.value.trim().toLocaleLowerCase()
  return records.value.filter(item => {
    // 状态筛选
    if (statusFilter.value !== 'all' && item.status !== statusFilter.value) return false
    // 保存位置筛选
    if (destinationFilter.value !== 'all' && item.destinationPath !== destinationFilter.value) return false
    // 日期筛选
    const syncDate = item.latestSyncAt.split(' ')[0]
    if (dateStart.value && syncDate < dateStart.value) return false
    if (dateEnd.value && syncDate > dateEnd.value) return false
    // 搜索
    if (search && ![item.userAlias, sourceNames(item), item.destinationPath].some(value => value.toLocaleLowerCase().includes(search))) return false
    return true
  })
})
const visibleRecords = computed(() => filteredRecords.value.slice((recordPage.value - 1) * 8, recordPage.value * 8))
const recordPages = computed(() => Math.max(1, Math.ceil(filteredRecords.value.length / 8)))
watch([keyword, statusFilter, destinationFilter, dateStart, dateEnd], () => { recordPage.value = 1 })
const visibleTasks = computed(() => syncTasks.value.filter(task => {
  const search = keyword.value.trim().toLocaleLowerCase()
  return (!search || [task.user, task.sourceDoc, task.destination].some(value => value.toLocaleLowerCase().includes(search)))
    && (destinationFilter.value === 'all' || task.destination === destinationFilter.value)
    && (!dateStart.value || task.latestExecutedAt.slice(0, 10) >= dateStart.value)
    && (!dateEnd.value || task.latestExecutedAt.slice(0, 10) <= dateEnd.value)
}))

function testConnection() {
  if (!props.canManage || !connection.clientId.trim() || !connection.clientSecret.trim()) return
  connectionChecking.value = true
  window.setTimeout(() => { connectionChecking.value = false; connectionSaved.value = true; connection.clientSecret = ''; connectionOpen.value = false; notice.value = '数据源连接已更新。' }, 500)
}
function openSchedule(record: DingTalkImportTask) {
  if (!records.value.some(item => item.importTaskId === record.importTaskId)) return
  activeRecord.value = record
  scheduleDraft.frequency = record.frequency
  scheduleDraft.day = '周一'
  if (record.frequency === '每周') {
    const parts = record.schedule.split(' ')
    // 格式: "每周一次 周一 09:00"
    const dayPart = parts.find(p => dayOptions.includes(p))
    if (dayPart) scheduleDraft.day = dayPart
    const timePart = parts.find(p => /^\d{2}:\d{2}$/.test(p))
    scheduleDraft.time = timePart || '00:00'
  } else if (record.frequency === '每天') {
    const parts = record.schedule.split(' ')
    const timePart = parts.find(p => /^\d{2}:\d{2}$/.test(p))
    scheduleDraft.time = timePart || '00:00'
  } else {
    scheduleDraft.time = '00:00'
  }
  scheduleOpen.value = true
}
function saveSchedule() {
  if (!activeRecord.value || !canSaveSchedule.value || !records.value.some(item => item.importTaskId === activeRecord.value?.importTaskId)) return
  let schedule: string
  if (scheduleDraft.frequency === '不自动同步') {
    schedule = '—'
  } else if (scheduleDraft.frequency === '每周') {
    schedule = `每周一次 ${scheduleDraft.day} ${scheduleDraft.time}`
  } else {
    schedule = `每天一次 ${scheduleDraft.time}`
  }
  if (props.records) emit('update-schedule', activeRecord.value.importTaskId, scheduleDraft.frequency, schedule)
  else { activeRecord.value.frequency = scheduleDraft.frequency; activeRecord.value.schedule = schedule }
  scheduleOpen.value = false
  notice.value = `已更新任务 ${activeRecord.value.importTaskId} 的同步规则。`
}
function getTaskFailureReason(record: DingTalkImportTask): string {
  if (record.failureReason) return record.failureReason
  const failedMapping = record.documentMappings.find(m => m.status === '失败' && m.failureReason)
  return failedMapping?.failureReason ?? '未知原因'
}
watch(() => [props.viewerUserId, props.canManage], () => { connectionOpen.value = false; scheduleOpen.value = false; activeRecord.value = null; notice.value = '' })
</script>

<template>
<section v-if="canManage || viewerUserId" class="access-panel" :aria-label="canManage ? '数据源管理' : '我的同步记录'" :data-testid="canManage ? 'knowledge-access-admin' : 'knowledge-sync-personal'">
  <!-- 页头：标题 + 搜索框（右上角） -->
  <header class="page-head">
    <h1>{{ canManage ? '数据源' : '同步记录' }}</h1>
    <div class="page-head-actions">
      <label class="record-search"><Search :size="15"/><input v-model="keyword" aria-label="搜索同步记录" placeholder="搜索花名、来源或落点"/></label>
      <ElButton v-if="canManage && isAdmin" @click="connectionOpen = true"><Settings2 :size="15"/>配置连接</ElButton>
    </div>
  </header>
  <p v-if="notice" class="notice" role="status"><CheckCircle2 :size="15"/>{{ notice }}</p>
  <section v-if="canManage && isAdmin" class="connection-card" data-testid="dingtalk-connection-card">
    <span class="dingtalk-logo">钉</span><div><strong>钉钉文档</strong><small>数据源连接</small></div>
    <span class="connection-state"><i/>{{ connectionSaved ? '已连接' : '未连接' }}</span>
    <button type="button" @click="connectionOpen = true"><Link2 :size="14"/>{{ connectionSaved ? '修改配置' : '配置连接' }}</button>
  </section>
  <!-- 同步记录区域 -->
  <section class="records-section">
    <h2>{{ canManage ? '同步记录' : '我的导入任务' }}</h2>
    <!-- Tab 切换 -->
    <div class="records-tabs">
      <button :class="['tab-btn', activeRecordsTab === 'tasks' ? 'active' : '']" @click="activeRecordsTab = 'tasks'">任务</button>
      <button :class="['tab-btn', activeRecordsTab === 'records' ? 'active' : '']" @click="activeRecordsTab = 'records'">记录</button>
    </div>
    <!-- 筛选栏：日期、保存位置、状态（仅记录 Tab 显示） -->
    <div class="filter-bar">
      <div class="filter-item">
        <label>日期</label>
        <div class="date-range">
          <input type="date" v-model="dateStart" class="date-input" aria-label="开始日期"/>
          <span class="date-sep">–</span>
          <input type="date" v-model="dateEnd" class="date-input" aria-label="结束日期"/>
        </div>
      </div>
      <div class="filter-item">
        <label>保存位置</label>
        <select v-model="destinationFilter" class="filter-select" aria-label="筛选保存位置">
          <option value="all">全部位置</option>
          <option v-for="dest in destinationOptions" :key="dest" :value="dest">{{ dest }}</option>
        </select>
      </div>
      <div v-if="activeRecordsTab === 'records'" class="filter-item">
        <label>状态</label>
        <select v-model="statusFilter" class="filter-select" aria-label="筛选同步状态">
          <option value="all">全部状态</option>
          <option value="同步成功">同步成功</option>
          <option value="同步中">同步中</option>
          <option value="部分失败">部分失败</option>
          <option value="同步失败">同步失败</option>
        </select>
      </div>
    </div>
    <!-- 记录 Tab -->
    <template v-if="activeRecordsTab === 'records'">
    <!-- 表格 -->
    <div class="record-table">
      <div class="record-head record-head-8col">
        <span class="id-col">记录 ID</span>
        <span class="id-col">任务 ID</span>
        <span>人员</span>
        <span>来源文档</span>
        <span>保存位置</span>
        <span>同步规则</span>
        <span>执行时间</span>
        <span>状态</span>
      </div>
      <article v-for="record in visibleRecords" :key="record.recordId || record.importTaskId" class="record-row record-row-8col" data-testid="dingtalk-sync-record">
        <button type="button" class="id-cell record-detail-link" :aria-label="`查看同步记录${record.recordId || record.importTaskId}`" @click="detailRecord = record">{{ record.recordId || '—' }}</button>
        <span class="id-cell">{{ record.taskId || record.importTaskId }}</span>
        <strong>{{ record.userAlias }}</strong>
        <div class="source-cell" :title="sourceNames(record)">{{ sourceNames(record) }}</div>
        <div class="destination-cell">{{ record.destinationPath }}</div>
        <div class="rule-cell"><span>{{ record.frequency }}</span><small>{{ record.schedule }}</small></div>
        <span class="exec-time">{{ record.executedAt || '—' }}</span>
        <span class="record-status" :title="record.failureReason || record.documentMappings.find(item => item.failureReason)?.failureReason" :class="record.status.includes('失败') ? 'warning' : record.status === '同步中' ? 'running' : 'success'"><i/>{{ record.status }}</span>
      </article>
      <p v-if="!filteredRecords.length" class="empty-records">暂无匹配的同步记录</p>
    </div>
    <footer v-if="filteredRecords.length > 8" class="record-pagination"><span>共 {{ filteredRecords.length }} 条</span><button type="button" :disabled="recordPage === 1" @click="recordPage--">上一页</button><span>{{ recordPage }} / {{ recordPages }}</span><button type="button" :disabled="recordPage >= recordPages" @click="recordPage++">下一页</button></footer>
    </template>
    <!-- 任务 Tab -->
    <template v-if="activeRecordsTab === 'tasks'">
    <div class="record-table" @click.self="closeTaskMenu">
      <div class="record-head task-head">
        <span class="id-col">任务 ID</span>
        <span>人员</span>
        <span>来源文档</span>
        <span>保存位置</span>
        <span>同步规则</span>
        <span>最新执行时间</span>
        <span>状态</span>
        <span class="menu-col"></span>
      </div>
      <article v-for="task in visibleTasks" :key="task.taskId" class="record-row task-row" @click="closeTaskMenu">
        <span class="id-cell">{{ task.taskId }}</span>
        <strong>{{ task.user }}</strong>
        <div class="source-cell">{{ task.sourceDoc }}</div>
        <div class="destination-cell">{{ task.destination }}</div>
        <div class="rule-cell"><span>{{ task.rule }}</span></div>
        <span class="exec-time">{{ task.latestExecutedAt }}</span>
        <label class="switch" :class="{ on: task.enabled }" @click.stop>
          <input type="checkbox" :checked="task.enabled" @change="toggleTaskStatus(task.taskId)" />
          <span class="switch-slider"></span>
        </label>
        <div class="menu-cell" @click.stop>
          <button type="button" class="menu-trigger" aria-label="操作菜单" :aria-expanded="taskMenuId === task.taskId" @click="toggleTaskMenu(task.taskId)"><MoreHorizontal :size="16" /></button>
          <div v-if="taskMenuId === task.taskId" class="person-menu" role="menu">
            <button type="button" role="menuitem" @click="openTaskFreq(task)">调整频率</button>
            <button type="button" role="menuitem" class="danger-item" @click="deleteTask(task.taskId)">删除</button>
          </div>
        </div>
      </article>
      <p v-if="!visibleTasks.length" class="empty-records">暂无同步任务</p>
    </div>
    </template>
  </section>
  <ElDialog :model-value="Boolean(detailRecord)" title="同步详情" width="min(900px,95vw)" align-center @close="detailRecord = null">
    <section v-if="detailRecord" data-testid="dingtalk-sync-detail" class="sync-detail">
      <p>任务 ID：{{ detailRecord.taskId || detailRecord.importTaskId }} · {{ detailRecord.destinationPath }}</p>
      <p class="detail-policy">首次初始化人员和部门权限，群授权暂未导入；后续权限在天马智擎维护。每次同步仍校验执行人的源文档查看、下载权限及落点管理权限。</p>
      <p class="detail-policy">更新时间未变就跳过；时间变化后比较哈希，内容也变化才全量覆盖。新内容和索引就绪后切换，旧索引失效。</p>
      <table>
        <thead><tr><th>来源文档</th><th>源更新时间</th><th>同步状态</th><th>失败原因</th></tr></thead>
        <tbody>
          <tr v-for="mapping in detailRecord.documentMappings" :key="mapping.sourceDocumentId">
            <td>{{ mapping.sourceName }}</td>
            <td>{{ mapping.sourceModifiedAt || '—' }}</td>
            <td>{{ documentSyncStatus(mapping) }}</td>
            <td>{{ documentFailureReason(mapping) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
    <template #footer><ElButton @click="detailRecord = null">关闭</ElButton></template>
  </ElDialog>
  <ElDialog v-if="canManage && isAdmin" v-model="connectionOpen" title="配置数据源连接" width="520px" align-center :close-on-click-modal="false"><ElForm label-position="top" @submit.prevent="testConnection"><ElFormItem label="Client ID" required><ElInput v-model="connection.clientId" maxlength="256" autocomplete="off" placeholder="请输入 Client ID"/></ElFormItem><ElFormItem label="Client Secret" required><ElInput v-model="connection.clientSecret" type="password" show-password maxlength="512" autocomplete="new-password" placeholder="请输入 Client Secret"/></ElFormItem></ElForm><template #footer><ElButton @click="connectionOpen = false">取消</ElButton><ElButton type="primary" :disabled="!connection.clientId.trim() || !connection.clientSecret.trim()" :loading="connectionChecking" @click="testConnection">测试连接并保存</ElButton></template></ElDialog>
  <ElDialog v-model="scheduleOpen" title="同步设置" width="480px" align-center><p class="dialog-source"><strong>{{ activeRecord?.importTaskId }}</strong><br/>{{ activeRecord ? sourceNames(activeRecord) : '' }}</p><ElForm label-position="top"><ElFormItem label="同步频率"><select v-model="scheduleDraft.frequency" class="dialog-select"><option value="不自动同步">不自动同步</option><option value="每天">每天</option><option value="每周">每周</option></select></ElFormItem><ElFormItem v-if="scheduleDraft.frequency !== '不自动同步'" :label="scheduleDraft.frequency === '每周' ? '每周一次执行时间' : '执行时间'"><ElInput v-model="scheduleDraft.time" type="time"/></ElFormItem><ElFormItem v-if="scheduleDraft.frequency === '每周'" label="执行星期"><ElSelect v-model="scheduleDraft.day" style="width:100%"><ElOption v-for="d in dayOptions" :key="d" :label="d" :value="d"/></ElSelect></ElFormItem></ElForm><template #footer><ElButton @click="scheduleOpen = false">取消</ElButton><ElButton type="primary" :disabled="!canSaveSchedule" @click="saveSchedule"><RefreshCw :size="14"/>保存</ElButton></template></ElDialog>
  <ElDialog v-model="taskFreqOpen" title="调整同步频率" width="420px" align-center>
    <p class="dialog-source"><strong>{{ taskFreqTarget?.taskId }}</strong></p>
    <ElForm label-position="top">
      <ElFormItem label="同步频率">
        <select v-model="taskFreqDraft" class="dialog-select">
          <option value="每天">每天</option>
          <option value="每周">每周</option>
        </select>
      </ElFormItem>
      <ElFormItem :label="taskFreqDraft === '每周' ? '每周一次执行时间' : '执行时间'">
        <ElInput v-model="taskFreqTimeDraft" type="time"/>
      </ElFormItem>
      <ElFormItem v-if="taskFreqDraft === '每周'" label="执行星期">
        <ElSelect v-model="taskFreqDayDraft" style="width:100%">
          <ElOption v-for="d in dayOptions" :key="d" :label="d" :value="d"/>
        </ElSelect>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="taskFreqOpen = false">取消</ElButton>
      <ElButton type="primary" @click="saveTaskFreq"><RefreshCw :size="14"/>保存</ElButton>
    </template>
  </ElDialog>
  <ElDialog v-model="notifyOpen" title="待办任务执行通知" width="480px" align-center>
    <div class="notify-body" v-if="notifyRecord">
      <p><strong>任务名称：</strong>{{ sourceNames(notifyRecord) }}</p>
      <p><strong>待办名称：</strong>{{ notifyRecord.documentMappings[0]?.sourceName || '—' }}</p>
      <p><strong>执行时间：</strong>{{ notifyRecord.executedAt || notifyRecord.latestSyncAt }}</p>
      <p><strong>执行状态：</strong><span class="record-status warning"><i/>{{ notifyRecord.status }}</span></p>
      <p><strong>失败原因：</strong>{{ getTaskFailureReason(notifyRecord) }}</p>
      <p class="notify-link"><a href="javascript:void(0)">查看详情</a></p>
    </div>
    <template #footer><ElButton type="primary" @click="notifyOpen = false">关闭</ElButton></template>
  </ElDialog>
</section>
</template>

<style scoped>
.record-pagination{display:flex;align-items:center;justify-content:flex-end;gap:14px;margin-top:14px;font-size:12px;color:#888}.record-pagination button{border:1px solid #e5e7eb;border-radius:5px;background:#fff;padding:5px 9px;cursor:pointer}.record-pagination button:disabled{color:#ccc;cursor:not-allowed}
.record-detail-link{border:0;background:transparent;color:#1677ff;cursor:pointer;text-align:left;font:12px inherit}.sync-detail>p{font-size:13px;color:#555}.sync-detail .detail-policy{font-size:12px;color:#9099a5;line-height:1.7}.sync-detail table{width:100%;margin-top:20px;border-collapse:collapse;text-align:left;font-size:12px}.sync-detail th{padding:12px;background:#f7f8fa;color:#666;font-weight:500}.sync-detail td{padding:14px 12px;border-bottom:1px solid #eee;vertical-align:top;max-width:260px}.sync-detail small{display:block;color:#999;font-size:11px;margin-top:5px;line-height:1.6}
.access-panel{min-height:0;flex:1;overflow:auto;padding:28px 8px 54px;color:#20242a;font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif}
.page-head{display:flex;align-items:center;justify-content:space-between;gap:16px}
.page-head h1{margin:0;font-size:20px;font-weight:600}
.page-head-actions{display:flex;align-items:center;gap:12px}
.page-head :deep(.el-button){display:flex;align-items:center;gap:6px}
.notice{display:flex;align-items:center;gap:7px;margin:14px 0 0;border-radius:8px;background:#eef8f3;padding:9px 12px;color:#208257;font-size:12px}
.connection-card{display:grid;grid-template-columns:42px minmax(0,1fr) auto auto;align-items:center;gap:12px;margin-top:22px;border:1px solid #e4e7eb;border-radius:12px;padding:16px 18px;background:#fff}
.dingtalk-logo{display:grid;width:38px;height:38px;place-items:center;border-radius:10px;background:#e9f3ff;color:#1677ff;font-size:18px;font-weight:700}
.connection-card strong,.connection-card small{display:block}
.connection-card strong{font-size:14px}
.connection-card small{margin-top:3px;color:#9299a3;font-size:11px}
.connection-state{display:flex;align-items:center;gap:6px;color:#26835b;font-size:12px}
.connection-state i,.record-status i{width:7px;height:7px;flex:none;border-radius:50%;background:currentColor}
.connection-card button,.schedule-action,.notify-action{display:flex;align-items:center;gap:5px;border:0;background:transparent;color:#3376c5;font:12px inherit;cursor:pointer}
.notify-action{color:#c47a1c}
.records-section{margin-top:34px}
.records-section h2{margin:0 0 16px;font-size:16px}
/* Tab 切换 */
.records-tabs{display:flex;gap:8px;margin-bottom:16px}
.tab-btn{padding:4px 16px;border-radius:20px;border:1px solid #d1d5db;background:#fff;color:#6b7280;font-size:13px;cursor:pointer;transition:all .15s}
.tab-btn.active{background:#2563eb;color:#fff;border-color:#2563eb}
/* 任务表格 */
.task-head{grid-template-columns:64px 72px minmax(160px,1.3fr) minmax(140px,1.1fr) 110px 140px 70px 50px}
.task-row{grid-template-columns:64px 72px minmax(160px,1.3fr) minmax(140px,1.1fr) 110px 140px 70px 50px}
.menu-col{width:50px}
.menu-cell{position:relative;width:40px;text-align:center}
.menu-trigger{display:inline-grid;place-items:center;width:28px;height:28px;border:1px solid transparent;border-radius:6px;background:transparent;color:#71717a;cursor:pointer;transition:all .15s}
.menu-trigger:hover{border-color:#d4d4d8;color:#18181b;background:#f4f4f5}
.person-menu{position:absolute;right:8px;top:100%;z-index:20;min-width:90px;padding:4px;border:1px solid #e4e4e7;border-radius:8px;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,.08)}
.person-menu button{display:block;width:100%;padding:6px 10px;border:0;border-radius:5px;background:transparent;text-align:left;font-size:13px;color:#3f3f46;cursor:pointer}
.person-menu button:hover{background:#f4f4f5}
.person-menu .danger-item{color:#c73535}
.person-menu .danger-item:hover{background:#fef2f2}
.switch{position:relative;display:inline-block;width:32px;height:18px;flex:none;cursor:pointer}
.switch input{opacity:0;width:0;height:0;position:absolute}
.switch-slider{position:absolute;inset:0;border-radius:18px;background:#d1d5db;transition:background .2s}
.switch-slider::before{content:'';position:absolute;width:14px;height:14px;left:2px;top:2px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 2px rgba(0,0,0,.15)}
.switch.on .switch-slider{background:#22c55e}
.switch.on .switch-slider::before{transform:translateX(14px)}
.id-col{font-variant-numeric:tabular-nums}
.id-cell{color:#9199a3;font-size:11px;font-variant-numeric:tabular-nums;letter-spacing:.02em}
.record-status.success{color:#27855b}
/* 筛选栏 */
.filter-bar{display:flex;align-items:flex-end;gap:20px;margin-bottom:14px;padding:14px 16px;border:1px solid #e5e8ec;border-radius:10px;background:#fafbfc}
.filter-item{display:flex;flex-direction:column;gap:6px}
.filter-item>label{font-size:11px;color:#717985;font-weight:500}
.date-range{display:flex;align-items:center;gap:6px}
.date-input{height:32px;border:1px solid #dcdfe6;border-radius:7px;padding:0 8px;color:#4a5563;font-size:12px;outline:none;background:#fff}
.date-input:focus{border-color:#1677ff}
.date-sep{color:#9199a3;font-size:12px}
.filter-select{height:32px;border:1px solid #dcdfe6;border-radius:7px;background:#fff;padding:0 10px;color:#4a5563;font-size:12px;outline:none;min-width:140px}
.filter-select:focus{border-color:#1677ff}
/* 搜索框 */
.record-search{display:flex;height:32px;width:240px;align-items:center;gap:7px;border:1px solid #dcdfe6;border-radius:7px;padding:0 10px;color:#9199a3;background:#fff}
.record-search input{width:100%;border:0;outline:none;color:#4a5563;font:12px inherit}
/* 表格 */
.record-table{overflow:auto;border:1px solid #e5e8ec;border-radius:12px}
.record-head,.record-row{display:grid;min-width:1080px;align-items:center;gap:10px;padding:0 16px}
.record-head-8col{grid-template-columns:64px 64px 72px minmax(180px,1.5fr) minmax(155px,1.2fr) 100px 140px 82px}
.record-row-8col{grid-template-columns:64px 64px 72px minmax(180px,1.5fr) minmax(155px,1.2fr) 100px 140px 82px}
.record-head{height:40px;background:#f7f8fa;color:#717985;font-size:11px}
.record-row{min-height:72px;border-top:1px solid #edf0f3;font-size:12px;line-height:1.6}
.record-row>strong{font-weight:500}
.record-row small{display:block;margin-top:4px;color:#969da7;font-size:10px}
.source-cell,.destination-cell{padding:10px 0;overflow-wrap:anywhere}
.rule-cell span{display:block}
.record-status{display:flex;align-items:center;gap:5px;color:#27855b;font-size:11px}
.record-status.warning{color:#c47a1c}
.record-status.running{color:#2572c7}
.exec-time{color:#596371;font-size:11px;white-space:nowrap}
.action-cell{display:flex;align-items:center;gap:8px}
.dialog-source{margin:0 0 16px;border-radius:8px;background:#f6f7f9;padding:10px 12px;color:#596371;font-size:12px;line-height:1.7}
.dialog-select{width:100%;height:32px;border:1px solid #dcdfe6;border-radius:7px;background:#fff;padding:0 10px;color:#4a5563;font-size:12px;outline:none}
.empty-records{padding:36px 16px;color:#8c949e;font-size:12px;text-align:center}
/* 通知弹窗 */
.notify-body p{margin:0 0 10px;font-size:13px;line-height:1.7;color:#303846}
.notify-body strong{color:#4a5563}
.notify-link a{color:#3376c5;font-size:13px;text-decoration:underline}
@media(max-width:640px){
  .access-panel{padding:20px 0}
  .connection-card{grid-template-columns:42px 1fr auto}
  .connection-state{grid-column:2}
  .connection-card button{grid-column:3;grid-row:1/3}
  .page-head{align-items:flex-start;flex-direction:column}
  .page-head-actions{width:100%;flex-wrap:wrap}
  .record-search{min-width:0;flex:1}
  .filter-bar{flex-direction:column;align-items:stretch}
  .page-head h1{font-size:18px}
}
</style>
