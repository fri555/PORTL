const { chromium } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const path = require('path')
;(async()=>{
  const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'})
  const page = await browser.newPage({viewport:{width:1440,height:900}, deviceScaleFactor:1})
  const out = 'D:/工作/portal/docs/需求文档/screenshots'
  const errors = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(error.message))
  async function enter(url) {
    await page.goto(url, {waitUntil:'networkidle'})
    const login = page.getByRole('button', {name:/模拟扫码登录/})
    if (await login.count()) { await login.click(); await page.waitForLoadState('networkidle') }
    await page.waitForTimeout(300)
  }

  await enter('http://127.0.0.1:5176/PORTL/agent-square')
  await page.screenshot({path:path.join(out,'V1.3.0-评审-23-专家市场.png')})

  await enter('http://127.0.0.1:5176/PORTL/chat')
  await page.getByTestId('approval-mode-trigger').click()
  await page.getByRole('menu', {name:'选择操作审批模式'}).waitFor({state:'visible'})
  await page.screenshot({path:path.join(out,'V1.3.0-评审-61-审批模式选择.png')})
  await page.getByTestId('approval-mode-autonomous').click()
  await page.getByRole('combobox', {name:'向小马提问'}).fill('整理本周经营情况')
  await page.screenshot({path:path.join(out,'V1.3.0-评审-62-自主执行待发送.png')})

  await enter('http://127.0.0.1:5176/PORTL/chat/dws-action?approvalMode=autonomous')
  await page.getByRole('button', {name:'已完成钉钉授权'}).click()
  await page.getByTestId('dws-result-card').waitFor({state:'visible'})
  await page.screenshot({path:path.join(out,'V1.3.0-评审-63-自主执行结果.png')})

  await enter('http://127.0.0.1:5176/PORTL/chat/expert-plan?approvalMode=autonomous&planState=failed')
  await page.getByTestId('execution-process-trigger').click()
  await page.getByTestId('execution-process').waitFor({state:'visible'})
  await page.screenshot({path:path.join(out,'V1.3.0-评审-50-执行过程概览.png')})

  console.log(JSON.stringify({
    errors,
    marketTabs: await page.locator('.category-tabs button').allTextContents(),
    processSteps: await page.getByTestId('execution-step').count(),
    fixedMode: await page.getByTestId('conversation-approval-mode').textContent(),
  }))
  await browser.close()
})().catch(error=>{console.error(error);process.exit(1)})

