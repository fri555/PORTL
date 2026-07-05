<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import ThinkingChain from '@/components/workspace/ThinkingChain.vue'
import {
  AlertTriangle, ArrowUp, BookOpen, CheckCircle2, CheckSquare, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsRight, Copy, Database, Download, Eye, File,
  FileSpreadsheet, FileText, Folder, FolderKanban, GripVertical, LayoutGrid, List, Globe, Lock, MessageSquareText,
  MoreVertical, Pencil, Quote, RotateCw,
  Calendar, History, Move, Plus, Search, Settings, ShieldCheck, Square, Star, ThumbsDown, ThumbsUp, Trash2, Upload, X,
} from 'lucide-vue-next'
import type { PermissionRole, PermissionEntry, SecurityLevel } from '@/types/knowledge'

interface QaMessage { id: number; role: 'user' | 'assistant'; content: string; citations?: string[]; thinking?: ThinkingStep[] }
interface ThinkingStep { id: string; label: string; detail: string; status: 'pending' | 'running' | 'completed' | 'error'; icon: string; elapsed?: number; errorMsg?: string }
interface KnowledgeBaseItem { id: string; name: string; docs: number; owner: string; department: string; visibility: string; space: 'public' | 'personal'; canEdit: boolean; isBuiltIn?: boolean; pinned?: boolean; recent: string; createdAt?: string; updatedAt?: string; permissionMode: 'independent'; permissions: PermissionEntry[] }
interface DocItem { name: string; format: string; status: string; updatedAt: string; uploadedBy: string; size?: string; tags?: string[]; confidence?: number; securityLevel?: SecurityLevel; allowedDepts?: { id: string; name: string }[] }
interface TreeNode { id: string; label: string; type: 'folder' | 'file'; kbId?: string; docName?: string; isKnowledgeBase?: boolean; isBuiltIn?: boolean; children?: TreeNode[]; permissionMode?: 'inherit' | 'independent'; permissions?: PermissionEntry[] }
interface FolderOption { id: string; label: string; depth: number; node?: TreeNode }
interface RecycleItem { id: string; type: 'knowledgeBase' | 'folder' | 'file'; name: string; space: 'public' | 'personal'; kbId?: string; kbName?: string; parentId?: string; deletedAt: string; detail: string }
type UploadTaskStatus = 'pending' | 'uploading' | 'processing' | 'done' | 'reviewing' | 'failed' | 'upload_failed' | 'process_failed' | 'process_failed_permanent' | 'cancelled' | 'offline'
interface TreeRow { id: string; node: TreeNode; depth: number; kbId?: string }

const sidebarVisible = ref(true)
const activeSpace = ref<'public' | 'personal'>('public')
const selectedKbId = ref<string | null>(null)
const favoriteMenuKbId = ref('')
const selectedFileIds = ref<string[]>([])
const createMode = ref(false)
const createKbName = ref('')
const createKbType = ref<'public' | 'personal'>('public')
const createFolderMode = ref(false)
const createFolderName = ref('')
const createFolderParentId = ref('__root__')
const expandedFolderSelectorIds = ref<string[]>([])
const fileView = ref<'list' | 'grid'>('grid')
const fileSearch = ref('')
const fileActionModalOpen = ref(false)
const fileActionType = ref<'move' | null>(null)
const targetSearch = ref('')
const targetKbId = ref('')
const kbSearch = ref('')
const uploadModalOpen = ref(false)
const uploadFileNames = ref<string[]>([])
const uploadTags = ref<string[]>([])
const uploadCustomTagName = ref('')
const uploadCustomTagColor = ref('#6366f1')
const uploadShowTagPicker = ref(false)
const uploadSecurityLevel = ref<SecurityLevel>('部门')
const uploadAllowedDepts = ref<{ id: string; name: string }[]>([])
function toggleUploadDept(dept: OrgNode) {
  const idx = uploadAllowedDepts.value.findIndex(d => d.id === dept.id)
  if (idx >= 0) uploadAllowedDepts.value.splice(idx, 1)
  else uploadAllowedDepts.value.push({ id: dept.id, name: dept.name })
}
const predefinedTags: { name: string; color: string }[] = [
  { name: '案例', color: 'bg-amber-100 text-amber-700' },
  { name: '模版', color: 'bg-blue-100 text-blue-700' },
  { name: '预算', color: 'bg-emerald-100 text-emerald-700' },
  { name: '分析', color: 'bg-violet-100 text-violet-700' },
  { name: '制度', color: 'bg-rose-100 text-rose-700' },
  { name: 'SOP', color: 'bg-cyan-100 text-cyan-700' },
  { name: '团购', color: 'bg-orange-100 text-orange-700' },
  { name: '方案', color: 'bg-purple-100 text-purple-700' },
]
function toggleUploadTag(tag: string) {
  const idx = uploadTags.value.indexOf(tag)
  if (idx >= 0) uploadTags.value.splice(idx, 1)
  else uploadTags.value.push(tag)
}
function addCustomTag() {
  const name = uploadCustomTagName.value.trim()
  if (!name) return
  if (!predefinedTags.some(t => t.name === name)) {
    predefinedTags.push({ name, color: `[background-color:rgba(99,102,241,0.12)] [color:#6366f1]` })
  }
  if (!uploadTags.value.includes(name)) uploadTags.value.push(name)
  uploadCustomTagName.value = ''
  uploadShowTagPicker.value = false
}
function getTagStyle(tagName: string): string {
  const found = predefinedTags.find(t => t.name === tagName)
  return found?.color ?? 'bg-zinc-100 text-zinc-600'
}
interface UploadTaskItem {
  id: string
  name: string
  status: UploadTaskStatus
  progress: number
  size?: string              // 文件大小展示
  message?: string           // hover/辅助说明
  qualityWarning?: boolean   // OCR质量预警
  quickUpload?: boolean      // SHA256 极速上传标记
  doc?: DocItem
}
const uploadTasks = ref<UploadTaskItem[]>([])
const uploadAdvancedOpen = ref(false) // 上传弹窗"高级设置"折叠
const showAllTasks = ref(false)       // 任务面板折叠/展开
const taskDoneCount = computed(() => uploadTasks.value.filter(t =>
  t.status === 'done' || t.status === 'reviewing'
).length)
const taskTotalCount = computed(() => uploadTasks.value.length)
const hiddenTasksCount = computed(() => Math.max(0, uploadTasks.value.length - 4))
const visibleTasks = computed(() => {
  if (uploadTasks.value.length <= 4 || showAllTasks.value) return uploadTasks.value
  return uploadTasks.value.slice(0, 4)
})
const allDone = computed(() => uploadTasks.value.length > 0 &&
  uploadTasks.value.every(t =>
    ['done', 'reviewing', 'failed', 'upload_failed', 'process_failed', 'process_failed_permanent', 'cancelled', 'offline'].includes(t.status)
  ))
const hasPendingTasks = computed(() =>
  uploadTasks.value.some(t => t.status === 'pending' || t.status === 'uploading')
)
const expandedTreeIds = ref<string[]>(['kb-node-public-1', 'kb-node-public-3', 'kb-node-public-3-folder-tuan'])

// ========== 权限状态 ==========
const nodePermissions = reactive<Record<string, PermissionEntry[]>>({})
const nodeInheritMap = reactive<Record<string, boolean>>({})
const spaceDropdownOpen = ref(false)
function selectActiveSpace(space: 'public' | 'personal') {
  activeSpace.value = space
  selectedKbId.value = null
  selectedFileIds.value = []
  previewDoc.value = null
  qaOpen.value = false
}
const filteredFileTree = computed(() =>
  fileTree
    .filter(node => {
      const kbId = node.kbId
      if (!kbId) return true
      const kb = knowledgeBases.find(k => k.id === kbId)
      return kb?.space === activeSpace.value
    })
    .sort((a, b) => {
      const ka = a.kbId ? knowledgeBases.find(k => k.id === a.kbId) : null
      const kb = b.kbId ? knowledgeBases.find(k => k.id === b.kbId) : null
      if (ka?.isBuiltIn && !kb?.isBuiltIn) return -1
      if (!ka?.isBuiltIn && kb?.isBuiltIn) return 1
      return 0
    })
)

const settingsKbId = ref('')
const kbVisibilityOpen = ref(true)
const settingsKbIdBool = computed({
  get: () => !!settingsKbId.value,
  set: (v) => { if (!v) settingsKbId.value = '' },
})
const settingsTab = ref<'members' | 'documents' | 'audit'>('members')

// ========== 树节点操作菜单 ==========
const hoveredNodeId = ref('')               // 当前 hover 的节点 ID
const treeMenuTargetId = ref('')            // ⋮ 菜单打开的目标节点 ID
const treeMenuPos = ref({ x: 0, y: 0 })     // ⋮ 菜单弹出位置
const activeTreeItemId = ref('')
const previewDoc = ref<DocItem | null>(null)
const previewTabs = ref<DocItem[]>([])
const activeRightTab = ref('')
const renamingDocName = ref('')
const draftDocTitle = ref('')
// toast 使用 vue-sonner，详见 showFileActionToast() 实现
const exportMenuDocName = ref('')
const renamingKbId = ref('')
const draftKbTitle = ref('')
const contextMenu = ref<{ type: 'kb' | 'doc' | 'tree'; id: string; x: number; y: number } | null>(null)
const qaOpen = ref(false)
const qaQuestion = ref('')
const qaEditId = ref<number | null>(null)
const qaEditDraft = ref('')
const qaCopiedId = ref<number | null>(null)
const qaThinkingOpen = ref(false)
const qaThinking = ref<ThinkingStep[]>([])
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
const qaLoading = ref(false)
const qaHistoryCount = ref(0)
const renamingFolderId = ref('')
const draftFolderTitle = ref('')
// 见下方 showFileActionToast 使用 vue-sonner

const knowledgeBases = reactive<KnowledgeBaseItem[]>([
  { id: 'kb-public-1', name: '集团制度知识库', docs: 128, owner: '集团运营', department: '行政部', visibility: '全员可见', space: 'public', canEdit: false, isBuiltIn: true, pinned: true, recent: '刚刚', permissionMode: 'independent', permissions: [] },
  { id: 'kb-public-2', name: '商品基础资料库', docs: 86, owner: '商品中心', department: '商品部', visibility: '全员可见', space: 'public', canEdit: false, recent: '14:22', permissionMode: 'independent', permissions: [] },
  { id: 'kb-public-3', name: '方案中心案例库', docs: 42, owner: '方案中心', department: '方案中心', visibility: '方案中心可编辑', space: 'public', canEdit: true, pinned: true, recent: '昨天 14:22', permissionMode: 'independent', permissions: [] },
  { id: 'kb-public-4', name: '团购预算池', docs: 24, owner: '方案中心', department: '方案中心', visibility: '方案中心可编辑', space: 'public', canEdit: true, recent: '周日 13:27', permissionMode: 'independent', permissions: [] },
  { id: 'kb-public-5', name: 'AI项目知识库', docs: 36, owner: 'AI运营', department: '集团整体', visibility: '全员可见', space: 'public', canEdit: true, pinned: true, recent: '今天 10:21', permissionMode: 'independent', permissions: [] },
  { id: 'kb-public-6', name: '线上运营素材库', docs: 58, owner: 'B2C运营', department: 'B2C线上', visibility: '部门可见', space: 'public', canEdit: true, recent: '昨天 17:40', permissionMode: 'independent', permissions: [] },
  { id: 'kb-public-7', name: '视觉规范与模板库', docs: 31, owner: '视觉部', department: '视觉部', visibility: '全员可见', space: 'public', canEdit: true, recent: '周一 09:12', permissionMode: 'independent', permissions: [] },
  { id: 'kb-public-8', name: '技术项目资料库', docs: 44, owner: '技术部', department: '技术部', visibility: '部门可见', space: 'public', canEdit: true, recent: '昨天 20:16', permissionMode: 'independent', permissions: [] },
  { id: 'kb-public-9', name: '财务制度资料库', docs: 22, owner: '财务部', department: '财务部', visibility: '全员可见', space: 'public', canEdit: false, isBuiltIn: true, recent: '06-28', permissionMode: 'independent', permissions: [] },
  { id: 'kb-public-10', name: '仓储作业SOP库', docs: 39, owner: '仓储部', department: '仓储部', visibility: '部门可见', space: 'public', canEdit: true, recent: '06-27', permissionMode: 'independent', permissions: [] },
  { id: 'kb-public-11', name: '品牌活动资料库', docs: 27, owner: '品牌部', department: '品牌部', visibility: '部门可见', space: 'public', canEdit: true, recent: '06-25', permissionMode: 'independent', permissions: [] },
  { id: 'kb-public-12', name: '人力培训知识库', docs: 18, owner: '人力中心', department: '人力中心', visibility: '全员可见', space: 'public', canEdit: false, isBuiltIn: true, recent: '06-24', permissionMode: 'independent', permissions: [] },
  { id: 'kb-personal-1', name: '我的客户资料', docs: 9, owner: '当前用户', department: '个人', visibility: '仅自己可见', space: 'personal', canEdit: true, pinned: true, recent: '今天 09:18', permissionMode: 'independent', permissions: [] },
  { id: 'kb-personal-2', name: '临时方案草稿', docs: 5, owner: '当前用户', department: '个人', visibility: '仅自己可见', space: 'personal', canEdit: true, recent: '昨天 18:02', permissionMode: 'independent', permissions: [] },
  { id: 'kb-personal-3', name: 'AI学习笔记', docs: 16, owner: '当前用户', department: '个人', visibility: '仅自己可见', space: 'personal', canEdit: true, pinned: false, recent: '今天 11:03', permissionMode: 'independent', permissions: [] },
  { id: 'kb-personal-4', name: '客户素材归档', docs: 12, owner: '当前用户', department: '个人', visibility: '仅自己可见', space: 'personal', canEdit: true, pinned: false, recent: '周一 16:45', permissionMode: 'independent', permissions: [] },
])

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

const fileTree = reactive<TreeNode[]>([
  {
    id: 'kb-node-public-1',
    label: '集团制度知识库',
    type: 'folder',
    kbId: 'kb-public-1',
    isKnowledgeBase: true,
    isBuiltIn: true,
    children: [
      { id: 'file-attendance-policy', label: '考勤管理制度_v3.pdf', type: 'file', kbId: 'kb-public-1', docName: '考勤管理制度_v3.pdf' },
      { id: 'file-hr-handbook', label: '员工手册2026版.docx', type: 'file', kbId: 'kb-public-1', docName: '员工手册2026版.docx' },
    ],
  },
  {
    id: 'kb-node-public-2',
    label: '商品基础资料库',
    type: 'folder',
    kbId: 'kb-public-2',
    isKnowledgeBase: true,
    children: [
      { id: 'file-product-dict', label: '商品数据字典.xlsx', type: 'file', kbId: 'kb-public-2', docName: '商品数据字典.xlsx' },
    ],
  },
  {
    id: 'kb-node-public-3',
    label: '方案中心案例库',
    type: 'folder',
    kbId: 'kb-public-3',
    isKnowledgeBase: true,
    children: [
      { id: 'file-sneaker-case', label: '运动鞋团购成功案例.md', type: 'file', kbId: 'kb-public-3', docName: '运动鞋团购成功案例.md' },
      { id: 'file-common-budget', label: '团购通用预算池.xlsx', type: 'file', kbId: 'kb-public-3', docName: '团购通用预算池.xlsx' },
      { id: 'kb-node-public-3-folder-tuan', label: '团购方案', type: 'folder', kbId: 'kb-public-3', children: [
        { id: 'file-tuan-b2b', label: 'B2B团购方案模板.docx', type: 'file', kbId: 'kb-public-3', docName: 'B2B团购方案模板.docx' },
        { id: 'file-tuan-b2c', label: 'B2C团购方案模板.docx', type: 'file', kbId: 'kb-public-3', docName: 'B2C团购方案模板.docx' },
      ]},
    ],
  },
  {
    id: 'kb-node-public-4',
    label: '团购预算池',
    type: 'folder',
    kbId: 'kb-public-4',
    isKnowledgeBase: true,
    children: [
      { id: 'file-q1-budget', label: '2026Q1预算执行表.xlsx', type: 'file', kbId: 'kb-public-4', docName: '2026Q1预算执行表.xlsx' },
      { id: 'file-price-band', label: '价格带分析报告.docx', type: 'file', kbId: 'kb-public-4', docName: '价格带分析报告.docx' },
    ],
  },
  {
    id: 'kb-node-public-5',
    label: 'AI项目知识库',
    type: 'folder',
    kbId: 'kb-public-5',
    isKnowledgeBase: true,
    children: [
      { id: 'file-ai-roadmap', label: 'AI工作台落地路线.md', type: 'file', kbId: 'kb-public-5', docName: 'AI工作台落地路线.md' },
      { id: 'file-ai-scenarios', label: '三大场景AI项目说明.pptx', type: 'file', kbId: 'kb-public-5', docName: '三大场景AI项目说明.pptx' },
    ],
  },
  {
    id: 'kb-node-public-6',
    label: '线上运营素材库',
    type: 'folder',
    kbId: 'kb-public-6',
    isKnowledgeBase: true,
    children: [
      { id: 'file-online-review', label: '线上活动复盘模板.docx', type: 'file', kbId: 'kb-public-6', docName: '线上活动复盘模板.docx' },
      { id: 'file-online-rules', label: '会员触达规则.xlsx', type: 'file', kbId: 'kb-public-6', docName: '会员触达规则.xlsx' },
    ],
  },
  {
    id: 'kb-node-public-7',
    label: '视觉规范与模板库',
    type: 'folder',
    kbId: 'kb-public-7',
    isKnowledgeBase: true,
    children: [
      { id: 'file-ppt-spec', label: 'PPT母版规范.pptx', type: 'file', kbId: 'kb-public-7', docName: 'PPT母版规范.pptx' },
      { id: 'file-brand-color', label: '品牌色彩规范.pdf', type: 'file', kbId: 'kb-public-7', docName: '品牌色彩规范.pdf' },
    ],
  },
  {
    id: 'kb-node-public-8',
    label: '技术项目资料库',
    type: 'folder',
    kbId: 'kb-public-8',
    isKnowledgeBase: true,
    children: [
      { id: 'file-mcp-guide', label: 'MCP接入说明.md', type: 'file', kbId: 'kb-public-8', docName: 'MCP接入说明.md' },
      { id: 'file-tech-spec', label: 'AI工作门户技术方案.docx', type: 'file', kbId: 'kb-public-8', docName: 'AI工作门户技术方案.docx' },
    ],
  },
  {
    id: 'kb-node-public-9',
    label: '财务制度资料库',
    type: 'folder',
    kbId: 'kb-public-9',
    isKnowledgeBase: true,
    isBuiltIn: true,
    children: [
      { id: 'file-expense-policy', label: '费用报销制度.pdf', type: 'file', kbId: 'kb-public-9', docName: '费用报销制度.pdf' },
    ],
  },
  {
    id: 'kb-node-public-10',
    label: '仓储作业SOP库',
    type: 'folder',
    kbId: 'kb-public-10',
    isKnowledgeBase: true,
    children: [
      { id: 'file-warehouse-sop', label: '出入库作业SOP.pdf', type: 'file', kbId: 'kb-public-10', docName: '出入库作业SOP.pdf' },
    ],
  },
  {
    id: 'kb-node-public-11',
    label: '品牌活动资料库',
    type: 'folder',
    kbId: 'kb-public-11',
    isKnowledgeBase: true,
    children: [
      { id: 'file-brand-cases', label: '品牌活动案例集.pptx', type: 'file', kbId: 'kb-public-11', docName: '品牌活动案例集.pptx' },
    ],
  },
  {
    id: 'kb-node-public-12',
    label: '人力培训知识库',
    type: 'folder',
    kbId: 'kb-public-12',
    isKnowledgeBase: true,
    isBuiltIn: true,
    children: [
      { id: 'file-hr-training', label: '新员工培训手册.docx', type: 'file', kbId: 'kb-public-12', docName: '新员工培训手册.docx' },
    ],
  },
  {
    id: 'kb-node-personal-1',
    label: '我的客户资料',
    type: 'folder',
    kbId: 'kb-personal-1',
    isKnowledgeBase: true,
    children: [
      { id: 'personal-customer-a', label: '客户A需求记录.md', type: 'file', kbId: 'kb-personal-1', docName: '客户A需求记录.md' },
    ],
  },
  {
    id: 'kb-node-personal-2',
    label: '临时方案草稿',
    type: 'folder',
    kbId: 'kb-personal-2',
    isKnowledgeBase: true,
    children: [
      { id: 'personal-temp-note', label: '临时方案笔记.md', type: 'file', kbId: 'kb-personal-2', docName: '临时方案笔记.md' },
      { id: 'personal-chaomu', label: '朝暮5草稿', type: 'folder', kbId: 'kb-personal-2', children: [
        { id: 'personal-monitor', label: '策略监测草稿', type: 'file', kbId: 'kb-personal-2', docName: '临时方案笔记.md' },
      ]},
    ],
  },
  {
    id: 'kb-node-personal-3',
    label: 'AI学习笔记',
    type: 'folder',
    kbId: 'kb-personal-3',
    isKnowledgeBase: true,
    children: [
      { id: 'file-personal-ai-prompts', label: 'AI提示词学习.md', type: 'file', kbId: 'kb-personal-3', docName: 'AI提示词学习.md' },
      { id: 'file-personal-rag', label: 'RAG实践笔记.docx', type: 'file', kbId: 'kb-personal-3', docName: 'RAG实践笔记.docx' },
    ],
  },
  {
    id: 'kb-node-personal-4',
    label: '客户素材归档',
    type: 'folder',
    kbId: 'kb-personal-4',
    isKnowledgeBase: true,
    children: [
      { id: 'personal-archive-meeting', label: '客户会议纪要.md', type: 'file', kbId: 'kb-personal-4', docName: '客户会议纪要.md' },
      { id: 'personal-archive-list', label: '客户素材清单.xlsx', type: 'file', kbId: 'kb-personal-4', docName: '客户素材清单.xlsx' },
    ],
  },
])

