# Workbench C1+ AI MCP Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `frontend-mvp` workbench page into the approved C1+ layout with top summary + AI assistant, message summary, system entry, schedule board, todo center, and large confirmed creation panel.

**Architecture:** Keep this as a high-fidelity Vue 3 mock implementation. Extend existing `src/types/workbench.ts` and `src/mock/workbench.ts` for message summaries, approvals, and creation panel seed data; replace `SystemPortalsView.vue` layout while preserving existing portal, favorite, upload, calendar, and todo behaviors.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Tailwind CSS utility classes, lucide-vue-next icons, existing Vitest test setup.

## Global Constraints

- The implementation is scoped to `frontend-mvp`.
- Do not implement real DingTalk MCP calls in this task.
- AI one-sentence creation must only prefill a confirmation panel; it must not directly create or sync externally.
- Do not implement “发起审批” forms in this MVP.
- Keep system entry at the lower-left area with fixed height and internal scrolling.
- Top summary and AI assistant must be in the same visual card row.
- Top summary only shows unread messages, pending items, and today schedules; no conflict reminder metric and no common-system metric.
- Preserve unrelated user changes in the dirty worktree.

---

### Task 1: Extend Workbench Data Model and Mock Data

**Files:**
- Modify: `/Users/richelleshi/workspace/portal/frontend-mvp/src/types/workbench.ts`
- Modify: `/Users/richelleshi/workspace/portal/frontend-mvp/src/mock/workbench.ts`

**Interfaces:**
- Produces:
  - `MessagePriority = '高' | '中' | '低'`
  - `MessageSummaryItem`
  - `ApprovalScope = 'pending' | 'done' | 'initiated' | 'cc'`
  - `ApprovalItem`
  - `CreationKind = 'schedule' | 'todo'`
  - `workbenchMessageSummaries: MessageSummaryItem[]`
  - `workbenchApprovals: ApprovalItem[]`

- [ ] **Step 1: Add exported types**

Add these definitions to `/Users/richelleshi/workspace/portal/frontend-mvp/src/types/workbench.ts` after the existing todo types:

```ts
export type MessagePriority = '高' | '中' | '低'

export interface MessageSummaryItem {
  id: string
  sender: string
  source: string
  unreadCount: number
  priority: MessagePriority
  reason: string
  summary: string
  actionHint: string
}

export type ApprovalScope = 'pending' | 'done' | 'initiated' | 'cc'

export interface ApprovalItem {
  id: string
  title: string
  scope: ApprovalScope
  applicant: string
  due: string
  priority: TodoPriority
  status: TodoStatus
  source: string
}

export type CreationKind = 'schedule' | 'todo'
```

- [ ] **Step 2: Add mock exports**

Add imports for `ApprovalItem` and `MessageSummaryItem` at the top of `/Users/richelleshi/workspace/portal/frontend-mvp/src/mock/workbench.ts`, then append:

```ts
export const workbenchMessageSummaries: MessageSummaryItem[] = [
  {
    id: 'msg-1',
    sender: '张总',
    source: '单聊',
    unreadCount: 3,
    priority: '高',
    reason: '单聊 + @我 + 高优先发送人',
    summary: '询问产品需求评审时间是否确认，需要今天上午给出反馈。',
    actionHint: '建议立即回复',
  },
  {
    id: 'msg-2',
    sender: '项目 Alpha 群',
    source: '群聊',
    unreadCount: 12,
    priority: '中',
    reason: '群聊未读较多 + 包含需求材料变更',
    summary: '评审材料有新版附件，技术侧要求补充接口影响说明。',
    actionHint: '今日内处理',
  },
  {
    id: 'msg-3',
    sender: '运营通知群',
    source: '群聊',
    unreadCount: 8,
    priority: '低',
    reason: '免打扰群 + 通知类消息',
    summary: '今晚 23:00 有系统维护通知，不影响当前工作安排。',
    actionHint: '空闲时查看',
  },
]

export const workbenchApprovals: ApprovalItem[] = [
  {
    id: 'approval-1',
    title: '采购预算申请',
    scope: 'pending',
    applicant: '李娜',
    due: '今天 16:00 截止',
    priority: '高',
    status: '待处理',
    source: 'OA审批',
  },
  {
    id: 'approval-2',
    title: '用车申请',
    scope: 'pending',
    applicant: '王杰',
    due: '今天 18:00 截止',
    priority: '中',
    status: '待处理',
    source: 'OA审批',
  },
  {
    id: 'approval-3',
    title: '合同用印申请',
    scope: 'done',
    applicant: '陈晨',
    due: '昨天已处理',
    priority: '普通',
    status: '已完成',
    source: 'OA审批',
  },
  {
    id: 'approval-4',
    title: '外出申请',
    scope: 'initiated',
    applicant: '张明',
    due: '审批中',
    priority: '普通',
    status: '进行中',
    source: 'OA审批',
  },
  {
    id: 'approval-5',
    title: '订单付款审核',
    scope: 'cc',
    applicant: '财务二部',
    due: '抄送给我',
    priority: '中',
    status: '待处理',
    source: 'OA审批',
  },
]
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
cd /Users/richelleshi/workspace/portal/frontend-mvp
npm run typecheck
```

