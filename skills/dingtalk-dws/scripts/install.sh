#!/bin/sh
# ============================================================================
# dws（钉钉工作空间 CLI）安装脚本
#
# 目标平台：Linux x86_64
# 安装模式：mono（单一 dws 技能包）
# 下载来源：阿里云 OSS 固定地址（见下方 OSS_BASE）
#
# 用法：
#   bash scripts/install.sh                  # 本地执行
#   bash <(curl -fsSL <本脚本的 OSS 地址>)     # 一键安装
#
# 可选环境变量：
#   DWS_OSS_BASE    — OSS 基础地址，默认使用下方写死的地址
#   DWS_INSTALL_DIR — 二进制安装目录，默认 ~/workspace/ding_dws/dws-linux
#   DWS_LOCAL_DIR   — 本地安装文件查找目录，默认取安装目录上级（~/workspace/ding_dws）；
#                     优先使用该目录下已存在的安装包（dws-linux-amd64.tar.gz /
#                     dws-skills.zip / checksums.txt），没有才从 OSS 下载
#   DWS_FORCE       — 置 1 时强制重装（默认已安装则跳过，退出码 0）
#   DWS_NO_SKILLS   — 置 1 时只安装二进制，跳过技能包
#   DWS_SKILLS_ONLY — 置 1 时只安装技能包，跳过二进制
#   DWS_DOWNLOAD_RETRIES — OSS 下载失败重试次数，默认 3（重试前自动清理半成品文件）
# ============================================================================

set -eu

# ── 固定配置 ────────────────────────────────────────────────────────────────
# ⚠️ OSS 地址：将 dws-linux-amd64.tar.gz、dws-skills.zip、checksums.txt
#    三个文件上传到同一 OSS 目录后，把下面地址改成你的实际地址（文件名不变）。
OSS_BASE="${DWS_OSS_BASE:-https://tm-resource-platform.oss-cn-shanghai-internal.aliyuncs.com/template/dingding/dws}"

BIN_ARCHIVE="dws-linux-amd64.tar.gz"   # 二进制包（Linux x86_64）
SKILLS_ARCHIVE="dws-skills.zip"        # 技能包（mono）
CHECKSUMS_FILE="checksums.txt"         # SHA256 校验文件
BIN_URL="${OSS_BASE}/${BIN_ARCHIVE}"
SKILLS_URL="${OSS_BASE}/${SKILLS_ARCHIVE}"
CHECKSUMS_URL="${OSS_BASE}/${CHECKSUMS_FILE}"

BIN_NAME="dws"
VERSION="v1.0.59"
INSTALL_DIR="${DWS_INSTALL_DIR:-$HOME/workspace/ding_dws/dws-linux}"
LOCAL_DIR="${DWS_LOCAL_DIR:-$(dirname "$INSTALL_DIR")}"
FORCE="${DWS_FORCE:-0}"
NO_SKILLS="${DWS_NO_SKILLS:-0}"
SKILLS_ONLY="${DWS_SKILLS_ONLY:-0}"
SKILL_NAME="dws"
SKILL_STATE_ROOT="${DWS_CONFIG_DIR:-$HOME/.dws}"
BACKUP_ROOT="$HOME/.dws/skill-backups"
BACKUP_KEEP=5

# ── 基础工具函数 ────────────────────────────────────────────────────────────

say() { printf '  %s\n' "$@"; }

err() { printf '  ❌ %s\n' "$@" >&2; exit 1; }

need_cmd() { command -v "$1" >/dev/null 2>&1; }

# 平台校验：仅支持 Linux x86_64
require_linux_amd64() {
  _os="$(uname -s)"
  _arch="$(uname -m)"
  case "$_os" in
    Linux*) ;;
    *) err "不支持的操作系统：$_os，本脚本仅支持 Linux x86_64" ;;
  esac
  case "$_arch" in
    x86_64|amd64) ;;
    *) err "不支持的 CPU 架构：$_arch，本脚本仅支持 Linux x86_64" ;;
  esac
}

# 下载文件到指定路径（优先 curl，其次 wget；均带超时，避免网络异常时长时间挂起）
# 失败自动重试（默认 3 次，可用 DWS_DOWNLOAD_RETRIES 调整），重试前清理残留的半成品文件
_fetch_file() {
  if need_cmd curl; then
    curl -fsSL --connect-timeout 10 --max-time 300 "$1" -o "$2"
  elif need_cmd wget; then
    wget -q -T 10 --timeout=300 -O "$2" "$1"
  else
    err "未找到 curl 或 wget，请先安装其中之一"
  fi
}

