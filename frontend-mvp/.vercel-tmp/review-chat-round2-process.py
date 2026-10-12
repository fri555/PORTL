from pathlib import Path
base = Path(r"D:\工作\portal")
def edit(name, old, new):
    path = base / name
    text = path.read_text(encoding="utf-8-sig")
    if old not in text:
        raise SystemExit("Missing edit anchor: " + name + " " + old[:100])
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
file = "frontend-mvp/src/components/chat/source-clone/SourceChatDetail.vue"
edit(file, "import ApprovalModeControl, { type ApprovalMode } from './ApprovalModeControl.vue'", """import ApprovalModeControl, { type ApprovalMode } from './ApprovalModeControl.vue'
import { readPrototypeChatValue, writePrototypeChatValue } from '@/utils/prototypeChatStore'""")
edit(file, "approvalMode?: ApprovalMode }>()", "approvalMode?: ApprovalMode; persistState?: boolean }>()")
edit(file, "const countdown = ref(60)\n", "")
edit(file, """const planStatus = ref<PlanStatus>(allowedDemoStates.includes(requestedDemoState) ? requestedDemoState : 'waiting')""", """interface FailedExecutionAttempt { version: number; steps: ExecutionStep[] }
interface PrototypePlanSnapshot {
  status: PlanStatus
  deadlineAt: number
  startedAt: number | null
  finishedAt: number | null
  attempt: number
  failedAttempts: FailedExecutionAttempt[]
  stoppedSteps: ExecutionStep[] | null
  draft: string
  followUps: typeof followUps.value
  selectedExpertId: string
  officialTemplate: boolean
}
const candidateSnapshot = props.persistState ? readPrototypeChatValue<PrototypePlanSnapshot>('plan:' + props.sessionId) : null
const savedPlan = candidateSnapshot && allowedDemoStates.includes(candidateSnapshot.status) && Number.isFinite(candidateSnapshot.deadlineAt) ? candidateSnapshot : null
const planStatus = ref<PlanStatus>(savedPlan?.status ?? (allowedDemoStates.includes(requestedDemoState) ? requestedDemoState : 'waiting'))
const deadlineAt = ref(savedPlan?.deadlineAt ?? Date.now() + 60000)
const countdown = ref(Math.max(0, Math.ceil((deadlineAt.value - Date.now()) / 1000)))
const executionStartedAt = ref<number | null>(savedPlan?.startedAt ?? null)
const executionFinishedAt = ref<number | null>(savedPlan?.finishedAt ?? null)
const executionAttempt = ref(Math.max(1, savedPlan?.attempt ?? 1))
const failedAttempts = ref<FailedExecutionAttempt[]>(Array.isArray(savedPlan?.failedAttempts) ? savedPlan.failedAttempts : [])
const stoppedSteps = ref<ExecutionStep[] | null>(Array.isArray(savedPlan?.stoppedSteps) ? savedPlan.stoppedSteps : null)
const executionNow = ref(Date.now())
let executionClock: number | undefined
if (savedPlan) {
  prompt.value = typeof savedPlan.draft === 'string' ? savedPlan.draft : ''
  followUps.value = Array.isArray(savedPlan.followUps) ? savedPlan.followUps : []
  pendingExpert.value = availableExperts.value.find(agent => agent.id === savedPlan.selectedExpertId) ?? null
}""")
edit(file, "const officialTemplate = ref(demoQuery.get('template') === 'official')", "const officialTemplate = ref(savedPlan?.officialTemplate ?? (demoQuery.get('template') === 'official'))")
edit(file, """  if (!isExpert.value) return [
    { title: '理解任务', detail: '已识别用户目标与当前会话范围', status: 'done', duration: '0.8 秒' },""", """  if (isDwsAction.value && dwsStage.value === 'done') return [
    { title: '理解任务', detail: '已识别待办内容、执行人与截止时间', status: 'done', duration: '0.8 秒' },
    { title: '完成账号授权', detail: '钉钉账号已授权', status: 'done', duration: '1.4 秒' },
    { title: '创建钉钉待办', detail: '待办创建成功，已同步至待办中心', status: 'done', duration: '0.9 秒' },
  ]
  if (!isExpert.value) return [
    { title: '理解任务', detail: '已识别用户目标与当前会话范围', status: 'done', duration: '0.8 秒' },""")
