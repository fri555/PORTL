<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { AudioLines, ChevronDown, Copy, Download, SlidersHorizontal } from 'lucide-vue-next'
import { normalizeSpeechInput, speechCharacterCount, speechFormatLabel, speechLoudnessMultiplier, speechSpeedPercent, speechVoiceName } from '@/composables/useSpeechSynthesis'
import { speechDemoBase, speechFormats } from '@/mock/speech-synthesis'
import type { SpeechDemoManifest } from '@/types/speech-synthesis'
import type { VideoTask } from '@/types/video-generation'

const props = defineProps<{ task: VideoTask }>()
const input = computed(() => normalizeSpeechInput(props.task.input))
const format = computed(() => speechFormats.find(item => item.value === input.value.format)!)
const audioUrl = computed(() => `${speechDemoBase}demo.${format.value.extension}`)
const previewUrl = computed(() => input.value.format === 'pcm' ? `${speechDemoBase}demo.mp3` : audioUrl.value)
const outputAddress = computed(() => new URL(audioUrl.value, window.location.origin).href)
const manifest = ref<SpeechDemoManifest | null>(null)
const metadataError = ref(false)
const audioError = ref(false)
const feedback = ref('')
const downloading = ref(false)
const detailsOpen = ref(false)
const player = ref<HTMLAudioElement | null>(null)
const addressInput = ref<HTMLInputElement | null>(null)
const actual = computed(() => manifest.value?.files?.[input.value.format === 'ogg_opus' ? 'ogg' : input.value.format])
let disposed = false
const request = new AbortController()
async function loadMetadata() {
  metadataError.value = false
  try {
    const response = await fetch(`${speechDemoBase}manifest.json`, { signal: request.signal })
    if (!response.ok) throw new Error('metadata')
    const value = await response.json()
    if (!value || typeof value.text !== 'string' || !Array.isArray(value.subtitles)) throw new Error('metadata')
    if (!disposed) manifest.value = value
  } catch { if (!disposed) metadataError.value = true }
}
async function copyAddress() {
  feedback.value = ''
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard')
    await navigator.clipboard.writeText(outputAddress.value)
    feedback.value = '音频地址已复制'
  } catch { addressInput.value?.select(); feedback.value = '自动复制失败，地址已选中，请手动复制' }
}
async function download(event: MouseEvent, url: string, extension: string) {
  event.preventDefault()
  if (downloading.value) return
  feedback.value = ''; downloading.value = true
  let objectUrl: string | undefined
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('download')
    const blob = await response.blob()
    if (!blob.size) throw new Error('empty')
    objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl; anchor.download = `${props.task.name}-演示.${extension}`
    document.body.appendChild(anchor); anchor.click(); anchor.remove()
    feedback.value = '已开始下载演示文件'
  } catch { feedback.value = '下载失败，请重试；也可复制音频地址后打开' }
  finally { downloading.value = false; if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl!), 1000) }
}
function retryAudio() { audioError.value = false; player.value?.load() }
onMounted(() => { if (props.task.status === 'completed' && props.task.input.prototypeDemo !== false) void loadMetadata() })
onBeforeUnmount(() => { disposed = true; request.abort(); player.value?.pause() })
</script>

