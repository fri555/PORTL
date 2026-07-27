<script setup lang="ts">
import { computed, ref } from 'vue'
import { AudioLines, CalendarClock, ClipboardCheck, FileCheck2, MessageSquareText } from 'lucide-vue-next'
import OrganizationScopeDrawer from '@/components/common/OrganizationScopeDrawer.vue'
import { useAppStore } from '@/stores/app'
import { defaultOrganizationScopeId } from '@/mock/organization'
import { workbenchOverviewMetrics } from '@/mock/workbench'
import InformationDigestPanel from '@/components/workbench/InformationDigestPanel.vue'
import EmailSummaryPanel from '@/components/workbench/EmailSummaryPanel.vue'
import ScheduleBoardPanel from '@/components/workbench/ScheduleBoardPanel.vue'
import SystemPortalPanel from '@/components/workbench/SystemPortalPanel.vue'
import TodoCenterPanel from '@/components/workbench/TodoCenterPanel.vue'
import { fetchDwsWorkbench, getCachedDwsWorkbench } from '@/services/dws-workbench'
import { fetchEmailSummaries } from '@/services/email-summary'
import { useWorkbenchBoardState } from '@/composables/useWorkbenchBoardState'
import type { ApprovalItem, DigestWatchRule, EmailSummaryItem, MessageSummaryItem, ScheduleItem, TodoItem } from '@/types/workbench'

const store = useAppStore()
const now = new Date()
const selectedOrganizationScope = ref(defaultOrganizationScopeId)
const personalWatchRules = ref<DigestWatchRule[]>([])
const isPersonalScope = computed(() => selectedOrganizationScope.value === 'chao-mu')
const memoryCache = getCachedDwsWorkbench()
type DigestBoardData = { items: MessageSummaryItem[]; source?: 'live' | 'snapshot'; accessIssues: string[]; identityName: string }
type ScheduleBoardData = { items: ScheduleItem[]; source?: 'live' | 'snapshot'; identityName: string; minutesCount: number }
type TodoBoardData = { todos: TodoItem[]; approvals: ApprovalItem[]; source?: 'live' | 'snapshot'; identityName: string }
type EmailBoardData = { items: EmailSummaryItem[]; connected: boolean; accessIssues: string[] }

async function loadDws() {
  return fetchDwsWorkbench({ force: true, watchRules: personalWatchRules.value })
}

const digestBoard = useWorkbenchBoardState<DigestBoardData>('chao-mu', 'digest', async () => {
  const payload = await loadDws()
  return { items: payload.messages, source: payload.source, accessIssues: payload.accessIssues, identityName: payload.identity.name }
}, { items: memoryCache?.messages ?? [], source: memoryCache?.source, accessIssues: memoryCache?.accessIssues ?? [], identityName: memoryCache?.identity.name ?? '朝暮' })
const scheduleBoard = useWorkbenchBoardState<ScheduleBoardData>('chao-mu', 'schedule', async () => {
  const payload = await loadDws()
  return { items: payload.schedules, source: payload.source, identityName: payload.identity.name, minutesCount: payload.minutesCount }
}, { items: memoryCache?.schedules ?? [], source: memoryCache?.source, identityName: memoryCache?.identity.name ?? '朝暮', minutesCount: memoryCache?.minutesCount ?? 0 })
const todoBoard = useWorkbenchBoardState<TodoBoardData>('chao-mu', 'todo', async () => {
  const payload = await loadDws()
  return { todos: payload.todos, approvals: payload.approvals, source: payload.source, identityName: payload.identity.name }
}, { todos: memoryCache?.todos ?? [], approvals: memoryCache?.approvals ?? [], source: memoryCache?.source, identityName: memoryCache?.identity.name ?? '朝暮' })
const emailBoard = useWorkbenchBoardState<EmailBoardData>('chao-mu', 'email', async () => {
  const payload = await fetchEmailSummaries()
  return { items: payload.items, connected: payload.connected, accessIssues: payload.accessIssues }
}, { items: [], connected: false, accessIssues: [] })
const portalBoard = useWorkbenchBoardState('shared', 'portals', async () => ({ loaded: true }), { loaded: true })

const displayName = computed(() => isPersonalScope.value ? digestBoard.data.value.identityName || scheduleBoard.data.value.identityName || '朝暮' : store.user?.displayName ?? '用户')
const dateSummary = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(now)
const managementMetricIcons = [MessageSquareText, ClipboardCheck, CalendarClock, FileCheck2]
const personalMetricIcons = [CalendarClock, ClipboardCheck, FileCheck2, AudioLines]
const metricIcons = computed(() => isPersonalScope.value ? personalMetricIcons : managementMetricIcons)
const overviewTitle = computed(() => isPersonalScope.value ? '近 7 天个人工作概览' : '今日管理风险总览')
const overviewMetrics = computed(() => {
  if (!isPersonalScope.value) return workbenchOverviewMetrics
  return [
    { value: String(scheduleBoard.data.value.items.length), label: '近周日程', note: '来自钉钉日历', tone: 'violet' },
    { value: String(todoBoard.data.value.todos.length), label: '账号待办', note: '含未完成/已完成', tone: 'amber' },
    { value: String(todoBoard.data.value.approvals.length), label: '近周审批', note: '来自钉钉 OA', tone: 'coral' },
    { value: String(scheduleBoard.data.value.minutesCount), label: 'AI听记', note: '手动刷新更新', tone: 'green' },
  ]
})

function updatePersonalWatchRules(rules: DigestWatchRule[]) {
  personalWatchRules.value = rules
}

