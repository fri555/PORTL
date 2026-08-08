<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  GraduationCap, BookOpen, Library, PlayCircle, Clock, Users, Search,
  Filter, Star, CheckCircle, Bookmark, Award, TrendingUp, ChevronRight,
  FileText, Wrench, HelpCircle, MessageCircle, ExternalLink, Sparkles,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { coverFor } from '@/lib/placeholder'

// ---- Types ----
interface Course {
  id: string
  title: string
  cover: string
  difficulty: '入门' | '进阶' | '岗位专题'
  source: string
  sourceType: '钉钉云课堂' | 'B站' | 'CSDN' | 'YouTube'
  duration: string
  enrolled: number
  rating: number
  progress?: number
  completed?: boolean
  bookmarked?: boolean
  description: string
}

interface PromptTemplate {
  id: string
  title: string
  category: string
  content: string
}

// ---- Mock courses ----
const courses: Course[] = [
  { id: 'co1', title: 'Prompt工程进阶：写出会卖货的文案', cover: coverFor('Prompt进阶', 'tech'), difficulty: '进阶', source: '内部讲师·李四', sourceType: '钉钉云课堂', duration: '45分钟', enrolled: 1240, rating: 4.8, description: '从角色设定到卖点提炼，系统学习Prompt工程的实践心法。', bookmarked: true, progress: 100, completed: true },
  { id: 'co2', title: 'AI数据分析入门：从取数到洞察', cover: coverFor('AI数据分析', 'tech'), difficulty: '入门', source: '内部讲师·王五', sourceType: '钉钉云课堂', duration: '30分钟', enrolled: 860, rating: 4.6, description: '用AI对话完成数据分析全流程，零代码做出专业图表。', progress: 60 },
  { id: 'co3', title: 'AI绘画实战：商品图批量生成', cover: coverFor('AI绘画', 'tech'), difficulty: '岗位专题', source: '设计部·小刘', sourceType: '钉钉云课堂', duration: '60分钟', enrolled: 950, rating: 4.9, description: '从SD基础到ControlNet商品图，替代传统商拍的全流程。', bookmarked: true, progress: 100, completed: true },
  { id: 'co4', title: 'GPT-5企业级应用实战指南', cover: coverFor('GPT-5实战', 'industry'), difficulty: '进阶', source: '技术社区', sourceType: 'B站', duration: '90分钟', enrolled: 3200, rating: 4.7, description: 'GPT-5在多步任务、Agent框架、工具调用方面的企业级实战。' },
  { id: 'co5', title: 'DeepSeek V3开源模型部署与微调', cover: coverFor('DeepSeek V3', 'industry'), difficulty: '岗位专题', source: '技术社区', sourceType: 'CSDN', duration: '120分钟', enrolled: 1850, rating: 4.5, description: '从环境搭建到模型微调，企业私有化部署的一站式教程。' },
  { id: 'co6', title: 'AI智能补货与库存优化', cover: coverFor('库存优化', 'tech'), difficulty: '进阶', source: '仓储部·赵六', sourceType: '钉钉云课堂', duration: '40分钟', enrolled: 680, rating: 4.4, description: '基于销量预测的智能补货策略，库存周转率提升实操。', progress: 30 },
  { id: 'co7', title: 'Claude 4 Agent框架开发入门', cover: coverFor('Claude Agent', 'industry'), difficulty: '进阶', source: '技术社区', sourceType: 'YouTube', duration: '75分钟', enrolled: 2100, rating: 4.8, description: 'Anthropic官方Agent SDK教程，构建多步任务智能体。' },
  { id: 'co8', title: 'AI客服对话质检方法论', cover: coverFor('客服质检', 'internal'), difficulty: '入门', source: '客服部·钱七', sourceType: '钉钉云课堂', duration: '25分钟', enrolled: 520, rating: 4.2, description: '客户情绪识别、风险预警与服务质量评估的标准流程。' },
]

