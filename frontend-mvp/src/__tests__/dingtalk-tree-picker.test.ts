import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ImportDialog from '@/components/knowledge/source-clone/DingTalkDocumentImport.vue'
import { boundDingTalkIdentity } from '@/components/knowledge/source-clone/dingtalkPrototype'
const wrappers: ReturnType<typeof mount>[] = []
const stubs = {
  ElDialog: { props: ['modelValue'], template: '<section v-if="modelValue"><slot/><slot name="footer"/></section>' },
  ElSelect: { props: ['modelValue'], template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot/></select>' },
  ElOption: { props: ['value', 'label'], template: '<option :value="value">{{ label }}</option>' },
}
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.useRealTimers() })
function dialog(id = 'u_001') {
  const w = mount(ImportDialog, { props: { identity: boundDingTalkIdentity({ id, displayName: '测试用户' }), destinations: [{ id: 'kb-personal-1', name: '我的知识库' }] }, global: { stubs } })
  wrappers.push(w); return w
}
async function button(w: ReturnType<typeof mount>, text: string) {
  const target = w.findAll('button').find(b => b.text() === text)
  expect(target, text).toBeTruthy(); await target!.trigger('click'); await flushPromises()
}
describe('DingTalk checkbox tree picker', () => {
  it('expands nested folders and imports only their concrete documents', async () => {
    vi.useFakeTimers(); const w = dialog()
    await w.get('[aria-label="上传至"]').trigger('click'); await w.get('[aria-label="存放至我的知识库"]').trigger('click'); await button(w, '选择文件')
    expect(w.get('[role="tree"]').text()).toContain('集团制度知识库')
    expect(w.get('[role="tree"]').text()).not.toContain('新员工入职指南')
    await w.get('[aria-label="展开集团制度知识库"]').trigger('click'); await w.get('[aria-label="展开人事制度"]').trigger('click')
    await w.get('input[aria-label="选择人事制度"]').setValue(true)
    expect((w.get('input[aria-label="选择集团制度知识库"]').element as HTMLInputElement).indeterminate).toBe(true)
    await button(w, '确认导入 2 项')
    expect(w.get('[aria-label="已选钉钉文档"]').findAll('article')).toHaveLength(2)
    await button(w, '确认导入'); await vi.advanceTimersByTimeAsync(500)
    const record = w.emitted('complete')![0]![0] as { documents: { id: string }[] }
    expect(record.documents.map(d => d.id)).toEqual(['onboarding', 'attendance'])
  })
  it('shows a half-selected folder after one child is unchecked', async () => {
    const w = dialog(); await button(w, '选择文件')
    await w.get('[aria-label="展开集团制度知识库"]').trigger('click'); await w.get('[aria-label="展开人事制度"]').trigger('click')
    await w.get('input[aria-label="选择人事制度"]').setValue(true)
    await w.get('input[aria-label="选择考勤与休假制度"]').setValue(false)
    expect((w.get('input[aria-label="选择人事制度"]').element as HTMLInputElement).indeterminate).toBe(true)
    await button(w, '确认导入 1 项')
    expect(w.get('[aria-label="已选钉钉文档"]').text()).toContain('新员工入职指南')
    expect(w.get('[aria-label="已选钉钉文档"]').text()).not.toContain('考勤与休假制度')
  })
  it('retains search ancestors and excludes inaccessible documents', async () => {
    const w = dialog('u-personal-demo'); await button(w, '选择文件')
    await w.get('input[aria-label="搜索钉钉文档"]').setValue('入职')
    const tree = w.get('[role="tree"]')
    expect(tree.text()).toContain('集团制度知识库'); expect(tree.text()).toContain('人事制度'); expect(tree.text()).toContain('新员工入职指南')
    await w.get('input[aria-label="搜索钉钉文档"]').setValue('报销')
    expect(w.get('[role="tree"]').findAll('[role="treeitem"]')).toHaveLength(0)
  })
  it('discards draft selections on cancellation', async () => {
    const w = dialog(); await button(w, '选择文件')
    await w.get('input[aria-label="搜索钉钉文档"]').setValue('入职'); await w.get('input[aria-label="选择新员工入职指南"]').setValue(true)
    await w.get('[data-testid="cancel-document-picker"]').trigger('click')
    expect(w.get('[aria-label="已选钉钉文档"]').findAll('article')).toHaveLength(0)
    await button(w, '选择文件')
    expect((w.get('input[aria-label="选择新员工入职指南"]').element as HTMLInputElement).checked).toBe(false)
  })
  it('marks unsupported selections and blocks import', async () => {
    const w = dialog(); await w.get('[aria-label="上传至"]').trigger('click'); await w.get('[aria-label="存放至我的知识库"]').trigger('click'); await button(w, '选择文件')
    await w.get('input[aria-label="搜索钉钉文档"]').setValue('多维表')
    expect(w.get('[role="tree"]').text()).toContain('格式暂不支持')
    await w.get('input[aria-label="选择商品运营多维表"]').setValue(true); await button(w, '确认导入 1 项')
    expect(w.get('[aria-label="已选钉钉文档"]').text()).toContain('暂不支持')
    expect(w.findAll('button').find(b => b.text() === '确认导入')!.attributes('disabled')).toBeDefined()
  })
})
