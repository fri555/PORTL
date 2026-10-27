import { beforeEach, describe, expect, it } from 'vitest'
import { listVideoTasks, saveVideoTask, removeVideoTask } from '../useVideoPrototype'
import type { VideoTask } from '@/types/video-generation'

const task: VideoTask = { id: 'test-1', operator: 'storyboard', name: '运动鞋分镜', status: 'processing', createdAt: '2026-10-21T10:00:00.000Z', input: { videoUrl: 'https://example.com/shoes.mp4', minDuration: 4, maxDuration: 14 } }
describe('video prototype task recovery', () => {
  beforeEach(() => localStorage.clear())
  it('recovers task inputs and completion changes without duplicating a task', () => {
    saveVideoTask(task)
    saveVideoTask({ ...task, status: 'completed' })
    const tasks = listVideoTasks()
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.status).toBe('completed')
    expect(tasks[0]?.input.videoUrl).toBe('https://example.com/shoes.mp4')
    expect(tasks[0]?.input.minDuration).toBe(4)
  })
  it('removes only the chosen task across capabilities', () => {
    saveVideoTask(task)
    saveVideoTask({ ...task, id: 'test-2', operator: 'prompt-reverse' })
    removeVideoTask('test-1')
    expect(listVideoTasks().map(item => item.id)).toEqual(['test-2'])
  })
  it('ignores malformed stored entries so task lists remain usable', () => {
    localStorage.setItem('tianma-video-prototype-v1', JSON.stringify([null, { id: 'bad' }, task]))
    expect(listVideoTasks()).toEqual([task])
    localStorage.setItem('tianma-video-prototype-v1', 'broken-json')
    expect(listVideoTasks()).toEqual([])
  })
})
