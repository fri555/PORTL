---
name: dingtalk-dws
description: >
  Use when the user mentions 钉钉, DingTalk, or DWS, or requests any DingTalk-related operation.
  Bare mentions such as “钉钉” or “DWS” must also invoke this skill.
metadata:
  label: 钉钉 DWS 统一入口
---

# 钉钉 DWS 统一入口

## 核心规则

只要用户提到“钉钉”“DingTalk”或“DWS”，无论是否说明具体动作，都必须调用本技能。仅有裸关键词时，先进入本技能，再询问用户要办理什么；没有可执行意图前不启动登录或业务命令。

除以下三个精确场景外，所有钉钉相关操作默认使用 `dws`：

| 场景 | 使用方式 |
|---|---|
| 查询日程 | 平台已有“查询日程”专用工具，不使用 DWS |
| 创建日程 | 平台已有“创建日程”专用工具，不使用 DWS |
| 创建待办 | 平台已有“创建待办”专用工具，不使用 DWS |
| 其他所有钉钉或 DWS 请求 | 使用 DWS |

**查询待办必须使用 DWS。** 修改、完成、删除待办，以及修改、取消日程，也使用 DWS。一个请求包含多个动作时逐项路由，只为其中需要 DWS 的动作初始化 DWS。专用工具失败时不得自动改走 DWS。

## DWS 能力发现

DWS 能力不限于本技能列举的示例。以当前安装版本的帮助信息为唯一能力与参数依据：

```bash
dws --help
dws <domain> --help
dws <domain> <action> --help
```

用户提出任何未在本技能中列出的钉钉操作时，也应先通过帮助信息查找对应能力，不得因为文档没有枚举该场景就改用其他钉钉工具，也不得猜测命令或参数。

需要判断产品域、组合多个钉钉能力或设计执行链路时，先读取 [references/dws-capabilities.md](./references/dws-capabilities.md)，再用当前版本的 `--help` 核实具体命令。

## 执行要求

仅在动作被路由到 DWS 后执行：

1. 在 Linux x86_64 沙箱中运行 `bash scripts/setup.sh`。
2. 已登录则继续；未登录时把脚本实际返回的 `LOGIN_URL` 以可点击链接发给用户，然后结束本轮。
3. 用户回复“已登录”后，只复核一次登录状态，再继续原任务。
4. 每条 DWS 业务命令前加载 `~/workspace/ding_dws/dws_auth.env`，并携带 `--format json`；`--help` 命令除外。
5. 只使用用户提供或 DWS 实际返回的 ID，不编造标识符；不通过 `curl` 或自行拼装 HTTP API 绕过 DWS。
6. 名称存在多个结果时让用户选择；列表存在更多数据时完整翻页；403 时明确告知权限不足。

统一业务命令模式：

```bash
source ~/workspace/ding_dws/dws_auth.env && export PATH="$HOME/workspace/ding_dws/dws-linux:$HOME/.local/bin:$PATH" && dws <命令> --format json
```

## 专项参考

- DWS 产品域、命令规模和跨产品使用场景：[references/dws-capabilities.md](./references/dws-capabilities.md)
- 群聊摘要工作流：[references/workflow-detail.md](./references/workflow-detail.md)
- 群聊摘要文档模板：[references/doc-template.md](./references/doc-template.md)

仅在对应任务需要时读取参考文件。其他 DWS 能力不受群聊摘要参考文件限制。

## 路由示例

| 用户输入 | 结果 |
|---|---|
| “钉钉” / “DWS” | 调用本技能；询问具体需求，不立即执行业务命令 |
| “帮我用 DWS 处理一下” | 调用本技能；补充必要意图后使用 DWS |
| “查一下未完成待办”且上下文为钉钉 | 使用 DWS |
| “建一个待办”且上下文为钉钉 | 使用创建待办专用工具 |
| “读取钉钉里的某项数据” | 调用本技能，先用 `dws --help` 发现对应能力 |
