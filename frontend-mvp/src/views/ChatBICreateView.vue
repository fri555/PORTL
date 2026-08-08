<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import {
  Cpu, Send, Sparkles, Lightbulb, TrendingUp, BarChart3, PieChart,
  Download, Save, Edit3, Trash2, Plus, ArrowLeft, Check, Loader2,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const router = useRouter()

const query = ref('')
const generating = ref(false)
const generationStep = ref(0)
const stepLabels = ['解析意图', '匹配数据源', '生成图表']
const generated = ref(false)
const editMode = ref(false)
const saved = ref(false)

type GeneratedChart = {
  id: string
  type: 'bar' | 'line' | 'pie' | 'table'
  title: string
  metric: string
  data: { label: string; value: number }[]
}

const charts = ref<GeneratedChart[]>([])

const examplePrompts = [
  '生成6月各区域运动鞋销量对比看板，包含同比环比和TOP10门店',
  '近30天各品类销售趋势分析，按日和按周聚合',
  '本月各部门AI调用量与效率提升数据概览',
  'Q2营销活动ROI对比，包含各渠道转化率和客单价',
  '仓储库存周转率与缺货预警看板',
]

function selectExample(p: string) {
  query.value = p
}

function formatNumber(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(0)
  return String(n)
}

async function generate() {
  if (!query.value.trim() || generating.value) return

  generating.value = true
  generated.value = false
  generationStep.value = 0
  charts.value = []

  // Simulate step-by-step processing
  for (let i = 0; i < stepLabels.length; i++) {
    generationStep.value = i
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 600))
  }

  // Generate mock charts based on query keywords
  const q = query.value.toLowerCase()
  if (q.includes('区域') || q.includes('门店') || q.includes('top')) {
    charts.value.push(
      { id: 'c1', type: 'bar', title: '各区域运动鞋销量对比', metric: '销量(双)', data: [
        { label: '华东', value: 28400 }, { label: '华南', value: 22100 }, { label: '华北', value: 15800 },
        { label: '西南', value: 13200 }, { label: '华中', value: 9800 },
      ]},
      { id: 'c2', type: 'table', title: 'TOP10门店销量排行', metric: '销量(双)', data: [
        { label: '上海南京东路旗舰店', value: 5200 }, { label: '北京王府井店', value: 4800 },
        { label: '广州天河城店', value: 4350 }, { label: '深圳万象城店', value: 4120 },
        { label: '成都太古里店', value: 3890 }, { label: '杭州大厦店', value: 3560 },
        { label: '南京德基广场店', value: 3320 }, { label: '武汉武广店', value: 2980 },
        { label: '重庆解放碑店', value: 2750 }, { label: '西安赛格店', value: 2510 },
      ]},
    )
  } else if (q.includes('趋势') || q.includes('按天') || q.includes('按周')) {
    charts.value.push(
      { id: 'c1', type: 'line', title: '近30天销售趋势', metric: '销售额(万元)', data: [
        { label: '6/1', value: 82 }, { label: '6/5', value: 78 }, { label: '6/10', value: 91 },
        { label: '6/15', value: 86 }, { label: '6/20', value: 95 }, { label: '6/22', value: 88 },
      ]},
      { id: 'c3', type: 'bar', title: '按周销售额汇总', metric: '销售额(万元)', data: [
        { label: 'W1', value: 420 }, { label: 'W2', value: 455 }, { label: 'W3', value: 480 },
      ]},
    )
  } else if (q.includes('部门') || q.includes('调用量') || q.includes('ai')) {
    charts.value.push(
      { id: 'c1', type: 'bar', title: '各部门AI调用量', metric: '调用次数', data: [
        { label: '营销部', value: 12400 }, { label: '电商运营', value: 9800 }, { label: '仓储部', value: 7200 },
        { label: '客服部', value: 5600 }, { label: '法务部', value: 2100 },
      ]},
      { id: 'c2', type: 'pie', title: '效率提升分布', metric: '效率提升', data: [
        { label: '营销部', value: 200 }, { label: '电商运营', value: 120 }, { label: '仓储部', value: 65 },
        { label: '客服部', value: 55 }, { label: '法务部', value: 80 },
      ]},
    )
  } else if (q.includes('roi') || q.includes('营销') || q.includes('转化率')) {
    charts.value.push(
      { id: 'c1', type: 'bar', title: 'Q2各渠道ROI对比', metric: 'ROI', data: [
        { label: '抖音', value: 3.2 }, { label: '小红书', value: 2.8 }, { label: '淘宝', value: 2.1 },
        { label: '京东', value: 1.9 }, { label: '美团', value: 2.5 },
      ]},
      { id: 'c2', type: 'line', title: '各渠道转化率趋势', metric: '转化率(%)', data: [
        { label: '5月', value: 4.2 }, { label: '6月', value: 4.8 },
      ]},
    )
  } else {
    charts.value.push(
      { id: 'c1', type: 'bar', title: '库存周转率对比', metric: '周转天数', data: [
        { label: '跑鞋', value: 28 }, { label: '篮球鞋', value: 35 }, { label: '休闲鞋', value: 22 },
      ]},
      { id: 'c2', type: 'line', title: '缺货预警趋势', metric: '预警次数', data: [
        { label: 'W1', value: 5 }, { label: 'W2', value: 3 }, { label: 'W3', value: 2 },
      ]},
    )
  }

  generationStep.value = stepLabels.length
  generated.value = true
  generating.value = false
}

