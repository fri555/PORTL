<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { CheckCircle2, Link2, MoreHorizontal, Search, Settings2 } from 'lucide-vue-next'
import { ElButton, ElDialog, ElForm, ElFormItem, ElInput } from 'element-plus'
import { dingTalkImportTaskFixtures, scopedDingTalkImportTasks } from '@/mock/dingtalk-import-tasks'
import type { DingTalkDocumentMapping, DingTalkImportTask, DingTalkSyncFrequency, KnowledgeDestination } from '@/types/knowledge-source'
import { sourceContentNeedsUpdate } from '@/types/knowledge-permission'

const props = withDefaults(defineProps<{
  destinations: KnowledgeDestination[]
  canManage?: boolean
  records?: DingTalkImportTask[]
  executionRecords?: DingTalkImportTask[]
  viewerUserId?: string
  agentReferenceOptions?: { id: string; name: string; documentIds: string[] }[]
}>(), { canManage: true, viewerUserId: '', agentReferenceOptions: () => [] })
const emit = defineEmits<{
  'edit-task': [task: DingTalkImportTask]
  'update-schedule': [importTaskId: string, frequency: DingTalkSyncFrequency, schedule: string]
  'toggle-task': [importTaskId: string, enabled: boolean]
  'delete-task': [importTaskId: string]
}>()

const scoped = (rows: DingTalkImportTask[]) => props.canManage ? rows : scopedDingTalkImportTasks(rows, props.viewerUserId, 'user')
const tasks = computed(() => scoped(props.records ?? dingTalkImportTaskFixtures).filter(record => record.taskKind !== 'agent-reference'))
const executionRecords = computed(() => scoped(props.executionRecords ?? props.records ?? dingTalkImportTaskFixtures).filter(record => record.recordId || record.executedAt))
const activeRecordsTab = ref<'tasks' | 'records'>('tasks')
const keyword = ref(''), statusFilter = ref('all'), destinationFilter = ref('all'), dateStart = ref(''), dateEnd = ref('')
const recordPage = ref(1), detailRecord = ref<DingTalkImportTask | null>(null)
const connectionOpen = ref(false), connectionChecking = ref(false), notice = ref('')
const connection = reactive({ clientId: 'dingxxxxxxxxxxxx', clientSecret: '' })
const taskMenuId = ref('')
const hiddenTaskIds = ref<string[]>([])
const enabledDraft = reactive<Record<string, boolean>>({})
const scheduleTask = ref<DingTalkImportTask | null>(null)
const scheduleFrequency = ref<DingTalkSyncFrequency>('每天')
const scheduleTime = ref('00:00')
const scheduleWeekDay = ref('周一')
const scheduleMonthDay = ref('1日')
const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const monthDays = Array.from({ length: 28 }, (_, index) => `${index + 1}日`)

