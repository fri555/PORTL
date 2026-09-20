#!/bin/sh
# ============================================================================
# dws 设备流登录辅助脚本
#
# 问题背景：dws auth login --device 在等待用户扫码授权期间会一直阻塞，
#           前台执行会导致调用方一直「执行中」，授权链接迟迟拿不到。
#
# 本脚本行为：
#   1. 确保 File-DEK 认证配置文件存在（默认 /home/user/workspace/ding_dws/dws_auth.env，
#      不存在则自动生成：内含 DWS_DISABLE_KEYCHAIN=1 与 DWS_KEYCHAIN_DIR 指向同目录）
#   2. 脱离终端（nohup + stdin/stdout/stderr 全重定向）后台发起设备流登录，
#      登录态自动写入/读取 DWS_KEYCHAIN_DIR（File-DEK 模式）
#   3. 有界等待（默认 20 秒）日志中出现登录链接后立即提取并输出
#   4. 输出 user_code 与登录链接后立即退出，不等授权完成
#      ——后台登录进程继续存活，等用户扫码后 token 自动写入 File-DEK 目录
#
# 用法：
#   sh scripts/login.sh
#
# 可选环境变量：
#   DWS_LOGIN_LOG — 登录输出日志路径，默认 ~/workspace/ding_dws/log/dws-login.log
#   DWS_WAIT_SECS — 等待链接出现的最长时间（秒），默认 20
#   DWS_CODE_PARAM — 拼接授权码到链接时使用的 query 参数名，默认 user_code
#                   （钉钉设备授权页 verify.htm 实测支持 user_code 自动预填）
#   DWS_AUTH_ENV  — File-DEK 认证配置文件路径，
#                   默认 ~/workspace/ding_dws/dws_auth.env
#   DWS_SKIP_STATUS_CHECK — 置 1 时跳过登录态预检查（强制走登录流程）
# ============================================================================
set -u

# 注意：双引号内的 ~ 不会展开，路径一律用 $HOME 拼接（等效于 ~/workspace/ding_dws）
DING_DWS_HOME="$HOME/workspace/ding_dws"
LOG="${DWS_LOGIN_LOG:-$DING_DWS_HOME/log/dws-login.log}"
WAIT_SECS="${DWS_WAIT_SECS:-20}"
CODE_PARAM="${DWS_CODE_PARAM:-user_code}"
AUTH_ENV="${DWS_AUTH_ENV:-$DING_DWS_HOME/dws_auth.env}"
# PID 文件跟随 AUTH_ENV 所在目录（而非固定 DING_DWS_HOME，便于自定义 DWS_AUTH_ENV 隔离测试）
PID_FILE="$(dirname "$AUTH_ENV")/log/dws-login.pid"

# ── 定位 dws 二进制 ─────────────────────────────────────────────────────────
if command -v dws >/dev/null 2>&1; then
  DWS="dws"
elif [ -x "$DING_DWS_HOME/dws-linux/dws" ]; then
  DWS="$DING_DWS_HOME/dws-linux/dws"
elif [ -x "$HOME/.local/bin/dws" ]; then
  DWS="$HOME/.local/bin/dws"
else
  printf '❌ 未找到 dws，请先执行: bash scripts/install.sh（默认安装到 ~/workspace/ding_dws/dws-linux）\n' >&2
  exit 1
fi

