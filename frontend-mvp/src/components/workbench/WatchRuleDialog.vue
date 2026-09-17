<script setup lang="ts">
import { ref, watch } from 'vue'
import { Trash2, X } from 'lucide-vue-next'
import type { DigestWatchRule, DigestWatchType } from '@/types/workbench'

const props = defineProps<{
  rules: DigestWatchRule[]
  candidates: { groups: string[]; users: string[] }
}>()

const emit = defineEmits<{
  close: []
  saveRules: [rules: DigestWatchRule[]]
}>()

const localRules = ref<DigestWatchRule[]>([])
const type = ref<DigestWatchType>('keyword')
const value = ref('')

watch(() => props.rules, (rules) => {
  localRules.value = rules.map((rule) => ({ ...rule }))
}, { immediate: true, deep: true })

function addRule() {
  const normalized = value.value.trim()
  if (!normalized || localRules.value.length >= 20) return
  if (localRules.value.some((rule) => rule.type === type.value && rule.value === normalized)) return
  localRules.value = [...localRules.value, {
    id: `watch-${Date.now()}-${localRules.value.length}`,
    type: type.value,
    value: normalized,
    label: normalized,
  }]
  value.value = ''
}
</script>

<template>
  <div class="fixed inset-0 z-[190] grid place-items-center bg-[#111827]/30 px-4 backdrop-blur-[2px]" @click.self="emit('close')">
    <section role="dialog" aria-modal="true" aria-label="新增关注" class="w-[520px] max-w-full rounded-[22px] bg-white p-5 shadow-[0_28px_80px_rgba(15,23,42,0.24)]">
      <header class="flex items-center justify-between gap-4">
        <div><h3 class="text-[14px] font-semibold text-[#20242a]">新增关注</h3><p class="mt-1 text-[10px] text-[#8c939e]">最多 20 条群聊、人员或关键词规则</p></div>
        <button type="button" aria-label="关闭关注设置" class="grid h-8 w-8 place-items-center rounded-lg text-[#8d949e] hover:bg-[#f2f4f7]" @click="emit('close')"><X class="h-4 w-4" /></button>
      </header>

      <div class="mt-4 flex gap-2">
        <button v-for="option in (['group', 'user', 'keyword'] as const)" :key="option" type="button" class="rounded-lg px-3 py-1.5 text-xs font-medium" :class="type === option ? 'bg-[#edf3ff] text-[#1769e0]' : 'bg-[#f4f5f7] text-[#68717d]'" @click="type = option">{{ option === 'group' ? '群聊' : option === 'user' ? '人员' : '关键词' }}</button>
      </div>
      <div class="mt-3 flex gap-2">
        <select v-if="type !== 'keyword'" v-model="value" class="h-9 min-w-0 flex-1 rounded-xl border border-[#dfe4eb] px-3 text-xs">
          <option value="">请选择{{ type === 'group' ? '群聊' : '人员' }}</option>
          <option v-for="candidate in type === 'group' ? candidates.groups : candidates.users" :key="candidate" :value="candidate">{{ candidate }}</option>
        </select>
        <input v-else v-model="value" placeholder="输入关键词" class="h-9 min-w-0 flex-1 rounded-xl border border-[#dfe4eb] px-3 text-xs outline-none focus:border-[#7fa6e5]" @keyup.enter="addRule" />
        <button type="button" :disabled="!value.trim() || localRules.length >= 20" class="rounded-xl bg-[#1769e0] px-4 text-xs font-semibold text-white disabled:opacity-40" @click="addRule">添加</button>
      </div>

      <div class="mt-4 max-h-[240px] space-y-2 overflow-y-auto">
        <div v-for="rule in localRules" :key="rule.id" class="flex items-center justify-between gap-3 rounded-xl bg-[#f6f7f9] px-3 py-2">
          <span class="text-xs text-[#525b67]">{{ rule.type === 'group' ? '群聊' : rule.type === 'user' ? '人员' : '关键词' }} · {{ rule.label }}</span>
          <button type="button" :aria-label="`删除${rule.label}`" class="text-[#9a4141] hover:text-[#c43825]" @click="localRules = localRules.filter((item) => item.id !== rule.id)"><Trash2 class="h-3.5 w-3.5" /></button>
        </div>
        <p v-if="!localRules.length" class="py-6 text-center text-xs text-[#969da7]">尚未添加关注规则</p>
      </div>

      <footer class="mt-5 flex items-center justify-between">
        <span class="text-[10px] text-[#949ba5]">{{ localRules.length }}/20</span>
        <div class="flex gap-2"><button type="button" class="rounded-xl px-4 py-2 text-xs font-medium text-[#68717d] hover:bg-[#f3f5f7]" @click="emit('close')">取消</button><button type="button" class="rounded-xl bg-[#1769e0] px-4 py-2 text-xs font-semibold text-white" @click="emit('saveRules', localRules)">保存关注</button></div>
      </footer>
    </section>
  </div>
</template>