const sourceNames = (record: DingTalkImportTask) => record.documentMappings.map(mapping => mapping.sourceName).join('；')
const syncRule = (record: DingTalkImportTask) => `${record.frequency ?? '不自动同步'}${record.frequency && record.frequency !== '不自动同步' && record.schedule && record.schedule !== '—' ? ` ${record.schedule}` : ''}`
const agentNames = (record: DingTalkImportTask) => (record.referencedAgentIds ?? []).map(id => props.agentReferenceOptions.find(agent => agent.id === id)?.name ?? id).join('、') || '无引用'
const refreshResult = (record: DingTalkImportTask) => record.referenceRefreshResult ?? (record.referencedAgentIds?.length ? '待后台接入' : '无引用')
const failureReason = (record: DingTalkImportTask) => record.failureReason || record.documentMappings.find(mapping => mapping.status === '失败')?.failureReason || ''
const resultText = (record: DingTalkImportTask) => failureReason(record) || refreshResult(record)
const destinationOptions = computed(() => [...new Set([...tasks.value, ...executionRecords.value].map(record => record.destinationPath))])
const filteredTasks = computed(() => {
  const search = keyword.value.trim().toLocaleLowerCase()
  return tasks.value.filter(record => !hiddenTaskIds.value.includes(record.importTaskId)
    && (destinationFilter.value === 'all' || record.destinationPath === destinationFilter.value)
    && (!dateStart.value || record.latestSyncAt.slice(0, 10) >= dateStart.value)
    && (!dateEnd.value || record.latestSyncAt.slice(0, 10) <= dateEnd.value)
    && (!search || [record.taskId ?? record.importTaskId, record.userAlias, sourceNames(record), record.destinationPath].some(value => value.toLocaleLowerCase().includes(search))))
})
const filteredRecords = computed(() => {
  const search = keyword.value.trim().toLocaleLowerCase()
  return executionRecords.value.filter(record => (statusFilter.value === 'all' || record.status === statusFilter.value)
    && (destinationFilter.value === 'all' || record.destinationPath === destinationFilter.value)
    && (!dateStart.value || record.latestSyncAt.slice(0, 10) >= dateStart.value)
    && (!dateEnd.value || record.latestSyncAt.slice(0, 10) <= dateEnd.value)
    && (!search || [record.userAlias, sourceNames(record), record.destinationPath, agentNames(record)].some(value => value.toLocaleLowerCase().includes(search))))
})
const currentRows = computed(() => activeRecordsTab.value === 'tasks' ? filteredTasks.value : filteredRecords.value)
const visibleTasks = computed(() => filteredTasks.value.slice((recordPage.value - 1) * 8, recordPage.value * 8))
const visibleRecords = computed(() => filteredRecords.value.slice((recordPage.value - 1) * 8, recordPage.value * 8))
const recordPages = computed(() => Math.max(1, Math.ceil(currentRows.value.length / 8)))
watch([keyword, statusFilter, destinationFilter, dateStart, dateEnd, activeRecordsTab], () => { recordPage.value = 1; taskMenuId.value = '' })
watch(recordPages, pages => { recordPage.value = Math.min(recordPage.value, pages) })

const documentSyncStatus = (mapping: DingTalkDocumentMapping) => {
  if (mapping.status === '失败') return '失败'
  const result = mapping.contentResult ?? (sourceContentNeedsUpdate(mapping.sourceModifiedAt ?? '', mapping.lastSuccessfulModifiedAt) ? '已更新' : '未变化')
  return result === '未变化' ? '跳过' : '成功'
}
const documentFailureReason = (mapping: DingTalkDocumentMapping) => mapping.status !== '失败' ? '—'
  : (mapping.failureReason?.trim() || '未返回具体失败原因') + '；' + (mapping.localFileId ? '保留最近成功版本' : '本次未导入')
const taskEnabled = (task: DingTalkImportTask) => enabledDraft[task.importTaskId] ?? task.enabled ?? task.frequency !== '不自动同步'
function toggleTask(task: DingTalkImportTask) {
  const enabled = !taskEnabled(task)
  enabledDraft[task.importTaskId] = enabled
  emit('toggle-task', task.importTaskId, enabled)
}
function editTask(task: DingTalkImportTask) {
  taskMenuId.value = ''
  emit('edit-task', { ...task, documentMappings: task.documentMappings.map(mapping => ({ ...mapping })) })
}
function deleteTask(task: DingTalkImportTask) {
  taskMenuId.value = ''
  hiddenTaskIds.value = [...hiddenTaskIds.value, task.importTaskId]
  emit('delete-task', task.importTaskId)
  notice.value = '任务已删除'
}
function openSchedule(task: DingTalkImportTask) {
  taskMenuId.value = ''
  scheduleTask.value = task
  scheduleFrequency.value = task.frequency ?? '不自动同步'
  const parts = (task.schedule ?? '').split(' ')
  scheduleTime.value = parts.find(part => /^\d{2}:\d{2}$/.test(part)) ?? '00:00'
  scheduleWeekDay.value = weekDays.find(day => parts.includes(day)) ?? '周一'
  scheduleMonthDay.value = monthDays.find(day => parts.includes(day)) ?? '1日'
}
function saveSchedule() {
  if (!scheduleTask.value) return
  const schedule = scheduleFrequency.value === '不自动同步' ? '—'
    : scheduleFrequency.value === '每周' ? `${scheduleWeekDay.value} ${scheduleTime.value}`
      : scheduleFrequency.value === '每月' ? `${scheduleMonthDay.value} ${scheduleTime.value}` : scheduleTime.value
  emit('update-schedule', scheduleTask.value.importTaskId, scheduleFrequency.value, schedule)
  scheduleTask.value = null
  notice.value = '同步频率已更新'
}

