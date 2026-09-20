import fs from "node:fs/promises";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const OUT = "/Users/richelleshi/workspace/portal/training_materials/天马智擎平台培训课件.pptx";
const ASSET = "/Users/richelleshi/workspace/portal/training_materials/assets";
const QA = "/Users/richelleshi/workspace/portal/training_materials/work/ppt_v2_qa";
const W = 1280, H = 720;
const C = {
  ink: "#071A2F", blue: "#176BFF", cyan: "#55D6FF", paper: "#F6F8FC",
  white: "#FFFFFF", text: "#12253A", muted: "#5C6B7A", line: "#DCE3EC",
  mint: "#12B886", amber: "#FFB020", red: "#E85D5D", pale: "#EAF1FF"
};
const FONT = "PingFang SC";

function box(slide, x, y, w, h, fill, radius = "rounded-xl", line = "none") {
  const config = {geometry: radius === "none" ? "rect" : "roundRect", position:{left:x,top:y,width:w,height:h}, fill,
    line:{style:"solid",fill:line,width:line === "none" ? 0 : 1}};
  if (radius !== "none") config.borderRadius = radius;
  return slide.shapes.add(config);
}
function text(slide, value, x, y, w, h, size=22, opts={}) {
  const s = slide.shapes.add({geometry:"textbox",name:opts.name,position:{left:x,top:y,width:w,height:h},fill:"none",line:{style:"solid",fill:"none",width:0}});
  s.text = value;
  s.text.style = {fontSize:size,typeface:FONT,color:opts.color||C.text,bold:!!opts.bold,alignment:opts.align||"left",verticalAlignment:opts.valign||"top",autoFit:"shrinkText"};
  return s;
}
function line(slide, x, y, w, color=C.line, weight=1) {
  return slide.shapes.add({geometry:"straightConnector1",position:{left:x,top:y,width:w,height:0},fill:"none",line:{style:"solid",fill:color,width:weight}});
}
function dot(slide, x, y, d, fill) { return slide.shapes.add({geometry:"ellipse",position:{left:x,top:y,width:d,height:d},fill,line:{style:"solid",fill:"none",width:0}}); }
function header(slide, kicker, title, no, dark=false) {
  text(slide,kicker.toUpperCase(),64,40,500,24,14,{bold:true,color:dark?C.cyan:C.blue});
  text(slide,title,64,78,1080,72,40,{bold:true,color:dark?C.white:C.ink});
  text(slide,String(no).padStart(2,"0"),1180,48,40,22,13,{bold:true,color:dark?"#8FA4BD":"#91A0B0",align:"right"});
}
function footer(slide, no, dark=false) {
  line(slide,64,676,1152,dark?"#29425E":C.line,1);
  text(slide,"天马智擎 · 内部培训 V1.0",64,686,300,18,12,{color:dark?"#8FA4BD":"#91A0B0"});
  text(slide,String(no).padStart(2,"0"),1170,686,46,18,12,{color:dark?"#8FA4BD":"#91A0B0",align:"right"});
}
function notes(slide, value) { slide.speakerNotes.textFrame.setText(value); slide.speakerNotes.setVisible(true); }
async function image(slide, file, x, y, w, h, alt, fit="contain") {
  const bytes = await fs.readFile(`${ASSET}/${file}`);
  slide.images.add({blob:bytes,contentType:"image/png",alt,fit,position:{left:x,top:y,width:w,height:h}});
}
async function screenshotFrame(slide, file, x, y, w, h, alt, dark=false) {
  box(slide,x,y,w,h,dark?"#0E263F":C.white,"rounded-xl",dark?"#29425E":C.line);
  dot(slide,x+18,y+15,8,"#FF6B6B"); dot(slide,x+34,y+15,8,"#FFC857"); dot(slide,x+50,y+15,8,"#43D17A");
  await image(slide,file,x+10,y+34,w-20,h-44,alt,"contain");
}
function step(slide, n, label, body, x, y, accent=C.blue, dark=false) {
  text(slide,String(n).padStart(2,"0"),x,y,50,30,15,{bold:true,color:accent});
  text(slide,label,x,y+36,250,36,25,{bold:true,color:dark?C.white:C.ink});
  text(slide,body,x,y+82,250,84,17,{color:dark?"#AFC0D2":C.muted});
}

