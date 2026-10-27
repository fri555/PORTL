<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ArrowRight, ChevronDown, Database, FileVideo, Film, Image, ImageOff, Link, Plus, Settings, Trash2, Upload, X } from 'lucide-vue-next'
import { createElementReplacementInput, getDemoElementReplacementInput, getReplacementMediaUrl, isReplacementRemoteReference, replacementModels, replacementModelLabels, replacementResolutions, validateElementReplacement } from '@/composables/useElementReplacement'
import { listVideoTasks } from '@/composables/useVideoPrototype'
import { registerLocalVideo, releaseLocalVideo } from '@/components/video-generation/storyboard/local-preview'
import type { ElementReplacementInput, ReplacementGroup, ReplacementMedia, ReplacementType } from '@/types/element-replacement'
import ReplacementMediaDialog from './ReplacementMediaDialog.vue'

const props = defineProps<{ initialData?: Record<string, any>; initialName?: string; submitting?: boolean; submissionStage?: string }>()
const emit = defineEmits<{ submit: [payload: ElementReplacementInput, name: string]; updateName: [name: string] }>()
const input = reactive<ElementReplacementInput>(createElementReplacementInput(props.initialData))
const taskTitle = ref(props.initialName ?? '元素替换')
const sourceMode = ref<'upload' | 'url' | 'material'>(input.sourceVideo?.source === 'url' ? 'url' : input.sourceVideo?.source === 'upload' ? 'upload' : 'material')
const advanced = ref(false)
const videoFile = ref<HTMLInputElement | null>(null)
const referenceFile = ref<HTMLInputElement | null>(null)
const uploadGroupId = ref('')
const dialog = ref<{ kind: 'video' | 'image'; mode: 'url' | 'material'; groupId?: string } | null>(null)
const imagePreview = ref<ReplacementMedia | null>(null)
const imagePreviewDialog = ref<HTMLElement | null>(null)
const errors = ref<string[]>([])
const notice = ref('')
const videoFailed = ref(false)
const imageReading = ref(false)
const referenceFailures = ref(new Set<string>())
const referenceVersions = reactive<Record<string, number>>({})
const ownedVideoIds = new Set<string>()
const readers = new Set<FileReader>()
let disposed = false
let previewFocus: HTMLElement | null = null
const typeChoices: { value: ReplacementType; label: string }[] = [{ value: 'person', label: '模特' }, { value: 'product', label: '商品' }, { value: 'background', label: '场景' }]
const ratioChoices: { value: ElementReplacementInput['settings']['ratio']; label: string }[] = [{ value: 'adaptive', label: '原视频比例' }, { value: '16:9', label: '16:9' }, { value: '4:3', label: '4:3' }, { value: '1:1', label: '1:1' }, { value: '3:4', label: '3:4' }, { value: '9:16', label: '9:16' }, { value: '21:9', label: '21:9' }]
const sourceUrl = computed(() => getReplacementMediaUrl(input.sourceVideo))
const resolutionChoices = replacementResolutions
const sourceNeedsServerPreview = computed(() => !sourceUrl.value && !!input.sourceVideo && isReplacementRemoteReference(input.sourceVideo.url, 'video'))
const ratioLabel = computed(() => ratioChoices.find((choice) => choice.value === input.settings.ratio)?.label ?? '原视频比例')
const currentDialogMedia = computed(() => dialog.value?.kind === 'video' ? input.sourceVideo : input.groups.find((group) => group.id === dialog.value?.groupId)?.reference)
const descriptionPlaceholder = computed(() => ({ person: '描述原视频中需要替换的人物，如：左侧穿黑色外套的模特', product: '描述原视频中需要替换的商品，如：手中展示的运动鞋', background: '描述原视频中需要替换的背景，如：人物身后的街道' })[input.replacementType])
const promptPresets = computed(() => [
  input.replacementType === 'background' ? '保持原视频的人物、动作和镜头' : '保持原视频的动作、镜头和背景',
  '保留原视频的光影，其他元素不变',
  '保留目标参考图的细节',
])
const selectedPromptPreset = computed({
  get: () => promptPresets.value.find(preset => preset === input.preservePrompt.trim()) ?? '',
  set: (preset: string) => { if (preset) input.preservePrompt = preset },
})

