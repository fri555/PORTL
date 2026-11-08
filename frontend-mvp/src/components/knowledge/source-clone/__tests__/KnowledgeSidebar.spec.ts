import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import KnowledgeSidebar from '../KnowledgeSidebar.vue'
import type { SourceKnowledgeBase, SourceKnowledgeNode } from '@/types/knowledge-source'

const file: SourceKnowledgeNode = {
  id: 'file-one', name: '制度.pdf', kind: 'file', owner: '测试用户', updatedAt: '2026-10-30',
}
const syncedFile: SourceKnowledgeNode = {
  id: 'file-synced', name: '会议纪要.docx', kind: 'file', owner: '测试用户', updatedAt: '2026-10-30', sourceDocumentId: 'dingtalk-doc-1',
}
const folder: SourceKnowledgeNode = {
  id: 'folder-one', name: '人事制度', kind: 'folder', owner: '测试用户', updatedAt: '2026-10-30', children: [file, syncedFile],
}
const knowledgeBase: SourceKnowledgeBase = {
  id: 'kb-one', name: '集团知识库', owner: '测试用户', createdAt: '2026-10-30', space: 'public', nodes: [folder],
}

function mountSidebar(canNodeAction: (action: string, target: SourceKnowledgeBase | SourceKnowledgeNode, kbId: string) => boolean) {
  return mount(KnowledgeSidebar, {
    props: { open: true, items: [knowledgeBase], canNodeAction },
    attachTo: document.body,
    global: { stubs: { Teleport: true } },
  })
}

