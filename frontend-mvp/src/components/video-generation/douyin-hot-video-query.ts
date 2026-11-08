export const DOUYIN_RECALL_ROUTES = [
  'leaf_category_high_engagement',
  'competitor_product_selling_point',
  'parent_category_hook_transfer',
  'author_normalized_creative_breakout',
  'recent_high_exposure',
] as const

export const DEFAULT_DOUYIN_RECALL_ROUTES = DOUYIN_RECALL_ROUTES.slice(0, 4)

export type DouyinRecallRoute = (typeof DOUYIN_RECALL_ROUTES)[number]

export interface DouyinQueryImage {
  name: string
  uri: string
  mimeType: string
}

export interface DouyinQueryForm {
  text: string
  image: DouyinQueryImage | null
  productNumber: string
  strategyMode: 'default' | 'custom'
  recallRoutes: DouyinRecallRoute[]
  competitorBrands: string
  enableCompetitorMatching: boolean
  excludeTargetBrand: boolean
  isAiGenerated: 'any' | 'yes' | 'no'
  liveTrafficOnly: boolean
  publishedWithinDays: string
  minVvAll: string
  authorScope: 'any' | 'institution_certified'
  metricWindowDays: string
  minPeriodVvAll: string
  minAnchorCtr: string
  minFinishRate: string
  minPlay5sRate: string
  minLikeCntAll: string
  useRanking: boolean
  wSubject: string
  wSellingPoints: string
  wAudience: string
  limit: string
}

export interface DouyinQueryInput {
  text: string
  image: DouyinQueryImage | null
}

export interface FashionAssetFilters {
  competitor_brands?: string[]
  exclude_target_brand?: boolean
  is_ai_generated?: boolean
  published_within_days?: number
  min_vv_all?: number
  author_scope?: 'institution_certified_classify_0'
  metric_window_days?: number
  enable_competitor_matching: boolean
  live_traffic_only?: boolean
  min_period_vv_all?: number
  min_anchor_ctr?: number
  min_finish_rate?: number
  min_play_5s_rate?: number
  min_like_cnt_all?: number
}

export interface FashionAssetRequest {
  datasets: ['fashion_asset_pool']
  intent: 'hybrid_search'
  query: {
    text?: string
    image?:
      | { type: 'url'; url: string }
      | { type: 'base64'; data: string; mime_type: string }
  }
  per_dataset: {
    fashion_asset_pool: {
      filters: FashionAssetFilters
      strategy: {
        recall_routes: DouyinRecallRoute[]
      }
      ranking?: {
        weights?: {
          subject: number
          selling_points: number
          audience: number
        }
      }
    }
  }
  page: {
    limit: number
  }
  timeout_ms: 180000
}

export type QueryValidationResult =
  | { valid: true }
  | { valid: false; field: keyof DouyinQueryForm; message: string }

const recallRouteSet = new Set<string>(DOUYIN_RECALL_ROUTES)

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function inputString(value: unknown, fallback = '') {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

function uniqueAllowed<T extends string>(value: unknown, allowed: Set<string>): T[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is T => typeof item === 'string' && allowed.has(item)))]
}

function normalizeImage(value: unknown): DouyinQueryImage | null {
  if (!isRecord(value)) return null
  if (
    typeof value.name !== 'string' ||
    typeof value.uri !== 'string' ||
    typeof value.mimeType !== 'string'
  )
    return null
  return { name: value.name, uri: value.uri, mimeType: value.mimeType }
}

export function createDefaultDouyinQueryForm(): DouyinQueryForm {
  return {
    text: '',
    image: null,
    productNumber: '',
    strategyMode: 'default',
    recallRoutes: [],
    competitorBrands: '',
    enableCompetitorMatching: true,
    excludeTargetBrand: false,
    isAiGenerated: 'any',
    liveTrafficOnly: false,
    publishedWithinDays: '',
    minVvAll: '',
    authorScope: 'any',
    metricWindowDays: '',
    minPeriodVvAll: '',
    minAnchorCtr: '',
    minFinishRate: '',
    minPlay5sRate: '',
    minLikeCntAll: '',
    useRanking: false,
    wSubject: '0.35',
    wSellingPoints: '0.35',
    wAudience: '0.30',
    limit: '20',
  }
}

