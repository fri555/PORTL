<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowRight, ChevronDown, Copy, Download, Film, ImageOff, Pause, Play, SlidersHorizontal } from 'lucide-vue-next'
import type { VideoTask } from '@/types/video-generation'
import { createElementReplacementInput, getReplacementMediaUrl, replacementModelLabels } from '@/composables/useElementReplacement'
import { useComparisonPlayback } from './useComparisonPlayback'
import { composeReplacementPrompt } from '@/utils/elementReplacementPrompt'

const props = defineProps<{ task: VideoTask }>()
const input = computed(() => createElementReplacementInput(props.task.input))
const isLiveTask = computed(() => props.task.input.prototypeDemo === false)
const recordedSettings = computed<Record<string, unknown>>(() => {
  const settings = props.task.input.settings
  return settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {}
})
const resultModelLabels = new Map(Object.entries({ ...replacementModelLabels, 'seedance-2.5': 'Seedance 2.5' }))
const resultResolutionLabels = new Map(Object.entries({ '480p': '480P', '720p': '720P', '1080p': '1080P', '4k': '4K' }))
const recordedModelLabel = computed(() => {
  const model = (isLiveTask.value ? props.task.remoteJob?.result?.model : undefined) || recordedSettings.value.model
  if (typeof model !== 'string' || !model.trim()) return '未记录模型'
  const deployed = /^doubao-seedance-2-0(?:-(fast|mini))?-\d+$/.exec(model)
  const alias = deployed ? `seedance-2.0${deployed[1] ? `-${deployed[1]}` : ''}` : model
  return resultModelLabels.get(alias) ?? model
})
const recordedResolutionLabel = computed(() => {
  const resolution = (isLiveTask.value ? props.task.remoteJob?.result?.resolution : undefined) || recordedSettings.value.resolution
  return typeof resolution === 'string' && resolution.trim() ? resultResolutionLabels.get(resolution.toLowerCase()) ?? resolution : '未记录分辨率'
})
const sourceMedia = computed(() => input.value.sourceVideo)
const resultMedia = computed(() => input.value.resultVideo ?? (isLiveTask.value ? null : sourceMedia.value))
const sourceUrl = computed(() => getReplacementMediaUrl(sourceMedia.value))
const resultUrl = computed(() => getReplacementMediaUrl(resultMedia.value))
const outputAddress = computed(() => {
  if (!resultUrl.value || /^https?:\/\//i.test(resultUrl.value)) return resultUrl.value
  try { return new URL(resultUrl.value, window.location.href).href } catch { return resultUrl.value }
})
const usesOriginal = computed(() => !isLiveTask.value && (input.value.resultUsesOriginal || !input.value.resultVideo
  || (!!sourceUrl.value && sourceUrl.value === resultUrl.value)))
const lastFrameUrl = computed(() => {
  const url = props.task.remoteJob?.result?.lastFrameUrl
  return isLiveTask.value && typeof url === 'string' && /^https?:\/\//i.test(url)
    ? getReplacementMediaUrl({ id: 'result-last-frame', kind: 'image', source: 'url', name: '尾帧', url }) : ''
})
const lastFrameDownloadName = computed(() => {
  const extension = lastFrameUrl.value ? new URL(lastFrameUrl.value).pathname.match(/\.(?:png|jpe?g|webp)$/i)?.[0] ?? '' : ''
  return `${props.task.name}-尾帧${extension}`
})
const originalPlayer = ref<HTMLVideoElement | null>(null)
const resultPlayer = ref<HTMLVideoElement | null>(null)
const comparison = useComparisonPlayback(originalPlayer, resultPlayer)
const playback = comparison.state
const detailsOpen = ref(false)
const measuredOriginal = ref(0)
const measuredResult = ref(0)
const originalSize = ref({ width: 0, height: 0 })
const resultSize = ref({ width: 0, height: 0 })
const sourceResolution = computed(() => originalSize.value.width && originalSize.value.height ? `${Math.min(originalSize.value.width, originalSize.value.height)}p` : '—')
const outputResolution = computed(() => {
  if (resultSize.value.width && resultSize.value.height) return `${Math.min(resultSize.value.width, resultSize.value.height)}p`
  const returned = isLiveTask.value ? props.task.remoteJob?.result?.resolution : undefined
  return typeof returned === 'string' && returned.trim() ? returned.trim().toLowerCase() : '—'
})
const outputWidth = computed(() => resultSize.value.width > 0 ? `${resultSize.value.width}px` : '—')
const copyStatus = ref<'idle' | 'copied' | 'failed'>('idle')
const originalDuration = computed(() => playback.value.originalDuration || measuredOriginal.value)
const resultDuration = computed(() => playback.value.resultDuration || measuredResult.value)
const bothAvailable = computed(() => !!sourceUrl.value && !!resultUrl.value)
const canSynchronize = computed(() => bothAvailable.value && playback.value.commonDuration > 0)
const replacementTypeLabel = computed(() => ({ person: '模特', product: '商品', background: '场景' }[input.value.replacementType]))
const finalPrompt = computed(() => composeReplacementPrompt(input.value.replacementType, input.value.groups.map(group => group.description), input.value.preservePrompt))
const detailMappings = computed(() => input.value.groups.map((group, index) => ({
  key: group.id,
  index: index + 1,
  description: group.description.trim() || '未填写',
  referenceUrl: getReplacementMediaUrl(group.reference),
  referenceName: group.reference?.name ?? '参考图',
})))
const configRows = computed(() => [
  { label: '替换类型', value: replacementTypeLabel.value },
  { label: '原视频', value: sourceMedia.value ? `${sourceMedia.value.name}（${sourceMedia.value.url}）` : '未指定' },
  { label: '模型', value: recordedModelLabel.value },
  { label: '分辨率', value: recordedResolutionLabel.value },
  { label: '画面比例', value: input.value.settings.ratio === 'adaptive' ? '自适应比例' : input.value.settings.ratio },
  { label: '同步音频', value: input.value.settings.generateAudio ? '生成' : '不生成' },
])
const downloadName = computed(() => {
  const name = usesOriginal.value ? `原型演示-${sourceMedia.value?.name || props.task.name}` : resultMedia.value?.name || props.task.name
  return /\.(mp4|mov)$/i.test(name) ? name : `${name}.mp4`
})
const isLocalSource = computed(() => sourceMedia.value?.url.startsWith('local-video:') || sourceMedia.value?.source === 'upload')
const isLocalResult = computed(() => resultMedia.value?.url.startsWith('local-video:') || resultMedia.value?.source === 'upload')

function measure(which: 'original' | 'result', event: Event) {
  const video = event.target as HTMLVideoElement
  const duration = video.duration
  const value = Number.isFinite(duration) && duration > 0 ? duration : 0
  const dimensions = { width: Number.isFinite(video.videoWidth) && video.videoWidth > 0 ? video.videoWidth : 0, height: Number.isFinite(video.videoHeight) && video.videoHeight > 0 ? video.videoHeight : 0 }
  if (which === 'original') { measuredOriginal.value = value; originalSize.value = dimensions }
  else { measuredResult.value = value; resultSize.value = dimensions }
}
function togglePlayback() {
  if (playback.value.playing || playback.value.busy) comparison.pause()
  else void comparison.play()
}
function keepResultMuted(event: Event) {
  const video = event.target as HTMLVideoElement
  if (!video.muted) video.muted = true
}
async function copyOutputAddress() {
  if (!outputAddress.value) return
  copyStatus.value = 'idle'
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(outputAddress.value)
    copyStatus.value = 'copied'
  } catch { copyStatus.value = 'failed' }
}
watch(sourceUrl, () => { measuredOriginal.value = 0; originalSize.value = { width: 0, height: 0 } })
watch(resultUrl, () => { measuredResult.value = 0; resultSize.value = { width: 0, height: 0 }; copyStatus.value = 'idle' })
</script>

