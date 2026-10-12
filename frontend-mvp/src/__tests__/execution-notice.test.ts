import { describe,it,expect } from 'vitest'
import { executionNotice, type ExecutionNoticeInput } from '@/utils/executionNotice'
const run:ExecutionNoticeInput={taskId:'t1',runId:'r1',kind:'agent',taskName:'每日数据巡检',subjectName:'数据巡检 Agent',executedAt:'2026-10-12 09:00:00',state:'success',conversationId:'expert-r1'}
describe('execution notifications',()=>{
 it('does not link an agent to the wrong record when its conversation binding is missing',()=>{expect(executionNotice({...run,conversationId:undefined}).href).toBe('')})
 it('links agent results to their exact conversation and omits failure text on success',()=>{const n=executionNotice(run);expect(n.href).toBe('/PORTL/chat/expert-r1');expect(n.lines.join('\n')).not.toContain('失败原因');expect(n.title).toBe('智能体任务执行通知')})
 it('links todo failure to its run detail and preserves reason',()=>{const n=executionNotice({...run,kind:'todo',state:'abnormal',reason:'账号授权失效'});expect(n.href).toBe('/PORTL/automation?runId=r1');expect(n.lines).toContain('失败原因：账号授权失效');expect(n.lines).toContain('执行状态：失败')})
 it('uses separate keys for each interruption and a single key for the terminal result',()=>{const a=executionNotice({...run,state:'waiting',interruptionId:'a'}),b=executionNotice({...run,state:'waiting',interruptionId:'b'});expect(a.key).not.toBe(b.key);expect(a.key).not.toBe(executionNotice(run).key)})
})
