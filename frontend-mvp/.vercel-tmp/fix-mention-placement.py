from pathlib import Path
p=Path('src/components/chat/source-clone/ExpertMentionMenu.vue')
s=p.read_text(encoding='utf-8-sig')
s=s.replace('const listHeight = ref(248)', 'const listHeight = ref(248)\nconst availableHeight = ref(0)')
s=s.replace('''  const above = Math.max(0, bounds.top - 80)
  const underneath = Math.max(0, window.innerHeight - bounds.bottom - 16)
  below.value = above < 210 && underneath > above
  listHeight.value = Math.min(248, Math.max(64, (below.value ? underneath : above) - 92))''', '''  const above = Math.max(0, bounds.top - 80 - 8)
  const underneath = Math.max(0, window.innerHeight - bounds.bottom - 16)
  const list = panel.value?.querySelector<HTMLElement>('.mention-list')
  const measuredChrome = (panel.value?.getBoundingClientRect().height ?? 0) - (list?.getBoundingClientRect().height ?? 0)
  const chromeHeight = measuredChrome > 0 ? measuredChrome : 124
  const fullListHeight = Math.min(248, Math.max(64, props.experts.length * 42 + 9))
  below.value = above < fullListHeight + chromeHeight && underneath > above
  availableHeight.value = below.value ? underneath : above
  listHeight.value = Math.min(248, Math.max(0, availableHeight.value - chromeHeight))''')
s=s.replace("watch(() => props.activeIndex", "watch(() => props.experts.length, () => nextTick(place))\nwatch(() => props.activeIndex")
s=s.replace("class=\"mention-panel\" :class=\"{ 'mention-panel--below': below }\"", "class=\"mention-panel\" :style=\"{ maxHeight: availableHeight ? `${availableHeight}px` : undefined }\" :class=\"{ 'mention-panel--below': below }\"")
s=s.replace('.mention-panel{position:absolute;', '.mention-panel{display:flex;flex-direction:column;position:absolute;')
s=s.replace('.mention-search{display:flex;', '.mention-search{flex-shrink:0;display:flex;')
s=s.replace('.mention-types{display:flex;', '.mention-types{flex-shrink:0;display:flex;')
s=s.replace('.mention-list{overflow:auto;', '.mention-list{min-height:0;overflow:auto;')
s=s.replace('.mention-panel footer{display:flex;', '.mention-panel footer{flex-shrink:0;display:flex;')
p.write_text(s,encoding='utf-8')
