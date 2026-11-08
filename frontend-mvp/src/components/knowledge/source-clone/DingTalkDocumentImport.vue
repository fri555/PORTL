<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { AlertTriangle, ChevronRight, FileSearch, FileText, FolderOpen, Search, Upload, X } from 'lucide-vue-next'
import { ElButton, ElDialog } from 'element-plus'
import KnowledgeDestinationSelect from './KnowledgeDestinationSelect.vue'
import type { DingTalkImportTask, DingTalkSyncFrequency, KnowledgeDestination, KnowledgeSpace } from '@/types/knowledge-source'
import { canImportDingTalkSource, initializeDingTalkPermissions } from '@/utils/dingtalkPermissionInitialization'
import { documents as documentHierarchy, myDocuments, getPrototypeScenario, personalDingTalkDocuments, type BoundDingTalkIdentity, type ImportableDocument } from './dingtalkPrototype'

type ImportAttempt = { importTaskId?: string; destinationId: string; documents: ImportableDocument[]; platformUserId: string; frequency: DingTalkSyncFrequency; schedule: string }
const props = withDefaults(defineProps<{
  identity: BoundDingTalkIdentity
  destinations: KnowledgeDestination[]
  space?: KnowledgeSpace
  applicationAvailable?: boolean
  defaultDestinationId?: string
  existingSourceIds?: Record<string, string[]>
  initialTask?: DingTalkImportTask
}>(), { applicationAvailable: true, defaultDestinationId: '', space: 'public', initialTask: undefined })
const emit = defineEmits<{ close: []; authorize: []; complete: [record: ImportAttempt]; failed: [record: ImportAttempt] }>()
const scenario = getPrototypeScenario()
const destination = ref(props.initialTask?.destinationId ?? props.defaultDestinationId)
const keyword = ref('')
const selectedIds = ref(props.initialTask?.documentMappings.map(item => item.sourceDocumentId) ?? [])
const pickerOpen = ref(false), importing = ref(false), error = ref('')
const MAX_IMPORT_DOCUMENTS = 100
const pickerError = ref('')
const publicConfirmOpen = ref(false)
const frequency = ref<DingTalkSyncFrequency>(props.initialTask?.frequency ?? '每天')
const weekDay = ref('周一'), monthDay = ref('1日'), schedule = ref('00:00')
const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const monthDays = Array.from({ length: 28 }, (_, index) => `${index + 1}日`)
const editing = computed(() => Boolean(props.initialTask))

function hydrateSchedule(task?: DingTalkImportTask) {
  frequency.value = task?.frequency ?? '每天'
  const parts = (task?.schedule ?? '').split(' ')
  schedule.value = parts.find(part => /^\d{2}:\d{2}$/.test(part)) ?? '00:00'
  weekDay.value = weekDays.find(day => parts.includes(day)) ?? '周一'
  monthDay.value = monthDays.find(day => parts.includes(day)) ?? '1日'
}
hydrateSchedule(props.initialTask)

