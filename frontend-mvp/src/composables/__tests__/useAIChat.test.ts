import { describe, expect, it } from 'vitest'
import { stripModePrefix, summarizeConversationTitle } from '../useAIChat'

describe('AI chat display helpers', () => {
  it('hides run-mode prefixes from user-facing text', () => {
    expect(stripModePrefix('[专家模式：P&E架构，可调用工具和MCP完成复杂任务]\n帮我出团购方案')).toBe('帮我出团购方案')
  })

  it('summarizes conversation titles without brackets or long prompts', () => {
    expect(summarizeConversationTitle('[专家模式：P&E架构，可调用工具和MCP完成复杂任务]\n帮我给B2B线下客户出一版团购方案')).toBe('团购方案初稿')
  })
})
