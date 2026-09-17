<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Folder,
  LockKeyhole,
  MoreHorizontal,
} from 'lucide-vue-next'
import type { SourceKnowledgeBase, SourceKnowledgeNode } from '@/types/knowledge-source'

type KnowledgeTarget = SourceKnowledgeBase | SourceKnowledgeNode
type KnowledgeAction = 'preview' | 'rename' | 'permission' | 'delete'

const props = withDefaults(
  defineProps<{
    items: SourceKnowledgeBase[]
    detail?: SourceKnowledgeBase | null
    nodes?: SourceKnowledgeNode[]
    lockedIds?: Set<string>
  }>(),
  { detail: null, nodes: () => [] },
)

const emit = defineEmits<{
  select: [item: SourceKnowledgeBase]
  'navigate-node': [node: SourceKnowledgeNode]
  action: [payload: { kind: KnowledgeAction; target: KnowledgeTarget }]
}>()

const openMenuId = ref<string | null>(null)
const menuPlacement = ref<'top' | 'bottom'>('bottom')
const menuStyle = ref<Record<string, string>>({})
const sortDirection = ref<'asc' | 'desc' | null>(null)
const bookIcon = `${import.meta.env.BASE_URL}assets/knowledge-source/book.svg`
const emptyIllustration = `${import.meta.env.BASE_URL}assets/figma/knowledge-empty.png`

const visibleItems = computed(() => {
  if (props.detail) return []
  if (!sortDirection.value) return props.items

  const direction = sortDirection.value === 'asc' ? 1 : -1
  return [...props.items].sort(
    (left, right) => left.createdAt.localeCompare(right.createdAt, 'zh-CN') * direction,
  )
})

function toggleSort() {
  sortDirection.value = sortDirection.value === 'desc' ? 'asc' : 'desc'
}

function toggleMenu(event: MouseEvent, item: KnowledgeTarget) {
  event.stopPropagation()
  if (openMenuId.value === item.id) {
    closeMenu()
    return
  }

  const trigger = event.currentTarget as HTMLElement
  const rect = trigger.getBoundingClientRect()
  const menuHeight = 'kind' in item && item.kind === 'file' ? 148 : 116
  const viewportPadding = 8
  const openAbove = rect.bottom + menuHeight + viewportPadding > window.innerHeight
  menuPlacement.value = openAbove ? 'top' : 'bottom'
  menuStyle.value = {
    position: 'fixed',
    top: `${openAbove ? Math.max(viewportPadding, rect.top - menuHeight - 4) : rect.bottom + 4}px`,
    left: `${Math.max(viewportPadding, Math.min(rect.right - 112, window.innerWidth - 120))}px`,
  }
  openMenuId.value = item.id
}

function chooseAction(
  event: MouseEvent,
  kind: KnowledgeAction,
  target: KnowledgeTarget,
) {
  event.stopPropagation()
  openMenuId.value = null
  emit('action', { kind, target })
}

function navigateNode(node: SourceKnowledgeNode) {
  closeMenu()
  emit('navigate-node', node)
}

function closeMenu() {
  openMenuId.value = null
}

onMounted(() => {
  document.addEventListener('click', closeMenu)
  window.addEventListener('resize', closeMenu)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', closeMenu)
  window.removeEventListener('resize', closeMenu)
})
</script>

