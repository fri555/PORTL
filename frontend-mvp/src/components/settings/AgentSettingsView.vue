<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Copy,
  Download,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings2,
  Trash2,
  Upload,
  WandSparkles,
} from 'lucide-vue-next'
import ResourcePermissionDialog, { type PermissionMember } from '@/components/common/ResourcePermissionDialog.vue'

type AgentStatus = 'active' | 'disabled'

type AgentRow = {
  id: string
  name: string
  category: string
  description: string
  status: AgentStatus
  updatedAt: string
  avatar: string
}

type FormMode = 'create' | 'edit' | null

const assetBase = `${import.meta.env.BASE_URL}assets/agents-online`

const agents = reactive<AgentRow[]>([
  { id: 'assistant', name: '天马智擎助手', category: '通用助手', description: '默认智能体', status: 'active', updatedAt: '2026-08-06 14:27', avatar: `${assetBase}/tianma-assistant.png` },
  { id: 'data', name: '数据分析', category: '数据与洞察', description: '输出经营报表、诊断异常指标、提供数据洞察', status: 'active', updatedAt: '2026-08-09 23:48', avatar: `${assetBase}/data-analysis.png` },
  { id: 'assortment', name: '组货专家', category: '供应链与商品', description: '根据预算、人数、性别比例和品类需求，匹配知识库方案与商品信息，生成可执行的组货方案', status: 'active', updatedAt: '2026-08-07 20:54', avatar: `${assetBase}/assortment-expert.png` },
  { id: 'review', name: '评价分析师', category: '数据与洞察', description: '专注于淘天京东平台店铺评价数据的智能分析与报告生成', status: 'active', updatedAt: '2026-08-09 23:28', avatar: `${assetBase}/review-analyst.png` },
  { id: 'inspiration', name: '灵感大王', category: '营销与增长', description: '根据商品货号和平台，生成社媒种草营销文案和配图', status: 'active', updatedAt: '2026-08-07 20:55', avatar: `${assetBase}/inspiration-king.png` },
])

const formMode = ref<FormMode>(null)
const activeStep = ref(1)
const editingId = ref('')
const searchInput = ref('')
const appliedSearch = ref('')
const categoryFilter = ref('')
const statusFilter = ref('')
const menuId = ref('')
const permissionTarget = ref<AgentRow | null>(null)
const permissionMembers = ref<Record<string, PermissionMember[]>>({})
const toast = ref('')
const avatarInput = ref<HTMLInputElement | null>(null)
const importInput = ref<HTMLInputElement | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

const steps = ['基础设定', '角色设定', '能力扩展', '用户剧本']
const categories = ['通用助手', '数据与洞察', '供应链与商品', '营销与增长']
const models = ['deepseek-v4-flash（deepseek-v4-flash）', 'Qwen3 企业主模型', 'DeepSeek 推理模型']

const draft = reactive({
  name: '',
  version: 1,
  category: '通用助手',
  description: '',
  avatar: '',
  publishTemplate: false,
  model: '',
  react: true,
  chainOfThought: false,
  historyTurns: 20,
  compressionThreshold: 3000,
  longTermMemory: false,
  markdown: true,
  rolePrompt: '',
  strictKnowledge: false,
  monitoring: true,
  selectedDocs: [] as string[],
  selectedTools: [] as string[],
})

const knowledgeDocs = [
  { name: 'AM-014-天马集团车辆管理制度20260324.docx', size: '0.04', scope: '个人空间', kind: 'W' },
  { name: 'AM-003-天马集团会议设备使用指南20260318.pdf', size: '4.33', scope: '个人空间', kind: 'PDF' },
  { name: 'AM-001-天马集团6S+C办公环境管理制度20260501.docx', size: '0.07', scope: '个人空间', kind: 'W' },
  { name: '6.2 吸引力法则.pdf', size: '6.68', scope: '公共空间', kind: 'PDF' },
  { name: '2.2 话术逻辑.pdf', size: '5.54', scope: '公共空间', kind: 'PDF' },
  { name: '斯凯奇26Q3开季培训202607.pdf', size: '11.05', scope: '公共空间', kind: 'PDF' },
]