const selectedKb = computed(() => knowledgeBases.find(kb => kb.id === selectedKbId.value))
const rawDocs = computed(() => selectedKbId.value ? (allDocs[selectedKbId.value] ?? []) : [])
const docs = computed(() => {
  if (!selectedKbId.value) return []
  if (activeNode.value?.type === 'folder' && getNodeKbId(activeNode.value) === selectedKbId.value && !isKnowledgeBaseNode(activeNode.value)) {
    const names = collectDocNames(activeNode.value.children ?? [])
    return rawDocs.value.filter(doc => names.includes(doc.name))
  }
  return rawDocs.value
})
const mainTitle = computed(() => selectedKb.value?.name ?? activeNode.value?.label ?? '知识中心')
const breadcrumbTrail = computed(() => {
  const trail: { label: string; onClick?: () => void }[] = []
  const added = new Set<string>()
  trail.push({ label: '全部知识库', onClick: () => { deselectKb() } })
  added.add('全部知识库')
  if (activeNode.value) {
    const treePath = findTreeNodePath(fileTree, activeNode.value.id)
    for (const node of treePath) {
      if (!added.has(node.label)) {
        trail.push({ label: node.label })
        added.add(node.label)
      }
    }
  }
  if (activePreviewDoc.value && activeNode.value?.type !== 'file') {
    trail.push({ label: activePreviewDoc.value.name })
  }
  return trail
})
const displayedKnowledgeBases = computed(() => {
  const q = kbSearch.value.trim().toLowerCase()
  return q ? knowledgeBases.filter(kb => `${kb.name}${kb.owner}${kb.department}`.toLowerCase().includes(q)) : knowledgeBases
})
const pinnedKnowledgeBases = computed(() => displayedKnowledgeBases.value.filter(kb => kb.pinned))
const currentFileTree = computed(() => fileTree)
const activeNode = computed(() => findTreeNode(fileTree, activeTreeItemId.value))
const activeKbFolderNode = computed(() => {
  if (!selectedKbId.value) return undefined
  if (activeNode.value?.type === 'folder' && getNodeKbId(activeNode.value) === selectedKbId.value) return activeNode.value
  return findKbTreeNode(fileTree, selectedKbId.value)
})
// ─── 当前用户模拟（后续对接钉钉） ───
const currentUser = { departments: ['技术部', '集团整体'], name: '当前用户' }

// 用户的安全许可 = 从当前用户在知识库中的角色派生
function getUserClearance(kbId?: string): SecurityLevel {
  if (!kbId) return '部门'
  const members = (nodePermissions[kbId] ?? [])
  const me = members.find(m => m.name === '当前用户' || m.name === '我')
  return me?.securityClearance ?? getDefaultClearance(me?.role ?? 'VIEWER')
}

// 可访问的文件名称集合（密级生效检查）
const accessibleDocNames = computed(() => {
  const clearance = getUserClearance(selectedKbId.value ?? undefined)
  return new Set(
    docs.value
      .filter(d => canAccessFileBySecurityLevel(clearance, d.securityLevel) && canAccessFile(currentUser, d))
      .map(d => d.name)
  )
})

function isDocAccessible(doc: DocItem): boolean {
  return accessibleDocNames.value.has(doc.name)
}

const filteredDocs = computed(() => {
  const q = fileSearch.value.trim().toLowerCase()
  if (!q) return docs.value
  return docs.value.filter(d => {
    if (d.name.toLowerCase().includes(q)) return true
    if (d.tags?.some(t => t.toLowerCase().includes(q))) return true
    return false
  })
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
  { id: '__root__', label: '知识库根目录', depth: 0 },
  ...collectFolderOptions(fileTree, 1),
])
const kbFolderOptions = computed<FolderOption[]>(() => {
  const expanded = expandedFolderSelectorIds.value
  return knowledgeBases.flatMap((kb) => {
    const root = findKbTreeNode(fileTree, kb.id)
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
const targetKbs = computed(() => {
  const all = knowledgeBases.filter(kb => kb.id !== selectedKbId.value)
  const q = targetSearch.value.trim().toLowerCase()
  return q ? all.filter(kb => kb.name.toLowerCase().includes(q)) : all
})
const qaPanelWidth = 'clamp(360px,28vw,460px)'
const previewPanelWidth = 'clamp(390px,32vw,520px)'
const rightPanelOpen = computed(() => qaOpen.value || previewTabs.value.length > 0)
const isThreeColumn = computed(() => qaOpen.value && previewTabs.value.length > 0)
const shouldPreviewTakeOver = computed(() => previewTabs.value.length > 0 && !qaOpen.value)
const activePreviewDoc = computed(() => previewTabs.value.find(doc => doc.name === activeRightTab.value) ?? previewDoc.value)
const mainRightMargin = computed(() => {
  // When only preview is open (no qa), main content is hidden — no margin needed
  if (shouldPreviewTakeOver.value) return '0px'
  const parts = [
    ...(qaOpen.value ? [qaPanelWidth] : []),
    ...(previewTabs.value.length && !isThreeColumn.value ? [previewPanelWidth] : []),
  ]
  return parts.length ? `calc(${parts.join(' + ')})` : '0px'
})

function getKbTreeRows(kbId: string): TreeRow[] {
  const root = findKbTreeNode(fileTree, kbId)
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
  activeTreeItemId.value = row.node.id
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
  const root = findKbTreeNode(fileTree, kbId)
  return root?.id ?? kbId
}

function selectKb(id: string) {
  if (activeKnowledgeTab.value === 'trash') activeKnowledgeTab.value = 'assets'
  selectedKbId.value = id
  selectedFileIds.value = []
  previewDoc.value = null
  const node = findKbTreeNode(fileTree, id)
  if (node) activeTreeItemId.value = node.id
}

function deselectKb() {
  selectedKbId.value = null
  activeTreeItemId.value = ''
  fileSearch.value = ''
}
function previewFileFromTree(row: TreeRow) {
  if (activeKnowledgeTab.value === 'trash') activeKnowledgeTab.value = 'assets'
  if (!row.kbId) return
  const docName = row.node.docName || row.node.label
  const docs = allDocs[row.kbId] || []
  const doc = docs.find((d: DocItem) => d.name === docName)
  if (doc) {
    if (row.kbId) selectKb(row.kbId)
    openPreview(doc)
  }
}

function toggleTreeNode(node: TreeNode) {
  if (activeKnowledgeTab.value === 'trash') activeKnowledgeTab.value = 'assets'
  const kbId = getNodeKbId(node)
  if (node.type === 'file' && kbId) {
    selectedKbId.value = kbId
    const doc = (allDocs[kbId] ?? []).find(item => item.name === node.docName) ?? allDocs[kbId]?.[0]
    if (doc) openPreview(doc)
    return
  }
  activeTreeItemId.value = node.id
  if (kbId) selectedKbId.value = kbId
  else selectedKbId.value = null
  if (node.children?.length) {
    expandedTreeIds.value = expandedTreeIds.value.includes(node.id)
      ? expandedTreeIds.value.filter(id => id !== node.id)
      : [...expandedTreeIds.value, node.id]
  }
}

function toggleTreeExpandOnly(node: TreeNode) {
  if (!node.children?.length) return
  expandedTreeIds.value = expandedTreeIds.value.includes(node.id)
    ? expandedTreeIds.value.filter(id => id !== node.id)
    : [...expandedTreeIds.value, node.id]
}

function selectTreeNode(node: TreeNode) {
  if (activeKnowledgeTab.value === 'trash') activeKnowledgeTab.value = 'assets'
  activeTreeItemId.value = node.id
  const kbId = getNodeKbId(node)
  selectedKbId.value = kbId ?? null
  selectedFileIds.value = []
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
  const root = findKbTreeNode(fileTree, kbId)
  return root?.children ?? []
}

function kbNodeHasFolderChildren(kbId: string): boolean {
  const root = findKbTreeNode(fileTree, kbId)
  return (root?.children ?? []).some(c => c.type === 'folder' || c.type === 'file')
}

function toggleKbTreeExpand(kbId: string, event: MouseEvent) {
  event.stopPropagation()
  const root = findKbTreeNode(fileTree, kbId)
  if (!root) return
  toggleTreeExpandOnly(root)
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
  return node.kbId ?? findTreeNodeKbId(fileTree, node.id)
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
  const kb = findKbById(selectedKbId.value)
  const selectedSet = new Set(selectedFileIds.value)
  const deletedDocs = (allDocs[selectedKbId.value] ?? []).filter(item => selectedSet.has(item.name))
  deletedDocs.forEach(doc => {
    pushRecycleItem({ type: 'file', name: doc.name, space: kb?.space ?? 'public', kbId: selectedKbId.value ?? undefined, kbName: kb?.name, detail: `${doc.size ?? '-'} · ${doc.format}` })
  })
  allDocs[selectedKbId.value] = (allDocs[selectedKbId.value] ?? []).filter(item => !selectedSet.has(item.name))
  if (previewDoc.value && selectedSet.has(previewDoc.value.name)) previewDoc.value = null
  previewTabs.value = previewTabs.value.filter(item => !selectedSet.has(item.name))
  if (selectedSet.has(activeRightTab.value)) activeRightTab.value = previewTabs.value[0]?.name ?? ''
  const deletedCount = selectedFileIds.value.length
  selectedFileIds.value = []
  showFileActionToast(`已删除 ${deletedCount} 个文件，可在回收站找回`)
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
  createMode.value = true
  createKbType.value = 'public'
  createKbName.value = ''
}
function createKnowledgeBase() {
  const isPublic = createKbType.value === 'public'
  const newKb: KnowledgeBaseItem = {
    id: `kb-${createKbType.value}-${Date.now()}`,
    name: createKbName.value || '未命名知识库',
    docs: 0,
    owner: '当前用户',
    department: isPublic ? '按角色授权' : '个人',
    visibility: isPublic ? '全员可检索' : '仅自己可见',
    space: createKbType.value,
    canEdit: true,
    pinned: false,
    recent: '刚刚',
    permissionMode: 'independent',
    permissions: isPublic
      ? [{ id: `${Date.now()}-all`, name: '全员', scope: '系统', department: '全部', role: 'VIEWER', joinedAt: new Date().toISOString().slice(0, 10) }]
      : [],
  }
  knowledgeBases.push(newKb)
  allDocs[newKb.id] = []
  const newNode: TreeNode = {
    id: `kb-node-${newKb.id}`,
    label: newKb.name,
    type: 'folder',
    kbId: newKb.id,
    isKnowledgeBase: true,
    children: [],
  }
  fileTree.push(newNode)
  createKbName.value = ''
  createMode.value = false
  selectedKbId.value = newKb.id
  activeTreeItemId.value = newNode.id
  expandedTreeIds.value = [...new Set([...expandedTreeIds.value, newNode.id])]
}
function openUploadModal() {
  if (!selectedKb.value) {
    showFileActionToast('请先进入具体知识库后再上传文件')
    return
  }
  uploadModalOpen.value = true
  uploadFileNames.value = []
}
const uploadFileErrors = ref<string[]>([])
const uploadDragOver = ref(false)
function handleUploadFiles(event: Event) {
  const files = Array.from((event.target as HTMLInputElement).files ?? [])
  uploadFileErrors.value = []
  const MAX_SIZE = 100 * 1024 * 1024 // 100MB
  const allowed = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg'])
  const selected: string[] = []
  files.forEach((file) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !allowed.has(ext)) {
      uploadFileErrors.value.push(`「${file.name}」格式不支持（支持: PDF/Word/Excel/PPT/TXT/PNG/JPG）`)
      return
    }
    if (file.size > MAX_SIZE) {
      uploadFileErrors.value.push(`「${file.name}」超过 100MB 限制`)
      return
    }
    if (file.size === 0) {
      uploadFileErrors.value.push(`「${file.name}」为空文件`)
      return
    }
    if (selected.includes(file.name)) {
      uploadFileErrors.value.push(`「${file.name}」重复选择`)
      return
    }
    selected.push(file.name)
  })
  if (selected.length > 50) {
    uploadFileErrors.value.push('单次最多上传 50 个文件，已截取前 50 个')
    selected.splice(50)
  }
  uploadFileNames.value = selected
}
function handleUploadDrop(event: DragEvent) {
  uploadDragOver.value = false
  const files = Array.from(event.dataTransfer?.files ?? [])
  if (!files.length) return
  // 复用 handleUploadFiles 的校验逻辑
  uploadFileErrors.value = []
  const allowed = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg'])
  const selected: string[] = []
  files.forEach((file) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !allowed.has(ext)) {
      uploadFileErrors.value.push(`「${file.name}」格式不支持（支持: PDF/Word/Excel/PPT/TXT/PNG/JPG）`)
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      uploadFileErrors.value.push(`「${file.name}」超过 100MB 限制`)
      return
    }
    if (file.size === 0) {
      uploadFileErrors.value.push(`「${file.name}」为空文件`)
      return
    }
    if (selected.includes(file.name)) {
      uploadFileErrors.value.push(`「${file.name}」重复选择`)
      return
    }
    selected.push(file.name)
  })
  if (selected.length > 50) {
    uploadFileErrors.value.push('单次最多上传 50 个文件，已截取前 50 个')
    selected.splice(50)
  }
  uploadFileNames.value = selected
}
function humanFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function confirmUpload() {
  const names = uploadFileNames.value.length ? uploadFileNames.value : ['方案补充资料.pdf', '客户需求表.xlsx']
  const space = selectedKb.value?.space ?? 'public'
  const tags = [...uploadTags.value]
  const securityLevel = uploadSecurityLevel.value
  const allowedDepts = uploadSecurityLevel.value === '部门' ? [...uploadAllowedDepts.value] : undefined
  let doneCount = 0
  const tasks: UploadTaskItem[] = names.map((name, index) => {
    const format = (name.split('.').pop() || 'PDF').toUpperCase()
    const baseName = name.replace(/\.[^.]+$/, '')
    const size = humanFileSize(Math.floor(Math.random() * 10 * 1024 * 1024) + 512 * 1024) // mock 512K~10M
    const taskId = `upload-${Date.now()}-${index}`
    let doc: DocItem | undefined

    // 根据文件名特征决定终态（仅 mock 演示用）
    const simulateFailure = baseName.includes('失败') || baseName.includes('error')
    const simulateParseError = baseName.includes('解析错误') || baseName.includes('parse-error')
    const simulateDuplicate = baseName.includes('重复') || baseName.includes('duplicate')
    const simulateEncrypted = baseName.includes('加密') || baseName.includes('encrypted')
    const simulateLowQuality = baseName.includes('低质') || baseName.includes('lowq')

    // 正常文件才写入 allDocs
    if (!simulateFailure && !simulateParseError && !simulateEncrypted && selectedKbId.value) {
      doc = {
        name, format,
        status: space === 'public' ? '待审核' : simulateLowQuality ? '已索引(低质)' : '已索引',
        updatedAt: '刚刚', uploadedBy: '当前用户',
        tags: tags.length ? tags : undefined,
        securityLevel, allowedDepts,
      }
      allDocs[selectedKbId.value] = [doc, ...(allDocs[selectedKbId.value] ?? [])]
      const targetNode = activeNode.value?.type === 'folder' && activeNode.value.kbId === selectedKbId.value
        ? activeNode.value
        : findKbTreeNode(fileTree, selectedKbId.value)
      if (targetNode) {
        targetNode.children = targetNode.children ?? []
        targetNode.children.unshift({
          id: `file-upload-${Date.now()}-${index}`,
          label: name, type: 'file', kbId: selectedKbId.value, docName: name,
        })
        expandedTreeIds.value = [...new Set([...expandedTreeIds.value, targetNode.id])]
      }
      doneCount++
    }

    // 创建 task 并设置 size
    const task: UploadTaskItem = {
      id: taskId, name, size,
      status: 'pending', progress: 0, doc,
      qualityWarning: simulateLowQuality,
      quickUpload: simulateDuplicate,
    }
    if (simulateDuplicate) task.message = '检测到知识库内已有相同文件，已极速完成处理'
    if (simulateLowQuality) task.message = 'OCR 识别质量偏低（< 0.8），检索效果可能受影响'

    // 异步状态机模拟
    const statusSequence: { status: UploadTaskStatus; progress: number; delay: number }[] = []
    if (simulateDuplicate) {
      // 极速上传：uploading → done (跳过 processing)
      statusSequence.push(
        { status: 'uploading', progress: 20, delay: 200 },
        { status: 'uploading', progress: 60, delay: 400 },
        { status: 'done', progress: 100, delay: 700 },
      )
    } else if (simulateFailure) {
      // 上传失败
      statusSequence.push(
        { status: 'uploading', progress: 15, delay: 400 * index },
        { status: 'uploading', progress: 35, delay: 700 * index + 300 },
        { status: 'uploading', progress: 55, delay: 900 * index + 600 },
        { status: 'failed', progress: 60, delay: 1100 * index + 900 },
      )
    } else if (simulateParseError || simulateEncrypted) {
      // 解析失败
      statusSequence.push(
        { status: 'uploading', progress: 20, delay: 400 * index },
        { status: 'uploading', progress: 50, delay: 700 * index + 300 },
        { status: 'uploading', progress: 75, delay: 900 * index + 600 },
        { status: 'processing', progress: 85, delay: 1100 * index + 900 },
        { status: 'processing', progress: 92, delay: 1300 * index + 1100 },
        { status: 'process_failed', progress: 95, delay: 1500 * index + 1300 },
      )
    } else if (space === 'public') {
      // 公共空间：uploading → processing → reviewing
      statusSequence.push(
        { status: 'uploading', progress: 15, delay: 400 * index },
        { status: 'uploading', progress: 35, delay: 700 * index + 250 },
        { status: 'uploading', progress: 60, delay: 1000 * index + 500 },
        { status: 'processing', progress: 80, delay: 1300 * index + 800 },
        { status: 'processing', progress: 92, delay: 1600 * index + 1100 },
        { status: 'reviewing', progress: 100, delay: 1900 * index + 1400 },
      )
    } else {
      // 个人空间正常：uploading → processing → done
      const hasWarning = simulateLowQuality
      statusSequence.push(
        { status: 'uploading', progress: 15, delay: 400 * index },
        { status: 'uploading', progress: 40, delay: 700 * index + 250 },
        { status: 'uploading', progress: 65, delay: 1000 * index + 500 },
        { status: 'processing', progress: 80, delay: 1300 * index + 800 },
        { status: 'processing', progress: 92, delay: 1600 * index + 1100 },
        { status: 'done', progress: 100, delay: 1900 * index + 1400 },
      )
    }

    statusSequence.forEach(({ status, progress, delay }) => {
      setTimeout(() => {
        const t = uploadTasks.value.find(u => u.id === taskId)
        if (t && t.status !== 'cancelled') {
          t.status = status
          t.progress = progress
        }
      }, delay)
    })

    // 自动清理已完成：所有终态后 10s 面板消失（如果没有新任务）
    const terminalDelay = statusSequence.reduce((max, s) => Math.max(max, s.delay), 0) + 2000
    setTimeout(() => {
      const allTerminal = uploadTasks.value.every(t =>
        ['done', 'reviewing', 'failed', 'upload_failed', 'process_failed', 'process_failed_permanent', 'cancelled', 'offline'].includes(t.status)
      )
      if (allTerminal) {
        setTimeout(() => {
          if (uploadTasks.value.every(t => !['pending', 'uploading', 'processing'].includes(t.status))) {
            // 保持展示但用户可手动关闭
          }
        }, 10000)
      }
    }, terminalDelay + 100)

    return task
  })

  uploadTasks.value = [...tasks, ...uploadTasks.value]
  // kb.docs 计数联动
  if (selectedKb.value && doneCount > 0) {
    selectedKb.value.docs += doneCount
  }
  showAllTasks.value = false
  uploadModalOpen.value = false
  uploadFileNames.value = []
  uploadTags.value = []
  uploadAdvancedOpen.value = false
}
function dismissUploadTask(id: string) {
  uploadTasks.value = uploadTasks.value.filter(task => task.id !== id)
}
function cancelUploadTask(id: string) {
  const task = uploadTasks.value.find(t => t.id === id)
  if (task && (task.status === 'pending' || task.status === 'uploading')) {
    task.status = 'cancelled'
    task.message = '用户已取消上传'
  }
}
function cancelAllUploadTasks() {
  uploadTasks.value.forEach(t => {
    if (t.status === 'pending' || t.status === 'uploading') {
      t.status = 'cancelled'
      t.message = '用户已取消上传'
    }
  })
}
function retryUploadTask(id: string) {
  const task = uploadTasks.value.find(t => t.id === id)
  if (!task) return
  const space = selectedKb.value?.space ?? 'public'
  const isDuplicate = task.quickUpload
  const isLowQuality = task.qualityWarning
  const baseName = task.name.replace(/\.[^.]+$/, '')

  task.status = 'pending'
  task.progress = 0
  task.message = undefined
  task.qualityWarning = isLowQuality
  task.quickUpload = isDuplicate

  const statusSequence: { status: UploadTaskStatus; progress: number; delay: number }[] = []
  if (isDuplicate) {
    statusSequence.push(
      { status: 'uploading', progress: 20, delay: 200 },
      { status: 'uploading', progress: 60, delay: 400 },
      { status: 'done', progress: 100, delay: 700 },
    )
  } else if (space === 'public') {
    statusSequence.push(
      { status: 'uploading', progress: 15, delay: 300 },
      { status: 'uploading', progress: 45, delay: 600 },
      { status: 'processing', progress: 80, delay: 1000 },
      { status: 'processing', progress: 92, delay: 1300 },
      { status: 'reviewing', progress: 100, delay: 1600 },
    )
  } else {
    statusSequence.push(
      { status: 'uploading', progress: 15, delay: 300 },
      { status: 'uploading', progress: 45, delay: 600 },
      { status: 'processing', progress: 80, delay: 1000 },
      { status: 'processing', progress: 92, delay: 1300 },
      { status: 'done', progress: 100, delay: 1600 },
    )
  }

  statusSequence.forEach(({ status, progress, delay }) => {
    setTimeout(() => {
      const t = uploadTasks.value.find(u => u.id === id)
      if (t && t.status !== 'cancelled') {
        t.status = status
        t.progress = progress
      }
    }, delay)
  })
}
function statusTextClass(status: UploadTaskStatus): string {
  if (status === 'done') return 'text-emerald-600'
  if (status === 'reviewing') return 'text-amber-600'
  if (status === 'cancelled') return 'text-zinc-400'
  if (['failed', 'upload_failed', 'process_failed', 'process_failed_permanent'].includes(status)) return 'text-rose-600'
  return 'text-blue-600'
}
function statusTextLabel(task: UploadTaskItem): string {
  if (task.status === 'pending') return '排队中'
  if (task.status === 'uploading') return '上传中'
  if (task.status === 'processing') return '处理中'
  if (task.status === 'done') return task.qualityWarning ? '已完成 (低质)' : '已完成 ✅'
  if (task.status === 'reviewing') return '待审核 ⏳'
  if (task.status === 'failed' || task.status === 'upload_failed') return '上传失败 ❌'
  if (task.status === 'process_failed' || task.status === 'process_failed_permanent') return '处理失败 ❌'
  if (task.status === 'cancelled') return '已取消 ➖'
  if (task.status === 'offline') return '离线'
  return '上传中'
}
function getFileIcon(f: string) { if (f === 'XLSX') return FileSpreadsheet; if (f === 'DOCX' || f === 'MD' || f === 'PDF') return FileText; return File }
function getIconColor(f: string) { if (f === 'XLSX') return 'text-emerald-500 bg-emerald-50'; if (f === 'DOCX') return 'text-blue-500 bg-blue-50'; if (f === 'PDF') return 'text-red-500 bg-red-50'; if (f === 'MD') return 'text-violet-500 bg-violet-50'; return 'text-zinc-500 bg-zinc-50' }
function openPreview(doc: DocItem) {
  if (!isDocAccessible(doc)) {
    showFileActionToast('你的安全等级不足以查看此文件')
    return
  }
  previewDoc.value = doc
  previewTabs.value = [doc, ...previewTabs.value.filter(item => item.name !== doc.name)].slice(0, 5)
  activeRightTab.value = doc.name
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
    updateTreeLabel(fileTree)
    // Sync preview tab
    if (previewDoc.value?.name === oldName) previewDoc.value = doc
    previewTabs.value = previewTabs.value.map(t => t.name === oldName ? doc : t)
    if (activeRightTab.value === oldName) activeRightTab.value = title
  }
  renamingDocName.value = ''; draftDocTitle.value = ''
}
function exportDoc(_doc?: DocItem | null) {
  if (!_doc) return
  if (!isDocAccessible(_doc)) {
    showFileActionToast('你的安全等级不足以下载此文件')
    return
  }
  showFileActionToast('文件下载中：' + _doc.name)
}
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
  const kb = findKbById(selectedKbId.value)
  pushRecycleItem({ type: 'file', name: doc.name, space: kb?.space ?? 'public', kbId: selectedKbId.value, kbName: kb?.name, detail: `${doc.size ?? '-'} · ${doc.format}` })
  allDocs[selectedKbId.value] = (allDocs[selectedKbId.value] ?? []).filter(item => item.name !== doc.name)
  selectedFileIds.value = selectedFileIds.value.filter(name => name !== doc.name)
  if (previewDoc.value?.name === doc.name) previewDoc.value = null
  previewTabs.value = previewTabs.value.filter(item => item.name !== doc.name)
  if (activeRightTab.value === doc.name) activeRightTab.value = previewTabs.value[0]?.name ?? ''
  showFileActionToast(`已删除：${doc.name}，可在回收站找回`)
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
  if (kb.isBuiltIn) {
    showFileActionToast('系统内置知识库不可删除')
    return
  }
  const confirmMsg = `确认删除知识库「${kb.name}」？此操作不可恢复！`
  showConfirm('删除知识库', confirmMsg, () => {
    pushRecycleItem({ type: 'knowledgeBase', name: kb.name, space: kb.space, kbId: kb.id, kbName: kb.name, detail: `${kb.docs} 文档` })
    removeTreeNodesByPredicate(fileTree, node => node.kbId === kb.id && node.type === 'folder')
    delete allDocs[kb.id]
    const idx = knowledgeBases.findIndex(item => item.id === kb.id)
    if (idx >= 0) knowledgeBases.splice(idx, 1)
    if (selectedKbId.value === kb.id) {
      selectedKbId.value = null
      activeTreeItemId.value = ''
    }
    showFileActionToast(`已删除知识库：${kb.name}，可在回收站找回`)
  })
}
function updateTreeLabel(nodes: TreeNode[], kbId: string, label: string) {
  for (const node of nodes) {
    if (node.kbId === kbId && node.type === 'folder') node.label = label
    if (node.children) updateTreeLabel(node.children, kbId, label)
  }
}
function openCreateFolderModal() {
  const fallbackKbId = selectedKb.value?.id ?? displayedKnowledgeBases.value[0]?.id ?? knowledgeBases[0]?.id
  if (!fallbackKbId) {
    showFileActionToast('请先创建知识库后再新建文件夹')
    return
  }
  if (!selectedKb.value) selectKb(fallbackKbId)
  createFolderName.value = ''
  const selectedKbRoot = findKbTreeNode(fileTree, fallbackKbId)
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
  const parent = createFolderParentId.value === '__root__' ? undefined : findTreeNode(fileTree, createFolderParentId.value)
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
    activeTreeItemId.value = parent.id
    if (parent.kbId) selectedKbId.value = parent.kbId
  } else {
    fileTree.push(node)
    activeTreeItemId.value = ''
  }
  showFileActionToast(`已新建文件夹：${name}，支持重命名文件夹`)
  createFolderMode.value = false
}
function showFileActionToast(message: string) {
  toast.success(message)
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
function findTreeNodePath(nodes: TreeNode[], id: string): TreeNode[] {
  for (const node of nodes) {
    if (node.id === id) return [node]
    if (node.children) {
      const path = findTreeNodePath(node.children, id)
      if (path.length) return [node, ...path]
    }
  }
  return []
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
    const kb = node.kbId ? knowledgeBases.find(item => item.id === node.kbId) : undefined
    return Boolean(kb?.canEdit && !kb?.isBuiltIn)
  }
  if (node.kbId) {
    const kb = knowledgeBases.find(item => item.id === node.kbId)
    return Boolean(kb?.canEdit)
  }
  return true
}
function deleteTreeFolder(node: TreeNode) {
  if (!canDeleteFolder(node)) return
  if (isKnowledgeBaseNode(node) && node.kbId) {
    const kb = knowledgeBases.find(item => item.id === node.kbId)
    if (kb) deleteKb(kb)
    contextMenu.value = null
    return
  }
  const kb = node.kbId ? findKbById(node.kbId) : undefined
  const docMap = collectDocsByKb([node])
  Object.entries(docMap).forEach(([kbId, names]) => {
    const deleted = new Set(names)
    const docs = (allDocs[kbId] ?? []).filter(doc => deleted.has(doc.name))
    docs.forEach(doc => {
      pushRecycleItem({ type: 'file', name: doc.name, space: kb?.space ?? 'public', kbId, kbName: kb?.name, detail: `${doc.size ?? '-'} · ${doc.format}` })
    })
    allDocs[kbId] = (allDocs[kbId] ?? []).filter(doc => !deleted.has(doc.name))
    if (previewDoc.value && deleted.has(previewDoc.value.name)) previewDoc.value = null
    selectedFileIds.value = selectedFileIds.value.filter(name => !deleted.has(name))
  })
  pushRecycleItem({ type: 'folder', name: node.label, space: kb?.space ?? 'public', kbId: node.kbId, kbName: kb?.name, detail: `包含 ${Object.values(docMap).reduce((sum, names) => sum + names.length, 0)} 个文件` })
  const wasActive = activeTreeItemId.value ? isNodeInside(node, activeTreeItemId.value) : false
  removeTreeNodesByPredicate(fileTree, item => item.id === node.id)
  if (wasActive) {
    activeTreeItemId.value = ''
    if (node.kbId === selectedKbId.value) selectedKbId.value = null
  }
  showFileActionToast(`已删除文件夹：${node.label}，可在回收站找回`)
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

function sendQuickQuestion(question: string) {
  qaQuestion.value = question
  askKnowledgeBase()
}

function typewriteAnswer(msg: QaMessage, fullText: string, speed = 18) {
  let pos = 0
  msg.content = ''
  const timer = setInterval(() => {
    pos += 1
    msg.content = fullText.slice(0, pos)
    if (pos >= fullText.length) {
      clearInterval(timer)
      qaLoading.value = false
    }
  }, speed)
}

function askKnowledgeBase() {
  const text = qaQuestion.value.trim()
  if (!text || qaLoading.value) return
  qaLoading.value = true
  qaMessages.value.push({ id: Date.now(), role: 'user', content: text })
  qaHistoryCount.value = qaMessages.value.length
  const citations = qaSources.value.map(source => source.doc.name)
  qaThinking.value = [
    { id: 's1', label: '理解问题', detail: '正在分析用户问题意图……', status: 'completed', icon: 'search', elapsed: 1500 },
    { id: 's2', label: '知识库检索', detail: `在「${selectedKb.value?.name ?? '知识中心'}」中检索相关文档……`, status: 'completed', icon: 'database', elapsed: 2200 },
    { id: 's3', label: '结果过滤', detail: '对检索结果进行排序和过滤……', status: 'running', icon: 'filter', elapsed: 800 },
    { id: 's4', label: '生成回答', detail: '基于检索结果生成回答并标注引用', status: 'pending', icon: 'sparkles' },
  ]
  qaThinkingOpen.value = true
  // Simulate thinking chain completion
  setTimeout(() => {
    qaThinking.value = qaThinking.value.map(s => ({ ...s, status: 'completed' as const }))
    const fullContent = `已在「${selectedKb.value?.name ?? '知识中心'}」中完成检索。根据[[ref:1]]，员工加班与休假需提前报备审批。具体可查看[[ref:2]]相关条款。如需进一步按行业场景适配，可参考[[ref:3]]中的执行口径。`
    const msg: QaMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      citations: ['考勤管理制度_v3.pdf', '员工手册2026版.docx', '运动鞋团购成功案例.md'],
      thinking: [...qaThinking.value.map(s => ({ ...s, status: 'completed' as const }))],
    }
    qaMessages.value.push(msg)
    typewriteAnswer(msg, fullContent, 15)
  }, 2000)
  qaQuestion.value = ''
  if (qaTextarea.value) { qaTextarea.value.rows = 1; qaTextarea.value.style.height = 'auto' }
}

