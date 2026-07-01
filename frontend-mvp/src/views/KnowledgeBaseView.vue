<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import {
  BookOpen, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, ChevronsRight, Database, Download, Eye, File,
  FileSpreadsheet, FileText, Folder, FolderKanban, LayoutGrid, List, MessageSquareText, Move,
  Pencil, Plus, Search, Square, Star, Trash2, Upload, X,
} from 'lucide-vue-next'

type SpaceKey = 'public' | 'personal'
interface KnowledgeBaseItem { id: string; name: string; docs: number; owner: string; department: string; visibility: string; space: SpaceKey; canEdit: boolean; pinned?: boolean; recent: string }
interface DocItem { name: string; format: string; status: string; updatedAt: string; uploadedBy: string }
interface TreeNode { id: string; label: string; type: 'folder' | 'file'; kbId?: string; docName?: string; isKnowledgeBase?: boolean; children?: TreeNode[] }
interface FolderOption { id: string; label: string; depth: number; node?: TreeNode }

const sidebarVisible = ref(true)
const activeSpace = ref<SpaceKey>('public')
const selectedKbId = ref<string | null>(null)
const selectedFileIds = ref<string[]>([])
const createMode = ref(false)
const createKbName = ref('')
const createKbSpace = ref<SpaceKey>('public')
const createKbFolderId = ref('')
const createFolderMode = ref(false)
const createFolderName = ref('')
const createFolderParentId = ref('__root__')
const fileView = ref<'list' | 'grid'>('grid')
const kbView = ref<'list' | 'grid'>('list')
const fileSearch = ref('')
const fileActionModalOpen = ref(false)
const fileActionType = ref<'move' | null>(null)
const targetSearch = ref('')
const targetKbId = ref('')
const kbSearch = ref('')
const uploadModalOpen = ref(false)
const uploadFileNames = ref<string[]>([])
const uploadTasks = ref<{ id: string; name: string; status: 'uploading' | 'success' | 'failed' | 'reviewing'; progress: number; doc?: DocItem }[]>([])
const expandedTreeIds = ref<string[]>(['folder-shared', 'folder-solution-center'])
const activeTreeId = ref('')
const previewDoc = ref<DocItem | null>(null)
const renamingDocName = ref('')
const draftDocTitle = ref('')
const fileActionFeedback = ref('')
const exportMenuDocName = ref('')
const renamingKbId = ref('')
const draftKbTitle = ref('')
const contextMenu = ref<{ type: 'kb' | 'doc' | 'tree'; id: string; x: number; y: number } | null>(null)
const qaOpen = ref(false)
const qaQuestion = ref('')
const qaMode = ref<'answer' | 'search' | 'graph' | 'insight'>('answer')
const qaMessages = ref<{ role: 'user' | 'assistant'; content: string; citations?: string[] }[]>([])
const renamingFolderId = ref('')
const draftFolderTitle = ref('')
let fileActionToastTimer: number | undefined

const spaces = [
  { key: 'public' as const, label: '公共空间', desc: '全员可检索的集团知识' },
  { key: 'personal' as const, label: '个人空间', desc: '个人上传与私有资料' },
]

const knowledgeBases = reactive<Record<SpaceKey, KnowledgeBaseItem[]>>({
  public: [
    { id: 'kb-public-1', name: '集团制度知识库', docs: 128, owner: '集团运营', department: '行政部', visibility: '全员可见', space: 'public', canEdit: false, pinned: true, recent: '刚刚' },
    { id: 'kb-public-2', name: '商品基础资料库', docs: 86, owner: '商品中心', department: '商品部', visibility: '全员可见', space: 'public', canEdit: false, recent: '14:22' },
    { id: 'kb-public-3', name: '方案中心案例库', docs: 42, owner: '方案中心', department: '方案中心', visibility: '方案中心可编辑', space: 'public', canEdit: true, pinned: true, recent: '昨天 14:22' },
    { id: 'kb-public-4', name: '团购预算池', docs: 24, owner: '方案中心', department: '方案中心', visibility: '方案中心可编辑', space: 'public', canEdit: true, recent: '周日 13:27' },
  ],
  personal: [
    { id: 'kb-personal-1', name: '我的客户资料', docs: 9, owner: '当前用户', department: '个人', visibility: '仅自己可见', space: 'personal', canEdit: true, pinned: true, recent: '今天 09:18' },
    { id: 'kb-personal-2', name: '临时方案草稿', docs: 5, owner: '当前用户', department: '个人', visibility: '仅自己可见', space: 'personal', canEdit: true, recent: '昨天 18:02' },
  ],
})

const allDocs = reactive<Record<string, DocItem[]>>({
  'kb-public-1': [
    { name: '考勤管理制度_v3.pdf', format: 'PDF', status: '已索引', updatedAt: '2026-06-15', uploadedBy: '王管理员' },
    { name: '员工手册2026版.docx', format: 'DOCX', status: '已索引', updatedAt: '2026-06-10', uploadedBy: '王管理员' },
  ],
  'kb-public-2': [
    { name: '商品数据字典.xlsx', format: 'XLSX', status: '已索引', updatedAt: '2026-06-01', uploadedBy: '李商品' },
  ],
  'kb-public-3': [
    { name: '运动鞋团购成功案例.md', format: 'MD', status: '已索引', updatedAt: '2026-06-26', uploadedBy: '方案中心张明' },
    { name: '团购通用预算池.xlsx', format: 'XLSX', status: '已索引', updatedAt: '2026-06-24', uploadedBy: '方案中心张明' },
    { name: '方案中心字段模板.xlsx', format: 'XLSX', status: '解析中', updatedAt: '2026-06-22', uploadedBy: '方案中心李娟' },
  ],
  'kb-public-4': [
    { name: '2026Q1预算执行表.xlsx', format: 'XLSX', status: '已索引', updatedAt: '2026-06-20', uploadedBy: '方案中心张明' },
    { name: '价格带分析报告.docx', format: 'DOCX', status: '已索引', updatedAt: '2026-06-18', uploadedBy: '方案中心王磊' },
  ],
  'kb-personal-1': [
    { name: '客户A需求记录.md', format: 'MD', status: '已索引', updatedAt: '2026-06-28', uploadedBy: '当前用户' },
  ],
  'kb-personal-2': [
    { name: '临时方案笔记.md', format: 'MD', status: '解析中', updatedAt: '2026-06-27', uploadedBy: '当前用户' },
  ],
})

const fileTrees = reactive<Record<SpaceKey, TreeNode[]>>({
  public: [
    {
      id: 'folder-shared',
      label: '集团共享',
      type: 'folder',
      children: [
        {
          id: 'folder-policy',
          label: '集团制度知识库',
          type: 'folder',
          kbId: 'kb-public-1',
          isKnowledgeBase: true,
          children: [
            { id: 'file-attendance-policy', label: '考勤管理制度_v3.pdf', type: 'file', kbId: 'kb-public-1', docName: '考勤管理制度_v3.pdf' },
            { id: 'file-hr-handbook', label: '员工手册2026版.docx', type: 'file', kbId: 'kb-public-1', docName: '员工手册2026版.docx' },
          ],
        },
      ],
    },
    {
      id: 'folder-solution-center',
      label: '方案中心',
      type: 'folder',
      children: [
        {
          id: 'folder-solution-cases',
          label: '方案中心案例库',
          type: 'folder',
          kbId: 'kb-public-3',
          isKnowledgeBase: true,
          children: [
            { id: 'file-sneaker-case', label: '运动鞋团购成功案例.md', type: 'file', kbId: 'kb-public-3', docName: '运动鞋团购成功案例.md' },
            { id: 'file-common-budget', label: '团购通用预算池.xlsx', type: 'file', kbId: 'kb-public-3', docName: '团购通用预算池.xlsx' },
          ],
        },
        {
          id: 'folder-budget-pool',
          label: '团购预算池',
          type: 'folder',
          kbId: 'kb-public-4',
          isKnowledgeBase: true,
          children: [
            { id: 'file-q1-budget', label: '2026Q1预算执行表.xlsx', type: 'file', kbId: 'kb-public-4', docName: '2026Q1预算执行表.xlsx' },
          ],
        },
      ],
    },
    {
      id: 'folder-product',
      label: '商品资料',
      type: 'folder',
      children: [
        {
          id: 'folder-product-base',
          label: '商品基础资料库',
          type: 'folder',
          kbId: 'kb-public-2',
          isKnowledgeBase: true,
          children: [
            { id: 'file-product-dict', label: '商品数据字典.xlsx', type: 'file', kbId: 'kb-public-2', docName: '商品数据字典.xlsx' },
          ],
        },
        { id: 'file-price-band', label: '价格带分析报告.docx', type: 'file', kbId: 'kb-public-4', docName: '价格带分析报告.docx' },
      ],
    },
  ],
  personal: [
    {
      id: 'personal-customer',
      label: '我的客户资料',
      type: 'folder',
      kbId: 'kb-personal-1',
      isKnowledgeBase: true,
      children: [
        { id: 'personal-customer-a', label: '客户A需求记录.md', type: 'file', kbId: 'kb-personal-1', docName: '客户A需求记录.md' },
      ],
    },
    {
      id: 'personal-drafts',
      label: '临时方案草稿',
      type: 'folder',
      kbId: 'kb-personal-2',
      isKnowledgeBase: true,
      children: [
        { id: 'personal-temp-note', label: '临时方案笔记.md', type: 'file', kbId: 'kb-personal-2', docName: '临时方案笔记.md' },
        { id: 'personal-chaomu', label: '朝暮5草稿', type: 'folder', children: [{ id: 'personal-monitor', label: '策略监测草稿', type: 'file', kbId: 'kb-personal-2', docName: '临时方案笔记.md' }] },
      ],
    },
  ],
})

