<script setup lang="ts">
import { ref, computed } from 'vue'
import { useModuleSidebar } from '@/composables/useModuleSidebar'
import {
  Activity,
  ArrowUpRight,
  Blocks,
  Boxes,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LayoutList,
  LayoutGrid,
  ListTodo,
  PackageCheck,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
} from 'lucide-vue-next'

const searchQuery = ref('')
const { isMobile, sidebarOpen, closeMobileSidebar } = useModuleSidebar()
const merchandiseExpanded = ref(true)
const sectionEntries = {
  all: { label: '系统入口', names: [] as string[] },
  todos: { label: '待办管理', names: ['售后工单', '需求管理系统'] },
  query: { label: '商品综合查询', names: ['天马运动', '大库存'] },
  replenishment: { label: '现货补货', names: ['天马运动', '新零售', '大库存'] },
  orders: { label: '期货订货', names: ['天马运动', '【自营】订单系统'] },
}
type PortalSection = keyof typeof sectionEntries
const selectedSection = ref<PortalSection>('all')
const sectionTitle = computed(() =>
  selectedSection.value === 'all'
    ? '系统入口'
    : `${sectionEntries[selectedSection.value].label} · 系统入口`,
)

function selectSection(section: PortalSection) {
  selectedSection.value = section
  searchQuery.value = ''
  closeMobileSidebar()
}

const dingTalkApplicationUrl =
  'dingtalk://dingtalkclient/action/openapp?app_id=-4&container_type=work_platform&corpid=dingaed79d9c350e396c35c2f4657eb6378f&ddtab=true&redirect_type=jump&redirect_url=https%3A%2F%2Faflow.dingtalk.com%2Fdingtalk%2Fmobile%2Fhomepage.htm%3Fbackcontrol%3Dfalse%26corpid%3Ddingaed79d9c350e396c35c2f4657eb6378f%26dd_progress%3Dfalse%26dd_share%3Dfalse%26ddtab%3Dtrue%26showmenu%3Dfalse%23%2Fcustom%3Fpcredirect%3Dself%26processCode%3DPROC-0E4D5BC5-026C-456D-8FEB-274184F6A3C8'
const portals = [
  {
    name: '工作台',
    tag: '常用',
    tagColor: 'bg-[#eff6ff] text-[#0066ff]',
    description: '集团统一工作台',
    url: '#',
    hasAccess: true,
    icon: LayoutDashboard,
    iconColor: 'bg-[#1684ff]',
  },
  {
    name: 'AI大模型',
    tag: '经营管理',
    tagColor: 'bg-[#f3fdc4] text-[#8dad00]',
    description: 'AI大模型问答',
    url: '#',
    hasAccess: true,
    icon: Sparkles,
    iconColor: 'bg-[#18a8d5]',
  },
  {
    name: '天马运动',
    tag: '经营管理',
    tagColor: 'bg-[#f3fdc4] text-[#8dad00]',
    description: '一站式全渠道供应链平台',
    url: '#',
    hasAccess: false,
    icon: Activity,
    iconColor: 'bg-[#45bd72]',
  },
  {
    name: '耶运动-视觉内容中心',
    tag: '经营管理',
    tagColor: 'bg-[#f3fdc4] text-[#8dad00]',
    description: '',
    url: '#',
    hasAccess: false,
    icon: Clapperboard,
    iconColor: 'bg-[#ef5000]',
  },
  {
    name: '新零售',
    tag: '经营管理',
    tagColor: 'bg-[#f3fdc4] text-[#8dad00]',
    description: '流星马新零售',
    url: '#',
    hasAccess: true,
    icon: ShoppingBag,
    iconColor: 'bg-[#ffb345]',
  },
  {
    name: '【自营】订单系统',
    tag: '经营管理',
    tagColor: 'bg-[#f3fdc4] text-[#8dad00]',
    description: '',
    url: '#',
    hasAccess: true,
    icon: PackageCheck,
    iconColor: 'bg-[#087fff]',
  },
  {
    name: '第三方系统',
    tag: '经营管理',
    tagColor: 'bg-[#f3fdc4] text-[#8dad00]',
    description: '',
    url: '#',
    hasAccess: false,
    icon: Blocks,
    iconColor: 'bg-[#ef5000]',
  },
  {
    name: '售后工单',
    tag: '经营管理',
    tagColor: 'bg-[#f3fdc4] text-[#8dad00]',
    description: '',
    url: '#',
    hasAccess: true,
    icon: ClipboardList,
    iconColor: 'bg-[#ffb345]',
  },
  {
    name: '大库存',
    tag: '经营管理',
    tagColor: 'bg-[#f3fdc4] text-[#8dad00]',
    description: '',
    url: '#',
    hasAccess: false,
    icon: Boxes,
    iconColor: 'bg-[#ee5b91]',
  },
  {
    name: '新运营',
    tag: '经营管理',
    tagColor: 'bg-[#f3fdc4] text-[#8dad00]',
    description: '',
    url: '#',
    hasAccess: true,
    icon: Store,
    iconColor: 'bg-[#45bd72]',
  },
  {
    name: '需求管理系统',
    tag: '项目管理',
    tagColor: 'bg-[#fff5f0] text-[#e07030]',
    description: '',
    url: '#',
    hasAccess: false,
    icon: ListTodo,
    iconColor: 'bg-[#ee5b91]',
  },
]

