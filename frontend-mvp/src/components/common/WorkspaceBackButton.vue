<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

const router = useRouter()

function goBackToWorkspace() {
  router.push({ name: 'workspace' })
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
    @click="goBackToWorkspace"
  >
    <ArrowLeft class="h-4 w-4" />
    返回工作台
  </button>
</template>
