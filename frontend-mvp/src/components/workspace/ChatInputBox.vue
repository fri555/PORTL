<script setup lang="ts">
import { computed, ref } from 'vue'
import { useChatController, type RunMode } from '@/composables/useWorkspaceChat'
import {
  AlertCircle, Check, ChevronDown, FileText, Globe,
  Plus, SendHorizontal, Square, User, X, Zap,
} from 'lucide-vue-next'

const chat = useChatController()

const modeMenuOpen = ref(false)

// 三个模式共用同一套工具栏骨架，仅按钮文案/图标随当前模式变化
const modeOptions: { value: RunMode; label: string; desc: string; icon: any }[] = [
  { value: 'quick', label: '日常办公', desc: '问答、检索与轻量办公', icon: Zap },
  { value: 'task', label: '专家模式', desc: '选择专家完成复杂任务', icon: User },
]

// 当前选中专家花名（蓝色 tag 主显示）
const selectedExpertName = computed(() =>
  chat.selectedExperts.value.length > 0 ? chat.selectedExperts.value[0].nickname : '',
)
// 当前选中专家名称（蓝色 tag 副显示）
const selectedExpertRole = computed(() =>
  chat.selectedExperts.value.length > 0 ? chat.selectedExperts.value[0].name : '',
)

// 推荐提问列表（选中专家后展示的 pill 标签）
const recommendedPrompts = computed(() => {
  const list: string[] = []
  chat.selectedExperts.value.forEach((e) => {
    ;(e.promptCases || []).forEach((p) => list.push(p))
  })
  return list
})

// 各模式专属 placeholder（对齐三张设计图）
const placeholder = computed(() => {
  if (chat.runMode.value === 'task') {
    return chat.selectedExperts.value.length
      ? `倾听着手在线，让AI模型问您上传文件吧...`
      : '请在下方选择合适的专家。小马会匹配任务托付给他/她高效完成...'
  }
  return '小马在线，随时向我提问或上传文件...'
})

// 专家模式下未选专家时禁止发送
const canSend = computed(() => {
  if (chat.runMode.value === 'task' && chat.selectedExperts.value.length === 0) return false
  return !!chat.chatInput.value.trim() && !chat.isOverLimit.value
})

const modeButtonActive = computed(() => chat.runMode.value !== 'quick')
const currentMode = computed(() => modeOptions.find((m) => m.value === chat.runMode.value) || modeOptions[0])

function selectMode(m: RunMode) {
  chat.runMode.value = m
  modeMenuOpen.value = false
}
function onModeBlur(e: FocusEvent) {
  const related = e.relatedTarget as HTMLElement | null
  if (!related?.closest('[data-mode-menu]')) modeMenuOpen.value = false
}

