<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { useAIChat, stripModePrefix } from '@/composables/useAIChat'
import { useChatController } from '@/composables/useWorkspaceChat'
import ThinkingChain from '@/components/workspace/ThinkingChain.vue'
import ExpertPicker from '@/components/workspace/ExpertPicker.vue'
import {
  BookOpen, Copy, FileText, Loader2,
} from 'lucide-vue-next'

const ai = useAIChat()
const chat = useChatController()

const quickCards = [
  { icon: '📋', title: '案知识库', desc: '检索、识别、译评、产品资料', fill: '帮我查知识库里的相关规定' },
  { icon: '📄', title: '营销分析报告', desc: '相对材料提炼成结构化内容', fill: '帮我生成一份营销分析报告' },
  { icon: '✅', title: '建待办', desc: '安排各项工作日程', fill: '帮我创建一个项目跟进待办' },
]

// 规格书模块2.2：点击快捷卡片 → 自动填充到输入框并聚焦（不自动发送）
function fillAndFocus(prompt: string) {
  chat.chatInput.value = prompt
  nextTick(() => {
    const el = document.querySelector('textarea') as HTMLTextAreaElement | null
    el?.focus()
  })
}

const showWelcome = computed(() =>
  ai.activeMessages.value.filter((m) => !m.id.startsWith('welcome')).length === 0 && !ai.isStreaming.value,
)

