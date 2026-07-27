import { createHash } from 'node:crypto'
import type { Connect, Plugin } from 'vite'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import type { EmailSummaryItem } from '../src/types/workbench'

interface EmailServerConfig {
  host?: string
  port?: string
  secure?: string
  username?: string
  password?: string
  mailbox?: string
  aiApiKey?: string
  aiApiBase?: string
  aiModel?: string
}

interface EmailPayload {
  connected: boolean
  refreshedAt: string
  items: EmailSummaryItem[]
  accessIssues: string[]
}

const summaryCache = new Map<string, { summary: string; mode: 'ai' | 'extractive' }>()
const knownMailIds = new Set<string>()

function cleanText(value = '') {
  return value.replace(/\s+/g, ' ').trim()
}

function fallbackSummary(subject: string, body: string) {
  const content = cleanText(body).replace(/^(回复|转发|re|fw|fwd)[:：]\s*/i, '')
  return (content || subject || '邮件正文为空').slice(0, 140)
}

function senderDisplayName(name: string | undefined, address: string | undefined) {
  const cleaned = cleanText(name || '')
  if (cleaned && !cleaned.includes('�')) return cleaned
  if (address?.endsWith('@exmail.weixin.qq.com')) return '腾讯企业邮'
  return address?.split('@')[0] || '未知发件人'
}

async function summarizeMail(config: EmailServerConfig, subject: string, body: string) {
  const cacheKey = createHash('sha256').update(`${subject}\n${body}`).digest('hex')
  const cached = summaryCache.get(cacheKey)
  if (cached) return cached
  const fallback = { summary: fallbackSummary(subject, body), mode: 'extractive' as const }
  if (!config.aiApiKey || !config.aiApiBase || !config.aiModel) return fallback
  try {
    const response = await fetch(`${config.aiApiBase.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.aiApiKey}` },
      body: JSON.stringify({
        model: config.aiModel,
        temperature: 0.1,
        max_tokens: 180,
        messages: [
          { role: 'system', content: '你是管理层邮件助手。用一句中文概括邮件的事实、待决事项或行动要求，不虚构，不使用“本邮件”作为开头，控制在80字内。' },
          { role: 'user', content: `主题：${subject}\n正文：${cleanText(body).slice(0, 6000)}` },
        ],
      }),
    })
    if (!response.ok) return fallback
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    const summary = cleanText(payload.choices?.[0]?.message?.content)
    const result = summary ? { summary: summary.slice(0, 180), mode: 'ai' as const } : fallback
    summaryCache.set(cacheKey, result)
    return result
  } catch {
    return fallback
  }
}

async function loadEmails(config: EmailServerConfig): Promise<EmailPayload> {
  if (!config.host || !config.username || !config.password) {
    return { connected: false, refreshedAt: new Date().toISOString(), items: [], accessIssues: ['企业邮箱连接参数不完整'] }
  }
  const client = new ImapFlow({
    host: config.host,
    port: Number(config.port || 993),
    secure: config.secure !== 'false',
    auth: { user: config.username, pass: config.password },
    logger: false,
  })
  try {
    await client.connect()
    const lock = await client.getMailboxLock(config.mailbox || 'INBOX', { readOnly: true })
    try {
      const since = new Date()
      since.setDate(since.getDate() - 7)
      const uids = await client.search({ since }, { uid: true })
      const selected = uids.slice(-50).reverse()
      const items: EmailSummaryItem[] = []
      for (const uid of selected) {
        const message = await client.fetchOne(uid, { uid: true, envelope: true, source: true, flags: true }, { uid: true })
        if (!message || !message.source) continue
        const parsed = await simpleParser(message.source)
        const subject = cleanText(parsed.subject || message.envelope?.subject || '无主题邮件')
        const body = cleanText(parsed.text || parsed.html?.toString() || '')
        const generated = await summarizeMail(config, subject, body)
        const sender = parsed.from?.value[0]
        const mailId = `${config.mailbox || 'INBOX'}:${uid}`
        knownMailIds.add(mailId)
        items.push({
          id: `email-${uid}`,
          mailId,
          subject,
          senderName: senderDisplayName(sender?.name, sender?.address),
          senderEmail: sender?.address || '',
          receivedAt: new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(parsed.date || message.envelope?.date || new Date()),
          summary: `${generated.mode === 'ai' ? 'AI 摘要：' : '自动提取：'}${generated.summary}`,
          unread: !message.flags?.has('\\Seen'),
          important: message.flags?.has('\\Flagged') || false,
          attachmentCount: parsed.attachments.length,
        })
      }
      return { connected: true, refreshedAt: new Date().toISOString(), items, accessIssues: [] }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => undefined)
  }
}

function handler(config: EmailServerConfig): Connect.NextHandleFunction {
  return async (request, response, next) => {
    const url = new URL(request.url || '/', 'http://localhost')
    if (url.pathname === '/api/email/sso/open') {
      const mailId = url.searchParams.get('mailId') || ''
      if (!knownMailIds.has(mailId)) {
        response.statusCode = 404
        response.end('邮件定位信息已失效，请刷新邮件摘要')
        return
      }
      response.statusCode = 302
      response.setHeader('Location', 'https://exmail.qq.com/')
      response.end()
      return
    }
    if (url.pathname !== '/api/email/summaries') return next()
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.setHeader('Cache-Control', 'no-store')
    if (request.method !== 'GET') {
      response.statusCode = 405
      response.end(JSON.stringify({ message: '仅支持 GET 请求' }))
      return
    }
    try {
      response.statusCode = 200
      response.end(JSON.stringify(await loadEmails(config)))
    } catch (error) {
      response.statusCode = 502
      response.end(JSON.stringify({ message: error instanceof Error ? error.message : '企业邮箱读取失败' }))
    }
  }
}

export function emailSummaryPlugin(config: EmailServerConfig): Plugin {
  return {
    name: 'email-summary-api',
    configureServer(server) { server.middlewares.use(handler(config)) },
    configurePreviewServer(server) { server.middlewares.use(handler(config)) },
  }
}
