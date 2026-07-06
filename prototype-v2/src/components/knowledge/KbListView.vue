<script setup lang="ts">
import { ref, computed } from 'vue'
import { BookOpen, Star, LayoutGrid, List, Search, Plus } from 'lucide-vue-next'
import type { SpaceKey, KnowledgeBaseItem } from '@/types/knowledge'

const props = defineProps<{
  kbList: KnowledgeBaseItem[]
  search: string
  activeSpace: SpaceKey
}>()

const emit = defineEmits<{
  'selectKb': [id: string]
  'update:search': [value: string]
  'switchSpace': [space: SpaceKey]
}>()

const viewMode = ref<'grid' | 'list'>('list')

const pinned = computed(() => props.kbList.filter(kb => kb.pinned))
const unpinned = computed(() => props.kbList.filter(kb => !kb.pinned))
const filtered = computed(() => {
  const q = props.search.trim().toLowerCase()
  if (!q) return { pinned: pinned.value, unpinned: unpinned.value }
  const f = (list: KnowledgeBaseItem[]) => list.filter(kb => kb.name.toLowerCase().includes(q))
  return { pinned: f(pinned.value), unpinned: f(unpinned.value) }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-card-title font-semibold text-ink">
          {{ activeSpace === 'public' ? '公共知识库' : '我的知识库' }}
        </h2>
        <p class="mt-0.5 text-body-sm text-stone">{{ activeSpace === 'public' ? '全员可检索的集团知识' : '个人上传与私有资料' }}</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative">
          <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            :value="search"
            type="text"
            placeholder="搜索知识库..."
            class="h-9 w-48 rounded-lg border border-hairline bg-white pl-8 pr-3 text-xs outline-none placeholder:text-muted focus:border-brand-blue"
            @input="emit('update:search', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="flex h-9 overflow-hidden rounded-lg border border-hairline bg-white">
          <button class="px-2.5 text-stone hover:bg-surface" :class="{ 'bg-surface text-ink': viewMode === 'list' }" @click="viewMode = 'list'"><List class="h-4 w-4" /></button>
          <button class="px-2.5 text-stone hover:bg-surface" :class="{ 'bg-surface text-ink': viewMode === 'grid' }" @click="viewMode = 'grid'"><LayoutGrid class="h-4 w-4" /></button>
        </div>
      </div>
    </div>

    <!-- Pinned section -->
    <section v-if="filtered.pinned.length">
      <h3 class="mb-2 text-xs font-semibold text-stone">🌟 收藏知识库</h3>
      <div v-if="viewMode === 'grid'" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="kb in filtered.pinned"
          :key="kb.id"
          class="group relative rounded-xl border border-hairline bg-white p-4 text-left transition hover:border-brand-orange hover:shadow-elevated"
          @click="$emit('selectKb', kb.id)"
        >
          <div class="flex items-center gap-3">
            <div class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-orange-50 text-brand-orange">
              <BookOpen class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-semibold text-charcoal">{{ kb.name }}</div>
              <div class="mt-0.5 text-xs text-muted">{{ kb.docs }} 文档 · {{ kb.visibility }}</div>
            </div>
          </div>
          <div class="mt-2 text-xs text-muted">{{ kb.department }} · {{ kb.recent }}</div>
        </button>
      </div>
      <div v-else class="overflow-hidden rounded-xl border border-hairline bg-white">
        <div class="grid grid-cols-[1fr_120px_100px] border-b border-hairline bg-surface px-4 py-2.5 text-xs font-medium text-stone">
          <span>名称</span><span class="text-center">文档数</span><span class="text-right">更新时间</span>
        </div>
        <button
          v-for="kb in filtered.pinned"
          :key="kb.id"
          class="grid w-full grid-cols-[1fr_120px_100px] items-center border-b border-hairline px-4 py-2.5 text-left text-sm last:border-0 hover:bg-surface"
          @click="$emit('selectKb', kb.id)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <BookOpen class="h-4 w-4 shrink-0 text-brand-orange" />
            <span class="truncate font-medium text-charcoal">{{ kb.name }}</span>
          </div>
          <span class="text-center text-xs text-stone">{{ kb.docs }}</span>
          <span class="text-right text-xs text-stone">{{ kb.recent }}</span>
        </button>
      </div>
    </section>

    <!-- All KBs -->
    <section>
      <div class="mb-2 flex items-center justify-between">
        <h3 class="text-xs font-semibold text-stone">全部知识库</h3>
        <span class="text-xs text-muted">{{ filtered.unpinned.length + filtered.pinned.length }} 个</span>
      </div>
      <div v-if="viewMode === 'grid'" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="kb in filtered.unpinned"
          :key="kb.id"
          class="rounded-xl border border-hairline bg-white p-4 text-left transition hover:border-brand-blue hover:shadow-elevated"
          @click="$emit('selectKb', kb.id)"
        >
          <div class="flex items-center gap-3">
            <div class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-orange-50 text-brand-orange">
              <BookOpen class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-semibold text-charcoal">{{ kb.name }}</div>
              <div class="mt-0.5 text-xs text-muted">{{ kb.docs }} 文档 · {{ kb.visibility }}</div>
            </div>
          </div>
          <div class="mt-2 text-xs text-muted">{{ kb.department }} · {{ kb.recent }}</div>
        </button>
      </div>
      <div v-else class="overflow-hidden rounded-xl border border-hairline bg-white">
        <div class="grid grid-cols-[1fr_120px_100px] border-b border-hairline bg-surface px-4 py-2.5 text-xs font-medium text-stone">
          <span>名称</span><span class="text-center">文档数</span><span class="text-right">更新时间</span>
        </div>
        <button
          v-for="kb in filtered.unpinned"
          :key="kb.id"
          class="grid w-full grid-cols-[1fr_120px_100px] items-center border-b border-hairline px-4 py-2.5 text-left text-sm last:border-0 hover:bg-surface"
          @click="$emit('selectKb', kb.id)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <BookOpen class="h-4 w-4 shrink-0 text-brand-orange" />
            <span class="truncate font-medium text-charcoal">{{ kb.name }}</span>
          </div>
          <span class="text-center text-xs text-stone">{{ kb.docs }}</span>
          <span class="text-right text-xs text-stone">{{ kb.recent }}</span>
        </button>
      </div>
    </section>

    <div v-if="filtered.pinned.length === 0 && filtered.unpinned.length === 0" class="py-12 text-center text-body-sm text-muted">
      无匹配知识库
    </div>
  </div>
</template>
