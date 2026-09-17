<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { Building2, CalendarDays, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, ClipboardList, LayoutGrid, Mail, MessageSquareText, UserRound } from 'lucide-vue-next'
import { defaultOrganizationScopeId, organizationScopeTree } from '@/mock/organization'
import InformationDigestPanel from '@/components/workbench/InformationDigestPanel.vue'
import EmailSummaryPanel from '@/components/workbench/EmailSummaryPanel.vue'
import ScheduleBoardPanel from '@/components/workbench/ScheduleBoardPanel.vue'
import SystemPortalPanel from '@/components/workbench/SystemPortalPanel.vue'
import TodoCenterPanel from '@/components/workbench/TodoCenterPanel.vue'
import { fetchDwsWorkbench, getCachedDwsWorkbench } from '@/services/dws-workbench'
import { fetchEmailSummaries } from '@/services/email-summary'
import { useWorkbenchBoardState } from '@/composables/useWorkbenchBoardState'
import { useAppStore } from '@/stores/app'
import type { ApprovalItem, DigestWatchRule, EmailSummaryItem, MessageSummaryItem, ScheduleItem, TodoItem } from '@/types/workbench'

const selectedOrganizationScope = ref(defaultOrganizationScopeId)
const sidebarCollapsed = ref(true)
const expandedScopes = ref(new Set(['ye-sports', 'tianma-platform']))
const personalWatchRules = ref<DigestWatchRule[]>([])
const isPersonalScope = computed(() => selectedOrganizationScope.value === 'chao-mu')
const appStore = useAppStore()
const canManageSchedulePermissions = computed(() => appStore.user?.role === 'admin')
type WorkbenchModuleId = 'system' | 'schedule' | 'todo' | 'digest' | 'email'
type WorkbenchModuleItem = { id: WorkbenchModuleId; label: string; description: string; icon: Component }
const activeModule = ref<WorkbenchModuleId>('system')
const moduleGroups: Array<{ id: 'general' | 'management'; label: string; items: WorkbenchModuleItem[] }> = [
  {
    id: 'general',
    label: '通用功能',
    items: [
      { id: 'system' as const, label: '系统入口', description: '常用业务系统统一入口', icon: LayoutGrid },
      { id: 'schedule' as const, label: '日程看板', description: '日程、会议与 AI 听记', icon: CalendarDays },
      { id: 'todo' as const, label: '待办中心', description: '任务与审批集中处理', icon: ClipboardList },
    ],
  },
  {
    id: 'management',
    label: '管理层',
    items: [
      { id: 'digest' as const, label: '消息摘要', description: '聚合重点事项与经营信号', icon: MessageSquareText },
      { id: 'email' as const, label: '邮件摘要', description: '管理邮件快速浏览', icon: Mail },
    ],
  },
]
function toggleScopeRoot(id: string) {
  const next = new Set(expandedScopes.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedScopes.value = next
}
const memoryCache = getCachedDwsWorkbench()
type DigestBoardData = { items: MessageSummaryItem[]; source?: 'live' | 'snapshot'; accessIssues: string[]; identityName: string }
type ScheduleBoardData = { items: ScheduleItem[]; source?: 'live' | 'snapshot'; identityName: string; minutesCount: number }
type TodoBoardData = { todos: TodoItem[]; approvals: ApprovalItem[]; source?: 'live' | 'snapshot'; identityName: string }
type EmailBoardData = { items: EmailSummaryItem[]; connected: boolean; accessIssues: string[]; hasMore: boolean; nextCursor?: string }

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
  const payload = await fetchEmailSummaries({ limit: 20 })
  return { items: payload.items, connected: payload.connected, accessIssues: payload.accessIssues, hasMore: payload.hasMore, nextCursor: payload.nextCursor }
}, { items: [], connected: false, accessIssues: [], hasMore: false })
const loadingMoreEmail = ref(false)
const portalBoard = useWorkbenchBoardState('shared', 'portals', async () => ({ loaded: true }), { loaded: true })


function updatePersonalWatchRules(rules: DigestWatchRule[]) {
  personalWatchRules.value = rules
}

