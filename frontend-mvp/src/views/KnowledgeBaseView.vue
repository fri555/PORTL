<script setup lang="ts">
/**
 * KnowledgeBaseView.vue — 知识中心主视图（编排器模式）
 *
 * 架构：composable 管理全部状态 + 内联关键模板 + 子组件处理独立功能
 * 相比旧版 3766 行单体组件，精简了约 80%（移除权限管理、审计日志、回收站等非MVP代码）
 */
import { computed, ref, type ComponentPublicInstance } from 'vue'
import {
  AlertTriangle, ArrowUp, BookOpen, CheckCircle2, CheckSquare, ChevronLeft, ChevronsRight,
  Copy, Database, Eye, File, FileSpreadsheet, FileText, Folder, LayoutGrid, List, MessageSquareText, MoreVertical,
  Pencil, Quote, RotateCw, Plus, Search, Square, Trash2, Upload, X, Settings,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import KbFileGridItem from '@/components/knowledge/KbFileGridItem.vue'
import SidebarTreeNode from '@/components/knowledge/SidebarTreeNode.vue'
import SearchDialog from '@/components/knowledge/SearchDialog.vue'
import TaskCenterPanel from '@/components/knowledge/TaskCenterPanel.vue'
import ThinkingChain from '@/components/workspace/ThinkingChain.vue'
import { useKnowledgeBase } from '@/composables/useKnowledgeBase'
import type { TreeNode, DocItem } from '@/types/knowledge'

const kb = useKnowledgeBase()
const figmaAssetBase = `${import.meta.env.BASE_URL}assets/figma`
const searchOpen = ref(false)
const kbRowMenuId = ref('')
const fileRowMenuId = ref('')

// ── QA 文本域引用 ──
const qaTextarea = ref<ComponentPublicInstance | null>(null)

function resizeQaTextarea() {
  const el = qaTextarea.value?.$el ?? qaTextarea.value
  if (!(el instanceof HTMLTextAreaElement)) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 192) + 'px'
}

// ── 面包屑 ──
const breadcrumbTrail = computed(() => {
  const trail: { label: string; onClick?: () => void }[] = [{ label: kb.activeSpace.value === 'public' ? '公共空间' : '个人空间', onClick: () => kb.deselectKb() }]
  if (kb.selectedKb.value) trail.push({ label: kb.selectedKb.value.name })
  else if (kb.activeNode.value) trail.push({ label: kb.activeNode.value.label })
  return trail
})

function getFileIcon(f: string) {
  if (f === 'XLSX' || f === 'XLS') return FileSpreadsheet
  if (f === 'DOCX' || f === 'MD' || f === 'PDF' || f === 'PPTX') return FileText
  return File
}
function getIconColor(f: string) {
  if (f === 'XLSX' || f === 'XLS') return 'text-emerald-500 bg-emerald-50'
  if (f === 'DOCX') return 'text-blue-500 bg-blue-50'
  if (f === 'PDF') return 'text-red-500 bg-red-50'
  if (f === 'MD') return 'text-violet-500 bg-violet-50'
  if (f === 'PPTX') return 'text-orange-500 bg-orange-50'
  return 'text-zinc-500 bg-zinc-50'
}

// ── 用户切换菜单 ──
</script>

