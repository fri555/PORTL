<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  Zap,
  ChevronDown,
  User,
  LogOut,
  Home,
  Newspaper,
  LayoutDashboard,
  BriefcaseBusiness,
  Lightbulb,
  Search,
} from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import SearchBar from './SearchBar.vue'

const store = useAppStore()
const router = useRouter()
const keyword = ref('')

function onSearch(v: string) {
  router.push({ name: 'news', query: v ? { q: v } : {} })
}

function logout() {
  store.logout()
  router.push({ name: 'login' })
}

const navItems = [
  { label: '智能工作台', to: '/workspace' },
  { label: '数据看板', to: '/dashboards' },
  { label: '行业资讯', to: '/news' },
  { label: '培训中心', to: '/courses' },
  { label: '需求池', to: '/demands' },
  { label: '管理后台', to: '/admin' },
]

const mobileNavItems = [
  { label: '首页', to: '/', icon: Home },
  { label: '工作台', to: '/workspace', icon: BriefcaseBusiness },
  { label: '资讯', to: '/news', icon: Newspaper },
  { label: '看板', to: '/dashboards', icon: LayoutDashboard },
  { label: '需求池', to: '/demands', icon: Lightbulb },
]
</script>

<template>
  <header class="sticky top-0 z-40 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
    <div class="container flex h-14 items-center gap-3 md:h-16 md:gap-6">
      <RouterLink to="/" class="flex shrink-0 items-center gap-2">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm md:h-8 md:w-8">
          <Zap class="h-5 w-5" aria-hidden="true" />
        </span>
        <span class="text-base font-bold tracking-tight md:text-lg">天马AI</span>
      </RouterLink>

      <nav class="hidden items-center gap-1 md:flex">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          active-class="bg-accent text-foreground"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="ml-auto hidden max-w-xs flex-1 lg:block">
        <SearchBar v-model="keyword" placeholder="搜索资讯、竞对情报…" @search="onSearch" />
      </div>

      <RouterLink
        :to="{ name: 'news' }"
        class="touch-target ml-auto inline-flex items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
        aria-label="搜索资讯"
      >
        <Search class="h-5 w-5" />
      </RouterLink>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button class="touch-target flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-accent lg:ml-0">
            <Avatar class="h-8 w-8">
              <AvatarImage :src="store.user?.avatarUrl ?? ''" />
              <AvatarFallback class="text-xs">{{ store.user?.displayName?.[0] ?? '?' }}</AvatarFallback>
            </Avatar>
            <span class="hidden text-sm font-medium sm:inline">{{ store.user?.displayName }}</span>
            <ChevronDown class="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-48">
          <DropdownMenuLabel>
            <div class="font-medium">{{ store.user?.displayName }}</div>
            <div class="text-xs font-normal text-muted-foreground">{{ store.user?.department }}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem @select="router.push({ name: 'profile' })">
            <User class="mr-2 h-4 w-4" /> 个人中心
          </DropdownMenuItem>
          <DropdownMenuItem class="text-destructive focus:text-destructive" @select="logout">
            <LogOut class="mr-2 h-4 w-4" /> 退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>

  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
    aria-label="移动端主导航"
  >
    <div class="mx-auto grid max-w-md grid-cols-5 gap-1">
      <RouterLink
        v-for="item in mobileNavItems"
        :key="item.to"
        :to="item.to"
        class="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        :active-class="item.to === '/' ? '' : 'bg-accent text-primary'"
        exact-active-class="bg-accent text-primary"
      >
        <component :is="item.icon" class="h-5 w-5" aria-hidden="true" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </div>
  </nav>
</template>
