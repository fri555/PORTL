const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), 'docs', '需求文档', 'assets', '20260823-v1.2流程图XML');
fs.mkdirSync(outDir, { recursive: true });

const palette = {
  start: ['#DDF3DC', '#2E8B57', '#176B2C'], process: ['#EAF3FF', '#2F80ED', '#1554A0'],
  system: ['#EEF0FF', '#5B6EE1', '#3346A8'], decision: ['#FFF3E6', '#FF7A1A', '#D95D00'],
  success: ['#EAF8EA', '#2E9D46', '#1D7A32'], failure: ['#FFF0F0', '#EF4444', '#C62828'],
  note: ['#FFFBEA', '#D7A900', '#806400'],
};
const W = 900, diagrams = [];
const n = (id, text, type, row, col = 0, w = 280, h = 60) => ({ id, text, type, row, col, w, h });
const e = (from, to, label = '', kind = 'normal', dashed = false) => ({ from, to, label, kind, dashed });
const d = (name, title, nodes, edges) => diagrams.push({ name, title, nodes, edges });

d('00-系统架构图', '天马智擎 V1.2 系统架构', [
  n('client','访问端\nWeb · 钉钉工作台','process',0,0,360,68),
  n('app','应用层\n首页 · 会话详情 · 设置 · 知识中心','process',1,0,430,72),
  n('gateway','接入与公共服务\nAPI网关 · 身份认证 · 文件能力配置 · 权限鉴权','note',2,0,520,78),
  n('agent','Agent服务\n会话编排 · ReAct · 澄清卡 · 工具路由','system',3,-1,330,78),
  n('knowledge','知识服务\n解析 · 切片 · 向量化 · 混合检索','system',3,1,330,78),
  n('media','图片与文档工具\nDeepSeek视觉模型 · OCR · 格式转换 · 沙箱','system',4,-1,350,82),
  n('dws','业务工具服务\n钉钉dws · MCP · Tool','system',4,1,320,76),
  n('storage','数据层\n业务库 · OSS · 向量库 · 缓存','process',5,0,420,72),
  n('ops','平台治理\n模型管理 · 用量计费 · 审计 · 日志 · 监控','note',6,0,450,72),
], [e('client','app'),e('app','gateway'),e('gateway','agent'),e('gateway','knowledge'),e('agent','media'),e('agent','dws'),e('knowledge','media'),e('agent','storage'),e('knowledge','storage'),e('media','storage'),e('dws','storage'),e('storage','ops')]);

d('01-总体业务流程图', '天马智擎 V1.2 总体业务流程', [
  n('s','开始','start',0), n('msg','用户发起会话，可附带文件','process',1), n('att','是否有附件？','decision',2),
  n('oss','附件上传OSS\n进入会话详情后按需处理','system',3,1), n('agent','Agent识别任务与所需能力','process',4),
  n('clarify','是否缺少必要信息？','decision',5), n('card','展示一张完整澄清卡','process',6,1),
  n('route','检索知识 / 调用工具 / 使用视觉模型','system',7,0,390,68), n('write','是否为外部写操作？','decision',8),
  n('confirm','展示确认卡并等待用户确认','process',9,1), n('result','生成回答、文件或真实操作结果','success',10), n('end','结束','start',11),
], [e('s','msg'),e('msg','att'),e('att','oss','是','success'),e('att','agent','否'),e('oss','agent'),e('agent','clarify'),e('clarify','card','是','success'),e('clarify','route','否'),e('card','route'),e('route','write'),e('write','confirm','是','success'),e('write','result','否'),e('confirm','result'),e('result','end')]);

