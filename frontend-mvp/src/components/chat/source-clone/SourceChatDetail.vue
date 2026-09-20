<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { ArrowUp, CalendarCheck, CheckCircle2, ChevronRight, Copy, ExternalLink, FileText, Link2, Paperclip, ShieldCheck, Share2, X } from 'lucide-vue-next'
import QuickPromptPanel from './QuickPromptPanel.vue'

const props = defineProps<{ sessionId: string }>()
const emit = defineEmits<{ share: [] }>()

const assetBase = import.meta.env.BASE_URL
const taskFilesOpen = ref(false)
const prompt = ref('')
const input = ref<HTMLTextAreaElement | null>(null)
const sentFollowUp = ref('')
const contextSuggestions = ref(['把今天的待办按优先级排序', '帮我起草经营复盘会议纪要', '继续查看本周剩余日程'])
const dwsStage = ref<'auth' | 'confirm' | 'done'>('auth')
const isDwsAction = computed(() => props.sessionId.includes('dws-action'))
const isExpert = computed(() => props.sessionId.includes('expert') || props.sessionId.includes('bswjqns'))
const title = computed(() => isDwsAction.value ? '帮我创建一个明天下午 3 点提交经营复盘的钉钉待办' : isExpert.value ? '你能做什么' : '获取下我钉钉上相关信息')
const expertName = computed(() => isExpert.value ? 'TOP款经营分析' : '天马智擎助手')
const placeholder = computed(() => isExpert.value
  ? 'TOP款/动销/重点/货号分析，自动诊断经营问题并输出运营优化建议，帮助运营快速定位单品风险，提升重点款动销效率。'
  : '小马在线，随时向我提问或上传文件...')

function openDwsAuthorization() {
  window.open('about:blank', 'dingtalk-oauth', 'width=520,height=720')
}
function insertQuickPrompt(text: string) {
  const el = input.value
  const start = el?.selectionStart ?? prompt.value.length
  const end = el?.selectionEnd ?? prompt.value.length
  prompt.value = `${prompt.value.slice(0, start)}${text}${prompt.value.slice(end)}`
  nextTick(() => el?.focus())
}
function useSuggestion(text: string) {
  sentFollowUp.value = text
  contextSuggestions.value = []
}
</script>

