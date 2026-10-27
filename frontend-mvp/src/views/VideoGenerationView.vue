<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronRight, Clapperboard, Image, LayoutGrid, LoaderCircle, Mic, Video } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import VideoTaskList from '@/components/video-generation/VideoTaskList.vue'
import StoryboardConfig from '@/components/video-generation/storyboard/StoryboardConfig.vue'
import StoryboardResult from '@/components/video-generation/storyboard/StoryboardResult.vue'
import ReverseConfig from '@/components/video-generation/storyboard/ReverseConfig.vue'
import ReverseResult from '@/components/video-generation/storyboard/ReverseResult.vue'
import PromptConfig from '@/components/video-generation/prompt/PromptConfig.vue'
import PromptResult from '@/components/video-generation/prompt/PromptResult.vue'
import ImageMaterials from '@/components/video-generation/images/ImageMaterials.vue'
import DouyinHotVideo from '@/components/video-generation/DouyinHotVideo.vue'
import ElementReplacementConfig from '@/components/video-generation/element-replace/config/ElementReplacementConfig.vue'
import ElementReplacementResult from '@/components/video-generation/element-replace/result/ElementReplacementResult.vue'
import ElementReplacementProcessing from '@/components/video-generation/element-replace/ElementReplacementProcessing.vue'
import SpeechSynthesisConfig from '@/components/video-generation/speech-synthesis/SpeechSynthesisConfig.vue'
import SpeechSynthesisProcessing from '@/components/video-generation/speech-synthesis/SpeechSynthesisProcessing.vue'
import SpeechSynthesisResult from '@/components/video-generation/speech-synthesis/SpeechSynthesisResult.vue'
import { normalizeSpeechInput, speechValidationMessage } from '@/composables/useSpeechSynthesis'
import { videoCapabilities } from '@/mock/video-generation'
import { useVideoPrototype } from '@/composables/useVideoPrototype'
import { releaseUnusedTaskVideos } from '@/composables/videoTaskMedia'
import type { VideoTask } from '@/types/video-generation'

