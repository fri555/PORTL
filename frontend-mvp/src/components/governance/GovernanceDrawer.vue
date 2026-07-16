<script setup lang="ts">
import { X } from 'lucide-vue-next'
defineProps<{ open: boolean; title: string }>()
defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 bg-zinc-950/25" @click.self="$emit('close')">
      <aside
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        class="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
      >
        <header class="flex items-start justify-between border-b border-zinc-200 px-6 py-5">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff5530]">
              Asset details
            </p>
            <h2 class="mt-1 text-xl font-semibold text-zinc-950">{{ title }}</h2>
          </div>
          <button
            aria-label="关闭详情"
            class="rounded-full border border-zinc-200 p-2 hover:bg-zinc-50"
            @click="$emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </header>
        <div class="flex-1 overflow-y-auto p-6"><slot /></div>
      </aside>
    </div>
  </Teleport>
</template>
