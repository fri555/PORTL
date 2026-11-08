import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import VideoGenerateConfig from '../VideoGenerateConfig.vue'

describe('VideoGenerateConfig', () => {
  it('matches the production configuration hierarchy and generates audio by default', async () => {
    const wrapper = mount(VideoGenerateConfig, { props: { initialName: '视频生成-11/03 21:30:00' } })
    expect(wrapper.get('input[aria-label="任务名称"]').element).toHaveProperty(
      'value',
      '视频生成-11/03 21:30:00',
    )
    expect(wrapper.text()).toContain('模型选择')
    expect(wrapper.text()).toContain('生成模式')
    expect(wrapper.text()).toContain('视频描述')
    expect(wrapper.text()).toContain('参考素材')
    expect(wrapper.text()).toContain('输出参数')
    expect((wrapper.get('input[aria-label="生成同步音频"]').element as HTMLInputElement).checked).toBe(
      true,
    )
    await wrapper.get('textarea[aria-label="视频描述"]').setValue('模特在城市街头展示羽绒服')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      model: 'seedance-2.0-mini',
      mode: 'multimodal-reference',
      description: '模特在城市街头展示羽绒服',
      resolution: '480p',
      ratio: '9:16',
      generateAudio: true,
    })
  })

  it('restores the audio choice when a task is copied', () => {
    const wrapper = mount(VideoGenerateConfig, {
      props: {
        initialName: '视频生成（2）',
        initialData: { description: '商品展示', generateAudio: false },
      },
    })
    expect((wrapper.get('input[aria-label="生成同步音频"]').element as HTMLInputElement).checked).toBe(
      false,
    )
  })
})
