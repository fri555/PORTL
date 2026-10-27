<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, ArrowRight, Columns2, Download, Maximize, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-vue-next'
import type { MaterialTask } from './useMaterialTasks'

const props = defineProps<{ task: MaterialTask }>()
const emit = defineEmits<{ close: [] }>()
const overlay = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const scale = ref(1)
const rotation = ref(0)
const comparison = ref(false)
const sourceIndex = ref(0)
const message = ref('')
const source = computed(() => props.task.images[sourceIndex.value])
let previousFocus: HTMLElement | null = null

function download() {
  if (!props.task.resultImage) return
  const anchor = document.createElement('a')
  anchor.href = props.task.resultImage
  anchor.download = `${props.task.materialName}-原型演示.${props.task.resultImage.startsWith('data:image/svg') ? 'svg' : 'png'}`
  anchor.click()
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else if (stage.value?.requestFullscreen) await stage.value.requestFullscreen()
    else message.value = '当前浏览器暂不支持全屏预览'
  } catch { message.value = '当前浏览器暂不支持全屏预览' }
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); emit('close') }
  if (event.key === 'ArrowLeft' && comparison.value) sourceIndex.value = Math.max(0, sourceIndex.value - 1)
  if (event.key === 'ArrowRight' && comparison.value) sourceIndex.value = Math.min(props.task.images.length - 1, sourceIndex.value + 1)
  if (event.key === 'Tab' && overlay.value) {
    const controls = Array.from(overlay.value.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && (document.activeElement === first || document.activeElement === overlay.value)) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }
}
onMounted(async () => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  window.addEventListener('keydown', keydown)
  await nextTick()
  overlay.value?.focus()
})
onBeforeUnmount(() => { window.removeEventListener('keydown', keydown); previousFocus?.focus() })
</script>

<template>
  <div ref="overlay" class="image-preview" tabindex="-1" role="dialog" aria-modal="true" aria-label="图片预览">
    <div v-if="comparison && source" class="compare-panel">
      <span class="panel-label">源图</span><div class="compare-main"><img :src="source.url" :alt="source.name" /></div>
      <div class="source-strip"><button v-for="(image, index) in task.images" :key="index" type="button" :class="{ active: sourceIndex === index }" :aria-label="`查看源图 ${index + 1}`" @click="sourceIndex = index"><img :src="image.url" :alt="image.name" /></button></div>
    </div>
    <div ref="stage" class="preview-stage" @click.self="emit('close')">
      <div class="preview-label">{{ task.materialName }} <span>原型演示</span></div>
      <img :src="task.resultImage" :alt="`${task.materialName} 提取结果（原型演示）`" data-testid="preview-image" class="preview-image" :style="{ transform: `scale(${scale}) rotate(${rotation}deg)` }" />
      <button type="button" class="close-preview" aria-label="关闭图片预览" @click="emit('close')"><X :size="22" /></button>
      <button v-if="comparison" type="button" class="image-nav previous" aria-label="上一张源图" :disabled="sourceIndex === 0" @click="sourceIndex--"><ArrowLeft :size="20" /></button>
      <button v-if="comparison" type="button" class="image-nav next" aria-label="下一张源图" :disabled="sourceIndex >= task.images.length - 1" @click="sourceIndex++"><ArrowRight :size="20" /></button>
      <div class="preview-toolbar" role="toolbar" aria-label="图片预览操作">
        <button type="button" aria-label="对比源图" title="对比源图" :disabled="!task.images.length" :class="{ active: comparison }" @click="comparison = !comparison"><Columns2 :size="17" /></button><span class="divider" />
        <button type="button" aria-label="缩小" title="缩小" :disabled="scale <= .25" @click="scale = Math.max(.25, scale - .25)"><ZoomOut :size="18" /></button><span class="scale">{{ Math.round(scale * 100) }}%</span>
        <button type="button" aria-label="放大" title="放大" :disabled="scale >= 5" @click="scale = Math.min(5, scale + .25)"><ZoomIn :size="18" /></button>
        <button type="button" aria-label="左旋转" title="左旋转" @click="rotation -= 90"><RotateCcw :size="17" /></button><button type="button" aria-label="右旋转" title="右旋转" @click="rotation += 90"><RotateCw :size="17" /></button>
        <button type="button" aria-label="全屏" title="全屏" @click="fullscreen"><Maximize :size="17" /></button><button type="button" aria-label="下载图片" title="下载图片" @click="download"><Download :size="17" /></button>
      </div>
      <p v-if="message" class="preview-message" role="status">{{ message }}</p>
    </div>
  </div>
</template>

<style scoped>
.image-preview{position:fixed;inset:0;z-index:1100;display:flex;background:#111d;color:white;outline:none}.preview-stage{position:relative;flex:1;display:flex;align-items:center;justify-content:center;min-width:0;overflow:hidden;background:#111d}.preview-stage:fullscreen{background:#111}.preview-image{max-width:85%;max-height:80%;object-fit:contain;user-select:none;transition:transform .15s ease}.preview-label{position:absolute;top:25px;left:28px;display:flex;align-items:center;gap:12px;font-size:14px;color:#fff}.preview-label span{font-size:11px;border:1px solid #ffffff38;border-radius:4px;padding:2px 6px;color:#fff9}.close-preview,.image-nav,.preview-toolbar button{display:flex;align-items:center;justify-content:center;border:0;color:#fff;cursor:pointer}.close-preview{position:absolute;right:24px;top:18px;width:36px;height:36px;border-radius:6px;background:#0009}.image-nav{position:absolute;top:50%;width:40px;height:40px;border-radius:6px;background:#1119}.previous{left:20px}.next{right:20px}.preview-toolbar{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:4px;padding:5px 8px;border-radius:8px;background:#111c}.preview-toolbar button{width:32px;height:32px;padding:0;border-radius:6px;background:none}.preview-toolbar button:hover,.preview-toolbar button.active{background:#ffffff30}.preview-toolbar button:disabled,.image-nav:disabled{opacity:.3;cursor:not-allowed}.preview-toolbar .scale{font-size:11px;color:#fffc;min-width:34px;text-align:center}.divider{height:16px;width:1px;background:#fff3;margin:0 3px}.compare-panel{flex:0 0 45%;display:flex;flex-direction:column;position:relative;min-width:0;border-right:1px solid #fff3;background:#252525}.compare-main{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:32px}.compare-main>img{max-width:100%;max-height:100%;object-fit:contain}.panel-label{position:absolute;left:20px;top:25px;font-size:14px;color:#fff9}.source-strip{display:flex;gap:8px;padding:12px;overflow:auto;background:#1119}.source-strip button{width:56px;height:56px;padding:0;flex-shrink:0;border:2px solid transparent;border-radius:4px;overflow:hidden;background:none;cursor:pointer}.source-strip button.active{border-color:#fff}.source-strip img{width:100%;height:100%;object-fit:cover}.preview-message{position:absolute;bottom:78px;left:50%;transform:translateX(-50%);font-size:12px;color:white}@media(max-width:680px){.compare-panel{flex-basis:38%}.preview-toolbar{gap:1px;padding:4px}.preview-toolbar button{width:27px}.preview-toolbar .scale{display:none}.preview-label{left:16px;top:25px;max-width:75%;font-size:12px}.preview-label span{display:none}}
</style>
