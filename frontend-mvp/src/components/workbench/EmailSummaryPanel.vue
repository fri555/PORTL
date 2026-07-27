<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowUpRight, Inbox, Paperclip } from 'lucide-vue-next'
import WorkbenchBoardHeader from './WorkbenchBoardHeader.vue'
import { workbenchEmailSummaries } from '@/mock/workbench'
import type { EmailSummaryItem } from '@/types/workbench'

const props = withDefaults(defineProps<{
  items?: EmailSummaryItem[]
  connectionState?: 'demo' | 'pending' | 'live'
  refreshing?: boolean
}>(), {
  items: undefined,
  connectionState: 'demo',
})

const emit = defineEmits<{ refresh: [] }>()
const query = ref('')
const sourceItems = computed(() => props.items ?? workbenchEmailSummaries)
const filteredItems = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return sourceItems.value.filter((item) => !keyword || [item.subject, item.senderName, item.senderEmail, item.summary, item.receivedAt].join(' ').toLowerCase().includes(keyword))
})

function openOriginal(item: EmailSummaryItem) {
  window.open(`/api/email/sso/open?mailId=${encodeURIComponent(item.mailId)}`, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <section data-testid="email-summary-panel" class="flex h-[316px] flex-col overflow-hidden rounded-[22px] border border-[#e7e9ee] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.035)]">
    <WorkbenchBoardHeader v-model:query="query" title="邮件摘要" search-label="搜索邮件摘要" test-id-prefix="email" :refreshing="refreshing" @refresh="emit('refresh')"><template #title-meta><span class="text-[10px] font-medium" :class="connectionState === 'pending' ? 'text-[#a85e00]' : 'text-[#7c8490]'">{{ connectionState === 'pending' ? '待接入' : `${sourceItems.length} 封` }}</span></template></WorkbenchBoardHeader>

    <div v-if="filteredItems.length" class="elegant-scrollbar min-h-0 flex-1 overflow-y-auto px-5" data-testid="email-summary-scroll-area">
      <article
        v-for="item in filteredItems"
        :key="item.id"
        :data-testid="`email-summary-item-${item.id}`"
        class="group grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#eef0f3] py-3 last:border-b-0"
      >
        <span class="h-8 w-1 rounded-full" :class="item.unread ? 'bg-[#1769e0]' : 'bg-[#e2e6eb]'" />
        <button type="button" class="min-w-0 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-[#8fb5f3]" @click="openOriginal(item)">
          <div class="flex min-w-0 items-center gap-2">
            <h3 :data-testid="`email-title-${item.id}`" class="workbench-item-title min-w-0 truncate text-[14px] font-semibold text-[#202329]">{{ item.subject }}</h3>
            <span v-if="item.important" :data-testid="`email-tag-${item.id}`" class="shrink-0 rounded-md bg-[#fff0ed] px-1.5 py-0.5 text-[10px] font-semibold text-[#d84321]">重要</span>
          </div>
          <p class="workbench-meta-copy mt-1 truncate text-[10px] text-[#828a95]">{{ item.senderName }} · {{ item.senderEmail }}</p>
          <p class="workbench-body-copy mt-1 truncate text-xs text-[#68707d]">{{ item.summary }}</p>
        </button>
        <div class="flex h-full shrink-0 flex-col items-end justify-between gap-1">
          <span :data-testid="`email-time-${item.id}`" class="workbench-meta-copy whitespace-nowrap text-[10px] text-[#a0a5ae]">{{ item.receivedAt }}</span>
          <div class="flex items-center gap-2"><span v-if="item.attachmentCount" class="inline-flex items-center gap-1 text-[10px] text-[#939aa4]"><Paperclip class="h-3 w-3" />{{ item.attachmentCount }}</span>
          <button
            :data-testid="`email-open-original-${item.id}`"
            type="button"
            :aria-label="`通过企业邮单点登录查看原邮件：${item.subject}`"
            title="通过 SSO 查看原邮件"
            class="grid h-8 w-8 place-items-center rounded-xl border border-[#dfe6f1] bg-white text-[#1769e0] transition hover:border-[#b9cdf0] hover:bg-[#f1f6ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fb5f3]"
            @click="openOriginal(item)"
          >
            <ArrowUpRight class="h-3.5 w-3.5" />
          </button>
          </div>
        </div>
      </article>
    </div>
    <div v-else class="grid min-h-0 flex-1 place-items-center text-center"><div><Inbox class="mx-auto h-6 w-6 text-[#b2b7bf]" /><p class="mt-2 text-xs text-[#8b909a]">{{ query ? '未找到匹配邮件' : connectionState === 'pending' ? '腾讯企业邮待接入' : '暂无邮件摘要' }}</p><p v-if="connectionState === 'pending' && !query" class="mt-1 text-[10px] text-[#a0a6af]">接入方案由技术完成验证后启用</p></div></div>
  </section>
</template>
