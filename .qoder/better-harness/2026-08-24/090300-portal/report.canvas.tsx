import { useState } from "react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Finding {
  id: string
  severity: "critical" | "high" | "medium" | "low" | "positive"
  title: string
  category?: string
  description?: string
}

interface CategoryScore {
  category: string
  score: number
  max: number
}

// ─── Data ────────────────────────────────────────────────────────────────────

const overallScore = 68
const grade = "B-"
const verdict =
  "项目拥有丰富的产品上下文和设计文档，前端工程化成熟，但 AI Agent 指令体系碎片化、后端缺乏 Agent 引导、安全与配置存在明显短板。"

const categoryScores: CategoryScore[] = [
  { category: "Agent 指令与规范", score: 45, max: 100 },
  { category: "上下文与文档体系", score: 85, max: 100 },
  { category: "工程化与 CI/CD", score: 70, max: 100 },
  { category: "安全与配置", score: 40, max: 100 },
  { category: "工具集成与技能", score: 65, max: 100 },
  { category: "项目结构与可维护性", score: 75, max: 100 },
]

const criticalFindings: Finding[] = [
  {
    id: "D1",
    severity: "critical",
    title: ".env.example 包含疑似真实 API Key",
    category: "安全与配置",
    description: "backend/.env.example 中 AI_API_KEY 看起来是真实密钥而非占位符，存在密钥泄露风险。",
  },
  {
    id: "A1",
    severity: "high",
    title: "缺少根级 AGENTS.md 统一跨工具约定",
    category: "Agent 指令与规范",
    description: "项目无 AGENTS.md 或 .cursorrules，AI Agent 跨工具工作时缺少统一的编码约定和架构约束。",
  },
  {
    id: "A2",
    severity: "high",
    title: "后端无 Agent 指令文件",
    category: "Agent 指令与规范",
    description: "backend/ 目录完全没有 Agent 引导文件，AI 处理后端代码时只能依赖代码推断。",
  },
  {
    id: "C3",
    severity: "high",
    title: "后端缺少测试配置",
    category: "工程化与 CI/CD",
    description: "backend/tests/ 目录存在但无可见的测试文件或测试依赖，后端代码修改无法通过自动化测试验证。",
  },
]

const strengths: Finding[] = [
  {
    id: "B1",
    severity: "positive",
    title: "CONTEXT.md 产品术语词汇表极为详尽",
    description: "272 行完整产品术语定义，每个概念都有明确的业务含义和 Avoid 清单。",
  },
  {
    id: "B2",
    severity: "positive",
    title: "前端 DESIGN.md + PRODUCT.md 形成完整设计意图",
    description: "视觉系统和产品定位文档齐全，为 AI 提供设计决策的完整上下文。",
  },
  {
    id: "C1",
    severity: "positive",
    title: "前端测试体系完善",
    description: "Vitest + jsdom 环境，138 个测试全部通过，包含完整测试流程。",
  },
  {
    id: "E3",
    severity: "positive",
    title: "Session 预算管理",
    description: "claude-headroom.json 实现 session 和 weekly 两级预算监控，包含三级告警。",
  },
]

const improvements: Finding[] = [
  { id: "A3", severity: "medium", title: ".claude/settings.json 权限列表为硬编码调试残留", category: "Agent 指令" },
  { id: "B5", severity: "medium", title: "缺少架构决策记录 (ADR)", category: "文档体系" },
  { id: "C4", severity: "medium", title: "缺少 ESLint 统一代码规范", category: "工程化" },
  { id: "D3", severity: "medium", title: "CORS 配置过于宽松", category: "安全" },
  { id: "E4", severity: "medium", title: "MCP 集成范围有限", category: "工具集成" },
  { id: "F3", severity: "medium", title: "单 store 架构", category: "项目结构" },
]

const actionItems = [
  { priority: "P0", finding: "D1 - API Key 泄露", action: "立即轮换密钥，替换为占位符" },
  { priority: "P1", finding: "A1 - 缺少 AGENTS.md", action: "创建根级 AGENTS.md，统一跨工具约定" },
  { priority: "P1", finding: "A2 - 后端无指令", action: "为 backend/ 添加 Agent 指令文件" },
  { priority: "P2", finding: "C3 - 后端无测试", action: "建立后端测试体系 (pytest + CI)" },
  { priority: "P2", finding: "C4 - 缺少 ESLint", action: "添加 ESLint 配置统一代码规范" },
]