const route = useRoute()
const router = useRouter()
const { tasks, refresh, save, remove } = useVideoPrototype()
const sidebarOpen = ref(true)
const draftTaskName = ref<string | null>(null)
const section = computed(() => String(route.params.capability ?? 'capability-square'))
const isSquare = computed(() => section.value === 'capability-square')
const isDouyin = computed(() => section.value === 'douyin-hot-video')
const capability = computed(() => videoCapabilities.find(item => item.operator === section.value))
const view = computed(() => capability.value?.operator === 'video-generate' ? 'list' : String(route.query.view ?? 'list'))
const currentTask = computed(() => tasks.value.find(task => task.id === String(route.query.id) && task.operator === capability.value?.operator))
const copySourceTask = computed(() => tasks.value.find(task => task.id === String(route.query.copyFrom) && task.operator === capability.value?.operator))
const initialTaskName = computed(() => currentTask.value?.name ?? String(route.query.name ?? capability.value?.title ?? ''))
const taskName = computed(() => ['element-replace', 'speech-synthesis'].includes(section.value) && view.value === 'config' && draftTaskName.value !== null ? draftTaskName.value : initialTaskName.value)
const taskStatusLabels = computed(() => {
  const concise = ['element-replace', 'speech-synthesis'].includes(capability.value?.operator ?? '')
  return { draft: '草稿', queued: '排队中', processing: capability.value?.processingLabel ?? '处理中', completed: '已完成', failed: concise ? '失败' : '已失败', timeout: concise ? '超时' : '已超时' }
})
const taskStatusLabel = computed(() => currentTask.value ? taskStatusLabels.value[currentTask.value.status] : '')
const operatorTasks = computed(() => tasks.value.filter(task => task.operator === capability.value?.operator))
const configComponent = computed(() => section.value === 'speech-synthesis' ? SpeechSynthesisConfig : section.value === 'element-replace' ? ElementReplacementConfig : section.value === 'storyboard' ? StoryboardConfig : section.value === 'prompt-reverse' ? ReverseConfig : PromptConfig)
const resultComponent = computed(() => section.value === 'speech-synthesis' ? SpeechSynthesisResult : section.value === 'element-replace' ? ElementReplacementResult : section.value === 'storyboard' ? StoryboardResult : section.value === 'prompt-reverse' ? ReverseResult : PromptResult)
function square() { router.push('/video-gen/capability-square') }
function list() { router.push({ path: `/video-gen/${section.value}`, query: { from: 'capability-square' } }) }
function setView(nextView: string, id?: string, name?: string) {
  router.push({ path: `/video-gen/${section.value}`, query: { from: 'capability-square', view: nextView, ...(id ? { id } : {}), ...(name ? { name } : {}) } })
}
function create(name: string) { setView('config', undefined, name) }
function copyTask(id: string) {
  const task = tasks.value.find(item => item.id === id && item.operator === capability.value?.operator)
  if (!task) return
  const suffix = '-副本'
  const name = `${task.name.slice(0, Math.max(1, 20 - suffix.length))}${suffix}`
  router.push({ path: `/video-gen/${section.value}`, query: { from: 'capability-square', view: 'config', copyFrom: id, name } })
}
function open(id: string) { const task = tasks.value.find(item => item.id === id); setView(task && ['queued', 'processing'].includes(task.status) ? 'processing' : 'result', id) }
function saveTask(task: VideoTask) {
  const previous = tasks.value.find(item => item.id === task.id)
  save(task)
  releaseUnusedTaskVideos(previous, tasks.value)
}
async function submit(input: Record<string, any>, configuredName?: string) {
  if (!capability.value) return
  let name = taskName.value
  if (capability.value.operator === 'speech-synthesis') {
    name = (configuredName ?? taskName.value).trim()
    const error = speechValidationMessage(name, input)
    if (error) { ElMessage.error(error); return }
    input = normalizeSpeechInput(input)
  }
  if (capability.value.operator === 'element-replace') {
    name = (configuredName ?? taskName.value).trim()
    if (!name || name.length > 20) { ElMessage.error('请输入20个字符以内的任务名称'); return }
    const { resultVideo: _resultVideo, resultUsesOriginal: _resultUsesOriginal, ...nextInput } = input
    const task: VideoTask = { id: currentTask.value?.id ?? `video-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, operator: 'element-replace', name, status: 'processing', createdAt: currentTask.value?.createdAt ?? new Date().toISOString(), input: { ...nextInput, prototypeDemo: true } }
    try { saveTask(task); setView('processing', task.id) } catch { ElMessage.error('本地任务保存失败，请减少参考素材后重试') }
    return
  }
  const task: VideoTask = { id: currentTask.value?.id ?? `video-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, operator: capability.value.operator, name, status: 'processing', createdAt: currentTask.value?.createdAt ?? new Date().toISOString(), input }
  try { saveTask(task); setView('processing', task.id) } catch { ElMessage.error('本地保存失败，图片可能超出浏览器存储空间，请减少图片后重试') }
}
function completeDemo() {
  if (!currentTask.value) return
  const input = currentTask.value.operator === 'element-replace' ? { ...currentTask.value.input, resultVideo: currentTask.value.input.sourceVideo, resultUsesOriginal: true } : currentTask.value.input
  try { saveTask({ ...currentTask.value, input, status: 'completed' }); setView('result', currentTask.value.id) } catch { ElMessage.error('本地任务保存失败，请重试') }
}
function updateInput(input: Record<string, any>) {
  if (!currentTask.value) return
  try { saveTask({ ...currentTask.value, input }) } catch { ElMessage.error('本地保存失败，请减少参考素材后重试') }
}
function deleteTask(id: string) {
  const task = tasks.value.find(item => item.id === id)
  try {
    remove(id)
    releaseUnusedTaskVideos(task, tasks.value)
  } catch { ElMessage.error('删除失败，请重试') }
}
function toggleSidebar() { sidebarOpen.value = !sidebarOpen.value }
watch(() => route.fullPath, () => { draftTaskName.value = null; refresh() })
onMounted(() => { window.addEventListener('tianma:video-sidebar', toggleSidebar) })
onBeforeUnmount(() => { window.removeEventListener('tianma:video-sidebar', toggleSidebar) })
</script>

<template>
  <div class="video-layout" :class="{ 'video-layout--collapsed': !sidebarOpen }">
    <aside v-if="sidebarOpen" aria-label="视频生成导航" class="video-sidebar">
      <nav aria-label="视频生成菜单">
        <button :class="{ active: !isDouyin }" @click="square"><LayoutGrid :size="16" />能力广场</button>
        <button :class="{ active: isDouyin }" @click="router.push('/video-gen/douyin-hot-video')"><Clapperboard :size="16" />抖音爆款视频</button>
      </nav>
    </aside>
    <main class="video-surface">
      <section v-if="isSquare" class="capability-square">
        <h1>能力广场</h1>
        <div class="capability-grid">
          <button v-for="item in videoCapabilities" :key="item.operator" class="capability-card" :data-testid="`capability-${item.operator}`" @click="router.push({ path: `/video-gen/${item.operator}`, query: { from: 'capability-square' } })">
            <div class="capability-card__head"><span class="capability-card__icon"><Image v-if="item.operator === 'image-generate'" :size="20" /><Mic v-else-if="item.operator === 'speech-synthesis'" :size="20" /><Video v-else :size="20" /></span><strong>{{ item.title }}</strong><span class="capability-card__tag">{{ item.operator === 'speech-synthesis' ? '原型演示' : '在线体验' }}</span></div>
            <p>{{ item.description }}</p>
          </button>
        </div>
      </section>
      <DouyinHotVideo v-else-if="isDouyin" />
      <ImageMaterials v-else-if="section === 'image-generate'" />
      <template v-else-if="capability">
        <header class="video-breadcrumb"><button @click="square">能力广场</button><ChevronRight :size="12" /><button v-if="view !== 'list'" @click="list">{{ capability.title }}</button><span v-else>{{ capability.title }}</span><template v-if="view !== 'list'"><ChevronRight :size="12" /><strong>{{ taskName }}</strong><span v-if="currentTask" class="video-status">{{ taskStatusLabel }}</span></template></header>
        <VideoTaskList v-if="view === 'list'" :key="section" class="video-content" :meta="capability" :tasks="operatorTasks" :unavailable="section === 'video-generate'" @create="create" @view="open" @edit="id => setView('config', id)" @copy="copyTask" @remove="deleteTask" />
        <component :is="configComponent" v-else-if="view === 'config'" :key="`${section}-${route.query.id ?? route.query.copyFrom ?? route.query.name}`" class="video-config-content" :class="{ 'element-config-content': section === 'element-replace' }" :initial-data="currentTask?.input ?? copySourceTask?.input" :initial-name="initialTaskName" @update-name="draftTaskName = $event" @submit="submit" @back="list" />
        <ElementReplacementProcessing v-else-if="section === 'element-replace' && view === 'processing' && currentTask" @complete="completeDemo" />
        <SpeechSynthesisProcessing v-else-if="section === 'speech-synthesis' && view === 'processing' && currentTask" @complete="completeDemo" />
        <section v-else-if="view === 'processing' && currentTask" class="video-processing">
          <span class="video-demo-label">原型演示</span><LoaderCircle :size="28" class="video-spinner" /><h2>{{ capability.processingLabel }}</h2><p>此为异步任务，您可同时处理多条任务，任务完成后在列表点击查看结果。</p><button class="video-primary" @click="completeDemo">查看演示结果</button><button class="video-plain" @click="list">返回任务列表</button>
        </section>
        <component :is="resultComponent" v-else-if="view === 'result' && currentTask" :key="currentTask.id" class="video-result-content" :task="currentTask" @update-input="updateInput" @edit="setView('config', currentTask.id)" @back="list" />
        <div v-else class="video-missing"><p>任务不存在或已删除</p><button class="video-primary" @click="list">返回任务列表</button></div>
      </template>
      <div v-else class="video-missing"><p>暂未找到该能力</p><button class="video-primary" @click="square">返回能力广场</button></div>
    </main>
  </div>
</template>

<style scoped>
.video-layout{display:flex;height:calc(100dvh - 56px);min-height:520px;background:#f8f9fb;font-family:system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#111}.video-sidebar{width:270px;flex:0 0 270px;padding:14px 12px;box-sizing:border-box}.video-sidebar nav{display:flex;flex-direction:column;gap:2px}.video-sidebar button{display:flex;gap:8px;align-items:center;width:100%;height:36px;border:0;border-radius:8px;background:transparent;padding:0 12px;font-size:14px;text-align:left;cursor:pointer}.video-sidebar button.active,.video-sidebar button:hover{background:#edeef1}.video-sidebar button.active{font-weight:500}.video-surface{display:flex;flex:1;min-width:0;min-height:0;flex-direction:column;overflow:hidden;margin:0 8px 8px 0;border:1px solid #e8e9eb;border-radius:12px;background:#fff}.video-layout--collapsed .video-surface{margin-left:8px}.capability-square{height:100%;overflow-y:auto;padding:20px 32px}.capability-square h1{font-size:20px;font-weight:600;margin:0 0 16px}.capability-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 16px}.capability-card{height:120px;display:flex;flex-direction:column;align-items:flex-start;padding:16px;border:1px solid #ededed;border-radius:18px;background:#fff;box-shadow:0 8px 20px -12px #0000000f;cursor:pointer;text-align:left;transition:box-shadow .2s}.capability-card:hover{box-shadow:0 24px 20px -28px #00000029}.capability-card__head{display:flex;align-items:center;min-width:0;white-space:nowrap}.capability-card__icon{display:grid;place-items:center;width:36px;height:36px;flex-shrink:0;background:#eee;border-radius:10px;margin-right:12px}.capability-card strong{font-size:14px;font-weight:500}.capability-card__tag{background:#eaf4ff;color:#007aff;font-size:10px;line-height:12px;padding:2px 4px;border-radius:3px;margin-left:4px}.capability-card p{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:#999;font-size:12px;line-height:20px;margin:12px 0 0}.video-breadcrumb{display:flex;align-items:center;gap:10px;height:64px;min-height:64px;padding:0 32px;font-size:14px;color:#999}.video-breadcrumb button{border:0;background:transparent;padding:0;color:#777;font:inherit;cursor:pointer}.video-breadcrumb>span,.video-breadcrumb strong{color:#111;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.video-breadcrumb>svg{flex-shrink:0}.video-breadcrumb .video-status{padding:2px 6px;background:#f2f6ff;color:#1677ff;font-size:12px;font-weight:400;border-radius:4px;flex-shrink:0}.video-content{flex:1;min-height:0}.video-config-content,.video-result-content{min-height:0;flex:1;overflow:auto;padding:24px 24px 0}.video-processing,.video-missing{display:flex;flex:1;flex-direction:column;align-items:center;justify-content:center;padding:32px;gap:16px;text-align:center}.video-processing h2{font-size:16px;margin:0}.video-processing p{color:#999;font-size:14px;max-width:600px}.video-spinner{animation:video-spin 1.3s linear infinite}.video-demo-label{padding:3px 7px;background:#fff7df;border-radius:4px;color:#a77b18;font-size:12px}.video-primary{height:36px;border:1px solid #111;border-radius:8px;background:#111;color:#fff;padding:0 16px;cursor:pointer;font-size:14px}.video-plain{border:0;background:transparent;font-size:14px;color:#777;cursor:pointer}@keyframes video-spin{to{transform:rotate(360deg)}}@media(max-width:1200px){.capability-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.video-sidebar{width:220px;flex-basis:220px}}@media(max-width:760px){.video-layout{min-height:calc(100dvh - 56px);height:auto;flex-direction:column}.video-sidebar{width:100%;flex-basis:auto;padding:8px}.video-sidebar nav{flex-direction:row}.video-sidebar button{width:auto}.video-surface{min-height:calc(100dvh - 120px);margin:0 8px 8px}.capability-square{padding:20px 16px}.capability-grid{grid-template-columns:1fr}.capability-card{height:120px}.video-breadcrumb{padding:0 16px;gap:6px}.video-config-content,.video-result-content{overflow:visible}}
</style>
<style scoped>.element-config-content{padding-top:14px}</style>
