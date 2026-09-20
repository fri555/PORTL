<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import {
  ArrowUp,
  BookmarkPlus,
  CalendarPlus,
  CalendarSearch,
  ClipboardCheck,
  Database,
  ExternalLink,
  Globe2,
  MessageSquareText,
  PackageSearch,
  Plus,
  Search,
  X,
} from 'lucide-vue-next'
import ReadonlyOverflowTags from './ReadonlyOverflowTags.vue'
import QuickPromptPanel from './QuickPromptPanel.vue'

type ChatMode = 'daily' | 'expert'

interface ExpertCard {
  id: string
  name: string
  department: string
  description: string
  tags: string[]
  avatar: string
  shortcuts: string[]
}

interface UserQuickPrompt {
  id: string
  scope: string
  title: string
  content: string
}

const emit = defineEmits<{
  send: [prompt: string]
  'expert-selected': [id: string]
  'mode-changed': [mode: ChatMode]
}>()

const productionAssets = `${import.meta.env.BASE_URL}assets/production-home`
const agentAssets = `${import.meta.env.BASE_URL}assets/agents-online`
const prompt = ref('')
const mode = ref<ChatMode>('daily')
const networkEnabled = ref(true)
const selectedExpert = ref<ExpertCard | null>(null)
const selectedDepartment = ref('全部')
const expertQuery = ref('')
const userQuickPrompts = ref<UserQuickPrompt[]>([])
const input = ref<HTMLTextAreaElement | null>(null)

const dailyPrompts = [
  { id: 'message', title: '发消息', text: '给「花名」发条钉钉消息：「内容」（拼音模糊搜索）', icon: MessageSquareText },
  { id: 'todo', title: '建待办', text: '给我建个钉钉待办：「标题」「内容」，「时间」前完成', icon: ClipboardCheck },
  { id: 'calendar-create', title: '建日程', text: '跟「花名」约钉钉会议：「时间」开「主题」会', icon: CalendarPlus },
  { id: 'calendar-search', title: '查日程', text: '查下我今天的钉钉日程', icon: CalendarSearch },
  { id: 'knowledge', title: '查知识库', text: '知识库中查下关于「关键词」的内容，并输出一份报告', icon: Database },
  { id: 'web', title: '网络查询', text: '网上查下关于「关键词」的内容，并生成一份报告', icon: Globe2 },
  { id: 'product', title: '查商品', text: '查询商品「货号或关键词」的基础信息、库存与销售情况', icon: PackageSearch, badge: 'NEW' },
]

