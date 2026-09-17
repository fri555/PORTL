<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Building2,
  Check,
  ChevronLeft,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-vue-next'

type MemberType = 'admin' | 'department' | 'person'
type PickerTab = 'department' | 'person'

export interface PermissionMember {
  id: string
  name: string
  detail: string
  type: MemberType
  locked?: boolean
}

const props = withDefaults(defineProps<{
  resourceName: string
  resourceKind: '知识库' | '智能体'
  initialMembers?: PermissionMember[]
}>(), { initialMembers: () => [] })

const emit = defineEmits<{
  close: []
  save: [members: PermissionMember[]]
}>()

const departments = [
  { id: 'product-operation', name: '商品运营中心', detail: '部门及下级组织 · 18 人' },
  { id: 'live-business', name: '直播事业部', detail: '部门及下级组织 · 26 人' },
  { id: 'platform-operation', name: '平台运营部', detail: '部门及下级组织 · 15 人' },
  { id: 'brand-marketing', name: '品牌营销部', detail: '部门及下级组织 · 12 人' },
  { id: 'technology-center', name: '技术中心', detail: '部门及下级组织 · 31 人' },
  { id: 'finance-center', name: '财务管理中心', detail: '部门及下级组织 · 9 人' },
]

const people = [
  { id: 'liu-yang', name: '刘洋', employeeNo: '240641', detail: '商品运营中心 · 商品负责人' },
  { id: 'chen-chen', name: '陈晨', employeeNo: '180203', detail: '集团运营部 · 运营经理' },
  { id: 'zhao-liu', name: '赵六', employeeNo: '200117', detail: '技术中心 · 产品负责人' },
  { id: 'sun-qi', name: '孙琪', employeeNo: '190328', detail: '财务管理中心 · 财务 BP' },
  { id: 'wang-wu', name: '王五', employeeNo: '210065', detail: '直播事业部 · 直播运营' },
  { id: 'lin-xia', name: '林夏', employeeNo: '220719', detail: '人力资源中心 · HRBP' },
  { id: 'zhou-qian', name: '周茜', employeeNo: '240643', detail: '穿搭内容组 · 短视频出镜' },
  { id: 'han-xing', name: '韩兴', employeeNo: '160405', detail: '三方平台 · 大客户经理' },
]

const defaultMembers: PermissionMember[] = [
  { id: 'system-admin', name: '系统管理员', detail: '全局管理员 · 后端配置', type: 'admin', locked: true },
  { id: 'product-operation', name: '商品运营中心', detail: '部门及下级组织', type: 'department' },
  { id: 'liu-yang', name: '刘洋', detail: '商品运营中心 · 商品负责人', type: 'person' },
]

function cloneMembers(source: PermissionMember[]) {
  return source.map((member) => ({ ...member }))
}

const view = ref<'members' | 'picker'>('members')
const pickerTab = ref<PickerTab>('department')
const query = ref('')
const selected = ref(new Set<string>())
const members = ref<PermissionMember[]>(cloneMembers(props.initialMembers.length ? props.initialMembers : defaultMembers))
const savedMembers = ref<PermissionMember[]>(cloneMembers(members.value))
const feedback = ref('')
const error = ref('')

const dirty = computed(() => JSON.stringify(members.value) !== JSON.stringify(savedMembers.value))
const pickerItems = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  const source = pickerTab.value === 'department' ? departments : people
  return source.filter((item) => !keyword || `${item.name}${'employeeNo' in item ? item.employeeNo : ''}${item.detail}`.toLowerCase().includes(keyword))
})

function keyFor(type: PickerTab, id: string) {
  return `${type}:${id}`
}

function isExisting(type: PickerTab, id: string) {
  const memberType = type === 'department' ? 'department' : 'person'
  return members.value.some((item) => item.type === memberType && item.id === id)
}

function openPicker() {
  selected.value = new Set()
  query.value = ''
  error.value = ''
  view.value = 'picker'
}