function fileIconColor(ext: string) {
  switch (ext) {
    case 'pdf': return 'text-red-500'
    case 'doc':
    case 'docx': return 'text-blue-500'
    case 'txt': return 'text-amber-500'
    case 'md': return 'text-cyan-500'
    case 'xlsx': return 'text-cyan-600'
    default: return 'text-zinc-400'
  }
}
function formatSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 px-3 pb-6 pt-4 md:px-4">
    <!-- Welcome / Expert mode empty state -->
    <div v-if="showWelcome" class="flex flex-col items-center justify-center py-10 text-center">
      <!-- ===== 专家模式：未选专家 → 统一标题 + 专家卡片网格（设计图3） ===== -->
      <template v-if="chat.runMode.value === 'task' && chat.selectedExperts.value.length === 0">
        <!-- 与日常模式统一的欢迎头：头像 + 标题 -->
        <div class="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-3xl">🐴</div>
        <h1 class="text-xl font-semibold tracking-tight text-zinc-900">小马在线，有事随时说</h1>

        <!-- 专家卡片网格（渲染在主内容区，取代日常快捷卡片） -->
        <div class="mt-8 w-full max-w-4xl px-2">
          <ExpertPicker />
        </div>
      </template>

      <!-- ===== 专家模式：已选专家 → 欢迎头保持简洁（选中态UI全部在ChatInputBox） ===== -->
      <template v-else-if="chat.runMode.value === 'task' && chat.selectedExperts.value.length > 0">
        <div class="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-3xl">🐴</div>
        <h1 class="text-xl font-semibold tracking-tight text-zinc-900">小马在线，有事随时说</h1>
      </template>

      <!-- ===== 日常办公模式：默认欢迎页 + 快捷卡片（设计图1） ===== -->
      <template v-else>
        <div class="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-3xl">🐴</div>
        <h1 class="text-xl font-semibold tracking-tight text-zinc-900">小马在线，有事随时说</h1>

        <!-- 快捷操作卡片（3张横排） -->
        <div class="mt-6 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            v-for="card in quickCards"
            :key="card.title"
            type="button"
            class="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-zinc-300 hover:shadow-sm"
            @click="fillAndFocus(card.fill)"
          >
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-lg">{{ card.icon }}</span>
            <div class="min-w-0">
              <div class="text-sm font-medium text-zinc-900">{{ card.title }}</div>
              <div class="truncate text-xs text-zinc-400">{{ card.desc }}</div>
            </div>
          </button>
        </div>
      </template>
    </div>

    <!-- Messages -->
    <template v-for="(message, index) in ai.activeMessages.value" :key="message.id">
      <div v-if="message.role === 'system'" class="flex justify-center my-1">
        <div class="max-w-[80%] rounded-full bg-zinc-100 px-4 py-1 text-center text-[11px] text-zinc-500">{{ message.content }}</div>
      </div>

      <!-- User message: right-aligned blue bubble -->
      <div v-else-if="message.role === 'user'" class="ml-auto flex w-full max-w-[80%] flex-row-reverse gap-[7px]">
        <div class="min-w-0">
          <div class="inline-block max-w-full rounded-[16px] rounded-tr-none bg-[#f0f6ff] px-3 py-2 text-[14px] leading-[26px] text-[#111]">
            <div v-if="message.attachments && message.attachments.length" class="mb-2 space-y-1.5">
              <div
                v-for="(att, i) in message.attachments"
                :key="i"
                class="flex items-center gap-2 rounded-lg border border-[#d0e0ff] bg-white/60 px-2.5 py-1.5 text-xs"
              >
                <FileText class="h-3.5 w-3.5 shrink-0" :class="fileIconColor(att.ext)" />
                <span class="truncate font-medium text-zinc-700">{{ att.name }}</span>
                <span v-if="att.size" class="shrink-0 text-[10px] text-zinc-400">{{ formatSize(att.size) }}</span>
              </div>
            </div>
            <div class="whitespace-pre-wrap">{{ stripModePrefix(message.content) }}</div>
          </div>
        </div>
      </div>

      <!-- Assistant message: no avatar, just content -->
      <div v-else class="flex w-full gap-[7px]">
        <div class="min-w-0">
          <!-- Thinking chain header -->
          <div v-if="chat.getLastThinking(message) && message.id !== 'welcome'" class="mb-1">
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[14px] text-[#888] transition hover:bg-zinc-100"
              @click="chat.thinkingCollapsed.value = !chat.thinkingCollapsed.value"
            >
              <span>全部完成</span>
              <span>·</span>
              <span>思考用时 {{ chat.getLastThinking(message)!.length * 8 }} 秒</span>
              <svg class="h-3 w-3 transition-transform" :class="chat.thinkingCollapsed.value ? '' : 'rotate-180'" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <ThinkingChain
              v-if="!chat.thinkingCollapsed.value"
              :steps="chat.getLastThinking(message)!"
              :is-collapsed="false"
              @toggle="chat.thinkingCollapsed.value = !chat.thinkingCollapsed.value"
            />
          </div>

          <!-- Markdown content -->
          <div class="message-content max-w-full overflow-x-auto break-words text-[14px] leading-[26px] text-[#0a0a0a]">
            <div v-html="chat.renderMarkdown(message.content)" />
          </div>

          <!-- Action bar: copy only -->
          <div v-if="message.id !== 'welcome'" class="message-actions-bar mt-1 flex items-center gap-1">
            <button class="rounded-md p-1 text-[#666] transition hover:bg-zinc-100" @click="chat.copyMessage(message.content)" title="复制">
              <Copy class="h-[18px] w-[18px]" />
            </button>
          </div>

          <!-- Source refs -->
          <div v-if="message.id !== 'welcome' && chat.selectedKnowledgeRefs.value.length" class="mt-2">
            <button type="button" class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-[#0066ff] transition hover:bg-[#f0f6ff]">
              <BookOpen class="h-3.5 w-3.5" />
              参考 {{ chat.selectedKnowledgeRefs.value.length }} 篇资料
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Active thinking -->
    <div v-if="ai.isStreaming.value && ai.currentThinking.value.length > 0 && !ai.isApiConfigured()" class="flex gap-[7px]">
      <div class="min-w-0">
        <ThinkingChain :steps="ai.currentThinking.value" :is-collapsed="chat.thinkingCollapsed.value" @toggle="chat.thinkingCollapsed.value = !chat.thinkingCollapsed.value" />
      </div>
    </div>

    <!-- Streaming -->
    <div v-if="chat.streamingContent.value" class="flex gap-[7px]">
      <div class="max-w-[82%] overflow-x-auto break-words text-[14px] leading-[26px] text-[#0a0a0a]">{{ chat.streamingContent.value }}<span class="inline-block h-4 w-1.5 animate-pulse bg-zinc-400 align-text-bottom ml-0.5" /></div>
    </div>

    <!-- Loading -->
    <div v-if="ai.isStreaming.value && !chat.streamingContent.value && ai.currentThinking.value.length === 0" class="flex gap-[7px]">
      <div class="flex items-center gap-2 rounded-2xl rounded-tl-md border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-400">
        <Loader2 class="h-4 w-4 animate-spin" />正在思考...
      </div>
    </div>
  </div>
</template>
