<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ArrowUp,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CirclePause,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Globe2,
  Link2,
  Plus,
  Play,
  Presentation,
  ShieldCheck,
  Share2,
  Timer,
  UploadCloud,
  Wrench,
  X,
} from 'lucide-vue-next'
import { expertAgents as agents, getHistoricalExpert } from '@/utils/expertPrototypeStore'
import { dailyAssistant } from '@/mock/agents'
import { ElMessage } from 'element-plus'
import ExpertMentionMenu from './ExpertMentionMenu.vue'
import { useExpertCatalog, isExpertAvailable } from '@/composables/useExpertCatalog'
import { useExpertMention } from '@/composables/useExpertMention'
import AnswerCitations from './AnswerCitations.vue'
import { citationSources, citedParagraphs, dailySource } from '@/mock/citations'
import type { CitationPreviewLoader } from '@/types/citation'
import FollowUpPlan from './FollowUpPlan.vue'
import TaskStallReminder from './TaskStallReminder.vue'
import ApprovalModeControl, { type ApprovalMode } from './ApprovalModeControl.vue'
import { readPrototypeChatValue, writePrototypeChatValue } from '@/utils/prototypeChatStore'
import { recordExpertSuccessfulSend } from '@/utils/expertSendRecent'

const props = defineProps<{ sessionId: string; agentId?: string; initialPrompt?: string; approvalMode?: ApprovalMode; persistState?: boolean }>()
const emit = defineEmits<{ share: [] }>()

const assetBase = import.meta.env.BASE_URL
const taskFilesOpen = ref(false)
const citationPanelOpen = ref(false)
const citationExplorer = ref<InstanceType<typeof AnswerCitations> | null>(null)
const isCitationDemo = computed(() => props.sessionId.startsWith('citation-'))
const answerSources = computed(() => {
  if (!isCitationDemo.value) return [dailySource]
  if (props.sessionId === 'citation-empty') return []
  return citationSources.filter((_, index) => props.sessionId !== 'citation-missing-metadata' || index !== 0).map((source, index) => ({
    ...source,
    ...(props.sessionId === 'citation-web-missing' && source.type === 'web' ? { title:'', origin:'', url:'', publishedAt:'', capturedAt:'', summary:'' } : {}),
    access: props.sessionId === 'citation-restricted' && index === 0 ? 'forbidden' as const : source.access,
  }))
})
const answerParagraphs = computed(() => props.sessionId === 'citation-empty' ? [{ text:'这是一条没有使用外部知识或网页来源的回答示例。', citations:[] }] : isCitationDemo.value ? citedParagraphs : [{ text: '已为你汇总当前授权范围内的日程和待办，以下为示例内容。', citations: [{ sourceId: dailySource.id, fragmentId: 'daily-items' }] }])
const previewAttempts = new Map<string, number>()
const loadCitationPreview: CitationPreviewLoader = async source => {
  const attempt = previewAttempts.get(source.id) ?? 0
  previewAttempts.set(source.id, attempt + 1)
  if (props.sessionId === 'citation-failure' && source.type === 'knowledge' && attempt === 0) throw new Error('Preview unavailable')
  return source.fragments
}
function onCitationPanel(open: boolean) { citationPanelOpen.value = open; if (open) taskFilesOpen.value = false }
function openTaskFiles() { citationExplorer.value?.closePanel(false); taskFilesOpen.value = true }
const prompt = ref('')
const input = ref<HTMLTextAreaElement | null>(null)
const { availableExperts } = useExpertCatalog()
// Preserve the stored ID even when an expert is no longer selectable.
const pendingExpertId = ref('')
const pendingExpert = computed(() => getHistoricalExpert(pendingExpertId.value))
const pendingExpertName = computed(() => pendingExpert.value?.name || (pendingExpertId.value ? '历史专家（暂不可用）' : ''))
const followUps = ref<{ id: number; text: string; expert: string; expertId?: string; usesExpert: boolean; time: string; templateLabel: string }[]>([])
const followUpRunning = ref(false)
const followUpBlocked = ref(false)
const mention = useExpertMention(prompt, input, availableExperts, agent => { pendingExpertId.value = agent.id })
const { open: mentionOpen, keyword: mentionKeyword, results: mentionResults, allResults: mentionAllResults, activeIndex: mentionIndex, hasMore: mentionHasMore } = mention
function detailKeydown(event: KeyboardEvent) {
  if (mention.keydown(event)) return
  if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitFollowUp() }
}
const demoQuery = new URLSearchParams(window.location.search)
const fixtureUserTime = '2026-10-12 09:01:00'
const fixtureAnswerTime = '2026-10-12 09:01:18'
type PlanStatus = 'waiting' | 'paused' | 'running' | 'awaiting_clarification' | 'awaiting_confirmation' | 'unknown' | 'failed' | 'cancelled' | 'superseded' | 'done'
const allowedDemoStates: PlanStatus[] = ['waiting','paused','running','awaiting_clarification','awaiting_confirmation','unknown','failed','cancelled','superseded','done']
interface PlanClarification { id: string; label: string; required: boolean; value: string; defaultValue?: string; defaultValid?: boolean }
function demoClarifications(): PlanClarification[] {
  switch (demoQuery.get('clarification')) {
    case 'required': return [{ id: 'scope', label: '分析范围', required: true, value: '' }]
    case 'optional-default': return [{ id: 'format', label: '报告格式', required: false, value: '', defaultValue: 'DOCX', defaultValid: true }]
    case 'optional-invalid': return [{ id: 'note', label: '补充说明', required: false, value: '', defaultValue: '未校验内容', defaultValid: false }]
    case 'optional-empty': return [{ id: 'note', label: '补充说明', required: false, value: '' }]
    default: return []
  }
}
const authorizationKind = demoQuery.get('authorization') === 'tool' ? '工具调用' : '对外分享'
const requestedDemoState = demoQuery.get('planState') as PlanStatus
interface FailedExecutionAttempt { version: number; steps: ExecutionStep[] }
interface PrototypePlanSnapshot {
  status: PlanStatus
  startedAt: number | null
  finishedAt: number | null
  attempt: number
  failedAttempts: FailedExecutionAttempt[]
  stoppedSteps: ExecutionStep[] | null
  draft: string
  followUps: typeof followUps.value
  selectedExpertId: string
  officialTemplate: boolean
  dwsStage: 'auth' | 'confirm' | 'done' | 'cancelled'
  clarifications: PlanClarification[]
  clarificationConfirmed: boolean
  authorizationConfirmed: boolean
}
const candidateSnapshot = props.persistState ? readPrototypeChatValue<PrototypePlanSnapshot>('plan:' + props.sessionId) : null
const savedPlan = candidateSnapshot && typeof candidateSnapshot.status === 'string' ? candidateSnapshot : null
function initialPlanStatus(): PlanStatus {
  if (!/expert|bswjqns/.test(props.sessionId)) return 'waiting'
  if (savedPlan) {
    if (!allowedDemoStates.includes(savedPlan.status) || (savedPlan.status === 'running' && (typeof savedPlan.startedAt !== 'number' || !Number.isFinite(savedPlan.startedAt) || savedPlan.startedAt < 0 || savedPlan.startedAt > Date.now()))) return 'unknown'
    return savedPlan.status === 'paused' ? 'waiting' : savedPlan.status
  }
  return allowedDemoStates.includes(requestedDemoState) ? requestedDemoState === 'paused' ? 'waiting' : requestedDemoState : 'waiting'
}
const planStatus = ref<PlanStatus>(initialPlanStatus())
const clarifications = ref<PlanClarification[]>(Array.isArray(savedPlan?.clarifications) ? savedPlan.clarifications.filter(item => item && typeof item.id === 'string' && typeof item.label === 'string' && typeof item.required === 'boolean' && typeof item.value === 'string') : demoClarifications())
const clarificationConfirmed = ref(savedPlan?.clarificationConfirmed === true)
const authorizationRequired = ['tool','business'].includes(demoQuery.get('authorization') ?? '')
const humanAuthorizationRequired = demoQuery.get('humanRequired') === '1'
const authorizationConfirmed = ref(savedPlan?.authorizationConfirmed === true)
const skippedClarifications = computed(() => clarifications.value.filter(item => !item.required))
const missingRequiredClarification = computed(() => clarifications.value.some(item => item.required && !item.value.trim()))
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
  pendingExpertId.value = typeof savedPlan.selectedExpertId === 'string' ? savedPlan.selectedExpertId : ''
}
const planStateLabel = computed(() => ({ waiting:'等待执行', paused:'等待执行', running:'执行中', awaiting_clarification:'待补充', awaiting_confirmation:'待确认', unknown:'结果待核实', failed:'执行失败', cancelled:'已取消', superseded:'已被替代', done:'模拟完成' })[planStatus.value])
const planTitle = computed(() => ({ waiting:'执行计划已就绪', paused:'执行计划已就绪', running:'计划正在执行', awaiting_clarification:'请补充任务信息', awaiting_confirmation:'等待操作确认', unknown:'执行结果待核实', failed:'计划执行失败', cancelled:'执行已停止', superseded:'计划已被替代', done:'执行已完成' })[planStatus.value])
const artifactFailed = ref(demoQuery.get('artifactState') === 'failed')
const artifactRetrying = ref(false)
let executionTimer: number | undefined
const processOpen = ref(false)
const fullPlanOpen = ref(false)
watch(planStatus, status => { if (status === 'done') processOpen.value = false })
const templateInput = ref<HTMLInputElement | null>(null)
const uploadedTemplateName = ref('')
const templateHintDismissed = ref(false)
const officialTemplate = ref(savedPlan?.officialTemplate ?? (demoQuery.get('template') === 'official'))
const draftOfficialTemplate = ref(false)
const composingNewRequest = computed(() => !!prompt.value.length || !!followUps.value.length || ['done','cancelled','superseded'].includes(planStatus.value))
const composerTemplate = computed({get:()=>composingNewRequest.value ? draftOfficialTemplate.value : officialTemplate.value, set:value=>{if(composingNewRequest.value)draftOfficialTemplate.value=value;else officialTemplate.value=value}})
const selectedAgent = computed(() => getHistoricalExpert(props.agentId ?? ''))
// The suggestion belongs to the separate context-suggestions feature; this prototype consumes a supplied choice only.
const templateSuggestionAvailable = computed(() => props.sessionId === 'expert-template' || demoQuery.get('templateSuggestion') === '1')
const templateLabel = computed(() => uploadedTemplateName.value || (officialTemplate.value ? '天马集团PPT统一模板-20251119版' : '普通模板'))
const contextSuggestions = ref([
  '把今天的待办按优先级排序',
  '帮我起草经营复盘会议纪要',
  '继续查看本周剩余日程',
])
const dwsStage = ref<'auth' | 'confirm' | 'done' | 'cancelled'>(savedPlan?.dwsStage && ['auth','confirm','done','cancelled'].includes(savedPlan.dwsStage) ? savedPlan.dwsStage : 'auth')
const isDwsAction = computed(() => props.sessionId.includes('dws-action'))