function toggle(type: PickerTab, id: string) {
  if (isExisting(type, id)) return
  const next = new Set(selected.value)
  const key = keyFor(type, id)
  if (next.has(key)) next.delete(key)
  else if (next.size < 30) next.add(key)
  else error.value = '单次最多添加 30 个成员或部门'
  selected.value = next
}

function confirmAdd() {
  const additions: PermissionMember[] = []
  for (const key of selected.value) {
    const [type, id] = key.split(':') as [PickerTab, string]
    if (isExisting(type, id)) continue
    if (type === 'department') {
      const item = departments.find((entry) => entry.id === id)
      if (item) additions.push({ id: item.id, name: item.name, detail: '部门及下级组织 · 人员变动自动同步', type: 'department' })
    } else {
      const item = people.find((entry) => entry.id === id)
      if (item) additions.push({ id: item.id, name: item.name, detail: `${item.employeeNo} · ${item.detail}`, type: 'person' })
    }
  }
  members.value = [...members.value, ...additions]
  view.value = 'members'
  feedback.value = additions.length ? `已添加 ${additions.length} 项，保存设置后生效` : ''
}

function removeMember(member: PermissionMember) {
  if (member.locked) return
  members.value = members.value.filter((item) => !(item.type === member.type && item.id === member.id))
  feedback.value = '成员变更处于草稿状态，保存设置后生效'
}

function save() {
  const unique = new Set(members.value.map((item) => `${item.type}:${item.id}`))
  if (unique.size !== members.value.length) {
    error.value = '存在重复成员，请检查后重试'
    return
  }
  if (members.value.length > 31) {
    error.value = '授权成员超过允许数量'
    return
  }
  savedMembers.value = cloneMembers(members.value)
  feedback.value = '权限设置已保存并配置生效'
  error.value = ''
  emit('save', cloneMembers(members.value))
}

function closeOnEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', closeOnEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', closeOnEscape))
</script>

