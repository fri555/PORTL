# 详细工作流步骤

## Module 0 — 环境准备与钉钉登录（详细步骤）

### 0.1 启动沙箱

- 所有 `dws` 命令必须在沙箱（Linux x86_64）内执行；沙箱未启动时先启动沙箱
- 后续 0.2～0.4 及 Module A/B/C 的全部命令均在沙箱内执行

---

### 0.2 一键初始化（setup.sh，幂等）

**工具调用**:
```bash
bash scripts/setup.sh
```

脚本把「检查/安装 dws → 配置 File-DEK 认证 → 检查登录态（未登录自动发起设备流登录）」合并为一条命令，幂等可重跑：已安装不重装、env 已存在不覆盖、已登录不再发起登录。内部详细行为见下方「setup.sh 内部步骤详解（排查/手动兑底用）」。

**输出字段**:
- `LOGIN_STATUS` — `authenticated`（已登录）或 `need_login`（未登录）
- `DWS_BIN` — 实际定位到的 dws 二进制路径
- `AUTH_ENV_FILE` — File-DEK 认证配置文件路径（后续所有 dws 命令的 source 入口）
- `LOGIN_STATUS=need_login` 时，自动透传 login.sh 全部输出（`LOGIN_URL` / `USER_CODE` / `LOGIN_PID` / `KEYCHAIN_DIR` 等，字段含义见下方详解），拿到 `LOGIN_URL` 即进入 0.3
- 已登录时额外打印统一命令前缀提示

**分支处理**:
- `LOGIN_STATUS=authenticated` → 直接进入 Module A，**登录过不再重复登录**
- `LOGIN_STATUS=need_login` → 拿到透传的 `LOGIN_URL`，进入 0.3
- 脚本提示安装失败 → 按下方「检查/安装 dws」节的失败处理排查后重跑

**统一命令模式**：后续所有 `dws` 命令（含本文档各处简写示例）实际执行时均须先 source 认证配置，PATH 不在时一并导出：
```bash
source ~/workspace/ding_dws/dws_auth.env && export PATH="$HOME/workspace/ding_dws/dws-linux:$HOME/.local/bin:$PATH" && dws <命令> --format json
```

不 source 直接执行会读不到登录态、误报「未登录」，禁止。

---

### 0.3 返回登录链接给用户并结束本轮

把脚本输出的 `LOGIN_URL`（已自动携带授权码）与 `USER_CODE` 按以下固定模板发给用户（`USER_CODE` 为空时省略第二步的授权码确认描述）：

```markdown
🔐 请完成钉钉授权（15 分钟内有效）

第一步：在浏览器中打开以下链接（或直接在钉钉内打开）：

{LOGIN_URL}

第二步：确认授权码 {USER_CODE}，登录您的钉钉账号并点击同意授权。

第三步：完成授权后回复「已登录」，我将自动继续执行。
```

发送后**立即结束本轮回复**，把控制权交还给用户，等待用户下一条消息。

**注意**:
- 必须按上述固定模板发送，链接以可点击形式直接发给用户，禁止只留在命令输出/日志里
- `LOGIN_URL` 与 `USER_CODE` 只能来自脚本实际返回，禁止编造；15 分钟有效期为固定提示文案，不随实际过期时间变化
- **禁止循环等待**：不得轮询 `dws auth status`、不得反复重发链接、不得在前台死等 `auth login` 命令结束；授权是否完成只能由用户的下一条消息驱动

---

### 0.4 确认登录成功

收到用户回复「已登录」（或等价确认）后，复核登录态：

**工具调用**（带统一前缀）:
```bash
source ~/workspace/ding_dws/dws_auth.env && dws auth status --format json
```

- 认证通过 → 进入 Module A
- 仍未认证/登录超时 → 重新执行 `bash scripts/login.sh`（或 `bash scripts/setup.sh`）生成新链接（user_code 有有效期，不要在旧链接上死等），再次交给用户并结束本轮
- 用户表示链接打不开/过期 → 直接重新执行 `bash scripts/login.sh` 生成新链接

> 注：后续 Module A/B/C 中的 `dws` 命令均为简写，实际执行时一律带上 `source ~/workspace/ding_dws/dws_auth.env && ` 前缀（见 0.2 统一命令模式）。

---

## setup.sh 内部步骤详解（排查/手动兑底用）

以下为 setup.sh 内部逐步行为，正常情况下无需手动执行；仅在排查问题或单独使用子脚本时参考。

