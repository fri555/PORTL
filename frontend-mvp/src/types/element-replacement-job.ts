export type ElementReplacementJobStatus = 'submitting' | 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'submission-unknown'

export interface ElementReplacementJob {
  id: string
  providerTaskId?: string
  status: ElementReplacementJobStatus
  createdAt: string
  updatedAt: string
  error?: { code: string; message: string }
  result?: {
    videoUrl: string
    lastFrameUrl?: string
    model?: string
    resolution?: string
    ratio?: string
    duration?: number
    usage?: Record<string, unknown>
  }
}

export interface ElementReplacementConnection {
  configured: boolean
  uploadAvailable: boolean
}

export interface UploadedReplacementMedia {
  remoteUrl: string
  previewUrl: string
}
