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

    expect(wrapper.text()).toContain('智能体管理')
    expect(wrapper.text()).toContain('创建智能体')
    expect(wrapper.text()).toContain('天马智擎助手')
    expect(wrapper.text()).toContain('组货专家')
  })

  it('opens the production-aligned four-step agent editor', async () => {
    const wrapper = await mountSettings('/settings/agents')
    const createButton = wrapper.findAll('button').find((button) => button.text().includes('创建智能体'))

    expect(createButton).toBeTruthy()
    await createButton!.trigger('click')

    expect(wrapper.text()).toContain('基础设定')
    expect(wrapper.text()).toContain('角色设定')
    expect(wrapper.text()).toContain('能力扩展')
    expect(wrapper.text()).toContain('用户剧本')
    expect(wrapper.text()).toContain('模型配置')
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
