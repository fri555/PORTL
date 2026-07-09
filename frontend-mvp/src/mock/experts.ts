export interface Expert {
  id: string
  name: string        // 专家名称（如「商品选品专家」）
  nickname: string    // 花名（如「选品王」）
  gender: '男' | '女' // 形象
  desc: string         // 专家描述（JD）
  scenes: string[]     // 适用场景
  capabilities: string[] // 具体能力
  tagColor: string     // 角色标签 badge 色系 tailwind class
  avatarColor: string  // 头像背景色 tailwind class
  avatarEmoji: string  // 头像 emoji/图标
  status: 'active' | 'draft'
  promptCases: string[] // 点击专家后展示的提示词案例（点击带入输入框）
}

export const experts: Expert[] = [
  {
    id: 'exp-1',
    name: '商品选品专家',
    nickname: '选品王',
    gender: '男',
    desc: '基于销售数据、库存、趋势，为不同渠道推荐选品组合',
    scenes: ['B2B分销选品', 'B2C爆品推荐', '线下门店配货'],
    capabilities: ['数据分析', '趋势预测', '库存联动', '归因分析'],
    tagColor: 'bg-orange-100 text-orange-600 border-orange-200',
    avatarColor: 'bg-orange-50',
    avatarEmoji: '🛒',
    status: 'active',
    promptCases: [
      '根据上月B2C渠道销售数据，推荐5个本季度潜力爆品组合，并说明选品逻辑',
      '线下门店A库存周转超过60天，给出清货与跨店调拨的选品建议',
      '为新开拓的得物渠道做一份运动户外品类选品清单，区分引流款与利润款',
    ],
  },
  {
    id: 'exp-2',
    name: '智能导购专家',
    nickname: '带货一姐',
    gender: '女',
    desc: '7×24h解答商品问题，根据用户画像做个性化推荐',
    scenes: ['B2C商城', '线下扫码咨询', 'B2B客户询盘'],
    capabilities: ['商品知识库', '用户画像', '话术生成'],
    tagColor: 'bg-pink-100 text-pink-600 border-pink-200',
    avatarColor: 'bg-pink-50',
    avatarEmoji: '💁‍♀️',
    status: 'active',
    promptCases: [
      '用户想买一双适合通勤、预算500以内的跑步鞋，帮我做个性化推荐并说明卖点',
      '生成一段面向宝妈群体的儿童运动服导购话术，突出安全与透气',
      '针对B2B客户批量询盘，输出标准商品参数对比表与推荐结论',
    ],
  },
  {
    id: 'exp-3',
    name: '库存与履约专家',
    nickname: '飞毛腿',
    gender: '女',
    desc: '实时查询库存、推荐最近发货仓、预估配送时间',
    scenes: ['全场景订单履约', '线下门店缺货调拨'],
    capabilities: ['对接WMS/ERP', 'LBS定位', '物流状态追踪'],
    tagColor: 'bg-blue-100 text-blue-600 border-blue-200',
    avatarColor: 'bg-blue-50',
    avatarEmoji: '🏃‍♀️',
    status: 'active',
    promptCases: [
      '查询上海仓运动鞋SKU的实时库存，并推荐离杭州收件人最近的发货仓',
      '广州门店某款卫衣缺货，给出周边可调拨门店与预计送达时间',
      '结合在途物流状态，预估这批订单的履约时效并标注风险单',
    ],
  },
  {
    id: 'exp-4',
    name: '营销策略专家',
    nickname: '点子王',
    gender: '男',
    desc: '策划促销方案、匹配用户可用的优惠、生成营销素材',
    scenes: ['大促活动', '会员营销', 'B2B客户激励'],
    capabilities: ['营销规则引擎', '用户分群', '内容生成'],
    tagColor: 'bg-violet-100 text-violet-600 border-violet-200',
    avatarColor: 'bg-violet-50',
    avatarEmoji: '💡',
    status: 'active',
    promptCases: [
      '为618大促设计一套满减+会员专享的促销方案，并匹配不同用户分群',
      '生成3套朋友圈投放素材文案，分别对应新品、清仓、会员日',
      '针对B2B大客户设计阶梯式返利激励政策，输出规则与测算表',
    ],
  },
  {
    id: 'exp-5',
    name: '客服与售后专家',
    nickname: '解忧姐',
    gender: '女',
    desc: '处理退换货、保固咨询、安抚情绪、简化售后流程',
    scenes: ['全场景售后'],
    capabilities: ['订单系统对接', 'FAQ知识库', '情绪识别'],
    tagColor: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    avatarColor: 'bg-emerald-50',
    avatarEmoji: '🛟',
    status: 'active',
    promptCases: [
      '用户收到鞋子开胶要求退货，情绪激动，帮我起草一段安抚并给出处理方案',
      '整理常见保固咨询的FAQ话术，覆盖运动鞋开胶、衣物褪色等情形',
      '把这条退换货流程简化成3步图文指引，降低人工客服介入率',
    ],
  },
  {
    id: 'exp-6',
    name: '数据分析专家',
    nickname: '大表姐',
    gender: '女',
    desc: '输出经营报表、诊断异常指标（如转化率下降原因）',
    scenes: ['管理驾驶舱', '运营复盘'],
    capabilities: ['多源数据整合', '归因分析', '可视化输出'],
    tagColor: 'bg-amber-100 text-amber-600 border-amber-200',
    avatarColor: 'bg-amber-50',
    avatarEmoji: '📊',
    status: 'active',
    promptCases: [
      '输出上周经营数据报告，覆盖GMV、转化率、客单价与环比',
      '本周转化率环比下降15%，帮我做归因分析并列出可能原因优先级',
      '搭建一个运营复盘看板结构，包含核心指标与下钻维度',
    ],
  },
  {
    id: 'exp-7',
    name: 'B2B客户经理专家',
    nickname: '大客户一哥',
    gender: '男',
    desc: '协助处理大客户询价、合同条款、账期查询等B端专属事务',
    scenes: ['B2B销售场景'],
    capabilities: ['客户分级', '历史交易', '合同知识库'],
    tagColor: 'bg-slate-100 text-slate-600 border-slate-200',
    avatarColor: 'bg-slate-50',
    avatarEmoji: '💼',
    status: 'active',
    promptCases: [
      '帮我对A级客户做一份询价响应模板，含阶梯报价与账期方案',
      '查询某大客户的历史交易与回款记录，评估本次授信额度',
      '起草一份标准经销合同的核心条款说明，突出账期与退换政策',
    ],
  },
  {
    id: 'exp-8',
    name: '直播运营专家',
    nickname: '操盘手',
    gender: '男',
    desc: '覆盖直播前中后全链路：策划排品、实时场控、数据复盘',
    scenes: ['品牌自播', '大促直播', '达人合作'],
    capabilities: ['直播中控台对接', '弹幕互动策略', '复盘报告自动生成'],
    tagColor: 'bg-indigo-100 text-indigo-600 border-indigo-200',
    avatarColor: 'bg-indigo-50',
    avatarEmoji: '🎬',
    status: 'active',
    promptCases: [
      '为一场2小时的运动鞋品牌自播设计排品节奏与秒杀节点',
      '直播中弹幕集中问尺码，给我一套即时互动话术与转粉钩子',
      '根据昨晚直播数据生成复盘报告，指出停留与转化的薄弱环节',
    ],
  },
  {
    id: 'exp-9',
    name: '流量投放专家',
    nickname: '老王',
    gender: '女',
    desc: '监控多平台投放计划的ROI、消耗节奏，预警异常波动并给出调优建议',
    scenes: ['日常投流监控', '大促高频调优'],
    capabilities: ['多平台数据看板', 'ROI诊断', '自动调价建议'],
    tagColor: 'bg-cyan-100 text-cyan-600 border-cyan-200',
    avatarColor: 'bg-cyan-50',
    avatarEmoji: '📈',
    status: 'active',
    promptCases: [
      '汇总抖音+小红书本周投放ROI看板，标注消耗异常的计划',
      '某计划CTR正常但转化骤降，帮我诊断并给出调价与素材建议',
      '大促当天高频调优节奏怎么排，给出分时段预算分配方案',
    ],
  },
]
