import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const raw = path.join(root, "screenshots/raw");
const out = path.join(root, "screenshots/annotated");
await fs.mkdir(out, { recursive: true });

const RED = "#e53935";
const specs = {
  "00_login": [
    { box:[770,150,420,50], label:[1200,130,"三种登录方式"], to:[1145,170] },
    { box:[770,205,420,230], label:[650,315,"手机号 / 验证码 / 短信码"], to:[770,320] },
    { box:[770,445,420,55], label:[1200,470,"点击登录"], to:[1145,472] },
  ],
  "01_home_daily": [
    { box:[455,378,800,172], label:[930,300,"对话输入区"], to:[930,378] },
    { box:[474,582,762,160], label:[1260,632,"快捷场景"], to:[1236,650] },
    { box:[472,501,272,38], label:[820,533,"附件 / 模式 / 联网"], to:[744,521] },
  ],
  "02_mode_menu": [
    { box:[520,374,212,122], label:[760,388,"两种模式"], to:[732,414] },
  ],
  "03_expert_grid": [
    { box:[732,668,245,75], label:[740,620,"组货专家"], to:[850,668] },
    { box:[990,668,246,75], label:[1110,620,"评价分析师"], to:[1110,668] },
  ],
  "04_group_expert": [
    { box:[468,390,714,30], label:[800,345,"能力说明"], to:[820,390] },
    { box:[763,581,184,34], label:[970,610,"初始化模板"], to:[947,598] },
  ],
  "05_eval_expert": [
    { box:[468,390,770,30], label:[920,345,"评价分析能力"], to:[920,390] },
    { box:[586,581,537,74], label:[1160,610,"5 类快捷分析"], to:[1123,610] },
  ],
  "06_attachment_local": [
    { box:[350,48,740,805], label:[1120,100,"本地附件弹窗"], to:[1090,110] },
    { box:[490,294,476,28], label:[1080,300,"≤10MB / 最多3个"], to:[966,308] },
  ],
  "07_knowledge_picker": [
    { box:[382,193,368,34], label:[790,210,"搜索 + 空间"], to:[750,210] },
    { box:[382,280,676,164], label:[1090,335,"选择知识库"], to:[1058,335] },
  ],
  "08_knowledge_list": [
    { box:[1034,71,374,34], label:[1115,125,"上传 / 新建 / 小智"], to:[1200,105] },
    { box:[302,118,1090,670], label:[1180,815,"知识库列表"], to:[1120,788] },
  ],
  "09_kb_inside": [
    { box:[302,157,1090,58], label:[980,235,"文件状态：处理成功"], to:[500,215] },
    { box:[1295,71,113,34], label:[1240,125,"小智问答"], to:[1345,105] },
  ],
  "10_kb_upload": [
    { box:[350,257,740,387], label:[1115,340,"知识库上传"], to:[1090,360] },
    { box:[374,416,650,42], label:[1050,470,"≤50MB / 最多100个"], to:[930,458] },
  ],
  "11_dashboard": [
    { box:[302,116,768,34], label:[720,85,"事业部 + 时间范围"], to:[720,116] },
    { box:[1288,116,114,34], label:[1230,85,"指标配置"], to:[1345,116] },
    { box:[302,164,1100,536], label:[1150,735,"指标卡：当前值 / 同比 / 环比"], to:[1080,700] },
  ],
  "12_dashboard_config": [
    { box:[382,132,677,584], label:[1100,240,"15项：4 + 4 + 7"], to:[1059,260] },
    { box:[997,805,62,33], label:[1100,820,"保存"], to:[1059,821] },
  ],
  "13_workbench": [
    { box:[955,84,300,33], label:[1270,105,"搜索入口"], to:[1255,101] },
    { box:[184,164,1072,370], label:[1090,565,"按权限展示系统入口"], to:[1050,534] },
  ],
};

function esc(s){return s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));}

for (const [name, marks] of Object.entries(specs)) {
  const png = await fs.readFile(path.join(raw, `${name}.png`));
  const data = `data:image/png;base64,${png.toString("base64")}`;
  const layers = marks.map((m, idx) => {
    const [x,y,w,h]=m.box, [lx,ly,label]=m.label, [tx,ty]=m.to;
    const startX = lx < tx ? lx + Math.max(76,label.length*15) : lx;
    return `<g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="none" stroke="${RED}" stroke-width="5"/>
      <line x1="${startX}" y1="${ly}" x2="${tx}" y2="${ty}" stroke="${RED}" stroke-width="4" marker-end="url(#arrow)"/>
      <rect x="${lx-8}" y="${ly-20}" width="${Math.max(96,label.length*16)+16}" height="34" rx="8" fill="white" fill-opacity=".94" stroke="${RED}" stroke-width="2"/>
      <circle cx="${lx+8}" cy="${ly-3}" r="12" fill="${RED}"/>
      <text x="${lx+8}" y="${ly+2}" text-anchor="middle" font-family="Arial, PingFang SC" font-size="15" font-weight="700" fill="white">${idx+1}</text>
      <text x="${lx+28}" y="${ly+3}" font-family="Arial, PingFang SC" font-size="17" font-weight="700" fill="${RED}">${esc(label)}</text>
    </g>`;
  }).join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900" viewBox="0 0 1440 900">
    <defs><marker id="arrow" markerWidth="11" markerHeight="11" refX="9" refY="5.5" orient="auto"><path d="M0,0 L11,5.5 L0,11 z" fill="${RED}"/></marker></defs>
    <image href="${data}" x="0" y="0" width="1440" height="900"/>
    ${layers}
  </svg>`;
  await fs.writeFile(path.join(out, `${name}.svg`), svg);
}
