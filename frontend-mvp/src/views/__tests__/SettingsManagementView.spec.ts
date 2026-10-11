import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import SettingsManagementView from '@/views/SettingsManagementView.vue'

async function mountSettings(path = '/settings/agents') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/settings', component: SettingsManagementView },
      { path: '/settings/quota', component: SettingsManagementView },
      { path: '/settings/models', component: SettingsManagementView },
      { path: '/settings/tools', component: SettingsManagementView },
      { path: '/settings/agents', component: SettingsManagementView },
    ],
  })
  router.push(path)
  await router.isReady()
  return mount(SettingsManagementView, { global: { plugins: [router] } })
}

describe('SettingsManagementView', () => {
  it('opens the agent management workspace from /settings/agents', async () => {
    const wrapper = await mountSettings('/settings/agents')

    expect(wrapper.get('[data-testid="settings-production-shell"]').classes()).toContain('bg-[#f5f5f6]')
    expect(wrapper.get('[data-testid="settings-production-card"]').classes()).toContain('rounded-lg')
    expect(wrapper.text()).toContain('智能体管理')
    expect(wrapper.text()).toContain('创建智能体')
    expect(wrapper.text()).toContain('耶虎')
    expect(wrapper.text()).toContain('组货专家')
  })

  it('keeps the production list controls compact and interactive', async () => {
    const wrapper = await mountSettings('/settings/agents')

    expect(wrapper.get('[data-testid="settings-list-head"]').classes()).toContain('h-10')
    expect(wrapper.get('[data-testid="settings-agent-row-daily-assistant"]').classes()).toContain('h-14')

    const statusSwitch = wrapper.get('[data-testid="settings-agent-switch-daily-assistant"]')
    expect(statusSwitch.attributes('aria-checked')).toBe('true')
    await statusSwitch.trigger('click')
    expect(statusSwitch.attributes('aria-checked')).toBe('false')
    expect(wrapper.get('[data-testid="settings-agent-row-daily-assistant"]').text()).toContain('已停用')

    await wrapper.get('input[placeholder="搜索智能体名称..."]').setValue('组货专家')
    await wrapper.get('button[aria-label="查询智能体"]').trigger('click')
    expect(wrapper.find('[data-testid="settings-agent-row-daily-assistant"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="settings-agent-row-biz-02"]').exists()).toBe(true)

    await wrapper.get('button[aria-label="清空智能体筛选"]').trigger('click')
    expect(wrapper.find('[data-testid="settings-agent-row-daily-assistant"]').exists()).toBe(true)
  })

  it('opens the production-aligned four-step agent editor', async () => {
    const wrapper = await mountSettings('/settings/agents')
    const createButton = wrapper.findAll('button').find((button) => button.text().includes('创建智能体'))

    expect(createButton).toBeTruthy()
    await createButton!.trigger('click')

    expect(wrapper.text()).toContain('基础设定')
    expect(wrapper.text()).toContain('角色设定')
    expect(wrapper.text()).toContain('能力扩展')
    expect(wrapper.text()).toContain('快捷提示词')
    expect(wrapper.text()).toContain('模型配置')
    expect(wrapper.text()).toContain('适用部门')
    expect(wrapper.text()).toContain('接入系统标签')
    expect(wrapper.text()).toContain('最多选择 3 个')
  })

  it('edits usage instructions as four plain labeled fields without grouped cards', async () => {
    const wrapper = await mountSettings('/settings/agents')
    const createButton = wrapper.findAll('button').find((button) => button.text().includes('创建智能体'))
    await createButton!.trigger('click')
    const usageTab = wrapper.findAll('[role="tab"]').find((button) => button.text().includes('使用说明'))
    await usageTab!.trigger('click')

    expect(wrapper.find('textarea[aria-label="使用说明"]').exists()).toBe(false)
    const usageForm = wrapper.get('.usage-form-fields')
    expect(usageForm.findAll('[data-testid^="usage-field-"]')).toHaveLength(4)
    const labels = [
      ['systems', '接入系统'],
      ['input', '输入要求'],
      ['output', '输出形式'],
      ['limits', '使用限制'],
    ]
    for (const [field, label] of labels) {
      const control = usageForm.get('[data-testid="usage-field-' + field + '"]')
      expect(control.element.closest('label')?.textContent).toContain(label)
    }
    expect(usageForm.findAll('section, fieldset, h3')).toHaveLength(0)
    expect(wrapper.findAll('h3').map(node => node.text())).not.toContain('能力范围')
    expect(wrapper.findAll('h3').map(node => node.text())).not.toContain('能力边界')
  })

  it('keeps the sidebar selection synced with settings sub-routes', async () => {
    const wrapper = await mountSettings('/settings/agents')
    await wrapper.vm.$router.push('/settings/quota')
    await flushPromises()

    expect(wrapper.vm.$route.path).toBe('/settings/quota')
    expect(wrapper.text()).toContain('额度管理')
    expect(wrapper.text()).toContain('品牌营销部月度额度')
  })
})