let connectionTimer: number | undefined
function testConnection() {
  if (!props.canManage || !connection.clientId.trim() || !connection.clientSecret.trim()) return
  connectionChecking.value = true
  connectionTimer = window.setTimeout(() => {
    connectionChecking.value = false; connection.clientSecret = ''; connectionOpen.value = false
    notice.value = '连接配置已保存'
  }, 500)
}
watch(() => [props.viewerUserId, props.canManage], () => {
  if (connectionTimer) window.clearTimeout(connectionTimer)
  connectionChecking.value = false; connectionOpen.value = false; connection.clientSecret = ''
  detailRecord.value = null; notice.value = ''; keyword.value = ''; taskMenuId.value = ''
})
onBeforeUnmount(() => { if (connectionTimer) window.clearTimeout(connectionTimer) })
</script>

<template>
<section v-if="canManage || viewerUserId" class="access-panel" :aria-label="canManage ? '数据源管理' : '我的同步记录'" :data-testid="canManage ? 'knowledge-access-admin' : 'knowledge-sync-personal'">
  <header class="page-head"><h1>{{ canManage ? '数据源' : '同步记录' }}</h1><ElButton v-if="canManage" class="connection-settings" @click="connectionOpen = true"><Settings2 :size="15"/>配置连接</ElButton></header>
  <p v-if="notice" class="notice" role="status"><CheckCircle2 :size="15"/>{{ notice }}</p>
  <button v-if="canManage" type="button" class="connection-card" data-testid="dingtalk-connection-card" aria-label="配置钉钉文档连接" @click="connectionOpen = true"><span class="dingtalk-logo">钉</span><div><strong>钉钉文档</strong><small>数据源连接</small></div><span class="connection-state"><i/>已连接</span><Link2 :size="16" class="connection-link" aria-hidden="true"/></button>

  <section class="records-section">
    <div class="records-tabs" role="tablist" aria-label="任务与记录">
      <button type="button" role="tab" :aria-selected="activeRecordsTab === 'tasks'" :class="['tab-btn', { active: activeRecordsTab === 'tasks' }]" @click="activeRecordsTab = 'tasks'">任务</button>
      <button type="button" role="tab" :aria-selected="activeRecordsTab === 'records'" :class="['tab-btn', { active: activeRecordsTab === 'records' }]" @click="activeRecordsTab = 'records'">记录</button>
    </div>
    <div class="filter-bar">
      <div class="filter-item"><label>日期</label><div class="date-range"><input v-model="dateStart" type="date" class="date-input" aria-label="开始日期"/><span>–</span><input v-model="dateEnd" type="date" class="date-input" aria-label="结束日期"/></div></div>
      <div class="filter-item"><label>保存位置</label><select v-model="destinationFilter" class="filter-select" aria-label="筛选保存位置"><option value="all">全部位置</option><option v-for="path in destinationOptions" :key="path" :value="path">{{ path }}</option></select></div>
      <div v-if="activeRecordsTab === 'records'" class="filter-item"><label>状态</label><select v-model="statusFilter" class="filter-select" aria-label="筛选同步状态"><option value="all">全部状态</option><option value="待执行">待执行</option><option value="同步成功">同步成功</option><option value="同步中">同步中</option><option value="部分失败">部分失败</option><option value="同步失败">同步失败</option></select></div>
      <label class="record-search"><Search :size="15"/><input v-model="keyword" aria-label="搜索同步记录" placeholder="搜索花名、来源或落点"/></label>
    </div>

    <div v-if="activeRecordsTab === 'tasks'" class="record-table" role="region" aria-label="同步任务" @click.self="taskMenuId = ''">
      <div class="task-head"><span>任务 ID</span><span>所有者</span><span>来源文档</span><span>保存位置</span><span>同步规则</span><span>最新执行时间</span><span>状态</span><span>操作</span></div>
      <article v-for="task in visibleTasks" :key="task.importTaskId" class="task-row" data-testid="dingtalk-sync-task" @click="taskMenuId = ''">
        <span class="id-cell">{{ task.taskId || task.importTaskId }}</span><strong>{{ task.userAlias }}</strong><div class="source-cell" :title="sourceNames(task)">{{ sourceNames(task) }}</div><div class="destination-cell" :title="task.destinationPath">{{ task.destinationPath }}</div><div class="rule-cell">{{ syncRule(task) }}</div><span class="exec-time" :title="task.latestSyncAt">{{ task.latestSyncAt }}</span>
        <label class="switch" :class="{ on: taskEnabled(task) }" role="switch" :aria-checked="taskEnabled(task)" :aria-label="`${taskEnabled(task) ? '停用' : '启用'}任务${task.taskId || task.importTaskId}`" @click.stop><input type="checkbox" :checked="taskEnabled(task)" @change="toggleTask(task)"/><span class="switch-slider"/></label>
        <div class="menu-cell" @click.stop><button type="button" class="menu-trigger" :aria-label="`任务${task.taskId || task.importTaskId}操作菜单`" :aria-expanded="taskMenuId === task.importTaskId" @click="taskMenuId = taskMenuId === task.importTaskId ? '' : task.importTaskId"><MoreHorizontal :size="17"/></button><div v-if="taskMenuId === task.importTaskId" class="task-menu" role="menu"><button type="button" role="menuitem" :aria-label="`编辑任务${task.taskId || task.importTaskId}`" @click="editTask(task)">编辑</button><button type="button" role="menuitem" @click="openSchedule(task)">调整频率</button><button type="button" role="menuitem" class="danger" @click="deleteTask(task)">删除</button></div></div>
      </article>
      <p v-if="!visibleTasks.length" class="empty-records">暂无同步任务</p>
    </div>

    <div v-else class="record-table" role="region" aria-label="同步记录">
      <div class="record-head"><span>来源文档</span><span>保存位置</span><span>最近更新时间</span><span>引用智能体</span><span>状态</span><span>操作结果</span><span>操作</span></div>
      <article v-for="record in visibleRecords" :key="record.recordId || record.importTaskId" class="record-row" data-testid="dingtalk-sync-record"><div class="source-cell" :title="sourceNames(record)"><strong>{{ sourceNames(record) }}</strong><small>{{ record.userAlias }}</small></div><div class="destination-cell" :title="record.destinationPath">{{ record.destinationPath }}</div><span class="exec-time" :title="record.latestSyncAt">{{ record.latestSyncAt }}</span><span class="agent-cell" :title="agentNames(record)">{{ agentNames(record) }}</span><span class="record-status" :class="{ warning: ['同步失败', '部分失败'].includes(record.status), running: ['待执行', '同步中'].includes(record.status) }"><i/>{{ record.status }}</span><span class="result-cell" :title="resultText(record)">{{ resultText(record) }}</span><button type="button" class="record-detail-link" :aria-label="`查看同步记录${record.recordId || record.importTaskId}`" @click="detailRecord = record">详情</button></article>
      <p v-if="!visibleRecords.length" class="empty-records">暂无匹配的同步记录</p>
    </div>
    <div class="record-pagination"><span>共 {{ currentRows.length }} 条</span><button type="button" :disabled="recordPage === 1" aria-label="上一页同步记录" @click="recordPage--">上一页</button><span>{{ recordPage }} / {{ recordPages }}</span><button type="button" :disabled="recordPage >= recordPages" aria-label="下一页同步记录" @click="recordPage++">下一页</button></div>
  </section>

  <ElDialog :model-value="Boolean(detailRecord)" title="同步详情" width="min(900px,95vw)" align-center @close="detailRecord = null"><section v-if="detailRecord" data-testid="dingtalk-sync-detail" class="sync-detail"><p>{{ detailRecord.recordId || detailRecord.importTaskId }} · {{ detailRecord.destinationPath }}</p><p>引用智能体：{{ agentNames(detailRecord) }} · {{ refreshResult(detailRecord) }}</p><table><thead><tr><th>来源文档</th><th>源更新时间</th><th>同步状态</th><th>失败原因</th></tr></thead><tbody><tr v-for="mapping in detailRecord.documentMappings" :key="mapping.sourceDocumentId"><td>{{ mapping.sourceName }}</td><td>{{ mapping.sourceModifiedAt || '—' }}</td><td>{{ documentSyncStatus(mapping) }}</td><td>{{ documentFailureReason(mapping) }}</td></tr></tbody></table></section><template #footer><ElButton @click="detailRecord = null">关闭</ElButton></template></ElDialog>

  <ElDialog :model-value="Boolean(scheduleTask)" title="调整频率" width="min(560px,94vw)" align-center @close="scheduleTask = null"><div class="schedule-fields"><label><span>同步频率</span><select v-model="scheduleFrequency" aria-label="任务同步频率"><option>不自动同步</option><option>每天</option><option>每周</option><option>每月</option></select></label><label v-if="scheduleFrequency === '每周'"><span>选择星期</span><select v-model="scheduleWeekDay"><option v-for="day in weekDays" :key="day">{{ day }}</option></select></label><label v-if="scheduleFrequency === '每月'"><span>选择日期</span><select v-model="scheduleMonthDay"><option v-for="day in monthDays" :key="day">{{ day }}</option></select></label><label v-if="scheduleFrequency !== '不自动同步'"><span>执行时间</span><input v-model="scheduleTime" type="time"/></label></div><template #footer><ElButton @click="scheduleTask = null">取消</ElButton><ElButton type="primary" @click="saveSchedule">确定</ElButton></template></ElDialog>

  <ElDialog v-if="canManage" v-model="connectionOpen" title="配置数据源连接" width="520px" align-center :close-on-click-modal="false"><ElForm label-position="top" @submit.prevent="testConnection"><ElFormItem label="Client ID" required><ElInput v-model="connection.clientId" maxlength="256" autocomplete="off" placeholder="请输入 Client ID"/></ElFormItem><ElFormItem label="Client Secret" required><ElInput v-model="connection.clientSecret" type="password" show-password maxlength="512" autocomplete="new-password" placeholder="请输入 Client Secret"/></ElFormItem></ElForm><template #footer><ElButton @click="connectionOpen = false">取消</ElButton><ElButton type="primary" :disabled="!connection.clientId.trim() || !connection.clientSecret.trim()" :loading="connectionChecking" @click="testConnection">测试连接并保存</ElButton></template></ElDialog>
