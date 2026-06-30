# 天马 AI 门户 Demo — 资讯与竞对情报 设计文档

> 日期：2026-06-21
> 范围：南京天马集团 AI 门户的前端 Demo（首页 + AI 资讯与竞对情报板块）
> 依据：`D:\AI项目\Aigc\docs\需求文档\AI工作门户.md` v1.2 §3.1（首页，不含价值看板）与 §3.3（资讯与竞对情报）
> 技术栈：Vue3 + TypeScript + TailwindCSS + shadcn-vue + lucide-vue-next

---

## 1. 目标与范围

构建一个可点击、视觉完成度高的前端 Demo，落地门户"文化引擎"定位：让全员建立 AI 紧迫感与行业视野，核心差异化模块为**竞对情报**。所有数据 mock，不接后端。

### 1.1 包含

- **登录页**：钉钉扫码登录（mock 流程）。
- **首页**：Hero 头条焦点 + AI 热榜、竞对情报条、部门 AI 价值榜 + 需求之声、行业前沿、集团动态 + 推荐课程、AI 工具箱快捷条。**不含** v1.2 顶部 AI 业务价值看板（指标条 + 业务场景价值卡）。
- **资讯列表页**：分类 Tab、搜索、排序、标签筛选、分页卡片列表。
- **竞对情报页**：子分类 Tab、威胁预警横幅、竞品卡片网格、行业对标看板。
- **文章详情页**：封面 + 富文本正文 + 点赞/收藏/分享 + 标签 + 相关资讯。

### 1.2 不包含（Out of Scope）

- AI 业务价值看板（指标条 + 业务场景价值卡）。
- 需求池 / 排行榜 / 培训中心 / 个人中心 / 管理后台等独立页面；首页对应 widget 仅作展示，"查看全部"为静态按钮（tooltip"即将上线"），不产生死路由。
- 真实 SSO / 钉钉 OAuth 后端对接（Demo 模拟扫码流程）。
- ECharts 图表、TipTap 富文本编辑器（详情页正文为只读渲染 HTML）。
- 暗色模式（Demo 仅亮色）、移动端深度适配（桌面优先，响应式可用即可）。
- RSS 抓取、AI 摘要（P2/P3）。

---

## 2. 关键决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| Demo 范围 | 首页 + 资讯与竞对情报 | 门户骨架感 + 聚焦文化引擎，工作量可控 |
| 首页价值看板 | 不含，从 Hero 头条开始 | 聚焦资讯/竞对文化引擎，减少管理层 ROI mock 数据 |
| 视觉风格 | shadcn 中性（zinc）+ 阿里橙 `#FF6A00` primary | 公司主色为阿里橙，shadcn 干净专业 |
| 架构方案 | 方案 A：Lean data-file mocking | composables 返回 mock 数据，最快出可点击 demo，后续易替换为真实 API |
| 登录 | 钉钉扫码登录（mock） | 与阿里橙/钉钉生态一致；模拟扫码状态机 |
| 跳转策略 | 仅跳已做页面，未做页"查看全部"为静态按钮 + tooltip | 避免死路由，保持 demo 诚实 |

---

## 3. 技术栈

- **构建**：Vite 5 + Vue 3.4（`<script setup>`）+ TypeScript 5
- **样式**：TailwindCSS 3.4 + `tailwindcss-animate`；shadcn-vue 组件（基于 `reka-ui`）通过 CLI 落入 `src/components/ui/`
- **图标**：`lucide-vue-next`
- **工具**：`class-variance-authority` + `clsx` + `tailwind-merge`，封装 `cn()`
- **路由**：`vue-router` 4（history 模式）
- **状态**：`pinia`（仅跨切面 UI 状态：当前 mock 用户、点赞/收藏 id 集合）
- **二维码**：`qrcode`（生成钉钉登录二维码 data URL）
- **不使用**：ECharts、TipTap、Axios、MSW

---

## 4. 项目结构

```
fronted/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn-vue 原子组件（button/card/badge/input/avatar/tabs/table/pagination/alert/dialog 等）
│   │   ├── common/          # AppHeader, AppFooter, PageContainer, SearchBar, EmptyState, CategoryBadge
│   │   ├── home/            # HeroHeadline, TrendingSidebar, CompetitorTicker, RankShowcase,
│   │   │                     DemandVoices, NewsFeed, InternalDynamic, CourseRecommend, ToolShortcutBar
│   │   ├── competitor/      # CompetitorCard, ThreatAlert, BenchmarkTable
│   │   ├── news/            # ArticleCard, ArticleList, CategoryTabs
│   │   └── auth/            # DingTalkQR, LoginPanel
│   ├── composables/         # useNews, useCompetitors, useHome, useArticle, useAuth
│   ├── mock/                # articles.ts, competitors.ts, home.ts, user.ts
│   ├── layouts/             # DefaultLayout.vue, AuthLayout.vue
│   ├── router/index.ts      # 路由 + 守卫
│   ├── stores/app.ts        # mock 当前用户 + liked/bookmarked id 集合（localStorage 持久化）
│   ├── views/               # HomeView, NewsListView, CompetitorIntelView, ArticleDetailView, LoginView
│   ├── types/               # article.ts, competitor.ts, home.ts, user.ts
│   ├── lib/utils.ts         # cn()
│   ├── assets/styles/globals.css   # shadcn CSS 变量（阿里橙 primary）
│   ├── App.vue / main.ts
├── tailwind.config.ts / tsconfig.json / vite.config.ts / components.json / index.html
```

