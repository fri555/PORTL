<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  BookOpen,
  Upload,
  FileText,
  FileSpreadsheet,
  File,
  Presentation,
  FileType,
  Eye,
  Edit3,
  Trash2,
  Plus,
  X,
  Settings,
  Layers,
  Database,
  Building2,
} from 'lucide-vue-next'
import { knowledgeBases, knowledgeDocuments, getKnowledgeBase } from '@/mock/knowledge'
import type { KnowledgeBase, KnowledgeDocument } from '@/types/knowledge'
import WorkspaceBackButton from '@/components/common/WorkspaceBackButton.vue'

// ---- KB Tree ----
const selectedKbId = ref(knowledgeBases[0]?.id ?? 'kb01')
const selectedKb = computed(() => getKnowledgeBase(selectedKbId.value))

// Active tab in right panel
const activePanelTab = ref<'documents' | 'settings' | 'semantic'>('documents')

// ---- Documents ----
const docsForSelectedKb = computed(() => knowledgeDocuments[selectedKbId.value] ?? [])

// ---- Upload Dialog ----
const showUploadDialog = ref(false)
const uploadedFiles = ref<{ name: string; size: string }[]>([])

function simulateUpload() {
  uploadedFiles.value = [
    { name: '2026年Q3营销计划.pdf', size: '5.2MB' },
    { name: '竞品分析数据_7月.xlsx', size: '3.1MB' },
  ]
}

function closeUploadDialog() {
  showUploadDialog.value = false
  uploadedFiles.value = []
}

// ---- KB tree grouped by department ----
const kbByDepartment = computed(() => {
  const groups: Record<string, KnowledgeBase[]> = {}
  for (const kb of knowledgeBases) {
    if (!groups[kb.departmentName]) {
      groups[kb.departmentName] = []
    }
    groups[kb.departmentName].push(kb)
  }
  return groups
})

// ---- Helpers ----
function getFormatBadgeColor(format: string) {
  const map: Record<string, string> = {
    pdf: 'bg-red-100 text-red-700',
    docx: 'bg-blue-100 text-blue-700',
    xlsx: 'bg-green-100 text-green-700',
    pptx: 'bg-orange-100 text-orange-700',
    txt: 'bg-zinc-100 text-zinc-600',
  }
  return map[format] ?? 'bg-zinc-100 text-zinc-600'
}

function getFormatIcon(format: string) {
  const map: Record<string, any> = {
    pdf: FileText,
    docx: FileText,
    xlsx: FileSpreadsheet,
    pptx: Presentation,
    txt: FileType,
  }
  return map[format] ?? File
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    processing: '处理中',
    indexed: '已索引',
    failed: '失败',
  }
  return map[status] ?? status
}

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    processing: 'bg-blue-100 text-blue-700',
    indexed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  }
  return map[status] ?? 'bg-zinc-100 text-zinc-500'
}

