import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import LoginView from '@/views/LoginView.vue'
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
      { path: '/auth/login', name: 'login', component: LoginView },
      { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
      { path: '/portals', name: 'workspace', component: { template: '<div>工作台</div>' } },
      { path: '/dashboards', redirect: '/knowledge' },
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

async function mountAuthedApp(path = '/') {
  const router = makeRouter()
  const pinia = createPinia()
  setActivePinia(pinia)
  useAppStore().login(mockUser)
  const wrapper = mount(App, {
    global: { plugins: [pinia, router] },
    attachTo: document.body,
  })
  await router.isReady()
  await router.push(path)
  await flushPromises()
  return { wrapper, router }
}

describe('MVP prototype flows', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    storage.clear()
    document.body.innerHTML = ''
  })

  it('uses the new global shell order and keeps login full-screen after logout', async () => {
    const { wrapper, router } = await mountAuthedApp('/')
    const html = document.body.innerHTML
    expect(html).toContain('知识中心')
    expect(html).toContain('工作台')
    expect(html).not.toContain('仪表盘')
    expect(html.indexOf('知识中心')).toBeLessThan(html.indexOf('工作台'))
    expect(html).not.toContain('app-header-left-control')
    expect(html).not.toContain('app-header-right-control')

    await wrapper.find('[data-testid="header-user-anchor"]').trigger('click')
    await flushPromises()
    ;(Array.from(document.querySelectorAll('[role="menuitem"]')).find((item) => item.textContent?.includes('退出登录')) as HTMLElement).click()
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('login')
    expect(wrapper.find('[data-testid="login-screen"]').classes()).toContain('min-h-screen')
    expect(wrapper.find('[data-testid="login-screen"]').classes()).toContain('w-screen')

    ;(Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('模拟扫码登录')) as HTMLElement).click()
    await new Promise((resolve) => setTimeout(resolve, 650))
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('home')
    const textarea = wrapper.find('textarea')
    await textarea.setValue('重新登录后发一条消息')
    await wrapper.find('button[aria-label="发送给小马"]').trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 500))
    await flushPromises()
    expect(document.body.innerHTML).toContain('重新登录后发一条消息')
    wrapper.unmount()
  })

  it('supports the Qianwen-style home cards, responsive sidebars, message editing, and global notifications', async () => {
    const { wrapper, router } = await mountAuthedApp('/')

    expect(document.body.innerHTML).toContain('全能助手')
    expect(document.body.innerHTML).toContain('精选案例')
    expect(document.body.innerHTML).not.toContain('推荐案例')
    expect(wrapper.find('[data-testid="home-case-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="hero-composer"]').html()).not.toContain('home-case-section')
    expect(document.body.innerHTML).not.toContain('知识顾问推荐案例')
    await wrapper.findAll('button').find((button) => button.text().includes('AI复合型岗位趋势'))!.trigger('click')
    await flushPromises()
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toContain('AI复合型岗位趋势')
    expect(wrapper.find('button[aria-label="清空输入内容"]').exists()).toBe(true)

    expect(wrapper.find('[data-testid="home-side-dock"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-side-dock"]').text()).not.toContain('新建')
    await wrapper.find('[data-testid="home-sidebar-toggle"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="home-sidebar-subheader"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="收起历史对话栏"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="新建任务"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-sidebar-subheader"]').text()).toContain('新建任务')
    expect(wrapper.find('input[aria-label="搜索任务"]').exists()).toBe(true)
    const heroStyle = wrapper.find('[data-testid="home-hero-section"]').attributes('style') ?? ''
    expect(heroStyle).toContain('--left-inset: clamp(286px,21vw,400px)')

    await wrapper.find('button[aria-label="清空输入内容"]').trigger('click')
    await wrapper.find('textarea').setValue('帮我生成一版团购方案')
    await wrapper.find('button[aria-label="发送给小马"]').trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 700))
    await flushPromises()
    expect(document.body.innerHTML).toContain('复制消息')
    expect(document.body.innerHTML).toContain('编辑消息')
    expect(document.body.innerHTML).toContain('复制回答')
    expect(document.body.innerHTML).toContain('引用回答')
    expect(document.body.innerHTML).toContain('title="复制消息"')
    expect(document.body.innerHTML).toContain('title="编辑消息"')
    expect(document.body.innerHTML).toContain('group-hover/message:opacity-100')
    expect(document.body.innerHTML).not.toContain('点赞')
    expect(document.body.innerHTML).not.toContain('点踩')

    await wrapper.find('button[aria-label="复制消息"]').trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('已复制消息')
    await wrapper.find('button[aria-label="编辑消息"]').trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('取消编辑')
    await wrapper.find('textarea[aria-label="编辑已发送消息"]').setValue('改成考勤制度问答')
    await wrapper.find('button[aria-label="保存并重新发送"]').trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 700))
    await flushPromises()
    expect(document.body.innerHTML).toContain('改成考勤制度问答')
    const composerTextarea = wrapper.findAll('textarea').find((item) => item.attributes('aria-label') !== '编辑已发送消息')
    expect((composerTextarea!.element as HTMLTextAreaElement).value).toBe('')

    await router.push('/knowledge')
    await flushPromises()
    expect(document.body.innerHTML).toContain('任务完成通知')
    await wrapper.find('button[aria-label="打开任务完成通知"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('home')
    expect(router.currentRoute.value.query.conversationId).toBeTruthy()
    expect(document.body.innerHTML).toContain('conversation-anchor')

    await wrapper.find('button[aria-label="选择模式"]').trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('适用于大部分情况')
    document.body.click()
    await flushPromises()
    expect(document.body.innerHTML).not.toContain('适用于大部分情况')
    wrapper.unmount()
  })

  it('updates knowledge center interactions, deletion, upload tasks, and Q&A modal', async () => {
    const { wrapper } = await mountAuthedApp('/knowledge')

    expect(document.body.innerHTML).toContain('知识中心')
    expect(document.body.innerHTML).not.toContain('app-header-left-control')
    expect(wrapper.find('[data-testid="knowledge-sidebar-subheader"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="knowledge-sidebar-subheader"]').text()).not.toContain('知识库')
    expect(wrapper.find('[data-testid="knowledge-sidebar-subheader"]').text()).not.toContain('文件夹')
    expect(document.body.innerHTML).toContain('收藏知识库')
    expect(document.body.innerHTML).toContain('全部知识库')
    expect(document.body.innerHTML).not.toContain('置顶知识库')
    expect(document.body.innerHTML).not.toContain('仪表盘')

    await wrapper.findAll('button').find((button) => button.text().includes('方案中心'))!.trigger('click')
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text().includes('方案中心案例库'))!.trigger('click')
    await flushPromises()
    const knowledgeHeader = wrapper.find('[data-testid="knowledge-main-header"]')
    expect(knowledgeHeader.text()).not.toContain('上传文件')
    expect(knowledgeHeader.text()).not.toContain('知识库问答')
    const knowledgeActionRow = wrapper.find('[data-testid="knowledge-action-row"]')
    expect(knowledgeActionRow.text()).toContain('新建文件夹')
    expect(knowledgeActionRow.text()).toContain('上传文件')
    expect(knowledgeActionRow.text()).toContain('知识库问答')
    expect(document.body.innerHTML).not.toContain('重命名知识库')
    expect(document.body.innerHTML).not.toContain('移动知识库')
    expect(document.body.innerHTML).not.toContain('修改标题')

    expect(wrapper.findAll('[data-testid="knowledge-file-card"]').length).toBeGreaterThan(0)
    await wrapper.findAll('[data-testid="knowledge-file-card"]').find((card) => card.text().includes('运动鞋团购成功案例.md'))!.trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('文件预览')
    expect(document.body.innerHTML).not.toContain('导出文件')
    expect(document.body.innerHTML).not.toContain('已准备导出')
    ;(document.querySelector('button[aria-label="关闭预览"]') as HTMLElement).click()
    await flushPromises()

    await wrapper.find('button[aria-label="删除 方案中心字段模板.xlsx"]').trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('已删除：方案中心字段模板.xlsx')
    expect(wrapper.findAll('[data-testid="knowledge-file-card"]').some((card) => card.text().includes('方案中心字段模板.xlsx'))).toBe(false)

    await wrapper.find('button[aria-label="知识库问答"]').trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('小智')
    expect(document.body.innerHTML).toContain('方案中心案例库')
    expect(document.body.innerHTML).toContain('智能问答')
    expect(document.body.innerHTML).toContain('知识检索')

    ;(document.querySelector('button[aria-label="关闭小智"]') as HTMLElement).click()
    await flushPromises()
    await wrapper.find('button[aria-label="上传文件"]').trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('确认上传')
    ;(document.querySelector('button[aria-label="确认上传文件"]') as HTMLElement).click()
    await flushPromises()
    expect(document.body.innerHTML).toContain('上传任务')
    expect(document.body.innerHTML).toContain('上传成功')
    expect(document.body.innerHTML).toContain('查看')

    await wrapper.find('button[aria-label="新建文件夹"]').trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('选择所属文件夹')
    expect(document.body.innerHTML).toContain('方案中心案例库')
    // 等待 Dialog 渲染完成
    await new Promise(r => setTimeout(r, 100))
    const folderInput = document.querySelector('input') as HTMLInputElement
    folderInput.value = '投标资料'
    folderInput.dispatchEvent(new Event('input', { bubbles: true }))
    ;(document.querySelector('[data-testid="create-folder-confirm"]') as HTMLElement)?.click()
    await flushPromises()
    expect(document.body.innerHTML).toContain('投标资料')

    const treePanel = wrapper.find('[data-testid="knowledge-tree-panel"]')
    await treePanel.trigger('contextmenu')
    await flushPromises()
    expect(document.body.innerHTML).toContain('新建文件夹')

    document.body.click()
    await flushPromises()
    const solutionTreeButton = treePanel.findAll('button').find((button) => button.text().includes('方案中心'))!
    await solutionTreeButton.trigger('contextmenu')
    await flushPromises()
    expect(document.body.innerHTML).toContain('新建知识库')

    document.body.click()
    await flushPromises()
    const refreshedTreeButtons = Array.from(document.querySelectorAll('[data-testid="knowledge-tree-panel"] button')) as HTMLElement[]
    const kbTreeButton = refreshedTreeButtons.find((button) => button.textContent?.includes('方案中心案例库'))
      ?? refreshedTreeButtons.find((button) => button.textContent?.includes('集团制度知识库'))
    expect(kbTreeButton).toBeTruthy()
    kbTreeButton!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(document.body.innerHTML).toContain('新建文件夹')
    // Navigate back to sidebar space root
    await wrapper.find('[data-testid="knowledge-main-header"] button').trigger('click')
    await flushPromises()
    expect(document.body.innerHTML).toContain('全部知识库')
    wrapper.unmount()
  })
})
