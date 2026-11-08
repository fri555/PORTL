import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DouyinHotVideo from '../DouyinHotVideo.vue'

async function start() {
  const wrapper = mount(DouyinHotVideo)
  await wrapper.get('[data-testid="douyin-create"]').trigger('click')
  return wrapper
}
async function reachFilters() {
  const wrapper = await start()
  await wrapper.get('[aria-label="商品描述"]').setValue('透气轻便跑步鞋')
  await wrapper.get('form').trigger('submit')
  await wrapper.get('form').trigger('submit')
  return wrapper
}

describe('DouyinHotVideo local query prototype', () => {
  beforeEach(() => localStorage.clear())

  it('requires a description or image before entering recall configuration', async () => {
    const wrapper = await start()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.find('[data-testid="douyin-step-query"]').exists()).toBe(true)
    expect(wrapper.get('[role="alert"]').text()).toContain('至少填一项')
    await wrapper.get('[aria-label="商品描述"]').setValue('透气轻便跑步鞋')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.find('[data-testid="douyin-step-strategy"]').exists()).toBe(true)
  })

  it('requires at least one channel in custom recall mode', async () => {
    const wrapper = await start()
    await wrapper.get('[aria-label="商品描述"]').setValue('跑步鞋')
    await wrapper.get('form').trigger('submit')
    await wrapper.get('input[value="custom"]').setValue(true)
    expect(wrapper.findAll('input[data-testid="recall-channel"]')).toHaveLength(5)
    for (const input of wrapper.findAll('input[data-testid="recall-channel"]'))
      await input.setValue(false)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[role="alert"]').text()).toContain('至少选择一个召回渠道')
    await wrapper.get('input[data-testid="recall-channel"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.find('[data-testid="douyin-step-filter"]').exists()).toBe(true)
  })

  it('renders the complete V2 Fashion filter and sort controls', async () => {
    const wrapper = await reachFilters()
    for (const label of [
      '启用竞品识别',
      '竞品品牌',
      '排除本品牌',
      '是否AI生成',
      '仅直播引流',
      '发布于最近 N天',
      '累计播放量下限',
      '作者范围',
      '指标统计口径（天）',
      '窗口新增播放量下限',
      'Anchor 点击率下限（%）',
      '完播率下限（%）',
      '5 秒播放率下限（%）',
      '点赞量下限',
      '启用排序权重',
      '返回条数',
    ])
      expect(wrapper.find(`[aria-label="${label}"]`).exists(), label).toBe(true)
    expect(wrapper.get('[aria-label="作者范围"]').text()).toContain('机构认证作者')
    expect(wrapper.find('[aria-label="二级排序"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('广告创意置信度')
  })

  it('rejects invalid ranking weights and accepts any positive nonnegative total', async () => {
    const wrapper = await reachFilters()
    await wrapper.get('[aria-label="启用排序权重"]').setValue(true)
    await wrapper.get('[aria-label="主体权重"]').setValue('-0.2')
    await wrapper.get('[aria-label="卖点权重"]').setValue('3')
    await wrapper.get('[aria-label="人群权重"]').setValue('5')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[role="alert"]').text()).toContain('非负')
    await wrapper.get('[aria-label="主体权重"]').setValue('2')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.find('[data-testid="douyin-step-result"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('原型演示')
    expect(wrapper.findAll('[data-testid="douyin-result-card"]')).toHaveLength(0)
  })

  it('keeps filter input on step three and marks the field that needs attention', async () => {
    const wrapper = await reachFilters()
    await wrapper.get('[aria-label="窗口新增播放量下限"]').setValue('0')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.find('[data-testid="douyin-step-filter"]').exists()).toBe(true)
    expect(wrapper.get('[role="alert"]').text()).toContain('指标统计时间口径')
    expect(wrapper.get('[aria-label="指标统计口径（天）"]').attributes('aria-invalid')).toBe('true')

    await wrapper.get('[aria-label="指标统计口径（天）"]').setValue('7')
    await wrapper.get('[aria-label="完播率下限（%）"]').setValue('100.01')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[role="alert"]').text()).toContain('0-100')
    expect(wrapper.get('[aria-label="完播率下限（%）"]').attributes('aria-invalid')).toBe('true')
  })

  it('preserves a disabled competitor draft and stores the nested V2 request without brands', async () => {
    const wrapper = await reachFilters()
    const brands = wrapper.get('[aria-label="竞品品牌"]')
    await brands.setValue('FILA，安踏')
    await wrapper.get('[aria-label="启用竞品识别"]').setValue(false)
    expect(brands.attributes('disabled')).toBeDefined()
    expect((brands.element as HTMLInputElement).value).toBe('FILA，安踏')
    await wrapper.get('[aria-label="排除本品牌"]').setValue(true)
    await wrapper.get('[aria-label="仅直播引流"]').setValue(true)
    await wrapper.get('[aria-label="累计播放量下限"]').setValue('0')
    await wrapper.get('form').trigger('submit')

    const [stored] = JSON.parse(localStorage.getItem('tianma-douyin-prototype-v1') ?? '[]')
    expect(stored.query).toMatchObject({
      datasets: ['fashion_asset_pool'],
      intent: 'hybrid_search',
      per_dataset: {
        fashion_asset_pool: {
          filters: {
            enable_competitor_matching: false,
            exclude_target_brand: true,
            live_traffic_only: true,
            min_vv_all: 0,
          },
        },
      },
      page: { limit: 20 },
      timeout_ms: 180000,
    })
    expect(stored.query.per_dataset.fashion_asset_pool.filters).not.toHaveProperty(
      'competitor_brands',
    )
    expect(stored.query.per_dataset.fashion_asset_pool).not.toHaveProperty('ranking')
  })

  it.each(['0', '21', '1.5'])(
    'rejects an out-of-range or fractional result limit %s',
    async (limit) => {
      const wrapper = await reachFilters()
      await wrapper.get('[aria-label="返回条数"]').setValue(limit)
      await wrapper.get('form').trigger('submit')
      expect(wrapper.get('[role="alert"]').text()).toContain('1-20')
      expect(localStorage.getItem('tianma-douyin-prototype-v1')).toBeNull()
    },
  )

  it('persists query conditions and restores them from the task list without inventing videos', async () => {
    const wrapper = await reachFilters()
    await wrapper.get('[aria-label="竞品品牌"]').setValue('FILA，安踏')
    await wrapper.get('[aria-label="是否AI生成"]').setValue('no')
    await wrapper.get('[aria-label="指标统计口径（天）"]').setValue('30')
    await wrapper.get('form').trigger('submit')
    const stored = JSON.parse(localStorage.getItem('tianma-douyin-prototype-v1') ?? '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].query).toMatchObject({
      datasets: ['fashion_asset_pool'],
      intent: 'hybrid_search',
      query: { text: '透气轻便跑步鞋' },
      per_dataset: {
        fashion_asset_pool: {
          filters: {
            competitor_brands: ['FILA', '安踏'],
            enable_competitor_matching: true,
            is_ai_generated: false,
            metric_window_days: 30,
          },
        },
      },
      page: { limit: 20 },
    })
    wrapper.unmount()
    const restored = mount(DouyinHotVideo)
    await restored.get('[data-testid="douyin-task-open"]').trigger('click')
    expect(restored.get('[data-testid="query-summary"]').text()).toContain('透气轻便跑步鞋')
    expect(restored.get('[data-testid="query-summary"]').text()).toContain('FILA')
    expect(restored.findAll('[data-testid="douyin-result-card"]')).toHaveLength(0)
  })

  it('normalizes legacy saved forms when viewing and reusing a query', async () => {
    localStorage.setItem(
      'tianma-douyin-prototype-v1',
      JSON.stringify([
        {
          id: 'legacy-query',
          name: '旧版查询',
          createdAt: '2026-10-01T00:00:00.000Z',
          status: 'saved',
          form: {
            text: '旧版跑步鞋',
            image: null,
            productNumber: '',
            strategyMode: 'default',
            recallRoutes: [],
            competitorBrands: 'FILA',
            enableCompetitorMatching: false,
            isAiGenerated: 'any',
            publishedWithinDays: '',
            minVvAll: 0,
            authorScope: 'blue_v',
            metricWindowDays: '',
            useRanking: false,
            wSubject: '0.35',
            wSellingPoints: '0.35',
            wAudience: '0.30',
            secondary: ['vv_all'],
            limit: 20,
          },
          query: {},
        },
      ]),
    )
    const wrapper = mount(DouyinHotVideo)
    await wrapper.get('[data-testid="douyin-task-open"]').trigger('click')
    expect(wrapper.get('[data-testid="query-summary"]').text()).toContain('机构认证作者')
    expect(wrapper.get('[data-testid="query-summary"]').text()).toContain('0')
    const reuse = wrapper.findAll('button').find((button) => button.text().includes('复用查询'))
    expect(reuse).toBeDefined()
    await reuse!.trigger('click')
    await wrapper.get('form').trigger('submit')
    await wrapper.get('form').trigger('submit')
    expect((wrapper.get('[aria-label="累计播放量下限"]').element as HTMLInputElement).value).toBe(
      '0',
    )
    expect(wrapper.get('[aria-label="竞品品牌"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).not.toContain('二级排序')
  })

  it('applies task name search only after the search button and clears it', async () => {
    const base = {
      createdAt: '2026-11-03T00:00:00.000Z',
      status: 'saved',
      form: { text: '测试', image: null },
      query: {},
    }
    localStorage.setItem(
      'tianma-douyin-prototype-v1',
      JSON.stringify([
        { ...base, id: 'coat', name: '羽绒服爆款召回' },
        { ...base, id: 'shoe', name: '跑鞋召回任务' },
      ]),
    )
    const wrapper = mount(DouyinHotVideo)
    await wrapper.get('input[aria-label="搜索任务名称"]').setValue('羽绒服')
    expect(wrapper.findAll('[data-testid="douyin-task-card"]')).toHaveLength(2)
    await wrapper.get('[data-testid="douyin-search-submit"]').trigger('click')
    expect(wrapper.findAll('[data-testid="douyin-task-card"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('羽绒服爆款召回')
    expect(wrapper.text()).not.toContain('跑鞋召回任务')
    await wrapper.get('[data-testid="douyin-search-clear"]').trigger('click')
    expect(wrapper.findAll('[data-testid="douyin-task-card"]')).toHaveLength(2)
    await wrapper.get('[role="tab"][aria-selected="true"]').trigger('click')
  })

  it('keeps the create button in the title row and the search in its own toolbar row', () => {
    const wrapper = mount(DouyinHotVideo)
    expect(wrapper.find('.list-header [data-testid="douyin-create"]').exists()).toBe(true)
    expect(
      wrapper
        .find('[data-testid="douyin-search-toolbar"] [data-testid="douyin-search-submit"]')
        .exists(),
    ).toBe(true)
    wrapper.unmount()
  })

  it('shows a failed recall reason in red and keeps the record reusable', async () => {
    localStorage.setItem(
      'tianma-douyin-prototype-v1',
      JSON.stringify([
        {
          id: 'failed-recall',
          name: '失败召回任务',
          createdAt: '2026-11-03T00:00:00.000Z',
          status: 'FAILED',
          failureReason: '召回服务连接超时',
          form: { text: '羽绒服', image: null },
          query: {},
        },
      ]),
    )
    const wrapper = mount(DouyinHotVideo)
    const reason = wrapper.get('[data-testid="douyin-failure-reason"]')
    expect(reason.text()).toContain('召回服务连接超时')
    expect(reason.classes()).toContain('task-failure')
    expect(wrapper.get('button[aria-label="复用查询"]').attributes('disabled')).toBeUndefined()
  })

  it('requires confirmation to delete a saved local query', async () => {
    const wrapper = await reachFilters()
    await wrapper.get('form').trigger('submit')
    await wrapper.get('[data-testid="douyin-back-list"]').trigger('click')
    await wrapper.get('[data-testid="douyin-task-delete"]').trigger('click')
    expect(JSON.parse(localStorage.getItem('tianma-douyin-prototype-v1') ?? '[]')).toHaveLength(1)
    await wrapper.get('[data-testid="douyin-confirm-delete"]').trigger('click')
    expect(JSON.parse(localStorage.getItem('tianma-douyin-prototype-v1') ?? '[]')).toHaveLength(0)
  })
})