const projectInfo = [
  { label: "项目名称", value: "天马智擎 (Tianma AI Portal)" },
  { label: "前端技术栈", value: "Vue 3 + Vite + TailwindCSS + shadcn-vue" },
  { label: "后端技术栈", value: "FastAPI + SQLAlchemy + SQLite" },
  { label: "包管理器", value: "pnpm (前端) / pip (后端)" },
  { label: "AI 工具配置", value: ".claude/ + .mcp.json + skills/" },
  { label: "部署方式", value: "GitHub Actions → GitHub Pages" },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const severityConfig = {
  critical: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-500 text-white", text: "text-red-700", label: "严重" },
  high: { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-500 text-white", text: "text-orange-700", label: "高" },
  medium: { bg: "bg-yellow-50", border: "border-yellow-200", badge: "bg-yellow-500 text-white", text: "text-yellow-700", label: "中" },
  low: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-500 text-white", text: "text-blue-700", label: "低" },
  positive: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-500 text-white", text: "text-emerald-700", label: "亮点" },
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600"
  if (score >= 60) return "text-yellow-600"
  return "text-red-600"
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return "bg-emerald-500"
  if (score >= 60) return "bg-yellow-500"
  return "bg-red-500"
}

// ─── Components ──────────────────────────────────────────────────────────────

function ScoreRing({ score, grade: g }: { score: number; grade: string }) {
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference
  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r="54" fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke={score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444"}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</span>
        <span className="text-xs text-gray-500">/ 100</span>
        <span className={`text-lg font-semibold mt-1 ${getScoreColor(score)}`}>{g}</span>
      </div>
    </div>
  )
}

function CategoryBar({ data }: { data: CategoryScore[] }) {
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.category}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">{item.category}</span>
            <span className={`text-sm font-bold ${getScoreColor(item.score)}`}>{item.score}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${getScoreBarColor(item.score)} transition-all duration-500`}
              style={{ width: `${item.score}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function FindingCard({ finding }: { finding: Finding }) {
  const config = severityConfig[finding.severity]
  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-4`}>
      <div className="flex items-start gap-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.badge}`}>
          {config.label}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">[{finding.id}]</span>
            <h4 className={`text-sm font-semibold ${config.text}`}>{finding.title}</h4>
          </div>
          {finding.category && (
            <span className="text-xs text-gray-500 mt-0.5 block">{finding.category}</span>
          )}
          {finding.description && (
            <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{finding.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ActionTable() {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2.5 text-left font-semibold text-gray-700 w-16">优先级</th>
            <th className="px-4 py-2.5 text-left font-semibold text-gray-700">发现项</th>
            <th className="px-4 py-2.5 text-left font-semibold text-gray-700">建议动作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {actionItems.map((item) => (
            <tr key={item.priority + item.finding} className="hover:bg-gray-50">
              <td className="px-4 py-2.5">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                    item.priority === "P0"
                      ? "bg-red-100 text-red-700"
                      : item.priority === "P1"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {item.priority}
                </span>
              </td>
              <td className="px-4 py-2.5 text-gray-700 font-medium">{item.finding}</td>
              <td className="px-4 py-2.5 text-gray-600">{item.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InfoGrid() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
      {projectInfo.map((item) => (
        <div key={item.label} className="flex items-baseline gap-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">{item.label}</span>
          <span className="text-sm text-gray-800 font-medium">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Canvas ─────────────────────────────────────────────────────────────

export default function HarnessReportCanvas() {
  const [activeTab, setActiveTab] = useState<"overview" | "findings" | "actions">("overview")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Harness 实践分析报告</h1>
              <p className="text-sm text-gray-500 mt-1">天马智擎 · d:\工作\portal · 2026-08-24 09:03</p>
            </div>
            <ScoreRing score={overallScore} grade={grade} />
          </div>
          <div className="mt-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 leading-relaxed">{verdict}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-200 w-fit">
          {(["overview", "findings", "actions"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab === "overview" ? "总览" : tab === "findings" ? "发现详情" : "行动项"}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Scores */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">分类评分</h2>
                <CategoryBar data={categoryScores} />
              </div>

              {/* Project Info */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">项目概况</h2>
                <InfoGrid />
              </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-600 text-sm font-bold">!</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">关键问题</span>
                </div>
                <p className="text-2xl font-bold text-red-600">4</p>
                <p className="text-xs text-gray-500 mt-1">1 严重 · 3 高</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-emerald-600 text-sm">✓</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">亮点</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">8</p>
                <p className="text-xs text-gray-500 mt-1">文档体系 · 测试 · 预算管理</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                    <span className="text-yellow-600 text-sm font-bold">~</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">待改进</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">6</p>
                <p className="text-xs text-gray-500 mt-1">中等优先级</p>
              </div>
            </div>
          </div>
        )}

        {/* Findings Tab */}
        {activeTab === "findings" && (
          <div className="space-y-6">
            {/* Critical Findings */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">关键发现</h2>
              <div className="space-y-3">
                {criticalFindings.map((f) => (
                  <FindingCard key={f.id} finding={f} />
                ))}
              </div>
            </div>

            {/* Strengths */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">亮点</h2>
              <div className="space-y-3">
                {strengths.map((f) => (
                  <FindingCard key={f.id} finding={f} />
                ))}
              </div>
            </div>

            {/* Improvements */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">待改进项</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {improvements.map((f) => (
                  <FindingCard key={f.id} finding={f} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === "actions" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">优先行动项</h2>
              <ActionTable />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">建议实施路径</h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold">1</div>
                    <div className="w-0.5 h-full bg-gray-200 mt-2" />
                  </div>
                  <div className="pb-4">
                    <h3 className="text-sm font-semibold text-gray-900">安全加固 (立即)</h3>
                    <p className="text-sm text-gray-600 mt-1">轮换 API Key，清理 .env.example 中的敏感信息，收紧 CORS 配置。</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">2</div>
                    <div className="w-0.5 h-full bg-gray-200 mt-2" />
                  </div>
                  <div className="pb-4">
                    <h3 className="text-sm font-semibold text-gray-900">Agent 指令体系 (1-2 天)</h3>
                    <p className="text-sm text-gray-600 mt-1">创建根级 AGENTS.md 和 backend/AGENTS.md，统一跨工具约定。</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center text-sm font-bold">3</div>
                    <div className="w-0.5 h-full bg-gray-200 mt-2" />
                  </div>
                  <div className="pb-4">
                    <h3 className="text-sm font-semibold text-gray-900">工程化补全 (3-5 天)</h3>
                    <p className="text-sm text-gray-600 mt-1">添加 ESLint 配置、后端测试体系、架构决策记录。</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">4</div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">持续优化</h3>
                    <p className="text-sm text-gray-600 mt-1">扩展 MCP 集成、创建代码生成技能、拆分 store 架构。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pb-4">
          Generated by /better-harness · 2026-08-24 09:03
        </div>
      </div>
    </div>
  )
}