watch(() => input.replacementType, (type, previousType) => {
  const previousDefault = previousType === 'background' ? '保持原视频的人物、动作和镜头' : '保持原视频的动作、镜头和背景'
  const nextDefault = type === 'background' ? '保持原视频的人物、动作和镜头' : '保持原视频的动作、镜头和背景'
  input.preservePrompt = input.preservePrompt.split(/([；;])/).map((part, index) => index % 2 === 0 && part.trim() === previousDefault ? part.replace(previousDefault, nextDefault) : part).join('')
}, { immediate: true })
watch(input, () => { errors.value = [] }, { deep: true, flush: 'sync' })
watch(taskTitle, (name) => { errors.value = []; emit('updateName', name) })

function referencedByTask(identifier: string) {
  function contains(value: unknown): boolean {
    if (typeof value === 'string') return value === identifier
    if (Array.isArray(value)) return value.some(contains)
    if (value && typeof value === 'object') return Object.values(value).some(contains)
    return false
  }
  return listVideoTasks().some((task) => contains(task.input))
}
function releaseUnusedVideos(currentUrl?: string) {
  for (const identifier of ownedVideoIds) {
    if (identifier === currentUrl || referencedByTask(identifier)) continue
    releaseLocalVideo(identifier)
    ownedVideoIds.delete(identifier)
  }
}
function replaceVideo(media: ReplacementMedia) {
  input.sourceVideo = { ...media }
  videoFailed.value = false
  notice.value = ''
  releaseUnusedVideos(media.url)
}
function chooseVideoMode(mode: 'upload' | 'url' | 'material') {
  sourceMode.value = mode
  if (mode === 'upload') videoFile.value?.click()
  else dialog.value = { kind: 'video', mode }
}
function uploadVideo(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  if (file.type && !file.type.startsWith('video/')) { notice.value = '请选择视频文件'; return }
  const sourceId = registerLocalVideo(file)
  ownedVideoIds.add(sourceId)
  sourceMode.value = 'upload'
  replaceVideo({ id: sourceId, name: file.name, kind: 'video', source: 'upload', url: sourceId })
}
function chooseReferenceUpload(groupId: string) {
  uploadGroupId.value = groupId
  referenceFile.value?.click()
}
async function uploadReference(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  if (file.type && !file.type.startsWith('image/')) { notice.value = '请选择图片文件'; return }
  const groupId = uploadGroupId.value
  const version = (referenceVersions[groupId] ?? 0) + 1
  referenceVersions[groupId] = version
  imageReading.value = true
  notice.value = ''
  try {
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      readers.add(reader)
      reader.onload = () => { readers.delete(reader); resolve(String(reader.result)) }
      reader.onerror = () => { readers.delete(reader); reject(new Error('read')) }
      reader.onabort = () => { readers.delete(reader); reject(new Error('aborted')) }
      reader.readAsDataURL(file)
    })
    if (disposed) return
    const group = input.groups.find((item) => item.id === groupId)
    if (group && referenceVersions[groupId] === version) {
      const media: ReplacementMedia = { id: `replacement-image-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: file.name, kind: 'image', source: 'upload', url }
      if (!getReplacementMediaUrl(media)) { notice.value = '当前图片格式暂不支持，请更换图片'; return }
      group.reference = media
    }
  } catch { if (!disposed) notice.value = '图片读取失败，请重新选择' }
  finally { if (!disposed) imageReading.value = readers.size > 0 }
}
function selectMedia(media: ReplacementMedia) {
  if (dialog.value?.kind === 'video') replaceVideo(media)
  else {
    const group = input.groups.find((item) => item.id === dialog.value?.groupId)
    if (group) {
      group.reference = { ...media }
      referenceFailures.value.delete(media.id)
      referenceVersions[group.id] = (referenceVersions[group.id] ?? 0) + 1
    }
  }
  dialog.value = null
}
function addGroup() {
  input.groups.push({ id: `replacement-group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, description: '', reference: null })
}
function typeKeydown(event: KeyboardEvent, index: number) {
  let target = index
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target = (index + 1) % typeChoices.length
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target = (index + typeChoices.length - 1) % typeChoices.length
  else if (event.key === 'Home') target = 0
  else if (event.key === 'End') target = typeChoices.length - 1
  else return
  event.preventDefault()
  input.replacementType = typeChoices[target]!.value
  const controls = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('button')
  controls?.[target]?.focus()
}
function removeGroup(id: string) { if (input.groups.length > 1) input.groups = input.groups.filter((group) => group.id !== id) }
function useDemo() {
  Object.assign(input, createElementReplacementInput(getDemoElementReplacementInput()))
  sourceMode.value = 'material'
  videoFailed.value = false
  notice.value = ''
  releaseUnusedVideos(input.sourceVideo?.url)
}
function submit() {
  if (props.submitting) return
  const sourceDuration = input.sourceVideo?.duration
  input.settings.duration = typeof sourceDuration === 'number' && Number.isFinite(sourceDuration) && sourceDuration > 0 ? Math.max(1, Math.round(sourceDuration)) : null
  input.audioUrls = []
  errors.value = validateElementReplacement(input)
  if (!taskTitle.value.trim()) errors.value.unshift('请输入任务名称')
  else if (taskTitle.value.trim().length > 20) errors.value.unshift('任务名称不能超过20个字符')
  if (imageReading.value) { errors.value.push('参考图读取中，请稍后再试'); return }
  if (errors.value.length) return
  emit('submit', JSON.parse(JSON.stringify({ ...input, prototypeDemo: false })) as ElementReplacementInput, taskTitle.value.trim())
}
async function previewReference(group: ReplacementGroup) {
  if (!group.reference) return
  imagePreview.value = group.reference
  previewFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  await nextTick()
  imagePreviewDialog.value?.focus()
}
function closeImagePreview() { imagePreview.value = null; previewFocus?.focus() }
function videoMetadata(event: Event) {
  const duration = (event.target as HTMLVideoElement).duration
  if (input.sourceVideo && Number.isFinite(duration) && duration > 0) input.sourceVideo.duration = duration
}
function keydown(event: KeyboardEvent) {
  if (!imagePreview.value) return
  if (event.key === 'Escape') { event.preventDefault(); closeImagePreview() }
  if (event.key === 'Tab') { event.preventDefault(); imagePreviewDialog.value?.querySelector<HTMLButtonElement>('button')?.focus() }
}
onMounted(() => window.addEventListener('keydown', keydown))
onBeforeUnmount(() => {
  disposed = true
  readers.forEach((reader) => reader.abort())
  releaseUnusedVideos()
  window.removeEventListener('keydown', keydown)
})
</script>

