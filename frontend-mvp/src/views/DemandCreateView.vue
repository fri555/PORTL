<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft, Sparkles, Upload, Image, FileText, X, AlertTriangle,
  Send, Zap, Paperclip, Check, Mic,
} from 'lucide-vue-next'
import { demands } from '@/mock/demands'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const router = useRouter()

const form = ref({
  title: '',
  department: '',
  urgency: 'medium' as 'low' | 'medium' | 'high' | 'critical',
  description: '',
  tags: [] as string[],
  tagInput: '',
})

const departments = ['电商运营部', '市场营销部', '仓储部', '客服部', '法务部', '财务部', '人力资源部', '零售运营部', '经营部', '产品部']

const aiFilling = ref(false)
const uploadedImages = ref<string[]>([])
const uploadedFiles = ref<string[]>([])
const aiExtractedText = ref<string | null>(null)
const aiExtracting = ref(false)
const showSimilar = ref(false)
const similarDemands = ref<typeof demands>([])
const submitted = ref(false)

// Tag management
function addTag() {
  const t = form.value.tagInput.trim()
  if (t && !form.value.tags.includes(t)) {
    form.value.tags.push(t)
  }
  form.value.tagInput = ''
}

function removeTag(tag: string) {
  form.value.tags = form.value.tags.filter((t) => t !== tag)
}

// AI fill description
async function aiFillDescription() {
  if (!form.value.title.trim()) return
  aiFilling.value = true
  await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800))
  const title = form.value.title
  form.value.description = `【需求背景】\n基于${title}的业务需求，当前相关部门在处理对应业务流程时仍依赖人工操作，效率较低且存在标准化不足的问题。\n\n【需求目标】\n通过引入AI能力，实现以下目标：\n1. 自动化核心业务流程，将处理时间缩短50%以上\n2. 建立标准化操作规范，确保输出质量一致性\n3. 支持跨部门协作，打通信息孤岛\n\n【预期效果】\n- 效率提升：预计月度节省人力成本约15人天\n- 质量提升：错误率降低60%\n- 覆盖范围：全集团相关部门\n\n【相关系统】\nOA系统、钉钉审批流、数据中台`
  if (!form.value.tags.length) {
    form.value.tags = ['AI', '自动化', '效率提升']
  }
  aiFilling.value = false
}

// Simulate image upload and AI extraction
function simulateImageUpload() {
  const newImage = `uploaded_${uploadedImages.value.length + 1}`
  uploadedImages.value.push(newImage)

  if (uploadedImages.value.length === 1) {
    aiExtracting.value = true
    setTimeout(() => {
      aiExtractedText.value = `【AI识别内容】\n从上传的截图中检测到以下信息：\n\n- 业务场景：${form.value.department || '电商运营'}流程中的痛点\n- 当前流程耗时：约45分钟/次\n- 人工操作步骤：5步\n- 涉及系统：ERP、钉钉、Excel\n- 关键数据：月均处理量约200次\n- 期望目标：自动化处理，效率提升3倍以上\n\n提示：以上为AI自动识别内容，请根据实际情况修改。`
      aiExtracting.value = false
    }, 2000)
  }
}

function simulateFileUpload() {
  uploadedFiles.value.push(`file_${uploadedFiles.value.length + 1}`)
}

function removeImage(uri: string) {
  uploadedImages.value = uploadedImages.value.filter((i) => i !== uri)
  if (uploadedImages.value.length === 0) {
    aiExtractedText.value = null
  }
}

function removeFile(name: string) {
  uploadedFiles.value = uploadedFiles.value.filter((f) => f !== name)
}

// Check similar demands
function checkSimilar() {
  if (!form.value.title.trim()) return
  const title = form.value.title.toLowerCase()
  similarDemands.value = demands.filter((d) => {
    return d.tags.some((t) => title.includes(t.toLowerCase())) || d.title.toLowerCase().includes(title.slice(0, 4))
  }).slice(0, 3)
  showSimilar.value = true
}