const promptTemplates: PromptTemplate[] = [
  { id: 'pt1', title: '商品文案生成', category: '营销', content: '你是一位资深电商文案，擅长{品类}。请为以下商品生成3条种草文案，突出其核心卖点：{卖点列表}。要求每条≤50字，带emoji。' },
  { id: 'pt2', title: '竞品分析报告', category: '分析', content: '请分析竞品{竞品名称}在{维度}上的表现，对比我方数据，输出结构化分析报告。需包含：①核心指标对比 ②优劣势分析 ③我方改善建议。' },
  { id: 'pt3', title: '周报自动生成', category: '办公', content: '基于以下本周工作要点，生成一份简洁的周报：{工作要点}。格式：①本周完成 ②关键数据 ③下周计划 ④需要支持。' },
  { id: 'pt4', title: '客服回复模板', category: '客服', content: '你是一位专业的客服专员。针对以下客户问题，生成3个不同风格的回复模板（温和/专业/简洁）：{客户问题}。' },
  { id: 'pt5', title: '数据分析结论提炼', category: '分析', content: '根据以下数据，提炼3-5条关键洞察，每条需包含：数据事实+业务解读+行动建议。数据：{数据描述}。' },
]

const toolManuals = [
  { id: 'tm1', title: 'AI对话助手2.0 用户手册', category: '产品手册', pages: 42 },
  { id: 'tm2', title: '竞品价格比对 Skill 使用指南', category: 'Skill说明', pages: 18 },
  { id: 'tm3', title: '智能排班优化 快速上手', category: 'Skill说明', pages: 12 },
  { id: 'tm4', title: '库存预警分析 配置指南', category: 'Skill说明', pages: 20 },
]

const caseStudies = [
  { id: 'cs1', title: '营销部：AI文案月产360件，人效提升200%', department: '营销部', metric: '效率+200%' },
  { id: 'cs2', title: '法务部：AI合同审查效率提升5倍', department: '法务部', metric: '效率+5倍' },
  { id: 'cs3', title: '仓储部：AI库存优化降本80万/年', department: '仓储部', metric: '降本80万' },
]

const faqs = [
  { q: 'AI对话助手能做什么？', a: '可进行数据分析、文本生成、竞品分析、报表解读等多种智能任务，支持多Agent协作。' },
  { q: '如何获得更多Token额度？', a: '通过提交需求、参与投稿、完成课程学习、积分兑换等方式获取额外Token。' },
  { q: '哪些数据不能输入AI？', a: '禁止输入客户个人信息、财务机密、未脱敏的商业数据。详见《AI使用合规规范》。' },
  { q: '模型调用的费用如何分摊？', a: '按部门实际调用量进行月度核算，各部门有独立预算额度。' },
]

// ---- State ----
const mainTab = ref<'courses' | 'resources' | 'my-learning'>('courses')
const difficultyFilter = ref<string>('')
const sourceFilter = ref<string>('')
const searchQuery = ref('')

const filteredCourses = computed(() => {
  let list = courses
  if (difficultyFilter.value) list = list.filter((c) => c.difficulty === difficultyFilter.value)
  if (sourceFilter.value) list = list.filter((c) => c.sourceType === sourceFilter.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
  }
  return list
})

const inProgressCourses = computed(() => courses.filter((c) => c.progress && c.progress > 0 && !c.completed))
const completedCourses = computed(() => courses.filter((c) => c.completed))

// AI review cards (NotebookLM style)
const reviewCards = ref<{ id: string; title: string; concept: string; detail: string; example: string; flipped: boolean }[]>([])
const generatingCards = ref(false)
const selectedCourseForReview = ref<string>('')

