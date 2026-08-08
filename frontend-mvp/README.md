# 天马 AI · 智能工作门户（Demo）

南京天马集团 AI 门户前端 Demo，聚焦「首页文化阵地 + AI 资讯与竞对情报」。以资讯、竞对情报为文化引擎，让全员建立 AI 紧迫感与行业视野。所有数据为 Mock，不接后端。

> 技术栈：Vue 3 + TypeScript + Vite + TailwindCSS + shadcn-vue（reka-ui）+ lucide-vue-next，主色阿里橙。

## 功能特性

- **钉钉扫码登录**：mock 状态机（点击二维码或「模拟扫码登录」即可进入），未登录自动重定向。
- **首页（6 区）**：Hero 头条焦点 + AI 热榜、竞对情报条、部门 AI 价值榜 + 需求之声、行业前沿、集团动态 + 推荐课程、AI 工具箱快捷条。骨架屏加载。
- **资讯列表页**：分类 Tab（竞对/行业/集团/技术/产品）、搜索、最新/最热排序、热门标签、分页。
- **竞对情报页**：威胁预警横幅、竞品卡片网格、行业对标看板（我司行阿里橙高亮，凸显与竞对差距）。
- **文章详情页**：富文本正文、点赞/收藏（localStorage 持久化）/分享复制链接、标签、相关资讯。
- 一致的设计系统：克制配色、完整交互状态、无死路由（未做页统一 Tooltip「即将上线」）。

## 快速开始

### 环境要求

- Node.js ≥ 20（开发环境为 Node 24）
- pnpm ≥ 10

### 安装

```bash
pnpm install
```

> 若 `pnpm install` 因构建脚本报错，已通过 `pnpm-workspace.yaml` 的 `dangerouslyAllowAllBuilds: true` 放行；包源默认走 npmmirror 镜像（见 `.npmrc`）。

### 开发

```bash
pnpm dev
```

默认打开 `http://localhost:5173`，未登录会重定向到 `/auth/login`。点击二维码或「模拟扫码登录」按钮即以 mock 用户（张三 / 营销部）进入首页。

### 构建

```bash
pnpm build      # vue-tsc 类型检查 + vite 生产构建，产物在 dist/
```

### 预览构建产物

```bash
pnpm preview
```

### 测试

```bash
pnpm test           # 运行单元测试 + 集成冒烟测试
pnpm test:watch     # 监听模式
pnpm typecheck      # 仅类型检查（vue-tsc --noEmit）
```

## 常用脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 类型检查 + 生产构建 |
| `pnpm preview` | 预览构建产物 |
| `pnpm test` | 运行测试 |
| `pnpm typecheck` | 类型检查 |

## 路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/auth/login` | 登录页 | 钉钉扫码登录（mock） |
| `/` | 首页 | 文化阵地，6 区组成 |
| `/news` | 资讯列表 | 支持 `?category=`、`?q=`、`?tag=` 查询参数 |
| `/news/competitor` | 竞对情报 | 威胁预警 + 对标看板 |
| `/news/:id` | 文章详情 | 富文本 + 互动 |

路由守卫：未登录访问受保护页面 → 重定向 `/auth/login?redirect=...`。

## 项目结构

```
src/
├── components/
│   ├── ui/              # shadcn-vue 原子组件（button/card/badge/input/avatar/tabs/table 等）
│   ├── common/          # AppHeader/AppFooter/PageContainer/SearchBar/EmptyState/CategoryBadge/SectionHeader
│   ├── auth/            # DingTalkQR
│   ├── home/            # HeroHeadline/TrendingSidebar/CompetitorTicker/RankShowcase/DemandVoices/NewsFeed/InternalDynamic/CourseRecommend/ToolShortcutBar
│   ├── competitor/      # CompetitorCard/ThreatAlert/BenchmarkTable
│   └── news/            # ArticleCard/CategoryTabs
├── composables/         # useAuth/useHome/useNews/useCompetitors/useArticle（mock 数据接入层）
├── mock/                # articles/competitors/home/user（类型化 mock 数据）
├── stores/app.ts        # Pinia：当前用户 + 点赞/收藏（localStorage 持久化）
├── layouts/             # DefaultLayout / AuthLayout
├── views/               # HomeView/NewsListView/CompetitorIntelView/ArticleDetailView/LoginView
├── router/index.ts      # 路由 + 鉴权守卫
├── lib/                 # utils(cn)/constants(分类元数据)/placeholder(SVG占位图)/format(时间/数字)
├── types/               # article/competitor/home/user 类型定义
└── assets/styles/globals.css   # shadcn CSS 变量（阿里橙 primary）
```

## 设计系统

- **主色**：阿里橙 `hsl(25 100% 50%)` ≈ `#FF6A00`，仅用于主操作、当前选中、状态指示。
- **中性基底**：shadcn `zinc`，内容区 `bg-muted/30` 与白色卡片分层。
- **语义分类色**：竞对/威胁=red、行业=blue、集团=emerald、技术=violet、产品=amber。
- **字体**：系统无衬线栈（PingFang SC / Microsoft YaHei），标题 24/20/16px，正文 14px。
- 详见 `DESIGN.md`，产品定位见 `PRODUCT.md`。

## Mock 数据

- `src/mock/articles.ts`：24 篇资讯，覆盖 5 个分类（含 8 篇竞对情报，带威胁等级与竞对名称），1 篇头条。
- `src/mock/competitors.ts`：5 个竞品档案 + 我司档案（对标看板用）。
- `src/mock/home.ts`：首页 6 区聚合数据。
- 封面图统一用本地生成 SVG 渐变占位（`src/lib/placeholder.ts`），离线、确定性、无外网依赖。

## 接入真实 API

数据全部通过 `src/composables/` 暴露，替换为真实接口只需改动 composable 内部实现（如把 `useNews` 的 `filterArticles` 换成后端分页请求），上层组件无需改动。API 契约可参考 `D:\AI项目\Aigc\docs\需求文档\AI工作门户.md` 第 4 节。

## 相关文档

- 设计文档：`docs/superpowers/specs/2026-06-21-ai-portal-news-competitor-demo-design.md`
- 实现计划：`docs/superpowers/plans/2026-06-21-ai-portal-news-competitor-demo.md`
- 产品需求：`D:\AI项目\Aigc\docs\需求文档\AI工作门户.md`

## 说明

本仓库为前端 Demo，数据均为 Mock，未对接真实 SSO/钉钉 OAuth 后端。真实钉钉登录走 `login.dingtalk.com/oauth2/auth` 跳转 + `authCode` 回调换用户信息，Demo 模拟该流程。

© 2026 南京天马集团 · AI 项目组