<template>
  <section class="replacement-result">
    <div class="replacement-result__toolbar">
      <button class="comparison-play" :disabled="!canSynchronize" data-testid="comparison-play" type="button" :aria-label="playback.playing || playback.busy ? '暂停两侧视频' : '播放两侧视频'" @click="togglePlayback"><Pause v-if="playback.playing || playback.busy" :size="14" /><Play v-else :size="14" /><span>{{ playback.playing || playback.busy ? '暂停播放' : playback.status === 'play-rejected' ? '重试同步播放' : '同步播放' }}</span></button>
      <p v-if="isLiveTask && !resultUrl" class="replacement-result__notice">本次任务尚未返回可用的结果视频</p>
    </div>

    <div class="replacement-result__players">
      <article class="comparison-card">
        <header><h2>原始视频</h2></header>
        <div class="comparison-card__viewport">
          <video v-if="sourceUrl" ref="originalPlayer" :src="sourceUrl" :poster="sourceMedia?.poster" controls playsinline preload="metadata" aria-label="原视频播放器" @loadedmetadata="measure('original', $event)" @durationchange="measure('original', $event)" @resize="measure('original', $event)" />
          <div v-else class="comparison-card__empty" role="status"><Film :size="32" /><strong>{{ isLocalSource ? '本地视频预览已失效' : '原视频暂不可用' }}</strong><p>请调整配置并重新选择视频</p></div>
        </div>
      </article>

      <article class="comparison-card">
        <header><h2>替换结果</h2><span v-if="outputResolution !== '—'" class="result-resolution-badge" data-testid="result-resolution-badge">{{ outputResolution }}</span></header>
        <div class="comparison-card__viewport">
          <video v-if="resultUrl" ref="resultPlayer" :src="resultUrl" :poster="resultMedia?.poster" controls muted playsinline preload="metadata" aria-label="替换结果播放器" @loadedmetadata="measure('result', $event)" @durationchange="measure('result', $event)" @resize="measure('result', $event)" @volumechange="keepResultMuted" />
          <div v-else class="comparison-card__empty" role="status"><Film :size="32" /><strong>{{ isLocalResult ? '本地视频预览已失效' : '结果视频暂不可用' }}</strong><p>{{ isLiveTask ? '请返回列表重新查询任务状态' : '请调整配置并重新选择视频' }}</p></div>
        </div>
      </article>
    </div>

    <div class="replacement-output">
      <label for="replacement-output-address">输出地址</label>
      <input id="replacement-output-address" aria-label="输出地址" :value="outputAddress" readonly placeholder="—" />
      <button class="replacement-button" data-testid="replacement-copy" type="button" :disabled="!outputAddress" @click="copyOutputAddress"><Copy :size="13" />复制</button>
      <a class="replacement-button" :class="{ 'replacement-button--disabled': !resultUrl }" data-testid="replacement-download" :href="outputAddress || undefined" :download="downloadName" target="_blank" rel="noopener noreferrer" :aria-disabled="!resultUrl" @click="!resultUrl && $event.preventDefault()"><Download :size="13" />下载</a>
      <a v-if="lastFrameUrl" class="replacement-button" data-testid="replacement-last-frame-download" :href="lastFrameUrl" :download="lastFrameDownloadName" target="_blank" rel="noopener noreferrer"><Download :size="13" />下载尾帧</a>
    </div>
    <p v-if="copyStatus !== 'idle'" class="replacement-feedback" :class="{ 'replacement-feedback--error': copyStatus === 'failed' }" :role="copyStatus === 'failed' ? 'alert' : 'status'">{{ copyStatus === 'failed' ? '复制失败，请手动选中输出地址复制' : '已复制输出地址' }}</p>
    <p v-if="playback.message" class="replacement-feedback" :class="{ 'replacement-feedback--error': playback.status === 'error' || playback.status === 'play-rejected' }" role="status">{{ playback.message }}</p>

    <section class="replacement-details">
      <button class="replacement-details__toggle" data-testid="replacement-details-toggle" type="button" :aria-expanded="detailsOpen" @click="detailsOpen = !detailsOpen"><SlidersHorizontal :size="18" /><strong>本次替换配置</strong><span>{{ replacementTypeLabel }} · {{ input.groups.length }} 组 · {{ recordedResolutionLabel }}</span><ChevronDown :size="17" :class="{ expanded: detailsOpen }" /></button>
      <div v-if="detailsOpen" class="replacement-details__body" data-testid="replacement-details">
        <section class="replacement-details__block" data-testid="replacement-detail-mappings">
          <h4>元素替换</h4>
          <div v-for="mapping in detailMappings" :key="mapping.key" class="replacement-detail-mapping" data-testid="replacement-detail-mapping">
            <span class="replacement-detail-mapping__index">{{ mapping.index }}</span>
            <p class="replacement-detail-mapping__source">{{ mapping.description }}</p>
            <ArrowRight class="replacement-detail-mapping__arrow" :size="18" :stroke-width="1.5" />
            <div class="replacement-detail-mapping__target">
              <img v-if="mapping.referenceUrl" :src="mapping.referenceUrl" :alt="mapping.referenceName" />
              <ImageOff v-else :size="20" :stroke-width="1.2" aria-label="参考图暂不可用" />
            </div>
          </div>
        </section>
        <section class="replacement-details__block" data-testid="replacement-detail-final-prompt">
          <h4>完整提示词</h4>
          <p>{{ finalPrompt }}</p>
        </section>
        <section class="replacement-details__block" data-testid="replacement-detail-config">
          <h4>配置项</h4>
          <dl class="replacement-details__config">
            <div v-for="row in configRows" :key="row.label" data-testid="replacement-detail-row"><dt>{{ row.label }}</dt><dd>{{ row.value }}</dd></div>
          </dl>
        </section>
      </div>
    </section>
  </section>