const deck = Presentation.create({slideSize:{width:W,height:H}});

// 1 — cinematic cover
{
  const s=deck.slides.add(); s.background.fill=C.ink;
  box(s,740,0,540,720,"#0D2844","none");
  await screenshotFrame(s,"01_home_chat.png",760,70,470,580,"天马智擎首页对话界面",true);
  text(s,"TIANMA INTELLIGENCE",64,56,420,24,14,{bold:true,color:C.cyan});
  text(s,"天马智擎",64,155,560,72,58,{bold:true,color:C.white});
  text(s,"让 AI 真正进入我们的工作流程",64,238,620,102,42,{bold:true,color:C.white});
  text(s,"首页对话 · 工作台 · 仪表盘 · 知识中心",64,386,620,40,23,{bold:true,color:C.cyan});
  line(s,64,482,160,C.blue,5);
  text(s,"V1.0 上线培训｜下周发布前会读与实操",64,510,600,34,18,{color:"#AFC0D2"});
  text(s,"内部培训资料",64,650,300,22,14,{color:"#6F88A4"});
  notes(s,"【建议时长：2分钟】\n大家好，今天我们一起熟悉天马智擎第一版。培训覆盖四个入口：首页对话、工作台、仪表盘和知识中心。我们不仅要学会按钮在哪里，还要知道怎样安全、有效地使用，并用真实反馈推动下一版迭代。\n\n[Sources]\n- 天马智擎测试环境首页截图，2026-08-03。");
}

// 2 — outcome
{
  const s=deck.slides.add(); s.background.fill=C.paper; header(s,"TRAINING OUTCOME","今天带走三件事",2);
  step(s,1,"会用","知道四个入口各自解决什么问题，并能独立完成一次操作。",64,205,C.blue);
  step(s,2,"用好","把任务说清楚、把指标读正确、把关键结果复核到位。",446,205,C.mint);
  step(s,3,"敢反馈","接受第一版的不完善，提交具体、可复现、可行动的建议。",828,205,C.amber);
  line(s,64,450,1152,C.line,2);
  text(s,"培训结束后的最低成果",64,490,320,28,16,{bold:true,color:C.blue});
  text(s,"发起一次有效对话　·　检查一次系统权限　·　读懂一个指标　·　完成一次知识检索",64,538,1120,58,28,{bold:true,color:C.ink});
  footer(s,2);
  notes(s,"【建议时长：2分钟】\n今天的目标是会用、用好、敢反馈。请大家记住一个自己最想尝试的真实工作场景，培训后完成一次低风险练习。");
}

// 3 — why in-house
{
  const s=deck.slides.add(); s.background.fill=C.ink; header(s,"WHY WE BUILD","自研的价值，是让智能能力进入企业可控边界",3,true);
  text(s,"01",64,204,60,38,17,{bold:true,color:C.cyan});
  text(s,"守住数据边界",64,252,480,52,34,{bold:true,color:C.white});
  text(s,"减少业务数据在外部工具之间流转，结合公司身份、权限、审计与治理要求使用。",64,318,470,90,19,{color:"#AFC0D2"});
  text(s,"02",674,204,60,38,17,{bold:true,color:C.cyan});
  text(s,"打通内部系统",674,252,480,52,34,{bold:true,color:C.white});
  text(s,"连接办公场景、企业系统与知识资产，让提问、办理、分析和沉淀形成连续链路。",674,318,470,90,19,{color:"#AFC0D2"});
  box(s,64,482,1152,112,"#112E4B","rounded-xl","#29425E");
  text(s,"内部可控 ≠ 可以随意上传",92,510,500,34,23,{bold:true,color:C.amber});
  text(s,"数据分级、最小权限、保密要求和人工复核责任仍然有效。",620,510,550,42,19,{color:C.white,align:"right"});
  footer(s,3,true);
  notes(s,"【建议时长：4分钟】\n为什么要自研？第一是降低数据外部流转风险；第二是逐步打通内部系统；第三是按天马真实业务优先级持续迭代。必须强调：内部平台不等于任何敏感数据都可以上传，原有安全规则仍然有效。");
}

