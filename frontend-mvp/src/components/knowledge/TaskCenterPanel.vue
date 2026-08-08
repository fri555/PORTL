<script setup lang="ts">
/**
 * TaskCenterPanel.vue — 任务中心（圆形浮动按钮 + 侧栏面板）
 *
 * 参考 Peek Drawer Pro 设计规范：
 * - 56×56pt 圆形浮动按钮，右下角，带角标
 * - 420px 宽面板，Tab 分类，状态化任务卡片
 * - 智能弹出逻辑：首次自动弹出 + 呼吸灯效
 */
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { X, RotateCw, CheckCheck, ListChecks, AlertCircle, Clock, Eye } from 'lucide-vue-next'
import type { UploadTaskItem } from '@/types/knowledge'

const props = defineProps<{
  tasks: UploadTaskItem[]
}>()

const emit = defineEmits<{
  dismiss: [id: string]
  retryAll: []
  clearCompleted: []
}>()

const panelOpen = ref(false)
const activeTab = ref<'all' | 'pending' | 'done' | 'rejected'>('all')

// ── 状态映射 ──
const STATUS_LABELS: Record<string, string> = {
  uploading: '上传中', processing: '处理中',
  pending: '排队中', failed: '失败',
  done: '已完成', success: '已完成',
}
const STATUS_ICONS: Record<string, string> = { uploading: '🔄', processing: '⚙️', pending: '⏳', failed: '❌', done: '✅', success: '✅' }

// ── 统计数据 ──
const activeCount = computed(() => props.tasks.filter(t => t.status === 'uploading' || t.status === 'processing' || t.status === 'pending').length)
const doneCount = computed(() => props.tasks.filter(t => t.status === 'success' || t.status === 'done').length)
const failedCount = computed(() => props.tasks.filter(t => t.status === 'failed').length)
const allDone = computed(() => props.tasks.length > 0 && props.tasks.every(t => t.status === 'success' || t.status === 'done'))
const hasFailed = computed(() => props.tasks.some(t => t.status === 'failed'))
const hasActive = computed(() => props.tasks.some(t => t.status === 'uploading' || t.status === 'processing'))

const filteredTasks = computed(() => {
  if (activeTab.value === 'pending') return props.tasks.filter(t => t.status === 'uploading' || t.status === 'processing' || t.status === 'pending' || t.status === 'failed')
  if (activeTab.value === 'done') return props.tasks.filter(t => t.status === 'success' || t.status === 'done')
  if (activeTab.value === 'rejected') return props.tasks.filter(t => t.status === 'failed')
  return [...props.tasks].sort((a, b) => {
    const o: Record<string, number> = { uploading: 0, processing: 0, pending: 1, failed: 2, done: 3, success: 3 }
    return (o[a.status] ?? 99) - (o[b.status] ?? 99)
  })
})

// ── 智能弹出逻辑 ──
const prevCount = ref(0)
const hasAutoOpened = ref(false)
const breatheActive = ref(false)
let breatheTimer: ReturnType<typeof setTimeout> | undefined

watch(() => props.tasks.length, (newLen, oldLen) => {
  if (newLen > (oldLen ?? 0) && !panelOpen.value && document.visibilityState === 'visible') {
    if (!hasAutoOpened.value) {
      panelOpen.value = true
      hasAutoOpened.value = true
      // 3秒倒计时：用户主动关闭则标记已忽略
      const timer = setTimeout(() => {
        if (!panelOpen.value) hasAutoOpened.value = true
      }, 3000)
    } else {
      // 已弹出过 → 呼吸动画3秒
      breatheActive.value = true
      clearTimeout(breatheTimer)
      breatheTimer = setTimeout(() => { breatheActive.value = false }, 3000)
    }
  }
  prevCount.value = newLen
})

function closePanel() {
  panelOpen.value = false
  breatheActive.value = false
}

// ── 拖拽 ──
const handlePos = ref({ x: window.innerWidth - 90, y: window.innerHeight - 140 })
const dragging = ref(false)
let dragStart = { x: 0, y: 0 }
let dragOrig = { x: 0, y: 0 }

function onDragStart(e: MouseEvent) {
  dragging.value = true
  dragStart = { x: e.clientX, y: e.clientY }
  dragOrig = { ...handlePos.value }
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
}
function onDragMove(e: MouseEvent) {
  handlePos.value = {
    x: Math.max(16, Math.min(window.innerWidth - 72, dragOrig.x + (e.clientX - dragStart.x))),
    y: Math.max(80, Math.min(window.innerHeight - 100, dragOrig.y + (e.clientY - dragStart.y))),
  }
}
function onDragEnd() {
  dragging.value = false
  // 贴边吸附
  const snapMargin = 60
  if (handlePos.value.x < snapMargin) handlePos.value.x = 16
  else if (handlePos.value.x > window.innerWidth - 72 - snapMargin) handlePos.value.x = window.innerWidth - 72
  if (handlePos.value.y < snapMargin) handlePos.value.y = 80
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
}