<template>
  <section v-if="task.status === 'completed' && task.input.prototypeDemo !== false" class="speech-result">
    <section class="audio-panel" aria-label="音频结果">
      <div class="audio-title"><span class="audio-icon"><AudioLines :size="24" /></span><div><strong>{{ task.name }}</strong><small>{{ speechFormatLabel(input.format) }}<template v-if="actual"> · {{ actual.duration?.toFixed(2) }} 秒 · {{ actual.sampleRate }} Hz · {{ actual.channels === 1 ? '单声道' : `${actual.channels} 声道` }}<span v-if="actual.bitDepth"> · {{ actual.bitDepth }} bit</span></template></small></div></div>
      <audio ref="player" :src="previewUrl" controls preload="metadata" aria-label="合成音频播放器" @error="audioError = true" @loadedmetadata="audioError = false" />
      <p v-if="input.format === 'pcm'" class="muted">PCM 下载为原始 16 bit 单声道音频；播放器使用同内容 MP3 示例预览。</p>
      <p v-if="audioError" role="alert" class="failure">音频暂时无法加载。<button @click="retryAudio">重新加载</button></p>
      <p v-if="metadataError" class="muted">示例规格加载失败。<button class="inline-button" @click="loadMetadata">重新获取</button></p>
    </section>
    <div class="output-row"><label for="speech-output-address">音频地址</label><input id="speech-output-address" ref="addressInput" :value="outputAddress" readonly aria-label="音频输出地址" /><button class="secondary-button" @click="copyAddress"><Copy :size="13" />复制</button><a data-testid="speech-audio-download" class="secondary-button" :href="audioUrl" :download="`${task.name}-演示.${format.extension}`" :aria-disabled="downloading" @click="download($event, audioUrl, format.extension)"><Download :size="13" />下载音频</a><a v-if="input.enableSubtitle" data-testid="speech-subtitle-download" :href="`${speechDemoBase}demo.srt`" :download="`${task.name}-演示.srt`" class="secondary-button" :aria-disabled="downloading" @click="download($event, `${speechDemoBase}demo.srt`, 'srt')"><Download :size="13" />下载字幕</a></div>
    <p v-if="feedback" role="status" class="feedback">{{ feedback }}</p>
    <section class="detail-panel speech-result-details">
      <button class="speech-result-details__toggle" data-testid="speech-details-toggle" type="button" :aria-expanded="detailsOpen" @click="detailsOpen = !detailsOpen"><SlidersHorizontal :size="18" /><strong>生成详情</strong><span>{{ speechVoiceName(input.speaker) }} · {{ speechFormatLabel(input.format) }} · {{ input.sampleRate }} Hz</span><ChevronDown :size="17" :class="{ expanded: detailsOpen }" /></button>
      <dl v-if="detailsOpen" data-testid="speech-result-details"><div class="detail-panel__text"><dt>输入文本</dt><dd data-testid="speech-input-text">{{ input.text }}</dd></div><div><dt>文本长度</dt><dd>{{ speechCharacterCount(input.text) }} 字符</dd></div><div><dt>音色</dt><dd>{{ speechVoiceName(input.speaker) }}</dd></div><div><dt>语速</dt><dd>{{ speechSpeedPercent(input.speechRate) }}%</dd></div><div><dt>音频格式</dt><dd>{{ speechFormatLabel(input.format) }}</dd></div><div><dt>采样率</dt><dd>{{ input.sampleRate }} Hz</dd></div><div><dt>音量</dt><dd>{{ speechLoudnessMultiplier(input.loudnessRate).toFixed(2) }} 倍</dd></div><div v-if="input.bitRate"><dt>码率</dt><dd>{{ input.bitRate / 1000 }} kbps</dd></div><div><dt>字幕</dt><dd>{{ input.enableSubtitle ? '已生成 SRT' : '未生成' }}</dd></div></dl>
    </section>
  </section>
  <section v-else class="speech-result" role="status">暂无可用的合成结果</section>
</template>

