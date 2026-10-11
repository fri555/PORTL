<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ArrowLeft,
  BookOpen,
  CheckSquare,
  FileText,
  Menu,
  MoreHorizontal,
  Plus,
  Settings2,
  Search,
  Upload,
  X,
} from 'lucide-vue-next'
import ResourcePermissionDialog, { type PermissionMember } from '@/components/common/ResourcePermissionDialog.vue'

interface KnowledgeBase {
  id: number
  name: string
  owner: string
  docs: string[]
  createdAt: string
  visitedAt: string
  space?: 'public' | 'personal'
}

const query = ref('')
const createOpen = ref(false)
const sidebarOpen = ref(false)
const selected = ref<KnowledgeBase | null>(null)
const newName = ref('')
const qaOpen = ref(false)
const qaInput = ref('')
const qaMessages = ref<{role: 'user'|'assistant', content: string}[]>([
  { role: 'assistant', content: '你好！我是小智，基于知识库的智能问答助手。你可以问我关于知识库中的任何内容，我会帮你检索和分析相关信息。' },
])
const qaThinking = ref(false)

function sendQaMessage() {
  const text = qaInput.value.trim()
  if (!text) return
  qaMessages.value.push({ role: 'user', content: text })
  qaInput.value = ''
  qaThinking.value = true
  setTimeout(() => {
    qaThinking.value = false
    qaMessages.value.push({ role: 'assistant', content: `基于知识库检索，我找到了以下相关信息：\n\n**1. 日常办公知识库** 中有相关内容涉及该问题的处理流程。\n\n**2. 集团制度** 中有明确的规定说明。\n\n建议参考以上知识库获取详细信息。如需进一步分析，请继续提问。` })
  }, 2000)
}
const createTitle = ref('新建知识库')
const notice = ref('')
const actionMenuId = ref<number | null>(null)
const permissionTarget = ref<KnowledgeBase | null>(null)
const permissionMembers = ref<Record<number, PermissionMember[]>>({})
const bases = ref<KnowledgeBase[]>([
  { id: 1, name: '日常办公知识库', owner: '朝暮', docs: [], createdAt: '2026-08-20 10:00:00', visitedAt: '2026-08-26 16:30:00' },
  { id: 2, name: '总裁办', owner: '朝暮', docs: [], createdAt: '2026-08-18 09:00:00', visitedAt: '2026-08-25 14:00:00' },
  { id: 3, name: '行政部', owner: '朝暮', docs: [], createdAt: '2026-08-18 09:10:00', visitedAt: '2026-08-24 11:00:00' },
  { id: 4, name: '数字技术中心', owner: '朝暮', docs: [], createdAt: '2026-08-17 14:00:00', visitedAt: '2026-08-26 09:00:00' },
  { id: 5, name: '视觉部', owner: '朝暮', docs: [], createdAt: '2026-08-17 14:30:00', visitedAt: '2026-08-23 16:00:00' },
  { id: 6, name: '人力资源中心', owner: '朝暮', docs: [], createdAt: '2026-08-16 10:00:00', visitedAt: '2026-08-22 10:00:00' },
  { id: 7, name: '电商产业园', owner: '朝暮', docs: [], createdAt: '2026-08-15 11:00:00', visitedAt: '2026-08-21 15:00:00' },
  { id: 8, name: '财务管理中心', owner: '朝暮', docs: [], createdAt: '2026-08-15 11:30:00', visitedAt: '2026-08-26 08:00:00' },
  { id: 9, name: 'B2C线下', owner: '朝暮', docs: [], createdAt: '2026-08-14 09:00:00', visitedAt: '2026-08-20 14:00:00' },
  { id: 10, name: '集团制度', owner: '朝暮', docs: [], createdAt: '2026-08-06 22:02:24', visitedAt: '2026-08-19 10:00:00' },
  { id: 11, name: '直播部', owner: '朝暮', docs: [], createdAt: '2026-08-06 21:44:07', visitedAt: '2026-08-18 16:00:00' },
  { id: 12, name: '商品部', owner: '朝暮', docs: [], createdAt: '2026-08-06 21:44:01', visitedAt: '2026-08-17 09:00:00' },
  { id: 13, name: '平台部', owner: '朝暮', docs: [], createdAt: '2026-08-06 21:43:54', visitedAt: '2026-08-16 14:00:00' },
  { id: 14, name: 'B2C线上', owner: '朝暮', docs: [], createdAt: '2026-08-06 21:43:17', visitedAt: '2026-08-15 11:00:00' },
  { id: 15, name: '组货专家知识库', owner: '朝暮', docs: [], createdAt: '2026-08-06 21:42:16', visitedAt: '2026-08-14 10:00:00' },
])

