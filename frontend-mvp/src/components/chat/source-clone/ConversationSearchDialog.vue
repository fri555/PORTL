<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronDown, MessageSquareText, Search, X } from 'lucide-vue-next'

type SearchItem = {
  id: string
  session: string
  message: string
  mode: 'daily' | 'expert'
  role: 'user' | 'assistant'
  title: string
  sender: string
  excerpt: string
  date: string
}

const emit = defineEmits<{ close: []; open: [sessionId: string, messageId?: string] }>()
const query = ref('')
const visibleCount = ref(20)
const historyExpanded = ref(false)

// 级联筛选
const filterCategory = ref('')
const filterAgent = ref('')
const agentCascadeOpen = ref(false)

const agentTree = [
  { label: '日常办公', agents: [{ value: '耶虎', label: '耶虎' }] },
  { label: '业务专家', agents: [
    { value: '大表姐', label: '大表姐' },
    { value: '组货专家', label: '组货专家' },
    { value: '评价分析师', label: '评价分析师' },
    { value: '灵感大王', label: '灵感大王' },
  ]},
]
const currentCategory = computed(() => agentTree.find(c => c.label === filterCategory.value))
function selectCategory(label: string) {
  filterCategory.value = filterCategory.value === label ? '' : label
  filterAgent.value = ''
}
function selectAgent(value: string) {
  filterAgent.value = filterAgent.value === value ? '' : value
  agentCascadeOpen.value = false
}
function clearFilter() {
  filterCategory.value = ''
  filterAgent.value = ''
  agentCascadeOpen.value = false
}
const filterLabel = computed(() => {
  if (filterAgent.value) return filterAgent.value
  if (filterCategory.value) return filterCategory.value
  return '全部会话'
})

const baseResults: SearchItem[] = [
  {
    id: 'msg-1',
    session: 'daily-auth',
    message: 'answer-02',
    mode: 'daily',
    role: 'assistant',
    title: '主对话',
    sender: '小智',
    excerpt:
      '电脑、文件、夜虎辅助人物布局：中间场景插画，上方标题，下方功能区。会议相关内容需要整理成清晰结论和后续行动。',
    date: '9月15日 23:05',
  },
  {
    id: 'msg-2',
    session: 'expert-capability',
    message: 'answer-01',
    mode: 'expert',
    role: 'assistant',
    title: '天马智擎 V1.1.0 宣传物料成品文案细化稿',
    sender: '数据分析师',
    excerpt:
      '知识润色邮件，整理会议内容、搭建汇报与方案框架，告诉小智你要写给谁、解决什么问题、希望什么语气。',
    date: '9月15日 23:05',
  },
  {
    id: 'msg-3',
    session: 'daily-auth',
    message: 'question-01',
    mode: 'daily',
    role: 'user',
    title: '工作日志',
    sender: '我',
    excerpt: '预约下周二专项培训会议，提前锁定培训排期，负责人朝暮，5.2 同步更新智能体介绍文档。',
    date: '9月8日 21:03',
  },
  {
    id: 'msg-4',
    session: 'expert-capability',
    message: 'question-02',
    mode: 'expert',
    role: 'user',
    title: 'AI互动设备介绍',
    sender: '数据分析师',
    excerpt: '会议摘要、穿戴式 AI 交互设备、AI 智能眼镜与竞品资料需要形成统一的分析报告。',
    date: '9月8日 15:08',
  },
]
const recentResults: SearchItem[] = Array.from({ length: 24 }, (_, index) => ({
  ...baseResults[index % baseResults.length]!,
  id: `recent-${index + 1}`,
  message: `recent-message-${index + 1}`,
  date: index < 4 ? baseResults[index]!.date : `8月${28 - (index % 20)}日 ${String(20 - (index % 8)).padStart(2, '0')}:0${index % 6}`,
}))
const olderResults: SearchItem[] = Array.from({ length: 20 }, (_, index) => ({
  ...baseResults[index % baseResults.length]!, id: `older-${index + 1}`, message: `older-message-${index + 1}`, date: `6月${28 - (index % 20)}日`,
}))
const results = computed(() => historyExpanded.value ? [...recentResults, ...olderResults] : recentResults)