d('02-文件全生命周期与影响链', '文件全生命周期与跨模块影响链', [
  n('s','用户选择文件','start',0), n('policy','读取统一文件能力配置','system',1), n('scene','使用场景？','decision',2),
  n('chat','会话附件\n≤10个；批次≤1GB','process',3,-1,290,68), n('knowledge','知识库上传\n≤100个；批次≤2GB','process',3,1,290,68),
  n('oss1','校验后上传OSS','system',4,-1), n('oss2','校验后上传OSS','system',4,1),
  n('detail','进入会话详情并发起任务','process',5,-1), n('ingest','扫描 → 图片/文档解析 → 文本切片\n→ Embedding → 索引','system',5,1,330,84),
  n('context','图片切换视觉模型\n文档进入上下文或沙箱','success',6,-1,300,72), n('ready','索引完成，状态变为可检索','success',6,1,300,68),
  n('change','权限、移动或删除？','decision',7), n('sync','同步目录、权限、索引元数据\n和衍生数据','system',8,0,360,72),
  n('use','会话使用 / 公共+个人知识检索','process',9,0,360), n('audit','分场景统计用量、成本与状态','note',10,0,360), n('end','结束','start',11),
], [e('s','policy'),e('policy','scene'),e('scene','chat','会话附件'),e('scene','knowledge','知识库文件'),e('chat','oss1'),e('knowledge','oss2'),e('oss1','detail'),e('oss2','ingest'),e('detail','context'),e('ingest','ready'),e('context','change'),e('ready','change'),e('change','sync','是'),e('change','use','否','success'),e('sync','use'),e('use','audit'),e('audit','end')]);

d('M1-图片全量视觉模型', 'M1 图片全量切换DeepSeek视觉模型', [
  n('s','开始','start',0), n('upload','首页选择PNG/JPG/JPEG图片\n并上传OSS','process',1,0,330,72),
  n('detail','进入会话详情并发送任务','process',2), n('valid','真实格式、大小和尺寸合规？','decision',3),
  n('reject','拒绝当前图片并说明原因','failure',4,1), n('file','组织用户问题、会话上下文和图片','system',5,0,340,68),
  n('switch','当前会话全量切换至\ndeepseek-v4-flash-vision-exp','system',6,0,370,76),
  n('model','视觉模型统一处理\n会话文本、图片和后续轮次','process',7,0,340,72),
  n('usage','记录图片数、视觉Token、文本Token\n耗时和调用成本','note',8,0,370,72),
  n('answer','返回回答或任务产物','success',9), n('end','结束','start',10),
], [e('s','upload'),e('upload','detail'),e('detail','valid'),e('valid','reject','否','failure'),e('reject','end'),e('valid','file','是','success'),e('file','switch'),e('switch','model'),e('model','usage'),e('usage','answer'),e('answer','end')]);

d('M2-文件上传与格式路由', 'M2 文件数量、大小与格式路由', [
  n('s','开始','start',0), n('select','用户选择文件','process',1), n('scene','上传场景？','decision',2),
  n('chatRule','会话：≤10个；批次≤1GB\n图片累计≤200MB','system',3,-1,300,72), n('kbRule','知识库：≤100个；批次≤2GB\n上传并发≤5','system',3,1,300,72),
  n('mime','逐个校验后缀、MIME和文件头','process',4),
  n('rule','单文件规则\nPNG/JPG/JPEG图片≤50MB\n办公文件/HTML/PPT(X)/EMMX≤50MB','system',5,0,430,92),
  n('valid','大小、数量与类型均合规？','decision',6), n('reject','仅拒绝当前文件并说明原因','failure',7,1), n('oss','上传OSS；每个文件独立进度','process',8),
  n('route','后续场景？','decision',9), n('chatProcess','图片切换视觉模型\n其他文件按类型转换','system',10,-1,300,72),
  n('kbProcess','图片视觉解析/文档解析\n切片、文本向量化、索引','system',10,1,320,76),
  n('context','图片直接理解\n长文档进入沙箱','success',11,-1), n('ready','索引完成后变为可检索','success',11,1), n('end','结束','start',12),
], [e('s','select'),e('select','scene'),e('scene','chatRule','会话'),e('scene','kbRule','知识库'),e('chatRule','mime'),e('kbRule','mime'),e('mime','rule'),e('rule','valid'),e('valid','reject','否','failure'),e('reject','select','重新选择','failure',true),e('valid','oss','是','success'),e('oss','route'),e('route','chatProcess','会话'),e('route','kbProcess','知识库'),e('chatProcess','context'),e('kbProcess','ready'),e('context','end'),e('ready','end')]);

