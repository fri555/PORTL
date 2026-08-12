import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import KnowledgeBaseView from '@/views/KnowledgeBaseView.vue'

describe('KnowledgeBaseView', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    wrapper = mount(KnowledgeBaseView, { global: { stubs: { Teleport: true } } })
  })

  it('renders the production knowledge list and actions', () => {
    expect(wrapper.findAll('[data-testid="knowledge-kb-card"]')).toHaveLength(6)
    expect(wrapper.text()).toContain('集团制度')
    expect(wrapper.text()).toContain('组货专家知识库')
    expect(wrapper.text()).toContain('上传文件')
    expect(wrapper.text()).toContain('新建文件夹')
    expect(wrapper.text()).toContain('小智问答')
  })

  it('opens the source-style knowledge navigation panel', async () => {
    await wrapper.get('button[aria-label="展开知识库导航"]').trigger('click')
    expect(wrapper.find('[data-testid="knowledge-tree-panel"]').exists()).toBe(true)
    expect(wrapper.find('input[placeholder="搜索知识库"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('新建知识库')
  })

  it('opens a knowledge base and lists its indexed documents', async () => {
    await wrapper.findAll('[data-testid="knowledge-kb-card"]')[0].find('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('员工手册2026版.docx')
    expect(wrapper.text()).toContain('已索引')
    expect(wrapper.findAll('[data-testid="knowledge-file-card"]')).toHaveLength(3)
  })

  it('adds permission settings beside rename and delete', async () => {
    await wrapper.get('button[aria-label="集团制度操作菜单"]').trigger('click')
    const menu = wrapper.get('[role="menu"]')
    expect(menu.text()).toContain('重命名')
    expect(menu.text()).toContain('权限设置')
    expect(menu.text()).toContain('删除')
    await menu.findAll('[role="menuitem"]')[1].trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="resource-permission-dialog"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('权限设置 - 集团制度')
    expect(wrapper.text()).toContain('RAG 检索链路')
  })

  it('opens the Q&A modal', async () => {
    await wrapper.get('button[aria-label="知识库问答"]').trigger('click')
    expect(wrapper.text()).toContain('基于全部知识库进行智能问答与知识检索')
  })
})