### 检查/安装 dws（内部调用 scripts/install.sh）

**检查（先检查，未安装才装，禁止重复安装）**: 依次检查，任一存在即视为已安装：
```bash
command -v dws || ls "$HOME/workspace/ding_dws/dws-linux/dws" || ls "$HOME/.local/bin/dws"
```
（默认安装路径为 `~/workspace/ding_dws/dws-linux/`，最后一项为旧版兼容路径；均不存在时 setup.sh 自动调用 install.sh，也可手动执行 `bash scripts/install.sh`）

**本地安装包优先**：install.sh 会先查找 `~/workspace/ding_dws/`（可用 `DWS_LOCAL_DIR` 指定）下已存在的安装文件，存在则直接使用、不再联网：
- `dws-linux-amd64.tar.gz` — 二进制包
- `dws-skills.zip` — 技能包（mono）
- `checksums.txt` — SHA256 校验文件（本地缺失时会尝试从 OSS 下载，均不可得则跳过校验）

沙箱内可提前把上述文件放入该目录实现离线安装；三个文件均无时才从 OSS（公网地址）下载，下载带超时保护、失败自动重试（默认 3 次，`DWS_DOWNLOAD_RETRIES` 可调）。

**PATH 处理**（安装后 `dws` 不在 PATH 时，setup.sh 会在当前进程内自动导出；手动执行命令时）:

方案 A（推荐，同一命令内导出）——后续每条 `dws` 命令都采用此模式：
```bash
export PATH="$HOME/workspace/ding_dws/dws-linux:$HOME/.local/bin:$PATH" && dws auth status --format json
```

方案 B（完整路径）——直接使用绝对路径调用：
```bash
$HOME/workspace/ding_dws/dws-linux/dws auth status --format json
```

可选：持久化到 rc 文件，后续新 shell 无需重复导出（install.sh 安装后也会自动写入）：
```bash
echo 'export PATH="$HOME/workspace/ding_dws/dws-linux:$HOME/.local/bin:$PATH"' >> ~/.bashrc && export PATH="$HOME/workspace/ding_dws/dws-linux:$HOME/.local/bin:$PATH"
```

**失败处理**:
- 下载失败（重试后仍失败）→ 检查沙箱网络后重跑 setup.sh
- `command -v dws` 无输出但 `$HOME/workspace/ding_dws/dws-linux/dws`（或旧版 `$HOME/.local/bin/dws`）存在 → 只是不在 PATH，按上述方案 A/B 处理，**禁止误判为安装失败而重装**
- 安装目录非默认（设过 `DWS_INSTALL_DIR`）→ 用实际安装目录替换上述路径

### 配置 File-DEK 认证（内部自动完成）

**File-DEK 模式**：dws 认证不落系统 Keychain（沙箱内不可用），改由文件承载——认证配置入口为 `~/workspace/ding_dws/dws_auth.env`，登录态（加密 token）自动从 `DWS_KEYCHAIN_DIR` 指向的目录读取/写入。

setup.sh / login.sh 首次运行时会自动生成该文件；已存在则直接复用，禁止重复创建覆盖已有配置。手动创建方式：
```bash
mkdir -p ~/workspace/ding_dws && cat > ~/workspace/ding_dws/dws_auth.env <<'EOF'
export DWS_DISABLE_KEYCHAIN=1
export DWS_KEYCHAIN_DIR=~/workspace/ding_dws
EOF
```

**dws_auth.env 内容说明**:
- `DWS_DISABLE_KEYCHAIN=1` — 禁用系统 Keychain，启用 file-DEK 后端
- `DWS_KEYCHAIN_DIR=~/workspace/ding_dws` — file-DEK 认证存储目录，登录后 token 加密写入，后续命令自动读取

### 设备流登录（内部调用 scripts/login.sh，也可单独执行）

沙箱为无浏览器无头环境，禁止使用默认 OAuth Loopback 流（回调会跳到沙箱内不可达的 127.0.0.1），必须使用设备流。

**关键**：`dws auth login --device` 在等待用户扫码授权期间会一直阻塞，直接在前台执行会导致调用方一直「执行中」，授权链接迟迟拿不到。因此**禁止直接前台执行该命令**，必须通过 `scripts/login.sh` 发起（setup.sh 未登录时也会自动调用它）：

