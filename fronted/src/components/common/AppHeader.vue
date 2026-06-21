<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Zap, ChevronDown, User, LogOut } from 'lucide-vue-next'
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
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
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
  { label: '资讯', to: '/news' },
  { label: '竞对', to: '/news/competitor' },
]
const disabledItems = ['价值看板', '培训', '需求池']
</script>

<template>
  <header class="sticky top-0 z-40 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
    <div class="container flex h-16 items-center gap-6">
      <RouterLink to="/" class="flex shrink-0 items-center gap-2">
        <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Zap class="h-5 w-5" />
        </span>
        <span class="text-lg font-bold tracking-tight">天马AI</span>
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
        <TooltipProvider :delay-duration="200">
          <Tooltip v-for="item in disabledItems" :key="item">
            <TooltipTrigger as-child>
              <button
                class="cursor-not-allowed rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground/50"
                tabindex="-1"
              >
                {{ item }}
              </button>
            </TooltipTrigger>
            <TooltipContent>即将上线</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </nav>

      <div class="ml-auto hidden max-w-xs flex-1 lg:block">
        <SearchBar v-model="keyword" placeholder="搜索资讯、竞对情报…" @search="onSearch" />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button class="ml-auto flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-accent lg:ml-0">
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
          <DropdownMenuItem disabled>
            <User class="mr-2 h-4 w-4" /> 个人中心
          </DropdownMenuItem>
          <DropdownMenuItem class="text-destructive focus:text-destructive" @select="logout">
            <LogOut class="mr-2 h-4 w-4" /> 退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>
