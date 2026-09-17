import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { useAppStore } from '@/stores/app'
import SourceChatView from '@/views/SourceChatView.vue'

const SettingsManagementView = () => import('@/views/SettingsManagementView.vue')
const SettingsInsightsView = () => import('@/views/SettingsInsightsView.vue')

const routes = [
  { path: '/auth/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { title: '登录' } },
  { path: '/', redirect: '/chat' },
  { path: '/chat', name: 'home', component: SourceChatView, meta: { title: 'AI 对话' } },
  { path: '/chat/:sessionId', name: 'chat-session', component: SourceChatView, meta: { title: 'AI 对话' } },
  { path: '/files', name: 'task-files', component: () => import('@/views/TaskFilesView.vue'), meta: { title: '任务文件' } },
  { path: '/workspace/chat', name: 'workspace-chat', component: () => import('@/views/WorkspaceChatView.vue'), meta: { title: 'AI 对话' } },
  { path: '/portals', name: 'portals', component: () => import('@/views/SystemPortalsView.vue'), meta: { title: '工作台' } },
  { path: '/dashboards', name: 'dashboards', component: () => import('@/views/DashboardView.vue'), meta: { title: '仪表盘' } },
  { path: '/knowledge', name: 'knowledge', component: () => import('@/views/KnowledgeBaseView.vue'), meta: { title: '知识中心' } },
  { path: '/settings', name: 'settings', redirect: '/settings/usage', meta: { title: '设置' } },
  { path: '/settings/usage', name: 'settings-usage', component: SettingsInsightsView, meta: { title: '用量管理' } },
  { path: '/settings/audit', name: 'settings-audit', component: SettingsInsightsView, meta: { title: '日志管理' } },
  { path: '/settings/quota', name: 'settings-quota', redirect: '/settings/agents', meta: { title: '智能体管理' } },
  { path: '/settings/models', name: 'settings-models', redirect: '/settings/agents', meta: { title: '智能体管理' } },
  { path: '/settings/tools', name: 'settings-tools', redirect: '/settings/agents', meta: { title: '智能体管理' } },
  { path: '/settings/agents', name: 'settings-agents', component: SettingsManagementView, meta: { title: '智能体管理' } },
  { path: '/admin/feedback', name: 'admin-feedback', component: () => import('@/views/FeedbackAdminView.vue'), meta: { title: '建议箱' } },
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
  return true
})

export default router
