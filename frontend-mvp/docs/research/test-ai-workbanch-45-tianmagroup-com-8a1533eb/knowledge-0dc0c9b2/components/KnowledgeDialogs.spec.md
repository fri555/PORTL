# KnowledgeDialogs Specification

## Overview
- Target: `src/components/knowledge/source-clone/KnowledgeDialogs.vue`
- Screenshots: create, folder, upload, rename, permission captures under `design-qa-assets/source/`
- Interaction model: click-driven overlays and forms

## DOM Structure
Portaled overlay → dialog surface → header/title/close → form content → footer actions. Rename is a compact right-aligned surface without overlay.

## Styles
- Overlay: fixed inset 0, gray/black dim layer.
- Standard surface: white, 12px radius, subtle shadow, centered.
- Create/folder: 480px desktop width; 24px padding; required labels with red asterisk; 32px footer buttons.
- Upload: 740px desktop width; dashed drop zone; large empty-file area; disabled confirm gray.
- Permission: 480px wide; title 18px; 360px member area; search field; blue add-member action; black save button.
- Rename: 324px wide, right aligned near the triggering row; no page dim; textarea-like name field; black confirm button.
- Mobile: surfaces use `calc(100vw - 24px)` and remain vertically scrollable.

## States & Behaviors
- Primary action disabled until required fields are valid.
- Cancel, close, and overlay click dismiss without mutation.
- Confirm create/folder/rename/delete updates only local state.
- Upload file input updates a local list; no network transfer.
- Permission add/search/save manipulates local mock members.

## Text Content
新建知识库, 知识库名称, 所属空间, 公共空间, 个人空间, 新建文件夹, 文件名称, 所属知识库, 上传文件, 上传至, 点击上传，或拖拽 / 粘贴文件到此处, 支持 pdf、doc、docx、xls、xlsx、csv、txt、md，单文件 ≤ 50MB，单次最多 100个, 暂无本地文件, 权限管理, 全部成员, 添加成员, 搜索部门/人员..., 暂无成员, 重命名, 取消, 新建, 确定, 保存.

## Responsive Behavior
Desktop sizes above; mobile uses a 12px viewport gutter and retains the same field order.
