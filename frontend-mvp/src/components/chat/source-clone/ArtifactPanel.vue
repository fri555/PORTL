<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowLeft, Download, FileSpreadsheet, FileText, FileWarning, Presentation, X } from 'lucide-vue-next'
import { useProjectsStore, type ArtifactFile, type ArtifactKind } from '@/stores/projects'
import { brandDailyReportHtml } from '@/utils/artifactReportHtml'

const props = defineProps<{ sessionId: string }>()
const emit = defineEmits<{ close: []; 'preview-change': [previewing: boolean] }>()

const store = useProjectsStore()
store.defaultSessionArtifacts(props.sessionId)

const artifacts = computed(() => store.artifactsForSession(props.sessionId))
const view = ref<'list' | 'preview'>('list')
const tabs = ref<ArtifactFile[]>([])
const activeTabId = ref('')
const activeFile = computed(() => tabs.value.find(file => file.id === activeTabId.value))
const retryKey = ref(0)
const notice = ref('')
// 预览展开时父级把产物栏加宽到与真实产品一致的阅读宽度。
watch(view, value => emit('preview-change', value === 'preview'), { immediate: true })
const previewHtml = computed(() => {
  if (!activeFile.value) return '<p>暂无预览内容</p>'
  if (activeFile.value.template === 'brand-daily') return brandDailyReportHtml()
  return activeFile.value.preview || '<p>暂无预览内容</p>'
})

function openFile(file: ArtifactFile) {
  if (!tabs.value.some(item => item.id === file.id)) tabs.value = [...tabs.value, file]
  activeTabId.value = file.id
  view.value = 'preview'
  notice.value = ''
}
function switchTab(id: string) {
  activeTabId.value = id
  view.value = 'preview'
}
function closeTab(id: string) {
  const next = tabs.value.filter(file => file.id !== id)
  tabs.value = next
  if (activeTabId.value === id) {
    activeTabId.value = next.at(-1)?.id ?? ''
    if (!next.length) view.value = 'list'
  }
}
function backToList() { view.value = 'list' }

function iconFor(kind: ArtifactKind) {
  if (kind === 'XLSX') return FileSpreadsheet
  if (kind === 'PPTX') return Presentation
  if (kind === 'PDF') return FileText
  return FileText
}

function download(file: ArtifactFile) {
  if (!file.available) { notice.value = '该文件暂不可预览或下载'; return }
  const body = `${file.name}\n${file.preview ?? '本地原型演示文件'}`
  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.name.replace(/\.[^.]+$/, '.txt')
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  notice.value = '已开始下载'
}
function retry() { retryKey.value++; notice.value = '已重新加载，文件仍不可用' }
</script>

