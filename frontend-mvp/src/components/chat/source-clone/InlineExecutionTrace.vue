<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CheckCircle2, ChevronDown, Circle, FileText, LoaderCircle, SquareTerminal, Wrench } from 'lucide-vue-next'

type TraceStatus = 'waiting' | 'paused' | 'running' | 'awaiting_clarification' | 'awaiting_confirmation' | 'unknown' | 'failed' | 'cancelled' | 'superseded' | 'done' | string
type StepStatus = 'waiting' | 'running' | 'done' | 'failed' | 'cancelled'

interface TraceStep {
  title: string
  detail: string
  status: StepStatus
  duration: string
}

const props = defineProps<{
  status: TraceStatus
  headline: string
  steps: TraceStep[]
  attempt?: number
}>()

const complete = computed(() => props.status === 'done')
const failed = computed(() => props.status === 'failed' || props.status === 'unknown')
const running = computed(() => props.status === 'running')
const commandOpen = ref(!complete.value)

watch(() => props.status, status => {
  if (status === 'done') commandOpen.value = false
  else if (status === 'running' || status === 'failed' || status === 'unknown') commandOpen.value = true
})

const completedCount = computed(() => props.steps.filter(step => step.status === 'done').length)
const openingCopy = computed(() => {
  if (complete.value) return '收到，任务处理已经完成。执行过程已整理为可回看的工具记录，最终结果继续显示在下方。'
  if (failed.value) return `任务执行遇到问题，当前状态为“${props.headline}”。失败步骤和已完成记录已保留，便于继续处理。`
  if (running.value) return '收到，任务目标已经确认。我正在按顺序调用所需工具，处理完成的记录会持续保留在下方。'
  return `任务已进入处理流程，当前状态为“${props.headline}”。开始执行后，工具记录会在这里连续更新。`
})
const middleCopy = computed(() => {
  if (complete.value) return '工具步骤均已结束，执行记录已收起；需要核对时可重新展开查看。'
  if (failed.value) return '已完成的命令不会重复执行；修复当前问题后，将从中断步骤继续。'
  if (running.value) return '正在处理当前步骤。相同类型的命令集中在同一组内，避免多条工具消息打断阅读。'
  return '等待执行开始。开始后会以轻量状态行展示工具活动和结果。'
})
const closingCopy = computed(() => {
  if (complete.value) return '核心处理已经完成，结果已整理并展示在执行过程之后。'
  if (failed.value) return '当前结果尚未完成，请先处理异常步骤；系统不会把未完成任务标记为成功。'
  if (running.value) return `已完成 ${completedCount.value}/${props.steps.length} 个步骤，剩余步骤完成后会继续生成最终回复。`
  return `当前共 ${props.steps.length} 个执行步骤，等待开始。`
})

function rowLabel(status: StepStatus) {
  if (status === 'done') return '已运行命令'
  if (status === 'running') return '正在运行命令'
  if (status === 'failed') return '命令运行失败'
  if (status === 'cancelled') return '命令已取消'
  return '等待运行命令'
}
</script>

