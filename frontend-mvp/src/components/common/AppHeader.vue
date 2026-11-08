<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { CircleDollarSign, LogOut, Menu, PanelLeft, Search, X } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { canOpenSettings } from '@/composables/settings/quota-access'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const store = useAppStore()
const route = useRoute()
const router = useRouter()
const mobileNavOpen = ref(false)
const sourceAvatar = `${import.meta.env.BASE_URL}assets/production-home/user-avatar.jpg`
const workbenchLogo = `${import.meta.env.BASE_URL}assets/production-home/header-logo-workbench.png`

const navItems = computed(() => [
  { label: '天马智擎', to: '/chat', match: '/chat' },
  { label: '内容中心', to: '/video-gen/capability-square', match: '/video-gen' },
  { label: '自动化', to: '/automation', match: '/automation' },
  { label: '工作台', to: '/portals', match: '/portals' },
  { label: '数据中心', to: '/dashboards', match: '/dashboards' },
  { label: '知识中心', to: '/knowledge', match: '/knowledge' },
  ...(canOpenSettings(store.user?.id) ? [{ label: '设置', to: '/settings/agents', match: '/settings' }] : []),
])

function isActive(match: string) { return route.path === match || route.path.startsWith(`${match}/`) }
function focusPageSearch() {
  if (route.path.startsWith('/chat')) { window.dispatchEvent(new CustomEvent('tianma:chat-action', { detail: 'search' })); return }
  const search = Array.from(document.querySelectorAll<HTMLInputElement>('input')).find(input => input.offsetParent !== null && (input.type === 'search' || input.placeholder.includes('搜索')))
  search?.focus()
}
function toggleModuleSidebar() {
  if (route.path.startsWith('/chat')) window.dispatchEvent(new CustomEvent('tianma:chat-action', { detail: 'toggle-sidebar' }))
  else if (route.path.startsWith('/video-gen')) window.dispatchEvent(new Event('tianma:video-sidebar'))
  else window.dispatchEvent(new Event('tianma:toggle-sidebar'))
}
function logout() { store.logout(); router.replace({ name: 'login' }) }
function openPersonalUsage() { router.push({ path: '/settings/usage', query: { scope: 'personal' } }) }
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-[#f0f0f1] bg-[#fafbfc]">
    <div class="flex h-14 items-center px-4 lg:px-6">
      <RouterLink to="/chat" data-testid="header-brand-anchor" class="shrink-0" aria-label="AI工作台首页">
        <img :src="workbenchLogo" alt="AI工作台" class="h-8 w-[126px] object-contain object-left" />
      </RouterLink>

      <div class="ml-2 flex items-center gap-1 min-[940px]:ml-6">
        <button type="button" class="header-icon max-[939px]:!hidden" aria-label="搜索当前页面" @click="focusPageSearch"><Search :size="18" /></button>
        <button type="button" class="header-icon" aria-label="展开或收起侧边栏" @click="toggleModuleSidebar"><PanelLeft :size="18" /></button>
      </div>

      <nav class="ml-8 hidden h-full min-w-0 items-center gap-7 min-[760px]:flex" aria-label="主导航">
        <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" class="flex h-full items-center whitespace-nowrap text-[15px] text-[#666] no-underline transition-colors hover:text-[#111]" :class="isActive(item.match) ? 'font-semibold !text-[#111]' : ''">
          <span class="nav-label">{{ item.label }}</span><span v-if="item.label === '天马智擎'" class="ml-1 rounded-full bg-[#1fafff] px-2 py-0.5 text-[10px] font-semibold italic text-white">AI Agent</span>
        </RouterLink>
      </nav>

      <div class="ml-auto flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger as-child><button data-testid="header-user-anchor" class="grid h-9 w-9 place-items-center overflow-hidden rounded-full hover:ring-2 hover:ring-zinc-100" :aria-label="`${store.user?.displayName ?? '用户'} 的菜单`"><Avatar class="h-9 w-9"><AvatarImage :src="sourceAvatar"/><AvatarFallback class="text-xs">{{ store.user?.displayName?.[0] ?? '?' }}</AvatarFallback></Avatar></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-36"><DropdownMenuItem @select="openPersonalUsage"><CircleDollarSign class="mr-2 h-4 w-4"/>我的用量</DropdownMenuItem><DropdownMenuItem class="text-destructive focus:text-destructive" @select="logout"><LogOut class="mr-2 h-4 w-4"/>退出登录</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
        <button class="header-icon min-[760px]:hidden" aria-label="移动端导航" @click="mobileNavOpen = !mobileNavOpen"><X v-if="mobileNavOpen" :size="19"/><Menu v-else :size="19"/></button>
      </div>
    </div>
    <nav v-if="mobileNavOpen" class="absolute left-0 right-0 top-14 border-b border-[#ededed] bg-white p-3 shadow-lg min-[760px]:hidden" aria-label="移动端主导航"><RouterLink v-for="item in navItems" :key="item.to" :to="item.to" class="flex h-10 items-center rounded-lg px-3 text-sm text-[#555] hover:bg-[#f7f7f9]" @click="mobileNavOpen = false">{{ item.label }}</RouterLink></nav>
  </header>
</template>

<style scoped>
.header-icon{display:grid;height:34px;width:34px;place-items:center;border:0;border-radius:8px;background:transparent;color:#333}.header-icon:hover{background:#f0f1f2}
</style>
