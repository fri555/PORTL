from pathlib import Path
base = Path(r"D:\工作\portal")
def edit(name, old, new):
    path = base / name
    text = path.read_text(encoding="utf-8-sig")
    if old not in text:
        raise SystemExit("Missing edit anchor: " + name + " " + old[:100])
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
view = "frontend-mvp/src/views/SourceChatView.vue"
edit(view, "import ConversationSearchDialog from '@/components/chat/source-clone/ConversationSearchDialog.vue'",
"""import ConversationSearchDialog from '@/components/chat/source-clone/ConversationSearchDialog.vue'
import { listPrototypeChatSessions, rememberPrototypeChatSession, removePrototypeChatSession, type PrototypeChatSession } from '@/utils/prototypeChatStore'""")
edit(view, "const isDetail = computed(() => Boolean(sessionId.value))", """const isDetail = computed(() => Boolean(sessionId.value))
const currentSession = ref<PrototypeChatSession | null>(null)
const localSessions = ref(listPrototypeChatSessions())
const currentApprovalMode = computed(() => currentSession.value?.approvalMode ?? 'default')
function nowLabel() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date())
}
watch(() => [sessionId.value, route.query.agent, route.query.prompt, route.query.approvalMode], () => {
  if (!sessionId.value) {
    currentSession.value = null
    activeMode.value = 'daily'
    activeExpertId.value = ''
    return
  }
  currentSession.value = rememberPrototypeChatSession({
    id: sessionId.value,
    approvalMode: route.query.approvalMode === 'autonomous' ? 'autonomous' : 'default',
    agentId: String(route.query.agent ?? ''),
    prompt: String(route.query.prompt ?? ''),
    mode: /expert|bswjqns/.test(sessionId.value) ? 'expert' : 'daily',
    timestamp: nowLabel(),
    createdLocally: false,
  })
  localSessions.value = listPrototypeChatSessions()
}, { immediate: true })""")
edit(view, """function handleHomeSend(prompt: string, approvalMode: 'default' | 'autonomous') {
  if (activeMode.value === 'expert' && activeExpertId.value) {
    router.push({ path: '/chat/expert-plan', query: { agent: activeExpertId.value, prompt, approvalMode } })
    return
  }
  router.push({ path: '/chat/' + (/钉钉|待办|日程|消息/.test(prompt) ? 'dws-action' : 'daily-auth'), query: { approvalMode } })
}""", """function handleHomeSend(prompt: string, approvalMode: 'default' | 'autonomous') {
  const expert = activeMode.value === 'expert' && !!activeExpertId.value
  const prefix = expert ? 'expert-plan' : /钉钉|待办|日程|消息/.test(prompt) ? 'dws-action' : 'daily-auth'
  const id = prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
  rememberPrototypeChatSession({
    id, prompt, approvalMode, agentId: expert ? activeExpertId.value : '',
    mode: expert ? 'expert' : 'daily', timestamp: nowLabel(), createdLocally: true,
  })
  localSessions.value = listPrototypeChatSessions()
  router.push({ path: '/chat/' + id })
}""")
edit(view, """  sidebar.value?.removeSession(deleteSessionId.value)
  if (sessionId.value === deleteSessionId.value) router.push('/chat')""", """  sidebar.value?.removeSession(deleteSessionId.value)
  removePrototypeChatSession(deleteSessionId.value)
  localSessions.value = listPrototypeChatSessions()
  if (sessionId.value === deleteSessionId.value) router.push('/chat')""")
edit(view, """query: { ...(route.query.agent ? { agent: route.query.agent, prompt: route.query.prompt } : {}), ...(route.query.approvalMode ? { approvalMode: route.query.approvalMode } : {}) },""", """query: sessionId.value ? {
          ...(currentSession.value?.agentId ? { agent: currentSession.value.agentId, prompt: currentSession.value.prompt } : {}),
          approvalMode: currentApprovalMode.value,
        } : {},""")
edit(view, ':active-session-id="sessionId"', """:active-session-id="sessionId"
      :additional-sessions="localSessions.filter(item => item.createdLocally).map(item => ({ id: item.id, title: item.prompt, timestamp: item.timestamp, mode: item.mode }))" """.rstrip())
edit(view, """        v-if="!isDetail"
        :initial-mode""", """        v-if="!isDetail"
        :key="'home-' + route.fullPath"
        :initial-mode""")
edit(view, """:initial-approval-mode="String(route.query.approvalMode ?? '') === 'autonomous' ? 'autonomous' : 'default'" """.rstrip(), ':initial-approval-mode="\'default\'"')
text = (base / view).read_text(encoding="utf-8")
start = text.index('        :key=', text.index('<SourceChatDetail'))
end = text.index('        @share=', start)
text = text[:start] + """        :key="sessionId"
        :session-id="sessionId"
        :agent-id="currentSession?.agentId || ''"
        :initial-prompt="currentSession?.prompt || ''"
        :approval-mode="currentApprovalMode"
        :persist-state="!route.query.planState"
""" + text[end:]
(base / view).write_text(text, encoding="utf-8")
sidebar = "frontend-mvp/src/components/chat/source-clone/SourceChatSidebar.vue"
edit(sidebar, "  expertSessions?: SourceChatSession[]", "  expertSessions?: SourceChatSession[]\n  additionalSessions?: SourceChatSession[]")
edit(sidebar, "  activeSessionId: '',", "  activeSessionId: '',\n  additionalSessions: () => [],")
edit(sidebar, """const dailyItems = computed(() => (props.dailySessions ?? capturedDaily).filter(item=>!removedIds.value.has(item.id)))
const expertItems = computed(() => (props.expertSessions ?? capturedExpert).filter(item=>!removedIds.value.has(item.id)))""", """function combinedSessions(mode: 'daily' | 'expert', captured: SourceChatSession[]) {
  const local = props.additionalSessions.filter(item => item.mode === mode)
  const localIds = new Set(local.map(item => item.id))
  return [...local, ...captured.filter(item => !localIds.has(item.id))].filter(item => !removedIds.value.has(item.id))
}
const dailyItems = computed(() => combinedSessions('daily', props.dailySessions ?? capturedDaily))
const expertItems = computed(() => combinedSessions('expert', props.expertSessions ?? capturedExpert))""")
approval = "frontend-mvp/src/components/chat/source-clone/ApprovalModeControl.vue"
edit(approval, "import { ref } from 'vue'", "import { onBeforeUnmount, onMounted, ref, watch } from 'vue'")
edit(approval, "const open = ref(false)", """const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
function close() { open.value = false }
function outside(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) close()
}
function escape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !open.value) return
  event.stopPropagation()
  close()
  trigger.value?.focus()
}
watch(() => props.readonly, close)
onMounted(() => document.addEventListener('mousedown', outside))
onBeforeUnmount(() => document.removeEventListener('mousedown', outside))""")
edit(approval, '<div class="approval-mode" :class="{ \'is-readonly\': readonly }">', '<div ref="root" class="approval-mode" :class="{ \'is-readonly\': readonly }" @keydown="escape">')
edit(approval, """        class="approval-mode__trigger"
        data-testid""", """        ref="trigger"
        class="approval-mode__trigger"
        data-testid""")

