<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { ArrowLeft, Clock, Users, Play, Download, Bookmark, Share2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const store = useAppStore()
const courseId = route.params.id as string
const loading = ref(true)

const courses = [
  { id: 'co1', title: 'Prompt工程进阶：写出会卖货的文案', cover: '', difficulty: '进阶', duration: '45min', enrolled: 1240, source: '钉钉云课堂', instructor: '王五', description: '掌握三段式Prompt法：角色设定+卖点提炼+平台语感，让AI文案转化率提升40%以上。', sections: ['第一章：Prompt基础原理', '第二章：角色设定技巧', '第三章：卖点提炼方法论', '第四章：多平台语感适配', '第五章：实战案例拆解'] },
  { id: 'co2', title: 'AI数据分析入门：从取数到洞察', cover: '', difficulty: '入门', duration: '30min', enrolled: 860, source: 'B站', instructor: '数据组', description: '零基础入门AI数据分析，用自然语言替代SQL，快速生成可视化报告。', sections: ['第一章：AI数据分析是什么', '第二章：自然语言取数', '第三章：自动可视化', '第四章：实战演练'] },
]

const course = ref<(typeof courses)[0] | null>(null)

onMounted(() => {
  course.value = courses.find((c) => c.id === courseId) || courses[0]
  loading.value = false
})
</script>

<template>
  <div class="container py-6">
    <div class="mx-auto max-w-4xl">
      <RouterLink to="/courses" class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft class="h-4 w-4" /> 返回培训中心
      </RouterLink>

      <template v-if="course">
        <div class="aspect-[21/9] rounded-xl bg-gradient-to-br from-primary/20 to-orange-100 flex items-center justify-center mb-6">
          <Play class="h-16 w-16 text-primary/60" />
        </div>

        <div class="flex flex-wrap gap-2 mb-3">
          <Badge variant="secondary">{{ course.source }}</Badge>
          <Badge :variant="course.difficulty === '进阶' ? 'default' : 'secondary'">{{ course.difficulty }}</Badge>
        </div>

        <h1 class="text-2xl font-bold mb-2">{{ course.title }}</h1>
        <p class="text-muted-foreground mb-4">{{ course.description }}</p>

        <div class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b">
          <span class="flex items-center gap-1"><Users class="h-4 w-4" /> {{ course.enrolled }}人已学</span>
          <span class="flex items-center gap-1"><Clock class="h-4 w-4" /> {{ course.duration }}</span>
          <span>讲师：{{ course.instructor }}</span>
        </div>

        <div class="flex gap-3 mb-8">
          <Button>开始学习</Button>
          <Button variant="outline" class="gap-1.5"><Bookmark class="h-4 w-4" /> 收藏</Button>
          <Button variant="outline" class="gap-1.5"><Share2 class="h-4 w-4" /> 分享</Button>
        </div>

        <h2 class="text-lg font-semibold mb-4">课程目录</h2>
        <div class="space-y-2">
          <div v-for="(s, i) in course.sections" :key="i" class="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">{{ i + 1 }}</span>
            <span class="text-sm">{{ s }}</span>
            <Download class="ml-auto h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
