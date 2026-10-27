export type VideoOperator = 'storyboard' | 'prompt-reverse' | 'image-generate' | 'prompt-generate' | 'video-generate' | 'element-replace' | 'speech-synthesis'
export type VideoTaskStatus = 'draft' | 'queued' | 'processing' | 'completed' | 'failed' | 'timeout'
export interface VideoCapability {
  operator: VideoOperator
  title: string
  description: string
  namePrefix: string
  processingLabel: string
}
export interface VideoTask {
  id: string
  operator: VideoOperator
  name: string
  status: VideoTaskStatus
  createdAt: string
  input: Record<string, any>
  remoteJob?: import('./element-replacement-job').ElementReplacementJob
}
