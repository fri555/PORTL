# 南京天马集团 AI 门户产品设计文档

> 版本：v1.2  
> 日期：2026-06-21  
> 作者：AI项目组  
> 变更：v1.1 首页重构为文化阵地，新增竞对情报模块，排名升级为三榜  
> 变更：v1.2 首页新增AI业务价值看板(价值指标条+业务场景价值卡)，导航栏新增"价值看板"入口，排名新增部门价值维度，新增3.8节AI价值看板模块

---

## 1. 项目概述

### 1.1 背景

集团内部已部署多个AI工具与系统，但存在以下问题：
- **入口分散**：员工不知道有哪些AI工具可用，需要四处寻找
- **缺乏运营**：AI使用停留在个人层面，没有形成组织级氛围
- **需求无闭环**：业务部门有AI需求无处提交，或提交后无追踪
- **培训缺失**：员工想用AI但不知从何入手

### 1.2 目标

建设集团统一AI门户，实现：
1. **AI文化建设阵地**：以资讯、行业洞察、竞对动态为引擎，营造全员AI关注度与紧迫感
2. **一站式入口**：所有AI系统统一认证、统一访问
3. **氛围运营**：通过排名、积分、互动激发全员AI参与感和良性竞争
4. **需求闭环**：从提需求到交付反馈的全流程管理
5. **数据驱动**：可视化的使用数据支撑管理决策

### 1.3 目标用户

| 角色 | 占比 | 核心诉求 |
|------|------|----------|
| 普通员工 | 70% | 找到AI工具、学习使用、提需求 |
| 业务骨干/管理者 | 20% | 看业务价值、提优先需求、了解团队参与度 |
| IT/技术团队 | 10% | 管理工具接入、处理需求、监控系统运行 |

### 1.4 成功指标

| 指标 | MVP目标 | 年度目标 |
|------|---------|----------|
| 月活用户（MAU） | 集团30%员工 | 集团60%员工 |
| AI工具日均调用 | 500次 | 2000次 |
| 需求池月新增 | 20条 | 50条 |
| 需求闭环率 | 40% | 70% |

---

## 2. 技术架构

### 2.1 技术栈

```
┌─────────────────────────────────────────────────┐
│                    前端                           │
│  Vue3 + TypeScript + TailwindCSS + Vite          │
│  状态管理: Pinia  |  路由: Vue Router 4           │
│  UI组件: 自建设计系统 (基于Headless UI)            │
│  图表: ECharts  |  富文本: TipTap                  │
│  HTTP: Axios  |  国际化: vue-i18n (预留)          │
└────────────────────┬────────────────────────────┘
                     │ HTTPS / REST API + WebSocket
┌────────────────────▼────────────────────────────┐
│                    后端                           │
│  Python 3.11+  |  FastAPI                        │
│  ORM: SQLAlchemy 2.0  |  迁移: Alembic            │
│  认证: OAuth2 + JWT  |  任务队列: Celery + Redis   │
│  缓存: Redis  |  文件存储: MinIO                   │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│                  数据层                           │
│  PostgreSQL 15 (主库)                             │
│  Redis 7 (缓存/会话/排名)                         │
│  MinIO (文件/图片/视频)                           │
└─────────────────────────────────────────────────┘
```

### 2.2 整体架构图

```
                        ┌──────────────┐
                        │   Nginx      │
                        │  (反向代理)   │
                        └──────┬───────┘
                               │
               ┌───────────────┼───────────────┐
               │               │               │
        ┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
        │  Vue3 SPA   │ │ FastAPI    │ │  静态资源    │
        │  (前端)      │ │ (API服务)  │ │  (MinIO)    │
        └─────────────┘ └─────┬──────┘ └─────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
       ┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
       │ PostgreSQL  │ │   Redis    │ │   Celery    │
       │  (数据持久化) │ │ (缓存/排名) │ │  (异步任务)  │
       └─────────────┘ └────────────┘ └─────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
       ┌──────▼──────┐ ┌─────▼──────┐        │
       │   MinIO     │ │  外部AI系统  │        │
       │  (文件存储)   │ │  (SSO对接)  │        │
       └─────────────┘ └────────────┘        │
                                     ┌───────▼───────┐
                                     │  企业微信/钉钉  │
                                     │  (消息通知)     │
                                     └───────────────┘
```

### 2.3 SSO集成方案

```
┌──────────┐     1. 登录请求      ┌──────────────┐
│  用户浏览器 │ ──────────────────► │ AI门户前端    │
└─────┬────┘                      └──────┬───────┘
      │                                  │
      │     2. 重定向到企业认证中心         │
      │ ◄──────────────────────────────── │
      │                                  │
      │     3. 用户认证                    │
      ├─────────────────────────────► ┌───▼──────────┐
      │                               │ 企业SSO服务   │
      │     4. 授权码回调               │ (CAS/OAuth2/ │
      │ ◄──────────────────────────── │  SAML/LDAP)  │
      │                               └──────────────┘
      │                                  │
      │     5. 用授权码换Token            │
      │ ─────────────────────────────► ┌─▼────────────┐
      │                                 │ FastAPI后端   │
      │ ◄── 6. 返回JWT + 用户信息        │              │
      │                                 └──────────────┘
```

**支持对接的认证协议**：OAuth2（优先）、CAS、SAML2、LDAP  
**Token策略**：JWT（Access Token 2h + Refresh Token 7d）  
**用户同步**：首次登录自动创建门户账号，定时同步组织架构

---

## 3. 模块详细设计

### 3.1 首页 — AI价值驱动与文化阵地

首页是门户的核心灵魂。用户打开就能感受到三件事：**AI正在创造真金白银的业务价值**、**AI正在改变行业竞争格局**、**我们正在拥抱变化**。首页不只是"看新闻"，更是**用数据说话的价值展示窗口**。

