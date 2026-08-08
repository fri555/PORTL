export interface DigitalHumanAvatar {
  id: string
  name: string
  avatarUrl: string
  style: string
  gender: 'male' | 'female'
  voiceType: string
  status: 'idle' | 'streaming' | 'offline'
}

export interface LiveSession {
  id: string
  title: string
  digitalHumanId: string
  digitalHumanName: string
  platform: string
  status: 'preparing' | 'live' | 'ended'
  startTime: string
  durationMinutes: number
  viewers: number
  orders: number
  gmv: number
  productCount: number
}

export interface LiveStats {
  totalSessions: number
  totalDurationMinutes: number
  totalViewers: number
  totalGmv: number
  avgConversionRate: number
  todaySessions: number
  todayGmv: number
}

const NOW = Date.now()

export const digitalHumans: DigitalHumanAvatar[] = [
  {
    id: 'dh01', name: '小美', avatarUrl: '', style: '甜美主播型',
    gender: 'female', voiceType: '温柔女声', status: 'streaming',
  },
  {
    id: 'dh02', name: '小泽', avatarUrl: '', style: '专业顾问型',
    gender: 'male', voiceType: '沉稳男声', status: 'idle',
  },
  {
    id: 'dh03', name: '小雪', avatarUrl: '', style: '活泼带货型',
    gender: 'female', voiceType: '明亮女声', status: 'idle',
  },
  {
    id: 'dh05', name: '若溪', avatarUrl: '', style: '知性解说型',
    gender: 'female', voiceType: '知性女声', status: 'offline',
  },
  {
    id: 'dh06', name: '磊哥', avatarUrl: '', style: '激情叫卖型',
    gender: 'male', voiceType: '激昂男声', status: 'idle',
  },
]

export const activeLiveSession: LiveSession = {
  id: 'ls01',
  title: '运动鞋夏季新品专场',
  digitalHumanId: 'dh01',
  digitalHumanName: '小美',
  platform: '抖音',
  status: 'live',
  startTime: new Date(NOW - 2.25 * 3600_000).toISOString(),
  durationMinutes: 135,
  viewers: 3280,
  orders: 1286,
  gmv: 156320,
  productCount: 26,
}

export const scheduledSessions: LiveSession[] = [
  {
    id: 'ls04',
    title: '户外防晒衣爆款专场',
    digitalHumanId: 'dh03',
    digitalHumanName: '小雪',
    platform: '抖音',
    status: 'preparing',
    startTime: new Date(NOW + 2 * 3600_000).toISOString(),
    durationMinutes: 0, viewers: 0, orders: 0, gmv: 0, productCount: 18,
  },
  {
    id: 'ls05',
    title: '夏季拖鞋清仓大促',
    digitalHumanId: 'dh06',
    digitalHumanName: '磊哥',
    platform: '淘宝',
    status: 'preparing',
    startTime: new Date(NOW + 5 * 3600_000).toISOString(),
    durationMinutes: 0, viewers: 0, orders: 0, gmv: 0, productCount: 42,
  },
]

export const recentSessions: LiveSession[] = [
  activeLiveSession,
  {
    id: 'ls02',
    title: '休闲T恤爆款返场',
    digitalHumanId: 'dh02', digitalHumanName: '小泽',
    platform: '抖音', status: 'ended',
    startTime: new Date(NOW - 6 * 3600_000).toISOString(),
    durationMinutes: 180, viewers: 5200, orders: 2310, gmv: 287500, productCount: 34,
  },
  {
    id: 'ls03',
    title: '618运动户外专场',
    digitalHumanId: 'dh01', digitalHumanName: '小美',
    platform: '淘宝', status: 'ended',
    startTime: new Date(NOW - 24 * 3600_000).toISOString(),
    durationMinutes: 240, viewers: 8900, orders: 3560, gmv: 523000, productCount: 52,
  },
  {
    id: 'ls07',
    title: '运动袜满减囤货专场',
    digitalHumanId: 'dh03', digitalHumanName: '小雪',
    platform: '快手', status: 'ended',
    startTime: new Date(NOW - 48 * 3600_000).toISOString(),
    durationMinutes: 210, viewers: 6200, orders: 4520, gmv: 89600, productCount: 60,
  },
  {
    id: 'ls08',
    title: '防水跑鞋科技讲解',
    digitalHumanId: 'dh05', digitalHumanName: '若溪',
    platform: '淘宝', status: 'ended',
    startTime: new Date(NOW - 55 * 3600_000).toISOString(),
    durationMinutes: 165, viewers: 3600, orders: 980, gmv: 245000, productCount: 15,
  },
]

export const liveStats: LiveStats = {
  totalSessions: 48,
  totalDurationMinutes: 8640,
  totalViewers: 156000,
  totalGmv: 2850000,
  avgConversionRate: 3.8,
  todaySessions: 2,
  todayGmv: 156320,
}

export const quickCapabilities = [
  { id: 'script', label: '智能话术生成', desc: '根据商品自动生成直播讲解文案', icon: 'sparkles' },
  { id: 'qa', label: '直播间问答', desc: 'AI实时回复观众提问', icon: 'message' },
  { id: 'product', label: '商品讲解', desc: '数字人自动展示与讲解商品', icon: 'store' },
  { id: 'review', label: '数据复盘', desc: '下播后自动生成复盘报告', icon: 'chart' },
  { id: 'multiLang', label: '多语种直播', desc: '支持英语、日语、韩语等实时口播', icon: 'globe' },
  { id: 'emotion', label: '情绪调节', desc: '根据弹幕氛围自动调整语气表情', icon: 'zap' },
]