---

## 5. 路由与鉴权

```
/auth/login              LoginView          （AuthLayout，免鉴权）
/                        HomeView           （DefaultLayout，需鉴权）
/news                    NewsListView       （?category=...）
/news/competitor         CompetitorIntelView
/news/:id                ArticleDetailView
```

- 路由守卫：未登录（pinia/localStorage 无 mock 用户）→ 重定向 `/auth/login`。
- 登录成功 → `router.push('/')`（或 redirect query）。
- 退出登录 → 清除 mock 用户 → `/auth/login`。

---

## 6. 登录页 — 钉钉扫码（mock）

**布局**：`AuthLayout` 全屏，阿里橙渐变背景；居中 `LoginView` 卡片分两栏：
- 左：品牌面板 — 天马 AI logo + slogan + 特性要点。
- 右：登录面板 — 钉钉二维码 + 状态文案。

**二维码**：用 `qrcode` 生成真实 QR，编码 mock 钉钉 OAuth URL（`https://login.dingtalk.com/oauth2/auth?client_id=mock...`），中央叠加钉钉 logo。

**状态机**（mock）：
1. `pending`："请使用钉钉扫描二维码登录"。
2. 点击二维码 → `scanned`："扫描成功，请在钉钉确认"。
3. 1.2s 后 → `confirmed`："登录成功，正在跳转..." → 写入 mock 用户（张三 / 营销部 / role: user）→ `router.push('/')`。
4. 额外"模拟扫码登录"按钮：一键直达 `confirmed`（便于演示）。
5. "刷新二维码"链接：重置为 `pending` 并重新生成 QR。

**说明**：真实钉钉登录走 `login.dingtalk.com/oauth2/auth` 跳转 + `authCode` 回调换用户信息；Demo 模拟该流程，不接后端。底部小字：登录即同意《服务条款》《隐私政策》。

---

## 7. 首页组成（自上而下 6 区）

`AppHeader`：天马 AI logo · 搜索框 · 导航（价值看板[disabled] / 资讯 / 竞对 / 培训[disabled] / 需求池[disabled]）· 张三 avatar 下拉（个人中心[disabled] / 退出）。下方 12 列响应式栅格，max-width 容器。

### Zone 1 — Hero 头条焦点 + AI 热榜（≈22%）
- 左 8 列：头条文章（`is_headline`），大封面/背景，标题、摘要、`[阅读全文]`、meta（3小时前 · 1.2k阅读），竞对则带威胁 badge。点击 → 详情。
- 右 4 列：`🔥 AI热榜` TOP5，序号 pill 1-5、标题、阅读/评论数，热点带 🔥/红点。点击 → 详情。

### Zone 2 — ⚔️ 竞对情报条（≈12%）
标题"竞对情报 · 同行动态，知己知彼" + `[更多→]`→竞对页。3 张 `CompetitorCard` 横排：封面、竞品名、一句话摘要、子分类 badge（竞品动态/行业对标/威胁预警）、时间+阅读数。威胁级卡片左侧红色边条。

### Zone 3 — 部门 AI 价值榜 + 需求之声（≈15%）
- 左 6 列：`🏆 部门 AI 价值榜 TOP5`，奖牌 pill 🥇🥈🥉 + 部门 + 价值指标 + 分值。脚注"💡按业务价值排名"。`[查看完整榜单→]`（disabled）。
- 右 6 列：`💬 需求之声` TOP3（🔥 + 标题 + 票数 + 部门·状态 pill）。`[我要提需求]`、`[查看全部→]` 均 disabled。

### Zone 4 — 📰 行业前沿（≈18%）
图文横排列表 3 条：左缩略图、右标题+摘要+meta（👁·💬·time）。点击 → 详情。`[更多→]`→资讯列表（industry tab）。

### Zone 5 — 🏢 集团动态 + 🎓 本周推荐课程（≈12%）
- 左 6 列：集团动态紧凑列表（📌 标题 · 部门 · 状态 pill · time），`[查看全部动态→]`→资讯列表（internal tab）。
- 右 6 列：推荐课程 2 张小卡（封面+标题+难度/时长+已学人数），`[进入学习中心→]`（disabled）。

### Zone 6 — 🛠 AI 工具箱快捷条（≈4%）
一行工具 chips：AI对话/智能报表/文档助手/AI绘图/知识检索/[更多→]。点击 disabled tooltip。纯展示。

**数据**：单一 `useHome()` 返回 `{ headline, trending, competitorNews, deptRank, demandVoices, industryNews, internalNews, courses, tools }`，每区骨架屏 loading。

---

## 8. 深度页面

