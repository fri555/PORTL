<script setup lang="ts">
import { onMounted } from 'vue'
import { useHome } from '@/composables/useHome'
import { Skeleton } from '@/components/ui/skeleton'
import HeroHeadline from '@/components/home/HeroHeadline.vue'
import TrendingSidebar from '@/components/home/TrendingSidebar.vue'
import CompetitorTicker from '@/components/home/CompetitorTicker.vue'
import RankShowcase from '@/components/home/RankShowcase.vue'
import DemandVoices from '@/components/home/DemandVoices.vue'
import NewsFeed from '@/components/home/NewsFeed.vue'
import InternalDynamic from '@/components/home/InternalDynamic.vue'
import CourseRecommend from '@/components/home/CourseRecommend.vue'
import ToolShortcutBar from '@/components/home/ToolShortcutBar.vue'

const { data, loading, load } = useHome()
onMounted(() => load())
</script>

<template>
  <div class="container space-y-8 py-6">
    <!-- loading -->
    <template v-if="loading || !data">
      <div class="grid gap-6 lg:grid-cols-12">
        <Skeleton class="h-[320px] rounded-xl lg:col-span-8" />
        <Skeleton class="h-[320px] rounded-xl lg:col-span-4" />
      </div>
      <Skeleton class="h-[260px] rounded-xl" />
      <div class="grid gap-6 lg:grid-cols-2">
        <Skeleton class="h-[300px] rounded-xl" />
        <Skeleton class="h-[300px] rounded-xl" />
      </div>
      <Skeleton class="h-[240px] rounded-xl" />
    </template>

    <!-- content -->
    <template v-else>
      <!-- Zone 1: Hero + Trending -->
      <div class="grid gap-6 lg:grid-cols-12">
        <div class="lg:col-span-8">
          <HeroHeadline :article="data.headline" />
        </div>
        <div class="lg:col-span-4">
          <TrendingSidebar :items="data.trending" />
        </div>
      </div>

      <!-- Zone 2: Competitor ticker -->
      <CompetitorTicker :items="data.competitorNews" />

      <!-- Zone 3: Rank + Demand voices -->
      <div class="grid gap-6 lg:grid-cols-2">
        <RankShowcase :items="data.deptRank" />
        <DemandVoices :items="data.demandVoices" />
      </div>

      <!-- Zone 4: Industry news feed -->
      <NewsFeed :items="data.industryNews" />

      <!-- Zone 5: Internal dynamics + Courses -->
      <div class="grid gap-6 lg:grid-cols-2">
        <InternalDynamic :items="data.internalNews" />
        <CourseRecommend :items="data.courses" />
      </div>

      <!-- Zone 6: Tool shortcut bar -->
      <ToolShortcutBar :items="data.tools" />
    </template>
  </div>
</template>
