import fs from "node:fs/promises";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const OUT = "/Users/richelleshi/workspace/portal/training_materials/天马智擎平台培训课件.pptx";
const ASSET = "/Users/richelleshi/workspace/portal/training_materials/assets";
const QA = "/Users/richelleshi/workspace/portal/training_materials/work/ppt_qa";

const W = 1280;
const H = 720;
const BLACK = "#111111";
const MUTED = "#5E626B";
const PANEL = "#F3F4F6";
const RULE = "#D6D8DC";
const BLUE = "#2F7CF6";
const LIGHT_BLUE = "#EAF3FF";
const ORANGE = "#F5A623";
const FONT = "PingFang SC";

function addText(slide, text, x, y, w, h, size = 24, options = {}) {
  const s = slide.shapes.add({
    geometry: "textbox",
    name: options.name,
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  s.text = text;
  s.text.style = {
    fontSize: size,
    typeface: FONT,
    color: options.color || BLACK,
    bold: options.bold || false,
    alignment: options.align || "left",
    verticalAlignment: options.valign || "top",
    autoFit: options.autoFit || "shrinkText",
  };
  return s;
}

function addPanel(slide, x, y, w, h, fill = PANEL, name) {
  return slide.shapes.add({
    geometry: "rect",
    name,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: RULE, width: 1 },
  });
}

function addRule(slide, x, y, w, color = RULE) {
  return slide.shapes.add({
    geometry: "straightConnector1",
    position: { left: x, top: y, width: w, height: 0 },
    fill: "none",
    line: { style: "solid", fill: color, width: 1 },
  });
}

function addHeader(slide, title, no) {
  addText(slide, title, 42, 36, 1120, 72, 39, { bold: true, name: `title-${no}` });
  addText(slide, String(no).padStart(2, "0"), 1180, 660, 58, 24, 13, { color: MUTED, align: "right" });
}

function addNotes(slide, text) {
  slide.speakerNotes.textFrame.setText(text);
  slide.speakerNotes.setVisible(true);
}

async function addScreenshot(slide, file, x, y, w, h, alt) {
  const bytes = await fs.readFile(`${ASSET}/${file}`);
  addPanel(slide, x - 10, y - 10, w + 20, h + 20, "#FAFAFA");
  slide.images.add({
    blob: bytes,
    contentType: "image/png",
    alt,
    fit: "contain",
    position: { left: x, top: y, width: w, height: h },
  });
}

const deck = Presentation.create({ slideSize: { width: W, height: H } });

// 1. Cover — adapted from Codex Grid slide 01.
{
  const s = deck.slides.add();
  s.background.fill = "#FFFFFF";
  addText(s, "内部培训 · V1.0", 42, 42, 360, 44, 24, { color: MUTED, bold: true });
  addText(s, "天马智擎\n平台使用培训", 42, 180, 990, 246, 76, { bold: true, valign: "bottom", autoFit: "shrinkText" });
  addText(s, "首页对话 · 工作台 · 知识中心", 42, 500, 760, 76, 30, { color: BLUE, bold: true });
  addText(s, "计划下周上线｜培训与上线前验证", 42, 600, 760, 38, 18, { color: MUTED });
  addNotes(s, `【建议时长：2分钟】\n大家好，今天我们一起熟悉天马智擎平台第一版。培训聚焦三个最常用的入口：首页对话、工作台和知识中心。\n\n今天不是只讲“按钮在哪里”，更希望大家知道：哪些工作适合交给智擎、怎样提问效果更好、怎样在安全合规前提下使用，以及遇到问题如何反馈。\n\n这是第一版，目标不是一次做到完美，而是尽快让真实业务使用起来，用正向反馈推动持续迭代。`);
}

// 2. Learning journey — adapted from Codex Grid slide 06.
{
  const s = deck.slides.add();
  addHeader(s, "今天带走三件事：会用、用好、敢反馈", 2);
  const xs = [42, 454, 866];
  const nums = ["01", "02", "03"];
  const titles = ["会用三个入口", "掌握提问方法", "形成共创习惯"];
  const bodies = [
    "首页对话完成问答、文件处理和办公任务；工作台进入企业系统；知识中心沉淀与检索知识。",
    "把背景、任务、要求、输出格式说清楚；重要结论必须人工复核。",
    "识别第一版不足，提供可复现、可行动的反馈，帮助产品快速优化。",
  ];
  for (let i = 0; i < 3; i++) {
    addText(s, nums[i], xs[i], 188, 200, 64, 20, { color: BLUE, bold: true });
    addRule(s, xs[i], 258, 374, i === 0 ? BLUE : RULE);
    addText(s, titles[i], xs[i], 300, 374, 58, 28, { bold: true });
    addText(s, bodies[i], xs[i], 380, 350, 190, 19, { color: MUTED });
  }
  addNotes(s, `【建议时长：2分钟】\n今天的目标可以浓缩为三个词：会用、用好、敢反馈。\n\n第一，会用：知道三个入口分别解决什么问题。第二，用好：不是只输入一句模糊问题，而是把任务说清楚，并对重要结果进行核验。第三，敢反馈：第一版一定会有不完善之处，希望大家把真实使用中的问题和建议告诉我们。\n\n培训结束后，大家至少应能独立完成一次对话、找到工作台入口，并在知识中心完成查找或问答。`);
}

// 3. Why build in-house — adapted from Codex Grid slide 11.
{
  const s = deck.slides.add();
  addHeader(s, "为什么要自研：把智能能力放在企业可控边界内", 3);
  addText(s, "自研不是重复造工具，而是让 AI 真正进入天马的业务流程。", 42, 128, 1196, 52, 25, { color: MUTED });
  addPanel(s, 42, 244, 572, 156, LIGHT_BLUE);
  addPanel(s, 666, 244, 572, 156, "#F6F6F6");
  addText(s, "数据安全与权限可控", 72, 278, 510, 46, 28, { bold: true, color: BLUE });
  addText(s, "减少业务数据在外部工具之间流转的风险，结合企业身份、权限和管理要求使用。", 72, 334, 510, 54, 18, { color: MUTED });
  addText(s, "打通内部系统与知识", 696, 278, 510, 46, 28, { bold: true });
  addText(s, "连接内部系统、办公场景和知识资产，让问答、办理与沉淀形成连续工作链路。", 696, 334, 510, 54, 18, { color: MUTED });
  addText(s, "同时获得", 42, 462, 200, 34, 18, { color: MUTED, bold: true });
  addText(s, "可持续迭代｜贴合公司流程｜统一体验与治理", 42, 510, 900, 52, 30, { bold: true });
  addText(s, "提示：平台内控不等于“任何数据都可以上传”，仍需遵守数据分级、最小权限和保密要求。", 42, 608, 1110, 34, 16, { color: "#8A5A00" });
  addNotes(s, `【建议时长：4分钟】\n为什么我们选择自研？第一是数据安全和权限可控。业务资料如果在多个外部工具之间反复流转，会增加泄漏和失控风险。自研平台可以更好地结合公司账号、权限、审计和管理要求。\n\n第二是打通内部系统。通用工具不了解我们的组织、流程和知识，自研可以逐步把对话能力与企业系统、钉钉办公、知识中心等连接起来，让员工少切换、少重复录入。\n\n第三是持续迭代。我们可以根据真实业务优先级优化，而不是被外部产品路线牵着走。\n\n但要特别提醒：平台在企业边界内，并不代表任何敏感数据都可以随意上传。大家仍需遵守公司数据分级、最小权限和保密规范。`);
}

// 4. Platform map.
{
  const s = deck.slides.add();
  addHeader(s, "三个入口，覆盖“提问—办理—沉淀”工作链路", 4);
  const xs = [42, 454, 866];
  const tags = ["提问", "办理", "沉淀"];
  const titles = ["首页对话", "工作台", "知识中心"];
  const bodies = [
    "问答、写作、总结、联网查询、文件处理，以及钉钉消息、待办、日程等常用任务。",
    "统一进入已授权的企业系统；支持搜索系统入口，具体内容随账号权限变化。",
    "管理公共/个人知识，上传文件、建文件夹，并通过“小智问答”检索和使用知识。",
  ];
  for (let i = 0; i < 3; i++) {
    addText(s, tags[i], xs[i], 176, 110, 32, 18, { color: BLUE, bold: true });
    addText(s, titles[i], xs[i], 238, 360, 52, 32, { bold: true });
    addRule(s, xs[i], 312, 374);
    addText(s, bodies[i], xs[i], 350, 352, 154, 18, { color: MUTED });
  }
  addText(s, "建议从首页对话开始：遇到需要内部资料时进入知识中心，需要办理业务时进入工作台。", 42, 574, 1120, 56, 23, { color: BLACK, bold: true });
  addNotes(s, `【建议时长：3分钟】\n平台可以理解为三个相互衔接的入口。首页对话解决“我想知道什么、我想产出什么”；工作台解决“我要进入哪个企业系统办理”；知识中心解决“资料如何沉淀、以后如何快速找到”。\n\n实际使用时，可以先从首页对话开始。如果任务需要调用已有知识，就进入知识中心；如果需要进一步办理业务，就进入工作台。随着后续版本迭代，这条链路会越来越顺畅。`);
}

// 5. Home chat screenshot — adapted from Codex Grid slide 08.
{
  const s = deck.slides.add();
  addHeader(s, "首页对话：从一句清晰任务开始", 5);
  addText(s, "1 选择场景", 42, 176, 250, 34, 21, { bold: true, color: BLUE });
  addText(s, "日常办公 / 联网查询；也可直接点快捷卡片。", 42, 216, 520, 54, 18, { color: MUTED });
  addText(s, "2 补充材料", 42, 306, 250, 34, 21, { bold: true, color: BLUE });
  addText(s, "需要处理文档时，通过“添加附件”上传；先确认资料可在当前权限范围内使用。", 42, 346, 520, 78, 18, { color: MUTED });
  addText(s, "3 提交并复核", 42, 460, 250, 34, 21, { bold: true, color: BLUE });
  addText(s, "发送后继续追问、纠正方向；重要事实、数字和对外内容必须人工复核。", 42, 500, 520, 74, 18, { color: MUTED });
  await addScreenshot(s, "01_home_chat.png", 660, 122, 574, 508, "天马智擎首页对话界面");
  addNotes(s, `【建议时长：5分钟，配合现场演示】\n这是首页对话。输入区下方可以选择“日常办公”和“联网查询”，左侧加号用于添加附件，下面的快捷卡片覆盖发消息、建待办、建日程、查日程、查知识库和网络查询等常见任务。\n\n建议操作顺序是：先选场景，再把任务说清楚；需要资料时再上传附件；提交后不要只看第一版结果，要通过追问修正方向。\n\n现场可以演示一个低风险示例，例如：请把一段公开的会议通知改写成简洁版本。不要在演示中上传真实敏感数据。\n\n提醒大家：AI输出是助手草稿，不是最终责任主体。涉及数字、制度、客户承诺和对外发布的内容，必须由使用人复核。`);
}

// 6. Prompt method.
{
  const s = deck.slides.add();
  addHeader(s, "好结果来自四个信息：背景、任务、要求、格式", 6);
  const items = [
    ["背景", "告诉小马你在做什么、面向谁、已有材料是什么。"],
    ["任务", "用一个明确动词描述：总结、比较、改写、提取、生成。"],
    ["要求", "说明重点、口径、语气、长度、时间范围和不能做什么。"],
    ["格式", "指定输出为清单、表格、邮件、汇报提纲或行动项。"],
  ];
  const xs = [42, 344, 646, 948];
  for (let i = 0; i < items.length; i++) {
    addText(s, `0${i + 1}`, xs[i], 170, 72, 30, 17, { color: BLUE, bold: true });
    addText(s, items[i][0], xs[i], 224, 250, 46, 27, { bold: true });
    addText(s, items[i][1], xs[i], 296, 244, 126, 18, { color: MUTED });
  }
  addPanel(s, 42, 486, 1196, 122, "#F6F6F6");
  addText(s, "示例", 68, 514, 90, 28, 17, { color: BLUE, bold: true });
  addText(s, "我正在准备面向一线同事的上线通知。请基于以下要点改写为 200 字以内的通知，语气清晰友好，包含上线时间、适用范围和反馈方式，并用三段式输出。", 156, 508, 1040, 74, 20, { bold: true });
  addNotes(s, `【建议时长：4分钟】\n很多人觉得AI不好用，往往不是模型不行，而是任务信息不完整。一个好提示词可以用四个要素：背景、任务、要求、格式。\n\n先说背景，让系统知道你在做什么；再说任务，用明确动词；然后给要求，包括口径、语气、长度、范围；最后指定输出格式。\n\n不需要每次都写很长，但关键限制要说清楚。如果结果不符合预期，可以继续说“保留第二点、删掉第三点、改成更正式的语气”，把对话当作与同事协作，而不是一次性搜索。`);
}

// 7. Workbench screenshot.
{
  const s = deck.slides.add();
  addHeader(s, "工作台：统一找到已授权的企业系统", 7);
  await addScreenshot(s, "02_workbench.png", 42, 132, 574, 520, "天马智擎工作台界面");
  addText(s, "怎么用", 670, 164, 220, 36, 25, { bold: true });
  addText(s, "① 顶部导航点击“工作台”\n② 搜索系统名称或从列表进入\n③ 按原系统权限完成业务办理", 670, 218, 520, 134, 20, { color: MUTED });
  addText(s, "看不到入口？", 670, 406, 260, 36, 25, { bold: true, color: ORANGE });
  addText(s, "先点击“刷新”；仍为空时，通常与账号权限或系统配置有关，请记录账号、时间和截图后联系管理员。", 670, 462, 520, 112, 19, { color: MUTED });
  addText(s, "当前截图为测试账号状态，正式环境入口以实际授权为准。", 670, 600, 520, 32, 16, { color: MUTED });
  addNotes(s, `【建议时长：3分钟】\n工作台是企业系统的统一入口。进入后可以搜索系统，也可以从已授权列表直接打开。\n\n当前测试账号页面显示“暂无可用业务系统”，这并不代表工作台功能不存在，而是入口会随账号权限和后台配置变化。培训时要特别说明这一点。\n\n如果同事看不到预期系统，先点刷新；仍为空时，记录账号、发生时间、预期系统名称和页面截图，再联系管理员排查。不要反复尝试未经授权的入口。`);
}

// 8. Knowledge center screenshot.
{
  const s = deck.slides.add();
  addHeader(s, "知识中心：让资料可管理、可检索、可复用", 8);
  addText(s, "三个核心动作", 42, 152, 300, 38, 24, { bold: true });
  addText(s, "上传文件", 42, 220, 220, 32, 20, { color: BLUE, bold: true });
  addText(s, "把可共享资料放入正确知识库。", 42, 258, 500, 42, 18, { color: MUTED });
  addText(s, "新建文件夹", 42, 334, 220, 32, 20, { color: BLUE, bold: true });
  addText(s, "按项目、部门或主题建立清晰结构。", 42, 372, 500, 42, 18, { color: MUTED });
  addText(s, "小智问答", 42, 448, 220, 32, 20, { color: BLUE, bold: true });
  addText(s, "基于知识库提问，必要时回看原文。", 42, 486, 500, 42, 18, { color: MUTED });
  addText(s, "公共空间与个人空间的可见范围不同，上传前先确认归属与权限。", 42, 584, 560, 58, 17, { color: "#8A5A00" });
  await addScreenshot(s, "03_knowledge_center.png", 660, 122, 574, 530, "天马智擎知识中心界面");
  addNotes(s, `【建议时长：5分钟，配合现场演示】\n知识中心主要解决资料分散、找不到、重复问的问题。页面上可以看到公共空间和个人空间，右上方有上传文件、新建文件夹和小智问答。\n\n上传前先确认资料应进入公共还是个人空间，以及当前知识库的可见范围。文件命名建议包含主题、版本和日期，避免“最终版2”“新建文档”这类难以检索的名称。\n\n使用小智问答时，要把问题限定到具体范围；对于制度、参数、合同等高风险内容，回答后应回看原文或权威来源。\n\n演示时可以使用测试资料，不要把生产敏感文件上传到培训演示环境。`);
}

// 9. Knowledge workflow — timeline inspired by Codex Grid slide 17.
{
  const s = deck.slides.add();
  addHeader(s, "知识使用闭环：放对位置，比“上传成功”更重要", 9);
  addRule(s, 66, 330, 1130, BLACK);
  const xs = [66, 350, 634, 918];
  const labels = ["01 整理", "02 上传", "03 提问", "04 复核"];
  const titles = ["先判断归属", "建立清晰结构", "问题限定范围", "回到权威原文"];
  const body = [
    "确认资料密级、所有者、共享范围和有效版本。",
    "选择正确知识库与文件夹，使用可检索的文件名。",
    "说明主题、时间、对象和希望得到的输出。",
    "关键结论核对原文件；发现过期资料及时更新。",
  ];
  for (let i = 0; i < 4; i++) {
    s.shapes.add({ geometry: "ellipse", position: { left: xs[i], top: 323, width: 15, height: 15 }, fill: i === 0 ? BLUE : BLACK, line: { style: "solid", fill: "none", width: 0 } });
    addText(s, labels[i], xs[i], 270, 180, 28, 16, { color: i === 0 ? BLUE : MUTED, bold: true });
    addText(s, titles[i], xs[i], 386, 250, 38, 23, { bold: true });
    addText(s, body[i], xs[i], 438, 248, 104, 17, { color: MUTED });
  }
  addText(s, "知识质量决定问答上限：过期、重复、权限错误的资料会直接影响结果。", 42, 590, 1100, 44, 24, { bold: true });
  addNotes(s, `【建议时长：3分钟】\n知识中心不是把文件扔进去就结束。完整闭环有四步：整理、上传、提问、复核。\n\n整理阶段确认资料归属和有效版本；上传阶段放到正确结构；提问阶段限定范围；复核阶段回到权威原文。\n\n知识质量决定回答质量。如果资料过期、重复、权限设置错误，系统回答也会受到影响。每个知识库都应逐步明确维护人和更新机制。`);
}

// 10. Responsible use.
{
  const s = deck.slides.add();
  addHeader(s, "放心使用，但不要放弃判断与责任", 10);
  addText(s, "建议做", 42, 160, 400, 42, 27, { bold: true, color: BLUE });
  addText(s, "✓ 用于起草、总结、结构化、检索与方案启发\n✓ 上传前确认资料权限和必要性\n✓ 重要结果核对事实、数字、口径与来源\n✓ 对外发布前完成业务与合规审核", 42, 226, 520, 256, 20, { color: MUTED });
  addText(s, "不要做", 666, 160, 400, 42, 27, { bold: true, color: "#B24A3A" });
  addText(s, "× 上传无权访问或不应扩散的敏感资料\n× 把AI回答当成制度、合同或最终审批结论\n× 未经复核直接对外发送\n× 用模糊反馈替代可复现的问题描述", 666, 226, 520, 256, 20, { color: MUTED });
  addPanel(s, 42, 548, 1196, 82, LIGHT_BLUE);
  addText(s, "一句话原则：AI 提效，使用人负责；内部可控，权限边界仍然有效。", 70, 570, 1140, 38, 23, { bold: true });
  addNotes(s, `【建议时长：3分钟】\n平台的定位是提高效率，不是替代业务判断和责任。适合用于起草、总结、结构化、检索和方案启发。\n\n四个不要需要大家记住：不要上传无权访问或不应扩散的敏感资料；不要把回答当成制度或审批结论；不要未经复核直接对外发送；不要只说“不好用”，而不提供可复现信息。\n\n一句话原则：AI提效，使用人负责；平台在内部可控边界内运行，但原有权限边界依然有效。`);
}

// 11. V1 feedback loop.
{
  const s = deck.slides.add();
  addHeader(s, "第一版需要真实使用：反馈越具体，迭代越有效", 11);
  addText(s, "我们承认", 42, 154, 300, 38, 21, { color: MUTED, bold: true });
  addText(s, "能力、体验和系统覆盖仍有不完善之处", 42, 202, 820, 60, 33, { bold: true });
  addText(s, "反馈请包含", 42, 332, 240, 38, 21, { color: BLUE, bold: true });
  addText(s, "场景 / 操作步骤 / 期望结果 / 实际结果 / 时间 / 截图", 42, 384, 1120, 50, 28, { bold: true });
  addRule(s, 42, 468, 1196);
  addText(s, "问题反馈", 42, 510, 250, 34, 20, { bold: true });
  addText(s, "说明如何复现，便于快速定位。", 42, 552, 330, 48, 17, { color: MUTED });
  addText(s, "正向建议", 454, 510, 250, 34, 20, { bold: true });
  addText(s, "说明业务价值和希望优化的优先级。", 454, 552, 330, 48, 17, { color: MUTED });
  addText(s, "优秀案例", 866, 510, 250, 34, 20, { bold: true });
  addText(s, "分享有效用法，帮助更多同事复用。", 866, 552, 330, 48, 17, { color: MUTED });
  addNotes(s, `【建议时长：3分钟】\n我们需要坦诚说明：目前是第一版，在能力、体验和系统覆盖上一定还有不完善的地方。希望大家积极使用，并提供正向、具体、可行动的反馈。\n\n一个高质量反馈应包含：使用场景、操作步骤、期望结果、实际结果、发生时间和截图。如果是建议，请再说明它能解决什么业务问题、影响多少人、优先级为什么高。\n\n除了问题，也欢迎提交优秀案例。哪些提示词效果好、哪些工作节省了时间，这些经验同样能帮助产品迭代和内部推广。`);
}

// 12. Close — adapted from Codex Grid slide 26.
{
  const s = deck.slides.add();
  addText(s, "从今天开始", 42, 42, 320, 44, 24, { color: MUTED, bold: true });
  addText(s, "用一次\n反馈一次\n共同优化", 42, 150, 800, 300, 70, { bold: true, valign: "bottom" });
  addText(s, "1. 完成一次首页对话\n2. 查看自己的工作台权限\n3. 在知识中心完成一次检索或问答", 42, 518, 730, 126, 25, { color: BLUE, bold: true });
  addText(s, "天马智擎 V1.0", 970, 620, 268, 32, 17, { color: MUTED, align: "right" });
  addNotes(s, `【建议时长：2分钟】\n最后请大家完成三个动作：发起一次真实但低风险的首页对话；查看自己的工作台是否有应有入口；在知识中心完成一次检索或问答。\n\n请把平台当作一个会持续成长的内部伙伴。第一版的价值，要靠真实使用才能被验证；下一版的方向，也要靠大家的反馈来决定。\n\n谢谢大家，接下来进入现场练习和答疑。`);
}

await fs.mkdir(QA, { recursive: true });
for (const [i, slide] of deck.slides.items.entries()) {
  const png = await deck.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(`${QA}/slide-${String(i + 1).padStart(2, "0")}.png`, new Uint8Array(await png.arrayBuffer()));
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(`${QA}/slide-${String(i + 1).padStart(2, "0")}.layout.json`, await layout.text());
}

const montage = await deck.export({ format: "webp", montage: true, scale: 1 });
await fs.writeFile(`${QA}/montage.webp`, new Uint8Array(await montage.arrayBuffer()));
const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(OUT);
console.log(`Saved ${OUT}`);
