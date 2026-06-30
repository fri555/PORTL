import { createRouter, createWebHistory } from 'vue-router'
import { useAppStore } from '@/stores/app'

const routes = [
  { path: '/auth/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { title: '登录' } },
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { title: 'AI 对话' } },
  { path: '/workspace/chat', name: 'workspace-chat', component: () => import('@/views/WorkspaceChatView.vue'), meta: { title: 'AI 对话' } },
  { path: '/portals', name: 'portals', component: () => import('@/views/SystemPortalsView.vue'), meta: { title: '工作台' } },
  { path: '/dashboards', name: 'dashboards', component: () => import('@/views/DataDashboardsView.vue'), meta: { title: '仪表盘' } },
  { path: '/knowledge', name: 'knowledge', component: () => import('@/views/KnowledgeBaseView.vue'), meta: { title: '知识库' } },
  { path: '/admin/feedback', name: 'admin-feedback', component: () => import('@/views/FeedbackAdminView.vue'), meta: { title: '建议箱' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
