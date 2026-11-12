<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getActivePinia } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useRoute } from 'vue-router'
import { Bot, Cable, FileText, FolderPlus, History, PanelLeftOpen, Plus, Search, Upload, X } from 'lucide-vue-next'
import KnowledgeDialogs from '@/components/knowledge/source-clone/KnowledgeDialogs.vue'
import KnowledgeQaPanel from '@/components/knowledge/source-clone/KnowledgeQaPanel.vue'
import KnowledgeSidebar from '@/components/knowledge/source-clone/KnowledgeSidebar.vue'
import KnowledgeTable from '@/components/knowledge/source-clone/KnowledgeTable.vue'
import KnowledgeDownloadAction from '@/components/knowledge/source-clone/KnowledgeDownloadAction.vue'
import KnowledgeAccessPanel from '@/components/knowledge/source-clone/KnowledgeAccessPanel.vue'
import DingTalkDocumentImport from '@/components/knowledge/source-clone/DingTalkDocumentImport.vue'
import MoveFilesDialog from '@/components/knowledge/source-clone/MoveFilesDialog.vue'
import BatchMoveResultDialog from '@/components/knowledge/source-clone/BatchMoveResultDialog.vue'
import { boundDingTalkIdentity, getPrototypeScenario, personalDingTalkDocuments, prototypeCanWriteKnowledge, type ImportableDocument } from '@/components/knowledge/source-clone/dingtalkPrototype'
import { dingTalkImportTaskFixtures, scopedDingTalkImportTasks } from '@/mock/dingtalk-import-tasks'
import { expertAgents } from '@/utils/expertPrototypeStore'
import { describeDingTalkSyncTask } from '@/services/dingtalkBackgroundSync'
import { sourceKnowledgeBases } from '@/mock/knowledge-source'
import type {
  DingTalkImportTask,
  DingTalkDocumentMapping,
  DingTalkSyncFrequency,
  KnowledgeDestination,
  KnowledgeDialogKind,
  KnowledgeSpace,
  SourceKnowledgeBase,
  SourceKnowledgeNavigation,
  SourceKnowledgeNode,
  KnowledgePermissionSnapshot,
} from '@/types/knowledge-source'
import { canConfigureKnowledge, canDeleteKnowledge, canRetrieveKnowledge, knowledgeRoleForPerson, type KnowledgeRole } from '@/types/knowledge-permission'
import { canImportDingTalkSource, initializeDingTalkPermissions } from '@/utils/dingtalkPermissionInitialization'
import { applyKnowledgeOwnershipTransfer } from '@/utils/knowledgeOwnership'
import type { KnowledgeOwnershipTransfer } from '@/types/knowledge-source'
import { toast } from 'vue-sonner'
import { useModuleSidebar } from '@/composables/useModuleSidebar'
import { useKnowledgeMove, type MoveRequest, type MoveResult } from '@/composables/useKnowledgeMove'

const knowledgeItemsStoreKey = 'tianma.prototype.knowledge-items.v2'
function loadKnowledgeItems(): SourceKnowledgeBase[] {
  if (import.meta.env.MODE !== 'test') {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(knowledgeItemsStoreKey) ?? 'null')
      if (Array.isArray(saved) && saved.every(item => item && typeof item.id === 'string' && Array.isArray(item.nodes))) {
        return saved as SourceKnowledgeBase[]
      }
    } catch { /* A disabled or invalid local cache leaves the prototype fixtures available. */ }
  }
  return structuredClone(sourceKnowledgeBases)
}
const items = ref<SourceKnowledgeBase[]>(loadKnowledgeItems())
watch(items, knowledgeBases => {
  if (import.meta.env.MODE === 'test') return
  try { localStorage.setItem(knowledgeItemsStoreKey, JSON.stringify(knowledgeBases)) } catch { /* Prototype state remains usable for this visit. */ }
}, { deep: true })
const route = useRoute()
const roleValues: KnowledgeRole[] = ['OWNER', 'MANAGER', 'EDITOR', 'DOWNLOADER', 'READER']
const prototypeRole = computed<KnowledgeRole>(() => roleValues.includes(route?.query.permissionRole as KnowledgeRole) ? route.query.permissionRole as KnowledgeRole : appStore?.user?.role === 'admin' ? 'OWNER' : 'DOWNLOADER')
const systemKnowledgeAdmin = computed(() => !route?.query.permissionRole && appStore?.user?.role === 'admin')
const appStore = getActivePinia() ? useAppStore() : null

// ─── PRD M4：移动文件与批量操作 ───
const move = useKnowledgeMove({ items, roleOf: effectiveResourceRole })
const { selectedIds, moveTargets, forbiddenIds, selectedTargets } = move
const moveDialogOpen = ref(false)
const batchDeleteConfirmOpen = ref(false)
const resultOpen = ref(false)
const resultTitle = ref('移动结果')
const resultTargetName = ref('')
const resultKind = ref<'move' | 'delete'>('move')
const batchResults = ref<MoveResult[]>([])
const lastMoveRequest = ref<MoveRequest | null>(null)

function toggleSelect(id: string) {
  move.toggleSelect(id)
}
function toggleAll(ids: string[], checked: boolean) {
  move.setSelection(ids, checked)
}
function clearSelection() {
  move.clearSelection()
}
function openMoveDialog() {
  if (!selectedIds.value.size) return
  closeCreateMenu()
  dialog.value = null
  dialogTarget.value = null
  moveDialogOpen.value = true
}
function confirmMove(request: MoveRequest) {
  lastMoveRequest.value = request
  batchResults.value = move.executeMove(request)
  resultKind.value = 'move'
  resultTitle.value = '移动结果'
  resultTargetName.value = moveTargets.value.find((item) => item.id === request.targetId)?.path ?? ''
  moveDialogOpen.value = false
  resultOpen.value = true
  pruneViewState()
}
function openBatchDelete() {
  if (!selectedIds.value.size) return
  closeCreateMenu()
  dialog.value = null
  dialogTarget.value = null
  batchDeleteConfirmOpen.value = true
}
function confirmBatchDelete() {
  batchResults.value = move.executeDelete()
  resultKind.value = 'delete'
  resultTitle.value = '删除结果'
  resultTargetName.value = ''
  batchDeleteConfirmOpen.value = false
  resultOpen.value = true
  pruneViewState()
}
function retryResult(id: string) {
  const fresh = resultKind.value === 'move' && lastMoveRequest.value
    ? move.executeMove(lastMoveRequest.value, [id])
    : move.executeDelete([id])
  const replacement = fresh[0]
  if (replacement) batchResults.value = batchResults.value.map((item) => item.id === id ? replacement : item)
  pruneViewState()
}
function closeResult() {
  resultOpen.value = false
  if (resultKind.value === 'delete') move.clearSelection()
  else move.replaceSelection(batchResults.value.filter((item) => item.status !== 'success').map((item) => item.id))
}
/** 移动/删除后清理已失效的选中知识库、面包屑与预览引用 */
function pruneViewState() {
  if (selected.value && !items.value.some((item) => item.id === selected.value?.id)) {
    goRoot()
    return
  }
  if (previewNode.value && !nodeStillExists(previewNode.value.id)) previewNode.value = null
  if (nodePath.value.length && !nodeStillExists(nodePath.value.at(-1)!.id)) nodePath.value = []
}
function nodeStillExists(id: string) {
  return items.value.some((kb) => Boolean(findNodePath(kb.nodes ?? [], id)))
}

