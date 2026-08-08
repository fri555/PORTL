export interface DeptRankItem {
  rank: number
  department: string
  metric: string
  score: number
}

export interface DemandVoice {
  id: string
  title: string
  voteCount: number
  department: string
  status: string
}

export interface CourseItem {
  id: string
  title: string
  cover: string
  difficulty: string
  duration: string
  enrolled: number
}

export interface ToolItem {
  id: string
  name: string
  icon: string
  description?: string
  color?: string
}

export interface HomeData {
  headline: import('./article').Article
  trending: import('./article').Article[]
  competitorNews: import('./article').Article[]
  deptRank: DeptRankItem[]
  demandVoices: DemandVoice[]
  industryNews: import('./article').Article[]
  internalNews: import('./article').Article[]
  courses: CourseItem[]
  tools: ToolItem[]
}

// ========== Home Workbench Types ==========

export interface HomeComponent {
  id: string
  type: HomeComponentType
  size: ComponentSize
  order: number
  layout?: GridPosition
  config: Record<string, unknown>
}

export interface GridPosition {
  x: number
  y: number
}

export type HomeComponentType =
  | 'global_search'
  | 'tool_shortcuts'
  | 'competitor_snapshot'
  | 'industry_headlines'
  | 'business_data'
  | 'my_todo'
  | 'system_shortcuts'
  | 'model_usage'
  | 'digital_human'
  | 'dept_value_ranking'

export type ComponentSize = '1x1' | '1x2' | '2x1' | '2x2' | '2x4' | '4x2' | '4x4'

export const COMPONENT_META: Record<HomeComponentType, { name: string; icon: string; defaultSize: ComponentSize; allowedSizes: ComponentSize[] }> = {
  global_search: { name: 'AI智能搜索', icon: 'Search', defaultSize: '2x4', allowedSizes: ['2x4'] },
  tool_shortcuts: { name: '智能工具', icon: 'LayoutGrid', defaultSize: '2x2', allowedSizes: ['1x1', '2x2', '4x2'] },
  competitor_snapshot: { name: '竞对快照', icon: 'Swords', defaultSize: '4x2', allowedSizes: ['2x2', '4x2'] },
  industry_headlines: { name: '行业头条', icon: 'Globe', defaultSize: '4x2', allowedSizes: ['2x2', '4x2'] },
  business_data: { name: '经营数据', icon: 'BarChart3', defaultSize: '4x4', allowedSizes: ['2x2', '4x2', '4x4'] },
  my_todo: { name: '我的待办', icon: 'ClipboardList', defaultSize: '2x2', allowedSizes: ['2x2'] },
  system_shortcuts: { name: '系统快捷入口', icon: 'LayoutPanelTop', defaultSize: '1x1', allowedSizes: ['1x1', '2x1'] },
  model_usage: { name: '模型用量', icon: 'Zap', defaultSize: '2x2', allowedSizes: ['2x2', '4x2'] },
  digital_human: { name: '数字人平台', icon: 'UserRound', defaultSize: '2x2', allowedSizes: ['1x1', '2x2'] },
  dept_value_ranking: { name: '部门AI价值榜', icon: 'Trophy', defaultSize: '4x2', allowedSizes: ['2x2', '4x2'] },
}

export const SIZE_GRID: Record<ComponentSize, { cols: number; rows: number }> = {
  '1x1': { cols: 1, rows: 1 },
  '1x2': { cols: 1, rows: 2 },
  '2x1': { cols: 2, rows: 1 },
  '2x2': { cols: 2, rows: 2 },
  '2x4': { cols: 2, rows: 4 },
  '4x2': { cols: 4, rows: 2 },
  '4x4': { cols: 4, rows: 4 },
}
