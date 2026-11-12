<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'

/** 用户文字消息按实际渲染超过 6 行时默认折叠；AI 回复与附件不走这个组件。 */
const props = defineProps<{ text: string; testId?: string }>()
const bubble = ref<HTMLDivElement | null>(null)
const expanded = ref(false)
const overflowing = ref(false)
let observer: ResizeObserver | null = null

function measure() {
  const el = bubble.value
  if (!el) return
  const lineHeight = Number.parseFloat(window.getComputedStyle(el).lineHeight) || 22
  const lines = el.scrollHeight / lineHeight
  overflowing.value = lines > 6.5
}

onMounted(() => {
  nextTick(measure)
  if (typeof ResizeObserver !== 'undefined' && bubble.value) {
    observer = new ResizeObserver(() => measure())
    observer.observe(bubble.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())
watch(() => props.text, () => nextTick(measure))
watch(expanded, () => nextTick(measure))
</script>

<template>
  <div class="user-bubble-wrap">
    <div ref="bubble" class="user-bubble" :class="{ 'user-bubble--clamped': !expanded }" :data-testid="testId">{{ text }}</div>
    <button v-if="overflowing" class="user-bubble-toggle" type="button" :aria-expanded="expanded" @click="expanded = !expanded">
      {{ expanded ? '收起' : '展开全文' }}
      <ChevronUp v-if="expanded" :size="12" />
      <ChevronDown v-else :size="12" />
    </button>
  </div>
</template>

<style scoped>
.user-bubble-wrap { display: flex; max-width: 100%; flex-direction: column; align-items: flex-end; }
.user-bubble {
  padding: 11px 16px;
  border-radius: 14px 4px 14px 14px;
  background: #f3f3f3;
  color: #111;
  font-size: 14px;
  line-height: 22px;
  white-space: pre-wrap;
  word-break: break-word;
}
.user-bubble--clamped { max-height: 132px; overflow: hidden; }
.user-bubble-toggle {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-top: 4px;
  padding: 2px 6px;
  border: 0;
  border-radius: 5px;
  color: #6b7684;
  background: transparent;
  font-size: 11px;
  cursor: pointer;
}
.user-bubble-toggle:hover { background: #f2f3f5; color: #2469c8; }
</style>
