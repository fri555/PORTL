import { describe, expect, it } from 'vitest'
import { sourceKnowledgeBases } from '../knowledge-source'
import type { SourceKnowledgeNode } from '@/types/knowledge-source'

function flattenNodes(nodes: SourceKnowledgeNode[] = []): SourceKnowledgeNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children)])
}

function nodeDepth(node: SourceKnowledgeNode): number {
  if (!node.children?.length) return 1
  return 1 + Math.max(...node.children.map(nodeDepth))
}

describe('local knowledge-source fixtures', () => {
  it('uses the local product-domain knowledge base names instead of copied production names', () => {
    const names = sourceKnowledgeBases.map((knowledgeBase) => knowledgeBase.name)
    const localNames = [
      '集团制度知识库',
      '商品基础资料库',
      '方案中心案例库',
      '团购预算池',
      'AI项目知识库',
      '线上运营素材库',
      '视觉规范与模板库',
      '技术项目资料库',
      '财务制度资料库',
      '仓储作业SOP库',
      '品牌活动资料库',
      '人力培训知识库',
      '我的客户资料',
      '临时方案草稿',
      'AI学习笔记',
      '客户素材归档',
    ]

    expect(names).toEqual(expect.arrayContaining(localNames))
    expect(names).not.toEqual(expect.arrayContaining([
      '方法',
      '权限04',
      '权限03',
      '测试用',
      '权限测试用知识库',
      '商品中心1',
      '测试333226666',
      '9999',
      '测试权限',
      'E2E-并发A-24020057',
      'E2E-公有-24020057',
    ]))
    expect(names.every((name) => !/E2E|测试用|^权限\d+$/.test(name))).toBe(true)
  })

  it('provides folder-backed trees for at least six public and two personal libraries', () => {
    const hasFolder = (nodes: SourceKnowledgeNode[] = []) => nodes.some((node) => node.kind === 'folder')
    const publicWithFolders = sourceKnowledgeBases.filter((item) => item.space === 'public' && hasFolder(item.nodes))
    const personalWithFolders = sourceKnowledgeBases.filter((item) => item.space === 'personal' && hasFolder(item.nodes))

    expect(publicWithFolders.length).toBeGreaterThanOrEqual(6)
    expect(personalWithFolders.length).toBeGreaterThanOrEqual(2)
  })

  it('contains at least two knowledge trees with three nested node levels', () => {
    const deepTrees = sourceKnowledgeBases.filter((knowledgeBase) =>
      Math.max(0, ...(knowledgeBase.nodes ?? []).map(nodeDepth)) >= 3,
    )

    expect(deepTrees.length).toBeGreaterThanOrEqual(2)
  })

  it('uses stable unique resource ids and complete file metadata', () => {
    const nodes = sourceKnowledgeBases.flatMap((knowledgeBase) => flattenNodes(knowledgeBase.nodes))
    const allIds = [
      ...sourceKnowledgeBases.map((knowledgeBase) => knowledgeBase.id),
      ...nodes.map((node) => node.id),
    ]
    const files = nodes.filter((node) => node.kind === 'file')

    expect(new Set(allIds).size).toBe(allIds.length)
    expect(allIds.every((id) => /^[a-z][a-z0-9-]*$/.test(id))).toBe(true)
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      expect(file.owner.trim()).not.toBe('')
      expect(file.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})