Expected: TypeScript finishes with no errors related to the new types.

### Task 2: Replace Workbench Layout with C1+ Structure

**Files:**
- Modify: `/Users/richelleshi/workspace/portal/frontend-mvp/src/views/SystemPortalsView.vue`

**Interfaces:**
- Consumes:
  - Existing `workbenchPortals`, `workbenchSchedules`, `workbenchTodos`
  - New `workbenchMessageSummaries`, `workbenchApprovals`
- Produces:
  - Top combined summary + AI assistant card
  - Four large cards: message summary, system entry, schedule board, todo center

- [ ] **Step 1: Update imports and state**

In `SystemPortalsView.vue`, add imports for `MessageCircle`, `Plus`, `Send`, `Users`, `X`, `Clock3`, and remove unused assistant-shortcut imports/state. Import new mock data and types:

```ts
import {
  workbenchApprovals,
  workbenchMessageSummaries,
  portalCategories,
  workbenchPortals,
  workbenchSchedules,
  workbenchTodos,
} from '@/mock/workbench'
import type {
  ApprovalScope,
  CreationKind,
  MessagePriority,
  PortalCategoryId,
  PortalTone,
  ScheduleStatus,
  TodoPriority,
  TodoScope,
  TodoStatus,
  WorkbenchPortal,
} from '@/types/workbench'
```

Add state:

```ts
const assistantInput = ref('')
const isCreatePanelOpen = ref(false)
const creationKind = ref<CreationKind>('schedule')
const creationNotice = ref('')
const todoQuery = ref('')
const approvalScope = ref<ApprovalScope>('pending')
```

- [ ] **Step 2: Add computed values**

Add computed values:

```ts
const highPriorityMessages = computed(() =>
  workbenchMessageSummaries.filter((item) => item.priority === '高').length,
)
const unreadMessageCount = computed(() =>
  workbenchMessageSummaries.reduce((sum, item) => sum + item.unreadCount, 0),
)
const pendingApprovalCount = computed(() =>
  workbenchApprovals.filter((item) => item.scope === 'pending').length,
)
const pendingTaskCount = computed(() =>
  todos.value.filter((item) => item.status !== '已完成').length,
)
const todayScheduleCount = computed(() =>
  workbenchSchedules.filter((item) => item.date === toDateKey(now)).length,
)
const nextSchedule = computed(() =>
  workbenchSchedules.find((item) => item.date === toDateKey(now)),
)
```

Add filtered approvals and combined pending filtering:

```ts
const approvalTabs: Array<{ id: ApprovalScope; label: string }> = [
  { id: 'pending', label: '待处理' },
  { id: 'done', label: '已处理' },
  { id: 'initiated', label: '我发起的' },
  { id: 'cc', label: '抄送我的' },
]

const filteredApprovals = computed(() => {
  const query = todoQuery.value.trim().toLowerCase()
  return workbenchApprovals
    .filter((item) => item.scope === approvalScope.value)
    .filter((item) => !query || `${item.title}${item.applicant}${item.source}${item.due}`.toLowerCase().includes(query))
})
```

Modify `filteredTodos` to respect `todoQuery`:

```ts
const filteredTodos = computed(() => {
  const scope = todoScope.value
  const query = todoQuery.value.trim().toLowerCase()
  const scoped = scope === 'all'
    ? todos.value
    : todos.value.filter((item) => item.scopes.includes(scope))
  return scoped
    .filter((item) => !query || `${item.title}${item.owner}${item.creator}${item.assignee}${item.source}${item.due}`.toLowerCase().includes(query))
    .sort((a, b) => taskRank(a.status, a.due) - taskRank(b.status, b.due))
})
```

- [ ] **Step 3: Add creation handlers**

Add:

