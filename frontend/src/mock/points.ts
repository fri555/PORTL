import type { PointsBalance, PointsTransaction } from '@/types/points'

const NOW = Date.now()
function daysAgo(d: number) { return new Date(NOW - d * 86400_000).toISOString() }
function hoursAgo(h: number) { return new Date(NOW - h * 3600_000).toISOString() }

export const pointsBalance: PointsBalance = {
  total: 1250,
  thisMonth: 320,
  thisWeek: 85,
  available: 890,
}

export const pointsTransactions: PointsTransaction[] = [
  { id: 'pt01', userId: 'u1', action: 'earn', points: 5, refType: 'demand', refId: 'd01', description: '提交需求被初审通过：AI智能合同审查', createdAt: daysAgo(25) },
  { id: 'pt02', userId: 'u1', action: 'earn', points: 1, refType: 'daily_login', refId: null, description: '每日登录', createdAt: daysAgo(5) },
  { id: 'pt03', userId: 'u1', action: 'earn', points: 1, refType: 'tool_usage', refId: 'ag01', description: '使用智能体：鞋类电商运营专家', createdAt: hoursAgo(6) },
  { id: 'pt04', userId: 'u1', action: 'earn', points: 1, refType: 'tool_usage', refId: 'ag03', description: '使用智能体：营销内容创作助手', createdAt: hoursAgo(4) },
  { id: 'pt05', userId: 'u1', action: 'spend', points: -5, refType: 'task', refId: 'task01', description: '定时任务执行：每周竞品价格监控报告', createdAt: daysAgo(7) },
  { id: 'pt06', userId: 'u1', action: 'spend', points: -10, refType: 'token_exchange', refId: null, description: '积分兑换Token额度：10M tokens', createdAt: daysAgo(10) },
  { id: 'pt07', userId: 'u1', action: 'earn', points: 10, refType: 'article', refId: 'a20', description: '技术分享投稿被采纳：Prompt工程进阶', createdAt: daysAgo(14) },
  { id: 'pt08', userId: 'u1', action: 'earn', points: 5, refType: 'course', refId: 'co1', description: '完成课程：Prompt工程进阶', createdAt: daysAgo(21) },
  { id: 'pt09', userId: 'u1', action: 'earn', points: 1, refType: 'comment', refId: 'd06', description: '评论需求：AI商品图批量生成', createdAt: hoursAgo(2) },
  { id: 'pt10', userId: 'u1', action: 'spend', points: -3, refType: 'task', refId: 'task02', description: '定时任务执行：每日库存预警扫描', createdAt: hoursAgo(10) },
]
