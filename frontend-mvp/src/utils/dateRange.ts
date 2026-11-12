/**
 * 日期筛选统一口径：快捷范围 + 自定义起止日期。
 * 任务中心、会话侧栏、HTML 报告预览共用同一套判断，避免三处各算一遍。
 */

export type QuickRange = 'all' | 'today' | 'week' | 'month' | 'earlier' | 'custom'

export interface CustomRange {
  start: string
  end: string
}

export const EMPTY_CUSTOM_RANGE: CustomRange = { start: '', end: '' }

export const QUICK_RANGE_LABEL: Record<Exclude<QuickRange, 'custom'>, string> = {
  all: '全部时间',
  today: '今日',
  week: '近一周',
  month: '近一月',
  earlier: '更早',
}

const DAY_MS = 24 * 3600_000

export function localDateInput(value: number | Date = Date.now()): string {
  const d = value instanceof Date ? value : new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseTimestamp(value: string): number {
  if (!value) return Number.NaN
  return Date.parse(value.trim().replace(' ', 'T'))
}

/** 取业务时间所在的自然日，用于自定义范围的两端闭区间比较。 */
export function dateKeyOf(value: string): string {
  const matched = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim())
  if (matched) return matched[1]
  const stamp = parseTimestamp(value)
  return Number.isFinite(stamp) ? localDateInput(stamp) : ''
}

/** 自定义范围要求两端都填，且结束不早于开始；未填完整时不参与筛选。 */
export function validateRange(range: CustomRange): { ok: boolean; reason: string } {
  const start = (range.start ?? '').trim()
  const end = (range.end ?? '').trim()
  if (!start || !end) return { ok: false, reason: '请选择开始日期和结束日期' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return { ok: false, reason: '日期格式不正确' }
  }
  if (start > end) return { ok: false, reason: '结束日期不能早于开始日期' }
  return { ok: true, reason: '' }
}

export function matchesRange(
  value: string,
  quick: QuickRange,
  range: CustomRange,
  now: number = Date.now(),
): boolean {
  if (quick === 'all') return true
  if (quick === 'custom') {
    const check = validateRange(range)
    if (!check.ok) return true
    const key = dateKeyOf(value)
    return !!key && key >= range.start && key <= range.end
  }
  const stamp = parseTimestamp(value)
  if (!Number.isFinite(stamp)) return true
  if (quick === 'today') return dateKeyOf(value) === localDateInput(now)
  if (quick === 'week') return stamp >= now - 7 * DAY_MS
  if (quick === 'month') return stamp >= now - 30 * DAY_MS
  return stamp < now - 30 * DAY_MS
}

/** 列表上方的当前范围说明。 */
export function rangeSummary(quick: QuickRange, range: CustomRange): string {
  if (quick === 'custom') {
    const check = validateRange(range)
    return check.ok ? `${range.start} 至 ${range.end}` : '自定义范围待设置'
  }
  return QUICK_RANGE_LABEL[quick]
}