```ts
function openCreatePanel(kind: CreationKind = 'schedule') {
  creationKind.value = kind
  creationNotice.value = ''
  isCreatePanelOpen.value = true
}

function closeCreatePanel() {
  isCreatePanelOpen.value = false
  creationNotice.value = ''
}

function handleAssistantSubmit() {
  const text = assistantInput.value.trim()
  if (!text) return
  const isTodoIntent = /待办|任务|跟进|截止/.test(text)
  openCreatePanel(isTodoIntent ? 'todo' : 'schedule')
  creationNotice.value = 'AI 已解析你的输入并预填表单，请确认后再创建。'
}

function confirmCreate() {
  creationNotice.value = creationKind.value === 'schedule'
    ? '已模拟创建日程：确认后未来将调用钉钉日历 MCP。'
    : '已模拟创建待办：确认后未来将调用钉钉待办 MCP。'
}
```

- [ ] **Step 4: Replace template**

Replace the template contents after the root page wrapper with C1+:

1. Keep root `data-testid="workbench-dashboard"`.
2. Add top card with:
   - 今日工作概览
   - 未读消息 metric with `unreadMessageCount`
   - 待处理事项 metric with `pendingApprovalCount + pendingTaskCount`
   - 今日日程 metric with `todayScheduleCount`
   - AI 工作助手 form using `assistantInput` and `handleAssistantSubmit`
3. Add lower grid with:
   - 消息摘要 card using `workbenchMessageSummaries`
   - 系统入口 card reusing existing filtered portal list and favorite/upload controls
   - 日程看板 card reusing calendar and `selectedSchedules`
   - 待办中心 card using approval tabs + todo tabs
4. Add create panel overlay controlled by `isCreatePanelOpen`.

- [ ] **Step 5: Run focused typecheck**

Run:

```bash
cd /Users/richelleshi/workspace/portal/frontend-mvp
npm run typecheck
```

Expected: pass.

### Task 3: Update Workbench Tests

**Files:**
- Modify: `/Users/richelleshi/workspace/portal/frontend-mvp/src/views/__tests__/SystemPortalsView.spec.ts`

**Interfaces:**
- Consumes updated `SystemPortalsView.vue`
- Produces coverage for:
  - top summary
  - AI creation confirmation panel
  - system entry search/favorite still works
  - schedule and todo areas render

- [ ] **Step 1: Inspect existing tests**

Read:

```bash
sed -n '1,260p' /Users/richelleshi/workspace/portal/frontend-mvp/src/views/__tests__/SystemPortalsView.spec.ts
```

- [ ] **Step 2: Update assertions**

Ensure tests assert:

```ts
expect(wrapper.text()).toContain('今日工作概览')
expect(wrapper.text()).toContain('AI 工作助手')
expect(wrapper.text()).toContain('消息摘要')
expect(wrapper.text()).toContain('系统入口')
expect(wrapper.text()).toContain('日程看板')
expect(wrapper.text()).toContain('待办中心')
```

Add AI command test:

```ts
it('opens the confirmation panel after an AI one-sentence create command', async () => {
  const wrapper = mountView()
  const input = wrapper.get('[data-testid="assistant-command-input"]')
  await input.setValue('明天 10 点约张总开需求评审')
  await wrapper.get('[data-testid="assistant-command-submit"]').trigger('submit')
  expect(wrapper.text()).toContain('AI 已解析你的输入并预填表单')
  expect(wrapper.text()).toContain('新建日程')
  expect(wrapper.text()).toContain('确认创建')
})
```

Add no approval creation assertion:

```ts
expect(wrapper.text()).not.toContain('发起审批')
```

- [ ] **Step 3: Run focused tests**

Run:

```bash
cd /Users/richelleshi/workspace/portal/frontend-mvp
npm run test -- --run src/views/__tests__/SystemPortalsView.spec.ts
```

Expected: all tests in this file pass.

### Task 4: Validate Build and Handoff

**Files:**
- Verify only, no new files required.

**Interfaces:**
- Consumes final implementation.
- Produces validation output and handoff notes.

- [ ] **Step 1: Run production build**

Run:

```bash
cd /Users/richelleshi/workspace/portal/frontend-mvp
VITE_BASE_PATH=/PORTL/ VITE_ROUTER_MODE=hash npm run build
```

Expected: build succeeds.

- [ ] **Step 2: Optionally run local server**

If the user wants to view it locally, run:

```bash
cd /Users/richelleshi/workspace/portal/frontend-mvp
npm run dev -- --host 127.0.0.1 --port 5176
```

Expected: app is available at `http://127.0.0.1:5176/PORTL/portals`.

- [ ] **Step 3: Summarize changed files**

Report:

- `/Users/richelleshi/workspace/portal/frontend-mvp/src/views/SystemPortalsView.vue`
- `/Users/richelleshi/workspace/portal/frontend-mvp/src/mock/workbench.ts`
- `/Users/richelleshi/workspace/portal/frontend-mvp/src/types/workbench.ts`
- `/Users/richelleshi/workspace/portal/frontend-mvp/src/views/__tests__/SystemPortalsView.spec.ts`

