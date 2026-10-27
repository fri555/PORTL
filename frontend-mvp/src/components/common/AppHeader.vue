<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { CircleDollarSign, CircleHelp, LogOut, Menu, PanelLeft, Search, SquarePen, X } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const store = useAppStore()
const route = useRoute()
const router = useRouter()
const logo = `${import.meta.env.BASE_URL}assets/figma/tianma-logo.png`
const sourceAvatar = `${import.meta.env.BASE_URL}assets/production-home/user-avatar.jpg`
const workbenchLogo = `${import.meta.env.BASE_URL}assets/production-home/header-logo-workbench.png`
const isWorkbench = computed(() => route.path === '/portals')
const isVideo = computed(() => route.path.startsWith('/video-gen'))
const isChat = computed(() => route.path.startsWith('/chat') || route.path === '/agent-square')
const mobileNavOpen = ref(false)

const navItems = computed(() => [
  { label: '天马智擎', to: '/chat' },
  { label: '视频生成', to: '/video-gen/capability-square' },
  { label: '自动化', to: '/automation' },
  { label: '工作台', to: '/portals' },
  { label: '仪表盘', to: '/dashboards' },
  { label: '知识中心', to: '/knowledge' },
  ...(store.user?.role === 'admin' ? [{ label: '设置', to: '/settings/agents' }] : []),
])

const chatNavItems = computed(() => [
  { label: '天马智擎', to: '/chat' },
  { label: '视频生成', to: '/video-gen/capability-square' },
  { label: '自动化', to: '/automation' },
  { label: '工作台', to: '/portals' },
  { label: '仪表盘', to: '/dashboards' },
  { label: '知识中心', to: '/knowledge' },
  ...(store.user?.role === 'admin' ? [{ label: '设置', to: '/settings/agents' }] : []),
])

function dispatchChatAction(action: 'new' | 'search' | 'toggle-sidebar') {
  window.dispatchEvent(new CustomEvent('tianma:chat-action', { detail: action }))
}
function dispatchVideoSidebar() {
  window.dispatchEvent(new Event('tianma:video-sidebar'))
}

function logout() {
  store.logout()
  router.replace({ name: 'login' })
}

function openPersonalUsage() {
  router.push({ path: '/settings/usage', query: { scope: 'personal' } })
}
</script>

