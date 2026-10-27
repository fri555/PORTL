<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { LoaderCircle, Video } from 'lucide-vue-next'
const emit = defineEmits<{ complete: [] }>()
let completionTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => { completionTimer = setTimeout(() => emit('complete'), 3000) })
onBeforeUnmount(() => { if (completionTimer) clearTimeout(completionTimer) })
</script>

<template>
  <section class="replacement-processing" aria-live="polite"><div class="processing-icon"><Video :size="30" /><LoaderCircle :size="15" class="spinner" /></div><h2>视频生成中</h2></section>
</template>

<style scoped>
.replacement-processing{display:flex;flex:1;min-height:0;flex-direction:column;align-items:center;justify-content:center;gap:17px;padding:32px;text-align:center}.processing-icon{position:relative;display:grid;place-items:center;width:66px;height:66px;border-radius:18px;background:#f5f5f5}.spinner{position:absolute;right:6px;bottom:6px;animation:spin 1.3s linear infinite}.replacement-processing h2{margin:0;font-size:17px;font-weight:500}@keyframes spin{to{transform:rotate(360deg)}}
</style>