const experts: ExpertCard[] = [
  {
    id: 'tianma-assistant',
    name: '天马智擎助手',
    department: '通用',
    description: '暂无简介',
    tags: ['钉钉', '商品信息', '日常办公'],
    avatar: `${agentAssets}/tianma-assistant.png`,
    shortcuts: ['查询钉钉信息', '查询商品信息'],
  },
  {
    id: 'data-analysis',
    name: '数据分析师',
    department: '通用',
    description: '上传数据表格进行分析，诊断异常指标，提供数据洞察及建议',
    tags: ['数据分析', '分析报告'],
    avatar: `${agentAssets}/data-analysis.png`,
    shortcuts: ['需求池分析', '商品池分析', '经营数据分析'],
  },
  {
    id: 'assortment',
    name: '组货专家',
    department: '平台部',
    description: '依照需求生成组货方案，包含预算、人数、性别比例和品类等需求',
    tags: ['团购商品池', 'CRM库存', '分析报告'],
    avatar: `${agentAssets}/assortment-expert.png`,
    shortcuts: ['生成组货方案', '按预算推荐商品'],
  },
  {
    id: 'review-analysis',
    name: '评论分析师',
    department: '线上店铺',
    description: '分析店铺评价数据（包含淘宝、天猫、京东），从客户评价出发，得出改进建议。',
    tags: ['自营店铺评论', '分析报告'],
    avatar: `${agentAssets}/review-analyst.png`,
    shortcuts: ['分析店铺评价', '生成改进建议'],
  },
  {
    id: 'marketing-graphic-designer',
    name: '营销图文设计师',
    department: '线下门店',
    description: '智能生成营销图文，依据商品货号及发布平台（微信、小红书、抖音等）',
    tags: ['商品信息', '内容中心', '图文生成'],
    avatar: `${agentAssets}/inspiration-king.png`,
    shortcuts: ['生成营销图文', '制作平台发布内容'],
  },
  {
    id: 'sales-order-analysis',
    name: '销售订单分析师',
    department: '平台部',
    description: '基于订单数据进行分析，结合客户信息，从五维度进行综合归因分析',
    tags: ['CRM订单', '马达客户', '分析报告'],
    avatar: `${agentAssets}/data-analysis.png`,
    shortcuts: ['分析销售订单', '生成归因报告'],
  },
  {
    id: 'spot-sales-analysis',
    name: '现货销售分析师',
    department: '商品部',
    description: '基于销售明细表分析，理解用户意图，查询整理数据并进行智能解读。',
    tags: ['销售明细表', '分析报告'],
    avatar: `${agentAssets}/data-analysis.png`,
    shortcuts: ['分析销售明细', '解读销售数据'],
  },
  {
    id: 'price-comparison',
    name: '全网比价助手',
    department: '线上店铺',
    description: '商品价格全网对比，获取商品在各平台（淘宝、天猫、京东、拼多多、抖音、唯品会）的最低折扣价',
    tags: ['全平台比价', '分析报告'],
    avatar: `${agentAssets}/data-analysis.png`,
    shortcuts: ['查询全网价格', '生成比价报告'],
  },
  {
    id: 'top-product-analysis',
    name: 'TOP款分析师',
    department: '线上店铺',
    description: '分析店铺周期TOP款数据，依据自营系统商品看板数据，诊断经营问题并提供解决方案',
    tags: ['自营商品看板', '分析报告'],
    avatar: `${agentAssets}/review-analyst.png`,
    shortcuts: ['分析TOP款经营', '诊断经营问题'],
  },
]

const departmentOrder = ['全部', '通用', '商品', '直播', 'B2B', 'B2C', '门店']

function expertDepartments(expert: ExpertCard) {
  const categoryMap: Record<string, string> = {
    '平台部': 'B2B',
    '商品部': '商品',
    '直播部': '直播',
    '线上店铺': 'B2C',
    '线下门店': '门店',
  }
  return [categoryMap[expert.department] ?? expert.department]
}

function expertTags(expert: ExpertCard) {
  return expert.tags
}

const availableDepartments = departmentOrder

const filteredExperts = computed(() => {
  const keyword = expertQuery.value.trim().toLowerCase()
  return experts.filter((expert) => {
    const departmentMatched = selectedDepartment.value === '全部'
      || expertDepartments(expert).includes(selectedDepartment.value)
    const searchText = [
      expert.name,
      expert.description,
      expert.department,
      ...expertTags(expert),
    ].join(' ').toLowerCase()
    return departmentMatched && (!keyword || searchText.includes(keyword))
  })
})

const quickPromptScope = computed(() => mode.value === 'daily' ? 'daily' : (selectedExpert.value?.id ?? 'expert'))
const quickPromptScopeLabel = computed(() => mode.value === 'daily' ? '日常办公' : (selectedExpert.value?.name ?? '业务专家'))
const scopedUserQuickPrompts = computed(() => userQuickPrompts.value.filter(item => item.scope === quickPromptScope.value))
const placeholder = computed(() => {
  if (mode.value === 'expert' && selectedExpert.value) return `向${selectedExpert.value.name}描述你的任务...`
  if (mode.value === 'expert') return '请在下方选择合适的专家。耶虎会匹配任务托付给他/她高效完成...'
  return '耶虎在线，随时向我提问或上传文件...'
})
const canSend = computed(() => !!prompt.value.trim() && (mode.value === 'daily' || !!selectedExpert.value))

