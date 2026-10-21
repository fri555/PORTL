<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { AlertTriangle, ChevronRight, FileText, FolderOpen, Search, X } from 'lucide-vue-next'
import { ElButton, ElDialog, ElInput, ElOption, ElSelect } from 'element-plus'
import KnowledgeDestinationSelect from './KnowledgeDestinationSelect.vue'
import type { KnowledgeDestination, KnowledgeSpace } from '@/types/knowledge-source'
import { canImportDingTalkSource, initializeDingTalkPermissions } from '@/utils/dingtalkPermissionInitialization'
import { documents as documentHierarchy, getPrototypeScenario, personalDingTalkDocuments, type BoundDingTalkIdentity, type ImportableDocument } from './dingtalkPrototype'

type Frequency='不自动同步'|'每天'|'每周'
type ImportAttempt={destinationId:string;documents:ImportableDocument[];platformUserId:string;frequency:Frequency;schedule:string}
const props=withDefaults(defineProps<{identity:BoundDingTalkIdentity;destinations:KnowledgeDestination[];space?:KnowledgeSpace;applicationAvailable?:boolean;defaultDestinationId?:string;existingSourceIds?:Record<string,string[]>}>(),{applicationAvailable:true,defaultDestinationId:'',space:'public'})
const emit=defineEmits<{close:[];authorize:[];complete:[record:ImportAttempt];failed:[record:ImportAttempt]}>()
const scenario=getPrototypeScenario(), destination=ref(props.defaultDestinationId), keyword=ref(''), selectedIds=ref<string[]>([]), pickerOpen=ref(false), importing=ref(false), error=ref('')
const frequency=ref<Frequency>('每天'), weekDay=ref('周一'), schedule=ref('00:00')
const weekDays=['周一','周二','周三','周四','周五','周六','周日']
const publicConfirmOpen = ref(false)
const documents=computed(()=>props.applicationAvailable?personalDingTalkDocuments(props.identity,scenario).filter(document => canImportDingTalkSource(document.sourceRole)):[])
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
    const sources = source.id === 'products'
      ? [...(source.children ?? []), { id: 'native-table', type: 'doc' }]
      : source.children ?? []
    const children = sources.map(build).filter((node): node is PickerNode => node !== null)
    return children.length ? { id: source.id, name: source.label ?? source.id, children } : null
  }
  return documentHierarchy.map(build).filter((node): node is PickerNode => node !== null)
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
function documentIds(node: PickerNode): string[] {
  return node.document ? [node.id] : node.children.flatMap(documentIds)
}
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
function toggleNode(node: PickerNode) {
  const ids = documentIds(completeNode(node))
  pickerSelectedIds.value = selectionState(node) === 'all'
    ? pickerSelectedIds.value.filter(id => !ids.includes(id))
    : [...new Set([...pickerSelectedIds.value, ...ids])]
}
function toggleFolder(node: PickerNode) {
  expandedIds.value = expandedIds.value.includes(node.id)
    ? expandedIds.value.filter(id => id !== node.id) : [...expandedIds.value, node.id]
}
function openPicker() {
  pickerSelectedIds.value = [...selectedIds.value]
  pickerOpen.value = true
}
function confirmPicker() {
  selectedIds.value = [...pickerSelectedIds.value]
  pickerOpen.value = false
  error.value = ''
}
function rowKeydown(event: KeyboardEvent, row: PickerRow) {
  if (event.target !== event.currentTarget) return
  if (event.key === ' ') { event.preventDefault(); toggleNode(row.node) }
  if (!row.node.document && !keyword.value.trim() && ((event.key === 'ArrowRight' && !row.expanded) || (event.key === 'ArrowLeft' && row.expanded))) {
    event.preventDefault(); toggleFolder(row.node)
  }
}
const selectedDocuments=computed(()=>selectedIds.value.map(id=>documents.value.find(item=>item.id===id)).filter(Boolean) as ImportableDocument[])
const publicDestination=computed(()=>(props.destinations.find(item=>item.id===destination.value)?.space ?? props.space) === 'public')
const unsupportedCount=computed(()=>selectedDocuments.value.filter(item=>!item.exportable).length)
const skippedGroupCount=computed(()=>publicDestination.value ? selectedDocuments.value.reduce((count, document) => count + (document.initialPermissions?.grants.filter(grant => grant.kind === 'group').length ?? 0), 0) : 0)
const duplicateIds = computed(() => selectedDocuments.value.filter(item => props.existingSourceIds?.[destination.value]?.includes(item.id)).map(item => item.id))
const ready=computed(()=>props.applicationAvailable&&props.identity.status==='bound')
const validSchedule=computed(()=>frequency.value==='不自动同步'||/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.value))
const canImport=computed(()=>ready.value&&props.destinations.some(item=>item.id===destination.value)&&selectedDocuments.value.length>0&&!unsupportedCount.value&&!duplicateIds.value.length&&validSchedule.value&&!importing.value)
watch(()=>props.defaultDestinationId, id=>{if(id&&props.destinations.some(item=>item.id===id))destination.value=id})
watch(()=>props.destinations,()=>{if(!props.destinations.some(item=>item.id===destination.value))destination.value=''},{deep:true})
function removeDocument(id:string){selectedIds.value=selectedIds.value.filter(item=>item!==id)}
let importTimer: number | undefined
watch(() => [props.identity.platformUserId, props.identity.dingUserId, props.identity.status], () => {
  if (importTimer) window.clearTimeout(importTimer)
  importing.value = false
  selectedIds.value = []
  pickerSelectedIds.value = []
  pickerOpen.value = false
})
onBeforeUnmount(() => { if (importTimer) window.clearTimeout(importTimer) })
function submit() {
  if (!canImport.value) return
  if (props.destinations.find(item => item.id === destination.value)?.space === 'public') {
    publicConfirmOpen.value = true
    return
  }
  runImport()
}
function runImport() {
  publicConfirmOpen.value = false
  if (!canImport.value) return
  const selected = [...selectedDocuments.value]
  const platformUserId = props.identity.platformUserId
  const destinationId = destination.value
  const selectedFrequency = frequency.value
  const selectedSchedule = selectedFrequency === '不自动同步' ? '—' : selectedFrequency === '每周' ? `${weekDay.value} ${schedule.value}` : schedule.value
  importing.value = true
  importTimer = window.setTimeout(() => {
    importing.value = false
    if (!ready.value || props.identity.platformUserId !== platformUserId
      || !props.destinations.some(item => item.id === destinationId)
      || selected.some(item => props.existingSourceIds?.[destinationId]?.includes(item.id))
      || selected.some(item => !personalDingTalkDocuments(props.identity, scenario).some(current => current.id === item.id && current.exportable && canImportDingTalkSource(current.sourceRole)))) {
      error.value = '权限或连接已变更，本次未导入，请重新选择。'
      return
    }
    const failures: string[] = []
    if (props.destinations.find(item => item.id === destinationId)?.space === 'public') {
      selected.forEach(document => {
        try { initializeDingTalkPermissions(props.identity.displayName, document.initialPermissions) }
        catch (cause) { failures.push(cause instanceof Error ? cause.message : '权限成员未完整获取，本次未导入，请重试。') }
      })
    }
    if (failures.length === selected.length) {
      error.value = failures[0]!
      emit('failed', { destinationId, documents: selected, platformUserId, frequency: selectedFrequency, schedule: selectedSchedule })
      return
    }
    emit('complete', { destinationId, documents: selected, platformUserId, frequency: selectedFrequency, schedule: selectedSchedule })
    emit('close')
  }, 500)
}
</script>

