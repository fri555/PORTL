import type { KnowledgeSpace, SourceKnowledgeBase, SourceKnowledgeNode } from '@/types/knowledge-source'

const file = (id: string, name: string, owner: string, updatedAt: string, format: string, size: string): SourceKnowledgeNode =>
  ({ id, name, kind: 'file', owner, updatedAt, format, size })

const folder = (id: string, name: string, owner: string, updatedAt: string, children: SourceKnowledgeNode[]): SourceKnowledgeNode =>
  ({ id, name, kind: 'folder', owner, updatedAt, children })

const leafNames = (nodes: SourceKnowledgeNode[]): string[] => nodes.flatMap((node) =>
  node.kind === 'file' ? [node.name] : leafNames(node.children ?? []),
)

function kb(
  id: string,
  name: string,
  owner: string,
  createdAt: string,
  count: number,
  space: KnowledgeSpace,
  nodes: SourceKnowledgeNode[],
): SourceKnowledgeBase {
  return { id, name, owner, createdAt, count, space, nodes, documents: leafNames(nodes) }
}

export const publicKnowledgeBases: SourceKnowledgeBase[] = [
  kb('kb-public-1', '集团制度知识库', '集团运营', '2026-06-15', 128, 'public', [
    folder('policy-hr', '人事制度', '人力中心', '2026-06-15', [
      folder('policy-attendance', '考勤与休假', '人力中心', '2026-06-15', [
        file('policy-attendance-v3', '考勤管理制度_v3.pdf', '人力中心', '2026-06-15', 'PDF', '2.4 MB'),
        file('policy-leave', '员工休假管理细则.docx', '人力中心', '2026-06-12', 'DOCX', '864 KB'),
      ]),
      file('policy-handbook', '员工手册2026版.docx', '人力中心', '2026-06-10', 'DOCX', '3.1 MB'),
    ]),
    folder('policy-admin', '行政制度', '行政部', '2026-06-08', [
      file('policy-seal', '印章使用管理办法.pdf', '行政部', '2026-06-08', 'PDF', '1.2 MB'),
    ]),
  ]),
  kb('kb-public-2', '商品基础资料库', '商品中心', '2026-06-01', 86, 'public', [
    folder('product-taxonomy', '商品分类与属性', '商品中心', '2026-06-01', [
      folder('product-shoes', '鞋类', '商品中心', '2026-06-01', [
        file('product-shoes-dict', '鞋类商品属性字典.xlsx', '商品中心', '2026-06-01', 'XLSX', '1.8 MB'),
        file('product-shoes-size', '鞋码换算与适配表.xlsx', '商品中心', '2026-05-28', 'XLSX', '620 KB'),
      ]),
      folder('product-apparel', '服装类', '商品中心', '2026-05-26', [
        file('product-apparel-dict', '服装商品属性字典.xlsx', '商品中心', '2026-05-26', 'XLSX', '1.4 MB'),
      ]),
    ]),
    file('product-data-dict', '商品数据字典.xlsx', '商品中心', '2026-06-01', 'XLSX', '2.6 MB'),
  ]),
  kb('kb-public-3', '方案中心案例库', '方案中心', '2026-06-26', 42, 'public', [
    folder('solution-group-buy', '团购方案', '方案中心', '2026-06-26', [
      folder('solution-cases', '成功案例', '方案中心', '2026-06-26', [
        file('solution-sneaker', '运动鞋团购成功案例.md', '方案中心', '2026-06-26', 'MD', '96 KB'),
        file('solution-benefit', '企业福利采购复盘.pdf', '方案中心', '2026-06-23', 'PDF', '4.7 MB'),
      ]),
      folder('solution-templates', '通用模板', '方案中心', '2026-06-22', [
        file('solution-b2b', 'B2B团购方案模板.docx', '方案中心', '2026-06-15', 'DOCX', '1.1 MB'),
        file('solution-b2c', 'B2C团购方案模板.docx', '方案中心', '2026-06-14', 'DOCX', '1.0 MB'),
      ]),
    ]),
    file('solution-fields', '方案中心字段模板.xlsx', '方案中心', '2026-06-22', 'XLSX', '740 KB'),
  ]),
  kb('kb-public-4', '团购预算池', '方案中心', '2026-06-20', 24, 'public', [
    folder('budget-2026', '2026年度预算', '方案中心', '2026-06-20', [
      folder('budget-q1', '第一季度', '方案中心', '2026-06-20', [
        file('budget-q1-sheet', '2026Q1预算执行表.xlsx', '方案中心', '2026-06-20', 'XLSX', '1.5 MB'),
        file('budget-q1-review', '第一季度预算复盘.pptx', '方案中心', '2026-04-08', 'PPTX', '6.2 MB'),
      ]),
      folder('budget-q2', '第二季度', '方案中心', '2026-06-18', [
        file('budget-q2-plan', '2026Q2预算计划.xlsx', '方案中心', '2026-06-18', 'XLSX', '1.3 MB'),
      ]),
    ]),
    file('budget-price-band', '价格带分析报告.docx', '方案中心', '2026-06-18', 'DOCX', '2.1 MB'),
  ]),
  kb('kb-public-5', 'AI项目知识库', 'AI运营', '2026-06-29', 36, 'public', [
    folder('ai-projects', '项目资料', 'AI运营', '2026-06-29', [
      folder('ai-workbench', 'AI工作台', 'AI运营', '2026-06-29', [
        file('ai-roadmap', 'AI工作台落地路线.md', 'AI运营', '2026-06-29', 'MD', '128 KB'),
        file('ai-architecture', 'AI工作门户技术方案.docx', '技术部', '2026-06-18', 'DOCX', '3.8 MB'),
      ]),
      folder('ai-scenes', '场景方案', 'AI运营', '2026-06-26', [
        file('ai-three-scenes', '三大场景AI项目说明.pptx', 'AI运营', '2026-06-26', 'PPTX', '8.5 MB'),
      ]),
    ]),
    folder('ai-guides', '使用指南', 'AI运营', '2026-06-25', [
      file('ai-prompt-guide', '企业提示词编写指南.pdf', 'AI运营', '2026-06-25', 'PDF', '1.7 MB'),
    ]),
  ]),
  kb('kb-public-6', '线上运营素材库', 'B2C运营', '2026-06-25', 58, 'public', [
    folder('online-campaigns', '活动运营', 'B2C运营', '2026-06-25', [
      folder('online-618', '618活动', 'B2C运营', '2026-06-25', [
        file('online-618-review', '618活动复盘报告.pptx', 'B2C运营', '2026-06-25', 'PPTX', '7.8 MB'),
        file('online-618-assets', '618素材投放清单.xlsx', 'B2C运营', '2026-06-20', 'XLSX', '980 KB'),
      ]),
      file('online-review-template', '线上活动复盘模板.docx', 'B2C运营', '2026-06-25', 'DOCX', '860 KB'),
    ]),
    folder('online-members', '会员运营', 'B2C运营', '2026-06-24', [
      file('online-member-rules', '会员触达规则.xlsx', 'B2C运营', '2026-06-24', 'XLSX', '540 KB'),
    ]),
  ]),
  kb('kb-public-7', '视觉规范与模板库', '视觉部', '2026-06-21', 31, 'public', [
    folder('visual-brand', '品牌规范', '视觉部', '2026-06-21', [
      file('visual-color', '品牌色彩规范.pdf', '视觉部', '2026-06-19', 'PDF', '3.4 MB'),
      file('visual-logo', '品牌标识使用规范.pdf', '视觉部', '2026-06-18', 'PDF', '2.8 MB'),
    ]),
    folder('visual-office', '办公模板', '视觉部', '2026-06-21', [
      file('visual-ppt', 'PPT母版规范.pptx', '视觉部', '2026-06-21', 'PPTX', '9.6 MB'),
    ]),
  ]),
  kb('kb-public-8', '技术项目资料库', '技术部', '2026-06-20', 44, 'public', [
    folder('tech-integrations', '集成与接口', '技术部', '2026-06-20', [
      folder('tech-mcp', 'MCP接入', '技术部', '2026-06-20', [
        file('tech-mcp-guide', 'MCP接入说明.md', '技术部', '2026-06-20', 'MD', '182 KB'),
        file('tech-mcp-api', 'MCP接口清单.xlsx', '技术部', '2026-06-18', 'XLSX', '410 KB'),
      ]),
    ]),
    file('tech-portal', 'AI工作门户技术方案.docx', '技术部', '2026-06-18', 'DOCX', '3.8 MB'),
  ]),
  kb('kb-public-9', '财务制度资料库', '财务部', '2026-06-12', 22, 'public', [
    folder('finance-expense', '费用管理', '财务部', '2026-06-12', [
      file('finance-expense-policy', '费用报销制度.pdf', '财务部', '2026-06-12', 'PDF', '1.9 MB'),
      file('finance-travel', '差旅费标准.xlsx', '财务部', '2026-06-10', 'XLSX', '390 KB'),
    ]),
  ]),
  kb('kb-public-10', '仓储作业SOP库', '仓储部', '2026-06-13', 39, 'public', [
    folder('warehouse-inout', '出入库流程', '仓储部', '2026-06-13', [
      file('warehouse-sop', '出入库作业SOP.pdf', '仓储部', '2026-06-13', 'PDF', '3.0 MB'),
      file('warehouse-check', '每日仓储巡检表.xlsx', '仓储部', '2026-06-11', 'XLSX', '520 KB'),
    ]),
  ]),
  kb('kb-public-11', '品牌活动资料库', '品牌部', '2026-06-10', 27, 'public', [
    folder('brand-cases', '活动案例', '品牌部', '2026-06-10', [
      file('brand-casebook', '品牌活动案例集.pptx', '品牌部', '2026-06-10', 'PPTX', '12.2 MB'),
    ]),
  ]),
  kb('kb-public-12', '人力培训知识库', '人力中心', '2026-06-09', 18, 'public', [
    folder('hr-onboarding', '新员工培训', '人力中心', '2026-06-09', [
      file('hr-handbook', '新员工培训手册.docx', '人力中心', '2026-06-09', 'DOCX', '2.3 MB'),
    ]),
  ]),
]