function changeMode(nextMode: ChatMode) {
  mode.value = nextMode
  selectedExpert.value = null
  selectedDepartment.value = '全部'
  expertQuery.value = ''
  emit('mode-changed', nextMode)
}

function pickDailyPrompt(text: string) {
  prompt.value = text
  nextTick(() => input.value?.focus())
}

function pickExpert(expert: ExpertCard) {
  selectedExpert.value = expert
  prompt.value = ''
  emit('expert-selected', expert.id)
  nextTick(() => input.value?.focus())
}

function useShortcut(text: string) {
  prompt.value = text
  nextTick(() => input.value?.focus())
}

function send() {
  const value = prompt.value.trim()
  if (!value || !canSend.value) return
  emit('send', value)
  prompt.value = ''
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey) return
  event.preventDefault()
  send()
}
function insertQuickPrompt(text: string) {
  const el = input.value
  const start = el?.selectionStart ?? prompt.value.length
  const end = el?.selectionEnd ?? prompt.value.length
  prompt.value = `${prompt.value.slice(0, start)}${text}${prompt.value.slice(end)}`
  nextTick(() => { el?.focus(); el?.setSelectionRange(start + text.length, start + text.length) })
}
function createQuickPrompt(item: UserQuickPrompt) {
  userQuickPrompts.value.unshift(item)
}
function updateQuickPrompt(item: UserQuickPrompt) {
  const idx = userQuickPrompts.value.findIndex(p => p.id === item.id)
  if (idx !== -1) userQuickPrompts.value[idx] = { ...item }
}
function deleteQuickPrompt(id: string) {
  userQuickPrompts.value = userQuickPrompts.value.filter(p => p.id !== id)
}
</script>

