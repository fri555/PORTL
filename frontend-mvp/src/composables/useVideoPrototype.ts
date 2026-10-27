import { ref } from 'vue'
import type { VideoOperator, VideoTask } from '@/types/video-generation'

const STORAGE_KEY = 'tianma-video-prototype-v1'
const operators: VideoOperator[] = ['storyboard', 'prompt-reverse', 'image-generate', 'prompt-generate', 'video-generate', 'element-replace', 'speech-synthesis']
function isTask(value: unknown): value is VideoTask {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<VideoTask>
  return typeof item.id === 'string' && !!item.id && typeof item.name === 'string'
    && operators.includes(item.operator as VideoOperator)
    && ['draft', 'processing', 'completed', 'failed'].includes(item.status ?? '')
    && typeof item.createdAt === 'string' && !!item.input && typeof item.input === 'object' && !Array.isArray(item.input)
}
export function listVideoTasks(): VideoTask[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter(isTask) : []
  } catch { return [] }
}
export function saveVideoTask(task: VideoTask): void {
  if (!isTask(task)) throw new Error('任务数据不完整')
  const tasks = listVideoTasks().filter(item => item.id !== task.id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([task, ...tasks]))
}
export function removeVideoTask(id: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listVideoTasks().filter(item => item.id !== id)))
}
export function useVideoPrototype() {
  const tasks = ref(listVideoTasks())
  const refresh = () => { tasks.value = listVideoTasks() }
  function save(task: VideoTask) { saveVideoTask(task); refresh() }
  function remove(id: string) { removeVideoTask(id); refresh() }
  return { tasks, refresh, save, remove }
}
