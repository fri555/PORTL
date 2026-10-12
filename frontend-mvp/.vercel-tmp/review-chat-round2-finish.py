from pathlib import Path
base = Path(r"D:\工作\portal")
def edit(name, old, new):
    path = base / name
    text = path.read_text(encoding="utf-8-sig")
    if old not in text:
        raise SystemExit("Missing edit anchor: " + name + " " + old[:100])
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
file="frontend-mvp/src/components/chat/source-clone/SourceChatDetail.vue"
edit(file, "  officialTemplate: boolean\n}", "  officialTemplate: boolean\n  dwsStage: 'auth' | 'confirm' | 'done' | 'cancelled'\n}")
edit(file, """const planStatus = ref<PlanStatus>(savedPlan?.status ?? (allowedDemoStates.includes(requestedDemoState) ? requestedDemoState : 'waiting'))""", """const planStatus = ref<PlanStatus>(/expert|bswjqns/.test(props.sessionId) ? savedPlan?.status ?? (allowedDemoStates.includes(requestedDemoState) ? requestedDemoState : 'waiting') : 'waiting')""")
edit(file, """const planStateLabel = computed(() => ({ waiting:'等待执行', paused:'已暂停', running:'执行中', awaiting_confirmation:'待确认', failed:'执行失败', cancelled:'已取消', superseded:'已被替代', done:'模拟完成' })[planStatus.value])""", """const planStateLabel = computed(() => ({ waiting:'等待执行', paused:'已暂停', running:'执行中', awaiting_confirmation:'待确认', failed:'执行失败', cancelled:'已取消', superseded:'已被替代', done:'模拟完成' })[planStatus.value])
const planTitle = computed(() => ({ waiting:'执行计划已就绪', paused:'自动执行已暂停', running:'计划正在执行', awaiting_confirmation:'等待操作确认', failed:'计划执行失败', cancelled:'执行已停止', superseded:'计划已被替代', done:'执行已完成' })[planStatus.value])""")
edit(file, """const dwsStage = ref<'auth' | 'confirm' | 'done'>('auth')""", """const dwsStage = ref<'auth' | 'confirm' | 'done' | 'cancelled'>(savedPlan?.dwsStage && ['auth','confirm','done','cancelled'].includes(savedPlan.dwsStage) ? savedPlan.dwsStage : 'auth')""")
edit(file, """  if (isDwsAction.value && dwsStage.value === 'done') return [""", """  if (isDwsAction.value && dwsStage.value === 'cancelled') return [
    { title: '理解任务', detail: '已识别待办内容、执行人与截止时间', status: 'done', duration: '0.8 秒' },
    { title: '完成账号授权', detail: '钉钉账号已授权', status: 'done', duration: '1.4 秒' },
    { title: '创建钉钉待办', detail: '用户已取消，待办尚未创建', status: 'cancelled', duration: '—' },
  ]
  if (isDwsAction.value && dwsStage.value === 'done') return [""")
edit(file, """  if (isDwsAction.value && dwsStage.value === 'confirm') return '等待操作确认'
  if (!isExpert.value""", """  if (isDwsAction.value && dwsStage.value === 'confirm') return '等待操作确认'
  if (isDwsAction.value && dwsStage.value === 'cancelled') return '已取消'
  if (!isExpert.value""")
edit(file, """if (isDwsAction.value) return dwsStage.value === 'done' ? 'done' : 'waiting'""", """if (isDwsAction.value) return dwsStage.value === 'done' ? 'done' : dwsStage.value === 'cancelled' ? 'cancelled' : 'waiting'""")
edit(file, "cancelled: '未执行'", "cancelled: '已取消'")
edit(file, """    if (planStatus.value !== 'waiting') return
    countdown.value = Math.max""", """    if (planStatus.value !== 'waiting') return
    if (prompt.value.length) { cancelPlan(); return }
    countdown.value = Math.max""")
edit(file, """    selectedExpertId: pendingExpert.value?.id ?? '', officialTemplate: officialTemplate.value,""", """    selectedExpertId: pendingExpert.value?.id ?? '', officialTemplate: officialTemplate.value, dwsStage: dwsStage.value,""")
edit(file, """pendingExpert, officialTemplate], savePrototypePlan""", """pendingExpert, officialTemplate, dwsStage], savePrototypePlan""")
edit(file, """  if (planStatus.value === 'running') scheduleExecution()
  else startPlanCountdown()""", """  if (isExpert.value && planStatus.value === 'running') {
    if (executionStartedAt.value === null) executionStartedAt.value = Date.now()
    scheduleExecution()
  } else startPlanCountdown()""")