<template>
  <div class="artifact-panel" data-testid="artifact-panel">
    <header class="artifact-panel__head">
      <template v-if="view === 'preview' && activeFile">
        <div class="artifact-file-meta">
          <span class="artifact-file-icon"><FileText :size="16" /></span>
          <span class="artifact-file-copy">
            <strong :title="activeFile.name">{{ activeFile.name }}</strong>
            <small>创建时间: {{ activeFile.createdAt }}</small>
          </span>
        </div>
        <div class="artifact-head-actions">
          <button type="button" title="下载文件" :disabled="!activeFile.available" @click="download(activeFile)"><Download :size="14" />下载</button>
          <button type="button" aria-label="关闭产物栏" title="关闭" @click="emit('close')"><X :size="18" /></button>
        </div>
      </template>
      <template v-else>
        <div><strong>产物栏</strong><small>本会话产物 + 本项目共享文件</small></div>
        <button type="button" aria-label="关闭产物栏" title="关闭" @click="emit('close')"><X :size="18" /></button>
      </template>
    </header>

    <div class="artifact-panel__tabs">
      <button class="artifact-tab artifact-tab--list" :class="{ 'is-active': view === 'list' }" type="button" @click="backToList">
        <ArrowLeft :size="13" />文件列表
      </button>
      <button
        v-for="file in tabs"
        :key="file.id"
        class="artifact-tab"
        :class="{ 'is-active': view === 'preview' && activeTabId === file.id }"
        type="button"
        :title="file.name"
        @click="switchTab(file.id)"
      >
        <span>{{ file.name }}</span>
        <X :size="12" @click.stop="closeTab(file.id)" />
      </button>
    </div>

    <div v-if="view === 'list'" class="artifact-panel__body">
      <section class="artifact-group">
        <h3>本会话产物 <em>{{ artifacts.session.length }}</em></h3>
        <button v-for="file in artifacts.session" :key="file.id" class="artifact-row" type="button" @click="openFile(file)">
          <component :is="iconFor(file.kind)" :size="17" />
          <span><strong>{{ file.name }}</strong><small>{{ file.kind }} · {{ file.size }} · {{ file.createdAt }}</small></span>
          <FileWarning v-if="!file.available" :size="14" class="artifact-row__warn" />
        </button>
        <p v-if="!artifacts.session.length" class="artifact-empty">本次会话还没有产物</p>
      </section>

      <section class="artifact-group">
        <h3>本项目共享文件 <em>{{ artifacts.project.length }}</em></h3>
        <p v-if="artifacts.projectName" class="artifact-group__hint">来自项目「{{ artifacts.projectName }}」，项目内其他对话也能使用</p>
        <button v-for="file in artifacts.project" :key="file.id" class="artifact-row" type="button" @click="openFile(file)">
          <component :is="iconFor(file.kind)" :size="17" />
          <span><strong>{{ file.name }}</strong><small>{{ file.kind }} · {{ file.size }} · {{ file.createdAt }}</small></span>
        </button>
        <p v-if="!artifacts.project.length" class="artifact-empty">当前会话不属于项目，可在侧栏把会话移入项目后共享文件</p>
      </section>
    </div>

    <div v-else class="artifact-panel__body artifact-panel__preview" :key="activeTabId + '-' + retryKey">
      <template v-if="activeFile">
        <div v-if="!activeFile.available" class="artifact-preview__missing">
          <FileWarning :size="26" />
          <strong>该文件暂不可预览</strong>
          <p>可切换到其他文件、重试或返回文件列表</p>
          <div><button type="button" @click="retry">重新加载</button><button type="button" @click="backToList">返回文件列表</button></div>
        </div>
        <iframe
          v-else-if="activeFile.kind === 'HTML'"
          class="artifact-preview__frame"
          :srcdoc="previewHtml"
          sandbox="allow-scripts"
          title="文件预览"
        />
        <div v-else class="artifact-preview__doc">
          <component :is="iconFor(activeFile.kind)" :size="34" />
          <h4>{{ activeFile.name }}</h4>
          <p>{{ activeFile.preview || '本地原型演示文件' }}</p>
          <small>{{ activeFile.kind }} · {{ activeFile.size }} · {{ activeFile.createdAt }}</small>
        </div>
      </template>
      <p v-else class="artifact-empty">选择一个文件开始预览</p>
      <p v-if="notice" class="artifact-notice" role="status">{{ notice }}</p>
    </div>

    <footer class="artifact-panel__foot">标签保留，可随时返回文件列表继续打开其他文件</footer>
  </div>
</template>

