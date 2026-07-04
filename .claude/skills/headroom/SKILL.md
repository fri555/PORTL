---
name: headroom
description: Token compression (headroom-ai proxy) and budget tracking (claude-headroom CLI) for Claude Code
---

# Headroom

本项目中同时使用了两个 headroom 工具来优化 Claude Code 的 token 使用:

## 1. headroom-ai (输入压缩代理) — 已配置 ✅

**用途**: 透明代理层，自动压缩工具输出、日志、代码文件和对话历史，节省 60-95% 输入 token。

**配置位置**: `.claude/settings.local.json`
- `ANTHROPIC_BASE_URL` → `http://127.0.0.1:8787` (headroom 本地代理)
- `SessionStart` + `PreToolUse` hooks 已注册

**用法**: 项目已自动配置，无需手动操作。所有 Claude Code API 请求自动经过 headroom 代理。

**逆向压缩 (CCR)**: 原始数据本地保留。如果模型需要完整的未压缩数据，可以通过 `headroom_retrieve` 按需取回。

## 2. claude-headroom (预算跟踪 CLI) — 已安装 ✅

**用途**: 读取 Anthropic Usage API，跟踪 API 用量预算，计算消耗速率，在阈值触发时预警或自动停止循环。

**安装路径**: `npm install -g claude-headroom`

> ⚠️ **前提**: claude-headroom 需要 Claude Code CLI 的 OAuth 凭证 (`~/.claude/.credentials.json`) 来调用 Anthropic Usage API。
> 当前运行在 VSCode 扩展环境中，若未安装 CLI，可通过以下方式之一启用：
> 1. 安装 Claude Code CLI: `npm install -g @anthropic-ai/claude-code` 并运行 `claude login`
> 2. 或手动创建 `~/.claude/.credentials.json`:
> ```json
> { "oauthToken": "<your-oauth-token>" }
> ```
> 无凭证时 `claude-headroom show`/`refresh` 命令不可用，但 hooks 和 watcher 配置已就绪。

### 常用命令

| 命令 | 说明 |
|---|---|
| `claude-headroom refresh` | 强制刷新 Anthropic API 用量缓存 |
| `claude-headroom show` | 显示最新用量快照 |
| `claude-headroom burn` | 显示各时间窗口的消耗速率及预计耗尽时间 |
| `claude-headroom statusline` | 输出状态栏单行文本（用于 statusLine 集成） |
| `claude-headroom hook pre-tool-use` | PreToolUse hook 集成 |
| `claude-headroom hook session-start` | SessionStart hook 集成 |
| `claude-headroom watchers` | 查看 watcher 规则与当前状态 |

### Watchers（预算看门狗）

Watchers 基于**桶 (bucket)** 机制，通过匹配用量百分比区间触发动作：

```json
{
  "watchers": [{
    "id": "session_tier",
    "startup": "low",
    "buckets": [
      { "id": "low",      "match": { "metric": "session.percent", "range": [0, 55] },
        "action": { "message": "✅ Session 已用 {session.consumed}% — 充裕" } },
      { "id": "mid",      "match": { "metric": "session.percent", "range": [55, 80] },
        "action": { "message": "⚠️ Session 已用 {session.consumed}% — 注意" } },
      { "id": "panic",    "match": { "metric": "session.percent", "range": [80, 100] },
        "action": { "stop": "🛑 Session 已用 {session.consumed}% — 停止" } }
    ]
  }, {
    "id": "weekly_tier",
    "startup": "low",
    "buckets": [
      { "id": "low",      "match": { "metric": "week.percent", "range": [0, 60] },
        "action": { "message": "📊 本周已用 {week.consumed}%" } },
      { "id": "panic",    "match": { "metric": "week.percent", "range": [80, 100] },
        "action": { "message": "🚨 本周已用 {week.consumed}% — 注意控制" } }
    ]
  }]
}
```

支持指标:
- `session.percent` / `session.remaining` / `session.resets_in`
- `week.percent` / `week.remaining` / `week_sonnet.*`
- `burn.<scope>.<window>.rate` / `.status` / `.eta`

### 配置分层

| 作用域 | 路径 |
|---|---|
| 全局 | `~/.claude/claude-headroom.json` |
| 项目共享 | `.claude/claude-headroom.json` |
| 项目本地 | `.claude/claude-headroom.local.json` |

项目本地 > 项目共享 > 全局 > 内置默认。

## 协作方式

- **headroom-ai** 在输入侧压缩 token（静默运行，无需干预）
- **claude-headroom** 在输出侧跟踪预算（通过 watcher 预警）

两者互补，共同覆盖 Claude Code token 管道的两端。
