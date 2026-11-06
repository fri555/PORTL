<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Activity, CalendarDays, Search } from 'lucide-vue-next'
import SettingsSidebar from '@/components/settings/SettingsSidebar.vue'
import { useAppStore } from '@/stores/app'
import { monitoredAgents, operationsMetrics, operationsModules } from '@/mock/settings-overview'
const route = useRoute(); const store = useAppStore()
const isMonitor = computed(() => route.path.endsWith('/monitor'))
const title = computed(() => isMonitor.value ? '智能体监控' : '运营看板')
const query = ref('')
const period = ref('近 7 天')
const status = ref<'全部' | '正常' | '关注' | '异常'>('全部')
const moduleRows = computed(() => operationsModules.filter(item => item.name.includes(query.value.trim())))
const agentRows = computed(() => monitoredAgents.filter(item => (status.value === '全部' || item.status === status.value) && `${item.name}${item.owner}`.includes(query.value.trim())))
</script>
<template>
  <div class="settings-overview-layout"><SettingsSidebar :user-id="store.user?.id"/>
    <main class="settings-overview">
      <header><h1>{{ title }}</h1><div class="header-tools"><label><Search :size="17"/><input v-model="query" :aria-label="isMonitor ? '搜索智能体' : '搜索运营模块'" :placeholder="isMonitor ? '搜索智能体或负责人...' : '搜索模块...'" /></label><select v-if="!isMonitor" v-model="period" aria-label="统计周期"><option>今日</option><option>近 7 天</option><option>近 30 天</option></select></div></header>
      <template v-if="!isMonitor">
        <section class="metric-grid" aria-label="运营指标"><article v-for="item in operationsMetrics" :key="item.label"><span>{{ item.label }}</span><strong>{{ item.value }}</strong><small :class="{ down: item.change.startsWith('-') }">{{ item.change }}</small></article></section>
        <section class="overview-panel"><div class="panel-title"><h2>模块使用情况</h2><span><CalendarDays :size="14"/>{{ period }}</span></div><table aria-label="运营模块数据"><thead><tr><th>模块</th><th>活跃用户</th><th>调用次数</th><th>人民币消耗</th><th>调用占比</th></tr></thead><tbody><tr v-for="item in moduleRows" :key="item.name"><td>{{ item.name }}</td><td>{{ item.users }}</td><td>{{ item.calls.toLocaleString() }}</td><td>¥{{ item.consumed.toFixed(2) }}</td><td>{{ item.rate }}</td></tr></tbody></table><div v-if="!moduleRows.length" class="empty">暂无匹配模块</div></section>
      </template>
      <template v-else>
        <nav class="status-tabs" aria-label="智能体状态"><button v-for="item in ['全部','正常','关注','异常'] as const" :key="item" :class="{ active: status === item }" :aria-label="item === '异常' ? '仅看异常智能体' : `查看${item}智能体`" @click="status = item"><Activity :size="14"/>{{ item }}</button></nav>
        <section class="overview-panel"><div class="panel-title"><h2>运行状态</h2><span>最近更新 08:45</span></div><table aria-label="智能体监控"><thead><tr><th>智能体</th><th>负责人</th><th>状态</th><th>成功率</th><th>平均响应</th><th>更新时间</th></tr></thead><tbody><tr v-for="item in agentRows" :key="item.id"><td>{{ item.name }}</td><td>{{ item.owner }}</td><td><span class="status" :class="item.status">{{ item.status }}</span></td><td>{{ item.successRate }}</td><td>{{ item.response }}</td><td>{{ item.updatedAt }}</td></tr></tbody></table><div v-if="!agentRows.length" class="empty">暂无匹配智能体</div></section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.settings-overview-layout{display:flex;min-height:calc(100vh - 56px);background:#f8f9fb}.settings-overview{min-width:0;flex:1;margin:0 12px 12px 0;border:1px solid #e9e9ec;border-radius:14px;background:#fff;padding:22px 30px}.settings-overview>header{display:flex;align-items:center;justify-content:space-between;gap:20px}.settings-overview h1{margin:0;font-size:18px;font-weight:650}.header-tools{display:flex;gap:12px}.header-tools label{display:flex;width:250px;height:34px;align-items:center;gap:8px;border:1px solid #dedfe4;border-radius:8px;padding:0 11px;color:#777}.header-tools input{min-width:0;flex:1;border:0;outline:0;font-size:14px}.header-tools select{height:34px;border:1px solid #dedfe4;border-radius:8px;background:#fff;padding:0 12px}.metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:22px 0}.metric-grid article{display:grid;grid-template-columns:1fr auto;gap:8px;border:1px solid #ededf0;border-radius:10px;padding:17px 18px}.metric-grid span{grid-column:1/-1;color:#777;font-size:13px}.metric-grid strong{font-size:22px;font-weight:600}.metric-grid small{align-self:end;color:#2b8a3e}.metric-grid small.down{color:#cf4a42}.overview-panel{margin-top:22px;border:1px solid #e6e6e9;border-radius:10px;overflow:hidden}.panel-title{display:flex;height:54px;align-items:center;justify-content:space-between;padding:0 18px}.panel-title h2{margin:0;font-size:15px;font-weight:600}.panel-title span{display:flex;align-items:center;gap:6px;color:#888;font-size:12px}table{width:100%;border-collapse:collapse;text-align:left;font-size:14px}th{height:40px;background:#f6f6f8;padding:0 18px;color:#777;font-weight:500}td{height:54px;border-top:1px solid #ececef;padding:0 18px;color:#666}td:first-child{color:#222}.status-tabs{display:flex;gap:8px;margin-top:22px}.status-tabs button{display:flex;height:34px;align-items:center;gap:6px;border:1px solid #dedfe4;border-radius:8px;background:#fff;padding:0 14px;color:#555}.status-tabs button.active{border-color:#222;background:#222;color:#fff}.status{display:inline-block;border-radius:4px;padding:2px 7px;background:#e8f7ec;color:#27833d;font-size:12px}.status.关注{background:#fff5d9;color:#a46b00}.status.异常{background:#fff0ef;color:#c23b33}.empty{padding:64px;text-align:center;color:#999}@media(max-width:1000px){.metric-grid{grid-template-columns:repeat(2,1fr)}.overview-panel{overflow:auto}table{min-width:700px}}@media(max-width:720px){.settings-overview{margin:0 8px 8px;padding:16px}.settings-overview>header{align-items:flex-start;flex-direction:column}.header-tools{width:100%;flex-wrap:wrap}.header-tools label{width:100%}.metric-grid{grid-template-columns:1fr 1fr}.metric-grid article{padding:14px}.metric-grid strong{font-size:18px}}
</style>
