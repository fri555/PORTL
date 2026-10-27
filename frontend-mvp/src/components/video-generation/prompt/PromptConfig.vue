<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { FileText, Mic, Plus, Trash2, X } from 'lucide-vue-next'
import { listVideoTasks } from '@/composables/useVideoPrototype'
import type { VideoTask } from '@/types/video-generation'

interface ReferenceImage {
  name: string
  uri: string
}
const props = defineProps<{ initialData?: Record<string, any> }>()
const emit = defineEmits<{ submit: [payload: Record<string, any>] }>()
const requirements = ref(
  String(props.initialData?.parameters?.requirements ?? props.initialData?.requirements ?? ''),
)
const references = ref<ReferenceImage[]>(
  (Array.isArray(props.initialData?.references) ? props.initialData.references : [])
    .filter((item: any) => typeof item?.name === 'string' && typeof item?.uri === 'string')
    .slice(0, 9)
    .map((item: any) => ({ name: item.name, uri: item.uri })),
)
const convertedFrom = ref(props.initialData?.convertedFrom ?? null)
const error = ref('')
const reading = ref(false)
const requirementInput = ref<HTMLTextAreaElement | null>(null)
const mentionOpen = ref(false)
const mentionQuery = ref('')
const composing = ref(false)
const importedPrompt = ref(String(props.initialData?.importedPrompt ?? ''))
const importedName = ref(String(props.initialData?.importedName ?? ''))
const importedReferences = ref<ReferenceImage[]>(props.initialData?.importedReferences ?? [])
const importOpen = ref(false)
const reverseTasks = ref<VideoTask[]>([])
const canSubmit = computed(
  () => Boolean(requirements.value.trim() || importedPrompt.value.trim()) && !reading.value,
)
const mentionGroups = computed(() => {
  const matches = references.value.filter((item) => item.name.includes(mentionQuery.value))
  return [
    { label: '场景', prefix: 'sc_' },
    { label: '人物', prefix: 'char_' },
    { label: '物品', prefix: 'prop_' },
    { label: '图片', prefix: '' },
  ]
    .map((group) => ({
      label: group.label,
      items: matches.filter((item) =>
        group.prefix ? item.name.startsWith(group.prefix) : !/^(sc_|char_|prop_)/.test(item.name),
      ),
    }))
    .filter((group) => group.items.length)
})

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('读取失败'))
    reader.readAsDataURL(file)
  })
}
async function addReferences(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  error.value = ''
  reading.value = true
  const errors: string[] = []
  try {
    for (const file of files) {
      if (references.value.length >= 9) {
        errors.push('参考图最多 9 张')
        break
      }
      if (!/\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name)) {
        errors.push(`${file.name}：仅支持 jpg/jpeg/png/webp/gif/bmp 图片`)
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}：图片大小不能超过 10MB`)
        continue
      }
      try {
        const uri = await readImage(file)
        const baseName = file.name.replace(/\.[^.]+$/, '')
        let name = baseName
        let suffix = 2
        while (references.value.some((item) => item.name === name)) name = `${baseName}_${suffix++}`
        references.value.push({ name, uri })
      } catch {
        errors.push(`${file.name}：读取失败，请重新选择`)
      }
    }
  } finally {
    reading.value = false
    input.value = ''
    error.value = errors.join('；')
  }
}
function updateMention() {
  if (composing.value) return
  const input = requirementInput.value
  const before = requirements.value.slice(0, input?.selectionStart ?? requirements.value.length)
  const token = before.match(/@([^@\s]*)$/)
  mentionOpen.value = Boolean(token)
  mentionQuery.value = token?.[1] ?? ''
}
function finishComposition() {
  composing.value = false
  updateMention()
}
function selectMention(name: string) {
  const input = requirementInput.value
  const caret = input?.selectionStart ?? requirements.value.length
  const start = requirements.value.slice(0, caret).lastIndexOf('@')
  if (start < 0) return
  requirements.value =
    requirements.value.slice(0, start) + '@' + name + ' ' + requirements.value.slice(caret)
  mentionOpen.value = false
  nextTick(() => {
    input?.focus()
    input?.setSelectionRange(start + name.length + 2, start + name.length + 2)
  })
}
function openImport() {
  reverseTasks.value = listVideoTasks().filter(
    (task) => task.operator === 'prompt-reverse' && task.status === 'completed',
  )
  importOpen.value = true
}
function reverseResults(
  task: VideoTask,
): { segmentId: string; prompt: string; references: ReferenceImage[] }[] {
  const results = Array.isArray(task.input.results)
    ? task.input.results
    : typeof task.input.prompt === 'string'
      ? [{ prompt: task.input.prompt, segmentId: task.id }]
      : []
  return results
    .filter((item: any) => typeof item?.prompt === 'string' && item.prompt.trim())
    .map((item: any) => ({
      segmentId: String(item.segmentId ?? ''),
      prompt: item.prompt,
      references: (Array.isArray(item.references) ? item.references : []).filter(
        (image: any) => typeof image?.name === 'string' && typeof image?.uri === 'string',
      ),
    }))
}
function importTask(task: VideoTask) {
  const results = reverseResults(task)
  if (!results.length) {
    error.value = '所选任务暂未保存逆向提示词，请先打开该任务结果'
    return
  }
  importedPrompt.value = results.map((item) => item.prompt).join('\n\n')
  importedName.value = task.name
  const byName = new Map<string, ReferenceImage>()
  results
    .flatMap((item) => item.references)
    .forEach((image) => byName.set(image.name, { name: image.name, uri: image.uri }))
  importedReferences.value = [...byName.values()]
  convertedFrom.value =
    results.length === 1 ? { reverseTaskId: task.id, segmentId: results[0]!.segmentId } : null
  error.value = ''
  importOpen.value = false
}
function submit() {
  if (!canSubmit.value) return
  if (references.value.some((item) => !item.name.trim())) {
    error.value = '请填写参考图名称'
    return
  }
  if (new Set(references.value.map((item) => item.name.trim())).size !== references.value.length) {
    error.value = '参考图名称不能重复'
    return
  }
  error.value = ''
  emit('submit', {
    templateId: 'video-prompt-from-requirements',
    parameters: {
      locale: 'zh-CN',
      requirements: requirements.value.trim() || importedPrompt.value.trim(),
    },
    references: references.value.map((item, index) => ({
      referenceId: `ref-${index + 1}`,
      position: index + 1,
      type: 'image',
      name: item.name.trim(),
      uri: item.uri,
    })),
    convertedFrom: convertedFrom.value,
    ...(importedPrompt.value
      ? {
          importedPrompt: importedPrompt.value,
          importedName: importedName.value,
          importedReferences: importedReferences.value,
        }
      : {}),
  })
}
</script>

<template>
  <form class="prompt-config" @submit.prevent="submit">
    <section class="config-section">
      <h2>选择模板</h2>
      <div class="template-grid">
        <button
          class="template-card template-card--active"
          type="button"
          aria-pressed="true"
          data-testid="template-card"
        >
          <FileText :size="20" /><strong>通用需求模板</strong
          ><small>输入创作需求描述，生成通用视频 Prompt</small>
        </button>
        <button class="template-card" type="button" disabled data-testid="template-card-spoken">
          <Mic :size="20" /><strong>口播分镜模板</strong
          ><small>输入口播分镜信息，生成口播视频 Prompt（本期不做）</small>
        </button>
      </div>
    </section>
    <section class="config-section requirement-section">
      <div class="label-row">
        <h2><label for="prompt-requirement">创作需求</label></h2>
        <button
          type="button"
          class="text-button"
          data-testid="import-reverse-btn"
          @click="openImport"
        >
          从视频逆向提示词导入
        </button>
      </div>
      <textarea
        id="prompt-requirement"
        ref="requirementInput"
        v-model="requirements"
        rows="5"
        maxlength="32000"
        data-testid="requirement-input"
        placeholder="示例：复刻一段 FILA FUSION 羽绒服展示视频，突出羽绒服的保暖与时尚感……"
        @input="updateMention"
        @keyup="updateMention"
        @click="updateMention"
        @keydown.esc="mentionOpen = false"
        @compositionstart="composing = true"
        @compositionend="finishComposition"
      />
      <div v-if="mentionOpen" class="mention-menu" data-testid="mention-popover">
        <div v-for="group in mentionGroups" :key="group.label">
          <small>{{ group.label }}</small
          ><button
            v-for="item in group.items"
            :key="item.name"
            type="button"
            data-testid="mention-item"
            @mousedown.prevent
            @click="selectMention(item.name)"
          >
            <img :src="item.uri" alt="" />{{ item.name }}
          </button>
        </div>
        <p v-if="!mentionGroups.length">无匹配素材</p>
      </div>
      <div v-if="importedPrompt" class="imported-prompt" data-testid="imported-prompt">
        <small>已导入：{{ importedName }}</small>
        <div v-if="importedReferences.length" class="imported-tags">
          <span v-for="image in importedReferences" :key="image.name"
            ><img :src="image.uri" alt="" />{{ image.name }}</span
          >
        </div>
        <p>{{ importedPrompt }}</p>
      </div>
    </section>
    <section class="config-section">
      <h2>参考图片</h2>
      <div
        v-for="(image, index) in references"
        :key="index"
        class="reference-row"
        data-testid="reference-row"
      >
        <img :src="image.uri" alt="参考图片" /><input
          v-model="image.name"
          :aria-label="`参考图名称 ${index + 1}`"
          maxlength="80"
        /><button
          type="button"
          class="icon-button"
          :aria-label="`移除参考图 ${index + 1}`"
          @click="references.splice(index, 1)"
        >
          <Trash2 :size="15" />
        </button>
      </div>
      <label class="add-reference" :class="{ disabled: references.length >= 9 || reading }"
        ><Plus :size="16" />{{ reading ? '正在读取…' : '添加参考图'
        }}<input
          type="file"
          aria-label="添加参考图"
          accept=".jpg,.jpeg,.png,.webp,.gif,.bmp"
          multiple
          :disabled="reading"
          @change="addReferences"
      /></label>
      <p class="field-hint">最多 9 张，每张不超过 10MB；输入 @ 可引用参考图。</p>
    </section>
    <p v-if="error" role="alert" class="form-error">{{ error }}</p>
    <button
      class="submit-button"
      type="submit"
      :disabled="!canSubmit"
      data-testid="promptgen-submit"
    >
      生成 Prompt
    </button>
    <div
      v-if="importOpen"
      class="modal-overlay"
      @click.self="importOpen = false"
      @keydown.esc="importOpen = false"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="从视频逆向提示词导入"
        class="import-dialog"
      >
        <header>
          <h2>从视频逆向提示词导入</h2>
          <button
            type="button"
            class="icon-button"
            aria-label="关闭导入"
            @click="importOpen = false"
          >
            <X :size="18" />
          </button>
        </header>
        <div class="reverse-list">
          <button
            v-for="task in reverseTasks"
            :key="task.id"
            type="button"
            class="reverse-item"
            data-testid="import-reverse-item"
            @click="importTask(task)"
          >
            <strong>{{ task.name }}</strong
            ><small>{{ reverseResults(task).length }} 个片段 Prompt</small>
          </button>
        </div>
        <p v-if="!reverseTasks.length" class="empty-text">暂无已完成的逆向任务</p>
        <p v-if="error" role="alert" class="form-error">{{ error }}</p>
        <footer>
          <button type="button" class="secondary-button" @click="importOpen = false">取消</button>
        </footer>
      </section>
    </div>
  </form>
</template>

<style scoped>
.prompt-config {
  display: flex;
  max-width: 720px;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 24px;
  color: #18181b;
  font-size: 14px;
}
.config-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.config-section h2,
.import-dialog h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.template-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.template-card {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
  border: 1px solid #e4e4e7;
  border-radius: 6px;
  padding: 12px;
  background: #fff;
  text-align: left;
  font: inherit;
  cursor: pointer;
}
.template-card--active {
  border-color: #18181b;
}
.template-card svg {
  color: #71717a;
}
.template-card small {
  font-size: 12px;
  color: #71717a;
  line-height: 1.6;
}
.template-card:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.text-button {
  border: 0;
  background: transparent;
  padding: 4px 0;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.prompt-config textarea,
.reference-row input {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid #e4e4e7;
  border-radius: 6px;
  background: #fff;
  padding: 10px 12px;
  outline: none;
  font: inherit;
  line-height: 1.6;
}
.prompt-config textarea {
  min-height: 124px;
  resize: vertical;
}
.prompt-config textarea:focus,
.reference-row input:focus {
  border-color: #a1a1aa;
  box-shadow: 0 0 0 2px #18181b09;
}
.prompt-config textarea::placeholder {
  color: #a1a1aa;
}
.reference-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.reference-row > img {
  width: 48px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
}
.reference-row input {
  min-width: 0;
  flex: 1;
  padding: 7px 10px;
}
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: none;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: #71717a;
  cursor: pointer;
}
.icon-button:hover {
  background: #f4f4f5;
}
.add-reference {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  cursor: pointer;
}
.add-reference.disabled {
  color: #a1a1aa;
}
.add-reference input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
.field-hint {
  margin: 0;
  color: #a1a1aa;
  font-size: 12px;
}
.submit-button {
  height: 36px;
  border: 0;
  border-radius: 6px;
  background: #18181b;
  color: #fff;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.submit-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.form-error {
  margin: 0;
  color: #c24138;
  font-size: 12px;
}
.requirement-section {
  position: relative;
}
.mention-menu {
  position: absolute;
  left: 0;
  top: 100%;
  z-index: 10;
  min-width: 200px;
  max-height: 280px;
  overflow: auto;
  border: 1px solid #e4e4e7;
  border-radius: 6px;
  background: #fff;
  padding: 8px;
  box-shadow: 0 4px 12px #00000014;
}
.mention-menu small {
  display: block;
  padding: 4px 8px;
  color: #a1a1aa;
}
.mention-menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: 0;
  border-radius: 4px;
  padding: 6px 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.mention-menu button:hover {
  background: #f4f4f5;
}
.mention-menu img {
  width: 24px;
  height: 24px;
  object-fit: cover;
  border-radius: 4px;
}
.mention-menu p {
  padding: 4px 12px;
  font-size: 12px;
  color: #a1a1aa;
}
.imported-prompt {
  border: 1px solid #e4e4e7;
  border-radius: 6px;
  padding: 12px;
  background: #fafafa;
  font-size: 12px;
}
.imported-prompt small {
  color: #71717a;
}
.imported-prompt p {
  white-space: pre-wrap;
  line-height: 1.6;
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
.import-dialog {
  box-sizing: border-box;
  width: 480px;
  max-width: 100%;
  border-radius: 9px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 12px 40px #0002;
}
.import-dialog header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.import-dialog footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
.secondary-button {
  height: 34px;
  border: 1px solid #e4e4e7;
  border-radius: 6px;
  padding: 0 14px;
  background: #fff;
  cursor: pointer;
}
.empty-text {
  padding: 24px 0;
  text-align: center;
  color: #a1a1aa;
  font-size: 12px;
}
@media (max-width: 600px) {
  .template-grid {
    grid-template-columns: 1fr;
  }
  .label-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }
}
.imported-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.imported-tags span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #e4e4e7;
  border-radius: 4px;
  background: #fff;
  padding: 3px 6px;
}
.imported-tags img {
  width: 20px;
  height: 20px;
  object-fit: cover;
  border-radius: 3px;
}
.reverse-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow: auto;
  margin-top: 20px;
}
.reverse-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid #e4e4e7;
  border-radius: 6px;
  background: #fff;
  padding: 12px;
  text-align: left;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.reverse-item:hover {
  border-color: #71717a;
}
.reverse-item small {
  font-size: 12px;
  color: #a1a1aa;
}
</style>
