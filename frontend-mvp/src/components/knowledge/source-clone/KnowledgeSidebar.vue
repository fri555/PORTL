<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  LockKeyhole,
  PanelLeftClose,
  Plus,
  Search,
} from 'lucide-vue-next'
import type {
  KnowledgeSpace,
  SourceKnowledgeBase,
  SourceKnowledgeNavigation,
  SourceKnowledgeNode,
} from '@/types/knowledge-source'

const props = defineProps<{
  open: boolean
  items: SourceKnowledgeBase[]
  selectedId?: string
  lockedIds?: Set<string>
}>()

const emit = defineEmits<{
  close: []
  create: []
  select: [id: string]
  navigate: [payload: SourceKnowledgeNavigation]
  'space-change': [space: KnowledgeSpace]
}>()

const activeSpace = ref<KnowledgeSpace>('public')
const expandedIds = ref(new Set<string>())
const bookIcon = `${import.meta.env.BASE_URL}assets/knowledge-source/book.svg`

interface SidebarTreeRow {
  id: string
  kbId: string
  name: string
  kind: 'kb' | 'folder' | 'file'
  level: number
  count?: number
  hasChildren: boolean
}

const visibleItems = computed(() => {
  return props.items.filter((item) => item.space === activeSpace.value)
})

function appendNodes(rows: SidebarTreeRow[], kbId: string, nodes: SourceKnowledgeNode[], level: number) {
  for (const node of nodes) {
    const hasChildren = node.kind === 'folder' && Boolean(node.children?.length)
    rows.push({ id: node.id, kbId, name: node.name, kind: node.kind, level, hasChildren })
    if (hasChildren && expandedIds.value.has(node.id)) {
      appendNodes(rows, kbId, node.children ?? [], level + 1)
    }
  }
}

const treeRows = computed<SidebarTreeRow[]>(() => {
  const rows: SidebarTreeRow[] = []
  for (const item of visibleItems.value) {
    const hasChildren = Boolean(item.nodes?.length)
    rows.push({
      id: item.id,
      kbId: item.id,
      name: item.name,
      kind: 'kb',
      level: 0,
      count: item.count,
      hasChildren,
    })
    if (hasChildren && expandedIds.value.has(item.id)) {
      appendNodes(rows, item.id, item.nodes ?? [], 1)
    }
  }
  return rows
})

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
  const payload: SourceKnowledgeNavigation = row.kind === 'kb'
    ? { kbId: row.kbId, kind: 'kb' }
    : { kbId: row.kbId, nodeId: row.id, kind: row.kind }
  emit('navigate', payload)
  if (row.kind === 'kb') emit('select', row.kbId)
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches) {
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
      <button class="icon-button" type="button" aria-label="搜索">
        <Search :size="18" :stroke-width="1.8" />
      </button>
      <button class="icon-button" type="button" aria-label="折叠侧栏" @click="emit('close')">
        <PanelLeftClose :size="18" :stroke-width="1.8" />
      </button>
    </div>

    <button class="knowledge-sidebar__create" type="button" aria-label="新建知识库" @click="emit('create')">
      <Plus :size="17" :stroke-width="2" />
      <span>新建知识库</span>
    </button>

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

    <div class="knowledge-sidebar__tree" role="tree">
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
          <LockKeyhole v-if="lockedIds?.has(row.id)" class="knowledge-sidebar__lock" :size="13" aria-label="已单独设置权限" />
          <span v-if="row.count !== undefined" class="knowledge-sidebar__count">{{ row.count }}</span>
        </button>
      </div>

      <div v-if="treeRows.length === 0" class="knowledge-sidebar__empty">
        {{ activeSpace === 'personal' ? '暂无个人知识库' : '暂无公共知识库' }}
      </div>
    </div>
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

.knowledge-sidebar__create {
  display: flex;
  height: 36px;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin: 0 12px;
  border: 0;
  border-radius: 8px;
  color: #fff;
  background: #111;
  font: 500 14px/22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.knowledge-sidebar__create:hover {
  background: #2b2b2b;
}

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

@media (max-width: 640px) {
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
