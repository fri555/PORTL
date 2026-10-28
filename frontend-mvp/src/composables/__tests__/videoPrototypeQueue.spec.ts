import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { advancePrototypeVideoQueue, enqueuePrototypeVideoTask, listVideoTasks, saveVideoTask, updateQueuedPrototypeVideoTask } from '../useVideoPrototype'
import type { VideoTask } from '@/types/video-generation'

const task = (id: string): VideoTask => ({ id, operator: 'speech-synthesis', name: id, status: 'queued', createdAt: new Date().toISOString(), input: { text: id, prototypeDemo: true } })
describe('prototype task queue boundaries', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime('2026-10-28T02:00:00Z'); localStorage.clear() })
  afterEach(() => { vi.useRealTimers() })

  it('preserves queued and timeout records alongside legacy tasks', () => {
    saveVideoTask(task('queued'))
    saveVideoTask({ ...task('timeout'), status: 'timeout' })
    expect(listVideoTasks().map(item => item.status)).toEqual(['timeout', 'queued'])
  })
  it('starts one task and leaves the next editable without a fabricated execution time', () => {
    enqueuePrototypeVideoTask(task('first'))
    enqueuePrototypeVideoTask(task('second'))
    expect(listVideoTasks().find(item => item.id === 'first')).toMatchObject({ status: 'processing', startedAt: '2026-10-28T02:00:00.000Z' })
    expect(listVideoTasks().find(item => item.id === 'second')).toMatchObject({ status: 'queued', startedAt: null })
  })
  it('edits a queued task without duplicating it or changing its queue position', () => {
    enqueuePrototypeVideoTask(task('first')); enqueuePrototypeVideoTask(task('second')); enqueuePrototypeVideoTask(task('third'))
    const previous = listVideoTasks().find(item => item.id === 'second')!
    updateQueuedPrototypeVideoTask(previous.id, previous.revision, '新名称', { text: '新文案' })
    expect(listVideoTasks()).toHaveLength(3)
    const updated = listVideoTasks().find(item => item.id === 'second')!
    expect(updated).toMatchObject({ id: previous.id, name: '新名称', input: { text: '新文案' }, createdAt: previous.createdAt, prototypeQueue: previous.prototypeQueue, startedAt: null, revision: (previous.revision ?? 0) + 1 })
    expect(updated.prototypeQueue?.order).toBe(previous.prototypeQueue?.order)
    vi.advanceTimersByTime(3000); advancePrototypeVideoQueue()
    expect(listVideoTasks().find(item => item.id === 'second')?.status).toBe('processing')
    expect(listVideoTasks().find(item => item.id === 'third')?.status).toBe('queued')
  })
  it('rejects stale edits when execution starts before save, preserving the execution snapshot', () => {
    enqueuePrototypeVideoTask(task('first')); enqueuePrototypeVideoTask(task('second'))
    const previous = listVideoTasks().find(item => item.id === 'second')!
    vi.advanceTimersByTime(3000)
    expect(() => updateQueuedPrototypeVideoTask('second', previous.revision, '覆盖名称', { text: '覆盖内容' })).toThrow('任务已开始执行')
    expect(listVideoTasks().find(item => item.id === 'second')).toMatchObject({ name: 'second', input: { text: 'second' }, status: 'processing' })
  })
  it('rejects stale revisions when another editor has already saved', () => {
    enqueuePrototypeVideoTask(task('first')); enqueuePrototypeVideoTask(task('second'))
    const previous = listVideoTasks().find(item => item.id === 'second')!
    updateQueuedPrototypeVideoTask('second', previous.revision, '新版本', { text: '新版本' })
    expect(() => updateQueuedPrototypeVideoTask('second', previous.revision, '旧版本', { text: '旧版本' })).toThrow()
    expect(listVideoTasks().find(item => item.id === 'second')?.name).toBe('新版本')
  })
  it('recovers elapsed demo work after returning without changing original start times', () => {
    enqueuePrototypeVideoTask(task('first')); enqueuePrototypeVideoTask(task('second'))
    vi.advanceTimersByTime(10000); advancePrototypeVideoQueue()
    const first = listVideoTasks().find(item => item.id === 'first')!
    const second = listVideoTasks().find(item => item.id === 'second')!
    expect(first.status).toBe('completed'); expect(second.status).toBe('completed')
    expect(first.startedAt).toBe('2026-10-28T02:00:00.000Z')
    expect(second.startedAt).toBe('2026-10-28T02:00:03.000Z')
    advancePrototypeVideoQueue()
    expect(listVideoTasks().find(item => item.id === 'second')?.startedAt).toBe(second.startedAt)
  })
})
