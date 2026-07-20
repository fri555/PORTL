# Workbench MVP Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved workbench MVP enhancement with MiniMax-inspired visual styling, real system links, assistant shortcuts, schedule search, and task tabs.

**Architecture:** Keep the workbench as the existing `SystemPortalsView.vue` page. Extend `frontend-mvp/src/types/workbench.ts` and `frontend-mvp/src/mock/workbench.ts` with richer data models, then render and filter all modules locally in the view.

**Tech Stack:** Vue 3 Composition API, TypeScript, Tailwind CSS, lucide-vue-next, Vitest, Vue Test Utils.

---

### Task 1: Extend Workbench Data Models

**Files:**
- Modify: `frontend-mvp/src/types/workbench.ts`
- Modify: `frontend-mvp/src/mock/workbench.ts`

- [ ] **Step 1: Add type definitions**

Add types for shortcut tabs, portal categories, richer schedule items, and richer task items.

- [ ] **Step 2: Replace mock data**

Replace short demo portals with the real system list supplied by the user. Add `isCommon`, `architecture`, `department`, `categoryIds`, and direct `url` fields.

- [ ] **Step 3: Add MVP shortcuts**

Add mock shortcuts for `智能体`, `案例`, and `知识库`; default tab is `智能体`.

### Task 2: Implement Workbench UI

**Files:**
- Modify: `frontend-mvp/src/views/SystemPortalsView.vue`

- [ ] **Step 1: Replace search-based portal filtering**

Remove the system search box and implement category chip filtering with `常用` as the default.

- [ ] **Step 2: Add `常用工作助手`**

Add a MiniMax-style white card with black pill active tabs and four default agent cards. Agent and case cards route to the work session page; knowledge cards route to the knowledge center.

- [ ] **Step 3: Add internal scroll regions**

Use fixed-height internal scroll areas for system cards, schedules, and tasks so the whole workbench remains stable.

- [ ] **Step 4: Update schedule module**

Add schedule search and participant counts. Keep calendar controls and show status emphasis.

- [ ] **Step 5: Update task module**

Replace old todo tabs with `全部任务`, `我负责的`, `我创建的`, and `我分配的`. Render compact task rows with priority, status, due time, source, and relation metadata.

### Task 3: Tests And Verification

**Files:**
- Modify: `frontend-mvp/src/views/__tests__/SystemPortalsView.spec.ts`

- [ ] **Step 1: Update focused workbench tests**

Assert shortcut tabs, portal category filtering, schedule search, task tabs, and real system links.

- [ ] **Step 2: Run focused tests**

Run `npm run test -- --run src/views/__tests__/SystemPortalsView.spec.ts`.

- [ ] **Step 3: Run production build**

Run `VITE_BASE_PATH=/PORTL/ VITE_ROUTER_MODE=hash npm run build`.

- [ ] **Step 4: Manual browser verification**

Open the local workbench and verify visual layout, internal scroll areas, tab switching, and no top-navigation regressions.
