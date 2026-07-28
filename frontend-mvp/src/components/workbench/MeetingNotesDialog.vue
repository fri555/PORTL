<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronDown, ChevronRight, Plus, Sparkles, Trash2, X } from 'lucide-vue-next'
import DwsContactPicker from './DwsContactPicker.vue'
import { executeDwsAction, extractDwsTodos, type DwsContact, type ExtractedDwsTodo } from '@/services/dws-workbench'
import type { ScheduleItem } from '@/types/workbench'

const props = defineProps<{ schedule: ScheduleItem; liveConnected?: boolean; currentUserName?: string }>()
const emit = defineEmits<{ close: [] }>()

const storageKey = `workbench:meeting-note:${props.schedule.id}`
const note = ref(window.localStorage.getItem(storageKey) ?? '')
const feedback = ref('')
const actionFeedback = ref('')
const submitting = ref(false)
const extracting = ref(false)
const expandedCandidateId = ref<number | null>(null)

interface TodoCandidate {
  id: number
  selected: boolean
  title: string
  description: string
  executors: DwsContact[]
  participants: DwsContact[]
  due: string
  priority: 'high' | 'normal' | 'low'
  tags: string
}

const candidates = ref<TodoCandidate[]>([])
const nextCandidateId = ref(0)
const selectedCount = computed(() => candidates.value.filter((item) => item.selected).length)

watch(note, (value) => {
  window.localStorage.setItem(storageKey, value)
}, { flush: 'sync' })

