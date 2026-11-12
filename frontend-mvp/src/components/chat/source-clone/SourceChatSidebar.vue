<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { readPrototypeChatValue, writePrototypeChatValue, type PrototypeChatMode } from '@/utils/prototypeChatStore'
import { isSessionRunning } from '@/utils/sessionRuntime'
import { useProjectsStore } from '@/stores/projects'
import { EMPTY_CUSTOM_RANGE, matchesRange, rangeSummary, validateRange, type QuickRange } from '@/utils/dateRange'
import { getBusinessExpertAvatarUrl } from '@/mock/businessExpertAvatars'
import { dailyAssistant } from '@/mock/agents'
import {
  Bot,
  ChevronDown,
  Coffee,
  FolderPlus,
  MoreHorizontal,
  PanelLeftClose,
  Pin,
  PinOff,
  Pencil,
  Plus,
  Search,
  SquarePen,
  Trash2,
} from 'lucide-vue-next'

const router = useRouter()

export interface SourceChatSession {
  id: string
  title: string
  timestamp: string
  mode: PrototypeChatMode
  avatar?: string
}

const props = withDefaults(defineProps<{
  activeSessionId?: string
  activeProjectId?: string
  dailySessions?: SourceChatSession[]
  expertSessions?: SourceChatSession[]
  querySessions?: SourceChatSession[]
  additionalSessions?: SourceChatSession[]
}>(), {
  activeSessionId: '',
  activeProjectId: '',
  additionalSessions: () => [],
})

const emit = defineEmits<{
  'new-chat': []
  'new-project': []
  'open-project': [projectId: string]
  'assign-session': [sessionId: string]
  search: []
  collapse: []
  'open-session': [sessionId: string]
  'open-files': []
  'rename-session': [sessionId: string]
  'share-session': [sessionId: string]
  'delete-session': [sessionId: string]
}>()

const projectsStore = useProjectsStore()

const assetBase = import.meta.env.BASE_URL

const sessionExpertIds: Record<string, string> = {
  'expert-top-status': 'biz-01',
  'expert-sales-change': 'biz-05',
  'expert-capability': 'biz-02',
  'expert-profit': 'biz-15',
  'expert-time': 'biz-13',
  'expert-stock': 'biz-06',
  'expert-weekly': 'biz-01',
}
function expertAvatarForSession(sessionId: string): string {
  const expertId = sessionExpertIds[sessionId]
  return (expertId ? getBusinessExpertAvatarUrl(expertId) : undefined) ?? dailyAssistant.avatarUrl
}

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
  { id: 'expert-top-status', title: '分析下耶运动旗舰店的TOP款现状', timestamp: '2026-08-27 13:10', mode: 'expert', avatar: expertAvatarForSession('expert-top-status') },
  { id: 'expert-sales-change', title: '本月销售额与上月对比如何，异常波动在哪', timestamp: '2026-08-26 15:43', mode: 'expert', avatar: expertAvatarForSession('expert-sales-change') },
  { id: 'expert-capability', title: '你能做什么', timestamp: '2026-08-26 10:58', mode: 'expert', avatar: expertAvatarForSession('expert-capability') },
  { id: 'expert-profit', title: '看下这个店铺的利润情况，进行分析，并给出整改建议', timestamp: '2026-08-25 18:22', mode: 'expert', avatar: expertAvatarForSession('expert-profit') },
  { id: 'expert-time', title: '当前是什么时间', timestamp: '2026-08-25 14:32', mode: 'expert', avatar: expertAvatarForSession('expert-time') },
  { id: 'expert-stock', title: '核对本周库存周转情况', timestamp: '2026-08-24 10:00', mode: 'expert', avatar: expertAvatarForSession('expert-stock') },
  { id: 'expert-weekly', title: '整理经营周报', timestamp: '2026-08-23 09:00', mode: 'expert', avatar: expertAvatarForSession('expert-weekly') },
]