const localDepartmentMembers = computed<Record<string, readonly string[]>>(() => {
  const user = appStore?.user
  return user?.department ? { [user.department]: [user.displayName] } : {}
})
const scenario = getPrototypeScenario()
const createMenuOpen = ref(route?.query.menu === 'open')
const createMenuRoot = ref<HTMLElement | null>(null)
const createMenuButton = ref<HTMLButtonElement | null>(null)
const uploadMenuOpen = ref(false)
const uploadMenuRoot = ref<HTMLElement | null>(null)
const uploadMenuButton = ref<HTMLButtonElement | null>(null)
function closeCreateMenu(restoreFocus = false) {
  createMenuOpen.value = false
  if (restoreFocus) nextTick(() => createMenuButton.value?.focus())
}
function closeUploadMenu(restoreFocus = false) {
  uploadMenuOpen.value = false
  if (restoreFocus) nextTick(() => uploadMenuButton.value?.focus())
}
function closeMenuOutside(event: MouseEvent) {
  if (event.target instanceof Node && !createMenuRoot.value?.contains(event.target)) closeCreateMenu()
  if (event.target instanceof Node && !uploadMenuRoot.value?.contains(event.target)) closeUploadMenu()
}
function createMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeCreateMenu(true); return }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  createMenuOpen.value = true
  nextTick(() => {
    const buttons = Array.from(createMenuRoot.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])
    const index = buttons.findIndex(button => button === document.activeElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowDown' ? (index + 1) % buttons.length : index <= 0 ? buttons.length - 1 : index - 1
    buttons[next]?.focus()
  })
}
function uploadMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeUploadMenu(true); return }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  uploadMenuOpen.value = true
  nextTick(() => {
    const buttons = Array.from(uploadMenuRoot.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])
    const index = buttons.findIndex(button => button === document.activeElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : event.key === 'ArrowDown' ? (index + 1) % buttons.length : index <= 0 ? buttons.length - 1 : index - 1
    buttons[next]?.focus()
  })
}
onMounted(() => document.addEventListener('click', closeMenuOutside))
onBeforeUnmount(() => document.removeEventListener('click', closeMenuOutside))
const personalImportOpen = ref(route?.query.import === 'dingtalk' || ['personal-import', 'personal-partial', 'identity-unbound', 'identity-expired', 'export-unavailable', 'no-write-target'].includes(scenario))
const editingImportTask = ref<DingTalkImportTask | null>(null)
const canImportDingTalk = computed(() => Boolean(appStore?.user))
const demoIdentityAuthorized = ref(false)
watch(() => appStore?.user?.id, () => { demoIdentityAuthorized.value = false })
const dingTalkIdentity = computed(() => boundDingTalkIdentity(appStore?.user, demoIdentityAuthorized.value ? 'normal' : scenario))
const importTaskStoreKey = 'tianma.prototype.knowledge-import-tasks.v2'
function loadImportTasks(): DingTalkImportTask[] {
  if (import.meta.env.MODE === 'test') return structuredClone(dingTalkImportTaskFixtures)
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(importTaskStoreKey) ?? 'null')
    if (Array.isArray(saved) && saved.every(task => task && typeof task.importTaskId === 'string' && Array.isArray(task.documentMappings))) {
      return saved as DingTalkImportTask[]
    }
  } catch { /* A disabled or invalid local cache leaves the prototype fixtures available. */ }
  return structuredClone(dingTalkImportTaskFixtures)
}
const importTasks = ref<DingTalkImportTask[]>(loadImportTasks())
watch(importTasks, tasks => {
  if (import.meta.env.MODE === 'test') return
  try { localStorage.setItem(importTaskStoreKey, JSON.stringify(tasks)) } catch { /* Prototype state remains usable for this visit. */ }
}, { deep: true })
const executionRecordStoreKey = 'tianma.prototype.knowledge-execution-records.v2'
function loadExecutionRecords(): DingTalkImportTask[] {
  const fixtures = structuredClone(dingTalkImportTaskFixtures.filter(task => task.recordId || task.executedAt))
  if (import.meta.env.MODE === 'test') return fixtures
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(executionRecordStoreKey) ?? 'null')
    if (Array.isArray(saved) && saved.every(record => record && typeof record.importTaskId === 'string' && Array.isArray(record.documentMappings))) {
      return saved as DingTalkImportTask[]
    }
  } catch { /* Fall back to the records bundled with the prototype. */ }
  try {
    const priorTasks: unknown = JSON.parse(localStorage.getItem(importTaskStoreKey) ?? 'null')
    if (Array.isArray(priorTasks)) return priorTasks.filter((task): task is DingTalkImportTask => Boolean(task?.recordId || task?.executedAt)).map(task => structuredClone(task))
  } catch { /* Fall back to fixture records. */ }
  return fixtures
}
const executionRecords = ref<DingTalkImportTask[]>(loadExecutionRecords())
watch(executionRecords, records => {
  if (import.meta.env.MODE === 'test') return
  try { localStorage.setItem(executionRecordStoreKey, JSON.stringify(records)) } catch { /* Prototype state remains usable for this visit. */ }
}, { deep: true })
function mappingHasLiveFile(mapping: DingTalkDocumentMapping): boolean {
  return items.value.some(base => findNodePath(base.nodes ?? [], mapping.localFileId)?.at(-1)?.sourceDocumentId === mapping.sourceDocumentId)
}
const agentReferenceOptions = computed(() => expertAgents.map(agent => ({
  id: agent.id, name: agent.name,
  documentIds: [...new Set([...(agent.capabilities?.selectedDocumentIds ?? []), ...(agent.capabilities?.knowledgeDocuments ?? []).map(document => document.id)])],
})))
const visibleImportTasks = computed(() => scopedDingTalkImportTasks(importTasks.value, appStore?.user?.id, appStore?.user?.role)
  .filter(task => task.taskKind !== 'agent-reference')
  .map(task => describeDingTalkSyncTask(task, agentReferenceOptions.value, mappingHasLiveFile)))
const visibleExecutionRecords = computed(() => scopedDingTalkImportTasks(executionRecords.value, appStore?.user?.id, appStore?.user?.role)
  .map(record => describeDingTalkSyncTask(record, agentReferenceOptions.value, mappingHasLiveFile)))
const writableDestinations = computed<KnowledgeDestination[]>(() => scenario === 'no-write-target' ? [] : items.value
  .filter(item => Boolean(appStore?.user) && (item.space === 'personal' ? prototypeCanWriteKnowledge(item.id, appStore?.user?.role) : Boolean(effectiveResourceRole(item) && canConfigureKnowledge(effectiveResourceRole(item)!))))
  .flatMap(item => [{ id: item.id, name: item.name, kind: 'kb' as const, path: item.name, space: item.space },
    ...(item.nodes ?? []).filter(node => node.kind === 'folder' && (item.space === 'personal' || Boolean(effectiveResourceRole(node) && canConfigureKnowledge(effectiveResourceRole(node)!)))).map(node => ({ id: node.id, name: node.name, kind: 'folder' as const, parentId: item.id, path: item.name + ' / ' + node.name, space: item.space }))]))
const importedSourceIds = computed<Record<string, string[]>>(() => {
  const byKnowledgeBase: Record<string, string[]> = {}
  for (const task of importTasks.value) {
    const destination = writableDestinations.value.find(item => item.id === task.destinationId)
    if (!destination) continue
    const root = destination.parentId ?? destination.id
    byKnowledgeBase[root] = [...new Set([...(byKnowledgeBase[root] ?? []), ...task.documentMappings.filter(item => item.localFileId && item.status === '成功').map(item => item.sourceDocumentId)])]
  }
  const collectImportedIds = (nodes: SourceKnowledgeNode[]): string[] => nodes.flatMap(node => [
    ...(node.sourceDocumentId ? [node.sourceDocumentId] : []),
    ...collectImportedIds(node.children ?? []),
  ])
  for (const item of items.value) {
    byKnowledgeBase[item.id] = [...new Set([...(byKnowledgeBase[item.id] ?? []), ...collectImportedIds(item.nodes ?? [])])]
  }
  return Object.fromEntries(writableDestinations.value.map(item => [item.id, byKnowledgeBase[item.parentId ?? item.id] ?? []]))
})
watch(canImportDingTalk, allowed => { if (!allowed) personalImportOpen.value = false })
const canManageKnowledgeAccess = computed(() => appStore?.user?.role === 'admin')
const activeSpace = ref<KnowledgeSpace>('public')
const { isMobile, sidebarOpen, closeMobileSidebar } = useModuleSidebar()
const sidebarSearchRequested = ref(0)
const accessOpen = ref(canManageKnowledgeAccess.value && route?.query.view === 'access')
const recordsOpen = ref(Boolean(appStore?.user) && route?.query.view === 'sync')
watch(canImportDingTalk, allowed => { if (!allowed) recordsOpen.value = false })
watch(canManageKnowledgeAccess, allowed => { if (!allowed) accessOpen.value = false })
const qaOpen = ref(false)
const selected = ref<SourceKnowledgeBase | null>(null)
const nodePath = ref<SourceKnowledgeNode[]>([])
const previewNode = ref<SourceKnowledgeNode | null>(null)
const dialog = ref<KnowledgeDialogKind>(null)
const dialogTarget = ref<SourceKnowledgeBase | SourceKnowledgeNode | null>(null)
const currentResourceRole = computed(() => {
  const resource = previewNode.value ?? nodePath.value.at(-1) ?? selected.value
  return resource ? effectiveResourceRole(resource) : activeSpace.value === 'personal' ? 'OWNER' : prototypeRole.value
})
const dialogActorRole = computed(() => dialogTarget.value ? effectiveResourceRole(dialogTarget.value) ?? 'READER' : currentResourceRole.value ?? 'READER')
const canRetrieveCurrentKnowledge = computed(() => canRetrieveKnowledge(currentResourceRole.value))
const query = ref('')
watch(() => appStore?.user?.id, (next, previous) => {
  if (next === previous) return
  items.value = loadKnowledgeItems()
  move.clearSelection()
  moveDialogOpen.value = false
  batchDeleteConfirmOpen.value = false
  resultOpen.value = false
  selected.value = null
  nodePath.value = []
  previewNode.value = null
  personalImportOpen.value = false
  recordsOpen.value = false
  closeCreateMenu()
  closeUploadMenu()
  dialog.value = null
  dialogTarget.value = null
  query.value = ''
  activeSpace.value = 'public'
})