const filteredPortals = computed(() => {
  const entries =
    selectedSection.value === 'all'
      ? portals
      : portals.filter((p) => sectionEntries[selectedSection.value].names.includes(p.name))
  if (!searchQuery.value.trim()) return entries
  const q = searchQuery.value.toLowerCase()
  return entries.filter(
    (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
  )
})
</script>

<template>
  <div class="flex min-h-[calc(100vh-56px)] bg-[#f8f9fb] max-[720px]:flex-col">
    <button v-if="isMobile && sidebarOpen" type="button" class="sidebar-backdrop" aria-label="关闭侧边栏" @click="closeMobileSidebar" />
    <aside v-if="sidebarOpen" class="workbench-sidebar w-[270px] shrink-0 px-4 pt-[14px]">
      <nav aria-label="工作台" class="space-y-0.5 text-sm text-[#333]">
        <button
          type="button"
          :aria-current="selectedSection === 'all' ? 'page' : undefined"
          class="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left outline-none hover:bg-[#eceef1] focus-visible:ring-2 focus-visible:ring-[#bfc4cd]"
          :class="{ 'bg-[#eceef1] font-medium text-[#16181b]': selectedSection === 'all' }"
          @click="selectSection('all')"
        >
          <LayoutGrid :size="17" :stroke-width="1.7" />
          系统入口
        </button>
        <button
          type="button"
          :aria-current="selectedSection === 'todos' ? 'page' : undefined"
          class="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left outline-none hover:bg-[#eceef1] focus-visible:ring-2 focus-visible:ring-[#bfc4cd]"
          :class="{ 'bg-[#eceef1] font-medium text-[#16181b]': selectedSection === 'todos' }"
          @click="selectSection('todos')"
        >
          <ClipboardCheck :size="17" :stroke-width="1.7" />
          <span class="flex-1">待办管理</span>
          <ChevronRight :size="14" class="text-[#999]" />
        </button>
        <button
          type="button"
          :aria-current="selectedSection === 'query' ? 'page' : undefined"
          class="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left outline-none hover:bg-[#eceef1] focus-visible:ring-2 focus-visible:ring-[#bfc4cd]"
          :class="{ 'bg-[#eceef1] font-medium text-[#16181b]': selectedSection === 'query' }"
          @click="selectSection('query')"
        >
          <ShoppingBag :size="17" :stroke-width="1.7" />
          商品综合查询
        </button>
        <button
          type="button"
          aria-controls="merchandise-navigation"
          :aria-expanded="merchandiseExpanded"
          class="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left outline-none hover:bg-[#eceef1] focus-visible:ring-2 focus-visible:ring-[#bfc4cd]"
          @click="merchandiseExpanded = !merchandiseExpanded"
        >
          <LayoutList :size="17" :stroke-width="1.7" />
          <span class="flex-1">商品作业系统</span>
          <ChevronDown
            :size="14"
            class="text-[#999] transition-transform"
            :class="{ '-rotate-90': !merchandiseExpanded }"
          />
        </button>
        <div
          v-if="merchandiseExpanded"
          id="merchandise-navigation"
          class="ml-5 border-l border-[#e2e4e8] pl-6"
        >
          <button
            v-for="section in ['replenishment', 'orders'] as const"
            :key="section"
            type="button"
            :aria-current="selectedSection === section ? 'page' : undefined"
            class="flex h-[38px] w-full items-center rounded-lg px-2 text-left outline-none hover:bg-[#eceef1] focus-visible:ring-2 focus-visible:ring-[#bfc4cd]"
            :class="{ 'bg-[#eceef1] font-medium text-[#16181b]': selectedSection === section }"
            @click="selectSection(section)"
          >
            {{ sectionEntries[section].label }}
          </button>
        </div>
      </nav>
    </aside>

    <section
      aria-labelledby="system-portals-title"
      class="mb-3 mr-3 min-w-0 flex-1 rounded-2xl border border-[#e9ebee] bg-white px-6 pb-8 pt-10 max-md:ml-3 max-md:px-4 max-md:pt-6"
    >
      <div class="mb-8 flex items-center justify-between gap-6 max-lg:gap-4 max-md:flex-wrap">
        <div>
          <h1 id="system-portals-title" class="text-2xl font-semibold leading-8 text-[#111]">
            {{ sectionTitle }}
          </h1>
          <p class="mt-1.5 text-sm leading-5 text-[#999]">选择要进入的企业系统</p>
        </div>

        <div class="relative w-[300px] max-w-full max-md:w-full">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aaa]" />
          <input
            v-model="searchQuery"
            aria-label="搜索系统入口"
            type="search"
            placeholder="搜索系统入口"
            class="h-8 w-full rounded-full border border-[#e5e7eb] bg-white pl-9 pr-4 text-sm text-[#333] outline-none transition placeholder:text-[#b9bdc3] focus:border-[#aeb5bf] focus:ring-2 focus:ring-[#111]/5"
          />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4 max-xl:grid-cols-2 max-md:grid-cols-1">
        <article
          v-for="p in filteredPortals"
          :key="p.name"
          data-testid="system-portal-card"
          tabindex="0"
          class="group relative flex min-h-[80px] items-center gap-3 rounded-2xl border border-[#eceef1] bg-white px-4 py-4 text-left outline-none transition hover:border-[#dce0e5] hover:shadow-[0_3px_9px_rgba(0,0,0,0.035)] focus-visible:border-[#8a8a8a] focus-visible:ring-2 focus-visible:ring-[#111]/10"
        >
          <div
            class="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-white"
            :class="p.iconColor"
          >
            <component :is="p.icon" :size="23" :stroke-width="1.7" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex min-w-0 items-center gap-1.5 pr-1">
              <span class="truncate text-base font-medium leading-6 text-[#17181a]">{{
                p.name
              }}</span>
              <span
                class="shrink-0 rounded px-1 py-0.5 text-[11px] leading-4"
                :class="p.tagColor"
                >{{ p.tag }}</span
              >
            </div>
            <p v-if="p.description" class="mt-0.5 truncate text-xs leading-5 text-[#85888d]">
              {{ p.description }}
            </p>
          </div>
          <a
            v-if="p.hasAccess"
            data-testid="portal-enter"
            :href="p.url"
            class="portal-card-action absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded text-[#333] opacity-0 transition hover:bg-[#f3f4f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a8a8a] group-hover:opacity-100 group-focus:opacity-100 group-focus-within:opacity-100 max-md:opacity-100"
            :aria-label="`进入${p.name}`"
          >
            <span class="sr-only">进入</span>
            <ArrowUpRight :size="15" />
          </a>
          <a
            v-else
            data-testid="portal-apply-access"
            :href="dingTalkApplicationUrl"
            class="portal-card-action absolute right-3 top-3 inline-flex h-6 items-center rounded-md border border-[#111] bg-white px-2 text-xs text-[#111] opacity-0 transition hover:bg-[#f5f5f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a8a8a] group-hover:opacity-100 group-focus:opacity-100 group-focus-within:opacity-100 max-md:opacity-100"
            :aria-label="`申请${p.name}权限`"
            >申请</a
          >
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sidebar-backdrop{position:fixed;inset:56px 0 0;z-index:34;border:0;background:rgba(0,0,0,.2)}
@media(max-width:720px){.workbench-sidebar{position:fixed;left:0;top:56px;bottom:0;z-index:35;max-width:85vw;overflow-y:auto;background:#f8f9fb;box-shadow:8px 0 24px rgba(0,0,0,.08)}}
</style>
