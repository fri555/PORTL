<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowRight,
  BookOpen,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image,
  Plug,
  Wrench,
  Zap,
  ChevronDown,
  CheckCircle2,
  Heart,
  MessageSquareText,
  Search,
  X,
} from 'lucide-vue-next'
import { useExpertCatalog, isExpertAvailable } from '@/composables/useExpertCatalog'
import { FIXED_USAGE_NOTICE, usageFormFromContent } from '@/utils/agentUsage'
import { ElDialog, ElMessage } from 'element-plus'
import { homeDraft } from '@/composables/useHomeDraft'
import ExpertSystemTags from '@/components/expert/ExpertSystemTags.vue'
import { expertDateLabel, expertFileFormats, expertKnowledgeEntries, expertMatchesSearch, expertSystemTags } from '@/utils/expertPresentation'
import SourceChatSidebar from '@/components/chat/source-clone/SourceChatSidebar.vue'
import { listPrototypeChatSessions } from '@/utils/prototypeChatStore'
import { expertAgents as agents } from '@/utils/expertPrototypeStore'
import type { Agent, AgentCategory } from '@/types/agent'
import { AGENT_CATEGORY_META } from '@/types/agent'

const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(route.query.sidebar !== '0')
const localSessions = ref(listPrototypeChatSessions())
const additionalSessions = computed(() => localSessions.value.filter(item => item.createdLocally).map(item => ({ id: item.id, title: item.prompt, timestamp: item.timestamp, mode: item.mode })))
function openChatAction(action: 'new' | 'search' | 'session' | 'share' | 'rename' | 'delete', id = '') {
  if (action === 'new') homeDraft.value = ''
  const query: Record<string, string> = { sidebar: sidebarOpen.value ? '1' : '0' }
  if (action === 'search' || action === 'rename' || action === 'delete') query.action = action
  if (action === 'rename' || action === 'delete') query.target = id
  if (action === 'share') query.share = '1'
  router.push({ path: id ? '/chat/' + id : '/chat', query })
}
function headerAction(event: Event) {
  const action = (event as CustomEvent<'new' | 'search' | 'toggle-sidebar'>).detail
  if (action === 'toggle-sidebar') sidebarOpen.value = !sidebarOpen.value
  else if (action === 'new' || action === 'search') openChatAction(action)
}
onMounted(() => window.addEventListener('tianma:chat-action', headerAction))
onBeforeUnmount(() => window.removeEventListener('tianma:chat-action', headerAction))
const searchQuery = ref('')
const activeCategory = ref<AgentCategory | 'all'>('all')
const { favoriteIds, favoriteError, toggleFavorite: changeFavorite } = useExpertCatalog()
const detailAgent = ref<Agent | null>(route.query.detail === '1' ? (agents[0] ?? null) : null)

const categoryOrder: AgentCategory[] = [
  'finance_admin',
  'supply_chain',
  'marketing',
  'tech_dev',
  'customer_service',
  'retail_ops',
]
const categoryTabs = computed(() => [
  { key: 'all' as const, label: '全部' },
  ...categoryOrder.map((key) => ({ key, label: AGENT_CATEGORY_META[key].label })),
])
const publishedAgents = computed(() =>
  agents.filter((item) => item.isPublished && item.reviewStatus === 'approved'),
)
const filteredAgents = computed(() => {
  let list = [...publishedAgents.value]
  if (activeCategory.value !== 'all')
    list = list.filter((item) => item.category === activeCategory.value)
  list = list.filter(item => expertMatchesSearch(item, searchQuery.value))
  list.sort((a, b) => a.id.localeCompare(b.id))
  return list
})

