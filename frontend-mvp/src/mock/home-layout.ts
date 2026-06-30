import type { HomeComponent } from '@/types/home'

function generateId(): string {
  return `hc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ========== Role Default Layouts ==========
// Designed for the 14 x 4 desktop-style home grid.

/** 高管 - 全局视野：搜索、经营数据、竞对、行业、排名 */
const executiveLayout: HomeComponent[] = [
  { id: generateId(), type: 'global_search', size: '2x4', order: 0, config: {} },
  { id: generateId(), type: 'business_data', size: '2x2', order: 1, config: {} },
  { id: generateId(), type: 'competitor_snapshot', size: '2x2', order: 2, config: {} },
  { id: generateId(), type: 'industry_headlines', size: '2x2', order: 3, config: {} },
  { id: generateId(), type: 'dept_value_ranking', size: '2x2', order: 4, config: {} },
  { id: generateId(), type: 'model_usage', size: '2x2', order: 5, config: {} },
  { id: generateId(), type: 'digital_human', size: '2x2', order: 6, config: {} },
  { id: generateId(), type: 'tool_shortcuts', size: '1x1', order: 7, config: { title: 'ChatBI', color: '#2563eb', url: '/dashboards/chat-bi' } },
  { id: generateId(), type: 'system_shortcuts', size: '1x1', order: 8, config: { title: '经营看板', color: '#16a34a', url: '/dashboards' } },
]

/** 普通员工 - 工作导向：搜索、工具、系统快捷、行业动态 */
const employeeLayout: HomeComponent[] = [
  { id: generateId(), type: 'global_search', size: '2x4', order: 0, config: {} },
  { id: generateId(), type: 'business_data', size: '4x4', order: 1, layout: { x: 0, y: 0 }, config: {} },
  { id: generateId(), type: 'industry_headlines', size: '4x2', order: 2, layout: { x: 4, y: 0 }, config: {} },
  { id: generateId(), type: 'competitor_snapshot', size: '4x2', order: 3, layout: { x: 8, y: 0 }, config: {} },
  { id: generateId(), type: 'my_todo', size: '2x2', order: 4, layout: { x: 12, y: 0 }, config: {} },
  { id: generateId(), type: 'dept_value_ranking', size: '4x2', order: 6, layout: { x: 4, y: 2 }, config: {} },
  { id: generateId(), type: 'model_usage', size: '2x2', order: 7, layout: { x: 8, y: 2 }, config: {} },
  { id: generateId(), type: 'digital_human', size: '2x2', order: 8, layout: { x: 10, y: 2 }, config: {} },
  { id: generateId(), type: 'tool_shortcuts', size: '1x1', order: 10, layout: { x: 12, y: 2 }, config: { title: 'AI写作', color: '#f97316', url: '/workspace/skills' } },
  { id: generateId(), type: 'tool_shortcuts', size: '1x1', order: 11, layout: { x: 13, y: 2 }, config: { title: 'AI生图', color: '#4f46e5', url: '/' } },
  { id: generateId(), type: 'tool_shortcuts', size: '1x1', order: 12, layout: { x: 12, y: 3 }, config: { title: 'PPT创作', color: '#db2777', url: '/workspace/skills' } },
  { id: generateId(), type: 'tool_shortcuts', size: '1x1', order: 13, layout: { x: 13, y: 3 }, config: { title: 'AI视频', color: '#e11d48', url: '/workspace/skills' } },
]

/** 部门AI BP - 推动者视角：搜索、排名、经营数据、工具 */
const aiBPLayout: HomeComponent[] = [
  { id: generateId(), type: 'global_search', size: '2x4', order: 0, config: {} },
  { id: generateId(), type: 'dept_value_ranking', size: '2x2', order: 1, config: {} },
  { id: generateId(), type: 'business_data', size: '2x2', order: 2, config: {} },
  { id: generateId(), type: 'tool_shortcuts', size: '2x2', order: 3, config: {} },
  { id: generateId(), type: 'model_usage', size: '2x2', order: 4, config: {} },
  { id: generateId(), type: 'my_todo', size: '2x2', order: 5, config: {} },
  { id: generateId(), type: 'industry_headlines', size: '2x2', order: 6, config: {} },
]

/** AI开发者 - 技术视角：搜索、用量、工具、系统快捷 */
const developerLayout: HomeComponent[] = [
  { id: generateId(), type: 'global_search', size: '2x4', order: 0, config: {} },
  { id: generateId(), type: 'model_usage', size: '2x2', order: 1, config: {} },
  { id: generateId(), type: 'tool_shortcuts', size: '2x2', order: 2, config: {} },
  { id: generateId(), type: 'system_shortcuts', size: '2x1', order: 3, config: {} },
  { id: generateId(), type: 'business_data', size: '2x2', order: 4, config: {} },
  { id: generateId(), type: 'digital_human', size: '2x2', order: 5, config: {} },
]

export const ROLE_DEFAULT_LAYOUTS: Record<string, HomeComponent[]> = {
  executive: executiveLayout,
  employee: employeeLayout,
  ai_bp: aiBPLayout,
  developer: developerLayout,
}

export const ROLE_LABELS: Record<string, string> = {
  executive: '高管',
  employee: '普通员工',
  ai_bp: '部门AI BP',
  developer: 'AI开发者',
}
