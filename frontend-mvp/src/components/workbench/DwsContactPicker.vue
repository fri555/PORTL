<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search, UserRound, X } from 'lucide-vue-next'
import { searchDwsContacts, type DwsContact } from '@/services/dws-workbench'

const props = withDefaults(defineProps<{
  modelValue: DwsContact[]
  multiple?: boolean
  placeholder?: string
  testId?: string
}>(), {
  multiple: true,
  placeholder: '搜索姓名或部门',
  testId: 'contact-picker',
})

const emit = defineEmits<{ 'update:modelValue': [value: DwsContact[]] }>()

const query = ref('')
const results = ref<DwsContact[]>([])
const searching = ref(false)
const error = ref('')
const searched = ref(false)
let searchSequence = 0

const selectedRefs = computed(() => new Set(props.modelValue.map((item) => item.ref)))

async function search() {
  const keyword = query.value.trim()
  if (!keyword) {
    results.value = []
    error.value = ''
    searched.value = false
    return
  }
  const sequence = ++searchSequence
  searching.value = true
  error.value = ''
  searched.value = true
  try {
    const contacts = await searchDwsContacts(keyword)
    if (sequence === searchSequence) results.value = contacts
  } catch (cause) {
    if (sequence === searchSequence) error.value = cause instanceof Error ? cause.message : '通讯录搜索失败'
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
}

function remove(ref: string) {
  emit('update:modelValue', props.modelValue.filter((item) => item.ref !== ref))
}
</script>

<template>
  <div :data-testid="testId" class="relative">
    <div class="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-[#dfe4eb] bg-white px-2.5 py-1.5 transition focus-within:border-[#78a8ef] focus-within:ring-2 focus-within:ring-[#1769e0]/8">
      <span v-for="contact in modelValue" :key="contact.ref" class="inline-flex h-7 items-center gap-1 rounded-full bg-[#eef4ff] px-2 text-[10px] font-medium text-[#275fba]">
        <span class="grid h-4 w-4 place-items-center overflow-hidden rounded-full bg-[#dbe9ff]"><img v-if="contact.avatar" :src="contact.avatar" alt="" class="h-full w-full object-cover"><UserRound v-else class="h-2.5 w-2.5" /></span>
        {{ contact.name }}
        <button type="button" :aria-label="`移除${contact.name}`" class="grid h-4 w-4 place-items-center rounded-full hover:bg-[#d8e6fa]" @click="remove(contact.ref)"><X class="h-2.5 w-2.5" /></button>
      </span>
      <div class="flex min-w-[150px] flex-1 items-center gap-1.5">
        <Search class="h-3.5 w-3.5 shrink-0 text-[#a2a8b1]" />
        <input v-model="query" :data-testid="`${testId}-input`" :placeholder="placeholder" class="h-7 min-w-0 flex-1 bg-transparent text-[12px] text-[#2d3239] outline-none placeholder:text-[#aeb3bb]" @keydown.enter.prevent="search" />
        <button v-if="query" type="button" class="h-6 rounded-lg px-2 text-[10px] font-medium text-[#1769e0] hover:bg-[#eef4ff]" @click="search">搜索</button>
      </div>
    </div>
    <div v-if="searching || error || searched" class="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-48 overflow-y-auto rounded-xl border border-[#e0e4ea] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
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
