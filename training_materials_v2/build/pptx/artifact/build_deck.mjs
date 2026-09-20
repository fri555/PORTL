import fs from 'node:fs/promises';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const ROOT='/Users/richelleshi/workspace/portal/training_materials_v2';
const IMG=ROOT+'/screenshots/annotated';
const OUT=ROOT+'/build/pptx/render';
await fs.mkdir(OUT,{recursive:true});

const deck=[
 ['cover','天马智擎平台培训','功能讲解 · 操作演示 · 能力边界 · 业务应用',null,[], '大家好，今天我们用一场完整演示认识天马智擎。培训重点不是背景故事，而是把系统功能、操作方法、能力边界和业务应用讲清楚。顺序是首页智能体、知识中心、仪表盘、工作台，最后用知识中心上传到首页引用串成闭环。当前系统是第一版，界面和能力仍会迭代，请以发版当日正式环境为准。'],
 ['cards','为什么建设自研平台','治理 · 连接 · 沉淀',null,['降低内部材料流向未批准外部平台的风险','逐步连接内部知识与业务系统','沉淀企业可复用的智能体与工具'],'自研的核心价值可以归纳为治理、连接、沉淀。治理是让数据、权限和使用规范放在企业可管理的框架内；连接是逐步打通知识与业务系统；沉淀是把个人提示词变成可复用的智能体。不要承诺绝不泄漏或全部系统已打通，员工仍要遵守数据规范，实际连接以权限和配置为准。'],
 ['agenda','今天的学习路径','首页优先，按真实工作流展开',null,['首页智能体｜两种模式、场景与专家','知识中心｜上传、处理、问答与引用','仪表盘｜筛选、指标卡与配置','工作台｜统一入口与权限边界','模块耦合｜知识中心 → 首页对话'],'首页智能体占最大篇幅，因为它是日常使用主入口；知识中心第二，解决材料沉淀与复用；仪表盘和工作台依次介绍。最后做完整闭环：先上传文件，等待处理成功，再回首页引用，选择模式或专家完成任务。'],
 ['image','统一工作入口：输入、模式、材料、联网','03 · 首页智能体','01_home_daily',['六个快捷场景','附件 / 模式 / 联网','左侧保留历史会话'],'中央是对话输入区，下方三个关键控制分别是添加附件、选择模式和联网查询。再往下是六个快捷场景。左侧按日常办公和专家模式保留历史会话。演示时先讲选模式、给材料、写清任务，最后再提交。'],
 ['image','不是普通版 / 高级版，而是两条任务路径','04 · 两种模式','02_mode_menu',['日常办公：横向、通用、轻量','专家模式：纵向、专业、复杂'],'日常办公和专家模式不是普通版与高级版，也不是答案聪明程度的简单差别。日常办公面向横向、通用、轻量的办公与协同任务：已经知道要做什么，希望AI帮忙查、写、整理或发起动作。专家模式面向纵向、专业、复杂的专项业务任务：需要按专业方法、专属知识或固定流程完成分析和方案。请记住一句话：日常办公解决横向通用工作，专家模式解决纵向专业任务。'],
 ['cards','三步判断：日常、专家，还是串起来用','05 · 模式判断',null,['通用办公 / 协同动作 → 日常办公','专业方法 / 专属知识 → 专家模式','混合任务 → 先专家分析，后日常落地','最后都要人工复核'],'选择模式时用三步判断。第一，是不是写作、查询、消息、待办、日程一类通用办公或协同动作？是的话选日常办公。第二，是否依赖特定业务方法、专属知识或固定流程？是的话选专家模式。第三，如果既要专业分析又要办公落地，就先专家、后日常。例如先让评价分析师找问题，再回日常办公整理汇报或待办。现场判断题：约明天下午会议选日常；按预算生成人员组货方案选专家。'],
 ['image','按任务目标选择智能体','06 · 专家模式','03_expert_grid',['先看能力说明','再看所需输入','最后看输出是否可验证'],'专家列表可见多个智能体。培训重点是选择方法：先读类别和能力说明，再判断输入是否齐全，最后确认结果能否复核。本次重点演示组货专家和评价分析师。'],
 ['image','把约束写全，才能生成可执行方案','07 · 组货专家','04_group_expert',['预算 / 人数 / 性别比例','品类需求与知识库方案','检查金额、数量、SKU与假设'],'组货专家根据预算、人数、性别比例和品类需求，匹配知识库方案与商品信息，生成可执行方案。页面提供初始化模板。输出后核对总金额、数量、SKU来源和系统假设。'],
 ['image','从评价数据中发现问题线索','08 · 评价分析师','05_eval_expert',['全景 / 差评 / 品牌','高风险SKU / 地区物流','要求证据，数据不足要明示'],'评价分析师专注天马B2C平台店铺评价数据。页面提供五类快捷任务。要求结果按问题类型、品牌、SKU、地区和物流归类，并列证据、影响范围和优先级。'],
 ['image','临时材料：单文件 ≤10MB，最多 3 个','09 · 首页附件','06_attachment_local',['常见文档与表格','适合少量、一次性材料'],'首页直接附件支持pdf、doc、docx、xls、xlsx、txt、md，单文件不超过10MB，总共最多3个。较大或需要反复使用的材料，应该改走知识中心。'],
 ['image','从知识中心选择已处理文件','10 · 首页引用知识','07_knowledge_picker',['按文档名搜索','选择空间与知识库','检查处理状态与权限'],'添加附件后切换知识中心，可以搜索文档、选择空间，再进入知识库。找不到文件时检查处理状态、空间、知识库、文件名和账号权限。'],
 ['image','组织知识库、文件与问答','11 · 知识中心','08_knowledge_list',['上传文件','新建文件夹','小智问答'],'知识中心列表展示名称、所有者、创建时间、最近访问和操作。它更适合团队沉淀和反复引用。公共空间与个人空间要按权限和用途选择。'],
 ['image','等待“处理成功”再引用','12 · 知识处理','09_kb_inside',['上传完成 ≠ 解析完成','处理成功后再问答或引用','重要数字回查原文件'],'文件行会显示处理状态。只有在处理完成后，首页引用和知识问答才更稳定。小智可基于知识库和已打开文件回答，但回答不是原文替代品。'],
 ['image','复用材料：单文件 ≤50MB，单次最多 100 个','13 · 知识上传','10_kb_upload',['另支持 csv','选择正确知识库','等待处理成功'],'知识中心支持pdf、doc、docx、xls、xlsx、csv、txt、md，单文件不超过50MB，单次最多100个。10MB和3个属于首页，50MB和100个属于知识中心，不能混淆。'],
 ['image','先定范围，再读当前值 / 同比 / 环比','14 · 仪表盘','11_dashboard',['事业部筛选','快捷或自定义时间','指标卡展示趋势'],'仪表盘先选事业部，再选时间，最后阅读当前值、同比和环比。不要只看红绿颜色，要确认口径和业务背景。页面实测支持筛选和指标配置。'],
 ['image','15 项指标：利润 4 + 销售 4 + 成本 7','15 · 指标配置','12_dashboard_config',['利润指标 4项','销售规模 4项','成本控制 7项'],'指标配置共15项。用户可勾选需要展示的指标并保存。指标展示选择不改变业务口径，重要解释仍需遵循数据治理规则。'],
 ['image','内部系统统一入口，随权限展示','16 · 工作台','13_workbench',['搜索系统入口','本次实测显示10个系统','不同账号列表可能不同'],'本次实测工作台显示10个系统入口。员工可用顶部搜索定位。入口随账号权限和管理员配置变化；工作台是统一入口，不代表所有系统已与首页对话自动打通。'],
 ['flow','知识中心 → 首页对话','17 · 模块耦合',null,['上传到知识库','等待处理成功','首页引用知识文件','选择模式或专家','提问并人工复核'],'把模块串起来：上传文件，等处理成功，回首页添加知识中心附件，选择文件与任务模式，再按四段式提问并复核。这个闭环适合较大、复用或团队沉淀材料。'],
 ['limits','按任务场景选择，不要混淆限额','18 · 两条材料路径',null,[],'首页直接附件单文件10MB、最多3个，适合临时材料；知识中心单文件50MB、单次最多100个，适合较大和复用材料。知识中心文件还要等待处理成功。'],
 ['cards','AI 是辅助，不是免责替代','19 · 能力边界',null,['可能错误或遗漏：重要结论回查来源','没有提供或授权的数据不会自动获得','外部发送、审批、下单前必须人工确认'],'AI可能产生错误、遗漏或不恰当推断；没有提供、授权或接入的数据不会自动获得；涉及外部发送、审批、下单和重要决策时必须由责任人确认。联网查询面向公开信息，不等于可以访问内部系统。'],
 ['cards','问题反馈：点击入口，跳转钉钉填写','20 · V1 共建',null,['点击平台“问题反馈”','跳转钉钉链接','填写场景 / 步骤 / 期望与实际','附脱敏截图、时间与影响'],'平台目前是第一版，有不完善的地方很正常。遇到问题时，请点击平台里的“问题反馈”入口，页面会跳转到钉钉链接，在钉钉中填写并提交。建议写清业务场景、选择的模式或智能体、引用材料、操作步骤、期望结果和实际结果，并附脱敏截图、发生时间和影响范围。好用的地方告诉我们为什么，不好用的地方告诉我们具体哪一步有偏差，团队会根据真实使用持续迭代。'],
 ['cards','问题与讨论','21 · QA',null,['为什么选不到知识文件？','什么时候用专家模式？','仪表盘指标怎么看？','为什么工作台入口不同？'],'常见问题：选不到知识文件时检查处理状态、空间、知识库和权限；专项业务任务优先专家模式；仪表盘先定范围再看当前值、同比和环比；工作台入口差异来自权限和配置。无法确认的问题记录账号、时间、步骤和截图后核实。']
];