</section>
</template>

<style scoped>
.access-panel{box-sizing:border-box;width:100%;min-width:0;min-height:0;flex:1;overflow:auto;padding:22px 0 48px;color:#20242a;font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif}.page-head{display:flex;align-items:center;justify-content:space-between;gap:16px}.page-head h1{margin:0;font-size:18px;font-weight:600}.page-head :deep(.el-button){height:32px;border-radius:8px}.notice{display:flex;align-items:center;gap:7px;margin:12px 0 0;border-radius:8px;background:#eef8f3;padding:9px 12px;color:#208257;font-size:12px}.connection-card{display:grid;grid-template-columns:42px minmax(0,1fr) auto 16px;align-items:center;gap:12px;width:min(386px,100%);min-height:74px;margin-top:18px;border:1px solid #e4e7eb;border-radius:8px;padding:12px 16px;background:#fff;text-align:left;font:inherit;cursor:pointer}.dingtalk-logo{display:grid;width:38px;height:38px;place-items:center;border-radius:10px;background:#e9f3ff;color:#1677ff;font-size:18px;font-weight:700}.connection-card strong,.connection-card small{display:block}.connection-card small{margin-top:3px;color:#9299a3;font-size:11px}.connection-state{display:flex;align-items:center;gap:6px;color:#26835b;font-size:12px}.connection-state i,.record-status i{width:7px;height:7px;border-radius:50%;background:currentColor}.connection-link{color:#9aa4b2}.records-section{margin-top:26px}.records-tabs{display:flex;min-height:42px;align-items:center;gap:28px;margin-bottom:16px;border-bottom:1px solid #edf0f3}.tab-btn{align-self:stretch;border:0;border-bottom:2px solid transparent;background:transparent;padding:10px 3px;color:#707782;font-size:14px;cursor:pointer}.tab-btn.active{border-bottom-color:#111;color:#111;font-weight:600}.filter-bar{display:flex;align-items:flex-end;flex-wrap:wrap;gap:16px;margin-bottom:16px}.filter-item{display:flex;flex-direction:column;gap:6px}.filter-item>label{color:#717985;font-size:11px}.date-range{display:flex;align-items:center;gap:6px}.date-input,.filter-select{height:32px;border:1px solid #dcdfe6;border-radius:7px;background:#fff;padding:0 8px;color:#4a5563;font-size:12px}.filter-select{min-width:140px}.record-search{display:flex;width:250px;height:32px;align-items:center;gap:7px;margin-left:auto;border:1px solid #dcdfe6;border-radius:7px;padding:0 10px;color:#9199a3}.record-search input{min-width:0;flex:1;border:0;outline:0;font:12px inherit}.record-table{width:100%;overflow:auto;border-top:1px solid #e5e8ec}.task-head,.task-row{display:grid;grid-template-columns:72px 78px minmax(180px,1.5fr) minmax(150px,1.2fr) 112px 132px 62px 54px;min-width:990px;align-items:center;gap:12px;padding:0 12px}.record-head,.record-row{display:grid;grid-template-columns:minmax(190px,1.7fr) minmax(160px,1.3fr) 130px minmax(100px,1fr) 80px minmax(110px,1fr) 44px;min-width:970px;align-items:center;gap:14px;padding:0 14px}.task-head,.record-head{height:46px;background:#f7f8fa;color:#717985;font-size:12px}.task-row,.record-row{min-height:62px;border-bottom:1px solid #edf0f3;font-size:12px}.task-row strong{font-weight:500}.source-cell,.destination-cell,.rule-cell,.exec-time,.agent-cell,.result-cell{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.source-cell strong,.source-cell small{display:block}.source-cell small{margin-top:4px;color:#969da7;font-size:10px}.id-cell{color:#6f7782;font-variant-numeric:tabular-nums}.exec-time{color:#596371;font-size:11px}.record-status{display:flex;align-items:center;gap:5px;color:#27855b;font-size:11px}.record-status.warning{color:#c47a1c}.record-status.running{color:#2572c7}.result-cell{color:#697382}.record-detail-link{border:0;background:transparent;color:#1677ff;font:12px inherit;cursor:pointer}.switch{position:relative;width:34px;height:20px;cursor:pointer}.switch input{position:absolute;opacity:0}.switch-slider{position:absolute;inset:0;border-radius:20px;background:#ddd}.switch-slider:before{content:"";position:absolute;left:2px;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .15s}.switch.on .switch-slider{background:#ff8c9a}.switch.on .switch-slider:before{transform:translateX(14px)}.menu-cell{position:relative}.menu-trigger{display:grid;width:28px;height:28px;place-items:center;border:0;border-radius:6px;background:transparent;color:#666;cursor:pointer}.menu-trigger:hover{background:#f3f4f6}.task-menu{position:absolute;right:0;top:32px;z-index:20;width:126px;border:1px solid #e6e6e6;border-radius:9px;background:#fff;padding:5px;box-shadow:0 8px 22px rgba(0,0,0,.1)}.task-menu button{width:100%;border:0;border-radius:6px;background:transparent;padding:8px 10px;text-align:left;font-size:12px;cursor:pointer}.task-menu button:hover{background:#f5f5f5}.task-menu .danger{color:#e54848}.empty-records{padding:36px;text-align:center;color:#999;font-size:12px}.record-pagination{display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:14px;color:#888;font-size:12px}.record-pagination button{border:1px solid #e5e7eb;border-radius:5px;background:#fff;padding:5px 9px}.sync-detail table{width:100%;margin-top:18px;border-collapse:collapse;font-size:12px;text-align:left}.sync-detail th{background:#f7f8fa;padding:12px}.sync-detail td{border-bottom:1px solid #eee;padding:12px}.schedule-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.schedule-fields label{display:grid;gap:7px;color:#666;font-size:12px}.schedule-fields select,.schedule-fields input{height:36px;border:1px solid #ddd;border-radius:7px;background:#fff;padding:0 10px}@media(max-width:640px){.filter-bar{align-items:stretch;flex-direction:column}.record-search{width:100%;margin-left:0}.schedule-fields{grid-template-columns:1fr}}
</style>
