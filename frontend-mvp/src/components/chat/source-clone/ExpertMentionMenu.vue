<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Agent } from '@/types/agent'

const props = defineProps<{ experts: Agent[]; favoriteIds?: Set<string>; activeIndex: number; id: string; keyword?: string; page?: number; pageCount?: number; total?: number; hasMore?: boolean }>()
const emit = defineEmits<{ select: [agent: Agent]; close: []; pageChange: [page: number]; loadMore: []; panelPress: [] }>()
const panel = ref<HTMLElement | null>(null)
const defaultAvatar = import.meta.env.BASE_URL + 'assets/agents-online/data-analysis.png'
const listHeight = ref(218)
const availableHeight = ref<number | null>(null)

function place() {
  const parent = panel.value?.parentElement
  if (!parent) return
  const bounds = parent.getBoundingClientRect()
  if (!bounds.height) return
  const above = Math.max(0, bounds.top - 80 - 8)
  const list = panel.value?.querySelector<HTMLElement>('.mention-list')
  const measuredChrome = (panel.value?.getBoundingClientRect().height ?? 0) - (list?.getBoundingClientRect().height ?? 0)
  const chromeHeight = measuredChrome > 0 ? measuredChrome : 30
  availableHeight.value = above
  listHeight.value = Math.min(218, Math.max(0, availableHeight.value - chromeHeight))
}

onMounted(() => { nextTick(place); window.addEventListener('resize', place); window.addEventListener('scroll', place, true) })
onBeforeUnmount(() => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) })
function scrolled(event: Event) {
  const list = event.currentTarget as HTMLElement
  if (props.hasMore && list.scrollTop > 0 && list.scrollTop + list.clientHeight >= list.scrollHeight - 16) emit('loadMore')
}
watch(() => props.experts.length, () => nextTick(place))
watch(() => props.activeIndex, () => nextTick(() => document.getElementById(`${props.id}-${props.activeIndex}`)?.scrollIntoView?.({ block: 'nearest' })))
</script>

<template>
  <div ref="panel" class="mention-panel" :style="{ maxHeight: availableHeight === null ? undefined : `${availableHeight}px` }" @mousedown.prevent="emit('panelPress')">
    <h3 class="mention-heading">专家</h3>
    <div :id="id" role="listbox" aria-label="专家候选" class="mention-list" data-testid="expert-mention-scroll" @scroll="scrolled" :style="{ maxHeight: `${listHeight}px` }">
      <button v-for="(expert, index) in experts" :id="`${id}-${index}`" :key="expert.id" type="button" role="option" :aria-selected="index === activeIndex" :class="{ highlighted: index === activeIndex }" @click="emit('select', expert)">
        <span class="mention-avatar" :aria-hidden="true"><img :src="expert.avatarUrl || defaultAvatar" alt="" /></span>
        <span class="mention-name">{{ expert.name }}</span>
      </button>
      <div v-if="hasMore" class="mention-load-sentinel" aria-hidden="true" />
      <p v-if="!experts.length" class="mention-empty">未找到匹配的专家</p>
    </div>

  </div>
</template>

<style scoped>
.mention-panel{display:flex;flex-direction:column;position:absolute;z-index:90;bottom:calc(100% + 8px);left:0;width:min(360px,100%);box-sizing:border-box;overflow:hidden;border:1px solid #dfe5eb;border-radius:14px;background:#fff;box-shadow:0 16px 42px rgba(26,39,58,.14);color:#263445;text-align:left}
.mention-heading{flex-shrink:0;margin:0;padding:10px 13px 4px;color:#929ba5;font-size:11px;line-height:16px;font-weight:400}
.mention-list{min-height:0;overflow:auto;padding:2px 7px 7px}
.mention-list button{display:flex;width:100%;height:42px;align-items:center;gap:10px;border:0;border-radius:9px;padding:5px 8px;background:#fff;cursor:pointer;text-align:left}
.mention-list button.highlighted,.mention-list button:hover{background:#eef7fb}
.mention-avatar{display:grid;width:27px;height:27px;flex:0 0 27px;place-items:center;border-radius:50%;background:#e8f1ff;color:#2875d4;font-size:12px;font-weight:600}
.mention-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.mention-name{display:flex;min-width:0;flex:1;align-items:center;gap:6px;overflow:hidden;color:#273244;font-size:13px;font-weight:500;white-space:nowrap;text-overflow:ellipsis}
.mention-name svg{flex:0 0 auto;color:#c58a27;fill:#fef3c7}
.mention-empty{margin:0;padding:18px 10px;color:#7a8493;font-size:12px}
@media(max-width:620px){.mention-panel{width:100%}}
.mention-load-sentinel{height:12px;flex-shrink:0}
</style>