<template>
  <form class="replacement-config" novalidate @submit.prevent="submit">
    <label class="task-name-field"><span>任务名称</span><input v-model="taskTitle" aria-label="任务名称" maxlength="20" placeholder="请输入任务名称" /></label>
    <input ref="videoFile" class="hidden-file" type="file" accept="video/*" aria-label="上传原视频" data-testid="replacement-video-file" @change="uploadVideo" />
    <input ref="referenceFile" class="hidden-file" type="file" accept="image/*" aria-label="上传目标参考图" data-testid="replacement-reference-file" @change="uploadReference" />
    <div class="replacement-columns">
      <section class="source-panel panel">
        <h2>原视频</h2>
        <div class="video-sources" aria-label="原视频来源"><button type="button" data-testid="video-materials" :class="{ active: sourceMode === 'material' }" @click="chooseVideoMode('material')"><Database :size="17" />素材库</button><button type="button" :class="{ active: sourceMode === 'upload' }" @click="chooseVideoMode('upload')"><Upload :size="17" />本地上传</button><button type="button" data-testid="video-link" :class="{ active: sourceMode === 'url' }" @click="chooseVideoMode('url')"><Link :size="17" />视频链接</button></div>
        <template v-if="input.sourceVideo">
          <div class="video-file-bar"><FileVideo :size="18" /><span :title="input.sourceVideo.name">{{ input.sourceVideo.name }}</span><button type="button" @click="videoFile?.click()">更换视频</button></div>
          <div class="video-preview"><video v-if="sourceUrl" :key="sourceUrl" :src="sourceUrl" :poster="input.sourceVideo.poster" controls playsinline preload="metadata" aria-label="原视频预览" @loadedmetadata="videoMetadata" @error="videoFailed = true" /><div v-else class="video-unavailable"><Film :size="36" :stroke-width="1" /><span>{{ sourceNeedsServerPreview ? '素材引用已记录，浏览器暂不支持直接预览' : '重新选择本地视频后预览' }}</span></div></div>
          <p v-if="videoFailed" class="media-notice" role="status">当前视频暂时无法播放，可更换视频或检查链接。</p>
          <p v-else-if="!sourceUrl && !sourceNeedsServerPreview" class="media-notice">本地视频预览仅在当前页面会话中保留。</p>
        </template>
        <div v-else class="video-empty"><Film :size="44" :stroke-width="1.1" /><h3>添加原视频</h3><p>从素材库选择、上传视频或粘贴链接</p><button type="button" class="demo-button" data-testid="use-demo-media" @click="useDemo">填充测试素材</button></div>
      </section>

      <section class="settings-panel panel">
        <h2>替换设置</h2>
        <div class="replacement-type"><span>替换类型</span><div role="radiogroup" aria-label="替换类型"><button v-for="(type, typeIndex) in typeChoices" :key="type.value" type="button" role="radio" :aria-checked="input.replacementType === type.value" :data-type="type.value" :tabindex="input.replacementType === type.value ? 0 : -1" @keydown="typeKeydown($event, typeIndex)" :class="{ selected: input.replacementType === type.value }" @click="input.replacementType = type.value">{{ type.label }}</button></div></div>
        <div class="mapping-groups">
          <section v-for="(group, index) in input.groups" :key="group.id" class="mapping-group" data-testid="replacement-group">
            <header><h3 data-testid="group-title">替换 {{ index + 1 }}</h3><button type="button" class="remove-group" data-testid="remove-group" :aria-label="`删除替换 ${index + 1}`" :disabled="input.groups.length === 1" @click="removeGroup(group.id)">删除<Trash2 :size="14" /></button></header>
            <div class="mapping-row">
              <label class="description-field"><span>原元素说明</span><input v-model="group.description" :aria-label="`替换 ${index + 1} 原元素说明`" :placeholder="descriptionPlaceholder" /></label>
              <ArrowRight class="mapping-arrow" :size="23" :stroke-width="1.5" />
              <div class="reference-field"><span>目标参考图</span><div class="reference-row"><div class="reference-visual"><button v-if="group.reference" type="button" class="reference-thumb" :disabled="referenceFailures.has(group.reference.id) || !getReplacementMediaUrl(group.reference)" :aria-label="`预览参考图 ${index + 1}`" @click="previewReference(group)"><img :key="`${group.id}-${referenceVersions[group.id] ?? 0}`" v-if="getReplacementMediaUrl(group.reference)" v-show="!referenceFailures.has(group.reference.id)" :src="getReplacementMediaUrl(group.reference)" :alt="group.reference.name" data-testid="reference-preview" @error="referenceFailures.add(group.reference.id)" @load="referenceFailures.delete(group.reference.id)" /><Link v-if="!getReplacementMediaUrl(group.reference)" :size="25" aria-label="素材引用暂不支持直接预览" /><ImageOff v-else-if="referenceFailures.has(group.reference.id)" :size="25" :stroke-width="1.2" aria-label="参考图加载失败" /></button><div v-else class="reference-empty" :aria-label="`参考图 ${index + 1} 待添加`"><Image :size="26" :stroke-width="1.1" /></div><span>参考图{{ index + 1 }}</span></div><div class="reference-actions"><button type="button" :aria-label="`替换 ${index + 1} 选择素材库`" @click="dialog = { kind: 'image', mode: 'material', groupId: group.id }"><Database :size="15" />素材库</button><button type="button" :aria-label="`替换 ${index + 1} 上传参考图`" :disabled="imageReading" @click="chooseReferenceUpload(group.id)"><Upload :size="15" />上传</button><button type="button" :aria-label="`替换 ${index + 1} 参考图链接`" @click="dialog = { kind: 'image', mode: 'url', groupId: group.id }"><Link :size="15" />链接</button></div></div></div>
            </div>
          </section>
        </div>
        <button type="button" class="add-group" data-testid="add-group" @click="addGroup"><Plus :size="18" :stroke-width="1.4" />添加替换组</button>
      </section>
    </div>

    <section class="panel prompt-section"><label class="preserve-field"><span>补充要求</span><textarea v-model="input.preservePrompt" rows="2" aria-label="补充要求" placeholder="输入希望保留的动作、光影或参考图细节" /></label><label class="prompt-preset-select"><span>常用要求</span><select v-model="selectedPromptPreset" aria-label="选择常用要求"><option value="">请选择</option><option v-for="preset in promptPresets" :key="preset" :value="preset">{{ preset }}</option></select></label></section>

    <section class="advanced-panel"><button type="button" class="advanced-trigger" data-testid="advanced-settings" aria-controls="replacement-advanced-fields" :aria-expanded="advanced" @click="advanced = !advanced"><Settings :size="19" :stroke-width="1.5" /><strong>高级设置</strong><span>{{ input.settings.resolution.toUpperCase() }} · {{ ratioLabel }}</span><ChevronDown :size="17" :class="{ expanded: advanced }" /></button>
      <div v-if="advanced" id="replacement-advanced-fields" class="advanced-fields">
        <label><span>视频模型</span><select v-model="input.settings.model" aria-label="视频模型"><option v-for="model in replacementModels" :key="model" :value="model">{{ replacementModelLabels[model] }}</option></select></label>
        <label><span>输出分辨率</span><select v-model="input.settings.resolution" aria-label="输出分辨率"><option v-for="resolution in resolutionChoices" :key="resolution" :value="resolution">{{ resolution.toUpperCase() }}</option></select></label>
        <label><span>画面比例</span><select v-model="input.settings.ratio" aria-label="画面比例"><option v-for="ratio in ratioChoices" :key="ratio.value" :value="ratio.value">{{ ratio.label }}</option></select></label>
        <div class="generation-switches"><label class="audio-setting"><input v-model="input.settings.generateAudio" type="checkbox" aria-label="生成同步音频" /><span>生成同步音频</span></label></div>
      </div>
    </section>
    <div class="config-footer"><ul v-if="errors.length" class="validation-errors" role="alert"><li v-for="(error, index) in errors" :key="index">{{ error }}</li></ul><p v-if="input.groups.some(group => group.reference && referenceFailures.has(group.reference.id))" class="form-notice" role="status">参考图暂时无法加载，请检查链接或重新选择</p><p v-if="notice" class="form-notice" role="status">{{ notice }}</p><button type="submit" class="generate-button" data-testid="generate-replacement" :disabled="submitting">{{ submitting ? submissionStage || '正在提交' : '生成替换视频' }}</button></div>
    <ReplacementMediaDialog v-if="dialog" :key="`${dialog.kind}-${dialog.mode}-${dialog.groupId ?? ''}`" :kind="dialog.kind" :mode="dialog.mode" :type="input.replacementType" :initial-media="currentDialogMedia" @select="selectMedia" @close="dialog = null" />
    <div v-if="imagePreview" ref="imagePreviewDialog" class="reference-preview-mask" role="dialog" aria-modal="true" aria-label="参考图预览" tabindex="-1" @click.self="closeImagePreview"><img :src="getReplacementMediaUrl(imagePreview)" :alt="imagePreview.name" /><button type="button" aria-label="关闭参考图预览" @click="closeImagePreview"><X :size="22" /></button></div>
  </form>
