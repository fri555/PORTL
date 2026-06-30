import type { CompetitorProfile } from '@/types/competitor'

export const competitorProfiles: CompetitorProfile[] = [
  {
    id: 'c1',
    name: '锋尚集团',
    industry: '精品正餐',
    aiCoverage: '12/15 部门',
    aiProjectCount: 28,
    coreScenarios: '智能招投标 / AI客服 / 营销内容',
    threatAssessment: 'AI招投标系统已上线，中标率提升35%，对我方投标业务构成直接竞争压力',
    lastUpdated: '2026-06-18T09:00:00Z',
  },
  {
    id: 'c2',
    name: '云起餐饮',
    industry: '连锁正餐',
    aiCoverage: '8/10 部门',
    aiProjectCount: 15,
    coreScenarios: 'AI营销 / 供应链优化',
    threatAssessment: 'AI生图与文案能力覆盖营销全链路，内容产出效率为我司2倍',
    lastUpdated: '2026-06-15T09:00:00Z',
  },
  {
    id: 'c3',
    name: '鼎新股份',
    industry: '餐饮零售',
    aiCoverage: '6/12 部门',
    aiProjectCount: 10,
    coreScenarios: 'HR招聘 / 财务自动化',
    threatAssessment: '目前聚焦后台职能，前端业务AI化尚浅，短期威胁较低',
    lastUpdated: '2026-06-10T09:00:00Z',
  },
  {
    id: 'c4',
    name: '味之源',
    industry: '快餐连锁',
    aiCoverage: '9/14 部门',
    aiProjectCount: 18,
    coreScenarios: '爆品预测 / 智能定价 / 库存',
    threatAssessment: '爆品预测准确率达70%，新品命中率显著高于行业，对菜单决策构成威胁',
    lastUpdated: '2026-06-19T09:00:00Z',
  },
  {
    id: 'c5',
    name: '食艺科技',
    industry: '新锐餐饮',
    aiCoverage: '7/9 部门',
    aiProjectCount: 13,
    coreScenarios: 'AI商拍 / 视频营销 / 智能客服',
    threatAssessment: 'AI商拍单件成本仅48元（传统1500元），视觉营销成本优势巨大',
    lastUpdated: '2026-06-17T09:00:00Z',
  },
]

// 我司档案（对标看板末行高亮）
export const selfProfile: CompetitorProfile = {
  id: 'self',
  name: '天马集团（我司）',
  industry: '精品正餐',
  aiCoverage: '9/15 部门',
  aiProjectCount: 12,
  coreScenarios: '菜单决策 / AI商拍 / 智能客服',
  threatAssessment: 'AI覆盖与项目数均落后于头部竞对，亟需加速',
  lastUpdated: '2026-06-21T09:00:00Z',
}
