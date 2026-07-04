<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import {
  AlertTriangle, ArrowUp, BookOpen, CheckCircle2, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, ChevronsRight, Copy, Database, Download, Eye, File,
  FileSpreadsheet, FileText, Folder, FolderKanban, GripVertical, LayoutGrid, List, MessageSquareText, MoreVertical, Pencil, Quote, RotateCw,
  Move, Plus, Search, Square, Star, Trash2, Upload, X,
} from 'lucide-vue-next'

type SpaceKey = 'public' | 'personal'
interface QaMessage { id: number; role: 'user' | 'assistant'; content: string; citations?: string[] }
interface KnowledgeBaseItem { id: string; name: string; docs: number; owner: string; department: string; visibility: string; space: SpaceKey; canEdit: boolean; pinned?: boolean; recent: string }
interface DocItem { name: string; format: string; status: string; updatedAt: string; uploadedBy: string }
interface TreeNode { id: string; label: string; type: 'folder' | 'file'; kbId?: string; docName?: string; isKnowledgeBase?: boolean; children?: TreeNode[] }
interface FolderOption { id: string; label: string; depth: number; node?: TreeNode }
interface TreeRow { id: string; node: TreeNode; depth: number; kbId?: string }

const sidebarVisible = ref(true)
const activeSpace = ref<SpaceKey>('public')
const selectedKbId = ref<string | null>(null)
const publicSpaceGroupOpen = ref(true)
const personalSpaceGroupOpen = ref(true)
const draggingSpaceFolderId = ref('')
const dragOverSpaceFolderId = ref('')
const draggingFavoriteKbId = ref('')
const dragOverFavoriteKbId = ref('')
const favoriteMenuKbId = ref('')
const selectedFileIds = ref<string[]>([])
const createMode = ref(false)
const createKbName = ref('')
const createKbSpace = ref<SpaceKey>('public')
const createKbFolderId = ref('')
const createFolderMode = ref(false)
const createFolderName = ref('')
const createFolderParentId = ref('__root__')
const expandedFolderSelectorIds = ref<string[]>([])
const expandedKbInTreeIds = ref<string[]>([])
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
const previewTabs = ref<DocItem[]>([])
const activeRightTab = ref('')
const renamingDocName = ref('')
const draftDocTitle = ref('')
const fileActionFeedback = ref('')
const exportMenuDocName = ref('')
const renamingKbId = ref('')
const draftKbTitle = ref('')
const contextMenu = ref<{ type: 'kb' | 'doc' | 'tree'; id: string; x: number; y: number } | null>(null)
const qaOpen = ref(false)
const qaQuestion = ref('')
const qaEditId = ref<number | null>(null)
const qaEditDraft = ref('')
const qaCopiedId = ref<number | null>(null)
const qaTextarea = ref<HTMLTextAreaElement | null>(null)
const highlightedSection = ref<string | null>(null)
let highlightTimer: ReturnType<typeof setTimeout> | null = null
const confirmModal = ref<{ show: boolean; title: string; message: string; confirmText?: string; danger?: boolean; onConfirm: () => void }>({ show: false, title: '', message: '', onConfirm: () => {} })

function getDocSection(docName: string): string {
  const map: Record<string, string> = {
    '考勤管理制度_v3.pdf': '方案摘要',
    '员工手册2026版.docx': '预算分档',
    '运动鞋团购成功案例.md': '执行建议',
  }
  return map[docName] || '方案摘要'
}
const qaMode = ref<'answer' | 'search' | 'graph' | 'insight'>('answer')
const qaMessages = ref<QaMessage[]>([])
const renamingFolderId = ref('')
const draftFolderTitle = ref('')
let fileActionToastTimer: number | undefined

const spaces = [
  { key: 'public' as const, label: '公共空间', desc: '全员可检索的集团知识' },
  { key: 'personal' as const, label: '个人空间', desc: '个人上传与私有资料' },
]

interface SpaceFolder { id: string; label: string; space: SpaceKey; kbIds: string[]; children?: SpaceFolder[] }

const defaultPublicFolders = reactive<SpaceFolder[]>([
  { id: 'default-public-group', label: '集团整体', space: 'public', kbIds: ['kb-public-1', 'kb-public-5'] },
  { id: 'default-public-product', label: '商品部', space: 'public', kbIds: ['kb-public-2'] },
  { id: 'default-public-b2c-online', label: 'B2C线上', space: 'public', kbIds: ['kb-public-6'] },
  { id: 'default-public-b2c-offline', label: 'B2C线下', space: 'public', kbIds: ['kb-public-3'] },
  { id: 'default-public-b2b', label: 'B2B', space: 'public', kbIds: ['kb-public-4'] },
  { id: 'default-public-vision', label: '视觉部', space: 'public', kbIds: ['kb-public-7'] },
  { id: 'default-public-engineering', label: '技术部', space: 'public', kbIds: ['kb-public-8'] },
  { id: 'default-public-finance', label: '财务部', space: 'public', kbIds: ['kb-public-9'] },
  { id: 'default-public-warehouse', label: '仓储部', space: 'public', kbIds: ['kb-public-10'] },
  { id: 'default-public-brand', label: '品牌部', space: 'public', kbIds: ['kb-public-11'] },
  { id: 'default-public-hr', label: '人力中心', space: 'public', kbIds: ['kb-public-12'] },
])

const defaultPersonalFolders = reactive<SpaceFolder[]>([
  { id: 'default-personal-daily', label: '日常工作', space: 'personal', kbIds: ['kb-personal-2', 'kb-personal-3'] },
  { id: 'default-personal-basics', label: '基础知识', space: 'personal', kbIds: ['kb-personal-3'] },
  { id: 'default-personal-profile', label: '个人资料', space: 'personal', kbIds: ['kb-personal-1', 'kb-personal-4'] },
])

const defaultSpaceFolders: Record<SpaceKey, SpaceFolder[]> = {
  public: defaultPublicFolders,
  personal: defaultPersonalFolders,
}

const knowledgeBases = reactive<Record<SpaceKey, KnowledgeBaseItem[]>>({
  public: [
    { id: 'kb-public-1', name: '集团制度知识库', docs: 128, owner: '集团运营', department: '行政部', visibility: '全员可见', space: 'public', canEdit: false, pinned: true, recent: '刚刚' },
    { id: 'kb-public-2', name: '商品基础资料库', docs: 86, owner: '商品中心', department: '商品部', visibility: '全员可见', space: 'public', canEdit: false, recent: '14:22' },
    { id: 'kb-public-3', name: '方案中心案例库', docs: 42, owner: '方案中心', department: '方案中心', visibility: '方案中心可编辑', space: 'public', canEdit: true, pinned: true, recent: '昨天 14:22' },
    { id: 'kb-public-4', name: '团购预算池', docs: 24, owner: '方案中心', department: '方案中心', visibility: '方案中心可编辑', space: 'public', canEdit: true, recent: '周日 13:27' },
    { id: 'kb-public-5', name: 'AI项目知识库', docs: 36, owner: 'AI运营', department: '集团整体', visibility: '全员可见', space: 'public', canEdit: true, pinned: true, recent: '今天 10:21' },
    { id: 'kb-public-6', name: '线上运营素材库', docs: 58, owner: 'B2C运营', department: 'B2C线上', visibility: '部门可见', space: 'public', canEdit: true, recent: '昨天 17:40' },
    { id: 'kb-public-7', name: '视觉规范与模板库', docs: 31, owner: '视觉部', department: '视觉部', visibility: '全员可见', space: 'public', canEdit: true, recent: '周一 09:12' },
    { id: 'kb-public-8', name: '技术项目资料库', docs: 44, owner: '技术部', department: '技术部', visibility: '部门可见', space: 'public', canEdit: true, recent: '昨天 20:16' },
    { id: 'kb-public-9', name: '财务制度资料库', docs: 22, owner: '财务部', department: '财务部', visibility: '全员可见', space: 'public', canEdit: false, recent: '06-28' },
    { id: 'kb-public-10', name: '仓储作业SOP库', docs: 39, owner: '仓储部', department: '仓储部', visibility: '部门可见', space: 'public', canEdit: true, recent: '06-27' },
    { id: 'kb-public-11', name: '品牌活动资料库', docs: 27, owner: '品牌部', department: '品牌部', visibility: '部门可见', space: 'public', canEdit: true, recent: '06-25' },
    { id: 'kb-public-12', name: '人力培训知识库', docs: 18, owner: '人力中心', department: '人力中心', visibility: '全员可见', space: 'public', canEdit: false, recent: '06-24' },
  ],
  personal: [
    { id: 'kb-personal-1', name: '我的客户资料', docs: 9, owner: '当前用户', department: '个人', visibility: '仅自己可见', space: 'personal', canEdit: true, pinned: true, recent: '今天 09:18' },
    { id: 'kb-personal-2', name: '临时方案草稿', docs: 5, owner: '当前用户', department: '个人', visibility: '仅自己可见', space: 'personal', canEdit: true, recent: '昨天 18:02' },
    { id: 'kb-personal-3', name: 'AI学习笔记', docs: 16, owner: '当前用户', department: '个人', visibility: '仅自己可见', space: 'personal', canEdit: true, pinned: false, recent: '今天 11:03' },
    { id: 'kb-personal-4', name: '客户素材归档', docs: 12, owner: '当前用户', department: '个人', visibility: '仅自己可见', space: 'personal', canEdit: true, pinned: false, recent: '周一 16:45' },
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
  'kb-public-5': [
    { name: 'AI工作台落地路线.md', format: 'MD', status: '已索引', updatedAt: '2026-06-29', uploadedBy: 'AI运营' },
    { name: '三大场景AI项目说明.pptx', format: 'PPTX', status: '已索引', updatedAt: '2026-06-26', uploadedBy: 'AI运营' },
  ],
  'kb-public-6': [
    { name: '线上活动复盘模板.docx', format: 'DOCX', status: '已索引', updatedAt: '2026-06-25', uploadedBy: 'B2C运营' },
    { name: '会员触达规则.xlsx', format: 'XLSX', status: '已索引', updatedAt: '2026-06-24', uploadedBy: 'B2C运营' },
  ],
  'kb-public-7': [
    { name: 'PPT母版规范.pptx', format: 'PPTX', status: '已索引', updatedAt: '2026-06-21', uploadedBy: '视觉部' },
    { name: '品牌色彩规范.pdf', format: 'PDF', status: '已索引', updatedAt: '2026-06-19', uploadedBy: '视觉部' },
  ],
  'kb-public-8': [
    { name: 'MCP接入说明.md', format: 'MD', status: '已索引', updatedAt: '2026-06-20', uploadedBy: '技术部' },
    { name: 'AI工作门户技术方案.docx', format: 'DOCX', status: '已索引', updatedAt: '2026-06-18', uploadedBy: '技术部' },
  ],
  'kb-public-9': [
    { name: '费用报销制度.pdf', format: 'PDF', status: '已索引', updatedAt: '2026-06-12', uploadedBy: '财务部' },
  ],
  'kb-public-10': [
    { name: '出入库作业SOP.pdf', format: 'PDF', status: '已索引', updatedAt: '2026-06-13', uploadedBy: '仓储部' },
  ],
  'kb-public-11': [
    { name: '品牌活动案例集.pptx', format: 'PPTX', status: '已索引', updatedAt: '2026-06-10', uploadedBy: '品牌部' },
  ],
  'kb-public-12': [
    { name: '新员工培训手册.docx', format: 'DOCX', status: '已索引', updatedAt: '2026-06-09', uploadedBy: '人力中心' },
  ],
  'kb-personal-1': [
    { name: '客户A需求记录.md', format: 'MD', status: '已索引', updatedAt: '2026-06-28', uploadedBy: '当前用户' },
  ],
  'kb-personal-2': [
    { name: '临时方案笔记.md', format: 'MD', status: '解析中', updatedAt: '2026-06-27', uploadedBy: '当前用户' },
  ],
  'kb-personal-3': [
    { name: 'AI提示词学习.md', format: 'MD', status: '已索引', updatedAt: '2026-06-30', uploadedBy: '当前用户' },
    { name: 'RAG实践笔记.docx', format: 'DOCX', status: '已索引', updatedAt: '2026-06-22', uploadedBy: '当前用户' },
  ],
  'kb-personal-4': [
    { name: '客户会议纪要.md', format: 'MD', status: '已索引', updatedAt: '2026-06-26', uploadedBy: '当前用户' },
    { name: '客户素材清单.xlsx', format: 'XLSX', status: '已索引', updatedAt: '2026-06-25', uploadedBy: '当前用户' },
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
            { id: 'folder-tuan-schemes', label: '团购方案', type: 'folder', kbId: 'kb-public-3', children: [
              { id: 'file-tuan-b2b', label: 'B2B团购方案模板.docx', type: 'file', kbId: 'kb-public-3', docName: 'B2B团购方案模板.docx' },
              { id: 'file-tuan-b2c', label: 'B2C团购方案模板.docx', type: 'file', kbId: 'kb-public-3', docName: 'B2C团购方案模板.docx' },
            ]},
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
        { id: 'personal-chaomu', label: '朝暮5草稿', type: 'folder', kbId: 'kb-personal-2', children: [{ id: 'personal-monitor', label: '策略监测草稿', type: 'file', kbId: 'kb-personal-2', docName: '临时方案笔记.md' }] },
      ],
    },
  ],
})