const documents = computed(() => props.applicationAvailable ? personalDingTalkDocuments(props.identity, scenario).filter(document => canImportDingTalkSource(document.sourceRole)) : [])
type PickerSection = 'root' | 'knowledge' | 'mine'
const pickerSection = ref<PickerSection>('root')
interface SourceNode { id: string; label?: string; type: string; children?: SourceNode[] }
interface PickerNode { id: string; name: string; document?: ImportableDocument; children: PickerNode[] }
interface PickerRow { node: PickerNode; depth: number; expanded: boolean }
const expandedIds = ref<string[]>([])
const pickerSelectedIds = ref<string[]>([])
const pickerTree = computed(() => {
  const allowed = new Map(documents.value.map(document => [document.id, document]))
  const build = (source: SourceNode): PickerNode | null => {
    if (source.type === 'doc') {
      const document = allowed.get(source.id)
      return document ? { id: document.id, name: document.name, document, children: [] } : null
    }
    const sources = source.id === 'products' ? [...(source.children ?? []), { id: 'native-table', type: 'doc' }] : source.children ?? []
    const children = sources.map(build).filter((node): node is PickerNode => node !== null)
    return children.length ? { id: source.id, name: source.label ?? source.id, children } : null
  }
  const source: SourceNode[] = pickerSection.value === 'mine' ? myDocuments : pickerSection.value === 'knowledge' ? documentHierarchy : []
  return source.map(build).filter((node): node is PickerNode => node !== null)
})
const filteredTree = computed(() => {
  const search = keyword.value.trim().toLocaleLowerCase()
  const filter = (node: PickerNode): PickerNode | null => {
    if (!search || node.name.toLocaleLowerCase().includes(search)) return node
    const children = node.children.map(filter).filter((child): child is PickerNode => child !== null)
    return children.length ? { ...node, children } : null
  }
  return pickerTree.value.map(filter).filter((node): node is PickerNode => node !== null)
})
const pickerRows = computed(() => {
  const rows: PickerRow[] = []
  const visit = (node: PickerNode, depth: number) => {
    const expanded = !node.document && (!!keyword.value.trim() || expandedIds.value.includes(node.id))
    rows.push({ node, depth, expanded })
    if (expanded) node.children.forEach(child => visit(child, depth + 1))
  }
  filteredTree.value.forEach(node => visit(node, 0))
  return rows
})
function documentIds(node: PickerNode): string[] { return node.document ? [node.id] : node.children.flatMap(documentIds) }
function completeNode(node: PickerNode): PickerNode {
  const find = (nodes: PickerNode[]): PickerNode | undefined => {
    for (const candidate of nodes) {
      if (candidate.id === node.id) return candidate
      const child = find(candidate.children)
      if (child) return child
    }
  }
  return find(pickerTree.value) ?? node
}
function selectionState(node: PickerNode): 'none' | 'some' | 'all' {
  const ids = documentIds(completeNode(node))
  const count = ids.filter(id => pickerSelectedIds.value.includes(id)).length
  return count === 0 ? 'none' : count === ids.length ? 'all' : 'some'
}
function toggleNode(node: PickerNode, event?: Event) {
  const ids = documentIds(completeNode(node))
  const state = selectionState(node)
  const next = state === 'all' ? pickerSelectedIds.value.filter(id => !ids.includes(id)) : [...new Set([...pickerSelectedIds.value, ...ids])]
  if (next.length > MAX_IMPORT_DOCUMENTS) {
    if (event?.target instanceof HTMLInputElement) event.target.checked = state === 'all'
    pickerError.value = `单次最多选择 ${MAX_IMPORT_DOCUMENTS} 篇文档`
    return
  }
  pickerSelectedIds.value = next
  pickerError.value = ''
}
const sectionDocumentIds = computed(() => pickerTree.value.flatMap(documentIds))
const allSectionSelected = computed(() => sectionDocumentIds.value.length > 0 && sectionDocumentIds.value.every(id => pickerSelectedIds.value.includes(id)))
function toggleAllSection(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  const next = checked ? [...new Set([...pickerSelectedIds.value, ...sectionDocumentIds.value])] : pickerSelectedIds.value.filter(id => !sectionDocumentIds.value.includes(id))
  if (next.length <= MAX_IMPORT_DOCUMENTS) pickerSelectedIds.value = next
}
function toggleFolder(node: PickerNode) { expandedIds.value = expandedIds.value.includes(node.id) ? expandedIds.value.filter(id => id !== node.id) : [...expandedIds.value, node.id] }
function openPicker() { pickerSelectedIds.value = [...selectedIds.value]; pickerError.value = ''; pickerSection.value = 'root'; keyword.value = ''; expandedIds.value = []; pickerOpen.value = true }
function enterSection(section: Exclude<PickerSection, 'root'>) { pickerSection.value = section; pickerError.value = ''; keyword.value = ''; expandedIds.value = [] }
function returnToSources() { pickerSection.value = 'root'; pickerError.value = ''; keyword.value = ''; expandedIds.value = [] }
function confirmPicker() { selectedIds.value = [...pickerSelectedIds.value]; pickerOpen.value = false; error.value = '' }
function rowKeydown(event: KeyboardEvent, row: PickerRow) {
  if (event.target !== event.currentTarget) return
  if (event.key === ' ') { event.preventDefault(); toggleNode(row.node) }
  if (!row.node.document && !keyword.value.trim() && ((event.key === 'ArrowRight' && !row.expanded) || (event.key === 'ArrowLeft' && row.expanded))) { event.preventDefault(); toggleFolder(row.node) }
}