function toggleChartType(chart: GeneratedChart) {
  const types: GeneratedChart['type'][] = ['bar', 'line', 'pie', 'table']
  const idx = types.indexOf(chart.type)
  chart.type = types[(idx + 1) % types.length]
}

function removeChart(id: string) {
  charts.value = charts.value.filter((c) => c.id !== id)
}

function addChart() {
  const id = `c${charts.value.length + 1}`
  charts.value.push({
    id, type: 'bar', title: '新图表', metric: '数值', data: [
      { label: 'A', value: 100 }, { label: 'B', value: 200 },
    ],
  })
}

function saveToDashboard() {
  saved.value = true
  setTimeout(() => {
    router.push({ name: 'dashboards' })
  }, 1500)
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-6 py-6">
    <!-- Back link -->
    <button
      class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
      @click="router.push({ name: 'dashboards' })"
    >
      <ArrowLeft class="h-4 w-4" /> 返回看板
    </button>

    <div class="mb-6">
      <h1 class="text-2xl font-bold">
        <Cpu class="mr-2 inline h-6 w-6 text-primary align-middle" />
        AI生成看板
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">用自然语言描述你的数据需求，AI自动分析并生成可视化看板</p>
    </div>

    <!-- Input Area -->
    <div class="rounded-xl border bg-white p-5 shadow-sm">
      <label class="mb-2 block text-sm font-medium">描述你的数据需求</label>
      <textarea
        v-model="query"
        :disabled="generating"
        class="min-h-[100px] w-full resize-none rounded-lg border bg-white px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-zinc-50"
        placeholder="例如：生成6月各区域运动鞋销量对比看板，包含同比环比和TOP10门店"
        @keydown.meta.enter="generate"
        @keydown.ctrl.enter="generate"
      />
      <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Button :disabled="!query.trim() || generating" class="gap-1.5" @click="generate">
          <Sparkles v-if="!generating" class="h-4 w-4" />
          <Loader2 v-else class="h-4 w-4 animate-spin" />
          {{ generating ? '生成中...' : '生成看板' }}
        </Button>
        <span class="text-xs text-muted-foreground">快捷键: ⌘/Ctrl + Enter</span>
      </div>

      <!-- Example prompts -->
      <div class="mt-4 border-t pt-4">
        <p class="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Lightbulb class="h-3.5 w-3.5 text-amber-500" /> 试试这些示例
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="p in examplePrompts"
            :key="p"
            :disabled="generating"
            class="rounded-full border bg-zinc-50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            @click="selectExample(p)"
          >
            {{ p }}
          </button>
        </div>
      </div>
    </div>

    <!-- Generation Steps -->
    <div v-if="generating" class="mt-6 rounded-xl border bg-white p-6 shadow-sm">
      <h3 class="mb-4 text-sm font-semibold">AI正在生成看板...</h3>
      <div class="space-y-4">
        <div
          v-for="(label, idx) in stepLabels"
          :key="label"
          :class="[
            'flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-500',
            idx < generationStep
              ? 'border-emerald-200 bg-emerald-50/50'
              : idx === generationStep
                ? 'border-primary/30 bg-primary/5'
                : 'border-transparent bg-zinc-50',
          ]"
        >
          <div
            :class="[
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm',
              idx < generationStep
                ? 'bg-emerald-500 text-white'
                : idx === generationStep
                  ? 'bg-primary text-primary-foreground animate-pulse'
                  : 'bg-zinc-100 text-muted-foreground',
            ]"
          >
            <Check v-if="idx < generationStep" class="h-4 w-4" />
            <Loader2 v-else-if="idx === generationStep" class="h-4 w-4 animate-spin" />
            <span v-else>{{ idx + 1 }}</span>
          </div>
          <div>
            <p :class="['text-sm font-medium', idx <= generationStep ? 'text-foreground' : 'text-muted-foreground']">
              {{ label }}
            </p>
            <p v-if="idx <= generationStep" class="text-xs text-muted-foreground">
              {{ idx === 0 ? '分析查询意图与维度...' : idx === 1 ? '匹配对应数据集...' : '自动选择最佳可视化方案...' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Generated Dashboard Preview -->
    <div v-if="generated && charts.length > 0" class="mt-6 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-lg font-bold">生成的看板</h3>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" class="gap-1.5" @click="editMode = !editMode">
            <Edit3 class="h-3.5 w-3.5" /> {{ editMode ? '完成编辑' : '编辑' }}
          </Button>
          <Button variant="outline" size="sm" class="gap-1.5" @click="addChart">
            <Plus class="h-3.5 w-3.5" /> 添加图表
          </Button>
          <Button variant="outline" size="sm" class="gap-1.5">
            <Download class="h-3.5 w-3.5" /> 导出
          </Button>
          <Button class="gap-1.5" @click="saveToDashboard">
            <Save class="h-3.5 w-3.5" /> {{ saved ? '已保存!' : '保存到我的看板' }}
          </Button>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div
          v-for="chart in charts"
          :key="chart.id"
          :class="[
            'relative rounded-xl border bg-white p-5 shadow-sm transition-shadow',
            editMode ? 'ring-1 ring-primary/50' : 'hover:shadow-md',
          ]"
        >
          <!-- Edit controls -->
          <div v-if="editMode" class="absolute right-3 top-3 flex items-center gap-1">
            <button
              class="rounded-md border p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="切换图表类型"
              @click="toggleChartType(chart)"
            >
              <BarChart3 v-if="chart.type === 'bar'" class="h-3.5 w-3.5" />
              <TrendingUp v-else-if="chart.type === 'line'" class="h-3.5 w-3.5" />
              <PieChart v-else-if="chart.type === 'pie'" class="h-3.5 w-3.5" />
              <span v-else class="text-[10px] font-bold">T</span>
            </button>
            <button
              class="rounded-md border p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
              title="删除图表"
              @click="removeChart(chart.id)"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>

          <div class="mb-1 flex items-center gap-2">
            <Badge variant="outline" class="text-[10px]">
              {{ chart.type === 'bar' ? '柱状图' : chart.type === 'line' ? '折线图' : chart.type === 'pie' ? '饼图' : '表格' }}
            </Badge>
          </div>
          <h4 class="mb-1 text-sm font-semibold">{{ chart.title }}</h4>
          <p class="mb-3 text-[11px] text-muted-foreground">单位: {{ chart.metric }}</p>

          <!-- Bar chart -->
          <template v-if="chart.type === 'bar'">
            <div class="flex items-end gap-2" style="height: 120px;">
              <div v-for="bar in chart.data" :key="bar.label" class="flex flex-1 flex-col items-center gap-1">
                <span class="text-[10px] text-muted-foreground">{{ formatNumber(bar.value) }}</span>
                <div
                  class="w-full rounded-t-md bg-gradient-to-t from-primary to-orange-400"
                  :style="{ height: `${(bar.value / Math.max(...chart.data.map(d => d.value))) * 90}px` }"
                />
                <span class="text-[10px] text-muted-foreground truncate max-w-full">{{ bar.label }}</span>
              </div>
            </div>
          </template>

          <!-- Line chart -->
          <template v-else-if="chart.type === 'line'">
            <svg viewBox="0 0 300 120" class="h-[120px] w-full" preserveAspectRatio="none">
              <polyline
                :points="chart.data.map((p, i) => `${(i / Math.max(chart.data.length - 1, 1)) * 300},${120 - (p.value / Math.max(...chart.data.map(d => d.value))) * 110}`).join(' ')"
                fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round"
              />
              <template v-for="(point, idx) in chart.data" :key="point.label">
                <circle
                  :cx="(idx / Math.max(chart.data.length - 1, 1)) * 300"
                  :cy="120 - (point.value / Math.max(...chart.data.map(d => d.value))) * 110"
                  r="3.5" fill="white" stroke="#f97316" stroke-width="2"
                />
              </template>
            </svg>
            <div class="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span v-for="p in chart.data" :key="p.label">{{ p.label }}</span>
            </div>
          </template>

          <!-- Pie chart -->
          <template v-else-if="chart.type === 'pie'">
            <div class="flex items-center gap-4">
              <div class="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 64 64" class="h-full w-full -rotate-90">
                  <circle cx="32" cy="32" r="24" fill="none" stroke="#f4f4f5" stroke-width="12" />
                </svg>
              </div>
              <div class="space-y-1 text-xs">
                <div v-for="seg in chart.data" :key="seg.label" class="flex items-center gap-2">
                  <span class="h-2 w-2 rounded-full bg-primary" />
                  <span class="text-muted-foreground">{{ seg.label }}</span>
                  <span class="font-medium">{{ seg.value }}</span>
                </div>
              </div>
            </div>
          </template>

          <!-- Table -->
          <template v-else>
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b text-left text-muted-foreground">
                  <th class="py-1.5 font-medium">名称</th>
                  <th class="py-1.5 text-right font-medium">数值</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in chart.data" :key="row.label" class="border-b last:border-0">
                  <td class="py-1.5">{{ row.label }}</td>
                  <td class="py-1.5 text-right font-medium">{{ formatNumber(row.value) }}</td>
                </tr>
              </tbody>
            </table>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
