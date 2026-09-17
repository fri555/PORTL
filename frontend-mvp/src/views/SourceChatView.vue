<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { X } from 'lucide-vue-next'
import SourceChatSidebar from '@/components/chat/source-clone/SourceChatSidebar.vue'
import SourceChatHome from '@/components/chat/source-clone/SourceChatHome.vue'
import SourceChatDetail from '@/components/chat/source-clone/SourceChatDetail.vue'
import ConversationSearchDialog from '@/components/chat/source-clone/ConversationSearchDialog.vue'

const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(false)
const shareOpen = ref(false)
const searchOpen = ref(false)
const renameSessionId = ref('')
const renameValue = ref('')
const deleteSessionId = ref('')
const activeMode = ref<'daily' | 'expert'>('daily')
const activeExpertId = ref('')
const sessionId = computed(() => String(route.params.sessionId ?? ''))
const isDetail = computed(() => Boolean(sessionId.value))

function openSession(id: string) { shareOpen.value = false; router.push(`/chat/${id}`) }
function handleHomeSend(prompt: string) {
  if (activeMode.value === 'expert' && activeExpertId.value) {
    openSession('expert-plan')
    return
  }
  openSession(/钉钉|待办|日程|消息/.test(prompt) ? 'dws-action' : 'daily-auth')
}
function newChat() { shareOpen.value = false; router.push('/chat') }
function openFiles() { router.push('/files') }
function openRename(id: string) { renameSessionId.value = id; renameValue.value = id.includes('expert') ? '你能做什么' : '获取下我钉钉上相关信息' }
function saveRename() { renameSessionId.value = '' }
function confirmDelete() { if (sessionId.value === deleteSessionId.value) router.push('/chat'); deleteSessionId.value = '' }
function openSearchResult(id: string, messageId?: string) {
  searchOpen.value = false
  router.push({ path: `/chat/${id}`, query: messageId ? { message: messageId } : {} })
}

function handleHeaderAction(event: Event) {
  const action = (event as CustomEvent<'new' | 'search' | 'toggle-sidebar'>).detail
  if (action === 'new') newChat()
  if (action === 'search') searchOpen.value = true
  if (action === 'toggle-sidebar') sidebarOpen.value = !sidebarOpen.value
}

onMounted(() => window.addEventListener('tianma:chat-action', handleHeaderAction))
onBeforeUnmount(() => window.removeEventListener('tianma:chat-action', handleHeaderAction))
</script>

<template>
  <main class="source-chat-view">
    <SourceChatSidebar
      v-show="sidebarOpen"
      :active-session-id="sessionId"
      @collapse="sidebarOpen = false"
      @search="searchOpen = true"
      @new-chat="newChat"
      @open-session="openSession"
      @open-files="openFiles"
      @share-session="(id) => { openSession(id); shareOpen = true }"
      @rename-session="openRename"
      @delete-session="(id) => deleteSessionId = id"
    />
    <section class="source-chat-main" :class="{ 'source-chat-main--full': !sidebarOpen }">
      <SourceChatHome v-if="!isDetail" @send="handleHomeSend" @mode-changed="(mode) => { activeMode = mode; if (mode === 'daily') activeExpertId = '' }" @expert-selected="(id) => activeExpertId = id" />
      <SourceChatDetail v-else :session-id="sessionId" @share="shareOpen = true" />
    </section>
    <div v-if="shareOpen" class="share-bar" data-testid="share-bar">
      <button type="button">复制链接</button><button type="button">发送到钉钉</button>
      <button type="button" aria-label="关闭分享" title="关闭" @click="shareOpen = false">×</button>
    </div>

    <Teleport to="body">
      <ConversationSearchDialog v-if="searchOpen" @close="searchOpen = false" @open="openSearchResult" />
      <div v-if="renameSessionId" class="chat-dialog-overlay" @mousedown.self="renameSessionId = ''">
        <section class="action-dialog" role="dialog" aria-modal="true" aria-label="重命名会话"><header><strong>重命名</strong><button type="button" aria-label="关闭重命名" title="关闭" @click="renameSessionId = ''"><X :size="18" /></button></header><input v-model="renameValue" autofocus aria-label="会话名称" /><footer><button type="button" @click="renameSessionId = ''">取消</button><button class="primary" type="button" :disabled="!renameValue.trim()" @click="saveRename">确定</button></footer></section>
      </div>
      <div v-if="deleteSessionId" class="chat-dialog-overlay" @mousedown.self="deleteSessionId = ''">
        <section class="action-dialog" role="alertdialog" aria-modal="true" aria-label="删除会话"><header><strong>删除会话</strong><button type="button" aria-label="关闭删除确认" title="关闭" @click="deleteSessionId = ''"><X :size="18" /></button></header><p>删除后将无法恢复，确定删除该会话吗？</p><footer><button type="button" @click="deleteSessionId = ''">取消</button><button class="danger" type="button" @click="confirmDelete">删除</button></footer></section>
      </div>
    </Teleport>
  </main>
