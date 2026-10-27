<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Upload, Video, X } from 'lucide-vue-next'
import { listVideoTasks } from '@/composables/useVideoPrototype'
import type { VideoTask } from '@/types/video-generation'
import { formatTime, imageSource, reversePrompts, storyboardSegments, type PrototypeSegment } from './prototype-data'

const props = defineProps<{ initialData?: Record<string, any> }>()
const emit = defineEmits<{ submit: [payload: Record<string, any>] }>()
const sourceVideoUrl = ref(String(props.initialData?.sourceVideoUrl ?? ''))
const sourceTaskId = ref(String(props.initialData?.sourceTaskId ?? ''))
const sourceTaskName = ref(String(props.initialData?.sourceTaskName ?? ''))
const segments = ref<PrototypeSegment[]>(Array.isArray(props.initialData?.segments) && props.initialData?.segments.length
  ? storyboardSegments(props.initialData) : [{ segmentId: '', startTime: 0, endTime: 0, visualDescription: '', referenceImages: [] }])
const imported = ref(!!sourceVideoUrl.value && !!props.initialData?.segments?.length)
const importOpen = ref(false)
const importTasks = ref<VideoTask[]>([])
const selectedTaskId = ref('')
const error = ref('')
const dialog = ref<HTMLElement | null>(null)
const importButton = ref<HTMLButtonElement | null>(null)
const canSubmit = computed(() => sourceVideoUrl.value.trim() !== '' && imported.value)

async function openImport() {
  importTasks.value = listVideoTasks().filter(task => task.operator === 'storyboard' && task.status === 'completed')
  selectedTaskId.value = ''
  importOpen.value = true
  await nextTick()
  dialog.value?.focus()
}
function closeImport() {
  importOpen.value = false
  importButton.value?.focus()
}
function importTask(task: VideoTask) {
  sourceVideoUrl.value = String(task.input.videoUrl ?? task.input.sourceVideoUrl ?? '')
  sourceTaskId.value = task.id
  sourceTaskName.value = task.name
  segments.value = storyboardSegments(task.input, task.name)
  imported.value = true
  error.value = ''
  closeImport()
}
function submit() {
  if (!canSubmit.value) return
  if (segments.value.some(segment => !segment.visualDescription.trim())) {
    error.value = '视觉描述为必填项，请填写'
    return
  }
  emit('submit', { sourceVideoUrl: sourceVideoUrl.value, sourceTaskId: sourceTaskId.value,
    sourceTaskName: sourceTaskName.value, storyboardBundleUrl: null,
    segments: segments.value.map(segment => ({ ...segment, referenceImages: [...segment.referenceImages] })),
    results: reversePrompts(segments.value), prototypeDemo: true })
}
</script>

