<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Network,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-vue-next'
import { organizationScopeTree } from '@/mock/organization'

type ViewName = 'users' | 'scope' | 'picker'
type PickerTab = 'people' | 'groups' | 'organization'
type ScopeType = 'person' | 'group' | 'organization'

interface UserRow {
  id: string
  employeeNo: string
  name: string
  alias: string
  department: string
  position: string
  phone: string
  enabled: boolean
}

interface ScopeItem {
  id: string
  label: string
  detail: string
  type: ScopeType
}

const emit = defineEmits<{ close: [] }>()

const users: UserRow[] = [
  { id: 'chen-le', employeeNo: '240640', name: '陈乐', alias: '飞鱼', department: '蓝步事业部', position: '商品运营', phone: '158 5291 8671', enabled: true },
  { id: 'zhou-qian', employeeNo: '240643', name: '周茜', alias: '乔莹', department: '穿搭内容组', position: '短视频出镜', phone: '135 4428 8711', enabled: false },
  { id: 'han-xing', employeeNo: '160405', name: '韩兴', alias: '双子', department: '三方平台', position: '大客户经理', phone: '189 6135 6234', enabled: true },
  { id: 'qian-li-ping', employeeNo: '240642', name: '钱丽平', alias: '丽平', department: '岗前培训', position: '培训期', phone: '—', enabled: true },
  { id: 'han-yu', employeeNo: '180017', name: '韩寅', alias: '良臣', department: '零售支持部', position: '陈列师', phone: '180 1297 0949', enabled: true },
  { id: 'song-cheng', employeeNo: '160402', name: '宋成', alias: '钟隐', department: '买手3组', position: '买手经理', phone: '138 1232 1841', enabled: true },
  { id: 'zhao-yue-qiao', employeeNo: '240648', name: '赵岳乔', alias: '冻北', department: '幸运叶子优选直播间', position: '储备运营师', phone: '180 4011 0360', enabled: false },
  { id: 'shen-li-yuan', employeeNo: '240644', name: '申丽源', alias: '艾达', department: '穿搭内容组', position: '新媒体运营', phone: '185 8500 3684', enabled: false },
]

const people = [
  { id: 'liu-yang', label: '刘洋', detail: '商品运营中心 · 商品负责人' },
  { id: 'chen-chen', label: '陈晨', detail: '集团运营部 · 运营经理' },
  { id: 'zhao-liu', label: '赵六', detail: '技术中心 · 产品负责人' },
  { id: 'sun-qi', label: '孙琪', detail: '财务管理中心 · 财务BP' },
  { id: 'wang-wu', label: '王五', detail: '直播事业部 · 直播运营' },
  { id: 'lin-xia', label: '林夏', detail: '人力资源中心 · HRBP' },
]

const groups = [
  { id: 'management-group', label: '管理层日程协同组', detail: '8 人 · 内部群' },
  { id: 'product-weekly', label: '商品周会成员', detail: '16 人 · 日程群组' },
  { id: 'operation-duty', label: '运营值班组', detail: '12 人 · 动态群组' },
  { id: 'project-north', label: '北区增长项目组', detail: '21 人 · 项目群' },
  { id: 'finance-review', label: '经营分析评审组', detail: '9 人 · 内部群' },
]

const view = ref<ViewName>('users')
const selectedUser = ref<UserRow | null>(null)
const searchQuery = ref('')
const employeeQuery = ref('')
const departmentQuery = ref('')
const pickerTab = ref<PickerTab>('people')
const pickerQuery = ref('')
const pickerSelection = ref(new Set<string>())
const expandedOrganizations = ref(new Set(['ye-sports', 'tianma-platform']))
const permissionDirty = ref(false)
const saveFeedback = ref('')

const permissionScopes = reactive<Record<string, ScopeItem[]>>({
  'chen-le': [
    { id: 'management-group', label: '管理层日程协同组', detail: '8 人', type: 'group' },
    { id: 'product-operation-center', label: '商品运营中心', detail: '部门及下级组织', type: 'organization' },
    { id: 'liu-yang', label: '刘洋', detail: '商品运营中心', type: 'person' },
  ],
  'zhou-qian': [{ id: 'operation-duty', label: '运营值班组', detail: '12 人', type: 'group' }],
})

