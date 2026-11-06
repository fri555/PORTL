<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElDialog } from 'element-plus'
import { ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, Download, FileText, MoreHorizontal, RotateCcw, Search, ShieldCheck } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import SettingsSidebar from '@/components/settings/SettingsSidebar.vue'
import QuotaPermissionDialog from '@/components/settings/usage/QuotaPermissionDialog.vue'
import SettingsInsightsView from '@/views/SettingsInsightsView.vue'
import { useAppStore } from '@/stores/app'
import { departmentScopeIds, useSettingsQuotaStore } from '@/stores/settings-quota'
import { canManageQuota, isSystemAdministrator } from '@/composables/settings/quota-access'
import { filteredQuotaRows, quotaCsvRows, quotaRate, quotaRateLabel, quotaUsageRecords, type QuotaUsageFilters } from '@/composables/settings/quota-usage'
import { downloadCsv, money } from '@/composables/settings/insights-helpers'
import type { QuotaMember } from '@/mock/settings-quota'
import { deptTree } from '@/mock/settings-insights'
import type { DeptNode } from '@/types/settings-insights'

const app = useAppStore()
const quotas = useSettingsQuotaStore()
const route = useRoute()
const actorId = computed(() => app.user?.id ?? '')
const isSystem = computed(() => isSystemAdministrator(actorId.value))
const personal = computed(() => route.query.scope === 'personal' || !canManageQuota(actorId.value))
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' })
const defaults = (): QuotaUsageFilters => ({ query: '', start: `${today.slice(0, 7)}-01`, end: today, department: '', module: '' })
const filters = reactive(defaults())
const applied = ref(defaults())
const filterError = ref('')
const page = ref(1)
const pageSize = 8
const sortKey = ref<'quota' | 'consumed' | 'rate' | 'updatedAt'>('rate')
const ascending = ref(false)
const visibleMembers = computed(() => quotas.visibleMembers(actorId.value))
const departmentOptions = computed(() => {
  const result: Array<{ id: string; name: string; depth: number }> = []
  function walk(nodes: DeptNode[], depth = 0) { for (const node of nodes) {
    if (visibleMembers.value.some(member => departmentScopeIds(node.id).has(member.departmentId))) result.push({ id: node.id, name: node.name, depth })
    if (node.children) walk(node.children, depth + 1)
  } }
  walk(deptTree)
  return result
})
const rows = computed(() => filteredQuotaRows(visibleMembers.value, applied.value).sort((a, b) => {
  const av = sortKey.value === 'rate' ? quotaRate(a) : a[sortKey.value]
  const bv = sortKey.value === 'rate' ? quotaRate(b) : b[sortKey.value]
  const comparison = typeof av === 'string' ? av.localeCompare(String(bv)) : av === bv ? 0 : Number(av) > Number(bv) ? 1 : -1
  return ascending.value ? comparison : -comparison
}))
const pages = computed(() => Math.max(1, Math.ceil(rows.value.length / pageSize)))
const pageRows = computed(() => rows.value.slice((page.value - 1) * pageSize, page.value * pageSize))
watch(rows, () => { page.value = Math.min(page.value, pages.value) })
function query() {
  filterError.value = filters.start && filters.end && filters.start > filters.end ? '开始日期不能晚于结束日期' : ''
  if (!filterError.value) { applied.value = { ...filters }; page.value = 1; openMenu.value = null }
}
function clear() { Object.assign(filters, defaults()); query() }
function sort(key: typeof sortKey.value) { ascending.value = sortKey.value === key ? !ascending.value : false; sortKey.value = key }
const openMenu = ref<string | null>(null)
function dismissMenu(event: Event) { if (event instanceof KeyboardEvent ? event.key === 'Escape' : !(event.target as HTMLElement | null)?.closest('.quota-row-actions')) openMenu.value = null }
onMounted(() => { document.addEventListener('click', dismissMenu); document.addEventListener('keydown', dismissMenu) })
onBeforeUnmount(() => { document.removeEventListener('click', dismissMenu); document.removeEventListener('keydown', dismissMenu) })
const permissionOpen = ref(false)
const dialog = ref<'quota' | 'global' | 'reset' | 'detail' | null>(null)
const selectedId = ref('')
const selected = computed(() => visibleMembers.value.find(member => member.id === selectedId.value))
const amount = ref('')
const amountError = ref('')
function action(kind: NonNullable<typeof dialog.value>, member?: QuotaMember) {
  selectedId.value = member?.id ?? ''; amount.value = String(kind === 'global' ? quotas.globalQuota : member?.quota ?? 0)
  amountError.value = ''; dialog.value = kind; openMenu.value = null
}
watch(visibleMembers, () => { if (dialog.value !== 'global' && selectedId.value && !selected.value) dialog.value = null })
const titles = { quota: '额度设置', global: '全局额度', reset: '重置额度', detail: '用量详情' }
function saveAmount() {
  const value = String(amount.value).trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) > 1_000_000) { amountError.value = '请输入 0～1,000,000，最多两位小数'; return }
  const saved = dialog.value === 'global' ? quotas.setGlobalQuota(actorId.value, Number(value)) : quotas.setQuota(actorId.value, selectedId.value, Number(value))
  if (!saved) { amountError.value = quotas.error; return }
  dialog.value = null; toast.success('额度已保存')
}
function resetQuota() { if (quotas.resetQuota(actorId.value, selectedId.value)) { dialog.value = null; toast.success('已恢复全局额度') } else amountError.value = quotas.error }
function exportRows() { downloadCsv('用量额度.csv', quotaCsvRows(rows.value)); toast.success('明细已下载') }
const detailRows = computed(() => selected.value ? quotaUsageRecords(selected.value.id, applied.value) : [])
</script>

