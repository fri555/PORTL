# 天马 AI 工作门户

Vue 3、TypeScript、Vite、TailwindCSS 与 Element Plus 构成前端；FastAPI 提供会话和上传接口。部分页面仍使用本地示例数据，历史会话和专家配置保存在浏览器中。

## 安装与运行

使用 Node.js 22.13 以上的 22.x 或 Node.js 24 以上版本，统一通过 npm 和 package-lock.json 安装。Node 23 不在当前 jsdom 支持范围内。

```bash
npm ci
npm run dev
```

开发端口为 5176；页面基路径默认 /PORTL/。生产模式默认使用 hash 路由；VITE_ROUTER_MODE 可覆盖。登录页保留当前模拟登录行为，尚未替换为生产 SSO。

在仓库根目录安装根依赖并配置 backend 的 Python 3.12 环境后，可通过 npm run dev 同时启动前后端；也可以单独使用 npm run dev:fe 和 npm run dev:be。后端依赖在 backend/requirements.txt，配置示例在 backend/.env.example。

## 验证与构建

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

npm test 保留完整 Vitest 退出状态。2026-10-13 首次备份时存在 132 个失败断言；保留执行期间的 8 个原项目源码改动后，当前原目录复测有 147 个失败断言及一个空测试文件收集错误。逐项对照确认本次精简没有新增失败，主要涉及旧工作台和近期交互断言；它们没有在精简中被删除或放宽。仓库根目录的 npm run test:regression 会运行全套测试，再按 test-baseline.json 对比原通过项、已知失败和测试发现集合；它只证明没有新增回归，并会明确输出仍存在的失败。完整报告保存在 .local/test-results.json。

GitHub Actions 同时保存原始测试报告并校验基线，新增失败、跳过已知失败或缺失原测试均会阻止后续构建。生产构建输出 dist/。

## 当前页面

| 路径 | 用途 |
| --- | --- |
| /auth/login | 登录 |
| /chat、/chat/:sessionId | 日常/专家对话与历史会话 |
| /workspace/chat | 原工作区对话 |
| /files | 任务文件 |
| /portals | 企业系统入口 |
| /dashboards | 仪表盘 |
| /knowledge | 知识中心 |
| /agent-square | 专家市场 |
| /settings/agents | 智能体管理 |
| /settings/usage、/settings/audit | 用量与日志 |
| /admin/feedback | 建议箱 |
| /automation | 自动化 |

根路径与未匹配路径跳转到 /chat；原设置子路由重定向保留。路由定义以 src/router/index.ts 为准。

## 模块职责

- src/views：路由页面与页面级协调。
- src/components：可复用界面；settings/insights 承载拆分后的用量/日志子界面。
- src/composables：响应式业务状态；settings 下组织用量/日志状态与动作。
- src/types、src/mock：类型与示例数据，避免塞入页面文件。
- src/utils：纯工具和历史状态兼容；legacy 专家映射保留用于历史会话。
- server：Vite 服务插件，承载钉钉工作台、邮件摘要与待办提取。
- ../backend/app/api：HTTP 适配；services：业务与 SSE 事件处理；models/schemas/core：数据库、接口类型与基础配置。

2026-10-14 根据用户授权删除 19 个无路由旧页面及其专用代码，共 126 个无引用源码文件。当前 12 个路由页面、现有工作区聊天、共享历史数据和服务插件保留。旧工作台的 49 项失效测试退役，原有效测试保留并增加当前系统入口页验证；剩余 98 项既有失败继续公开记录。详见 ../docs/folder-cleanup-2026-10-14.md。

## 服务与部署边界

server/dws-workbench.ts、server/todo-extraction.ts、server/email-summary.ts 有实际用途，imapflow/mailparser 也是服务依赖。Vite 配置读取前端环境以及 backend 的 AI 环境配置。开发服务与静态 dist 不等价：仅由 configureServer 提供的接口不会随 GitHub Pages 静态部署运行，邮件服务的 preview 钩子也不会成为 Pages API。

Docker 的前端使用 npm ci 和隔离 node_modules 数据卷。后端 PostgreSQL 配置仍有缺少显式数据库驱动的既存问题，需单独处理；本次精简未更换数据库、外部服务或运行模式。

## 本轮备份与架构说明

原项目 .backups/2026-10-13-architecture-before/ 包含约 2 GB 的修改前归档、逐文件验证记录、数据库一致快照和 quarantine 清单。备份不进入 Git；恢复时先解压到新的空目录，再按需恢复。

架构方案及执行记录位于仓库根 docs/superpowers/specs/2026-10-13-portal-architecture-cleanup-design.md 和 docs/superpowers/plans/2026-10-13-portal-architecture-cleanup.md。
