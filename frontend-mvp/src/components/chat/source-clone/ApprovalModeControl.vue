<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check, ChevronDown, Hand, Sparkles } from 'lucide-vue-next'

export type ApprovalMode = 'default' | 'autonomous'

const props = withDefaults(defineProps<{
  modelValue: ApprovalMode
  readonly?: boolean
}>(), { readonly: false })

const emit = defineEmits<{ 'update:modelValue': [value: ApprovalMode] }>()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
function close() { open.value = false }
function outside(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) close()
}
function escape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !open.value) return
  event.stopPropagation()
  close()
  trigger.value?.focus()
}
watch(() => props.readonly, close)
onMounted(() => document.addEventListener('mousedown', outside))
onBeforeUnmount(() => document.removeEventListener('mousedown', outside))

const modes: { value: ApprovalMode; label: string; description: string; icon: unknown }[] = [
  {
    value: 'default',
    label: '默认权限',
    description: '需要你确认需求澄清，审批执行等请求',
    icon: Hand,
  },
  {
    value: 'autonomous',
    label: '自主执行',
    description: '系统将自动处理需求澄清、审批执行等请求，请谨慎操作',
    icon: Sparkles,
  },
]

function select(value: ApprovalMode) {
  emit('update:modelValue', value)
  open.value = false
}
</script>

<template>
  <div ref="root" class="approval-mode" :class="{ 'is-readonly': readonly }" @keydown="escape">
    <button
      type="button"
      ref="trigger"
      class="approval-mode__trigger"
      :class="{ 'approval-mode__trigger--readonly': readonly }"
      data-testid="approval-mode-trigger"
      aria-haspopup="menu"
      :aria-expanded="open"
      :title="modelValue === 'autonomous' ? '系统将自动处理需求澄清、审批执行等请求，请谨慎操作' : '需要你确认需求澄清，审批执行等请求'"
      @click="open = !open"
      @keydown.esc="open = false"
    >
      <component :is="modelValue === 'autonomous' ? Sparkles : Hand" :size="14" />
      {{ modelValue === 'autonomous' ? '自主执行' : '默认权限' }}
      <ChevronDown :size="13" />
    </button>
    <section v-if="open" class="approval-mode__menu" role="menu" aria-label="选择执行方式">
      <header>
        <strong>权限控制</strong>
        <small>切换后对当前会话立即生效</small>
      </header>
      <button
        v-for="item in modes"
        :key="item.value"
        type="button"
        role="menuitemradio"
        :aria-checked="modelValue === item.value"
        :data-testid="'approval-mode-' + item.value"
        @click="select(item.value)"
      >
        <span class="approval-mode__icon"><component :is="item.icon" :size="16" /></span>
        <span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span>
        <Check v-if="modelValue === item.value" :size="16" />
      </button>
    </section>
  </div>
</template>

<style scoped>
.approval-mode { position: relative; }
.approval-mode__trigger {
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  border-radius: 8px;
  padding: 0 9px;
  color: #606975;
  font: 12px inherit;
  white-space: nowrap;
}
.approval-mode__trigger {
  border: 0;
  background: transparent;
  cursor: pointer;
}
.approval-mode__trigger:hover,
.approval-mode__trigger[aria-expanded='true'] { background: #f3f5f7; color: #202631; }
.approval-mode__trigger--readonly { background: #f3f5f7; }
.approval-mode__menu {
  position: absolute;
  z-index: 80;
  left: 0;
  bottom: calc(100% + 9px);
  width: 326px;
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid #e2e5e9;
  border-radius: 13px;
  background: #fff;
  padding: 8px;
  box-shadow: 0 14px 38px rgba(28, 39, 53, .16);
}
.approval-mode__menu header { padding: 7px 9px 9px; border-bottom: 1px solid #f0f1f3; }
.approval-mode__menu header strong,
.approval-mode__menu header small { display: block; }
.approval-mode__menu header strong { color: #202631; font-size: 13px; }
.approval-mode__menu header small { margin-top: 3px; color: #9299a3; font-size: 10px; }
.approval-mode__menu > button {
  display: grid;
  width: 100%;
  grid-template-columns: 32px 1fr 18px;
  align-items: center;
  gap: 9px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  padding: 10px 9px;
  color: #343c48;
  text-align: left;
  cursor: pointer;
}
.approval-mode__menu > button:hover { background: #f6f8fa; }
.approval-mode__menu > button[aria-checked='true'] { background: #f1f6fd; color: #246ec9; }
.approval-mode__icon {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 8px;
  background: #eef1f5;
}
.approval-mode__menu button[aria-checked='true'] .approval-mode__icon { background: #e2edfb; }
.approval-mode__menu button span:nth-child(2) strong,
.approval-mode__menu button span:nth-child(2) small { display: block; }
.approval-mode__menu button span:nth-child(2) strong { font-size: 12px; }
.approval-mode__menu button span:nth-child(2) small { margin-top: 3px; color: #7f8895; font-size: 10px; line-height: 1.45; }
@media (max-width: 520px) {
  .approval-mode__menu { width: min(326px, calc(100vw - 40px)); }
}
</style>

