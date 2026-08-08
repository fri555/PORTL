<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Bot, Check, ChevronDown, ClipboardList, ExternalLink, MessageCircle, Plus, RefreshCw, Search, Send, X } from 'lucide-vue-next'
import { workbenchApprovals, workbenchTodoPressure, workbenchTodos } from '@/mock/workbench'
import { fetchDwsTodoComments, publishDwsTodoComment } from '@/services/dws-workbench'
import type { ApprovalItem, TodoComment, TodoItem } from '@/types/workbench'

type ItemType = 'all' | 'approval' | 'task'
type WorkItem = { kind: 'approval'; item: ApprovalItem } | { kind: 'task'; item: TodoItem }

const props = defineProps<{
  todos?: TodoItem[]
  approvals?: ApprovalItem[]
  dataMode?: 'live' | 'snapshot'
  loading?: boolean
  error?: string | null
  refreshing?: boolean
}>()

const emit = defineEmits<{ refresh: [] }>()

const query = ref('')
const itemType = ref<ItemType>('all')
const todos = ref((props.todos ?? workbenchTodos).map((item) => ({ ...item })))
const commentTodo = ref<TodoItem | null>(null)
const todoComments = ref<TodoComment[]>([])
const commentDraft = ref('')
const commentFeedback = ref('')
const commentsLoading = ref(false)
const commentPublishing = ref(false)
const commentPosition = ref({ left: 16, top: 16 })
const createDrawerOpen = ref(false)
const selectedWork = ref<WorkItem | null>(null)
const createTitle = ref('')
const createDescription = ref('')

const itemTypes: Array<{ id: ItemType; label: string }> = [
  { id: 'all', label: '全部' }, { id: 'approval', label: '审批' }, { id: 'task', label: '任务' },
]

const displayItems = computed<WorkItem[]>(() => {
  const approvals: WorkItem[] = itemType.value === 'task' ? [] : (props.approvals ?? workbenchApprovals).filter(matchesQuery).map((item) => ({ kind: 'approval', item }))
  const tasks: WorkItem[] = itemType.value === 'approval' ? [] : todos.value.filter(matchesQuery).map((item) => ({ kind: 'task', item }))
  return [...approvals, ...tasks].sort(compareItems)
})
const todayItemCount = computed(() => [
  ...(props.approvals ?? workbenchApprovals).map((item) => item.due),
  ...todos.value.map((item) => item.due),
].filter((due) => due.startsWith('今天')).length)
const liveWorkItemSummary = computed(() => {
  const approvals = props.approvals ?? []
  const pendingTodos = todos.value.filter((item) => !item.completed)
  return {
    total: approvals.length + todos.value.length,
    pending: approvals.filter((item) => item.status === '待审批').length + pendingTodos.length,
    approvals: approvals.length,
    todos: todos.value.length,
  }
})
const kanbanColumns = computed(() => {
  const pending = displayItems.value.filter((work) => !isProcessed(work))
  const done = displayItems.value.filter(isProcessed)
  const created = displayItems.value.filter(isCreatedByMe)
  const participated = displayItems.value.filter(isParticipatedByMe)
  return [
    { id: 'pending', label: '待处理的', items: pending, tone: 'bg-[#fffaf0]', showProgress: false, completed: 0 },
    { id: 'done', label: '已处理的', items: done, tone: 'bg-[#f1fbf6]', showProgress: false, completed: done.length },
    { id: 'created', label: '我创建的', items: created, tone: 'bg-[#f2f7ff]', showProgress: true, completed: created.filter(isProcessed).length },
    { id: 'participated', label: '我参与的', items: participated, tone: 'bg-[#f7f4ff]', showProgress: true, completed: participated.filter(isProcessed).length },
  ] as const
})

watch(() => props.todos, (value) => {
  todos.value = (value ?? workbenchTodos).map((item) => ({ ...item }))
})

