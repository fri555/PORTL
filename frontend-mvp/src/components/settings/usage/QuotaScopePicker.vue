<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { ElDialog } from 'element-plus'
import { Building2, Search, UserRound, X } from 'lucide-vue-next'
import { deptTree } from '@/mock/settings-insights'
import { quotaMembers, type QuotaScope } from '@/mock/settings-quota'
import type { DeptNode } from '@/types/settings-insights'

const props = defineProps<{ modelValue: QuotaScope[] }>()
const emit = defineEmits<{ close: []; confirm: [scopes: QuotaScope[]] }>()
const selected = ref(props.modelValue.map(scope => ({ ...scope })))
const query = ref('')
const error = ref('')
const activeTab = ref<QuotaScope['kind']>('department')
const tabId = useId()
const departments: (QuotaScope & { depth: number })[] = []
function visit(nodes: DeptNode[], depth = 0) {
  for (const node of nodes) {
    departments.push({ id: node.id, name: node.name, kind: 'department', depth })
    if (node.children) visit(node.children, depth + 1)
  }
}
visit(deptTree)
const matchingDepartments = computed(() => departments.filter(item => item.name.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())))
const matchingPeople = computed(() => quotaMembers.filter(item => `${item.name} ${item.departmentName}`.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())))
const checked = (kind: QuotaScope['kind'], id: string) => selected.value.some(item => item.kind === kind && item.id === id)
function switchTab(kind: QuotaScope['kind'], event?: KeyboardEvent) {
  activeTab.value = kind
  query.value = ''
  if (event) (event.currentTarget as HTMLElement).parentElement?.querySelector<HTMLButtonElement>(`[data-kind="${kind}"]`)?.focus()
}
function removeScope(scope: QuotaScope) {
  selected.value = selected.value.filter(item => item.kind !== scope.kind || item.id !== scope.id)
  error.value = ''
}
function toggle(scope: QuotaScope, event: Event) {
  selected.value = selected.value.filter(item => item.kind !== scope.kind || item.id !== scope.id)
  if ((event.target as HTMLInputElement).checked) selected.value.push({ id: scope.id, kind: scope.kind, name: scope.name })
  error.value = ''
}
function confirm() {
  if (!selected.value.length) { error.value = '请至少选择一个人员或部门'; return }
  emit('confirm', selected.value.map(scope => ({ ...scope })))
}
function closeDialog(done: () => void) { done(); emit('close') }
</script>

<template>
  <ElDialog :model-value="true" title="设置范围" aria-label="设置范围" class="quota-scope-dialog" width="min(700px, 96vw)" align-center append-to-body :close-on-click-modal="false" :before-close="closeDialog">
    <form @submit.prevent="confirm">
      <div class="scope-picker-shell">
        <section data-testid="scope-picker-left" class="scope-picker-left">
          <label class="scope-search"><Search :size="15"/><input v-model="query" aria-label="搜索人员或部门" :placeholder="activeTab === 'department' ? '搜索部门...' : '搜索人员...'" type="search" /></label>
          <div class="scope-tabs" role="tablist" aria-label="范围类型">
            <button v-for="kind in (['department', 'person'] as const)" :id="`${tabId}-${kind}-tab`" :key="kind" type="button" role="tab" :data-kind="kind" :aria-selected="activeTab === kind" :aria-controls="`${tabId}-panel`" :tabindex="activeTab === kind ? 0 : -1" @click="switchTab(kind)" @keydown.right.prevent="switchTab(kind === 'department' ? 'person' : 'department', $event)" @keydown.left.prevent="switchTab(kind === 'department' ? 'person' : 'department', $event)" @keydown.home.prevent="switchTab('department', $event)" @keydown.end.prevent="switchTab('person', $event)">{{ kind === 'department' ? '部门' : '人员' }}</button>
          </div>
          <div :id="`${tabId}-panel`" class="scope-options" role="tabpanel" :aria-labelledby="`${tabId}-${activeTab}-tab`" tabindex="0">
            <template v-if="activeTab === 'department'">
              <label v-for="department in matchingDepartments" :key="department.id" :style="{ paddingLeft: `${Math.min(department.depth, 3) * 14 + 8}px` }">
                <input type="checkbox" :value="`department:${department.id}`" :checked="checked('department', department.id)" @change="toggle(department, $event)" />
                <span class="item-icon"><Building2 :size="16"/></span><span>{{ department.name }}</span>
              </label>
              <div v-if="!matchingDepartments.length" class="scope-empty">无匹配部门</div>
            </template>
            <template v-else>
              <label v-for="person in matchingPeople" :key="person.id">
                <input type="checkbox" :value="`person:${person.id}`" :checked="checked('person', person.id)" @change="toggle({ id: person.id, kind: 'person', name: person.name }, $event)" />
                <span class="item-icon"><UserRound :size="16"/></span><span>{{ person.name }}</span>
              </label>
              <div v-if="!matchingPeople.length" class="scope-empty">无匹配人员</div>
            </template>
          </div>
        </section>
        <section data-testid="scope-picker-selected" class="scope-picker-selected" aria-label="已选范围">
          <strong>已选：{{ selected.length }}个</strong>
          <div class="selected-list"><div v-for="scope in selected" :key="`${scope.kind}:${scope.id}`"><span class="item-icon"><Building2 v-if="scope.kind === 'department'" :size="16"/><UserRound v-else :size="16"/></span><span>{{ scope.name }}</span><button type="button" :aria-label="`移除范围${scope.name}`" @click="removeScope(scope)"><X :size="14"/></button></div></div>
        </section>
      </div>
      <div v-if="error" role="alert" class="scope-error">{{ error }}</div>
      <footer><button type="button" aria-label="取消范围选择" @click="emit('close')">取消</button><button type="submit" class="primary">确定</button></footer>
    </form>
  </ElDialog>