#### 3.1.1 首页信息架构

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚡ 天马AI  [搜索...]  📊价值看板  📰资讯  ⚔️竞对  🎓培训  💡需求池 👤张三▾│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  💎 AI业务价值看板  ·  数据驱动的AI成果                  [详情→] │   │
│  │                                                             │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │   │
│  │  │ 累计降本  │ │ 内容产出  │ │ 效率提升  │ │爆品命中率 │      │   │
│  │  │ ¥328万   │ │ 12,580件 │ │  平均3.2x │ │   68%    │      │   │
│  │  │ 较传统↓82%│ │ 本月+18% │ │ vs 人工  │ │ 经验选品30%│     │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │   │
│  │  │ AI日调用 │ │ 活跃部门  │ │ 需求闭环  │                   │   │
│  │  │ 1,860次  │ │  12/15   │ │   72%    │                   │   │
│  │  │ 较上月↑15%│ │ 80%覆盖  │ │ 月度趋势↑ │                   │   │
│  │  └──────────┘ └──────────┘ └──────────┘                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🎯 业务场景价值  ·  AI在各业务环节的真实成果        [更多 →] │   │
│  │                                                             │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │   │
│  │  │ 📸 AI商拍     │ │ 🎬 营销视频   │ │ 📈 爆品预测   │        │   │
│  │  │              │ │              │ │              │        │   │
│  │  │ 单件¥48      │ │ 日产52条     │ │ 准确率68%    │        │   │
│  │  │ 传统¥1500    │ │ 人工3-5条    │ │ 经验选品30%  │        │   │
│  │  │ 降本97%      │ │ 提效10倍     │ │ 命中率+38pt  │        │   │
│  │  │ ─────────    │ │ ─────────    │ │ ─────────    │        │   │
│  │  │ 本月出图8,200│ │ 本月产出1,560│ │ 预测SKU 320个│        │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘        │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │   │
│  │  │ 📝 AI文案     │ │ 🏭 库存优化   │ │ 🔍 智能客服   │        │   │
│  │  │              │ │              │ │              │        │   │
│  │  │ 多平台一键适配 │ │ 周转率+15%   │ │ 接通率85%    │        │   │
│  │  │ 3平台×5分钟   │ │ 呆滞库存↓23% │ │ 人工60%      │        │   │
│  │  │ 人均提效5倍   │ │ 补货准确率92%│ │ 响应<3秒     │        │   │
│  │  │ ─────────    │ │ ─────────    │ │ ─────────    │        │   │
│  │  │ 本月产出2,800│ │ 优化SKU 1,200│ │ 日均接待3,200│        │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────┐  ┌──────────────┐│
│  │              头条焦点区 (Hero)                 │  │  🔥 AI热榜    ││
│  │                                               │  │              ││
│  │  OpenAI发布GPT-5：多模态推理能力飞跃           │  │  1. GPT-5发布 ││
│  │  企业如何用AI重构业务流程...                    │  │  2. 竞品XX布局││
│  │                                               │  │  3. 集团AI周报││
│  │  [阅读全文]                   3小时前 · 1.2k阅读│  │  4. XX部门提..││
│  │                                               │  │  5. 新工具上线││
│  └──────────────────────────────────────────────┘  └──────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  ⚔️ 竞对情报  ·  同行动态，知己知彼                    [更多 →]  ││
│  │                                                                 ││
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            ││
│  │  │ 华为发布AI...  │ │ 阿里云大模型..│ │ 字节豆包2.0.. │            ││
│  │  │ 面向企业级..  │ │ 企业渗透率.. │ │ 办公场景覆盖..│            ││
│  │  │ 2h前 · 🔥热点 │ │ 5h前         │ │ 1d前         │            ││
│  │  └──────────────┘ └──────────────┘ └──────────────┘            ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐│
│  │  🏆 部门AI价值榜 · TOP10     │  │  💬 需求之声 · 热门需求      ││
│  │                              │  │                              ││
│  │  🥇 营销部   降本¥86万  320分│  │  🔥 AI智能合同审查    86票   ││
│  │  🥈 供应链   周转+15%  280分│  │     财务部 · 已排期          ││
│  │  🥉 内容部   出图8.2k  250分│  │  🔥 AI辅助招投标      72票   ││
│  │  4  客服部   接通85%   210分│  │     经营部 · 评审中          ││
│  │  5  法务部   合同审查   180分│  │  🔥 智能客服升级      65票   ││
│  │  ...                         │  │     客服部 · 开发中          ││
│  │  💡按业务价值排名，非单纯活跃│  │                              ││
│  │                              │  │  [我要提需求]  [查看全部 →]  ││
│  │  [查看完整榜单 →]             │  │                              ││
│  └──────────────────────────────┘  └──────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  📰 行业前沿  ·  AI改变世界                          [更多 →]  ││
│  │                                                                 ││
│  │  ┌──────────┐  OpenAI推出企业级Agent框架，自动化办公新纪元       ││
│  │  │  [图片]   │  日前OpenAI发布Agent SDK，允许企业构建自主AI...   ││
│  │  │          │  👁 2.3k  ·  💬 18  ·  2小时前                    ││
│  │  └──────────┘                                                  ││
│  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ││
│  │  ┌──────────┐  DeepSeek开源V3：中国AI的突破之路                  ││
│  │  │  [图片]   │  DeepSeek发布V3模型，在多项基准测试中达到...      ││
│  │  │          │  👁 1.8k  ·  💬 32  ·  5小时前                    ││
│  │  └──────────┘                                                  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐│
│  │  🏢 集团AI动态               │  │  🎓 本周推荐课程             ││
│  │                              │  │                              ││
│  │  📌 AI智能合同系统正式上线    │  │  ┌────────────────┐          ││
│  │     法务部 · 已上线 · 2d前    │  │  │ [封面] Prompt工程│         ││
│  │  📌 第二期AI训练营报名开启    │  │  │ 进阶 · 45min    │          ││
│  │     人力资源部 · 3d前        │  │  │ 1.2k人已学      │          ││
│  │  📌 营销部AI文案效率提升200% │  │  └────────────────┘          ││
│  │     营销部 · 5d前            │  │  ┌────────────────┐          ││
│  │                              │  │  │ [封面] AI数据分析│         ││
│  │  [查看全部动态 →]             │  │  │ 入门 · 30min    │          ││
│  └──────────────────────────────┘  │  │ 800人已学       │          ││
│                                     │  └────────────────┘          ││
│                                     │  [进入学习中心 →]            ││
│                                     └──────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  🛠 AI工具箱  ·  快速进入                            [全部 →]  ││
│  │                                                                 ││
│  │  [AI对话]  [智能报表]  [文档助手]  [AI绘图]  [知识检索]  [更多→] ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

#### 3.1.2 首页设计原则

| 原则 | 说明 |
|------|------|
| **业务价值优先** | 首页第一屏顶部展示AI业务价值看板，让全员和管理层第一时间看到AI的真实成果（降本/增效/产出/命中率） |
| **价值量化可视** | 每个业务场景卡片必须有"AI前 vs AI后"对比数据，用数字说话而非口号 |
| **信息流驱动** | 价值看板之后，核心是内容流（新闻+竞对+动态），保持信息密度 |
| **紧迫感营造** | 竞对情报板块让员工感受到"对手在用AI，我们不能落后" |
| **荣誉激励** | 部门AI价值榜按业务价值排名（非单纯活跃度），激发部门间良性竞争 |
| **渐进式引导** | 从"看价值"→"看新闻"→"看排名"→"提需求"→"用工具"自然递进 |
| **工具箱轻量化** | 工具入口放底部一行，够用但不喧宾夺主 |