// Submit
async function handleSubmit() {
  if (!form.value.title.trim() || !form.value.department || !form.value.description.trim()) return
  submitted.value = true
  await new Promise((r) => setTimeout(r, 1500))
  router.push({ name: 'demands' })
}

const canSubmit = computed(() => form.value.title.trim() && form.value.department && form.value.description.trim())

const urgencyLabels: Record<string, { label: string; color: string }> = {
  low: { label: '低', color: 'bg-zinc-100 text-zinc-600' },
  medium: { label: '中', color: 'bg-amber-100 text-amber-700' },
  high: { label: '高', color: 'bg-orange-100 text-orange-700' },
  critical: { label: '紧急', color: 'bg-red-100 text-red-700' },
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-6">
    <button
      class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
      @click="router.push({ name: 'demands' })"
    >
      <ArrowLeft class="h-4 w-4" /> 返回需求池
    </button>

    <div class="mb-6">
      <h1 class="text-2xl font-bold">提交新需求</h1>
      <p class="mt-1 text-sm text-muted-foreground">描述你的AI需求，帮助团队识别并推动落地</p>
    </div>

    <div class="rounded-xl border bg-white p-6 shadow-sm">
      <!-- Title -->
      <div class="mb-5">
        <label class="mb-1.5 block text-sm font-medium">需求标题 <span class="text-red-500">*</span></label>
        <div class="flex gap-2">
          <Input v-model="form.title" placeholder="简要描述你的需求，如：AI智能合同审查系统（全集团推广）" class="flex-1 text-sm" />
          <Button variant="outline" size="icon" title="语音输入">
            <Mic class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- Department + Urgency -->
      <div class="mb-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium">所属部门 <span class="text-red-500">*</span></label>
          <select v-model="form.department" class="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">请选择部门</option>
            <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium">紧急程度</label>
          <div class="flex gap-2">
            <button
              v-for="(meta, key) in urgencyLabels"
              :key="key"
              :class="[
                'flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                form.urgency === key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:border-primary/50 hover:text-foreground',
              ]"
              @click="form.urgency = key as any"
            >{{ meta.label }}</button>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div class="mb-3">
        <div class="mb-1.5 flex items-center justify-between">
          <label class="text-sm font-medium">需求描述 <span class="text-red-500">*</span></label>
          <Button
            variant="outline"
            size="sm"
            class="h-7 gap-1 text-xs"
            :disabled="!form.title.trim() || aiFilling"
            @click="aiFillDescription"
          >
            <Sparkles v-if="!aiFilling" class="h-3.5 w-3.5 text-amber-500" />
            <Zap v-else class="h-3.5 w-3.5 animate-pulse text-amber-500" />
            {{ aiFilling ? 'AI生成中...' : 'AI帮我填写' }}
          </Button>
        </div>
        <textarea
          v-model="form.description"
          class="min-h-[200px] w-full resize-none rounded-lg border bg-white px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="请详细描述你的需求，包括：当前痛点、期望效果、涉及的数据/系统等..."
        />
      </div>

      <!-- Tags -->
      <div class="mb-5">
        <label class="mb-1.5 block text-sm font-medium">标签</label>
        <div class="flex flex-wrap items-center gap-2">
          <Badge
            v-for="t in form.tags"
            :key="t"
            variant="secondary"
            class="cursor-pointer gap-1 py-1"
            @click="removeTag(t)"
          >
            {{ t }} <X class="h-3 w-3" />
          </Badge>
          <Input v-model="form.tagInput" placeholder="添加标签..."
            class="h-8 w-32 text-xs"
            @keydown.enter.prevent="addTag"
            @keydown.,="addTag"
          />
        </div>
      </div>

      <!-- Image upload -->
      <div class="mb-5">
        <label class="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
          <Image class="h-4 w-4" /> 图片上传+AI理解
        </label>
        <p class="mb-2 text-xs text-muted-foreground">上传截图或示意图，AI将自动提取关键信息</p>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="img in uploadedImages"
            :key="img"
            class="relative flex h-20 w-20 items-center justify-center rounded-lg border bg-zinc-50"
          >
            <Image class="h-8 w-8 text-muted-foreground/40" />
            <button
              class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
              @click="removeImage(img)"
            >
              <X class="h-3 w-3" />
            </button>
          </div>
          <button
            class="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            @click="simulateImageUpload"
          >
            <div class="text-center">
              <Upload class="mx-auto h-5 w-5" />
              <span class="text-[10px]">上传截图</span>
            </div>
          </button>
        </div>
        <!-- AI extracted text -->
        <div v-if="aiExtracting" class="mt-3 rounded-lg border bg-amber-50/50 p-3">
          <p class="flex items-center gap-2 text-xs text-amber-700">
            <Sparkles class="h-3.5 w-3.5" /> AI正在识别图片内容...
          </p>
        </div>
        <div v-else-if="aiExtractedText" class="mt-3 rounded-lg border bg-blue-50/50 p-3">
          <p class="mb-2 text-xs font-medium text-blue-700">AI识别结果</p>
          <pre class="text-xs text-blue-800 whitespace-pre-wrap font-sans">{{ aiExtractedText }}</pre>
        </div>
      </div>

      <!-- File upload -->
      <div class="mb-5">
        <label class="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
          <Paperclip class="h-4 w-4" /> 附件上传
        </label>
        <div class="flex flex-wrap items-center gap-2">
          <div
            v-for="f in uploadedFiles"
            :key="f"
            class="flex items-center gap-1.5 rounded-lg border bg-zinc-50 px-3 py-1.5"
          >
            <FileText class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="text-xs">{{ f }}</span>
            <button class="hover:text-red-500" @click="removeFile(f)">
              <X class="h-3 w-3" />
            </button>
          </div>
          <button
            class="flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            @click="simulateFileUpload"
          >
            <Upload class="h-3.5 w-3.5" /> 上传文件
          </button>
        </div>
      </div>

      <!-- Similar demand check -->
      <div class="mb-5">
        <Button variant="outline" size="sm" class="gap-1.5 text-xs" @click="checkSimilar">
          <Search class="h-3.5 w-3.5" /> 检测重复需求
        </Button>
        <div v-if="showSimilar && similarDemands.length" class="mt-3 space-y-2">
          <p class="flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <AlertTriangle class="h-3.5 w-3.5" /> 发现以下相似需求
          </p>
          <div
            v-for="d in similarDemands"
            :key="d.id"
            class="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2"
          >
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate">{{ d.title }}</p>
              <p class="text-xs text-muted-foreground">{{ d.department }} · {{ d.status }}</p>
            </div>
            <Badge variant="secondary" class="ml-2 text-[10px]">已有{{ d.voteCount }}票</Badge>
          </div>
        </div>
        <div v-else-if="showSimilar && !similarDemands.length" class="mt-3 flex items-center gap-1.5 text-xs text-emerald-600">
          <Check class="h-3.5 w-3.5" /> 未发现重复需求，可以提交
        </div>
      </div>

      <!-- Submit -->
      <div class="flex items-center justify-between border-t pt-5">
        <div class="text-xs text-muted-foreground">
          <span class="text-red-500">*</span> 为必填项
        </div>
        <div class="flex gap-2">
          <Button variant="outline" @click="router.push({ name: 'demands' })">取消</Button>
          <Button
            :disabled="!canSubmit || submitted"
            class="gap-1.5"
            @click="handleSubmit"
          >
            <Send v-if="!submitted" class="h-4 w-4" />
            <Sparkles v-else class="h-4 w-4 animate-pulse" />
            {{ submitted ? '提交中...' : '提交需求' }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
