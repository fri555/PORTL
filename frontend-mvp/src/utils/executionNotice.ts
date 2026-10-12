export type RunKind = 'agent' | 'todo'
export type RunState = 'running' | 'waiting' | 'success' | 'abnormal'
export interface ExecutionNoticeInput {
  taskId: string; runId: string; kind: RunKind; taskName: string; subjectName: string
  executedAt: string; state: RunState; reason?: string; conversationId?: string; interruptionId?: string
}
export function executionNotice(input: ExecutionNoticeInput) {
  const interrupted = input.state === 'waiting'
  const title = (input.kind === 'agent' ? '智能体任务' : '待办任务') + (interrupted ? '中断提醒' : '执行通知')
  const reason = input.reason?.trim() || (input.state === 'abnormal' ? '未返回具体失败原因，请查看执行记录。' : '请返回任务继续处理。')
  const lines = [
    '任务名称：' + input.taskName,
    (input.kind === 'agent' ? '执行智能体：' : '待办名称：') + input.subjectName,
    '执行时间：' + input.executedAt,
    '执行状态：' + (interrupted ? '待处理' : input.state === 'success' ? '成功' : input.state === 'abnormal' ? '失败' : '执行中'),
  ]
  if (interrupted || input.state === 'abnormal') lines.push((interrupted ? '中断原因：' : '失败原因：') + reason)
  const href = input.kind === 'agent'
    ? input.conversationId ? '/PORTL/chat/' + encodeURIComponent(input.conversationId) : ''
    : '/PORTL/automation?runId=' + encodeURIComponent(input.runId)
  return { title, lines, href, key: [input.runId, interrupted ? input.interruptionId || 'interruption' : 'result'].join(':') }
}
