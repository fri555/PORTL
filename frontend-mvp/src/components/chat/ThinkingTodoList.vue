<script setup lang="ts">
import { computed, ref } from 'vue'

export interface ThinkingStep {
  id: string
  title: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: string
  endTime?: string
  detail?: string
}

const props = withDefaults(defineProps<{
  steps: ThinkingStep[]
  collapsed?: boolean
}>(), {
  collapsed: true,
})

const isCollapsed = ref(props.collapsed)

function toggle() {
  isCollapsed.value = !isCollapsed.value
}

const completedCount = computed(() => props.steps.filter(s => s.status === 'completed').length)
const totalCount = computed(() => props.steps.length)
const progressPercent = computed(() => (totalCount.value ? (completedCount.value / totalCount.value) * 100 : 0))
const hasRunning = computed(() => props.steps.some(s => s.status === 'running'))
const isAllCompleted = computed(() => totalCount.value > 0 && completedCount.value === totalCount.value)

function formatDuration(start?: string, end?: string): string {
  if (!start) return ''
  const s = new Date(start).getTime()
  const e = end ? new Date(end).getTime() : Date.now()
  const diff = Math.max(0, e - s)
  if (diff < 1000) return `${diff}ms`
  if (diff < 60000) return `${(diff / 1000).toFixed(1)}s`
  return `${Math.floor(diff / 60000)}m ${Math.round((diff % 60000) / 1000)}s`
}

function statusLabel(step: ThinkingStep): string {
  switch (step.status) {
    case 'completed': return '完成'
    case 'running': return '执行中'
    case 'failed': return '失败'
    default: return '待执行'
  }
}

const progressText = computed(() => {
  if (isAllCompleted.value) return `全部完成 (${completedCount.value}/${totalCount.value})`
  if (hasRunning.value) return `执行中... (${completedCount.value}/${totalCount.value})`
  return `${completedCount.value}/${totalCount.value} 步骤完成`
})
</script>

<template>
  <div class="thinking-todo" :class="{ 'is-collapsed': isCollapsed }">
    <!-- Collapsed bar -->
    <div class="thinking-todo__bar" @click="toggle" role="button" :tabindex="0" @keydown.enter="toggle">
      <svg v-if="hasRunning" class="thinking-todo__spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      <span class="thinking-todo__label">进度 {{ completedCount }}/{{ totalCount }}</span>
      <svg class="thinking-todo__chevron" :class="{ open: !isCollapsed }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>

    <!-- Expanded detail list -->
    <Transition name="thinking-expand">
      <div v-if="!isCollapsed" class="thinking-todo__detail">
        <div
          v-for="step in steps"
          :key="step.id"
          class="thinking-todo__step"
          :class="'step-' + step.status"
        >
          <!-- completed: gray filled circle with white check -->
          <svg v-if="step.status === 'completed'" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="9" fill="#9ca3af" />
            <path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <!-- running: blue spinner ring -->
          <svg v-else-if="step.status === 'running'" class="thinking-todo__spin" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7.5" stroke="#3b82f6" stroke-width="1.8" stroke-dasharray="12 35" stroke-linecap="round" />
          </svg>
          <!-- failed: gray filled circle with white X -->
          <svg v-else-if="step.status === 'failed'" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="9" fill="#9ca3af" />
            <path d="M6 6L12 12M12 6L6 12" stroke="#fff" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <!-- pending: empty circle -->
          <svg v-else width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7.5" stroke="#c9cdd4" stroke-width="1.5" />
          </svg>
          <!-- title -->
          <span class="thinking-todo__title">{{ step.title }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.thinking-todo {
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  font-family: inherit;
  transition: border-color 0.2s;
}
.thinking-todo:hover {
  border-color: #d1d5db;
}

/* ---- Collapsed bar ---- */
.thinking-todo__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 12px;
  background: #f7f8fa;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}
.thinking-todo__bar:hover {
  background: #f0f1f3;
}
.thinking-todo__bar:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}

.thinking-todo__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ---- Chevron ---- */
.thinking-todo__chevron {
  flex-shrink: 0;
  color: #9ca3af;
  transition: transform 0.25s ease;
  margin-left: auto;
}
.thinking-todo__chevron.open {
  transform: rotate(180deg);
}

/* ---- Expanded detail ---- */
.thinking-todo__detail {
  background: #fafbfc;
  border-top: 1px solid #eef0f2;
  padding: 6px 0;
}

.thinking-todo__step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  font-size: 13px;
  transition: background 0.15s;
}
.thinking-todo__step + .thinking-todo__step {
  border-top: 1px solid #f0f1f3;
}

.thinking-todo__title {
  flex: 1;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.step-running .thinking-todo__title {
  color: #3b82f6;
}
.step-completed .thinking-todo__title {
  color: #6b7280;
}

/* ---- Spinner ---- */
@keyframes thinking-spin {
  to { transform: rotate(360deg); }
}
.thinking-todo__spin {
  animation: thinking-spin 1s linear infinite;
}

/* ---- Expand / collapse transition ---- */
.thinking-expand-enter-active,
.thinking-expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.thinking-expand-enter-from,
.thinking-expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.thinking-expand-enter-to,
.thinking-expand-leave-from {
  opacity: 1;
  max-height: 600px;
}
</style>
