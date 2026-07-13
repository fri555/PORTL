# AI Governance Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one high-fidelity interactive AI governance page with four management tabs in `frontend-mvp`.

**Architecture:** Add a dedicated route and a focused feature folder containing typed mock data and reusable governance UI primitives. The page owns tab, filter, drawer, modal, and local mutation state; shared shell/navigation remains unchanged except for a single governance entry.

**Tech Stack:** Vue 3 Composition API, TypeScript, Vue Router, Tailwind CSS, lucide-vue-next, Vitest, Vue Test Utils.

---

### Task 1: Route and navigation contract

**Files:**
- Modify: `frontend-mvp/src/router/index.ts`
- Modify: `frontend-mvp/src/components/common/AppHeader.vue`
- Test: `frontend-mvp/src/views/__tests__/AIGovernanceView.spec.ts`

- [ ] Write a failing route-level test that mounts `/admin/governance` and expects `data-testid="ai-governance-view"`, the four tab labels, and the current tab's primary action.
- [ ] Run `npm test -- --run src/views/__tests__/AIGovernanceView.spec.ts` and confirm it fails because the route/view is missing.
- [ ] Add lazy route `{ path: '/admin/governance', name: 'ai-governance', component: () => import('@/views/AIGovernanceView.vue') }` and an “AI 治理” header navigation item.
- [ ] Run the focused test and confirm the route resolves after the view scaffold is added.

### Task 2: Typed governance fixtures

**Files:**
- Create: `frontend-mvp/src/types/governance.ts`
- Create: `frontend-mvp/src/mock/governance.ts`

- [ ] Define `GovernanceTab`, status, metric, agent, model, tool, evaluation task, dataset, metric definition, and report interfaces with discriminated fields used by the tables.
- [ ] Add realistic Chinese fixture records covering multiple states so every filter, empty state, status action, and evaluation subview can be demonstrated.
- [ ] Run `npm run typecheck` and confirm fixture/type consistency.

### Task 3: Reusable interaction components

**Files:**
- Create: `frontend-mvp/src/components/governance/GovernanceMetricCard.vue`
- Create: `frontend-mvp/src/components/governance/GovernanceStatusBadge.vue`
- Create: `frontend-mvp/src/components/governance/GovernanceDrawer.vue`
- Create: `frontend-mvp/src/components/governance/GovernanceModal.vue`
- Test: `frontend-mvp/src/views/__tests__/AIGovernanceView.spec.ts`

- [ ] Extend the failing test to require an accessible drawer close button and confirmation dialog after row actions.
- [ ] Implement metric and status presentation using the Minimax black/white/coral token set.
- [ ] Implement a keyboard-accessible fixed right drawer with overlay, Escape close, and semantic headings.
- [ ] Implement a semantic modal with cancel/confirm actions and Escape close.
- [ ] Run the focused test and confirm component interactions pass.

### Task 4: Four-tab high-fidelity console

**Files:**
- Create: `frontend-mvp/src/views/AIGovernanceView.vue`
- Test: `frontend-mvp/src/views/__tests__/AIGovernanceView.spec.ts`

- [ ] Add tests that click all four tabs and assert tab-specific columns, metrics, and primary action labels.
- [ ] Add tests for keyword search, status filtering, clearing a no-result state, opening a row drawer, and completing one status-change confirmation.
- [ ] Implement the page header, linear four-tab navigation, four metric cards, responsive filter toolbar, typed desktop table, mobile overflow behavior, pagination footer, row action menu, and toast feedback.
- [ ] Implement tab-specific table definitions and actions for agents, models, tools, and evaluation tasks.
- [ ] Implement evaluation secondary tabs for 数据集、指标库、评估任务、报告 with corresponding local records.
- [ ] Keep the design free of the removed four explanatory cards.
- [ ] Run the focused test and confirm all interaction cases pass.

### Task 5: Visual system and responsive polish

**Files:**
- Modify: `frontend-mvp/src/assets/styles/globals.css`
- Modify: `frontend-mvp/src/views/AIGovernanceView.vue`

- [ ] Add scoped governance design tokens for `#0A0A0A`, `#FFFFFF`, `#F7F8FA`, `#FF5530`, hairlines, and status colors without changing existing portal theme tokens.
- [ ] Add visible focus states, reduced-motion handling, two-column metric behavior on narrow screens, and horizontal table scrolling.
- [ ] Run `npm run build` and confirm Vue type checking and Vite production build succeed.

### Task 6: Browser verification

**Files:**
- Modify as needed: `frontend-mvp/src/views/AIGovernanceView.vue`
- Modify as needed: `frontend-mvp/src/components/governance/*.vue`

- [ ] Start the existing Vite app and open `/PORTL/admin/governance` in the in-app browser.
- [ ] Verify all four primary tabs, all four evaluation secondary tabs, filters, empty state, details drawer, create modal, row menu, confirmation, and success feedback.
- [ ] Capture and inspect desktop and narrow viewport screenshots; correct clipping, contrast, spacing, or overflow issues.
- [ ] Run `npm test` and `npm run build`; confirm both succeed without modifying unrelated user changes.
