<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import {
  AlertTriangle,
  ArrowUpRight,
  Cable,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  FolderTree,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from 'lucide-vue-next'
import {
  ElDialog,
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElTree,
  ElAlert,
  ElRadio,
  ElRadioGroup,
} from 'element-plus'
import {
  credentialStatusText, documents, getPrototypeScenario, permissionStatusText, selectScope, scopeDocumentIds, scopeDocuments,
  nextScheduledSync, syncSchedule, type SyncInterval, type CredentialStatus, type PermissionStatus,
} from './dingtalkPrototype'
import DingTalkAccessForm from './DingTalkAccessForm.vue'

interface ConnectionRecord {
  id: string
  name: string
  destination: string
  count: number
  plannedCount: number
  folder: string
  sourceId: string
  selectedKeys: string[]
  source: string
  schedule: string
  scheduleAnchor: number
  executionIdentity: string
  status: 'connected' | 'syncing' | 'warning' | 'unverified' | 'disconnected'
  credentialStatus: CredentialStatus
  permissionStatus: PermissionStatus
  lastSync: string
  nextSync: string
  added: number
  updated: number
  failed: number
  skipped: number
  lastResult: string
  failures: { id: string; name: string; reason: string; isNew?: boolean }[]
}

const props = withDefaults(defineProps<{ destinations: { id: string; name: string }[]; canManage?: boolean }>(), { canManage: true })
const scenario = getPrototypeScenario()
const query = new URLSearchParams(window.location.search)
const configureOpen = ref(query.get('create') === '1' || ['no-scope', 'no-libraries', 'no-permission', 'required-error', 'create-scope', 'create-rules', 'scope-loading', 'scope-error'].includes(scenario))
const detailOpen = ref(query.get('detail') === '1' || scenario.startsWith('edit-') || ['disconnect', 'disconnected', 'reconnect', 'partial'].includes(scenario))
const notice = ref('')
const statusFilter = ref('all')
const editKind = ref<'name' | 'scope' | 'destination' | 'schedule' | 'auth' | 'disconnect' | ''>('')
const draft = reactive({
  name: '',
  scope: [] as string[],
  destination: '',
  folder: '',
  interval: 'daily' as SyncInterval,
  schedule: '',
  appKey: '',
  appSecret: '',
  userId: '',
})
const editError = ref('')
const scopeTree = ref<InstanceType<typeof ElTree>>()
const scopeDefaults = ref<string[]>([])
const syncTimers = new Map<string, number>()
const demonstratePartial = query.get('sync') === 'partial' || scenario === 'partial'
onBeforeUnmount(() => syncTimers.forEach((timer) => window.clearTimeout(timer)))
const active = ref<ConnectionRecord | null>(null)
const records = ref<ConnectionRecord[]>([
  {
    id: 'ding-group-policy',
    name: '钉钉 · 集团制度知识库',
    destination: '集团制度知识库',
    count: 3,
    plannedCount: 3,
    folder: '钉钉制度文档',
    sourceId: 'policies', selectedKeys: ['policies'],
    source: '集团制度知识库 / 全部内容',
    schedule: '每天 00:00',
    scheduleAnchor: Date.now(),
    executionIdentity: 'ding-admin-demo',
    status: 'connected',
    credentialStatus: 'valid', permissionStatus: 'normal',
    lastSync: '2026-10-03 02:06',
    nextSync: nextScheduledSync('每天 00:00'),
    added: 1,
    updated: 1,
    failed: 0,
    skipped: 1, lastResult: '同步成功', failures: [],
  },
])
const demoRecord = records.value[0]!
if (scenario === 'credentials-expired') {
  Object.assign(demoRecord, { status: 'warning', credentialStatus: 'invalid', permissionStatus: 'unknown', nextSync: '已暂停' })
} else if (scenario === 'permission-denied') {
  Object.assign(demoRecord, { status: 'warning', credentialStatus: 'valid', permissionStatus: 'abnormal', nextSync: '已暂停' })
} else if (scenario === 'unknown') {
  Object.assign(demoRecord, { status: 'unverified', credentialStatus: 'unknown', permissionStatus: 'unknown', nextSync: '校验后计算' })
} else if (scenario === 'disconnected' || scenario === 'reconnect') {
  Object.assign(demoRecord, { status: 'disconnected', credentialStatus: 'unknown', permissionStatus: 'unknown', nextSync: '—' })
} else if (scenario === 'partial') {
  Object.assign(demoRecord, { failed: 1, added: 0, updated: 0, skipped: 2, lastResult: '部分失败', failures: [{ id: 'onboarding', name: '新员工入职指南', reason: '原文读取超时；保留上一成功版本', isNew: false }] })
} else if (scenario === 'empty') records.value = []
if (detailOpen.value) active.value = records.value[0] ?? null

const statusText = computed(
  () =>
    ({
      connected: '已连接',
      syncing: '同步中',
      warning: '授权异常',
      unverified: '待校验',
      disconnected: '已断开',
    }) as const,
)

const filteredRecords = computed(() =>
  records.value.filter(
    (record) => statusFilter.value === 'all' || record.status === statusFilter.value,
  ),
)
const scopeLibrary = computed(() => documents.find(item => item.id === active.value?.sourceId) ?? documents[0]!)
const scopeTreeData = computed(() => [scopeLibrary.value])
const targetOptions = computed(() => [...new Set(props.destinations.map(item => item.name))])
function nextSyncAt(schedule: string, anchor = Date.now()) {
  return nextScheduledSync(schedule, anchor)
}
function canSync(record: ConnectionRecord) {
  return props.canManage && record.status === 'connected' && record.credentialStatus === 'valid' && record.permissionStatus === 'normal'
}
function needsAuthorization(record: ConnectionRecord) {
  return record.credentialStatus !== 'valid' || record.permissionStatus !== 'normal'
}
function openAuthorization(record: ConnectionRecord) {
  openDetail(record)
  updateValue('auth')
}
function complete(record: {
  name: string
  destination: string
  count: number
  folder: string
  sourceId?: string
  selectedKeys?: string[]
  source?: string
  schedule?: string
  executionUserId?: string
}) {
  if (!props.canManage) return
  const next: ConnectionRecord = {
    id: `ding-${Date.now()}`,
    name: record.name,
    destination: record.destination,
    count: 0, plannedCount: record.count,
    folder: record.folder,
    sourceId: record.sourceId ?? 'policies', selectedKeys: record.selectedKeys ?? [],
    source: record.source || '集团制度知识库 / 已选内容',
    schedule: record.schedule || '每天 00:00',
    scheduleAnchor: Date.now(),
    executionIdentity: record.executionUserId || '应用身份（以实际接口授权为准）',
    status: 'connected',
    credentialStatus: 'valid', permissionStatus: 'normal',
    lastSync: '首次同步待开始',
    nextSync: '首次同步完成后计算',
    added: 0,
    updated: 0,
    failed: 0,
    skipped: 0, lastResult: '尚未同步', failures: [],
  }
  records.value.unshift(next)
  configureOpen.value = false
  active.value = records.value[0] ?? null
  detailOpen.value = true
  if (active.value) runSync(active.value)
}

function openDetail(record: ConnectionRecord) {
  if (!props.canManage) return
  active.value = record
  detailOpen.value = true
  notice.value = ''
}
function isFailureInScope(record: ConnectionRecord, id: string) {
  const library = documents.find(item => item.id === record.sourceId)
  return !!library && scopeDocumentIds(record.selectedKeys, library).includes(id)
}
function retryableFailures(record: ConnectionRecord) {
  return record.failures.filter(failure => isFailureInScope(record, failure.id))
}
function runSync(record: ConnectionRecord, failedOnly = false) {
  if (!canSync(record)) return
  const currentFailures = retryableFailures(record)
  const retryCount = currentFailures.length
  const retryNew = currentFailures.filter(item=>item.isNew).length
  const first = record.lastResult === '尚未同步'
  const library = documents.find(item => item.id === record.sourceId)
  const failureCandidate = library ? scopeDocuments(record.selectedKeys, library)[0] : undefined
  if (failedOnly && !retryCount) return
  record.status = 'syncing'
  record.lastSync = '刚刚 · 正在对账'
  notice.value = failedOnly ? '已发起失败项重试，仅处理仍在同步范围内的失败文档。' : '已发起同步，本次会自动跳过未变更内容。'
  syncTimers.set(
    record.id,
    window.setTimeout(() => {
      if (record.status !== 'syncing') return
      record.status = 'connected'
      if (failedOnly) {
        record.added = retryNew; record.updated = retryCount - retryNew; record.skipped = 0; record.count += retryNew
        record.failed = 0; record.failures = []; record.lastResult = '失败项重试成功'
      } else if (demonstratePartial && failureCandidate) {
        record.failed = 1; record.added = first ? Math.max(0, record.plannedCount - 1) : 0; record.updated = 0; record.skipped = first ? 0 : Math.max(0, record.plannedCount - 1)
        if(first) record.count=record.added
        record.failures = [{ id: failureCandidate.id, name: failureCandidate.name, reason: first ? '原文读取超时；尚未入库' : '原文读取超时；保留上一成功版本', isNew: first }]
        record.lastResult = '部分失败'
      } else { record.lastResult = '同步成功'; record.failed = 0; record.failures = []; record.added=first?record.plannedCount:0;record.updated=0;record.skipped=first?0:record.plannedCount;if(first)record.count=record.plannedCount }
      record.lastSync = `刚刚 · 模拟${record.lastResult}`
      record.nextSync = nextSyncAt(record.schedule, record.scheduleAnchor)
      syncTimers.delete(record.id)
    }, 900),
  )
}
function updateValue(kind: typeof editKind.value) {
  if (!props.canManage || !active.value || (active.value.status === 'syncing' && kind !== 'disconnect')) return
  const record = active.value
  editError.value = ''
  editKind.value = kind
  Object.assign(draft, {
    name: record.name,
    scope: [...record.selectedKeys],
    destination: record.destination,
    folder: record.folder,
    interval: record.schedule === '每小时' ? 'hourly' : 'daily',
    schedule: record.schedule === '每小时' ? '00:00' : record.schedule.replace('每天 ', ''),
    appKey: '',
    appSecret: '',
    userId: record.executionIdentity.startsWith('应用身份') ? '' : record.executionIdentity,
  })
  scopeDefaults.value = [...record.selectedKeys]

}
function saveEdit() {
  const record = active.value
  if (!props.canManage || !record) return
  editError.value = ''
  if (record.status === 'syncing' && editKind.value !== 'disconnect') { editError.value = '同步已开始，请完成后再保存；当前修改已保留'; return }
  if (editKind.value === 'name') {
    const name = draft.name.trim()
    if (!name || name.length > 50) { editError.value = '连接名称需为 1–50 字'; return }
    if (records.value.some(item => item.id !== record.id && item.name === name)) { editError.value = '连接名称已存在，请修改'; return }
    record.name = name
    notice.value = '连接名称已保存。'
  } else if (editKind.value === 'scope') {
    if (!draft.scope.length || !scopeTree.value?.getCheckedKeys(true).length) {
      editError.value = '请选择同步范围'
      return
    }
    record.selectedKeys = [...draft.scope]
    const count = scopeTree.value?.getCheckedKeys(true).length ?? 0
    record.plannedCount = count
    record.source = `${scopeLibrary.value.label} / ${draft.scope.includes(record.sourceId) ? '全部内容' : `已选 ${count} 篇`}`
    notice.value = '范围已保存，下次同步生效；也可点击立即同步。移出范围的内容保留为离线快照。'
  } else if (editKind.value === 'destination') {
    if (!draft.destination || !targetOptions.value.includes(draft.destination) || !draft.folder.trim() || draft.folder.trim().length > 80) {
      editError.value = '请选择目标知识库并填写来源文件夹'
      return
    }
    if(record.destination===draft.destination && record.folder===draft.folder.trim()) { notice.value='保存位置未变更。'; editKind.value='';return }
    record.destination = draft.destination
    record.folder = draft.folder.trim()
    record.count=0; record.lastResult='尚未同步'; record.lastSync='新落点尚未同步'
    record.added=0; record.updated=0; record.skipped=0; record.failed=0; record.failures=[]
    notice.value = '新落点将在下次同步接收当前范围的全部内容；旧落点保留离线快照，不自动迁移。'
  } else if (editKind.value === 'schedule') {
    if (draft.interval === 'daily' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.schedule)) {
      editError.value = '请选择有效同步时间'
      return
    }
    record.schedule = syncSchedule(draft.interval, draft.schedule)
    record.scheduleAnchor = Date.now()
    record.nextSync = canSync(record) ? nextSyncAt(record.schedule, record.scheduleAnchor) : '—'
    notice.value = draft.interval === 'hourly' ? '更新频率已保存，从当前保存时刻起每小时增量更新。' : '更新频率已保存，每天按北京时间增量更新。'
  } else if (editKind.value === 'auth') {
    if (!draft.appKey.trim() || !draft.appSecret.trim()) {
      editError.value = '请填写 App Key 和 App Secret'
      return
    }
    if (draft.appKey.length > 256 || draft.appSecret.length > 512 || draft.userId.length > 128 || /\s/.test(draft.appKey + draft.appSecret + draft.userId)) { editError.value = '凭证长度超限或包含空白字符'; return }
    record.status = 'connected'
    record.credentialStatus = 'valid'
    record.permissionStatus = 'normal'
    record.executionIdentity = draft.userId.trim() || '应用身份（以实际接口授权为准）'
    runSync(record)
    notice.value = '模拟校验成功：凭证有效、权限正常，已恢复同步；未保存密钥。'
    draft.appKey = ''
    draft.appSecret = ''
  } else if (editKind.value === 'disconnect') {
    window.clearTimeout(syncTimers.get(record.id))
    syncTimers.delete(record.id)
    if(record.status==='syncing') {record.lastResult='已取消';record.lastSync='刚刚 · 模拟任务已取消'}
    record.status = 'disconnected'
    record.credentialStatus = 'unknown'
    record.permissionStatus = 'unknown'
    record.nextSync = '—'
    notice.value = '已停止同步；最后成功内容保留为离线快照，内容可访问性依据来源授权结果确定。'
  }
  editKind.value = ''
}
watch(() => props.canManage, allowed => {
  if (allowed) return
  syncTimers.forEach(timer => window.clearTimeout(timer))
  syncTimers.clear()
  configureOpen.value = false
  detailOpen.value = false
  editKind.value = ''
  draft.appKey = ''
  draft.appSecret = ''
  active.value = null
}, { immediate: true })
if (scenario.startsWith('edit-')) updateValue(scenario.replace('edit-', '') as typeof editKind.value)
else if (scenario === 'disconnect') updateValue('disconnect')
else if (scenario === 'reconnect') updateValue('auth')
</script>