#### 3.1.3 首页模块优先级

| 模块 | 占屏比 | 说明 |
|------|--------|------|
| AI业务价值看板 | 15% | **首屏顶部**，7个核心价值指标（降本/产出/效率/命中率/调用/覆盖/闭环率） |
| 业务场景价值 | 15% | 6张场景卡（商拍/视频/爆品/文案/库存/客服），每张含AI前后对比 |
| 头条焦点+AI热榜 | 20% | 行业重大新闻+热榜，信息密度高 |
| 竞对情报 | 10% | 同行/竞争对手AI动态，3卡片横排 |
| 部门价值榜+需求之声 | 15% | 左部门价值榜(按业务价值)右需求榜，首页露出TOP5 |
| 行业前沿 | 15% | AI行业新闻，图文列表流 |
| 集团动态+推荐课程 | 7% | 内部成果+课程推荐 |
| AI工具箱 | 3% | 底部一排快捷入口 |

---

### 3.2 AI工具导航（独立页面）

工具导航为独立页面，首页仅保留底部快捷入口条。

#### 3.2.1 功能清单

| 功能 | 描述 | 优先级 |
|------|------|--------|
| SSO登录 | 对接集团统一认证，一次登录全系统通行 | P0 |
| 工具导航 | 展示所有可用AI工具，支持分类/搜索/收藏 | P0 |
| 一键跳转 | 点击工具卡片直接跳转（携带SSO Token） | P0 |
| 权限管控 | 按角色/部门控制工具可见性和可访问性 | P1 |
| 最近使用 | 记录用户最近使用的工具，快速访问 | P1 |
| 工具状态 | 实时展示各AI系统运行状态（在线/离线/维护中） | P2 |

#### 3.2.2 AI工具元数据模型

每个接入门户的AI工具需要注册以下信息：

```json
{
  "id": "tool_001",
  "name": "AI对话助手",
  "description": "基于大语言模型的智能对话系统",
  "category": "conversation",
  "icon_url": "https://...",
  "entry_url": "https://ai-chat.tianma.com",
  "auth_type": "oauth2_implicit",
  "auth_config": {
    "authorize_url": "...",
    "token_param": "access_token"
  },
  "status_check_url": "https://ai-chat.tianma.com/health",
  "allowed_roles": ["*"],
  "allowed_departments": ["*"],
  "tags": ["对话", "大模型", "GPT"],
  "sort_order": 1,
  "is_active": true
}
```

---

### 3.3 AI资讯与竞对情报

资讯板块是门户的文化引擎，核心不只是"发新闻"，而是**让全员建立AI紧迫感和行业视野**。尤其是竞对情报板块，要让大家看到"对手在做什么"。

#### 3.3.1 功能清单

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 资讯列表 | 分页展示AI新闻，支持分类筛选 | P0 |
| 资讯详情 | 富文本展示，支持图片/视频嵌入 | P0 |
| 竞对情报 | 独立板块，追踪竞争对手AI动态与布局 | P0 |
| 分类管理 | 竞对情报、行业前沿、集团动态、技术分享、产品更新 | P0 |
| 头条焦点 | 管理员设置头条新闻，首页Hero区展示 | P0 |
| 置顶/推荐 | 管理员可置顶重要资讯 | P1 |
| 热门标签 | 自动提取热门标签，支持按标签浏览 | P1 |
| 点赞/收藏 | 用户互动，纳入活跃度统计 | P1 |
| 浏览计数 | 记录阅读量，用于热门排行 | P1 |
| RSS/自动抓取 | 从外部源自动抓取AI行业资讯和竞对动态 | P2 |
| AI摘要 | 可选：AI自动生成新闻摘要和要点提炼 | P3 |

#### 3.3.2 资讯分类体系

```
AI资讯
├── ⚔️ 竞对情报      ← 竞争对手AI动作、行业对标分析（核心差异化板块）
│   ├── 竞品动态      ← XX集团/XX公司发布XX AI产品
│   ├── 行业对标      ← 同行业AI应用案例、渗透率数据
│   └── 威胁预警      ← 竞对AI能力可能带来的业务冲击
│
├── 🌐 行业前沿      ← AI行业重大新闻、趋势分析
│   ├── 大模型进展    ← GPT/Claude/DeepSeek等模型动态
│   ├── AI应用趋势    ← Agent/RAG/Multi-Agent等方向
│   └── 政策法规      ← AI监管、数据安全政策
│
├── 🏢 集团动态      ← 集团内部AI项目进展、成果发布
│   ├── 项目里程碑    ← AI项目上线、验收、成果
│   ├── 效率提升      ← 各部门AI提效数据和案例
│   └── 领导讲话      ← 管理层对AI的表态和要求
│
├── 📚 技术分享      ← 员工投稿，AI使用技巧、最佳实践
│   ├── 使用心得      ← 员工实战经验分享
│   ├── Prompt技巧    ← 高效提示词编写方法
│   └── 踩坑记录      ← AI使用中的问题和解决方案
│
└── 📢 产品更新      ← 各AI系统功能更新公告
    ├── 新功能上线    ← AI工具新增能力
    └── 维护通知      ← 系统升级、停机公告
```

#### 3.3.3 竞对情报板块详细设计

竞对情报是门户的核心差异化模块，目标：**让全员感受到"别人在用AI抢跑，我们必须行动"**。

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚔️ 竞对情报                                                    │
│                                                                  │
│  [全部] [竞品动态] [行业对标] [威胁预警]          [🔍 搜索情报]  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ 🔴 威胁预警                                                  ││
│  │                                                              ││
│  │ ⚡ XX集团上线AI智能招投标系统，中标率提升35%                   ││
│  │   对我方招投标业务构成直接竞争压力，建议尽快评估应对方案        ││
│  │   来源：XX集团官网 · 2026-06-14 · 👁 3.2k · 💬 45           ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐  │
│  │ 华为发布企业AI..  │ │ 阿里云大模型..   │ │ 字节豆包2.0..    │  │
│  │                  │ │                  │ │                  │  │
│  │ [封面图]         │ │ [封面图]         │ │ [封面图]         │  │
│  │                  │ │                  │ │                  │  │
│  │ 面向企业级场景.. │ │ 制造业渗透率达.. │ │ 办公场景全覆盖.. │  │
│  │ 🔥竞品动态       │ │ 📊行业对标       │ │ 🔥竞品动态       │  │
│  │ 2h前 · 👁 1.8k  │ │ 5h前 · 👁 960   │ │ 1d前 · 👁 1.5k  │  │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ 📊 行业对标看板                                              ││
│  │                                                              ││
│  │  竞品         AI覆盖部门    AI项目数    核心场景    最新动态    ││
│  │  ───────────  ───────────  ─────────  ─────────  ──────────  ││
│  │  XX集团       12/15部门     28个       招投标/客服  3天前      ││
│  │  YY公司       8/10部门      15个       营销/供应链  1周前      ││
│  │  ZZ股份       6/12部门      10个       HR/财务     2周前      ││
│  │                                                              ││
│  │  💡 我司：9/15部门，12个AI项目                               ││
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

