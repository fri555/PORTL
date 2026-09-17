<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Bell, CalendarClock, Clock3, FileText, MapPin, MessageSquareText, UsersRound, X } from 'lucide-vue-next'
import DwsContactPicker from './DwsContactPicker.vue'
import WorkDateTimePicker from './WorkDateTimePicker.vue'
import type { DigestActionOption, MessageSummaryItem } from '@/types/workbench'
import type { DwsActionRequest, DwsContact } from '@/services/dws-workbench'

const props = defineProps<{
  item: MessageSummaryItem
  action: DigestActionOption
  pending: boolean
  feedback?: { tone: 'success' | 'error'; text: string } | null
}>()

const emit = defineEmits<{ close: []; submit: [payload: DwsActionRequest] }>()

const title = ref('')
const text = ref('')
const due = ref('')
const recipients = ref<DwsContact[]>([])
const executors = ref<DwsContact[]>([])
const participants = ref<DwsContact[]>([])
const todoDescription = ref('')
type TodoPriority = 'urgent' | 'high' | 'normal' | 'low'

const todoPriority = ref<TodoPriority>('normal')
const todoReminder = ref('')
const start = ref('')
const end = ref('')
const timezone = ref('Asia/Shanghai')
const requiredAttendees = ref<DwsContact[]>([])
const optionalAttendees = ref<DwsContact[]>([])
const room = ref('')
const location = ref('')
const desc = ref('')
const reminders = ref('15')

const messageTemplates = [
  { label: '批准', text: '已批准，请按计划推进，并及时同步结果。' },
  { label: '拒绝', text: '暂不批准，请补充依据与调整方案后再次提交。' },
  { label: '推进', text: '请按当前方案推进，明确责任人与完成时间，并同步关键进展。' },
  { label: '收到', text: '收到，我已了解，请继续按计划推进。' },
]

const dialogTitle = computed(() => ({
  send_msg: '发消息',
  create_todo: '新建待办',
  create_calendar: '新建日程',
})[props.action.type])

const sourceRecipients = computed<DwsContact[]>(() => {
  const options: DwsContact[] = []
  const seen = new Set<string>()
  props.item.sources.forEach((source) => {
    if (source.groupActionRef && !seen.has(source.groupActionRef)) {
      options.push({ ref: source.groupActionRef, name: source.conversationName, department: '来源群聊' })
      seen.add(source.groupActionRef)
    }
    if (source.userActionRef && !seen.has(source.userActionRef)) {
      options.push({ ref: source.userActionRef, name: source.senderName, department: '消息发送人' })
      seen.add(source.userActionRef)
    }
  })
  if (props.action.actionRef && !seen.has(props.action.actionRef)) {
    options.push({ ref: props.action.actionRef, name: '原消息会话', department: '消息来源' })
  }
  return options
})

function toLocalInput(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000
  return new Date(value.getTime() - offset).toISOString().slice(0, 16)
}

function defaultDue() {
  const value = new Date()
  if (value.getHours() >= 18) value.setDate(value.getDate() + 1)
  value.setHours(18, 0, 0, 0)
  return toLocalInput(value)
}

function reminderBeforeDue(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  date.setHours(date.getHours() - 1)
  return toLocalInput(date)
}

function defaultMeeting() {
  const startAt = new Date()
  startAt.setMinutes(0, 0, 0)
  startAt.setHours(startAt.getHours() + 1)
  if (startAt.getHours() < 9) startAt.setHours(9)
  if (startAt.getHours() > 17) {
    startAt.setDate(startAt.getDate() + 1)
    startAt.setHours(9)
  }
  const endAt = new Date(startAt)
  endAt.setHours(endAt.getHours() + 1)
  return [toLocalInput(startAt), toLocalInput(endAt)]
}

function contactRefs(value: DwsContact[]) {
  return value.map((contact) => contact.ref)
}

watch(() => [props.item.id, props.action.type], () => {
  const [meetingStart, meetingEnd] = defaultMeeting()
  const sourcePerson = sourceRecipients.value.find((contact) => contact.department === '消息发送人')
  title.value = props.item.title
  text.value = `请确认并跟进：${props.item.title}`
  due.value = defaultDue()
  todoReminder.value = reminderBeforeDue(due.value)
  recipients.value = sourceRecipients.value.slice(0, 1)
  executors.value = [{ ref: 'current-user', name: '当前用户', department: '本人' }]
  participants.value = [{ ref: 'current-user', name: '当前用户', department: '本人' }]
  todoDescription.value = `摘要：${props.item.summary}\n影响：${props.item.impact}`
  todoPriority.value = 'normal'
  start.value = meetingStart
  end.value = meetingEnd
  requiredAttendees.value = sourcePerson ? [sourcePerson] : [{ ref: 'current-user', name: '当前用户', department: '本人' }]
  optionalAttendees.value = []
  room.value = ''
  location.value = ''
  desc.value = `沟通目标：确认${props.item.title}的责任人与完成时间。`
  reminders.value = '15'
}, { immediate: true })