d('M3-ReAct轮次', 'M3 ReAct 执行轮次控制', [
  n('s','开始任务','start',0), n('mode','会话模式？','decision',1), n('daily','日常办公：上限20轮','system',2,-1), n('expert','专家模式：沿用现值','note',2,1),
  n('round','模型决策 + 对应工具结果\n并行工具计同一轮','process',3), n('done','任务已完成？','decision',4), n('result','返回完整结果','success',5,1),
  n('protect','用户停止或命中循环保护？','decision',6), n('stop','停止后续调用并保留成果','failure',7,1), n('limit','日常办公已到20轮？','decision',8),
  n('next','继续下一轮','process',9,-1), n('summary','展示已完成/失败/未完成\n提供「继续执行」','system',9,1,280,72), n('continue','用户选择继续？','decision',10),
  n('newseg','创建新执行段并复用上下文','success',11,-1), n('end','结束','start',12),
], [e('s','mode'),e('mode','daily','日常办公','success'),e('mode','expert','专家模式'),e('daily','round'),e('expert','round'),e('round','done'),e('done','result','是','success'),e('result','end'),e('done','protect','否'),e('protect','stop','是','failure'),e('stop','end'),e('protect','limit','否'),e('limit','next','否','success'),e('next','round','下一轮','normal',true),e('limit','summary','是'),e('summary','continue'),e('continue','newseg','是','success'),e('newseg','round','新执行段','success',true),e('continue','end','否','failure')]);

d('M4-历史会话展示', 'M4 历史会话分组浏览', [
  n('s','打开左侧历史会话区','start',0), n('load','加载分组\n标题 + 任务总数 + 最近5条','process',1), n('triangle','点击小三角？','decision',2),
  n('toggle','折叠仅留标题与总数\n展开恢复上次recent/all状态','system',3,1,300,72), n('more','点击查看更多/收起？','decision',4),
  n('list','查看更多：展示全部并显示收起\n收起：恢复最近5条','system',5,1,300,72), n('scroll','发生滚动？','decision',6),
  n('sticky','只保留最近上一分组标题吸顶\n更早标题自动隐藏','system',7,1,300,72), n('count','任务数量发生变化？','decision',8),
  n('refresh','更新总数和剩余N条\n不重置当前展开状态','system',9,1,300,72), n('persist','保存每组collapsed与recent/all偏好','note',10,0,360,64), n('end','继续浏览或打开会话','start',11),
], [e('s','load'),e('load','triangle'),e('triangle','toggle','是','success'),e('triangle','more','否'),e('toggle','more'),e('more','list','是','success'),e('more','scroll','否'),e('list','scroll'),e('scroll','sticky','是','success'),e('scroll','count','否'),e('sticky','count'),e('count','refresh','是','success'),e('count','persist','否'),e('refresh','persist'),e('persist','end')]);

d('M5-澄清卡', 'M5 一次性澄清卡交互', [
  n('s','Agent执行任务','start',0), n('need','是否缺少任务必要信息？','decision',1), n('continue0','继续执行任务','success',2,1),
  n('fields','一次生成当前可确定的全部字段\n标注必填、非必填及可跳过','system',3,0,360,72), n('card','展示单张澄清卡并自动保存草稿','process',4), n('must','mustClarify？','decision',5),
  n('noskip','不展示整卡跳过\n必填不可跳过','failure',6,-1), n('skip','允许整卡按已有信息继续\n非必填可按字段跳过','process',6,1,280,72),
  n('submit','用户点击「确认并继续」','process',7), n('valid','全部必填与格式校验通过？','decision',8), n('error','定位首个错误字段\n保留全部已填内容','failure',9,1),
  n('summary','卡片转为只读摘要\n恢复Agent执行','success',10), n('new','后续出现新的未知信息？','decision',11), n('newcard','仅为新增未知项生成下一张卡','system',12,1), n('end','完成','start',13),
], [e('s','need'),e('need','continue0','否','success'),e('continue0','end'),e('need','fields','是'),e('fields','card'),e('card','must'),e('must','noskip','是','failure'),e('must','skip','否','success'),e('noskip','submit'),e('skip','submit'),e('submit','valid'),e('valid','error','否','failure'),e('error','card','返回修改','failure',true),e('valid','summary','是','success'),e('summary','new'),e('new','newcard','是'),e('newcard','card','仅新增字段','normal',true),e('new','end','否','success')]);

