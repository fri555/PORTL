<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { readPrototypeChatValue, writePrototypeChatValue } from '@/utils/prototypeChatStore'

const props = withDefaults(defineProps<{
  active: boolean
  approvalMode?: 'default' | 'autonomous'
  draftActivity?: number
  hasDraft?: boolean
  templateLabel: string
  stateKey?: string
}>(), { approvalMode: 'default' })
const emit = defineEmits<{ running: [value: boolean]; blocked: [value: boolean]; modify: [] }>()
type FollowPlanStatus = 'waiting' | 'running' | 'done' | 'cancelled' | 'superseded' | 'unknown'
interface FollowPlanSnapshot { status: FollowPlanStatus; startedAt: number | null }
type StoredFollowPlanSnapshot = Omit<FollowPlanSnapshot, 'status'> & { status: FollowPlanStatus | 'paused' }
const candidate = props.stateKey ? readPrototypeChatValue<StoredFollowPlanSnapshot>('follow-plan:' + props.stateKey) : null
const saved = candidate && ['waiting', 'paused', 'running', 'done', 'cancelled', 'superseded', 'unknown'].includes(candidate.status) ? candidate : null
const restoredStatus = candidate !== null && !saved ? 'unknown' : saved?.status === 'paused' ? 'waiting' : saved?.status ?? 'waiting'
const validStartedAt = typeof saved?.startedAt === 'number' && Number.isFinite(saved.startedAt) && saved.startedAt >= 0 && saved.startedAt <= Date.now() ? saved.startedAt : null
const initialStatus = restoredStatus === 'running' && validStartedAt === null ? 'unknown' : restoredStatus
const status = ref<FollowPlanStatus>(initialStatus === 'waiting' && !props.active ? 'superseded' : initialStatus)
const startedAt = ref<number | null>(validStartedAt)
let finish: ReturnType<typeof setTimeout> | undefined
const label = computed(() => ({ waiting: '等待执行', running: '正在模拟执行', done: '模拟执行完成', cancelled: '已取消', superseded: '已被新计划替代', unknown: '执行结果待核实' })[status.value])

function clearTimers() { clearTimeout(finish); finish = undefined }
function scheduleFinish() {
  if (startedAt.value === null) { status.value = 'unknown'; emit('blocked', true); return }
  const finishesAt = startedAt.value + 1800
  const complete = () => { if (status.value === 'running') { status.value = 'done'; emit('running', false) } }
  if (Date.now() >= finishesAt) { complete(); return }
  emit('running', true)
  finish = setTimeout(complete, finishesAt - Date.now())
}
function run() {
  if (!props.active || status.value !== 'waiting') return
  startedAt.value = Date.now()
  status.value = 'running'
  scheduleFinish()
}
function stop() {
  if (!['waiting', 'running'].includes(status.value)) return
  clearTimers()
  status.value = 'cancelled'
  emit('running', false)
}
function save() {
  if (props.stateKey) writePrototypeChatValue('follow-plan:' + props.stateKey, { status: status.value, startedAt: startedAt.value } satisfies FollowPlanSnapshot)
}
watch(() => props.active, active => {
  if (!active && status.value === 'waiting') { clearTimers(); status.value = 'superseded' }
})
watch([status, startedAt], save, { flush: 'sync' })
onMounted(() => {
  if (status.value === 'unknown') { emit('blocked', true); save(); return }
  if (status.value === 'running') { scheduleFinish(); return }
  if (status.value === 'waiting' && props.approvalMode === 'autonomous') run()
  save()
})
onBeforeUnmount(() => { save(); clearTimers() })
</script>
<template>
  <section class="follow-plan" data-testid="follow-up-plan">
    <header><strong>本轮执行计划</strong><span>{{ label }}</span></header>
    <p v-if="status === 'waiting'">确认计划后，点击“立即执行”开始。</p>
    <p v-else-if="status === 'unknown'">本轮执行记录不完整，请核实执行结果；不会自动重试或交付文件。</p>
    <p v-else-if="status === 'superseded'">此计划不再执行，历史内容继续保留。</p>
    <ol><li>整理本轮任务和已授权资料</li><li>处理问题并形成结果</li><li>校验并交付文件；PPT 模板：{{ templateLabel }}</li></ol>
    <footer v-if="active && status === 'waiting'"><button type="button" @click="emit('modify')">修改计划</button><button type="button" @click="run">立即执行</button><button type="button" @click="stop">停止本轮</button></footer>
    <button v-if="status === 'running'" type="button" @click="stop">停止执行</button>
    <p v-if="status === 'done'" class="follow-result">本轮模拟执行完成 · {{ templateLabel }} · 文件由正式服务生成后交付。</p>
    <small>交互示例，不调用真实业务数据或生成文件。</small>
  </section>
</template>
<style scoped>
.follow-plan{border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin:10px 0 24px;background:#fff;color:#415267;font-size:13px;line-height:1.8}.follow-plan header{display:flex;justify-content:space-between;gap:12px}.follow-plan header span{color:#467abc;font-size:12px}.follow-plan p{font-size:12px;color:#738398}.follow-plan ol{padding-left:20px}.follow-plan footer{display:flex;gap:10px}.follow-plan button{padding:6px 12px;border:1px solid #d7e1ef;border-radius:7px;background:white;color:#3c71b9;cursor:pointer}.follow-plan button:disabled{opacity:.4;cursor:not-allowed}.follow-plan small{display:block;color:#9ba7b6;margin-top:12px;font-size:11px}.follow-result{background:#f1f7f3;border-radius:6px;padding:10px}
</style>



