const { chromium } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const path = require('path')
;(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const out = 'D:/工作/portal/docs/需求文档/screenshots'
  const errors = []
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
  page.on('pageerror', err => errors.push(err.message))
  async function enter(url) {
    await page.goto(url, { waitUntil: 'networkidle' })
    const login = page.getByRole('button', { name: /模拟扫码登录/ })
    if (await login.count()) { await login.click(); await page.waitForLoadState('networkidle') }
  }

  await enter('http://127.0.0.1:5176/PORTL/agent-square')
  await page.screenshot({ path: path.join(out, 'V1.3.0-评审-23-专家市场.png'), fullPage: true })
  const firstCard = page.locator('.agent-card').first()
  await firstCard.click()
  await page.locator('.expert-detail-drawer').waitFor({ state: 'visible' })
  await page.screenshot({ path: path.join(out, 'V1.3.0-评审-26-专家详情抽屉.png'), fullPage: true })
  await page.getByLabel('关闭').click()
  await page.locator('.market-search input').fill('不存在的专家')
  await page.screenshot({ path: path.join(out, 'V1.3.0-评审-25-搜索无结果.png'), fullPage: true })

  await enter('http://127.0.0.1:5176/PORTL/settings/agents')
  await page.getByRole('button', { name: /创建智能体/ }).click()
  await page.getByRole('tab', { name: /使用说明/ }).click()
  await page.screenshot({ path: path.join(out, 'V1.3.0-评审-32-创建使用说明.png'), fullPage: true })

  await enter('http://127.0.0.1:5176/PORTL/chat')
  const textarea = page.getByRole('combobox', { name: '向小马提问' })
  await textarea.fill('@')
  await page.locator('.mention-panel').waitFor({ state: 'visible' })
  await page.screenshot({ path: path.join(out, 'V1.3.0-评审-33-快捷专家候选与键盘.png'), fullPage: true })
  await textarea.press('Enter')
  await page.screenshot({ path: path.join(out, 'V1.3.0-评审-34-选择后切换专家模式.png'), fullPage: true })
  await textarea.fill('@完全不存在')
  await page.screenshot({ path: path.join(out, 'V1.3.0-评审-35-快捷专家无结果.png'), fullPage: true })

  console.log(JSON.stringify({ title: await page.title(), url: page.url(), errors, screenshots: 6 }))
  await browser.close()
})().catch(error => { console.error(error); process.exit(1) })
