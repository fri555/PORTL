<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BookOpen, Check, ChevronDown, ChevronRight, Folder } from 'lucide-vue-next'
import type { KnowledgeDestination } from '@/types/knowledge-source'

const props = withDefaults(defineProps<{
  modelValue: string
  destinations: KnowledgeDestination[]
  id?: string
  label?: string
  disabled?: boolean
  required?: boolean
  rootOnly?: boolean
}>(), { label: '上传至', disabled: false, required: true, rootOnly: false })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const open = ref(false)
const expanded = ref<string[]>([])
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const choices = computed(() => props.rootOnly ? props.destinations.filter(item => !item.parentId) : props.destinations)
const roots = computed(() => choices.value.filter(item => !item.parentId))
const selected = computed(() => choices.value.find(item => item.id === props.modelValue))
function children(parentId: string) { return choices.value.filter(item => item.parentId === parentId) }
const rows = computed(() => roots.value.flatMap(item => [
  { item, depth: 0, expandable: children(item.id).length > 0 },
  ...(expanded.value.includes(item.id) ? children(item.id).map(child => ({ item: child, depth: 1, expandable: false })) : []),
]))
watch(() => props.modelValue, () => {
  const parentId = selected.value?.parentId
  if (parentId && !expanded.value.includes(parentId)) expanded.value.push(parentId)
}, { immediate: true })
watch(() => props.destinations, () => {
  if (props.modelValue && !choices.value.some(item => item.id === props.modelValue)) emit('update:modelValue', '')
}, { deep: true })
function toggle(id: string) { expanded.value = expanded.value.includes(id) ? expanded.value.filter(item => item !== id) : [...expanded.value, id] }
function choose(id: string) { emit('update:modelValue', id); open.value = false; trigger.value?.focus() }
function outside(event: MouseEvent) { if (event.target instanceof Node && !root.value?.contains(event.target)) open.value = false }
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { open.value = false; trigger.value?.focus() }
  if (event.key === 'ArrowDown' && !open.value) { event.preventDefault(); open.value = true }
}
onMounted(() => document.addEventListener('click', outside))
onBeforeUnmount(() => document.removeEventListener('click', outside))
</script>

<template>
  <div ref="root" class="destination-select" @keydown="keydown">
    <button :id="id" ref="trigger" type="button" class="destination-trigger" :class="{ empty: !selected }" :aria-label="label" :aria-required="required" aria-haspopup="tree" :aria-expanded="open" :disabled="disabled" @click="open = !open">
      <span>{{ selected?.path || selected?.name || (rootOnly ? '请选择知识库' : '请选择知识库或文件夹') }}</span><ChevronDown :size="14"/>
    </button>
    <div v-if="open" class="destination-dropdown" role="tree" :aria-label="label + '位置'">
      <div v-for="row in rows" :key="row.item.id" class="destination-row" role="treeitem" :aria-level="row.depth + 1" :aria-selected="modelValue === row.item.id" :aria-expanded="row.expandable ? expanded.includes(row.item.id) : undefined" :style="{ paddingLeft: (8 + row.depth * 26) + 'px' }">
        <button v-if="row.expandable" type="button" class="destination-expand" :aria-label="(expanded.includes(row.item.id) ? '收起' : '展开') + row.item.name" @click="toggle(row.item.id)"><ChevronRight :size="13" :class="{ expanded: expanded.includes(row.item.id) }"/></button>
        <span v-else class="destination-spacer"/>
        <button type="button" class="destination-choice" :aria-label="'存放至' + (row.item.path || row.item.name)" @click="choose(row.item.id)">
          <BookOpen v-if="!row.item.parentId" :size="15" class="book-icon"/><Folder v-else :size="16" class="folder-icon"/>
          <span>{{row.item.name}}</span><Check v-if="modelValue === row.item.id" :size="15"/>
        </button>
      </div>
      <p v-if="!rows.length" class="destination-empty">暂无可写入位置</p>
    </div>
  </div>
</template>

<style scoped>
.destination-select{position:relative;min-width:0;width:100%;font-family:inherit}.destination-trigger{display:flex;width:100%;height:34px;align-items:center;justify-content:space-between;gap:10px;border:1px solid #d8dce2;border-radius:7px;background:#fff;padding:0 11px;color:#222;font:13px inherit;cursor:pointer}.destination-trigger.empty{color:#a5a9b0}.destination-trigger:disabled{background:#f7f7f8;cursor:not-allowed}.destination-trigger>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.destination-trigger>svg{flex:none;color:#a0a5ad}.destination-trigger[aria-expanded=true]{border-color:#60656d}.destination-dropdown{position:absolute;z-index:80;top:calc(100% + 5px);left:0;right:0;max-height:240px;overflow:auto;border:1px solid #e4e7eb;border-radius:10px;background:#fff;padding:6px 0;box-shadow:0 7px 22px rgba(0,0,0,.12)}.destination-row{display:flex;min-height:38px;align-items:center;padding-right:10px}.destination-row:hover,.destination-row[aria-selected=true]{background:#f6f7f8}.destination-expand,.destination-spacer{display:grid;width:20px;height:26px;flex:none;place-items:center;border:0;background:transparent;color:#a0a7b0;cursor:pointer}.destination-expand svg.expanded{transform:rotate(90deg)}.destination-choice{display:flex;min-width:0;min-height:38px;flex:1;align-items:center;gap:9px;border:0;background:transparent;padding:0 6px;color:#222;font:13px inherit;text-align:left;cursor:pointer}.destination-choice>span{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.book-icon{flex:none;color:#1677ff}.folder-icon{flex:none;color:#0fb3e6;fill:#9ae6ff}.destination-empty{padding:18px;text-align:center;color:#a0a5ad;font-size:12px}
</style>
