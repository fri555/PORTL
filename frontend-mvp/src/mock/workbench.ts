import type {
  ApprovalItem,
  AssistantShortcutTab,
  MessageSummaryItem,
  PortalArchitecture,
  PortalCategory,
  PortalCategoryId,
  PortalTone,
  ScheduleItem,
  TodoItem,
  WorkbenchAssistantShortcut,
  WorkbenchPortal,
} from '@/types/workbench'
import { toDateKey } from '@/lib/workbench-calendar'

export const assistantShortcutTabs: Array<{ id: AssistantShortcutTab; label: string }> = [
  { id: 'agents', label: '智能体' },
  { id: 'cases', label: '案例' },
  { id: 'knowledge', label: '知识库' },
]

export const assistantShortcuts: WorkbenchAssistantShortcut[] = [
  { id: 'agent-general', tab: 'agents', name: '全能助手', description: '日常问答、文档处理、工作咨询', meta: '默认助手', icon: 'sparkles', tone: 'coral', targetRoute: '/workspace/chat', prompt: '我想开始一段日常办公会话：' },
  { id: 'agent-data', tab: 'agents', name: '数据分析助手', description: 'Excel、指标、经营数据分析', meta: '经营分析', icon: 'chart', tone: 'blue', targetRoute: '/workspace/chat', prompt: '请帮我分析这份数据，并提炼关键结论：' },
  { id: 'agent-marketing', tab: 'agents', name: '营销方案助手', description: '活动方案、客户提案、团购方案', meta: '方案生成', icon: 'megaphone', tone: 'magenta', targetRoute: '/workspace/chat', prompt: '请帮我生成一份营销/团购方案：' },
  { id: 'agent-knowledge', tab: 'agents', name: '知识问答助手', description: '基于知识库查制度、商品、业务资料', meta: '知识检索', icon: 'book', tone: 'purple', targetRoute: '/workspace/chat', prompt: '请基于知识库回答这个问题：' },
  { id: 'case-weekly', tab: 'cases', name: '写周报', description: '整理本周重点、风险和下周计划', meta: '办公写作', icon: 'file', tone: 'slate', targetRoute: '/workspace/chat', prompt: '请帮我写一份本周工作周报，包含重点进展、风险问题和下周计划。' },
  { id: 'case-group-buy', tab: 'cases', name: '生成团购方案', description: '输出客户方案、货品组合和沟通话术', meta: '销售场景', icon: 'shopping-bag', tone: 'coral', targetRoute: '/workspace/chat', prompt: '请帮我生成一份团购方案，包含预算分档、商品组合和客户沟通话术。' },
  { id: 'case-meeting', tab: 'cases', name: '整理会议纪要', description: '提炼结论、行动项、负责人和截止时间', meta: '会议协同', icon: 'clipboard', tone: 'blue', targetRoute: '/workspace/chat', prompt: '请帮我整理会议纪要，并输出行动项、负责人和截止时间。' },
  { id: 'case-sales', tab: 'cases', name: '分析销售数据', description: '定位波动原因并生成经营建议', meta: '经营分析', icon: 'chart', tone: 'purple', targetRoute: '/workspace/chat', prompt: '请分析销售数据，找出波动原因，并给出经营建议。' },
  { id: 'kb-policy', tab: 'knowledge', name: '制度文档', description: '人事、财务、行政制度查询', meta: '知识中心', icon: 'book', tone: 'slate', targetRoute: '/knowledge' },
  { id: 'kb-product', tab: 'knowledge', name: '商品知识库', description: '商品资料、货品规则和供应链信息', meta: '商品资料', icon: 'database', tone: 'blue', targetRoute: '/knowledge' },
  { id: 'kb-sales', tab: 'knowledge', name: '销售话术库', description: '客户沟通、团购方案和行业案例', meta: '销售支持', icon: 'megaphone', tone: 'coral', targetRoute: '/knowledge' },
  { id: 'kb-project', tab: 'knowledge', name: '项目资料库', description: '需求文档、项目资料和复盘记录', meta: '项目协作', icon: 'folder', tone: 'purple', targetRoute: '/knowledge' },
]

