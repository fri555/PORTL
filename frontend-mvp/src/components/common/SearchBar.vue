<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'

const props = defineProps<{ modelValue?: string; placeholder?: string }>()
const emit = defineEmits<{
  'update:modelValue': [v: string]
  search: [v: string]
}>()

function onInput(v: string | number) {
  emit('update:modelValue', String(v))
}
function onEnter() {
  emit('search', props.modelValue ?? '')
}
</script>

<template>
  <div class="relative">
    <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      :model-value="modelValue"
      :placeholder="placeholder"
      class="pl-9"
      @update:model-value="onInput"
      @keyup.enter="onEnter"
    />
  </div>
</template>
