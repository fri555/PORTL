<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowUp, Bot, Copy, X } from 'lucide-vue-next'
import type { QaPanelMessage } from '@/types/knowledge-source'

const emit = defineEmits<{ close: [] }>()
const width = ref(360)
const draft = ref('')
const feedback = ref('')
const messages = ref<QaPanelMessage[]>([
  {
    id: 1,
    role: 'assistant',
    content: '在采购与库存协同中，应优先实现交付期与库存深度的平衡，并根据真实需求及时调整补货节奏。',
    citation: '参考 1 篇资料',
  },
])
const canSend = computed(() => Boolean(draft.value.trim()))

function beginResize(event: PointerEvent) {
  const startX = event.clientX
  const startWidth = width.value
  const move = (next: PointerEvent) => {
    width.value = Math.min(520, Math.max(320, startWidth + startX - next.clientX))
  }
  const stop = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', stop)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', stop)
}

function send() {
  const content = draft.value.trim()
  if (!content) return
  messages.value.push({ id: Date.now(), role: 'user', content })
  messages.value.push({
    id: Date.now() + 1,
    role: 'assistant',
    content: '根据当前知识库资料，建议先明确目标与约束，再结合已有方法逐项验证并形成可执行方案。',
    citation: '参考 1 篇资料',
  })
  draft.value = ''
}

async function copy(content: string) {
  try { await navigator.clipboard?.writeText(content) } catch { /* local preview fallback */ }
  feedback.value = '已复制'
}
</script>

<template>
  <aside data-testid="knowledge-qa-panel" class="qa-panel" :style="{ '--qa-width': `${width}px` }">
    <button class="qa-resizer" aria-label="调整问答面板宽度" @pointerdown="beginResize" />
    <header class="qa-header">
      <div class="qa-title"><Bot :size="19" stroke-width="1.8" />小智问答</div>
      <button class="icon-button" aria-label="关闭小智问答" @click="emit('close')"><X :size="19" /></button>
    </header>

    <div class="qa-scroll">
      <article v-for="message in messages" :key="message.id" :class="['qa-message', message.role]">
        <p>{{ message.content }}</p>
        <div v-if="message.role === 'assistant'" class="qa-message-actions">
          <button aria-label="复制回答" @click="copy(message.content)"><Copy :size="14" /></button>
          <button v-if="message.citation" @click="feedback = '已展开参考资料'">{{ message.citation }} ↗</button>
        </div>
      </article>
      <span v-if="feedback" class="qa-feedback">{{ feedback }}</span>
    </div>

    <footer class="qa-footer">
      <div class="qa-composer">
        <textarea v-model="draft" rows="2" placeholder="输入你的问题..." @keydown.enter.exact.prevent="send" />
        <button aria-label="发送" :disabled="!canSend" @click="send"><ArrowUp :size="16" /></button>
      </div>
      <p>内容由 AI 生成，请核实重要信息</p>
    </footer>
  </aside>
</template>

<style scoped>
.qa-panel{position:relative;display:flex;width:var(--qa-width);min-width:var(--qa-width);height:100%;flex-direction:column;border-left:1px solid #eee;background:#fff;box-shadow:-4px 0 16px rgba(0,0,0,.025);color:#111}.qa-resizer{position:absolute;left:-4px;top:0;z-index:2;width:8px;height:100%;cursor:col-resize}.qa-header{display:flex;height:56px;min-height:56px;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid #f3f3f3}.qa-title{display:flex;align-items:center;gap:8px;font-size:16px;font-weight:500}.icon-button{display:grid;width:30px;height:30px;place-items:center;border-radius:7px;color:#777}.icon-button:hover{background:#f7f7f9}.qa-scroll{flex:1;overflow:auto;padding:20px 24px}.qa-message{font-size:14px;line-height:1.9}.qa-message.user{margin:18px 0 14px auto;width:fit-content;max-width:90%;border-radius:12px;background:#f7f7f9;padding:8px 12px}.qa-message.assistant{margin-bottom:24px}.qa-message-actions{display:flex;align-items:center;gap:12px;margin-top:12px;color:#888;font-size:12px}.qa-message-actions button{display:flex;align-items:center;gap:3px}.qa-feedback{font-size:12px;color:#888}.qa-footer{padding:10px 16px 14px}.qa-composer{position:relative;display:flex;min-height:96px;align-items:flex-end;border:1px solid #e6e6e6;border-radius:14px;background:#fff;padding:14px;box-shadow:0 4px 16px rgba(0,0,0,.06)}.qa-composer textarea{width:100%;resize:none;border:0;outline:0;font:14px/22px inherit}.qa-composer textarea::placeholder{color:#b6b6b6}.qa-composer button{display:grid;width:34px;height:34px;min-width:34px;place-items:center;border-radius:50%;background:#111;color:white}.qa-composer button:disabled{background:#ededed;color:#bbb}.qa-footer>p{margin-top:10px;text-align:center;font-size:12px;color:#aaa}@media(max-width:640px){.qa-panel{position:fixed;inset:56px 0 0;z-index:240;width:100%!important;min-width:100%!important}.qa-resizer{display:none}}@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
</style>