const selectedDocuments = computed(() => selectedIds.value.map(id => documents.value.find(item => item.id === id)).filter(Boolean) as ImportableDocument[])
const publicDestination = computed(() => (props.destinations.find(item => item.id === destination.value)?.space ?? props.space) === 'public')
const unsupportedCount = computed(() => selectedDocuments.value.filter(item => !item.exportable).length)
const skippedGroupCount = computed(() => publicDestination.value ? selectedDocuments.value.reduce((count, document) => count + (document.initialPermissions?.grants.filter(grant => grant.kind === 'group').length ?? 0), 0) : 0)
const initialSourceIds = computed(() => new Set(props.initialTask?.documentMappings.map(item => item.sourceDocumentId) ?? []))
const duplicateIds = computed(() => selectedDocuments.value.filter(item => !initialSourceIds.value.has(item.id) && props.existingSourceIds?.[destination.value]?.includes(item.id)).map(item => item.id))
const ready = computed(() => props.applicationAvailable && props.identity.status === 'bound')
const validSchedule = computed(() => frequency.value === '不自动同步' || /^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.value))
const canImport = computed(() => ready.value && props.destinations.some(item => item.id === destination.value) && selectedDocuments.value.length > 0 && selectedDocuments.value.length <= MAX_IMPORT_DOCUMENTS && !unsupportedCount.value && !duplicateIds.value.length && validSchedule.value && !importing.value)
watch(() => props.defaultDestinationId, id => { if (!editing.value && id && props.destinations.some(item => item.id === id)) destination.value = id })
watch(() => props.destinations, () => { if (!props.destinations.some(item => item.id === destination.value)) destination.value = '' }, { deep: true })
watch(() => props.initialTask, task => { destination.value = task?.destinationId ?? props.defaultDestinationId; selectedIds.value = task?.documentMappings.map(item => item.sourceDocumentId) ?? []; hydrateSchedule(task) }, { deep: true })
function removeDocument(id: string) { selectedIds.value = selectedIds.value.filter(item => item !== id) }
let importTimer: number | undefined
watch(() => [props.identity.platformUserId, props.identity.dingUserId, props.identity.status], () => { if (importTimer) window.clearTimeout(importTimer); importing.value = false; pickerOpen.value = false })
onBeforeUnmount(() => { if (importTimer) window.clearTimeout(importTimer) })
function currentSchedule() {
  return frequency.value === '不自动同步' ? '—' : frequency.value === '每周' ? `${weekDay.value} ${schedule.value}` : frequency.value === '每月' ? `${monthDay.value} ${schedule.value}` : schedule.value
}
function submit() {
  if (!canImport.value) return
  if (!editing.value && props.destinations.find(item => item.id === destination.value)?.space === 'public') { publicConfirmOpen.value = true; return }
  runImport()
}
function runImport() {
  publicConfirmOpen.value = false
  if (!canImport.value) return
  const selected = [...selectedDocuments.value]
  const platformUserId = props.identity.platformUserId
  const destinationId = destination.value
  const attempt: ImportAttempt = { importTaskId: props.initialTask?.importTaskId, destinationId, documents: selected, platformUserId, frequency: frequency.value, schedule: currentSchedule() }
  importing.value = true
  importTimer = window.setTimeout(() => {
    importing.value = false
    if (!ready.value || props.identity.platformUserId !== platformUserId || selected.length > MAX_IMPORT_DOCUMENTS || !props.destinations.some(item => item.id === destinationId)
      || selected.some(item => !initialSourceIds.value.has(item.id) && props.existingSourceIds?.[destinationId]?.includes(item.id))
      || selected.some(item => !personalDingTalkDocuments(props.identity, scenario).some(current => current.id === item.id && current.exportable && canImportDingTalkSource(current.sourceRole)))) {
      error.value = '权限或连接已变更，本次未保存，请重新选择。'
      return
    }
    const failures: string[] = []
    if (!editing.value && props.destinations.find(item => item.id === destinationId)?.space === 'public') {
      selected.forEach(document => { try { initializeDingTalkPermissions(props.identity.displayName, document.initialPermissions) } catch (cause) { failures.push(cause instanceof Error ? cause.message : '权限成员未完整获取，本次未导入，请重试。') } })
    }
    if (failures.length === selected.length) { error.value = failures[0]!; emit('failed', attempt); return }
    emit('complete', attempt)
    emit('close')
  }, 500)
}
</script>

