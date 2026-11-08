<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  LockKeyhole,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-vue-next'
import type {
  KnowledgeSpace,
  SourceKnowledgeBase,
  SourceKnowledgeNavigation,
  SourceKnowledgeNode,
} from '@/types/knowledge-source'

type KnowledgeTarget = SourceKnowledgeBase | SourceKnowledgeNode
type SidebarNodeAction = 'folder' | 'document' | 'upload' | 'import' | 'preview' | 'edit-document' | 'rename' | 'permission' | 'delete'
const actionLabels: Record<SidebarNodeAction, string> = {
  folder: '新建文件夹',
  document: '新建文档',
  upload: '上传文件',
  import: '从钉钉导入',
  preview: '预览',
  'edit-document': '编辑文档',
  rename: '重命名',
  permission: '权限管理',
  delete: '删除',
}
const knowledgeBaseActions: SidebarNodeAction[] = ['rename', 'folder', 'upload', 'import', 'permission', 'delete']
const folderActions: SidebarNodeAction[] = ['rename', 'upload', 'import', 'permission', 'delete']
const fileActions: SidebarNodeAction[] = ['preview', 'permission', 'delete']

const props = defineProps<{
  open: boolean
  items: SourceKnowledgeBase[]
  space?: KnowledgeSpace
  selectedId?: string
  lockedIds?: Set<string>
  canQuickUpload?: boolean
  canCreateFolder?: boolean
  canCreateDocument?: boolean
  canImportDingTalk?: boolean
  searchRequested?: number
  canNodeAction?: (action: SidebarNodeAction, target: KnowledgeTarget, kbId: string) => boolean
}>()

const emit = defineEmits<{
  close: []
  create: []
  select: [id: string]
  navigate: [payload: SourceKnowledgeNavigation]
  'space-change': [space: KnowledgeSpace]
  'node-action': [payload: { kind: SidebarNodeAction; target: KnowledgeTarget; kbId: string }]
  'quick-upload': []
  'create-folder': []
  'create-document': []
  import: []
}>()

const activeSpace = ref<KnowledgeSpace>(props.space ?? 'public')
watch(() => props.space, space => { if (space) activeSpace.value = space })
const expandedIds = ref(new Set<string>())
const searchOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const searchButton = ref<HTMLButtonElement | null>(null)
const entryMenu = ref<'new' | 'upload' | null>(null)
const entryMenuRoot = ref<HTMLElement | null>(null)
const entryMenuTrigger = ref<HTMLButtonElement | null>(null)
const openMenuId = ref<string | null>(null)
const menuStyle = ref<Record<string, string>>({})
const menuTrigger = ref<HTMLButtonElement | null>(null)
const bookIcon = `${import.meta.env.BASE_URL}assets/knowledge-source/book.svg`

interface SidebarTreeRow {
  id: string
  kbId: string
  name: string
  kind: 'kb' | 'folder' | 'file'
  level: number
  count?: number
  hasChildren: boolean
  target: KnowledgeTarget
  sourceDocumentId?: string
}

const visibleItems = computed(() => {
  return props.items.filter((item) => item.space === activeSpace.value)
})

const searchTerm = computed(() => searchQuery.value.trim().toLocaleLowerCase())
const matchingTreeIds = computed(() => {
  const matching = new Set<string>()
  if (!searchTerm.value) return matching
  const visit = (node: SourceKnowledgeNode): boolean => {
    let includesMatch = node.name.toLocaleLowerCase().includes(searchTerm.value)
    for (const child of node.children ?? []) {
      if (visit(child)) includesMatch = true
    }
    if (includesMatch) matching.add(node.id)
    return includesMatch
  }
  for (const item of visibleItems.value) {
    let includesMatch = item.name.toLocaleLowerCase().includes(searchTerm.value)
    for (const node of item.nodes ?? []) {
      if (visit(node)) includesMatch = true
    }
    if (includesMatch) matching.add(item.id)
  }
  return matching
})
const isTreeMatch = (id: string) => !searchTerm.value || matchingTreeIds.value.has(id)

