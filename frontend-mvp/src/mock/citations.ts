import type { CitedParagraph, CitationSource } from '@/types/citation';

// Preview fixtures only; these are not records from the production retrieval service.
export const citationSources: CitationSource[] = [
  {
    id: 'kb-guide-v2',
    type: 'knowledge',
    title: '知识中心使用规范',
    origin: '集团公共知识库 / 使用指南',
    version: 'V2.0',
    capturedAt: '2026-10-03 02:06',
    access: 'allowed',
    fragments: [
      {
        id: 'guide-scope',
        location: '第 2 页 · 适用范围',
        text: '企业制度、内部流程和业务口径以已发布的知识文件为依据。使用前应核对文件版本及适用范围。',
      },
      {
        id: 'guide-permission',
        location: '第 3 页 · 权限说明',
        text: '员工仅可检索和使用当前账号有权限访问的知识内容。选择专家不会扩大知识访问权限。',
      },
    ],
  },
  {
    id: 'kb-sync-v1',
    type: 'knowledge',
    title: '外部知识同步说明',
    origin: '集团公共知识库 / 接入说明',
    version: 'V1.0',
    capturedAt: '2026-10-02 00:08',
    access: 'allowed',
    offline: true,
    fragments: [
      {
        id: 'sync-offline',
        location: '第 1 页 · 离线快照',
        text: '连接中断后可保留最后一次成功同步的内容和权限快照。使用时需关注最后同步时间，不应视为实时信息。',
      },
    ],
  },
  {
    id: 'web-deepseek-search',
    type: 'web',
    title: 'DeepSeek V2 系列收官，联网搜索上线官网',
    origin: 'DeepSeek · deepseek.com',
    url: 'https://www.deepseek.com/news/v2-5-final/',
    publishedAt: '2024-12-10',
    capturedAt: '2026-10-06 09:00',
    access: 'allowed',
    summary: '官方公告介绍 DeepSeek 网页端的联网搜索入口。用户可在输入框中开启联网搜索，结合公开网页信息核对回答。',
    fragments: [],
  },
  {
    id: 'web-deepseek-terms',
    type: 'web',
    title: 'DeepSeek 用户协议',
    origin: 'DeepSeek · cdn.deepseek.com',
    url: 'https://cdn.deepseek.com/policies/zh-CN/deepseek-terms-of-use.html',
    publishedAt: '2025-09-05',
    capturedAt: '2026-10-06 09:00',
    access: 'allowed',
    summary: '用户协议介绍联网模式的服务内容：检索互联网的公开信息，并基于检索结果生成内容。完整适用条款以原网页为准。',
    fragments: [],
  },
];
export const citedParagraphs: CitedParagraph[] = [
  {
    heading: '内部事实，先查知识库',
    text: '企业制度、内部流程和业务口径，优先核对有权访问的知识文件及其版本。',
    citations: [{ sourceId: 'kb-guide-v2', fragmentId: 'guide-scope' }],
  },
  {
    text: '选择专家不会扩大你的知识访问范围，仍只能使用当前账号有权访问的内容。',
    citations: [{ sourceId: 'kb-guide-v2', fragmentId: 'guide-permission' }],
  },
  {
    text: '如果数据源已断开，当前引用可能来自最后一次成功同步的内容，需要留意同步时间。',
    citations: [{ sourceId: 'kb-sync-v1', fragmentId: 'sync-offline' }],
  },
  {
    heading: '公开动态，可结合联网来源',
    text: '例如，DeepSeek 的官方公告介绍了网页端的联网搜索入口。核实产品信息时，可以直接查看对应的官方网页。',
    citations: [{ sourceId: 'web-deepseek-search' }],
  },
  {
    text: '其用户协议也说明：联网模式根据检索到的公开信息生成内容。联网结果与企业内部知识应区分来源。',
    citations: [{ sourceId: 'web-deepseek-terms' }],
  },
];
export const dailySource: CitationSource = {
  id: 'daily-snapshot',
  type: 'knowledge',
  title: '当日日程与待办（示例）',
  origin: '个人工作资料 / 钉钉',
  version: '2026-10-03',
  capturedAt: '2026-10-03 14:25',
  access: 'allowed',
  fragments: [
    {
      id: 'daily-items',
      location: '日程与待办清单',
      text: '11:30 项目进度沟通；15:00 经营数据复盘。待办：确认重点货号清单、提交经营复盘报告。',
    },
  ],
};