<style scoped>
.artifact-panel { display: flex; width: 100%; min-width: 0; height: 100%; flex: 1 1 auto; flex-direction: column; font-family: system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; }
.artifact-panel__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 62px; padding: 12px 18px; border-bottom: 1px solid #ededed; }
.artifact-panel__head > div:first-child { min-width: 0; }
.artifact-panel__head strong { display: block; font-size: 15px; font-weight: 600; }
.artifact-panel__head small { display: block; margin-top: 4px; color: #9aa0a8; font-size: 11px; }
.artifact-panel__head > button,
.artifact-head-actions > button:last-child { display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 7px; color: #666; background: transparent; cursor: pointer; }
.artifact-panel__head > button:hover,
.artifact-head-actions > button:last-child:hover { background: #f2f3f5; }
.artifact-file-meta { display: flex; min-width: 0; align-items: center; gap: 10px; }
.artifact-file-icon { display: grid; width: 30px; height: 30px; flex: 0 0 30px; place-items: center; border-radius: 8px; color: #fff; background: #8b5cf6; }
.artifact-file-copy { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.artifact-file-copy strong { overflow: hidden; font-size: 13px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.artifact-file-copy small { margin: 0; }
.artifact-head-actions { display: flex; flex: 0 0 auto; align-items: center; gap: 8px; }
.artifact-head-actions > button:first-child { display: inline-flex; align-items: center; gap: 5px; padding: 5px 8px; border: 0; border-radius: 7px; color: #555; background: transparent; font-size: 12px; cursor: pointer; }
.artifact-head-actions > button:first-child:hover { background: #f2f3f5; }
.artifact-head-actions > button:disabled { color: #b6bbc3; cursor: not-allowed; }
.artifact-panel__tabs { display: flex; gap: 4px; overflow-x: auto; padding: 9px 14px; border-bottom: 1px solid #f0f1f3; scrollbar-width: none; }
.artifact-panel__tabs::-webkit-scrollbar { display: none; }
.artifact-tab { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 5px; max-width: 150px; height: 27px; padding: 0 8px; border: 1px solid #e8e9ec; border-radius: 7px; color: #666; background: #fff; font-size: 11px; cursor: pointer; }
.artifact-tab span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.artifact-tab.is-active { border-color: #b9cdf0; color: #2469c8; background: #f2f7ff; }
.artifact-tab--list { color: #444; }
.artifact-panel__body { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 18px 24px; }
.artifact-group { margin-bottom: 20px; }
.artifact-group h3 { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; color: #4a505a; font-size: 12px; font-weight: 600; }
.artifact-group h3 em { color: #9aa0a8; font-size: 11px; font-style: normal; }
.artifact-group__hint { margin: -2px 0 9px; color: #9aa0a8; font-size: 11px; line-height: 17px; }
.artifact-row { display: flex; width: 100%; align-items: center; gap: 9px; padding: 10px 6px; border: 0; border-bottom: 1px solid #f2f3f5; color: #6c7683; background: transparent; cursor: pointer; text-align: left; }
.artifact-row:hover { background: #f7f9fc; }
.artifact-row span { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 3px; }
.artifact-row strong { overflow: hidden; color: #333; font-size: 12px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.artifact-row small { color: #9aa0a8; font-size: 10px; }
.artifact-row__warn { flex: 0 0 14px; color: #d99a2b; }
.artifact-empty { margin: 12px 0; color: #a0a5ad; font-size: 11px; line-height: 18px; }
.artifact-panel__preview { display: flex; flex-direction: column; padding: 0; }
.artifact-preview__frame { flex: 1; min-height: 320px; width: 100%; border: 0; border-radius: 0; background: #f5f7fb; }
.artifact-preview__doc { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 10px; margin: 16px 18px; padding: 24px; border: 1px solid #eceef1; border-radius: 9px; background: #fafbfc; text-align: center; color: #8a9099; }
.artifact-preview__doc h4 { margin: 0; color: #333; font-size: 13px; font-weight: 500; }
.artifact-preview__doc p { margin: 0; font-size: 12px; line-height: 19px; }
.artifact-preview__doc small { font-size: 10px; }
.artifact-preview__missing { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 30px 18px; color: #9aa0a8; text-align: center; }
.artifact-preview__missing strong { color: #444; font-size: 13px; font-weight: 500; }
.artifact-preview__missing p { margin: 0; font-size: 11px; }
.artifact-preview__missing div { display: flex; gap: 8px; margin-top: 8px; }
.artifact-preview__missing div button { padding: 6px 10px; border: 1px solid #e4e6ea; border-radius: 7px; background: #fff; color: #555; font-size: 11px; cursor: pointer; }
.artifact-notice { margin: 0; padding: 8px 18px; color: #2469c8; font-size: 11px; }
.artifact-panel__foot { padding: 10px 18px; border-top: 1px solid #ededed; color: #9aa0a8; font-size: 10px; }
</style>
