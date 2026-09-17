<script setup lang="ts">
import { AlertTriangle, Bot, MessageSquareMore, ShieldAlert, UserRound, UsersRound, X } from 'lucide-vue-next'
import type { MessageSummaryItem } from '@/types/workbench'

defineProps<{ item: MessageSummaryItem; position: { left: number; top: number }; pointerTop?: number }>()
defineEmits<{ close: [] }>()

function isGroup(conversationName: string, conversationId?: string) {
  return conversationName.includes('群') || conversationId?.toLowerCase().includes('group') === true
}
</script>

<template>
    <aside
      data-testid="digest-detail-floating"
      :data-bound-to="item.id"
      role="dialog"
      :aria-label="`${item.title}详情`"
      data-placement="right-of-trigger"
      class="pointer-events-auto absolute z-[170] w-[440px] max-w-[calc(100vw-32px)] overflow-visible"
      :style="{ left: `${position.left}px`, top: `${position.top}px` }"
    >
      <span data-testid="digest-detail-pointer" class="absolute -left-2 z-10 h-4 w-4 rotate-45 border-b border-l border-[#dde3ec] bg-white" :style="{ top: `${pointerTop ?? 56}px` }" />
      <div class="flex max-h-[470px] flex-col overflow-hidden rounded-[20px] border border-[#dde3ec] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
      <header class="flex items-start justify-between gap-4 border-b border-[#eceff3] px-6 py-5">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-md bg-[#f1f4f8] px-2 py-1 text-[10px] font-semibold text-[#68717d]">{{ item.businessDomain }}</span>
            <span class="text-[10px] font-semibold text-[#8f96a1]">{{ item.priority === 'high' ? '高' : item.priority === 'mid' ? '中' : '低' }}</span>
          </div>
          <h3 class="mt-2 text-[14px] font-semibold tracking-[-0.01em] text-[#1d2128]">{{ item.title }}</h3>
          <p class="mt-1 text-xs leading-5 text-[#68717d]">{{ item.summary }}</p>
        </div>
        <button type="button" aria-label="关闭详情" class="grid h-8 w-8 place-items-center rounded-lg text-[#8a929d] hover:bg-[#f2f4f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fb5f3]" @click="$emit('close')">
          <X class="h-4 w-4" />
        </button>
      </header>

      <div class="elegant-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <section class="rounded-2xl bg-[#f5f8ff] p-4">
          <h4 class="flex items-center gap-2 text-[14px] font-semibold text-[#234a86]"><Bot class="h-4 w-4" />AI 分析</h4>
          <p class="mt-2 text-xs leading-5 text-[#5e6f87]"><strong class="text-[#344967]">业务影响：</strong>{{ item.impact }}</p>
          <ul class="mt-2 space-y-1.5">
            <li v-for="analysis in item.aiAnalysis" :key="analysis" class="text-xs leading-5 text-[#53657f]">• {{ analysis }}</li>
          </ul>
        </section>

        <section v-if="item.isConflict" class="mt-4 rounded-2xl border border-[#f2c9c2] bg-[#fff5f3] p-4">
          <h4 class="flex items-center gap-2 text-[14px] font-semibold text-[#b73524]"><ShieldAlert class="h-4 w-4" />数据冲突</h4>
          <p class="mt-2 text-xs leading-5 text-[#844a42]">{{ item.conflictDetail }}</p>
        </section>

        <section class="mt-4">
          <div class="flex items-center justify-between gap-4">
            <h4 class="flex items-center gap-2 text-[14px] font-semibold text-[#252a31]"><MessageSquareMore class="h-4 w-4 text-[#67717d]" />消息来源</h4>
            <span class="text-[10px] text-[#9299a4]">{{ item.sourceCount }} 条来源</span>
          </div>
          <div v-if="item.sources.length" class="mt-2 divide-y divide-[#edf0f4] rounded-2xl bg-[#f8f9fb] px-3">
            <article v-for="source in item.sources" :key="source.id" class="grid grid-cols-[36px_minmax(0,1fr)_auto] gap-3 py-3">
              <span :data-testid="`digest-source-avatar-${source.id}`" class="grid h-9 w-9 place-items-center rounded-full bg-[#e9f1ff] text-[#1769e0]">
                <UsersRound v-if="isGroup(source.conversationName, source.conversationId)" class="h-4 w-4" />
                <UserRound v-else class="h-4 w-4" />
              </span>
              <div class="min-w-0">
                <p class="truncate text-[10px] font-semibold text-[#4b5d76]">{{ source.senderName }} · {{ source.conversationName }}</p>
                <p class="mt-1 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-[#515965]">{{ source.content }}</p>
              </div>
              <span class="whitespace-nowrap pt-0.5 text-[10px] text-[#9299a4]">{{ source.sentAt }}</span>
            </article>
          </div>
          <div v-else class="mt-3 flex items-center gap-2 rounded-xl bg-[#fff8ed] px-3 py-3 text-xs text-[#8c6a2d]">
            <AlertTriangle class="h-4 w-4" />来源暂不可用，未使用 AI 内容代替原文。
          </div>
        </section>
      </div>
      </div>
    </aside>
</template>
