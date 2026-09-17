<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle, Info, Plus, ShieldCheck } from 'lucide-vue-next'
import DigestActionDialog from './DigestActionDialog.vue'
import DigestDetailDrawer from './DigestDetailDrawer.vue'
import DigestItemCard from './DigestItemCard.vue'
import WatchRuleDialog from './WatchRuleDialog.vue'
import WorkbenchBoardHeader from './WorkbenchBoardHeader.vue'
import { workbenchMessageSummaries } from '@/mock/workbench'
import { executeDwsAction, type DwsActionRequest } from '@/services/dws-workbench'
import type {
  DigestActionOption,
  DigestWatchRule,
  MessageSummaryCategory,
  MessageSummaryItem,
} from '@/types/workbench'

const props = withDefaults(defineProps<{
  items?: MessageSummaryItem[]
  dataMode?: 'live' | 'demo' | 'snapshot'
  refreshedAt?: string
  refreshing?: boolean
  accessIssues?: string[]
  watchRules?: DigestWatchRule[]
}>(), {
  items: undefined,
  dataMode: 'demo',
  refreshedAt: '',
  refreshing: false,
  accessIssues: () => [],
  watchRules: () => [],
})

const emit = defineEmits<{
  refresh: []
  updateWatchRules: [rules: DigestWatchRule[]]
}>()

const tabs: Array<{ id: MessageSummaryCategory; label: string }> = [
  { id: 'followup', label: '重点跟进' },
  { id: 'decision', label: '待我决策' },
  { id: 'risk', label: '风险预警' },
  { id: 'business', label: '经营动态' },
  { id: 'watch', label: '我的关注' },
]

const activeTab = ref<MessageSummaryCategory>('followup')
const query = ref('')
const visibleCountByTab = ref<Record<MessageSummaryCategory, number>>({
  followup: 5,
  decision: 5,
  risk: 5,
  business: 5,
  watch: 5,
})
const dismissedIds = ref(new Set<string>())
const detailItem = ref<MessageSummaryItem | null>(null)
const pinnedDetailId = ref<string | null>(null)
const detailPosition = ref({ left: 16, top: 16 })
const detailPointerTop = ref(56)
const panelRef = ref<HTMLElement | null>(null)
const digestScrollArea = ref<HTMLElement | null>(null)
const detailTriggerElement = ref<HTMLElement | null>(null)
let detailCloseTimer: number | undefined
const actionItem = ref<MessageSummaryItem | null>(null)
const selectedAction = ref<DigestActionOption | null>(null)
const actionPending = ref(false)
const actionFeedback = ref<{ tone: 'success' | 'error'; text: string } | null>(null)
const watchDialogOpen = ref(false)
const localWatchRules = ref<DigestWatchRule[]>(props.watchRules.map((rule) => ({ ...rule })))

watch(() => props.watchRules, (rules) => {
  localWatchRules.value = rules.map((rule) => ({ ...rule }))
}, { deep: true })

const sourceItems = computed(() => props.items ?? workbenchMessageSummaries)

function matchesRule(item: MessageSummaryItem, rule: DigestWatchRule) {
  return item.sources.some((source) => {
    if (rule.type === 'group') return source.conversationId === rule.value || source.conversationName.includes(rule.value)
    if (rule.type === 'user') return source.senderId === rule.value || source.senderName.includes(rule.value)
    return source.content.includes(rule.value)
  })
}

const demoWatchItems = computed(() => {
  if (props.dataMode === 'live' || !localWatchRules.value.length) return []
  return sourceItems.value
    .filter((item) => item.category !== 'watch' && localWatchRules.value.some((rule) => matchesRule(item, rule)))
    .map((item) => ({ ...item, id: `watch-${item.id}`, category: 'watch' as const, watchType: localWatchRules.value.find((rule) => matchesRule(item, rule))?.type }))
})

const activeItems = computed(() => {
  const all = activeTab.value === 'watch'
    ? [...sourceItems.value.filter((item) => item.category === 'watch'), ...demoWatchItems.value]
    : sourceItems.value.filter((item) => item.category === activeTab.value)
  return all
    .filter((item) => !dismissedIds.value.has(item.id))
    .filter((item) => {
      const keyword = query.value.trim().toLowerCase()
      if (!keyword) return true
      return [item.title, item.summary, item.impact, item.latestTime, ...item.sources.flatMap((source) => [source.senderName, source.conversationName, source.content])]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    })
    .sort((a, b) => (
      Number(b.hasHardRisk) - Number(a.hasHardRisk)
      || Number(b.isConflict) - Number(a.isConflict)
      || Number(b.hasBreakLine) - Number(a.hasBreakLine)
      || b.score - a.score
      || b.latestTime.localeCompare(a.latestTime)
    ))
})

