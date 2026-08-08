import type { RankingEntry, DeptRankingEntry, RankingPeriod } from '@/types/points'

function makeUserRank(entries: [string, string, string, number, number, string][]) {
  return entries.map(([userName, department, highlights, score, rankChange, avatarUrl], i) => ({
    rank: i + 1, rankChange, userId: `u${i + 1}`, userName, department, avatarUrl, score, highlights,
  })) as RankingEntry[]
}

export const usageRanking: Record<RankingPeriod, RankingEntry[]> = {
  daily: makeUserRank([
    ['王五', '市场营销部', 'AI文案生成58次·AI绘图12次', 320, 2, ''],
    ['赵六', '仓储部', '库存分析21次·销量预测15次', 280, -1, ''],
    ['张三', '电商运营部', '商品比价32次·竞品分析18次', 265, 1, ''],
    ['钱七', '客服部', '智能质检45次·情绪分析28次', 240, -2, ''],
    ['李四', '零售运营部', '排班优化12次·库存预警9次', 210, 3, ''],
  ]),
  weekly: makeUserRank([
    ['王五', '市场营销部', 'AI文案生成312次·AI绘图86次·脚本68次', 2100, 1, ''],
    ['张三', '电商运营部', '商品比价198次·竞品分析125次', 1850, 2, ''],
    ['赵六', '仓储部', '库存分析145次·销量预测98次', 1620, -3, ''],
    ['钱七', '客服部', '智能质检280次·情绪分析156次', 1480, 0, ''],
    ['李四', '零售运营部', '排班优化78次·库存预警65次', 1320, 4, ''],
  ]),
  monthly: makeUserRank([
    ['王五', '市场营销部', 'AI文案生成1240次·AI绘图342次', 8500, 0, ''],
    ['赵六', '仓储部', '库存分析580次·销量预测410次', 7200, 1, ''],
    ['张三', '电商运营部', '商品比价760次·竞品分析520次', 6800, -1, ''],
    ['钱七', '客服部', '智能质检1120次·情绪分析620次', 5900, 2, ''],
    ['李四', '零售运营部', '排班优化310次·库存预警260次', 5100, -1, ''],
  ]),
}

export const demandRanking: Record<RankingPeriod, RankingEntry[]> = {
  daily: makeUserRank([
    ['法务负责人', '法务部', '提交3个需求·被采纳2个', 180, 0, ''],
    ['电商运营负责人', '电商运营部', 'AI商拍需求93票', 165, 3, ''],
    ['经营部负责人', '经营部', '招投标标书需求72票', 150, -1, ''],
    ['客服部负责人', '客服部', '夜间值守需求65票', 135, 0, ''],
    ['营销负责人', '市场营销部', 'ROI预测需求51票', 120, 2, ''],
  ]),
  weekly: makeUserRank([
    ['法务负责人', '法务部', '提交5个需求·被采纳3个', 620, 0, ''],
    ['电商运营负责人', '电商运营部', 'AI商拍需求93票·AI商品图', 580, 1, ''],
    ['经营部负责人', '经营部', '标书生成·投标分析', 520, -1, ''],
    ['客服部负责人', '客服部', '夜间值守·智能质检·情绪分析', 480, 2, ''],
    ['零售运营负责人', '零售运营部', '客流预测·排班联动', 430, -1, ''],
  ]),
  monthly: makeUserRank([
    ['法务负责人', '法务部', '提交12个需求·被采纳8个·2个已上线', 2100, 0, ''],
    ['电商运营负责人', '电商运营部', 'AI商拍93票·AI商品图已测试', 1850, 1, ''],
    ['经营部负责人', '经营部', '标书生成72票·投标分析', 1620, -1, ''],
    ['客服部负责人', '客服部', '夜间值守65票·质检升级', 1480, 2, ''],
    ['零售运营负责人', '零售运营部', '客流预测58票·排班联动', 1320, 0, ''],
  ]),
}