const filteredUsers = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  const employee = employeeQuery.value.trim().toLowerCase()
  const department = departmentQuery.value.trim().toLowerCase()
  return users.filter((user) => {
    const text = `${user.name}${user.alias}${user.phone}`.toLowerCase()
    return (!keyword || text.includes(keyword))
      && (!employee || user.employeeNo.toLowerCase().includes(employee))
      && (!department || user.department.toLowerCase().includes(department))
  })
})

const currentScopes = computed(() => selectedUser.value ? (permissionScopes[selectedUser.value.id] ?? []) : [])
const pickerList = computed(() => {
  const keyword = pickerQuery.value.trim().toLowerCase()
  const source = pickerTab.value === 'people' ? people : groups
  return source.filter((item) => !keyword || `${item.label}${item.detail}`.toLowerCase().includes(keyword))
})

function openScope(user: UserRow) {
  selectedUser.value = user
  if (!permissionScopes[user.id]) permissionScopes[user.id] = []
  permissionDirty.value = false
  saveFeedback.value = ''
  view.value = 'scope'
}

function markPermissionDirty() {
  permissionDirty.value = true
  saveFeedback.value = ''
}

function savePermissions() {
  permissionDirty.value = false
  saveFeedback.value = '可见范围配置已保存（演示）'
}

function openPicker(tab: PickerTab = 'people') {
  pickerTab.value = tab
  pickerQuery.value = ''
  pickerSelection.value = new Set()
  view.value = 'picker'
}

function goBack() {
  if (view.value === 'picker') view.value = 'scope'
  else if (view.value === 'scope') view.value = 'users'
}

function toggleSelection(key: string) {
  const next = new Set(pickerSelection.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  pickerSelection.value = next
}

function toggleOrganization(id: string) {
  const next = new Set(expandedOrganizations.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedOrganizations.value = next
}

function confirmPicker() {
  if (!selectedUser.value) return
  const existing = permissionScopes[selectedUser.value.id] ?? []
  const additions: ScopeItem[] = []

  for (const key of pickerSelection.value) {
    const [type, id] = key.split(':') as [ScopeType, string]
    if (existing.some((item) => item.type === type && item.id === id)) continue
    if (type === 'person') {
      const item = people.find((person) => person.id === id)
      if (item) additions.push({ ...item, type })
    } else if (type === 'group') {
      const item = groups.find((group) => group.id === id)
      if (item) additions.push({ ...item, type })
    } else {
      const root = organizationScopeTree.find((item) => item.id === id)
      const child = organizationScopeTree.flatMap((item) => item.children ?? []).find((item) => item.id === id)
      const item = root ?? child
      if (item) additions.push({ id: item.id, label: item.label, detail: root ? '部门及下级组织' : '组织节点', type })
    }
  }

  permissionScopes[selectedUser.value.id] = [...existing, ...additions]
  if (additions.length) markPermissionDirty()
  view.value = 'scope'
}

function removeScope(scope: ScopeItem) {
  if (!selectedUser.value) return
  permissionScopes[selectedUser.value.id] = currentScopes.value.filter((item) => !(item.id === scope.id && item.type === scope.type))
  markPermissionDirty()
}

function resetFilters() {
  searchQuery.value = ''
  employeeQuery.value = ''
  departmentQuery.value = ''
}

function closeOnEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', closeOnEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', closeOnEscape))
</script>

