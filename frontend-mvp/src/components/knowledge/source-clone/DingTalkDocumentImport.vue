<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { FileText, ShieldCheck, UserRound } from 'lucide-vue-next'
import { ElAlert, ElButton, ElCheckbox, ElDialog, ElForm, ElFormItem, ElInput, ElOption, ElRadio, ElRadioGroup, ElSelect } from 'element-plus'
import { getPrototypeScenario, personalDingTalkDocuments, type BoundDingTalkIdentity, type ImportableDocument } from './dingtalkPrototype'

const props = withDefaults(defineProps<{
  identity: BoundDingTalkIdentity
  destinations: { id: string; name: string }[]
  applicationAvailable?: boolean
}>(), { applicationAvailable: true })
const emit = defineEmits<{
  close: []
  authorize: []
  complete: [record: { destinationId: string; newDestination?: string; documents: ImportableDocument[]; platformUserId: string }]
}>()
const scenario = getPrototypeScenario()
const keyword = ref('')
const selectedIds = ref<string[]>([])
const destination = ref('')
const destinationMode = ref<'existing' | 'new'>('existing')
const newDestination = ref('')
const importing = ref(false)
const results = ref<{ document: ImportableDocument; status: 'pending' | 'success' | 'failed'; reason?: string }[]>([])
const importedCount = computed(() => results.value.filter(result => result.status === 'success').length)
const error = ref('')
let importTimer: number | undefined
const documents = computed(() => props.applicationAvailable ? personalDingTalkDocuments(props.identity, scenario) : [])
const visibleDocuments = computed(() => documents.value.filter(document => document.name.includes(keyword.value.trim())))
const selectableIds = computed(() => new Set(documents.value.filter(document => document.exportable).map(document => document.id)))
const failedItems = computed(() => results.value.filter(result => result.status === 'failed'))
const ready = computed(() => props.applicationAvailable && props.identity.status === 'bound')
const hasValidTarget = computed(() => destinationMode.value === 'existing'
  ? props.destinations.some(item => item.id === destination.value)
  : newDestination.value.trim().length > 0 && newDestination.value.trim().length <= 60 && !props.destinations.some(item => item.name === newDestination.value.trim()))
const canImport = computed(() => ready.value && selectedIds.value.length > 0 && hasValidTarget.value && !importing.value)
const canRetry = computed(() => ready.value && !importing.value && hasValidTarget.value && failedItems.value.some(result => selectableIds.value.has(result.document.id)))
watch(() => [props.identity.platformUserId, props.identity.dingUserId, props.identity.status, props.applicationAvailable], () => {
  window.clearTimeout(importTimer)
  selectedIds.value = []
  importing.value = false
  results.value = []
  error.value = ''
}, { flush: 'sync' })
watch(() => props.destinations, () => {
  if (!props.destinations.some(item => item.id === destination.value)) destination.value = ''
}, { deep: true })
onBeforeUnmount(() => window.clearTimeout(importTimer))
function selectDocument(id: string, checked: unknown) {
  if (!selectableIds.value.has(id) || importing.value) return
  selectedIds.value = checked ? [...new Set([...selectedIds.value, id])] : selectedIds.value.filter(item => item !== id)
  results.value = []
  error.value = ''
}
function importDocuments(retryFailed = false) {
  if (importing.value) return
  error.value = ''
  if (!ready.value) { error.value = '请先完成当前账号的钉钉身份授权'; return }
  if (!hasValidTarget.value) { error.value = '请选择有写入权限的目标知识库，或填写不重名的1–60字新库名称'; return }
  const ids = retryFailed ? failedItems.value.filter(result => selectableIds.value.has(result.document.id)).map(result => result.document.id) : selectedIds.value
  const selected = documents.value.filter(document => ids.includes(document.id) && document.exportable)
  if (!selected.length || selected.length !== ids.length) { error.value = '文档权限或导出状态已变化，请重新选择'; return }
  const identityKey = props.identity.platformUserId + ':' + props.identity.dingUserId
  const targetMode = destinationMode.value
  const targetId = targetMode === 'new' ? 'local-dingtalk-' + Date.now() : destination.value
  const targetName = newDestination.value.trim()
  if (retryFailed) results.value = results.value.map(result => ids.includes(result.document.id) ? { ...result, status: 'pending', reason: undefined } : result)
  else results.value = selected.map(document => ({ document, status: 'pending' }))
  importing.value = true
  importTimer = window.setTimeout(() => {
    importing.value = false
    const targetStillValid = targetMode === 'new'
      ? !props.destinations.some(item => item.name === targetName)
      : props.destinations.some(item => item.id === targetId)
    if (!ready.value || identityKey !== props.identity.platformUserId + ':' + props.identity.dingUserId ||
      !targetStillValid || selected.some(document => !selectableIds.value.has(document.id))) {
      results.value = results.value.map(result => result.status === 'pending' ? { ...result, status: 'failed', reason: '身份、文档或目标权限已变化' } : result)
      error.value = '身份、文档或目标权限已变化，本次未导入，请重新选择'
      return
    }
    const failId = scenario === 'personal-partial' && !retryFailed ? selected[0]?.id : undefined
    const success = selected.filter(document => document.id !== failId)
    results.value = results.value.map(result => {
      if (!ids.includes(result.document.id)) return result
      return result.document.id === failId
        ? { ...result, status: 'failed', reason: '模拟导出超时，可单独重试' }
        : { ...result, status: 'success', reason: undefined }
    })
    if (success.length) {
      emit('complete', { destinationId: targetId, ...(targetMode === 'new' ? { newDestination: targetName } : {}), documents: success, platformUserId: props.identity.platformUserId })
      destinationMode.value = 'existing'
      destination.value = targetId
      newDestination.value = ''
    }
    selectedIds.value = []
  }, 700)
}
</script>