// 4 — platform map
{
  const s=deck.slides.add(); s.background.fill=C.white; header(s,"ONE PLATFORM, FOUR ENTRANCES","四个入口，串起一条完整工作链路",4);
  const xs=[64,350,636,922], nums=["01","02","03","04"], titles=["首页对话","工作台","仪表盘","知识中心"], verbs=["提问与产出","进入与办理","观察与判断","沉淀与复用"], colors=[C.blue,C.mint,C.amber,"#8B5CF6"];
  line(s,108,320,940,C.line,3);
  for(let i=0;i<4;i++){
    dot(s,xs[i]+18,294,52,colors[i]); text(s,nums[i],xs[i]+18,307,52,22,14,{bold:true,color:C.white,align:"center"});
    text(s,titles[i],xs[i],190,220,42,28,{bold:true,color:C.ink,align:"center"});
    text(s,verbs[i],xs[i]-12,372,244,34,18,{bold:true,color:colors[i],align:"center"});
    const bodies=["写作、总结、查询、文件处理与办公任务","统一找到已授权的企业系统","查看经营指标及同比、环比变化","管理、检索并复用企业知识"];
    text(s,bodies[i],xs[i]-4,424,228,82,17,{color:C.muted,align:"center"});
  }
  box(s,64,548,1152,70,C.pale,"rounded-xl"); text(s,"先从任务出发，而不是从功能出发：我要产出、办理、判断，还是查知识？",92,568,1096,28,22,{bold:true,color:C.ink,align:"center"});
  footer(s,4);
  notes(s,"【建议时长：3分钟】\n四个入口分别对应产出、办理、判断和知识复用。实际使用时先判断任务类型，再选择入口。仪表盘补上了经营观察这一环。");
}

// 5 — home
{
  const s=deck.slides.add(); s.background.fill=C.paper; header(s,"01 · HOME CHAT","首页对话：先把任务说清楚，再让小马动手",5);
  await screenshotFrame(s,"01_home_chat.png",64,168,650,454,"天马智擎首页对话界面");
  text(s,"操作顺序",774,176,220,32,18,{bold:true,color:C.blue});
  step(s,1,"选场景","日常办公、联网查询，或直接选择快捷任务。",774,222,C.blue);
  step(s,2,"补材料","仅上传当前权限范围内确有必要的资料。",774,365,C.mint);
  step(s,3,"追问与复核","重要事实、数字和对外内容必须人工确认。",774,508,C.amber);
  footer(s,5);
  notes(s,"【建议时长：5分钟，配合现场演示】\n输入区可选择日常办公与联网查询，左侧加号添加附件，快捷卡片可发消息、建待办、建日程、查日程、查知识库和网络查询。演示一个低风险示例，并强调输出需要继续追问和人工复核。\n\n[Sources]\n- 天马智擎测试环境首页截图，2026-08-03。");
}

// 6 — prompt
{
  const s=deck.slides.add(); s.background.fill=C.white; header(s,"PROMPTING","好结果通常来自四个信息",6);
  const xs=[64,350,636,922], names=["背景","任务","要求","格式"], desc=["我在做什么\n面向谁","明确动词\n总结 / 比较 / 生成","口径、语气\n长度与边界","清单、表格\n邮件或行动项"], colors=[C.blue,C.mint,C.amber,"#8B5CF6"];
  for(let i=0;i<4;i++){ text(s,String(i+1).padStart(2,"0"),xs[i],180,60,24,14,{bold:true,color:colors[i]}); text(s,names[i],xs[i],222,200,48,32,{bold:true,color:C.ink}); line(s,xs[i],286,220,colors[i],5); text(s,desc[i],xs[i],314,220,86,18,{color:C.muted}); }
  box(s,64,450,1152,150,C.ink,"rounded-xl");
  text(s,"示例",92,476,100,24,15,{bold:true,color:C.cyan});
  text(s,"我正在准备一线同事的上线通知。请基于以下要点改写为 200 字以内的通知，语气清晰友好，包含上线时间、适用范围和反馈方式，并用三段式输出。",92,514,1088,66,23,{bold:true,color:C.white});
  footer(s,6);
  notes(s,"【建议时长：4分钟】\n用背景、任务、要求、格式四要素改写一条模糊提示词。结果不理想时，可以继续提出保留、删除、改写等具体要求，不需要每次从头开始。");
}

