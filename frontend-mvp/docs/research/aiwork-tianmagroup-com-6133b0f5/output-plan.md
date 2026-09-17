# 天马智擎线上视觉同步输出计划

## 授权范围

用户明确要求在现有 `frontend-mvp` 中更新既有路由，并保留已实现增强能力。本轮只处理 `/chat`、`/knowledge`、`/settings` 相关界面，不重做无关业务。

## 路由与交付

| 线上基线 | 本地路由 | 主要组件 | 本轮目标 |
| --- | --- | --- | --- |
| `/chat` | `/PORTL/chat` | `SourceChatHome.vue`、`QuickPromptPanel.vue` | 复刻首页双模式、输入区、快捷开始/专家卡片；保留并强化快捷提示语 |
| `/knowledge` | `/PORTL/knowledge` | `KnowledgeBaseView.vue`、`KnowledgeDialogs.vue` | 复刻知识中心上传文件弹窗及交互 |
| `/settings` | `/PORTL/settings/agents` 等 | `SettingsManagementView.vue`、`AgentSettingsView.vue`、`SettingsInsightsView.vue` | 复刻线上设置页密度与布局，保留本地用量计费等扩展 |

## 验证

- 每块先补关键行为测试，再改实现。
- 运行对应单测、完整测试与生产构建。
- 桌面端为主，至少保证窄屏不溢出不可用。
- 对照线上基线检查层级、间距、卡片密度、弹窗尺寸与所有主要点击路径。