</template>

<style scoped>
.replacement-result{box-sizing:border-box;width:100%;max-width:1280px;margin:0 auto;padding:0 24px 28px;display:flex;flex-direction:column;gap:20px;color:#151515;font-size:14px;line-height:22px}.replacement-result button,.replacement-result a{font:inherit}.replacement-result__intro{display:flex;align-items:center;justify-content:space-between;gap:16px}.replacement-result__intro h1{margin:0;font-size:20px;line-height:28px;font-weight:600}.replacement-result__intro p{margin:4px 0 0;color:#888;font-size:12px;line-height:20px}.replacement-result__demo{flex-shrink:0;padding:2px 8px;border-radius:5px;border:1px solid #e9e9ec;background:#f7f7f9;color:#888;font-size:12px}.replacement-result__players{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.comparison-card{min-width:0;overflow:hidden;padding:18px;border:1px solid #e6e9ed;background:#fff;border-radius:12px}.comparison-card header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.comparison-card h2{margin:0;font-size:18px;font-weight:600;line-height:26px;white-space:nowrap}.comparison-card header>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#888;font-size:12px}.comparison-card__viewport{display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:16/10;overflow:hidden;border:1px solid #e9ebee;border-radius:8px;background:#f6f7f9}.comparison-card video{display:block;width:100%;height:100%;object-fit:contain;background:#f6f7f9}.comparison-card__empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;color:#a3a5a9;text-align:center}.comparison-card__empty strong{font-size:14px;font-weight:500;color:#777}.comparison-card__empty p{margin:0;font-size:12px}.comparison-card footer{display:flex;align-items:center;gap:8px;margin-top:12px;color:#999;font-size:12px;line-height:18px}.comparison-card footer strong{font-weight:400;color:#666}.comparison-controls{padding:16px 18px;border:1px solid #e6e9ed;border-radius:12px;background:#fff}.comparison-controls__head{display:flex;align-items:center;justify-content:space-between;gap:12px}.sync-toggle{display:inline-flex;align-items:center;gap:8px;padding:0;border:0;background:transparent;color:#777;cursor:pointer}.sync-toggle--active{color:#222}.sync-toggle i{position:relative;display:inline-block;width:30px;height:18px;margin-left:4px;border-radius:12px;background:#d5d6d9;transition:background .15s}.sync-toggle i:after{content:'';position:absolute;top:3px;left:3px;width:12px;height:12px;border-radius:50%;background:white;transition:transform .15s}.sync-toggle--active i{background:#202020}.sync-toggle--active i:after{transform:translateX(12px)}.comparison-controls__hint{margin:0;color:#999;font-size:12px}.comparison-controls__shared{display:flex;align-items:center;gap:12px;margin-top:16px}.comparison-controls__play{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;min-width:82px;padding:0 12px;border:1px solid #202020;border-radius:7px;background:#202020;color:#fff;cursor:pointer;white-space:nowrap}.comparison-controls__play:disabled{opacity:.4;cursor:not-allowed}.comparison-controls__position{font-size:12px;font-variant-numeric:tabular-nums;color:#777;white-space:nowrap}.comparison-controls__range{min-width:40px;flex:1;accent-color:#202020;height:16px;cursor:pointer}.comparison-controls__range:disabled{cursor:not-allowed}.comparison-controls__reset{display:inline-flex;align-items:center;gap:5px;padding:4px 0 4px 4px;border:0;background:transparent;color:#666;cursor:pointer}.comparison-controls__reset:disabled{opacity:.4;cursor:not-allowed}.comparison-controls__bottom{display:flex;justify-content:space-between;gap:12px;margin-top:12px;font-size:12px;color:#999}.comparison-controls__bottom p{margin:0}.comparison-controls__bottom>span{white-space:nowrap}.comparison-controls__status{margin:10px 0 0;padding-top:10px;border-top:1px solid #eee;color:#888;font-size:12px}.comparison-controls__status--error{color:#b84736}.replacement-details{overflow:hidden;border:1px solid #e6e9ed;background:#fff;border-radius:12px}.replacement-details__toggle{display:flex;align-items:center;gap:12px;width:100%;min-height:54px;padding:12px 18px;border:0;background:transparent;color:#222;text-align:left;cursor:pointer}.replacement-details__toggle strong{font-size:14px;font-weight:500;white-space:nowrap}.replacement-details__toggle>span{margin-left:auto;color:#999;font-size:12px}.replacement-details__toggle>svg:last-child{flex-shrink:0;transition:transform .15s}.replacement-details__toggle .expanded{transform:rotate(180deg)}.replacement-details__body{padding:0 18px 18px;border-top:1px solid #eee}.replacement-mapping{display:flex;align-items:center;gap:14px;padding:18px 0;border-bottom:1px solid #eee}.replacement-mapping__index{display:grid;place-items:center;flex-shrink:0;width:24px;height:24px;border-radius:6px;background:#f2f3f5;color:#777;font-size:12px}.replacement-mapping__source{flex:1;min-width:0}.replacement-mapping span,.replacement-details__preserve>span{color:#999;font-size:12px}.replacement-mapping p{margin:4px 0 0;color:#333;font-size:14px;overflow-wrap:anywhere}.replacement-mapping__arrow{color:#aaa;flex-shrink:0}.replacement-mapping__target{display:flex;align-items:center;gap:10px;flex:1;min-width:0}.replacement-mapping__target img{width:56px;height:56px;object-fit:cover;border:1px solid #eee;border-radius:8px;flex-shrink:0}.replacement-details__preserve{padding-top:16px}.replacement-details__preserve p{margin:4px 0 0;white-space:pre-line;overflow-wrap:anywhere}.replacement-details__settings{margin:16px 0 0;color:#999;font-size:12px}.replacement-result__actions{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-top:2px}.replacement-result__actions>div{display:flex;gap:12px}.replacement-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:38px;padding:7px 16px;border:1px solid #dfe2e6;border-radius:8px;background:#fff;color:#333;cursor:pointer;text-decoration:none;box-sizing:border-box;white-space:nowrap}.replacement-button:hover{background:#f7f7f8}.replacement-button--plain{padding-left:0;padding-right:0;border-color:transparent;color:#888}.replacement-button--primary{border-color:#202020;background:#202020;color:white}.replacement-button--primary:hover{background:#333}.replacement-button--disabled{opacity:.4;pointer-events:none;cursor:not-allowed}
@media(max-width:920px){.replacement-result{padding-left:16px;padding-right:16px}.comparison-card{padding:14px}.comparison-card header{align-items:flex-start;flex-direction:column;gap:3px}.comparison-card header>span{max-width:100%}}
@media(max-width:680px){.replacement-result{gap:16px;padding-left:12px;padding-right:12px}.replacement-result__players{grid-template-columns:1fr;gap:12px}.replacement-result__intro{align-items:flex-start}.replacement-result__intro h1{font-size:18px}.comparison-card header{flex-direction:row;align-items:center;gap:10px}.comparison-card h2{font-size:16px}.comparison-card__viewport{aspect-ratio:16/10}.comparison-controls{padding:14px}.comparison-controls__head{flex-wrap:wrap;gap:6px}.comparison-controls__hint{width:100%;margin-top:2px}.comparison-controls__shared{gap:8px;flex-wrap:wrap}.comparison-controls__play{min-width:70px;padding-left:8px;padding-right:8px}.comparison-controls__position{font-size:11px}.comparison-controls__reset span{display:none}.comparison-controls__bottom{flex-wrap:wrap;gap:4px}.comparison-controls__bottom>span{display:none}.replacement-details__toggle{padding-left:14px;padding-right:14px;gap:8px}.replacement-details__toggle>span{display:none}.replacement-details__toggle>svg:last-child{margin-left:auto}.replacement-details__body{padding-left:14px;padding-right:14px}.replacement-mapping{gap:10px;flex-wrap:wrap}.replacement-mapping__source{flex-basis:calc(100% - 40px)}.replacement-mapping__arrow{margin-left:34px}.replacement-mapping__target{flex-basis:calc(100% - 68px)}.replacement-result__actions{flex-wrap:wrap;gap:12px}.replacement-result__actions>div{width:100%;gap:8px}.replacement-result__actions>div>.replacement-button{flex:1;padding-left:8px;padding-right:8px;font-size:13px}}
</style>
<style scoped>
.replacement-details__body{display:flex;flex-direction:column;gap:18px;margin:0;padding:16px 18px 18px}
.replacement-details__block>h4{margin:0 0 8px;font-size:12px;font-weight:600;color:#8b8b91}
.replacement-details__block>p{margin:0;color:#333;white-space:pre-wrap;overflow-wrap:anywhere}
.replacement-detail-mapping{display:grid;grid-template-columns:22px minmax(0,1fr) 22px 72px;align-items:center;gap:12px;padding:10px 0;border-top:1px solid #f0f0f2}
.replacement-detail-mapping:first-of-type{border-top:0}
.replacement-detail-mapping__index{display:grid;place-items:center;width:22px;height:22px;border-radius:6px;background:#f2f3f5;color:#777;font-size:11px}
.replacement-detail-mapping__source{margin:0;color:#333;overflow-wrap:anywhere}
.replacement-detail-mapping__arrow{color:#aaa}
.replacement-detail-mapping__target{display:flex;align-items:center;justify-content:center;width:72px;height:72px;border:1px solid #eee;border-radius:8px;background:#f7f8fa;overflow:hidden}
.replacement-detail-mapping__target img{width:100%;height:100%;object-fit:cover}
.replacement-detail-mapping__target svg{color:#b3b7be}
.replacement-details__config{margin:0}
.replacement-details__config>div{display:grid;grid-template-columns:128px minmax(0,1fr);gap:20px;padding:11px 0;border-bottom:1px solid #f0f0f2}
.replacement-details__config>div:last-child{border-bottom:0}
.replacement-details__config dt{color:#8b8b91}
.replacement-details__config dd{margin:0;color:#333;white-space:pre-wrap;overflow-wrap:anywhere}
@media(max-width:760px){.replacement-details__body{padding-left:14px;padding-right:14px}.replacement-detail-mapping{grid-template-columns:22px minmax(0,1fr) 64px;gap:10px}.replacement-detail-mapping__arrow{display:none}.replacement-detail-mapping__target{width:64px;height:64px}.replacement-details__config>div{grid-template-columns:1fr;gap:4px}}
</style>

<style scoped>
.replacement-result > * { flex-shrink: 0; }
.replacement-result.video-result-content{max-width:none;margin:0;padding:24px 32px 28px;gap:20px}
.replacement-result__toolbar{display:flex;align-items:center;gap:16px;min-height:32px}
.comparison-play{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:32px;padding:0 15px;border:0;border-radius:6px;background:#f1f1f1;color:#555;font-size:13px;cursor:pointer;white-space:nowrap}
.comparison-play:disabled{opacity:.45;cursor:not-allowed}
.replacement-result__notice{margin:0;color:#999;font-size:12px;line-height:20px}
.comparison-card{padding:0;border:0;border-radius:0;background:transparent}
.comparison-card header{justify-content:flex-start;gap:8px;margin-bottom:8px;flex-direction:row;align-items:center}
.comparison-card h2{font-size:14px;font-weight:400;line-height:22px}
.comparison-card__viewport{aspect-ratio:16/9;border:0;border-radius:14px;background:#000}
.comparison-card video{background:#000}
.comparison-card header .result-resolution-badge{padding:1px 5px;border-radius:3px;background:#eaf6ec;color:#229558;font-size:10px;line-height:18px}
.replacement-metadata{display:flex;align-items:center;gap:24px;flex-wrap:wrap;margin-top:2px;font-size:12px;color:#999}
.replacement-metadata strong{margin-left:6px;color:#222;font-weight:400}
.replacement-output{display:flex;align-items:center;gap:8px;font-size:12px;min-width:0;margin-top:-8px}
.replacement-output label{flex-shrink:0;color:#999}
.replacement-output input{width:min(520px,55%);min-width:80px;height:32px;padding:0 12px;box-sizing:border-box;border:1px solid #e2e4e7;border-radius:6px;color:#596a80;background:#fafafa;font:inherit;text-overflow:ellipsis}
.replacement-output .replacement-button{min-height:32px;padding:4px 11px;gap:5px;border-radius:6px;font-size:12px;color:#666}
.replacement-feedback{margin:-10px 0 0;color:#888;font-size:12px}
.replacement-feedback--error{color:#b84735}
.replacement-details{margin-top:4px;border-radius:8px}
.replacement-result__actions .replacement-button{min-height:34px;font-size:12px}
@media(max-width:760px){.replacement-result.video-result-content{padding:16px;gap:16px}.replacement-result__toolbar{align-items:flex-start;flex-wrap:wrap;gap:6px}.replacement-output{flex-wrap:wrap}.replacement-output input{flex:1;width:auto}.replacement-metadata{gap:12px}}
</style>
