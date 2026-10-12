from pathlib import Path
p=Path('src/utils/agentUsage.ts')
s=p.read_text(encoding='utf-8')
s=s.replace("if (/^\\s*\\d+[.、．]\\s/.test(line)) break", "if (/^\\s*\\d+[.、．]\\s*(?:能力范围|能力边界|基本信息|能做什么|不能做什么|知识边界|置信与使用约束|使用约束)/u.test(line)) break")
p.write_text(s,encoding='utf-8')