function categoryColor(category: AgentCategory) {
  return AGENT_CATEGORY_META[category]?.color ?? '#5b6b82'
}
function toggleFavorite(agent: Agent) { if (!changeFavorite(agent)) ElMessage.error(favoriteError.value || '收藏未保存，请重试') }
async function useAgent(agent: Agent, prompt = '') {
  const current = agents.find(item => item.id === agent.id)
  if (!current || !isExpertAvailable(current)) return
  if (prompt) homeDraft.value = prompt
  router.push({
    path: '/chat',
    query: { mode: 'expert', agent: agent.id, sidebar: sidebarOpen.value ? '1' : '0', ...(prompt ? { prompt } : {}) },
  })
}
const knowledgeExpanded = ref(false)
watch(() => detailAgent.value?.id, () => { knowledgeExpanded.value = false })
const useDepartments = computed(() => [...new Set(detailAgent.value?.useDepartments?.map(value => value.trim()).filter(Boolean) ?? [])])
const quickStarts = computed(() => detailAgent.value?.quickCommands.filter(value => value.trim()) ?? [])
const detailUsage = computed(() => usageFormFromContent(detailAgent.value?.usageInstructions || ''))
const fileFormats = computed(() => detailAgent.value ? expertFileFormats(detailAgent.value) : undefined)
const knowledgeEntries = computed(() => detailAgent.value ? expertKnowledgeEntries(detailAgent.value) : [])
const visibleKnowledgeEntries = computed(() => knowledgeExpanded.value ? knowledgeEntries.value : knowledgeEntries.value.slice(0, 3))
function formatIcon(format: string) {
  if (['XLS', 'XLSX', 'CSV'].includes(format)) return FileSpreadsheet
  if (format === 'PPTX') return Presentation
  if (['JPG', 'JPEG', 'PNG', 'WEBP'].includes(format)) return Image
  return FileText
}
</script>