export const personalKnowledgeBases: SourceKnowledgeBase[] = [
  kb('kb-personal-1', '我的客户资料', '当前用户', '2026-06-28', 9, 'personal', [
    folder('personal-key-customers', '重点客户', '当前用户', '2026-06-28', [
      folder('personal-customer-a', '客户A', '当前用户', '2026-06-28', [
        file('personal-customer-a-needs', '客户A需求记录.md', '当前用户', '2026-06-28', 'MD', '84 KB'),
        file('personal-customer-a-meeting', '客户A会议纪要.docx', '当前用户', '2026-06-27', 'DOCX', '430 KB'),
      ]),
    ]),
    file('personal-customer-list', '客户跟进清单.xlsx', '当前用户', '2026-06-26', 'XLSX', '320 KB'),
  ]),
  kb('kb-personal-2', '临时方案草稿', '当前用户', '2026-06-27', 5, 'personal', [
    folder('personal-group-buy-drafts', '团购方案草稿', '当前用户', '2026-06-27', [
      folder('personal-working-drafts', '编写中', '当前用户', '2026-06-27', [
        file('personal-draft-note', '临时方案笔记.md', '当前用户', '2026-06-27', 'MD', '62 KB'),
        file('personal-draft-budget', '预算测算草稿.xlsx', '当前用户', '2026-06-26', 'XLSX', '470 KB'),
      ]),
    ]),
  ]),
  kb('kb-personal-3', 'AI学习笔记', '当前用户', '2026-06-30', 16, 'personal', [
    folder('personal-ai-rag', 'RAG实践', '当前用户', '2026-06-30', [
      file('personal-ai-prompt', 'AI提示词学习.md', '当前用户', '2026-06-30', 'MD', '116 KB'),
      file('personal-ai-rag-note', 'RAG实践笔记.docx', '当前用户', '2026-06-22', 'DOCX', '690 KB'),
    ]),
  ]),
  kb('kb-personal-4', '客户素材归档', '当前用户', '2026-06-26', 12, 'personal', [
    folder('personal-meeting-assets', '会议资料', '当前用户', '2026-06-26', [
      file('personal-meeting-minutes', '客户会议纪要.md', '当前用户', '2026-06-26', 'MD', '92 KB'),
      file('personal-assets-list', '客户素材清单.xlsx', '当前用户', '2026-06-25', 'XLSX', '580 KB'),
    ]),
  ]),
]

export const sourceKnowledgeBases: SourceKnowledgeBase[] = [...publicKnowledgeBases, ...personalKnowledgeBases]
