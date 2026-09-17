export interface OrganizationScopeNode {
  id: string
  label: string
  kind?: 'organization' | 'personal'
  children?: OrganizationScopeNode[]
}

export const defaultOrganizationScopeId = 'management'

export const organizationScopeTree: OrganizationScopeNode[] = [
  { id: 'chao-mu', label: '朝暮', kind: 'personal' },
  { id: 'management', label: '管理层' },
  {
    id: 'ye-sports',
    label: '耶运动事业部',
    children: [
      { id: 'dewu', label: '得物事业部' },
      { id: 'b2c-online', label: 'B2C线上' },
      { id: 'live', label: '直播部' },
      { id: 'digital-marketing', label: '数字营销中心' },
      { id: 'online-sales-3', label: '线上销售三部' },
      { id: 'badminton', label: '羽球事业部' },
    ],
  },
  {
    id: 'tianma-platform',
    label: '天马运动平台部',
    children: [
      { id: 'tt1', label: '天团一号' },
      { id: 'group-buying-sales', label: '团购销售部' },
      { id: 'ka', label: 'KA事业部' },
      { id: 'platform-sales', label: '平台销售部' },
      { id: 'platform-sales-middle', label: '平台销售中台' },
      { id: 'platform-operations', label: '平台运营部' },
      { id: 'supply-management', label: '货源管理部' },
    ],
  },
  { id: 'operations', label: '营运部', children: [{ id: 'operations-dept', label: '营运部' }] },
  { id: 'offline-business', label: '线下业务部', children: [{ id: 'b2c-offline', label: 'B2C线下' }] },
  { id: 'ecommerce-park', label: '电商产业园', children: [{ id: 'warehouse', label: '仓储部' }] },
  {
    id: 'hr-center',
    label: '人力资源中心',
    children: [
      { id: 'coe', label: 'COE' },
      { id: 'ssc', label: 'SSC' },
      { id: 'hrbp', label: 'HRBP' },
    ],
  },
  {
    id: 'product-operation-center',
    label: '商品运营中心',
    children: [
      { id: 'product-operation', label: '商品运营部' },
      { id: 'brand-business', label: '品牌商务部' },
    ],
  },
  {
    id: 'president-office',
    label: '总裁办',
    children: [
      { id: 'lyg-president-office', label: '连云港总裁办' },
      { id: 'nj-president-office', label: '南京总裁办' },
      { id: 'admin-dept', label: '行政部' },
      { id: 'general-office', label: '综合办' },
    ],
  },
  {
    id: 'finance-center',
    label: '财务管理中心',
    children: [
      { id: 'business-finance-support', label: '业财支持部' },
      { id: 'finance-accounting', label: '财务会计部' },
    ],
  },
  {
    id: 'operation-office',
    label: '运营办公室',
    children: [
      { id: 'fishing-business', label: '垂钓事业部' },
      { id: 'dragon-boat-business', label: '龙舟事业部' },
      { id: 'operation-office-dept', label: '运营办公室' },
    ],
  },
  {
    id: 'brand-center',
    label: '品牌中心',
    children: [
      { id: 'brand-dept', label: '品牌部' },
      { id: 'barrel-project', label: 'Barrel项目组' },
    ],
  },
]

export function findOrganizationScopeLabel(id: string): string {
  for (const root of organizationScopeTree) {
    if (root.id === id) return root.label
    const child = root.children?.find((item) => item.id === id)
    if (child) return child.label
  }
  return '管理层'
}
