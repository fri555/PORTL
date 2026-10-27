<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Boxes, ChevronDown, ChevronUp, Image, X } from 'lucide-vue-next'
import type { VideoTask } from '@/types/video-generation'
import { getLocalVideoPreview } from './local-preview'
import { formatTime, imageSource, reversePrompts, sourceLabel, storyboardSegments } from './prototype-data'

const props = defineProps<{ task: VideoTask }>()
const segments = computed(() => storyboardSegments(props.task.input, props.task.name))
const selected = ref(0)
const drawerOpen = ref(false)
const drawer = ref<HTMLElement | null>(null)
const drawerButton = ref<HTMLButtonElement | null>(null)
const activeTab = ref('characters')
const expanded = ref<Record<string, boolean>>({})
const player = ref<HTMLVideoElement | null>(null)
const playbackFailed = ref(false)
const zoomImage = ref('')
const tabs = computed(() => [
  { key: 'characters', label: '人物', count: 0 }, { key: 'scenes', label: '场景', count: 1 },
  { key: 'props', label: '物品', count: 1 }, { key: 'sounds', label: '声音', count: 0 },
  { key: 'scripts', label: '分镜脚本', count: segments.value.length },
])
const prompts = computed(() => reversePrompts(segments.value))
const referenceImage = computed(() => imageSource(segments.value.flatMap(segment => segment.referenceImages)[0]))
const originalLink = computed(() => /^https?:\/\//i.test(props.task.input.videoUrl ?? '') ? props.task.input.videoUrl : '')
const previewUrl = computed(() => props.task.input.localVideo || String(props.task.input.videoUrl ?? '').startsWith('local-video:')
  ? getLocalVideoPreview(String(props.task.input.videoUrl)) : String(props.task.input.videoUrl ?? ''))

async function openDrawer() {
  drawerOpen.value = true
  await nextTick()
  drawer.value?.focus()
}
function closeDrawer() {
  drawerOpen.value = false
  zoomImage.value = ''
  drawerButton.value?.focus()
}
function selectSegment(index: number) {
  selected.value = index
  const segment = segments.value[index]
  if (player.value && segment) {
    try { player.value.currentTime = segment.startTime } catch { /* The original video may still be loading. */ }
  }
}
function syncTime() {
  const time = player.value?.currentTime ?? 0
  const index = segments.value.findIndex(segment => time >= segment.startTime && time < segment.endTime)
  if (index >= 0) selected.value = index
}
</script>

<template>
  <div class="vp-result">
    <div class="vp-result__body">
      <header class="vp-result__head"><span class="vp-demo">原型演示</span><button ref="drawerButton" class="vp-outline" data-testid="asset-drawer-open" type="button" @click="openDrawer"><Boxes :size="16" />素材管理</button></header>
      <p class="vp-result__note">以下为根据任务配置呈现的示例分镜，供体验查看与导入流程。</p>
      <video v-if="previewUrl" ref="player" class="vp-video" :src="previewUrl" controls playsinline @timeupdate="syncTime" @error="playbackFailed = true" />
      <p v-else-if="task.input.localVideo" class="vp-hint" role="status">重新选择本地视频后预览，分镜内容仍可正常浏览。</p>
      <p v-if="playbackFailed" class="vp-hint" role="status">当前浏览器无法播放此视频，分镜内容仍可正常浏览。<a v-if="originalLink" :href="originalLink" target="_blank" rel="noopener noreferrer">打开原视频</a><span v-else-if="task.input.localVideo">本地视频需重新选择后预览。</span></p>
      <h2 class="vp-result__count">{{ segments.length }} 个分镜</h2>
      <div class="vp-timeline" aria-label="分镜时间轴">
        <button v-for="(segment, index) in segments" :key="segment.segmentId" type="button" class="vp-timeline__segment" :class="{ 'vp-timeline__segment--active': selected === index }" :style="{ flexGrow: Math.max(1, segment.endTime - segment.startTime) }" :aria-pressed="selected === index" :aria-label="`查看分镜 ${index + 1}`" @click="selectSegment(index)">{{ formatTime(segment.startTime) }}-{{ formatTime(segment.endTime) }}</button>
      </div>
      <article v-for="(segment, index) in segments" :key="segment.segmentId" class="vp-shot" :class="{ 'vp-shot--active': selected === index }" tabindex="0" @click="selectSegment(index)" @keydown.enter.prevent="selectSegment(index)">
        <header class="vp-shot__head"><span>分镜 {{ index + 1 }}</span><span class="vp-divider" /><span>{{ formatTime(segment.startTime) }} - {{ formatTime(segment.endTime) }}</span><span class="vp-shot__duration">{{ segment.endTime - segment.startTime }} 秒</span></header>
        <p class="vp-shot__row"><span class="vp-shot__label">视觉描述</span><span>{{ segment.visualDescription }}</span></p>
        <p class="vp-shot__row"><span class="vp-shot__label">镜头</span><span>平稳运镜，保持主体与画面连续性</span></p>
      </article>
    </div>
    <div v-if="drawerOpen" class="vp-drawer-mask" @click.self="closeDrawer" @keydown.esc="zoomImage ? zoomImage = '' : closeDrawer()">
      <aside ref="drawer" class="vp-drawer" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="vp-asset-title" data-testid="asset-drawer">
        <header class="vp-drawer__head"><h2 id="vp-asset-title">素材管理</h2><button class="vp-icon-button" type="button" aria-label="关闭素材管理" data-testid="drawer-close" @click="closeDrawer"><X :size="20" /></button></header>
        <div class="vp-drawer__tabs" role="tablist" aria-label="素材类型"><button v-for="tab in tabs" :key="tab.key" type="button" role="tab" :aria-selected="activeTab === tab.key" :class="{ 'vp-drawer__tab--active': activeTab === tab.key }" :data-testid="`asset-tab-${tab.key}`" @click="activeTab = tab.key">{{ tab.label }} <span>{{ tab.count }}</span></button></div>
        <div class="vp-drawer__body" role="tabpanel" :aria-label="tabs.find(tab => tab.key === activeTab)?.label">
          <p class="vp-hint">原型演示 · 以下为示例素材与脚本</p>
          <template v-if="activeTab === 'scripts'">
            <article v-for="(segment, index) in segments" :key="segment.segmentId" class="vp-script">
              <header class="vp-script__head"><span class="vp-badge">{{ index + 1 }}</span><strong>片段 {{ index + 1 }}</strong><span class="vp-script__time">{{ formatTime(segment.startTime) }} - {{ formatTime(segment.endTime) }} <span class="vp-divider" /> {{ segment.endTime - segment.startTime }} 秒</span></header>
              <div class="vp-script__body"><p class="vp-script__row"><span>片段编号</span><span>{{ segment.segmentId }}</span></p><p class="vp-script__row"><span>画面内容</span><span>{{ segment.visualDescription }}</span></p><p class="vp-script__row"><span>机位/运镜</span><span>平稳推进，保持画面连续性</span></p><p class="vp-script__row"><span>风格/光线</span><span>自然光线，真实质感</span></p></div>
              <button class="vp-script__expand" data-testid="script-expand" type="button" :aria-expanded="!!expanded[segment.segmentId]" @click="expanded[segment.segmentId] = !expanded[segment.segmentId]"><ChevronUp v-if="expanded[segment.segmentId]" :size="14" /><ChevronDown v-else :size="14" />{{ expanded[segment.segmentId] ? '收起完整提示词' : '展开完整提示词' }}</button>
              <p v-if="expanded[segment.segmentId]" class="vp-script__prompt" data-testid="script-prompt">{{ prompts[index]?.prompt }}</p>
            </article>
          </template>
          <article v-else-if="activeTab === 'scenes' || activeTab === 'props'" class="vp-asset-card">
            <header><strong>{{ activeTab === 'scenes' ? '演示场景' : sourceLabel(task.input, task.name) }}</strong><span class="vp-demo">示例</span></header>
            <button v-if="referenceImage" class="vp-asset-image-button" type="button" aria-label="放大参考图片" @click="zoomImage = referenceImage"><img :src="referenceImage" alt="任务参考图片" /></button>
            <div v-else class="vp-asset-placeholder"><Image :size="28" /><span>原型示意</span></div>
            <p>{{ activeTab === 'scenes' ? '用于承接视频主体的示例环境，保持各分镜的场景连续性。' : segments[0]?.visualDescription }}</p>
            <p class="vp-hint">{{ activeTab === 'scenes' ? '风格/光线：自然光线，真实质感' : '视觉特征：以原视频主体为参考' }}</p>
          </article>
          <p v-else class="vp-empty">暂无{{ activeTab === 'characters' ? '人物' : '声音' }}素材</p>
        </div>
      </aside>
      <div v-if="zoomImage" class="vp-image-mask" @click.self="zoomImage = ''"><img :src="zoomImage" alt="放大的任务参考图片" /><button class="vp-image-close" type="button" aria-label="关闭图片预览" @click="zoomImage = ''"><X :size="24" /></button></div>
    </div>
  </div>
</template>

<style scoped>
.vp-config,.vp-result{height:100%;min-height:0;overflow-y:auto;color:#111;font-size:14px;line-height:22px;box-sizing:border-box}
.vp-config__body,.vp-result__body{display:flex;flex-direction:column;width:100%;max-width:800px;margin:0 auto;padding-bottom:20px}
.vp-storyboard-config{gap:32px}.vp-reverse-config{gap:24px}.vp-config__section{display:flex;flex-direction:column;gap:8px}.vp-config__title{display:flex;align-items:center;gap:8px;margin:0;font-size:16px;font-weight:500;line-height:24px}
.vp-input{box-sizing:border-box;width:100%;height:32px;padding:5px 12px;border:1px solid #dfe2e6;border-radius:8px;background:#fff;outline:none;font:inherit;color:#111}.vp-input:focus{border-color:#888}.vp-input::placeholder,.vp-textarea::placeholder{color:#a8a8a8}.vp-outline,.vp-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;box-sizing:border-box;min-height:32px;padding:5px 16px;border:1px solid #dfe2e6;border-radius:8px;font:inherit;line-height:20px;cursor:pointer}.vp-outline{background:#fbfbfb;color:#111}.vp-outline:hover{background:#f5f5f5}.vp-primary{background:#111;color:#fff;border-color:#111}.vp-primary:disabled{background:#a8a8a8;border-color:#a8a8a8;color:#fff;cursor:not-allowed}.vp-upload{width:fit-content}.vp-file{display:none}.vp-video{width:100%;aspect-ratio:16/9;background:#111;border-radius:8px}.vp-duration-row{display:flex;gap:16px}.vp-field{display:flex;flex-direction:column;gap:8px;flex:1;min-width:0;font-size:14px;font-weight:400;line-height:22px}.vp-number{display:flex;align-items:center;height:32px;border:1px solid #dfe2e6;border-radius:8px;padding:0 12px;gap:10px;box-sizing:border-box}.vp-number input{flex:1;min-width:0;width:100%;border:0;outline:0;background:transparent;font:inherit;color:#111}.vp-number>span{color:#666;flex-shrink:0}.vp-hint{margin:0;color:#999;font-size:12px;font-weight:400;line-height:18px}.vp-error{margin:0;color:#dc3b3b;font-size:13px;line-height:20px}.vp-submit{width:100%;height:36px;font-weight:500}.vp-source-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.vp-segments{gap:12px}.vp-segment{display:flex;flex-direction:column;gap:8px}.vp-segment+.vp-segment{margin-top:8px}.vp-segment__head{display:flex;align-items:center;gap:8px;font-weight:500}.vp-badge{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;box-sizing:border-box;border-radius:8px;background:#111;color:#fff;font-size:14px;font-weight:400;flex-shrink:0}.vp-input--readonly,.vp-input:disabled{background:#f7f7f9;color:#a8a8a8;opacity:1}.vp-required{color:#f15b5b}.vp-textarea{box-sizing:border-box;width:100%;height:90px;min-height:90px;resize:none;padding:12px 16px;background:#f7f7f9;border:1px solid #dfe2e6;border-radius:8px;color:#999;font:inherit;line-height:22px}.vp-textarea:disabled{opacity:1}.vp-image-list{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.vp-image-list img{width:80px;height:80px;border-radius:8px;object-fit:cover}.vp-placeholder{margin:0;color:#aaa}.vp-submit-bar{position:sticky;bottom:0;display:flex;align-items:flex-end;min-height:68px;background:#fff;margin-top:-8px;padding-bottom:0}.vp-modal-mask{position:fixed;inset:0;background:#0006;z-index:1500;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}.vp-dialog{width:min(740px,100%);max-height:calc(100vh - 32px);display:flex;flex-direction:column;gap:8px;box-sizing:border-box;background:#fff;border-radius:16px;padding:17px 24px 16px;outline:none}.vp-dialog__head{display:flex;align-items:center;justify-content:space-between;gap:12px}.vp-dialog__head h2{margin:0;font-size:18px;font-weight:500;line-height:26px}.vp-icon-button{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border:0;background:transparent;color:#666;border-radius:8px;cursor:pointer;flex-shrink:0}.vp-icon-button:hover{background:#f2f2f2}.vp-dialog__list{height:min(560px,60vh);min-height:160px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;margin:9px -24px 0;padding:24px;border-top:1px solid #e8e8e8;border-bottom:1px solid #e8e8e8}.vp-import-task{display:flex;align-items:center;gap:12px;min-height:72px;padding:0 16px;border:1px solid #e5e5e5;border-radius:12px;cursor:pointer;box-sizing:border-box}.vp-import-task--active{border-color:#111}.vp-import-task__icon{width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:#f7f7f7;border-radius:8px;flex-shrink:0}.vp-import-task__info{display:flex;flex:1;min-width:0;flex-direction:column}.vp-import-task__info strong{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vp-dialog__footer{display:flex;justify-content:flex-end;padding-top:8px}.vp-empty{display:flex;align-items:center;justify-content:center;flex:1;margin:0;color:#999;min-height:140px}.vp-demo{display:inline-flex;align-items:center;width:fit-content;padding:2px 8px;border:1px solid #e6e6e6;border-radius:6px;background:#f7f7f9;color:#666;font-size:12px;line-height:18px}.vp-result__head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.vp-result__body{gap:12px}.vp-result__note{margin:-4px 0 0;color:#999;font-size:12px;line-height:18px}
.vp-result__count{margin:0;font-size:16px;font-weight:500;line-height:24px}.vp-timeline{display:flex;gap:8px;width:100%;overflow-x:auto}.vp-timeline__segment{display:flex;align-items:center;justify-content:center;flex-basis:0;min-width:80px;height:28px;padding:0 12px;border:0;border-radius:8px;background:#f7f7f9;color:#666;font:inherit;white-space:nowrap;cursor:pointer}.vp-timeline__segment--active{background:#111;color:#fff}.vp-shot{border:1px solid #e5e5e5;border-radius:12px;padding:16px;cursor:pointer}.vp-shot--active{border-color:#111}.vp-shot__head{display:flex;align-items:center;gap:12px;font-size:13px;line-height:22px}.vp-divider{display:inline-block;width:1px;height:12px;background:#e6e6e6;flex-shrink:0}.vp-shot__duration{margin-left:auto}.vp-shot__row{display:flex;gap:8px;margin:8px 0 0}.vp-shot__label{flex-shrink:0;color:#999}.vp-drawer-mask{position:fixed;inset:0;background:#0005;z-index:1500;display:flex;justify-content:flex-end}.vp-drawer{width:min(640px,100vw);height:100%;display:flex;flex-direction:column;background:#fff;box-shadow:-16px 1px 32px -16px #0003;outline:none}.vp-drawer__head{display:flex;align-items:center;justify-content:space-between;min-height:64px;padding:0 24px}.vp-drawer__head h2{font-size:16px;line-height:24px;font-weight:500;margin:0}.vp-drawer__tabs{display:flex;gap:8px;padding:16px 24px 8px;overflow-x:auto;flex-shrink:0}.vp-drawer__tabs button{display:inline-flex;align-items:center;gap:4px;padding:3px 12px;border:0;border-radius:6px;background:transparent;color:#666;font:inherit;white-space:nowrap;cursor:pointer}.vp-drawer__tabs button>span{font-size:12px;color:#999}.vp-drawer__tabs .vp-drawer__tab--active{background:#f7f7f9;color:#111;font-weight:500}.vp-drawer__body{flex:1;min-height:0;display:flex;flex-direction:column;gap:12px;overflow-y:auto;padding:8px 24px 24px}.vp-script{flex-shrink:0;border:1px solid #e6e6e6;border-radius:12px;padding-bottom:14px;overflow:hidden}.vp-script__head{display:flex;align-items:center;gap:8px;min-height:48px;padding:0 16px;background:#fafafa;border-bottom:1px solid #e6e6e6}.vp-script__head strong{font-size:14px;font-weight:500}.vp-script__time{display:flex;align-items:center;gap:12px;font-size:13px;color:#666;margin-left:auto}.vp-script__body{display:flex;flex-direction:column;gap:8px;margin:16px 16px 0}.vp-script__row{display:flex;gap:8px;margin:0}.vp-script__row>span:first-child{flex:0 0 70px;color:#999;text-align:right}.vp-script__row>span:last-child{min-width:0;overflow-wrap:anywhere}.vp-script__expand{display:flex;align-items:center;gap:4px;width:100%;padding:14px 16px 0;border:0;border-top:1px solid #e6e6e6;margin-top:16px;background:transparent;font:inherit;font-size:12px;color:#999;cursor:pointer}.vp-script__prompt{margin:8px 16px 2px;white-space:pre-line}.vp-asset-card{padding:16px;border:1px solid #e5e5e5;border-radius:12px}.vp-asset-card header{display:flex;align-items:center;gap:8px}.vp-asset-card strong{font-size:14px;font-weight:500}.vp-asset-card p{margin:12px 0 0}.vp-asset-placeholder{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:160px;height:160px;margin-top:8px;background:#f7f7f9;color:#aaa;border-radius:8px}.vp-asset-image-button{border:0;padding:0;background:transparent;margin-top:8px;cursor:zoom-in}.vp-asset-image-button img{width:160px;height:160px;object-fit:cover;border-radius:8px}.vp-image-mask{position:fixed;inset:0;z-index:1600;background:#0009;display:flex;align-items:center;justify-content:center}.vp-image-mask>img{max-width:80vw;max-height:80vh;border-radius:8px;object-fit:contain}.vp-image-close{position:absolute;top:16px;right:16px;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border:0;border-radius:8px;background:#fff;color:#666;cursor:pointer}.vp-prompt-card{border:1px solid #e6e6e6;border-radius:12px;background:#fff;overflow:hidden}.vp-prompt-card__head{display:flex;align-items:center;gap:8px;height:48px;padding:0 16px;background:#fafafa}.vp-prompt-card__head strong{font-size:14px;font-weight:500;white-space:nowrap}.vp-prompt-card__id{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vp-prompt-card__copy{display:flex;align-items:center;justify-content:center;width:24px;height:24px;margin-left:auto;flex-shrink:0;border:0;border-radius:6px;background:#ededed;color:#666;cursor:pointer}.vp-prompt-card__body{display:flex;flex-direction:column;gap:8px;padding:16px}.vp-prompt-row{display:flex;gap:8px;min-width:0}.vp-prompt-row__label{flex:0 0 84px;text-align:right;color:#999}.vp-prompt-row>p{flex:1;min-width:0;margin:0;white-space:pre-line;overflow-wrap:anywhere}.vp-reference-button{display:block;border:0;padding:0;background:transparent;cursor:zoom-in}.vp-reference-button img{display:block}
@media(max-width:600px){.vp-duration-row{gap:10px}.vp-config__title{flex-wrap:wrap}.vp-dialog{padding:16px}.vp-dialog__list{margin:8px -16px 0;padding:16px}.vp-import-task{padding:8px;gap:8px}.vp-import-task__icon{display:none}.vp-outline{padding-left:12px;padding-right:12px}.vp-drawer__tabs{padding:8px 16px;gap:4px}.vp-drawer__tabs button{padding:3px 8px}.vp-drawer__body{padding:8px 16px 16px}.vp-script__time{gap:6px;font-size:12px}.vp-script__head{padding:0 12px;gap:6px}.vp-prompt-row{flex-direction:column}.vp-prompt-row__label{flex:auto;text-align:left}.vp-shot__head{gap:8px}}

</style>