d('M6-个人知识库', 'M6 公共与个人知识库并行检索', [
  n('s','用户发送问题','start',0), n('need','是否需要知识检索？','decision',1), n('normal','按普通会话继续','success',2,1),
  n('filter','过滤无权限、非ready\n及索引版本不兼容的文件','process',3,0,350,72),
  n('pub','公共知识库\n关键词 + 向量召回','system',4,-1), n('personal','个人知识库\n关键词 + 向量召回','system',4,1), n('merge','合并、去重与统一重排','process',5), n('hit','是否有有效结果？','decision',6),
  n('none','明确未找到\n不用通用知识冒充','failure',7,-1), n('answer','生成回答并携带页码/图片区域/节点引用','success',7,1,330,72), n('open','点击引用时重新鉴权','process',8), n('end','结束','start',9),
], [e('s','need'),e('need','normal','否','success'),e('normal','end'),e('need','filter','是'),e('filter','pub'),e('filter','personal'),e('pub','merge'),e('personal','merge'),e('merge','hit'),e('hit','none','否','failure'),e('hit','answer','是','success'),e('none','end'),e('answer','open'),e('open','end')]);

d('M7-智能体配置表单', 'M7 智能体表单与联网查询配置', [
  n('s','创建/编辑智能体','start',0), n('steps','填写四步表单','process',1), n('model','模型支持工具调用？','decision',2),
  n('disabled','ReAct/联网/工具置灰\n并说明原因','failure',3,1), n('web','配置联网查询\n触发方式、范围、站点、时效、结果数','system',4,0,360,76),
  n('kb','绑定知识库并检查可用索引','process',5), n('save','点击下一步或保存','process',6), n('valid','字段和跨字段规则通过？','decision',7), n('locate','定位步骤及首个错误字段\n保留已填内容','failure',8,1),
  n('saved','保存版本并按现有逻辑生效','success',9), n('end','结束','start',10),
], [e('s','steps'),e('steps','model'),e('model','disabled','否','failure'),e('disabled','kb'),e('model','web','是','success'),e('web','kb'),e('kb','save'),e('save','valid'),e('valid','locate','否','failure'),e('locate','steps','返回修改','failure',true),e('valid','saved','是','success'),e('saved','end')]);

d('M8-下载权限', 'M8 文件下载权限校验', [
  n('s','打开文件权限设置','start',0), n('policy','设置继承/可见者/指定范围/禁止','process',1,0,340,64), n('impact','预览影响范围并确认保存','process',2),
  n('download','用户点击下载','process',3), n('auth','服务端实时鉴权通过？','decision',4), n('deny','不生成地址并提示无下载权限','failure',5,-1), n('url','生成短时有效下载地址','success',5,1), n('end','结束','start',6),
], [e('s','policy'),e('policy','impact'),e('impact','download'),e('download','auth'),e('auth','deny','否','failure'),e('auth','url','是','success'),e('deny','end'),e('url','end')]);

d('M9-细粒度权限', 'M9 知识库三级权限与继承', [
  n('s','打开知识库/文件夹/文件权限','start',0,0,330), n('effective','展示继承来源、有效权限与例外','process',1), n('inherit','继续继承？','decision',2),
  n('custom','设置当前层允许范围、动作与黑名单','process',3,-1,300,64), n('keep','保留上级继承规则','system',3,1), n('impact','预览下级影响数量与变化摘要','process',4,0,330,64),
  n('confirm','管理员确认保存？','decision',5), n('cancel','取消并保留原权限','failure',6,-1), n('calc','按优先级重算有效权限\n拒绝 > 当前允许 > 继承允许','success',6,1,290,72),
  n('index','同步向量片段权限\n并清除检索缓存','system',7), n('sync','刷新树与列表锁定状态','process',8), n('end','结束','start',9),
], [e('s','effective'),e('effective','inherit'),e('inherit','custom','否'),e('inherit','keep','是','success'),e('custom','impact'),e('keep','impact'),e('impact','confirm'),e('confirm','cancel','否','failure'),e('confirm','calc','是','success'),e('cancel','end'),e('calc','index'),e('index','sync'),e('sync','end')]);

