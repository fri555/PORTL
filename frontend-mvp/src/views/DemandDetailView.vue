<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft, ThumbsUp, Share2, MessageSquare, Send, Clock, User, Tag,
  Paperclip, ExternalLink, Loader2, Check, Image, FileText,
} from 'lucide-vue-next'
import { demands, demandComments, getDemand } from '@/mock/demands'
import { DEMAND_STATUS_META, type DemandStatus, type DemandComment } from '@/types/demand'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { timeAgo } from '@/lib/format'

const route = useRoute()
const router = useRouter()

const demand = computed(() => getDemand(route.params.id as string))
const loading = ref(false)
const voted = ref(false)
const voteCount = ref(0)
const shareTooltip = ref(false)
const newComment = ref('')
const comments = ref<DemandComment[]>([])

onMounted(() => {
  if (demand.value) {
    voteCount.value = demand.value.voteCount
    comments.value = (demandComments[demand.value.id] ?? []).slice()
  }
})

function toggleVote() {
  voted.value = !voted.value
  voteCount.value += voted.value ? 1 : -1
}

function share() {
  navigator.clipboard?.writeText(window.location.href).catch(() => {})
  shareTooltip.value = true
  setTimeout(() => (shareTooltip.value = false), 2000)
}

function addComment() {
  if (!newComment.value.trim()) return
  comments.value.push({
    id: `c${Date.now()}`,
    demandId: demand.value!.id,
    userId: 'current',
    userName: '当前用户',
    content: newComment.value.trim(),
    createdAt: new Date().toISOString(),
  })
  newComment.value = ''
}

