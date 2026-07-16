<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Activity,
  Blocks,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  CloudSun,
  Image,
  LayoutDashboard,
  MapPin,
  Palette,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Warehouse,
  X,
} from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { buildMonthDays, toDateKey } from '@/lib/workbench-calendar'
import { workbenchPortals, workbenchSchedules, workbenchTodos } from '@/mock/workbench'
import type { TodoScope, WorkbenchPortal } from '@/types/workbench'

const store = useAppStore()
const router = useRouter()
const now = new Date()
const visibleMonth = ref(new Date(now.getFullYear(), now.getMonth(), 1))
const selectedDate = ref(toDateKey(now))
const searchQuery = ref('')
const todoScope = ref<TodoScope>('all')
const todos = ref(workbenchTodos.map((item) => ({ ...item })))

const iconMap = {
  sparkles: Sparkles,
  activity: Activity,
  warehouse: Warehouse,
  clipboard: ClipboardList,
  image: Image,
  layout: LayoutDashboard,
  chart: ChartNoAxesCombined,
  'shopping-bag': ShoppingBag,
  blocks: Blocks,
  store: Store,
  palette: Palette,
}

const toneClasses = {
  orange: 'bg-orange-500 shadow-orange-200/70',
  blue: 'bg-blue-600 shadow-blue-200/70',
  cyan: 'bg-cyan-600 shadow-cyan-200/70',
  violet: 'bg-violet-600 shadow-violet-200/70',
  rose: 'bg-rose-500 shadow-rose-200/70',
}

const filteredPortals = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return workbenchPortals
  return workbenchPortals.filter((portal) =>
    `${portal.name}${portal.description}${portal.category}`.toLowerCase().includes(query),
  )
})

