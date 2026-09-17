# Knowledge Center Perfect Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the local `/knowledge` prototype with a faithful, responsive, frontend-only clone of the authorized online knowledge center and its captured interaction states.

**Architecture:** Keep the existing Vue route and shared application header. Assemble focused source-clone components from a local state model so all mutations are reversible and never touch the real backend.

**Tech Stack:** Vue 3, TypeScript, Vite, Vitest, Vue Test Utils, scoped CSS.

**Spec:** `docs/research/test-ai-workbanch-45-tianmagroup-com-8a1533eb/knowledge-0dc0c9b2/`

## Global Constraints

- Preserve every existing route and unrelated working-tree change.
- Match captured 1440, 768, and 390 layouts.
- Use source/local assets only; no hotlinks or fabricated brand art.
- All create/upload/rename/permission/delete/Q&A behavior is local mock behavior.

---

### Task 1: Source-aligned state and fixtures

**Files:**
- Create: `src/mock/knowledge-source.ts`
- Create: `src/types/knowledge-source.ts`
- Test: `src/views/__tests__/KnowledgeBaseView.spec.ts`

**Interfaces:**
- Produces `SourceKnowledgeBase`, `SourceKnowledgeDocument`, and `sourceKnowledgeBases` used by all components.

- [ ] Write assertions that require the captured names, four-column list, sort behavior, public/personal switching, and empty detail state.
- [ ] Run `npm test -- --run src/views/__tests__/KnowledgeBaseView.spec.ts` and verify the new assertions fail because the current six-row simplified fixture does not match.
- [ ] Add literal fixtures for the captured list and representative documents.
- [ ] Re-run the focused tests and verify the fixture-driven behaviors pass.

### Task 2: Sidebar and table components

**Files:**
- Create: `src/components/knowledge/source-clone/KnowledgeSidebar.vue`
- Create: `src/components/knowledge/source-clone/KnowledgeTable.vue`
- Modify: `src/views/KnowledgeBaseView.vue`

**Interfaces:**
- Sidebar emits `select`, `create`, `search`, `switch-space`, and `close`.
- Table emits `select`, `sort`, `rename`, `permissions`, and `delete`.

- [ ] Add failing tests for sidebar drawer state, space switch, detail opening, sorting, and action-menu labels.
- [ ] Run the focused test and verify each new behavior fails for the missing source-clone components.
- [ ] Implement the two components from their spec files and assemble them in the view.
- [ ] Re-run focused tests until green, then run `npm run typecheck`.

### Task 3: Captured dialogs and local mutations

**Files:**
- Create: `src/components/knowledge/source-clone/KnowledgeDialogs.vue`
- Modify: `src/views/KnowledgeBaseView.vue`
- Test: `src/views/__tests__/KnowledgeBaseView.spec.ts`

**Interfaces:**
- Props identify the active dialog and target item.
- Emits `close`, `create-kb`, `create-folder`, `rename`, `save-permissions`, `confirm-delete`, and `upload-files`.

- [ ] Add failing tests for required-field disabling, create, folder, upload, rename, permission, and delete-confirm states.
- [ ] Run the focused test and verify failures are behavior-specific.
- [ ] Implement dialogs with local-only state changes.
- [ ] Re-run the focused test until green.

### Task 4: Q&A and task center

**Files:**
- Create: `src/components/knowledge/source-clone/KnowledgeQaPanel.vue`
- Create: `src/components/knowledge/source-clone/KnowledgeTaskCenter.vue`
- Modify: `src/views/KnowledgeBaseView.vue`
- Test: `src/views/__tests__/KnowledgeBaseView.spec.ts`

**Interfaces:**
- Q&A emits `close`, `resize`, and local `send` events.
- Task center receives upload tasks and emits `close`/`clear`.

- [ ] Add failing tests for Q&A open/close/send and task-center open/close.
- [ ] Run the focused test and verify missing panels cause the failures.
- [ ] Implement both panels from captured source states.
- [ ] Re-run focused tests until green.

### Task 5: Responsive and visual verification

**Files:**
- Modify: `src/components/common/AppHeader.vue` only if the local header does not reproduce the captured 390px behavior.
- Create/Update: `design-qa.md`

**Interfaces:**
- The page renders at `/knowledge` under the existing app shell.

- [ ] Run `npm run build` and the full `npm test` suite.
- [ ] Start the local Vite preview on port 4173.
- [ ] Capture local default, sidebar, detail, dialog, permission, and Q&A states at matching desktop dimensions.
- [ ] Capture/inspect local 768px and 390px responsive states.
- [ ] Compare source and implementation together, fix all P0/P1/P2 differences, and repeat.
- [ ] Record evidence and `final result: passed` in `design-qa.md`.

The repository has unrelated uncommitted changes, so this execution intentionally avoids creating commits that could accidentally include user-owned work.