download() {
  _url="$1"; _dest="$2"; _retries="${DWS_DOWNLOAD_RETRIES:-3}"; _n=0
  while [ "$_n" -lt "$_retries" ]; do
    rm -f "$_dest"
    if _fetch_file "$_url" "$_dest"; then
      return 0
    fi
    _n=$((_n + 1))
    [ "$_n" -lt "$_retries" ] && say "⚠️ 下载失败（第 ${_n} 次），重试：${_url}"
  done
  return 1
}

# 检测 dws 是否已安装（PATH / 默认安装目录 / 旧版兼容目录）
dws_installed() {
  command -v "$BIN_NAME" >/dev/null 2>&1 && return 0
  [ -x "$INSTALL_DIR/$BIN_NAME" ] && return 0
  [ -x "$HOME/.local/bin/$BIN_NAME" ] && return 0
  return 1
}

# 获取安装文件：优先使用 LOCAL_DIR 下已存在的本地文件，没有再从 OSS 下载
fetch_archive() {
  _file="$1"; _dest="$2"; _url="$3"
  if [ -f "$LOCAL_DIR/$_file" ]; then
    cp "$LOCAL_DIR/$_file" "$_dest" || return 1
    say "📂 使用本地安装文件：$LOCAL_DIR/$_file"
    return 0
  fi
  download "$_url" "$_dest"
}

# 计算文件 SHA256（优先 sha256sum）
sha256_of() {
  if need_cmd sha256sum; then
    sha256sum "$1" | awk '{print $1}'
  elif need_cmd shasum; then
    shasum -a 256 "$1" | awk '{print $1}'
  elif need_cmd openssl; then
    openssl dgst -sha256 -r "$1" | awk '{print $1}'
  else
    return 1
  fi
}

# 用 checksums.txt 校验安装文件的完整性（校验文件本地优先，其次下载；
# 两者均不可得时跳过校验，仅适用于本地安装文件场景）
verify_checksum() {
  _file="$1"; _path="$2"; _dir="$3"
  if [ -f "$LOCAL_DIR/$CHECKSUMS_FILE" ]; then
    cp "$LOCAL_DIR/$CHECKSUMS_FILE" "$_dir/$CHECKSUMS_FILE"
  elif ! download "$CHECKSUMS_URL" "$_dir/$CHECKSUMS_FILE"; then
    say "⚠️ 无法获取 ${CHECKSUMS_FILE}（本地与远端均无），跳过 $_file 校验"
    return 0
  fi
  _expected="$(awk -v f="$_file" '$2 == f {print $1; exit}' "$_dir/$CHECKSUMS_FILE")"
  [ -n "$_expected" ] || err "校验文件中没有 $_file 的记录"
  _actual="$(sha256_of "$_path")" || err "无法计算 SHA256，请安装 sha256sum / openssl"
  [ "$_actual" = "$_expected" ] || err "SHA256 校验失败：$_file（期望 $_expected，实际 $_actual）"
  say "✅ SHA256 校验通过：$_file"
}

# 解压 zip 包（优先 unzip，其次 tar）
extract_zip() {
  _archive="$1"; _dest="$2"
  if need_cmd unzip; then
    unzip -q "$_archive" -d "$_dest"
    return 0
  fi
  if need_cmd tar && tar -xf "$_archive" -C "$_dest" >/dev/null 2>&1; then
    return 0
  fi
  err "解压失败，请先安装 unzip"
}

# 将目录备份到时间戳目录后再移除（安装前保护旧数据）
backup_and_remove_dir() {
  _dir="$1"
  [ -e "$_dir" ] || [ -L "$_dir" ] || return 0
  _stamp="$(date -u +%Y%m%d-%H%M%S)"
  _target="$BACKUP_ROOT/$_stamp/$(basename "$_dir")"
  mkdir -p "$(dirname "$_target")" || { say "⚠️ 无法创建备份目录，跳过 $_dir"; return 1; }
  if mv "$_dir" "$_target"; then
    say "  × 已备份并移除：$_dir → $_target"
    return 0
  fi
  say "⚠️ 备份失败，保留原目录：$_dir"
  return 1
}