<template>
  <section class="detail-shell">
    <div class="conversation" role="log" data-testid="conversation-log" aria-label="会话内容">
      <div class="conversation-inner">
        <div class="user-row"><div class="user-bubble">{{ title }}</div></div>
        <article class="answer">
          <header class="answer-agent">
            <img :src="`${assetBase}assets/${isExpert ? 'agents-online/data-analysis.png' : 'production-home/mascot-xiaoma.png'}`" alt="" />
            <div><strong>{{ expertName }}</strong><span>{{ isExpert ? '数据与洞察' : '通用助手 · 默认智能体' }}</span></div>
          </header>
          <p class="thinking">已思考（用时 {{ isExpert ? 6 : 9 }} 秒）</p>

          <template v-if="isDwsAction">
            <p>创建待办属于钉钉写操作。首次使用需要完成账号授权，执行前还会再次向你确认。</p>

            <section v-if="dwsStage === 'auth'" class="dws-card dws-auth-card" data-testid="dws-auth-card">
              <span class="dws-card__icon"><ShieldCheck :size="22" /></span>
              <div class="dws-card__body">
                <h2>需要授权钉钉账号</h2>
                <p>授权后可在当前账号权限范围内使用日程、待办、消息和文档能力。授权状态最长保持 30 天。</p>
                <small>仅在执行操作时使用授权，不会把凭据发送给模型。</small>
                <footer>
                  <button type="button" class="secondary" aria-label="去授权钉钉账号" @click="openDwsAuthorization">去授权<ExternalLink :size="14" /></button>
                  <button type="button" class="primary" aria-label="已完成钉钉授权" @click="dwsStage = 'confirm'">已授权</button>
                </footer>
              </div>
            </section>

            <template v-else>
              <div class="dws-success" data-testid="dws-auth-success"><CheckCircle2 :size="16" />授权成功，正在继续执行...</div>
              <section v-if="dwsStage === 'confirm'" class="dws-card dws-confirm-card" data-testid="dws-confirm-card">
                <span class="dws-card__icon is-warning"><CalendarCheck :size="22" /></span>
                <div class="dws-card__body">
                  <h2>确认创建待办</h2>
                  <dl><dt>待办名称</dt><dd>提交经营复盘</dd><dt>执行人</dt><dd>朝暮（我）</dd><dt>截止时间</dt><dd>明天 15:00</dd><dt>优先级</dt><dd>中</dd></dl>
                  <p class="dws-warning">确认后将对钉钉产生实际操作，并同步到待办中心。</p>
                  <footer><button type="button" class="secondary">取消</button><button type="button" class="primary" aria-label="确认执行钉钉操作" @click="dwsStage = 'done'">确认执行</button></footer>
                </div>
              </section>
              <section v-else class="dws-result" data-testid="dws-result-card"><CheckCircle2 :size="22" /><div><strong>待办创建成功</strong><p>已同步至钉钉与天马智擎待办中心，截止时间：明天 15:00。</p></div></section>
            </template>
          </template>
          <template v-else-if="isExpert">
            <p>我可以围绕店铺 TOP 款、动销和重点货号，完成从数据诊断到经营建议的完整分析。</p>
            <h2 id="anchor-data">1. 拉数据 + 诊断</h2>
            <p>自动拉取销量、销售额、库存、毛利和流量数据，定位异常波动、断码风险与低效库存。</p>
            <h2 id="anchor-report">2. 出报告</h2>
            <p>输出结构化经营报告，包含核心结论、货号明细、问题优先级和可执行的运营动作。</p>
            <h2 id="anchor-price">3. 全网比价</h2>
            <p>对重点商品进行渠道价格核验，识别价格倒挂和活动机会，并给出整改建议。</p>
          </template>
          <template v-else>
            <p>已为你汇总钉钉上的日程、待办和相关信息。</p>
            <h2 id="anchor-calendar">今日日程</h2>
            <table><thead><tr><th>时间</th><th>主题</th><th>参与人</th></tr></thead><tbody><tr><td>11:30–12:00</td><td>项目进度沟通</td><td>清晖、朝暮</td></tr><tr><td>15:00–16:00</td><td>经营数据复盘</td><td>业务运营组</td></tr></tbody></table>
            <h2 id="anchor-todo">待办事项</h2>
            <table><thead><tr><th>状态</th><th>待办</th><th>截止时间</th></tr></thead><tbody><tr><td>进行中</td><td>确认本周重点货号清单</td><td>今天 18:00</td></tr><tr><td>未开始</td><td>提交经营复盘报告</td><td>明天 12:00</td></tr></tbody></table>
            <h2 id="anchor-note">补充说明</h2>
            <p>以上内容来自当前授权范围内的钉钉数据。涉及重要安排时，建议再次确认。</p>
          </template>

            <p v-if="!isDwsAction || dwsStage === 'done'" class="complete">全部完成 · 思考用时 {{ isExpert ? 6 : 9 }} 秒</p>
          <div class="answer-actions">
            <button type="button" aria-label="复制回答" title="复制"><Copy :size="16" /></button>
            <button type="button" aria-label="引用回答" title="引用"><Link2 :size="16" /></button>
            <button type="button" aria-label="分享回答" title="分享" @click="emit('share')"><Share2 :size="16" /></button>
          </div>
          <div v-if="(!isDwsAction || dwsStage === 'done') && contextSuggestions.length" class="context-suggestions" data-testid="context-suggestions">
            <span>你还可以继续问</span>
            <button v-for="item in contextSuggestions" :key="item" type="button" @click="useSuggestion(item)">{{ item }}</button>
          </div>
        </article>
        <div v-if="sentFollowUp" class="user-row sent-follow-up"><div class="user-bubble" data-testid="sent-follow-up">{{ sentFollowUp }}</div></div>
      </div>
    </div>

    <aside class="anchor-rail">
      <strong>回答锚点</strong>
      <a v-if="isDwsAction" href="#">钉钉授权</a>
      <a v-if="isDwsAction && dwsStage !== 'auth'" href="#">操作确认</a>
      <a v-if="isExpert && !isDwsAction" href="#anchor-data">拉数据 + 诊断</a>
      <a v-if="isExpert" href="#anchor-report">出报告</a>
      <a v-if="isExpert" href="#anchor-price">全网比价</a>
      <a v-if="!isExpert && !isDwsAction" href="#anchor-calendar">今日日程</a>
      <a v-if="!isExpert && !isDwsAction" href="#anchor-todo">待办事项</a>
      <a v-if="!isExpert && !isDwsAction" href="#anchor-note">补充说明</a>
      <button type="button" @click="taskFilesOpen = true"><FileText :size="15" />展开任务文件<ChevronRight :size="14" /></button>
    </aside>

    <div class="compact-composer">
      <textarea ref="input" v-model="prompt" :placeholder="placeholder" aria-label="继续对话" rows="1" />
      <QuickPromptPanel
        :scope="sessionId.includes('expert') ? 'data-analysis' : 'daily'"
        :scope-label="sessionId.includes('expert') ? '数据分析师' : '日常办公'"
        :prompts="[]"
        @created="insertQuickPrompt($event.content)"
      />
      <button type="button" aria-label="添加参考文件" title="添加参考文件"><Paperclip :size="18" /></button>
      <button type="button" aria-label="发送" :title="prompt.trim() ? '发送' : '请输入内容'" :disabled="!prompt.trim()"><ArrowUp :size="16" /></button>
      <small>内容由 AI 生成，请核实重要信息</small>
    </div>

    <aside v-if="taskFilesOpen" class="task-drawer" data-testid="conversation-task-files">
      <header><strong>任务文件</strong><button type="button" aria-label="关闭任务文件" title="关闭" @click="taskFilesOpen = false"><X :size="18" /></button></header>
      <button class="task-file"><FileText :size="18" /><span>经营分析结果.html<small>293.6 KB</small></span></button>
      <button class="task-file"><FileText :size="18" /><span>重点货号明细.xlsx<small>42.0 KB</small></span></button>
    </aside>
  </section>
