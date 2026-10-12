# Design QA — 上线版全站对齐（工作台除外）

## Scope

- Source: signed-in `https://aiwork.tianmagroup.com/`
- Prototype: `frontend-mvp`
- Included: global header, 天马智擎首页、仪表盘权限态、知识中心、设置/智能体管理
- Excluded: `/portals` 工作台内容
- New requirement: knowledge-base and intelligent-agent permission configuration

## Source captures

- Home states: `design-qa-assets/reclone/source-chat-desktop-1440.png`, `source-chat-default-1280x720.png`, `source-chat-mode-open-1440x900.png`, `source-account-menu-1440x900.png`
- Knowledge: `source-knowledge-default-1440x900.png`, `source-knowledge-menu-1280x720.png`
- Agents: `source-agents-default-1280x720.png`, `source-agents-menu-1440x900.png`

## Final prototype captures

- Home expanded-history state: `local-final-chat-history-open-1440x900.png`
- Knowledge menu and permission dialog: `local-final-knowledge-menu-1280x720.png`, `local-final-knowledge-permission-1280x720.png`
- Agent menu and permission dialog: `local-final-agents-menu-1280x720.png`, `local-final-agents-permission-1280x720.png`

## Visual alignment results

- Global header: matched responsive desktop gutters, production logo size, navigation spacing, feedback control, account avatar/name, and the single-item logout menu.
- Home: matched the 270 px history panel, history density, main-content shift, 800 × 172 composer, exact 776 × 100 textarea, control coordinates, 246 × 74 quick cards, production slogan/mascot, and two-option mode menu.
- Knowledge: matched the production header controls, fixed action sizes, table column coordinates, 57 px row density, names, owners, and timestamps. Added `权限设置` beside `重命名` and `删除`.
- Agents: matched the 32 px search/filter controls, list density, production avatars, pagination, and operation-menu styling. Added `权限设置` beside `编辑` and `删除`.
- Dashboard: retained the production-observed signed-in `无访问权限` state.

## Permission behavior verified

- Knowledge and agent row menus both open the resource permission dialog.
- Member list shows a locked system administrator, departments, people, fixed `查看` permission, and row removal.
- Add-member view supports department/person tabs, name or employee-number search, automatic duplicate suppression, and a 30-item single-add limit.
- Department grants explicitly retain automatic synchronization for hire, departure, and transfer changes.
- Changes remain a draft until `保存设置`; save performs full-list validation and emits the complete member list.
- Knowledge saves display the RAG retrieval-filtering effect; agent permissions do not show the knowledge-only RAG copy.
- Personal-space knowledge bases suppress the permission entry through the `space === 'personal'` rule.

## Verification

- Browser interaction: knowledge menu → permission dialog → add department/person → confirm → save passed.
- Browser interaction: agent menu → permission dialog passed.
- Same-input visual comparison performed for the production and final 1440 × 900 home history state.
- Full tests: 20 files, 138 tests passed.
- Production build: `vue-tsc --noEmit && vite build` passed.

## Local mock knowledge tree follow-up — 2026-08-28

- Source reference: `design-qa-assets/source/knowledge-sidebar-open-desktop.png`.
- Implementation capture: `design-qa-assets/reclone/local-knowledge-tree-final-1000x844.png` at 1000 × 844, DPR 1.
- Verified state: public space root, sidebar open, first knowledge base and its nested folder expanded.
- Content source: repository-local mock data only; copied online test-account knowledge-base names and records were removed.
- Interaction coverage: public/personal switching, recursive sidebar expansion, root and nested table navigation, clickable breadcrumbs, file preview, local folder creation, upload mock, rename, delete, and permission management.
- Fidelity result: the source shell, spacing, row density, icon hierarchy, toolbar, and disclosure controls remain aligned while the records are intentionally replaced with realistic local business data.
- Iteration note: a narrow-layout breadcrumb wrap was found during browser review and fixed with a single-line, ellipsized breadcrumb layout.
- Final severity: no open P0, P1, or P2 visual issues in the verified knowledge-tree state.

## V1.2 M9 / M10 / M12 prototype update — 2026-08-31

### Evidence and normalization

