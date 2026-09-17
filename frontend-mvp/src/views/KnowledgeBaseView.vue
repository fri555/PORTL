<script setup lang="ts">
import { computed, ref } from 'vue'
import { Bot, FileText, FolderPlus, PanelLeftOpen, Plus, Search, Upload, X } from 'lucide-vue-next'
import KnowledgeDialogs from '@/components/knowledge/source-clone/KnowledgeDialogs.vue'
import KnowledgeQaPanel from '@/components/knowledge/source-clone/KnowledgeQaPanel.vue'
import KnowledgeSidebar from '@/components/knowledge/source-clone/KnowledgeSidebar.vue'
import KnowledgeTable from '@/components/knowledge/source-clone/KnowledgeTable.vue'
import { sourceKnowledgeBases } from '@/mock/knowledge-source'
import type {
  KnowledgeDialogKind,
  KnowledgeSpace,
  SourceKnowledgeBase,
  SourceKnowledgeNavigation,
  SourceKnowledgeNode,
} from '@/types/knowledge-source'

const items = ref<SourceKnowledgeBase[]>(sourceKnowledgeBases.map((item) => ({ ...item })))
const activeSpace = ref<KnowledgeSpace>('public')
const sidebarOpen = ref(false)
const qaOpen = ref(false)
const selected = ref<SourceKnowledgeBase | null>(null)
const nodePath = ref<SourceKnowledgeNode[]>([])
const previewNode = ref<SourceKnowledgeNode | null>(null)
const dialog = ref<KnowledgeDialogKind>(null)
const dialogTarget = ref<SourceKnowledgeBase | SourceKnowledgeNode | null>(null)
const query = ref('')

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
const uploadDestinations = computed(() => items.value.flatMap((knowledgeBase) => {
  const destinations = [{ id: knowledgeBase.id, name: knowledgeBase.name }]
  function appendFolders(nodes: SourceKnowledgeNode[], prefix: string) {
    for (const node of nodes) {
      if (node.kind !== 'folder') continue
      const name = `${prefix} / ${node.name}`
      destinations.push({ id: node.id, name })
      appendFolders(node.children ?? [], name)
    }
  }
  appendFolders(knowledgeBase.nodes ?? [], knowledgeBase.name)
  return destinations
}))
function openDialog(
  kind: Exclude<KnowledgeDialogKind, null>,
  target: SourceKnowledgeBase | SourceKnowledgeNode | null = null,
) {
  dialogTarget.value = target
  dialog.value = kind
}

function closeDialog() {
  dialog.value = null
  dialogTarget.value = null
}

function openFolderDialog() {
  openDialog('folder', nodePath.value.at(-1) ?? selected.value)
}

function openUploadDialog() {
  openDialog('upload', nodePath.value.at(-1) ?? selected.value)
}

function selectItem(item: SourceKnowledgeBase | string) {
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
  if (payload.kind === 'preview' && 'kind' in payload.target) {
    previewNode.value = payload.target
    qaOpen.value = false
    return
  }
  openDialog(payload.kind as 'rename' | 'permission' | 'delete', payload.target)
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
    previewNode.value = node
    qaOpen.value = false
    return
  }
  nodePath.value = findNodePath(selected.value.nodes ?? [], node.id) ?? []
  previewNode.value = null
}

function navigateSidebar(payload: SourceKnowledgeNavigation) {
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
  activeSpace.value = space
  selected.value = null
  nodePath.value = []
  previewNode.value = null
}

function goRoot() {
  selected.value = null
  nodePath.value = []
  previewNode.value = null
}

function goBreadcrumb(index: number) {
  nodePath.value = nodePath.value.slice(0, index + 1)
  previewNode.value = null
}

function createKnowledge(payload: { name: string; space: KnowledgeSpace }) {
  items.value.unshift({
    id: `local-${Date.now()}`,
    name: payload.name,
    owner: '当前用户',
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

function createFolder(payload: { name: string }) {
  if (!selected.value) return
  currentNodes.value.push({
    id: `local-folder-${Date.now()}`,
    name: payload.name,
    kind: 'folder',
    owner: '当前用户',
    updatedAt: '刚刚',
    children: [],
  })
  closeDialog()
}

function uploadFiles(files: File[], destinationId: string, options: { monthlyReport: boolean }) {
  const destination = findUploadDestination(destinationId)
  if (!destination) return
  const next = files.map<SourceKnowledgeNode>((file, index) => ({
    id: `local-file-${Date.now()}-${index}`,
    name: file.name,
    kind: 'file',
    owner: '当前用户',
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

function savePermission() {
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
            <div v-if="selected" data-testid="knowledge-breadcrumb" class="breadcrumb">
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

          <div class="toolbar-actions" data-testid="knowledge-action-row">
            <button
              class="source-button primary"
              aria-label="上传文件"
              @click="openUploadDialog"
            >
              <Upload :size="16" />上传文件
            </button>
            <button class="source-button" aria-label="新建文件夹" @click="openFolderDialog">
              <FolderPlus :size="16" />新建文件夹
            </button>
            <button
              v-if="!qaOpen"
              class="source-button qa"
              aria-label="小智问答"
              @click="previewNode = null; qaOpen = true"
            >
              <Bot :size="17" />小智问答
            </button>
          </div>
        </header>

        <KnowledgeTable
          :items="visibleItems"
          :detail="selected"
          :nodes="currentNodes"
          @select="selectItem"
          @navigate-node="navigateNode"
          @action="handleAction"
        />
      </section>

      <KnowledgeQaPanel v-if="qaOpen" @close="qaOpen = false" />

      <aside v-if="previewNode" class="knowledge-preview" data-testid="knowledge-file-preview" aria-label="文件预览">
        <header>
          <span class="preview-file-icon"><FileText :size="18" /></span>
          <div><strong>{{ previewNode.name }}</strong><small>{{ previewNode.format }} · {{ previewNode.size }}</small></div>
          <button type="button" aria-label="关闭文件预览" title="关闭" @click="previewNode = null"><X :size="18" /></button>
        </header>
        <div class="preview-paper">
          <small>{{ selected?.name }}</small>
          <h2>{{ previewNode.name.replace(/\.[^.]+$/, '') }}</h2>
          <p>这是由本地 mock 数据生成的文件预览，用于完整演示知识库、文件夹和文件之间的导航关系。</p>
          <section>
            <h3>文件信息</h3>
            <dl><dt>所有者</dt><dd>{{ previewNode.owner }}</dd><dt>更新时间</dt><dd>{{ previewNode.updatedAt }}</dd><dt>文件大小</dt><dd>{{ previewNode.size }}</dd></dl>
          </section>
        </div>
      </aside>
    </div>

    <KnowledgeDialogs
      :kind="dialog"
      :target="dialogTarget"
      :destinations="uploadDestinations"
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
</style>
