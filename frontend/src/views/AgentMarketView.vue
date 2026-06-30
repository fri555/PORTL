<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Heart, Star, MessageCircle, Plus, Wand2, X, SendHorizontal, Bot } from 'lucide-vue-next'
import { agents } from '@/mock/agents'
import type { Agent, AgentCategory } from '@/types/agent'
import { AGENT_CATEGORY_META } from '@/types/agent'
import { useAppStore } from '@/stores/app'
import { placeholder } from '@/lib/placeholder'
import WorkspaceBackButton from '@/components/common/WorkspaceBackButton.vue'

const store = useAppStore()

// ---- Filters ----
const searchQuery = ref('')
const activeCategory = ref<AgentCategory | 'all'>('all')
const showFavoritesOnly = ref(false)
const showMyDevOnly = ref(false)

const isDeveloper = computed(() => {
  const role = store.user?.role
  return role === 'editor' || role === 'admin'
})

const categoryTabs = computed(() => {
  const tabs: { key: AgentCategory | 'all'; label: string; color: string }[] = [
    { key: 'all', label: '全部', color: '#6b7280' },
  ]
  for (const [key, meta] of Object.entries(AGENT_CATEGORY_META)) {
    tabs.push({ key: key as AgentCategory, label: meta.label, color: meta.color })
  }
  return tabs
})

const filteredAgents = computed(() => {
  let list = [...agents]
  if (activeCategory.value !== 'all') {
    list = list.filter((a) => a.category === activeCategory.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.developerName.includes(q),
    )
  }
  if (showFavoritesOnly.value) {
    list = list.filter((a) => store.isLiked(a.id))
  }
  if (showMyDevOnly.value && store.user) {
    list = list.filter((a) => a.developerId === store.user!.id)
  }
  return list
})

// ---- Favorites (simulated with like store) ----
const favoritedAgents = computed(() => agents.filter((a) => store.isLiked(a.id)))

// ---- Chat Drawer ----
const chatAgent = ref<Agent | null>(null)
const chatMessages = ref<{ role: 'user' | 'assistant'; content: string }[]>([])
const chatInput = ref('')
const chatLoading = ref(false)

function openChat(agent: Agent) {
  chatAgent.value = agent
  chatMessages.value = [{ role: 'assistant', content: agent.welcomeMessage }]
  chatInput.value = ''
}

function closeChat() {
  chatAgent.value = null
  chatMessages.value = []
}

function sendMessage() {
  const text = chatInput.value.trim()
  if (!text || !chatAgent.value) return
  chatMessages.value.push({ role: 'user', content: text })
  chatInput.value = ''
  chatLoading.value = true
  setTimeout(() => {
    chatMessages.value.push({
      role: 'assistant',
      content: `收到你的问题：「${text}」。我是${chatAgent.value!.name}，正在为您分析处理中...（模拟回复）`,
    })
    chatLoading.value = false
  }, 1500)
}

// ---- Create Wizard ----
const showCreateWizard = ref(false)
const wizardStep = ref(1)
const totalSteps = 5

// Step 1: Basic Info
const wizardName = ref('')
const wizardDescription = ref('')
const wizardCategory = ref<AgentCategory>('retail_ops')
const wizardOneClickDescription = ref('')
const wizardOneClickGenerating = ref(false)

// Step 2: Prompt & Model
const wizardSystemPrompt = ref('')
const wizardModel = ref('claude-sonnet-4-6')

// Step 3: Bind Skills, Tools, Knowledge Bases
const wizardSelectedSkills = ref<string[]>([])
const wizardSelectedTools = ref<string[]>([])
const wizardSelectedKbs = ref<string[]>([])

// Step 4: Welcome & Quick Commands
const wizardWelcomeMessage = ref('')
const wizardQuickCommands = ref<string[]>(['', '', ''])
const wizardNewQuickCommand = ref('')

// Step 5: Preview
const wizardReviewAgreed = ref(false)

