import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
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
      { path: '/auth/login', name: 'login', component: { template: '<div>login</div>' } },
      { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
      { path: '/workspace/chat', name: 'workspace-chat', component: () => import('@/views/WorkspaceChatView.vue') },
      { path: '/knowledge', name: 'knowledge', component: () => import('@/views/KnowledgeBaseView.vue') },
      { path: '/:pathMatch(.*)*', redirect: '/' },
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
    expect(html).toContain('天马智擎')
    expect(html).toContain('小马在线，有事随时说')
    expect(html).toContain('日常办公')
    expect(html).toContain('专家模式')
    expect(html).toContain('调研帮手')
    expect(html).not.toContain('DeepSeek V4 Flash')
    expect(html).toContain('/assets/pony-avatar.png')
    expect(wrapper.find('[data-testid="header-user-anchor"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="header-brand-anchor"]').exists()).toBe(true)
    expect(html.indexOf('header-brand-anchor')).toBeLessThan(html.indexOf('header-user-anchor'))
    expect(html.indexOf('header-user-anchor')).toBeLessThan(html.indexOf('app-header-right-control'))
    expect(wrapper.find('[data-testid="home-sidebar-toggle"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="上传业务资料"]').exists()).toBe(true)
    expect(html).not.toContain('建议箱</a>')
    await wrapper.find('[data-testid="header-user-anchor"]').trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).not.toContain('查看历史对话')
    expect(document.body.innerHTML).not.toContain('基本设置')
    expect(document.body.innerHTML).toContain('编辑个人资料')
    expect(document.body.innerHTML).toContain('记忆开关')
    expect(document.body.innerHTML).toContain('开启后会跨会话保留')
    ;(document.querySelector('[aria-label="编辑个人资料"]') as HTMLElement).click()
    await flushPromises()
    const profileNameInput = document.querySelector('input[aria-label="设置名字"]') as HTMLInputElement
    expect(profileNameInput).toBeTruthy()
    profileNameInput.value = '李四'
    profileNameInput.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
    ;(Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.trim() === '保存') as HTMLElement).click()
    await flushPromises()
    expect(document.body.innerHTML).toContain('李四')
    ;(document.querySelector('[aria-label="记忆开关"]') as HTMLElement).click()
    await flushPromises()
    expect(document.body.innerHTML).toContain('记忆开关')
    expect(wrapper.find('[data-testid="responsive-chat-shell"]').exists()).toBe(false)
    expect(html).not.toContain('shadow-xl shadow-blue-100')
    expect(html).not.toContain('一个入口完成需求澄清')
    expect(html).not.toContain('© 2026 南京天马集团')
    expect(html).not.toContain('专家模式推荐案例')
    expect(html).not.toContain('推荐案例')

    const textarea = wrapper.find('textarea')
    await textarea.trigger('focus')
    await flushPromises()
    expect(document.body.innerHTML).toContain('推荐案例')
    expect(document.body.innerHTML).toContain('日常办公')
    expect(document.body.innerHTML).toContain('钉钉助理')

    await wrapper.find('button[aria-label="切换到专家模式"]').trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('专家')
    expect(document.body.innerHTML).toContain('组货专家')
    expect(document.body.innerHTML).toContain('敬请期待')
    expect(document.body.innerHTML).toContain('B2B线下团购方案')

    await textarea.setValue('帮我生成一版团购方案')
    await wrapper.find('button[aria-label="发送给小马"]').trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 1300))
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('home')
    expect(document.body.innerHTML).toContain('帮我生成一版团购方案')
    expect(document.body.innerHTML).toContain('B2B线下团购方案初稿')
    expect(document.body.innerHTML).toContain('B2B团购组货方案')
    expect(document.body.textContent ?? '').not.toContain('### 一、需要先确认的字段')
    expect(document.body.innerHTML).toContain('小马工作了 16 秒')
    expect(document.body.innerHTML).toContain('小马理解需求')
    expect(document.body.innerHTML).toContain('小马制定计划')
    expect(document.body.innerHTML).toContain('小马查阅知识库')
    expect(document.body.innerHTML).toContain('小马复核计划')
    expect(document.body.innerHTML).toContain('小马整理交付')
    expect(document.body.innerHTML).toContain('调用工具')
    expect(document.body.innerHTML).toContain('调用知识库')
    expect(document.body.innerHTML).toContain('搜索网络资料')
    expect(document.body.innerHTML).toContain('生成产物')
    expect(document.body.innerHTML).not.toContain('### 三、已调用能力')
    expect(document.body.innerHTML).not.toContain('小马识别到这是专家模式任务')
    const expandButtons = wrapper.findAll('button').filter((button) => button.attributes('aria-label') === '展开P&E详情')
    expect(expandButtons.length).toBeGreaterThan(0)
    await expandButtons[0].trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('小马识别到这是专家模式任务')
    expect(wrapper.findAll('button').some((button) => button.attributes('aria-label') === '收起P&E详情')).toBe(true)
    expect(document.body.innerHTML).not.toContain('思考过程')
    expect(document.body.innerHTML).not.toContain('思考了 3 秒')
    expect(document.body.innerHTML).not.toContain('Plan')
    expect(document.body.innerHTML).not.toContain('Execute')
    expect(document.body.innerHTML).toContain('上下文')
    expect(wrapper.find('[data-testid="workspace-title-controls"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="responsive-chat-shell"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="responsive-composer"]').exists()).toBe(true)
    expect(wrapper.find('select[aria-label="选择专家"]').exists()).toBe(true)
    expect(document.body.innerHTML).toContain('引用溯源')
    expect(document.body.innerHTML).toContain('生成产物')
    expect(document.body.innerHTML).toContain('折叠资产栏')
    expect(document.body.innerHTML).not.toContain('暂停')
    expect(document.body.innerHTML).not.toContain('自动压缩阈值')
    expect(document.body.innerHTML).not.toContain('Plan and Execute 过程')
    await wrapper.find('button[aria-label="点赞"]').trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('已点赞')
    expect(document.body.innerHTML).not.toContain('收藏回答')
    await wrapper.find('[data-testid="header-brand-anchor"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="responsive-chat-shell"]').exists()).toBe(false)
    const resetTextarea = wrapper.find('textarea')
    await resetTextarea.setValue('帮我生成一版团购方案')
    await wrapper.find('button[aria-label="发送给小马"]').trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 1300))
    await flushPromises()
    await wrapper.find('[data-testid="home-sidebar-toggle"]').trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('新建')
    expect(document.body.innerHTML).toContain('置顶会话')
    expect(document.body.innerHTML).toContain('修改标题')
    expect(document.body.innerHTML).toContain('删除会话')
    expect(document.body.innerHTML).not.toContain('营销方案中心')
    expect(document.body.innerHTML).not.toContain('长期记忆已开启')
    await wrapper.findAll('[data-testid="history-conversation-item"]').find((item) => item.text().includes('客户A福利方案优化'))!.trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('客户A福利方案优化 已载入')
    expect(document.body.innerHTML).toContain('新建')
    const pinButton = wrapper.findAll('button').find((button) => button.attributes('aria-label') === '置顶会话')
    expect(pinButton).toBeTruthy()
    await pinButton!.trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('取消置顶')
    const renameButton = wrapper.findAll('button').find((button) => button.attributes('aria-label') === '修改标题')
    expect(renameButton).toBeTruthy()
    await renameButton!.trigger('click')
    await flushPromises()
    const renameInput = wrapper.find('input[aria-label="修改会话标题"]')
    expect(renameInput.exists()).toBe(true)
    await renameInput.setValue('改名后的会话')
    await renameInput.trigger('keydown.enter')
    await flushPromises()
    expect(document.body.innerHTML).toContain('改名后的会话')
    const deleteButton = wrapper.findAll('button').find((button) => button.attributes('aria-label') === '删除会话')
    expect(deleteButton).toBeTruthy()
    await deleteButton!.trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).not.toContain('改名后的会话')
    await wrapper.find('button[aria-label="新建对话"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="responsive-chat-shell"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="responsive-composer"]').exists()).toBe(true)
    expect(document.body.innerHTML).toContain('新建')
    expect(document.body.innerHTML).not.toContain('小马已为你整理好方案')
    wrapper.unmount()
  })

  it('does not trigger RAG, web search, tools, or P&E for a pure greeting', async () => {
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

    await wrapper.find('button[aria-label="切换到专家模式"]').trigger('click')
    await flushPromises()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('你好')
    await wrapper.find('button[aria-label="发送给小马"]').trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 1300))
    await flushPromises()

    const html = document.body.innerHTML
    expect(html).toContain('你好，我是小马')
    expect(html).toContain('识别为寒暄闲聊')
    expect(html).toContain('无需调用工具')
    expect(html).not.toContain('调用知识库')
    expect(html).not.toContain('搜索网络资料')
    expect(html).not.toContain('小马制定计划')
    expect(html).not.toContain('生成产物')
    expect(html).not.toContain('会话产物栏')
    wrapper.unmount()
  })

  it('renders the MVP knowledge base management surface', async () => {
    const router = makeRouter()
    const pinia = createPinia()
    setActivePinia(pinia)
    useAppStore().login(mockUser)
    const wrapper = mount(App, {
      global: { plugins: [pinia, router] },
      attachTo: document.body,
    })
    await router.isReady()
    await router.push('/knowledge')
    await flushPromises()

    const html = document.body.innerHTML
    expect(html).toContain('公共空间')
    expect(html).toContain('个人空间')
    expect(wrapper.find('[data-testid="knowledge-space-tabs-sidebar"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="knowledge-space-tabs-header"]').exists()).toBe(false)
    expect(html).toContain('空间总览')
    expect(html).toContain('公共空间知识库')
    expect(html).toContain('集团制度知识库')
    expect(html).toContain('只读')
    expect(html).toContain('方案中心案例库')
    await wrapper.findAll('button').find((button) => button.text().includes('方案中心案例库'))!.trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('运动鞋团购成功案例.md')
    expect(document.body.innerHTML).toContain('上传文件')
    await wrapper.findAll('button').find((button) => button.text().includes('上传文件'))!.trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('确认上传')
    expect(document.body.innerHTML).toContain('支持 PDF、Word、Excel')
    ;(Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('取消')) as HTMLElement).click()
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text().includes('新建知识库'))!.trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('所属空间')
    expect(document.querySelector('select[aria-label="选择所属空间"]')).toBeTruthy()
    expect(document.body.innerHTML).toContain('公共空间')
    expect(document.body.innerHTML).toContain('个人空间')
    expect(document.body.innerHTML).toContain('角色权限')
    expect(html).not.toContain('语义层')
    expect(html).not.toContain('返回工作台')
    wrapper.unmount()
  })

  it('navigates to the full-screen workspace', async () => {
    const router = makeRouter()
    const pinia = createPinia()
    setActivePinia(pinia)
    useAppStore().login(mockUser)
    const wrapper = mount(App, {
      global: { plugins: [pinia, router] },
      attachTo: document.body,
    })
    await router.isReady()

    await router.push({ name: 'workspace-chat' })
    await flushPromises()
    expect(document.body.innerHTML).toContain('新会话')
    expect(document.body.innerHTML).toContain('返回首页')
    expect(document.body.innerHTML).toContain('搜索会话')
    expect(document.body.innerHTML).toContain('选择助理')
    wrapper.unmount()
  })
})
