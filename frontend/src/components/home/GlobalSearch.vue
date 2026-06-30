<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowUp,
  Brain,
  BriefcaseBusiness,
  Clock,
  FileText,
  Paperclip,
  Search,
  Sparkles,
  Trash2,
  Workflow,
  Zap,
} from 'lucide-vue-next'

type RunMode = 'fast' | 'smart' | 'task'

const router = useRouter()
const query = ref('')
const activeMode = ref<RunMode>('fast')
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])
const panelOpen = ref(false)

const runModes: { key: RunMode; label: string; desc: string; icon: unknown }[] = [
  { key: 'fast', label: '快速', desc: '不挂知识库，直接回答', icon: Zap },
  { key: 'smart', label: '智能', desc: 'AI判断是否挂知识库和工具', icon: Brain },
  { key: 'task', label: '任务', desc: '挂知识库和工具，进入执行链路', icon: Workflow },
]

const planCases = [
  {
    title: 'B2B线下团购方案',
    desc: '预算10万，偏运动鞋类目，5分钟内先给客户一版可沟通初稿。',
    prompt: '帮我给B2B线下客户出一版团购方案。已知：总预算10万，偏运动鞋类目，客户在门店等待，需要5分钟内先给一版可沟通初稿。请先列出必须追问字段，再按保守档、均衡档、品质档输出组货方案。',
  },
  {
    title: '门店需求采集表',
    desc: '整理客户类型、预算、数量、场景、品牌偏好和交付约束。',
    prompt: '请把门店客户的团购需求整理成标准字段表。字段包括客户类型、数量、预算范围、活动场景、品类需求、品牌偏好、颜色与男女比例、交付时间、风险备注。',
  },
  {
    title: '成功案例复用',
    desc: '从案例池匹配相似方案，说明引用依据和可复用话术。',
    prompt: '请基于方案中心成功案例池，帮我匹配适合运动鞋团购的相似案例，并说明适用条件、引用依据和可复用话术。',
  },
]

const currentMode = computed(() => runModes.find((item) => item.key === activeMode.value) ?? runModes[0])
const fileHint = computed(() => {
  if (!selectedFiles.value.length) return '支持 PDF、Word、Excel、PPT、图片'
  return `已添加 ${selectedFiles.value.length} 个附件`
})

function chooseMode(mode: RunMode) {
  activeMode.value = mode
}

function triggerFilePicker() {
  fileInput.value?.click()
}

function handleFiles(event: Event) {
  selectedFiles.value = Array.from((event.target as HTMLInputElement).files || [])
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1)
  if (!selectedFiles.value.length && fileInput.value) fileInput.value.value = ''
}

function fillPrompt(prompt: string) {
  query.value = prompt
  panelOpen.value = true
}

function submit() {
  const value = query.value.trim() || planCases[0].prompt
  router.push({
    name: 'workspace-chat',
    query: {
      q: value,
      mode: activeMode.value,
      capability: 'plan-center',
      files: selectedFiles.value.length ? String(selectedFiles.value.length) : undefined,
      source: 'home',
    },
  })
}
</script>

<template>
  <section class="relative z-30 mx-auto w-full max-w-6xl text-center text-zinc-900">
    <div class="relative z-10 mb-4 flex items-center justify-center gap-3">
      <span class="flex h-11 w-11 items-center justify-center rounded-2xl border bg-white shadow-sm">
        <Sparkles class="h-6 w-6 text-primary" />
      </span>
      <h1 class="text-balance text-xl font-semibold tracking-tight md:text-3xl">
        今天想让 AI 帮你做什么？
      </h1>
    </div>

    <div class="relative z-10 mx-auto overflow-visible rounded-[2rem] border border-white/80 bg-white/90 text-zinc-900 shadow-2xl shadow-zinc-300/50 backdrop-blur-2xl transition-all duration-300 md:max-w-5xl">
      <div class="flex min-h-20 items-center gap-2 px-4 md:px-6">
        <input
          ref="fileInput"
          class="hidden"
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.md,.txt"
          @change="handleFiles"
        />
        <button
          type="button"
          class="touch-target flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100"
          :title="fileHint"
          @click="triggerFilePicker"
        >
          <Paperclip class="h-5 w-5" />
        </button>
        <input
          v-model="query"
          class="min-w-0 flex-1 bg-transparent text-left text-base outline-none placeholder:text-zinc-400 md:text-lg"
          placeholder="描述方案需求，或上传客户资料后直接提问"
          @focus="panelOpen = true"
          @keydown.enter.prevent="submit"
        />
        <button
          type="button"
          class="touch-target flex items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-800"
          aria-label="发送"
          @click="submit"
        >
          <ArrowUp class="h-5 w-5" />
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-2 border-t border-zinc-100 px-4 py-3 md:px-6">
        <button
          type="button"
          class="inline-flex h-9 items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 text-sm font-medium text-primary"
          @click="panelOpen = !panelOpen"
        >
          <BriefcaseBusiness class="h-4 w-4" />
          方案中心
        </button>

        <div class="flex items-center rounded-full border border-zinc-200 bg-zinc-50 p-1">
          <button
            v-for="item in runModes"
            :key="item.key"
            type="button"
            class="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition"
            :class="activeMode === item.key ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'"
            :title="item.desc"
            @click="chooseMode(item.key)"
          >
            <component :is="item.icon" class="h-3.5 w-3.5" />
            {{ item.label }}
          </button>
        </div>

        <span class="ml-auto hidden items-center gap-1.5 text-xs text-zinc-400 sm:inline-flex">
          <Clock class="h-3.5 w-3.5" />
          {{ currentMode.desc }}
        </span>
      </div>

      <div v-if="selectedFiles.length" class="flex flex-wrap gap-2 border-t border-zinc-100 px-4 py-3 md:px-6">
        <span
          v-for="(file, index) in selectedFiles"
          :key="`${file.name}-${index}`"
          class="inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600"
        >
          <FileText class="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          <span class="truncate">{{ file.name }}</span>
          <button type="button" class="rounded-full p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700" @click="removeFile(index)">
            <Trash2 class="h-3 w-3" />
          </button>
        </span>
      </div>
    </div>

    <div v-if="panelOpen" class="relative z-10 mx-auto mt-3 grid gap-3 rounded-[1.5rem] border border-white/80 bg-white/85 p-3 text-left shadow-xl shadow-zinc-200/60 backdrop-blur-xl md:max-w-5xl md:grid-cols-3">
      <button
        v-for="item in planCases"
        :key="item.title"
        type="button"
        class="rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-primary/30 hover:bg-primary/5"
        @click="fillPrompt(item.prompt)"
      >
        <div class="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <Search class="h-4 w-4 text-primary" />
          {{ item.title }}
        </div>
        <p class="mt-2 text-xs leading-5 text-zinc-500">{{ item.desc }}</p>
      </button>
    </div>
  </section>
</template>