function openSearch() {
  closeEntryMenu()
  closeMenu()
  searchOpen.value = true
  nextTick(() => searchInput.value?.focus())
}

function closeSearch() {
  searchQuery.value = ''
  searchOpen.value = false
  nextTick(() => searchButton.value?.focus())
}

function clearSearch() {
  searchQuery.value = ''
  nextTick(() => searchInput.value?.focus())
}

watch(() => props.searchRequested, (requested, previous) => {
  if (requested !== undefined && requested > (previous ?? 0)) openSearch()
})

function appendNodes(rows: SidebarTreeRow[], kbId: string, nodes: SourceKnowledgeNode[], level: number) {
  for (const node of nodes) {
    if (!isTreeMatch(node.id)) continue
    const hasChildren = node.kind === 'folder' && Boolean(node.children?.some(child => isTreeMatch(child.id)))
    rows.push({ id: node.id, kbId, name: node.name, kind: node.kind, level, hasChildren, target: node, sourceDocumentId: node.sourceDocumentId })
    if (hasChildren && (searchTerm.value || expandedIds.value.has(node.id))) {
      appendNodes(rows, kbId, node.children ?? [], level + 1)
    }
  }
}

const treeRows = computed<SidebarTreeRow[]>(() => {
  const rows: SidebarTreeRow[] = []
  for (const item of visibleItems.value) {
    if (!isTreeMatch(item.id)) continue
    const hasChildren = Boolean(item.nodes?.some(node => isTreeMatch(node.id)))
    rows.push({
      id: item.id,
      kbId: item.id,
      name: item.name,
      kind: 'kb',
      level: 0,
      count: item.count,
      hasChildren,
      target: item,
    })
    if (hasChildren && (searchTerm.value || expandedIds.value.has(item.id))) {
      appendNodes(rows, item.id, item.nodes ?? [], 1)
    }
  }
  return rows
})

const openMenuRow = computed(() => treeRows.value.find(row => row.id === openMenuId.value) ?? null)

function closeEntryMenu(restoreFocus = false) {
  entryMenu.value = null
  if (restoreFocus) entryMenuTrigger.value?.focus()
  entryMenuTrigger.value = null
}

function toggleEntryMenu(kind: 'new' | 'upload', event: MouseEvent) {
  closeMenu()
  if (entryMenu.value === kind) { closeEntryMenu(); return }
  entryMenuTrigger.value = event.currentTarget as HTMLButtonElement
  entryMenu.value = kind
  nextTick(() => entryMenuRoot.value?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus())
}

function chooseEntryAction(action: 'create' | 'create-folder' | 'create-document' | 'quick-upload' | 'import') {
  if (action === 'create-folder' && !props.canCreateFolder) return
  if (action === 'create-document' && !props.canCreateDocument) return
  if (action === 'quick-upload' && !props.canQuickUpload) return
  if (action === 'import' && !props.canImportDingTalk) return
  closeEntryMenu()
  if (action === 'create') emit('create')
  else if (action === 'create-folder') emit('create-folder')
  else if (action === 'create-document') emit('create-document')
  else if (action === 'quick-upload') emit('quick-upload')
  else emit('import')
}

function onEntryMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    closeEntryMenu(true)
    return
  }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  const buttons = [...(entryMenuRoot.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])]
  if (!buttons.length) return
  event.preventDefault()
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const index = event.key === 'Home' ? 0
    : event.key === 'End' ? buttons.length - 1
      : event.key === 'ArrowDown' ? (current + 1) % buttons.length
        : (current + buttons.length - 1) % buttons.length
  buttons[index]?.focus()
}

function availableActions(row: SidebarTreeRow): SidebarNodeAction[] {
  const actions: SidebarNodeAction[] = row.kind === 'kb'
    ? knowledgeBaseActions
    : row.kind === 'folder'
      ? folderActions
      : fileActions
  return actions.filter(action => props.canNodeAction?.(action, row.target, row.kbId) === true)
}

