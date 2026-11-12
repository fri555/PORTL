import { ref } from 'vue'

/**
 * 首页对话发送前的附件信息（含图片 dataUrl / 原文件 URL）。
 * SourceChatView.vue 与路由不可改动，因此用模块级共享状态把附件元信息带到会话详情页；
 * 主任务可在 SourceChatDetail.vue 读取它来渲染灯箱与下载原图。
 */
export interface HomeAttachmentMeta {
  id: string
  name: string
  ext: string
  size: number
  kind: 'image' | 'file'
  /** 图片 base64，可用于缩略图 / 灯箱 / 下载原图 */
  dataUrl?: string
  /** 原文件对象 URL（同一 SPA 会话内有效） */
  url?: string
}

const STORAGE_KEY = 'tianma.prototype.home-attachments.v1'

function load(): HomeAttachmentMeta[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is HomeAttachmentMeta =>
      !!item && typeof item === 'object' && typeof (item as HomeAttachmentMeta).name === 'string',
    )
  } catch {
    return []
  }
}

export const pendingHomeAttachments = ref<HomeAttachmentMeta[]>(load())

/** 首页发送时写入；详情页读取。 */
export function setPendingHomeAttachments(list: HomeAttachmentMeta[]): void {
  pendingHomeAttachments.value = list.map((item) => ({ ...item }))
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingHomeAttachments.value))
  } catch {
    // 图片 dataUrl 可能超出本地存储配额，内存状态在本会话内仍然有效
  }
}

export function getPendingHomeAttachments(): HomeAttachmentMeta[] {
  return pendingHomeAttachments.value.map((item) => ({ ...item }))
}

export function clearPendingHomeAttachments(): void {
  setPendingHomeAttachments([])
}