/** 智能问数是第三种对话模式，与日常办公、业务专家并列，不参与项目容器。 */
const capturedQuery: SourceChatSession[] = [
  { id: 'query-brand-daily', title: '2026-11-11 品牌中心销售日报', timestamp: '2026-11-12 08:25', mode: 'query' },
  { id: 'query-gsv-compare', title: '本周各品牌 GSV 与毛利率对比', timestamp: '2026-11-11 16:40', mode: 'query' },
  { id: 'query-stock-check', title: '11 月库存周转与退货率排查', timestamp: '2026-11-10 09:15', mode: 'query' },
]

const removedIds = ref(new Set<string>())
function combinedSessions(mode: PrototypeChatMode, captured: SourceChatSession[]) {
  const local = props.additionalSessions.filter(item => item.mode === mode)
  const localIds = new Set(local.map(item => item.id))
  return [...local, ...captured.filter(item => !localIds.has(item.id))].filter(item => !removedIds.value.has(item.id))
}
const dailyItems = computed(() => combinedSessions('daily', props.dailySessions ?? capturedDaily))
const expertItems = computed(() => combinedSessions('expert', props.expertSessions ?? capturedExpert))
const queryItems = computed(() => combinedSessions('query', props.querySessions ?? capturedQuery))
const savedPins = readPrototypeChatValue<string[]>('pinned-sessions')
const pinnedOrder = ref<string[]>(Array.isArray(savedPins) ? savedPins.filter(id => typeof id === 'string') : ['expert-top-status', 'daily-auth'])
watch(pinnedOrder, ids => writePrototypeChatValue('pinned-sessions', ids), { deep: true })
const allItems = computed(() => [...dailyItems.value, ...expertItems.value, ...queryItems.value])
const pinnedItems = computed(() => pinnedOrder.value.map(id => allItems.value.find(item => item.id === id)).filter((item): item is SourceChatSession => !!item))
watch(allItems, items => { const present = new Set(items.map(item=>item.id)); pinnedOrder.value = pinnedOrder.value.filter(id=>present.has(id)) }, { immediate: true })
// 侧栏自上而下：置顶（独立分组）→ 项目（组织容器）→ 全部会话（按模式与时间筛选）。
const pinnedGroupOpen = ref(true)
const expandedProjectId = ref('')
const projectGroupOpen = ref(true)
function toggleProject(id: string) { expandedProjectId.value = expandedProjectId.value === id ? '' : id }
function sessionTitle(id: string): string { return allItems.value.find(item => item.id === id)?.title ?? '历史会话' }
const projectSessionIds = computed(() => new Set(projectsStore.projects.flatMap(project => project.sessionIds)))
const looseItems = computed(() => allItems.value.filter(item => !projectSessionIds.value.has(item.id)))

type ModeFilter = 'all' | PrototypeChatMode
const modeFilter = ref<ModeFilter>('all')
const timeFilter = ref<QuickRange>('all')
const customRange = ref({ ...EMPTY_CUSTOM_RANGE })
const rangeCheck = computed(() => validateRange(customRange.value))
const rangeText = computed(() => rangeSummary(timeFilter.value, customRange.value))
function inTimeRange(timestamp: string): boolean {
  return matchesRange(timestamp, timeFilter.value, customRange.value)
}
function clearCustomRange() { customRange.value = { ...EMPTY_CUSTOM_RANGE } }
const filteredSessions = computed(() => looseItems.value
  .filter(item => modeFilter.value === 'all' || item.mode === modeFilter.value)
  .filter(item => inTimeRange(item.timestamp))
  .sort((a, b) => {
    const pinDiff = Number(pinnedOrder.value.includes(b.id)) - Number(pinnedOrder.value.includes(a.id))
    if (pinDiff) return pinDiff
    return b.timestamp.localeCompare(a.timestamp) || b.id.localeCompare(a.id)
  }))
const sessionLimit = ref(8)
const visibleSessions = computed(() => filteredSessions.value.slice(0, sessionLimit.value))
function showMore() { sessionLimit.value += 10 }
function collapseSessions() { sessionLimit.value = 8 }
const cursors = computed(() => {
  const last = visibleSessions.value.at(-1)
  return { sessions: last ? Date.parse(last.timestamp.replace(' ', 'T') + '+08:00') + '_' + last.id : null }
})
function modeLabel(mode: PrototypeChatMode): string {
  if (mode === 'expert') return '专家'
  if (mode === 'query') return '问数'
  return '日常'
}

