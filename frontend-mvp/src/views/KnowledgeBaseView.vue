<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getActivePinia } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useRoute } from 'vue-router'
import { Bot, FileText, FolderPlus, PanelLeftOpen, Plus, Search, Upload, X } from 'lucide-vue-next'
import KnowledgeDialogs from '@/components/knowledge/source-clone/KnowledgeDialogs.vue'
import KnowledgeQaPanel from '@/components/knowledge/source-clone/KnowledgeQaPanel.vue'
import KnowledgeSidebar from '@/components/knowledge/source-clone/KnowledgeSidebar.vue'
import KnowledgeTable from '@/components/knowledge/source-clone/KnowledgeTable.vue'
import KnowledgeDownloadAction from '@/components/knowledge/source-clone/KnowledgeDownloadAction.vue'
import KnowledgeAccessPanel from '@/components/knowledge/source-clone/KnowledgeAccessPanel.vue'
import DingTalkDocumentImport from '@/components/knowledge/source-clone/DingTalkDocumentImport.vue'
import { boundDingTalkIdentity, getPrototypeScenario, personalDingTalkDocuments, prototypeCanWriteKnowledge, type ImportableDocument } from '@/components/knowledge/source-clone/dingtalkPrototype'
import { dingTalkImportTaskFixtures, scopedDingTalkImportTasks } from '@/mock/dingtalk-import-tasks'
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

const items = ref<SourceKnowledgeBase[]>(JSON.parse(JSON.stringify(sourceKnowledgeBases)) as SourceKnowledgeBase[])
const route = useRoute()
const roleValues: KnowledgeRole[] = ['OWNER', 'MANAGER', 'EDITOR', 'DOWNLOADER', 'READER']
const prototypeRole = computed<KnowledgeRole>(() => roleValues.includes(route?.query.permissionRole as KnowledgeRole) ? route.query.permissionRole as KnowledgeRole : appStore?.user?.role === 'admin' ? 'OWNER' : 'DOWNLOADER')
const systemKnowledgeAdmin = computed(() => !route?.query.permissionRole && appStore?.user?.role === 'admin')
const appStore = getActivePinia() ? useAppStore() : null
const localDepartmentMembers = computed<Record<string, readonly string[]>>(() => {
  const user = appStore?.user
  return user?.department ? { [user.department]: [user.displayName] } : {}
})
const scenario = getPrototypeScenario()
const createMenuOpen = ref(route?.query.menu === 'open')
const createMenuRoot = ref<HTMLElement | null>(null)
const createMenuButton = ref<HTMLButtonElement | null>(null)
function closeCreateMenu(restoreFocus = false) {
  createMenuOpen.value = false
  if (restoreFocus) nextTick(() => createMenuButton.value?.focus())
}
function closeMenuOutside(event: MouseEvent) {
  if (event.target instanceof Node && !createMenuRoot.value?.contains(event.target)) closeCreateMenu()
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
onMounted(() => document.addEventListener('click', closeMenuOutside))
onBeforeUnmount(() => document.removeEventListener('click', closeMenuOutside))
const personalImportOpen = ref(route?.query.import === 'dingtalk' || ['personal-import', 'personal-partial', 'identity-unbound', 'identity-expired', 'export-unavailable', 'no-write-target'].includes(scenario))
const canImportDingTalk = computed(() => Boolean(appStore?.user))
const demoIdentityAuthorized = ref(false)
watch(() => appStore?.user?.id, () => { demoIdentityAuthorized.value = false })
const dingTalkIdentity = computed(() => boundDingTalkIdentity(appStore?.user, demoIdentityAuthorized.value ? 'normal' : scenario))
const importTasks = ref<DingTalkImportTask[]>(structuredClone(dingTalkImportTaskFixtures))
const visibleImportTasks = computed(() => scopedDingTalkImportTasks(importTasks.value, appStore?.user?.id, appStore?.user?.role))
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
  return Object.fromEntries(writableDestinations.value.map(item => [item.id, byKnowledgeBase[item.parentId ?? item.id] ?? []]))
})
watch(canImportDingTalk, allowed => { if (!allowed) personalImportOpen.value = false })
const canManageKnowledgeAccess = computed(() => appStore?.user?.role === 'admin')
const activeSpace = ref<KnowledgeSpace>('public')
const sidebarOpen = ref(false)
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
  items.value = JSON.parse(JSON.stringify(sourceKnowledgeBases)) as SourceKnowledgeBase[]
  selected.value = null
  nodePath.value = []
  previewNode.value = null
  personalImportOpen.value = false
  recordsOpen.value = false
  closeCreateMenu()
  dialog.value = null
  dialogTarget.value = null
  query.value = ''
  importTasks.value = structuredClone(dingTalkImportTaskFixtures)
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
function openDialog(
  kind: Exclude<KnowledgeDialogKind, null>,
  target: SourceKnowledgeBase | SourceKnowledgeNode | null = null,
) {
  closeCreateMenu()
  dialogTarget.value = target
  dialog.value = kind
}

