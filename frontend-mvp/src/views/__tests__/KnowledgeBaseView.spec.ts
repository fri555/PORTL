import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import KnowledgeBaseView from '@/views/KnowledgeBaseView.vue'

describe('KnowledgeBaseView source clone', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    wrapper = mount(KnowledgeBaseView, {
      attachTo: document.body,
      global: { stubs: { Teleport: true } },
    })
  })

  it('renders local mock knowledge bases in the captured four-column shell', () => {
    const rows = wrapper.findAll('[data-testid="knowledge-kb-row"]')
    expect(rows).toHaveLength(12)
    expect(rows[0].text()).toContain('集团制度知识库')
    expect(rows[0].text()).toContain('集团运营')
    expect(rows[11].text()).toContain('人力培训知识库')
    expect(wrapper.text()).not.toContain('权限04')
    expect(wrapper.get('[data-testid="knowledge-table-header"]').text()).toContain('名称')
    expect(wrapper.get('[data-testid="knowledge-table-header"]').text()).toContain('所有者')
    expect(wrapper.get('[data-testid="knowledge-table-header"]').text()).toContain('创建时间')
    expect(wrapper.get('[data-testid="knowledge-table-header"]').text()).toContain('操作')
    expect(wrapper.get('[data-testid="knowledge-table-header"]').text()).not.toContain('最近访问')
  })

  it('opens the exact source sidebar and switches spaces', async () => {
    await wrapper.get('button[aria-label="展开侧栏"]').trigger('click')
    const sidebar = wrapper.get('[data-testid="knowledge-sidebar"]')
    expect(sidebar.text()).toContain('新建知识库')
    expect(sidebar.text()).toContain('公共空间')
    expect(sidebar.text()).toContain('个人空间')
    expect(sidebar.text()).toContain('集团制度知识库')

    await sidebar.get('button[aria-label="展开集团制度知识库"]').trigger('click')
    expect(sidebar.text()).toContain('人事制度')
    await sidebar.get('button[aria-label="展开人事制度"]').trigger('click')
    expect(sidebar.text()).toContain('考勤与休假')

    await sidebar.get('button[aria-label="个人空间"]').trigger('click')
    expect(sidebar.get('button[aria-label="个人空间"]').attributes('aria-selected')).toBe('true')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="knowledge-kb-row"]')).toHaveLength(4)
    expect(wrapper.text()).toContain('我的客户资料')
  })

  it('matches the create, upload, and folder dialog copy and disabled states', async () => {
    await wrapper.get('button[aria-label="新建知识库"]').trigger('click')
    expect(wrapper.get('[role="dialog"]').text()).toContain('所属空间')
    expect(wrapper.get('[role="dialog"]').text()).toContain('公共空间')
    expect(wrapper.get('[role="dialog"]').text()).toContain('个人空间')
    await wrapper.get('button[aria-label="关闭弹窗"]').trigger('click')

    await wrapper.get('button[aria-label="上传文件"]').trigger('click')
    const upload = wrapper.get('[role="dialog"]')
    expect(upload.text()).toContain('上传至')
    expect(upload.text()).toContain('点击上传文件')
    expect(upload.text()).toContain('也可将文件拖拽或粘贴到此处')
    expect(upload.text()).toContain('单文件不超过 50MB；最多 100 个')
    expect(upload.text()).toContain('暂无本地文件')
    expect(upload.text()).toContain('请在上方点击、拖拽或粘贴文件')
    expect(upload.get('button[type="submit"]').attributes()).toHaveProperty('disabled')
    await wrapper.get('button[aria-label="关闭弹窗"]').trigger('click')

    await wrapper.get('button[aria-label="新建文件夹"]').trigger('click')
    expect(wrapper.get('[role="dialog"]').text()).toContain('文件名称')
    expect(wrapper.get('[role="dialog"]').text()).toContain('所属知识库')
  })

  it('keeps knowledge-base permissions compatible with the previous release', async () => {
    await wrapper.get('button[aria-label="集团制度知识库操作菜单"]').trigger('click')
    const menu = wrapper.get('[role="menu"]')
    expect(menu.text()).toContain('重命名')
    expect(menu.text()).toContain('权限管理')
    expect(menu.text()).toContain('删除')

    await menu.findAll('[role="menuitem"]')[0].trigger('click')
    expect(wrapper.get('[data-testid="knowledge-rename-panel"]').text()).toContain('重命名')
    await wrapper.get('button[aria-label="关闭重命名"]').trigger('click')

    await wrapper.get('button[aria-label="集团制度知识库操作菜单"]').trigger('click')
    await wrapper.get('[role="menu"]').findAll('[role="menuitem"]')[1].trigger('click')
    expect(wrapper.get('[role="dialog"]').text()).toContain('权限管理')
    expect(wrapper.get('[role="dialog"]').text()).toContain('添加成员')
    expect(wrapper.get('[role="dialog"]').text()).toContain('管理层')
    expect(wrapper.get('[role="dialog"]').text()).not.toContain('单独设置')
    expect(wrapper.get('[role="dialog"]').text()).not.toContain('权限继承方式')
    expect(wrapper.find('input[aria-label="继承上级权限"]').exists()).toBe(false)
    expect(wrapper.get('button[aria-label="添加成员"]').attributes()).not.toHaveProperty('disabled')
    expect(wrapper.find('button[aria-label="管理层权限"]').exists()).toBe(false)
    expect(wrapper.get('button[aria-label="移除管理层直接设置"]').attributes()).not.toHaveProperty('disabled')
    await wrapper.get('button[aria-label="添加成员"]').trigger('click')
    expect(wrapper.get('[data-testid="add-member-dialog"]').text()).toContain('已选：150个')
  })

  it('inherits parent permissions for folders and lets administrators break inheritance', async () => {
    await wrapper.findAll('[data-testid="knowledge-kb-row"]')[0].trigger('click')
    await wrapper.get('button[aria-label="人事制度操作菜单"]').trigger('click')
    await wrapper.get('[role="menu"]').findAll('[role="menuitem"]').find((item) => item.text().includes('权限'))!.trigger('click')

    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.text()).toContain('权限管理')
    expect(dialog.text()).not.toContain('权限设置 - 人事制度')
    const inheritParent = dialog.get('input[aria-label="继承上级权限"]')
    expect((inheritParent.element as HTMLInputElement).checked).toBe(true)
    expect(dialog.text()).toContain('来自上级')
    expect(dialog.text()).toContain('管理层')
    expect(dialog.find('button[aria-label="管理层权限"]').exists()).toBe(false)
    expect(dialog.text()).toContain('人力资源中心')
    const directMember = dialog.findAll('.member-area li').find((item) => item.text().includes('人力资源中心'))!
    expect(directMember.text()).toContain('直接设置')
    expect(directMember.text()).not.toContain('来自上级')
    expect(directMember.find('button[aria-label="移除人力资源中心直接设置"]').exists()).toBe(true)
    expect(dialog.text()).not.toContain('下载权限')

    await inheritParent.setValue(false)
    expect((inheritParent.element as HTMLInputElement).checked).toBe(false)
    const updatedDialog = wrapper.get('[role="dialog"]')
    expect(updatedDialog.text()).not.toContain('来自上级')
    expect(updatedDialog.text()).not.toContain('管理层')
    expect(updatedDialog.text()).toContain('人力资源中心')
    expect(updatedDialog.get('button[aria-label="添加成员"]').attributes()).not.toHaveProperty('disabled')
    await updatedDialog.get('button[type="submit"]').trigger('submit')
    expect(wrapper.get('[data-testid="permission-impact-dialog"]').text()).toContain('影响')
    expect(wrapper.get('[data-testid="permission-impact-dialog"]').text()).toContain('停止继承上级权限')
    expect(wrapper.get('[data-testid="permission-impact-dialog"]').text()).not.toContain('下载权限')
  })

  it('allows an inherited member to be selected again while keeping the dual-source row read-only', async () => {
    await wrapper.findAll('[data-testid="knowledge-kb-row"]')[0].trigger('click')
    await wrapper.get('button[aria-label="人事制度操作菜单"]').trigger('click')
    await wrapper.get('[role="menu"]').findAll('[role="menuitem"]').find((item) => item.text().includes('权限'))!.trigger('click')

    await wrapper.get('button[aria-label="添加成员"]').trigger('click')
    const inheritedOption = wrapper.get('button[aria-label="选择管理层"]')
    expect(inheritedOption.attributes()).not.toHaveProperty('disabled')
    await inheritedOption.trigger('click')
    await wrapper.get('[data-testid="add-member-dialog"]').findAll('button').find((button) => button.text() === '确定')!.trigger('click')

    const dualSourceRow = wrapper.findAll('.member-area li').find((item) => item.text().includes('管理层'))!
    expect(dualSourceRow.text()).toContain('来自上级')
    expect(dualSourceRow.text()).toContain('直接设置')
    expect(dualSourceRow.find('button[aria-label="管理层权限"]').exists()).toBe(false)
    expect(dualSourceRow.find('button[aria-label="移除管理层直接设置"]').exists()).toBe(false)
  })

  it('supports transactional member picking, search and impact confirmation', async () => {
    await wrapper.get('button[aria-label="集团制度知识库操作菜单"]').trigger('click')
    await wrapper.get('[role="menu"]').findAll('[role="menuitem"]')[1].trigger('click')

    const permission = wrapper.get('.permission-form')
    const memberSearch = permission.get('input[aria-label="搜索部门/人员..."]')
    await memberSearch.setValue('数字')
    await flushPromises()
    expect((memberSearch.element as HTMLInputElement).value).toBe('数字')
    expect(wrapper.get('.permission-form').text()).toContain('数字营销中心')
    expect(wrapper.get('.permission-form').text()).not.toContain('团购销售部')
    await permission.get('input[aria-label="搜索部门/人员..."]').setValue('')

    await permission.get('button[aria-label="添加成员"]').trigger('click')
    const picker = wrapper.get('[data-testid="add-member-dialog"]')
    await picker.get('button[aria-label="选择仓储部"]').trigger('click')
    expect(wrapper.get('[data-testid="add-member-dialog"]').text()).toContain('已选：151个')
    await picker.findAll('button').find((button) => button.text() === '取消')!.trigger('click')
    expect(wrapper.get('.permission-form').text()).not.toContain('仓储部')

    await permission.get('button[aria-label="添加成员"]').trigger('click')
    const reopenedPicker = wrapper.get('[data-testid="add-member-dialog"]')
    await reopenedPicker.get('button[aria-label="选择仓储部"]').trigger('click')
    await reopenedPicker.findAll('button').find((button) => button.text() === '确定')!.trigger('click')
    expect(wrapper.get('.permission-form').text()).toContain('仓储部')

    await permission.get('button[type="submit"]').trigger('submit')
    expect(wrapper.get('[data-testid="permission-impact-dialog"]').text()).toContain(
      '本次变更将影响128个子资源的权限',
    )
    expect(wrapper.get('[data-testid="permission-impact-dialog"]').text()).toContain('可查看对象：11个')
    expect(wrapper.get('[data-testid="permission-impact-dialog"]').text()).not.toContain('下载权限')
    await wrapper.get('button[aria-label="关闭影响确认"]').trigger('click')
    expect(wrapper.find('[data-testid="permission-impact-dialog"]').exists()).toBe(false)
    expect(wrapper.find('.permission-form').exists()).toBe(true)
  })

  it('rolls back main-dialog edits on cancel and persists only after final confirmation without standalone markers', async () => {
    await wrapper.get('button[aria-label="集团制度知识库操作菜单"]').trigger('click')
    await wrapper.get('[role="menu"]').findAll('[role="menuitem"]')[1].trigger('click')
    await wrapper.get('button[aria-label="移除管理层直接设置"]').trigger('click')
    expect(wrapper.find('button[aria-label="移除管理层直接设置"]').exists()).toBe(false)
    await wrapper.get('.permission-form').findAll('button').find((button) => button.text() === '取消')!.trigger('click')

    await wrapper.get('button[aria-label="集团制度知识库操作菜单"]').trigger('click')
    await wrapper.get('[role="menu"]').findAll('[role="menuitem"]')[1].trigger('click')
    expect(wrapper.get('.permission-form').text()).toContain('管理层')
    await wrapper.get('.permission-form').get('button[type="submit"]').trigger('submit')
    await wrapper.get('[data-testid="permission-impact-dialog"] button.button.primary').trigger('click')
    expect(wrapper.find('.permission-form').exists()).toBe(false)

    await wrapper.get('button[aria-label="展开侧栏"]').trigger('click')
    expect(wrapper.get('[data-testid="knowledge-sidebar"]').find('[aria-label="已单独设置权限"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="knowledge-main-pane"] [aria-label="已单独设置权限"]').exists()).toBe(false)
  })

  it('places a row action menu above a trigger near the viewport bottom so it remains visible', async () => {
    const trigger = wrapper.get('button[aria-label="集团制度知识库操作菜单"]')
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 720 })
    Object.defineProperty(trigger.element, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ x: 900, y: 690, top: 690, right: 930, bottom: 710, left: 900, width: 30, height: 20, toJSON: () => ({}) }),
    })

    await trigger.trigger('click')
    const menu = wrapper.get('[role="menu"]')
    expect(menu.attributes('data-placement')).toBe('top')
    expect(menu.attributes('style')).toContain('position: fixed')
  })

  it('uses a right-side Q&A panel and supports deterministic local chat', async () => {
    await wrapper.get('button[aria-label="小智问答"]').trigger('click')
    const panel = wrapper.get('[data-testid="knowledge-qa-panel"]')
    expect(panel.text()).toContain('内容由 AI 生成，请核实重要信息')
    expect(wrapper.find('button[aria-label="小智问答"]').exists()).toBe(false)

    await panel.get('textarea[placeholder="输入你的问题..."]').setValue('集团制度知识库里有什么？')
    await panel.get('button[aria-label="发送"]').trigger('click')
    await flushPromises()
    expect(panel.text()).toContain('集团制度知识库里有什么？')
    expect(panel.text()).toContain('参考 1 篇资料')
  })

  it('navigates knowledge base folders recursively and previews a local file', async () => {
    await wrapper.findAll('[data-testid="knowledge-kb-row"]')[0].trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="knowledge-breadcrumb"]').text()).toContain('全部知识库')
    expect(wrapper.get('[data-testid="knowledge-breadcrumb"]').text()).toContain('集团制度知识库')
    expect(wrapper.get('[data-testid="knowledge-node-row"]').text()).toContain('人事制度')

    await wrapper.findAll('[data-testid="knowledge-node-row"]')[0].trigger('click')
    expect(wrapper.get('[data-testid="knowledge-breadcrumb"]').text()).toContain('人事制度')
    expect(wrapper.get('[data-testid="knowledge-node-row"]').text()).toContain('考勤与休假')

    await wrapper.findAll('[data-testid="knowledge-node-row"]')[0].trigger('click')
    expect(wrapper.get('[data-testid="knowledge-breadcrumb"]').text()).toContain('考勤与休假')
    expect(wrapper.findAll('[data-testid="knowledge-node-row"]')[0].text()).toContain('考勤管理制度_v3.pdf')

    await wrapper.findAll('[data-testid="knowledge-node-row"]')[0].trigger('click')
    expect(wrapper.get('[data-testid="knowledge-file-preview"]').text()).toContain('考勤管理制度_v3.pdf')
    expect(wrapper.get('[data-testid="knowledge-file-preview"]').text()).toContain('本地 mock 数据')
  })

  it('creates a folder in the current local mock location', async () => {
    await wrapper.findAll('[data-testid="knowledge-kb-row"]')[0].trigger('click')
    await wrapper.get('button[aria-label="新建文件夹"]').trigger('click')
    const dialog = wrapper.get('[role="dialog"]')
    await dialog.get('#folder-name').setValue('本地新增目录')
    await flushPromises()
    await wrapper.get('[role="dialog"] form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-testid="knowledge-main-pane"]').text()).toContain('本地新增目录')
  })
})
