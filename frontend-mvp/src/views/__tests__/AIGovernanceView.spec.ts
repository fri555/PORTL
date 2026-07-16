import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import router from '@/router'
import AIGovernanceView from '@/views/AIGovernanceView.vue'

describe('AI governance route', () => {
  it('registers the single-page governance console route', () => {
    const resolved = router.resolve('/admin/governance')

    expect(resolved.name).toBe('ai-governance')
  })
})

describe('AI governance console', () => {
  it('switches all governance domains and evaluation subviews', async () => {
    const wrapper = mount(AIGovernanceView)

    expect(wrapper.text()).toContain('新建智能体')
    await wrapper.get('[data-testid="tab-models"]').trigger('click')
    expect(wrapper.text()).toContain('注册模型')
    expect(wrapper.text()).toContain('P95 延迟')
    await wrapper.get('[data-testid="tab-tools"]').trigger('click')
    expect(wrapper.text()).toContain('注册工具')
    expect(wrapper.text()).toContain('引用数')
    await wrapper.get('[data-testid="tab-evaluations"]').trigger('click')
    expect(wrapper.text()).toContain('创建评估任务')
    await wrapper.get('[data-testid="evaluation-subtab-datasets"]').trigger('click')
    expect(wrapper.text()).toContain('样本数')
    await wrapper.get('[data-testid="evaluation-subtab-metrics"]').trigger('click')
    expect(wrapper.text()).toContain('指标维度')
    await wrapper.get('[data-testid="evaluation-subtab-reports"]').trigger('click')
    expect(wrapper.text()).toContain('报告编号')
  })

  it('filters records, opens details, creates assets, and confirms a state action', async () => {
    const wrapper = mount(AIGovernanceView, {
      attachTo: document.body,
      global: { stubs: { Teleport: true } },
    })

    await wrapper.get('[aria-label="搜索当前资产"]').setValue('不存在的资产')
    expect(wrapper.text()).toContain('没有符合条件的资产')
    await wrapper.get('[data-testid="clear-governance-filters"]').trigger('click')
    expect(wrapper.text()).toContain('经营数据分析师')

    await wrapper.get('[data-testid="open-details-agent-1"]').trigger('click')
    expect(wrapper.get('[role="dialog"]').text()).toContain('经营数据分析师')
    await wrapper.get('[aria-label="关闭详情"]').trigger('click')

    await wrapper.get('[data-testid="primary-governance-action"]').trigger('click')
    expect(wrapper.get('[role="dialog"]').text()).toContain('新建智能体')
    await wrapper.get('[aria-label="关闭创建面板"]').trigger('click')

    await wrapper.get('[data-testid="toggle-actions-agent-1"]').trigger('click')
    await wrapper.get('[data-testid="state-action-agent-1"]').trigger('click')
    expect(wrapper.get('[role="alertdialog"]').text()).toContain('确认归档')
    await wrapper.get('[data-testid="confirm-state-action"]').trigger('click')
    expect(wrapper.text()).toContain('已归档')
    wrapper.unmount()
  })
})
