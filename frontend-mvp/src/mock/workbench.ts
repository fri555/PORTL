import type { ScheduleItem, TodoItem, WorkbenchPortal } from '@/types/workbench'
import { toDateKey } from '@/lib/workbench-calendar'

export const workbenchPortals: WorkbenchPortal[] = [
  { id: 'ai-model', name: 'AI大模型', description: 'AI大模型问答', category: '智能应用', icon: 'sparkles', tone: 'orange', url: '/admin/governance', ssoEnabled: false },
  { id: 'tianma-sport', name: '天马运动', description: '一站式全渠道供应链平台', category: '供应链', icon: 'activity', tone: 'rose', url: 'https://sport.tianma.com', ssoEnabled: true },
  { id: 'inventory', name: '大库存', description: '零售库存查询系统', category: '供应链', icon: 'warehouse', tone: 'orange', url: 'https://inventory.tianma.com', ssoEnabled: true },
  { id: 'after-sales', name: '售后工单', description: '售后工单系统', category: '客户服务', icon: 'clipboard', tone: 'orange', url: 'https://service.tianma.com', ssoEnabled: true },
  { id: 'content', name: '内容中心', description: '资源内容平台', category: '内容运营', icon: 'image', tone: 'rose', url: 'https://content.tianma.com', ssoEnabled: true },
  { id: 'demand', name: '需求管理系统', description: '业务需求提报、技术部项目管理', category: '项目协作', icon: 'layout', tone: 'blue', url: 'https://demand.tianma.com', ssoEnabled: true },
  { id: 'operations', name: '新运营', description: '辅助店铺运营工作', category: '运营', icon: 'chart', tone: 'orange', url: 'https://operation.tianma.com', ssoEnabled: true },
  { id: 'orders', name: '【自营】订单系统', description: '平台订单拆分、配货与发货管理', category: '订单履约', icon: 'shopping-bag', tone: 'orange', url: 'https://orders.tianma.com', ssoEnabled: true },
  { id: 'third-party', name: '第三方系统', description: '店铺库存计算、同步与对接', category: '系统集成', icon: 'blocks', tone: 'orange', url: 'https://partner.tianma.com', ssoEnabled: true },
  { id: 'new-retail', name: '新零售', description: '流星马新零售', category: '零售', icon: 'store', tone: 'orange', url: 'https://retail.tianma.com', ssoEnabled: true },
  { id: 'visual-content', name: '耶运动-视觉内容中心', description: '品牌视觉素材与内容协作', category: '内容运营', icon: 'palette', tone: 'violet', url: 'https://visual.tianma.com', ssoEnabled: true },
]

const todayKey = toDateKey(new Date())

export const workbenchSchedules: ScheduleItem[] = [
  { id: 'schedule-1', date: todayKey, start: '09:00', end: '10:30', title: '产品需求评审会', location: '会议室 A-201', status: '进行中' },
  { id: 'schedule-2', date: todayKey, start: '11:00', end: '12:00', title: '项目周会', location: '会议室 A-201', status: '即将开始' },
  { id: 'schedule-3', date: todayKey, start: '14:00', end: '15:30', title: '客户方案沟通', location: '会议室 B-305', status: '即将开始' },
  { id: 'schedule-4', date: todayKey, start: '16:00', end: '17:00', title: '团队复盘会', location: '会议室 A-201', status: '未开始' },
]

export const workbenchTodos: TodoItem[] = [
  { id: 'todo-1', title: '撰写项目需求文档', scope: 'responsible', due: '今天 18:00 截止', urgency: 'danger', completed: false },
  { id: 'todo-2', title: '设计评审材料准备', scope: 'responsible', due: '今天 17:00 截止', urgency: 'warning', completed: false },
  { id: 'todo-3', title: '客户反馈跟进', scope: 'participating', due: '明天 10:00 截止', urgency: 'normal', completed: false },
  { id: 'todo-4', title: '项目周报提交', scope: 'participating', due: '明天 18:00 截止', urgency: 'normal', completed: false },
  { id: 'todo-5', title: '团队复盘材料准备', scope: 'responsible', due: '周五 18:00 截止', urgency: 'normal', completed: false },
]
