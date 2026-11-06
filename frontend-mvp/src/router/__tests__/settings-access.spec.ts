import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from '@/router'
import { useAppStore } from '@/stores/app'
import type { MockUser } from '@/types/user'

const ordinaryUser: MockUser = { id: 'ordinary-1', displayName: '普通用户', department: '商品部', role: 'user', avatarUrl: '' }
const quotaAdmin: MockUser = { id: 'manager-zhang', displayName: '张婷', department: '数字技术中心', role: 'editor', avatarUrl: '' }

describe('settings quota access routing', () => {
  beforeEach(async () => {
    localStorage.clear()
    setActivePinia(createPinia())
    await router.replace('/chat')
  })

  it('lets a configured quota administrator open the managed usage page', async () => {
    useAppStore().login(quotaAdmin)
    await router.push('/settings/usage')
    expect(router.currentRoute.value.fullPath).toBe('/settings/usage')
  })

  it('downgrades an ordinary user to personal usage instead of exposing managed usage', async () => {
    useAppStore().login(ordinaryUser)
    await router.push('/settings/usage')
    expect(router.currentRoute.value.fullPath).toBe('/settings/usage?scope=personal')
  })
})