const calendarDays = computed(() =>
  buildMonthDays(visibleMonth.value.getFullYear(), visibleMonth.value.getMonth(), now),
)
const monthLabel = computed(() =>
  new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(visibleMonth.value),
)
const dateSummary = computed(() =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now),
)
const selectedDateLabel = computed(() => {
  const date = new Date(`${selectedDate.value}T00:00:00`)
  return toDateKey(date) === toDateKey(now)
    ? '今日日程'
    : `${date.getMonth() + 1}月${date.getDate()}日日程`
})
const selectedSchedules = computed(() =>
  workbenchSchedules.filter((item) => item.date === selectedDate.value),
)
const filteredTodos = computed(() =>
  todoScope.value === 'all' ? todos.value : todos.value.filter((item) => item.scope === todoScope.value),
)
const todoCounts = computed(() => ({
  all: todos.value.length,
  responsible: todos.value.filter((item) => item.scope === 'responsible').length,
  participating: todos.value.filter((item) => item.scope === 'participating').length,
}))
const greeting = computed(() => {
  const hour = now.getHours()
  if (hour < 12) return '上午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

function changeMonth(offset: number) {
  visibleMonth.value = new Date(
    visibleMonth.value.getFullYear(),
    visibleMonth.value.getMonth() + offset,
    1,
  )
}

function resetToday() {
  visibleMonth.value = new Date(now.getFullYear(), now.getMonth(), 1)
  selectedDate.value = toDateKey(now)
}

function selectDay(date: Date) {
  selectedDate.value = toDateKey(date)
  visibleMonth.value = new Date(date.getFullYear(), date.getMonth(), 1)
}

function toggleTodo(id: string) {
  const todo = todos.value.find((item) => item.id === id)
  if (todo) todo.completed = !todo.completed
}

async function handlePortalClick(portal: WorkbenchPortal) {
  if (portal.url.startsWith('/')) {
    await router.push(portal.url)
    return
  }
  const token = (store.user as Record<string, unknown> | null)?.token || ''
  const target = portal.ssoEnabled ? `${portal.url}/sso/callback?token=${token}` : portal.url
  window.open(target, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div data-testid="workbench-dashboard" class="min-h-[calc(100vh-4rem)] bg-[#f4f7fb]">
    <div class="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8">
      <section class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-sm font-medium text-blue-600">企业工作台</p>
          <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {{ greeting }}，{{ store.user?.displayName ?? '张明' }} <span aria-hidden="true">👋</span>
          </h1>
          <p class="mt-2 text-sm text-slate-500">专注工作，成就不凡</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <div class="flex min-w-36 items-center gap-3 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-sm">
            <CloudSun class="h-8 w-8 text-amber-500" />
            <div><strong class="text-lg text-slate-900">28°C</strong><p class="text-xs text-slate-400">晴 · 18°/30°</p></div>
          </div>
          <div class="min-w-52 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-sm">
            <strong class="text-sm text-slate-900">{{ dateSummary }}</strong>
            <p class="mt-1 text-xs text-slate-400">农历六月初九</p>
          </div>
        </div>
      </section>

      <div
        data-testid="workbench-main-grid"
        class="workbench-main-grid grid items-start gap-4"
        style="grid-template-columns: minmax(0, 3fr) minmax(430px, 2fr)"
      >
        <section class="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <header class="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 class="text-base font-semibold text-slate-950">系统入口</h2><p class="mt-1 text-xs text-slate-400">选择要进入的企业系统</p></div>
            <label class="relative block w-full sm:w-64">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input v-model="searchQuery" aria-label="搜索系统入口" class="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100" placeholder="搜索系统入口" />
              <button v-if="searchQuery" type="button" aria-label="清空系统搜索" class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200" @click="searchQuery = ''"><X class="h-3.5 w-3.5" /></button>
            </label>
          </header>

          <div v-if="filteredPortals.length" class="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            <button v-for="portal in filteredPortals" :key="portal.id" type="button" class="group flex min-h-28 items-center gap-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/80 p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500" @click="handlePortalClick(portal)">
              <span class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-lg" :class="toneClasses[portal.tone]">
                <component :is="iconMap[portal.icon as keyof typeof iconMap]" class="h-6 w-6" />
              </span>
              <span class="min-w-0 flex-1"><span class="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><span class="truncate">{{ portal.name }}</span><ChevronRight class="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" /></span><span class="mt-2 block line-clamp-2 text-xs leading-5 text-slate-400">{{ portal.description }}</span></span>
            </button>
          </div>
          <div v-else class="grid min-h-80 place-items-center p-8 text-center"><div><Search class="mx-auto h-8 w-8 text-slate-300" /><h3 class="mt-3 text-sm font-semibold text-slate-800">没有匹配的系统入口</h3><p class="mt-1 text-xs text-slate-400">换个关键词，或清空搜索查看全部系统。</p><button data-testid="clear-portal-search" class="mt-4 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-blue-600" @click="searchQuery = ''">清空搜索</button></div></div>
          <footer class="flex items-center justify-center border-t border-slate-100 px-5 py-4"><button class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700">查看全部系统（{{ workbenchPortals.length }}）<ChevronRight class="h-4 w-4" /></button></footer>
        </section>

        <div class="grid gap-4">
          <section class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div class="workbench-calendar-schedule-grid grid">
              <div class="border-b border-slate-100 p-4 2xl:border-b-0 2xl:border-r">
                <div class="flex items-center justify-between"><h2 class="text-base font-semibold text-slate-950">日历</h2><div class="flex items-center gap-1"><button aria-label="上个月" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" @click="changeMonth(-1)"><ChevronLeft class="h-4 w-4" /></button><strong data-testid="calendar-month-label" class="min-w-24 text-center text-xs text-slate-700">{{ monthLabel }}</strong><button aria-label="下个月" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" @click="changeMonth(1)"><ChevronRight class="h-4 w-4" /></button></div><button aria-label="回到今天" class="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-blue-50 hover:text-blue-600" @click="resetToday">今天</button></div>
                <div class="mt-4 grid grid-cols-7 text-center text-[11px] text-slate-400"><span v-for="week in ['一','二','三','四','五','六','日']" :key="week">{{ week }}</span></div>
                <div class="mt-2 grid grid-cols-7 gap-y-1 text-center">
                  <button v-for="day in calendarDays" :key="day.key" :aria-label="`选择 ${day.key}`" class="mx-auto grid h-8 w-8 place-items-center rounded-full text-xs transition" :class="selectedDate === day.key ? 'bg-blue-600 font-semibold text-white shadow-md shadow-blue-200' : day.isToday ? 'bg-blue-50 font-semibold text-blue-600' : day.inCurrentMonth ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300'" @click="selectDay(day.date)">{{ day.day }}</button>
                </div>
              </div>

              <div class="p-4">
                <div class="flex items-center justify-between"><h2 class="text-base font-semibold text-slate-950">{{ selectedDateLabel }}</h2><button class="text-xs font-medium text-slate-400 hover:text-blue-600">全部日程 <ChevronRight class="inline h-3.5 w-3.5" /></button></div>
                <div v-if="selectedSchedules.length" class="mt-3 space-y-0">
                  <article v-for="schedule in selectedSchedules" :key="schedule.id" class="relative grid grid-cols-[76px_1fr_auto] gap-2 border-b border-slate-100 py-3 pl-3 last:border-0">
                    <span class="absolute left-0 top-4 h-2 w-2 rounded-full" :class="schedule.status === '进行中' ? 'bg-blue-500' : schedule.status === '即将开始' ? 'bg-emerald-400' : 'bg-slate-300'" />
                    <span class="text-[11px] font-medium text-slate-600">{{ schedule.start }} – {{ schedule.end }}</span>
                    <div class="min-w-0"><h3 class="truncate text-xs font-semibold text-slate-800">{{ schedule.title }}</h3><p class="mt-1 flex items-center gap-1 truncate text-[10px] text-slate-400"><MapPin class="h-3 w-3" />{{ schedule.location }}</p></div>
                    <span class="text-[10px] font-medium" :class="schedule.status === '进行中' ? 'text-blue-600' : schedule.status === '即将开始' ? 'text-emerald-500' : 'text-slate-400'">{{ schedule.status }}</span>
                  </article>
                </div>
                <div v-else class="grid min-h-52 place-items-center text-center"><div><CalendarDays class="mx-auto h-7 w-7 text-slate-300" /><p class="mt-2 text-xs text-slate-400">这一天没有安排日程</p></div></div>
              </div>
            </div>
          </section>

          <section class="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div class="flex items-center gap-4"><h2 class="text-base font-semibold text-slate-950">待办事项</h2><div class="flex gap-1 rounded-xl bg-slate-50 p-1"><button v-for="tab in [{id:'all',label:'全部'},{id:'responsible',label:'我负责的'},{id:'participating',label:'我参与的'}]" :key="tab.id" :data-testid="`todo-tab-${tab.id}`" class="rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition" :class="todoScope === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'" @click="todoScope = tab.id as TodoScope">{{ tab.label }}（{{ todoCounts[tab.id as TodoScope] }}）</button></div></div>
              <button class="text-xs font-medium text-slate-400 hover:text-blue-600">全部待办 <ChevronRight class="inline h-3.5 w-3.5" /></button>
            </header>
            <div class="px-4">
              <article v-for="todo in filteredTodos" :key="todo.id" :data-testid="`todo-item-${todo.id}`" class="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0" :class="todo.completed ? 'opacity-60' : ''">
                <button :aria-label="`${todo.completed ? '恢复' : '完成'}待办：${todo.title}`" class="grid h-5 w-5 shrink-0 place-items-center rounded border transition" :class="todo.completed ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-transparent hover:border-blue-500'" @click="toggleTodo(todo.id)"><Check class="h-3.5 w-3.5" /></button>
                <span class="min-w-0 flex-1 truncate text-sm text-slate-700" :class="todo.completed ? 'line-through' : ''">{{ todo.title }}</span>
                <span class="shrink-0 text-[11px]" :class="todo.urgency === 'danger' ? 'font-medium text-rose-500' : todo.urgency === 'warning' ? 'font-medium text-orange-500' : 'text-slate-400'">{{ todo.due }}</span>
              </article>
            </div>
            <footer class="flex justify-center border-t border-slate-100 px-4 py-3"><button class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">查看全部待办 <ChevronRight class="h-3.5 w-3.5" /></button></footer>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (min-width: 1536px) {
  .workbench-calendar-schedule-grid {
    grid-template-columns: minmax(250px, 0.9fr) minmax(280px, 1.1fr);
  }
}

@media (max-width: 1100px) {
  .workbench-main-grid {
    grid-template-columns: minmax(0, 1fr) !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  button {
    transition: none !important;
  }
}
</style>
