import type { AuditRecord, PersonalUsageRecord, UsageNode } from '@/types/settings-insights'
import { actorDisplayName } from './insights-helpers'

export function usageCsvRows(rows: UsageNode[]): string[] {
  return [
    '部门/人员/模块/子功能/会话,模式,模型,Token,人民币,时间',
    ...rows.map((row) =>
      [row.name, row.mode, row.model, row.tokens, row.amount, row.date].join(','),
    ),
  ]
}

export function personalUsageCsvRows(rows: PersonalUsageRecord[]): string[] {
  return [
    '时间,请求,模块,智能体,金额消耗',
    ...rows.map((row) => [row.time, row.request, row.client, row.agent, row.amount].join(',')),
  ]
}

export function auditCsvRows(rows: AuditRecord[]): string[] {
  return [
    '操作时间,操作人员,操作模块,操作对象,描述',
    ...rows.map((row) =>
      [row.createTime, actorDisplayName(row), row.bizType, row.bizName, row.operationDesc].join(
        ',',
      ),
    ),
  ]
}
