# KnowledgeTable Specification

## Overview
- Target: `src/components/knowledge/source-clone/KnowledgeTable.vue`
- Screenshot: `design-qa-assets/source/knowledge-list-default-desktop.png`
- Interaction model: click and hover

## DOM Structure
Table shell → 46px header grid → scrollable body → repeated 57px row → name/icon, owner, time, actions menu.

## Computed Styles
- Table: flex column, width/height 100%, margin-top 8px, overflow hidden.
- Desktop grid: `minmax(0,750fr) minmax(0,222fr) minmax(0,289fr) minmax(28px,28fr)` for the current four-column source.
- Header: 46px, padding `0 20px 8px`, bottom border `rgb(234,234,234)`, 14px/22px, weight 500, secondary gray.
- Row: 57px, padding `0 12px`, bottom border `rgb(234,234,234)`, cursor pointer.
- Name: 14px/22px, weight 400, `rgb(17,17,17)`, ellipsis.
- Metadata: 14px/22px, `rgb(102,102,102)`, ellipsis.
- More button: 20×20px, radius 6px.
- Mobile 390 row columns: `181.984px 53.875px 70.125px 28px`.
- Tablet 768 row columns: `383.016px 113.375px 147.594px 28px`.

## States & Behaviors
- Row hover/active adds a 12px-radius `rgb(247,247,249)` pseudo-surface extending 16px horizontally.
- Header sort toggles ascending/descending order.
- Clicking a row emits selection.
- More menu toggles three actions and closes on outside click.
- Detail state uses columns 名称, 所有者, 上传时间, 操作 and shows a centered empty state when no files exist.

## Assets
- `public/assets/knowledge-source/book.svg` and `public/assets/figma/knowledge-empty.png`.

## Text Content
名称, 所有者, 创建时间, 上传时间, 操作, 暂无文件, 点击右上角上传文件或新建文件夹.

## Responsive Behavior
Four columns remain visible at all captured widths and scale fractionally; names and metadata truncate.
