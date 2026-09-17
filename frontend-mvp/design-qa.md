# Design QA — 上线版全站对齐（工作台除外）

## Scope

- Source: signed-in `https://aiwork.tianmagroup.com/`
- Prototype: `frontend-mvp`
- Included: global header, 天马智擎首页、仪表盘权限态、知识中心、设置/智能体管理
- Excluded: `/portals` 工作台内容
- New requirement: knowledge-base and intelligent-agent permission configuration

## Source captures

- Home states: `design-qa-assets/reclone/source-chat-desktop-1440.png`, `source-chat-default-1280x720.png`, `source-chat-mode-open-1440x900.png`, `source-account-menu-1440x900.png`
- Knowledge: `source-knowledge-default-1440x900.png`, `source-knowledge-menu-1280x720.png`
- Agents: `source-agents-default-1280x720.png`, `source-agents-menu-1440x900.png`

## Final prototype captures

- Home expanded-history state: `local-final-chat-history-open-1440x900.png`
- Knowledge menu and permission dialog: `local-final-knowledge-menu-1280x720.png`, `local-final-knowledge-permission-1280x720.png`
- Agent menu and permission dialog: `local-final-agents-menu-1280x720.png`, `local-final-agents-permission-1280x720.png`

## Visual alignment results

- Global header: matched responsive desktop gutters, production logo size, navigation spacing, feedback control, account avatar/name, and the single-item logout menu.
- Home: matched the 270 px history panel, history density, main-content shift, 800 × 172 composer, exact 776 × 100 textarea, control coordinates, 246 × 74 quick cards, production slogan/mascot, and two-option mode menu.
- Knowledge: matched the production header controls, fixed action sizes, table column coordinates, 57 px row density, names, owners, and timestamps. Added `权限设置` beside `重命名` and `删除`.
- Agents: matched the 32 px search/filter controls, list density, production avatars, pagination, and operation-menu styling. Added `权限设置` beside `编辑` and `删除`.
- Dashboard: retained the production-observed signed-in `无访问权限` state.

## Permission behavior verified

- Knowledge and agent row menus both open the resource permission dialog.
- Member list shows a locked system administrator, departments, people, fixed `查看` permission, and row removal.
- Add-member view supports department/person tabs, name or employee-number search, automatic duplicate suppression, and a 30-item single-add limit.
- Department grants explicitly retain automatic synchronization for hire, departure, and transfer changes.
- Changes remain a draft until `保存设置`; save performs full-list validation and emits the complete member list.
- Knowledge saves display the RAG retrieval-filtering effect; agent permissions do not show the knowledge-only RAG copy.
- Personal-space knowledge bases suppress the permission entry through the `space === 'personal'` rule.

## Verification

- Browser interaction: knowledge menu → permission dialog → add department/person → confirm → save passed.
- Browser interaction: agent menu → permission dialog passed.
- Same-input visual comparison performed for the production and final 1440 × 900 home history state.
- Full tests: 20 files, 138 tests passed.
- Production build: `vue-tsc --noEmit && vite build` passed.

## Local mock knowledge tree follow-up — 2026-08-28

- Source reference: `design-qa-assets/source/knowledge-sidebar-open-desktop.png`.
- Implementation capture: `design-qa-assets/reclone/local-knowledge-tree-final-1000x844.png` at 1000 × 844, DPR 1.
- Verified state: public space root, sidebar open, first knowledge base and its nested folder expanded.
- Content source: repository-local mock data only; copied online test-account knowledge-base names and records were removed.
- Interaction coverage: public/personal switching, recursive sidebar expansion, root and nested table navigation, clickable breadcrumbs, file preview, local folder creation, upload mock, rename, delete, and permission management.
- Fidelity result: the source shell, spacing, row density, icon hierarchy, toolbar, and disclosure controls remain aligned while the records are intentionally replaced with realistic local business data.
- Iteration note: a narrow-layout breadcrumb wrap was found during browser review and fixed with a single-line, ellipsized breadcrumb layout.
- Final severity: no open P0, P1, or P2 visual issues in the verified knowledge-tree state.

## V1.2 M9 / M10 / M12 prototype update — 2026-08-31

### Evidence and normalization

- Source visual truth: `../docs/prototype-audit/01-home.png`, `02-agent-settings.png`, `03-knowledge-center.png`, and `04-knowledge-files.png`.
- Requirement truth: the updated V1.2 PRD snapshot at `../docs/v12-review-updated.json`, specifically M9, M10, and M12.
- Implementation captures: `../docs/prototype-audit/05-m12-expert-picker-updated.png`, `06-m10-dingtalk-auth-updated.png`, `07-m10-dingtalk-confirm-updated.png`, `08-m9-folder-permission-updated.png`, and `09-m12-agent-settings-updated.png`.
- Viewport and pixels: 1280 × 720 CSS px, 1280 × 720 image px, device scale factor 1. Source captures use the same 1280 × 720 desktop frame; no density normalization was required.
- States: M9 folder standalone permission; M10 initial authorization, write confirmation, and successful result; M12 all-department expert grid plus create-agent configuration fields.
- Full-view comparisons were performed with each source and implementation image loaded together. Separate focused crops were not needed because the permission dialog, confirmation card, expert grid, and configuration fields are readable at full 1280 × 720 resolution and occupy the primary comparison region.

