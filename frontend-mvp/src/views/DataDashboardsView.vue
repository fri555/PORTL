<script setup lang="ts">
import { ref } from 'vue'
import { Calendar, ChevronDown, HelpCircle, LayoutList } from 'lucide-vue-next'

const timePeriod = ref('本月')
const privacyMode = ref(false)

const metrics = [
  { name: '利润额', category: '利润指标', value: '-￥398.22万', yoy: '139.2%', yoyDir: 'up' as const, mom: '-29.0%', momDir: 'down' as const },
  { name: '利润率%', category: '利润指标', value: '-2.3%', yoy: '46.2%', yoyDir: 'up' as const, mom: '-37.0%', momDir: 'down' as const },
  { name: '销售额', category: '销售规模', value: '￥17446.03万', yoy: '63.8%', yoyDir: 'up' as const, mom: '12.7%', momDir: 'up' as const },
  { name: '当月目标', category: '销售规模', value: '￥26621.40万', yoy: '31.8%', yoyDir: 'up' as const, mom: '-15.7%', momDir: 'down' as const },
  { name: '完成率%', category: '销售规模', value: '65.5%', yoy: '24.3%', yoyDir: 'up' as const, mom: '33.7%', momDir: 'up' as const },
  { name: '毛利额', category: '利润指标', value: '￥3262.26万', yoy: '70.3%', yoyDir: 'up' as const, mom: '9.0%', momDir: 'up' as const },
  { name: '毛利率%', category: '利润指标', value: '18.7%', yoy: '4.0%', yoyDir: 'up' as const, mom: '-3.3%', momDir: 'down' as const },
  { name: '费用额', category: '成本控制', value: '￥3657.65万', yoy: '75.5%', yoyDir: 'up' as const, mom: '3.0%', momDir: 'up' as const },
  { name: '费用率%', category: '成本控制', value: '21.0%', yoy: '7.2%', yoyDir: 'up' as const, mom: '-8.6%', momDir: 'down' as const },
  { name: '平台费用', category: '成本控制', value: '￥1313.86万', yoy: '42.2%', yoyDir: 'up' as const, mom: '18.5%', momDir: 'up' as const },
  { name: '营销费用', category: '成本控制', value: '￥509.58万', yoy: '28.6%', yoyDir: 'up' as const, mom: '-4.2%', momDir: 'down' as const },
  { name: '退货率%', category: '服务质量', value: '35.9%', yoy: '-15.3%', yoyDir: 'down' as const, mom: '-6.1%', momDir: 'down' as const },
  { name: '客单价', category: '销售规模', value: '￥289.36', yoy: '18.5%', yoyDir: 'up' as const, mom: '5.2%', momDir: 'up' as const },
  { name: '其他费用', category: '成本控制', value: '￥1287.70万', yoy: '35.8%', yoyDir: 'up' as const, mom: '12.3%', momDir: 'up' as const },
  { name: '人工成本', category: '成本控制', value: '￥520.40万', yoy: '22.1%', yoyDir: 'up' as const, mom: '6.7%', momDir: 'up' as const },
]

const categoryColors: Record<string, string> = {
  '利润指标': 'bg-[#e6f4ff] text-[#1d77ff]',
  '销售规模': 'bg-[#e6f4ff] text-[#1d77ff]',
  '成本控制': 'bg-[#e6f4ff] text-[#1d77ff]',
  '服务质量': 'bg-[#e6f4ff] text-[#1d77ff]',
}

const timePeriods = ['今日', '昨日', '本月', '上月']
</script>

