import { describe, expect, it } from 'vitest'
import router from '@/router'

describe('V1.1.0 settings routes', () => {
  it('routes usage and audit through the current settings area', () => {
    const usageRoute = router.resolve('/settings/usage')
    expect(usageRoute.name).toBe('settings-usage')
    expect(usageRoute.meta.title).toBe('用量管理')
    expect(router.resolve('/settings/audit').name).toBe('settings-audit')
    expect(router.resolve('/settings/audit').meta.title).toBe('日志管理')
  })
})
