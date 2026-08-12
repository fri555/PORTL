<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { BookOpen, ChartPie, ChevronDown, CircleHelp, LayoutGrid, LogOut, MessageSquareText, Settings } from 'lucide-vue-next'
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
const isWorkbench = computed(() => route.path === '/portals')

const navItems = [
  { label: '天马智擎', to: '/', icon: MessageSquareText },
  { label: '工作台', to: '/portals', icon: LayoutGrid },
  { label: '仪表盘', to: '/dashboards', icon: ChartPie },
  { label: '知识中心', to: '/knowledge', icon: BookOpen },
  { label: '设置', to: '/settings/agents', icon: Settings },
]

function logout() {
  store.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-[#ededed] bg-white">
    <div class="flex h-14 min-w-[760px] items-center px-2 lg:px-4 min-[1366px]:pl-7 min-[1366px]:pr-4">
      <RouterLink
        :to="{ name: 'home' }"
        data-testid="header-brand-anchor"
        class="flex shrink-0 items-center gap-[7px] no-underline"
        aria-label="回到天马智擎首页"
      >
        <img :src="logo" alt="Tianma" class="h-4 w-[67px] object-contain" />
        <span v-if="!isWorkbench" class="rounded bg-[#fff0f0] px-1 py-0.5 text-[11px] font-medium text-[#ef5555]">内测版</span>
      </RouterLink>

      <nav class="flex h-full items-center" :class="isWorkbench ? 'ml-12 gap-10' : 'ml-3 gap-5 min-[1366px]:ml-7 min-[1366px]:gap-8'" aria-label="主导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="relative flex h-full items-center gap-2 whitespace-nowrap text-[15px] font-normal text-[#858585] transition-colors hover:text-[#111] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:scale-x-0 after:bg-[#111] after:transition-transform"
          :class="route.path === item.to || (item.label === '设置' && route.path.startsWith('/settings')) ? '!font-medium !text-[#111] after:scale-x-100' : ''"
        >
          <component v-if="!isWorkbench" :is="item.icon" class="h-[17px] w-[17px] stroke-[1.8]" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="ml-auto flex shrink-0 items-center gap-3 pl-8">
        <template v-if="isWorkbench">
          <button type="button" class="flex items-center gap-1.5 text-sm text-[#111]">
            <span class="grid h-5 w-5 place-items-center rounded-full bg-[#ffab24] text-[11px] text-white">★</span>178
          </button>
          <button type="button" class="grid h-8 w-8 place-items-center text-[#999]" aria-label="帮助"><CircleHelp class="h-4 w-4" /></button>
        </template>
        <RouterLink
          v-if="!isWorkbench"
          to="/admin/feedback"
          class="flex h-8 w-36 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#dedede] text-xs text-[#3f3f3f] hover:bg-zinc-50"
        >
          我要吐槽
          <span class="rounded bg-[#fff0f0] px-1 py-0.5 text-[9px] text-[#ef5555]">内测</span>
        </RouterLink>
        <span class="mx-5 h-5 w-px bg-[#e5e5e5]" />

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button data-testid="header-user-anchor" class="flex h-[42px] w-[150px] items-center gap-3 rounded-lg px-2 transition hover:bg-zinc-100">
              <Avatar class="h-8 w-8">
                <AvatarImage :src="sourceAvatar" />
                <AvatarFallback class="text-xs">{{ store.user?.displayName?.[0] ?? '?' }}</AvatarFallback>
              </Avatar>
              <span class="text-sm font-medium text-zinc-800">{{ isWorkbench ? store.user?.displayName : '朝暮' }}</span>
              <ChevronDown class="ml-auto h-3.5 w-3.5 text-zinc-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-32">
            <DropdownMenuItem class="text-destructive focus:text-destructive" @select="logout">
              <LogOut class="mr-2 h-4 w-4" />退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </header>
</template>
