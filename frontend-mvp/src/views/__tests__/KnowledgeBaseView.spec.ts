import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// Mock localStorage before any imports
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

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe() { /* noop */ }
  unobserve() { /* noop */ }
  disconnect() { /* noop */ }
}
Object.defineProperty(globalThis, 'IntersectionObserver', {
  value: MockIntersectionObserver,
  configurable: true,
})

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: () => Promise.resolve() },
  configurable: true,
})

import KnowledgeBaseView from '@/views/KnowledgeBaseView.vue'

describe('KnowledgeBaseView', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    storage.clear()
    setActivePinia(createPinia())
    wrapper = mount(KnowledgeBaseView, {
      global: {
        stubs: {
          Transition: false,
          Teleport: true,
          SidebarTreeNode: false,
          SearchDialog: true,
          Dialog: false,
          DialogContent: false,
          DialogHeader: false,
          DialogTitle: false,
          DialogDescription: false,
          Button: false,
          Input: false,
        },
      },
    })
  })

  // ─── 基础渲染 ───

  it('renders the sidebar with knowledge center title', () => {
    expect(wrapper.find('[data-testid="knowledge-sidebar-subheader"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('知识中心')
  })

  it('renders the knowledge tree panel', () => {
    expect(wrapper.find('[data-testid="knowledge-tree-panel"]').exists()).toBe(true)
  })

  it('renders knowledge bases in the sidebar', () => {
    const html = wrapper.html()
    expect(html).toContain('集团制度知识库')
    expect(html).toContain('方案中心案例库')
    expect(html).toContain('商品基础资料库')
  })

  it('renders the main pane', () => {
    expect(wrapper.find('[data-testid="knowledge-main-pane"]').exists()).toBe(true)
  })

  // ─── 知识库列表 ───

  it('shows knowledge bases in the main content area', () => {
    const html = wrapper.html()
    expect(html).toContain('集团制度知识库')
    expect(html).toContain('方案中心案例库')
    expect(html).toContain('方案中心')
  })

  it('shows KB count in the header', () => {
    const html = wrapper.html()
    const countMatch = html.match(/共 (\d+) 个知识库/)
    expect(countMatch).not.toBeNull()
    expect(Number(countMatch![1])).toBeGreaterThan(0)
  })

  // ─── 搜索 ───

  it('has a search input in the sidebar', () => {
    const searchInputs = wrapper.findAll('input').filter(i => i.attributes('placeholder')?.includes('搜索'))
    expect(searchInputs.length).toBeGreaterThanOrEqual(1)
  })

  // ─── 视图切换 ───

  it('toggles sidebar visibility', async () => {
    const collapseBtn = wrapper.find('[aria-label="折叠侧边栏"]')
    expect(collapseBtn.exists()).toBe(true)
    await collapseBtn.trigger('click')
    await flushPromises()
    const sidebar = wrapper.find('aside')
    expect(sidebar.classes()).toContain('-translate-x-full')
  })

  // ─── 新建知识库（基础检查） ───

  it('shows create KB button', () => {
    const createBtn = wrapper.findAll('button').filter(b => b.text().includes('新建知识库'))
    expect(createBtn.length).toBeGreaterThan(0)
  })

  // ─── 文件列表（当选中 KB 后） ───

  it('shows file cards after selecting a KB', async () => {
    const kbButton = wrapper.findAll('button').filter(b => b.text().includes('集团制度知识库'))
    if (kbButton.length > 0) {
      await kbButton[0].trigger('click')
      await flushPromises()
      const html = wrapper.html()
      expect(html).toContain('考勤管理制度_v3.pdf')
      expect(html).toContain('员工手册2026版.docx')
    }
  })

  // ─── 知识库卡片 ───

  it('renders knowledge base cards', () => {
    const cards = wrapper.findAll('[data-testid="knowledge-kb-card"]')
    expect(cards.length).toBeGreaterThan(0)
  })

  // ─── 文件夹渲染 ───

  it('renders folder nodes in the file tree', () => {
    const html = wrapper.html()
    expect(html).toContain('团购预算池')
  })
})