function closeDialog() {
  dialog.value = null
  dialogTarget.value = null
}

function openKnowledgeAccess() {
  if (!canManageKnowledgeAccess.value) return
  accessOpen.value = true
  recordsOpen.value = false
  qaOpen.value = false
  previewNode.value = null
  if (window.matchMedia?.('(max-width: 640px)').matches) sidebarOpen.value = false
}

function openSyncRecords() {
  if (!appStore?.user) return
  accessOpen.value = false
  recordsOpen.value = true
  qaOpen.value = false
  previewNode.value = null
  closeCreateMenu()
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
  personalImportOpen.value = true
  qaOpen.value = false
  previewNode.value = null
}
function completeDingTalkImport(payload: { destinationId: string; documents: ImportableDocument[]; platformUserId: string; frequency?: DingTalkSyncFrequency; schedule?: string }) {
  if (!appStore?.user || payload.platformUserId !== appStore.user.id) return
  const destination = writableDestinations.value.find(item => item.id === payload.destinationId)
  if (!destination || !payload.documents.length) return
  if (payload.documents.some(document => importedSourceIds.value[destination.id]?.includes(document.id))) return
  const currentDocuments = personalDingTalkDocuments(dingTalkIdentity.value, scenario)
  const nodes = findUploadDestination(destination.id)
  if (!nodes) return
  const existingNames = new Set(nodes.map(node => node.name))
  const now = Date.now()
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
  importTasks.value.unshift({ importTaskId, platformUserId: appStore.user.id, userAlias: appStore.user.displayName,
    destinationId: destination.id, destinationPath: destination.path ?? destination.name,
    frequency: payload.frequency ?? '不自动同步', schedule: payload.schedule ?? '—', latestSyncAt: '刚刚',
    status: successfulCount === mappings.length ? '同步成功' : successfulCount ? '部分失败' : '同步失败', documentMappings: mappings })
}
function sourceDocumentPath(document: ImportableDocument) {
  const paths: Record<string, string> = { onboarding: '集团制度知识库 / 人事制度', attendance: '集团制度知识库 / 人事制度', expense: '集团制度知识库', catalog: '商品运营知识库', launch: '商品运营知识库' }
  return (paths[document.id] ?? '钉钉文档') + ' / ' + document.name
}
function updateImportTaskSchedule(importTaskId: string, frequency: DingTalkSyncFrequency, schedule: string) {
  const task = visibleImportTasks.value.find(item => item.importTaskId === importTaskId)
  if (task) { task.frequency = frequency; task.schedule = schedule }
}
function openUploadDialog() {
  if (!mayWriteCurrent.value) return
  openDialog('upload', nodePath.value.at(-1) ?? selected.value)
}

function selectItem(item: SourceKnowledgeBase | string) {
  accessOpen.value = false
  recordsOpen.value = false
  const next = typeof item === 'string' ? items.value.find((entry) => entry.id === item) : item
  selected.value = next ?? null
  nodePath.value = []
  previewNode.value = null
  if (window.matchMedia?.('(max-width: 640px)').matches) sidebarOpen.value = false
}

