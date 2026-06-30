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
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  thinking?: ThinkingStep[]  // only on assistant messages
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
    // Keep only last 50 conversations, max 10MB
    const trimmed = list.slice(-50)
    const json = JSON.stringify(trimmed)
    if (json.length < 10_000_000) {
      localStorage.setItem(STORAGE_PREFIX + 'conversations', json)
    }
  } catch { /* noop */ }
}

// ---- context window estimation ----
function estimateTokens(text: string): number {
  // Rough estimate: ~3 chars per token for Chinese, ~4 chars for English
  const chineseChars = (text.match(/[一-鿿㐀-䶿]/g) || []).length
  const otherChars = text.length - chineseChars
  return Math.ceil(chineseChars / 1.5 + otherChars / 3.5)
}

// ---- ID generation ----
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ---- composable ----
export function useAIChat() {
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

  // estimated context window usage
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
    // Count from newest to oldest, keep what fits
    const kept: ChatMessage[] = []
    for (let i = msgs.length - 1; i >= 0; i--) {
      const tokens = estimateTokens(msgs[i].content)
      if (totalTokens + tokens <= maxTokens) {
        kept.unshift(msgs[i])
        totalTokens += tokens
      } else {
        // If we can't even fit one message, summarize older ones
        if (kept.length === 0) {
          kept.unshift({
            id: msgs[i].id,
            role: 'system',
            content: `[上下文过长已截断] 之前的讨论涉及: ${conv.summary || conv.title}`,
            timestamp: msgs[i].timestamp,
          })
        } else {
          // Insert summarization marker
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
    if (intent.includes('[快速模式')) {
      return [
        {
          id: 'intent',
          label: '意图识别',
          detail: '识别为方案中心轻量问答，跳过知识库和工具调用...',
          status: 'pending',
          icon: '🔍',
        },
        {
          id: 'answer',
          label: '直接生成',
          detail: '基于当前输入生成可沟通的方案草稿...',
          status: 'pending',
          icon: '⚡',
        },
      ]
    }
    if (intent.includes('[智能模式')) {
      return [
        {
          id: 'intent',
          label: '意图识别',
          detail: '判断是否需要知识库、工具和子智能体...',
          status: 'pending',
          icon: '🔍',
        },
        {
          id: 'router',
          label: '能力路由',
          detail: '根据置信度决定是否挂知识库和工具...',
          status: 'pending',
          icon: '🧭',
        },
        {
          id: 'knowledge',
          label: '按需检索',
          detail: '需要时匹配成功案例池、预算池和字段模板...',
          status: 'pending',
          icon: '📚',
        },
        {
          id: 'output',
          label: '生成输出',
          detail: '整理方案文本、引用来源和后续动作...',
          status: 'pending',
          icon: '📄',
        },
      ]
    }
    const steps: ThinkingStep[] = [
      {
        id: 'intent',
        label: '意图识别',
        detail: `分析用户输入，判断是否属于方案中心任务范围...`,
        status: 'pending',
        icon: '🔍',
      },
      {
        id: 'supervisor',
        label: '方案中心主管',
        detail: '提取客户类型、预算、场景、品类、品牌偏好等关键字段...',
        status: 'pending',
        icon: '🧠',
      },
      {
        id: 'knowledge',
        label: '检索知识库',
        detail: '匹配成功案例池、通用预算池、个性化方案池...',
        status: 'pending',
        icon: '📚',
      },
      {
        id: 'expert',
        label: '组货方案专家',
        detail: '按预算段、场景偏好和品类生成多档组货策略...',
        status: 'pending',
        icon: '🔧',
      },
      {
        id: 'output',
        label: '生成输出',
        detail: '整理Markdown方案、Excel清单、PPT草稿、知识缺口检测...',
        status: 'pending',
        icon: '📄',
      },
    ]
    return steps
  }

  function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

  async function runSimulatedThinking(steps: ThinkingStep[], intent: string): Promise<string> {
    const isFast = intent.includes('[快速模式')
    const isSmart = intent.includes('[智能模式')
    const delays = isFast ? [300, 500] : isSmart ? [400, 500, 700, 600] : [600, 800, 1000, 1200, 800]
    const details = isFast
      ? [
          `意图识别完成：用户询问"${intent.slice(0, 30)}..."，使用快速模式，不调用知识库和工具。`,
          '已直接生成方案草稿；如需引用案例、生成文件或沉淀知识缺口，可切换到任务模式。',
        ]
      : isSmart
        ? [
            `意图识别完成：用户询问"${intent.slice(0, 30)}..."，方案中心相关置信度 0.86。`,
            '系统判断需要引用方案字段模板和成功案例，但暂不调用外部钉钉工具。',
            '已检索到相关资源：运动鞋团购成功案例 ×2、字段模板 ×1。',
            '已生成方案草稿、引用摘要和建议追问字段。',
          ]
        : [
            `意图识别完成：用户询问"${intent.slice(0, 30)}..."，匹配到[方案中心]业务域，置信度 0.92`,
            `已提取关键字段：客户类型=待确认、预算=待确认、活动场景=待确认、品类偏好=待确认。发现缺失字段较多，需要追问。`,
            `已检索到相关资源：运动鞋团购成功案例 ×3、通用预算池模板 ×1、方案中心字段模板 ×1。匹配度 78%。`,
            `组货策略：基于预算区间生成"经济型/均衡型/品质型"三档方案，含 SPU 组合和预估价格带。`,
            `✅ Markdown方案已生成\n✅ Excel组货清单已生成\n✅ PPT客户方案草稿已生成\n⚠️ 知识缺口：部分品牌最新库存及价格待确认`,
          ]

    for (let i = 0; i < steps.length; i++) {
      steps[i].status = 'running'
      const startedAt = Date.now()
      await sleep(delays[i] + Math.random() * 400)
      steps[i].status = 'completed'
      steps[i].detail = details[i]
      steps[i].elapsed = Date.now() - startedAt
    }
    return buildSimulatedResponse(intent)
  }

  function buildSimulatedResponse(intent: string): string {
    const now = new Date().toLocaleDateString('zh-CN')
    return `## 📋 方案中心 · 组货方案初稿

> 生成日期：${now}
> 引用来源：运动鞋团购成功案例 · 通用预算池 · 方案中心字段模板

### 一、需求理解
根据您的描述「${intent.slice(0, 60)}...」，初步判断为**方案中心组货类需求**。

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

    // Detect provider type from config or URL
    const isOpenAICompat = provider === 'openai' || provider === 'openai-compatible' ||
      apiBase.includes('deepseek') || apiBase.includes('openai') ||
      apiBase.includes('/v1')

    const systemMessages = messages.filter((m) => m.role === 'system')
    const chatMessages = messages.filter((m) => m.role !== 'system')

    if (isOpenAICompat) {
      // ---- OpenAI-compatible format (DeepSeek, OpenAI, etc.) ----
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

      // Streaming (OpenAI SSE format)
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
      // ---- Anthropic format ----
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

      // Streaming (Anthropic SSE format)
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

    // Determine or create conversation
    let conv: Conversation
    if (conversationId) {
      conv = conversations.value.find((c) => c.id === conversationId)!
      if (!conv) throw new Error('会话不存在')
    } else if (activeConversation.value) {
      conv = activeConversation.value
    } else {
      conv = createConversation()
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    conv.messages.push(userMsg)
    if (!conv.title || conv.title === '新会话') {
      conv.title = content.slice(0, 40) + (content.length > 40 ? '...' : '')
    }
    conv.updatedAt = Date.now()

    // Build thinking steps
    const steps = buildThinkingChain(content)
    currentThinking.value = steps
    onThinkingStart?.()
    onThinkingUpdate?.(steps)

    let responseText = ''

    try {
      if (config.value.provider === 'simulated' || !config.value.apiKey) {
        // Simulated mode with thinking chain
        responseText = await runSimulatedThinking(steps, content)
      } else {
        // Real API: run thinking steps quickly first
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

        // Build context messages
        const contextMessages = buildContextMessages(conv)

        if (onResponseChunk) {
          responseText = await callRealAPI(
            [...contextMessages, { role: 'user', content }],
            (chunk) => {
              onResponseChunk(chunk)
            },
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

    // Add assistant message
    const assistantMsg: ChatMessage = {
      id: uid(),
      role: 'assistant',
      content: responseText,
      timestamp: Date.now(),
      thinking: JSON.parse(JSON.stringify(steps)),
    }
    conv.messages.push(assistantMsg)
    conv.updatedAt = Date.now()

    // Trim context if needed
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
      .slice(-20) // Last 20 messages
      .map((m) => ({ role: m.role, content: m.content }))
  }

  function stopStreaming() {
    isStreaming.value = false
  }

  // ---- config helpers ----
  function updateConfig(partial: Partial<AIChatConfig>) {
    config.value = { ...config.value, ...partial }
  }

  function isApiConfigured() {
    return !!config.value.apiKey && config.value.provider !== 'simulated'
  }

  return {
    // state
    config,
    conversations,
    activeConversationId,
    activeConversation,
    activeMessages,
    isStreaming,
    currentThinking,
    contextStats,

    // actions
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

    // helpers
    estimateTokens,
  }
}
