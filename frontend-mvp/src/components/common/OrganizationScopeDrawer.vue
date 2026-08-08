<script setup lang="ts">
import { ref } from 'vue'
import { Building2, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, UserRound } from 'lucide-vue-next'
import { defaultOrganizationScopeId, organizationScopeTree } from '@/mock/organization'

const props = withDefaults(defineProps<{ modelValue?: string; contextLabel?: string }>(), {
  modelValue: defaultOrganizationScopeId,
  contextLabel: '组织口径',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const isOpen = ref(false)
const expanded = ref(new Set(['ye-sports', 'tianma-platform']))

function toggleRoot(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function selectScope(id: string) {
  emit('update:modelValue', id)
}
</script>

<template>
  <aside
    data-testid="org-scope-sidebar"
    class="relative shrink-0 transition-[width] duration-200"
    :class="isOpen ? 'w-[270px] border-r border-[#e7e9ee] bg-white' : 'w-0'"
  >
    <button
      data-testid="org-scope-open"
      type="button"
      class="fixed left-3 top-[4.75rem] z-40 grid h-8 w-8 place-items-center rounded-xl border border-zinc-200 bg-white/95 text-zinc-500 shadow-sm backdrop-blur transition hover:bg-white hover:text-zinc-900"
      :aria-label="isOpen ? `收起${contextLabel}` : `展开${contextLabel}`"
      @click="isOpen = !isOpen"
    >
      <ChevronsLeft v-if="isOpen" class="h-4 w-4" />
      <ChevronsRight v-else class="h-4 w-4" />
    </button>

    <div v-if="isOpen" data-testid="org-scope-drawer" class="flex h-full flex-col">
          <header class="flex h-16 items-center border-b border-[#eef0f3] pl-14 pr-4">
            <div class="min-w-0">
              <h2 class="text-[15px] font-semibold text-[#17191e]">{{ contextLabel }}</h2>
            </div>
          </header>

          <div class="elegant-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4">
            <div v-for="root in organizationScopeTree" :key="root.id" class="mb-1">
              <div class="flex items-center gap-1">
                <button
                  v-if="root.children?.length"
                  type="button"
                  class="grid h-7 w-7 place-items-center rounded-lg text-[#9aa1ac] hover:bg-[#f4f6f8] hover:text-[#25282e]"
                  :aria-label="`${expanded.has(root.id) ? '收起' : '展开'}${root.label}`"
                  @click="toggleRoot(root.id)"
                >
                  <ChevronDown v-if="expanded.has(root.id)" class="h-3.5 w-3.5" />
                  <ChevronRight v-else class="h-3.5 w-3.5" />
                </button>
                <span v-else class="h-7 w-7" />
                <button
                  :data-testid="`org-scope-node-${root.id}`"
                  type="button"
                  class="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition"
                  :class="modelValue === root.id ? 'bg-[#17191e] font-semibold text-white' : 'text-[#333842] hover:bg-[#f4f6f8]'"
                  @click="selectScope(root.id)"
                >
                  <UserRound v-if="root.kind === 'personal'" class="h-3.5 w-3.5 shrink-0" />
                  <Building2 v-else class="h-3.5 w-3.5 shrink-0" />
                  <span class="truncate">{{ root.label }}</span>
                  <span v-if="root.kind === 'personal'" class="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[#36a873]" aria-label="真实数据身份" />
                </button>
              </div>
              <div v-if="root.children?.length && expanded.has(root.id)" class="ml-9 mt-1 space-y-0.5">
                <button
                  v-for="child in root.children"
                  :key="child.id"
                  :data-testid="`org-scope-node-${child.id}`"
                  type="button"
                  class="block w-full truncate rounded-lg px-3 py-1.5 text-left text-[12px] transition"
                  :class="modelValue === child.id ? 'bg-[#edf3ff] font-semibold text-[#1769e0]' : 'text-[#66707d] hover:bg-[#f6f8fb] hover:text-[#22252b]'"
                  @click="selectScope(child.id)"
                >
                  {{ child.label }}
                </button>
              </div>
            </div>
          </div>

    </div>
  </aside>
</template>
