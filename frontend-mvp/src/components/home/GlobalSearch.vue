<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowUp,
  Bot,
  ChevronDown,
  FileText,
  Paperclip,
  Trash2,
  Workflow,
  Zap,
} from 'lucide-vue-next'

type RunMode = 'quick' | 'task'
type AgentOption = { value: string; label: string; desc: string; disabled?: boolean }
type CaseItem = { title: string; desc: string; prompt: string; hint?: string; kb?: string }

const router = useRouter()
const query = ref('')
const activeMode = ref<RunMode>('quick')
const selectedAgent = ref('research')
const fileInput = ref<HTMLInputElement | null>(null)
const searchInput = ref<HTMLTextAreaElement | null>(null)
const selectedFiles = ref<File[]>([])
const showAttachmentTip = ref(false)
const isFocused = ref(false)
const webSearchEnabled = ref(true)
const showExpertDropdown = ref(false)
const selectedCase = ref<CaseItem | null>(null)

const runModes: { key: RunMode; label: string; desc: string; icon: unknown }[] = [
  { key: 'quick', label: '日常办公', desc: 'RAG架构，适合问答、检索和轻量办公', icon: Zap },
  { key: 'task', label: '专家模式', desc: 'P&E架构，可调用工具和MCP完成复杂任务', icon: Workflow },
]

const officeAgents: AgentOption[] = [
  { value: 'research', label: '调研帮手', desc: '搜索资料·整理重点' },
  { value: 'dingtalk', label: '钉钉助理', desc: '日程待办·AI表格' },
  { value: 'knowledge', label: '知识顾问', desc: '制度流程·引用溯源' },
]

const expertAgents: AgentOption[] = [
  { value: 'plan-center', label: '组货专家', desc: '方案匹配·组货建议' },
  { value: 'soon', label: '敬请期待', desc: '更多专家即将上线', disabled: true },
]

const agentOptions = computed(() => (activeMode.value === 'quick' ? officeAgents : expertAgents))
const agentLabel = computed(() => activeMode.value === 'quick' ? '助理' : '专家')

const planCases: CaseItem[] = [
  {
    title: 'B2B线下团购方案',
    desc: '预算10万，偏运动鞋类目，先给客户一版可沟通初稿。',
    prompt: '帮我给B2B线下客户出一版团购方案。已知：总预算10万，偏运动鞋类目，客户在门店等待，需要先给一版可沟通初稿。请先列出必须追问字段，再按保守档、均衡档、品质档输出组货方案。',
    kb: '方案中心案例库',
  },
  {
    title: '门店需求采集表',
    desc: '整理客户类型、预算、数量、场景、品牌偏好和交付约束。',
    prompt: '请把门店客户的团购需求整理成标准字段表。字段包括客户类型、数量、预算范围、活动场景、品类需求、品牌偏好、颜色与男女比例、交付时间、风险备注。',
    kb: '方案中心字段模板',
  },
  {
    title: '成功案例复用',
    desc: '从案例池匹配相似方案，说明引用依据和可复用话术。',
    prompt: '请基于方案中心成功案例池，帮我匹配适合运动鞋团购的相似案例，并说明适用条件、引用依据和可复用话术。',
    kb: '成功案例池',
  },
]

const uploadHint = '支持 PDF、DOC/DOCX、Markdown、TXT，单个文件 20MB 内'
const attachmentTooltip = computed(() =>
  selectedFiles.value.length
    ? `已添加 ${selectedFiles.value.length} 个附件`
    : '上传业务资料',
)

function chooseMode(mode: RunMode) {
  activeMode.value = mode
  selectedAgent.value = mode === 'quick' ? 'research' : 'plan-center'
  showExpertDropdown.value = false
}