# ── File-DEK 认证配置 ─────────────────────────────────────────────────────
# dws_auth.env 为认证入口文件：所有 dws 命令执行前先 source 它，
# dws 即从 DWS_KEYCHAIN_DIR 指向的目录自动读取登录态（File-DEK 模式）。
# 文件不存在时自动生成，keychain 目录默认取 env 文件所在目录。
if [ ! -f "$AUTH_ENV" ]; then
  _kc_dir="$(dirname "$AUTH_ENV")"
  mkdir -p "$_kc_dir" 2>/dev/null || {
    printf '❌ 无法创建 File-DEK 认证目录：%s\n' "$_kc_dir" >&2
    exit 1
  }
  {
    printf '# dws File-DEK 认证配置（由 login.sh 自动生成）\n'
    printf '# 所有 dws 命令执行前先 source 本文件，登录态自动从 %s 读取\n' "$_kc_dir"
    printf 'export DWS_DISABLE_KEYCHAIN=1\n'
    printf 'export DWS_KEYCHAIN_DIR=%s\n' "$_kc_dir"
  } > "$AUTH_ENV" || {
    printf '❌ 无法写入 File-DEK 认证配置文件：%s\n' "$AUTH_ENV" >&2
    exit 1
  }
fi

# 读取认证配置；env 文件缺失关键变量时回退默认值（目录取 env 文件所在目录）
. "$AUTH_ENV"
: "${DWS_KEYCHAIN_DIR:=$(dirname "$AUTH_ENV")}"
: "${DWS_DISABLE_KEYCHAIN:=1}"
export DWS_KEYCHAIN_DIR DWS_DISABLE_KEYCHAIN

# ── 登录态预检查（防御性：已登录则无需重新登录） ──────────────────────
# dws auth status --format json 实测返回 {"authenticated": true/false, ...}
if [ "${DWS_SKIP_STATUS_CHECK:-0}" != "1" ]; then
  if env DWS_DISABLE_KEYCHAIN="$DWS_DISABLE_KEYCHAIN" DWS_KEYCHAIN_DIR="$DWS_KEYCHAIN_DIR" \
    "$DWS" auth status --format json 2>/dev/null \
    | grep -q '"authenticated"[[:space:]]*:[[:space:]]*true'; then
    printf 'ALREADY_LOGGED_IN=1\n'
    printf 'ℹ️  当前已登录（auth status authenticated=true），无需重新登录；如需强制重新登录请设 DWS_SKIP_STATUS_CHECK=1 后重跑\n'
    exit 0
  fi
fi

# ── 清理旧的后台登录进程（上次运行残留，避免多进程并存写脏 token） ────────
# 先 SIGTERM，1 秒后仍存活则 SIGKILL 兜底：
# macOS bash 3.2 下 sh 在前台 sleep 期间收到 SIGTERM 会延迟到 sleep 结束才退出，
# 仅靠 kill 无法可靠终止旧登录进程
if [ -f "$PID_FILE" ]; then
  _old_pid="$(cat "$PID_FILE" 2>/dev/null)"
  case "$_old_pid" in
    ''|*[!0-9]*) ;;
    *)
      if kill "$_old_pid" 2>/dev/null; then
        printf 'ℹ️ 已终止旧的后台登录进程（PID %s）\n' "$_old_pid"
        sleep 1
        kill -9 "$_old_pid" 2>/dev/null || true
      fi
      ;;
  esac
  rm -f "$PID_FILE"
fi

# ── 后台脱离终端发起设备流登录（File-DEK 模式，token 写入 DWS_KEYCHAIN_DIR） ─
mkdir -p "$(dirname "$LOG")" "$(dirname "$PID_FILE")" 2>/dev/null || true
rm -f "$LOG"
nohup env DWS_DISABLE_KEYCHAIN="$DWS_DISABLE_KEYCHAIN" DWS_KEYCHAIN_DIR="$DWS_KEYCHAIN_DIR" \
  "$DWS" auth login --device --format json </dev/null >"$LOG" 2>&1 &
LOGIN_PID=$!
printf '%s\n' "$LOGIN_PID" > "$PID_FILE" 2>/dev/null || true