<template>
<ElDialog v-model="publicConfirmOpen" title="确认导入" width="420px" align-center append-to-body><p>确认同步文档到公共空间中吗，有权限的用户可以访问相关内容</p><template #footer><ElButton @click="publicConfirmOpen = false">取消</ElButton><ElButton type="primary" @click="runImport">确认</ElButton></template></ElDialog>

<ElDialog :model-value="true" :title="editing ? '编辑任务' : '导入文件'" class="dingtalk-import-dialog" width="min(740px,95vw)" align-center :close-on-click-modal="false" @close="emit('close')">
  <div class="import-body" data-testid="dingtalk-personal-import">
    <label class="field-label">导入至 <b>*</b></label>
    <KnowledgeDestinationSelect v-model="destination" :destinations="destinations" label="导入至" :disabled="importing" />
    <div v-if="!destinations.length" class="inline-warning"><AlertTriangle :size="15"/>{{ space === 'public' ? '暂无可管理的公共位置，请联系管理员申请权限。' : '暂无个人知识库，请先创建个人知识库。' }}</div>

    <label class="field-label">同步频率 <b>*</b></label>
    <div class="sync-row" :class="{ expanded: frequency === '每周' || frequency === '每月' }">
      <select v-model="frequency" aria-label="同步频率"><option value="不自动同步">不自动同步</option><option value="每天">每天</option><option value="每周">每周</option><option value="每月">每月</option></select>
      <select v-if="frequency === '每周'" v-model="weekDay" aria-label="同步周期"><option v-for="day in weekDays" :key="day">{{ day }}</option></select>
      <select v-if="frequency === '每月'" v-model="monthDay" aria-label="同步日期"><option v-for="day in monthDays" :key="day">{{ day }}</option></select>
      <input v-if="frequency !== '不自动同步'" v-model="schedule" type="time" aria-label="同步执行时间"/>
    </div>

    <button type="button" class="choose-area" data-testid="choose-dingtalk-documents" :class="{ disabled: !ready }" :disabled="!ready || importing" @click="openPicker"><span class="upload-icon"><Upload :size="21"/></span><strong>选择钉钉文档</strong><small>仅展示当前登录用户可查看并下载的文档</small></button>

    <section class="selected-panel" aria-label="已选钉钉文档">
      <div v-if="selectedDocuments.length" class="selected-grid"><article v-for="document in selectedDocuments" :key="document.id" :class="{ unsupported: !document.exportable }"><FileText :size="18"/><div><strong>{{ document.name }}</strong><small>{{ document.format }} · {{ document.updatedAt }}</small><em v-if="!document.exportable">暂不支持：{{ document.exportReason }}</em></div><button type="button" :aria-label="`移除${document.name}`" @click="removeDocument(document.id)"><X :size="14"/></button></article></div>
      <div v-else class="empty-selected"><FileSearch :size="46"/><strong>暂无钉钉文件</strong><span>请在上方选择钉钉文档</span></div>
    </section>
    <p v-if="skippedGroupCount" class="inline-warning" data-testid="dingtalk-group-skipped"><AlertTriangle :size="15"/>群授权暂未导入（{{ skippedGroupCount }} 项）。</p>
    <p v-if="unsupportedCount" class="inline-warning"><AlertTriangle :size="15"/>有 {{ unsupportedCount }} 个文件格式暂不支持，请移除后导入。</p>
    <p v-if="duplicateIds.length" class="inline-warning"><AlertTriangle :size="15"/>当前知识库已存在同份文档，请移除重复项。</p>
    <p v-if="error" class="inline-warning"><AlertTriangle :size="15"/>{{ error }}</p>
  </div>
  <template #footer><ElButton @click="emit('close')">取消</ElButton><ElButton data-testid="submit-import" type="primary" :disabled="!canImport" :loading="importing" @click="submit">{{ editing ? '保存' : '确定' }}</ElButton></template>