const pres=Presentation.create({slideSize:{width:1920,height:1080}});
const C={blue:'#1677FF',ink:'#111827',muted:'#667085',line:'#E4E7EC',light:'#F5F8FF',red:'#E53935',white:'#FFFFFF'};
function shape(slide,geometry,left,top,width,height,fill='none',lineFill='none',lineWidth=0,name){return slide.shapes.add({geometry,name,position:{left,top,width,height},fill,line:{style:'solid',fill:lineFill,width:lineWidth}})}
function textBox(slide,text,left,top,width,height,size=28,color=C.ink,bold=false,name){const s=shape(slide,'textbox',left,top,width,height,'none','none',0,name);s.text=text;s.text.style={fontSize:size,color,bold,fontFamily:'Microsoft YaHei'};return s}
function addHeader(slide,k,title,index){textBox(slide,k,84,54,700,28,16,C.blue,true,'kicker');textBox(slide,title,84,92,1660,70,44,C.ink,true,'title');textBox(slide,'天马智擎 · 内部培训',84,1030,500,22,12,C.muted,false);textBox(slide,`${String(index+1).padStart(2,'0')} / ${deck.length}`,1690,1030,150,22,12,C.muted,false)}
function addNote(slide,n){slide.speakerNotes.textFrame.setText(`${n}\n\n现场按页面顺序演示，操作后停一下让学员确认画面。对权限、数字、外部动作和业务结论都提醒人工复核；无法当场确认的能力不猜测，通过平台“问题反馈”跳转钉钉跟进。`);slide.speakerNotes.setVisible(false)}