### 8.1 资讯列表页 `NewsListView`（`/news`）
- 页头："AI 资讯"标题 + 面包屑。
- **分类 Tab**（shadcn `Tabs`）：全部 / ⚔️竞对情报 / 🌐行业前沿 / 🏢集团动态 / 📚技术分享 / 📢产品更新，`?category=` 驱动。"竞对情报"Tab 也可深链到竞对页。
- **工具条**：搜索输入（实时过滤标题/摘要）、排序下拉（最新/最热）、热门标签 chips。
- **列表**：响应式卡片栅格（md 1 列 / lg 2 列）。`ArticleCard`：封面、分类 badge、标题、2 行摘要、meta（作者·部门·time·👁·💬·👍）、置顶 pin、竞对威胁红 badge。Hover 上浮。
- **分页**：shadcn `Pagination`，12/页。无结果空状态。

### 8.2 竞对情报页 `CompetitorIntelView`（`/news/competitor`）
核心差异化页面，视觉冲击最强。
- 页头："⚔️ 竞对情报" + 副标题"同行动态，知己知彼"。
- **子 Tab**：全部 / 竞品动态 / 行业对标 / 威胁预警。右侧搜索。
- **威胁预警横幅**（顶部，存在威胁项时）：红色 `Alert` 卡 — `⚡` 图标、威胁标题、冲击摘要、来源·时间·阅读·评论。仅 high/medium 显示。
- **竞品卡片网格**（3 列）：`CompetitorCard` — 封面、竞品名+行业 tag、摘要、子分类 badge、威胁级色点、时间+阅读。high 威胁红环/红边。
- **行业对标看板**（`BenchmarkTable`）：shadcn `Table`，列：竞品 / AI 覆盖部门 / AI 项目数 / 核心场景 / 最新动态。行=竞品。**末行高亮=我司**（9/15 部门，12 个 AI 项目）阿里橙强调，让员工一眼看到差距——紧迫感落点。
- 各区 `[更多→]` 回链资讯列表对应筛选。

### 8.3 文章详情页 `ArticleDetailView`（`/news/:id`）
- **Hero**：全宽封面、分类 badge、标题（24px）、摘要、meta（作者 avatar+名·部门·发布时间·来源·原文链接）、竞对威胁 badge。
- **正文**：富文本以 styled HTML 渲染（tailwind 排版：headings/p/ul/blockquote/img/code）。只读，无编辑器。支持图片/视频 URL 嵌入。
- **操作条**：👍点赞（toggle+计数）· 🔖收藏（toggle）· 📤分享（复制链接 toast）。点赞/收藏接 Pinia，localStorage 持久化。
- **标签**：pill chips，点击 → 资讯列表按标签筛选。
- **相关资讯**：底部 3 卡（同分类）。
- 返回列表链接。挂载时阅读量 +1（mock）。

---

## 9. 设计 Token

**globals.css shadcn 变量 + tailwind.config**
- Primary = 阿里橙 `#FF6A00`（hover `#E55F00`）；`--primary` / `--primary-foreground`。
- 中性基底 = shadcn `zinc`（Demo 仅亮色）。
- 语义色：竞对/威胁 = red `#DC2626`（destructive）；行业 = blue；集团 = emerald；技术 = violet；产品 = amber。每个分类映射 badge 颜色。
- 圆角：card `0.75rem`、button `0.5rem`、input `0.375rem`。
- 字体：`-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`；标题 24/20/16px，正文 14px。
- 阴影：shadcn 默认（柔和）。竞对 high 威胁卡片 `ring-2 ring-red-500/40`。
- 间距基数 4px（tailwind 默认）。

---

## 10. Mock 数据模型

`src/mock/`：
- `articles.ts`：~24 篇，覆盖 5 分类（含 8 篇竞对情报，带 threat_level + competitor_name）。字段：id/title/summary/content(HTML)/cover/author/dept/views/likes/comments/tags/published_at/is_headline/is_pinned。1 篇 `is_headline` 供 Hero。
- `competitors.ts`：5 个竞品档案（name, industry, ai_coverage, ai_project_count, core_scenarios, threat_assessment, last_updated）供对标看板。
- `home.ts`：聚合 headline + trending(5) + competitorNews(3) + deptRank(5) + demandVoices(3) + industryNews(3) + internalNews(3) + courses(2) + tools(6)。
- `user.ts`：mock 张三（营销部, role: user, avatar）。
- 全部由 `types/` 强类型约束。

封面图统一使用**本地生成 SVG 渐变占位图**（按分类着色 + 标题首字），离线、确定性、无外网依赖。

---

## 11. 验收标准（Demo）

- 钉钉扫码登录可走通（点击 QR / 一键按钮 → 进入首页）。
- 首页 6 区全部渲染 mock 数据，骨架屏 → 内容过渡自然，各"阅读全文/更多"链路可达。
- 资讯列表分类/搜索/排序/分页可用；竞对 Tab 可跳竞对页。
- 竞对页威胁横幅、卡片网格、对标看板（含我司高亮行）完整。
- 文章详情正文排版正常，点赞/收藏可 toggle 且刷新保持，分享复制链接 toast。
- 未做页"查看全部"为静态按钮 + tooltip，无死路由/404。
- TypeScript 无类型错误；`npm run build` 通过。
