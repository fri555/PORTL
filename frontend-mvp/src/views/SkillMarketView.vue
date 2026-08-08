<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Zap, Wand2, X, Code2 } from 'lucide-vue-next'
import { skills } from '@/mock/skills'
import type { Skill, SkillCategory } from '@/types/skill'
import { SKILL_CATEGORY_META } from '@/types/skill'
import { useAppStore } from '@/stores/app'
import WorkspaceBackButton from '@/components/common/WorkspaceBackButton.vue'

const store = useAppStore()

// ---- Filters ----
const searchQuery = ref('')
const activeCategory = ref<SkillCategory | 'all'>('all')

const isDeveloper = computed(() => {
  const role = store.user?.role
  return role === 'editor' || role === 'admin'
})

const categoryTabs = computed(() => {
  const tabs: { key: SkillCategory | 'all'; label: string; color: string }[] = [
    { key: 'all', label: '全部', color: '#6b7280' },
  ]
  for (const [key, meta] of Object.entries(SKILL_CATEGORY_META)) {
    tabs.push({ key: key as SkillCategory, label: meta.label, color: meta.color })
  }
  return tabs
})

const filteredSkills = computed(() => {
  let list = [...skills]
  if (activeCategory.value !== 'all') {
    list = list.filter((s) => s.category === activeCategory.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.developerName.includes(q),
    )
  }
  return list
})

// ---- Invoke Dialog ----
const showInvokeDialog = ref(false)
const selectedSkill = ref<Skill | null>(null)

function openInvokeDialog(skill: Skill) {
  selectedSkill.value = skill
  showInvokeDialog.value = true
}

function closeInvokeDialog() {
  showInvokeDialog.value = false
  selectedSkill.value = null
}

// ---- Create Dialog ----
const showCreateDialog = ref(false)
const createDescription = ref('')
const createGenerating = ref(false)
const createResult = ref('')

function startGenerate() {
  if (!createDescription.value.trim()) return
  createGenerating.value = true
  createResult.value = ''
  setTimeout(() => {
    createResult.value = JSON.stringify(
      {
        name: '新Skill',
        description: createDescription.value,
        category: 'content_generation',
        inputSchema: { text: 'string', style: 'string' },
        outputSchema: { result: 'string' },
        promptTemplate: '基于用户输入生成内容...',
        recommendedModel: 'claude-sonnet-4-6',
        apiEndpoint: '/api/v1/skills/new/invoke',
      },
      null,
      2,
    )
    createGenerating.value = false
  }, 2000)
}

function closeCreateDialog() {
  showCreateDialog.value = false
  createDescription.value = ''
  createResult.value = ''
}

// ---- Helpers ----
function getCategoryColor(cat: SkillCategory): string {
  return SKILL_CATEGORY_META[cat]?.color ?? '#6b7280'
}

function getCategoryLabel(cat: SkillCategory): string {
  return SKILL_CATEGORY_META[cat]?.label ?? cat
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    online: '在线',
    offline: '离线',
  }
  return map[status] ?? status
}

function summarizeSchema(schema: Record<string, unknown>): string {
  const keys = Object.keys(schema)
  if (keys.length === 0) return '无'
  return keys.map((k) => `${k}: ${schema[k]}`).join(', ')
}