<template>
  <div class="fixed inset-0 z-[210] grid place-items-center bg-[#111827]/35 px-4 py-5 backdrop-blur-[3px]" @click.self="emit('close')">
    <section data-testid="schedule-permission-dialog" role="dialog" aria-modal="true" aria-labelledby="schedule-permission-title" class="flex h-[min(720px,calc(100vh-40px))] w-[1060px] max-w-full flex-col overflow-hidden rounded-[24px] border border-white/90 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
      <header class="flex h-[72px] shrink-0 items-center justify-between border-b border-[#e8ebef] px-6">
        <div class="flex min-w-0 items-center gap-3">
          <button v-if="view !== 'users'" type="button" aria-label="返回上一级" class="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#e2e6eb] text-[#68707b] transition hover:bg-[#f5f7fa] hover:text-[#1769e0]" @click="goBack"><ChevronLeft class="h-4 w-4" /></button>
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf2ff] text-[#1769e0]"><ShieldCheck class="h-5 w-5" /></div>
          <div class="min-w-0">
            <h2 id="schedule-permission-title" class="truncate text-[16px] font-semibold text-[#202329]">{{ view === 'users' ? '日程权限管理' : view === 'scope' ? `${selectedUser?.name} · 可见范围` : '添加可见范围' }}</h2>
            <p class="mt-0.5 truncate text-[11px] text-[#8b939e]">{{ view === 'users' ? '配置员工可以查看的日程范围' : view === 'scope' ? '以下对象的日程将对该员工开放' : '按人员、群组或组织架构选择，最多 100 项' }}</p>
          </div>
        </div>
        <button type="button" aria-label="关闭日程权限管理" class="grid h-9 w-9 place-items-center rounded-xl text-[#8b929c] transition hover:bg-[#f5f7fa] hover:text-[#25282e]" @click="emit('close')"><X class="h-5 w-5" /></button>
      </header>

      <template v-if="view === 'users'">
        <div class="flex flex-wrap items-end gap-3 border-b border-[#edf0f3] bg-[#fafbfc] px-6 py-4">
          <label class="block min-w-[180px] flex-1 text-[10px] font-medium text-[#747b86]">姓名 / 花名 / 手机
            <span class="relative mt-1.5 block"><Search class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#a0a6af]" /><input v-model="searchQuery" aria-label="搜索姓名花名或手机号" class="h-9 w-full rounded-lg border border-[#dfe4ea] bg-white pl-8 pr-3 text-xs outline-none focus:border-[#8fb5f3]" placeholder="输入关键词" /></span>
          </label>
          <label class="block w-[150px] text-[10px] font-medium text-[#747b86]">员工工号<input v-model="employeeQuery" aria-label="搜索员工工号" class="mt-1.5 h-9 w-full rounded-lg border border-[#dfe4ea] bg-white px-3 text-xs outline-none focus:border-[#8fb5f3]" placeholder="输入工号" /></label>
          <label class="block w-[180px] text-[10px] font-medium text-[#747b86]">部门<input v-model="departmentQuery" aria-label="搜索部门" class="mt-1.5 h-9 w-full rounded-lg border border-[#dfe4ea] bg-white px-3 text-xs outline-none focus:border-[#8fb5f3]" placeholder="输入部门" /></label>
          <button type="button" class="h-9 rounded-lg border border-[#dfe4ea] bg-white px-4 text-xs font-medium text-[#606874] hover:bg-[#f5f7fa]" @click="resetFilters">重置</button>
        </div>

        <div class="elegant-scrollbar min-h-0 flex-1 overflow-auto px-6 py-4">
          <div class="min-w-[860px] overflow-hidden rounded-xl border border-[#e1e6ec]">
            <div class="grid grid-cols-[90px_110px_100px_1.25fr_1.1fr_140px_80px_96px] bg-[#f6f8fa] px-4 py-3 text-[10px] font-semibold tracking-[0.04em] text-[#7f8792]"><span>工号</span><span>用户姓名</span><span>花名</span><span>部门</span><span>岗位</span><span>手机号</span><span>状态</span><span class="text-right">操作</span></div>
            <div v-for="user in filteredUsers" :key="user.id" :data-testid="`schedule-permission-user-${user.id}`" class="grid grid-cols-[90px_110px_100px_1.25fr_1.1fr_140px_80px_96px] items-center border-t border-[#e8ecf1] px-4 py-3 text-xs text-[#40464f] transition hover:bg-[#fafcff]">
              <span class="font-mono text-[11px] text-[#747b86]">{{ user.employeeNo }}</span><strong class="font-medium text-[#252a31]">{{ user.name }}</strong><span>{{ user.alias }}</span><span class="truncate pr-3">{{ user.department }}</span><span class="truncate pr-3">{{ user.position }}</span><span class="text-[#68707b]">{{ user.phone }}</span><span><i class="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" :class="user.enabled ? 'bg-[#36a873]' : 'bg-[#b5bac2]'" />{{ user.enabled ? '启用' : '停用' }}</span><button type="button" class="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#cbdcf5] bg-[#f7faff] px-3 font-medium text-[#1769e0] hover:bg-[#eaf2ff]" @click="openScope(user)"><Settings2 class="h-3.5 w-3.5" />配置</button>
            </div>
            <div v-if="!filteredUsers.length" class="px-4 py-16 text-center text-xs text-[#9298a2]">未找到符合条件的员工</div>
          </div>
        </div>
        <footer class="flex h-14 shrink-0 items-center justify-between border-t border-[#edf0f3] px-6 text-[11px] text-[#8b929c]"><span>共 {{ filteredUsers.length }} 位员工</span><span>权限变更将立即影响日程看板中的人员选择范围</span></footer>
      </template>

      <template v-else-if="view === 'scope'">
        <div class="flex items-center justify-between border-b border-[#edf0f3] bg-[#fafbfc] px-6 py-4">
          <div class="flex items-center gap-3"><span class="grid h-10 w-10 place-items-center rounded-full bg-[#eef3fb] text-sm font-semibold text-[#1769e0]">{{ selectedUser?.name.slice(-1) }}</span><div><p class="text-sm font-semibold text-[#252a31]">{{ selectedUser?.name }} <span class="ml-1 font-normal text-[#8d949e]">{{ selectedUser?.alias }}</span></p><p class="mt-0.5 text-[11px] text-[#848b96]">{{ selectedUser?.department }} · {{ selectedUser?.position }}</p></div></div>
          <button data-testid="schedule-permission-add-scope" type="button" class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1769e0] px-4 text-xs font-semibold text-white shadow-[0_5px_14px_rgba(23,105,224,0.22)] transition hover:bg-[#0f5fce]" @click="openPicker()"><Plus class="h-4 w-4" />添加可见范围</button>
        </div>
        <div class="elegant-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div class="mb-4 flex items-center justify-between"><div><h3 class="text-[13px] font-semibold text-[#30353c]">当前可查看日程</h3><p class="mt-1 text-[11px] text-[#8a919b]">已配置 {{ currentScopes.length }} 项；未配置的人员日程不会出现在看板中。</p><p data-testid="schedule-permission-scope-help" class="mt-1 text-[10px] text-[#7d8793]">所有配置均为可查看权限，普通用户不能进入或修改可见范围。</p></div></div>
          <div v-if="currentScopes.length" class="overflow-hidden rounded-xl border border-[#e1e6ec]">
            <div class="grid grid-cols-[56px_1fr_220px_64px] bg-[#f6f8fa] px-4 py-3 text-[10px] font-semibold text-[#7f8792]"><span>类型</span><span>可见对象</span><span>范围说明</span><span class="text-right">操作</span></div>
            <div v-for="scope in currentScopes" :key="`${scope.type}-${scope.id}`" class="grid grid-cols-[56px_1fr_220px_64px] items-center border-t border-[#e8ecf1] px-4 py-3.5">
              <span class="grid h-8 w-8 place-items-center rounded-lg" :class="scope.type === 'person' ? 'bg-[#eaf2ff] text-[#1769e0]' : scope.type === 'group' ? 'bg-[#f0ebff] text-[#7652d6]' : 'bg-[#eaf8f1] text-[#087b4d]'"><UserRound v-if="scope.type === 'person'" class="h-4 w-4" /><UsersRound v-else-if="scope.type === 'group'" class="h-4 w-4" /><Building2 v-else class="h-4 w-4" /></span>
              <div><strong class="text-xs font-medium text-[#2d333a]">{{ scope.label }}</strong><p class="mt-0.5 text-[10px] text-[#9197a0]">{{ scope.type === 'person' ? '人员' : scope.type === 'group' ? '群组' : '组织架构' }}</p></div><span class="text-[11px] text-[#747c87]">{{ scope.detail }}</span><button type="button" :aria-label="`移除${scope.label}`" class="ml-auto grid h-8 w-8 place-items-center rounded-lg text-[#a0a6af] hover:bg-[#fff1ef] hover:text-[#d24b36]" @click="removeScope(scope)"><Trash2 class="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <div v-else class="grid min-h-[300px] place-items-center rounded-xl border border-dashed border-[#d9dfe7] bg-[#fafbfc] text-center"><div><ShieldCheck class="mx-auto h-8 w-8 text-[#bdc4ce]" /><p class="mt-3 text-sm font-medium text-[#59616d]">尚未配置可见范围</p><p class="mt-1 text-[11px] text-[#969ca5]">添加人员、群组或组织后，该员工即可查看对应日程。</p><button type="button" class="mt-4 text-xs font-semibold text-[#1769e0]" @click="openPicker()">立即添加</button></div></div>
        </div>
        <footer class="flex h-16 shrink-0 items-center justify-between border-t border-[#edf0f3] bg-white px-6"><span data-testid="schedule-permission-save-feedback" class="text-[11px] text-[#39805f]">{{ saveFeedback }}</span><button data-testid="schedule-permission-save" type="button" :disabled="!permissionDirty" class="h-9 rounded-lg bg-[#1769e0] px-5 text-xs font-semibold text-white transition hover:bg-[#0f5fce] disabled:cursor-not-allowed disabled:bg-[#dfe3e9]" @click="savePermissions">保存</button></footer>
      </template>

      <template v-else>
        <div class="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_310px]">
          <div class="flex min-h-0 flex-col border-r border-[#e8ebef]">
            <div class="border-b border-[#edf0f3] px-5 pt-4">
              <label class="relative block"><Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3ad]" /><input v-model="pickerQuery" aria-label="搜索可见范围" class="h-10 w-full rounded-xl border border-[#dfe4ea] bg-[#fafbfc] pl-9 pr-3 text-xs outline-none focus:border-[#1769e0] focus:bg-white" :placeholder="pickerTab === 'people' ? '搜索姓名、部门或岗位' : pickerTab === 'groups' ? '搜索群组' : '搜索组织架构'" /></label>
              <div class="mt-4 flex gap-6">
                <button v-for="tab in [{ id: 'people', label: '按人选择', icon: UserRound }, { id: 'groups', label: '按群组选择', icon: UsersRound }, { id: 'organization', label: '按架构选择', icon: Network }]" :key="tab.id" type="button" class="relative flex items-center gap-1.5 pb-3 text-xs font-medium transition" :class="pickerTab === tab.id ? 'text-[#1769e0]' : 'text-[#747b86] hover:text-[#30343a]'" @click="pickerTab = tab.id as PickerTab; pickerQuery = ''"><component :is="tab.icon" class="h-4 w-4" />{{ tab.label }}<span v-if="pickerTab === tab.id" class="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#1769e0]" /></button>
              </div>
            </div>

            <div class="elegant-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
              <template v-if="pickerTab !== 'organization'">
                <label v-for="item in pickerList" :key="item.id" class="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[#f6f8fb]"><input type="checkbox" class="h-4 w-4 rounded border-[#cbd1d9] accent-[#1769e0]" :checked="pickerSelection.has(`${pickerTab === 'people' ? 'person' : 'group'}:${item.id}`)" @change="toggleSelection(`${pickerTab === 'people' ? 'person' : 'group'}:${item.id}`)" /><span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-semibold" :class="pickerTab === 'people' ? 'bg-[#eaf2ff] text-[#1769e0]' : 'bg-[#f0ebff] text-[#7652d6]'">{{ pickerTab === 'people' ? item.label.slice(-1) : '组' }}</span><span class="min-w-0"><strong class="block truncate text-xs font-medium text-[#30353c]">{{ item.label }}</strong><small class="mt-0.5 block truncate text-[10px] text-[#9298a2]">{{ item.detail }}</small></span></label>
              </template>
              <template v-else>
                <div v-for="root in organizationScopeTree.filter((item) => !pickerQuery || `${item.label}${item.children?.map((child) => child.label).join('')}`.includes(pickerQuery))" :key="root.id" class="mb-1">
                  <div class="flex items-center rounded-xl hover:bg-[#f6f8fb]"><button type="button" :aria-label="`${expandedOrganizations.has(root.id) ? '收起' : '展开'}${root.label}`" class="grid h-10 w-9 place-items-center text-[#8d949e]" :disabled="!root.children?.length" @click="toggleOrganization(root.id)"><ChevronDown v-if="root.children?.length && expandedOrganizations.has(root.id)" class="h-3.5 w-3.5" /><ChevronRight v-else-if="root.children?.length" class="h-3.5 w-3.5" /></button><label class="flex flex-1 cursor-pointer items-center gap-2 py-2 pr-3"><input type="checkbox" class="h-4 w-4 rounded border-[#cbd1d9] accent-[#1769e0]" :checked="pickerSelection.has(`organization:${root.id}`)" @change="toggleSelection(`organization:${root.id}`)" /><Building2 class="h-4 w-4 text-[#087b4d]" /><span class="text-xs font-medium text-[#30353c]">{{ root.label }}</span><span v-if="root.children?.length" class="ml-auto text-[10px] text-[#9aa0a9]">{{ root.children.length }} 个下级</span></label></div>
                  <div v-if="root.children?.length && expandedOrganizations.has(root.id)" class="ml-[54px] border-l border-[#dfe5eb] pl-3">
                    <label v-for="child in root.children" :key="child.id" class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-[#f6f8fb]"><input type="checkbox" class="h-4 w-4 rounded border-[#cbd1d9] accent-[#1769e0]" :checked="pickerSelection.has(`organization:${child.id}`)" @change="toggleSelection(`organization:${child.id}`)" /><span class="text-xs text-[#59616d]">{{ child.label }}</span></label>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <aside class="flex min-h-0 flex-col bg-[#fafbfc]">
            <div class="border-b border-[#e8ebef] px-5 py-4"><h3 class="text-[13px] font-semibold text-[#30353c]">已选择 <span class="ml-1 font-normal text-[#1769e0]">{{ pickerSelection.size }} / 100</span></h3><p class="mt-1 text-[10px] text-[#9298a2]">可跨类型组合选择</p></div>
            <div class="elegant-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
              <div v-if="pickerSelection.size" class="flex flex-wrap gap-2"><button v-for="key in pickerSelection" :key="key" type="button" class="inline-flex items-center gap-1 rounded-full border border-[#d8e3f4] bg-white px-2.5 py-1.5 text-[11px] text-[#4e5a68] hover:border-[#f0b6ad] hover:text-[#c7432c]" @click="toggleSelection(key)">{{ key.split(':')[0] === 'person' ? people.find((item) => item.id === key.split(':')[1])?.label : key.split(':')[0] === 'group' ? groups.find((item) => item.id === key.split(':')[1])?.label : organizationScopeTree.flatMap((item) => [item, ...(item.children ?? [])]).find((item) => item.id === key.split(':')[1])?.label }}<X class="h-3 w-3" /></button></div>
              <div v-else class="grid h-full place-items-center text-center"><div><Settings2 class="mx-auto h-7 w-7 text-[#c4cad2]" /><p class="mt-2 text-xs text-[#9298a2]">从左侧选择可见范围</p></div></div>
            </div>
            <footer class="flex shrink-0 justify-end gap-2 border-t border-[#e8ebef] p-4"><button type="button" class="h-9 rounded-lg border border-[#dfe4ea] bg-white px-4 text-xs font-medium text-[#5f6772]" @click="view = 'scope'">取消</button><button data-testid="schedule-permission-confirm-scope" type="button" :disabled="!pickerSelection.size" class="h-9 rounded-lg bg-[#1769e0] px-5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#dfe3e9]" @click="confirmPicker">确认添加</button></footer>
          </aside>
        </div>
      </template>
    </section>
  </div>
</template>