- Source visual truth: `../docs/prototype-audit/01-home.png`, `02-agent-settings.png`, `03-knowledge-center.png`, and `04-knowledge-files.png`.
- Requirement truth: the updated V1.2 PRD snapshot at `../docs/v12-review-updated.json`, specifically M9, M10, and M12.
- Implementation captures: `../docs/prototype-audit/05-m12-expert-picker-updated.png`, `06-m10-dingtalk-auth-updated.png`, `07-m10-dingtalk-confirm-updated.png`, `08-m9-folder-permission-updated.png`, and `09-m12-agent-settings-updated.png`.
- Viewport and pixels: 1280 × 720 CSS px, 1280 × 720 image px, device scale factor 1. Source captures use the same 1280 × 720 desktop frame; no density normalization was required.
- States: M9 folder standalone permission; M10 initial authorization, write confirmation, and successful result; M12 all-department expert grid plus create-agent configuration fields.
- Full-view comparisons were performed with each source and implementation image loaded together. Separate focused crops were not needed because the permission dialog, confirmation card, expert grid, and configuration fields are readable at full 1280 × 720 resolution and occupy the primary comparison region.

### Required fidelity surfaces

- Fonts and typography: retained the existing system/PingFang stack, compact 12–16 px hierarchy, weights, truncation, and muted helper text used by the source prototype.
- Spacing and layout rhythm: preserved the 56 px global header, existing sidebar and main-column geometry, table rhythm, 8–16 px control spacing, rounded cards, and restrained elevation.
- Colors and tokens: retained the source black primary actions, neutral gray borders/backgrounds, blue selected states, green success feedback, and amber external-write warning.
- Image quality and assets: reused the existing Tianma logo, mascot, and agent avatar files; no placeholder or hand-drawn replacement assets were introduced.
- Copy and content: M9 inheritance wording, M10 authorization/write-confirmation wording, and M12 department/system labels match the V1.2 PRD and remain concise enough for the existing UI density.

### Comparison history

- First pass P2: the M10 write-confirmation card touched the fixed composer at 1280 × 720. Fixed by tightening card line height, padding, gaps, and footer spacing. Post-fix evidence: `07-m10-dingtalk-confirm-updated.png`; all controls are fully visible with clear separation.
- First pass P1: the fixed-position knowledge row menu was visually above the next row but its permission entry could pass the click through to the underlying folder. Fixed by elevating the active row stacking context. Post-fix evidence: the browser flow opens `权限设置 - 人事制度`, and `08-m9-folder-permission-updated.png` shows the correct dialog state.
- M12 differences from the daily-mode source are intentional requirements: department tabs, search, three-column internal scroll grid, and system tags. The existing global shell and composer visual language remain unchanged.

### Primary interactions and console

- M9: knowledge base → folder menu → permission management → standalone mode passed.
- M10: authorization verification → write confirmation → successful todo result passed.
- M12: expert mode → department filter → DWS keyword filter passed; create-agent form exposes applicable departments and up to three connected-system tags.
- Browser console: no errors or warnings in the verified states.
- Automated verification: 23 test files / 163 tests passed; production typecheck and build passed.

### Findings

- No actionable P0, P1, or P2 visual or interaction differences remain.
- P3 follow-up: some long expert names are intentionally truncated in the compact three-column cards; the full name remains available through the card title and can be reconsidered if the final design increases card width.

final result: passed

## M10 authorization-state correction — 2026-08-31

- Final capture: `../docs/prototype-audit/14-m10-dual-auth-buttons-final.png`.
- Corrected constraint: the frontend cannot reliably read the external DingTalk authorization result, so it does not infer or automatically transition authorization state.
- The authorization card now displays “去授权” and “已授权” simultaneously. “去授权” opens the DingTalk authorization page and leaves the current card in place; “已授权” is the explicit user acknowledgement that continues to write confirmation.
- Browser verification confirmed exactly two visible authorization actions and no console errors or warnings.
- Automated verification: 23 test files / 163 tests passed; production typecheck and build passed.

final result: passed

## V1.2 M9 / M10 / M12 refinement — 2026-08-31