const currentSpaceItems = computed(() => knowledgeBases[activeSpace.value])
const selectedKb = computed(() => currentSpaceItems.value.find(kb => kb.id === selectedKbId.value))
const rawDocs = computed(() => selectedKbId.value ? (allDocs[selectedKbId.value] ?? []) : [])
const docs = computed(() => {
  if (!selectedKbId.value) return []
  if (activeNode.value?.type === 'folder' && activeNode.value.kbId === selectedKbId.value && !isKnowledgeBaseNode(activeNode.value)) {
    const names = collectDocNames(activeNode.value.children ?? [])
    return rawDocs.value.filter(doc => names.includes(doc.name))
  }
  return rawDocs.value
})
const activeSpaceLabel = computed(() => spaces.find(space => space.key === activeSpace.value)?.label ?? '')
const mainTitle = computed(() => selectedKb.value?.name ?? activeSpaceLabel.value)
const activeDirectoryKbIds = computed(() => {
  if (!activeNode.value?.children?.length) return []
  return collectKbIds(activeNode.value.children)
})
const displayedKnowledgeBases = computed(() => {
  const scoped = activeDirectoryKbIds.value.length
    ? currentSpaceItems.value.filter(kb => activeDirectoryKbIds.value.includes(kb.id))
    : currentSpaceItems.value
  const q = kbSearch.value.trim().toLowerCase()
  return q ? scoped.filter(kb => `${kb.name}${kb.owner}${kb.department}`.toLowerCase().includes(q)) : scoped
})
const pinnedKnowledgeBases = computed(() => displayedKnowledgeBases.value.filter(kb => kb.pinned))
const filteredDocs = computed(() => {
  const q = fileSearch.value.trim().toLowerCase()
  return q ? docs.value.filter(d => d.name.toLowerCase().includes(q)) : docs.value
})
const currentFileTree = computed(() => fileTrees[activeSpace.value])
const activeNode = computed(() => findTreeNode(currentFileTree.value, activeTreeId.value))
const activeKbFolderNode = computed(() => {
  if (!selectedKbId.value) return undefined
  if (activeNode.value?.type === 'folder' && activeNode.value.kbId === selectedKbId.value) return activeNode.value
  return findKbTreeNode(fileTrees[activeSpace.value], selectedKbId.value)
})
const visibleFolderNodes = computed(() => {
  const children = activeKbFolderNode.value?.children ?? []
  const q = fileSearch.value.trim().toLowerCase()
  const folders = children.filter(node => node.type === 'folder')
  return q ? folders.filter(node => node.label.toLowerCase().includes(q)) : folders
})
const hasKnowledgeItems = computed(() => visibleFolderNodes.value.length > 0 || filteredDocs.value.length > 0)
const fileCount = computed(() => visibleFolderNodes.value.length + filteredDocs.value.length)
const folderOptions = computed<FolderOption[]>(() => [
  { id: '__root__', label: '当前空间根目录', depth: 0 },
  ...collectFolderOptions(currentFileTree.value, 1),
])
const qaSources = computed(() => {
  const sourceDocs = filteredDocs.value.length ? filteredDocs.value : docs.value
  return sourceDocs.slice(0, 3).map((doc, index) => ({
    doc,
    score: `${96 - index * 4}%`,
    reason: index === 0 ? '命中标题与正文关键段落' : index === 1 ? '匹配预算、流程或执行建议' : '可作为补充来源',
  }))
})
const currentDirectoryChildren = computed(() => {
  const children = activeNode.value?.children ?? currentFileTree.value
  const q = kbSearch.value.trim().toLowerCase()
  return q ? children.filter(node => node.label.toLowerCase().includes(q)) : children
})

const targetKbs = computed(() => {
  const all = (Object.entries(knowledgeBases) as [SpaceKey, KnowledgeBaseItem[]][]).flatMap(([space, items]) =>
    items.filter(kb => kb.id !== selectedKbId.value).map(kb => ({ ...kb, space }))
  )
  const q = targetSearch.value.trim().toLowerCase()
  return q ? all.filter(kb => kb.name.toLowerCase().includes(q)) : all
})