const canSubmit = computed(() => {
  if (props.action.type === 'send_msg') return Boolean(recipients.value[0]?.ref && text.value.trim())
  if (props.action.type === 'create_todo') return Boolean(title.value.trim())
  return Boolean(title.value.trim() && start.value && end.value && timezone.value && requiredAttendees.value.length)
})

function submit() {
  if (!canSubmit.value) return
  if (props.action.type === 'send_msg') {
    emit('submit', { action: 'message', actionRef: recipients.value[0]!.ref, text: text.value.trim() })
  } else if (props.action.type === 'create_todo') {
    const effectiveDue = due.value || defaultDue()
    emit('submit', {
      action: 'todo',
      executors: contactRefs(executors.value).length ? contactRefs(executors.value) : ['current-user'],
      participants: contactRefs(participants.value),
      title: title.value.trim(),
      description: todoDescription.value.trim() || undefined,
      due: effectiveDue,
      reminderTime: todoReminder.value || undefined,
      priority: todoPriority.value,
    })
  } else {
    emit('submit', {
      action: 'calendar',
      title: title.value.trim(),
      start: start.value,
      end: end.value,
      timezone: timezone.value,
      requiredAttendees: contactRefs(requiredAttendees.value),
      optionalAttendees: contactRefs(optionalAttendees.value),
      room: room.value.trim() || undefined,
      location: location.value.trim() || undefined,
      desc: desc.value.trim() || undefined,
      remindMinutes: reminders.value.split(/[，,]/).map(Number).filter(Number.isFinite),
    })
  }
}
</script>