const visibleBases = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return keyword ? bases.value.filter((item) => item.name.toLowerCase().includes(keyword)) : bases.value
})

function createBase() {
  const name = newName.value.trim()
  if (!name) return
  bases.value.unshift({ id: Date.now(), name, owner: '当前用户', docs: [], createdAt: '刚刚', visitedAt: '刚刚' })
  newName.value = ''
  createOpen.value = false
}

function openPermissions(item: KnowledgeBase) {
  actionMenuId.value = null
  permissionTarget.value = item
}

function savePermissions(members: PermissionMember[]) {
  if (!permissionTarget.value) return
  permissionMembers.value[permissionTarget.value.id] = members
  notice.value = `${permissionTarget.value.name}的权限设置已保存并同步到检索链路`
}

function renameBase(item: KnowledgeBase) {
  actionMenuId.value = null
  selected.value = item
  notice.value = `已进入“${item.name}”详情，可在详情中修改名称`
}

function deleteBase(item: KnowledgeBase) {
  actionMenuId.value = null
  bases.value = bases.value.filter((entry) => entry.id !== item.id)
  notice.value = `已删除：${item.name}`
}
</script>

<template>
  <main class="relative min-h-[calc(100vh-57px)] overflow-hidden bg-white text-[#111]" data-testid="knowledge-main-pane">
    <aside
      v-if="sidebarOpen"
      class="absolute inset-y-0 left-0 z-20 w-[250px] border-r border-[#ececec] bg-white px-4 py-5 shadow-[10px_0_30px_rgba(0,0,0,.04)]"
      data-testid="knowledge-tree-panel"
    >
      <div class="flex items-center justify-between" data-testid="knowledge-sidebar-subheader">
        <span class="text-sm font-semibold">知识中心</span>
        <button aria-label="折叠侧边栏" class="rounded-md p-1.5 hover:bg-[#f5f5f5]" @click="sidebarOpen = false"><X class="h-4 w-4" /></button>
      </div>
      <button class="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#111] py-2.5 text-sm text-white" @click="createOpen = true"><Plus class="h-4 w-4" />新建知识库</button>
      <div class="relative mt-4">
        <Search class="absolute left-3 top-2.5 h-4 w-4 text-[#999]" />
        <input v-model="query" class="h-9 w-full rounded-lg border border-[#e3e3e3] pl-9 pr-3 text-sm outline-none" placeholder="搜索知识库" />
      </div>
      <div class="mt-5 space-y-1">
        <button v-for="item in bases" :key="item.id" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#555] hover:bg-[#f6f6f6]" @click="selected = item; sidebarOpen = false">
          <BookOpen class="h-4 w-4 text-[#4a8ff7]" />{{ item.name }}
        </button>
      </div>
    </aside>

    <section class="px-8 py-4">
      <template v-if="!selected">
        <div class="flex items-center gap-0.5" data-testid="knowledge-main-header">
          <button aria-label="展开知识库导航" class="grid h-8 w-8 place-items-center rounded-lg hover:bg-[#f5f5f5]" @click="sidebarOpen = true"><Menu class="h-[18px] w-[18px]" /></button>
          <button aria-label="搜索知识库" class="grid h-8 w-8 place-items-center rounded-lg hover:bg-[#f5f5f5]" @click="sidebarOpen = true"><Search class="h-[18px] w-[18px]" /></button>
          <button aria-label="新建知识库" class="grid h-8 w-8 place-items-center rounded-lg hover:bg-[#f5f5f5]" @click="createTitle = '新建知识库'; createOpen = true"><Plus class="h-[19px] w-[19px]" /></button>
          <h1 class="ml-1.5 text-lg font-semibold">全部知识库</h1>
          <div class="ml-auto flex items-center gap-3" data-testid="knowledge-action-row">
            <button aria-label="上传文件" class="flex h-8 w-28 items-center justify-center gap-2 rounded-lg bg-[#111] text-sm text-white hover:bg-[#2b2b2b]" @click="notice = '已进入上传任务'"><Upload class="h-4 w-4" />上传文件</button>
            <button class="flex h-8 w-[126px] items-center justify-center gap-2 rounded-lg bg-white text-sm shadow-[#d3d3d3_0_0_0_1px_inset] hover:bg-[#fafafa]" @click="createTitle = '新建文件夹'; createOpen = true"><Plus class="h-4 w-4" />新建文件夹</button>
            <button aria-label="小智问答" class="flex h-8 w-28 items-center justify-center gap-2 rounded-lg bg-white text-sm shadow-[#d3d3d3_0_0_0_1px_inset] hover:bg-[#fafafa]" @click="qaOpen = true">小智问答</button>
          </div>
        </div>

        <div v-if="notice" class="mt-4 rounded-lg bg-[#f5f7fb] px-4 py-2 text-sm text-[#555]">{{ notice }}</div>

        <div class="mt-2 overflow-hidden">
          <div class="grid grid-cols-[minmax(240px,1fr)_165px_214px_214px_44px] border-b border-[#e9e9e9] px-3 py-3 text-sm text-[#777]">
            <span>名称</span><span>所有者</span><span>创建时间</span><span>最近访问</span><span>操作</span>
          </div>
          <div
            v-for="item in visibleBases"
            :key="item.id"
            data-testid="knowledge-kb-card"
            class="grid min-h-[57px] w-full grid-cols-[minmax(240px,1fr)_165px_214px_214px_44px] items-center border-b border-[#ededed] px-3 text-left transition hover:bg-[#fafafa]"
          >
            <button type="button" class="flex min-w-0 items-center gap-3 text-[15px] font-medium" @click="selected = item">
              <span class="grid h-6 w-6 shrink-0 place-items-center rounded-[4px] bg-[#4c94f6] text-white"><BookOpen class="h-4 w-4" /></span>
              <span class="truncate">{{ item.name }}</span>
            </button>
            <span class="text-sm text-[#777]">{{ item.owner }}</span>
            <span class="text-sm text-[#777]">{{ item.createdAt }}</span>
            <span class="text-sm text-[#777]">{{ item.visitedAt }}</span>
            <span class="relative">
              <button type="button" :aria-label="`${item.name}操作菜单`" class="grid h-8 w-8 place-items-center rounded-lg text-[#aaa] hover:bg-[#f1f1f1]" @click.stop="actionMenuId = actionMenuId === item.id ? null : item.id"><MoreHorizontal class="h-4 w-4" /></button>
              <div v-if="actionMenuId === item.id" role="menu" class="absolute right-0 top-9 z-30 w-32 rounded-lg border border-[#e5e5e5] bg-white p-1 shadow-xl">
                <button type="button" role="menuitem" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs hover:bg-[#f6f6f6]" @click.stop="renameBase(item)">重命名</button>
                <button v-if="item.space !== 'personal'" type="button" role="menuitem" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs hover:bg-[#f6f6f6]" @click.stop="openPermissions(item)"><Settings2 class="h-3.5 w-3.5" />权限设置</button>
                <button type="button" role="menuitem" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-red-600 hover:bg-red-50" @click.stop="deleteBase(item)">删除</button>
              </div>
            </span>
          </div>
          <div v-if="!visibleBases.length" class="py-20 text-center text-sm text-[#999]">没有匹配的知识库</div>
        </div>
      </template>

      <template v-else>
        <div class="flex items-center gap-3" data-testid="knowledge-main-header">
          <button aria-label="返回全部知识库" class="grid h-8 w-8 place-items-center rounded-lg hover:bg-[#f5f5f5]" @click="selected = null"><ArrowLeft class="h-[18px] w-[18px]" /></button>
          <div>
            <h1 class="text-lg font-semibold">{{ selected.name }}</h1>
            <p class="mt-0.5 text-xs text-[#999]">所有者：{{ selected.owner }} · {{ selected.docs.length }} 个文件</p>
          </div>
          <button aria-label="上传文件" class="ml-auto flex items-center gap-2 rounded-lg bg-[#111] px-4 py-2 text-sm text-white"><Upload class="h-4 w-4" />上传文件</button>
        </div>

        <div class="mt-7 overflow-hidden rounded-xl border border-[#ebebeb]">
          <div class="grid grid-cols-[minmax(280px,1fr)_120px_140px] bg-[#f7f7f8] px-5 py-3 text-sm text-[#777]">
            <span>文件名</span><span>状态</span><span>更新时间</span>
          </div>
          <div v-for="doc in selected.docs" :key="doc" data-testid="knowledge-file-card" class="grid min-h-[58px] grid-cols-[minmax(280px,1fr)_120px_140px] items-center border-t border-[#ededed] px-5 text-sm">
            <span class="flex items-center gap-3"><FileText class="h-5 w-5 text-[#4c94f6]" />{{ doc }}</span>
            <span class="text-emerald-600">已索引</span>
            <span class="text-[#888]">2026-08-11</span>
          </div>
          <div v-if="!selected.docs.length" class="py-20 text-center text-sm text-[#999]">暂无文件，点击右上角上传</div>
        </div>
      </template>
    </section>

    <Teleport to="body">
      <div v-if="createOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4" @click.self="createOpen = false">
        <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">{{ createTitle }}</h2>
            <button aria-label="关闭新建知识库" @click="createOpen = false"><X class="h-4 w-4" /></button>
          </div>
          <label class="mt-6 block text-sm text-[#555]">知识库名称
            <input v-model="newName" autofocus class="mt-2 h-10 w-full rounded-lg border border-[#ddd] px-3 outline-none focus:border-[#999]" placeholder="请输入知识库名称" @keydown.enter="createBase" />
          </label>
          <div class="mt-6 flex justify-end gap-3">
            <button class="rounded-lg border border-[#ddd] px-4 py-2 text-sm" @click="createOpen = false">取消</button>
            <button class="rounded-lg bg-[#111] px-4 py-2 text-sm text-white disabled:bg-[#ccc]" :disabled="!newName.trim()" @click="createBase">创建</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 小智问答侧边面板 -->
    <aside
      v-if="qaOpen"
      class="absolute inset-y-0 right-0 z-30 flex w-[360px] flex-col border-l border-[#eaeaea] bg-white"
      data-testid="knowledge-xz-panel"
    >
      <!-- 头部 -->
      <div class="flex h-16 shrink-0 items-center justify-between px-4 pl-6">
        <div class="flex items-center gap-2">
          <span class="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-white">
            <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none"><path d="M8 2L10 6L14 6.5L11 9.5L12 14L8 11.5L4 14L5 9.5L2 6.5L6 6L8 2Z" fill="currentColor"/></svg>
          </span>
          <h2 class="text-base font-semibold text-[#111]">小智问答</h2>
        </div>
        <button type="button" class="grid h-8 w-8 place-items-center rounded-lg text-[#666] hover:bg-[#f5f5f5]" aria-label="关闭小智问答" @click="qaOpen = false">
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- 对话区 -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        <div class="space-y-4">
          <div v-for="(msg, i) in qaMessages" :key="i" :class="msg.role === 'user' ? 'flex justify-end' : ''">
            <div
              v-if="msg.role === 'user'"
              class="max-w-[80%] rounded-[16px] rounded-tr-none bg-[#f0f6ff] px-3 py-2 text-[14px] leading-[26px] text-[#111]"
            >{{ msg.content }}</div>
            <div v-else class="max-w-[90%]">
              <!-- 执行链 -->
              <button
                v-if="i === qaMessages.length - 1 && msg.role === 'assistant'"
                type="button"
                class="mb-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-[12.25px] text-[#888] hover:bg-zinc-100"
              >
                <span>执行链 3</span>
                <svg class="h-3 w-3" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <div class="text-[12.25px] leading-[22px] text-[#0a0a0a] whitespace-pre-wrap">{{ msg.content }}</div>
            </div>
          </div>
          <!-- 加载中 -->
          <div v-if="qaThinking" class="flex items-center gap-2 text-[12.25px] text-[#888]">
            <span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#ccc] border-t-[#6366f1]" />
            回答生成中...
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="shrink-0 border-t border-[#f0f0f0] px-6 py-3">
        <div class="flex items-end gap-2">
          <textarea
            v-model="qaInput"
            rows="2"
            class="flex-1 resize-none rounded-lg border border-[#e5e5e5] px-3 py-2 text-[12.25px] leading-[20px] outline-none placeholder:text-[#bbb] focus:border-[#6366f1]"
            placeholder="输入你的问题..."
            @keydown.enter.ctrl="sendQaMessage()"
          />
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-white transition hover:opacity-90"
            :disabled="!qaInput.trim() || qaThinking"
            @click="sendQaMessage()"
          >
            <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none"><path d="M2 14L14 8L2 2V7L10 8L2 9V14Z" fill="currentColor"/></svg>
          </button>
        </div>
        <p class="mt-1.5 text-center text-[11px] text-[#999]">内容由 AI 生成，请核实重要信息</p>
      </div>
    </aside>

    <ResourcePermissionDialog
      v-if="permissionTarget"
      :resource-name="permissionTarget.name"
      resource-kind="知识库"
      :initial-members="permissionMembers[permissionTarget.id]"
      @close="permissionTarget = null"
      @save="savePermissions"
    />

    <!-- 任务中心浮动按钮 -->
    <button
      type="button"
      class="fixed bottom-6 right-4 z-40 grid h-8 w-8 place-items-center rounded-full bg-white shadow-[1px_3px_6px_rgba(0,0,0,0.16)] text-[#555] hover:bg-[#f7f7f7]"
      aria-label="任务中心"
    >
      <CheckSquare class="h-4 w-4" />
    </button>
  </main>
</template>
