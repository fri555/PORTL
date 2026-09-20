#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
钉钉 MCP / Skill 链接精确化助手（自己想办法版）
================================================
问题：工作台钉钉集成规划.md 中 9 个能力（2 个 MCP + 7 个 Skill）的详情页 ID
      无法从公开源 / dws / aihub API 取到（企业未开放技能市场搜索）。
解法：
  1) 先把这 9 个笼统链接改成【结构精确的模板链接】，只差 ID 串；
  2) 你从 aihub 地址栏复制对应详情页 URL 粘进来，脚本自动抽 ID 补全。

用法：
  # 仅把笼统链接改成模板（差 ID）
  python fill_aihub_links.py --template

  # 补全：把从 aihub 地址栏复制的 URL 存成 ids.txt（每行一个完整 URL），跑：
  python fill_aihub_links.py --fill ids.txt

  ids.txt 示例：
  https://aihub.dingtalk.com/#/detail/skill?skillId=AbC123xxx
  https://aihub.dingtalk.com/#/detail?mcpId=7788&detailType=marketMcpDetail
"""
import re, sys, json, os

DOC = os.path.join(os.path.dirname(__file__), "工作台钉钉集成规划.md")

# 9 个待精确化的能力：名称（含文档中出现的变体文字）-> (类型, 占位说明)
MISSING = {
    "钉钉机器人消息 MCP": ("mcp",  "钉钉机器人消息的 mcpId"),
    "钉钉日志 MCP":       ("mcp",  "钉钉日志的 mcpId"),
    "会议自动驾驶":       ("skill","会议自动驾驶的 skillId"),
    "dingtalk-meeting-notes": ("skill", "dingtalk-meeting-notes 的 skillId"),
    "dingtalk-todo":      ("skill", "dingtalk-todo 的 skillId"),
    "链接速读":          ("skill", "链接速读的 skillId"),
    "链接速读 Skill":     ("skill", "链接速读的 skillId"),
    "智能全网搜索":       ("skill", "智能全网搜索的 skillId"),
    "智能全网搜索 MCP":   ("skill", "智能全网搜索的 skillId"),
    "企业信用智能尽调":    ("skill", "企业信用智能尽调的 skillId"),
    "企业信用智能尽调 Skill": ("skill", "企业信用智能尽调的 skillId"),
    "AI 视觉工坊":        ("skill", "AI 视觉工坊的 skillId"),
}

def template_url(kind, placeholder):
    if kind == "mcp":
        return f"https://aihub.dingtalk.com/#/detail?mcpId=<{placeholder}>&detailType=marketMcpDetail"
    return f"https://aihub.dingtalk.com/#/detail/skill?skillId=<{placeholder}>"

def to_template(text):
    for name, (kind, ph) in MISSING.items():
        # 替换紧跟在 [name] 后的笼统链接（aihub 首页 或 mcp.dingtalk.com 首页）
        pat = re.compile(r"(\[" + re.escape(name) + r"\])\((?:https://aihub\.dingtalk\.com/#/|https://mcp\.dingtalk\.com)\)")
        text = pat.sub(lambda m: f"{m.group(1)}({template_url(kind, ph)})", text)
    return text

def extract_id(url):
    m = re.search(r"skillId=([^&]+)", url)
    if m: return ("skill", m.group(1))
    m = re.search(r"mcpId=([^&]+)", url)
    if m: return ("mcp", m.group(1))
    return (None, None)

def fill(text, idfile):
    urls = [l.strip() for l in open(idfile, encoding="utf-8") if l.strip()]
    # 用 URL 里的 ID 反查名称：按顺序把 IDs 映射到 MISSING 的占位
    # 更稳妥：让用户用 "名称=URL" 或脚本按出现顺序填。这里支持两种：
    #   a) ids.txt 每行 "名称=URL"
    #   b) ids.txt 每行纯 URL，按 MISSING 顺序依次填
    mapping = {}
    pure = []
    for u in urls:
        if "=" in u and u.split("=",1)[0].strip() in MISSING:
            k, v = u.split("=",1); mapping[k.strip()] = v.strip()
        else:
            pure.append(u)
    # 纯 URL 按顺序填到尚未被 mapping 覆盖的项
    mi = [n for n in MISSING if n not in mapping]
    for i, u in enumerate(pure):
        if i < len(mi): mapping[mi[i]] = u
    for name, url in mapping.items():
        kind, idv = extract_id(url)
        if not idv:
            print(f"  ! 无法从 URL 提取 ID：{name} -> {url}"); continue
        if kind == "mcp":
            repl = f"https://aihub.dingtalk.com/#/detail?mcpId={idv}&detailType=marketMcpDetail"
        else:
            repl = f"https://aihub.dingtalk.com/#/detail/skill?skillId={idv}"
        pat = re.compile(r"(\[" + re.escape(name) + r"\])\(([^)]*)\)")
        newtext, n = pat.subn(lambda m, r=repl: f"{m.group(1)}({r})", text)
        if n: text = newtext; print(f"  ✓ {name} -> {idv}")
        else: print(f"  ! 未找到链接锚点：{name}")
    return text

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "--template"
    if not os.path.exists(DOC):
        print("找不到文档：", DOC); sys.exit(1)
    text = open(DOC, encoding="utf-8").read()
    if mode == "--template":
        out = to_template(text)
        open(DOC, "w", encoding="utf-8").write(out)
        print("已将 9 个笼统链接改为精确模板（差 ID）。剩余占位：")
        for m in re.findall(r"<[^>]+的 (mcpId|skillId)>", out):
            pass
        for name in MISSING:
            if f"[{name}](" in out and "<" in out:
                pass
        print("  在文档中搜索 '<' 即可看到 9 处占位，从 aihub 地址栏取 ID 后运行 --fill。")
    elif mode == "--fill":
        idfile = sys.argv[2] if len(sys.argv) > 2 else "ids.txt"
        if not os.path.exists(idfile):
            print("找不到 ids.txt，请把 aihub 详情页 URL 粘进去（每行一个）。"); sys.exit(1)
        out = fill(text, idfile)
        open(DOC, "w", encoding="utf-8").write(out)
        print("补全完成。")
    else:
        print(__doc__)
