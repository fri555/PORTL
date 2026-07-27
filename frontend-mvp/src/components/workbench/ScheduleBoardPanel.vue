<script setup lang="ts">
import { computed, ref } from 'vue'
import { AudioLines, BrainCircuit, CalendarDays, ChevronLeft, ChevronRight, Gauge, MapPin, Sparkles, StickyNote } from 'lucide-vue-next'
import { buildMonthDays, toDateKey } from '@/lib/workbench-calendar'
import { workbenchScheduleLoad, workbenchSchedules } from '@/mock/workbench'
import type { ScheduleItem, ScheduleStatus } from '@/types/workbench'
import MeetingNotesDialog from '@/components/workbench/MeetingNotesDialog.vue'
import WorkbenchBoardHeader from '@/components/workbench/WorkbenchBoardHeader.vue'

const props = defineProps<{
  schedules?: ScheduleItem[]
  dataMode?: 'live' | 'snapshot'
  currentUserName?: string
  loading?: boolean
  error?: string | null
  refreshing?: boolean
}>()

const emit = defineEmits<{ refresh: [] }>()

const now = new Date()
const visibleMonth = ref(new Date(now.getFullYear(), now.getMonth(), 1))
const selectedDate = ref(toDateKey(now))
const scheduleQuery = ref('')
const calendarCollapsed = ref(true)
const hoveredInsight = ref<ScheduleItem | null>(null)
const pinnedInsightId = ref<string | null>(null)
const scheduleDraftId = ref<string | null>(null)
const noteSchedule = ref<ScheduleItem | null>(null)
const minutesPosition = ref({ left: 0, top: 0 })
let minutesCloseTimer: number | undefined

const calendarDays = computed(() => buildMonthDays(visibleMonth.value.getFullYear(), visibleMonth.value.getMonth(), now))
const monthLabel = computed(() => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(visibleMonth.value))
const selectedSchedules = computed(() => {
  const query = scheduleQuery.value.trim().toLowerCase()
  return (props.schedules ?? workbenchSchedules)
    .filter((item) => item.date === selectedDate.value)
    .filter((item) => !query || `${item.title}${item.location}${item.status}`.toLowerCase().includes(query))
    .sort((a, b) => a.start.localeCompare(b.start))
})
const liveScheduleSummary = computed(() => {
  const schedules = props.schedules ?? []
  const minutes = schedules.reduce((total, item) => {
    const [startHour = 0, startMinute = 0] = item.start.split(':').map(Number)
    const [endHour = 0, endMinute = 0] = item.end.split(':').map(Number)
    return total + Math.max(0, endHour * 60 + endMinute - startHour * 60 - startMinute)
  }, 0)
  const activeDays = new Set(schedules.map((item) => item.date)).size
  return {
    count: schedules.length,
    hours: Math.round(minutes / 6) / 10,
    activeDays,
  }
})

function statusClass(status: ScheduleStatus) {
  if (status === '进行中') return 'bg-[#eaf2ff] text-[#1769e0]'
  if (status === '即将开始') return 'bg-[#eafaf2] text-[#087b4d]'
  if (status === '已结束') return 'bg-[#f1f2f4] text-[#747b86]'
  return 'bg-[#f6f7f9] text-[#626975]'
}

function changeMonth(offset: number) {
  visibleMonth.value = new Date(visibleMonth.value.getFullYear(), visibleMonth.value.getMonth() + offset, 1)
}

