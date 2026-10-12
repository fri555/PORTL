<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Bell, ChevronDown } from 'lucide-vue-next'
import { executionNotice } from '@/utils/executionNotice'
const props = defineProps<{ taskId: string; title: string; state: string; progressKey: string; demoWaiting?: boolean; agentName?: string; detailUrl?: string; failureReason?: string; executedAt?: string }>()
const enabled = ref(true)
const seconds = ref(60)
const settingsOpen = ref(false)
const preview = ref('')
const notificationTitle = ref('任务中断提醒')
const monitored = computed(() => props.state === 'running')
const validThreshold = computed(() => Number.isInteger(seconds.value) && seconds.value >= 1)
let lastProgress = Date.now()
let notifiedKey = ''
let timer: ReturnType<typeof setTimeout> | undefined
function immediateNotice() {
  if (!enabled.value) return false
  const interrupted = ['awaiting_confirmation','awaiting_clarification','unknown','round_limit','dws_auth'].includes(props.state)
  const terminal = ['done','failed'].includes(props.state)
  if (!interrupted && !terminal) return false
  const reason = props.state === 'awaiting_confirmation' ? '等待必须由本人完成的审批授权' : props.state === 'awaiting_clarification' ? '等待补充必填信息' : props.state === 'round_limit' ? '已达到运行轮次上限' : props.state === 'dws_auth' ? '等待本人完成钉钉 DWS 授权' : '执行结果待核实'
  const notice = executionNotice({taskId:props.taskId,runId:props.taskId,kind:'agent',taskName:props.title,subjectName:props.agentName || '业务专家',executedAt:props.executedAt || new Date().toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'}),state:interrupted?'waiting':props.state==='done'?'success':'abnormal',reason:terminal?props.failureReason:reason,interruptionId:props.progressKey})
  notificationTitle.value = notice.title
  preview.value = notice.lines.join('\n')
  notifiedKey = props.progressKey
  return true
}
function schedule() {
  clearTimeout(timer)
  if (!enabled.value) { preview.value=''; return }
  if (notifiedKey === props.progressKey || immediateNotice()) return
  if (!monitored.value || !validThreshold.value) return
  timer = setTimeout(() => {
    if (!enabled.value || !monitored.value || notifiedKey === props.progressKey) return
    notifiedKey = props.progressKey
    notificationTitle.value = '任务进展提醒'
    preview.value = `任务「${props.title}」已 ${seconds.value} 秒没有新进展。请返回 AI 工作台查看任务。`
  }, Math.max(0, lastProgress + seconds.value * 1000 - Date.now()))
}
watch(() => [props.taskId, props.progressKey, props.state], () => {
  lastProgress = Date.now() - (props.demoWaiting ? 61000 : 0)
  notifiedKey = ''; preview.value = ''; schedule()
}, { immediate: true })
watch([enabled, seconds], schedule)
onBeforeUnmount(() => clearTimeout(timer))
</script>
<template>
  <section class="task-reminder" data-testid="execution-reminder">
    <button type="button" :aria-expanded="settingsOpen" @click="settingsOpen = !settingsOpen"><Bell :size="13"/><span>钉钉提醒</span><small>{{ enabled ? '中断及运行结果通知' : '已关闭' }}</small><ChevronDown :size="12"/></button>
    <div v-if="settingsOpen" class="reminder-settings">
      <label><input v-model="enabled" type="checkbox"/>开启任务提醒</label>
      <label>无新进展时长 <input v-model.number="seconds" type="number" min="1" step="1" aria-label="钉钉提醒阈值"/> 秒</label>
      <p v-if="!validThreshold" role="alert">请输入正整数秒数。</p>
      <p>中断立即提醒，同一中断只通知一次；执行中无进展超过设置时长时提醒。运行结束后通知结果。</p>
    </div>
    <div v-if="preview" class="reminder-preview" role="status"><strong>{{ notificationTitle }} <small>原型预览</small></strong><p>{{ preview }}</p><a v-if="detailUrl" :href="detailUrl">查看详情</a></div>
  </section>
</template>
<style scoped>
.task-reminder{margin:10px 0;color:#78818c;font-size:11px}.task-reminder>button{display:flex;align-items:center;gap:6px;border:0;background:transparent;padding:4px 0;color:inherit;cursor:pointer;font:inherit}.task-reminder small{margin-left:4px;color:#949ca6}.reminder-settings{display:grid;gap:10px;margin-top:5px;border:1px solid #e9eaec;border-radius:8px;padding:12px}.reminder-settings label{display:flex;align-items:center;gap:6px}.reminder-settings input[type=number]{width:68px;border:1px solid #d8dde4;border-radius:4px;padding:3px 6px}.reminder-settings p,.reminder-preview p{margin:0;line-height:1.7;white-space:pre-line}.reminder-preview{border:1px solid #e7eaf0;border-radius:8px;padding:12px;margin:8px 0;background:#fafbfd}.reminder-preview strong{font-size:12px;font-weight:500;color:#39424f}.reminder-preview a{display:inline-block;margin-top:8px;color:#1677ff}
</style>
