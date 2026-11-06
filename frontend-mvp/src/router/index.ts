import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { useAppStore } from '@/stores/app'
import SourceChatView from '@/views/SourceChatView.vue'
import { canManageQuota, isSystemAdministrator } from '@/composables/settings/quota-access'

const SettingsManagementView = () => import('@/views/SettingsManagementView.vue')
const SettingsInsightsView = () => import('@/views/SettingsInsightsView.vue')
const SettingsUsageView = () => import('@/views/SettingsUsageView.vue')
const SettingsPlaceholderView = () => import('@/views/SettingsPlaceholderView.vue')

const routes = [
  { path: '/auth/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { title: '登录' } },
  { path: '/', redirect: '/chat' },
  { path: '/chat', name: 'home', component: SourceChatView, meta: { title: 'AI 对话' } },
  { path: '/chat/:sessionId', name: 'chat-session', component: SourceChatView, meta: { title: 'AI 对话' } },
  { path: '/files', name: 'task-files', component: () => import('@/views/TaskFilesView.vue'), meta: { title: '任务文件' } },
  { path: '/workspace/chat', name: 'workspace-chat', component: () => import('@/views/WorkspaceChatView.vue'), meta: { title: 'AI 对话' } },
  { path: '/portals', name: 'portals', component: () => import('@/views/SystemPortalsView.vue'), meta: { title: '工作台' } },
  { path: '/dashboards', name: 'dashboards', component: () => import('@/views/DashboardView.vue'), meta: { title: '数据中心' } },
  { path: '/knowledge', name: 'knowledge', component: () => import('@/views/KnowledgeBaseView.vue'), meta: { title: '知识中心' } },
  { path: '/video-gen', redirect: '/video-gen/capability-square' },
  { path: '/video-gen/:capability', name: 'video-generation', component: () => import('@/views/VideoGenerationView.vue'), meta: { title: '内容中心' } },
  { path: '/agent-square', name: 'agent-square', component: () => import('@/views/AgentSquareView.vue'), meta: { title: '专家市场' } },
  { path: '/settings', name: 'settings', redirect: '/settings/agents', meta: { title: '设置' } },
  { path: '/settings/usage', name: 'settings-usage', component: SettingsUsageView, meta: { title: '用量额度' } },
  { path: '/settings/audit', name: 'settings-audit', component: SettingsInsightsView, meta: { title: '日志管理' } },
  { path: '/settings/quota', name: 'settings-quota', redirect: '/settings/usage', meta: { title: '用量额度' } },
  { path: '/settings/models', name: 'settings-models', component: SettingsManagementView, meta: { title: '模型管理' } },
  { path: '/settings/skills', name: 'settings-skills', component: SettingsManagementView, meta: { title: '技能' } },
  { path: '/settings/tools', name: 'settings-tools', redirect: '/settings/skills', meta: { title: '技能' } },
  { path: '/settings/connectors', name: 'settings-connectors', component: SettingsManagementView, meta: { title: '连接器' } },
  { path: '/settings/agents', name: 'settings-agents', component: SettingsManagementView, meta: { title: '智能体管理' } },
  { path: '/settings/operations', name: 'settings-operations', component: SettingsPlaceholderView, meta: { title: '运营看板' } },
  { path: '/settings/monitor', name: 'settings-monitor', component: SettingsPlaceholderView, meta: { title: '智能体监控' } },
  { path: '/admin/feedback', name: 'admin-feedback', component: () => import('@/views/FeedbackAdminView.vue'), meta: { title: '建议箱' } },
  { path: '/automation', name: 'automation', component: () => import('@/views/AutomationView.vue'), meta: { title: '自动化' } },
  { path: '/:pathMatch(.*)*', redirect: '/chat' },
]

const useHashHistory = import.meta.env.VITE_ROUTER_MODE
  ? import.meta.env.VITE_ROUTER_MODE === 'hash'
  : import.meta.env.PROD

const router = createRouter({
  history: useHashHistory
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const store = useAppStore()
  const isAuthRoute = to.path.startsWith('/auth')
  if (!store.user && !isAuthRoute) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (store.user && to.name === 'login') {
    return { name: 'home' }
  }
  if (store.user && to.path.startsWith('/settings')) {
    if (to.path === '/settings/usage' && to.query.scope === 'personal') return true
    if (to.path === '/settings/usage' && !canManageQuota(store.user.id)) return { path: '/settings/usage', query: { scope: 'personal' } }
    if (to.path === '/settings/usage' && canManageQuota(store.user.id)) return true
    if (!isSystemAdministrator(store.user.id)) return canManageQuota(store.user.id) ? { path: '/settings/usage' } : { name: 'home' }
  }
  return true
})

export default router