export const opinionLeaderRanking: Record<RankingPeriod, RankingEntry[]> = {
  daily: makeUserRank([
    ['王五', '市场营销部', '投稿2篇·评论15条·被赞88次', 210, 3, ''],
    ['张三', '电商运营部', '评论12条·被赞56次', 175, -1, ''],
    ['小李', '营销部', '投稿1篇·评论8条·被赞42次', 150, 0, ''],
    ['钱七', '客服部', '评论18条·被赞38次', 130, -2, ''],
    ['小陈', '财务部', '投稿1篇·被赞34次', 105, 4, ''],
  ]),
  weekly: makeUserRank([
    ['王五', '市场营销部', '投稿5篇·评论87条·被赞420次', 1280, 0, ''],
    ['张三', '电商运营部', '评论65条·被赞280次', 980, 2, ''],
    ['小李', '营销部', '投稿3篇·评论42条·被赞195次', 820, -1, ''],
    ['钱七', '客服部', '评论92条·被赞165次', 740, -1, ''],
    ['小陈', '财务部', '投稿2篇·被赞140次', 580, 3, ''],
  ]),
  monthly: makeUserRank([
    ['王五', '市场营销部', '投稿18篇·评论340条·被赞1680次', 5200, 0, ''],
    ['张三', '电商运营部', '评论260条·被赞1120次', 3900, 1, ''],
    ['小李', '营销部', '投稿12篇·评论165条·被赞780次', 3200, -1, ''],
    ['钱七', '客服部', '评论370条·被赞680次', 2850, 2, ''],
    ['小陈', '财务部', '投稿8篇·被赞560次', 2250, 0, ''],
  ]),
}

export const departmentRanking: Record<RankingPeriod, DeptRankingEntry[]> = {
  daily: [
    { rank: 1, rankChange: 0, department: '市场营销部', score: 320, aiPenetration: '92%', efficiencyGain: '200%', tokenConsumed: '28.5M' },
    { rank: 2, rankChange: 1, department: '仓储部', score: 280, aiPenetration: '78%', efficiencyGain: '65%', tokenConsumed: '22.1M' },
    { rank: 3, rankChange: -1, department: '电商运营部', score: 265, aiPenetration: '85%', efficiencyGain: '120%', tokenConsumed: '25.3M' },
    { rank: 4, rankChange: 0, department: '客服部', score: 240, aiPenetration: '70%', efficiencyGain: '55%', tokenConsumed: '18.7M' },
    { rank: 5, rankChange: 2, department: '零售运营部', score: 210, aiPenetration: '65%', efficiencyGain: '40%', tokenConsumed: '15.2M' },
  ],
  weekly: [
    { rank: 1, rankChange: 0, department: '市场营销部', score: 2100, aiPenetration: '92%', efficiencyGain: '200%', tokenConsumed: '152M' },
    { rank: 2, rankChange: 0, department: '仓储部', score: 1850, aiPenetration: '78%', efficiencyGain: '65%', tokenConsumed: '128M' },
    { rank: 3, rankChange: 1, department: '电商运营部', score: 1620, aiPenetration: '85%', efficiencyGain: '120%', tokenConsumed: '141M' },
    { rank: 4, rankChange: -1, department: '客服部', score: 1480, aiPenetration: '70%', efficiencyGain: '55%', tokenConsumed: '105M' },
    { rank: 5, rankChange: 0, department: '零售运营部', score: 1320, aiPenetration: '65%', efficiencyGain: '40%', tokenConsumed: '89M' },
  ],
  monthly: [
    { rank: 1, rankChange: 0, department: '市场营销部', score: 8500, aiPenetration: '92%', efficiencyGain: '200%', tokenConsumed: '620M' },
    { rank: 2, rankChange: 0, department: '电商运营部', score: 7200, aiPenetration: '85%', efficiencyGain: '120%', tokenConsumed: '580M' },
    { rank: 3, rankChange: 1, department: '仓储部', score: 6800, aiPenetration: '78%', efficiencyGain: '65%', tokenConsumed: '510M' },
    { rank: 4, rankChange: -1, department: '客服部', score: 5900, aiPenetration: '70%', efficiencyGain: '55%', tokenConsumed: '430M' },
    { rank: 5, rankChange: 2, department: '零售运营部', score: 5100, aiPenetration: '65%', efficiencyGain: '40%', tokenConsumed: '360M' },
  ],
}