onMounted(() => {
  handlePos.value = { x: window.innerWidth - 90, y: window.innerHeight - 180 }
})
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
  clearTimeout(breatheTimer)
})
</script>

<template>
  <!-- 圆形浮动按钮 -->
  <div
    v-if="tasks.length > 0 && !panelOpen"
    class="fixed z-50 cursor-grab select-none transition-transform active:cursor-grabbing"
    :style="{ left: `${handlePos.x}px`, top: `${handlePos.y}px` }"
    @mousedown.prevent="onDragStart"
    @click="panelOpen = true"
  >
    <div
      class="relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
      :class="[
        hasFailed ? 'bg-[#d45656]' : allDone ? 'bg-[#1ba673]' : 'bg-[#1456f0]',
        breatheActive ? 'animate-pulse shadow-[0_0_20px_rgba(20,86,240,0.4)]' : '',
      ]"
    >
      <CheckCheck v-if="allDone && !hasFailed" class="h-6 w-6 text-white" />
      <AlertCircle v-else-if="hasFailed" class="h-6 w-6 text-white" />
      <ListChecks v-else class="h-6 w-6 text-white" />

      <!-- 角标 -->
      <span
        v-if="activeCount > 0"
        class="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white"
      >{{ activeCount }}</span>
    </div>
  </div>

  <!-- 面板 -->
  <Teleport to="body">
    <div
      v-if="panelOpen"
      class="fixed bottom-0 right-0 top-16 z-50 flex w-[420px] flex-col border-l border-zinc-200 bg-white shadow-2xl transition-all duration-300"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div>
          <h3 class="text-base font-semibold text-[#222222]">📋 我的任务</h3>
          <p class="mt-0.5 text-xs text-zinc-400">{{ doneCount }}/{{ tasks.length }} 已完成 · {{ failedCount }} 项失败</p>
        </div>
        <button type="button" class="rounded-lg p-1.5 text-zinc-400 hover:bg-[#f7f8fa] hover:text-zinc-700" @click="closePanel">
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 border-b border-zinc-100 px-5 py-2">
        <button v-for="t in [{ key: 'all' as const, label: '全部' }, { key: 'pending' as const, label: '待处理' }, { key: 'done' as const, label: '已完成' }, { key: 'rejected' as const, label: '已驳回' }]" :key="t.key" type="button" class="rounded-full px-3 py-1.5 text-xs font-medium transition" :class="activeTab === t.key ? 'bg-[#1456f0] text-white' : 'text-zinc-500 hover:bg-zinc-100'" @click="activeTab = t.key">{{ t.label }}</button>
      </div>

      <!-- List -->
      <div class="flex-1 overflow-y-auto px-4 py-3">
        <div v-if="filteredTasks.length === 0" class="flex flex-col items-center justify-center py-16 text-zinc-400">
          <CheckCheck class="h-8 w-8 text-[#1ba673]" />
          <p class="mt-2 text-sm">暂无任务</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="task in filteredTasks"
            :key="task.id"
            class="rounded-xl border border-zinc-100 bg-white px-4 py-3 text-sm shadow-sm"
          >
            <div class="flex items-start gap-3">
              <span class="mt-0.5 text-base">{{ STATUS_ICONS[task.status] || '📄' }}</span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate font-medium text-[#222222]">{{ task.name }}</span>
                  <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" :class="task.status === 'success' || task.status === 'done' ? 'bg-[#e8ffea] text-[#1ba673]' : task.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-[#1456f0]'">{{ STATUS_LABELS[task.status] || task.status }}</span>
                </div>
                <p class="mt-1 text-xs text-zinc-400">⏱ 刚刚</p>
                <div class="mt-2 flex gap-2">
                  <button v-if="task.status === 'failed'" type="button" class="rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-[#1456f0] hover:bg-blue-100" @click="emit('dismiss', task.id)">重试</button>
                  <button v-if="task.status === 'success' || task.status === 'done'" type="button" class="rounded-md bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100" @click="emit('dismiss', task.id)">查看</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div v-if="tasks.length > 0" class="flex items-center gap-2 border-t border-zinc-100 px-5 py-3">
        <button type="button" class="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-[#f7f8fa]" @click="emit('retryAll'); closePanel()">全部重试</button>
        <button type="button" class="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-[#f7f8fa]" @click="emit('clearCompleted'); closePanel()">清除已完成</button>
      </div>
    </div>
  </Teleport>
</template>