function generateReviewCards(courseId: string) {
  selectedCourseForReview.value = courseId
  generatingCards.value = true
  setTimeout(() => {
    const c = courses.find(x => x.id === courseId)
    if (!c) return
    reviewCards.value = [
      { id: 'r1', title: '核心概念', concept: 'Prompt工程三段式', detail: '角色设定 → 卖点提炼 → 平台语感适配，三步让AI输出质量提升3倍以上', example: '设定"你是资深文案"角色后，AI会自动匹配专业词汇和行业语气', flipped: false },
      { id: 'r2', title: '关键技巧', concept: '多平台文案适配', detail: '同一产品在不同平台需要不同风格：小红书偏种草、抖音追求吸睛、美团侧重转化', example: '小红书："姐妹们！这双鞋也太好穿了吧✨" vs 美团："限时优惠 运动鞋低至5折"', flipped: false },
      { id: 'r3', title: '实战方法', concept: '卖点提炼金字塔', detail: '从功能层（材质/科技）到情感层（自信/认同）逐级提炼，找到最能打动目标人群的卖点', example: 'Air Max：功能层→气垫减震；情感层→"每一步都轻盈如飞"', flipped: false },
      { id: 'r4', title: '避坑指南', concept: 'AI文案常见陷阱', detail: '避免堆砌形容词、忽略平台违禁词、缺乏CTA（行动号召），每篇文案必须有明确的转化目标', example: '错误："非常好穿的鞋子" 正确："透气网面+缓震科技，试试这双通勤神器→"', flipped: false },
    ]
    generatingCards.value = false
  }, 1500)
}
function flipCard(id: string) {
  const card = reviewCards.value.find(r => r.id === id)
  if (card) card.flipped = !card.flipped
}
function clearCards() { reviewCards.value = [] }

const bookmarkedCourses = computed(() => courses.filter((c) => c.bookmarked))

const copyTemplate = ref<string | null>(null)
function copyPrompt(t: PromptTemplate) {
  navigator.clipboard?.writeText(t.content).catch(() => {})
  copyTemplate.value = t.id
  setTimeout(() => (copyTemplate.value = null), 2000)
}

const sourceTypeMeta: Record<string, { label: string; color: string }> = {
  '钉钉云课堂': { label: '钉钉云课堂', color: 'bg-blue-100 text-blue-700' },
  'B站': { label: 'B站', color: 'bg-pink-100 text-pink-700' },
  'CSDN': { label: 'CSDN', color: 'bg-orange-100 text-orange-700' },
  'YouTube': { label: 'YouTube', color: 'bg-red-100 text-red-700' },
}