function clearQaHistory() {
  qaMessages.value = []
  qaHistoryCount.value = 0
}
function openKbContextMenu(kb: KnowledgeBaseItem | null | undefined, event: MouseEvent) {
  if (!kb) return
  contextMenu.value = { type: 'kb', id: kb.id, x: event.clientX, y: event.clientY }
}
function openDocContextMenu(doc: DocItem, event: MouseEvent) {
  contextMenu.value = { type: 'doc', id: doc.name, x: event.clientX, y: event.clientY }
}
const contextKb = computed(() => contextMenu.value?.type === 'kb'
  ? knowledgeBases.find(kb => kb.id === contextMenu.value?.id)
  : undefined)
const contextDoc = computed(() => contextMenu.value?.type === 'doc'
  ? docs.value.find(doc => doc.name === contextMenu.value?.id)
  : undefined)



// ========== 知识库行权限徽标 ==========

function findKbById(kbId: string): KnowledgeBaseItem | undefined {
  return knowledgeBases.find(kb => kb.id === kbId)
}
function getPermissionBadge(kb?: KnowledgeBaseItem): { text: string; cls: string } | null {
  if (!kb) return null
  const my = (nodePermissions[kb.id] ?? []).find(m => m.name === '当前用户' || m.name === '我')
  if (my) {
    const map: Record<string, { text: string; cls: string }> = {
      OWNER: { text: '所有者', cls: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
      MANAGER: { text: '管理员', cls: 'border-blue-200 bg-blue-50 text-blue-700' },
      EDITOR: { text: '可编辑', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
      VIEWER: { text: '可查看', cls: 'border-zinc-200 bg-zinc-50 text-zinc-500' },
    }
    return map[my.role] ?? null
  }
  return kb.canEdit ? { text: '可编辑', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' } : { text: '只读', cls: 'border-zinc-200 bg-zinc-50 text-zinc-500' }
}

// ─── 文档管理 Tab 状态 ───
const fileSettingsDocSearch = ref('')
const docSettingsSecurityLevelFilter = ref('')
const docSettingsFilteredDocs = computed(() => {
  if (!settingsKbId.value) return []
  const docs = allDocs[settingsKbId.value] ?? []
  const q = fileSettingsDocSearch.value.trim().toLowerCase()
  const level = docSettingsSecurityLevelFilter.value
  return docs.filter(d => {
    if (q && !d.name.toLowerCase().includes(q)) return false
    if (level && d.securityLevel !== level) return false
    return true
  })
})
const docSettingsCountByLevel = computed(() => {
  if (!settingsKbId.value) return {}
  const docs = allDocs[settingsKbId.value] ?? []
  const counts: Record<string, number> = {}
  docs.forEach(d => { const l = d.securityLevel ?? '部门'; counts[l] = (counts[l] ?? 0) + 1 })
  return counts
})
function selectAllDocsInSettings() {
  const names = docSettingsFilteredDocs.value.map(d => d.name)
  selectedFileIds.value = selectedFileIds.value.length === names.length ? [] : names
}

// ========== 权限管理 ==========
const fileSettingsDoc = ref<DocItem | null>(null)
const settingsAddMemberOpen = ref(false)
const settingsAddMemberSearch = ref('')

function ensureDefaultPermissions(kbId: string) {
  if (nodePermissions[kbId] && nodePermissions[kbId].length) return
  const myRole: PermissionRole = kbId.startsWith('kb-personal') ? 'OWNER' : (kbId === 'kb-public-5' ? 'MANAGER' : kbId === 'kb-public-1' ? 'EDITOR' : 'VIEWER')
  nodePermissions[kbId] = [
    { id: kbId + '-sys-owner', name: '系统管理员', scope: '系统', department: '系统', role: 'OWNER', securityClearance: '机密', joinedAt: '2026-01-01' },
    { id: kbId + '-sys-me', name: '当前用户', scope: '个人', department: '技术部', role: myRole, securityClearance: getDefaultClearance(myRole), joinedAt: '2026-06-01' },
  ]
}

const activeSettingsKb = computed(() => knowledgeBases.find(kb => kb.id === settingsKbId.value))
const activeSettingsMembers = computed(() => settingsKbId.value ? (nodePermissions[settingsKbId.value] ?? []) : [])

function openKbSettings(kb: KnowledgeBaseItem) {
  settingsKbId.value = kb.id
  settingsTab.value = 'members'
  ensureDefaultPermissions(kb.id)
}
function closeKbSettings() { settingsKbId.value = '' }

function openTreeMenu(event: MouseEvent, targetId: string) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  treeMenuPos.value = { x: rect.right, y: rect.top }
  treeMenuTargetId.value = treeMenuTargetId.value === targetId ? '' : targetId
}
function openFolderPermission(nodeId: string) {
  const node = findTreeNode(fileTree, nodeId)
  if (!node) return
  if (node.kbId) {
    settingsKbId.value = node.kbId
    settingsTab.value = 'members'
  }
  contextMenu.value = null
}

const mockAuditLogs = [
  { user: '张三', action: '修改了成员权限 - 商品知识库', icon: 'user', time: '2026-07-04 09:15', sensitive: false },
  { user: '系统', action: '完成公共空间访问范围校验', icon: 'check', time: '2026-07-04 08:00', sensitive: false },
  { user: '李娟', action: '上传了方案中心字段模板.docx', icon: 'upload', time: '2026-07-03 18:22', sensitive: false },
  { user: '王管理员', action: '开启公开知识库开关', icon: 'lock', time: '2026-07-03 14:00', sensitive: false },
  { user: '刘秘书', action: '问答「今年营销预算有多少？」命中敏感词', icon: 'alert', time: '2026-07-03 10:30', sensitive: true },
]
const auditFilterType = ref('')
const auditFilterUser = ref('')
const auditDateFrom = ref('')
const auditDateTo = ref('')
const filteredAuditLogs = computed(() => mockAuditLogs.filter(item => {
  if (auditFilterType.value && !item.action.includes(auditFilterType.value)) return false
  if (auditFilterUser.value && !item.user.includes(auditFilterUser.value)) return false
  if (auditDateFrom.value) { const from = new Date(auditDateFrom.value); const d = new Date(item.time.slice(0,10)); if (d < from) return false }
  if (auditDateTo.value) { const to = new Date(auditDateTo.value + 'T23:59:59'); const d = new Date(item.time.slice(0,10)); if (d > to) return false }
  return true
}))
function exportAuditLog() { showFileActionToast('审计日志已导出') }

const permissionPresetOptions = [
  { key: 'team-write', label: '本部门读写', desc: '本部门成员默认为编辑，其他部门不可见' },
  { key: 'company-read', label: '全公司阅读', desc: '全员可查看，本部门可编辑' },
  { key: 'custom-dept', label: '指定部门', desc: '只开放给已勾选部门或成员' },
  { key: 'public', label: '公开', desc: '全员可查看和下载' },
]
function applyPermissionPreset(key: string) {
  if (!settingsKbId.value) return
  if (!nodePermissions[settingsKbId.value]) nodePermissions[settingsKbId.value] = []
  if (key === 'team-write') {
    nodePermissions[settingsKbId.value] = [{ id: settingsKbId.value+'-admin', name: activeSettingsKb.value?.department+'管理员', scope: '部门', department: activeSettingsKb.value?.department??'', role: 'MANAGER', joinedAt: new Date().toISOString().slice(0,10) }, { id: settingsKbId.value+'-editor', name: activeSettingsKb.value?.department+'全员', scope: '部门', department: activeSettingsKb.value?.department??'', role: 'EDITOR', joinedAt: new Date().toISOString().slice(0,10) }]
    showFileActionToast('已预设：本部门读写')
  } else if (key === 'company-read') {
    nodePermissions[settingsKbId.value] = [{ id: settingsKbId.value+'-admin', name: activeSettingsKb.value?.department+'管理员', scope: '部门', department: activeSettingsKb.value?.department??'', role: 'MANAGER', joinedAt: new Date().toISOString().slice(0,10) }, { id: settingsKbId.value+'-viewer', name: '全员', scope: '个人', department: '全部', role: 'VIEWER', joinedAt: new Date().toISOString().slice(0,10) }]
    showFileActionToast('已预设：全公司阅读')
  } else if (key === 'custom-dept') {
    nodePermissions[settingsKbId.value] = [{ id: settingsKbId.value+'-dept', name: '指定部门', scope: '部门', department: '请选择部门', role: 'VIEWER', joinedAt: new Date().toISOString().slice(0,10) }]
    showFileActionToast('已预设：指定部门可见')
  } else if (key === 'public') {
    nodePermissions[settingsKbId.value] = []
    showFileActionToast('已预设：公开')
  }
}
function deletePermissionMember(member: PermissionEntry) {
  if (!settingsKbId.value) return
  showConfirm('移除成员「'+member.name+'」', '确认移除该成员的访问权限？移除后该成员将不再可见该知识库内容。', () => {
    nodePermissions[settingsKbId.value] = (nodePermissions[settingsKbId.value] ?? []).filter(item => item.id !== member.id)
    showFileActionToast('已移除授权：'+member.name)
  })
}
function updatePermissionRole(member: PermissionEntry, newRole: PermissionRole) {
  if (!settingsKbId.value) return
  const list = nodePermissions[settingsKbId.value] ?? []
  const idx = list.findIndex(m => m.id === member.id)
  if (idx >= 0) {
    const updated = { ...list[idx], role: newRole }
    // 角色变更时，如果安全许可低于新角色默认值，自动提升
    const defaultClearance = getDefaultClearance(newRole)
    if (updated.securityClearance && defaultClearance) {
      const order: Record<SecurityLevel, number> = { '全员': 0, '部门': 1, '秘密': 2, '机密': 3 }
      if (order[updated.securityClearance] < order[defaultClearance]) {
        updated.securityClearance = defaultClearance
      }
    }
    list[idx] = updated
    showFileActionToast('已更新 '+member.name+' 的权限')
  }
}

function updateMemberClearance(member: PermissionEntry, clearance: SecurityLevel) {
  if (!settingsKbId.value) return
  const list = nodePermissions[settingsKbId.value] ?? []
  const idx = list.findIndex(m => m.id === member.id)
  if (idx >= 0) { list[idx] = { ...list[idx], securityClearance: clearance }; showFileActionToast('已更新 '+member.name+' 的安全许可') }
}

// ========== 文件权限管理（独立弹窗，继承知识库权限，支持自定义） ==========
const fileSettingsTab = ref<'members' | 'documents' | 'audit'>('members')
const filePermissionMembersByDoc = reactive<Record<string, PermissionEntry[]>>({})
const fileInheritedFromKb = reactive<Record<string, boolean>>({})
const fileSettingsAddMemberOpen = ref(false)
const fileSettingsAddMemberSearch = ref('')
const fileSettingsAddMemberDept = ref('全部')
const fileSettingsAddMemberSelected = ref<{ name: string; dept: string }[]>([])
const fileSettingsAddMemberRole = ref<PermissionRole>('EDITOR')
const fileSettingsMemberFilter = ref('')

const fileParentKb = computed(() => {
  if (!fileSettingsDoc.value) return null
  for (const kb of knowledgeBases) {
    if ((allDocs[kb.id] ?? []).some(d => d.name === fileSettingsDoc.value!.name)) return kb
  }
  return null
})

function ensureFileMembers(docName: string) {
  if (fileInheritedFromKb[docName] === undefined) fileInheritedFromKb[docName] = true
  if (!filePermissionMembersByDoc[docName]) {
    const kbId = fileParentKb.value?.id
    const kbMembers = kbId ? (nodePermissions[kbId] ?? []) : []
    filePermissionMembersByDoc[docName] = kbMembers.map(m => ({ ...m }))
  }
}

const activeFileMembers = computed(() => fileSettingsDoc.value ? (filePermissionMembersByDoc[fileSettingsDoc.value.name] ?? []) : [])
const filteredActiveFileMembers = computed(() => {
  const q = fileSettingsMemberFilter.value.trim().toLowerCase()
  const all = activeFileMembers.value
  if (!q) return all
  return all.filter(m => m.name.toLowerCase().includes(q) || m.department.toLowerCase().includes(q) || m.scope.toLowerCase().includes(q))
})
const filteredFileCandidates = computed(() => {
  const q = fileSettingsAddMemberSearch.value.trim().toLowerCase()
  const dept = fileSettingsAddMemberDept.value
  return mockMemberCandidates.filter(c => {
    const matchDept = dept === '全部' || c.dept === dept
    const matchName = q === '' || c.name.toLowerCase().includes(q) || c.dept.toLowerCase().includes(q)
    return matchDept && matchName
  })
})

function updateFilePermissionRole(member: PermissionEntry, newRole: PermissionRole) {
  if (!fileSettingsDoc.value) return
  const list = filePermissionMembersByDoc[fileSettingsDoc.value.name] ?? []
  const idx = list.findIndex(m => m.id === member.id)
  if (idx >= 0) {
    const updated = { ...list[idx], role: newRole }
    const defaultClearance = getDefaultClearance(newRole)
    if (updated.securityClearance && defaultClearance) {
      const order: Record<SecurityLevel, number> = { '全员': 0, '部门': 1, '秘密': 2, '机密': 3 }
      if (order[updated.securityClearance] < order[defaultClearance]) {
        updated.securityClearance = defaultClearance
      }
    }
    list[idx] = updated
    fileInheritedFromKb[fileSettingsDoc.value.name] = false
    showFileActionToast('已更新 ' + member.name + ' 的权限')
  }
}

function updateFileMemberClearance(member: PermissionEntry, clearance: SecurityLevel) {
  if (!fileSettingsDoc.value) return
  const list = filePermissionMembersByDoc[fileSettingsDoc.value.name] ?? []
  const idx = list.findIndex(m => m.id === member.id)
  if (idx >= 0) { list[idx] = { ...list[idx], securityClearance: clearance }; fileInheritedFromKb[fileSettingsDoc.value.name] = false; showFileActionToast('已更新 ' + member.name + ' 的安全许可') }
}

function deleteFilePermissionMember(member: PermissionEntry) {
  if (!fileSettingsDoc.value) return
  showConfirm('移除成员「' + member.name + '」', '确认移除该成员的访问权限？', () => {
    const name = fileSettingsDoc.value!.name
    filePermissionMembersByDoc[name] = (filePermissionMembersByDoc[name] ?? []).filter(item => item.id !== member.id)
    fileInheritedFromKb[name] = false
    showFileActionToast('已移除授权：' + member.name)
  })
}

function toggleFileAddCandidate(c: { name: string; dept: string }) {
  const idx = fileSettingsAddMemberSelected.value.findIndex(s => s.name === c.name)
  if (idx >= 0) fileSettingsAddMemberSelected.value.splice(idx, 1)
  else fileSettingsAddMemberSelected.value.push({ ...c })
}

function confirmAddFileMembers() {
  if (!fileSettingsDoc.value) return
  const docName = fileSettingsDoc.value.name
  if (!filePermissionMembersByDoc[docName]) filePermissionMembersByDoc[docName] = []
  let added = 0
  fileSettingsAddMemberSelected.value.forEach(c => {
    const exists = filePermissionMembersByDoc[docName].some(m => m.name === c.name)
    if (exists) return
    filePermissionMembersByDoc[docName].push({
      id: docName + '-' + c.name + '-' + Date.now(),
      name: c.name, scope: '个人', department: c.dept,
      role: fileSettingsAddMemberRole.value,
      securityClearance: getDefaultClearance(fileSettingsAddMemberRole.value),
      joinedAt: new Date().toISOString().slice(0, 10),
    })
    added++
  })
  if (added > 0) { fileInheritedFromKb[docName] = false; showFileActionToast('成功添加 ' + added + ' 名成员') }
  fileSettingsAddMemberSelected.value = []
  fileSettingsAddMemberRole.value = 'EDITOR'
  fileSettingsAddMemberOpen.value = false
}

function resetFileSettingsAddMember() {
  fileSettingsAddMemberSearch.value = ''
  fileSettingsAddMemberSelected.value = []
  fileSettingsAddMemberRole.value = 'EDITOR'
  fileSettingsAddMemberDept.value = '全部'
}

function openFileSettings(doc: DocItem) {
  fileSettingsDoc.value = doc
  fileSettingsTab.value = 'members'
  fileSettingsMemberFilter.value = ''
  ensureFileMembers(doc.name)
}

function closeFileSettings() {
  fileSettingsDoc.value = null
  fileSettingsAddMemberOpen.value = false
}

function breakInheritanceAndCustomize() {
  if (!fileSettingsDoc.value) return
  const docName = fileSettingsDoc.value.name
  const kbId = fileParentKb.value?.id
  const kbMembers = kbId ? (nodePermissions[kbId] ?? []) : []
  filePermissionMembersByDoc[docName] = kbMembers.map(m => ({ ...m }))
  fileInheritedFromKb[docName] = false
  showFileActionToast('已切换为自定义权限')
}

function restoreInheritance() {
  if (!fileSettingsDoc.value) return
  const docName = fileSettingsDoc.value.name
  fileInheritedFromKb[docName] = true
  const kbId = fileParentKb.value?.id
  const kbMembers = kbId ? (nodePermissions[kbId] ?? []) : []
  filePermissionMembersByDoc[docName] = kbMembers.map(m => ({ ...m }))
  showFileActionToast('已恢复继承知识库权限')
}

// ========== 回收站 ==========
const activeKnowledgeTab = ref<'assets' | 'trash'>('assets')
const recycleItems = ref<RecycleItem[]>([
  { id: 'recycle-seed-1', type: 'folder', name: 'Q3 已关闭品牌活动', space: 'public', deletedAt: new Date(Date.now() - 1000*60*60*24*2).toISOString(), detail: '公共空间 · 品牌活动资料库 · 包含 3 项' },
  { id: 'recycle-seed-2', type: 'file', name: '2025离职面谈记录.docx', space: 'public', deletedAt: new Date(Date.now() - 1000*60*60*24*12).toISOString(), detail: '公共空间 · 人力培训知识库 · 删除人：刘秘书' },
  { id: 'recycle-seed-3', type: 'file', name: '临时方案草稿.md', space: 'personal', deletedAt: new Date(Date.now() - 1000*60*60*24*25).toISOString(), detail: '个人空间 · 临时方案草稿 · 删除人：您自己' },
  { id: 'recycle-seed-4', type: 'file', name: '供应商报价(旧版).xlsx', space: 'personal', deletedAt: new Date(Date.now() - 1000*60*60*24*35).toISOString(), detail: '个人空间 · 个人资料 · 删除人：您自己' },
])
const recycleSearch = ref('')
const recycleDateFrom = ref('')
const recycleDateTo = ref('')

function recycleDaysLeft(item: RecycleItem): number | null {
  if (!item.deletedAt) return null
  const elapsed = (Date.now() - new Date(item.deletedAt).getTime()) / (1000*60*60*24)
  return Math.max(0, Math.ceil(30 - elapsed))
}
function recycleIsExpired(item: RecycleItem): boolean {
  return recycleDaysLeft(item) === 0
}
function autoPurgeRecycle() {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  recycleItems.value = recycleItems.value.filter(item => {
    if (!item.deletedAt) return true
    return new Date(item.deletedAt).getTime() > cutoff
  })
}
function pushRecycleItem(item: Omit<RecycleItem, 'id' | 'deletedAt'>) {
  autoPurgeRecycle()
  recycleItems.value.unshift({ ...item, id: 'recycle-'+Date.now(), deletedAt: new Date().toISOString(), space: item.space })
}
function restoreRecycleItem(item: RecycleItem) {
  if (item.deletedAt) {
    const days = (Date.now() - new Date(item.deletedAt).getTime()) / (1000 * 60 * 60 * 24)
    if (days > 30) { showFileActionToast('已超过30天恢复期限，文件已被系统自动清理'); recycleItems.value = recycleItems.value.filter(r => r.id !== item.id); return }
  }
  recycleItems.value = recycleItems.value.filter(r => r.id !== item.id)
  showFileActionToast('已恢复：'+item.name)
}
function purgeRecycleItem(item: RecycleItem) {
  showConfirm('彻底删除「'+item.name+'」', '此操作不可恢复！确认要彻底删除吗？', () => {
    recycleItems.value = recycleItems.value.filter(r => r.id !== item.id)
    showFileActionToast('已彻底删除：'+item.name)
  })
}
const filteredRecycleItems = computed(() => {
  const q = recycleSearch.value.trim().toLowerCase()
  const from = recycleDateFrom.value ? new Date(recycleDateFrom.value).getTime() : null
  const to = recycleDateTo.value ? new Date(recycleDateTo.value).getTime() + 1000*60*60*24 : null
  return recycleItems.value.filter(r => {
    if (q && !r.name.toLowerCase().includes(q) && !r.detail.toLowerCase().includes(q)) return false
    const t = r.deletedAt ? new Date(r.deletedAt).getTime() : 0
    if (from && t < from) return false
    if (to && t > to) return false
    return true
  })
})

// 切到回收站时触发清理
watch(activeKnowledgeTab, (v) => { if (v === 'trash') autoPurgeRecycle() })
// Adding qaOpen close to switchSpace (function already exists above)

// ─── 密级常量 ───
const SECURITY_LEVELS = [
  { value: '全员' as const, order: 0, label: '全员', bizDesc: '知识库内所有成员可见，无限制', activeClass: 'bg-zinc-100 text-zinc-600 border-zinc-300', displayClass: 'bg-zinc-50 text-zinc-500' },
  { value: '部门' as const, order: 1, label: '部门', bizDesc: '仅指定钉钉部门的成员可见', activeClass: 'bg-blue-100 text-blue-700 border-blue-300', displayClass: 'bg-blue-50 text-blue-600' },
  { value: '秘密' as const, order: 2, label: '秘密', bizDesc: '仅授权成员列表中的成员可见', activeClass: 'bg-yellow-100 text-yellow-700 border-yellow-300', displayClass: 'bg-yellow-50 text-yellow-700' },
  { value: '机密' as const, order: 3, label: '机密', bizDesc: '高度敏感，仅最小知悉范围成员可见', activeClass: 'bg-red-100 text-red-700 border-red-300', displayClass: 'bg-red-50 text-red-600' },
] as const

function getDocSecurityClass(level?: string) {
  const found = SECURITY_LEVELS.find(s => s.value === level)
  return found?.displayClass ?? 'bg-zinc-50 text-zinc-500'
}
function getDocSecurityLabel(level?: string) { return level ?? '部门' }

// ─── 密级生效检查函数 ───
function canAccessFileBySecurityLevel(userClearance: SecurityLevel, fileLevel?: SecurityLevel): boolean {
  const order: Record<SecurityLevel, number> = { '全员': 0, '部门': 1, '秘密': 2, '机密': 3 }
  const effectiveLevel = fileLevel ?? '部门'
  return order[userClearance] >= order[effectiveLevel]
}

function canAccessFile(user: { departments: string[] }, file: DocItem): boolean {
  const level = file.securityLevel ?? '部门'
  if (level === '全员') return true
  if (level === '部门' && file.allowedDepts?.length) {
    const userDepts = new Set(user.departments)
    return file.allowedDepts.some(d => userDepts.has(d.id))
  }
  return true
}

// ─── 成员的安全许可（从角色派生） ───
function getDefaultClearance(role: PermissionRole): SecurityLevel {
  const map: Record<PermissionRole, SecurityLevel> = {
    OWNER: '机密', MANAGER: '机密', EDITOR: '秘密', VIEWER: '全员',
  }
  return map[role]
}


const mockMemberCandidates = [
  { name: '张伟', dept: '技术部' }, { name: '李娟', dept: '品牌营销部' }, { name: '王强', dept: '技术部' },
  { name: '赵敏', dept: '设计部' }, { name: '刘洋', dept: '产品部' }, { name: '陈芳', dept: '财务部' },
  { name: '杨磊', dept: '品牌营销部' }, { name: '周婷', dept: '人力中心' }, { name: '吴迪', dept: '技术部' },
  { name: '郑丽', dept: '设计部' }, { name: '孙鹏', dept: '产品部' }, { name: '黄鑫', dept: '财务部' },
]

// ─── 组织架构树（模拟钉钉，后续对接 MCP） ───
interface OrgNode { id: string; name: string; type: 'dept' | 'user'; children?: OrgNode[]; userId?: string }
const orgTree: OrgNode[] = [
  { id: 'dept-tech', name: '技术部', type: 'dept', children: [
    { id: 'user-zhangwei', name: '张伟', type: 'user', userId: 'u001' },
    { id: 'user-wangqiang', name: '王强', type: 'user', userId: 'u002' },
    { id: 'user-yangpeng', name: '杨鹏', type: 'user', userId: 'u003' },
  ]},
  { id: 'dept-brand', name: '品牌营销部', type: 'dept', children: [
    { id: 'user-lijuan', name: '李娟', type: 'user', userId: 'u004' },
    { id: 'user-yanglei', name: '杨磊', type: 'user', userId: 'u005' },
  ]},
  { id: 'dept-design', name: '设计部', type: 'dept', children: [
    { id: 'user-zhaomin', name: '赵敏', type: 'user', userId: 'u006' },
    { id: 'user-zhengli', name: '郑丽', type: 'user', userId: 'u007' },
  ]},
  { id: 'dept-product', name: '产品部', type: 'dept', children: [
    { id: 'user-liuyang', name: '刘洋', type: 'user', userId: 'u008' },
    { id: 'user-sunpeng', name: '孙鹏', type: 'user', userId: 'u009' },
  ]},
  { id: 'dept-finance', name: '财务部', type: 'dept', children: [
    { id: 'user-chenfang', name: '陈芳', type: 'user', userId: 'u010' },
    { id: 'user-huangxin', name: '黄鑫', type: 'user', userId: 'u011' },
  ]},
  { id: 'dept-hr', name: '人力中心', type: 'dept', children: [
    { id: 'user-zhouting', name: '周婷', type: 'user', userId: 'u012' },
  ]},
  { id: 'dept-admin', name: '行政部', type: 'dept', children: [
    { id: 'user-wudong', name: '吴迪', type: 'user', userId: 'u013' },
  ]},
  { id: 'dept-goods', name: '商品部', type: 'dept', children: [] },
]

// 部门树选中状态
const orgDeptChecked = ref<Set<string>>(new Set())
const orgUserChecked = ref<Set<string>>(new Set())
const orgExpandedDepts = ref<Set<string>>(new Set())

function toggleOrgDept(deptId: string) {
  const newSet = new Set(orgDeptChecked.value)
  if (newSet.has(deptId)) { newSet.delete(deptId) }
  else { newSet.add(deptId) }
  orgDeptChecked.value = newSet
}
function toggleOrgUser(userId: string) {
  const newSet = new Set(orgUserChecked.value)
  if (newSet.has(userId)) { newSet.delete(userId) }
  else { newSet.add(userId) }
  orgUserChecked.value = newSet
}
function toggleOrgDeptExpand(deptId: string) {
  const newSet = new Set(orgExpandedDepts.value)
  if (newSet.has(deptId)) { newSet.delete(deptId) }
  else { newSet.add(deptId) }
  orgExpandedDepts.value = newSet
}
function getDeptUsers(deptId: string): OrgNode[] {
  const dept = findOrgNode(orgTree, deptId)
  return dept?.children?.filter(c => c.type === 'user') ?? []
}
function findOrgNode(nodes: OrgNode[], id: string): OrgNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n
    const found = n.children ? findOrgNode(n.children, id) : undefined
    if (found) return found
  }
  return undefined
}
function isDeptPartiallyChecked(deptId: string): boolean {
  const users = getDeptUsers(deptId)
  if (!users.length) return false
  const checked = users.filter(u => orgUserChecked.value.has(u.userId!)).length
  return checked > 0 && checked < users.length
}
function isDeptFullyChecked(deptId: string): boolean {
  const users = getDeptUsers(deptId)
  if (!users.length) return orgDeptChecked.value.has(deptId)
  return users.every(u => orgUserChecked.value.has(u.userId!))
}
function getDeptCheckState(deptId: string): 'none' | 'partial' | 'all' {
  if (isDeptFullyChecked(deptId)) return 'all'
  if (isDeptPartiallyChecked(deptId)) return 'partial'
  return 'none'
}

