import type { DingTalkImportTask } from '@/types/knowledge-source'

/** Illustrative task-level records; repeated scheduled sync keeps importTaskId and localFileId. */
export const dingTalkImportTaskFixtures: DingTalkImportTask[] = [
  {
    importTaskId: 'DT-20261012-0001', recordId: 'R001', taskId: 'T001', platformUserId: 'u_001', userAlias: '朝暮',
    destinationId: 'policy-hr', destinationPath: '集团制度知识库 / 人事制度',
    frequency: '每天', schedule: '00:00', latestSyncAt: '2026-10-12 09:18', executedAt: '2026-10-12 00:00', status: '同步成功',
    documentMappings: [
      { sourceDocumentId: 'onboarding', sourceName: '集团制度知识库 / 人事制度 / 新员工入职指南', localFileId: 'policy-import-onboarding', status: '成功', sourceModifiedAt: '2026-10-12 08:30', lastSuccessfulModifiedAt: '2026-10-12 08:30', contentResult: '未变化', permissionResult: '后续不更新', permissionSyncedAt: '2026-10-12 09:18', permissionMemberCount: 12 },
      { sourceDocumentId: 'attendance', sourceName: '集团制度知识库 / 人事制度 / 考勤与休假制度', localFileId: 'policy-import-attendance', status: '成功', sourceModifiedAt: '2026-10-11 18:20', lastSuccessfulModifiedAt: '2026-10-11 18:20', contentResult: '已更新', permissionResult: '后续不更新', permissionSyncedAt: '2026-10-12 09:18', permissionMemberCount: 6 },
    ],
  },
  {
    importTaskId: 'DT-20261011-0002', recordId: 'R002', taskId: 'T002', platformUserId: 'u-demo-wangjie', userAlias: '清晖',
    destinationId: 'kb-public-8', destinationPath: '技术项目资料库',
    frequency: '每周', schedule: '周一 09:00', latestSyncAt: '2026-10-11 16:42', executedAt: '2026-10-06 09:00', status: '同步成功',
    documentMappings: [
      { sourceDocumentId: 'demo-project-spec', sourceName: '数字技术中心 / 项目规范', localFileId: 'tech-import-project-spec', status: '成功' },
    ],
  },
  {
    importTaskId: 'DT-20261010-0003', recordId: 'R003', taskId: 'T003', platformUserId: 'u-demo-lijuan', userAlias: '知夏',
    destinationId: 'online-campaigns', destinationPath: '线上运营素材库 / 活动运营',
    frequency: '每天', schedule: '02:00', latestSyncAt: '2026-10-12 02:03', executedAt: '2026-10-12 02:00', status: '部分失败',
    failureReason: '部分文档导出权限已变更',
    documentMappings: [
      { sourceDocumentId: 'demo-review', sourceName: 'B2C运营 / 活动复盘', localFileId: 'online-import-review', status: '成功' },
      { sourceDocumentId: 'demo-review-data', sourceName: 'B2C运营 / 复盘数据', localFileId: '', status: '失败', failureReason: '源文档导出权限已变更' },
    ],
  },
  {
    importTaskId: 'DT-20261009-0004', recordId: 'R004', taskId: 'T004', platformUserId: 'u-demo-zhangwei', userAlias: '墨白',
    destinationId: 'policy-hr', destinationPath: '集团制度知识库 / 人事制度',
    frequency: '每天', schedule: '01:00', latestSyncAt: '2026-10-09 01:05', executedAt: '2026-10-09 01:00', status: '同步成功',
    documentMappings: [
      { sourceDocumentId: 'demo-safety', sourceName: '安全生产部 / 安全操作手册', localFileId: 'safety-import-manual', status: '成功' },
    ],
  },
  {
    importTaskId: 'DT-20261008-0005', recordId: 'R005', taskId: 'T005', platformUserId: 'u-demo-chenxi', userAlias: '若溪',
    destinationId: 'finance-docs', destinationPath: '财务合规文档库',
    frequency: '每周', schedule: '周一 03:00', latestSyncAt: '2026-10-08 03:12', executedAt: '2026-10-06 03:00', status: '同步中',
    documentMappings: [
      { sourceDocumentId: 'demo-finance-q3', sourceName: '财务管理中心 / Q3报表', localFileId: '', status: '成功' },
      { sourceDocumentId: 'demo-finance-audit', sourceName: '财务管理中心 / 审计报告', localFileId: '', status: '成功' },
    ],
  },
  {
    importTaskId: 'DT-20261007-0006', recordId: 'R006', taskId: 'T006', platformUserId: 'u-demo-haoyu', userAlias: '逸尘',
    destinationId: 'marketing-kb', destinationPath: '市场营销知识库 / 品牌素材',
    frequency: '每天', schedule: '00:30', latestSyncAt: '2026-10-07 00:35', executedAt: '2026-10-07 00:30', status: '同步失败',
    failureReason: '连接超时，源端无响应',
    documentMappings: [
      { sourceDocumentId: 'demo-brand', sourceName: '品牌管理部 / 品牌VI规范', localFileId: '', status: '失败', failureReason: '连接超时，源端无响应' },
    ],
  },
  {
    importTaskId: 'DT-20261006-0007', recordId: 'R007', taskId: 'T007', platformUserId: 'u_001', userAlias: '朝暮',
    destinationId: 'training-kb', destinationPath: '培训资料中心',
    frequency: '不自动同步', schedule: '—', latestSyncAt: '2026-10-06 14:20', executedAt: '2026-10-06 14:20', status: '同步成功',
    documentMappings: [
      { sourceDocumentId: 'demo-training-new', sourceName: '培训中心 / 新人培训课件', localFileId: 'training-import-new', status: '成功' },
      { sourceDocumentId: 'demo-training-adv', sourceName: '培训中心 / 进阶技能培训', localFileId: 'training-import-adv', status: '成功' },
    ],
  },
]

/** Prototype read boundary: credentials do not grant a normal user other users' tasks. */
export function scopedDingTalkImportTasks(records: DingTalkImportTask[], platformUserId: string | undefined, role: string | undefined): DingTalkImportTask[] {
  if (!platformUserId || !role) return []
  return role === 'admin' ? records : records.filter(record => record.platformUserId === platformUserId)
}
