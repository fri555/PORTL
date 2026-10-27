import { listVideoTasks } from './useVideoPrototype'
import { getLocalVideoPreview } from '@/components/video-generation/storyboard/local-preview'
import { demoReplacementReferences, demoReplacementVideo } from '@/mock/element-replacement'
import { composeReplacementPrompt } from '@/utils/elementReplacementPrompt'
import type { ElementReplacementInput, ReplacementGroup, ReplacementMedia, ReplacementSettings, ReplacementType } from '@/types/element-replacement'

const types: ReplacementType[] = ['person', 'product', 'background']
export const replacementModels: ReplacementSettings['model'][] = ['seedance-2.0', 'seedance-2.0-fast', 'seedance-2.0-mini']
export const replacementModelLabels: Record<ReplacementSettings['model'], string> = { 'seedance-2.0': 'Seedance 2.0', 'seedance-2.0-fast': 'Seedance 2.0 Fast', 'seedance-2.0-mini': 'Seedance 2.0 Mini' }
export const replacementResolutions: ReplacementSettings['resolution'][] = ['480p', '720p']
export const replacementRatios: ReplacementSettings['ratio'][] = ['adaptive', '16:9', '4:3', '1:1', '3:4', '9:16', '21:9']
const record = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value)
const id = () => `mapping-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
const validDuration = (value: unknown): value is number | null => value === null || (typeof value === 'number' && Number.isInteger(value) && value >= -1)
const validPriority = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value)
const validExecutionExpiry = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 3600 && value <= 259200
function media(value: unknown, kind: ReplacementMedia['kind']): ReplacementMedia | null {
  if (!record(value) || value.kind !== kind || typeof value.url !== 'string') return null
  return { id: typeof value.id === 'string' ? value.id : id(), name: typeof value.name === 'string' ? value.name : kind === 'video' ? '源视频' : '参考图', kind, source: ['upload', 'url', 'material', 'demo'].includes(value.source) ? value.source : 'url', url: value.url, ...(typeof value.remoteUrl === 'string' ? { remoteUrl: value.remoteUrl } : {}), ...(typeof value.poster === 'string' ? { poster: value.poster } : {}), ...(Number.isFinite(value.duration) && value.duration > 0 ? { duration: value.duration } : {}) }
}
export function createElementReplacementInput(initialData?: Record<string, any>): ElementReplacementInput {
  const initial = record(initialData) ? initialData : {}
  const settings = record(initial.settings) ? initial.settings : {}
  const model = replacementModels.includes(settings.model) ? settings.model : 'seedance-2.0-mini'
  const resolution = replacementResolutions.includes(settings.resolution) ? settings.resolution : '720p'
  const groups: ReplacementGroup[] = Array.isArray(initial.groups) ? initial.groups.filter(record).map(group => ({ id: typeof group.id === 'string' ? group.id : id(), description: typeof group.description === 'string' ? group.description : '', reference: media(group.reference, 'image') })) : []
  return {
    replacementType: types.includes(initial.replacementType) ? initial.replacementType : 'person',
    sourceVideo: media(initial.sourceVideo, 'video'),
    groups: groups.length ? groups : [{ id: id(), description: '', reference: null }],
    preservePrompt: typeof initial.preservePrompt === 'string' ? initial.preservePrompt : '保持原视频的动作、镜头和背景',
    audioUrls: Array.isArray(initial.audioUrls) ? initial.audioUrls.filter((value: unknown): value is string => typeof value === 'string') : [],
    settings: {
      model, resolution, ratio: replacementRatios.includes(settings.ratio) ? settings.ratio : 'adaptive',
      generateAudio: typeof settings.generateAudio === 'boolean' ? settings.generateAudio : true,
      duration: validDuration(settings.duration) ? settings.duration : null,
      watermark: typeof settings.watermark === 'boolean' ? settings.watermark : false,
      returnLastFrame: typeof settings.returnLastFrame === 'boolean' ? settings.returnLastFrame : true,
      priority: validPriority(settings.priority) ? settings.priority : 0,
      executionExpiresAfter: validExecutionExpiry(settings.executionExpiresAfter) ? settings.executionExpiresAfter : 172800,
    },
    prototypeDemo: initial.prototypeDemo !== false,
    ...(initial.resultVideo ? { resultVideo: media(initial.resultVideo, 'video') } : {}),
    ...(typeof initial.resultUsesOriginal === 'boolean' ? { resultUsesOriginal: initial.resultUsesOriginal } : {}),
  }
}
export function getReplacementMediaUrl(value: ReplacementMedia | null | undefined): string {
  if (!value || typeof value.url !== 'string') return ''
  const url = value.url.trim()
  if (value.kind === 'video' && url.startsWith('local-video:')) return getLocalVideoPreview(url)
  if (/^https?:\/\//i.test(url)) { try { const parsed = new URL(url); return parsed.hostname && !parsed.username && !parsed.password ? url : '' } catch { return '' } }
  if (/^\/(?!\/)/.test(url) && !/[\\\r\n]/.test(url)) return url
  if (value.kind === 'image' && /^data:image\/(png|jpe?g|webp|svg\+xml)[;,]/i.test(url)) return url
  return ''
}
export function isReplacementRemoteReference(value: string, kind: 'video' | 'image' | 'audio'): boolean {
  if (typeof value !== 'string' || !value || /[\s\\]/.test(value)) return false
  if (kind === 'video' && /^[a-z\d][a-z\d_-]*$/i.test(value)) return true
  if (!/^(https?|tos|asset):\/\//i.test(value)) return false
  try {
    const parsed = new URL(value)
    if (!parsed.hostname || parsed.username || parsed.password) return false
    if (parsed.protocol === 'tos:') return parsed.pathname.length > 1 && /[^/]/.test(parsed.pathname)
    if (parsed.protocol === 'asset:') return !parsed.pathname || parsed.pathname === '/'
    return true
  } catch { return false }
}
function usableMedia(value: ReplacementMedia | null | undefined): boolean {
  return !!value && (!!getReplacementMediaUrl(value) || isReplacementRemoteReference(value.url, value.kind) || isReplacementRemoteReference(value.remoteUrl ?? '', value.kind))
}
export function validateElementReplacement(input: ElementReplacementInput): string[] {
  const errors: string[] = []
  if (!usableMedia(input.sourceVideo)) errors.push('请选择可用的源视频；本地视频刷新后需重新选择')
  if (!input.groups.length) errors.push('请至少添加一组替换元素')
  input.groups.forEach((group, index) => {
    if (!group.description.trim()) errors.push(`请填写第${index + 1}组原元素说明`)
    if (!usableMedia(group.reference)) errors.push(`请选择第${index + 1}组目标参考图`)
  })
  if (!replacementModels.includes(input.settings.model)) errors.push('请选择支持的生成模型')
  if (!replacementResolutions.includes(input.settings.resolution)) errors.push('分辨率仅支持 480P、720P')
  if (!replacementRatios.includes(input.settings.ratio)) errors.push('请选择支持的画面比例')
  if (!validDuration(input.settings.duration)) errors.push('生成时长须为空或不小于 -1 的整数')
  if (typeof input.settings.generateAudio !== 'boolean') errors.push('请选择是否生成同步音频')
  if (typeof input.settings.watermark !== 'boolean') errors.push('请选择是否添加水印')
  if (typeof input.settings.returnLastFrame !== 'boolean') errors.push('请选择是否返回尾帧')
  if (!validPriority(input.settings.priority)) errors.push('任务优先级须为整数')
  if (!validExecutionExpiry(input.settings.executionExpiresAfter)) errors.push('任务有效期须为 3600～259200 秒的整数')
  if (!Array.isArray(input.audioUrls) || input.audioUrls.some(value => !isReplacementRemoteReference(value, 'audio'))) errors.push('参考音频须使用有效的 HTTP、HTTPS、TOS 或 Asset 引用')
  return errors
}
export function buildElementReplacementPrompt(input: ElementReplacementInput): string {
  return composeReplacementPrompt(input.replacementType, input.groups.map(group => group.description), input.preservePrompt)
}
export function getDemoElementReplacementInput(): ElementReplacementInput {
  return createElementReplacementInput({ sourceVideo: demoReplacementVideo, groups: [
    { id: id(), description: '画面左侧穿黑色西装的女性', reference: demoReplacementReferences[0] },
    { id: id(), description: '画面右侧穿白色背心的女性', reference: demoReplacementReferences[1] },
  ] })
}
export function listReplacementMedia(kind: ReplacementMedia['kind'], type?: ReplacementType): ReplacementMedia[] {
  const items: ReplacementMedia[] = []
  if (kind === 'video') {
    for (const task of listVideoTasks().filter(task => task.status === 'completed')) {
      const candidate = media(task.input.resultVideo, 'video') ?? media(task.input.sourceVideo, 'video') ?? (typeof task.input.videoUrl === 'string' ? { id: task.id, name: task.name, kind: 'video' as const, source: 'material' as const, url: task.input.videoUrl } : null)
      if (candidate && usableMedia(candidate)) items.push({ ...candidate, id: `task-${task.id}`, name: task.name, source: 'material' })
    }
    items.push({ ...demoReplacementVideo })
  } else {
    const filter = type ? ({ person: 'MODEL', product: 'PRODUCT', background: 'SCENE' }[type]) : ''
    try {
      const stored: unknown = JSON.parse(localStorage.getItem('tianma-video-materials-v1') ?? '[]')
      if (Array.isArray(stored)) for (const task of stored) {
        if (!record(task) || task.status !== 'completed' || typeof task.id !== 'string' || typeof task.materialName !== 'string' || (filter && task.materialType !== filter)) continue
        const item = media({ id: task.id, name: task.materialName, kind: 'image', source: 'material', url: task.resultImage }, 'image')
        if (item && usableMedia(item)) items.push(item)
      }
    } catch { /* A malformed local library does not prevent selecting another source. */ }
    if (!type || type === 'person') items.push(...demoReplacementReferences.map(item => ({ ...item })))
  }
  return items.filter((item, index, all) => all.findIndex(other => other.url === item.url) === index)
}
