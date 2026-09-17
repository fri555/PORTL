# Knowledge Center Behaviors

## Responsive sweep

- Desktop source capture: 1440×900, device pixel ratio 1. Full header navigation, collapsed sidebar, 32px action buttons, 57px rows.
- Tablet 768×900: full header navigation remains visible; main padding is 32px; table width is 704px; row columns resolve to `383.016px 113.375px 147.594px 28px`.
- Mobile 390×844: full navigation and feedback button are hidden, user control shrinks to 68px, and a 32px burger appears. Main padding becomes 12px. Sidebar is a fixed 280px drawer at `top:56px` with opacity/transform transition. Closed grid is `0px 390px`. Row columns resolve to `181.984px 53.875px 70.125px 28px`.
- The browser screenshot operation timed out only at 390px. DOM, bounding boxes, computed styles, and responsive visibility were captured successfully.

## Sidebar

- Closed: the main top bar shows three icon buttons—expand, search, create.
- Open: the left panel shows search, collapse, a black 36px create button, a public/personal segmented control, and a vertically scrollable tree.
- Tree chevrons reveal child documents. Selecting a tree item opens the same detail state as its table row.

## Main list

- Default columns: 名称, 所有者, 创建时间, 操作.
- Header height: 46px. Row height: 57px.
- Hover creates `rgb(247,247,249)` with a 12px rounded highlight extending 16px beyond the row content.
- Clicking a name opens the detail table and changes the title to `全部知识库 › {name}`.
- Clicking 创建时间 reverses list order and rotates the indicator.
- The displayed content is sourced from local mocks, never copied from the online test account.
- Opening a knowledge base shows its immediate local folders/files; folder clicks drill down recursively and breadcrumbs navigate back to any ancestor.
- Sidebar expansion mirrors the same hierarchy and file clicks open the local preview state.

## Primary actions

- 上传文件: opens a 740px dialog with a knowledge-base combobox, dashed drop zone, empty-file illustration, cancel, and disabled confirm.
- 新建文件夹: opens a 480px dialog with required name and knowledge-base select.
- 新建知识库: opens a 480px dialog with name and public/personal radio choices.
- 小智问答: opens a right-side panel; while open the action disappears from the main action group.

## Row menu

- Menu items: 重命名, 权限管理, 删除.
- Rename opens a right-aligned compact dialog without a dim overlay.
- Permission management opens a centered modal with dim overlay, search, add member, empty state, cancel, save.
- Delete opens a confirmation; only the local clone's final confirmation removes a row.

## Permission management — V1.2

- Permission editing is transactional: picker Cancel and main Cancel roll back; only the final impact confirmation persists.
- Folder and file permissions inherit from their direct parent by default. Switching to `单独设置` breaks inheritance and replaces the inherited view list.
- Department/person selection supports tabs, search, live checkboxes, selected-item removal, live count, and confirm-to-draft.
- At least one view subject must remain in independent mode.
- Download permission is independent (`继承上级 / 允许下载 / 禁止下载`) but still requires view permission.
- Saving previews affected child resources; optimistic-revision and lost-admin errors are surfaced without overwriting newer data.
- Saved independent permissions update lock indicators in the sidebar and table immediately.

## Motion

- Sidebar grid transition: `grid-template-columns 0.3s cubic-bezier(0.16,1,0.3,1)`.
- Mobile drawer opacity: `0.15s cubic-bezier(0.16,1,0.3,1)`.
- Button hover transitions are 0.15s.
- Reduced-motion mode disables transitions and animations.
