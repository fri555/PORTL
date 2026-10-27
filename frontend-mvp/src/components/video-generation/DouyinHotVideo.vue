<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Copy, FileSearch, Plus, Trash2, X } from 'lucide-vue-next'

interface QueryImage {
  name: string
  uri: string
  mimeType: string
}
interface QueryForm {
  text: string
  image: QueryImage | null
  productNumber: string
  strategyMode: 'default' | 'custom'
  recallRoutes: string[]
  competitorBrands: string
  enableCompetitorMatching: boolean
  isAiGenerated: string
  publishedWithinDays: string | number
  minVvAll: string | number
  authorScope: string
  metricWindowDays: string | number
  useRanking: boolean
  wSubject: string
  wSellingPoints: string
  wAudience: string
  limit: string
}
interface LocalQuery {
  id: string
  name: string
  createdAt: string
  status: 'saved'
  form: QueryForm
  query: Record<string, any>
}
const STORAGE_KEY = 'tianma-douyin-prototype-v1'
const routes = [
  {
    id: 'author_normalized_creative_breakout',
    name: '同品类作者创意爆款',
    description: '哪些视频明显跑赢作者自己的常态',
  },
  {
    id: 'competitor_product_selling_point',
    name: '竞品商品/卖点相似',
    description: '哪些竞品素材与本品主体和卖点最匹配',
  },
  {
    id: 'leaf_category_high_engagement',
    name: '同叶子类目高转化视频',
    description: '哪些同品视频最会把商品点击出来',
  },
  {
    id: 'parent_category_hook_transfer',
    name: '服装大类前 3 秒结构迁移',
    description: '同定位服装里哪些开头结构值得迁移',
  },
  {
    id: 'recent_high_exposure',
    name: '竞品近期高曝光播放',
    description: '竞品近期哪些素材曝光 / 播放快速上涨',
  },
]
const steps = ['查询内容', '召回策略', '筛选排序', '结果']
const tabs = [
  { value: '', label: '全部' },
  { value: 'saved', label: '已保存查询' },
  { value: 'QUEUED', label: '排队中' },
  { value: 'RUNNING', label: '召回中' },
  { value: 'SUCCEEDED', label: '已完成' },
  { value: 'FAILED', label: '已失败' },
]
function blankForm(): QueryForm {
  return {
    text: '',
    image: null,
    productNumber: '',
    strategyMode: 'default',
    recallRoutes: [],
    competitorBrands: '',
    enableCompetitorMatching: false,
    isAiGenerated: 'any',
    publishedWithinDays: '',
    minVvAll: '',
    authorScope: 'any',
    metricWindowDays: '',
    useRanking: false,
    wSubject: '0.35',
    wSellingPoints: '0.35',
    wAudience: '0.30',
    limit: '20',
  }
}
function readTasks(): LocalQuery[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(data)
      ? data.filter(
          (item) =>
            item &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            item.status === 'saved' &&
            item.form &&
            typeof item.form.text === 'string' &&
            item.query &&
            typeof item.query === 'object',
        )
      : []
  } catch {
    return []
  }
}
const tasks = ref(readTasks())
const mode = ref<'list' | 'create' | 'view'>('list')
const step = ref(1)
const form = ref<QueryForm>(blankForm())
const error = ref('')
const notice = ref('')
const reading = ref(false)
const statusFilter = ref('')
const page = ref(1)
const deleting = ref('')
const currentTask = ref<LocalQuery | null>(null)
const readonly = computed(() => mode.value === 'view')
const filteredTasks = computed(() =>
  tasks.value.filter((task) => !statusFilter.value || task.status === statusFilter.value),
)
const pageCount = computed(() => Math.max(1, Math.ceil(filteredTasks.value.length / 8)))
const visibleTasks = computed(() => filteredTasks.value.slice((page.value - 1) * 8, page.value * 8))
watch(statusFilter, () => {
  page.value = 1
})
watch(
  () => form.value.strategyMode,
  (value) => {
    if (value === 'custom' && !form.value.recallRoutes.length)
      form.value.recallRoutes = routes.slice(0, 4).map((route) => route.id)
  },
)
function createTask(source?: LocalQuery) {
  form.value = source ? JSON.parse(JSON.stringify(source.form)) : blankForm()
  currentTask.value = null
  step.value = 1
  error.value = ''
  notice.value = ''
  mode.value = 'create'
}
function viewTask(task: LocalQuery) {
  form.value = { ...blankForm(), ...JSON.parse(JSON.stringify(task.form)) }
  currentTask.value = task
  step.value = 4
  error.value = ''
  mode.value = 'view'
}
function backToList() {
  mode.value = 'list'
  error.value = ''
  notice.value = ''
}
function goStep(target: number) {
  if (readonly.value || target < step.value) {
    step.value = target
    error.value = ''
    notice.value = ''
  }
}
function buildQuery(): Record<string, any> {
  const value = form.value
  const filters: Record<string, any> = { enableCompetitorMatching: value.enableCompetitorMatching }
  const brands = value.competitorBrands
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
  if (brands.length) filters.competitorBrands = brands
  if (value.isAiGenerated !== 'any') filters.isAiGenerated = value.isAiGenerated === 'yes'
  for (const name of ['publishedWithinDays', 'minVvAll', 'metricWindowDays'] as const)
    if (String(value[name]).trim()) filters[name] = Number(value[name])
  if (value.authorScope === 'blue_v') filters.authorScope = 'institution_certified_classify_0'
  return {
    recallStrategyType: value.strategyMode === 'custom' ? 'CUSTOM' : 'DEFAULT',
    recallRoutes: value.strategyMode === 'custom' ? [...value.recallRoutes] : [],
    filters,
    limit: Number(value.limit),
    ...(value.text.trim() ? { queryText: value.text.trim() } : {}),
    ...(value.image ? { imageUrl: value.image.uri, imageMimeType: value.image.mimeType } : {}),
    ...(value.useRanking
      ? {
          weights: {
            subject: Number(value.wSubject),
            sellingPoints: Number(value.wSellingPoints),
            audience: Number(value.wAudience),
          },
        }
      : {}),
  }
}
function validateFilters() {
  const value = form.value
  for (const field of [
    { key: 'publishedWithinDays', label: '发布天数' },
    { key: 'minVvAll', label: '累计播放量下限' },
    { key: 'metricWindowDays', label: '指标统计口径' },
  ] as const) {
    if (String(value[field.key]).trim()) {
      const number = Number(value[field.key])
      if (
        !Number.isInteger(number) ||
        number < 1 ||
        (field.key === 'metricWindowDays' && number > 3650)
      )
        return `${field.label}请填写${field.key === 'metricWindowDays' ? ' 1-3650 的' : ''}正整数`
    }
  }
  if (value.useRanking) {
    const weights = [value.wSubject, value.wSellingPoints, value.wAudience]
    if (weights.some((weight) => !weight.trim())) return '请填写主体、卖点和人群权重'
    if (weights.some((weight) => !Number.isFinite(Number(weight)) || Number(weight) < 0))
      return '排序权重必须为非负数'
    if (Math.abs(weights.reduce((sum, weight) => sum + Number(weight), 0) - 1) > 0.001)
      return '三个权重之和必须等于 1.0'
  }
  if (!value.limit.trim()) return '请输入返回条数'
  if (!Number.isInteger(Number(value.limit)) || Number(value.limit) < 1 || Number(value.limit) > 20)
    return '返回条数范围为 1-20，请填写整数'
  return ''
}
function next() {
  error.value = ''
  notice.value = ''
  if (readonly.value) {
    step.value = Math.min(4, step.value + 1)
    return
  }
  if (reading.value) return
  if (step.value === 1 && !form.value.text.trim() && !form.value.image) {
    error.value = '商品描述与商品图片至少填一项'
    return
  }
  if (
    step.value === 2 &&
    form.value.strategyMode === 'custom' &&
    (form.value.recallRoutes.length < 1 || form.value.recallRoutes.length > 5)
  ) {
    error.value = '请至少选择一个召回渠道，最多选择 5 个召回渠道'
    return
  }
  if (step.value === 3) {
    error.value = validateFilters()
    if (error.value) return
    const saved: LocalQuery = {
      id: 'douyin-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      name: form.value.text.trim().slice(0, 30) || '仅图片查询',
      createdAt: new Date().toISOString(),
      status: 'saved',
      form: JSON.parse(JSON.stringify(form.value)),
      query: buildQuery(),
    }
    const updated = [saved, ...tasks.value]
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {
      error.value = '本地存储空间不足，请减少图片大小或清理本地演示任务后重试'
      return
    }
    tasks.value = updated
    currentTask.value = saved
  }
  step.value = Math.min(4, step.value + 1)
}
async function selectImage(file?: File) {
  if (!file || reading.value) return
  error.value = ''
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    error.value = '仅支持PNG、JPG、JPEG格式的图片'
    return
  }
  if (file.size > 3150000) {
    error.value = '图片不能超过 3.15MB'
    return
  }
  reading.value = true
  try {
    const uri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('读取失败'))
      reader.readAsDataURL(file)
    })
    form.value.image = { name: file.name, uri, mimeType: file.type }
  } catch {
    error.value = '图片读取失败，请重新选择'
  } finally {
    reading.value = false
  }
}
function imageChanged(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  void selectImage(file)
}
function lookupProduct() {
  error.value = form.value.productNumber.trim() ? '' : '请输入货号'
  notice.value = form.value.productNumber.trim()
    ? '原型演示：已保留货号，请补充商品描述或图片。'
    : ''
}
function confirmDelete() {
  const updated = tasks.value.filter((task) => task.id !== deleting.value)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    tasks.value = updated
    deleting.value = ''
    page.value = Math.min(page.value, pageCount.value)
  } catch {
    error.value = '本地任务删除失败，请重试'
  }
}
const summary = computed(() => {
  const value = form.value
  return [
    ['商品描述', value.text.trim() || '未填写'],
    ['商品图片', value.image?.name || '未选择'],
    ['货号', value.productNumber || '未填写'],
    [
      '召回策略',
      value.strategyMode === 'default'
        ? '默认四路'
        : routes
            .filter((route) => value.recallRoutes.includes(route.id))
            .map((route) => route.name)
            .join('、'),
    ],
    ['竞品品牌', value.competitorBrands || '自动发现'],
    ['竞品识别', value.enableCompetitorMatching ? '启用' : '关闭'],
    [
      '是否AI生成',
      value.isAiGenerated === 'any'
        ? '不限'
        : value.isAiGenerated === 'yes'
          ? '只要 AI 生成'
          : '只要非 AI 生成',
    ],
    ['发布于最近 N天', value.publishedWithinDays || '不限'],
    ['累计播放量下限', value.minVvAll || '不限'],
    ['作者范围', value.authorScope === 'blue_v' ? '仅蓝 V 机构认证作者' : '不限'],
    ['指标统计口径（天）', value.metricWindowDays || '不限'],
    [
      '排序权重',
      value.useRanking
        ? `主体 ${value.wSubject} / 卖点 ${value.wSellingPoints} / 人群 ${value.wAudience}`
        : '未启用',
    ],
    ['返回条数', value.limit],
  ]
})
</script>

