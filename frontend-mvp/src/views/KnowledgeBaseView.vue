<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  CheckSquare, ChevronLeft, ChevronsRight, Database, Download, File,
  FileSpreadsheet, FileText, FolderKanban, LayoutGrid, List, Lock, Move,
  Plus, Search, Square, Trash2, Upload, X,
} from 'lucide-vue-next'

type SpaceKey = 'public' | 'personal'
interface KnowledgeBaseItem { id: string; name: string; docs: number; owner: string; department: string; visibility: string; space: SpaceKey; canEdit: boolean }
interface DocItem { name: string; format: string; status: string; updatedAt: string; uploadedBy: string }

const sidebarVisible = ref(true)
const activeSpace = ref<SpaceKey>('public')
const selectedKbId = ref<string | null>(null)
const embeddingModel = ref('bge-large-zh-v1.5')
const selectedFileIds = ref<string[]>([])
const createMode = ref(false)
const createKbName = ref('')
const createKbSpace = ref<SpaceKey>('public')
const fileView = ref<'list' | 'grid'>('list')
const fileSearch = ref('')
const fileActionModalOpen = ref(false)
const fileActionType = ref<'move' | null>(null)
const targetSearch = ref('')
const targetKbId = ref('')
const kbSearch = ref('')
const uploadModalOpen = ref(false)
const uploadFileNames = ref<string[]>([])

const spaces = [
  { key: 'public' as const, label: '公共空间', desc: '全员可检索的集团知识' },
  { key: 'personal' as const, label: '个人空间', desc: '个人上传与私有资料' },
]

const embeddingModels = ['bge-large-zh-v1.5', 'text-embedding-3-small', 'text-embedding-3-large', 'm3e-base']

const knowledgeBases: Record<SpaceKey, KnowledgeBaseItem[]> = {
  public: [
    { id: 'kb-public-1', name: '集团制度知识库', docs: 128, owner: '集团运营', department: '行政部', visibility: '全员可见', space: 'public', canEdit: false },
    { id: 'kb-public-2', name: '商品基础资料库', docs: 86, owner: '商品中心', department: '商品部', visibility: '全员可见', space: 'public', canEdit: false },
    { id: 'kb-public-3', name: '方案中心案例库', docs: 42, owner: '方案中心', department: '方案中心', visibility: '方案中心可编辑', space: 'public', canEdit: true },
    { id: 'kb-public-4', name: '团购预算池', docs: 24, owner: '方案中心', department: '方案中心', visibility: '方案中心可编辑', space: 'public', canEdit: true },
  ],
  personal: [
    { id: 'kb-personal-1', name: '我的客户资料', docs: 9, owner: '当前用户', department: '个人', visibility: '仅自己可见', space: 'personal', canEdit: true },
    { id: 'kb-personal-2', name: '临时方案草稿', docs: 5, owner: '当前用户', department: '个人', visibility: '仅自己可见', space: 'personal', canEdit: true },
  ],
}

const allDocs: Record<string, DocItem[]> = {
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
}

const currentSpaceItems = computed(() => knowledgeBases[activeSpace.value])
const selectedKb = computed(() => currentSpaceItems.value.find(kb => kb.id === selectedKbId.value))
const docs = computed(() => selectedKbId.value ? (allDocs[selectedKbId.value] ?? []) : [])
const activeSpaceLabel = computed(() => spaces.find(space => space.key === activeSpace.value)?.label ?? '')
const mainTitle = computed(() => selectedKb.value?.name ?? activeSpaceLabel.value)
const filteredDocs = computed(() => {
  const q = fileSearch.value.trim().toLowerCase()
  return q ? docs.value.filter(d => d.name.toLowerCase().includes(q)) : docs.value
})
const fileCount = computed(() => filteredDocs.value.length)

