import { ref } from 'vue'
import { articles, getArticle } from '@/mock/articles'
import type { Article } from '@/types/article'

export function useArticle(id: string) {
  const article = ref<Article | null>(null)
  const related = ref<Article[]>([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    await new Promise((r) => setTimeout(r, 300))
    const a = getArticle(id) ?? null
    article.value = a
    if (a) {
      related.value = articles
        .filter((x) => x.category === a.category && x.id !== a.id)
        .slice(0, 3)
    }
    loading.value = false
  }

  function incrementView() {
    if (article.value) article.value.viewCount += 1
  }

  return { article, related, loading, load, incrementView }
}
