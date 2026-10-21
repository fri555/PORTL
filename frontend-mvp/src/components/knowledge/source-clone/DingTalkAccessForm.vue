<script setup lang="ts">
import { documents, selectScope, getPrototypeScenario, syncSchedule, type SyncInterval } from './dingtalkPrototype'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { CheckCircle2, Info, ShieldCheck } from 'lucide-vue-next'
import {
  ElAlert,
  ElButton,
  ElCheckbox,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElStep,
  ElSteps,
  ElTree,
} from 'element-plus'

const props = defineProps<{
  destinations: { id: string; name: string }[]
  requiresUserId?: boolean
  existingNames?: string[]
}>()
const emit = defineEmits<{
  complete: [
    record: {
      name: string
      destination: string
      count: number
      folder: string
      sourceId: string
      selectedKeys: string[]
      source: string
      schedule: string
      executionUserId?: string
    },
  ]
  close: []
}>()
const step = ref(0)
const scenario = getPrototypeScenario()
const scopeReadStatus = ref<'ready' | 'loading' | 'error'>(scenario === 'scope-error' ? 'error' : scenario === 'scope-loading' ? 'loading' : 'ready')
let scopeReadTimer: number | undefined
const noLibraries = ['no-libraries', 'no-permission'].includes(scenario)
const form = reactive({
  name: '',
  appKey: '',
  appSecret: '',
  useUserId: false,
  userId: '',
  destinationMode: 'existing',
  destination: '',
  newDestination: '',
  folder: '钉钉制度文档',
  interval: 'daily' as SyncInterval,
  schedule: '00:00',
})
const error = ref('')
const checking = ref(false)
const checkedConnection = ref(false)
const checked = ref<string[]>([])
const selectedKeys = ref<string[]>([])
const treeDefaults = ref<string[]>([])
watch(step, value => { if(value===1) treeDefaults.value=[...selectedKeys.value] }, { flush:'sync' })
const search = ref('')
const sourceId = ref('policies')
let verificationTimer: number | undefined
const tree = ref<InstanceType<typeof ElTree>>()
const selectedLibrary = computed(() => documents.find((item) => item.id === sourceId.value)!)
const sourceTreeData = computed(() => noLibraries ? [] : [selectedLibrary.value])
watch(sourceId, () => {
  checked.value = []; selectedKeys.value = []
  treeDefaults.value=[]
  search.value = ''
  error.value = ''
})
watch(
  () => [form.appKey, form.appSecret, form.userId, form.useUserId],
  () => {
    checkedConnection.value = false
    checking.value = false
    checked.value = []; selectedKeys.value = []; search.value = ''
    window.clearTimeout(verificationTimer)
  },
  { flush: 'sync' },
)
onBeforeUnmount(() => { window.clearTimeout(verificationTimer); window.clearTimeout(scopeReadTimer) })
function retryScopeRead() {
  window.clearTimeout(scopeReadTimer)
  scopeReadStatus.value = 'loading'
  error.value = ''
  scopeReadTimer = window.setTimeout(() => { scopeReadStatus.value = 'ready' }, 450)
}
const destinationName = computed(() =>
  form.destinationMode === 'new'
    ? form.newDestination.trim()
    : (props.destinations.find((item) => item.id === form.destination)?.name ?? ''),
)