</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <WorkspaceBackButton class="mb-3" />
        <h1 class="text-2xl font-bold text-zinc-900">Skill市场</h1>
        <p class="text-sm text-zinc-500 mt-1">浏览并使用AI能力单元，快速集成到你的工作流中</p>
      </div>
      <button
        v-if="isDeveloper"
        @click="showCreateDialog = true"
        class="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
      >
        <Wand2 class="size-4" />
        一句话生成Skill
      </button>
    </div>

    <!-- Filter Bar -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索Skill..."
          class="w-52 rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
        />
      </div>
    </div>

    <!-- Skill Card Grid -->
    <div v-if="filteredSkills.length > 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="skill in filteredSkills"
        :key="skill.id"
        class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
      >
        <!-- Card Header -->
        <div class="flex items-start gap-3">
          <div
            class="size-10 shrink-0 rounded-lg flex items-center justify-center text-white"
            :style="{ backgroundColor: getCategoryColor(skill.category) }"
          >
            <Zap class="size-5" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-zinc-900 truncate">{{ skill.name }}</h3>
            <div class="flex items-center gap-2 mt-0.5">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :style="{
                  backgroundColor: getCategoryColor(skill.category) + '18',
                  color: getCategoryColor(skill.category),
                }"
              >
                {{ getCategoryLabel(skill.category) }}
              </span>
              <span
                :class="[
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  skill.status === 'online'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-zinc-100 text-zinc-500',
                ]"
              >
                {{ getStatusBadge(skill.status) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Description -->
        <p class="mt-3 text-sm text-zinc-500 line-clamp-2">{{ skill.description }}</p>

        <!-- Schema Summary -->
        <div class="mt-3 space-y-1.5 text-xs">
          <div class="flex items-start gap-2">
            <span class="shrink-0 font-medium text-zinc-400 mt-0.5">输入：</span>
            <span class="text-zinc-600">{{ summarizeSchema(skill.inputSchema) }}</span>
          </div>
          <div class="flex items-start gap-2">
            <span class="shrink-0 font-medium text-zinc-400 mt-0.5">输出：</span>
            <span class="text-zinc-600">{{ summarizeSchema(skill.outputSchema) }}</span>
          </div>
        </div>

        <!-- API Endpoint -->
        <div class="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
          <Code2 class="size-3" />
          <code class="font-mono">{{ skill.apiEndpoint }}</code>
        </div>

        <!-- Meta -->
        <div class="mt-3 flex items-center gap-2 text-xs text-zinc-400">
          <span>{{ skill.developerName }}</span>
          <span class="text-zinc-300">|</span>
          <span>{{ skill.totalCalls.toLocaleString() }} 次调用</span>
          <span class="text-zinc-300">|</span>
          <span>v{{ skill.version }}</span>
        </div>

        <!-- Action -->
        <div class="mt-4">
          <button
            @click="openInvokeDialog(skill)"
            class="w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors inline-flex items-center justify-center gap-2"
          >
            <Zap class="size-3.5" />
            调用
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center py-20 text-zinc-400">
      <Zap class="size-16 mb-4" />
      <p class="text-lg font-medium">没有找到匹配的Skill</p>
      <p class="text-sm mt-1">尝试调整筛选条件或搜索关键词</p>
    </div>

    <!-- Invoke Dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showInvokeDialog && selectedSkill"
          class="fixed inset-0 z-50 flex items-center justify-center"
          @click.self="closeInvokeDialog"
        >
          <div class="absolute inset-0 bg-black/40" />
          <div class="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                <div
                  class="size-8 rounded-lg flex items-center justify-center text-white"
                  :style="{ backgroundColor: getCategoryColor(selectedSkill.category) }"
                >
                  <Zap class="size-4" />
                </div>
                {{ selectedSkill.name }}
              </h2>
              <button
                @click="closeInvokeDialog"
                class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X class="size-5" />
              </button>
            </div>

            <p class="text-sm text-zinc-500 mb-4">{{ selectedSkill.description }}</p>

            <!-- Schema Details -->
            <div class="space-y-4">
              <div>
                <h3 class="text-sm font-semibold text-zinc-700 mb-2">输入参数</h3>
                <div class="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <pre class="text-xs text-zinc-700 font-mono">{{ JSON.stringify(selectedSkill.inputSchema, null, 2) }}</pre>
                </div>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-zinc-700 mb-2">输出格式</h3>
                <div class="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <pre class="text-xs text-zinc-700 font-mono">{{ JSON.stringify(selectedSkill.outputSchema, null, 2) }}</pre>
                </div>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-zinc-700 mb-2">推荐模型</h3>
                <p class="text-sm text-zinc-600">{{ selectedSkill.recommendedModel }}</p>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-zinc-700 mb-2">API端点</h3>
                <code class="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded font-mono">{{ selectedSkill.apiEndpoint }}</code>
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-3">
              <button
                @click="closeInvokeDialog"
                class="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                关闭
              </button>
              <button
                class="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
              >
                申请权限
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Create Dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showCreateDialog"
          class="fixed inset-0 z-50 flex items-center justify-center"
          @click.self="closeCreateDialog"
        >
          <div class="absolute inset-0 bg-black/40" />
          <div class="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                <Wand2 class="size-5 text-orange-500" />
                一句话生成Skill
              </h2>
              <button
                @click="closeCreateDialog"
                class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X class="size-5" />
              </button>
            </div>

            <p class="text-sm text-zinc-500 mb-4">
              描述你想要的Skill功能，AI将自动生成Skill配置和接口定义
            </p>

            <textarea
              v-model="createDescription"
              placeholder="例如：自动检测商品图片质量，评估清晰度、构图、色彩，并给出改善建议..."
              rows="4"
              class="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 resize-none"
            />

            <div class="mt-4 flex justify-end gap-3">
              <button
                @click="closeCreateDialog"
                class="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                取消
              </button>
              <button
                @click="startGenerate"
                :disabled="!createDescription.trim() || createGenerating"
                class="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
              >
                <span v-if="createGenerating" class="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {{ createGenerating ? '生成中...' : '开始生成' }}
              </button>
            </div>

            <div v-if="createResult" class="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
              <h3 class="text-sm font-semibold text-green-800 mb-2">生成完成</h3>
              <pre class="text-xs text-green-700 overflow-x-auto max-h-48">{{ createResult }}</pre>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