- 自动确保 `dws_auth.env` 存在（不存在则生成 File-DEK 配置）并 source
- **登录态预检查**：发起登录前先查 `dws auth status`，已登录时输出 `ALREADY_LOGGED_IN=1` 并退出（强制重登录可设 `DWS_SKIP_STATUS_CHECK=1`）
- 自动终止上次残留的后台登录进程（旧 user_code 已过期时避免多进程并存写脏 token；先 TERM 后 KILL 兕底）
- 后台脱离终端（nohup + stdin/stdout/stderr 全重定向）以 File-DEK 模式运行登录命令，授权后 token 自动写入 `DWS_KEYCHAIN_DIR`
- 有界等待（默认 20 秒）日志中出现设备授权页链接（verify.htm / /oauth2/device，避免日志中其他 URL 干扰）后立即提取并返回
- 后台登录进程继续存活等待用户扫码，脚本本身立即退出，不阻塞

**工具调用**（单独使用时）:
```bash
bash scripts/login.sh
```

**输出字段**:
- `ALREADY_LOGGED_IN` — 1 表示已登录，无需登录（此时无其他字段，直接进入 Module A）
- `LOGIN_URL` — 登录链接，已自动把授权码拼接到 query（参数名 `user_code`，实测钉钉设备授权页 `https://login.dingtalk.com/oauth2/device/verify.htm` 支持该参数自动预填授权码，用户无需手动输入；可用 `DWS_CODE_PARAM` 覆盖）；脚本优先提取 verify.htm / `/oauth2/device/` 链接，取不到时打印原始日志并退出非零
- `LOGIN_URL_RAW` — 未拼接授权码的原始链接（仅当拼接后与原始不同时输出，排查用）
- `USER_CODE` — 验证码（可能为空，可展示给用户供人工核对）
- `LOGIN_PID` / `LOG_FILE` — 后台登录进程号与日志路径（排查用）
- `AUTH_ENV_FILE` / `KEYCHAIN_DIR` — File-DEK 认证配置文件路径与登录态存储目录（后续所有 dws 命令的 source 入口）

（若 dws 不在 PATH，脚本会自动回退到 `$HOME/workspace/ding_dws/dws-linux/dws`，其次 `$HOME/.local/bin/dws`，无需额外处理）

**失败处理**:
- 脚本提示「未取到登录链接」→ 查看其打印的原始日志；确认沙箱网络可达后重试；仍失败可手动后台执行 `source ~/workspace/ding_dws/dws_auth.env && dws auth login --device > ~/workspace/ding_dws/log/dws-login.log 2>&1 &`，稍后从日志文件提取链接

---

## Module A — 消息获取（详细步骤）

### A1. 确认范围与时间窗口

**与用户确认**: 目标群名、时间范围（默认过去 24 小时，UTC+8）、关注主题（可选）

**用户意图解析**:
- "今天" → 当天 00:00 到现在
- "本周" → 本周一 00:00 到现在
- "最近 3 天" → 3 天前到现在
- "{date1} ~ {date2}" → 解析为 ISO-8601

---

### A2. 搜索群聊

**工具调用**: `dws chat search --query "<群名>" --format json`

**返回示例**:
```json
{
  "result": {
    "value": [
      {
        "openConversationId": "cid_xxxxx",
        "title": "项目攻坚群",
        "memberCount": 12
      }
    ]
  },
  "success": true
}
```

**提取**: `result.value[].openConversationId` 用于后续消息拉取

**失败处理**:
- 无结果 → 提示用户确认群名，或尝试群 ID/链接
- 多个结果 → 列出让用户选择

---

### A3. 拉取群聊消息

**工具调用**: `dws chat message list --group <openConversationId> --time "<yyyy-MM-dd HH:mm:ss>" --format json`

**时间格式**: `yyyy-MM-dd HH:mm:ss`（如 `2026-03-19 09:00:00`）

**返回示例**:
```json
{
  "result": {
    "messages": [
      {
        "content": "我们决定采用方案 A",
        "sender": "015683gthw",
        "createTime": "2026-03-20 14:30:00"
      }
    ],
    "hasMore": true,
    "nextCursor": 1234567890
  },
  "success": true
}
```

**分页处理**: 若 `hasMore=true`，使用边界 `createTime` 作为下次 `--time` 参数继续拉取

**sender 字段说明**: `sender` 可能返回 userId/staffId 而非姓名，统一经 A4 补全为姓名后再进入 Module B 分析

