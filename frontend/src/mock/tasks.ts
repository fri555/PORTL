import type { ScheduledTask, TaskLog } from '@/types/task'

export interface OfficeTaskTemplate {
  id: string
  name: string
  description: string
  agentId: string
  agentName: string
  cronExpression: string
  cronNaturalLanguage: string
  instruction: string
  icon: string
  color: string
}

export const officeTaskTemplates: OfficeTaskTemplate[] = [
  {
    id: 'tpl01', name: '定时生成周报', description: '每周五下午5点自动汇总本周工作数据并生成周报',
    agentId: 'ag09', agentName: '数据看板生成器',
    cronExpression: '0 17 * * 5', cronNaturalLanguage: '每周五17点',
    instruction: '汇总本周各部门关键业务数据，生成包含营收、库存、客户满意度的综合周报',
    icon: 'FileText', color: '#f97316',
  },
  {
    id: 'tpl02', name: '定时数据汇总', description: '每日早8点自动从各系统抽取数据并汇总入库',
    agentId: 'ag04', agentName: '供应链优化顾问',
    cronExpression: '0 8 * * *', cronNaturalLanguage: '每天8点',
    instruction: '从ERP、WMS、CRM系统抽取前一日数据，进行清洗、汇总并写入数据仓库',
    icon: 'Database', color: '#06b6d4',
  },
  {
    id: 'tpl03', name: '定时发送提醒', description: '按设定时间向指定钉钉群/个人发送业务提醒',
    agentId: 'ag01', agentName: '鞋类电商运营专家',
    cronExpression: '0 9 * * *', cronNaturalLanguage: '每天9点',
    instruction: '检查库存预警、价格异常、差评新增等关键指标，生成摘要并推送至钉钉',
    icon: 'Bell', color: '#10b981',
  },
  {
    id: 'tpl04', name: '会议预约助手', description: '智能协调参会者时间并发送会议邀请与议程',
    agentId: 'ag07', agentName: 'AI人事助手',
    cronExpression: '0 10 * * 1', cronNaturalLanguage: '每周一10点',
    instruction: '查看下周各部门会议安排，检测时间冲突，发送协调建议与优化方案',
    icon: 'CalendarDays', color: '#6366f1',
  },
  {
    id: 'tpl05', name: '竞品动态日报', description: '每日自动抓取竞品最新动态并生成分析简报',
    agentId: 'ag08', agentName: '商品比价分析师',
    cronExpression: '0 7 * * *', cronNaturalLanguage: '每天7点',
    instruction: '抓取主要竞品在天猫/京东/抖音的最新动作，生成竞品动态日报',
    icon: 'Swords', color: '#ef4444',
  },
]