edit(file, """              <span>不展示模型原始推理</span>
""", "")
edit(file, """              <div class="dws-success" data-testid="dws-auth-success">""", """              <div v-if="dwsStage !== 'cancelled'" class="dws-success" data-testid="dws-auth-success">""")
edit(file, """<button type="button" class="secondary">取消</button""", """<button type="button" class="secondary" @click="dwsStage = 'cancelled'">取消</button""")
edit(file, """              <section v-else class="dws-result" data-testid="dws-result-card">""", """              <section v-else-if="dwsStage === 'done'" class="dws-result" data-testid="dws-result-card">""")
edit(file, """                  <p>已同步至钉钉与天马智擎待办中心，截止时间：明天 15:00。</p>
                </div>
              </section>""", """                  <p>已同步至钉钉与天马智擎待办中心，截止时间：明天 15:00。</p>
                </div>
              </section>
              <section v-else class="artifact-feedback" role="status"><strong>操作已取消</strong><p>待办尚未创建。如需继续，请重新发起请求。</p></section>""")
edit(file, """                    <strong>执行计划已就绪</strong>""", """                    <strong>{{ planTitle }}</strong>""")
edit(file, """:template-label="turn.templateLabel" @running""", """:template-label="turn.templateLabel" :state-key="persistState ? sessionId + ':turn:' + turn.id : undefined" @running""")
approval="frontend-mvp/src/components/chat/source-clone/ApprovalModeControl.vue"
p=base/approval
p.write_text(p.read_text(encoding="utf-8").replace("高风险动作","高影响动作"),encoding="utf-8")
follow="frontend-mvp/src/components/chat/source-clone/FollowUpPlan.vue"
p=base/follow
s=p.read_text(encoding="utf-8")
end=s.index("</script>")+len("</script>")
s="""<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { readPrototypeChatValue, writePrototypeChatValue } from '@/utils/prototypeChatStore'
const props = defineProps<{ active: boolean; draftActivity: number; hasDraft: boolean; templateLabel: string; stateKey?: string }>()
const emit = defineEmits<{ running: [value: boolean]; modify: [] }>()
type FollowPlanStatus = 'waiting'|'paused'|'running'|'done'|'cancelled'|'superseded'
interface FollowPlanSnapshot { status: FollowPlanStatus; deadline: number; startedAt: number | null }
const candidate = props.stateKey ? readPrototypeChatValue<FollowPlanSnapshot>('follow-plan:' + props.stateKey) : null
const saved = candidate && ['waiting','paused','running','done','cancelled','superseded'].includes(candidate.status) && Number.isFinite(candidate.deadline) ? candidate : null
const initialStatus = saved?.status ?? 'waiting'
const status = ref<FollowPlanStatus>(initialStatus === 'waiting' && (!props.active || props.hasDraft) ? !props.active ? 'superseded' : 'paused' : initialStatus)
const deadline = saved?.deadline ?? Date.now() + 60000
const remaining = ref(Math.max(0,Math.ceil((deadline-Date.now())/1000)))
const startedAt = ref<number | null>(saved?.startedAt ?? null)
let timer: ReturnType<typeof setInterval> | undefined
let finish: ReturnType<typeof setTimeout> | undefined
const label = computed(() => ({waiting:'等待执行',paused:'自动执行已暂停',running:'正在模拟执行',done:'模拟执行完成',cancelled:'已取消',superseded:'已被新计划替代'})[status.value])
function clearTimers() { clearInterval(timer); clearTimeout(finish); timer=undefined; finish=undefined }
function pause() { if(status.value==='waiting') {status.value='paused'; clearInterval(timer);timer=undefined} }
function scheduleFinish() {
  const finishesAt = (startedAt.value ?? Date.now()) + 1800
  const complete = () => { if(status.value==='running'){status.value='done';emit('running',false)} }
  if(Date.now() >= finishesAt){complete();return}
  emit('running',true)
  finish=setTimeout(complete,finishesAt-Date.now())
}
function start(at: number) {
  if (!props.active || props.hasDraft || !['waiting','paused'].includes(status.value)) return
  clearInterval(timer); timer=undefined; startedAt.value=at; status.value='running'; scheduleFinish()
}
function run() { start(Date.now()) }
function stop() { clearTimers(); status.value='cancelled'; emit('running',false) }
function save() {
  if(props.stateKey)writePrototypeChatValue('follow-plan:' + props.stateKey,{status:status.value,deadline,startedAt:startedAt.value} satisfies FollowPlanSnapshot)
}
watch(()=>props.draftActivity,pause)
watch(()=>props.hasDraft, hasDraft=>{ if(hasDraft) pause() })
watch(()=>props.active, active=>{if(!active && ['waiting','paused'].includes(status.value)){clearTimers();status.value='superseded'}})
watch([status,startedAt],save,{flush:'sync'})
onMounted(()=>{
  if(status.value==='running'){scheduleFinish();return}
  if(status.value!=='waiting'){save();return}
  const tick=()=>{
    if(status.value!=='waiting')return
    if(props.hasDraft){pause();return}
    remaining.value=Math.max(0,Math.ceil((deadline-Date.now())/1000))
    if(remaining.value===0)start(deadline)
  }
  tick()
  if(status.value==='waiting')timer=setInterval(tick,1000)
  save()
})
onBeforeUnmount(()=>{save();clearTimers()})
</script>""" + s[end:]
p.write_text(s,encoding="utf-8")

