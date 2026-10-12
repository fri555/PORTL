<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Bell, CheckCircle2, Clock3, Link2, RefreshCw, Search, Settings2 } from 'lucide-vue-next'
import { ElButton, ElDialog, ElForm, ElFormItem, ElInput, ElOption, ElSelect } from 'element-plus'
import { dingTalkImportTaskFixtures, scopedDingTalkImportTasks } from '@/mock/dingtalk-import-tasks'
import type { DingTalkImportTask, DingTalkSyncFrequency, KnowledgeDestination } from '@/types/knowledge-source'

const props = withDefaults(defineProps<{ destinations: KnowledgeDestination[]; canManage?: boolean; records?: DingTalkImportTask[]; viewerUserId?: string }>(), { canManage: true, viewerUserId: '' })
const emit = defineEmits<{ 'update-schedule': [importTaskId: string, frequency: DingTalkSyncFrequency, schedule: string] }>()
const fixtureRecords = ref<DingTalkImportTask[]>(structuredClone(dingTalkImportTaskFixtures))
const records = computed(() => props.canManage ? props.records ?? fixtureRecords.value : scopedDingTalkImportTasks(props.records ?? fixtureRecords.value, props.viewerUserId, 'user'))
const connectionOpen = ref(false), scheduleOpen = ref(false), connectionSaved = ref(true), connectionChecking = ref(false), notice = ref('')
const statusFilter = ref('all'), destinationFilter = ref('all'), keyword = ref('')
const dateStart = ref(''), dateEnd = ref('')
const activeRecord = ref<DingTalkImportTask | null>(null)
const connection = reactive({ clientId: 'dingxxxxxxxxxxxx', clientSecret: '' })
const scheduleDraft = reactive({ frequency: '不自动同步' as DingTalkSyncFrequency, time: '00:00', day: '周一' })
const dayOptions = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const canSaveSchedule = computed(() => scheduleDraft.frequency === '不自动同步' || /^([01]\d|2[0-3]):[0-5]\d$/.test(scheduleDraft.time))
const sourceNames = (record: DingTalkImportTask) => record.documentMappings.map(item => item.sourceName).join('；')

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
    <!-- 筛选栏：日期、保存位置、状态 -->
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
      <div class="filter-item">
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
    <!-- 表格 -->
    <div class="record-table">
      <div class="record-head">
        <span>人员</span>
        <span>来源</span>
        <span>保存位置</span>
        <span>同步规则</span>
        <span>状态</span>
        <span>执行时间</span>
        <span>操作</span>
      </div>
      <article v-for="record in filteredRecords" :key="record.importTaskId" class="record-row" data-testid="dingtalk-sync-record">
        <strong>{{ record.userAlias }}</strong>
        <div class="source-cell" :title="sourceNames(record)">{{ sourceNames(record) }}</div>
        <div class="destination-cell">{{ record.destinationPath }}</div>
        <div class="rule-cell"><span>{{ record.frequency }}</span><small>{{ record.schedule }}</small></div>
        <span class="record-status" :class="record.status.includes('失败') ? 'warning' : record.status === '同步中' ? 'running' : 'success'"><i/>{{ record.status }}</span>
        <span class="exec-time">{{ record.executedAt || '—' }}</span>
        <div class="action-cell">
          <button type="button" class="schedule-action" @click="openSchedule(record)"><Clock3 :size="14"/>同步设置</button>
          <button v-if="record.status.includes('失败')" type="button" class="notify-action" @click="openNotify(record)"><Bell :size="14"/>通知</button>
        </div>
      </article>
      <p v-if="!filteredRecords.length" class="empty-records">暂无匹配的同步记录</p>
    </div>
  </section>
  <ElDialog v-if="canManage && isAdmin" v-model="connectionOpen" title="配置数据源连接" width="520px" align-center :close-on-click-modal="false"><ElForm label-position="top" @submit.prevent="testConnection"><ElFormItem label="Client ID" required><ElInput v-model="connection.clientId" maxlength="256" autocomplete="off" placeholder="请输入 Client ID"/></ElFormItem><ElFormItem label="Client Secret" required><ElInput v-model="connection.clientSecret" type="password" show-password maxlength="512" autocomplete="new-password" placeholder="请输入 Client Secret"/></ElFormItem></ElForm><template #footer><ElButton @click="connectionOpen = false">取消</ElButton><ElButton type="primary" :disabled="!connection.clientId.trim() || !connection.clientSecret.trim()" :loading="connectionChecking" @click="testConnection">测试连接并保存</ElButton></template></ElDialog>
  <ElDialog v-model="scheduleOpen" title="同步设置" width="480px" align-center><p class="dialog-source"><strong>{{ activeRecord?.importTaskId }}</strong><br/>{{ activeRecord ? sourceNames(activeRecord) : '' }}</p><ElForm label-position="top"><ElFormItem label="同步频率"><select v-model="scheduleDraft.frequency" class="dialog-select"><option value="不自动同步">不自动同步</option><option value="每天">每天</option><option value="每周">每周</option></select></ElFormItem><ElFormItem v-if="scheduleDraft.frequency !== '不自动同步'" :label="scheduleDraft.frequency === '每周' ? '每周一次执行时间' : '执行时间'"><ElInput v-model="scheduleDraft.time" type="time"/></ElFormItem><ElFormItem v-if="scheduleDraft.frequency === '每周'" label="执行星期"><ElSelect v-model="scheduleDraft.day" style="width:100%"><ElOption v-for="d in dayOptions" :key="d" :label="d" :value="d"/></ElSelect></ElFormItem></ElForm><template #footer><ElButton @click="scheduleOpen = false">取消</ElButton><ElButton type="primary" :disabled="!canSaveSchedule" @click="saveSchedule"><RefreshCw :size="14"/>保存</ElButton></template></ElDialog>
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
.record-head,.record-row{display:grid;grid-template-columns:72px minmax(180px,1.5fr) minmax(155px,1.2fr) 100px 82px 140px 120px;min-width:940px;align-items:center;gap:12px;padding:0 16px}
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