function example() {
  Object.assign(form, {
    name: '钉钉 · 集团制度知识库',
    appKey: 'dingxxxxxxxxxxxx',
    appSecret: '••••••••••••••••',
    useUserId: false,
    userId: '',
  })
  checkedConnection.value = false
  error.value = ''
}
function verifyConnection(advance = false) {
  if (checking.value) return
  error.value = ''
  if (
    ![form.name, form.appKey, form.appSecret].every((value) => value.trim()) ||
    ((props.requiresUserId || form.useUserId) && !form.userId.trim())
  ) {
    error.value = '请填写连接名称、App Key、App Secret；启用用户身份时还需填写 User ID。'
    return
  }
  if (form.name.trim().length > 50 || form.appKey.length > 256 || form.appSecret.length > 512 || form.userId.length > 128 || /\s/.test(form.appKey) || /\s/.test(form.appSecret)) { error.value = '请检查字段长度；凭证不能包含空白字符。'; return }
  checking.value = true
  verificationTimer = window.setTimeout(() => {
    checking.value = false
    checkedConnection.value = true
    if (advance) step.value = 1
  }, 450)
}
function next() {
  error.value = ''
  if (step.value === 0) {
    if (!form.name.trim() || form.name.trim().length > 50) { error.value = '请填写 1–50 字的连接名称、App Key、App Secret 等必填内容。'; return }
    if (props.existingNames?.includes(form.name.trim())) { error.value = '连接名称已存在，请修改'; return }
    if (!checkedConnection.value) {
      verifyConnection(true)
      return
    }
    step.value = 1
  } else if (step.value === 1) {
    if (scopeReadStatus.value !== 'ready') { error.value = '范围统计尚未完成，请在完整读取成功后继续。'; return }
    if (!checked.value.length) {
      error.value = '请至少选择一篇文档。'
      return
    }
    step.value = 2
  } else {
    if (scopeReadStatus.value !== 'ready') { error.value = '范围统计尚未完成，请返回重新读取'; return }
    if (!checkedConnection.value) { error.value = '连接校验已失效，请返回第一步重新测试'; return }
    if (props.existingNames?.includes(form.name.trim())) { error.value = '连接名称已存在，请修改'; return }
    if (!checked.value.length) { error.value = '请返回并重新选择有效文档'; return }
    if (!destinationName.value || !form.folder.trim() || !form.interval || (form.interval === 'daily' && !form.schedule)) {
      error.value = '请选择或新建目标知识库，并填写来源文件夹名称。'
      return
    }
    if (
      form.destinationMode === 'new' &&
      props.destinations.some((item) => item.name === destinationName.value)
    ) {
      error.value = '该知识库名称已存在，请选择现有知识库或使用其他名称。'
      return
    }
    if (form.destinationMode === 'existing' && !props.destinations.some(item => item.id === form.destination)) { error.value = '请选择有写入权限的目标知识库'; return }
    if ((form.destinationMode === 'new' && destinationName.value.length > 60) || form.folder.trim().length > 80) { error.value = '知识库名称最多 60 字，来源文件夹最多 80 字。'; return }
    if (form.interval === 'daily' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.schedule)) { error.value = '请选择有效的同步时间'; return }
    emit('complete', {
      name: form.name.trim(),
      destination: destinationName.value,
      count: checked.value.length,
      folder: form.folder.trim(),
      sourceId: sourceId.value,
      selectedKeys: [...selectedKeys.value],
      source: `${selectedLibrary.value.label} / 已选 ${checked.value.length} 篇`,
      schedule: syncSchedule(form.interval, form.schedule),
      ...((props.requiresUserId || form.useUserId) ? { executionUserId: form.userId.trim() } : {}),
    })
  }
}
function updateSelection(node: {id: string; type: string}) {
  selectedKeys.value = selectScope(selectedKeys.value, node, (tree.value?.getCheckedKeys() ?? []).map(String), selectedLibrary.value)
  checked.value = (tree.value?.getCheckedKeys(true) ?? []).map(String)
}
function filterDocument(value: string, data: Record<string, unknown>) {
  return !value || String(data.label ?? '').includes(value)
}
if (['create-scope','create-rules','no-libraries','no-permission','no-scope','scope-loading','scope-error'].includes(scenario)) {
  example()
  checkedConnection.value = true
  step.value = scenario === 'create-rules' ? 2 : 1
  if (scenario === 'create-rules') { checked.value=['onboarding','attendance','expense']; selectedKeys.value=['policies']; form.destination=props.destinations[0]?.id ?? '' }
}
if (scenario === 'required-error') error.value='请填写连接名称、App Key 和 App Secret。'
</script>

