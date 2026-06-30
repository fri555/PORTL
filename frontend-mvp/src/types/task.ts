export interface ScheduledTask {
  id: string
  name: string
  description: string
  ownerId: string
  agentId: string
  agentName: string
  cronExpression: string
  cronNaturalLanguage: string
  timezone: string
  effectiveStart: string
  effectiveEnd: string | null
  executionConfig: {
    instruction: string
    dataSources: string[]
    outputFormat: 'markdown_report' | 'json' | 'text' | 'csv'
  }
  notificationConfig: {
    dingtalkTodo: boolean
    dingtalkGroupWebhook: string
    inAppNotification: boolean
  }
  retryConfig: {
    maxRetries: number
    retryDelaySeconds: number
    alertOnFailure: boolean
  }
  pointsCostPerRun: number
  status: 'active' | 'paused' | 'stopped' | 'error'
  lastRunAt: string | null
  lastRunStatus: 'success' | 'failed' | null
  nextRunAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskLog {
  id: string
  taskId: string
  startedAt: string
  finishedAt: string | null
  status: 'running' | 'success' | 'failed'
  output: string | null
  errorMessage: string | null
  tokensUsed: number
  pointsConsumed: number
}
