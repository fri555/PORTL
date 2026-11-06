<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElDialog } from 'element-plus'
import { Search, UserRound } from 'lucide-vue-next'
import { configuredSystemAdministratorIds, quotaAdministratorCandidates, quotaMembers, type QuotaAdministratorGrant, type QuotaScope } from '@/mock/settings-quota'
import { useSettingsQuotaStore } from '@/stores/settings-quota'
import QuotaScopePicker from './QuotaScopePicker.vue'

const props = defineProps<{ actorId: string }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const store = useSettingsQuotaStore()
const draft = ref<QuotaAdministratorGrant[]>(store.grants.map(grant => ({ ...grant, scopes: grant.scopes.map(scope => ({ ...scope })) })))
const adding = ref(false)
const memberTab = ref<'department' | 'person'>('department')
const memberSearch = ref('')
const administratorSearch = ref('')
const pendingIds = ref<string[]>([])
const scopeAdministratorId = ref<string | null>(null)
const error = ref('')

const identities = computed(() => [...quotaAdministratorCandidates, ...quotaMembers.map(member => ({ id: member.id, name: member.name, department: member.departmentName }))]
  .filter((person, index, rows) => rows.findIndex(item => item.id === person.id) === index))
const visibleGrants = computed(() => {
  const query = administratorSearch.value.trim().toLocaleLowerCase()
  return draft.value.filter(grant => !query || grant.administratorName.toLocaleLowerCase().includes(query))
})
const candidates = computed(() => {
  const query = memberSearch.value.trim().toLocaleLowerCase()
  return identities.value.filter(person => !configuredSystemAdministratorIds.includes(person.id)
    && !draft.value.some(grant => grant.administratorId === person.id)
    && (!query || `${person.name} ${person.department}`.toLocaleLowerCase().includes(query)))
})
const departmentGroups = computed(() => [...new Set(candidates.value.map(person => person.department))].filter(Boolean))
const pendingPeople = computed(() => pendingIds.value.map(id => identities.value.find(person => person.id === id)).filter(Boolean) as { id: string; name: string; department: string }[])
const scopeGrant = computed(() => draft.value.find(grant => grant.administratorId === scopeAdministratorId.value))

function closeDialog(done: () => void) { done(); emit('close') }
function openMemberPicker() {
  adding.value = true
  memberTab.value = 'department'
  memberSearch.value = ''
  pendingIds.value = []
}
function toggleCandidate(id: string, checked: boolean) {
  pendingIds.value = checked ? [...new Set([...pendingIds.value, id])] : pendingIds.value.filter(item => item !== id)
}
function confirmMembers() {
  for (const person of pendingPeople.value) {
    draft.value.push({ id: `grant-${person.id}`, administratorId: person.id, administratorName: person.name, department: person.department, scopes: [] })
  }
  adding.value = false
  error.value = ''
}
function remove(id: string) {
  draft.value = draft.value.filter(grant => grant.administratorId !== id)
  error.value = ''
}
function setScopes(scopes: QuotaScope[]) {
  if (scopeGrant.value) scopeGrant.value.scopes = scopes.map(scope => ({ ...scope }))
  scopeAdministratorId.value = null
  error.value = ''
}
function save() {
  const missing = draft.value.find(grant => !grant.scopes.length)
  if (missing) { error.value = `请为${missing.administratorName}设置管理范围`; return }
  if (!store.saveGrants(props.actorId, draft.value)) { error.value = store.error || '保存失败，请重试'; return }
  emit('saved')
}
</script>

<template>
  <ElDialog :model-value="true" title="权限设置" aria-label="权限设置" class="quota-permission-dialog" width="min(520px, 94vw)" align-center :close-on-click-modal="false" :before-close="closeDialog">
    <div class="permission-toolbar"><span>全部成员</span><button type="button" class="text-action" @click="openMemberPicker">添加成员</button></div>
    <label class="administrator-search"><Search :size="15"/><input v-model="administratorSearch" type="search" aria-label="搜索额度管理员" placeholder="搜索姓名或花名" /></label>
    <div class="administrator-list">
      <div v-for="grant in visibleGrants" :key="grant.administratorId" class="administrator-row" :data-administrator-id="grant.administratorId">
        <div class="administrator-identity"><span class="avatar"><UserRound :size="17"/></span><strong>{{ grant.administratorName }}</strong></div>
        <div class="row-actions">
          <button type="button" :aria-label="`设置${grant.administratorName}的管理范围`" @click="scopeAdministratorId = grant.administratorId">设置范围</button>
          <button type="button" class="remove-button" :aria-label="`移除${grant.administratorName}`" @click="remove(grant.administratorId)">移除</button>
        </div>
      </div>
      <div v-if="!visibleGrants.length" class="empty">暂无匹配成员</div>
    </div>
    <div v-if="error" role="alert" class="permission-error">{{ error }}</div>
    <template #footer><button type="button" @click="emit('close')">取消</button><button type="button" class="primary" @click="save">保存</button></template>
  </ElDialog>

  <ElDialog v-if="adding" :model-value="true" title="添加成员" aria-label="添加成员" class="quota-member-dialog" width="min(700px, 96vw)" align-center append-to-body :close-on-click-modal="false" @close="adding = false">
    <div class="member-picker">
      <section class="member-picker-left">
        <label class="member-search"><Search :size="15"/><input v-model="memberSearch" type="search" aria-label="搜索成员" :placeholder="memberTab === 'department' ? '搜索部门...' : '搜索人员...'" /></label>
        <div class="member-tabs" role="tablist" aria-label="成员类型">
          <button type="button" role="tab" :aria-selected="memberTab === 'department'" @click="memberTab = 'department'">部门</button>
          <button type="button" role="tab" :aria-selected="memberTab === 'person'" @click="memberTab = 'person'">人员</button>
        </div>
        <div class="member-options">
          <template v-if="memberTab === 'department'">
            <div v-for="department in departmentGroups" :key="department" class="department-row"><span class="avatar"><UserRound :size="16"/></span><span>{{ department }}</span><button type="button" @click="memberTab = 'person'; memberSearch = department">下级 ›</button></div>
            <div v-if="!departmentGroups.length" class="empty">无匹配部门</div>
          </template>
          <template v-else>
            <label v-for="person in candidates" :key="person.id" class="candidate-row">
              <input type="checkbox" :value="person.id" :checked="pendingIds.includes(person.id)" @change="toggleCandidate(person.id, ($event.target as HTMLInputElement).checked)"/>
              <span class="avatar"><UserRound :size="16"/></span><span>{{ person.name }}</span>
            </label>
            <div v-if="!candidates.length" class="empty">无匹配人员</div>
          </template>
        </div>
      </section>
      <section class="member-picker-selected" aria-label="已选成员"><strong>已选：{{ pendingPeople.length }}个</strong><div class="selected-list"><div v-for="person in pendingPeople" :key="person.id"><span class="avatar"><UserRound :size="16"/></span><span>{{ person.name }}</span></div></div></section>
    </div>
    <template #footer><button type="button" @click="adding = false">取消</button><button type="button" class="primary" :disabled="!pendingPeople.length" @click="confirmMembers">确定</button></template>
  </ElDialog>

  <QuotaScopePicker v-if="scopeGrant" :key="scopeGrant.administratorId" :model-value="scopeGrant.scopes" @confirm="setScopes" @close="scopeAdministratorId = null" />