function matchesQuery(item: object) {
  const keyword = query.value.trim().toLowerCase()
  return !keyword || Object.values(item).join(' ').toLowerCase().includes(keyword)
}
function compareItems(a: WorkItem, b: WorkItem) {
  const actionRank = (work: WorkItem) => work.item.aiAction === '优先' ? 0 : work.item.aiAction === '委派' ? 1 : isProcessed(work) ? 3 : 2
  const difference = actionRank(a) - actionRank(b)
  if (difference) return difference
  return dueRank(a.item.due) - dueRank(b.item.due)
}
function isProcessed(work: WorkItem) { return work.kind === 'task' ? work.item.completed : work.item.status !== '待审批' }
function isCreatedByMe(work: WorkItem) { return work.kind === 'task' ? work.item.scopes.includes('created') : work.item.scope === 'initiated' }
function isParticipatedByMe(work: WorkItem) { return work.kind === 'task' ? work.item.scopes.includes('responsible') || work.item.scopes.includes('assigned') : work.item.scope === 'cc' }
function completionRate(completed: number, total: number) { return total ? Math.round((completed / total) * 100) : 0 }
function dueRank(due: string) {
  if (due.startsWith('明天 10')) return 4
  if (due.startsWith('明天')) return 5
  if (due.includes('16:00')) return 1
  if (due.includes('17:00')) return 2
  if (due.includes('18:00')) return 3
  return 10
}
function approvalStatusClass(status: ApprovalItem['status']) {
  if (status === '审批通过') return 'bg-[#eaf8f1] text-[#087b4d]'
  if (status === '审批被拒绝') return 'bg-[#fff0ed] text-[#d84321]'
  if (status === '已撤销') return 'bg-[#f1f2f4] text-[#747b86]'
  return 'bg-[#eef4ff] text-[#1769e0]'
}
function todoStatusClass(status: TodoItem['status']) {
  return status === '已完成' ? 'bg-[#eaf8f1] text-[#087b4d]' : 'bg-[#f1f2f4] text-[#747b86]'
}
function priorityClass(priority: TodoItem['priority'] | ApprovalItem['priority']) {
  if (priority === '紧急' || priority === '高') return 'bg-[#fff0ed] text-[#d84321]'
  if (priority === '较高' || priority === '中') return 'bg-[#fff7e8] text-[#a85e00]'
  if (priority === '较低') return 'bg-[#f1f3f6] text-[#747b86]'
  return 'bg-[#eef3f8] text-[#657080]'
}
function urgencyLabel(priority: TodoItem['priority'] | ApprovalItem['priority']) {
  if (priority === '紧急' || priority === '高') return '高'
  if (priority === '较低') return '低'
  return '中'
}
function toggleTodo(id: string) {
  const todo = todos.value.find((item) => item.id === id)
  if (!todo) return
  todo.completed = !todo.completed
  todo.status = todo.completed ? '已完成' : '未完成'
}
function defaultCommentDraft(todo: TodoItem) { return `请同步「${todo.title}」当前进展、剩余问题和预计完成时间。` }
async function openComments(todo: TodoItem, event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect()
  const width = 420
  commentPosition.value = { left: Math.max(16, (rect?.left ?? width + 26) - width - 10), top: Math.max(16, Math.min((rect?.top ?? 16) - 90, window.innerHeight - 520)) }
  commentTodo.value = todo
  commentDraft.value = defaultCommentDraft(todo)
  commentFeedback.value = ''
  todoComments.value = todo.comments?.map((comment) => ({ ...comment })) ?? []
  if (props.dataMode === 'live' && todo.externalId) {
    commentsLoading.value = true
    try { todoComments.value = await fetchDwsTodoComments(todo.externalId) }
    catch (error) { commentFeedback.value = error instanceof Error ? error.message : '待办评论暂时无法读取' }
    finally { commentsLoading.value = false }
  }
}
async function publishComment() {
  if (!commentTodo.value || !commentDraft.value.trim() || commentPublishing.value) return
  commentPublishing.value = true
  commentFeedback.value = ''
  try {
    if (props.dataMode === 'live' && commentTodo.value.externalId) {
      todoComments.value.push(await publishDwsTodoComment(commentTodo.value.externalId, commentDraft.value.trim()))
      commentFeedback.value = '评论已发布到钉钉'
    } else {
      todoComments.value.push({ id: `demo-comment-${Date.now()}`, author: '当前用户', content: commentDraft.value.trim(), createdAt: '刚刚' })
      commentFeedback.value = '演示评论已确认，未写入钉钉'
    }
    commentTodo.value.comments = todoComments.value.map((comment) => ({ ...comment }))
  } catch (error) { commentFeedback.value = error instanceof Error ? error.message : '评论发布失败' }
  finally { commentPublishing.value = false }
}
</script>

