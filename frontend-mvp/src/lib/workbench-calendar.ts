import type { CalendarDay } from '@/types/workbench'

export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildMonthDays(year: number, month: number, today = new Date()): CalendarDay[] {
  const firstDay = new Date(year, month, 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return {
      key: toDateKey(date),
      date,
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === month,
      isToday: toDateKey(date) === toDateKey(today),
    }
  })
}