# 清理旧备份，仅保留最近 BACKUP_KEEP 份
prune_backups() {
  _root="$BACKUP_ROOT"
  [ -d "$_root" ] || return 0
  _total=0
  for _b in "$_root"/*; do
    [ -d "$_b" ] || continue
    case "${_b##*/}" in
      [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9]*)
        _total=$((_total + 1)) ;;
    esac
  done
  _drop=$((_total - BACKUP_KEEP))
  for _b in "$_root"/*; do
    [ "$_drop" -gt 0 ] || break
    [ -d "$_b" ] || continue
    case "${_b##*/}" in
      [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9]*)
        if rm -rf "$_b"; then _drop=$((_drop - 1)); fi ;;
    esac
  done
}

# 把 PATH 导出语句写入已存在的 shell rc 文件（已包含则跳过，无 rc 文件时创建 ~/.bashrc）
ensure_path_in_rc() {
  _dir="$1"
  _line="export PATH=\"$_dir:\$PATH\""
  _found=0
  for _rc in "$HOME/.bashrc" "$HOME/.profile" "$HOME/.zshrc"; do
    [ -f "$_rc" ] || continue
    _found=1
    if ! grep -qsF "$_dir" "$_rc"; then
      printf '\n# added by dws installer\n%s\n' "$_line" >> "$_rc" && say "✅ 已将 PATH 写入 $_rc"
    fi
  done
  if [ "_found" = "0" ]; then
    printf '# added by dws installer\n%s\n' "$_line" >> "$HOME/.bashrc" && say "✅ 已创建 ~/.bashrc 并写入 PATH"
  fi
}

# ── 技能安装（mono 模式）────────────────────────────────────────────────────

# 常见 Agent 的技能目录（仅当 Agent 主目录已存在时才安装）
AGENT_SKILL_DIRS=".claude/skills .qoder/skills .qoder-cn/skills .codex/skills .cursor/skills .codebuddy/skills .trae/skills .trae-cn/skills .gemini/skills .windsurf/skills .copilot/skills .lingma/skills .augment/skills .roo/skills .cline/skills .kiro/skills .openhands/skills .qwen/skills"

# 把技能目录安装到目标位置（覆盖前先备份旧目录）
install_skill_to() {
  _src="$1"; _dest="$2"
  if [ -e "$_dest" ] || [ -L "$_dest" ]; then
    backup_and_remove_dir "$_dest" || { say "⚠️ 跳过（保留原目录）：$_dest"; return 1; }
  fi
  mkdir -p "$(dirname "$_dest")" || return 1
  if ! cp -R "$_src/." "$_dest/" 2>/dev/null && ! cp -r "$_src/." "$_dest/"; then
    say "⚠️ 复制失败：$_dest"
    return 1
  fi
  say "✅ 技能已安装 → $_dest"
}

install_skills() {
  say "📦 开始安装 dws 技能包（mono 模式）..."

  _tmp="$(mktemp -d)"
  trap 'rm -rf "$_tmp"' EXIT INT TERM

  fetch_archive "$SKILLS_ARCHIVE" "$_tmp/$SKILLS_ARCHIVE" "$SKILLS_URL" || err "技能包获取失败（本地 $LOCAL_DIR 与 $SKILLS_URL 均不可用）"
  verify_checksum "$SKILLS_ARCHIVE" "$_tmp/$SKILLS_ARCHIVE" "$_tmp"

  _extract="$_tmp/skills"
  mkdir -p "$_extract"
  extract_zip "$_tmp/$SKILLS_ARCHIVE" "$_extract"

  # 定位 mono 技能源目录：优先 mono/，其次 dws/，最后压缩包根目录
  _src="$_extract"
  if [ -f "$_extract/mono/SKILL.md" ]; then
    _src="$_extract/mono"
  elif [ -f "$_extract/dws/SKILL.md" ]; then
    _src="$_extract/dws"
  fi
  [ -f "$_src/SKILL.md" ] || err "技能包中未找到 SKILL.md"

  # 1) 统一安装位置
  install_skill_to "$_src" "$HOME/.agents/skills/$SKILL_NAME" || err "技能安装失败"

  # 2) 本机已检测到的 Agent 技能目录
  for _agent in $AGENT_SKILL_DIRS; do
    _base="$HOME/$_agent"
    [ -d "$(dirname "$_base")" ] || continue
    install_skill_to "$_src" "$_base/$SKILL_NAME" || true
  done

  # 3) 缓存到 ~/.dws/skills/mono，便于 dws skill setup 复用
  install_skill_to "$_src" "$SKILL_STATE_ROOT/skills/mono" || true

  # mono 模式下旧的 multi 状态已失效
  rm -f "$SKILL_STATE_ROOT/skills-state.json"

  rm -rf "$_tmp"
  say "✅ dws 技能安装完成（mono 模式）"
  say "   统一安装位置：~/.agents/skills/dws"
  say "ℹ️  请重启已打开的 Agent，使新技能生效"
}