// Available models
const availableModels = [
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', description: '平衡性能与成本' },
  { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', description: '最强推理能力' },
  { id: 'claude-fable-5', name: 'Claude Fable 5', description: '创意内容生成' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', description: '高速低成本' },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', description: '国产高性能模型' },
]

// Available skills, tools, KBs for binding
const availableSkillsForBinding = [
  { id: 'sk01', name: '竞品价格比对' },
  { id: 'sk02', name: '商品描述生成' },
  { id: 'sk03', name: '营销文案多平台适配' },
  { id: 'sk04', name: '智能排班优化' },
  { id: 'sk05', name: '库存预警分析' },
  { id: 'sk06', name: '小红书种草文案' },
  { id: 'sk17', name: 'PPT撰写' },
  { id: 'sk19', name: '会议纪要整理' },
  { id: 'sk20', name: '数据分析报告' },
]
const availableToolsForBinding = [
  { id: 't1', name: '网页搜索工具' },
  { id: 't2', name: '数据库查询工具' },
  { id: 't3', name: '邮件发送工具' },
  { id: 't4', name: '日历管理工具' },
  { id: 't5', name: '图片生成工具' },
]
const availableKbsForBinding = [
  { id: 'kb01', name: '商品知识库' },
  { id: 'kb02', name: '门店运营知识库' },
  { id: 'kb03', name: '营销素材库' },
  { id: 'kb05', name: '客服知识库' },
]

function toggleArrayItem(arr: string[], id: string) {
  const idx = arr.indexOf(id)
  if (idx >= 0) arr.splice(idx, 1)
  else arr.push(id)
}

function addQuickCommand() {
  if (wizardNewQuickCommand.value.trim()) {
    wizardQuickCommands.value.push(wizardNewQuickCommand.value.trim())
    wizardNewQuickCommand.value = ''
  }
}

function removeQuickCommand(index: number) {
  wizardQuickCommands.value.splice(index, 1)
}

function wizardNext() {
  if (wizardStep.value < totalSteps) wizardStep.value++
}

function wizardPrev() {
  if (wizardStep.value > 1) wizardStep.value--
}

function wizardOneClickGenerate() {
  if (!wizardOneClickDescription.value.trim()) return
  wizardOneClickGenerating.value = true
  setTimeout(() => {
    wizardName.value = 'AI智能助手'
    wizardDescription.value = wizardOneClickDescription.value
    wizardCategory.value = 'retail_ops'
    wizardSystemPrompt.value = `你是一个${wizardOneClickDescription.value}的专业AI助手，请根据用户需求提供专业的分析和建议。`
    wizardWelcomeMessage.value = `你好！我是${wizardOneClickDescription.value}专家，有什么可以帮你？`
    wizardQuickCommands.value = ['帮我分析数据', '生成报告', '优化建议']
    wizardModel.value = 'claude-sonnet-4-6'
    wizardSelectedSkills.value = ['sk01', 'sk20']
    wizardOneClickGenerating.value = false
    wizardStep.value = 2
  }, 1500)
}

function wizardSubmit() {
  showCreateWizard.value = false
  // Reset wizard
  wizardStep.value = 1
  wizardName.value = ''
  wizardDescription.value = ''
  wizardSystemPrompt.value = ''
  wizardWelcomeMessage.value = ''
  wizardQuickCommands.value = ['', '', '']
  wizardSelectedSkills.value = []
  wizardSelectedTools.value = []
  wizardSelectedKbs.value = []
  wizardReviewAgreed.value = false
}

function openCreateWizard() {
  showCreateWizard.value = true
  wizardStep.value = 1
}

function closeCreateWizard() {
  showCreateWizard.value = false
  wizardStep.value = 1
}

const wizardStepLabels = ['基本信息', 'Prompt与模型', '绑定能力', '欢迎语设置', '预览提交']

// ---- Helpers ----
function getCapabilityStars(level: number): number[] {
  return Array.from({ length: level }, (_, i) => i)
}

function getCategoryColor(cat: AgentCategory): string {
  return AGENT_CATEGORY_META[cat]?.color ?? '#6b7280'
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    online: '在线',
    offline: '离线',
    maintenance: '维护中',
  }
  return map[status] ?? status
}

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    online: 'bg-green-100 text-green-700',
    offline: 'bg-zinc-100 text-zinc-500',
    maintenance: 'bg-amber-100 text-amber-700',
  }
  return map[status] ?? 'bg-zinc-100 text-zinc-500'
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <WorkspaceBackButton class="mb-3" />
        <h1 class="text-2xl font-bold text-zinc-900">智能体市场</h1>
        <p class="text-sm text-zinc-500 mt-1">浏览、收藏并使用天马AI生态中的智能体</p>
      </div>
      <div v-if="isDeveloper" class="flex gap-2">
        <button
          @click="openCreateWizard"
          class="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          <Plus class="size-4" />
          创建智能体
        </button>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <!-- Category Tabs -->
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="tab in categoryTabs"
          :key="tab.key"
          @click="activeCategory = tab.key"
          :class="[
            'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
            activeCategory === tab.key
              ? 'text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
          ]"
          :style="activeCategory === tab.key ? { backgroundColor: tab.color } : {}"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Search + Toggles -->
      <div class="flex items-center gap-3">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索智能体..."
            class="w-52 rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
          />
        </div>
        <button
          @click="showFavoritesOnly = !showFavoritesOnly"
          :class="[
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            showFavoritesOnly
              ? 'border-pink-300 bg-pink-50 text-pink-600'
              : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50',
          ]"
        >
          <Heart class="size-3.5" :class="{ 'fill-pink-500 text-pink-500': showFavoritesOnly }" />
          我的收藏
        </button>
        <button
          @click="showMyDevOnly = !showMyDevOnly"
          :class="[
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            showMyDevOnly
              ? 'border-orange-300 bg-orange-50 text-orange-600'
              : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50',
          ]"
        >
          我的开发
        </button>
      </div>
    </div>

    <!-- My Favorites Row -->
    <div v-if="favoritedAgents.length > 0 && !showFavoritesOnly && !showMyDevOnly" class="space-y-3">
      <h2 class="text-sm font-semibold text-zinc-500 uppercase tracking-wider">我的收藏</h2>
      <div class="flex gap-3 overflow-x-auto pb-2">
        <button
          v-for="agent in favoritedAgents"
          :key="agent.id"
          @click="openChat(agent)"
          class="group flex shrink-0 flex-col items-center gap-1.5"
          :title="agent.name"
        >
          <div
            class="size-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md transition-transform group-hover:scale-110"
            :style="{ backgroundColor: getCategoryColor(agent.category) }"
          >
            {{ agent.name.charAt(0) }}
          </div>
          <span class="text-xs text-zinc-500 truncate max-w-[64px]">{{ agent.name }}</span>
        </button>
      </div>
    </div>

    <!-- Agent Card Grid -->
    <div v-if="filteredAgents.length > 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="agent in filteredAgents"
        :key="agent.id"
        class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
      >
        <!-- Card Header -->
        <div class="flex items-start gap-3">
          <div
            class="size-12 shrink-0 rounded-xl flex items-center justify-center text-white text-lg font-bold"
            :style="{ backgroundColor: getCategoryColor(agent.category) }"
          >
            {{ agent.name.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-zinc-900 truncate">{{ agent.name }}</h3>
              <span
                :class="['shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(agent.status)]"
              >
                {{ getStatusBadge(agent.status) }}
              </span>
            </div>
            <div class="flex items-center gap-1 mt-0.5">
              <Star
                v-for="i in getCapabilityStars(agent.capabilityLevel)"
                :key="i"
                class="size-3 text-amber-400 fill-amber-400"
              />
              <Star
                v-for="i in getCapabilityStars(5 - agent.capabilityLevel)"
                :key="'e' + i"
                class="size-3 text-zinc-200 fill-zinc-200"
              />
            </div>
          </div>
        </div>

        <!-- Description -->
        <p class="mt-3 text-sm text-zinc-500 line-clamp-2">{{ agent.description }}</p>

        <!-- Meta -->
        <div class="mt-3 flex items-center gap-2 text-xs text-zinc-400">
          <span>{{ agent.developerName }}</span>
          <span class="text-zinc-300">|</span>
          <span>{{ agent.totalCalls.toLocaleString() }} 次调用</span>
          <span class="text-zinc-300">|</span>
          <span>{{ agent.avgRating }} 分</span>
        </div>

        <!-- Badges -->
        <div class="mt-3 flex items-center gap-2">
          <span class="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-600">
            {{ agent.skillCount }} 个Skill
          </span>
          <span class="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
            {{ agent.toolCount }} 个工具
          </span>
        </div>

        <!-- Actions -->
        <div class="mt-4 flex items-center gap-2">
          <button
            @click="store.toggleLike(agent.id)"
            :class="[
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              store.isLiked(agent.id)
                ? 'border-pink-300 bg-pink-50 text-pink-600'
                : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50',
            ]"
          >
            <Heart class="size-3.5" :class="{ 'fill-pink-500 text-pink-500': store.isLiked(agent.id) }" />
            收藏
          </button>
          <button
            @click="openChat(agent)"
            class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
          >
            <MessageCircle class="size-3.5" />
            开始协作
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center py-20 text-zinc-400">
      <Bot class="size-16 mb-4" />
      <p class="text-lg font-medium">没有找到匹配的智能体</p>
      <p class="text-sm mt-1">尝试调整筛选条件或搜索关键词</p>
    </div>

    <!-- Chat Drawer (slide from right) -->
    <Teleport to="body">
      <Transition name="drawer">
        <div
          v-if="chatAgent"
          class="fixed inset-0 z-50 flex justify-end"
          @click.self="closeChat"
        >
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/40" />

          <!-- Drawer Panel -->
          <div class="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full ml-auto">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <div class="flex items-center gap-3">
                <div
                  class="size-9 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                  :style="{ backgroundColor: getCategoryColor(chatAgent.category) }"
                >
                  {{ chatAgent.name.charAt(0) }}
                </div>
                <div>
                  <h3 class="font-semibold text-zinc-900 text-sm">{{ chatAgent.name }}</h3>
                  <p class="text-xs text-zinc-400">智能协作对话</p>
                </div>
              </div>
              <button
                @click="closeChat"
                class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
              >
                <X class="size-5" />
              </button>
            </div>

            <!-- Messages -->
            <div class="flex-1 overflow-y-auto p-5 space-y-4">
              <div
                v-for="(msg, idx) in chatMessages"
                :key="idx"
                :class="['flex gap-3', msg.role === 'user' ? 'justify-end' : '']"
              >
                <div
                  v-if="msg.role === 'assistant'"
                  class="size-8 shrink-0 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  :style="{ backgroundColor: getCategoryColor(chatAgent.category) }"
                >
                  {{ chatAgent.name.charAt(0) }}
                </div>
                <div
                  :class="[
                    'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                    msg.role === 'user'
                      ? 'bg-orange-500 text-white rounded-br-md'
                      : 'bg-zinc-100 text-zinc-800 rounded-bl-md',
                  ]"
                >
                  {{ msg.content }}
                </div>
              </div>

              <!-- Quick commands -->
              <div v-if="chatMessages.length === 1" class="flex flex-wrap gap-2 pt-2">
                <button
                  v-for="cmd in chatAgent.quickCommands"
                  :key="cmd"
                  @click="chatInput = cmd; sendMessage()"
                  class="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs text-orange-600 hover:bg-orange-100 transition-colors"
                >
                  {{ cmd }}
                </button>
              </div>

              <!-- Loading indicator -->
              <div v-if="chatLoading" class="flex gap-3">
                <div
                  class="size-8 shrink-0 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  :style="{ backgroundColor: getCategoryColor(chatAgent.category) }"
                >
                  {{ chatAgent.name.charAt(0) }}
                </div>
                <div class="bg-zinc-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div class="flex gap-1.5">
                    <span class="size-2 rounded-full bg-zinc-400 animate-bounce" style="animation-delay: 0s" />
                    <span class="size-2 rounded-full bg-zinc-400 animate-bounce" style="animation-delay: 0.15s" />
                    <span class="size-2 rounded-full bg-zinc-400 animate-bounce" style="animation-delay: 0.3s" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Input -->
            <div class="border-t border-zinc-200 px-4 py-4">
              <div class="flex items-center gap-2">
                <input
                  v-model="chatInput"
                  @keydown.enter="sendMessage"
                  type="text"
                  placeholder="输入消息..."
                  class="flex-1 rounded-lg border border-zinc-300 bg-zinc-50 py-2.5 px-4 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                />
                <button
                  @click="sendMessage"
                  :disabled="!chatInput.trim() || chatLoading"
                  class="rounded-lg bg-orange-500 p-2.5 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <SendHorizontal class="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Multi-Step Creation Wizard -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showCreateWizard"
          class="fixed inset-0 z-50 flex items-center justify-center"
          @click.self="closeCreateWizard"
        >
          <div class="absolute inset-0 bg-black/40" />
          <div class="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
            <!-- Wizard Header -->
            <div class="shrink-0 border-b border-zinc-200 px-6 py-4">
              <div class="flex items-center justify-between mb-3">
                <h2 class="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                  <Wand2 class="size-5 text-orange-500" />
                  创建智能体
                </h2>
                <button
                  @click="closeCreateWizard"
                  class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                >
                  <X class="size-5" />
                </button>
              </div>
              <!-- Step Indicator -->
              <div class="flex items-center gap-2">
                <template v-for="(label, idx) in wizardStepLabels" :key="idx">
                  <div v-if="idx > 0" class="flex-1 h-px bg-zinc-200">
                    <div
                      class="h-full bg-orange-500 transition-all duration-300"
                      :style="{ width: wizardStep > idx + 1 ? '100%' : wizardStep === idx + 1 ? '0%' : '0%' }"
                    />
                  </div>
                  <div class="flex items-center gap-1.5">
                    <div
                      :class="[
                        'size-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                        wizardStep > idx + 1
                          ? 'bg-orange-500 text-white'
                          : wizardStep === idx + 1
                            ? 'bg-orange-100 text-orange-600 ring-2 ring-orange-300'
                            : 'bg-zinc-100 text-zinc-400',
                      ]"
                    >
                      {{ wizardStep > idx + 1 ? '&#10003;' : idx + 1 }}
                    </div>
                    <span
                      :class="[
                        'text-xs font-medium hidden sm:inline',
                        wizardStep === idx + 1 ? 'text-orange-600' : 'text-zinc-400',
                      ]"
                    >
                      {{ label }}
                    </span>
                  </div>
                </template>
              </div>
            </div>

            <!-- Wizard Body -->
            <div class="flex-1 overflow-y-auto p-6">

              <!-- Step 1: Basic Info -->
              <div v-if="wizardStep === 1" class="space-y-4">
                <p class="text-sm text-zinc-500">填写智能体的基本信息，或使用一句话生成快速创建</p>

                <!-- 一句话生成 -->
                <div class="rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                  <h3 class="text-sm font-semibold text-orange-800 mb-3 flex items-center gap-2">
                    <Wand2 class="size-4" />
                    一句话生成（可选）
                  </h3>
                  <div class="flex gap-2">
                    <input
                      v-model="wizardOneClickDescription"
                      type="text"
                      placeholder="例如：创建负责天猫店铺日常运营的AI助手，能分析竞品价格、生成营销文案..."
                      class="flex-1 rounded-lg border border-orange-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                    <button
                      @click="wizardOneClickGenerate"
                      :disabled="!wizardOneClickDescription.trim() || wizardOneClickGenerating"
                      class="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors inline-flex items-center gap-2 shrink-0"
                    >
                      <span v-if="wizardOneClickGenerating" class="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {{ wizardOneClickGenerating ? '生成中' : 'AI生成' }}
                    </button>
                  </div>
                </div>

                <div class="border-t border-zinc-200 pt-4">
                  <p class="text-xs text-zinc-400 mb-3">或手动填写以下信息</p>
                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-zinc-700 mb-1">智能体名称 *</label>
                      <input
                        v-model="wizardName"
                        type="text"
                        placeholder="输入智能体名称"
                        class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-zinc-700 mb-1">描述 *</label>
                      <textarea
                        v-model="wizardDescription"
                        rows="2"
                        placeholder="描述智能体的功能和适用场景"
                        class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 resize-none"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-zinc-700 mb-1">分类 *</label>
                      <select
                        v-model="wizardCategory"
                        class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                      >
                        <option v-for="(meta, key) in AGENT_CATEGORY_META" :key="key" :value="key">{{ meta.label }}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Step 2: Prompt & Model -->
              <div v-if="wizardStep === 2" class="space-y-4">
                <p class="text-sm text-zinc-500">配置智能体的系统提示词和使用的AI模型</p>
                <div>
                  <label class="block text-sm font-medium text-zinc-700 mb-1">系统提示词 (System Prompt)</label>
                  <textarea
                    v-model="wizardSystemPrompt"
                    rows="6"
                    placeholder="你是一个专业的AI助手，擅长..."
                    class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 resize-none font-mono"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-zinc-700 mb-2">选择模型</label>
                  <div class="grid gap-2 sm:grid-cols-2">
                    <button
                      v-for="model in availableModels"
                      :key="model.id"
                      @click="wizardModel = model.id"
                      :class="[
                        'rounded-lg border p-3 text-left transition-colors',
                        wizardModel === model.id
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-zinc-200 bg-white hover:border-zinc-300',
                      ]"
                    >
                      <div class="text-sm font-medium text-zinc-900">{{ model.name }}</div>
                      <div class="text-xs text-zinc-500 mt-0.5">{{ model.description }}</div>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Step 3: Bind Skills, Tools, KBs -->
              <div v-if="wizardStep === 3" class="space-y-6">
                <p class="text-sm text-zinc-500">为智能体绑定Skill、工具和知识库，增强其能力</p>

                <!-- Skills -->
                <div>
                  <h3 class="text-sm font-semibold text-zinc-700 mb-2">绑定Skill <span class="text-xs text-zinc-400 font-normal">({{ wizardSelectedSkills.length }} 个已选)</span></h3>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="skill in availableSkillsForBinding"
                      :key="skill.id"
                      @click="toggleArrayItem(wizardSelectedSkills, skill.id)"
                      :class="[
                        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        wizardSelectedSkills.includes(skill.id)
                          ? 'bg-orange-100 text-orange-600 border border-orange-300'
                          : 'bg-zinc-50 text-zinc-500 border border-zinc-200 hover:bg-zinc-100',
                      ]"
                    >
                      {{ skill.name }}
                    </button>
                  </div>
                </div>

                <!-- Tools -->
                <div>
                  <h3 class="text-sm font-semibold text-zinc-700 mb-2">绑定工具 <span class="text-xs text-zinc-400 font-normal">({{ wizardSelectedTools.length }} 个已选)</span></h3>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="tool in availableToolsForBinding"
                      :key="tool.id"
                      @click="toggleArrayItem(wizardSelectedTools, tool.id)"
                      :class="[
                        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        wizardSelectedTools.includes(tool.id)
                          ? 'bg-blue-100 text-blue-600 border border-blue-300'
                          : 'bg-zinc-50 text-zinc-500 border border-zinc-200 hover:bg-zinc-100',
                      ]"
                    >
                      {{ tool.name }}
                    </button>
                  </div>
                </div>

                <!-- Knowledge Bases -->
                <div>
                  <h3 class="text-sm font-semibold text-zinc-700 mb-2">绑定知识库 <span class="text-xs text-zinc-400 font-normal">({{ wizardSelectedKbs.length }} 个已选)</span></h3>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="kb in availableKbsForBinding"
                      :key="kb.id"
                      @click="toggleArrayItem(wizardSelectedKbs, kb.id)"
                      :class="[
                        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        wizardSelectedKbs.includes(kb.id)
                          ? 'bg-green-100 text-green-600 border border-green-300'
                          : 'bg-zinc-50 text-zinc-500 border border-zinc-200 hover:bg-zinc-100',
                      ]"
                    >
                      {{ kb.name }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Step 4: Welcome & Quick Commands -->
              <div v-if="wizardStep === 4" class="space-y-4">
                <p class="text-sm text-zinc-500">设置用户首次打开对话时的欢迎语和快捷指令</p>
                <div>
                  <label class="block text-sm font-medium text-zinc-700 mb-1">欢迎语</label>
                  <textarea
                    v-model="wizardWelcomeMessage"
                    rows="3"
                    placeholder="你好！我是XX智能体，可以帮你..."
                    class="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 resize-none"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-zinc-700 mb-1">快捷指令</label>
                  <div class="space-y-2 mb-2">
                    <div
                      v-for="(cmd, idx) in wizardQuickCommands"
                      :key="idx"
                      class="flex items-center gap-2"
                    >
                      <input
                        v-model="wizardQuickCommands[idx]"
                        type="text"
                        :placeholder="`快捷指令 ${idx + 1}`"
                        class="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                      />
                      <button
                        @click="removeQuickCommand(idx)"
                        class="rounded-lg p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <X class="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <input
                      v-model="wizardNewQuickCommand"
                      @keydown.enter="addQuickCommand"
                      type="text"
                      placeholder="添加新指令"
                      class="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                    />
                    <button
                      @click="addQuickCommand"
                      class="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                    >
                      <Plus class="size-4" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Step 5: Preview -->
              <div v-if="wizardStep === 5" class="space-y-4">
                <p class="text-sm text-zinc-500">确认以下内容，提交后将进入审核流程</p>
                <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-5 space-y-3">
                  <div class="flex items-center gap-3">
                    <div
                      class="size-12 shrink-0 rounded-xl flex items-center justify-center text-white text-lg font-bold"
                      :style="{ backgroundColor: getCategoryColor(wizardCategory) }"
                    >
                      {{ wizardName ? wizardName.charAt(0) : '?' }}
                    </div>
                    <div>
                      <h3 class="font-semibold text-zinc-900">{{ wizardName || '（未填写）' }}</h3>
                      <p class="text-xs text-zinc-500 mt-0.5">{{ AGENT_CATEGORY_META[wizardCategory]?.label }}</p>
                    </div>
                  </div>
                  <p class="text-sm text-zinc-600">{{ wizardDescription || '（未填写描述）' }}</p>
                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div><span class="text-zinc-400">模型：</span><span class="text-zinc-700">{{ wizardModel }}</span></div>
                    <div><span class="text-zinc-400">Skill：</span><span class="text-zinc-700">{{ wizardSelectedSkills.length }} 个</span></div>
                    <div><span class="text-zinc-400">工具：</span><span class="text-zinc-700">{{ wizardSelectedTools.length }} 个</span></div>
                    <div><span class="text-zinc-400">知识库：</span><span class="text-zinc-700">{{ wizardSelectedKbs.length }} 个</span></div>
                  </div>
                  <div class="mt-2">
                    <p class="text-xs text-zinc-400 mb-1">欢迎语</p>
                    <p class="text-sm text-zinc-600 bg-white rounded-lg border border-zinc-200 p-2">{{ wizardWelcomeMessage || '（未设置）' }}</p>
                  </div>
                </div>
                <label class="flex items-start gap-2 cursor-pointer">
                  <input v-model="wizardReviewAgreed" type="checkbox" class="mt-0.5 rounded border-zinc-300 text-orange-500 focus:ring-orange-500" />
                  <span class="text-xs text-zinc-500">我已确认以上信息正确，提交后将由管理员审核后上线</span>
                </label>
              </div>
            </div>

            <!-- Wizard Footer -->
            <div class="shrink-0 border-t border-zinc-200 px-6 py-4 flex items-center justify-between">
              <button
                v-if="wizardStep > 1"
                @click="wizardPrev"
                class="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                上一步
              </button>
              <div v-else />
              <div class="flex gap-2">
                <button
                  @click="closeCreateWizard"
                  class="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  取消
                </button>
                <button
                  v-if="wizardStep < totalSteps"
                  @click="wizardNext"
                  class="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
                >
                  下一步
                </button>
                <button
                  v-else
                  @click="wizardSubmit"
                  :disabled="!wizardReviewAgreed"
                  class="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  提交审核
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.3s ease;
}
.drawer-enter-active > div:last-child,
.drawer-leave-active > div:last-child {
  transition: transform 0.3s ease;
}
.drawer-enter-from {
  opacity: 0;
}
.drawer-enter-from > div:last-child {
  transform: translateX(100%);
}
.drawer-leave-to {
  opacity: 0;
}
.drawer-leave-to > div:last-child {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
