<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ChevronDown, CircleHelp, LogOut, User, CheckSquare, Newspaper } from 'lucide-vue-next'
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
const sourceAvatar = `${import.meta.env.BASE_URL}assets/production-home/user-avatar.jpg`
const isWorkbench = computed(() => route.path === '/portals')

const navItems = [
  { label: '天马智擎', to: '/' },
  { label: '工作台', to: '/portals' },
  { label: '仪表盘', to: '/workspace/dashboards' },
  { label: '知识中心', to: '/knowledge' },
  { label: '设置', to: '/settings/agents' },
]

function isActiveTab(to: string) {
  if (to === '/') return route.path === '/'
  if (to === '/settings/agents') return route.path.startsWith('/settings')
  return route.path === to
}

function logout() {
  store.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <header class="sticky top-0 z-40 bg-[#fafafa]">
    <div class="flex h-14 min-w-[760px] items-center px-4">
      <!-- Logo + 内测版 -->
      <div class="mr-4 flex items-center gap-1.5">
        <span class="text-base font-semibold text-[#111]">天马智擎</span>
        <span class="rounded-sm bg-[#f0f0f0] px-1 py-0.5 text-[10px] text-[#999]">内测版</span>
      </div>

      <nav class="flex h-full items-center gap-1" aria-label="主导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-normal text-[#111] transition-colors hover:bg-[#f0f0f0]"
          :class="isActiveTab(item.to) ? 'bg-[#ececec]' : ''"
        >
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="ml-auto flex shrink-0 items-center gap-3">
        <button type="button" class="rounded-lg border border-[#e5e5e5] bg-white px-3 py-1.5 text-xs text-[#666] transition hover:bg-[#f5f5f5]">我要吐槽</button>

        <template v-if="isWorkbench">
          <button type="button" class="flex items-center gap-1.5 text-sm text-[#111]">
            <span class="grid h-5 w-5 place-items-center rounded-full bg-[#ffab24] text-[11px] text-white">★</span>178
          </button>
          <button type="button" class="grid h-8 w-8 place-items-center text-[#999]" aria-label="帮助"><CircleHelp class="h-4 w-4" /></button>
        </template>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button data-testid="header-user-anchor" class="flex items-center gap-2 rounded-md px-2 py-1 transition hover:bg-[#f0f0f0]">
              <Avatar class="h-7 w-7">
                <AvatarImage :src="sourceAvatar" />
                <AvatarFallback class="text-xs">{{ store.user?.displayName?.[0] ?? '?' }}</AvatarFallback>
              </Avatar>
              <span class="text-sm text-zinc-700">朝暮</span>
              <ChevronDown class="h-3 w-3 text-zinc-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-40">
            <DropdownMenuItem class="text-xs" @select="router.push('/workspace/profile')">
              <User class="mr-2 h-3.5 w-3.5" />个人中心
            </DropdownMenuItem>
            <DropdownMenuItem class="text-xs" @select="router.push('/workspace/tasks')">
              <CheckSquare class="mr-2 h-3.5 w-3.5" />我的任务
            </DropdownMenuItem>
            <DropdownMenuItem class="text-xs" @select="router.push('/workspace/news')">
              <Newspaper class="mr-2 h-3.5 w-3.5" />资讯动态
            </DropdownMenuItem>
            <div class="my-1 border-t border-zinc-100" />
            <DropdownMenuItem class="text-destructive focus:text-destructive text-xs" @select="logout">
              <LogOut class="mr-2 h-3.5 w-3.5" />退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </header>
</template>
