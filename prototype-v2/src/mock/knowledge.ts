import type { KnowledgeBaseItem, DocItem, TreeNode } from '@/types/knowledge'

/* ========== 知识库数据 ========== */

export const knowledgeBases: Record<'public' | 'personal', KnowledgeBaseItem[]> = {
  public: [
    { id: 'kb-public-1', name: '集团制度知识库', docs: 128, owner: '集团运营', department: '行政部', visibility: '全员可见', space: 'public', canEdit: false, pinned: true, recent: '刚刚' },
    { id: 'kb-public-2', name: '商品基础资料库', docs: 86, owner: '商品中心', department: '商品部', visibility: '全员可见', space: 'public', canEdit: false, recent: '14:22' },
    { id: 'kb-public-3', name: '方案中心案例库', docs: 42, owner: '方案中心', department: '方案中心', visibility: '方案中心可编辑', space: 'public', canEdit: true, pinned: true, recent: '昨天 14:22' },
    { id: 'kb-public-4', name: '团购预算池', docs: 24, owner: '方案中心', department: '方案中心', visibility: '方案中心可编辑', space: 'public', canEdit: true, recent: '周日 13:27' },
    { id: 'kb-public-5', name: 'AI项目知识库', docs: 36, owner: 'AI运营', department: '集团整体', visibility: '全员可见', space: 'public', canEdit: true, pinned: true, recent: '今天 10:21' },
    { id: 'kb-public-6', name: '线上运营素材库', docs: 58, owner: 'B2C运营', department: 'B2C线上', visibility: '部门可见', space: 'public', canEdit: true, recent: '昨天 17:40' },
    { id: 'kb-public-7', name: '视觉规范与模板库', docs: 31, owner: '视觉部', department: '视觉部', visibility: '全员可见', space: 'public', canEdit: true, recent: '周一 09:12' },
    { id: 'kb-public-8', name: '技术项目资料库', docs: 44, owner: '技术部', department: '技术部', visibility: '部门可见', space: 'public', canEdit: true, recent: '昨天 20:16' },
  ],
  personal: [
    { id: 'kb-personal-1', name: '我的客户资料', docs: 9, owner: '当前用户', department: '个人', visibility: '仅自己可见', space: 'personal', canEdit: true, pinned: true, recent: '今天 09:18' },
    { id: 'kb-personal-2', name: '临时方案草稿', docs: 5, owner: '当前用户', department: '个人', visibility: '仅自己可见', space: 'personal', canEdit: true, recent: '昨天 18:02' },
    { id: 'kb-personal-3', name: 'AI学习笔记', docs: 16, owner: '当前用户', department: '个人', visibility: '仅自己可见', space: 'personal', canEdit: true, recent: '今天 11:03' },
  ],
}

/* ========== 文档数据 ========== */

