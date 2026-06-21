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

export function coverFor(text: string, category: string): string {
  const hues: Record<string, number> = {
    competitor: 0, industry: 210, internal: 150, tech: 265, product: 40,
  }
  return placeholder(text, hues[category] ?? 25)
}