const filteredCandidates = computed(() => {
  const q = settingsAddMemberSearch.value.trim().toLowerCase()
  if (!q) return mockMemberCandidates
  return mockMemberCandidates.filter(c => c.name.includes(q) || c.dept.includes(q))
})
// ===== 新版添加成员 =====
const settingsMemberFilter = ref('')
const settingsAddMemberDept = ref('全部')
const settingsAddMemberSelected = ref<{ name: string; dept: string }[]>([])
const settingsAddMemberRole = ref<PermissionRole>('EDITOR')

const presetDepartments = ['全部', '技术部', '品牌营销部', '设计部', '产品部', '财务部', '人力中心', '行政部', '商品部']

const filteredCandidatesForDept = computed(() => {
  const q = settingsAddMemberSearch.value.trim().toLowerCase()
  const dept = settingsAddMemberDept.value
  return mockMemberCandidates.filter(c => {
    const matchDept = dept === '全部' || c.dept === dept
    const matchName = q === '' || c.name.toLowerCase().includes(q) || c.dept.toLowerCase().includes(q)
    return matchDept && matchName
  })
})

const filteredActiveSettingsMembers = computed(() => {
  const q = settingsMemberFilter.value.trim().toLowerCase()
  const all = activeSettingsMembers.value
  if (!q) return all
  return all.filter(m => m.name.toLowerCase().includes(q) || m.department.toLowerCase().includes(q) || m.scope.toLowerCase().includes(q))
})