<template>
  <div class="douyin-page">
    <template v-if="mode === 'list'">
      <header class="list-header">
        <div>
          <h1>抖音爆款视频</h1>
          <span>管理你的素材召回任务</span>
        </div>
        <button type="button" class="primary" data-testid="douyin-create" @click="createTask()">
          <Plus :size="16" />新建
        </button>
      </header>
      <div role="tablist" aria-label="召回任务状态" class="status-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          role="tab"
          :aria-selected="statusFilter === tab.value"
          :class="{ active: statusFilter === tab.value }"
          @click="statusFilter = tab.value"
        >
          {{ tab.label }}
          <small>{{ !tab.value || tab.value === 'saved' ? tasks.length : 0 }}</small>
        </button>
      </div>
      <div v-if="!visibleTasks.length" class="empty-state">
        <FileSearch :size="48" :stroke-width="1" /><strong>{{
          tasks.length ? '暂无数据' : '暂无抖音爆款视频任务'
        }}</strong>
        <p v-if="!tasks.length">请点击「新建」按钮开始创建第一个任务</p>
      </div>
      <div v-else class="task-list">
        <article
          v-for="task in visibleTasks"
          :key="task.id"
          class="task-card"
          data-testid="douyin-task-card"
        >
          <button
            type="button"
            class="task-main"
            data-testid="douyin-task-open"
            @click="viewTask(task)"
          >
            <img v-if="task.form.image" :src="task.form.image.uri" alt="" /><FileSearch
              v-else
              :size="28"
            /><span
              ><strong>{{ task.name }}</strong
              ><small
                >已保存查询 · 原型演示 ·
                {{ new Date(task.createdAt).toLocaleString('zh-CN', { hour12: false }) }}</small
              ></span
            ></button
          ><button
            type="button"
            class="icon-button"
            title="复用查询"
            aria-label="复用查询"
            @click="createTask(task)"
          >
            <Copy :size="15" /></button
          ><button
            type="button"
            class="icon-button"
            title="删除任务"
            aria-label="删除任务"
            data-testid="douyin-task-delete"
            @click="deleting = task.id"
          >
            <Trash2 :size="15" />
          </button>
        </article>
      </div>
      <footer class="list-footer">
        <span
          >共 {{ filteredTasks.length }} 项，{{ filteredTasks.length ? page : 0 }} /
          {{ filteredTasks.length ? pageCount : 0 }}</span
        >
        <div>
          <button type="button" :disabled="page <= 1" aria-label="上一页" @click="page--">‹</button
          ><button type="button" :disabled="page >= pageCount" aria-label="下一页" @click="page++">
            ›
          </button>
        </div>
      </footer>
    </template>
    <template v-else>
      <header class="breadcrumb">
        <button type="button" data-testid="douyin-back-list" @click="backToList">
          抖音爆款视频</button
        ><span>›</span><strong>{{ readonly ? '查看任务' : '新增任务' }}</strong>
      </header>
      <div class="wizard-wrapper">
        <nav class="stepper" aria-label="查询步骤">
          <template v-for="(label, index) in steps" :key="label"
            ><span v-if="index" class="step-line" /><button
              type="button"
              :disabled="!readonly && index + 1 > step"
              :aria-current="index + 1 === step ? 'step' : undefined"
              :class="{ active: index + 1 === step, done: index + 1 < step }"
              @click="goStep(index + 1)"
            >
              <span>{{ index + 1 }}</span
              >{{ label }}
            </button></template
          >
        </nav>
        <form class="wizard-body" @submit.prevent="next">
          <fieldset :disabled="readonly || reading" class="wizard-fields">
            <section v-if="step === 1" data-testid="douyin-step-query" class="step-content">
              <div class="section-head">
                <h2>查询内容</h2>
                <small>填写商品描述或上传商品图片，快速定位匹配素材</small>
              </div>
              <div class="section-head">
                <h3>商品信息 <span class="required">*</span></h3>
                <small>商品描述与商品图片至少填一项</small>
              </div>
              <div class="query-grid">
                <label class="field"
                  >商品描述<textarea
                    v-model="form.text"
                    rows="4"
                    aria-label="商品描述"
                    placeholder="描述你的商品，例如：专业缓震跑步鞋，轻便透气回弹，适合马拉松和日常慢跑人群"
                  />
                </label>
                <div class="field">
                  <span>商品图片</span>
                  <div
                    class="upload-row"
                    @dragover.prevent
                    @drop.prevent="selectImage($event.dataTransfer?.files[0])"
                  >
                    <label class="upload-box"
                      ><img v-if="form.image" :src="form.image.uri" alt="商品图片" /><template
                        v-else
                        ><Plus :size="20" /><small>{{
                          reading ? '读取中…' : '点击上传'
                        }}</small></template
                      ><input
                        type="file"
                        accept=".png,.jpg,.jpeg"
                        aria-label="商品图片"
                        @change="imageChanged" /></label
                    ><small>支持PNG、JPG、JPEG，≤ 3.15MB</small
                    ><button
                      v-if="form.image"
                      type="button"
                      class="icon-button"
                      aria-label="移除商品图片"
                      @click="form.image = null"
                    >
                      <X :size="14" />
                    </button>
                  </div>
                </div>
              </div>
              <label class="field product-field"
                >货号查询
                <div class="lookup-row">
                  <input
                    v-model="form.productNumber"
                    aria-label="货号查询"
                    placeholder="输入货号，如 EG4958（选填）"
                  /><button type="button" @click="lookupProduct">查询</button>
                </div></label
              >
            </section>
            <section v-else-if="step === 2" data-testid="douyin-step-strategy" class="step-content">
              <div class="section-head">
                <h2>召回策略</h2>
                <small>决定从哪里找素材；不选则使用默认四路</small>
              </div>
              <h3>渠道选择方式</h3>
              <label class="option-card"
                ><input
                  v-model="form.strategyMode"
                  type="radio"
                  value="default"
                  name="strategy"
                /><span><strong>默认四路</strong><small>系统自动使用四路召回</small></span></label
              ><label class="option-card"
                ><input
                  v-model="form.strategyMode"
                  type="radio"
                  value="custom"
                  name="strategy"
                /><span><strong>自定义多个渠道</strong><small>勾选 1~5 个渠道</small></span></label
              >
              <div v-if="form.strategyMode === 'custom'" class="route-grid">
                <label v-for="route in routes" :key="route.id" class="route-card"
                  ><input
                    v-model="form.recallRoutes"
                    type="checkbox"
                    :value="route.id"
                    data-testid="recall-channel"
                  /><span
                    ><strong>{{ route.name }}</strong
                    ><small>{{ route.description }}</small></span
                  ></label
                >
              </div>
            </section>
            <section
              v-else-if="step === 3"
              data-testid="douyin-step-filter"
              class="step-content filter-step"
            >
              <div class="section-head">
                <h2>筛选排序</h2>
                <small>按品牌、发布时间、播放量、AI 生成等维度过滤，并调整排序权重</small>
              </div>
              <h3>过滤条件</h3>
              <label class="field"
                >竞品品牌<input
                  v-model="form.competitorBrands"
                  aria-label="竞品品牌"
                  placeholder="多个用逗号分隔；留空由系统自动发现" /></label
              ><label class="toggle-card"
                ><span
                  ><strong>启用竞品识别</strong><small>关闭后改为整个品类数据召回。</small></span
                ><input
                  v-model="form.enableCompetitorMatching"
                  type="checkbox"
                  role="switch"
                  aria-label="启用竞品识别"
              /></label>
              <div class="filter-grid">
                <label class="field"
                  >是否AI生成<select v-model="form.isAiGenerated" aria-label="是否AI生成">
                    <option value="any">不限</option>
                    <option value="yes">只要 AI 生成</option>
                    <option value="no">只要非 AI 生成</option>
                  </select></label
                ><label class="field"
                  >发布于最近 N天<input
                    v-model="form.publishedWithinDays"
                    type="number"
                    min="1"
                    step="1"
                    aria-label="发布于最近 N天"
                    placeholder="留空不限" /></label
                ><label class="field"
                  >累计播放量下限<input
                    v-model="form.minVvAll"
                    type="number"
                    min="1"
                    step="1"
                    aria-label="累计播放量下限"
                    placeholder="留空不限" /></label
                ><label class="field"
                  >作者范围<select v-model="form.authorScope" aria-label="作者范围">
                    <option value="any">不限</option>
                    <option value="blue_v">仅蓝 V 机构认证作者</option>
                  </select></label
                >
              </div>
              <label class="field half-field"
                >指标统计口径（天）<input
                  v-model="form.metricWindowDays"
                  type="number"
                  min="1"
                  max="3650"
                  step="1"
                  aria-label="指标统计口径（天）"
                  placeholder="留空不限" /></label
              ><label class="ranking-head"
                ><h3>排序权重</h3>
                <input
                  v-model="form.useRanking"
                  type="checkbox"
                  role="switch"
                  aria-label="启用排序权重"
              /></label>
              <div v-if="form.useRanking" class="weight-area">
                <small>三项权重均为非负数，合计须等于 1.0。</small>
                <div class="filter-grid">
                  <label class="field"
                    >主体 <span class="required">*</span
                    ><input
                      v-model="form.wSubject"
                      aria-label="主体权重"
                      placeholder="请输入主体" /></label
                  ><label class="field"
                    >卖点 <span class="required">*</span
                    ><input
                      v-model="form.wSellingPoints"
                      aria-label="卖点权重"
                      placeholder="请输入卖点" /></label
                  ><label class="field"
                    >人群 <span class="required">*</span
                    ><input v-model="form.wAudience" aria-label="人群权重" placeholder="请输入人群"
                  /></label>
                </div>
              </div>
              <h3>返回设置</h3>
              <label class="field half-field"
                >返回条数 <span class="required">*</span
                ><input v-model="form.limit" aria-label="返回条数" placeholder="请输入返回条数"
              /></label>
            </section>
          </fieldset>
          <section v-if="step === 4" data-testid="douyin-step-result" class="result-section">
            <p class="demo-badge">原型演示</p>
            <h2>查询条件已保存</h2>
            <p>当前展示已保存的查询条件，视频召回结果待接入。</p>
            <div class="result-empty">
              <FileSearch :size="32" :stroke-width="1.3" /><span>暂无召回视频</span>
            </div>
            <details open>
              <summary>查看查询条件</summary>
              <dl data-testid="query-summary">
                <template v-for="[label, value] in summary" :key="label"
                  ><dt>{{ label }}</dt>
                  <dd>{{ value }}</dd></template
                >
              </dl>
            </details>
          </section>
          <p v-if="error" role="alert" class="form-error">{{ error }}</p>
          <p v-if="notice" role="status" class="form-notice">{{ notice }}</p>
          <footer class="wizard-footer">
            <button v-if="step > 1 && step < 4" type="button" @click="goStep(step - 1)">
              上一步</button
            ><button
              v-if="step < 4"
              class="primary"
              type="submit"
              :disabled="reading"
              data-testid="douyin-next"
            >
              {{
                step === 3 ? (readonly ? '下一步' : '提交查询') : '下一步：' + steps[step]
              }}</button
            ><template v-else
              ><button type="button" @click="backToList">返回任务列表</button
              ><button
                v-if="currentTask"
                type="button"
                class="primary"
                @click="createTask(currentTask)"
              >
                复用查询
              </button></template
            >
          </footer>
        </form>
      </div>
    </template>
    <p v-if="error && mode === 'list'" role="alert" class="form-error">{{ error }}</p>
    <div v-if="deleting" class="modal-overlay" @click.self="deleting = ''">
      <section
        class="delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label="确认删除该召回任务"
      >
        <h2>确认删除该召回任务？</h2>
        <footer>
          <button type="button" @click="deleting = ''">取消</button
          ><button
            type="button"
            class="danger"
            data-testid="douyin-confirm-delete"
            @click="confirmDelete"
          >
            删除
          </button>
        </footer>
      </section>
    </div>
  </div>
