<script setup lang="ts">
import { CalendarDays, Clock3 } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
  testId: string
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

function parts() {
  const [date = '', time = ''] = props.modelValue.split('T')
  return { date, time: time.slice(0, 5) }
}

function update(date: string, time: string) {
  const value = date ? `${date}T${time || '18:00'}` : ''
  emit('update:modelValue', value)
  emit('change', value)
}

function onDateInput(event: Event) {
  update((event.target as HTMLInputElement).value, parts().time)
}

function onTimeInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  update(parts().date, value)
}
</script>

<template>
  <div :data-testid="testId" class="mt-1 flex h-10 min-w-0 items-center overflow-hidden rounded-xl border border-[#dfe4eb] bg-white transition focus-within:border-[#78a8ef] focus-within:ring-2 focus-within:ring-[#1769e0]/8">
    <CalendarDays class="ml-2.5 h-3.5 w-3.5 shrink-0 text-[#9299a3]" />
    <input :value="parts().date" :data-testid="`${testId}-date`" type="date" :aria-label="`${label}日期`" class="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-[11px] text-[#3d444d] outline-none" @input="onDateInput" />
    <span class="h-5 w-px shrink-0 bg-[#e5e8ed]" />
    <Clock3 class="ml-2 h-3.5 w-3.5 shrink-0 text-[#9299a3]" />
    <input :value="parts().time" :data-testid="`${testId}-time`" type="time" :aria-label="`${label}时间`" class="h-full w-[78px] shrink-0 border-0 bg-transparent px-2 text-[11px] text-[#3d444d] outline-none" @input="onTimeInput" />
  </div>
</template>
