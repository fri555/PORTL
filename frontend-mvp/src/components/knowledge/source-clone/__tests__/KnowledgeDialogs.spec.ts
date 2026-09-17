import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import KnowledgeDialogs from '../KnowledgeDialogs.vue'
import type { SourceKnowledgeBase } from '@/types/knowledge-source'

const destinations = [
  { id: 'kb-root', name: '集团制度知识库' },
  { id: 'folder-hr', name: '集团制度知识库 / 人事制度' },
]

function target(id: string, name: string): SourceKnowledgeBase {
  return { id, name, owner: '测试用户', createdAt: '2026-09-17', space: 'public', nodes: [] }
}

function mountUpload(uploadTarget: SourceKnowledgeBase | null = null) {
  return mount(KnowledgeDialogs, {
    props: { kind: 'upload', target: uploadTarget, destinations },
    global: { stubs: { Teleport: true } },
  })
}

function file(name: string, size = 12) {
  return new File([new Uint8Array(size)], name, { type: 'application/octet-stream', lastModified: 1 })
}

describe('KnowledgeDialogs upload', () => {
  it('requires a destination and files before enabling confirmation', async () => {
    const wrapper = mountUpload()

    expect(wrapper.get('.dialog-surface--upload').attributes('data-upload-layout')).toBe('production')
    expect(wrapper.get('#upload-target').attributes('aria-required')).toBe('true')
    expect((wrapper.get('#upload-target').element as HTMLSelectElement).value).toBe('')
    expect(wrapper.text()).toContain('请选择知识库或文件夹')
    expect(wrapper.text()).toContain('暂无本地文件')
    expect(wrapper.text()).toContain('请在上方点击、拖拽或粘贴文件')
    expect(wrapper.get('input[aria-label="按月报模式解析"]').element).toBeTruthy()
    expect(wrapper.text()).toContain('仅对Excel文件生效')
    expect(wrapper.get('input[aria-label="按月报模式解析"]').attributes()).toHaveProperty('disabled')
    expect(wrapper.get('button[type="submit"]').attributes()).toHaveProperty('disabled')

    await wrapper.get('#upload-target').setValue('kb-root')
    expect(wrapper.get('button[type="submit"]').attributes()).toHaveProperty('disabled')
  })

  it('accepts valid selected files, deduplicates them and allows individual removal', async () => {
    const wrapper = mountUpload(target('kb-root', '集团制度知识库'))
    const input = wrapper.get('input[type="file"]')
    const report = file('月报.pdf', 2048)
    Object.defineProperty(input.element, 'files', { configurable: true, value: [report, report] })
    await input.trigger('change')

    expect(wrapper.findAll('[data-testid="upload-file-row"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('月报.pdf')
    expect(wrapper.text()).toContain('2 KB')
    expect(wrapper.text()).toContain('可上传')
    expect(wrapper.text()).toContain('已忽略 1 个重复文件')
    expect(wrapper.get('button[type="submit"]').attributes()).not.toHaveProperty('disabled')

    await wrapper.get('button[aria-label="移除文件 月报.pdf"]').trigger('click')
    expect(wrapper.findAll('[data-testid="upload-file-row"]')).toHaveLength(0)
    expect(wrapper.get('button[type="submit"]').attributes()).toHaveProperty('disabled')
  })

  it('supports dropped files and reports unsupported and oversized files inline', async () => {
    const wrapper = mountUpload(target('folder-hr', '人事制度'))
    const valid = file('制度.docx')
    const unsupported = file('海报.png')
    const oversized = file('大文件.pdf', 50 * 1024 * 1024 + 1)

    await wrapper.get('.drop-zone').trigger('drop', {
      dataTransfer: { files: [valid, unsupported, oversized] },
    })

    expect(wrapper.findAll('[data-testid="upload-file-row"]')).toHaveLength(1)
    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toContain('海报.png')
    expect(alert.text()).toContain('不支持的文件格式')
    expect(alert.text()).toContain('大文件.pdf')
    expect(alert.text()).toContain('超过 50MB')
  })

  it('emits the selected destination together with pasted files', async () => {
    const wrapper = mountUpload()
    await wrapper.get('#upload-target').setValue('folder-hr')
    await wrapper.get('.dialog-surface--upload').trigger('paste', {
      clipboardData: { files: [file('制度.md')] },
    })
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('upload')?.[0]?.[0]).toHaveLength(1)
    expect(wrapper.emitted('upload')?.[0]?.[1]).toBe('folder-hr')
    expect(wrapper.emitted('upload')?.[0]?.[2]).toEqual({ monthlyReport: false })
  })

  it('enables monthly parsing only when the batch contains Excel and submits the option', async () => {
    const wrapper = mountUpload(target('kb-root', '集团制度知识库'))
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [file('九月月报.xlsx'), file('经营汇报.pptx')] })
    await input.trigger('change')

    const checkbox = wrapper.get('input[aria-label="按月报模式解析"]')
    expect(checkbox.attributes()).not.toHaveProperty('disabled')
    await checkbox.setValue(true)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('upload')?.[0]?.[2]).toEqual({ monthlyReport: true })
  })
})
