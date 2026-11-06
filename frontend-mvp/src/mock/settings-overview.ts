export const operationsMetrics = [
  { label: '活跃用户', value: '286', change: '+12.4%' },
  { label: '智能体调用', value: '8,642', change: '+18.7%' },
  { label: '知识检索', value: '3,915', change: '+9.2%' },
  { label: '人民币消耗', value: '¥1,286.40', change: '-3.1%' },
]
export const operationsModules = [
  { name: '天马智擎', users: 218, calls: 5680, consumed: 786.52, rate: '66%' },
  { name: '知识中心', users: 146, calls: 1936, consumed: 278.61, rate: '23%' },
  { name: '内容中心', users: 58, calls: 742, consumed: 184.35, rate: '9%' },
  { name: '自动化', users: 21, calls: 284, consumed: 36.92, rate: '2%' },
]
export const monitoredAgents = [
  { id: 'agent-data', name: '数据分析师', owner: '赵伟朝（朝暮）', status: '正常', successRate: '99.2%', response: '2.1s', updatedAt: '2026-11-05 08:42' },
  { id: 'agent-product', name: '商品运营助手', owner: '许文浩（无字）', status: '正常', successRate: '98.7%', response: '2.8s', updatedAt: '2026-11-05 08:38' },
  { id: 'agent-group', name: '组货专家', owner: '邹昌宇（元亮）', status: '关注', successRate: '94.1%', response: '4.6s', updatedAt: '2026-11-05 08:31' },
  { id: 'agent-knowledge', name: '制度问答助手', owner: '李清（清晖）', status: '正常', successRate: '99.6%', response: '1.9s', updatedAt: '2026-11-05 08:27' },
  { id: 'agent-video', name: '视频内容助手', owner: '韦昊泽（谨行）', status: '异常', successRate: '86.3%', response: '8.2s', updatedAt: '2026-11-05 08:19' },
] as const