function statusLabel(s: DemandStatus) { return DEMAND_STATUS_META[s]?.label ?? s }
function statusColor(s: DemandStatus) { return DEMAND_STATUS_META[s]?.color ?? '#6b7280' }
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-6">
    <button
      class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
      @click="router.push({ name: 'demands' })"
    >
      <ArrowLeft class="h-4 w-4" /> 返回需求池
    </button>

    <template v-if="!demand">
      <div class="py-16 text-center">
        <p class="text-sm text-muted-foreground">需求不存在或已被删除</p>
        <Button variant="outline" size="sm" class="mt-4" @click="router.push({ name: 'demands' })">返回需求池</Button>
      </div>
    </template>

    <template v-else>
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Left: Demand Details -->
        <div class="lg:col-span-1">
          <div class="rounded-xl border bg-white p-5 shadow-sm">
            <div class="mb-4">
              <Badge
                class="mb-2 text-xs"
                :style="{ backgroundColor: statusColor(demand.status) + '18', color: statusColor(demand.status), borderColor: 'transparent' }"
                variant="outline"
              >
                {{ statusLabel(demand.status) }}
              </Badge>
              <h1 class="text-xl font-bold leading-tight">{{ demand.title }}</h1>
            </div>

            <div class="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <span class="flex items-center gap-1 text-muted-foreground">
                <User class="h-4 w-4" /> {{ demand.submitterName }}
              </span>
              <span class="text-muted-foreground">·</span>
              <Badge variant="secondary" class="text-xs">{{ demand.department }}</Badge>
              <span class="text-muted-foreground">·</span>
              <span class="flex items-center gap-1 text-muted-foreground">
                <Clock class="h-4 w-4" /> {{ timeAgo(demand.createdAt) }}
              </span>
            </div>

            <!-- Description -->
            <div class="mb-6">
              <h3 class="mb-2 text-sm font-semibold">需求描述</h3>
              <p class="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{{ demand.description }}</p>
            </div>

            <!-- AI Extracted -->
            <div v-if="demand.aiExtractedDesc" class="mb-6 rounded-lg border bg-blue-50/50 p-3">
              <p class="mb-1 text-xs font-medium text-blue-700">AI辅助提取</p>
              <p class="text-xs text-blue-800">{{ demand.aiExtractedDesc }}</p>
            </div>

            <!-- Tags -->
            <div class="mb-6">
              <h3 class="mb-2 text-sm font-semibold">标签</h3>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="t in demand.tags"
                  :key="t"
                  class="rounded-full border bg-zinc-50 px-2.5 py-1 text-xs text-muted-foreground"
                >{{ t }}</span>
              </div>
            </div>

            <!-- Attachments -->
            <div v-if="demand.attachments.length" class="mb-6">
              <h3 class="mb-2 text-sm font-semibold">附件</h3>
              <div class="space-y-1.5">
                <div
                  v-for="att in demand.attachments"
                  :key="att.name"
                  class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent"
                >
                  <Image v-if="att.type === 'image'" class="h-4 w-4 text-muted-foreground" />
                  <FileText v-else class="h-4 w-4 text-muted-foreground" />
                  <span class="flex-1 truncate">{{ att.name }}</span>
                  <ExternalLink class="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            </div>

            <!-- Vote + Share -->
            <div class="flex items-center gap-3 border-t pt-4">
              <Button
                :variant="voted ? 'default' : 'outline'"
                size="default"
                class="flex-1 gap-1.5"
                @click="toggleVote"
              >
                <ThumbsUp class="h-4 w-4" :class="{ 'fill-current': voted }" />
                {{ voteCount }}
              </Button>
              <Button variant="outline" size="default" class="flex-1 gap-1.5" @click="share">
                <Check v-if="shareTooltip" class="h-4 w-4 text-emerald-500" />
                <Share2 v-else class="h-4 w-4" />
                {{ shareTooltip ? '已复制' : '分享到钉钉' }}
              </Button>
            </div>
          </div>
        </div>

        <!-- Center: Status Timeline -->
        <div class="lg:col-span-1">
          <div class="rounded-xl border bg-white p-5 shadow-sm">
            <h3 class="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Clock class="h-4 w-4 text-primary" /> 状态时间线
            </h3>
            <div class="relative">
              <div class="absolute left-[11px] top-2 bottom-2 w-0.5 bg-zinc-200" />
              <div class="space-y-5">
                <div v-for="entry in demand.timeline" :key="entry.id" class="relative flex gap-4 pl-1">
                  <div class="relative z-10 mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-white bg-primary text-[10px] text-primary-foreground shadow">
                    <Check class="h-3 w-3" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span
                        class="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        :style="{ backgroundColor: statusColor(entry.toStatus as DemandStatus) + '18', color: statusColor(entry.toStatus as DemandStatus) }"
                      >
                        {{ statusLabel(entry.toStatus as DemandStatus) }}
                      </span>
                      <span class="text-xs text-muted-foreground">{{ timeAgo(entry.createdAt) }}</span>
                    </div>
                    <p class="mt-0.5 text-sm">{{ entry.remark }}</p>
                    <p class="mt-0.5 text-xs text-muted-foreground">
                      {{ entry.operatorName }} · {{ entry.operatorRole }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Comments -->
        <div class="lg:col-span-1">
          <div class="rounded-xl border bg-white p-5 shadow-sm">
            <h3 class="mb-4 flex items-center gap-2 text-sm font-semibold">
              <MessageSquare class="h-4 w-4 text-primary" /> 评论 ({{ comments.length }})
            </h3>

            <!-- Comment list -->
            <div v-if="comments.length" class="mb-4 space-y-3 max-h-[400px] overflow-y-auto">
              <div v-for="c in comments" :key="c.id" class="flex gap-3">
                <Avatar class="h-8 w-8 shrink-0">
                  <AvatarFallback class="text-xs bg-primary/10 text-primary">{{ c.userName[0] }}</AvatarFallback>
                </Avatar>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium">{{ c.userName }}</span>
                    <span class="text-[11px] text-muted-foreground">{{ timeAgo(c.createdAt) }}</span>
                  </div>
                  <p class="mt-0.5 text-sm text-muted-foreground">{{ c.content }}</p>
                </div>
              </div>
            </div>
            <div v-else class="mb-4 py-8 text-center">
              <MessageSquare class="mx-auto h-8 w-8 text-muted-foreground/30" />
              <p class="mt-2 text-xs text-muted-foreground">暂无评论，来说点什么吧</p>
            </div>

            <!-- Comment input -->
            <div class="flex gap-2 border-t pt-4">
              <Avatar class="h-8 w-8 shrink-0">
                <AvatarFallback class="text-xs bg-primary/10 text-primary">我</AvatarFallback>
              </Avatar>
              <div class="flex-1">
                <textarea
                  v-model="newComment"
                  class="mb-2 w-full resize-none rounded-lg border bg-white px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows="2"
                  placeholder="写下你的评论..."
                  @keydown.enter.ctrl="addComment"
                  @keydown.meta.enter="addComment"
                />
                <div class="flex items-center justify-between">
                  <span class="text-[11px] text-muted-foreground">⌘/Ctrl + Enter 发送</span>
                  <Button size="sm" :disabled="!newComment.trim()" class="gap-1" @click="addComment">
                    <Send class="h-3.5 w-3.5" /> 发表评论
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