for(let i=0;i<deck.length;i++){
 const [type,title,k,img,points,notes]=deck[i]; const slide=pres.slides.add(); slide.background.fill=C.white;
 if(type==='cover'){
   shape(slide,'rect',0,0,1920,1080,'linear(135deg, #FFFFFF 0%, #F3F7FF 100%)','none',0,'background');
   textBox(slide,'TIANMA',86,324,300,60,28,C.ink,true);
   textBox(slide,'TIANMA · INTERNAL TRAINING',86,430,620,34,16,C.blue,true);
   textBox(slide,title,86,505,1500,100,72,C.ink,true,'title');
   textBox(slide,k,86,635,1450,55,28,C.muted,false);
   textBox(slide,'V1 内部培训版 · 1920×1080 · 2026',86,760,700,32,17,C.muted,false);
   textBox(slide,'01 / '+deck.length,1690,1030,150,22,12,C.muted,false);
 } else if(type==='image'){
   addHeader(slide,k,title,i);
   shape(slide,'roundRect',80,178,1430,805,C.white,C.line,2,'screenshot-frame');
   const bytes=await fs.readFile(`${IMG}/${img}.png`);
   slide.images.add({blob:bytes,contentType:'image/png',alt:title,fit:'contain',position:{left:95,top:193,width:1400,height:775},geometry:'roundRect',borderRadius:12});
   let y=230; for(let j=0;j<points.length;j++){
     shape(slide,'roundRect',1540,y,300,105,C.white,C.line,2,`point-${j+1}`);
     shape(slide,'ellipse',1560,y+32,42,42,C.light,'none',0);
     textBox(slide,String(j+1).padStart(2,'0'),1569,y+39,30,24,14,C.blue,true);
     textBox(slide,points[j],1615,y+22,205,68,19,C.ink,true);
     y+=128;
   }
 } else if(type==='limits'){
   addHeader(slide,k,title,i);
   const xs=[84,380,830,1070,1310,1660]; const heads=['路径','格式','单文件','单次数量','适用'];
   for(let j=0;j<5;j++){shape(slide,'rect',xs[j],270,xs[j+1]-xs[j],80,C.blue,C.blue,1);textBox(slide,heads[j],xs[j]+20,292,xs[j+1]-xs[j]-40,35,20,C.white,true)}
   const rows=[['首页直接附件','pdf/doc/docx/xls/xlsx/txt/md','≤10MB','最多3个','临时、少量'],['知识中心','另支持 csv','≤50MB','最多100个','较大、复用']];
   rows.forEach((r,ri)=>r.forEach((v,j)=>{shape(slide,'rect',xs[j],350+ri*140,xs[j+1]-xs[j],140,ri%2?C.white:'#F8FAFC',C.line,1);textBox(slide,v,xs[j]+20,390+ri*140,xs[j+1]-xs[j]-40,60,20,j===0?C.blue:C.ink,j===0)}));
 } else if(type==='flow'){
   addHeader(slide,k,title,i); let x=86;
   points.forEach((p,j)=>{shape(slide,'roundRect',x,360,300,190,C.white,'#D7E4F8',2,`flow-${j+1}`);textBox(slide,`${j+1}`,x+120,390,60,50,30,C.blue,true);textBox(slide,p,x+30,455,240,70,22,C.ink,true);if(j<points.length-1)textBox(slide,'→',x+312,420,60,60,34,C.blue,true);x+=360});
   textBox(slide,'较大 / 复用材料优先走知识中心；处理成功后再引用',390,650,1140,55,26,C.blue,true);
 } else {
   addHeader(slide,k,title,i);
   if(type==='agenda'){
     let y=230;points.forEach((p,j)=>{shape(slide,'roundRect',150,y,1620,105,C.white,C.line,2,`agenda-${j+1}`);textBox(slide,String(j+1).padStart(2,'0'),185,y+30,90,40,20,C.blue,true);textBox(slide,p,300,y+24,1370,58,25,C.ink,true);y+=125});
   } else {
     const cols=points.length===4?2:3; const w=cols===2?780:520; const gap=28; const startX=cols===2?170:110; const startY=300;
     points.forEach((p,j)=>{const col=j%cols,row=Math.floor(j/cols),x=startX+col*(w+gap),y=startY+row*260;shape(slide,'roundRect',x,y,w,220,C.white,C.line,2,`card-${j+1}`);shape(slide,'rect',x,y,w,7,C.blue,'none',0);textBox(slide,String(j+1).padStart(2,'0'),x+30,y+32,90,36,18,C.blue,true);textBox(slide,p,x+30,y+85,w-60,100,25,C.ink,true)});
   }
 }
 addNote(slide,notes);
}

for(const [index,slide] of pres.slides.items.entries()){
 const stem=`slide-${String(index+1).padStart(2,'0')}`;
 const png=await pres.export({slide,format:'png',scale:1});
 await fs.writeFile(`${OUT}/${stem}.png`,new Uint8Array(await png.arrayBuffer()));
 const layout=await slide.export({format:'layout'}); await fs.writeFile(`${OUT}/${stem}.layout.json`,await layout.text());
}
const montage=await pres.export({format:'webp',montage:true,scale:0.35}); await fs.writeFile(`${ROOT}/build/pptx/deck-montage.webp`,new Uint8Array(await montage.arrayBuffer()));
const pptx=await PresentationFile.exportPptx(pres); await pptx.save(`${ROOT}/天马智擎平台培训课件_可编辑.pptx`);
console.log(`exported ${deck.length} slides`);