const searchFilteredKbs = computed(() => {
  const q = kbSearch.value.trim().toLowerCase()
  return q ? currentSpaceItems.value.filter(kb => kb.name.toLowerCase().includes(q)) : currentSpaceItems.value
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
}
function selectKb(id: string) { selectedKbId.value = id; selectedFileIds.value = [] }
function toggleFileSelect(name: string) {
  const i = selectedFileIds.value.indexOf(name)
  i >= 0 ? selectedFileIds.value.splice(i, 1) : selectedFileIds.value.push(name)
}
function selectAllFiles() {
  const names = filteredDocs.value.map(d => d.name)
  selectedFileIds.value = selectedFileIds.value.length === names.length ? [] : names
}
function confirmFileAction() { fileActionModalOpen.value = false; selectedFileIds.value = []; fileActionType.value = null }
function cancelFileAction() { fileActionModalOpen.value = false; fileActionType.value = null }
function openCreateModal() {
  createKbSpace.value = activeSpace.value
  createMode.value = true
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
  }
  knowledgeBases[createKbSpace.value].push(newKb)
  allDocs[newKb.id] = []
  createKbName.value = ''; createMode.value = false
  switchSpace(createKbSpace.value); selectedKbId.value = newKb.id
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
function confirmUpload() { uploadModalOpen.value = false; uploadFileNames.value = [] }
function getFileIcon(f: string) { if (f === 'XLSX') return FileSpreadsheet; if (f === 'DOCX' || f === 'MD' || f === 'PDF') return FileText; return File }
function getIconColor(f: string) { if (f === 'XLSX') return 'text-emerald-500 bg-emerald-50'; if (f === 'DOCX') return 'text-blue-500 bg-blue-50'; if (f === 'PDF') return 'text-red-500 bg-red-50'; if (f === 'MD') return 'text-violet-500 bg-violet-50'; return 'text-zinc-500 bg-zinc-50' }
</script>

<template>
  <div class="flex h-[calc(100vh-4rem)] bg-zinc-50 text-zinc-950">
    <!-- Sidebar -->
    <Teleport to="#app-header-left-control">
      <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50" :aria-label="sidebarVisible ? '折叠侧边栏' : '展开侧边栏'" @click="sidebarVisible = !sidebarVisible">
        <ChevronLeft v-if="sidebarVisible" class="h-4 w-4" />
        <ChevronsRight v-else class="h-4 w-4" />
      </button>
    </Teleport>
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-[clamp(286px,21vw,400px)] flex-col overflow-hidden border-r border-zinc-200 bg-white transition-transform duration-300 lg:top-16 lg:h-[calc(100vh-4rem)]"
      :class="sidebarVisible ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex h-14 items-center justify-between gap-3 border-b border-zinc-100 px-4">
        <div class="flex items-center gap-2 text-sm font-semibold"><FolderKanban class="h-4 w-4 text-orange-500" />知识库</div>
      </div>
      <div class="space-y-3 border-b border-zinc-100 p-3">
        <button type="button" class="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-700" @click="openCreateModal"><Plus class="h-4 w-4" />新建知识库</button>
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
      <div class="flex-1 overflow-y-auto p-2">
        <button v-for="kb in searchFilteredKbs" :key="kb.id" class="w-full rounded-lg border border-transparent px-3 py-2.5 text-left transition hover:border-zinc-200 hover:bg-zinc-50" :class="selectedKbId === kb.id ? 'border-blue-200 bg-blue-50' : ''" @click="selectKb(kb.id)">
          <div class="flex items-center justify-between gap-2"><span class="truncate text-sm font-medium text-zinc-900">{{ kb.name }}</span><span class="rounded-full bg-white px-2 py-0.5 text-[10px] text-zinc-500">{{ kb.docs }} 文档</span></div>
          <div class="mt-1 flex items-center gap-1.5 text-[11px]" :class="kb.canEdit ? 'text-zinc-400' : 'text-zinc-500'"><Lock v-if="!kb.canEdit" class="h-3 w-3" />{{ kb.canEdit ? '可编辑' : '只读' }} · {{ kb.visibility }}</div>
        </button>
      </div>
    </aside>

    <!-- Main -->
    <main
      class="flex min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-300"
      :style="{ marginLeft: sidebarVisible ? 'clamp(286px,21vw,400px)' : '0px' }"
    >
      <div class="grid min-h-14 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-zinc-200 bg-white px-4">
        <div class="text-xs text-zinc-400">{{ selectedKb ? activeSpaceLabel : '空间总览' }}</div>
        <h1 class="truncate text-center text-base font-semibold text-zinc-950">{{ mainTitle }}</h1>
        <div class="flex items-center justify-end gap-2">
          <div class="relative">
            <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-300" />
            <input v-if="selectedKb" v-model="fileSearch" type="text" placeholder="搜索文件..." class="w-[clamp(180px,18vw,320px)] rounded-lg border border-zinc-200 py-2 pl-8 pr-3 text-xs text-zinc-600 placeholder:text-zinc-300 focus:border-blue-200 focus:outline-none" />
            <input v-else v-model="kbSearch" type="text" placeholder="搜索知识库..." class="w-[clamp(180px,18vw,320px)] rounded-lg border border-zinc-200 py-2 pl-8 pr-3 text-xs text-zinc-600 placeholder:text-zinc-300 focus:border-blue-200 focus:outline-none" />
          </div>
          <button class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50" @click="openUploadModal"><Upload class="h-3.5 w-3.5" />上传文件</button>
          <div class="inline-flex h-9 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <button class="px-2.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" :class="{ 'bg-zinc-100 text-zinc-600': fileView === 'list' }" aria-label="列表视图" @click="fileView = 'list'"><List class="h-4 w-4" /></button>
            <button class="px-2.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" :class="{ 'bg-zinc-100 text-zinc-600': fileView === 'grid' }" aria-label="宫格视图" @click="fileView = 'grid'"><LayoutGrid class="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 md:p-6">
        <div v-if="!selectedKb" class="space-y-6">
          <section>
            <div class="mb-3 flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold text-zinc-900">{{ activeSpaceLabel }}知识库</h2>
              <span class="text-xs text-zinc-400">{{ searchFilteredKbs.length }} 个知识库</span>
            </div>
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              <button v-for="kb in searchFilteredKbs" :key="kb.id" class="flex min-h-24 items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/40" @click="selectKb(kb.id)">
                <div class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Database class="h-6 w-6" /></div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <span class="truncate text-sm font-semibold text-zinc-950">{{ kb.name }}</span>
                    <Lock v-if="!kb.canEdit" class="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  </div>
                  <div class="mt-1 text-xs text-zinc-500">{{ kb.docs }} 文档 · {{ kb.canEdit ? '可编辑' : '只读' }}</div>
                  <div class="mt-1 truncate text-[11px] text-zinc-400">{{ kb.department }} · {{ kb.owner }}</div>
                </div>
              </button>
            </div>
          </section>
        </div>

        <!-- Action bar -->
        <div v-else-if="selectedFileIds.length > 0" class="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <span class="text-xs font-medium text-blue-700">已选 {{ selectedFileIds.length }} 项</span>
          <div class="ml-auto flex items-center gap-1">
            <button class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-blue-700 hover:bg-blue-100" @click="fileActionType = 'move'; targetKbId = ''; targetSearch = ''; fileActionModalOpen = true"><Move class="h-3 w-3" />移动</button>
            <button class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"><Download class="h-3 w-3" />下载</button>
            <button class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50" @click="selectedFileIds = []"><Trash2 class="h-3 w-3" />删除</button>
          </div>
        </div>

        <!-- File list -->
        <div v-if="selectedKb && docs.length === 0" class="flex flex-col items-center justify-center py-24 text-center">
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
                <th class="px-4 py-3 text-left text-xs font-medium text-zinc-500">格式</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-zinc-500">状态</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-zinc-500">更新时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="doc in filteredDocs" :key="doc.name" class="border-b border-zinc-100 last:border-0 hover:bg-zinc-50" :class="{ 'bg-blue-50/50': selectedFileIds.includes(doc.name) }">
                <td class="px-3 py-3"><button class="text-zinc-400 hover:text-blue-500" @click="toggleFileSelect(doc.name)"><CheckSquare v-if="selectedFileIds.includes(doc.name)" class="h-4 w-4 text-blue-500" /><Square v-else class="h-4 w-4" /></button></td>
                <td class="py-3"><div class="flex items-center gap-2 text-sm text-zinc-800"><component :is="getFileIcon(doc.format)" class="h-4 w-4" :class="getIconColor(doc.format)" />{{ doc.name }}</div></td>
                <td class="px-4 py-3"><span class="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500">{{ doc.format }}</span></td>
                <td class="px-4 py-3"><span class="rounded-full px-2 py-0.5 text-[11px] font-medium" :class="doc.status === '已索引' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'">{{ doc.status }}</span></td>
                <td class="px-4 py-3 text-xs text-zinc-400">{{ doc.updatedAt }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="selectedKb" class="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <div v-for="doc in filteredDocs" :key="doc.name" class="relative rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-orange-300" :class="{ 'ring-2 ring-blue-300': selectedFileIds.includes(doc.name) }">
            <button class="absolute left-3 top-3 z-10 rounded p-0.5 bg-white/80 backdrop-blur" @click="toggleFileSelect(doc.name)"><CheckSquare v-if="selectedFileIds.includes(doc.name)" class="h-4 w-4 text-blue-500" /><Square v-else class="h-4 w-4 text-zinc-300" /></button>
            <div class="mb-3 mt-3 flex h-14 w-14 items-center justify-center rounded-xl shadow-sm" :class="getIconColor(doc.format)"><component :is="getFileIcon(doc.format)" class="h-6 w-6" /></div>
            <strong class="block truncate text-sm font-semibold text-zinc-900">{{ doc.name }}</strong>
            <span class="mt-1 text-[11px] text-zinc-400">{{ doc.format }} · {{ doc.updatedAt }}</span>
          </div>
        </div>
      </div>
    </main>

    <!-- Create KB modal -->
    <Teleport to="body">
      <div v-if="createMode" class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4 py-8" @click.self="createMode = false">
        <div class="w-full max-w-md overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-zinc-200">
          <div class="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4">
            <div><div class="text-base font-semibold text-zinc-950">新建知识库</div><p class="mt-1 text-xs text-zinc-500">选择所属空间并设置名称</p></div>
            <button type="button" class="rounded-full p-2 text-zinc-500 hover:bg-zinc-100" @click="createMode = false"><X class="h-4 w-4" /></button>
          </div>
          <div class="space-y-4 px-6 py-5">
            <div><label class="text-xs font-medium text-zinc-600">知识库名称</label><input v-model="createKbName" type="text" placeholder="输入知识库名称" class="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-orange-300" /></div>
            <div><label class="text-xs font-medium text-zinc-600">所属空间</label>
              <select v-model="createKbSpace" class="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-orange-300" aria-label="选择所属空间">
                <option value="public">公共空间</option>
                <option value="personal">个人空间</option>
              </select>
              <p class="mt-1.5 text-[11px] leading-4 text-zinc-400">可选空间由角色权限决定：管理员/知识库管理员可创建公共空间知识库，普通用户默认仅可创建个人空间知识库。</p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 border-t border-zinc-200 px-6 py-4">
            <button type="button" class="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50" @click="createMode = false">取消</button>
            <button type="button" class="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600" @click="createKnowledgeBase">创建</button>
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
            <button type="button" class="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50" :disabled="uploadFileNames.length === 0" @click="confirmUpload">确认上传</button>
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
