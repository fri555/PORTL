# 天马 AI 门户 Demo 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建可点击的天马 AI 门户前端 Demo（钉钉扫码登录 + 首页 + 资讯与竞对情报），数据全 mock。

**Architecture:** Vite + Vue3 + TS，shadcn-vue（reka-ui）组件 + TailwindCSS，阿里橙 primary。composables 返回 mock 数据（模拟异步 + 骨架屏），Pinia 仅存当前用户与点赞/收藏集合。视觉实现遵循 impeccable 技能。

**Tech Stack:** Vue 3.4, TypeScript 5, Vite 5, TailwindCSS 3.4, shadcn-vue (reka-ui), lucide-vue-next, pinia, vue-router 4, qrcode, vitest（仅测纯逻辑）

## Global Constraints

- 包管理器：pnpm
- Primary 色：阿里橙 `#FF6A00`（HSL `25 100% 50%`），primary-foreground 白
- 中性基底：shadcn `zinc`
- 仅亮色模式；桌面优先，响应式可用即可
- 封面图统一用本地 SVG 渐变占位（离线、确定性）
- 未做页"查看全部"为静态按钮 + Tooltip"即将上线"，不产生死路由
- 每个任务结束验证：`pnpm typecheck`（vue-tsc --noEmit）+ `pnpm build` 通过后 commit
- 工作目录：`D:\AI项目\Aigc\fronted`
- git 分支：main

---

## File Structure

```
src/
├── lib/utils.ts                    # cn()
├── lib/constants.ts                # 分类→颜色映射、分类元数据
├── lib/placeholder.ts              # SVG 占位图生成
├── assets/styles/globals.css       # shadcn CSS 变量（阿里橙）
├── types/{article,competitor,home,user}.ts
├── mock/{articles,competitors,home,user}.ts
├── stores/app.ts                   # 当前用户 + likes/bookmarks（localStorage）
├── composables/{useAuth,useHome,useNews,useCompetitors,useArticle}.ts
├── router/index.ts                 # 路由 + 守卫
├── layouts/{DefaultLayout,AuthLayout}.vue
├── components/
│   ├── ui/                         # shadcn-vue 原子组件（CLI 生成）
│   ├── common/{AppHeader,AppFooter,PageContainer,SearchBar,EmptyState,CategoryBadge,Skeleton}.vue
│   ├── auth/{DingTalkQR,LoginPanel}.vue
│   ├── home/{HeroHeadline,TrendingSidebar,CompetitorTicker,RankShowcase,DemandVoices,NewsFeed,InternalDynamic,CourseRecommend,ToolShortcutBar}.vue
│   ├── competitor/{CompetitorCard,ThreatAlert,BenchmarkTable}.vue
│   └── news/{ArticleCard,CategoryTabs}.vue
├── views/{HomeView,NewsListView,CompetitorIntelView,ArticleDetailView,LoginView}.vue
├── App.vue / main.ts
tailwind.config.ts / tsconfig.json / vite.config.ts / components.json / index.html
```

---

## Task 1: 项目脚手架 + 设计 token

