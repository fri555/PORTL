# 上下文主动建议产品调研

## 一、结论

“上下文主动建议”应被定义为回答完成后的快捷追问，而不是新的一段 AI 正文，也不是需要用户确认的推荐卡片。

推荐采用成熟产品中最轻量的方式：每次有效回答完成后，异步生成固定 3 条简短建议，显示在最新回答下方；用户点击后直接作为一条普通用户消息发送，完整走现有费用预估、额度校验、回答和计费流程。

建议生成失败不能影响主回答。旧回答下的建议在出现新一轮消息后失效，防止用户误点过期上下文。

## 二、可直接访问的参考页面

| 产品/页面 | 访问情况 | 可以重点参考 | 不应直接照搬 |
|---|---|---|---|
| [Microsoft Teams AI Suggested prompts](https://learn.microsoft.com/en-us/microsoftteams/platform/teams-sdk/in-depth-guides/ai/best-practices#suggested-prompts) | 无需登录，含动画界面示例和完整交互说明 | 建议以按钮显示在回答下方；点击后作为普通消息发送；独立生成失败静默降级 | 示例固定 2 条，天马按已确认需求固定 3 条 |
| [Azure “Chat with your data”示例](https://learn.microsoft.com/en-us/azure/developer/python/get-started-app-chat-template) | 无需登录，含勾选开关和回答后效果截图 | 管理端开关、回答后显示建议、点击继续对话 | 开发者开关不能直接作为普通用户设置页 |
| [Dynamics 365 Copilot 主动建议](https://learn.microsoft.com/en-us/dynamics365/contact-center/use/use-ask-a-question) | 无需登录，含 Copilot 侧栏截图 | 根据当前问题和知识回答主动建议下一步 | 客服工作台场景更重，天马无需侧栏布局 |
| [Databricks Genie 建议追问](https://learn.microsoft.com/en-us/azure/databricks/genie-agents/talk-to-genie#suggested-follow-up-questions) | 无需登录，含回答下方建议截图 | 每次回答后基于会话上下文生成，点击即继续查询 | 数据分析场景的建议可能较长，天马需限制长度 |
| [Perplexity](https://www.perplexity.ai/) | 首页可公开访问；完整结果因网络和账号状态而异 | 回答末尾的 Related 问题、轻量连续探索 | Related 区域数量不固定，也可能混入推广内容，不适合照搬 |

## 三、成熟模式的共同点

### 1. 建议是下一条用户消息

Microsoft Teams 的建议按钮点击后，会将按钮值作为普通用户消息交给同一套消息处理逻辑，不需要额外路由。[^1] 这正好支持天马已确认的“点击后直接发送”。

### 2. 建议生成与主回答解耦

Teams 官方示例建议用单独的轻量调用生成结构化建议，并在解析或网络失败时直接不显示建议，主回答仍正常交付。[^1] 因此天马不应让“追问建议生成中”阻塞回答完成状态。

### 3. 必须依赖当前上下文

Databricks Genie 在每次回答后结合智能体指令和会话上下文生成建议。[^2] 天马的建议至少应使用最近一轮用户问题、当前回答和当前智能体能力，避免生成泛化问题。

### 4. 开关应该是账号级偏好

Azure 示例把建议能力设计成可开关选项。[^3] 天马已确定普通用户可自行关闭，因此开关应保存在账号级设置中，并在多端保持一致。

## 四、推荐交互流程

    用户发送问题
      → AI 返回完整有效回答
      → 回答立即可读
      → 系统异步生成 3 条建议
          ├─成功：显示在最新回答下方
          └─失败/超时：本轮不显示，不提示主任务失败

    用户点击一条建议
      → 3 条建议立即进入不可点击状态
      → 所选文字直接发送为用户消息
      → 继续走正常消息链路
      → 新回答完成后生成新一组 3 条建议

## 五、内容规则

- 固定 3 条，不因模型偶尔只返回 1～2 条而改变布局；不足 3 条时本轮整体不展示或补齐后再展示；
- 每条建议是一句用户可以直接发送的问题或指令；
- 建议之间意图应有区分，例如“继续深入”“换角度比较”“下一步行动”；
- 避免重复回答中已经解决的问题；
- 避免引导用户访问无权限数据或执行当前智能体不具备的动作；
- 建议文本不带序号、引号和“你可以问”；
- 建议过长时不截断成歧义文本，应重新生成或不展示。

## 六、状态与边界

| 场景 | 产品处理 |
|---|---|
| 主回答流式输出中 | 不显示建议 |
| 主回答失败、取消或为空 | 不生成建议 |
| 建议正在生成 | 可不显示骨架，避免用户误以为主回答未完成 |
| 建议生成失败 | 静默降级，不影响回答 |
| 用户开始手动输入 | 建议仍可见，直到消息真正发送；若点击建议则按产品统一规则处理草稿冲突 |
| 用户点击一条建议 | 所有建议立即禁用，防止重复发送 |
| 新消息已发送 | 旧建议失效，不能再次点击 |
| 用户关闭功能 | 后续回答不再生成；已显示建议立即隐藏 |

## 七、对 V1.1.0 的决策

1. 固定生成 3 条，展示在最新有效回答下方。
2. 点击直接发送，不先填入输入框。
3. 与主回答异步解耦，失败静默降级。
4. 只保留最新一组可操作建议。
5. 提供账号级开关，默认开启。

## Sources

[^1]: Microsoft, [Enhance the Teams Experience — Suggested prompts](https://learn.microsoft.com/en-us/microsoftteams/platform/teams-sdk/in-depth-guides/ai/best-practices#suggested-prompts)，访问于 2026-09-14。
[^2]: Microsoft / Databricks, [Use a Genie Agent — Suggested follow-up questions](https://learn.microsoft.com/en-us/azure/databricks/genie-agents/talk-to-genie#suggested-follow-up-questions)，访问于 2026-09-14。
[^3]: Microsoft, [Get started sample: Chat using your data in Python](https://learn.microsoft.com/en-us/azure/developer/python/get-started-app-chat-template)，访问于 2026-09-14。