<template>
  <header class="sticky top-0 z-40 bg-[#fafbfc]">
    <div v-if="isChat" class="flex h-14 items-center px-3 min-[641px]:px-3 lg:px-4">
      <RouterLink to="/chat" data-testid="header-brand-anchor" class="grid h-7 w-7 shrink-0 place-items-center" aria-label="天马智擎首页">
        <img :src="workbenchLogo" alt="AI工作台" class="h-7 w-7 object-cover object-left" />
      </RouterLink>
      <div class="ml-4 hidden items-center gap-0.5 min-[720px]:flex">
        <button type="button" class="grid h-8 w-8 place-items-center rounded-lg text-[#333] hover:bg-[#f5f5f5]" aria-label="新建任务" @click="dispatchChatAction('new')"><SquarePen class="h-[17px] w-[17px] stroke-[1.7]" /></button>
        <button type="button" class="grid h-8 w-8 place-items-center rounded-lg text-[#333] hover:bg-[#f5f5f5]" aria-label="搜索会话" @click="dispatchChatAction('search')"><Search class="h-[17px] w-[17px] stroke-[1.7]" /></button>
        <button type="button" class="grid h-8 w-8 place-items-center rounded-lg text-[#333] hover:bg-[#f5f5f5]" aria-label="展开侧边栏" title="展开/收起侧边栏" @click="dispatchChatAction('toggle-sidebar')"><PanelLeft class="h-[17px] w-[17px] stroke-[1.7]" /></button>
      </div>
      <nav class="ml-8 hidden h-full items-center gap-5 min-[720px]:flex" aria-label="主导航">
        <RouterLink
          v-for="item in chatNavItems"
          :key="item.label"
          :to="item.to"
          class="flex h-8 items-center whitespace-nowrap text-[14px] font-normal text-[#111] no-underline"
          :class="route.path === item.to || (item.label === '天马智擎' && route.path.startsWith('/chat') && !route.params.sessionId) || (item.label === '设置' && route.path.startsWith('/settings')) ? '!font-medium' : ''"
        >
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="ml-auto flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button data-testid="header-user-anchor" class="grid h-8 w-8 place-items-center overflow-hidden rounded-full transition hover:ring-2 hover:ring-zinc-100" :aria-label="`${store.user?.displayName ?? '用户'} 的菜单`">
              <Avatar class="h-8 w-8"><AvatarImage :src="sourceAvatar" /><AvatarFallback class="text-xs">{{ store.user?.displayName?.[0] ?? '?' }}</AvatarFallback></Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-36">
            <DropdownMenuItem @select="openPersonalUsage"><CircleDollarSign class="mr-2 h-4 w-4" />我的用量</DropdownMenuItem>
            <DropdownMenuItem class="text-destructive focus:text-destructive" @select="logout"><LogOut class="mr-2 h-4 w-4" />退出登录</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    <template v-else-if="isVideo">
      <div class="flex h-14 items-center gap-5 px-4">
        <RouterLink to="/chat" class="shrink-0" aria-label="天马智擎首页"><img :src="workbenchLogo" alt="AI工作台" class="h-7 w-[106px] object-contain" /></RouterLink>
        <button class="ml-auto grid h-8 w-8 place-items-center rounded-lg hover:bg-[#edeef1] min-[1000px]:ml-[72px]" aria-label="展开或收起视频侧边栏" @click="dispatchVideoSidebar"><PanelLeft class="h-4 w-4" /></button>
        <nav class="hidden h-full items-center gap-7 min-[1000px]:flex" aria-label="主导航">
          <RouterLink v-for="item in navItems" :key="item.label" :to="item.to" class="flex items-center gap-1 whitespace-nowrap text-[14px] text-[#666]" :class="item.label === '视频生成' ? '!font-medium !text-black' : ''">{{ item.label }}<span v-if="item.label === '天马智擎'" class="rounded-full bg-[#00adf4] px-1.5 text-[10px] font-semibold italic text-white">AI Agent</span></RouterLink>
        </nav>
        <div class="ml-auto hidden min-[1000px]:block"></div>
        <DropdownMenu><DropdownMenuTrigger as-child><button data-testid="header-user-anchor" class="grid h-8 w-8 place-items-center overflow-hidden rounded-full" :aria-label="`${store.user?.displayName ?? '用户'} 的菜单`"><Avatar class="h-8 w-8"><AvatarImage :src="sourceAvatar" /><AvatarFallback>{{ store.user?.displayName?.[0] ?? '?' }}</AvatarFallback></Avatar></button></DropdownMenuTrigger><DropdownMenuContent align="end" class="w-36"><DropdownMenuItem @select="openPersonalUsage"><CircleDollarSign class="mr-2 h-4 w-4" />我的用量</DropdownMenuItem><DropdownMenuItem @select="logout"><LogOut class="mr-2 h-4 w-4" />退出登录</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        <button class="grid h-8 w-8 place-items-center min-[1000px]:hidden" aria-label="移动端导航" @click="mobileNavOpen = !mobileNavOpen"><X v-if="mobileNavOpen" class="h-[18px] w-[18px]" /><Menu v-else class="h-[18px] w-[18px]" /></button>
      </div>
      <nav v-if="mobileNavOpen" class="absolute left-0 right-0 top-14 border-b bg-white p-3 shadow-lg min-[1000px]:hidden" aria-label="移动端主导航"><RouterLink v-for="item in navItems" :key="item.label" :to="item.to" class="flex h-10 items-center rounded-lg px-3 text-sm" @click="mobileNavOpen = false">{{ item.label }}</RouterLink></nav>
    </template>
    <template v-else>
    <div class="flex h-14 items-center px-3 min-[641px]:px-3 lg:px-4">
      <RouterLink
        :to="{ name: 'home' }"
        data-testid="header-brand-anchor"
        id="chat-logo-home"
        class="flex shrink-0 items-center no-underline"
        aria-label="回到天马智擎首页"
      >
        <img :src="logo" alt="Tianma" class="h-4 w-[67px] object-contain" />
      </RouterLink>

      <nav class="hidden h-full items-center min-[641px]:flex" :class="isWorkbench ? 'ml-12 gap-10' : 'ml-3 gap-5 min-[1366px]:ml-7 min-[1366px]:gap-8'" aria-label="主导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex h-full items-center whitespace-nowrap text-[14px] font-normal text-[#111] transition-colors hover:text-[#111]"
          :class="route.path === item.to || (item.label === '天马智擎' && route.path.startsWith('/chat')) || (item.label === '设置' && route.path.startsWith('/settings')) ? '!font-medium' : ''"
        >
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="ml-auto flex shrink-0 items-center gap-3 pl-2 min-[641px]:pl-8">
        <template v-if="isWorkbench">
          <button type="button" class="flex items-center gap-1.5 text-sm text-[#111]">
            <span class="grid h-5 w-5 place-items-center rounded-full bg-[#ffab24] text-[11px] text-white">★</span>178
          </button>
          <button type="button" class="grid h-8 w-8 place-items-center text-[#999]" aria-label="帮助"><CircleHelp class="h-4 w-4" /></button>
        </template>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button data-testid="header-user-anchor" class="grid h-8 w-8 place-items-center overflow-hidden rounded-full transition hover:ring-2 hover:ring-zinc-100" :aria-label="`${store.user?.displayName ?? '用户'} 的菜单`">
              <Avatar class="h-8 w-8">
                <AvatarImage :src="sourceAvatar" />
                <AvatarFallback class="text-xs">{{ store.user?.displayName?.[0] ?? '?' }}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-36">
            <DropdownMenuItem @select="openPersonalUsage">
              <CircleDollarSign class="mr-2 h-4 w-4" />我的用量
            </DropdownMenuItem>
            <DropdownMenuItem class="text-destructive focus:text-destructive" @select="logout">
              <LogOut class="mr-2 h-4 w-4" />退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button class="grid h-8 w-8 place-items-center rounded-lg text-[#444] min-[641px]:hidden" aria-label="移动端导航" @click="mobileNavOpen = !mobileNavOpen">
          <X v-if="mobileNavOpen" class="h-[18px] w-[18px]" />
          <Menu v-else class="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
    <nav v-if="mobileNavOpen" class="absolute left-0 right-0 top-14 border-b border-[#ededed] bg-white p-3 shadow-lg min-[641px]:hidden" aria-label="移动端主导航">
      <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" class="flex h-10 items-center rounded-lg px-3 text-sm text-[#555] hover:bg-[#f7f7f9]" @click="mobileNavOpen = false">
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
    </template>
  </header>
</template>
