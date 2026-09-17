import type {
  DigestActionType,
  DigestScoreFactor,
  DigestWatchRule,
  MessageSummaryCategory,
  MessageSummaryItem,
} from '../src/types/workbench'

export const DIGEST_RULE_VERSION = 'prd-3.9-rules-1'

export interface RawDigestMessage {
  id: string
  conversationId: string
  conversationName: string
  singleChat: boolean
  senderId: string
  senderName: string
  sentAt: string
  content: string
  openMessageId?: string
}

export interface BuildDigestInput {
  currentUser: { id: string; name: string }
  messages: RawDigestMessage[]
  watchRules: DigestWatchRule[]
}

const HARD_RISK = ['罚款', '违规词', '处罚', '客诉', '投诉', '升级', '故障', '宕机', '崩溃', '错价', '下单异常', '账号被清', '封号', '虚假宣传', '违规', '工商', '法务', '诉讼', '泄露', '资损']
const INTERRUPTION = ['生成失败', '失败', '延迟', '超时', '异常', '缺货', '错价', '退货激增']
const SOFT_RISK = ['提醒', '注意', '建议关注', '轻微', '待观察']
const BUSINESS = ['GMV', '销售额', '营收', '收入', '客单价', '复购', '订单', '成交', '流量', '访客', 'UV', 'PV', '曝光', '点击', 'CTR', '转化', '库存', '缺货', '周转', '到货', '入库', '仓库', '备货', '成本', '毛利', '费用', '利润', '亏损', 'ROI', '投放', '投流', '发布量', '内容', '视频', '直播', '粉丝', '互动', '活动', '促销', '双11', '大促', '秒杀', '优惠券', '发货', '物流', '退货', '退款', '差评', '时效', '价格', '定价', '调价', '售价', '折扣', '底价']
const BREAK_LINE = ['未达标', '超标', '破线', '跌破', '异常', '预警', '错报']
const SIGNIFICANT = ['大涨', '大跌', '暴涨', '暴跌', '翻倍', '腰斩']
const SLIGHT = ['略涨', '微跌', '平稳', '持平']
const DECISION = ['请拍板', '请审批', '请确认', '是否同意', '请决定', '等您确认', '请求审批']
const FOLLOWUP = ['跟进', '推进', '落实', '进度', '截止', '负责人', '阻塞', '待处理']
const URGENT = ['急', '尽快', '今天', '立即', '马上']
const IMPACT_WIDE = ['全公司', '全部客户', '对外客户', '全平台', '全店']
const IMPACT_MEDIUM = ['单店', '单系统', '门店', '平台']
const SYSTEM_NOISE = /^(收到|好的|嗯|ok|OK|谢谢|辛苦了|已阅|[~!！。…\s]+)$/