<template>
  <section class="execution-trace" data-testid="inline-execution-trace" aria-label="AI 执行过程">
    <p class="execution-trace__narrative">{{ openingCopy }}</p>

    <div class="execution-trace__activity" :class="{ running, failed }">
      <Wrench :size="16" aria-hidden="true" />
      <span>{{ complete ? '加载了工具并完成处理' : failed ? '工具执行已中断' : running ? '加载了工具并开始处理' : '已准备执行工具' }}</span>
    </div>

    <p class="execution-trace__narrative execution-trace__narrative--muted">{{ middleCopy }}</p>

    <div class="execution-trace__command-group" data-testid="execution-process">
      <button
        type="button"
        class="execution-trace__command-trigger"
        data-testid="execution-process-trigger"
        :aria-expanded="commandOpen"
        @click="commandOpen = !commandOpen"
      >
        <SquareTerminal :size="16" aria-hidden="true" />
        <span>{{ complete ? '运行了命令' : running ? '运行了命令' : failed ? '命令执行记录' : '准备运行命令' }}</span>
        <small v-if="attempt && attempt > 1">第 {{ attempt }} 次执行</small>
        <ChevronDown :size="15" :class="{ open: commandOpen }" aria-hidden="true" />
      </button>

      <div v-if="commandOpen" class="execution-trace__command-list" data-testid="execution-command-list">
        <div
          v-for="(step, index) in steps"
          :key="`${step.title}-${index}`"
          class="execution-trace__command-row"
          :class="`is-${step.status}`"
          data-testid="execution-command-row"
        >
          <LoaderCircle v-if="step.status === 'running'" :size="15" class="spin" aria-hidden="true" />
          <CheckCircle2 v-else-if="step.status === 'done'" :size="15" aria-hidden="true" />
          <SquareTerminal v-else-if="step.status === 'failed' || step.status === 'cancelled'" :size="15" aria-hidden="true" />
          <Circle v-else :size="14" aria-hidden="true" />
          <span>{{ rowLabel(step.status) }}</span>
          <small :title="step.detail">{{ step.title }}</small>
          <time>{{ step.duration }}</time>
        </div>
      </div>
    </div>

    <p class="execution-trace__narrative">{{ closingCopy }}</p>

    <div class="execution-trace__activity execution-trace__activity--file">
      <FileText :size="16" aria-hidden="true" />
      <span>{{ completedCount ? '已读取并处理任务资料' : '准备读取任务资料' }}</span>
    </div>
  </section>
</template>

<style scoped>
.execution-trace {
  width: 100%;
  margin: 4px 0 22px;
  color: #34383e;
  font-size: 14px;
  line-height: 1.85;
}
.execution-trace__narrative {
  margin: 0 0 18px;
  color: #34383e;
}
.execution-trace__narrative--muted { color: #555b63; }
.execution-trace__activity,
.execution-trace__command-trigger,
.execution-trace__command-row {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #8b9098;
}
.execution-trace__activity {
  min-height: 28px;
  margin: -2px 0 18px;
  font-size: 13px;
}
.execution-trace__activity.running svg { color: #6f7782; }
.execution-trace__activity.failed { color: #b45952; }
.execution-trace__command-group { margin: 0 0 22px; }
.execution-trace__command-trigger {
  min-height: 30px;
  border: 0;
  padding: 0;
  background: transparent;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.execution-trace__command-trigger:hover { color: #5f6670; }
.execution-trace__command-trigger small { margin-left: 2px; color: #a4a8ae; font-size: 11px; }
.execution-trace__command-trigger svg:last-child { transition: transform 160ms ease; }
.execution-trace__command-trigger svg:last-child.open { transform: rotate(180deg); }
.execution-trace__command-list {
  max-height: 252px;
  overflow-y: auto;
  margin: 6px 0 0 2px;
  padding: 2px 14px 2px 0;
  scrollbar-color: #d9dadd transparent;
  scrollbar-width: thin;
}
.execution-trace__command-list::-webkit-scrollbar { width: 5px; }
.execution-trace__command-list::-webkit-scrollbar-thumb { border-radius: 999px; background: #d9dadd; }
.execution-trace__command-row {
  min-height: 34px;
  font-size: 13px;
}
.execution-trace__command-row > span { flex: 0 0 auto; }
.execution-trace__command-row > small {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: #a0a4aa;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.execution-trace__command-row > time { flex: none; color: #b1b4b9; font-size: 11px; }
.execution-trace__command-row.is-running { color: #5e6670; }
.execution-trace__command-row.is-failed { color: #b45952; }
.execution-trace__command-row.is-waiting { color: #b3b6bb; }
.execution-trace__activity--file { margin: -4px 0 0; }
.spin { animation: trace-spin 900ms linear infinite; }
@keyframes trace-spin { to { transform: rotate(360deg); } }
@media (max-width: 720px) {
  .execution-trace { font-size: 13px; }
  .execution-trace__command-row > small { max-width: 42%; }
}
@media (prefers-reduced-motion: reduce) {
  .spin { animation: none; }
  .execution-trace__command-trigger svg:last-child { transition: none; }
}
</style>
