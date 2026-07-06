export interface ChatSession {
  id: string
  title: string
  updatedAt: string
  messages: ChatMessage[]
}

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export const chatSessions: ChatSession[] = [
  {
    id: 's1',
    title: '集团制度咨询',
    updatedAt: '14:22',
    messages: [
      { id: 1, role: 'user', content: '我们集团的考勤制度中，加班审批流程是什么？', timestamp: '14:20' },
      { id: 2, role: 'assistant', content: '根据集团制度知识库中的《考勤管理制度_v3》，加班审批流程如下：\n\n1. 员工提前填写《加班申请表》，说明加班原因和预估时长\n2. 部门负责人审批（评估必要性）\n3. 超过3天需分管副总审批\n4. 审批通过后报人力资源部备案\n\n加班时长每月不超过36小时，法定节假日加班需另行报批。', timestamp: '14:20' },
    ],
  },
  {
    id: 's2',
    title: '团购方案参考',
    updatedAt: '昨天',
    messages: [
      { id: 1, role: 'user', content: '我们之前做过运动鞋团购吗？有没有成功案例可以参考？', timestamp: '昨天 16:30' },
      { id: 2, role: 'assistant', content: '有的！方案中心案例库中有「运动鞋团购成功案例」，核心要点：\n\n1. **客户群体**：某大型企业员工福利采购，约2000双\n2. **预算分档**：保守档（200元/双）、均衡档（350元/双）、品质档（500元/双）\n3. **执行建议**：先用均衡档作为客户现场沟通初稿，再根据预算调整\n4. **SKU组合**：基础款占比60%，热门款占比30%，高端款占比10%', timestamp: '昨天 16:30' },
    ],
  },
  {
    id: 's3',
    title: '新对话',
    updatedAt: '刚刚',
    messages: [],
  },
]
