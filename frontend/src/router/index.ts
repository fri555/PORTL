import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAppStore } from '@/stores/app'

const routes: RouteRecordRaw[] = [
  {
    path: '/auth',
    component: AuthLayout,
    children: [
      { path: 'login', name: 'login', component: () => import('@/views/LoginView.vue') },
    ],
  },
  {
    path: '/',
    component: DefaultLayout,
    children: [
      { path: '', name: 'home', component: () => import('@/views/HomeView.vue') },
      { path: 'news', name: 'news', component: () => import('@/views/NewsListView.vue') },
      { path: 'news/competitor', name: 'competitor', component: () => import('@/views/CompetitorIntelView.vue') },
      { path: 'news/:id', name: 'article-detail', component: () => import('@/views/ArticleDetailView.vue') },
      { path: 'courses', name: 'courses', component: () => import('@/views/CourseListView.vue') },
      { path: 'courses/:id', name: 'course-detail', component: () => import('@/views/CourseDetailView.vue') },
      { path: 'demands', name: 'demands', component: () => import('@/views/DemandListView.vue') },
      { path: 'demands/create', name: 'demand-create', component: () => import('@/views/DemandCreateView.vue') },
      { path: 'demands/:id', name: 'demand-detail', component: () => import('@/views/DemandDetailView.vue') },
      { path: 'dashboards', name: 'dashboards', component: () => import('@/views/DashboardView.vue') },
      { path: 'dashboards/chat-bi', name: 'chat-bi', component: () => import('@/views/ChatBICreateView.vue') },
      { path: 'rankings', name: 'rankings', component: () => import('@/views/RankingView.vue') },
      { path: 'profile', name: 'profile', component: () => import('@/views/ProfileView.vue') },
    ],
  },
  {
    path: '/workspace',
    component: DefaultLayout,
    children: [
      { path: '', name: 'workspace', component: () => import('@/views/WorkspaceView.vue') },
      { path: 'chat', name: 'workspace-chat', component: () => import('@/views/WorkspaceChatView.vue') },
      { path: 'agents', name: 'agent-market', component: () => import('@/views/AgentMarketView.vue') },
      { path: 'skills', name: 'skill-market', component: () => import('@/views/SkillMarketView.vue') },
      { path: 'tasks', name: 'my-tasks', component: () => import('@/views/MyTasksView.vue') },
      { path: 'knowledge', name: 'knowledge-base', component: () => import('@/views/KnowledgeBaseView.vue') },
      { path: 'usage', name: 'model-usage', component: () => import('@/views/ModelUsageView.vue') },
    ],
  },
  {
    path: '/admin',
    component: DefaultLayout,
    children: [
      { path: '', name: 'admin-console', component: () => import('@/views/AdminConsoleView.vue') },
    ],
  },
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
