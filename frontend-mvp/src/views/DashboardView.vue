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
  { name: '其他费用', category: '成本控制', value: '￥1287.70万', yoy: '35.8%', yoyDir: 'up' as const, mom: '12.3%', momDir: 'up' as const },
  { name: '人工成本', category: '成本控制', value: '￥520.40万', yoy: '22.1%', yoyDir: 'up' as const, mom: '6.7%', momDir: 'up' as const },
  { name: '退货率%', category: '服务质量', value: '35.9%', yoy: '-15.3%', yoyDir: 'down' as const, mom: '-6.1%', momDir: 'down' as const },
  { name: '客单价', category: '销售规模', value: '￥289.36', yoy: '18.5%', yoyDir: 'up' as const, mom: '5.2%', momDir: 'up' as const },
]

const categoryColors: Record<string, string> = {
  '利润指标': 'bg-[#e6f4ff] text-[#0066ff]',
  '销售规模': 'bg-[#e6f4ff] text-[#0066ff]',
  '成本控制': 'bg-[#e6f4ff] text-[#0066ff]',
  '服务质量': 'bg-[#e6f4ff] text-[#0066ff]',
}

const timePeriods = ['今日', '昨日', '本月', '上月']
</script>

<template>
  <div class="flex h-[calc(100vh-56px)] bg-white">
    <!-- 左侧导航 -->
    <aside class="shrink-0 border-r border-[#eaeaea] bg-[#fafbfc] p-4" style="width: 270px">
      <button class="flex w-full items-center gap-2 text-sm font-medium text-[#111]" style="background: #edeef1; border-radius: 8px; padding: 0 12px; height: 36px; font-size: 14px; font-weight: 500;">
        <LayoutList class="h-4 w-4" />
        财务指标
      </button>
    </aside>

    <!-- 主内容区 -->
    <main class="flex-1 overflow-y-auto bg-white p-6">
      <!-- 标题 -->
      <div class="mb-4">
        <h1 style="font-size: 16px; font-weight: 500; color: #111; margin: 0;">财务指标</h1>
        <p style="font-size: 12px; color: #666; margin: 4px 0 0;">利润、成本、费用等财务核心指标</p>
      </div>

      <!-- 筛选栏 -->
      <div class="mb-6 flex flex-wrap items-center gap-3">
        <!-- 事业部下拉 -->
        <button style="background: #fff; border-radius: 8px; padding: 6px 12px; border: 1px solid #e5e5e5; height: 32px; display: flex; align-items: center; gap: 6px; font-size: 13px; color: #333;">
          全部事业部
          <ChevronDown class="h-3.5 w-3.5 text-[#999]" />
        </button>

        <!-- Tab风格时间分段控件 -->
        <div class="flex items-center" style="padding: 3px;">
          <button
            v-for="p in timePeriods"
            :key="p"
            role="tab"
            style="border-radius: 5px; padding: 0 12px; height: 28px; font-size: 14px; transition: all 0.15s;"
            :style="timePeriod === p ? { background: '#f4f4f7', color: '#111' } : { background: 'transparent', color: '#666' }"
            @click="timePeriod = p"
          >
            {{ p }}
          </button>
        </div>

        <!-- 日期选择器 -->
        <button style="background: #fff; border-radius: 8px; padding: 6px 12px; border: 1px solid #e5e5e5; height: 32px; display: flex; align-items: center; gap: 6px; font-size: 13px; color: #333;">
          <Calendar class="h-3.5 w-3.5 text-[#999]" />
          2026-08-26
        </button>

        <!-- 隐私模式Switch -->
        <div class="flex items-center gap-2">
          <span style="font-size: 14px; color: #111;">隐私模式</span>
          <button
            type="button"
            role="switch"
            :aria-checked="privacyMode"
            style="position: relative; height: 20px; width: 40px; border-radius: 16px; transition: background 0.2s;"
            :style="{ background: privacyMode ? '#111' : '#d6d6d6' }"
            @click="privacyMode = !privacyMode"
          >
            <i
              class="absolute top-0.5 rounded-full bg-white transition-all"
              style="width: 16px; height: 16px;"
              :style="{ left: privacyMode ? '21px' : '2px' }"
            />
          </button>
        </div>

        <!-- 指标配置按钮 -->
        <button style="background: #fff; border-radius: 8px; padding: 6px 16px; border: 1px solid #e5e5e5; height: 32px; display: flex; align-items: center; gap: 6px; font-size: 13px; color: #333;">
          <LayoutList class="h-3.5 w-3.5" />
          指标配置
        </button>
      </div>

      <!-- 指标卡片网格 -->
      <div class="grid grid-cols-2" style="gap: 16px;">
        <div
          v-for="m in metrics"
          :key="m.name"
          style="border-radius: 12px; box-shadow: rgb(234,234,234) 0px 0px 0px 1px inset; padding: 4px 0 0; transition: box-shadow 0.15s;"
        >
          <div class="flex items-center gap-2 px-3 pt-2">
            <span style="font-size: 12px; font-weight: 600; color: #666;">{{ m.name }}</span>
            <span
              class="rounded px-1 py-0"
              style="font-size: 10px; font-weight: 500; color: #0066ff; background: #e6f4ff;"
            >
              {{ m.category }}
            </span>
            <HelpCircle class="ml-auto h-3.5 w-3.5 text-[#ccc]" />
          </div>

          <div class="px-3" style="margin-top: 6px; font-size: 18px; font-weight: 700; line-height: 26px; color: #111;">
            {{ privacyMode ? '***' : m.value }}
          </div>

          <div class="flex items-center gap-4 px-3 pb-3" style="margin-top: 8px; border-top: 1px dashed #eaeaea; padding-top: 8px; font-size: 12px;">
            <span class="flex items-center gap-1">
              <span style="font-weight: 400; color: #999;">同比</span>
              <span
                style="font-weight: 500;"
                :style="{ color: m.yoyDir === 'up' ? '#ff6a6a' : '#0fbc31' }"
              >
                {{ m.yoyDir === 'up' ? '↑' : '↓' }} {{ m.yoy }}
              </span>
            </span>
            <span class="flex items-center gap-1">
              <span style="font-weight: 400; color: #999;">环比</span>
              <span
                style="font-weight: 500;"
                :style="{ color: m.momDir === 'up' ? '#ff6a6a' : '#0fbc31' }"
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