export function normalizeDouyinQueryForm(raw: unknown): DouyinQueryForm {
  const defaults = createDefaultDouyinQueryForm()
  if (!isRecord(raw)) return defaults

  const authorScope = raw.authorScope
  const isAiGenerated = raw.isAiGenerated
  return {
    text: inputString(raw.text),
    image: normalizeImage(raw.image),
    productNumber: inputString(raw.productNumber),
    strategyMode: raw.strategyMode === 'custom' ? 'custom' : 'default',
    recallRoutes: uniqueAllowed<DouyinRecallRoute>(raw.recallRoutes, recallRouteSet),
    competitorBrands: inputString(raw.competitorBrands),
    enableCompetitorMatching:
      typeof raw.enableCompetitorMatching === 'boolean'
        ? raw.enableCompetitorMatching
        : defaults.enableCompetitorMatching,
    excludeTargetBrand:
      typeof raw.excludeTargetBrand === 'boolean'
        ? raw.excludeTargetBrand
        : defaults.excludeTargetBrand,
    isAiGenerated:
      isAiGenerated === 'yes' || isAiGenerated === 'no' ? isAiGenerated : defaults.isAiGenerated,
    liveTrafficOnly:
      typeof raw.liveTrafficOnly === 'boolean' ? raw.liveTrafficOnly : defaults.liveTrafficOnly,
    publishedWithinDays: inputString(raw.publishedWithinDays),
    minVvAll: inputString(raw.minVvAll),
    authorScope:
      authorScope === 'institution_certified' || authorScope === 'blue_v'
        ? 'institution_certified'
        : defaults.authorScope,
    metricWindowDays: inputString(raw.metricWindowDays),
    minPeriodVvAll: inputString(raw.minPeriodVvAll),
    minAnchorCtr: inputString(raw.minAnchorCtr),
    minFinishRate: inputString(raw.minFinishRate),
    minPlay5sRate: inputString(raw.minPlay5sRate),
    minLikeCntAll: inputString(raw.minLikeCntAll),
    useRanking: typeof raw.useRanking === 'boolean' ? raw.useRanking : defaults.useRanking,
    wSubject: inputString(raw.wSubject, defaults.wSubject),
    wSellingPoints: inputString(raw.wSellingPoints, defaults.wSellingPoints),
    wAudience: inputString(raw.wAudience, defaults.wAudience),
    limit: inputString(raw.limit, defaults.limit),
  }
}

function splitBrands(value: string) {
  return value
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function invalid(
  field: keyof DouyinQueryForm,
  message: string,
): Extract<QueryValidationResult, { valid: false }> {
  return { valid: false, field, message }
}

function validateInteger(
  form: DouyinQueryForm,
  field: keyof DouyinQueryForm,
  label: string,
  min: number,
  max?: number,
): QueryValidationResult | null {
  const raw = String(form[field]).trim()
  if (!raw) return null
  const value = Number(raw)
  if (!Number.isInteger(value) || value < min || (max !== undefined && value > max)) {
    const range = max === undefined ? `不小于 ${min}` : `${min}-${max}`
    return invalid(field, `${label}请输入${range}的整数`)
  }
  return null
}

function validatePercentage(
  form: DouyinQueryForm,
  field: keyof DouyinQueryForm,
  label: string,
): QueryValidationResult | null {
  const raw = String(form[field]).trim()
  if (!raw) return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0 || value > 100)
    return invalid(field, `${label}请输入 0-100 的数值`)
  return null
}

export function validateDouyinQueryForm(rawForm: DouyinQueryForm): QueryValidationResult {
  const form = normalizeDouyinQueryForm(rawForm)
  if (form.enableCompetitorMatching && splitBrands(form.competitorBrands).length > 600)
    return invalid('competitorBrands', '竞品品牌最多填写 600 个')

  const integerChecks: Array<QueryValidationResult | null> = [
    validateInteger(form, 'publishedWithinDays', '发布时间', 1),
    validateInteger(form, 'minVvAll', '累计播放量', 0),
    validateInteger(form, 'metricWindowDays', '指标统计时间口径', 1, 3650),
    validateInteger(form, 'minPeriodVvAll', '窗口新增播放量', 0),
    validateInteger(form, 'minLikeCntAll', '点赞量', 0),
  ]
  const integerError = integerChecks.find(Boolean)
  if (integerError) return integerError

  if (form.minPeriodVvAll.trim() && !form.metricWindowDays.trim())
    return invalid('metricWindowDays', '填写窗口新增播放量前，请先填写指标统计时间口径')

  const percentageChecks: Array<QueryValidationResult | null> = [
    validatePercentage(form, 'minAnchorCtr', 'Anchor 点击率'),
    validatePercentage(form, 'minFinishRate', '完播率'),
    validatePercentage(form, 'minPlay5sRate', '5 秒播放率'),
  ]
  const percentageError = percentageChecks.find(Boolean)
  if (percentageError) return percentageError

  if (form.useRanking) {
    const weights: Array<[keyof DouyinQueryForm, string]> = [
      ['wSubject', form.wSubject],
      ['wSellingPoints', form.wSellingPoints],
      ['wAudience', form.wAudience],
    ]
    for (const [field, raw] of weights) {
      if (!raw.trim()) return invalid(field, '请填写主体、卖点和人群权重')
      const value = Number(raw)
      if (!Number.isFinite(value) || value < 0)
        return invalid(field, '排序权重必须为非负数')
    }
    if (weights.reduce((sum, [, raw]) => sum + Number(raw), 0) <= 0)
      return invalid('wSubject', '三个排序权重的总和必须大于 0')
  }

  const limitError = validateInteger(form, 'limit', '返回条数', 1, 20)
  if (limitError) return limitError
  if (!form.limit.trim()) return invalid('limit', '请输入返回条数')

  return { valid: true }
}

