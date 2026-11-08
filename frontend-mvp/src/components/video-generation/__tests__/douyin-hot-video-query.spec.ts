import { describe, expect, it } from 'vitest'
import {
  buildFashionAssetRequest,
  createDefaultDouyinQueryForm,
  normalizeDouyinQueryForm,
  validateDouyinQueryForm,
} from '../douyin-hot-video-query'

describe('douyin hot video V2 fashion query contract', () => {
  it('creates product defaults without enabling optional ranking', () => {
    expect(createDefaultDouyinQueryForm()).toMatchObject({
      enableCompetitorMatching: true,
      excludeTargetBrand: false,
      liveTrafficOnly: false,
      useRanking: false,
      wSubject: '0.35',
      wSellingPoints: '0.35',
      wAudience: '0.30',
      limit: '20',
    })
    expect(createDefaultDouyinQueryForm()).not.toHaveProperty('secondary')
  })

  it('normalizes legacy stored forms and removes unsupported duplicate options', () => {
    const normalized = normalizeDouyinQueryForm({
      text: '  都市通勤连衣裙  ',
      strategyMode: 'custom',
      recallRoutes: [
        'competitor_product_selling_point',
        'competitor_product_selling_point',
        'unknown_route',
      ],
      enableCompetitorMatching: false,
      authorScope: 'blue_v',
      minVvAll: 0,
      secondary: ['vv_all', 'vv_all', 'share_cnt_all', 'unknown_metric'],
      limit: 10,
    })

    expect(normalized).toMatchObject({
      text: '  都市通勤连衣裙  ',
      strategyMode: 'custom',
      recallRoutes: ['competitor_product_selling_point'],
      enableCompetitorMatching: false,
      excludeTargetBrand: false,
      authorScope: 'institution_certified',
      minVvAll: '0',
      liveTrafficOnly: false,
      limit: '10',
    })
    expect(normalized).not.toHaveProperty('secondary')
  })

  it('accepts at most 600 nonempty competitor brands', () => {
    const accepted = createDefaultDouyinQueryForm()
    accepted.competitorBrands = Array.from({ length: 600 }, (_, index) => `品牌${index}`).join('，')
    expect(validateDouyinQueryForm(accepted)).toEqual({ valid: true })

    const rejected = createDefaultDouyinQueryForm()
    rejected.competitorBrands = Array.from({ length: 601 }, (_, index) => `品牌${index}`).join(',')
    expect(validateDouyinQueryForm(rejected)).toMatchObject({
      valid: false,
      field: 'competitorBrands',
    })

    rejected.enableCompetitorMatching = false
    expect(validateDouyinQueryForm(rejected)).toEqual({ valid: true })
  })

  it('validates window dependencies, inclusive zero thresholds and percentage ranges', () => {
    const missingWindow = createDefaultDouyinQueryForm()
    missingWindow.minPeriodVvAll = '0'
    expect(validateDouyinQueryForm(missingWindow)).toMatchObject({
      valid: false,
      field: 'metricWindowDays',
    })

    const validZeros = createDefaultDouyinQueryForm()
    validZeros.metricWindowDays = '7'
    validZeros.minVvAll = '0'
    validZeros.minPeriodVvAll = '0'
    validZeros.minAnchorCtr = '0'
    validZeros.minFinishRate = '0'
    validZeros.minPlay5sRate = '100'
    validZeros.minLikeCntAll = '0'
    expect(validateDouyinQueryForm(validZeros)).toEqual({ valid: true })

    const invalidPercentage = createDefaultDouyinQueryForm()
    invalidPercentage.minFinishRate = '100.01'
    expect(validateDouyinQueryForm(invalidPercentage)).toMatchObject({
      valid: false,
      field: 'minFinishRate',
    })
  })

  it('accepts arbitrary nonnegative ranking weights with a positive total', () => {
    const valid = createDefaultDouyinQueryForm()
    valid.useRanking = true
    valid.wSubject = '2'
    valid.wSellingPoints = '3'
    valid.wAudience = '5'
    expect(validateDouyinQueryForm(valid)).toEqual({ valid: true })

    const allZero = createDefaultDouyinQueryForm()
    allZero.useRanking = true
    allZero.wSubject = '0'
    allZero.wSellingPoints = '0'
    allZero.wAudience = '0'
    expect(validateDouyinQueryForm(allZero)).toMatchObject({
      valid: false,
      field: 'wSubject',
    })

    const negative = createDefaultDouyinQueryForm()
    negative.useRanking = true
    negative.wSubject = '-0.1'
    expect(validateDouyinQueryForm(negative)).toMatchObject({
      valid: false,
      field: 'wSubject',
    })
  })

  it('builds the exact nested snake_case request and preserves explicit zero values', () => {
    const form = createDefaultDouyinQueryForm()
    Object.assign(form, {
      strategyMode: 'custom',
      recallRoutes: ['competitor_product_selling_point', 'recent_high_exposure'],
      competitorBrands: 'ZARA，Massimo Dutti, ZARA',
      excludeTargetBrand: true,
      isAiGenerated: 'no',
      liveTrafficOnly: true,
      publishedWithinDays: '30',
      minVvAll: '0',
      authorScope: 'institution_certified',
      metricWindowDays: '7',
      minPeriodVvAll: '0',
      minAnchorCtr: '0',
      minFinishRate: '50',
      minPlay5sRate: '100',
      minLikeCntAll: '0',
      useRanking: true,
      wSubject: '2',
      wSellingPoints: '3',
      wAudience: '5',
      limit: '12',
    })

    expect(
      buildFashionAssetRequest(form, {
        text: '  MANGO 都市通勤连衣裙  ',
        image: {
          name: 'product.jpg',
          mimeType: 'image/jpeg',
          uri: 'https://example.com/product.jpg',
        },
      }),
    ).toEqual({
      datasets: ['fashion_asset_pool'],
      intent: 'hybrid_search',
      query: {
        text: 'MANGO 都市通勤连衣裙',
        image: {
          type: 'url',
          url: 'https://example.com/product.jpg',
        },
      },
      per_dataset: {
        fashion_asset_pool: {
          filters: {
            competitor_brands: ['ZARA', 'Massimo Dutti'],
            exclude_target_brand: true,
            is_ai_generated: false,
            published_within_days: 30,
            min_vv_all: 0,
            author_scope: 'institution_certified_classify_0',
            metric_window_days: 7,
            enable_competitor_matching: true,
            live_traffic_only: true,
            min_period_vv_all: 0,
            min_anchor_ctr: 0,
            min_finish_rate: 0.5,
            min_play_5s_rate: 1,
            min_like_cnt_all: 0,
          },
          strategy: {
            recall_routes: ['competitor_product_selling_point', 'recent_high_exposure'],
          },
          ranking: {
            weights: {
              subject: 2,
              selling_points: 3,
              audience: 5,
            },
          },
        },
      },
      page: {
        limit: 12,
      },
      timeout_ms: 180000,
    })
  })

  it('omits competitor brands when matching is disabled but keeps target-brand exclusion independent', () => {
    const form = createDefaultDouyinQueryForm()
    form.enableCompetitorMatching = false
    form.competitorBrands = 'ZARA, COS'
    form.excludeTargetBrand = true

    const request = buildFashionAssetRequest(form, { text: '通勤女装', image: null })
    expect(request.per_dataset.fashion_asset_pool.filters).toEqual({
      exclude_target_brand: true,
      enable_competitor_matching: false,
    })
  })

  it('serializes a local data URL as base64 without the URL prefix', () => {
    const form = createDefaultDouyinQueryForm()
    const request = buildFashionAssetRequest(form, {
      text: '',
      image: {
        name: 'product.webp',
        mimeType: 'image/webp',
        uri: 'data:image/webp;base64,AAAA',
      },
    })

    expect(request.query).toEqual({
      image: {
        type: 'base64',
        data: 'AAAA',
        mime_type: 'image/webp',
      },
    })
  })
})
