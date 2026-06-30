import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { useAppStore } from '@/stores/app'
import { mockUser } from '@/mock/user'

const storage = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value) },
    removeItem: (key: string) => { storage.delete(key) },
    clear: () => { storage.clear() },
  },
  configurable: true,
})

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
    storage.clear()
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

  it('renders the simplified MVP home entry when authenticated', async () => {
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
    await flushPromises()
    const html = document.body.innerHTML
    expect(html).toContain('今天想让 AI 帮你做什么')
    expect(html).toContain('方案中心')
    expect(html).toContain('快速')
    expect(html).toContain('智能')
    expect(html).toContain('任务')
    await wrapper.findAll('button').find((button) => button.text().includes('方案中心'))!.trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('B2B线下团购方案')
    expect(document.body.innerHTML).toContain('成功案例复用')
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
    expect(document.body.innerHTML).toContain('行业资讯')

    await router.push('/news/competitor')
    await flushPromises()
    expect(document.body.innerHTML).toContain('行业对标看板')

    await router.push('/news/a01')
    await flushPromises()
    await new Promise((r) => setTimeout(r, 400))
    await flushPromises()
    const detailHtml = document.body.innerHTML
    expect(detailHtml).toContain('返回资讯')
    wrapper.unmount()
  })
})