<template>
  <main class="expert-workspace">
    <SourceChatSidebar
      v-show="sidebarOpen"
      :additional-sessions="additionalSessions"
      @collapse="sidebarOpen = false"
      @new-chat="openChatAction('new')"
      @search="openChatAction('search')"
      @open-session="id => openChatAction('session', id)"
      @open-files="router.push('/files')"
      @share-session="id => openChatAction('share', id)"
      @rename-session="id => openChatAction('rename', id)"
      @delete-session="id => openChatAction('delete', id)"
    />
    <section class="expert-market">
      <header class="market-header">
        <h1>专家中心</h1>
        <label class="market-search"><Search :size="17" /><input v-model="searchQuery" aria-label="搜索专家" placeholder="搜索名称或简介" maxlength="60" /><button v-if="searchQuery" aria-label="清空搜索" @click="searchQuery = ''"><X :size="15" /></button></label>
      </header>
      <section class="catalogue">
      <div class="filters">
        <div class="category-tabs">
          <button
            v-for="tab in categoryTabs"
            :key="tab.key"
            :class="{ active: activeCategory === tab.key }"
            @click="activeCategory = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>
      <div v-if="filteredAgents.length" class="agent-grid">
        <article
          v-for="agent in filteredAgents"
          :key="agent.id"
          class="agent-card"
          tabindex="0"
          role="button"
          :aria-label="'查看' + agent.name + '详情'"
          @keydown.enter.self="detailAgent = agent"
          @keydown.space.self.prevent="detailAgent = agent"
          @click="detailAgent = agent"
        >
          <button
            :aria-label="favoriteIds.has(agent.id) ? '取消收藏' + agent.name : '收藏' + agent.name"
            :aria-pressed="favoriteIds.has(agent.id)"
            :title="favoriteIds.has(agent.id) ? '取消收藏' : '收藏'"
            class="heart"
            :class="{ active: favoriteIds.has(agent.id) }"
            @click.stop="toggleFavorite(agent)"
          ><Heart :size="17" /></button>
          <div class="agent-avatar card-avatar" :style="{ background: categoryColor(agent.category) }">
            <img v-if="agent.avatarUrl" :src="agent.avatarUrl" alt="" />
            <span v-else>{{ agent.name.slice(0, 1) }}</span>
          </div>
          <div class="agent-copy">
            <h3 :title="agent.name">{{ agent.name }}</h3>
            <p :title="agent.description?.trim() || '默认智能体'">{{ agent.description?.trim() || '默认智能体' }}</p>
          </div>
          <ExpertSystemTags :tags="expertSystemTags(agent)" />
          <button data-testid="expert-primary-action" class="card-primary" :class="{ collected: favoriteIds.has(agent.id) }" :disabled="!isExpertAvailable(agent)" :title="!isExpertAvailable(agent) ? (agent.status === 'maintenance' ? '维护中，暂不可用' : '已下线，暂不可用') : undefined" @click.stop="favoriteIds.has(agent.id) ? useAgent(agent) : toggleFavorite(agent)">
            <MessageSquareText v-if="favoriteIds.has(agent.id)" :size="14" /><Heart v-else :size="14" />{{ favoriteIds.has(agent.id) ? '对话' : '收藏' }}
          </button>
        </article>
      </div>
      <div v-else class="empty">
        <Search :size="28" />
        <h3>没有找到匹配的专家</h3>
        <p>尝试更换关键词或分类。</p>
      </div>
      </section>
    </section>

    <ElDialog
      :model-value="!!detailAgent"
      title="专家详情"
      width="min(820px, calc(100vw - 40px))"
      :show-close="false"
      :close-on-click-modal="false"
      align-center
      append-to-body
      class="expert-detail-dialog"
      @closed="detailAgent = null"
      @close="detailAgent = null"
    >
      <div v-if="detailAgent" class="dialog-content">
        <section class="expert-modal">
          <header class="modal-hero" :style="{ '--accent': categoryColor(detailAgent.category) }">
            <button class="modal-close" aria-label="关闭" @click="detailAgent = null">
              <X :size="19" />
            </button>
            <div
              class="agent-avatar large"
              :style="{ background: categoryColor(detailAgent.category) }"
            >
              <img v-if="detailAgent.avatarUrl" :src="detailAgent.avatarUrl" alt="" /><span v-else>{{ detailAgent.name.slice(0, 1) }}</span>
            </div>
            <div>
              <h2>{{ detailAgent.name }} <CheckCircle2 :size="17" /></h2>
              <div class="modal-meta"><span class="online" :class="{ unavailable: detailAgent.status !== 'online' }"><i />{{ detailAgent.status === 'online' ? '在线' : detailAgent.status === 'maintenance' ? '维护中' : '已下线' }}</span></div>
            </div>
          </header>
          <div class="modal-body usage-body">
            <section class="usage-section basic-section" data-testid="expert-basic-info">
              <h3>基本信息</h3>
              <div class="detail-label">简介</div>
              <p class="detail-description">{{ detailAgent.description?.trim() || '默认智能体' }}</p>
              <dl class="basic-grid">
                <div><dt>使用部门</dt><dd class="department-tags" data-testid="expert-use-departments"><span v-for="department in useDepartments" :key="department" class="department-tag">{{ department }}</span><template v-if="!useDepartments.length">未提供</template></dd></div>
                <div><dt>负责人</dt><dd>{{ detailAgent.developerName?.trim() || '未提供' }}</dd></div>
                <div><dt>上线时间</dt><dd>{{ expertDateLabel(detailAgent.firstPublishedAt) }}</dd></div>
                <div><dt>更新时间</dt><dd>{{ expertDateLabel(detailAgent.publishedAt) }}</dd></div>
              </dl>
            </section>
            <section class="usage-section">
              <h3>能力范围</h3>
              <div class="detail-label">接入系统</div>
              <ExpertSystemTags :tags="expertSystemTags(detailAgent)" detail />
              <dl class="usage-fields range-fields">
                <div v-if="detailUsage.input" class="usage-field"><dt>输入要求</dt><dd>{{ detailUsage.input }}</dd></div>
                <div v-if="detailUsage.output" class="usage-field"><dt>输出形式</dt><dd>{{ detailUsage.output }}</dd></div>
              </dl>
              <div class="capability-heading">支持文件格式</div>
              <div v-if="fileFormats?.length" class="format-list" data-testid="expert-file-formats">
                <div v-for="format in fileFormats" :key="format" class="file-format" :class="'format-' + format.toLowerCase()">
                  <component :is="formatIcon(format)" :size="23" :stroke-width="1.5" /><span>{{ format }}</span>
                </div>
              </div>
              <p v-else class="detail-empty">{{ fileFormats === undefined ? '未提供' : '未配置' }}</p>
              <template v-if="detailAgent.capabilities?.tools?.length">
                <div class="capability-heading">工具</div>
                <div class="capability-cards" data-testid="expert-capability-tools">
                  <article v-for="item in detailAgent.capabilities.tools" :key="item.id" class="capability-card"><span class="capability-icon capability-icon-tool"><Wrench :size="18" /></span><div class="capability-card-body"><strong>{{ item.name?.trim() || '未提供名称' }}</strong><p v-if="item.description">{{ item.description }}</p></div><button class="capability-delete" aria-label="删除工具"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button></article>
                </div>
              </template>
              <template v-if="detailAgent.capabilities?.connectors?.length">
                <div class="capability-heading">连接器</div>
                <div class="capability-cards" data-testid="expert-capability-connectors">
                  <article v-for="item in detailAgent.capabilities.connectors" :key="item.id" class="capability-card"><span class="capability-icon capability-icon-connector"><Zap :size="18" /></span><div class="capability-card-body"><strong>{{ item.name?.trim() || '未提供名称' }}</strong><span v-if="item.protocol" class="capability-badge">{{ item.protocol }}</span></div><button class="capability-delete" aria-label="删除连接器"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button></article>
                </div>
              </template>
              <template v-if="detailAgent.capabilities?.skills?.length">
                <div class="capability-heading">技能</div>
                <div class="capability-cards" data-testid="expert-capability-skills">
                  <article v-for="item in detailAgent.capabilities.skills" :key="item.id" class="capability-card"><span class="capability-icon capability-icon-skill"><Zap :size="18" /></span><div class="capability-card-body"><strong>{{ item.name?.trim() || '未提供名称' }}</strong><span v-if="item.identifier" class="capability-badge">{{ item.identifier }}</span></div><button class="capability-delete" aria-label="删除技能"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button></article>
                </div>
              </template>
            </section>
            <section class="usage-section">
              <h3>知识边界</h3>
              <div class="capability-heading knowledge-heading">知识内容<span v-if="knowledgeEntries.length">{{ knowledgeEntries.length }} 项</span></div>
              <div v-if="knowledgeEntries.length" class="knowledge-list" :class="{ expanded: knowledgeExpanded }" data-testid="expert-knowledge-content">
                <article v-for="item in visibleKnowledgeEntries" :key="item.id" class="knowledge-entry" data-testid="knowledge-entry" :data-kind="item.kind">
                  <component :is="item.kind === 'library' ? BookOpen : FileText" :size="18" />
                  <div><strong :title="item.name">{{ item.name }}</strong><span>{{ item.kind === 'library' ? '知识库' : '文档' }} · 更新时间 {{ expertDateLabel(item.lastSuccessfulSyncAt) }}</span></div>
                </article>
              </div>
              <p v-else class="detail-empty">未引用知识内容</p>
              <button v-if="knowledgeEntries.length > 3" class="knowledge-expand" data-testid="knowledge-expand" :aria-expanded="knowledgeExpanded" @click="knowledgeExpanded = !knowledgeExpanded">{{ knowledgeExpanded ? '收起' : '查看其余 ' + (knowledgeEntries.length - 3) + ' 项' }}<ChevronDown :size="14" :class="{ rotated: knowledgeExpanded }" /></button>

            </section>
            <section class="usage-section" data-testid="expert-boundary">
              <h3>使用约束</h3>
              <div class="constraint-subsection"><div class="constraint-subtitle">能力边界</div><p class="detail-text">{{ detailUsage.limits || '暂未配置' }}</p></div>
              <div class="constraint-subsection"><div class="constraint-subtitle">注意事项</div><p class="detail-text">{{ FIXED_USAGE_NOTICE }}</p></div>
            </section>
            <section v-if="quickStarts.length" class="usage-section"><h3><MessageSquareText :size="16" />快捷开始</h3><div class="prompt-list"><button v-for="(command, index) in quickStarts" :key="index" :title="command" :disabled="!isExpertAvailable(detailAgent)" @click="useAgent(detailAgent, command)">{{ detailAgent.quickPromptDefinitions?.find(item => item.content === command)?.title || command }}<ArrowRight :size="14" /></button></div></section>
          </div>
          <footer class="modal-footer">
            <button
              class="favorite-button"
              :class="{ active: favoriteIds.has(detailAgent.id) }"
              @click="toggleFavorite(detailAgent)"
            >
              <Heart :size="16" />{{ favoriteIds.has(detailAgent.id) ? '已收藏' : '收藏' }}
            </button>
            <div>
              <button
                class="primary"
                :disabled="detailAgent.status !== 'online' || !detailAgent.isPublished"
                @click="useAgent(detailAgent)"
              >
                {{ detailAgent.status === 'online' ? '立即使用' : '暂不可用'
                }}<ArrowRight :size="15" />
              </button>
            </div>
          </footer>
        </section>
      </div>
    </ElDialog>
  </main>
