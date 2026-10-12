from pathlib import Path
p=Path('src/components/settings/AgentSettingsView.vue')
s=p.read_text(encoding='utf-8-sig')
s=s.replace('validateUsageInstructions, USAGE_MAX_LENGTH', 'validateUsageInstructions, normalizeSystemTags, USAGE_MAX_LENGTH')
old='''function normalizeUsageSystems(values: string[] = []) {
  usageForm.systems = [...new Set(values.map(value => value.trim()).filter(Boolean))].slice(0, 8)
}
watch(activeStep, (step) => {
  if (step !== 5) return
  usageForm.systems = [...new Set([...usageForm.systems, ...draft.connectedSystems])].slice(0, 8)
})'''
new='''const automaticSystems = computed(() => normalizeSystemTags(draft.connectedSystems))
const manualUsageSystems = computed({
  get: () => usageForm.systems.filter(value => !automaticSystems.value.includes(value)),
  set: (values: string[] | undefined) => normalizeUsageSystems(values),
})
function normalizeUsageSystems(values: string[] = []) {
  usageForm.systems = normalizeSystemTags([...automaticSystems.value, ...values])
  if (usageForm.systems.length > 8) usageError.value = '「接入系统」最多 8 个，请调整后保存'
}
watch(() => [...draft.connectedSystems], (next, previous) => {
  usageForm.systems = normalizeSystemTags([...usageForm.systems.filter(value => !previous.includes(value)), ...next])
})
watch(activeStep, (step) => {
  if (step === 5) usageForm.systems = normalizeSystemTags([...automaticSystems.value, ...usageForm.systems])
})'''
assert old in s
s=s.replace(old,new)
s=s.replace("  Object.assign(usageForm, usageFormFromContent(draft.usageInstructions))\n  formMode.value = 'edit'", "  const existingDraft = getExpertDraft(agent.id)\n  Object.assign(draft, { connectedSystems: existingDraft?.capabilities?.connectedSystems ?? [], selectedDocs: existingDraft?.capabilities?.selectedDocumentNames ?? [], selectedTools: existingDraft?.capabilities?.selectedToolNames ?? [] })\n  Object.assign(usageForm, usageFormFromContent(draft.usageInstructions))\n  formMode.value = 'edit'")
s=s.replace("  Object.assign(snapshot, { name:payload.name, description:payload.description, updatedAt:new Date().toISOString() })", """  Object.assign(snapshot, {
    name: payload.name, description: payload.description, avatarUrl: payload.avatar,
    category: categoryByLabel[payload.category] ?? snapshot.category,
    version: String(draft.version), updatedAt: new Date().toISOString(),
    capabilities: {
      ...previous?.capabilities,
      connectedSystems: [...draft.connectedSystems],
      selectedDocumentNames: [...draft.selectedDocs],
      selectedToolNames: [...draft.selectedTools],
      internetEnabled: draft.selectedTools.includes('Brave网络搜索') || draft.connectedSystems.includes('联网'),
    },
  })""")
old='''      Object.assign(draft, JSON.parse(String(reader.result)))
      notify('配置已导入')'''
new='''      const data: unknown = JSON.parse(String(reader.result))
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid config')
      const imported = data as Record<string, unknown>
      for (const key of Object.keys(draft) as (keyof typeof draft)[]) {
        const value = imported[key]
        const current = draft[key]
        if (Array.isArray(current)) {
          if (!Array.isArray(value)) continue
          if (['connectedSystems', 'applicableDepartments', 'selectedDocs', 'selectedTools'].includes(key) && !value.every(item => typeof item === 'string')) throw new Error('invalid list')
          ;(draft as Record<string, unknown>)[key] = value
        } else if (typeof value === typeof current && (typeof value !== 'number' || Number.isFinite(value))) {
          ;(draft as Record<string, unknown>)[key] = value
        }
      }
      Object.assign(usageForm, usageFormFromContent(draft.usageInstructions))
      usageForm.systems = normalizeSystemTags([...automaticSystems.value, ...usageForm.systems])
      usageError.value = validateUsageForm(usageForm, false) ?? ''
      notify(usageError.value || '配置已导入')'''
assert old in s
s=s.replace(old,new)
old='''                    <ElInputTag v-model="usageForm.systems" data-testid="usage-field-systems" :max="8" maxlength="20" :delimiter="systemTagDelimiter" clearable @change="normalizeUsageSystems" class="mt-2 w-full" placeholder="输入系统名称后按 Enter；最多 8 个" aria-label="接入系统" />'''
new='''                    <span v-if="automaticSystems.length" data-testid="automatic-systems" class="mt-2 flex flex-wrap gap-2"><span v-for="system in automaticSystems" :key="system" class="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 font-normal text-blue-600" :title="'自动带入；请到基础设定修改接入系统'">{{ system }} · 自动</span></span>
                    <ElInputTag v-model="manualUsageSystems" data-testid="usage-field-systems" :max="Math.max(0, 8 - automaticSystems.length)" :disabled="automaticSystems.length >= 8" maxlength="20" :delimiter="systemTagDelimiter" clearable class="mt-2 w-full" placeholder="补充业务系统名称；共最多 8 个" aria-label="接入系统" />'''
assert old in s
s=s.replace(old,new)
p.write_text(s,encoding='utf-8')
p=Path('src/components/chat/source-clone/ExpertMentionMenu.vue')
s=p.read_text(encoding='utf-8-sig').replace('ChevronRight, Search, Star', 'ChevronRight, Search')
s=s.replace('<span class="mention-avatar" :aria-hidden="true">{{ expert.name.slice(0,1) }}</span>', '<span class="mention-avatar" :aria-hidden="true"><img v-if="expert.avatarUrl" :src="expert.avatarUrl" alt="" /><template v-else>{{ expert.name.slice(0,1) }}</template></span>')
s=s.replace('{{ expert.name }}<Star v-if="favoriteIds.has(expert.id)" :size="12" aria-label="已收藏" />', '{{ expert.name }}')
s=s.replace('.mention-name{', '.mention-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}\n.mention-name{')
p.write_text(s,encoding='utf-8')
