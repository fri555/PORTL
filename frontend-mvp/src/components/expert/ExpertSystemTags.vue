<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ tags: string[]; detail?: boolean }>()
const root = ref<HTMLElement | null>(null)
const measures = ref<HTMLElement | null>(null)
const visibleCount = ref(3)
const expanded = ref(false)
let observer: ResizeObserver | undefined
const visibleTags = computed(() => props.detail ? props.tags : props.tags.slice(0, visibleCount.value))
const hiddenTags = computed(() => props.detail ? [] : props.tags.slice(visibleCount.value))
const hiddenCount = computed(() => props.detail ? 0 : props.tags.length - visibleTags.value.length)
async function measure() {
  await nextTick()
  const width = root.value?.clientWidth ?? 0
  if (!width) { visibleCount.value = Math.min(3, props.tags.length); return }
  const children = Array.from(measures.value?.querySelectorAll<HTMLElement>('.measure-tag') ?? [])
  const widths = children.map(child => child.getBoundingClientRect().width)
  let count = Math.min(3, props.tags.length)
  const overflowWidth = measures.value?.querySelector<HTMLElement>('.measure-overflow')?.getBoundingClientRect().width || 32
  while (count > 0) {
    const needed = widths.slice(0, count).reduce((sum, item) => sum + item, 0) + Math.max(0, count - 1) * 5 + (count < props.tags.length ? overflowWidth + 5 : 0)
    if (needed <= width) break
    count--
  }
  visibleCount.value = count
}
function closeOutside(event: MouseEvent) { if (!root.value?.contains(event.target as Node)) expanded.value = false }
function closeKeyboard(event: KeyboardEvent) { if (event.key === 'Escape') expanded.value = false }
watch(() => props.tags, () => { expanded.value = false; measure() }, { deep: true })
onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && root.value) { observer = new ResizeObserver(measure); observer.observe(root.value) }
  window.addEventListener('resize', measure)
  document.addEventListener('click', closeOutside)
  document.addEventListener('keydown', closeKeyboard)
})
onBeforeUnmount(() => { observer?.disconnect(); window.removeEventListener('resize', measure); document.removeEventListener('click', closeOutside); document.removeEventListener('keydown', closeKeyboard) })
</script>
<template>
  <div ref="root" class="system-tags" :class="{ detail }" data-testid="expert-system-tags" aria-label="接入系统">
    <span v-for="tag in visibleTags" :key="tag" class="system-tag" :title="tag">{{ tag }}</span>
    <button v-if="hiddenCount > 0" class="system-overflow" :aria-label="'查看其余 ' + hiddenCount + ' 个接入系统'" :aria-expanded="expanded" @click.stop="expanded = !expanded" @keydown.enter.stop @keydown.space.stop>+{{ hiddenCount }}</button>
    <span v-if="!tags.length" class="system-empty">暂未配置</span>
    <div v-if="expanded" class="system-tag-popover" role="region" aria-label="其余接入系统" @click.stop>
      <span v-for="tag in hiddenTags" :key="tag">{{ tag }}</span>
    </div>
    <div ref="measures" class="tag-measures" aria-hidden="true"><span v-for="tag in tags" :key="tag" class="measure-tag">{{ tag }}</span><span class="measure-overflow">+{{ tags.length }}</span></div>
  </div>
</template>
<style scoped>
.system-tags { position:relative; display:flex; width:100%; min-height:26px; gap:5px; align-items:center; justify-content:center; margin:9px 0 13px; }
.system-tag,.system-overflow,.measure-tag,.measure-overflow { display:block; flex:0 0 auto; border:0; border-radius:5px; background:#f0f4f8; padding:3px 6px; color:#65778a; font:10px/17px system-ui,-apple-system,'PingFang SC','Microsoft YaHei',sans-serif; white-space:nowrap; }
.system-overflow { cursor:pointer; background:#eaf1fa; color:#2670bf; }
.system-overflow:focus-visible { outline:2px solid #1677ff; outline-offset:2px; }
.system-tag-popover { position:absolute; bottom:calc(100% + 8px); left:50%; transform:translateX(-50%); z-index:20; display:flex; flex-wrap:wrap; gap:6px; width:max-content; max-width:min(320px,calc(100vw - 48px)); max-height:220px; overflow:auto; border:1px solid #dfe5ed; border-radius:9px; padding:12px; background:#fff; box-shadow:0 6px 22px #2538521c; }
.system-tag-popover span { max-width:100%; overflow-wrap:anywhere; border-radius:5px; padding:4px 7px; background:#f0f4f8; color:#506477; font:12px/18px system-ui,sans-serif; }
.tag-measures { position:absolute; inset:0 auto auto 0; display:flex; visibility:hidden; pointer-events:none; width:max-content; }
.system-empty { font-size:12px; color:#929cab; }
.system-tags.detail { justify-content:flex-start; margin:0; }
.detail .system-tag,.detail .system-overflow,.detail .measure-tag,.detail .measure-overflow { font-size:12px; padding:4px 8px; line-height:18px; }
.detail .system-tag-popover { bottom:auto; top:calc(100% + 8px); left:0; transform:none; }
</style>
