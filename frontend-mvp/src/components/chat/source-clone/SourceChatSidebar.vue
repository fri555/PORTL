<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { readPrototypeChatValue, writePrototypeChatValue } from '@/utils/prototypeChatStore'
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
  Search,
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

const removedIds = ref(new Set<string>())
function combinedSessions(mode: 'daily' | 'expert', captured: SourceChatSession[]) {
  const local = props.additionalSessions.filter(item => item.mode === mode)
  const localIds = new Set(local.map(item => item.id))
  return [...local, ...captured.filter(item => !localIds.has(item.id))].filter(item => !removedIds.value.has(item.id))
}
const dailyItems = computed(() => combinedSessions('daily', props.dailySessions ?? capturedDaily))
const expertItems = computed(() => combinedSessions('expert', props.expertSessions ?? capturedExpert))
const savedPins = readPrototypeChatValue<string[]>('pinned-sessions')
const pinnedOrder = ref<string[]>(Array.isArray(savedPins) ? savedPins.filter(id => typeof id === 'string') : ['expert-top-status', 'daily-auth'])
watch(pinnedOrder, ids => writePrototypeChatValue('pinned-sessions', ids), { deep: true })
const allItems = computed(() => [...dailyItems.value, ...expertItems.value])
const pinnedItems = computed(() => pinnedOrder.value.map(id => allItems.value.find(item => item.id === id)).filter((item): item is SourceChatSession => !!item))
watch(allItems, items => { const present = new Set(items.map(item=>item.id)); pinnedOrder.value = pinnedOrder.value.filter(id=>present.has(id)) }, { immediate: true })
const savedGroups = readPrototypeChatValue<Record<string,{open:boolean;limit:number}>>('session-group-display') || {}
const groupDisplay = ref<Record<string,{open:boolean;limit:number}>>({pinned:{open:true,limit:5},daily:{open:true,limit:5},expert:{open:true,limit:5},...savedGroups})
watch(groupDisplay,value=>writePrototypeChatValue('session-group-display',value),{deep:true})
function orderSessions(items: SourceChatSession[]) { return [...items].sort((a,b)=> b.timestamp.localeCompare(a.timestamp) || b.id.localeCompare(a.id)) }
const groups=computed(()=>[
 {id:'pinned',title:'置顶',items:orderSessions(pinnedItems.value)},
 {id:'daily',title:'日常办公',items:orderSessions(dailyItems.value)},
 {id:'expert',title:'专家模式',items:orderSessions(expertItems.value)}
].filter(g=>g.items.length))
function visible(group:{id:string;items:SourceChatSession[]}) { const state=groupDisplay.value[group.id]!; return state.open ? group.items.slice(0,state.limit) : [] }
function more(id:string) { groupDisplay.value[id]!.limit+=10 }
function collapseGroup(id:string) { groupDisplay.value[id]!.limit=5 }
function toggleGroup(id:string) { const state=groupDisplay.value[id]!;state.open=!state.open;if(state.open)state.limit=5 }
function groupAriaLabel(id:string) { const state=groupDisplay.value[id]!; return (state.open?'收起':'展开')+groups.value.find(g=>g.id===id)?.title }
function groupIsOpen(id:string) { return groupDisplay.value[id]?.open ?? false }
function groupLimit(id:string) { return groupDisplay.value[id]?.limit ?? 5 }
function groupIsClosed(id:string) { return !groupDisplay.value[id]?.open }
const cursors=computed(()=>Object.fromEntries(groups.value.map(g=>{const last=visible(g).at(-1);return [g.id,last ? Date.parse(last.timestamp.replace(' ','T')+'+08:00')+'_'+last.id : null]})))
const openMenuId = ref<string | null>(null)

function toggleMenu(event: MouseEvent, sessionId: string) {
  event.stopPropagation()
  openMenuId.value = openMenuId.value === sessionId ? null : sessionId
}