function metricTone(tone: string) {
  if (tone === 'coral') return 'bg-[#fff1ed] text-[#e75336]'
  if (tone === 'violet') return 'bg-[#f1edff] text-[#7652d6]'
  if (tone === 'amber') return 'bg-[#fff6e8] text-[#b76500]'
  return 'bg-[#eaf8f1] text-[#16845b]'
}
</script>

<template>
  <main data-testid="workbench-dashboard" class="flex min-h-[calc(100vh-64px)] bg-[#f6f7f9] text-[#17191e]">
    <OrganizationScopeDrawer v-model="selectedOrganizationScope" context-label="工作台组织口径" />
    <div class="min-w-0 flex-1 px-5 py-5 2xl:px-7">
      <section class="mb-5 flex items-center justify-between gap-8 py-3 pl-24 pr-1">
        <div class="min-w-[330px] pr-8">
          <p class="text-xs font-medium tracking-[0.02em] text-[#9197a1]">{{ dateSummary }}</p>
          <h1 class="mt-1.5 text-[27px] font-semibold tracking-[-0.04em] text-[#15171b]">下午好，{{ displayName }}</h1>
          <p class="mt-1 text-sm text-[#7c828d]">专注工作，成就不凡</p>
        </div>
        <div class="ml-auto min-w-0">
          <div class="mb-2 flex items-center justify-end gap-2">
            <p class="text-right text-[10px] font-semibold tracking-[0.14em] text-[#a0a5ae]">{{ overviewTitle }}</p>
          </div>
          <div data-testid="overview-strip" class="flex flex-none items-center justify-end gap-7 py-1">
          <article v-for="(item, index) in overviewMetrics" :key="item.label" class="flex min-w-[132px] items-center gap-2.5">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl" :class="metricTone(item.tone)">
              <component :is="metricIcons[index]" class="h-4 w-4" />
            </span>
            <div class="min-w-0">
              <div class="flex items-baseline gap-1.5"><strong class="text-[20px] font-semibold tracking-[-0.03em] text-[#202329]">{{ item.value }}</strong><span class="text-[11px] font-medium text-[#555c67]">{{ item.label }}</span></div>
              <p class="mt-0.5 text-[9px] text-[#9aa0aa]">{{ item.note }}</p>
            </div>
          </article>
          </div>
        </div>
      </section>

      <div data-testid="workbench-main-grid" class="workbench-main-grid grid items-start gap-4" style="grid-template-columns: repeat(2, minmax(0, 1fr))">
        <div class="grid gap-4">
          <InformationDigestPanel
            v-if="isPersonalScope"
            :items="digestBoard.data.value.items"
            :data-mode="digestBoard.data.value.source ?? 'live'"
            :refreshed-at="digestBoard.refreshedAt.value"
            :refreshing="digestBoard.refreshing.value"
            :access-issues="[...digestBoard.data.value.accessIssues, ...(digestBoard.error.value ? [digestBoard.error.value] : [])]"
            :watch-rules="personalWatchRules"
            @refresh="digestBoard.refresh"
            @update-watch-rules="updatePersonalWatchRules"
          />
          <InformationDigestPanel v-else data-mode="demo" />
          <EmailSummaryPanel v-if="isPersonalScope" :items="emailBoard.data.value.items" :connection-state="emailBoard.data.value.connected ? 'live' : 'pending'" :refreshing="emailBoard.refreshing.value" @refresh="emailBoard.refresh" />
          <EmailSummaryPanel v-else />
          <SystemPortalPanel :refreshing="portalBoard.refreshing.value" @refresh="portalBoard.refresh" />
        </div>
        <div class="grid gap-4">
          <ScheduleBoardPanel v-if="isPersonalScope" :schedules="scheduleBoard.data.value.items" :data-mode="scheduleBoard.data.value.source" :current-user-name="scheduleBoard.data.value.identityName" :loading="scheduleBoard.refreshing.value && !scheduleBoard.data.value.items.length" :refreshing="scheduleBoard.refreshing.value" :error="scheduleBoard.error.value || null" @refresh="scheduleBoard.refresh" />
          <ScheduleBoardPanel v-else />
          <TodoCenterPanel v-if="isPersonalScope" :todos="todoBoard.data.value.todos" :approvals="todoBoard.data.value.approvals" :data-mode="todoBoard.data.value.source" :loading="todoBoard.refreshing.value && !todoBoard.data.value.todos.length" :refreshing="todoBoard.refreshing.value" :error="todoBoard.error.value || null" @refresh="todoBoard.refresh" />
          <TodoCenterPanel v-else />
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
@media (max-width: 1180px) {
  .workbench-main-grid { grid-template-columns: minmax(0, 1fr) !important; }
}

@media (max-width: 760px) {
  section:first-of-type { align-items: flex-start; flex-direction: column; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; }
}

:deep(.elegant-scrollbar) {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

:deep(.elegant-scrollbar:hover),
:deep(.elegant-scrollbar:focus-within) {
  scrollbar-color: rgba(111, 120, 134, 0.34) transparent;
}

:deep(.elegant-scrollbar::-webkit-scrollbar) { width: 6px; height: 6px; }
:deep(.elegant-scrollbar::-webkit-scrollbar-track) { background: transparent; }
:deep(.elegant-scrollbar::-webkit-scrollbar-thumb) {
  border-radius: 999px;
  background: transparent;
  transition: background-color 160ms ease;
}
:deep(.elegant-scrollbar:hover::-webkit-scrollbar-thumb),
:deep(.elegant-scrollbar:focus-within::-webkit-scrollbar-thumb) { background: rgba(111, 120, 134, 0.34); }
</style>
