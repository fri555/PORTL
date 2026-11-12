<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, FileText, FolderPlus, MessageSquarePlus, Pencil, Plus, Trash2, UploadCloud, X } from 'lucide-vue-next'
import { useProjectsStore } from '@/stores/projects'
import { listPrototypeChatSessions } from '@/utils/prototypeChatStore'

const props = defineProps<{ projectId: string }>()
const emit = defineEmits<{
  close: []
  'open-session': [sessionId: string]
  'new-session': [projectId: string]
  'delete-project': [projectId: string]
}>()

const store = useProjectsStore()
const project = computed(() => store.projects.find(item => item.id === props.projectId))
const sharedFiles = computed(() => store.projectSharedFiles(props.projectId))

const renaming = ref(false)
const renameValue = ref('')
function startRename() {
  if (!project.value) return
  renameValue.value = project.value.name
  renaming.value = true
}
function saveRename() {
  if (renameValue.value.trim()) store.renameProject(props.projectId, renameValue.value)
  renaming.value = false
}

const candidateSessions = computed(() => {
  const local = listPrototypeChatSessions().map(item => ({ id: item.id, title: item.prompt || item.id }))
  const presets = [
    { id: 'daily-default', title: '天马智擎助手 通用助手' },
    { id: 'daily-auth', title: '获取下我钉钉上相关信息' },
    { id: 'daily-document', title: '看下这个文档和附件' },
    { id: 'expert-capability', title: '你能做什么' },
    { id: 'expert-profit', title: '店铺利润情况分析' },
  ]
  return [...local, ...presets].filter((item, index, list) => list.findIndex(other => other.id === item.id) === index)
})
const pickedSession = ref('')
function addPickedSession() {
  if (!pickedSession.value) return
  store.addSessionToProject(pickedSession.value, props.projectId)
  pickedSession.value = ''
}
function detach(sessionId: string) {
  store.removeSessionFromProject(sessionId)
}

function addExampleFile() {
  const index = sharedFiles.value.length + 1
  store.addFileToProject(props.projectId, {
    name: `项目资料_${index}.xlsx`,
    size: `${(18 + index * 2.4).toFixed(1)} KB`,
    kind: 'XLSX',
    preview: `项目资料 ${index}｜原型演示文件`,
  })
}
</script>

<template>
  <div class="project-detail" data-testid="project-detail">
    <header class="project-detail__head">
      <button class="project-detail__back" type="button" @click="emit('close')"><ArrowLeft :size="17" />返回</button>
      <div class="project-detail__title">
        <template v-if="renaming">
          <input v-model="renameValue" aria-label="项目名称" @keyup.enter="saveRename" />
          <button type="button" @click="saveRename">保存</button>
          <button type="button" aria-label="取消重命名" @click="renaming = false"><X :size="15" /></button>
        </template>
        <template v-else>
          <h1>{{ project?.name ?? '项目不存在' }}</h1>
          <button type="button" title="重命名项目" aria-label="重命名项目" @click="startRename"><Pencil :size="15" /></button>
        </template>
        <p>项目里的多个对话共用同一批文件；文件只对本人的这些对话可见。</p>
      </div>
      <button v-if="project" class="project-detail__delete" type="button" @click="emit('delete-project', projectId)"><Trash2 :size="15" />删除项目</button>
    </header>

    <div v-if="project" class="project-detail__body">
      <section class="project-block">
        <header><strong>项目内对话</strong><span>{{ project.sessionIds.length }} 个</span></header>
        <div class="project-actions">
          <button class="project-primary" type="button" @click="emit('new-session', projectId)"><MessageSquarePlus :size="15" />新建对话</button>
          <select v-model="pickedSession" aria-label="选择要移入的会话">
            <option value="">选择已有会话移入…</option>
            <option v-for="item in candidateSessions" :key="item.id" :value="item.id">{{ item.title }}</option>
          </select>
          <button type="button" :disabled="!pickedSession" @click="addPickedSession">移入项目</button>
        </div>
        <ul class="project-sessions">
          <li v-for="sid in project.sessionIds" :key="sid">
            <button type="button" @click="emit('open-session', sid)"><FolderPlus :size="14" />{{ sid }}</button>
            <button type="button" title="移出项目" aria-label="移出项目" @click="detach(sid)"><X :size="14" /></button>
          </li>
          <li v-if="!project.sessionIds.length" class="project-empty">还没有对话，点「新建对话」开始。</li>
        </ul>
      </section>

      <section class="project-block">
        <header><strong>项目共享文件</strong><span>{{ sharedFiles.length }} 个</span></header>
        <div class="project-actions">
          <button class="project-primary" type="button" @click="addExampleFile"><UploadCloud :size="15" />添加示例文件</button>
          <small>对话中上传或生成的文件，以及从产物栏保存进来的文件都会出现在这里</small>
        </div>
        <ul class="project-files">
          <li v-for="file in sharedFiles" :key="file.id">
            <FileText :size="16" />
            <span><strong>{{ file.name }}</strong><small>{{ file.kind }} · {{ file.size }} · {{ file.createdAt }}</small></span>
          </li>
          <li v-if="!sharedFiles.length" class="project-empty">还没有共享文件。</li>
        </ul>
      </section>

      <p class="project-detail__tip"><Plus :size="13" />删除项目时默认只解除组织关系，对话和文件会保留。</p>
    </div>
    <div v-else class="project-detail__missing">项目不存在或已被删除。<button type="button" @click="emit('close')">返回会话</button></div>
  </div>
