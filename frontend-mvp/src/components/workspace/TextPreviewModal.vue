<script setup lang="ts">
import { useChatController } from '@/composables/useWorkspaceChat'
import { FileText, X, Copy, SendHorizontal, Check } from 'lucide-vue-next'
import { ref } from 'vue'

const chat = useChatController()
const copied = ref(false)

function formatSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function copyAll() {
  if (!chat.textPreview.value?.content) return
  navigator.clipboard?.writeText(chat.textPreview.value.content).then(() => {
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  }).catch(() => {})
}

// 将文本作为上下文带入输入框（不自动发送）
function useAsContext() {
  const content = chat.textPreview.value?.content
  if (!content) return
  const prefix = chat.chatInput.value.trim() ? chat.chatInput.value + '\n\n' : ''
  chat.chatInput.value = prefix + content
  chat.closeTextPreview()
  setTimeout(() => {
    const el = document.querySelector('textarea') as HTMLTextAreaElement | null
    el?.focus()
  }, 0)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="chat.textPreview.value"
      class="fixed inset-0 z-[98] flex items-center justify-center bg-zinc-950/40 p-4"
      @click.self="chat.closeTextPreview()"
    >
      <div class="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <!-- Header -->
        <div class="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
          <FileText class="h-4 w-4 text-amber-500" />
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-semibold text-zinc-900">{{ chat.textPreview.value.name }}</div>
            <div v-if="chat.textPreview.value.size" class="text-[11px] text-zinc-400">{{ formatSize(chat.textPreview.value.size) }}</div>
          </div>
          <button
            type="button"
            class="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="关闭"
            @click="chat.closeTextPreview()"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Body -->
        <div class="min-h-0 flex-1 overflow-y-auto p-4">
          <pre
            v-if="chat.textPreview.value.content"
            class="whitespace-pre-wrap break-words font-sans text-[13px] leading-6 text-zinc-700"
          >{{ chat.textPreview.value.content }}</pre>
          <div v-else class="flex flex-col items-center py-12 text-center">
            <FileText class="h-8 w-8 text-zinc-200" />
            <p class="mt-2 text-xs text-zinc-400">该文件暂无可预览的文本内容</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-2 border-t border-zinc-100 px-4 py-3">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
            @click="copyAll"
          >
            <component :is="copied ? Check : Copy" class="h-3.5 w-3.5" />
            {{ copied ? '已复制' : '复制全部' }}
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800"
            :disabled="!chat.textPreview.value.content"
            @click="useAsContext"
          >
            <SendHorizontal class="h-3.5 w-3.5" />
            粘贴为上下文
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
