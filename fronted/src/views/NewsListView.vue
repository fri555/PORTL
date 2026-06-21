<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Filter, Clock, Flame } from 'lucide-vue-next'
import { articles } from '@/mock/articles'
import { filterArticles } from '@/composables/useNews'
import { Button } from '@/components/ui/button'
import PageContainer from '@/components/common/PageContainer.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import CategoryTabs from '@/components/news/CategoryTabs.vue'
import ArticleCard from '@/components/news/ArticleCard.vue'

const route = useRoute()
const router = useRouter()

const category = computed(() => (route.query.category as string) || 'all')
const search = computed(() => (route.query.q as string) || '')
const tag = computed(() => (route.query.tag as string) || '')
const sort = ref<'latest' | 'hot'>('latest')
const page = ref(1)

const result = computed(() =>
  filterArticles(articles, {
    category: category.value as never,
    search: search.value,
    sort: sort.value,
    tag: tag.value,
    page: page.value,
    pageSize: 9,
  }),
)

const popularTags = computed(() => {
  const counts = new Map<string, number>()
  articles.forEach((a) => a.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)))
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map((e) => e[0])
})

function setCategory(c: string) {
  router.replace({ query: { ...route.query, category: c === 'all' ? undefined : c } })
}
function onSearch(v: string) {
  router.replace({ query: { ...route.query, q: v || undefined } })
}
function toggleTag(t: string) {
  router.replace({ query: { ...route.query, tag: tag.value === t ? undefined : t } })
}

watch([category, search, sort, tag], () => {
  page.value = 1
})
</script>

<template>
  <PageContainer title="AI资讯" :breadcrumb="['首页', 'AI资讯']">
    <div class="mb-5">
      <CategoryTabs :model-value="category" @update:model-value="setCategory" />
    </div>

    <div class="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
      <div class="max-w-xs flex-1">
        <SearchBar :model-value="search" placeholder="搜索标题或摘要…" @update:model-value="onSearch" @search="onSearch" />
      </div>
      <div class="flex items-center gap-1 self-start rounded-md border p-1 lg:ml-auto">
        <Button
          :variant="sort === 'latest' ? 'default' : 'ghost'"
          size="sm"
          class="gap-1.5"
          @click="sort = 'latest'"
        >
          <Clock class="h-3.5 w-3.5" /> 最新
        </Button>
        <Button
          :variant="sort === 'hot' ? 'default' : 'ghost'"
          size="sm"
          class="gap-1.5"
          @click="sort = 'hot'"
        >
          <Flame class="h-3.5 w-3.5" /> 最热
        </Button>
      </div>
    </div>

    <div class="mb-5 flex flex-wrap items-center gap-2">
      <span class="flex items-center gap-1 text-xs text-muted-foreground"><Filter class="h-3.5 w-3.5" /> 热门标签</span>
      <button
        v-for="t in popularTags"
        :key="t"
        :class="[
          'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
          tag === t
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
        ]"
        @click="toggleTag(t)"
      >
        {{ t }}
      </button>
    </div>

    <p class="mb-4 text-sm text-muted-foreground">共 {{ result.total }} 条资讯</p>

    <EmptyState
      v-if="result.items.length === 0"
      title="暂无符合条件的资讯"
      description="试试换个分类或清空搜索关键词"
    />

    <div v-else class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <ArticleCard v-for="a in result.items" :key="a.id" :article="a" />
    </div>

    <div v-if="result.totalPages > 1" class="mt-8 flex items-center justify-center gap-1.5">
      <Button variant="outline" size="sm" :disabled="result.page === 1" @click="page = result.page - 1">
        上一页
      </Button>
      <Button
        v-for="p in result.totalPages"
        :key="p"
        :variant="p === result.page ? 'default' : 'outline'"
        size="sm"
        class="min-w-9"
        @click="page = p"
      >
        {{ p }}
      </Button>
      <Button variant="outline" size="sm" :disabled="result.page === result.totalPages" @click="page = result.page + 1">
        下一页
      </Button>
    </div>
  </PageContainer>
</template>