export const scheduledTasks: ScheduledTask[] = [
  {
    id: 'task01', name: '每周竞品价格监控报告', description: '每周一9点自动抓取竞品价格并生成对比报告',
    ownerId: 'u3', agentId: 'ag08', agentName: '商品比价分析师',
    cronExpression: '0 9 * * 1', cronNaturalLanguage: '每周一9点执行', timezone: 'Asia/Shanghai',
    effectiveStart: '2026-06-01', effectiveEnd: null,
    executionConfig: {
      instruction: '抓取耐克、安踏、李宁在天猫/京东旗舰店的运动鞋最新价格，对比我方价格，分析价格差距与调价建议',
      dataSources: ['竞品价格数据集', '我方商品价格表'],
      outputFormat: 'markdown_report',
    },
    notificationConfig: { dingtalkTodo: true, dingtalkGroupWebhook: 'https://...', inAppNotification: true },
    retryConfig: { maxRetries: 3, retryDelaySeconds: 300, alertOnFailure: true },
    pointsCostPerRun: 5, status: 'active',
    lastRunAt: '2026-06-15T09:00:05Z', lastRunStatus: 'success',
    nextRunAt: '2026-06-22T09:00:00Z', createdAt: '2026-06-01T10:00:00Z', updatedAt: '2026-06-15T09:00:05Z',
  },
  {
    id: 'task02', name: '每日库存预警扫描', description: '每日早8点扫描全仓库存，标记低库存/高积压SKU',
    ownerId: 'u4', agentId: 'ag04', agentName: '供应链优化顾问',
    cronExpression: '0 8 * * *', cronNaturalLanguage: '每天8点执行', timezone: 'Asia/Shanghai',
    effectiveStart: '2026-05-01', effectiveEnd: null,
    executionConfig: {
      instruction: '扫描全仓库存数据，标记库存天数<7天的SKU（缺货风险）和库存天数>90天的SKU（积压风险），按紧急度排序',
      dataSources: ['库存实时数据', '近30天销售数据'],
      outputFormat: 'json',
    },
    notificationConfig: { dingtalkTodo: false, dingtalkGroupWebhook: 'https://...', inAppNotification: true },
    retryConfig: { maxRetries: 2, retryDelaySeconds: 120, alertOnFailure: true },
    pointsCostPerRun: 3, status: 'active',
    lastRunAt: '2026-06-21T08:00:03Z', lastRunStatus: 'success',
    nextRunAt: '2026-06-22T08:00:00Z', createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-06-21T08:00:03Z',
  },
  {
    id: 'task03', name: '月度经营分析报告', description: '每月1号生成上月全集团经营分析报告',
    ownerId: 'u6', agentId: 'ag06', agentName: '财务AI分析师',
    cronExpression: '0 9 1 * *', cronNaturalLanguage: '每月1号9点执行', timezone: 'Asia/Shanghai',
    effectiveStart: '2026-06-01', effectiveEnd: null,
    executionConfig: {
      instruction: '汇总上月集团各业务线经营数据，生成包含收入、成本、毛利、同比环比的综合分析报告',
      dataSources: ['财务数据仓库', 'ERP系统'],
      outputFormat: 'markdown_report',
    },
    notificationConfig: { dingtalkTodo: true, dingtalkGroupWebhook: '', inAppNotification: true },
    retryConfig: { maxRetries: 1, retryDelaySeconds: 600, alertOnFailure: true },
    pointsCostPerRun: 10, status: 'active',
    lastRunAt: '2026-06-01T09:00:12Z', lastRunStatus: 'success',
    nextRunAt: '2026-07-01T09:00:00Z', createdAt: '2026-05-20T10:00:00Z', updatedAt: '2026-06-01T09:00:12Z',
  },
  {
    id: 'task04', name: '客服对话质检周报', description: '每周五自动质检本周客服对话并生成质量报告',
    ownerId: 'u5', agentId: 'ag05', agentName: '智能客服质检员',
    cronExpression: '0 17 * * 5', cronNaturalLanguage: '每周五17点执行', timezone: 'Asia/Shanghai',
    effectiveStart: '2026-05-01', effectiveEnd: null,
    executionConfig: {
      instruction: '质检本周所有客服对话，评估服务质量、识别典型问题、生成改进建议',
      dataSources: ['客服系统对话记录'],
      outputFormat: 'markdown_report',
    },
    notificationConfig: { dingtalkTodo: true, dingtalkGroupWebhook: 'https://...', inAppNotification: true },
    retryConfig: { maxRetries: 2, retryDelaySeconds: 300, alertOnFailure: true },
    pointsCostPerRun: 8, status: 'paused',
    lastRunAt: '2026-06-12T17:00:08Z', lastRunStatus: 'success',
    nextRunAt: null, createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-06-18T10:00:00Z',
  },
]

export const taskLogs: TaskLog[] = [
  { id: 'log01', taskId: 'task01', startedAt: '2026-06-15T09:00:05Z', finishedAt: '2026-06-15T09:03:22Z', status: 'success', output: '# 本周竞品价格监控报告\n\n## 耐克\n- Air Max 2026...', errorMessage: null, tokensUsed: 4200, pointsConsumed: 5 },
  { id: 'log02', taskId: 'task01', startedAt: '2026-06-08T09:00:03Z', finishedAt: '2026-06-08T09:02:55Z', status: 'success', output: '# 本周竞品价格监控报告...', errorMessage: null, tokensUsed: 3900, pointsConsumed: 5 },
  { id: 'log03', taskId: 'task02', startedAt: '2026-06-21T08:00:03Z', finishedAt: '2026-06-21T08:00:45Z', status: 'success', output: '{"alerts":[{"sku":"AM2026-001","risk":"low_stock"...', errorMessage: null, tokensUsed: 1800, pointsConsumed: 3 },
  { id: 'log04', taskId: 'task03', startedAt: '2026-06-01T09:00:12Z', finishedAt: '2026-06-01T09:05:30Z', status: 'success', output: '# 2026年5月经营分析报告...', errorMessage: null, tokensUsed: 8500, pointsConsumed: 10 },
  { id: 'log05', taskId: 'task04', startedAt: '2026-06-12T17:00:08Z', finishedAt: '2026-06-12T17:03:15Z', status: 'success', output: '# 客服对话质检周报...', errorMessage: null, tokensUsed: 6200, pointsConsumed: 8 },
]
