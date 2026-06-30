import type { Demand, DemandComment } from '@/types/demand'

const NOW = Date.now()
function daysAgo(d: number) { return new Date(NOW - d * 86400_000).toISOString() }

export const demands: Demand[] = [
  {
    id: 'd01', title: 'AI智能合同审查系统（全集团推广）', description: '将法务部试点的AI合同审查系统推广至全集团，覆盖采购合同、劳动合同、租赁合同等全部合同类型',
    department: '法务部', submitterId: 'u_law', submitterName: '法务负责人', urgency: 'high',
    status: 'scheduled', voteCount: 86, commentCount: 12,
    tags: ['法务', '合同', '全集团'], attachments: [],
    aiExtractedDesc: null,
    timeline: [
      { id: 'tl01', fromStatus: null, toStatus: 'pending_review', operatorId: 'u_law', operatorName: '法务负责人', operatorRole: '需求提出人', remark: '提交需求', createdAt: daysAgo(30) },
      { id: 'tl02', fromStatus: 'pending_review', toStatus: 'scheduled', operatorId: 'u_admin', operatorName: '需求管理员', operatorRole: '需求管理员', remark: '已评估，纳入Q3排期', createdAt: daysAgo(20) },
    ],
    createdAt: daysAgo(30), updatedAt: daysAgo(20),
  },
  {
    id: 'd02', title: 'AI辅助招投标标书生成', description: '利用大模型能力，根据招标文件自动生成标书初稿，支持历史标书参考和模板匹配',
    department: '经营部', submitterId: 'u_biz', submitterName: '经营部负责人', urgency: 'high',
    status: 'pending_review', voteCount: 72, commentCount: 8,
    tags: ['招投标', '标书', '文本生成'], attachments: [],
    aiExtractedDesc: null,
    timeline: [
      { id: 'tl03', fromStatus: null, toStatus: 'pending_review', operatorId: 'u_biz', operatorName: '经营部负责人', operatorRole: '需求提出人', remark: '提交需求', createdAt: daysAgo(15) },
    ],
    createdAt: daysAgo(15), updatedAt: daysAgo(15),
  },
  {
    id: 'd03', title: '智能客服夜间值守升级', description: '升级智能客服系统，支持夜间无人值守模式，自动处理常见售后问题，复杂问题自动创建工单次日人工跟进',
    department: '客服部', submitterId: 'u_cs', submitterName: '客服部负责人', urgency: 'medium',
    status: 'developing', voteCount: 65, commentCount: 15,
    tags: ['客服', '自动化', '夜间值守'], attachments: [],
    aiExtractedDesc: null,
    timeline: [
      { id: 'tl04', fromStatus: null, toStatus: 'pending_review', operatorId: 'u_cs', operatorName: '客服部负责人', operatorRole: '需求提出人', remark: '提交需求', createdAt: daysAgo(25) },
      { id: 'tl05', fromStatus: 'pending_review', toStatus: 'scheduled', operatorId: 'u_admin', operatorName: '需求管理员', operatorRole: '需求管理员', remark: '已排期Q2开发', createdAt: daysAgo(18) },
      { id: 'tl06', fromStatus: 'scheduled', toStatus: 'developing', operatorId: 'u_dev', operatorName: '技术开发组', operatorRole: '开发者', remark: '开始开发', createdAt: daysAgo(10) },
    ],
    createdAt: daysAgo(25), updatedAt: daysAgo(10),
  },
  {
    id: 'd04', title: 'AI驱动的门店客流预测与排班联动', description: '基于历史客流数据+天气+节假日，预测门店客流并自动优化排班方案',
    department: '零售运营部', submitterId: 'u_retail', submitterName: '零售运营负责人', urgency: 'medium',
    status: 'developing', voteCount: 58, commentCount: 10,
    tags: ['门店', '客流预测', '排班'], attachments: [],
    aiExtractedDesc: null,
    timeline: [
      { id: 'tl07', fromStatus: null, toStatus: 'pending_review', operatorId: 'u_retail', operatorName: '零售运营负责人', operatorRole: '需求提出人', remark: '提交需求', createdAt: daysAgo(20) },
      { id: 'tl08', fromStatus: 'pending_review', toStatus: 'developing', operatorId: 'u_admin', operatorName: '需求管理员', operatorRole: '需求管理员', remark: '业务部门自主开发', createdAt: daysAgo(12) },
    ],
    createdAt: daysAgo(20), updatedAt: daysAgo(12),
  },
  {
    id: 'd05', title: 'AI营销活动ROI预测工具', description: '输入活动方案，AI预测ROI、参与人数、转化率，辅助营销预算分配决策',
    department: '市场营销部', submitterId: 'u_mkt', submitterName: '营销负责人', urgency: 'medium',
    status: 'pending_review', voteCount: 51, commentCount: 6,
    tags: ['营销', 'ROI预测', '预算'], attachments: [],
    aiExtractedDesc: null,
    timeline: [
      { id: 'tl09', fromStatus: null, toStatus: 'pending_review', operatorId: 'u_mkt', operatorName: '营销负责人', operatorRole: '需求提出人', remark: '提交需求', createdAt: daysAgo(8) },
    ],
    createdAt: daysAgo(8), updatedAt: daysAgo(8),
  },
  {
    id: 'd06', title: 'AI商品图批量生成（商拍替代）', description: '用AI生成高质量商品展示图，替代传统商拍，支持白底图/场景图/模特图批量产出',
    department: '电商运营部', submitterId: 'u_ec', submitterName: '电商运营负责人', urgency: 'high',
    status: 'testing', voteCount: 93, commentCount: 22,
    tags: ['商品图', 'AI商拍', '降本'], attachments: [],
    aiExtractedDesc: null,
    timeline: [
      { id: 'tl10', fromStatus: null, toStatus: 'pending_review', operatorId: 'u_ec', operatorName: '电商运营负责人', operatorRole: '需求提出人', remark: '提交需求，期望替代传统商拍降低成本', createdAt: daysAgo(45) },
      { id: 'tl11', fromStatus: 'pending_review', toStatus: 'scheduled', operatorId: 'u_admin', operatorName: '需求管理员', operatorRole: '需求管理员', remark: '高优先级，AI部门承接开发', createdAt: daysAgo(38) },
      { id: 'tl12', fromStatus: 'scheduled', toStatus: 'developing', operatorId: 'u_ai', operatorName: 'AI技术组', operatorRole: '开发者', remark: '启动开发', createdAt: daysAgo(30) },
      { id: 'tl13', fromStatus: 'developing', toStatus: 'testing', operatorId: 'u_ai', operatorName: 'AI技术组', operatorRole: '开发者', remark: '开发完成，进入测试验收', createdAt: daysAgo(5) },
    ],
    createdAt: daysAgo(45), updatedAt: daysAgo(5),
  },
  {
    id: 'd07', title: 'AI面试官：候选人初筛面试自动化', description: '构建AI面试官，对初级岗位候选人进行标准化初筛面试，自动评分并生成面试报告',
    department: '人力资源部', submitterId: 'u_hr', submitterName: 'HR负责人', urgency: 'low',
    status: 'pending_review', voteCount: 38, commentCount: 9,
    tags: ['HR', '面试', '自动化'], attachments: [],
    aiExtractedDesc: null,
    timeline: [
      { id: 'tl14', fromStatus: null, toStatus: 'pending_review', operatorId: 'u_hr', operatorName: 'HR负责人', operatorRole: '需求提出人', remark: '提交需求', createdAt: daysAgo(5) },
    ],
    createdAt: daysAgo(5), updatedAt: daysAgo(5),
  },
  {
    id: 'd08', title: '跨部门AI费用分摊报表自动化', description: '自动采集各部门模型调用量与费用，按分摊规则自动生成月度费用分摊报表',
    department: '财务部', submitterId: 'u_fin', submitterName: '财务负责人', urgency: 'medium',
    status: 'online', voteCount: 44, commentCount: 7,
    tags: ['财务', '费用分摊', '报表'], attachments: [],
    aiExtractedDesc: null,
    timeline: [
      { id: 'tl15', fromStatus: null, toStatus: 'pending_review', operatorId: 'u_fin', operatorName: '财务负责人', operatorRole: '需求提出人', remark: '提交需求', createdAt: daysAgo(60) },
      { id: 'tl16', fromStatus: 'pending_review', toStatus: 'scheduled', operatorId: 'u_admin', operatorName: '需求管理员', operatorRole: '需求管理员', remark: '排期', createdAt: daysAgo(52) },
      { id: 'tl17', fromStatus: 'scheduled', toStatus: 'developing', operatorId: 'u_fin', operatorName: '财务部', operatorRole: '开发者', remark: '财务部自主开发', createdAt: daysAgo(45) },
      { id: 'tl18', fromStatus: 'developing', toStatus: 'testing', operatorId: 'u_fin', operatorName: '财务部', operatorRole: '开发者', remark: '开发完成', createdAt: daysAgo(20) },
      { id: 'tl19', fromStatus: 'testing', toStatus: 'online', operatorId: 'u_admin', operatorName: '需求管理员', operatorRole: '需求管理员', remark: '验收通过，正式上线', createdAt: daysAgo(3) },
    ],
    createdAt: daysAgo(60), updatedAt: daysAgo(3),
  },
]

export const demandComments: Record<string, DemandComment[]> = {
  d01: [
    { id: 'c01', demandId: 'd01', userId: 'u1', userName: '张三', content: '支持！合同审查效率提升太明显了，希望尽快推广', createdAt: daysAgo(25) },
    { id: 'c02', demandId: 'd01', userId: 'u2', userName: '李四', content: '建议同时考虑与OA系统的对接，合同审批流程也能打通', createdAt: daysAgo(23) },
  ],
  d03: [
    { id: 'c03', demandId: 'd03', userId: 'u5', userName: '钱七', content: '夜间值守需要特别注意客诉升级机制，不能完全依赖AI', createdAt: daysAgo(15) },
  ],
  d06: [
    { id: 'c04', demandId: 'd06', userId: 'u1', userName: '张三', content: '期待！传统商拍一个SKU就要1500，AI方案可以大幅降本', createdAt: daysAgo(40) },
    { id: 'c05', demandId: 'd06', userId: 'u3', userName: '王五', content: '已经在测试了，第一批出图效果很不错，预计下月上线', createdAt: daysAgo(10) },
  ],
}

export function getDemand(id: string): Demand | undefined {
  return demands.find((d) => d.id === id)
}