<template>
  <section class="source-chat-home" data-testid="source-chat-home">
    <div class="source-chat-home__inner">
      <div class="source-chat-home__welcome" data-testid="home-welcome">
        <img
          class="source-chat-home__slogan"
          :src="`${productionAssets}/welcome-slogan-v11.svg`"
          alt="职场超能力，耶虎让你快人一步"
        />
        <img
          class="source-chat-home__mascot"
          :src="`${productionAssets}/mascot-xiaoma-v11.png`"
          alt="耶虎智能助手"
        />
      </div>

      <div class="source-chat-home__modes" data-testid="mode-switcher" role="tablist" aria-label="对话模式">
        <button type="button" role="tab" data-mode="daily" :aria-selected="mode === 'daily'" :class="{ active: mode === 'daily' }" @click="changeMode('daily')">日常办公</button>
        <button type="button" role="tab" data-mode="expert" :aria-selected="mode === 'expert'" :class="{ active: mode === 'expert' }" @click="changeMode('expert')">业务专家</button>
      </div>

      <div class="source-chat-home__composer" data-testid="hero-composer">
        <div v-if="mode === 'expert' && selectedExpert" class="source-chat-home__expert-summary">
          <div class="source-chat-home__selected-row">
            <span data-testid="selected-expert-chip" class="source-chat-home__selected-chip">
              <img :src="selectedExpert.avatar" alt="" />{{ selectedExpert.name }}
            </span>
            <span class="source-chat-home__selected-role">{{ selectedExpert.description }}</span>
          </div>
        </div>
        <textarea
          ref="input"
          v-model="prompt"
          rows="2"
          :placeholder="placeholder"
          aria-label="向小马提问"
          @keydown="onKeydown"
        />
        <div class="source-chat-home__toolbar">
          <button
            type="button"
            class="source-chat-home__icon-button"
            title="添加参考文件"
            aria-label="添加参考文件"
          >
            <Plus :size="19" />
          </button>
          <button
            type="button"
            class="source-chat-home__network"
            :class="{ 'is-enabled': networkEnabled }"
            :title="networkEnabled ? '联网搜索已开启，点击关闭' : '联网搜索已关闭，点击开启'"
            :aria-label="networkEnabled ? '关闭联网搜索' : '开启联网搜索'"
            @click="networkEnabled = !networkEnabled"
          >
            <Globe2 :size="16" />联网查询
          </button>

          <button
            type="button"
            class="source-chat-home__send"
            :disabled="!canSend"
            aria-label="发送"
            :title="canSend ? '发送' : mode === 'expert' && !selectedExpert ? '请先选择专家' : '请输入内容'"
            @click="send"
          >
            <ArrowUp :size="17" :stroke-width="2.2" />
          </button>
        </div>
      </div>

      <div v-if="mode === 'daily' || selectedExpert" class="source-chat-home__quick-entry" data-testid="quick-prompt-entry">
        <span>快捷提示语</span>
        <small>{{ quickPromptScopeLabel }}专属</small>
        <QuickPromptPanel :scope="quickPromptScope" :scope-label="quickPromptScopeLabel" :prompts="scopedUserQuickPrompts" @created="createQuickPrompt" @updated="updateQuickPrompt" @deleted="deleteQuickPrompt" />
      </div>

      <div v-if="mode === 'daily'" class="source-chat-home__daily-grid" data-testid="daily-prompt-grid">
        <h2 class="source-chat-home__section-title">快捷开始</h2>
        <button
          v-for="item in scopedUserQuickPrompts"
          :key="item.id"
          type="button"
          data-testid="user-quick-prompt-card"
          :title="item.content"
          :aria-label="`${item.title}：${item.content}`"
          @click="insertQuickPrompt(item.content)"
        >
          <span class="source-chat-home__daily-icon source-chat-home__daily-icon--custom"><BookmarkPlus :size="18" /></span>
          <span class="source-chat-home__daily-copy"><strong>{{ item.title }}</strong><small>{{ item.content }}</small></span>
          <ExternalLink class="source-chat-home__daily-arrow" :size="13" />
        </button>
        <button
          v-for="item in dailyPrompts"
          :key="item.title"
          type="button"
          :data-testid="item.id === 'product' ? 'daily-card-product' : undefined"
          :title="item.text"
          :aria-label="`${item.title}：${item.text}`"
          @click="pickDailyPrompt(item.text)"
        >
          <span class="source-chat-home__daily-icon"><component :is="item.icon" :size="18" /></span>
          <span class="source-chat-home__daily-copy">
            <strong>{{ item.title }}<em v-if="item.badge">{{ item.badge }}</em></strong>
            <small>{{ item.text }}</small>
          </span>
          <ExternalLink class="source-chat-home__daily-arrow" :size="13" />
        </button>
      </div>

      <div v-if="mode === 'expert' && !selectedExpert" class="source-chat-home__expert-area">
        <div class="source-chat-home__expert-sticky">
          <div class="source-chat-home__expert-toolbar" data-testid="expert-toolbar">
            <div class="source-chat-home__expert-tabs" data-testid="expert-department-tabs" role="tablist" aria-label="按部门筛选专家">
              <button
                v-for="department in availableDepartments"
                :key="department"
                type="button"
                role="tab"
                :data-department="department"
                :aria-selected="selectedDepartment === department"
                :class="{ active: selectedDepartment === department }"
                @click="selectedDepartment = department"
              >{{ department }}</button>
            </div>
            <label class="source-chat-home__expert-search">
              <Search :size="15" />
              <input v-model="expertQuery" aria-label="搜索专家" placeholder="搜索专家名称、简介..." />
              <button v-if="expertQuery" type="button" aria-label="清空专家搜索" @click="expertQuery = ''"><X :size="14" /></button>
            </label>
          </div>
        </div>
        <div v-if="filteredExperts.length" class="source-chat-home__expert-grid" data-testid="expert-grid">
          <button
            v-for="expert in filteredExperts"
            :key="expert.id"
            type="button"
            data-testid="expert-card"
            :aria-label="`选择${expert.name}，${expert.department}`"
            @click="pickExpert(expert)"
          >
            <img :src="expert.avatar" alt="" />
            <span class="source-chat-home__expert-copy">
              <span class="source-chat-home__expert-line" data-testid="expert-name-row">
                <strong>{{ expert.name }}</strong>
              </span>
              <span
                class="source-chat-home__expert-description"
                data-testid="expert-description-row"
                :title="expert.description"
              >{{ expert.description }}</span>
              <ReadonlyOverflowTags :tags="expertTags(expert)" />
            </span>
          </button>
        </div>
        <div v-else class="source-chat-home__expert-empty"><Search :size="24" /><strong>未找到匹配的专家</strong><button type="button" @click="expertQuery = ''; selectedDepartment = '全部'">清空筛选</button></div>
      </div>

      <div v-if="mode === 'expert' && selectedExpert" class="source-chat-home__expert-shortcuts" data-testid="expert-shortcut-grid">
        <button v-for="item in scopedUserQuickPrompts" :key="item.id" type="button" data-testid="user-quick-prompt-card" :title="item.content" @click="insertQuickPrompt(item.content)">
          {{ item.title }}<ExternalLink :size="12" />
        </button>
        <button v-for="shortcut in selectedExpert.shortcuts" :key="shortcut" type="button" :title="`使用快捷入口：${shortcut}`" :aria-label="`使用快捷入口：${shortcut}`" @click="useShortcut(shortcut)">{{ shortcut }}<ExternalLink :size="12" /></button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.source-chat-home {
  box-sizing: border-box;
  width: 100%;
  min-height: 100%;
  overflow: auto;
  padding: 123px 24px 48px;
  color: #111;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Microsoft YaHei', sans-serif;
}