</template>

<style scoped>
.source-chat-view{position:relative;display:flex;height:calc(100vh - 65px);min-height:620px;margin:0 8px 8px;overflow:hidden;border:1px solid #ededed;border-radius:8px;background:#fff}.source-chat-main{position:relative;min-width:0;flex:1}.source-chat-main--full{width:100%}.share-bar{position:absolute;z-index:60;right:0;bottom:0;left:270px;display:flex;height:76px;align-items:center;justify-content:center;gap:34px;border-top:1px solid #e6e6e6;background:#fff;box-shadow:0 -10px 30px rgba(0,0,0,.05)}.share-bar button{border:0;background:transparent;font:14px inherit;cursor:pointer}.share-bar button:last-child{position:absolute;right:28px;font-size:28px;color:#777}@media(max-width:760px){.source-chat-view{height:calc(100vh - 57px);margin:0;border-right:0;border-bottom:0;border-left:0;border-radius:0}.share-bar{left:0}}
.chat-dialog-overlay{position:fixed;z-index:700;inset:0;display:flex;align-items:flex-start;justify-content:center;padding-top:14vh;background:rgba(0,0,0,.28);font-family:system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.search-dialog,.action-dialog{width:min(520px,calc(100vw - 24px));border-radius:12px;background:#fff;box-shadow:0 18px 55px rgba(0,0,0,.2)}.search-dialog{padding:14px}.search-dialog header{display:flex;height:42px;align-items:center;gap:10px;border-bottom:1px solid #eee}.search-dialog input{min-width:0;flex:1;border:0;outline:0;font-size:14px}.search-dialog header button,.action-dialog header button{display:grid;width:30px;height:30px;place-items:center;border:0;border-radius:7px;background:transparent}.search-dialog p{margin:16px 6px 8px;color:#999;font-size:12px}.search-dialog>button{display:block;width:100%;height:42px;border:0;border-radius:7px;background:#fff;padding:0 10px;text-align:left}.search-dialog>button:hover{background:#f6f6f6}.action-dialog{width:min(420px,calc(100vw - 24px));padding:20px 22px}.action-dialog header{display:flex;align-items:center;justify-content:space-between}.action-dialog input{box-sizing:border-box;width:100%;height:40px;margin-top:18px;border:1px solid #ddd;border-radius:7px;padding:0 11px}.action-dialog p{margin:18px 0;color:#555;font-size:14px}.action-dialog footer{display:flex;justify-content:flex-end;gap:9px;margin-top:22px}.action-dialog footer button{height:32px;min-width:68px;border:1px solid #ddd;border-radius:7px;background:#fff}.action-dialog footer .primary{border-color:#111;background:#111;color:#fff}.action-dialog footer .danger{border-color:#df342e;background:#df342e;color:#fff}
</style>