#### 3.3.4 数据模型

```python
class Article(Base):
    __tablename__ = "articles"

    id: Mapped[uuid.UUID]         # 主键
    title: Mapped[str]            # 标题
    summary: Mapped[str]          # 摘要
    content: Mapped[str]          # 富文本内容 (HTML)
    category: Mapped[str]         # 主分类: competitor/industry/internal/tech/product
    sub_category: Mapped[str|None]# 子分类
    threat_level: Mapped[str|None]# 威胁等级: high/medium/low (仅竞对情报)
    competitor_name: Mapped[str|None]  # 竞对名称 (仅竞对情报)
    source: Mapped[str|None]      # 来源
    source_url: Mapped[str|None]  # 原文链接
    cover_image: Mapped[str|None] # 封面图
    author_id: Mapped[uuid.UUID]  # 作者
    is_headline: Mapped[bool]     # 是否头条焦点
    is_pinned: Mapped[bool]       # 是否置顶
    is_published: Mapped[bool]    # 是否发布
    view_count: Mapped[int]       # 浏览量
    like_count: Mapped[int]       # 点赞数
    comment_count: Mapped[int]    # 评论数
    published_at: Mapped[datetime]# 发布时间
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

class CompetitorProfile(Base):
    __tablename__ = "competitor_profiles"

    id: Mapped[uuid.UUID]
    name: Mapped[str]             # 竞对名称
    industry: Mapped[str]         # 所属行业
    ai_coverage: Mapped[str|None] # AI覆盖部门描述
    ai_project_count: Mapped[int|None]  # AI项目数量
    core_scenarios: Mapped[str|None]    # 核心AI场景
    threat_assessment: Mapped[str|None] # 威胁评估
    last_updated: Mapped[datetime|None]
    is_active: Mapped[bool]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
```

---

### 3.4 AI培训板块

#### 3.4.1 功能清单

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 课程列表 | 展示可用培训课程，支持分类/难度筛选 | P1 |
| 课程详情 | 视频播放 + 课件下载 + 课程简介 | P1 |
| 学习进度 | 记录用户课程完成进度 | P1 |
| 课程分类 | 入门/进阶/专题，按工具/场景分类 | P1 |
| 证书/积分 | 完成课程获得积分，纳入使用者排名 | P2 |
| 课程评价 | 学员评分和评论 | P2 |
| 直播培训 | 集成视频直播（可嵌入外部直播链接） | P3 |
| 学习路径 | 推荐学习路径（如"数据分析入门→进阶"） | P3 |

#### 3.4.2 课程体系

```
AI培训
├── 🟢 入门 (面向零基础员工)
│   ├── AI是什么？— 10分钟了解人工智能
│   ├── 如何使用AI对话助手
│   ├── AI写邮件/PPT的5个技巧
│   └── AI安全与合规须知
│
├── 🟡 进阶 (面向有一定基础的员工)
│   ├── Prompt工程：写出高质量指令
│   ├── 用AI做数据分析实战
│   ├── AI辅助编程入门
│   └── AI绘图从0到1
│
└── 🔴 专题 (面向特定岗位/场景)
    ├── HR如何用AI提升招聘效率
    ├── 财务AI：自动化报表与审计
    ├── 营销AI：智能文案与投放
    └── 研发AI：代码审查与测试
```

#### 3.4.3 数据模型

```python
class Course(Base):
    __tablename__ = "courses"

    id: Mapped[uuid.UUID]
    title: Mapped[str]            # 课程名称
    description: Mapped[str]      # 课程简介
    category: Mapped[str]         # 入门/进阶/专题
    difficulty: Mapped[str]       # beginner/intermediate/advanced
    cover_image: Mapped[str|None] # 封面图
    video_url: Mapped[str]        # 视频地址
    duration_minutes: Mapped[int] # 时长(分钟)
    instructor_id: Mapped[uuid.UUID]  # 讲师
    sort_order: Mapped[int]       # 排序
    is_published: Mapped[bool]
    enrollment_count: Mapped[int] # 报名人数
    completion_count: Mapped[int] # 完成人数
    average_rating: Mapped[float] # 平均评分
    points: Mapped[int]           # 完成可获积分
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

class CourseEnrollment(Base):
    __tablename__ = "course_enrollments"

    id: Mapped[uuid.UUID]
    user_id: Mapped[uuid.UUID]
    course_id: Mapped[uuid.UUID]
    progress: Mapped[int]         # 0-100 完成百分比
    is_completed: Mapped[bool]
    completed_at: Mapped[datetime|None]
    rating: Mapped[int|None]      # 1-5 评分
    review: Mapped[str|None]      # 评论
    enrolled_at: Mapped[datetime]
```

---

### 3.5 AI需求池

#### 3.5.1 功能清单

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 提交需求 | 填写需求表单（标题/描述/部门/期望价值/紧急度） | P0 |
| 需求列表 | 分页展示，支持筛选/排序/搜索 | P0 |
| 需求投票 | 员工可对需求投票（每人每日限3票），驱动优先级 | P0 |
| 需求状态流转 | 待评审→已排期→开发中→已上线→已关闭 | P0 |
| 需求详情 | 查看需求完整信息、评论、状态变更记录 | P1 |
| 需求评论 | 员工可补充场景描述或讨论 | P1 |
| 通知提醒 | 状态变更通知需求提出者和投票者 | P1 |
| 需求标签 | 按业务域/技术类型打标签 | P2 |
| 重复检测 | 提交时提示相似需求，避免重复 | P3 |

#### 3.5.2 需求状态流转

```
                    ┌──────────┐
                    │  待评审   │
                    └────┬─────┘
                         │ 评审通过
                    ┌────▼─────┐
         ┌──────────│  已排期   │
         │          └────┬─────┘
         │ 退回           │ 开始开发
         │          ┌────▼─────┐
    ┌────▼────┐     │  开发中   │
    │  已关闭  │     └────┬─────┘
    └─────────┘          │ 开发完成
                    ┌────▼─────┐
                    │  已上线   │
                    └────┬─────┘
                         │ 确认完成
                    ┌────▼─────┐
                    │  已完成   │
                    └──────────┘
```

#### 3.5.3 数据模型