.source-chat-home__inner {
  width: min(800px, 100%);
  margin: 0 auto;
}

.source-chat-home__welcome {
  position: relative;
  height: 50px;
  text-align: center;
}

.source-chat-home__slogan {
  display: block;
  width: 386px;
  max-width: calc(100% - 74px);
  height: 36px;
  margin: 0 auto;
  object-fit: contain;
}

.source-chat-home__mascot {
  position: absolute;
  top: 92px;
  right: 30px;
  width: 80px;
  height: 80px;
  object-fit: contain;
}

.source-chat-home__modes {
  display: flex;
  width: 206px;
  height: 38px;
  box-sizing: border-box;
  align-items: center;
  gap: 2px;
  margin: 6px auto 64px;
  border-radius: 24px;
  padding: 3px;
  background: #f7f7f9;
}

.source-chat-home__modes button {
  height: 32px;
  flex: 1;
  border: 0;
  border-radius: 18px;
  background: transparent;
  color: #777;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 160ms ease, box-shadow 160ms ease, color 160ms ease;
}

.source-chat-home__modes button.active {
  background: #fff;
  box-shadow: 0 1px 5px rgba(24, 24, 27, 0.1);
  color: #111;
  font-weight: 500;
}

.source-chat-home__composer {
  position: relative;
  z-index: 10;
  box-sizing: border-box;
  height: 150px;
  border: 1px solid #dedede;
  border-radius: 16px;
  padding: 11px 12px;
  background: #fff;
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.04);
}

.source-chat-home__composer:focus-within {
  border-color: #b7b7b7;
}

.source-chat-home__composer textarea {
  display: block;
  width: 100%;
  height: 96px;
  box-sizing: border-box;
  resize: none;
  border: 0;
  padding: 1px 3px;
  background: transparent;
  color: #222;
  font: inherit;
  font-size: 14px;
  line-height: 24px;
  outline: none;
}

.source-chat-home__composer textarea::placeholder {
  color: #b8b8b8;
}

.source-chat-home__toolbar {
  display: flex;
  height: 34px;
  align-items: center;
  gap: 8px;
}

.source-chat-home__toolbar button {
  border: 0;
  font: inherit;
  cursor: pointer;
}

.source-chat-home__icon-button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 8px;
  background: transparent;
  color: #333;
}

.source-chat-home__icon-button:hover {
  background: #f5f5f5;
}