function selectDay(date: Date) {
  selectedDate.value = toDateKey(date)
  visibleMonth.value = new Date(date.getFullYear(), date.getMonth(), 1)
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
  <section class="flex h-[356px] flex-col overflow-hidden rounded-[22px] border border-[#e7e9ee] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.035)]">
    <WorkbenchBoardHeader v-model:query="scheduleQuery" data-testid="schedule-header" title="日程看板" search-label="搜索日程看板" test-id-prefix="schedule" :refreshing="refreshing" @refresh="emit('refresh')">
      <button data-testid="calendar-collapse-toggle" type="button" :aria-label="calendarCollapsed ? '展开日历' : '收起日历'" :title="calendarCollapsed ? '展开日历' : '收起日历'" class="grid h-7 w-7 place-items-center rounded-lg transition" :class="calendarCollapsed ? 'text-[#747b86] hover:bg-[#f4f5f7] hover:text-[#1769e0]' : 'bg-[#edf3ff] text-[#1769e0]'" @click="calendarCollapsed = !calendarCollapsed"><CalendarDays class="h-4 w-4" /></button>
    </WorkbenchBoardHeader>

    <div class="grid min-h-0 flex-1 transition-[grid-template-columns]" :class="calendarCollapsed ? 'grid-cols-1' : 'xl:grid-cols-[272px_minmax(0,1fr)]'">
      <div v-if="!calendarCollapsed" class="border-b border-[#eef0f3] p-3 xl:border-b-0 xl:border-r">
        <div data-testid="calendar-month-grid">
        <div class="flex items-center justify-between gap-1">
          <button aria-label="上个月" class="grid h-7 w-7 place-items-center rounded-lg text-[#747b86] hover:bg-[#f4f5f7]" @click="changeMonth(-1)"><ChevronLeft class="h-4 w-4" /></button>
          <strong data-testid="calendar-month-label" class="text-xs font-semibold text-[#34383f]">{{ monthLabel }}</strong>
          <button aria-label="下个月" class="grid h-7 w-7 place-items-center rounded-lg text-[#747b86] hover:bg-[#f4f5f7]" @click="changeMonth(1)"><ChevronRight class="h-4 w-4" /></button>
        </div>
        <div class="mt-3 grid grid-cols-7 text-center text-[10px] text-[#a0a5ae]">
          <span v-for="week in ['一','二','三','四','五','六','日']" :key="week">{{ week }}</span>
        </div>
        <div class="mt-1.5 grid grid-cols-7 gap-y-0.5 text-center">
          <button
            v-for="day in calendarDays"
            :key="day.key"
            :aria-label="`选择 ${day.key}`"
            class="mx-auto grid h-7 w-7 place-items-center rounded-full text-[12px] transition"
            :class="selectedDate === day.key ? 'bg-[#17191e] font-semibold text-white' : day.isToday ? 'bg-[#edf3ff] font-semibold text-[#1769e0]' : day.inCurrentMonth ? 'text-[#505661] hover:bg-[#f3f4f6]' : 'text-[#c1c4ca]'"
            @click="selectDay(day.date)"
          >{{ day.day }}</button>
        </div>
        </div>
      </div>

      <div data-testid="schedule-list-pane" class="min-w-0 p-4" :class="calendarCollapsed ? 'w-full' : ''">
        <div data-testid="schedule-load-summary" class="mb-2 flex items-center gap-2.5 rounded-xl bg-[#f7f5ff] px-3 py-2">
          <span class="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-[#7652d6] shadow-sm"><Gauge class="h-3.5 w-3.5" /></span>
          <div v-if="dataMode" class="min-w-0 flex-1"><div class="flex items-center gap-2"><strong class="workbench-body-copy text-xs text-[#3e3556]">近 7 天日程</strong><span class="workbench-meta-copy text-[10px] text-[#8b82a0]">{{ liveScheduleSummary.count }} 场 · {{ liveScheduleSummary.hours }} 小时 · 覆盖 {{ liveScheduleSummary.activeDays }} 天</span></div><p class="workbench-meta-copy mt-0.5 truncate text-[10px] text-[#827a91]">来自当前钉钉账号，可展开日历查看近 7 天明细。</p></div>
          <div v-else class="min-w-0 flex-1"><div class="flex items-center gap-2"><strong class="workbench-body-copy text-xs text-[#3e3556]">{{ workbenchScheduleLoad.level }}</strong><span class="workbench-meta-copy text-[10px] text-[#8b82a0]">{{ workbenchScheduleLoad.meetingCount }} 场 · {{ workbenchScheduleLoad.occupiedHours }} 小时 · 连续 {{ workbenchScheduleLoad.consecutiveCount }} 场</span></div><p class="workbench-meta-copy mt-0.5 truncate text-[10px] text-[#827a91]">{{ workbenchScheduleLoad.suggestion }}</p></div>
        </div>
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="text-[14px] font-semibold text-[#22252b]">今天</span>
            <span class="text-xs text-[#9297a0]">{{ selectedSchedules.length }} 项</span>
          </div>
        </div>

        <div v-if="loading" class="grid min-h-[220px] place-items-center text-xs text-[#8b909a]">正在读取钉钉日程…</div>
        <div v-else-if="error" class="grid min-h-[220px] place-items-center text-center"><div><CalendarDays class="mx-auto h-6 w-6 text-[#b6bac2]" /><p class="mt-2 text-xs text-[#8b909a]">钉钉日程暂时不可用</p></div></div>
        <div v-else-if="selectedSchedules.length" data-testid="schedule-scroll-area" class="elegant-scrollbar mt-1 h-[178px] overflow-y-auto pr-1">
          <article v-for="schedule in selectedSchedules" :key="schedule.id" :data-testid="`schedule-item-${schedule.id}`" class="group grid grid-cols-[70px_minmax(0,1fr)_auto] gap-3 border-b border-[#f0f1f3] py-3 last:border-b-0">
            <div data-testid="schedule-time-block" class="rounded-xl bg-[#f7f8fa] px-2 py-1.5">
              <p class="text-xs font-semibold text-[#30343a]">{{ schedule.start }}</p>
              <p class="mt-0.5 text-[10px] text-[#a0a5ad]">{{ schedule.end }}</p>
            </div>
            <div class="min-w-0 border-l-2 border-[#d8e6ff] pl-3">
              <div class="flex items-center gap-2">
                <h3 class="workbench-item-title truncate text-[14px] font-semibold text-[#202329]">{{ schedule.title }}</h3>
                <span v-if="schedule.aiAction" :data-testid="`schedule-action-${schedule.id}`" class="workbench-meta-copy shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold" :class="schedule.aiAction === '重要' ? 'bg-[#fff0ed] text-[#d84321]' : 'bg-[#eaf8f1] text-[#087b4d]'">{{ schedule.aiAction }}</span>
                <div v-if="schedule.aiAction || schedule.aiInsight" class="shrink-0">
                  <button
                    :data-testid="`schedule-ai-detail-${schedule.id}`"
                    type="button"
                    :aria-label="`查看${schedule.title}的${schedule.aiInsight?.kind.replace(' ', '') ?? 'AI分析'}`"
                    class="grid h-6 w-6 place-items-center rounded-full bg-[#f0ebff] text-[#7652d6] transition hover:bg-[#e8dfff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7652d6]"
                    @mouseenter="openMinutes(schedule, $event)"
                    @mouseleave="scheduleMinutesClose"
                    @focus="openMinutes(schedule, $event)"
                    @blur="scheduleMinutesClose"
                    @click="togglePinnedInsight(schedule, $event)"
                  >
                    <AudioLines v-if="schedule.aiInsight?.kind === 'AI 听记'" class="h-3.5 w-3.5" />
                    <BrainCircuit v-else class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p class="workbench-meta-copy mt-1 flex items-center gap-1 truncate text-[10px] text-[#858b95]"><MapPin class="h-3 w-3" />{{ schedule.location }} · {{ schedule.participantCount }} 人</p>
            </div>
            <div :data-testid="`schedule-row-actions-${schedule.id}`" class="flex shrink-0 items-center gap-1.5">
              <button :data-testid="`schedule-note-${schedule.id}`" type="button" :aria-label="`记录${schedule.title}会议笔记`" class="inline-flex h-7 items-center gap-1 rounded-full border border-[#ded6f4] bg-[#faf8ff] px-2 text-[10px] font-medium leading-none text-[#7652d6] transition hover:border-[#c6b6ed] hover:bg-[#f0ebff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7652d6]" @click="noteSchedule = schedule"><StickyNote class="h-3 w-3" />笔记</button>
              <span class="inline-flex h-7 items-center rounded-full px-2 text-[10px] font-medium leading-none" :class="statusClass(schedule.status)">{{ schedule.status }}</span>
            </div>
          </article>
        </div>
        <div v-else class="grid min-h-[220px] place-items-center text-center">
          <div><CalendarDays class="mx-auto h-6 w-6 text-[#b6bac2]" /><p class="mt-2 text-xs text-[#8b909a]">{{ scheduleQuery ? '未找到匹配日程' : '今天暂无日程' }}</p><button v-if="scheduleQuery" type="button" class="mt-2 text-xs font-medium text-[#1769e0]" @click="scheduleQuery = ''">清空搜索</button></div>
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
  </section>
</template>