<template>
  <section class="flex h-full min-h-[560px] flex-col bg-white">
    <div class="flex flex-wrap items-start justify-between gap-4 pb-4">
      <div>
        <h2 class="workbench-card-title text-[14px] !text-xl font-semibold tracking-[-0.02em] text-[#17191e]">待办中心</h2>
        <p class="mt-1 text-xs text-[#8a919b]">按处理状态与协作关系归集，一屏掌握个人任务进展</p>
      </div>
      <button data-testid="todo-create-task" type="button" class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1769e0] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#0f5cc8]" @click="createDrawerOpen = true"><Plus class="h-4 w-4" />新增任务</button>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef0f3] py-3">
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex rounded-lg bg-[#f4f5f7] p-1"><button v-for="type in itemTypes" :key="type.id" :data-testid="`todo-type-${type.id}`" class="rounded-md px-3 py-1.5 text-xs font-medium transition" :class="itemType === type.id ? 'bg-white text-[#202329] shadow-sm' : 'text-[#747b86]'" @click="itemType = type.id">{{ type.label }}</button></div>
        <div class="relative"><Search class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9aa0aa]" /><input v-model="query" aria-label="搜索待办中心" class="h-9 w-[210px] rounded-lg border border-[#dfe3e8] bg-white pl-8 pr-3 text-xs outline-none focus:border-[#7eaae9]" placeholder="搜索任务" /></div>
        <button aria-label="刷新待办中心" class="grid h-9 w-9 place-items-center rounded-lg border border-[#dfe3e8] text-[#68707b] hover:bg-[#f7f8fa]" @click="emit('refresh')"><RefreshCw class="h-4 w-4" :class="refreshing ? 'animate-spin' : ''" /></button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 border-y border-[#eef0f3] py-3">
      <p class="text-xs text-[#7b828d]">固定四类看板 · 同一事项可同时出现在状态与协作看板中</p>
      <div data-testid="todo-pressure-summary" class="ml-auto text-[10px] text-[#8a919b]"><span v-if="dataMode">当前账号工作项 {{ liveWorkItemSummary.total }} 项 · 待处理 {{ liveWorkItemSummary.pending }}</span><span v-else>今日待决 8 项 · 今日优先 {{ workbenchTodoPressure.mustDoToday }} · 逾期 {{ workbenchTodoPressure.overdue }} · 我创建临期 3</span></div>
    </div>

    <div data-testid="todo-today-count" class="sr-only"><span>今天</span><span>{{ todayItemCount }} 项</span></div>
    <div data-testid="todo-scroll-area" class="elegant-scrollbar min-h-0 flex-1 overflow-auto pt-4">
      <div v-if="loading" class="grid h-full min-h-[220px] place-items-center text-xs text-[#8b909a]">正在读取钉钉待办…</div>
      <div v-else-if="error" class="grid h-full min-h-[220px] place-items-center text-center"><div><ClipboardList class="mx-auto h-6 w-6 text-[#b2b7bf]" /><p class="mt-2 text-xs text-[#8b909a]">钉钉待办暂时不可用</p></div></div>
      <div v-else-if="!displayItems.length" class="grid h-full min-h-[220px] place-items-center text-center"><div><ClipboardList class="mx-auto h-6 w-6 text-[#b2b7bf]" /><p class="mt-2 text-xs text-[#8b909a]">{{ query ? '未找到匹配待办' : dataMode ? '当前钉钉账号暂无待办或待审批' : '当前筛选暂无待办' }}</p><button v-if="query" data-testid="clear-todo-search" type="button" class="mt-2 text-xs font-medium text-[#1769e0]" @click="query = ''">清空搜索</button></div></div>
      <div v-else class="grid min-w-[1180px] grid-cols-4 gap-4">
        <section v-for="column in kanbanColumns" :key="column.id" :data-testid="`todo-kanban-${column.id}`" class="overflow-hidden rounded-xl border border-[#dfe3e8] bg-[#fafbfc]">
          <header class="border-b border-[#e2e6eb] px-4 py-3" :class="column.tone">
            <div class="flex items-center gap-2"><h3 class="text-sm font-semibold text-[#25282e]">{{ column.label }}</h3><span class="rounded-full bg-white px-2 py-0.5 text-[10px] text-[#707782] shadow-sm">{{ column.items.length }}</span></div>
            <div v-if="column.showProgress" :data-testid="`todo-progress-${column.id}`" class="mt-2.5">
              <div class="mb-1.5 flex items-center justify-between text-[10px]"><span class="text-[#737b87]">完成进度</span><strong class="font-semibold text-[#3d4652]">{{ column.completed }}/{{ column.items.length }}</strong></div>
              <div class="h-1.5 overflow-hidden rounded-full bg-white/90 ring-1 ring-black/[0.04]"><div class="h-full rounded-full bg-[#1769e0] transition-[width] duration-300" :style="{ width: `${completionRate(column.completed, column.items.length)}%` }" /></div>
            </div>
          </header>
          <div class="grid gap-3 p-3">
      <div v-if="!column.items.length" class="grid min-h-[132px] place-items-center rounded-xl border border-dashed border-[#dfe3e8] bg-white/60 px-4 text-center text-xs text-[#9aa0aa]">暂无{{ column.label }}事项</div>
      <article v-for="work in column.items" :key="work.item.id" :data-testid="`work-item-${work.item.id}`" class="rounded-xl border border-[#e0e4e9] bg-white p-4 shadow-[0_2px_7px_rgba(15,23,42,0.025)] transition hover:border-[#b9c9df] hover:shadow-sm" :class="work.kind === 'task' && work.item.completed ? 'opacity-65' : ''">
        <div :data-testid="work.kind === 'task' ? `todo-item-${work.item.id}` : undefined">
          <div class="flex items-start gap-2">
          <a v-if="work.kind === 'approval'" :data-testid="`approval-open-dingtalk-${work.item.id}`" href="https://www.dingtalk.com/" target="_blank" rel="noreferrer" :aria-label="`前往钉钉处理审批：${work.item.title}`" title="前往钉钉处理审批" class="group/approval relative mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md bg-[#edf3ff] text-[#1769e0] transition hover:bg-[#dfeaff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1769e0]"><ExternalLink class="h-3.5 w-3.5" /><span class="pointer-events-none absolute left-7 top-1/2 z-30 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#202329] px-2 py-1.5 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/approval:opacity-100 group-focus-visible/approval:opacity-100">前往钉钉处理审批</span></a>
          <button v-else :aria-label="`${work.item.completed ? '恢复' : '完成'}任务：${work.item.title}`" class="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded border" :class="work.item.completed ? 'border-[#22252b] bg-[#22252b] text-white' : 'border-[#c4c8cf] text-transparent'" @click="toggleTodo(work.item.id)"><Check class="h-3 w-3" /></button>
          <div class="min-w-0 flex-1">
            <button type="button" class="block max-w-full text-left" @click="selectedWork = work"><h3 class="workbench-item-title truncate text-[14px] font-semibold text-[#25282e]" :class="work.kind === 'task' && work.item.completed ? 'line-through' : ''">{{ work.item.title }}</h3></button>
          </div>
          <span :data-testid="`${work.kind === 'task' ? 'todo' : 'approval'}-priority-${work.item.id}`" class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="priorityClass(work.item.priority)">{{ urgencyLabel(work.item.priority) }}</span>
          </div>
          <p class="mt-2 line-clamp-2 text-xs leading-5 text-[#7b828d]">{{ work.kind === 'approval' ? `${work.item.applicant}提交的审批事项` : work.item.aiSuggestion || work.item.sourceDetail || `来自${work.item.source}的任务` }}</p>
          <div class="mt-3 flex items-center justify-between gap-2 text-[10px] text-[#8a919b]"><span>{{ work.kind === 'approval' ? `申请人：${work.item.applicant}` : `负责人：${work.item.owner}` }}</span><span>{{ work.item.due }}</span></div>
          <div class="mt-3 flex items-center justify-between gap-2"><span class="rounded-md bg-[#f3f4f6] px-2 py-1 text-[10px] text-[#666e78]">{{ work.kind === 'approval' ? '审批' : work.item.source }}</span>
            <div class="flex items-center justify-end gap-1.5">
              <button v-if="work.kind === 'task' && work.item.scopes.includes('created')" :data-testid="`todo-comments-${work.item.id}`" type="button" :aria-label="`查看并跟进评论：${work.item.title}`" class="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-[#dfe5ee] bg-white px-2 text-[10px] font-medium leading-none text-[#596575] transition hover:border-[#bfd2f2] hover:bg-[#f5f8ff] hover:text-[#1769e0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fb5f3]" @click="openComments(work.item, $event)"><MessageCircle class="h-3 w-3" />跟进</button>
              <span v-if="work.kind === 'approval'" :data-testid="`approval-status-${work.item.id}`" class="workbench-meta-copy inline-flex h-7 items-center rounded-full px-2 text-[10px] font-medium leading-none" :class="approvalStatusClass(work.item.status)">{{ work.item.status }}</span>
              <span v-else :data-testid="`todo-status-${work.item.id}`" class="workbench-meta-copy inline-flex h-7 items-center rounded-full px-2 text-[10px] font-medium leading-none" :class="todoStatusClass(work.item.status)">{{ work.item.status }}</span>
            </div>
          </div>
        </div>
      </article>
          </div>
        </section>
      </div>
    </div>

    <div v-if="createDrawerOpen || selectedWork" class="fixed inset-0 z-[160] bg-black/25" @click.self="createDrawerOpen = false; selectedWork = null">
      <aside v-if="createDrawerOpen" data-testid="todo-create-drawer" class="absolute bottom-0 right-0 top-0 flex w-full max-w-[560px] flex-col bg-white shadow-2xl">
        <header class="flex items-center justify-between border-b px-6 py-5"><div><h3 class="text-base font-semibold">新增任务</h3><p class="mt-1 text-xs text-[#8a919b]">手动新增任务并派发给执行人</p></div><button aria-label="关闭新增任务" class="grid h-9 w-9 place-items-center rounded-lg hover:bg-[#f4f5f7]" @click="createDrawerOpen = false"><X class="h-4 w-4" /></button></header>
        <div class="flex-1 space-y-5 overflow-y-auto px-6 py-6"><label class="block text-sm font-medium">任务名称 <span class="text-red-500">*</span><input v-model="createTitle" class="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-[#1769e0]" placeholder="请输入任务名称" /></label><label class="block text-sm font-medium">任务描述<textarea v-model="createDescription" class="mt-2 min-h-[120px] w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#1769e0]" placeholder="请输入任务描述" /></label><div class="grid grid-cols-2 gap-4"><label class="text-sm font-medium">执行人 <button class="mt-2 flex h-10 w-full items-center justify-between rounded-lg border px-3 text-[#777]">选择执行人<ChevronDown class="h-4 w-4" /></button></label><label class="text-sm font-medium">截止时间<input type="date" class="mt-2 h-10 w-full rounded-lg border px-3" /></label></div></div>
        <footer class="flex justify-end gap-2 border-t px-6 py-4"><button class="rounded-lg border px-4 py-2 text-sm" @click="createDrawerOpen = false">取消</button><button class="rounded-lg bg-[#1769e0] px-4 py-2 text-sm font-medium text-white" @click="createDrawerOpen = false">创建并发送</button></footer>
      </aside>
      <aside v-else-if="selectedWork" data-testid="todo-detail-drawer" class="absolute bottom-0 right-0 top-0 flex w-full max-w-[560px] flex-col bg-white shadow-2xl"><header class="flex items-center justify-between border-b px-6 py-5"><div><h3 class="text-base font-semibold">任务详情</h3><p class="mt-1 text-xs text-[#8a919b]">{{ selectedWork.item.title }}</p></div><button aria-label="关闭任务详情" class="grid h-9 w-9 place-items-center rounded-lg hover:bg-[#f4f5f7]" @click="selectedWork = null"><X class="h-4 w-4" /></button></header><div class="flex-1 space-y-6 overflow-y-auto px-6 py-6"><div><p class="text-xs text-[#8a919b]">任务名称</p><p class="mt-2 text-sm font-medium">{{ selectedWork.item.title }}</p></div><div><p class="text-xs text-[#8a919b]">负责人</p><p class="mt-2 text-sm">{{ selectedWork.kind === 'task' ? selectedWork.item.owner : selectedWork.item.applicant }}</p></div><div><p class="text-xs text-[#8a919b]">截止时间</p><p class="mt-2 text-sm">{{ selectedWork.item.due }}</p></div></div><footer class="flex justify-end border-t px-6 py-4"><button class="rounded-lg bg-[#1769e0] px-4 py-2 text-sm font-medium text-white" @click="selectedWork = null">保存修改</button></footer></aside>
    </div>

    <aside v-if="commentTodo" data-testid="todo-comments-floating" role="dialog" :aria-label="`${commentTodo.title}评论`" class="fixed z-[170] w-[420px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[22px] border border-white/90 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.24)]" :style="{ left: `${commentPosition.left}px`, top: `${commentPosition.top}px` }">
      <header class="flex items-start justify-between gap-4 border-b border-[#edf0f4] px-5 py-4"><div><p class="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] text-[#1769e0]"><MessageCircle class="h-3.5 w-3.5" />评论动态</p><h3 class="mt-1 text-[14px] font-semibold text-[#25282e]">{{ commentTodo.title }}</h3></div><button type="button" aria-label="关闭评论" class="grid h-7 w-7 place-items-center rounded-lg text-[#9097a1] hover:bg-[#f2f4f7]" @click="commentTodo = null"><X class="h-3.5 w-3.5" /></button></header>
      <div class="max-h-[220px] overflow-y-auto px-5 py-3"><p v-if="commentsLoading" class="py-6 text-center text-xs text-[#8b909a]">正在读取钉钉评论…</p><div v-else-if="todoComments.length" class="space-y-2"><article v-for="comment in todoComments" :key="comment.id" class="rounded-xl bg-[#f7f8fa] px-3 py-2.5"><div class="flex justify-between gap-3 text-[10px]"><strong class="text-[#4f5966]">{{ comment.author }}</strong><span class="text-[#9aa0aa]">{{ comment.createdAt }}</span></div><p class="mt-1 text-xs leading-5 text-[#646c77]">{{ comment.content }}</p></article></div><p v-else class="py-6 text-center text-xs text-[#8b909a]">暂无评论，可以发送第一条跟进</p></div>
      <div class="border-t border-[#edf0f4] bg-[#fafbfc] px-5 py-4"><p class="flex items-center gap-1.5 text-[10px] font-semibold text-[#7652d6]"><Bot class="h-3.5 w-3.5" />AI 跟进草稿</p><textarea v-model="commentDraft" data-testid="todo-comment-draft" class="mt-2 min-h-[76px] w-full rounded-xl border border-[#dde3eb] bg-white px-3 py-2 text-xs leading-5 text-[#363b43] outline-none focus:border-[#9d85e6]" /><p v-if="commentFeedback" data-testid="todo-comment-feedback" class="mt-2 text-[10px] text-[#68717d]">{{ commentFeedback }}</p><div class="mt-3 flex items-center justify-between gap-3"><p class="text-[10px] text-[#9aa0aa]">确认后才发布，不自动催办</p><button data-testid="todo-comment-publish" type="button" :disabled="!commentDraft.trim() || commentPublishing" class="inline-flex items-center gap-1.5 rounded-xl bg-[#1769e0] px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-45" @click="publishComment"><Send class="h-3 w-3" />{{ commentPublishing ? '发布中…' : '发布评论' }}</button></div></div>
    </aside>
  </section>
</template>