function addOptionalNumber(
  target: Record<string, unknown>,
  key: string,
  raw: string,
  transform: (value: number) => number = (value) => value,
) {
  if (!raw.trim()) return
  target[key] = transform(Number(raw))
}

function serializeImage(image: DouyinQueryImage): NonNullable<FashionAssetRequest['query']['image']> {
  const dataUrl = image.uri.match(/^data:([^;,]+);base64,([\s\S]+)$/)
  if (dataUrl)
    return {
      type: 'base64',
      data: dataUrl[2],
      mime_type: dataUrl[1] || image.mimeType,
    }
  return { type: 'url', url: image.uri }
}

export function buildFashionAssetRequest(
  rawForm: DouyinQueryForm,
  queryInput: DouyinQueryInput,
): FashionAssetRequest {
  const form = normalizeDouyinQueryForm(rawForm)
  const filters: FashionAssetFilters = {
    enable_competitor_matching: form.enableCompetitorMatching,
  }

  if (form.enableCompetitorMatching) {
    const brands = [...new Set(splitBrands(form.competitorBrands))]
    if (brands.length) filters.competitor_brands = brands
  }
  if (form.excludeTargetBrand) filters.exclude_target_brand = true
  if (form.isAiGenerated !== 'any') filters.is_ai_generated = form.isAiGenerated === 'yes'
  if (form.authorScope === 'institution_certified')
    filters.author_scope = 'institution_certified_classify_0'
  if (form.liveTrafficOnly) filters.live_traffic_only = true

  const numericFilters = filters as unknown as Record<string, unknown>
  addOptionalNumber(numericFilters, 'published_within_days', form.publishedWithinDays)
  addOptionalNumber(numericFilters, 'min_vv_all', form.minVvAll)
  addOptionalNumber(numericFilters, 'metric_window_days', form.metricWindowDays)
  addOptionalNumber(numericFilters, 'min_period_vv_all', form.minPeriodVvAll)
  addOptionalNumber(numericFilters, 'min_anchor_ctr', form.minAnchorCtr, (value) => value / 100)
  addOptionalNumber(numericFilters, 'min_finish_rate', form.minFinishRate, (value) => value / 100)
  addOptionalNumber(numericFilters, 'min_play_5s_rate', form.minPlay5sRate, (value) => value / 100)
  addOptionalNumber(numericFilters, 'min_like_cnt_all', form.minLikeCntAll)

  const query: FashionAssetRequest['query'] = {}
  const text = queryInput.text.trim()
  if (text) query.text = text
  if (queryInput.image) query.image = serializeImage(queryInput.image)

  const dataset: FashionAssetRequest['per_dataset']['fashion_asset_pool'] = {
    filters,
    strategy: {
      recall_routes:
        form.strategyMode === 'custom' && form.recallRoutes.length
          ? [...form.recallRoutes]
          : [...DEFAULT_DOUYIN_RECALL_ROUTES],
    },
  }

  if (form.useRanking) {
    dataset.ranking = {}
    dataset.ranking.weights = {
      subject: Number(form.wSubject),
      selling_points: Number(form.wSellingPoints),
      audience: Number(form.wAudience),
    }
  }

  return {
    datasets: ['fashion_asset_pool'],
    intent: 'hybrid_search',
    query,
    per_dataset: {
      fashion_asset_pool: dataset,
    },
    page: {
      limit: Number(form.limit),
    },
    timeout_ms: 180000,
  }
}