</ElDialog>

<ElDialog v-model="pickerOpen" title="选择钉钉文档" class="dingtalk-picker-dialog" width="min(520px,92vw)" align-center append-to-body>
  <div class="picker">
    <nav v-if="pickerSection !== 'root'" class="picker-path" aria-label="钉钉文档来源路径"><button type="button" aria-label="返回钉钉文档来源" @click="returnToSources">钉钉文档</button><ChevronRight :size="14"/><strong>{{ pickerSection === 'mine' ? '我的文档' : '知识库' }}</strong></nav>
    <div v-if="pickerSection === 'root'" class="picker-sources" aria-label="钉钉文档来源"><button type="button" aria-label="进入知识库" @click="enterSection('knowledge')"><FolderOpen :size="21"/><span>知识库</span><ChevronRight :size="16"/></button><button type="button" aria-label="进入我的文档" @click="enterSection('mine')"><FolderOpen :size="21"/><span>我的文档</span><ChevronRight :size="16"/></button></div>
    <template v-else>
      <div class="picker-toolbar"><label class="select-all"><input type="checkbox" :checked="allSectionSelected" @change="toggleAllSection"/>全选</label><label class="picker-search"><Search :size="15"/><input v-model="keyword" placeholder="搜索文件或文件夹名称..." aria-label="搜索钉钉文档"/></label></div>
      <div class="picker-tree" role="tree" aria-label="钉钉文档目录" aria-multiselectable="true"><div v-for="row in pickerRows" :key="row.node.id" class="picker-tree-row" :class="{ selected: selectionState(row.node) === 'all' }" role="treeitem" :aria-level="row.depth + 1" :aria-expanded="row.node.document ? undefined : row.expanded" :aria-checked="selectionState(row.node) === 'some' ? 'mixed' : selectionState(row.node) === 'all'" :style="{ paddingLeft: (12 + row.depth * 22) + 'px' }" tabindex="0" @keydown="rowKeydown($event, row)"><button v-if="!row.node.document" type="button" class="tree-expand" :aria-label="(row.expanded ? '收起' : '展开') + row.node.name" @click="toggleFolder(row.node)"><ChevronRight :size="15" :class="{ expanded: row.expanded }"/></button><span v-else class="tree-spacer"/><label class="tree-choice"><input type="checkbox" :aria-label="'选择' + row.node.name" :checked="selectionState(row.node) === 'all'" @change="toggleNode(row.node, $event)"/><FileText v-if="row.node.document" :size="17"/><FolderOpen v-else :size="18"/><span class="tree-name">{{ row.node.name }}</span></label></div><p v-if="!pickerRows.length" class="tree-empty">{{ keyword.trim() ? '没有匹配的文档' : '暂无可导入文档' }}</p></div>
    </template>
    <p v-if="pickerError" class="picker-warning" role="alert">{{ pickerError }}</p>
  </div>
  <template #footer><ElButton @click="pickerOpen = false">取消</ElButton><ElButton data-testid="confirm-document-picker" type="primary" :disabled="!pickerSelectedIds.length || pickerSelectedIds.length > MAX_IMPORT_DOCUMENTS" @click="confirmPicker">确定</ElButton></template>
</ElDialog>
</template>