**整理群聊信息**（用于写入钉钉文档）:
```markdown
## 群聊信息
- 群名：{群名}
- 群 ID：{openConversationId}
- 统计范围：{start_date} {start_time} ~ {end_date} {end_time} (UTC+8)
- 消息总数：{msg_count} 条
- 参与人数：{user_count} 人
```

---

### A4. 补全人员（可选）

**工具调用**: `dws contact user get --ids "<userId1>,<userId2>,..." --format json`

**输入**: 消息中收集到的 userId 集合（`sender` 字段可能返回 userId/staffId 而非姓名）

**提取**: userId → 姓名映射，用于 Module B 标注发言人真实姓名

**失败处理**:
- 批量查询部分失败 → 分批重试，仍失败的用户以 userId 原样展示并注明未补全

---

### A5. 补充上下文（可选）

**工具调用**: `dws doc search --query "<项目名>" --format json`

当消息中涉及项目背景、历史决策时，检索关联文档补充上下文。

---

## Module B — 结构化提取（详细步骤）

### B1. 消息预处理（去噪与分段）

**去噪规则**:
1. **纯表情/贴纸**: 标记但不纳入主分析
2. **系统消息**: 入群/退群/群名变更 → 单独记录或忽略
3. **重复消息**: 去重，保留首次
4. **纯闲聊**: 问候/感谢/无实质内容 → 降权处理

**消息分段**:
1. **时间间隔**: >30 分钟无消息 → 自动切分
2. **话题切换**: 语义相似度低 → 辅助分段
3. **每段标注**: 起止时间、参与人、主题标签

**整理消息分段**（用于写入钉钉文档）:
```markdown
## 消息分段

### 段落 1：{主题标签}
- 时间：{seg_start_time} ~ {seg_end_time}
- 参与人：{participant_list}
- 消息数：{seg_msg_count} 条
- 核心内容摘要：{segment_summary}
```

---

### B2. 核心议题识别

**识别方法**:
1. 从讨论段落中提取主要话题（3-7 个）
2. 按讨论热度排序（消息数、参与人数）
3. 合并高度重叠的子话题

**整理核心议题**（用于写入钉钉文档）:
```markdown
## 核心议题

| 序号 | 议题 | 热度 | 时间段 | 参与人 |
|------|------|------|--------|--------|
| 1 | {议题名称} | {高/中/低} | {time_range} | {participant_list} |
```

---

### B3. 关键决策提取

**识别信号词**:
- "决定..."、"确认..."、"就这样定了"、"同意"、"通过"
- "拍板"、"OK 就这样"、"没问题"
- 投票结果
- 领导/关键人明确表态

**整理关键决策**（用于写入钉钉文档）:
```markdown
## 关键决策

### 决策 1：{决策内容}
- **决策时间**: {decision_time}
- **决策人**: {decision_maker}
- **参与人**: {participant_list}
- **背景**: {decision_context}
- **原始消息**: "{quoted_message}"
```

---

### B4. 行动项提取

**识别信号词**:
- "@{人名} 你来负责..."、"{人名} 跟进一下"
- "我来做..."、"我负责..."
- 截止时间提及："周五前"、"明天"、"{date}"

**整理行动项**（用于写入钉钉文档）:
```markdown
## 行动项

| 任务 | 负责人 | 截止时间 | 状态 | 原始消息 |
|------|--------|---------|------|---------|
| {task_description} | {owner} | {due_date} | {status} | "{quoted_message}" |
```

**注意**: 未明确负责人 → 填写"待分配"，列入"待跟进"

---

### B5. 风险与问题提取

**识别信号词**:
- "问题是..."、"风险在于..."、"卡住了"、"阻塞"
- "谁能帮忙..."、"这个怎么解决"
- 依赖未就绪、资源不足等表述

**整理风险与问题**（用于写入钉钉文档）:
```markdown
## 风险与问题

### 问题 1：{问题描述}
- **严重程度**: {高/中/低}
- **提出人**: {reporter}
- **提出时间**: {report_time}
- **状态**: {待解决/已解决}
- **解决方案**: {solution}（如有）
- **原始消息**: "{quoted_message}"
```

---

### B6. 重要链接与资源

**提取类型**:
- 钉钉文档链接
- GitHub / GitLab 链接
- 外部链接（文章/工具）
- 文件附件

**工具调用**（可选）: 对钉钉文档链接使用 `dws doc info --node <文档ID或URL> --format json` 或 `dws doc search --keyword "<文档标题关键词>" --format json` 获取标题摘要。