const visibleItems = computed(() => activeItems.value.slice(0, visibleCountByTab.value[activeTab.value]))
const hasStaleData = computed(() => Boolean(props.accessIssues.length && sourceItems.value.length))
const refreshedLabel = computed(() => {
  if (!props.refreshedAt) return ''
  const value = new Date(props.refreshedAt)
  if (Number.isNaN(value.getTime())) return props.refreshedAt
  return `${new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(value)} 更新`
})
const candidates = computed(() => ({
  groups: [...new Set(sourceItems.value.flatMap((item) => item.sources.map((source) => source.conversationName)).filter(Boolean))],
  users: [...new Set(sourceItems.value.flatMap((item) => item.sources.map((source) => source.senderName)).filter(Boolean))],
}))

function emptyCopy() {
  if (props.accessIssues.length && props.dataMode === 'live') return props.accessIssues[0]
  if (activeTab.value === 'risk') return '近期平稳，暂未发现风险信号'
  if (activeTab.value === 'watch') return '暂无关注项'
  return '当前时间范围内暂无可展示事项'
}

function dismiss(item: MessageSummaryItem) {
  dismissedIds.value = new Set([...dismissedIds.value, item.id])
  if (detailItem.value?.id === item.id) detailItem.value = null
}

function cancelDetailClose() {
  if (detailCloseTimer) window.clearTimeout(detailCloseTimer)
  detailCloseTimer = undefined
}

function positionDetail() {
  const panelRect = panelRef.value?.getBoundingClientRect()
  const triggerRect = detailTriggerElement.value?.getBoundingClientRect()
  if (!panelRect || !triggerRect) return
  const desiredTop = triggerRect.top - panelRect.top - 56
  const minTop = 8 - panelRect.top
  const maxTop = window.innerHeight - panelRect.top - 480
  const top = Math.max(minTop, Math.min(desiredTop, maxTop))
  detailPosition.value = { left: panelRect.width + 12, top }
  detailPointerTop.value = Math.max(24, Math.min(triggerRect.top + triggerRect.height / 2 - panelRect.top - top - 8, 420))
}

function openDetail(item: MessageSummaryItem, event: MouseEvent | FocusEvent) {
  cancelDetailClose()
  detailTriggerElement.value = event.currentTarget as HTMLElement | null
  detailItem.value = item
  positionDetail()
}

function scheduleDetailClose() {
  cancelDetailClose()
  detailCloseTimer = window.setTimeout(() => {
    if (pinnedDetailId.value === detailItem.value?.id) return
    detailItem.value = null
  }, 180)
}

function pinDetail(item: MessageSummaryItem, event: MouseEvent) {
  pinnedDetailId.value = pinnedDetailId.value === item.id ? null : item.id
  openDetail(item, event)
}

function openAction(item: MessageSummaryItem, action: DigestActionOption) {
  if (!action.enabled) return
  detailItem.value = null
  actionItem.value = item
  selectedAction.value = action
  actionFeedback.value = null
}

function closeAction() {
  actionItem.value = null
  selectedAction.value = null
  actionFeedback.value = null
}

async function submitAction(payload: DwsActionRequest) {
  if (actionPending.value) return
  actionPending.value = true
  actionFeedback.value = null
  try {
    if (props.dataMode === 'live') {
      const result = await executeDwsAction(payload)
      actionFeedback.value = { tone: 'success', text: result.message }
    } else {
      actionFeedback.value = { tone: 'success', text: '演示动作已确认，未写入钉钉' }
    }
  } catch (error) {
    actionFeedback.value = {
      tone: 'error',
      text: error instanceof Error ? error.message : '操作失败，请稍后重试',
    }
  } finally {
    actionPending.value = false
  }
}

function loadNextBatch(event: Event) {
  const target = event.currentTarget as HTMLElement
  if (target.scrollHeight - target.scrollTop - target.clientHeight > 48) return
  visibleCountByTab.value = {
    ...visibleCountByTab.value,
    [activeTab.value]: Math.min(activeItems.value.length, visibleCountByTab.value[activeTab.value] + 5),
  }
}

function handleDigestScroll(event: Event) {
  loadNextBatch(event)
  if (!detailItem.value || !detailTriggerElement.value || !digestScrollArea.value) return
  const triggerRect = detailTriggerElement.value.getBoundingClientRect()
  const areaRect = digestScrollArea.value.getBoundingClientRect()
  if (triggerRect.bottom < areaRect.top || triggerRect.top > areaRect.bottom) {
    detailItem.value = null
    pinnedDetailId.value = null
    return
  }
  positionDetail()
}

