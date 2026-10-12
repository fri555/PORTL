from pathlib import Path
base=Path(r"D:\工作\portal\frontend-mvp\src")
p=base/"components/chat/source-clone/SourceChatHome.vue"
s=p.read_text(encoding="utf-8-sig")
s=s.replace("  emit('mode-changed', mode.value)\n  emit('expert-selected', selectedExpert.value?.id ?? '')\n  emit('send', value, approvalMode.value)", "  emit('send', value, approvalMode.value)",1)
p.write_text(s,encoding="utf-8")
p=base/"__tests__/v13-chat-boundaries.test.ts"
s=p.read_text(encoding="utf-8-sig")
anchor="  it('isolates conversation mode records by current user', async () => {"
test="""  it('routes a preselected expert-mode home through the expert actually chosen before sending', async () => {
    localStorage.setItem('tianma.prototype.expert-favorites.v1', JSON.stringify(['ag03']))
    const { wrapper, router } = await mountChat('/chat?mode=expert')
    await wrapper.get('[data-testid="expert-card"]').trigger('click')
    await wrapper.get('textarea').setValue('整理营销方案')
    await wrapper.get('[aria-label="发送"]').trigger('click')
    await flushPromises()
    expect(String(router.currentRoute.value.params.sessionId)).toMatch(/^expert-plan-/)
    expect(wrapper.get('.answer-agent strong').text()).toBe('营销内容创作助手')
  })

"""
if anchor not in s: raise SystemExit("Missing test anchor")
p.write_text(s.replace(anchor,test+anchor,1),encoding="utf-8")

