<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ArrowLeft,
  BookOpen,
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
const createTitle = ref('新建知识库')
const notice = ref('')
const actionMenuId = ref<number | null>(null)
const permissionTarget = ref<KnowledgeBase | null>(null)
const permissionMembers = ref<Record<number, PermissionMember[]>>({})
const bases = ref<KnowledgeBase[]>([
  { id: 1, name: '集团制度', owner: '朝暮', docs: ['员工手册2026版.docx', '考勤管理制度_v3.pdf', '费用报销制度.pdf'], createdAt: '2026-08-06 22:02:24', visitedAt: '2026-08-06 22:02:24' },
  { id: 2, name: '直播部', owner: '朝暮', docs: ['直播复盘模板.docx', '直播排期与流程.xlsx'], createdAt: '2026-08-06 21:44:07', visitedAt: '2026-08-06 21:44:07' },
  { id: 3, name: '商品部', owner: '朝暮', docs: ['商品数据字典.xlsx', '新品上市资料.pdf'], createdAt: '2026-08-06 21:44:01', visitedAt: '2026-08-06 21:44:01' },
  { id: 4, name: '平台部', owner: '朝暮', docs: ['平台运营规范.pdf', '活动配置手册.docx'], createdAt: '2026-08-06 21:43:54', visitedAt: '2026-08-06 21:43:54' },
  { id: 5, name: 'B2C线上', owner: '朝暮', docs: ['线上活动复盘模板.docx', '会员触达规则.xlsx'], createdAt: '2026-08-06 21:43:17', visitedAt: '2026-08-06 21:43:17' },
  { id: 6, name: '组货专家知识库', owner: '朝暮', docs: ['组货规则说明.pdf', '商品组合案例.xlsx'], createdAt: '2026-08-06 21:42:16', visitedAt: '2026-08-06 21:42:16' },
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
            <button class="flex h-8 w-[126px] items-center justify-center gap-2 rounded-lg border border-[#ddd] text-sm hover:bg-[#fafafa]" @click="createTitle = '新建文件夹'; createOpen = true"><Plus class="h-4 w-4" />新建文件夹</button>
            <button aria-label="知识库问答" class="flex h-8 w-28 items-center justify-center gap-2 rounded-lg border border-[#ddd] text-sm hover:bg-[#fafafa]" @click="qaOpen = true">小智问答</button>
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

    <Teleport to="body">
      <div v-if="qaOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4" @click.self="qaOpen = false">
        <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
          <div class="flex items-center justify-between"><h2 class="text-lg font-semibold">小智问答</h2><button aria-label="关闭小智" @click="qaOpen = false"><X class="h-4 w-4" /></button></div>
          <p class="mt-2 text-sm text-[#888]">基于全部知识库进行智能问答与知识检索</p>
          <textarea class="mt-5 min-h-28 w-full resize-none rounded-xl border border-[#ddd] p-3 text-sm outline-none" placeholder="请输入你想了解的问题"></textarea>
          <div class="mt-4 flex justify-end"><button class="rounded-lg bg-[#111] px-4 py-2 text-sm text-white">开始问答</button></div>
        </div>
      </div>
    </Teleport>

    <ResourcePermissionDialog
      v-if="permissionTarget"
      :resource-name="permissionTarget.name"
      resource-kind="知识库"
      :initial-members="permissionMembers[permissionTarget.id]"
      @close="permissionTarget = null"
      @save="savePermissions"
    />
  </main>
</template>