edit(file, """  if (planStatus.value === 'done') return [
    { title: '理解任务', detail: '已确认目标、范围和输出要求', status: 'done', duration: '1.2 秒' },
    { title: '读取授权资料', detail: '已处理当前账号可访问的信息', status: 'done', duration: '4.6 秒' },
    { title: '生成结果', detail: '已形成结论并检查文件产物', status: 'done', duration: '2.1 秒' },
  ]""", """  if (planStatus.value === 'done') {
    const elapsed = executionStartedAt.value === null ? null : Math.max(0, (executionFinishedAt.value ?? executionNow.value) - executionStartedAt.value)
    return [
      { title: '理解任务', detail: '已确认目标、范围和输出要求', status: 'done', duration: '1.2 秒' },
      { title: '读取授权资料', detail: '已处理当前账号可访问的信息', status: 'done', duration: elapsed === null ? '4.6 秒' : durationText(Math.min(1200, elapsed)) },
      { title: '生成结果', detail: '已形成结论并检查文件产物', status: 'done', duration: elapsed === null ? '2.1 秒' : durationText(Math.max(0, elapsed - 1200)) },
    ]
  }""")
edit(file, """  if (planStatus.value === 'running') return [
    { title: '理解任务', detail: '已确认目标、范围和输出要求', status: 'done', duration: '1.2 秒' },
    { title: '读取授权资料', detail: '正在读取已授权范围内的资料', status: 'running', duration: '进行中' },
    { title: '生成结果', detail: '等待资料处理完成', status: 'waiting', duration: '—' },
  ]""", """  if (planStatus.value === 'running') {
    const elapsed = Math.max(0, executionNow.value - (executionStartedAt.value ?? executionNow.value))
    return [
      { title: '理解任务', detail: '已确认目标、范围和输出要求', status: 'done', duration: '1.2 秒' },
      { title: '读取授权资料', detail: elapsed < 1200 ? '正在读取已授权范围内的资料' : '已处理当前账号可访问的信息', status: elapsed < 1200 ? 'running' : 'done', duration: durationText(Math.min(1200, elapsed)) },
      { title: '生成结果', detail: elapsed < 1200 ? '等待资料处理完成' : '正在形成结论并检查文件产物', status: elapsed < 1200 ? 'waiting' : 'running', duration: elapsed < 1200 ? '—' : durationText(elapsed - 1200) },
    ]
  }
  if (planStatus.value === 'awaiting_confirmation') return [
    { title: '理解任务', detail: '已确认目标、范围和输出要求', status: 'done', duration: '1.2 秒' },
    { title: '读取授权资料', detail: '已处理当前账号可访问的信息', status: 'done', duration: '4.6 秒' },
    { title: '对外分享', detail: '等待确认操作对象与影响范围', status: 'waiting', duration: '—' },
  ]
  if (planStatus.value === 'cancelled' && stoppedSteps.value) return stoppedSteps.value""")