</template>

<style scoped>
.expert-workspace { display:flex; height:calc(100vh - 65px); min-height:620px; margin:0 8px 8px; overflow:hidden; border:1px solid #ededed; border-radius:8px; background:#f8f9fa; }
.expert-market { min-width:0; flex:1; overflow-y:auto; color:#202631; font-family:system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif; }
.market-header { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:30px 28px 22px; }
.market-header h1 { margin:0; font-size:22px; font-weight:600; letter-spacing:-.5px; }
.market-search { display:flex; width:300px; height:38px; flex:0 1 300px; align-items:center; gap:8px; border:1px solid #e0e4e8; border-radius:10px; padding:0 12px; background:#fff; color:#8993a1; }
.market-search:focus-within { border-color:#93b9ef; box-shadow:0 0 0 2px #eff6ff; }
.market-search input { min-width:0; flex:1; border:0; outline:0; font:13px inherit; color:#334155; background:transparent; }
.market-search button { display:grid; border:0; background:transparent; color:#8893a2; cursor:pointer; }
.catalogue { padding:0 28px 32px; }
.filters { border-bottom:1px solid #e3e6ea; margin-bottom:22px; padding-bottom:12px; }
.category-tabs { display:flex; gap:8px; overflow:auto; }
.category-tabs button { height:30px; flex-shrink:0; border:0; border-radius:7px; background:transparent; padding:0 13px; color:#6b7280; font:13px inherit; cursor:pointer; }
.category-tabs button.active { background:#e9edf1; color:#111827; font-weight:500; }
.agent-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px; }
.agent-card { position:relative; display:flex; min-width:0; min-height:294px; box-sizing:border-box; flex-direction:column; align-items:center; border:1px solid #e6e9ec; border-radius:18px; padding:24px 18px 17px; background:#fff; cursor:pointer; transition:border-color .15s,box-shadow .15s; }
.agent-card:hover { border-color:#d2dae3; box-shadow:0 5px 18px rgba(33,45,62,.05); }
.agent-avatar { display:grid; flex-shrink:0; place-items:center; overflow:hidden; color:#fff; font-size:22px; font-weight:600; }
.agent-avatar img { width:100%; height:100%; object-fit:cover; }
.agent-avatar.card-avatar { width:60px; height:60px; border-radius:50%; }
.agent-copy { min-width:0; width:100%; margin-top:13px; text-align:center; }
.agent-copy h3 { overflow:hidden; margin:0; text-overflow:ellipsis; white-space:nowrap; font-size:15px; font-weight:600; line-height:23px; }
.agent-copy p { display:-webkit-box; min-height:57px; overflow:hidden; margin:9px 0 0; color:#737d89; font-size:12px; line-height:19px; text-align:left; -webkit-box-orient:vertical; -webkit-line-clamp:3; }
.heart { position:absolute; top:11px; right:11px; display:grid; width:28px; height:28px; place-items:center; border:0; border-radius:7px; background:transparent; color:#a4abb5; cursor:pointer; }
.heart.active { color:#e76074; }
.heart.active svg { fill:currentColor; }
.heart:hover { background:#fff0f3; color:#df5d72; }
.card-primary { display:flex; width:100%; min-height:34px; margin-top:auto; align-items:center; justify-content:center; gap:6px; border:1px solid #dfe4ea; border-radius:18px; background:#fff; color:#465569; font:12px inherit; cursor:pointer; }
.card-primary.collected { border-color:transparent; background:#eaf2fc; color:#246cbc; }
.card-primary:hover { border-color:#c2d4e9; background:#f4f8fe; }
.card-primary.collected:hover { background:#deebfb; }
.empty { display:flex; min-height:260px; flex-direction:column; align-items:center; justify-content:center; color:#9ba3ad; }
.empty h3 { margin:10px 0 4px; color:#4a5564; font-size:14px; }
.empty p { margin:0; font-size:12px; }
.empty button { margin-top:10px; border:0; background:transparent; color:#2673ca; cursor:pointer; }
.dialog-content { color:#202631; font-family:system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif; }
.expert-modal { display:flex; width:100%; max-height:min(82vh,850px); flex-direction:column; overflow:hidden; background:#fff; border-radius:16px; }
.modal-hero { position:relative; display:flex; flex:0 0 auto; align-items:center; gap:15px; border-bottom:1px solid #e9edf1; padding:23px 28px; background:#fbfcfe; }
.modal-close { position:absolute; top:13px; right:13px; display:grid; width:30px; height:30px; place-items:center; border:0; border-radius:8px; background:transparent; color:#697484; cursor:pointer; }
.agent-avatar.large { width:58px; height:58px; border-radius:15px; font-size:19px; }
.modal-hero>div:last-child { min-width:0; flex:1; padding-right:10px; }
.modal-hero span { color:#6f7d8e; font-size:11px; }
.modal-hero .agent-avatar span { color:#fff; font-size:19px; }
.modal-hero h2 { display:flex; align-items:center; gap:6px; margin:4px 0 6px; font-size:18px; }
.modal-hero h2 svg { color:#3483d5; }
.modal-hero p { margin:0; color:#687687; font-size:12px; line-height:1.65; }
.modal-meta { display:flex; flex-wrap:wrap; gap:14px; margin-top:10px; }
.modal-meta span { display:flex; align-items:center; gap:4px; }
.modal-meta .online { color:#2c8a61; }
.modal-meta i { width:6px; height:6px; border-radius:50%; background:currentColor; }
.modal-body { min-height:0; flex:1; overflow-y:auto; padding:22px 28px; }
.usage-intro { display:flex; align-items:center; gap:8px; color:#344256; margin-bottom:18px; }
.usage-intro span { margin-left:auto; color:#8a94a3; font-size:12px; }
.usage-section { margin-bottom:16px; border:1px solid #e8ebf0; border-radius:10px; padding:16px; background:#fff; }
.usage-section:last-child { margin-bottom:0; }
.usage-section h3 { display:flex; gap:9px; align-items:center; margin:0 0 12px; font-size:14px; font-weight:600; }
.usage-section h3>span { font-size:11px; color:#6f8196; background:#f1f5f9; border-radius:5px; padding:3px 5px; }
.usage-fields { display:grid; gap:10px; margin:0; }
.usage-field { display:grid; grid-template-columns:118px minmax(0,1fr); gap:12px; align-items:start; border-top:1px solid #f0f2f5; padding-top:10px; }
.usage-field:first-child { border-top:0; padding-top:0; }
.usage-field dt { color:#7d8794; font-size:12px; }
.usage-field dd { margin:0; white-space:pre-wrap; overflow-wrap:anywhere; color:#344256; font-size:13px; line-height:1.65; }
.usage-field.full dd { grid-column:1/-1; }
.usage-empty { color:#8a94a3; font-size:13px; }
.prompt-list { display:grid; gap:7px; }
.prompt-list button { display:flex; align-items:center; justify-content:space-between; border:1px solid #e4e8ed; border-radius:9px; background:#fff; padding:10px 11px; color:#465365; font:12px inherit; text-align:left; cursor:pointer; }
.modal-footer { display:flex; flex:0 0 auto; align-items:center; justify-content:space-between; border-top:1px solid #e8ebef; padding:15px 28px; background:#fff; box-shadow:0 -4px 14px rgba(25,39,56,.04); }
.modal-footer button { display:inline-flex; align-items:center; gap:6px; border-radius:9px; padding:9px 14px; font:12px inherit; cursor:pointer; }
.favorite-button { border:1px solid #dfe4e9; background:#fff; color:#596575; }
.favorite-button.active { color:#e05e70; }
.favorite-button.active svg { fill:currentColor; }
.modal-footer .primary { border:1px solid #176fd1; background:#1677e8; color:#fff; }
.modal-meta .unavailable { color:#85909e; }
.detail-description { margin:0 0 16px; white-space:pre-wrap; overflow-wrap:anywhere; color:#566476; font-size:13px; line-height:1.7; }
.basic-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px 26px; margin:0; }
.basic-grid > div { min-width:0; display:flex; flex-direction:column; gap:5px; }
.department-tags { display:flex; flex-wrap:wrap; gap:5px; }
.department-tag { padding:3px 7px; background:#f0f4f9; color:#657a91; border-radius:5px; font-size:11px; }
.basic-grid dt,.detail-label,.capability-heading { color:#8a94a3; font-size:12px; }
.basic-grid dd { margin:0; color:#354458; font-size:13px; line-height:1.6; overflow-wrap:anywhere; }
.detail-label { margin-bottom:8px; }
.range-fields { margin-top:15px; }
.capability-heading { margin:16px 0 9px; }
.capability-heading:first-of-type { margin-top:0; }
.format-list { display:flex; flex-wrap:wrap; gap:8px; }
.file-format { display:flex; min-width:46px; height:59px; box-sizing:border-box; flex-direction:column; gap:5px; align-items:center; justify-content:center; border:1px solid #e7ebf0; border-radius:8px; color:#6d7f98; background:#f8fafc; }
.file-format span { font-size:9px; font-weight:600; letter-spacing:.2px; }
.format-pdf { color:#d66363; background:#fff8f8; border-color:#f2e7e7; }
.format-doc,.format-docx { color:#447cc1; background:#f6f9ff; border-color:#e5ebf5; }
.format-xls,.format-xlsx,.format-csv { color:#459578; background:#f4faf7; border-color:#e2eee8; }
.format-pptx { color:#c9894c; background:#fff9f3; border-color:#f0e6da; }
.capability-cards { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
.capability-card { display:flex; gap:10px; align-items:flex-start; min-width:0; border:1px solid #e5eaf0; border-radius:9px; padding:12px; background:#fbfcfe; }
.capability-icon { display:grid; flex:0 0 32px; height:32px; place-items:center; border-radius:8px; color:#67778b; background:#edf1f6; }
.capability-icon-tool { color:#7c6fa0; background:#f3f0fa; }
.capability-card > div { min-width:0; flex:1; }
.capability-card strong { display:block; color:#364458; font-size:12px; line-height:1.55; overflow-wrap:anywhere; }
.capability-badge { display:inline-block; max-width:100%; margin-top:5px; padding:2px 5px; border-radius:3px; background:#eaf2ff; color:#487ccb; font-size:9px; overflow-wrap:anywhere; }
.capability-card p { margin:7px 0 0; color:#8190a1; font-size:11px; line-height:1.6; overflow-wrap:anywhere; }
.detail-empty { margin:0; color:#929cab; font-size:12px; }
.knowledge-heading { display:flex; align-items:center; justify-content:space-between; }
.knowledge-heading span { font-size:11px; color:#9aa3b0; }
.knowledge-list { display:grid; gap:7px; }
.knowledge-list.expanded { max-height:240px; overflow-y:auto; padding-right:5px; }
.knowledge-entry { display:flex; gap:10px; align-items:center; min-width:0; padding:10px 11px; border:1px solid #e9edf2; border-radius:8px; background:#fbfcfe; }
.knowledge-entry svg { flex-shrink:0; color:#8193aa; }
.knowledge-entry > div { min-width:0; flex:1; display:flex; flex-direction:column; gap:5px; }
.knowledge-entry strong { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; color:#4f5c6c; font-size:12px; font-weight:500; }
.knowledge-entry span { color:#8e99a9; font-size:10px; }
.knowledge-expand { display:flex; align-items:center; gap:5px; border:0; padding:8px 0 0; background:transparent; color:#4d80be; font:12px inherit; cursor:pointer; }
.knowledge-expand .rotated { transform:rotate(180deg); }
.internet-status { display:flex; gap:7px; align-items:center; margin-top:15px; padding-top:12px; border-top:1px solid #edf0f4; color:#718197; font-size:12px; }
.internet-pill { margin-left:auto; padding:3px 8px; border-radius:12px; background:#f0f2f5; color:#8d98a7; font-size:11px; }
.internet-pill.enabled { background:#e9f5ef; color:#4b9674; }
.detail-text { margin:0; color:#5d6a7b; font-size:12px; white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.75; }
.constraint-subsection { margin-bottom:14px; }
.constraint-subsection:last-child { margin-bottom:0; }
.constraint-subtitle { color:#6f7d8e; font-size:12px; font-weight:600; margin-bottom:6px; padding-left:8px; border-left:3px solid #1677e8; }
.usage-notice-text { margin-top:8px; padding-top:8px; border-top:1px dashed #e5e7eb; color:#8b95a3; font-size:11px; }
.usage-notice { background:#fafbfd; }
@media (max-width:620px) { .basic-grid,.capability-cards { grid-template-columns:1fr; } }
button:disabled { opacity:.45; cursor:not-allowed; }
.agent-card:focus-visible,button:focus-visible { outline:2px solid #1677ff; outline-offset:3px; }
@media (max-width:900px) { .catalogue { padding:0 18px 30px; } .market-header { padding:24px 18px 20px; } .agent-grid { grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; } }
@media (max-width:620px) { .market-header { flex-wrap:wrap; } .market-search { width:100%; flex-basis:100%; } .agent-grid { grid-template-columns:1fr; } .usage-field { grid-template-columns:1fr; gap:4px; } .usage-intro span { display:none; } }
@media (prefers-reduced-motion:reduce) { .agent-card { transition:none; } }
</style>
<style>
.expert-detail-dialog.el-dialog { padding:0; border-radius:16px; overflow:hidden; }
.expert-detail-dialog .el-dialog__header { display:none; }
.expert-detail-dialog .el-dialog__body { padding:0; }
@media (prefers-reduced-motion:reduce) { .expert-detail-dialog,.el-overlay { transition:none!important; animation:none!important; } }
</style>