d('M10-钉钉dws', 'M10 按群选人创建钉钉日程', [
  n('s','用户提出创建日程','start',0), n('extract','Agent提取主题、时间、参与人等','process',1), n('enough','信息完整？','decision',2), n('clarify','复用M5澄清卡','process',3,1),
  n('group','选择「按群选人」并搜索群','process',4), n('members','加载群成员\n默认选中有效成员','system',5), n('edit','用户搜索、取消或补充参与人','process',6), n('confirm','展示完整操作确认卡','process',7),
  n('ok','用户确认？','decision',8), n('cancel','取消且不调用dws','failure',9,-1), n('exec','带幂等标识调用dws','system',9,1), n('result','返回真实钉钉对象卡','success',10), n('end','结束','start',11),
], [e('s','extract'),e('extract','enough'),e('enough','clarify','否'),e('clarify','group'),e('enough','group','是','success'),e('group','members'),e('members','edit'),e('edit','confirm'),e('confirm','ok'),e('ok','cancel','否','failure'),e('ok','exec','是','success'),e('cancel','end'),e('exec','result'),e('result','end')]);

d('M11-文件树同步', 'M11 左右文件区实时同步', [
  n('s','右侧执行文件操作','start',0), n('result','服务端操作成功？','decision',1), n('fail','不修改文件树并保留当前状态','failure',2,1), n('apply','按服务端最新节点更新统一状态','system',3),
  n('type','操作类型？','decision',4), n('change','新增：插入并高亮\n重命名：原位更新\n移动：原处移除、目标插入\n删除：移除并选择父节点','process',5,0,380,92),
  n('index','文件处理状态？','decision',6), n('processing','显示处理中及当前阶段\n解析/切片/向量化/索引','system',7,-1,300,72), n('ready','显示可检索或失败\n失败支持重新处理','success',7,1,300,72),
  n('state','保持无关节点展开、选中和滚动状态','success',8,0,340,64), n('sync','局部更新成功？','decision',9), n('reload','拉取受影响父节点进行校准','failure',10,1), n('end','结束','start',11),
], [e('s','result'),e('result','fail','否','failure'),e('fail','end'),e('result','apply','是','success'),e('apply','type'),e('type','change'),e('change','index'),e('index','processing','处理中'),e('index','ready','完成/失败'),e('processing','state'),e('ready','state'),e('state','sync'),e('sync','reload','否','failure'),e('reload','end'),e('sync','end','是','success')]);

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const colors = { normal:'#2F80ED', success:'#2E9D46', failure:'#EF4444', note:'#D7A900' };
const yOf = node => 75 + node.row * 120;
const xOf = node => node.col === 0 ? (W-node.w)/2 : (node.col < 0 ? 30 : 590) + (280-node.w)/2;
function vertexStyle(type) {
  const [fill,stroke,font] = palette[type];
  const base = `whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};fontColor=${font};strokeWidth=2;fontSize=14;fontFamily=Microsoft YaHei;`;
  if (type === 'start') return `ellipse;aspect=fixed;${base}fontStyle=1;`;
  if (type === 'decision') return `rhombus;${base}`;
  return `rounded=1;arcSize=10;spacing=8;${base}`;
}
function model(diagram, pageIndex) {
  const height = 75 + Math.max(...diagram.nodes.map(x=>x.row))*120 + 150;
  const cells = ['<mxCell id="0"/>','<mxCell id="1" parent="0"/>'];
  cells.push(`<mxCell id="title" value="${esc(diagram.title)}" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;fontSize=22;fontStyle=1;fontColor=#1F2937;fontFamily=Microsoft YaHei;" vertex="1" parent="1"><mxGeometry x="100" y="15" width="700" height="40" as="geometry"/></mxCell>`);
  for (const node of diagram.nodes) cells.push(`<mxCell id="${esc(node.id)}" value="${esc(node.text).replace(/\n/g,'&lt;br&gt;')}" style="${vertexStyle(node.type)}" vertex="1" parent="1"><mxGeometry x="${xOf(node)}" y="${yOf(node)}" width="${node.w}" height="${node.h}" as="geometry"/></mxCell>`);
  diagram.edges.forEach((edge,i)=>{ const c=colors[edge.kind]||colors.normal; const style=`edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;strokeWidth=2;strokeColor=${c};fontColor=${c};fontSize=12;fontFamily=Microsoft YaHei;${edge.dashed?'dashed=1;dashPattern=6 4;':''}`; cells.push(`<mxCell id="e${pageIndex}_${i}" value="${esc(edge.label)}" style="${style}" edge="1" parent="1" source="${esc(edge.from)}" target="${esc(edge.to)}"><mxGeometry relative="1" as="geometry"/></mxCell>`); });
  return `<mxGraphModel dx="900" dy="1200" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${W}" pageHeight="${height}" math="0" shadow="0"><root>${cells.join('')}</root></mxGraphModel>`;
}

