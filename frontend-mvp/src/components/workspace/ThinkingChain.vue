<script setup lang="ts">
import { computed } from 'vue'
import type { ThinkingStep } from '@/composables/useAIChat'
import {
  CheckCircle2,
  Loader2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Circle,
  OctagonMinus,
  Database,
  Globe2,
  Wrench,
  FileText,
  Sparkles,
} from 'lucide-vue-next'

const props = defineProps<{
  steps: ThinkingStep[]
  isCollapsed: boolean
}>()

const emit = defineEmits<{
  'toggle': []
}>()

const totalSteps = computed(() => props.steps.length)
const completedSteps = computed(() => props.steps.filter((s) => s.status === 'completed').length)
const runningStep = computed(() => props.steps.find((s) => s.status === 'running'))
const totalElapsed = computed(() => {
  const elapsed = props.steps.reduce((sum, step) => sum + (step.elapsed ?? 0), 0)
  if (!elapsed && runningStep.value) return '工作中'
  return elapsed ? `工作了 ${(elapsed / 1000).toFixed(1)} 秒` : '准备中'
})

function statusLabel(status: ThinkingStep['status']) {
  if (status === 'running') return '执行中'
  if (status === 'completed') return '已完成'
  if (status === 'error') return '异常'
  return '等待'
}

function semanticIcon(step: ThinkingStep) {
  const text = `${step.label} ${step.detail}`
  if (/知识库|查阅|检索/.test(text)) return Database
  if (/搜索|网页|联网|资料/.test(text)) return Globe2
  if (/工具|MCP|生成|调用/.test(text)) return Wrench
  if (/文件|文档|产物|Excel|PPT|PDF/.test(text)) return FileText
  return Sparkles
}
</script>

<template>
  <div class="thought-chain-root">
    <button
      type="button"
      class="group mb-2 inline-flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
      @click="emit('toggle')"
    >
      <component :is="isCollapsed ? ChevronRight : ChevronDown" class="h-4 w-4 text-zinc-400 transition group-hover:text-zinc-700" />
      <span :class="{ 'thought-chain-flow': runningStep }">{{ runningStep ? '小马正在工作中' : '思考完成' }}</span>
      <span class="text-zinc-400">·</span>
      <span>{{ totalElapsed }}</span>
      <span class="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-400">{{ completedSteps }}/{{ totalSteps }}</span>
    </button>

    <div v-if="!isCollapsed" class="space-y-0.5">
      <div
        v-for="step in steps"
        :key="step.id"
        class="thought-chain-item group relative flex gap-3 rounded-md px-1.5 py-2 transition hover:bg-zinc-50"
      >
        <div class="thought-chain-icon relative z-10 mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white">
          <CheckCircle2
            v-if="step.status === 'completed'"
            class="h-3.5 w-3.5 text-emerald-500"
          />
          <Loader2
            v-else-if="step.status === 'running'"
            class="h-3.5 w-3.5 animate-spin text-blue-500"
          />
          <XCircle
            v-else-if="step.status === 'error'"
            class="h-3.5 w-3.5 text-red-400"
          />
          <OctagonMinus
            v-else-if="step.status === 'pending' && step.errorMsg"
            class="h-3.5 w-3.5 text-zinc-300"
          />
          <Circle v-else class="h-2.5 w-2.5 fill-zinc-300 text-zinc-300" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 items-center gap-2">
            <span
              class="min-w-0 truncate text-sm font-medium"
              :class="{
                'text-zinc-900': step.status === 'completed',
                'text-blue-700': step.status === 'running',
                'text-red-600': step.status === 'error',
                'text-zinc-500': step.status === 'pending',
              }"
            >
              {{ step.label }}
            </span>
            <span class="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">{{ statusLabel(step.status) }}</span>
            <span
              v-if="step.elapsed"
              class="shrink-0 text-[11px] tabular-nums text-zinc-400"
            >{{ (step.elapsed / 1000).toFixed(1) }}s</span>
          </div>
          <div class="mt-1 flex min-w-0 items-start gap-2">
            <component
              :is="semanticIcon(step)"
              class="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400"
              :class="{ 'text-blue-500': step.status === 'running', 'text-red-400': step.status === 'error' }"
            />
            <p
              class="min-w-0 whitespace-pre-line text-xs leading-5 text-zinc-500"
              :class="{ 'text-red-500': step.status === 'error', 'thought-chain-flow': step.status === 'running' }"
            >
              {{ step.detail }}
            </p>
          </div>
          <p v-if="step.errorMsg" class="mt-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-500">
            {{ step.errorMsg }}
          </p>
          <div v-if="step.status === 'completed'" class="mt-1 flex flex-wrap gap-1.5 text-[11px] text-zinc-400">
            <span class="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-600">
              {{ step.label }}完成
            </span>
            <span v-if="step.icon" class="inline-flex items-center rounded-md bg-zinc-100 px-1.5 py-0.5 text-zinc-500">{{ step.icon }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.thought-chain-root {
  --line-color: rgb(228 228 231);
}

.thought-chain-item::before {
  content: "";
  position: absolute;
  left: 13px;
  top: 22px;
  bottom: -7px;
  width: 1px;
  background: var(--line-color);
}

.thought-chain-item:last-child::before {
  display: none;
}

.thought-chain-flow {
  background: linear-gradient(90deg, #a1a1aa 0%, #52525b 35%, #d4d4d8 50%, #71717a 68%, #a1a1aa 100%);
  background-size: 220% 100%;
  color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
  animation: thought-chain-shimmer 1.9s linear infinite;
}

@keyframes thought-chain-shimmer {
  from {
    background-position: 120% 0;
  }

  to {
    background-position: -120% 0;
  }
}
</style>
