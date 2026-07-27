import { describe, expect, it } from 'vitest'
import { buildDigestItems, DIGEST_RULE_VERSION } from './information-digest'

const base = {
  conversationId: 'group-1',
  conversationName: '电商经营群',
  singleChat: false,
  senderId: 'user-2',
  senderName: '运营负责人',
  sentAt: '2026-07-23 09:00:00',
}

describe('information digest scoring', () => {
  it('forces hard-rule risks to score 100 and the risk category', () => {
    const [item] = buildDigestItems({
      currentUser: { id: 'boss-1', name: '朝暮' },
      messages: [{ ...base, id: 'm1', content: '旗舰店错价，已造成资损 5500 元' }],
      watchRules: [],
    })

    expect(item).toMatchObject({ category: 'risk', score: 100, priority: 'high' })
    expect(item?.scoreTrace.ruleVersion).toBe(DIGEST_RULE_VERSION)
  })

  it('assigns one primary category using risk before decision', () => {
    const [item] = buildDigestItems({
      currentUser: { id: 'boss-1', name: '朝暮' },
      messages: [{ ...base, id: 'm1', content: '@朝暮 请拍板：客诉罚款方案今天确认' }],
      watchRules: [],
    })

    expect(item?.category).toBe('risk')
  })

  it('calculates decision factors and their weighted contribution', () => {
    const [item] = buildDigestItems({
      currentUser: { id: 'boss-1', name: '朝暮' },
      messages: [{ ...base, id: 'm1', content: '@朝暮 请审批采购方案，金额 20000 元，今天确认' }],
      watchRules: [],
    })

    expect(item?.category).toBe('decision')
    expect(item?.scoreTrace.factors.map((factor) => factor.key)).toEqual(['clarity', 'directness', 'urgency'])
    expect(item?.score).toBeCloseTo(
      item!.scoreTrace.factors.reduce((sum, factor) => sum + factor.contribution, 0),
      1,
    )
  })

  it('excludes single chats and duplicate message ids', () => {
    const messages = [
      { ...base, id: 'single', singleChat: true, content: 'GMV 100 万' },
      { ...base, id: 'dup', content: 'GMV 跌破目标 20%' },
      { ...base, id: 'dup', content: 'GMV 跌破目标 20%' },
    ]
    const items = buildDigestItems({
      currentUser: { id: 'boss-1', name: '朝暮' },
      messages,
      watchRules: [],
    })

    expect(items).toHaveLength(1)
    expect(items[0]?.sourceCount).toBe(1)
  })

  it('marks conflicting values for the same business metric', () => {
    const items = buildDigestItems({
      currentUser: { id: 'boss-1', name: '朝暮' },
      messages: [
        { ...base, id: 'm1', content: '旗舰店今日 GMV 120 万' },
        { ...base, id: 'm2', content: '旗舰店今日 GMV 98 万', sentAt: '2026-07-23 09:05:00' },
      ],
      watchRules: [],
    })

    expect(items[0]).toMatchObject({ category: 'business', isConflict: true })
    expect(items[0]?.conflictDetail).toContain('120')
    expect(items[0]?.conflictDetail).toContain('98')
  })

  it('uses a watch rule only after higher-priority categories do not match', () => {
    const [item] = buildDigestItems({
      currentUser: { id: 'boss-1', name: '朝暮' },
      messages: [{ ...base, id: 'm1', content: '新品绿野系列已完成首轮陈列' }],
      watchRules: [{ id: 'watch-1', type: 'keyword', value: '绿野', label: '绿野' }],
    })

    expect(item).toMatchObject({ category: 'watch', watchType: 'keyword' })
  })
})