export const portalCategories: PortalCategory[] = [
  { id: 'common', label: '常用' },
  { id: 'all', label: '全部' },
]

type PortalInput = Omit<WorkbenchPortal, 'description' | 'icon' | 'tone'> & {
  description?: string
  icon?: string
  tone?: PortalTone
}

function portal(input: PortalInput): WorkbenchPortal {
  return {
    description: input.department,
    icon: input.icon ?? iconFor(input.categoryIds, input.architecture),
    tone: input.tone ?? toneFor(input.architecture),
    ssoEnabled: false,
    ...input,
  }
}

function iconFor(categories: PortalCategoryId[], architecture: PortalArchitecture) {
  if (categories.includes('data')) return 'chart'
  if (categories.includes('finance')) return 'wallet'
  if (categories.includes('warehouse')) return 'warehouse'
  if (categories.includes('service')) return 'clipboard'
  if (categories.includes('content')) return 'image'
  if (categories.includes('tech')) return 'code'
  if (categories.includes('management')) return 'building'
  if (architecture === 'B2B') return 'blocks'
  if (architecture === 'B2C') return 'store'
  return 'layout'
}

function toneFor(architecture: PortalArchitecture): PortalTone {
  if (architecture === 'B2C') return 'coral'
  if (architecture === 'B2B') return 'blue'
  if (architecture === '对外') return 'cyan'
  return 'purple'
}