**Files:** Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tailwind.config.ts`, `postcss.config.js`, `src/assets/styles/globals.css`, `src/lib/utils.ts`, `components.json`, `.gitignore`, `index.html`, `src/main.ts`, `src/App.vue`

- [ ] **Step 1: 脚手架初始化**

```powershell
cd D:\AI项目\Aigc\fronted
pnpm create vite@latest . --template vue-ts
```
（若提示目录非空选忽略；docs 目录保留）

- [ ] **Step 2: 安装依赖**

```powershell
pnpm add pinia vue-router@4 lucide-vue-next qrcode class-variance-authority clsx tailwind-merge reka-ui
pnpm add -D tailwindcss@3 postcss autoprefixer tailwindcss-animate @types/qrcode vitest @vue/test-utils jsdom
```

- [ ] **Step 3: 初始化 tailwind + shadcn 配置**

`tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    container: { center: true, padding: '1.5rem', screens: { '2xl': '1280px' } },
    extend: {
      colors: {
        border: 'hsl(var(--border))', input: 'hsl(var(--input))', ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))', foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
      fontFamily: { sans: ['-apple-system','"PingFang SC"','"Microsoft YaHei"','sans-serif'] },
      keyframes: { 'accordion-down': { from:{height:'0'}, to:{height:'var(--reka-accordion-content-height)'} }, 'accordion-up': { from:{height:'var(--reka-accordion-content-height)'}, to:{height:'0'} } },
      animation: { 'accordion-down':'accordion-down 0.2s ease-out','accordion-up':'accordion-up 0.2s ease-out' },
    },
  },
  plugins: [animate],
} satisfies Config
```

`postcss.config.js`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

`src/assets/styles/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
@layer base {
  :root {
    --background: 0 0% 100%; --foreground: 240 10% 3.9%;
    --card: 0 0% 100%; --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%; --popover-foreground: 240 10% 3.9%;
    --primary: 25 100% 50%; --primary-foreground: 0 0% 100%;
    --secondary: 240 4.8% 95.9%; --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%; --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%; --accent-foreground: 240 5.9% 10%;
    --destructive: 0 72% 51%; --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%; --input: 240 5.9% 90%; --ring: 25 100% 50%;
    --radius: 0.75rem;
  }
}
@layer base { * { @apply border-border; } body { @apply bg-background text-foreground; font-feature-settings: "kern"; } }
```

`src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: { environment: 'jsdom', globals: true } as any,
})
```

`tsconfig.json`（补 paths）:
```json
{
  "compilerOptions": {
    "target": "ES2020", "useDefineForClassFields": true, "module": "ESNext", "lib": ["ES2020","DOM","DOM.Iterable"],
    "skipLibCheck": true, "moduleResolution": "bundler", "allowImportingTsExtensions": true, "resolveJsonModule": true,
    "isolatedModules": true, "noEmit": true, "jsx": "preserve", "strict": true, "noUnusedLocals": true, "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true, "baseUrl": ".", "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*.ts","src/**/*.d.ts","src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`package.json` scripts 增加：
```json
"typecheck": "vue-tsc --noEmit",
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: shadcn-vue 初始化 + 基础组件**

```powershell
npx shadcn-vue@latest init -y
npx shadcn-vue@latest add button card badge input avatar tabs table pagination alert tooltip dropdown-menu separator skeleton dialog -y
```

- [ ] **Step 5: 验证 + commit**

```powershell
pnpm typecheck
pnpm build
git add -A; git commit -m "chore: 项目脚手架 + 阿里橙设计 token + shadcn-vue"
```

---

## Task 2: 类型 + mock 数据 + 占位图

**Files:** Create: `src/types/*.ts`, `src/mock/*.ts`, `src/lib/constants.ts`, `src/lib/placeholder.ts`

**Interfaces (Produces):**
- `Article { id; title; summary; content(HTML); category: 'competitor'|'industry'|'internal'|'tech'|'product'; subCategory?: string; threatLevel?: 'high'|'medium'|'low'; competitorName?: string; source?; sourceUrl?; coverImage; author; department; viewCount; likeCount; commentCount; tags: string[]; publishedAt: string(ISO); isHeadline?: boolean; isPinned?: boolean }`
- `CompetitorProfile { id; name; industry; aiCoverage; aiProjectCount; coreScenarios; threatAssessment; lastUpdated: string(ISO) }`
- `MockUser { id; displayName; department; role; avatarUrl }`
- `DeptRankItem { rank; department; metric; score }`
- `DemandVoice { id; title; voteCount; department; status }`
- `CourseItem { id; title; cover; difficulty; duration; enrolled }`
- `ToolItem { id; name; icon }`

- [ ] **Step 1: 写类型文件** `src/types/article.ts` 等四个文件，按上 Interface 落地（均 `export interface`）。

- [ ] **Step 2: `src/lib/constants.ts`** 分类元数据：
```ts
export const CATEGORIES = [
  { key: 'competitor', label: '⚔️ 竞对情报', color: 'text-red-600 bg-red-50 border-red-200' },
  { key: 'industry', label: '🌐 行业前沿', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { key: 'internal', label: '🏢 集团动态', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { key: 'tech', label: '📚 技术分享', color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { key: 'product', label: '📢 产品更新', color: 'text-amber-600 bg-amber-50 border-amber-200' },
] as const
export const catMeta = (k: string) => CATEGORIES.find(c => c.key === k)
```

- [ ] **Step 3: `src/lib/placeholder.ts`** SVG 占位：
```ts
export function placeholder(text: string, hue = 25, w = 800, h = 450): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='hsl(${hue},90%,55%)'/><stop offset='1' stop-color='hsl(${hue+25},85%,40%)'/>
    </linearGradient></defs>
    <rect width='100%' height='100%' fill='url(#g)'/>
    <text x='50%' y='50%' fill='rgba(255,255,255,0.9)' font-size='48' font-family='sans-serif' text-anchor='middle' dominant-baseline='middle'>${text.slice(0,6)}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
```

- [ ] **Step 4: `src/mock/articles.ts`** 24 篇（5 分类，8 篇竞对带 threatLevel+competitorName，1 篇 isHeadline），content 为简单 HTML 片段。`src/mock/competitors.ts` 5 个竞品档案。`src/mock/home.ts` 聚合 deptRank(5)/demandVoices(3)/courses(2)/tools(6)。`src/mock/user.ts` 张三。

- [ ] **Step 5: 验证 + commit**
```powershell
pnpm typecheck; git add -A; git commit -m "feat: 类型定义 + mock 数据 + 占位图"
```

---

## Task 3: Pinia store + composables（含单元测试）

**Files:** Create: `src/stores/app.ts`, `src/composables/*.ts`, `src/composables/__tests__/*.test.ts`

**Produces:**
- `useAppStore()`：`{ user: MockUser|null; likes: Set<string>; bookmarks: Set<string>; login(u); logout(); toggleLike(id); toggleBookmark(id); isLiked(id); isBookmarked(id) }`，likes/bookmarks/user 持久化 localStorage。
- `useAuth()`：`{ status: 'pending'|'scanned'|'confirmed'; scan(); confirmMock(); refresh(); reset() }` 状态机。
- `useHome()`：`{ data: ref<HomeData|null>; loading: ref<boolean>; load() }`，setTimeout 600ms 模拟异步。
- `useNews()`：`{ list(category?, search?, sort?, tag?, page?, pageSize?) → {items,total} }` 纯函数过滤/分页/排序。
- `useCompetitors()`：`{ profiles: CompetitorProfile[]; articles(category='competitor', sub?); benchmark() }`
- `useArticle(id)`：`{ article: ref<Article|null>; related: Article[]; load(); incrementView() }`

- [ ] **Step 1: 写 useNews 过滤/分页纯逻辑测试** `src/composables/__tests__/useNews.test.ts`（测试 category 筛选、search、sort 最新/最热、分页 total/pages）。

- [ ] **Step 2: 运行测试确认失败** `pnpm test` → FAIL。

- [ ] **Step 3: 实现 store + composables**（app.ts 用 pinia + localStorage；useNews 内部纯函数 `filterArticles(all, opts)` 可单测）。

- [ ] **Step 4: 运行测试确认通过** `pnpm test` → PASS。

- [ ] **Step 5: 验证 + commit**
```powershell
pnpm typecheck; git add -A; git commit -m "feat: Pinia store + composables + 单元测试"
```

---

## Task 4: 路由 + 布局

**Files:** Create: `src/router/index.ts`, `src/layouts/DefaultLayout.vue`, `src/layouts/AuthLayout.vue`, 改 `src/App.vue`, `src/main.ts`

- [ ] **Step 1: `src/router/index.ts`** 5 路由 + `beforeEach` 守卫（无 user → /auth/login，除 login 页）。DefaultLayout children: `/`,`/news`,`/news/competitor`,`/news/:id`。`/auth/login` 用 AuthLayout。

- [ ] **Step 2: `src/main.ts`** 挂载 pinia + router + import globals.css。

- [ ] **Step 3: `DefaultLayout.vue`** = `<AppHeader/>` + `<router-view/>` + `<AppFooter/>`（AppHeader/Footer 在 Task5，先占位空组件让 build 通过）。`AuthLayout.vue` = 全屏阿里橙渐变背景 + `<router-view/>`。

- [ ] **Step 4: `src/App.vue`** = `<router-view/>`。

- [ ] **Step 5: 验证 + commit**
```powershell
pnpm typecheck; pnpm build; git add -A; git commit -m "feat: 路由 + 守卫 + 布局骨架"
```

---

## Task 5: 通用组件

**Files:** Create: `src/components/common/{AppHeader,AppFooter,PageContainer,SearchBar,EmptyState,CategoryBadge,Skeleton}.vue`

- [ ] **Step 1: `CategoryBadge.vue`** props `{ category: string; size?: 'sm'|'md' }`，用 catMeta 渲染 badge。
- [ ] **Step 2: `AppHeader.vue`** 左 logo "天马AI"（阿里橙），中搜索框（emit `search`），右导航（资讯/竞对 为 router-link，其余 disabled + Tooltip"即将上线"），最右张三 avatar DropdownMenu（个人中心[disabled]/退出→logout）。
- [ ] **Step 3: `PageContainer.vue`** props `{ title?; breadcrumb?: string[] }` slot default。
- [ ] **Step 4: `SearchBar.vue`** 受控 input + 搜索图标，emit `update:modelValue`/`search`。
- [ ] **Step 5: `EmptyState.vue`** props `{ title; description?; icon? }`。
- [ ] **Step 6: `Skeleton.vue`** props `{ class? }` 复用 shadcn skeleton。
- [ ] **Step 7: `AppFooter.vue`** 简单版权条。
- [ ] **Step 8: 验证 + commit**
```powershell
pnpm typecheck; pnpm build; git add -A; git commit -m "feat: 通用组件（Header/Footer/Badge 等）"
```

---

## Task 6: 钉钉扫码登录

**Files:** Create: `src/components/auth/DingTalkQR.vue`, `src/views/LoginView.vue`

- [ ] **Step 1: `DingTalkQR.vue`** 用 `qrcode` 生成 data URL（mock 钉钉 OAuth URL），中央钉钉 logo（lucide 或 inline svg），状态文案随 `useAuth().status` 变化。点击 QR → `scan()`；外层监听 status=confirmed → emit `success`。含"模拟扫码登录"按钮 + "刷新二维码"。
- [ ] **Step 2: `LoginView.vue`** 两栏：左品牌面板（天马AI logo + slogan + 3 条特性），右 `<DingTalkQR @success="onSuccess"/>`。onSuccess → `useAppStore().login(mockUser)` → `router.push(redirect||'/')`。
- [ ] **Step 3: 验证** `pnpm dev` 手动：访问 `/` 被重定向 login；点 QR → 扫描 → 确认 → 回首页。
- [ ] **Step 4: commit**
```powershell
pnpm typecheck; pnpm build; git add -A; git commit -m "feat: 钉钉扫码登录（mock 状态机）"
```

---

## Task 7: 首页 Zone1 — Hero头条 + AI热榜

**Files:** Create: `src/components/home/HeroHeadline.vue`, `src/components/home/TrendingSidebar.vue`

- [ ] **Step 1: `HeroHeadline.vue`** props `{ article: Article }`，左大封面背景 + 遮罩 + 标题/摘要/[阅读全文]→router-link detail + meta。竞对带 CategoryBadge+威胁。点击整卡跳详情。
- [ ] **Step 2: `TrendingSidebar.vue`** props `{ items: Article[] }`，`🔥 AI热榜` 标题 + TOP5 序号 pill，前 3 带🔥，点击跳详情。
- [ ] **Step 3: 验证 + commit**
```powershell
pnpm typecheck; pnpm build; git add -A; git commit -m "feat: 首页 Hero头条 + AI热榜"
```

---

## Task 8: 首页 Zone2 — 竞对情报条

**Files:** Create: `src/components/competitor/CompetitorCard.vue`, `src/components/home/CompetitorTicker.vue`

- [ ] **Step 1: `CompetitorCard.vue`** props `{ article: Article }`，封面、竞品名+行业 tag、摘要、子分类 badge、威胁级色点、时间+阅读。high 威胁 `ring-2 ring-red-500/40` + 左红边条。
- [ ] **Step 2: `CompetitorTicker.vue`** 标题"⚔️ 竞对情报 · 同行动态，知己知彼" + `[更多→]`→`/news/competitor`，3 张 CompetitorCard 横排（响应式 1/2/3 列）。
- [ ] **Step 3: 验证 + commit**
```powershell
pnpm typecheck; pnpm build; git add -A; git commit -m "feat: 首页竞对情报条 + CompetitorCard"
```

---

## Task 9: 首页 Zone3 — 部门价值榜 + 需求之声

**Files:** Create: `src/components/home/RankShowcase.vue`, `src/components/home/DemandVoices.vue`

- [ ] **Step 1: `RankShowcase.vue`** props `{ items: DeptRankItem[] }`，`🏆 部门 AI 价值榜 TOP5`，奖牌 pill 🥇🥈🥉，部门+指标+分值。脚注"💡按业务价值排名"。`[查看完整榜单→]` disabled+Tooltip。
- [ ] **Step 2: `DemandVoices.vue`** props `{ items: DemandVoice[] }`，`💬 需求之声`，TOP3 🔥+标题+票数+部门·状态 pill。`[我要提需求]`/`[查看全部→]` disabled。
- [ ] **Step 3: 验证 + commit**
```powershell
pnpm typecheck; pnpm build; git add -A; git commit -m "feat: 首页部门价值榜 + 需求之声"
```

---

## Task 10: 首页 Zone4/5/6 — 行业前沿/集团动态/课程/工具条

**Files:** Create: `src/components/home/{NewsFeed,InternalDynamic,CourseRecommend,ToolShortcutBar}.vue`

- [ ] **Step 1: `NewsFeed.vue`** props `{ items: Article[] }`，`📰 行业前沿` + `[更多→]`→`/news?category=industry`。3 条图文横排（缩略图+标题+摘要+meta），点击跳详情。
- [ ] **Step 2: `InternalDynamic.vue`** props `{ items: Article[] }`，`🏢 集团动态` 紧凑列表（📌+标题+部门+状态+time），`[查看全部动态→]`→`/news?category=internal`。
- [ ] **Step 3: `CourseRecommend.vue`** props `{ items: CourseItem[] }`，`🎓 本周推荐课程` 2 张小卡（封面+标题+难度/时长+已学），`[进入学习中心→]` disabled。
- [ ] **Step 4: `ToolShortcutBar.vue`** props `{ items: ToolItem[] }`，`🛠 AI 工具箱` 一行 chips（lucide 图标+名），点击 disabled+Tooltip。
- [ ] **Step 5: 验证 + commit**
```powershell
pnpm typecheck; pnpm build; git add -A; git commit -m "feat: 首页行业前沿/集团动态/课程/工具条"
```

---

## Task 11: HomeView 组装

**Files:** Create: `src/views/HomeView.vue`

- [ ] **Step 1: `HomeView.vue`** 调 `useHome().load()`，loading 时各 zone 显 `<Skeleton/>`；数据到位后按 12 列栅格组装 6 zone（Zone1: 8+4 cols；Zone3: 6+6；Zone5: 6+6；其余 full-width 区块）。
- [ ] **Step 2: 验证** `pnpm dev` 首页 6 区全部渲染、各"阅读全文/更多"可达详情/列表/竞对页。
- [ ] **Step 3: commit**
```powershell
pnpm typecheck; pnpm build; git add -A; git commit -m "feat: 首页 HomeView 组装 6 区"
```

---

## Task 12: 资讯列表页

**Files:** Create: `src/components/news/ArticleCard.vue`, `src/components/news/CategoryTabs.vue`, `src/views/NewsListView.vue`

- [ ] **Step 1: `ArticleCard.vue`** props `{ article: Article }`，封面、CategoryBadge、标题、2 行摘要、meta（作者·部门·time·👁·💬·👍）、置顶 pin、竞对威胁红 badge。整卡 hover 上浮 → router-link detail。
- [ ] **Step 2: `CategoryTabs.vue`** props `{ modelValue: string }`（'全部' + 5 分类），emit update。Tab "竞对情报"点击额外可跳竞对页（提供 `to-competitor` 链接）。
- [ ] **Step 3: `NewsListView.vue`** PageContainer + CategoryTabs（路由 query `?category=` 同步）+ SearchBar + 排序下拉 + 标签 chips + ArticleCard 栅格（md1/lg2）+ Pagination（12/页）。用 `useNews()` 过滤分页。无结果 EmptyState。
- [ ] **Step 4: 验证 + commit**
```powershell
pnpm typecheck; pnpm build; git add -A; git commit -m "feat: 资讯列表页（分类/搜索/排序/分页）"
```

---

## Task 13: 竞对情报页

**Files:** Create: `src/components/competitor/{ThreatAlert,BenchmarkTable}.vue`, `src/views/CompetitorIntelView.vue`

- [ ] **Step 1: `ThreatAlert.vue`** props `{ article: Article }`，红色 Alert：⚡ 标题 + 冲击摘要 + 来源·time·👁·💬。
- [ ] **Step 2: `BenchmarkTable.vue`** props `{ rows: CompetitorProfile[]; self: CompetitorProfile }`，shadcn Table 列：竞品/AI覆盖部门/AI项目数/核心场景/最新动态。末行"我司"阿里橙高亮。
- [ ] **Step 3: `CompetitorIntelView.vue`** PageContainer"⚔️ 竞对情报" + 子 Tab（全部/竞品动态/行业对标/威胁预警）+ 搜索 + 顶部 ThreatAlert（high/medium）+ CompetitorCard 网格（3 列）+ BenchmarkTable。用 `useCompetitors()`。
- [ ] **Step 4: 验证 + commit**
```powershell
pnpm typecheck; pnpm build; git add -A; git commit -m "feat: 竞对情报页（威胁横幅/卡片/对标看板）"
```

---

## Task 14: 文章详情页

**Files:** Create: `src/views/ArticleDetailView.vue`

- [ ] **Step 1: `ArticleDetailView.vue`** 用 `useArticle(route.params.id)`：Hero（全宽封面+CategoryBadge+标题+摘要+meta+威胁 badge+原文链接）。正文 `v-html` + tailwind 排版类（容器加 `prose-styles`，自定义 headings/p/ul/blockquote/img）。操作条：👍点赞 toggle（store.toggleLike，计数同步）、🔖收藏 toggle、📤分享（navigator.clipboard + toast）。标签 chips→`/news?tag=`。相关资讯 3 卡。挂载 incrementView。返回链接。
- [ ] **Step 2: 验证** `pnpm dev`：首页/列表/竞对页点进详情，排版正常，点赞/收藏 toggle 且刷新保持，分享 toast。
- [ ] **Step 3: commit**
```powershell
pnpm typecheck; pnpm build; git add -A; git commit -m "feat: 文章详情页（正文/点赞/收藏/分享/相关）"
```

---

## Task 15: 收尾打磨 + 全量验证

- [ ] **Step 1: SVG 占位图** 接入所有封面（按分类 hue：competitor=0/industry=210/internal=150/tech=265/product=40）。
- [ ] **Step 2: 骨架屏** 首页/列表/详情 loading 态全覆盖。
- [ ] **Step 3: disabled 一致性** 全站"即将上线"按钮统一 Tooltip，无死路由/404。
- [ ] **Step 4: 全量验证**
```powershell
pnpm typecheck
pnpm test
pnpm build
```
全部通过。
- [ ] **Step 5: 视觉走查（impeccable 技能）** `pnpm dev` 逐页检查间距/层级/对齐/hover/空状态/竞对紧迫感，按需微调。
- [ ] **Step 6: commit**
```powershell
git add -A; git commit -m "polish: 占位图/骨架屏/disabled 一致性/视觉走查"
```

---

## Self-Review

**Spec coverage:** 登录(Task6) ✓ 首页6区(Task7-11) ✓ 资讯列表(Task12) ✓ 竞对页(Task13) ✓ 文章详情(Task14) ✓ 设计token(Task1) ✓ mock(Task2) ✓ 验收标准(Task15) ✓。价值看板/需求池/培训独立页明确排除 ✓。

**Type consistency:** Article.category/competitor 字段在 mock→composable→component 全链路一致；useAppStore.likes/bookmarks 为 Set<string>，toggleLike/isLiked 签名一致；useAuth.status 三态一致。

**Placeholder scan:** 各组件步骤给出 props/行为/关键代码要点，执行时按 impeccable 写完整 SFC（前端 demo 的"完整代码"在执行阶段落地，结构/接口在计划锁定）。
