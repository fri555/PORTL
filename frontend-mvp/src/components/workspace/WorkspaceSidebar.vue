<script setup lang="ts">
import { ref } from 'vue'
import { useAIChat } from '@/composables/useAIChat'
import { useChatController } from '@/composables/useWorkspaceChat'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  ChevronsLeft, ChevronsRight, History, MoreHorizontal, Pencil, Plus,
  Search, SlidersHorizontal, Star, Trash2, User,
} from 'lucide-vue-next'

const ai = useAIChat()
const chat = useChatController()

const filterOpen = ref(false)

const modeFilters: { value: 'all' | 'quick' | 'task' | 'schedule'; label: string }[] = [
  { value: 'all', label: '全部对话' },
  { value: 'quick', label: '日常办公' },
  { value: 'task', label: '专家模式' },
  { value: 'schedule', label: '定时任务' },
]

function statusBadge(convId: string, hasAssistant: boolean) {
  if (ai.isStreaming.value && ai.activeConversationId.value === convId) {
    return { text: '运行中', cls: 'bg-blue-50 text-blue-600', dot: 'bg-blue-500 animate-pulse' }
  }
  if (hasAssistant) return { text: '完成', cls: 'bg-zinc-100 text-zinc-400', dot: 'bg-zinc-300' }
  return null
}
</script>

