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
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
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