```python
class Demand(Base):
    __tablename__ = "demands"

    id: Mapped[uuid.UUID]
    title: Mapped[str]            # 需求标题
    description: Mapped[str]      # 需求描述
    department: Mapped[str]       # 提出部门
    submitter_id: Mapped[uuid.UUID]  # 提出人
    urgency: Mapped[str]          # low/medium/high/critical
    expected_value: Mapped[str]   # 期望价值描述
    status: Mapped[str]           # pending/scheduled/developing/live/completed/closed
    vote_count: Mapped[int]       # 投票数
    comment_count: Mapped[int]    # 评论数
    tags: Mapped[list[str]]       # 标签列表 (PostgreSQL ARRAY)
    assigned_to: Mapped[uuid.UUID|None]  # 负责人
    scheduled_at: Mapped[datetime|None]  # 排期时间
    completed_at: Mapped[datetime|None]  # 完成时间
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

class DemandVote(Base):
    __tablename__ = "demand_votes"

    id: Mapped[uuid.UUID]
    user_id: Mapped[uuid.UUID]
    demand_id: Mapped[uuid.UUID]
    created_at: Mapped[datetime]

    __table_args__ = (
        UniqueConstraint("user_id", "demand_id", name="uq_user_demand_vote"),
    )

class DemandComment(Base):
    __tablename__ = "demand_comments"

    id: Mapped[uuid.UUID]
    demand_id: Mapped[uuid.UUID]
    user_id: Mapped[uuid.UUID]
    content: Mapped[str]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

class DemandStatusLog(Base):
    __tablename__ = "demand_status_logs"

    id: Mapped[uuid.UUID]
    demand_id: Mapped[uuid.UUID]
    from_status: Mapped[str|None]
    to_status: Mapped[str]
    operator_id: Mapped[uuid.UUID]
    remark: Mapped[str|None]
    created_at: Mapped[datetime]
```

---

### 3.6 排名系统 — 氛围运营的核心飞轮

排名不只是数据展示，而是**驱动全员参与的运营引擎**。首页露出排名，让每个人都能看到"谁在用AI"，激发竞争意识和参与欲。

#### 3.6.1 功能清单

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 使用者排名 | 按AI工具使用频次/时长排名 | P0 |
| 提需求排名 | 按提交需求数+投票权重排名 | P0 |
| 意见领袖排名 | 按投稿/评论/被点赞综合排名，发现AI推广达人 | P0 |
| 部门排名 | 按部门维度聚合排名（AI渗透度） | P0 |
| 排名周期 | 日榜/周榜/月榜 | P0 |
| 首页露出 | 使用榜+需求榜TOP5首页展示 | P0 |
| 积分体系 | 统一积分模型，量化用户AI参与度 | P1 |
| 排名奖励 | 月度TOP3展示，季度表彰 | P2 |
| 升降标识 | 排名变化箭头（↑↓→），增加竞技感 | P2 |

#### 3.6.2 积分规则

```python
POINT_RULES = {
    "daily_login": 1,           # 每日登录
    "use_ai_tool": 2,           # 使用AI工具(每日上限10分)
    "complete_course": 10,      # 完成一个课程
    "submit_demand": 5,         # 提交一条需求
    "demand_voted": 2,          # 需求被投票(每票)
    "demand_completed": 15,     # 提交的需求被完成
    "publish_article": 8,       # 发布资讯文章
    "article_liked": 1,         # 文章被点赞(每次)
    "course_review": 3,         # 课程评价
    "comment": 1,               # 评论(每日上限5分)
    "comment_liked": 1,         # 评论被点赞
}

RANKING_WEIGHTS = {
    "usage": {                   # 使用者排名权重
        "tool_usage": 0.5,      # 工具使用频次
        "login_days": 0.2,      # 登录天数
        "course_completion": 0.3,# 课程完成
    },
    "demand": {                  # 提需求排名权重
        "submit_count": 0.4,    # 提交数量
        "vote_received": 0.3,   # 收到的投票
        "completion_rate": 0.3, # 需求完成率
    },
    "influencer": {              # 意见领袖排名权重
        "article_count": 0.3,   # 发文数量
        "article_likes": 0.3,   # 文章获赞
        "comment_likes": 0.2,   # 评论获赞
        "course_rating": 0.2,   # 课程评价贡献
    },
}
```

#### 3.6.3 排名计算

排名使用Redis Sorted Set实现，保证高性能实时更新：

```
# 使用者排名
ZINCRBY "rank:usage:daily:{date}"   {score} {user_id}
ZINCRBY "rank:usage:weekly:{week}"  {score} {user_id}
ZINCRBY "rank:usage:monthly:{month}" {score} {user_id}

# 提需求排名
ZINCRBY "rank:demand:daily:{date}"   {score} {user_id}

# 部门排名
ZINCRBY "rank:dept:monthly:{month}"  {score} {department_id}
```

每日凌晨通过Celery定时任务聚合计算并持久化到PostgreSQL。

#### 3.6.4 数据模型

```python
class UserPoints(Base):
    __tablename__ = "user_points"

    id: Mapped[uuid.UUID]
    user_id: Mapped[uuid.UUID]
    total_points: Mapped[int]     # 总积分
    level: Mapped[int]            # 等级(1-10)
    updated_at: Mapped[datetime]

class PointLog(Base):
    __tablename__ = "point_logs"

    id: Mapped[uuid.UUID]
    user_id: Mapped[uuid.UUID]
    action: Mapped[str]           # 动作类型
    points: Mapped[int]           # 变动积分
    ref_type: Mapped[str|None]    # 关联类型(demand/course等)
    ref_id: Mapped[uuid.UUID|None]# 关联ID
    created_at: Mapped[datetime]

class RankingSnapshot(Base):
    __tablename__ = "ranking_snapshots"

    id: Mapped[uuid.UUID]
    rank_type: Mapped[str]        # usage/demand/department
    period: Mapped[str]           # daily/weekly/monthly
    period_key: Mapped[str]       # 2026-06-16 / 2026-W24 / 2026-06
    user_id: Mapped[uuid.UUID|None]
    department_id: Mapped[uuid.UUID|None]
    score: Mapped[int]
    rank: Mapped[int]
    created_at: Mapped[datetime]
```

---

### 3.7 用户与权限

#### 3.7.1 角色体系

| 角色 | 代码 | 描述 | 权限范围 |
|------|------|------|----------|
| 普通用户 | `user` | 默认角色 | 使用工具、提需求、投票、学习 |
| 内容编辑 | `editor` | 资讯/培训内容管理 | 发布/编辑资讯和课程 |
| 需求管理员 | `demand_admin` | 需求池管理 | 评审需求、变更状态、指派 |
| 系统管理员 | `admin` | 全局管理 | 所有权限 + 工具接入 + 用户管理 |

#### 3.7.2 数据模型

