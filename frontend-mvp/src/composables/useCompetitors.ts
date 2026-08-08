import { competitorProfiles, selfProfile } from '@/mock/competitors'
import { articles } from '@/mock/articles'
import type { Article } from '@/types/article'
import type { CompetitorProfile } from '@/types/competitor'

export function useCompetitors() {
  function competitorArticles(sub?: string): Article[] {
    let list = articles.filter((a) => a.category === 'competitor')
    if (sub) list = list.filter((a) => a.subCategory === sub)
    return list.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
  }

  function threatAlerts(): Article[] {
    return competitorArticles().filter(
      (a) => a.threatLevel === 'high' || a.threatLevel === 'medium',
    )
  }

  function benchmark(): { rows: CompetitorProfile[]; self: CompetitorProfile } {
    return { rows: competitorProfiles, self: selfProfile }
  }

  return {
    profiles: competitorProfiles,
    self: selfProfile,
    competitorArticles,
    threatAlerts,
    benchmark,
  }
}
