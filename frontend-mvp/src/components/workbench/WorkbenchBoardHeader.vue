<script setup lang="ts">
import { RefreshCw, Search, X } from 'lucide-vue-next'

defineProps<{
  title: string
  query: string
  searchLabel: string
  refreshing?: boolean
  testIdPrefix?: string
}>()

defineEmits<{
  refresh: []
  'update:query': [value: string]
}>()
</script>

<template>
  <header class="flex shrink-0 items-center justify-between gap-4 border-b border-[#eef0f3] px-5 py-3.5">
    <div data-testid="board-title-group" class="flex shrink-0 items-center gap-2">
      <h2 class="workbench-card-title text-[14px] font-semibold tracking-[-0.01em] text-[#16181d]">{{ title }}</h2>
      <button
        :data-testid="testIdPrefix ? `${testIdPrefix}-refresh` : 'board-refresh'"
        type="button"
        :disabled="refreshing"
        :aria-label="`刷新${title}`"
        :title="`刷新${title}`"
        class="grid h-7 w-7 place-items-center rounded-lg text-[#7c8490] transition hover:bg-[#f4f5f7] hover:text-[#1769e0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fb5f3] disabled:cursor-wait disabled:opacity-50"
        @click="$emit('refresh')"
      >
        <RefreshCw data-testid="board-refresh-icon" class="h-3.5 w-3.5" :class="refreshing ? 'animate-spin' : ''" />
      </button>
      <slot name="title-meta" />
    </div>

    <div class="flex min-w-0 flex-1 items-center justify-end gap-2">
      <slot />
      <label class="relative w-[200px] shrink-0">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#a1a6af]" />
        <input
          :value="query"
          :aria-label="searchLabel"
          class="h-9 w-full rounded-xl border border-[#e6e8ec] bg-[#f8f9fa] pl-8 pr-8 text-xs text-[#343941] outline-none transition placeholder:text-[#a1a6af] focus:border-[#9bb9ef] focus:bg-white"
          :placeholder="searchLabel"
          @input="$emit('update:query', ($event.target as HTMLInputElement).value)"
        />
        <button
          v-if="query"
          :data-testid="testIdPrefix ? `clear-${testIdPrefix}-search` : undefined"
          type="button"
          :aria-label="`清空${title}搜索`"
          class="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-[#9aa0aa] transition hover:bg-[#e9ecf0] hover:text-[#444a54]"
          @click="$emit('update:query', '')"
        >
          <X class="h-3 w-3" />
        </button>
      </label>
    </div>
  </header>
</template>
