export function placeholder(text: string, hue = 25, w = 800, h = 450, label = ''): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>
<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
<stop offset='0' stop-color='hsl(${hue},85%,55%)'/><stop offset='1' stop-color='hsl(${hue + 25},80%,38%)'/>
</linearGradient></defs>
<rect width='100%' height='100%' fill='url(#g)'/>
${label ? `<text x='50%' y='50%' fill='rgba(255,255,255,0.92)' font-size='${Math.round(w / 16)}' font-family='-apple-system,sans-serif' font-weight='600' text-anchor='middle' dominant-baseline='middle'>${label}</text>` : ''}
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function escapeXml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case "'": return '&apos;'
      default: return ch
    }
  })
}

function splitTitle(title: string, maxChars = 12): string[] {
  if (title.length <= maxChars) return [title]
  const lines = [title.slice(0, maxChars)]
  const tail = title.slice(maxChars, maxChars * 2)
  if (tail) lines.push(tail)
  return lines
}

function renderCover(options: {
  title: string
  accentFrom: string
  accentTo: string
  emoji: string
  categoryLabel: string
  chips: string[]
  textColor?: string
  w?: number
  h?: number
}): string {
  const {
    title,
    accentFrom,
    accentTo,
    emoji,
    categoryLabel,
    chips,
    textColor = '#ffffff',
    w = 800,
    h = 450,
  } = options
  const titleLines = splitTitle(title, 12).slice(0, 2).map(escapeXml)
  const chipText = chips.slice(0, 3).map(escapeXml)
  const chipWidths = chipText.map((chip) => Math.max(64, chip.length * 14 + 24))

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>
<defs>
  <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
    <stop offset='0%' stop-color='${accentFrom}'/>
    <stop offset='100%' stop-color='${accentTo}'/>
  </linearGradient>
  <linearGradient id='glow' x1='0' y1='0' x2='1' y2='1'>
    <stop offset='0%' stop-color='rgba(255,255,255,0.12)'/>
    <stop offset='100%' stop-color='rgba(255,255,255,0)'/>
  </linearGradient>
  <filter id='softShadow' x='-20%' y='-20%' width='140%' height='140%'>
    <feDropShadow dx='0' dy='10' stdDeviation='18' flood-color='rgba(15,23,42,0.22)'/>
  </filter>
</defs>
<rect width='100%' height='100%' fill='url(#bg)'/>
<circle cx='${Math.round(w * 0.82)}' cy='${Math.round(h * 0.18)}' r='${Math.round(w * 0.22)}' fill='rgba(255,255,255,0.08)'/>
<circle cx='${Math.round(w * 0.1)}' cy='${Math.round(h * 0.82)}' r='${Math.round(w * 0.18)}' fill='rgba(0,0,0,0.12)'/>
<rect x='24' y='24' width='${Math.round(w - 48)}' height='${Math.round(h - 48)}' rx='28' fill='url(#glow)' opacity='0.55'/>
<g filter='url(#softShadow)'>
  <rect x='32' y='28' rx='18' ry='18' width='140' height='34' fill='rgba(255,255,255,0.18)'/>
  <text x='102' y='51' fill='${textColor}' font-size='18' font-family='-apple-system,sans-serif' font-weight='700' text-anchor='middle'>${categoryLabel}</text>
</g>
<text x='56' y='126' font-size='64' text-anchor='start' dominant-baseline='middle'>${emoji}</text>
<text x='56' y='196' fill='${textColor}' font-size='${Math.max(24, Math.round(w / 22))}' font-family='-apple-system,sans-serif' font-weight='800'>
  ${titleLines[0] ? `<tspan x='56' dy='0'>${titleLines[0]}</tspan>` : ''}
  ${titleLines[1] ? `<tspan x='56' dy='1.25em'>${titleLines[1]}</tspan>` : ''}
</text>
<g transform='translate(56, ${Math.round(h - 86)})'>
  ${chipText.map((chip, index) => {
    const offset = chipWidths.slice(0, index).reduce((sum, n) => sum + n + 10, 0)
    const width = chipWidths[index]
    return `<g transform='translate(${offset}, 0)'><rect width='${width}' height='30' rx='15' fill='rgba(255,255,255,0.18)'/><text x='${width / 2}' y='20' fill='${textColor}' font-size='16' font-family='-apple-system,sans-serif' font-weight='600' text-anchor='middle'>${chip}</text></g>`
  }).join('')}
</g>
<line x1='56' y1='${Math.round(h - 30)}' x2='${Math.round(w - 56)}' y2='${Math.round(h - 30)}' stroke='rgba(255,255,255,0.18)' stroke-width='2' stroke-dasharray='10 8'/>
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function coverFor(text: string, category: string): string {
  const palette: Record<string, { from: string; to: string; emoji: string; label: string; chips: string[] }> = {
    competitor: { from: '#7f1d1d', to: '#f97316', emoji: '📊', label: '竞对情报', chips: ['竞品监测', '风险提示', '动态追踪'] },
    industry: { from: '#0f172a', to: '#2563eb', emoji: '🌐', label: '行业前沿', chips: ['趋势速览', '模型进展', '方法论'] },
    internal: { from: '#14532d', to: '#10b981', emoji: '🏢', label: '集团动态', chips: ['内部落地', '流程升级', '协同提效'] },
    tech: { from: '#4c1d95', to: '#8b5cf6', emoji: '🛠️', label: '技术分享', chips: ['实践复盘', '工具链', '代码落地'] },
    product: { from: '#78350f', to: '#f59e0b', emoji: '✨', label: '产品更新', chips: ['功能上新', '体验优化', '版本说明'] },
  }
  const p = palette[category] ?? palette.industry
  return renderCover({
    title: text,
    accentFrom: p.from,
    accentTo: p.to,
    emoji: p.emoji,
    categoryLabel: p.label,
    chips: p.chips,
  })
}

/** 竞对品牌专属封面——统一卡片语法下的品牌变体 */
export function competitorCover(competitorName: string, w = 800, h = 450): string {
  const brands: Record<string, { from: string; to: string; emoji: string }> = {
    '耐克': { from: '#111111', to: '#f26522', emoji: '🏃' },
    '安踏集团': { from: '#c41230', to: '#e63946', emoji: '👟' },
    '滔搏体育': { from: '#1e3a5f', to: '#0d9488', emoji: '🏬' },
    'Keep': { from: '#1b4332', to: '#52b788', emoji: '💪' },
    '李宁': { from: '#c8102e', to: '#e8b830', emoji: '📱' },
    'YY胜道体育': { from: '#4c1d95', to: '#6366f1', emoji: '🛒' },
    '阿迪达斯': { from: '#1a1a1a', to: '#555555', emoji: '⭐' },
    '华为': { from: '#b71c1c', to: '#212121', emoji: '⌚' },
  }
  const b = brands[competitorName] ?? { from: '#1e293b', to: '#475569', emoji: '📊' }
  return renderCover({
    title: competitorName,
    accentFrom: b.from,
    accentTo: b.to,
    emoji: b.emoji,
    categoryLabel: '竞对情报',
    chips: [competitorName, '威胁预警', '动态追踪'],
    w,
    h,
  })
}