const currentSpaceItems = computed(() => knowledgeBases[activeSpace.value])
const selectedKb = computed(() => currentSpaceItems.value.find(kb => kb.id === selectedKbId.value))
const activeDefaultFolder = computed(() => defaultSpaceFolders[activeSpace.value].find(folder => folder.id === activeTreeId.value))
const rawDocs = computed(() => selectedKbId.value ? (allDocs[selectedKbId.value] ?? []) : [])
const docs = computed(() => {
  if (!selectedKbId.value) return []
  if (activeNode.value?.type === 'folder' && getNodeKbId(activeNode.value) === selectedKbId.value && !isKnowledgeBaseNode(activeNode.value)) {
    const names = collectDocNames(activeNode.value.children ?? [])
    return rawDocs.value.filter(doc => names.includes(doc.name))
  }
  return rawDocs.value
})
const activeSpaceLabel = computed(() => spaces.find(space => space.key === activeSpace.value)?.label ?? '')
const mainTitle = computed(() => selectedKb.value?.name ?? activeDefaultFolder.value?.label ?? activeNode.value?.label ?? activeSpaceLabel.value)
const activeDirectoryKbIds = computed(() => {
  if (activeDefaultFolder.value) return activeDefaultFolder.value.kbIds
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
  if (!q) return docs.value
  return docs.value.filter(d => {
    if (d.name.toLowerCase().includes(q)) return true
    if (d.tags?.some(t => t.toLowerCase().includes(q))) return true
    return false
  })
})
const currentFileTree = computed(() => fileTrees[activeSpace.value])
const activeNode = computed(() => findTreeNode(currentFileTree.value, activeTreeId.value))
const activeKbFolderNode = computed(() => {
  if (!selectedKbId.value) return undefined
  if (activeNode.value?.type === 'folder' && getNodeKbId(activeNode.value) === selectedKbId.value) return activeNode.value
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
const createKbContainerOptions = computed<FolderOption[]>(() => defaultSpaceFolders[createKbSpace.value].map(folder => ({
  id: folder.id,
  label: folder.label,
  depth: 0,
})))
const kbFolderOptions = computed<FolderOption[]>(() => {
  const expanded = expandedFolderSelectorIds.value
  return currentSpaceItems.value.flatMap((kb) => {
    const root = findKbTreeNode(fileTrees[activeSpace.value], kb.id)
    if (!root) return []
    const rows: FolderOption[] = [
      { id: root.id, label: kb.name, depth: 0, node: root },
    ]
    if (expanded.includes(root.id)) {
      rows.push(...collectFolderOptionsLevelByLevel(root.children ?? [], 1, expanded))
    }
    return rows
  })
})
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
const qaPanelWidth = 'clamp(360px,28vw,460px)'
const previewPanelWidth = 'clamp(390px,32vw,520px)'
const rightPanelOpen = computed(() => qaOpen.value || previewTabs.value.length > 0)
const isThreeColumn = computed(() => qaOpen.value && previewTabs.value.length > 0)
const activePreviewDoc = computed(() => previewTabs.value.find(doc => doc.name === activeRightTab.value) ?? previewDoc.value)
const mainRightMargin = computed(() => {
  const parts = [
    ...(qaOpen.value ? [qaPanelWidth] : []),
    ...(previewTabs.value.length && !isThreeColumn.value ? [previewPanelWidth] : []),
  ]
  return parts.length ? `calc(${parts.join(' + ')})` : '0px'
})

function getSpaceFolderKbs(folder: SpaceFolder) {
  return folder.kbIds
    .map(id => knowledgeBases[folder.space].find(kb => kb.id === id))
    .filter((kb): kb is KnowledgeBaseItem => Boolean(kb))
}

function getSpaceFolderTreeRows(folder: SpaceFolder): TreeRow[] {
  return getSpaceFolderKbs(folder).flatMap((kb) => {
    const root = findKbTreeNode(fileTrees[folder.space], kb.id) ?? {
      id: `virtual-${kb.id}`,
      label: kb.name,
      type: 'folder' as const,
      kbId: kb.id,
      isKnowledgeBase: true,
      children: [],
    }
    return [
      { id: `${folder.id}-${root.id}`, node: root, depth: 0, kbId: kb.id },
      ...(expandedTreeIds.value.includes(root.id) ? flattenTreeRows(root.children ?? [], 1, folder.id, kb.id) : []),
    ]
  })
}

function getKbTreeRows(kbId: string): TreeRow[] {
  const root = findKbTreeNode(fileTrees[activeSpace.value], kbId)
  if (!root) return []
  return flattenTreeRows(root.children ?? [], 1, 'kb', kbId)
}

function flattenTreeRows(nodes: TreeNode[], depth: number, prefix: string, inheritedKbId?: string): TreeRow[] {
  return nodes.flatMap((node) => {
    const kbId = node.kbId ?? inheritedKbId
    const row = { id: `${prefix}-${node.id}`, node, depth, kbId }
    return [
      row,
      ...(node.type === 'folder' && expandedTreeIds.value.includes(node.id)
        ? flattenTreeRows(node.children ?? [], depth + 1, prefix, kbId)
        : []),
    ]
  })
}

function treeRowHasChildren(row: TreeRow) {
  return row.node.type === 'folder' && Boolean(row.node.children?.length)
}

function isTreeRowExpanded(row: TreeRow) {
  return expandedTreeIds.value.includes(row.node.id)
}

function toggleTreeRowExpand(row: TreeRow) {
  if (!treeRowHasChildren(row)) return
  expandedTreeIds.value = isTreeRowExpanded(row)
    ? expandedTreeIds.value.filter(id => id !== row.node.id)
    : [...new Set([...expandedTreeIds.value, row.node.id])]
}

function openTreeRow(row: TreeRow) {
  activeSpace.value = findNodeSpace(row.node) ?? activeSpace.value
  activeTreeId.value = row.node.id
  selectedFileIds.value = []
  const kbId = row.kbId ?? getNodeKbId(row.node)
  if (row.node.type === 'file') {
    if (kbId) selectedKbId.value = kbId
    const doc = kbId ? (allDocs[kbId] ?? []).find(item => item.name === row.node.docName) : undefined
    if (doc) openPreview(doc)
    return
  }
  selectedKbId.value = kbId ?? null
  if (row.node.children?.length && isKnowledgeBaseNode(row.node)) {
    expandedTreeIds.value = [...new Set([...expandedTreeIds.value, row.node.id])]
  }
}

function isSpaceFolderExpanded(folder: SpaceFolder) {
  return expandedTreeIds.value.includes(folder.id)
}

function toggleSpaceFolderExpand(folder: SpaceFolder) {
  activeSpace.value = folder.space
  createKbSpace.value = folder.space
  expandedTreeIds.value = isSpaceFolderExpanded(folder)
    ? expandedTreeIds.value.filter(id => id !== folder.id)
    : [...new Set([...expandedTreeIds.value, folder.id])]
}

function openSpaceFolder(folder: SpaceFolder) {
  activeSpace.value = folder.space
  selectedKbId.value = null
  createKbSpace.value = folder.space
  selectedFileIds.value = []
  previewDoc.value = null
  fileSearch.value = ''
  kbSearch.value = ''
  activeTreeId.value = folder.id
  if (!isSpaceFolderExpanded(folder)) {
    expandedTreeIds.value = [...new Set([...expandedTreeIds.value, folder.id])]
  }
}

function reorderSpaceFolder(target: SpaceFolder) {
  if (!draggingSpaceFolderId.value || draggingSpaceFolderId.value === target.id) return
  const folders = defaultSpaceFolders[target.space]
  const from = folders.findIndex(folder => folder.id === draggingSpaceFolderId.value)
  const to = folders.findIndex(folder => folder.id === target.id)
  if (from < 0 || to < 0) return
  const [moved] = folders.splice(from, 1)
  folders.splice(to, 0, moved)
  dragOverSpaceFolderId.value = ''
}

function finishSpaceFolderDrag() {
  draggingSpaceFolderId.value = ''
  dragOverSpaceFolderId.value = ''
}

function reorderFavoriteKb(target: KnowledgeBaseItem) {
  if (!draggingFavoriteKbId.value || draggingFavoriteKbId.value === target.id) return
  const list = knowledgeBases[activeSpace.value]
  const from = list.findIndex(kb => kb.id === draggingFavoriteKbId.value)
  const to = list.findIndex(kb => kb.id === target.id)
  if (from < 0 || to < 0) return
  const [moved] = list.splice(from, 1)
  list.splice(to, 0, moved)
  dragOverFavoriteKbId.value = ''
}

function finishFavoriteDrag() {
  draggingFavoriteKbId.value = ''
  dragOverFavoriteKbId.value = ''
}

function openFavoriteMenu(kb: KnowledgeBaseItem, event: MouseEvent) {
  event.stopPropagation()
  favoriteMenuKbId.value = favoriteMenuKbId.value === kb.id ? '' : kb.id
}

function openKnowledgeQaFromKb(kb: KnowledgeBaseItem) {
  selectKb(kb.id)
  openQaPanel()
  favoriteMenuKbId.value = ''
}

function getKbTreeRootId(kbId: string): string {
  const root = findKbTreeNode(fileTrees[activeSpace.value], kbId)
  return root?.id ?? kbId
}

function switchSpace(space: SpaceKey) {
  activeSpace.value = space
  selectedKbId.value = null
  createKbSpace.value = space
  selectedFileIds.value = []
  previewDoc.value = null
  activeTreeId.value = ''
  expandedTreeIds.value = space === 'public'
    ? ['default-public-group', 'folder-shared', 'folder-solution-center']
    : ['default-personal-daily', 'personal-customer', 'personal-drafts']
}
function selectKb(id: string) {
  selectedKbId.value = id
  selectedFileIds.value = []
  previewDoc.value = null
  const node = findKbTreeNode(fileTrees[activeSpace.value], id)
  if (node) activeTreeId.value = node.id
  const folder = defaultSpaceFolders[activeSpace.value].find(item => item.kbIds.includes(id))
  if (folder) expandedTreeIds.value = [...new Set([...expandedTreeIds.value, folder.id])]
}

function deselectKb() {
  selectedKbId.value = null
  fileSearch.value = ''
}
function previewFileFromTree(row: TreeRow) {
  if (!row.kbId) return
  const docName = row.node.docName || row.node.label
  const docs = allDocs[row.kbId] || []
  const doc = docs.find((d: DocItem) => d.name === docName)
  if (doc) {
    selectKb(row.kbId)
    openPreview(doc)
  }
}

function toggleTreeNode(node: TreeNode) {
  activeTreeId.value = node.id
  const kbId = getNodeKbId(node)
  if (node.type === 'file' && kbId) {
    selectedKbId.value = kbId
    const doc = (allDocs[kbId] ?? []).find(item => item.name === node.docName) ?? allDocs[kbId]?.[0]
    if (doc) openPreview(doc)
    return
  }
  if (kbId) selectedKbId.value = kbId
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

function collectFolderOptionsLevelByLevel(nodes: TreeNode[], depth: number, expanded: string[]): FolderOption[] {
  return nodes.flatMap((node) => {
    if (node.type !== 'folder') return []
    const rows: FolderOption[] = [
      { id: node.id, label: node.label, depth, node },
    ]
    if (expanded.includes(node.id)) {
      rows.push(...collectFolderOptionsLevelByLevel(node.children ?? [], depth + 1, expanded))
    }
    return rows
  })
}

function getKbTreeChildren(kbId: string): TreeNode[] {
  const root = findKbTreeNode(fileTrees[activeSpace.value], kbId)
  return root?.children ?? []
}

function kbNodeHasFolderChildren(kbId: string): boolean {
  const root = findKbTreeNode(fileTrees[activeSpace.value], kbId)
  return (root?.children ?? []).some(c => c.type === 'folder')
}

function toggleKbTreeExpand(kbId: string, event: MouseEvent) {
  event.stopPropagation()
  const root = findKbTreeNode(fileTrees[activeSpace.value], kbId)
  if (!root) return
  toggleTreeNode(root)
}

function toggleFolderSelectorExpand(id: string) {
  const expanded = expandedFolderSelectorIds.value
  const index = expanded.indexOf(id)
  if (index >= 0) {
    expandedFolderSelectorIds.value = expanded.filter(i => i !== id)
  } else {
    expandedFolderSelectorIds.value = [...expanded, id]
  }
}
function findTreeNodeKbId(nodes: TreeNode[], id: string, inheritedKbId?: string): string | undefined {
  for (const node of nodes) {
    const kbId = node.kbId ?? inheritedKbId
    if (node.id === id) return kbId
    const childKbId = node.children ? findTreeNodeKbId(node.children, id, kbId) : undefined
    if (childKbId) return childKbId
  }
  return undefined
}
function getNodeKbId(node?: TreeNode) {
  if (!node) return undefined
  return node.kbId ?? findTreeNodeKbId(fileTrees[activeSpace.value], node.id)
}
function findNodeSpace(node: TreeNode): SpaceKey | undefined {
  return (Object.keys(fileTrees) as SpaceKey[]).find(space => Boolean(findTreeNode(fileTrees[space], node.id)))
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
  previewTabs.value = previewTabs.value.filter(item => !selectedSet.has(item.name))
  if (selectedSet.has(activeRightTab.value)) activeRightTab.value = previewTabs.value[0]?.name ?? ''
  selectedFileIds.value = []
  showFileActionToast(`已删除 ${deletedCount} 个文件`)
}
function confirmFileAction() {
  if (fileActionType.value === 'move' && targetKbId.value && selectedKbId.value) {
    const sourceId = selectedKbId.value
    const targetId = targetKbId.value
    const fileNames = [...selectedFileIds.value]
    const movedDocs = fileNames.map(name => {
      const sourceDoc = (allDocs[sourceId] ?? []).find(d => d.name === name)
      return sourceDoc ?? { name, format: name.split('.').pop()?.toUpperCase() ?? 'FILE', status: '已索引', updatedAt: '刚刚', uploadedBy: '当前用户' }
    })
    allDocs[sourceId] = (allDocs[sourceId] ?? []).filter(d => !fileNames.includes(d.name))
    allDocs[targetId] = [...movedDocs, ...(allDocs[targetId] ?? [])]
    fileNames.forEach(name => {
      if (previewDoc.value?.name === name) previewDoc.value = null
      previewTabs.value = previewTabs.value.filter(t => t.name !== name)
    })
    showFileActionToast(`已移动 ${fileNames.length} 个文件`)
  } else {
    showFileActionToast(selectedFileIds.value.length ? `已移动 ${selectedFileIds.value.length} 个文件` : '已完成移动')
  }
  fileActionModalOpen.value = false
  selectedFileIds.value = []
  fileActionType.value = null
}
function cancelFileAction() { fileActionModalOpen.value = false; fileActionType.value = null }
function openCreateModal() {
  if (selectedKb.value) {
    showFileActionToast('知识库内只能新建文件夹，不能新建知识库')
    return
  }
  createKbSpace.value = activeSpace.value
  createKbFolderId.value = activeDefaultFolder.value?.id ?? defaultSpaceFolders[activeSpace.value][0]?.id ?? ''
  createMode.value = true
}
function openCreateModalAt(parentId: string) {
  createKbSpace.value = activeSpace.value
  const targetFolder = defaultSpaceFolders[activeSpace.value].find(folder => folder.id === parentId)
  createKbFolderId.value = targetFolder?.id ?? defaultSpaceFolders[activeSpace.value][0]?.id ?? ''
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
  const defaultFolder = defaultSpaceFolders[createKbSpace.value].find(folder => folder.id === createKbFolderId.value)
  const container = createKbFolderId.value ? findTreeNode(targetTree, createKbFolderId.value) : undefined
  const newNode: TreeNode = { id: `folder-${newKb.id}`, label: newKb.name, type: 'folder', kbId: newKb.id, isKnowledgeBase: true, children: [] }
  if (defaultFolder) defaultFolder.kbIds.push(newKb.id)
  if (container?.children) container.children.push(newNode)
  else targetTree.push(newNode)
  createKbName.value = ''; createMode.value = false
  const containerId = container?.id
  switchSpace(createKbSpace.value)
  if (containerId) expandedTreeIds.value = [...new Set([...expandedTreeIds.value, containerId])]
  if (defaultFolder) expandedTreeIds.value = [...new Set([...expandedTreeIds.value, defaultFolder.id])]
  selectedKbId.value = newKb.id; activeTreeId.value = newNode.id
}
function openUploadModal() {
  if (!selectedKb.value) {
    showFileActionToast('请先进入具体知识库后再上传文件')
    return
  }
  uploadModalOpen.value = true
  uploadFileNames.value = []
}
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
    if (selectedKbId.value) {
      allDocs[selectedKbId.value] = [doc, ...(allDocs[selectedKbId.value] ?? [])]
      const targetNode = activeNode.value?.type === 'folder' && activeNode.value.kbId === selectedKbId.value
        ? activeNode.value
        : findKbTreeNode(fileTrees[activeSpace.value], selectedKbId.value)
      if (targetNode) {
        targetNode.children = targetNode.children ?? []
        targetNode.children.unshift({
          id: `file-upload-${Date.now()}-${index}`,
          label: name,
          type: 'file',
          kbId: selectedKbId.value,
          docName: name,
        })
        expandedTreeIds.value = [...new Set([...expandedTreeIds.value, targetNode.id])]
      }
    }
    return { id: `upload-${Date.now()}-${index}`, name, status: activeSpace.value === 'public' ? 'reviewing' as const : 'success' as const, progress: 100, doc }
  })
  uploadTasks.value = [...tasks, ...uploadTasks.value].slice(0, 4)
  uploadModalOpen.value = false
  uploadFileNames.value = []
}
function dismissUploadTask(id: string) {
  uploadTasks.value = uploadTasks.value.filter(task => task.id !== id)
}
function getFileIcon(f: string) { if (f === 'XLSX') return FileSpreadsheet; if (f === 'DOCX' || f === 'MD' || f === 'PDF') return FileText; return File }
function getIconColor(f: string) { if (f === 'XLSX') return 'text-emerald-500 bg-emerald-50'; if (f === 'DOCX') return 'text-blue-500 bg-blue-50'; if (f === 'PDF') return 'text-red-500 bg-red-50'; if (f === 'MD') return 'text-violet-500 bg-violet-50'; return 'text-zinc-500 bg-zinc-50' }
function openPreview(doc: DocItem) {
  previewDoc.value = doc
  previewTabs.value = [doc, ...previewTabs.value.filter(item => item.name !== doc.name)].slice(0, 5)
  activeRightTab.value = doc.name
  qaOpen.value = true
}
function openQaPanel() {
  qaOpen.value = true
}
function closeRightTab(id: string) {
  previewTabs.value = previewTabs.value.filter(doc => doc.name !== id)
  if (previewDoc.value?.name === id) previewDoc.value = previewTabs.value[0] ?? null
  if (activeRightTab.value === id) activeRightTab.value = previewTabs.value[0]?.name ?? ''
}
function closePreviewPanel() {
  previewTabs.value = []
  activeRightTab.value = ''
  previewDoc.value = null
  highlightedSection.value = null
}
function closeQaPanel() {
  qaOpen.value = false
}
function beginRenameDoc(doc: DocItem) { renamingDocName.value = doc.name; draftDocTitle.value = doc.name }
function commitRenameDoc(doc: DocItem) {
  const title = draftDocTitle.value.trim()
  if (title && selectedKbId.value) {
    const oldName = doc.name
    doc.name = title
    // Update the doc in allDocs
    const docsList = allDocs[selectedKbId.value]
    if (docsList) {
      const idx = docsList.findIndex(d => d.name === oldName)
      if (idx >= 0) docsList[idx] = doc
    }
    // Update file tree node labels
    const updateTreeLabel = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.docName === oldName) node.docName = title
        if (node.label === oldName) node.label = title
        if (node.children) updateTreeLabel(node.children)
      }
    }
    updateTreeLabel(fileTrees[activeSpace.value])
    // Sync preview tab
    if (previewDoc.value?.name === oldName) previewDoc.value = doc
    previewTabs.value = previewTabs.value.map(t => t.name === oldName ? doc : t)
    if (activeRightTab.value === oldName) activeRightTab.value = title
  }
  renamingDocName.value = ''; draftDocTitle.value = ''
}
function exportDoc(_doc?: DocItem | null) {}
function chooseExportFormat(_format?: string) {}
function moveDoc(doc?: DocItem) {
  if (doc) selectedFileIds.value = [doc.name]
  targetKbId.value = ''
  targetSearch.value = ''
  fileActionType.value = 'move'
  fileActionModalOpen.value = true
  contextMenu.value = null
}
function deleteDoc(doc: DocItem) {
  if (!selectedKbId.value) return
  allDocs[selectedKbId.value] = (allDocs[selectedKbId.value] ?? []).filter(item => item.name !== doc.name)
  selectedFileIds.value = selectedFileIds.value.filter(name => name !== doc.name)
  if (previewDoc.value?.name === doc.name) previewDoc.value = null
  previewTabs.value = previewTabs.value.filter(item => item.name !== doc.name)
  if (activeRightTab.value === doc.name) activeRightTab.value = previewTabs.value[0]?.name ?? ''
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
  removeTreeNodesByPredicate(fileTrees[kb.space], node => node.kbId === kb.id && node.type === 'folder')
  delete allDocs[kb.id]
  if (selectedKbId.value === kb.id) selectedKbId.value = null
  if (activeTreeId.value && !findTreeNode(fileTrees[activeSpace.value], activeTreeId.value)) activeTreeId.value = ''
  showFileActionToast(`已删除知识库：${kb.name}`)
}
function updateTreeLabel(nodes: TreeNode[], kbId: string, label: string) {
  for (const node of nodes) {
    if (node.kbId === kbId && node.type === 'folder') node.label = label
    if (node.children) updateTreeLabel(node.children, kbId, label)
  }
}
function openCreateFolderModal() {
  const fallbackKbId = selectedKb.value?.id ?? displayedKnowledgeBases.value[0]?.id ?? currentSpaceItems.value[0]?.id
  if (!fallbackKbId) {
    showFileActionToast('请先创建知识库后再新建文件夹')
    return
  }
  if (!selectedKb.value) selectKb(fallbackKbId)
  createFolderName.value = ''
  const selectedKbRoot = findKbTreeNode(fileTrees[activeSpace.value], fallbackKbId)
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
function showConfirm(title: string, message: string, onConfirm: () => void, danger = true) {
  confirmModal.value = { show: true, title, message, confirmText: '确认', danger, onConfirm }
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
const contextTreeDoc = computed(() => {
  const node = contextTreeNode.value
  if (!node || node.type !== 'file' || !node.kbId || !node.docName) return undefined
  return (allDocs[node.kbId] ?? []).find(doc => doc.name === node.docName)
})
const canContextCreateKb = computed(() => Boolean(
  contextMenu.value?.id === '__root__' ||
  (contextTreeNode.value && !contextTreeNode.value.kbId && contextTreeDepth.value === 0)
))
const canContextCreateFolder = computed(() => contextMenu.value?.type === 'tree' && Boolean(contextTreeNode.value?.type === 'folder' && contextTreeNode.value.kbId))
function deleteTreeDoc(node: TreeNode) {
  if (!node.kbId || !node.docName) return
  allDocs[node.kbId] = (allDocs[node.kbId] ?? []).filter(doc => doc.name !== node.docName)
  if (previewDoc.value?.name === node.docName) previewDoc.value = null
  selectedFileIds.value = selectedFileIds.value.filter(name => name !== node.docName)
  showFileActionToast(`已删除 ${node.docName}`)
  contextMenu.value = null
}
function collectDocsByKb(nodes: TreeNode[], result: Record<string, string[]> = {}) {
  for (const node of nodes) {
    if (node.type === 'file' && node.kbId && node.docName) {
      result[node.kbId] = [...(result[node.kbId] ?? []), node.docName]
    }
    if (node.children?.length) collectDocsByKb(node.children, result)
  }
  return result
}
function removeTreeNodesByPredicate(nodes: TreeNode[], predicate: (node: TreeNode) => boolean): boolean {
  const index = nodes.findIndex(predicate)
  if (index >= 0) {
    nodes.splice(index, 1)
    return true
  }
  for (const node of nodes) {
    if (node.children && removeTreeNodesByPredicate(node.children, predicate)) return true
  }
  return false
}
function isNodeInside(parent: TreeNode, targetId: string): boolean {
  if (parent.id === targetId) return true
  return Boolean(parent.children?.some(child => isNodeInside(child, targetId)))
}
function canDeleteFolder(node?: TreeNode) {
  if (!node || node.type !== 'folder') return false
  if (isKnowledgeBaseNode(node)) {
    const kb = node.kbId ? [...knowledgeBases.public, ...knowledgeBases.personal].find(item => item.id === node.kbId) : undefined
    return Boolean(kb?.canEdit)
  }
  if (node.kbId) {
    const kb = [...knowledgeBases.public, ...knowledgeBases.personal].find(item => item.id === node.kbId)
    return Boolean(kb?.canEdit)
  }
  return true
}
function deleteTreeFolder(node: TreeNode) {
  if (!canDeleteFolder(node)) return
  if (isKnowledgeBaseNode(node) && node.kbId) {
    const kb = [...knowledgeBases.public, ...knowledgeBases.personal].find(item => item.id === node.kbId)
    if (kb) deleteKb(kb)
    contextMenu.value = null
    return
  }
  const docMap = collectDocsByKb([node])
  Object.entries(docMap).forEach(([kbId, names]) => {
    const deleted = new Set(names)
    allDocs[kbId] = (allDocs[kbId] ?? []).filter(doc => !deleted.has(doc.name))
    if (previewDoc.value && deleted.has(previewDoc.value.name)) previewDoc.value = null
    selectedFileIds.value = selectedFileIds.value.filter(name => !deleted.has(name))
  })
  const wasActive = activeTreeId.value ? isNodeInside(node, activeTreeId.value) : false
  removeTreeNodesByPredicate(fileTrees[activeSpace.value], item => item.id === node.id)
  if (wasActive) {
    activeTreeId.value = ''
    if (node.kbId === selectedKbId.value) selectedKbId.value = null
  }
  showFileActionToast(`已删除文件夹：${node.label}`)
  contextMenu.value = null
}
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
function openSourceCitation(citation: string) {
  for (const kbId of Object.keys(allDocs)) {
    const doc = allDocs[kbId].find((d: DocItem) => d.name === citation)
    if (doc) { openPreview(doc); return }
  }
  // search partial match
  for (const kbId of Object.keys(allDocs)) {
    const doc = allDocs[kbId].find((d: DocItem) => d.name.includes(citation))
    if (doc) { openPreview(doc); return }
  }
}

function copyQaMessage(msg: QaMessage) {
  qaCopiedId.value = msg.id
  navigator.clipboard?.writeText(msg.content)
  setTimeout(() => { qaCopiedId.value = null }, 2000)
}

function beginEditQaMessage(msg: QaMessage) {
  qaEditId.value = msg.id
  qaEditDraft.value = msg.content
}

function commitEditQaMessage(msg: QaMessage) {
  const text = qaEditDraft.value.trim()
  if (text) {
    msg.content = text
    const idx = qaMessages.value.findIndex(m => m.id === msg.id)
    if (idx >= 0) qaMessages.value = qaMessages.value.slice(0, idx + 1)
    qaEditId.value = null
    qaEditDraft.value = ''
    qaQuestion.value = text
    askKnowledgeBase()
  } else {
    qaEditId.value = null
    qaEditDraft.value = ''
  }
}

function retryQaMessage(msg: QaMessage) {
  const idx = qaMessages.value.findIndex(m => m.id === msg.id)
  if (idx >= 0) qaMessages.value = qaMessages.value.slice(0, idx)
  qaQuestion.value = msg.content
  askKnowledgeBase()
}

function citeQaMessage(msg: QaMessage) {
  qaQuestion.value = `引用上一条回答继续：${msg.content.slice(0, 60)}...`
}

function resizeQaTextarea() {
  const el = qaTextarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 192) + 'px'
  const lines = el.value.split('\n').length
  el.rows = Math.min(lines, 8)
}

type QaSegment = { type: 'text'; text: string } | { type: 'ref'; index: number }

function parseQaContent(raw: string): QaSegment[] {
  const parts: QaSegment[] = []
  const re = /\[\[ref:(\d+)\]\]/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    if (match.index > last) {
      parts.push({ type: 'text', text: raw.slice(last, match.index) })
    }
    parts.push({ type: 'ref', index: parseInt(match[1], 10) })
    last = re.lastIndex
  }
  if (last < raw.length) {
    parts.push({ type: 'text', text: raw.slice(last) })
  }
  return parts
}

