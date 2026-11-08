import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import KnowledgeTable from '../KnowledgeTable.vue'
import type { SourceKnowledgeBase } from '@/types/knowledge-source'

const knowledgeBase: SourceKnowledgeBase = {
  id: 'kb-empty',
  name: '空知识库',
  owner: '测试用户',
  createdAt: '2026-11-02',
  space: 'public',
  nodes: [],
}

describe('KnowledgeTable production terminology', () => {
  it('labels the owner consistently in root and knowledge-base tables', () => {
    const root = mount(KnowledgeTable, { props: { items: [knowledgeBase] } })
    const detail = mount(KnowledgeTable, { props: { items: [], detail: knowledgeBase, nodes: [] } })
    try {
      expect(root.get('[data-testid="knowledge-table-header"]').text().replace(/\s+/g, '')).toBe('名称所有者创建时间操作')
      expect(detail.get('[data-testid="knowledge-table-header"]').text().replace(/\s+/g, '')).toBe('名称所有者上传时间操作')
    } finally {
      root.unmount()
      detail.unmount()
    }
  })

  it('does not suggest creating a subfolder when an empty one-level folder is open', () => {
    const detail = mount(KnowledgeTable, { props: { items: [], detail: knowledgeBase, nodes: [] } })
    try {
      expect(detail.get('.knowledge-table__empty').text()).toBe('暂无文件')
    } finally {
      detail.unmount()
    }
  })
})