<template>
<ElDialog v-model="publicConfirmOpen" title="确认导入" width="420px" align-center append-to-body>
  <p>确认同步文档到公共空间中吗，有权限的用户可以访问相关内容</p>
  <template #footer><ElButton @click="publicConfirmOpen = false">取消</ElButton><ElButton type="primary" @click="runImport">确认</ElButton></template>
</ElDialog>
<ElDialog :model-value="true" title="导入文件" width="min(760px,95vw)" align-center :close-on-click-modal="false" @close="emit('close')">
  <div class="import-body" data-testid="dingtalk-personal-import">
    <label class="field-label">上传至 <b>*</b></label>
    <KnowledgeDestinationSelect v-model="destination" :destinations="destinations" label="上传至" :disabled="importing" />
    <div v-if="!destinations.length" class="inline-warning"><AlertTriangle :size="15"/>{{ space === 'public' ? '暂无可管理的公共位置，请联系管理员申请权限。' : '暂无个人知识库，请先创建个人知识库。' }}</div>

    <section class="choose-area" :class="{disabled:!ready}">
      <FolderOpen :size="34"/><strong>{{selectedDocuments.length?`已选择 ${selectedDocuments.length} 篇钉钉文档`:'选择钉钉文档'}}</strong>
      <span>{{ready?'仅展示当前登录用户可查看并下载的文档':'当前钉钉身份暂不可用'}}</span>
      <ElButton :disabled="!ready||importing" @click="openPicker">选择文件</ElButton>
    </section>

    <section class="selected-panel" aria-label="已选钉钉文档">
      <header><strong>已选文件</strong><span>{{selectedDocuments.length}} 篇</span></header>
      <div v-if="selectedDocuments.length" class="selected-grid">
        <article v-for="document in selectedDocuments" :key="document.id" :class="{unsupported:!document.exportable}"><FileText :size="18"/><div><strong>{{document.name}}</strong><small>{{document.format}} · {{document.updatedAt}}</small><em v-if="!document.exportable">暂不支持：{{document.exportReason}}</em></div><button type="button" :aria-label="`移除${document.name}`" @click="removeDocument(document.id)"><X :size="14"/></button></article>
      </div>
      <div v-else class="empty-selected">选择后的文档会显示在这里</div>
    </section>

    <div class="sync-row" :class="{weekly:frequency==='每周'}"><label><span>同步频率</span><ElSelect v-model="frequency" aria-label="同步频率"><ElOption label="不自动同步" value="不自动同步"/><ElOption label="每天" value="每天"/><ElOption label="每周" value="每周"/></ElSelect></label><label v-if="frequency==='每周'"><span>周期</span><ElSelect v-model="weekDay" aria-label="同步周期"><ElOption v-for="day in weekDays" :key="day" :label="day" :value="day"/></ElSelect></label><label v-if="frequency!=='不自动同步'"><span>执行时间</span><ElInput v-model="schedule" type="time" aria-label="同步执行时间"/></label></div>
    <p v-if="publicDestination" class="sync-policy" data-testid="dingtalk-sync-policy">导入人为创建者，默认可管理。首次初始化人员和部门权限，部门最高可查看；后续在天马智擎维护权限。</p>
    <p v-else class="sync-policy">导入文档保留在个人空间，仅当前用户可访问。</p>
    <p v-if="skippedGroupCount" class="inline-warning" data-testid="dingtalk-group-skipped"><AlertTriangle :size="15"/>群授权暂未导入（{{ skippedGroupCount }} 项）。</p>
    <p v-if="unsupportedCount" class="inline-warning"><AlertTriangle :size="15"/>有 {{unsupportedCount}} 个文件格式暂不支持，请移除后导入。</p>
    <p v-if="duplicateIds.length" class="inline-warning"><AlertTriangle :size="15"/>当前知识库已存在同份文档：{{ selectedDocuments.filter(item => duplicateIds.includes(item.id)).map(item => item.name).join('；') }}，请移除重复项。</p>
    <p v-if="error" class="inline-warning"><AlertTriangle :size="15"/>{{error}}</p>
  </div>
  <template #footer><ElButton @click="emit('close')">取消</ElButton><ElButton type="primary" :disabled="!canImport" :loading="importing" @click="submit">确认导入</ElButton></template>