// A conversation keeps the mode selected at creation, including subsequent prop updates.
const normalizedApprovalMode = ref<ApprovalMode>(props.approvalMode === 'autonomous' ? 'autonomous' : 'default')
const isExpert = computed(
  () => props.sessionId.includes('expert') || props.sessionId.includes('bswjqns'),
)
type ExecutionStepStatus = 'waiting' | 'running' | 'done' | 'failed' | 'cancelled'
interface ExecutionStep {
  title: string
  detail: string
  status: ExecutionStepStatus
  duration: string
}
const executionSteps = computed<ExecutionStep[]>(() => {
  if (isDwsAction.value && dwsStage.value === 'auth') return [
    { title: '理解任务', detail: '已识别待办内容、执行人与截止时间', status: 'done', duration: '0.8 秒' },
    { title: '完成账号授权', detail: '需要本人完成钉钉账号授权', status: 'waiting', duration: '—' },
    { title: '创建钉钉待办', detail: '等待授权完成', status: 'waiting', duration: '—' },
  ]
  if (isDwsAction.value && dwsStage.value === 'confirm') return [
    { title: '理解任务', detail: '已识别待办内容、执行人与截止时间', status: 'done', duration: '0.8 秒' },
    { title: '完成账号授权', detail: '钉钉账号已授权', status: 'done', duration: '1.4 秒' },
    { title: '创建钉钉待办', detail: '等待用户确认执行', status: 'waiting', duration: '—' },
  ]
  if (isDwsAction.value && dwsStage.value === 'cancelled') return [
    { title: '理解任务', detail: '已识别待办内容、执行人与截止时间', status: 'done', duration: '0.8 秒' },
    { title: '完成账号授权', detail: '钉钉账号已授权', status: 'done', duration: '1.4 秒' },
    { title: '创建钉钉待办', detail: '用户已取消，待办尚未创建', status: 'cancelled', duration: '—' },
  ]
  if (isDwsAction.value && dwsStage.value === 'done') return [
    { title: '理解任务', detail: '已识别待办内容、执行人与截止时间', status: 'done', duration: '0.8 秒' },
    { title: '完成账号授权', detail: '钉钉账号已授权', status: 'done', duration: '1.4 秒' },
    { title: '创建钉钉待办', detail: '待办创建成功，已同步至待办中心', status: 'done', duration: '0.9 秒' },
  ]
  if (!isExpert.value) return [
    { title: '理解任务', detail: '已识别用户目标与当前会话范围', status: 'done', duration: '0.8 秒' },
    { title: '读取授权资料', detail: '已处理当前账号可访问的信息', status: 'done', duration: '1.6 秒' },
    { title: '生成结果', detail: '已组织并检查回复内容', status: 'done', duration: '0.7 秒' },
  ]
  if (planStatus.value === 'done') {
    const elapsed = executionStartedAt.value === null ? null : Math.max(0, (executionFinishedAt.value ?? executionNow.value) - executionStartedAt.value)
    return [
      { title: '理解任务', detail: '已确认目标、范围和输出要求', status: 'done', duration: '1.2 秒' },
      { title: '读取授权资料', detail: '已处理当前账号可访问的信息', status: 'done', duration: elapsed === null ? '4.6 秒' : durationText(Math.min(1200, elapsed)) },
      { title: '生成结果', detail: '已形成结论并检查文件产物', status: 'done', duration: elapsed === null ? '2.1 秒' : durationText(Math.max(0, elapsed - 1200)) },
    ]
  }
  if (planStatus.value === 'failed') return [
    { title: '理解任务', detail: '已确认目标、范围和输出要求', status: 'done', duration: '1.2 秒' },
    { title: '读取授权资料', detail: '读取超时，可重试本轮执行', status: 'failed', duration: '3.8 秒' },
    { title: '生成结果', detail: '等待资料处理完成', status: 'waiting', duration: '—' },
  ]
  if (planStatus.value === 'running') {
    const elapsed = Math.max(0, executionNow.value - (executionStartedAt.value ?? executionNow.value))
    return [
      { title: '理解任务', detail: '已确认目标、范围和输出要求', status: 'done', duration: '1.2 秒' },
      { title: '读取授权资料', detail: elapsed < 1200 ? '正在读取已授权范围内的资料' : '已处理当前账号可访问的信息', status: elapsed < 1200 ? 'running' : 'done', duration: durationText(Math.min(1200, elapsed)) },
      { title: '生成结果', detail: elapsed < 1200 ? '等待资料处理完成' : '正在形成结论并检查文件产物', status: elapsed < 1200 ? 'waiting' : 'running', duration: elapsed < 1200 ? '—' : durationText(elapsed - 1200) },
    ]
  }
  if (planStatus.value === 'unknown') return [
    { title: '理解任务', detail: '已确认目标、范围和输出要求', status: 'done', duration: '1.2 秒' },
    { title: '核实执行结果', detail: '尚未取得可确认的执行结果；核实前不能重复启动', status: 'waiting', duration: '—' },
    { title: '生成结果', detail: '结果未确认，暂不展示成功或文件', status: 'waiting', duration: '—' },
  ]
  if (planStatus.value === 'awaiting_clarification') return [
    { title: '理解任务', detail: '等待用户补充任务信息', status: 'waiting', duration: '—' },
    { title: '读取授权资料', detail: '澄清完成前不执行', status: 'waiting', duration: '—' },
    { title: '生成结果', detail: '等待资料处理完成', status: 'waiting', duration: '—' },
  ]
  if (planStatus.value === 'awaiting_confirmation' && authorizationKind === '工具调用') return [
    { title: '理解任务', detail: '已确认目标、范围和输出要求', status: 'done', duration: '1.2 秒' },
    { title: '工具调用', detail: '等待你确认读取已授权资料，本次调用尚未执行', status: 'waiting', duration: '—' },
    { title: '生成结果', detail: '等待工具调用完成', status: 'waiting', duration: '—' },
  ]
  if (planStatus.value === 'awaiting_confirmation') return [
    { title: '理解任务', detail: '已确认目标、范围和输出要求', status: 'done', duration: '1.2 秒' },
    { title: '读取授权资料', detail: '已处理当前账号可访问的信息', status: 'done', duration: '4.6 秒' },
    { title: authorizationKind, detail: '等待用户确认操作对象与影响范围', status: 'waiting', duration: '—' },
  ]
  if (planStatus.value === 'cancelled' && stoppedSteps.value) return stoppedSteps.value
  if (planStatus.value === 'cancelled' || planStatus.value === 'superseded') return [
    { title: '理解任务', detail: '已确认目标、范围和输出要求', status: 'done', duration: '1.2 秒' },
    { title: '读取授权资料', detail: planStatus.value === 'cancelled' ? '执行已由用户停止' : '已有新计划替代本轮执行', status: 'cancelled', duration: '—' },
    { title: '生成结果', detail: '未执行', status: 'cancelled', duration: '—' },
  ]
  return [
    { title: '理解任务', detail: '已确认目标、范围和输出要求', status: 'done', duration: '1.2 秒' },
    { title: '读取授权资料', detail: '等待计划开始执行', status: 'waiting', duration: '—' },
    { title: '生成结果', detail: '等待资料处理完成', status: 'waiting', duration: '—' },
  ]
})
const completedExecutionSteps = computed(() => executionSteps.value.filter(step => step.status === 'done').length)
const activeExecutionStep = computed(() => executionSteps.value.find(step => ['running','failed','waiting'].includes(step.status)) || executionSteps.value.at(-1)!)
const toolCallLabel = computed(() => activeExecutionStep.value.title === '理解任务' ? '任务理解' : activeExecutionStep.value.title)
const processHeadline = computed(() => {
  if (isDwsAction.value && dwsStage.value === 'auth') return '等待账号授权'
  if (isDwsAction.value && dwsStage.value === 'confirm') return '等待操作确认'
  if (isDwsAction.value && dwsStage.value === 'cancelled') return '已取消'
  if (!isExpert.value || planStatus.value === 'done') return '处理完成'
  return ({ failed: '执行失败', running: '执行中', cancelled: '已取消', superseded: '已被替代', awaiting_confirmation: '等待确认', awaiting_clarification: '等待补充', unknown: '结果待核实', waiting: '计划就绪', paused: '计划就绪' } as Record<PlanStatus, string>)[planStatus.value]
})
const processTone = computed(() => {
  if (isDwsAction.value) return dwsStage.value === 'done' ? 'done' : dwsStage.value === 'cancelled' ? 'cancelled' : 'waiting'
  if (!isExpert.value) return 'done'
  return planStatus.value === 'failed' ? 'failed' : planStatus.value === 'running' ? 'running' : planStatus.value === 'done' ? 'done' : 'waiting'
})
const processingDuration = computed(() => durationText(executionSteps.value.reduce((total, step) => total + (parseFloat(step.duration) || 0) * 1000, 0)))
function durationText(milliseconds: number) { return (Math.max(0, milliseconds) / 1000).toFixed(1) + ' 秒' }
function executionStatusLabel(status: ExecutionStepStatus) {
  return ({ waiting: '待执行', running: '进行中', done: '已完成', failed: '失败', cancelled: '已取消' } as const)[status]
}
function handleDwsAuthorized() {
  if (dwsStage.value === 'auth') dwsStage.value = normalizedApprovalMode.value === 'autonomous' && !humanAuthorizationRequired ? 'done' : 'confirm'
}