function saveWatchRules(rules: DigestWatchRule[]) {
  localWatchRules.value = rules.slice(0, 20)
  watchDialogOpen.value = false
  activeTab.value = 'watch'
  emit('updateWatchRules', localWatchRules.value)
}
</script>

<template>
  <section ref="panelRef" data-testid="information-digest-panel" class="relative flex h-[470px] flex-col overflow-visible rounded-[22px] border border-[#e7e9ee] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.035)]">
    <WorkbenchBoardHeader v-model:query="query" title="信息摘要" search-label="搜索信息摘要" test-id-prefix="digest" :refreshing="refreshing" @refresh="emit('refresh')">
      <template #title-meta>
            <span class="inline-flex items-center gap-1.5 text-[10px] font-medium" :class="dataMode === 'live' ? 'text-[#16845b]' : 'text-[#7c8490]'">
              <span class="h-1.5 w-1.5 rounded-full" :class="dataMode === 'live' ? 'bg-[#36a873]' : 'bg-[#a1a7b0]'" />
              {{ dataMode === 'live' ? '实时连接' : '演示数据' }}
            </span>
            <span v-if="hasStaleData" class="rounded-full bg-[#fff3df] px-2 py-0.5 text-[10px] font-semibold text-[#a85e00]">数据已过期</span>
            <span v-if="refreshedLabel" class="text-[10px] text-[#a0a6af]">{{ refreshedLabel }}</span>
      </template>
    </WorkbenchBoardHeader>
    <div class="shrink-0 border-b border-[#eef0f3] px-5">
      <nav class="elegant-scrollbar mt-3 flex gap-5 overflow-x-auto" role="tablist" aria-label="信息摘要分类">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :data-testid="`digest-tab-${tab.id}`"
          role="tab"
          type="button"
          :aria-selected="activeTab === tab.id"
          class="relative shrink-0 pb-3 text-xs font-medium transition-colors"
          :class="activeTab === tab.id ? 'text-[#1769e0]' : 'text-[#777d88] hover:text-[#25282e]'"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
          <span v-if="activeTab === tab.id" class="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#1769e0]" />
        </button>
      </nav>
    </div>

    <div ref="digestScrollArea" class="elegant-scrollbar min-h-0 flex-1 overflow-y-auto rounded-b-[22px] px-5 py-1" data-testid="digest-scroll-area" @scroll="handleDigestScroll">
      <div v-if="!visibleItems.length" class="grid h-full min-h-[260px] place-items-center text-center">
        <div class="max-w-[300px]">
          <ShieldCheck v-if="activeTab === 'risk' && !accessIssues.length" class="mx-auto h-7 w-7 text-[#36a873]" />
          <AlertTriangle v-else-if="accessIssues.length" class="mx-auto h-7 w-7 text-[#d18a26]" />
          <Info v-else class="mx-auto h-7 w-7 text-[#aeb4bd]" />
          <p class="mt-2 text-xs text-[#757e89]">{{ emptyCopy() }}</p>
          <button v-if="activeTab === 'watch' && !accessIssues.length" type="button" class="mt-3 inline-flex items-center gap-1 rounded-xl bg-[#1769e0] px-3 py-2 text-xs font-semibold text-white" @click="watchDialogOpen = true"><Plus class="h-3.5 w-3.5" />新增关注</button>
          <button v-else-if="accessIssues.length" type="button" class="mt-3 rounded-xl border border-[#dfe4eb] bg-white px-3 py-2 text-xs font-semibold text-[#596575]" @click="emit('refresh')">重新读取</button>
        </div>
      </div>

      <DigestItemCard
        v-for="item in visibleItems"
        :key="item.id"
        :item="item"
        @open-detail="openDetail"
        @close-detail="scheduleDetailClose"
        @pin-detail="pinDetail"
        @dismiss="dismiss"
        @open-action="openAction"
      />
    </div>

    <DigestDetailDrawer v-if="detailItem" :item="detailItem" :position="detailPosition" :pointer-top="detailPointerTop" @mouseenter="cancelDetailClose" @mouseleave="scheduleDetailClose" @focusin="cancelDetailClose" @focusout="scheduleDetailClose" @close="detailItem = null; pinnedDetailId = null" />
    <DigestActionDialog
      v-if="actionItem && selectedAction"
      :item="actionItem"
      :action="selectedAction"
      :pending="actionPending"
      :feedback="actionFeedback"
      @close="closeAction"
      @submit="submitAction"
    />
    <WatchRuleDialog v-if="watchDialogOpen" :rules="localWatchRules" :candidates="candidates" @close="watchDialogOpen = false" @save-rules="saveWatchRules" />
  </section>
</template>