<template>
  <div class="fixed inset-0 z-[190] grid place-items-center bg-[#111827]/30 px-4 backdrop-blur-[2px]" @click.self="emit('close')">
    <section data-testid="digest-action-dialog" role="dialog" aria-modal="true" :aria-label="dialogTitle" class="max-h-[90vh] w-[660px] max-w-full overflow-y-auto rounded-[20px] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.24)]">
      <header class="flex items-center justify-between gap-4 border-b border-[#edf0f4] px-6 py-4">
        <div><h3 class="text-[14px] font-semibold text-[#20242a]">{{ dialogTitle }}</h3><p class="mt-1 text-[10px] text-[#1769e0]">AI 已根据当前信息预填，可修改后执行</p></div>
        <button type="button" aria-label="关闭动作表单" class="grid h-8 w-8 place-items-center rounded-lg text-[#8d949e] hover:bg-[#f2f4f7]" @click="emit('close')"><X class="h-4 w-4" /></button>
      </header>

      <div class="px-6 py-5">
        <template v-if="action.type === 'send_msg'">
          <div class="grid grid-cols-[22px_minmax(0,1fr)] gap-3 border-b border-[#edf0f4] pb-4">
            <UsersRound class="mt-3 h-4 w-4 text-[#8b929c]" />
            <div><label class="text-[12px] font-medium text-[#4d5560]">发送给 <span class="text-red-500">*</span></label><DwsContactPicker v-model="recipients" :multiple="false" test-id="message-recipient" placeholder="从企业通讯录搜索收件人" class="mt-2" /></div>
          </div>
          <div class="grid grid-cols-[22px_minmax(0,1fr)] gap-3 pt-4">
            <MessageSquareText class="mt-1 h-4 w-4 text-[#8b929c]" />
            <div>
              <label class="text-[12px] font-medium text-[#4d5560]">发送内容 <span class="text-red-500">*</span></label>
              <div class="mt-2 flex flex-wrap gap-1.5" aria-label="常用快捷内容">
                <button v-for="template in messageTemplates" :key="template.label" :data-testid="`message-template-${template.label}`" type="button" class="h-7 rounded-full border border-[#dfe4eb] bg-white px-3 text-[10px] font-medium text-[#59616c] transition hover:border-[#98b9eb] hover:bg-[#f4f8ff] hover:text-[#1769e0]" @click="text = template.text">{{ template.label }}</button>
              </div>
              <textarea v-model="text" data-testid="message-content" class="mt-2 min-h-[138px] w-full resize-none rounded-xl border border-[#dfe4eb] bg-[#fbfcfd] px-3 py-2.5 text-[12px] leading-5 text-[#2e343b] outline-none focus:border-[#78a8ef] focus:bg-white focus:ring-2 focus:ring-[#1769e0]/8" />
            </div>
          </div>
        </template>

        <template v-else-if="action.type === 'create_todo'">
          <div data-testid="todo-title-priority-row" class="grid grid-cols-[minmax(0,1fr)_132px] items-end gap-4 border-b border-[#edf0f4] pb-4">
            <label class="min-w-0 text-[12px] font-medium text-[#4d5560]">待办标题 <span class="text-red-500">*</span><input v-model="title" data-testid="todo-title" class="mt-2 h-10 w-full border-0 border-b border-[#dfe4eb] px-0 text-[14px] font-medium text-[#252a31] outline-none placeholder:text-[#b0b5bd] focus:border-[#1769e0]" placeholder="写下你的待办事项" /></label>
            <div><label class="text-[12px] font-medium text-[#4d5560]">优先级</label><div data-testid="todo-priority" class="mt-2 grid grid-cols-4 gap-0.5 rounded-xl bg-[#f3f5f7] p-1"><button v-for="option in [{ value: 'low', label: '较低' }, { value: 'normal', label: '普通' }, { value: 'high', label: '较高' }, { value: 'urgent', label: '紧急' }]" :key="option.value" :data-testid="`todo-priority-${option.value}`" type="button" class="h-8 rounded-lg px-0 text-[9px] font-medium transition" :class="todoPriority === option.value ? 'bg-white text-[#1769e0] shadow-sm' : 'text-[#727a85] hover:text-[#3e4650]'" @click="todoPriority = option.value as TodoPriority">{{ option.label }}</button></div></div>
          </div>
          <div class="grid grid-cols-[22px_minmax(0,1fr)] gap-3 border-b border-[#edf0f4] py-4">
            <FileText class="mt-1 h-4 w-4 text-[#8b929c]" />
            <div><label class="text-[12px] font-medium text-[#4d5560]">待办描述</label><textarea v-model="todoDescription" data-testid="todo-description" class="mt-2 min-h-[72px] w-full resize-none rounded-xl border border-[#dfe4eb] bg-[#fbfcfd] px-3 py-2 text-[12px] leading-5 outline-none focus:border-[#78a8ef] focus:bg-white" placeholder="补充背景、要求和验收标准" /></div>
          </div>
          <div class="grid grid-cols-[22px_minmax(0,1fr)] gap-3 border-b border-[#edf0f4] py-4">
            <UsersRound class="mt-3 h-4 w-4 text-[#8b929c]" />
            <div data-testid="todo-people-row" class="grid gap-3 sm:grid-cols-2"><div><label class="text-[12px] font-medium text-[#4d5560]">执行人</label><DwsContactPicker v-model="executors" test-id="todo-executors" placeholder="搜索执行人" class="mt-2" /></div><div><label class="text-[12px] font-medium text-[#4d5560]">参与人</label><DwsContactPicker v-model="participants" test-id="todo-participants" placeholder="添加参与人" class="mt-2" /></div></div>
          </div>
          <div class="grid grid-cols-[22px_minmax(0,1fr)] gap-3 border-b border-[#edf0f4] py-4">
            <CalendarClock class="mt-1 h-4 w-4 text-[#8b929c]" />
            <div data-testid="todo-time-row" class="grid gap-3 sm:grid-cols-2">
              <label class="min-w-0 text-[12px] font-medium text-[#4d5560]">截止时间<WorkDateTimePicker v-model="due" test-id="todo-due" label="截止" @change="todoReminder = reminderBeforeDue($event)" /></label>
              <label class="min-w-0 text-[12px] font-medium text-[#4d5560]">提醒时间 <span class="font-normal text-[#939aa4]">· 默认提前1小时</span><WorkDateTimePicker v-model="todoReminder" test-id="todo-reminder" label="提醒" /></label>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="border-b border-[#edf0f4] pb-4">
            <label class="text-[12px] font-medium text-[#4d5560]">日程标题 <span class="text-red-500">*</span></label>
            <input v-model="title" data-testid="calendar-title" class="mt-2 h-10 w-full border-0 border-b border-[#dfe4eb] px-0 text-[14px] font-medium text-[#252a31] outline-none placeholder:text-[#b0b5bd] focus:border-[#1769e0]" placeholder="添加标题" />
          </div>
          <div class="grid grid-cols-[22px_minmax(0,1fr)] gap-3 border-b border-[#edf0f4] py-4">
            <Clock3 class="mt-3 h-4 w-4 text-[#8b929c]" />
            <div>
              <label class="text-[12px] font-medium text-[#4d5560]">时间 <span class="text-red-500">*</span></label>
              <div class="mt-2 grid grid-cols-2 gap-2"><input v-model="start" data-testid="calendar-start" type="datetime-local" class="h-10 rounded-xl border border-[#dfe4eb] px-3 text-[12px] outline-none focus:border-[#78a8ef]" /><input v-model="end" data-testid="calendar-end" type="datetime-local" class="h-10 rounded-xl border border-[#dfe4eb] px-3 text-[12px] outline-none focus:border-[#78a8ef]" /></div>
              <select v-model="timezone" data-testid="calendar-timezone" class="mt-2 h-8 rounded-lg border-0 bg-[#f6f7f9] px-2 text-[10px] text-[#68717d] outline-none"><option value="Asia/Shanghai">中国标准时间 · 北京（GMT+8）</option></select>
            </div>
          </div>
          <div class="grid grid-cols-[22px_minmax(0,1fr)] gap-3 border-b border-[#edf0f4] py-4">
            <UsersRound class="mt-3 h-4 w-4 text-[#8b929c]" />
            <div class="space-y-3"><div><label class="text-[12px] font-medium text-[#4d5560]">必选参与人 <span class="text-red-500">*</span></label><DwsContactPicker v-model="requiredAttendees" test-id="calendar-required-attendees" placeholder="从企业通讯录搜索参与人" class="mt-2" /></div><div><label class="text-[12px] font-medium text-[#4d5560]">可选参与人</label><DwsContactPicker v-model="optionalAttendees" test-id="calendar-optional-attendees" placeholder="添加可选参与人" class="mt-2" /></div></div>
          </div>
          <div class="grid grid-cols-[22px_minmax(0,1fr)] gap-3 border-b border-[#edf0f4] py-4">
            <MapPin class="mt-3 h-4 w-4 text-[#8b929c]" />
            <div class="grid grid-cols-2 gap-2"><label class="text-[12px] font-medium text-[#4d5560]">地点<input v-model="location" class="mt-2 h-10 w-full rounded-xl border border-[#dfe4eb] px-3 text-[12px] outline-none focus:border-[#78a8ef]" placeholder="添加地点" /></label><label class="text-[12px] font-medium text-[#4d5560]">会议室<input v-model="room" class="mt-2 h-10 w-full rounded-xl border border-[#dfe4eb] px-3 text-[12px] outline-none focus:border-[#78a8ef]" placeholder="选择会议室" /></label></div>
          </div>
          <div class="grid grid-cols-[22px_minmax(0,1fr)] gap-3 border-b border-[#edf0f4] py-4">
            <FileText class="mt-1 h-4 w-4 text-[#8b929c]" />
            <div><label class="text-[12px] font-medium text-[#4d5560]">日程描述</label><textarea v-model="desc" class="mt-2 min-h-[84px] w-full resize-none rounded-xl border border-[#dfe4eb] bg-[#fbfcfd] px-3 py-2 text-[12px] leading-5 outline-none focus:border-[#78a8ef] focus:bg-white" /></div>
          </div>
          <div class="grid grid-cols-[22px_minmax(0,1fr)] gap-3 pt-4">
            <Bell class="mt-2 h-4 w-4 text-[#8b929c]" />
            <label class="text-[12px] font-medium text-[#4d5560]">提醒<input v-model="reminders" class="ml-3 h-9 w-32 rounded-xl border border-[#dfe4eb] px-3 text-[12px] outline-none focus:border-[#78a8ef]" placeholder="15" /><span class="ml-2 text-[10px] font-normal text-[#8b929c]">分钟前，多项用逗号分隔</span></label>
          </div>
        </template>

        <p v-if="feedback" class="mt-4 text-[12px]" :class="feedback.tone === 'success' ? 'text-[#087b4d]' : 'text-[#c43825]'">{{ feedback.text }}</p>
      </div>

      <footer class="flex justify-end gap-2 border-t border-[#edf0f4] bg-[#fbfcfd] px-6 py-3">
        <button type="button" class="h-9 rounded-xl px-4 text-[10px] font-medium text-[#68717d] hover:bg-[#f0f2f5]" @click="emit('close')">取消</button>
        <button data-testid="digest-action-confirm" type="button" :disabled="pending || !canSubmit" class="h-9 rounded-xl bg-[#1769e0] px-5 text-[10px] font-semibold text-white transition hover:bg-[#0f5cc8] disabled:opacity-45" @click="submit">{{ pending ? '处理中…' : action.type === 'send_msg' ? '发送' : action.type === 'create_todo' ? '新建待办' : '新建日程' }}</button>
      </footer>
    </section>
  </div>
</template>