function toggleAddCandidate(c: { name: string; dept: string }) {
  const idx = settingsAddMemberSelected.value.findIndex(s => s.name === c.name)
  if (idx >= 0) settingsAddMemberSelected.value.splice(idx, 1)
  else settingsAddMemberSelected.value.push({ ...c })
}

function confirmAddMembers() {
  if (!settingsKbId.value) return
  if (!nodePermissions[settingsKbId.value]) nodePermissions[settingsKbId.value] = []
  let added = 0
  settingsAddMemberSelected.value.forEach(c => {
    const exists = nodePermissions[settingsKbId.value].some(m => m.name === c.name)
    if (exists) return
    nodePermissions[settingsKbId.value].push({
      id: settingsKbId.value + '-' + c.name + '-' + Date.now(),
      name: c.name,
      scope: '个人',
      department: c.dept,
      role: settingsAddMemberRole.value,
      securityClearance: getDefaultClearance(settingsAddMemberRole.value),
      joinedAt: new Date().toISOString().slice(0, 10),
    })
    added++
  })
  if (added > 0) showFileActionToast('成功添加 ' + added + ' 名成员')
  settingsAddMemberSelected.value = []
  settingsAddMemberRole.value = 'EDITOR'
  settingsAddMemberOpen.value = false
}

function addCandidateMember(name: string, dept: string) {
  if (!settingsKbId.value) return
  const exists = (nodePermissions[settingsKbId.value] ?? []).some(m => m.name === name)
  if (exists) { showFileActionToast('「' + name + '」已在成员列表中'); return }
  if (!nodePermissions[settingsKbId.value]) nodePermissions[settingsKbId.value] = []
  nodePermissions[settingsKbId.value].push({ id: settingsKbId.value + '-' + name, name, scope: '个人', department: dept, role: 'VIEWER', securityClearance: getDefaultClearance('VIEWER'), joinedAt: new Date().toISOString().slice(0, 10) })
  showFileActionToast('已添加授权：' + name)
  settingsAddMemberOpen.value = false
}
</script>


// ========== 辅助函数 ==========
}


