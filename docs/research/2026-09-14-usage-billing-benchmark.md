# 用量与计费明细产品调研

## 一、结论

该需求不是普通的“模型调用日志”，而是面向超级管理员的 AI 成本治理页面。成熟产品通常把它拆成四层：总览、趋势、维度拆分、单次调用明细，并把“实际消费”和“预算/额度”分开表达。

天马应采用以下产品口径：

- 调用完成后，以供应商返回或最终结算得到的实际 Token、智擎币和费用为账单依据；
- 任务开始前的费用估算只负责提醒和额度检查，不能写入实际账单；
- 总览可按部门、用户、模式、智能体和模型下钻；
- 月度额度是超级管理员设置的治理值，由现有任务前预估能力执行提醒或拦截；
- 页面默认看本月，同时允许切换历史月份和导出明细；
- 普通用户不显示入口，也不能通过直接地址或请求取得数据。

## 二、可直接访问的参考页面

| 产品/页面 | 访问情况 | 可以重点参考 | 不应直接照搬 |
|---|---|---|---|
| [OpenAI API Usage Dashboard 说明](https://help.openai.com/en/articles/10478918-api-usage-dashboard) | 无需登录，可看页面说明；实际控制台需登录 | 时间范围、组织/项目过滤、用量与成本入口、管理权限 | OpenAI 以项目为主，天马还需部门、用户、模式和智能体 |
| [OpenAI 月度用量明细导出](https://help.openai.com/en/articles/20001072-how-do-i-export-monthly-usage-details-from-the-api-usage-dashboard) | 无需登录，含界面截图 | 月份选择、Usage/Cost 两类导出、月度对账 | 不能把导出当成页面明细的替代品 |
| [OpenAI 项目额度设置](https://help.openai.com/en/articles/9186755-managing-your-work) | 无需登录，含 Limits 页面截图 | 月度额度、通知阈值、权限限制 | OpenAI 的额度是软阈值，超过后仍继续调用；天马已有调用前拦截逻辑，不能照搬 |
| [Langfuse Token 与成本跟踪](https://langfuse.com/docs/observability/features/token-and-cost-tracking) | 无需登录，含交互示例和界面入口 | 按模型、用户、场景统计；输入/输出/缓存 Token 拆分；供应商成本优先 | 自动推算只能作为补充，不能覆盖供应商实际结算 |
| [Langfuse 自定义看板](https://langfuse.com/docs/metrics/features/custom-dashboards) | 无需登录，含看板截图 | 成本、用量、延迟、用户维度组合和筛选 | 天马本期账单页不需要开放自助搭建图表 |
| [AWS Budgets 页面](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-view.html) | 无需登录，含页面结构说明 | 实际值、预算值、完成比例、告警状态和历史记录并列展示 | 天马当前不做复杂预算层级和预测模型 |

## 三、竞品共性

### 1. 实际消费与推算费用分开

Langfuse允许同时接收模型返回的用量/成本和自行推算成本，并明确规定：当两者同时存在时，以传入的实际数据优先。[^1] 这与天马的产品口径一致：供应商结算是账单事实，模型价格表推算只能在缺失时形成“待核对”数据，不能伪装成正式结算。

### 2. 管理权限独立控制

OpenAI Usage Dashboard 只对组织 Owner 或获得 Usage Dashboard 权限的人开放。[^2] 天马当前角色更简单，因此直接限定为超级管理员最清楚，不新增部门管理员。

### 3. 预算不等于硬拦截

OpenAI 项目 Monthly spend limit 是软阈值，超过后请求仍继续处理。[^3] AWS Budgets 同样强调预算、实际值、预测值与告警状态。[^4] 天马与它们的差别是：已有任务开始前费用估算和额度不足处理，因此本需求只负责设置额度与展示实际消耗，拦截仍走原链路。

### 4. 下钻维度必须来自稳定标识

Langfuse 的用户成本分析依赖每次调用携带稳定 `userId`，并可继续按模型、会话、标签和功能拆分。[^5] 天马的部门、模式和智能体也必须在调用发生时写入稳定标识，不能事后仅按名称拼接，否则改名会造成历史账单错分。

## 四、建议页面结构

### 1. 顶部条件

- 月份：默认本月，可切换历史月份；
- 部门、用户、使用模式、智能体、模型；
- 查询和导出。

### 2. 总览

- 本月已消费费用；
- 本月额度；
- 剩余额度；
- 消耗进度；
- 实际 Token；
- 结算异常数量。

额度未设置时显示“未设置”，不显示 0，避免误解为禁止使用。

### 3. 趋势与分布

- 每日消费趋势；
- 输入、输出及其他 Token 构成；
- 部门、用户、模式、智能体和模型排行；
- 点击任一维度后，下方明细自动带入该筛选条件。

### 4. 调用明细

每一行至少说明：发生时间、用户、部门、模式、智能体、模型、任务结果、实际 Token、实际费用、结算状态。失败但已经产生供应商费用的调用仍要记录。

### 5. 月度额度设置

超级管理员选择月份并设置总额度。修改只影响所选月份，不追溯修改历史实际消费。若额度低于当月已消费，保存时明确提醒“当前已超额”，但允许保存，以便管理员收紧当月后续使用。

## 五、关键状态与边界

| 场景 | 产品处理 |
|---|---|
| 供应商未返回结算 | 标记“结算中”或“结算异常”，不能填 0 |
| 只有价格表推算 | 标记“估算值”，不纳入正式对账总额或单独展示 |
| 调用失败但产生费用 | 记录费用，任务结果显示失败 |
| 额度未设置 | 正常使用，页面显示未设置 |
| 设置额度低于已消费 | 允许保存并显示已超额；后续任务按现有规则检查 |
| 用户或部门改名 | 历史按稳定 ID 归属，并展示当时名称或可追溯名称 |
| 普通用户访问 | 无入口，直接访问返回无权限 |

## 六、对 V1.1.0 的决策

1. 采用“总览—维度排行—调用明细”的三级结构。
2. 将实际结算与预计费用明确分开。
3. 月度额度作为治理配置，不另造第二套费用预估逻辑。
4. 下钻维度固定为部门、用户、模式、智能体和模型。
5. 超级管理员专属，暂不增加部门管理员。

## Sources

[^1]: Langfuse, [Model Usage & Cost Tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking)，访问于 2026-09-14。
[^2]: OpenAI, [Reviewing API usage and costs](https://help.openai.com/en/articles/10478918-api-usage-dashboard)，访问于 2026-09-14。
[^3]: OpenAI, [Managing projects in the API platform](https://help.openai.com/en/articles/9186755-managing-your-work)，访问于 2026-09-14。
[^4]: AWS, [Viewing your budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-view.html)，访问于 2026-09-14。
[^5]: Langfuse, [User Tracking](https://langfuse.com/docs/observability/features/users)，访问于 2026-09-14。