</template>

<style scoped>
.permission-toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;color:#222;font-size:13px}.text-action{border:0!important;padding:4px!important;color:#1677ff!important}.administrator-search,.member-search{display:flex;height:34px;align-items:center;gap:7px;border:1px solid #ddd;border-radius:7px;padding:0 10px;color:#999}.administrator-search input,.member-search input{min-width:0;flex:1;border:0;outline:0;font:12px inherit}.administrator-list{min-height:250px;max-height:360px;overflow:auto;margin-top:8px;border:1px solid #e9e9e9;border-radius:8px;padding:6px 14px}.administrator-row{display:flex;min-height:54px;align-items:center;gap:12px;border-bottom:1px solid #f1f1f1}.administrator-row:last-child{border-bottom:0}.administrator-identity{display:flex;min-width:0;flex:1;align-items:center;gap:10px}.avatar{display:grid;width:36px;height:36px;flex:none;place-items:center;border-radius:7px;background:#f2f2f2;color:#333}.administrator-identity strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:500}.row-actions{display:flex;align-items:center;gap:20px}.row-actions button{border:0;padding:5px 0;background:transparent;color:#1677ff;font-size:12px}.row-actions .remove-button{color:#888}.permission-error{margin-top:12px;color:#c43a3a;font-size:12px}.empty{padding:32px 12px;text-align:center;color:#aaa;font-size:12px}.member-picker{display:grid;grid-template-columns:1fr 1fr;min-height:470px;border:1px solid #dedede;border-radius:8px;overflow:hidden}.member-picker-left{padding:14px 16px}.member-picker-selected{border-left:1px solid #dedede;padding:22px 24px}.member-picker-selected>strong{font-size:13px;font-weight:500}.member-tabs{display:flex;gap:22px;margin-top:8px;border-bottom:1px solid #e5e5e5}.member-tabs button{border:0;border-bottom:2px solid transparent;border-radius:0;padding:8px 0;background:transparent;color:#888}.member-tabs button[aria-selected=true]{border-bottom-color:#111;color:#111}.member-options{max-height:375px;overflow:auto;padding-top:8px}.department-row,.candidate-row,.selected-list>div{display:flex;min-height:48px;align-items:center;gap:10px;border-radius:7px;padding:6px 8px;font-size:13px}.department-row:hover,.candidate-row:hover{background:#f6f6f6}.department-row>span:nth-child(2),.candidate-row>span:last-child{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.department-row button{border:0;padding:5px;background:transparent;color:#1677ff}.candidate-row input{width:15px;height:15px;accent-color:#111}.candidate-row .avatar,.selected-list .avatar{width:36px;height:36px}.selected-list{margin-top:12px}.selected-list>div{padding-left:0}.quota-member-dialog button,.quota-permission-dialog button{border:1px solid #ddd;border-radius:6px;padding:7px 16px;background:#fff;color:#333;cursor:pointer}.primary{border-color:#111!important;background:#111!important;color:#fff!important}.primary:disabled{border-color:#aaa!important;background:#aaa!important;cursor:not-allowed}button:focus-visible,input:focus-visible{outline:2px solid #555;outline-offset:2px}
:global(.quota-permission-dialog),:global(.quota-member-dialog){padding:24px;border-radius:10px;--el-color-primary:#222}:global(.quota-permission-dialog .el-dialog__title),:global(.quota-member-dialog .el-dialog__title){font-size:16px;font-weight:500;color:#222}:global(.quota-permission-dialog .el-dialog__body),:global(.quota-member-dialog .el-dialog__body){padding-top:12px}:global(.quota-permission-dialog .el-dialog__footer),:global(.quota-member-dialog .el-dialog__footer){display:flex;justify-content:flex-end;gap:10px;padding-top:16px}
@media(max-width:640px){.member-picker{grid-template-columns:1fr}.member-picker-selected{border-top:1px solid #dedede;border-left:0}.row-actions{gap:10px}}
</style>
