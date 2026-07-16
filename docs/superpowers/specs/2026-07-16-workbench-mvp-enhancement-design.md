# Workbench MVP Enhancement Design

## Purpose

The workbench should become a practical daily entry point for the MVP portal. It must help users quickly start AI work, open common enterprise systems, check today's schedule, and scan tasks without making the page feel like a full enterprise workflow suite.

This design keeps the top navigation unchanged and only revises the workbench content area.

## Layout

Use a two-column dashboard layout:

- Left column: larger primary area for `常用工作助手` and `系统入口`.
- Right column: compact work-flow area for `今日日程` and `任务`.

The left column should stay visually dominant because system entry remains the main use case. The right column should be stable and readable, not stretched by long task or schedule lists.

Each long-content module uses internal scrolling so the page height remains stable:

- `系统入口`: internal scrolling for large categories.
- `今日日程`: internal scrolling when there are many events.
- `任务`: internal scrolling when task count grows.

## 常用工作助手

This module replaces a generic quick-action bar. MVP content should focus on existing AI portal capabilities instead of promising unbuilt business operations.

Title: `常用工作助手`

Subtitle: `选择助手、案例或知识库，快速开始一段工作会话`

Tabs:

- `智能体`: default tab.
- `案例`: common task examples.
- `知识库`: common knowledge sources.

Default `智能体` cards:

- `全能助手`: 日常问答、文档处理、工作咨询.
- `数据分析助手`: Excel、指标、经营数据分析.
- `营销方案助手`: 活动方案、客户提案、团购方案.
- `知识问答助手`: 基于知识库查制度、商品、业务资料.

Card behavior:

- Clicking an agent opens the work session page with the corresponding agent selected.
- Clicking a case opens the work session page with a preset prompt.
- Clicking a knowledge base opens the knowledge center or starts a work session with that knowledge base context.

MVP scope:

- Use mock data.
- Implement tab switching and navigation/prefill behavior where the current frontend supports it.
- Do not implement real workflow actions such as approval, inventory query, or ticket creation in this module.

## 系统入口

The system entry area uses real enterprise systems and direct links. The search box is intentionally omitted for the MVP revision. Filtering is handled by category chips.

Header:

- Title: `系统入口`
- Show active category and count, for example `常用 9`.

Category chips:

- `常用`
- `B2C/线上业务`
- `B2B/平台业务`
- `直播业务`
- `商品/供应链`
- `仓储/履约`
- `财务`
- `客服/工单`
- `数据/BI`
- `技术/项目`
- `内容/视觉`
- `KA/对外项目`
- `管理/OA`

Default category:

- `常用`

Recommended common systems:

- 自营系统
- 新运营系统
- 大库存查询系统
- 工单系统
- 需求管理系统
- 数据驾驶舱/观远BI
- 内容中心系统
- 天马运动管理端
- OA系统

System card fields:

- System name.
- Business department summary.
- Architecture tag: `B2B`, `B2C`, `中台`, or `对外`.
- URL domain or access hint.
- Right arrow affordance.

System cards should open real links. External links should open in a new tab when appropriate.

Classification rule:

If a system is used by multiple departments, classify it by its primary usage domain and keep the broader department summary on the card. This avoids an overly large category list while preserving real context.

Scrolling behavior:

- Category chips remain visible at the top of the module.
- The card grid scrolls internally.
- The default `常用` category fits without requiring scrolling on typical desktop height.
- Other categories may scroll internally.

## 今日日程

The schedule module focuses on today's actionable meetings and events.

Header:

- Title: `今日日程`
- Right action: `全部日程`

Controls:

- Search box for event title, location, and participants.

Schedule item fields:

- Time range.
- Title.
- Location.
- Participant count, for example `5 人参加`.
- Status.

Statuses:

- `进行中`
- `即将开始`
- `未开始`
- `已结束`

Visual behavior:

- `进行中` and `即将开始` should be visually emphasized.
- Do not show participant avatars in MVP. Use participant count to save space.
- If there are many events, the list scrolls internally.
- Empty state: `今天暂无日程`.

## 任务

The task module should feel like a real workbench but remain lightweight.

Tabs:

- `全部任务`
- `我负责的`
- `我创建的`
- `我分配的`

Task row fields:

- Title.
- Due time.
- Priority: `高`, `中`, `普通`.
- Status: `待处理`, `进行中`, `已逾期`, `已完成`.
- Responsibility relation.
- Source.

Tab-specific emphasis:

- `全部任务`: title, owner, due time, status, source.
- `我负责的`: title, creator, due time, priority, status.
- `我创建的`: title, owner, due time, status, latest update.
- `我分配的`: title, assignee, due time, status, overdue risk.

Visual behavior:

- Use compact list rows instead of large cards.
- Sort by urgency: overdue first, then due today, then due tomorrow, then later items, with completed items at the bottom.
- Keep an internal scroll area for longer lists.

MVP scope exclusions:

- No task detail drawer.
- No drag-and-drop status changes.
- No batch operations.
- No real reminder or notification action.
- Reminder buttons may appear as disabled or mock actions if needed for visual fidelity.

## Data Model

Extend existing workbench mock data rather than introducing a new page-level store.

Suggested data structures:

- `WorkbenchAssistantShortcut`: id, name, description, type, target, prompt/context, icon, tone.
- `WorkbenchPortal`: id, name, description, department, architecture, categoryIds, url, accessHint, isCommon.
- `ScheduleItem`: id, date, start, end, title, location, participantCount, status.
- `TodoItem`: id, title, due, priority, status, source, owner, creator, assignee, relation scopes, latestUpdate.

## Interaction Summary

- The workbench remains a single page.
- Top navigation is unchanged.
- `常用工作助手` supports tab switching and navigation/prefill.
- `系统入口` supports category filtering and real-link opening.
- `今日日程` supports local search and internal scrolling.
- `任务` supports tab filtering, urgency/status display, and internal scrolling.

## Verification

Implementation should be verified with:

- Production build.
- Existing focused component tests where available.
- Manual browser check for:
  - `常用工作助手` tab switching.
  - System category filtering.
  - Real system links.
  - Schedule search and internal scroll.
  - Task tab switching and internal scroll.
  - Layout stability at common desktop widths.