// 7 — workbench
{
  const s=deck.slides.add(); s.background.fill=C.ink; header(s,"02 · WORKBENCH","工作台：你看到的入口，由权限决定",7,true);
  await screenshotFrame(s,"02_workbench.png",64,170,700,430,"天马智擎工作台界面",true);
  text(s,"看不到系统，不等于没有系统",824,184,360,72,31,{bold:true,color:C.white});
  text(s,"先刷新页面，再确认账号与授权范围。仍异常时，提交账号、时间、预期系统和截图。",824,288,350,118,19,{color:"#AFC0D2"});
  line(s,824,438,300,"#29425E",2);
  text(s,"测试账号当前为空；正式环境以实际授权为准。",824,470,350,70,18,{bold:true,color:C.amber});
  footer(s,7,true);
  notes(s,"【建议时长：3分钟】\n工作台是企业系统统一入口。当前测试账号显示暂无可用业务系统，这属于权限或配置状态，不代表功能不存在。排查时先刷新，再核对账号和授权。\n\n[Sources]\n- 天马智擎测试环境工作台截图，2026-08-03。");
}

// 8 — dashboard
{
  const s=deck.slides.add(); s.background.fill=C.paper; header(s,"03 · DASHBOARD","仪表盘：先筛选，再读数、对比和追溯",8);
  await screenshotFrame(s,"04_dashboard.png",64,158,650,470,"天马智擎财务指标仪表盘");
  const labels=["筛选","读数","对比","追溯"], bodies=["确认事业部与日期","看当前值与单位","结合同比和环比","回到权威报表核验"], colors=[C.blue,C.mint,C.amber,"#8B5CF6"];
  for(let i=0;i<4;i++){ const y=172+i*108; text(s,String(i+1).padStart(2,"0"),774,y,42,24,14,{bold:true,color:colors[i]}); text(s,labels[i],826,y-2,120,30,23,{bold:true,color:C.ink}); text(s,bodies[i],826,y+34,360,34,17,{color:C.muted}); }
  box(s,774,592,410,52,"#FFF4D6","rounded-xl"); text(s,"上升 / 下降不等于好 / 坏，必须结合指标口径。",794,607,370,22,15,{bold:true,color:"#8A5A00",align:"center"});
  footer(s,8);
  notes(s,"【建议时长：4分钟，配合现场演示】\n仪表盘当前展示财务指标。先选事业部和日期，再看当前值，结合同比与环比观察变化。上升或下降不天然代表好坏，需要结合指标定义与业务背景。仪表盘用于发现信号，不替代正式财务结算、审批或经营分析。\n\n[Sources]\n- 天马智擎测试环境财务指标仪表盘截图，2026-08-03。");
}