- Updated captures: `../docs/prototype-audit/10-m12-toolbar-refined.png`, `13-m9-permission-simplified.png`, and final M10 capture `14-m10-dual-auth-buttons-final.png`. Earlier M10 captures `11` and `12` are superseded.
- M9: removed permission inheritance and download-permission controls; folder and file dialogs now directly edit visible members, with the confirmation limited to impacted child resources and member count.
- M10: keeps “去授权” and “已授权” visible together because the frontend cannot reliably determine the external authorization result; only the explicit “已授权” action continues to write confirmation.
- M12: placed department tabs and expert search on the same row. Both the horizontal tab strip and vertically scrollable expert area retain scrolling while hiding native scrollbars.
- Browser verification at 1280 × 720 confirmed the M12 controls share one row, both scrollbar widths resolve to `none`, the M10 authorization card contains both required actions, and M9 contains neither inheritance nor download controls.
- Browser console: no errors or warnings in the verified states.
- Automated verification: 23 test files / 163 tests passed; production typecheck and build passed.

final result: passed
# 2026-09-17 需求收口验证

- 日志管理收口为单页；筛选仅保留开始/结束时间、操作人员、模块、操作类型，详情使用居中弹窗。
- 用量管理收口为“筛选区 → 指标卡 → 树形明细”；部门 → 人员 → 请求，人员额度支持日/周/月，详情使用居中弹窗。
- 会话搜索默认近 3 个月，20 条/页滚动懒加载；当前范围加载完后才显示更早消息按钮。
- 上下文建议纵向排列，AI 决定 1–3 条；快捷提示语继续使用居中新建弹窗。
- 知识上传已增加“按月报模式解析”复选框，并接受 PPT/PPTX。
- 仪表盘左侧增加“观远运营看板”权限菜单，管理员可见内嵌占位与权限设置。

## V1.3 专家市场与快捷呼出优化 — 2026-10-08

### 对照证据

- 参考图：`C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-16ef251c-5b17-4c66-a568-2b1638a153ae.png`（市场密度）、`codex-clipboard-b0cacaa8-8eef-42fc-9016-fd6a527af8fb.png`（@ 候选）、`codex-clipboard-3279e379-4f59-40d7-9c1b-184e44d30130.png`（使用说明结构）。
- 实现图：`../docs/需求文档/screenshots/V1.3.0-评审-23-专家市场.png`、`26-专家详情上半部.png`、`27-专家详情下半部.png`、`29-使用说明编辑回显.png`、`32-创建使用说明.png`、`33-快捷专家候选与键盘.png`、`34-选择后切换专家模式.png`、`35-快捷专家无结果.png`。
- 验证画布：1440 × 900，DPR 1。参考图与实现图在同一轮视觉检查中并排查看，并分别检查市场整体、抽屉字段区、表单上下半部和 @ 浮层。

### 设计结论

- 专家市场删除顶部宣传卡片，保留搜索和原分类标签；卡片沿用系统视觉，只显示头像、类别、名称、简介、收藏和详情入口，已删除能力标签及使用次数。
- @ 候选固定在输入框上方，避免第二次输入 @ 时遮挡或挤动正文；候选项只显示头像和名称，不保留简介、部门或“更多专家”。选中结果以标签嵌在输入框内容区顶部，第二次选择直接替换标签并保留正文。
- 专家详情继续使用右侧抽屉。使用说明按五部分显示字段名和值，上下半部均可滚动查看；底部收藏与使用操作固定。
- 智能体设置把大段使用说明改为五组结构化表单。必填星号、格式、长度及发布校验与 PRD 字段表一致；草稿和发布快照仍使用同一数据来源。

### 对比修正记录

- P1：首次抽屉截图在开启动画未结束时采集，画面被裁切；增加稳定等待后重拍。
- P1：详情下半部最初滚动了错误容器；改为滚动 `.modal-body` 后，知识边界、使用约束和快捷问法均完整可见。
- P2：PRD 仍含“按使用次数排序”和候选简介；已与界面同步删除，并将使用说明字段改为结构化表单说明。
- 浏览器采集期间无控制台错误；未发现仍需处理的 P0、P1 或 P2 视觉问题。

final result: passed

## V1.3 使用说明与 @ 扩展 — 2026-10-08

- 使用说明设置页收敛为“能力范围、能力边界”，仅人工维护接入系统、输入要求、输出形式和使用限制；专家抽屉自动展示负责人、上线/更新时间、文件格式、知识库、联网状态及固定使用约束。
- 专家卡片在简介下展示接入系统标签，最多显示三项；设置使用 Element Plus InputTag，最多八项。
- @ 浮层当前类型每页固定五条，显示结果总数和独立页码；选择记录当前用户的最近使用时间，再次打开按时间倒序。
- 视觉检查覆盖专家中心、抽屉上下半部、设置表单和 @ 分页状态。修复固定使用约束窄列问题后，无待处理 P0、P1、P2 问题。