const tools = [
  { name: 'Brave网络搜索', category: '搜索工具', description: '隐私优先的网页与新闻搜索' },
  { name: '计算器', category: '工具', description: '基础数学运算工具' },
  { name: 'CSV工具', category: '文件工具', description: '读取、写入和分析 CSV 文件' },
  { name: '数据分析', category: '开发工具', description: '使用 Pandas 处理数据框' },
  { name: 'Python解释器', category: '开发工具', description: '执行 Python 代码并分析数据' },
  { name: '邮件 (SMTP)', category: '通讯工具', description: '发送和接收电子邮件' },
]

const defaultPrompt = `# 天马智擎 · 系统提示词

你是一位专业、高效、可靠的天马智能助手，专注于日常办公场景的任务交付。

## 一、第一性原理
1. **任务导向**：以交付可用结果为目标，流程服务于结果。
2. **风险分级**：过程开销与操作不可逆性成正比。
3. **证据可溯**：事实性结论必须有据可查，不编造。
4. **交付完整**：输出应可直接使用，不留待补全的半成品。
5. **用户主权**：涉及取舍的决策点交还用户。`

const filteredAgents = computed(() => agents.filter((agent) => {
  const keyword = appliedSearch.value.trim().toLowerCase()
  const keywordMatched = !keyword || agent.name.toLowerCase().includes(keyword)
  const categoryMatched = !categoryFilter.value || agent.category === categoryFilter.value
  const statusMatched = !statusFilter.value || agent.status === statusFilter.value
  return keywordMatched && categoryMatched && statusMatched
}))

const pageTitle = computed(() => formMode.value === 'create' ? '创建智能体' : '编辑智能体')

function notify(message: string) {
  toast.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2200)
}

function resetDraft() {
  Object.assign(draft, {
    name: '', version: 1, category: '通用助手', description: '', avatar: '', publishTemplate: false,
    model: '', react: true, chainOfThought: false, historyTurns: 20, compressionThreshold: 3000,
    longTermMemory: false, markdown: true, rolePrompt: defaultPrompt, strictKnowledge: false,
    monitoring: true, selectedDocs: [], selectedTools: [],
  })
}

function openCreate() {
  resetDraft()
  formMode.value = 'create'
  activeStep.value = 1
  editingId.value = ''
}

function openEdit(agent: AgentRow) {
  resetDraft()
  Object.assign(draft, {
    name: agent.name,
    category: agent.category,
    description: agent.description,
    avatar: agent.avatar,
    model: models[0],
    chainOfThought: true,
    historyTurns: 10,
    compressionThreshold: 128000,
    longTermMemory: true,
  })
  formMode.value = 'edit'
  activeStep.value = 1
  editingId.value = agent.id
  menuId.value = ''
}

function openPermissions(agent: AgentRow) {
  menuId.value = ''
  permissionTarget.value = agent
}

function savePermissions(members: PermissionMember[]) {
  if (!permissionTarget.value) return
  permissionMembers.value[permissionTarget.value.id] = members
  notify(`${permissionTarget.value.name}的权限设置已保存并配置生效`)
}

function closeForm() {
  formMode.value = null
  activeStep.value = 1
  editingId.value = ''
  menuId.value = ''
}

function clearFilters() {
  searchInput.value = ''
  appliedSearch.value = ''
  categoryFilter.value = ''
  statusFilter.value = ''
}

function applyFilters() {
  appliedSearch.value = searchInput.value
}

function nextStep() {
  if (activeStep.value === 1 && !draft.name.trim()) {
    notify('请输入智能体名称')
    return
  }
  activeStep.value = Math.min(4, activeStep.value + 1)
}

