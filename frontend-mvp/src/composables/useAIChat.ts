import { ref, computed, watch } from 'vue'

// ---- types ----
export interface ThinkingStep {
  id: string
  label: string
  detail: string
  status: 'pending' | 'running' | 'completed' | 'error'
  icon: string
  elapsed?: number
  errorMsg?: string
  module?: 'status' | 'plan' | 'todo' | 'reply'
  kind?: 'summary' | 'plan' | 'tool' | 'todo' | 'reply'
  toolName?: string
  toolLabel?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  thinking?: ThinkingStep[] // only on assistant messages
  attachments?: ChatAttachment[] // user-uploaded files rendered in the bubble
}

export interface ChatAttachment {
  name: string
  size?: number
  ext: string // pdf | doc | docx | md | txt | xlsx | ...
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
  summary?: string
  isFavorite?: boolean
  isPinned?: boolean
  mode?: 'quick' | 'task'
}

export type ModelProvider = 'anthropic' | 'openai' | 'openai-compatible' | 'simulated'

export interface AIChatConfig {
  provider: ModelProvider
  apiKey: string
  apiBase: string
  model: string
  maxTokens: number
  systemPrompt: string
}

// ---- defaults ----
const DEFAULT_SYSTEM_PROMPT = `你是天马AI门户的方案中心主管智能体。你需要：

1. 先用"方案中心主管"的角色理解用户意图，判断是否在方案中心相关任务范围内。
2. 提取客户类型、数量、预算、活动场景、品类、品牌偏好、颜色/男女比例、交付时间等字段。
3. 缺字段时先追问，不直接编造。
4. 字段足够后调用"组货方案专家"子智能体。
5. 最终输出业务可读的方案说明，并解释引用来源。
6. 如果你不确定或无法回答，诚实告知并记录为知识缺口。

回复时请用 Markdown 格式，结构清晰。`

// ---- storage helpers ----
const STORAGE_PREFIX = 'tianma_ai_'

function loadStored(key: string, fallback: string): string {
  try { return localStorage.getItem(STORAGE_PREFIX + key) ?? fallback } catch { return fallback }
}
function saveStored(key: string, value: string) {
  try { localStorage.setItem(STORAGE_PREFIX + key, value) } catch { /* noop */ }
}

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + 'conversations')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function saveConversations(list: Conversation[]) {
  try {
    const trimmed = list.slice(-50)
    const json = JSON.stringify(trimmed)
    if (json.length < 10_000_000) {
      localStorage.setItem(STORAGE_PREFIX + 'conversations', json)
    }
  } catch { /* noop */ }
}

export function stripModePrefix(content: string): string {
  return content.replace(/^\[(?:日常办公|专家模式|快速模式|任务模式)[^\]]*\]\s*/u, '').trim()
}

export function summarizeConversationTitle(content: string): string {
  const clean = stripModePrefix(content)
  const compact = clean
    .replace(/\s+/g, '')
    .replace(/[，。！？、,.!?:：；;（）()【】[\]「」"'`~*_#>|-]/g, '')

  if (!compact) return '新会话'
  if (/团购|组货|预算/.test(compact)) return '团购方案初稿'
  if (/门店|需求|字段/.test(compact)) return '门店需求采集'
  if (/案例|复用|匹配/.test(compact)) return '案例复用方案'
  if (/知识库|资料|引用/.test(compact)) return '知识库检索'
  if (/待办|任务|跟进/.test(compact)) return '任务跟进安排'
  return compact.slice(0, 8)
}

function isPureGreeting(content: string): boolean {
  const clean = stripModePrefix(content).trim().replace(/[!！。.\s]/g, '').toLowerCase()
  return ['你好', '您好', '嗨', 'hi', 'hello', '哈喽', '在吗', '谢谢', '感谢', '再见', '拜拜', '你是谁'].includes(clean)
}

// ---- context window estimation ----
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[一-鿿㐀-䶿]/g) || []).length
  const otherChars = text.length - chineseChars
  return Math.ceil(chineseChars / 1.5 + otherChars / 3.5)
}