# ── 有界等待：日志中出现设备授权页链接即提前结束（仅认 verify.htm / /oauth2/device 特征，避免日志中其他链接如 OSS 地址提前触发；提取阶段另有通用兑底） ────────────────────────────
_i=0
while [ "$_i" -lt "$WAIT_SECS" ]; do
  # 登录进程异常退出且无链接 → 直接失败
  if ! kill -0 "$LOGIN_PID" 2>/dev/null && ! grep -qE 'https?://' "$LOG" 2>/dev/null; then
    break
  fi
  grep -qE 'https?://[^"[:space:]]*(verify\.htm|/oauth2/device)' "$LOG" 2>/dev/null && break
  sleep 1
  _i=$((_i + 1))
done

# ── 提取链接与 user_code ────────────────────────────────────────────────────
# 适配 dws 真实输出（表格文本 + 自带完整链接）：
#   1) 优先取已带 user_code 参数的完整链接（dws 输出已含 verify.htm?user_code=XXX）
#   2) 其次取未带码的设备授权页链接（verify.htm / /oauth2/device/）
#   3) 兜底取首个 http(s) 链接；user_code 兼容 JSON 字段与「授权码: XXX」文本
_all_urls() { grep -oE 'https?://[^"[:space:]]+' "$LOG" 2>/dev/null | sed 's/[),.;!?)）】>，。；]\{1,\}$//'; }
URL_RAW="$(_all_urls | grep -E 'verify\.htm|/oauth2/device' | grep -E "[?&](user_code|userCode)=" | head -1)"
[ -n "$URL_RAW" ] || URL_RAW="$(_all_urls | grep -E 'verify\.htm|/oauth2/device' | head -1)"
[ -n "$URL_RAW" ] || URL_RAW="$(_all_urls | head -1)"
USER_CODE="$(grep -oE '"(user_code|userCode|verification_code)"[[:space:]]*:[[:space:]]*"[^"]+"' "$LOG" 2>/dev/null | head -1 | sed 's/.*:[[:space:]]*"//; s/"$//')"
[ -n "$USER_CODE" ] || USER_CODE="$(grep -oE '授权码[[:space:]]*[:：][[:space:]]*[A-Za-z0-9_-]+' "$LOG" 2>/dev/null | head -1 | sed 's/.*[:：][[:space:]]*//')"
URL="$URL_RAW"

# 把授权码自动拼接到链接上（钉钉设备授权页 verify.htm 支持 user_code 参数，
# 打开后自动预填授权码，无需手动输入）；URL 已含授权码时不重复拼接
if [ -n "$URL" ] && [ -n "$USER_CODE" ]; then
  case "$URL" in
    *"$USER_CODE"*) ;;
    *)
      case "$URL" in
        *\?*) URL="$URL&$CODE_PARAM=$USER_CODE" ;;
        *)    URL="$URL?$CODE_PARAM=$USER_CODE" ;;
      esac
      ;;
  esac
fi

if [ -z "$URL" ]; then
  printf '❌ %s 秒内未从 dws auth login 输出中获取到登录链接，原始输出如下：\n' "$WAIT_SECS"
  cat "$LOG" 2>/dev/null || printf '（日志为空：%s）\n' "$LOG"
  exit 1
fi

printf 'LOGIN_URL=%s\n' "$URL"
[ -n "$URL_RAW" ] && [ "$URL" != "$URL_RAW" ] && printf 'LOGIN_URL_RAW=%s\n' "$URL_RAW"
[ -n "$USER_CODE" ] && printf 'USER_CODE=%s\n' "$USER_CODE"
printf 'LOGIN_PID=%s\n' "$LOGIN_PID"
printf 'LOG_FILE=%s\n' "$LOG"
printf 'AUTH_ENV_FILE=%s\n' "$AUTH_ENV"
printf 'KEYCHAIN_DIR=%s\n' "$DWS_KEYCHAIN_DIR"
printf 'ℹ️  登录进程已在后台等待授权（PID %s），LOGIN_URL 已自动拼接授权码，直接发给用户即可；授权完成后 token 自动写入 File-DEK 目录（%s）；后续所有 dws 命令先 source %s 再执行\n' "$LOGIN_PID" "$DWS_KEYCHAIN_DIR" "$AUTH_ENV"