final result: passed

## V1.3 审批模式与执行过程复查 — 2026-10-08

- 专家市场移除“发现专家 / 我的收藏”二级切换，仅保留搜索、业务分组、专家卡片、收藏和详情抽屉；主页继续只展示已收藏专家。
- 新会话输入框内增加“默认权限 / 自主执行”。模式随首条消息创建会话，进入会话后只读显示；新会话恢复默认权限。
- 自主执行仅自动同意低风险工具操作。必填项、首次账号授权、高影响动作和未知分类继续阻断；默认权限保留现有确认流程。
- 执行过程由三行文字改为可折叠时间线，折叠态显示总体状态和完成数，展开态显示用户可理解的阶段、状态、耗时、失败摘要和恢复入口，不展示模型原始推理。
- 开发复查修正两项状态问题：账号授权前不再误显示“处理完成”；分享当前会话时保留审批模式。
- 视觉证据：专家市场图 23、执行过程图 50、审批模式图 61、自主执行待发送图 62、自主执行结果图 63。

## V1.3 第二轮完整复核 — 2026-10-09

本节为当前结论，替代上文“@始终上浮”和旧版五组可编辑使用说明的口径。未扩展功能基准。

- 专家市场：保留搜索、全部/通用/商品/直播/B2B/B2C/门店分组和卡片；主页只显示收藏。抽屉使用系统无衬线字体；负责人、日期、文件格式、联网和知识时间按明确元数据读取，未知显示“未提供”；仅改说明保留已有版本，日期明确按北京时间展示并验证跨日边界。
- 使用说明：人工编辑仅能力范围、能力边界。保留多行与旧文本；校验标签数量/长度、输入输出120字符、使用限制300字符。自动标签只读，回基础设定或能力扩展修改；编辑与发布快照同步。
- 快捷专家：头像与名称、每页5项、最近选择时间倒序；修复过期光标范围误删正文。上方不足且下方更宽裕时下浮，会话底部保持上浮，不改变分页与排序规则。
- 知识接入：管理员入口和组件操作双重防护；角色撤销关闭管理并清除敏感草稿。目录未完成/失败不能继续，错误可重新读取；移出范围的失败项保留记录但不再重试。
- 引用：来源撤回后可返回全部来源；同快照晚到片段更新预览；引用位置全部移除后清除未解析计数。
- 会话：按用户隔离本地原型记录，恢复已选审批模式与专家；每次新会话使用独立ID。记录截止时间和终态，重试新增执行尝试并保留原失败；初始草稿暂停追问计划。
- 质量修复：恢复既有搜索命中摘要与关键词高亮，使用安全文本插值；同步旧流程/烟测的会话ID与收藏前置断言。

视觉证据：68张截图已重拍，画布1440×1000，DPR1；末轮复拍33–35、67–68和真实模拟发布后的31。采集无页面错误与控制台错误；人工复看23、26、27、29、33、50、65、67，检查分组、字体、字段、候选数量、重试档案与禁用反馈。
钉钉发布回读修订160：68个唯一原生图片资源、12个原生流程图、1个目录；全部图片位于对应12个“界面原型”小节的表格上方，顺序与上传日志一致。

验证：V1.3专项93/93、会话流程15/15、烟测4/4通过；最终标准 npm run build（包含类型检查）通过。构建排除历史sync-conflict副本，原文件保留；大包体积警告仍存在。全项目剩余旧页面失败详见独立验收记录，不以专项通过声称全量通过。

限制：浏览器自动化连接正式环境失败；当前为同源前端原型验证。真实钉钉权限/同步、服务端模式锁定、真实流式引用和正式文件产出仍需技术预研及接口验证。本地状态保存不能替代服务端鉴权、计时与持久化。

final result: 本轮需求原型与文档复核通过；正式能力及全项目既有测试不作通过结论


## 2026-10-09 V1.3.0范围修订

专家中心紧凑无标签卡片；收藏18与冻结上线名单；主页统一收藏分类及箭头左侧红心；任意@触发全部可用专家，每批5条滚动追加、同行单前缀替换。个人钉钉导入与管理员连接分离，已有/新建个人库、失败项单重试；每小时/每天增量。实际浏览器截图82张，PRD11原型区13交互表。

