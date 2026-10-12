<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { ThinkingStep } from '@/composables/useAIChat'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  FileText,
  Loader2,
  Wrench,
  XCircle,
} from 'lucide-vue-next'

const props = defineProps<{
  steps: ThinkingStep[]
  isCollapsed: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()

interface ToolGroup {
  key: string
  label: string
  calls: ThinkingStep[]
  hasRunning: boolean
  hasError: boolean
  elapsed: number
}

const expandedToolGroups = reactive(new Set<string>())
const planExpanded = reactive({ value: false })

const processSteps = computed(() =>
  props.steps.filter(step => step.module !== 'todo' && step.module !== 'reply'),
)
const summarySteps = computed(() =>
  processSteps.value.filter(step => step.module === 'status' && step.kind !== 'tool' && !step.toolName),
)
const planSteps = computed(() => processSteps.value.filter(step => step.module === 'plan'))
const toolSteps = computed(() =>
  processSteps.value.filter(step => step.kind === 'tool' || Boolean(step.toolName)),
)

const toolGroups = computed<ToolGroup[]>(() => {
  const groups = new Map<string, ToolGroup>()
  for (const step of toolSteps.value) {
    const key = step.toolName || step.id
    const existing = groups.get(key)
    if (existing) {
      existing.calls.push(step)
      existing.hasRunning ||= step.status === 'running'
      existing.hasError ||= step.status === 'error'
      existing.elapsed += step.elapsed ?? 0
      continue
    }
    groups.set(key, {
      key,
      label: step.toolLabel || step.label,
      calls: [step],
      hasRunning: step.status === 'running',
      hasError: step.status === 'error',
      elapsed: step.elapsed ?? 0,
    })
  }
  return [...groups.values()]
})

const hasRunning = computed(() => processSteps.value.some(step => step.status === 'running'))
const hasError = computed(() => processSteps.value.some(step => step.status === 'error'))
const completedCount = computed(() =>
  processSteps.value.filter(step => step.status === 'completed').length,
)
const totalElapsed = computed(() =>
  processSteps.value.reduce((total, step) => total + (step.elapsed ?? 0), 0),
)
const headline = computed(() => {
  if (hasRunning.value) return '处理中'
  if (hasError.value) return '需要处理'
  return '处理完成'
})
const elapsedLabel = computed(() => {
  if (hasRunning.value && totalElapsed.value === 0) return '正在执行'
  if (!totalElapsed.value) return '刚刚'
  return `${(totalElapsed.value / 1000).toFixed(1)} 秒`
})
const toolCountLabel = computed(() => {
  const count = toolSteps.value.length
  return count > 0 ? `调用 ${count} 个工具` : `${completedCount.value}/${processSteps.value.length} 个步骤`
})

function toggleTool(key: string) {
  if (expandedToolGroups.has(key)) expandedToolGroups.delete(key)
  else expandedToolGroups.add(key)
}

function groupExpanded(group: ToolGroup) {
  return group.hasRunning || group.hasError || expandedToolGroups.has(group.key)
}

function groupStatus(group: ToolGroup) {
  if (group.hasRunning) return '调用中'
  if (group.hasError) return '调用异常'
  return '调用完成'
}

function stepStatus(step: ThinkingStep) {
  if (step.status === 'running') return '执行中'
  if (step.status === 'error') return '异常'
  if (step.status === 'completed') return '已完成'
  return '等待'
}
</script>

<template>
  <section class="execution-process" aria-label="AI 执行过程">
    <button
      data-testid="thinking-summary"
      type="button"
      class="execution-summary"
      :aria-expanded="!isCollapsed"
      @click="emit('toggle')"
    >
      <span class="execution-summary__icon" :class="{ running: hasRunning, error: hasError }">
        <Loader2 v-if="hasRunning" class="h-3.5 w-3.5 animate-spin" />
        <AlertTriangle v-else-if="hasError" class="h-3.5 w-3.5" />
        <Check v-else class="h-3.5 w-3.5" />
      </span>
      <span class="font-medium text-zinc-700" :class="{ 'execution-shimmer': hasRunning }">{{ headline }}</span>
      <span class="text-zinc-300">·</span>
      <span class="text-zinc-500">{{ toolCountLabel }}</span>
      <span class="text-zinc-300">·</span>
      <span class="tabular-nums text-zinc-400">{{ elapsedLabel }}</span>
      <component :is="isCollapsed ? ChevronRight : ChevronDown" class="ml-0.5 h-3.5 w-3.5 text-zinc-400" />
    </button>

    <div
      v-if="!isCollapsed"
      data-testid="thinking-process-detail"
      class="execution-detail"
    >
      <div v-if="summarySteps.length" class="execution-timeline">
        <div v-for="step in summarySteps" :key="step.id" class="execution-step">
          <span class="execution-step__marker" :class="step.status">
            <Loader2 v-if="step.status === 'running'" class="h-3 w-3 animate-spin" />
            <XCircle v-else-if="step.status === 'error'" class="h-3 w-3" />
            <Check v-else-if="step.status === 'completed'" class="h-3 w-3" />
            <Circle v-else class="h-2.5 w-2.5" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex min-w-0 items-center gap-2">
              <span class="truncate text-xs font-medium text-zinc-700">{{ step.label }}</span>
              <span class="text-[10px] text-zinc-400">{{ stepStatus(step) }}</span>
            </div>
            <p class="mt-0.5 line-clamp-2 text-[11px] leading-4 text-zinc-500">{{ step.detail }}</p>
          </div>
        </div>
      </div>

      <section v-if="planSteps.length" class="plan-block">
        <button
          type="button"
          class="plan-block__summary"
          :aria-expanded="planExpanded.value"
          @click="planExpanded.value = !planExpanded.value"
        >
          <FileText class="h-3.5 w-3.5 text-violet-500" />
          <span class="font-medium text-zinc-700">专家计划</span>
          <span class="text-zinc-400">{{ planSteps.length }} 个步骤摘要</span>
          <component :is="planExpanded.value ? ChevronDown : ChevronRight" class="ml-auto h-3.5 w-3.5 text-zinc-400" />
        </button>
        <div v-if="planExpanded.value" class="plan-block__content">
          <div v-for="step in planSteps" :key="step.id" class="flex items-start gap-2 py-1.5 text-[11px] leading-4">
            <CheckCircle2 v-if="step.status === 'completed'" class="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
            <Loader2 v-else-if="step.status === 'running'" class="mt-0.5 h-3 w-3 shrink-0 animate-spin text-blue-500" />
            <Circle v-else class="mt-0.5 h-3 w-3 shrink-0 text-zinc-300" />
            <div>
              <div class="font-medium text-zinc-700">{{ step.label }}</div>
              <div class="mt-0.5 text-zinc-500">{{ step.detail }}</div>
            </div>
          </div>
        </div>
      </section>

      <div v-if="toolGroups.length" class="tool-list">
        <article
          v-for="group in toolGroups"
          :key="group.key"
          :data-testid="`tool-group-${group.key}`"
          class="tool-block"
          :class="{ running: group.hasRunning, error: group.hasError }"
        >
          <button
            type="button"
            class="tool-block__summary"
            :aria-expanded="groupExpanded(group)"
            @click="toggleTool(group.key)"
          >
            <span class="tool-block__icon">
              <Loader2 v-if="group.hasRunning" class="h-3.5 w-3.5 animate-spin" />
              <AlertTriangle v-else-if="group.hasError" class="h-3.5 w-3.5" />
              <Wrench v-else class="h-3.5 w-3.5" />
            </span>
            <span class="min-w-0 flex-1 truncate text-left text-xs font-medium text-zinc-700">{{ group.label }}</span>
            <span v-if="group.calls.length > 1" class="shrink-0 text-[10px] text-zinc-400">{{ group.calls.length }} 次调用</span>
            <span class="tool-block__status">{{ groupStatus(group) }}</span>
            <component :is="groupExpanded(group) ? ChevronDown : ChevronRight" class="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          </button>

          <div v-if="groupExpanded(group)" class="tool-block__results">
            <div v-for="call in group.calls" :key="call.id" class="tool-result">
              <div class="flex items-center gap-2 text-[11px]">
                <Loader2 v-if="call.status === 'running'" class="h-3 w-3 animate-spin text-blue-500" />
                <XCircle v-else-if="call.status === 'error'" class="h-3 w-3 text-red-500" />
                <CheckCircle2 v-else-if="call.status === 'completed'" class="h-3 w-3 text-emerald-500" />
                <Clock3 v-else class="h-3 w-3 text-zinc-300" />
                <span class="font-medium text-zinc-600">{{ call.label }}</span>
                <span v-if="call.elapsed" class="ml-auto tabular-nums text-[10px] text-zinc-400">{{ (call.elapsed / 1000).toFixed(1) }}s</span>
              </div>
              <p class="mt-1 pl-5 text-[11px] leading-4 text-zinc-500">{{ call.detail }}</p>
              <p v-if="call.errorMsg" class="mt-1.5 rounded-md bg-red-50 px-2 py-1.5 text-[11px] leading-4 text-red-600">{{ call.errorMsg }}</p>
            </div>
          </div>
        </article>
      </div>

      <div v-if="!summarySteps.length && !planSteps.length && !toolGroups.length" class="px-3 py-4 text-xs text-zinc-400">
        暂无执行过程
      </div>
    </div>
  </section>
</template>

<style scoped>
.execution-process { width: min(100%, 620px); color: #52525b; }
.execution-summary { display: inline-flex; min-height: 32px; max-width: 100%; align-items: center; gap: 7px; border-radius: 9px; padding: 5px 7px; font-size: 12px; line-height: 18px; transition: background 160ms ease, color 160ms ease; }
.execution-summary:hover { background: #f4f4f5; }
.execution-summary__icon { display: grid; height: 20px; width: 20px; flex: none; place-items: center; border-radius: 999px; background: #ecfdf5; color: #059669; }
.execution-summary__icon.running { background: #eff6ff; color: #2563eb; }
.execution-summary__icon.error { background: #fef2f2; color: #dc2626; }
.execution-detail { margin-top: 5px; max-height: 284px; overflow-y: auto; border-left: 1px solid #e4e4e7; padding: 4px 0 4px 12px; scrollbar-width: thin; }
.execution-timeline { display: grid; gap: 2px; margin-bottom: 5px; }
.execution-step { display: flex; gap: 9px; border-radius: 8px; padding: 7px 9px; }
.execution-step:hover { background: #fafafa; }
.execution-step__marker { display: grid; height: 18px; width: 18px; flex: none; place-items: center; border-radius: 999px; background: #f4f4f5; color: #a1a1aa; }
.execution-step__marker.completed { background: #ecfdf5; color: #059669; }
.execution-step__marker.running { background: #eff6ff; color: #2563eb; }
.execution-step__marker.error { background: #fef2f2; color: #dc2626; }
.plan-block { margin: 4px 0 8px; overflow: hidden; border: 1px solid #ececf0; border-radius: 10px; background: #fcfcfd; }
.plan-block__summary { display: flex; min-height: 36px; width: 100%; align-items: center; gap: 7px; padding: 7px 10px; font-size: 11px; }
.plan-block__summary:hover { background: #f8f7ff; }
.plan-block__content { max-height: 112px; overflow-y: auto; border-top: 1px solid #efeff3; padding: 6px 10px; }
.tool-list { display: grid; gap: 6px; }
.tool-block { overflow: hidden; border: 1px solid #e6e7eb; border-radius: 11px; background: #fff; transition: border-color 160ms ease, box-shadow 160ms ease; }
.tool-block.running { border-color: #bfdbfe; box-shadow: 0 0 0 3px rgb(219 234 254 / 35%); }
.tool-block.error { border-color: #fecaca; }
.tool-block__summary { display: flex; min-height: 42px; width: 100%; align-items: center; gap: 8px; padding: 8px 10px; }
.tool-block__summary:hover { background: #fafafa; }
.tool-block__icon { display: grid; height: 24px; width: 24px; flex: none; place-items: center; border-radius: 7px; background: #f4f4f5; color: #71717a; }
.tool-block.running .tool-block__icon { background: #eff6ff; color: #2563eb; }
.tool-block.error .tool-block__icon { background: #fef2f2; color: #dc2626; }
.tool-block__status { flex: none; border-radius: 999px; background: #f4f4f5; padding: 2px 7px; font-size: 10px; color: #71717a; }
.tool-block.running .tool-block__status { background: #eff6ff; color: #2563eb; }
.tool-block.error .tool-block__status { background: #fef2f2; color: #dc2626; }
.tool-block__results { max-height: 150px; overflow-y: auto; border-top: 1px solid #f0f1f3; background: #fafbfc; padding: 4px 10px 6px; }
.tool-result { padding: 7px 1px; }
.tool-result + .tool-result { border-top: 1px solid #eceef1; }
.execution-shimmer { background: linear-gradient(90deg, #71717a 0%, #2563eb 38%, #93c5fd 50%, #2563eb 62%, #71717a 100%); background-size: 220% 100%; color: transparent; background-clip: text; animation: execution-shimmer 1.7s linear infinite; }
@keyframes execution-shimmer { from { background-position: 120% 0; } to { background-position: -120% 0; } }
</style>