const filtered = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return results.value.filter((item) => {
    if (keyword && !`${item.title}${item.excerpt}`.toLowerCase().includes(keyword)) return false
    if (filterCategory.value) {
      const cat = agentTree.find(c => c.label === filterCategory.value)
      if (cat) {
        const agentValues = cat.agents.map(a => a.value)
        if (!agentValues.includes(item.sender) && !agentValues.includes(item.title)) {
          // fallback: match by mode for daily/expert
          if (filterCategory.value === '日常办公' && item.mode !== 'daily') return false
          if (filterCategory.value === '业务专家' && item.mode !== 'expert') return false
        }
      }
    }
    if (filterAgent.value && item.sender !== filterAgent.value && item.title !== filterAgent.value) return false
    return true
  })
})
const visibleResults = computed(() => filtered.value.slice(0, visibleCount.value))
const canLoadPage = computed(() => visibleCount.value < filtered.value.length)
function onResultsScroll(event: Event) {
  const el = event.currentTarget as HTMLElement
  if (canLoadPage.value && el.scrollTop + el.clientHeight >= el.scrollHeight - 48) visibleCount.value += 20
}
function loadOlder() {
  historyExpanded.value = true
  visibleCount.value += 20
}
watch([query, filterCategory, filterAgent], () => { visibleCount.value = 20; historyExpanded.value = false })

function excerptData(text: string) {
  const keyword = query.value.trim()
  if (!keyword) return { segments: [{ text, matched: false }], leading: false, trailing: false }
  const index = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (index < 0) return { segments: [{ text, matched: false }], leading: false, trailing: false }
  const context = 18
  const start = Math.max(0, index - context)
  const end = Math.min(text.length, index + keyword.length + context)
  const excerpt = text.slice(start, end)
  const segments: Array<{ text: string; matched: boolean }> = []
  let cursor = 0
  let matchIndex = excerpt.toLowerCase().indexOf(keyword.toLowerCase())
  while (matchIndex >= 0) {
    if (matchIndex > cursor)
      segments.push({ text: excerpt.slice(cursor, matchIndex), matched: false })
    segments.push({ text: excerpt.slice(matchIndex, matchIndex + keyword.length), matched: true })
    cursor = matchIndex + keyword.length
    matchIndex = excerpt.toLowerCase().indexOf(keyword.toLowerCase(), cursor)
  }
  if (cursor < excerpt.length) segments.push({ text: excerpt.slice(cursor), matched: false })
  return {
    segments,
    leading: start > 0,
    trailing: end < text.length,
  }
}
</script>