const visibleItems = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  const scoped = items.value.filter((item) => item.space === activeSpace.value)
  return keyword ? scoped.filter((item) => item.name.toLowerCase().includes(keyword)) : scoped
})

const currentNodes = computed(() => {
  if (!selected.value) return []
  return nodePath.value.length
    ? nodePath.value[nodePath.value.length - 1].children ?? []
    : selected.value.nodes ?? []
})

const selectedTreeId = computed(() => nodePath.value.at(-1)?.id ?? selected.value?.id)
const uploadDestinations = writableDestinations
const currentDestinationId = computed(() => nodePath.value.at(-1)?.id ?? selected.value?.id ?? '')
const mayWriteCurrent = computed(() => selected.value
  ? Boolean(currentResourceRole.value && canConfigureKnowledge(currentResourceRole.value)) && writableDestinations.value.some(item => item.id === currentDestinationId.value)
  : writableDestinations.value.some(item => item.space === activeSpace.value))
const canCreateFolderHere = computed(() => nodePath.value.length === 0 && mayWriteCurrent.value)
const showToolbarUpload = computed(() => Boolean(selected.value))
const showToolbarCreate = computed(() => !selected.value || nodePath.value.length === 0)
function openDialog(
  kind: Exclude<KnowledgeDialogKind, null>,
  target: SourceKnowledgeBase | SourceKnowledgeNode | null = null,
) {
  closeMobileSidebar()
  closeCreateMenu()
  closeUploadMenu()
  dialogTarget.value = target
  dialog.value = kind
}

function closeDialog() {
  dialog.value = null
  dialogTarget.value = null
}

function openKnowledgeAccess() {
  if (!canManageKnowledgeAccess.value) return
  closeCreateMenu()
  closeUploadMenu()
  accessOpen.value = true
  recordsOpen.value = false
  qaOpen.value = false
  previewNode.value = null
  closeMobileSidebar()
}

function openSyncRecords() {
  if (!appStore?.user) return
  accessOpen.value = false
  recordsOpen.value = true
  qaOpen.value = false
  previewNode.value = null
  closeCreateMenu()
  closeUploadMenu()
}

function openFolderDialog() {
  if (!canCreateFolderHere.value) return
  openDialog('folder', selected.value)
}

function authorizeCurrentDingTalkIdentity() {
  if (boundDingTalkIdentity(appStore?.user).status === 'bound') demoIdentityAuthorized.value = true
}
function openDingTalkImport() {
  if (!canImportDingTalk.value || !mayWriteCurrent.value) return
  closeCreateMenu()
  closeUploadMenu()
  editingImportTask.value = null
  personalImportOpen.value = true
  qaOpen.value = false
  previewNode.value = null
}
function openDingTalkTaskEditor(task: DingTalkImportTask) {
  if (!canImportDingTalk.value) return
  editingImportTask.value = structuredClone(task)
  personalImportOpen.value = true
}
function executeDingTalkTask(submittedTask: DingTalkImportTask) {
  const task = importTasks.value.find(item => item.importTaskId === submittedTask.importTaskId)
  if (!task) return
  const now = Date.now()
  if (task.lastManualSubmittedAt && now - task.lastManualSubmittedAt < 10 * 60 * 1000) {
    toast.error('该同步任务正在进行中，请10分钟后重试')
    return
  }
  const executedAt = new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ')
  task.lastManualSubmittedAt = now
  task.latestSyncAt = executedAt
  const record: DingTalkImportTask = {
    ...submittedTask,
    documentMappings: submittedTask.documentMappings.map(mapping => ({ ...mapping, referencedAgentIds: mapping.referencedAgentIds ? [...mapping.referencedAgentIds] : undefined })),
    referencedAgentIds: submittedTask.referencedAgentIds ? [...submittedTask.referencedAgentIds] : undefined,
    agentIds: submittedTask.agentIds ? [...submittedTask.agentIds] : undefined,
    recordId: `R-MANUAL-${now}`,
    executedAt,
    latestSyncAt: executedAt,
    lastManualSubmittedAt: now,
    status: '同步中',
    referenceRefreshResult: submittedTask.referencedAgentIds?.length ? '待后台接入' : '无引用',
  }
  executionRecords.value.unshift(record)
  toast.success('已提交执行，请在知识接入-同步记录界面查看')
}
function closeDingTalkImport() {
  personalImportOpen.value = false
  editingImportTask.value = null
}
function updateDingTalkTaskSchedule(importTaskId: string, frequency: DingTalkSyncFrequency, schedule: string) {
  const task = importTasks.value.find(item => item.importTaskId === importTaskId)
  if (!task) return
  task.frequency = frequency
  task.schedule = schedule
  task.enabled = frequency !== '不自动同步'
}
function toggleDingTalkTask(importTaskId: string, enabled: boolean) {
  const task = importTasks.value.find(item => item.importTaskId === importTaskId)
  if (task) task.enabled = enabled
}
function deleteDingTalkTask(importTaskId: string) {
  importTasks.value = importTasks.value.filter(item => item.importTaskId !== importTaskId)
}
function completeDingTalkImport(payload: { importTaskId?: string; destinationId: string; documents: ImportableDocument[]; platformUserId: string; frequency?: DingTalkSyncFrequency; schedule?: string }) {
  if (!appStore?.user || payload.platformUserId !== appStore.user.id) return
  const destination = writableDestinations.value.find(item => item.id === payload.destinationId)
  if (!destination || !payload.documents.length) return
  const frequency = payload.frequency ?? '不自动同步'
  const schedule = payload.schedule ?? '—'
  if (payload.importTaskId) {
    const task = importTasks.value.find(item => item.importTaskId === payload.importTaskId)
    if (!task) return
    const priorMappings = new Map(task.documentMappings.map(mapping => [mapping.sourceDocumentId, mapping]))
    task.destinationId = destination.id
    task.destinationPath = destination.path ?? destination.name
    task.frequency = frequency
    task.schedule = schedule
    task.enabled = frequency !== '不自动同步'
    task.name = payload.documents.length === 1 ? payload.documents[0]!.name : `${payload.documents[0]!.name}等${payload.documents.length}份文档`
    task.documentMappings = payload.documents.map(document => {
      const previous = priorMappings.get(document.id)
      return previous ? { ...previous, sourceName: sourceDocumentPath(document) } : {
        sourceDocumentId: document.id,
        sourceName: sourceDocumentPath(document),
        localFileId: `dingtalk-import-${task.importTaskId}-${document.id}`,
        status: '成功' as const,
        sourceModifiedAt: document.updatedAt,
        lastSuccessfulModifiedAt: document.updatedAt,
        contentResult: '已更新' as const,
      }
    })
    closeDingTalkImport()
    return
  }
  if (payload.documents.some(document => importedSourceIds.value[destination.id]?.includes(document.id))) return
  const currentDocuments = personalDingTalkDocuments(dingTalkIdentity.value, scenario)
  const nodes = findUploadDestination(destination.id)
  if (!nodes) return
  const existingNames = new Set(nodes.map(node => node.name))
  const now = Date.now()
  const executedAt = new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ')
  const importTaskId = 'DT-' + now + '-' + (importTasks.value.length + 1)
  const mappings: DingTalkDocumentMapping[] = payload.documents.map((document, index) => {
    let permission: KnowledgePermissionSnapshot
    try {
      const current = currentDocuments.find(source => source.id === document.id)
      if (!current?.exportable || !canImportDingTalkSource(current.sourceRole)) throw new Error('源文档查看或下载权限已变更')
      permission = destination.space === 'public'
        ? initializeDingTalkPermissions(appStore.user!.displayName, current.initialPermissions)
        : { owner: appStore.user!.displayName, members: [], roles: {}, inheritParent: false, revision: 1 }
    } catch (error) {
      return { sourceDocumentId: document.id, sourceName: sourceDocumentPath(document), localFileId: '', status: '失败', contentResult: '失败', permissionResult: '失败',
        failureReason: error instanceof Error ? error.message : '权限成员未完整获取，本次未导入，请重试。' }
    }
    const baseName = document.name + '.' + document.format.toLowerCase()
    let name = baseName
    let suffix = 2
    while (existingNames.has(name)) name = document.name + '（' + suffix++ + '）.' + document.format.toLowerCase()
    existingNames.add(name)
    const localFileId = 'dingtalk-import-' + now + '-' + (importTasks.value.length + 1) + '-' + index
    nodes.push({ id: localFileId, name, kind: 'file', owner: appStore.user!.displayName, updatedAt: '刚刚 · 钉钉导入', format: document.format, size: '钉钉转存 · 演示', sourceDocumentId: document.id,
      permission })
    return { sourceDocumentId: document.id, sourceName: sourceDocumentPath(document), localFileId, status: '成功' as const,
      sourceModifiedAt: document.updatedAt, lastSuccessfulModifiedAt: document.updatedAt, contentResult: '已更新' as const,
      permissionResult: destination.space === 'public' ? '首次初始化' as const : '后续不更新' as const,
      permissionSyncedAt: destination.space === 'public' ? '刚刚' : undefined,
      permissionMemberCount: permission.members.length + 1 }
  })
  const successfulCount = mappings.filter(mapping => mapping.status === '成功').length
  const base = items.value.find(item => item.id === (destination.parentId ?? destination.id))
  if (base?.count !== undefined) base.count += successfulCount
  const task: DingTalkImportTask = { importTaskId, recordId: 'R-' + now, executedAt, platformUserId: appStore.user.id, userAlias: appStore.user.displayName,
    name: payload.documents.length === 1 ? payload.documents[0]!.name : `${payload.documents[0]!.name}等${payload.documents.length}份文档`,
    taskKind: 'document-import', syncMode: 'backend-managed', syncRuntime: 'prototype', enabled: frequency !== '不自动同步', frequency, schedule,
    referencedAgentIds: [], referenceRefreshResult: '无引用',
    destinationId: destination.id, destinationPath: destination.path ?? destination.name,
    latestSyncAt: executedAt,
    status: successfulCount === mappings.length ? '同步成功' : successfulCount ? '部分失败' : '同步失败', documentMappings: mappings }
  importTasks.value.unshift(task)
  executionRecords.value.unshift(structuredClone(task))
  closeDingTalkImport()
}
function sourceDocumentPath(document: ImportableDocument) {
  const paths: Record<string, string> = { onboarding: '集团制度知识库 / 人事制度', attendance: '集团制度知识库 / 人事制度', expense: '集团制度知识库', catalog: '商品运营知识库', launch: '商品运营知识库' }
  return (document.sourcePath ?? paths[document.id] ?? '钉钉文档') + ' / ' + document.name
}
function openUploadDialog() {
  if (!mayWriteCurrent.value) return
  openDialog('upload', nodePath.value.at(-1) ?? selected.value)
}

