# KnowledgeSidebar Specification

## Overview
- Target: `src/components/knowledge/source-clone/KnowledgeSidebar.vue`
- Screenshot: `design-qa-assets/source/knowledge-sidebar-open-desktop.png`
- Interaction model: click-driven drawer/tree

## DOM Structure
`aside` → icon row → create button → segmented space switch → scrollable tree → repeated tree row with optional chevron, source book icon, label, count, and nested documents.

## Computed Styles
- Desktop width: 280px; white background; flex column; hidden overflow.
- Desktop open placement: grid column; full content height below 56px app header.
- Mobile closed: fixed at `x:-280px`, `top:56px`, `width:280px`, `height:788px`, opacity 0, shadow `rgba(0,0,0,.15) 4px 0 24px`, z-index 200.
- Create button: 36px high, 12px top/horizontal margin, 8px radius, `rgb(17,17,17)`, 14px/22px, weight 500.
- Space switch: 36px high, margin `16px 12px 0`, padding 3px, background `rgb(247,247,249)`, radius 8px. Active item is white with `0 4px 12px rgba(0,0,0,.08)`.
- Tree row: 36px high; 14px text; source icon 16px; counts use secondary gray.

## States & Behaviors
- Collapse button sets closed state.
- Public/personal tabs switch datasets and selected tab styling.
- Chevron expands/collapses documents.
- Selecting a knowledge base emits its id and closes the mobile drawer.
- Hover background is `rgb(247,247,249)`.

## Assets
- Use the locally copied source book/document icon from `public/assets/knowledge-source/book.svg`.

## Text Content
搜索, 折叠侧栏, 新建知识库, 公共空间, 个人空间, and the exact captured knowledge-base names/counts.

## Responsive Behavior
- Desktop/tablet: grid column with animated width.
- Mobile 390px: fixed overlay drawer, 280px wide, closing after selection.
