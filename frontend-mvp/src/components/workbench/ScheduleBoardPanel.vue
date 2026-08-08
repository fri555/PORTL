<script setup lang="ts">
import { computed, ref } from 'vue'
import { AudioLines, BrainCircuit, CalendarDays, ChevronLeft, ChevronRight, ExternalLink, GripVertical, MapPin, Plus, RefreshCw, Search, Settings2, Sparkles, StickyNote, Users, X } from 'lucide-vue-next'
import { buildMonthDays, toDateKey } from '@/lib/workbench-calendar'
import { workbenchSchedules } from '@/mock/workbench'
import type { ScheduleItem } from '@/types/workbench'
import MeetingNotesDialog from '@/components/workbench/MeetingNotesDialog.vue'
import SchedulePermissionDialog from '@/components/workbench/SchedulePermissionDialog.vue'

const props = defineProps<{
  schedules?: ScheduleItem[]
  dataMode?: 'live' | 'snapshot'
  currentUserName?: string
  loading?: boolean
  error?: string | null
  refreshing?: boolean
  canManagePermissions?: boolean
}>()

const emit = defineEmits<{ refresh: [] }>()

const now = new Date()
const visibleMonth = ref(new Date(now.getFullYear(), now.getMonth(), 1))
const selectedDate = ref(toDateKey(now))
const scheduleQuery = ref('')
const calendarCollapsed = ref(false)
const addPeopleOpen = ref(false)
const addedPeople = ref<string[]>([])
const hoveredInsight = ref<ScheduleItem | null>(null)
const pinnedInsightId = ref<string | null>(null)
const scheduleDraftId = ref<string | null>(null)
const noteSchedule = ref<ScheduleItem | null>(null)
const permissionDialogOpen = ref(false)
const draggedPersonId = ref<string | null>(null)
const expandedScheduleKey = ref<string | null>(null)
const minutesPosition = ref({ left: 0, top: 0 })
let minutesCloseTimer: number | undefined
let accordionCloseTimer: number | undefined

