import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '@/App.vue'
import HomeView from '@/views/HomeView.vue'
import KnowledgeBaseView from '@/views/KnowledgeBaseView.vue'
import DashboardView from '@/views/DashboardView.vue'
import SettingsManagementView from '@/views/SettingsManagementView.vue'
import LoginView from '@/views/LoginView.vue'
import { useAppStore } from '@/stores/app'
import { mockUser } from '@/mock/user'

const storage = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value) },
    removeItem: (key: string) => { storage.delete(key) },
    clear: () => storage.clear(),
  },
  configurable: true,
})

function makeRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/auth/login', name: 'login', component: LoginView },
      { path: '/', name: 'home', component: HomeView },
      { path: '/portals', name: 'workspace', component: { template: '<div>工作台</div>' } },
      { path: '/dashboards', name: 'dashboards', component: DashboardView },
      { path: '/knowledge', name: 'knowledge', component: KnowledgeBaseView },
      { path: '/settings/agents', name: 'settings-agents', component: SettingsManagementView },
      { path: '/admin/feedback', name: 'feedback', component: { template: '<div>反馈</div>' } },
    ],
  })
  router.beforeEach((to) => {
    const store = useAppStore()
    if (!store.user && to.name !== 'login') return { name: 'login' }
    if (store.user && to.name === 'login') return { name: 'home' }
    return true
  })
  return router
}

async function mountAuthed(path = '/') {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAppStore().login(mockUser)
  const router = makeRouter()
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [pinia, router] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, router }
}

describe('production-aligned prototype smoke flows', () => {
  beforeEach(() => {
    storage.clear()
    document.body.innerHTML = ''
  })

  it('keeps the production navigation order and account menu', async () => {
    const { wrapper } = await mountAuthed('/')
    const text = wrapper.text()
    expect(text.indexOf('工作台')).toBeLessThan(text.indexOf('仪表盘'))
    expect(text.indexOf('仪表盘')).toBeLessThan(text.indexOf('知识中心'))
    expect(text.indexOf('知识中心')).toBeLessThan(text.indexOf('设置'))
    await wrapper.get('[data-testid="header-user-anchor"]').trigger('click')
    await flushPromises()
    const items = Array.from(document.querySelectorAll('[role="menuitem"]'))
    expect(items).toHaveLength(1)
    expect(items[0].textContent).toContain('退出登录')
  })

  it('supports the production home sidebar, mode menu, quick prompts, and sending', async () => {
    const { wrapper } = await mountAuthed('/')
    expect(wrapper.find('img[alt="职场超能力，小马让你快人一步"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="home-case-section"] button')).toHaveLength(6)
    await wrapper.get('[data-testid="home-sidebar-toggle"]').trigger('click')
    expect(wrapper.text()).toContain('日常办公')
    expect(wrapper.text()).toContain('专家模式')
    await wrapper.get('button[aria-label="选择模式"]').trigger('click')
    expect(wrapper.text()).toContain('适合日常轻度办公任务')
    expect(wrapper.text()).toContain('处理复杂的专项任务')
    await wrapper.get('textarea[aria-label="向小马提问"]').setValue('生成一份直播复盘')
    await wrapper.get('button[aria-label="发送给小马"]').trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 320))
    expect(wrapper.text()).toContain('生成一份直播复盘')
    expect(wrapper.text()).toContain('已收到')
  })

  it('opens knowledge permissions from the row secondary menu', async () => {
    const { wrapper } = await mountAuthed('/knowledge')
    await wrapper.get('button[aria-label="集团制度操作菜单"]').trigger('click')
    const permission = wrapper.findAll('[role="menuitem"]').find((item) => item.text().includes('权限设置'))!
    await permission.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('权限设置 - 集团制度')
  })

  it('renders the production agent table on settings', async () => {
    const { wrapper } = await mountAuthed('/settings/agents')
    expect(wrapper.text()).toContain('智能体管理')
    expect(wrapper.text()).toContain('天马智擎助手')
    expect(wrapper.text()).toContain('创建智能体')
  })
})