function clamp(value: number) {
  return Math.max(0, Math.min(100, Number(value.toFixed(1))))
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function containsAny(value: string, words: string[]) {
  const upper = value.toUpperCase()
  return words.some((word) => upper.includes(word.toUpperCase()))
}

function weightedFactor(
  key: string,
  label: string,
  level: 'message' | 'item',
  rawValue: number,
  weight: number,
  basis: string,
): DigestScoreFactor {
  return {
    key,
    label,
    level,
    rawValue: clamp(rawValue),
    weight,
    contribution: Number((clamp(rawValue) * weight).toFixed(1)),
    basis,
  }
}

function numericTokens(value: string) {
  return [...value.matchAll(/(?:¥|￥)?(\d+(?:\.\d+)?)\s*(万|千|%|元)?/g)]
    .map((match) => `${match[1]}${match[2] ?? ''}`)
}

function watchRuleFor(message: RawDigestMessage, rules: DigestWatchRule[]) {
  return rules.find((rule) => {
    if (rule.type === 'group') return message.conversationId === rule.value || message.conversationName.includes(rule.value)
    if (rule.type === 'user') return message.senderId === rule.value || message.senderName.includes(rule.value)
    return message.content.includes(rule.value)
  })
}

function primaryCategory(
  messages: RawDigestMessage[],
  currentUserName: string,
  rules: DigestWatchRule[],
) {
  const text = messages.map((message) => message.content).join('\n')
  if (containsAny(text, HARD_RISK) || containsAny(text, INTERRUPTION)) return { category: 'risk' as const }
  if (containsAny(text, DECISION) || text.includes(`@${currentUserName}`)) return { category: 'decision' as const }
  if (containsAny(text, FOLLOWUP)) return { category: 'followup' as const }
  if (containsAny(text, BUSINESS)) return { category: 'business' as const }
  const matchedRule = messages.map((message) => watchRuleFor(message, rules)).find(Boolean)
  return matchedRule ? { category: 'watch' as const, watchType: matchedRule.type } : null
}

function decisionFactors(messages: RawDigestMessage[], currentUserName: string) {
  const texts = messages.map((message) => message.content)
  const clarity = texts.some((value) => /\d/.test(value) && /(方案|金额|人员|负责人|采购|价格)/.test(value))
    ? 100
    : texts.some((value) => containsAny(value, DECISION)) ? 60 : 30
  const directness = average(texts.map((value) => value.includes(`@${currentUserName}`)
    ? 100
    : value.includes(currentUserName) ? 80 : 50))
  const urgency = texts.some((value) => /(今天|24小时|24 小时)/.test(value))
    ? 100
    : texts.some((value) => /(明天|本周|截止)/.test(value)) ? 80
      : texts.some((value) => containsAny(value, URGENT)) ? 70 : 30
  return [
    weightedFactor('clarity', '明确度', 'item', clarity, 0.3, '事由及方案、金额或人员完整度'),
    weightedFactor('directness', '直接度', 'message', directness, 0.4, '逐条消息对当前用户的指向程度平均值'),
    weightedFactor('urgency', '紧迫度', 'item', urgency, 0.3, '截止时间和紧急措辞'),
  ]
}

function followupFactors(messages: RawDigestMessage[], allMessageCount: number, currentUser: BuildDigestInput['currentUser']) {
  const senders = new Set(messages.map((message) => message.senderId || message.senderName))
  const timestamps = messages.map((message) => new Date(message.sentAt.replace(' ', 'T') + '+08:00').getTime()).filter(Number.isFinite)
  const durationDays = timestamps.length > 1 ? Math.max(1, (Math.max(...timestamps) - Math.min(...timestamps)) / 86_400_000) : 1
  const heat = (
    (messages.length / Math.max(1, allMessageCount)) * 0.4
    + (Math.min(30, durationDays) / 30) * 0.3
    + (Math.min(10, senders.size) / 10) * 0.3
  ) * 100
  const currentUserMessages = messages.filter((message) => (
    (currentUser.id && message.senderId === currentUser.id)
    || message.senderName === currentUser.name
  )).length
  const assignedByCurrentUser = messages.some((message) => (
    ((currentUser.id && message.senderId === currentUser.id) || message.senderName === currentUser.name)
    && /(请|安排|负责|落实|跟进)/.test(message.content)
  ))
  const interest = (currentUserMessages / messages.length) * 80 + (assignedByCurrentUser ? 20 : 0)
  const text = messages.map((message) => message.content).join('\n')
  const urgency = text.includes('阻塞') ? 100 : /(今天|24小时|24 小时)/.test(text) ? 80 : 30
  return [
    weightedFactor('heat', '讨论热度', 'item', heat, 0.3, '消息量、持续天数和参与人数'),
    weightedFactor('interest', '当前用户在意度', 'item', interest, 0.5, '当前用户消息占比及是否亲自布置'),
    weightedFactor('urgency', '紧迫度', 'item', urgency, 0.2, '阻塞及截止信号'),
  ]
}

function riskFactors(messages: RawDigestMessage[]) {
  const texts = messages.map((message) => message.content)
  const severity = average(texts.map((value) => containsAny(value, HARD_RISK)
    ? 100
    : containsAny(value, INTERRUPTION) ? 70
      : containsAny(value, SOFT_RISK) ? 30 : 0))
  const allText = texts.join('\n')
  const urgency = /(已造成|已损失|正发生|当前|已经)/.test(allText)
    ? 100
    : /(即将|可能发生|临近)/.test(allText) ? 70 : 30
  const impact = containsAny(allText, IMPACT_WIDE) ? 100 : containsAny(allText, IMPACT_MEDIUM) ? 60 : 30
  return [
    weightedFactor('severity', '严重度', 'message', severity, 0.5, '逐条消息风险词级别平均值'),
    weightedFactor('urgency', '紧急度', 'item', urgency, 0.3, '风险是否已经发生或即将发生'),
    weightedFactor('scope', '影响面', 'item', impact, 0.2, '全局、单系统或单事项影响范围'),
  ]
}

function businessFactors(messages: RawDigestMessage[]) {
  const texts = messages.map((message) => message.content)
  const relevance = average(texts.map((value) => containsAny(value, BUSINESS) ? (/\d/.test(value) ? 100 : 60) : 0))
  const density = average(texts.map((value) => (
    /\d/.test(value) && /(环比|同比|对比|较|增长|下降)/.test(value) ? 100
      : /\d/.test(value) ? 60
        : /(上涨|下降|增长|减少)/.test(value) ? 30 : 0
  )))
  const significance = average(texts.map((value) => containsAny(value, BREAK_LINE)
    ? 100
    : containsAny(value, SIGNIFICANT) ? 70
      : containsAny(value, SLIGHT) ? 30 : 0))
  return [
    weightedFactor('relevance', '经营相关度', 'message', relevance, 0.2, '经营词与数字命中情况'),
    weightedFactor('density', '数据密度', 'message', density, 0.4, '数字及环比、同比或对比信息'),
    weightedFactor('significance', '变化显著性', 'message', significance, 0.4, '破线、显著或轻微变化词'),
  ]
}

function watchFactors(messages: RawDigestMessage[], rules: DigestWatchRule[]) {
  const matchedRules = messages.map((message) => watchRuleFor(message, rules)).filter(Boolean)
  const match = matchedRules.length ? 100 : 0
  const value = average(messages.map((message) => (
    containsAny(message.content, HARD_RISK) || containsAny(message.content, BUSINESS) || containsAny(message.content, DECISION)
      ? 100
      : containsAny(message.content, FOLLOWUP) ? 60 : 30
  )))
  const credibility = average(messages.map((message) => /(负责人|总监|老板|BI|机器人)/.test(`${message.senderName}${message.conversationName}`) ? 100 : 80))
  return [
    weightedFactor('match', '匹配度', 'message', match, 0.5, '关注群、人员或关键词命中程度'),
    weightedFactor('value', '信息价值', 'message', value, 0.3, '风险、决策、经营或进度信号'),
    weightedFactor('credibility', '来源可信度', 'message', credibility, 0.2, '发送人与会话来源类型'),
  ]
}

function topicKey(message: RawDigestMessage, rules: DigestWatchRule[]) {
  const candidates = [...HARD_RISK, ...BUSINESS, ...DECISION, ...FOLLOWUP]
  const matched = candidates.find((word) => message.content.toUpperCase().includes(word.toUpperCase()))
  const watch = watchRuleFor(message, rules)
  if (matched) return matched.toUpperCase()
  if (watch) return `WATCH:${watch.type}:${watch.value}`
  return message.content.replace(/[^\p{Script=Han}A-Za-z0-9]/gu, '').slice(0, 10)
}

function clusterMessages(messages: RawDigestMessage[], rules: DigestWatchRule[]) {
  const sorted = [...messages].sort((a, b) => a.sentAt.localeCompare(b.sentAt))
  const clusters: Array<{ key: string; latestMs: number; messages: RawDigestMessage[] }> = []
  for (const message of sorted) {
    const key = `${message.conversationId}:${topicKey(message, rules)}`
    const time = new Date(message.sentAt.replace(' ', 'T') + '+08:00').getTime()
    const cluster = [...clusters].reverse().find((candidate) => (
      candidate.key === key && (!Number.isFinite(time) || !Number.isFinite(candidate.latestMs) || time - candidate.latestMs <= 72 * 60 * 60 * 1000)
    ))
    if (cluster) {
      cluster.messages.push(message)
      cluster.latestMs = Math.max(cluster.latestMs, time)
    } else {
      clusters.push({ key, latestMs: time, messages: [message] })
    }
  }
  return clusters.map((cluster) => cluster.messages)
}

function conflictFor(messages: RawDigestMessage[]) {
  const metricWords = BUSINESS.filter((word) => messages.some((message) => message.content.toUpperCase().includes(word.toUpperCase())))
  for (const metric of metricWords) {
    const rows = messages
      .filter((message) => message.content.toUpperCase().includes(metric.toUpperCase()))
      .flatMap((message) => numericTokens(message.content).map((value) => ({ value, message })))
    const values = [...new Set(rows.map((row) => row.value))]
    if (values.length > 1) {
      return {
        isConflict: true,
        detail: `${metric} 出现不同来源值：${values.join('、')}`,
      }
    }
  }
  return { isConflict: false, detail: undefined }
}

function actionTypesFor(text: string) {
  const actions: DigestActionType[] = []
  if (/(请|通知|回复|确认|拍板|风险|异常)/.test(text)) actions.push('send_msg')
  if (/(负责人|跟进|落实|处理|截止)/.test(text)) actions.push('create_todo')
  if (/(会议|沟通|评审|时间|今天|明天|本周)/.test(text)) actions.push('create_calendar')
  return actions.slice(0, 3)
}

function shortText(value: string, limit: number) {
  return [...value.replace(/\s+/g, ' ').trim()].slice(0, limit).join('')
}

function domainFor(text: string, category: MessageSummaryCategory) {
  if (/(GMV|销售|营收|订单|成交)/i.test(text)) return '销售'
  if (/(库存|缺货|到货|仓库)/.test(text)) return '供应链'
  if (/(价格|定价|折扣|错价)/.test(text)) return '价格'
  if (/(客诉|投诉|退款|差评)/.test(text)) return '客户'
  if (category === 'decision') return '管理决策'
  if (category === 'risk') return '风险'
  return '经营'
}

function impactFor(category: MessageSummaryCategory, text: string, hasHardRisk: boolean) {
  const amount = numericTokens(text)[0]
  if (category === 'risk') return shortText(amount ? `已识别风险值 ${amount}` : hasHardRisk ? '已命中风险硬规则' : '存在运营中断信号', 20)
  if (category === 'decision') return '需要当前用户明确拍板'
  if (category === 'followup') return '事项仍在推进或存在阻塞'
  if (category === 'business') return containsAny(text, BREAK_LINE) ? '经营指标出现破线信号' : '经营数据发生新的变化'
  return '命中当前用户关注规则'
}

export function buildDigestItems(input: BuildDigestInput): MessageSummaryItem[] {
  const seen = new Set<string>()
  const normalized = input.messages.filter((message) => {
    if (message.singleChat || !message.content.trim() || SYSTEM_NOISE.test(message.content.trim())) return false
    if (seen.has(message.id)) return false
    seen.add(message.id)
    return true
  })

  const items = clusterMessages(normalized, input.watchRules).flatMap((messages, index) => {
    const classified = primaryCategory(messages, input.currentUser.name, input.watchRules)
    if (!classified) return []
    const text = messages.map((message) => message.content).join('\n')
    const hasHardRisk = containsAny(text, HARD_RISK)
    const hasBreakLine = containsAny(text, BREAK_LINE)
    const factors = classified.category === 'decision'
      ? decisionFactors(messages, input.currentUser.name)
      : classified.category === 'followup'
        ? followupFactors(messages, normalized.length, input.currentUser)
        : classified.category === 'risk'
          ? riskFactors(messages)
          : classified.category === 'business'
            ? businessFactors(messages)
            : watchFactors(messages, input.watchRules)
    const calculated = factors.reduce((sum, factor) => sum + factor.contribution, 0)
    const score = classified.category === 'risk' && hasHardRisk ? 100 : clamp(calculated)
    const conflict = conflictFor(messages)
    const latest = [...messages].sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0]!
    const matchedSignals = [
      ...(hasHardRisk ? ['风险硬规则'] : []),
      ...(hasBreakLine ? ['经营破线'] : []),
      ...(conflict.isConflict ? ['多源冲突'] : []),
    ]
    const actions = actionTypesFor(text).map((type) => ({
      type,
      enabled: false,
      disabledReason: '等待 DWS 写入目标',
    }))
    return [{
      id: `digest-${latest.id || index + 1}`,
      category: classified.category,
      title: shortText(`${latest.conversationName}${classified.category === 'risk' ? '风险' : classified.category === 'decision' ? '待决' : '动态'}`, 10),
      summary: shortText(latest.content, 20),
      impact: impactFor(classified.category, text, hasHardRisk),
      priority: (score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low') as MessageSummaryItem['priority'],
      score,
      isConflict: conflict.isConflict,
      conflictDetail: conflict.detail,
      latestTime: latest.sentAt,
      sourceCount: messages.length,
      sources: [...messages]
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
        .slice(0, 10)
        .map((message) => ({
          id: message.id,
          conversationName: message.conversationName,
          conversationId: message.conversationId,
          senderName: message.senderName,
          senderId: message.senderId,
          sentAt: message.sentAt,
          content: message.content,
          openMessageId: message.openMessageId,
        })),
      businessDomain: domainFor(text, classified.category),
      aiAnalysis: factors.map((factor) => `${factor.label} ${factor.rawValue.toFixed(1)} 分：${factor.basis}`),
      scoreTrace: {
        ruleVersion: DIGEST_RULE_VERSION,
        factors,
        matchedSignals,
        degradationReasons: [],
      },
      actions,
      watchType: classified.category === 'watch' ? classified.watchType : undefined,
      hasHardRisk,
      hasBreakLine,
    } satisfies MessageSummaryItem]
  })

  return items.sort((a, b) => (
    Number(b.hasHardRisk) - Number(a.hasHardRisk)
    || Number(b.isConflict) - Number(a.isConflict)
    || Number(b.hasBreakLine) - Number(a.hasBreakLine)
    || b.score - a.score
    || b.latestTime.localeCompare(a.latestTime)
  ))
}
