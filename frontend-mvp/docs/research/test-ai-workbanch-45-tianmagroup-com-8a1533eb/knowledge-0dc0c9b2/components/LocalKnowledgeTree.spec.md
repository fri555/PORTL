# Local Knowledge Tree Specification

## Overview

- Target files: `src/mock/knowledge-source.ts`, `src/types/knowledge-source.ts`, `KnowledgeSidebar.vue`, `KnowledgeTable.vue`, `KnowledgeBaseView.vue`.
- Visual target: keep the captured production knowledge-center shell and table styling.
- Content source: local repository mock concepts only. Do not use the online test system's knowledge-base names, owners, dates, or files.
- Interaction model: click-driven hierarchy navigation.

## Local content model

- Public roots use the existing local product concepts: 集团制度知识库、商品基础资料库、方案中心案例库、团购预算池、AI项目知识库、线上运营素材库、视觉规范与模板库、技术项目资料库、财务制度资料库、仓储作业SOP库、品牌活动资料库、人力培训知识库.
- Personal roots use: 我的客户资料、临时方案草稿、AI学习笔记、客户素材归档.
- Every knowledge base has realistic nested folders and files. At least six public knowledge bases and two personal knowledge bases contain folder nodes; several have two folder levels.
- Nodes contain stable local ids, name, node type, owner, updated time, optional format/size, and children.

## Sidebar

- Knowledge bases with children have chevrons.
- Expanding a knowledge base reveals its immediate folders/files; expanding folders reveals deeper nodes.
- Clicking a knowledge base opens its root listing. Clicking a folder opens that folder in the main table. Clicking a file opens preview.
- Active knowledge base/folder/file is visibly selected.
- Public/personal tabs filter both the sidebar and main list.

## Main table

- Root state lists local knowledge bases.
- Knowledge-base state lists its immediate folders and files.
- Folder state lists that folder's immediate children.
- Folder rows use a folder icon and count; file rows use a file icon and show owner/update time.
- Clicking a folder drills in. Clicking a file opens the existing right preview drawer.
- Breadcrumb contains `全部知识库 › 知识库 › …文件夹`; every earlier segment is clickable.
- Empty state is used only for a genuinely empty folder.
- Row menus remain available for knowledge bases and folders/files where applicable.

## Mutation behavior

- New folder is inserted into the currently open knowledge base or folder in local memory and appears immediately in sidebar and table.
- Upload inserts local file nodes into the current location.
- Rename/delete update the local hierarchy only.
- Permission lock markers stay keyed by resource id and therefore work for knowledge bases and nested folders/files.

## Visual constraints

- Preserve current header, spacing, 57px rows, table columns, hover background, 12px row highlight radius, modal styles, and responsive breakpoints.
- Content changes must not introduce a different visual system.
