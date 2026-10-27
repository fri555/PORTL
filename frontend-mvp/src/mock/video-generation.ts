import type { VideoCapability } from '@/types/video-generation'

export const videoCapabilities: VideoCapability[] = [
  { operator: 'element-replace', title: '元素替换', description: '替换视频中的人物、商品或背景，支持多组元素与参考图匹配，保留原视频的动作与镜头。', namePrefix: '元素替换', processingLabel: '处理中' },
  { operator: 'speech-synthesis', title: '语音合成', description: '将文本转为自然配音，选择预置音色、调整语速，支持音频与 SRT 字幕下载。', namePrefix: '语音合成', processingLabel: '合成中' },
  { operator: 'storyboard', title: '视频分镜', description: '基于多模态大模型对视频进行场景切分、全局角色提取、场景视频切片和人物图片生成。', namePrefix: '视频分镜', processingLabel: '拆解中' },
  { operator: 'prompt-reverse', title: '视频提示词逆向生成', description: '理解源视频和分镜片段，按片段逆向生成可用于视频复刻的结构化 Prompt，保留已验证的主体、动作、镜头、台词和声音事实，并支持视觉与音色风格控制。', namePrefix: '提示词逆向', processingLabel: '生成中' },
  { operator: 'image-generate', title: '图片素材', description: '支持文生图、图生图与组图生成，可选流式输出。', namePrefix: '图片素材', processingLabel: '生成中' },
  { operator: 'prompt-generate', title: '视频 Prompt 生成', description: '根据通用视频需求或当前口播单分镜及可选参考图片，生成可直接用于视频制作的纯文本 Prompt。', namePrefix: 'Prompt生成', processingLabel: '生成中' },
  { operator: 'video-generate', title: '视频生成', description: '以 Seedance 2.0/2.5 及 Seedance 2.0 Fast/Mini模型为核心，围绕视频生成的前置、后置链路，叠加视频格式转换、视频切分、视频修复、字幕生成、音视频合并、视频超分等能力，扩展。', namePrefix: '视频生成', processingLabel: '生成中' },
]
