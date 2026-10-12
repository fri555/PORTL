import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Reminder from '@/components/chat/source-clone/TaskStallReminder.vue'
const wrappers: ReturnType<typeof mount>[]=[]
afterEach(()=>{wrappers.forEach(w=>w.unmount());wrappers.length=0;vi.useRealTimers()})
describe('task interruption and result notifications',()=>{
 it('notifies immediately for mandatory input without waiting for the stagnation timer',()=>{const w=mount(Reminder,{props:{taskId:'t1',title:'测试任务',state:'awaiting_clarification',progressKey:'required'}});wrappers.push(w);expect(w.get('.reminder-preview').text()).toContain('等待补充必填信息')})
 it('waits 60 seconds for running inactivity and replaces it with a terminal result',async()=>{vi.useFakeTimers();const w=mount(Reminder,{props:{taskId:'t2',title:'测试任务',state:'running',progressKey:'run'}});wrappers.push(w);await vi.advanceTimersByTimeAsync(59000);expect(w.find('.reminder-preview').exists()).toBe(false);await vi.advanceTimersByTimeAsync(1000);expect(w.get('.reminder-preview').text()).toContain('60 秒');await w.setProps({state:'failed',progressKey:'failed',failureReason:'连接超时'});expect(w.get('.reminder-preview').text()).toContain('失败原因：连接超时');await vi.advanceTimersByTimeAsync(60000);expect(w.get('.reminder-preview').text()).not.toContain('60 秒')})
})
