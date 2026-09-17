<script setup lang="ts">
import { AlertTriangle, CalendarPlus, CheckSquare2, MessageCircle, MessageSquareText, ShieldAlert, X } from 'lucide-vue-next'
import type { DigestActionOption, MessageSummaryItem } from '@/types/workbench'

defineProps<{ item: MessageSummaryItem }>()

const emit = defineEmits<{
  openDetail: [item: MessageSummaryItem, event: MouseEvent | FocusEvent]
  closeDetail: []
  pinDetail: [item: MessageSummaryItem, event: MouseEvent]
  dismiss: [item: MessageSummaryItem]
  openAction: [item: MessageSummaryItem, action: DigestActionOption]
}>()

const actionLabels = {
  send_msg: '发消息',
  create_todo: '建待办',
  create_calendar: '建日程',
}

const actionIcons = {
  send_msg: MessageSquareText,
  create_todo: CheckSquare2,
  create_calendar: CalendarPlus,
}

const watchLabels = { group: '群', user: '人员', keyword: '关键词' }
</script>

<template>
  <article
    :data-testid="`digest-item-${item.id}`"
    class="group relative grid grid-cols-[4px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#eef0f3] py-2.5 last:border-b-0"
  >
    <span :data-testid="`digest-accent-${item.id}`" class="h-8 w-1 rounded-full" :class="item.priority === 'high' ? 'bg-[#e96b54]' : item.priority === 'mid' ? 'bg-[#d7a041]' : 'bg-[#9ba4b2]'" />
    <div :data-testid="`digest-item-main-${item.id}`" class="min-w-0 text-left">
        <div :data-testid="`digest-title-row-${item.id}`" class="flex min-w-0 items-center gap-1.5">
          <h3 class="workbench-item-title min-w-0 truncate text-[14px] font-semibold text-[#202329]">{{ item.title }}</h3>
          <span
            :data-testid="`digest-priority-${item.id}`"
            class="w-[24px] shrink-0 truncate rounded-md px-1 py-0.5 text-center text-[10px] font-semibold"
            :class="item.priority === 'high' ? 'bg-[#fff0ed] text-[#d84321]' : item.priority === 'mid' ? 'bg-[#fff7e8] text-[#a85e00]' : 'bg-[#f1f3f6] text-[#68717d]'"
          >
            {{ item.priority === 'high' ? '高' : item.priority === 'mid' ? '中' : '低' }}
          </span>
          <span v-if="item.category === 'watch' && item.watchType" :data-testid="`digest-watch-source-${item.id}`" class="w-[42px] shrink-0 truncate rounded-md bg-[#eef4ff] px-1.5 py-0.5 text-center text-[10px] font-medium text-[#1769e0]">{{ watchLabels[item.watchType] }}</span>
          <span v-if="item.isConflict" title="数据冲突" class="inline-flex w-[42px] shrink-0 items-center justify-center gap-1 truncate text-[10px] font-semibold text-[#c43825]">
            <ShieldAlert class="h-3 w-3 shrink-0" />冲突
          </span>
          <span v-else-if="item.hasHardRisk" title="硬规则" class="inline-flex w-[42px] shrink-0 items-center justify-center gap-1 truncate text-[10px] font-semibold text-[#c43825]">
            <AlertTriangle class="h-3 w-3 shrink-0" />硬规
          </span>
        </div>
        <p :data-testid="`digest-summary-${item.id}`" class="workbench-body-copy mt-1 truncate text-xs text-[#68707d]"><span class="font-medium text-[#4f5865]">摘要：</span>{{ item.summary }}</p>
        <p :data-testid="`digest-impact-${item.id}`" class="workbench-body-copy mt-0.5 truncate text-xs text-[#68707d]"><span class="font-medium text-[#4f5865]">影响：</span>{{ item.impact }}</p>
    </div>

    <div class="flex min-w-[116px] shrink-0 flex-col items-end justify-between gap-1">
      <span :data-testid="`digest-time-${item.id}`" class="workbench-meta-copy whitespace-nowrap text-[10px] text-[#a0a5ae]">{{ item.latestTime }}</span>
      <div :data-testid="`digest-card-controls-${item.id}`" class="flex items-center justify-end gap-1.5" aria-label="可执行动作与详情">
      <button
        v-for="action in item.actions.slice(0, 3)"
        :key="action.type"
        :data-testid="`digest-action-${action.type}-${item.id}`"
        :data-action-type="action.type"
        type="button"
        :disabled="!action.enabled"
        :title="action.disabledReason"
        class="inline-flex items-center gap-1 rounded-lg border border-[#e2e7ef] bg-white px-2 py-1 text-[10px] font-semibold text-[#596575] transition hover:border-[#bfd2f2] hover:bg-[#f5f8ff] hover:text-[#1769e0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fb5f3] disabled:cursor-not-allowed disabled:opacity-45"
        @click.stop="emit('openAction', item, action)"
      >
        <component :is="actionIcons[action.type]" class="h-3 w-3" />
        {{ actionLabels[action.type] }}
      </button>
      <button
        :data-testid="`digest-detail-trigger-${item.id}`"
        type="button"
        :aria-label="`查看${item.title}的${item.sourceCount}条聚合消息`"
        :title="`${item.sourceCount} 条聚合消息`"
        class="relative grid h-7 w-7 place-items-center text-[#1769e0] transition hover:text-[#0f5cc8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fb5f3]"
        @mouseenter="emit('openDetail', item, $event)"
        @mouseleave="emit('closeDetail')"
        @focus="emit('openDetail', item, $event)"
        @blur="emit('closeDetail')"
        @click="emit('pinDetail', item, $event)"
      >
        <MessageCircle class="h-4 w-4" />
        <span class="absolute inset-0 grid place-items-center pt-px text-[10px] font-bold">{{ item.sourceCount }}</span>
      </button>
      </div>
    </div>
    <button :data-testid="`digest-dismiss-${item.id}`" type="button" :aria-label="`关闭${item.title}`" class="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-white text-[#a0a6af] opacity-0 shadow-sm transition hover:text-[#58606b] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fb5f3] group-hover:opacity-100" @click.stop="emit('dismiss', item)"><X class="h-3 w-3" /></button>
  </article>
</template>
