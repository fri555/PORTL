import fs from 'node:fs/promises';
import { Presentation, PresentationFile } from '/Users/richelleshi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';

const ROOT='/Users/richelleshi/workspace/portal/training_materials_v4';
const IMG=`${ROOT}/screenshots/annotated`;
const TEMPLATE='/Users/richelleshi/workspace/portal/training_materials_v3/build/template_unified/template-inspect/assets/ppt/media';
const RENDER=`${ROOT}/build/pptx/render`;
await fs.mkdir(RENDER,{recursive:true});

const slides=[
 {type:'cover',title:'天马智擎平台培训',sub:'认清定位 · 掌握操作 · 用进业务 · 反馈共建',note:'大家好，今天我们不讲复杂技术原理，而是把天马智擎当成一位刚入职的数智员工：先认识它能做什么，再学会给它派活，最后把它放进真实业务。培训结束后，希望大家能独立完成首页对话、文件与知识引用、知识中心问答、任务查看和工作台访问，并知道遇到异常应该怎么处理。'},
 {type:'agenda',title:'今天学完，要带走 5 件事',kicker:'学习地图',items:['知道为什么自研，以及 V1 的能力边界','会用首页：会话、模式、智能体、附件与重新编辑','会用知识中心：上传、处理、小智问答与任务中心','会从工作台进入已授权的内部系统','会把真实问题通过“我要吐槽”反馈给团队'],note:'今天的内容按真实使用路径展开。首页是主入口，也是培训重点；知识中心解决资料沉淀和复用；工作台是内部系统入口。后半段用组货、评价和数据分析说明如何与业务结合。最后统一讲异常处理和反馈，不在每个功能页重复。'},
 {type:'cards',title:'平台定位：不是“又一个聊天工具”',kicker:'01 · 平台定位',items:['可治理\n让数据、权限和使用规范处于企业可管理范围','可连接\n为内部知识与业务系统逐步打通预留统一入口','可沉淀\n把个人经验转为可复用的知识、提示与智能体'],note:'天马智擎选择自研，核心不是为了重复做一个聊天工具，而是解决三类长期问题。第一，内部材料和权限需要在企业可治理的框架里使用；第二，要逐步连接公司的知识和业务系统；第三，要把个人经验沉淀成团队可以复用的方法。这里强调的是降低风险和逐步连接，不代表绝对不会泄漏，也不代表所有内部系统已经自动打通。'},
 {type:'notice',title:'V1 使用共识：闭环已具备，稳定性仍在成长',kicker:'01 · 平台定位',items:['系统可能出现回答偏差、执行异常或页面问题','遇到异常：先刷新或缩小任务重试；仍不行再反馈','不同人员看到的知识库、智能体和工作台入口可能不同','登录或权限有问题，第一时间联系朝暮'],note:'当前是第一版 MVP，已经满足从输入任务、引用材料、调用能力到反馈问题的基本闭环，但仍可能出错。遇到问题先刷新页面或缩小任务范围再试一次；仍失败时在群里说明，或通过“我要吐槽”填写表格。不同账号权限不同，说明文档里的某个智能体或知识库看不到并不一定是故障。登录和权限问题请第一时间联系朝暮。'},
 {type:'section',part:'PART.01',title:'天马智擎首页',sub:'从找到入口，到把任务说清楚',note:'下面进入首页操作。首页是大家每天最常用的入口，这一部分按真实操作顺序讲：先认识页面区域，再管理会话、选择日常办公或专家模式，接着上传本地文件或引用知识文件，最后把任务写清楚并发送。'},
 {type:'image',title:'首页导览：先看清区域，再开始操作',kicker:'02 · 天马智擎首页',img:'14_home_tabs.png',items:['顶部 Tab\n切换首页、知识中心与工作台','左侧会话历史区\n新建、搜索并继续旧会话','中央任务区\n切换模式、选择材料并发送'],note:'登录后首先看到首页。顶部标签页用于在首页、知识中心和工作台之间切换；左侧是会话历史区，可以新建、搜索和继续过去的会话；中央是任务输入区，在这里选择日常办公或专家模式、挂载材料、写任务并发送。请大家先确认自己在哪个页面、哪个模式，再开始输入。',source:'正式环境截图：14_home_tabs.png'},
 {type:'image',title:'会话管理：同一任务继续，不同主题新建',kicker:'02 · 天马智擎首页',img:'10_conversation_search.png',items:['搜索历史会话\n用任务名、文件名或业务对象定位','继续原会话\n适合同一任务的补充与追问','新建会话\n适合新主题、新材料或新口径'],note:'左侧是会话历史区。搜索时建议使用任务名称、文件名或业务对象，不要只用“测试”“分析”这类泛词。一个任务需要补充材料或继续追问时，留在原会话即可；换了业务主题、材料或统计口径时，应新建会话，避免旧材料和旧口径影响新任务。',source:'正式环境截图：10_conversation_search.png'},
 {type:'image',title:'日常办公与专家模式：两条不同的任务路径',kicker:'02 · 天马智擎首页',img:'02_mode_positioning.png',items:['日常办公\n通用、轻量、横向协同','专家模式\n专业、复杂、依赖方法与知识','混合任务\n先专家分析，再办公落地'],note:'日常办公和专家模式不是普通版与高级版。日常办公适合写作、整理、信息查询，以及消息、待办、日程等通用协同；专家模式适合需要专业方法、专属知识或固定流程的专项任务。如果一个任务既要专业分析又要形成通知、待办或汇报，可以先用专家模式完成分析，再回到日常办公完成落地。',source:'正式环境截图：02_mode_positioning.png'},
 {type:'image',title:'选择智能体：先匹配任务，再准备输入',kicker:'02 · 天马智擎首页',img:'03_expert_mode.png',items:['看能力说明\n确认它解决什么问题','看所需材料\n准备必要字段与业务约束','看输出能否验证\n关键结果必须人工复核'],note:'进入专家模式后，会看到当前账号有权限使用的智能体。不要只看名字就开始提问，先阅读能力说明，确认它解决的问题与自己的任务一致；再准备它需要的输入材料和约束；最后确认输出是否可以核验。智能体数量和可见范围会随账号权限及版本调整，看不到某个智能体属于正常情况。',source:'正式环境截图：03_expert_mode.png'},
 {type:'image',title:'上传本地文件：适合临时、少量材料',kicker:'02 · 天马智擎首页',img:'05_local_attachment_limits.png',items:['常见文档与表格\npdf / doc(x) / xls(x) / txt / md','单文件不超过 10MB','一次最多挂载 3 个文件'],note:'在输入框旁点击添加附件，可以直接上传本地文件。当前页面提示支持常见文档与表格，单文件不超过 10MB，一次最多 3 个。这条路径适合临时、少量、一次性材料。如果文件更大、需要团队复用或长期维护，应先上传到知识中心。上传前仍需确认材料是否可以在当前权限范围内使用。',source:'正式环境截图：05_local_attachment_limits.png'},
 {type:'image',title:'引用知识文件：先处理成功，再回首页选择',kicker:'02 · 天马智擎首页',img:'06_knowledge_picker.png',items:['选择公共或个人空间','按文件名搜索并确认知识库','找不到时查状态、位置和权限'],note:'需要使用知识中心里的材料时，在附件面板切换到知识中心，选择公共或个人空间，再按文件名搜索。文件必须先在知识中心处理成功。找不到时依次检查：是否处理完成、是否选对空间和知识库、文件名是否正确、当前账号是否有权限。选中文件后仍然要写清楚希望基于哪部分内容完成什么任务。',source:'正式环境截图：06_knowledge_picker.png'},
 {type:'image',title:'写好任务并发送：让结果可验证、可行动',kicker:'02 · 天马智擎首页',img:'08_data_analysis_prompt.png',items:['说清对象、范围和口径','说清任务、输出格式和限制','不满意先重新编辑，再决定是否重试'],note:'一个好任务至少说清六件事：分析对象、范围、口径、具体任务、输出结构和限制条件。发送后如果发现原问题写错或漏了要求，优先使用重新编辑，修改原问题后再次提交；相同输入下希望再尝试一次时，再使用重新生成。重要数字、外部动作和业务判断都要人工复核。',source:'正式环境截图：08_data_analysis_prompt.png'},
 {type:'section',part:'PART.02',title:'知识中心',sub:'把一次性附件，沉淀成可复用的知识',note:'首页附件解决一次性使用，知识中心解决长期沉淀和团队复用。接下来重点看三件事：文件放到哪里、什么时候算处理完成，以及如何用小智问答和任务中心继续使用这些知识。'},
 {type:'image',title:'建设知识库：选对位置，再上传文件',kicker:'03 · 知识中心',img:'15_knowledge_center_actions.png',items:['先确认空间、知识库与文件夹','单文件不超过 50MB','单次最多 100 个，等待处理成功'],note:'从顶部标签页进入知识中心后，先确认公共或个人空间，再进入目标知识库和文件夹。当前培训口径是单文件不超过 50MB、单次最多 100 个，并支持 CSV 等格式。上传完成不等于马上可用，必须等待处理成功后再进行问答或回首页引用。限制若有调整，以发版当日页面提示为准。',source:'正式环境截图：15_knowledge_center_actions.png'},
 {type:'image',title:'小智问答：在限定知识范围内快速定位信息',kicker:'03 · 知识中心',img:'16_xiaozhi_qa.png',items:['先进入正确的知识库或文件范围','提问时写清制度、版本、时间或条款','重要答案回查原文件与原文位置'],note:'小智问答适合在当前知识库或已打开文件范围内快速定位制度、流程和业务资料。提问时尽量写清制度名称、版本、时间或关注条款，并要求指出依据。小智的回答帮助我们找信息，但不能替代原文件；涉及制度解释和重要决策时，要回到原文或咨询责任部门。',source:'正式环境截图：16_xiaozhi_qa.png'},
 {type:'image',title:'任务中心：查看后台任务是否完成',kicker:'03 · 知识中心',img:'17_task_center.png',items:['查看处理中、成功或失败状态','任务较慢时不要连续重复提交','失败时记录时间、任务和错误信息'],note:'部分上传、解析或执行任务需要后台处理，可以到任务中心查看状态。任务仍在处理中时不要连续重复提交，以免产生重复任务；成功后再回到对应页面继续使用；失败时记录发生时间、任务名称和错误信息，先刷新或重试一次，仍失败再反馈。',source:'正式环境截图：17_task_center.png'},
 {type:'flow',title:'模块协同：知识中心 → 首页对话',kicker:'03 · 知识中心',items:['上传到正确知识库','等待处理成功','回首页选择知识文件','选择日常或专家模式','写清任务并人工复核'],note:'这条流程适合较大、需要多人复用或长期维护的材料。先在知识中心上传到正确位置，等待处理成功；再回到首页，从附件面板选择知识文件；随后选择日常办公或合适的专家智能体，写清任务并发送；最后回查材料、复核结果。请记住：首页是 10MB 和 3 个，知识中心是 50MB 和单次 100 个。'},
 {type:'section',part:'PART.03',title:'工作台',sub:'在权限范围内，快速进入内部系统',note:'知识中心讲完后，我们看工作台。这里的定位很明确：它是已配置内部系统的统一入口，方便大家搜索和跳转；它不等于首页对话已经自动读取所有系统数据，实际可见入口和系统内权限都以当前账号为准。'},
 {type:'image',title:'工作台：内部系统的统一入口',kicker:'04 · 工作台',img:'13_workbench.png',items:['通过顶部标签页进入','搜索当前账号可见的系统','入口不同通常来自权限与配置'],note:'工作台用于集中进入已经配置的内部系统，可以通过搜索快速定位。不同人员看到的系统卡片可能不一样，这是账号权限和管理员配置造成的正常差异。看到入口不等于首页对话已经自动读取该系统数据，也不等于拥有系统内的全部权限。登录或权限异常请第一时间联系朝暮。',source:'正式环境截图：13_workbench.png'},
 {type:'section',part:'PART.04',title:'放进真实业务',sub:'从“能对话”走向“能完成具体任务”',note:'会操作只是第一步，真正的价值来自把工具放进业务流程。下面用组货专家、评价分析师和数据分析三个场景，说明怎样准备输入、怎样要求输出，以及怎样把结果转成下一步行动。'},
 {type:'scenario',title:'两个专家场景：组货与评价分析',kicker:'05 · 业务应用',left:['组货专家','输入：预算、人数、性别比例、品类偏好','输出：商品组合、数量、金额与假设','复核：预算、库存、SKU、适用人群'],right:['评价分析师','输入：评价范围、时间、店铺或商品','输出：问题归类、证据、影响与优先级','复核：样本范围、原始评价、原因归因'],note:'组货专家适合在预算、人数、性别比例和品类偏好明确时生成组合方案，结果要核对金额、数量、SKU、库存和系统假设。评价分析师适合从评价数据中发现问题线索，结果应按问题类型、品牌或商品、地区和物流等维度归类，并给出证据和影响范围。两类专家都依赖输入质量，数据不足时要明确说明，不能补造事实。'},
 {type:'process',title:'数据分析：从业务问题到行动建议',kicker:'05 · 业务应用',items:['定义问题\n要支持什么决策','确认口径\n对象、时间、指标、维度','准备数据\n字段清楚、单位一致、必要脱敏','选择路径\n首页临时上传或知识中心复用','执行核验\n看证据、抽查汇总与异常','形成行动\n输出建议、责任人与下一步'],note:'数据分析不是上传表格后等一句总结，而是一条完整工作流。先明确要支持什么决策，再确认对象、时间、指标和维度；整理字段、单位与敏感信息；根据文件大小和复用需求选择上传路径；选择数据分析专家并发送任务；抽查汇总、异常和证据；最后把结论变成可执行建议，并明确责任人和下一步。'},
 {type:'image',title:'数据分析提问：用六要素减少返工',kicker:'05 · 业务应用',img:'08_data_analysis_prompt.png',items:['对象 / 范围 / 口径','分析任务 / 输出结构','约束：引用数据，不补造数字'],note:'演示中的提示词把要求拆成六类：分析对象、范围、指标口径、分析任务、输出结构和限制条件。例如要求按周、区域、渠道和品类汇总，列出异常证据和人工核验项，并明确所有结论必须引用附件数据、不能补造数字。大家可以替换为自己的字段，但这六类信息尽量保留。',source:'正式环境截图：08_data_analysis_prompt.png'},
 {type:'image',title:'真实测试出现异常：正确处理比反复点击更重要',kicker:'05 · 业务应用',img:'09_data_analysis_processing.png',items:['先保留会话、时间和错误画面','刷新、检查文件并缩小范围重试','仍失败：群内反馈或“我要吐槽”'],note:'本次正式环境测试中，数据分析智能体出现了执行异常。遇到这种情况不要连续重复点击。先保留会话、发生时间和错误画面，刷新页面，检查文件格式和任务复杂度，缩小范围后重试一次；如果仍然失败，在群里反馈，或通过“我要吐槽”填写场景、步骤、期望和实际结果，便于团队复现。',source:'正式环境截图：09_data_analysis_processing.png'},
 {type:'cards',title:'怎么用好工具：三条不变的原则',kicker:'05 · 业务应用',items:['选对路径\n通用协同走日常，专业任务走专家','给足上下文\n材料、范围、口径、格式和限制写清楚','守住责任边界\n重要数字、外发、审批和决策必须人工确认'],note:'无论是日常办公、专家分析还是知识问答，都遵循三条原则。第一，先选对路径：通用协同走日常办公，专业任务走专家。第二，给足上下文：材料、范围、口径、输出格式和限制写清楚。第三，守住责任边界：AI 可能出错，没有授权的数据不会自动获得，重要数字、外部发送、审批、下单和决策必须由责任人确认。'},
 {type:'section',part:'PART.05',title:'问题反馈与 Q&A',sub:'让第一版在真实使用中越用越好',note:'最后进入反馈和答疑。V1 的价值需要在真实工作中验证：遇到问题要提供可复现信息，想到业务需求要说明痛点和期望结果，好用的地方也要告诉团队为什么有效。接下来先演示反馈入口，再集中回答常见问题。'},
 {type:'image',title:'问题反馈：点击“我要吐槽”，到钉钉填写',kicker:'06 · 问题反馈',img:'18_feedback_after_click.png',items:['问题反馈\n场景、步骤、期望、实际、时间和截图','需求建议\n说明业务痛点、使用人和期望结果','正向反馈\n说明好用在哪里、节省了什么'],note:'点击平台里的“我要吐槽”后，通常会唤起或跳转到钉钉链接填写；浏览器页面本身可能保持不变。高质量反馈要写清业务场景、使用模式或智能体、材料类型、操作步骤、期望结果、实际结果、发生时间和影响，并附脱敏截图。说明文档里暂时体验不了的功能也不用惊慌，如果想到适合实际工作的需求，同样可以填写表格。正向反馈也很重要，请告诉我们哪项能力真正节省了时间、为什么好用。',source:'正式环境截图：18_feedback_after_click.png'},
 {type:'qa',title:'Q&A：先按这张表自查',kicker:'06 · 常见问题',items:[['登录或权限异常','联系朝暮'],['找不到知识文件','查处理状态、空间、知识库、文件名与权限'],['回答或执行异常','刷新或缩小任务重试；仍失败再反馈'],['与同事看到的功能不同','多为账号权限差异，属于正常情况'],['有新的业务需求','通过“我要吐槽”填写场景与期望']],note:'最后进入问答。登录或权限异常联系朝暮；找不到知识文件时检查处理状态、位置、名称和权限；回答或执行异常先刷新或缩小任务重试，仍失败再反馈；与同事看到的智能体、知识库或工作台入口不同，多数是权限差异；有新的业务场景和需求，可以直接通过表格提交。现场无法确认的问题不要猜，记录后统一核实。'}
];