export const allDocs: Record<string, DocItem[]> = {
  'kb-public-1': [
    { name: '考勤管理制度_v3.pdf', format: 'PDF', status: '已索引', updatedAt: '2026-06-15', uploadedBy: '王管理员' },
    { name: '员工手册2026版.docx', format: 'DOCX', status: '已索引', updatedAt: '2026-06-10', uploadedBy: '王管理员' },
  ],
  'kb-public-2': [
    { name: '商品数据字典.xlsx', format: 'XLSX', status: '已索引', updatedAt: '2026-06-01', uploadedBy: '李商品' },
  ],
  'kb-public-3': [
    { name: '运动鞋团购成功案例.md', format: 'MD', status: '已索引', updatedAt: '2026-06-26', uploadedBy: '方案中心张明' },
    { name: '团购通用预算池.xlsx', format: 'XLSX', status: '已索引', updatedAt: '2026-06-24', uploadedBy: '方案中心张明' },
    { name: '方案中心字段模板.xlsx', format: 'XLSX', status: '解析中', updatedAt: '2026-06-22', uploadedBy: '方案中心李娟' },
    { name: 'B2B团购方案模板.docx', format: 'DOCX', status: '已索引', updatedAt: '2026-06-15', uploadedBy: '方案中心王磊' },
    { name: 'B2C团购方案模板.docx', format: 'DOCX', status: '已索引', updatedAt: '2026-06-14', uploadedBy: '方案中心李娟' },
  ],
  'kb-public-4': [
    { name: '2026Q1预算执行表.xlsx', format: 'XLSX', status: '已索引', updatedAt: '2026-06-20', uploadedBy: '方案中心张明' },
    { name: '价格带分析报告.docx', format: 'DOCX', status: '已索引', updatedAt: '2026-06-18', uploadedBy: '方案中心王磊' },
  ],
  'kb-public-5': [
    { name: 'AI工作台落地路线.md', format: 'MD', status: '已索引', updatedAt: '2026-06-29', uploadedBy: 'AI运营' },
    { name: '三大场景AI项目说明.pptx', format: 'PPTX', status: '已索引', updatedAt: '2026-06-26', uploadedBy: 'AI运营' },
  ],
  'kb-public-6': [
    { name: '线上活动复盘模板.docx', format: 'DOCX', status: '已索引', updatedAt: '2026-06-25', uploadedBy: 'B2C运营' },
    { name: '会员触达规则.xlsx', format: 'XLSX', status: '已索引', updatedAt: '2026-06-24', uploadedBy: 'B2C运营' },
  ],
  'kb-public-7': [
    { name: 'PPT母版规范.pptx', format: 'PPTX', status: '已索引', updatedAt: '2026-06-21', uploadedBy: '视觉部' },
    { name: '品牌色彩规范.pdf', format: 'PDF', status: '已索引', updatedAt: '2026-06-19', uploadedBy: '视觉部' },
  ],
  'kb-public-8': [
    { name: 'MCP接入说明.md', format: 'MD', status: '已索引', updatedAt: '2026-06-20', uploadedBy: '技术部' },
    { name: 'AI工作门户技术方案.docx', format: 'DOCX', status: '已索引', updatedAt: '2026-06-18', uploadedBy: '技术部' },
  ],
  'kb-personal-1': [
    { name: '客户A需求记录.md', format: 'MD', status: '已索引', updatedAt: '2026-06-28', uploadedBy: '当前用户' },
  ],
  'kb-personal-2': [
    { name: '临时方案笔记.md', format: 'MD', status: '解析中', updatedAt: '2026-06-27', uploadedBy: '当前用户' },
  ],
  'kb-personal-3': [
    { name: 'AI提示词学习.md', format: 'MD', status: '已索引', updatedAt: '2026-06-30', uploadedBy: '当前用户' },
    { name: 'RAG实践笔记.docx', format: 'DOCX', status: '已索引', updatedAt: '2026-06-22', uploadedBy: '当前用户' },
  ],
}

/* ========== 文件树数据 ========== */
/* 四层架构：空间 → 知识库 → 文件夹（一级） → 文件 */

export const fileTrees: Record<'public' | 'personal', TreeNode[]> = {
  public: [
    {
      id: 'kb-tree-1', label: '集团制度知识库', type: 'folder', kbId: 'kb-public-1', isKnowledgeBase: true,
      children: [
        { id: 'file-att-policy', label: '考勤管理制度_v3.pdf', type: 'file', kbId: 'kb-public-1', docName: '考勤管理制度_v3.pdf' },
        { id: 'file-hr-handbook', label: '员工手册2026版.docx', type: 'file', kbId: 'kb-public-1', docName: '员工手册2026版.docx' },
      ],
    },
    {
      id: 'kb-tree-3', label: '方案中心案例库', type: 'folder', kbId: 'kb-public-3', isKnowledgeBase: true,
      children: [
        { id: 'file-sneaker', label: '运动鞋团购成功案例.md', type: 'file', kbId: 'kb-public-3', docName: '运动鞋团购成功案例.md' },
        { id: 'file-budget-pool', label: '团购通用预算池.xlsx', type: 'file', kbId: 'kb-public-3', docName: '团购通用预算池.xlsx' },
        { id: 'folder-templates', label: '方案模板', type: 'folder', kbId: 'kb-public-3', children: [
          { id: 'file-b2b', label: 'B2B团购方案模板.docx', type: 'file', kbId: 'kb-public-3', docName: 'B2B团购方案模板.docx' },
          { id: 'file-b2c', label: 'B2C团购方案模板.docx', type: 'file', kbId: 'kb-public-3', docName: 'B2C团购方案模板.docx' },
        ]},
      ],
    },
    {
      id: 'kb-tree-5', label: 'AI项目知识库', type: 'folder', kbId: 'kb-public-5', isKnowledgeBase: true,
      children: [
        { id: 'file-ai-roadmap', label: 'AI工作台落地路线.md', type: 'file', kbId: 'kb-public-5', docName: 'AI工作台落地路线.md' },
      ],
    },
  ],
  personal: [
    {
      id: 'kb-personal-tree-1', label: '我的客户资料', type: 'folder', kbId: 'kb-personal-1', isKnowledgeBase: true,
      children: [
        { id: 'file-customer-a', label: '客户A需求记录.md', type: 'file', kbId: 'kb-personal-1', docName: '客户A需求记录.md' },
      ],
    },
  ],
}