const title = computed(() =>
  isDwsAction.value
    ? props.initialPrompt || '帮我创建一个明天下午 3 点提交经营复盘的钉钉待办'
    : isExpert.value
      ? props.initialPrompt || '你能做什么'
      : props.initialPrompt || (isCitationDemo.value ? '制度查询时，如何结合知识库和公开网页？' : '获取下我钉钉上相关信息'),
)
const expertName = computed(() =>
  isExpert.value ? selectedAgent.value?.name || '业务专家' : dailyAssistant.name,
)
const placeholder = computed(() =>
  isExpert.value
    ? `向${expertName.value}补充任务要求，输入 @ 可切换专家…`
    : '描述你的任务，输入 @ 可快捷选择专家…',
)

function preparePlan() {
  if (!isExpert.value || !['waiting','awaiting_clarification'].includes(planStatus.value)) return
  if (normalizedApprovalMode.value === 'autonomous') {
    clarifications.value = clarifications.value.map(item => item.required || item.value.trim() ? { ...item } : {
      ...item, value: item.defaultValid === true && typeof item.defaultValue === 'string' ? item.defaultValue : '',
    })
    if (missingRequiredClarification.value) { planStatus.value = 'awaiting_clarification'; return }
    clarificationConfirmed.value = true
    planStatus.value = 'waiting'
    beginExecution()
    return
  }
  planStatus.value = clarifications.value.length && !clarificationConfirmed.value ? 'awaiting_clarification' : 'waiting'
}
function confirmClarifications() {
  if (planStatus.value !== 'awaiting_clarification' || missingRequiredClarification.value) return
  clarificationConfirmed.value = true
  planStatus.value = 'waiting'
  preparePlan()
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
  if (!['waiting','failed','awaiting_confirmation'].includes(planStatus.value) || followUpRunning.value || followUpBlocked.value || missingRequiredClarification.value) return
  if (authorizationRequired && !authorizationConfirmed.value) {
    if (normalizedApprovalMode.value === 'autonomous' && !humanAuthorizationRequired) authorizationConfirmed.value = true
    else { planStatus.value = 'awaiting_confirmation'; return }
  }
  executionStartedAt.value = startedAt
  executionFinishedAt.value = null
  planStatus.value = 'running'
  scheduleExecution()
}
function runPlan() {
  if (!['waiting'].includes(planStatus.value) || followUpRunning.value || followUpBlocked.value) return
  if (prompt.value.length) {
    ElMessage.info('请先发送修改意见，生成新计划后再执行')
    return
  }
  beginExecution()
}
function stopPlan() {
  if (!['waiting','running','awaiting_clarification','awaiting_confirmation'].includes(planStatus.value)) return
  executionNow.value = Date.now()
  stoppedSteps.value = executionSteps.value.map(step => step.status === 'done' ? { ...step } : { ...step, status: 'cancelled', detail: step.status === 'running' ? '执行已由用户停止' : '本阶段未执行' })
  window.clearTimeout(executionTimer)
  finishExecutionClock()
  executionFinishedAt.value = Date.now()
  planStatus.value = 'cancelled'
}
function confirmAuthorization() {
  if (planStatus.value !== 'awaiting_confirmation') return
  authorizationConfirmed.value = true
  beginExecution(Date.now() - (authorizationKind === '工具调用' ? 0 : 1200))
}
function retryPlan() {
  if (planStatus.value !== 'failed' || followUpRunning.value || followUpBlocked.value) return
  if (prompt.value.length) { ElMessage.info('请先发送修改意见，或清空草稿后重试'); return }
  failedAttempts.value.push({ version: executionAttempt.value, steps: executionSteps.value.map(step => ({ ...step })) })
  executionAttempt.value++
  beginExecution()
}
function choosePptTemplate(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!/\.pptx?$/i.test(file.name)) { ElMessage.error('仅支持上传 PPT 或 PPTX 模板'); return }
  if (file.size > 50 * 1024 * 1024) { ElMessage.error('PPT 模板不能超过 50MB'); return }
  uploadedTemplateName.value = file.name
  officialTemplate.value = true
  draftOfficialTemplate.value = true
  templateHintDismissed.value = false
  ElMessage.success('PPT 模板已交给模板套用技能')
  ;(event.target as HTMLInputElement).value = ''
}
function clearPptTemplate() {
  uploadedTemplateName.value = ''
  officialTemplate.value = false
  draftOfficialTemplate.value = false
}function retryArtifact(useOrdinary = false) {
  if (artifactRetrying.value) return
  if (useOrdinary) officialTemplate.value=false
  artifactRetrying.value=true
  executionTimer=window.setTimeout(()=>{artifactFailed.value=false;artifactRetrying.value=false},700)
}
function modifyPlan() {
  nextTick(() => input.value?.focus())
}
function submitFollowUp() {
  if (!prompt.value.trim() || ['running','awaiting_clarification','awaiting_confirmation','unknown'].includes(planStatus.value) || followUpRunning.value || followUpBlocked.value) return
  const targetExpertId = pendingExpertId.value || (isExpert.value ? props.agentId || selectedAgent.value?.id : '')
  const targetExpert = targetExpertId ? agents.find(agent => agent.id === targetExpertId) : null
  if (targetExpertId && (!targetExpert || !isExpertAvailable(targetExpert))) { ElMessage.error('该专家暂不可用，请重新选择'); return }
  const text = prompt.value.trim()
  const choice = draftOfficialTemplate.value
  followUps.value.push({ id: followUps.value.length+1, text, expert: targetExpert?.name || expertName.value, expertId: targetExpertId || '', usesExpert: !!targetExpertId || isExpert.value, time: new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date()), templateLabel: choice ? templateLabel.value : '普通模板' })
  if (targetExpertId) recordExpertSuccessfulSend(targetExpertId)
  templateHintDismissed.value = false
  draftOfficialTemplate.value = false
  prompt.value = ''
  if (planStatus.value === 'waiting') planStatus.value='superseded'
}

function openDwsAuthorization() {
  window.open('about:blank', 'dingtalk-oauth', 'width=520,height=720')
}
function insertQuickPrompt(text: string) {
  const el = input.value
  const start = el?.selectionStart ?? prompt.value.length
  const end = el?.selectionEnd ?? prompt.value.length
  prompt.value = `${prompt.value.slice(0, start)}${text}${prompt.value.slice(end)}`
  nextTick(() => el?.focus())
}
function useSuggestion(text: string) {
  prompt.value = text
  submitFollowUp()
  contextSuggestions.value = []
}
function savePrototypePlan() {
  if (!props.persistState) return
  writePrototypeChatValue('plan:' + props.sessionId, {
    status: planStatus.value,
    startedAt: executionStartedAt.value, finishedAt: executionFinishedAt.value,
    attempt: executionAttempt.value, failedAttempts: failedAttempts.value,
    stoppedSteps: stoppedSteps.value, draft: prompt.value, followUps: followUps.value,
    selectedExpertId: pendingExpertId.value, officialTemplate: officialTemplate.value, dwsStage: dwsStage.value,
    clarifications: clarifications.value, clarificationConfirmed: clarificationConfirmed.value, authorizationConfirmed: authorizationConfirmed.value,
  } satisfies PrototypePlanSnapshot)
}
watch([planStatus, clarifications, clarificationConfirmed, authorizationConfirmed, executionStartedAt, executionFinishedAt, executionAttempt, failedAttempts, stoppedSteps, prompt, followUps, pendingExpertId, officialTemplate, dwsStage], savePrototypePlan, { deep: true, flush: 'sync' })
onMounted(() => {
  if (isExpert.value && planStatus.value === 'running') {
    if (executionStartedAt.value === null) executionStartedAt.value = Date.now()
    scheduleExecution()
  } else if (planStatus.value === 'awaiting_confirmation' && normalizedApprovalMode.value === 'autonomous' && authorizationRequired && !humanAuthorizationRequired) beginExecution()
  else preparePlan()
  savePrototypePlan()
})
onBeforeUnmount(() => {
  savePrototypePlan()
  window.clearTimeout(executionTimer)
  finishExecutionClock()
})
</script>

