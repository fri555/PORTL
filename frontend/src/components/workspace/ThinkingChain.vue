<script setup lang="ts">
import { computed } from 'vue'
import type { ThinkingStep } from '@/composables/useAIChat'
import {
  CheckCircle2,
  Loader2,
  XCircle,
  ChevronDown,
  ChevronRight,
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
const progressPercent = computed(() =>
  totalSteps.value > 0 ? Math.round((completedSteps.value / totalSteps.value) * 100) : 0,
)

const runningStep = computed(() => props.steps.find((s) => s.status === 'running'))
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-b from-blue-50/90 to-white/90 backdrop-blur-sm">
    <!-- Header -->
    <button
      type="button"
      class="flex w-full items-center justify-between px-4 py-2.5 hover:bg-blue-100/30 transition-colors"
      @click="emit('toggle')"
    >
      <div class="flex items-center gap-2">
        <span class="text-sm">🧠</span>
        <span class="text-xs font-semibold text-blue-800">
          思考中（{{ completedSteps }}/{{ totalSteps }}）
        </span>
        <span v-if="runningStep" class="text-xs text-blue-500 animate-pulse">
          · {{ runningStep.label }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <!-- Progress bar -->
        <div class="h-1.5 w-16 rounded-full bg-blue-100 overflow-hidden hidden sm:block">
          <div
            class="h-full rounded-full bg-blue-500 transition-all duration-500"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
        <component :is="isCollapsed ? ChevronRight : ChevronDown" class="h-4 w-4 text-blue-500" />
      </div>
    </button>

    <!-- Steps list -->
    <div v-if="!isCollapsed" class="border-t border-blue-100 px-4 py-3 space-y-2.5">
      <div
        v-for="step in steps"
        :key="step.id"
        class="flex items-start gap-2.5 text-xs transition-colors"
      >
        <!-- Status icon -->
        <div class="mt-0.5 shrink-0">
          <CheckCircle2
            v-if="step.status === 'completed'"
            class="h-3.5 w-3.5 text-emerald-500"
          />
          <Loader2
            v-else-if="step.status === 'running'"
            class="h-3.5 w-3.5 text-blue-500 animate-spin"
          />
          <XCircle
            v-else-if="step.status === 'error'"
            class="h-3.5 w-3.5 text-red-400"
          />
          <div v-else class="h-3.5 w-3.5 rounded-full border border-zinc-300" />
        </div>

        <!-- Content -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <span>{{ step.icon }}</span>
            <span
              class="font-medium"
              :class="{
                'text-emerald-700': step.status === 'completed',
                'text-blue-700': step.status === 'running',
                'text-red-600': step.status === 'error',
                'text-zinc-500': step.status === 'pending',
              }"
            >
              {{ step.label }}
            </span>
            <span
              v-if="step.elapsed"
              class="text-zinc-400 tabular-nums"
            >{{ (step.elapsed / 1000).toFixed(1) }}s</span>
          </div>
          <p
            class="mt-0.5 leading-relaxed text-zinc-500 whitespace-pre-line"
            :class="{ 'text-red-500': step.status === 'error' }"
          >
            {{ step.detail }}
          </p>
          <p v-if="step.errorMsg" class="mt-0.5 text-red-500">
            {{ step.errorMsg }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
