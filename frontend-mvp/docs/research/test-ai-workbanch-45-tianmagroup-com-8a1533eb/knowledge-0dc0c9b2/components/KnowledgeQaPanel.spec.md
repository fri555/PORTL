# KnowledgeQaPanel Specification

## Overview
- Target: `src/components/knowledge/source-clone/KnowledgeQaPanel.vue`
- Screenshot: `design-qa-assets/source/knowledge-qa-panel-desktop.png`
- Interaction model: click-driven resizable side panel

## DOM Structure
Resize handle → 360px aside → title/close → scrollable conversation log → seeded assistant answer/citation controls → composer → disclaimer.

## Styles
- White panel, full knowledge-page height, left border/shadow, 360px default width.
- Header is 56px with 16px title and close icon.
- Conversation area scrolls independently.
- Composer has 12px radius, gray border/shadow, textarea, and circular send control.
- Disclaimer: 12px secondary gray centered under composer.

## States & Behaviors
- Opening removes 小智问答 from the main action group and narrows the table.
- Close restores the main list width.
- Drag handle changes panel width within 320–520px.
- Typing enables send; send appends user question and a deterministic local assistant response.
- Copy and citation buttons show local feedback.

## Text Content
小智问答, 输入你的问题..., 发送, 复制, 参考 1 篇资料, 内容由 AI 生成，请核实重要信息.

## Responsive Behavior
- Desktop/tablet: right panel in the page grid.
- Mobile: fixed full-width overlay panel.