function getVisibilityLabel(visibility: string): string {
  const map: Record<string, string> = {
    all: '全员可见',
    department: '部门可见',
    specific: '指定部门',
  }
  return map[visibility] ?? visibility
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
</script>

<template>
  <div class="flex h-[calc(100vh-4rem)]">
    <!-- Left Sidebar: KB Tree -->
    <aside class="w-64 shrink-0 border-r border-zinc-200 bg-white flex flex-col overflow-hidden">
      <div class="px-4 py-4 border-b border-zinc-100">
        <h2 class="text-sm font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <BookOpen class="size-4" />
          知识库列表
        </h2>
      </div>
      <div class="flex-1 overflow-y-auto py-2">
        <div v-for="(kbs, dept) in kbByDepartment" :key="dept" class="mb-1">
          <div class="px-4 py-2 text-xs font-medium text-zinc-400 flex items-center gap-1.5">
            <Building2 class="size-3" />
            {{ dept }}
          </div>
          <button
            v-for="kb in kbs"
            :key="kb.id"
            @click="selectedKbId = kb.id"
            :class="[
              'w-full text-left px-4 py-2.5 pl-8 text-sm transition-colors',
              selectedKbId === kb.id
                ? 'bg-orange-50 text-orange-600 font-medium border-r-2 border-orange-500'
                : 'text-zinc-600 hover:bg-zinc-50',
            ]"
          >
            <div class="truncate">{{ kb.name }}</div>
            <div class="text-xs text-zinc-400 mt-0.5">{{ kb.totalDocuments }} 篇文档</div>
          </button>
        </div>
      </div>
      <div class="px-4 py-3 border-t border-zinc-200">
        <button
          class="w-full rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-50 transition-colors inline-flex items-center justify-center gap-2"
        >
          <Plus class="size-4" />
          新建知识库
        </button>
      </div>
    </aside>

    <!-- Right Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- KB Header -->
      <div
        v-if="selectedKb"
        class="px-6 py-4 border-b border-zinc-200 bg-white"
      >
        <WorkspaceBackButton class="mb-3" />
        <h1 class="text-lg font-bold text-zinc-900">{{ selectedKb.name }}</h1>
        <div class="flex items-center gap-3 mt-1 text-xs text-zinc-400">
          <span>{{ selectedKb.departmentName }}</span>
          <span class="text-zinc-300">|</span>
          <span>{{ selectedKb.totalDocuments.toLocaleString() }} 篇文档</span>
          <span class="text-zinc-300">|</span>
          <span>{{ selectedKb.totalChunks.toLocaleString() }} chunks</span>
          <span class="text-zinc-300">|</span>
          <span>{{ getVisibilityLabel(selectedKb.visibility) }}</span>
        </div>
        <p class="text-sm text-zinc-500 mt-1.5">{{ selectedKb.description }}</p>

        <!-- Panel Tabs -->
        <div class="flex items-center gap-1 mt-4">
          <button
            @click="activePanelTab = 'documents'"
            :class="[
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              activePanelTab === 'documents'
                ? 'bg-orange-50 text-orange-600'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700',
            ]"
          >
            <FileText class="size-3.5 inline mr-1.5" />
            文档列表
          </button>
          <button
            @click="activePanelTab = 'settings'"
            :class="[
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              activePanelTab === 'settings'
                ? 'bg-orange-50 text-orange-600'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700',
            ]"
          >
            <Settings class="size-3.5 inline mr-1.5" />
            检索配置
          </button>
          <button
            @click="activePanelTab = 'semantic'"
            :class="[
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              activePanelTab === 'semantic'
                ? 'bg-orange-50 text-orange-600'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700',
            ]"
          >
            <Layers class="size-3.5 inline mr-1.5" />
            语义层
          </button>
        </div>
      </div>

      <!-- Panel Content -->
      <div class="flex-1 overflow-y-auto bg-zinc-50 p-6">
        <!-- Documents Tab -->
        <template v-if="activePanelTab === 'documents'">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
              文档列表 ({{ docsForSelectedKb.length }})
            </h3>
            <button
              @click="showUploadDialog = true"
              class="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              <Upload class="size-4" />
              上传文档
            </button>
          </div>

          <!-- Documents Table -->
          <div v-if="docsForSelectedKb.length > 0" class="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <table class="w-full">
              <thead>
                <tr class="border-b border-zinc-200 bg-zinc-50">
                  <th class="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">文档名称</th>
                  <th class="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">格式</th>
                  <th class="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">大小</th>
                  <th class="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">状态</th>
                  <th class="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">上传者</th>
                  <th class="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">日期</th>
                  <th class="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="doc in docsForSelectedKb"
                  :key="doc.id"
                  class="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 transition-colors"
                >
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <component :is="getFormatIcon(doc.format)" class="size-4 text-zinc-400 shrink-0" />
                      <span class="text-sm text-zinc-900 truncate max-w-[200px]">{{ doc.name }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <span
                      :class="['rounded-full px-2 py-0.5 text-xs font-medium uppercase', getFormatBadgeColor(doc.format)]"
                    >
                      {{ doc.format }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm text-zinc-500">{{ doc.size }}</td>
                  <td class="px-4 py-3">
                    <span
                      :class="['rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(doc.status)]"
                    >
                      {{ getStatusBadge(doc.status) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm text-zinc-500">{{ doc.uploadedBy }}</td>
                  <td class="px-4 py-3 text-sm text-zinc-400">{{ formatDate(doc.uploadedAt) }}</td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <button
                        class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                        title="预览"
                      >
                        <Eye class="size-3.5" />
                      </button>
                      <button
                        class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                        title="编辑"
                      >
                        <Edit3 class="size-3.5" />
                      </button>
                      <button
                        class="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="删除"
                      >
                        <Trash2 class="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- No documents -->
          <div v-else class="flex flex-col items-center justify-center py-16 text-zinc-400">
            <FileText class="size-12 mb-3" />
            <p class="text-sm">该知识库暂无文档</p>
            <button
              @click="showUploadDialog = true"
              class="mt-3 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              <Upload class="size-4" />
              上传第一篇文档
            </button>
          </div>
        </template>

        <!-- Settings Tab -->
        <template v-if="activePanelTab === 'settings' && selectedKb">
          <div class="max-w-2xl space-y-6">
            <!-- Retrieval Config -->
            <section class="rounded-xl border border-zinc-200 bg-white p-5">
              <h3 class="text-sm font-semibold text-zinc-700 mb-4 flex items-center gap-2">
                <Settings class="size-4" />
                检索配置
              </h3>
              <dl class="space-y-4">
                <div class="flex items-center justify-between">
                  <dt class="text-sm text-zinc-600">相似度阈值</dt>
                  <dd class="text-sm font-semibold text-zinc-900">{{ selectedKb.retrievalConfig.similarityThreshold }}</dd>
                </div>
                <div class="flex items-center justify-between">
                  <dt class="text-sm text-zinc-600">返回Top-K</dt>
                  <dd class="text-sm font-semibold text-zinc-900">{{ selectedKb.retrievalConfig.topK }}</dd>
                </div>
                <div class="flex items-center justify-between">
                  <dt class="text-sm text-zinc-600">显示引用来源</dt>
                  <dd>
                    <span
                      :class="[
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        selectedKb.retrievalConfig.showCitation
                          ? 'bg-green-100 text-green-700'
                          : 'bg-zinc-100 text-zinc-500',
                      ]"
                    >
                      {{ selectedKb.retrievalConfig.showCitation ? '已开启' : '已关闭' }}
                    </span>
                  </dd>
                </div>
                <div class="flex items-center justify-between">
                  <dt class="text-sm text-zinc-600">Embedding模型</dt>
                  <dd class="text-sm text-zinc-500 font-mono">{{ selectedKb.embeddingModel }}</dd>
                </div>
                <div class="flex items-center justify-between">
                  <dt class="text-sm text-zinc-600">向量存储</dt>
                  <dd class="text-sm text-zinc-500 font-mono">{{ selectedKb.vectorStore }}</dd>
                </div>
              </dl>
            </section>

            <!-- Visibility Settings -->
            <section class="rounded-xl border border-zinc-200 bg-white p-5">
              <h3 class="text-sm font-semibold text-zinc-700 mb-4 flex items-center gap-2">
                <Eye class="size-4" />
                可见性设置
              </h3>
              <div class="flex items-center justify-between">
                <dt class="text-sm text-zinc-600">当前可见范围</dt>
                <dd>
                  <span class="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-600">
                    {{ getVisibilityLabel(selectedKb.visibility) }}
                  </span>
                </dd>
              </div>
              <div
                v-if="selectedKb.visibleDepartments.length > 0"
                class="mt-3 pt-3 border-t border-zinc-100"
              >
                <p class="text-xs text-zinc-400 mb-2">可见部门</p>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="d in selectedKb.visibleDepartments"
                    :key="d"
                    class="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600"
                  >
                    {{ d }}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </template>

        <!-- Semantic Layer Tab -->
        <template v-if="activePanelTab === 'semantic'">
          <div class="max-w-2xl space-y-4">
            <div class="rounded-xl border border-zinc-200 bg-white p-5">
              <h3 class="text-sm font-semibold text-zinc-700 mb-4 flex items-center gap-2">
                <Layers class="size-4" />
                语义层实体
              </h3>
              <p class="text-sm text-zinc-500 mb-4">
                语义层定义了知识库中的实体、属性和关系，提升检索精度和推理能力。
              </p>

              <!-- Text-based tree visualization -->
              <div class="space-y-1 font-mono text-sm">
                <!-- Root entities -->
                <div class="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div class="flex items-center gap-2 text-zinc-800 font-semibold">
                    <Database class="size-4 text-orange-500" />
                    商品 (Product)
                  </div>
                  <div class="mt-2 ml-6 space-y-1 text-xs">
                    <div class="text-zinc-500">
                      <span class="text-orange-600">属性:</span>
                      SKU编号, 商品名称, 品牌, 类目, 价格, 库存
                    </div>
                    <div class="text-zinc-500">
                      <span class="text-blue-600">关系:</span>
                      <span class="text-zinc-400">→ 属于[品类], → 由[供应商]提供, → 参与[营销活动]</span>
                    </div>
                  </div>
                </div>

                <div class="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div class="flex items-center gap-2 text-zinc-800 font-semibold">
                    <Database class="size-4 text-blue-500" />
                    门店 (Store)
                  </div>
                  <div class="mt-2 ml-6 space-y-1 text-xs">
                    <div class="text-zinc-500">
                      <span class="text-orange-600">属性:</span>
                      门店编码, 门店名称, 区域, 面积, 店长
                    </div>
                    <div class="text-zinc-500">
                      <span class="text-blue-600">关系:</span>
                      <span class="text-zinc-400">→ 位于[城市], → 拥有[员工], → 销售[商品]</span>
                    </div>
                  </div>
                </div>

                <div class="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div class="flex items-center gap-2 text-zinc-800 font-semibold">
                    <Database class="size-4 text-green-500" />
                    供应商 (Supplier)
                  </div>
                  <div class="mt-2 ml-6 space-y-1 text-xs">
                    <div class="text-zinc-500">
                      <span class="text-orange-600">属性:</span>
                      供应商编码, 供应商名称, 等级, 合作年限
                    </div>
                    <div class="text-zinc-500">
                      <span class="text-blue-600">关系:</span>
                      <span class="text-zinc-400">→ 供应[商品], → 服务[区域]</span>
                    </div>
                  </div>
                </div>

                <div class="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div class="flex items-center gap-2 text-zinc-800 font-semibold">
                    <Database class="size-4 text-purple-500" />
                    客户 (Customer)
                  </div>
                  <div class="mt-2 ml-6 space-y-1 text-xs">
                    <div class="text-zinc-500">
                      <span class="text-orange-600">属性:</span>
                      客户ID, 姓名, 会员等级, 注册日期
                    </div>
                    <div class="text-zinc-500">
                      <span class="text-blue-600">关系:</span>
                      <span class="text-zinc-400">→ 购买[商品], → 访问[门店], → 产生[订单]</span>
                    </div>
                  </div>
                </div>

                <div class="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div class="flex items-center gap-2 text-zinc-800 font-semibold">
                    <Database class="size-4 text-amber-500" />
                    订单 (Order)
                  </div>
                  <div class="mt-2 ml-6 space-y-1 text-xs">
                    <div class="text-zinc-500">
                      <span class="text-orange-600">属性:</span>
                      订单编号, 下单时间, 金额, 状态, 支付方式
                    </div>
                    <div class="text-zinc-500">
                      <span class="text-blue-600">关系:</span>
                      <span class="text-zinc-400">→ 属于[客户], → 包含[商品], → 在[门店]产生</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Upload Dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showUploadDialog"
          class="fixed inset-0 z-50 flex items-center justify-center"
          @click.self="closeUploadDialog"
        >
          <div class="absolute inset-0 bg-black/40" />
          <div class="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                <Upload class="size-5 text-orange-500" />
                上传文档
              </h2>
              <button
                @click="closeUploadDialog"
                class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X class="size-5" />
              </button>
            </div>

            <!-- Drop zone -->
            <div
              class="rounded-xl border-2 border-dashed border-zinc-300 p-8 text-center hover:border-orange-400 hover:bg-orange-50/30 transition-colors cursor-pointer"
              @click="simulateUpload"
            >
              <Upload class="size-10 mx-auto text-zinc-300 mb-3" />
              <p class="text-sm text-zinc-500">点击选择文件或拖拽文件到此处</p>
              <p class="text-xs text-zinc-400 mt-1">支持 PDF, DOCX, XLSX, PPTX, TXT 格式</p>
            </div>

            <!-- Uploaded files list -->
            <div v-if="uploadedFiles.length > 0" class="mt-4 space-y-2">
              <p class="text-sm font-medium text-zinc-600">已选择文件</p>
              <div
                v-for="(file, idx) in uploadedFiles"
                :key="idx"
                class="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
              >
                <div class="flex items-center gap-2">
                  <FileText class="size-4 text-zinc-400" />
                  <span class="text-sm text-zinc-700">{{ file.name }}</span>
                </div>
                <span class="text-xs text-zinc-400">{{ file.size }}</span>
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-3">
              <button
                @click="closeUploadDialog"
                class="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                取消
              </button>
              <button
                :disabled="uploadedFiles.length === 0"
                class="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                开始上传
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