const difficultyColors: Record<string, string> = {
  '入门': 'bg-emerald-100 text-emerald-700',
  '进阶': 'bg-amber-100 text-amber-700',
  '岗位专题': 'bg-purple-100 text-purple-700',
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold">
        <GraduationCap class="mr-2 inline h-6 w-6 text-primary align-middle" />
        AI培训中心
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">全员AI进化，从学习开始</p>
    </div>

    <!-- Main Tabs -->
    <Tabs :model-value="mainTab" @update:model-value="mainTab = $event as any">
      <TabsList class="mb-6">
        <TabsTrigger value="courses"><Library class="mr-1.5 h-4 w-4" /> 全部课程</TabsTrigger>
        <TabsTrigger value="resources"><BookOpen class="mr-1.5 h-4 w-4" /> 学习资源库</TabsTrigger>
        <TabsTrigger value="my-learning"><GraduationCap class="mr-1.5 h-4 w-4" /> 我的学习</TabsTrigger>
      </TabsList>

      <!-- ======== 全部课程 ======== -->
      <TabsContent value="courses">
        <!-- Filters -->
        <div class="mb-5 flex flex-wrap items-center gap-3">
          <div class="flex flex-wrap items-center gap-1.5 rounded-lg border bg-zinc-50 p-1">
            <button
              :class="[
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                !difficultyFilter ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              ]"
              @click="difficultyFilter = ''"
            >全部</button>
            <button
              v-for="d in (['入门','进阶','岗位专题'] as const)"
              :key="d"
              :class="[
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                difficultyFilter === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              ]"
              @click="difficultyFilter = d"
            >{{ d }}</button>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 rounded-lg border bg-zinc-50 p-1">
            <button
              :class="[
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                !sourceFilter ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              ]"
              @click="sourceFilter = ''"
            >全部来源</button>
            <button
              v-for="s in (['钉钉云课堂','B站','CSDN','YouTube'] as const)"
              :key="s"
              :class="[
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                sourceFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              ]"
              @click="sourceFilter = s"
            >{{ s }}</button>
          </div>
          <div class="relative min-w-[200px] lg:ml-auto">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input v-model="searchQuery" placeholder="搜索课程..." class="pl-9" />
          </div>
        </div>

        <p class="mb-4 text-sm text-muted-foreground">共 {{ filteredCourses.length }} 门课程</p>

        <!-- Course Grid -->
        <div v-if="filteredCourses.length === 0" class="py-16 text-center">
          <Filter class="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p class="mt-3 text-sm text-muted-foreground">暂无符合条件的课程</p>
        </div>
        <div v-else class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div
            v-for="course in filteredCourses"
            :key="course.id"
            class="group overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <!-- Cover image placeholder -->
            <div class="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200">
              <img :src="course.cover" :alt="course.title" class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <span
                :class="['absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium', sourceTypeMeta[course.sourceType]?.color ?? 'bg-zinc-100 text-zinc-700']"
              >
                {{ course.sourceType }}
              </span>
              <!-- External video cache indicator -->
              <span v-if="course.sourceType !== '钉钉云课堂'" class="absolute right-2 top-2 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-medium text-white" title="外部视频已自动抓取缓存至集团服务器">
                已缓存
              </span>
              <div class="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                <Button size="sm" class="gap-1.5 shadow-lg">
                  <PlayCircle class="h-4 w-4" /> 开始学习
                </Button>
              </div>
            </div>
            <div class="p-4">
              <div class="mb-2 flex items-center gap-1.5">
                <span :class="['rounded px-1.5 py-0.5 text-[10px] font-medium', difficultyColors[course.difficulty]]">
                  {{ course.difficulty }}
                </span>
                <span class="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Star class="h-3 w-3 fill-amber-400 text-amber-400" /> {{ course.rating }}
                </span>
              </div>
              <h3 class="mb-1 text-sm font-semibold leading-tight line-clamp-2">{{ course.title }}</h3>
              <p class="mb-3 text-xs text-muted-foreground">{{ course.source }}</p>
              <div class="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span class="flex items-center gap-1"><Clock class="h-3 w-3" /> {{ course.duration }}</span>
                <span class="flex items-center gap-1"><Users class="h-3 w-3" /> {{ course.enrolled >= 1000 ? `${(course.enrolled / 1000).toFixed(1)}k` : course.enrolled }}</span>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <!-- ======== 学习资源库 ======== -->
      <TabsContent value="resources">
        <div class="grid gap-6 lg:grid-cols-2">
          <!-- Prompt模板 -->
          <div class="rounded-xl border bg-white p-5 shadow-sm">
            <h3 class="mb-4 flex items-center gap-2 text-sm font-semibold">
              <FileText class="h-4 w-4 text-primary" /> Prompt模板库
            </h3>
            <div class="space-y-3">
              <div v-for="t in promptTemplates" :key="t.id" class="rounded-lg border bg-zinc-50/50 p-3">
                <div class="mb-1 flex items-center justify-between">
                  <span class="text-sm font-medium">{{ t.title }}</span>
                  <Badge variant="secondary" class="text-[10px]">{{ t.category }}</Badge>
                </div>
                <p class="mb-2 text-xs text-muted-foreground line-clamp-2">{{ t.content }}</p>
                <Button variant="outline" size="sm" class="h-7 text-[11px] gap-1" @click="copyPrompt(t)">
                  <Check v-if="copyTemplate === t.id" class="h-3 w-3" />
                  复制模板
                </Button>
              </div>
            </div>
          </div>

          <!-- 工具手册 -->
          <div class="rounded-xl border bg-white p-5 shadow-sm">
            <h3 class="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Wrench class="h-4 w-4 text-amber-500" /> 工具手册
            </h3>
            <div class="space-y-3">
              <div v-for="m in toolManuals" :key="m.id" class="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen class="h-5 w-5 text-primary" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium truncate">{{ m.title }}</p>
                  <p class="text-xs text-muted-foreground">{{ m.category }} · {{ m.pages }}页</p>
                </div>
                <Button variant="ghost" size="sm" class="h-7 shrink-0 gap-1 text-[11px]">
                  查看 <ExternalLink class="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          <!-- 内部案例 -->
          <div class="rounded-xl border bg-white p-5 shadow-sm">
            <h3 class="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Award class="h-4 w-4 text-purple-500" /> 内部案例精选
            </h3>
            <div class="space-y-3">
              <div v-for="cs in caseStudies" :key="cs.id" class="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                  <TrendingUp class="h-5 w-5 text-emerald-500" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium truncate">{{ cs.title }}</p>
                  <p class="text-xs text-muted-foreground">{{ cs.department }} · {{ cs.metric }}</p>
                </div>
                <ChevronRight class="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <!-- FAQ -->
          <div class="rounded-xl border bg-white p-5 shadow-sm">
            <h3 class="mb-4 flex items-center gap-2 text-sm font-semibold">
              <HelpCircle class="h-4 w-4 text-blue-500" /> 常见问题
            </h3>
            <div class="space-y-3">
              <details v-for="faq in faqs" :key="faq.q" class="rounded-lg border p-3">
                <summary class="cursor-pointer text-sm font-medium list-none">{{ faq.q }}</summary>
                <p class="mt-2 text-xs text-muted-foreground leading-relaxed">{{ faq.a }}</p>
              </details>
            </div>
          </div>
        </div>
      </TabsContent>

      <!-- ======== 我的学习 ======== -->
      <TabsContent value="my-learning">
        <!-- Stats -->
        <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-xl border bg-white p-4 shadow-sm">
            <Clock class="mb-2 h-5 w-5 text-primary" />
            <p class="text-2xl font-bold">12.5<span class="text-sm font-normal text-muted-foreground"> 小时</span></p>
            <p class="text-xs text-muted-foreground">总学习时长</p>
          </div>
          <div class="rounded-xl border bg-white p-4 shadow-sm">
            <CheckCircle class="mb-2 h-5 w-5 text-emerald-500" />
            <p class="text-2xl font-bold">{{ completedCourses.length }}<span class="text-sm font-normal text-muted-foreground"> 门</span></p>
            <p class="text-xs text-muted-foreground">已完成课程</p>
          </div>
          <div class="rounded-xl border bg-white p-4 shadow-sm">
            <Award class="mb-2 h-5 w-5 text-amber-500" />
            <p class="text-2xl font-bold">3<span class="text-sm font-normal text-muted-foreground"> 个</span></p>
            <p class="text-xs text-muted-foreground">获得证书</p>
          </div>
          <div class="rounded-xl border bg-white p-4 shadow-sm">
            <TrendingUp class="mb-2 h-5 w-5 text-purple-500" />
            <p class="text-2xl font-bold">85<span class="text-sm font-normal text-muted-foreground"> 分</span></p>
            <p class="text-xs text-muted-foreground">总积分</p>
          </div>
        </div>

        <!-- In Progress -->
        <div v-if="inProgressCourses.length" class="mb-6">
          <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
            <PlayCircle class="h-4 w-4 text-blue-500" /> 学习中
          </h3>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="c in inProgressCourses" :key="c.id" class="rounded-xl border bg-white p-4 shadow-sm">
              <h4 class="mb-2 text-sm font-semibold line-clamp-1">{{ c.title }}</h4>
              <div class="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>学习进度</span>
                <span>{{ c.progress }}%</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-zinc-100">
                <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${c.progress}%` }" />
              </div>
              <Button size="sm" class="mt-3 w-full gap-1.5">
                <PlayCircle class="h-3.5 w-3.5" /> 继续学习
              </Button>
            </div>
          </div>
        </div>

        <!-- Completed -->
        <div v-if="completedCourses.length" class="mb-6">
          <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
            <CheckCircle class="h-4 w-4 text-emerald-500" /> 已完成
          </h3>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="c in completedCourses" :key="c.id" class="flex items-center gap-3 rounded-xl border bg-emerald-50/50 p-4">
              <CheckCircle class="h-5 w-5 shrink-0 text-emerald-500" />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium truncate">{{ c.title }}</p>
                <p class="text-xs text-muted-foreground">{{ c.duration }} · {{ c.source }}</p>
              </div>
              <Badge variant="secondary" class="text-[10px]">已完成</Badge>
            </div>
          </div>
        </div>

        <!-- Bookmarked -->
        <div v-if="bookmarkedCourses.length">
          <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Bookmark class="h-4 w-4 text-amber-500" /> 已收藏
          </h3>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="c in bookmarkedCourses" :key="c.id" class="flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm">
              <Bookmark class="h-5 w-5 shrink-0 fill-amber-400 text-amber-400" />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium truncate">{{ c.title }}</p>
                <p class="text-xs text-muted-foreground">{{ c.difficulty }} · {{ c.duration }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- AI Review Cards (NotebookLM style) -->
        <div v-if="completedCourses.length" class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="flex items-center gap-2 text-sm font-semibold">
              <Sparkles class="h-4 w-4 text-violet-500" /> AI回顾卡片
            </h3>
            <div class="flex gap-1.5">
              <Button v-for="c in completedCourses" :key="c.id" variant="ghost" size="sm" class="text-xs"
                :class="selectedCourseForReview === c.id ? 'bg-violet-50 text-violet-700' : ''"
                @click="generateReviewCards(c.id)">
                {{ c.title.slice(0, 10) }}...
              </Button>
              <Button v-if="reviewCards.length" variant="ghost" size="sm" class="text-xs" @click="clearCards">清除</Button>
            </div>
          </div>

          <!-- Generating -->
          <div v-if="generatingCards" class="flex items-center gap-2 rounded-xl border bg-white p-4">
            <Sparkles class="h-4 w-4 text-violet-500 animate-pulse" />
            <span class="text-sm text-muted-foreground">AI正在为你生成课程重点回顾卡片…</span>
          </div>

          <!-- Review cards grid -->
          <div v-if="reviewCards.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div v-for="card in reviewCards" :key="card.id"
              :class="['group cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
                card.flipped ? 'border-violet-300 bg-violet-50/30' : 'border-zinc-200']"
              @click="flipCard(card.id)">
              <div class="flex items-center gap-2 mb-3">
                <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500 text-white text-xs font-bold">{{ card.id === 'r1' ? '01' : card.id === 'r2' ? '02' : card.id === 'r3' ? '03' : '04' }}</span>
                <span class="text-xs font-semibold text-zinc-500">{{ card.title }}</span>
              </div>

              <!-- Front -->
              <div v-if="!card.flipped">
                <h4 class="text-sm font-bold text-zinc-800 mb-2">{{ card.concept }}</h4>
                <p class="text-xs text-zinc-500 leading-relaxed">{{ card.detail }}</p>
                <p class="mt-2 text-[11px] text-violet-500 font-medium">点击翻转查看示例 →</p>
              </div>

              <!-- Back (flipped) -->
              <div v-else>
                <h4 class="text-xs font-semibold text-violet-600 mb-2">📝 实际案例</h4>
                <p class="text-sm text-zinc-700 leading-relaxed italic">"{{ card.example }}"</p>
                <p class="mt-2 text-[11px] text-violet-500 font-medium">← 点击翻回</p>
              </div>
            </div>
          </div>

          <!-- Export button -->
          <div v-if="reviewCards.length" class="mt-3 flex gap-2">
            <Button variant="outline" size="sm" class="text-xs">📥 导出复习笔记</Button>
            <Button variant="ghost" size="sm" class="text-xs">📋 复制到剪贴板</Button>
          </div>
        </div>

        <div v-if="!inProgressCourses.length && !completedCourses.length && !bookmarkedCourses.length" class="py-16 text-center">
          <GraduationCap class="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p class="mt-3 text-sm text-muted-foreground">暂无学习记录，去课程广场看看吧</p>
          <Button variant="outline" size="sm" class="mt-4" @click="mainTab = 'courses'">浏览课程</Button>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>
