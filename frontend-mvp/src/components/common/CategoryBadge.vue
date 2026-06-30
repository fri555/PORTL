<script setup lang="ts">
import { computed } from 'vue'
import { catMeta } from '@/lib/constants'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{ category: string; size?: 'sm' | 'md' }>(), {
  size: 'md',
})

const meta = computed(() => catMeta(props.category))
</script>

<template>
  <span
    v-if="meta"
    :class="
      cn(
        'inline-flex items-center rounded-full border font-medium',
        meta.color,
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
      )
    "
  >
    {{ meta.short }}
  </span>
</template>
