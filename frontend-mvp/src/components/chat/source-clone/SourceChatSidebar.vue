<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Bot,
  Coffee,
  FolderPlus,
  MoreHorizontal,
  PanelLeftClose,
  Pin,
  PinOff,
  Pencil,
  Search,
  Share2,
  SquarePen,
  Trash2,
} from 'lucide-vue-next'

const router = useRouter()

export interface SourceChatSession {
  id: string
  title: string
  timestamp: string
  mode: 'daily' | 'expert'
  avatar?: string
}

const props = withDefaults(defineProps<{
  activeSessionId?: string
  dailySessions?: SourceChatSession[]
  expertSessions?: SourceChatSession[]
  additionalSessions?: SourceChatSession[]
}>(), {
  activeSessionId: '',
  additionalSessions: () => [],
})

const emit = defineEmits<{
  'new-chat': []
  search: []
  collapse: []
  'open-session': [sessionId: string]
  'open-files': []
  'rename-session': [sessionId: string]
  'share-session': [sessionId: string]
  'delete-session': [sessionId: string]
}>()

const assetBase = import.meta.env.BASE_URL

const capturedDaily: SourceChatSession[] = [
  { id: 'daily-default', title: '天马智擎助手 通用助手 默认智能体 已启用 20', timestamp: '2026-08-27 13:23', mode: 'daily' },
  { id: 'daily-auth', title: '获取下我钉钉上相关信息', timestamp: '2026-08-27 10:41', mode: 'daily' },
  { id: 'daily-document', title: '看下这个文档和附件 你觉得有什么需要优化的地方', timestamp: '2026-08-26 15:28', mode: 'daily' },
  { id: 'daily-message', title: '给赵伟朝发消息', timestamp: '2026-08-25 17:34', mode: 'daily' },
  { id: 'daily-calendar', title: '给我跟清晖建一个11：30的日程 但是不要提醒', timestamp: '2026-08-24 11:24', mode: 'daily' },
  { id: 'daily-weekly', title: '整理本周工作安排', timestamp: '2026-08-23 10:00', mode: 'daily' },
  { id: 'daily-summary', title: '汇总会议待办事项', timestamp: '2026-08-22 09:00', mode: 'daily' },
]

const capturedExpert: SourceChatSession[] = [
  { id: 'expert-top-status', title: '分析下耶运动旗舰店的TOP款现状', timestamp: '2026-08-27 13:10', mode: 'expert', avatar: `${assetBase}assets/expert-analysis.png` },
  { id: 'expert-sales-change', title: '本月销售额与上月对比如何，异常波动在哪', timestamp: '2026-08-26 15:43', mode: 'expert', avatar: `${assetBase}assets/expert-marketing.png` },
  { id: 'expert-capability', title: '你能做什么', timestamp: '2026-08-26 10:58', mode: 'expert', avatar: `${assetBase}assets/expert-analysis.png` },
  { id: 'expert-profit', title: '看下这个店铺的利润情况，进行分析，并给出整改建议', timestamp: '2026-08-25 18:22', mode: 'expert', avatar: `${assetBase}assets/expert-analysis.png` },
  { id: 'expert-time', title: '当前是什么时间', timestamp: '2026-08-25 14:32', mode: 'expert', avatar: `${assetBase}assets/agents-online/data-analysis.png` },
  { id: 'expert-stock', title: '核对本周库存周转情况', timestamp: '2026-08-24 10:00', mode: 'expert' },
  { id: 'expert-weekly', title: '整理经营周报', timestamp: '2026-08-23 09:00', mode: 'expert' },
]

const removedIds = ref(new Set<string>())
function combinedSessions(mode: 'daily' | 'expert', captured: SourceChatSession[]) {
  const local = props.additionalSessions.filter(item => item.mode === mode)
  const localIds = new Set(local.map(item => item.id))
  return [...local, ...captured.filter(item => !localIds.has(item.id))].filter(item => !removedIds.value.has(item.id))
}
const dailyItems = computed(() => combinedSessions('daily', props.dailySessions ?? capturedDaily))
const expertItems = computed(() => combinedSessions('expert', props.expertSessions ?? capturedExpert))
const pinnedOrder = ref<string[]>(['expert-top-status', 'daily-auth'])
const allItems = computed(() => [...dailyItems.value, ...expertItems.value])
watch(allItems, items => { const present = new Set(items.map(item=>item.id)); pinnedOrder.value = pinnedOrder.value.filter(id=>present.has(id)) }, { immediate: true })
const dailyExpanded = ref(false)
const expertExpanded = ref(false)
function orderSessions(items: SourceChatSession[]) {
  return [...items].sort((a, b) => {
    const aPin = pinnedOrder.value.indexOf(a.id), bPin = pinnedOrder.value.indexOf(b.id)
    if (aPin >= 0 || bPin >= 0) return aPin < 0 ? 1 : bPin < 0 ? -1 : aPin - bPin
    return b.timestamp.localeCompare(a.timestamp) || a.id.localeCompare(b.id)
  })
}
const visibleDailyItems = computed(() => orderSessions(dailyItems.value).slice(0, dailyExpanded.value ? undefined : 5))
const visibleExpertItems = computed(() => orderSessions(expertItems.value).slice(0, expertExpanded.value ? undefined : 5))
const openMenuId = ref<string | null>(null)