function openDocumentDialog() {
  if (!mayWriteCurrent.value) return
  openDialog('document', nodePath.value.at(-1) ?? selected.value)
}

function selectItem(item: SourceKnowledgeBase | string) {
  closeCreateMenu()
  closeUploadMenu()
  accessOpen.value = false
  recordsOpen.value = false
  const next = typeof item === 'string' ? items.value.find((entry) => entry.id === item) : item
  selected.value = next ?? null
  nodePath.value = []
  previewNode.value = null
  closeMobileSidebar()
}

function handleAction(payload: {
  kind: 'preview' | 'edit-document' | 'rename' | 'permission' | 'delete'
  target: SourceKnowledgeBase | SourceKnowledgeNode
}) {
  if (payload.kind === 'delete' && hasKnowledgeReferences(payload.target)) { toast.error('文档已被智能体引用，请先解除引用'); return }
  if (!canResourceAction(payload.kind, payload.target)) return
  if (payload.kind === 'preview' && 'kind' in payload.target) {
    previewNode.value = payload.target
    qaOpen.value = false
    return
  }
  if (payload.kind === 'preview') return
  openDialog(payload.kind, payload.target)
}
function resourceTreeIds(target: SourceKnowledgeBase | SourceKnowledgeNode): Set<string> {
  const ids = new Set<string>([target.id])
  const visit = (nodes: SourceKnowledgeNode[]) => nodes.forEach(node => { ids.add(node.id); visit(node.children ?? []) })
  visit('space' in target ? target.nodes ?? [] : target.children ?? [])
  return ids
}
function hasKnowledgeReferences(target: SourceKnowledgeBase | SourceKnowledgeNode): boolean {
  const ids = resourceTreeIds(target)
  return agentReferenceOptions.value.some(agent => agent.documentIds.some(id => ids.has(id)))
}
function canResourceAction(action: string, target: SourceKnowledgeBase | SourceKnowledgeNode) {
  if (action === 'delete' && hasKnowledgeReferences(target)) return false
  if (action === 'edit-document' && (!('kind' in target) || target.kind !== 'file' || target.content === undefined)) return false
  const base = 'space' in target ? target : items.value.find(item => Boolean(findNodePath(item.nodes ?? [], target.id)))
  const publicResource = base?.space === 'public'
  if (systemKnowledgeAdmin.value && publicResource) return true
  const role = effectiveResourceRole(target)
  if (!role) return false
  if (action === 'preview') return true
  if (action === 'delete') {
    return canDeleteKnowledge(role, 'space' in target || target.permission?.inheritParent === false)
  }
  return canConfigureKnowledge(role)
}

type SidebarNodeAction = 'folder' | 'document' | 'upload' | 'import' | 'preview' | 'edit-document' | 'rename' | 'permission' | 'delete'
function sidebarDestination(target: SourceKnowledgeBase | SourceKnowledgeNode, kbId: string): SourceKnowledgeBase | SourceKnowledgeNode | null {
  const base = items.value.find(item => item.id === kbId)
  if (!base) return null
  if ('space' in target || target.kind === 'folder') return target
  const path = findNodePath(base.nodes ?? [], target.id) ?? []
  return path.at(-2) ?? base
}
function canSidebarNodeAction(action: SidebarNodeAction, target: SourceKnowledgeBase | SourceKnowledgeNode, kbId: string) {
  if (action === 'folder') return 'space' in target && writableDestinations.value.some(item => item.id === target.id && !item.parentId)
  if (action === 'document' || action === 'upload' || action === 'import') {
    if (action === 'import' && !canImportDingTalk.value) return false
    const destination = sidebarDestination(target, kbId)
    return Boolean(destination && writableDestinations.value.some(item => item.id === destination.id && (item.parentId ?? item.id) === kbId))
  }
  if (action === 'preview' && (!('kind' in target) || target.kind !== 'file')) return false
  return canResourceAction(action, target)
}
function handleSidebarNodeAction(payload: { kind: SidebarNodeAction; target: SourceKnowledgeBase | SourceKnowledgeNode; kbId: string }) {
  if (payload.kind === 'delete' && hasKnowledgeReferences(payload.target)) { toast.error('文档已被智能体引用，请先解除引用'); return }
  if (!canSidebarNodeAction(payload.kind, payload.target, payload.kbId)) return
  const base = items.value.find(item => item.id === payload.kbId)
  if (!base) return
  activeSpace.value = base.space
  selected.value = base
  accessOpen.value = false
  recordsOpen.value = false
  previewNode.value = null
  const path = 'space' in payload.target ? [] : findNodePath(base.nodes ?? [], payload.target.id) ?? []
  nodePath.value = path.at(-1)?.kind === 'file' ? path.slice(0, -1) : path
  const destination = sidebarDestination(payload.target, payload.kbId)
  if (payload.kind === 'folder') openDialog('folder', base)
  else if (payload.kind === 'document') openDialog('document', payload.target)
  else if (payload.kind === 'upload' && destination) openDialog('upload', destination)
  else if (payload.kind === 'import') openDingTalkImport()
  else if (payload.kind === 'preview' || payload.kind === 'edit-document' || payload.kind === 'rename' || payload.kind === 'permission' || payload.kind === 'delete') {
    handleAction({ kind: payload.kind, target: payload.target })
  }
}

