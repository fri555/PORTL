import type { PortalItem } from '@/types'

export const portalItems: PortalItem[] = [
  { id: 'erp', name: 'ERP 系统', url: '#', icon: 'Database', category: '业务系统', description: '企业资源管理' },
  { id: 'oa', name: 'OA 办公', url: '#', icon: 'FileText', category: '办公协作', description: '审批流程与办公' },
  { id: 'crm', name: 'CRM 客户', url: '#', icon: 'Users', category: '业务系统', description: '客户关系管理' },
  { id: 'hr', name: 'HR 系统', url: '#', icon: 'UserCheck', category: '人事管理', description: '人力资源与考勤' },
  { id: 'bi', name: 'BI 报表', url: '#', icon: 'BarChart3', category: '数据分析', description: '经营数据分析' },
  { id: 'project', name: '项目管理', url: '#', icon: 'Kanban', category: '办公协作', description: '项目与任务管理' },
  { id: 'wiki', name: '知识库', url: '#', icon: 'BookOpen', category: '办公协作', description: '企业知识沉淀' },
  { id: 'finance', name: '财务系统', url: '#', icon: 'Receipt', category: '业务系统', description: '预算与财务' },
]
