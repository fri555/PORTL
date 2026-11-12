/**
 * 产物栏 HTML 文件的演示预览内容。
 * 对齐真实产品「品牌中心销售日报」的版式：筛选条 + 指标口径 + 概览指标卡。
 * 只用于前端原型，srcdoc 内不发起任何网络请求。
 */
export function brandDailyReportHtml(): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 26px 32px 60px; background: #f5f7fb; color: #1e2430;
    font-family: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; }
  .watermark { position: fixed; inset: -30% -10%; z-index: 0; pointer-events: none;
    transform: rotate(-24deg); opacity: .42; overflow: hidden; }
  .watermark div { white-space: nowrap; color: #d2dae6; font-size: 12px; line-height: 58px; letter-spacing: 8px; }
  .sheet { position: relative; z-index: 1; max-width: 960px; margin: 0 auto; }
  h1 { margin: 0 0 26px; font-size: 25px; font-weight: 700; letter-spacing: .5px; }
  .controls { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; margin-bottom: 18px; flex-wrap: wrap; }
  .control-label { display: flex; align-items: center; gap: 6px; margin-bottom: 9px; color: #3b4250; font-size: 12px; font-weight: 600; }
  .control-label::before { content: ""; width: 3px; height: 12px; border-radius: 2px; background: #f28c28; }
  .chips { display: inline-flex; padding: 3px; border: 1px solid #e3e8f0; border-radius: 20px; background: #fff; }
  .chip { padding: 6px 15px; border: 0; border-radius: 17px; color: #5b6472; background: transparent; font-size: 12px; cursor: pointer; }
  .chip.active { color: #fff; background: #1b4f8a; font-weight: 600; }
  .range { display: inline-flex; overflow: hidden; border: 1px solid #e3e8f0; border-radius: 20px; background: #fff; }
  .range button { display: flex; min-width: 74px; flex-direction: column; align-items: center; gap: 2px;
    padding: 6px 12px; border: 0; border-right: 1px solid #eef1f6; color: #5b6472; background: transparent; font-size: 11px; cursor: pointer; }
  .range button:last-child { border-right: 0; }
  .range button strong { font-size: 12px; font-weight: 600; }
  .range button.active { color: #fff; background: #1b4f8a; }
  .custom-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; margin: 0 0 16px; padding: 11px 14px;
    border: 1px solid #dbe4f2; border-radius: 9px; background: #fff; }
  .custom-bar[hidden], .applied-bar[hidden] { display: none; }
  .custom-bar__label { color: #3b4250; font-size: 12px; font-weight: 600; }
  .custom-bar input { height: 30px; padding: 0 8px; border: 1px solid #dfe5ee; border-radius: 7px; color: #333; background: #fff; font-size: 12px; }
  .custom-bar span.sep { color: #929aa8; font-size: 12px; }
  .custom-bar button { height: 30px; padding: 0 14px; border: 1px solid #dfe5ee; border-radius: 7px; background: #fff; color: #555; font-size: 12px; cursor: pointer; }
  .custom-bar button.primary { border-color: #1b4f8a; color: #fff; background: #1b4f8a; }
  .custom-bar em { color: #c53b3b; font-size: 11px; font-style: normal; }
  .applied-bar { display: flex; align-items: center; gap: 6px; margin: 0 0 16px; padding: 9px 14px;
    border-left: 3px solid #1b4f8a; border-radius: 6px; background: #eef4fc; color: #44506a; font-size: 12px; }
  .applied-bar b { color: #1b4f8a; }
  .card { margin-bottom: 16px; padding: 18px 22px; border: 1px solid #e8edf4; border-radius: 10px; background: rgba(255,255,255,.94); }
  .card.collapsed { padding: 15px 22px; }
  h2 { margin: 0 0 4px; font-size: 15px; font-weight: 700; }
  h2 .dot { margin-right: 6px; color: #9aa5b5; }
  h3 { margin: 16px 0 12px; color: #4a5261; font-size: 12px; font-weight: 600; }
  .metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .metric { padding: 14px 16px; border: 1px solid #eaedf3; border-radius: 8px; background: #fff; }
  .metric .label { color: #78828f; font-size: 11px; }
  .metric .label i { display: inline-grid; place-items: center; width: 12px; height: 12px; margin-left: 4px;
    border: 1px solid #c7cfdb; border-radius: 50%; color: #9aa5b5; font-size: 9px; font-style: normal; }
  .metric .value { margin: 7px 0 4px; color: #1b4f8a; font-size: 22px; font-weight: 600; letter-spacing: .3px; }
  .metric .value small { margin-left: 3px; color: #78828f; font-size: 11px; font-weight: 400; }
  .metric .delta { color: #78828f; font-size: 10px; }
  .metric .delta b { font-weight: 600; }
  .up { color: #d93025 !important; }
  .down { color: #0f9d58 !important; }
  .note { margin-top: 6px; color: #9aa5b5; font-size: 10px; }
  @media (max-width: 620px) { .metrics { grid-template-columns: 1fr; } .controls { align-items: flex-start; } }
</style>
</head>
<body>
<div class="watermark" aria-hidden="true">
  <div>朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646</div>
  <div>朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646</div>
  <div>朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646</div>
  <div>朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646</div>
  <div>朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646</div>
  <div>朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646</div>
  <div>朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646</div>
  <div>朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646</div>
  <div>朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646</div>
  <div>朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646　朝暮 250646</div>
</div>
<div class="sheet">
  <h1>3 品牌销售日报</h1>
  <div class="controls">
    <div>
      <div class="control-label">切换品牌</div>
      <div class="chips" data-group="brand">
        <button type="button" class="chip active">Wiggle Wiggle</button>
        <button type="button" class="chip">STANCE</button>
        <button type="button" class="chip">Barel</button>
      </div>
    </div>
    <div>
      <div class="control-label">切换时间范围</div>
      <div class="range" data-group="range">
        <button type="button" class="active"><strong>日</strong><span>11/11</span></button>
        <button type="button"><strong>周</strong><span>11/9-11/11</span></button>
        <button type="button"><strong>月</strong><span>11/1-11/11</span></button>
        <button type="button" id="custom-trigger"><strong>自定义</strong><span>选择日期</span></button>
      </div>
    </div>
  </div>

  <div class="custom-bar" id="custom-bar" hidden>
    <span class="custom-bar__label">自定义范围</span>
    <input type="date" id="custom-start" aria-label="开始日期" />
    <span class="sep">至</span>
    <input type="date" id="custom-end" aria-label="结束日期" />
    <button type="button" class="primary" id="custom-apply">应用</button>
    <button type="button" id="custom-cancel">取消</button>
    <em id="custom-error"></em>
  </div>
  <div class="applied-bar" id="applied-bar" hidden>统计范围：<b id="applied-text"></b></div>

  <div class="card collapsed"><h2><span class="dot">·</span>指标口径</h2></div>

  <div class="card">
    <h2>概览</h2>
    <h3>核心指标</h3>
    <div class="metrics">
      <div class="metric"><div class="label">发货件数<i>?</i></div><div class="value">283<small>件</small></div><div class="delta">环比 <b class="up">+2.91%</b></div></div>
      <div class="metric"><div class="label">GSV<i>?</i></div><div class="value">68,100.41<small>元</small></div><div class="delta">环比 <b class="down">-5.08%</b></div></div>
      <div class="metric"><div class="label">发货牌额<i>?</i></div><div class="value">89,942.00<small>元</small></div><div class="delta">环比 <b class="down">-7.52%</b></div></div>
      <div class="metric"><div class="label">下单成本<i>?</i></div><div class="value">35,784.09<small>元</small></div><div class="delta">环比 <b class="down">-7.64%</b></div></div>
      <div class="metric"><div class="label">毛利率<i>?</i></div><div class="value">47.35<small>%</small></div><div class="delta">环比 <b class="up">+1.46pp</b></div></div>
      <div class="metric"><div class="label">平均折扣<i>?</i></div><div class="value">7.56<small>折</small></div><div class="delta">环比 <b class="up">+0.20折</b></div></div>
      <div class="metric"><div class="label">退货率<i>?</i></div><div class="value">15.38<small>%</small></div><div class="delta">环比 <b class="down">-6.12pp</b></div></div>
      <div class="metric"><div class="label">库存数量　静态<i>?</i></div><div class="value">35,776<small>件</small></div><div class="note">更新时间为 11/11 09:00</div></div>
    </div>
  </div>
</div>
<script>
(function () {
  var brand = document.querySelector('[data-group="brand"]');
  var range = document.querySelector('[data-group="range"]');
  var trigger = document.getElementById('custom-trigger');
  var triggerText = trigger.querySelector('span');
  var bar = document.getElementById('custom-bar');
  var applied = document.getElementById('applied-bar');
  var appliedText = document.getElementById('applied-text');
  var startInput = document.getElementById('custom-start');
  var endInput = document.getElementById('custom-end');
  var error = document.getElementById('custom-error');

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function dayString(offset) {
    var d = new Date(Date.now() + offset * 24 * 3600 * 1000);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  startInput.value = dayString(-6);
  endInput.value = dayString(0);

  function activate(target) {
    range.querySelectorAll('button').forEach(function (button) { button.classList.remove('active'); });
    target.classList.add('active');
  }

  brand.addEventListener('click', function (event) {
    var target = event.target.closest('button');
    if (!target) return;
    brand.querySelectorAll('button').forEach(function (button) { button.classList.remove('active'); });
    target.classList.add('active');
  });

  range.addEventListener('click', function (event) {
    var target = event.target.closest('button');
    if (!target) return;
    if (target === trigger) {
      bar.hidden = false;
      error.textContent = '';
      return;
    }
    activate(target);
    triggerText.textContent = '选择日期';
    bar.hidden = true;
    applied.hidden = true;
  });

  document.getElementById('custom-cancel').addEventListener('click', function () {
    bar.hidden = true;
    error.textContent = '';
  });

  document.getElementById('custom-apply').addEventListener('click', function () {
    var start = startInput.value;
    var end = endInput.value;
    if (!start || !end) { error.textContent = '请选择开始日期和结束日期'; return; }
    if (start > end) { error.textContent = '结束日期不能早于开始日期'; return; }
    error.textContent = '';
    activate(trigger);
    triggerText.textContent = start.slice(5).replace('-', '/') + '-' + end.slice(5).replace('-', '/');
    appliedText.textContent = start + ' 至 ' + end;
    applied.hidden = false;
    bar.hidden = true;
  });
})();
</script>
</body>
</html>`
}