<template>
  <div class="search-mask" @mousedown.self="emit('close'); agentCascadeOpen = false">
    <section class="search-panel" role="dialog" aria-modal="true" aria-label="搜索会话">
      <header class="search-head">
        <div class="search-box">
          <Search :size="18" />
          <input v-model="query" autofocus placeholder="搜索消息内容" aria-label="搜索会话关键词" />
          <button
            v-if="query"
            type="button"
            class="clear"
            aria-label="清空搜索"
            @click="query = ''"
          >
            清除
          </button>
        </div>
        <button
          type="button"
          class="close"
          aria-label="关闭搜索"
          title="关闭"
          @click="emit('close')"
        >
          <X :size="19" />
        </button>
      </header>

      <div class="filters" @click.self="agentCascadeOpen = false">
        <div class="cascade-select" :class="{ open: agentCascadeOpen }">
          <button type="button" class="cascade-trigger" @click="agentCascadeOpen = !agentCascadeOpen">
            <span>{{ filterLabel }}</span>
            <ChevronDown :size="14" />
          </button>
          <div v-if="agentCascadeOpen" class="cascade-panel" @click.stop>
            <div class="cascade-col">
              <button type="button" :class="{ active: !filterCategory }" @click="clearFilter">全部</button>
              <button
                v-for="cat in agentTree" :key="cat.label"
                type="button"
                :class="{ active: filterCategory === cat.label }"
                @click="selectCategory(cat.label)"
              >{{ cat.label }}</button>
            </div>
            <div v-if="currentCategory" class="cascade-col">
              <button
                v-for="agent in currentCategory.agents" :key="agent.value"
                type="button"
                :class="{ active: filterAgent === agent.value }"
                @click="selectAgent(agent.value)"
              >{{ agent.label }}</button>
            </div>
          </div>
        </div>
        <span>{{ filtered.length }} 条结果</span>
      </div>

      <div class="results" @scroll="onResultsScroll">
        <button
          v-for="item in visibleResults"
          :key="item.id"
          type="button"
          data-testid="search-result-message"
          @click="emit('open', item.session, item.message)"
        >
          <span class="result-icon"><MessageSquareText :size="16" /></span>
          <span class="result-copy">
            <span class="result-title"
              ><b>{{ item.title }}</b
              ><time>{{ item.date }}</time></span
            >
          </span>
        </button>
        <p v-if="!filtered.length" class="empty">没有找到符合筛选条件的消息</p>
        <button v-if="filtered.length && !canLoadPage && !historyExpanded" type="button" class="load-more" aria-label="查看3个月前的消息" @click="loadOlder">查看 3 个月前的消息</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.search-mask {
  position: fixed;
  z-index: 800;
  inset: 0;
  display: flex;
  justify-content: center;
  padding-top: 4vh;
  background: rgba(20, 24, 32, 0.38);
  backdrop-filter: blur(2px);
  font-family: system-ui, 'PingFang SC', sans-serif;
}
.search-panel {
  width: min(800px, calc(100vw - 40px));
  height: min(720px, calc(100vh - 72px));
  overflow: hidden;
  border: 1px solid #e8e9ec;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 24px 80px rgba(20, 24, 32, 0.22);
}
.search-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 24px 12px;
}
.search-box {
  display: flex;
  height: 40px;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 9px;
  border: 1px solid #dcdfe5;
  border-radius: 8px;
  padding: 0 11px;
  color: #7b8491;
}
.search-box:focus-within {
  border-color: #7ba7ea;
  box-shadow: 0 0 0 3px rgba(48, 119, 226, 0.08);
}
.search-box input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  font-size: 14px;
}
.search-head button {
  border: 0;
  background: transparent;
}
.search-box .clear {
  color: #aaa;
  font-size: 12px;
}
.close {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 8px !important;
  color: #8e939b;
}
.close:hover {
  background: #f5f5f6;
}
.filters {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 24px 12px;
}
.filters select,
.cascade-select {
  position: relative;
}
.cascade-trigger {
  display: flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 12px;
  border: 1px solid #e3e5e9; border-radius: 16px;
  background: #f6f7f8; color: #333; font-size: 13px;
  cursor: pointer;
}
.cascade-trigger:hover { border-color: #c8cad0; }
.cascade-select.open .cascade-trigger { border-color: #7ba7ea; box-shadow: 0 0 0 3px rgba(48,119,226,.08); }
.cascade-panel {
  position: absolute; top: calc(100% + 6px); left: 0; z-index: 30;
  display: flex; gap: 0;
  border: 1px solid #e3e5e9; border-radius: 12px;
  background: #fff; box-shadow: 0 8px 24px rgba(20,24,32,.12);
  overflow: hidden; min-width: 260px;
}
.cascade-col {
  display: flex; flex-direction: column; padding: 6px;
  min-width: 120px;
}
.cascade-col + .cascade-col { border-left: 1px solid #eee; }
.cascade-col button {
  padding: 7px 12px; border: 0; border-radius: 6px;
  background: transparent; text-align: left;
  font-size: 13px; color: #3f3f46; cursor: pointer;
}
.cascade-col button:hover { background: #f4f4f5; }
.cascade-col button.active { background: #eef4ff; color: #176fe8; font-weight: 500; }
.filters > span {
  margin-left: auto;
  color: #a0a4ab;
  font-size: 12px;
}
.results {
  max-height: 620px;
  overflow: auto;
  padding: 2px 22px 20px;
}
.results > button {
  display: grid;
  width: 100%;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: start;
  gap: 10px;
  border: 0;
  border-radius: 12px;
  padding: 11px 10px;
  background: #fff;
  text-align: left;
}
.results > button:hover {
  background: #f5f5f6;
}
.result-icon {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid #d6e8fb;
  border-radius: 50%;
  background: #eef8ff;
  color: #6d879e;
}
.result-copy {
  min-width: 0;
}
.result-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.result-title b {
  overflow: hidden;
  color: #17191d;
  font-size: 14px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-title time {
  flex: none;
  color: #aaadb2;
  font-size: 12px;
}
.empty {
  padding: 70px;
  text-align: center;
  color: #999;
}
.results > .load-more { display:block; width:fit-content; margin:14px auto 4px; border:1px solid #dfe4ec; border-radius:18px; padding:8px 18px; background:#fff; color:#3f6fae; }
</style>
