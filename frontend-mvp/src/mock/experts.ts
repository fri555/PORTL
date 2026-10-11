import { getBusinessExpertAvatarUrl } from './businessExpertAvatars'
import { businessExpertProfiles } from './businessExpertProfiles'
import { AGENT_CATEGORY_META } from '@/types/agent'

export interface Expert {
  id: string
  name: string        // 专家名称（如「商品选品专家」）
  nickname: string    // 花名（如「选品王」）
  gender?: '男' | '女' // 形象
  desc: string         // 专家描述（JD）
  scenes: string[]     // 适用场景
  capabilities: string[] // 具体能力
  tagColor: string     // 角色标签 badge 色系 tailwind class
  avatarColor: string  // 头像背景色 tailwind class
  avatarUrl?: string  // 与专家中心共用正式头像
  avatarEmoji: string  // 头像 emoji/图标
  status: 'active' | 'draft'
  promptCases: string[] // 点击专家后展示的提示词案例（点击带入输入框）
}

export const experts: Expert[] = businessExpertProfiles.map(profile => ({
  id: profile.id,
  name: profile.name,
  nickname: '',
  desc: profile.description,
  scenes: [AGENT_CATEGORY_META[profile.category].label],
  capabilities: [...profile.systems],
  tagColor: 'bg-blue-100 text-blue-600 border-blue-200',
  avatarColor: 'bg-blue-50',
  avatarUrl: getBusinessExpertAvatarUrl(profile.id),
  avatarEmoji: '🤖',
  status: 'active' as const,
  promptCases: [...profile.quickCommands],
}))
