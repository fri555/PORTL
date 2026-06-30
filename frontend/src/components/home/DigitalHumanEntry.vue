<script setup lang="ts">
import { UserRound, Play, Sparkles } from 'lucide-vue-next'
import { computed } from 'vue'
import type { ComponentSize } from '@/types/home'

const props = defineProps<{
  size?: ComponentSize
}>()

const isNarrow = computed(() => props.size === '1x2')
const isLarge = computed(() => props.size === '2x2')

function enterPlatform() {
  console.log('Enter digital human platform')
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col rounded-xl border border-zinc-200/60 bg-white shadow-sm" :class="isNarrow ? 'p-3' : 'p-5'">
    <div class="flex items-center gap-2" :class="isNarrow ? 'mb-2' : 'mb-3'">
      <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-400 to-pink-500 shadow-sm shadow-fuchsia-200">
        <UserRound class="h-4 w-4 text-white" />
      </div>
      <h3 class="truncate text-sm font-bold tracking-tight text-zinc-800">数字人平台</h3>
    </div>

    <button
      class="group relative flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-emerald-500/10 transition-all hover:shadow-md"
      :class="isLarge ? 'flex-col gap-3 p-4 text-center' : 'flex-col p-3 text-center'"
      @click="enterPlatform"
    >
      <!-- Glow effect -->
      <div class="absolute inset-0 bg-gradient-to-tr from-violet-500/5 via-transparent to-fuchsia-500/10 opacity-0 transition-opacity group-hover:opacity-100" />

      <!-- Icon ring -->
      <div class="relative flex items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-zinc-200/60 transition-transform group-hover:scale-105" :class="isNarrow ? 'mb-1 h-12 w-12' : 'h-14 w-14'">
        <UserRound class="h-7 w-7 text-fuchsia-500" />
        <div class="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-400 to-pink-500">
          <Play class="h-2.5 w-2.5 text-white" />
        </div>
      </div>

      <div class="relative min-w-0">
        <span class="block truncate text-sm font-bold tracking-tight text-zinc-800">AI数字人</span>
        <span v-if="isLarge" class="mt-0.5 block text-[11px] text-zinc-400/60">直播间 · 短视频 · 口播</span>
      </div>

      <div v-if="isLarge" class="relative flex items-center gap-1 rounded-full bg-fuchsia-50 px-2.5 py-1 text-[10px] font-medium text-fuchsia-600">
        <Sparkles class="h-3 w-3" />
        立即进入
      </div>
    </button>
  </div>
</template>
