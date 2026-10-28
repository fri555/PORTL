<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { AudioLines, LoaderCircle } from 'lucide-vue-next'
const emit = defineEmits<{ complete: [] }>()
const props = defineProps<{ managed?: boolean }>()
let completionTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => { if (!props.managed) completionTimer = setTimeout(() => emit('complete'), 3000) })
onBeforeUnmount(() => { if (completionTimer) clearTimeout(completionTimer) })
</script>

<template>
  <section class="speech-processing"><div class="processing-icon"><AudioLines :size="30" /><LoaderCircle :size="15" class="spinner" /></div><h2>语音合成中</h2></section>
</template>

<style scoped>
.speech-processing{display:flex;flex:1;flex-direction:column;align-items:center;justify-content:center;gap:17px;text-align:center;padding:32px;font-size:14px}.processing-icon{position:relative;display:grid;place-items:center;width:66px;height:66px;border-radius:18px;background:#f5f5f5}.spinner{position:absolute;bottom:6px;right:6px;animation:spin 1.3s linear infinite}.speech-processing h2{font-size:17px;font-weight:500;margin:0}@keyframes spin{to{transform:rotate(360deg)}}
</style>
