from pathlib import Path
p=Path('src/components/settings/AgentSettingsView.vue')
s=p.read_text(encoding='utf-8')
w="""watch(() => [...draft.connectedSystems], (next, previous) => {
  usageForm.systems = normalizeSystemTags([...usageForm.systems.filter(value => !previous.includes(value)), ...next])
})
"""
assert w in s
s=s.replace(w,'')
s=s.replace('const knowledgeDocs = [', w+'\nconst knowledgeDocs = [')
p.write_text(s,encoding='utf-8')
p=Path('src/__tests__/v13-experts-round2.test.ts')
s=p.read_text(encoding='utf-8-sig').replace("stubs: { ElInputTag: tagStub }", "stubs: { ElInputTag: tagStub, ElSelect: { template: '<select><slot/></select>' }, ElOption: { template: '<option><slot/></option>' } }")
s=s.replace("w.get('[data-testid=\"manual-systems\"]')", "w.get('[data-testid=\"usage-field-systems\"]')")
p.write_text(s,encoding='utf-8')
