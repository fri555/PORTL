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

  it('rejects invalid ranking weights and accepts a nonnegative total of one', async () => {
    const wrapper = await reachFilters()
    await wrapper.get('[aria-label="启用排序权重"]').setValue(true)
    await wrapper.get('[aria-label="主体权重"]').setValue('-0.2')
    await wrapper.get('[aria-label="卖点权重"]').setValue('0.6')
    await wrapper.get('[aria-label="人群权重"]').setValue('0.6')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[role="alert"]').text()).toContain('非负')
    await wrapper.get('[aria-label="主体权重"]').setValue('0.4')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[role="alert"]').text()).toContain('1.0')
    await wrapper.get('[aria-label="卖点权重"]').setValue('0.3')
    await wrapper.get('[aria-label="人群权重"]').setValue('0.3')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.find('[data-testid="douyin-step-result"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('原型演示')
    expect(wrapper.findAll('[data-testid="douyin-result-card"]')).toHaveLength(0)
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
      queryText: '透气轻便跑步鞋',
      recallStrategyType: 'DEFAULT',
      limit: 20,
      filters: { competitorBrands: ['FILA', '安踏'], isAiGenerated: false, metricWindowDays: 30 },
    })
    wrapper.unmount()
    const restored = mount(DouyinHotVideo)
    await restored.get('[data-testid="douyin-task-open"]').trigger('click')
    expect(restored.get('[data-testid="query-summary"]').text()).toContain('透气轻便跑步鞋')
    expect(restored.get('[data-testid="query-summary"]').text()).toContain('FILA')
    expect(restored.findAll('[data-testid="douyin-result-card"]')).toHaveLength(0)
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
