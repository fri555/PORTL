import type { AgentCategory } from '@/types/agent'

/** DingTalk 数智员工文档 revision 3728. IDs below are local catalog IDs. */
export interface BusinessExpertProfile {
  id: string
  name: string
  category: AgentCategory
  description: string
  systems: string[]
  input: string
  output: string
  limits: string
  quickCommands: string[]
  internetEnabled?: boolean
  knowledgeNames: string[]
  supportedFileFormats?: string[]
  firstPublishedAt: string
  developerName: string
  developerDepartment: string
  useDepartments: string[]
}

export const businessExpertSourceUrl = 'https://alidocs.dingtalk.com/i/nodes/YndMj49yWjPBdbgwub556KwAJ3pmz5aA?utm_scene=team_space'
export const businessExpertSourceRevision = 3728

/** 耶虎 belongs to 日常办公 and is excluded from the business expert catalog. */
export const dailyAssistantProfile: BusinessExpertProfile = {
  id: 'daily-assistant', name: '耶虎', category: 'finance_admin',
  description: '默认智能体，通用问答、协作、文件处理与钉钉协同',
  systems: ['钉钉生态', '商品数据中心', '知识库', '联网搜索'],
  input: '通用问题、写作需求、用户附件，以及钉钉日程、待办或消息协同需求。',
  output: '问答、文案、文件要点、工作汇报或会议记录，以及日程、待办和消息协同结果。',
  limits: '暂未接入自营、大库存等业务系统数据。',
  quickCommands: ['知识库中查下关于「鞋服配」的内容，并输出一份报告', '查下我今天的钉钉日程'],
  internetEnabled: true, knowledgeNames: ['公共空间知识库', '个人可见知识库'],
  supportedFileFormats: undefined, firstPublishedAt: '2026-08-07',
  developerName: '张三', developerDepartment: '平台部', useDepartments: ['平台部'],
}