function closeMenu(restoreFocus = false) {
  openMenuId.value = null
  if (restoreFocus) menuTrigger.value?.focus()
  menuTrigger.value = null
}

function toggleMenu(event: MouseEvent, row: SidebarTreeRow) {
  event.stopPropagation()
  closeEntryMenu()
  if (openMenuId.value === row.id) {
    closeMenu()
    return
  }
  if (!availableActions(row).length) return
  const trigger = event.currentTarget as HTMLButtonElement
  const rect = trigger.getBoundingClientRect()
  const menuHeight = availableActions(row).length * 34 + 12
  const top = rect.bottom + menuHeight + 8 > window.innerHeight
    ? Math.max(8, rect.top - menuHeight - 4)
    : rect.bottom + 4
  menuStyle.value = {
    top: `${top}px`,
    left: `${Math.max(8, Math.min(rect.right - 160, window.innerWidth - 168))}px`,
  }
  menuTrigger.value = trigger
  openMenuId.value = row.id
  nextTick(() => document.querySelector<HTMLButtonElement>('#knowledge-sidebar-node-menu [role="menuitem"]')?.focus())
}

function chooseAction(action: SidebarNodeAction, row: SidebarTreeRow) {
  if (!availableActions(row).includes(action)) return
  closeMenu()
  emit('node-action', { kind: action, target: row.target, kbId: row.kbId })
}

function onMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMenu(true)
    return
  }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  const menu = document.getElementById('knowledge-sidebar-node-menu')
  const buttons = [...(menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])]
  if (!buttons.length) return
  event.preventDefault()
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const index = event.key === 'Home' ? 0
    : event.key === 'End' ? buttons.length - 1
      : event.key === 'ArrowDown' ? (current + 1) % buttons.length
        : (current + buttons.length - 1) % buttons.length
  buttons[index]?.focus()
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (openMenuId.value) closeMenu(true)
  else if (entryMenu.value) closeEntryMenu(true)
  else if (searchOpen.value) closeSearch()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
  window.addEventListener('resize', onViewportChange)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
  window.removeEventListener('resize', onViewportChange)
})

function onDocumentClick(event: MouseEvent) {
  const target = event.target as Element
  if (openMenuId.value && !target.closest('#knowledge-sidebar-node-menu') && !target.closest('.knowledge-sidebar__more')) closeMenu()
  if (entryMenu.value && !entryMenuRoot.value?.contains(target)) closeEntryMenu()
}
function onViewportChange() { closeMenu(); closeEntryMenu() }
watch(() => props.open, open => {
  if (!open) { closeMenu(); closeEntryMenu() }
  else if (searchOpen.value) nextTick(() => searchInput.value?.focus())
})
watch(activeSpace, () => { closeMenu(); closeEntryMenu() })

function setSpace(space: KnowledgeSpace) {
  activeSpace.value = space
  emit('space-change', space)
}

function toggleExpanded(id: string) {
  const next = new Set(expandedIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expandedIds.value = next
}

function navigate(row: SidebarTreeRow) {
  closeMenu()
  closeEntryMenu()
  const payload: SourceKnowledgeNavigation = row.kind === 'kb'
    ? { kbId: row.kbId, kind: 'kb' }
    : { kbId: row.kbId, nodeId: row.id, kind: row.kind }
  emit('navigate', payload)
  if (row.kind === 'kb') emit('select', row.kbId)
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches) {
    emit('close')
  }
}
</script>