describe('KnowledgeSidebar node actions', () => {
  it('searches the current tree and keeps only matching files with their ancestors', async () => {
    const wrapper = mountSidebar(() => true)
    try {
      await wrapper.get('button[aria-label="搜索"]').trigger('click')
      const input = wrapper.get('input[aria-label="搜索知识树"]')
      expect(document.activeElement).toBe(input.element)
      await input.setValue('会议')
      expect(wrapper.find('.knowledge-sidebar__row[data-node-id="kb-one"]').exists()).toBe(true)
      expect(wrapper.find('.knowledge-sidebar__row[data-node-id="folder-one"]').exists()).toBe(true)
      expect(wrapper.find('.knowledge-sidebar__row[data-node-id="file-synced"]').exists()).toBe(true)
      expect(wrapper.find('.knowledge-sidebar__row[data-node-id="file-one"]').exists()).toBe(false)
      await wrapper.get('.knowledge-sidebar__row[data-node-id="file-synced"] .knowledge-sidebar__item').trigger('click')
      expect(wrapper.emitted('navigate')?.at(-1)?.[0]).toEqual({ kbId: 'kb-one', nodeId: 'file-synced', kind: 'file' })
    } finally {
      wrapper.unmount()
    }
  })

  it('matches knowledge bases and folders without expanding unrelated descendants, then restores the tree on clear', async () => {
    const wrapper = mountSidebar(() => true)
    try {
      await wrapper.get('button[aria-label="搜索"]').trigger('click')
      const input = wrapper.get('input[aria-label="搜索知识树"]')
      await input.setValue('人事')
      expect(wrapper.find('.knowledge-sidebar__row[data-node-id="kb-one"]').exists()).toBe(true)
      expect(wrapper.find('.knowledge-sidebar__row[data-node-id="folder-one"]').exists()).toBe(true)
      expect(wrapper.find('.knowledge-sidebar__row[data-node-id="file-one"]').exists()).toBe(false)
      await input.setValue('集团')
      expect(wrapper.find('.knowledge-sidebar__row[data-node-id="kb-one"]').exists()).toBe(true)
      expect(wrapper.find('.knowledge-sidebar__row[data-node-id="folder-one"]').exists()).toBe(false)
      await wrapper.get('button[aria-label="清空搜索"]').trigger('click')
      expect((wrapper.get('input[aria-label="搜索知识树"]').element as HTMLInputElement).value).toBe('')
      expect(wrapper.find('button[aria-label="展开集团知识库"]').exists()).toBe(true)
    } finally {
      wrapper.unmount()
    }
  })

  it('opens and focuses search on a parent request, then Escape closes it and resets filtering', async () => {
    const wrapper = mount(KnowledgeSidebar, {
      props: { open: true, items: [knowledgeBase], searchRequested: 0 },
      attachTo: document.body,
    })
    try {
      expect(wrapper.find('input[aria-label="搜索知识树"]').exists()).toBe(false)
      await wrapper.setProps({ searchRequested: 1 })
      await nextTick()
      const input = wrapper.get('input[aria-label="搜索知识树"]')
      expect(document.activeElement).toBe(input.element)
      await input.setValue('不存在')
      expect(wrapper.find('.knowledge-sidebar__row[data-node-id="kb-one"]').exists()).toBe(false)
      await input.trigger('keydown', { key: 'Escape' })
      expect(wrapper.find('input[aria-label="搜索知识树"]').exists()).toBe(false)
      expect(wrapper.find('.knowledge-sidebar__row[data-node-id="kb-one"]').exists()).toBe(true)
    } finally {
      wrapper.unmount()
    }
  })

  it('marks only DingTalk-synced files without changing navigation or their action menu', async () => {
    const wrapper = mountSidebar(() => true)
    try {
      await wrapper.get('button[aria-label="展开集团知识库"]').trigger('click')
      await wrapper.get('button[aria-label="展开人事制度"]').trigger('click')
      const synced = wrapper.get('.knowledge-sidebar__row[data-node-id="file-synced"]')
      expect(synced.get('.knowledge-sidebar__sync-mark').text()).toBe('同步')
      expect(wrapper.find('.knowledge-sidebar__row[data-node-id="file-one"] .knowledge-sidebar__sync-mark').exists()).toBe(false)
      await synced.get('.knowledge-sidebar__item').trigger('click')
      expect(wrapper.emitted('navigate')?.at(-1)?.[0]).toEqual({ kbId: 'kb-one', nodeId: 'file-synced', kind: 'file' })
      await synced.get('button[aria-label="会议纪要.docx更多操作"]').trigger('click')
      expect(wrapper.get('[role="menu"]').findAll('[role="menuitem"]').map(item => item.text())).toEqual([
        '预览', '权限管理', '删除',
      ])
    } finally {
      wrapper.unmount()
    }
  })

  it('shows the production-style New and Upload entry buttons with separate action menus', async () => {
    const wrapper = mountSidebar(() => true)
    try {
      const newButton = wrapper.get('button[aria-label="新建"]')
      const uploadButton = wrapper.get('button[aria-label="上传"]')
      expect(newButton.classes()).toContain('knowledge-sidebar__primary-action')
      expect(uploadButton.classes()).toContain('knowledge-sidebar__primary-action')
      expect(wrapper.find('.knowledge-sidebar__quick-upload').exists()).toBe(false)

      await newButton.trigger('click')
      const newMenu = wrapper.get('[role="menu"][aria-label="新建菜单"]')
      expect(newMenu.text()).toContain('新建知识库')
      expect(newMenu.text()).toContain('新建文件夹')
      expect(newMenu.text()).not.toContain('新建文档')
      expect(newMenu.text()).not.toContain('从钉钉导入')

      await uploadButton.trigger('click')
      const uploadMenu = wrapper.get('[role="menu"][aria-label="上传菜单"]')
      expect(uploadMenu.text()).toContain('上传文件')
      expect(uploadMenu.text()).toContain('从钉钉导入')
      expect(uploadMenu.text()).not.toContain('新建知识库')
      expect(wrapper.find('[role="menu"][aria-label="新建菜单"]').exists()).toBe(false)
    } finally {
      wrapper.unmount()
    }
  })

  it('keeps Upload clickable when the New menu opens instead of covering it', async () => {
    const wrapper = mountSidebar(() => true)
    try {
      await wrapper.get('button[aria-label="新建"]').trigger('click')
      const uploadButton = wrapper.get('button[aria-label="上传"]')
      const newMenu = wrapper.get('[role="menu"][aria-label="新建菜单"]')
      expect(uploadButton.element.compareDocumentPosition(newMenu.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(getComputedStyle(newMenu.element).position).toBe('static')

      await uploadButton.trigger('click')
      expect(wrapper.find('[role="menu"][aria-label="新建菜单"]').exists()).toBe(false)
      expect(wrapper.find('[role="menu"][aria-label="上传菜单"]').exists()).toBe(true)
      expect(wrapper.emitted('create')).toBeUndefined()
    } finally {
      wrapper.unmount()
    }
  })

  it('removes the action buttons from keyboard and click targeting while the sidebar is collapsed', async () => {
    const wrapper = mount(KnowledgeSidebar, { props: { open: false, items: [knowledgeBase] } })
    try {
      expect(wrapper.find('button[aria-label="新建"]').exists()).toBe(false)
      expect(wrapper.find('button[aria-label="上传"]').exists()).toBe(false)
      await wrapper.setProps({ open: true })
      expect(wrapper.find('button[aria-label="新建"]').exists()).toBe(true)
      await wrapper.setProps({ open: false })
      expect(wrapper.find('button[aria-label="新建"]').exists()).toBe(false)
    } finally {
      wrapper.unmount()
    }
  })

  it('does not duplicate access and sync navigation beside the knowledge tree', () => {
    const wrapper = mount(KnowledgeSidebar, {
      props: { open: true, items: [knowledgeBase] },
    })
    try {
      expect(wrapper.find('button[aria-label="新建"]').exists()).toBe(true)
      expect(wrapper.find('button[aria-label="上传"]').exists()).toBe(true)
      expect(wrapper.find('button[aria-label="公共空间"]').exists()).toBe(true)
      expect(wrapper.find('button[aria-label="个人空间"]').exists()).toBe(true)
      expect(wrapper.findAll('.knowledge-sidebar__access')).toHaveLength(0)
      expect(wrapper.text()).not.toContain('知识接入')
      expect(wrapper.text()).not.toContain('同步记录')
    } finally {
      wrapper.unmount()
    }
  })

  it('emits New actions only when their current-location capabilities allow them', async () => {
    const wrapper = mountSidebar(() => true)
    try {
      await wrapper.get('button[aria-label="新建"]').trigger('click')
      await wrapper.get('[role="menu"][aria-label="新建菜单"] [role="menuitem"][aria-label="新建知识库"]').trigger('click')
      expect(wrapper.emitted('create')).toHaveLength(1)
      expect(wrapper.find('[role="menu"][aria-label="新建菜单"]').exists()).toBe(false)

      await wrapper.get('button[aria-label="新建"]').trigger('click')
      expect(wrapper.get('[role="menuitem"][aria-label="新建文件夹"]').attributes('disabled')).toBeDefined()
      expect(wrapper.find('[role="menuitem"][aria-label="新建文档"]').exists()).toBe(false)
      await wrapper.setProps({ canCreateFolder: true, canCreateDocument: true })
      await wrapper.get('[role="menuitem"][aria-label="新建文件夹"]').trigger('click')
      expect(wrapper.emitted('create-folder')).toHaveLength(1)
      expect(wrapper.emitted('create-document')).toBeUndefined()
    } finally {
      wrapper.unmount()
    }
  })

  it('gates Upload actions and restores trigger focus when its menu closes with Escape', async () => {
    const wrapper = mountSidebar(() => true)
    try {
      const trigger = wrapper.get('button[aria-label="上传"]')
      await trigger.trigger('click')
      expect(wrapper.get('[role="menuitem"][aria-label="上传文件"]').attributes('disabled')).toBeDefined()
      expect(wrapper.get('[role="menuitem"][aria-label="从钉钉导入"]').attributes('disabled')).toBeDefined()
      await wrapper.setProps({ canQuickUpload: true, canImportDingTalk: true })
      await wrapper.get('[role="menuitem"][aria-label="上传文件"]').trigger('click')
      expect(wrapper.emitted('quick-upload')).toHaveLength(1)
      await trigger.trigger('click')
      await wrapper.get('[role="menu"][aria-label="上传菜单"]').trigger('keydown', { key: 'Escape' })
      expect(wrapper.find('[role="menu"][aria-label="上传菜单"]').exists()).toBe(false)
      expect(document.activeElement).toBe(trigger.element)
      await trigger.trigger('click')
      await wrapper.get('[role="menuitem"][aria-label="从钉钉导入"]').trigger('click')
      expect(wrapper.emitted('import')).toHaveLength(1)
    } finally {
      wrapper.unmount()
    }
  })

  it('offers authorized knowledge-base actions and sends the original target to the parent', async () => {
    const wrapper = mountSidebar(() => true)
    try {
      await wrapper.get('button[aria-label="集团知识库更多操作"]').trigger('click')
      expect(wrapper.get('[role="menu"]').findAll('[role="menuitem"]').map(item => item.text())).toEqual([
        '重命名', '新建文件夹', '上传文件', '从钉钉导入', '权限管理', '删除',
      ])
      await wrapper.get('[role="menuitem"][aria-label="上传文件"]').trigger('click')
      expect(wrapper.emitted('node-action')?.[0]).toEqual([{ kind: 'upload', target: knowledgeBase, kbId: 'kb-one' }])
      expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    } finally {
      wrapper.unmount()
    }
  })

  it('offers the exact folder and file action sets while preserving file navigation', async () => {
    const wrapper = mountSidebar(() => true)
    try {
      await wrapper.get('button[aria-label="展开集团知识库"]').trigger('click')
      await wrapper.get('button[aria-label="人事制度更多操作"]').trigger('click')
      expect(wrapper.get('[role="menu"]').findAll('[role="menuitem"]').map(item => item.text())).toEqual([
        '重命名', '上传文件', '从钉钉导入', '权限管理', '删除',
      ])
      await wrapper.get('button[aria-label="人事制度更多操作"]').trigger('click')
      await wrapper.get('button[aria-label="展开人事制度"]').trigger('click')
      await wrapper.get('button[aria-label="制度.pdf更多操作"]').trigger('click')
      const menu = wrapper.get('[role="menu"]')
      expect(menu.findAll('[role="menuitem"]').map(item => item.text())).toEqual([
        '预览', '权限管理', '删除',
      ])
      await menu.get('[role="menuitem"][aria-label="预览"]').trigger('click')
      expect(wrapper.emitted('node-action')?.at(-1)).toEqual([{ kind: 'preview', target: file, kbId: 'kb-one' }])
      await wrapper.get('.knowledge-sidebar__row[data-node-id="file-one"] .knowledge-sidebar__item').trigger('click')
      expect(wrapper.emitted('navigate')?.at(-1)?.[0]).toEqual({ kbId: 'kb-one', nodeId: 'file-one', kind: 'file' })
    } finally {
      wrapper.unmount()
    }
  })

  it('fails closed without parent capabilities and closes an open menu on Escape', async () => {
    const wrapper = mount(KnowledgeSidebar, { props: { open: true, items: [knowledgeBase] }, attachTo: document.body, global: { stubs: { Teleport: true } } })
    try {
      expect(wrapper.find('button[aria-label="集团知识库更多操作"]').exists()).toBe(false)
      await wrapper.setProps({ canNodeAction: () => true })
      await wrapper.get('button[aria-label="集团知识库更多操作"]').trigger('click')
      expect(wrapper.find('[role="menu"]').exists()).toBe(true)
      await wrapper.get('[role="menu"]').trigger('keydown', { key: 'Escape' })
      expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    } finally {
      wrapper.unmount()
    }
  })
})