.source-chat-home__network {
  display: flex;
  height: 32px;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  padding: 0 10px;
  background: transparent;
  color: #777;
  font-size: 12px !important;
}

.source-chat-home__network.is-enabled {
  background: #eef5ff;
  color: #3b75d6;
}

.source-chat-home__send {
  display: grid;
  width: 36px;
  height: 36px;
  margin-left: auto;
  place-items: center;
  border-radius: 50%;
  background: #111;
  color: #fff;
}

.source-chat-home__send:disabled {
  background: #d7d7d7;
  cursor: default;
}

.source-chat-home__quick-entry {
  display: flex;
  height: 26px;
  align-items: center;
  gap: 7px;
  margin: 4px 0 0;
  color: #4b4b50;
  font-size: 12px;
}

.source-chat-home__quick-entry > span {
  font-weight: 600;
}

.source-chat-home__quick-entry > small {
  color: #a1a1aa;
}

.source-chat-home__quick-entry :deep(.quick-wrap) {
  margin-left: auto;
}

.source-chat-home__daily-grid,
.source-chat-home__expert-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 12px;
  row-gap: 8px;
}

.source-chat-home__daily-grid {
  margin-top: 6px;
}

.source-chat-home__section-title {
  grid-column: 1 / -1;
  margin: 0 0 2px;
  color: #666;
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
}

