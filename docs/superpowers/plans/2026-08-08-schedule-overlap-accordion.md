# Schedule Overlap Accordion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace overlapping-card coverage with a fixed 60/40 accordion layout that keeps every meeting clickable and preserves AI/note actions.

**Architecture:** Extend each computed schedule layout with a stable overlap-cluster identifier, then derive left/width percentages from a single active schedule key. Mouse and keyboard events update that key with a 120ms exit buffer; CSS only animates the computed geometry and no longer overlays a card across its siblings.

**Tech Stack:** Vue 3 Composition API, TypeScript, Tailwind CSS, Vitest, Vue Test Utils, Vite.

---

### Task 1: Specify accordion geometry and interaction with tests

**Files:**
- Modify: `frontend-mvp/src/views/__tests__/SystemPortalsView.spec.ts`
- Test: `frontend-mvp/src/views/__tests__/SystemPortalsView.spec.ts`

- [ ] **Step 1: Add a failing test for fixed 60/40 allocation**

Add assertions to the existing fixed-timeline test using the four 13:00 mock meetings:

```ts
const expanded = wrapper.get('[data-testid="schedule-item-schedule-edge-same-range-1"]')
const sibling = wrapper.get('[data-testid="schedule-item-schedule-edge-same-range-2"]')

expect(expanded.attributes('style')).toContain('width: calc(25% - 8px)')
await expanded.trigger('mouseenter')
expect(expanded.attributes('style')).toContain('width: calc(60% - 8px)')
expect(sibling.attributes('style')).toContain('width: calc(13.333333333333334% - 8px)')
expect(expanded.text()).toContain('13:00–13:30')
expect(expanded.find('[data-testid="schedule-note-schedule-edge-same-range-1"]').exists()).toBe(true)
```

- [ ] **Step 2: Add failing tests for switching, delayed restore, and keyboard restore**

```ts
vi.useFakeTimers()
await sibling.trigger('mouseenter')
expect(sibling.attributes('style')).toContain('width: calc(60% - 8px)')

await sibling.trigger('mouseleave')
vi.advanceTimersByTime(119)
expect(sibling.attributes('style')).toContain('width: calc(60% - 8px)')
vi.advanceTimersByTime(1)
await wrapper.vm.$nextTick()
expect(sibling.attributes('style')).toContain('width: calc(25% - 8px)')

await expanded.trigger('focusin')
expect(expanded.attributes('style')).toContain('width: calc(60% - 8px)')
await expanded.trigger('keydown', { key: 'Escape' })
expect(expanded.attributes('style')).toContain('width: calc(25% - 8px)')
vi.useRealTimers()
```

- [ ] **Step 3: Run the focused tests and verify they fail**

Run:

```bash
cd frontend-mvp
npm test -- --run src/views/__tests__/SystemPortalsView.spec.ts --reporter=dot
```

Expected: the new assertions fail because the current CSS hover implementation expands to 100% and Vue has no active accordion state.

### Task 2: Implement cluster-aware accordion sizing

**Files:**
- Modify: `frontend-mvp/src/components/workbench/ScheduleBoardPanel.vue`
- Test: `frontend-mvp/src/views/__tests__/SystemPortalsView.spec.ts`

- [ ] **Step 1: Add active-state and buffered-close state**

Near the existing component refs, add:

```ts
const expandedScheduleKey = ref<string | null>(null)
let accordionCloseTimer: number | undefined

function scheduleKey(boardId: string, scheduleId: string) {
  return `${boardId}:${scheduleId}`
}

function openScheduleAccordion(boardId: string, scheduleId: string) {
  if (accordionCloseTimer) window.clearTimeout(accordionCloseTimer)
  accordionCloseTimer = undefined
  expandedScheduleKey.value = scheduleKey(boardId, scheduleId)
}

function scheduleAccordionClose() {
  if (accordionCloseTimer) window.clearTimeout(accordionCloseTimer)
  accordionCloseTimer = window.setTimeout(() => {
    expandedScheduleKey.value = null
    accordionCloseTimer = undefined
  }, 120)
}

function closeScheduleAccordionNow() {
  if (accordionCloseTimer) window.clearTimeout(accordionCloseTimer)
  accordionCloseTimer = undefined
  expandedScheduleKey.value = null
}
```

- [ ] **Step 2: Give every computed overlap cluster a stable identifier**

Extend the layout type and pass a cluster identifier into the cluster layout function:

```ts
interface ScheduleLayout {
  top: number
  height: number
  lane: number
  laneCount: number
  clusterId: number
}

function layoutScheduleCluster(
  cluster: ScheduleItem[],
  layouts: Map<string, ScheduleLayout>,
  clusterId: number,
) {
  // retain current lane allocation
  layouts.set(schedule.id, {
    top,
    height,
    lane,
    laneCount,
    clusterId,
  })
}
```

Increment `clusterId` each time `buildScheduleLayouts()` flushes a cluster, including the final cluster.

- [ ] **Step 3: Replace equal-width geometry with fixed 60/40 geometry for the active cluster**

