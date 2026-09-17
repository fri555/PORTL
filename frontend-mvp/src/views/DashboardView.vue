<script setup lang="ts">
import { computed, ref } from 'vue'
import { BarChart3, LockKeyhole, RefreshCw, Settings2 } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'
const store = useAppStore()
const active = ref('guandata')
const isAdmin = computed(() => store.user?.role === 'admin')
</script>

<template>
  <main class="dashboard-shell">
    <aside class="dashboard-nav"><h1>仪表盘</h1><button type="button" :class="{ active: active === 'guandata' }" @click="active = 'guandata'"><BarChart3 :size="17" /><span>观远运营看板</span><small>权限菜单</small></button></aside>
    <section class="dashboard-content">
      <header><div><h2>观远运营看板</h2><p>数据每小时刷新，次日完成前一日口径校准；查看与导出权限由观远控制</p></div><div class="actions"><span><RefreshCw :size="14" />最近更新 09:00</span><button v-if="isAdmin" type="button"><Settings2 :size="15" />观远权限配置</button></div></header>
      <div v-if="isAdmin" class="guandata-frame"><div class="frame-head"><strong>AI 工作台运营总览</strong><span>观远 BI 安全内嵌 · 短时凭证</span></div><div class="cards"><article><span>活跃用户</span><b>2,418</b><small>环比 +12.8%</small></article><article><span>会话请求</span><b>36,920</b><small>环比 +8.6%</small></article><article><span>Token 消耗</span><b>84.6M</b><small>次日重算</small></article><article><span>金额消耗</span><b>¥68,425</b><small>人民币</small></article></div><div class="chart"><i v-for="height in [34,48,42,65,58,76,68,82,74,91,86,96]" :key="height" :style="{height:`${height}%`}" /></div></div>
      <div v-else class="no-access"><LockKeyhole :size="38" /><h2>暂无查看权限</h2><p>入口当前仅对超级管理员开放；进入后仍由观远按登录身份、角色和看板授权判断可见范围。</p></div>
    </section>
  </main>
</template>

<style scoped>
.dashboard-shell{display:flex;min-height:calc(100vh - 57px);gap:8px;background:#f5f5f6;padding:8px;font-family:system-ui,"PingFang SC",sans-serif}.dashboard-nav{width:220px;border:1px solid #ececef;border-radius:8px;background:#fff;padding:22px 14px}.dashboard-nav h1{margin:0 10px 20px;font-size:18px}.dashboard-nav button{display:grid;width:100%;grid-template-columns:22px 1fr auto;align-items:center;border:0;border-radius:8px;padding:12px;background:#18181b;color:#fff;text-align:left}.dashboard-nav small{font-size:9px;color:#ccc}.dashboard-content{min-width:0;flex:1;border:1px solid #ececef;border-radius:8px;background:#fff;padding:24px}.dashboard-content>header{display:flex;align-items:center;justify-content:space-between}.dashboard-content h2{margin:0;font-size:18px}.dashboard-content header p{margin:5px 0 0;color:#888;font-size:12px}.actions{display:flex;align-items:center;gap:12px}.actions span,.actions button{display:flex;align-items:center;gap:6px;font-size:12px}.actions button{height:34px;border:1px solid #ddd;border-radius:7px;background:#fff;padding:0 12px}.guandata-frame{margin-top:20px;border:1px solid #e5e7eb;border-radius:10px;padding:18px}.frame-head{display:flex;justify-content:space-between}.frame-head span{color:#999;font-size:11px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:16px}.cards article{border:1px solid #eee;border-radius:9px;padding:15px}.cards span,.cards small{display:block;color:#888;font-size:11px}.cards b{display:block;margin:9px 0;font-size:22px}.chart{display:flex;height:320px;align-items:end;gap:16px;margin-top:18px;border-radius:10px;background:linear-gradient(#fafafa 1px,transparent 1px);background-size:100% 20%;padding:24px}.chart i{flex:1;border-radius:5px 5px 0 0;background:linear-gradient(#65a1f4,#236fd5)}.no-access{display:grid;min-height:480px;place-items:center;align-content:center;color:#999}.no-access h2{margin:16px 0 6px;color:#333}.no-access p{max-width:480px;text-align:center;font-size:13px}
</style>