</template>

<style scoped>
.scope-picker-shell{display:grid;grid-template-columns:1fr 1fr;min-height:470px;border:1px solid #ddd;border-radius:8px;overflow:hidden}.scope-picker-left{padding:14px 16px}.scope-picker-selected{border-left:1px solid #ddd;padding:22px 24px}.scope-picker-selected>strong{font-size:13px;font-weight:500}.scope-search{display:flex;height:34px;align-items:center;gap:7px;border:1px solid #ddd;border-radius:7px;padding:0 10px;color:#999}.scope-search input{min-width:0;flex:1;border:0;outline:0;font:12px inherit}.scope-tabs{display:flex;gap:24px;margin-top:8px;border-bottom:1px solid #e8e8e8}.scope-tabs button{border:0;border-bottom:2px solid transparent;border-radius:0;padding:8px 1px;background:transparent;color:#888;font-size:13px}.scope-tabs button[aria-selected=true]{border-bottom-color:#111;color:#111;font-weight:500}.scope-options{max-height:380px;overflow:auto;padding-top:8px}.scope-options label{display:flex;min-height:48px;align-items:center;gap:10px;border-radius:7px;padding:6px 8px;color:#333;font-size:13px;cursor:pointer}.scope-options label:hover{background:#f6f6f6}.scope-options input{width:15px;height:15px;flex:none;accent-color:#111}.item-icon{display:grid;width:36px;height:36px;flex:none;place-items:center;border-radius:7px;background:#f2f2f2;color:#333}.scope-options label>span:last-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.selected-list{margin-top:12px}.selected-list>div{display:flex;min-height:48px;align-items:center;gap:10px;font-size:13px}.selected-list>div>span:nth-child(2){min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.selected-list button{display:grid;width:26px;height:26px;place-items:center;border:0;background:transparent;color:#999}.scope-empty{padding:40px 12px;text-align:center;color:#aaa;font-size:12px}.scope-error{margin-top:12px;color:#c43a3a;font-size:12px}footer{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}button{cursor:pointer;border:1px solid #ddd;border-radius:6px;background:#fff;padding:7px 18px;color:#333}.primary{border-color:#111;background:#111;color:#fff}button:focus-visible,input:focus-visible{outline:2px solid #555;outline-offset:2px}:global(.quota-scope-dialog){border-radius:10px;padding:24px;--el-color-primary:#222}:global(.quota-scope-dialog .el-dialog__title){font-size:16px;font-weight:500;color:#222}:global(.quota-scope-dialog .el-dialog__body){padding-top:12px}@media(max-width:640px){.scope-picker-shell{grid-template-columns:1fr}.scope-picker-selected{border-top:1px solid #ddd;border-left:0}}
</style>