function openCitationRef(index: number, citations?: string[]) {
  const docName = citations?.[index - 1]
  if (!docName) return
  // Clear previous highlight before setting new one
  highlightedSection.value = null
  if (highlightTimer) clearTimeout(highlightTimer)
  void highlightedSection.value
  // Set new highlight (persists until next citation click)
  highlightedSection.value = getDocSection(docName)
  for (const kbId of Object.keys(allDocs)) {
    const doc = allDocs[kbId].find((d: DocItem) => d.name === docName)
    if (doc) { openPreview(doc); return }
  }
}

function askKnowledgeBase() {
  const text = qaQuestion.value.trim()
  if (!text) return
  qaMessages.value.push({ id: Date.now(), role: 'user', content: text })
  const citations = qaSources.value.map(source => source.doc.name)
  qaMessages.value.push({
    id: Date.now() + 1,
    role: 'assistant',
    content: `已在「${selectedKb.value?.name ?? activeSpaceLabel.value}」中完成检索。根据[[ref:1]]，员工加班与休假需提前报备审批。具体可查看[[ref:2]]相关条款。如需进一步按行业场景适配，可参考[[ref:3]]中的执行口径。`,
    citations: ['考勤管理制度_v3.pdf', '员工手册2026版.docx', '运动鞋团购成功案例.md'],
  })
  qaQuestion.value = ''
  if (qaTextarea.value) { qaTextarea.value.rows = 1; qaTextarea.value.style.height = 'auto' }
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
    <!-- Sidebar collapsed: only expand button -->
    <div v-if="!sidebarVisible" class="fixed left-3 top-[4.75rem] z-40 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white/95 p-1 shadow-sm backdrop-blur">
      <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-zinc-100" aria-label="展开侧边栏" @click="sidebarVisible = true">
        <ChevronsRight class="h-4 w-4" />
      </button>
    </div>
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-[clamp(286px,21vw,400px)] flex-col overflow-hidden border-r border-zinc-200 bg-white transition-transform duration-300 lg:top-16 lg:h-[calc(100vh-4rem)]"
      :class="sidebarVisible ? 'translate-x-0' : '-translate-x-full'"
    >
      <div data-testid="knowledge-sidebar-subheader" class="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-3">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-zinc-900">知识中心</div>
          <div class="mt-0.5 text-[11px] text-zinc-400">按空间和文件树浏览</div>
        </div>
        <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:bg-zinc-50" aria-label="折叠侧边栏" @click="sidebarVisible = false">
          <ChevronLeft class="h-4 w-4" />
        </button>
      </div>
      <div class="border-b border-zinc-100 px-2 py-2">
        <button type="button" class="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50" aria-label="新建知识库" @click="openCreateModal">
          <BookOpen class="h-4 w-4 text-orange-500" />
          <span>新建知识库</span>
        </button>
        <button type="button" class="mt-1 flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50" aria-label="新建文件夹" @click="openCreateFolderModal">
          <Folder class="h-4 w-4 text-zinc-500" />
          <span>新建文件夹</span>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-2" data-testid="knowledge-tree-panel" @contextmenu.prevent="openTreeBlankContextMenu($event)">
        <button type="button" class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-50" @click="switchSpace('public'); publicSpaceGroupOpen = !publicSpaceGroupOpen">
          <ChevronDown v-if="publicSpaceGroupOpen" class="h-3.5 w-3.5 text-zinc-500" />
          <ChevronRight v-else class="h-3.5 w-3.5 text-zinc-500" />
          <Folder class="h-4 w-4 text-amber-500" />
          <span>公共空间</span>
          <span class="ml-auto text-[11px] font-normal text-zinc-400">{{ defaultPublicFolders.length }}</span>
        </button>
        <div v-if="publicSpaceGroupOpen" class="ml-5 mt-1 space-y-0.5">
          <div v-for="folder in defaultPublicFolders" :key="folder.id" class="space-y-0.5">
            <div
              class="group flex items-center rounded-lg"
              :class="activeSpace === folder.space && activeTreeId === folder.id && !selectedKbId ? 'bg-blue-50 text-blue-700' : ''"
              draggable="true"
              @dragstart="draggingSpaceFolderId = folder.id"
              @dragover.prevent="dragOverSpaceFolderId = folder.id"
              @drop.prevent="reorderSpaceFolder(folder)"
              @dragend="finishSpaceFolderDrag"
              @contextmenu.prevent="openTreeBlankContextMenu($event)"
            >
              <GripVertical class="h-4 w-4 shrink-0 cursor-grab text-zinc-300 opacity-0 transition group-hover:opacity-100" :class="dragOverSpaceFolderId === folder.id ? 'opacity-100 text-blue-500' : ''" />
              <button type="button" class="grid h-7 w-5 shrink-0 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" :aria-label="`${isSpaceFolderExpanded(folder) ? '收起' : '展开'}${folder.label}`" @click.stop="toggleSpaceFolderExpand(folder)">
                <ChevronDown v-if="isSpaceFolderExpanded(folder)" class="h-3.5 w-3.5" />
                <ChevronRight v-else class="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-sm text-zinc-600 hover:bg-zinc-50"
                :class="activeSpace === folder.space && activeTreeId === folder.id && !selectedKbId ? 'text-blue-700' : ''"
                @click="openSpaceFolder(folder)"
              >
                <Folder class="h-4 w-4 shrink-0 text-zinc-500" />
                <span class="truncate">{{ folder.label }}</span>
              </button>
            </div>
            <div v-if="isSpaceFolderExpanded(folder)" class="ml-8 space-y-0.5">
              <div
                v-for="kb in getSpaceFolderKbs(folder)"
                :key="kb.id"
              >
                <div class="flex items-center" :class="selectedKbId === kb.id ? 'bg-blue-50 text-blue-700 rounded-lg' : ''">
                  <button
                    v-if="kbNodeHasFolderChildren(kb.id)"
                    type="button"
                    class="grid h-7 w-7 shrink-0 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                    @click="toggleKbTreeExpand(kb.id, $event)"
                  >
                    <ChevronDown v-if="expandedTreeIds.includes(getKbTreeRootId(kb.id))" class="h-3.5 w-3.5" />
                    <ChevronRight v-else class="h-3.5 w-3.5" />
                  </button>
                  <span v-else class="inline-block w-7 shrink-0" />
                  <button
                    type="button"
                    class="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-xs transition"
                    :class="selectedKbId === kb.id ? '' : 'text-zinc-600 hover:bg-zinc-50'"
                    @click="selectKb(kb.id)"
                  >
                    <BookOpen class="h-3.5 w-3.5 shrink-0 text-orange-500" />
                    <span class="truncate">{{ kb.name }}</span>
                  </button>
                </div>
                <div v-if="expandedTreeIds.includes(getKbTreeRootId(kb.id))" class="ml-6 border-l border-zinc-100 text-xs">
                  <div v-for="row in getKbTreeRows(kb.id)" :key="row.id" class="flex items-center gap-0.5 ml-1">
                    <button
                      v-if="treeRowHasChildren(row)"
                      type="button"
                      class="grid h-6 w-5 shrink-0 place-items-center rounded text-zinc-400 hover:text-zinc-700"
                      @click.stop="toggleTreeNode(row.node)"
                    >
                      <ChevronDown v-if="expandedTreeIds.includes(row.node.id)" class="h-3 w-3" />
                      <ChevronRight v-else class="h-3 w-3" />
                    </button>
                    <span v-else class="inline-block w-5 shrink-0" />
                    <button
                      v-if="row.node.type === 'file'"
                      type="button"
                      class="flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1 cursor-pointer hover:bg-zinc-100"
                      @click="previewFileFromTree(row)"
                      @contextmenu.prevent="openTreeContextMenu(row.node.id, $event)"
                    >
                      <FileText class="h-3 w-3 shrink-0 text-zinc-300" />
                      <span class="truncate text-zinc-500">{{ row.node.label }}</span>
                    </button>
                    <div v-else class="flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1" @contextmenu.prevent="openTreeContextMenu(row.node.id, $event)">
                      <Folder class="h-3 w-3 shrink-0 text-zinc-400" />
                      <span class="truncate text-zinc-600">{{ row.node.label }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6" />
        <button type="button" class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-50" @click="switchSpace('personal'); personalSpaceGroupOpen = !personalSpaceGroupOpen">
          <ChevronDown v-if="personalSpaceGroupOpen" class="h-3.5 w-3.5 text-zinc-500" />
          <ChevronRight v-else class="h-3.5 w-3.5 text-zinc-500" />
          <Folder class="h-4 w-4 text-emerald-500" />
          <span>个人空间</span>
          <span class="ml-auto text-[11px] font-normal text-zinc-400">{{ defaultPersonalFolders.length }}</span>
        </button>
        <div v-if="personalSpaceGroupOpen" class="ml-5 mt-1 space-y-0.5">
          <div v-for="folder in defaultPersonalFolders" :key="folder.id" class="space-y-0.5">
            <div
              class="group flex items-center rounded-lg"
              :class="activeSpace === folder.space && activeTreeId === folder.id && !selectedKbId ? 'bg-blue-50 text-blue-700' : ''"
              draggable="true"
              @dragstart="draggingSpaceFolderId = folder.id"
              @dragover.prevent="dragOverSpaceFolderId = folder.id"
              @drop.prevent="reorderSpaceFolder(folder)"
              @dragend="finishSpaceFolderDrag"
              @contextmenu.prevent="openTreeBlankContextMenu($event)"
            >
              <GripVertical class="h-4 w-4 shrink-0 cursor-grab text-zinc-300 opacity-0 transition group-hover:opacity-100" :class="dragOverSpaceFolderId === folder.id ? 'opacity-100 text-blue-500' : ''" />
              <button type="button" class="grid h-7 w-5 shrink-0 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" :aria-label="`${isSpaceFolderExpanded(folder) ? '收起' : '展开'}${folder.label}`" @click.stop="toggleSpaceFolderExpand(folder)">
                <ChevronDown v-if="isSpaceFolderExpanded(folder)" class="h-3.5 w-3.5" />
                <ChevronRight v-else class="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-sm text-zinc-600 hover:bg-zinc-50"
                :class="activeSpace === folder.space && activeTreeId === folder.id && !selectedKbId ? 'text-blue-700' : ''"
                @click="openSpaceFolder(folder)"
              >
                <Folder class="h-4 w-4 shrink-0 text-zinc-500" />
                <span class="truncate">{{ folder.label }}</span>
              </button>
            </div>
            <div v-if="isSpaceFolderExpanded(folder)" class="ml-8 space-y-0.5">
              <div
                v-for="kb in getSpaceFolderKbs(folder)"
                :key="kb.id"
              >
                <div class="flex items-center" :class="selectedKbId === kb.id ? 'bg-blue-50 text-blue-700 rounded-lg' : ''">
                  <button
                    v-if="kbNodeHasFolderChildren(kb.id)"
                    type="button"
                    class="grid h-7 w-7 shrink-0 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                    @click="toggleKbTreeExpand(kb.id, $event)"
                  >
                    <ChevronDown v-if="expandedTreeIds.includes(getKbTreeRootId(kb.id))" class="h-3.5 w-3.5" />
                    <ChevronRight v-else class="h-3.5 w-3.5" />
                  </button>
                  <span v-else class="inline-block w-7 shrink-0" />
                  <button
                    type="button"
                    class="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-xs transition"
                    :class="selectedKbId === kb.id ? '' : 'text-zinc-600 hover:bg-zinc-50'"
                    @click="selectKb(kb.id)"
                  >
                    <BookOpen class="h-3.5 w-3.5 shrink-0 text-orange-500" />
                    <span class="truncate">{{ kb.name }}</span>
                  </button>
                </div>
                <div v-if="expandedTreeIds.includes(getKbTreeRootId(kb.id))" class="ml-6 border-l border-zinc-100 text-xs">
                  <div v-for="row in getKbTreeRows(kb.id)" :key="row.id" class="flex items-center gap-0.5 ml-1">
                    <button
                      v-if="treeRowHasChildren(row)"
                      type="button"
                      class="grid h-6 w-5 shrink-0 place-items-center rounded text-zinc-400 hover:text-zinc-700"
                      @click.stop="toggleTreeNode(row.node)"
                    >
                      <ChevronDown v-if="expandedTreeIds.includes(row.node.id)" class="h-3 w-3" />
                      <ChevronRight v-else class="h-3 w-3" />
                    </button>
                    <span v-else class="inline-block w-5 shrink-0" />
                    <button
                      v-if="row.node.type === 'file'"
                      type="button"
                      class="flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1 cursor-pointer hover:bg-zinc-100"
                      @click="previewFileFromTree(row)"
                      @contextmenu.prevent="openTreeContextMenu(row.node.id, $event)"
                    >
                      <FileText class="h-3 w-3 shrink-0 text-zinc-300" />
                      <span class="truncate text-zinc-500">{{ row.node.label }}</span>
                    </button>
                    <div v-else class="flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1" @contextmenu.prevent="openTreeContextMenu(row.node.id, $event)">
                      <Folder class="h-3 w-3 shrink-0 text-zinc-400" />
                      <span class="truncate text-zinc-600">{{ row.node.label }}</span>
                    </div>
                  </div>
                </div>
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
      :class="{ 'knowledge-main-pane--compact': rightPanelOpen }"
      :style="{
        marginLeft: sidebarVisible ? 'clamp(286px,21vw,400px)' : '0px',
        marginRight: mainRightMargin,
      }"
    >
      <div data-testid="knowledge-main-header" class="flex min-h-14 items-center border-b border-zinc-200 bg-white px-4" :class="isThreeColumn ? 'justify-between' : ''">
        <template v-if="isThreeColumn">
          <div class="flex min-w-0 items-center gap-1.5 text-sm">
            <button type="button" class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800" @click="closePreviewPanel">
              <ChevronLeft class="h-4 w-4" />
              <span>返回</span>
            </button>
            <span class="text-zinc-300">/</span>
            <span class="truncate text-zinc-600">{{ selectedKb?.name ?? '知识库' }}</span>
            <span class="text-zinc-300">/</span>
            <span class="truncate font-semibold text-zinc-950">{{ activePreviewDoc?.name }}</span>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <button type="button" class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" aria-label="关闭预览" @click="closePreviewPanel">
              <X class="h-4 w-4" />
            </button>
          </div>
        </template>
        <template v-else>
        <div class="flex min-w-0 items-center gap-1.5 text-sm">
          <!-- Sidebar toggle -->
          <button v-if="!sidebarVisible" type="button" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" aria-label="展开侧边栏" @click="sidebarVisible = true">
            <ChevronsRight class="h-4 w-4" />
          </button>
          <button type="button" class="rounded-md px-1.5 py-0.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800" @click="deselectKb">{{ selectedKb ? activeSpaceLabel : '空间总览' }}</button>
          <template v-if="selectedKb">
            <span class="text-zinc-300">/</span>
            <span class="truncate font-semibold text-zinc-950">{{ mainTitle }}</span>
          </template>
          <template v-else>
            <span class="truncate font-semibold text-zinc-950">{{ activeNode?.label ?? activeSpaceLabel }}</span>
          </template>
        </div>
        <div class="ml-auto flex items-center justify-end gap-2">
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
        </template>
      </div>

      <div class="flex-1 overflow-y-auto p-4 md:p-6">
        <div v-if="isThreeColumn && previewTabs.length > 1" class="flex gap-1 overflow-x-auto border-b border-zinc-100 bg-zinc-50 px-3 py-2">
          <button v-for="tab in previewTabs" :key="tab.name" type="button" class="inline-flex h-8 max-w-[180px] shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium" :class="activeRightTab === tab.name ? 'bg-white text-blue-700 ring-1 ring-zinc-200' : 'text-zinc-500 hover:bg-white'" @click="activeRightTab = tab.name">
            <FileText class="h-3.5 w-3.5" />
            <span class="truncate">{{ tab.name }}</span>
            <X class="h-3.5 w-3.5 rounded hover:bg-zinc-100" @click.stop="closeRightTab(tab.name)" />
          </button>
        </div>
        <div v-if="isThreeColumn && activePreviewDoc" class="grid min-h-0 flex-1 grid-cols-[132px_1fr] overflow-hidden">
          <nav class="border-r border-zinc-100 bg-zinc-50 px-4 py-5 text-sm">
            <div class="mb-3 truncate font-semibold text-blue-600">{{ activePreviewDoc.name }}</div>
            <div class="space-y-3 text-zinc-500">
              <div class="border-l-4 pl-3 transition-colors duration-500" :class="highlightedSection === '方案摘要' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-zinc-400'">方案摘要</div>
              <div class="border-l-4 pl-3 transition-colors duration-500" :class="highlightedSection === '预算分档' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-zinc-300'">预算分档</div>
              <div class="border-l-4 pl-3 transition-colors duration-500" :class="highlightedSection === '执行建议' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-zinc-300'">执行建议</div>
            </div>
          </nav>
          <article class="overflow-y-auto px-7 py-7 text-zinc-900">
            <div class="mb-5 text-xs text-zinc-400">修改于 {{ activePreviewDoc.updatedAt }} · {{ activePreviewDoc.uploadedBy }}</div>
            <h1 class="text-2xl font-bold tracking-normal">{{ activePreviewDoc.name?.replace(/\.[^.]+$/,'') }}</h1>
            <section class="mt-8 space-y-4 text-base leading-8">
              <h2 class="border-l-4 pl-3 text-xl font-bold transition-colors duration-500" :class="highlightedSection === '方案摘要' ? 'border-amber-500 bg-amber-50/50 text-amber-800' : 'border-zinc-900'">方案摘要</h2>
              <p>本文档用於沉淀运动鞋团购成功案例，覆盖客户沟通、预算拆分、SKU 组合和门店现场快速响应话术。</p>
              <h2 class="border-l-4 pl-3 text-xl font-bold transition-colors duration-500" :class="highlightedSection === '预算分档' ? 'border-amber-500 bg-amber-50/50 text-amber-800' : 'border-zinc-900'">预算分档</h2>
              <p>保守档优先控制预算，均衡档兼顾品牌与数量，品质档用於强调员工体验和客户满意度的场景。</p>
              <h2 class="border-l-4 pl-3 text-xl font-bold transition-colors duration-500" :class="highlightedSection === '执行建议' ? 'border-amber-500 bg-amber-50/50 text-amber-800' : 'border-zinc-900'">执行建议</h2>
              <p>先用均衡档作为客户现场沟通初稿，再根据客户预算、品牌偏好和交付时间调整最终清单。</p>
            </section>
          </article>
        </div>
        <div v-else-if="!selectedKb" class="space-y-8">
          <section>
            <div class="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold text-zinc-950">收藏知识库</h2>
                <p class="mt-1 text-xs text-zinc-400">当前目录：{{ activeNode?.label ?? activeSpaceLabel }}</p>
              </div>
              <span class="rounded-full bg-white px-2 py-1 text-xs text-zinc-400">{{ displayedKnowledgeBases.length }} 个知识库</span>
            </div>
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              <div
                v-for="kb in pinnedKnowledgeBases"
                :key="kb.id"
                class="group relative min-h-20 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50/40"
                :class="dragOverFavoriteKbId === kb.id ? 'border-blue-400 bg-blue-50' : ''"
                draggable="true"
                @dragstart="draggingFavoriteKbId = kb.id"
                @dragover.prevent="dragOverFavoriteKbId = kb.id"
                @drop.prevent="reorderFavoriteKb(kb)"
                @dragend="finishFavoriteDrag"
                @contextmenu.prevent="openKbContextMenu(kb, $event)"
              >
                <GripVertical class="absolute left-1/2 top-1 h-4 w-4 -translate-x-1/2 cursor-grab text-zinc-300 opacity-0 transition group-hover:opacity-100" />
                <button type="button" class="flex w-full items-center gap-3 text-left" @click="selectKb(kb.id)">
                  <div class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-500">
                    <BookOpen class="h-6 w-6" />
                  </div>
                  <div class="min-w-0 flex-1 pr-8">
                    <div class="truncate text-sm font-semibold text-zinc-900">{{ kb.name }}</div>
                    <div class="mt-1 truncate text-xs text-zinc-500">{{ kb.recent }} {{ kb.owner }}更新</div>
                  </div>
                </button>
                <button
                  type="button"
                  class="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 opacity-0 transition hover:bg-zinc-100 hover:text-zinc-700 group-hover:opacity-100"
                  aria-label="更多知识库操作"
                  @click="openFavoriteMenu(kb, $event)"
                >
                  <MoreVertical class="h-4 w-4" />
                </button>
                <div v-if="favoriteMenuKbId === kb.id" class="absolute right-2 top-11 z-30 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-sm shadow-xl">
                  <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click.stop="toggleKbPinned(kb); favoriteMenuKbId = ''">
                    <Star class="h-4 w-4 text-amber-500" />取消收藏
                  </button>
                </div>
              </div>
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

        <div v-if="selectedKb && !isThreeColumn" data-testid="knowledge-action-row" class="mb-3 flex flex-wrap items-center gap-2">
          <button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50" aria-label="新建文件夹" @click="openCreateFolderModal">
            <Folder class="h-4 w-4" />
            <span>新建文件夹</span>
          </button>
          <button class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50" aria-label="上传文件" @click="openUploadModal">
            <Upload class="h-4 w-4" />
            <span>上传文件</span>
          </button>
        </div>

        <!-- Action bar -->
        <div v-if="selectedFileIds.length > 0" class="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <span class="text-xs font-medium text-blue-700">已选 {{ selectedFileIds.length }} 项</span>
          <div class="ml-auto flex items-center gap-1">
            <button class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50" @click="deleteSelectedDocs"><Trash2 class="h-3 w-3" />删除</button>
          </div>
        </div>

        <!-- File list -->
        <div v-if="selectedKb && !hasKnowledgeItems && !isThreeColumn" class="flex flex-col items-center justify-center py-24 text-center">
          <Database class="h-12 w-12 text-zinc-200" />
          <p class="mt-3 text-sm text-zinc-400">此知识库暂无文档</p>
          <button class="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-medium text-white hover:bg-orange-600" @click="openUploadModal"><Upload class="h-3.5 w-3.5" />上传第一个文档</button>
        </div>

        <div v-else-if="selectedKb && fileView === 'list'" class="overflow-hidden rounded-xl border border-zinc-200 bg-white" v-show="!isThreeColumn">
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
                    <button v-if="canDeleteFolder(folder)" type="button" class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50" :aria-label="`删除文件夹 ${folder.label}`" @click.stop="deleteTreeFolder(folder)">
                      <Trash2 class="h-3.5 w-3.5" /><span v-if="!previewDoc">删除</span>
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

        <div v-else-if="selectedKb" class="grid gap-3" :class="previewDoc ? 'grid-cols-[repeat(auto-fill,minmax(96px,1fr))]' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'" v-show="!isThreeColumn">
          <div v-for="folder in visibleFolderNodes" :key="folder.id" data-testid="knowledge-folder-card" class="relative cursor-pointer rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50/30" @click="toggleTreeNode(folder)">
            <div class="mb-3 mt-3 flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-50 text-zinc-600 shadow-sm">
              <Folder class="h-7 w-7" />
            </div>
            <strong class="block truncate text-sm font-semibold text-zinc-900" :title="folder.label">{{ folder.label }}</strong>
            <span v-if="!previewDoc" class="mt-1 text-[11px] text-zinc-400">文件夹 · {{ folder.children?.length ?? 0 }} 项</span>
            <div v-if="!previewDoc" class="mt-3 flex gap-1">
              <button type="button" class="rounded-md px-2 py-1 text-[11px] text-blue-600 hover:bg-blue-50" :aria-label="`打开文件夹 ${folder.label}`" @click.stop="toggleTreeNode(folder)">打开</button>
              <button v-if="selectedKb?.canEdit && !folder.kbId" type="button" class="rounded-md px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-100" :aria-label="`重命名文件夹 ${folder.label}`" @click.stop="beginRenameFolder(folder)">改名</button>
              <button v-if="canDeleteFolder(folder)" type="button" class="rounded-md px-2 py-1 text-[11px] text-red-600 hover:bg-red-50" :aria-label="`删除文件夹 ${folder.label}`" @click.stop="deleteTreeFolder(folder)">删除</button>
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

    <aside
      v-if="previewTabs.length && !isThreeColumn"
      class="fixed bottom-0 top-16 z-40 hidden flex-col border-l border-zinc-200 bg-white lg:flex"
      :style="{ right: qaOpen ? qaPanelWidth : '0px', width: previewPanelWidth }"
    >
      <div class="flex h-14 items-center justify-between gap-3 border-b border-zinc-200 px-4">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-zinc-950">文件预览</div>
          <div class="truncate text-xs text-zinc-400">{{ activePreviewDoc?.name ?? '已打开文件' }}</div>
        </div>
        <button type="button" class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" aria-label="关闭文件预览" @click="closePreviewPanel">
          <X class="h-4 w-4" />
        </button>
      </div>
      <div class="flex min-h-11 gap-1 overflow-x-auto border-b border-zinc-100 bg-zinc-50 px-3 py-2">
        <button v-for="tab in previewTabs" :key="tab.name" type="button" class="inline-flex h-8 max-w-[180px] shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium" :class="activeRightTab === tab.name ? 'bg-white text-blue-700 ring-1 ring-zinc-200' : 'text-zinc-500 hover:bg-white'" @click="activeRightTab = tab.name">
          <FileText class="h-3.5 w-3.5" />
          <span class="truncate">{{ tab.name }}</span>
          <X class="h-3.5 w-3.5 rounded hover:bg-zinc-100" @click.stop="closeRightTab(tab.name)" />
        </button>
      </div>

      <div v-if="activePreviewDoc" class="grid min-h-0 flex-1 grid-cols-[132px_1fr] overflow-hidden">
        <nav class="border-r border-zinc-100 bg-zinc-50 px-4 py-5 text-sm">
          <div class="mb-3 truncate font-semibold text-blue-600">{{ activePreviewDoc.name }}</div>
          <div class="space-y-3 text-zinc-500">
            <div class="border-l-4 pl-3 transition-colors duration-500" :class="highlightedSection === '方案摘要' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-zinc-400'">方案摘要</div>
            <div class="border-l-4 pl-3 transition-colors duration-500" :class="highlightedSection === '预算分档' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-zinc-300'">预算分档</div>
            <div class="border-l-4 pl-3 transition-colors duration-500" :class="highlightedSection === '执行建议' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-zinc-300'">执行建议</div>
          </div>
        </nav>
        <article class="overflow-y-auto px-7 py-7 text-zinc-900">
          <div class="mb-5 text-xs text-zinc-400">修改于 {{ activePreviewDoc.updatedAt }} · {{ activePreviewDoc.uploadedBy }}</div>
          <h1 class="text-2xl font-bold tracking-normal">B2B线下团购方案</h1>
          <section class="mt-8 space-y-4 text-base leading-8">
            <h2 class="border-l-4 pl-3 text-xl font-bold transition-colors duration-500" :class="highlightedSection === '方案摘要' ? 'border-amber-500 bg-amber-50/50 text-amber-800' : 'border-zinc-900'">方案摘要</h2>
            <p>本文档用于沉淀运动鞋团购成功案例，覆盖客户沟通、预算拆分、SKU 组合和门店现场快速响应话术。</p>
            <h2 class="border-l-4 pl-3 text-xl font-bold transition-colors duration-500" :class="highlightedSection === '预算分档' ? 'border-amber-500 bg-amber-50/50 text-amber-800' : 'border-zinc-900'">预算分档</h2>
            <p>保守档优先控制预算，均衡档兼顾品牌与数量，品质档用于强调员工体验和客户满意度的场景。</p>
            <h2 class="border-l-4 pl-3 text-xl font-bold transition-colors duration-500" :class="highlightedSection === '执行建议' ? 'border-amber-500 bg-amber-50/50 text-amber-800' : 'border-zinc-900'">执行建议</h2>
            <p>先用均衡档作为客户现场沟通初稿，再根据客户预算、品牌偏好和交付时间调整最终清单。</p>
          </section>
        </article>
      </div>
    </aside>

    <aside
      v-if="qaOpen"
      class="fixed bottom-0 right-0 top-16 z-50 hidden flex-col border-l border-zinc-200 bg-white lg:flex"
      :style="{ width: qaPanelWidth }"
    >
      <div class="flex h-14 items-center justify-between border-b border-transparent px-4">
        <div class="flex min-w-0 items-center gap-3">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-white">
            <MessageSquareText class="h-4 w-4" />
          </div>
          <div class="min-w-0">
            <div class="text-sm font-semibold text-zinc-950">小智</div>
            <div class="truncate text-xs text-zinc-400">知识库问答助手</div>
          </div>
        </div>
        <button type="button" class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" aria-label="关闭小智" @click="closeQaPanel">
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="grid grid-cols-2 gap-2 border-b border-transparent px-4 py-3">
        <button class="rounded-lg border p-2.5 text-left text-xs font-medium" :class="qaMode === 'answer' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-zinc-200 text-zinc-700'" @click="qaMode = 'answer'">智能问答<div class="mt-1 text-[11px] font-normal text-zinc-400">组织答案</div></button>
        <button class="rounded-lg border p-2.5 text-left text-xs font-medium" :class="qaMode === 'search' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-zinc-200 text-zinc-700'" @click="qaMode = 'search'">知识检索<div class="mt-1 text-[11px] font-normal text-zinc-400">定位原文</div></button>
        <button class="rounded-lg border p-2.5 text-left text-xs font-medium" :class="qaMode === 'graph' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-zinc-200 text-zinc-700'" @click="qaMode = 'graph'">图谱分析<div class="mt-1 text-[11px] font-normal text-zinc-400">关系推理</div></button>
        <button class="rounded-lg border p-2.5 text-left text-xs font-medium" :class="qaMode === 'insight' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-zinc-200 text-zinc-700'" @click="qaMode = 'insight'">数据洞察<div class="mt-1 text-[11px] font-normal text-zinc-400">表格归纳</div></button>
      </div>

      <div class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
        <div v-if="qaMessages.length === 0" class="space-y-4">
          <div class="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4">
            <div class="text-lg font-semibold text-zinc-950">你好，我是小智</div>
            <div class="mt-2 text-sm leading-6 text-zinc-500">我可以基于当前知识库和已打开文件回答问题，并在回答里保留可追溯引用。</div>
          </div>
          <div class="space-y-2">
            <button v-for="question in ['这个知识库里有哪些可复用案例？', '预算分档应该怎么解释给客户？', '找出需要人工复核的风险点']" :key="question" type="button" class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-xs text-zinc-600 hover:border-blue-200 hover:bg-blue-50" @click="qaQuestion = question">{{ question }}</button>
          </div>
        </div>
        <div v-for="(msg, index) in qaMessages" :key="msg.id || index" class="group/qa" :class="msg.role === 'user' ? 'ml-8' : 'mr-8'">
          <div v-if="qaEditId === msg.id" class="flex items-start gap-2">
            <textarea v-model="qaEditDraft" class="flex-1 resize-none rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none" rows="2" @keydown.enter.exact.prevent="commitEditQaMessage(msg)" @keydown.esc.prevent="qaEditId = null; qaEditDraft = ''" />
            <button class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white" @click="commitEditQaMessage(msg)">保存</button>
          </div>
          <div v-else class="rounded-2xl px-3 py-2.5 leading-6" :class="msg.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'">
            <div>
              <template v-for="(seg, i) in parseQaContent(msg.content)" :key="i">
                <span v-if="seg.type === 'text'">{{ seg.text }}</span>
                <sup
                  v-else
                  class="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700 hover:bg-blue-200"
                  @click="openCitationRef(seg.index, msg.citations)"
                >{{ seg.index }}</sup>
              </template>
            </div>
            <div v-if="msg.citations?.length" class="mt-3 space-y-0.5 border-t border-zinc-100 pt-2 text-[11px]">
              <div v-for="(cit, idx) in msg.citations" :key="cit" class="flex items-center gap-1.5 text-zinc-500">
                <sup class="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[9px] font-semibold text-zinc-500">{{ idx + 1 }}</sup>
                <span class="truncate">{{ cit }}</span>
              </div>
            </div>
          </div>
          <div v-if="qaEditId !== msg.id" class="mt-1 flex gap-1.5 opacity-0 transition group-hover/qa:opacity-100" :class="msg.role === 'user' ? 'justify-end' : ''">
            <template v-if="msg.role === 'user'">
              <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" aria-label="复制" @click="copyQaMessage(msg)">
                <CheckCircle2 v-if="qaCopiedId === msg.id" class="h-3.5 w-3.5 text-emerald-500" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
              <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" aria-label="编辑" @click="beginEditQaMessage(msg)">
                <Pencil class="h-3.5 w-3.5" />
              </button>
              <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" aria-label="重试" @click="retryQaMessage(msg)">
                <RotateCw class="h-3.5 w-3.5" />
              </button>
            </template>
            <template v-else>
              <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" aria-label="复制" @click="copyQaMessage(msg)">
                <CheckCircle2 v-if="qaCopiedId === msg.id" class="h-3.5 w-3.5 text-emerald-500" />
                <Copy v-else class="h-3.5 w-3.5" />
              </button>
              <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" aria-label="引用" @click="citeQaMessage(msg)">
                <Quote class="h-3.5 w-3.5" />
              </button>
            </template>
          </div>
        </div>
      </div>

      <div class="border-t border-transparent p-3">
        <div class="flex items-start gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
          <textarea
            ref="qaTextarea"
            v-model="qaQuestion"
            class="max-h-[192px] min-h-[36px] flex-1 resize-none bg-transparent py-1 text-sm leading-6 outline-none placeholder:text-zinc-400"
            placeholder="问小智任何问题..."
            rows="1"
            @input="resizeQaTextarea"
            @keydown.enter.exact.prevent="askKnowledgeBase"
          />
          <button
            type="button"
            class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition"
            :class="qaQuestion.trim() ? 'bg-zinc-950 text-white hover:bg-zinc-800' : 'cursor-not-allowed bg-zinc-100 text-zinc-300'"
            :disabled="!qaQuestion.trim()"
            @click="askKnowledgeBase"
          >
            <ArrowUp class="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Create KB modal -->
    <Teleport to="body">
      <div v-if="contextMenu" class="fixed inset-0 z-[55]" @click="contextMenu = null">
        <div class="absolute w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-sm shadow-2xl" :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }" @click.stop>
          <!-- 右键根空间空白处 -->
          <template v-if="contextMenu.type === 'tree' && contextMenu.id === '__root__'">
            <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="createSiblingSpaceFolder(); contextMenu = null"><Folder class="h-4 w-4" />新建空间文件夹</button>
          </template>
          <!-- 右键知识库行 -->
          <template v-else-if="contextMenu.type === 'kb' && contextKb">
            <div class="px-3 py-2 text-xs font-semibold text-zinc-400">{{ contextKb.name }}</div>
            <button v-if="contextKb.canEdit" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openCreateFolderModalAt(contextKb.id); contextMenu = null"><Folder class="h-4 w-4" />新建文件夹</button>
            <button v-if="contextKb.canEdit" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openKbSettings(contextKb); contextMenu = null"><Settings class="h-4 w-4 text-blue-500" />设置</button>
            <button v-if="contextKb.canEdit" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" @click="deleteKb(contextKb); contextMenu = null"><Trash2 class="h-4 w-4" />删除</button>
          </template>
          <!-- 右键空间文件夹行 -->
          <template v-else-if="contextMenu.type === 'space-folder' && contextSpaceFolder">
            <div class="px-3 py-2 text-xs font-semibold text-zinc-400">{{ contextSpaceFolder.label }}</div>
            <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openCreateModalAt(contextSpaceFolder.id); contextMenu = null"><BookOpen class="h-4 w-4 text-orange-500" />新建知识库</button>
            <button v-if="canManageSpaceFolder(contextSpaceFolder)" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" @click="deleteSpaceFolder(contextSpaceFolder); contextMenu = null"><Trash2 class="h-4 w-4" />删除</button>
          </template>
          <!-- 右键文件（文件列表中） -->
          <template v-else-if="contextMenu.type === 'doc' && contextDoc">
            <div class="px-3 py-2 text-xs font-semibold text-zinc-400">文件操作</div>
            <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openPreview(contextDoc); contextMenu = null"><Eye class="h-4 w-4" />预览</button>
            <button v-if="selectedKb?.canEdit" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openFileSettings(contextDoc); contextMenu = null"><Settings class="h-4 w-4 text-blue-500" />设置</button>
            <button v-if="selectedKb?.canEdit" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" @click="deleteDoc(contextDoc); contextMenu = null"><Trash2 class="h-4 w-4" />删除</button>
          </template>
          <!-- 右键文件树节点 -->
          <template v-else-if="contextMenu.type === 'tree' && contextTreeNode && contextMenu.id !== '__root__'">
            <template v-if="contextTreeNode?.type === 'file' && contextTreeDoc">
              <div class="px-3 py-2 text-xs font-semibold text-zinc-400">{{ contextTreeDoc.name }}</div>
              <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openPreview(contextTreeDoc); contextMenu = null"><Eye class="h-4 w-4" />预览</button>
              <button v-if="canEditTreeNode(contextTreeNode)" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openFileSettings(contextTreeDoc); contextMenu = null"><Settings class="h-4 w-4 text-blue-500" />设置</button>
              <button v-if="canEditTreeNode(contextTreeNode)" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" @click="deleteTreeDoc(contextTreeNode)"><Trash2 class="h-4 w-4" />删除</button>
            </template>
            <template v-else-if="contextTreeNode?.type === 'folder'">
              <div class="px-3 py-2 text-xs font-semibold text-zinc-400">{{ contextTreeNode.label }}</div>
              <button v-if="canEditTreeNode(contextTreeNode)" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openCreateFolderModalAt(contextMenu.id); contextMenu = null"><Folder class="h-4 w-4" />新建文件夹</button>
              <button v-if="canDeleteFolder(contextTreeNode)" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" @click="deleteTreeFolder(contextTreeNode)"><Trash2 class="h-4 w-4" />删除</button>
            </template>
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
                  v-for="option in createKbContainerOptions"
                  :key="option.id"
                  type="button"
                  class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition"
                  :class="createKbFolderId === option.id ? 'bg-white text-blue-700 shadow-sm' : 'text-zinc-600 hover:bg-white'"
                  @click="createKbFolderId = option.id"
                >
                  <Folder class="h-3.5 w-3.5 shrink-0 text-zinc-600" />
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
                <div
                  v-for="option in kbFolderOptions"
                  :key="option.id"
                  class="flex items-center rounded-lg"
                  :class="createFolderParentId === option.id ? 'bg-white text-blue-700 shadow-sm' : ''"
                >
                  <button
                    v-if="option.node?.children?.some((c: TreeNode) => c.type === 'folder')"
                    type="button"
                    class="grid h-7 w-7 shrink-0 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                    @click.stop="toggleFolderSelectorExpand(option.id)"
                  >
                    <ChevronDown v-if="expandedFolderSelectorIds.includes(option.id)" class="h-3.5 w-3.5" />
                    <ChevronRight v-else class="h-3.5 w-3.5" />
                  </button>
                  <span v-else class="inline-block w-7 shrink-0" />
                  <button
                    type="button"
                    class="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition"
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
          </div>
          <div class="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4">
            <button type="button" class="rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-600" @click="createFolderMode = false">取消</button>
            <button type="button" class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white" aria-label="确认新建文件夹" @click="createFolder">确认</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Floating upload tasks -->
    <Teleport to="body">
      <div v-if="uploadTasks.length" class="fixed bottom-5 right-5 z-[60] w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl shadow-zinc-300/50">
        <div class="mb-3 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <Upload class="h-4 w-4 text-blue-600" />
            任务运行中
          </div>
          <button type="button" class="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="关闭上传任务" @click="uploadTasks = []">
            <X class="h-4 w-4" />
          </button>
        </div>
        <div class="space-y-2">
          <div v-for="task in uploadTasks" :key="task.id" class="rounded-xl bg-zinc-50 px-3 py-2">
            <div class="flex items-center gap-2 text-xs">
              <FileText class="h-4 w-4 shrink-0 text-blue-500" />
              <span class="min-w-0 flex-1 truncate font-medium text-zinc-800">{{ task.name }}</span>
              <span class="text-zinc-400">{{ task.progress }}%</span>
              <button type="button" class="rounded-md p-0.5 text-zinc-400 hover:bg-white hover:text-zinc-700" :aria-label="`关闭任务 ${task.name}`" @click="dismissUploadTask(task.id)">
                <X class="h-3.5 w-3.5" />
              </button>
            </div>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
              <div class="h-full rounded-full" :class="task.status === 'failed' ? 'bg-rose-500' : task.status === 'reviewing' ? 'bg-amber-500' : 'bg-blue-500'" :style="{ width: `${task.progress}%` }" />
            </div>
            <div class="mt-2 flex items-center justify-between gap-2 text-[11px]">
              <span class="font-medium" :class="task.status === 'success' ? 'text-emerald-600' : task.status === 'reviewing' ? 'text-amber-600' : task.status === 'failed' ? 'text-rose-600' : 'text-blue-600'">
                {{ task.status === 'success' ? '上传成功' : task.status === 'reviewing' ? '上传成功 · 待人工审核' : task.status === 'failed' ? '上传失败' : '上传中' }}
              </span>
              <button v-if="task.doc" type="button" class="rounded-md px-2 py-1 text-blue-600 hover:bg-white" @click="openPreview(task.doc)">查看</button>
            </div>
          </div>
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

    <!-- 二次确认弹窗 -->
    <Teleport to="body">
      <div v-if="confirmModal.show" class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/40 px-4 py-8" @click.self="confirmModal.show = false">
        <div class="w-full max-w-sm rounded-2xl bg-white shadow-xl">
          <div class="px-6 pt-6">
            <div class="mb-1 flex items-center gap-2">
              <AlertTriangle v-if="confirmModal.danger" class="h-5 w-5 text-red-500" />
              <h3 class="text-base font-semibold text-zinc-900">{{ confirmModal.title }}</h3>
            </div>
            <p class="mt-2 text-sm leading-relaxed text-zinc-600">{{ confirmModal.message }}</p>
          </div>
          <div class="flex items-center justify-end gap-2 border-t border-zinc-100 px-6 py-4 mt-5">
            <button type="button" class="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50" @click="confirmModal.show = false">取消</button>
            <button type="button" :class="confirmModal.danger ? 'rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600' : 'rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600'" @click="confirmModal.onConfirm(); confirmModal.show = false">{{ confirmModal.confirmText ?? '确认' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
