<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Copy, Eye, Mic, Pencil, Plus, Search, Trash2, Video, X } from 'lucide-vue-next'
import type { VideoCapability, VideoTask } from '@/types/video-generation'
import { speechCharacterCount, speechFormatLabel, speechVoiceName } from '@/composables/useSpeechSynthesis'
const props = defineProps<{ meta: VideoCapability; tasks: VideoTask[]; unavailable?: boolean }>()
const emit = defineEmits<{ create: [name: string]; view: [id: string]; edit: [id: string]; copy: [id: string]; remove: [id: string] }>()
const keyword = ref('')
const status = ref('')
const creating = ref(false)
const name = ref('')
const error = ref('')
const deleting = ref('')
const nameInput = ref<HTMLInputElement | null>(null)
const nameTrigger = ref<HTMLElement | null>(null)
const emptyImage = `${import.meta.env.BASE_URL}assets/video-generation/task-empty.svg`
const statuses = computed(() => {
  if (props.meta.operator === 'speech-synthesis') return [
    { value: '', label: '全部' }, { value: 'processing', label: '合成中' },
    { value: 'completed', label: '已完成' }, { value: 'failed', label: '失败' },
  ]
  if (props.meta.operator === 'element-replace') return [
    { value: '', label: '全部' }, { value: 'queued', label: '排队中' },
    { value: 'processing', label: '处理中' }, { value: 'completed', label: '已完成' },
    { value: 'failed', label: '失败' }, { value: 'timeout', label: '超时' },
  ]
  return [
    { value: '', label: '全部' }, { value: 'queued', label: '排队中' },
    { value: 'processing', label: props.meta.processingLabel }, { value: 'completed', label: '已完成' },
    { value: 'failed', label: '已失败' }, { value: 'timeout', label: '已超时' },
  ]
})
const filtered = computed(() => props.tasks.filter(task => (!status.value || task.status === status.value) && task.name.toLowerCase().includes(keyword.value.trim().toLowerCase())))
function count(value: string) { return value ? props.tasks.filter(task => task.status === value).length : props.tasks.length }
function label(value: string) { return statuses.value.find(item => item.value === value)?.label ?? value }
function isBusy(task: VideoTask) { return ['queued', 'processing'].includes(task.status) }
function createdAt(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString('sv-SE') }
async function openCreate(event: Event) {
  nameTrigger.value = event.currentTarget as HTMLElement
  name.value = `${props.meta.namePrefix}-${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`.slice(0, 20)
  if (['element-replace', 'speech-synthesis'].includes(props.meta.operator)) { emit('create', name.value); return }
  error.value = ''; creating.value = true
  await nextTick(); nameInput.value?.focus(); nameInput.value?.select()
}
function close() { creating.value = false; deleting.value = ''; nameTrigger.value?.focus() }
function confirmCreate() {
  if (!name.value.trim()) { error.value = '请输入任务名称'; return }
  if (name.value.length > 20) { error.value = '任务名称不能超过20个字符'; return }
  emit('create', name.value.trim()); close()
}
function onKey(event: KeyboardEvent) { if (event.key === 'Escape') close() }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <section class="task-list">
    <template v-if="tasks.length">
      <div class="task-list__toolbar">
        <div class="task-list__search"><Search :size="16" /><input v-model="keyword" aria-label="搜索任务" placeholder="搜索任务名称" /></div>
        <button class="primary" data-testid="new-task" :disabled="unavailable" @click="openCreate"><Plus :size="16" />新建</button>
      </div>
      <div class="task-list__tabs" role="tablist" aria-label="任务状态">
        <button v-for="item in statuses" :key="item.value" role="tab" :aria-selected="status === item.value" :data-status="item.value" :class="{ selected: status === item.value }" @click="status = item.value">{{ item.label }}<span>{{ count(item.value) }}</span></button>
      </div>
      <div class="task-list__cards">
        <article v-for="task in filtered" :key="task.id" class="task-card" data-testid="task-card">
          <div class="task-card__icon"><Mic v-if="meta.operator === 'speech-synthesis'" :size="20" /><Video v-else :size="20" /></div>
          <div class="task-card__info"><div><strong>{{ task.name }}</strong><span class="task-status" :class="task.status">{{ label(task.status) }}</span></div><small v-if="meta.operator === 'speech-synthesis'" class="speech-task-summary">{{ speechVoiceName(task.input.speaker) }}<span>·</span>{{ speechCharacterCount(task.input.text) }} 字符<span>·</span>{{ speechFormatLabel(task.input.format) }}<span>·</span>{{ createdAt(task.createdAt) }}</small><small v-else>{{ createdAt(task.createdAt) }}</small></div>
          <div class="task-card__actions">
            <button :aria-label="`查看${task.name}`" title="查看" :disabled="unavailable || !(['queued', 'processing', 'completed'].includes(task.status) || (task.operator === 'element-replace' && task.remoteJob && ['failed', 'timeout'].includes(task.status)))" @click="emit('view', task.id)"><Eye :size="16" /></button>
            <button v-if="meta.operator === 'prompt-generate'" :aria-label="`编辑${task.name}`" title="编辑" :disabled="isBusy(task)" @click="emit('edit', task.id)"><Pencil :size="16" /></button>
            <button v-if="['element-replace', 'speech-synthesis'].includes(meta.operator)" :aria-label="`复制${task.name}`" title="复制" :disabled="isBusy(task)" @click="emit('copy', task.id)"><Copy :size="16" /></button>
            <button :aria-label="`删除${task.name}`" title="删除" :disabled="unavailable || isBusy(task)" @click="deleting = task.id"><Trash2 :size="16" /></button>
          </div>
        </article>
        <p v-if="!filtered.length" class="task-list__no-results">暂无匹配的任务</p>
      </div>
      <footer>共 {{ filtered.length }} 项<span>1 / 1</span></footer>
    </template>
    <div v-else class="task-empty">
      <img :src="emptyImage" alt="" width="80" height="80" />
      <p>暂无{{ meta.title }}任务</p>
      <small>请点击「新建」按钮开始创建第一个任务</small>
      <button class="primary" data-testid="new-task" :disabled="unavailable" :title="unavailable ? '线上当前尚未开放任务创建' : undefined" @click="openCreate"><Plus :size="16" />新建</button>
      <small v-if="unavailable" class="task-empty__unavailable">线上当前尚未开放任务创建</small>
    </div>
    <div v-if="creating || deleting" class="video-dialog-overlay" @mousedown.self="close">
      <section class="video-dialog" :role="deleting ? 'alertdialog' : 'dialog'" aria-modal="true" :aria-label="deleting ? '删除任务' : '新建任务'">
        <header><h2>{{ deleting ? '删除任务' : '新建任务' }}</h2><button aria-label="关闭" @click="close"><X :size="18" /></button></header>
        <form v-if="creating" @submit.prevent="confirmCreate">
          <label for="video-task-name">任务名称</label>
          <input id="video-task-name" ref="nameInput" v-model="name" aria-label="任务名称" placeholder="请输入任务名称" maxlength="20" @input="error = ''" />
          <div class="name-count">{{ name.length }}/20</div><p v-if="error" role="alert" class="error">{{ error }}</p>
          <footer><button type="button" @click="close">取消</button><button type="submit" class="primary">新建</button></footer>
        </form>
        <template v-else><p>确定删除该任务吗？删除后无法恢复。</p><footer><button @click="close">取消</button><button data-testid="confirm-delete" class="primary" @click="emit('remove', deleting); close()">删除</button></footer></template>
      </section>
    </div>
  </section>