<style scoped>
.import-body{display:grid;gap:12px;color:#28313d}.field-label{margin-top:2px;font-size:13px}.field-label b{color:#e54d42}.sync-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}.sync-row.expanded{grid-template-columns:1fr 1fr 1fr}.sync-row select,.sync-row input{height:34px;border:1px solid #dcdfe6;border-radius:7px;background:#fff;padding:0 12px;color:#303846;font:13px inherit}.choose-area{display:flex;min-height:146px;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:1px dashed #1677ff;border-radius:12px;background:#fbfcff;color:#657181;cursor:pointer}.choose-area .upload-icon{display:grid;width:44px;height:44px;place-items:center;border-radius:50%;background:#f6f7f9;color:#111}.choose-area strong{color:#1677ff;font-size:13px}.choose-area small{color:#999;font-size:11px}.choose-area.disabled{opacity:.55;cursor:not-allowed}.selected-panel{min-height:230px;border:1px solid #e4e8ed;border-radius:12px;padding:14px}.selected-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.selected-grid article{display:grid;grid-template-columns:22px minmax(0,1fr) 24px;gap:8px;border:1px solid #e9ecf0;border-radius:9px;padding:10px}.selected-grid article>svg{color:#4182cf}.selected-grid strong,.selected-grid small,.selected-grid em{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.selected-grid strong{font-size:12px}.selected-grid small{margin-top:3px;color:#949ca8;font-size:10px}.selected-grid em{margin-top:4px;color:#c26148;font-size:10px;font-style:normal}.selected-grid article>button{display:grid;width:22px;height:22px;place-items:center;border:0;background:transparent;color:#9199a4}.empty-selected{display:flex;min-height:200px;flex-direction:column;align-items:center;justify-content:center;gap:7px;color:#999}.empty-selected svg{color:#333}.empty-selected strong{color:#333;font-size:12px}.empty-selected span{font-size:11px}.inline-warning{display:flex;align-items:flex-start;gap:7px;margin:0;border-radius:8px;background:#fff7ed;padding:9px 11px;color:#a86622;font-size:11px}.picker-path{display:flex;align-items:center;gap:6px;margin-bottom:12px;color:#657181;font-size:12px}.picker-path button{border:0;background:transparent;padding:0;color:#506b8c}.picker-sources{display:grid;align-content:start;gap:10px;min-height:390px}.picker-sources button{display:flex;min-height:64px;align-items:center;gap:12px;border:1px solid #e5e8ec;border-radius:10px;background:#fff;padding:12px 16px;text-align:left;font-size:14px}.picker-sources button span{flex:1}.picker-sources svg:first-child{color:#2787e8}.picker-toolbar{display:flex;align-items:center;gap:16px}.select-all{display:flex;align-items:center;gap:8px;font-size:13px;white-space:nowrap}.select-all input,.tree-choice input{width:16px;height:16px;accent-color:#111}.picker-search{display:flex;height:36px;flex:1;align-items:center;gap:7px;border:1px solid #dce1e7;border-radius:8px;padding:0 10px;color:#929aa5}.picker-search input{min-width:0;flex:1;border:0;outline:0;font:13px inherit}.picker-tree{min-height:350px;max-height:390px;overflow:auto;margin-top:12px;border-top:1px solid #eee;padding:7px 0}.picker-tree-row{display:flex;min-height:48px;align-items:center;gap:8px;border-radius:7px;padding:7px 12px;color:#374151}.picker-tree-row:hover,.picker-tree-row.selected{background:#f5f6f8}.tree-expand{display:grid;width:20px;height:26px;place-items:center;border:0;background:transparent;color:#89939e}.tree-expand svg.expanded{transform:rotate(90deg)}.tree-spacer{width:20px}.tree-choice{display:flex;min-width:0;flex:1;align-items:center;gap:10px}.tree-choice>svg{color:#2787e8}.tree-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.tree-empty{padding:80px 12px;text-align:center;color:#999;font-size:12px}.picker-warning{color:#bf4b3e;font-size:12px}@media(max-width:640px){.selected-grid,.sync-row,.sync-row.expanded{grid-template-columns:1fr}}
:global(.dingtalk-import-dialog),:global(.dingtalk-picker-dialog){border-radius:18px}:global(.dingtalk-import-dialog .el-dialog__title),:global(.dingtalk-picker-dialog .el-dialog__title){font-size:18px;font-weight:500}:global(.dingtalk-import-dialog .el-dialog__footer),:global(.dingtalk-picker-dialog .el-dialog__footer){border-top:1px solid #eee;padding-top:16px}
</style>
