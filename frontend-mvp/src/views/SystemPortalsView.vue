<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search } from 'lucide-vue-next'

const searchQuery = ref('')

const portals = [
  { name: '工作台', tag: '常用', tagColor: 'bg-[#eff6ff] text-[#0066ff]', description: '集团统一工作台', url: '#' },
  { name: 'AI大模型', tag: '经营管理', tagColor: 'bg-[#f3fdc4] text-[#8dad00]', description: 'AI大模型问答', url: '#' },
  { name: '天马运动', tag: '经营管理', tagColor: 'bg-[#f3fdc4] text-[#8dad00]', description: '一站式全渠道供应链平台', url: '#' },
  { name: '耶运动-视觉内容中心', tag: '经营管理', tagColor: 'bg-[#f3fdc4] text-[#8dad00]', description: '', url: '#' },
  { name: '新零售', tag: '经营管理', tagColor: 'bg-[#f3fdc4] text-[#8dad00]', description: '流星马新零售', url: '#' },
  { name: '【自营】订单系统', tag: '经营管理', tagColor: 'bg-[#f3fdc4] text-[#8dad00]', description: '', url: '#' },
  { name: '第三方系统', tag: '经营管理', tagColor: 'bg-[#f3fdc4] text-[#8dad00]', description: '', url: '#' },
  { name: '售后工单', tag: '经营管理', tagColor: 'bg-[#f3fdc4] text-[#8dad00]', description: '', url: '#' },
  { name: '大库存', tag: '经营管理', tagColor: 'bg-[#f3fdc4] text-[#8dad00]', description: '', url: '#' },
  { name: '新运营', tag: '经营管理', tagColor: 'bg-[#f3fdc4] text-[#8dad00]', description: '', url: '#' },
  { name: '需求管理系统', tag: '项目管理', tagColor: 'bg-[#fff5f0] text-[#e07030]', description: '', url: '#' },
]

const filteredPortals = computed(() => {
  if (!searchQuery.value.trim()) return portals
  const q = searchQuery.value.toLowerCase()
  return portals.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
})
</script>

<template>
  <div class="min-h-[calc(100vh-56px)] bg-white p-6">
    <div class="mx-auto max-w-4xl">
      <h1 class="text-2xl font-semibold leading-8 text-[#111]">系统入口</h1>
      <p class="mt-1 text-[13px] text-[#999]">选择要进入的企业系统</p>

      <div class="relative mt-5">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999]" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索系统入口"
          class="w-full rounded-2xl border border-[#eaeaea] bg-white py-2.5 pl-10 pr-4 text-sm text-[#333] outline-none transition focus:border-[#ccc]"
        />
      </div>

      <div class="mt-6 grid grid-cols-2 gap-4">
        <button
          v-for="p in filteredPortals"
          :key="p.name"
          type="button"
          class="flex items-center gap-3 rounded-xl border border-[#eaeaea] bg-white py-[17px] pl-4 pr-0 text-left transition hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
        >
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#f7f7f7]">
            <span class="text-lg font-bold text-[#555]">{{ p.name[0] }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="text-base font-medium leading-6 text-[#111]">{{ p.name }}</span>
              <span class="rounded px-1.5 py-0.5 text-[12px] font-medium" :class="p.tagColor">{{ p.tag }}</span>
            </div>
            <p v-if="p.description" class="mt-0.5 truncate text-xs leading-5 text-[#666]">{{ p.description }}</p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
