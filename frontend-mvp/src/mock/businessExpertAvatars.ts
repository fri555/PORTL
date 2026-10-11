// Expert avatars supplied by the product owner. Keep the existing daily assistant separate.
export const businessExpertAvatarFiles: Readonly<Record<string, string>> = {
  'biz-01': 'data-analyst.png',
  'biz-02': 'assortment-expert.png',
  'biz-03': 'review-analyst.png',
  'biz-04': 'marketing-designer.png',
  'biz-05': 'sales-order-analyst.png',
  'biz-06': 'stock-sales-analyst.png',
  'biz-07': 'price-comparison.png',
  'biz-08': 'top-product-analyst.png',
  'biz-09': 'video-script-expert.png',
  'biz-10': 'wechat-communication-analyst.png',
  'biz-11': 'followup-analyst.png',
  'biz-12': 'product-allocation-expert.png',
  'biz-13': 'product-information-assistant.png',
  'biz-14': 'sports-health-expert.png',
  'biz-15': 'store-business-analyst.png',
  'biz-16': 'customer-profile-analyst.png',
  'biz-17': 'ai-title-expert.png',
  'biz-18': 'link-analyst.png',
}
export function getBusinessExpertAvatarUrl(id: string): string | undefined {
  const file = businessExpertAvatarFiles[id]
  return file ? import.meta.env.BASE_URL + 'assets/business-experts-v1/' + file : undefined
}