<template>
  <ElDialog :model-value="true" title="从钉钉导入文档" width="min(760px, 95vw)" align-center :close-on-click-modal="false" @close="emit('close')">
    <div class="personal-import" data-testid="dingtalk-personal-import">
      <ElAlert title="交互原型 · 身份、文档和权限为演示数据，不会实际连接钉钉。" type="info" :closable="false" show-icon />
      <div class="identity-card">
        <span class="identity-icon"><UserRound :size="21" /></span>
        <div><strong>我的钉钉身份</strong><p>{{ identity.displayName }} <span v-if="identity.status === 'bound'">· 已绑定当前账号</span></p></div>
        <span class="identity-status" :class="identity.status">{{ identity.status === 'bound' ? '身份已绑定' : identity.status === 'expired' ? '授权已失效' : '尚未绑定' }}</span>
      </div>
      <p class="permission-note"><ShieldCheck :size="16" />按当前账号绑定的钉钉身份展示文档，应用连接不会扩大你的文档权限。</p>
      <ElAlert v-if="!applicationAvailable" title="钉钉应用连接不可用，请联系管理员恢复；当前不能导入。" type="warning" :closable="false" />
      <div v-else-if="identity.status !== 'bound'" class="identity-recovery">
        <ElAlert :title="identity.status === 'expired' ? '请重新完成当前账号的钉钉授权后导入。' : '请先完成当前账号的钉钉身份绑定后导入。'" type="warning" :closable="false" />
        <ElButton style="margin-top: 10px" @click="emit('authorize')">模拟授权当前账号</ElButton>
        <p class="import-rule">正式授权由钉钉确认当前账号，不支持填写或切换其他人的 User ID。</p>
      </div>
      <template v-else>
        <ElInput v-model="keyword" placeholder="搜索我能访问的钉钉文档" aria-label="搜索我的钉钉文档" maxlength="60" clearable :disabled="importing" />
        <div class="document-list" aria-label="我能访问的钉钉文档">
          <label v-for="document in visibleDocuments" :key="document.id" class="import-document" :class="{ unavailable: !document.exportable }">
            <ElCheckbox :model-value="selectedIds.includes(document.id)" :disabled="!document.exportable || importing" :aria-label="document.name" @change="value => selectDocument(document.id, value)" />
            <FileText :size="19" />
            <span class="document-label"><strong>{{ document.name }}</strong><small>{{ document.format }} · 更新于 {{ document.updatedAt }}</small></span>
            <span class="export-status">{{ document.exportable ? '可导入' : document.exportReason }}</span>
          </label>
          <p v-if="!visibleDocuments.length" class="empty-documents">{{ keyword ? '没有匹配的文档' : '暂无可访问文档' }}</p>
        </div>
        <ElForm label-position="top" @submit.prevent="importDocuments()">
          <ElFormItem label="目标知识库" required>
            <ElRadioGroup v-model="destinationMode" :disabled="importing" style="display:flex;width:100%;margin-bottom:8px"><ElRadio value="existing">选择已有知识库</ElRadio><ElRadio value="new">新建个人知识库</ElRadio></ElRadioGroup>
            <ElSelect v-if="destinationMode === 'existing'" v-model="destination" aria-label="导入目标知识库" placeholder="选择有写入权限的知识库" style="width: 100%" :disabled="importing || !destinations.length">
              <ElOption v-for="item in destinations" :key="item.id" :label="item.name" :value="item.id" />
            </ElSelect>
            <ElInput v-else v-model="newDestination" aria-label="导入新知识库名称" placeholder="输入个人知识库名称" maxlength="60" :disabled="importing" />
          </ElFormItem>
        </ElForm>
        <p v-if="!destinations.length && destinationMode === 'existing'" class="destination-empty">暂无有写入权限的知识库，可新建个人知识库或申请写入权限。</p>
        <p class="import-rule">仅转存可导出且天马支持的文档，原生多维表暂不支持。本次为单次导入，不自动跟随更新。</p>
      </template>
      <section v-if="results.length" class="import-results" data-testid="dingtalk-import-results">
        <header><strong>本次导入结果 · 演示</strong><span>成功 {{ importedCount }} · 失败 {{ failedItems.length }}</span></header>
        <div v-for="result in results" :key="result.document.id"><span>{{ result.document.name }}</span><b :class="result.status">{{ result.status === 'pending' ? '导入中' : result.status === 'success' ? '已导入' : result.reason }}</b></div>
        <ElButton v-if="failedItems.length" :disabled="!canRetry" @click="importDocuments(true)">仅重试失败项</ElButton>
      </section>
      <ElAlert v-if="error" :title="error" type="error" :closable="false" />
    </div>
    <template #footer>
      <span class="selected-count">已选 {{ selectedIds.length }} 篇</span>
      <ElButton @click="emit('close')">{{ importedCount ? '完成' : '取消' }}</ElButton>
      <ElButton type="primary" :disabled="!canImport" :loading="importing" @click="importDocuments()">{{ importing ? '正在模拟导入' : '导入文档' }}</ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.personal-import{display:grid;gap:14px;max-height:70vh;overflow:auto;padding:2px 4px;color:#273547;font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif}
.identity-card{display:flex;gap:12px;align-items:center;border:1px solid #e5eaf0;border-radius:10px;padding:14px 16px;background:#fafbfd}
.identity-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:#eaf3ff;color:#3175c9}
.identity-card strong{font-size:14px}.identity-card p{margin:5px 0 0;color:#69788b;font-size:12px}.identity-status{margin-left:auto;color:#976c26;font-size:12px}.identity-status.bound{color:#228657}
.permission-note{display:flex;align-items:flex-start;gap:7px;margin:0;color:#5a6a7e;font-size:12px;line-height:1.6}
.document-list{max-height:276px;overflow:auto;border:1px solid #e7ebf0;border-radius:9px}
.import-document{display:flex;align-items:center;gap:10px;padding:10px 13px;cursor:pointer;border-bottom:1px solid #f0f2f5}.import-document:last-child{border-bottom:0}.import-document>svg{color:#6b94c9;flex-shrink:0}
.document-label{min-width:0;flex:1}.document-label strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:500}.document-label small{display:block;margin-top:4px;color:#95a0ae;font-size:11px}
.export-status{max-width:190px;font-size:11px;color:#2e9065}.unavailable{background:#fafafa;cursor:default}.unavailable .export-status{color:#9b9b9b}.unavailable .document-label strong{color:#8b94a0}
.import-results{border:1px solid #e7ebf0;border-radius:9px;padding:12px}.import-results header{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px;font-size:12px}.import-results header>span{color:#8490a0}.import-results>div{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:8px 0;font-size:12px}.import-results b{font-size:11px;font-weight:400;color:#8190a0}.import-results .success{color:#27895b}.import-results .failed{color:#c65c4c}.import-results .el-button{margin-top:8px}
.import-rule,.destination-empty{margin:0;color:#8490a0;font-size:12px;line-height:1.7}.destination-empty{color:#a16b27}.empty-documents{padding:30px;text-align:center;color:#9aa3ae;font-size:13px}.selected-count{float:left;line-height:32px;color:#8190a1;font-size:12px}
@media(max-width:560px){.import-document{flex-wrap:wrap}.export-status{margin-left:46px;max-width:100%}.identity-status{max-width:65px}}
</style>