function runMenuAction(event: MouseEvent, action: 'rename-session' | 'delete-session', sessionId: string) {
  event.stopPropagation()
  if (action === 'rename-session') emit('rename-session', sessionId)
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
      <section v-for="group in groups" :key="group.id" class="source-chat-sidebar__section" :class="{'pinned-group':group.id==='pinned'}" :data-testid="group.id==='pinned'?'pinned-group':group.id+'-group'">
        <div class="source-chat-sidebar__heading" :id="group.id+'-session-heading'"><button class="group-toggle" :aria-label="groupAriaLabel(group.id)" :aria-expanded="groupIsOpen(group.id)" @click="toggleGroup(group.id)"><span>{{group.title}}</span><span class="pinned-count">{{group.items.length}}</span><ChevronDown :size="12" :class="{closed:groupIsClosed(group.id)}"/></button></div>
        <div class="source-chat-sidebar__list">
          <article v-for="session in visible(group)" :key="session.id" class="source-chat-sidebar__session" :class="{'source-chat-sidebar__session--active':session.id===activeSessionId}" :data-testid="(group.id==='pinned'?'pinned-session-':'session-')+session.id">
            <button class="source-chat-sidebar__session-main" type="button" :title="session.title" @click="emit('open-session',session.id)"><span class="source-chat-sidebar__expert-avatar"><img v-if="session.mode==='expert'" :src="session.avatar || dailyAssistant.avatarUrl" alt=""/><Coffee v-else :size="17"/></span><span class="source-chat-sidebar__session-copy"><strong><Pin v-if="group.id!=='pinned'&&pinnedOrder.includes(session.id)" :size="11" aria-label="已置顶"/>{{session.title}}</strong><time>{{session.timestamp}} <small>{{session.mode==='expert'?'专家':'日常'}}</small></time></span></button>
            <button class="source-chat-sidebar__pin-btn" :class="{'source-chat-sidebar__pin-btn--pinned':pinnedOrder.includes(session.id)}" type="button" :aria-label="pinnedOrder.includes(session.id)?'取消置顶':'置顶'" :title="pinnedOrder.includes(session.id)?'取消置顶':'置顶'" @click="togglePin($event,session.id)"><component :is="pinnedOrder.includes(session.id)?PinOff:Pin" :size="14"/></button><button class="source-chat-sidebar__more" type="button" aria-label="更多操作" @click="toggleMenu($event,group.id+':'+session.id)"><MoreHorizontal :size="17"/></button>
            <div v-if="openMenuId===group.id+':'+session.id" class="source-chat-sidebar__menu" role="menu" @click.stop><button role="menuitem" @click="togglePin($event,session.id)"><component :is="pinnedOrder.includes(session.id)?PinOff:Pin" :size="14"/>{{ pinnedOrder.includes(session.id)?'取消置顶':'置顶' }}</button><button role="menuitem" @click="runMenuAction($event,'rename-session',session.id)"><Pencil :size="14"/>重命名</button><button class="source-chat-sidebar__delete" role="menuitem" @click="runMenuAction($event,'delete-session',session.id)"><Trash2 :size="14"/>删除</button></div>
          </article>
        </div>
        <div v-if="groupIsOpen(group.id)" class="group-pagination"><button v-if="visible(group).length<group.items.length" @click="more(group.id)">查看更多（{{group.items.length-visible(group).length}}）</button><button v-else-if="groupLimit(group.id)>5" @click="collapseGroup(group.id)">收起</button></div>
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
.source-chat-sidebar__heading{position:sticky;top:0;z-index:3;background:#f7f8fa;min-height:32px}.source-chat-sidebar__section{position:relative}.group-toggle{display:flex;align-items:center;gap:5px;width:100%;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;padding:4px 0}.group-toggle svg.closed{transform:rotate(-90deg)}.group-pagination{display:flex;gap:14px;padding:7px 10px}.group-pagination button{border:0;background:transparent;color:#87909f;font-size:11px;cursor:pointer}.source-chat-sidebar__session-copy time small{font-size:9px;color:#a0a7b3}</style>
