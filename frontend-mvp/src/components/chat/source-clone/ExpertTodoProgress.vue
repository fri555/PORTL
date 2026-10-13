<script setup lang="ts">
import { computed, ref } from 'vue'
import { AlertCircle, Ban, CheckCircle2, ChevronDown, Circle, ListTodo, LoaderCircle } from 'lucide-vue-next'

type TodoStatus = 'waiting' | 'running' | 'done' | 'failed' | 'cancelled'
interface TodoStep {
  title: string
  detail: string
  status: TodoStatus
  duration: string
}

const props = defineProps<{ steps: TodoStep[] }>()
const open = ref(false)
const pinned = ref(false)
const completed = computed(() => props.steps.filter(step => step.status === 'done').length)
const total = computed(() => props.steps.length)
const percentage = computed(() => total.value ? Math.round(completed.value / total.value * 100) : 0)
const activeStep = computed(() => props.steps.find(step => step.status === 'running' || step.status === 'failed') ?? props.steps.find(step => step.status === 'waiting') ?? props.steps.at(-1))
const tone = computed(() => props.steps.some(step => step.status === 'failed') ? 'failed' : completed.value === total.value ? 'done' : 'running')
const statusLabel: Record<TodoStatus, string> = {
  waiting: '待执行',
  running: '执行中',
  done: '已完成',
  failed: '异常',
  cancelled: '已取消',
}
function show() { open.value = true }
function hide() { if (!pinned.value) open.value = false }
function toggle() { pinned.value = !pinned.value; open.value = pinned.value }
</script>

<template>
  <div
    v-if="total"
    class="expert-todo-progress"
    :class="`expert-todo-progress--${tone}`"
    data-testid="expert-todo-progress"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <button type="button" class="expert-todo-progress__summary" :aria-expanded="open" @click="toggle">
      <span class="expert-todo-progress__label"><ListTodo :size="14" />进度 {{ completed }}/{{ total }}</span>
      <span
        class="expert-todo-progress__track"
        role="progressbar"
        aria-label="专家待办执行进度"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="percentage"
      ><i :style="{ width: `${percentage}%` }" /></span>
      <span class="expert-todo-progress__current">{{ activeStep?.title }}</span>
      <ChevronDown :size="14" :class="{ 'is-open': open }" />
    </button>

    <div v-if="open" class="expert-todo-progress__details" data-testid="expert-todo-details" role="tooltip">
      <header><strong>任务执行情况</strong><span>{{ percentage }}%</span></header>
      <ul>
        <li v-for="step in steps" :key="step.title" :class="`is-${step.status}`">
          <CheckCircle2 v-if="step.status === 'done'" :size="15" />
          <LoaderCircle v-else-if="step.status === 'running'" :size="15" class="is-spinning" />
          <AlertCircle v-else-if="step.status === 'failed'" :size="15" />
          <Ban v-else-if="step.status === 'cancelled'" :size="15" />
          <Circle v-else :size="15" />
          <span><strong>{{ step.title }}</strong><small>{{ step.detail }}</small></span>
          <em>{{ statusLabel[step.status] }}</em>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.expert-todo-progress{position:relative;grid-column:1/-1;min-width:0;margin:0 2px 6px;z-index:12}
.expert-todo-progress__summary{display:grid;width:100%;grid-template-columns:auto minmax(70px,110px) minmax(0,1fr) auto;align-items:center;gap:9px;border:0;border-radius:6px;background:transparent;padding:4px 2px;color:#626a75;cursor:pointer;text-align:left}
.expert-todo-progress__summary:hover,.expert-todo-progress__summary:focus-visible{background:#f7f8fa;outline:none}
.expert-todo-progress__label{display:inline-flex;align-items:center;gap:5px;color:#343a43;font-size:12px;font-weight:600;white-space:nowrap}
.expert-todo-progress__track{display:block;height:4px;overflow:hidden;border-radius:99px;background:#e7eaee}
.expert-todo-progress__track i{display:block;height:100%;border-radius:inherit;background:#32a86b;transition:width .25s ease}
.expert-todo-progress--failed .expert-todo-progress__track i{background:#d95b55}
.expert-todo-progress__current{overflow:hidden;color:#7b8490;font-size:11px;text-overflow:ellipsis;white-space:nowrap}
.expert-todo-progress__summary>svg{transition:transform .15s ease}.expert-todo-progress__summary>svg.is-open{transform:rotate(180deg)}
.expert-todo-progress__details{position:absolute;right:0;bottom:calc(100% + 8px);left:0;overflow:auto;max-height:280px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;padding:12px 14px;box-shadow:0 12px 32px rgba(31,41,55,.12)}
.expert-todo-progress__details header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;color:#303640;font-size:12px}.expert-todo-progress__details header span{color:#7d8793;font-weight:500}
.expert-todo-progress__details ul{display:grid;gap:2px;margin:0;padding:0;list-style:none}
.expert-todo-progress__details li{display:grid;grid-template-columns:18px minmax(0,1fr) auto;align-items:start;gap:8px;border-radius:7px;padding:7px 6px;color:#9aa1aa}
.expert-todo-progress__details li.is-running{background:#f6f9ff;color:#3978c7}.expert-todo-progress__details li.is-done{color:#3da26f}.expert-todo-progress__details li.is-failed{background:#fff7f6;color:#cf5750}.expert-todo-progress__details li.is-cancelled{color:#9a7c73}
.expert-todo-progress__details li span{min-width:0}.expert-todo-progress__details li strong,.expert-todo-progress__details li small{display:block}.expert-todo-progress__details li strong{color:#3d4651;font-size:12px;font-weight:500}.expert-todo-progress__details li small{overflow:hidden;margin-top:2px;color:#8a939f;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.expert-todo-progress__details li em{color:currentColor;font-size:10px;font-style:normal;white-space:nowrap}
.is-spinning{animation:todo-spin 1s linear infinite}@keyframes todo-spin{to{transform:rotate(360deg)}}
@media (max-width:760px){.expert-todo-progress__summary{grid-template-columns:auto minmax(60px,1fr) auto}.expert-todo-progress__current{display:none}.expert-todo-progress__details{right:-8px;left:-8px}}
</style>