// ---- ID generation ----
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ---- singleton factory ----
let _instance: ReturnType<typeof createAIChat> | null = null

function createAIChat() {
  // config
  const config = ref<AIChatConfig>({
    provider: (loadStored('provider', 'simulated') as ModelProvider),
    apiKey: loadStored('apiKey', ''),
    apiBase: loadStored('apiBase', 'https://api.anthropic.com/v1'),
    model: loadStored('model', 'claude-sonnet-4-6'),
    maxTokens: 8192,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  })

  // state
  const conversations = ref<Conversation[]>(loadConversations())
  const activeConversationId = ref<string | null>(null)
  const isStreaming = ref(false)
  const currentThinking = ref<ThinkingStep[]>([])

  const activeConversation = computed(() =>
    conversations.value.find((c) => c.id === activeConversationId.value) ?? null,
  )

  const activeMessages = computed(() => activeConversation.value?.messages ?? [])

  const contextStats = computed(() => {
    const msgs = activeMessages.value
    const totalTokens = msgs.reduce((sum, m) => sum + estimateTokens(m.content), 0)
    return {
      messageCount: msgs.length,
      estimatedTokens: totalTokens,
      maxTokens: config.value.maxTokens,
      usagePercent: Math.round((totalTokens / config.value.maxTokens) * 100),
    }
  })

  // persist config changes
  watch(() => config.value.provider, (v) => saveStored('provider', v))
  watch(() => config.value.apiKey, (v) => saveStored('apiKey', v))
  watch(() => config.value.apiBase, (v) => saveStored('apiBase', v))
  watch(() => config.value.model, (v) => saveStored('model', v))

  // persist conversations on change (debounced)
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  watch(conversations, () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveConversations(conversations.value), 500)
  }, { deep: true })

  // ---- conversation management ----
  function createConversation(title?: string): Conversation {
    const conv: Conversation = {
      id: uid(),
      title: title || '新会话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      isPinned: false,
      mode: 'quick',
    }
    conversations.value.unshift(conv)
    activeConversationId.value = conv.id
    return conv
  }

  function switchConversation(id: string) {
    activeConversationId.value = id
  }

  function deleteConversation(id: string) {
    const idx = conversations.value.findIndex((c) => c.id === id)
    if (idx === -1) return
    conversations.value.splice(idx, 1)
    if (activeConversationId.value === id) {
      activeConversationId.value = conversations.value[0]?.id ?? null
    }
  }

  function updateConversationTitle(id: string, title: string) {
    const conv = conversations.value.find((c) => c.id === id)
    if (conv) { conv.title = title; conv.updatedAt = Date.now() }
  }

  function toggleConversationFavorite(id: string) {
    const conv = conversations.value.find((c) => c.id === id)
    if (conv) { conv.isFavorite = !conv.isFavorite; conv.updatedAt = Date.now() }
  }

  function toggleConversationPinned(id: string) {
    const conv = conversations.value.find((c) => c.id === id)
    if (conv) { conv.isPinned = !conv.isPinned; conv.updatedAt = Date.now() }
  }

  // ---- context window management ----
  function trimContext(conv: Conversation, maxTokens: number = 6000) {
    const msgs = conv.messages
    let totalTokens = 0
    const kept: ChatMessage[] = []
    for (let i = msgs.length - 1; i >= 0; i--) {
      const tokens = estimateTokens(msgs[i].content)
      if (totalTokens + tokens <= maxTokens) {
        kept.unshift(msgs[i])
        totalTokens += tokens
      } else {
        if (kept.length === 0) {
          kept.unshift({
            id: msgs[i].id,
            role: 'system',
            content: `[上下文过长已截断] 之前的讨论涉及: ${conv.summary || conv.title}`,
            timestamp: msgs[i].timestamp,
          })
        } else {
          const summaryTokens = msgs.slice(0, i + 1).reduce((s, m) => s + estimateTokens(m.content), 0)
          kept.unshift({
            id: uid(),
            role: 'system',
            content: `[早期对话已摘要] 共省略 ${i + 1} 条消息(~${summaryTokens} tokens)，核心主题: ${conv.summary || conv.title}`,
            timestamp: msgs[0].timestamp,
          })
        }
        break
      }
    }
    conv.messages = kept
  }

  // ---- simulated thinking chain ----
  function buildThinkingChain(intent: string): ThinkingStep[] {
    if (isPureGreeting(intent)) {
      return [
        {
          id: 'greeting-intent',
          label: '理解用户输入',
          detail: '识别为寒暄闲聊，无需调用工具。',
          status: 'pending',
          icon: 'message',
          module: 'status',
          kind: 'summary',
        },
        {
          id: 'greeting-answer',
          label: '生成最终回复',
          detail: '使用轻量对话链路直接回复。',
          status: 'pending',
          icon: 'message',
          module: 'reply',
          kind: 'reply',
        },
      ]
    }

    if (intent.includes('[日常办公') || intent.includes('[快速模式')) {
      return [
        {
          id: 'intent',
          label: '理解任务',
          detail: '正在确认任务目标和资料范围。',
          status: 'pending',
          icon: 'sparkles',
          module: 'status',
          kind: 'summary',
        },
        {
          id: 'rag',
          label: '检索相关资料',
          detail: '正在检索知识库，并按需补充网页资料。',
          status: 'pending',
          icon: 'database',
          module: 'status',
          kind: 'tool',
          toolName: 'knowledge_search',
          toolLabel: '资料检索',
        },
        {
          id: 'answer',
          label: '生成最终回复',
          detail: '正在整理可直接阅读的回答。',
          status: 'pending',
          icon: 'message',
          module: 'reply',
          kind: 'reply',
        },
      ]
    }

    return [
      {
        id: 'intent',
        label: '理解任务',
        detail: '正在确认目标、约束和交付标准。',
        status: 'pending',
        icon: 'sparkles',
        module: 'status',
        kind: 'summary',
      },
      {
        id: 'plan',
        label: '制定执行计划',
        detail: '需求校验 → 资料检索 → 方案匹配 → 预算计算 → 交付检查。',
        status: 'pending',
        icon: 'list',
        module: 'plan',
        kind: 'plan',
      },
      {
        id: 'todo-validate',
        label: '校验需求字段',
        detail: '确认客户类型、预算、场景及交付要求。',
        status: 'pending',
        icon: 'check',
        module: 'todo',
        kind: 'todo',
      },
      {
        id: 'knowledge-cases',
        label: '查询成功案例',
        detail: '正在读取当前用户有权限的成功案例。',
        status: 'pending',
        icon: 'database',
        module: 'status',
        kind: 'tool',
        toolName: 'knowledge_search',
        toolLabel: '知识库检索',
      },
      {
        id: 'knowledge-template',
        label: '查询方案模板',
        detail: '正在补充查询可复用的方案与预算模板。',
        status: 'pending',
        icon: 'database',
        module: 'status',
        kind: 'tool',
        toolName: 'knowledge_search',
        toolLabel: '知识库检索',
      },
      {
        id: 'todo-search',
        label: '检索授权资料',
        detail: '读取案例、模板及商品资料。',
        status: 'pending',
        icon: 'check',
        module: 'todo',
        kind: 'todo',
      },
      {
        id: 'solution-match',
        label: '匹配候选方案',
        detail: '正在根据场景与预算筛选候选方案。',
        status: 'pending',
        icon: 'wrench',
        module: 'status',
        kind: 'tool',
        toolName: 'solution_match',
        toolLabel: '方案匹配',
      },
      {
        id: 'todo-solution',
        label: '生成候选方案',
        detail: '组合商品与方案结构。',
        status: 'pending',
        icon: 'check',
        module: 'todo',
        kind: 'todo',
      },
      {
        id: 'budget-calc',
        label: '计算预算分档',
        detail: '正在生成经济型、均衡型和品质型三档预算。',
        status: 'pending',
        icon: 'calculator',
        module: 'status',
        kind: 'tool',
        toolName: 'budget_calculator',
        toolLabel: '预算计算',
      },
      {
        id: 'todo-files',
        label: '检查交付文件',
        detail: '检查 Markdown、Excel 与 PPT 产物。',
        status: 'pending',
        icon: 'check',
        module: 'todo',
        kind: 'todo',
      },
      {
        id: 'todo-reply',
        label: '整理最终回复',
        detail: '汇总结论、引用来源和知识缺口。',
        status: 'pending',
        icon: 'check',
        module: 'todo',
        kind: 'todo',
      },
      {
        id: 'output',
        label: '生成最终回复',
        detail: '正在整理结论、交付文件和需要确认的信息。',
        status: 'pending',
        icon: 'message',
        module: 'reply',
        kind: 'reply',
      },
    ]
  }

  function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

  async function runSimulatedThinking(steps: ThinkingStep[], intent: string): Promise<string> {
    const details: Record<string, string> = {
      'greeting-intent': '已识别为寒暄输入，跳过知识库、联网搜索和工具调用。',
      'greeting-answer': '已生成轻量回复。',
      intent: '已确认任务目标、范围和交付要求。',
      plan: '已生成执行计划：需求校验、资料检索、方案匹配、预算计算和交付检查。',
      rag: '检索完成：内部知识库 4 条，网页资料 2 条。',
      answer: '已整合资料并生成最终回答。',
      'todo-validate': '需求字段校验完成。',
      'knowledge-cases': '返回 3 个运动鞋团购成功案例。',
      'knowledge-template': '返回 1 份通用预算模板和 1 份方案字段模板。',
      'todo-search': '授权范围内的资料检索完成。',
      'solution-match': '匹配到 6 个候选组合，已保留 3 个可执行方案。',
      'todo-solution': '候选方案生成完成。',
      'budget-calc': '已生成经济型、均衡型和品质型三档预算。',
      'todo-files': 'Markdown、Excel 和 PPT 产物检查完成。',
      'todo-reply': '最终回复与引用来源整理完成。',
      output: '最终回复已生成，并标注需人工确认的库存与价格信息。',
    }

    for (const step of steps) {
      step.status = 'running'
      const startedAt = Date.now()
      const delay = step.kind === 'tool' ? 760 : step.kind === 'todo' ? 220 : 420
      await sleep(delay + Math.random() * 160)
      step.status = 'completed'
      step.detail = details[step.id] ?? step.detail
      step.elapsed = Date.now() - startedAt
    }

    if (isPureGreeting(intent)) {
      return '你好，我是小马。有什么需要我帮你处理的，直接告诉我就行。'
    }
    return buildSimulatedResponse(intent)
  }

  function buildSimulatedResponse(intent: string): string {
    const now = new Date().toLocaleDateString('zh-CN')
    const userIntent = stripModePrefix(intent)
    return `## 📋 方案中心 · 组货方案初稿

> 生成日期：${now}
> 引用来源：运动鞋团购成功案例 · 通用预算池 · 方案中心字段模板

### 一、需求理解
根据您的描述「${userIntent.slice(0, 60)}...」，初步判断为**方案中心组货类需求**。

不过目前还有以下关键字段需要确认：

| 字段 | 状态 | 说明 |
|------|------|------|
| 客户类型 | ❓ 待确认 | B2B线下 / 门店 / 服务商团购 |
| 预算范围 | ❓ 待确认 | 单笔预算区间影响组货策略 |
| 活动场景 | ❓ 待确认 | 节日礼盒 / 员工福利 / 客户回馈 |
| 品类偏好 | ❓ 待确认 | 运动鞋 / 配件 / 服饰搭配 |
| 交付时间 | ❓ 待确认 | 影响库存 SKU 选择 |

### 二、初步组货建议（预计三档）
| 档位 | 预算占比 | 产品组合 | 适用场景 |
|------|----------|----------|----------|
| 🥉 经济型 | ~40% | 基础款运动鞋 2-3 款 | 覆盖人数最大化 |
| 🥈 均衡型 | ~40% | 核心款运动鞋 + 配件 | 品质与数量兼顾 |
| 🥇 品质型 | ~20% | 高端鞋款 / 限量款 | 核心客户专属 |

### 三、输出附件
- ✅ **Excel 组货清单** — 含 SPU/SKU、预估价格、库存状态
- ✅ **PPT 客户方案草稿** — 可直接用于客户沟通
- ⚠️ **知识缺口** — 部分品牌最新库存价格待补充

> 💡 请补充上述缺失字段，我将继续生成完整的组货方案。`
  }

  // ---- real API call (supports Anthropic + OpenAI-compatible) ----
  async function callRealAPI(
    messages: { role: string; content: string }[],
    onChunk?: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const { apiKey, apiBase, model, systemPrompt, provider } = config.value

    if (!apiKey) throw new Error('API Key 未配置，请在设置中填写')

    const isOpenAICompat = provider === 'openai' || provider === 'openai-compatible' ||
      apiBase.includes('deepseek') || apiBase.includes('openai') ||
      apiBase.includes('/v1')

    const systemMessages = messages.filter((m) => m.role === 'system')
    const chatMessages = messages.filter((m) => m.role !== 'system')

    if (isOpenAICompat) {
      const body: Record<string, unknown> = {
        model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          ...systemMessages.map((m) => ({ role: m.role, content: m.content })),
          ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 4096,
        stream: !!onChunk,
      }

      const url = `${apiBase.replace(/\/$/, '')}/chat/completions`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      })

      if (!response.ok) {
        const err = await response.text().catch(() => 'Unknown error')
        throw new Error(`API 错误 ${response.status}: ${err}`)
      }

      if (!onChunk) {
        const data = await response.json()
        return data.choices?.[0]?.message?.content ?? JSON.stringify(data)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Stream not available')
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))
        for (const line of lines) {
          const json = line.slice(6)
          if (json === '[DONE]') continue
          if (json.trim() === '') continue
          try {
            const parsed = JSON.parse(json)
            const content = parsed.choices?.[0]?.delta?.content ?? ''
            if (content) {
              fullText += content
              onChunk(content)
            }
          } catch { /* skip malformed lines */ }
        }
      }

      return fullText
    } else {
      const body: Record<string, unknown> = {
        model,
        max_tokens: 4096,
        stream: !!onChunk,
        messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
      }

      if (systemPrompt || systemMessages.length > 0) {
        body.system = [systemPrompt, ...systemMessages.map((m) => m.content)].filter(Boolean).join('\n\n')
      }

      const response = await fetch(`${apiBase.replace(/\/$/, '')}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal,
      })

      if (!response.ok) {
        const err = await response.text().catch(() => 'Unknown error')
        throw new Error(`API 错误 ${response.status}: ${err}`)
      }

      if (!onChunk) {
        const data = await response.json()
        return data.content?.[0]?.text ?? JSON.stringify(data)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Stream not available')
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))
        for (const line of lines) {
          const json = line.slice(6)
          if (json === '[DONE]') continue
          try {
            const parsed = JSON.parse(json)
            if (parsed.type === 'content_block_delta') {
              const text = parsed.delta?.text ?? ''
              fullText += text
              onChunk(text)
            }
          } catch { /* skip malformed lines */ }
        }
      }

      return fullText
    }
  }

  // ---- main send flow ----
  async function sendMessage(
    content: string,
    attachments?: ChatAttachment[],
    options?: {
      conversationId?: string
      onThinkingStart?: () => void
      onThinkingUpdate?: (steps: ThinkingStep[]) => void
      onResponseStart?: () => void
      onResponseChunk?: (text: string) => void
      signal?: AbortSignal
    },
  ): Promise<ChatMessage> {
    const {
      conversationId,
      onThinkingStart,
      onThinkingUpdate,
      onResponseStart,
      onResponseChunk,
      signal,
    } = options ?? {}

    isStreaming.value = true

    let conv: Conversation
    if (conversationId) {
      conv = conversations.value.find((c) => c.id === conversationId)!
      if (!conv) throw new Error('会话不存在')
    } else if (activeConversation.value) {
      conv = activeConversation.value
    } else {
      conv = createConversation()
    }

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content,
      timestamp: Date.now(),
      attachments: attachments && attachments.length ? attachments : undefined,
    }
    conv.messages.push(userMsg)
    if (!conv.title || conv.title === '新会话') {
      conv.title = summarizeConversationTitle(content)
    }
    conv.updatedAt = Date.now()

    const steps = buildThinkingChain(content)
    currentThinking.value = steps
    onThinkingStart?.()
    onThinkingUpdate?.(steps)

    let responseText = ''

    try {
      if (config.value.provider === 'simulated' || !config.value.apiKey) {
        responseText = await runSimulatedThinking(steps, content)
      } else {
        for (let i = 0; i < steps.length; i++) {
          if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
          steps[i].status = 'running'
          onThinkingUpdate?.(steps)
          await sleep(300 + Math.random() * 200)
          steps[i].status = 'completed'
          steps[i].detail = `已完成：${steps[i].label}`
          steps[i].elapsed = Date.now()
          onThinkingUpdate?.(steps)
        }

        onResponseStart?.()

        const contextMessages = buildContextMessages(conv)

        if (onResponseChunk) {
          responseText = await callRealAPI(
            [...contextMessages, { role: 'user', content }],
            (chunk) => { onResponseChunk(chunk) },
            signal,
          )
        } else {
          responseText = await callRealAPI(
            [...contextMessages, { role: 'user', content }],
            undefined,
            signal,
          )
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        steps.forEach((s) => {
          if (s.status === 'running') s.status = 'error'
        })
        responseText = '⏹️ 已停止生成。'
      } else {
        const errorMsg = err instanceof Error ? err.message : '未知错误'
        steps.forEach((s) => {
          if (s.status === 'running') { s.status = 'error'; s.errorMsg = errorMsg }
        })
        responseText = `❌ 处理请求时出错：${errorMsg}\n\n> 请检查 API Key 配置，或切换到模拟模式重试。`
      }
    }

    const assistantMsg: ChatMessage = {
      id: uid(),
      role: 'assistant',
      content: responseText,
      timestamp: Date.now(),
      thinking: JSON.parse(JSON.stringify(steps)),
    }
    conv.messages.push(assistantMsg)
    conv.updatedAt = Date.now()

    const totalTokens = conv.messages.reduce((s, m) => s + estimateTokens(m.content), 0)
    if (totalTokens > 8000) {
      trimContext(conv, 6000)
    }

    isStreaming.value = false
    currentThinking.value = []
    return assistantMsg
  }

  function buildContextMessages(conv: Conversation): { role: string; content: string }[] {
    return conv.messages
      .filter((m) => m.role !== 'system' || m.content.includes('上下文'))
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }))
  }

  function stopStreaming() {
    isStreaming.value = false
  }

  function updateConfig(partial: Partial<AIChatConfig>) {
    config.value = { ...config.value, ...partial }
  }

  function isApiConfigured() {
    return !!config.value.apiKey && config.value.provider !== 'simulated'
  }

  return {
    config,
    conversations,
    activeConversationId,
    activeConversation,
    activeMessages,
    isStreaming,
    currentThinking,
    contextStats,

    createConversation,
    switchConversation,
    deleteConversation,
    updateConversationTitle,
    toggleConversationFavorite,
    toggleConversationPinned,
    sendMessage,
    stopStreaming,
    trimContext,
    updateConfig,
    isApiConfigured,

    estimateTokens,
  }
}

export function useAIChat() {
  if (!_instance) _instance = createAIChat()
  return _instance
}