edit(file, """const processTone = computed(() => isDwsAction.value && dwsStage.value !== 'done' ? 'waiting' : planStatus.value === 'failed' ? 'failed' : planStatus.value === 'running' ? 'running' : planStatus.value === 'done' || !isExpert.value ? 'done' : 'waiting')""", """const processTone = computed(() => {
  if (isDwsAction.value) return dwsStage.value === 'done' ? 'done' : 'waiting'
  if (!isExpert.value) return 'done'
  return planStatus.value === 'failed' ? 'failed' : planStatus.value === 'running' ? 'running' : planStatus.value === 'done' ? 'done' : 'waiting'
})
const processingDuration = computed(() => durationText(executionSteps.value.reduce((total, step) => total + (parseFloat(step.duration) || 0) * 1000, 0)))
function durationText(milliseconds: number) { return (Math.max(0, milliseconds) / 1000).toFixed(1) + ' 秒' }""")
edit(file, """? '帮我创建一个明天下午 3 点提交经营复盘的钉钉待办'""", """? props.initialPrompt || '帮我创建一个明天下午 3 点提交经营复盘的钉钉待办'""")
edit(file, """: isCitationDemo.value ? '制度查询时，如何结合知识库和公开网页？' : '获取下我钉钉上相关信息',""", """: props.initialPrompt || (isCitationDemo.value ? '制度查询时，如何结合知识库和公开网页？' : '获取下我钉钉上相关信息'),""")
start = """function startPlanCountdown() {
  if (!isExpert.value || countdownTimer || planStatus.value !== 'waiting') return
  countdownTimer = window.setInterval(() => {
    if (planStatus.value !== 'waiting') return
    countdown.value -= 1
    if (countdown.value <= 0) runPlan()
  }, 1000)
}
function runPlan() {
  if (!['waiting','paused'].includes(planStatus.value) || followUpRunning.value) return
  if (prompt.value.length) {
    ElMessage.info('请先发送修改意见，生成新计划后再执行')
    return
  }
  planStatus.value = 'running'
  executionTimer = window.setTimeout(() => {
    planStatus.value = 'done'
  }, 1800)
  if (countdownTimer) window.clearInterval(countdownTimer)
  countdownTimer = undefined
}"""
new = """function startPlanCountdown() {
  if (!isExpert.value || countdownTimer || planStatus.value !== 'waiting') return
  if (prompt.value.length) { cancelPlan(); return }
  const tick = () => {
    if (planStatus.value !== 'waiting') return
    countdown.value = Math.max(0, Math.ceil((deadlineAt.value - Date.now()) / 1000))
    if (countdown.value <= 0) beginExecution(deadlineAt.value)
  }
  tick()
  if (planStatus.value === 'waiting') countdownTimer = window.setInterval(tick, 1000)
}
function finishExecutionClock() {
  if (executionClock) window.clearInterval(executionClock)
  executionClock = undefined
}
function scheduleExecution() {
  window.clearTimeout(executionTimer)
  finishExecutionClock()
  executionNow.value = Date.now()
  const finishesAt = (executionStartedAt.value ?? Date.now()) + 1800
  const complete = () => {
    if (planStatus.value !== 'running') return
    executionFinishedAt.value = finishesAt
    executionNow.value = finishesAt
    planStatus.value = 'done'
    finishExecutionClock()
  }
  if (Date.now() >= finishesAt) { complete(); return }
  executionClock = window.setInterval(() => { executionNow.value = Date.now() }, 100)
  executionTimer = window.setTimeout(complete, finishesAt - Date.now())
}
function beginExecution(startedAt = Date.now()) {
  if (countdownTimer) window.clearInterval(countdownTimer)
  countdownTimer = undefined
  executionStartedAt.value = startedAt
  executionFinishedAt.value = null
  planStatus.value = 'running'
  scheduleExecution()
}
function runPlan() {
  if (!['waiting','paused'].includes(planStatus.value) || followUpRunning.value) return
  if (prompt.value.length) {
    ElMessage.info('请先发送修改意见，生成新计划后再执行')
    return
  }
  beginExecution()
}"""
edit(file, start, new)
edit(file, """function stopPlan() {
  window.clearInterval(countdownTimer); window.clearTimeout(executionTimer)
  countdownTimer=undefined; planStatus.value='cancelled'
}
function confirmHighImpact() { planStatus.value='paused'; runPlan() }
function retryPlan() { planStatus.value='paused'; runPlan() }""", """function stopPlan() {
  if (!['waiting','paused','running','awaiting_confirmation'].includes(planStatus.value)) return
  executionNow.value = Date.now()
  stoppedSteps.value = executionSteps.value.map(step => step.status === 'done' ? { ...step } : { ...step, status: 'cancelled', detail: step.status === 'running' ? '执行已由用户停止' : '本阶段未执行' })
  window.clearInterval(countdownTimer)
  window.clearTimeout(executionTimer)
  finishExecutionClock()
  countdownTimer = undefined
  executionFinishedAt.value = Date.now()
  planStatus.value = 'cancelled'
}
function confirmHighImpact() {
  if (planStatus.value !== 'awaiting_confirmation') return
  beginExecution(Date.now() - 1200)
}
function retryPlan() {
  if (planStatus.value !== 'failed' || followUpRunning.value) return
  if (prompt.value.length) { ElMessage.info('请先发送修改意见，或清空草稿后重试'); return }
  failedAttempts.value.push({ version: executionAttempt.value, steps: executionSteps.value.map(step => ({ ...step })) })
  executionAttempt.value++
  beginExecution()
}""")
edit(file, """watch(prompt, (value) => {
  if (value.length > 0) cancelPlan()
})
onMounted(startPlanCountdown)
onBeforeUnmount(() => {
  if (countdownTimer) window.clearInterval(countdownTimer)
  window.clearTimeout(executionTimer)
})""", """watch(prompt, (value) => {
  if (value.length > 0) cancelPlan()
})
function savePrototypePlan() {
  if (!props.persistState) return
  writePrototypeChatValue('plan:' + props.sessionId, {
    status: planStatus.value, deadlineAt: deadlineAt.value,
    startedAt: executionStartedAt.value, finishedAt: executionFinishedAt.value,
    attempt: executionAttempt.value, failedAttempts: failedAttempts.value,
    stoppedSteps: stoppedSteps.value, draft: prompt.value, followUps: followUps.value,
    selectedExpertId: pendingExpert.value?.id ?? '', officialTemplate: officialTemplate.value,
  } satisfies PrototypePlanSnapshot)
}
watch([planStatus, deadlineAt, executionStartedAt, executionFinishedAt, executionAttempt, failedAttempts, stoppedSteps, prompt, followUps, pendingExpert, officialTemplate], savePrototypePlan, { deep: true, flush: 'sync' })
onMounted(() => {
  if (planStatus.value === 'running') scheduleExecution()
  else startPlanCountdown()
  savePrototypePlan()
})
onBeforeUnmount(() => {
  savePrototypePlan()
  if (countdownTimer) window.clearInterval(countdownTimer)
  window.clearTimeout(executionTimer)
  finishExecutionClock()
})""")
edit(file, """              <span class="process-meta">{{ completedExecutionSteps }}/{{ executionSteps.length }} 个阶段</span>""", """              <span class="process-meta"><template v-if="executionAttempt > 1">第 {{ executionAttempt }} 次执行 · </template>{{ completedExecutionSteps }}/{{ executionSteps.length }} 个阶段</span>""")
edit(file, """            </ol>
          </section>
          <template v-if="isDwsAction">""", """            </ol>
            <section v-if="failedAttempts.length" class="process-attempts" data-testid="execution-attempt-history">
              <h3>历史执行记录</h3>
              <article v-for="attempt in failedAttempts" :key="attempt.version">
                <header>第 {{ attempt.version }} 次执行 · 执行失败</header>
                <p v-for="step in attempt.steps.filter(item => item.status === 'failed')" :key="step.title"><strong>{{ step.title }}</strong><span>{{ step.detail }}</span><time>{{ step.duration }}</time></p>
              </article>
            </section>
          </section>
          <template v-if="isDwsAction">""")