async function loadMoreEmail() {
  const current = emailBoard.data.value
  if (loadingMoreEmail.value || !current.hasMore || !current.nextCursor) return
  loadingMoreEmail.value = true
  try {
    const payload = await fetchEmailSummaries({ limit: 20, cursor: current.nextCursor })
    const knownIds = new Set(current.items.map((item) => item.id))
    emailBoard.setData({
      items: [...current.items, ...payload.items.filter((item) => !knownIds.has(item.id))],
      connected: payload.connected,
      accessIssues: payload.accessIssues,
      hasMore: payload.hasMore,
      nextCursor: payload.nextCursor,
    })
  } finally {
    loadingMoreEmail.value = false
  }
}

</script>

<template>
  <main data-testid="workbench-dashboard" class="flex min-h-[calc(100vh-64px)] flex-col bg-[#f6f7f9] text-[#17191e] md:flex-row">
    <aside data-testid="org-scope-sidebar" class="workbench-function-nav relative shrink-0 border-b border-[#e6e9ee] bg-white transition-[width] duration-200 md:border-b-0 md:border-r" :class="sidebarCollapsed ? 'md:w-16' : 'md:w-[260px]'">
      <div class="flex h-[72px] items-center border-b border-[#eef0f3] px-3">
        <div v-show="!sidebarCollapsed" class="min-w-0 flex-1 pl-1">
          <p class="text-[10px] font-semibold tracking-[0.16em] text-[#9aa0aa]">WORKBENCH</p>
          <h1 class="mt-1 text-lg font-semibold tracking-[-0.02em] text-[#17191e]">工作看板</h1>
        </div>
        <button data-testid="org-scope-open" type="button" class="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#727985] hover:bg-[#f4f6f8]" :aria-label="sidebarCollapsed ? '展开工作台侧栏' : '收起工作台侧栏'" @click="sidebarCollapsed = !sidebarCollapsed">
          <ChevronsRight v-if="sidebarCollapsed" class="h-4 w-4" />
          <ChevronsLeft v-else class="h-4 w-4" />
        </button>
      </div>
      <nav class="elegant-scrollbar flex gap-3 overflow-x-auto px-2 py-3 md:block md:space-y-5 md:overflow-visible md:py-4" aria-label="工作看板功能">
        <section
          v-for="group in moduleGroups"
          :key="group.id"
          :data-testid="`workbench-nav-${group.id}`"
          class="min-w-max md:min-w-0"
        >
          <h2 v-show="!sidebarCollapsed" class="mb-2 hidden px-3 text-[10px] font-semibold tracking-[0.14em] text-[#a0a5ae] md:block">{{ group.label }}</h2>
          <div class="flex gap-1.5 md:grid md:gap-1">
            <button
              v-for="item in group.items"
              :key="item.id"
              type="button"
              :data-testid="`workbench-nav-${item.id}`"
              class="group relative flex min-w-[116px] items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition md:min-w-0"
              :class="activeModule === item.id ? 'bg-[#edf4ff] text-[#1769e0]' : 'text-[#626976] hover:bg-[#f6f7f9] hover:text-[#25282e]'"
              :aria-current="activeModule === item.id ? 'page' : undefined"
              @click="activeModule = item.id"
            >
              <span v-if="activeModule === item.id" class="absolute bottom-1.5 left-0 top-1.5 hidden w-[3px] rounded-r-full bg-[#1769e0] md:block" />
              <component :is="item.icon" class="h-4 w-4 shrink-0" />
              <span v-show="!sidebarCollapsed" class="min-w-0">
                <strong class="block truncate text-xs font-semibold">{{ item.label }}</strong>
                <small class="mt-0.5 hidden truncate text-[9px] font-normal text-[#9399a3] md:block">{{ item.description }}</small>
              </span>
            </button>
          </div>
        </section>
      </nav>
      <section v-if="!sidebarCollapsed" data-testid="org-scope-drawer" class="border-t border-[#eef0f3] px-2 py-4">
        <h2 class="mb-2 px-3 text-[10px] font-semibold tracking-[0.14em] text-[#a0a5ae]">部门与身份</h2>
        <div class="elegant-scrollbar max-h-[calc(100vh-430px)] overflow-y-auto">
          <div v-for="root in organizationScopeTree" :key="root.id" class="mb-0.5">
            <div class="flex items-center gap-1">
              <button v-if="root.children?.length" type="button" class="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#9aa1ac] hover:bg-[#f4f6f8]" :aria-label="`${expandedScopes.has(root.id) ? '收起' : '展开'}${root.label}`" @click="toggleScopeRoot(root.id)">
                <ChevronDown v-if="expandedScopes.has(root.id)" class="h-3.5 w-3.5" />
                <ChevronRight v-else class="h-3.5 w-3.5" />
              </button>
              <span v-else class="h-7 w-7" />
              <button :data-testid="`org-scope-node-${root.id}`" type="button" class="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition" :class="selectedOrganizationScope === root.id ? 'bg-[#edf4ff] font-semibold text-[#1769e0]' : 'text-[#4f5662] hover:bg-[#f5f6f8]'" @click="selectedOrganizationScope = root.id">
                <UserRound v-if="root.kind === 'personal'" class="h-3.5 w-3.5 shrink-0" />
                <Building2 v-else class="h-3.5 w-3.5 shrink-0" />
                <span class="truncate">{{ root.label }}</span>
              </button>
            </div>
            <div v-if="root.children?.length && expandedScopes.has(root.id)" class="ml-9 mt-0.5 grid gap-0.5">
              <button v-for="child in root.children" :key="child.id" :data-testid="`org-scope-node-${child.id}`" type="button" class="truncate rounded-lg px-3 py-1.5 text-left text-[11px] transition" :class="selectedOrganizationScope === child.id ? 'bg-[#edf4ff] font-semibold text-[#1769e0]' : 'text-[#69717d] hover:bg-[#f6f8fb]'" @click="selectedOrganizationScope = child.id">{{ child.label }}</button>
            </div>
          </div>
        </div>
      </section>
    </aside>

    <section class="flex min-h-0 min-w-0 flex-1 flex-col">
      <div data-testid="workbench-main-grid" class="min-h-0 flex-1 bg-white p-4 md:p-6">
        <div v-show="activeModule === 'digest'" data-testid="workbench-module-digest" class="workbench-module-page h-full">
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
        </div>
        <div v-show="activeModule === 'email'" data-testid="workbench-module-email" class="workbench-module-page h-full">
          <EmailSummaryPanel v-if="isPersonalScope" :items="emailBoard.data.value.items" :connection-state="emailBoard.data.value.connected ? 'live' : 'pending'" :refreshing="emailBoard.refreshing.value" :has-more="emailBoard.data.value.hasMore" :loading-more="loadingMoreEmail" @refresh="emailBoard.refresh" @load-more="loadMoreEmail" />
          <EmailSummaryPanel v-else />
        </div>
        <div v-show="activeModule === 'system'" data-testid="workbench-module-system" class="workbench-module-page h-full">
          <SystemPortalPanel :refreshing="portalBoard.refreshing.value" @refresh="portalBoard.refresh" />
        </div>
        <div v-show="activeModule === 'schedule'" data-testid="workbench-module-schedule" class="workbench-module-page h-full">
          <ScheduleBoardPanel v-if="isPersonalScope" :schedules="scheduleBoard.data.value.items" :data-mode="scheduleBoard.data.value.source" :current-user-name="scheduleBoard.data.value.identityName" :loading="scheduleBoard.refreshing.value && !scheduleBoard.data.value.items.length" :refreshing="scheduleBoard.refreshing.value" :error="scheduleBoard.error.value || null" :can-manage-permissions="canManageSchedulePermissions" @refresh="scheduleBoard.refresh" />
          <ScheduleBoardPanel v-else :can-manage-permissions="canManageSchedulePermissions" />
        </div>
        <div v-show="activeModule === 'todo'" data-testid="workbench-module-todo" class="workbench-module-page h-full">
          <TodoCenterPanel v-if="isPersonalScope" :todos="todoBoard.data.value.todos" :approvals="todoBoard.data.value.approvals" :data-mode="todoBoard.data.value.source" :loading="todoBoard.refreshing.value && !todoBoard.data.value.todos.length" :refreshing="todoBoard.refreshing.value" :error="todoBoard.error.value || null" @refresh="todoBoard.refresh" />
          <TodoCenterPanel v-else />
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.workbench-module-page {
  min-height: 520px;
}

.workbench-module-page :deep(> section) {
  height: 100% !important;
  min-height: 520px;
  overflow: visible;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

@media (min-width: 768px) {
  .workbench-function-nav {
    min-height: calc(100vh - 64px);
  }

  .workbench-module-page {
    height: calc(100vh - 104px);
  }
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
