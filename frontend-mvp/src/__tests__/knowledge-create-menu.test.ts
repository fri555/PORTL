import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import View from '@/views/KnowledgeBaseView.vue'
import { useAppStore } from '@/stores/app'
import { mockUser } from '@/mock/user'
const wrappers: ReturnType<typeof mount>[]=[]
afterEach(()=>{wrappers.splice(0).forEach(w=>w.unmount());localStorage.clear()})
async function page(loggedIn=true,role:'user'|'admin'='user'){
  const pinia=createPinia();setActivePinia(pinia);const app=useAppStore();if(loggedIn)app.login({...mockUser,role});else app.logout()
  const router=createRouter({history:createMemoryHistory(),routes:[{path:'/knowledge',component:View}]});await router.push('/knowledge');await router.isReady()
  const w=mount(View,{attachTo:document.body,global:{plugins:[pinia,router],stubs:{KnowledgeDialogs:{props:['kind'],template:'<div data-testid="active-dialog">{{kind}}</div>'},DingTalkDocumentImport:{template:'<div data-testid="import-dialog"/>'}}}});wrappers.push(w);return w
}
describe('knowledge create menu',()=>{
  it('groups creation separately from upload like the live knowledge center',async()=>{
    const w=await page();const toolbar=w.get('[data-testid="knowledge-action-row"]')
    expect(toolbar.find('[aria-label="上传"]').exists()).toBe(false)
    expect(toolbar.find('[aria-label="新建文件夹"]').exists()).toBe(false)
    await toolbar.get('[aria-label="新建"]').trigger('click')
    expect(w.get('[aria-label="新建菜单"]').findAll('[role="menuitem"]').map(b=>b.attributes('aria-label'))).toEqual(['新建知识库'])
    await w.findAll('[data-testid="knowledge-kb-row"]')[0].trigger('click')
    await toolbar.get('[aria-label="上传"]').trigger('click')
    expect(w.find('[aria-label="新建菜单"]').exists()).toBe(false)
    expect(w.get('[aria-label="上传菜单"]').findAll('[role="menuitem"]').map(b=>b.attributes('aria-label'))).toEqual(['上传文件','从钉钉导入'])
    await toolbar.get('[aria-label="上传文件"]').trigger('click')
    expect(w.get('[data-testid="active-dialog"]').text()).toBe('upload')
    expect(w.find('[aria-label="上传菜单"]').exists()).toBe(false)
  })
  it('keeps folder creation and DingTalk import reachable from their live action groups',async()=>{
    const w=await page();const toolbar=w.get('[data-testid="knowledge-action-row"]');await w.findAll('[data-testid="knowledge-kb-row"]')[0].trigger('click');await toolbar.get('[aria-label="新建"]').trigger('click');await toolbar.get('[aria-label="新建文件夹"]').trigger('click')
    expect(w.get('[data-testid="active-dialog"]').text()).toBe('folder')
    await w.get('[data-testid="knowledge-action-row"]').get('[aria-label="上传"]').trigger('click');await w.get('[aria-label="上传菜单"]').get('[aria-label="从钉钉导入"]').trigger('click')
    expect(w.find('[data-testid="import-dialog"]').exists()).toBe(true)
    expect(w.find('[aria-label="上传菜单"]').exists()).toBe(false)
  })
  it('closes on outside click and Escape and supports keyboard navigation',async()=>{
    const w=await page();const toolbar=w.get('[data-testid="knowledge-action-row"]');const trigger=toolbar.get('[aria-label="新建"]');await trigger.trigger('click')
    const menu=toolbar.get('[aria-label="新建菜单"]');await menu.trigger('keydown',{key:'ArrowDown'})
    expect(document.activeElement).toBe(menu.findAll('button')[0].element)
    await menu.trigger('keydown',{key:'Escape'})
    expect(w.find('[aria-label="新建菜单"]').exists()).toBe(false);expect(document.activeElement).toBe(trigger.element)
    await trigger.trigger('click');document.body.click();await w.vm.$nextTick()
    expect(w.find('[aria-label="新建菜单"]').exists()).toBe(false)
  })
  it('lets keyboard users choose Upload actions and return focus with Escape',async()=>{
    const w=await page();const toolbar=w.get('[data-testid="knowledge-action-row"]');await w.findAll('[data-testid="knowledge-kb-row"]')[0].trigger('click');const trigger=toolbar.get('[aria-label="上传"]')
    await trigger.trigger('keydown',{key:'ArrowDown'});const menu=toolbar.get('[aria-label="上传菜单"]')
    expect(document.activeElement).toBe(menu.findAll('button')[0].element)
    await menu.trigger('keydown',{key:'Escape'})
    expect(w.find('[aria-label="上传菜单"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
  })
  it('keeps DingTalk import disabled without a logged-in user',async()=>{
    const w=await page(false);await w.findAll('[data-testid="knowledge-kb-row"]')[0].trigger('click');await w.get('[data-testid="knowledge-action-row"]').get('[aria-label="上传"]').trigger('click')
    expect(w.get('[aria-label="上传菜单"]').get('[aria-label="从钉钉导入"]').attributes('disabled')).toBeDefined()
  })
  it('keeps the live knowledge access entry in the content toolbar',async()=>{
    const w=await page(true,'admin');const toolbar=w.get('[data-testid="knowledge-action-row"]')
    expect(toolbar.get('[aria-label="知识接入"]').text()).toContain('知识接入')
  })
})