edit(file, """            <p>创建待办属于钉钉写操作。首次使用需要完成账号授权，执行前还会再次向你确认。</p>""", """            <p>{{ normalizedApprovalMode === 'autonomous' ? '首次使用需要本人完成钉钉账号授权；授权后自主执行可自动同意本次低风险待办创建。' : '创建待办属于钉钉写操作。首次使用需要完成账号授权，执行前还会再次向你确认。' }}</p>""")
edit(file, """            {{ isExpert ? '模拟完成' : '全部完成' }} · 处理用时 {{ isExpert ? 6 : 9 }} 秒""", """            {{ isExpert ? '模拟完成' : '全部完成' }} · 处理用时 {{ processingDuration }}""")
edit(file, "<style scoped>\n", """<style scoped>
.process-attempts { margin-top: 16px; border-top: 1px solid #edf0f3; padding-top: 10px; }
.process-attempts h3 { margin: 0 0 8px; color: #7a8593; font-size: 11px; font-weight: 500; }
.process-attempts article { margin-top: 7px; padding: 10px 12px; border: 1px solid #f0d9d8; border-radius: 8px; background: #fff8f7; }
.process-attempts article header { color: #b34d48; font-size: 12px; }
.process-attempts p { display: flex; align-items: center; gap: 10px; margin: 5px 0 0; color: #8a7572; font-size: 11px; }
.process-attempts p strong { font-weight: 500; }
.process-attempts time { margin-left: auto; white-space: nowrap; }
""")
follow = "frontend-mvp/src/components/chat/source-clone/FollowUpPlan.vue"
edit(follow, "const status = ref<'waiting'|'paused'|'running'|'done'|'cancelled'|'superseded'>('waiting')", "const status = ref<'waiting'|'paused'|'running'|'done'|'cancelled'|'superseded'>(!props.active ? 'superseded' : props.hasDraft ? 'paused' : 'waiting')")
edit(follow, "watch(()=>props.draftActivity,pause)", """watch(()=>props.draftActivity,pause)
watch(()=>props.hasDraft, hasDraft=>{ if(hasDraft) pause() })""")
edit(follow, """onMounted(()=>{timer=setInterval(()=>{remaining.value=Math.max(0,Math.ceil((deadline-Date.now())/1000));if(remaining.value===0)run()},1000)})""", """onMounted(()=>{if(status.value==='waiting')timer=setInterval(()=>{if(status.value!=='waiting')return;remaining.value=Math.max(0,Math.ceil((deadline-Date.now())/1000));if(remaining.value===0)run()},1000)})""")

