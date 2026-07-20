# Workbench Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/portals` as a 60:40 enterprise workbench with real system entries, calendar, daily schedule, and interactive todo list while keeping the global header unchanged.

**Architecture:** Keep the page as one route-level view and move typed workbench fixtures/date helpers into focused files. The view owns local search, selected date, month, todo filter, and completion state; existing external portal click behavior remains intact.

**Tech Stack:** Vue 3 Composition API, TypeScript, Vue Router, Tailwind CSS, lucide-vue-next, Vitest, Vue Test Utils.

---

### Task 1: Route regression contract

**Files:**
- Create: `frontend-mvp/src/views/__tests__/SystemPortalsView.spec.ts`
- Read: `frontend-mvp/src/router/index.ts`

- [ ] Write a failing regression test that resolves `/knowledge`, `/portals`, and `/admin/governance` and expects route names `knowledge`, `portals`, and `ai-governance`.
- [ ] Run `npm test -- --run src/views/__tests__/SystemPortalsView.spec.ts --reporter=dot`; confirm the view-interaction assertions fail before the redesign while route assertions pass.

### Task 2: Typed workbench fixtures and date helpers

**Files:**
- Create: `frontend-mvp/src/types/workbench.ts`
- Create: `frontend-mvp/src/mock/workbench.ts`
- Create: `frontend-mvp/src/lib/workbench-calendar.ts`
- Test: `frontend-mvp/src/views/__tests__/SystemPortalsView.spec.ts`

- [ ] Define `WorkbenchPortal`, `ScheduleItem`, `TodoItem`, `TodoScope`, and `CalendarDay` interfaces.
- [ ] Add the 11 confirmed portals: AI大模型、天马运动、大库存、售后工单、内容中心、需求管理系统、新运营、【自营】订单系统、第三方系统、新零售、耶运动-视觉内容中心.
- [ ] Add realistic schedules and todos covering active, upcoming, pending, overdue, responsible, and participating states.
- [ ] Implement `buildMonthDays(year, month)` returning a 42-cell Monday-first calendar and unit-test current/adjacent-month flags.

### Task 3: High-fidelity 60:40 layout

**Files:**
- Replace: `frontend-mvp/src/views/SystemPortalsView.vue`
- Test: `frontend-mvp/src/views/__tests__/SystemPortalsView.spec.ts`

- [ ] Add failing assertions for `data-testid="workbench-dashboard"`, the 11 system labels, `grid-template-columns: minmax(0, 3fr) minmax(430px, 2fr)`, calendar heading, schedule heading, and todo heading.
- [ ] Implement the greeting/weather/date summary without modifying `AppHeader.vue`.
- [ ] Implement the left 60% system panel with three-column portal cards, search, empty state, and total-count footer.
- [ ] Implement the right 40% calendar/schedule top region and todo bottom region using the reference screenshot's white cards, hairline borders, blue highlights, and dense spacing.
- [ ] Run the focused test and confirm structural assertions pass.

### Task 4: Calendar, schedule, and todo interactions

**Files:**
- Modify: `frontend-mvp/src/views/SystemPortalsView.vue`
- Test: `frontend-mvp/src/views/__tests__/SystemPortalsView.spec.ts`

- [ ] Add tests for next-month navigation, date selection, todo scope switching, todo completion toggling, system searching, and clearing an empty search.
- [ ] Implement month navigation and “今天” reset with calendar cells derived from `buildMonthDays`.
- [ ] Implement selected-day schedule filtering and an empty schedule state.
- [ ] Implement todo tabs and local completion toggles with completed styling.
- [ ] Run the focused test and confirm all interaction assertions pass.

### Task 5: Verification and runtime handoff

**Files:**
- Verify: `frontend-mvp/src/views/SystemPortalsView.vue`
- Verify: `frontend-mvp/src/views/__tests__/SystemPortalsView.spec.ts`

- [ ] Run `npm run typecheck` and `npm run build`; expect exit code 0.
- [ ] Run the focused workbench and governance tests together; expect all new tests to pass.
- [ ] Start Vite on an available explicit port and verify `/PORTL/portals`, `/PORTL/knowledge`, and `/PORTL/admin/governance` load from the same running process.
- [ ] Record unrelated pre-existing full-suite failures separately and preserve all user-owned dirty files.
