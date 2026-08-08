# Design

> 天马AI门户 · 视觉系统（基于 shadcn-vue + TailwindCSS，阿里橙主色）

## Overview

产品级UI（product register），克制配色：中性zinc基底 + 阿里橙主操作 + 语义分类色。一致组件词汇，骨架屏加载，状态化动效。桌面优先、响应式可用。

## Color

**主色 — 阿里橙** `hsl(25 100% 50%)` ≈ `#FF6A00`（primary），hover `#E55F00`。primary-foreground 白。
仅用于：主按钮、当前选中态、链接、品牌logo、关键状态指示。不作装饰铺陈。

**中性基底 — shadcn zinc**：background `0 0% 100%`、foreground `240 10% 3.9%`、muted `240 4.8% 95.9%`、border `240 5.9% 90%`。内容区用 `bg-muted/30` 与白色卡片分层。

**语义分类色**（克制，仅badge/标签/小指示）：
- 竞对/威胁：red `0 72% 51%`（destructive）
- 行业：blue
- 集团：emerald
- 技术：violet
- 产品：amber

**威胁等级**：high=red、medium=orange、low=amber；同时配文字标签+图标，不只靠颜色。

对比度：正文 ≥4.5:1，大字 ≥3:1。muted-foreground 用于次要文字，避免在浅底上过浅。

## Typography

单一系统无衬线栈：`-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`。
固定 rem 刻度（产品UI不用fluid）：标题 24/20/16px，正文 14px，小字 12px。
正文行宽 65–75ch；标题用 `text-wrap: balance`。
不使用展示字体于UI标签/按钮/数据。

## Layout

- 容器居中、max-width 1280px、padding 1.5rem。
- 12列栅格响应式：首页 Zone1 = 8+4，Zone3/Zone5 = 6+6。
- 卡片圆角 `0.75rem`、按钮 `0.5rem`、输入 `0.375rem`。
- 阴影柔和（shadcn默认）；高危竞对卡片用 `ring-2 ring-red-500/40`（非左侧色条）。
- 间距基数4px，区块间用 24/32px 节奏变化。

## Components

shadcn-vue 原子组件统一词汇：Button（variant: default/ghost/outline/secondary/destructive/link；size: default/sm/icon）、Card、Badge、Input、Avatar、Tabs、Table、Pagination、Alert、Tooltip、DropdownMenu、Separator、Skeleton、Dialog。
每个交互组件具备 default/hover/focus/active/disabled/loading 完整状态。
骨架屏用于加载，非转圈；空状态要教学（"即将上线"/"暂无内容"）。

## Motion

150–250ms，ease-out，仅传达状态（hover反馈、加载、切换）。无装饰性动效、无页面加载编排。
尊重 `prefers-reduced-motion: reduce`。

## Iconography

lucide-vue-next，线性 1.5–2px，`size-4` 默认。与文字同色或 muted-foreground。分类用 emoji 仅在分类名内（⚔️🌐🏢📚📢），不作为图标系统滥用。