function effectiveResourceRole(target: SourceKnowledgeBase | SourceKnowledgeNode): KnowledgeRole | null {
  const base = 'space' in target ? target : items.value.find(item => Boolean(findNodePath(item.nodes ?? [], target.id)))
  if (base?.space === 'personal') return prototypeCanWriteKnowledge(base.id, appStore?.user?.role) ? 'OWNER' : null
  if (route?.query.permissionRole) return prototypeRole.value
  if (systemKnowledgeAdmin.value) return 'MANAGER'
  if (!appStore?.user) return null
  const path = 'space' in target ? [] : findNodePath(base?.nodes ?? [], target.id) ?? [target]
  const chain: (SourceKnowledgeBase | SourceKnowledgeNode)[] = [...path].reverse()
  if (base) chain.push(base)
  let strongest: KnowledgeRole | null = null
  let hasSnapshot = false
  const rank: Record<KnowledgeRole, number> = { OWNER: 3, MANAGER: 3, EDITOR: 2, DOWNLOADER: 2, READER: 1 }
  for (const resource of chain) {
    if (resource.owner === appStore.user.displayName) return 'MANAGER'
    if (!resource.permission) continue
    hasSnapshot = true
    const role = knowledgeRoleForPerson(resource.permission, appStore.user.displayName, localDepartmentMembers.value)
    if (role && (!strongest || rank[role] > rank[strongest])) strongest = role
    if (!resource.permission.inheritParent) break
  }
  return strongest ?? (hasSnapshot ? null : prototypeRole.value)
}

function findNodePath(nodes: SourceKnowledgeNode[], nodeId: string, path: SourceKnowledgeNode[] = []): SourceKnowledgeNode[] | null {
  for (const node of nodes) {
    const next = [...path, node]
    if (node.id === nodeId) return next
    const nested = node.children ? findNodePath(node.children, nodeId, next) : null
    if (nested) return nested
  }
  return null
}

function navigateNode(node: SourceKnowledgeNode) {
  if (!selected.value) return
  closeCreateMenu()
  closeUploadMenu()
  if (node.kind === 'file') {
    if (!canResourceAction('preview', node)) return
    previewNode.value = node
    qaOpen.value = false
    return
  }
  nodePath.value = findNodePath(selected.value.nodes ?? [], node.id) ?? []
  previewNode.value = null
}

function navigateSidebar(payload: SourceKnowledgeNavigation) {
  closeCreateMenu()
  closeUploadMenu()
  accessOpen.value = false
  recordsOpen.value = false
  const knowledgeBase = items.value.find((item) => item.id === payload.kbId)
  if (!knowledgeBase) return
  selected.value = knowledgeBase
  nodePath.value = []
  previewNode.value = null
  if (payload.nodeId) {
    const path = findNodePath(knowledgeBase.nodes ?? [], payload.nodeId) ?? []
    const node = path.at(-1)
    if (node?.kind === 'file') {
      previewNode.value = node
      qaOpen.value = false
    }
    else nodePath.value = path
  }
  closeMobileSidebar()
}

function switchSpace(space: KnowledgeSpace) {
  closeCreateMenu()
  closeUploadMenu()
  accessOpen.value = false
  recordsOpen.value = false
  activeSpace.value = space
  selected.value = null
  nodePath.value = []
  previewNode.value = null
  closeMobileSidebar()
}

function goRoot() {
  closeCreateMenu()
  closeUploadMenu()
  accessOpen.value = false
  recordsOpen.value = false
  selected.value = null
  nodePath.value = []
  previewNode.value = null
  closeMobileSidebar()
}

function goBreadcrumb(index: number) {
  nodePath.value = nodePath.value.slice(0, index + 1)
  previewNode.value = null
}

function createKnowledge(payload: { name: string; space: KnowledgeSpace }) {
  const owner = appStore?.user?.displayName ?? '当前用户'
  items.value.unshift({
    id: `local-${Date.now()}`,
    name: payload.name,
    owner,
    permission: { owner, members: [], roles: {}, inheritParent: false, revision: 1 },
    createdAt: '刚刚',
    space: payload.space,
    nodes: [],
  })
  closeDialog()
}

function renameKnowledge(name: string) {
  if (dialogTarget.value) {
    dialogTarget.value.name = name
  }
  closeDialog()
}

function deleteKnowledge() {
  if (dialogTarget.value) {
    if (!canResourceAction('delete', dialogTarget.value)) { toast.error('当前资源不可删除'); return }
    const deletedIds = resourceTreeIds(dialogTarget.value)
    if ('space' in dialogTarget.value) {
      items.value = items.value.filter((item) => item.id !== dialogTarget.value?.id)
      if (selected.value?.id === dialogTarget.value.id) goRoot()
    } else if (selected.value) {
      removeNode(selected.value.nodes ?? [], dialogTarget.value.id)
      nodePath.value = nodePath.value.filter((node) => node.id !== dialogTarget.value?.id)
      if (previewNode.value?.id === dialogTarget.value.id) previewNode.value = null
    }
    importTasks.value = importTasks.value
      .map(task => ({ ...task, documentMappings: task.documentMappings.filter(mapping => !deletedIds.has(mapping.localFileId)) }))
      .filter(task => task.documentMappings.length > 0 && !deletedIds.has(task.destinationId))
  }
  closeDialog()
}

function removeNode(nodes: SourceKnowledgeNode[], id: string): boolean {
  const index = nodes.findIndex((node) => node.id === id)
  if (index >= 0) {
    nodes.splice(index, 1)
    return true
  }
  return nodes.some((node) => node.children && removeNode(node.children, id))
}

function createFolder(payload: { name: string; kb: string }) {
  const destination = items.value.find(item => item.id === payload.kb)
  if (!destination || !writableDestinations.value.some(item => item.id === payload.kb && !item.parentId)) return
  const nodes = destination.nodes ?? (destination.nodes = [])
  const owner = appStore?.user?.displayName ?? '当前用户'
  nodes.push({
    id: `local-folder-${Date.now()}`,
    name: payload.name,
    kind: 'folder',
    owner,
    permission: { owner, members: [], roles: {}, inheritParent: true, revision: 1 },
    updatedAt: '刚刚',
    children: [],
  })
  closeDialog()
}

