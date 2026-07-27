import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WorkbenchBoardHeader from '../WorkbenchBoardHeader.vue'

describe('WorkbenchBoardHeader', () => {
  it('places refresh beside the title and search at the far right', async () => {
    const wrapper = mount(WorkbenchBoardHeader, {
      props: {
        title: '信息摘要',
        query: '',
        searchLabel: '搜索信息摘要',
        refreshing: false,
      },
    })

    expect(wrapper.get('[data-testid="board-title-group"]').text()).toContain('信息摘要')
    expect(wrapper.get('[data-testid="board-refresh"]').attributes('aria-label')).toBe('刷新信息摘要')
    expect(wrapper.get('input').attributes('aria-label')).toBe('搜索信息摘要')

    await wrapper.get('input').setValue('库存')
    expect(wrapper.emitted('update:query')?.[0]).toEqual(['库存'])

    await wrapper.get('[data-testid="board-refresh"]').trigger('click')
    expect(wrapper.emitted('refresh')).toHaveLength(1)
  })

  it('clears search and disables duplicate refresh while loading', async () => {
    const wrapper = mount(WorkbenchBoardHeader, {
      props: {
        title: '邮件摘要',
        query: '预算',
        searchLabel: '搜索邮件摘要',
        refreshing: true,
      },
    })

    expect(wrapper.get('[data-testid="board-refresh"]').attributes()).toHaveProperty('disabled')
    expect(wrapper.get('[data-testid="board-refresh-icon"]').classes()).toContain('animate-spin')
    await wrapper.get('[aria-label="清空邮件摘要搜索"]').trigger('click')
    expect(wrapper.emitted('update:query')?.[0]).toEqual([''])
  })
})