const calendarDays = computed(() => buildMonthDays(visibleMonth.value.getFullYear(), visibleMonth.value.getMonth(), now))
const monthLabel = computed(() => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(visibleMonth.value))
const selectedSchedules = computed(() => {
  const query = scheduleQuery.value.trim().toLowerCase()
  return (props.schedules ?? workbenchSchedules)
    .filter((item) => item.date === selectedDate.value)
    .filter((item) => item.status !== '已取消' || isSchedulePast(item))
    .filter((item) => !query || `${item.title}${item.location}${item.status}`.toLowerCase().includes(query))
    .sort((a, b) => a.start.localeCompare(b.start))
})
const calendarPeople = [
  { id: 'liu-yang', name: '刘洋', department: '商品中心', tone: 'bg-[#eaf2ff] text-[#1769e0]' },
  { id: 'chen-chen', name: '陈晨', department: '集团运营', tone: 'bg-[#f0ebff] text-[#7652d6]' },
  { id: 'zhao-liu', name: '赵六', department: '技术中心', tone: 'bg-[#eaf8f1] text-[#087b4d]' },
  { id: 'sun-qi', name: '孙琪', department: '财务中心', tone: 'bg-[#fff4e7] text-[#b96618]' },
  { id: 'wang-wu', name: '王五', department: '直播事业部', tone: 'bg-[#fff0ed] text-[#d84321]' },
]
const peerBoards = computed(() => addedPeople.value.map((id) => calendarPeople.find((person) => person.id === id)!).filter(Boolean))
const scheduleBoards = computed(() => [
  {
    id: 'mine',
    name: '我的日程',
    department: props.currentUserName ?? '当前账号',
    tone: 'bg-[#eaf2ff] text-[#1769e0]',
    mine: true,
    schedules: selectedSchedules.value,
  },
  ...peerBoards.value.map((person) => ({ ...person, mine: false, schedules: peerSchedules(person.id) })),
])
const scheduleOverflowMode = computed(() => scheduleBoards.value.length > 4)
const timelineHourHeight = 80
const minimumScheduleHeight = 72
const minimumVisualMinutes = (minimumScheduleHeight / timelineHourHeight) * 60
const timelineBounds = computed(() => {
  const schedules = scheduleBoards.value.flatMap((board) => board.schedules)
  if (!schedules.length) return { startMinutes: 8 * 60, endMinutes: 20 * 60 }
  const earliest = Math.min(...schedules.map((schedule) => toMinutes(schedule.start)))
  const latest = Math.max(...schedules.map((schedule) => toMinutes(schedule.end)))
  return {
    startMinutes: Math.min(8 * 60, Math.floor(earliest / 60) * 60),
    endMinutes: Math.max(20 * 60, Math.ceil(latest / 60) * 60),
  }
})
const timelineHours = computed(() => Array.from(
  { length: Math.max(1, (timelineBounds.value.endMinutes - timelineBounds.value.startMinutes) / 60) },
  (_, index) => {
    const minutes = timelineBounds.value.startMinutes + index * 60
    return { minutes, label: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:00` }
  },
))
const timelineEndLabel = computed(() => `${String(Math.floor(timelineBounds.value.endMinutes / 60)).padStart(2, '0')}:00`)
const timelineHeight = computed(() => timelineHours.value.length * timelineHourHeight)
const currentTimeMinutes = now.getHours() * 60 + now.getMinutes()
const currentTimeLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
const currentTimeTop = computed(() => {
  if (selectedDate.value !== toDateKey(now)) return null
  if (currentTimeMinutes < timelineBounds.value.startMinutes || currentTimeMinutes > timelineBounds.value.endMinutes) return null
  return ((currentTimeMinutes - timelineBounds.value.startMinutes) / 60) * timelineHourHeight
})

interface ScheduleLayout {
  top: number
  height: number
  lane: number
  laneCount: number
  clusterId: number
}

function layoutScheduleCluster(cluster: ScheduleItem[], layouts: Map<string, ScheduleLayout>, clusterId: number) {
  const laneEnds: number[] = []
  const assigned = cluster.map((schedule) => {
    const start = toMinutes(schedule.start)
    let lane = laneEnds.findIndex((end) => end <= start)
    if (lane < 0) lane = laneEnds.length
    laneEnds[lane] = Math.max(toMinutes(schedule.end), start + minimumVisualMinutes)
    return { schedule, lane }
  })
  const laneCount = Math.max(1, laneEnds.length)
  for (const { schedule, lane } of assigned) {
    const start = toMinutes(schedule.start)
    const end = Math.max(start + 1, toMinutes(schedule.end))
    layouts.set(schedule.id, {
      top: ((start - timelineBounds.value.startMinutes) / 60) * timelineHourHeight,
      height: Math.max(minimumScheduleHeight, ((end - start) / 60) * timelineHourHeight),
      lane,
      laneCount,
      clusterId,
    })
  }
}

function buildScheduleLayouts(schedules: ScheduleItem[]) {
  const layouts = new Map<string, ScheduleLayout>()
  const sorted = [...schedules].sort((left, right) => toMinutes(left.start) - toMinutes(right.start) || toMinutes(left.end) - toMinutes(right.end))
  let cluster: ScheduleItem[] = []
  let clusterEnd = -1
  let clusterId = 0
  for (const schedule of sorted) {
    const start = toMinutes(schedule.start)
    if (cluster.length && start >= clusterEnd) {
      layoutScheduleCluster(cluster, layouts, clusterId)
      cluster = []
      clusterEnd = -1
      clusterId += 1
    }
    cluster.push(schedule)
    clusterEnd = Math.max(clusterEnd, toMinutes(schedule.end), start + minimumVisualMinutes)
  }
  if (cluster.length) layoutScheduleCluster(cluster, layouts, clusterId)
  return layouts
}

const scheduleLayouts = computed(() => new Map(scheduleBoards.value.map((board) => [board.id, buildScheduleLayouts(board.schedules)])))
const maximumOverlapCount = computed(() => Math.max(
  1,
  ...[...scheduleLayouts.value.values()].flatMap((layouts) => [...layouts.values()].map((layout) => layout.laneCount)),
))
const scheduleColumnMinWidth = computed(() => maximumOverlapCount.value > 1
  ? Math.max(300, 90 * (maximumOverlapCount.value - 1))
  : 220)
const scheduleConflictKeys = computed(() => {
  const keys = new Set<string>()
  for (const board of scheduleBoards.value) {
    for (let leftIndex = 0; leftIndex < board.schedules.length; leftIndex += 1) {
      const left = board.schedules[leftIndex]
      if (!left) continue
      for (let rightIndex = leftIndex + 1; rightIndex < board.schedules.length; rightIndex += 1) {
        const right = board.schedules[rightIndex]
        if (!right || left.date !== right.date) continue
        if (toMinutes(left.start) < toMinutes(right.end) && toMinutes(right.start) < toMinutes(left.end)) {
          keys.add(`${board.id}:${left.id}`)
          keys.add(`${board.id}:${right.id}`)
        }
      }
    }
  }
  return keys
})
const selectedDateLabel = computed(() => new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${selectedDate.value}T12:00:00`)))
function scheduleCardClass(boardId: string, schedule: ScheduleItem) {
  if (hasScheduleConflict(boardId, schedule.id)) return 'border-[#f2b5aa] bg-[#fff0ed] text-[#572e29]'
  if (schedule.status === '已取消') return 'border-[#dde1e6] bg-[#f0f1f3] text-[#8a9099]'
  if (schedule.status === '已结束') return 'border-[#e1e4e8] bg-[#f3f4f6] text-[#858c96]'
  if (schedule.status === '即将开始') return 'border-[#f0dba7] bg-[#fff8df] text-[#594a28]'
  if (schedule.status === '进行中') return 'border-[#b9dfca] bg-[#eaf8f1] text-[#24553c]'
  return 'border-[#e1e6ec] bg-white text-[#202329]'
}

function changeMonth(offset: number) {
  visibleMonth.value = new Date(visibleMonth.value.getFullYear(), visibleMonth.value.getMonth() + offset, 1)
}

function selectDay(date: Date) {
  selectedDate.value = toDateKey(date)
  visibleMonth.value = new Date(date.getFullYear(), date.getMonth(), 1)
}

function changeSelectedDay(offset: number) {
  const date = new Date(`${selectedDate.value}T12:00:00`)
  date.setDate(date.getDate() + offset)
  selectDay(date)
}

function addPerson(id: string) {
  if (!addedPeople.value.includes(id)) addedPeople.value = [...addedPeople.value, id]
  addPeopleOpen.value = false
}

function removePerson(id: string) {
  addedPeople.value = addedPeople.value.filter((personId) => personId !== id)
}

function startPersonDrag(id: string, event: DragEvent) {
  draggedPersonId.value = id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }
}