function saveAgent() {
  if (!draft.name.trim()) {
    activeStep.value = 1
    notify('请输入智能体名称')
    return
  }
  const wasEditing = formMode.value === 'edit'
  const existing = agents.find((agent) => agent.id === editingId.value)
  const payload = {
    name: draft.name.trim(),
    category: draft.category,
    description: draft.description.trim() || '默认智能体',
    avatar: draft.avatar || `${assetBase}/tianma-assistant.png`,
    updatedAt: '2026-08-11 现在',
  }
  if (existing) Object.assign(existing, payload)
  else agents.unshift({ id: `agent-${Date.now()}`, status: 'active', ...payload })
  closeForm()
  notify(wasEditing ? '智能体配置已保存' : '智能体已创建')
}

function deleteAgent(agent: AgentRow) {
  const index = agents.findIndex((item) => item.id === agent.id)
  if (index >= 0) agents.splice(index, 1)
  menuId.value = ''
  notify('智能体已删除')
}

function handleAvatar(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    notify('请上传不超过 2MB 的 JPG、PNG 或 SVG 图标')
    return
  }
  const reader = new FileReader()
  reader.onload = () => { draft.avatar = String(reader.result || '') }
  reader.readAsDataURL(file)
}

function exportConfig() {
  const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${draft.name || 'agent'}-config.json`
  anchor.click()
  URL.revokeObjectURL(url)
  notify('配置已导出')
}

function importConfig(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      Object.assign(draft, JSON.parse(String(reader.result)))
      notify('配置已导入')
    } catch {
      notify('配置文件格式不正确')
    }
  }
  reader.readAsText(file)
}

function toggleArray(list: string[], value: string) {
  const index = list.indexOf(value)
  if (index >= 0) list.splice(index, 1)
  else list.push(value)
}
</script>

<template>
  <div class="h-[calc(100vh-57px)] overflow-hidden bg-white text-[#171717]">
    <template v-if="!formMode">
      <main class="relative mx-auto h-full w-full overflow-hidden px-5 pb-5 pt-4 sm:px-8">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <button type="button" class="grid h-5 w-5 place-items-center text-zinc-500" aria-label="展开导航">
              <ChevronLeft class="h-4 w-4 rounded-sm border border-zinc-400" />
            </button>
            <h1 class="text-[18px] font-semibold">智能体管理</h1>
          </div>
          <div class="flex min-w-0 flex-1 items-center justify-end gap-3 sm:flex-none">
            <label class="flex h-8 min-w-0 flex-1 items-center rounded-lg border border-zinc-200 px-3 sm:w-60 sm:flex-none">
              <Search class="mr-2 h-4 w-4 text-zinc-400" />
              <input v-model="searchInput" class="min-w-0 flex-1 text-sm outline-none placeholder:text-zinc-400" placeholder="搜索智能体名称..." @keyup.enter="applyFilters" />
            </label>
            <button type="button" class="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg bg-[#171717] px-4 text-sm font-medium text-white hover:bg-black" @click="openCreate">
              <CirclePlus class="h-4 w-4" />创建智能体
            </button>
          </div>
        </div>

        <section class="mt-3 grid max-w-[684px] grid-cols-1 gap-3 sm:grid-cols-[240px_240px_60px_60px] sm:items-end sm:gap-x-6">
          <label class="block text-sm font-medium">
            分类
            <span class="relative mt-2 block">
              <select v-model="categoryFilter" class="h-8 w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 pr-9 text-sm font-normal text-zinc-600 outline-none focus:border-zinc-400">
                <option value="">选择分类</option>
                <option v-for="category in categories" :key="category">{{ category }}</option>
              </select>
              <ChevronDown class="pointer-events-none absolute right-3 top-2 h-4 w-4 text-zinc-300" />
            </span>
          </label>
          <label class="block text-sm font-medium">
            状态
            <span class="relative mt-2 block">
              <select v-model="statusFilter" class="h-8 w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 pr-9 text-sm font-normal text-zinc-600 outline-none focus:border-zinc-400">
                <option value="">选择状态</option>
                <option value="active">已启用</option>
                <option value="disabled">已停用</option>
              </select>
              <ChevronDown class="pointer-events-none absolute right-3 top-2 h-4 w-4 text-zinc-300" />
            </span>
          </label>
          <button type="button" class="h-8 rounded-lg border border-zinc-200 bg-white text-sm font-medium hover:bg-zinc-50" @click="clearFilters">清除</button>
          <button type="button" class="-ml-3 h-8 rounded-lg bg-[#171717] text-sm font-medium text-white hover:bg-black" @click="applyFilters">查询</button>
        </section>

        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[820px] table-fixed border-collapse text-left">
            <thead class="bg-[#f7f7f8] text-sm font-medium text-zinc-500">
              <tr class="h-10">
                <th class="w-[24%] px-4 font-medium">名称</th>
                <th class="w-[14%] px-4 font-medium">分类</th>
                <th class="w-[25%] px-4 font-medium">简介</th>
                <th class="w-[14%] px-4 font-medium">状态</th>
                <th class="w-[16%] px-4 font-medium">更新时间</th>
                <th class="w-[7%] px-2 text-center font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="agent in filteredAgents" :key="agent.id" class="h-14 border-b border-zinc-100 text-sm hover:bg-zinc-50/70">
                <td class="px-4">
                  <div class="flex min-w-0 items-center gap-3">
                    <img :src="agent.avatar" :alt="agent.name" class="h-9 w-9 shrink-0 rounded-lg object-cover" />
                    <span class="truncate font-semibold text-zinc-900">{{ agent.name }}</span>
                  </div>
                </td>
                <td class="truncate px-4 text-zinc-600">{{ agent.category }}</td>
                <td class="truncate px-4 text-zinc-600" :title="agent.description">{{ agent.description }}</td>
                <td class="px-4">
                  <span class="inline-flex items-center gap-2 text-zinc-600"><i class="h-1.5 w-1.5 rounded-full" :class="agent.status === 'active' ? 'bg-[#79dc4b]' : 'bg-zinc-300'" />{{ agent.status === 'active' ? '已启用' : '已停用' }}</span>
                </td>
                <td class="px-4 text-zinc-500">{{ agent.updatedAt }}</td>
                <td class="relative px-2 text-right">
                  <button type="button" class="grid h-8 w-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100" aria-label="更多操作" :aria-expanded="menuId === agent.id" @click.stop="menuId = menuId === agent.id ? '' : agent.id"><MoreHorizontal class="h-4 w-4" /></button>
                  <div v-if="menuId === agent.id" role="menu" aria-label="更多操作" class="absolute right-3 top-12 z-30 w-32 rounded-lg border border-zinc-200 bg-white p-1 text-left shadow-lg">
                    <button role="menuitem" type="button" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-zinc-50" @click.stop="openEdit(agent)"><WandSparkles class="h-4 w-4" />编辑</button>
                    <button role="menuitem" type="button" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-zinc-50" @click.stop="openPermissions(agent)"><Settings2 class="h-4 w-4" />权限设置</button>
                    <button role="menuitem" type="button" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50" @click.stop="deleteAgent(agent)"><Trash2 class="h-4 w-4" />删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="absolute bottom-20 left-5 right-5 flex items-center justify-between text-sm text-zinc-400 sm:left-8 sm:right-8 md:bottom-5">
          <span>共 {{ filteredAgents.length }} 项，1/1</span>
          <div class="flex items-center gap-2">
            <button disabled class="grid h-8 w-8 place-items-center rounded-lg border border-zinc-100 text-zinc-300"><ChevronLeft class="h-4 w-4" /></button>
            <button class="grid h-8 w-8 place-items-center rounded-lg border border-zinc-800 text-zinc-900">1</button>
            <button disabled class="grid h-8 w-8 place-items-center rounded-lg border border-zinc-100 text-zinc-300"><ChevronRight class="h-4 w-4" /></button>
          </div>
        </div>
      </main>
    </template>

    <template v-else>
      <main class="relative mx-auto h-[calc(100vh-3.5rem)] w-full overflow-y-auto px-5 pb-24 pt-4 sm:px-8">
        <div class="flex items-center gap-2 text-sm">
          <button type="button" class="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900" @click="closeForm"><ChevronLeft class="h-4 w-4 rounded-sm border border-zinc-400" />智能体管理</button>
          <span class="text-zinc-300">›</span>
          <strong class="font-semibold text-zinc-900">{{ pageTitle }}</strong>
        </div>

        <div role="tablist" aria-label="创建步骤" class="mx-auto mt-8 flex max-w-[620px] items-center overflow-x-auto pb-1">
          <template v-for="(step, index) in steps" :key="step">
            <button role="tab" type="button" :aria-selected="activeStep === index + 1" class="flex shrink-0 items-center gap-2 text-sm" :class="activeStep === index + 1 ? 'font-semibold text-zinc-900' : index + 1 < activeStep ? 'text-zinc-600' : 'text-zinc-400'" @click="activeStep = index + 1">
              <span class="grid h-6 w-6 place-items-center rounded-full text-xs" :class="index + 1 <= activeStep ? 'bg-[#2d7bf0] text-white' : 'bg-zinc-100 text-zinc-500'">
                <Check v-if="index + 1 < activeStep" class="h-3.5 w-3.5" />
                <span v-else>{{ index + 1 }}</span>
              </span>{{ step }}
            </button>
            <span v-if="index < steps.length - 1" class="mx-3 h-px min-w-12 flex-1" :class="index + 1 < activeStep ? 'bg-[#2d7bf0]' : 'bg-zinc-200'" />
          </template>
        </div>

        <section class="mx-auto mt-6 max-w-[800px]">
          <div v-if="activeStep === 1" class="space-y-7">
            <section>
              <h2 class="text-lg font-semibold">基础信息</h2>
              <label class="mt-3 block text-sm font-medium">智能体图标 <b class="text-red-500">*</b></label>
              <div class="mt-2 flex items-center gap-3">
                <button type="button" class="grid h-[52px] w-[52px] place-items-center overflow-hidden rounded-xl bg-[#4aa3ff] text-white" aria-label="上传图标" @click="avatarInput?.click()">
                  <img v-if="draft.avatar" :src="draft.avatar" alt="智能体图标" class="h-full w-full object-cover" /><Send v-else class="h-7 w-7" />
                </button>
                <p class="max-w-[510px] text-xs leading-5 text-zinc-400">支持 JPG、PNG、SVG 格式，建议1:1正方形比例，分辨率不低于128x128px，文件大小不超过2MB</p>
                <input ref="avatarInput" class="hidden" type="file" accept=".jpg,.jpeg,.png,.svg,.webp" @change="handleAvatar" />
              </div>

              <div class="mt-5 grid gap-4 sm:grid-cols-[1fr_80px]">
                <label class="block text-sm font-medium">名称 <b class="text-red-500">*</b>
                  <span class="relative mt-2 block"><input v-model="draft.name" maxlength="50" class="h-10 w-full rounded-lg border border-zinc-200 px-3 pr-14 text-sm outline-none focus:border-zinc-400" placeholder="请输入智能体名称" /><small class="absolute right-3 top-3 text-zinc-300">{{ draft.name.length }}/50</small></span>
                </label>
                <label class="block text-sm font-medium">版本
                  <input v-model.number="draft.version" type="number" min="1" class="mt-2 h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none" />
                </label>
              </div>

              <label class="mt-5 block text-sm font-medium">分类 <b class="text-red-500">*</b>
                <select v-model="draft.category" class="mt-2 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none"><option v-for="category in categories" :key="category">{{ category }}</option></select>
              </label>
              <label class="mt-5 block text-sm font-medium">简介 <b class="text-red-500">*</b>
                <span class="relative mt-2 block"><textarea v-model="draft.description" maxlength="200" rows="4" class="w-full resize-none rounded-lg border border-zinc-200 p-3 pb-8 text-sm outline-none focus:border-zinc-400" placeholder="简短描述它的功能..." /><small class="absolute bottom-3 right-3 text-zinc-300">{{ draft.description.length }} / 200</small></span>
              </label>
            </section>

            <section class="border-t border-zinc-100 pt-5">
              <h2 class="text-lg font-semibold">发布设置</h2>
              <div class="mt-4 flex items-center justify-between gap-4">
                <div><div class="text-sm font-medium">发布为模版</div><p class="mt-1 text-xs text-zinc-400">发布后，该智能体会显示在“发现模版”中，供他人复制使用（保存后生效）。</p></div>
                <button type="button" role="switch" :aria-checked="draft.publishTemplate" class="relative h-5 w-9 rounded-full transition" :class="draft.publishTemplate ? 'bg-[#171717]' : 'bg-zinc-200'" @click="draft.publishTemplate = !draft.publishTemplate"><i class="absolute top-0.5 h-4 w-4 rounded-full bg-white transition" :class="draft.publishTemplate ? 'left-[18px]' : 'left-0.5'" /></button>
              </div>
            </section>

            <section class="border-t border-zinc-100 pt-5">
              <h2 class="text-lg font-semibold">模型配置</h2>
              <label class="mt-4 block text-sm font-medium">基座模型 <b class="text-red-500">*</b><select v-model="draft.model" class="mt-2 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none"><option value="">请从列表中选择模型</option><option v-for="model in models" :key="model">{{ model }}</option></select></label>
              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <button v-for="item in [{ key: 'react', title: '任务规划与执行（ReAct）', desc: '允许智能体将复杂问题拆解为步骤' }, { key: 'chainOfThought', title: '深度思维链（Chain of Thought）', desc: '回答前进行逐步逻辑推导' }]" :key="item.key" type="button" class="rounded-lg border border-zinc-200 p-3 text-left" @click="(draft as any)[item.key] = !(draft as any)[item.key]"><span class="flex items-center justify-between text-sm font-medium">{{ item.title }}<i class="h-4 w-7 rounded-full" :class="(draft as any)[item.key] ? 'bg-[#171717]' : 'bg-zinc-200'" /></span><small class="mt-1 block text-zinc-400">{{ item.desc }}</small></button>
              </div>
            </section>
          </div>

          <div v-else-if="activeStep === 2">
            <div class="rounded-xl border border-zinc-200 p-4">
              <div class="flex items-center justify-between"><h2 class="font-semibold">角色设定</h2><div class="flex gap-3 text-zinc-400"><WandSparkles class="h-4 w-4" /><Copy class="h-4 w-4" /></div></div>
              <textarea v-model="draft.rolePrompt" class="mt-3 h-[390px] w-full resize-none text-sm leading-7 outline-none" placeholder="你是一个专业的助手，请遵循以下规则..." />
              <div class="flex items-center justify-end gap-3 text-xs text-zinc-500"><button type="button" role="switch" :aria-checked="draft.markdown" class="h-4 w-7 rounded-full" :class="draft.markdown ? 'bg-[#171717]' : 'bg-zinc-200'" @click="draft.markdown = !draft.markdown" />Markdown渲染 <span>{{ draft.rolePrompt.length }} chars</span></div>
            </div>
          </div>

          <div v-else-if="activeStep === 3" class="space-y-7">
            <section>
              <div class="flex items-center justify-between"><div><h2 class="text-lg font-semibold">知识库</h2><p class="mt-1 text-xs text-zinc-400">关联文档以增强回答能力</p></div><label class="flex items-center gap-2 text-sm">严格模式<input v-model="draft.strictKnowledge" type="checkbox" /></label></div>
              <label class="mt-4 flex h-10 items-center rounded-lg border border-zinc-200 px-3"><Search class="mr-2 h-4 w-4 text-zinc-400" /><input class="flex-1 text-sm outline-none" placeholder="搜索文档名称..." /></label>
              <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <button v-for="doc in knowledgeDocs" :key="doc.name" type="button" class="flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left" :class="draft.selectedDocs.includes(doc.name) ? 'border-blue-400 bg-blue-50/40' : 'border-zinc-200'" @click="toggleArray(draft.selectedDocs, doc.name)"><span class="grid h-9 w-9 shrink-0 place-items-center rounded bg-blue-500 text-[10px] font-bold text-white">{{ doc.kind }}</span><span class="min-w-0 flex-1"><b class="block truncate text-sm font-medium">{{ doc.name }}</b><small class="text-zinc-400">{{ doc.size }}　<span class="text-blue-400">{{ doc.scope }}</span></small></span><input type="checkbox" :checked="draft.selectedDocs.includes(doc.name)" tabindex="-1" /></button>
              </div>
            </section>
            <section>
              <div class="flex items-center justify-between"><div><h2 class="text-lg font-semibold">工具箱</h2><p class="mt-1 text-xs text-zinc-400">拓展智能体的操作能力</p></div><button type="button" class="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm"><Plus class="h-4 w-4" />添加技能</button></div>
              <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><button v-for="tool in tools" :key="tool.name" type="button" class="rounded-xl border p-3 text-left" :class="draft.selectedTools.includes(tool.name) ? 'border-blue-400 bg-blue-50/40' : 'border-zinc-200'" @click="toggleArray(draft.selectedTools, tool.name)"><span class="flex justify-between"><b class="text-sm">{{ tool.name }}</b><input type="checkbox" :checked="draft.selectedTools.includes(tool.name)" tabindex="-1" /></span><small class="mt-1 block text-blue-500">{{ tool.category }}</small><p class="mt-2 line-clamp-2 text-xs text-zinc-400">{{ tool.description }}</p></button></div>
            </section>
          </div>

          <div v-else class="min-h-[450px]">
            <div class="flex items-center justify-between"><div><h2 class="text-lg font-semibold">用户剧本</h2><p class="mt-1 text-xs text-zinc-400">编排复杂的对话流程</p></div><button type="button" class="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm font-medium" @click="notify('已新建空白剧本')"><CirclePlus class="h-4 w-4" />新建剧本</button></div>
            <div class="grid min-h-[320px] place-items-center text-center"><div><FileText class="mx-auto h-12 w-12 text-zinc-500" /><p class="mt-4 text-sm font-semibold">暂无预设剧本</p><p class="mt-1 text-xs text-zinc-400">点击右上角“新建剧本”开始添加</p></div></div>
          </div>
        </section>

        <footer class="fixed bottom-16 left-0 right-0 z-10 mx-auto flex min-h-20 items-center justify-between bg-white/95 px-5 backdrop-blur sm:px-8 md:bottom-0">
          <div class="mx-auto flex w-full max-w-[800px] items-center justify-between">
          <div class="flex items-center gap-3">
            <button type="button" class="grid h-8 w-8 place-items-center text-zinc-600" aria-label="导出" @click="exportConfig"><Upload class="h-4 w-4" /></button>
            <button type="button" class="grid h-8 w-8 place-items-center text-zinc-600" aria-label="导入" @click="importInput?.click()"><Download class="h-4 w-4" /></button>
            <input ref="importInput" class="hidden" type="file" accept="application/json" @change="importConfig" />
          </div>
          <div class="flex gap-3">
            <button v-if="activeStep > 1" type="button" class="h-10 rounded-lg border border-zinc-200 px-5 text-sm font-medium hover:bg-zinc-50" @click="activeStep--">上一步</button>
            <button v-if="activeStep < 4" type="button" class="h-10 rounded-lg bg-[#171717] px-5 text-sm font-medium text-white hover:bg-black" @click="nextStep">下一步：{{ steps[activeStep] }}</button>
            <button v-else type="button" class="h-10 rounded-lg bg-[#171717] px-5 text-sm font-medium text-white hover:bg-black" @click="saveAgent">保存配置</button>
          </div>
          </div>
        </footer>
      </main>
    </template>

    <Transition enter-active-class="transition duration-200" enter-from-class="-translate-y-2 opacity-0" leave-active-class="transition duration-150" leave-to-class="opacity-0">
      <div v-if="toast" class="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm shadow-xl">{{ toast }}</div>
    </Transition>
    <ResourcePermissionDialog
      v-if="permissionTarget"
      :resource-name="permissionTarget.name"
      resource-kind="智能体"
      :initial-members="permissionMembers[permissionTarget.id]"
      @close="permissionTarget = null"
      @save="savePermissions"
    />
  </div>
</template>
