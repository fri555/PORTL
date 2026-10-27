<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { Copy, Save, Sparkles, X } from 'lucide-vue-next'
import type { VideoTask } from '@/types/video-generation'
import { copyTextWithTimeout } from '@/utils/copyText'

interface PromptVersion {
  prompt: string
  source: 'edit' | 'optimize'
  createdAt: string
  optimizeDescription?: string
}
const props = defineProps<{ task: VideoTask }>()
const emit = defineEmits<{ 'update-input': [input: Record<string, any>] }>()
const prompt = ref('')
const versions = ref<PromptVersion[]>([])
const currentInput = ref<Record<string, any>>({})
const input = ref<HTMLTextAreaElement | null>(null)
const status = ref('')
const copyBusy = ref(false)
const copied = ref(false)
const optimizeOpen = ref(false)
const instruction = ref('')
const optimizedPrompt = ref('')

function editPrompt() {
  copied.value = false
  status.value = ''
}

function derivePrompt(task: VideoTask) {
  const requirements = String(
    task.input.parameters?.requirements ??
      task.input.requirements ??
      task.input.importedPrompt ??
      '',
  ).trim()
  const referenceNames = (Array.isArray(task.input.references) ? task.input.references : [])
    .map((item: any) => '@' + String(item.name ?? ''))
    .filter((item: string) => item !== '@')
  return [
    requirements || '请先补充创作需求。',
    referenceNames.length ? `参考素材：${referenceNames.join('、')}` : '',
    '画面建议：围绕创作需求安排主体、场景与镜头运动，保持人物、物品和画面风格连贯。',
  ]
    .filter(Boolean)
    .join('\n\n')
}
watch(
  () => props.task,
  (task) => {
    currentInput.value = { ...task.input }
    prompt.value = typeof task.input.prompt === 'string' ? task.input.prompt : derivePrompt(task)
    versions.value = Array.isArray(task.input.promptVersions) ? [...task.input.promptVersions] : []
    status.value = ''
    optimizeOpen.value = false
  },
  { immediate: true },
)

function saveVersion(source: PromptVersion['source'], text = prompt.value, description?: string) {
  if (!text.trim()) {
    status.value = '请填写 Prompt 内容'
    return
  }
  const version: PromptVersion = {
    prompt: text.trim(),
    source,
    createdAt: new Date().toISOString(),
    ...(description ? { optimizeDescription: description } : {}),
  }
  versions.value = [...versions.value, version]
  prompt.value = version.prompt
  currentInput.value = {
    ...currentInput.value,
    prompt: version.prompt,
    promptVersions: versions.value,
  }
  emit('update-input', currentInput.value)
  status.value = '已保存本地演示版本'
}
async function copyPrompt() {
  if (copyBusy.value || !prompt.value.trim()) return
  copyBusy.value = true
  try {
    await copyTextWithTimeout(prompt.value)
    copied.value = true
    status.value = 'Prompt 已复制'
  } catch {
    status.value = '自动复制未完成，请在文本框中手动复制'
    await nextTick()
    input.value?.focus()
    input.value?.select()
  } finally {
    copyBusy.value = false
  }
}
function openOptimization() {
  instruction.value = ''
  optimizedPrompt.value = ''
  optimizeOpen.value = true
}
function generateOptimization() {
  if (!instruction.value.trim()) return
  optimizedPrompt.value =
    prompt.value.trim() +
    '\n\n优化方向：' +
    instruction.value.trim() +
    '\n镜头建议：补充清晰的主体动作、景别与光线细节，保持画面衔接连贯。'
}
function adoptOptimization() {
  if (!optimizedPrompt.value) return
  saveVersion('optimize', optimizedPrompt.value, instruction.value.trim())
  optimizeOpen.value = false
}
</script>