<template>
  <section class="detail-shell" :class="{ 'detail-shell--preview': citationPanelOpen }">
    <div class="conversation" role="log" data-testid="conversation-log" aria-label="会话内容">
      <div class="conversation-inner">
        <div class="user-row">
          <div class="user-message">
            <div class="user-bubble">{{ title }}</div>
            <time class="message-time" :title="fixtureUserTime" data-testid="user-message-time">{{ fixtureUserTime }}</time>
          </div>
        </div>
        <article class="answer">
          <header class="answer-agent">
            <img
              :src="isExpert ? (selectedAgent?.avatarUrl || `${assetBase}assets/production-home/mascot-xiaoma.png`) : `${assetBase}assets/production-home/mascot-xiaoma.png`"
              alt=""
            />
            <div>
              <strong>{{ expertName }}</strong
              ><span
                >{{ isExpert ? selectedAgent?.developerDepartment || '业务专家' : '通用助手 · 默认智能体' }}</span
              >
            </div>
          </header>
          <div class="process-summary" :class="processTone">
            <button
              type="button"
              data-testid="execution-process-trigger"
              :aria-expanded="processOpen"
              @click="processOpen = !processOpen"
            >
              <span class="process-title"><i />{{ processHeadline }}</span>
              <span class="process-meta"><template v-if="executionAttempt > 1">第 {{ executionAttempt }} 次执行 · </template>{{ completedExecutionSteps }}/{{ executionSteps.length }} 个阶段</span>
              <ChevronDown :size="15" :class="{ open: processOpen }" />
            </button>
          </div>
          <section v-if="processOpen" class="process-overview" data-testid="execution-process">
            <header>
              <div><strong>处理过程</strong><small>查看本轮工具调用与处理摘要</small></div>
            </header>
            <div class="tool-call-row" :class="activeExecutionStep.status">
              <span class="tool-call-icon"><Wrench :size="15" /></span>
              <div><strong>工具调用 · {{ toolCallLabel }}</strong><small>{{ activeExecutionStep.detail }}</small></div>
              <span>{{ executionStatusLabel(activeExecutionStep.status) }} · {{ activeExecutionStep.duration }}</span>
            </div>
            <div class="ai-reply-row"><span>AI 回复</span><p>{{ planStatus === 'done' ? '已完成处理并生成回复，详细结果见下方。' : planStatus === 'running' ? '正在处理，完成后将在这里给出结果。' : '等待当前步骤完成后生成回复。' }}</p></div>
            <section v-if="failedAttempts.length" class="process-attempts" data-testid="execution-attempt-history">
              <h3>历史执行记录</h3>
              <article v-for="attempt in failedAttempts" :key="attempt.version">
                <header>第 {{ attempt.version }} 次执行 · 执行失败</header>
                <p v-for="step in attempt.steps.filter(item => item.status === 'failed')" :key="step.title"><strong>{{ step.title }}</strong><span>{{ step.detail }}</span><time>{{ step.duration }}</time></p>
              </article>
            </section>
          </section>
          <template v-if="isDwsAction">
            <TaskStallReminder v-if="normalizedApprovalMode === 'autonomous'" :task-id="sessionId" :title="title" :agent-name="expertName" :detail-url="'/PORTL/chat/' + encodeURIComponent(sessionId)" :state="dwsStage === 'auth' ? 'dws_auth' : dwsStage === 'confirm' ? 'awaiting_confirmation' : dwsStage" :progress-key="dwsStage" />
            <p>创建待办属于钉钉写操作。首次使用需要本人完成账号授权；自主执行可在授权完成后自动同意本轮操作确认。</p>

            <section
              v-if="dwsStage === 'auth'"
              class="dws-card dws-auth-card"
              data-testid="dws-auth-card"
            >
              <span class="dws-card__icon"><ShieldCheck :size="22" /></span>
              <div class="dws-card__body">
                <h2>需要授权钉钉账号</h2>
                <p>
                  授权后可在当前账号权限范围内使用日程、待办、消息和文档能力。授权状态最长保持 30
                  天。
                </p>
                <small>仅在执行操作时使用授权，不会把凭据发送给模型。</small>
                <footer>
                  <button
                    type="button"
                    class="secondary"
                    aria-label="去授权钉钉账号"
                    @click="openDwsAuthorization"
                  >
                    去授权<ExternalLink :size="14" />
                  </button>
                  <button
                    type="button"
                    class="primary"
                    aria-label="已完成钉钉授权"
                    @click="handleDwsAuthorized"
                  >
                    已授权
                  </button>
                </footer>
              </div>
            </section>

            <template v-else>
              <div v-if="dwsStage !== 'cancelled'" class="dws-success" data-testid="dws-auth-success">
                <CheckCircle2 :size="16" />{{ dwsStage === 'done' ? normalizedApprovalMode === 'autonomous' && !humanAuthorizationRequired ? '账号已授权，已按自主执行规则同意本轮操作。' : '账号已授权，操作已由你确认。' : '账号授权成功，操作仍需你确认。' }}
              </div>
              <section
                v-if="dwsStage === 'confirm'"
                class="dws-card dws-confirm-card"
                data-testid="dws-confirm-card"
              >
                <span class="dws-card__icon is-warning"><CalendarCheck :size="22" /></span>
                <div class="dws-card__body">
                  <h2>确认创建待办</h2>
                  <dl>
                    <dt>待办名称</dt>
                    <dd>提交经营复盘</dd>
                    <dt>执行人</dt>
                    <dd>朝暮（我）</dd>
                    <dt>截止时间</dt>
                    <dd>明天 15:00</dd>
                    <dt>优先级</dt>
                    <dd>中</dd>
                  </dl>
                  <p class="dws-warning">正式使用时，确认后才会创建待办并同步到待办中心；本页仅演示。</p>
                  <footer>
                    <button type="button" class="secondary" @click="dwsStage = 'cancelled'">取消</button
                    ><button
                      type="button"
                      class="primary"
                      aria-label="确认执行钉钉操作"
                      @click="dwsStage = 'done'"
                    >
                      确认执行
                    </button>
                  </footer>
                </div>
              </section>
              <section v-else-if="dwsStage === 'done'" class="dws-result" data-testid="dws-result-card">
                <CheckCircle2 :size="22" />
                <div>
                  <strong>待办创建成功</strong>
                  <p>已同步至钉钉与天马智擎待办中心，截止时间：明天 15:00。</p>
                </div>
              </section>
              <section v-else class="artifact-feedback" role="status"><strong>操作已取消</strong><p>待办尚未创建。如需继续，请重新发起请求。</p></section>
            </template>
          </template>
          <template v-else-if="isExpert">
            <p>
              已为「{{
                expertName
              }}」生成执行计划，将围绕你的任务整理资料并形成结果。
            </p>
            <section class="plan-card" data-testid="expert-auto-plan">
              <header>
                <div>
                  <span class="plan-icon"><Timer :size="19" /></span>
                  <div>
                    <strong>{{ planTitle }}</strong>
                    <p v-if="planStatus === 'waiting'">
                      默认权限：请确认计划后点击「立即执行」。所有授权仍需人工确认。
                    </p>
                    <p v-else-if="planStatus === 'awaiting_clarification'">{{ missingRequiredClarification ? '缺少必填信息，补充后才能执行。' : '请确认非必填信息，可保留空值。' }}</p>
                    <p v-else-if="planStatus === 'running'">
                      {{ normalizedApprovalMode === 'autonomous' ? '正在自主执行，已自动同意可代办的执行审批。' : '正在模拟执行，审批授权按现有流程确认。' }}
                    </p>
                    <p v-else-if="planStatus === 'awaiting_confirmation'">{{ authorizationKind }}前需要你确认，本次操作尚未执行。</p>
                    <p v-else-if="planStatus === 'unknown'">执行结果尚未核实，不能重复启动或显示成功。</p>
                    <p v-else-if="planStatus === 'failed'">资料读取暂时失败；保留本轮计划，可重试执行。</p>
                    <p v-else-if="planStatus === 'superseded'">已被新计划替代，历史内容继续保留</p><p v-else-if="planStatus === 'cancelled'">已取消；重新执行请发送新请求</p><p v-else>模拟执行完成，以下展示文件产物的呈现方式</p>
                  </div>
                </div>
                <span class="plan-state" :class="planStatus">{{ planStateLabel }}</span>
              </header>
              <button type="button" class="plan-line" data-testid="expert-plan-one-line" :aria-expanded="fullPlanOpen" aria-label="查看完整执行计划" @click="fullPlanOpen = !fullPlanOpen"><span class="plan-line-count">3 项</span><strong>整理资料 → 形成结论 → 生成报告与 PPTX</strong><small>PPT 模板：{{ templateLabel }}</small><ChevronDown :size="14" /></button>
              <ol v-if="fullPlanOpen" class="plan-details" data-testid="expert-plan-details">
                <li>整理本轮任务所需的已授权资料，确认分析范围。</li>
                <li>分析资料并形成结论，整理报告内容与演示结构。</li>
                <li>生成报告与 PPTX；使用所选模板「{{ templateLabel }}」。</li>
              </ol>
              <footer>
                <button v-if="planStatus === 'waiting'" type="button" @click="modifyPlan">
                  <CirclePause :size="15" />修改计划</button
                ><button
                  v-if="planStatus === 'waiting'"
                  type="button"
                  :disabled="!!prompt.length"
                  class="run-now"
                  @click="runPlan"
                >
                  <Play :size="15" />立即执行
                </button><button v-if="planStatus === 'running'" type="button" @click="stopPlan">停止执行</button>
                <template v-if="planStatus === 'awaiting_confirmation'"><button type="button" @click="stopPlan">拒绝并停止</button><button type="button" class="run-now" @click="confirmAuthorization">确认操作</button></template>
                <button v-if="planStatus === 'failed'" type="button" class="run-now" @click="retryPlan">重试执行</button>
              </footer>
            </section>
            <TaskStallReminder v-if="normalizedApprovalMode === 'autonomous'" :key="sessionId" :task-id="'task-' + sessionId" :title="title" :agent-name="expertName" :detail-url="'/PORTL/chat/' + encodeURIComponent(sessionId)" :executed-at="new Date(executionStartedAt ?? Date.now()).toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' })" :failure-reason="planStatus === 'failed' ? '资料读取失败，请重试或检查数据源权限。' : ''" :state="planStatus" :progress-key="planStatus + '-' + completedExecutionSteps" :demo-waiting="demoQuery.get('reminderDemo') === '1'" />
            <section v-if="planStatus === 'awaiting_clarification'" class="clarification-card" data-testid="clarification-card">
              <strong>请补充任务信息</strong>
              <label v-for="item in clarifications.filter(item => normalizedApprovalMode === 'default' || item.required)" :key="item.id">
                <span>{{ item.label }}（{{ item.required ? '必填' : '非必填' }}）</span>
                <input v-model="item.value" data-testid="clarification-input" :aria-label="item.label" :placeholder="item.defaultValid && item.defaultValue ? '默认值：' + item.defaultValue : '可填写任务信息'" />
              </label>
              <p>必填信息必须补充；非必填信息可留空，不会替你编造。</p>
              <button type="button" data-testid="confirm-clarifications" :disabled="missingRequiredClarification" @click="confirmClarifications">确认补充</button>
            </section>
            <p v-else-if="skippedClarifications.length && normalizedApprovalMode === 'autonomous'" class="clarification-summary" data-testid="clarification-summary">非必填澄清已跳过：<span v-for="item in skippedClarifications" :key="item.id">{{ item.label }}：{{ item.value || '空' }}；</span></p>
            <section v-if="planStatus === 'awaiting_confirmation'" class="artifact-feedback" role="status"><strong>待确认操作：{{ authorizationKind }}</strong><p>{{ authorizationKind === '工具调用' ? '工具：读取已授权资料（演示） · 范围：本轮任务。' : '对象：本轮任务报告 · 范围：外部收件人（演示） · 权限：仅查看。' }}确认后才继续；原型不会实际调用或发送。</p></section>
            <h2 id="anchor-data">阶段状态</h2>
            <p>
              {{
                planStatus === 'done'
                  ? '模拟任务已完成。正式结果需由执行服务返回，引用与文件仅展示真实生成的内容。'
                  : '任务尚未完成，完成前不展示可下载文件。'
              }}
            </p>
            <template v-if="planStatus === 'done'"
              ><h2 id="anchor-report">文件呈现示例</h2>
              <div v-if="artifactFailed" class="artifact-feedback" role="alert"><strong>{{ officialTemplate ? '官方模板套用失败' : '文件校验失败' }}</strong><p>{{ officialTemplate ? '版式校验未通过，自动重试后仍未完成。请重试或选择普通模板。' : '生成文件尚未通过完整性检查，暂不提供预览或下载。' }}</p><button type="button" :disabled="artifactRetrying" @click="retryArtifact()">{{ artifactRetrying ? '正在重试…' : '重试生成' }}</button><button v-if="officialTemplate" type="button" :disabled="artifactRetrying" @click="retryArtifact(true)">改用普通模板</button></div>
              <div v-else class="deliverables">
                <article>
                  <span class="file-icon blue"><FileText :size="20" /></span>
                  <div>
                    <strong>任务报告.docx</strong
                    ><small>规范标题、结论摘要、数据表与来源脚注</small>
                  </div>
                  <button type="button" disabled title="演示文件尚未真实生成">
                    <Download :size="15" />示例文件
                  </button>
                </article>
                <article>
                  <span class="file-icon green"><FileSpreadsheet :size="20" /></span>
                  <div>
                    <strong>任务明细.xlsx</strong><small>筛选、冻结表头、统一数值与日期格式</small>
                  </div>
                  <button type="button" disabled title="演示文件尚未真实生成">
                    <Download :size="15" />示例文件
                  </button>
                </article>
                <article>
                  <span class="file-icon orange"><Presentation :size="20" /></span>
                  <div>
                    <strong>任务汇报.pptx</strong><small>模板：{{ templateLabel }}</small>
                  </div>
                  <button type="button" disabled title="演示文件尚未真实生成">
                    <Download :size="15" />示例文件
                  </button>
                </article>
                <article><span class="file-icon blue"><FileText :size="20" /></span><div><strong>任务报告.pdf</strong><small>分页与预览一致、字体完整、来源链接可访问</small></div><button type="button" disabled title="演示文件尚未真实生成"><Download :size="15" />示例文件</button></article>
              </div>
            </template>

          </template>
          <template v-else>
            <AnswerCitations ref="citationExplorer" :answer-id="`answer-${sessionId}`" :paragraphs="answerParagraphs" :sources="answerSources" :load-preview="loadCitationPreview" :demo="isCitationDemo" @panel-change="onCitationPanel">
              <template v-if="!isCitationDemo">
            <h2 id="anchor-calendar">今日日程</h2>
            <table>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>主题</th>
                  <th>参与人</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>11:30–12:00</td>
                  <td>项目进度沟通</td>
                  <td>清晖、朝暮</td>
                </tr>
                <tr>
                  <td>15:00–16:00</td>
                  <td>经营数据复盘</td>
                  <td>业务运营组</td>
                </tr>
              </tbody>
            </table>
            <h2 id="anchor-todo">待办事项</h2>
            <table>
              <thead>
                <tr>
                  <th>状态</th>
                  <th>待办</th>
                  <th>截止时间</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>进行中</td>
                  <td>确认本周重点货号清单</td>
                  <td>今天 18:00</td>
                </tr>
                <tr>
                  <td>未开始</td>
                  <td>提交经营复盘报告</td>
                  <td>明天 12:00</td>
                </tr>
              </tbody>
            </table>
            <h2 id="anchor-note">补充说明</h2>
            <p>以上内容来自当前授权范围内的钉钉数据。涉及重要安排时，建议再次确认。</p>
              </template>
            </AnswerCitations>
          </template>

          <p
            v-if="(!isDwsAction && !isExpert) || dwsStage === 'done' || planStatus === 'done'"
            class="complete"
          >
            {{ isExpert ? '模拟完成' : '全部完成' }} · 处理用时 {{ processingDuration }}
          </p>
          <time class="message-time" :title="fixtureAnswerTime" data-testid="assistant-message-time">{{ fixtureAnswerTime }}</time>
          <div class="answer-actions">
            <button type="button" aria-label="复制回答" title="复制"><Copy :size="16" /></button>
            <button type="button" aria-label="引用回答" title="引用"><Link2 :size="16" /></button>
            <button type="button" aria-label="分享回答" title="分享" @click="emit('share')">
              <Share2 :size="16" />
            </button>
          </div>
          <div
            v-if="!isCitationDemo && !isExpert && (!isDwsAction || dwsStage === 'done') && contextSuggestions.length"
            class="context-suggestions"
            data-testid="context-suggestions"
          >
            <span>你还可以继续问</span>
            <button
              v-for="item in contextSuggestions"
              :key="item"
              type="button"
              @click="useSuggestion(item)"
            >
              {{ item }}
            </button>
          </div>
        </article>
        <template v-for="turn in followUps" :key="turn.id">
          <div class="user-row sent-follow-up"><div class="user-message"><div class="user-bubble" data-testid="sent-follow-up">{{turn.text}}</div><time class="message-time" :title="turn.time">{{turn.time}}</time></div></div>
          <p class="follow-up-routing" data-testid="follow-up-expert">本轮专家：{{turn.expert}} · 历史回复保留原专家。</p>
          <FollowUpPlan v-if="turn.usesExpert" :active="turn.id === followUps.at(-1)?.id && !['running','awaiting_clarification','awaiting_confirmation','unknown'].includes(planStatus)" :approval-mode="normalizedApprovalMode" :template-label="turn.templateLabel" :state-key="persistState ? sessionId + ':turn:' + turn.id : undefined" @running="followUpRunning = $event" @blocked="followUpBlocked = $event" @modify="input?.focus()" />
        </template>
      </div>
    </div>

    <aside class="anchor-rail">
      <strong>回答锚点</strong>
      <a v-if="isDwsAction" href="#">钉钉授权</a>
      <a v-if="isDwsAction && dwsStage !== 'auth'" href="#">操作确认</a>
      <a v-if="isExpert && !isDwsAction" href="#anchor-data">阶段状态</a>
      <a v-if="isExpert && planStatus === 'done'" href="#anchor-report">出报告</a>

      <a v-if="!isExpert && !isDwsAction && !isCitationDemo" href="#anchor-calendar">今日日程</a>
      <a v-if="!isExpert && !isDwsAction && !isCitationDemo" href="#anchor-todo">待办事项</a>
      <a v-if="!isExpert && !isDwsAction && !isCitationDemo" href="#anchor-note">补充说明</a>
      <a v-if="isCitationDemo" :href="`#answer-${sessionId}-paragraph-0`">内部知识</a>
      <a v-if="isCitationDemo" :href="`#answer-${sessionId}-paragraph-3`">联网来源</a>
      <button type="button" @click="openTaskFiles">
        <FileText :size="15" />展开任务文件<ChevronRight :size="14" />
      </button>
    </aside>

    <div class="compact-composer">
      <ExpertMentionMenu v-if="mentionOpen" id="detail-expert-mentions" :experts="mentionResults" :total="mentionAllResults.length" :active-index="mentionIndex" :keyword="mentionKeyword" :has-more="mentionHasMore" @load-more="mention.loadMore" @select="mention.choose" @close="mentionOpen = false" @panel-press="mention.onPanelPress" />
      <div v-if="(isExpert || pendingExpertId) && !mentionOpen" class="template-tip ppt-skill-card" data-testid="ppt-template-skill">
        <span class="skill-icon"><Presentation :size="17" /></span>
        <span><strong>PPT 模板（技能待选型）</strong>{{ uploadedTemplateName ? uploadedTemplateName : '上传模板，演示预期入口；实际套用能力待验证' }}</span>
        <input ref="templateInput" class="visually-hidden" type="file" accept=".ppt,.pptx" @change="choosePptTemplate" />
        <button v-if="uploadedTemplateName" type="button" aria-label="移除PPT模板" @click="clearPptTemplate"><X :size="14" /></button>
        <button type="button" :disabled="['running','awaiting_clarification','awaiting_confirmation','unknown'].includes(planStatus)||followUpRunning||followUpBlocked" @click="templateInput?.click()"><UploadCloud :size="14" />{{ uploadedTemplateName ? '更换' : '上传模板' }}</button>
      </div>
      <div class="detail-input-line" data-testid="expert-inline-input">
      <button type="button" class="composer-plus-btn" aria-label="上传文件" title="上传文件">
        <Plus :size="20" />
      </button>
      <div v-if="pendingExpertId || isExpert" class="next-expert-chip" data-testid="selected-expert-chip"><span>{{ pendingExpertName || expertName }}</span><button v-if="pendingExpertId" type="button" aria-label="移除所选专家" @click="pendingExpertId = ''; input?.focus()"><X :size="13" /></button></div>
      <textarea
        @compositionstart="mention.startComposition()"
        @compositionend="mention.endComposition"
        @input="mention.inputChanged" @click="mention.update" @keyup="mention.caretChanged" @select="mention.update" @blur="mention.onBlur" @keydown="detailKeydown"
        role="combobox" aria-autocomplete="list" :aria-expanded="mentionOpen" aria-controls="detail-expert-mentions" :aria-activedescendant="mentionOpen && mentionResults.length ? `detail-expert-mentions-${mentionIndex}` : undefined"
        ref="input"
        v-model="prompt"
        :placeholder="pendingExpertId ? `向${pendingExpertName}描述下条消息的任务…` : placeholder"
        aria-label="继续对话"
        rows="1"
      />
      </div>
      <ApprovalModeControl v-model="normalizedApprovalMode" />
      <button type="button" class="composer-globe-btn" aria-label="联网搜索" title="联网搜索">
        <Globe2 :size="18" />
      </button>
      <button
        type="button"
        aria-label="发送"
        :title="prompt.trim() ? '发送' : '请输入内容'"
        :disabled="!prompt.trim() || ['running', 'awaiting_clarification', 'awaiting_confirmation', 'unknown'].includes(planStatus) || followUpRunning || followUpBlocked"
        @click="submitFollowUp"
      >
        <ArrowUp :size="16" />
      </button>
      <small>内容由 AI 生成，请核实重要信息</small>
    </div>

    <aside v-if="taskFilesOpen" class="task-drawer" data-testid="conversation-task-files">
      <p v-if="isExpert && planStatus !== 'done'">任务尚未完成，暂无可下载文件。</p>
      <header>
        <strong>任务文件（演示）</strong
        ><button
          type="button"
          aria-label="关闭任务文件"
          title="关闭"
          @click="taskFilesOpen = false"
        >
          <X :size="18" />
        </button>
      </header>
      <button
        v-if="!isExpert || planStatus === 'done'"
        class="task-file"
        disabled
        title="原型示例，无真实文件"
      >
        <FileText :size="18" /><span>经营分析结果.html<small>293.6 KB</small></span>
      </button>
      <button
        v-if="!isExpert || planStatus === 'done'"
        class="task-file"
        disabled
        title="原型示例，无真实文件"
      >
        <FileText :size="18" /><span>任务明细.xlsx<small>42.0 KB</small></span>
      </button>
      <button
        v-if="!isExpert || planStatus === 'done'"
        class="task-file"
        disabled
        title="原型示例，无真实文件"
      >
        <Presentation :size="18" /><span
          >任务汇报.pptx<small>{{ templateLabel }} · 示例</small></span
        >
      </button>
    </aside>
  </section>
