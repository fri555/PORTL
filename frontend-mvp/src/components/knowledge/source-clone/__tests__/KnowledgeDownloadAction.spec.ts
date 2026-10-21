import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import KnowledgeDownloadAction from '../KnowledgeDownloadAction.vue'

describe('knowledge preview download permissions', () => {
  it('keeps the download action hidden for preview-only access, including after a downgrade', async () => {
    const wrapper = mount(KnowledgeDownloadAction, { props: { role: 'DOWNLOADER', downloadUrl: '/files/policy.pdf' } })
    expect(wrapper.get('a[download]').attributes('href')).toContain('/files/policy.pdf')
    await wrapper.setProps({ role: 'READER' })
    expect(wrapper.find('[aria-label="下载文件"]').exists()).toBe(false)
  })

  it('disables downloads when no file is available or the URL is unsafe', async () => {
    const wrapper = mount(KnowledgeDownloadAction, { props: { role: 'DOWNLOADER' } })
    expect(wrapper.get('button[aria-label="下载文件"]').attributes()).toHaveProperty('disabled')
    expect(wrapper.get('button').attributes('title')).toBe('文件暂不可下载')
    await wrapper.setProps({ downloadUrl: 'javascript:alert(1)' })
    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.get('button').attributes()).toHaveProperty('disabled')
  })

  it('fails closed when the current permission is unavailable', () => {
    const wrapper = mount(KnowledgeDownloadAction)
    expect(wrapper.find('[aria-label="下载文件"]').exists()).toBe(false)
  })
})