Update `schedulePosition()` so only layouts in the active schedule's board and cluster are redistributed:

```ts
function schedulePosition(boardId: string, scheduleId: string) {
  const boardLayouts = scheduleLayouts.value.get(boardId)
  const layout = boardLayouts?.get(scheduleId)
  if (!layout) return {}

  const activeId = expandedScheduleKey.value?.startsWith(`${boardId}:`)
    ? expandedScheduleKey.value.slice(boardId.length + 1)
    : undefined
  const active = activeId ? boardLayouts?.get(activeId) : undefined
  const accordionActive = Boolean(active && active.clusterId === layout.clusterId && layout.laneCount > 1)
  const activeLane = accordionActive ? active!.lane : -1
  const siblingWidth = accordionActive ? 40 / (layout.laneCount - 1) : 100 / layout.laneCount
  const laneWidth = accordionActive && layout.lane === activeLane ? 60 : siblingWidth
  let left = 0
  for (let lane = 0; lane < layout.lane; lane += 1) {
    left += accordionActive && lane === activeLane ? 60 : siblingWidth
  }

  return {
    top: `${layout.top}px`,
    height: `${layout.height}px`,
    left: `calc(${left}% + 4px)`,
    width: `calc(${laneWidth}% - 8px)`,
    zIndex: layout.lane + 1,
  }
}
```

- [ ] **Step 4: Guarantee the minimum sibling click width through the column width**

Compute the maximum lane count and column minimum:

```ts
const maximumOverlapCount = computed(() => Math.max(
  1,
  ...[...scheduleLayouts.value.values()].flatMap((layouts) =>
    [...layouts.values()].map((layout) => layout.laneCount),
  ),
))
const scheduleColumnMinWidth = computed(() => maximumOverlapCount.value > 1
  ? Math.max(300, 90 * (maximumOverlapCount.value - 1))
  : 220)
```

Pass `--column-min-width` and use it in both track grid definitions:

```css
grid-template-columns: 68px repeat(var(--board-count), minmax(var(--column-min-width), 1fr));
```

Set `--track-min-width` to `68 + boardCount * scheduleColumnMinWidth`.

- [ ] **Step 5: Wire pointer and keyboard events to cards**

Add these handlers to each schedule article:

```vue
@mouseenter="openScheduleAccordion(board.id, schedule.id)"
@mouseleave="scheduleAccordionClose"
@focusin="openScheduleAccordion(board.id, schedule.id)"
@focusout="scheduleAccordionClose"
@keydown.esc.stop="closeScheduleAccordionNow"
```

Keep AI and note buttons inside the card. Their clicks must not clear `expandedScheduleKey`.

- [ ] **Step 6: Remove the full-width overlay CSS**

Delete the rule that sets `left: 4px !important`, `width: calc(100% - 8px) !important`, and elevated overlay `z-index`. Retain the geometry transition and reduced-motion rule:

```css
.schedule-timeline-card {
  transition: left 160ms ease, width 160ms ease, box-shadow 160ms ease;
}

.schedule-timeline-card[data-expanded="true"] {
  box-shadow: 0 10px 24px rgba(30, 41, 59, 0.16);
}
```

- [ ] **Step 7: Run the focused suite and verify it passes**

Run:

```bash
cd frontend-mvp
npm test -- --run src/views/__tests__/SystemPortalsView.spec.ts --reporter=dot
```

Expected: all `SystemPortalsView.spec.ts` tests pass, including fixed 60/40 allocation, delayed restore, Escape, note action, and horizontal width assertions.

### Task 3: Verify compiled and visual behavior

**Files:**
- Verify: `frontend-mvp/src/components/workbench/ScheduleBoardPanel.vue`
- Verify: `frontend-mvp/src/views/__tests__/SystemPortalsView.spec.ts`

- [ ] **Step 1: Run production type checking and build**

Run:

```bash
cd frontend-mvp
npm run build
```

Expected: `vue-tsc --noEmit` and `vite build` both exit successfully.

- [ ] **Step 2: Inspect the local schedule board**

Open `http://localhost:5178/PORTL/portals`, enter 日程看板, and inspect the four overlapping 13:00 mock meetings.

Expected:

- Default cards each occupy 25%.
- Hovered card occupies 60%.
- Other cards each occupy approximately 13.33% and remain targetable.
- Moving from the middle card to either side card changes the expanded target without coverage or flicker.
- AI and 笔记 buttons remain clickable in the expanded card.
- Mouse leave and Escape restore equal widths.

- [ ] **Step 3: Review the final diff without touching unrelated changes**

Run:

```bash
git diff --check -- frontend-mvp/src/components/workbench/ScheduleBoardPanel.vue frontend-mvp/src/views/__tests__/SystemPortalsView.spec.ts
git diff --stat -- frontend-mvp/src/components/workbench/ScheduleBoardPanel.vue frontend-mvp/src/views/__tests__/SystemPortalsView.spec.ts
```

Expected: no whitespace errors; only the schedule component and its focused tests contain implementation changes for this feature.