// 点击推荐提问 → 填充输入框并聚焦
function fillPrompt(prompt: string) {
  chat.chatInput.value = prompt
  // 延迟一帧聚焦 textarea
  setTimeout(() => {
    const el = document.querySelector('textarea') as HTMLTextAreaElement | null
    el?.focus()
  }, 0)
}

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
  <div class="w-full">
    <!-- ===== 设计图2：选中专家后的蓝色 tag（输入框外部、上方） ===== -->
    <div
      v-if="chat.runMode.value === 'task' && chat.selectedExperts.value.length > 0"
      class="mb-2 flex items-center gap-1.5"
    >
      <span class="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
        {{ selectedExpertRole }}
        <button
          type="button"
          class="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-blue-400 transition hover:bg-blue-100 hover:text-blue-600"
          aria-label="取消选中专家"
          @click="chat.removeExpert(chat.selectedExperts.value[0].id)"
        >
          <X class="h-3 w-3" />
        </button>
      </span>
    </div>

    <!-- 输入框容器 -->
    <div
      class="rounded-2xl border bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition"
      :class="chat.isOverLimit.value ? 'border-red-400 ring-2 ring-red-100' : 'border-zinc-200 focus-within:border-zinc-400'"
    >
      <!-- Attachments bar -->
      <div v-if="chat.attachedFiles.value.length" class="no-scrollbar flex items-center gap-2 overflow-x-auto px-3 pt-3">
        <div
          v-for="(att, i) in chat.attachedFiles.value"
          :key="i"
          class="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 py-1 pl-2 pr-1 text-xs transition hover:border-zinc-300"
          @click="att.ext === 'txt' ? chat.openTextPreview({ name: att.name, size: att.size }) : null"
        >
          <FileText class="h-3.5 w-3.5 shrink-0" :class="fileIconColor(att.ext)" />
          <span class="max-w-[160px] truncate font-medium text-zinc-700">{{ att.name }}</span>
          <span v-if="att.size" class="shrink-0 text-[10px] text-zinc-400">{{ formatSize(att.size) }}</span>
          <button type="button" class="flex h-4 w-4 items-center justify-center rounded text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700" @click.stop="chat.removeAttachedFile(i)">
            <X class="h-3 w-3" />
          </button>
        </div>
      </div>

      <!-- Textarea -->
      <textarea
        v-model="chat.chatInput.value"
        rows="1"
        class="max-h-[240px] min-h-[52px] w-full resize-none bg-transparent px-4 pt-3 text-[15px] leading-6 outline-none placeholder:text-zinc-400"
        :placeholder="placeholder"
        @input="chat.handleInput"
        @keydown="chat.onKeydown"
        @paste="chat.handlePaste"
      />

      <!-- Over-limit hint -->
      <div v-if="chat.isOverLimit.value" class="flex items-center gap-1.5 px-4 pb-1 text-xs text-red-500">
        <AlertCircle class="h-3.5 w-3.5" /> 已达到字数上限，无法继续输入
      </div>

      <!-- Toolbar: 统一的工具栏骨架，三模式一致（设计图1） -->
      <div class="flex items-center gap-2 border-t border-zinc-100 px-3 py-2">
        <!-- 附件 + -->
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50" aria-label="添加附件" @click="chat.openUploadModal()">
          <Plus class="h-4 w-4" />
        </button>

        <!-- 模式切换按钮 -->
        <div class="relative" data-mode-menu @focusout="onModeBlur">
          <button type="button" class="flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition"
            :class="modeButtonActive
              ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'"
            @click="modeMenuOpen = !modeMenuOpen"
          >
            <component :is="currentMode.icon" class="h-3.5 w-3.5" />
            {{ currentMode.label }}
            <ChevronDown class="h-3 w-3" />
          </button>
          <div v-if="modeMenuOpen" class="absolute bottom-full left-0 z-30 mb-1 w-56 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl">
            <button
              v-for="m in modeOptions"
              :key="m.value"
              type="button"
              class="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition"
              :class="chat.runMode.value === m.value ? 'bg-zinc-100' : 'hover:bg-zinc-50'"
              @click="selectMode(m.value)"
            >
              <component :is="m.icon" class="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-1.5 text-xs font-medium text-zinc-900">
                  {{ m.label }}
                  <Check v-if="chat.runMode.value === m.value" class="h-3.5 w-3.5 text-zinc-900" />
                </span>
                <span class="block text-[11px] leading-4 text-zinc-400">{{ m.desc }}</span>
              </span>
            </button>
          </div>
        </div>

        <!-- 联网 -->
        <button type="button" class="flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition"
          :class="chat.networkOn.value ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'"
          @click="chat.networkOn.value = !chat.networkOn.value"
        >
          <Globe class="h-3.5 w-3.5" /> 联网
        </button>

        <!-- 字数统计 -->
        <span v-if="chat.charCount.value > 0" class="text-[10px] tabular-nums" :class="chat.isNearLimit.value ? 'text-amber-500' : 'text-zinc-400'">
          {{ chat.charCount.value }}/{{ chat.maxChars }}
        </span>

        <div class="ml-auto flex items-center gap-2">
          <span v-if="chat.attachedFiles.value.length" class="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-600">{{ chat.attachedFiles.value.length }} 个附件</span>
          <button v-if="chat.abortController.value" type="button" class="rounded-lg bg-red-500 p-2 text-white hover:bg-red-600" @click="chat.handleStop()">
            <Square class="h-4 w-4" />
          </button>
          <template v-else>
            <button
              type="button"
              class="rounded-full p-2 transition"
              :class="canSend ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-300'"
              :disabled="!canSend"
              @click="chat.handleSend()"
            >
              <SendHorizontal class="h-4 w-4" />
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- ===== 设计图2：选中专家后的推荐提问 pill 标签（输入框外部、下方） ===== -->
    <div
      v-if="chat.runMode.value === 'task' && recommendedPrompts.length > 0"
      class="mt-3 flex flex-wrap gap-2"
    >
      <button
        v-for="(prompt, i) in recommendedPrompts"
        :key="i"
        type="button"
        class="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
        @click="fillPrompt(prompt)"
      >
        {{ prompt }}
      </button>
    </div>
  </div>
</template>
