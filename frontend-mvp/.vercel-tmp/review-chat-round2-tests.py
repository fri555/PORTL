from pathlib import Path
p=Path(r"D:\工作\portal\frontend-mvp\src\__tests__\v13-chat-boundaries.test.ts")
s=p.read_text(encoding="utf-8-sig")
anchor="  it('closes the approval picker when interacting outside or pressing Escape', async () => {"
tests="""  it('keeps high-impact confirmation blocking autonomous execution and reports the actual plan state', async () => {
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/?planState=awaiting_confirmation')
    const wrapper = keep(mount(ChatDetail, { props: { sessionId: 'expert-plan', approvalMode: 'autonomous' } }))
    expect(wrapper.get('[data-testid="expert-auto-plan"] header strong').text()).toBe('等待操作确认')
    await vi.advanceTimersByTimeAsync(61000)
    expect(wrapper.text()).toContain('对外分享前需要你确认')
    expect(wrapper.find('.deliverables').exists()).toBe(false)
    await click(wrapper, '拒绝并停止')
    expect(wrapper.get('[data-testid="expert-auto-plan"] header strong').text()).toBe('执行已停止')
    expect(wrapper.find('.deliverables').exists()).toBe(false)
  })

  it('cancels a default-mode tool confirmation without showing successful external results', async () => {
    const wrapper = keep(mount(ChatDetail, { props: { sessionId: 'dws-action' } }))
    await wrapper.get('[aria-label="已完成钉钉授权"]').trigger('click')
    await click(wrapper, '取消')
    expect(wrapper.find('[data-testid="dws-confirm-card"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="dws-result-card"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="execution-process-trigger"]').text()).toContain('已取消')
    expect(wrapper.text()).toContain('待办尚未创建')
  })

  it('retains the deadline and terminal result of a persisted follow-up plan', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-09T02:00:00Z'))
    const props = { active: true, draftActivity: 0, hasDraft: false, templateLabel: '普通模板', stateKey: 'review-follow-up' }
    const first = keep(mount(FollowUpPlan, { props }))
    await vi.advanceTimersByTimeAsync(40000)
    first.unmount()
    await vi.advanceTimersByTimeAsync(10000)
    const second = keep(mount(FollowUpPlan, { props }))
    expect(second.text()).toContain('10 秒内')
    await vi.advanceTimersByTimeAsync(11800)
    expect(second.text()).toContain('本轮模拟执行完成')
    second.unmount()
    const third = keep(mount(FollowUpPlan, { props }))
    expect(third.text()).toContain('本轮模拟执行完成')
    expect(third.text()).not.toContain('60 秒内')
  })

"""
if anchor not in s: raise SystemExit("Missing test anchor")
p.write_text(s.replace(anchor,tests+anchor),encoding="utf-8")