function documentNameExists(name: string, destinationId: string, excludingId?: string): boolean {
  const normalized = name.trim().toLocaleLowerCase()
  if (!normalized) return false
  let siblings = destinationId ? findUploadDestination(destinationId) : null
  if (excludingId) {
    for (const base of items.value) {
      const path = findNodePath(base.nodes ?? [], excludingId)
      if (path) { siblings = path.length === 1 ? base.nodes ?? [] : path.at(-2)?.children ?? []; break }
    }
  }
  return Boolean(siblings?.some(node => node.kind === 'file' && node.id !== excludingId && node.name.trim().toLocaleLowerCase() === normalized))
}
function createDocument(payload: { name: string; content: string; destinationId: string }) {
  if (!writableDestinations.value.some(item => item.id === payload.destinationId)) return
  const destination = findUploadDestination(payload.destinationId)
  if (!destination) return
  if (documentNameExists(payload.name, payload.destinationId)) { toast.error('同一位置已有同名文档'); return }
  const owner = appStore?.user?.displayName ?? '当前用户'
  const document: SourceKnowledgeNode = {
    id: `local-document-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: payload.name,
    kind: 'file',
    owner,
    permission: { owner, members: [], roles: {}, inheritParent: true, revision: 1 },
    updatedAt: '刚刚',
    format: '文档',
    size: `${payload.content.length} 字`,
    content: payload.content,
  }
  destination.push(document)
  const base = items.value.find(item => item.id === payload.destinationId || Boolean(findFolder(item.nodes ?? [], payload.destinationId)))
  if (base?.count !== undefined) base.count++
  closeDialog()
}

function editDocument(payload: { name: string; content: string }) {
  const target = dialogTarget.value
  if (!target || !('kind' in target) || target.kind !== 'file' || target.content === undefined || !canResourceAction('edit-document', target)) return
  if (documentNameExists(payload.name, '', target.id)) { toast.error('同一位置已有同名文档'); return }
  target.name = payload.name
  target.content = payload.content
  target.size = `${payload.content.length} 字`
  target.updatedAt = '刚刚'
  closeDialog()
}

function uploadFiles(files: File[], destinationId: string, options: { monthlyReport: boolean }) {
  if (!writableDestinations.value.some(item => item.id === destinationId)) return
  const destination = findUploadDestination(destinationId)
  if (!destination) return
  const owner = appStore?.user?.displayName ?? '当前用户'
  const next = files.map<SourceKnowledgeNode>((file, index) => ({
    id: `local-file-${Date.now()}-${index}`,
    name: file.name,
    kind: 'file',
    owner,
    permission: { owner, members: [], roles: {}, inheritParent: true, revision: 1 },
    updatedAt: '刚刚',
    format: file.name.split('.').pop()?.toUpperCase() ?? 'FILE',
    size: `${Math.max(1, Math.round(file.size / 1024))} KB${options.monthlyReport && /\.xlsx?$/i.test(file.name) ? ' · 月报解析' : /\.pptx?$/i.test(file.name) ? ' · PPT解析' : ''}`,
  }))
  destination.push(...next)
  closeDialog()
}

function findUploadDestination(destinationId: string): SourceKnowledgeNode[] | null {
  for (const knowledgeBase of items.value) {
    if (knowledgeBase.id === destinationId) return knowledgeBase.nodes ?? (knowledgeBase.nodes = [])
    const folder = findFolder(knowledgeBase.nodes ?? [], destinationId)
    if (folder) return folder.children ?? (folder.children = [])
  }
  return null
}

function findFolder(nodes: SourceKnowledgeNode[], id: string): SourceKnowledgeNode | null {
  for (const node of nodes) {
    if (node.kind === 'folder' && node.id === id) return node
    const nested = node.children ? findFolder(node.children, id) : null
    if (nested) return nested
  }
  return null
}

onMounted(() => {
  const kbId = typeof route?.query.kb === 'string' ? route.query.kb : ''
  const folderId = typeof route?.query.folder === 'string' ? route.query.folder : ''
  const knowledgeBase = items.value.find(item => item.id === kbId)
  if (knowledgeBase) {
    selected.value = knowledgeBase
    activeSpace.value = knowledgeBase.space
    const folder = knowledgeBase.nodes?.find(node => node.kind === 'folder' && node.id === folderId)
    nodePath.value = folder ? [folder] : []
  }
  if (route?.query.upload === 'true') openUploadDialog()
})
function savePermission(payload: KnowledgePermissionSnapshot & { resourceId: string; ownershipTransfer?: KnowledgeOwnershipTransfer }) {
  if (dialogTarget.value?.id === payload.resourceId) {
    if (payload.ownershipTransfer) {
      if (payload.owner !== payload.ownershipTransfer.newOwner) return
      try {
        applyKnowledgeOwnershipTransfer(dialogTarget.value, payload.ownershipTransfer)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '所有权转交失败，请重试')
        return
      }
    }
    const { members, roles, owner, inheritParent, revision } = payload
    const subjectKinds = payload.subjectKinds ?? dialogTarget.value.permission?.subjectKinds
    const initialPermissionSubjects = payload.initialPermissionSubjects ?? dialogTarget.value.permission?.initialPermissionSubjects ?? Object.keys(dialogTarget.value.permission?.syncedRoles ?? {})
    dialogTarget.value.permission = structuredClone({ members, roles, owner, inheritParent, revision,
      initialPermissionSubjects: [...new Set(initialPermissionSubjects)].filter(subject => members.includes(subject) && subject !== owner),
      ...(subjectKinds ? { subjectKinds: Object.fromEntries(Object.entries(subjectKinds).filter(([subject]) => members.includes(subject))) } : {}),
    })
    dialogTarget.value.owner = payload.owner
  }
  closeDialog()
}
</script>

<template>
  <main class="knowledge-page" data-testid="knowledge-main-pane">
    <div class="knowledge-shell" :class="{ 'sidebar-is-open': sidebarOpen, 'qa-is-open': qaOpen || previewNode }">
      <button v-if="isMobile && sidebarOpen" type="button" class="knowledge-sidebar-backdrop" aria-label="关闭知识侧栏" @click="closeMobileSidebar" />
      <KnowledgeSidebar
        :open="sidebarOpen"
        :items="items"
        :space="activeSpace"
        :search-requested="sidebarSearchRequested"
        :selected-id="selectedTreeId"
        :can-node-action="canSidebarNodeAction"
        :can-quick-upload="mayWriteCurrent"
        :can-create-folder="canCreateFolderHere"
        :can-import-ding-talk="canImportDingTalk && mayWriteCurrent"
        @node-action="handleSidebarNodeAction"
        @quick-upload="openUploadDialog"
        @create-folder="openFolderDialog"
        @import="openDingTalkImport"
        @close="sidebarOpen = false"
        @create="openDialog('create')"
        @navigate="navigateSidebar"
        @space-change="switchSpace"
      />

      <section class="knowledge-content">
        <header class="knowledge-toolbar">
          <div class="toolbar-leading">
            <button
              v-if="!sidebarOpen"
              class="icon-action"
              aria-label="展开侧栏"
              @click="sidebarOpen = true"
            >
              <PanelLeftOpen :size="18" />
            </button>
            <button
              v-if="!sidebarOpen"
              class="icon-action"
              aria-label="搜索知识库"
              @click="sidebarOpen = true; sidebarSearchRequested++"
            >
              <Search :size="18" />
            </button>
            <button
              v-if="!sidebarOpen"
              class="icon-action"
              aria-label="新建知识库"
              @click="openDialog('create')"
            >
              <Plus :size="19" />
            </button>
            <div v-if="accessOpen" class="breadcrumb"><button @click="goRoot">全部知识库</button><span>›</span><strong>知识接入</strong></div>
            <div v-else-if="recordsOpen" class="breadcrumb"><button @click="goRoot">全部知识库</button><span>›</span><strong>同步记录</strong></div>
            <div v-else-if="selected" data-testid="knowledge-breadcrumb" class="breadcrumb">
              <button @click="goRoot">全部知识库</button><span>›</span>
              <button v-if="nodePath.length" @click="nodePath = []; previewNode = null">{{ selected.name }}</button>
              <strong v-else>{{ selected.name }}</strong>
              <template v-for="(node, index) in nodePath" :key="node.id">
                <span>›</span>
                <button v-if="index < nodePath.length - 1" @click="goBreadcrumb(index)">{{ node.name }}</button>
                <strong v-else>{{ node.name }}</strong>
              </template>
            </div>
            <strong v-else class="page-label">全部知识库</strong>
          </div>

          <div v-if="!accessOpen && !recordsOpen" class="toolbar-actions" data-testid="knowledge-action-row">
            <button v-if="canManageKnowledgeAccess" type="button" class="source-button" aria-label="知识接入" @click="openKnowledgeAccess"><Cable :size="17" />知识接入</button>
            <button v-else-if="appStore?.user" type="button" class="source-button" aria-label="同步记录" @click="openSyncRecords"><History :size="17" />同步记录</button>
            <div v-if="showToolbarUpload" ref="uploadMenuRoot" class="create-menu" @keydown="uploadMenuKeydown">
              <button ref="uploadMenuButton" type="button" class="source-button" aria-label="上传" aria-haspopup="menu" :aria-expanded="uploadMenuOpen" aria-controls="knowledge-upload-options" @click="closeCreateMenu(); uploadMenuOpen = !uploadMenuOpen"><Upload :size="17" />上传</button>
              <div v-if="uploadMenuOpen" id="knowledge-upload-options" class="create-options" role="menu" aria-label="上传菜单">
                <button type="button" role="menuitem" aria-label="上传文件" :disabled="!mayWriteCurrent" @click="openUploadDialog"><Upload :size="17"/><span>上传文件</span></button>
                <button type="button" role="menuitem" aria-label="从钉钉导入" :disabled="!canImportDingTalk || !mayWriteCurrent" @click="openDingTalkImport"><span class="dingtalk-menu-icon" aria-hidden="true">钉</span><span>从钉钉导入</span></button>
              </div>
            </div>
            <div v-if="showToolbarCreate" ref="createMenuRoot" class="create-menu" @keydown="createMenuKeydown">
              <button ref="createMenuButton" type="button" class="source-button primary create-trigger" aria-label="新建" aria-haspopup="menu" :aria-expanded="createMenuOpen" aria-controls="knowledge-create-options" @click="closeUploadMenu(); createMenuOpen = !createMenuOpen"><Plus :size="17"/>新建</button>
              <div v-if="createMenuOpen" id="knowledge-create-options" class="create-options" role="menu" aria-label="新建菜单">
                <button v-if="!selected" type="button" role="menuitem" aria-label="新建知识库" @click="openDialog('create')"><Plus :size="17"/><span>新建知识库</span></button>
                <button v-if="selected && !nodePath.length" type="button" role="menuitem" aria-label="新建文件夹" :disabled="!canCreateFolderHere" @click="openFolderDialog"><FolderPlus :size="17"/><span>新建文件夹</span></button>
              </div>
            </div>
            <button
              v-if="!qaOpen && canRetrieveCurrentKnowledge"
              class="source-button qa"
              aria-label="小智问答"
              @click="previewNode = null; qaOpen = true"
            >
              <Bot :size="17" />小智问答
            </button>
          </div>
        </header>

        <KnowledgeAccessPanel v-if="(accessOpen && canManageKnowledgeAccess) || recordsOpen" :can-manage="accessOpen && canManageKnowledgeAccess" :viewer-user-id="appStore?.user?.id" :destinations="writableDestinations" :records="visibleImportTasks" :execution-records="visibleExecutionRecords" :agent-reference-options="agentReferenceOptions" @execute-task="executeDingTalkTask" @edit-task="openDingTalkTaskEditor" @toggle-task="toggleDingTalkTask" @delete-task="deleteDingTalkTask" />
        <KnowledgeTable v-else
          :items="visibleItems"
          :detail="selected"
          :nodes="currentNodes"
          :can-action="canResourceAction"
          :selected-ids="selectedIds"
          @select="selectItem"
          @navigate-node="navigateNode"
          @action="handleAction"
          @toggle-select="toggleSelect"
          @toggle-all="toggleAll"
          @move="openMoveDialog"
          @batch-delete="openBatchDelete"
          @clear-selection="clearSelection"
        />
      </section>

      <KnowledgeQaPanel v-if="qaOpen && canRetrieveCurrentKnowledge" @close="qaOpen = false" />

      <aside v-if="previewNode" class="knowledge-preview" data-testid="knowledge-file-preview" aria-label="文件预览">
        <header>
          <span class="preview-file-icon"><FileText :size="18" /></span>
          <div><strong>{{ previewNode.name }}</strong><small>{{ previewNode.format }} · {{ previewNode.size }}</small></div>
          <button type="button" aria-label="关闭文件预览" title="关闭" @click="previewNode = null"><X :size="18" /></button>
        </header>
        <div v-if="previewNode.content !== undefined || currentResourceRole" class="preview-actions">
          <button v-if="previewNode.content !== undefined && canResourceAction('edit-document', previewNode)" type="button" class="preview-edit" aria-label="编辑文档" @click="openDialog('edit-document', previewNode)">编辑文档</button>
          <KnowledgeDownloadAction v-else-if="previewNode.content === undefined" :role="currentResourceRole" :download-url="previewNode.downloadUrl" :file-name="previewNode.name" />
        </div>
        <div class="preview-paper">
          <small>{{ selected?.name }}</small>
          <h2>{{ previewNode.content !== undefined ? previewNode.name : previewNode.name.replace(/\.[^.]+$/, '') }}</h2>
          <div v-if="previewNode.content !== undefined" class="document-preview-content" data-testid="knowledge-document-content">{{ previewNode.content }}</div>
          <section>
            <h3>文件信息</h3>
            <dl><dt>创建者</dt><dd>{{ previewNode.owner }}</dd><dt>更新时间</dt><dd>{{ previewNode.updatedAt }}</dd><dt>文件大小</dt><dd>{{ previewNode.size }}</dd></dl>
          </section>
        </div>
      </aside>
    </div>

    <DingTalkDocumentImport v-if="personalImportOpen && canImportDingTalk" :key="`${dingTalkIdentity.platformUserId}:${editingImportTask?.importTaskId ?? 'new'}`" :identity="dingTalkIdentity" :space="activeSpace" :destinations="writableDestinations" :existing-source-ids="importedSourceIds" :default-destination-id="currentDestinationId" :initial-task="editingImportTask ?? undefined" :application-available="!['credentials-expired', 'permission-denied', 'unknown', 'disconnected'].includes(scenario)" @close="closeDingTalkImport" @authorize="authorizeCurrentDingTalkIdentity" @complete="completeDingTalkImport" @failed="completeDingTalkImport" />
    <KnowledgeDialogs
      :kind="dialog"
      :target="dialogTarget"
      :document-name-exists="documentNameExists"
      :destinations="uploadDestinations"
      :default-space="activeSpace"
      :actor-role="dialogActorRole"
      :system-admin="systemKnowledgeAdmin && activeSpace === 'public'"
      @close="closeDialog"
      @create="createKnowledge"
      @folder="createFolder"
      @document="createDocument"
      @edit-document="editDocument"
      @upload="uploadFiles"
      @rename="renameKnowledge"
      @permission="savePermission"
      @confirm-delete="deleteKnowledge"
    />

    <!-- PRD M4：移动文件与批量操作 -->
    <MoveFilesDialog
      v-if="moveDialogOpen"
      :targets="moveTargets"
      :selections="selectedTargets"
      :forbidden-ids="forbiddenIds"
      :analyze="move.analyzeMove"
      @close="moveDialogOpen = false"
      @confirm="confirmMove"
    />
    <BatchMoveResultDialog
      v-if="resultOpen"
      :results="batchResults"
      :title="resultTitle"
      :target-name="resultTargetName"
      @close="closeResult"
      @retry="retryResult"
    />
    <div v-if="batchDeleteConfirmOpen" class="batch-delete-overlay" @mousedown.self="batchDeleteConfirmOpen = false">
      <section class="batch-delete-surface" role="dialog" aria-modal="true" aria-labelledby="batch-delete-title" data-testid="batch-delete-dialog">
        <header class="batch-delete-header">
          <h2 id="batch-delete-title">批量删除</h2>
          <button class="batch-close" type="button" aria-label="关闭批量删除确认" @click="batchDeleteConfirmOpen = false"><X :size="19" /></button>
        </header>
        <div class="batch-delete-body">
          <p>确定要删除已选中的 <strong>{{ selectedIds.size }}</strong> 项吗？</p>
          <p class="batch-delete-note">删除后不可恢复，所选资源及其下级内容将一并移除。</p>
        </div>
        <footer class="batch-delete-footer">
          <button class="batch-btn secondary" type="button" @click="batchDeleteConfirmOpen = false">取消</button>
          <button class="batch-btn danger" type="button" @click="confirmBatchDelete">确定删除</button>
        </footer>
      </section>
    </div>
  </main>
</template>

<style scoped>
.knowledge-page {
  position: relative;
  height: calc(100vh - 56px);
  min-height: 620px;
  overflow: hidden;
  background: #fff;
  color: #111;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    'PingFang SC',
    'Microsoft YaHei',
    sans-serif;
}
.knowledge-shell {
  display: grid;
  height: 100%;
  grid-template-columns: 0 minmax(0, 1fr);
  transition: grid-template-columns 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.knowledge-shell.sidebar-is-open {
  grid-template-columns: 280px minmax(0, 1fr);
}
.knowledge-shell.qa-is-open {
  grid-template-columns: 0 minmax(0, 1fr) auto;
}
.knowledge-shell.sidebar-is-open.qa-is-open {
  grid-template-columns: 280px minmax(0, 1fr) auto;
}
.knowledge-content {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  padding: 16px 32px 0 24px;
  transition: padding 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.knowledge-shell:not(.sidebar-is-open) .knowledge-content {
  padding-left: 32px;
}
.knowledge-toolbar {
  display: flex;
  min-height: 32px;
  align-items: center;
  gap: 20px;
}
.toolbar-leading,
.toolbar-actions {
  display: flex;
  align-items: center;
}
.toolbar-leading {
  min-width: 0;
  flex: 1;
  gap: 4px;
  overflow: hidden;
}
.toolbar-actions {
  flex: 0 0 auto;
  margin-left: auto;
  gap: 8px;
}
.icon-action {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 8px;
  color: #3f3f3f;
  transition: background 0.15s;
}
.icon-action:hover {
  background: #f7f7f9;
}
.page-label {
  margin-left: 6px;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
}
.breadcrumb {
  display: flex;
  min-width: 0;
  overflow: hidden;
  align-items: center;
  gap: 8px;
  margin-left: 4px;
  font-size: 14px;
  white-space: nowrap;
}
.breadcrumb button {
  min-width: 0;
  overflow: hidden;
  color: #777;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.breadcrumb strong {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}
.create-menu{position:relative}.create-menu .create-trigger{border-radius:8px;padding:0 16px}.create-options{position:absolute;z-index:30;top:calc(100% + 6px);right:0;width:204px;border:1px solid #e2e4e8;border-radius:12px;background:#fff;padding:7px;box-shadow:0 10px 28px rgba(0,0,0,.12)}.create-options button{display:flex;width:100%;min-height:40px;align-items:center;gap:11px;border:0;border-radius:7px;background:#fff;padding:9px 12px;color:#30343a;font-size:13px;text-align:left;cursor:pointer}.create-options button:hover,.create-options button:focus-visible{background:#f5f6f8}.create-options button:disabled{opacity:.45;cursor:not-allowed}.create-options button>svg{color:#707b89}.create-divider{height:1px;margin:5px 5px;background:#eceef1}.dingtalk-menu-icon{display:grid;width:18px;height:18px;flex:none;place-items:center;border-radius:4px;background:#e9f3ff;color:#1677ff;font-size:11px;font-weight:700}
.source-button {
  display: flex;
  height: 32px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0 16px;
  background: #fff;
  font-size: 14px;
  line-height: 22px;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.source-button:disabled{opacity:.45;cursor:not-allowed}
.source-button:hover {
  background: #f7f7f9;
}
.source-button.primary {
  border-color: #111;
  background: #111;
  color: #fff;
}
.source-button.primary:hover {
  background: #292929;
}
.source-button.qa {
  min-width: 112px;
}
.knowledge-preview{width:376px;min-width:376px;border-left:1px solid #e8e8e8;background:#f6f7f8;box-shadow:-2px 0 10px rgba(0,0,0,.025);overflow:auto}.knowledge-preview>header{display:grid;height:70px;grid-template-columns:32px minmax(0,1fr) 30px;align-items:center;gap:8px;border-bottom:1px solid #eee;background:#fff;padding:0 18px}.knowledge-preview>header>div{min-width:0}.knowledge-preview strong,.knowledge-preview small{display:block}.knowledge-preview>header strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.knowledge-preview>header small{margin-top:3px;color:#999;font-size:11px}.knowledge-preview>header button{display:grid;width:30px;height:30px;place-items:center;border:0;border-radius:7px;background:transparent;color:#777}.knowledge-preview>header button:hover{background:#f3f3f3}.preview-file-icon{display:grid;width:30px;height:30px;place-items:center;border-radius:7px;background:#edf4ff;color:#4b82d0}.preview-paper{margin:20px;border-radius:4px;background:#fff;padding:28px 24px;box-shadow:0 3px 18px rgba(0,0,0,.08);color:#303846}.preview-paper>small{color:#8090a0;font-size:10px;letter-spacing:.8px}.preview-paper h2{margin:8px 0 16px;font-size:20px}.preview-paper>p{margin:0;color:#6b7581;font-size:12px;line-height:1.8}.preview-paper section{margin-top:24px;border-top:1px solid #edf0f3;padding-top:18px}.preview-paper h3{margin:0 0 12px;font-size:13px}.preview-paper dl{display:grid;grid-template-columns:70px 1fr;gap:9px;margin:0;font-size:11px}.preview-paper dt{color:#929ba7}.preview-paper dd{margin:0;color:#4d5662}
@media (max-width: 900px) {
  .toolbar-actions {
    gap: 8px;
  }
  .source-button {
    padding: 0 12px;
  }
  .source-button.qa {
    min-width: auto;
  }
  .knowledge-content {
    padding-right: 32px;
  }
  .knowledge-preview{position:fixed;z-index:250;inset:56px 0 0 auto;width:min(376px,100vw);min-width:0;box-shadow:-8px 0 26px rgba(0,0,0,.12)}
}
.knowledge-sidebar-backdrop{position:fixed;inset:56px 0 0;z-index:190;border:0;background:rgba(0,0,0,.2)}
@media (max-width: 720px) {
  .knowledge-page {
    height: calc(100vh - 56px);
    min-height: 0;
  }
  .knowledge-shell,
  .knowledge-shell.sidebar-is-open,
  .knowledge-shell.qa-is-open,
  .knowledge-shell.sidebar-is-open.qa-is-open {
    display: block;
  }
  .knowledge-content,
  .knowledge-shell:not(.sidebar-is-open) .knowledge-content {
    height: 100%;
    padding: 92px 12px 0;
  }
  .knowledge-toolbar {
    position: absolute;
    left: 12px;
    right: 12px;
    top: 60px;
    z-index: 1;
    flex-wrap: wrap;
  }
  .toolbar-leading {
    width: 100%;
  }
  .toolbar-actions {
    position: absolute;
    right: 0;
    top: 0;
  }
  .page-label,
  .breadcrumb {
    display: none;
  }
  .source-button {
    width: 32px;
    padding: 0;
    font-size: 0;
  }
  .source-button svg {
    display: block;
  }
  .source-button.qa {
    min-width: 32px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .knowledge-shell,
  .knowledge-content,
  .source-button,
  .icon-action {
    transition: none;
  }
}
.preview-actions{display:flex;justify-content:flex-end;padding:12px 18px 0}.preview-actions:empty{display:none}
.preview-edit{border:1px solid #e3e5e8;border-radius:7px;background:#fff;padding:6px 10px;color:#444;font:12px/18px inherit;cursor:pointer}.preview-edit:hover{background:#f7f8fa}.document-preview-content{min-height:80px;white-space:pre-wrap;overflow-wrap:anywhere;color:#394250;font-size:13px;line-height:1.85}


/* ─── PRD M4：批量删除二次确认 ─── */
.batch-delete-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: grid;
  place-items: center;
  padding: 12px;
  background: rgba(0, 0, 0, 0.4);
}
.batch-delete-surface {
  width: min(440px, calc(100vw - 24px));
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.18);
}
.batch-delete-header {
  display: flex;
  min-height: 66px;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}
.batch-delete-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.batch-close {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #777;
  cursor: pointer;
}
.batch-close:hover {
  background: #f6f6f7;
  color: #111;
}
.batch-delete-body {
  padding: 0 24px;
  color: #333;
  font-size: 14px;
  line-height: 22px;
}
.batch-delete-body p {
  margin: 0;
}
.batch-delete-body strong {
  color: #d92d20;
}
.batch-delete-body .batch-delete-note {
  margin-top: 10px;
  border-radius: 7px;
  background: #fff5f5;
  padding: 9px 12px;
  color: #b42318;
  font-size: 13px;
}
.batch-delete-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 24px;
}
.batch-btn {
  height: 34px;
  min-width: 80px;
  border-radius: 7px;
  padding: 0 16px;
  font-size: 14px;
  cursor: pointer;
}
.batch-btn.secondary {
  border: 1px solid #d9dce1;
  background: #fff;
  color: #4e5969;
}
.batch-btn.danger {
  border: 1px solid #d92d20;
  background: #d92d20;
  color: #fff;
}
.batch-btn.danger:hover {
  background: #b42318;
}
</style>