### Required fidelity surfaces

- Fonts and typography: retained the existing system/PingFang stack, compact 12–16 px hierarchy, weights, truncation, and muted helper text used by the source prototype.
- Spacing and layout rhythm: preserved the 56 px global header, existing sidebar and main-column geometry, table rhythm, 8–16 px control spacing, rounded cards, and restrained elevation.
- Colors and tokens: retained the source black primary actions, neutral gray borders/backgrounds, blue selected states, green success feedback, and amber external-write warning.
- Image quality and assets: reused the existing Tianma logo, mascot, and agent avatar files; no placeholder or hand-drawn replacement assets were introduced.
- Copy and content: M9 inheritance wording, M10 authorization/write-confirmation wording, and M12 department/system labels match the V1.2 PRD and remain concise enough for the existing UI density.

### Comparison history

- First pass P2: the M10 write-confirmation card touched the fixed composer at 1280 × 720. Fixed by tightening card line height, padding, gaps, and footer spacing. Post-fix evidence: `07-m10-dingtalk-confirm-updated.png`; all controls are fully visible with clear separation.
- First pass P1: the fixed-position knowledge row menu was visually above the next row but its permission entry could pass the click through to the underlying folder. Fixed by elevating the active row stacking context. Post-fix evidence: the browser flow opens `权限设置 - 人事制度`, and `08-m9-folder-permission-updated.png` shows the correct dialog state.
- M12 differences from the daily-mode source are intentional requirements: department tabs, search, three-column internal scroll grid, and system tags. The existing global shell and composer visual language remain unchanged.

### Primary interactions and console

- M9: knowledge base → folder menu → permission management → standalone mode passed.
- M10: authorization verification → write confirmation → successful todo result passed.
- M12: expert mode → department filter → DWS keyword filter passed; create-agent form exposes applicable departments and up to three connected-system tags.
- Browser console: no errors or warnings in the verified states.
- Automated verification: 23 test files / 163 tests passed; production typecheck and build passed.

### Findings

- No actionable P0, P1, or P2 visual or interaction differences remain.
- P3 follow-up: some long expert names are intentionally truncated in the compact three-column cards; the full name remains available through the card title and can be reconsidered if the final design increases card width.

final result: passed

## M10 authorization-state correction — 2026-08-31

- Final capture: `../docs/prototype-audit/14-m10-dual-auth-buttons-final.png`.
- Corrected constraint: the frontend cannot reliably read the external DingTalk authorization result, so it does not infer or automatically transition authorization state.
- The authorization card now displays “去授权” and “已授权” simultaneously. “去授权” opens the DingTalk authorization page and leaves the current card in place; “已授权” is the explicit user acknowledgement that continues to write confirmation.
- Browser verification confirmed exactly two visible authorization actions and no console errors or warnings.
- Automated verification: 23 test files / 163 tests passed; production typecheck and build passed.

final result: passed

## V1.2 M9 / M10 / M12 refinement — 2026-08-31

- Updated captures: `../docs/prototype-audit/10-m12-toolbar-refined.png`, `13-m9-permission-simplified.png`, and final M10 capture `14-m10-dual-auth-buttons-final.png`. Earlier M10 captures `11` and `12` are superseded.
- M9: removed permission inheritance and download-permission controls; folder and file dialogs now directly edit visible members, with the confirmation limited to impacted child resources and member count.
- M10: keeps “去授权” and “已授权” visible together because the frontend cannot reliably determine the external authorization result; only the explicit “已授权” action continues to write confirmation.
- M12: placed department tabs and expert search on the same row. Both the horizontal tab strip and vertically scrollable expert area retain scrolling while hiding native scrollbars.
- Browser verification at 1280 × 720 confirmed the M12 controls share one row, both scrollbar widths resolve to `none`, the M10 authorization card contains both required actions, and M9 contains neither inheritance nor download controls.
- Browser console: no errors or warnings in the verified states.
- Automated verification: 23 test files / 163 tests passed; production typecheck and build passed.

final result: passed
# 2026-09-17 需求收口验证

- 日志管理收口为单页；筛选仅保留开始/结束时间、操作人员、模块、操作类型，详情使用居中弹窗。
- 用量管理收口为“筛选区 → 指标卡 → 树形明细”；部门 → 人员 → 请求，人员额度支持日/周/月，详情使用居中弹窗。
- 会话搜索默认近 3 个月，20 条/页滚动懒加载；当前范围加载完后才显示更早消息按钮。
- 上下文建议纵向排列，AI 决定 1–3 条；快捷提示语继续使用居中新建弹窗。
- 知识上传已增加“按月报模式解析”复选框，并接受 PPT/PPTX。
- 仪表盘左侧增加“观远运营看板”权限菜单，管理员可见内嵌占位与权限设置。
