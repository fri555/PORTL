<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Search, UserRound, X } from 'lucide-vue-next'
import { searchDwsContacts, suggestDwsContacts, type DwsContact } from '@/services/dws-workbench'

const mockContacts: DwsContact[] = [
  { ref: 'mock-contact-zhang-ming', name: '张明', department: '产品部' },
  { ref: 'mock-contact-li-na', name: '李娜', department: '财务部' },
  { ref: 'mock-contact-wang-jie', name: '王杰', department: '供应链中心' },
  { ref: 'mock-contact-qing-hui', name: '清晖', department: '设计中心' },
  { ref: 'mock-contact-liu-yang', name: '刘洋', department: '商品运营部' },
  { ref: 'mock-contact-chen-chen', name: '陈晨', department: '项目管理部' },
]

const props = withDefaults(defineProps<{
  modelValue: DwsContact[]
  multiple?: boolean
  placeholder?: string
  testId?: string
  liveConnected?: boolean
}>(), {
  multiple: true,
  placeholder: '搜索姓名或部门',
  testId: 'contact-picker',
  liveConnected: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: DwsContact[]] }>()

const query = ref('')
const results = ref<DwsContact[]>([])
const searching = ref(false)
const error = ref('')
const searched = ref(false)
const isOpen = ref(false)
const pickerRoot = ref<HTMLElement | null>(null)
let searchSequence = 0

const selectedRefs = computed(() => new Set(props.modelValue.map((item) => item.ref)))

async function search() {
  const keyword = query.value.trim()
  if (!keyword) {
    await openSuggestions()
    return
  }
  const sequence = ++searchSequence
  searching.value = true
  error.value = ''
  searched.value = true
  isOpen.value = true
  try {
    const contacts = props.liveConnected
      ? await searchDwsContacts(keyword)
      : mockContacts.filter((contact) => `${contact.name}${contact.department ?? ''}`.includes(keyword))
    if (sequence === searchSequence) results.value = contacts
  } catch (cause) {
    if (sequence === searchSequence) error.value = cause instanceof Error ? cause.message : '通讯录搜索失败'
  } finally {
    if (sequence === searchSequence) searching.value = false
  }
}

async function openSuggestions() {
  isOpen.value = true
  if (query.value.trim()) return
  const sequence = ++searchSequence
  searching.value = props.liveConnected
  error.value = ''
  searched.value = true
  try {
    const contacts = props.liveConnected ? await suggestDwsContacts() : mockContacts
    if (sequence === searchSequence) results.value = contacts
  } catch (cause) {
    if (sequence === searchSequence) error.value = cause instanceof Error ? cause.message : '通讯录建议加载失败'
  } finally {
    if (sequence === searchSequence) searching.value = false
  }
}

function select(contact: DwsContact) {
  if (props.multiple) {
    if (!selectedRefs.value.has(contact.ref)) emit('update:modelValue', [...props.modelValue, contact])
  } else {
    emit('update:modelValue', [contact])
  }
  query.value = ''
  results.value = []
  isOpen.value = false
}

function remove(ref: string) {
  emit('update:modelValue', props.modelValue.filter((item) => item.ref !== ref))
}

function closeOnOutsideClick(event: MouseEvent) {
  if (!pickerRoot.value?.contains(event.target as Node)) isOpen.value = false
}

onMounted(() => document.addEventListener('mousedown', closeOnOutsideClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', closeOnOutsideClick))
</script>

<template>
  <div ref="pickerRoot" :data-testid="testId" class="relative">
    <div class="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-[#dfe4eb] bg-white px-2.5 py-1.5 transition focus-within:border-[#78a8ef] focus-within:ring-2 focus-within:ring-[#1769e0]/8">
      <span v-for="contact in modelValue" :key="contact.ref" class="inline-flex h-7 items-center gap-1 rounded-full bg-[#eef4ff] px-2 text-[10px] font-medium text-[#275fba]">
        <span class="grid h-4 w-4 place-items-center overflow-hidden rounded-full bg-[#dbe9ff]"><img v-if="contact.avatar" :src="contact.avatar" alt="" class="h-full w-full object-cover"><UserRound v-else class="h-2.5 w-2.5" /></span>
        {{ contact.name }}
        <button type="button" :aria-label="`移除${contact.name}`" class="grid h-4 w-4 place-items-center rounded-full hover:bg-[#d8e6fa]" @click="remove(contact.ref)"><X class="h-2.5 w-2.5" /></button>
      </span>
      <div class="flex min-w-[150px] flex-1 items-center gap-1.5">
        <Search class="h-3.5 w-3.5 shrink-0 text-[#a2a8b1]" />
        <input v-model="query" :data-testid="`${testId}-input`" :placeholder="placeholder" class="h-7 min-w-0 flex-1 bg-transparent text-[12px] text-[#2d3239] outline-none placeholder:text-[#aeb3bb]" @focus="openSuggestions" @keydown.enter.prevent="search" />
        <button v-if="query" type="button" class="h-6 rounded-lg px-2 text-[10px] font-medium text-[#1769e0] hover:bg-[#eef4ff]" @click="search">搜索</button>
      </div>
    </div>
    <div v-if="isOpen && (searching || error || searched)" :data-testid="`${testId}-suggestions`" class="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-48 overflow-y-auto overscroll-contain rounded-xl border border-[#e0e4ea] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
      <p v-if="searching" class="px-3 py-2 text-[10px] text-[#8a919b]">正在搜索通讯录…</p>
      <p v-else-if="error" class="px-3 py-2 text-[10px] text-[#c43825]">{{ error }}</p>
      <p v-else-if="!results.length" class="px-3 py-2 text-[10px] text-[#8a919b]">未找到匹配联系人，请尝试完整姓名或部门</p>
      <button v-for="contact in results" v-else :key="contact.ref" type="button" class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-[#f4f7fb] disabled:opacity-45" :disabled="selectedRefs.has(contact.ref)" @click="select(contact)">
        <span class="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[#eef4ff] text-[#1769e0]"><img v-if="contact.avatar" :src="contact.avatar" alt="" class="h-full w-full object-cover"><UserRound v-else class="h-3.5 w-3.5" /></span>
        <span class="min-w-0"><strong class="block truncate text-[12px] font-medium text-[#2a2f36]">{{ contact.name }}</strong><small class="block truncate text-[10px] text-[#9298a2]">{{ contact.department || '企业通讯录' }}</small></span>
      </button>
    </div>
  </div>
</template>
