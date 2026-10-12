import { afterEach,describe,it,expect } from 'vitest'
import { mount,flushPromises } from '@vue/test-utils'
import { createRouter,createMemoryHistory } from 'vue-router'
import Automation from '@/views/AutomationView.vue'
const wrappers:ReturnType<typeof mount>[]=[]
afterEach(()=>{wrappers.splice(0).forEach(w=>w.unmount());localStorage.clear()})
async function setup(url='/automation'){const router=createRouter({history:createMemoryHistory(),routes:[{path:'/automation',component:Automation}]});await router.push(url);await router.isReady();const w=mount(Automation,{global:{plugins:[router]}});wrappers.push(w);return {w,router}}
describe('automation review prototype',()=>{
 it('defaults permissions and keeps the previous run unchanged when retrying',async()=>{const {w,router}=await setup('/automation?runId=run-todo-1012');expect((w.get('[data-testid="automation-permission"]').element as HTMLSelectElement).value).toBe('default');expect(w.get('.notice-card').text()).toContain('执行状态：失败');await w.findAll('button').find(b=>b.text()==='重试任务')!.trigger('click');await flushPromises();expect(router.currentRoute.value.query.runId).not.toBe('run-todo-1012');expect(w.get('.run-detail').text()).toContain('等待确认执行计划');expect(w.get('.run-list').text()).toContain('钉钉授权已失效')})
 it('stores selected permissions in each run and blocks invalid reminder thresholds',async()=>{const {w,router}=await setup();await w.get('[data-testid="automation-permission"]').setValue('autonomous');await w.get('[aria-label="无进展提醒时长"]').setValue(0);await w.findAll('button').find(b=>b.text()==='运行示例')!.trigger('click');expect(router.currentRoute.value.query.runId).toBeUndefined();await w.get('[aria-label="无进展提醒时长"]').setValue(60);await w.findAll('button').find(b=>b.text()==='运行示例')!.trigger('click');await flushPromises();expect(w.get('.run-detail').text()).toContain('等待本人完成钉钉 DWS 授权');expect(w.get('.run-list tbody tr').text()).toContain('自主执行')})
 it('shows missing record feedback for an invalid notification destination',async()=>{const {w}=await setup('/automation?runId=not-found');expect(w.get('.run-detail').text()).toContain('记录不存在或无权访问');expect(w.find('.notice-card').exists()).toBe(false)})
})
