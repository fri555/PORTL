export type PortalTone = 'orange' | 'blue' | 'cyan' | 'violet' | 'rose'
export type ScheduleStatus = '进行中' | '即将开始' | '未开始'
export type TodoScope = 'all' | 'responsible' | 'participating'

export interface WorkbenchPortal {
  id: string
  name: string
  description: string
  category: string
  icon: string
  tone: PortalTone
  url: string
  ssoEnabled: boolean
}

export interface ScheduleItem {
  id: string
  date: string
  start: string
  end: string
  title: string
  location: string
  status: ScheduleStatus
}

export interface TodoItem {
  id: string
  title: string
  scope: Exclude<TodoScope, 'all'>
  due: string
  urgency: 'danger' | 'warning' | 'normal'
  completed: boolean
}

export interface CalendarDay {
  key: string
  date: Date
  day: number
  inCurrentMonth: boolean
  isToday: boolean
}