function dropPerson(targetId: string) {
  const sourceId = draggedPersonId.value
  if (!sourceId || sourceId === targetId) return
  const next = [...addedPeople.value]
  const sourceIndex = next.indexOf(sourceId)
  const targetIndex = next.indexOf(targetId)
  if (sourceIndex < 0 || targetIndex < 0) return
  next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, sourceId)
  addedPeople.value = next
  draggedPersonId.value = null
}

function toMinutes(time: string) {
  const [hour = 0, minute = 0] = time.split(':').map(Number)
  return hour * 60 + minute
}

function hasScheduleConflict(boardId: string, scheduleId: string) {
  return scheduleConflictKeys.value.has(`${boardId}:${scheduleId}`)
}

function schedulePosition(boardId: string, scheduleId: string) {
  const boardLayouts = scheduleLayouts.value.get(boardId)
  const layout = boardLayouts?.get(scheduleId)
  if (!layout) return {}

  const activeId = expandedScheduleKey.value?.startsWith(`${boardId}:`)
    ? expandedScheduleKey.value.slice(boardId.length + 1)
    : undefined
  const active = activeId ? boardLayouts?.get(activeId) : undefined
  const accordionActive = Boolean(active && active.clusterId === layout.clusterId && layout.laneCount > 1)
  const activeLane = accordionActive ? active!.lane : -1
  const siblingWidth = accordionActive ? 40 / (layout.laneCount - 1) : 100 / layout.laneCount
  const laneWidth = accordionActive && layout.lane === activeLane ? 60 : siblingWidth
  let left = 0
  for (let lane = 0; lane < layout.lane; lane += 1) {
    left += accordionActive && lane === activeLane ? 60 : siblingWidth
  }
  return {
    top: `${layout.top}px`,
    height: `${layout.height}px`,
    left: `calc(${left}% + 4px)`,
    width: `calc(${laneWidth}% - 8px)`,
    zIndex: layout.lane + 1,
  }
}

function isScheduleSqueezed(boardId: string, scheduleId: string) {
  return (scheduleLayouts.value.get(boardId)?.get(scheduleId)?.laneCount ?? 1) > 1
}

function scheduleKey(boardId: string, scheduleId: string) {
  return `${boardId}:${scheduleId}`
}

function openScheduleAccordion(boardId: string, scheduleId: string) {
  if (accordionCloseTimer) window.clearTimeout(accordionCloseTimer)
  accordionCloseTimer = undefined
  expandedScheduleKey.value = scheduleKey(boardId, scheduleId)
}

function scheduleAccordionClose() {
  if (accordionCloseTimer) window.clearTimeout(accordionCloseTimer)
  accordionCloseTimer = window.setTimeout(() => {
    expandedScheduleKey.value = null
    accordionCloseTimer = undefined
  }, 120)
}

function closeScheduleAccordionNow() {
  if (accordionCloseTimer) window.clearTimeout(accordionCloseTimer)
  accordionCloseTimer = undefined
  expandedScheduleKey.value = null
}

function isSchedulePast(schedule: ScheduleItem) {
  return new Date(`${schedule.date}T${schedule.end}:00`).getTime() < now.getTime()
}

function peerSchedules(personId: string) {
  const personIndex = calendarPeople.findIndex((person) => person.id === personId)
  const source = selectedSchedules.value.length ? selectedSchedules.value : (props.schedules ?? workbenchSchedules).slice(0, 3)
  return source
    .filter((_, index) => (index + personIndex) % 2 === 0 || index === 0)
    .slice(0, 4)
    .map((schedule, index) => ({
      ...schedule,
      id: `${personId}-${schedule.id}-${index}`,
      aiAction: undefined,
      aiInsight: undefined,
      aiMinutes: undefined,
    }))
}

function cancelMinutesClose() {
  if (minutesCloseTimer) window.clearTimeout(minutesCloseTimer)
  minutesCloseTimer = undefined
}

function openMinutes(schedule: ScheduleItem, event: MouseEvent | FocusEvent) {
  cancelMinutesClose()
  const target = event.currentTarget as HTMLElement | null
  const rect = target?.getBoundingClientRect()
  const panelWidth = 360
  minutesPosition.value = {
    left: Math.max(16, (rect?.left ?? panelWidth + 26) - panelWidth - 10),
    top: Math.max(16, Math.min((rect?.top ?? 0) - 20, window.innerHeight - 360)),
  }
  hoveredInsight.value = schedule
}

function scheduleMinutesClose() {
  cancelMinutesClose()
  minutesCloseTimer = window.setTimeout(() => {
    if (pinnedInsightId.value === hoveredInsight.value?.id) return
    hoveredInsight.value = null
  }, 180)
}

function togglePinnedInsight(schedule: ScheduleItem, event: MouseEvent) {
  pinnedInsightId.value = pinnedInsightId.value === schedule.id ? null : schedule.id
  openMinutes(schedule, event)
}

function toggleScheduleDraft(schedule: ScheduleItem) {
  scheduleDraftId.value = scheduleDraftId.value === schedule.id ? null : schedule.id
}
</script>

