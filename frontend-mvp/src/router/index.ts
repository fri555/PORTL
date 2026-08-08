import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { useAppStore } from '@/stores/app'
import HomeView from '@/views/HomeView.vue'

const routes = [
  { path: '/auth/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { title: '登录' } },
  { path: '/', name: 'home', component: HomeView, meta: { title: 'AI 对话' } },
  { path: '/workspace/chat', name: 'workspace-chat', component: () => import('@/views/WorkspaceChatView.vue'), meta: { title: 'AI 对话' } },
  { path: '/portals', name: 'portals', component: () => import('@/views/SystemPortalsView.vue'), meta: { title: '工作台' } },
  { path: '/dashboards', name: 'dashboards', component: () => import('@/views/DashboardView.vue'), meta: { title: '仪表盘' } },
  { path: '/knowledge', name: 'knowledge', component: () => import('@/views/KnowledgeBaseView.vue'), meta: { title: '知识中心' } },
  { path: '/settings', name: 'settings', component: () => import('@/views/SettingsManagementView.vue'), meta: { title: '设置' } },
  { path: '/admin/feedback', name: 'admin-feedback', component: () => import('@/views/FeedbackAdminView.vue'), meta: { title: '建议箱' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
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
