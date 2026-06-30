import { describe, it, expect } from 'vitest'
import { filterArticles } from '../useNews'
import { articles } from '@/mock/articles'

describe('filterArticles', () => {
  it('returns all articles with "all" category', () => {
    const r = filterArticles(articles, { category: 'all' })
    expect(r.total).toBe(articles.length)
    expect(r.totalPages).toBe(Math.ceil(articles.length / 12))
  })

  it('filters by category=competitor', () => {
    const r = filterArticles(articles, { category: 'competitor' })
    expect(r.total).toBe(8)
    r.items.forEach((a) => expect(a.category).toBe('competitor'))
  })

  it('filters by tag', () => {
    const r = filterArticles(articles, { tag: '威胁预警' })
    expect(r.total).toBeGreaterThan(0)
    r.items.forEach((a) => expect(a.tags).toContain('威胁预警'))
  })

  it('filters by search term in title/summary', () => {
    const r = filterArticles(articles, { search: 'GPT-5' })
    expect(r.total).toBeGreaterThan(0)
    r.items.forEach((a) => {
      const hit = a.title.includes('GPT-5') || a.summary.includes('GPT-5')
      expect(hit).toBe(true)
    })
  })

  it('sorts pinned first, then latest by default', () => {
    const r = filterArticles(articles, { sort: 'latest', pageSize: 24 })
    const firstPinnedIdx = r.items.findIndex((a) => a.isPinned)
    const lastPinnedIdx = r.items.map((a) => (a.isPinned ? 1 : 0)).lastIndexOf(1)
    if (firstPinnedIdx !== -1 && lastPinnedIdx !== -1) {
      expect(lastPinnedIdx).toBeLessThan(r.items.findIndex((a) => !a.isPinned))
    }
  })

  it('sorts by hot (viewCount) with pinned first', () => {
    const r = filterArticles(articles, { sort: 'hot', pageSize: 24 })
    const nonPinned = r.items.filter((a) => !a.isPinned)
    for (let i = 1; i < nonPinned.length; i++) {
      expect(nonPinned[i - 1].viewCount).toBeGreaterThanOrEqual(nonPinned[i].viewCount)
    }
  })

  it('paginates correctly', () => {
    const r1 = filterArticles(articles, { page: 1, pageSize: 5 })
    expect(r1.items.length).toBe(5)
    expect(r1.page).toBe(1)
    const r2 = filterArticles(articles, { page: 2, pageSize: 5 })
    expect(r2.items.length).toBe(5)
    expect(r2.page).toBe(2)
    // no overlap
    const ids1 = new Set(r1.items.map((a) => a.id))
    r2.items.forEach((a) => expect(ids1.has(a.id)).toBe(false))
  })

  it('clamps page beyond total to last page', () => {
    const r = filterArticles(articles, { page: 999, pageSize: 5 })
    expect(r.page).toBe(r.totalPages)
  })
})
