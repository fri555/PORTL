<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  Brain,
  BriefcaseBusiness,
  ChevronDown,
  Database,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  RefreshCw,
  User,
  X,
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

const store = useAppStore()
const router = useRouter()
const memoryEnabled = ref(true)
const showProfileModal = ref(false)
const profileName = ref('')
const profileAvatar = ref('')
const profileUploadError = ref('')
const profileFileInput = ref<HTMLInputElement | null>(null)

const navItems = [
  { label: '工作台', to: '/portals' },
  { label: '仪表盘', to: '/dashboards' },
  { label: '知识库', to: '/knowledge' },
]

const mobileNavItems = [
  { label: '工作区', to: '/', icon: MessageSquareText },
  { label: '工作台', to: '/portals', icon: BriefcaseBusiness },
  { label: '仪表盘', to: '/dashboards', icon: LayoutDashboard },
  { label: '知识库', to: '/knowledge', icon: Database },
]

function logout() {
  store.logout()
  router.push({ name: 'login' })
}

function handleBrandClick() {
  window.dispatchEvent(new CustomEvent('tianma:home-reset'))
}

function startProfileEdit() {
  showProfileModal.value = true
  profileName.value = store.user?.displayName ?? ''
  profileAvatar.value = store.user?.avatarUrl ?? ''
  profileUploadError.value = ''
}

function triggerAvatarUpload() {
  profileFileInput.value?.click()
}

function handleAvatarUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input?.files?.length) return
  const file = input.files[0]
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    profileUploadError.value = '仅支持 JPG/PNG 格式'
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    profileAvatar.value = reader.result as string
    profileUploadError.value = ''
  }
  reader.readAsDataURL(file)
}

function saveProfile() {
  store.updateUser({
    displayName: profileName.value.trim() || store.user?.displayName || '',
    avatarUrl: profileAvatar.value.trim() || store.user?.avatarUrl || '',
  })
  showProfileModal.value = false
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
    <div class="flex h-14 w-full items-center gap-[clamp(10px,1vw,16px)] px-[clamp(8px,1vw,16px)] md:h-16">
      <div class="flex shrink-0 items-center gap-5">
        <div id="app-header-left-control" data-testid="app-header-left-control" class="flex h-9 w-10 shrink-0 items-center justify-center" />
        <RouterLink
          :to="{ name: 'home' }"
          data-testid="header-brand-anchor"
          class="flex shrink-0 items-center gap-2 no-underline"
          aria-label="回到天马智擎首页"
          @click="handleBrandClick"
        >
          <span class="relative flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-sm">
            <span class="absolute left-2 top-2 h-2 w-2 rounded-full bg-orange-500" />
            <span class="absolute bottom-2 right-2 h-3.5 w-1.5 rounded-full bg-blue-600" />
          </span>
          <span class="text-base font-bold tracking-tight text-zinc-950 md:text-lg">天马智擎</span>
        </RouterLink>
      </div>

      <nav class="hidden items-center gap-1 md:flex" aria-label="主导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
          active-class="bg-zinc-100 text-zinc-950"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="ml-auto flex shrink-0 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button data-testid="header-user-anchor" class="touch-target flex items-center gap-2 rounded-full py-1 pl-2 pr-2 transition hover:bg-zinc-100">
              <Avatar class="h-8 w-8">
                <AvatarImage :src="store.user?.avatarUrl ?? ''" />
                <AvatarFallback class="text-xs">{{ store.user?.displayName?.[0] ?? '?' }}</AvatarFallback>
              </Avatar>
              <span class="hidden text-sm font-medium text-zinc-800 sm:inline">{{ store.user?.displayName }}</span>
              <ChevronDown class="h-4 w-4 text-zinc-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56">
            <DropdownMenuLabel>
              <div class="font-medium">{{ store.user?.displayName }}</div>
              <div class="text-xs font-normal text-muted-foreground">{{ store.user?.department }}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem aria-label="编辑个人资料" @click="startProfileEdit" @select.prevent="startProfileEdit">
              <User class="mr-2 h-4 w-4" /> 编辑个人资料
            </DropdownMenuItem>
            <DropdownMenuItem
              aria-label="记忆开关"
              title="开启后会跨会话保留常用偏好、业务术语和历史反馈；关闭后仅使用当前会话上下文。"
              @click="memoryEnabled = !memoryEnabled"
              @select.prevent="memoryEnabled = !memoryEnabled"
            >
              <Brain class="mr-2 h-4 w-4" />
              记忆开关
              <span class="ml-auto text-xs" :class="memoryEnabled ? 'text-emerald-600' : 'text-zinc-400'">{{ memoryEnabled ? '开' : '关' }}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @select="router.push({ name: 'login' })">
              <RefreshCw class="mr-2 h-4 w-4" /> 切换账号
            </DropdownMenuItem>
            <DropdownMenuItem class="text-destructive focus:text-destructive" @select="logout">
              <LogOut class="mr-2 h-4 w-4" /> 退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div id="app-header-right-control" data-testid="app-header-right-control" class="flex h-9 w-9 shrink-0 items-center justify-center" />
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showProfileModal" class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4 py-6">
        <div class="w-full max-w-md overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-zinc-200">
          <div class="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4">
            <div>
              <div class="text-base font-semibold text-zinc-950">编辑个人资料</div>
              <p class="mt-1 text-xs text-zinc-500">支持本地上传 JPG / PNG 头像</p>
            </div>
            <button type="button" class="rounded-full p-2 text-zinc-500 hover:bg-zinc-100" @click="showProfileModal = false">
              <X class="h-4 w-4" />
            </button>
          </div>
          <div class="space-y-4 px-6 py-5">
            <div class="flex items-center gap-4">
              <Avatar class="h-16 w-16">
                <AvatarImage :src="profileAvatar || (store.user?.avatarUrl ?? '')" />
                <AvatarFallback class="text-sm">{{ (profileName || store.user?.displayName)?.[0] ?? '?' }}</AvatarFallback>
              </Avatar>
              <button type="button" class="rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50" @click="triggerAvatarUpload">
                上传头像
              </button>
            </div>
            <input ref="profileFileInput" type="file" accept=".jpg,.jpeg,.png" class="hidden" @change="handleAvatarUpload" />
            <label class="block text-xs text-zinc-500">
              名字
              <input v-model="profileName" aria-label="设置名字" class="mt-2 w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-orange-300" />
            </label>
            <p v-if="profileUploadError" class="text-xs text-red-600">{{ profileUploadError }}</p>
          </div>
          <div class="flex items-center justify-end gap-3 border-t border-zinc-200 px-6 py-4">
            <button type="button" class="rounded-2xl border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50" @click="showProfileModal = false">取消</button>
            <button type="button" class="rounded-2xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800" @click="saveProfile">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </header>

  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
    aria-label="移动端主导航"
  >
    <div class="mx-auto grid max-w-md grid-cols-4 gap-1">
      <RouterLink
        v-for="item in mobileNavItems"
        :key="item.to"
        :to="item.to"
        class="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium text-zinc-500 transition hover:bg-amber-50 hover:text-amber-700"
        active-class="bg-amber-50 text-amber-700"
      >
        <component :is="item.icon" class="h-5 w-5" aria-hidden="true" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </div>
  </nav>
</template>
