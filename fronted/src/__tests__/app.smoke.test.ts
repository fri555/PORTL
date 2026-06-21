import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAppStore } from '@/stores/app'
import { mockUser } from '@/mock/user'

function makeRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/auth',
        component: AuthLayout,
        children: [{ path: 'login', name: 'login', component: { template: '<div>login</div>' } }],
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
    ],
  })
  router.beforeEach((to) => {
    const store = useAppStore()
    const isAuthRoute = to.path.startsWith('/auth')
    if (!store.user && !isAuthRoute) return { name: 'login', query: { redirect: to.fullPath } }
    if (store.user && to.name === 'login') return { name: 'home' }
    return true
  })
  return router
}

describe('app smoke (mount full App)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('redirects to login when unauthenticated', async () => {
    const router = makeRouter()
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, {
      global: { plugins: [pinia, router] },
      attachTo: document.body,
    })
    await router.isReady()
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('login')
    wrapper.unmount()
  })

  it('renders home with all 6 zones when authenticated', async () => {
    const router = makeRouter()
    const pinia = createPinia()
    setActivePinia(pinia)
    useAppStore().login(mockUser)
    const wrapper = mount(App, {
      global: { plugins: [pinia, router] },
      attachTo: document.body,
    })
    await router.isReady()
    await router.push('/')
    await flushPromises()
    // wait for useHome async load (600ms)
    await new Promise((r) => setTimeout(r, 800))
    await flushPromises()
    const html = document.body.innerHTML
    expect(html).toContain('天马AI')
    expect(html).toContain('竞对情报')
    expect(html).toContain('AI热榜')
    expect(html).toContain('部门AI价值榜')
    expect(html).toContain('行业前沿')
    expect(html).toContain('AI工具箱')
    wrapper.unmount()
  })

  it('navigates news / competitor / article without errors', async () => {
    const router = makeRouter()
    const pinia = createPinia()
    setActivePinia(pinia)
    useAppStore().login(mockUser)
    const wrapper = mount(App, {
      global: { plugins: [pinia, router] },
      attachTo: document.body,
    })
    await router.isReady()

    await router.push('/news')
    await flushPromises()
    expect(document.body.innerHTML).toContain('AI资讯')

    await router.push('/news/competitor')
    await flushPromises()
    expect(document.body.innerHTML).toContain('行业对标看板')

    await router.push('/news/a01')
    await flushPromises()
    await new Promise((r) => setTimeout(r, 400))
    await flushPromises()
    const detailHtml = document.body.innerHTML
    expect(detailHtml).toContain('返回资讯')
    expect(detailHtml).toContain('招投标')
    wrapper.unmount()
  })
})