const openMenuId = ref<string | null>(null)
// 同一会话会同时出现在置顶组与全部会话组，菜单状态按分组隔离。
function menuKey(scope: 'pinned' | 'all', sessionId: string): string { return scope + ':' + sessionId }

function toggleMenu(event: MouseEvent, key: string) {
  event.stopPropagation()
  openMenuId.value = openMenuId.value === key ? null : key
}

function runMenuAction(event: MouseEvent, action: 'rename-session' | 'delete-session' | 'assign-session', sessionId: string) {
  event.stopPropagation()
  if (action === 'rename-session') emit('rename-session', sessionId)
  else if (action === 'assign-session') emit('assign-session', sessionId)
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
defineExpose({ removeSession, cursors })

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

    <button class="source-chat-sidebar__files" type="button" title="专家中心v1（市场）" @click="router.push('/agent-square')">
      <span class="source-chat-sidebar__files-label"><Bot :size="16" :stroke-width="1.7" />专家中心</span>
    </button>

    <div class="source-chat-sidebar__scroll">
      <section v-if="pinnedItems.length" class="source-chat-sidebar__section pinned-group" data-testid="pinned-group">
        <div class="source-chat-sidebar__heading" id="pinned-session-heading">
          <button class="group-toggle" :aria-label="pinnedGroupOpen ? '收起置顶' : '展开置顶'" :aria-expanded="pinnedGroupOpen" @click="pinnedGroupOpen = !pinnedGroupOpen">
            <span>置顶</span><span class="pinned-count">{{ pinnedItems.length }}</span>
            <ChevronDown :size="12" :class="{ closed: !pinnedGroupOpen }" />
          </button>
        </div>
        <div v-if="pinnedGroupOpen" class="source-chat-sidebar__list">
          <article
            v-for="session in pinnedItems"
            :key="session.id"
            class="source-chat-sidebar__session"
            :class="{ 'source-chat-sidebar__session--active': session.id === activeSessionId }"
            :data-testid="'pinned-session-' + session.id"
          >
            <button class="source-chat-sidebar__session-main" type="button" :title="session.title" @click="emit('open-session', session.id)">
              <span class="source-chat-sidebar__expert-avatar">
                <img v-if="session.mode === 'expert'" :src="session.avatar || dailyAssistant.avatarUrl" alt="" />
                <Coffee v-else :size="17" />
              </span>
              <span class="source-chat-sidebar__session-copy">
                <strong>{{ session.title }}<span v-if="isSessionRunning(session.id)" class="session-running-badge" :data-testid="'session-running-' + session.id"><i />执行中</span></strong>
                <time>{{ session.timestamp }} <small>{{ modeLabel(session.mode) }}</small></time>
              </span>
            </button>
            <button
              class="source-chat-sidebar__pin-btn source-chat-sidebar__pin-btn--pinned"
              type="button"
              aria-label="取消置顶"
              title="取消置顶"
              @click="togglePin($event, session.id)"
            >
              <PinOff :size="14" />
            </button>
            <button class="source-chat-sidebar__more" type="button" aria-label="更多操作" @click="toggleMenu($event, menuKey('pinned', session.id))">
              <MoreHorizontal :size="17" />
            </button>
            <div v-if="openMenuId === menuKey('pinned', session.id)" class="source-chat-sidebar__menu" role="menu" @click.stop>
              <button role="menuitem" @click="togglePin($event, session.id)"><PinOff :size="14" />取消置顶</button>
              <button role="menuitem" @click="runMenuAction($event, 'assign-session', session.id)"><FolderPlus :size="14" />移入项目</button>
              <button role="menuitem" @click="runMenuAction($event, 'rename-session', session.id)"><Pencil :size="14" />重命名</button>
              <button class="source-chat-sidebar__delete" role="menuitem" @click="runMenuAction($event, 'delete-session', session.id)"><Trash2 :size="14" />删除</button>
            </div>
          </article>
        </div>
      </section>

      <section class="source-chat-sidebar__section" data-testid="project-group">
        <div class="source-chat-sidebar__heading" id="project-session-heading">
          <button class="group-toggle" :aria-label="projectGroupOpen ? '收起项目' : '展开项目'" :aria-expanded="projectGroupOpen" @click="projectGroupOpen = !projectGroupOpen">
            <span>项目</span><span class="pinned-count">{{ projectsStore.projectList.length }}</span>
            <ChevronDown :size="12" :class="{ closed: !projectGroupOpen }" />
          </button>
          <button class="group-add" type="button" title="新建项目" aria-label="新建项目" data-testid="new-project-entry" @click="emit('new-project')">
            <Plus :size="15" :stroke-width="1.9" />
          </button>
        </div>
        <div v-if="projectGroupOpen" class="source-chat-sidebar__list">
          <article
            v-for="project in projectsStore.projectList"
            :key="project.id"
            class="project-card"
            :class="{ 'project-card--active': project.id === activeProjectId }"
            :data-testid="'project-' + project.id"
          >
            <button class="project-card__main" type="button" :title="project.name" @click="emit('open-project', project.id)">
              <FolderPlus :size="15" />
              <span class="project-card__copy">
                <strong>{{ project.name }}</strong>
                <small>{{ project.sessionIds.length }} 个对话 · {{ projectsStore.projectSharedFiles(project.id).length }} 个共享文件</small>
              </span>
              <ChevronDown :size="12" :class="{ closed: expandedProjectId !== project.id }" @click.stop="toggleProject(project.id)" />
            </button>
            <div v-if="expandedProjectId === project.id" class="project-card__sessions">
              <button v-for="sid in project.sessionIds" :key="sid" type="button" :title="sessionTitle(sid)" @click="emit('open-session', sid)">
                {{ sessionTitle(sid) }}<em v-if="isSessionRunning(sid)" class="project-session-running"> · 执行中</em>
              </button>
              <p v-if="!project.sessionIds.length">还没有对话，进入项目后可新建</p>
            </div>
          </article>
          <p v-if="!projectsStore.projectList.length" class="sidebar-empty">还没有项目，点分组右侧的 + 新建</p>
        </div>
      </section>

      <section class="source-chat-sidebar__section" data-testid="all-sessions-group" aria-labelledby="daily-session-heading">
        <div class="source-chat-sidebar__heading" id="all-session-heading">
          <!-- 兼容旧版「日常办公」分组的锚点 id，模式分组已合并为全部会话 -->
          <span id="daily-session-heading" class="group-heading-label">全部会话 <em>{{ filteredSessions.length }}</em></span>
        </div>
        <div class="session-filters">
          <select v-model="modeFilter" aria-label="按模式筛选" title="按模式筛选">
            <option value="all">全部模式</option>
            <option value="daily">日常办公</option>
            <option value="expert">业务专家</option>
            <option value="query">智能问数</option>
          </select>
          <select v-model="timeFilter" aria-label="按时间筛选" title="按时间筛选">
            <option value="all">全部时间</option>
            <option value="today">今日</option>
            <option value="week">近一周</option>
            <option value="month">近一月</option>
            <option value="earlier">更早</option>
            <option value="custom">自定义范围</option>
          </select>
        </div>
        <div v-if="timeFilter === 'custom'" class="session-custom-range" data-testid="session-custom-range">
          <label><span>开始</span><input v-model="customRange.start" type="date" aria-label="开始日期" /></label>
          <span class="session-custom-range__sep">至</span>
          <label><span>结束</span><input v-model="customRange.end" type="date" aria-label="结束日期" /></label>
          <button v-if="customRange.start || customRange.end" type="button" title="清空日期" @click="clearCustomRange">清空</button>
          <small :class="{ 'is-error': !rangeCheck.ok }">{{ rangeCheck.ok ? '当前范围：' + rangeText : rangeCheck.reason }}</small>
        </div>
        <p v-else-if="timeFilter !== 'all'" class="session-range-note">当前范围：{{ rangeText }}</p>
        <div class="source-chat-sidebar__list">
          <article
            v-for="session in visibleSessions"
            :key="session.id"
            class="source-chat-sidebar__session"
            :class="{ 'source-chat-sidebar__session--active': session.id === activeSessionId }"
            :data-testid="'session-' + session.id"
          >
            <button class="source-chat-sidebar__session-main" type="button" :title="session.title" @click="emit('open-session', session.id)">
              <span class="source-chat-sidebar__expert-avatar">
                <img v-if="session.mode === 'expert'" :src="session.avatar || dailyAssistant.avatarUrl" alt="" />
                <Coffee v-else :size="17" />
              </span>
              <span class="source-chat-sidebar__session-copy">
                <strong><Pin v-if="pinnedOrder.includes(session.id)" :size="11" aria-label="已置顶" />{{ session.title }}<span v-if="isSessionRunning(session.id)" class="session-running-badge" :data-testid="'session-running-' + session.id"><i />执行中</span></strong>
                <time>{{ session.timestamp }} <small>{{ modeLabel(session.mode) }}</small></time>
              </span>
            </button>
            <button
              class="source-chat-sidebar__pin-btn"
              :class="{ 'source-chat-sidebar__pin-btn--pinned': pinnedOrder.includes(session.id) }"
              type="button"
              :aria-label="pinnedOrder.includes(session.id) ? '取消置顶' : '置顶'"
              :title="pinnedOrder.includes(session.id) ? '取消置顶' : '置顶'"
              @click="togglePin($event, session.id)"
            >
              <component :is="pinnedOrder.includes(session.id) ? PinOff : Pin" :size="14" />
            </button>
            <button class="source-chat-sidebar__more" type="button" aria-label="更多操作" @click="toggleMenu($event, menuKey('all', session.id))">
              <MoreHorizontal :size="17" />
            </button>
            <div v-if="openMenuId === menuKey('all', session.id)" class="source-chat-sidebar__menu" role="menu" @click.stop>
              <button role="menuitem" @click="togglePin($event, session.id)">
                <component :is="pinnedOrder.includes(session.id) ? PinOff : Pin" :size="14" />{{ pinnedOrder.includes(session.id) ? '取消置顶' : '置顶' }}
              </button>
              <button role="menuitem" @click="runMenuAction($event, 'assign-session', session.id)"><FolderPlus :size="14" />移入项目</button>
              <button role="menuitem" @click="runMenuAction($event, 'rename-session', session.id)"><Pencil :size="14" />重命名</button>
              <button class="source-chat-sidebar__delete" role="menuitem" @click="runMenuAction($event, 'delete-session', session.id)"><Trash2 :size="14" />删除</button>
            </div>
          </article>
          <p v-if="!visibleSessions.length" class="sidebar-empty">没有符合条件的会话，调整模式或时间范围再看看</p>
        </div>
        <div class="group-pagination">
          <button v-if="visibleSessions.length < filteredSessions.length" @click="showMore">查看更多（{{ filteredSessions.length - visibleSessions.length }}）</button>
          <button v-else-if="sessionLimit > 8" @click="collapseSessions">收起</button>
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

.group-add {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  place-items: center;
  border: 0;
  border-radius: 7px;
  color: #8a9099;
  background: transparent;
  cursor: pointer;
}

.group-add:hover {
  color: #1f2329;
  background: #eef0f3;
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
  padding: 0 56px 0 10px;
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

.source-chat-sidebar__pin-btn {
  position: absolute;
  z-index: 2;
  top: 22px;
  right: 32px;
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
.source-chat-sidebar__pin-btn--pinned {
  color: #666;
}
.source-chat-sidebar__session:hover .source-chat-sidebar__pin-btn,
.source-chat-sidebar__session:focus-within .source-chat-sidebar__pin-btn {
  opacity: 1;
}
.source-chat-sidebar__pin-btn:hover {
  background: #eaeaea;
}
.source-chat-sidebar__more {
  right: 8px;
}

.source-chat-sidebar__session:hover .source-chat-sidebar__more,
.source-chat-sidebar__session:focus-within .source-chat-sidebar__more,
.source-chat-sidebar__more:focus-visible,
.source-chat-sidebar__session:has(.source-chat-sidebar__menu) .source-chat-sidebar__more {
  opacity: 1;
}

.source-chat-sidebar__more:hover {
  background: #eaeaea;
}

.source-chat-sidebar__menu {
  position: absolute;
  z-index: 50;
  top: 45px;
  right: 8px;
  width: 136px;
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
.pinned-count{font-size:10px;color:#a0a5ad}.pinned-group{margin-bottom:18px}
.source-chat-sidebar__heading{position:sticky;top:0;z-index:3;background:#f7f8fa;min-height:32px}.source-chat-sidebar__section{position:relative}.group-toggle{display:flex;align-items:center;gap:5px;width:100%;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;padding:4px 0}.group-toggle svg.closed{transform:rotate(-90deg)}.group-pagination{display:flex;gap:14px;padding:7px 10px}.group-pagination button{border:0;background:transparent;color:#87909f;font-size:11px;cursor:pointer}.source-chat-sidebar__session-copy time small{font-size:9px;color:#a0a7b3}
/* 项目模式：项目容器 + 其余会话按模式/时间筛选 */
.project-card { margin: 0 0 6px; border: 1px solid #ededf0; border-radius: 10px; background: #fff; }
.project-card--active { border-color: #c9d8f0; background: #f6f9ff; }
.project-card__main { display: flex; width: 100%; align-items: center; gap: 9px; padding: 10px; border: 0; border-radius: 10px; color: #222; background: transparent; cursor: pointer; text-align: left; }
.project-card__main:hover { background: #f7f8fa; }
.project-card__main > svg:first-child { flex: 0 0 15px; color: #6c7a8c; }
.project-card__main > svg:last-child { flex: 0 0 12px; color: #9aa0a8; }
.project-card__copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 3px; }
.project-card__copy strong { overflow: hidden; font-size: 13px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.project-card__copy small { color: #9aa0a8; font-size: 10px; }
.project-card__sessions { display: grid; gap: 2px; padding: 0 8px 9px 34px; }
.project-card__sessions button { overflow: hidden; padding: 5px 7px; border: 0; border-radius: 6px; color: #5b6169; background: #f7f8fa; font-size: 11px; text-align: left; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.project-card__sessions button:hover { background: #eef1f6; color: #222; }
.project-card__sessions p, .sidebar-empty { margin: 6px 0; color: #a0a5ad; font-size: 11px; line-height: 18px; }
.group-heading-label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #777; }
.group-heading-label em { color: #9aa0a8; font-size: 11px; font-style: normal; }
.session-filters { display: flex; gap: 5px; padding: 4px 12px 10px; }
.session-filters select { min-width: 0; flex: 1; height: 28px; padding: 0 5px; border: 1px solid #e8e9ec; border-radius: 7px; color: #555; background: #fff; font-size: 11px; }
.session-custom-range { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 5px; padding: 2px 12px 10px; }
.session-custom-range label { display: flex; min-width: 0; flex: 1 1 96px; flex-direction: column; gap: 3px; }
.session-custom-range label span { color: #9aa0a8; font-size: 10px; }
.session-custom-range input { width: 100%; height: 27px; padding: 0 4px; border: 1px solid #e8e9ec; border-radius: 6px; color: #555; background: #fff; font-size: 11px; }
.session-custom-range__sep { padding-bottom: 5px; color: #9aa0a8; font-size: 11px; }
.session-custom-range button { height: 27px; padding: 0 7px; border: 1px solid #e8e9ec; border-radius: 6px; color: #777; background: #fff; font-size: 11px; cursor: pointer; }
.session-custom-range small { flex: 1 1 100%; color: #9298a1; font-size: 10px; line-height: 16px; }
.session-custom-range small.is-error { color: #c53b3b; }
.session-range-note { margin: 0; padding: 0 12px 8px; color: #9aa0a8; font-size: 10px; }
/* 并行会话：执行中的会话在侧栏条目上挂「执行中」标识 */
.session-running-badge { display: inline-flex; align-items: center; gap: 3px; flex: 0 0 auto; margin-left: 6px; padding: 1px 5px; border-radius: 4px; background: #fff4e8; color: #d9730d; font-size: 10px; font-weight: 400; line-height: 15px; }
.session-running-badge i { width: 5px; height: 5px; border-radius: 50%; background: #f08c00; animation: session-running-pulse 1.2s ease-in-out infinite; }
@keyframes session-running-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
.project-session-running { color: #d9730d; font-size: 10px; font-style: normal; }
</style>
