<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowUp, MessageSquareText, Copy, CheckCircle2, FileText, X } from 'lucide-vue-next'
import type { DocItem, QaMessage } from '@/types/knowledge'

const props = defineProps<{
  kbName?: string
  docs: DocItem[]
  previewDoc: DocItem | null
}>()

const emit = defineEmits<{
  close: []
}>()

const messages = ref<QaMessage[]>([])
const inputText = ref('')
const copiedId = ref<number | null>(null)

const sources = computed(() => {
  const items = props.previewDoc ? [props.previewDoc, ...props.docs.filter(d => d.name !== props.previewDoc?.name)] : props.docs
  return items.slice(0, 3)
})

function send() {
  const text = inputText.value.trim()
  if (!text) return
  messages.value.push({ id: Date.now(), role: 'user', content: text })
  inputText.value = ''

  // Mock response
  setTimeout(() => {
    const reply: QaMessage = {
      id: Date.now() + 1, role: 'assistant',
      content: `已在「${props.kbName || '当前知识库'}」中完成检索。根据[[ref:1]]，相关内容如下：\n\n1. 员工加班与休假需提前报备审批\n2. 具体条款可参考相关文档的详细说明\n3. 如需进一步按行业场景适配，可参考更多资料`,
      citations: sources.value.map(s => s.name),
    }
    messages.value.push(reply)
  }, 600)
}

function copyMsg(msg: QaMessage) {
  navigator.clipboard?.writeText(msg.content)
  copiedId.value = msg.id
  setTimeout(() => { copiedId.value = null }, 2000)
}

// Parse [[ref:N]] in content
function parseContent(raw: string) {
  const parts: { text?: string; ref?: number }[] = []
  const re = /\[\[ref:(\d+)\]\]/g
  let last = 0, match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    if (match.index > last) parts.push({ text: raw.slice(last, match.index) })
    parts.push({ ref: parseInt(match[1], 10) })
    last = re.lastIndex
  }
  if (last < raw.length) parts.push({ text: raw.slice(last) })
  return parts
}
</script>

<template>
  <aside class="flex w-[360px] shrink-0 flex-col border-l border-hairline bg-white">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-hairline px-4 py-2.5">
      <div class="flex items-center gap-2">
        <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand-blue text-white">
          <MessageSquareText class="h-3.5 w-3.5" />
        </div>
        <span class="text-sm font-semibold text-charcoal">小智</span>
      </div>
      <button class="rounded-lg p-1.5 text-stone hover:bg-surface" @click="$emit('close')">
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- Messages -->
    <div class="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm">
      <div v-if="messages.length === 0" class="space-y-3">
        <div class="rounded-xl bg-surface px-4 py-3">
          <p class="text-sm font-semibold text-charcoal">你好，我是小智</p>
          <p class="mt-1 text-xs leading-relaxed text-stone">我可以基于当前知识库和已打开文件回答问题</p>
        </div>
        <button
          v-for="q in ['这个知识库里有哪些可复用案例？', '预算分档应该怎么解释给客户？', '找出需要人工复核的风险点']"
          :key="q"
          class="w-full rounded-xl border border-hairline px-3 py-2 text-left text-xs text-stone hover:border-brand-blue hover:bg-blue-50"
          @click="inputText = q"
        >
          {{ q }}
        </button>
      </div>

      <div v-for="msg in messages" :key="msg.id" class="group">
        <div :class="msg.role === 'user' ? 'ml-6' : 'mr-6'">
          <div
            class="rounded-2xl px-3 py-2.5 leading-relaxed"
            :class="msg.role === 'user' ? 'bg-ink text-white' : 'bg-surface text-charcoal'"
          >
            <span v-for="(seg, i) in parseContent(msg.content)" :key="i">
              <span v-if="seg.text">{{ seg.text }}</span>
              <sup
                v-else
                class="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-brand-blue/20 text-[10px] font-semibold text-brand-blue hover:bg-brand-blue/30"
              >{{ seg.ref }}</sup>
            </span>
          </div>

          <!-- Citations -->
          <div v-if="msg.citations?.length" class="mt-2 space-y-1">
            <div
              v-for="(cit, idx) in msg.citations"
              :key="cit"
              class="flex cursor-pointer items-center gap-2 rounded-lg border border-hairline px-2 py-1.5 text-[11px] hover:border-brand-blue hover:bg-blue-50/30"
            >
              <FileText class="h-3 w-3 shrink-0 text-muted" />
              <span class="min-w-0 flex-1 truncate text-charcoal">{{ cit }}</span>
              <sup class="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-blue/20 text-[9px] font-semibold text-brand-blue">{{ idx + 1 }}</sup>
            </div>
          </div>
        </div>
        <div class="mt-1 flex gap-1 px-1 opacity-0 transition group-hover:opacity-100" :class="msg.role === 'user' ? 'justify-end' : ''">
          <button class="rounded-md p-1 text-muted hover:bg-surface" @click="copyMsg(msg)">
            <CheckCircle2 v-if="copiedId === msg.id" class="h-3.5 w-3.5 text-emerald-500" />
            <Copy v-else class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="border-t border-hairline p-3">
      <div class="flex items-start gap-2 rounded-xl border border-hairline bg-surface px-3 py-2">
        <textarea
          v-model="inputText"
          class="max-h-[120px] min-h-[36px] flex-1 resize-none bg-transparent py-1 text-sm leading-relaxed outline-none placeholder:text-muted"
          placeholder="问小智任何问题..."
          rows="1"
          @keydown.enter.exact.prevent="send"
        />
        <button
          class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition"
          :class="inputText.trim() ? 'bg-ink text-white' : 'bg-hairline text-muted cursor-not-allowed'"
          :disabled="!inputText.trim()"
          @click="send"
        >
          <ArrowUp class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  </aside>
</template>
