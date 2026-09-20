$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech

$outputDir = 'D:\工作\portal\output\天马智擎AI展示方案\短视频Demo'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$scripts = @(
  '在传统电商经营中，从分析市场到商品售后，每一个环节都依赖大量人工协同。天马正在用人工智能，重新组织这条经营链路。',
  '我们构建的不是单点工具，而是一套由天马大模型、天马幻绘和天马智擎共同组成的企业级人工智能能力底座。',
  '天马大模型理解商品、市场和经营数据；天马幻绘规模化生成销售内容；天马智擎则把模型、知识和业务系统组织起来。',
  '在天马智擎中，小马作为统一入口，协同九位专家数智员工，完成数据分析、商品、内容、销售和经营任务。',
  '这些能力进一步进入电商无人店铺。从市场分析和趋势预测开始，系统辅助智能选品、进货定价、质检入库，并通过自动拍照机完成商品素材采集。',
  '天马幻绘生成商品内容，新运营系统完成自动上架和持续优化。智能投流、数字人直播、自动调拨、仓储物流和智能客服，共同推动商品经营。',
  '每一次点击、订单、评价、咨询和退货，都会重新进入系统，推动预测、选品、价格、内容和运营策略持续优化。',
  '商品进去，生意出来；数据回来，系统更聪明。天马智擎，让人工智能真正成为企业可以持续成长的数智员工。'
)

for ($i = 0; $i -lt $scripts.Count; $i++) {
  $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
  try { $speaker.SelectVoice('Microsoft Huihui Desktop') } catch { $speaker.SelectVoice('Microsoft Huihui') }
  $speaker.Rate = 3
  $speaker.Volume = 100
  $file = Join-Path $outputDir ('voice-{0:D2}.wav' -f ($i + 1))
  $speaker.SetOutputToWaveFile($file)
  $speaker.Speak($scripts[$i])
  $speaker.Dispose()
}

Write-Output $outputDir
