import { ref } from 'vue'
import type { Article, ArticleCategory } from '@/types/article'

export interface NewsFilter {
  category?: ArticleCategory | 'all'
  search?: string
  sort?: 'latest' | 'hot'
  tag?: string
  page?: number
  pageSize?: number
}

export interface NewsResult {
  items: Article[]
  total: number
  totalPages: number
  page: number
  pageSize: number
}

export function filterArticles(all: Article[], f: NewsFilter): NewsResult {
  let list = [...all]

  if (f.category && f.category !== 'all') {
    list = list.filter((a) => a.category === f.category)
  }
  if (f.tag) {
    list = list.filter((a) => a.tags.includes(f.tag as string))
  }
  if (f.search) {
    const q = f.search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (a) => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q),
      )
    }
  }

  const pinned = (a: Article) => (a.isPinned ? 1 : 0)
  if (f.sort === 'hot') {
    list.sort((a, b) => pinned(b) - pinned(a) || b.viewCount - a.viewCount)
  } else {
    list.sort((a, b) => pinned(b) - pinned(a) || +new Date(b.publishedAt) - +new Date(a.publishedAt))
  }

  const total = list.length
  const pageSize = f.pageSize ?? 12
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, f.page ?? 1), totalPages)
  const items = list.slice((page - 1) * pageSize, page * pageSize)

  return { items, total, totalPages, page, pageSize }
}