function defaultDue(text: string) {
  const base = new Date(`${props.schedule.date}T18:00:00`)
  if (text.includes('明天')) base.setDate(base.getDate() + 1)
  const weekday = text.match(/周([一二三四五六日天])/)?.[1]
  if (weekday) {
    const target = ['日', '一', '二', '三', '四', '五', '六'].indexOf(weekday === '天' ? '日' : weekday)
    const distance = (target - base.getDay() + 7) % 7
    base.setDate(base.getDate() + distance)
  }
  const local = new Date(base.getTime() - base.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function contactFromName(name: string): DwsContact {
  return { ref: name, name, department: name === '需人工确认人员' ? '请手动选择' : '待通讯录校验' }
}

function ruleExtractTodos(): ExtractedDwsTodo[] {
  const lines = note.value
    .split(/\n|[。；;]/)
    .map((line) => line.replace(/^[-*•\d.、\s]+/, '').trim())
    .filter((line) => line.length > 1)
  const actionLines = lines.filter((line) => /(负责|完成|提交|确认|更新|补充|整理|输出|跟进|推进|落地)/.test(line))
  return (actionLines.length ? actionLines : lines).slice(0, 10).map((line) => {
    const owner = line.match(/^(.{2,12}?)(?:负责|需在|需要)/)?.[1]?.trim() || '当前用户'
    const title = (line.replace(/^(.{2,12}?)(?:负责|需在|需要)/, '').trim() || line).slice(0, 10)
    return {
      title,
      description: line,
      executors: [owner],
      participants: [],
      due: defaultDue(line),
      priority: 'normal' as const,
      tags: [],
    }
  })
}

function setCandidates(items: ExtractedDwsTodo[]) {
  candidates.value = items.map((item) => ({
    id: nextCandidateId.value++,
    selected: true,
    title: item.title.slice(0, 10),
    description: item.description,
    executors: item.executors.map(contactFromName),
    participants: item.participants.map(contactFromName),
    due: item.due,
    priority: item.priority,
    tags: item.tags.join('，'),
  }))
  expandedCandidateId.value = null
  if (!candidates.value.length) feedback.value = '请先输入文本'
}

async function extractTodos() {
  feedback.value = ''
  if (!note.value.trim()) {
    setCandidates([])
    return
  }
  if (!props.liveConnected) {
    setCandidates(ruleExtractTodos())
    return
  }
  extracting.value = true
  feedback.value = 'AI 正在识别行动项与人员…'
  try {
    const result = await extractDwsTodos(note.value, new Date().toISOString())
    setCandidates(result.items)
    actionFeedback.value = result.mode === 'ai' ? '已使用 AI 提取，可逐条核对后创建' : 'AI 暂不可用，已使用规则提取，请重点核对'
    if (!result.items.length) feedback.value = '未识别到可创建待办的执行任务，请重新输入内容'
    else feedback.value = ''
  } catch (error) {
    setCandidates(ruleExtractTodos())
    actionFeedback.value = `AI 提取暂不可用，已使用规则提取：${error instanceof Error ? error.message : '未知错误'}`
    feedback.value = ''
  } finally {
    extracting.value = false
  }
}

function addCandidate() {
  const id = nextCandidateId.value++
  candidates.value.push({
    id,
    selected: true,
    title: '',
    description: '',
    executors: [contactFromName('当前用户')],
    participants: [],
    due: defaultDue(''),
    priority: 'normal',
    tags: '',
  })
  expandedCandidateId.value = id
}

function removeCandidate(index: number) {
  if (expandedCandidateId.value === candidates.value[index]?.id) expandedCandidateId.value = null
  candidates.value.splice(index, 1)
}

function toggleCandidate(candidate: TodoCandidate) {
  expandedCandidateId.value = expandedCandidateId.value === candidate.id ? null : candidate.id
}

function formatCandidateDue(value: string) {
  return value ? value.replace('T', ' ') : '待补充'
}

async function confirmTodos() {
  const valid = candidates.value.filter((item) => item.selected && item.title.trim() && item.executors.length && item.due)
  if (!valid.length) {
    feedback.value = '请至少选择一条信息完整的待办'
    return
  }
  if (!props.liveConnected) {
    feedback.value = `已确认 ${valid.length} 条待办（原型预览，未写入钉钉）`
    return
  }

  submitting.value = true
  feedback.value = '正在创建钉钉待办…'
  const succeeded = new Set<number>()
  const failed: string[] = []
  for (const item of valid) {
    try {
      await executeDwsAction({
        action: 'todo',
        executors: item.executors.map((contact) => contact.ref),
        participants: item.participants.map((contact) => contact.ref),
        title: item.title.trim(),
        description: item.description.trim() || undefined,
        due: new Date(item.due).toISOString(),
        priority: item.priority,
        tags: item.tags.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean),
      })
      succeeded.add(item.id)
    } catch (error) {
      failed.push(`${item.title}：${error instanceof Error ? error.message : '创建失败'}`)
    }
  }
  candidates.value = candidates.value.filter((item) => !succeeded.has(item.id))
  submitting.value = false
  if (!failed.length) feedback.value = `已创建 ${succeeded.size} 条钉钉待办`
  else if (succeeded.size) feedback.value = `已创建 ${succeeded.size} 条，${failed.length} 条失败并已保留：${failed.join('；')}`
  else feedback.value = `创建失败，候选项已保留：${failed.join('；')}`
}
</script>

<template>
  <div class="fixed inset-0 z-[200] grid place-items-center bg-[#111827]/35 px-4 backdrop-blur-[3px]" @click.self="emit('close')">
    <section data-testid="meeting-notes-dialog" role="dialog" aria-modal="true" aria-label="AI生成待办" class="relative max-h-[calc(100vh-32px)] w-[1040px] max-w-full overflow-hidden rounded-[24px] border border-white/90 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
      <header class="flex items-center justify-between gap-4 border-b border-[#eceff3] px-6 py-5">
        <div class="flex min-w-0 items-center gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#f0ebff] text-[#7652d6]"><Sparkles class="h-[18px] w-[18px]" /></span>
          <h3 class="truncate text-[14px] font-semibold text-[#202329]">AI生成待办</h3>
        </div>
        <button type="button" aria-label="关闭AI生成待办" class="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[#8d949e] transition hover:bg-[#f2f4f7] hover:text-[#3b414a]" @click="emit('close')"><X class="h-4 w-4" /></button>
      </header>

      <div class="grid max-h-[calc(100vh-124px)] overflow-y-auto lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div class="border-b border-[#eceff3] px-6 py-5 lg:border-b-0 lg:border-r">
          <h4 class="text-[14px] font-semibold text-[#25282e]">输入文本</h4>
          <textarea v-model="note" data-testid="meeting-note-editor" aria-label="待办提取文本" class="mt-4 min-h-[360px] w-full resize-none rounded-[18px] border border-[#dfe4eb] bg-[#fbfcfd] px-4 py-3 text-[14px] leading-6 text-[#30343a] outline-none transition placeholder:text-[#b0b5bd] focus:border-[#9d85e6] focus:bg-white focus:ring-4 focus:ring-[#7652d6]/8" placeholder="输入文本，从文本中提取待办事项" />
          <div class="mt-3 flex justify-end">
            <button data-testid="extract-meeting-todos" type="button" :disabled="extracting || !note.trim()" class="inline-flex items-center gap-2 rounded-xl bg-[#7652d6] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#6844ca] disabled:cursor-not-allowed disabled:bg-[#d5cee9] disabled:text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7652d6]" @click="extractTodos"><Sparkles class="h-3.5 w-3.5" />{{ extracting ? 'AI 提取中…' : 'AI 提取待办' }}</button>
          </div>
          <p v-if="actionFeedback" data-testid="meeting-note-action-feedback" class="mt-2 text-[10px] text-[#737b86]">{{ actionFeedback }}</p>
        </div>

        <div class="bg-[#fafbfc] px-6 py-5">
          <div class="flex items-start justify-between gap-4"><h4 class="text-[14px] font-semibold text-[#25282e]">待办候选</h4><div class="flex items-center gap-2"><button data-testid="add-meeting-todo" type="button" class="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-[#59616c] shadow-sm transition hover:text-[#7652d6]" @click="addCandidate"><Plus class="h-3 w-3" />新增</button><span class="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-[#7652d6] shadow-sm">已选 {{ selectedCount }}</span></div></div>
          <div v-if="candidates.length" class="mt-4 space-y-2">
            <article v-for="(candidate, index) in candidates" :key="candidate.id" :data-testid="`meeting-todo-candidate-${index}`" class="overflow-hidden rounded-[16px] border bg-white transition" :class="expandedCandidateId === candidate.id ? 'border-[#c9bced] shadow-[0_8px_24px_rgba(90,67,160,0.08)]' : 'border-[#e1e5eb] hover:border-[#d2c9eb]'">
              <div class="flex min-h-[58px] items-center gap-3 px-3 py-2.5">
                <input v-model="candidate.selected" :data-testid="`meeting-todo-selected-${index}`" type="checkbox" :aria-label="`选择候选 ${index + 1}`" class="h-4 w-4 shrink-0 rounded border-[#c6ccd4] accent-[#7652d6]" />
                <button :data-testid="`edit-meeting-todo-${index}`" type="button" class="min-w-0 flex-1 text-left focus-visible:outline-none" :aria-expanded="expandedCandidateId === candidate.id" @click="toggleCandidate(candidate)">
                  <span class="block truncate text-xs text-[#30343a]"><strong class="font-semibold">{{ candidate.title || '未命名待办' }}</strong><span class="text-[#69717c]">：{{ candidate.description || '待补充描述' }}</span></span>
                  <span class="mt-1 block truncate text-[10px] text-[#858c96]">DDL：{{ formatCandidateDue(candidate.due) }}，负责人：{{ candidate.executors.map((item) => item.name).join('、') || '待补充' }}，优先级：{{ candidate.priority === 'high' ? '高' : candidate.priority === 'low' ? '低' : '普通' }}</span>
                </button>
                <button :data-testid="`edit-meeting-todo-icon-${index}`" type="button" :aria-label="`${expandedCandidateId === candidate.id ? '收起' : '编辑'}候选 ${index + 1}`" class="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#8e83ad] transition hover:bg-[#f3efff]" @click="toggleCandidate(candidate)"><ChevronDown v-if="expandedCandidateId === candidate.id" class="h-3.5 w-3.5" /><ChevronRight v-else class="h-3.5 w-3.5" /></button>
                <button :data-testid="`remove-meeting-todo-${index}`" type="button" :aria-label="`删除候选 ${index + 1}`" class="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[#a0a5ae] transition hover:bg-[#fff0ed] hover:text-[#d84321]" @click="removeCandidate(index)"><Trash2 class="h-3.5 w-3.5" /></button>
              </div>
              <div v-if="expandedCandidateId === candidate.id" :data-testid="`meeting-todo-editor-${index}`" class="border-t border-[#ece9f4] bg-[#fcfbff] px-4 pb-4 pt-3">
                <label class="block text-[10px] font-medium text-[#68717d]">待办标题 <span class="text-[#d84321]">*</span><input v-model="candidate.title" :data-testid="`meeting-todo-title-${index}`" maxlength="10" class="mt-1 h-9 w-full rounded-xl border border-[#dfe4eb] bg-white px-3 text-xs outline-none focus:border-[#9d85e6]" /></label>
                <label class="mt-2 block text-[10px] font-medium text-[#68717d]">详细描述<textarea v-model="candidate.description" :data-testid="`meeting-todo-description-${index}`" class="mt-1 min-h-[52px] w-full rounded-xl border border-[#dfe4eb] bg-white px-3 py-2 text-[12px] leading-5 outline-none focus:border-[#9d85e6]" /></label>
                <div class="mt-2 grid gap-2 sm:grid-cols-2">
                  <div><label class="block text-[10px] font-medium text-[#68717d]">执行人 <span class="text-[#d84321]">*</span></label><DwsContactPicker v-model="candidate.executors" :test-id="`meeting-todo-executors-${index}`" placeholder="从企业通讯录搜索执行人" class="mt-1" /></div>
                  <div><label class="block text-[10px] font-medium text-[#68717d]">参与人</label><DwsContactPicker v-model="candidate.participants" :test-id="`meeting-todo-participants-${index}`" placeholder="添加参与人" class="mt-1" /></div>
                </div>
                <div class="mt-2 grid grid-cols-2 gap-2">
                  <label class="block text-[10px] font-medium text-[#68717d]">截止时间 <span class="text-[#d84321]">*</span><input v-model="candidate.due" type="datetime-local" class="mt-1 h-9 w-full rounded-xl border border-[#dfe4eb] bg-white px-3 text-[12px] outline-none focus:border-[#9d85e6]" /></label>
                  <div><label class="block text-[10px] font-medium text-[#68717d]">优先级 <span class="text-[#d84321]">*</span></label><select v-model="candidate.priority" :data-testid="`meeting-todo-priority-${index}`" class="mt-1 h-9 w-full rounded-xl border border-[#dfe4eb] bg-white px-3 text-[12px] outline-none focus:border-[#9d85e6]"><option value="high">高</option><option value="normal">普通</option><option value="low">低</option></select></div>
                </div>
                <label class="mt-2 block text-[10px] font-medium text-[#68717d]">待办标签<input v-model="candidate.tags" :data-testid="`meeting-todo-tags-${index}`" class="mt-1 h-9 w-full rounded-xl border border-[#dfe4eb] bg-white px-3 text-[12px] outline-none focus:border-[#9d85e6]" placeholder="多个标签用逗号分隔" /></label>
              </div>
            </article>
          </div>
          <div v-else class="mt-4 grid min-h-[360px] place-items-center rounded-[18px] border border-dashed border-[#dfe3e9] bg-white/70 text-center"><div><Sparkles class="mx-auto h-5 w-5 text-[#a994e7]" /><p class="mt-2 text-xs font-medium text-[#666d78]">还没有待办候选</p><p class="mt-1 text-[10px] text-[#9aa0aa]">输入文本后点击“AI 提取待办”</p></div></div>
          <p v-if="feedback" data-testid="meeting-todo-feedback" class="mt-3 rounded-xl bg-[#eef8f3] px-3 py-2 text-xs font-medium text-[#087b4d]">{{ feedback }}</p>
          <button v-if="candidates.length" data-testid="confirm-meeting-todos" type="button" :disabled="selectedCount === 0 || submitting" class="mt-4 w-full rounded-xl bg-[#1769e0] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#0f5cc8] disabled:cursor-not-allowed disabled:opacity-45" @click="confirmTodos">{{ submitting ? '正在创建…' : `创建 ${selectedCount} 条待办` }}</button>
        </div>
      </div>

    </section>
  </div>
</template>
