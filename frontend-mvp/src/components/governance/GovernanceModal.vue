<script setup lang="ts">
import { X } from 'lucide-vue-next'
defineProps<{ open: boolean; title: string; alert?: boolean; closeLabel?: string }>()
defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[60] grid place-items-center bg-zinc-950/30 p-4"
      @click.self="$emit('close')"
    >
      <section
        :role="alert ? 'alertdialog' : 'dialog'"
        aria-modal="true"
        class="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div class="flex items-start justify-between">
          <h2 class="text-xl font-semibold text-zinc-950">{{ title }}</h2>
          <button
            :aria-label="closeLabel ?? '关闭弹窗'"
            class="rounded-full border border-zinc-200 p-2"
            @click="$emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <div class="mt-5"><slot /></div>
        <div v-if="alert" class="mt-6 flex justify-end gap-2">
          <button
            class="rounded-full border border-zinc-300 px-4 py-2 text-sm"
            @click="$emit('close')"
          >
            取消</button
          ><button
            data-testid="confirm-state-action"
            class="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white"
            @click="$emit('confirm')"
          >
            确认归档
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