<template>
  <section class="flex h-full min-h-[620px] flex-col overflow-hidden bg-white">
    <div data-testid="schedule-layout" class="grid min-h-0 flex-1 transition-[grid-template-columns]" :class="calendarCollapsed ? 'grid-cols-1' : 'md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]'">
      <aside v-if="!calendarCollapsed" data-testid="schedule-calendar-sidebar" class="border-b border-[#e8ebef] bg-[#f7f8fa] px-5 py-5 md:border-b-0 md:border-r">
        <div data-testid="calendar-month-grid">
          <div class="flex items-center justify-between gap-2">
            <button type="button" class="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#30343a] shadow-sm" @click="selectDay(now)">今天</button>
            <div class="flex items-center gap-1">
              <button aria-label="上个月" class="grid h-8 w-8 place-items-center rounded-lg text-[#747b86] hover:bg-white" @click="changeMonth(-1)"><ChevronLeft class="h-4 w-4" /></button>
              <strong data-testid="calendar-month-label" class="min-w-[92px] text-center text-sm font-semibold text-[#25282e]">{{ monthLabel }}</strong>
              <button aria-label="下个月" class="grid h-8 w-8 place-items-center rounded-lg text-[#747b86] hover:bg-white" @click="changeMonth(1)"><ChevronRight class="h-4 w-4" /></button>
            </div>
          </div>
          <div class="mt-6 grid grid-cols-7 text-center text-[11px] text-[#8d939d]"><span v-for="week in ['一','二','三','四','五','六','日']" :key="week">{{ week }}</span></div>
          <div class="mt-2 grid grid-cols-7 gap-y-2 text-center">
            <button v-for="day in calendarDays" :key="day.key" :aria-label="`选择 ${day.key}`" class="mx-auto grid h-9 w-9 place-items-center rounded-full text-[13px] transition" :class="selectedDate === day.key ? 'bg-[#1769e0] font-semibold text-white shadow-[0_5px_14px_rgba(23,105,224,0.25)]' : day.isToday ? 'bg-white font-semibold text-[#1769e0]' : day.inCurrentMonth ? 'text-[#3f454e] hover:bg-white' : 'text-[#c1c5cc]'" @click="selectDay(day.date)">{{ day.day }}</button>
          </div>
        </div>
        <div class="relative mt-6 border-t border-[#e2e6eb] pt-5">
          <button data-testid="schedule-add-person" type="button" class="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-[#cfd9e7] bg-white text-xs font-medium text-[#56606d] shadow-sm transition hover:border-[#9ebbe5] hover:text-[#1769e0]" @click="addPeopleOpen = !addPeopleOpen"><Users class="h-4 w-4" /><Plus class="h-3.5 w-3.5" />增加他人日程</button>
          <div v-if="addPeopleOpen" data-testid="schedule-person-picker" class="absolute left-0 top-12 z-40 w-full rounded-xl border border-[#e2e6eb] bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
            <p class="px-2 py-1.5 text-[10px] font-semibold text-[#9298a2]">选择同事</p>
            <button v-for="person in calendarPeople" :key="person.id" :data-testid="`schedule-person-option-${person.id}`" type="button" :disabled="addedPeople.includes(person.id)" class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-[#f6f8fb] disabled:opacity-40" @click="addPerson(person.id)"><span class="grid h-7 w-7 place-items-center rounded-full text-[10px] font-semibold" :class="person.tone">{{ person.name.slice(-1) }}</span><span class="min-w-0"><strong class="block text-xs text-[#343941]">{{ person.name }}</strong><small class="text-[10px] text-[#999fa8]">{{ person.department }}</small></span></button>
          </div>
        </div>
        <div class="mt-3">
          <div class="flex items-center gap-3 rounded-xl bg-white px-3 py-3 shadow-sm"><span class="h-3 w-3 rounded-full bg-[#1769e0]" /><strong class="min-w-0 truncate text-xs text-[#30343a]">我的日程</strong></div>
          <div v-for="person in peerBoards" :key="person.id" :data-testid="`schedule-sidebar-person-${person.id}`" draggable="true" class="mt-2 flex cursor-grab items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-white active:cursor-grabbing" @dragstart="startPersonDrag(person.id, $event)" @dragover.prevent @drop="dropPerson(person.id)"><GripVertical class="h-3.5 w-3.5 shrink-0 text-[#b0b6bf]" /><span class="h-2.5 w-2.5 shrink-0 rounded-full bg-[#7652d6]" /><span class="min-w-0 flex-1 truncate text-xs text-[#5e6570]">{{ person.name }}</span><button type="button" :aria-label="`移除${person.name}日程`" class="text-[#a0a5ae] hover:text-[#4f5662]" @click="removePerson(person.id)"><X class="h-3.5 w-3.5" /></button></div>
        </div>
      </aside>

      <div data-testid="schedule-list-pane" class="flex min-h-0 min-w-0 flex-col bg-white" :class="calendarCollapsed ? 'w-full' : ''">
        <header data-testid="schedule-header" class="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8ebef] px-5 py-4">
          <div class="flex items-center gap-2">
            <button data-testid="calendar-collapse-toggle" type="button" :aria-label="calendarCollapsed ? '展开日历' : '收起日历'" class="grid h-9 w-9 place-items-center rounded-lg border border-[#e2e6eb] text-[#68707b] hover:bg-[#f6f7f9] hover:text-[#1769e0]" @click="calendarCollapsed = !calendarCollapsed"><CalendarDays class="h-4 w-4" /></button>
            <div class="flex items-center gap-1"><button type="button" aria-label="上一天" class="grid h-7 w-7 place-items-center rounded-lg text-[#818894] hover:bg-[#f3f5f8] hover:text-[#1769e0]" @click="changeSelectedDay(-1)"><ChevronLeft class="h-3.5 w-3.5" /></button><div><h2 class="workbench-card-title text-[14px] font-semibold text-[#202329]">日程看板</h2><p data-testid="schedule-selected-date" class="mt-0.5 text-[10px] text-[#9298a2]">{{ selectedDateLabel }}</p></div><button type="button" aria-label="下一天" class="grid h-7 w-7 place-items-center rounded-lg text-[#818894] hover:bg-[#f3f5f8] hover:text-[#1769e0]" @click="changeSelectedDay(1)"><ChevronRight class="h-3.5 w-3.5" /></button></div>
          </div>
          <div class="flex items-center gap-2">
            <button v-if="canManagePermissions" data-testid="schedule-system-config" type="button" class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dfe4ea] bg-white px-3 text-xs font-medium text-[#56606d] hover:border-[#b9cff0] hover:text-[#1769e0]" @click="permissionDialogOpen = true"><Settings2 class="h-4 w-4" />系统配置</button>
            <button data-testid="schedule-refresh" type="button" :disabled="refreshing" aria-label="刷新日程看板" class="grid h-9 w-9 place-items-center rounded-lg border border-[#dfe4ea] text-[#68707b] hover:bg-[#f6f7f9]" @click="emit('refresh')"><RefreshCw class="h-4 w-4" :class="refreshing ? 'animate-spin' : ''" /></button>
            <label class="relative w-[220px] max-w-[38vw]"><Search class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ba1aa]" /><input v-model="scheduleQuery" aria-label="搜索日程看板" class="h-9 w-full rounded-lg border border-[#dfe4ea] bg-[#f8f9fa] pl-8 pr-8 text-xs outline-none focus:border-[#8fb5f3] focus:bg-white" placeholder="搜索日程" /><button v-if="scheduleQuery" data-testid="clear-schedule-search" type="button" aria-label="清空日程搜索" class="absolute right-2 top-1/2 -translate-y-1/2 text-[#9aa0aa]" @click="scheduleQuery = ''"><X class="h-3.5 w-3.5" /></button></label>
          </div>
        </header>

        <div v-if="loading" class="grid flex-1 place-items-center text-xs text-[#8b909a]">正在读取钉钉日程…</div>
        <div v-else-if="error" class="grid flex-1 place-items-center text-center"><div><CalendarDays class="mx-auto h-6 w-6 text-[#b6bac2]" /><p class="mt-2 text-xs text-[#8b909a]">钉钉日程暂时不可用</p></div></div>
        <div v-else data-testid="schedule-board-lane" data-max-visible="4" class="min-h-0 flex-1 px-5 pb-5 pt-4">
          <div data-testid="schedule-board-viewport" :data-layout-mode="scheduleOverflowMode ? 'overflow' : 'adaptive'" class="elegant-scrollbar schedule-board-container h-full min-h-0 overflow-auto rounded-xl border border-[#dfe4ea] bg-[#fafbfc]">
            <div v-if="selectedSchedules.length" data-testid="schedule-board-track" class="schedule-board-track schedule-board-track--single-row min-h-full" :class="scheduleOverflowMode ? 'schedule-board-track--overflow' : 'schedule-board-track--adaptive'" :style="{ '--board-count': scheduleBoards.length, '--column-min-width': `${scheduleColumnMinWidth}px`, '--track-min-width': `${68 + scheduleBoards.length * scheduleColumnMinWidth}px` }">
              <aside data-testid="schedule-time-axis" class="schedule-time-axis sticky left-0 z-30 flex min-w-0 flex-col border-r border-[#e3e7ec] bg-[#f7f8fa]">
                <div class="sticky top-0 z-20 grid h-14 shrink-0 place-items-center border-b border-[#e3e7ec] bg-[#f2f4f7] text-[9px] font-semibold tracking-[0.12em] text-[#9aa0a9]">时间</div>
                <div class="relative shrink-0" :style="{ height: `${timelineHeight}px` }">
                  <div v-for="hour in timelineHours" :key="hour.minutes" data-testid="schedule-time-block" :data-time="hour.label" class="absolute left-0 w-full border-t border-[#dfe4ea]" :style="{ top: `${((hour.minutes - timelineBounds.startMinutes) / 60) * timelineHourHeight}px`, height: `${timelineHourHeight}px` }">
                    <strong class="absolute left-0 top-1.5 w-full text-center font-mono text-[10px] font-semibold text-[#59616c]">{{ hour.label }}</strong>
                    <span class="absolute left-1/2 top-1/2 w-2 -translate-x-1/2 border-t border-[#d9dee5]" />
                  </div>
                  <div v-if="currentTimeTop !== null" data-testid="schedule-now-label" class="pointer-events-none absolute inset-x-0 z-10 flex -translate-y-1/2 items-center justify-center" :style="{ top: `${currentTimeTop}px` }"><span class="rounded-full bg-[#ef6a5b] px-1.5 py-0.5 font-mono text-[9px] font-semibold leading-none text-white shadow-sm">{{ currentTimeLabel }}</span></div>
                  <strong class="absolute bottom-1 left-0 w-full text-center font-mono text-[10px] font-semibold text-[#59616c]">{{ timelineEndLabel }}</strong>
                </div>
              </aside>
              <section
                v-for="board in scheduleBoards"
                :key="board.id"
                :data-testid="board.mine ? 'schedule-board-mine' : `schedule-peer-board-${board.id}`"
                class="schedule-person-board flex min-w-0 flex-col border-r border-[#e3e7ec] bg-white last:border-r-0"
                :class="board.mine ? 'sticky left-[68px] z-20 shadow-[8px_0_18px_rgba(15,23,42,0.08)]' : ''"
                :draggable="!board.mine"
                @dragstart="!board.mine && startPersonDrag(board.id, $event)"
                @dragover.prevent
                @drop="!board.mine && dropPerson(board.id)"
              >
                <header data-testid="schedule-person-header" class="sticky top-0 z-20 flex h-14 shrink-0 min-w-0 items-center justify-between border-b border-[#e5e9ee] bg-[#f7f9fc] px-3">
                  <div class="flex min-w-0 items-center gap-2">
                    <GripVertical v-if="!board.mine" class="h-3.5 w-3.5 shrink-0 cursor-grab text-[#b0b6bf]" />
                    <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold" :class="board.tone">{{ board.mine ? '我' : board.name.slice(-1) }}</span>
                    <div class="min-w-0"><h3 class="truncate text-xs font-semibold text-[#28303a]">{{ board.name }}</h3><p class="mt-0.5 truncate text-[9px] text-[#8b939e]">{{ board.department }} · {{ board.schedules.length }} 项</p></div>
                  </div>
                  <button v-if="!board.mine" type="button" :aria-label="`移除${board.name}日程`" class="shrink-0 text-[#a0a5ae] hover:text-[#4f5662]" @click="removePerson(board.id)"><X class="h-3.5 w-3.5" /></button>
                </header>
                <div :data-testid="board.mine ? 'schedule-scroll-area' : undefined" class="schedule-timeline-canvas relative shrink-0 overflow-hidden" :style="{ height: `${timelineHeight}px`, '--hour-height': `${timelineHourHeight}px` }">
                  <div v-if="currentTimeTop !== null" :data-testid="board.mine ? 'schedule-now-line-mine' : undefined" class="pointer-events-none absolute inset-x-0 z-10 border-t border-[#ef6a5b]/80" :style="{ top: `${currentTimeTop}px` }"><span class="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-[#ef6a5b]" /></div>
                  <article v-for="schedule in board.schedules" :key="schedule.id" :data-testid="board.mine ? `schedule-item-${schedule.id}` : undefined" :data-conflict="hasScheduleConflict(board.id, schedule.id) ? 'true' : 'false'" :data-squeezed="isScheduleSqueezed(board.id, schedule.id) ? 'true' : 'false'" :data-expanded="expandedScheduleKey === scheduleKey(board.id, schedule.id) ? 'true' : 'false'" :data-start="schedule.start" :data-end="schedule.end" :tabindex="isScheduleSqueezed(board.id, schedule.id) ? 0 : undefined" :aria-label="`${schedule.title}，${schedule.start} 至 ${schedule.end}，${schedule.location || '无会议室信息'}，${schedule.status}`" class="schedule-timeline-card group absolute flex min-w-0 flex-col overflow-hidden rounded-lg border px-2 py-1.5 shadow-[0_2px_6px_rgba(15,23,42,0.06)] outline-none" :class="scheduleCardClass(board.id, schedule)" :style="schedulePosition(board.id, schedule.id)" @mouseenter="openScheduleAccordion(board.id, schedule.id)" @mouseleave="scheduleAccordionClose" @focusin="openScheduleAccordion(board.id, schedule.id)" @focusout="scheduleAccordionClose" @keydown.esc.stop="closeScheduleAccordionNow">
                    <div data-testid="schedule-card-title-row" class="flex h-5 min-w-0 shrink-0 items-center"><h4 class="workbench-item-title min-w-0 flex-1 truncate text-[14px] font-semibold leading-4" :class="schedule.status === '已取消' && isSchedulePast(schedule) ? 'line-through' : ''">{{ schedule.title }}</h4></div>
                    <div data-testid="schedule-card-time-row" class="mt-0.5 flex h-5 min-w-0 shrink-0 items-center gap-1">
                      <p class="min-w-0 flex-1 truncate font-mono text-[10px] font-semibold leading-4 opacity-75">{{ schedule.start }}–{{ schedule.end }}</p>
                      <div class="flex shrink-0 items-center gap-1">
                        <a :data-testid="`schedule-open-external-${schedule.id}`" href="https://www.dingtalk.com/" target="_blank" rel="noreferrer" :aria-label="`在钉钉中查看${schedule.title}`" title="在钉钉中查看" class="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[#1769e0] opacity-55 transition hover:bg-white/80 hover:opacity-100 focus:bg-white/80 focus:opacity-100" @click.stop><ExternalLink class="h-3 w-3" /></a>
                        <button v-if="schedule.aiAction || schedule.aiInsight" :data-testid="`schedule-ai-detail-${schedule.id}`" type="button" :aria-label="`查看${schedule.title}的${schedule.aiInsight?.kind.replace(' ', '') ?? 'AI分析'}`" class="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/80 text-[#7652d6]" @mouseenter="openMinutes(schedule, $event)" @mouseleave="scheduleMinutesClose" @focus="openMinutes(schedule, $event)" @blur="scheduleMinutesClose" @click="togglePinnedInsight(schedule, $event)"><AudioLines v-if="schedule.aiInsight?.kind === 'AI 听记'" class="h-3 w-3" /><BrainCircuit v-else class="h-3 w-3" /></button>
                        <button v-if="board.mine" :data-testid="`schedule-note-${schedule.id}`" type="button" :aria-label="`记录${schedule.title}会议笔记`" class="inline-flex h-5 shrink-0 items-center gap-0.5 rounded-md border border-[#d8cfef] bg-white/85 px-1.5 text-[9px] font-medium text-[#7652d6] transition hover:border-[#bba9e1] hover:bg-white" @click="noteSchedule = schedule"><StickyNote class="h-2.5 w-2.5" />笔记</button>
                      </div>
                    </div>
                    <p data-testid="schedule-card-location-row" class="workbench-meta-copy mt-0.5 flex h-4 min-w-0 shrink-0 items-center gap-1 truncate text-[10px] leading-4 opacity-65"><template v-if="schedule.location"><MapPin class="h-2.5 w-2.5 shrink-0" />{{ schedule.location }}</template></p>
                  </article>
                </div>
              </section>
            </div>
            <div v-else data-testid="schedule-board-empty" class="grid h-full min-h-[260px] place-items-center text-center"><div><CalendarDays class="mx-auto h-6 w-6 text-[#b6bac2]" /><p class="mt-2 text-xs text-[#8b909a]">{{ scheduleQuery ? '未找到匹配日程' : '当天暂无日程' }}</p><button v-if="scheduleQuery" type="button" class="mt-2 text-xs font-medium text-[#1769e0]" @click="scheduleQuery = ''">清空搜索</button></div></div>
          </div>
        </div>
      </div>
    </div>
    <aside
      v-if="hoveredInsight"
      data-testid="schedule-ai-detail-floating"
      data-placement="left-of-trigger"
      class="pointer-events-auto fixed z-[160] w-[360px] max-w-[calc(100vw-32px)] rounded-[22px] border border-white/90 bg-white/98 p-5 shadow-[0_28px_80px_rgba(15,23,42,0.24)] backdrop-blur-2xl"
      :style="{ left: `${minutesPosition.left}px`, top: `${minutesPosition.top}px` }"
      @mouseenter="cancelMinutesClose"
      @mouseleave="scheduleMinutesClose"
      @focusin="cancelMinutesClose"
      @focusout="scheduleMinutesClose"
    >
      <p class="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] text-[#7652d6]"><Sparkles class="h-3.5 w-3.5" />AI 判断{{ hoveredInsight.aiAction ? ` · ${hoveredInsight.aiAction}` : '' }}</p>
      <h3 class="mt-1 text-[14px] font-semibold text-[#25282e]">{{ hoveredInsight.title }}</h3>
      <div v-if="hoveredInsight.aiAction" class="mt-3 rounded-xl bg-[#fff8ed] p-3"><p class="text-[10px] font-semibold text-[#76552b]">分析理由</p><p class="mt-1 text-xs leading-5 text-[#696175]">{{ hoveredInsight.aiRationale }}</p><p class="mt-2 text-xs leading-5 text-[#696175]">{{ hoveredInsight.aiActionSuggestion }}</p></div>
      <template v-if="hoveredInsight.aiInsight"><p class="mt-3 text-[10px] font-semibold text-[#7652d6]">{{ hoveredInsight.aiInsight.kind }}</p><p class="mt-1 text-xs leading-5 text-[#505661]">{{ hoveredInsight.aiInsight.summary }}</p><ul class="mt-3 space-y-1.5 rounded-xl bg-[#f7f5ff] p-3 text-[12px] leading-5 text-[#666e7a]"><li v-for="point in hoveredInsight.aiInsight.points" :key="point">• {{ point }}</li></ul><p class="mt-3 text-[10px] leading-4 text-[#9691a0]">{{ hoveredInsight.aiInsight.basisNote }}</p></template>
      <div v-if="scheduleDraftId === hoveredInsight.id" data-testid="schedule-draft-form" class="mt-3 rounded-xl border border-[#ded5ff] bg-[#faf8ff] p-3.5">
        <div class="flex items-center justify-between gap-3"><h4 class="text-xs font-semibold text-[#3e3556]">钉钉日程草稿</h4><span class="rounded-full bg-white px-2 py-1 text-[10px] text-[#7652d6]">确认后创建</span></div>
        <label class="mt-3 block text-[10px] font-medium text-[#706781]">标题<input class="mt-1 h-8 w-full rounded-lg border border-[#ded7ef] bg-white px-2 text-xs text-[#25282e] outline-none focus:border-[#7652d6]" :value="`${hoveredInsight.title}调整沟通`" /></label>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <label class="block text-[10px] font-medium text-[#706781]">开始时间<input class="mt-1 h-8 w-full rounded-lg border border-[#ded7ef] bg-white px-2 text-xs text-[#25282e] outline-none focus:border-[#7652d6]" value="2026-07-22 18:00" /></label>
          <label class="block text-[10px] font-medium text-[#706781]">结束时间<input class="mt-1 h-8 w-full rounded-lg border border-[#ded7ef] bg-white px-2 text-xs text-[#25282e] outline-none focus:border-[#7652d6]" value="2026-07-22 18:30" /></label>
        </div>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <label class="block text-[10px] font-medium text-[#706781]">时区<input class="mt-1 h-8 w-full rounded-lg border border-[#ded7ef] bg-white px-2 text-xs text-[#25282e] outline-none focus:border-[#7652d6]" value="中国标准时间 - 北京 (GMT+8)" /></label>
          <label class="block text-[10px] font-medium text-[#706781]">提醒<select class="mt-1 h-8 w-full rounded-lg border border-[#ded7ef] bg-white px-2 text-xs text-[#25282e] outline-none focus:border-[#7652d6]"><option>开始前15分钟</option><option>开始前30分钟</option><option>不提醒</option></select></label>
        </div>
        <label class="mt-2 block text-[10px] font-medium text-[#706781]">必需参与人<input class="mt-1 h-8 w-full rounded-lg border border-[#ded7ef] bg-white px-2 text-xs text-[#25282e] outline-none focus:border-[#7652d6]" value="朝暮-AI运营, 商品负责人, 区域负责人" /></label>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <label class="block text-[10px] font-medium text-[#706781]">地点/会议室<input class="mt-1 h-8 w-full rounded-lg border border-[#ded7ef] bg-white px-2 text-xs text-[#25282e] outline-none focus:border-[#7652d6]" value="线上会议" /></label>
          <label class="block text-[10px] font-medium text-[#706781]">忙闲状态<select class="mt-1 h-8 w-full rounded-lg border border-[#ded7ef] bg-white px-2 text-xs text-[#25282e] outline-none focus:border-[#7652d6]"><option>忙碌</option><option>空闲</option></select></label>
        </div>
        <label class="mt-2 block text-[10px] font-medium text-[#706781]">正文<textarea class="mt-1 min-h-[58px] w-full rounded-lg border border-[#ded7ef] bg-white px-2 py-1.5 text-xs leading-5 text-[#25282e] outline-none focus:border-[#7652d6]" :value="hoveredInsight.aiActionSuggestion ?? hoveredInsight.aiInsight?.summary ?? '请确认调整后的会议安排。'" /></label>
        <div class="mt-2 flex items-center gap-2 text-[10px] text-[#776f84]"><input id="video-meeting-draft" type="checkbox" checked class="h-3.5 w-3.5 rounded border-[#c9c1dc]" /><label for="video-meeting-draft">添加视频会议</label><input id="repeat-draft" type="checkbox" class="ml-2 h-3.5 w-3.5 rounded border-[#c9c1dc]" /><label for="repeat-draft">不重复</label></div>
        <div class="mt-3 flex justify-end gap-2"><button type="button" class="rounded-full bg-white px-3 py-2 text-[10px] font-medium text-[#706781]" @click="scheduleDraftId = null">取消</button><button type="button" class="rounded-full bg-[#7652d6] px-3 py-2 text-[10px] font-semibold text-white">确认创建日程</button></div>
      </div>
      <p class="mt-3 text-[10px] text-[#9aa0aa]">AI 建议，需人工确认；V1 不自动改期、取消或通知组织者。</p>
      <div class="mt-4 flex justify-between gap-2 border-t border-[#edf0f4] pt-3"><button data-testid="schedule-create-draft" type="button" class="rounded-full bg-[#f0ebff] px-3 py-2 text-[10px] font-semibold text-[#7652d6]" @click="toggleScheduleDraft(hoveredInsight)">生成日程草稿</button><a data-testid="schedule-open-dingtalk" href="https://www.dingtalk.com/" target="_blank" rel="noreferrer" class="rounded-full bg-[#1677ff] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0f65dc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1677ff]">{{ hoveredInsight.aiInsight?.kind === 'AI 听记' ? '查看完整听记' : '查看日程详情' }}</a></div>
    </aside>
    <MeetingNotesDialog v-if="noteSchedule" :schedule="noteSchedule" :live-connected="dataMode === 'live'" :current-user-name="currentUserName" @close="noteSchedule = null" />
    <SchedulePermissionDialog v-if="permissionDialogOpen" @close="permissionDialogOpen = false" />
  </section>
</template>

<style scoped>
.schedule-board-container {
  container-type: inline-size;
}

.schedule-board-track--single-row {
  display: grid;
  grid-template-columns: 68px repeat(var(--board-count), minmax(var(--column-min-width), 1fr));
  min-width: max(100%, var(--track-min-width));
}

.schedule-board-track--overflow {
  grid-template-columns: 68px repeat(var(--board-count), minmax(var(--column-min-width), 1fr));
}

.schedule-timeline-canvas {
  background-color: #fff;
  background-image:
    linear-gradient(to bottom, transparent calc(50% - 0.5px), #edf0f3 calc(50% - 0.5px), #edf0f3 calc(50% + 0.5px), transparent calc(50% + 0.5px)),
    linear-gradient(to bottom, transparent calc(100% - 1px), #dfe4ea calc(100% - 1px));
  background-size: 100% var(--hour-height), 100% var(--hour-height);
}

.schedule-timeline-card {
  transition: left 160ms ease, width 160ms ease, box-shadow 160ms ease;
}

.schedule-timeline-card[data-expanded="true"] {
  box-shadow: 0 10px 24px rgba(30, 41, 59, 0.16);
}

@media (prefers-reduced-motion: reduce) {
  .schedule-timeline-card {
    transition: none;
  }
}
</style>