<template>
  <SettingsInsightsView v-if="personal" />
  <div v-else class="quota-layout">
    <SettingsSidebar :user-id="actorId" />
    <section class="quota-page" aria-labelledby="quota-heading">
      <form @submit.prevent="query">
        <header class="quota-toolbar">
          <h1 id="quota-heading">用量额度</h1>
          <div class="quota-toolbar-actions">
            <label class="quota-search"><Search :size="17" /><input v-model="filters.query" aria-label="搜索本名或花名" placeholder="搜索本名或花名..." /></label>
            <button v-if="isSystem" type="button" aria-label="权限设置" @click="permissionOpen = true"><ShieldCheck :size="17" />权限设置</button>
            <button v-if="isSystem" type="button" aria-label="全局额度" @click="action('global')"><CircleDollarSign :size="17" />全局额度</button>
            <button type="button" @click="exportRows"><Download :size="17" />下载明细</button>
          </div>
        </header>
        <div class="quota-filters">
          <label class="date-filter"><span>日期</span><div class="quota-dates"><input v-model="filters.start" type="date" aria-label="开始日期" /><span>—</span><input v-model="filters.end" type="date" aria-label="结束日期" /></div></label>
          <label><span>部门</span><select v-model="filters.department" aria-label="部门"><option value="">全部部门</option><option v-for="department in departmentOptions" :key="department.id" :value="department.id">{{ '　'.repeat(Math.min(department.depth, 3)) }}{{ department.name }}</option></select></label>
          <label><span>模块</span><select v-model="filters.module" aria-label="模块"><option value="">全部模块</option><option>天马智擎</option><option>知识中心</option></select></label>
          <div class="filter-actions"><button type="button" @click="clear">清除</button><button class="primary" type="submit" aria-label="查询">查询</button></div>
        </div>
        <p v-if="filterError" role="alert" class="quota-error">{{ filterError }}</p>
      </form>
      <div class="quota-table-wrap">
        <table aria-label="用量额度">
          <thead><tr><th>姓名</th><th :aria-sort="sortKey === 'quota' ? ascending ? 'ascending' : 'descending' : 'none'"><button aria-label="按额度排序" @click="sort('quota')">额度<ChevronDown :size="13" /></button></th><th :aria-sort="sortKey === 'consumed' ? ascending ? 'ascending' : 'descending' : 'none'"><button aria-label="按消耗排序" @click="sort('consumed')">消耗<ChevronDown :size="13" /></button></th><th :aria-sort="sortKey === 'rate' ? ascending ? 'ascending' : 'descending' : 'none'"><button aria-label="按使用率排序" @click="sort('rate')">使用率<ChevronDown :size="13" /></button></th><th :aria-sort="sortKey === 'updatedAt' ? ascending ? 'ascending' : 'descending' : 'none'"><button aria-label="按更新时间排序" @click="sort('updatedAt')">更新时间<ChevronDown :size="13" /></button></th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="member in pageRows" :key="member.id" :data-member-id="member.id">
              <td class="member-name">{{ member.name }}</td><td>{{ money(member.quota) }}<span class="quota-source" :class="{ personal: member.quotaSource === '个人设置' }">{{ member.quotaSource }}</span></td><td>{{ money(member.consumed) }}</td><td class="quota-rate" :class="{ exceeded: quotaRate(member) >= 100 }">{{ quotaRateLabel(member) }}</td><td>{{ member.updatedAt }}</td>
              <td class="quota-row-actions"><button class="row-trigger" :aria-label="`${member.name}操作菜单`" :aria-expanded="openMenu === member.id" aria-haspopup="menu" @click="openMenu = openMenu === member.id ? null : member.id"><MoreHorizontal :size="18" /></button>
                <div v-if="openMenu === member.id" class="quota-row-menu" role="menu" :aria-label="`${member.name}操作`"><button role="menuitem" data-action="set-quota" @click="action('quota', member)"><CircleDollarSign :size="16" />额度设置</button><button role="menuitem" @click="action('reset', member)"><RotateCcw :size="16" />重置</button><button role="menuitem" @click="action('detail', member)"><FileText :size="16" />详情</button></div>
              </td>
            </tr>
            <tr v-if="!pageRows.length"><td colspan="6" class="quota-empty">暂无符合条件的成员<button @click="clear">清除筛选</button></td></tr>
          </tbody>
        </table>
      </div>
      <footer class="quota-pagination"><span>共 {{ rows.length }} 项，{{ page }}/{{ pages }}</span><nav aria-label="用量额度分页"><button aria-label="上一页" :disabled="page === 1" @click="page--"><ChevronLeft :size="16" /></button><button v-for="number in pages" :key="number" :aria-current="page === number ? 'page' : undefined" @click="page = number">{{ number }}</button><button aria-label="下一页" :disabled="page === pages" @click="page++"><ChevronRight :size="16" /></button></nav></footer>
    </section>
    <QuotaPermissionDialog v-if="permissionOpen && isSystem" :actor-id="actorId" @close="permissionOpen = false" @saved="permissionOpen = false; toast.success('权限已保存')" />
    <ElDialog :model-value="dialog !== null" :title="dialog ? titles[dialog] : ''" :width="dialog === 'detail' ? 700 : 440" class="quota-value-dialog" align-center :close-on-click-modal="false" @update:model-value="dialog = null">
      <template v-if="dialog === 'quota' || dialog === 'global'">
        <form class="quota-value-form" @submit.prevent="saveAmount">
          <div v-if="selected && dialog === 'quota'" class="selected-member"><strong>{{ selected.name }}</strong><span>{{ selected.departmentName }}</span></div>
          <label><span>{{ dialog === 'global' ? '默认额度' : '个人额度' }}（元）</span><input v-model="amount" type="number" min="0" max="1000000" step="0.01" :aria-label="dialog === 'global' ? '默认额度' : '个人额度'" autofocus required /></label>
          <span v-if="dialog === 'global'" class="quota-field-note">适用于未单独设置额度的成员</span>
          <p v-if="amountError" class="quota-error" role="alert">{{ amountError }}</p>
          <footer><button type="button" @click="dialog = null">取消</button><button class="primary" type="submit">确定</button></footer>
        </form>
      </template>
      <template v-else-if="dialog === 'reset'">
        <p class="reset-question">将 {{ selected?.name }} 的额度恢复为全局额度 {{ money(quotas.globalQuota) }}？</p><p v-if="amountError" class="quota-error" role="alert">{{ amountError }}</p><footer class="dialog-actions"><button @click="dialog = null">取消</button><button class="primary" @click="resetQuota">重置</button></footer>
      </template>
      <template v-else-if="dialog === 'detail'">
        <div class="selected-member"><strong>{{ selected?.name }}</strong><span>{{ selected?.departmentName }}</span></div>
        <table class="detail-table" aria-label="成员用量明细"><thead><tr><th>时间</th><th>模块</th><th>消耗</th></tr></thead><tbody><tr v-for="record in detailRows" :key="record.id"><td>{{ record.date }}</td><td>{{ record.module }}</td><td>{{ money(record.consumed) }}</td></tr><tr v-if="!detailRows.length"><td colspan="3">暂无消耗记录</td></tr></tbody></table><footer class="dialog-actions"><button @click="dialog = null">关闭</button></footer>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.quota-layout{display:flex;min-height:calc(100vh - 60px);background:#f8f9fb;color:#202020}.quota-page{min-width:0;flex:1;margin:0 12px 12px 0;padding:18px 30px;background:#fff;border:1px solid #e9e9ec;border-radius:14px}.quota-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}.quota-toolbar h1{margin:0;font-size:16px;line-height:32px;font-weight:650;white-space:nowrap}.quota-toolbar-actions{display:flex;gap:12px;align-items:center}button{cursor:pointer}button:not(.row-trigger){display:inline-flex;align-items:center;justify-content:center;gap:7px}button:disabled{opacity:.35;cursor:not-allowed}.quota-toolbar-actions>button,.filter-actions>button,.quota-pagination button,.quota-value-form footer button,.dialog-actions button{height:33px;border:1px solid #dcdde2;border-radius:8px;background:#fff;padding:0 15px;font-size:14px;color:#292929;white-space:nowrap;box-shadow:0 1px 2px #00000005}button:hover{background:#f7f7f8}.primary{background:#131313!important;color:#fff!important;border-color:#131313!important}.primary:hover{background:#333!important}.quota-search{display:flex;align-items:center;gap:9px;height:33px;width:238px;border:1px solid #dedfe5;border-radius:8px;padding:0 11px;color:#595959}.quota-search input{border:0;outline:0;min-width:0;width:100%;font-size:14px;background:transparent}.quota-search input::placeholder{color:#b4b4b8}.quota-filters{display:grid;grid-template-columns:minmax(270px,1.05fr) minmax(180px,1fr) minmax(180px,1fr) auto;gap:13px;align-items:end;margin-bottom:17px;max-width:900px}.quota-filters>label,.quota-value-form>label{display:flex;flex-direction:column;gap:9px;font-size:14px}.quota-filters select,.quota-dates{height:33px;border:1px solid #dedfe5;border-radius:8px;background:#fff;padding:0 12px;width:100%;outline-offset:2px;font-size:14px}.quota-dates{display:flex;align-items:center;gap:6px;padding:0 9px}.quota-dates input{width:120px;min-width:0;border:0;font-size:13px;outline-offset:1px}.quota-dates>span{color:#777}.filter-actions{display:flex;gap:12px}.quota-table-wrap{border:1px solid #e5e5e8;border-radius:8px;min-height:calc(100vh - 270px);overflow:visible}table{width:100%;border-collapse:separate;border-spacing:0;text-align:left;font-size:14px;table-layout:fixed}th{height:40px;background:#f6f6f8;color:#737373;font-weight:550;padding:0 16px;border-bottom:1px solid #e5e5e8}th:first-child{border-radius:8px 0 0 0;width:19%}th:nth-child(2){width:20%}th:nth-child(3),th:nth-child(4){width:17%}th:nth-child(5){width:22%}th:last-child{width:60px;text-align:center;border-radius:0 8px 0 0}th button{border:0;padding:0;background:transparent;color:inherit;font:inherit}td{height:57px;padding:0 16px;border-bottom:1px solid #e8e8eb;color:#777;font-variant-numeric:tabular-nums;white-space:nowrap}tbody tr:last-child td{border-bottom:0}.member-name{color:#303030}tbody tr:hover{background:#f7f7f9}.quota-source{display:inline-block;font-size:10px;line-height:17px;padding:0 4px;border-radius:3px;background:#e8f4ff;color:#268bff;margin-left:5px;vertical-align:1px}.quota-source.personal{background:#dcfbfc;color:#20b5c0}.exceeded{color:#c03e36}.quota-row-actions{position:relative;text-align:center;padding:0 10px}.row-trigger{height:32px;width:32px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:5px;color:#747474;background:transparent}.quota-row-menu{position:absolute;right:24px;top:40px;width:150px;z-index:15;padding:7px;background:#fff;border:1px solid #ededf0;border-radius:13px;box-shadow:0 5px 24px #00000009;text-align:left}.quota-row-menu button{border:0;background:transparent;padding:10px 9px;border-radius:6px;width:100%;justify-content:flex-start;font-size:14px;color:#292929}.quota-row-menu button:hover{background:#f2f2f5}.quota-empty{text-align:center!important;height:200px}.quota-empty button{border:0;background:none;color:#333;margin-left:10px;text-decoration:underline}.quota-pagination{display:flex;align-items:center;justify-content:space-between;padding-top:17px;font-size:14px;color:#999}.quota-pagination nav{display:flex;gap:8px}.quota-pagination button{width:32px;padding:0}.quota-pagination button[aria-current=page]{border-color:#161616;color:#161616}.quota-error{font-size:12px;color:#b42318;margin:8px 0}.quota-value-form{display:flex;flex-direction:column;gap:15px}.quota-value-form input{height:38px;border:1px solid #dedfe4;border-radius:7px;padding:0 10px;font-size:15px;color:#252525}.quota-value-form footer,.dialog-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:18px}.selected-member{display:flex;flex-direction:column;gap:7px;color:#252525;margin-bottom:17px}.selected-member span{font-size:12px;color:#888}.quota-field-note{font-size:12px;color:#888}.reset-question{line-height:1.8;color:#333}.detail-table{table-layout:auto}.detail-table th{width:auto!important}.detail-table td{height:45px}
@media(min-width:1800px){.quota-page{padding:24px 32px}.quota-toolbar h1{font-size:18px}.quota-table-wrap{min-height:calc(100vh - 285px)}}@media(max-width:1250px){.quota-page{padding:18px}.quota-toolbar{align-items:flex-start;flex-direction:column}.quota-toolbar-actions{flex-wrap:wrap;width:100%}.quota-search{flex:1}.quota-filters{grid-template-columns:minmax(250px,1fr) minmax(160px,1fr);max-width:none}.filter-actions{align-self:end}.quota-table-wrap{overflow:auto}table{min-width:850px}}@media(max-width:720px){.quota-page{margin:0 8px 8px;padding:16px}.quota-filters{grid-template-columns:1fr}.quota-toolbar-actions{gap:8px}.quota-search{flex:1 0 100%;width:100%}.quota-toolbar-actions>button{font-size:12px;padding:0 10px}.quota-table-wrap{min-height:340px}.quota-dates input{flex:1}.quota-pagination{font-size:12px}}
</style>