<template>
  <div class="fixed inset-0 z-[260] grid place-items-center bg-[#111827]/40 px-4 py-5 backdrop-blur-[3px]" @click.self="emit('close')">
    <section data-testid="resource-permission-dialog" role="dialog" aria-modal="true" class="flex h-[min(700px,calc(100vh-40px))] w-[980px] max-w-full flex-col overflow-hidden rounded-[24px] border border-white/90 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
      <header class="flex h-[72px] shrink-0 items-center justify-between border-b border-[#e8ebef] px-6">
        <div class="flex min-w-0 items-center gap-3">
          <button v-if="view === 'picker'" type="button" aria-label="返回成员授权" class="grid h-9 w-9 place-items-center rounded-xl border border-[#e2e6eb] text-[#68707b] hover:bg-[#f5f7fa]" @click="view = 'members'"><ChevronLeft class="h-4 w-4" /></button>
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf2ff] text-[#1769e0]"><ShieldCheck class="h-5 w-5" /></span>
          <div class="min-w-0">
            <h2 class="truncate text-[16px] font-semibold text-[#202329]">{{ view === 'members' ? `权限设置 - ${resourceName}` : '添加成员' }}</h2>
            <p class="mt-0.5 truncate text-[11px] text-[#8b939e]">{{ view === 'members' ? `${resourceKind}成员可查看和使用该资源` : '按部门或人员选择，单次最多添加 30 项' }}</p>
          </div>
        </div>
        <button type="button" aria-label="关闭权限设置" class="grid h-9 w-9 place-items-center rounded-xl text-[#8b929c] hover:bg-[#f5f7fa]" @click="emit('close')"><X class="h-5 w-5" /></button>
      </header>

      <template v-if="view === 'members'">
        <div class="flex items-center justify-between border-b border-[#edf0f3] bg-[#fafbfc] px-6 py-4">
          <div><h3 class="text-sm font-semibold text-[#252a31]">成员授权</h3><p class="mt-1 text-[11px] text-[#848b96]">已配置 {{ members.length }} 项；未授权用户不可见该{{ resourceKind }}。</p></div>
          <button data-testid="permission-add-member" type="button" class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1769e0] px-4 text-xs font-semibold text-white shadow-[0_5px_14px_rgba(23,105,224,0.22)] hover:bg-[#0f5fce]" @click="openPicker"><Plus class="h-4 w-4" />添加成员</button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div class="mb-4 rounded-lg border border-[#dbe7f8] bg-[#f5f9ff] px-4 py-3 text-[11px] leading-5 text-[#5d6f87]">
            权限固定为“查看”。部门授权会自动同步后续入职、离职和调岗；所有变更仅在点击“保存设置”后生效。
            <span v-if="resourceKind === '知识库'" class="block">保存后同步作用于 RAG 检索链路，未授权知识库不会参与召回和回答生成。</span>
          </div>
          <div class="overflow-hidden rounded-xl border border-[#e1e6ec]">
            <div class="grid grid-cols-[64px_1fr_130px_80px] bg-[#f6f8fa] px-4 py-3 text-[10px] font-semibold text-[#7f8792]"><span>类型</span><span>成员</span><span>权限</span><span class="text-right">操作</span></div>
            <div v-for="member in members" :key="`${member.type}-${member.id}`" class="grid grid-cols-[64px_1fr_130px_80px] items-center border-t border-[#e8ecf1] px-4 py-3.5">
              <span class="grid h-8 w-8 place-items-center rounded-lg" :class="member.type === 'department' ? 'bg-[#eaf8f1] text-[#087b4d]' : member.type === 'admin' ? 'bg-[#f0ebff] text-[#7652d6]' : 'bg-[#eaf2ff] text-[#1769e0]'">
                <Building2 v-if="member.type === 'department'" class="h-4 w-4" /><LockKeyhole v-else-if="member.type === 'admin'" class="h-4 w-4" /><UserRound v-else class="h-4 w-4" />
              </span>
              <div><strong class="text-xs font-medium text-[#2d333a]">{{ member.name }}</strong><p class="mt-0.5 text-[10px] text-[#9197a0]">{{ member.detail }}</p></div>
              <span class="inline-flex w-fit items-center gap-1 rounded-full bg-[#eef7f2] px-2.5 py-1 text-[10px] font-medium text-[#2f815d]"><Check class="h-3 w-3" />查看</span>
              <span class="ml-auto"><LockKeyhole v-if="member.locked" class="h-4 w-4 text-[#b6bcc5]" /><button v-else type="button" :aria-label="`移除${member.name}`" class="grid h-8 w-8 place-items-center rounded-lg text-[#a0a6af] hover:bg-[#fff1ef] hover:text-[#d24b36]" @click="removeMember(member)"><Trash2 class="h-3.5 w-3.5" /></button></span>
            </div>
          </div>
        </div>

        <footer class="flex h-16 shrink-0 items-center justify-between border-t border-[#edf0f3] px-6">
          <div><p v-if="feedback" class="text-[11px] text-[#39805f]">{{ feedback }}</p><p v-if="error" class="text-[11px] text-[#c7432c]">{{ error }}</p></div>
          <div class="flex gap-2"><button type="button" class="h-9 rounded-lg border border-[#dfe4ea] px-4 text-xs text-[#5f6772]" @click="emit('close')">取消</button><button data-testid="permission-save" type="button" :disabled="!dirty" class="h-9 rounded-lg bg-[#1769e0] px-5 text-xs font-semibold text-white disabled:bg-[#dfe3e9]" @click="save">保存设置</button></div>
        </footer>
      </template>

      <template v-else>
        <div class="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px]">
          <div class="flex min-h-0 flex-col border-r border-[#e8ebef]">
            <div class="border-b border-[#edf0f3] px-5 pt-4">
              <label class="relative block"><Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3ad]" /><input v-model="query" aria-label="搜索部门或人员" class="h-10 w-full rounded-xl border border-[#dfe4ea] bg-[#fafbfc] pl-9 pr-3 text-xs outline-none focus:border-[#1769e0]" :placeholder="pickerTab === 'department' ? '搜索部门' : '搜索姓名或工号'" /></label>
              <div class="mt-4 flex gap-6"><button v-for="tab in [{ id: 'department', label: '部门' }, { id: 'person', label: '人员' }]" :key="tab.id" type="button" class="relative pb-3 text-xs font-medium" :class="pickerTab === tab.id ? 'text-[#1769e0]' : 'text-[#747b86]'" @click="pickerTab = tab.id as PickerTab; query = ''">{{ tab.label }}<span v-if="pickerTab === tab.id" class="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#1769e0]" /></button></div>
            </div>
            <div class="min-h-0 flex-1 overflow-y-auto p-4">
              <label v-for="item in pickerItems" :key="item.id" class="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[#f6f8fb]">
                <input type="checkbox" class="h-4 w-4 accent-[#1769e0]" :disabled="isExisting(pickerTab, item.id)" :checked="selected.has(keyFor(pickerTab, item.id)) || isExisting(pickerTab, item.id)" @change="toggle(pickerTab, item.id)" />
                <span class="grid h-9 w-9 place-items-center rounded-lg" :class="pickerTab === 'department' ? 'bg-[#eaf8f1] text-[#087b4d]' : 'bg-[#eaf2ff] text-[#1769e0]'"><Building2 v-if="pickerTab === 'department'" class="h-4 w-4" /><UserRound v-else class="h-4 w-4" /></span>
                <span class="min-w-0"><strong class="block truncate text-xs font-medium text-[#30353c]">{{ item.name }}</strong><small class="mt-0.5 block truncate text-[10px] text-[#9298a2]">{{ 'employeeNo' in item ? `${item.employeeNo} · ` : '' }}{{ item.detail }}</small></span>
                <span v-if="isExisting(pickerTab, item.id)" class="ml-auto text-[10px] text-[#9aa0a9]">已添加</span>
              </label>
            </div>
          </div>

          <aside class="flex min-h-0 flex-col bg-[#fafbfc]">
            <div class="border-b border-[#e8ebef] px-5 py-4"><h3 class="text-[13px] font-semibold text-[#30353c]">已选择 <span class="font-normal text-[#1769e0]">{{ selected.size }} / 30</span></h3><p class="mt-1 text-[10px] text-[#9298a2]">重复成员将自动去重</p></div>
            <div class="min-h-0 flex-1 overflow-y-auto p-4"><div v-if="selected.size" class="flex flex-wrap gap-2"><button v-for="key in selected" :key="key" class="inline-flex items-center gap-1 rounded-full border border-[#d8e3f4] bg-white px-2.5 py-1.5 text-[11px]" @click="toggle(key.split(':')[0] as PickerTab, key.split(':')[1])">{{ key.split(':')[0] === 'department' ? departments.find((item) => item.id === key.split(':')[1])?.name : people.find((item) => item.id === key.split(':')[1])?.name }}<X class="h-3 w-3" /></button></div><div v-else class="grid h-full place-items-center text-center text-xs text-[#9298a2]">从左侧选择部门或人员</div></div>
            <p v-if="error" class="px-4 pb-2 text-[11px] text-[#c7432c]">{{ error }}</p>
            <footer class="flex justify-end gap-2 border-t border-[#e8ebef] p-4"><button class="h-9 rounded-lg border border-[#dfe4ea] bg-white px-4 text-xs" @click="view = 'members'">取消</button><button data-testid="permission-confirm-add" :disabled="!selected.size" class="h-9 rounded-lg bg-[#1769e0] px-5 text-xs font-semibold text-white disabled:bg-[#dfe3e9]" @click="confirmAdd">确认添加</button></footer>
          </aside>
        </div>
      </template>
    </section>
  </div>
</template>