// 9 — knowledge
{
  const s=deck.slides.add(); s.background.fill=C.white; header(s,"04 · KNOWLEDGE","知识中心：让资料可管理、可检索、可复用",9);
  text(s,"上传文件",64,184,240,34,23,{bold:true,color:C.blue}); text(s,"放入正确知识库，确认归属与权限。",64,226,440,48,17,{color:C.muted});
  text(s,"新建文件夹",64,310,240,34,23,{bold:true,color:C.mint}); text(s,"按项目、部门或主题建立清晰结构。",64,352,440,48,17,{color:C.muted});
  text(s,"小智问答",64,436,240,34,23,{bold:true,color:"#8B5CF6"}); text(s,"限定问题范围，关键答案回看原文。",64,478,440,48,17,{color:C.muted});
  box(s,64,570,470,62,"#FFF4D6","rounded-xl"); text(s,"公共空间与个人空间的可见范围不同。",82,589,434,24,16,{bold:true,color:"#8A5A00",align:"center"});
  await screenshotFrame(s,"03_knowledge_center.png",590,160,626,480,"天马智擎知识中心界面");
  footer(s,9);
  notes(s,"【建议时长：5分钟】\n知识中心主要操作是上传文件、新建文件夹和小智问答。上传前确认公共或个人空间、文件归属和共享范围；重要回答必须回到权威原文核验。\n\n[Sources]\n- 天马智擎测试环境知识中心截图，2026-08-03。");
}

// 10 — knowledge loop
{
  const s=deck.slides.add(); s.background.fill=C.paper; header(s,"KNOWLEDGE LOOP","知识质量，决定问答质量的上限",10);
  const xs=[64,350,636,922], titles=["整理","上传","提问","复核"], bodies=["确认密级、所有者\n共享范围和有效版本","正确知识库与文件夹\n使用可检索文件名","说明主题、时间、对象\n与希望得到的输出","回到权威原文\n发现过期内容及时更新"], colors=[C.blue,C.mint,C.amber,"#8B5CF6"];
  line(s,100,298,980,C.line,4);
  for(let i=0;i<4;i++){dot(s,xs[i]+30,266,64,colors[i]);text(s,String(i+1),xs[i]+30,284,64,24,16,{bold:true,color:C.white,align:"center"});text(s,titles[i],xs[i],370,124,40,28,{bold:true,color:C.ink,align:"center"});text(s,bodies[i],xs[i]-22,424,168,72,17,{color:C.muted,align:"center"});}
  box(s,64,560,1152,64,C.white,"rounded-xl",C.line); text(s,"过期、重复、权限错误的资料，会直接影响回答结果。",92,578,1096,28,22,{bold:true,color:C.ink,align:"center"});
  footer(s,10);
  notes(s,"【建议时长：3分钟】\n完整知识闭环是整理、上传、提问、复核。知识库要逐步明确所有者和更新机制；资料过期、重复或权限错误会直接影响问答结果。");
}

// 11 — safety
{
  const s=deck.slides.add(); s.background.fill=C.ink; header(s,"RESPONSIBLE USE","放心使用，但不要放弃判断与责任",11,true);
  text(s,"建议做",64,190,300,40,25,{bold:true,color:C.cyan});
  text(s,"✓ 用于起草、总结、结构化、检索与方案启发\n✓ 上传前确认资料权限和必要性\n✓ 核对事实、数字、口径与来源\n✓ 对外发布前完成业务与合规审核",64,252,500,220,20,{color:C.white});
  text(s,"不要做",674,190,300,40,25,{bold:true,color:C.amber});
  text(s,"× 上传无权访问或不应扩散的敏感资料\n× 把 AI 回答当成制度、合同或审批结论\n× 未经复核直接对外发送\n× 用模糊抱怨替代可复现的问题描述",674,252,500,220,20,{color:C.white});
  box(s,64,538,1152,70,"#112E4B","rounded-xl","#29425E"); text(s,"AI 提效，使用人负责；内部可控，权限边界仍然有效。",92,557,1096,28,22,{bold:true,color:C.cyan,align:"center"});
  footer(s,11,true);
  notes(s,"【建议时长：3分钟】\n平台是效率工具，不替代业务判断和责任。四个不要必须讲清楚：不越权上传、不把回答当结论、不未经复核外发、不用模糊抱怨代替具体反馈。");
}

