import { describe, expect, it, vi } from 'vitest'
import { buildTodoReminderArgs, contactSearchCandidates, executeTodoCommentRequest, loadAllChatMessages, sanitizeSnapshot, selectUniqueContact, suggestedContacts, todoPriorityValue } from './dws-workbench'

describe('DWS workbench snapshot mapping', () => {
  it('builds the real DingTalk custom-time reminder command', () => {
    expect(buildTodoReminderArgs('task-live-1', '2026-07-30T09:00:00.000Z')).toEqual([
      'todo', 'task', 'add-reminder', '--task-id', 'task-live-1',
      '--base-time', 'customTime', '--reminder-time-stamp', '2026-07-30T09:00:00.000Z',
    ])
  })

  it('maps the four UI priorities to DingTalk priority values', () => {
    expect(['low', 'normal', 'high', 'urgent'].map(todoPriorityValue)).toEqual(['10', '20', '30', '40'])
  })

  it('reads the real DWS top-level contact search result and resolves an exact nickname', () => {
    const candidates = contactSearchCandidates({
      result: [{ name: '清晖', nick: '清晖', title: 'UI设计师', userId: 'user-qinghui' }],
      success: true,
    })

    expect(candidates).toHaveLength(1)
    expect(selectUniqueContact(candidates, '清晖')).toMatchObject({ userId: 'user-qinghui', name: '清晖' })
  })

  it('does not guess when the enterprise directory contains duplicate exact names', () => {
    const candidates = contactSearchCandidates({
      result: [
        { name: '清晖', userId: 'user-1' },
        { nick: '清晖', userId: 'user-2' },
      ],
    })

    expect(() => selectUniqueContact(candidates, '清晖')).toThrow('找到多位同名人员')
  })

  it('uses real live identity and recent DingTalk senders as contact suggestions', () => {
    sanitizeSnapshot({
      identity: { result: { userId: 'user-chao-mu', name: '朝暮', department: 'AI项目组' } },
      calendar: { result: { events: [] } },
      todos: {},
      approvals: {},
      minutes: {},
      messages: {
        result: {
          messages: [{ senderUserId: 'user-qing-hui', senderName: '清晖', conversationName: '产品协作群', content: '请确认原型' }],
        },
      },
    }, 'live')

    expect(suggestedContacts()).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: '朝暮', department: 'AI项目组' }),
      expect.objectContaining({ name: '清晖', department: '产品协作群' }),
    ]))
  })

  it('keeps pending and completed todo cards with their role scopes', () => {
    const payload = sanitizeSnapshot({
      identity: { result: { name: '朝暮' } },
      todos: {
        pending: {
          result: {
            todoCards: [
              {
                taskId: 'task-live-1',
                subject: '完成工作台真实数据联调',
                dueTime: new Date('2026-07-23T18:00:00+08:00').getTime(),
                priority: 40,
                finalStatusStage: 0,
                roleTypes: ['creator', 'executor'],
              },
            ],
          },
        },
        completed: {
          result: {
            todoCards: [
              {
                subject: '确认工作台原型',
                priority: 20,
                finalStatusStage: 2,
                roleTypes: ['creator'],
              },
            ],
          },
        },
      },
      calendar: { result: { events: [] } },
      minutes: {},
      messages: {},
    }, 'live')

    expect(payload.todos).toHaveLength(2)
    expect(payload.todos[0]).toMatchObject({
      externalId: 'task-live-1',
      title: '完成工作台真实数据联调',
      priority: '紧急',
      status: '未完成',
      completed: false,
      scopes: ['created', 'responsible'],
    })
    expect(payload.todos[0]?.due).toContain('截止')
    expect(payload.todos[1]).toMatchObject({
      title: '确认工作台原型',
      status: '已完成',
      completed: true,
      scopes: ['created'],
    })
  })

  it('reads and publishes DingTalk todo comments through DWS', async () => {
    const run = vi.fn()
      .mockResolvedValueOnce({ result: { list: [{ commentId: 'c-1', creatorName: '王杰', content: '材料框架已完成', createTime: '2026-07-26 14:20' }] } })
      .mockResolvedValueOnce({ result: { commentId: 'c-2', creatorName: '朝暮', content: '请今天同步最终版本', createTime: '2026-07-26 15:10' } })

    const comments = await executeTodoCommentRequest(run, 'GET', 'task-live-1')
    const published = await executeTodoCommentRequest(run, 'POST', 'task-live-1', '请今天同步最终版本')

    expect(run).toHaveBeenNthCalledWith(1, ['todo', 'comment', 'list', '--task-id', 'task-live-1', '--page', '1', '--size', '20'])
    expect(comments).toEqual([{ id: 'c-1', author: '王杰', content: '材料框架已完成', createdAt: '2026-07-26 14:20' }])
    expect(run).toHaveBeenNthCalledWith(2, ['todo', 'comment', 'add', '--task-id', 'task-live-1', '--content', '请今天同步最终版本'])
    expect(published).toMatchObject({ id: 'c-2', author: '朝暮', content: '请今天同步最终版本' })
  })

  it('attaches a real AI minute only to a confidently matched calendar event', () => {
    const startTime = new Date('2026-07-23T13:30:00+08:00').getTime()
    const payload = sanitizeSnapshot({
      identity: { result: { name: '朝暮' } },
      calendar: {
        result: {
          events: [
            {
              summary: 'AIGC讨论推进',
              start: { dateTime: '2026-07-23T13:30:00+08:00' },
              end: { dateTime: '2026-07-23T14:30:00+08:00' },
            },
            {
              summary: '商品运营周会',
              start: { dateTime: '2026-07-23T15:00:00+08:00' },
              end: { dateTime: '2026-07-23T16:00:00+08:00' },
            },
          ],
        },
      },
      todos: { pending: {}, completed: {} },
      minutes: {
        details: {
          result: {
            minutesDetails: [
              { taskUuid: 'minute-1', title: '钉钉闪记 07-23', startTime },
            ],
          },
        },
        summaries: {
          'minute-1': { result: '会议确认了真实数据联调范围，并明确下一步完成待办与听记匹配。' },
        },
      },
      messages: {},
    }, 'live')

    expect(payload.schedules[0]?.aiInsight).toMatchObject({
      kind: 'AI 听记',
      summary: '会议确认了真实数据联调范围，并明确下一步完成待办与听记匹配。',
    })
    expect(payload.schedules[1]?.aiInsight).toBeUndefined()
    expect(payload.minutesCount).toBe(1)
  })

  it('does not mix todo or calendar data into the conversation digest', () => {
    const payload = sanitizeSnapshot({
      identity: { result: { name: '朝暮' } },
      calendar: {
        result: {
          events: [{
            summary: 'AIGC讨论推进',
            start: { dateTime: '2026-07-23T13:30:00+08:00' },
            end: { dateTime: '2026-07-23T14:30:00+08:00' },
          }],
        },
      },
      todos: {
        pending: {
          result: {
            todoCards: [{ subject: '完成真实数据联调', priority: 40, finalStatusStage: 0 }],
          },
        },
        completed: {},
      },
      minutes: {},
      messages: {},
    }, 'live')

    expect(payload.messages).toEqual([])
  })

  it('maps nested DWS messages into scored v3.9 items', () => {
    const payload = sanitizeSnapshot({
      identity: { result: { name: '朝暮', userId: 'boss-1' } },
      calendar: { result: { events: [] } },
      todos: {},
      approvals: {},
      minutes: {},
      messages: {
        result: {
          conversationMessagesList: [
            {
              openConversationId: 'group-1',
              singleChat: false,
              title: '经营群',
              messages: [
                {
                  msgId: 'm1',
                  senderUserId: 'user-2',
                  sender: '运营负责人',
                  content: 'GMV 跌破目标 20%',
                  createTime: '2026-07-23 18:10:03',
                },
              ],
            },
          ],
        },
      },
    }, 'live')

    expect(payload.messages[0]).toMatchObject({
      category: 'business',
      sourceCount: 1,
      businessDomain: '销售',
    })
    expect(payload.messages[0]?.scoreTrace.factors).toHaveLength(3)
  })

  it('does not map single chats into digest items', () => {
    const payload = sanitizeSnapshot({
      identity: { result: { name: '朝暮', userId: 'boss-1' } },
      messages: {
        result: {
          conversationMessagesList: [{
            openConversationId: 'single-1',
            singleChat: true,
            title: '某同事',
            messages: [{ msgId: 'm1', content: '错价资损', sender: '某同事' }],
          }],
        },
      },
    }, 'live')

    expect(payload.messages).toEqual([])
  })

  it('passes watch rules into the real classifier', () => {
    const payload = sanitizeSnapshot({
      identity: { result: { name: '朝暮', userId: 'boss-1' } },
      messages: {
        result: {
          conversationMessagesList: [{
            openConversationId: 'group-1',
            singleChat: false,
            title: '新品群',
            messages: [{ msgId: 'm1', content: '绿野系列已完成首轮陈列', sender: '商品负责人' }],
          }],
        },
      },
    }, 'live', [], [{ id: 'watch-1', type: 'keyword', value: '绿野', label: '绿野' }])

    expect(payload.messages[0]).toMatchObject({
      category: 'watch',
      watchType: 'keyword',
    })
  })

  it('follows DWS cursors and caps requests at 100 records', async () => {
    const run = vi.fn()
      .mockResolvedValueOnce({ result: { conversationMessagesList: [], hasMore: true, nextCursor: 'page-2' } })
      .mockResolvedValueOnce({ result: { conversationMessagesList: [], hasMore: false } })

    await loadAllChatMessages(run, '2026-07-17 00:00:00', '2026-07-23 23:59:59')

    expect(run).toHaveBeenNthCalledWith(1, expect.arrayContaining(['--limit', '100', '--cursor', '0']))
    expect(run).toHaveBeenNthCalledWith(2, expect.arrayContaining(['--cursor', 'page-2']))
  })
})
