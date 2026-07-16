<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  Bell,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  LogOut,
  MessageSquareText,
  RefreshCw,
  User,
  Plus,
  X,
} from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
import { mockUser as defaultUser } from '@/mock/user'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  { label: '知识中心', to: '/knowledge' },
  { label: '工作台', to: '/portals' },
  { label: 'AI 治理', to: '/admin/governance' },
]

const mobileNavItems = [
  { label: '工作区', to: '/', icon: MessageSquareText },
  { label: '知识中心', to: '/knowledge', icon: BookOpen },
  { label: '工作台', to: '/portals', icon: BriefcaseBusiness },
]

function logout() {
  store.logout()
  router.replace({ name: 'login' })
}

async function openTaskNotification() {
  const notification = store.taskNotifications[0]
  if (!notification) return
  await router.push({
    name: 'home',
    query: {
      conversationId: notification.conversationId,
      messageId: notification.messageId,
    },
  })
  store.dismissTaskNotification(notification.id)
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
    <div class="flex h-14 w-full items-center gap-[clamp(8px,1vw,14px)] px-[clamp(6px,0.8vw,12px)] md:h-16">
      <div class="flex shrink-0 items-center gap-3">
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
        <!-- Coins -->
        <div class="group relative">
          <button
            type="button"
            class="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
            aria-label="我的金币"
          >
            <span class="h-3.5 w-3.5 rounded-full bg-amber-400 text-[9px] leading-3.5 text-white">¥</span>
            776
          </button>
          <div class="pointer-events-none absolute right-0 top-11 z-50 hidden w-60 rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-xl group-hover:block">
            <div class="text-xs font-semibold text-zinc-900">金币使用说明</div>
            <p class="mt-1 text-[11px] leading-5 text-zinc-500">金币用于抵扣 AI 对话、知识库检索与方案生成的算力消耗。当前余额 776，可在「设置 - 账户」中充值或查看明细。</p>
          </div>
        </div>

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
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <RefreshCw class="mr-2 h-4 w-4" />
                <span>切换账号</span>
                <ChevronRight class="ml-auto h-4 w-4" />
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent class="w-52 p-1">
                <DropdownMenuItem @select="store.login(defaultUser)" class="cursor-pointer">
                  <span class="flex h-6 w-6 items-center justify-center rounded-full bg-[#1456f0] text-[10px] text-white mr-2">张</span>
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-medium">张三</div>
                    <div class="text-xs text-zinc-400">系统管理员</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem @select="store.login({ ...defaultUser, id: 'user-lisi', displayName: '李四', role: 'user' as const, department: '品牌营销部' })" class="cursor-pointer">
                  <span class="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-[10px] text-zinc-600 mr-2">李</span>
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-medium">李四</div>
                    <div class="text-xs text-zinc-400">普通员工</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem @select="router.push({ name: 'login' })">
                  <Plus class="mr-2 h-4 w-4" /> 添加账号
                </DropdownMenuItem>
                <DropdownMenuItem class="text-destructive focus:text-destructive" @select="logout">
                  <LogOut class="mr-2 h-4 w-4" /> 退出当前账号
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
        <div v-if="store.taskNotifications.length" class="relative">
          <button
            type="button"
            aria-label="打开任务完成通知"
            class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100"
            @click="openTaskNotification"
          >
            <Bell class="h-4 w-4" />
          </button>
          <span class="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">{{ store.taskNotifications.length }}</span>
          <div class="absolute right-0 top-11 z-50 w-64 rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-xl">
            <button type="button" class="block w-full pr-7 text-left" @click="openTaskNotification">
              <div class="text-xs font-semibold text-zinc-900">任务完成通知</div>
              <div class="mt-1 truncate text-[11px] text-zinc-500">{{ store.taskNotifications[0]?.title }}</div>
            </button>
            <button
              type="button"
              class="absolute right-2 top-2 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="关闭任务通知"
              @click.stop="store.dismissTaskNotification(store.taskNotifications[0].id)"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
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
    <div class="mx-auto grid max-w-md grid-cols-3 gap-1">
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