<template>
  <ElDialog
    :model-value="true"
    title="新建钉钉数据源"
    width="min(820px, 95vw)"
    align-center
    :close-on-click-modal="false"
    @close="emit('close')"
  >
    <div class="wizard">
      <ElSteps :active="step" finish-status="success" simple
        ><ElStep title="配置连接" /><ElStep title="选择同步范围" /><ElStep title="设置同步规则"
      /></ElSteps>
      <ElAlert
        title="交互原型：请使用示例凭证，不会连接钉钉或保存密钥；同步结果为演示数据。"
        type="info"
        :closable="false"
        show-icon
      />

      <ElForm v-if="step === 0" label-position="top" @submit.prevent="next">
        <div class="form-heading">
          <div>
            <span class="step-label">第 1 步，共 3 步</span>
            <h3>连接钉钉企业内部应用</h3>
            <p>配置企业应用连接与同步执行身份，供管理员持续接入。</p>
          </div>
          <ElButton text type="primary" @click="example">填入示例</ElButton>
        </div>
        <ElFormItem label="连接名称" required
          ><ElInput
            v-model="form.name"
            aria-label="连接名称"
            placeholder="例如：钉钉 · 集团制度知识库"
            maxlength="50"
        /></ElFormItem>
        <div class="columns">
          <ElFormItem label="App Key" required
            ><ElInput
              v-model="form.appKey"
              aria-label="App Key" maxlength="256"
              placeholder="请输入应用 App Key"
              autocomplete="off" /></ElFormItem
          ><ElFormItem label="App Secret" required
            ><ElInput
              v-model="form.appSecret"
              aria-label="App Secret" maxlength="512"
              type="password"
              show-password
              placeholder="请输入应用 App Secret"
              autocomplete="new-password"
          /></ElFormItem>
        </div>

        <ElCheckbox v-if="!requiresUserId" v-model="form.useUserId" class="execution-identity-toggle">使用指定同步执行身份</ElCheckbox>
        <ElFormItem v-if="requiresUserId || form.useUserId" label="同步执行身份 User ID" required
          ><ElInput
            v-model="form.userId"
            aria-label="User ID" maxlength="128"
            placeholder="请输入管理员确认的同步执行用户 ID"
            autocomplete="off"
        /></ElFormItem>
        <div class="permission-box">
          <ShieldCheck :size="20" />
          <div>
            <strong>应用连接与文档权限分开校验</strong>
            <p>
              应用权限决定能否调用导出接口，执行身份决定可访问哪些文档。此处凭证仅供管理员同步，不向普通用户共享该身份权限。
            </p>
          </div>
        </div>
        <button type="button" class="verify" :disabled="checking" @click="verifyConnection()">
          {{ checking ? '正在验证连接…' : checkedConnection ? '重新测试连接' : '测试连接' }}
        </button>
        <div v-if="checkedConnection" class="verify-result">
          <CheckCircle2 :size="17" />
          <div>
            <strong>模拟连接成功</strong>
            <p>企业：江苏天马网络科技集团有限公司 · 已发现 2 个知识库 · 已发现可导出且可转存的文档</p>
          </div>
        </div>
      </ElForm>

      <section v-else-if="step === 1">
        <div class="form-heading">
          <div>
            <span class="step-label">第 2 步，共 3 步</span>
            <h3>选择一个知识库及同步范围</h3>
            <p>一个数据源只能绑定一个钉钉知识库，可继续细选文件夹或文档。</p>
          </div>
          <span class="selection-count">{{ scopeReadStatus === 'ready' ? `已选 ${checked.length} 篇` : scopeReadStatus === 'loading' ? '统计中' : '统计未完成' }}</span>
        </div>
        <ElSelect
          :disabled="scopeReadStatus !== 'ready'"
          v-model="sourceId"
          aria-label="来源知识库"
          style="width: 100%; margin-bottom: 12px"
          ><ElOption
            v-for="library in noLibraries ? [] : documents"
            :key="library.id"
            :value="library.id"
            :label="library.label"
        /></ElSelect>
        <ElInput
          :disabled="scopeReadStatus !== 'ready'"
          v-model="search"
          aria-label="搜索钉钉文档" maxlength="60"
          placeholder="搜索知识库、文件夹或文档"
          clearable
          @input="tree?.filter(search)"
        />
        <ElTree v-if="scopeReadStatus === 'ready'"
          ref="tree"
          class="document-tree"
          :key="sourceId"
          :data="sourceTreeData"
          node-key="id"
          show-checkbox
          default-expand-all
          :default-checked-keys="treeDefaults"
          :filter-node-method="filterDocument"
          @check="updateSelection"
        >
          <template #default="{ data }"
            ><span class="tree-node"
              ><span>{{ data.label }}</span
              ><em>{{
                data.type === 'knowledge'
                  ? '知识库'
                  : data.type === 'folder'
                    ? '文件夹'
                    : '可导出文档'
              }}</em></span
            ></template
          >
        </ElTree>
        <div v-else class="document-tree" role="status" :data-testid="scopeReadStatus === 'error' ? 'scope-read-error' : 'scope-read-loading'">
          <ElAlert :title="scopeReadStatus === 'loading' ? '正在读取完整目录，范围统计中…' : '目录读取失败，请重新读取后选择同步范围。已有同步内容保持原状态。'" :type="scopeReadStatus === 'loading' ? 'info' : 'error'" :closable="false" show-icon />
          <ElButton v-if="scopeReadStatus === 'error'" style="margin-top: 12px" @click="retryScopeRead">重新读取</ElButton>
        </div>
        <div class="scope-note">
          <Info :size="16" /><span
            >仅展示当前执行身份可访问、钉钉可导出且天马可转存的文档；原生多维表暂不支持。勾选目录会包含后续新增文档，逐篇勾选只同步所选文档。</span
          >
        </div>
      </section>

      <ElForm v-else label-position="top" @submit.prevent="next">
        <div class="form-heading">
          <div>
            <span class="step-label">第 3 步，共 3 步</span>
            <h3>设置写入位置与同步规则</h3>
            <p>创建后立即首次导入所选范围，之后按计划增量更新。</p>
          </div>
        </div>
        <ElFormItem label="目标知识库" required>
          <ElRadioGroup v-model="form.destinationMode" class="destination-mode"
            ><ElRadio value="existing">选择现有知识库</ElRadio
            ><ElRadio value="new">新建知识库</ElRadio></ElRadioGroup
          >
          <ElSelect
            v-if="form.destinationMode === 'existing'"
            v-model="form.destination"
            aria-label="保存位置"
            placeholder="选择知识库"
            filterable
            style="width: 100%"
            ><ElOption
              v-for="item in destinations"
              :key="item.id"
              :value="item.id"
              :label="item.name"
          /></ElSelect>
          <ElInput
            v-else
            v-model="form.newDestination"
            aria-label="新知识库名称"
            placeholder="输入新知识库名称"
            maxlength="60"
          />
        </ElFormItem>
        <div class="columns">
          <ElFormItem label="来源文件夹名称" required
            ><ElInput
              v-model="form.folder"
              aria-label="来源文件夹名称"
              maxlength="80" /></ElFormItem
          ><ElFormItem label="更新频率" required
            ><ElSelect v-model="form.interval" aria-label="更新频率" style="width:100%"><ElOption value="hourly" label="每小时" /><ElOption value="daily" label="每天" /></ElSelect></ElFormItem>
        </div>
        <div class="columns">
          <ElFormItem v-if="form.interval === 'daily'" label="每日同步时间（北京时间）" required
            ><ElInput v-model="form.schedule" type="time" aria-label="每日同步时间"
          /></ElFormItem>
        </div>
        <div class="summary-card">
          <strong>创建后将执行</strong>
          <dl>
            <dt>同步来源</dt>
            <dd>{{ selectedLibrary.label }} · {{ checked.length }} 篇可导出文档</dd>
            <dt>写入位置</dt>
            <dd>{{ destinationName || '尚未选择' }} / {{ form.folder }}</dd>
            <dt>更新策略</dt>
            <dd>立即首次导入，此后{{ form.interval === 'hourly' ? '每小时增量更新（从保存时刻起）' : '每天 ' + form.schedule + ' 增量更新' }}</dd>
            <dt>权限规则</dt>
            <dd>每位访问者仍需通过自己的钉钉文档权限与平台知识库权限校验</dd>
            <dt>断开连接</dt>
            <dd>停止更新并保留内容；访问仍需通过校验</dd>
          </dl>
        </div>
      </ElForm>
      <ElAlert v-if="error" :title="error" type="error" :closable="false" show-icon />
    </div>
    <template #footer
      ><div class="footer">
        <ElButton @click="emit('close')">取消</ElButton>
        <div>
          <ElButton
            v-if="step > 0"
            @click="
              step--;
              error = '';
            "
            >上一步</ElButton
          ><ElButton type="primary" :loading="checking" :disabled="step > 0 && scopeReadStatus !== 'ready'" @click="next">{{
            step === 0
              ? checkedConnection
                ? '下一步'
                : '测试连接并继续'
              : step === 1
                ? '下一步'
                : `创建数据源并同步 ${checked.length} 篇`
          }}</ElButton>
        </div>
      </div></template
    >
  </ElDialog>