专项147/147通过，标准构建通过。全项目258/317，59失败逐条与上一轮相同，无新增失败。详细证据见项目根.vercel-tmp/scope-*及docs/需求文档/V1.3.0-产品复核与原型验收记录.md。真实身份鉴权与多端执行不以本地演示代替联调。

## V1.3.0 专家卡片与交互修订 — 2026-10-09

本节为最新样式口径，替代上文紧凑无标签卡片、固定七组、详情抽屉及分组表单的结论；旧记录保留。

- 竖向卡片、最多3个接入系统标签、右上独立红心、底部“收藏→对话”和居中详情弹窗；主页仅显示有收藏的分类，保留“收藏”首组和空态。@移除搜索条及键盘说明，使用说明四字段平铺。
- 独立复查确认主PRD M1/M2一致；修复最后一位取消收藏后首组隐藏，以及独立按钮空格激活被父卡片阻止的问题。
- 专项155/155通过。首次全量265/325通过，原59失败与scope-full/round2基线一致；新增旧分组标题断言已按新要求更新，单用例1/1通过，最终全量266/325通过，59项失败与既有基线逐条一致，无新增失败；构建通过。
- 截图总计85张，本轮更新20张；浏览器验证无页面错误，独立视觉检查通过。证据见项目根.vercel-tmp/cards-*及产品复核与原型验收记录。

最终同步：钉钉文档版本270，85张原生截图均置于对应功能界面表格上方；11张原生流程图、13张界面表、11张字段表完整。正文逐块回读与最终稿一致，20张新图及65张原图的顺序已核对。验证证据：.vercel-tmp/cards-publish-verification.json、cards-baseline-comparison.json、cards-screens.json。


## V1.3.0 真实专家资料统一 — 2026-10-09

- 源文档修订3728；业务总览18位名称、分类、简介、系统及说明统一到中心、主页、@、设置和搜索筛选，耶虎独立为日常办公，设置共19位。开发/测试项未纳入；负责人、版本、模型、日期等未知项未补造。源文档旧统计、别名及链接分析师详情误抄见20261009-业务专家信息清单。
- 兼容原型旧目录：只迁移完整未修改的9位演示默认收藏，已清空/手动修改的收藏不补回；历史专家快照、旧会话和未发送计划保留。停用/删除实际持久化，删除刷新不恢复，保存失败保持原状态。设置保存沿用图标并保留模型、角色及快捷词。
- 设置19位列表改为可滚动，首末页均已拍摄；专家中心18位全目录和各交互状态已复查。最终55张本轮截图无页面或控制台错误，独立视觉复核通过。
- 最终专项179/179、类型检查及构建通过。全量290/349，59项既有失败与上一轮逐条一致，无新增失败；不据此声称全项目通过。
- 钉钉PRD回读版本326：89张唯一原生截图，更新55/保留34；全部位于对应界面原型表格上方。11个原生流程图、13张界面表、11张字段表、1个目录完整，正文逐段及图片顺序核对通过。
- 证据：项目根.vercel-tmp/catalog-publish-verification.json、catalog-final-screens.json、catalog-baseline-comparison.json、catalog-final-test-results.json、catalog-full-test-results.json。同步前备份为docs/需求文档/20261009-V1.3.0-before-catalog-unification.jsonml。


## V1.3.0 官方头像替换 — 2026-10-10

- 18张用户提供的虎形象原图逐一复制到public/assets/business-experts-v1，文件哈希与原图完全一致；评价/商品分货/运动健康伴侣的图片按已确认名称映射，不改名称分类。
- 专家中心、主页、@、设置及备用工作台共用正式头像。缓存只替换18个当前专家已知旧演示图，保留自定义图、正文、收藏、删除标记及旧历史；写失败仍正常加载。
- 206/206相关检查通过，标准构建通过。全量317/376，59项既有失败逐条与前轮一致，无新增失败。38张头像相关截图已重拍，无浏览器错误；独立视觉复核无黑底、严重裁切或遮挡。
- 钉钉PRD回读版本365：89张原生图片，更新38/保留51，均位于对应界面表格上方；11个流程图、13张界面表和11张字段表完整，正文及图序核对通过。证据：项目根.vercel-tmp/avatar-assets-verification.json、avatar-browser-verification.json、avatar-baseline-comparison.json、avatar-publish-verification.json。
