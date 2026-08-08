import type { KnowledgeBase, KnowledgeDocument } from '@/types/knowledge'

export const knowledgeBases: KnowledgeBase[] = [
  {
    id: 'kb01', name: '商品知识库', departmentId: 'dept_marketing', departmentName: '市场营销部',
    description: '集团全量商品信息知识库，包含商品属性、定价、销售数据、评价分析',
    visibility: 'all', visibleDepartments: [],
    totalDocuments: 1200, totalChunks: 45000,
    embeddingModel: 'text-embedding-3-large', vectorStore: 'pgvector',
    retrievalConfig: { similarityThreshold: 0.75, topK: 5, showCitation: true },
    createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-06-20T00:00:00Z',
  },
  {
    id: 'kb02', name: '门店运营知识库', departmentId: 'dept_retail', departmentName: '零售运营部',
    description: '门店运营标准、排班规范、销售技巧、客户投诉处理流程',
    visibility: 'department', visibleDepartments: ['dept_retail', 'dept_customer'],
    totalDocuments: 850, totalChunks: 32000,
    embeddingModel: 'text-embedding-3-large', vectorStore: 'pgvector',
    retrievalConfig: { similarityThreshold: 0.7, topK: 5, showCitation: true },
    createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-06-18T00:00:00Z',
  },
  {
    id: 'kb03', name: '营销素材库', departmentId: 'dept_marketing', departmentName: '市场营销部',
    description: '品牌VI规范、历史营销活动素材、各平台文案模板、优秀案例库',
    visibility: 'department', visibleDepartments: ['dept_marketing'],
    totalDocuments: 2100, totalChunks: 78000,
    embeddingModel: 'text-embedding-3-large', vectorStore: 'pgvector',
    retrievalConfig: { similarityThreshold: 0.8, topK: 3, showCitation: false },
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-06-22T00:00:00Z',
  },
  {
    id: 'kb04', name: '仓储知识库', departmentId: 'dept_supply', departmentName: '仓储部',
    description: '供应商管理规范、采购流程、库存管理标准、物流配送规范',
    visibility: 'department', visibleDepartments: ['dept_supply'],
    totalDocuments: 630, totalChunks: 25000,
    embeddingModel: 'text-embedding-3-large', vectorStore: 'pgvector',
    retrievalConfig: { similarityThreshold: 0.75, topK: 5, showCitation: true },
    createdAt: '2026-02-15T00:00:00Z', updatedAt: '2026-06-15T00:00:00Z',
  },
  {
    id: 'kb05', name: '客服知识库', departmentId: 'dept_customer', departmentName: '客服部',
    description: '常见问题FAQ、投诉处理话术、退换货政策、服务标准流程',
    visibility: 'all', visibleDepartments: [],
    totalDocuments: 420, totalChunks: 18000,
    embeddingModel: 'text-embedding-3-large', vectorStore: 'pgvector',
    retrievalConfig: { similarityThreshold: 0.8, topK: 3, showCitation: true },
    createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-06-10T00:00:00Z',
  },
  {
    id: 'kb06', name: '财务制度库', departmentId: 'dept_finance', departmentName: '财务部',
    description: '财务报销制度、预算管理规范、会计准则、税务政策汇编',
    visibility: 'specific', visibleDepartments: ['dept_finance', 'dept_admin'],
    totalDocuments: 380, totalChunks: 15000,
    embeddingModel: 'text-embedding-3-large', vectorStore: 'pgvector',
    retrievalConfig: { similarityThreshold: 0.85, topK: 3, showCitation: true },
    createdAt: '2026-03-15T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z',
  },
  {
    id: 'kb07', name: '人力资源制度库', departmentId: 'dept_hr', departmentName: '人力资源部',
    description: '招聘流程、绩效考核制度、培训体系、员工手册、晋升标准',
    visibility: 'all', visibleDepartments: [],
    totalDocuments: 290, totalChunks: 11000,
    embeddingModel: 'text-embedding-3-large', vectorStore: 'pgvector',
    retrievalConfig: { similarityThreshold: 0.8, topK: 3, showCitation: true },
    createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-06-05T00:00:00Z',
  },
]

export const knowledgeDocuments: Record<string, KnowledgeDocument[]> = {
  kb01: [
    { id: 'doc01', knowledgeBaseId: 'kb01', name: '运动鞋品类数据字典.xlsx', format: 'xlsx', size: '2.4MB', status: 'indexed', uploadedBy: '王五', uploadedAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z' },
    { id: 'doc02', knowledgeBaseId: 'kb01', name: '2026夏季新品手册.pdf', format: 'pdf', size: '8.1MB', status: 'indexed', uploadedBy: '王五', uploadedAt: '2026-06-10T00:00:00Z', updatedAt: '2026-06-10T00:00:00Z' },
    { id: 'doc03', knowledgeBaseId: 'kb01', name: '竞品价格追踪表_6月.xlsx', format: 'xlsx', size: '1.2MB', status: 'indexed', uploadedBy: '数据分析组', uploadedAt: '2026-06-15T00:00:00Z', updatedAt: '2026-06-15T00:00:00Z' },
    { id: 'doc04', knowledgeBaseId: 'kb01', name: '商品评价语义分析报告.docx', format: 'docx', size: '3.5MB', status: 'indexed', uploadedBy: '数据分析组', uploadedAt: '2026-06-18T00:00:00Z', updatedAt: '2026-06-18T00:00:00Z' },
  ],
  kb02: [
    { id: 'doc05', knowledgeBaseId: 'kb02', name: '门店运营标准手册_v3.pdf', format: 'pdf', size: '12MB', status: 'indexed', uploadedBy: '李四', uploadedAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z' },
    { id: 'doc06', knowledgeBaseId: 'kb02', name: '排班管理办法.docx', format: 'docx', size: '1.8MB', status: 'indexed', uploadedBy: '李四', uploadedAt: '2026-05-15T00:00:00Z', updatedAt: '2026-05-15T00:00:00Z' },
  ],
  kb03: [
    { id: 'doc07', knowledgeBaseId: 'kb03', name: '品牌VI手册2026版.pdf', format: 'pdf', size: '25MB', status: 'indexed', uploadedBy: '王五', uploadedAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' },
    { id: 'doc08', knowledgeBaseId: 'kb03', name: '618大促文案模板库.xlsx', format: 'xlsx', size: '3.2MB', status: 'indexed', uploadedBy: '王五', uploadedAt: '2026-05-20T00:00:00Z', updatedAt: '2026-05-20T00:00:00Z' },
  ],
  kb04: [
    { id: 'doc09', knowledgeBaseId: 'kb04', name: '供应商评估体系_v2.pdf', format: 'pdf', size: '5.6MB', status: 'indexed', uploadedBy: '赵六', uploadedAt: '2026-04-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z' },
  ],
  kb05: [
    { id: 'doc10', knowledgeBaseId: 'kb05', name: '客服话术手册_2026Q2.docx', format: 'docx', size: '4.2MB', status: 'indexed', uploadedBy: '钱七', uploadedAt: '2026-04-15T00:00:00Z', updatedAt: '2026-04-15T00:00:00Z' },
  ],
}

export function getKnowledgeBase(id: string): KnowledgeBase | undefined {
  return knowledgeBases.find((kb) => kb.id === id)
}
