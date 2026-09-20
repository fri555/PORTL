const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const W = 1920, H = 1080;
const root = 'D:/工作/portal/output/天马智擎AI展示方案';
const out = path.join(root, '短视频Demo');
fs.mkdirSync(out, { recursive: true });

const assets = {
  workbench: path.join(root, '01-AI工作台主视觉.png'),
  chain: path.join(root, '03-电商无人店铺全链路.png'),
  graph: path.join(root, '04-产业数据图谱.png'),
  people: path.join(root, '07-数智员工海报-真实角色素材版.png'),
  mindmap: path.join(root, '08-天马智擎AI与无人店铺思维导图.png'),
};

function esc(s) { return s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

function lines(text, max = 18) {
  const out = []; let cur = '';
  for (const ch of text) {
    cur += ch;
    if (cur.length >= max || /[，；。]/.test(ch)) { out.push(cur); cur = ''; }
  }
  if (cur) out.push(cur);
  return out;
}

function overlay({ eyebrow, title, subtitle, caption, align = 'left', bullets = [] }) {
  const anchor = align === 'center' ? 'middle' : 'start';
  const x = align === 'center' ? 960 : 120;
  const titleLines = lines(title, align === 'center' ? 24 : 16).slice(0, 2);
  let titleSvg = titleLines.map((s, i) => `<text x="${x}" y="${180 + i*78}" text-anchor="${anchor}" fill="#fff" font-family="Microsoft YaHei,Noto Sans SC,sans-serif" font-size="64" font-weight="800">${esc(s)}</text>`).join('');
  let bulletSvg = bullets.map((s, i) => `<text x="${x}" y="${405 + i*58}" text-anchor="${anchor}" fill="#d9e9ff" font-family="Microsoft YaHei,Noto Sans SC,sans-serif" font-size="30" font-weight="600">${esc(s)}</text>`).join('');
  const cap = lines(caption, 30).slice(0, 2);
  const capSvg = cap.map((s, i) => `<text x="960" y="${944 + i*44}" text-anchor="middle" fill="#fff" font-family="Microsoft YaHei,Noto Sans SC,sans-serif" font-size="31" font-weight="700">${esc(s)}</text>`).join('');
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#020a22" stop-opacity="0.92"/><stop offset="0.55" stop-color="#020a22" stop-opacity="0.45"/><stop offset="1" stop-color="#020a22" stop-opacity="0.10"/></linearGradient></defs>
    <rect width="1920" height="1080" fill="url(#shade)"/>
    <rect x="0" y="885" width="1920" height="195" fill="#02091f" fill-opacity="0.84"/>
    <rect x="120" y="84" width="120" height="8" rx="4" fill="#6ad5ff"/>
    <text x="${x}" y="125" text-anchor="${anchor}" fill="#75d8ff" font-family="Microsoft YaHei,Noto Sans SC,sans-serif" font-size="23" font-weight="700">${esc(eyebrow)}</text>
    ${titleSvg}
    <text x="${x}" y="345" text-anchor="${anchor}" fill="#b9d0f4" font-family="Microsoft YaHei,Noto Sans SC,sans-serif" font-size="31" font-weight="500">${esc(subtitle)}</text>
    ${bulletSvg}
    ${capSvg}
  </svg>`);
}

async function cover(input, blur = 0) {
  let p = sharp(input).resize(W, H, { fit: 'cover' });
  if (blur) p = p.blur(blur);
  return p.png().toBuffer();
}

async function contain(input, w, h) {
  return sharp(input).resize(w, h, { fit: 'contain', background: {r:0,g:0,b:0,alpha:0} }).png().toBuffer();
}

async function scene(n, bg, text, extras = []) {
  await sharp(bg).composite([...extras, { input: overlay(text), left: 0, top: 0 }]).png().toFile(path.join(out, `scene-${String(n).padStart(2,'0')}.png`));
}

async function main() {
  await scene(1, await cover(assets.workbench), {
    eyebrow:'TIANMA AI BUSINESS SYSTEM', title:'天马智擎', subtitle:'AI能力底座 × 电商无人店铺',
    caption:'用AI重新组织电商经营全链路', align:'center'
  });

  await scene(2, await cover(assets.graph), {
    eyebrow:'FROM TOOLS TO BUSINESS', title:'从单点工具，走进真实业务', subtitle:'连接知识、数据、岗位与经营流程',
    bullets:['真实业务场景','企业闭环数据','持续反馈迭代'],
    caption:'天马构建的是企业级智能经营系统'
  });

  const map = await contain(assets.mindmap, 1720, 890);
  const dark = Buffer.from(`<svg width="1920" height="1080"><rect width="1920" height="1080" fill="#06112f"/><circle cx="960" cy="480" r="700" fill="#34268f" fill-opacity=".22"/></svg>`);
  await scene(3, dark, {
    eyebrow:'AI CAPABILITY', title:'三大AI能力', subtitle:'天马大模型 · 天马幻绘 · 天马智擎',
    caption:'模型理解业务，内容引擎生产素材，工作台组织执行', align:'center'
  }, [{input:map,left:100,top:125,blend:'screen'}]);

  const people = await contain(assets.people, 650, 1010);
  await scene(4, await cover(assets.workbench, 6), {
    eyebrow:'DIGITAL EMPLOYEES', title:'数智员工，协同完成工作', subtitle:'1位通用助手 + 9位专家员工',
    bullets:['分析与洞察','商品与销售','内容与经营'],
    caption:'岗位知识、企业数据和工作方法沉淀为数字生产力'
  }, [{input:people,left:1190,top:35}]);

  await scene(5, await cover(assets.chain), {
    eyebrow:'AUTONOMOUS E-COMMERCE', title:'电商无人店铺', subtitle:'不是没有人，而是不依赖大量人工重复操作',
    caption:'市场分析 → 智能选品 → 进货入库 → 自动拍摄'
  });

  const operations = await sharp(assets.mindmap)
    .extract({ left: 900, top: 245, width: 1000, height: 1100 })
    .resize(1020, 900, { fit: 'contain', background: {r:0,g:0,b:0,alpha:0} })
    .png().toBuffer();
  await scene(6, dark, {
    eyebrow:'END-TO-END OPERATION', title:'从商品到经营结果', subtitle:'一套系统贯通电商经营全流程',
    bullets:['自动化上架与智能运营','智能投流与数字人直播','自动调拨、履约与客服'],
    caption:'天马AI能力进入电商经营的每一个关键节点'
  }, [{input:operations,left:850,top:85}]);

  await scene(7, await cover(assets.graph), {
    eyebrow:'DATA FLYWHEEL', title:'业务执行，数据持续回流', subtitle:'订单、评价、客服、退货与投流结果反哺系统',
    bullets:['预测更准确','内容更有效','经营更敏捷'],
    caption:'系统不仅自动做，还能够根据经营结果自动学'
  });

  await scene(8, await cover(assets.workbench), {
    eyebrow:'TIANMA INTELLIGENCE ENGINE', title:'商品进去，生意出来', subtitle:'数据回来，系统更聪明',
    caption:'天马智擎｜让AI成为持续成长的数智员工', align:'center'
  });

  console.log(out);
}

main().catch(e => { console.error(e); process.exit(1); });
