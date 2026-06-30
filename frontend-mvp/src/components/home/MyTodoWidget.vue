<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { Timer, Play, Pause, RotateCcw, Plus, CheckCircle2, Circle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import type { ComponentSize } from '@/types/home'

const props = defineProps<{
  size?: ComponentSize
}>()

const timerMinutes = ref(25)
const timerSeconds = ref(0)
const isRunning = ref(false)
const isBreak = ref(false)
let interval: ReturnType<typeof setInterval> | null = null
const sessions = ref(2)

const displayTime = computed(() =>
  `${String(timerMinutes.value).padStart(2, '0')}:${String(timerSeconds.value).padStart(2, '0')}`,
)
const isNarrow = computed(() => props.size === '1x2')
const isWide = computed(() => props.size === '2x1')

function toggleTimer() {
  if (isRunning.value) { clearInterval(interval!); isRunning.value = false }
  else {
    isRunning.value = true
    interval = setInterval(() => {
      if (timerSeconds.value === 0) {
        if (timerMinutes.value === 0) {
          clearInterval(interval!); isRunning.value = false
          if (isBreak.value) { sessions.value++; timerMinutes.value = 25; isBreak.value = false }
          else { timerMinutes.value = 5; isBreak.value = true }
          return
        }
        timerMinutes.value--; timerSeconds.value = 59
      } else { timerSeconds.value-- }
    }, 1000)
  }
}
function resetTimer() { clearInterval(interval!); isRunning.value = false; timerMinutes.value = 25; timerSeconds.value = 0; isBreak.value = false }
onUnmounted(() => clearInterval(interval!))

const tasks = ref([
  { id: '1', text: '完成竞品分析报告', done: false },
  { id: '2', text: '审核营销部AI需求', done: false },
  { id: '3', text: '回复客服部反馈', done: true },
])
const newTask = ref('')
const visibleTasks = computed(() => {
  if (isNarrow.value || isWide.value) return tasks.value.slice(0, 2)
  return tasks.value
})
function addTask() { if (newTask.value.trim()) { tasks.value.push({ id: Date.now().toString(), text: newTask.value.trim(), done: false }); newTask.value = '' } }
function toggleTask(id: string) { const t = tasks.value.find(x => x.id === id); if (t) t.done = !t.done }
</script>

<template>
  <div class="flex h-full flex-col rounded-2xl border border-zinc-200 bg-gradient-to-br from-rose-50/60 via-white to-orange-50/40 shadow-sm" :class="isNarrow ? 'p-3' : 'p-4'">
    <div class="flex items-center gap-2" :class="isNarrow ? 'mb-2' : 'mb-3'">
      <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500 text-white"><Timer class="h-4 w-4" /></span>
      <span class="text-sm font-semibold text-zinc-700">番茄专注</span>
      <span class="ml-auto text-[11px] text-muted-foreground">{{ sessions }}次</span>
    </div>
    <div class="flex items-center" :class="isWide ? 'mb-2 justify-between' : 'mb-3 flex-col'">
      <div :class="['font-mono font-bold tracking-wider tabular-nums', isNarrow ? 'text-2xl' : 'text-3xl', isBreak ? 'text-emerald-500' : 'text-rose-500']">{{ displayTime }}</div>
      <p v-if="!isWide" class="mt-0.5 text-[11px] text-muted-foreground">{{ isBreak ? '休息' : '专注' }}</p>
      <div class="flex items-center gap-1.5" :class="isWide ? '' : 'mt-2'">
        <Button size="icon-sm" :variant="isRunning ? 'default' : 'outline'" @click="toggleTimer">
          <Play v-if="!isRunning" class="h-3.5 w-3.5" /><Pause v-else class="h-3.5 w-3.5" />
        </Button>
        <Button size="icon-sm" variant="ghost" @click="resetTimer"><RotateCcw class="h-3.5 w-3.5" /></Button>
      </div>
    </div>
    <div class="flex-1 space-y-1 overflow-auto">
      <div v-for="t in visibleTasks" :key="t.id" class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-zinc-100/60" @click="toggleTask(t.id)">
        <CheckCircle2 v-if="t.done" class="h-4 w-4 text-emerald-500 shrink-0" />
        <Circle v-else class="h-4 w-4 text-zinc-300 shrink-0" />
        <span :class="['truncate text-[12px]', t.done ? 'line-through text-zinc-400' : 'text-zinc-700']">{{ t.text }}</span>
      </div>
    </div>
    <div v-if="!isNarrow && !isWide" class="mt-2 flex items-center gap-1.5">
      <input v-model="newTask" placeholder="添加任务..." class="flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[12px] focus:outline-none focus:border-primary/30" @keyup.enter="addTask" />
      <Button size="icon-sm" variant="ghost" @click="addTask"><Plus class="h-3.5 w-3.5" /></Button>
    </div>
  </div>
</template>