</template>

<style scoped>
.detail-shell{position:relative;height:calc(100vh - 57px);min-height:620px;background:#fff;color:#1a1a1a;font-family:system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}.conversation{height:100%;overflow:auto;padding:36px 215px 142px 52px}.conversation-inner{width:min(780px,100%);margin:0 auto}.user-row{display:flex;justify-content:flex-end;margin:8px 0 32px}.user-bubble{max-width:75%;padding:11px 16px;border-radius:14px 4px 14px 14px;background:#f3f3f3;font-size:14px;line-height:22px}.answer{font-size:14px;line-height:1.8;color:#2c2c2c}.answer-agent{display:flex;align-items:center;gap:11px;margin-bottom:14px}.answer-agent img{width:36px;height:36px;border:1px solid #eee;border-radius:10px;object-fit:cover}.answer-agent strong,.answer-agent span{display:block}.answer-agent strong{font-size:14px}.answer-agent span{font-size:12px;color:#999}.thinking{color:#888}.answer h2{margin:25px 0 8px;font-size:17px}.answer table{width:100%;border-collapse:collapse;margin:10px 0 18px;font-size:13px}.answer th,.answer td{border:1px solid #e5e5e5;padding:9px 12px;text-align:left}.answer th{background:#f7f7f7;font-weight:500}.complete{margin-top:28px;color:#888}.answer-actions{display:flex;gap:6px;margin-top:10px}.answer-actions button,.compact-composer button,.task-drawer button,.anchor-rail button{border:0;background:transparent;cursor:pointer}.answer-actions button{display:grid;width:30px;height:30px;place-items:center;border-radius:7px;color:#777}.answer-actions button:hover{background:#f4f4f4;color:#111}.context-suggestions{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}.context-suggestions>span{width:100%;color:#999;font-size:11px}.context-suggestions button{border:1px solid #dfe4ec;border-radius:18px;padding:7px 12px;background:#fff;color:#46566f;font:12px inherit;cursor:pointer}.context-suggestions button:hover{border-color:#8eb3ef;background:#f4f8ff;color:#2469c8}.sent-follow-up{margin-top:28px}.anchor-rail{position:absolute;top:45px;right:24px;width:160px;border-left:1px solid #ededed;padding-left:18px}.anchor-rail strong{display:block;margin-bottom:12px;font-size:13px}.anchor-rail a{display:block;margin:9px 0;color:#888;font-size:12px;text-decoration:none}.anchor-rail a:hover{color:#111}.anchor-rail button{display:flex;align-items:center;gap:6px;margin-top:22px;padding:8px 0;font-size:12px;color:#555}.compact-composer{position:absolute;left:50%;bottom:16px;width:min(760px,calc(100% - 300px));transform:translateX(-50%);display:grid;grid-template-columns:1fr 34px 34px 38px;align-items:end;gap:5px;padding:12px 12px 9px;border:1px solid #ddd;border-radius:15px;background:#fff;box-shadow:0 10px 28px rgba(0,0,0,.06)}.compact-composer textarea{height:42px;resize:none;border:0;outline:0;font:14px/22px inherit}.compact-composer button{display:grid;width:32px;height:32px;place-items:center;border-radius:50%}.compact-composer>button:last-of-type{background:#111;color:#fff}.compact-composer button:disabled{background:#ddd}.compact-composer small{grid-column:1/-1;text-align:center;color:#aaa;font-size:10px}.task-drawer{position:absolute;inset:0 0 0 auto;z-index:20;width:380px;border-left:1px solid #e8e8e8;background:#fff;box-shadow:-8px 0 30px rgba(0,0,0,.05);padding:0 20px}.task-drawer header{display:flex;height:64px;align-items:center;justify-content:space-between;border-bottom:1px solid #eee}.task-drawer header button{display:grid;width:30px;height:30px;place-items:center;border-radius:7px}.task-file{display:flex!important;width:100%;align-items:center;gap:10px;padding:14px 4px!important;border-bottom:1px solid #f0f0f0!important;text-align:left}.task-file span,.task-file small{display:block}.task-file small{margin-top:2px;color:#aaa}@media(max-width:900px){.conversation{padding:28px 20px 150px}.anchor-rail{display:none}.compact-composer{width:calc(100% - 32px)}}
.dws-card{display:flex;gap:14px;margin:16px 0;border:1px solid #dce8f8;border-radius:14px;padding:16px 18px;background:#f8fbff;line-height:1.5}.dws-card__icon{display:grid;width:42px;height:42px;flex:0 0 42px;place-items:center;border-radius:11px;background:#e8f2ff;color:#1677ff}.dws-card__icon.is-warning{background:#fff3dc;color:#c87911}.dws-card__body{min-width:0;flex:1}.dws-card__body h2{margin:0;font-size:16px}.dws-card__body p{margin:6px 0;color:#596579}.dws-card__body>small{color:#8b96a8}.dws-card footer{display:flex;justify-content:flex-end;gap:9px;margin-top:12px}.dws-card footer button{display:inline-flex;height:34px;align-items:center;justify-content:center;gap:6px;border:1px solid #d5dce7;border-radius:8px;padding:0 15px;background:#fff;color:#465366;font:13px inherit}.dws-card footer button.primary{border-color:#1677ff;background:#1677ff;color:#fff}.dws-success{display:flex;align-items:center;gap:7px;margin:12px 0;color:#238653;font-size:13px}.dws-card dl{display:grid;grid-template-columns:76px 1fr;gap:6px 12px;margin:12px 0;font-size:13px}.dws-card dt{color:#8a93a2}.dws-card dd{margin:0;color:#333}.dws-card .dws-warning{border-top:1px solid #eadfcd;padding-top:9px;color:#a86511;font-size:12px}.dws-result{display:flex;align-items:flex-start;gap:12px;margin:18px 0;border:1px solid #cfe9d9;border-radius:13px;padding:17px;background:#f4fbf6;color:#238653}.dws-result strong{display:block;color:#246b43}.dws-result p{margin:3px 0 0;color:#678272;font-size:13px}
.context-suggestions{width:min(520px,100%);flex-direction:column;align-items:flex-start;gap:8px}.context-suggestions button{border:0;border-radius:12px;padding:9px 14px;background:#f5f5f5;color:#30343a;text-align:left}.context-suggestions button::after{margin-left:10px;content:'→'}.context-suggestions button:hover{background:#eceff3;color:#111}
</style>
