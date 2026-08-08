<script setup lang="ts">
/**
 * SidebarTreeNode.vue — 递归文件树节点组件
 *
 * 遵循 DESIGN-minimax.md 设计规范:
 * - sidebar-nav-item: 非激活态透明背景、charcoal(#222222)文字
 * - sidebar-nav-item-active: surface(#f7f8fa)背景、ink(#0a0a0a)文字、500字重
 * - 品牌色 coral(#ff5530) 用于知识库书图标
 * - 品牌蓝(#1456f0) 用于选中态高亮
 */
import { computed, ref } from 'vue'
import {
  BookOpen, Building2, ChevronDown, ChevronRight, Eye, FileText, Folder,
  Globe, Lock, MoreVertical, Settings, ShieldCheck, Trash2,
} from 'lucide-vue-next'
import type { TreeNode } from '@/types/knowledge'

interface Props {
  node: TreeNode
  depth: number
  expandedIds: string[]
  selectedKbId: string | null
  userRole?: string
  activeSpace?: 'public' | 'personal'
  getKbVisibility?: (kbId: string) => 'public' | 'dept' | 'personal' | 'custom' | null
  getKbDocCount?: (kbId: string) => number
}
const props = withDefaults(defineProps<Props>(), { depth: 0 })

const isHovered = ref(false)

interface Emits {
  (e: 'toggle', node: TreeNode): void
  (e: 'select', node: TreeNode): void
  (e: 'preview', node: TreeNode): void
  (e: 'settings', node: TreeNode): void
  (e: 'delete', node: TreeNode): void
  (e: 'create-folder', parentId: string): void
  (e: 'rename', node: TreeNode): void
  (e: 'context-menu', event: MouseEvent, nodeId: string): void
  (e: 'update:hovered', nodeId: string): void
}

const emit = defineEmits<Emits>()

const menuOpen = ref(false)
const menuPos = ref({ x: 0, y: 0 })

const isKB = computed(() => !!(props.node.type === 'folder' && props.node.kbId && props.node.isKnowledgeBase))
const isFile = computed(() => props.node.type === 'file')
const isFolder = computed(() => props.node.type === 'folder')
const hasChildren = computed(() => !!props.node.children?.length)
const isExpanded = computed(() => props.expandedIds.includes(props.node.id))
const isSelected = computed(() => props.selectedKbId === props.node.kbId)
const isBuiltIn = computed(() => isKB.value && props.node.isBuiltIn)
const indentPx = computed(() => props.depth * 16 + 4)

// 权限派生
const canEdit = computed(() => props.userRole === 'admin')
const canManage = computed(() => props.userRole === 'admin')
const canDelete = computed(() => props.userRole === 'admin' && !isBuiltIn.value)

const docCount = computed(() => {
  if (isKB.value && props.getKbDocCount && props.node.kbId) {
    return props.getKbDocCount(props.node.kbId)
  }
  if (isFolder.value && !isKB.value && hasChildren.value) {
    return countFiles(props.node.children ?? [])
  }
  return 0
})
function countFiles(nodes: TreeNode[]): number {
  return nodes.reduce((sum, n) => sum + (n.type === 'file' ? 1 : (n.children ? countFiles(n.children) : 0)), 0)
}

const visibilityIcon = computed(() => {
  if (!isKB.value || !props.node.kbId || !props.getKbVisibility) return null
  const vis = props.getKbVisibility(props.node.kbId)
  if (!vis) return null
  return {
    icon: vis === 'public' ? Globe : vis === 'dept' ? Building2 : vis === 'personal' ? Lock : ShieldCheck,
    cls: vis === 'public' ? 'text-zinc-400' : vis === 'dept' ? 'text-blue-400' : vis === 'personal' ? 'text-emerald-400' : 'text-amber-400',
    label: vis === 'public' ? '全员可见' : vis === 'dept' ? '部门可见' : vis === 'personal' ? '仅自己可见' : '指定部门',
  }
})

function onClick() {
  if (isFile.value) {
    emit('preview', props.node)
  } else {
    emit('select', props.node)
    if (hasChildren.value) emit('toggle', props.node)
  }
}

function onChevronClick(event: MouseEvent) {
  event.stopPropagation()
  emit('toggle', props.node)
}

function onMenuOpen(event: MouseEvent) {
  event.stopPropagation()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  menuPos.value = { x: rect.right, y: rect.top }
  menuOpen.value = !menuOpen.value
}

function onAction(action: string) {
  menuOpen.value = false
  if (action === 'settings') emit('settings', props.node)
  else if (action === 'delete') emit('delete', props.node)
  else if (action === 'rename') emit('rename', props.node)
  else if (action === 'create-folder') emit('create-folder', props.node.id)
  else if (action === 'preview') emit('preview', props.node)
  else if (action === 'select') emit('select', props.node)
}
</script>