</template>

<style scoped>
.project-detail { display: flex; height: 100%; min-height: 0; flex-direction: column; overflow: hidden; background: #fff; font-family: system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; }
.project-detail__head { display: flex; align-items: flex-start; gap: 16px; padding: 24px 30px 18px; border-bottom: 1px solid #ededed; }
.project-detail__back { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border: 1px solid #e6e8eb; border-radius: 8px; color: #555; background: #fff; font-size: 12px; cursor: pointer; }
.project-detail__back:hover { background: #f7f8fa; }
.project-detail__title { flex: 1; min-width: 0; }
.project-detail__title h1 { display: inline-block; margin: 0 8px 0 0; font-size: 20px; font-weight: 600; }
.project-detail__title p { margin: 7px 0 0; color: #8a9099; font-size: 12px; }
.project-detail__title button { display: inline-grid; place-items: center; width: 26px; height: 26px; margin-right: 5px; border: 0; border-radius: 6px; color: #777; background: transparent; cursor: pointer; }
.project-detail__title button:hover { background: #f2f3f5; }
.project-detail__title input { height: 30px; padding: 0 9px; border: 1px solid #d9dde3; border-radius: 7px; font-size: 15px; }
.project-detail__delete { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border: 1px solid #f3d3d3; border-radius: 8px; color: #c53b3b; background: #fff; font-size: 12px; cursor: pointer; }
.project-detail__delete:hover { background: #fff5f5; }
.project-detail__body { flex: 1; min-height: 0; overflow-y: auto; padding: 20px 30px 40px; }
.project-block { margin-bottom: 22px; padding: 18px; border: 1px solid #eceef1; border-radius: 12px; }
.project-block > header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.project-block > header strong { font-size: 14px; font-weight: 600; }
.project-block > header span { color: #9aa0a8; font-size: 12px; }
.project-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.project-actions button, .project-actions select { height: 31px; padding: 0 11px; border: 1px solid #e4e6ea; border-radius: 8px; color: #555; background: #fff; font-size: 12px; cursor: pointer; }
.project-actions button:disabled { color: #b6bbc3; cursor: not-allowed; }
.project-actions .project-primary { display: inline-flex; align-items: center; gap: 5px; border-color: #1c1c1e; color: #fff; background: #1c1c1e; }
.project-actions small { color: #9aa0a8; font-size: 11px; }
.project-sessions, .project-files { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.project-sessions li { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; background: #f7f8fa; }
.project-sessions li button:first-child { display: inline-flex; flex: 1; min-width: 0; align-items: center; gap: 7px; overflow: hidden; border: 0; color: #333; background: transparent; font-size: 12px; text-align: left; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.project-sessions li button:last-child { display: grid; place-items: center; width: 22px; height: 22px; border: 0; border-radius: 6px; color: #999; background: transparent; cursor: pointer; }
.project-sessions li button:last-child:hover { background: #e9ebef; color: #c53b3b; }
.project-files li { display: flex; align-items: center; gap: 10px; padding: 10px; border-bottom: 1px solid #f2f3f5; color: #6c7683; }
.project-files li span { display: flex; flex-direction: column; gap: 3px; }
.project-files li strong { color: #333; font-size: 12px; font-weight: 500; }
.project-files li small { color: #9aa0a8; font-size: 11px; }
.project-empty { padding: 14px 0 !important; color: #a0a5ad; background: transparent !important; font-size: 12px; }
.project-detail__tip { display: flex; align-items: center; gap: 5px; color: #9aa0a8; font-size: 11px; }
.project-detail__missing { padding: 60px 30px; text-align: center; color: #888; font-size: 13px; }
.project-detail__missing button { margin-left: 8px; padding: 5px 10px; border: 1px solid #e4e6ea; border-radius: 7px; background: #fff; cursor: pointer; }
</style>
