export interface Dashboard {
  id: string
  name: string
  description: string
  category: 'official' | 'mine' | 'shared'
  businessDomain: string
  ownerName: string
  charts: DashboardChart[]
  createdAt: string
  updatedAt: string
  viewCount: number
  isStarred: boolean
}

export interface DashboardChart {
  id: string
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'map' | 'table'
  title: string
  datasetId: string
  datasetName: string
  xField: string
  yFields: string[]
  filters: ChartFilter[]
  position: { x: number; y: number; w: number; h: number }
}

export interface ChartFilter {
  field: string
  operator: 'eq' | 'gt' | 'lt' | 'between' | 'in'
  value: string | string[]
}

export interface Dataset {
  id: string
  name: string
  description: string
  source: 'warehouse' | 'crawler' | 'manual'
  fields: DatasetField[]
  rowCount: number
  lastSyncedAt: string
}

export interface DatasetField {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'category'
  description: string
  nullable: boolean
}

export interface ChatBIRequest {
  query: string
  context?: string
}

export interface ChatBIResponse {
  explanation: string
  matchedDataset: string
  charts: { type: string; title: string; config: Record<string, unknown> }[]
}