function switchSpace(space: SpaceKey) {
  activeSpace.value = space
  selectedKbId.value = null
  createKbSpace.value = space
  selectedFileIds.value = []
  previewDoc.value = null
  activeTreeId.value = ''
  expandedTreeIds.value = space === 'public' ? ['folder-shared', 'folder-solution-center'] : ['personal-customer', 'personal-drafts']
}
function selectKb(id: string) { selectedKbId.value = id; selectedFileIds.value = []; previewDoc.value = null }
function toggleTreeNode(node: TreeNode) {
  activeTreeId.value = node.id
  if (node.type === 'file' && node.kbId) {
    selectKb(node.kbId)
    const doc = (allDocs[node.kbId] ?? []).find(item => item.name === node.docName) ?? allDocs[node.kbId]?.[0]
    if (doc) openPreview(doc)
    return
  }
  if (node.kbId) selectKb(node.kbId)
  else selectedKbId.value = null
  if (node.children?.length) {
    expandedTreeIds.value = expandedTreeIds.value.includes(node.id)
      ? expandedTreeIds.value.filter(id => id !== node.id)
      : [...expandedTreeIds.value, node.id]
  }
}
function collectKbIds(nodes: TreeNode[]): string[] {
  return [...new Set(nodes.flatMap(node => [
    ...(node.kbId ? [node.kbId] : []),
    ...(node.children ? collectKbIds(node.children) : []),
  ]))]
}
function findTreeNode(nodes: TreeNode[], id: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node
    const child = node.children ? findTreeNode(node.children, id) : undefined
    if (child) return child
  }
  return undefined
}
function collectFolderOptions(nodes: TreeNode[], depth = 0): FolderOption[] {
  return nodes.flatMap((node) => {
    if (node.type !== 'folder') return []
    return [
      { id: node.id, label: node.label, depth, node },
      ...(node.children ? collectFolderOptions(node.children, depth + 1) : []),
    ]
  })
}
function toggleFileSelect(name: string) {
  const i = selectedFileIds.value.indexOf(name)
  i >= 0 ? selectedFileIds.value.splice(i, 1) : selectedFileIds.value.push(name)
}
function selectAllFiles() {
  const names = filteredDocs.value.map(d => d.name)
  selectedFileIds.value = selectedFileIds.value.length === names.length ? [] : names
}
function deleteSelectedDocs() {
  if (!selectedKbId.value || selectedFileIds.value.length === 0) return
  const deletedCount = selectedFileIds.value.length
  const selectedSet = new Set(selectedFileIds.value)
  allDocs[selectedKbId.value] = (allDocs[selectedKbId.value] ?? []).filter(item => !selectedSet.has(item.name))
  if (previewDoc.value && selectedSet.has(previewDoc.value.name)) previewDoc.value = null
  selectedFileIds.value = []
  showFileActionToast(`已删除 ${deletedCount} 个文件`)
}
function confirmFileAction() {
  showFileActionToast(selectedFileIds.value.length ? `已移动 ${selectedFileIds.value.length} 个文件` : '已完成移动')
  fileActionModalOpen.value = false
  selectedFileIds.value = []
  fileActionType.value = null
}
function cancelFileAction() { fileActionModalOpen.value = false; fileActionType.value = null }
function openCreateModal() {
  createKbSpace.value = activeSpace.value
  createKbFolderId.value = activeNode.value?.type === 'folder' && !activeNode.value.kbId ? activeNode.value.id : ''
  createMode.value = true
}
function openCreateModalAt(parentId: string) {
  createKbSpace.value = activeSpace.value
  createKbFolderId.value = parentId === '__root__' ? '' : parentId
  createMode.value = true
  contextMenu.value = null
}
function createKnowledgeBase() {
  const isPublic = createKbSpace.value === 'public'
  const newKb: KnowledgeBaseItem = {
    id: `kb-${createKbSpace.value}-${Date.now()}`,
    name: createKbName.value || '未命名知识库',
    docs: 0,
    owner: '当前用户',
    department: isPublic ? '按角色授权' : '个人',
    visibility: isPublic ? '按角色授权' : '仅自己可见',
    space: createKbSpace.value,
    canEdit: true,
    pinned: false,
    recent: '刚刚',
  }
  knowledgeBases[createKbSpace.value].push(newKb)
  allDocs[newKb.id] = []
  const targetTree = fileTrees[createKbSpace.value]
  const container = createKbFolderId.value ? findTreeNode(targetTree, createKbFolderId.value) : undefined
  const newNode: TreeNode = { id: `folder-${newKb.id}`, label: newKb.name, type: 'folder', kbId: newKb.id, isKnowledgeBase: true, children: [] }
  if (container?.children) container.children.push(newNode)
  else targetTree.push(newNode)
  createKbName.value = ''; createMode.value = false
  const containerId = container?.id
  switchSpace(createKbSpace.value)
  if (containerId) expandedTreeIds.value = [...new Set([...expandedTreeIds.value, containerId])]
  selectedKbId.value = newKb.id; activeTreeId.value = newNode.id
}
function openUploadModal() { uploadModalOpen.value = true; uploadFileNames.value = [] }
function handleUploadFiles(event: Event) {
  const files = Array.from((event.target as HTMLInputElement).files ?? [])
  uploadFileNames.value = files
    .filter((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg'].includes(ext || '')
    })
    .map(file => file.name)
}
function confirmUpload() {
  const names = uploadFileNames.value.length ? uploadFileNames.value : ['方案补充资料.pdf', '客户需求表.xlsx']
  const tasks = names.map((name, index) => {
    const format = (name.split('.').pop() || 'PDF').toUpperCase()
    const doc = { name, format, status: activeSpace.value === 'public' ? '待审核' : '已索引', updatedAt: '刚刚', uploadedBy: '当前用户' }
    if (selectedKbId.value) allDocs[selectedKbId.value] = [doc, ...(allDocs[selectedKbId.value] ?? [])]
    return { id: `upload-${Date.now()}-${index}`, name, status: activeSpace.value === 'public' ? 'reviewing' as const : 'success' as const, progress: 100, doc }
  })
  uploadTasks.value = [...tasks, ...uploadTasks.value].slice(0, 4)
  uploadModalOpen.value = false
  uploadFileNames.value = []
}
function getFileIcon(f: string) { if (f === 'XLSX') return FileSpreadsheet; if (f === 'DOCX' || f === 'MD' || f === 'PDF') return FileText; return File }
function getIconColor(f: string) { if (f === 'XLSX') return 'text-emerald-500 bg-emerald-50'; if (f === 'DOCX') return 'text-blue-500 bg-blue-50'; if (f === 'PDF') return 'text-red-500 bg-red-50'; if (f === 'MD') return 'text-violet-500 bg-violet-50'; return 'text-zinc-500 bg-zinc-50' }
function openPreview(doc: DocItem) { previewDoc.value = doc }
function beginRenameDoc(doc: DocItem) { renamingDocName.value = doc.name; draftDocTitle.value = doc.name }
function commitRenameDoc(_doc?: DocItem) { renamingDocName.value = ''; draftDocTitle.value = '' }
function exportDoc(_doc?: DocItem | null) {}
function chooseExportFormat(_format?: string) {}
function moveDoc(_doc?: DocItem) {}
function deleteDoc(doc: DocItem) {
  if (!selectedKbId.value) return
  allDocs[selectedKbId.value] = (allDocs[selectedKbId.value] ?? []).filter(item => item.name !== doc.name)
  selectedFileIds.value = selectedFileIds.value.filter(name => name !== doc.name)
  if (previewDoc.value?.name === doc.name) previewDoc.value = null
  showFileActionToast(`已删除：${doc.name}`)
}
function toggleKbPinned(kb: KnowledgeBaseItem) {
  kb.pinned = !kb.pinned
}
function moveKb(_kb?: KnowledgeBaseItem) {}
function beginRenameKb(kb: KnowledgeBaseItem) {
  renamingKbId.value = kb.id
  draftKbTitle.value = kb.name
}
function commitRenameKb(_kb?: KnowledgeBaseItem) { renamingKbId.value = ''; draftKbTitle.value = '' }
function deleteKb(kb: KnowledgeBaseItem) {
  if (!kb.canEdit) return
  knowledgeBases[kb.space] = knowledgeBases[kb.space].filter(item => item.id !== kb.id)
  if (selectedKbId.value === kb.id) selectedKbId.value = null
  showFileActionToast(`已删除知识库：${kb.name}`)
}
function updateTreeLabel(nodes: TreeNode[], kbId: string, label: string) {
  for (const node of nodes) {
    if (node.kbId === kbId && node.type === 'folder') node.label = label
    if (node.children) updateTreeLabel(node.children, kbId, label)
  }
}
function openCreateFolderModal() {
  createFolderName.value = ''
  const selectedKbRoot = selectedKb.value ? findKbTreeNode(fileTrees[activeSpace.value], selectedKb.value.id) : undefined
  const activeFolderInCurrentKb = activeNode.value?.type === 'folder' && activeNode.value.kbId === selectedKbId.value
    ? activeNode.value
    : undefined
  createFolderParentId.value = activeFolderInCurrentKb?.id ?? selectedKbRoot?.id ?? (activeNode.value?.type === 'folder' ? activeNode.value.id : '__root__')
  createFolderMode.value = true
}
function openCreateFolderModalAt(parentId: string) {
  createFolderName.value = ''
  createFolderParentId.value = parentId
  createFolderMode.value = true
  contextMenu.value = null
}
function createFolder() {
  const parent = createFolderParentId.value === '__root__' ? undefined : findTreeNode(fileTrees[activeSpace.value], createFolderParentId.value)
  const name = createFolderName.value.trim() || '投标资料'
  const node: TreeNode = {
    id: `folder-custom-${Date.now()}`,
    label: name,
    type: 'folder',
    kbId: parent?.kbId,
    children: [],
  }
  if (parent) {
    parent.children = parent.children ?? []
    parent.children.push(node)
    expandedTreeIds.value = [...new Set([...expandedTreeIds.value, parent.id])]
    activeTreeId.value = parent.id
    if (parent.kbId) selectedKbId.value = parent.kbId
  } else {
    fileTrees[activeSpace.value].push(node)
    activeTreeId.value = ''
  }
  showFileActionToast(`已新建文件夹：${name}，支持重命名文件夹`)
  createFolderMode.value = false
}
function showFileActionToast(message: string) {
  fileActionFeedback.value = message
  if (fileActionToastTimer) window.clearTimeout(fileActionToastTimer)
  fileActionToastTimer = window.setTimeout(() => {
    fileActionFeedback.value = ''
    fileActionToastTimer = undefined
  }, 3000)
}
function findKbTreeNode(nodes: TreeNode[], kbId: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.kbId === kbId && node.type === 'folder') return node
    const child = node.children ? findKbTreeNode(node.children, kbId) : undefined
    if (child) return child
  }
  return undefined
}
function isKnowledgeBaseNode(node?: TreeNode) {
  return Boolean(node?.type === 'folder' && node.kbId && node.isKnowledgeBase)
}
function collectDocNames(nodes: TreeNode[]): string[] {
  return nodes.flatMap(node => [
    ...(node.type === 'file' && node.docName ? [node.docName] : []),
    ...(node.children ? collectDocNames(node.children) : []),
  ])
}
function findTreeNodeDepth(nodes: TreeNode[], id: string, depth = 0): number {
  for (const node of nodes) {
    if (node.id === id) return depth
    const childDepth = node.children ? findTreeNodeDepth(node.children, id, depth + 1) : -1
    if (childDepth >= 0) return childDepth
  }
  return -1
}
function openTreeContextMenu(targetId: string, event: MouseEvent) {
  contextMenu.value = { type: 'tree', id: targetId, x: event.clientX, y: event.clientY }
}
function openTreeBlankContextMenu(event: MouseEvent) {
  contextMenu.value = { type: 'tree', id: '__root__', x: event.clientX, y: event.clientY }
}
const contextTreeNode = computed(() => contextMenu.value?.type === 'tree' && contextMenu.value.id !== '__root__'
  ? findTreeNode(currentFileTree.value, contextMenu.value.id)
  : undefined)
const contextTreeDepth = computed(() => contextMenu.value?.type === 'tree' && contextMenu.value.id !== '__root__'
  ? findTreeNodeDepth(currentFileTree.value, contextMenu.value.id)
  : -1)