**整理重要链接**（用于写入钉钉文档）:
```markdown
## 重要链接

| 资源 | 类型 | 分享人 | 时间 | 关联议题 |
|------|------|--------|------|---------|
| {resource_name} | {钉钉文档/GitHub/外部链接} | {sharer} | {share_time} | {related_topic} |
```

---

## Module C — 文档生成（详细步骤）

### C1. 结构化提取完整性检查

**Checklist**:
- [ ] 群聊信息（群名、时间范围、消息数、参与人数）
- [ ] 消息分段（每段含主题、时间、参与人、摘要）
- [ ] 核心议题表
- [ ] 关键决策（含决策人、时间、原始消息）
- [ ] 行动项（含负责人、截止时间、状态）
- [ ] 风险与问题
- [ ] 重要链接

**缺失处理**: 退回 Module B 补充提取

---

### C2. 创建钉钉云文档

**工具调用**: `dws doc create --name "群聊摘要：{群名}（{时间范围}）" --format json`

**返回示例**:
```json
{
  "createTime": 1774187628000,
  "docUrl": "https://alidocs.dingtalk.com/i/nodes/xxxxxxx",
  "folderId": "gpG2NdyVXQyZ0OmoSBZ2jq5mJMwvDqPk",
  "nodeId": "xxxxxx",
  "name": "群聊摘要：C1 人事商业化共创组（3 月 16-21 日）",
  "success": true
}
```

**提取**: `nodeId` 用于后续更新，`docUrl` 作为最终交付物

**失败处理**:
- 认证失效 → 回到 Module 0，重新执行 `bash scripts/login.sh`，把新的登录链接发给用户扫码后结束本轮，等用户确认后继续
- 权限不足 → 提示用户检查文档创建权限

---

### C3. 分块写入摘要内容

**工具调用**: 按文档模板顺序分块写入，每块 ≤1500 字符：

```
dws doc update --node <nodeId> --mode append --markdown "<TL;DR 部分>" --format json
dws doc update --node <nodeId> --mode append --markdown "<核心议题部分>" --format json
dws doc update --node <nodeId> --mode append --markdown "<关键决策部分>" --format json
dws doc update --node <nodeId> --mode append --markdown "<行动项部分>" --format json
dws doc update --node <nodeId> --mode append --markdown "<风险与问题部分>" --format json
dws doc update --node <nodeId> --mode append --markdown "<待跟进部分>" --format json
```

**参数说明**:
- `--node`: 上一步创建的文档 nodeId
- `--mode append`: 追加模式，每次调用在文档末尾追加内容
- `--markdown`: 单块 Markdown 内容，禁止以 `#` 开头，换行用真实换行符

**注意事项**:
- 禁止使用 `--mode overwrite`，避免意外清空已写入内容
- 每块内容必须 ≤1500 字符
- Markdown 中禁止使用 ASCII Art 架构图

---

### C4. 返回文档链接

将 `dws doc create` 返回的 `docUrl` 以可点击链接输出给用户，同时附上摘要概览（议题数、决策数、行动项数、风险数）。

---

## 质量检查项

### 主 Agent 检查项

- [ ] 沙箱已启动，`bash scripts/setup.sh` 已执行（安装/配置/登录态一条命令完成）
- [ ] File-DEK 认证已配置（`~/workspace/ding_dws/dws_auth.env` 存在，后续命令均带 source 前缀）
- [ ] 登录态已确认（setup.sh 输出 `LOGIN_STATUS=authenticated`；或 need_login 时已把 LOGIN_URL 发给用户并结束本轮等待，用户回复后复核通过）
- [ ] 群聊标识正确（已通过 dws chat search 验证）
- [ ] 时间范围已明确标注（含时区 UTC+8）
- [ ] 消息已预处理（去噪、分段）
- [ ] 核心议题已识别（3-7 个，按热度排序）
- [ ] 关键决策已提取（含决策人、时间、原始消息）
- [ ] 行动项已提取（含 Owner/Due，无 Owner 标注"待分配"）
- [ ] 风险与问题已识别（含严重程度）
- [ ] 重要链接已整理（含类型、分享人）
- [ ] 结构化提取所有章节完整
- [ ] 无编造数据，所有信息可溯源
- [ ] 文档创建成功（nodeId 有效）
- [ ] 文档内容写入成功（Markdown 格式正确）
- [ ] 文档链接可访问
