<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Play, X, Bell } from 'lucide-vue-next'
import { executionNotice, type ExecutionNoticeInput } from '@/utils/executionNotice'
import { readPrototypeChatValue, writePrototypeChatValue } from '@/utils/prototypeChatStore'
const route=useRoute(), router=useRouter()
const tasks=[{id:'agent-inspection',name:'每日数据巡检',kind:'agent' as const,subject:'数据巡检 Agent'},{id:'todo-report',name:'每日日报推送',kind:'todo' as const,subject:'提交日报'}]
const selectedTask=ref(tasks[0]!.id)
const task=computed(()=>tasks.find(t=>t.id===selectedTask.value)!)
const modes=ref<Record<string,'default'|'autonomous'>>(readPrototypeChatValue('automation-permissions') || {})
const mode=computed({get:()=>modes.value[selectedTask.value] || 'default',set:(value:'default'|'autonomous')=>{modes.value[selectedTask.value]=value;writePrototypeChatValue('automation-permissions',modes.value)}})
type Run=ExecutionNoticeInput & {permission:'default'|'autonomous';notificationsEnabled?:boolean}
const initial:Run[]=[
 {taskId:'agent-inspection',runId:'run-agent-1012',kind:'agent',taskName:'每日数据巡检',subjectName:'数据巡检 Agent',executedAt:'2026-10-12 09:00:00',state:'success',conversationId:'expert-automation-result',permission:'autonomous'},
 {taskId:'todo-report',runId:'run-todo-1012',kind:'todo',taskName:'每日日报推送',subjectName:'提交日报',executedAt:'2026-10-12 09:00:00',state:'abnormal',reason:'钉钉授权已失效，请重新授权后重试。',permission:'default'},
 {taskId:'agent-inspection',runId:'run-agent-waiting',kind:'agent',taskName:'每日数据巡检',subjectName:'数据巡检 Agent',executedAt:'2026-10-12 10:00:00',state:'waiting',reason:'需要补充必填的统计日期。',conversationId:'expert-automation-required',interruptionId:'required-date',permission:'autonomous'},
]
const storedRuns=readPrototypeChatValue<Run[]>('automation-runs')
const runs=ref<Run[]>(Array.isArray(storedRuns) ? storedRuns : initial)
watch(runs, value=>writePrototypeChatValue('automation-runs',value), {deep:true})
const reminderSettings=ref<Record<string,{enabled:boolean;seconds:number}>>(readPrototypeChatValue('automation-reminders') || {})
const reminder=computed(()=>reminderSettings.value[selectedTask.value] ||= {enabled:true,seconds:60})
watch(reminderSettings, value=>{if(Object.values(value).every(v=>Number.isInteger(v.seconds)&&v.seconds>0))writePrototypeChatValue('automation-reminders',value)}, {deep:true})
for(const run of initial.filter(r=>r.kind==='agent')) {
 if(!readPrototypeChatValue('plan:'+run.conversationId)) writePrototypeChatValue('plan:'+run.conversationId,{status:run.state==='success'?'done':'awaiting_clarification',startedAt:new Date(run.executedAt.replace(' ','T')+'+08:00').getTime(),finishedAt:run.state==='success'?new Date(run.executedAt.replace(' ','T')+'+08:00').getTime()+1800:null,attempt:1,clarifications:run.state==='waiting'?[{id:'date',label:'统计日期',required:true,value:''}]:[]})
}
const current=computed(()=>runs.value.find(r=>r.runId===route.query.runId))
const notice=computed(()=>current.value ? executionNotice(current.value):null)
const missingRecord=computed(()=>!!route.query.runId&&!current.value)
const label=(state:string)=>({success:'成功',abnormal:'异常',waiting:'待处理',running:'执行中'}[state] || state)
function open(run:Run){router.replace({path:'/automation',query:{runId:run.runId}})}
function retry(){if(!current.value || current.value.state!=='abnormal')return;selectedTask.value=current.value.taskId;start()}
function start(){
 if(!Number.isInteger(reminder.value.seconds)||reminder.value.seconds<1)return
 const id='run-'+crypto.randomUUID()
 const run:Run={taskId:task.value.id,runId:id,kind:task.value.kind,taskName:task.value.name,subjectName:task.value.subject,executedAt:new Date().toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'}),state:'waiting',reason:mode.value==='default'?'等待确认执行计划。':'等待本人完成钉钉 DWS 授权。',conversationId:task.value.kind==='agent'?'expert-'+id:undefined,interruptionId:'initial',permission:mode.value,notificationsEnabled:reminder.value.enabled}
 runs.value.unshift(run);open(run)
}
</script>
<template>
 <main class="automation-page">
  <header><div><h1>自动化</h1><p>任务配置与运行记录</p></div><span class="demo">评审原型 · 示例数据</span></header>
  <section class="task-settings">
   <h2>任务设置</h2><div class="setting-row"><label>任务 <select v-model="selectedTask"><option v-for="item in tasks" :key="item.id" :value="item.id">{{ item.name }}</option></select></label><label>权限控制 <select v-model="mode" data-testid="automation-permission"><option value="default">默认权限</option><option value="autonomous">自主执行</option></select></label><button class="primary" @click="start"><Play :size="14"/>运行示例</button></div>
   <p>{{ mode==='default'?'需求澄清、计划确认和审批授权按现有流程处理。':'自动执行计划、跳过非必填澄清并同意可代办的执行审批；必填信息、不可代办审批及本人账号授权仍需处理。' }}</p>
   <div class="reminder-options"><label><input v-model="reminder.enabled" type="checkbox"/>钉钉提醒</label><label>无进展时长 <input v-model.number="reminder.seconds" type="number" min="1" step="1" aria-label="无进展提醒时长"/> 秒</label><span v-if="!Number.isInteger(reminder.seconds)||reminder.seconds<1" role="alert">请输入正整数秒数</span></div><div class="notification-hint"><Bell :size="15"/>中断时提醒，运行结束后推送成功或失败结果</div>
  </section>
  <section class="run-list"><h2>运行记录</h2><table><thead><tr><th>任务名称</th><th>任务类型</th><th>执行时间</th><th>权限控制</th><th>执行状态</th><th>异常/中断原因</th><th>操作</th></tr></thead><tbody><tr v-for="run in runs" :key="run.runId"><td>{{run.taskName}}</td><td>{{run.kind==='agent'?'智能体任务':'待办任务'}}</td><td>{{run.executedAt}}</td><td>{{run.permission==='default'?'默认权限':'自主执行'}}</td><td><span class="status" :class="run.state">{{label(run.state)}}</span></td><td>{{run.reason || '—'}}</td><td><button @click="open(run)">查看详情</button></td></tr></tbody></table></section>
  <div v-if="current || missingRecord" class="detail-mask" @click.self="router.replace('/automation')"><section class="run-detail" role="dialog" aria-label="运行记录详情"><header><h2>运行记录详情</h2><button aria-label="关闭详情" @click="router.replace('/automation')"><X :size="18"/></button></header><p v-if="missingRecord">记录不存在或无权访问。</p><template v-if="current && notice"><dl><dt>运行 ID</dt><dd>{{current.runId}}</dd><dt>任务名称</dt><dd>{{current.taskName}}</dd><dt>执行状态</dt><dd><span class="status" :class="current.state">{{label(current.state)}}</span></dd><template v-if="current.reason"><dt>{{current.state==='abnormal'?'异常原因':'中断原因'}}</dt><dd>{{current.reason}}</dd></template></dl><button v-if="current.state==='abnormal'" class="primary" @click="retry">重试任务</button><h3>钉钉通知预览</h3><p v-if="current.notificationsEnabled===false">本次运行已关闭钉钉提醒。</p><article v-else class="notice-card"><strong>{{notice.title}}</strong><p v-for="line in notice.lines" :key="line">{{line}}</p><a v-if="notice.href" :href="notice.href">查看详情</a><span v-else>记录暂不可用</span></article><small class="demo">原型展示通知内容，尚未发送真实消息。</small></template></section></div>
 </main>
</template>
<style scoped>
.automation-page{padding:32px 40px;overflow:auto;height:100%;background:#f7f8fa;color:#27303b}.automation-page>header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}h1{font-size:22px;margin:0}h2{font-size:16px;margin:0 0 20px}h3{font-size:14px;margin:28px 0 12px}header p,.task-settings>p{font-size:13px;color:#8a929f;margin-top:8px}.demo{font-size:12px;color:#8f98a5}.task-settings,.run-list{background:white;border:1px solid #e8ebef;border-radius:12px;padding:24px;margin-bottom:22px}.setting-row{display:flex;gap:24px;align-items:center}.setting-row label{display:flex;align-items:center;gap:12px;font-size:13px}select{border:1px solid #dce1e7;border-radius:7px;padding:8px 12px;min-width:160px;background:white;color:#39424f}button{border:0;background:transparent;color:#1677ff;cursor:pointer;font:inherit;font-size:12px}.primary{display:flex;gap:6px;align-items:center;background:#1677ff;color:white;padding:9px 14px;border-radius:7px}.reminder-options{display:flex;align-items:center;gap:24px;font-size:12px;margin-top:20px;color:#697687}.reminder-options label{display:flex;align-items:center;gap:6px}.reminder-options input[type=number]{width:72px;border:1px solid #dce1e7;border-radius:5px;padding:5px}.notification-hint{display:flex;align-items:center;gap:8px;font-size:12px;color:#8a929f;margin-top:20px}table{width:100%;border-collapse:collapse;text-align:left;font-size:12px}th{background:#fafbfc;color:#7e8794;font-weight:500}td,th{padding:15px 10px;border-bottom:1px solid #eef0f3}.status{padding:3px 9px;border-radius:5px;background:#f0f2f5;color:#687487;white-space:nowrap}.status.success{background:#edf9f3;color:#279364}.status.abnormal{background:#fff1f0;color:#d65555}.status.waiting{background:#fff8e8;color:#b88726}.detail-mask{position:fixed;inset:0;background:#17243a44;z-index:100;display:grid;place-items:center}.run-detail{background:white;border-radius:14px;padding:26px;width:560px;max-width:90vw;box-shadow:0 16px 60px #15213722}.run-detail header{display:flex;justify-content:space-between}.run-detail header h2{margin:0}.run-detail dl{display:grid;grid-template-columns:84px 1fr;gap:15px;font-size:13px;margin-top:26px}.run-detail dt{color:#89929e}.run-detail dd{margin:0}.notice-card{border:1px solid #e3e8ee;border-radius:10px;background:#fafbfd;padding:20px;margin-bottom:12px}.notice-card strong{display:block;margin-bottom:16px;font-size:15px}.notice-card p{font-size:13px;line-height:1.6;margin:5px 0}.notice-card a{display:block;border-top:1px solid #e3e8ee;margin-top:17px;padding-top:12px;color:#1677ff;font-size:13px}
</style>
