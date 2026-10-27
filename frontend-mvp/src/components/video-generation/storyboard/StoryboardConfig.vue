<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Upload } from 'lucide-vue-next'
import { listVideoTasks } from '@/composables/useVideoPrototype'
import { getLocalVideoPreview, registerLocalVideo, releaseLocalVideo } from './local-preview'
import { storyboardSegments } from './prototype-data'

const props = defineProps<{ initialData?: Record<string, any> }>()
const emit = defineEmits<{ submit: [payload: Record<string, any>] }>()
const videoUrl = ref(String(props.initialData?.videoUrl ?? ''))
const minDuration = ref(props.initialData?.minDuration ?? 4)
const maxDuration = ref(props.initialData?.maxDuration ?? 14)
const fileName = ref(String(props.initialData?.fileName ?? ''))
const fileSize = ref(Number(props.initialData?.fileSize ?? 0))
const localVideo = ref(!!props.initialData?.localVideo)
const fileInput = ref<HTMLInputElement | null>(null)
const error = ref('')
const playbackFailed = ref(false)
let ownedSourceId = ''
const previewUrl = computed(() => localVideo.value ? getLocalVideoPreview(videoUrl.value) : videoUrl.value)
const sourceDisplay = computed({
  get: () => localVideo.value ? fileName.value : videoUrl.value,
  set: (value: string) => {
    videoUrl.value = value
    localVideo.value = false
    fileName.value = ''
    fileSize.value = 0
  },
})
const canSubmit = computed(() => videoUrl.value.trim() !== '' && Number(minDuration.value) >= 4
  && Number(minDuration.value) <= 14 && Number(maxDuration.value) >= 5 && Number(maxDuration.value) <= 15
  && Number.isInteger(Number(minDuration.value)) && Number.isInteger(Number(maxDuration.value))
  && Number(maxDuration.value) > Number(minDuration.value))

watch(videoUrl, value => {
  playbackFailed.value = false
  error.value = ''
  if (ownedSourceId && value !== ownedSourceId) {
    releaseLocalVideo(ownedSourceId)
    ownedSourceId = ''
  }
})
onBeforeUnmount(() => {
  if (ownedSourceId && !listVideoTasks().some(task => task.input.videoUrl === ownedSourceId || task.input.sourceVideoUrl === ownedSourceId)) {
    releaseLocalVideo(ownedSourceId)
  }
})

function selectVideo(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  error.value = ''
  if (!/\.(mov|mp4)$/i.test(file.name)) error.value = '仅支持 .mov / .mp4 格式'
  else if (file.size > 100 * 1024 * 1024) error.value = '文件大小不能超过 100MB'
  else {
    if (ownedSourceId) releaseLocalVideo(ownedSourceId)
    ownedSourceId = registerLocalVideo(file)
    videoUrl.value = ownedSourceId
    fileName.value = file.name
    fileSize.value = file.size
    localVideo.value = true
  }
  target.value = ''
}
function submit() {
  if (!canSubmit.value) return
  const payload = {
    videoUrl: videoUrl.value.trim(), minDuration: Math.floor(Number(minDuration.value)),
    maxDuration: Math.floor(Number(maxDuration.value)), fileName: fileName.value,
    fileSize: fileSize.value, localVideo: localVideo.value, prototypeDemo: true,
  }
  emit('submit', { ...payload, segments: storyboardSegments(payload) })
}
</script>

<template>
  <form class="vp-config" @submit.prevent="submit">
    <div class="vp-config__body vp-storyboard-config">
      <section class="vp-config__section">
        <h2 class="vp-config__title">原视频</h2>
        <input v-model="sourceDisplay" class="vp-input" data-testid="video-url-input" aria-label="原视频链接" placeholder="粘贴视频链接，当前仅支持1个视频" />
        <button class="vp-outline vp-upload" type="button" @click="fileInput?.click()"><Upload :size="16" />本地上传</button>
        <input ref="fileInput" class="vp-file" type="file" accept=".mov,.mp4" data-testid="video-file-input" aria-label="上传本地视频" @change="selectVideo" />
        <p v-if="localVideo" class="vp-hint">{{ fileName }} · 本地视频仅供当前页面预览</p>
        <video v-if="previewUrl" :src="previewUrl" controls playsinline class="vp-video" @error="playbackFailed = true" />
        <p v-else-if="localVideo" class="vp-hint" role="status">重新选择本地视频后预览，任务配置仍可继续使用。</p>
        <p v-if="playbackFailed" class="vp-hint" role="status">视频暂时无法播放，请检查链接或改用 MP4（H.264）格式重新上传；仍可提交拆解任务。</p>
      </section>
      <section class="vp-config__section">
        <h2 class="vp-config__title">分段时长</h2>
        <div class="vp-duration-row">
          <label class="vp-field">最短<span class="vp-number"><input v-model.number="minDuration" type="number" min="4" max="14" step="1" data-testid="min-duration" /><span>秒</span></span></label>
          <label class="vp-field">最长<span class="vp-number"><input v-model.number="maxDuration" type="number" min="5" max="15" step="1" data-testid="max-duration" /><span>秒</span></span></label>
        </div>
        <p class="vp-hint">最短时长限制大于等于4；最长时长限制大于等于5且小于等于15</p>
        <p v-if="videoUrl && Number(maxDuration) <= Number(minDuration)" class="vp-error">最长时长必须大于最短时长</p>
      </section>
      <p v-if="error" class="vp-error" role="alert">{{ error }}</p>
      <button class="vp-primary vp-submit" data-testid="storyboard-submit" :disabled="!canSubmit" type="submit">开始拆解</button>
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