<template>
  <div class="flex h-[calc(100vh-56px)] bg-white">
    <!-- 左侧导航 -->
    <aside class="w-[270px] shrink-0 border-r border-[#eaeaea] bg-white p-4">
      <button class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-[#111]">
        <LayoutList class="h-4 w-4" />
        财务指标
      </button>
    </aside>

    <!-- 主内容区 -->
    <main class="flex-1 overflow-y-auto p-6">
      <!-- 标题 -->
      <div class="mb-4">
        <h1 class="text-lg font-semibold text-[#111]">财务指标</h1>
        <p class="mt-1 text-sm text-[#888]">利润、成本、费用等财务核心指标</p>
      </div>

      <!-- 筛选栏 -->
      <div class="mb-6 flex flex-wrap items-center gap-3">
        <button class="flex h-8 items-center gap-1.5 rounded-lg border border-[#dfe2e6] bg-white px-3 text-[12.25px] text-[#333]">
          全部事业部
          <ChevronDown class="h-3.5 w-3.5 text-[#999]" />
        </button>

        <!-- Tab风格时间筛选器 -->
        <div class="flex items-center rounded-lg bg-white p-[3px]">
          <button
            v-for="p in timePeriods"
            :key="p"
            role="tab"
            class="h-6 rounded-[5px] px-3 text-sm transition"
            :class="timePeriod === p ? 'bg-[#f4f4f7] text-[#111]' : 'text-[#666]'"
            @click="timePeriod = p"
          >
            {{ p }}
          </button>
        </div>

        <!-- 日期选择器 -->
        <button class="flex h-8 items-center gap-1.5 rounded-[7px] border border-[#e5e5e5] bg-white px-3.5 text-[12.25px] text-[#333]">
          <Calendar class="h-3.5 w-3.5 text-[#999]" />
          2026-08-26
        </button>

        <!-- 隐私模式Switch -->
        <div class="flex items-center gap-2">
          <span class="text-sm text-[#666]">隐私模式</span>
          <button
            type="button"
            role="switch"
            :aria-checked="privacyMode"
            class="relative h-4 w-7 rounded-full transition"
            :class="privacyMode ? 'bg-[#1d77ff]' : 'bg-[#e5e5e5]'"
            @click="privacyMode = !privacyMode"
          >
            <i class="absolute top-0.5 h-3 w-3 rounded-full bg-white transition" :class="privacyMode ? 'left-[15px]' : 'left-0.5'" />
          </button>
        </div>

        <button class="flex h-8 items-center gap-1.5 rounded-lg border border-[#d3d3d3] bg-white px-4 text-sm text-[#555]">
          <LayoutList class="h-3.5 w-3.5" />
          指标配置
        </button>
      </div>

      <!-- 指标卡片网格 -->
      <div class="grid grid-cols-2 gap-4">
        <div
          v-for="m in metrics"
          :key="m.name"
          class="rounded-xl bg-white p-3 transition hover:shadow-sm shadow-[#eaeaea_0_0_0_1px_inset]"
        >
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-[#666]">{{ m.name }}</span>
            <span
              class="rounded px-1 py-0 text-[10px] font-medium"
              :class="categoryColors[m.category] || 'bg-gray-100 text-gray-500'"
            >
              {{ m.category }}
            </span>
            <HelpCircle class="ml-auto h-3.5 w-3.5 text-[#ccc]" />
          </div>

          <div class="mt-2 text-[18px] font-bold leading-[26px] text-[#111]">
            {{ privacyMode ? '***' : m.value }}
          </div>

          <div class="mt-2 flex items-center gap-4 border-t border-dashed border-[#eaeaea] pt-2 text-xs">
            <span class="flex items-center gap-1">
              <span class="text-[#888]">同比</span>
              <span
                class="font-medium"
                :class="m.yoyDir === 'up' ? 'text-[#ff3c3c]' : 'text-[#0fbc31]'"
              >
                {{ m.yoyDir === 'up' ? '↑' : '↓' }} {{ m.yoy }}
              </span>
            </span>
            <span class="flex items-center gap-1">
              <span class="text-[#888]">环比</span>
              <span
                class="font-medium"
                :class="m.momDir === 'up' ? 'text-[#ff3c3c]' : 'text-[#0fbc31]'"
              >
                {{ m.momDir === 'up' ? '↑' : '↓' }} {{ m.mom }}
              </span>
            </span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
