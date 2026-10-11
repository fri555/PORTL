import { computed, nextTick, onMounted, ref, watch, type Ref } from 'vue'
import type { Agent } from '@/types/agent'
import { readExpertSendRecent, type ExpertSendRecent } from '@/utils/expertSendRecent'

export const MENTION_PAGE_SIZE = 5

export function useExpertMention(text: Ref<string>, input: Ref<HTMLTextAreaElement | null>, experts: Ref<Agent[]>, select: (agent: Agent) => void) {
  const open = ref(false)
  const keyword = ref('')
  const activeIndex = ref(0)
  // A page is one loaded batch; later entity types can keep their own batch state.
  const activeType = ref<'expert'>('expert')
  const page = ref(1)
  const range = ref({ start: 0, end: 0 })
  const composing = ref(false)
  const recent = ref<ExpertSendRecent>({})
  const allResults = computed(() => {
    const query = keyword.value.toLowerCase()
    return experts.value
      .filter(agent => [agent.name, agent.description].join(' ').toLowerCase().includes(query))
      .map((agent, sourceIndex) => ({ agent, sourceIndex }))
      .sort((a, b) => (recent.value[b.agent.id] ?? 0) - (recent.value[a.agent.id] ?? 0) || a.sourceIndex - b.sourceIndex)
      .map(item => item.agent)
  })
  const pageCount = computed(() => Math.max(1, Math.ceil(allResults.value.length / MENTION_PAGE_SIZE)))
  const results = computed(() => allResults.value.slice(0, page.value * MENTION_PAGE_SIZE))
  const hasMore = computed(() => results.value.length < allResults.value.length)
  function loadMore() { if (hasMore.value) page.value++ }
  watch([keyword, experts], () => { page.value = 1; activeIndex.value = 0 })
  watch(pageCount, count => { if (page.value > count) page.value = count })
  function setPage(next: number) { page.value = Math.min(pageCount.value, Math.max(1, next)); activeIndex.value = 0 }
  function update() {
    if (composing.value) return
    const end = input.value?.selectionStart ?? text.value.length
    const match = /[@＠]([^\s@＠]{0,60})$/u.exec(text.value.slice(0, end))
    if (!match || input.value?.selectionStart !== input.value?.selectionEnd) { open.value = false; return }
    // One opening has one ranking snapshot, including later batches and searches.
    if (!open.value) recent.value = readExpertSendRecent()
    const nextKeyword = match[1] ?? ''
    if (!open.value || nextKeyword !== keyword.value || range.value.end !== end) { activeIndex.value = 0; page.value = 1 }
    keyword.value = nextKeyword
    if (keyword.value.length > 60) { open.value = false; return }
    range.value = { start: end - keyword.value.length - 1, end }
    open.value = true
  }
  function choose(agent: Agent) {
    if (!open.value || !allResults.value.some(item => item.id === agent.id)) return
    const { start, end } = range.value
    if (!/^[@＠]/u.test(text.value.slice(start, end)) || text.value.slice(start + 1, end) !== keyword.value) { open.value = false; return }
    text.value = text.value.slice(0, start) + text.value.slice(end)
    open.value = false; select(agent)
    nextTick(() => { input.value?.focus(); input.value?.setSelectionRange(start, start) })
  }
  function keydown(event: KeyboardEvent) {
    if (composing.value || event.isComposing || event.keyCode === 229) return true
    if (!open.value) return false
    if (event.key === 'Escape') { event.preventDefault(); open.value = false; return true }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (event.shiftKey) { open.value=false; return false }
      event.preventDefault()
      if (results.value.length) {
        if (event.key === 'ArrowDown' && activeIndex.value === results.value.length - 1 && hasMore.value) {
          loadMore(); activeIndex.value++
        } else activeIndex.value = (activeIndex.value + (event.key === 'ArrowDown' ? 1 : -1) + results.value.length) % results.value.length
      }
      return true
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); const agent = results.value[activeIndex.value]; if (agent) choose(agent)
      return true
    }
    if (event.key === 'Tab') open.value = false
    return false
  }
  function inputChanged() { nextTick(update) }
  function caretChanged(event: KeyboardEvent) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { if (open.value && !event.shiftKey) return }
    if (['Home','End','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key) || event.shiftKey) update()
  }
  function startComposition() { composing.value = true; open.value = false }
  function endComposition() { composing.value = false; nextTick(update) }
  onMounted(() => { if (text.value) nextTick(() => { input.value?.setSelectionRange(text.value.length, text.value.length); update() }) })
  return { open, keyword, activeIndex, results, allResults, activeType, page, pageCount, setPage, hasMore, loadMore, choose, keydown, update, caretChanged, inputChanged, startComposition, endComposition }
}