function architectureModel() {
  const cells = ['<mxCell id="0"/>','<mxCell id="1" parent="0"/>'];
  const laneStyle = 'rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#4A79E8;strokeWidth=2;';
  const labelStyle = 'text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;fontSize=16;fontStyle=1;fontColor=#111827;fontFamily=Microsoft YaHei;rotation=-90;';
  const box = (id, value, x, y, w, h, fill, stroke, shape = 'rounded') => {
    const shapeStyle = shape === 'cylinder' ? 'shape=cylinder3;boundedLbl=1;backgroundOutline=1;' : 'rounded=1;arcSize=12;';
    cells.push(`<mxCell id="${id}" value="${esc(value).replace(/\n/g,'&lt;br&gt;')}" style="${shapeStyle}whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};strokeWidth=1.6;fontSize=14;fontColor=#1F2937;fontFamily=Microsoft YaHei;spacing=8;" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`);
  };
  const edge = (id, source, target, value = '', dashed = false) => {
    cells.push(`<mxCell id="${id}" value="${esc(value)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;strokeWidth=1.5;strokeColor=#202020;fontColor=#5B6472;fontSize=11;fontFamily=Microsoft YaHei;${dashed?'dashed=1;dashPattern=4 4;':''}" edge="1" parent="1" source="${source}" target="${target}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  };

  cells.push('<mxCell id="title" value="天马智擎 V1.2 系统架构" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;fontSize=22;fontStyle=1;fontColor=#1F2937;fontFamily=Microsoft YaHei;" vertex="1" parent="1"><mxGeometry x="170" y="10" width="940" height="38" as="geometry"/></mxCell>');
  const lanes = [
    ['lane1','1. 访问与交互层',60,140], ['lane2','2. 接入与公共服务层',220,140],
    ['lane3','3. 核心业务服务层',380,175], ['lane4','4. 数据与AI能力层',575,190],
  ];
  for (const [id,label,y,h] of lanes) {
    cells.push(`<mxCell id="${id}" value="" style="${laneStyle}" vertex="1" parent="1"><mxGeometry x="55" y="${y}" width="1180" height="${h}" as="geometry"/></mxCell>`);
    cells.push(`<mxCell id="${id}Label" value="${label}" style="${labelStyle}" vertex="1" parent="1"><mxGeometry x="4" y="${y}" width="44" height="${h}" as="geometry"/></mxCell>`);
  }

  box('web','Web / 钉钉工作台',95,102,220,58,'#DCEAFE','#6B92DB');
  box('chat','首页与会话详情',370,102,220,58,'#DCEAFE','#6B92DB');
  box('knowledgeUi','知识中心',645,102,190,58,'#F2E5F7','#9A72B5');
  box('settings','设置与智能体管理',890,102,255,58,'#FFF0C9','#D39B24');

  box('gateway','BFF / API网关',95,262,220,58,'#DCEAFE','#6B92DB');
  box('auth','身份认证',370,262,190,58,'#FFF0C9','#D39B24');
  box('filePolicy','文件能力配置',615,262,210,58,'#FFF0C9','#D39B24');
  box('permission','统一权限鉴权',880,262,230,58,'#FFF0C9','#D39B24');

  box('agent','会话与Agent编排',78,432,200,64,'#DCEAFE','#6B92DB');
  box('vision','图片视觉理解\n全量切换DeepSeek模型',304,424,210,80,'#F2E5F7','#9A72B5');
  box('ingest','知识入库服务\n解析 · 切片 · 向量化',540,424,210,80,'#DCEAFE','#6B92DB');
  box('retrieval','知识检索服务\n权限过滤 · 混合召回',776,424,210,80,'#DCEAFE','#6B92DB');
  box('tools','文件权限 / 沙箱 / dws',1012,432,195,64,'#F2E5F7','#9A72B5');

  box('db','业务数据库\n会话 · 配置 · 权限',78,635,190,72,'#FFF0C9','#E0A324','cylinder');
  box('oss','OSS对象存储\n原文件 · 衍生文件',300,635,190,72,'#E9DCF0','#9A72B5','cylinder');
  box('vector','向量库与检索索引',522,635,190,72,'#FFF0C9','#E0A324','cylinder');
  box('deepseek','DeepSeek视觉模型\ndeepseek-v4-flash-vision-exp',744,627,210,88,'#F2E5F7','#9A72B5');
  box('models','文本 / Embedding模型',986,635,210,72,'#FFF0C9','#D39B24');
  box('ops','用量 · 审计 · 日志 · 监控',425,724,440,46,'#EEF3FF','#6B92DB');

  edge('a1','web','gateway','访问页面'); edge('a2','chat','gateway','',true); edge('a3','knowledgeUi','gateway','',true); edge('a4','settings','gateway','',true);
  edge('a5','gateway','auth'); edge('a6','auth','filePolicy','',true); edge('a7','filePolicy','permission','',true);
  edge('a8','gateway','agent'); edge('a9','auth','agent'); edge('a10','filePolicy','vision'); edge('a11','filePolicy','ingest'); edge('a12','permission','retrieval'); edge('a13','permission','tools');
  edge('a14','agent','vision'); edge('a15','agent','retrieval'); edge('a16','agent','tools'); edge('a17','ingest','retrieval');
  edge('a18','agent','db'); edge('a19','vision','oss'); edge('a20','vision','deepseek'); edge('a21','ingest','oss'); edge('a22','ingest','vector'); edge('a23','ingest','models'); edge('a24','retrieval','vector'); edge('a25','retrieval','models'); edge('a26','tools','db');
  edge('a27','db','ops','',true); edge('a28','oss','ops','',true); edge('a29','vector','ops','',true); edge('a30','deepseek','ops','',true); edge('a31','models','ops','',true);

  return `<mxGraphModel dx="1280" dy="820" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1280" pageHeight="820" math="0" shadow="0"><root>${cells.join('')}</root></mxGraphModel>`;
}

const excludedDiagrams = new Set(['M3-ReAct轮次', 'M7-智能体配置表单', 'M8-下载权限', 'M11-文件树同步']);
const activeDiagrams = diagrams.filter(diagram => !excludedDiagrams.has(diagram.name));
for (const name of ['00-技术架构图', 'M1A-多模态子Agent方案', 'M1B-全量视觉模型方案', ...excludedDiagrams]) {
  for (const ext of ['xml', 'drawio']) {
    const stalePath = path.join(outDir, `${name}.${ext}`);
    if (fs.existsSync(stalePath)) fs.unlinkSync(stalePath);
  }
}
const pages = activeDiagrams.map((diagram,i)=>({diagram,xml:diagram.name === '00-系统架构图' ? architectureModel() : model(diagram,i)}));
const master = `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" modified="2026-08-24T00:00:00.000Z" agent="Codex" version="24.7.17" type="device" pages="${pages.length}">\n${pages.map((p,i)=>`<diagram id="vertical${i}" name="${esc(p.diagram.name)}">${p.xml}</diagram>`).join('\n')}\n</mxfile>\n`;
fs.writeFileSync(path.join(outDir,'天马智擎V1.2-纵向流程图-多页.drawio'),master,'utf8');
fs.writeFileSync(path.join(outDir,'天马智擎V1.2-纵向流程图-多页.xml'),master,'utf8');
for (const {diagram,xml} of pages) {
  fs.writeFileSync(path.join(outDir,`${diagram.name}.xml`),`<?xml version="1.0" encoding="UTF-8"?>\n${xml}\n`,'utf8');
  fs.writeFileSync(path.join(outDir,`${diagram.name}.drawio`),`<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" agent="Codex" version="24.7.17" type="device"><diagram id="single" name="${esc(diagram.name)}">${xml}</diagram></mxfile>\n`,'utf8');
}
const codeMd=['# 天马智擎V1.2图示XML代码','','包含系统架构图与纵向业务流程图，均为未压缩的 Draw.io `mxGraphModel`。复制某个代码块的完整内容，可粘贴到 diagrams.net / Draw.io 的 XML 编辑入口；也可以直接导入同名 `.drawio` 文件。',''];
for (const {diagram,xml} of pages) codeMd.push(`## ${diagram.title}`,'','```xml',xml,'```','');
fs.writeFileSync(path.join(outDir,'天马智擎V1.2-纵向流程图XML代码.md'),codeMd.join('\n'),'utf8');
console.log(`Generated ${pages.length} Draw.io diagrams in ${outDir}`);