</template>

<style scoped>
.douyin-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 620px;
  height: 100%;
  padding: 20px;
  color: #18181b;
  font-size: 13px;
}
.douyin-page h1,
.douyin-page h2,
.douyin-page h3,
.douyin-page p {
  margin: 0;
}
.douyin-page h1 {
  font-size: 16px;
  font-weight: 500;
}
.douyin-page h2,
.douyin-page h3 {
  font-size: 14px;
  font-weight: 500;
}
.douyin-page button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 32px;
  border: 1px solid #dfe2e6;
  border-radius: 6px;
  background: #fff;
  padding: 5px 14px;
  color: #18181b;
  font: inherit;
  cursor: pointer;
}
.douyin-page button:hover {
  background: #f6f6f7;
}
.douyin-page button.primary {
  border-color: #18181b;
  background: #18181b;
  color: #fff;
}
.douyin-page button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.list-header > div {
  display: flex;
  align-items: center;
  gap: 12px;
}
.list-header span,
.status-tabs small {
  font-size: 12px;
  color: #92949a;
}
.status-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.status-tabs button {
  min-height: 28px;
  border: 0;
  background: transparent;
  padding: 3px 12px;
  color: #737780;
  white-space: nowrap;
}
.status-tabs button.active {
  background: #f3f4f5;
  color: #18181b;
}
.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.task-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 74px;
  border: 1px solid #e4e4e7;
  border-radius: 9px;
  padding: 12px 16px;
}
.douyin-page .task-main {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
}
.task-main > svg {
  flex: none;
  color: #92949a;
}
.task-main > img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
}
.task-main > span {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}
.task-main strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}
.task-main small {
  font-size: 11px;
  color: #92949a;
}
.douyin-page .icon-button {
  width: 28px;
  min-height: 28px;
  flex: none;
  border: 0;
  background: transparent;
  padding: 0;
  color: #92949a;
}
.empty-state {
  display: flex;
  min-height: 300px;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: #b6bbc1;
}
.empty-state strong {
  color: #52545a;
  font-size: 14px;
  font-weight: 500;
}
.empty-state p {
  color: #92949a;
  font-size: 12px;
}
.list-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  color: #737780;
}
.list-footer > div {
  display: flex;
  gap: 8px;
}
.list-footer button {
  min-height: 28px;
  padding: 2px 10px;
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
}
.breadcrumb button {
  border: 0;
  padding: 0;
  min-height: 20px;
  color: #92949a;
}
.breadcrumb > span {
  color: #b0b3b8;
}
.breadcrumb strong {
  font-weight: 500;
}
.wizard-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: min(800px, 100%);
  min-height: 0;
  flex: 1;
  margin: 0 auto;
}
.stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 4px 0 8px;
}
.stepper > button {
  gap: 8px;
  min-height: 24px;
  border: 0;
  background: transparent;
  padding: 0;
  white-space: nowrap;
}
.stepper > button:disabled {
  opacity: 1;
  cursor: default;
}
.stepper > button > span {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #f2f3f4;
  color: #92949a;
}
.stepper > button.active > span,
.stepper > button.done > span {
  background: #0866ff;
  color: #fff;
}
.step-line {
  width: 44px;
  height: 1px;
  flex: none;
  background: #e5e7eb;
}
.wizard-body {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 16px;
}
.wizard-fields {
  display: contents;
  border: 0;
  margin: 0;
  padding: 0;
}
.step-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 720px;
}
.section-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.section-head > small,
.option-card small,
.route-card small,
.toggle-card small,
.weight-area > small {
  font-size: 11px;
  color: #92949a;
  line-height: 1.6;
}
.required {
  color: #ef4444;
}
.query-grid,
.filter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  line-height: 1.5;
}
.douyin-page input:not([type='checkbox']):not([type='radio']):not([type='file']),
.douyin-page select,
.douyin-page textarea {
  box-sizing: border-box;
  width: 100%;
  height: 32px;
  min-width: 0;
  border: 1px solid #dfe2e6;
  border-radius: 6px;
  background: #fff;
  padding: 5px 10px;
  outline: none;
  font: inherit;
}
.douyin-page textarea {
  height: 112px;
  resize: vertical;
  line-height: 1.7;
}
.douyin-page input::placeholder,
.douyin-page textarea::placeholder {
  font-size: 12px;
  color: #afb3ba;
}
.douyin-page input:focus,
.douyin-page textarea:focus,
.douyin-page select:focus {
  border-color: #a1a1aa;
}
.upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.upload-row > small {
  max-width: 100px;
  line-height: 1.8;
  color: #92949a;
  font-size: 11px;
}
.upload-box {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 80px;
  height: 80px;
  flex: none;
  overflow: hidden;
  border: 1px dashed #dfe2e6;
  border-radius: 6px;
  background: #fcfcff;
  cursor: pointer;
}
.upload-box > small {
  font-size: 11px;
  color: #92949a;
}
.upload-box input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
.upload-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.product-field {
  max-width: 360px;
}
.lookup-row {
  display: flex;
  gap: 12px;
}
.lookup-row button {
  flex: none;
}
.option-card,
.route-card {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #dfe2e6;
  border-radius: 6px;
  background: #fff;
  padding: 14px 16px;
  cursor: pointer;
}
.option-card > span,
.route-card > span,
.toggle-card > span {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.option-card strong,
.route-card strong,
.toggle-card strong {
  font-size: 13px;
  font-weight: 500;
}
.route-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.route-card {
  padding: 12px;
  font-size: 12px;
}
.route-card strong {
  font-size: 12px;
}
.filter-step {
  gap: 20px;
}
.toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #dfe2e6;
  border-radius: 6px;
  padding: 14px 16px;
  background: linear-gradient(#f7f7f9, #fff);
}
.ranking-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.half-field {
  max-width: 352px;
}
.weight-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.wizard-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  min-height: 56px;
  margin-top: auto;
}
.form-error {
  color: #dc3d36;
  font-size: 12px;
}
.form-notice {
  color: #737780;
  font-size: 12px;
}
.result-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  max-width: 800px;
}
.result-section > .demo-badge {
  align-self: flex-start;
  border-radius: 4px;
  background: #f4f4f5;
  padding: 3px 8px;
  color: #71717a;
  font-size: 11px;
}
.result-section > p {
  color: #92949a;
  font-size: 12px;
}
.result-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-direction: column;
  min-height: 140px;
  border: 1px dashed #e4e4e7;
  border-radius: 8px;
  color: #a1a1aa;
  font-size: 12px;
}
.result-section details {
  border: 1px solid #e4e4e7;
  border-radius: 8px;
  padding: 16px;
}
.result-section summary {
  cursor: pointer;
  font-weight: 500;
}
.result-section dl {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 12px;
  margin: 20px 0 0;
  font-size: 12px;
  line-height: 1.8;
}
.result-section dt {
  color: #92949a;
}
.result-section dd {
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0006;
  padding: 20px;
}
.delete-dialog {
  box-sizing: border-box;
  width: 360px;
  max-width: 100%;
  border-radius: 9px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 12px 40px #0002;
}
.delete-dialog footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}
.douyin-page button.danger {
  background: #dc3d36;
  border-color: #dc3d36;
  color: #fff;
}
@media (max-width: 720px) {
  .douyin-page {
    padding: 16px;
    gap: 16px;
  }
  .list-header > div {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
  .stepper {
    gap: 6px;
    justify-content: flex-start;
    overflow: auto;
  }
  .stepper > button {
    gap: 4px;
    font-size: 11px;
  }
  .step-line {
    width: 12px;
  }
  .query-grid,
  .route-grid,
  .filter-grid {
    grid-template-columns: 1fr;
  }
  .result-section dl {
    grid-template-columns: 100px minmax(0, 1fr);
  }
  .task-card {
    padding: 12px;
    gap: 6px;
  }
  .task-main small {
    font-size: 10px;
  }
}
</style>
