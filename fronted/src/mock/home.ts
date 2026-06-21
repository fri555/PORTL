import type { HomeData, DeptRankItem, DemandVoice, CourseItem, ToolItem } from '@/types/home'
import { articles } from './articles'
import { coverFor } from '@/lib/placeholder'

const byId = (id: string) => articles.find((a) => a.id === id)!

const deptRank: DeptRankItem[] = [
  { rank: 1, department: '营销部', metric: 'AI文案效率+200%，月产360件', score: 320 },
  { rank: 2, department: '供应链', metric: '库存周转+15%，呆滞↓23%', score: 280 },
  { rank: 3, department: '法务部', metric: '合同审查效率+5倍', score: 250 },
  { rank: 4, department: '客服部', metric: '智能客服接通率85%', score: 210 },
  { rank: 5, department: '财务部', metric: '报表时间 2h→10min', score: 180 },
]

const demandVoices: DemandVoice[] = [
  { id: 'd1', title: 'AI智能合同审查（全集团推广）', voteCount: 86, department: '法务部', status: '已排期' },
  { id: 'd2', title: 'AI辅助招投标标书生成', voteCount: 72, department: '经营部', status: '评审中' },
  { id: 'd3', title: '智能客服夜间值守升级', voteCount: 65, department: '客服部', status: '开发中' },
]

const courses: CourseItem[] = [
  { id: 'co1', title: 'Prompt工程进阶：写出会卖货的文案', cover: coverFor('Prompt进阶', 'tech'), difficulty: '进阶', duration: '45min', enrolled: 1240 },
  { id: 'co2', title: 'AI数据分析入门：从取数到洞察', cover: coverFor('AI数据分析', 'tech'), difficulty: '入门', duration: '30min', enrolled: 860 },
]

const tools: ToolItem[] = [
  { id: 't1', name: 'AI对话', icon: 'MessageSquare' },
  { id: 't2', name: '智能报表', icon: 'BarChart3' },
  { id: 't3', name: '文档助手', icon: 'FileText' },
  { id: 't4', name: 'AI绘图', icon: 'Image' },
  { id: 't5', name: '知识检索', icon: 'Search' },
  { id: 't6', name: '更多', icon: 'LayoutGrid' },
]

export const homeData: HomeData = {
  headline: byId('a01'),
  trending: [
    byId('a09'),
    byId('a01'),
    byId('a15'),
    byId('a10'),
    byId('a18'),
  ],
  competitorNews: [byId('a02'), byId('a03'), byId('a04')],
  deptRank,
  demandVoices,
  industryNews: [byId('a09'), byId('a10'), byId('a11')],
  internalNews: [byId('a15'), byId('a16'), byId('a17')],
  courses,
  tools,
}