<template>
  <form class="vp-config" @submit.prevent="submit">
    <div class="vp-config__body vp-reverse-config">
      <section class="vp-config__section">
        <h2 class="vp-config__title">源视频</h2>
        <div class="vp-source-row">
          <button ref="importButton" class="vp-outline" data-testid="reverse-import-btn" type="button" @click="openImport"><Upload :size="16" />从分镜任务导入</button>
          <p class="vp-hint">视频时长要求 4-360 秒</p>
        </div>
        <p v-if="sourceTaskName" class="vp-hint">已导入：{{ sourceTaskName }}</p>
      </section>
      <section class="vp-config__section vp-segments">
        <h2 class="vp-config__title">分镜片段配置 <span class="vp-hint">最多 24 个片段</span></h2>
        <article v-for="(segment, index) in segments" :key="`${segment.segmentId}-${index}`" class="vp-segment" data-testid="segment-card">
          <header class="vp-segment__head"><span class="vp-badge">{{ index + 1 }}</span><span>{{ segment.segmentId }}</span></header>
          <div class="vp-duration-row">
            <label class="vp-field">开始时间（秒）<input class="vp-input vp-input--readonly" :value="segment.startTime" disabled data-testid="segment-start" /></label>
            <label class="vp-field">结束时间（秒）<input class="vp-input vp-input--readonly" :value="segment.endTime" disabled data-testid="segment-end" /></label>
          </div>
          <p class="vp-hint">片段时长要求 4-15 秒</p>
          <label class="vp-field"> <span>视觉描述 <span class="vp-required">*</span></span>
            <textarea :value="segment.visualDescription" class="vp-textarea" rows="3" disabled data-testid="segment-description" placeholder="描述该片段的视觉内容，如：银色咖啡机在清晨厨房完成研磨和萃取" />
          </label>
          <div class="vp-field"><span>参考图片（{{ segment.referenceImages.length }}/9）</span>
            <div v-if="segment.referenceImages.length" class="vp-image-list"><img v-for="(source, imageIndex) in segment.referenceImages" :key="imageIndex" :src="imageSource(source)" :alt="`片段 ${index + 1} 参考图片 ${imageIndex + 1}`" loading="lazy" /></div>
            <p v-else class="vp-placeholder">暂无参考图片</p>
          </div>
        </article>
      </section>
      <p v-if="error" class="vp-error" role="alert">{{ error }}</p>
      <div class="vp-submit-bar"><button class="vp-primary vp-submit" data-testid="reverse-submit" :disabled="!canSubmit" type="submit">开始逆向生成</button></div>
    </div>
    <div v-if="importOpen" class="vp-modal-mask" @click.self="closeImport" @keydown.esc="closeImport">
      <section ref="dialog" tabindex="-1" class="vp-dialog" role="dialog" aria-modal="true" aria-labelledby="vp-import-title" aria-describedby="vp-import-description">
        <header class="vp-dialog__head"><h2 id="vp-import-title">从分镜任务导入</h2><button type="button" class="vp-icon-button" aria-label="关闭导入窗口" @click="closeImport"><X :size="20" /></button></header>
        <p id="vp-import-description" class="vp-hint">选择一个已完成的分镜任务，自动填充分镜片段数据</p>
        <div class="vp-dialog__list">
          <div v-for="task in importTasks" :key="task.id" class="vp-import-task" :class="{ 'vp-import-task--active': selectedTaskId === task.id }" role="button" tabindex="0" data-testid="import-task-item" @click="selectedTaskId = task.id" @keydown.enter.prevent="selectedTaskId = task.id" @keydown.space.prevent="selectedTaskId = task.id">
            <span class="vp-import-task__icon"><Video :size="20" /></span>
            <div class="vp-import-task__info"><strong>{{ task.name }}</strong><span class="vp-hint">{{ storyboardSegments(task.input).length }} 个片段 · {{ formatTime(storyboardSegments(task.input).at(-1)?.endTime ?? 0) }}</span></div>
            <button class="vp-primary" type="button" data-testid="import-confirm" @click.stop="importTask(task)">导入</button>
          </div>
          <p v-if="!importTasks.length" class="vp-empty">暂无已完成的分镜任务</p>
        </div>
        <footer class="vp-dialog__footer"><button class="vp-outline" type="button" @click="closeImport">关闭</button></footer>
      </section>
    </div>
  </form>
</template>

