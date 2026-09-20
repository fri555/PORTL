# 天马智擎 V1.1.0 交互原型 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在正式设置与会话页面内完成 M2、M3、M5、M6、M7 的桌面端可点击高保真原型。

**Architecture:** 设置侧使用一个独立运营设置页面承载用量与审计，通过路由区分视图；对话侧将会话搜索与快捷提示语拆为复用组件，并在正式 `SourceChatView`/`SourceChatHome`/`SourceChatDetail` 中接入。全部数据为本地模拟数据。

**Tech Stack:** Vue 3、TypeScript、Vue Router、Vitest、Vue Test Utils、Tailwind CSS 与 scoped CSS。

**Spec:** `docs/superpowers/specs/2026-09-16-v110-interactive-ui-design.md`

## Global Constraints

- 只修改 `frontend-mvp` 正式路由使用的页面，不以 `AdminConsoleView.vue` 或 `/workspace/chat` 为实现基础。
- 桌面 Web 优先；保持现有黑白企业工具视觉。
- 保留工作区内现有用户改动，不提交、不覆盖无关文件。
- 每项行为先写失败测试，确认 RED 后再实现并确认 GREEN。

---

### Task 1: 设置侧用量与审计页面

**Files:**
- Create: `frontend-mvp/src/views/SettingsInsightsView.vue`
- Create: `frontend-mvp/src/views/__tests__/SettingsInsightsView.spec.ts`
- Modify: `frontend-mvp/src/router/index.ts`
- Modify: `frontend-mvp/src/components/common/AppHeader.vue`

**Interfaces:**
- Produces routes `/settings/usage` and `/settings/audit`.
- Uses `useAppStore().user.role` to control organization filters, audit entry and quota adjustment.

- [ ] Write failing tests proving user-visible RMB/coin metrics, admin-only audit filters, right drawer, export, and quota modal.
- [ ] Run `npm test -- src/views/__tests__/SettingsInsightsView.spec.ts` and confirm failures are missing features.
- [ ] Implement the page, routes and navigation with local mock data.
- [ ] Re-run the focused test and confirm all cases pass.

### Task 2: 混合会话搜索

**Files:**
- Create: `frontend-mvp/src/components/chat/source-clone/ConversationSearchDialog.vue`
- Create: `frontend-mvp/src/components/chat/source-clone/__tests__/ConversationSearchDialog.spec.ts`
- Modify: `frontend-mvp/src/views/SourceChatView.vue`

**Interfaces:**
- Emits `open-result(sessionId: string, messageId?: string)` and `close`.
- Accepts `open: boolean`.

- [ ] Write failing tests for mixed results, message-role filter, mode filter, earlier-range loading and message location emission.
- [ ] Run the focused test and confirm RED.
- [ ] Implement the component and replace the inline legacy search dialog.
- [ ] Re-run the focused test and confirm GREEN.

### Task 3: 快捷提示语

**Files:**
- Create: `frontend-mvp/src/components/chat/source-clone/QuickPromptPanel.vue`
- Create: `frontend-mvp/src/components/chat/source-clone/__tests__/QuickPromptPanel.spec.ts`
- Modify: `frontend-mvp/src/components/chat/source-clone/SourceChatHome.vue`
- Modify: `frontend-mvp/src/components/chat/source-clone/SourceChatDetail.vue`

**Interfaces:**
- Emits `insert(text: string)`.
- Owns local prompt CRUD state and management drawer state.

- [ ] Write failing tests for selection, search, category filtering, create, edit and delete.
- [ ] Run the focused test and confirm RED.
- [ ] Implement the panel and integrate cursor-position insertion in both composers.
- [ ] Re-run the focused test and confirm GREEN.

### Task 4: 上下文主动建议

**Files:**
- Create: `frontend-mvp/src/components/chat/source-clone/__tests__/SourceChatDetailSuggestions.spec.ts`
- Modify: `frontend-mvp/src/components/chat/source-clone/SourceChatDetail.vue`

**Interfaces:**
- Suggestions are local state associated with the displayed answer.
- Clicking a suggestion clears all suggestions and records the selected text as a sent user message.

- [ ] Write a failing test for three default suggestions and click-to-send-and-clear behavior.
- [ ] Run the focused test and confirm RED.
- [ ] Implement the minimal interaction and styles.
- [ ] Re-run the focused test and confirm GREEN.

### Task 5: 集成验证

**Files:**
- Modify tests only if verification reveals a real regression.

- [ ] Run `npm test` and resolve any regressions.
- [ ] Run `npm run build` and resolve type/build failures.
- [ ] Start the app and verify `/settings/usage`, `/settings/audit`, `/chat`, search filters, prompt drawer and suggestion click paths in a desktop viewport.
