import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import AnswerCitations from '../AnswerCitations.vue'
import SourceChatDetail from '../SourceChatDetail.vue'
import type { CitationSource } from '@/types/citation'

describe('conversation knowledge-source previews', () => {
  afterEach(() => window.history.replaceState({}, '', '/'))
  it.each([{ role: 'READER', downloadable: false }, { role: 'DOWNLOADER', downloadable: true }])('uses the current $role permission in the active conversation preview', async ({ role, downloadable }) => {
    window.history.replaceState({}, '', `/PORTL/chat/citation-default?permissionRole=${role}`)
    const wrapper = mount(SourceChatDetail, { props: { sessionId: 'citation-default', persistState: false }, global: { stubs: { Teleport: true } } })
    await wrapper.get('[data-source-card="1"]').trigger('click')
    await flushPromises()
    const preview = wrapper.get('[data-testid="citation-preview"]')
    expect(preview.text()).toContain('知识中心使用规范')
    expect(preview.find('[aria-label="下载文件"]').exists()).toBe(downloadable)
    if (downloadable) expect(preview.get('[aria-label="下载文件"]').attributes()).toHaveProperty('disabled')
    wrapper.unmount()
  })
  it('previews a historical source after access becomes preview-only and removes download', async () => {
    const source = { id: 'policy', type: 'knowledge', title: '制度文件', access: 'allowed', permissionRole: 'DOWNLOADER', downloadUrl: '/files/policy.pdf', fragments: [{ id: 'one', location: '第1页', text: '原文预览内容' }] } as CitationSource
    const wrapper = mount(AnswerCitations, { props: { answerId: 'answer', paragraphs: [{ text: '历史回答', citations: [{ sourceId: source.id }] }], sources: [source] }, global: { stubs: { Teleport: true } } })
    await wrapper.get('[data-source-card="1"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="citation-preview"]').text()).toContain('原文预览内容')
    expect(wrapper.get('a[aria-label="下载文件"]').attributes('href')).toContain('/files/policy.pdf')
    await wrapper.setProps({ sources: [{ ...source, permissionRole: 'READER' } as CitationSource] })
    await flushPromises()
    expect(wrapper.get('[data-testid="citation-preview"]').text()).toContain('原文预览内容')
    expect(wrapper.find('[aria-label="下载文件"]').exists()).toBe(false)
    await wrapper.setProps({ sources: [{ ...source, access: 'forbidden' }] })
    await flushPromises()
    expect(wrapper.get('[data-testid="citation-preview"]').text()).not.toContain('原文预览内容')
    expect(wrapper.find('[aria-label="下载文件"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