const canContextCreateKb = computed(() => Boolean(contextTreeNode.value && !contextTreeNode.value.kbId && contextTreeDepth.value === 0))
const canContextCreateFolder = computed(() => contextMenu.value?.type === 'tree' && (!contextTreeNode.value || contextTreeNode.value.type === 'folder'))
function beginRenameFolder(node: TreeNode) {
  renamingFolderId.value = node.id
  draftFolderTitle.value = node.label
}
function commitRenameFolder(node: TreeNode) {
  const title = draftFolderTitle.value.trim()
  if (title) node.label = title
  renamingFolderId.value = ''
  draftFolderTitle.value = ''
}
function askKnowledgeBase() {
  const text = qaQuestion.value.trim()
  if (!text) return
  qaMessages.value.push({ role: 'user', content: text })
  const citations = qaSources.value.map(source => source.doc.name)
  qaMessages.value.push({
    role: 'assistant',
    content: `已在「${selectedKb.value?.name ?? activeSpaceLabel.value}」中完成检索。建议优先查看命中最高的文件，并结合引用来源核对预算、制度或执行口径；如果需要，我可以继续按条款、案例、表格字段拆解。`,
    citations,
  })
  qaQuestion.value = ''
}
function openKbContextMenu(kb: KnowledgeBaseItem, event: MouseEvent) {
  contextMenu.value = { type: 'kb', id: kb.id, x: event.clientX, y: event.clientY }
}
function openDocContextMenu(doc: DocItem, event: MouseEvent) {
  contextMenu.value = { type: 'doc', id: doc.name, x: event.clientX, y: event.clientY }
}
const contextKb = computed(() => contextMenu.value?.type === 'kb'
  ? currentSpaceItems.value.find(kb => kb.id === contextMenu.value?.id)
  : undefined)
const contextDoc = computed(() => contextMenu.value?.type === 'doc'
  ? docs.value.find(doc => doc.name === contextMenu.value?.id)
  : undefined)

onBeforeUnmount(() => {
  if (fileActionToastTimer) window.clearTimeout(fileActionToastTimer)
})
</script>

