<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  BookOpen, ChevronDown, ChevronRight, Folder, FileText, MoreVertical,
  Search, Star, X,
} from 'lucide-vue-next'
import type { SpaceKey, TreeNode, KnowledgeBaseItem } from '@/types/knowledge'
import { knowledgeBases } from '@/mock/knowledge'

const props = defineProps<{
  activeSpace: SpaceKey
  tree: TreeNode[]
  selectedKbId: string | null
}>()

const emit = defineEmits<{
  'switchSpace': [space: SpaceKey]
  'selectKb': [id: string]
  'toggleCollapse': []
}>()

const expandedIds = ref<string[]>(['kb-tree-1', 'kb-tree-3'])
const showMenuForKb = ref<string | null>(null)

const currentKbs = computed(() => knowledgeBases[props.activeSpace])

function toggleExpand(id: string) {
  const i = expandedIds.value.indexOf(id)
  if (i >= 0) expandedIds.value.splice(i, 1)
  else expandedIds.value.push(id)
}

function isExpanded(id: string) {
  return expandedIds.value.includes(id)
}

function findKbTreeNode(nodes: TreeNode[], kbId: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.kbId === kbId && node.type === 'folder') return node
    const child = node.children ? findKbTreeNode(node.children, kbId) : undefined
    if (child) return child
  }
  return undefined
}

function getKbTree(kbId: string) {
  const root = findKbTreeNode(props.tree, kbId)
  return root?.children ?? []
}

function hasChildren(kbId: string) {
  return getKbTree(kbId).length > 0
}
</script>

<template>
  <aside class="flex w-64 shrink-0 flex-col border-r border-hairline bg-white">
    <div class="flex items-center justify-between border-b border-hairline px-3 py-3">
      <span class="text-xs font-semibold text-charcoal">知识中心</span>
      <button class="rounded-lg p-1 text-stone hover:bg-surface" @click="$emit('toggleCollapse')">
        <ChevronDown class="h-3.5 w-3.5 -rotate-90" />
      </button>
    </div>

    <!-- Space toggle -->
    <div class="flex gap-1 border-b border-hairline p-2">
      <button
        class="flex-1 rounded-lg py-1.5 text-xs font-medium transition"
        :class="activeSpace === 'public' ? 'bg-ink text-white' : 'text-stone hover:bg-surface'"
        @click="$emit('switchSpace', 'public')"
      >公共空间</button>
      <button
        class="flex-1 rounded-lg py-1.5 text-xs font-medium transition"
        :class="activeSpace === 'personal' ? 'bg-ink text-white' : 'text-stone hover:bg-surface'"
        @click="$emit('switchSpace', 'personal')"
      >个人空间</button>
    </div>

    <!-- KB list -->
    <div class="flex-1 overflow-y-auto p-2">
      <div v-for="kb in currentKbs" :key="kb.id">
        <div
          class="group flex items-center rounded-lg px-2 py-1.5 text-xs"
          :class="selectedKbId === kb.id ? 'bg-surface text-ink font-medium' : 'text-charcoal hover:bg-surface'"
        >
          <button
            v-if="hasChildren(kb.id)"
            class="mr-0.5 grid h-5 w-5 shrink-0 place-items-center rounded text-stone hover:bg-hairline"
            @click="toggleExpand(kb.id)"
          >
            <ChevronDown v-if="isExpanded(kb.id)" class="h-3 w-3" />
            <ChevronRight v-else class="h-3 w-3" />
          </button>
          <span v-else class="inline-block w-5 shrink-0" />
          <button
            class="flex min-w-0 flex-1 items-center gap-1.5 py-0.5"
            @click="$emit('selectKb', kb.id)"
          >
            <BookOpen class="h-3.5 w-3.5 shrink-0 text-brand-orange" />
            <span class="truncate">{{ kb.name }}</span>
          </button>

          <!-- Three-dot menu (hover visible) -->
          <div class="relative shrink-0">
            <button
              class="grid h-6 w-6 place-items-center rounded-md opacity-0 transition hover:bg-hairline group-hover:opacity-100"
              @click.stop="showMenuForKb = showMenuForKb === kb.id ? null : kb.id"
            >
              <MoreVertical class="h-3.5 w-3.5" />
            </button>
            <div
              v-if="showMenuForKb === kb.id"
              class="absolute right-0 top-7 z-30 w-36 rounded-xl border border-hairline bg-white p-1 shadow-elevated"
              @click.stop
            >
              <button class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-charcoal hover:bg-surface" @click="showMenuForKb = null">
                <Star class="h-3.5 w-3.5" /> 收藏
              </button>
              <button v-if="kb.canEdit" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-charcoal hover:bg-surface" @click="showMenuForKb = null">
                <X class="h-3.5 w-3.5" /> 删除（需验证）
              </button>
            </div>
          </div>
        </div>

        <!-- Tree children -->
        <div v-if="isExpanded(kb.id)" class="ml-5 border-l border-hairline pl-2">
          <div v-for="child in getKbTree(kb.id)" :key="child.id" class="flex items-center gap-1 py-0.5">
            <template v-if="child.type === 'folder'">
              <Folder class="h-3 w-3 shrink-0 text-stone" />
              <span class="truncate text-xs text-stone">{{ child.label }}</span>
            </template>
            <template v-else>
              <FileText class="h-3 w-3 shrink-0 text-muted" />
              <span class="truncate text-xs text-muted">{{ child.label }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
