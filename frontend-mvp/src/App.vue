<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toaster, toast } from 'vue-sonner'
import { listVideoTasks, startPrototypeVideoQueue } from '@/composables/useVideoPrototype'
import AppHeader from '@/components/common/AppHeader.vue'

const route = useRoute()
const router = useRouter()
let stopQueue: (() => void) | undefined
function completed(event: Event) {
  const task = listVideoTasks().find(item => item.id === (event as CustomEvent<string>).detail)
  if (!task || (route.query.id === task.id && route.query.view === 'processing')) return
  toast.success(`${task.name}已完成`, { action: { label: '查看结果', onClick: () => router.push({ path: `/video-gen/${task.operator}`, query: { view: 'result', id: task.id, from: 'capability-square' } }) } })
}
onMounted(() => { window.addEventListener('tianma:video-task-completed', completed); stopQueue = startPrototypeVideoQueue() })
onBeforeUnmount(() => { window.removeEventListener('tianma:video-task-completed', completed); stopQueue?.() })
const showLayout = computed(() => !route.path.startsWith('/auth'))
</script>

<template>
  <Toaster richColors closeButton position="top-right" />
  <div v-if="showLayout" class="flex min-h-screen flex-col bg-white">
    <AppHeader />
    <main class="flex-1">
      <router-view />
    </main>
  </div>
  <router-view v-else />
</template>