function resizeSearchInput(event?: Event) {
  const el = (event?.target as HTMLTextAreaElement | undefined) ?? searchInput.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 168)}px`
}

async function fillPrompt(item: CaseItem, mode: RunMode = 'task') {
  query.value = item.prompt
  selectedCase.value = item
  activeMode.value = mode
  selectedAgent.value = mode === 'quick' ? selectedAgent.value : 'plan-center'
  await nextTick()
  resizeSearchInput()
}

function triggerFilePicker() {
  fileInput.value?.click()
}

function handleFiles(event: Event) {
  const files = Array.from((event.target as HTMLInputElement).files || [])
  selectedFiles.value = files.filter((file) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    return ['pdf', 'doc', 'docx', 'md', 'txt'].includes(ext || '')
  })
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1)
  if (!selectedFiles.value.length && fileInput.value) fileInput.value.value = ''
}

// Ctrl+V paste image/file support
function handlePaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items
  if (!items) return
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.kind === 'file') continue
    // text/plain is handled by default textarea behavior (no preventDefault needed)
  }
}

// DingTalk default examples (shown when no agent selected)
// Quick mode default recommendation cards
const quickCases = [
  {
    title: '📝 调研报告',
    desc: '输入调研主题，生成结构化报告',
    hint: '调研 [填入行业/主题] 的市场现状和竞争格局',
    prompt: '调研 [填入行业/主题] 的市场现状和竞争格局，包含市场规模、主要参与者、发展趋势',
  },
  {
    title: '💡 头脑风暴',
    desc: '围绕一个问题发散思路',
    hint: '关于 [填入问题] 有哪些创新解决方案？',
    prompt: '关于 [填入问题] 有哪些创新解决方案？请从技术、流程、组织三个维度分析',
  },
  {
    title: '📊 数据分析',
    desc: '上传文档，获取分析洞察',
    hint: '上传 [文档文件] 分析资料趋势和异常',
    prompt: '请分析上传的数据文件，提取关键趋势、异常点和优化建议',
  },
]

const dingtalkCases = [
  {
    title: '📅 定日程·定会议室',
    desc: '安排会议，自动创建日程并预定会议室。',
    prompt: '帮我在明天下午3点安排一场方案评审会，时长1小时，参会人：张明、李娟，帮我在本部大楼预定小会议室。',
  },
  {
    title: '📄 创建文档·AI表格',
    desc: '将对话结果整理为钉钉文档或结构化AI表格。',
    prompt: '将本次方案对话整理为钉钉文档，并把SPU/SKU清单转为AI表格结构。',
  },
  {
    title: '✅ 创建待办·跟踪执行',
    desc: '将方案执行步骤生成钉钉待办清单并指派负责人。',
    prompt: '将方案中的执行步骤生成钉钉待办清单，每项设置截止日期和负责人。',
  },
]

function submit() {
  const value = query.value.trim()
  router.push({
    name: 'workspace-chat',
    query: {
      ...(value ? { q: value } : {}),
      mode: activeMode.value,
      agent: selectedAgent.value ?? undefined,
      agentLabel: agentOptions.value.find((item) => item.value === selectedAgent.value)?.label,
      kb: selectedCase.value?.kb,
      caseTitle: selectedCase.value?.title,
      capability: 'plan-center',
      files: selectedFiles.value.length ? String(selectedFiles.value.length) : undefined,
      source: 'home',
    },
  })
}
</script>

<template>
  <section class="relative z-30 mx-auto w-full max-w-6xl text-center text-zinc-900">
    <div class="relative z-10 mx-auto max-w-3xl">
      <div class="mb-5 flex items-center justify-center gap-3 text-zinc-900">
        <h1 class="text-balance text-2xl font-semibold tracking-tight md:text-4xl">
          今天想让 AI 帮你做什么？
        </h1>
      </div>
      <p class="mx-auto mb-4 max-w-2xl text-center text-xs leading-5 text-zinc-500 md:text-sm">
        日常办公适合检索和轻量问答，专家模式可调用工具和 MCP 完成复杂任务。点击搜索框可查看推荐案例。
      </p>

      <div class="overflow-visible rounded-3xl border border-zinc-200 bg-white text-zinc-900 shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition-all duration-300">
        <div class="flex min-h-20 items-end gap-2 px-4 py-3 md:px-6">
          <input
            ref="fileInput"
            class="hidden"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.md,.txt"
            @change="handleFiles"
          />
          <textarea
            ref="searchInput"
            v-model="query"
            rows="1"
            class="max-h-[168px] min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 text-left text-base leading-6 outline-none transition-[height] duration-200 ease-out placeholder:text-zinc-400 md:text-lg md:leading-7"
            placeholder="描述方案需求，或上传客户资料后直接提问"
            @input="resizeSearchInput"
            @keydown.enter.exact.prevent="submit"
            @paste="handlePaste"
            @focus="isFocused = true"
            @blur="isFocused = false"
          />
          <button
            type="button"
            class="touch-target flex items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-800"
            aria-label="发送"
            :disabled="!query.trim() && !selectedFiles.length"
            @click="submit"
          >
            <ArrowUp class="h-5 w-5" />
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2 border-t border-zinc-100 px-4 py-3 md:px-6">
          <div class="relative">
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
              :aria-label="attachmentTooltip"
              @mouseenter="showAttachmentTip = true"
              @mouseleave="showAttachmentTip = false"
              @focus="showAttachmentTip = true"
              @blur="showAttachmentTip = false"
              @click="triggerFilePicker"
            >
              <Paperclip class="h-3.5 w-3.5" />
              上传
            </button>
            <div
              v-if="showAttachmentTip"
              class="absolute bottom-full left-0 z-50 mb-2 w-[260px] rounded-lg border border-zinc-200 bg-white p-3 text-left shadow-[0_12px_36px_rgba(15,23,42,0.12)]"
            >
              <div class="text-xs font-semibold text-zinc-900">{{ attachmentTooltip }}</div>
              <p class="mt-1 text-[11px] leading-5 text-zinc-500">{{ uploadHint }}</p>
            </div>
          </div>
          <!-- 🌐 联网 toggle (framed, left of mode) -->
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition"
            :class="webSearchEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-50 text-zinc-400'"
            :title="webSearchEnabled ? '联网搜索已开启，点击关闭' : '联网搜索已关闭，点击开启'"
            @click="webSearchEnabled = !webSearchEnabled"
          >🌐 {{ webSearchEnabled ? '联网' : '联网' }}</button>

          <!-- Mode switcher -->
          <div class="flex items-center rounded-full border border-zinc-200 bg-zinc-50 p-1">
            <button
              v-for="item in runModes"
              :key="item.key"
              type="button"
              class="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition"
              :class="activeMode === item.key
                ? item.key === 'task'
                  ? 'bg-blue-600 text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)] ring-1 ring-blue-300'
                  : 'bg-emerald-600 text-white shadow-[0_14px_30px_rgba(16,185,129,0.26)] ring-1 ring-emerald-300'
                : 'text-zinc-500 hover:bg-white/80 hover:text-zinc-800'"
              :title="item.desc"
              @click="chooseMode(item.key)"
            >
              <component :is="item.icon" class="h-3.5 w-3.5" />
              {{ item.label }}
            </button>
          </div>

          <!-- Agent selector -->
          <div class="relative ml-auto">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition"
              :class="selectedAgent
                ? 'border-emerald-700 bg-emerald-700 text-white shadow-[0_14px_30px_rgba(5,150,105,0.26)] ring-1 ring-emerald-700 hover:bg-emerald-800'
                : 'border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-50'"
              @click.stop="showExpertDropdown = !showExpertDropdown"
            >
              <Bot class="h-3.5 w-3.5" />
              {{ agentOptions.find((item) => item.value === selectedAgent)?.label ?? agentLabel }}
              <ChevronDown class="h-3 w-3 transition-transform" :class="{ 'rotate-180': showExpertDropdown }" />
            </button>
            <!-- Agent dropdown -->
            <div v-if="showExpertDropdown" class="absolute right-0 top-full z-30 mt-1 w-52 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl">
              <button
                v-for="agent in agentOptions"
                :key="agent.value"
                :disabled="agent.disabled"
                class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition"
                :class="[
                  selectedAgent === agent.value ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-700 hover:bg-zinc-50',
                  agent.disabled ? 'cursor-not-allowed opacity-50' : '',
                ]"
                @click="if (!agent.disabled) { selectedAgent = agent.value; showExpertDropdown = false }"
              >
                <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><Bot class="h-3.5 w-3.5" /></div>
                <div class="min-w-0 flex-1"><div class="text-xs font-semibold">{{ agent.label }}</div><div class="text-[10px] text-zinc-400">{{ agent.desc }}</div></div>
              </button>
            </div>
          </div>
        </div>

        <!-- Focused + expert selected: plan center cases -->
        <div v-if="isFocused && selectedAgent === 'plan-center'" class="mt-4 overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/40 p-4 text-left shadow-[0_18px_45px_rgba(148,163,184,0.14)] backdrop-blur-2xl md:p-5">
          <div class="grid gap-3 md:grid-cols-3">
            <button
              v-for="item in planCases"
              :key="item.title"
              type="button"
              class="group rounded-2xl border border-white/75 bg-white/75 p-4 text-left shadow-sm backdrop-blur-xl transition hover:border-emerald-200 hover:bg-white/90 hover:shadow-md hover:shadow-zinc-300/20"
              @click="fillPrompt(item, 'task')"
            >
              <div class="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <Paperclip class="h-3.5 w-3.5" />
                </span>
                {{ item.title }}
              </div>
              <p class="mt-2 text-xs leading-5 text-zinc-500">{{ item.desc }}</p>
              <div class="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-600 opacity-80 transition group-hover:opacity-100">
                直接填入
                <ArrowUp class="h-3 w-3" />
              </div>
            </button>
          </div>
        </div>

        <!-- Focused + daily office: show DingTalk cases as recommendations -->
        <div v-if="isFocused && activeMode === 'quick' && selectedAgent === 'dingtalk'" class="mt-4 space-y-3 overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/40 p-4 text-left shadow-[0_18px_45px_rgba(148,163,184,0.14)] backdrop-blur-2xl md:p-5">
          <!-- DingTalk row -->
          <p class="px-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">钉钉快捷操作</p>
          <div class="grid gap-3 md:grid-cols-3">
            <button
              v-for="item in dingtalkCases"
              :key="item.title"
              type="button"
              class="group rounded-2xl border border-white/75 bg-white/75 p-4 text-left shadow-sm backdrop-blur-xl transition hover:border-blue-200 hover:bg-white/90 hover:shadow-md"
              @click="fillPrompt({ ...item, kb: '钉钉办公助手' }, 'quick')"
            >
              <div class="text-sm font-semibold text-zinc-900">{{ item.title }}</div>
              <p class="mt-1.5 text-xs leading-5 text-zinc-500">{{ item.desc }}</p>
              <div class="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-600 opacity-80 transition group-hover:opacity-100">
                直接填入 <ArrowUp class="h-3 w-3" />
              </div>
            </button>
          </div>
        </div>

        <!-- Focused + daily office: default recommendation cards -->
        <div v-if="isFocused && activeMode === 'quick' && selectedAgent !== 'dingtalk'" class="mt-4 space-y-3 overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/40 p-4 text-left shadow-[0_18px_45px_rgba(148,163,184,0.14)] backdrop-blur-2xl md:p-5">
          <p class="px-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">推荐用法</p>
          <div class="grid gap-3 md:grid-cols-3">
            <button
              v-for="item in quickCases"
              :key="item.title"
              type="button"
              class="group rounded-2xl border border-white/75 bg-white/75 p-4 text-left shadow-sm backdrop-blur-xl transition hover:border-amber-200 hover:bg-white/90 hover:shadow-md"
              @click="fillPrompt({ ...item, kb: '办公知识库' }, 'quick')"
            >
              <div class="text-sm font-semibold text-zinc-900">{{ item.title }}</div>
              <p class="mt-1.5 text-xs leading-5 text-zinc-500"><code class="rounded bg-zinc-100 px-1 text-[11px]">{{ item.hint }}</code></p>
              <div class="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-600 opacity-80 transition group-hover:opacity-100">直接填入 <ArrowUp class="h-3 w-3" /></div>
            </button>
          </div>
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
    </div>
  </section>
</template>
