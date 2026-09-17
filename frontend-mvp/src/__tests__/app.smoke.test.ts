import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '@/App.vue'
import SourceChatView from '@/views/SourceChatView.vue'
import TaskFilesView from '@/views/TaskFilesView.vue'
import KnowledgeBaseView from '@/views/KnowledgeBaseView.vue'
import DashboardView from '@/views/DashboardView.vue'
import SettingsManagementView from '@/views/SettingsManagementView.vue'
import SettingsInsightsView from '@/views/SettingsInsightsView.vue'
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
      { path: '/', redirect: '/chat' },
      { path: '/chat', name: 'home', component: SourceChatView },
      { path: '/chat/:sessionId', name: 'chat-session', component: SourceChatView },
      { path: '/files', name: 'task-files', component: TaskFilesView },
      { path: '/portals', name: 'workspace', component: { template: '<div>工作台</div>' } },
      { path: '/dashboards', name: 'dashboards', component: DashboardView },
      { path: '/knowledge', name: 'knowledge', component: KnowledgeBaseView },
      { path: '/settings/agents', name: 'settings-agents', component: SettingsManagementView },
      { path: '/settings/usage', name: 'settings-usage', component: SettingsInsightsView },
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

async function mountAuthed(path = '/chat') {
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

  it('keeps the production navigation order and opens personal usage from the account menu', async () => {
    const { wrapper, router } = await mountAuthed('/chat')
    const text = wrapper.text()
    expect(text.indexOf('工作台')).toBeLessThan(text.indexOf('仪表盘'))
    expect(text.indexOf('仪表盘')).toBeLessThan(text.indexOf('知识中心'))
    expect(text.indexOf('知识中心')).toBeLessThan(text.indexOf('设置'))
    await wrapper.get('[data-testid="header-user-anchor"]').trigger('click')
    await flushPromises()
    const items = Array.from(document.querySelectorAll('[role="menuitem"]'))
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toContain('我的用量')
    await (items[0] as HTMLElement).click()
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/settings/usage?scope=personal')
    expect(wrapper.text()).toContain('我的用量')
  })

  it('supports the production home sidebar, mode menu, quick prompts, and sending', async () => {
    const { wrapper, router } = await mountAuthed('/chat')
    expect(wrapper.find('img[alt="职场超能力，耶虎让你快人一步"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="daily-prompt-grid"] button')).toHaveLength(7)
    expect(wrapper.text()).toContain('日常办公')
    expect(wrapper.get('[data-testid="mode-switcher"]').text()).toContain('业务专家')
    expect(wrapper.get('button[data-mode="daily"]').attributes('aria-selected')).toBe('true')
    await wrapper.get('textarea[aria-label="向小马提问"]').setValue('生成一份直播复盘')
    await wrapper.get('button[aria-label="发送"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/chat/daily-auth')
    expect(wrapper.text()).toContain('全部完成')
    await wrapper.get('[data-testid="header-brand-anchor"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/chat')
  })

  it('opens knowledge permissions from the row secondary menu', async () => {
    const { wrapper } = await mountAuthed('/knowledge')
    await wrapper.get('button[aria-label="集团制度知识库操作菜单"]').trigger('click')
    const permission = wrapper.findAll('[role="menuitem"]').find((item) => item.text().includes('权限管理'))!
    await permission.trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('权限管理')
    expect(document.body.textContent).toContain('添加成员')
  })

  it('renders the production agent table on settings', async () => {
    const { wrapper } = await mountAuthed('/settings/agents')
    expect(wrapper.text()).toContain('智能体管理')
    expect(wrapper.text()).toContain('天马智擎助手')
    expect(wrapper.text()).toContain('创建智能体')
  })
})
