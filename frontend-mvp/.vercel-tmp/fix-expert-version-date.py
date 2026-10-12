from pathlib import Path
p=Path('src/components/settings/AgentSettingsView.vue')
s=p.read_text(encoding='utf-8-sig')
s=s.replace("  version: 1,\n  category", "  version: 1 as number | string,\n  category", 1)
s=s.replace("function openEdit(agent: AgentRow) {\n  resetDraft()\n  Object.assign(draft, {", "function openEdit(agent: AgentRow) {\n  resetDraft()\n  const existingDraft = getExpertDraft(agent.id)\n  Object.assign(draft, {\n    version: existingDraft?.version ?? 1,")
s=s.replace("  const existingDraft = getExpertDraft(agent.id)\n  Object.assign(draft, { connectedSystems:", "  Object.assign(draft, { connectedSystems:")
s=s.replace('<input v-model.number="draft.version" type="number" min="1"', '<input v-model="draft.version" :type="formMode === \'edit\' ? \'text\' : \'number\'" aria-label="版本" min="1"')
p.write_text(s,encoding='utf-8')
p=Path('src/utils/agentUsage.ts')
s=p.read_text(encoding='utf-8-sig')
s=s.replace("function dateLabel(value?: string) { return value && Number.isFinite(Date.parse(value)) ? value.slice(0, 10) : '未提供' }", """function dateLabel(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return '未提供'
  const parts = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-')
}""")
p.write_text(s,encoding='utf-8')
p=Path('src/__tests__/v13-experts-round2.test.ts')
s=p.read_text(encoding='utf-8-sig')
old="    await w.findAll('button').find(button => button.text() === '编辑')!.trigger('click')\n    await step(w, '使用说明')"
new="    await w.findAll('button').find(button => button.text() === '编辑')!.trigger('click')\n    expect((w.get('[aria-label=\"版本\"]').element as HTMLInputElement).value).toBe(before.version)\n    await step(w, '使用说明')"
assert old in s
s=s.replace(old,new)
p.write_text(s,encoding='utf-8')
