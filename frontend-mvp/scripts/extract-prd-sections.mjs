import fs from 'node:fs'

const source = process.argv[2]
const starts = process.argv.slice(3)
const document = JSON.parse(fs.readFileSync(source, 'utf8'))

function textOf(node) {
  if (typeof node === 'string') return node
  if (!Array.isArray(node)) return ''
  return node.slice(1).map(textOf).join('')
}

const blocks = []
function walk(node) {
  if (!Array.isArray(node)) return
  const tag = typeof node[0] === 'string' ? node[0] : ''
  if (/^h[1-6]$/.test(tag)) {
    blocks.push({ tag, text: textOf(node).replace(/\s+/g, ' ').trim() })
  } else if (tag === 'p' || tag === 'li') {
    const text = textOf(node).replace(/\s+/g, ' ').trim()
    if (text) blocks.push({ tag, text })
  } else if (tag === 'tr') {
    const cells = node.filter((item) => Array.isArray(item) && item[0] === 'tc').map((cell) => textOf(cell).replace(/\s+/g, ' ').trim())
    if (cells.length) blocks.push({ tag, text: `| ${cells.join(' | ')} |` })
  }
  for (const child of node.slice(1)) walk(child)
}
walk(document.jsonml ?? document)

let active = starts.length === 0
let startLevel = 7
for (const block of blocks) {
  const level = /^h/.test(block.tag) ? Number(block.tag[1]) : 7
  if (!active && starts.some((start) => block.text.includes(start))) {
    active = true
    startLevel = level
  } else if (active && level <= startLevel && /^h/.test(block.tag) && !starts.some((start) => block.text.includes(start))) {
    break
  }
  if (active) console.log(`${/^h/.test(block.tag) ? '#'.repeat(level) + ' ' : ''}${block.text}`)
}