```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID]
    username: Mapped[str]         # 用户名(企业账号)
    display_name: Mapped[str]     # 显示名
    email: Mapped[str]
    phone: Mapped[str|None]
    avatar_url: Mapped[str|None]
    department_id: Mapped[uuid.UUID|None]
    department_name: Mapped[str|None]
    role: Mapped[str]             # user/editor/demand_admin/admin
    is_active: Mapped[bool]
    last_login_at: Mapped[datetime|None]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]

class Department(Base):
    __tablename__ = "departments"

    id: Mapped[uuid.UUID]
    name: Mapped[str]
    parent_id: Mapped[uuid.UUID|None]
    level: Mapped[int]            # 层级
    sort_order: Mapped[int]
    is_active: Mapped[bool]
```

---

## 4. API设计

### 4.1 API规范

- 风格：RESTful
- 版本：`/api/v1/`
- 认证：Bearer Token (JWT)
- 分页：`?page=1&page_size=20`
- 排序：`?sort_by=created_at&order=desc`
- 筛选：`?category=conversation&status=active`

### 4.2 核心API端点

#### 认证

```
POST   /api/v1/auth/login            # SSO登录回调
POST   /api/v1/auth/refresh          # 刷新Token
POST   /api/v1/auth/logout           # 退出登录
GET    /api/v1/auth/me               # 获取当前用户信息
```

#### 首页聚合

```
GET    /api/v1/home                  # 首页数据聚合(一次请求返回所有首页模块数据)
       # 返回: headline + trending + competitor_news + rankings + news_feed + internal + courses + tools
```

#### AI工具导航

```
GET    /api/v1/tools                  # 工具列表(支持分类/搜索/筛选)
GET    /api/v1/tools/{id}             # 工具详情
POST   /api/v1/tools/{id}/access      # 记录访问并生成SSO跳转URL
GET    /api/v1/tools/recent           # 最近使用的工具
POST   /api/v1/tools/{id}/favorite    # 收藏/取消收藏
GET    /api/v1/tools/favorites        # 收藏列表
```

#### AI资讯与竞对情报

```
GET    /api/v1/articles               # 资讯列表
       ?category=competitor|industry|internal|tech|product
GET    /api/v1/articles/{id}          # 资讯详情
POST   /api/v1/articles               # 创建资讯(editor+)
PUT    /api/v1/articles/{id}          # 更新资讯(editor+)
DELETE /api/v1/articles/{id}          # 删除资讯(editor+)
POST   /api/v1/articles/{id}/like     # 点赞
POST   /api/v1/articles/{id}/view     # 记录浏览
GET    /api/v1/articles/headlines     # 头条焦点(首页用)
GET    /api/v1/articles/trending      # 热门资讯(AI热榜)
GET    /api/v1/competitors            # 竞对档案列表
GET    /api/v1/competitors/{id}       # 竞对详情
GET    /api/v1/competitors/benchmark  # 行业对标看板数据
```

#### AI培训

```
GET    /api/v1/courses                # 课程列表
GET    /api/v1/courses/{id}           # 课程详情
POST   /api/v1/courses                # 创建课程(editor+)
PUT    /api/v1/courses/{id}           # 更新课程(editor+)
POST   /api/v1/courses/{id}/enroll    # 报名课程
PUT    /api/v1/courses/{id}/progress  # 更新学习进度
POST   /api/v1/courses/{id}/review    # 提交评价
GET    /api/v1/courses/my             # 我的课程
```

#### AI需求池

```
GET    /api/v1/demands                # 需求列表
GET    /api/v1/demands/{id}           # 需求详情
POST   /api/v1/demands                # 提交需求
PUT    /api/v1/demands/{id}           # 更新需求
POST   /api/v1/demands/{id}/vote      # 投票
DELETE /api/v1/demands/{id}/vote      # 取消投票
PUT    /api/v1/demands/{id}/status    # 变更状态(demand_admin+)
POST   /api/v1/demands/{id}/comments  # 添加评论
GET    /api/v1/demands/{id}/comments  # 评论列表
GET    /api/v1/demands/my             # 我的需求
GET    /api/v1/demands/voted          # 我投票的需求
```

#### 排名

```
GET    /api/v1/rankings/usage         # 使用者排名
       ?period=daily|weekly|monthly
       ?page=1&page_size=50
GET    /api/v1/rankings/demand        # 提需求排名
       ?period=daily|weekly|monthly
GET    /api/v1/rankings/influencer    # 意见领袖排名
       ?period=weekly|monthly
GET    /api/v1/rankings/department    # 部门排名
       ?period=monthly
GET    /api/v1/rankings/home          # 首页排名汇总(使用者TOP5+需求TOP5)
GET    /api/v1/rankings/me            # 我的排名信息
```

#### 用户与权限

```
GET    /api/v1/users/profile          # 个人资料
PUT    /api/v1/users/profile          # 更新资料
GET    /api/v1/users/points           # 积分详情
GET    /api/v1/users/points/logs      # 积分变动记录
```

### 4.3 统一响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": { ... },
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

错误响应：

```json
{
  "code": 40001,
  "message": "需求不存在",
  "detail": "Demand with id xxx not found"
}
```

### 4.4 错误码规范

| 范围 | 描述 |
|------|------|
| 0 | 成功 |
| 40000-40099 | 参数错误 |
| 40100-40199 | 认证错误 |
| 40300-40399 | 权限错误 |
| 40400-40499 | 资源不存在 |
| 50000-50099 | 服务器内部错误 |

---

## 5. 前端架构设计

### 5.1 项目结构

