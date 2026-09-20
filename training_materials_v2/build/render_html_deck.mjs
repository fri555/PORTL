import fs from 'node:fs/promises';
import { chromium } from '/Users/richelleshi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const root='/Users/richelleshi/workspace/portal/training_materials_v2';
const out=root+'/build/html_render';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
for(let n=1;n<=22;n++){
  await page.goto(`file://${root}/html-ppt/index.html#/${n}`,{waitUntil:'load'});
  await page.waitForTimeout(120);
  await page.screenshot({path:`${out}/slide-${String(n).padStart(2,'0')}.png`});
}
await browser.close();
console.log('rendered 22 slides');