// 12 — feedback
{
  const s=deck.slides.add(); s.background.fill=C.white; header(s,"V1.0 · FEEDBACK","第一版不怕有问题，怕的是问题无法复现",12);
  text(s,"场景",64,208,160,40,25,{bold:true,color:C.blue});
  text(s,"步骤",260,208,160,40,25,{bold:true,color:C.mint});
  text(s,"期望",456,208,160,40,25,{bold:true,color:C.amber});
  text(s,"实际",652,208,160,40,25,{bold:true,color:"#8B5CF6"});
  text(s,"时间 / 截图",848,208,300,40,25,{bold:true,color:C.red});
  const xs=[64,260,456,652,848], ws=[160,160,160,160,336], colors=[C.blue,C.mint,C.amber,"#8B5CF6",C.red];
  for(let i=0;i<5;i++) line(s,xs[i],270,ws[i],colors[i],6);
  text(s,"发生了什么业务任务？",64,310,160,74,17,{color:C.muted}); text(s,"从哪里进入，做了什么？",260,310,160,74,17,{color:C.muted}); text(s,"希望系统怎么表现？",456,310,160,74,17,{color:C.muted}); text(s,"实际页面或回答是什么？",652,310,160,74,17,{color:C.muted}); text(s,"提供发生时间、页面截图或会话链接。",848,310,336,74,17,{color:C.muted});
  box(s,64,458,1152,132,C.ink,"rounded-xl"); text(s,"也欢迎正向反馈",92,486,280,30,18,{bold:true,color:C.cyan}); text(s,"有效提示词、节省时间的场景、值得复用的方法，都会成为下一版的优化依据。",92,530,1080,38,23,{bold:true,color:C.white});
  footer(s,12);
  notes(s,"【建议时长：3分钟】\n第一版在能力、体验和系统覆盖上还会有不完善。高质量反馈请包含场景、步骤、期望、实际、时间和截图；建议还要说明业务价值和优先级。也欢迎提交优秀案例。");
}

// 13 — close
{
  const s=deck.slides.add(); s.background.fill=C.ink;
  text(s,"从今天开始",64,56,400,30,16,{bold:true,color:C.cyan});
  text(s,"用一次\n反馈一次\n共同优化",64,132,620,290,68,{bold:true,color:C.white});
  line(s,64,472,150,C.blue,6);
  text(s,"01  完成一次真实但低风险的首页对话",64,512,700,32,21,{bold:true,color:"#DDE8F4"});
  text(s,"02  检查工作台权限，并在仪表盘读懂一个指标",64,554,750,32,21,{bold:true,color:"#DDE8F4"});
  text(s,"03  在知识中心完成一次检索并回看原文",64,596,700,32,21,{bold:true,color:"#DDE8F4"});
  box(s,848,100,368,490,"#112E4B","rounded-xl","#29425E");
  text(s,"V1.0",896,152,270,70,54,{bold:true,color:C.cyan,align:"center"});
  text(s,"真实使用\n产生真实反馈\n推动真实迭代",896,276,270,170,30,{bold:true,color:C.white,align:"center"});
  text(s,"谢谢",896,510,270,34,20,{color:"#8FA4BD",align:"center"});
  footer(s,13,true);
  notes(s,"【建议时长：2分钟】\n请大家完成三个动作：发起一次低风险对话；检查工作台权限并在仪表盘读懂一个指标；在知识中心完成一次检索并回看原文。第一版的价值靠真实使用验证，下一版的方向靠大家反馈决定。谢谢大家，进入现场练习和答疑。");
}

await fs.mkdir(QA,{recursive:true});
for(const [i,s] of deck.slides.items.entries()){
  const png=await deck.export({slide:s,format:"png",scale:1});
  await fs.writeFile(`${QA}/slide-${String(i+1).padStart(2,"0")}.png`,new Uint8Array(await png.arrayBuffer()));
  const layout=await s.export({format:"layout"});
  await fs.writeFile(`${QA}/slide-${String(i+1).padStart(2,"0")}.layout.json`,await layout.text());
}
const montage=await deck.export({format:"webp",montage:true,scale:1});
await fs.writeFile(`${QA}/montage.webp`,new Uint8Array(await montage.arrayBuffer()));
const pptx=await PresentationFile.exportPptx(deck); await pptx.save(OUT);
console.log(`Saved ${OUT}`);
