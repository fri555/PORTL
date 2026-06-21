export interface DeptRankItem {
  rank: number
  department: string
  metric: string
  score: number
}

export interface DemandVoice {
  id: string
  title: string
  voteCount: number
  department: string
  status: string
}

export interface CourseItem {
  id: string
  title: string
  cover: string
  difficulty: string
  duration: string
  enrolled: number
}

export interface ToolItem {
  id: string
  name: string
  icon: string
}

export interface HomeData {
  headline: import('./article').Article
  trending: import('./article').Article[]
  competitorNews: import('./article').Article[]
  deptRank: DeptRankItem[]
  demandVoices: DemandVoice[]
  industryNews: import('./article').Article[]
  internalNews: import('./article').Article[]
  courses: CourseItem[]
  tools: ToolItem[]
}