<template>
  <div class="knowledge-table" :class="{ 'knowledge-table--detail': detail }">
    <div class="knowledge-table__header knowledge-table__grid" data-testid="knowledge-table-header">
      <span>名称</span>
      <span>所有者</span>
      <button
        v-if="!detail"
        type="button"
        class="knowledge-table__sort"
        :aria-label="`按创建时间${sortDirection === 'desc' ? '升序' : '降序'}排列`"
        @click="toggleSort"
      >
        创建时间
        <ChevronUp v-if="sortDirection === 'asc'" :size="13" :stroke-width="1.8" />
        <ChevronDown v-else :size="13" :stroke-width="1.8" />
      </button>
      <span v-else>上传时间</span>
      <span class="knowledge-table__action-heading">操作</span>
    </div>

    <div class="knowledge-table__body">
      <template v-if="!detail">
        <div
          v-for="item in visibleItems"
          :key="item.id"
          class="knowledge-table__row knowledge-table__grid"
          :class="{ 'is-menu-open': openMenuId === item.id }"
          data-testid="knowledge-kb-row"
          role="button"
          tabindex="0"
          @click="emit('select', item)"
          @keydown.enter="emit('select', item)"
          @keydown.space.prevent="emit('select', item)"
        >
          <span class="knowledge-table__name">
            <img class="knowledge-table__book" :src="bookIcon" alt="" />
            <span class="knowledge-table__ellipsis">{{ item.name }}</span>
            <LockKeyhole v-if="lockedIds?.has(item.id)" class="knowledge-table__lock" :size="14" aria-label="已单独设置权限" />
          </span>
          <span class="knowledge-table__metadata knowledge-table__ellipsis">{{ item.owner }}</span>
          <span class="knowledge-table__metadata knowledge-table__ellipsis">{{ item.createdAt }}</span>
          <span class="knowledge-table__menu-cell">
            <button
              type="button"
              class="knowledge-table__more"
              :aria-label="`${item.name}操作菜单`"
              :aria-expanded="openMenuId === item.id"
              aria-haspopup="menu"
              @click="toggleMenu($event, item)"
            >
              <MoreHorizontal :size="18" :stroke-width="1.8" />
            </button>
            <div v-if="openMenuId === item.id" class="knowledge-table__menu" role="menu" :data-placement="menuPlacement" :style="menuStyle" @click.stop>
              <button type="button" role="menuitem" @click="chooseAction($event, 'rename', item)">重命名</button>
              <button type="button" role="menuitem" @click="chooseAction($event, 'permission', item)">权限管理</button>
              <button type="button" role="menuitem" class="knowledge-table__menu-delete" @click="chooseAction($event, 'delete', item)">删除</button>
            </div>
          </span>
        </div>
      </template>

      <template v-else>
        <div
          v-for="node in nodes"
          :key="node.id"
          class="knowledge-table__row knowledge-table__grid"
          :class="{ 'is-menu-open': openMenuId === node.id }"
          data-testid="knowledge-node-row"
          role="button"
          tabindex="0"
          @click="navigateNode(node)"
          @keydown.enter="navigateNode(node)"
          @keydown.space.prevent="navigateNode(node)"
        >
          <span class="knowledge-table__name">
            <span
              class="knowledge-table__node-icon"
              :class="node.kind === 'folder' ? 'is-folder' : 'is-file'"
            >
              <Folder v-if="node.kind === 'folder'" :size="19" :stroke-width="1.7" />
              <FileText v-else :size="18" :stroke-width="1.7" />
            </span>
            <span class="knowledge-table__ellipsis">{{ node.name }}</span>
            <span v-if="node.kind === 'folder'" class="knowledge-table__child-count">
              {{ node.children?.length || 0 }} 项
            </span>
            <span v-else-if="node.format" class="knowledge-table__file-format">
              {{ node.format.toUpperCase() }}
            </span>
            <LockKeyhole
              v-if="lockedIds?.has(node.id)"
              class="knowledge-table__lock"
              :size="14"
              aria-label="已单独设置权限"
            />
          </span>
          <span class="knowledge-table__metadata knowledge-table__ellipsis">{{ node.owner }}</span>
          <span class="knowledge-table__metadata knowledge-table__ellipsis">{{ node.updatedAt }}</span>
          <span class="knowledge-table__menu-cell">
            <button
              type="button"
              class="knowledge-table__more"
              :aria-label="`${node.name}操作菜单`"
              :aria-expanded="openMenuId === node.id"
              aria-haspopup="menu"
              @click="toggleMenu($event, node)"
            >
              <MoreHorizontal :size="18" :stroke-width="1.8" />
            </button>
            <div v-if="openMenuId === node.id" class="knowledge-table__menu" role="menu" :data-placement="menuPlacement" :style="menuStyle" @click.stop>
              <button
                v-if="node.kind === 'file'"
                type="button"
                role="menuitem"
                class="knowledge-table__preview-action"
                @click="chooseAction($event, 'preview', node)"
              >
                <Eye :size="14" />预览
              </button>
              <button type="button" role="menuitem" @click="chooseAction($event, 'rename', node)">重命名</button>
              <button type="button" role="menuitem" @click="chooseAction($event, 'permission', node)">权限管理</button>
              <button type="button" role="menuitem" class="knowledge-table__menu-delete" @click="chooseAction($event, 'delete', node)">删除</button>
            </div>
          </span>
        </div>

        <div v-if="!nodes.length" class="knowledge-table__empty">
          <img :src="emptyIllustration" alt="" />
          <strong>暂无文件</strong>
          <p>点击右上角上传文件或新建文件夹</p>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.knowledge-table {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  margin-top: 8px;
  overflow: hidden;
  color: #111;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Microsoft YaHei', sans-serif;
}