<template>
  <div>
    <div
      class="group relative flex items-center rounded-md transition-colors"
      :class="[isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-[#f7f8fa]']"
      :style="{ paddingLeft: `${indentPx}px` }"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
      @contextmenu.prevent="emit('context-menu', $event, node.id)"
    >
      <button
        v-if="isFolder && hasChildren"
        class="grid h-7 w-7 shrink-0 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        @click="onChevronClick"
      >
        <ChevronDown v-if="isExpanded" class="h-3.5 w-3.5" />
        <ChevronRight v-else class="h-3.5 w-3.5" />
      </button>
      <span v-else class="inline-block w-7 shrink-0" />

      <button
        class="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-xs transition"
        :class="isSelected ? 'font-medium text-blue-700' : 'text-[#222222] hover:bg-zinc-50'"
        @click="onClick"
        @dblclick.prevent="canEdit && emit('rename', node)"
      >
        <BookOpen v-if="isKB" class="h-3.5 w-3.5 shrink-0" :class="isSelected ? 'text-[#1456f0]' : 'text-[#ff5530]'" />
        <Folder v-else-if="isFolder" class="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        <FileText v-else class="h-3.5 w-3.5 shrink-0 text-zinc-300" />

        <span class="truncate">{{ node.label }}</span>

        <span
          v-if="isBuiltIn"
          class="shrink-0 rounded bg-blue-50 px-1 py-0.5 text-[9px] font-medium text-[#1456f0] border border-blue-100"
          title="系统内置知识库，不可删除"
        >系统内置</span>

        <component
          :is="visibilityIcon?.icon"
          v-if="visibilityIcon"
          :class="['h-3 w-3 shrink-0', visibilityIcon.cls]"
          :title="visibilityIcon.label"
        />

        <span v-if="docCount > 0" class="shrink-0 text-[10px] text-zinc-400">({{ docCount }})</span>
      </button>

      <!-- hover 操作信息区：角色标签 + ⋮ 圆形菜单 -->
      <div
        v-if="isHovered"
        class="absolute right-1 top-1/2 z-10 hidden -translate-y-1/2 items-center gap-0.5 rounded-full bg-white pl-2 pr-0.5 shadow-sm group-hover:flex"
        :class="isSelected ? 'bg-blue-50' : ''"
        @click.stop
      >
        <!-- 角色标签 -->
        <span
          v-if="userRole"
          class="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium"
          :class="canEdit ? 'text-[#1456f0] bg-blue-50' : 'text-zinc-500 bg-zinc-50'"
        >{{ canEdit ? '可管理' : '可查看' }}</span>

        <!-- ⋮ 按钮（圆形）所有人可操作 -->
        <button
          class="inline-flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
          title="更多操作"
          @click="onMenuOpen"
        >
          <MoreVertical class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <div v-if="isFolder && isExpanded && hasChildren" class="border-l border-zinc-100">
      <SidebarTreeNode
        v-for="child in node.children!"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :expanded-ids="expandedIds"
        :selected-kb-id="selectedKbId"
        :user-role="userRole"
        :get-kb-visibility="getKbVisibility"
        :get-kb-doc-count="getKbDocCount"
        @toggle="emit('toggle', $event)"
        @select="emit('select', $event)"
        @preview="emit('preview', $event)"
        @settings="emit('settings', $event)"
        @delete="emit('delete', $event)"
        @create-folder="emit('create-folder', $event)"
        @rename="emit('rename', $event)"
        @context-menu="(e: MouseEvent, id: string) => emit('context-menu', e, id)"
        @update:hovered="emit('update:hovered', $event)"
      />
    </div>

    <!-- ⋮ 菜单 — 按角色控制菜单项 -->
    <Teleport to="body">
      <div v-if="menuOpen" class="fixed inset-0 z-[70]" @click="menuOpen = false">
        <div
          class="absolute w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 text-sm shadow-2xl"
          :style="{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }"
          @click.stop
        >
          <div class="px-3 py-2 text-xs font-semibold text-zinc-400">{{ node.label }}</div>
          <template v-if="isKB">
            <button v-if="canEdit" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50" @click="onAction('create-folder')"><Folder class="h-3.5 w-3.5" />新建文件夹</button>
            <button v-if="canEdit" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50" @click="onAction('rename')"><Pencil class="h-3.5 w-3.5" />重命名</button>
            <button v-if="canDelete && !isBuiltIn" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50" @click="onAction('delete')"><Trash2 class="h-3.5 w-3.5" />删除</button>
            <button v-if="canEdit && activeSpace === 'public'" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50" @click="onAction('settings')"><Settings class="h-3.5 w-3.5 text-[#1456f0]" />设置</button>
          </template>
          <template v-else-if="isFolder">
            <button v-if="canEdit" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50" @click="onAction('rename')"><Pencil class="h-3.5 w-3.5" />重命名</button>
            <button v-if="canDelete" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50" @click="onAction('delete')"><Trash2 class="h-3.5 w-3.5" />删除</button>
          </template>
          <template v-else>
            <button class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50" @click="onAction('preview')"><Eye class="h-3.5 w-3.5" />预览</button>
            <button v-if="canDelete" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50" @click="onAction('delete')"><Trash2 class="h-3.5 w-3.5" />删除</button>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>