<style scoped>
.speech-result{display:flex;flex-direction:column;gap:16px;font-size:13px;color:#18181b;padding-bottom:24px}.speech-result button,.speech-result a,.speech-result input{font:inherit}.speech-result__toolbar{display:flex;align-items:center;justify-content:space-between;gap:15px}.speech-result__toolbar>div{display:flex;align-items:center;gap:10px}.demo-label{padding:3px 7px;border-radius:4px;background:#fff7df;color:#a77b18;font-size:11px}.demo-notice{margin:-8px 0 0;color:#929298;font-size:12px}.audio-panel{border:1px solid #e8e8ec;border-radius:10px;padding:20px;background:#fafafa}.audio-title{display:flex;align-items:center;gap:12px;margin-bottom:17px}.audio-icon{width:44px;height:44px;border-radius:10px;background:#eee;display:grid;place-items:center;color:#666}.audio-title strong{font-size:14px;font-weight:500}.audio-title small{display:block;color:#929298;font-size:11px;margin-top:6px}.audio-panel audio{width:100%;height:44px;display:block}.muted{font-size:11px;color:#929298;margin:10px 0 0;line-height:1.7}.output-row{display:flex;align-items:center;gap:9px}.output-row>label{flex-shrink:0;color:#929298;font-size:12px}.output-row input{min-width:0;flex:1;height:33px;box-sizing:border-box;padding:0 10px;border:1px solid #e4e4e7;border-radius:6px;color:#666;font-size:12px}.secondary-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex-shrink:0;height:33px;box-sizing:border-box;padding:0 11px;border:1px solid #e4e4e7;border-radius:6px;background:#fff;color:#555;cursor:pointer;text-decoration:none;font-size:12px!important}.secondary-button:hover{background:#f7f7f7}.details-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.detail-panel,.subtitle-panel{border:1px solid #e8e8ec;border-radius:8px;padding:16px}.detail-panel header,.subtitle-panel header{display:flex;align-items:center;justify-content:space-between;gap:10px}.detail-panel h2,.subtitle-panel h2{margin:0;font-size:13px;font-weight:500}.detail-panel small,.subtitle-panel small{font-size:11px;color:#929298}.subtitle-panel header small{display:block;margin-top:5px}.input-text{white-space:pre-wrap;overflow-wrap:anywhere;max-height:140px;overflow:auto;margin:13px 0 0;line-height:1.8;color:#555;font-size:12px}.detail-panel dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin:15px 0 0;font-size:12px}.detail-panel dl>div{display:flex;gap:10px}.detail-panel dt{color:#929298}.detail-panel dd{margin:0;color:#555}.subtitle-cues{margin-top:14px;border-top:1px solid #f1f1f3;padding-top:4px}.subtitle-cues>div{display:flex;gap:20px;padding-top:10px;font-size:12px;line-height:1.5}.subtitle-cues time{color:#929298;font-variant-numeric:tabular-nums;flex-shrink:0}.subtitle-cues span{color:#555}.feedback{font-size:12px;color:#666;margin:0}.failure{color:#c24138;font-size:12px}.failure button,.inline-button{border:0;background:transparent;color:inherit;text-decoration:underline;cursor:pointer}footer{display:flex;justify-content:flex-end}@media(max-width:760px){.details-grid{grid-template-columns:1fr}.output-row{flex-wrap:wrap}.output-row input{min-width:200px}.subtitle-cues>div{flex-direction:column;gap:4px}.speech-result__toolbar{align-items:flex-start}.demo-notice{line-height:1.7}}
</style>
<style scoped>
.speech-result-details{padding:0;overflow:hidden}.speech-result-details__toggle{display:flex;align-items:center;gap:11px;width:100%;min-height:54px;padding:12px 16px;border:0;background:transparent;color:#222;text-align:left;cursor:pointer}.speech-result-details__toggle strong{font-size:13px;font-weight:500;white-space:nowrap}.speech-result-details__toggle>span{margin-left:auto;color:#929298;font-size:11px}.speech-result-details__toggle>svg:last-child{flex-shrink:0;transition:transform .15s}.speech-result-details__toggle .expanded{transform:rotate(180deg)}.speech-result-details dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px;margin:0;padding:0 16px 14px;border-top:1px solid #f1f1f3}.speech-result-details dl>div{display:grid;grid-template-columns:90px minmax(0,1fr);gap:10px;padding:10px 0;border-top:1px solid #f1f1f3}.speech-result-details dl>div:nth-child(1),.speech-result-details dl>div:nth-child(2){border-top:0}.speech-result-details dl>.detail-panel__text{grid-column:1/-1}.speech-result-details dd{white-space:pre-wrap;overflow-wrap:anywhere}.speech-result-details dd small{display:block;margin-top:5px;color:#aaa}
@media(max-width:760px){.speech-result-details__toggle>span{display:none}.speech-result-details__toggle>svg:last-child{margin-left:auto}.speech-result-details dl{grid-template-columns:1fr}.speech-result-details dl>.detail-panel__text{grid-column:auto}.speech-result-details dl>div:nth-child(2){border-top:1px solid #f1f1f3}}
</style>
