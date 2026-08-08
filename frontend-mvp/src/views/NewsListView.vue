<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BookOpen,
  Building2,
  Clock,
  Eye,
  Flame,
  Globe2,
  Megaphone,
  Newspaper,
  Search,
  ShieldAlert,
  ThumbsUp,
  Zap,
  BellRing,
  ArrowUpRight,
} from 'lucide-vue-next'
import { articles } from '@/mock/articles'
import { filterArticles } from '@/composables/useNews'
import type { ArticleCategory, ThreatLevel } from '@/types/article'
import { timeAgo, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

const route = useRoute()
const router = useRouter()

const category = computed(() => (route.query.category as string) || 'all')
const search = computed(() => (route.query.q as string) || '')
const tag = computed(() => (route.query.tag as string) || '')
const sort = ref<'latest' | 'hot'>('latest')
const page = ref(1)

const filtered = computed(() =>
  filterArticles(articles, {
    category: category.value as never,
    search: search.value,
    sort: sort.value,
    tag: tag.value,
    page: page.value,
    pageSize: 9,
  }),
)

// TOP featured follows the selected tab.
const topFeatured = computed(() => {
  let pool = articles
  if (category.value !== 'all') pool = pool.filter(a => a.category === category.value)
  return pool
    .sort((a, b) => {
      if (category.value === 'competitor') {
        const threatScore: Record<ThreatLevel, number> = { high: 3, medium: 2, low: 1 }
        return (threatScore[b.threatLevel ?? 'low'] - threatScore[a.threatLevel ?? 'low']) || b.viewCount - a.viewCount
      }
      return b.viewCount - a.viewCount
    })
    .slice(0, 3)
})

const categoryTabs = [
  { key: 'all', label: '全部', icon: Newspaper },
  { key: 'competitor', label: '竞对情报', icon: ShieldAlert },
  { key: 'industry', label: '行业前沿', icon: Globe2 },
  { key: 'internal', label: '集团动态', icon: Building2 },
  { key: 'tech', label: '技术分享', icon: BookOpen },
  { key: 'product', label: '产品更新', icon: Megaphone },
]

const aiHotList = computed(() => [...articles].sort((a, b) => b.viewCount - a.viewCount).slice(0, 8))
const sidebarCollapsed = ref(false)
const activeTabLabel = computed(() => categoryTabs.find(t => t.key === category.value)?.label ?? '全部')

function setCategory(c: string) { router.replace({ query: { ...route.query, category: c === 'all' ? undefined : c } }) }
function onSearch(v: string) { router.replace({ query: { ...route.query, q: v || undefined } }) }
watch([category, search, sort, tag], () => { page.value = 1 })

function catBadge(c: ArticleCategory) { const m: Record<ArticleCategory, string> = { competitor: 'bg-red-50 text-red-600 border-red-200', industry: 'bg-blue-50 text-blue-600 border-blue-200', internal: 'bg-emerald-50 text-emerald-600 border-emerald-200', tech: 'bg-violet-50 text-violet-600 border-violet-200', product: 'bg-amber-50 text-amber-600 border-amber-200' }; return m[c] ?? '' }
function catLabel(c: ArticleCategory) { const m: Record<ArticleCategory, string> = { competitor: '竞对', industry: '行业', internal: '集团', tech: '技术', product: '产品' }; return m[c] ?? c }
function compBadge(n: string) { const c: Record<string, string> = { '耐克': 'bg-red-100 text-red-700', '安踏': 'bg-blue-100 text-blue-700', 'Keep': 'bg-green-100 text-green-700', '李宁': 'bg-amber-100 text-amber-700', '华为': 'bg-violet-100 text-violet-700', '阿迪达斯': 'bg-zinc-100 text-zinc-700', '滔搏体育': 'bg-cyan-100 text-cyan-700', 'YY胜道体育': 'bg-indigo-100 text-indigo-700' }; return c[n] ?? 'bg-zinc-100 text-zinc-600' }
</script>

<template>
  <div class="flex min-h-[calc(100vh-4rem)]">
    <div class="min-w-0 flex-1">
      <div class="mx-auto max-w-5xl space-y-5 px-4 py-4 md:space-y-6 md:px-6 md:py-6">

        <!-- Header -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <h1 class="text-xl font-bold tracking-tight md:text-2xl">行业资讯</h1>
            <p class="text-sm text-muted-foreground mt-0.5">竞对情报与行业动态，一站掌握</p>
          </div>
        </div>

        <!-- Category Tabs -->
        <div class="space-y-3 rounded-xl border bg-white p-3 shadow-sm">
          <div class="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          <button v-for="t in categoryTabs" :key="t.key" @click="setCategory(t.key)"
            :class="cn(
              'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-all',
              category === t.key
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100',
            )">
            <component :is="t.icon" class="h-4 w-4" />
            {{ t.label }}
          </button>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div class="relative min-w-0 flex-1">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                :model-value="search"
                placeholder="搜索资讯、竞对、标签"
                class="h-10 pl-9"
                @update:model-value="onSearch(String($event))"
              />
            </div>
            <div class="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:w-40">
              <button :class="cn('h-9 rounded-md px-3 text-sm font-medium transition-colors', sort==='latest'?'bg-white text-foreground shadow-sm':'text-muted-foreground hover:text-foreground')" @click="sort='latest'">最新</button>
              <button :class="cn('h-9 rounded-md px-3 text-sm font-medium transition-colors', sort==='hot'?'bg-white text-foreground shadow-sm':'text-muted-foreground hover:text-foreground')" @click="sort='hot'">最热</button>
            </div>
          </div>
        </div>

        <!-- TOP Featured follows current tab -->
        <div v-if="topFeatured.length > 0" class="rounded-xl border bg-white p-3 shadow-sm md:p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 class="text-sm font-semibold text-zinc-900">{{ activeTabLabel }}重点信息</h2>
              <p class="mt-0.5 text-xs text-zinc-500">根据当前标签自动提炼最重要的三条内容</p>
            </div>
            <span class="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-500">{{ topFeatured.length }}条</span>
          </div>
        <div class="grid gap-3 sm:grid-cols-3">
          <div v-for="(a, i) in topFeatured" :key="a.id"
            class="group relative cursor-pointer overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            @click="router.push({ name: 'article-detail', params: { id: a.id } })">
            <div class="aspect-[16/9] overflow-hidden bg-zinc-100">
              <img :src="a.coverImage" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            </div>
            <div class="p-3">
              <div class="mb-1 flex items-center gap-1.5">
                <span :class="['rounded-full border px-1.5 py-0.5 text-[10px] font-medium', catBadge(a.category)]">{{ catLabel(a.category) }}</span>
                <span v-if="a.competitorName" :class="['rounded-full px-1.5 py-0.5 text-[10px]', compBadge(a.competitorName)]">{{ a.competitorName }}</span>
              </div>
              <h3 class="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">{{ a.title }}</h3>
              <div class="mt-2 flex items-center gap-2 text-[11px] text-zinc-400">
                <span class="flex items-center gap-1"><Eye class="h-3 w-3" />{{ formatNumber(a.viewCount) }}</span>
                <span>{{ timeAgo(a.publishedAt) }}</span>
                <ArrowUpRight class="ml-auto h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
              </div>
            </div>
          </div>
        </div>
        </div>

        <!-- Article Grid -->
        <p class="text-sm text-zinc-400">{{ activeTabLabel }} · 共 {{ filtered.total }} 条</p>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="a in filtered.items" :key="a.id"
            :class="cn('group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer',
              a.category === 'competitor' && a.threatLevel === 'high' ? 'ring-2 ring-red-400/30 border-red-200' : '',
              a.category === 'competitor' && a.threatLevel === 'medium' ? 'border-orange-200' : '')"
            @click="router.push({ name: 'article-detail', params: { id: a.id } })">
            <div class="relative aspect-[16/9] overflow-hidden bg-zinc-100">
              <img :src="a.coverImage" class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div class="flex flex-1 flex-col p-4">
              <div class="mb-1.5 flex items-center gap-1.5">
                <span :class="['rounded-full border px-2 py-0.5 text-[10px] font-medium', catBadge(a.category)]">{{ catLabel(a.category) }}</span>
                <span v-if="a.competitorName" :class="['rounded-full px-2 py-0.5 text-[10px]', compBadge(a.competitorName)]">{{ a.competitorName }}</span>
              </div>
              <h3 class="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary transition-colors">{{ a.title }}</h3>
              <p class="mt-1 line-clamp-2 text-xs text-zinc-500">{{ a.summary }}</p>
              <div class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[11px] text-zinc-400">
                <span class="max-w-[8rem] truncate">{{ a.department }}</span>
                <span class="flex items-center gap-1"><Clock class="h-3 w-3" />{{ timeAgo(a.publishedAt) }}</span>
                <span class="ml-auto flex items-center gap-2">
                  <span class="flex items-center gap-0.5"><Eye class="h-3 w-3" />{{ formatNumber(a.viewCount) }}</span>
                  <span class="flex items-center gap-0.5"><ThumbsUp class="h-3 w-3" />{{ a.likeCount }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="filtered.items.length === 0" class="flex flex-col items-center py-20 text-zinc-400">
          <p class="text-lg font-medium">暂无符合条件的资讯</p>
          <p class="text-sm mt-1">换个分类或清空搜索试试</p>
        </div>

        <div v-if="filtered.totalPages > 1" class="no-scrollbar -mx-4 flex justify-start gap-1.5 overflow-x-auto px-4 pt-2 sm:justify-center">
          <button :disabled="filtered.page===1" @click="page=filtered.page-1" class="h-10 shrink-0 rounded-lg border px-3 text-sm disabled:opacity-40 hover:bg-zinc-50">上一页</button>
          <button v-for="p in filtered.totalPages" :key="p" @click="page=p"
            :class="cn('h-10 min-w-10 shrink-0 rounded-lg px-3 text-sm', p===filtered.page?'bg-primary text-white':'border hover:bg-zinc-50')">{{ p }}</button>
          <button :disabled="filtered.page===filtered.totalPages" @click="page=filtered.page+1" class="h-10 shrink-0 rounded-lg border px-3 text-sm disabled:opacity-40 hover:bg-zinc-50">下一页</button>
        </div>
      </div>
    </div>

    <!-- Right Sidebar -->
    <aside
      class="sticky top-20 hidden h-[calc(100vh-6rem)] shrink-0 overflow-hidden border-l bg-white transition-all duration-200 xl:block"
      :class="sidebarCollapsed ? 'w-16' : 'w-72'"
    >
      <div class="flex h-full flex-col">
        <div class="flex items-center justify-between border-b px-4 py-3">
          <div v-if="!sidebarCollapsed" class="flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <Flame class="h-4 w-4 text-orange-500" />
            热榜与订阅
          </div>
          <button class="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900" :title="sidebarCollapsed ? '展开侧栏' : '收起侧栏'" @click="sidebarCollapsed = !sidebarCollapsed">
            <ArrowUpRight class="h-4 w-4 transition-transform" :class="sidebarCollapsed ? 'rotate-180' : ''" />
          </button>
        </div>

        <div class="flex-1 space-y-6 overflow-y-auto p-4" :class="sidebarCollapsed ? 'px-2' : ''">
          <div class="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 p-4" :class="sidebarCollapsed ? 'p-2' : 'p-4'">
            <template v-if="!sidebarCollapsed">
              <div class="mb-2 flex items-center gap-2"><BellRing class="h-4 w-4 text-orange-500" /><span class="text-sm font-semibold text-orange-800">订阅推送</span></div>
              <p class="mb-3 text-xs text-orange-600">竞对情报和行业动态即时钉钉推送</p>
              <button class="w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90">立即订阅</button>
            </template>
            <template v-else>
              <div class="flex flex-col items-center gap-2 py-1 text-[10px] font-medium text-orange-700">
                <BellRing class="h-4 w-4 text-orange-500" />
                订阅
              </div>
            </template>
          </div>

          <div>
            <div v-if="!sidebarCollapsed" class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-zinc-600">
              <Flame class="h-3.5 w-3.5 text-orange-500" /> AI热榜
            </div>
            <div class="space-y-3" :class="sidebarCollapsed ? 'space-y-2' : ''">
              <div v-for="(item, idx) in aiHotList" :key="item.id" class="flex cursor-pointer gap-3 rounded-lg p-2 transition-colors hover:bg-zinc-50" @click="router.push({ name: 'article-detail', params: { id: item.id } })">
                <div class="flex w-6 shrink-0 items-center justify-center text-sm font-bold" :class="idx===0?'text-red-500':idx===1?'text-orange-500':idx===2?'text-amber-500':'text-zinc-300'">{{ idx+1 }}</div>
                <div v-if="!sidebarCollapsed" class="min-w-0">
                  <h4 class="text-sm font-medium line-clamp-2 transition-colors group-hover:text-primary">{{ item.title }}</h4>
                  <span class="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-400"><Eye class="h-3 w-3" />{{ formatNumber(item.viewCount) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>