<template>
  <aside class="flex h-full min-h-0 flex-col overflow-hidden border-r border-zinc-200 bg-white">
    <!-- Collapsed rail -->
    <div v-if="chat.leftCollapsed.value" class="flex h-full flex-col items-center gap-3 overflow-hidden py-3">
      <button
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
        aria-label="展开侧边栏"
        @click="chat.leftCollapsed.value = false"
      >
        <ChevronsRight class="h-4 w-4" />
      </button>
      <div class="mt-auto flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
        <User class="h-4 w-4" />
      </div>
    </div>

    <!-- Expanded -->
    <div v-else class="flex h-full min-h-0 flex-col">
      <!-- Top action row -->
      <div class="flex items-center gap-1.5 px-3 py-3">
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="搜索对话"
          @click="chat.openSearchDialog('search')"
        >
          <Search class="h-4 w-4" />
        </button>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="历史对话"
          @click="chat.openSearchDialog('history')"
        >
          <History class="h-4 w-4" />
        </button>
        <div class="relative">
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="筛选对话"
            @click="filterOpen = !filterOpen"
          >
            <SlidersHorizontal class="h-4 w-4" />
          </button>
          <div v-if="filterOpen" class="absolute left-0 top-full z-30 mt-1 w-36 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl">
            <button
              v-for="m in modeFilters"
              :key="m.value"
              type="button"
              class="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs"
              :class="chat.sidebarModeFilter.value === m.value ? 'bg-zinc-100 font-medium text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50'"
              @click="chat.sidebarModeFilter.value = m.value; filterOpen = false"
            >
              {{ m.label }}
            </button>
          </div>
        </div>
        <button
          type="button"
          class="ml-auto flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800"
          @click="chat.handleNewConversation()"
        >
          <Plus class="h-3.5 w-3.5" />
          新对话
        </button>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          aria-label="折叠侧边栏"
          @click="chat.leftCollapsed.value = true"
        >
          <ChevronsLeft class="h-4 w-4" />
        </button>
      </div>

      <!-- Conversation groups -->
      <div class="no-scrollbar flex-1 space-y-4 overflow-y-auto px-2 pb-3">
        <template v-for="group in chat.sidebarGroups.value" :key="group.key">
          <div>
            <div class="px-2 pb-1 pt-1 text-[11px] font-medium text-zinc-400">{{ group.label }}</div>
            <div class="space-y-0.5">
              <button
                v-for="conv in group.items"
                :key="conv.id"
                type="button"
                class="group relative flex min-h-[52px] w-full items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition"
                :class="conv.id === ai.activeConversationId.value ? 'border-zinc-200 bg-zinc-50' : 'border-transparent hover:bg-zinc-50'"
                @click="chat.handleSwitchSession(conv.id)"
              >
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-medium text-zinc-500">
                  {{ conv.title.slice(0, 1) }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <span class="line-clamp-1 flex-1 text-[13px] font-medium text-zinc-900">
                      <Star v-if="conv.isFavorite" class="mr-0.5 inline h-3 w-3 fill-amber-400 text-amber-400" />
                      {{ chat.formatConversationTitle(conv.title) }}
                    </span>
                  </div>
                  <div class="mt-1 flex items-center gap-1.5">
                    <span
                      v-if="statusBadge(conv.id, conv.messages.some(m => m.role === 'assistant'))"
                      class="h-1.5 w-1.5 shrink-0 rounded-full"
                      :class="statusBadge(conv.id, conv.messages.some(m => m.role === 'assistant'))?.dot"
                    />
                    <span class="text-[10px] text-zinc-400">{{ chat.formatTime(conv.updatedAt) }}</span>
                    <span
                      v-if="statusBadge(conv.id, conv.messages.some(m => m.role === 'assistant'))"
                      class="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                      :class="statusBadge(conv.id, conv.messages.some(m => m.role === 'assistant'))?.cls"
                    >
                      {{ statusBadge(conv.id, conv.messages.some(m => m.role === 'assistant'))?.text }}
                    </span>
                  </div>
                </div>

                <!-- hover more menu -->
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <button
                      type="button"
                      class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 opacity-0 transition hover:bg-zinc-200 hover:text-zinc-700 group-hover:opacity-100 data-[state=open]:opacity-100"
                      aria-label="更多操作"
                      @click.stop
                    >
                      <MoreHorizontal class="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" class="w-32">
                    <DropdownMenuItem class="text-xs" @select.prevent="chat.beginRenameConversation(conv)">
                      <Pencil class="mr-2 h-3.5 w-3.5" /> 重命名
                    </DropdownMenuItem>
                    <DropdownMenuItem class="text-xs" @select.prevent="chat.handleToggleFavorite(conv.id)">
                      <Star class="mr-2 h-3.5 w-3.5" /> {{ conv.isFavorite ? '取消收藏' : '收藏' }}
                    </DropdownMenuItem>
                    <DropdownMenuItem class="text-xs text-red-600 focus:text-red-600" @select.prevent="chat.handleDeleteSession(conv.id)">
                      <Trash2 class="mr-2 h-3.5 w-3.5" /> 删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </button>
            </div>
          </div>
        </template>

        <div v-if="chat.sidebarGroups.value.length === 0" class="flex flex-col items-center py-10 text-center">
          <History class="h-7 w-7 text-zinc-200" />
          <p class="mt-2 text-[11px] text-zinc-400">暂无对话</p>
        </div>
      </div>
    </div>

    <!-- Rename modal -->
    <Teleport to="body">
      <div v-if="chat.renamingConversationId.value" class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/40 p-4" @click.self="chat.cancelRenameConversation()">
        <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
          <div class="text-sm font-semibold text-zinc-900">重命名对话</div>
          <input
            v-model="chat.renameDraft.value"
            class="mt-3 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            @keydown.enter.prevent="chat.commitRenameConversation()"
            @keydown.esc.prevent="chat.cancelRenameConversation()"
          />
          <div class="mt-4 flex justify-end gap-2">
            <button class="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50" @click="chat.cancelRenameConversation()">取消</button>
            <button class="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800" @click="chat.commitRenameConversation()">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete confirm -->
    <Teleport to="body">
      <div v-if="chat.showConfirmDelete.value" class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/40 p-4" @click.self="chat.showConfirmDelete.value = null">
        <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
          <p class="text-sm font-medium text-zinc-900">确定删除这个会话？</p>
          <p class="mt-1 text-xs text-zinc-500">会话和其中的消息将被永久删除。</p>
          <div class="mt-4 flex justify-end gap-2">
            <button class="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50" @click="chat.showConfirmDelete.value = null">取消</button>
            <button class="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700" @click="chat.confirmDelete()">删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </aside>
</template>