function handleAction(payload: {
  kind: 'preview' | 'rename' | 'permission' | 'delete'
  target: SourceKnowledgeBase | SourceKnowledgeNode
}) {
  if (!canResourceAction(payload.kind, payload.target)) return
  if (payload.kind === 'preview' && 'kind' in payload.target) {
    previewNode.value = payload.target
    qaOpen.value = false
    return
  }
  openDialog(payload.kind as 'rename' | 'permission' | 'delete', payload.target)
}
function canResourceAction(action: string, target: SourceKnowledgeBase | SourceKnowledgeNode) {
  const publicResource = ('space' in target ? target.space : selected.value?.space ?? activeSpace.value) === 'public'
  if (systemKnowledgeAdmin.value && publicResource) return true
  const role = effectiveResourceRole(target)
  if (!role) return false
  if (action === 'preview') return true
  if (action === 'delete') {
    return canDeleteKnowledge(role, 'space' in target || target.permission?.inheritParent === false)
  }
  return canConfigureKnowledge(role)
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
}

function switchSpace(space: KnowledgeSpace) {
  accessOpen.value = false
  recordsOpen.value = false
  activeSpace.value = space
  selected.value = null
  nodePath.value = []
  previewNode.value = null
}

function goRoot() {
  accessOpen.value = false
  recordsOpen.value = false
  selected.value = null
  nodePath.value = []
  previewNode.value = null
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
    if ('space' in dialogTarget.value) {
      items.value = items.value.filter((item) => item.id !== dialogTarget.value?.id)
      if (selected.value?.id === dialogTarget.value.id) goRoot()
    } else if (selected.value) {
      removeNode(selected.value.nodes ?? [], dialogTarget.value.id)
      nodePath.value = nodePath.value.filter((node) => node.id !== dialogTarget.value?.id)
      if (previewNode.value?.id === dialogTarget.value.id) previewNode.value = null
    }
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
      <KnowledgeSidebar
        :open="sidebarOpen"
        :items="items"
        :selected-id="selectedTreeId"
        :access-active="accessOpen"
        :records-active="recordsOpen"
        :can-manage-access="canManageKnowledgeAccess"
        :can-view-records="Boolean(appStore?.user)"
        @access="openKnowledgeAccess"
        @sync-records="openSyncRecords"
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
              @click="sidebarOpen = true"
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
            <strong v-if="accessOpen" class="page-label">数据源</strong>
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
            <div ref="createMenuRoot" class="create-menu" @keydown="createMenuKeydown">
              <button ref="createMenuButton" type="button" class="source-button primary create-trigger" aria-label="新建" aria-haspopup="menu" :aria-expanded="createMenuOpen" aria-controls="knowledge-create-options" @click="createMenuOpen = !createMenuOpen"><Plus :size="17"/>新建</button>
              <div v-if="createMenuOpen" id="knowledge-create-options" class="create-options" role="menu" aria-label="新建菜单">
                <button v-if="!selected" type="button" role="menuitem" aria-label="新建知识库" @click="openDialog('create')"><Plus :size="17"/><span>新建知识库</span></button>
                <button v-if="!nodePath.length" type="button" role="menuitem" aria-label="新建文件夹" :disabled="!canCreateFolderHere" @click="openFolderDialog"><FolderPlus :size="17"/><span>新建文件夹</span></button>
                <button type="button" role="menuitem" aria-label="上传文件" :disabled="!mayWriteCurrent" @click="openUploadDialog"><Upload :size="17"/><span>上传文件</span></button>
                <div class="create-divider" role="separator"/>
                <button type="button" role="menuitem" aria-label="从钉钉导入" :disabled="!canImportDingTalk || !mayWriteCurrent" @click="openDingTalkImport"><span class="dingtalk-menu-icon" aria-hidden="true">钉</span><span>从钉钉导入</span></button>
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

        <KnowledgeAccessPanel v-if="(accessOpen && canManageKnowledgeAccess) || recordsOpen" :can-manage="accessOpen && canManageKnowledgeAccess" :viewer-user-id="appStore?.user?.id" :destinations="writableDestinations" :records="visibleImportTasks" @update-schedule="updateImportTaskSchedule" />
        <KnowledgeTable v-else
          :items="visibleItems"
          :detail="selected"
          :nodes="currentNodes"
          :can-action="canResourceAction"
          @select="selectItem"
          @navigate-node="navigateNode"
          @action="handleAction"
        />
      </section>

      <KnowledgeQaPanel v-if="qaOpen && canRetrieveCurrentKnowledge" @close="qaOpen = false" />

      <aside v-if="previewNode" class="knowledge-preview" data-testid="knowledge-file-preview" aria-label="文件预览">
        <header>
          <span class="preview-file-icon"><FileText :size="18" /></span>
          <div><strong>{{ previewNode.name }}</strong><small>{{ previewNode.format }} · {{ previewNode.size }}</small></div>
          <button type="button" aria-label="关闭文件预览" title="关闭" @click="previewNode = null"><X :size="18" /></button>
        </header>
        <div class="preview-actions"><KnowledgeDownloadAction :role="currentResourceRole" :download-url="previewNode.downloadUrl" :file-name="previewNode.name" /></div>
        <div class="preview-paper">
          <small>{{ selected?.name }}</small>
          <h2>{{ previewNode.name.replace(/\.[^.]+$/, '') }}</h2>
          <p>这是由本地 mock 数据生成的文件预览，用于完整演示知识库、文件夹和文件之间的导航关系。</p>
          <section>
            <h3>文件信息</h3>
            <dl><dt>创建者</dt><dd>{{ previewNode.owner }}</dd><dt>更新时间</dt><dd>{{ previewNode.updatedAt }}</dd><dt>文件大小</dt><dd>{{ previewNode.size }}</dd></dl>
          </section>
        </div>
      </aside>
    </div>

    <DingTalkDocumentImport v-if="personalImportOpen && canImportDingTalk" :key="dingTalkIdentity.platformUserId" :identity="dingTalkIdentity" :space="activeSpace" :destinations="writableDestinations" :existing-source-ids="importedSourceIds" :default-destination-id="currentDestinationId" :application-available="!['credentials-expired', 'permission-denied', 'unknown', 'disconnected'].includes(scenario)" @close="personalImportOpen = false" @authorize="authorizeCurrentDingTalkIdentity" @complete="completeDingTalkImport" @failed="completeDingTalkImport" />
    <KnowledgeDialogs
      :kind="dialog"
      :target="dialogTarget"
      :destinations="uploadDestinations"
      :actor-role="dialogActorRole"
      :system-admin="systemKnowledgeAdmin && activeSpace === 'public'"
      @close="closeDialog"
      @create="createKnowledge"
      @folder="createFolder"
      @upload="uploadFiles"
      @rename="renameKnowledge"
      @permission="savePermission"
      @confirm-delete="deleteKnowledge"
    />
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
  gap: 12px;
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
.create-menu{position:relative}.create-menu .create-trigger{border-radius:18px;padding:0 17px}.create-options{position:absolute;z-index:30;top:calc(100% + 8px);right:0;width:204px;border:1px solid #e2e4e8;border-radius:12px;background:#fff;padding:7px;box-shadow:0 10px 28px rgba(0,0,0,.12)}.create-options button{display:flex;width:100%;min-height:40px;align-items:center;gap:11px;border:0;border-radius:7px;background:#fff;padding:9px 12px;color:#30343a;font-size:13px;text-align:left;cursor:pointer}.create-options button:hover,.create-options button:focus-visible{background:#f5f6f8}.create-options button:disabled{opacity:.45;cursor:not-allowed}.create-options button>svg{color:#707b89}.create-divider{height:1px;margin:5px 5px;background:#eceef1}.dingtalk-menu-icon{display:grid;width:18px;height:18px;flex:none;place-items:center;border-radius:4px;background:#e9f3ff;color:#1677ff;font-size:11px;font-weight:700}
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
@media (max-width: 640px) {
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
</style>