<template>
  <aside
    data-testid="knowledge-sidebar"
    class="knowledge-sidebar"
    :class="{ 'knowledge-sidebar--open': open }"
    aria-label="知识库侧栏"
  >
    <div class="knowledge-sidebar__tools">
      <button ref="searchButton" class="icon-button" type="button" aria-label="搜索" aria-controls="knowledge-sidebar-search" :aria-expanded="searchOpen" @click="openSearch">
        <Search :size="18" :stroke-width="1.8" />
      </button>
      <button class="icon-button" type="button" aria-label="折叠侧栏" @click="emit('close')">
        <PanelLeftClose :size="18" :stroke-width="1.8" />
      </button>
    </div>

    <div v-if="searchOpen" id="knowledge-sidebar-search" class="knowledge-sidebar__search">
      <input ref="searchInput" v-model="searchQuery" type="search" aria-label="搜索知识树" placeholder="搜索名称" autocomplete="off" @keydown.esc.stop.prevent="closeSearch" />
      <button v-if="searchQuery" type="button" aria-label="清空搜索" @click="clearSearch"><X :size="14" /></button>
    </div>

    <div v-if="open" ref="entryMenuRoot" class="knowledge-sidebar__primary-actions">
      <div class="knowledge-sidebar__action-wrap">
        <button class="knowledge-sidebar__primary-action is-new" type="button" aria-label="新建" aria-haspopup="menu" :aria-expanded="entryMenu === 'new'" aria-controls="knowledge-sidebar-new-menu" @click="toggleEntryMenu('new', $event)">
          <Plus :size="17" :stroke-width="2" /><span>新建</span><ChevronDown :size="15" />
        </button>
      </div>
      <div class="knowledge-sidebar__action-wrap">
        <button class="knowledge-sidebar__primary-action is-upload" type="button" aria-label="上传" aria-haspopup="menu" :aria-expanded="entryMenu === 'upload'" aria-controls="knowledge-sidebar-upload-menu" @click="toggleEntryMenu('upload', $event)">
          <Upload :size="17" :stroke-width="1.8" /><span>上传</span><ChevronDown :size="15" />
        </button>
      </div>
      <div v-if="entryMenu === 'new'" id="knowledge-sidebar-new-menu" class="knowledge-sidebar__action-menu" role="menu" aria-label="新建菜单" @keydown="onEntryMenuKeydown">
        <button type="button" role="menuitem" aria-label="新建知识库" @click="chooseEntryAction('create')">新建知识库</button>
        <button type="button" role="menuitem" aria-label="新建文件夹" :disabled="!canCreateFolder" @click="chooseEntryAction('create-folder')">新建文件夹</button>
      </div>
      <div v-if="entryMenu === 'upload'" id="knowledge-sidebar-upload-menu" class="knowledge-sidebar__action-menu" role="menu" aria-label="上传菜单" @keydown="onEntryMenuKeydown">
        <button type="button" role="menuitem" aria-label="上传文件" :disabled="!canQuickUpload" @click="chooseEntryAction('quick-upload')">上传文件</button>
        <button type="button" role="menuitem" aria-label="从钉钉导入" :disabled="!canImportDingTalk" @click="chooseEntryAction('import')">从钉钉导入</button>
      </div>
    </div>

    <div class="knowledge-sidebar__spaces" role="tablist" aria-label="知识库空间">
      <button
        class="knowledge-sidebar__space"
        :class="{ 'knowledge-sidebar__space--active': activeSpace === 'public' }"
        type="button"
        role="tab"
        aria-label="公共空间"
        :aria-selected="activeSpace === 'public'"
        @click="setSpace('public')"
      >
        公共空间
      </button>
      <button
        class="knowledge-sidebar__space"
        :class="{ 'knowledge-sidebar__space--active': activeSpace === 'personal' }"
        type="button"
        role="tab"
        aria-label="个人空间"
        :aria-selected="activeSpace === 'personal'"
        @click="setSpace('personal')"
      >
        个人空间
      </button>
    </div>

    <div class="knowledge-sidebar__tree" role="tree" @scroll.passive="closeMenu()">
      <div
        v-for="row in treeRows"
        :key="row.id"
        class="knowledge-sidebar__row"
        :class="{ 'knowledge-sidebar__row--selected': selectedId === row.id }"
        :style="{ paddingLeft: `${row.level * 18}px` }"
        role="treeitem"
        :aria-level="row.level + 1"
        :aria-selected="selectedId === row.id"
        :aria-expanded="row.hasChildren ? expandedIds.has(row.id) : undefined"
        :data-node-id="row.id"
      >
        <button
          v-if="row.hasChildren"
          class="knowledge-sidebar__chevron"
          type="button"
          :aria-label="`${expandedIds.has(row.id) ? '收起' : '展开'}${row.name}`"
          @click.stop="toggleExpanded(row.id)"
        >
          <ChevronDown v-if="expandedIds.has(row.id)" :size="14" />
          <ChevronRight v-else :size="14" />
        </button>
        <span v-else class="knowledge-sidebar__chevron-placeholder" aria-hidden="true" />

        <button class="knowledge-sidebar__item" type="button" @click="navigate(row)">
          <img v-if="row.kind === 'kb'" class="knowledge-sidebar__book" :src="bookIcon" alt="" />
          <Folder v-else-if="row.kind === 'folder'" class="knowledge-sidebar__folder" :size="16" :stroke-width="1.7" />
          <FileText v-else class="knowledge-sidebar__file" :size="16" :stroke-width="1.7" />
          <span class="knowledge-sidebar__name" :title="row.name">{{ row.name }}</span>
          <span v-if="row.kind === 'file' && row.sourceDocumentId" class="knowledge-sidebar__sync-mark">同步</span>
          <LockKeyhole v-if="lockedIds?.has(row.id)" class="knowledge-sidebar__lock" :size="13" aria-label="已单独设置权限" />
          <span v-if="row.count !== undefined" class="knowledge-sidebar__count">{{ row.count }}</span>
        </button>
        <button
          v-if="availableActions(row).length"
          class="knowledge-sidebar__more"
          type="button"
          :aria-label="`${row.name}更多操作`"
          aria-haspopup="menu"
          :aria-expanded="openMenuId === row.id"
          aria-controls="knowledge-sidebar-node-menu"
          @click.stop="toggleMenu($event, row)"
        >
          <MoreHorizontal :size="16" :stroke-width="1.8" />
        </button>
      </div>

      <div v-if="treeRows.length === 0" class="knowledge-sidebar__empty">
        {{ searchTerm ? '无匹配结果' : activeSpace === 'personal' ? '暂无个人知识库' : '暂无公共知识库' }}
      </div>
    </div>
    <Teleport to="body">
      <div
        v-if="openMenuRow"
        id="knowledge-sidebar-node-menu"
        class="knowledge-sidebar__menu"
        role="menu"
        :aria-label="`${openMenuRow.name}操作`"
        :style="menuStyle"
        @keydown="onMenuKeydown"
      >
        <template v-for="action in availableActions(openMenuRow)" :key="action">
          <div v-if="action === 'delete'" class="knowledge-sidebar__menu-divider" role="separator" />
          <button
            type="button"
            role="menuitem"
            :aria-label="actionLabels[action]"
            :class="{ 'knowledge-sidebar__menu-delete': action === 'delete' }"
            @click.stop="chooseAction(action, openMenuRow)"
          >{{ actionLabels[action] }}</button>
        </template>
      </div>
    </Teleport>
  </aside>