<style scoped>
.vp-config,.vp-result{height:100%;min-height:0;overflow-y:auto;color:#111;font-size:14px;line-height:22px;box-sizing:border-box}
.vp-config__body,.vp-result__body{display:flex;flex-direction:column;width:100%;max-width:800px;margin:0 auto;padding-bottom:20px}
.vp-storyboard-config{gap:32px}.vp-reverse-config{gap:24px}.vp-config__section{display:flex;flex-direction:column;gap:8px}.vp-config__title{display:flex;align-items:center;gap:8px;margin:0;font-size:16px;font-weight:500;line-height:24px}
.vp-input{box-sizing:border-box;width:100%;height:32px;padding:5px 12px;border:1px solid #dfe2e6;border-radius:8px;background:#fff;outline:none;font:inherit;color:#111}.vp-input:focus{border-color:#888}.vp-input::placeholder,.vp-textarea::placeholder{color:#a8a8a8}.vp-outline,.vp-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;box-sizing:border-box;min-height:32px;padding:5px 16px;border:1px solid #dfe2e6;border-radius:8px;font:inherit;line-height:20px;cursor:pointer}.vp-outline{background:#fbfbfb;color:#111}.vp-outline:hover{background:#f5f5f5}.vp-primary{background:#111;color:#fff;border-color:#111}.vp-primary:disabled{background:#a8a8a8;border-color:#a8a8a8;color:#fff;cursor:not-allowed}.vp-upload{width:fit-content}.vp-file{display:none}.vp-video{width:100%;aspect-ratio:16/9;background:#111;border-radius:8px}.vp-duration-row{display:flex;gap:16px}.vp-field{display:flex;flex-direction:column;gap:8px;flex:1;min-width:0;font-size:14px;font-weight:400;line-height:22px}.vp-number{display:flex;align-items:center;height:32px;border:1px solid #dfe2e6;border-radius:8px;padding:0 12px;gap:10px;box-sizing:border-box}.vp-number input{flex:1;min-width:0;width:100%;border:0;outline:0;background:transparent;font:inherit;color:#111}.vp-number>span{color:#666;flex-shrink:0}.vp-hint{margin:0;color:#999;font-size:12px;font-weight:400;line-height:18px}.vp-error{margin:0;color:#dc3b3b;font-size:13px;line-height:20px}.vp-submit{width:100%;height:36px;font-weight:500}.vp-source-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.vp-segments{gap:12px}.vp-segment{display:flex;flex-direction:column;gap:8px}.vp-segment+.vp-segment{margin-top:8px}.vp-segment__head{display:flex;align-items:center;gap:8px;font-weight:500}.vp-badge{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;box-sizing:border-box;border-radius:8px;background:#111;color:#fff;font-size:14px;font-weight:400;flex-shrink:0}.vp-input--readonly,.vp-input:disabled{background:#f7f7f9;color:#a8a8a8;opacity:1}.vp-required{color:#f15b5b}.vp-textarea{box-sizing:border-box;width:100%;height:90px;min-height:90px;resize:none;padding:12px 16px;background:#f7f7f9;border:1px solid #dfe2e6;border-radius:8px;color:#999;font:inherit;line-height:22px}.vp-textarea:disabled{opacity:1}.vp-image-list{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.vp-image-list img{width:80px;height:80px;border-radius:8px;object-fit:cover}.vp-placeholder{margin:0;color:#aaa}.vp-submit-bar{position:sticky;bottom:0;display:flex;align-items:flex-end;min-height:68px;background:#fff;margin-top:-8px;padding-bottom:0}.vp-modal-mask{position:fixed;inset:0;background:#0006;z-index:1500;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}.vp-dialog{width:min(740px,100%);max-height:calc(100vh - 32px);display:flex;flex-direction:column;gap:8px;box-sizing:border-box;background:#fff;border-radius:16px;padding:17px 24px 16px;outline:none}.vp-dialog__head{display:flex;align-items:center;justify-content:space-between;gap:12px}.vp-dialog__head h2{margin:0;font-size:18px;font-weight:500;line-height:26px}.vp-icon-button{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border:0;background:transparent;color:#666;border-radius:8px;cursor:pointer;flex-shrink:0}.vp-icon-button:hover{background:#f2f2f2}.vp-dialog__list{height:min(560px,60vh);min-height:160px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;margin:9px -24px 0;padding:24px;border-top:1px solid #e8e8e8;border-bottom:1px solid #e8e8e8}.vp-import-task{display:flex;align-items:center;gap:12px;min-height:72px;padding:0 16px;border:1px solid #e5e5e5;border-radius:12px;cursor:pointer;box-sizing:border-box}.vp-import-task--active{border-color:#111}.vp-import-task__icon{width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:#f7f7f7;border-radius:8px;flex-shrink:0}.vp-import-task__info{display:flex;flex:1;min-width:0;flex-direction:column}.vp-import-task__info strong{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vp-dialog__footer{display:flex;justify-content:flex-end;padding-top:8px}.vp-empty{display:flex;align-items:center;justify-content:center;flex:1;margin:0;color:#999;min-height:140px}.vp-demo{display:inline-flex;align-items:center;width:fit-content;padding:2px 8px;border:1px solid #e6e6e6;border-radius:6px;background:#f7f7f9;color:#666;font-size:12px;line-height:18px}.vp-result__head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.vp-result__body{gap:12px}.vp-result__note{margin:-4px 0 0;color:#999;font-size:12px;line-height:18px}
.vp-result__count{margin:0;font-size:16px;font-weight:500;line-height:24px}.vp-timeline{display:flex;gap:8px;width:100%;overflow-x:auto}.vp-timeline__segment{display:flex;align-items:center;justify-content:center;flex-basis:0;min-width:80px;height:28px;padding:0 12px;border:0;border-radius:8px;background:#f7f7f9;color:#666;font:inherit;white-space:nowrap;cursor:pointer}.vp-timeline__segment--active{background:#111;color:#fff}.vp-shot{border:1px solid #e5e5e5;border-radius:12px;padding:16px;cursor:pointer}.vp-shot--active{border-color:#111}.vp-shot__head{display:flex;align-items:center;gap:12px;font-size:13px;line-height:22px}.vp-divider{display:inline-block;width:1px;height:12px;background:#e6e6e6;flex-shrink:0}.vp-shot__duration{margin-left:auto}.vp-shot__row{display:flex;gap:8px;margin:8px 0 0}.vp-shot__label{flex-shrink:0;color:#999}.vp-drawer-mask{position:fixed;inset:0;background:#0005;z-index:1500;display:flex;justify-content:flex-end}.vp-drawer{width:min(640px,100vw);height:100%;display:flex;flex-direction:column;background:#fff;box-shadow:-16px 1px 32px -16px #0003;outline:none}.vp-drawer__head{display:flex;align-items:center;justify-content:space-between;min-height:64px;padding:0 24px}.vp-drawer__head h2{font-size:16px;line-height:24px;font-weight:500;margin:0}.vp-drawer__tabs{display:flex;gap:8px;padding:16px 24px 8px;overflow-x:auto;flex-shrink:0}.vp-drawer__tabs button{display:inline-flex;align-items:center;gap:4px;padding:3px 12px;border:0;border-radius:6px;background:transparent;color:#666;font:inherit;white-space:nowrap;cursor:pointer}.vp-drawer__tabs button>span{font-size:12px;color:#999}.vp-drawer__tabs .vp-drawer__tab--active{background:#f7f7f9;color:#111;font-weight:500}.vp-drawer__body{flex:1;min-height:0;display:flex;flex-direction:column;gap:12px;overflow-y:auto;padding:8px 24px 24px}.vp-script{flex-shrink:0;border:1px solid #e6e6e6;border-radius:12px;padding-bottom:14px;overflow:hidden}.vp-script__head{display:flex;align-items:center;gap:8px;min-height:48px;padding:0 16px;background:#fafafa;border-bottom:1px solid #e6e6e6}.vp-script__head strong{font-size:14px;font-weight:500}.vp-script__time{display:flex;align-items:center;gap:12px;font-size:13px;color:#666;margin-left:auto}.vp-script__body{display:flex;flex-direction:column;gap:8px;margin:16px 16px 0}.vp-script__row{display:flex;gap:8px;margin:0}.vp-script__row>span:first-child{flex:0 0 70px;color:#999;text-align:right}.vp-script__row>span:last-child{min-width:0;overflow-wrap:anywhere}.vp-script__expand{display:flex;align-items:center;gap:4px;width:100%;padding:14px 16px 0;border:0;border-top:1px solid #e6e6e6;margin-top:16px;background:transparent;font:inherit;font-size:12px;color:#999;cursor:pointer}.vp-script__prompt{margin:8px 16px 2px;white-space:pre-line}.vp-asset-card{padding:16px;border:1px solid #e5e5e5;border-radius:12px}.vp-asset-card header{display:flex;align-items:center;gap:8px}.vp-asset-card strong{font-size:14px;font-weight:500}.vp-asset-card p{margin:12px 0 0}.vp-asset-placeholder{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:160px;height:160px;margin-top:8px;background:#f7f7f9;color:#aaa;border-radius:8px}.vp-asset-image-button{border:0;padding:0;background:transparent;margin-top:8px;cursor:zoom-in}.vp-asset-image-button img{width:160px;height:160px;object-fit:cover;border-radius:8px}.vp-image-mask{position:fixed;inset:0;z-index:1600;background:#0009;display:flex;align-items:center;justify-content:center}.vp-image-mask>img{max-width:80vw;max-height:80vh;border-radius:8px;object-fit:contain}.vp-image-close{position:absolute;top:16px;right:16px;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border:0;border-radius:8px;background:#fff;color:#666;cursor:pointer}.vp-prompt-card{border:1px solid #e6e6e6;border-radius:12px;background:#fff;overflow:hidden}.vp-prompt-card__head{display:flex;align-items:center;gap:8px;height:48px;padding:0 16px;background:#fafafa}.vp-prompt-card__head strong{font-size:14px;font-weight:500;white-space:nowrap}.vp-prompt-card__id{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vp-prompt-card__copy{display:flex;align-items:center;justify-content:center;width:24px;height:24px;margin-left:auto;flex-shrink:0;border:0;border-radius:6px;background:#ededed;color:#666;cursor:pointer}.vp-prompt-card__body{display:flex;flex-direction:column;gap:8px;padding:16px}.vp-prompt-row{display:flex;gap:8px;min-width:0}.vp-prompt-row__label{flex:0 0 84px;text-align:right;color:#999}.vp-prompt-row>p{flex:1;min-width:0;margin:0;white-space:pre-line;overflow-wrap:anywhere}.vp-reference-button{display:block;border:0;padding:0;background:transparent;cursor:zoom-in}.vp-reference-button img{display:block}
@media(max-width:600px){.vp-duration-row{gap:10px}.vp-config__title{flex-wrap:wrap}.vp-dialog{padding:16px}.vp-dialog__list{margin:8px -16px 0;padding:16px}.vp-import-task{padding:8px;gap:8px}.vp-import-task__icon{display:none}.vp-outline{padding-left:12px;padding-right:12px}.vp-drawer__tabs{padding:8px 16px;gap:4px}.vp-drawer__tabs button{padding:3px 8px}.vp-drawer__body{padding:8px 16px 16px}.vp-script__time{gap:6px;font-size:12px}.vp-script__head{padding:0 12px;gap:6px}.vp-prompt-row{flex-direction:column}.vp-prompt-row__label{flex:auto;text-align:left}.vp-shot__head{gap:8px}}

</style>