<template>
  <section class="prompt-result">
    <p class="demo-note"><span>原型演示</span>根据创作需求展示本地 Prompt，支持编辑与保存。</p>
    <div class="result-toolbar">
      <button
        type="button"
        :disabled="copyBusy || !prompt.trim()"
        data-testid="copy-prompt-btn"
        @click="copyPrompt"
      >
        <Copy :size="14" />{{ copied ? '已复制' : '复制 Prompt' }}
      </button>
      <button
        type="button"
        :disabled="!prompt.trim()"
        data-testid="optimize-btn"
        @click="openOptimization"
      >
        <Sparkles :size="14" />提示词优化
      </button>
      <button
        class="primary-button"
        type="button"
        :disabled="!prompt.trim()"
        data-testid="save-version-btn"
        @click="saveVersion('edit')"
      >
        <Save :size="14" />保存版本
      </button>
    </div>
    <textarea
      ref="input"
      v-model="prompt"
      rows="12"
      aria-label="视频 Prompt"
      data-testid="prompt-textarea"
      @input="editPrompt"
    />
    <p v-if="status" role="status" class="result-status">{{ status }}</p>
    <small v-if="versions.length" class="version-count"
      >已保存 {{ versions.length }} 个本地版本</small
    >
    <div
      v-if="optimizeOpen"
      class="modal-overlay"
      @click.self="optimizeOpen = false"
      @keydown.esc="optimizeOpen = false"
    >
      <section class="optimize-dialog" role="dialog" aria-modal="true" aria-label="AI 优化">
        <header>
          <h2>AI 优化</h2>
          <button
            type="button"
            class="close-button"
            aria-label="关闭优化"
            @click="optimizeOpen = false"
          >
            <X :size="18" />
          </button>
        </header>
        <p class="dialog-note">原型演示：按填写的方向组织优化文本。</p>
        <textarea
          v-model="instruction"
          rows="3"
          aria-label="优化方向"
          placeholder="描述你希望的优化方向"
          data-testid="optimize-requirement"
          @input="optimizedPrompt = ''"
        />
        <button
          class="primary-button generate-button"
          type="button"
          :disabled="!instruction.trim()"
          data-testid="optimize-generate"
          @click="generateOptimization"
        >
          生成 prompt
        </button>
        <textarea
          v-if="optimizedPrompt"
          :value="optimizedPrompt"
          rows="6"
          readonly
          aria-label="优化后的 Prompt"
          data-testid="optimize-result"
        />
        <footer>
          <button type="button" @click="optimizeOpen = false">取消</button
          ><button
            type="button"
            class="primary-button"
            :disabled="!optimizedPrompt"
            data-testid="optimize-adopt"
            @click="adoptOptimization"
          >
            采用此版本
          </button>
        </footer>
      </section>
    </div>
  </section>
</template>

<style scoped>
.prompt-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 960px;
  padding-bottom: 24px;
  color: #18181b;
  font-size: 14px;
}
.demo-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 4px;
  color: #71717a;
  font-size: 12px;
  line-height: 1.6;
}
.demo-note span {
  white-space: nowrap;
  border-radius: 4px;
  background: #f4f4f5;
  padding: 2px 6px;
  color: #52525b;
}
.result-toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.prompt-result button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  border: 1px solid #e4e4e7;
  border-radius: 6px;
  background: #fff;
  padding: 0 12px;
  color: #18181b;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.prompt-result button:hover {
  background: #f4f4f5;
}
.prompt-result button.primary-button {
  border-color: #18181b;
  background: #18181b;
  color: #fff;
}
.prompt-result button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.prompt-result textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 120px;
  border: 1px solid #e4e4e7;
  border-radius: 6px;
  background: #fff;
  padding: 12px;
  resize: vertical;
  outline: none;
  font: inherit;
  font-size: 14px;
  line-height: 1.8;
}
.prompt-result textarea:focus {
  border-color: #a1a1aa;
  box-shadow: 0 0 0 2px #18181b09;
}
.result-status,
.version-count {
  margin: 0;
  color: #71717a;
  font-size: 12px;
}
.modal-overlay {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0006;
  padding: 20px;
}
.optimize-dialog {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 560px;
  max-width: 100%;
  max-height: 90vh;
  overflow: auto;
  border-radius: 9px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 12px 40px #0002;
}
.optimize-dialog header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.optimize-dialog h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.prompt-result .close-button {
  width: 28px;
  height: 28px;
  border: 0;
  padding: 0;
  color: #71717a;
}
.dialog-note {
  margin: 0;
  color: #71717a;
  font-size: 12px;
}
.optimize-dialog .generate-button {
  align-self: flex-start;
}
.optimize-dialog footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
