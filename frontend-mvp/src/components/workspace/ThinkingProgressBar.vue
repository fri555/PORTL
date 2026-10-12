<script setup lang="ts">
import { computed } from 'vue'
import type { ThinkingStep } from '@/composables/useAIChat'
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-vue-next'

const props = defineProps<{ steps: ThinkingStep[] }>()

const completedCount = computed(() => props.steps.filter(step => step.status === 'completed').length)
const totalCount = computed(() => props.steps.length)
const percent = computed(() => totalCount.value ? Math.round((completedCount.value / totalCount.value) * 100) : 0)
const hasRunning = computed(() => props.steps.some(step => step.status === 'running'))
const hasError = computed(() => props.steps.some(step => step.status === 'error'))

function statusLabel(step: ThinkingStep) {
  if (step.status === 'completed') return '已完成'
  if (step.status === 'running') return '执行中'
  if (step.status === 'error') return '异常'
  return '待执行'
}
</script>

<template>
  <div data-testid="expert-todo-progress" class="expert-todo-progress" tabindex="0" aria-describedby="expert-todo-tooltip">
    <span class="expert-todo-progress__state" :class="{ running: hasRunning, error: hasError }">
      <Loader2 v-if="hasRunning" class="h-3.5 w-3.5 animate-spin" />
      <XCircle v-else-if="hasError" class="h-3.5 w-3.5" />
      <CheckCircle2 v-else class="h-3.5 w-3.5" />
    </span>
    <span class="shrink-0 text-[11px] font-medium text-zinc-600">进度 {{ completedCount }}/{{ totalCount }}</span>
    <div class="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-100">
      <div data-testid="expert-todo-progress-fill" class="h-full rounded-full transition-[width] duration-500" :class="hasError ? 'bg-red-400' : hasRunning ? 'bg-blue-500' : 'bg-emerald-500'" :style="{ width: percent + '%' }" />
    </div>
    <span class="shrink-0 text-[10px] tabular-nums text-zinc-400">{{ percent }}%</span>

    <div id="expert-todo-tooltip" role="tooltip" class="expert-todo-tooltip">
      <div class="mb-2 flex items-center justify-between gap-4">
        <span class="text-xs font-semibold text-zinc-800">专家待办</span>
        <span class="text-[10px] text-zinc-400">{{ completedCount }}/{{ totalCount }} 已完成</span>
      </div>
      <div class="grid gap-1.5">
        <div v-for="step in steps" :key="step.id" class="flex min-w-0 items-center gap-2">
          <CheckCircle2 v-if="step.status === 'completed'" class="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <Loader2 v-else-if="step.status === 'running'" class="h-3.5 w-3.5 shrink-0 animate-spin text-blue-500" />
          <XCircle v-else-if="step.status === 'error'" class="h-3.5 w-3.5 shrink-0 text-red-500" />
          <Circle v-else class="h-3.5 w-3.5 shrink-0 text-zinc-300" />
          <span class="min-w-0 flex-1 truncate text-[11px] text-zinc-600">{{ step.label }}</span>
          <span class="shrink-0 text-[10px]" :class="{ 'text-emerald-600': step.status === 'completed', 'text-blue-600': step.status === 'running', 'text-red-600': step.status === 'error', 'text-zinc-400': step.status === 'pending' }">{{ statusLabel(step) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.expert-todo-progress { position: relative; display: flex; min-height: 34px; width: 100%; align-items: center; gap: 8px; border: 1px solid #e4e4e7; border-radius: 10px; background: rgba(255, 255, 255, 0.97); padding: 6px 10px; box-shadow: 0 4px 16px rgb(15 23 42 / 5%); outline: none; }
.expert-todo-progress:focus-visible { border-color: #93c5fd; box-shadow: 0 0 0 3px rgb(219 234 254 / 55%); }
.expert-todo-progress__state { display: grid; height: 21px; width: 21px; flex: none; place-items: center; border-radius: 999px; background: #ecfdf5; color: #059669; }
.expert-todo-progress__state.running { background: #eff6ff; color: #2563eb; }
.expert-todo-progress__state.error { background: #fef2f2; color: #dc2626; }
.expert-todo-tooltip { position: absolute; left: 0; right: 0; bottom: calc(100% + 8px); z-index: 40; visibility: hidden; max-height: 220px; overflow-y: auto; border: 1px solid #e4e4e7; border-radius: 12px; background: #fff; padding: 11px 12px; opacity: 0; box-shadow: 0 14px 38px rgb(15 23 42 / 14%); transform: translateY(5px); transition: opacity 150ms ease, transform 150ms ease, visibility 150ms ease; pointer-events: none; }
.expert-todo-progress:hover .expert-todo-tooltip, .expert-todo-progress:focus-within .expert-todo-tooltip { visibility: visible; opacity: 1; transform: translateY(0); }
</style>