const pres=Presentation.create({slideSize:{width:1920,height:1080}});
const C={orange:'#FF6600',orange2:'#FF7A1A',ink:'#272727',muted:'#6F6F6F',line:'#E6E6E6',pale:'#FFF3E8',soft:'#F7F7F5',red:'#D92D20',white:'#FFFFFF',cyan:'#DFF4F7',navy:'#143B45'};
const font='PingFang SC';
const logo=await fs.readFile(`${TEMPLATE}/image2.png`);
const whiteLogo=await fs.readFile(`${TEMPLATE}/image5.png`);
const coverBg=await fs.readFile(`${TEMPLATE}/image4.jpeg`);
const sectionBg=await fs.readFile(`${TEMPLATE}/image6.jpeg`);

function shape(slide,geometry,left,top,width,height,fill='none',lineFill='none',lineWidth=0,name){return slide.shapes.add({geometry,name,position:{left,top,width,height},fill,line:{style:'solid',fill:lineFill,width:lineWidth}})}
function textBox(slide,text,left,top,width,height,size=28,color=C.ink,bold=false,name,align='left'){
 const s=shape(slide,'textbox',left,top,width,height,'none','none',0,name); s.text=text; s.text.style={fontSize:size,color,bold,fontFamily:font,alignment:align,verticalAlignment:'middle'}; return s;
}
function imageBox(slide,bytes,left,top,width,height,alt,fit='contain',geometry='rect'){
 return slide.images.add({blob:bytes,contentType:'image/png',alt,fit,position:{left,top,width,height},geometry});
}
function addLogo(slide){imageBox(slide,logo,1590,52,240,57,'Tianma logo');}
function addHeader(slide,kicker,title,index){
 shape(slide,'rect',80,60,12,76,C.orange,'none',0,'accent');
 textBox(slide,kicker,116,58,740,28,17,C.orange,true,'kicker');
 textBox(slide,title,116,88,1390,64,40,C.ink,true,'title');
 addLogo(slide);
 shape(slide,'line',80,995,1760,0,'none',C.line,1,'footer-line');
 textBox(slide,'天马智擎 · 内部培训',80,1010,460,28,13,C.muted,false,'footer');
 textBox(slide,`${String(index+1).padStart(2,'0')} / ${slides.length}`,1690,1010,150,28,13,C.muted,false,'page','right');
}
function addNotes(slide,note,source){
 const src=source||'内部资料：天马智擎平台系统使用说明与正式环境实测';
 slide.speakerNotes.textFrame.setText(`${note}\n\n[Sources]\n- ${src}\n- 视觉参考：天马集团PPT统一模板-20251119版.pptx`);
 slide.speakerNotes.setVisible(false);
}
async function addImageSlide(slide,d,index){
 addHeader(slide,d.kicker,d.title,index);
 shape(slide,'rect',78,182,1370,772,C.white,C.line,2,'screenshot-frame');
 const bytes=await fs.readFile(`${IMG}/${d.img}`);
 imageBox(slide,bytes,92,196,1342,744,d.title,'contain');
 let y=220;
 d.items.forEach((item,j)=>{
   shape(slide,'rect',1490,y,350,168,j===0?C.pale:C.white,j===0?C.orange:C.line,j===0?2:1,`callout-${j+1}`);
   textBox(slide,String(j+1).padStart(2,'0'),1516,y+18,58,28,16,C.orange,true);
   textBox(slide,item,1516,y+55,296,88,20,C.ink,true);
   y+=190;
 });
}