<template>
  <section v-if="canManage" class="access-panel" aria-label="知识接入管理">
    <div class="intro">
      <div>
        <span class="eyebrow">知识中心 / 知识接入</span>
        <h1>统一连接企业知识</h1>
        <p>管理员配置应用连接和持续同步；用户导入时使用各自绑定的钉钉身份。</p>
      </div>
      <div class="intro-actions">
        <span class="prototype">M3 · 管理员配置 · 模拟数据</span
        ><button type="button" class="primary-action" @click="configureOpen = true">
          新建数据源
        </button>
      </div>
    </div>

    <div class="metrics">
      <div>
        <span class="metric-icon blue"><Cable :size="18" /></span>
        <p>
          已接入数据源<strong>{{ records.length }}</strong>
        </p>
      </div>
      <div>
        <span class="metric-icon green"><FileText :size="18" /></span>
        <p>
          当前落点文档<strong>{{ records.reduce((sum, item) => sum + item.count, 0) }}</strong>
        </p>
      </div>
      <div>
        <span class="metric-icon amber"><AlertTriangle :size="18" /></span>
        <p>
          待处理异常<strong>{{ records.reduce((sum, item) => sum + item.failed, 0) }}</strong>
        </p>
      </div>
    </div>

    <p class="metrics-note">统计口径待评审 · 以上为示例数据，业务定义由产品补充</p>
    <div class="section-heading">
      <div>
        <h2>可接入的数据源</h2>
        <span>根据业务需要新增连接</span>
      </div>
    </div>
    <div class="source-grid">
      <article class="source-card">
        <div class="card-heading">
          <span class="source-logo">钉</span>
          <div>
            <h3>钉钉文档</h3>
            <span>可导出且天马支持的钉钉文档</span>
          </div>
          <span class="available">可接入</span>
        </div>
        <p>选择知识库、文件夹或文档，首次导入后按每小时或每天增量更新。原生多维表暂不支持。</p>
        <div class="features">
          <span><FolderTree :size="14" />范围选择</span
          ><span><ShieldCheck :size="14" />授权校验</span
          ><span><RefreshCw :size="14" />定时增量</span>
        </div>
        <button type="button" class="connect" @click="configureOpen = true">
          配置接入 <ArrowUpRight :size="16" />
        </button>
      </article>
      <article class="source-card upcoming">
        <Database :size="26" />
        <h3>更多数据源</h3>
        <p>预留其他数据源入口，本期仅提供钉钉文档接入。</p>
        <span>敬请期待</span>
      </article>
    </div>

    <div class="section-heading connection-heading">
      <div>
        <h2>已接入的数据源</h2>
        <span>查看同步状态并维护连接</span>
      </div>
      <select v-model="statusFilter" class="filter" aria-label="筛选连接状态">
        <option value="all">全部状态</option>
        <option v-for="(label, value) in statusText" :key="value" :value="value">
          {{ label }}
        </option>
      </select>
    </div>
    <div class="connection-table">
      <div class="table-head">
        <span>数据源</span><span>同步目标</span><span>同步状态</span><span>授权状态</span><span>最近同步</span
        ><span>操作</span>
      </div>
      <article
        v-for="record in filteredRecords"
        :key="record.id"
        class="connection-row"
        @click="openDetail(record)"
      >
        <div class="source-cell">
          <span class="source-logo small">钉</span>
          <p>
            <strong>{{ record.name }}</strong
            ><small>{{ record.source }}</small>
          </p>
        </div>
        <div>
          <strong>{{ record.destination }}</strong
          ><small>{{ record.count }} 篇文档</small>
        </div>
        <div>
          <span class="state" :class="record.status"><i />{{ statusText[record.status] }}</span
          ><small>{{ record.schedule }}</small>
        </div>
        <div class="authorization-cell">
          <span>应用凭证 <b :class="record.credentialStatus">{{ credentialStatusText[record.credentialStatus] }}</b></span>
          <span>执行身份 <b :class="record.permissionStatus">{{ permissionStatusText[record.permissionStatus] }}</b></span>
          <button v-if="needsAuthorization(record)" type="button" class="authorization-link" @click.stop="openAuthorization(record)">{{ record.status === 'disconnected' ? '重新连接' : '重新授权' }}</button>
        </div>
        <div>
          <strong>{{ record.lastSync }}</strong
          ><small>下次：{{ record.nextSync }}</small>
        </div>
        <div class="row-actions">
          <button
            type="button"
            :disabled="!canSync(record)"
            @click.stop="runSync(record)"
          >
            <RefreshCw :size="15" />立即同步</button
          ><button
            type="button"
            :aria-label="`管理${record.name}`"
            @click.stop="openDetail(record)"
          >
            管理
          </button>
        </div>
      </article>
    </div>

    <p v-if="!filteredRecords.length" class="empty-connections">
      {{ records.length ? '没有符合该状态的数据源' : '暂无已接入的数据源' }}
    </p>
    <ElDialog
      v-model="detailOpen"
      width="min(860px, 96vw)"
      align-center
      :show-close="false"
      :close-on-click-modal="false"
      class="connection-management-dialog"
    >
      <div v-if="active">
        <section class="detail-modal" role="dialog" aria-modal="true" aria-label="数据源详情">
          <header>
            <div class="drawer-title">
              <span class="source-logo">钉</span>
              <div>
                <span class="eyebrow">数据源详情</span>
                <h2>{{ active.name }}</h2>
              </div>
            </div>
            <button type="button" class="icon-button" aria-label="关闭" @click="detailOpen = false">
              ×
            </button>
          </header>
          <div class="management-content">
          <div class="health-card">
            <div>
              <span class="state" :class="active.status"><i />{{ statusText[active.status] }}</span>
              <p>最近同步 {{ active.lastSync }}</p>
            </div>
            <button
              type="button"
              class="sync-button"
              :disabled="!canSync(active)"
              @click="runSync(active)"
            >
              <RefreshCw :size="15" />立即同步
            </button>
          </div>
          <div class="authorization-health" aria-label="连接授权状态">
            <div><span>应用凭证有效性</span><strong :class="active.credentialStatus">{{ credentialStatusText[active.credentialStatus] }}</strong></div>
            <div><span>执行身份权限</span><strong :class="active.permissionStatus">{{ permissionStatusText[active.permissionStatus] }}</strong></div>
          </div>
          <p v-if="needsAuthorization(active) && active.status !== 'disconnected'" class="authorization-note">应用凭证或同步执行身份异常时暂停更新；不会改用其他人的身份继续读取。</p>
          <p v-if="notice" class="notice"><CheckCircle2 :size="15" />{{ notice }}</p>
          <section>
            <h3>连接与同步</h3>
            <dl>
              <dt>连接名称</dt><dd>{{ active.name }}<button type="button" :disabled="active.status === 'syncing'" @click="updateValue('name')">修改名称</button></dd>
              <dt>来源范围</dt>
              <dd>
                {{ active.source
                }}<button
                  type="button"
                  :disabled="active.status === 'syncing'"
                  @click="updateValue('scope')"
                >
                  编辑范围
                </button>
              </dd>
              <dt>写入位置</dt>
              <dd>
                {{ active.destination }} / {{ active.folder
                }}<button
                  type="button"
                  :disabled="active.status === 'syncing'"
                  @click="updateValue('destination')"
                >
                  更换落点
                </button>
              </dd>
              <dt>同步计划</dt>
              <dd>
                {{ active.schedule
                }}<button
                  type="button"
                  :disabled="active.status === 'syncing'"
                  @click="updateValue('schedule')"
                >
                  修改时间
                </button>
              </dd>
              <dt>执行身份</dt><dd>{{ active.executionIdentity }}</dd>
              <dt>内容授权</dt><dd>访问者自己的钉钉文档权限与平台知识库权限共同满足；管理员凭证不授予所有人访问权限。</dd>
            </dl>
          </section>
          <section>
            <h3>最近一次同步结果（演示） · {{ active.lastResult }}</h3>
            <div class="sync-stats">
              <div>
                <strong>{{ active.added }}</strong
                ><span>新增</span>
              </div>
              <div>
                <strong>{{ active.updated }}</strong
                ><span>更新</span>
              </div>
              <div>
                <strong>{{ active.skipped }}</strong
                ><span>跳过（未变化）</span>
              </div>
              <div><strong>0</strong><span>失效</span></div>
              <div>
                <strong :class="{ danger: active.failed }">{{ active.failed }}</strong
                ><span>失败</span>
              </div>
            </div>
            <div v-if="active.failures.length" data-testid="sync-failures" class="sync-failures">
              <p>成功项已保留，以下文件可单独重试。</p>
              <div v-for="failure in active.failures" :key="failure.id"><strong>{{ failure.name }}</strong><span>{{ failure.reason }}<template v-if="!isFailureInScope(active, failure.id)">；已移出同步范围，不再重试</template></span></div>
              <ElButton :disabled="!canSync(active) || !retryableFailures(active).length" @click="runSync(active, true)">仅重试失败项</ElButton>
            </div>
          </section>
          <section>
            <h3>运行记录</h3>
            <div class="timeline">
              <span><Clock3 :size="16" /></span>
              <p>
                <strong>{{ statusText[active.status] }}</strong
                ><small>{{ active.lastSync }}</small>
              </p>
            </div>
            <p class="prototype-note">
              交互演示不连接钉钉，不代表真实同步结果；正式环境按每次运行展示结果和失败原因。
            </p>
          </section>
          </div>
          <footer>
            <button
              type="button"
              :disabled="active.status === 'syncing'"
              @click="updateValue('auth')"
            >
              <ShieldCheck :size="15" />{{
                active.status === 'disconnected' ? '重新连接' : '重新授权'
              }}</button
            ><button
              type="button"
              :disabled="active.status === 'disconnected'"
              class="danger-button"
              @click="updateValue('disconnect')"
            >
              <Unplug :size="15" />断开连接
            </button>
          </footer>
        </section>
      </div>
    </ElDialog>

    <ElDialog
      :model-value="!!editKind"
      :title="
        (
          {
            name: '修改连接名称',
            scope: '编辑同步范围',
            destination: '更改保存位置',
            schedule: '修改同步时间',
            auth: '重新验证连接',
            disconnect: '确认断开连接',
          } as Record<string, string>
        )[editKind]
      "
      width="min(520px, 94vw)"
      align-center
      append-to-body
      :close-on-click-modal="false"
      @close="
        editKind = '';
        draft.appSecret = '';
      "
    >
      <ElForm label-position="top" @submit.prevent="saveEdit">
        <ElFormItem v-if="editKind === 'name'" label="连接名称" required><ElInput v-model="draft.name" maxlength="50" show-word-limit aria-label="连接名称" /></ElFormItem>
        <template v-if="editKind === 'scope'"
          ><p>来源知识库：{{ active?.source.split(' / ')[0] }}</p>
          <ElTree ref="scopeTree" :key="`${active?.id}-${editKind}`" :data="scopeTreeData" node-key="id" show-checkbox default-expand-all :default-checked-keys="scopeDefaults" @check="node => draft.scope = selectScope(draft.scope, node, (scopeTree?.getCheckedKeys() ?? []).map(String), scopeLibrary)" />
          <p class="prototype-note">
            勾选目录持续纳入新增文档，逐篇勾选仅同步所选文档。保存后下次同步生效；移出范围的历史文件保留为离线快照。
          </p></template
        >
        <template v-else-if="editKind === 'destination'"
          ><ElFormItem label="目标知识库" required
            ><ElSelect v-model="draft.destination" aria-label="目标知识库"
              ><ElOption
                v-for="name in targetOptions"
                :key="name"
                :label="name"
                :value="name" /></ElSelect></ElFormItem
          ><ElFormItem label="来源文件夹" required
            ><ElInput v-model="draft.folder" maxlength="80" aria-label="来源文件夹" /></ElFormItem
          ><ElAlert
            title="下次同步向新落点写入当前范围全部内容；旧落点保留离线快照，不自动迁移或删除。"
            type="info"
            :closable="false"
        /></template>
        <template v-else-if="editKind === 'schedule'">
          <ElFormItem label="更新频率" required><ElRadioGroup v-model="draft.interval" aria-label="更新频率"><ElRadio value="hourly">每小时</ElRadio><ElRadio value="daily">每天</ElRadio></ElRadioGroup></ElFormItem>
          <ElFormItem v-if="draft.interval === 'daily'" label="每日同步时间（北京时间）" required><ElInput v-model="draft.schedule" type="time" aria-label="同步时间" /></ElFormItem>
          <p class="prototype-note">每小时从本次保存时刻起计算；首次导入后仅更新新增或有变更的文档，下次时间由系统计算。</p>
        </template>
        <template v-else-if="editKind === 'auth'"
          ><ElAlert
            title="模拟分别校验应用凭证与同步执行身份；请使用示例，不保存密钥。"
            type="info"
            :closable="false"
          /><ElFormItem label="App Key" required
            ><ElInput v-model="draft.appKey" aria-label="重新授权 App Key" maxlength="256" /></ElFormItem
          ><ElFormItem label="App Secret" required
            ><ElInput
              v-model="draft.appSecret"
              type="password"
              show-password
              aria-label="重新授权 App Secret" maxlength="512" /></ElFormItem
          ><ElFormItem label="同步执行身份 User ID（接口需要时）"><ElInput v-model="draft.userId" maxlength="128" aria-label="重新授权 User ID" placeholder="由管理员确认的同步执行身份" /></ElFormItem><ElButton
            @click="
              draft.appKey = 'demo-app-key';
              draft.appSecret = 'demo-secret';
            "
            >填入示例</ElButton
          ></template
        >
        <p v-else-if="editKind === 'disconnect'">
          断开“{{
            active?.name
          }}”后将停止正在进行和后续的同步。最后成功内容保留为离线快照，内容可访问性依据来源授权结果确定，可重新连接。
        </p>
        <ElAlert v-if="editError" :title="editError" type="error" :closable="false" />
      </ElForm>
      <template #footer
        ><ElButton
          @click="
            editKind = '';
            draft.appSecret = '';
          "
          >取消</ElButton
        ><ElButton :type="editKind === 'disconnect' ? 'danger' : 'primary'" @click="saveEdit">{{
          editKind === 'disconnect' ? '确认断开' : editKind === 'auth' ? '验证并恢复同步' : '保存'
        }}</ElButton></template
      >
    </ElDialog>
    <DingTalkAccessForm
      :existing-names="records.map(record => record.name)"
      v-if="configureOpen"
      :destinations="destinations"
      @close="configureOpen = false"
      @complete="complete"
    />
  </section>
  <section v-else class="access-panel" role="status">仅管理员可管理知识接入</section>