```
ai-portal-web/
├── public/
├── src/
│   ├── api/                    # API请求封装
│   │   ├── modules/            # 按模块拆分
│   │   │   ├── auth.ts
│   │   │   ├── tools.ts
│   │   │   ├── articles.ts
│   │   │   ├── competitors.ts
│   │   │   ├── courses.ts
│   │   │   ├── demands.ts
│   │   │   └── rankings.ts
│   │   ├── request.ts          # Axios实例+拦截器
│   │   └── types.ts            # API类型定义
│   │
│   ├── assets/                 # 静态资源
│   │   ├── images/
│   │   └── styles/
│   │
│   ├── components/             # 通用组件
│   │   ├── common/
│   │   │   ├── AppHeader.vue
│   │   │   ├── AppSidebar.vue
│   │   │   ├── PageContainer.vue
│   │   │   ├── SearchBar.vue
│   │   │   └── EmptyState.vue
│   │   ├── home/
│   │   │   ├── HeroHeadline.vue      # 头条焦点区
│   │   │   ├── TrendingSidebar.vue   # AI热榜侧栏
│   │   │   ├── CompetitorTicker.vue  # 竞对情报条
│   │   │   ├── RankShowcase.vue      # 首页排名展示
│   │   │   ├── NewsFeed.vue          # 行业新闻流
│   │   │   ├── InternalDynamic.vue   # 集团动态
│   │   │   ├── CourseRecommend.vue   # 课程推荐
│   │   │   └── ToolShortcutBar.vue   # 工具快捷条
│   │   ├── competitor/
│   │   │   ├── CompetitorCard.vue
│   │   │   ├── ThreatAlert.vue
│   │   │   └── BenchmarkTable.vue
│   │   ├── tool/
│   │   │   ├── ToolCard.vue
│   │   │   └── ToolGrid.vue
│   │   ├── demand/
│   │   │   ├── DemandCard.vue
│   │   │   ├── DemandForm.vue
│   │   │   └── VoteButton.vue
│   │   ├── ranking/
│   │   │   ├── RankList.vue
│   │   │   ├── RankItem.vue
│   │   │   └── RankChange.vue    # 排名升降标识
│   │   └── course/
│   │       ├── CourseCard.vue
│   │       └── ProgressBar.vue
│   │
│   ├── composables/            # 组合式函数
│   │   ├── useAuth.ts
│   │   ├── usePagination.ts
│   │   ├── useRanking.ts
│   │   └── usePoints.ts
│   │
│   ├── layouts/                # 布局组件
│   │   ├── DefaultLayout.vue
│   │   └── AuthLayout.vue
│   │
│   ├── router/                 # 路由
│   │   └── index.ts
│   │
│   ├── stores/                 # Pinia状态管理
│   │   ├── auth.ts
│   │   ├── tool.ts
│   │   └── app.ts
│   │
│   ├── views/                  # 页面
│   │   ├── HomeView.vue        # 首页(文化门户主阵地)
│   │   ├── ToolListView.vue    # AI工具箱
│   │   ├── NewsListView.vue    # AI资讯列表
│   │   ├── CompetitorIntelView.vue  # 竞对情报
│   │   ├── ArticleDetailView.vue    # 资讯详情
│   │   ├── CourseListView.vue       # 培训中心
│   │   ├── CourseDetailView.vue     # 课程详情
│   │   ├── DemandListView.vue       # 需求池
│   │   ├── DemandDetailView.vue     # 需求详情
│   │   ├── DemandCreateView.vue     # 提需求
│   │   ├── RankingView.vue          # 排行榜
│   │   ├── ProfileView.vue          # 个人中心
│   │   └── admin/              # 管理后台页面
│   │       ├── ToolManageView.vue
│   │       ├── ArticleEditView.vue
│   │       ├── CompetitorManageView.vue
│   │       ├── CourseEditView.vue
│   │       └── DemandReviewView.vue
│   │
│   ├── types/                  # TypeScript类型
│   │   ├── user.ts
│   │   ├── tool.ts
│   │   ├── article.ts
│   │   ├── course.ts
│   │   ├── demand.ts
│   │   └── ranking.ts
│   │
│   ├── utils/                  # 工具函数
│   │   ├── format.ts
│   │   └── constants.ts
│   │
│   ├── App.vue
│   └── main.ts
│
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

### 5.2 路由设计

```typescript
const routes = [
  {
    path: '/auth',
    component: AuthLayout,
    children: [
      { path: 'login', component: LoginView },
      { path: 'callback', component: SSOCallbackView },
    ]
  },
  {
    path: '/',
    component: DefaultLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'home', component: HomeView },
      { path: 'tools', name: 'tools', component: ToolListView },
      { path: 'news', name: 'news', component: NewsListView },
      { path: 'news/competitor', name: 'competitor', component: CompetitorIntelView },
      { path: 'news/:id', name: 'article-detail', component: ArticleDetailView },
      { path: 'courses', name: 'courses', component: CourseListView },
      { path: 'courses/:id', name: 'course-detail', component: CourseDetailView },
      { path: 'demands', name: 'demands', component: DemandListView },
      { path: 'demands/create', name: 'demand-create', component: DemandCreateView },
      { path: 'demands/:id', name: 'demand-detail', component: DemandDetailView },
      { path: 'rankings', name: 'rankings', component: RankingView },
      { path: 'profile', name: 'profile', component: ProfileView },
      {
        path: 'admin',
        meta: { requiresAdmin: true },
        children: [
          { path: 'tools', name: 'admin-tools', component: ToolManageView },
          { path: 'articles/edit/:id?', name: 'admin-article-edit', component: ArticleEditView },
          { path: 'competitors', name: 'admin-competitors', component: CompetitorManageView },
          { path: 'courses/edit/:id?', name: 'admin-course-edit', component: CourseEditView },
          { path: 'demands/review', name: 'admin-demand-review', component: DemandReviewView },
        ]
      }
    ]
  }
]
```

### 5.3 设计系统要点

| 要素 | 规范 |
|------|------|
| 主色 | `#1E40AF` (品牌蓝) |
| 辅色 | `#7C3AED` (科技紫) |
| 成功色 | `#059669` |
| 警告色 | `#D97706` |
| 危险色 | `#DC2626` |
| 字体 | 系统默认 `-apple-system, PingFang SC, Microsoft YaHei` |
| 标题字号 | 24px / 20px / 16px |
| 正文字号 | 14px |
| 圆角 | 8px (卡片) / 6px (按钮) / 4px (输入框) |
| 阴影 | `0 1px 3px rgba(0,0,0,0.1)` (卡片) |
| 间距基数 | 4px |

---

## 6. 后端架构设计

### 6.1 项目结构