<template>
  <div class="flex h-[calc(100vh-4rem)] bg-zinc-50 text-zinc-950">
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
      <div data-testid="knowledge-sidebar-subheader" class="border-b border-zinc-100 px-3 py-3">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="text-sm font-semibold text-zinc-900">知识中心</div>
          </div>
          <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:bg-zinc-50" aria-label="折叠侧边栏" @click="sidebarVisible = false">
            <ChevronLeft class="h-4 w-4" />
          </button>
        </div>
        <!-- 空间切换下拉 -->
        <div class="relative mt-2" @click.stop>
          <button
            type="button"
            class="flex h-8 w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            @click="spaceDropdownOpen = !spaceDropdownOpen"
          >
            <Folder class="h-3.5 w-3.5" :class="activeSpace === 'public' ? 'text-amber-500' : 'text-emerald-500'" />
            <span class="flex-1 text-left">{{ activeSpace === 'public' ? '公共空间' : '个人空间' }}</span>
            <ChevronDown class="h-3.5 w-3.5 text-zinc-400" :class="spaceDropdownOpen ? 'rotate-180' : ''" />
          </button>
          <div v-if="spaceDropdownOpen" class="fixed inset-0 z-40" @click="spaceDropdownOpen = false"></div>
          <div v-if="spaceDropdownOpen" class="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 shadow-xl" @click.stop>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition"
              :class="activeSpace === 'public' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-zinc-600 hover:bg-zinc-50'"
              @click="selectActiveSpace('public'); spaceDropdownOpen = false"
            >
              <Folder class="h-3.5 w-3.5 text-amber-500" />
              <span>公共空间</span>
              <span v-if="activeSpace === 'public'" class="ml-auto text-blue-600">✓</span>
            </button>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition"
              :class="activeSpace === 'personal' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-zinc-600 hover:bg-zinc-50'"
              @click="selectActiveSpace('personal'); spaceDropdownOpen = false"
            >
              <Folder class="h-3.5 w-3.5 text-emerald-500" />
              <span>个人空间</span>
              <span v-if="activeSpace === 'personal'" class="ml-auto text-blue-600">✓</span>
            </button>
          </div>
        </div>
      </div>
      <div class="border-b border-zinc-100 px-2 py-2">
        <Button variant="ghost" size="sm" class="w-full justify-start gap-2 text-sm font-medium" aria-label="新建知识库" @click="openCreateModal">
          <BookOpen class="h-4 w-4 text-orange-500" />
          <span>新建知识库</span>
        </Button>
      </div>
      <div class="flex-1 overflow-y-auto p-2" data-testid="knowledge-tree-panel" @contextmenu.prevent="openTreeBlankContextMenu($event)">
        <!-- KB列表 - 平铺显示 -->
        <div class="space-y-0.5">
          <div v-for="kbNode in filteredFileTree" :key="kbNode.id" class="space-y-0.5">
            <!-- KB 节点行 -->
            <div
              class="group relative flex items-center rounded-lg"
              :class="selectedKbId === kbNode.kbId ? 'bg-blue-50 text-blue-700' : 'hover:bg-zinc-50'"
              @mouseenter="hoveredNodeId = kbNode.id"
              @mouseleave="hoveredNodeId = ''"
            >
              <button
                v-if="kbNodeHasFolderChildren(kbNode.kbId ?? '')"
                type="button"
                class="grid h-7 w-7 shrink-0 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                @click="toggleTreeNode(kbNode)"
              >
                <ChevronDown v-if="expandedTreeIds.includes(kbNode.id)" class="h-3.5 w-3.5" />
                <ChevronRight v-else class="h-3.5 w-3.5" />
              </button>
              <span v-else class="inline-block w-7 shrink-0" />
              <button
                type="button"
                class="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-xs transition"
                :class="selectedKbId === kbNode.kbId ? 'font-medium' : 'text-zinc-600 hover:bg-zinc-50'"
                @click="selectKb(kbNode.kbId ?? '')"
                @contextmenu.prevent="openKbContextMenu(knowledgeBases.find(kb => kb.id === kbNode.kbId), $event)"
              >
                <BookOpen class="h-3.5 w-3.5 shrink-0 text-orange-500" />
                <span class="truncate">{{ kbNode.label }}</span>
                <span v-if="kbNode.isBuiltIn" class="shrink-0 rounded bg-blue-50 px-1 py-0.5 text-[9px] font-medium text-blue-600 border border-blue-100">系统内置</span>
              </button>
              <!-- KB 悬停操作按钮 -->
              <div class="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-white pl-1.5 shadow-sm rounded-lg" :class="selectedKbId === kbNode.kbId ? 'bg-blue-50' : ''" @click.stop>
                <button type="button" class="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-blue-600 hover:bg-blue-50" aria-label="权限配置" title="权限配置" @click="openKbSettings(knowledgeBases.find(kb => kb.id === kbNode.kbId) ?? null as any); treeMenuTargetId = ''">
                  <Settings class="h-3.5 w-3.5" />
                </button>
                <button type="button" class="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100" aria-label="更多操作" title="更多操作" @click="openTreeMenu($event, kbNode.id)">
                  <MoreVertical class="h-3.5 w-3.5" />
                </button>
              </div>
              <!-- KB ⋮ 下拉菜单 -->
              <Teleport to="body">
                <div v-if="treeMenuTargetId === kbNode.id" class="fixed inset-0 z-[70]" @click="treeMenuTargetId = ''">
                  <div class="absolute w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-sm shadow-2xl" :style="{ left: `${treeMenuPos.x}px`, top: `${treeMenuPos.y}px` }" @click.stop>
                    <div class="px-3 py-2 text-xs font-semibold text-zinc-400">{{ kbNode.label }}</div>
                    <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="selectKb(kbNode.kbId ?? ''); treeMenuTargetId = ''"><BookOpen class="h-4 w-4 text-orange-500" />打开</button>
                    <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openCreateFolderModalAt(kbNode.kbId ?? ''); treeMenuTargetId = ''"><Folder class="h-4 w-4" />新建文件夹</button>
                    <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openKbSettings(knowledgeBases.find(kb => kb.id === kbNode.kbId) ?? null as any); treeMenuTargetId = ''"><Settings class="h-4 w-4 text-blue-500" />权限配置</button>
                    <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" @click="deleteKb(knowledgeBases.find(kb => kb.id === kbNode.kbId) ?? null as any); treeMenuTargetId = ''"><Trash2 class="h-4 w-4" />删除</button>
                  </div>
                </div>
              </Teleport>
            </div>
            <!-- KB 下的子节点 -->
            <div v-if="expandedTreeIds.includes(kbNode.id)" class="ml-6 border-l border-zinc-100 text-xs">
              <div v-for="child in (findKbTreeNode(fileTree, kbNode.kbId ?? '')?.children ?? [])" :key="child.id" class="flex items-center gap-0.5 ml-1">
                <button
                  v-if="child.type === 'folder' && child.children?.length"
                  type="button"
                  class="grid h-6 w-5 shrink-0 place-items-center rounded text-zinc-400 hover:text-zinc-700"
                  @click.stop="toggleTreeNode(child)"
                >
                  <ChevronDown v-if="expandedTreeIds.includes(child.id)" class="h-3 w-3" />
                  <ChevronRight v-else class="h-3 w-3" />
                </button>
                <span v-else class="inline-block w-5 shrink-0" />
                <div class="group relative flex min-w-0 flex-1 items-center" @mouseenter="hoveredNodeId = child.id" @mouseleave="hoveredNodeId = ''">
                  <button
                    v-if="child.type === 'file'"
                    type="button"
                    class="flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1 cursor-pointer hover:bg-zinc-100"
                    @click="toggleTreeNode(child)"
                    @contextmenu.prevent="openTreeContextMenu(child.id, $event)"
                  >
                    <FileText class="h-3 w-3 shrink-0 text-zinc-300" />
                    <span class="truncate text-zinc-500">{{ child.label }}</span>
                  </button>
                  <button
                    v-else
                    type="button"
                    class="flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1 cursor-pointer hover:bg-zinc-100"
                    @click="toggleTreeNode(child)"
                    @contextmenu.prevent="openTreeContextMenu(child.id, $event)"
                  >
                    <Folder class="h-3 w-3 shrink-0 text-zinc-400" />
                    <span class="truncate text-zinc-600">{{ child.label }}</span>
                  </button>
                  <!-- 子节点悬停操作按钮 -->
                  <div class="shrink-0 hidden group-hover:flex items-center gap-0.5 bg-white pl-1 shadow-sm rounded-md absolute right-0" @click.stop>
                    <!-- 文件夹特有操作 -->
                    <template v-if="child.type === 'folder'">
                      <button type="button" class="inline-flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:text-blue-600 hover:bg-blue-50" aria-label="权限配置" title="权限配置" @click="openFolderPermission(child.id); treeMenuTargetId = ''">
                        <Settings class="h-3 w-3" />
                      </button>
                    </template>
                    <!-- 文件特有操作 -->
                    <template v-else>
                      <button type="button" class="inline-flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:text-blue-600 hover:bg-blue-50" aria-label="预览" title="预览" @click="previewFileFromTree({ id: child.id, node: child, depth: 1, kbId: kbNode.kbId })">
                        <Eye class="h-3 w-3" />
                      </button>
                      <button type="button" class="inline-flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:text-red-500 hover:bg-red-50" aria-label="删除文件" title="删除" @click="deleteTreeDoc(child)">
                        <Trash2 class="h-3 w-3" />
                      </button>
                    </template>
                    <button type="button" class="inline-flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100" aria-label="更多操作" title="更多操作" @click="openTreeMenu($event, `${kbNode.id}-${child.id}`)">
                      <MoreVertical class="h-3 w-3" />
                    </button>
                  </div>
                  <!-- 子节点 ⋮ 下拉菜单 -->
                  <Teleport to="body">
                    <div v-if="treeMenuTargetId === `${kbNode.id}-${child.id}`" class="fixed inset-0 z-[70]" @click="treeMenuTargetId = ''">
                      <div class="absolute w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-sm shadow-2xl" :style="{ left: `${treeMenuPos.x}px`, top: `${treeMenuPos.y}px` }" @click.stop>
                        <div class="px-3 py-2 text-xs font-semibold text-zinc-400">{{ child.label }}</div>
                        <template v-if="child.type === 'folder'">
                          <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="toggleTreeNode(child); treeMenuTargetId = ''"><Folder class="h-4 w-4" />打开</button>
                          <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openCreateFolderModalAt(child.id); treeMenuTargetId = ''"><Folder class="h-4 w-4" />新建文件夹</button>
                          <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openFolderPermission(child.id); treeMenuTargetId = ''"><Settings class="h-4 w-4 text-blue-500" />权限配置</button>
                          <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" @click="deleteTreeFolder(child); treeMenuTargetId = ''"><Trash2 class="h-4 w-4" />删除</button>
                        </template>
                        <template v-else>
                          <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="previewFileFromTree({ id: child.id, node: child, depth: 1, kbId: kbNode.kbId }); treeMenuTargetId = ''"><Eye class="h-4 w-4" />预览</button>
                          <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" @click="deleteTreeDoc(child); treeMenuTargetId = ''"><Trash2 class="h-4 w-4" />删除</button>
                        </template>
                      </div>
                    </div>
                  </Teleport>
                </div>
              </div>
              <!-- 嵌套的子文件夹 -->
              <div v-for="child in (findKbTreeNode(fileTree, kbNode.kbId ?? '')?.children ?? []).filter(c => c.type === 'folder' && expandedTreeIds.includes(c.id))" :key="child.id" class="ml-6">
                <div v-for="grandchild in child.children ?? []" :key="grandchild.id" class="flex items-center gap-0.5 ml-1">
                  <span class="inline-block w-5 shrink-0" />
                  <div class="group relative flex min-w-0 flex-1 items-center" @mouseenter="hoveredNodeId = grandchild.id" @mouseleave="hoveredNodeId = ''">
                    <button
                      v-if="grandchild.type === 'file'"
                      type="button"
                      class="flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1 cursor-pointer hover:bg-zinc-100"
                      @click="toggleTreeNode(grandchild)"
                    >
                      <FileText class="h-3 w-3 shrink-0 text-zinc-300" />
                      <span class="truncate text-zinc-500">{{ grandchild.label }}</span>
                    </button>
                    <!-- 嵌套子节点悬停操作按钮 -->
                    <div class="shrink-0 hidden group-hover:flex items-center gap-0.5 bg-white pl-1 shadow-sm rounded-md absolute right-0" @click.stop>
                      <button type="button" class="inline-flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:text-blue-600 hover:bg-blue-50" aria-label="预览" title="预览" @click="previewFileFromTree({ id: grandchild.id, node: grandchild, depth: 2, kbId: kbNode.kbId })">
                        <Eye class="h-3 w-3" />
                      </button>
                      <button type="button" class="inline-flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:text-red-500 hover:bg-red-50" aria-label="删除文件" title="删除" @click="deleteTreeDoc(grandchild)">
                        <Trash2 class="h-3 w-3" />
                      </button>
                      <button type="button" class="inline-flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100" aria-label="更多操作" title="更多操作" @click="openTreeMenu($event, `${kbNode.id}-${grandchild.id}`)">
                        <MoreVertical class="h-3 w-3" />
                      </button>
                    </div>
                    <!-- 嵌套子节点 ⋮ 菜单 -->
                    <Teleport to="body">
                      <div v-if="treeMenuTargetId === `${kbNode.id}-${grandchild.id}`" class="fixed inset-0 z-[70]" @click="treeMenuTargetId = ''">
                        <div class="absolute w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-sm shadow-2xl" :style="{ left: `${treeMenuPos.x}px`, top: `${treeMenuPos.y}px` }" @click.stop>
                          <div class="px-3 py-2 text-xs font-semibold text-zinc-400">{{ grandchild.label }}</div>
                          <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="previewFileFromTree({ id: grandchild.id, node: grandchild, depth: 2, kbId: kbNode.kbId }); treeMenuTargetId = ''"><Eye class="h-4 w-4" />预览</button>
                          <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" @click="deleteTreeDoc(grandchild); treeMenuTargetId = ''"><Trash2 class="h-4 w-4" />删除</button>
                        </div>
                      </div>
                    </Teleport>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- 回收站入口 -->
      <div class="border-t border-zinc-100 p-3">
        <button type="button" class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium" :class="activeKnowledgeTab === 'trash' ? 'bg-blue-50 text-blue-700' : 'text-zinc-600 hover:bg-zinc-50'" @click="activeKnowledgeTab = activeKnowledgeTab === 'trash' ? 'assets' : 'trash'">
          <Trash2 class="h-4 w-4" />
          <span>回收站</span>
          <span v-if="recycleItems.length" class="ml-auto rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">{{ recycleItems.length }}</span>
        </button>
      </div>
    </aside>

    <!-- Main -->
    <main
      v-if="activeKnowledgeTab !== 'trash'"
      v-show="!shouldPreviewTakeOver"
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
          <template v-for="(crumb, idx) in breadcrumbTrail" :key="idx">
            <button v-if="crumb.onClick" type="button" class="rounded-md px-1.5 py-0.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800" @click="crumb.onClick">{{ crumb.label }}</button>
            <span v-else class="truncate font-semibold text-zinc-950">{{ crumb.label }}</span>
            <span v-if="idx &lt; breadcrumbTrail.length - 1" class="text-zinc-300">/</span>
          </template>
        </div>
        <div class="ml-auto flex items-center justify-end gap-2">
          <div class="relative">
            <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-300" />
            <input v-if="selectedKb" v-model="fileSearch" type="text" placeholder="搜索文件..." class="w-[clamp(180px,18vw,320px)] rounded-lg border border-zinc-200 py-2 pl-8 pr-3 text-xs text-zinc-600 placeholder:text-zinc-300 focus:border-blue-200 focus:outline-none" />
            <input v-else v-model="kbSearch" type="text" placeholder="搜索知识库..." class="w-[clamp(180px,18vw,320px)] rounded-lg border border-zinc-200 py-2 pl-8 pr-3 text-xs text-zinc-600 placeholder:text-zinc-300 focus:border-blue-200 focus:outline-none" />
          </div>
          <div class="inline-flex h-9 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <button class="px-2.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" :class="{ 'bg-zinc-100 text-zinc-600': fileView === 'list' }" aria-label="列表视图" @click="fileView = 'list'"><List class="h-4 w-4" /></button>
            <button class="px-2.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" :class="{ 'bg-zinc-100 text-zinc-600': fileView === 'grid' }" aria-label="宫格视图" @click="fileView = 'grid'"><LayoutGrid class="h-4 w-4" /></button>
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
        <div v-if="!selectedKbId" class="space-y-8">
          <section>
            <div class="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold text-zinc-950">收藏知识库</h2>
                <p class="mt-1 text-xs text-zinc-400">{{ activeNode?.label ?? '全部知识库' }}</p>
              </div>
              <span class="rounded-full bg-white px-2 py-1 text-xs text-zinc-400">{{ displayedKnowledgeBases.length }} 个知识库</span>
            </div>
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              <div
                v-for="kb in pinnedKnowledgeBases"
                :key="kb.id"
                class="group relative min-h-20 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50/40"
                @contextmenu.prevent="openKbContextMenu(kb, $event)"
              >
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
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                    <button v-if="kb.canEdit" type="button" class="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800" :aria-label="`重命名知识库 ${kb.name}`" @click.stop="beginRenameKb(kb)"><Pencil class="h-4 w-4" /></button>
                    <button v-if="kb.canEdit" type="button" class="rounded-md p-1.5 text-zinc-400 hover:bg-blue-50 hover:text-blue-600" :aria-label="`移动知识库 ${kb.name}`" @click.stop="moveKb(kb)"><Move class="h-4 w-4" /></button>
                    <button v-if="kb.canEdit" type="button" class="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600" :aria-label="`删除知识库 ${kb.name}`" @click.stop="deleteKb(kb)"><Trash2 class="h-4 w-4" /></button>
                  </div>
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
          <button class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50" aria-label="知识库问答" @click="openQaPanel">
            <MessageSquareText class="h-4 w-4" />
            <span>知识库问答</span>
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

        <div v-if="selectedKb && fileView === 'list'" class="overflow-hidden rounded-xl border border-zinc-200 bg-white" v-show="!isThreeColumn">
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
              <tr v-for="doc in filteredDocs" :key="doc.name" data-testid="knowledge-file-row" class="border-b border-zinc-100 last:border-0" :class="{ 'opacity-40 cursor-default': !isDocAccessible(doc), 'cursor-pointer hover:bg-zinc-50': isDocAccessible(doc), 'bg-blue-50/50': selectedFileIds.includes(doc.name) }" @click="isDocAccessible(doc) && openPreview(doc)" @contextmenu.prevent="openDocContextMenu(doc, $event)">
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
                <td class="px-4 py-3" :class="{ 'hidden xl:table-cell': previewDoc }"><span class="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500">{{ doc.format }}</span>
                    <span class="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium" :class="getDocSecurityClass(doc.securityLevel)">{{ getDocSecurityLabel(doc.securityLevel) }}</span></td>
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
          <div v-for="doc in filteredDocs" :key="doc.name" data-testid="knowledge-file-card" class="relative rounded-xl border border-zinc-200 bg-white transition" :class="[isDocAccessible(doc) ? 'cursor-pointer hover:border-orange-300' : 'opacity-40 cursor-default', selectedFileIds.includes(doc.name) ? 'ring-2 ring-blue-300' : '', previewDoc ? 'p-3' : 'p-4']" @click="isDocAccessible(doc) && openPreview(doc)" @contextmenu.prevent="openDocContextMenu(doc, $event)">
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
      :style="shouldPreviewTakeOver ? { left: sidebarVisible ? 'clamp(286px,21vw,400px)' : '0px', right: '0px' } : { right: qaOpen ? qaPanelWidth : '0px', width: previewPanelWidth }"
    >
      <div class="flex h-14 items-center justify-between gap-3 border-b border-zinc-200 px-4">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-zinc-950">文件预览</div>
          <div class="truncate text-xs text-zinc-400">{{ activePreviewDoc?.name ?? '已打开文件' }}</div>
        </div>
        <button type="button" class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" aria-label="关闭预览" @click="closePreviewPanel">
          <X class="h-4 w-4" />
        </button>
      </div>
      <div v-if="previewTabs.length > 1" class="flex min-h-11 gap-1 overflow-x-auto border-b border-zinc-100 bg-zinc-50 px-3 py-2">
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
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-zinc-950">小智</span>
              <span v-if="qaMessages.length > 0" class="text-[10px] text-zinc-400">共 {{ qaMessages.length }} 条消息</span>
            </div>
            <div class="truncate text-xs text-zinc-400">
              <template v-if="selectedKb">基于「{{ selectedKb.name }}」</template>
              <template v-else>知识库问答助手</template>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button
            v-if="qaMessages.length > 0"
            type="button"
            class="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="新建对话"
            title="清空对话"
            @click="clearQaHistory"
          >
            <RotateCw class="h-4 w-4" />
          </button>
          <button type="button" class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" aria-label="关闭小智" @click="closeQaPanel">
            <X class="h-4 w-4" />
          </button>
        </div>
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
            <div class="mt-2 text-sm leading-6 text-zinc-500">
              我可以基于当前
              <span class="font-medium text-blue-600">{{ selectedKb?.name ?? '知识库' }}</span>
              和已打开文件回答问题，并在回答里保留可追溯引用。
            </div>
          </div>
          <div class="space-y-2">
            <button v-for="question in ['这个知识库里有哪些可复用案例？', '预算分档应该怎么解释给客户？', '找出需要人工复核的风险点']" :key="question" type="button" class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-xs text-zinc-600 hover:border-blue-200 hover:bg-blue-50" @click="sendQuickQuestion(question)">{{ question }}</button>
          </div>
        </div>
        <div v-for="(msg, index) in qaMessages" :key="msg.id || index" class="group/qa" :class="msg.role === 'user' ? 'ml-8' : 'mr-8'">
          <div v-if="qaEditId === msg.id" class="flex items-start gap-2">
            <textarea v-model="qaEditDraft" class="flex-1 resize-none rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none" rows="2" @keydown.enter.exact.prevent="commitEditQaMessage(msg)" @keydown.esc.prevent="qaEditId = null; qaEditDraft = ''" />
            <button class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white" @click="commitEditQaMessage(msg)">保存</button>
          </div>
          <div v-if="msg.thinking && msg.thinking.length" class="mb-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
            <ThinkingChain :steps="msg.thinking" :is-collapsed="!qaThinkingOpen" @toggle="qaThinkingOpen = !qaThinkingOpen" />
          </div>
          <div class="rounded-2xl px-3 py-2.5 leading-6" :class="msg.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'">
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
            <div v-if="msg.citations?.length" class="mt-3 grid grid-cols-1 gap-2 border-t border-zinc-100 pt-2">
              <div v-for="(cit, idx) in msg.citations" :key="cit" class="group cursor-pointer rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-blue-300 hover:shadow-md" @click="openCitationRef(idx + 1, msg.citations)">
                <div class="flex items-start gap-3">
                  <div class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 ring-1 ring-blue-100">
                    <FileText class="h-5 w-5" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="truncate text-sm font-semibold text-zinc-900 group-hover:text-blue-700">{{ cit }}</span>
                      <span class="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">#{{ idx + 1 }}</span>
                    </div>
                    <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">来源文档 · 相关引用内容摘要</p>
                  </div>
                </div>
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
              <span class="mx-1 h-4 w-px bg-zinc-200" />
              <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-green-50 hover:text-green-600" aria-label="有用" title="答案有帮助">
                <ThumbsUp class="h-3.5 w-3.5" />
              </button>
              <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-red-50 hover:text-red-500" aria-label="没用" title="答案无帮助">
                <ThumbsDown class="h-3.5 w-3.5" />
              </button>
              <span class="mx-1 h-4 w-px bg-zinc-200" />
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
            :placeholder="qaLoading ? '小智正在回答...' : '问小智任何问题...'"
            :disabled="qaLoading"
            rows="1"
            @input="resizeQaTextarea"
            @keydown.enter.exact.prevent="askKnowledgeBase"
          />
          <button
            type="button"
            class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition"
            :class="qaQuestion.trim() && !qaLoading ? 'bg-zinc-950 text-white hover:bg-zinc-800' : 'cursor-not-allowed bg-zinc-100 text-zinc-300'"
            :disabled="!qaQuestion.trim() || qaLoading"
            @click="askKnowledgeBase"
          >
            <ArrowUp v-if="!qaLoading" class="h-4 w-4" />
            <RotateCw v-else class="h-4 w-4 animate-spin" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Create KB modal -->
    <Teleport to="body">
      <div v-if="contextMenu" class="fixed inset-0 z-[55]" @click="contextMenu = null">
        <div class="absolute w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-sm shadow-2xl" :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }" @click.stop>
          <!-- 右键知识库行 -->
          <template v-if="contextMenu.type === 'kb' && contextKb">
            <div class="px-3 py-2 text-xs font-semibold text-zinc-400">{{ contextKb.name }}</div>
            <button v-if="contextKb.canEdit" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="selectKb(contextKb.id); contextMenu = null"><BookOpen class="h-4 w-4 text-orange-500" />打开</button>
            <button v-if="contextKb.canEdit" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openCreateFolderModalAt(contextKb.id); contextMenu = null"><Folder class="h-4 w-4" />新建文件夹</button>
            <button v-if="contextKb.canEdit" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openKbSettings(contextKb); contextMenu = null"><Settings class="h-4 w-4 text-blue-500" />权限配置</button>
            <button v-if="contextKb.canEdit && !contextKb.isBuiltIn" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" @click="deleteKb(contextKb); contextMenu = null"><Trash2 class="h-4 w-4" />删除</button>
          </template>
          <!-- 右键文件（文件列表中） -->
          <template v-else-if="contextMenu.type === 'doc' && contextDoc">
            <div class="px-3 py-2 text-xs font-semibold text-zinc-400">文件操作</div>
            <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openPreview(contextDoc); contextMenu = null"><Eye class="h-4 w-4" />预览</button>
            <button v-if="selectedKb?.canEdit" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="moveDoc(contextDoc); contextMenu = null"><Move class="h-4 w-4" />移动</button>
            <button v-if="selectedKb?.canEdit" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openFileSettings(contextDoc); contextMenu = null"><Settings class="h-4 w-4 text-blue-500" />权限设置</button>
            <button v-if="selectedKb?.canEdit" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" @click="deleteDoc(contextDoc); contextMenu = null"><Trash2 class="h-4 w-4" />删除</button>
          </template>
          <!-- 右键文件树节点 -->
          <template v-else-if="contextMenu.type === 'tree' && contextTreeNode && contextMenu.id !== '__root__'">
            <template v-if="contextTreeNode?.type === 'file' && contextTreeDoc">
              <div class="px-3 py-2 text-xs font-semibold text-zinc-400">{{ contextTreeDoc.name }}</div>
              <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openPreview(contextTreeDoc); contextMenu = null"><Eye class="h-4 w-4" />预览</button>
              <button v-if="true" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="moveDoc(contextTreeDoc); contextMenu = null"><Move class="h-4 w-4" />移动</button>
              <button v-if="true" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openFileSettings(contextTreeDoc); contextMenu = null"><Settings class="h-4 w-4 text-blue-500" />权限设置</button>
              <button v-if="true" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" @click="deleteTreeDoc(contextTreeNode)"><Trash2 class="h-4 w-4" />删除</button>
            </template>
            <template v-else-if="contextTreeNode?.type === 'folder'">
              <div class="px-3 py-2 text-xs font-semibold text-zinc-400">{{ contextTreeNode.label }}</div>
              <button v-if="true" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="toggleTreeNode(contextTreeNode); contextMenu = null"><Folder class="h-4 w-4" />打开</button>
              <!-- 知识库节点：新建文件夹、权限配置、删除 -->
              <template v-if="isKnowledgeBaseNode(contextTreeNode)">
                <button v-if="true" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openCreateFolderModalAt(contextMenu.id); contextMenu = null"><Folder class="h-4 w-4" />新建文件夹</button>
                <button v-if="true" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openFolderPermission(contextMenu.id); contextMenu = null"><Settings class="h-4 w-4 text-blue-500" />权限配置</button>
                <button v-if="canDeleteFolder(contextTreeNode)" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" @click="deleteTreeFolder(contextTreeNode)"><Trash2 class="h-4 w-4" />删除</button>
              </template>
              <!-- 普通文件夹：新建文件夹、权限配置、删除 -->
              <template v-else>
                <button v-if="true" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openCreateFolderModalAt(contextMenu.id); contextMenu = null"><Folder class="h-4 w-4" />新建文件夹</button>
                <button v-if="true" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="openFolderPermission(contextMenu.id); contextMenu = null"><Settings class="h-4 w-4 text-blue-500" />权限配置</button>
                <button v-if="canDeleteFolder(contextTreeNode)" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" @click="deleteTreeFolder(contextTreeNode)"><Trash2 class="h-4 w-4" />删除</button>
              </template>
            </template>
          </template>
        </div>
      </div>
    </Teleport>

    <Dialog v-model:open="createMode">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>新建知识库</DialogTitle>
          <DialogDescription>选择所属空间后创建知识库</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <div class="grid gap-2">
            <label class="text-xs font-medium text-zinc-600">知识库名称</label>
            <Input v-model="createKbName" placeholder="输入知识库名称" />
          </div>
          <div class="grid gap-2">
            <label class="text-xs font-medium text-zinc-600">所属空间</label>
            <div class="flex gap-2">
              <Button variant="outline" size="sm" class="flex-1" :class="createKbType === 'public' ? 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-50' : ''" @click="createKbType = 'public'">公共空间</Button>
              <Button variant="outline" size="sm" class="flex-1" :class="createKbType === 'personal' ? 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-50' : ''" @click="createKbType = 'personal'">个人空间</Button>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="createMode = false">取消</Button>
          <Button @click="createKnowledgeBase">创建</Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="createFolderMode">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>新建文件夹</DialogTitle>
          <DialogDescription>在知识库中创建新的文件夹</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <div class="grid gap-2">
            <label class="text-xs font-medium text-zinc-600">文件夹名称</label>
            <Input v-model="createFolderName" placeholder="例如：投标资料" />
          </div>
          <div class="grid gap-2">
            <label class="text-xs font-medium text-zinc-600">选择所属文件夹</label>
            <div class="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-1">
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
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="createFolderMode = false">取消</Button>
          <Button data-testid="create-folder-confirm" @click="createFolder">确认</Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Floating upload tasks -->
    <Teleport to="body">
      <div v-if="uploadTasks.length" class="fixed bottom-5 right-5 z-[60] flex w-[min(420px,calc(100vw-2rem))] max-h-[calc(100vh-8rem)] flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-300/50">
        <!-- 标题栏（固定） -->
        <div class="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
          <div class="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <Upload class="h-4 w-4 text-blue-600" />
            📤 文件上传 — {{ taskDoneCount }}成功 / {{ taskTotalCount }}总数
          </div>
          <div class="flex items-center gap-1">
            <button v-if="hasPendingTasks" type="button" class="rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100" @click="cancelAllUploadTasks">全部取消</button>
            <button type="button" class="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="关闭上传面板" @click="uploadTasks = []"><X class="h-4 w-4" /></button>
          </div>
        </div>
        <!-- 任务列表（可滚动） -->
        <div class="flex-1 space-y-1.5 overflow-y-auto px-3 py-2">
          <div v-for="task in visibleTasks" :key="task.id" class="rounded-lg bg-zinc-50 px-3 py-2 text-xs">
            <div class="flex items-center gap-2">
              <!-- 图标 -->
              <span class="shrink-0 text-sm">
                <span v-if="task.status === 'done'">🟢</span>
                <span v-else-if="task.status === 'reviewing'">🟡</span>
                <span v-else-if="task.status === 'failed' || task.status === 'upload_failed' || task.status === 'process_failed' || task.status === 'process_failed_permanent'">❌</span>
                <span v-else-if="task.status === 'cancelled'">➖</span>
                <span v-else>🔵</span>
              </span>
              <!-- 文件名 -->
              <span class="min-w-0 flex-1 truncate font-medium text-zinc-800" :title="task.name">{{ task.name }}</span>
              <!-- 文件大小 -->
              <span v-if="task.size" class="shrink-0 text-zinc-400">{{ task.size }}</span>
              <!-- 进度 -->
              <span class="shrink-0 tabular-nums text-zinc-400">{{ task.progress }}%</span>
              <!-- 操作按钮 -->
              <button v-if="task.status === 'pending' || task.status === 'uploading'" type="button" class="shrink-0 rounded-md px-1.5 py-0.5 text-zinc-500 hover:bg-white hover:text-red-600" @click="cancelUploadTask(task.id)" title="取消上传">取消</button>
              <button v-else-if="task.status === 'failed' || task.status === 'upload_failed'" type="button" class="shrink-0 rounded-md px-1.5 py-0.5 text-blue-600 hover:bg-white" @click="retryUploadTask(task.id)" title="重新上传">重新上传</button>
              <button v-else-if="task.status === 'process_failed' || task.status === 'process_failed_permanent'" type="button" class="shrink-0 rounded-md px-1.5 py-0.5 text-blue-600 hover:bg-white" @click="retryUploadTask(task.id)" title="手动重试">手动重试</button>
              <button v-else-if="task.status === 'cancelled' || (task.status === 'done' && task.quickUpload)" type="button" class="shrink-0 rounded-md px-1.5 py-0.5 text-blue-600 hover:bg-white" @click="retryUploadTask(task.id)" title="重新处理">重新处理</button>
              <button v-else type="button" class="shrink-0 rounded-md p-0.5 text-zinc-400 hover:bg-white hover:text-zinc-700" :aria-label="`关闭任务 ${task.name}`" @click="dismissUploadTask(task.id)"><X class="h-3.5 w-3.5" /></button>
            </div>
            <!-- 进度条 -->
            <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="task.status === 'failed' || task.status === 'upload_failed' || task.status === 'process_failed' || task.status === 'process_failed_permanent' ? 'bg-rose-500' : task.status === 'reviewing' ? 'bg-amber-500' : task.status === 'cancelled' ? 'bg-zinc-300' : task.status === 'done' && task.qualityWarning ? 'bg-amber-400' : 'bg-blue-500'"
                :style="{ width: `${task.progress}%` }"
              />
            </div>
            <!-- 状态文字 -->
            <div class="mt-1 flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="font-medium" :class="statusTextClass(task.status)">
                  {{ statusTextLabel(task) }}
                </span>
                <!-- 极速上传标注 -->
                <span v-if="task.status === 'done' && task.quickUpload" class="rounded bg-zinc-200/70 px-1.5 py-0.5 text-[10px] text-zinc-500" title="检测到知识库内已有相同文件，已极速完成处理">⚡ 极速上传</span>
                <!-- 质量预警 -->
                <span v-if="task.status === 'done' && task.qualityWarning" class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-600" title="OCR 识别质量偏低，检索效果可能受影响">⚠️ 质量预警</span>
              </div>
              <button v-if="task.doc" type="button" class="rounded-md px-2 py-0.5 text-blue-600 hover:bg-white" @click="openPreview(task.doc)">查看</button>
            </div>
            <!-- 辅助消息 -->
            <div v-if="task.message && task.status !== 'pending' && task.status !== 'uploading' && task.status !== 'processing'" class="mt-1 text-[10px] text-zinc-400 italic">{{ task.message }}</div>
          </div>
        </div>
        <!-- 折叠/展开入口（固定底部） -->
        <div v-if="hiddenTasksCount > 0" class="border-t border-zinc-100 px-4 py-2 text-center">
          <button type="button" class="text-xs font-medium text-blue-600 hover:text-blue-700" @click="showAllTasks = !showAllTasks">
            {{ showAllTasks ? `↑ 收起（展示前4个）` : `→ 展开全部（${hiddenTasksCount}个任务隐藏）` }}
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Upload modal -->
    <Dialog v-model:open="uploadModalOpen">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>上传文件{{ selectedKb ? ` - ${selectedKb.name}` : '' }}</DialogTitle>
          <DialogDescription>{{ selectedKb ? `上传到 ${selectedKb.name}` : '请先选择知识库，或上传后再移动归档' }}</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <!-- 拖拽上传 -->
          <label
            class="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition"
            :class="uploadDragOver ? 'border-blue-400 bg-blue-50' : 'border-zinc-300 bg-zinc-50 hover:border-blue-300 hover:bg-blue-50/50'"
            @dragover.prevent="uploadDragOver = true"
            @dragleave.prevent="uploadDragOver = false"
            @drop.prevent="handleUploadDrop($event)"
          >
            <Upload class="h-8 w-8" :class="uploadDragOver ? 'text-blue-600' : 'text-blue-500'" />
            <span class="mt-3 text-sm font-medium" :class="uploadDragOver ? 'text-blue-700' : 'text-zinc-800'">{{ uploadDragOver ? '松开以上传' : '点击选择文件或将文件拖拽到此处' }}</span>
            <span class="mt-1 text-xs text-zinc-400">支持 PDF、Word、Excel、PPT、TXT、PNG、JPG，单个文件 100MB 内</span>
            <input class="hidden" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg" @change="handleUploadFiles" />
          </label>
          <!-- 校验错误提示 -->
          <div v-if="uploadFileErrors.length" class="space-y-1 rounded-lg border border-rose-200 bg-rose-50 p-2">
            <div v-for="(err, i) in uploadFileErrors" :key="i" class="flex items-start gap-1.5 text-[11px] text-rose-600">
              <span>⚠️</span>
              <span>{{ err }}</span>
            </div>
          </div>
          <!-- 候选文件列表（带高度限制） -->
          <div>
            <div v-if="uploadFileNames.length" class="mb-1 flex items-center justify-between">
              <span class="text-xs font-medium text-zinc-600">已选 {{ uploadFileNames.length }} 个文件</span>
              <button v-if="uploadFileNames.length > 0" type="button" class="text-xs text-zinc-400 hover:text-red-500" @click="uploadFileNames = []">清空全部</button>
            </div>
            <div v-if="uploadFileNames.length" class="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-2">
              <div v-for="name in uploadFileNames" :key="name" class="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50">
                <File class="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <span class="min-w-0 flex-1 truncate">{{ name }}</span>
                <span class="shrink-0 text-zinc-400">{{ humanFileSize(Math.floor(Math.random() * 10 * 1024 * 1024) + 512 * 1024) }}</span>
                <span class="rounded bg-blue-50 px-1 py-0.5 text-[10px] font-medium text-blue-600">待上传</span>
                <button type="button" class="shrink-0 rounded p-0.5 text-zinc-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100" aria-label="移除文件" @click="uploadFileNames = uploadFileNames.filter(n => n !== name)"><X class="h-3 w-3" /></button>
              </div>
            </div>
          </div>
          <!-- 空文件提示 -->
          <div v-if="!uploadFileNames.length && !uploadFileErrors.length" class="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-400">
            请先选择或拖拽文件
          </div>
          <!-- 高级设置（折叠） -->
          <div>
            <button type="button" class="flex w-full items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900" @click="uploadAdvancedOpen = !uploadAdvancedOpen">
              <ChevronDown v-if="uploadAdvancedOpen" class="h-3.5 w-3.5" />
              <ChevronRight v-else class="h-3.5 w-3.5" />
              高级设置
            </button>
            <div v-if="uploadAdvancedOpen" class="mt-2 space-y-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
              <!-- 标签选择 -->
              <div>
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-xs font-medium text-zinc-600">标签</span>
                  <button type="button" class="text-xs text-blue-500 hover:text-blue-700" @click="uploadShowTagPicker = !uploadShowTagPicker">{{ uploadShowTagPicker ? '收起' : '+ 自定义标签' }}</button>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button v-for="tag in predefinedTags" :key="tag.name" type="button" class="rounded-md border px-2 py-0.5 text-[11px] font-medium transition" :class="uploadTags.includes(tag.name) ? tag.color + ' border-current' : 'border-zinc-200 text-zinc-400 hover:border-zinc-300'" @click="toggleUploadTag(tag.name)">{{ tag.name }}</button>
                </div>
                <div v-if="uploadShowTagPicker" class="mt-2 flex items-center gap-2">
                  <Input v-model="uploadCustomTagName" placeholder="标签名称" class="flex-1" @keydown.enter.prevent="addCustomTag" />
                  <input v-model="uploadCustomTagColor" type="color" class="h-8 w-8 cursor-pointer rounded border border-zinc-200" />
                  <Button variant="secondary" size="sm" @click="addCustomTag">添加</Button>
                </div>
              </div>
              <!-- 密级选择 -->
              <div>
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-xs font-medium text-zinc-600">密级</span>
                  <span class="text-[10px] text-zinc-400">标注文件敏感程度</span>
                </div>
                <div class="flex gap-2">
                  <button v-for="sl in SECURITY_LEVELS" :key="sl.value" type="button"
                    class="flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition"
                    :class="uploadSecurityLevel === sl.value ? sl.activeClass : 'border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:text-zinc-600'"
                    :title="sl.bizDesc"
                    @click="uploadSecurityLevel = sl.value">
                    {{ sl.label }}
                  </button>
                </div>
                <div v-if="uploadSecurityLevel === '部门'" class="mt-2 rounded-xl border border-zinc-200 bg-white p-2">
                  <div class="mb-1.5 text-[11px] font-medium text-zinc-600">选择部门</div>
                  <div class="max-h-32 space-y-1 overflow-y-auto">
                    <label v-for="dept in orgTree.filter(n => n.type === 'dept')" :key="dept.id" class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-zinc-50">
                      <input type="checkbox" :checked="uploadAllowedDepts.some(d => d.id === dept.id)" @change="toggleUploadDept(dept)" class="rounded border-zinc-300 text-blue-600" />
                      <span class="text-zinc-700">{{ dept.name }}</span>
                      <span class="ml-auto text-zinc-400">({{ dept.children?.length ?? 0 }}人)</span>
                    </label>
                  </div>
                </div>
                <p v-if="uploadSecurityLevel === '部门' && !uploadAllowedDepts.length" class="mt-1 text-[10px] text-amber-500">请至少选择一个部门，否则文件默认为"全员"可见</p>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" @click="uploadModalOpen = false">取消</Button>
            <Button aria-label="确认上传文件" :disabled="uploadFileNames.length === 0" @click="confirmUpload">确认上传</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Move/Share modal -->
    <Dialog v-model:open="fileActionModalOpen">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>移动文件到知识库</DialogTitle>
          <DialogDescription>选择目标知识库</DialogDescription>
        </DialogHeader>
        <div class="relative mb-2">
          <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-300" />
          <Input v-model="targetSearch" placeholder="搜索目标知识库..." class="pl-8" />
        </div>
        <div class="max-h-64 overflow-y-auto space-y-1">
          <button v-for="kb in targetKbs" :key="kb.id" type="button" class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition" :class="targetKbId === kb.id ? 'bg-orange-50 border border-orange-200' : 'hover:bg-zinc-50 border border-transparent'" @click="targetKbId = kb.id">
            <Database class="h-4 w-4 text-violet-500 shrink-0" />
            <div class="min-w-0 flex-1"><div class="text-sm font-medium text-zinc-800">{{ kb.name }}</div><div class="text-[11px] text-zinc-400">{{ kb.space === 'public' ? '公共空间' : '个人空间' }} · {{ kb.docs }} 文档</div></div>
            <CheckSquare v-if="targetKbId === kb.id" class="h-4 w-4 text-orange-500 shrink-0" />
          </button>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="cancelFileAction">取消</Button>
          <Button :disabled="!targetKbId" @click="confirmFileAction">确认</Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Confirm modal -->
    <Dialog v-model:open="confirmModal.show">
      <DialogContent class="max-w-sm">
        <div class="flex items-center gap-2 mb-2">
          <AlertTriangle v-if="confirmModal.danger" class="h-5 w-5 text-red-500" />
          <DialogTitle>{{ confirmModal.title }}</DialogTitle>
        </div>
        <p class="text-sm leading-relaxed text-zinc-600">{{ confirmModal.message }}</p>
        <div class="flex justify-end gap-2 pt-4">
          <Button variant="outline" @click="confirmModal.show = false">取消</Button>
          <Button :variant="confirmModal.danger ? 'destructive' : 'default'" @click="confirmModal.onConfirm(); confirmModal.show = false">{{ confirmModal.confirmText ?? '确认' }}</Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 知识库设置弹窗 -->
    <Dialog v-model:open="settingsKbIdBool">
      <DialogContent class="flex h-[720px] w-[1430px] max-w-[95vw] overflow-hidden rounded-[28px] p-0" aria-describedby="settings-description">
        <div class="flex size-full">
          <!-- 左侧：知识库基础信息 -->
          <div class="flex w-[310px] shrink-0 flex-col border-r border-zinc-100 bg-zinc-50/40">
            <div class="flex flex-col items-center px-5 pt-6 pb-4">
              <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-2xl font-bold text-blue-600">{{ (activeSettingsKb?.name ?? '?').charAt(0) }}</div>
              <h3 class="mt-3 w-full truncate text-center text-[15px] font-semibold text-zinc-900">{{ activeSettingsKb?.name ?? '知识库名称' }}</h3>
              <span class="mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" :class="(activeSettingsKb?.visibility === '公开' || activeSettingsKb?.visibility === 'PUBLIC') ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'">
                <Globe v-if="(activeSettingsKb?.visibility === '公开' || activeSettingsKb?.visibility === 'PUBLIC')" class="h-3 w-3" />
                <Lock v-else class="h-3 w-3" />
                {{ (activeSettingsKb?.visibility === '公开' || activeSettingsKb?.visibility === 'PUBLIC') ? '公开' : '私有' }}
              </span>
            </div>
            <div class="flex-1 space-y-3 overflow-auto px-5 py-3">
              <div class="flex items-center justify-between text-xs">
                <span class="text-zinc-400">创建时间</span>
                <span class="text-zinc-700">{{ activeSettingsKb?.createdAt ?? '2026-01-15' }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-zinc-400">更新时间</span>
                <span class="text-zinc-700">{{ activeSettingsKb?.updatedAt ?? activeSettingsKb?.recent ?? '2026-06-20' }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-zinc-400">文档数量</span>
                <span class="text-zinc-700">{{ activeSettingsKb?.docs ?? 0 }} 篇</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-zinc-400">成员数量</span>
                <span class="text-zinc-700">{{ activeSettingsMembers.length }} 位</span>
              </div>
              <div class="flex items-start justify-between text-xs">
                <span class="shrink-0 text-zinc-400">所处空间</span>
                <span class="text-right text-zinc-700">{{ activeSettingsKb?.space === 'public' ? '公共空间' : activeSettingsKb?.space === 'personal' ? '个人空间' : '—' }}</span>
              </div>
              <div class="border-t border-zinc-200 pt-3 mt-3">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-xs font-medium text-zinc-700">全员可访问</div>
                    <div class="text-[10px] text-zinc-400">允许团队所有成员访问</div>
                  </div>
                  <button type="button" role="switch" :aria-checked="kbVisibilityOpen" class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" :class="kbVisibilityOpen ? 'bg-blue-600' : 'bg-zinc-200'" @click="kbVisibilityOpen = !kbVisibilityOpen; showFileActionToast(kbVisibilityOpen ? '已允许全员访问' : '已限制访问范围')">
                    <span class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition" :class="kbVisibilityOpen ? 'translate-x-4' : 'translate-x-0'"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：内容区 -->
          <div class="relative flex flex-1 flex-col overflow-hidden">
            <!-- 顶部 bar：知识库名称 + 关闭按钮 -->
            <div class="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
              <h2 class="text-base font-semibold text-zinc-900">{{ activeSettingsKb?.name ?? '知识库' }} 设置</h2>
              <button type="button" class="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" aria-label="关闭" @click="closeKbSettings"><X class="h-5 w-5" /></button>
            </div>

            <!-- 中间 tab 切换 -->
            <div class="flex items-center gap-6 border-b border-zinc-100 bg-zinc-50/40 px-6">
              <button type="button" class="relative py-3 text-[13px] font-medium transition" :class="settingsTab === 'members' ? 'text-blue-600' : 'text-zinc-500 hover:text-zinc-800'" @click="settingsTab = 'members'">
                成员授权
                <span v-if="settingsTab === 'members'" class="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-blue-600"></span>
              </button>
              <button type="button" class="relative py-3 text-[13px] font-medium transition" :class="settingsTab === 'documents' ? 'text-blue-600' : 'text-zinc-500 hover:text-zinc-800'" @click="settingsTab = 'documents'">
                文档管理
                <span v-if="settingsTab === 'documents'" class="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-blue-600"></span>
              </button>
              <button type="button" class="relative py-3 text-[13px] font-medium transition" :class="settingsTab === 'audit' ? 'text-blue-600' : 'text-zinc-500 hover:text-zinc-800'" @click="settingsTab = 'audit'">
                审计记录
                <span v-if="settingsTab === 'audit'" class="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-blue-600"></span>
              </button>
            </div>

            <!-- 成员授权 -->
            <template v-if="settingsTab === 'members'">
              <div class="flex items-center justify-between border-b border-zinc-100 px-6 py-3">
                <div class="flex items-center gap-3">
                  <h4 class="text-sm font-semibold text-zinc-900">成员授权</h4>
                  <span class="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">{{ activeSettingsMembers.length }} 人</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="relative">
                    <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-300" />
                    <input v-model="settingsMemberFilter" placeholder="搜索成员姓名" class="h-8 w-44 rounded-lg border border-zinc-200 pl-8 pr-3 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <button type="button" class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700" @click="settingsAddMemberOpen = true"><Plus class="h-3.5 w-3.5" />添加成员</button>
                </div>
              </div>
              <div class="flex-1 overflow-auto px-6 py-3">
                <table class="w-full text-left text-sm">
                  <thead class="sticky top-0 z-[1] bg-white text-[11px] uppercase tracking-wide text-zinc-400">
                    <tr class="border-b border-zinc-100">
                      <th class="px-3 py-2 font-medium">成员</th>
                      <th class="px-3 py-2 font-medium">部门</th>
                      <th class="px-3 py-2 font-medium">安全许可</th>
                      <th class="px-3 py-2 font-medium">权限</th>
                      <th class="px-3 py-2 font-medium">加入时间</th>
                      <th class="px-3 py-2 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-zinc-100">
                    <tr v-for="member in filteredActiveSettingsMembers" :key="member.id" class="group transition odd:bg-white even:bg-zinc-50/50 hover:bg-blue-50/40">
                      <td class="px-3 py-2.5">
                        <div class="flex items-center gap-2.5">
                          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-[11px] font-semibold text-blue-600">{{ member.name[0] }}</div>
                          <span class="truncate font-medium text-zinc-900">{{ member.name }}</span>
                        </div>
                      </td>
                      <td class="px-3 py-2.5 text-xs">
                        <div class="text-zinc-700">{{ member.department }}</div>
                        <div class="text-[10px] text-zinc-400">{{ member.scope === '个人' ? '直接授权' : member.scope === '部门' ? '按部门授权' : member.scope }}</div>
                      </td>
                      <td class="px-3 py-2.5">
                        <select :value="member.securityClearance ?? getDefaultClearance(member.role)" class="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" @change="updateMemberClearance(member, ($event.target as HTMLSelectElement).value as SecurityLevel)">
                          <option v-for="sl in SECURITY_LEVELS" :key="sl.value" :value="sl.value">{{ sl.label }}</option>
                        </select>
                      </td>
                      <td class="px-3 py-2.5">
                        <select :value="member.role" class="rounded-lg border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" @change="updatePermissionRole(member, ($event.target as HTMLSelectElement).value as PermissionRole)">
                          <option value="OWNER">所有者</option><option value="MANAGER">管理员</option><option value="EDITOR">编辑者</option><option value="VIEWER">查看者</option>
                        </select>
                      </td>
                      <td class="px-3 py-2.5 text-xs text-zinc-500">{{ member.joinedAt?.slice(0, 10) }}</td>
                      <td class="px-3 py-2.5 text-right">
                        <button type="button" class="rounded-md p-1.5 text-zinc-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100" :aria-label="'移除 ' + member.name" @click="deletePermissionMember(member)"><X class="h-3.5 w-3.5" /></button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div v-if="filteredActiveSettingsMembers.length === 0" class="py-10 text-center text-xs text-zinc-400">暂无匹配成员</div>
              </div>
              <!-- 底部：取消 + 保存设置 -->
              <div class="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50/60 px-6 py-3">
                <button type="button" class="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50" @click="closeKbSettings">取消</button>
                <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700">保存设置</button>
              </div>
            </template>

            <!-- 审计记录 -->
            <template v-else-if="settingsTab === 'audit'">
              <div class="flex items-center gap-2 border-b border-zinc-100 px-6 py-3">
                <input v-model="auditDateFrom" type="date" class="w-32 rounded-md border border-zinc-200 px-2 py-1 text-xs outline-none" title="起始" />
                <span class="text-xs text-zinc-400">~</span>
                <input v-model="auditDateTo" type="date" class="w-32 rounded-md border border-zinc-200 px-2 py-1 text-xs outline-none" title="截止" />
                <select v-model="auditFilterType" class="rounded-md border border-zinc-200 px-2 py-1 text-xs outline-none">
                  <option value="">全部类型</option>
                  <option value="上传">上传</option>
                  <option value="删除">删除</option>
                  <option value="权限">权限变更</option>
                  <option value="问答">问答</option>
                </select>
                <input v-model="auditFilterUser" class="w-24 rounded-md border border-zinc-200 px-2 py-1 text-xs outline-none" placeholder="用户" />
                <button type="button" class="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50" @click="exportAuditLog">导出</button>
              </div>
              <div class="flex-1 overflow-auto p-6">
                <div class="space-y-2">
                  <div v-for="(log, i) in filteredAuditLogs" :key="i" class="flex items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2.5 text-xs">
                    <div class="h-2 w-2 rounded-full" :class="log.sensitive ? 'bg-red-400' : 'bg-zinc-300'"></div>
                    <span class="font-medium text-zinc-800">{{ log.user }}</span>
                    <span class="text-zinc-500">{{ log.action }}</span>
                    <span v-if="log.sensitive" class="rounded bg-rose-50 px-1 py-0.5 text-[10px] text-rose-500">敏感</span>
                    <span class="ml-auto shrink-0 text-zinc-400">{{ log.time }}</span>
                  </div>
                </div>
              </div>
              <!-- 底部：取消 + 保存设置 -->
              <div class="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50/60 px-6 py-3">
                <button type="button" class="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50" @click="closeKbSettings">取消</button>
                <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700">保存设置</button>
              </div>
            </template>

            <!-- 文档管理 -->
            <template v-else-if="settingsTab === 'documents'">
              <div class="flex flex-1 flex-col overflow-hidden">
                <div class="flex items-center gap-3 border-b border-zinc-100 px-6 py-3">
                  <div class="relative flex-1">
                    <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-300" />
                    <input v-model="fileSettingsDocSearch" type="text" placeholder="搜索文件名称" class="h-8 w-full rounded-lg border border-zinc-200 pl-8 pr-3 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <select v-model="docSettingsSecurityLevelFilter" class="h-8 rounded-lg border border-zinc-200 px-2 text-xs outline-none focus:border-blue-300">
                    <option value="">全部密级</option>
                    <option v-for="sl in SECURITY_LEVELS" :key="sl.value" :value="sl.value">{{ sl.label }}</option>
                  </select>
                  <button type="button" class="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50" @click="selectedFileIds.length && showFileActionToast('批量操作：改密级/标签')">批量操作</button>
                </div>
                <div class="flex-1 overflow-auto px-6 py-3">
                  <table class="w-full text-left text-sm">
                    <thead class="sticky top-0 z-[1] bg-white text-[11px] uppercase tracking-wide text-zinc-400">
                      <tr class="border-b border-zinc-100">
                        <th class="px-3 py-2 font-medium w-8"><button class="text-zinc-400 hover:text-zinc-600" @click="selectAllDocsInSettings"><Square class="h-4 w-4" /></button></th>
                        <th class="px-3 py-2 font-medium">文件名</th>
                        <th class="px-3 py-2 font-medium">密级</th>
                        <th class="px-3 py-2 font-medium">标签</th>
                        <th class="px-3 py-2 font-medium">更新时间</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-100">
                      <tr v-for="doc in docSettingsFilteredDocs" :key="doc.name" class="hover:bg-zinc-50 transition" :class="{ 'opacity-40': !isDocAccessible(doc) }">
                        <td class="px-3 py-2.5"><button class="text-zinc-400 hover:text-blue-500" @click.stop="toggleFileSelect(doc.name)"><Square v-if="!selectedFileIds.includes(doc.name)" class="h-4 w-4" /><CheckSquare v-else class="h-4 w-4 text-blue-500" /></button></td>
                        <td class="px-3 py-2.5"><div class="flex items-center gap-2"><component :is="getFileIcon(doc.format)" class="h-4 w-4" :class="getIconColor(doc.format)" /><span class="truncate text-sm font-medium text-zinc-900">{{ doc.name }}</span></div></td>
                        <td class="px-3 py-2.5"><span class="rounded-full px-1.5 py-0.5 text-[10px] font-medium" :class="getDocSecurityClass(doc.securityLevel)">{{ getDocSecurityLabel(doc.securityLevel) }}</span></td>
                        <td class="px-3 py-2.5"><div class="flex gap-1"><span v-for="tag in doc.tags" :key="tag" class="rounded px-1 py-0.5 text-[10px] font-medium" :class="getTagStyle(tag)">{{ tag }}</span></div></td>
                        <td class="px-3 py-2.5 text-xs text-zinc-400">{{ doc.updatedAt }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div v-if="docSettingsFilteredDocs.length === 0" class="py-10 text-center text-xs text-zinc-400">暂未上传文件，或筛选条件无匹配</div>
                </div>
                <div class="border-t border-zinc-100 px-6 py-2 text-[11px] text-zinc-400">密级分布：<span v-for="sl in SECURITY_LEVELS" :key="sl.value" class="mr-3">{{ sl.label }} {{ docSettingsCountByLevel[sl.value] ?? 0 }}</span></div>
              </div>
            </template>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 添加成员弹窗（覆盖在知识库设置弹窗之上） -->
    <Teleport to="body">
      <div v-if="settingsAddMemberOpen" class="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/40 px-4 py-8" @click.self="settingsAddMemberOpen = false">
        <div class="flex h-[560px] w-[720px] overflow-hidden rounded-[20px] bg-white shadow-2xl ring-1 ring-zinc-200">
          <div class="flex flex-1 flex-col">
            <div class="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
              <div class="text-sm font-semibold text-zinc-900">添加成员</div>
              <button type="button" class="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="关闭添加成员" @click="settingsAddMemberOpen = false"><X class="h-4 w-4" /></button>
            </div>
            <div class="border-b border-zinc-100 p-3">
              <div class="relative">
                <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-300" />
                <input v-model="settingsAddMemberSearch" class="h-9 w-full rounded-lg border border-zinc-200 pl-8 pr-3 text-xs outline-none focus:border-blue-300" placeholder="搜索成员姓名或部门" />
              </div>
            </div>
            <div class="grid min-h-0 flex-1 grid-cols-2">
              <div class="flex flex-col border-r border-zinc-100">
                <div class="border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-[11px] font-medium text-zinc-500">部门候选</div>
                <div class="flex-1 overflow-auto p-2">
                  <button v-for="dept in presetDepartments" :key="dept" type="button" class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-zinc-50" @click="settingsAddMemberDept = dept">
                    <Folder class="h-3.5 w-3.5 text-zinc-400" />
                    <span class="truncate text-zinc-700">{{ dept }}</span>
                    <CheckSquare v-if="settingsAddMemberDept === dept" class="ml-auto h-3.5 w-3.5 text-blue-500" />
                  </button>
                </div>
              </div>
              <div class="flex flex-col">
                <div class="border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-[11px] font-medium text-zinc-500">已选成员（{{ settingsAddMemberSelected.length }}）</div>
                <div class="flex-1 overflow-auto p-2">
                  <button v-for="c in filteredCandidatesForDept" :key="c.name" type="button" class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-zinc-50" @click="toggleAddCandidate(c)">
                    <div class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[10px] font-medium text-blue-600">{{ c.name[0] }}</div>
                    <span class="truncate text-zinc-800">{{ c.name }}</span>
                    <CheckSquare v-if="settingsAddMemberSelected.some(s => s.name === c.name)" class="ml-auto h-3.5 w-3.5 text-blue-500" />
                  </button>
                  <div v-if="filteredCandidatesForDept.length === 0" class="py-6 text-center text-[11px] text-zinc-400">无匹配成员</div>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50 px-4 py-3">
              <div class="flex items-center gap-1.5 text-xs">
                <label class="text-zinc-500">统一角色</label>
                <select v-model="settingsAddMemberRole" class="rounded-md border border-zinc-200 px-2 py-1 text-xs">
                  <option value="EDITOR">编辑者</option><option value="MANAGER">管理员</option><option value="VIEWER">查看者</option><option value="OWNER">所有者</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <button type="button" class="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50" @click="settingsAddMemberOpen = false">取消</button>
                <button type="button" class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50" :disabled="settingsAddMemberSelected.length === 0" @click="confirmAddMembers">确认添加 ({{ settingsAddMemberSelected.length }})</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 文件设置弹窗 -->
    <Teleport to="body">
      <div v-if="fileSettingsDoc" class="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/40 px-4 py-8" @click.self="closeFileSettings">
        <div class="flex h-[720px] w-[1430px] overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-zinc-200">
          <!-- 左侧：文件基础信息 -->
          <div class="flex w-[310px] shrink-0 flex-col border-r border-zinc-100 bg-zinc-50/40">
            <div class="flex flex-col items-center px-5 pt-6 pb-4">
              <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100"><FileText class="h-8 w-8 text-blue-600" /></div>
              <h3 class="mt-3 w-full truncate text-center text-[15px] font-semibold text-zinc-900">{{ fileSettingsDoc.name }}</h3>
              <span class="mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" :class="(fileParentKb?.visibility === '公开' || fileParentKb?.visibility === 'PUBLIC') ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'">
                <Globe v-if="(fileParentKb?.visibility === '公开' || fileParentKb?.visibility === 'PUBLIC')" class="h-3 w-3" />
                <Lock v-else class="h-3 w-3" />
                {{ (fileParentKb?.visibility === '公开' || fileParentKb?.visibility === 'PUBLIC') ? '公开' : '私有' }}
              </span>
            </div>
            <div class="flex-1 space-y-3 overflow-auto px-5 py-3">
              <div class="flex items-start justify-between text-xs">
                <span class="shrink-0 text-zinc-400">文件格式</span>
                <span class="text-right text-zinc-700">{{ fileSettingsDoc.format }}</span>
              </div>
              <div class="flex items-start justify-between text-xs">
                <span class="shrink-0 text-zinc-400">索引状态</span>
                <span class="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" :class="fileSettingsDoc.status === '已索引' ? 'bg-emerald-50 text-emerald-600' : fileSettingsDoc.status === '解析中' ? 'bg-amber-50 text-amber-600' : 'bg-zinc-100 text-zinc-500'">
                  <CheckCircle2 v-if="fileSettingsDoc.status === '已索引'" class="h-3 w-3" />
                  <RotateCw v-else-if="fileSettingsDoc.status === '解析中'" class="h-3 w-3" />
                  {{ fileSettingsDoc.status }}
                </span>
              </div>
              <div class="flex items-start justify-between text-xs">
                <span class="shrink-0 text-zinc-400">上传时间</span>
                <span class="text-right text-zinc-700">{{ fileSettingsDoc.updatedAt }}</span>
              </div>
              <div class="flex items-start justify-between text-xs">
                <span class="shrink-0 text-zinc-400">上传者</span>
                <span class="text-right text-zinc-700">{{ fileSettingsDoc.uploadedBy }}</span>
              </div>
              <div class="flex items-start justify-between text-xs">
                <span class="shrink-0 text-zinc-400">文件大小</span>
                <span class="text-right text-zinc-700">{{ fileSettingsDoc.size ?? '—' }}</span>
              </div>
              <div class="flex items-start justify-between text-xs">
                <span class="shrink-0 text-zinc-400">安全等级</span>
                <span class="text-right text-zinc-700">{{ fileSettingsDoc.securityLevel ?? '—' }}</span>
              </div>
              <div class="flex items-start justify-between text-xs">
                <span class="shrink-0 text-zinc-400">所处知识库</span>
                <span class="text-right text-zinc-700">{{ fileParentKb?.name ?? '—' }}</span>
              </div>
            </div>
          </div>

          <!-- 右侧：内容区 -->
          <div class="relative flex flex-1 flex-col overflow-hidden">
            <!-- 顶部 bar：文件名称 + 关闭按钮 -->
            <div class="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
              <div class="flex items-center gap-3">
                <h2 class="text-base font-semibold text-zinc-900">{{ fileSettingsDoc.name }} 权限设置</h2>
                <span v-if="fileSettingsDoc && fileInheritedFromKb[fileSettingsDoc.name]" class="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600"><ShieldCheck class="h-3 w-3" />继承自知识库</span>
              </div>
              <div class="flex items-center gap-2">
                <button v-if="fileSettingsDoc && fileInheritedFromKb[fileSettingsDoc.name]" type="button" class="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50" @click="breakInheritanceAndCustomize">自定义权限</button>
                <button v-else type="button" class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100" @click="restoreInheritance">恢复继承</button>
                <button type="button" class="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" aria-label="关闭" @click="closeFileSettings"><X class="h-5 w-5" /></button>
              </div>
            </div>

            <!-- 中间 tab 切换 -->
            <div class="flex items-center gap-6 border-b border-zinc-100 bg-zinc-50/40 px-6">
              <button type="button" class="relative py-3 text-[13px] font-medium transition" :class="fileSettingsTab === 'members' ? 'text-blue-600' : 'text-zinc-500 hover:text-zinc-800'" @click="fileSettingsTab = 'members'">成员授权<span v-if="fileSettingsTab === 'members'" class="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-blue-600"></span></button>
              <button type="button" class="relative py-3 text-[13px] font-medium transition" :class="fileSettingsTab === 'documents' ? 'text-blue-600' : 'text-zinc-500 hover:text-zinc-800'" @click="fileSettingsTab = 'documents'">文档管理<span v-if="fileSettingsTab === 'documents'" class="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-blue-600"></span></button>
              <button type="button" class="relative py-3 text-[13px] font-medium transition" :class="fileSettingsTab === 'audit' ? 'text-blue-600' : 'text-zinc-500 hover:text-zinc-800'" @click="fileSettingsTab = 'audit'">审计记录<span v-if="fileSettingsTab === 'audit'" class="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-blue-600"></span></button>
            </div>

            <!-- 成员授权 -->
            <template v-if="fileSettingsTab === 'members'">
              <div class="flex items-center justify-between border-b border-zinc-100 px-6 py-3">
                <div class="flex items-center gap-3">
                  <h4 class="text-sm font-semibold text-zinc-900">成员授权</h4>
                  <span class="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">{{ filteredActiveFileMembers.length }} 人</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="relative">
                    <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-300" />
                    <input v-model="fileSettingsMemberFilter" placeholder="搜索成员姓名" class="h-8 w-44 rounded-lg border border-zinc-200 pl-8 pr-3 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <button type="button" class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700" @click="resetFileSettingsAddMember(); fileSettingsAddMemberOpen = true"><Plus class="h-3.5 w-3.5" />添加成员</button>
                </div>
              </div>
              <div class="flex-1 overflow-auto px-6 py-3">
                <table class="w-full text-left text-sm">
                  <thead class="sticky top-0 z-[1] bg-white text-[11px] uppercase tracking-wide text-zinc-400">
                    <tr class="border-b border-zinc-100">
                      <th class="px-3 py-2 font-medium">成员</th>
                      <th class="px-3 py-2 font-medium">部门</th>
                      <th class="px-3 py-2 font-medium">安全许可</th>
                      <th class="px-3 py-2 font-medium">权限</th>
                      <th class="px-3 py-2 font-medium">加入时间</th>
                      <th class="px-3 py-2 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-zinc-100">
                    <tr v-for="member in filteredActiveFileMembers" :key="member.id" class="group transition odd:bg-white even:bg-zinc-50/50 hover:bg-blue-50/40">
                      <td class="px-3 py-2.5">
                        <div class="flex items-center gap-2.5">
                          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-[11px] font-semibold text-blue-600">{{ member.name[0] }}</div>
                          <span class="truncate font-medium text-zinc-900">{{ member.name }}</span>
                        </div>
                      </td>
                      <td class="px-3 py-2.5 text-xs">
                        <div class="text-zinc-700">{{ member.department }}</div>
                        <div class="text-[10px] text-zinc-400">{{ member.scope === '个人' ? '直接授权' : member.scope === '部门' ? '按部门授权' : member.scope }}</div>
                      </td>
                      <td class="px-3 py-2.5">
                        <select :value="member.securityClearance ?? getDefaultClearance(member.role)" class="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" @change="updateFileMemberClearance(member, ($event.target as HTMLSelectElement).value as SecurityLevel)">
                          <option v-for="sl in SECURITY_LEVELS" :key="sl.value" :value="sl.value">{{ sl.label }}</option>
                        </select>
                      </td>
                      <td class="px-3 py-2.5">
                        <select :value="member.role" class="rounded-lg border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" @change="updateFilePermissionRole(member, ($event.target as HTMLSelectElement).value as PermissionRole)">
                          <option value="OWNER">所有者</option><option value="MANAGER">管理员</option><option value="EDITOR">编辑者</option><option value="VIEWER">查看者</option>
                        </select>
                      </td>
                      <td class="px-3 py-2.5 text-xs text-zinc-500">{{ member.joinedAt?.slice(0, 10) }}</td>
                      <td class="px-3 py-2.5 text-right">
                        <button type="button" class="rounded-md p-1.5 text-zinc-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100" :aria-label="'移除 ' + member.name" @click="deleteFilePermissionMember(member)"><X class="h-3.5 w-3.5" /></button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div v-if="filteredActiveFileMembers.length === 0" class="py-10 text-center text-xs text-zinc-400">
                  <div class="mb-2">暂无匹配成员</div>
                  <div v-if="fileSettingsDoc && fileInheritedFromKb[fileSettingsDoc.name]" class="text-zinc-400">当前继承自知识库「{{ fileParentKb?.name ?? '' }}」的权限</div>
                </div>
              </div>
              <div class="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50/60 px-6 py-3">
                <button type="button" class="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50" @click="closeFileSettings">取消</button>
                <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700" @click="showFileActionToast('文件权限设置已保存'); closeFileSettings()">保存设置</button>
              </div>
            </template>

            <!-- 审计记录 -->
            <template v-else-if="fileSettingsTab === 'audit'">
              <div class="flex items-center gap-2 border-b border-zinc-100 px-6 py-3">
                <input v-model="auditDateFrom" type="date" class="w-32 rounded-md border border-zinc-200 px-2 py-1 text-xs outline-none" title="起始" />
                <span class="text-xs text-zinc-400">~</span>
                <input v-model="auditDateTo" type="date" class="w-32 rounded-md border border-zinc-200 px-2 py-1 text-xs outline-none" title="截止" />
                <select v-model="auditFilterType" class="rounded-md border border-zinc-200 px-2 py-1 text-xs outline-none"><option value="">全部类型</option><option value="访问">访问</option><option value="下载">下载</option><option value="权限">权限变更</option></select>
                <input v-model="auditFilterUser" class="w-24 rounded-md border border-zinc-200 px-2 py-1 text-xs outline-none" placeholder="用户" />
                <button type="button" class="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50" @click="exportAuditLog">导出</button>
              </div>
              <div class="flex-1 overflow-auto p-6">
                <div class="space-y-2">
                  <div v-for="(log, i) in filteredAuditLogs" :key="i" class="flex items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2.5 text-xs">
                    <div class="h-2 w-2 rounded-full" :class="log.sensitive ? 'bg-red-400' : 'bg-zinc-300'"></div>
                    <span class="font-medium text-zinc-800">{{ log.user }}</span>
                    <span class="text-zinc-500">{{ log.action }}</span>
                    <span v-if="log.sensitive" class="rounded bg-rose-50 px-1 py-0.5 text-[10px] text-rose-500">敏感</span>
                    <span class="ml-auto shrink-0 text-zinc-400">{{ log.time }}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50/60 px-6 py-3">
                <button type="button" class="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50" @click="closeFileSettings">取消</button>
                <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700" @click="closeFileSettings">保存设置</button>
              </div>
            </template>

            <!-- 文档管理（文件级别：展示版本/变更历史） -->
            <template v-else-if="fileSettingsTab === 'documents'">
              <div class="flex flex-1 flex-col">
                <div class="flex-1 overflow-auto px-6 py-5">
                  <div class="mb-5 space-y-4">
                    <div class="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <span class="text-xs font-semibold text-zinc-700">文件信息</span>
                    </div>
                    <div class="grid grid-cols-[100px_1fr] gap-2 text-xs">
                      <span class="text-zinc-400">文件格式</span><span class="text-zinc-700">{{ fileSettingsDoc?.format ?? '—' }}</span>
                      <span class="text-zinc-400">索引状态</span><span class="text-zinc-700">{{ fileSettingsDoc?.status ?? '—' }}</span>
                      <span class="text-zinc-400">密级</span><span class="text-zinc-700">{{ fileSettingsDoc?.securityLevel ?? '—' }}</span>
                      <span class="text-zinc-400">上传者</span><span class="text-zinc-700">{{ fileSettingsDoc?.uploadedBy ?? '—' }}</span>
                      <span class="text-zinc-400">更新时间</span><span class="text-zinc-700">{{ fileSettingsDoc?.updatedAt ?? '—' }}</span>
                      <span class="text-zinc-400">标签</span><span class="flex flex-wrap gap-1"> <span v-for="tag in fileSettingsDoc?.tags" :key="tag" class="rounded px-1 py-0.5 text-[10px] font-medium" :class="getTagStyle(tag)">{{ tag }}</span> <span v-if="!fileSettingsDoc?.tags?.length" class="text-zinc-400">—</span></span>
                    </div>
                  </div>
                  <div class="space-y-3">
                    <div class="flex items-center justify-between border-b border-zinc-100 pb-2">
                      <span class="text-xs font-semibold text-zinc-700">版本历史</span>
                    </div>
                    <div class="space-y-2 text-xs">
                      <div class="flex items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2"><span class="font-medium text-zinc-800">v1</span><span class="text-zinc-400">当前版本</span><span class="ml-auto text-zinc-400">{{ fileSettingsDoc?.updatedAt ?? '—' }}</span></div>
                      <div class="text-center text-zinc-400 py-2">仅保留当前版本</div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50/60 px-6 py-3">
                <button type="button" class="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50" @click="closeFileSettings">取消</button>
                <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700" @click="closeFileSettings">保存设置</button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 文件添加成员弹窗 -->
    <Teleport to="body">
      <div v-if="fileSettingsAddMemberOpen" class="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/40 px-4 py-8" @click.self="fileSettingsAddMemberOpen = false">
        <div class="flex h-[560px] w-[720px] overflow-hidden rounded-[20px] bg-white shadow-2xl ring-1 ring-zinc-200">
          <div class="flex flex-1 flex-col">
            <div class="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
              <div class="text-sm font-semibold text-zinc-900">添加成员</div>
              <button type="button" class="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="关闭添加成员" @click="fileSettingsAddMemberOpen = false"><X class="h-4 w-4" /></button>
            </div>
            <div class="border-b border-zinc-100 p-3">
              <div class="relative">
                <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-300" />
                <input v-model="fileSettingsAddMemberSearch" class="h-9 w-full rounded-lg border border-zinc-200 pl-8 pr-3 text-xs outline-none focus:border-blue-300" placeholder="搜索成员姓名或部门" />
              </div>
            </div>
            <div class="grid min-h-0 flex-1 grid-cols-2">
              <div class="flex flex-col border-r border-zinc-100">
                <div class="border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-[11px] font-medium text-zinc-500">部门候选</div>
                <div class="flex-1 overflow-auto p-2">
                  <button v-for="dept in presetDepartments" :key="dept" type="button" class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-zinc-50" @click="fileSettingsAddMemberDept = dept">
                    <Folder class="h-3.5 w-3.5 text-zinc-400" />
                    <span class="truncate text-zinc-700">{{ dept }}</span>
                    <CheckSquare v-if="fileSettingsAddMemberDept === dept" class="ml-auto h-3.5 w-3.5 text-blue-500" />
                  </button>
                </div>
              </div>
              <div class="flex flex-col">
                <div class="border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-[11px] font-medium text-zinc-500">已选成员（{{ fileSettingsAddMemberSelected.length }}）</div>
                <div class="flex-1 overflow-auto p-2">
                  <button v-for="c in filteredFileCandidates" :key="c.name" type="button" class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-zinc-50" @click="toggleFileAddCandidate(c)">
                    <div class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[10px] font-medium text-blue-600">{{ c.name[0] }}</div>
                    <span class="truncate text-zinc-800">{{ c.name }}</span>
                    <CheckSquare v-if="fileSettingsAddMemberSelected.some(s => s.name === c.name)" class="ml-auto h-3.5 w-3.5 text-blue-500" />
                  </button>
                  <div v-if="filteredFileCandidates.length === 0" class="py-6 text-center text-[11px] text-zinc-400">无匹配成员</div>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50 px-4 py-3">
              <div class="flex items-center gap-1.5 text-xs">
                <label class="text-zinc-500">统一角色</label>
                <select v-model="fileSettingsAddMemberRole" class="rounded-md border border-zinc-200 px-2 py-1 text-xs"><option value="EDITOR">编辑者</option><option value="MANAGER">管理员</option><option value="VIEWER">查看者</option><option value="OWNER">所有者</option></select>
              </div>
              <div class="flex items-center gap-2">
                <button type="button" class="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50" @click="fileSettingsAddMemberOpen = false">取消</button>
                <button type="button" class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50" :disabled="fileSettingsAddMemberSelected.length === 0" @click="confirmAddFileMembers">确认添加 ({{ fileSettingsAddMemberSelected.length }})</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 回收站面板 -->
    <div v-if="activeKnowledgeTab === 'trash'" class="flex flex-1 flex-col overflow-hidden" style="margin-left: clamp(286px,21vw,400px); transition: margin .3s;">
      <div class="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
        <h2 class="text-base font-semibold text-zinc-900">回收站</h2>
        <div class="flex items-center gap-3">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-300" />
            <input v-model="recycleSearch" class="h-9 w-56 rounded-xl border border-zinc-200 pl-9 pr-3 text-sm outline-none focus:border-blue-300" placeholder="搜索回收站" />
          </div>
          <button type="button" class="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" aria-label="关闭回收站" @click="activeKnowledgeTab = 'assets'"><X class="h-5 w-5" /></button>
        </div>
      </div>
      <div class="flex-1 overflow-auto">
        <template v-if="filteredRecycleItems.length === 0">
          <div class="flex flex-col items-center justify-center py-20 text-zinc-400">
            <Trash2 class="h-10 w-10" />
            <p class="mt-3 text-sm">当前空间回收站为空</p>
          </div>
        </template>
        <template v-else>
          <div class="sticky top-0 z-[1] flex flex-wrap items-center gap-2 border-b border-zinc-100 bg-zinc-50/90 px-6 py-2 text-xs backdrop-blur">
            <div class="flex items-center gap-1">
              <Calendar class="h-3.5 w-3.5 text-zinc-400" />
              <input v-model="recycleDateFrom" type="date" class="h-7 rounded-md border border-zinc-200 px-1.5 text-xs outline-none focus:border-blue-300" />
              <span class="text-zinc-400">至</span>
              <input v-model="recycleDateTo" type="date" class="h-7 rounded-md border border-zinc-200 px-1.5 text-xs outline-none focus:border-blue-300" />
            </div>
            <button type="button" class="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-600 hover:bg-zinc-50" @click="recycleDateFrom=''; recycleDateTo=''">重置</button>
            <span class="ml-2 text-zinc-500">共 {{ filteredRecycleItems.length }} 项</span>
            <span v-if="recycleItems.some(r => recycleIsExpired(r))" class="ml-2 inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"><AlertTriangle class="h-3 w-3" />含 {{ recycleItems.filter(r => recycleIsExpired(r)).length }} 项即将过期</span>
          </div>
          <div class="divide-y divide-zinc-100">
            <div v-for="item in filteredRecycleItems" :key="item.id" class="flex items-center gap-4 px-6 py-3 text-sm hover:bg-zinc-50">
              <Folder v-if="item.type === 'folder'" class="h-5 w-5 text-blue-400" />
              <FileText v-else-if="item.type === 'file'" class="h-5 w-5 text-zinc-400" />
              <BookOpen v-else class="h-5 w-5 text-orange-400" />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate font-medium text-zinc-900">{{ item.name }}</span>
                  <span v-if="recycleIsExpired(item)" class="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">逾期</span>
                  <span v-else class="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">剩余 {{ recycleDaysLeft(item) }} 天</span>
                </div>
                <div class="text-xs text-zinc-400">{{ item.detail }}</div>
              </div>
              <span class="text-xs text-zinc-400">{{ item.deletedAt?.slice(0,10) }}</span>
              <button type="button" class="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 enabled:hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50" :disabled="recycleIsExpired(item)" @click="restoreRecycleItem(item)">{{ recycleIsExpired(item) ? '已过期' : '恢复' }}</button>
              <button type="button" class="rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100" @click="purgeRecycleItem(item)">彻底删除</button>
            </div>
          </div>
        </template>
      </div>
    </div>

  </div>
</template>