</template>

<style scoped>
.metrics-note { margin: 12px 0 24px; color: #87909e; font-size: 12px; }
.authorization-cell { display: grid; gap: 5px; font-size: 12px; }
.authorization-cell b { margin-left: 5px; font-weight: 500; }
.authorization-cell .valid, .authorization-cell .normal, .authorization-health .valid, .authorization-health .normal { color: #168866; }
.authorization-cell .invalid, .authorization-cell .abnormal, .authorization-health .invalid, .authorization-health .abnormal { color: #cf5b21; }
.authorization-cell .unknown, .authorization-health .unknown { color: #87909e; }
.authorization-link { color: #1677ff; width: fit-content; border: 0; padding: 0; background: none; font-size: 12px; cursor: pointer; }
.authorization-health { display: flex; gap: 36px; margin: 18px 0; padding: 12px 16px; border: 1px solid #e8edf3; border-radius: 8px; }
.authorization-health > div { display: flex; gap: 12px; align-items: center; }
.authorization-health span, .authorization-note { color: #87909e; font-size: 12px; }
.authorization-health strong { font-size: 12px; }
.sync-failures{margin-top:16px;border:1px solid #f1ddbf;border-radius:8px;background:#fffaf3;padding:14px;font-size:12px}.sync-failures p{margin:0 0 10px;color:#916d36}.sync-failures>div{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}.sync-failures span{color:#7c8795}
.access-panel {
  box-sizing: border-box;
  height: calc(100% - 72px);
  overflow: auto;
  padding: 28px 36px 48px;
  color: #202632;
  background: #fbfcfe;
}
.intro {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.eyebrow {
  color: #2563eb;
  font-size: 12px;
  font-weight: 650;
}
.intro h1 {
  margin: 8px 0 6px;
  font-size: 25px;
  font-weight: 650;
  letter-spacing: -0.5px;
}
.intro p,
.source-card p {
  margin: 0;
  color: #78808c;
  font-size: 13px;
  line-height: 1.7;
}
.intro-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.prototype,
.available {
  padding: 5px 9px;
  border-radius: 6px;
  background: #f0f2f5;
  color: #747d89;
  font-size: 12px;
  white-space: nowrap;
}
.primary-action,
.sync-button {
  border: 0;
  border-radius: 8px;
  background: #1677ff;
  color: #fff;
  padding: 9px 16px;
  font: 13px inherit;
  cursor: pointer;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  max-width: 920px;
  margin-bottom: 32px;
}
.metrics > div {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #e8ebef;
  border-radius: 11px;
  background: #fff;
  padding: 15px 17px;
}
.metric-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 10px;
}
.metric-icon.blue {
  background: #eaf3ff;
  color: #1677ff;
}
.metric-icon.green {
  background: #eaf8f0;
  color: #239160;
}
.metric-icon.amber {
  background: #fff4df;
  color: #c77d15;
}
.metrics p {
  display: flex;
  flex-direction: column;
  margin: 0;
  color: #87909d;
  font-size: 12px;
}
.metrics strong {
  margin-top: 1px;
  color: #253041;
  font-size: 20px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 13px;
}
.section-heading > div {
  display: flex;
  align-items: baseline;
  gap: 13px;
}
.section-heading h2 {
  margin: 0;
  font-size: 15px;
}
.section-heading span {
  color: #969ca5;
  font-size: 12px;
}
.source-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  max-width: 920px;
}
.source-card {
  border: 1px solid #e4e8ed;
  border-radius: 12px;
  background: #fff;
  padding: 20px;
}
.card-heading {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 15px;
}
.source-logo {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  place-items: center;
  border-radius: 10px;
  background: #1688ff;
  color: #fff;
  font-size: 21px;
  font-weight: 700;
}
.source-logo.small {
  width: 34px;
  height: 34px;
  flex-basis: 34px;
  border-radius: 9px;
  font-size: 17px;
}
.card-heading h3,
.upcoming h3 {
  margin: 0 0 3px;
  font-size: 14px;
}
.card-heading div > span {
  color: #949aa3;
  font-size: 12px;
}
.card-heading .available {
  margin-left: auto;
  background: #edf8f2;
  color: #25825a;
}
.features {
  display: flex;
  gap: 15px;
  margin: 15px 0;
  color: #747f8d;
  font-size: 12px;
}
.features span {
  display: flex;
  align-items: center;
  gap: 4px;
}
.connect {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  border: 0;
  border-radius: 8px;
  background: #edf5ff;
  color: #2476de;
  padding: 9px 12px;
  font: 13px inherit;
  cursor: pointer;
}
.upcoming {
  display: flex;
  min-height: 150px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-style: dashed;
  color: #a3abb6;
  text-align: center;
}
.upcoming p {
  max-width: 320px;
}
.upcoming > span {
  font-size: 12px;
}
.connection-heading {
  max-width: 1120px;
  margin-top: 30px;
}
.filter {
  border: 1px solid #e1e5eb;
  border-radius: 7px;
  background: #fff;
  padding: 7px 11px;
  color: #66717f;
  font: 12px inherit;
}
.connection-table {
  max-width: 1120px;
  overflow: hidden;
  border: 1px solid #e6e9ed;
  border-radius: 11px;
  background: #fff;
}
.table-head,
.connection-row {
  display: grid;
  grid-template-columns: minmax(160px, 1.3fr) minmax(110px, .9fr) minmax(100px, .8fr) minmax(105px, .8fr) minmax(135px, 1fr) 154px;
  align-items: center;
  gap: 16px;
  padding: 0 17px;
}
.table-head {
  height: 40px;
  background: #f7f8fa;
  color: #88919d;
  font-size: 12px;
}
.connection-row {
  min-height: 73px;
  border-top: 1px solid #edf0f3;
  cursor: pointer;
}
.connection-row:hover {
  background: #fbfdff;
}
.connection-row strong,
.connection-row small {
  display: block;
}
.connection-row strong {
  color: #354052;
  font-size: 13px;
  font-weight: 550;
}
.connection-row small {
  margin-top: 4px;
  color: #929aa5;
  font-size: 11px;
}
.source-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #27865d;
  font-size: 12px;
  font-weight: 550;
}
.state i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}
.state.syncing {
  color: #2477dc;
}
.state.warning {
  color: #c77a10;
}
.state.disconnected {
  color: #8a929d;
}
.row-actions {
  display: flex;
  gap: 5px;
}
.row-actions button {
  display: flex;
  align-items: center;
  gap: 5px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  padding: 7px;
  color: #3c70b8;
  font: 12px inherit;
  cursor: pointer;
}
.row-actions button:hover {
  background: #eef5ff;
}
.drawer-mask {
  position: fixed;
  z-index: 1200;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(23, 31, 42, 0.4);
}
.detail-modal {
  box-sizing: border-box;
  width: min(860px, 96vw);
  max-height: min(820px, 92vh);
  overflow: auto;
  border-radius: 16px;
  background: #fff;
  padding: 0 26px 22px;
  box-shadow: 0 24px 70px rgba(28, 42, 61, 0.24);
}
.detail-modal > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #edf0f3;
  padding: 20px 0;
}
.drawer-title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.drawer-title h2 {
  margin: 3px 0 0;
  font-size: 17px;
}
.icon-button {
  border: 0;
  background: transparent;
  color: #737c89;
  font-size: 25px;
  cursor: pointer;
}
.health-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0 12px;
  border: 1px solid #e5eaf0;
  border-radius: 11px;
  padding: 15px;
  background: #fbfcfe;
}
.health-card p {
  margin: 6px 0 0;
  color: #8b94a0;
  font-size: 12px;
}
.sync-button {
  display: flex;
  align-items: center;
  gap: 6px;
}
.notice {
  display: flex;
  align-items: center;
  gap: 7px;
  border-radius: 8px;
  background: #edf9f2;
  padding: 10px 12px;
  color: #267c57;
  font-size: 12px;
}
.detail-modal section {
  border-bottom: 1px solid #edf0f3;
  padding: 18px 0;
}
.detail-modal section h3 {
  margin: 0 0 14px;
  font-size: 14px;
}
.detail-modal dl {
  display: grid;
  grid-template-columns: 76px 1fr 76px 1fr;
  gap: 13px 16px;
  margin: 0;
  font-size: 13px;
}
.detail-modal dt {
  color: #929aa5;
}
.detail-modal dd {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  color: #354052;
}
.detail-modal dd button {
  border: 0;
  background: transparent;
  color: #2875d4;
  font: 12px inherit;
  cursor: pointer;
}
.sync-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.sync-stats div {
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 9px;
  background: #f7f8fa;
  padding: 12px;
}
.sync-stats strong {
  font-size: 18px;
}
.sync-stats span {
  margin-top: 3px;
  color: #929aa5;
  font-size: 11px;
}
.danger {
  color: #dc3d3d;
}
.timeline {
  display: inline-flex;
  width: calc(50% - 8px);
  box-sizing: border-box;
  gap: 10px;
  vertical-align: top;
}
.timeline + .timeline {
  margin-left: 12px;
}
.timeline > span {
  color: #349368;
}
.timeline p {
  margin: 0;
}
.timeline strong,
.timeline small {
  display: block;
  font-size: 12px;
}
.timeline small {
  margin-top: 3px;
  color: #969eaa;
}
.detail-modal > footer {
  display: flex;
  justify-content: space-between;
  padding-top: 18px;
}
.detail-modal > footer button {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #dfe4ea;
  border-radius: 8px;
  background: #fff;
  padding: 9px 13px;
  color: #52606f;
  font: 12px inherit;
  cursor: pointer;
}
.detail-modal > footer .danger-button {
  color: #cf3f3f;
}
.connection-table button,
.source-card button,
.intro button {
  font-family: inherit;
}
@media (max-width: 900px) {
  .access-panel {
    padding: 22px 18px;
  }
  .metrics,
  .source-grid {
    grid-template-columns: 1fr;
  }
  .table-head {
    display: none;
  }
  .connection-row {
    grid-template-columns: 1fr 1fr;
    padding: 14px;
  }
  .connection-row > div:nth-child(4) {
    display: none;
  }
  .intro {
    flex-direction: column;
  }
  .intro-actions {
    width: 100%;
    justify-content: space-between;
  }
  .detail-modal dl {
    grid-template-columns: 76px 1fr;
  }
}
button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.prototype-note {
  font-size: 12px;
  line-height: 1.7;
  color: #78808c;
}
.detail-modal {
  width: 100%;
  max-height: 78vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: none;
  padding: 0 10px 10px;
}
.detail-modal > header, .detail-modal > footer { flex-shrink: 0; }
.management-content { min-height: 0; overflow-y: auto; padding-right: 4px; }
.detail-modal dl {
  grid-template-columns: 88px 1fr;
}
.detail-modal dd button {
  flex-shrink: 0;
}
.connection-row small {
  font-size: 12px;
}
.connection-table {
  overflow-x: auto;
}
.el-checkbox-group {
  display: flex;
  flex-direction: column;
}
</style>
<style>
.connection-management-dialog .el-dialog__header {
  padding: 0;
}
.connection-management-dialog .el-dialog__body {
  padding: 0 12px;
}
</style>





