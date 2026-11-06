<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Activity, Bot, Cable, ChartNoAxesCombined, CircleDollarSign, Cpu, FileClock, Wrench } from 'lucide-vue-next'
import { isSystemAdministrator } from '@/composables/settings/quota-access'
import { useModuleSidebar } from '@/composables/useModuleSidebar'

const props = defineProps<{ userId?: string | null }>()
const route = useRoute()
const { isMobile, sidebarOpen, closeMobileSidebar } = useModuleSidebar()
const fullItems = [
  { label: '智能体管理', to: '/settings/agents', icon: Bot }, { label: '模型管理', to: '/settings/models', icon: Cpu },
  { label: '技能', to: '/settings/skills', icon: Wrench }, { label: '连接器', to: '/settings/connectors', icon: Cable },
  { label: '日志管理', to: '/settings/audit', icon: FileClock }, { label: '用量额度', to: '/settings/usage', icon: CircleDollarSign },
  { label: '运营看板', to: '/settings/operations', icon: ChartNoAxesCombined }, { label: '智能体监控', to: '/settings/monitor', icon: Activity },
]
const items = computed(() => isSystemAdministrator(props.userId) ? fullItems : fullItems.filter(item => item.to === '/settings/usage'))
</script>

<template>
  <button v-if="isMobile && sidebarOpen" type="button" class="sidebar-backdrop" aria-label="关闭侧边栏" @click="closeMobileSidebar" />
  <aside v-if="sidebarOpen" class="settings-navigation" data-testid="settings-sidebar"><nav aria-label="设置导航">
    <RouterLink v-for="item in items" :key="item.to" :to="item.to" :aria-current="route.path === item.to ? 'page' : undefined" :class="{ active: route.path === item.to }" @click="closeMobileSidebar">
      <component :is="item.icon" :size="18"/><span>{{ item.label }}</span>
    </RouterLink>
  </nav></aside>
</template>

<style scoped>
.settings-navigation{width:270px;flex:0 0 270px;border-right:1px solid #e9e9eb;background:#fafbfc;padding:18px 14px}.settings-navigation nav{display:flex;flex-direction:column;gap:4px}.settings-navigation a{display:flex;height:42px;align-items:center;gap:12px;border-radius:9px;padding:0 14px;color:#292929;font-size:14px;text-decoration:none}.settings-navigation a:hover{background:#f0f1f3}.settings-navigation a.active{background:#e9eaed;font-weight:600;color:#171717}.sidebar-backdrop{position:fixed;inset:56px 0 0;z-index:34;border:0;background:rgba(0,0,0,.2)}@media(max-width:720px){.settings-navigation{position:fixed;left:0;top:56px;bottom:0;z-index:35;width:270px;max-width:85vw;overflow-y:auto;box-shadow:8px 0 24px rgba(0,0,0,.08)}}
</style>