<template>
  <div class="flex h-[calc(100vh-3.5rem)] bg-white text-zinc-950">
    <!-- 侧栏折叠时的展开按钮 -->
    <div v-if="!kb.sidebarVisible.value" class="fixed left-3 top-[4.75rem] z-40 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white/95 p-1 shadow-sm backdrop-blur">
      <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-zinc-100" aria-label="展开侧边栏" @click="kb.sidebarVisible.value = true">
        <ChevronsRight class="h-4 w-4" />
      </button>
    </div>

    <!-- 左侧边栏 -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col overflow-hidden border-r border-[#eaeaea] bg-white transition-transform duration-300 lg:top-14 lg:h-[calc(100vh-3.5rem)]"
      :class="kb.sidebarVisible.value ? 'translate-x-0' : '-translate-x-full'"
    >
      <div data-testid="knowledge-sidebar-subheader" class="px-3 pt-4">
        <div class="flex items-center justify-between">
          <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#111] hover:bg-[#f7f7f9]" aria-label="搜索知识库" @click="searchOpen = true">
            <Search class="h-4 w-4" />
          </button>
          <button type="button" class="mr-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#111] hover:bg-[#f7f7f9]" aria-label="折叠侧边栏" @click="kb.sidebarVisible.value = false">
            <ChevronLeft class="h-4 w-4" />
          </button>
        </div>
        <!-- 搜索框 -->
        <div class="relative mt-2 hidden">
          <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-300" />
          <input
            type="text"
            placeholder="搜索知识库、文件..."
            class="h-8 w-full rounded-lg border border-zinc-200 bg-[#f7f8fa] pl-8 pr-3 text-xs text-zinc-600 placeholder:text-zinc-300 focus:border-[#1456f0] focus:bg-white focus:outline-none cursor-pointer"
            readonly
            @click="searchOpen = true"
          />
        </div>
        <button type="button" class="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#111] text-sm font-medium text-white hover:bg-[#333]" aria-label="新建知识库" @click="kb.createMode.value = true; kb.createKbName.value = ''">
          <Plus class="h-4 w-4" />
          <span>新建知识库</span>
        </button>
        <!-- 空间切换：横向 pill -->
        <div class="mt-4 flex h-9 gap-1 rounded-lg bg-[#f7f7f9] p-[3px]">
          <button
            type="button"
            class="flex-1 rounded-md px-3 text-sm font-medium transition"
            :class="kb.activeSpace.value === 'public' ? 'bg-white text-[#111] shadow-[0_4px_24px_rgba(0,0,0,0.08)]' : 'text-[#777] hover:text-[#111]'"
            @click="kb.switchSpace('public')"
          >公共空间</button>
          <button
            type="button"
            class="flex-1 rounded-md px-3 text-sm font-medium transition"
            :class="kb.activeSpace.value === 'personal' ? 'bg-white text-[#111] shadow-[0_4px_24px_rgba(0,0,0,0.08)]' : 'text-[#777] hover:text-[#111]'"
            @click="kb.switchSpace('personal')"
          >个人空间</button>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="hidden border-b border-zinc-100 px-2 py-2">
        <Button v-if="kb.isAdmin.value || kb.activeSpace.value === 'personal'" variant="ghost" size="sm" class="w-full justify-start gap-2 text-sm font-medium" aria-label="新建知识库" @click="kb.createMode.value = true; kb.createKbName.value = ''">
          <BookOpen class="h-4 w-4 text-[#ff5530]" />
          <span>新建知识库</span>
        </Button>
      </div>

      <!-- 文件树 -->
      <div class="flex-1 overflow-y-auto p-2" data-testid="knowledge-tree-panel">
        <div class="space-y-0.5">
          <SidebarTreeNode
            v-for="node in kb.currentFileTree.value"
            :key="node.id"
            :node="node"
            :depth="0"
            :expanded-ids="kb.expandedTreeIds.value"
            :selected-kb-id="kb.selectedKbId.value"
            :user-role="kb.isAdmin.value ? 'admin' : 'user'"
            :active-space="kb.activeSpace.value"
            @toggle="kb.toggleTreeNode($event)"
            @select="kb.toggleTreeNode($event)"
            @preview="(n: TreeNode) => { if (n.kbId && n.docName) { kb.selectKb(n.kbId); const doc = (kb.allDocs[n.kbId] ?? []).find(d => d.name === n.docName); if (doc) kb.openPreview(doc) } }"
            @delete="kb.deleteTreeFolder($event)"
            @create-folder="(id: string) => { kb.createFolderParentId.value = id; kb.createFolderMode.value = true; kb.createFolderName.value = '' }"
            @rename="kb.beginRenameFolder($event)"
            @context-menu="(e: MouseEvent, id: string) => { kb.contextMenu.value = { type: 'tree', id, x: e.clientX, y: e.clientY } }"
          />
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main
      data-testid="knowledge-main-pane"
      class="flex min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-300"
      :style="{ marginLeft: kb.sidebarVisible.value ? '270px' : '0px' }"
    >
      <!-- 头部 -->
      <div data-testid="knowledge-main-header" class="flex min-h-[102px] items-start border-b border-[#eaeaea] bg-white px-8 pt-5">
        <div class="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
          <button v-if="!kb.sidebarVisible.value" type="button" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" aria-label="展开侧边栏" @click="kb.sidebarVisible.value = true">
            <ChevronsRight class="h-4 w-4" />
          </button>
          <template v-for="(crumb, idx) in breadcrumbTrail" :key="idx">
            <button v-if="crumb.onClick" type="button" class="px-0 text-base font-medium leading-6 text-[#111]" @click="crumb.onClick">{{ kb.selectedKb.value ? crumb.label : '全部知识库' }}</button>
            <span v-else class="truncate font-semibold text-zinc-950">{{ crumb.label }}</span>
            <span v-if="idx < breadcrumbTrail.length - 1" class="text-zinc-300">/</span>
          </template>
        </div>
        <div class="ml-auto flex items-center gap-3">
          <!-- 视图切换（仅文件视图） -->
          <div v-if="kb.selectedKb.value" class="inline-flex h-9 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <button class="px-2.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" :class="{ 'bg-zinc-100 text-zinc-600': kb.fileView.value === 'list' }" aria-label="列表视图" @click="kb.fileView.value = 'list'"><List class="h-4 w-4" /></button>
            <button class="px-2.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600" :class="{ 'bg-zinc-100 text-zinc-600': kb.fileView.value === 'grid' }" aria-label="宫格视图" @click="kb.fileView.value = 'grid'"><LayoutGrid class="h-4 w-4" /></button>
          </div>
          <template v-if="!kb.selectedKb.value">
            <button type="button" class="inline-flex h-8 items-center gap-2 rounded-lg bg-[#111] px-4 text-sm text-white hover:bg-[#333]" @click="kb.openUploadModal()"><Upload class="h-4 w-4" />上传文件</button>
            <button type="button" class="inline-flex h-8 items-center gap-2 rounded-lg border border-[#d3d3d3] bg-white px-4 text-sm text-[#111] hover:bg-[#f7f7f9]" @click="kb.openCreateFolderModal()"><Folder class="h-4 w-4" />新建文件夹</button>
            <button type="button" class="inline-flex h-8 items-center gap-2 rounded-lg border border-[#d3d3d3] bg-white px-4 text-sm text-[#111] hover:bg-[#f7f7f9]" @click="kb.openQaPanel()"><MessageSquareText class="h-4 w-4" />小智问答</button>
          </template>
        </div>
      </div>

      <!-- 主内容 -->
      <div class="flex-1 overflow-y-auto bg-white px-8 py-0">
        <!-- === 视图：知识库列表（纯表格） === -->
        <template v-if="!kb.selectedKb.value">
          <div class="space-y-4">
            <div class="overflow-hidden bg-white">
              <!-- Table header -->
              <div class="grid h-[54px] grid-cols-[minmax(240px,1fr)_100px_140px_140px_80px] items-center border-b border-[#eaeaea] bg-white px-1 text-sm font-medium text-[#666]">
                <span>名称</span><span>所有者</span><span>创建时间</span><span>最近访问</span><span class="text-right">操作</span>
              </div>
              <!-- Table rows -->
              <div
                v-for="k in kb.displayedKnowledgeBases.value"
                :key="k.id"
                data-testid="knowledge-kb-card"
                class="grid grid-cols-[minmax(240px,1fr)_100px_140px_140px_80px] items-center border-b border-[#f2f2f2] px-1 py-3.5 hover:bg-[#fafafa] cursor-pointer transition"
                @click="kb.selectKb(k.id)"
              >
                <div class="flex min-w-0 items-center gap-3">
                  <BookOpen class="h-5 w-5 shrink-0 text-[#ff5530]" />
                  <div class="min-w-0">
                    <div class="truncate text-sm font-semibold text-zinc-900">{{ k.name }}</div>
                    <div class="mt-0.5 text-[11px] text-zinc-400">({{ k.docs }} 文档)</div>
                  </div>
                </div>
                <span class="truncate text-xs text-zinc-500">{{ k.owner }}</span>
                <span class="truncate text-xs text-zinc-500">{{ k.recent }}</span>
                <span class="truncate text-xs text-zinc-500">{{ k.recent }}</span>
                <div class="flex justify-end">
                  <div class="relative">
                    <button
                      type="button"
                      class="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                      @click.stop="kbRowMenuId = kbRowMenuId === k.id ? '' : k.id"
                    >
                      <MoreVertical class="h-4 w-4" />
                    </button>
                    <div v-if="kbRowMenuId === k.id" class="fixed inset-0 z-40" @click="kbRowMenuId = ''" />
                    <div
                      v-if="kbRowMenuId === k.id"
                      class="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-sm shadow-xl"
                    >
                      <div class="px-3 py-1.5 text-[11px] font-semibold text-zinc-400 truncate">{{ k.name }}</div>
                      <button v-if="kb.isAdmin.value" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50" @click="kbRowMenuId = ''"><Folder class="h-3.5 w-3.5" />新建文件夹</button>
                      <button v-if="kb.isAdmin.value" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50" @click="kbRowMenuId = ''"><Pencil class="h-3.5 w-3.5" />重命名</button>
                      <button v-if="kb.isAdmin.value" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50" @click="kbRowMenuId = ''; kb.deleteKb(k)"><Trash2 class="h-3.5 w-3.5" />删除</button>
                      <button v-if="kb.isAdmin.value" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50" @click="kbRowMenuId = ''"><Settings class="h-3.5 w-3.5 text-[#1456f0]" />设置</button>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="!kb.displayedKnowledgeBases.value.length" class="flex h-[470px] flex-col items-center justify-center text-center">
                <img :src="`${figmaAssetBase}/knowledge-empty.png`" alt="" class="h-20 w-20 object-contain" />
                <p class="mt-1 text-sm font-medium leading-[22px] text-[#111]">暂无知识库</p>
                <p class="text-xs leading-5 text-[#999]">请点击新建知识库开始使用吧～</p>
                <button type="button" class="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-[#111] px-5 text-sm font-medium text-white hover:bg-[#333]" @click="kb.createMode.value = true; kb.createKbName.value = ''"><Plus class="h-4 w-4" />新建知识库</button>
              </div>
            </div>
            <!-- Footer count -->
            <div class="text-xs text-zinc-400">
              共 {{ kb.displayedKnowledgeBases.value.length }} 个知识库
            </div>
          </div>
        </template>

        <!-- === 视图：文件列表 === -->
        <template v-else>
          <div data-testid="knowledge-action-row" class="mb-3 flex flex-wrap items-center gap-2">
            <button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50" aria-label="新建文件夹" @click="kb.openCreateFolderModal()">
              <Folder class="h-4 w-4" /><span>新建文件夹</span>
            </button>
            <button class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50" @click="kb.openUploadModal()">
              <Upload class="h-4 w-4" /><span>上传文件</span>
            </button>
            <button class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50" @click="kb.openQaPanel()">
              <MessageSquareText class="h-4 w-4" /><span>知识库问答</span>
            </button>
          </div>

          <!-- 批量操作栏 -->
          <div v-if="kb.selectedFileIds.value.length > 0" class="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
            <span class="text-xs font-medium text-blue-700">已选 {{ kb.selectedFileIds.value.length }} 项</span>
            <div class="ml-auto flex items-center gap-1">
              <button class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50" @click="kb.deleteSelectedDocs()"><Trash2 class="h-3 w-3" />删除</button>
            </div>
          </div>

          <!-- 空态 -->
          <div v-if="!kb.hasKnowledgeItems.value" class="flex flex-col items-center justify-center py-24 text-center">
            <Database class="h-12 w-12 text-zinc-200" />
            <p class="mt-3 text-sm text-zinc-400">此知识库暂无文档</p>
            <button class="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-medium text-white hover:bg-orange-600" @click="kb.openUploadModal()"><Upload class="h-3.5 w-3.5" />上传第一个文档</button>
          </div>

          <!-- 文件列表表模式 -->
          <div v-if="kb.fileView.value === 'list' && kb.hasKnowledgeItems.value" class="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table class="w-full">
              <thead class="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th class="w-10 px-3 py-3"><button class="text-zinc-400 hover:text-zinc-600" @click="kb.selectAllFiles()"><CheckSquare v-if="kb.selectedFileIds.value.length === kb.filteredDocs.value.length && kb.filteredDocs.value.length > 0" class="h-4 w-4 text-blue-500" /><Square v-else class="h-4 w-4" /></button></th>
                  <th class="px-0 py-3 text-left text-xs font-medium text-zinc-500">名称</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-zinc-500">格式</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-zinc-500">状态</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-zinc-500">更新时间</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-zinc-500">操作</th>
                </tr>
              </thead>
              <tbody>
                <!-- Folder rows -->
                <tr
                  v-for="folder in (kb.selectedKbId.value ? kb.getKbTreeChildren(kb.selectedKbId.value).filter((n: TreeNode) => n.type === 'folder') : [])"
                  :key="folder.id"
                  data-testid="knowledge-folder-row"
                  class="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                  @click="kb.toggleTreeNode(folder)"
                >
                  <td class="px-3 py-3" />
                  <td class="py-3">
                    <div class="flex items-center gap-2 text-sm text-zinc-800">
                      <Folder class="h-4 w-4 text-zinc-600" />
                      <span class="truncate font-medium">{{ folder.label }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3"><span class="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500">文件夹</span></td>
                  <td class="px-4 py-3"><span class="text-[11px] text-zinc-400">{{ folder.children?.length ?? 0 }} 项</span></td>
                  <td class="px-4 py-3 text-xs text-zinc-400">刚刚</td>
                  <td class="px-4 py-3">
                    <div class="flex justify-end">
                      <div class="relative">
                        <button
                          type="button"
                          class="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                          @click.stop="fileRowMenuId = fileRowMenuId === folder.id ? '' : folder.id"
                        >
                          <MoreVertical class="h-4 w-4" />
                        </button>
                        <div v-if="fileRowMenuId === folder.id" class="fixed inset-0 z-40" @click="fileRowMenuId = ''" />
                        <div
                          v-if="fileRowMenuId === folder.id"
                          class="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-sm shadow-xl"
                        >
                          <button v-if="true" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50" @click="fileRowMenuId = ''; kb.beginRenameFolder(folder)"><Pencil class="h-3.5 w-3.5" />重命名</button>
                          <button v-if="true" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50" @click="fileRowMenuId = ''; kb.deleteTreeFolder(folder)"><Trash2 class="h-3.5 w-3.5" />删除</button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
                <!-- File rows -->
                <tr
                  v-for="doc in kb.filteredDocs.value"
                  :key="doc.name"
                  data-testid="knowledge-file-row"
                  class="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                  :class="{ 'bg-blue-50/50': kb.selectedFileIds.value.includes(doc.name) }"
                  @click="kb.openPreview(doc)"
                >
                  <td class="px-3 py-3"><button class="text-zinc-400 hover:text-blue-500" @click.stop="kb.toggleFileSelect(doc.name)"><CheckSquare v-if="kb.selectedFileIds.value.includes(doc.name)" class="h-4 w-4 text-blue-500" /><Square v-else class="h-4 w-4" /></button></td>
                  <td class="py-3">
                    <div class="flex items-center gap-2 text-sm text-zinc-800">
                      <component :is="getFileIcon(doc.format)" class="h-4 w-4" :class="getIconColor(doc.format)" />
                      <span class="truncate">{{ doc.name }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3"><span class="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500">{{ doc.format }}</span></td>
                  <td class="px-4 py-3"><span class="rounded-full px-2 py-0.5 text-[11px] font-medium" :class="doc.status === '已索引' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'">{{ doc.status }}</span></td>
                  <td class="px-4 py-3 text-xs text-zinc-400">{{ doc.updatedAt }}</td>
                  <td class="px-4 py-3">
                    <div class="flex justify-end">
                      <div class="relative">
                        <button
                          type="button"
                          class="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                          @click.stop="fileRowMenuId = fileRowMenuId === doc.name ? '' : doc.name"
                        >
                          <MoreVertical class="h-4 w-4" />
                        </button>
                        <div v-if="fileRowMenuId === doc.name" class="fixed inset-0 z-40" @click="fileRowMenuId = ''" />
                        <div
                          v-if="fileRowMenuId === doc.name"
                          class="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-sm shadow-xl"
                        >
                          <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50" @click="fileRowMenuId = ''; kb.openPreview(doc)"><Eye class="h-3.5 w-3.5 text-blue-500" />预览</button>
                          <button v-if="kb.selectedKb.value?.canEdit || kb.isAdmin.value" type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50" @click="fileRowMenuId = ''; kb.deleteDoc(doc)"><Trash2 class="h-3.5 w-3.5" />删除</button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 文件列表网格模式 -->
          <div v-if="kb.fileView.value === 'grid' && kb.hasKnowledgeItems.value" class="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <KbFileGridItem
              v-for="doc in kb.filteredDocs.value"
              :key="doc.name"
              :item="doc"
              type="file"
              :selected="kb.selectedFileIds.value.includes(doc.name)"
              :can-edit="kb.selectedKb.value?.canEdit || kb.isAdmin.value"
              :tags="doc.tags"
              :doc-format="doc.format"
              data-testid="knowledge-file-card"
              @click="kb.openPreview(doc)"
              @open="kb.openPreview(doc)"
              @toggle-select="kb.toggleFileSelect(doc.name)"
              @delete="kb.deleteDoc(doc)"
            />
          </div>
        </template>
      </div>
    </main>

    <!-- 右侧预览面板 -->
    <aside
      v-if="kb.previewTabs.value.length"
      class="fixed bottom-0 top-16 z-40 hidden flex-col border-l border-zinc-200 bg-white lg:flex"
      :style="{ right: kb.qaOpen.value ? 'clamp(360px,28vw,460px)' : '0px', width: 'clamp(390px,32vw,520px)' }"
    >
      <div class="flex h-14 items-center justify-between gap-3 border-b border-zinc-200 px-4">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-zinc-950">文件预览</div>
          <div class="truncate text-xs text-zinc-400">{{ kb.activePreviewDoc.value?.name ?? '已打开文件' }}</div>
        </div>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition"
            :class="kb.qaOpen.value ? 'bg-[#1456f0] text-white' : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50'"
            @click="kb.qaOpen.value ? kb.closeQaPanel() : kb.openQaPanel()"
          >
            <MessageSquareText class="h-3.5 w-3.5" />
            <span>小智问答</span>
          </button>
          <button type="button" class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" aria-label="关闭预览" @click="kb.closePreviewPanel()"><X class="h-4 w-4" /></button>
        </div>
      </div>
      <div v-if="kb.previewTabs.value.length > 1" class="flex min-h-11 gap-1 overflow-x-auto border-b border-zinc-100 bg-zinc-50 px-3 py-2">
        <button v-for="tab in kb.previewTabs.value" :key="tab.name" type="button" class="inline-flex h-8 max-w-[180px] shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium" :class="kb.activeRightTab.value === tab.name ? 'bg-white text-blue-700 ring-1 ring-zinc-200' : 'text-zinc-500 hover:bg-white'" @click="kb.activeRightTab.value = tab.name">
          <FileText class="h-3.5 w-3.5" />
          <span class="truncate">{{ tab.name }}</span>
          <X class="h-3.5 w-3.5 rounded hover:bg-zinc-100" @click.stop="kb.closeRightTab(tab.name)" />
        </button>
      </div>
      <div v-if="kb.activePreviewDoc.value" class="grid min-h-0 flex-1 grid-cols-[132px_1fr] overflow-hidden">
        <nav class="border-r border-zinc-100 bg-zinc-50 px-4 py-5 text-sm">
          <div class="mb-3 truncate font-semibold text-blue-600">{{ kb.activePreviewDoc.value.name }}</div>
          <div class="space-y-3 text-zinc-500">
            <div class="border-l-4 pl-3 transition-colors duration-500" :class="kb.highlightedSection.value === '方案摘要' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-zinc-400'">方案摘要</div>
            <div class="border-l-4 pl-3 transition-colors duration-500" :class="kb.highlightedSection.value === '预算分档' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-zinc-300'">预算分档</div>
            <div class="border-l-4 pl-3 transition-colors duration-500" :class="kb.highlightedSection.value === '执行建议' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-zinc-300'">执行建议</div>
          </div>
        </nav>
        <article class="overflow-y-auto px-7 py-7 text-zinc-900">
          <div class="mb-5 text-xs text-zinc-400">修改于 {{ kb.activePreviewDoc.value.updatedAt }} · {{ kb.activePreviewDoc.value.uploadedBy }}</div>
          <h1 class="text-2xl font-bold tracking-normal">B2B线下团购方案</h1>
          <section class="mt-8 space-y-4 text-base leading-8">
            <h2 class="border-l-4 pl-3 text-xl font-bold transition-colors duration-500" :class="kb.highlightedSection.value === '方案摘要' ? 'border-amber-500 bg-amber-50/50 text-amber-800' : 'border-zinc-900'">方案摘要</h2>
            <p>本文档用于沉淀运动鞋团购成功案例。</p>
            <h2 class="border-l-4 pl-3 text-xl font-bold transition-colors duration-500" :class="kb.highlightedSection.value === '预算分档' ? 'border-amber-500 bg-amber-50/50 text-amber-800' : 'border-zinc-900'">预算分档</h2>
            <p>保守档优先控制预算，均衡档兼顾品牌与数量。</p>
            <h2 class="border-l-4 pl-3 text-xl font-bold transition-colors duration-500" :class="kb.highlightedSection.value === '执行建议' ? 'border-amber-500 bg-amber-50/50 text-amber-800' : 'border-zinc-900'">执行建议</h2>
            <p>先用均衡档作为客户现场沟通初稿。</p>
          </section>
        </article>
      </div>
    </aside>

    <!-- 小智问答面板 -->
    <aside
      v-if="kb.qaOpen.value"
      class="fixed bottom-0 right-0 top-16 z-50 hidden flex-col border-l border-zinc-200 bg-white lg:flex"
      :style="{ width: 'clamp(360px,28vw,460px)' }"
    >
      <div class="flex h-14 items-center justify-between border-b border-transparent px-4">
        <div class="flex min-w-0 items-center gap-3">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-white">
            <MessageSquareText class="h-4 w-4" />
          </div>
          <div class="min-w-0">
            <div class="text-sm font-semibold text-zinc-950">小智</div>
            <div class="truncate text-xs text-zinc-400">
              <template v-if="kb.selectedKb.value">基于「{{ kb.selectedKb.value.name }}」</template>
              <template v-else>知识库问答助手</template>
            </div>
          </div>
        </div>
        <button type="button" class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" aria-label="关闭小智" @click="kb.closeQaPanel()"><X class="h-4 w-4" /></button>
      </div>

      <!-- 模式选择 - 仅2个模式（PRD 第1216行） -->
      <div class="grid grid-cols-2 gap-2 border-b border-transparent px-4 py-3">
        <button class="rounded-lg border p-2.5 text-left text-xs font-medium" :class="kb.qaMode.value === 'answer' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-zinc-200 text-zinc-700'" @click="kb.qaMode.value = 'answer'">智能问答<div class="mt-1 text-[11px] font-normal text-zinc-400">组织答案</div></button>
        <button class="rounded-lg border p-2.5 text-left text-xs font-medium" :class="kb.qaMode.value === 'search' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-zinc-200 text-zinc-700'" @click="kb.qaMode.value = 'search'">知识检索<div class="mt-1 text-[11px] font-normal text-zinc-400">定位原文</div></button>
      </div>

      <div class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
        <div v-if="kb.qaMessages.value.length === 0" class="space-y-4">
          <div v-if="!kb.selectedKb.value" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
            <p class="font-medium">💡 先选择一个知识库</p>
            <p class="mt-1">在左侧文件树中点击任意知识库，即可开始提问</p>
          </div>
          <div class="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-4">
            <div class="text-base font-semibold text-zinc-950">你好，我是小智</div>
            <div class="mt-2 text-sm leading-6 text-zinc-600">我可以基于当前知识库和已打开文件回答问题。</div>
          </div>
        </div>
        <!-- 思考链路 -->
        <ThinkingChain
          v-if="kb.qaThinking.value.length > 0"
          :steps="kb.qaThinking.value as any"
          :is-collapsed="!kb.qaThinkingOpen.value"
          @toggle="kb.toggleThinking()"
        />
        <div v-for="(msg, index) in kb.qaMessages.value" :key="msg.id || index" class="group/qa" :class="msg.role === 'user' ? 'ml-8' : 'mr-8'">
          <div v-if="kb.qaEditId.value === msg.id" class="flex items-start gap-2">
            <textarea v-model="kb.qaEditDraft.value" class="flex-1 resize-none rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none" rows="2" @keydown.enter.exact.prevent="kb.commitEditQaMessage(msg)" @keydown.esc.prevent="kb.qaEditId.value = null; kb.qaEditDraft.value = ''" />
            <button class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white" @click="kb.commitEditQaMessage(msg)">保存</button>
          </div>
          <div class="rounded-2xl px-3 py-2.5 leading-6" :class="msg.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'">
            <div>
              <template v-for="(seg, i) in kb.parseQaContent(msg.content)" :key="i">
                <span v-if="seg.type === 'text'">{{ seg.text }}</span>
                <sup v-else class="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700 hover:bg-blue-200" @click="kb.openCitationRef(seg.index!, msg.citations)">{{ seg.index }}</sup>
              </template>
            </div>
            <div v-if="msg.citations?.length" class="mt-3 space-y-1.5 border-t border-zinc-100 pt-2 text-[11px]">
              <div v-for="(cit, idx) in msg.citations" :key="cit" class="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 cursor-pointer hover:border-blue-200 hover:bg-blue-50/30 transition" @click="kb.openCitationRef(idx + 1, msg.citations)">
                <div class="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-zinc-50 text-zinc-400"><FileText class="h-3 w-3" /></div>
                <div class="min-w-0 flex-1"><span class="truncate font-medium text-zinc-700">{{ cit }}</span></div>
                <sup class="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-semibold text-blue-700">{{ idx + 1 }}</sup>
              </div>
            </div>
          </div>
          <div v-if="kb.qaEditId.value !== msg.id" class="mt-1 flex gap-1.5 opacity-0 transition group-hover/qa:opacity-100" :class="msg.role === 'user' ? 'justify-end' : ''">
            <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" aria-label="复制" @click="kb.copyQaMessage(msg)">
              <CheckCircle2 v-if="kb.qaCopiedId.value === msg.id" class="h-3.5 w-3.5 text-emerald-500" />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
            <template v-if="msg.role === 'user'">
              <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" aria-label="编辑" @click="kb.beginEditQaMessage(msg)"><Pencil class="h-3.5 w-3.5" /></button>
              <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" aria-label="重试" @click="kb.retryQaMessage(msg)"><RotateCw class="h-3.5 w-3.5" /></button>
            </template>
            <template v-else>
              <button type="button" class="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" aria-label="引用" @click="kb.qaQuestion.value = `引用上一条回答继续：${msg.content.slice(0, 60)}...`"><Quote class="h-3.5 w-3.5" /></button>
            </template>
          </div>
        </div>
      </div>

      <div class="border-t border-transparent p-3">
        <div class="flex items-start gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
          <textarea
            :ref="(el: any) => { qaTextarea = el }"
            v-model="kb.qaQuestion.value"
            class="max-h-[192px] min-h-[36px] flex-1 resize-none bg-transparent py-1 text-sm leading-6 outline-none placeholder:text-zinc-400"
            placeholder="问小智任何问题..."
            rows="1"
            @input="resizeQaTextarea"
            @keydown.enter.exact.prevent="kb.askKnowledgeBase()"
          />
          <button
            type="button"
            class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition"
            :class="kb.qaQuestion.value.trim() ? 'bg-zinc-950 text-white hover:bg-zinc-800' : 'cursor-not-allowed bg-zinc-100 text-zinc-300'"
            :disabled="!kb.qaQuestion.value.trim()"
            @click="kb.askKnowledgeBase()"
          >
            <ArrowUp class="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- 任务中心（气泡+侧栏） -->
    <TaskCenterPanel
      :tasks="kb.uploadTasks.value"
      @dismiss="kb.dismissUploadTask($event)"
      @retry-all="kb.uploadTasks.value = kb.uploadTasks.value.filter(t => t.status !== 'success' && t.status !== 'done'); kb.showToast('已重试所有失败任务')"
      @clear-completed="kb.uploadTasks.value = kb.uploadTasks.value.filter(t => t.status !== 'success' && t.status !== 'done')"
    />

    <!-- Toast -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-2 opacity-0"
    >
      <div
        v-if="kb.fileActionFeedback.value"
        data-testid="knowledge-toast"
        class="fixed left-1/2 top-20 z-[70] flex min-w-[280px] max-w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-medium text-blue-700 shadow-2xl shadow-blue-100/60"
      >
        <span class="min-w-0 flex-1 truncate">{{ kb.fileActionFeedback.value }}</span>
        <button type="button" class="rounded-md p-1 text-blue-500 hover:bg-blue-50 hover:text-blue-800" aria-label="关闭操作提示" @click="kb.fileActionFeedback.value = ''"><X class="h-3.5 w-3.5" /></button>
      </div>
    </Transition>

    <!-- ═══ 弹窗 ═══ -->

    <!-- 新建知识库 -->
    <Dialog v-model:open="kb.createMode.value">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>新建知识库</DialogTitle>
          <DialogDescription>选择所属空间后创建知识库</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <div class="grid gap-2">
            <label class="text-xs font-medium text-zinc-600">知识库名称</label>
            <Input v-model="kb.createKbName.value" placeholder="输入知识库名称" />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="kb.createMode.value = false">取消</Button>
          <Button @click="kb.createKnowledgeBase()">创建</Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 新建文件夹 -->
    <Dialog v-model:open="kb.createFolderMode.value">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>新建文件夹</DialogTitle>
          <DialogDescription>在知识库中创建新的文件夹</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <div class="grid gap-2">
            <label class="text-xs font-medium text-zinc-600">文件夹名称</label>
            <Input v-model="kb.createFolderName.value" placeholder="例如：投标资料" />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="kb.createFolderMode.value = false">取消</Button>
          <Button @click="kb.createFolder()">确认</Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 上传文件 -->
    <Dialog v-model:open="kb.uploadModalOpen.value">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>上传文件{{ kb.selectedKb.value ? ` - ${kb.selectedKb.value.name}` : '' }}</DialogTitle>
          <DialogDescription>{{ kb.selectedKb.value ? `上传到 ${kb.selectedKb.value.name}` : '请先选择知识库' }}</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <label class="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center transition hover:border-blue-300 hover:bg-blue-50/50">
            <Upload class="h-8 w-8 text-blue-500" />
            <span class="mt-3 text-sm font-medium text-zinc-800">点击选择文件</span>
            <span class="mt-1 text-xs text-zinc-400">支持 PDF、DOCX、XLSX 等格式，单个文件 100MB 内，单次最多 10 个</span>
            <input class="hidden" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg" @change="kb.handleUploadFiles($event)" />
          </label>
          <div v-if="kb.uploadFileNames.value.length" class="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-2">
            <div v-for="name in kb.uploadFileNames.value" :key="name" class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-zinc-600">
              <File class="h-3.5 w-3.5 text-zinc-400" />
              <span class="min-w-0 flex-1 truncate">{{ name }}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" @click="kb.uploadModalOpen.value = false">取消</Button>
          <Button aria-label="确认上传文件" :disabled="kb.uploadFileNames.value.length === 0" @click="kb.confirmUpload()">确认上传</Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 确认弹窗 -->
    <Dialog v-model:open="kb.confirmModal.value.show">
      <DialogContent class="max-w-sm">
        <div class="flex items-center gap-2 mb-2">
          <AlertTriangle v-if="kb.confirmModal.value.danger" class="h-5 w-5 text-red-500" />
          <DialogTitle>{{ kb.confirmModal.value.title }}</DialogTitle>
        </div>
        <p class="text-sm leading-relaxed text-zinc-600">{{ kb.confirmModal.value.message }}</p>
        <div class="flex justify-end gap-2 pt-4">
          <Button variant="outline" @click="kb.confirmModal.value.show = false">取消</Button>
          <Button :variant="kb.confirmModal.value.danger ? 'destructive' : 'default'" @click="kb.confirmModal.value.onConfirm(); kb.confirmModal.value.show = false">{{ kb.confirmModal.value.confirmText ?? '确认' }}</Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 搜索弹窗 -->
    <SearchDialog
      :open="searchOpen"
      :knowledge-bases="kb.knowledgeBases.filter(k => k.space === kb.activeSpace.value)"
      :all-docs="kb.allDocs"
      @update:open="(v: boolean) => searchOpen = v"
      @select-kb="(id: string) => kb.selectKb(id)"
      @select-doc="(doc: DocItem) => kb.openPreview(doc)"
    />

    <!-- 上下文菜单 -->
    <Teleport to="body">
      <div v-if="kb.contextMenu.value" class="fixed inset-0 z-[55]" @click="kb.contextMenu.value = null">
        <div class="absolute w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-sm shadow-2xl" :style="{ left: `${kb.contextMenu.value.x}px`, top: `${kb.contextMenu.value.y}px` }" @click.stop>
          <template v-if="kb.contextMenu.value.type === 'kb'">
            <div class="px-3 py-2 text-xs font-semibold text-zinc-400">{{ kb.contextMenu.value.id }}</div>
            <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="kb.selectKb(kb.contextMenu.value!.id); kb.contextMenu.value = null"><BookOpen class="h-4 w-4 text-orange-500" />打开</button>
            <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" @click="() => { const k = kb.knowledgeBases.find(item => item.id === kb.contextMenu.value!.id); if (k) kb.deleteKb(k); kb.contextMenu.value = null }"><Trash2 class="h-4 w-4" />删除</button>
          </template>
          <template v-else>
            <div class="px-3 py-2 text-xs font-semibold text-zinc-400">文件操作</div>
            <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50" @click="() => { const doc = kb.docs.value.find(d => d.name === kb.contextMenu.value?.id); if (doc) kb.openPreview(doc); kb.contextMenu.value = null }"><Eye class="h-4 w-4" />预览</button>
            <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" @click="() => { const doc = kb.docs.value.find(d => d.name === kb.contextMenu.value?.id); if (doc) kb.deleteDoc(doc); kb.contextMenu.value = null }"><Trash2 class="h-4 w-4" />删除</button>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>
