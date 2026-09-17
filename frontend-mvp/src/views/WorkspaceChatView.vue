<script setup lang="ts">
import { ref, type ComponentPublicInstance } from 'vue'
import { useRouter } from 'vue-router'
import { useAIChat } from '@/composables/useAIChat'
import { createChatController } from '@/composables/useWorkspaceChat'
import ContextIndicator from '@/components/workspace/ContextIndicator.vue'
import WorkspaceSidebar from '@/components/workspace/WorkspaceSidebar.vue'
import ChatMessageList from '@/components/workspace/ChatMessageList.vue'
import ChatInputBox from '@/components/workspace/ChatInputBox.vue'
import AttachmentUploadModal from '@/components/workspace/AttachmentUploadModal.vue'
import SearchDialog from '@/components/workspace/SearchDialog.vue'
import TextPreviewModal from '@/components/workspace/TextPreviewModal.vue'
import {
  ArrowLeft, Bot, Calendar, ChevronsLeft, Database, FileSpreadsheet, Folder,
  Lightbulb, Menu, PieChart, Plug2, Plus, Search, Sparkles, Timer, Users, Wrench, X,
} from 'lucide-vue-next'

const router = useRouter()
const ai = useAIChat()
const chat = createChatController()
const mobileSidebarOpen = ref(false)

function setMobileMessagesEl(el: Element | ComponentPublicInstance | null) {
  const node = el as HTMLElement | null
  if (node && node.offsetParent !== null) chat.messagesContainer.value = node
}
</script>