function toggleMenu(event: MouseEvent, sessionId: string) {
  event.stopPropagation()
  openMenuId.value = openMenuId.value === sessionId ? null : sessionId
}

function runMenuAction(event: MouseEvent, action: 'rename-session' | 'share-session' | 'delete-session', sessionId: string) {
  event.stopPropagation()
  if (action === 'rename-session') emit('rename-session', sessionId)
  else if (action === 'share-session') emit('share-session', sessionId)
  else emit('delete-session', sessionId)
  openMenuId.value = null
}

function togglePin(event: MouseEvent, sessionId: string) {
  event.stopPropagation()
  pinnedOrder.value = pinnedOrder.value.includes(sessionId)
    ? pinnedOrder.value.filter(id => id !== sessionId)
    : [sessionId, ...pinnedOrder.value]
  openMenuId.value = null
}

function closeMenu() {
  openMenuId.value = null
}
function removeSession(id:string) { removedIds.value.add(id); pinnedOrder.value=pinnedOrder.value.filter(item=>item!==id) }
defineExpose({ removeSession })

onMounted(() => document.addEventListener('click', closeMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeMenu))
</script>

<template>
  <aside class="source-chat-sidebar" data-testid="source-chat-sidebar" aria-label="会话侧边栏">
    <div class="source-chat-sidebar__tools">
      <button class="source-chat-sidebar__icon-button" type="button" aria-label="搜索会话" title="搜索会话" @click="emit('search')">
        <Search :size="17" :stroke-width="1.8" />
      </button>
      <button class="source-chat-sidebar__icon-button" type="button" aria-label="折叠侧边栏" title="折叠侧边栏" @click="emit('collapse')">
        <PanelLeftClose :size="17" :stroke-width="1.8" />
      </button>
    </div>

    <button class="source-chat-sidebar__new" type="button" title="新对话" @click="emit('new-chat')">
      <SquarePen :size="16" :stroke-width="1.8" />
      <span>新对话</span>
    </button>

    <button class="source-chat-sidebar__files" type="button" title="任务文件" @click="emit('open-files')">
      <span class="source-chat-sidebar__files-label"><FolderPlus :size="16" :stroke-width="1.7" />任务文件</span>
    </button>

    <button class="source-chat-sidebar__files" type="button" title="专家中心" @click="router.push('/agent-square')">
      <span class="source-chat-sidebar__files-label"><Bot :size="16" :stroke-width="1.7" />专家中心</span>
    </button>

    <div class="source-chat-sidebar__scroll">
      <section class="source-chat-sidebar__section" aria-labelledby="daily-session-heading">
        <div class="source-chat-sidebar__heading" id="daily-session-heading">
          <span>日常办公</span>
          <button v-if="dailyItems.length > 5" type="button" class="session-expand" :aria-expanded="dailyExpanded" @click="dailyExpanded = !dailyExpanded">{{ dailyExpanded ? '收起' : '查看更多' }}</button>
        </div>
        <div class="source-chat-sidebar__list">
          <article
            v-for="session in visibleDailyItems"
            :key="session.id"
            class="source-chat-sidebar__session"
            :class="{ 'source-chat-sidebar__session--active': session.id === activeSessionId }"
            :data-testid="`session-${session.id}`"
          >
            <button class="source-chat-sidebar__session-main" type="button" :title="session.title" @click="emit('open-session', session.id)">
              <span class="source-chat-sidebar__daily-avatar" aria-hidden="true">
                <Coffee :size="17" :stroke-width="1.35" />
                <i />
              </span>
              <span class="source-chat-sidebar__session-copy">
                <strong><Pin v-if="pinnedOrder.includes(session.id)" :size="11" aria-label="已置顶" />{{ session.title }}</strong>
                <time>{{ session.timestamp }}</time>
              </span>
            </button>
            <button class="source-chat-sidebar__pin" type="button" :aria-label="pinnedOrder.includes(session.id) ? '取消置顶' : '置顶'" :title="pinnedOrder.includes(session.id) ? '取消置顶' : '置顶'" :aria-pressed="pinnedOrder.includes(session.id)" @click="togglePin($event, session.id)"><component :is="pinnedOrder.includes(session.id) ? PinOff : Pin" :size="15" /></button>
            <button class="source-chat-sidebar__more" type="button" aria-label="更多操作" title="更多操作" @click="toggleMenu($event, session.id)">
              <MoreHorizontal :size="17" />
            </button>
            <div v-if="openMenuId === session.id" class="source-chat-sidebar__menu" role="menu" @click.stop>
              <button role="menuitem" type="button" @click="runMenuAction($event, 'rename-session', session.id)"><Pencil :size="14" />重命名</button>
              <button role="menuitem" type="button" @click="runMenuAction($event, 'share-session', session.id)"><Share2 :size="14" />分享</button>
              <button class="source-chat-sidebar__delete" role="menuitem" type="button" @click="runMenuAction($event, 'delete-session', session.id)"><Trash2 :size="14" />删除</button>
            </div>
          </article>
        </div>
      </section>

      <section class="source-chat-sidebar__section" aria-labelledby="expert-session-heading">
        <div class="source-chat-sidebar__heading" id="expert-session-heading">
          <span>专家模式</span>
          <button v-if="expertItems.length > 5" type="button" class="session-expand" :aria-expanded="expertExpanded" @click="expertExpanded = !expertExpanded">{{ expertExpanded ? '收起' : '查看更多' }}</button>
        </div>
        <div class="source-chat-sidebar__list">
          <article
            v-for="session in visibleExpertItems"
            :key="session.id"
            class="source-chat-sidebar__session"
            :class="{ 'source-chat-sidebar__session--active': session.id === activeSessionId }"
            :data-testid="`session-${session.id}`"
          >
            <button class="source-chat-sidebar__session-main" type="button" :title="session.title" @click="emit('open-session', session.id)">
              <span class="source-chat-sidebar__expert-avatar">
                <img :src="session.avatar || `${assetBase}assets/agents-online/data-analysis.png`" alt="" />
              </span>
              <span class="source-chat-sidebar__session-copy">
                <strong><Pin v-if="pinnedOrder.includes(session.id)" :size="11" aria-label="已置顶" />{{ session.title }}</strong>
                <time>{{ session.timestamp }}</time>
              </span>
            </button>
            <button class="source-chat-sidebar__pin" type="button" :aria-label="pinnedOrder.includes(session.id) ? '取消置顶' : '置顶'" :title="pinnedOrder.includes(session.id) ? '取消置顶' : '置顶'" :aria-pressed="pinnedOrder.includes(session.id)" @click="togglePin($event, session.id)"><component :is="pinnedOrder.includes(session.id) ? PinOff : Pin" :size="15" /></button>
            <button class="source-chat-sidebar__more" type="button" aria-label="更多操作" title="更多操作" @click="toggleMenu($event, session.id)">
              <MoreHorizontal :size="17" />
            </button>
            <div v-if="openMenuId === session.id" class="source-chat-sidebar__menu" role="menu" @click.stop>
              <button role="menuitem" type="button" @click="runMenuAction($event, 'rename-session', session.id)"><Pencil :size="14" />重命名</button>
              <button role="menuitem" type="button" @click="runMenuAction($event, 'share-session', session.id)"><Share2 :size="14" />分享</button>
              <button class="source-chat-sidebar__delete" role="menuitem" type="button" @click="runMenuAction($event, 'delete-session', session.id)"><Trash2 :size="14" />删除</button>
            </div>
          </article>
        </div>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.session-expand { border: 0; padding: 0; background: transparent; color: #64748b; cursor: pointer; font-size: 12px; }
.source-chat-sidebar {
  box-sizing: border-box;
  display: flex;
  width: 270px;
  height: 100%;
  min-height: 0;
  flex: 0 0 270px;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid #ededed;
  background: #fff;
  color: #111;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.source-chat-sidebar button {
  font: inherit;
}

.source-chat-sidebar__tools {
  display: flex;
  height: 60px;
  flex: 0 0 60px;
  align-items: center;
  gap: 2px;
  padding: 4px 16px 0;
}

.source-chat-sidebar__icon-button {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  color: #111;
  background: transparent;
  cursor: pointer;
}

.source-chat-sidebar__icon-button:first-child,
.source-chat-sidebar__icon-button:hover {
  background: #f7f7f7;
}

.source-chat-sidebar__new {
  display: flex;
  width: 246px;
  height: 36px;
  flex: 0 0 36px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0 12px;
  border: 0;
  border-radius: 10px;
  color: #fff;
  background: #111;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
  cursor: pointer;
}

.source-chat-sidebar__new:hover {
  background: #2b2b2b;
}

.source-chat-sidebar__files {
  display: flex;
  width: 246px;
  height: 36px;
  flex: 0 0 36px;
  align-items: center;
  justify-content: space-between;
  margin: 15px 12px 0;
  padding: 0 12px;
  border: 0;
  border-radius: 10px;
  color: #333;
  background: #fff;
  font-size: 14px;
  line-height: 21px;
  cursor: pointer;
}

.source-chat-sidebar__files:hover {
  background: #f7f7f7;
}

.source-chat-sidebar__files-label {
  display: flex;
  align-items: center;
  gap: 9px;
}

.source-chat-sidebar__scroll {
  min-height: 0;
  flex: 1;
  padding: 16px 0 24px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
}

.source-chat-sidebar__scroll::-webkit-scrollbar {
  display: none;
}

.source-chat-sidebar__section + .source-chat-sidebar__section {
  margin-top: 10px;
}

.source-chat-sidebar__heading {
  display: flex;
  width: 246px;
  height: 36px;
  align-items: center;
  justify-content: space-between;
  margin: 0 12px;
  padding: 0 12px;
  border-radius: 12px;
  color: #777;
  font-size: 13px;
  line-height: 21px;
}

.source-chat-sidebar__heading span:last-child {
  color: #999;
  font-size: 11px;
}

.source-chat-sidebar__list {
  padding: 0 12px;
}

.source-chat-sidebar__session {
  position: relative;
  width: 246px;
  height: 64px;
  border-radius: 10px;
  transition: background-color 0.15s ease;
}

.source-chat-sidebar__session:hover,
.source-chat-sidebar__session--active {
  background: #f7f7f7;
}

.source-chat-sidebar__session-main {
  display: flex;
  width: 100%;
  height: 64px;
  align-items: center;
  gap: 10px;
  padding: 0 58px 0 10px;
  border: 0;
  color: #111;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.source-chat-sidebar__daily-avatar,
.source-chat-sidebar__expert-avatar {
  position: relative;
  display: flex;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.source-chat-sidebar__daily-avatar {
  border: 1px solid #ededed;
  color: #a3a3a3;
  background: #fff;
}

.source-chat-sidebar__daily-avatar i {
  position: absolute;
  top: 1px;
  right: 0;
  width: 6px;
  height: 6px;
  border: 1px solid #fff;
  border-radius: 50%;
  background: #67d84b;
}

.source-chat-sidebar__expert-avatar {
  overflow: hidden;
  background: #f3f3f3;
}

.source-chat-sidebar__expert-avatar img {
  width: 40px;
  height: 40px;
  object-fit: cover;
}

.source-chat-sidebar__session-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.source-chat-sidebar__session-copy strong {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  color: #222;
  font-size: 14px;
  font-weight: 400;
  line-height: 21px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-chat-sidebar__session-copy time {
  color: #aaa;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
}

.source-chat-sidebar__pin,
.source-chat-sidebar__more {
  position: absolute;
  z-index: 2;
  top: 22px;
  right: 8px;
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 6px;
  color: #666;
  background: transparent;
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.15s ease, background-color 0.15s ease;
}

.source-chat-sidebar__pin { right: 32px; }

.source-chat-sidebar__session:hover .source-chat-sidebar__pin,
.source-chat-sidebar__session:focus-within .source-chat-sidebar__pin,
.source-chat-sidebar__session:focus-within .source-chat-sidebar__more,
.source-chat-sidebar__session:hover .source-chat-sidebar__more,
.source-chat-sidebar__more:focus-visible,
.source-chat-sidebar__session:has(.source-chat-sidebar__menu) .source-chat-sidebar__more {
  opacity: 1;
}

.source-chat-sidebar__pin:hover,
.source-chat-sidebar__more:hover {
  background: #eaeaea;
}

.source-chat-sidebar__menu {
  position: absolute;
  z-index: 50;
  top: 45px;
  right: 8px;
  width: 116px;
  padding: 5px;
  border: 1px solid #ededed;
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.source-chat-sidebar__menu button {
  display: flex;
  width: 100%;
  height: 32px;
  align-items: center;
  gap: 8px;
  padding: 0 9px;
  border: 0;
  border-radius: 6px;
  color: #333;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}

.source-chat-sidebar__menu button:hover {
  background: #f7f7f7;
}

.source-chat-sidebar__menu .source-chat-sidebar__delete {
  color: #dc2626;
}

@media (max-width: 640px) {
  .source-chat-sidebar {
    width: min(270px, calc(100vw - 44px));
    flex-basis: min(270px, calc(100vw - 44px));
    box-shadow: 4px 0 22px rgba(0, 0, 0, 0.12);
  }
}
</style>
