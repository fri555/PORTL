<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronLeft, BookOpen, MessageSquareText, X } from 'lucide-vue-next'
import type { SpaceKey, KnowledgeBaseItem, DocItem } from '@/types/knowledge'
import { knowledgeBases, allDocs, fileTrees } from '@/mock/knowledge'
import KbSidebar from '@/components/knowledge/KbSidebar.vue'
import KbListView from '@/components/knowledge/KbListView.vue'
import KbFileList from '@/components/knowledge/KbFileList.vue'
import KbPreviewPanel from '@/components/knowledge/KbPreviewPanel.vue'
import KbQaPanel from '@/components/knowledge/KbQaPanel.vue'

const activeSpace = ref<SpaceKey>('public')
const selectedKbId = ref<string | null>(null)
const sidebarCollapsed = ref(false)
const qaOpen = ref(true)
const previewDoc = ref<DocItem | null>(null)
const previewTabs = ref<DocItem[]>([])
const activeRightTab = ref('')
const kbSearch = ref('')
const fileSearch = ref('')

const currentKbs = computed(() => knowledgeBases[activeSpace.value])
const selectedKb = computed(() => currentKbs.value.find(kb => kb.id === selectedKbId.value))
const currentDocs = computed(() => selectedKbId.value ? (allDocs[selectedKbId.value] ?? []) : [])
const currentTree = computed(() => fileTrees[activeSpace.value])

function selectKb(id: string) {
  selectedKbId.value = id
  previewDoc.value = null
  previewTabs.value = []
  qaOpen.value = true
}

function deselectKb() {
  selectedKbId.value = null
  previewDoc.value = null
  previewTabs.value = []
}

function switchSpace(space: SpaceKey) {
  activeSpace.value = space
  selectedKbId.value = null
  previewDoc.value = null
  previewTabs.value = []
  qaOpen.value = false
}

function openPreview(doc: DocItem) {
  previewDoc.value = doc
  previewTabs.value = [doc, ...previewTabs.value.filter(d => d.name !== doc.name)].slice(0, 5)
  activeRightTab.value = doc.name
  qaOpen.value = true
}

function closePreview() {
  previewTabs.value = []
  activeRightTab.value = ''
  previewDoc.value = null
}

function closeRightTab(name: string) {
  previewTabs.value = previewTabs.value.filter(d => d.name !== name)
  if (previewDoc.value?.name === name) previewDoc.value = previewTabs.value[0] ?? null
  if (activeRightTab.value === name) activeRightTab.value = previewTabs.value[0]?.name ?? ''
}
</script>

<template>
  <div class="flex h-[calc(100vh-3.5rem)]">
    <!-- Sidebar -->
    <KbSidebar
      v-if="!sidebarCollapsed"
      :active-space="activeSpace"
      :tree="currentTree"
      :selected-kb-id="selectedKbId"
      @switch-space="switchSpace"
      @select-kb="selectKb"
      @toggle-collapse="sidebarCollapsed = true"
    />

    <!-- Main -->
    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header class="flex min-h-12 items-center border-b border-hairline bg-white px-4">
        <button
          v-if="sidebarCollapsed"
          class="mr-2 rounded-lg p-1.5 text-stone hover:bg-surface"
          @click="sidebarCollapsed = false"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <div class="flex items-center gap-2 text-sm">
          <button
            v-if="selectedKb"
            class="rounded-md px-2 py-0.5 text-xs text-stone hover:bg-surface"
            @click="deselectKb"
          >
            {{ activeSpace === 'public' ? '公共空间' : '个人空间' }}
          </button>
          <span v-if="selectedKb" class="text-hairline-soft">/</span>
          <span class="truncate font-medium text-charcoal">
            {{ selectedKb?.name || (activeSpace === 'public' ? '公共空间' : '个人空间') }}
          </span>
        </div>
      </header>

      <div class="flex flex-1 overflow-hidden">
        <!-- Main content area -->
        <div class="flex min-w-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">
          <!-- KB list view -->
          <KbListView
            v-if="!selectedKb"
            :kb-list="currentKbs"
            :search="kbSearch"
            :active-space="activeSpace"
            @select-kb="selectKb"
            @update:search="kbSearch = $event"
            @switch-space="switchSpace"
          />

          <!-- File list view -->
          <KbFileList
            v-if="selectedKb"
            :kb="selectedKb"
            :docs="currentDocs"
            :search="fileSearch"
            :tree="currentTree"
            :preview-open="!!previewDoc"
            @select-file="openPreview"
            @update:search="fileSearch = $event"
          />
        </div>

        <!-- Preview panel -->
        <KbPreviewPanel
          v-if="previewTabs.length"
          :tabs="previewTabs"
          :active-tab="activeRightTab"
          @close="closePreview"
          @close-tab="closeRightTab"
          @update:active-tab="activeRightTab = $event"
        />

        <!-- QA panel -->
        <KbQaPanel
          v-if="qaOpen"
          :kb-name="selectedKb?.name"
          :docs="currentDocs"
          :preview-doc="previewDoc"
          @close="qaOpen = false"
        />
      </div>
    </div>
  </div>
</template>