</template>

<style scoped>
.knowledge-sidebar {
  box-sizing: border-box;
  display: flex;
  width: 0;
  height: 100%;
  min-height: 0;
  flex: 0 0 auto;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  opacity: 0;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
}

.knowledge-sidebar--open {
  width: 280px;
  opacity: 1;
}

.knowledge-sidebar__tools {
  display: flex;
  height: 44px;
  flex: 0 0 44px;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px 0;
}

.knowledge-sidebar__search {
  display: flex;
  height: 32px;
  min-height: 32px;
  align-items: center;
  margin: 2px 12px 7px;
  padding: 0 7px 0 10px;
  border: 1px solid #e2e5eb;
  border-radius: 8px;
  background: #fff;
}

.knowledge-sidebar__search:focus-within {
  border-color: #8eb2f2;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.knowledge-sidebar__search input {
  width: 100%;
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  color: #333;
  background: transparent;
  font: 13px/20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.knowledge-sidebar__search input::-webkit-search-cancel-button { display: none; }
.knowledge-sidebar__search input::placeholder { color: #999; }

.knowledge-sidebar__search button {
  display: inline-flex;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 5px;
  color: #888;
  background: transparent;
  cursor: pointer;
}

.knowledge-sidebar__search button:hover { color: #333; background: #f3f4f6; }
.knowledge-sidebar__search button:focus-visible { outline: 2px solid #2563eb; outline-offset: 1px; }

.icon-button,
.knowledge-sidebar__chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  color: #666;
  background: transparent;
  cursor: pointer;
}

.icon-button {
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.icon-button:hover,
.knowledge-sidebar__chevron:hover {
  color: #111;
  background: #f7f7f9;
}

.knowledge-sidebar__primary-actions {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 8px;
  margin: 0 12px;
}

.knowledge-sidebar__action-wrap { min-width: 0; }

.knowledge-sidebar__primary-action {
  display: flex;
  width: 100%;
  height: 36px;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid #111;
  border-radius: 8px;
  color: #fff;
  background: #111;
  font: 500 14px/22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.knowledge-sidebar__primary-action svg:last-child { margin-left: auto; }
.knowledge-sidebar__primary-action svg:first-child { margin-left: auto; }
.knowledge-sidebar__primary-action.is-upload { color: #333; border-color: #e4e4e8; background: #fff; }
.knowledge-sidebar__primary-action:hover,
.knowledge-sidebar__primary-action[aria-expanded="true"] { background: #2b2b2b; }
.knowledge-sidebar__primary-action.is-upload:hover,
.knowledge-sidebar__primary-action.is-upload[aria-expanded="true"] { border-color: #c9d7ed; background: #f5f8ff; }
.knowledge-sidebar__primary-action:focus-visible,
.knowledge-sidebar__action-menu button:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }

.knowledge-sidebar__action-menu {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-height: min(170px, 35dvh);
  overflow-y: auto;
  padding: 5px;
  border: 1px solid #e7e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
}

.knowledge-sidebar__action-menu button {
  display: block;
  width: 100%;
  min-height: 34px;
  padding: 6px 10px;
  border: 0;
  border-radius: 5px;
  color: #333;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-size: 13px;
}

.knowledge-sidebar__action-menu button:hover,
.knowledge-sidebar__action-menu button:focus-visible { background: #f7f7f9; }
.knowledge-sidebar__action-menu button:disabled { color: #aaa; cursor: not-allowed; background: transparent; }

.knowledge-sidebar__spaces {
  display: grid;
  height: 36px;
  min-height: 36px;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  margin: 16px 12px 0;
  padding: 3px;
  border-radius: 8px;
  background: #f7f7f9;
}

.knowledge-sidebar__space {
  border: 0;
  border-radius: 6px;
  color: #666;
  background: transparent;
  font: 400 14px/24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  cursor: pointer;
}

.knowledge-sidebar__space--active {
  color: #111;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  font-weight: 500;
}

.knowledge-sidebar__tree {
  min-height: 0;
  flex: 1;
  margin-top: 12px;
  padding: 0 8px 16px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
}

.knowledge-sidebar__tree::-webkit-scrollbar {
  display: none;
}

.knowledge-sidebar__branch {
  width: 100%;
}

.knowledge-sidebar__row {
  display: flex;
  height: 36px;
  align-items: center;
  border-radius: 8px;
  color: #333;
  transition: background-color 0.15s ease;
}

.knowledge-sidebar__row:hover,
.knowledge-sidebar__row--selected {
  background: #f7f7f9;
}

.knowledge-sidebar__more {
  display: inline-flex;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
  border: 0;
  border-radius: 6px;
  color: #666;
  background: transparent;
  cursor: pointer;
  opacity: 0;
}

.knowledge-sidebar__row:hover .knowledge-sidebar__more,
.knowledge-sidebar__row:focus-within .knowledge-sidebar__more,
.knowledge-sidebar__more[aria-expanded="true"] {
  opacity: 1;
}

.knowledge-sidebar__more:hover,
.knowledge-sidebar__more:focus-visible {
  color: #111;
  background: #e8e8eb;
}

.knowledge-sidebar__more:focus-visible,
.knowledge-sidebar__menu button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.knowledge-sidebar__menu {
  position: fixed;
  z-index: 500;
  width: 160px;
  padding: 6px;
  border: 1px solid #e7e7eb;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.14);
}

.knowledge-sidebar__menu button {
  display: block;
  width: 100%;
  min-height: 34px;
  padding: 6px 10px;
  border: 0;
  border-radius: 6px;
  color: #333;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-size: 13px;
}

.knowledge-sidebar__menu button:hover,
.knowledge-sidebar__menu button:focus-visible {
  background: #f7f7f9;
}

.knowledge-sidebar__menu-divider {
  height: 1px;
  margin: 5px 2px;
  background: #ededf0;
}

.knowledge-sidebar__menu .knowledge-sidebar__menu-delete {
  color: #cf3540;
}

.knowledge-sidebar__row--selected {
  color: #111;
  font-weight: 500;
}

.knowledge-sidebar__chevron,
.knowledge-sidebar__chevron-placeholder {
  width: 26px;
  height: 32px;
  flex: 0 0 26px;
  border-radius: 6px;
}

.knowledge-sidebar__item {
  display: flex;
  min-width: 0;
  height: 36px;
  flex: 1;
  align-items: center;
  gap: 8px;
  padding: 0 10px 0 0;
  border: 0;
  color: inherit;
  background: transparent;
  font: inherit;
  cursor: pointer;
  text-align: left;
}

.knowledge-sidebar__book {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  object-fit: contain;
}

.knowledge-sidebar__folder,
.knowledge-sidebar__file {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
}

.knowledge-sidebar__folder {
  color: #b78224;
  fill: #fff4d5;
}

.knowledge-sidebar__file {
  color: #777;
}

.knowledge-sidebar__name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 14px;
  line-height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.knowledge-sidebar__sync-mark {
  flex: 0 0 auto;
  padding: 0 3px;
  border-radius: 3px;
  color: #4c6db2;
  background: #edf3ff;
  font-size: 10px;
  font-weight: 400;
  line-height: 16px;
}

.knowledge-sidebar__count {
  flex: 0 0 auto;
  color: #999;
  font-size: 12px;
  font-weight: 400;
  line-height: 20px;
}

.knowledge-sidebar__lock {
  flex: 0 0 auto;
  color: #777;
}

.knowledge-sidebar__empty {
  padding: 28px 12px;
  color: #aaa;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
}

.knowledge-sidebar__documents {
  padding-left: 26px;
}

.knowledge-sidebar__document {
  display: flex;
  width: 100%;
  height: 34px;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  overflow: hidden;
  border: 0;
  border-radius: 8px;
  color: #666;
  background: transparent;
  font: 400 13px/20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  cursor: pointer;
  text-align: left;
}

.knowledge-sidebar__document:hover {
  color: #111;
  background: #f7f7f9;
}

.knowledge-sidebar__document span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .knowledge-sidebar__more { opacity: 1; }
  .knowledge-sidebar {
    position: fixed;
    z-index: 200;
    top: 56px;
    bottom: 0;
    left: 0;
    width: 280px;
    height: calc(100dvh - 56px);
    opacity: 0;
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
    transform: translateX(-280px);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
    pointer-events: none;
  }

  .knowledge-sidebar--open {
    opacity: 1;
    transform: translateX(0);
    pointer-events: auto;
  }
}
</style>