<template>
  <div class="flex h-[calc(100vh-4rem)] min-h-0 flex-col bg-zinc-50">
    <!-- Title bar -->
    <header class="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-3 md:px-4">
      <button type="button" class="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900" @click="router.push({ name: 'home' })">
        <ArrowLeft class="h-4 w-4" />返回首页
      </button>
      <button type="button" class="hidden h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 lg:inline-flex" aria-label="搜索对话" @click="chat.openSearchDialog('search')">
        <Search class="h-4 w-4" />
      </button>
      <div class="flex min-w-0 flex-1 items-center justify-center gap-2">
        <Sparkles class="h-3.5 w-3.5 shrink-0 text-zinc-700" />
        <h1 class="truncate text-[15px] font-semibold text-zinc-900">{{ chat.displayConversationTitle.value }}</h1>
      </div>
      <span class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium" :class="chat.modeMeta[chat.runMode.value].tone">
        {{ chat.modeMeta[chat.runMode.value].label }}
      </span>
      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50"
        :aria-label="chat.rightCollapsed.value ? '展开产物栏' : '折叠产物栏'"
        @click="chat.rightCollapsed.value = !chat.rightCollapsed.value"
      >
        <ChevronsLeft v-if="!chat.rightCollapsed.value" class="h-4 w-4" />
        <ChevronsRight v-else class="h-4 w-4" />
      </button>
    </header>

    <!-- 3-column grid -->
    <div class="hidden min-h-0 flex-1 transition-[grid-template-columns] duration-300 ease-out lg:grid" :style="{ gridTemplateColumns: chat.gridTemplate.value }">
      <!-- Left sidebar -->
      <WorkspaceSidebar />

      <!-- Center chat -->
      <main class="relative flex min-h-0 flex-col overflow-hidden bg-white">
        <section
          ref="chat.messagesContainer"
          class="no-scrollbar min-h-0 flex-1 overflow-y-auto scroll-smooth"
          @scroll.passive="chat.handleMessagesScroll()"
          @wheel.passive="chat.markUserScrollIntent()"
          @touchstart.passive="chat.markUserScrollIntent()"
          @pointerdown="chat.markUserScrollIntent()"
        >
          <ChatMessageList />
        </section>

        <!-- Input footer -->
        <footer class="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-white via-white to-white/0 px-3 pb-3 pt-8 md:px-4">
          <button
            v-if="chat.showBackToLatest.value"
            type="button"
            class="absolute right-5 top-0 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm hover:bg-zinc-50"
            @click="chat.scrollToBottom(true)"
          >
            回到最新回复
          </button>
          <div class="mx-auto w-full max-w-3xl">
            <ChatInputBox />
          </div>
        </footer>

        <!-- Sub-panel overlay -->
        <div v-if="chat.activeSubPanel.value" class="absolute inset-0 z-20 flex flex-col bg-white">
          <div class="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 px-3">
            <button class="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-zinc-100" @click="chat.closeSubPanel()"><ArrowLeft class="h-4 w-4" /></button>
            <h2 class="text-sm font-semibold text-zinc-900">{{ chat.subPanelTitle.value }}</h2>
          </div>
          <div class="flex-1 overflow-y-auto px-4 py-4">
            <!-- Knowledge Base -->
            <div v-if="chat.activeSubPanel.value === 'knowledge'" class="mx-auto max-w-2xl space-y-4">
              <div v-for="kb in chat.knowledgeBases" :key="kb.name" class="rounded-xl border border-zinc-200 bg-white p-4">
                <div class="flex items-start justify-between">
                  <div>
                    <div class="flex items-center gap-2"><span class="text-sm font-semibold text-zinc-900">{{ kb.name }}</span><span class="rounded-full px-1.5 py-0.5 text-[9px] font-medium" :class="kb.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">{{ kb.status === 'active' ? '运行中' : '构建中' }}</span></div>
                    <p class="mt-1 text-xs text-zinc-500">{{ kb.desc }}</p>
                  </div>
                  <span class="text-xs text-zinc-400">{{ kb.docs }} 篇文档</span>
                </div>
              </div>
            </div>
            <!-- Expert -->
            <div v-if="chat.activeSubPanel.value === 'expert'" class="mx-auto max-w-2xl space-y-4">
              <div v-for="exp in chat.experts" :key="exp.id" class="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" :class="exp.avatarColor"><Bot class="h-5 w-5" /></div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2"><span class="text-sm font-semibold text-zinc-900">{{ exp.name }}</span><span class="text-[10px] text-zinc-400">{{ exp.nickname }}</span></div>
                  <p class="mt-1 text-xs text-zinc-500">{{ exp.desc }}</p>
                </div>
              </div>
            </div>
            <!-- MCP -->
            <div v-if="chat.activeSubPanel.value === 'mcp'" class="mx-auto max-w-2xl space-y-4">
              <div v-for="mcp in chat.mcpConnections" :key="mcp.name" class="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3">
                <div class="flex items-center gap-2.5">
                  <div class="flex h-8 w-8 items-center justify-center rounded-lg" :class="mcp.status === 'connected' ? 'bg-emerald-50 text-emerald-600' : mcp.status === 'configured' ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-100 text-zinc-400'"><Plug2 class="h-4 w-4" /></div>
                  <div><div class="text-xs font-semibold text-zinc-900">{{ mcp.name }}<span class="ml-1.5 text-[10px] text-zinc-400">{{ mcp.type }}</span></div><p class="mt-0.5 text-[10px] text-zinc-500">{{ mcp.desc }}</p></div>
                </div>
                <span class="rounded-full px-2 py-0.5 text-[9px] font-medium" :class="mcp.status === 'connected' ? 'bg-emerald-50 text-emerald-700' : mcp.status === 'configured' ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-100 text-zinc-400'">{{ mcp.status === 'connected' ? '已连接' : mcp.status === 'configured' ? '已配置' : '待接入' }}</span>
              </div>
            </div>
            <!-- Skills -->
            <div v-if="chat.activeSubPanel.value === 'skills'" class="mx-auto max-w-2xl space-y-4">
              <div v-for="skill in chat.skillsList" :key="skill.name" class="flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-white p-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600"><Wrench class="h-4 w-4" /></div>
                <div><div class="text-xs font-semibold text-zinc-900">{{ skill.name }}</div><p class="mt-0.5 text-[10px] text-zinc-500">{{ skill.desc }}</p><p class="mt-1 text-[9px] text-zinc-400">来源：{{ skill.from }}</p></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Right sidebar -->
      <aside v-if="!chat.rightCollapsed.value" class="hidden min-h-0 overflow-hidden border-l border-zinc-200 bg-white transition-all duration-300 lg:block">
        <div class="flex h-full flex-col overflow-y-auto p-2.5">
          <div class="mb-2.5 rounded-xl border border-zinc-200 bg-white p-2.5">
            <div class="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-800"><Database class="h-3.5 w-3.5 text-emerald-600" />来源引用</div>
            <div class="mt-1.5 grid gap-1">
              <div v-for="refItem in chat.selectedKnowledgeRefs.value" :key="refItem.kb" class="rounded-lg border border-zinc-100 bg-zinc-50 px-2 py-1.5 text-[10px] leading-4 text-zinc-600">
                <div class="font-medium text-zinc-800">{{ refItem.kb }}</div>
                <div class="mt-0.5 text-zinc-400">{{ refItem.desc }}</div>
              </div>
              <div v-for="file in chat.referenceFiles.value" :key="file.name" class="rounded-lg bg-white px-2 py-1.5 text-[10px] leading-4 text-zinc-600">
                <div class="font-medium">{{ file.name }}</div>
                <div class="text-zinc-400">{{ file.desc }}<span class="ml-1.5" :class="file.status === 'ready' ? 'text-emerald-500' : 'text-amber-500'">{{ file.status === 'ready' ? '✓' : '解析中' }}</span></div>
              </div>
            </div>
          </div>

          <div class="mb-2.5 rounded-xl border border-zinc-200 bg-white p-2.5">
            <div class="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-800"><Folder class="h-3.5 w-3.5 text-amber-600" />知识库文件夹</div>
            <div class="mt-1.5 grid gap-1">
              <div class="flex min-h-9 items-center gap-2 rounded-lg bg-zinc-50 px-2 text-[10px]"><Folder class="h-3.5 w-3.5 text-amber-500" /><div class="min-w-0 flex-1"><div class="truncate font-medium text-zinc-800">团购方案资料夹</div><div class="text-zinc-400">12 个文件 · 已接入引用</div></div></div>
            </div>
          </div>

          <div class="mb-2.5 rounded-xl border border-zinc-200 bg-white p-2.5">
            <div class="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-800"><FileSpreadsheet class="h-3.5 w-3.5 text-zinc-600" />输出文件</div>
            <div class="mt-1.5 grid gap-1">
              <div v-for="item in chat.outputArtifacts.value" :key="item.name" class="flex min-h-8 items-center justify-between gap-2 rounded-lg bg-zinc-50 px-2.5 text-[10px] font-semibold text-zinc-700">
                <span>{{ item.name }}</span><span class="rounded-full px-1.5 py-0.5 text-[9px]" :class="item.tone">{{ item.status }}</span>
              </div>
            </div>
          </div>

          <div class="mb-2.5 rounded-xl border border-zinc-200 bg-white p-2.5">
            <div class="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-800"><Lightbulb class="h-3.5 w-3.5 text-amber-600" />知识缺口</div>
            <ul v-if="chat.knowledgeGaps.value.length" class="mt-1.5 space-y-1 text-[10px] leading-4 text-amber-800"><li v-for="item in chat.knowledgeGaps.value" :key="item">· {{ item }}</li></ul>
            <p v-else class="mt-1.5 text-[10px] text-zinc-300">暂无知识缺口</p>
          </div>

          <div class="mb-2.5 rounded-xl border border-zinc-200 bg-white p-2.5">
            <div class="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-800"><PieChart class="h-3.5 w-3.5 text-zinc-600" />图表工具</div>
            <div class="mt-2 rounded-lg bg-zinc-50 p-2">
              <div class="flex h-16 items-end gap-1.5"><div class="w-1/3 rounded-t bg-zinc-300" style="height: 40%"></div><div class="w-1/3 rounded-t bg-zinc-400" style="height: 78%"></div><div class="w-1/3 rounded-t bg-zinc-300" style="height: 55%"></div></div>
              <div class="mt-1 grid grid-cols-3 text-center text-[9px] text-zinc-400"><span>保守</span><span>均衡</span><span>品质</span></div>
            </div>
          </div>

          <div class="rounded-xl border border-zinc-100 bg-zinc-50 p-2.5">
            <div class="mb-1.5 text-[11px] font-semibold text-zinc-700">🧠 上下文记忆</div>
            <div class="space-y-0.5 text-[10px] text-zinc-500">
              <div class="flex justify-between"><span>执行模式</span><span class="font-medium">{{ chat.modeMeta[chat.runMode.value].label }}</span></div>
              <div class="flex justify-between"><span>首页附件</span><span class="font-mono">{{ chat.attachedFileCount.value }} 个</span></div>
              <div class="flex justify-between"><span>消息数</span><span class="font-mono">{{ ai.contextStats.value.messageCount }} 条</span></div>
              <div class="flex justify-between"><span>估算 Token</span><span class="font-mono">~{{ (ai.contextStats.value.estimatedTokens / 1000).toFixed(1) }}k</span></div>
              <div class="mt-1.5"><div class="h-1 overflow-hidden rounded-full bg-zinc-200"><div class="h-full rounded-full transition-all duration-500" :class="{'bg-emerald-400': ai.contextStats.value.usagePercent < 40, 'bg-zinc-400': ai.contextStats.value.usagePercent >= 40 && ai.contextStats.value.usagePercent < 90, 'bg-red-400': ai.contextStats.value.usagePercent >= 90}" :style="{ width: `${Math.min(ai.contextStats.value.usagePercent, 100)}%` }" /></div></div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Upload modal -->
    <AttachmentUploadModal />

    <!-- Search dialog -->
    <SearchDialog />

    <!-- Text preview modal -->
    <TextPreviewModal />

    <!-- Dislike modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="chat.showDislikeModal.value" class="fixed inset-0 z-[100] flex items-center justify-center" @click.self="chat.showDislikeModal.value = false">
          <div class="absolute inset-0 bg-black/40" />
          <div class="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 class="text-base font-semibold text-zinc-900 mb-1">告诉我们哪里不合适</h3>
            <p class="text-xs text-zinc-400 mb-4">你的反馈会帮助小马变得更好</p>
            <div class="mb-4 flex flex-wrap gap-2">
              <button v-for="r in chat.dislikeReasons.value" :key="r" type="button" class="rounded-full border px-3 py-1.5 text-xs font-medium" :class="chat.dislikeReasons.value.includes(r) ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'" @click="chat.dislikeReasons.value.includes(r) ? chat.dislikeReasons.value = chat.dislikeReasons.value.filter(x => x !== r) : chat.dislikeReasons.value.push(r)">{{ r }}</button>
            </div>
            <textarea v-model="chat.dislikeComment.value" rows="2" placeholder="补充说明（可选）" class="mb-4 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-300 focus:border-rose-200 focus:outline-none"></textarea>
            <div class="flex justify-end gap-2">
              <button class="rounded-lg px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-100" @click="chat.showDislikeModal.value = false">取消</button>
              <button class="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600" @click="chat.submitDislike()">提交反馈</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Mobile -->
    <div class="flex h-[calc(100vh-3.5rem)] min-h-0 flex-col lg:hidden">
      <header class="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-3">
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="打开侧边栏"
          @click="mobileSidebarOpen = true"
        >
          <Menu class="h-4 w-4" />
        </button>
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <Sparkles class="h-3.5 w-3.5 shrink-0 text-zinc-700" />
          <h1 class="truncate text-sm font-semibold text-zinc-900">{{ chat.displayConversationTitle.value }}</h1>
        </div>
        <span class="inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-medium" :class="chat.modeMeta[chat.runMode.value].tone">{{ chat.modeMeta[chat.runMode.value].label }}</span>
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900" aria-label="搜索对话" @click="chat.openSearchDialog('search')">
          <Search class="h-4 w-4" />
        </button>
      </header>

      <section
        :ref="setMobileMessagesEl"
        class="no-scrollbar min-h-0 flex-1 overflow-y-auto scroll-smooth"
        @scroll.passive="chat.handleMessagesScroll()"
        @wheel.passive="chat.markUserScrollIntent()"
        @touchstart.passive="chat.markUserScrollIntent()"
        @pointerdown="chat.markUserScrollIntent()"
      >
        <ChatMessageList />
      </section>

      <footer class="bg-white px-3 pb-3 pt-2">
        <div class="mx-auto w-full max-w-3xl">
          <ChatInputBox />
        </div>
      </footer>
    </div>

    <!-- Mobile sidebar drawer -->
    <Teleport to="body">
      <div
        v-if="mobileSidebarOpen"
        class="fixed inset-0 z-[80] lg:hidden"
        @click.self="mobileSidebarOpen = false"
      >
        <div class="absolute inset-0 bg-zinc-950/40" />
        <div class="absolute inset-y-0 left-0 w-[260px] shadow-xl">
          <WorkspaceSidebar />
        </div>
      </div>
    </Teleport>
  </div>
</template>
