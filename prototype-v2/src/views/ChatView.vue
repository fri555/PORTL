<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus, MessageSquareText, Copy, CheckCircle2, Pencil, RotateCw, Trash2, ChevronDown, X
} from 'lucide-vue-next'
import { chatSessions, type ChatSession, type ChatMessage } from '@/mock/chat'

const router = useRouter()
const sessions = ref<ChatSession[]>(chatSessions)
const activeSessionId = ref('s3')
const inputText = ref('')
const chatEndRef = ref<HTMLElement | null>(null)
const copiedId = ref<number | null>(null)

const activeSession = computed(() => sessions.value.find(s => s.id === activeSessionId.value) || sessions.value[0])

function sendMessage() {
  const text = inputText.value.trim()
  if (!text || !activeSession.value) return

  const userMsg: ChatMessage = { id: Date.now(), role: 'user', content: text, timestamp: '刚刚' }
  activeSession.value.messages.push(userMsg)
  inputText.value = ''

  // Mock response
  setTimeout(() => {
    const reply: ChatMessage = {
      id: Date.now() + 1, role: 'assistant',
      content: '好的，我了解了您的需求。根据知识库中的相关资料，我为您整理了以下信息：\n\n1. **关键要点**：集团制度知识库中有相关规定\n2. **参考文件**：可查看《考勤管理制度_v3》\n3. **建议方案**：如需进一步分析，请补充更多细节',
      timestamp: '刚刚',
    }
    activeSession.value.messages.push(reply)
  }, 800)
}

function newSession() {
  const id = `s${Date.now()}`
  sessions.value.unshift({ id, title: '新对话', updatedAt: '刚刚', messages: [] })
  activeSessionId.value = id
}

function copyMessage(msg: ChatMessage) {
  navigator.clipboard?.writeText(msg.content)
  copiedId.value = msg.id
  setTimeout(() => { copiedId.value = null }, 2000)
}
</script>

<template>
  <div class="flex h-[calc(100vh-3.5rem)]">
    <!-- Session sidebar -->
    <aside class="w-64 shrink-0 border-r border-hairline bg-white p-3">
      <button
        class="flex w-full items-center gap-2 rounded-xl border border-hairline px-3 py-2.5 text-sm font-medium text-charcoal hover:bg-surface"
        @click="newSession"
      >
        <Plus class="h-4 w-4" />
        新建对话
      </button>

      <div class="mt-3 space-y-0.5">
        <button
          v-for="session in sessions"
          :key="session.id"
          class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition"
          :class="session.id === activeSessionId ? 'bg-surface text-ink font-medium' : 'text-stone hover:bg-surface'"
          @click="activeSessionId = session.id"
        >
          <MessageSquareText class="h-4 w-4 shrink-0" />
          <span class="min-w-0 flex-1 truncate">{{ session.title }}</span>
          <span class="shrink-0 text-micro text-muted">{{ session.updatedAt }}</span>
        </button>
      </div>
    </aside>

    <!-- Chat area -->
    <div class="flex flex-1 flex-col">
      <div class="flex-1 overflow-y-auto px-4 py-6">
        <div v-if="!activeSession.messages.length" class="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquareText class="mb-3 h-10 w-10 text-muted" />
          <p class="text-body-md text-stone">开始一段新的对话</p>
          <p class="mt-1 text-body-sm text-muted">输入你的问题，小智会基于知识库为你解答</p>
        </div>

        <div v-for="msg in activeSession.messages" :key="msg.id" class="group mb-4">
          <div :class="msg.role === 'user' ? 'ml-auto max-w-[70%]' : 'mr-auto max-w-[70%]'">
            <div
              class="rounded-2xl px-4 py-3 text-body-sm leading-relaxed"
              :class="msg.role === 'user' ? 'bg-ink text-white' : 'bg-surface text-charcoal'"
            >
              <div class="whitespace-pre-wrap">{{ msg.content }}</div>
            </div>
          </div>
          <div class="mt-1 flex gap-1 px-1 opacity-0 transition group-hover:opacity-100" :class="msg.role === 'user' ? 'justify-end' : ''">
            <button class="rounded-md p-1 text-muted hover:bg-surface hover:text-charcoal" @click="copyMessage(msg)">
              <CheckCircle2 v-if="copiedId === msg.id" class="h-3.5 w-3.5 text-emerald-500" />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div ref="chatEndRef" />
      </div>

      <!-- Input area -->
      <div class="border-t border-hairline bg-white p-4">
        <div class="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-hairline bg-surface px-4 py-2">
          <textarea
            v-model="inputText"
            class="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent py-2 text-body-sm outline-none placeholder:text-muted"
            placeholder="输入你的问题..."
            rows="1"
            @keydown.enter.exact.prevent="sendMessage"
          />
          <button
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition"
            :class="inputText.trim() ? 'bg-ink text-white' : 'bg-hairline text-muted cursor-not-allowed'"
            :disabled="!inputText.trim()"
            @click="sendMessage"
          >
            <RotateCw class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