# ── 二进制安装（Linux x86_64）───────────────────────────────────────────────

install_binary() {
  say "⬇  获取 dws 二进制（Linux x86_64，${VERSION}；优先本地安装文件，无则下载）..."

  _tmp="$(mktemp -d)"
  trap 'rm -rf "$_tmp"' EXIT INT TERM

  fetch_archive "$BIN_ARCHIVE" "$_tmp/$BIN_ARCHIVE" "$BIN_URL" || err "二进制获取失败（本地 $LOCAL_DIR 与 $BIN_URL 均不可用）"
  verify_checksum "$BIN_ARCHIVE" "$_tmp/$BIN_ARCHIVE" "$_tmp"

  say "📦 解压中..."
  tar xzf "$_tmp/$BIN_ARCHIVE" -C "$_tmp" || err "解压失败：$BIN_ARCHIVE"

  # 定位解压出的二进制（可能直接位于根目录，也可能在子目录中）
  _bin=""
  if [ -f "$_tmp/$BIN_NAME" ]; then
    _bin="$_tmp/$BIN_NAME"
  else
    _bin="$(find "$_tmp" -name "$BIN_NAME" -type f | head -1)"
  fi
  [ -n "$_bin" ] || err "压缩包中未找到 $BIN_NAME 可执行文件"

  mkdir -p "$INSTALL_DIR"
  cp "$_bin" "$INSTALL_DIR/$BIN_NAME"
  chmod +x "$INSTALL_DIR/$BIN_NAME"
  rm -rf "$_tmp"

  say "✅ 二进制已安装：$INSTALL_DIR/$BIN_NAME"

  case ":$PATH:" in
    *":$INSTALL_DIR:"*) ;;
    *)
      say ""
      say "⚠️  $INSTALL_DIR 不在 PATH 中"
      say "   当前会话请执行：export PATH=\"$INSTALL_DIR:\$PATH\""
      ensure_path_in_rc "$INSTALL_DIR"
      say "   新开 shell 将自动生效；当前会话仍需手动 export 或使用完整路径 $INSTALL_DIR/$BIN_NAME"
      ;;
  esac
}

# ── 主流程 ──────────────────────────────────────────────────────────────────

print_banner() {
  printf '\n'
  say "┌─────────────────────────────────────┐"
  say "│  dws 安装程序（mono / Linux x86_64） │"
  say "└─────────────────────────────────────┘"
  printf '\n'
}

main() {
  require_linux_amd64
  print_banner

  # 先检测是否已安装：已安装则跳过（DWS_FORCE=1 强制重装；DWS_SKILLS_ONLY=1 只装技能包不检测）
  if [ "$SKILLS_ONLY" != "1" ] && [ "$FORCE" != "1" ] && dws_installed; then
    say "✅ 检测到 dws 已安装，跳过安装（如需重装请设 DWS_FORCE=1 后重新执行）"
    if command -v "$BIN_NAME" >/dev/null 2>&1; then
      say "   安装位置：$(command -v "$BIN_NAME")"
    elif [ -x "$INSTALL_DIR/$BIN_NAME" ]; then
      say "   安装位置：${INSTALL_DIR}/${BIN_NAME}（不在 PATH，使用完整路径或 export PATH=\"$INSTALL_DIR:\$PATH\"）"
    else
      say "   安装位置：${HOME}/.local/bin/${BIN_NAME}（旧版路径，不在 PATH 时使用完整路径）"
    fi
    return 0
  fi
  if [ "$FORCE" = "1" ]; then
    say "⚠️ DWS_FORCE=1，强制重装（安装前会自动备份旧目录）"
  fi

  if [ "$SKILLS_ONLY" = "1" ]; then
    install_skills
  elif [ "$NO_SKILLS" = "1" ]; then
    install_binary
  else
    install_binary
    install_skills
  fi

  prune_backups

  printf '\n'
  say "🎉 安装完成！"
  say ""
  say "下一步："
  if ! command -v "$BIN_NAME" >/dev/null 2>&1; then
    say "  当前会话先执行：export PATH=\"$INSTALL_DIR:\$PATH\""
  fi
  say "  $BIN_NAME auth login    # 登录钉钉"
  say "  $BIN_NAME --help        # 查看命令帮助"
  printf '\n'
}

main