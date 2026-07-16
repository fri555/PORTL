export type GovernanceTab = 'agents' | 'models' | 'tools' | 'evaluations'
export type EvaluationSubview = 'tasks' | 'datasets' | 'metrics' | 'reports'

export interface GovernanceRecord {
  id: string
  name: string
  code: string
  status: string
  owner: string
  category: string
  detail: string
  fields: string[]
}

export interface GovernanceMetric {
  label: string
  value: string
  note: string
  tone?: 'accent' | 'default' | 'warning'
}