</template>

<style scoped>
.replacement-config{display:flex;flex-direction:column;gap:14px;width:100%;height:100%;min-height:0;overflow-y:auto;padding:0 20px 16px;box-sizing:border-box;font-size:14px;line-height:22px;color:#111}.hidden-file{display:none}.replacement-columns{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.07fr);gap:14px;align-items:stretch}.panel{min-width:0;padding:18px;border:1px solid #e9ebef;border-radius:12px;background:#fff;box-sizing:border-box}.panel>h2{margin:0 0 19px;font-size:20px;font-weight:600;line-height:26px}.source-panel{display:flex;flex-direction:column}.video-sources{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:20px}.video-sources button,.video-file-bar button,.reference-actions button,.add-group,.back-button{display:flex;align-items:center;justify-content:center;gap:8px;min-width:0;border:1px solid #dfe3eb;border-radius:7px;background:#fff;color:#222;font:inherit;cursor:pointer;box-sizing:border-box}.video-sources button{height:40px;font-size:14px;padding:5px 8px;white-space:nowrap}.video-sources button.active{border-color:#333;background:#fafafa}.video-sources button:hover,.video-file-bar button:hover,.reference-actions button:hover{border-color:#888;background:#fafafa}.video-file-bar{display:flex;align-items:center;gap:10px;min-height:54px;padding:7px 8px 7px 14px;border:1px solid #e9ebf0;border-radius:8px;background:#f6f7f9;margin-bottom:10px;box-sizing:border-box}.video-file-bar>svg{flex-shrink:0}.video-file-bar>span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.video-file-bar button{flex-shrink:0;height:36px;padding:5px 16px;font-size:13px}.video-preview{width:100%;min-height:0;flex:1;overflow:hidden;border-radius:5px;background:#f4f5f7;aspect-ratio:.98}.video-preview video{display:block;width:100%;height:100%;min-height:380px;object-fit:contain;background:#111}.video-unavailable{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;height:100%;min-height:380px;color:#999}.video-empty{display:flex;flex:1;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:400px;padding:32px 12px;border:1px dashed #dfe3e9;border-radius:8px;background:#fafbfc;box-sizing:border-box;color:#999;text-align:center}.video-empty>svg{color:#a0a5af}.video-empty h3{margin:3px 0 0;font-size:16px;color:#555;font-weight:500}.video-empty p{margin:0;font-size:12px;line-height:20px}.demo-button{height:34px;margin-top:6px;padding:5px 14px;border:1px solid #dfe3eb;border-radius:7px;background:white;color:#555;font:inherit;font-size:13px;cursor:pointer}.demo-button:hover{border-color:#999;color:#111}.media-notice{margin:8px 0 0;color:#999;font-size:12px;line-height:18px}.settings-panel{display:flex;flex-direction:column}.replacement-type{display:flex;flex-direction:column;gap:8px;margin-bottom:19px}.replacement-type>span{font-weight:600}.replacement-type>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:352px;max-width:100%;height:38px;padding:1px;border:1px solid #dce1e9;border-radius:8px;background:#fcfcfd;box-sizing:border-box}.replacement-type button{border:0;border-radius:7px;background:none;color:#444;font:inherit;cursor:pointer}.replacement-type button.selected{background:#171717;color:#fff;box-shadow:0 1px 3px #0002}.mapping-groups{border-top:1px solid #e7e9ed}.mapping-group{padding:18px 0 19px}.mapping-group+.mapping-group{border-top:1px solid #e7e9ed}.mapping-group>header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:13px}.mapping-group h3{margin:0;font-size:15px;font-weight:600;line-height:22px}.remove-group{display:flex;align-items:center;gap:7px;border:0;padding:0 2px;background:none;color:#999;font:inherit;font-size:12px;cursor:pointer}.remove-group:hover{color:#d65b5b}.remove-group:disabled{opacity:.4;cursor:not-allowed}.mapping-row{display:grid;grid-template-columns:minmax(0,1fr) 30px minmax(200px,.84fr);align-items:start;gap:14px}.description-field,.reference-field{display:flex;flex-direction:column;min-width:0;gap:9px}.description-field>span,.reference-field>span{font-weight:400}.description-field input{width:100%;height:40px;min-width:0;padding:8px 12px;border:1px solid #dce1e9;border-radius:7px;background:#fff;font:inherit;font-size:13px;color:#333;outline:none;box-sizing:border-box}.description-field input:focus,.preserve-field textarea:focus{border-color:#888}.description-field input::placeholder{color:#a7aab0}.mapping-arrow{align-self:center;margin-top:8px;color:#9ba2ae}.reference-row{display:grid;grid-template-columns:minmax(70px,92px) minmax(85px,1fr);gap:15px;align-items:start}.reference-visual{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0}.reference-thumb,.reference-empty{display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:1.03;border:0;border-radius:6px;background:#f2f3f5;overflow:hidden;padding:0;color:#a7acb5}.reference-thumb{cursor:zoom-in}.reference-thumb img{width:100%;height:100%;object-fit:cover}.reference-visual>span{font-size:11px;line-height:18px;color:#9297a1}.reference-actions{display:flex;flex-direction:column;gap:6px}.reference-actions button{height:30px;padding:3px 8px;font-size:12px;line-height:20px;gap:8px;white-space:nowrap}.reference-actions button:disabled{opacity:.4;cursor:not-allowed}.add-group{width:100%;height:44px;flex-shrink:0;background:#f8f9fb;border-radius:8px;color:#555}.add-group:hover{border-color:#999;background:#f4f5f7}.preserve-field{display:flex;flex-direction:column;gap:8px;margin-top:20px}.preserve-field>span{font-weight:600}.preserve-field textarea{width:100%;height:44px;min-height:44px;padding:10px 13px;border:1px solid #dce1e9;border-radius:8px;background:white;color:#444;font:inherit;font-size:13px;line-height:22px;resize:vertical;outline:none;box-sizing:border-box}.preserve-field textarea::placeholder{color:#a7aab0}.advanced-panel{border:1px solid #e9ebef;border-radius:11px;flex-shrink:0}.advanced-trigger{display:flex;align-items:center;gap:12px;width:100%;height:50px;padding:0 21px;border:0;background:transparent;color:#111;text-align:left;font:inherit;cursor:pointer}.advanced-trigger strong{font-weight:500}.advanced-trigger>span{margin-left:auto;font-size:12px;color:#8c919b}.advanced-trigger>svg:last-child{margin-left:2px;color:#656b73;transition:transform .2s}.advanced-trigger>svg.expanded{transform:rotate(180deg)}.advanced-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) 1fr;align-items:end;gap:18px;padding:4px 21px 20px}.advanced-fields>label{display:flex;flex-direction:column;gap:7px;font-size:13px;color:#555}.advanced-fields select{width:100%;height:36px;padding:5px 10px;border:1px solid #dce1e9;border-radius:7px;background:white;color:#222;font:inherit;outline:none}.advanced-fields .audio-setting{display:flex;flex-direction:row;align-items:center;justify-content:center;height:36px;gap:9px;color:#333;white-space:nowrap}.audio-setting input{width:15px;height:15px;margin:0;accent-color:#171717}.config-footer{display:flex;flex-direction:column;align-items:center;gap:9px;padding:0 0 2px;flex-shrink:0}.generate-button,.back-button{width:328px;max-width:100%;height:37px;border-radius:8px;font:inherit;cursor:pointer}.generate-button{border:1px solid #151515;background:#171717;color:#fff;font-weight:500;box-shadow:0 2px 5px #0000000c}.generate-button:hover{background:#292929}.back-button{background:#f8f9fb;color:#333}.back-button:hover{background:#f1f3f6}.prototype-note{margin:0;color:#a6a9ae;font-size:11px;line-height:18px}.validation-errors{width:100%;margin:0 0 3px;padding:10px 14px 10px 30px;border:1px solid #f3d6d6;border-radius:7px;background:#fff8f8;color:#c54c4c;box-sizing:border-box;font-size:12px;line-height:21px}.form-notice{margin:0;color:#bf7944;font-size:12px;line-height:20px;text-align:center}.reference-preview-mask{position:fixed;inset:0;z-index:1700;display:flex;align-items:center;justify-content:center;padding:30px;background:#111c;box-sizing:border-box;outline:none}.reference-preview-mask>img{max-width:90%;max-height:90%;object-fit:contain;border-radius:6px}.reference-preview-mask>button{position:absolute;right:24px;top:20px;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border:0;border-radius:7px;background:#1119;color:white;cursor:pointer}@media(min-width:1500px){.replacement-config{padding:0 24px 18px}.panel{padding:20px}.replacement-columns{gap:16px}.mapping-row{grid-template-columns:minmax(0,1fr) 32px minmax(220px,.84fr);gap:17px}.mapping-group{padding-top:20px;padding-bottom:22px}}@media(max-width:1200px){.replacement-columns{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:12px}.panel{padding:16px}.mapping-row{grid-template-columns:minmax(0,1fr) 18px minmax(155px,.9fr);gap:9px}.reference-row{grid-template-columns:68px minmax(76px,1fr);gap:9px}.reference-actions button{padding:3px 5px;gap:5px}.video-sources{gap:7px}.video-sources button{font-size:12px;gap:6px}.advanced-fields{gap:12px}.description-field input{padding:8px 10px}.video-preview video{min-height:350px}.mapping-group{padding-top:17px;padding-bottom:18px}}@media(max-width:1000px){.replacement-columns{grid-template-columns:1fr}.video-preview{aspect-ratio:1;flex:auto;max-height:530px}.video-preview video{min-height:0}.video-empty{min-height:290px}.mapping-row{grid-template-columns:minmax(0,1fr) 30px minmax(210px,.7fr);gap:16px}.reference-row{grid-template-columns:92px minmax(95px,1fr);gap:14px}.video-sources button{font-size:14px}.source-panel{min-height:0}.advanced-fields{grid-template-columns:repeat(2,minmax(0,1fr))}.advanced-fields .audio-setting{justify-content:flex-start}.replacement-config{height:auto;overflow:visible;padding:0 16px 16px}}@media(max-width:600px){.panel{padding:15px}.panel>h2{font-size:17px;margin-bottom:15px}.replacement-config{padding:0 12px 16px;gap:12px}.video-sources{gap:6px;margin-bottom:14px}.video-sources button{height:37px;font-size:12px;gap:5px;padding:5px}.video-sources svg{width:15px}.video-file-bar{font-size:12px;gap:7px;padding-left:10px}.video-file-bar button{padding:5px 11px;font-size:12px}.mapping-row{grid-template-columns:minmax(0,1fr);gap:12px}.mapping-arrow{display:none}.reference-row{display:flex;gap:14px}.reference-visual{width:82px;flex-shrink:0}.reference-actions{flex:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;align-self:center}.reference-actions button{font-size:11px;gap:4px;padding:3px}.reference-actions svg{width:13px}.reference-field>span{font-size:13px}.advanced-trigger{padding:0 15px;gap:9px}.advanced-trigger>span{font-size:11px}.advanced-fields{padding:0 15px 16px;gap:12px}.advanced-fields>label{font-size:12px}.generate-button,.back-button{width:100%}.prototype-note{font-size:10px}}
</style>
<style scoped>
.prompt-section{display:grid;grid-template-columns:minmax(0,1fr) 240px;align-items:end;gap:16px;flex-shrink:0}.prompt-section .preserve-field{margin-top:0}.prompt-section textarea{height:auto;min-height:66px}.prompt-preset-select{display:flex;flex-direction:column;gap:8px}.prompt-preset-select>span{font-weight:600}.prompt-preset-select select{width:100%;height:40px;padding:0 10px;border:1px solid #dce1e9;border-radius:8px;background:#fff;color:#444;font:inherit;outline:none}.prompt-preset-select select:focus{border-color:#888}.generate-button:disabled{opacity:.55;cursor:wait}@media(max-width:760px){.prompt-section{grid-template-columns:1fr}}
</style>
<style scoped>
.task-name-field{display:flex;flex-direction:column;flex-shrink:0;gap:8px;font-size:14px}.task-name-field>span{font-weight:500}.task-name-field input,.advanced-fields input[type=number],.audio-reference-setting textarea{width:100%;min-width:0;padding:9px 12px;border:1px solid #dce1e9;border-radius:7px;background:#fff;color:#222;font:inherit;outline:none;box-sizing:border-box}.task-name-field input{height:40px}.task-name-field input:focus,.advanced-fields input[type=number]:focus,.audio-reference-setting textarea:focus{border-color:#888}.advanced-fields{grid-template-columns:repeat(3,minmax(0,1fr));align-items:start}.advanced-fields input[type=number]{height:36px}.advanced-fields small{font-size:11px;line-height:18px;color:#9197a0}.audio-reference-setting{grid-column:span 2}.audio-reference-setting textarea{min-height:60px;resize:vertical;font-size:12px;line-height:18px}.generation-switches{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:14px 28px}.generation-switches .audio-setting{display:flex;align-items:center;justify-content:flex-start;height:auto;gap:9px;font-size:13px;color:#333}.generation-switches input{width:15px;height:15px;margin:0;accent-color:#171717}@media(max-width:1000px){.advanced-fields{grid-template-columns:repeat(2,minmax(0,1fr))}.audio-reference-setting{grid-column:1/-1}}@media(max-width:600px){.advanced-fields{grid-template-columns:1fr}.generation-switches{gap:12px}}
</style>
