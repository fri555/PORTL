const sharp = require('sharp');
const path = require('path');

const width = 800;
const height = 2000;
const sourceDir = 'C:/Users/Administrator/Desktop/天马智擎(1)';
const background = 'C:/Users/Administrator/.codex/generated_images/01a060ef-770b-74a1-bf6f-1d0ff6ab8f7a/exec-e04595e6-c704-43e1-9f36-7b5881ec21b7.png';
const output = 'D:/工作/portal/output/天马智擎AI展示方案/07-数智员工海报-真实角色素材版.png';

const employees = [
  ['数据分析专家.png', '数据分析师'],
  ['组货专家.png', '组货专家'],
  ['评价分析师.png', '评论分析师'],
  ['灵感大王.png', '营销图文设计师'],
  ['脚本大师.png', '脚本大师'],
  ['销售分析师.png', '销售订单分析师'],
  ['现货销售分析师.png', '现货销售分析师'],
  ['比价助手.png', '全网比价助手'],
  ['TOP款经营分析.png', 'TOP款分析师'],
];

function esc(text) {
  return text.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}

async function roundedAvatar(file, size, radius = 24) {
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="white"/></svg>`);
  return sharp(file)
    .resize(size, size, { fit: 'cover' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function main() {
  const cardXs = [40, 293, 546];
  const cardYs = [1260, 1470, 1680];
  const cardW = 214;
  const cardH = 190;
  const avatarSize = 112;
  const composites = [];

  const overlay = [];
  overlay.push(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`);
  overlay.push(`<defs><filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`);
  overlay.push(`<rect x="24" y="26" width="752" height="146" rx="24" fill="#031337" fill-opacity="0.72"/>`);
  overlay.push(`<text x="400" y="78" text-anchor="middle" fill="#82D8FF" font-family="Microsoft YaHei,Noto Sans SC,sans-serif" font-size="20" font-weight="700">TIANMA INTELLIGENCE ENGINE</text>`);
  overlay.push(`<text x="400" y="138" text-anchor="middle" fill="#FFFFFF" font-family="Microsoft YaHei,Noto Sans SC,sans-serif" font-size="52" font-weight="800">天马智擎 数智员工</text>`);
  overlay.push(`<rect x="222" y="164" width="356" height="54" rx="27" fill="#031337" fill-opacity="0.90" stroke="#67CFFF" stroke-opacity="0.48"/>`);
  overlay.push(`<text x="400" y="200" text-anchor="middle" fill="#D8EAFF" font-family="Microsoft YaHei,Noto Sans SC,sans-serif" font-size="23" font-weight="700">1位通用助手 + 9位专家员工</text>`);

  overlay.push(`<rect x="245" y="365" width="310" height="310" rx="42" fill="#071C52" fill-opacity="0.66" stroke="#6BD4FF" stroke-width="2"/>`);
  overlay.push(`<circle cx="400" cy="520" r="128" fill="none" stroke="#7B67FF" stroke-width="2" stroke-opacity="0.75" filter="url(#glow)"/>`);
  overlay.push(`<text x="400" y="620" text-anchor="middle" fill="#FFFFFF" font-family="Microsoft YaHei,Noto Sans SC,sans-serif" font-size="28" font-weight="800">天马智擎助手</text>`);
  overlay.push(`<text x="400" y="652" text-anchor="middle" fill="#9EDCFF" font-family="Microsoft YaHei,Noto Sans SC,sans-serif" font-size="17" font-weight="600">统一入口 · 协同数智员工完成任务</text>`);

  const pillars = [
    ['天马大模型', '垂类电商理解与推理'],
    ['天马幻绘', 'AIGC视觉内容生成'],
    ['天马智擎', '企业级AI工作台'],
  ];
  for (let i = 0; i < pillars.length; i++) {
    const x = 40 + i * 253;
    overlay.push(`<rect x="${x}" y="785" width="214" height="130" rx="22" fill="#071A4B" fill-opacity="0.78" stroke="${i === 1 ? '#A77BFF' : '#61C9FF'}" stroke-width="2"/>`);
    overlay.push(`<text x="${x + 107}" y="838" text-anchor="middle" fill="#FFFFFF" font-family="Microsoft YaHei,Noto Sans SC,sans-serif" font-size="24" font-weight="800">${pillars[i][0]}</text>`);
    overlay.push(`<text x="${x + 107}" y="878" text-anchor="middle" fill="#A9CCF8" font-family="Microsoft YaHei,Noto Sans SC,sans-serif" font-size="15" font-weight="600">${pillars[i][1]}</text>`);
  }
  overlay.push(`<path d="M147 930 C230 1010 300 1010 400 1090 C500 1010 570 1010 653 930" fill="none" stroke="#65CFFF" stroke-width="3" stroke-opacity="0.72"/>`);
  overlay.push(`<text x="400" y="1118" text-anchor="middle" fill="#FFFFFF" font-family="Microsoft YaHei,Noto Sans SC,sans-serif" font-size="38" font-weight="800">9大专家数智员工</text>`);
  overlay.push(`<text x="400" y="1156" text-anchor="middle" fill="#9FCAFF" font-family="Microsoft YaHei,Noto Sans SC,sans-serif" font-size="18">覆盖分析、商品、内容、销售与经营场景</text>`);

  for (let i = 0; i < employees.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = cardXs[col];
    const y = cardYs[row];
    overlay.push(`<rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="22" fill="#061743" fill-opacity="0.84" stroke="#5ABEFF" stroke-width="1.5"/>`);
    overlay.push(`<text x="${x + cardW / 2}" y="${y + 166}" text-anchor="middle" fill="#FFFFFF" font-family="Microsoft YaHei,Noto Sans SC,sans-serif" font-size="${employees[i][1].length > 6 ? 17 : 20}" font-weight="700">${esc(employees[i][1])}</text>`);
  }
  overlay.push(`<rect x="38" y="1901" width="724" height="64" rx="24" fill="#0A1B52" fill-opacity="0.88" stroke="#766BFF" stroke-width="2"/>`);
  overlay.push(`<text x="400" y="1944" text-anchor="middle" fill="#FFFFFF" font-family="Microsoft YaHei,Noto Sans SC,sans-serif" font-size="23" font-weight="800">让岗位能力沉淀为可复用、可协同、可成长的数字生产力</text>`);
  overlay.push(`</svg>`);

  composites.push({ input: Buffer.from(overlay.join('')), left: 0, top: 0 });

  const pony = await sharp(path.join(sourceDir, '小马.png')).resize(184, 184, { fit: 'contain' }).png().toBuffer();
  composites.push({ input: pony, left: 308, top: 398 });

  for (let i = 0; i < employees.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const avatar = await roundedAvatar(path.join(sourceDir, employees[i][0]), avatarSize);
    composites.push({ input: avatar, left: cardXs[col] + 51, top: cardYs[row] + 18 });
  }

  await sharp(background)
    .resize(width, height, { fit: 'cover' })
    .composite(composites)
    .png()
    .toFile(output);
  console.log(output);
}

main().catch(err => { console.error(err); process.exit(1); });