</template>

<style scoped>
.clarification-card { display:grid; gap:12px; margin:16px 0; padding:16px; border:1px solid #dce8f8; border-radius:12px; background:#f8fbff; }
.clarification-card label { display:grid; gap:6px; font-size:13px; }
.clarification-card input { padding:9px 10px; border:1px solid #d5dce7; border-radius:6px; font:inherit; }
.clarification-card p,.clarification-summary { color:#657181; font-size:12px; }
.clarification-card button { justify-self:end; padding:8px 14px; border:0; border-radius:6px; background:#1677ff; color:white; cursor:pointer; }
.process-attempts { margin-top: 16px; border-top: 1px solid #edf0f3; padding-top: 10px; }
.process-attempts h3 { margin: 0 0 8px; color: #7a8593; font-size: 11px; font-weight: 500; }
.process-attempts article { margin-top: 7px; padding: 10px 12px; border: 1px solid #f0d9d8; border-radius: 8px; background: #fff8f7; }
.process-attempts article header { color: #b34d48; font-size: 12px; }
.process-attempts p { display: flex; align-items: center; gap: 10px; margin: 5px 0 0; color: #8a7572; font-size: 11px; }
.process-attempts p strong { font-weight: 500; }
.process-attempts time { margin-left: auto; white-space: nowrap; }
.artifact-feedback {padding:16px;border:1px solid #f0d7af;border-radius:10px;background:#fff9ef;margin:16px 0;font-size:13px;line-height:1.8;color:#775827}.artifact-feedback p{margin:6px 0}.artifact-feedback button{padding:7px 12px;margin:6px 10px 0 0;border:1px solid #e2c79d;border-radius:6px;background:white;cursor:pointer}
.detail-shell {
  position: relative;
  height: calc(100vh - 57px);
  min-height: 620px;
  background: #fff;
  color: #1a1a1a;
  font-family:
    system-ui,
    -apple-system,
    'Segoe UI',
    'PingFang SC',
    'Microsoft YaHei',
    sans-serif;
}
.conversation {
  height: 100%;
  overflow: auto;
  padding: 36px 215px 142px 52px;
}
.conversation-inner {
  width: min(780px, 100%);
  margin: 0 auto;
}
.user-row {
  display: flex;
  justify-content: flex-end;
  margin: 8px 0 32px;
}
.user-message {
  display: flex;
  max-width: 75%;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}
.user-message time {
  color: #a0a0a0;
  font-size: 10px;
}
.user-bubble {
  padding: 11px 16px;
  border-radius: 14px 4px 14px 14px;
  background: #f3f3f3;
  font-size: 14px;
  line-height: 22px;
}
.answer {
  font-size: 14px;
  line-height: 1.8;
  color: #2c2c2c;
}
.answer-agent {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 12px;
}
.answer-agent img {
  width: 36px;
  height: 36px;
  border: 1px solid #eee;
  border-radius: 10px;
  object-fit: cover;
}
.answer-agent strong,
.answer-agent span {
  display: block;
}
.answer-agent strong {
  font-size: 14px;
}
.answer-agent span {
  font-size: 12px;
  color: #999;
}
.process-summary {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0 0 18px;
  color: #768293;
  font-size: 11px;
}
.process-summary span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.process-summary span svg {
  color: #329068;
}
.process-summary button {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: #376fae;
  font: 11px inherit;
  cursor: pointer;
}
.answer h2 {
  margin: 25px 0 8px;
  font-size: 17px;
}
.answer sup {
  color: #2875d4;
  font-weight: 700;
}
.answer table {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0 18px;
  font-size: 13px;
}
.answer th,
.answer td {
  border: 1px solid #e5e5e5;
  padding: 9px 12px;
  text-align: left;
}
.answer th {
  background: #f7f7f7;
  font-weight: 500;
}
.complete {
  margin-top: 28px;
  color: #888;
}
.answer-actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}
.answer-actions button,
.compact-composer button,
.task-drawer button,
.anchor-rail button {
  border: 0;
  background: transparent;
  cursor: pointer;
}
.answer-actions button {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 7px;
  color: #777;
}
.answer-actions button:hover {
  background: #f4f4f4;
  color: #111;
}
.context-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 14px;
}
.context-suggestions > span {
  width: 100%;
  color: #999;
  font-size: 11px;
}
.context-suggestions button {
  border: 1px solid #dfe4ec;
  border-radius: 18px;
  padding: 7px 12px;
  background: #fff;
  color: #46566f;
  font: 12px inherit;
  cursor: pointer;
}
.context-suggestions button:hover {
  border-color: #8eb3ef;
  background: #f4f8ff;
  color: #2469c8;
}
.sent-follow-up {
  margin-top: 28px;
}
.anchor-rail {
  position: absolute;
  top: 45px;
  right: 24px;
  width: 160px;
  border-left: 1px solid #ededed;
  padding-left: 18px;
}
.anchor-rail strong {
  display: block;
  margin-bottom: 12px;
  font-size: 13px;
}
.anchor-rail a {
  display: block;
  margin: 9px 0;
  color: #888;
  font-size: 12px;
  text-decoration: none;
}
.anchor-rail a:hover {
  color: #111;
}
.anchor-rail button {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 22px;
  padding: 8px 0;
  font-size: 12px;
  color: #555;
}
.compact-composer {
  position: absolute;
  left: 50%;
  bottom: 16px;
  width: min(760px, calc(100% - 300px));
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: end;
  gap: 5px;
  padding: 12px 12px 9px;
  border: 1px solid #ddd;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
}
.compact-composer textarea {
  height: 42px;
  resize: none;
  border: 0;
  outline: 0;
  font: 14px/22px inherit;
}
.compact-composer button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
}
.compact-composer > button:last-of-type {
  background: #111;
  color: #fff;
}
.compact-composer button:disabled {
  background: #ddd;
}
.compact-composer small {
  grid-column: 1/-1;
  text-align: center;
  color: #aaa;
  font-size: 10px;
}
.task-drawer {
  position: absolute;
  inset: 0 0 0 auto;
  z-index: 20;
  width: 380px;
  border-left: 1px solid #e8e8e8;
  background: #fff;
  box-shadow: -8px 0 30px rgba(0, 0, 0, 0.05);
  padding: 0 20px;
}
.task-drawer header {
  display: flex;
  height: 64px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
}
.task-drawer header button {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 7px;
}
.task-file {
  display: flex !important;
  width: 100%;
  align-items: center;
  gap: 10px;
  padding: 14px 4px !important;
  border-bottom: 1px solid #f0f0f0 !important;
  text-align: left;
}
.task-file span,
.task-file small {
  display: block;
}
.task-file small {
  margin-top: 2px;
  color: #aaa;
}
@media (max-width: 900px) {
  .conversation {
    padding: 28px 20px 150px;
  }
  .anchor-rail {
    display: none;
  }
  .compact-composer {
    width: calc(100% - 32px);
  }
}
.plan-card {
  margin: 18px 0;
  border: 1px solid #dbe6f5;
  border-radius: 14px;
  background: #fbfdff;
  padding: 17px;
}
.plan-card > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.plan-card > header > div {
  display: flex;
  align-items: center;
  gap: 10px;
}
.plan-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 10px;
  background: #e9f3ff;
  color: #1973da;
}
.plan-card header strong,
.plan-card header p {
  display: block;
  margin: 0;
}
.plan-card header p {
  color: #758397;
  font-size: 11px;
}
.plan-state {
  border-radius: 12px;
  background: #fff3dc;
  padding: 3px 8px;
  color: #b87310;
  font-size: 11px;
}
.plan-state.running {
  background: #eaf7ef;
  color: #248157;
}
.plan-state.cancelled {
  background: #f0f1f3;
  color: #777;
}
.plan-card ol {
  margin: 15px 0;
  padding: 0;
  list-style: none;
}
.plan-card li {
  display: grid;
  grid-template-columns: 27px 1fr auto;
  align-items: center;
  gap: 10px;
  border-top: 1px solid #edf0f4;
  padding: 10px 0;
}
.plan-card li > span {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 50%;
  background: #f0f4f9;
  color: #52708f;
  font-size: 11px;
}
.plan-card li strong,
.plan-card li small {
  display: block;
}
.plan-card li strong {
  font-size: 12px;
}
.plan-card li small,
.plan-card li em {
  color: #8b96a4;
  font-size: 10px;
  font-style: normal;
}
.plan-card footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.plan-card footer button {
  display: flex;
  align-items: center;
  gap: 5px;
  border: 1px solid #dce2e9;
  border-radius: 8px;
  background: #fff;
  padding: 7px 11px;
  color: #536174;
  font: 12px inherit;
  cursor: pointer;
}
.plan-card footer .run-now {
  border-color: #1677ff;
  background: #1677ff;
  color: #fff;
}
.deliverables {
  display: grid;
  gap: 8px;
}
.deliverables article {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #e6e9ed;
  border-radius: 10px;
  padding: 11px 12px;
}
.file-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 9px;
}
.file-icon.blue {
  background: #eaf3ff;
  color: #2678d8;
}
.file-icon.green {
  background: #eaf8f0;
  color: #25855b;
}
.file-icon.orange {
  background: #fff1e8;
  color: #d66b25;
}
.deliverables article > div {
  min-width: 0;
  flex: 1;
}
.deliverables strong,
.deliverables small {
  display: block;
}
.deliverables strong {
  font-size: 12px;
}
.deliverables small {
  color: #9099a5;
  font-size: 10px;
}
.deliverables button {
  display: flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: #2875d4;
  font: 11px inherit;
  cursor: pointer;
}
.template-tip {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 9px;
  border-radius: 9px;
  background: #fff7ed;
  padding: 10px 12px;
  color: #b86626;
}
.template-tip span {
  min-width: 0;
  flex: 1;
  color: #7b6656;
  font-size: 11px;
}
.template-tip strong {
  color: #9c561f;
}
.template-tip button {
  border: 0;
  background: transparent;
  color: #b86626;
  font: 11px inherit;
  cursor: pointer;
}
.source-panel {
  margin-top: 22px;
  border: 1px solid #e5e8ed;
  border-radius: 12px;
  padding: 14px 15px;
}
.source-panel > header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
.source-panel > header strong {
  font-size: 13px;
}
.source-panel > header span {
  color: #929aa5;
  font-size: 11px;
}
.source-panel > div {
  display: grid;
  grid-template-columns: 82px 1fr;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.source-type {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 6px;
  padding: 5px 7px;
  font-size: 10px;
}
.source-type.knowledge {
  background: #edf5ff;
  color: #2874cf;
}
.source-type.web {
  background: #edf8f2;
  color: #267f58;
}
.source-panel > div > button {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 8px;
  background: #f8f9fa;
  padding: 8px 9px;
  color: #556273;
  text-align: left;
  cursor: pointer;
}
.source-panel button b {
  color: #3578c7;
}
.source-panel button span {
  min-width: 0;
  flex: 1;
}
.source-panel button strong,
.source-panel button small {
  display: block;
}
.source-panel button strong {
  font-size: 11px;
}
.source-panel button small {
  color: #9199a4;
  font-size: 10px;
}
.dws-card {
  display: flex;
  gap: 14px;
  margin: 16px 0;
  border: 1px solid #dce8f8;
  border-radius: 14px;
  padding: 16px 18px;
  background: #f8fbff;
  line-height: 1.5;
}
.dws-card__icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  place-items: center;
  border-radius: 11px;
  background: #e8f2ff;
  color: #1677ff;
}
.dws-card__icon.is-warning {
  background: #fff3dc;
  color: #c87911;
}
.dws-card__body {
  min-width: 0;
  flex: 1;
}
.dws-card__body h2 {
  margin: 0;
  font-size: 16px;
}
.dws-card__body p {
  margin: 6px 0;
  color: #596579;
}
.dws-card__body > small {
  color: #8b96a8;
}
.dws-card footer {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 12px;
}
.dws-card footer button {
  display: inline-flex;
  height: 34px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid #d5dce7;
  border-radius: 8px;
  padding: 0 15px;
  background: #fff;
  color: #465366;
  font: 13px inherit;
}
.dws-card footer button.primary {
  border-color: #1677ff;
  background: #1677ff;
  color: #fff;
}
.dws-success {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 12px 0;
  color: #238653;
  font-size: 13px;
}
.dws-card dl {
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 6px 12px;
  margin: 12px 0;
  font-size: 13px;
}
.dws-card dt {
  color: #8a93a2;
}
.dws-card dd {
  margin: 0;
  color: #333;
}
.dws-card .dws-warning {
  border-top: 1px solid #eadfcd;
  padding-top: 9px;
  color: #a86511;
  font-size: 12px;
}
.dws-result {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 18px 0;
  border: 1px solid #cfe9d9;
  border-radius: 13px;
  padding: 17px;
  background: #f4fbf6;
  color: #238653;
}
.dws-result strong {
  display: block;
  color: #246b43;
}
.dws-result p {
  margin: 3px 0 0;
  color: #678272;
  font-size: 13px;
}
.context-suggestions {
  width: min(520px, 100%);
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.context-suggestions button {
  border: 0;
  border-radius: 12px;
  padding: 9px 14px;
  background: #f5f5f5;
  color: #30343a;
  text-align: left;
}
.context-suggestions button::after {
  margin-left: 10px;
  content: '→';
}
.context-suggestions button:hover {
  background: #eceff3;
  color: #111;
}
.process-overview {
  padding: 12px 16px;
  background: #f7f8fa;
  border-radius: 8px;
  margin-bottom: 18px;
  font-size: 13px;
}
.process-overview p {
  margin: 4px 0;
}
.process-overview small {
  color: #6b7280;
}
.process-summary {
  margin: 0 0 12px;
}
.process-summary > button {
  display: flex;
  width: 100%;
  height: 38px;
  align-items: center;
  gap: 9px;
  box-sizing: border-box;
  margin: 0;
  border: 1px solid #e5e8ed;
  border-radius: 10px;
  background: #fafbfc;
  padding: 0 12px;
  color: #596579;
  font: 12px inherit;
  cursor: pointer;
}
.process-summary > button:hover { border-color: #d6dce4; background: #f6f8fa; }
.process-title { display: inline-flex; align-items: center; gap: 7px; color: #394453; font-weight: 600; }
.process-title i { width: 7px; height: 7px; border-radius: 50%; background: #8c98a7; }
.process-summary.done .process-title i { background: #2d966a; }
.process-summary.running .process-title i { background: #2b78d0; box-shadow: 0 0 0 4px #e5f0fc; }
.process-summary.failed .process-title i { background: #d64b45; }
.process-meta { margin-left: auto; color: #8c95a1; }
.process-summary svg { color: #7f8996; transition: transform .16s ease; }
.process-summary svg.open { transform: rotate(180deg); }
.process-overview {
  margin: 0 0 18px;
  border: 1px solid #e4e8ed;
  border-radius: 12px;
  background: #fff;
  padding: 14px 16px 8px;
  font-size: 12px;
}
.process-overview > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding-bottom: 11px; border-bottom: 1px solid #eef0f3; }
.process-overview > header strong,
.process-overview > header small { display: block; }
.process-overview > header strong { color: #303947; font-size: 13px; }
.process-overview > header small { margin-top: 2px; color: #8b94a0; }
.process-overview > header > span { border-radius: 12px; background: #f1f3f5; padding: 3px 8px; color: #8a929d; font-size: 9px; white-space: nowrap; }
.process-overview ol { margin: 0; padding: 0; list-style: none; }
.process-overview li { position: relative; display: grid; grid-template-columns: 25px 1fr auto auto; align-items: center; gap: 10px; min-height: 54px; border-bottom: 1px solid #f1f2f4; }
.process-overview li:last-child { border-bottom: 0; }
.process-step-index { display: grid; width: 20px; height: 20px; place-items: center; border-radius: 50%; background: #eef1f4; color: #7c8794; font-size: 10px; }
.process-overview li.done .process-step-index { background: #e9f7ef; color: #25845c; }
.process-overview li.running .process-step-index { background: #e8f2ff; color: #276fc5; }
.process-overview li.failed .process-step-index { background: #fff0ee; color: #c84a43; }
.process-overview li > div:nth-child(2) strong,
.process-overview li > div:nth-child(2) small { display: block; }
.process-overview li > div:nth-child(2) strong { color: #364150; font-size: 12px; }
.process-overview li > div:nth-child(2) small { margin-top: 1px; color: #8c95a0; font-size: 10px; }
.process-step-state { min-width: 54px; text-align: right; }
.process-step-state span,
.process-step-state time { display: block; }
.process-step-state span { color: #657181; font-size: 10px; }
.process-step-state time { margin-top: 1px; color: #9ca3ad; font-size: 9px; }
.process-overview li.failed .process-step-state span { color: #c84a43; }
.process-overview li.running .process-step-state span { color: #276fc5; }
.process-overview li > button { border: 0; border-radius: 7px; background: #edf4fd; padding: 5px 8px; color: #276fc5; font: 10px inherit; cursor: pointer; }
button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.compact-composer .template-tip{position:absolute;bottom:calc(100% + 10px);left:0;right:0;margin:0;box-shadow:0 4px 16px #00000008}.compact-composer .template-tip button{width:auto;flex-shrink:0}.compact-composer .template-tip button:last-child{position:static}
.detail-input-line{display:flex;align-items:center;gap:6px;min-width:0}.detail-input-line textarea{min-width:0;width:0;flex:1;padding-top:4px}.composer-plus-btn,.composer-globe-btn{flex-shrink:0;color:#666;transition:color .15s}.composer-plus-btn:hover,.composer-globe-btn:hover{color:#111}.next-expert-chip{display:flex;flex:0 1 auto;max-width:45%;align-items:center;gap:6px;white-space:nowrap;border-radius:6px;background:#edf5ff;color:#246ec9;padding:4px 8px;font-size:12px}.next-expert-chip span{overflow:hidden;text-overflow:ellipsis}.next-expert-chip button{width:18px!important;height:18px!important;display:grid;place-items:center;background:transparent!important;color:inherit!important}.follow-up-routing{padding:14px;background:#f4f7fb;border-radius:9px;font-size:13px;color:#567}

@media(min-width:1100px){
  .detail-shell--preview .conversation{width:calc(100% - 430px);padding-right:24px;padding-left:36px;box-sizing:border-box}
  .detail-shell--preview .compact-composer{left:calc((100% - 430px)/2);width:min(760px,calc(100% - 500px));box-sizing:border-box}
}
.detail-shell--preview .anchor-rail{display:none}
.plan-line{width:100%;background:transparent;text-align:left;cursor:pointer;display:grid;grid-template-columns:auto minmax(0,1fr) auto 14px;align-items:center;gap:9px;margin:14px 0;border-top:1px solid #edf0f4;border-bottom:1px solid #edf0f4;padding:10px 0;white-space:nowrap}.plan-details{margin:0 0 14px;padding-left:24px;color:#637080;font-size:12px;line-height:1.9}.plan-line-count{border-radius:10px;background:#edf4fd;padding:2px 7px;color:#2d72c2;font-size:10px}.plan-line strong{overflow:hidden;text-overflow:ellipsis;font-size:12px}.plan-line small{overflow:hidden;max-width:210px;text-overflow:ellipsis;color:#8a94a1;font-size:10px}.tool-call-row{display:grid;grid-template-columns:30px minmax(0,1fr) auto;align-items:center;gap:10px;padding:12px 0}.tool-call-icon{display:grid;width:28px;height:28px;place-items:center;border-radius:8px;background:#edf4fd;color:#3477c5}.tool-call-row>div strong,.tool-call-row>div small{display:block}.tool-call-row>div strong{font-size:12px}.tool-call-row>div small{margin-top:2px;color:#8b94a0;font-size:10px}.tool-call-row>span:last-child{color:#778291;font-size:10px;white-space:nowrap}.tool-call-row.failed .tool-call-icon{background:#fff0ed;color:#c84a43}.ai-reply-row{display:flex;align-items:flex-start;gap:10px;border-top:1px solid #eef0f3;padding:11px 0 5px}.ai-reply-row>span{flex:none;border-radius:5px;background:#f2f3f5;padding:2px 6px;color:#687382;font-size:10px}.ai-reply-row p{margin:0;color:#586575;font-size:11px}.ppt-skill-card{background:#f7f8fa;color:#4f5b69}.ppt-skill-card .skill-icon{display:grid;width:30px;height:30px;flex:none;place-items:center;border-radius:8px;background:#fff0e8;color:#d3672b}.ppt-skill-card>span:nth-child(2){line-height:1.45}.ppt-skill-card>span:nth-child(2) strong{display:block;color:#343d49}.ppt-skill-card button{display:inline-flex!important;width:auto!important;height:28px!important;align-items:center;gap:4px;border-radius:7px!important;padding:0 8px!important;background:#fff!important;color:#526173!important}.visually-hidden{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important}
.message-time{display:block;min-height:16px;margin-top:6px;color:#a0a5ad;font-size:10px;line-height:16px;opacity:0;transition:opacity .15s}.user-message>time.message-time{text-align:right;order:2}.user-message:hover>.message-time,.user-message:focus-within>.message-time,.answer:hover>.message-time,.answer:focus-within>.message-time{opacity:1}.process-summary>button{border:0!important;border-radius:0!important;background:transparent!important;padding:5px 0!important;min-height:24px;gap:8px}.process-summary>button:hover{background:transparent!important}.process-title{font-weight:400!important;font-size:12px;color:#7c838c!important}.process-title i{width:5px;height:5px;background:#a3a9b2!important;box-shadow:none!important}.process-meta{font-size:10px}.process-overview{background:transparent!important;border:0!important;border-left:1px solid #e6e8eb!important;border-radius:0!important;padding:8px 0 8px 16px!important;margin:4px 0 12px!important}.process-overview>header{border:0!important;padding-bottom:6px!important}.tool-call-row{padding:6px 0!important}.tool-call-icon{background:#f1f2f4!important;color:#858c96!important;width:22px!important;height:22px!important;border-radius:5px!important}.ai-reply-row{padding:7px 0!important;border:0!important}.process-attempts{background:transparent}
</style>











