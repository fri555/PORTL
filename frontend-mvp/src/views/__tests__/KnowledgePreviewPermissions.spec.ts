import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAppStore } from '@/stores/app'
import { mockUser } from '@/mock/user'
import KnowledgeBaseView from '@/views/KnowledgeBaseView.vue'
import KnowledgeDialogs from '@/components/knowledge/source-clone/KnowledgeDialogs.vue'
import KnowledgeTable from '@/components/knowledge/source-clone/KnowledgeTable.vue'
import DingTalkDocumentImport from '@/components/knowledge/source-clone/DingTalkDocumentImport.vue'
import { personalDingTalkDocuments } from '@/components/knowledge/source-clone/dingtalkPrototype'
import * as dingTalkPrototype from '@/components/knowledge/source-clone/dingtalkPrototype'
import KnowledgeAccessPanel from '@/components/knowledge/source-clone/KnowledgeAccessPanel.vue'

const routeQuery = vi.hoisted(() => ({} as Record<string, string>))
vi.mock('vue-router', async importOriginal => ({ ...await importOriginal<typeof import('vue-router')>(), useRoute: () => ({ query: routeQuery }) }))

describe('knowledge-center preview permissions', () => {
  let wrapper: ReturnType<typeof mount> | undefined
  beforeEach(() => { for (const key of Object.keys(routeQuery)) delete routeQuery[key] })
  afterEach(() => { wrapper?.unmount(); vi.spyOn(dingTalkPrototype, 'personalDingTalkDocuments').mockRestore() })
  function mountView(role: string | undefined, userRole: 'admin' | 'user' = 'admin') {
    if (role) routeQuery.permissionRole = role
    const pinia = createPinia(); setActivePinia(pinia); useAppStore().login({ ...mockUser, role: userRole })
    wrapper = mount(KnowledgeBaseView, { global: { plugins: [pinia], stubs: { Teleport: true, ElDialog: { template: '<div><slot /><slot name="footer" /></div>' }, ElSelect: { template: '<div><slot /></div>' }, ElOption: true } } })
    return wrapper
  }
  async function previewFirstFile(view: ReturnType<typeof mount>) {
    await view.findAll('[data-testid="knowledge-kb-row"]')[0].trigger('click')
    await view.findAll('[data-testid="knowledge-node-row"]')[0].trigger('click')
    await view.findAll('[data-testid="knowledge-node-row"]')[0].trigger('click')
    return view.get('[data-testid="knowledge-file-preview"]')
  }
  it('keeps online preview and retrieval available while hiding downloads for preview-only access', async () => {
    const view = mountView('READER')
    const preview = await previewFirstFile(view)
    expect(preview.text()).toContain('考勤管理制度_v3.pdf')
    expect(preview.find('[aria-label="下载文件"]').exists()).toBe(false)
    expect(view.find('button[aria-label="小智问答"]').exists()).toBe(true)
  })
  it('preserves the download entry for view access and disables it when no file resource exists', async () => {
    const preview = await previewFirstFile(mountView('DOWNLOADER'))
    expect(preview.get('button[aria-label="下载文件"]').attributes()).toHaveProperty('disabled')
  })
  it('makes the uploader the owner of the new file while retaining parent permission inheritance', async () => {
    const view = mountView('OWNER')
    await view.findAll('[data-testid="knowledge-kb-row"]')[0].trigger('click')
    view.getComponent(KnowledgeDialogs).vm.$emit('upload', [new File(['hello'], '上传文件.txt')], 'kb-public-1', { monthlyReport: false })
    await flushPromises()
    const file = view.getComponent(KnowledgeTable).props('nodes')!.find(node => node.name === '上传文件.txt')!
    expect(file.owner).toBe(mockUser.displayName)
    expect(file.permission).toMatchObject({ owner: mockUser.displayName, inheritParent: true, members: [], roles: {}, revision: 1 })
  })
  it('makes the importer the protected creator, keeps departments, and omits source groups', async () => {
    routeQuery.import = 'dingtalk'
    const view = mountView('OWNER')
    const importer = view.getComponent(DingTalkDocumentImport)
    expect(importer.get('[data-testid="dingtalk-sync-policy"]').text()).toContain('导入人为创建者')
    expect(importer.get('[data-testid="dingtalk-sync-policy"]').text()).toContain('后续在天马智擎维护权限')
    const document = personalDingTalkDocuments(importer.props('identity')).find(item => item.id === 'catalog')!
    importer.vm.$emit('complete', { destinationId: 'kb-public-2', documents: [document], platformUserId: mockUser.id, frequency: '每天', schedule: '00:00' })
    await flushPromises()
    await view.findAll('[data-testid="knowledge-kb-row"]')[1].trigger('click')
    const imported = view.getComponent(KnowledgeTable).props('nodes')!.find(node => node.sourceDocumentId === 'catalog')!
    expect(imported.permission).toMatchObject({ owner: mockUser.displayName, inheritParent: false, roles: { 清晖: 'MANAGER', 向阳: 'DOWNLOADER', 知夏: 'READER', 人力资源中心: 'DOWNLOADER' } })
    expect(imported.permission!.members).not.toContain('天马AI项目群')
    expect(imported.permission!.members).toContain('人力资源中心')
    expect(imported.permission!.members).not.toContain('悠米')
    expect(imported.permission).not.toHaveProperty('syncedRoles')
    expect(Object.values(imported.permission!.roles)).not.toContain('OWNER')
  })
  it('persists initialized permission origins through local permission edits and drops deleted origins', async () => {
    routeQuery.import = 'dingtalk'
    const view = mountView('OWNER')
    const importer = view.getComponent(DingTalkDocumentImport)
    const document = personalDingTalkDocuments(importer.props('identity')).find(item => item.id === 'catalog')!
    importer.vm.$emit('complete', { destinationId: 'kb-public-2', documents: [document], platformUserId: mockUser.id, frequency: '每天', schedule: '00:00' })
    await flushPromises()
    await view.findAll('[data-testid="knowledge-kb-row"]')[1].trigger('click')
    const table = view.getComponent(KnowledgeTable)
    const imported = table.props('nodes')!.find(node => node.sourceDocumentId === 'catalog')!
    expect(imported.permission?.initialPermissionSubjects).toContain('清晖')
    expect(imported.permission?.initialPermissionSubjects).toContain('人力资源中心')
    table.vm.$emit('action', { kind: 'permission', target: imported })
    await flushPromises()
    view.getComponent(KnowledgeDialogs).vm.$emit('permission', { resourceId: imported.id, ...imported.permission!, members: ['人力资源中心'], roles: { 人力资源中心: 'DOWNLOADER' }, initialPermissionSubjects: ['人力资源中心'] })
    await flushPromises()
    expect(imported.permission?.initialPermissionSubjects).toEqual(['人力资源中心'])
    expect(imported.permission?.roles).not.toHaveProperty('清晖')
  })
  it('offers public import destinations to managers and excludes them for viewing roles', async () => {
    routeQuery.import = 'dingtalk'
    const view = mountView('MANAGER', 'user')
    expect(view.getComponent(DingTalkDocumentImport).props('destinations').some(item => item.space === 'public')).toBe(true)
    view.unmount()
    const reader = mountView('DOWNLOADER', 'user')
    expect(reader.getComponent(DingTalkDocumentImport).props('destinations').some(item => item.space === 'public')).toBe(false)
  })
  it('allows managers to delete an independent public permission root', async () => {
    const view = mountView('MANAGER', 'user')
    await view.get('[aria-label="集团制度知识库操作菜单"]').trigger('click')
    const action = view.findAll('[role="menuitem"]').find(item => item.text() === '删除')!
    expect(action.attributes()).not.toHaveProperty('disabled')
    await action.trigger('click')
    expect(view.getComponent(KnowledgeDialogs).props('kind')).toBe('delete')
  })
  it('keeps personal imports private without initializing public collaborators', async () => {
    routeQuery.import = 'dingtalk'
    const view = mountView('DOWNLOADER', 'user')
    const importer = view.getComponent(DingTalkDocumentImport)
    const document = personalDingTalkDocuments(importer.props('identity')).find(item => item.id === 'catalog')!
    importer.vm.$emit('complete', { destinationId: 'kb-personal-1', documents: [document], platformUserId: mockUser.id, frequency: '每天', schedule: '00:00' })
    await flushPromises()
    await view.get('[aria-label="展开侧栏"]').trigger('click')
    await view.get('[aria-label="个人空间"]').trigger('click')
    await view.findAll('[data-testid="knowledge-kb-row"]')[0].trigger('click')
    const imported = view.getComponent(KnowledgeTable).props('nodes')!.find(node => node.sourceDocumentId === 'catalog')!
    expect(imported.permission).toMatchObject({ owner: mockUser.displayName, members: [], roles: {} })
    expect(view.getComponent(KnowledgeDialogs).props('systemAdmin')).toBe(false)
  })
  it('uses the resource grant for write controls and hides download on preview-only files without demo overrides', async () => {
    const view = mountView(undefined, 'user')
    const table = view.getComponent(KnowledgeTable)
    const library = table.props('items')[0]!
    library.permission = { owner: '其他创建者', members: [mockUser.displayName], roles: { [mockUser.displayName]: 'MANAGER' }, inheritParent: false, revision: 1 }
    await view.findAll('[data-testid="knowledge-kb-row"]')[0].trigger('click')
    await view.get('[aria-label="新建"]').trigger('click')
    expect(view.get('[aria-label="上传文件"]').attributes()).not.toHaveProperty('disabled')
    await view.findAll('[data-testid="knowledge-node-row"]')[0].trigger('click')
    const file = view.getComponent(KnowledgeTable).props('nodes')![0]!
    file.permission = { owner: '其他创建者', members: [mockUser.displayName], roles: { [mockUser.displayName]: 'READER' }, inheritParent: false, revision: 1 }
    await view.findAll('[data-testid="knowledge-node-row"]')[0].trigger('click')
    expect(view.get('[data-testid="knowledge-file-preview"]').find('[aria-label="下载文件"]').exists()).toBe(false)
  })
  it('records an initialization failure per document and still imports the other selected document', async () => {
    routeQuery.import = 'dingtalk'
    routeQuery.view = 'sync'
    const original = dingTalkPrototype.personalDingTalkDocuments
    vi.spyOn(dingTalkPrototype, 'personalDingTalkDocuments').mockImplementation((...args) => original(...args).map(document => document.id === 'onboarding' ? { ...document, initialPermissions: { complete: false, grants: [] } } : document))
    const view = mountView('MANAGER', 'user')
    const importer = view.getComponent(DingTalkDocumentImport)
    const documents = personalDingTalkDocuments(importer.props('identity')).filter(document => ['onboarding', 'catalog'].includes(document.id))
    importer.vm.$emit('complete', { destinationId: 'kb-public-2', documents, platformUserId: mockUser.id, frequency: '每天', schedule: '00:00' })
    await flushPromises()
    const task = view.getComponent(KnowledgeAccessPanel).props('records')![0]!
    expect(task.status).toBe('部分失败')
    expect(task.documentMappings.find(mapping => mapping.sourceDocumentId === 'onboarding')).toMatchObject({ status: '失败', localFileId: '', permissionResult: '失败' })
    expect(task.documentMappings.find(mapping => mapping.sourceDocumentId === 'catalog')).toMatchObject({ status: '成功', permissionResult: '首次初始化' })
  })
  it('records a fully failed import attempt without publishing any document', async () => {
    routeQuery.import = 'dingtalk'
    routeQuery.view = 'sync'
    const original = dingTalkPrototype.personalDingTalkDocuments
    vi.spyOn(dingTalkPrototype, 'personalDingTalkDocuments').mockImplementation((...args) => original(...args).map(document => ({ ...document, initialPermissions: { complete: false, grants: [] } })))
    const view = mountView('MANAGER', 'user')
    const importer = view.getComponent(DingTalkDocumentImport)
    const documents = personalDingTalkDocuments(importer.props('identity')).filter(document => document.id === 'catalog')
    importer.vm.$emit('failed', { destinationId: 'kb-public-2', documents, platformUserId: mockUser.id, frequency: '每天', schedule: '00:00' })
    await flushPromises()
    const task = view.getComponent(KnowledgeAccessPanel).props('records')![0]!
    expect(task.status).toBe('同步失败')
    expect(task.documentMappings[0]).toMatchObject({ localFileId: '', permissionResult: '失败' })
    await view.get('.breadcrumb button').trigger('click')
    const library = view.getComponent(KnowledgeTable).props('items').find(item => item.id === 'kb-public-2')!
    expect(library.nodes?.some(node => node.sourceDocumentId === 'catalog')).toBe(false)
  })
  it('assigns the logged-in creator to newly created libraries and folders', async () => {
    const view = mountView('MANAGER', 'user')
    view.getComponent(KnowledgeDialogs).vm.$emit('create', { name: '新建库', space: 'public' })
    await flushPromises()
    const library = view.getComponent(KnowledgeTable).props('items')[0]!
    expect(library.owner).toBe(mockUser.displayName)
    expect(library.permission).toMatchObject({ owner: mockUser.displayName, members: [], roles: {}, inheritParent: false })
    await view.findAll('[data-testid="knowledge-kb-row"]')[0].trigger('click')
    view.getComponent(KnowledgeDialogs).vm.$emit('folder', { name: '新建文件夹', kb: library.id })
    await flushPromises()
    expect(view.getComponent(KnowledgeTable).props('nodes')![0]).toMatchObject({ owner: mockUser.displayName, permission: { owner: mockUser.displayName, inheritParent: true } })
  })

  it.each([['READER', false], ['DOWNLOADER', true]] as const)('resolves a department-only %s grant from the current organization profile', async (role, downloadable) => {
    const view = mountView(undefined, 'user')
    const library = view.getComponent(KnowledgeTable).props('items')[0]!
    library.owner = '其他创建者'
    library.permission = { owner: '其他创建者', members: [mockUser.department], roles: { [mockUser.department]: role }, subjectKinds: { [mockUser.department]: 'department' }, inheritParent: false, revision: 1 }
    const preview = await previewFirstFile(view)
    expect(preview.text()).toContain('考勤管理制度_v3.pdf')
    expect(view.find('[aria-label="小智问答"]').exists()).toBe(true)
    expect(preview.find('[aria-label="下载文件"]').exists()).toBe(downloadable)
    await view.get('[aria-label="新建"]').trigger('click')
    expect(view.get('[aria-label="上传文件"]').attributes()).toHaveProperty('disabled')
  })

})
