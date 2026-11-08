import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import KnowledgeBaseView from '@/views/KnowledgeBaseView.vue'
import KnowledgeSidebar from '@/components/knowledge/source-clone/KnowledgeSidebar.vue'
import KnowledgeDialogs from '@/components/knowledge/source-clone/KnowledgeDialogs.vue'
import { useAppStore } from '@/stores/app'
import { mockUser } from '@/mock/user'
import type { SourceKnowledgeBase } from '@/types/knowledge-source'

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()) })

async function page(url = '/knowledge') {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAppStore().login({ ...mockUser, role: 'admin' })
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/knowledge', component: KnowledgeBaseView }] })
  await router.push(url)
  await router.isReady()
  const wrapper = mount(KnowledgeBaseView, { global: { plugins: [pinia, router], stubs: { Teleport: true } } })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

describe('knowledge center local documents', () => {
  it('creates a document in the current knowledge base and edits its title and body from preview', async () => {
    const wrapper = await page()
    await wrapper.findAll('[data-testid="knowledge-kb-row"]')[0]!.trigger('click')
    await wrapper.get('button[aria-label="新建"]').trigger('click')
    await wrapper.get('button[role="menuitem"][aria-label="新建文档"]').trigger('click')
    expect(wrapper.getComponent(KnowledgeDialogs).props('target')?.id).toBe('kb-public-1')
    await wrapper.get('#document-title').setValue('员工入职须知')
    await wrapper.get('#document-content').setValue('报到时间：09:00\n携带身份证。')
    await wrapper.get('form[data-testid="knowledge-document-form"]').trigger('submit')
    await flushPromises()

    const row = wrapper.findAll('[data-testid="knowledge-node-row"]').find(node => node.text().includes('员工入职须知'))
    expect(row).toBeTruthy()
    await row!.get('button[aria-label="员工入职须知操作菜单"]').trigger('click')
    const editAction = row!.findAll('[role="menuitem"]').find(item => item.text() === '编辑文档')
    expect(editAction).toBeTruthy()
    await editAction!.trigger('click')
    expect(wrapper.getComponent(KnowledgeDialogs).props('kind')).toBe('edit-document')
    await wrapper.get('button[aria-label="关闭弹窗"]').trigger('click')
    await row!.trigger('click')
    expect(wrapper.get('[data-testid="knowledge-document-content"]').text()).toContain('报到时间：09:00')
    expect(wrapper.get('[data-testid="knowledge-document-content"]').text()).toContain('携带身份证。')

    await wrapper.get('button[aria-label="编辑文档"]').trigger('click')
    expect((wrapper.get('#document-title').element as HTMLInputElement).value).toBe('员工入职须知')
    await wrapper.get('#document-title').setValue('新版入职须知.v2')
    await wrapper.get('#document-content').setValue('请在 08:30 到场。')
    await wrapper.get('form[data-testid="knowledge-document-form"]').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-testid="knowledge-file-preview"] .preview-paper h2').text()).toBe('新版入职须知.v2')
    expect(wrapper.get('[data-testid="knowledge-document-content"]').text()).toBe('请在 08:30 到场。')
  })

  it('uses a clicked sidebar folder as the new document destination', async () => {
    const wrapper = await page()
    const sidebar = wrapper.getComponent(KnowledgeSidebar)
    const base = (sidebar.props('items') as SourceKnowledgeBase[]).find(item => item.id === 'kb-public-1')!
    const folder = base.nodes!.find(node => node.id === 'policy-hr')!
    await wrapper.get('button[aria-label="展开集团制度知识库"]').trigger('click')
    await wrapper.get('button[aria-label="人事制度更多操作"]').trigger('click')
    await wrapper.get('[role="menuitem"][aria-label="新建文档"]').trigger('click')
    await flushPromises()
    expect(wrapper.getComponent(KnowledgeDialogs).props('target')?.id).toBe('policy-hr')
    expect(wrapper.get('#document-destination').text()).toContain('人事制度')
    await wrapper.get('#document-title').setValue('人事问答')
    await wrapper.get('#document-content').setValue('请先联系直属主管。')
    await wrapper.get('form[data-testid="knowledge-document-form"]').trigger('submit')
    await flushPromises()
    expect(folder.children?.find(node => node.name === '人事问答')).toMatchObject({ kind: 'file', content: '请先联系直属主管。' })
  })

  it('requires a title and writable destination when started from all knowledge bases', async () => {
    const wrapper = await page()
    await wrapper.get('button[aria-label="新建"]').trigger('click')
    await wrapper.get('button[role="menuitem"][aria-label="新建文档"]').trigger('click')
    expect(wrapper.getComponent(KnowledgeDialogs).props('target')).toBeNull()
    await wrapper.get('#document-title').setValue('产品说明')
    expect(wrapper.get('form[data-testid="knowledge-document-form"] button[type="submit"]').attributes()).toHaveProperty('disabled')
    await wrapper.get('#document-destination').trigger('click')
    await wrapper.get('[aria-label="存放至集团制度知识库"]').trigger('click')
    expect(wrapper.get('form[data-testid="knowledge-document-form"] button[type="submit"]').attributes()).not.toHaveProperty('disabled')
    await wrapper.get('form[data-testid="knowledge-document-form"]').trigger('submit')
    await flushPromises()
    const base = (wrapper.getComponent(KnowledgeSidebar).props('items') as SourceKnowledgeBase[]).find(item => item.id === 'kb-public-1')!
    expect(base.nodes?.find(node => node.name === '产品说明')).toMatchObject({ content: '', format: '文档' })
  })

  it('disables new documents when the current knowledge base cannot be written', async () => {
    const wrapper = await page('/knowledge?permissionRole=READER')
    await wrapper.findAll('[data-testid="knowledge-kb-row"]')[0]!.trigger('click')
    await wrapper.get('button[aria-label="新建"]').trigger('click')
    expect(wrapper.get('button[role="menuitem"][aria-label="新建文档"]').attributes()).toHaveProperty('disabled')
  })

  it('blocks another local document with the same title in one destination before saving', async () => {
    const wrapper = await page('/knowledge?kb=kb-public-1&folder=policy-hr')
    await wrapper.get('button[aria-label="新建"]').trigger('click')
    await wrapper.get('button[role="menuitem"][aria-label="新建文档"]').trigger('click')
    await wrapper.get('#document-title').setValue('员工手册2026版.docx')
    expect(wrapper.get('[role="alert"]').text()).toContain('同名文档')
    expect(wrapper.get('form[data-testid="knowledge-document-form"] button[type="submit"]').attributes()).toHaveProperty('disabled')
  })

  it('rejects a duplicate title even when the create event bypasses the form', async () => {
    const wrapper = await page('/knowledge?kb=kb-public-1&folder=policy-hr')
    const sidebar = wrapper.getComponent(KnowledgeSidebar)
    const base = (sidebar.props('items') as SourceKnowledgeBase[]).find(item => item.id === 'kb-public-1')!
    const folder = base.nodes!.find(node => node.id === 'policy-hr')!
    wrapper.getComponent(KnowledgeDialogs).vm.$emit('document', { name: '员工手册2026版.docx', content: '不能覆盖', destinationId: 'policy-hr' })
    await flushPromises()
    expect(folder.children?.filter(node => node.name === '员工手册2026版.docx')).toHaveLength(1)
  })
})