</template>

<style scoped>
.wizard {
  display: grid;
  gap: 18px;
  max-height: 70vh;
  overflow: auto;
  padding: 2px 5px;
}
.form-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}
.step-label {
  display: block;
  margin-bottom: 4px;
  color: #1677ff;
  font-size: 11px;
  font-weight: 650;
}
h3 {
  margin: 0 0 5px;
  color: #263445;
  font-size: 17px;
  font-weight: 650;
}
p {
  margin: 0;
  color: #87909e;
  font-size: 12px;
  line-height: 1.7;
}
.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.execution-identity-toggle{margin-bottom:12px}
.identity-toggle {
  display: flex;
  gap: 10px;
  margin: -2px 0 17px;
  border: 1px solid #e4e8ed;
  border-radius: 8px;
  padding: 12px 14px;
  cursor: pointer;
}
.identity-toggle input {
  margin-top: 3px;
}
.identity-toggle strong,
.identity-toggle small {
  display: block;
}
.identity-toggle strong {
  color: #3c4654;
  font-size: 13px;
}
.identity-toggle small {
  margin-top: 3px;
  color: #9199a5;
  font-size: 11px;
}
.permission-box {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  border-radius: 9px;
  background: #f6f9fe;
  padding: 13px;
  color: #3177ce;
}
.permission-box strong {
  display: block;
  color: #3e5068;
  font-size: 12px;
}
.permission-box p {
  margin-top: 3px;
}
.verify {
  width: 100%;
  border: 1px solid #b9d4f7;
  border-radius: 8px;
  background: #eff6ff;
  color: #1f6fd2;
  padding: 10px;
  font: 13px inherit;
  cursor: pointer;
}
.verify-result {
  display: flex;
  gap: 9px;
  margin-top: 12px;
  border: 1px solid #cdebd9;
  border-radius: 9px;
  background: #f2fbf5;
  padding: 12px;
  color: #218557;
}
.verify-result strong {
  display: block;
  font-size: 13px;
}
.verify-result p {
  margin-top: 2px;
  color: #658471;
}
.selection-count {
  border-radius: 14px;
  background: #edf5ff;
  padding: 5px 10px;
  color: #2474d4;
  font-size: 12px;
}
.document-tree {
  margin: 13px 0;
  padding: 11px;
  border: 1px solid #e5e9ef;
  border-radius: 8px;
  min-height: 250px;
}
.document-tree :deep(.el-tree-node__content) {
  height: 38px;
}
.tree-node {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding-right: 12px;
}
.tree-node em {
  border-radius: 5px;
  background: #f3f5f7;
  padding: 2px 6px;
  color: #929aa5;
  font-size: 10px;
  font-style: normal;
}
.scope-note {
  display: flex;
  gap: 8px;
  border-radius: 8px;
  background: #fff7e8;
  padding: 11px;
  color: #9a671b;
  font-size: 12px;
  line-height: 1.6;
}
.destination-mode {
  display: flex;
  margin-bottom: 10px;
}
.summary-card {
  border: 1px solid #e4e8ed;
  border-radius: 9px;
  background: #f8fafc;
  padding: 15px 18px;
}
.summary-card > strong {
  display: block;
  margin-bottom: 12px;
  color: #374355;
  font-size: 13px;
}
.summary-card dl {
  display: grid;
  grid-template-columns: 82px 1fr;
  gap: 9px;
  margin: 0;
  font-size: 12px;
}
.summary-card dt {
  color: #8993a0;
}
.summary-card dd {
  margin: 0;
  color: #475466;
}
.footer {
  display: flex;
  justify-content: space-between;
}
@media (max-width: 560px) {
  .columns {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .wizard :deep(.el-step__title) {
    font-size: 11px;
  }
}
</style>



