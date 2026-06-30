<script setup lang="ts">
import { Clock, Users } from 'lucide-vue-next'
import type { CourseItem } from '@/types/home'
import SectionHeader from '@/components/common/SectionHeader.vue'

defineProps<{ items: CourseItem[] }>()

const diffClass: Record<string, string> = {
  入门: 'bg-emerald-50 text-emerald-600',
  进阶: 'bg-amber-50 text-amber-600',
  专题: 'bg-red-50 text-red-600',
}
</script>

<template>
  <section class="rounded-xl border bg-white p-5 shadow-sm">
    <SectionHeader title="本周推荐课程" icon="🎓" more-label="学习中心" more-disabled />
    <div class="grid gap-3 sm:grid-cols-2">
      <div
        v-for="c in items"
        :key="c.id"
        class="group cursor-pointer overflow-hidden rounded-lg border transition-all hover:-translate-y-0.5 hover:shadow-md"
      >
        <div class="p-3">
          <h3 class="line-clamp-1 text-sm font-semibold">{{ c.title }}</h3>
          <div class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span :class="['rounded px-1.5 py-0.5 font-medium', diffClass[c.difficulty] ?? 'bg-muted']">{{ c.difficulty }}</span>
            <span class="flex items-center gap-1"><Clock class="h-3 w-3" />{{ c.duration }}</span>
            <span class="flex items-center gap-1"><Users class="h-3 w-3" />{{ c.enrolled }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
