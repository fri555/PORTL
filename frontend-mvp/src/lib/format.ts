export function timeAgo(iso: string): string {
  const diff = Date.now() - +new Date(iso)
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}天前`
  const w = Math.floor(d / 7)
  if (w < 5) return `${w}周前`
  const mo = Math.floor(d / 30)
  return `${mo}个月前`
}

export function formatNumber(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}
