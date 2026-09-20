#!/bin/sh
# ============================================================================
# dws 环境一键初始化（幂等）
#
# 作用：把 Module 0 的「检查/安装 dws → 配置 File-DEK 认证 → 检查登录态」
#       合并为一条命令，减少串行工具调用：
#   1. 检查 dws 是否已安装（PATH / ~/workspace/ding_dws/dws-linux / ~/.local/bin），
#      未安装时调用同目录 install.sh（其自带已装跳过 + 本地包优先逻辑）
#   2. 确保 File-DEK 认证配置文件存在（默认 ~/workspace/ding_dws/dws_auth.env，
#      不存在则自动生成：内含 DWS_DISABLE_KEYCHAIN=1 与 DWS_KEYCHAIN_DIR 指向同目录）
#   3. 检查登录态（dws auth status）：
#      - 已登录   → 输出 LOGIN_STATUS=authenticated 及统一命令前缀后退出
#      - 未登录   → 输出 LOGIN_STATUS=need_login，并自动调用同目录 login.sh
#                  发起设备流登录，透传其全部输出（LOGIN_URL / USER_CODE 等）
#
# 幂等性：已安装不重装、env 已存在不覆盖、已登录不再发起登录，
#         重跑安全（login.sh 自身会清理旧登录进程）。
#
# 用法：
#   sh scripts/setup.sh
#
# 可选环境变量（透传给内部 install.sh / login.sh）：
#   DWS_AUTH_ENV           — 认证配置路径，默认 ~/workspace/ding_dws/dws_auth.env
#   DWS_INSTALL_DIR / DWS_LOCAL_DIR / DWS_FORCE / DWS_NO_SKILLS 等 — 见 install.sh 头部
#   DWS_WAIT_SECS / DWS_LOGIN_LOG / DWS_CODE_PARAM 等 — 见 login.sh 头部
# ============================================================================
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DING_DWS_HOME="$HOME/workspace/ding_dws"
AUTH_ENV="${DWS_AUTH_ENV:-$DING_DWS_HOME/dws_auth.env}"

# ── 步骤1：检查/安装 dws ─────────────────────────────────────────────────────
find_dws() {
  _p="$(command -v dws 2>/dev/null || true)"
  [ -n "$_p" ] && { printf '%s\n' "$_p"; return 0; }
  [ -x "$DING_DWS_HOME/dws-linux/dws" ] && { printf '%s\n' "$DING_DWS_HOME/dws-linux/dws"; return 0; }
  [ -x "$HOME/.local/bin/dws" ] && { printf '%s\n' "$HOME/.local/bin/dws"; return 0; }
  return 1
}

DWS_BIN="$(find_dws || true)"
if [ -z "$DWS_BIN" ]; then
  printf '📦 未检测到 dws，开始安装（优先本地安装包，无则从 OSS 下载）...\n'
  sh "$SCRIPT_DIR/install.sh" || {
    printf '❌ dws 安装失败，请查看上方 install.sh 输出排查后重跑本脚本\n' >&2
    exit 1
  }
  DWS_BIN="$(find_dws || true)"
  [ -n "$DWS_BIN" ] || {
    printf '❌ install.sh 执行完成但未找到 dws 二进制，请手动检查安装目录\n' >&2
    exit 1
  }
  printf '✅ dws 安装完成：%s\n' "$DWS_BIN"
else
  printf '✅ dws 已安装：%s\n' "$DWS_BIN"
fi

# dws 不在 PATH 时导出其所在目录，保证后续 login.sh（command -v）与业务命令可用
if ! command -v dws >/dev/null 2>&1; then
  PATH="$(dirname "$DWS_BIN"):$PATH"
  export PATH
  printf 'ℹ️  dws 不在 PATH，已在当前进程导出：%s\n' "$(dirname "$DWS_BIN")"
fi

# ── 步骤2：确保 File-DEK 认证配置存在 ────────────────────────────────────────
if [ ! -f "$AUTH_ENV" ]; then
  _kc_dir="$(dirname "$AUTH_ENV")"
  mkdir -p "$_kc_dir" 2>/dev/null || {
    printf '❌ 无法创建 File-DEK 认证目录：%s\n' "$_kc_dir" >&2
    exit 1
  }
  {
    printf '# dws File-DEK 认证配置（由 setup.sh 自动生成）\n'
    printf '# 所有 dws 命令执行前先 source 本文件，登录态自动从 %s 读取\n' "$_kc_dir"
    printf 'export DWS_DISABLE_KEYCHAIN=1\n'
    printf 'export DWS_KEYCHAIN_DIR=%s\n' "$_kc_dir"
  } > "$AUTH_ENV" || {
    printf '❌ 无法写入 File-DEK 认证配置文件：%s\n' "$AUTH_ENV" >&2
    exit 1
  }
  printf '✅ 已生成 File-DEK 认证配置：%s\n' "$AUTH_ENV"
else
  printf '✅ File-DEK 认证配置就绪：%s\n' "$AUTH_ENV"
fi

# 读取认证配置；env 文件缺失关键变量时回退默认值（目录取 env 文件所在目录）
. "$AUTH_ENV"
: "${DWS_KEYCHAIN_DIR:=$(dirname "$AUTH_ENV")}"
: "${DWS_DISABLE_KEYCHAIN:=1}"
export DWS_KEYCHAIN_DIR DWS_DISABLE_KEYCHAIN

# ── 步骤3：检查登录态 ────────────────────────────────────────────────────────
# dws auth status --format json 实测返回 {"authenticated": true/false, ...}
if env DWS_DISABLE_KEYCHAIN="$DWS_DISABLE_KEYCHAIN" DWS_KEYCHAIN_DIR="$DWS_KEYCHAIN_DIR" \
  "$DWS_BIN" auth status --format json 2>/dev/null \
  | grep -q '"authenticated"[[:space:]]*:[[:space:]]*true'; then
  printf 'LOGIN_STATUS=authenticated\n'
  printf 'DWS_BIN=%s\n' "$DWS_BIN"
  printf 'AUTH_ENV_FILE=%s\n' "$AUTH_ENV"
  printf '✅ 已登录，可直接执行业务命令，统一前缀：\n'
  printf '   source %s && dws <命令> --format json\n' "$AUTH_ENV"
  exit 0
fi

printf 'LOGIN_STATUS=need_login\n'
printf 'DWS_BIN=%s\n' "$DWS_BIN"
printf 'AUTH_ENV_FILE=%s\n' "$AUTH_ENV"
printf '🔐 未登录，自动发起设备流登录...\n'
# exec 透传 login.sh 全部输出（LOGIN_URL / USER_CODE / LOGIN_PID 等）；
# login.sh 内部自带登录态预检查与旧进程清理，重跑安全
exec sh "$SCRIPT_DIR/login.sh"