</ElDialog>

<ElDialog v-model="pickerOpen" title="选择钉钉文档" width="min(680px,92vw)" align-center append-to-body>
  <div class="picker">
    <div class="picker-path">根目录 / 知识库</div>
    <div class="picker-search"><Search :size="15"/><input v-model="keyword" placeholder="搜索有权限的文档" aria-label="搜索钉钉文档"/></div>
    <div class="picker-tree" role="tree" aria-label="钉钉文档目录" aria-multiselectable="true">
      <div v-for="row in pickerRows" :key="row.node.id" class="picker-tree-row" :class="{ selected: selectionState(row.node) === 'all' }" role="treeitem" :aria-level="row.depth + 1" :aria-expanded="row.node.document ? undefined : row.expanded" :aria-checked="selectionState(row.node) === 'some' ? 'mixed' : selectionState(row.node) === 'all'" :style="{ paddingLeft: (12 + row.depth * 24) + 'px' }" tabindex="0" @keydown="rowKeydown($event, row)">
        <button v-if="!row.node.document" type="button" class="tree-expand" :aria-label="(row.expanded ? '收起' : '展开') + row.node.name" @click="toggleFolder(row.node)"><ChevronRight :size="15" :class="{ expanded: row.expanded }"/></button>
        <span v-else class="tree-spacer"/>
        <label class="tree-choice">
          <input type="checkbox" :aria-label="'选择' + row.node.name" :checked="selectionState(row.node) === 'all'" :indeterminate="selectionState(row.node) === 'some'" @change="toggleNode(row.node)"/>
          <FileText v-if="row.node.document" :size="17"/><FolderOpen v-else :size="18"/>
          <span class="tree-name">{{ row.node.name }}<small v-if="row.node.document">{{ row.node.document.format }}</small></span>
        </label>
        <em v-if="row.node.document && !row.node.document.exportable" class="tree-unsupported">格式暂不支持</em>
      </div>
      <p v-if="!pickerRows.length" class="tree-empty">没有匹配的文档</p>
    </div>
  </div>
  <template #footer><ElButton data-testid="cancel-document-picker" @click="pickerOpen=false">取消</ElButton><ElButton type="primary" :disabled="!pickerSelectedIds.length" @click="confirmPicker">确认导入 {{ pickerSelectedIds.length }} 项</ElButton></template>