</template>

<style scoped>
.task-list{height:100%;min-height:0;display:flex;flex-direction:column;padding:24px 32px;color:#111;font-size:14px}.task-list button{font:inherit;cursor:pointer}.primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:88px;height:36px;border:1px solid #111;border-radius:8px;background:#111;color:#fff;padding:0 16px}.task-list button:disabled{opacity:.4;cursor:not-allowed}.task-list__toolbar{display:flex;justify-content:space-between;gap:16px;margin-bottom:20px}.task-list__search{display:flex;align-items:center;gap:8px;border:1px solid #e5e5e5;border-radius:8px;width:280px;padding:0 12px}.task-list__search input{width:100%;height:34px;border:0;outline:0;background:transparent}.task-list__tabs{display:flex;flex-wrap:wrap;gap:24px;border-bottom:1px solid #eee;flex-shrink:0}.task-list__tabs button{display:flex;gap:8px;align-items:center;border:0;border-bottom:2px solid transparent;background:transparent;padding:0 0 12px;color:#777;white-space:nowrap}.task-list__tabs button.selected{color:#111;border-bottom-color:#111;font-weight:500}.task-list__tabs span{font-size:12px;color:#999}.task-list__cards{overflow-y:auto;padding-top:20px;flex:1;min-height:0}.task-card{display:flex;align-items:center;gap:16px;border:1px solid #ededed;border-radius:12px;padding:18px;margin-bottom:12px;min-height:84px}.task-card__icon{display:grid;place-items:center;width:40px;height:40px;background:#f3f3f3;border-radius:8px;flex-shrink:0}.task-card__info{min-width:0;flex:1}.task-card__info>div{display:flex;align-items:center;gap:12px}.task-card__info strong{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-weight:500}.task-card__info small{display:block;font-size:12px;color:#999;margin-top:7px}.task-status{font-size:12px;white-space:nowrap;border-radius:4px;background:#f2f2f2;padding:2px 6px;color:#777}.task-status.completed{color:#21915a;background:#eaf7f0}.task-status.processing{color:#1677ff;background:#e9f2ff}.task-card__actions{display:flex;gap:14px}.task-card__actions button{display:grid;place-items:center;width:28px;height:28px;border:0;background:transparent;color:#777;border-radius:5px}.task-card__actions button:hover{background:#f5f5f5}.task-list>footer{display:flex;justify-content:space-between;padding-top:18px;color:#999;font-size:12px}.task-list__no-results{text-align:center;padding:70px;color:#999}.task-empty{display:flex;flex:1;flex-direction:column;align-items:center;justify-content:center;padding-bottom:60px}.task-empty p{font-size:16px;font-weight:500;margin:16px 0 8px}.task-empty small{color:#999;font-size:14px}.task-empty .primary{margin-top:24px}.task-empty__unavailable{margin-top:12px;font-size:12px!important}.video-dialog-overlay{position:fixed;z-index:100;inset:0;display:grid;place-items:center;background:#0006;padding:20px}.video-dialog{width:min(440px,100%);border-radius:14px;background:white;padding:24px;box-shadow:0 20px 50px #0002}.video-dialog header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}.video-dialog h2{font-size:18px;font-weight:600;margin:0}.video-dialog header button{border:0;background:transparent;padding:4px}.video-dialog label{display:block;margin-bottom:8px}.video-dialog input{border:1px solid #ddd;border-radius:8px;height:40px;width:100%;padding:0 12px;box-sizing:border-box;font:inherit}.name-count{text-align:right;color:#999;font-size:12px;margin-top:6px}.video-dialog footer{display:flex;justify-content:flex-end;gap:12px;margin-top:24px}.video-dialog footer button{height:36px;min-width:68px;border:1px solid #ddd;background:white;border-radius:8px}.video-dialog footer .primary{background:#111;border-color:#111}.error{color:#dc2626;font-size:12px}@media(max-width:760px){.task-list{padding:20px 16px}.task-list__tabs{gap:16px}.task-card{padding:12px;gap:10px}.task-card__actions{gap:2px}.task-card__info>div{align-items:flex-start;flex-direction:column;gap:5px}.task-empty small{text-align:center}}
</style>
<style scoped>.task-card__info .speech-task-summary{display:flex;align-items:center;gap:9px;flex-wrap:wrap;line-height:1.6}.speech-task-summary>span{color:#ccc}.task-status.queued{color:#946200;background:#fff6db}.task-status.timeout,.task-status.failed{color:#c43c35;background:#fff0ef}</style>