/** Overview rows 2–19, in source order. Unknown publication dates stay blank. */
export const businessExpertProfiles: BusinessExpertProfile[] = [
  {
    id: 'biz-01', name: '数据分析师', category: 'finance_admin',
    description: '上传数据表格进行分析，诊断异常指标，提供数据洞察及建议',
    systems: ['联网查询'],
    input: '上传业务数据表，并说明店铺、分析周期、核心指标及分析需求。',
    output: '核心结论、运营调整建议，以及支持筛选和查看明细的交互图表或 HTML 报告。',
    limits: '无业务系统直连，暂未接入自营、大库存、观远 BI 等业务系统数据。关键数字与结论需人工复核；超大行数表格解析较慢。',
    quickCommands: ['拆解店铺日/月经营数据，分析店铺全周期核心指标，给出运营调整建议，并制作可视化 HTML 报告'],
    internetEnabled: true, knowledgeNames: ['行业案例库', '产品知识库'], supportedFileFormats: ['pdf', 'xlsx', 'csv'], firstPublishedAt: '',
    developerName: '张三', developerDepartment: '财务部', useDepartments: ['平台部'],
  },
  {
    id: 'biz-02', name: '组货专家', category: 'tech_dev',
    description: '依照需求生成组货方案，包含预算、人数、性别比例和品类等需求',
    systems: ['团购商品池', '天马运动'],
    input: '单人预算、预计人数、品类、品牌、男女同款要求及需求场景；支持后续调整。',
    output: 'TOP5 组货方案，包含商品明细、分色分尺码库存、经营数据及风险提示。',
    limits: '一期仅支持标准模板匹配，未打通订单、履约、财务系统，自定义智能组货属二期。按库存倍率≥1.5、毛利率≥5%、配货率≥80%校验货源，不足则剔除；无合格商品时给最接近参考并标差异，需求冲突时提示调整。方案需组货专员复核；方案套数与精简度仍在打磨。',
    quickCommands: ['客户预算 900 元上下、要 1100 双男女同款高端跑鞋，帮我组货', '预算改成 700 再匹配', '减一个品类，加袜子'],
    internetEnabled: true, knowledgeNames: ['团购商品池', '行业案例库'], supportedFileFormats: ['pdf', 'xlsx'], firstPublishedAt: '',
    developerName: '李四', developerDepartment: '平台部', useDepartments: ['平台部'],
  },
  {
    id: 'biz-03', name: '评论分析师', category: 'customer_service',
    description: '分析店铺评价数据（包含淘宝、天猫、京东），从客户评价出发，得出改进建议。',
    systems: ['自营系统'],
    input: '淘宝、天猫或京东店铺、时间区间，以及需要分析的评价问题。',
    output: '评价分析、差评问题归类、改进建议及支持筛选的交互图表报告。',
    limits: '覆盖淘宝、天猫、京东评价数据。定时自动生成日报仍为需求方向，尚未上线。',
    quickCommands: ['分析 XX 店铺近 7 天的差评，按问题类型归类'],
    internetEnabled: true, knowledgeNames: ['行业案例库', '竞品分析库'], supportedFileFormats: ['pdf', 'xlsx', 'csv'], firstPublishedAt: '',
    developerName: '王五', developerDepartment: '品牌中心', useDepartments: ['品牌中心'],
  },
  {
    id: 'biz-04', name: '营销图文设计师', category: 'retail_ops',
    description: '智能生成营销图文，依据商品货号及发布平台（微信、小红书、抖音等）',
    systems: ['商品中心', '内容中心'],
    input: '商品货号、发布平台和内容方向；可上传 JPG/JPEG 图片用于生图。',
    output: '微信群发、朋友圈、小红书、公众号、抖音或视频号文案，以及海报和种草配图。',
    limits: '对外发布前建议人工审核内容真实性。',
    quickCommands: ['根据货号 XXX 生成小红书种草图文', '给我生成 4 张产品海报', '写一段发微信群发的促销文案'],
    internetEnabled: true, knowledgeNames: ['产品知识库', '设计素材库'], supportedFileFormats: ['pdf', 'png', 'jpg', 'jpeg'], firstPublishedAt: '',
    developerName: '赵六', developerDepartment: '线下业务部', useDepartments: ['线下业务部'],
  },
  {
    id: 'biz-05', name: '销售订单分析师', category: 'tech_dev',
    description: '基于订单数据进行分析，结合客户信息，从五维度进行综合归因分析',
    systems: ['天马运动平台'],
    input: '订单分析周期、客户或商品维度，以及销售趋势、归因或流失风险问题。',
    output: '成交结构、客户分层、品类渗透、区域覆盖和复购节奏分析，以及待跟进客户名单。',
    limits: '严格基于当前用户可见客户分析。订单大数据权限接口已上线，客户属性权限接口开发中。订单数据每晚定时更新，非实时；单次日期范围有上限，订单类最长 31 天，超出会提示。',
    quickCommands: ['本月销售额与上月对比如何，异常波动在哪', '识别一下近期可能流失的重点客户', '按品类做营收归因，看哪些品类在拖后腿、资源该投向哪里'],
    internetEnabled: true, knowledgeNames: ['行业案例库', '竞品分析库'], supportedFileFormats: ['pdf', 'xlsx', 'csv'], firstPublishedAt: '',
    developerName: '孙七', developerDepartment: '平台部', useDepartments: ['平台部'],
  },
  {
    id: 'biz-06', name: '现货销售分析师', category: 'supply_chain',
    description: '基于销售明细表分析，理解用户意图，查询整理数据并进行智能解读。',
    systems: ['店铺销售明细宽表'],
    input: '平台、品牌、品类、分析时间及销售额、毛利率或退货率等查询需求。',
    output: '销售数据查询结果、核心指标表格及经营数据解读。',
    limits: '需要观远 BI 相关数据权限。指标计算需与渠道看板人工取数口径一致，关键结论建议抽查复核。',
    quickCommands: ['上周淘天平台销售额最高的品牌是哪个，毛利率多少'],
    internetEnabled: true, knowledgeNames: ['行业案例库', '产品知识库'], supportedFileFormats: ['pdf', 'xlsx', 'csv'], firstPublishedAt: '',
    developerName: '周八', developerDepartment: '商品运营中心', useDepartments: ['商品运营中心'],
  },
  {
    id: 'biz-07', name: '全网比价助手', category: 'customer_service',
    description: '商品价格全网对比，获取商品在各平台（淘宝、天猫、京东、拼多多、抖音、唯品会）的最低折扣价',
    systems: ['买手网站'],
    input: '商品货号、品牌等关键信息，以及需要对比的平台或货号清单。',
    output: '淘宝、天猫、京东、拼多多、抖音、唯品会的价格与优惠对比，以及交互分析报告。',
    limits: '建议单次不超过 20 个货号。依赖 maishou88.com 第三方数据及标题搜索，准确性可能不高，数据源可能收费或变动；重要定价决策需人工核验。',
    quickCommands: ['查一下货号 XXXX 在天猫/京东/拼多多的当前售价和优惠券', '帮我对比这批货号的全网价格，出个报告'],
    internetEnabled: true, knowledgeNames: ['竞品分析库', '产品知识库'], supportedFileFormats: ['pdf', 'xlsx'], firstPublishedAt: '',
    developerName: '张三', developerDepartment: '品牌中心', useDepartments: ['品牌中心'],
  },
  {
    id: 'biz-08', name: 'TOP款分析师', category: 'customer_service',
    description: '分析店铺周期TOP款数据，依据自营系统商品看板数据，诊断经营问题并提供解决方案',
    systems: ['自营系统'],
    input: '单个店铺、分析周期、TOP 款数量或重点货号/链接，以及经营诊断问题。',
    output: '店铺商品及链接维度的 TOP 款分析、经营趋势判断、动作建议和可视化报告。',
    limits: '自营权限管理员可查看所有店铺；其他用户需有对应店铺权限。仅支持单店铺 TOP 货号分析，暂不支持批量任务。TOP 款可按周期销量前 N 或日销 5 件以上定义；切款、锁仓等动作需店长确认。',
    quickCommands: ['分析某店铺本周 TOP10 款的经营情况，哪些需要补货或切款', '这个链接销量下滑，帮我诊断原因'],
    internetEnabled: true, knowledgeNames: ['行业案例库', '竞品分析库', '产品知识库'], supportedFileFormats: ['pdf', 'xlsx'], firstPublishedAt: '',
    developerName: '李四', developerDepartment: '品牌中心', useDepartments: ['品牌中心'],
  },
  {
    id: 'biz-09', name: '视频脚本大师', category: 'marketing',
    description: '拆解抖音视频生成脚本，上传视频或链接，拆解视频背后的脚本，并支持进行复刻仿写',
    systems: ['抖音平台'],
    input: '抖音短视频链接或本地上传视频；仿写时补充商品货号。',
    output: '视频爆款要素分析、脚本拆解及结合商品信息的脚本仿写。',
    limits: '目前仅支持单个视频拆解和仿写，暂不支持批量任务。链接仅支持抖音，其他平台需先下载为本地视频再上传。',
    quickCommands: ['根据选择的视频文件帮我拆解出视频爆款要素分析报告', '根据选择的视频文件进行仿写'],
    internetEnabled: undefined, knowledgeNames: ['短视频案例库', '爆款脚本库'], supportedFileFormats: ['pdf', 'xlsx', 'png', 'jpg'], firstPublishedAt: '',
    developerName: '王五', developerDepartment: '直播部', useDepartments: ['直播部'],
  },
  {
    id: 'biz-10', name: '企微沟通分析师', category: 'tech_dev',
    description: '基于企微会话记录分析，产出分部门客户沟通分析报告：意图分布、群聊话题、消息类型与时段热力、风险信号、客户诉求明细。（支持单聊/群聊）',
    systems: ['CRM系统'],
    input: '起止日期、部门、单聊或群聊类型，以及意图、话题或风险分析需求。',
    output: '分部门沟通意图、话题、消息类型、时间热力与风险分析；Markdown/HTML 报告默认脱敏姓名等个人信息。',
    limits: '单次分析期含首尾最长 31 天，超长需拆分。缺失日期如实披露，不以 0 填补。分部门统计依赖员工花名册，无法映射的记录归入"未归属"；自动判定的意图和话题建议人工复核。',
    quickCommands: ['分析上周销售部的单聊会话意图分布', '按部门统计上个月客户咨询热点，并识别风险沟通'],
    internetEnabled: undefined, knowledgeNames: ['行业案例库', '产品知识库'], supportedFileFormats: ['pdf', 'xlsx', 'csv'], firstPublishedAt: '',
    developerName: '赵六', developerDepartment: '平台部', useDepartments: ['平台部'],
  },
  {
    id: 'biz-11', name: '跟进记录分析师', category: 'tech_dev',
    description: '客户跟进情况闭环分析，覆盖出差拜访需求识别+转化效率 + 客户需求履约追踪分析，输出需求转化看板、拜访质量分与断裂预警清单。',
    systems: ['CRM系统'],
    input: '出差、跟进与订单分析的起止日期，以及客户、销售、区域或需求履约问题。',
    output: '出差 ROI 与转化分析、拜访质量分、交互 HTML 履约看板和按风险排序的断裂预警清单。',
    limits: '出差、跟进、订单及客户属性均按当前登录用户权限获取，范围外客户不纳入。内部数据实时抽取，缺失明确标注；金额以万元保留两位小数。跟进与订单按天存储，需指定起止日期，长跨度建议分段。',
    quickCommands: ['最近三个月出差效果怎么样，有没有推动客户下单？'],
    internetEnabled: undefined, knowledgeNames: ['行业案例库', '竞品分析库'], supportedFileFormats: ['pdf', 'xlsx'], firstPublishedAt: '',
    developerName: '孙七', developerDepartment: '平台部', useDepartments: ['平台部'],
  },
  {
    id: 'biz-12', name: '商品问数/分货专家', category: 'supply_chain',
    description: '商品库存与销售数据问数分析，同时支持商品渠道分配完整方案。',
    systems: ['库存状况表', '店铺销售明细', '得物流速表'],
    input: '货号或上传货号清单；问数时说明品牌、平台、时间、店铺及需要统计的指标。',
    output: '首轮推荐店铺、每店预估安全库存及分配原因，以及商品/店铺销售和库存统计结果。',
    limits: '仅查询当前账号有权限的品牌与平台。库存数量与库销比以库存状况表为准；模糊问法会限定返回条数，统计需求需描述具体条件。未覆盖的得物主图、外部市场数据会跳过或注明。',
    quickCommands: ['帮我把货号 EG4958 做首轮分货推荐'],
    internetEnabled: undefined, knowledgeNames: ['产品知识库', '行业案例库'], supportedFileFormats: ['pdf', 'xlsx', 'csv'], firstPublishedAt: '',
    developerName: '周八', developerDepartment: '商品运营中心', useDepartments: ['商品运营中心'],
  },
  {
    id: 'biz-13', name: '商品信息查询助手', category: 'customer_service',
    description: '商品信息对话式查询问数，支持查询出目标商品的基础信息（名称、规格、价格，材质，卖点）、商品标签、库存等。',
    systems: ['大库存系统', '商品中心'],
    input: '货号、品名、品牌、类目、价格、尺码或仓库等条件的任意组合。',
    output: '商品信息、属性、卖点、库存及运营备注；九页签交互 HTML 商品卡、仓库×尺码库存矩阵和相似/系列款推荐。',
    limits: '查询条件模糊时，具体明细限定返回 20 条，统计需求需说明具体条件。评价与策略的天马自有数据较少，更多来自行业知识；接口未覆盖时生成的内容标注"需人工复核"。',
    quickCommands: ['查询EG4958', '阿迪达斯有多少女款黑色运动鞋'],
    internetEnabled: undefined, knowledgeNames: ['产品知识库', '竞品分析库'], supportedFileFormats: ['pdf', 'xlsx'], firstPublishedAt: '',
    developerName: '张三', developerDepartment: '品牌中心', useDepartments: ['品牌中心'],
  },
  {
    id: 'biz-14', name: '运动健康专家', category: 'retail_ops',
    description: '基于专业知识，提供科学运动指导（减脂/增肌/训练计划/热身拉伸/营养）、运动损伤评估以及分阶段康复科普。',
    systems: ['技能知识库', '联网检索'],
    input: '运动目标、基础、训练频次、器械和伤史；或疼痛部位、诱发动作、体感特征，可附照片或检查报告。',
    output: '科学运动指导、训练与营养参考、潜在损伤"可能提示"、紧急程度分级及护理康复科普。',
    limits: '仅供科普和教育参考，不构成医学诊断或治疗建议。危险信号命中时只给急诊指引；康复动作须在无痛范围完成。',
    quickCommands: ['我运动时膝关节突然听到"砰"一声，很快肿起来，站不稳，该怎么办', '我打球落地时脚踝扭了，外侧肿胀能走路但疼，该怎么急性处理？多久能恢复运动', '我想减脂，给我一套有氧+力量结合的一周安排，以及每天的营养配比和热量缺口建议'],
    internetEnabled: true, knowledgeNames: ['运动科学知识库', '损伤康复科普库'], supportedFileFormats: ['pdf', 'docx'], firstPublishedAt: '',
    developerName: '李四', developerDepartment: '线下业务部', useDepartments: ['线下业务部'],
  },
  {
    id: 'biz-15', name: '门店经营分析师', category: 'retail_ops',
    description: '基于新零售系统数据，开展线下门店经营复盘、分析报告、策略建议与库存策略分析。',
    systems: ['新零售系统'],
    input: '权限内目标门店、时间范围，以及环比、同比或预算目标等对比基准。',
    output: '经营复盘、七模块 HTML 报告、经营和库存策略、多店对比总结及预警清单。',
    limits: '门店范围以流星马系统权限为准，权限外门店不做分析。未对接维度（如部分商品、会员明细）会标注数据缺口，并提示补齐后重跑。',
    quickCommands: ['帮我把 A 店和 B 店上个季度做一次对比复盘，输出两份报告加对比总结', '帮我分析华东区 8 月所有门店的经营情况，逐店出报告', '帮我看看店里哪些商品快缺货了，出一份补货清单'],
    internetEnabled: undefined, knowledgeNames: ['行业案例库', '产品知识库'], supportedFileFormats: ['pdf', 'xlsx', 'csv'], firstPublishedAt: '',
    developerName: '王五', developerDepartment: '线下业务部', useDepartments: ['线下业务部'],
  },
  {
    id: 'biz-16', name: '综合画像分析师', category: 'tech_dev',
    description: '基于CRM系统订单RFM分层/品类集中度、企微沟通情绪、行为转化漏斗、跟进与出差互动、企微绑定关系、外部全网情报分析客户画像。',
    systems: ['CRM系统', '订单中心', '客户中心', '企微会话', '跟进/出差记录', '行为轨迹', '外部公开情报'],
    input: '客户或客户群体、分析时间窗口和所需模块；支持对比、批量画像、Top-N 排名与下钻。',
    output: 'RFM、品类集中度、情绪、行为漏斗、价值标签及风险/增长机会分析；明确要求时生成 HTML 报告。',
    limits: '默认输出文字结论，明确要求生成报告或导出 HTML 才生成报告。情绪分析的反讽识别有限，仅标记嫌疑。金额统一万元、两位小数和千分位，数字由引擎计算；退货率、利润率、任务完成率、NPS 等因缺数据源默认不计算。输出披露数据范围、权限过滤及无法计算指标。',
    quickCommands: ['分析XXX的客户综合画像', '给我销售额前 20 的客户排名，并对前 5 名逐个做深度分析', '挖掘这家客户近三个月企微会话和跟进记录里的核心诉求与风险', '分析近 30 天行为轨迹的搜索热词与品牌偏好', '对比这几家客户的标签体系和价值分层'],
    internetEnabled: true, knowledgeNames: ['行业案例库', '竞品分析库', '客户画像库'], supportedFileFormats: ['pdf', 'xlsx', 'csv'], firstPublishedAt: '',
    developerName: '赵六', developerDepartment: '平台部', useDepartments: ['平台部'],
  },
  {
    id: 'biz-17', name: 'AI标题大师', category: 'customer_service',
    description: '根据货号+店铺，结合商品信息与平台规则，生成符合规范的标题（5个/货号）。',
    systems: ['自营系统', '新运营系统', '商品数据中心'],
    input: '商品货号，以及对应店铺或平台。',
    output: '每个货号 5 个结合商品信息、平台违禁词和店铺前缀规则的标题。',
    limits: '必须选择对应平台或店铺；各店铺违禁词可能不同，部分店铺有前缀规则。',
    quickCommands: ['给天猫茵特的这个货号 EG4958 生成个不错的标题'],
    internetEnabled: undefined, knowledgeNames: ['产品知识库', '平台规则库'], supportedFileFormats: ['pdf', 'docx'], firstPublishedAt: '',
    developerName: '孙七', developerDepartment: '品牌中心', useDepartments: ['品牌中心'],
  },
  {
    id: 'biz-18', name: '链接分析师', category: 'customer_service',
    description: '分析淘天和京东对应店铺的链接创建时间内的数据表现，也支持用户输入部分链接ID进行分析链接表现/看链接转化率的分析。',
    systems: ['自营系统', '生意参谋', '万象台', '京东商智', '京准通'],
    input: '淘天或京东店铺、链接 ID/明细或新品链接创建周期，以及观察时间窗口。',
    output: '链接访客、浏览量、销量、销售表现与转化分析，以及 TXT、12 章节交互 HTML 报告和最多 18 Sheet 的 Excel 明细。',
    limits: '数据周期建议 15 天内以控制数据量。目前仅支持淘天和京东；淘天经营及付费数据来自生意参谋、万象台，京东来自京东商智、京准通。',
    quickCommands: ['输入店铺和具体链接明细，以及观察时间周期。', '输入店铺和具体新品链接周期，以及观察时间周期。', '输出整体报告，包括TXT报告、HTML报告、Excel明细报告'],
    internetEnabled: undefined, knowledgeNames: ['行业案例库', '竞品分析库'], supportedFileFormats: ['pdf', 'xlsx', 'csv'], firstPublishedAt: '',
    developerName: '周八', developerDepartment: '品牌中心', useDepartments: ['品牌中心'],
  },
]