</ElDialog>
</template>

<style scoped>
.sync-policy{margin:0;color:#8b929c;font-size:12px;line-height:1.7}
.import-body{display:grid;gap:14px;color:#28313d}.field-label{font-size:13px}.field-label b{color:#e54d42}.choose-area{display:flex;min-height:134px;flex-direction:column;align-items:center;justify-content:center;gap:7px;border:1px dashed #d8dde5;border-radius:12px;background:#fbfcfd;color:#657181}.choose-area svg{color:#6f87a5}.choose-area strong{color:#303a47;font-size:14px}.choose-area span{font-size:11px}.choose-area :deep(.el-button){margin-top:4px}.choose-area.disabled{opacity:.55}.selected-panel{min-height:150px;border:1px solid #e4e8ed;border-radius:12px;padding:13px}.selected-panel>header{display:flex;justify-content:space-between;margin-bottom:10px;font-size:12px}.selected-panel>header span{color:#9099a5}.selected-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.selected-grid article{display:grid;grid-template-columns:22px minmax(0,1fr) 24px;gap:8px;align-items:start;border:1px solid #e9ecf0;border-radius:9px;padding:10px;background:#fff}.selected-grid article>svg{color:#4182cf}.selected-grid strong,.selected-grid small,.selected-grid em{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.selected-grid strong{font-size:12px}.selected-grid small{margin-top:3px;color:#949ca8;font-size:10px}.selected-grid em{margin-top:4px;color:#c26148;font-size:10px;font-style:normal}.selected-grid article.unsupported{border-color:#f0cfc7;background:#fff9f7}.selected-grid button{display:grid;width:22px;height:22px;place-items:center;border:0;border-radius:5px;background:transparent;color:#9199a4;cursor:pointer}.empty-selected{display:grid;min-height:100px;place-items:center;color:#a0a6ae;font-size:12px}.sync-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.sync-row.weekly{grid-template-columns:1fr 1fr 1fr}.sync-row label{display:grid;gap:6px;font-size:12px}.inline-warning{display:flex;align-items:flex-start;gap:7px;margin:0;border-radius:8px;background:#fff7ed;padding:9px 11px;color:#a86622;font-size:11px}.picker-path{margin-bottom:12px;color:#657181;font-size:12px}.picker-search{display:flex;height:36px;align-items:center;gap:7px;border:1px solid #dce1e7;border-radius:8px;padding:0 10px;color:#929aa5}.picker-search input{min-width:0;flex:1;border:0;outline:0;font:13px inherit}.picker-tree{min-height:350px;max-height:390px;overflow:auto;margin-top:12px;border:1px solid #e5e8ec;border-radius:10px;padding:7px 0}.picker-tree-row{display:flex;min-height:48px;align-items:center;gap:10px;padding:7px 14px 7px 12px;border-radius:5px;color:#374151}.picker-tree-row:hover,.picker-tree-row:focus-within{background:#f0f7fa}.picker-tree-row.selected{background:#f3f8fc}.tree-expand{display:grid;flex:none;width:20px;height:26px;place-items:center;border:0;background:transparent;color:#89939e;cursor:pointer}.tree-expand svg{transition:transform .15s}.tree-expand svg.expanded{transform:rotate(90deg)}.tree-spacer{flex:none;width:20px}.tree-choice{display:flex;min-width:0;flex:1;align-items:center;gap:10px;cursor:pointer}.tree-choice input{flex:none;width:16px;height:16px;margin:0;accent-color:#20252c;cursor:pointer}.tree-choice>svg{flex:none;color:#778391}.tree-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.tree-name small{margin-left:10px;color:#9aa2ae;font-size:10px}.tree-unsupported{flex:none;color:#bc654f;font-size:10px;font-style:normal}.tree-empty{padding:80px 12px;text-align:center;color:#999;font-size:12px}@media(max-width:640px){.selected-grid,.sync-row,.sync-row.weekly{grid-template-columns:1fr}}
</style>