```
ai-portal-api/
├── alembic/                    # 数据库迁移
│   ├── versions/
│   └── env.py
├── alembic.ini
├── app/
│   ├── main.py                 # FastAPI应用入口
│   ├── config.py               # 配置管理
│   ├── dependencies.py         # 依赖注入
│   │
│   ├── api/                    # API路由
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── tools.py
│   │   │   ├── articles.py
│   │   │   ├── courses.py
│   │   │   ├── demands.py
│   │   │   ├── rankings.py
│   │   │   └── users.py
│   │   └── router.py
│   │
│   ├── models/                 # SQLAlchemy模型
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── tool.py
│   │   ├── article.py
│   │   ├── course.py
│   │   ├── demand.py
│   │   ├── ranking.py
│   │   └── base.py
│   │
│   ├── schemas/                # Pydantic模型
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── tool.py
│   │   ├── article.py
│   │   ├── course.py
│   │   ├── demand.py
│   │   ├── ranking.py
│   │   └── common.py
│   │
│   ├── services/               # 业务逻辑层
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── tool_service.py
│   │   ├── article_service.py
│   │   ├── course_service.py
│   │   ├── demand_service.py
│   │   ├── ranking_service.py
│   │   └── point_service.py
│   │
│   ├── tasks/                  # Celery异步任务
│   │   ├── __init__.py
│   │   ├── ranking_tasks.py    # 排名计算
│   │   ├── sync_tasks.py       # 组织架构同步
│   │   └── notification_tasks.py # 通知推送
│   │
│   └── utils/                  # 工具
│       ├── __init__.py
│       ├── security.py         # JWT/密码工具
│       ├── sso.py              # SSO客户端
│       └── redis_client.py     # Redis工具
│
├── tests/                      # 测试
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_demands.py
│   └── ...
│
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

### 6.2 关键配置

```python
class Settings(BaseSettings):
    APP_NAME: str = "天马AI门户"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost/ai_portal"
    REDIS_URL: str = "redis://localhost:6379/0"
    MINIO_ENDPOINT: str = "localhost:9000"

    JWT_SECRET_KEY: str
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    SSO_PROVIDER: str = "oauth2"
    SSO_AUTHORIZE_URL: str
    SSO_TOKEN_URL: str
    SSO_USERINFO_URL: str
    SSO_CLIENT_ID: str
    SSO_CLIENT_SECRET: str

    CELERY_BROKER_URL: str = "redis://localhost:6379/1"

    VOTE_DAILY_LIMIT: int = 3
    POINT_USE_DAILY_CAP: int = 10

    class Config:
        env_file = ".env"
```

### 6.3 Docker部署

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:password@db/ai_portal
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  worker:
    build: .
    command: celery -A app.tasks worker -l info
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:password@db/ai_portal
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/1
    depends_on:
      - db
      - redis

  beat:
    build: .
    command: celery -A app.tasks beat -l info
    depends_on:
      - redis

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: ai_portal
      POSTGRES_PASSWORD: password
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api

volumes:
  pgdata:
  redisdata:
  miniodata:
```

---

## 7. 分阶段实施计划

### Phase 1：MVP — 文化阵地与运营基础（6-8周）

| 周次 | 任务 | 交付物 |
|------|------|--------|
| W1-W2 | 项目初始化 + 数据库设计 + SSO对接 | 项目框架、迁移脚本、SSO登录可用 |
| W3-W4 | 首页（头条+热榜+竞对情报+双排名+新闻流+工具条） | 完整首页，文化感十足 |
| W5-W6 | 需求池（提交/列表/投票/状态流转） + 三排名系统 | 需求池完整功能+排行榜 |
| W7 | 资讯管理（CRUD+竞对情报+分类） + 积分基础 | 资讯列表/详情/竞对情报页 |
| W8 | 联调测试 + Bug修复 + 部署上线 | 线上可用环境 |

**MVP交付范围**：
- ✅ SSO登录 + 首页文化门户（头条/竞对情报/排名/新闻流/工具条）
- ✅ AI资讯与竞对情报（分类发布+竞对档案+行业对标）
- ✅ 需求池（提需求+投票+状态流转）
- ✅ 三排名（使用者+提需求+意见领袖）+ 积分体系
- ❌ AI培训（待Phase 2）
- ❌ 数据看板（待Phase 3）

### Phase 2：培训与运营深化（4-6周）

| 周次 | 任务 | 交付物 |
|------|------|--------|
| W1-W2 | AI培训模块（课程CRUD+报名+进度+评价） | 课程列表/详情/学习页面 |
| W3-W4 | 管理后台（内容管理+竞对管理+需求评审） | 后台管理界面 |
| W5 | RSS自动抓取+AI摘要+通知体系 | 资讯自动采集、企微/钉钉通知 |
| W6 | 集成测试 + 优化迭代 + 发布 | Phase 2全量发布

### Phase 3：数据驱动与智能升级（4周）

| 周次 | 任务 | 交付物 |
|------|------|--------|
| W1-W2 | 数据看板（使用统计+部门AI渗透率+ROI+趋势图） | 管理层看板页面 |
| W3 | 智能化升级（AI摘要+需求相似检测+智能推荐） | AI增强功能 |
| W4 | 全量优化 + V1.0正式版发布 | 正式版 |

---

## 8. 非功能性需求

### 8.1 性能

| 指标 | 目标 |
|------|------|
| 页面首屏加载 | < 2s |
| API平均响应 | < 200ms |
| 排名查询 | < 50ms (Redis缓存) |
| 并发支撑 | 500 QPS |

### 8.2 安全

| 措施 | 描述 |
|------|------|
| 传输加密 | 全站HTTPS |
| 认证 | JWT + SSO，Token短期有效 |
| XSS防护 | 前端输出转义 + CSP |
| SQL注入 | SQLAlchemy ORM参数化查询 |
| CSRF | SameSite Cookie + Token验证 |
| 敏感数据 | 密码/密钥环境变量注入，不落库 |
| 日志脱敏 | 用户手机号/邮箱日志中脱敏 |

### 8.3 可用性

| 指标 | 目标 |
|------|------|
| 服务可用性 | 99.5% |
| 故障恢复 | < 30min |
| 数据备份 | 每日全量备份 |

### 8.4 监控

- 应用日志：结构化JSON日志，ELK收集
- 性能监控：Prometheus + Grafana
- 告警：API错误率 > 1% 触发告警
- 健康检查：`/api/v1/health` 端点

---

## 9. 风险与应对

| 风险 | 概率 | 影响 | 应对策略 |
|------|------|------|----------|
| SSO对接复杂度超预期 | 高 | 高 | 提前调研集团SSO协议，预留2周缓冲 |
| 竞对情报内容获取难 | 高 | 中 | 初期人工采集+RSS，后期AI自动采集 |
| 初期内容不足(资讯/课程) | 高 | 中 | 上线前储备30篇资讯(含10篇竞对)+5门课程 |
| 排名机制被刷 | 中 | 中 | 设置每日积分上限，异常检测 |
| 员工参与度低 | 中 | 高 | 竞对情报营造紧迫感、部门KPI挂钩、领导带头 |
| AI工具接入标准不统一 | 中 | 中 | 制定工具接入规范文档 |

---

## 10. 后续演进方向（V2.0+）

1. **AI助手嵌入**：门户内嵌AI对话，可直接问"帮我找XX工具"或"总结竞对动态"
2. **智能推荐**：根据用户岗位和行业，推荐相关竞对情报/工具/课程
3. **需求AI分析**：自动对需求进行分类、相似度检测、优先级建议
4. **竞对情报自动化**：AI自动采集、分析竞对公开信息，生成情报简报
5. **低代码AI应用搭建**：让业务人员通过拖拽构建简单AI应用
6. **多租户**：支持集团下属子公司的独立门户空间
7. **移动端适配**：响应式设计 + 企业微信H5应用
8. **月度AI战报**：自动生成集团AI应用月度报告，推送管理层

---

*文档结束*
