<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'

const props = defineProps<{
  tags: string[]
}>()

const container = ref<HTMLElement | null>(null)
const visibleCount = ref(props.tags.length)

const visibleTags = computed(() => props.tags.slice(0, visibleCount.value))
const hiddenTags = computed(() => props.tags.slice(visibleCount.value))

function recalculate() {
  const root = container.value
  if (!root || root.clientWidth <= 0) return

  const tagWidths = Array.from(root.querySelectorAll<HTMLElement>('[data-measure-tag]'))
    .map((tag) => tag.offsetWidth)
  const moreWidth = root.querySelector<HTMLElement>('[data-measure-more]')?.offsetWidth ?? 30
  const gap = 4
  const totalWidth = tagWidths.reduce((total, width) => total + width, 0)
    + Math.max(0, tagWidths.length - 1) * gap

  if (totalWidth <= root.clientWidth) {
    visibleCount.value = props.tags.length
    return
  }

  for (let count = props.tags.length - 1; count >= 0; count -= 1) {
    const visibleWidth = tagWidths.slice(0, count).reduce((total, width) => total + width, 0)
      + Math.max(0, count - 1) * gap
    const requiredWidth = visibleWidth + (count > 0 ? gap : 0) + moreWidth
    if (requiredWidth <= root.clientWidth) {
      visibleCount.value = count
      return
    }
  }

  visibleCount.value = 0
}

useResizeObserver(container, recalculate)
onMounted(() => nextTick(recalculate))
watch(() => props.tags, () => {
  visibleCount.value = props.tags.length
  nextTick(recalculate)
}, { deep: true })
</script>

<template>
  <span
    ref="container"
    class="readonly-overflow-tags"
    data-testid="readonly-expert-tags"
    aria-label="专家标签"
  >
    <span
      v-for="tag in visibleTags"
      :key="tag"
      class="readonly-overflow-tags__tag"
      data-testid="expert-system-tag"
    >{{ tag }}</span>
    <span
      v-if="hiddenTags.length"
      class="readonly-overflow-tags__more"
      data-testid="expert-tags-overflow"
      :title="hiddenTags.join('、')"
      :aria-label="`还有 ${hiddenTags.length} 个标签：${hiddenTags.join('、')}`"
    >+{{ hiddenTags.length }}</span>

    <span class="readonly-overflow-tags__measure" aria-hidden="true">
      <span v-for="tag in tags" :key="tag" data-measure-tag>{{ tag }}</span>
      <span data-measure-more>+{{ tags.length }}</span>
    </span>
  </span>
</template>

<style scoped>
.readonly-overflow-tags {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
  overflow: hidden;
}

.readonly-overflow-tags__tag,
.readonly-overflow-tags__more,
.readonly-overflow-tags__measure > span {
  box-sizing: border-box;
  max-width: 100%;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 4px;
  padding: 1px 6px;
  background: #f3f6fa;
  color: #627084;
  font-size: 10px;
  font-style: normal;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.readonly-overflow-tags__more {
  background: #eef5ff;
  color: #1677ff;
  cursor: help;
}

.readonly-overflow-tags__measure {
  position: absolute;
  left: -99999px;
  display: flex;
  gap: 4px;
  visibility: hidden;
  white-space: nowrap;
}
</style>