export const workbenchPortals: WorkbenchPortal[] = [
  portal({ id: 'self', name: '自营系统', url: 'https://self.xingyunyezi.com/', department: '线上B2C、直播、品牌事业部等', architecture: 'B2C', categoryIds: ['b2c', 'live'], isCommon: true }),
  portal({ id: 'shopapi', name: '自营第三方库存系统', url: 'https://shopapi.xingyunyezi.com/', department: '线上B2C、直播、品牌事业部等', architecture: 'B2C', categoryIds: ['b2c', 'live', 'supply', 'warehouse'] }),
  portal({ id: 'finance-supply', name: '财务供销系统', url: 'https://finance.xingyunyezi.com/', department: '财务二部', architecture: 'B2C', categoryIds: ['finance', 'supply'] }),
  portal({ id: 'operate', name: '新运营系统', url: 'https://operate.xingyunyezi.com/', department: '线上B2C、直播、品牌事业部、视觉部等', architecture: 'B2C', categoryIds: ['b2c', 'live', 'content'], isCommon: true }),
  portal({ id: 'apioms', name: '自营api接口系统', url: 'https://apioms.xingyunyezi.com/', department: '技术部内部和外部合作', architecture: 'B2C', categoryIds: ['tech'] }),
  portal({ id: 'transit', name: '自营拼多多服务商第三方服务中转', url: 'https://transit.xingyunyezi.com/', department: '线上B2C商家、天马运动拼多多商家', architecture: 'B2C', categoryIds: ['b2c', 'tech'] }),
  portal({ id: 'pdd-api', name: '拼多多平台接口项目', url: 'http://pdd.tianmasport.com/cloudServerAPI', department: '平台部', architecture: 'B2B', categoryIds: ['b2b', 'tech'] }),
  portal({ id: 'taobao-api', name: '淘宝平台接口项目', url: 'https://1889.tianmasport.com/', department: '平台部', architecture: 'B2B', categoryIds: ['b2b', 'tech'] }),
  portal({ id: 'member-cdp', name: '会员CDP', url: 'https://sso.tianmasport.com/#/login?redirect=/chooseSystem', department: '线上B2C', architecture: '中台', categoryIds: ['b2c', 'management'] }),
  portal({ id: 'live-system', name: '直播系统', url: 'https://sso.tianmasport.com/#/login?redirect=/chooseSystem', department: '直播部', architecture: '中台', categoryIds: ['live'] }),
  portal({ id: 'guanyuan-bi', name: '数据驾驶舱/观远BI', url: 'https://guanyuan.tianmagroup.com/home/web-app/e20c619cc28074aabbf84ac7', department: '各部门负责人、数据分析人员', architecture: '中台', categoryIds: ['data'], isCommon: true }),
  portal({ id: 'xyyzi-admin', name: '幸运叶子系统', url: 'https://www.xyyzi.com/admin/index/login', department: '线上B2C', architecture: 'B2C', categoryIds: ['b2c'] }),
  portal({ id: 'workorder', name: '工单系统', url: 'https://workorder.tianmagroup.com/#/login', department: '客服部、平台部、商品部、云仓售后、业财支持部', architecture: 'B2C', categoryIds: ['service', 'b2c'], isCommon: true }),
  portal({ id: 'pangu-bi', name: '盘古BI系统', url: 'https://bi.tianmagroup.com/#/login', department: '商品部', architecture: '中台', categoryIds: ['data', 'supply', 'finance'] }),
  portal({ id: 'tm-admin', name: '天马运动管理端', url: 'https://www.tianmasport.com.cn/ms/main.shtml', department: '平台部、商品部、财务部、茵特加盟部', architecture: 'B2B', categoryIds: ['b2b', 'supply', 'finance'], isCommon: true }),
  portal({ id: 'tm-crm', name: '天马运动CRM', url: 'https://www.tianmasport.com.cn/ms/crm/#/login', department: '天马运动平台部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'tm-srm', name: '天马运动SRM', url: 'https://www.tianmasport.com.cn/ms/srm/#/login', department: '天马运动平台部', architecture: 'B2B', categoryIds: ['b2b', 'supply'] }),
  portal({ id: 'tm-nfx', name: '天马运动马达端PC', url: 'https://www.tianmasport.com/ms/nfx/home', department: '平台部、茵特加盟部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'open-old', name: '天马运动马达端开放平台(旧版)', url: 'http://open.xingyunyezi.com', department: '平台部', architecture: 'B2B', categoryIds: ['b2b', 'tech'] }),
  portal({ id: 'open-new', name: '天马运动马达端开放平台(新版)', url: 'https://openproxy.tianmasport.com/open', department: '平台部', architecture: 'B2B', categoryIds: ['b2b', 'tech'] }),
  portal({ id: 'tm-app', name: '天马运动马达端APP', url: 'https://apps.apple.com/cn/app/%E5%A4%A9%E9%A9%AC%E8%BF%90%E5%8A%A8%E5%9B%A2%E8%B4%AD/id1441075957', department: '平台部、茵特加盟部', architecture: 'B2B', categoryIds: ['b2b'], accessHint: 'Android：应用市场搜索“天马运动团购”' }),
  portal({ id: 'tm-mini', name: '天马运动马达端小程序', url: '', department: '平台部、茵特加盟部', architecture: 'B2B', categoryIds: ['b2b'], accessHint: '微信小程序搜“天马运动平台”' }),
  portal({ id: 'supplier', name: '天马运动供应商端', url: 'https://www.tianmasport.com/ms/new/login.shtml', department: '平台部-货源管理部', architecture: 'B2B', categoryIds: ['b2b', 'supply'] }),
  portal({ id: 'supplier-open', name: '天马运动供应商端开放平台', url: 'https://open-supplier.tianmasport.com/open/supplier/', department: '平台部-货源管理部', architecture: 'B2B', categoryIds: ['b2b', 'supply', 'tech'] }),
  portal({ id: 'bbs-front', name: '天马论坛前台系统', url: 'http://bbs.tianmasport.com/forum', department: '天马运动平台部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'bbs-admin', name: '天马论坛管理后台', url: 'http://bbs.tianmagroup.com/data-web/#/login?redirect=%2Fwelcome', department: '天马运动平台部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'big-stock', name: '大库存查询系统', url: 'https://k.xingyunyezi.com/query', department: '线上B2C、直播、品牌事业部等', architecture: 'B2B', categoryIds: ['supply', 'warehouse', 'b2b', 'b2c', 'live'], isCommon: true }),
  portal({ id: 'resource-center', name: '内容中心系统', url: 'https://resource-center.tianmagroup.com/', department: '电商零售部、平台部、商品部', architecture: '中台', categoryIds: ['content', 'supply'], isCommon: true }),
  portal({ id: 'goods-center', name: '商品中心系统', url: 'https://data-gx.xingyunyezi.com/#/dashboard', department: '商品部、优选事业部', architecture: 'B2B', categoryIds: ['supply', 'data'] }),
  portal({ id: 'arkview', name: '极光分析', url: 'http://arkview.tianmagroup.com/uba/dashboards', department: '平台部、幸运叶子、茵特门店、流星马', architecture: '中台', categoryIds: ['data'] }),
  portal({ id: 'tmjxc', name: '财务进销存系统', url: 'https://tmjxc.tianmagroup.com/', department: '财务一部、财务二部', architecture: 'B2C', categoryIds: ['finance', 'warehouse'] }),
  portal({ id: 'wms', name: '仓储系统', url: 'https://wms.xingyunyezi.com/', department: '天马云仓、电商零售部', architecture: 'B2C', categoryIds: ['warehouse', 'b2c'] }),
  portal({ id: 'supplier-wms', name: '仓储代运营系统', url: 'http://supplier.wms.xingyunyezi.com', department: '天马云仓', architecture: 'B2C', categoryIds: ['warehouse'] }),
  portal({ id: 'swms', name: '仓储代运营系统', url: 'https://swms.xingyunyezi.com', department: '天马云仓', architecture: 'B2C', categoryIds: ['warehouse'] }),
  portal({ id: 'lxm-manage', name: '流星马管理端', url: 'https://manage.tianmasaas.com', department: '天马运动平台部/平台销售部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'lxm-tenant', name: '流星马租户端', url: 'https://co.tianmasaas.com', department: '天马运动平台部/平台销售部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'lxm-pos', name: '流星马POS端', url: 'https://pos.tianmasaas.com', department: '天马运动平台部/平台销售部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'lxm-shop', name: '流星马商户端', url: 'https://shop.tianmasaas.com', department: '天马运动平台部/平台销售部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'lxm-agent', name: '流星马代理端', url: 'https://lxmmer.tianmasaas.com/admin', department: '外部代理/平台销售部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'lxm-agent-pos', name: '流星马代理收银端', url: 'https://pos-lxmmer.tianmasaas.com/#/home/index', department: '外部代理/平台销售部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'lxm-franchise', name: '流星马自营和加盟端', url: 'https://lxm.tianmasaas.com/admin', department: '加盟商/平台销售部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'lxm-franchise-pos', name: '流星马自营和加盟收银端', url: 'https://pos-lxm.tianmasaas.com/#/home/index', department: '加盟商/平台销售部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'tmwork', name: '天马企微助手', url: 'https://tmwork.tianmasaas.com/dist/privateKanBan', department: '茵特体育事业部', architecture: 'B2B', categoryIds: ['service', 'b2b'] }),
  portal({ id: 'lanbusport', name: '优选定制系统', url: 'https://www.lanbusport.com/#/home', department: '优选事业部', architecture: 'B2B', categoryIds: ['external', 'b2b'] }),
  portal({ id: 'tiantuan-pc', name: '天团1号PC', url: 'https://www.tiantuan1.com/ms/nfx/tt1Home', department: '天马运动平台部/平台销售部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'tiantuan-mini', name: '天团1号小程序', url: '', department: '天马运动平台部/平台销售部', architecture: 'B2B', categoryIds: ['b2b'], accessHint: '微信小程序搜“天团壹号”' }),
  portal({ id: 'sms', name: '短信平台', url: 'https://sms.tianmasport.com/login', department: '所有公司系统发送短信统一调用', architecture: 'B2B', categoryIds: ['tech', 'management'] }),
  portal({ id: 'go', name: '团购平台', url: 'https://go.tianmagroup.com/', department: '天马运动平台部/平台销售部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'group-mini', name: '团购小程序', url: '', department: '天马运动平台部/平台销售部', architecture: 'B2B', categoryIds: ['b2b'], accessHint: '微信小程序搜“团购助手”' }),
  portal({ id: 'tg-admin', name: '团购平台管理后台', url: 'https://tg.tianmagroup.com/#/programme/combinationGoods', department: '天马运动平台部/平台销售部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'lucky-work', name: '幸运叶子企微助手', url: 'https://lucky-work.xyyzi.com/dist/privateKanBan', department: '线上B2C', architecture: 'B2C', categoryIds: ['b2c', 'service'] }),
  portal({ id: 'lucky-mini', name: '幸运叶子小程序', url: '', department: '线上B2C', architecture: 'B2C', categoryIds: ['b2c'], accessHint: '微信小程序搜“幸运叶子”' }),
  portal({ id: 'lucky-app', name: '幸运叶子APP', url: 'https://apps.apple.com/cn/app/%E5%B9%B8%E8%BF%90%E5%8F%B6%E5%AD%90%E8%BF%90%E5%8A%A8/id1560294878', department: '线上B2C', architecture: 'B2C', categoryIds: ['b2c'], accessHint: 'Android：应用商城搜索“幸运叶子运动”' }),
  portal({ id: 'lucky-pos', name: '幸运叶子收银POS系统', url: 'https://www.xyyzi.com/pos/index/index#/homepage/homepage', department: '茵特体育事业部-幸运叶子跑步组', architecture: 'B2C', categoryIds: ['b2c'] }),
  portal({ id: 'lucky-mobile-pos', name: '幸运叶子移动收银APP', url: '', department: '茵特体育事业部-幸运叶子跑步组', architecture: 'B2C', categoryIds: ['b2c'], accessHint: '联系幸运叶子组技术获取安装包' }),
  portal({ id: 'fitness', name: '幸运运动汇小程序/后台', url: 'https://fitness.tianmagroup.com/fitness/index', department: 'KA事业部-KA客户事业部', architecture: '中台', categoryIds: ['external'] }),
  portal({ id: 'zebra-h5', name: '斑马邦H5商城', url: 'https://lxm.xyyzi.com/h5/?shop_id=90396', department: '品牌中心-Nearpost足球事业部', architecture: 'B2B', categoryIds: ['content', 'external'] }),
  portal({ id: 'jiangsu-run-mini', name: '江苏跑团小程序', url: '', department: 'KA事业部', architecture: '对外', categoryIds: ['external'], accessHint: '微信小程序搜“江苏跑团之家”' }),
  portal({ id: 'jiangsu-run-admin', name: '江苏跑团管理后台', url: 'https://jstjxh.xyyzi.com/run-admin/#/login', department: 'KA事业部', architecture: '对外', categoryIds: ['external'] }),
  portal({ id: 'dragon-boat', name: '中国龙协小程序', url: '', department: 'KA事业部', architecture: '对外', categoryIds: ['external'], accessHint: '微信小程序搜“龙舟通”' }),
  portal({ id: 'ye-sport', name: '耶运动PC官网', url: '', department: '幸运叶子品牌事业部', architecture: 'B2C', categoryIds: ['content', 'b2c'], accessHint: '待开启' }),
  portal({ id: 'ye-cms', name: '耶运动官网CMS中心', url: '', department: '幸运叶子品牌事业部', architecture: 'B2C', categoryIds: ['content'], accessHint: '待开启' }),
  portal({ id: 'group-site', name: '集团官网', url: 'https://www.tianmagroup.com/', department: '人事或战略发展部', architecture: '中台', categoryIds: ['management'] }),
  portal({ id: 'oa', name: 'OA系统', url: 'https://oa.xyyzi.com/oa/#/home', department: '人事主要使用', architecture: '中台', categoryIds: ['management'], isCommon: true }),
  portal({ id: 'zentao', name: '禅道', url: 'https://lyg-tools-zentao.tianmagroup.com/zentao/my.html', department: '技术部', architecture: 'B2B', categoryIds: ['tech'] }),
  portal({ id: 'zentao-hours', name: '禅道工时统计', url: 'https://lyg-tools-zentao.tianmagroup.com/zentao/web/#/dashboard', department: '技术部', architecture: 'B2B', categoryIds: ['tech'] }),
  portal({ id: 'demand', name: '需求管理系统', url: 'https://demand.tianmagroup.com/#/workbench/application', department: '技术部、业务部门提报需求', architecture: '中台', categoryIds: ['tech', 'management'], isCommon: true }),
  portal({ id: 'fishing-agent', name: '垂钓平台代理端', url: 'https://www.laidiaoba.com/index', department: '垂钓事业部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'fishing-admin', name: '垂钓平台管理端', url: 'http://www.laidiaoba.com/tm_manage/main.shtml', department: '垂钓事业部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'fishing-app-admin', name: '垂钓APP后台管理', url: 'http://web-admin.laidiaoba.com/', department: '垂钓事业部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'diaoyu-app', name: '钓愉APP', url: '', department: '垂钓事业部', architecture: 'B2B', categoryIds: ['b2b'], accessHint: '移动端应用入口' }),
  portal({ id: 'xiangmao-mini', name: '响猫小程序', url: '', department: '垂钓事业部', architecture: 'B2B', categoryIds: ['b2b'], accessHint: '微信小程序搜“响猫”' }),
  portal({ id: 'anchor-talent', name: '江苏主播人才库', url: '', department: 'KA事业部', architecture: '中台', categoryIds: ['external'], accessHint: '开发中' }),
  portal({ id: 'intersport-online', name: '茵特加盟招商官网', url: 'http://www.intersport.online/index.php/', department: '茵特体育事业部', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'order-center', name: '订单中心', url: '', department: '线上B2C、线上B2B', architecture: 'B2B', categoryIds: ['b2b', 'b2c', 'warehouse'], accessHint: '后端服务' }),
  portal({ id: 'tzj-merchant', name: '天之捷商户服务', url: '', department: '商户服务', architecture: 'B2B', categoryIds: ['b2b'], accessHint: '微信小程序搜“天之捷商户服务”' }),
  portal({ id: 'old-crm', name: '老版本的crm_web', url: 'https://xyyzcrm.tianmasport.com/crm/login.shtml', department: '平台业务', architecture: 'B2B', categoryIds: ['b2b'] }),
  portal({ id: 'suti', name: '苏体项目', url: 'https://fitness.tianmagroup.com/fitness/login?redirect=%2Findex', department: 'KA事业部', architecture: '对外', categoryIds: ['external'] }),
]

const todayKey = toDateKey(new Date())

export const workbenchSchedules: ScheduleItem[] = [
  { id: 'schedule-1', date: todayKey, start: '09:00', end: '10:30', title: '产品需求评审会', location: '会议室 A-201', participantCount: 8, status: '进行中' },
  { id: 'schedule-2', date: todayKey, start: '11:00', end: '12:00', title: '项目周会', location: '会议室 A-201', participantCount: 12, status: '即将开始' },
  { id: 'schedule-3', date: todayKey, start: '14:00', end: '15:30', title: '客户方案沟通', location: '会议室 B-305', participantCount: 5, status: '即将开始' },
  { id: 'schedule-4', date: todayKey, start: '16:00', end: '17:00', title: '团队复盘会', location: '会议室 A-201', participantCount: 7, status: '未开始' },
  { id: 'schedule-5', date: todayKey, start: '17:30', end: '18:00', title: '供应链库存同步', location: '线上会议', participantCount: 4, status: '未开始' },
  { id: 'schedule-6', date: todayKey, start: '19:00', end: '19:30', title: '直播数据复盘', location: '飞书会议', participantCount: 6, status: '未开始' },
]

export const workbenchTodos: TodoItem[] = [
  { id: 'todo-1', title: '撰写项目需求文档', scopes: ['responsible'], due: '今天 18:00 截止', priority: '高', status: '待处理', source: '需求管理', owner: '张明', creator: '李娜', assignee: '张明', latestUpdate: '10 分钟前更新', completed: false },
  { id: 'todo-2', title: '设计评审材料准备', scopes: ['responsible', 'created'], due: '今天 17:00 截止', priority: '高', status: '已逾期', source: 'AI 会话', owner: '张明', creator: '张明', assignee: '张明', latestUpdate: '30 分钟前更新', risk: '已逾期 1 小时', completed: false },
  { id: 'todo-3', title: '客户反馈跟进', scopes: ['assigned'], due: '明天 10:00 截止', priority: '中', status: '进行中', source: '工单系统', owner: '王杰', creator: '张明', assignee: '王杰', latestUpdate: '王杰已更新进展', risk: '明天上午到期', completed: false },
  { id: 'todo-4', title: '项目周报提交', scopes: ['created'], due: '明天 18:00 截止', priority: '普通', status: '待处理', source: '人工创建', owner: '陈晨', creator: '张明', assignee: '陈晨', latestUpdate: '等待提交', completed: false },
  { id: 'todo-5', title: '团队复盘材料准备', scopes: ['responsible'], due: '周五 18:00 截止', priority: '普通', status: '待处理', source: '会议纪要', owner: '张明', creator: '赵伟', assignee: '张明', latestUpdate: '昨天更新', completed: false },
  { id: 'todo-6', title: '团购方案报价确认', scopes: ['assigned'], due: '07/20 12:00 截止', priority: '中', status: '进行中', source: 'AI 会话', owner: '刘洋', creator: '张明', assignee: '刘洋', latestUpdate: '报价待确认', risk: '客户本周五要初稿', completed: false },
  { id: 'todo-7', title: '整理商品知识库目录', scopes: ['created', 'assigned'], due: '07/22 18:00 截止', priority: '普通', status: '已完成', source: '知识中心', owner: '周琪', creator: '张明', assignee: '周琪', latestUpdate: '已完成归档', completed: true },
]

export const workbenchMessageSummaries: MessageSummaryItem[] = [
  {
    id: 'msg-1',
    sender: '张总',
    source: '单聊',
    unreadCount: 3,
    priority: '高',
    reason: '单聊 + @我 + 高优先发送人',
    summary: '询问产品需求评审时间是否确认，需要今天上午给出反馈。',
    actionHint: '建议立即回复',
  },
  {
    id: 'msg-2',
    sender: '项目 Alpha 群',
    source: '群聊',
    unreadCount: 12,
    priority: '中',
    reason: '群聊未读较多 + 包含需求材料变更',
    summary: '评审材料有新版附件，技术侧要求补充接口影响说明。',
    actionHint: '今日内处理',
  },
  {
    id: 'msg-3',
    sender: '运营通知群',
    source: '群聊',
    unreadCount: 8,
    priority: '低',
    reason: '免打扰群 + 通知类消息',
    summary: '今晚 23:00 有系统维护通知，不影响当前工作安排。',
    actionHint: '空闲时查看',
  },
]

export const workbenchApprovals: ApprovalItem[] = [
  {
    id: 'approval-1',
    title: '采购预算申请',
    scope: 'pending',
    applicant: '李娜',
    due: '今天 16:00 截止',
    priority: '高',
    status: '待处理',
    source: 'OA审批',
  },
  {
    id: 'approval-2',
    title: '用车申请',
    scope: 'pending',
    applicant: '王杰',
    due: '今天 18:00 截止',
    priority: '中',
    status: '待处理',
    source: 'OA审批',
  },
  {
    id: 'approval-3',
    title: '合同用印申请',
    scope: 'done',
    applicant: '陈晨',
    due: '昨天已处理',
    priority: '普通',
    status: '已完成',
    source: 'OA审批',
  },
  {
    id: 'approval-4',
    title: '外出申请',
    scope: 'initiated',
    applicant: '张明',
    due: '审批中',
    priority: '普通',
    status: '进行中',
    source: 'OA审批',
  },
  {
    id: 'approval-5',
    title: '订单付款审核',
    scope: 'cc',
    applicant: '财务二部',
    due: '抄送给我',
    priority: '中',
    status: '待处理',
    source: 'OA审批',
  },
]
