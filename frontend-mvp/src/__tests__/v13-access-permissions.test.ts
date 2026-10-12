import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import KnowledgeBaseView from '@/views/KnowledgeBaseView.vue'
import { useAppStore } from '@/stores/app'
import { mockUser } from '@/mock/user'

const wrappers: ReturnType<typeof mount>[] = []
beforeEach(() => localStorage.clear())
afterEach(() => wrappers.splice(0).forEach(w => w.unmount()))
async function page(role: 'admin' | 'user') {
  const pinia=createPinia();setActivePinia(pinia)
  const app=useAppStore();app.login({...mockUser,role})
  const router=createRouter({history:createMemoryHistory(),routes:[{path:'/knowledge',component:KnowledgeBaseView}]})
  await router.push('/knowledge?view=access&create=1');await router.isReady()
  const w=mount(KnowledgeBaseView,{global:{plugins:[pinia,router],stubs:{Teleport:true}}});wrappers.push(w)
  await flushPromises();return {w,app}
}
describe('knowledge access role boundary',()=>{
  it('hides the entry and ignores direct configuration URLs for a normal user',async()=>{
    const {w}=await page('user')
    expect(w.find('.knowledge-sidebar__access').exists()).toBe(false)
    expect(w.find('.access-panel').exists()).toBe(false)
    expect(w.find('.knowledge-table').exists()).toBe(true)
  })
  it('shows admin configuration and closes it immediately when the role is revoked',async()=>{
    const {w,app}=await page('admin')
    expect(w.find('.knowledge-sidebar__access').exists()).toBe(true)
    expect(w.find('.access-panel').exists()).toBe(true)
    app.login({...mockUser,role:'user'});await flushPromises()
    expect(w.find('.knowledge-sidebar__access').exists()).toBe(false)
    expect(w.find('.access-panel').exists()).toBe(false)
  })
})
