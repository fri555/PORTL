<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { MessageSquareText, BookOpen, Grid3X3, ChevronDown, User } from 'lucide-vue-next'
import { mockUser } from '@/mock/user'

const router = useRouter()
const route = useRoute()
const userMenuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const navItems = [
  { path: '/', label: '主页', icon: MessageSquareText },
  { path: '/chat', label: '对话', icon: MessageSquareText },
  { path: '/knowledge', label: '知识中心', icon: BookOpen },
  { path: '/workbench', label: '工作台', icon: Grid3X3 },
]

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function navigate(path: string) {
  router.push(path)
  userMenuOpen.value = false
}

function onClickOutside(e: MouseEvent) {
  if (userMenuOpen.value && menuRef.value && !menuRef.value.contains(e.target as Node)) {
    userMenuOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-hairline bg-white/95 backdrop-blur">
    <div class="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
      <!-- Logo -->
      <a class="flex shrink-0 items-center gap-2" @click="navigate('/')">
        <div class="grid h-8 w-8 place-items-center rounded-lg bg-ink text-white text-sm font-bold">智</div>
        <span class="hidden font-semibold text-ink sm:inline">天马智擎</span>
      </a>

      <!-- Nav -->
      <nav class="flex items-center gap-1">
        <button
          v-for="item in navItems"
          :key="item.path"
          class="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition"
          :class="isActive(item.path) ? 'bg-ink text-white' : 'text-charcoal hover:bg-surface'"
          @click="navigate(item.path)"
        >
          <component :is="item.icon" class="h-4 w-4" />
          <span class="hidden sm:inline">{{ item.label }}</span>
        </button>
      </nav>

      <div class="flex-1" />

      <!-- User -->
      <div ref="menuRef" class="relative">
        <button
          type="button"
          class="inline-flex h-9 items-center gap-2 rounded-full border border-hairline bg-white px-3 text-sm text-charcoal hover:bg-surface"
          @click.stop="userMenuOpen = !userMenuOpen"
        >
          <User class="h-4 w-4" />
          <span class="hidden sm:inline">{{ mockUser.displayName }}</span>
          <ChevronDown class="h-3.5 w-3.5 text-stone" />
        </button>
        <div
          v-if="userMenuOpen"
          class="absolute right-0 top-11 w-48 rounded-xl border border-hairline bg-white p-1 shadow-elevated"
        >
          <div class="px-3 py-2 text-xs text-stone">
            {{ mockUser.displayName }}
            <div class="text-muted">{{ mockUser.department }} · {{ mockUser.role }}</div>
          </div>
          <hr class="mx-2 border-hairline-soft" />
          <button class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-charcoal hover:bg-surface" @click="navigate('/knowledge')">知识中心</button>
          <button class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-charcoal hover:bg-surface" @click="navigate('/workbench')">工作台</button>
        </div>
      </div>
    </div>
  </header>
</template>
