<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import {
  ThumbsUp, Bookmark, Share2, Eye, Clock, ExternalLink, ArrowLeft, MessageSquare, Check,
} from 'lucide-vue-next'
import { useArticle } from '@/composables/useArticle'
import { useAppStore } from '@/stores/app'
import { THREAT_META } from '@/lib/constants'
import { timeAgo, formatNumber } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import CategoryBadge from '@/components/common/CategoryBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ArticleCard from '@/components/news/ArticleCard.vue'
import { cn } from '@/lib/utils'

const route = useRoute()
const store = useAppStore()

const { article, related, loading, load, incrementView } = useArticle(route.params.id as string)
const copied = ref(false)

onMounted(async () => {
  await load()
  incrementView()
})
watch(
  () => route.params.id,
  async (id) => {
    if (id) {
      await load()
      incrementView()
    }
  },
)

function share() {
  navigator.clipboard?.writeText(window.location.href).catch(() => {})
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

const likeCount = computed(() =>
  article.value ? article.value.likeCount + (store.isLiked(article.value.id) ? 1 : 0) : 0,
)
</script>

<template>
  <div class="container py-4 md:py-6">
    <div class="mx-auto max-w-3xl">
      <RouterLink
        :to="{ name: 'news' }"
        class="mb-4 inline-flex min-h-10 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft class="h-4 w-4" /> 返回资讯
      </RouterLink>

      <!-- loading -->
      <template v-if="loading">
        <Skeleton class="aspect-[21/9] w-full rounded-xl" />
        <Skeleton class="mt-6 h-8 w-3/4" />
        <Skeleton class="mt-3 h-4 w-full" />
        <Skeleton class="mt-2 h-4 w-5/6" />
        <Skeleton class="mt-6 h-40 w-full" />
      </template>

      <!-- not found -->
      <EmptyState v-else-if="!article" title="文章不存在" description="该资讯可能已被删除或链接有误">
        <RouterLink :to="{ name: 'news' }">
          <Button variant="outline" size="sm" class="mt-4">返回资讯列表</Button>
        </RouterLink>
      </EmptyState>

      <!-- content -->
      <article v-else>
        <div class="overflow-hidden rounded-xl bg-zinc-900">
          <img :src="article.coverImage" :alt="article.title" class="aspect-[16/10] w-full object-cover md:aspect-[21/9]" />
        </div>

        <div class="mt-6 flex flex-wrap items-center gap-2">
          <CategoryBadge :category="article.category" />
          <span
            v-if="article.threatLevel"
            :class="['inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', THREAT_META[article.threatLevel].color]"
          >
            <span :class="['h-1.5 w-1.5 rounded-full', THREAT_META[article.threatLevel].dot]" />
            {{ THREAT_META[article.threatLevel].label }}
          </span>
          <span v-if="article.competitorName" class="text-sm text-muted-foreground">· {{ article.competitorName }}</span>
        </div>

        <h1 class="mt-3 text-balance text-[1.65rem] font-bold leading-tight md:text-3xl">{{ article.title }}</h1>
        <p class="mt-3 text-[15px] leading-relaxed text-muted-foreground">{{ article.summary }}</p>

        <div class="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-y py-3 text-sm">
          <div class="flex items-center gap-2">
            <Avatar class="h-8 w-8">
              <AvatarFallback class="bg-primary/10 text-xs font-medium text-primary">{{ article.author[0] }}</AvatarFallback>
            </Avatar>
            <div>
              <p class="font-medium leading-tight">{{ article.author }}</p>
              <p class="text-xs text-muted-foreground">{{ article.department }}</p>
            </div>
          </div>
          <span class="flex items-center gap-1 text-muted-foreground"><Clock class="h-4 w-4" />{{ timeAgo(article.publishedAt) }}</span>
          <span class="flex items-center gap-1 text-muted-foreground"><Eye class="h-4 w-4" />{{ formatNumber(article.viewCount) }}阅读</span>
          <span class="flex items-center gap-1 text-muted-foreground"><MessageSquare class="h-4 w-4" />{{ article.commentCount }}评论</span>
          <a
            v-if="article.sourceUrl"
            :href="article.sourceUrl"
            target="_blank"
            rel="noopener"
            class="flex min-h-9 items-center gap-1 text-primary hover:underline sm:ml-auto"
          >
            {{ article.source }} <ExternalLink class="h-3.5 w-3.5" />
          </a>
        </div>

        <!-- body -->
        <div class="article-prose mt-6" v-html="article.content" />

        <!-- tags -->
        <div class="mt-8 flex flex-wrap gap-2">
          <RouterLink
            v-for="t in article.tags"
            :key="t"
            :to="{ name: 'news', query: { tag: t } }"
            class="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            #{{ t }}
          </RouterLink>
        </div>

        <!-- action bar -->
        <div class="mt-6 grid grid-cols-3 gap-2 rounded-xl border bg-white p-2 shadow-sm sm:flex sm:items-center sm:gap-3 sm:p-3">
          <Button
            :variant="store.isLiked(article.id) ? 'default' : 'outline'"
            size="sm"
            class="gap-1.5"
            @click="store.toggleLike(article.id)"
          >
            <ThumbsUp class="h-4 w-4" :class="{ 'fill-current': store.isLiked(article.id) }" />
            {{ likeCount }}
          </Button>
          <Button
            :variant="store.isBookmarked(article.id) ? 'default' : 'outline'"
            size="sm"
            class="gap-1.5"
            @click="store.toggleBookmark(article.id)"
          >
            <Bookmark class="h-4 w-4" :class="{ 'fill-current': store.isBookmarked(article.id) }" />
            收藏
          </Button>
          <Button variant="outline" size="sm" class="gap-1.5" @click="share">
            <Check v-if="copied" class="h-4 w-4 text-emerald-500" />
            <Share2 v-else class="h-4 w-4" />
            {{ copied ? '已复制链接' : '分享' }}
          </Button>
        </div>

        <!-- related -->
        <section v-if="related.length" class="mt-12">
          <h2 class="mb-4 text-lg font-bold tracking-tight">相关资讯</h2>
          <div class="grid gap-4 sm:grid-cols-3">
            <ArticleCard v-for="a in related" :key="a.id" :article="a" />
          </div>
        </section>
      </article>
    </div>

    <!-- toast -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="copied"
        class="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg md:bottom-6"
      >
        链接已复制到剪贴板
      </div>
    </Transition>
  </div>
</template>
