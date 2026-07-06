<script setup lang="ts">
import { useRouter } from 'vue-router'
import { MessageSquareText, BookOpen, Grid3X3, TrendingUp, ArrowRight } from 'lucide-vue-next'

const router = useRouter()

const quickActions = [
  { icon: MessageSquareText, label: 'AI 对话', desc: '询问任何业务问题', path: '/chat', color: 'text-brand-blue bg-blue-50' },
  { icon: BookOpen, label: '知识中心', desc: '查阅知识库文档', path: '/knowledge', color: 'text-brand-orange bg-orange-50' },
  { icon: Grid3X3, label: '工作台', desc: '企业系统入口', path: '/workbench', color: 'text-brand-purple bg-purple-50' },
  { icon: TrendingUp, label: '数据看板', desc: '经营数据概览', path: '/chat', color: 'text-emerald-600 bg-emerald-50' },
]
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    <!-- Hero -->
    <div class="mb-10 text-center">
      <h1 class="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        你好，<span class="text-brand-blue">张三</span>
      </h1>
      <p class="mt-3 text-body-md text-stone">今天想了解什么？我可以帮你查资料、写方案、做分析</p>
    </div>

    <!-- Quick search / ask -->
    <div class="mx-auto mb-10 max-w-2xl">
      <div class="flex items-center gap-2 rounded-2xl border border-hairline bg-white px-4 py-3 shadow-sm transition hover:border-brand-blue">
        <MessageSquareText class="h-5 w-5 text-muted" />
        <input
          type="text"
          placeholder="向小智提问... 如「今年的团购预算还有多少？」"
          class="flex-1 bg-transparent text-body-md text-charcoal outline-none placeholder:text-muted"
          @focus="router.push('/chat')"
          readonly
        />
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white">
          <ArrowRight class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Video card / banner -->
    <div class="mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-blue/90 to-brand-purple/80 px-6 py-8 text-white sm:px-10">
      <div class="max-w-lg">
        <span class="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur">天马智擎 2.0</span>
        <h2 class="mt-3 text-heading-sm font-semibold">AI 驱动的智能工作台</h2>
        <p class="mt-2 text-body-sm text-white/80">集知识管理、智能问答、企业门户于一体，让信息触手可及</p>
        <button class="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-sm font-semibold text-brand-blue hover:bg-white/90" @click="router.push('/knowledge')">
          探索知识中心 <ArrowRight class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Quick actions grid -->
    <h2 class="mb-4 text-card-title font-semibold text-ink">快捷入口</h2>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <button
        v-for="action in quickActions"
        :key="action.path"
        class="group rounded-xl border border-hairline bg-white p-5 text-left transition hover:border-brand-blue hover:shadow-elevated"
        @click="router.push(action.path)"
      >
        <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg" :class="action.color">
          <component :is="action.icon" class="h-5 w-5" />
        </div>
        <h3 class="text-body-md font-semibold text-charcoal">{{ action.label }}</h3>
        <p class="mt-1 text-body-sm text-stone">{{ action.desc }}</p>
      </button>
    </div>

    <!-- Statistics -->
    <div class="mt-10 grid gap-4 rounded-xl border border-hairline bg-surface p-6 sm:grid-cols-3">
      <div class="text-center">
        <div class="text-heading-sm font-bold text-ink">8</div>
        <div class="mt-1 text-body-sm text-stone">公共知识库</div>
      </div>
      <div class="text-center">
        <div class="text-heading-sm font-bold text-ink">386</div>
        <div class="mt-1 text-body-sm text-stone">已索引文档</div>
      </div>
      <div class="text-center">
        <div class="text-heading-sm font-bold text-ink">1,284</div>
        <div class="mt-1 text-body-sm text-stone">本月问答次数</div>
      </div>
    </div>
  </div>
</template>
