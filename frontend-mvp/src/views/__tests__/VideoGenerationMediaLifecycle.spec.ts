import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import VideoGenerationView from '../VideoGenerationView.vue'
import { getDemoElementReplacementInput } from '@/composables/useElementReplacement'
import { listVideoTasks, saveVideoTask } from '@/composables/useVideoPrototype'
import { getLocalVideoPreview, registerLocalVideo, releaseLocalVideo } from '@/components/video-generation/storyboard/local-preview'
import type { VideoTask } from '@/types/video-generation'

const allocatedIds: string[] = []
const wrappers: ReturnType<typeof shallowMount>[] = []
let providerSubmissions = 0

function localVideo(name: string) {
  const url = registerLocalVideo(new File(['video'], name, { type: 'video/mp4' }))
  allocatedIds.push(url)
  return { id: url, kind: 'video' as const, source: 'upload' as const, name, url }
}

function replacementTask(source = localVideo('original.mp4'), result = source): VideoTask {
  return { id: 'replacement-task', name: '元素替换', operator: 'element-replace', status: 'completed',
    createdAt: '2026-10-22T03:00:00.000Z', input: { ...getDemoElementReplacementInput(), sourceVideo: source, resultVideo: result, resultUsesOriginal: true } }
}

async function open(path = '/video-gen/element-replace?view=config&id=replacement-task') {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/video-gen/:capability', component: VideoGenerationView }] })
  await router.push(path)
  await router.isReady()
  const wrapper = shallowMount(VideoGenerationView, { global: { plugins: [router] } })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

describe('video task local media lifecycle', () => {
  beforeEach(() => {
    localStorage.clear()
    providerSubmissions = 0
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn(() => `blob:media-lifecycle-${Math.random()}`)
      static revokeObjectURL = vi.fn()
    })
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const path = String(url)
      const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })
      if (path.endsWith('/connection')) return json({ configured: true, uploadAvailable: true })
      if (path.includes('/media?')) return json({ remoteUrl: 'tos://test-bucket/prepared-media', previewUrl: 'https://files.example.com/prepared-media' })
      if (path.endsWith('/jobs')) {
        providerSubmissions += 1
        const body = JSON.parse(String(init?.body))
        return json({ id: body.requestId, providerTaskId: 'media-lifecycle-provider', status: 'pending', createdAt: '2026-10-26T00:00:00Z', updatedAt: '2026-10-26T00:00:00Z' })
      }
      if (path.includes('/jobs/')) return json({ id: path.split('/').pop(), providerTaskId: 'media-lifecycle-provider', status: 'running', createdAt: '2026-10-26T00:00:00Z', updatedAt: '2026-10-26T00:00:00Z' })
      return new Response('test media bytes', { headers: { 'Content-Type': path.endsWith('.mp4') || path.startsWith('blob:') ? 'video/mp4' : 'image/png' } })
    }))
    vi.spyOn(ElMessage, 'error').mockReturnValue({ close: vi.fn() })
  })
  afterEach(() => {
    wrappers.splice(0).forEach(wrapper => wrapper.unmount())
    allocatedIds.splice(0).forEach(releaseLocalVideo)
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('discards the previous replacement result before persisting a new processing task', async () => {
    const task = replacementTask()
    saveVideoTask(task)
    const { wrapper } = await open()
    wrapper.findComponent({ name: 'ElementReplacementConfig' }).vm.$emit('submit', { ...task.input, sourceVideo: localVideo('new.mp4') })
    await vi.waitFor(() => {
      expect(listVideoTasks()[0]?.status).toBe('processing')
      expect(listVideoTasks()[0]?.remoteJob).toBeUndefined()
    })
    const saved = listVideoTasks()[0]!
    expect(saved.status).toBe('processing')
    expect(saved.input).not.toHaveProperty('resultVideo')
    expect(saved.input).not.toHaveProperty('resultUsesOriginal')
    expect(saved.input.prototypeDemo).toBe(true)
    expect(providerSubmissions).toBe(0)
  })

  it('releases every unused video in the previous task only after an edited task is saved', async () => {
    const task = replacementTask(localVideo('old-source.mp4'), localVideo('old-result.mp4'))
    saveVideoTask(task)
    const { wrapper } = await open()
    const next = localVideo('new.mp4')
    wrapper.findComponent({ name: 'ElementReplacementConfig' }).vm.$emit('submit', { ...task.input, sourceVideo: next })
    await vi.waitFor(() => {
      expect(listVideoTasks()[0]?.status).toBe('processing')
      expect(getLocalVideoPreview(task.input.sourceVideo.url)).toBe('')
    })
    expect(getLocalVideoPreview(task.input.sourceVideo.url)).toBe('')
    expect(getLocalVideoPreview(task.input.resultVideo.url)).toBe('')
    expect(getLocalVideoPreview(next.url)).not.toBe('')
  })

  it('keeps all previous previews and task data if saving an edit fails', async () => {
    const task = replacementTask(localVideo('old-source.mp4'), localVideo('old-result.mp4'))
    saveVideoTask(task)
    const { wrapper, router } = await open()
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota') })
    wrapper.findComponent({ name: 'ElementReplacementConfig' }).vm.$emit('submit', { ...task.input, sourceVideo: localVideo('new.mp4') })
    await vi.waitFor(() => expect(ElMessage.error).toHaveBeenCalledWith(expect.stringContaining('本地任务保存失败')))
    expect(getLocalVideoPreview(task.input.sourceVideo.url)).not.toBe('')
    expect(getLocalVideoPreview(task.input.resultVideo.url)).not.toBe('')
    expect(listVideoTasks()[0]).toEqual(task)
    expect(router.currentRoute.value.query.view).toBe('config')
    expect(providerSubmissions).toBe(0)
  })

  it('releases obsolete results when completing a recovered processing task', async () => {
    const task = replacementTask(localVideo('current-source.mp4'), localVideo('previous-result.mp4'))
    saveVideoTask({ ...task, status: 'processing' })
    const { wrapper } = await open('/video-gen/element-replace?view=processing&id=replacement-task')
    wrapper.findComponent({ name: 'ElementReplacementProcessing' }).vm.$emit('complete')
    await flushPromises()
    expect(getLocalVideoPreview(task.input.resultVideo.url)).toBe('')
    expect(getLocalVideoPreview(task.input.sourceVideo.url)).not.toBe('')
    expect(listVideoTasks()[0]!.input.resultVideo.url).toBe(task.input.sourceVideo.url)
  })

  it.each([
    ['legacy source', (url: string) => ({ videoUrl: url })],
    ['replacement source', (url: string) => ({ sourceVideo: { url } })],
    ['replacement result', (url: string) => ({ resultVideo: { url } })],
    ['nested cross-capability media', (url: string) => ({ clips: [{ video: { url } }] })],
  ])('retains shared previews referenced by another task through %s', async (_name, sharedInput) => {
    const task = replacementTask()
    saveVideoTask(task)
    saveVideoTask({ ...task, id: 'shared-task', operator: 'storyboard', input: sharedInput(task.input.sourceVideo.url) })
    const { wrapper } = await open('/video-gen/element-replace')
    wrapper.findComponent({ name: 'VideoTaskList' }).vm.$emit('remove', task.id)
    await flushPromises()
    expect(getLocalVideoPreview(task.input.sourceVideo.url)).not.toBe('')
    expect(listVideoTasks().map(item => item.id)).toEqual(['shared-task'])
  })

  it('releases an unshared result on deletion while retaining a source used by another capability', async () => {
    const task = replacementTask(localVideo('shared-source.mp4'), localVideo('unshared-result.mp4'))
    saveVideoTask(task)
    saveVideoTask({ ...task, id: 'storyboard-task', operator: 'storyboard', input: { videoUrl: task.input.sourceVideo.url } })
    const { wrapper } = await open('/video-gen/element-replace')
    wrapper.findComponent({ name: 'VideoTaskList' }).vm.$emit('remove', task.id)
    await flushPromises()
    expect(getLocalVideoPreview(task.input.sourceVideo.url)).not.toBe('')
    expect(getLocalVideoPreview(task.input.resultVideo.url)).toBe('')
  })

  it('does not release any media when task deletion fails', async () => {
    const task = replacementTask(localVideo('source.mp4'), localVideo('result.mp4'))
    saveVideoTask(task)
    const { wrapper } = await open('/video-gen/element-replace')
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('unavailable') })
    wrapper.findComponent({ name: 'VideoTaskList' }).vm.$emit('remove', task.id)
    await flushPromises()
    expect(getLocalVideoPreview(task.input.sourceVideo.url)).not.toBe('')
    expect(getLocalVideoPreview(task.input.resultVideo.url)).not.toBe('')
    expect(listVideoTasks()[0]).toEqual(task)
  })
})
