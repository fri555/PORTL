import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SpeechSynthesisConfig from '../SpeechSynthesisConfig.vue'
import SpeechSynthesisResult from '../SpeechSynthesisResult.vue'

describe('speech configuration validation recovery', () => {
  it('shows the subtitle switch without secondary helper copy', () => {
    const wrapper = mount(SpeechSynthesisConfig, {
      props: { initialName: '字幕配置', initialData: { text: '字幕测试。' } },
    })
    expect((wrapper.get('input[aria-label="同时生成字幕"]').element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.text()).not.toContain('平台根据字幕时间轴生成 SRT')
  })

  it('preserves saved MP3 quality settings when editing a queued task', async () => {
    const wrapper = mount(SpeechSynthesisConfig, {
      props: {
        initialName: '排队配音',
        initialData: { text: '保留已保存的音质。', format: 'mp3', sampleRate: 44100, bitRate: 160000 },
        queued: true,
      },
    })
    await wrapper.get('[data-testid="speech-advanced-toggle"]').trigger('click')
    expect((wrapper.get('select[aria-label="采样率"]').element as HTMLSelectElement).value).toBe('44100')
    expect((wrapper.get('select[aria-label="码率"]').element as HTMLSelectElement).value).toBe('160000')

    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({ format: 'mp3', sampleRate: 44100, bitRate: 160000 })
  })

  it('shows a format migration notice only for queued legacy non-MP3 tasks', () => {
    const cases = [
      { format: 'ogg_opus', queued: true, notice: true },
      { format: 'mp3', queued: true, notice: false },
      { format: 'ogg_opus', queued: false, notice: false },
      { format: undefined, queued: true, notice: false },
    ]
    for (const item of cases) {
      const wrapper = mount(SpeechSynthesisConfig, {
        props: { initialName: '历史配音', initialData: { text: '原任务文本。', format: item.format }, queued: item.queued },
      })
      const notice = wrapper.find('[role="note"]')
      expect(notice.exists()).toBe(item.notice)
      if (item.notice) {
        expect(notice.text()).toContain('MP3、24 kHz、64 kbps')
        expect(notice.text()).toContain('保存前原任务配置不变')
      }
      wrapper.unmount()
    }
  })

  it('clears empty-result voice filters without changing the selected voice', async () => {
    const wrapper = mount(SpeechSynthesisConfig, {
      props: {
        initialName: '音色筛选',
        initialData: { text: '筛选音色。', speaker: 'zh_male_m191_uranus_bigtts' },
      },
    })
    await wrapper.get('input[aria-label="搜索音色"]').setValue('无此音色')
    await wrapper.get('select[aria-label="音色语种"]').setValue('中文')
    await wrapper.get('select[aria-label="音色风格"]').setValue('解说')
    expect(wrapper.findAll('[data-testid="speech-voice"]')).toHaveLength(0)

    await wrapper.get('button[aria-label="清空音色筛选"]').trigger('click')
    expect((wrapper.get('input[aria-label="搜索音色"]').element as HTMLInputElement).value).toBe('')
    expect((wrapper.get('select[aria-label="音色语种"]').element as HTMLSelectElement).value).toBe('')
    expect((wrapper.get('select[aria-label="音色风格"]').element as HTMLSelectElement).value).toBe('')
    expect(wrapper.findAll('[data-testid="speech-voice"]')).toHaveLength(6)
    expect(wrapper.get('[data-testid="speech-voice"][aria-pressed="true"]').text()).toContain('云舟')
  })

  // Catches an error message that leaves keyboard users at the bottom of the form.
  it('focuses the first invalid field and then the text field after the name is corrected', async () => {
    const wrapper = mount(SpeechSynthesisConfig, { props: { initialName: '   ' }, attachTo: document.body })
    try {
      const name = wrapper.get('input[aria-label="任务名称"]')
      const text = wrapper.get('textarea[aria-label="合成文本"]')
      const submit = wrapper.get('[data-testid="speech-submit"]')
      ;(submit.element as HTMLButtonElement).focus()
      await wrapper.get('form').trigger('submit')
      expect(document.activeElement).toBe(name.element)
      expect(name.attributes('aria-invalid')).toBe('true')
      expect(wrapper.emitted('submit')).toBeUndefined()

      await name.setValue('活动开场配音')
      ;(submit.element as HTMLButtonElement).focus()
      await wrapper.get('form').trigger('submit')
      expect(document.activeElement).toBe(text.element)
      expect(text.attributes('aria-invalid')).toBe('true')
      expect(wrapper.emitted('submit')).toBeUndefined()
    } finally { wrapper.unmount() }
  })

  // Catches the visible controls drifting from the relative percentage fields required by the API.
  it('keeps loudness and speed sliders synchronized with their numeric inputs and submitted rates', async () => {
    const wrapper = mount(SpeechSynthesisConfig, {
      props: {
        initialName: '活动开场配音',
        initialData: { text: '欢迎参加活动。', loudnessRate: 23, speechRate: -20 },
      },
    })
    const loudness = wrapper.get('input[aria-label="音量"]')
    const loudnessSlider = wrapper.get('input[aria-label="音量滑块"]')
    const speed = wrapper.get('input[aria-label="语速"]')
    const speedSlider = wrapper.get('input[aria-label="语速滑块"]')

    expect((loudness.element as HTMLInputElement).valueAsNumber).toBe(1.23)
    expect((loudnessSlider.element as HTMLInputElement).valueAsNumber).toBe(1.23)
    expect((speed.element as HTMLInputElement).valueAsNumber).toBe(80)
    expect((speedSlider.element as HTMLInputElement).valueAsNumber).toBe(80)

    await loudnessSlider.setValue('1.37')
    await speed.setValue('125')
    expect((loudness.element as HTMLInputElement).valueAsNumber).toBe(1.37)
    expect((speedSlider.element as HTMLInputElement).valueAsNumber).toBe(125)

    await wrapper.get('form').trigger('submit')
    const submitted = wrapper.emitted('submit')?.[0]?.[0] as { loudnessRate: number; speechRate: number }
    expect(submitted.loudnessRate).toBe(37)
    expect(submitted.speechRate).toBe(25)
  })

  // Catches browser-entered values escaping the supported provider range or becoming NaN.
  it('normalizes out-of-range and empty parameter input to valid values', async () => {
    const wrapper = mount(SpeechSynthesisConfig, {
      props: { initialName: '边界配音', initialData: { text: '边界测试。' } },
    })
    expect((wrapper.get('input[aria-label="音量"]').element as HTMLInputElement).value).toBe('1.00')
    await wrapper.get('input[aria-label="音量"]').setValue('9')
    await wrapper.get('input[aria-label="语速"]').setValue('10')
    await wrapper.get('form').trigger('submit')
    let submitted = wrapper.emitted('submit')?.at(-1)?.[0] as { loudnessRate: number; speechRate: number }
    expect(submitted.loudnessRate).toBe(100)
    expect(submitted.speechRate).toBe(-50)

    await wrapper.get('input[aria-label="音量"]').setValue('')
    await wrapper.get('input[aria-label="语速"]').setValue('')
    await wrapper.get('form').trigger('submit')
    submitted = wrapper.emitted('submit')?.at(-1)?.[0] as { loudnessRate: number; speechRate: number }
    expect(submitted.loudnessRate).toBe(0)
    expect(submitted.speechRate).toBe(0)
  })

  // Catches queued edits being resubmitted as new work or repeated while a request is in flight.
  it('labels queued edits and prevents duplicate submission while submitting', async () => {
    const queued = mount(SpeechSynthesisConfig, {
      props: { initialName: '排队任务', initialData: { text: '保存这次修改。' }, queued: true },
    })
    expect(queued.get('[data-testid="speech-submit"]').text()).toBe('保存修改')

    const submitting = mount(SpeechSynthesisConfig, {
      props: { initialName: '提交任务', initialData: { text: '不要重复提交。' }, submitting: true },
    })
    const button = submitting.get('[data-testid="speech-submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    await submitting.get('form').trigger('submit')
    expect(submitting.emitted('submit')).toBeUndefined()
  })

  // Catches result details reverting to API offsets instead of the units shown in the form.
  it('shows loudness with two decimals and speed as an integer percentage in result details', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    const wrapper = mount(SpeechSynthesisResult, {
      props: {
        task: {
          id: 'speech-result', operator: 'speech-synthesis', name: '结果单位', status: 'completed', createdAt: '2026-10-27T00:00:00Z',
          input: { text: '结果测试。', speaker: 'zh_female_vv_uranus_bigtts', format: 'mp3', sampleRate: 24000, bitRate: 64000, loudnessRate: 23, speechRate: -20, enableSubtitle: true, prototypeDemo: true },
        },
      },
    })
    await wrapper.get('[data-testid="speech-details-toggle"]').trigger('click')
    const details = wrapper.get('[data-testid="speech-result-details"]').text()
    expect(details).toContain('音量1.23 倍')
    expect(details).toContain('语速80%')
    wrapper.unmount()
    pause.mockRestore()
    vi.unstubAllGlobals()
  })

  it('does not expose demo playback or downloads for unfinished or non-demo results', () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    const baseTask = {
      id: 'speech-gated', operator: 'speech-synthesis' as const, name: '门禁结果', createdAt: '2026-10-27T00:00:00Z',
      input: { text: '结果门禁。', speaker: 'zh_female_vv_uranus_bigtts', format: 'mp3', sampleRate: 24000, bitRate: 64000, loudnessRate: 0, speechRate: 0, enableSubtitle: true, prototypeDemo: true },
    }
    for (const task of [
      { ...baseTask, status: 'queued' as const },
      { ...baseTask, status: 'processing' as const },
      { ...baseTask, status: 'failed' as const },
      { ...baseTask, status: 'completed' as const, input: { ...baseTask.input, prototypeDemo: false } },
    ]) {
      const wrapper = mount(SpeechSynthesisResult, { props: { task } })
      expect(wrapper.text()).toContain('暂无可用的合成结果')
      expect(wrapper.find('audio').exists()).toBe(false)
      expect(wrapper.find('[data-testid="speech-audio-download"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="speech-subtitle-download"]').exists()).toBe(false)
      wrapper.unmount()
    }
    expect(fetch).not.toHaveBeenCalled()
    pause.mockRestore()
    vi.unstubAllGlobals()
  })
})