<template>
  <div class="flex h-[calc(100vh-4rem)] bg-zinc-50 text-zinc-950">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-2 opacity-0"
    >
      <div
        v-if="fileActionFeedback"
        data-testid="knowledge-toast"
        class="fixed left-1/2 top-20 z-[70] flex min-w-[280px] max-w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-medium text-blue-700 shadow-2xl shadow-blue-100/60"
      >
        <span class="min-w-0 flex-1 truncate">{{ fileActionFeedback }}</span>
        <button type="button" class="rounded-md p-1 text-blue-500 hover:bg-blue-50 hover:text-blue-800" aria-label="关闭操作提示" @click="fileActionFeedback = ''">
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
    </Transition>
    <!-- Sidebar -->
    <div v-if="!sidebarVisible" class="fixed left-3 top-[4.75rem] z-40 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white/95 p-1 shadow-sm backdrop-blur">
      <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-zinc-100" aria-label="展开侧边栏" @click="sidebarVisible = true">
        <ChevronsRight class="h-4 w-4" />
      </button>
      <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-zinc-100" aria-label="新建知识库" @click="openCreateModal">
        <BookOpen class="h-4 w-4 text-orange-500" />
      </button>
      <button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-700" aria-label="新建文件夹" @click="openCreateFolderModal">
        <Folder class="h-4 w-4" />
        新建
      </button>
    </div>
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-[clamp(286px,21vw,400px)] flex-col overflow-hidden border-r border-zinc-200 bg-white transition-transform duration-300 lg:top-16 lg:h-[calc(100vh-4rem)]"
      :class="sidebarVisible ? 'translate-x-0' : '-translate-x-full'"
    >
      <div data-testid="knowledge-sidebar-subheader" class="flex h-12 items-center justify-end border-b border-zinc-100 px-3">
        <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:bg-zinc-50" aria-label="折叠侧边栏" @click="sidebarVisible = false">
          <ChevronLeft class="h-4 w-4" />
        </button>
      </div>
      <div class="space-y-3 border-b border-zinc-100 p-3">
        <div data-testid="knowledge-space-tabs-sidebar" class="grid grid-cols-2 gap-1 rounded-full bg-zinc-100 p-1">
          <button v-for="space in spaces" :key="space.key" class="rounded-full px-3 py-2 text-center text-sm font-semibold transition" :class="activeSpace === space.key ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:text-zinc-800'" @click="switchSpace(space.key)">
            {{ space.label }}
          </button>
        </div>
        <label class="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-400">
          <Search class="h-3.5 w-3.5" />
          <input v-model="kbSearch" class="min-w-0 flex-1 bg-transparent outline-none" placeholder="搜索知识库" />
        </label>
      </div>
      <div class="flex-1 overflow-y-auto p-2" data-testid="knowledge-tree-panel" @contextmenu.prevent.self="openTreeBlankContextMenu">
        <div>
          <div class="mb-2 px-2 text-[11px] font-semibold text-zinc-400">文件树</div>
          <div class="min-h-[360px] space-y-1" @contextmenu.prevent.self="openTreeBlankContextMenu">
            <div v-for="node in currentFileTree" :key="node.id">
              <button class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-50" :class="activeTreeId === node.id ? 'bg-blue-50 text-blue-700' : ''" @click="toggleTreeNode(node)" @contextmenu.prevent.stop="openTreeContextMenu(node.id, $event)">
                <ChevronDown v-if="expandedTreeIds.includes(node.id)" class="h-3.5 w-3.5" />
                <ChevronRight v-else class="h-3.5 w-3.5" />
                <Folder class="h-4 w-4 text-zinc-600" />
                <span class="truncate">{{ node.label }}</span>
              </button>
              <div v-if="expandedTreeIds.includes(node.id)" class="ml-6 space-y-1">
                <template v-for="child in node.children" :key="child.id">
                  <button class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-zinc-600 hover:bg-zinc-50" :class="activeTreeId === child.id ? 'bg-blue-50 text-blue-700' : ''" @click="toggleTreeNode(child)" @contextmenu.prevent.stop="openTreeContextMenu(child.id, $event)">
                    <template v-if="child.children?.length">
                      <ChevronDown v-if="expandedTreeIds.includes(child.id)" class="h-3.5 w-3.5" />
                      <ChevronRight v-else class="h-3.5 w-3.5" />
                      <BookOpen v-if="isKnowledgeBaseNode(child)" class="h-4 w-4 text-orange-500" />
                      <Folder v-else class="h-4 w-4 text-zinc-600" />
                    </template>
                    <template v-else>
                      <span class="ml-5" />
                      <BookOpen v-if="isKnowledgeBaseNode(child)" class="h-4 w-4 text-orange-500" />
                      <Folder v-else-if="child.type === 'folder'" class="h-4 w-4 text-zinc-600" />
                      <FileText v-else class="h-4 w-4 text-blue-500" />
                    </template>
                    <span class="truncate">{{ child.label }}</span>
                  </button>
                  <div v-if="child.children?.length && expandedTreeIds.includes(child.id)" class="ml-6 space-y-1">
                    <button
                      v-for="leaf in child.children"
                      :key="leaf.id"
                      class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-zinc-600 hover:bg-zinc-50"
                      :class="activeTreeId === leaf.id ? 'bg-blue-50 text-blue-700' : ''"
                      @click="toggleTreeNode(leaf)"
                      @contextmenu.prevent.stop="openTreeContextMenu(leaf.id, $event)"
                    >
                      <BookOpen v-if="isKnowledgeBaseNode(leaf)" class="h-4 w-4 text-orange-500" />
                      <Folder v-else-if="leaf.type === 'folder'" class="h-4 w-4 text-zinc-600" />
                      <FileText v-else class="h-4 w-4 text-blue-500" />
                      <input v-if="renamingFolderId === leaf.id" v-model="draftFolderTitle" class="min-w-0 flex-1 rounded-md border border-blue-200 px-2 py-0.5 text-sm outline-none" @click.stop @keydown.enter.prevent="commitRenameFolder(leaf)" @blur="commitRenameFolder(leaf)" />
                      <span v-else class="truncate">{{ leaf.label }}</span>
                      <button v-if="leaf.type === 'folder' && !leaf.kbId" type="button" class="ml-auto rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="重命名文件夹" @click.stop="beginRenameFolder(leaf)"><Pencil class="h-3.5 w-3.5" /></button>
                    </button>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <main
      data-testid="knowledge-main-pane"
      class="flex min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-300"
      :class="{ 'knowledge-main-pane--compact': previewDoc }"
      :style="{
        marginLeft: sidebarVisible ? 'clamp(286px,21vw,400px)' : '0px',
        marginRight: previewDoc ? 'clamp(360px,38vw,640px)' : '0px',
      }"
    >
      <div data-testid="knowledge-main-header" class="grid min-h-14 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-zinc-200 bg-white px-4">
        <div class="text-xs text-zinc-400">{{ selectedKb ? activeSpaceLabel : '空间总览' }}</div>
        <h1 class="truncate text-center text-base font-semibold text-zinc-950">{{ selectedKb ? mainTitle : activeNode?.label ?? activeSpaceLabel }}</h1>
        <div class="flex items-center justify-end gap-2">
          <div class="relative">
            <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-300" />
            <input v-if="selectedKb" v-model="fileSearch" type="text" placeholder="搜索文件..." class="w-[clamp(180px,18vw,320px)] rounded-lg border border-zinc-200 py-2 pl-8 pr-3 text-xs text-zinc-600 placeholder:text-zinc-300 focus:border-blue-200 focus:outline-none" />
            <input v-else v-model="kbSearch" type="text" placeholder="搜索知识库..." class="w-[clamp(180px,18vw,320px)] rounded-lg border border-zinc-200 py-2 pl-8 pr-3 text-xs text-zinc-600 placeholder:text-zinc-300 focus:border-blue-200 focus:outline-none" />
          </div>
          <div class="inline-flex h-9 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <button class="px-2.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" :class="{ 'bg-zinc-100 text-zinc-600': selectedKb ? fileView === 'list' : kbView === 'list' }" aria-label="列表视图" @click="selectedKb ? fileView = 'list' : kbView = 'list'"><List class="h-4 w-4" /></button>
            <button class="px-2.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" :class="{ 'bg-zinc-100 text-zinc-600': selectedKb ? fileView === 'grid' : kbView === 'grid' }" aria-label="宫格视图" @click="selectedKb ? fileView = 'grid' : kbView = 'grid'"><LayoutGrid class="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 md:p-6">
        <div v-if="!selectedKb" class="space-y-8">
          <section>
            <div class="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold text-zinc-950">收藏知识库</h2>
                <p class="mt-1 text-xs text-zinc-400">当前目录：{{ activeNode?.label ?? activeSpaceLabel }}</p>
              </div>
              <span class="rounded-full bg-white px-2 py-1 text-xs text-zinc-400">{{ displayedKnowledgeBases.length }} 个知识库</span>
            </div>
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              <button
                v-for="kb in pinnedKnowledgeBases"
                :key="kb.id"
                type="button"
                class="flex min-h-20 items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
                @click="selectKb(kb.id)"
                @contextmenu.prevent="openKbContextMenu(kb, $event)"
              >
                <div class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-500">
                  <BookOpen class="h-6 w-6" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-semibold text-zinc-900">{{ kb.name }}</div>
                  <div class="mt-1 truncate text-xs text-zinc-500">{{ kb.recent }} {{ kb.owner }}更新</div>
                </div>
              </button>
            </div>
          </section>

          <section>
            <div class="mb-3 flex items-center justify-between gap-3">
              <h2 class="text-base font-semibold text-zinc-950">全部知识库</h2>
              <button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700" aria-label="新建知识库" @click="openCreateModal">
                <Plus class="h-4 w-4" />新建知识库
              </button>
            </div>
            <div v-if="kbView === 'grid'" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="kb in displayedKnowledgeBases"
                :key="kb.id"
                data-testid="knowledge-kb-card"
                class="group rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-orange-300"
                @contextmenu.prevent="openKbContextMenu(kb, $event)"
              >
                <button type="button" class="flex w-full min-w-0 items-center gap-3 text-left" @click="selectKb(kb.id)">
                  <div class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-500">
                    <BookOpen class="h-6 w-6" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-semibold text-zinc-900">{{ kb.name }}</div>
                    <div class="mt-1 truncate text-xs text-zinc-400">{{ kb.docs }} 文档 · {{ kb.visibility }}</div>
                  </div>
                </button>
                <div class="mt-3 flex items-center justify-between gap-2">
                  <span class="truncate text-xs text-zinc-400">{{ kb.department }} · {{ kb.recent }}</span>
                  <div class="flex shrink-0 gap-1">
                    <button type="button" class="rounded-md p-1.5 text-zinc-400 hover:bg-amber-50 hover:text-amber-600" :aria-label="`收藏知识库 ${kb.name}`" @click.stop="toggleKbPinned(kb)">
                      <Star class="h-4 w-4" :class="kb.pinned ? 'fill-amber-500 text-amber-500' : ''" />
                    </button>
                    <button v-if="false && kb.canEdit" type="button" class="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800" :aria-label="`重命名知识库 ${kb.name}`" @click.stop="beginRenameKb(kb)"><Pencil class="h-4 w-4" /></button>
                    <button v-if="false && kb.canEdit" type="button" class="rounded-md p-1.5 text-zinc-400 hover:bg-blue-50 hover:text-blue-600" :aria-label="`移动知识库 ${kb.name}`" @click.stop="moveKb(kb)"><Move class="h-4 w-4" /></button>
                    <button v-if="kb.canEdit" type="button" class="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600" :aria-label="`删除知识库 ${kb.name}`" @click.stop="deleteKb(kb)"><Trash2 class="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div class="grid grid-cols-[minmax(260px,1fr)_160px_160px_104px] border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-xs font-medium text-zinc-500">
                <span>名称</span>
                <span>归属小组</span>
                <span>最近访问</span>
                <span class="text-right">操作</span>
              </div>
              <div
                v-for="kb in displayedKnowledgeBases"
                :key="kb.id"
                class="grid grid-cols-[minmax(260px,1fr)_160px_160px_104px] items-center border-b border-zinc-100 px-4 py-3 last:border-0 hover:bg-zinc-50"
                @contextmenu.prevent="openKbContextMenu(kb, $event)"
              >
                <button type="button" class="flex min-w-0 items-center gap-3 text-left" @click="selectKb(kb.id)">
                  <div class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-500">
                    <BookOpen class="h-5 w-5" />
                  </div>
                  <div class="min-w-0">
                    <input
                      v-if="renamingKbId === kb.id"
                      v-model="draftKbTitle"
                      class="w-full rounded-md border border-blue-200 bg-white px-2 py-1 text-sm outline-none ring-2 ring-blue-100"
                      aria-label="编辑知识库名称"
                      @click.stop
                      @keydown.enter.prevent="commitRenameKb(kb)"
                      @keydown.esc.prevent="renamingKbId = ''; draftKbTitle = ''"
                      @blur="commitRenameKb(kb)"
                    />
                    <div v-else class="truncate text-sm font-semibold text-zinc-900">{{ kb.name }}</div>
                    <div class="mt-0.5 truncate text-xs text-zinc-400">{{ kb.docs }} 文档 · {{ kb.visibility }}</div>
                  </div>
                </button>
                <span class="text-xs text-zinc-500">{{ kb.department }}</span>
                <span class="text-xs text-zinc-500">{{ kb.recent }}</span>
                <div class="flex justify-end gap-1">
                  <button type="button" class="rounded-md p-1.5 text-zinc-400 hover:bg-amber-50 hover:text-amber-600" :aria-label="`收藏知识库 ${kb.name}`" @click="toggleKbPinned(kb)">
                    <Star class="h-4 w-4" :class="kb.pinned ? 'fill-amber-500 text-amber-500' : ''" />
                  </button>
                  <button v-if="false && kb.canEdit" type="button" class="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800" :aria-label="`重命名知识库 ${kb.name}`" @click="beginRenameKb(kb)">
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button v-if="false && kb.canEdit" type="button" class="rounded-md p-1.5 text-zinc-400 hover:bg-blue-50 hover:text-blue-600" :aria-label="`移动知识库 ${kb.name}`" @click="moveKb(kb)">
                    <Move class="h-4 w-4" />
                  </button>
                  <button v-if="kb.canEdit" type="button" class="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600" :aria-label="`删除知识库 ${kb.name}`" @click="deleteKb(kb)">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div v-if="selectedKb" data-testid="knowledge-action-row" class="mb-3 flex flex-wrap items-center gap-2">
          <button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50" aria-label="新建文件夹" @click="openCreateFolderModal">
            <Folder class="h-3.5 w-3.5 text-zinc-600" />新建文件夹
          </button>
          <button class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50" aria-label="上传文件" @click="openUploadModal">
            <Upload class="h-3.5 w-3.5 text-zinc-500" />上传文件
          </button>
          <button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700 hover:bg-blue-100" aria-label="知识库问答" @click="qaOpen = true">
            <MessageSquareText class="h-3.5 w-3.5" />知识库问答
          </button>
        </div>

        <div v-if="uploadTasks.length" class="mb-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div class="mb-2 text-sm font-semibold text-zinc-900">上传任务</div>
          <div class="space-y-2">
            <div v-for="task in uploadTasks" :key="task.id" class="flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs">
              <FileText class="h-4 w-4 text-blue-500" />
              <span class="min-w-0 flex-1 truncate font-medium text-zinc-800">{{ task.name }}</span>
              <span class="text-zinc-400">{{ task.progress }}%</span>
              <span class="rounded-full px-2 py-0.5 font-medium" :class="task.status === 'success' ? 'bg-emerald-50 text-emerald-600' : task.status === 'reviewing' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'">{{ task.status === 'success' ? '上传成功' : task.status === 'reviewing' ? '上传成功 · 待人工审核' : '上传失败' }}</span>
              <button v-if="task.doc" type="button" class="rounded-md px-2 py-1 text-blue-600 hover:bg-blue-50" @click="openPreview(task.doc)">查看预览</button>
            </div>
          </div>
        </div>

        <!-- Action bar -->
        <div v-else-if="selectedFileIds.length > 0" class="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <span class="text-xs font-medium text-blue-700">已选 {{ selectedFileIds.length }} 项</span>
          <div class="ml-auto flex items-center gap-1">
            <button class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50" @click="deleteSelectedDocs"><Trash2 class="h-3 w-3" />删除</button>
          </div>
        </div>

        <!-- File list -->
        <div v-if="selectedKb && !hasKnowledgeItems" class="flex flex-col items-center justify-center py-24 text-center">
          <Database class="h-12 w-12 text-zinc-200" />
          <p class="mt-3 text-sm text-zinc-400">此知识库暂无文档</p>
          <button class="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-medium text-white hover:bg-orange-600" @click="openUploadModal"><Upload class="h-3.5 w-3.5" />上传第一个文档</button>
        </div>

        <div v-else-if="selectedKb && fileView === 'list'" class="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table class="w-full">
            <thead class="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th class="w-10 px-3 py-3"><button class="text-zinc-400 hover:text-zinc-600" @click="selectAllFiles"><CheckSquare v-if="selectedFileIds.length === filteredDocs.length && filteredDocs.length > 0" class="h-4 w-4 text-blue-500" /><Square v-else class="h-4 w-4" /></button></th>
                <th class="px-0 py-3 text-left text-xs font-medium text-zinc-500">名称</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-zinc-500" :class="{ 'hidden xl:table-cell': previewDoc }"><span v-if="!previewDoc">格式</span></th>
                <th class="px-4 py-3 text-left text-xs font-medium text-zinc-500" :class="{ 'hidden 2xl:table-cell': previewDoc }"><span v-if="!previewDoc">状态</span></th>
                <th class="px-4 py-3 text-left text-xs font-medium text-zinc-500" :class="{ 'hidden 2xl:table-cell': previewDoc }"><span v-if="!previewDoc">更新时间</span></th>
                <th class="px-4 py-3 text-right text-xs font-medium text-zinc-500">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="folder in visibleFolderNodes" :key="folder.id" data-testid="knowledge-folder-row" class="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50" @click="toggleTreeNode(folder)">
                <td class="px-3 py-3" />
                <td class="py-3">
                  <div class="flex items-center gap-2 text-sm text-zinc-800">
                    <Folder class="h-4 w-4 text-zinc-600" />
                    <span class="truncate font-medium">{{ folder.label }}</span>
                  </div>
                </td>
                <td class="px-4 py-3" :class="{ 'hidden xl:table-cell': previewDoc }"><span class="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500">文件夹</span></td>
                <td class="px-4 py-3" :class="{ 'hidden 2xl:table-cell': previewDoc }"><span class="text-[11px] text-zinc-400">{{ folder.children?.length ?? 0 }} 项</span></td>
                <td class="px-4 py-3 text-xs text-zinc-400" :class="{ 'hidden 2xl:table-cell': previewDoc }">刚刚</td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-1">
                    <button type="button" class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100" :aria-label="`打开文件夹 ${folder.label}`" @click.stop="toggleTreeNode(folder)">
                      <Folder class="h-3.5 w-3.5" /><span v-if="!previewDoc">打开</span>
                    </button>
                    <button v-if="selectedKb?.canEdit && !folder.kbId" type="button" class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100" :aria-label="`重命名文件夹 ${folder.label}`" @click.stop="beginRenameFolder(folder)">
                      <Pencil class="h-3.5 w-3.5" /><span v-if="!previewDoc">改名</span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-for="doc in filteredDocs" :key="doc.name" data-testid="knowledge-file-row" class="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50" :class="{ 'bg-blue-50/50': selectedFileIds.includes(doc.name) }" @click="openPreview(doc)" @contextmenu.prevent="openDocContextMenu(doc, $event)">
                <td class="px-3 py-3"><button class="text-zinc-400 hover:text-blue-500" @click.stop="toggleFileSelect(doc.name)"><CheckSquare v-if="selectedFileIds.includes(doc.name)" class="h-4 w-4 text-blue-500" /><Square v-else class="h-4 w-4" /></button></td>
                <td class="py-3">
                  <div class="flex items-center gap-2 text-sm text-zinc-800">
                    <component :is="getFileIcon(doc.format)" class="h-4 w-4" :class="getIconColor(doc.format)" />
                    <input
                      v-if="renamingDocName === doc.name"
                      v-model="draftDocTitle"
                      class="min-w-0 flex-1 rounded-md border border-blue-200 bg-white px-2 py-1 text-sm outline-none ring-2 ring-blue-100"
                      aria-label="编辑文件标题"
                      @click.stop
                      @keydown.enter.prevent="commitRenameDoc(doc)"
                      @keydown.esc.prevent="renamingDocName = ''; draftDocTitle = ''"
                      @blur="commitRenameDoc(doc)"
                    />
                    <span v-else class="truncate">{{ doc.name }}</span>
                  </div>
                </td>
                <td class="px-4 py-3" :class="{ 'hidden xl:table-cell': previewDoc }"><span class="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500">{{ doc.format }}</span></td>
                <td class="px-4 py-3" :class="{ 'hidden 2xl:table-cell': previewDoc }"><span class="rounded-full px-2 py-0.5 text-[11px] font-medium" :class="doc.status === '已索引' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'">{{ doc.status }}</span></td>
                <td class="px-4 py-3 text-xs text-zinc-400" :class="{ 'hidden 2xl:table-cell': previewDoc }">{{ doc.updatedAt }}</td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-1">
                    <button type="button" class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-blue-600 hover:bg-blue-50" :aria-label="`预览 ${doc.name}`" @click.stop="openPreview(doc)">
                      <Eye class="h-3.5 w-3.5" /><span v-if="!previewDoc">预览</span>
                    </button>
                    <button v-if="selectedKb?.canEdit" type="button" class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50" :aria-label="`删除 ${doc.name}`" @click.stop="deleteDoc(doc)">
                      <Trash2 class="h-3.5 w-3.5" /><span v-if="!previewDoc">删除</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="selectedKb" class="grid gap-3" :class="previewDoc ? 'grid-cols-[repeat(auto-fill,minmax(96px,1fr))]' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'">
          <div v-for="folder in visibleFolderNodes" :key="folder.id" data-testid="knowledge-folder-card" class="relative cursor-pointer rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50/30" @click="toggleTreeNode(folder)">
            <div class="mb-3 mt-3 flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-50 text-zinc-600 shadow-sm">
              <Folder class="h-7 w-7" />
            </div>
            <strong class="block truncate text-sm font-semibold text-zinc-900" :title="folder.label">{{ folder.label }}</strong>
            <span v-if="!previewDoc" class="mt-1 text-[11px] text-zinc-400">文件夹 · {{ folder.children?.length ?? 0 }} 项</span>
            <div v-if="!previewDoc" class="mt-3 flex gap-1">
              <button type="button" class="rounded-md px-2 py-1 text-[11px] text-blue-600 hover:bg-blue-50" :aria-label="`打开文件夹 ${folder.label}`" @click.stop="toggleTreeNode(folder)">打开</button>
              <button v-if="selectedKb?.canEdit && !folder.kbId" type="button" class="rounded-md px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-100" :aria-label="`重命名文件夹 ${folder.label}`" @click.stop="beginRenameFolder(folder)">改名</button>
            </div>
          </div>
          <div v-for="doc in filteredDocs" :key="doc.name" data-testid="knowledge-file-card" class="relative cursor-pointer rounded-xl border border-zinc-200 bg-white transition hover:border-orange-300" :class="[selectedFileIds.includes(doc.name) ? 'ring-2 ring-blue-300' : '', previewDoc ? 'p-3' : 'p-4']" @click="openPreview(doc)" @contextmenu.prevent="openDocContextMenu(doc, $event)">
            <button class="absolute left-3 top-3 z-10 rounded p-0.5 bg-white/80 backdrop-blur" @click.stop="toggleFileSelect(doc.name)"><CheckSquare v-if="selectedFileIds.includes(doc.name)" class="h-4 w-4 text-blue-500" /><Square v-else class="h-4 w-4 text-zinc-300" /></button>
            <div class="mb-3 mt-3 flex items-center justify-center rounded-xl shadow-sm" :class="[getIconColor(doc.format), previewDoc ? 'h-12 w-12' : 'h-14 w-14']"><component :is="getFileIcon(doc.format)" class="h-6 w-6" /></div>
            <strong class="block truncate text-sm font-semibold text-zinc-900" :title="doc.name">{{ previewDoc ? doc.name.split('.')[0] : doc.name }}</strong>
            <span v-if="!previewDoc" class="mt-1 text-[11px] text-zinc-400">{{ doc.format }} · {{ doc.updatedAt }}</span>
            <div v-if="!previewDoc" class="mt-3 flex gap-1">
              <button type="button" class="rounded-md px-2 py-1 text-[11px] text-blue-600 hover:bg-blue-50" :aria-label="`预览 ${doc.name}`" @click.stop="openPreview(doc)">预览</button>
              <button v-if="selectedKb?.canEdit" type="button" class="rounded-md px-2 py-1 text-[11px] text-red-600 hover:bg-red-50" :aria-label="`删除 ${doc.name}`" @click.stop="deleteDoc(doc)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <aside v-if="previewDoc" class="fixed bottom-0 right-0 top-16 z-40 hidden w-[clamp(360px,38vw,640px)] flex-col border-l border-zinc-200 bg-white shadow-2xl lg:flex">
      <div class="flex h-14 items-center justify-between border-b border-zinc-200 px-5">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-zinc-950">文件预览</div>
          <div class="truncate text-xs text-zinc-400">修改于 {{ previewDoc.updatedAt }} · {{ previewDoc.uploadedBy }}</div>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" aria-label="关闭预览" @click="previewDoc = null">
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>
      <div class="grid min-h-0 flex-1 grid-cols-[132px_1fr] overflow-hidden">
        <nav class="border-r border-zinc-100 bg-zinc-50 px-4 py-5 text-sm">
          <div class="mb-3 truncate font-semibold text-blue-600">{{ previewDoc.name }}</div>
          <div class="space-y-3 text-zinc-500">
            <div class="border-l-4 border-zinc-400 pl-3">方案摘要</div>
            <div class="border-l-4 border-zinc-300 pl-3">预算分档</div>
            <div class="border-l-4 border-zinc-300 pl-3">执行建议</div>
          </div>
        </nav>
        <article class="overflow-y-auto px-7 py-7 text-zinc-900">
          <h1 class="text-2xl font-bold tracking-normal">B2B线下团购方案</h1>
          <section class="mt-8 space-y-4 text-base leading-8">
            <h2 class="border-l-4 border-zinc-900 pl-3 text-xl font-bold">方案摘要</h2>
            <p>本文档用于沉淀运动鞋团购成功案例，覆盖客户沟通、预算拆分、SKU 组合和门店现场快速响应话术。</p>
            <h2 class="border-l-4 border-zinc-900 pl-3 text-xl font-bold">预算分档</h2>
            <p>保守档优先控制预算，均衡档兼顾品牌与数量，品质档用于强调员工体验和客户满意度的场景。</p>
            <h2 class="border-l-4 border-zinc-900 pl-3 text-xl font-bold">执行建议</h2>
            <p>先用均衡档作为客户现场沟通初稿，再根据客户预算、品牌偏好和交付时间调整最终清单。</p>
          </section>
        </article>
      </div>
    </aside>

    <!-- Create KB modal -->
    <Teleport to="body">
      <div v-if="contextMenu" class="fixed inset-0 z-[55]" @click="contextMenu = null">
        <div class="absolute w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-sm shadow-2xl" :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }" @click.stop>
          <template v-if="contextMenu.type === 'kb' && contextKb">
            <div class="px-3 py-2 text-xs font-semibold text-zinc-400">知识库操作</div>
            <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="toggleKbPinned(contextKb); contextMenu = null"><Star class="h-4 w-4 text-amber-500" />收藏</button>
            <button v-if="contextKb.canEdit" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" @click="deleteKb(contextKb); contextMenu = null"><Trash2 class="h-4 w-4" />删除</button>
          </template>
          <template v-else-if="contextMenu.type === 'doc' && contextDoc">
            <div class="px-3 py-2 text-xs font-semibold text-zinc-400">文件操作</div>
            <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openPreview(contextDoc); contextMenu = null"><Eye class="h-4 w-4" />预览</button>
            <button v-if="selectedKb?.canEdit" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" @click="deleteDoc(contextDoc); contextMenu = null"><Trash2 class="h-4 w-4" />删除</button>
          </template>
          <template v-else-if="contextMenu.type === 'tree'">
            <div class="px-3 py-2 text-xs font-semibold text-zinc-400">目录操作</div>
            <button v-if="canContextCreateFolder" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openCreateFolderModalAt(contextMenu.id)">
              <Folder class="h-4 w-4" />新建文件夹
            </button>
            <button v-if="canContextCreateKb" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openCreateModalAt(contextMenu.id)">
              <BookOpen class="h-4 w-4 text-orange-500" />新建知识库
            </button>
          </template>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="createMode" class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4 py-8" @click.self="createMode = false">
        <div class="w-full max-w-md overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-zinc-200">
          <div class="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4">
            <div><div class="text-base font-semibold text-zinc-950">新建知识库</div><p class="mt-1 text-xs text-zinc-500">知识库创建在所选文件夹下</p></div>
            <button type="button" class="rounded-full p-2 text-zinc-500 hover:bg-zinc-100" @click="createMode = false"><X class="h-4 w-4" /></button>
          </div>
          <div class="space-y-4 px-6 py-5">
            <div><label class="text-xs font-medium text-zinc-600">知识库名称</label><input v-model="createKbName" aria-label="知识库名称" type="text" placeholder="输入知识库名称" class="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-orange-300" /></div>
            <div><label class="text-xs font-medium text-zinc-600">所属文件夹</label>
              <div class="mt-1.5 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                <button
                  v-for="option in folderOptions"
                  :key="option.id"
                  type="button"
                  class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition"
                  :class="(createKbFolderId || '__root__') === option.id ? 'bg-white text-blue-700 shadow-sm' : 'text-zinc-600 hover:bg-white'"
                  @click="createKbFolderId = option.id === '__root__' ? '' : option.id"
                >
                  <BookOpen v-if="isKnowledgeBaseNode(option.node)" class="h-3.5 w-3.5 shrink-0 text-orange-500" />
                  <Folder v-else class="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                  <span class="truncate" :style="{ paddingLeft: `${option.depth * 10}px` }">{{ option.label }}</span>
                </button>
              </div>
              <p class="mt-1.5 text-[11px] leading-4 text-zinc-400">公共空间知识库提交后进入审核队列，AI 可辅助判断，最终由人工审核。</p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 border-t border-zinc-200 px-6 py-4">
            <button type="button" class="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50" @click="createMode = false">取消</button>
            <button type="button" class="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600" aria-label="确认新建知识库" @click="createKnowledgeBase">创建</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="createFolderMode" class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4 py-8" @click.self="createFolderMode = false">
        <div class="w-full max-w-sm overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-zinc-200">
          <div class="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
            <div class="text-base font-semibold text-zinc-950">新建文件夹</div>
            <button type="button" class="rounded-full p-2 text-zinc-500 hover:bg-zinc-100" @click="createFolderMode = false"><X class="h-4 w-4" /></button>
          </div>
          <div class="px-5 py-4">
            <label class="text-xs font-medium text-zinc-600">文件夹名称</label>
            <input v-model="createFolderName" aria-label="文件夹名称" class="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-blue-300" placeholder="例如：投标资料" />
            <div class="mt-4">
              <div class="text-xs font-medium text-zinc-600">选择所属文件夹</div>
              <div class="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                <button
                  v-for="option in folderOptions"
                  :key="option.id"
                  type="button"
                  class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition"
                  :class="createFolderParentId === option.id ? 'bg-white text-blue-700 shadow-sm' : 'text-zinc-600 hover:bg-white'"
                  @click="createFolderParentId = option.id"
                >
                  <BookOpen v-if="isKnowledgeBaseNode(option.node)" class="h-3.5 w-3.5 shrink-0 text-orange-500" />
                  <Folder v-else class="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                  <span class="truncate" :style="{ paddingLeft: `${option.depth * 10}px` }">{{ option.label }}</span>
                </button>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4">
            <button type="button" class="rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-600" @click="createFolderMode = false">取消</button>
            <button type="button" class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white" aria-label="确认新建文件夹" @click="createFolder">确认</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="qaOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4 py-8" @click.self="qaOpen = false">
        <div class="flex h-[82vh] w-full max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-zinc-200">
          <div class="min-w-0 flex-1 bg-zinc-50 p-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-base font-semibold text-zinc-950">知识图谱与文档检索</div>
                <p class="mt-1 text-xs text-zinc-500">检索范围：{{ selectedKb?.name ?? activeSpaceLabel }} · 包含子文件夹 · 展示引用来源</p>
              </div>
              <button type="button" class="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50">隐藏对话</button>
            </div>
            <div class="mt-5 grid h-[calc(100%-4rem)] grid-rows-[1fr_auto] gap-4">
              <div class="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <div class="absolute left-8 top-8 rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">{{ selectedKb?.name ?? '当前知识库' }}</div>
                <div class="absolute left-[32%] top-[34%] h-28 w-28 rounded-full border border-orange-100 bg-orange-50/70" />
                <div class="absolute right-[24%] top-[18%] h-20 w-20 rounded-full border border-emerald-100 bg-emerald-50/70" />
                <div class="absolute bottom-[26%] left-[42%] h-24 w-24 rounded-full border border-violet-100 bg-violet-50/70" />
                <div class="grid h-full place-items-center text-center">
                  <div>
                    <Database class="mx-auto h-10 w-10 text-blue-500" />
                    <div class="mt-3 text-sm font-semibold text-zinc-800">已建立文档、字段、案例与预算节点关系</div>
                    <div class="mt-1 text-xs text-zinc-400">点击右侧问题后会同步高亮命中来源</div>
                  </div>
                </div>
              </div>
              <div>
                <div class="mb-2 text-xs font-semibold text-zinc-500">相关文件</div>
                <div class="grid gap-2 md:grid-cols-3">
                  <button v-for="source in qaSources" :key="source.doc.name" type="button" class="rounded-xl border border-zinc-200 bg-white p-3 text-left hover:border-blue-200 hover:bg-blue-50/40" @click="openPreview(source.doc)">
                    <div class="flex items-center gap-2">
                      <component :is="getFileIcon(source.doc.format)" class="h-4 w-4" :class="getIconColor(source.doc.format)" />
                      <span class="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-800">{{ source.doc.name }}</span>
                      <span class="text-[11px] text-blue-600">{{ source.score }}</span>
                    </div>
                    <p class="mt-2 line-clamp-2 text-[11px] leading-4 text-zinc-500">{{ source.reason }}</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <aside class="flex w-[390px] flex-col border-l border-zinc-200">
            <div class="flex h-14 items-center justify-between border-b border-zinc-200 px-4">
              <div>
                <div class="text-sm font-semibold text-zinc-950">知识问答助手</div>
                <div class="text-[11px] text-zinc-400">基于企业知识资产生成，可追溯引用</div>
              </div>
              <button type="button" class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" aria-label="关闭知识库问答" @click="qaOpen = false"><X class="h-4 w-4" /></button>
            </div>
            <div class="grid grid-cols-2 gap-2 p-4">
              <button class="rounded-xl border p-3 text-left text-sm font-medium" :class="qaMode === 'answer' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-zinc-200 text-zinc-700'" @click="qaMode = 'answer'">智能问答<div class="mt-1 text-[11px] font-normal text-zinc-400">自动识别意图</div></button>
              <button class="rounded-xl border p-3 text-left text-sm font-medium" :class="qaMode === 'search' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-zinc-200 text-zinc-700'" @click="qaMode = 'search'">知识检索<div class="mt-1 text-[11px] font-normal text-zinc-400">定位原文</div></button>
              <button class="rounded-xl border p-3 text-left text-sm font-medium" :class="qaMode === 'graph' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-zinc-200 text-zinc-700'" @click="qaMode = 'graph'">图谱分析<div class="mt-1 text-[11px] font-normal text-zinc-400">关系推理</div></button>
              <button class="rounded-xl border p-3 text-left text-sm font-medium" :class="qaMode === 'insight' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-zinc-200 text-zinc-700'" @click="qaMode = 'insight'">数据洞察<div class="mt-1 text-[11px] font-normal text-zinc-400">表格归纳</div></button>
            </div>
            <div class="border-y border-zinc-100 px-4 py-3">
              <div class="mb-2 text-xs font-semibold text-zinc-500">引用来源</div>
              <div class="space-y-1">
                <div v-for="source in qaSources" :key="source.doc.name" class="flex items-center gap-2 rounded-lg bg-zinc-50 px-2 py-1.5 text-[11px] text-zinc-500">
                  <FileText class="h-3.5 w-3.5 text-blue-500" />
                  <span class="min-w-0 flex-1 truncate">{{ source.doc.name }}</span>
                  <span class="text-blue-600">{{ source.score }}</span>
                </div>
              </div>
            </div>
            <div class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
              <div v-if="qaMessages.length === 0" class="space-y-2">
                <button v-for="question in ['这个知识库里有哪些可复用案例？', '预算分档应该怎么解释给客户？', '找出需要人工复核的风险点']" :key="question" type="button" class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left text-xs text-zinc-600 hover:border-blue-200 hover:bg-blue-50" @click="qaQuestion = question">{{ question }}</button>
              </div>
              <div v-for="(msg, index) in qaMessages" :key="index" class="rounded-2xl px-3 py-2" :class="msg.role === 'user' ? 'ml-8 bg-zinc-900 text-white' : 'mr-8 bg-zinc-100 text-zinc-700'">
                <div>{{ msg.content }}</div>
                <div v-if="msg.citations?.length" class="mt-2 flex flex-wrap gap-1">
                  <span v-for="citation in msg.citations" :key="citation" class="rounded-full bg-white px-2 py-0.5 text-[10px] text-blue-600">{{ citation }}</span>
                </div>
              </div>
            </div>
            <div class="border-t border-zinc-200 p-4">
              <textarea v-model="qaQuestion" class="min-h-24 w-full resize-none rounded-2xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-300" placeholder="输入您的问题..." @keydown.enter.exact.prevent="askKnowledgeBase" />
              <button type="button" class="mt-2 w-full rounded-xl bg-blue-600 py-2 text-sm font-medium text-white" @click="askKnowledgeBase">发送</button>
            </div>
          </aside>
        </div>
      </div>
    </Teleport>

    <!-- Upload modal -->
    <Teleport to="body">
      <div v-if="uploadModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4 py-8" @click.self="uploadModalOpen = false">
        <div class="w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-zinc-200">
          <div class="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4">
            <div>
              <div class="text-base font-semibold text-zinc-950">上传文件</div>
              <p class="mt-1 text-xs text-zinc-500">{{ selectedKb ? `上传到 ${selectedKb.name}` : '请先选择知识库，或上传后再移动归档' }}</p>
            </div>
            <button type="button" class="rounded-full p-2 text-zinc-500 hover:bg-zinc-100" @click="uploadModalOpen = false"><X class="h-4 w-4" /></button>
          </div>
          <div class="space-y-4 px-6 py-5">
            <label class="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center transition hover:border-blue-300 hover:bg-blue-50/50">
              <Upload class="h-8 w-8 text-blue-500" />
              <span class="mt-3 text-sm font-medium text-zinc-800">选择文件</span>
              <span class="mt-1 text-xs text-zinc-400">支持 PDF、Word、Excel、PPT、TXT、PNG、JPG，单个文件 20MB 内</span>
              <input class="hidden" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg" @change="handleUploadFiles" />
            </label>
            <div v-if="uploadFileNames.length" class="space-y-1 rounded-xl border border-zinc-200 bg-white p-2">
              <div v-for="name in uploadFileNames" :key="name" class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-zinc-600">
                <File class="h-3.5 w-3.5 text-zinc-400" />
                <span class="min-w-0 flex-1 truncate">{{ name }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 border-t border-zinc-200 px-6 py-4">
            <button type="button" class="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50" @click="uploadModalOpen = false">取消</button>
            <button type="button" class="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700" aria-label="确认上传文件" @click="confirmUpload">确认上传</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Move/Share modal -->
    <Teleport to="body">
      <div v-if="fileActionModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4 py-8" @click.self="cancelFileAction">
        <div class="w-full max-w-lg overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-zinc-200">
          <div class="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4">
            <div><div class="text-base font-semibold text-zinc-950">移动文件到知识库</div><p class="mt-1 text-xs text-zinc-500">选择目标知识库</p></div>
            <button type="button" class="rounded-full p-2 text-zinc-500 hover:bg-zinc-100" @click="cancelFileAction"><X class="h-4 w-4" /></button>
          </div>
          <div class="p-4"><div class="relative"><Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-300" /><input v-model="targetSearch" type="text" placeholder="搜索目标知识库..." class="w-full rounded-xl border border-zinc-200 py-2 pl-8 pr-3 text-sm text-zinc-700 placeholder:text-zinc-300 focus:border-orange-200 focus:outline-none" /></div></div>
          <div class="max-h-64 overflow-y-auto px-4 pb-4 space-y-1">
            <button v-for="kb in targetKbs" :key="kb.id" class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition" :class="targetKbId === kb.id ? 'bg-orange-50 border border-orange-200' : 'hover:bg-zinc-50 border border-transparent'" @click="targetKbId = kb.id">
              <Database class="h-4 w-4 text-violet-500 shrink-0" />
              <div class="min-w-0 flex-1"><div class="text-sm font-medium text-zinc-800">{{ kb.name }}</div><div class="text-[11px] text-zinc-400">{{ kb.space === 'public' ? '公共空间' : '个人空间' }} · {{ kb.docs }} 文档</div></div>
              <CheckSquare v-if="targetKbId === kb.id" class="h-4 w-4 text-orange-500 shrink-0" />
            </button>
          </div>
          <div class="flex items-center justify-end gap-2 border-t border-zinc-200 px-6 py-4">
            <button type="button" class="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50" @click="cancelFileAction">取消</button>
            <button type="button" class="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50" :disabled="!targetKbId" @click="confirmFileAction">确认</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