.knowledge-table__grid {
  display: grid;
  grid-template-columns: minmax(0, 750fr) minmax(0, 222fr) minmax(0, 289fr) minmax(28px, 28fr);
  align-items: center;
}

.knowledge-table__header {
  box-sizing: border-box;
  height: 46px;
  flex: 0 0 46px;
  padding: 0 20px 8px;
  border-bottom: 1px solid #eaeaea;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
}

.knowledge-table__sort {
  display: inline-flex;
  width: max-content;
  max-width: 100%;
  align-items: center;
  gap: 2px;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.knowledge-table__action-heading {
  text-align: center;
}

.knowledge-table__body {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 0 4px;
}

.knowledge-table__row {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 57px;
  padding: 0 12px;
  border-bottom: 1px solid #eaeaea;
  outline: none;
  cursor: pointer;
}

.knowledge-table__row.is-menu-open {
  z-index: 60;
}

.knowledge-table__row::before {
  position: absolute;
  z-index: 0;
  inset: 4px 0;
  border-radius: 12px;
  background: #f7f7f9;
  content: '';
  opacity: 0;
  transition: opacity 140ms ease;
}

.knowledge-table__row:hover::before,
.knowledge-table__row:focus-visible::before {
  opacity: 1;
}

.knowledge-table__row > * {
  position: relative;
  z-index: 1;
  min-width: 0;
}

.knowledge-table__name {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  color: #111;
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
}

.knowledge-table__book {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  object-fit: contain;
}

.knowledge-table__node-icon {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  place-items: center;
  border-radius: 5px;
}

.knowledge-table__node-icon.is-folder {
  background: #fff5dc;
  color: #d89614;
}

.knowledge-table__node-icon.is-file {
  background: #eef4ff;
  color: #4b82d0;
}

.knowledge-table__child-count,
.knowledge-table__file-format {
  flex: 0 0 auto;
  border-radius: 4px;
  padding: 1px 5px;
  background: #f3f3f4;
  color: #8a8a8a;
  font-size: 10px;
  font-weight: 400;
  line-height: 16px;
}

.knowledge-table__file-format {
  background: #eef4ff;
  color: #577ba8;
}

.knowledge-table__lock {
  flex: 0 0 auto;
  color: #777;
}

.knowledge-table__ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.knowledge-table__metadata {
  padding-right: 10px;
  color: #666;
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
}

.knowledge-table__menu-cell {
  position: relative;
  display: flex;
  justify-content: center;
}

.knowledge-table__more {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  padding: 0;
  background: transparent;
  color: #999;
  cursor: pointer;
}

.knowledge-table__more:hover,
.knowledge-table__more[aria-expanded='true'] {
  background: #eaeaec;
  color: #333;
}

.knowledge-table__menu {
  position: absolute;
  z-index: 50;
  top: 25px;
  right: 0;
  width: 112px;
  box-sizing: border-box;
  border: 1px solid #e7e7e7;
  border-radius: 8px;
  padding: 4px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.knowledge-table__menu button {
  display: flex;
  width: 100%;
  height: 32px;
  align-items: center;
  gap: 7px;
  border: 0;
  border-radius: 6px;
  padding: 0 10px;
  background: transparent;
  color: #222;
  font-size: 13px;
  line-height: 20px;
  text-align: left;
  cursor: pointer;
}

.knowledge-table__menu button:hover {
  background: #f5f5f6;
}

.knowledge-table__menu .knowledge-table__menu-delete {
  color: #e5484d;
}

.knowledge-table--detail .knowledge-table__body {
  position: relative;
}

.knowledge-table__empty {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  flex-direction: column;
  transform: translate(-50%, -56%);
  color: #999;
  text-align: center;
}

.knowledge-table__empty img {
  width: 120px;
  height: 120px;
  object-fit: contain;
}

.knowledge-table__empty strong {
  margin-top: 8px;
  color: #333;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
}

.knowledge-table__empty p {
  margin: 4px 0 0;
  color: #999;
  font-size: 13px;
  line-height: 20px;
}
</style>
