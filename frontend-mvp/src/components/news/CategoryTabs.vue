<script setup lang="ts">
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CATEGORIES } from '@/lib/constants'

defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [v: string] }>()
</script>

<template>
  <Tabs
    :model-value="modelValue"
    @update:model-value="(v) => emit('update:modelValue', String(v))"
  >
    <TabsList class="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
      <TabsTrigger value="all" class="rounded-md">全部</TabsTrigger>
      <TabsTrigger v-for="c in CATEGORIES" :key="c.key" :value="c.key" class="rounded-md">
        {{ c.label }}
      </TabsTrigger>
    </TabsList>
  </Tabs>
</template>