.source-chat-home__daily-grid > button {
  display: flex;
  min-width: 0;
  min-height: 74px;
  align-items: center;
  gap: 12px;
  border: 1px solid #ededed;
  border-radius: 16px;
  padding: 0 16px;
  background: #fff;
  color: #111;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}

.source-chat-home__daily-grid > button:hover {
  border-color: #d5d5d5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.source-chat-home__daily-icon {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  place-items: center;
  border-radius: 8px;
  background: #f7f7f7;
  color: #333;
}

.source-chat-home__daily-icon--custom {
  background: #eef4ff;
  color: #376fd0;
}

.source-chat-home__daily-copy {
  flex: 1;
  min-width: 0;
}

.source-chat-home__daily-arrow {
  flex: none;
  align-self: flex-start;
  margin-top: 14px;
  color: #111;
}

.source-chat-home__daily-copy strong,
.source-chat-home__daily-copy small {
  display: block;
}

.source-chat-home__daily-copy strong {
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
}

.source-chat-home__daily-copy em {
  display: inline-block;
  margin-left: 6px;
  border-radius: 4px;
  padding: 0 4px;
  background: #fff0e7;
  color: #ff6b22;
  font-size: 9px;
  font-style: normal;
  font-weight: 600;
  line-height: 16px;
  vertical-align: 1px;
}

.source-chat-home__daily-copy small {
  overflow: hidden;
  margin-top: 4px;
  color: #999;
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-chat-home__expert-area {
  margin-top: 14px;
  max-height: 372px;
  overflow: auto;
  border-radius: 12px;
  scrollbar-width: none;
}
.source-chat-home__expert-area::-webkit-scrollbar{display:none}

.source-chat-home__expert-sticky{position:sticky;z-index:4;top:0;padding-bottom:10px;background:#fff}

.source-chat-home__expert-toolbar{display:flex;align-items:center;gap:14px;border-bottom:1px solid #eee}.source-chat-home__expert-toolbar>.source-chat-home__expert-tabs{min-width:0;flex:1}.source-chat-home__expert-toolbar>.source-chat-home__expert-search{flex:0 0 248px;margin-bottom:4px}

.source-chat-home__expert-search{display:flex;width:248px;height:32px;align-items:center;gap:7px;border:1px solid #e3e3e3;border-radius:8px;padding:0 9px;color:#999}.source-chat-home__expert-search input{min-width:0;flex:1;border:0;outline:0;font:12px inherit}.source-chat-home__expert-search button{display:grid;width:22px;height:22px;place-items:center;border:0;border-radius:5px;background:transparent;color:#999}.source-chat-home__expert-tabs{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none}.source-chat-home__expert-tabs::-webkit-scrollbar{display:none}.source-chat-home__expert-tabs button{height:32px;flex:0 0 auto;border:0;border-bottom:2px solid transparent;padding:0 10px;background:#fff;color:#777;font:12px inherit;cursor:pointer}.source-chat-home__expert-tabs button.active{border-color:#1677ff;color:#1677ff;font-weight:600}

.source-chat-home__expert-grid > button {
  display: flex;
  min-width: 0;
  min-height: 98px;
  align-items: center;
  gap: 10px;
  border: 1px solid #ededed;
  border-radius: 12px;
  padding: 9px 12px;
  background: #fff;
  color: #111;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}

.source-chat-home__expert-grid > button:hover {
  transform: translateY(-1px);
  border-color: #d6d6d6;
  box-shadow: 0 5px 16px rgba(0, 0, 0, 0.07);
}

.source-chat-home__expert-grid img {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 50%;
  background: #f7f7f7;
  object-fit: cover;
}

.source-chat-home__expert-grid .source-chat-home__expert-copy {
  display: grid;
  flex: 1;
  grid-template-rows: 20px 16px 18px;
  gap: 4px;
  min-width: 0;
}

.source-chat-home__expert-grid strong,
.source-chat-home__expert-grid small,
.source-chat-home__expert-description {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.source-chat-home__expert-line{display:flex;min-width:0;align-items:center;gap:7px}

.source-chat-home__expert-grid strong {
  min-width: 0;
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.source-chat-home__expert-grid small {
  flex:0 0 auto;
  border:1px solid #d6eaff;
  border-radius:3px;
  padding:1px 4px;
  background:#f3f8ff;
  color:#1677ff;
  font-size: 11px;
  line-height: 16px;
}
.source-chat-home__expert-description{display:block;color:#858b96;font-size:11px;line-height:16px;cursor:help}
.source-chat-home__expert-empty{display:grid;min-height:190px;place-items:center;align-content:center;gap:8px;color:#aaa}.source-chat-home__expert-empty strong{color:#555;font-size:13px}.source-chat-home__expert-empty button{border:0;background:transparent;color:#1677ff;font:12px inherit}

.source-chat-home__expert-summary {
  margin:0 2px 7px;
}
.source-chat-home__expert-summary + textarea{height:42px}

.source-chat-home__selected-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.source-chat-home__selected-chip {
  display: inline-flex;
  height: 28px;
  align-items: center;
  gap: 7px;
  border-radius: 14px;
  padding: 0 10px 0 4px;
  background: #111;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
}

.source-chat-home__selected-chip img {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
}

.source-chat-home__selected-role {
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  color: #777;
  font-size: 12px;
}

.source-chat-home__expert-shortcuts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}

.source-chat-home__expert-shortcuts button {
  display: inline-flex;
  height: 30px;
  align-items: center;
  gap: 6px;
  border: 1px solid #ededed;
  border-radius: 16px;
  padding: 0 12px;
  background: #fff;
  color: #222;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}

.source-chat-home__expert-shortcuts button:hover {
  border-color: #d1d1d1;
  box-shadow: 0 2px 7px rgba(0,0,0,.05);
  color: #111;
}

@media (max-width: 760px) {
  .source-chat-home {
    padding: 58px 12px 32px;
  }

  .source-chat-home__mascot {
    right: -4px;
    width: 78px;
    height: 78px;
  }

  .source-chat-home__modes {
    margin-top: 4px;
  }

  .source-chat-home__daily-grid,
  .source-chat-home__expert-grid {
    grid-template-columns: 1fr;
  }

  .source-chat-home__daily-grid {
    margin-right: 0;
    margin-left: 0;
  }

  .source-chat-home__network {
    width: 32px;
    justify-content: center;
    overflow: hidden;
    padding: 0;
    color: transparent;
  }

  .source-chat-home__network svg {
    flex: 0 0 16px;
    color: #3b75d6;
  }
}

@media (min-width: 761px) and (max-width: 1100px) {
  .source-chat-home__daily-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
