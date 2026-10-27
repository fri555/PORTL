import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import VideoGenerationView from '../VideoGenerationView.vue'
import { listVideoTasks } from '@/composables/useVideoPrototype'

const storageKey = 'tianma-video-prototype-v1'
const speechInput = { text: '欢迎来到天马智擎。\n今天，开始新的创作。', speaker: 'zh_female_vv_uranus_bigtts', format: 'mp3', sampleRate: 24000, bitRate: 64000, speechRate: 0, loudnessRate: 0, enableSubtitle: true, prototypeDemo: true }
const storedTask = (input = speechInput) => ({ id: 'speech-1', operator: 'speech-synthesis', name: '新品发布配音', status: 'completed', createdAt: '2026-10-26T02:00:00Z', input })
const mounted: ReturnType<typeof mount>[] = []
async function open(path = '/video-gen/capability-square') {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/video-gen/:capability', component: VideoGenerationView }] })
  await router.push(path); await router.isReady()
  const wrapper = mount(VideoGenerationView, { global: { plugins: [router] } })
  mounted.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}
describe('speech synthesis prototype', () => {
  beforeEach(() => {
    localStorage.clear()
    // jsdom has no native media playback. Real component lifecycle remains active.
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).endsWith('/manifest.json')) return new Response(JSON.stringify({
        text: '这是预置示例。',
        files: { mp3: { sampleRate: 24000, channels: 1, duration: 15.29 }, pcm: { sampleRate: 24000, channels: 1, bitDepth: 16, duration: 15.29 } },
        subtitles: [{ index: 1, start: 0, end: 3.5, text: '这是预置示例。' }],
      }), { headers: { 'Content-Type': 'application/json' } })
      return new Response('', { status: 404 })
    }))
  })
  afterEach(() => { mounted.splice(0).forEach(wrapper => wrapper.unmount()); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

  // Catches routing speech to the generic prompt form, or saving blank speech drafts.
  it('opens named configuration directly and rejects blank name or text without storing tasks', async () => {
    const { wrapper, router } = await open()
    await wrapper.get('[data-testid="capability-speech-synthesis"]').trigger('click'); await flushPromises()
    await wrapper.get('[data-testid="new-task"]').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.query.view).toBe('config')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(listVideoTasks()).toEqual([])
    await wrapper.get('input[aria-label="任务名称"]').setValue('   ')
    await wrapper.get('textarea[aria-label="合成文本"]').setValue('你好。')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[role="alert"]').text()).toContain('任务名称')
    await wrapper.get('input[aria-label="任务名称"]').setValue('产品配音')
    await wrapper.get('textarea[aria-label="合成文本"]').setValue(' \n ')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[role="alert"]').text()).toContain('合成文本')
    expect(listVideoTasks()).toEqual([])
  })

  // Catches hidden output settings drifting from the product defaults.
  it('uses fixed MP3 defaults while keeping sample rate and bitrate in advanced settings', async () => {
    localStorage.setItem(storageKey, JSON.stringify([storedTask({ ...speechInput, format: 'ogg_opus', sampleRate: 8000, bitRate: 8000 })]))
    const { wrapper } = await open('/video-gen/speech-synthesis?view=config&id=speech-1')
    expect(wrapper.find('select[aria-label="输出格式"]').exists()).toBe(false)
    await wrapper.get('[data-testid="speech-advanced-toggle"]').trigger('click')
    expect((wrapper.get('select[aria-label="采样率"]').element as HTMLSelectElement).value).toBe('24000')
    expect((wrapper.get('select[aria-label="码率"]').element as HTMLSelectElement).value).toBe('64000')
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(listVideoTasks()).toHaveLength(1)
    expect(listVideoTasks()[0]?.input.format).toBe('mp3')
    expect(listVideoTasks()[0]?.input.bitRate).toBe(64000)
    expect(listVideoTasks()[0]?.input.additions).toBeUndefined()
  })

  // Catches duplicated tasks, name loss on regeneration, and cross-capability task leakage.
  it('creates, completes and copies a task while retaining an unrelated capability', async () => {
    vi.useFakeTimers()
    localStorage.setItem(storageKey, JSON.stringify([{ id: 'story-1', operator: 'storyboard', name: '其他分镜', status: 'completed', createdAt: '2026-10-26T01:00:00Z', input: {} }]))
    const { wrapper, router } = await open('/video-gen/speech-synthesis?view=config&name=语音合成-测试')
    await wrapper.get('input[aria-label="任务名称"]').setValue('新品发布配音')
    await wrapper.get('textarea[aria-label="合成文本"]').setValue(speechInput.text)
    await wrapper.get('form').trigger('submit'); await flushPromises()
    const first = listVideoTasks().find(task => task.operator === 'speech-synthesis')!
    expect(first.name).toBe('新品发布配音')
    expect(first.status).toBe('processing')
    expect(wrapper.text()).toContain('语音合成中')
    expect(wrapper.text()).not.toContain('查看演示结果')
    await vi.advanceTimersByTimeAsync(3000); await flushPromises()
    expect(wrapper.get('audio[aria-label="合成音频播放器"]').attributes('src')).toContain('demo.mp3')
    await wrapper.findAll('.video-breadcrumb button')[1]!.trigger('click'); await flushPromises()
    await wrapper.get('button[aria-label="复制新品发布配音"]').trigger('click'); await flushPromises()
    expect((wrapper.get('input[aria-label="任务名称"]').element as HTMLInputElement).value).toBe('新品发布配音-副本')
    expect((wrapper.get('textarea[aria-label="合成文本"]').element as HTMLTextAreaElement).value).toBe(speechInput.text)
    await wrapper.get('input[aria-label="语速"]').setValue('1.2')
    await wrapper.get('form').trigger('submit'); await flushPromises()
    expect(listVideoTasks().filter(task => task.operator === 'speech-synthesis')).toHaveLength(2)
    expect(listVideoTasks().find(task => task.operator === 'speech-synthesis' && task.id !== first.id)?.input.speechRate).toBe(20)
    expect(listVideoTasks().find(task => task.id === 'story-1')?.name).toBe('其他分镜')
    await vi.advanceTimersByTimeAsync(3000); await flushPromises()
    await router.push('/video-gen/speech-synthesis'); await flushPromises()
    expect(wrapper.get('[data-testid="task-card"]').text()).toContain('Vivi 2.0')
    expect(wrapper.get('[data-testid="task-card"]').text()).toContain('MP3')
    expect(wrapper.text()).not.toContain('其他分镜')
  })

  // Catches showing subtitle downloads when disabled and claiming typed text was synthesized.
  it('shows clearly labeled demo media and gates SRT on the stored subtitle choice', async () => {
    localStorage.setItem(storageKey, JSON.stringify([storedTask({ ...speechInput, sampleRate: 8000 })]))
    const { wrapper, router } = await open('/video-gen/speech-synthesis?view=result&id=speech-1')
    expect(wrapper.text()).not.toContain('原型演示')
    expect(wrapper.find('[data-testid="speech-result-details"]').exists()).toBe(false)
    await wrapper.get('[data-testid="speech-details-toggle"]').trigger('click')
    expect(wrapper.get('[data-testid="speech-input-text"]').text()).toBe(speechInput.text)
    expect(wrapper.get('.audio-title').text()).toContain('24000 Hz')
    expect(wrapper.get('[data-testid="speech-result-details"]').text()).toContain('8000 Hz')
    expect(wrapper.get('[data-testid="speech-result-details"]').text()).toContain(speechInput.text)
    expect(wrapper.find('.subtitle-cues').exists()).toBe(false)
    expect(wrapper.get('[data-testid="speech-subtitle-download"]').attributes('href')).toContain('demo.srt')
    expect(wrapper.find('[data-testid="speech-edit"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="speech-back"]').exists()).toBe(false)
    localStorage.setItem(storageKey, JSON.stringify([storedTask({ ...speechInput, enableSubtitle: false, format: 'pcm' })]))
    await router.push('/video-gen/speech-synthesis?view=result&id=speech-1&refresh=1'); await flushPromises()
    expect(wrapper.find('[data-testid="speech-subtitle-download"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="speech-audio-download"]').attributes('href')).toContain('demo.pcm')
    expect(wrapper.get('audio').attributes('src')).toContain('demo.mp3')
    expect(wrapper.text()).toContain('PCM')
  })

  // Catches summaries ignoring the current name filter or enabling edits during processing.
  it('filters speech task summaries by name and status and protects processing tasks', async () => {
    localStorage.setItem(storageKey, JSON.stringify([storedTask(), { ...storedTask(), id: 'speech-2', name: '活动开场', status: 'processing' }]))
    const { wrapper } = await open('/video-gen/speech-synthesis')
    expect(wrapper.get('button[aria-label="复制活动开场"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button[aria-label="删除活动开场"]').attributes('disabled')).toBeDefined()
    await wrapper.get('input[aria-label="搜索任务"]').setValue('新品')
    expect(wrapper.findAll('[data-testid="task-card"]')).toHaveLength(1)
    await wrapper.get('[data-status="processing"]').trigger('click')
    expect(wrapper.findAll('[data-testid="task-card"]')).toHaveLength(0)
  })

  // Catches voice filters applying only visual labels and fabricated voice-specific previews.
  it('searches real voice options and marks unavailable auditions honestly', async () => {
    const { wrapper } = await open('/video-gen/speech-synthesis?view=config&name=音色测试')
    await wrapper.get('input[aria-label="搜索音色"]').setValue('云舟')
    expect(wrapper.findAll('[data-testid="speech-voice"]')).toHaveLength(1)
    await wrapper.get('[data-testid="speech-voice"]').trigger('click')
    expect(wrapper.get('[data-testid="speech-selected-voice"]').text()).toContain('云舟')
    expect(wrapper.get('button[aria-label="试听云舟"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="预置音色"]').attributes('class')).toContain('voice-grid')
  })
})