for(let i=0;i<slides.length;i++){
 const d=slides[i]; const slide=pres.slides.add(); slide.background.fill=C.white;
 if(d.type==='cover'){
   slide.images.add({blob:coverBg,contentType:'image/jpeg',alt:'天马集团模板橙色封面',fit:'cover',position:{left:0,top:0,width:1920,height:1080}});
   imageBox(slide,whiteLogo,110,80,300,72,'Tianma white logo');
   textBox(slide,'TIANMA · INTERNAL TRAINING',110,300,850,36,18,C.white,true);
   textBox(slide,d.title,110,390,1280,105,72,C.white,true,'title');
   textBox(slide,d.sub,110,520,1200,54,29,C.white,false);
   shape(slide,'line',110,625,710,0,'none',C.white,3);
   textBox(slide,'V1 内部培训版  |  2026',110,665,700,40,18,C.white,false);
   textBox(slide,`01 / ${slides.length}`,1660,1008,170,28,13,C.white,false,'page','right');
 } else if(d.type==='section'){
   slide.images.add({blob:sectionBg,contentType:'image/jpeg',alt:'天马集团模板章节背景',fit:'cover',position:{left:0,top:0,width:1920,height:1080}});
   textBox(slide,d.part,120,270,520,60,27,C.orange,true);
   textBox(slide,d.title,120,365,1080,105,66,C.ink,true,'title');
   textBox(slide,d.sub,125,505,1000,50,25,C.muted,false);
   shape(slide,'rect',120,600,240,10,C.orange,'none',0);
   textBox(slide,`${String(i+1).padStart(2,'0')} / ${slides.length}`,1660,1008,170,28,13,C.muted,false,'page','right');
 } else if(d.type==='image'){
   await addImageSlide(slide,d,i);
 } else if(d.type==='agenda'){
   addHeader(slide,d.kicker,d.title,i);
   let y=210;
   d.items.forEach((item,j)=>{
     textBox(slide,String(j+1).padStart(2,'0'),116,y,70,60,32,C.orange,true);
     shape(slide,'line',205,y+31,1540,0,'none',j===0?C.orange:C.line,j===0?3:1);
     textBox(slide,item,240,y-2,1420,66,26,C.ink,j===0);
     y+=142;
   });
 } else if(d.type==='cards' || d.type==='notice'){
   addHeader(slide,d.kicker,d.title,i);
   const count=d.items.length; const w=count===4?400:520; const gap=count===4?30:50; const start=count===4?100:130; const y=300;
   d.items.forEach((item,j)=>{
     const x=start+j*(w+gap);
     shape(slide,'rect',x,y,w,420,d.type==='notice'&&j===0?C.pale:C.white,d.type==='notice'&&j===0?C.orange:C.line,d.type==='notice'&&j===0?3:2,`card-${j+1}`);
     shape(slide,'rect',x,y,w,12,C.orange,'none',0);
     textBox(slide,String(j+1).padStart(2,'0'),x+34,y+38,80,38,18,C.orange,true);
     textBox(slide,item,x+34,y+105,w-68,230,25,C.ink,true);
   });
   if(d.type==='notice') textBox(slide,'先刷新 / 重试 → 仍失败再反馈',570,790,780,60,28,C.red,true,'notice','center');
 } else if(d.type==='flow'){
   addHeader(slide,d.kicker,d.title,i);
   let x=92;
   d.items.forEach((item,j)=>{
     shape(slide,'rect',x,340,300,250,j===1?C.pale:C.white,j===1?C.orange:C.line,j===1?3:2,`step-${j+1}`);
     textBox(slide,String(j+1).padStart(2,'0'),x+28,374,70,36,18,C.orange,true);
     textBox(slide,item,x+28,440,244,92,25,C.ink,true);
     if(j<d.items.length-1) textBox(slide,'→',x+303,430,55,70,38,C.orange,true);
     x+=350;
   });
   textBox(slide,'首页：≤10MB / 最多3个　　知识中心：≤50MB / 单次最多100个',330,700,1260,60,29,C.orange,true,'limits','center');
 } else if(d.type==='scenario'){
   addHeader(slide,d.kicker,d.title,i);
   const cols=[[d.left,120],[d.right,1010]];
   cols.forEach(([arr,x],idx)=>{
     shape(slide,'rect',x,250,790,590,C.white,idx===0?C.orange:C.line,idx===0?3:2);
     textBox(slide,arr[0],x+45,292,700,60,36,idx===0?C.orange:C.ink,true);
     arr.slice(1).forEach((v,j)=>{
       textBox(slide,String(j+1).padStart(2,'0'),x+48,400+j*118,54,30,16,C.orange,true);
       textBox(slide,v,x+120,380+j*118,610,72,23,C.ink,j===2);
     });
   });
 } else if(d.type==='process'){
   addHeader(slide,d.kicker,d.title,i);
   const positions=[[110,230],[680,230],[1250,230],[110,570],[680,570],[1250,570]];
   d.items.forEach((item,j)=>{
     const [x,y]=positions[j]; shape(slide,'rect',x,y,500,250,j===0?C.pale:C.white,j===0?C.orange:C.line,j===0?3:2);
     textBox(slide,String(j+1).padStart(2,'0'),x+30,y+30,70,35,18,C.orange,true);
     textBox(slide,item,x+30,y+85,440,120,24,C.ink,true);
   });
 } else if(d.type==='qa'){
   addHeader(slide,d.kicker,d.title,i);
   let y=220;
   d.items.forEach((row,j)=>{
     shape(slide,'rect',120,y,1680,118,j%2===0?C.soft:C.white,C.line,1);
     textBox(slide,row[0],160,y+27,560,58,23,C.ink,true);
     textBox(slide,row[1],760,y+27,980,58,23,j===0?C.orange:C.ink,j===0);
     y+=130;
   });
 }
 addNotes(slide,d.note||`下面进入${d.title}。`,d.source);
}

for(const [index,slide] of pres.slides.items.entries()){
 const stem=`slide-${String(index+1).padStart(2,'0')}`;
 const png=await pres.export({slide,format:'png',scale:1});
 await fs.writeFile(`${RENDER}/${stem}.png`,new Uint8Array(await png.arrayBuffer()));
 const layout=await slide.export({format:'layout'});
 await fs.writeFile(`${RENDER}/${stem}.layout.json`,await layout.text());
}
const montage=await pres.export({format:'webp',montage:true,scale:0.3});
await fs.writeFile(`${ROOT}/build/pptx/deck-montage.webp`,new Uint8Array(await montage.arrayBuffer()));
const pptx=await PresentationFile.exportPptx(pres);
await pptx.save(`${ROOT}/天马智擎平台培训课件_公司模板版_可编辑.pptx`);
await fs.writeFile(`${ROOT}/build/lecture_data.json`,JSON.stringify(slides.map((s,index)=>({page:index+1,title:s.title,subtitle:s.sub||s.kicker||'',note:s.note,source:s.source||''})),null,2),'utf8');
console.log(`exported ${slides.length} slides`);
