<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ThumbsDown, ThumbsUp, Download, Search, ChevronDown, Eye, Lightbulb, MessageSquare,
  AlertTriangle, X, Filter, TrendingUp, Clock, User,
} from 'lucide-vue-next'

// === Hard feedback (赞/踩) ===
interface HardFeedback { id: string; timestamp: number; userName: string; department: string; solutionName: string; type: 'like' | 'dislike'; reasons: string[]; comment: string; conversationId: string; conversationPreview: string }
const hardFeedbacks = ref<HardFeedback[]>([
  { id: '1', timestamp: Date.now() - 3600000, userName: '张明', department: '方案中心', solutionName: '互联网团建方案', type: 'dislike', reasons: ['匹配不准', '内容有误'], comment: '推荐的品牌价格带不匹配，客户预算30-50万但推荐了800元以上的高端款', conversationId: 'conv_001', conversationPreview: '用户：帮我给互联网公司做一个团建方案...AI：根据您的需求，推荐以下三档方案...' },
  { id: '2', timestamp: Date.now() - 7200000, userName: '李娟', department: '销售一部', solutionName: '客户节日礼赠方案', type: 'like', reasons: [], comment: '', conversationId: 'conv_002', conversationPreview: '用户：帮我做一份中秋客户礼赠方案...AI：根据节日礼赠场景，推荐...' },
  { id: '3', timestamp: Date.now() - 10800000, userName: '王磊', department: '方案中心', solutionName: '员工运动会方案', type: 'dislike', reasons: ['答非所问'], comment: '需要的是运动会方案，但AI给的是团建方案', conversationId: 'conv_003', conversationPreview: '用户：帮我们做一个员工运动会方案...AI：根据团建场景，推荐...' },
  { id: '4', timestamp: Date.now() - 14400000, userName: '赵芳', department: '大客户部', solutionName: 'B2B组货方案', type: 'like', reasons: [], comment: '', conversationId: 'conv_004', conversationPreview: '用户：B2B线下客户需要组货方案...AI：根据B2B场景，匹配到3个成功案例...' },
  { id: '5', timestamp: Date.now() - 18000000, userName: '陈伟', department: '方案中心', solutionName: '企业福利方案', type: 'dislike', reasons: ['不完整', '格式问题'], comment: '方案缺少PPT导出格式，而且Excel清单里的SPU数量没有汇总', conversationId: 'conv_005', conversationPreview: '用户：企业福利方案，预算20万...AI：为您整理了以下方案...' },
  { id: '6', timestamp: Date.now() - 86400000, userName: '孙丽', department: '市场部', solutionName: '营销文案生成', type: 'dislike', reasons: ['内容有误'], comment: '生成的文案品牌调性不符合我们公司的风格', conversationId: 'conv_006', conversationPreview: '用户：帮我们写一段运动鞋促销文案...AI：以下是为您生成的文案...' },
  { id: '7', timestamp: Date.now() - 90000000, userName: '周强', department: '方案中心', solutionName: '门店需求采集方案', type: 'like', reasons: [], comment: '', conversationId: 'conv_007', conversationPreview: '用户：门店客户团购需求采集模板...AI：以下是为您整理的字段表...' },
])

// === Soft feedback (AI识别) ===
interface SoftFeedback { id: string; type: string; severity: string; summary: string; relatedModule: string; mentionCount: number; lastSeen: number; status: string; originalMessages: { userName: string; content: string }[] }
const softFeedbacks = ref<SoftFeedback[]>([
  { id: 's1', type: '功能需求', severity: 'high', summary: '希望能直接导出PPT，每次都要选格式太麻烦', relatedModule: '产物导出', mentionCount: 8, lastSeen: Date.now() - 86400000, status: 'pending', originalMessages: [{ userName: '张明', content: '能不能直接导出PPT，不要每次都让我选格式，太麻烦了' }] },
  { id: 's2', type: '优化建议', severity: 'medium', summary: '方案匹配时应该优先考虑客户所在行业，而不是只按预算匹配', relatedModule: '方案匹配', mentionCount: 5, lastSeen: Date.now() - 172800000, status: 'evaluated', originalMessages: [{ userName: '王磊', content: '这个方案不太对，能不能按照行业分类来匹配，我们是互联网公司不是传统零售' }] },
  { id: 's3', type: '吐槽抱怨', severity: 'low', summary: 'AI回复速度有时候比较慢，等待时间超过10秒', relatedModule: '对话体验', mentionCount: 3, lastSeen: Date.now() - 345600000, status: 'adopted', originalMessages: [{ userName: '李娟', content: '怎么这么慢，等了快10秒了还没出来' }] },
  { id: 's4', type: '使用困惑', severity: 'medium', summary: '不知道如何上传文件到知识库，入口不明显', relatedModule: '文件处理', mentionCount: 4, lastSeen: Date.now() - 259200000, status: 'pending', originalMessages: [{ userName: '陈伟', content: '我想把这个Excel上传到知识库里，但没找到上传的地方' }] },
  { id: 's5', type: '功能需求', severity: 'high', summary: '希望能批量上传文件，目前只能一个一个传', relatedModule: '文件处理', mentionCount: 6, lastSeen: Date.now() - 129600000, status: 'adopted', originalMessages: [{ userName: '赵芳', content: '能不能一次性上传多个文件，我有5个Excel要导入' }] },
])

// === State ===
const activeTab = ref<'hard' | 'soft'>('hard')
const filterType = ref<'all' | 'like' | 'dislike'>('all')
const searchQuery = ref('')
const softTypeFilter = ref('all')
const softStatusFilter = ref('all')
const detailItem = ref<HardFeedback | null>(null)

// === Computed ===
const stats = computed(() => {
  const t = hardFeedbacks.value.length; const l = hardFeedbacks.value.filter(f => f.type === 'like').length
  const d = hardFeedbacks.value.filter(f => f.type === 'dislike').length
  return { total: t, likes: l, dislikes: d, likeRate: t > 0 ? Math.round((l / t) * 100) : 0 }
})
const filteredHard = computed(() => {
  let r = hardFeedbacks.value
  if (filterType.value !== 'all') r = r.filter(f => f.type === filterType.value)
  if (searchQuery.value.trim()) { const q = searchQuery.value.trim().toLowerCase(); r = r.filter(f => f.userName.toLowerCase().includes(q) || f.solutionName.toLowerCase().includes(q) || f.comment.toLowerCase().includes(q)) }
  return r
})
const filteredSoft = computed(() => {
  let r = softFeedbacks.value
  if (softTypeFilter.value !== 'all') r = r.filter(f => f.type === softTypeFilter.value)
  if (softStatusFilter.value !== 'all') r = r.filter(f => f.status === softStatusFilter.value)
  return r
})
const softStats = computed(() => ({ total: softFeedbacks.value.length, pending: softFeedbacks.value.filter(f => f.status === 'pending').length, high: softFeedbacks.value.filter(f => f.severity === 'high').length }))

// === Helpers ===
function fmt(ts: number) { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
function severityClass(s: string) { return s === 'high' ? 'bg-red-50 text-red-700' : s === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-zinc-50 text-zinc-600' }
function statusLabel(s: string) { const m: Record<string,string> = { pending: '待评估', evaluated: '已评估', adopted: '已采纳', replied: '已回复', ignored: '已忽略' }; return m[s] ?? s }
function statusClass(s: string) { return s === 'pending' ? 'bg-amber-50 text-amber-700' : s === 'adopted' ? 'bg-emerald-50 text-emerald-700' : s === 'ignored' ? 'bg-zinc-50 text-zinc-400' : 'bg-blue-50 text-blue-700' }

function exportList() {
  const csv = filteredHard.value.map(f => `${fmt(f.timestamp)},${f.userName},${f.department},${f.solutionName},${f.type},${f.reasons.join('/')},${f.comment}`).join('\n')
  const blob = new Blob(['时间,提交人,部门,方案,类型,原因,备注\n' + csv], { type: 'text/csv' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `反馈列表_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(a.href)
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2"><Lightbulb class="h-6 w-6 text-amber-500" /><h1 class="text-2xl font-bold text-zinc-900">建议箱</h1></div>
        <p class="mt-1 text-sm text-zinc-500">用户主动反馈与系统自动识别的优化建议</p>
      </div>
      <button class="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50" @click="exportList"><Download class="h-3.5 w-3.5" />导出列表</button>
    </div>

    <!-- Stats -->
    <div class="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      <div class="rounded-xl border border-zinc-200 bg-white p-4"><div class="text-2xl font-bold text-zinc-900">{{ stats.total + softStats.total }}</div><div class="text-xs text-zinc-400">反馈总数（含软反馈）</div></div>
      <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div class="text-2xl font-bold text-emerald-700">{{ stats.likes }}</div><div class="text-xs text-emerald-600">👍 有用</div></div>
      <div class="rounded-xl border border-rose-200 bg-rose-50 p-4"><div class="text-2xl font-bold text-rose-700">{{ stats.dislikes }}</div><div class="text-xs text-rose-600">👎 不合适</div></div>
      <div class="rounded-xl border border-zinc-200 bg-white p-4"><div class="text-2xl font-bold text-zinc-900">{{ stats.likeRate }}%</div><div class="text-xs text-zinc-400">好评率</div></div>
    </div>

    <!-- Tab switcher -->
    <div class="mb-5 flex items-center gap-1 rounded-xl bg-zinc-100 p-1 w-fit">
      <button class="rounded-lg px-4 py-2 text-sm font-medium transition flex items-center gap-1.5" :class="activeTab === 'hard' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'" @click="activeTab = 'hard'"><ThumbsUp class="h-3.5 w-3.5" />赞/踩反馈</button>
      <button class="rounded-lg px-4 py-2 text-sm font-medium transition flex items-center gap-1.5" :class="activeTab === 'soft' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'" @click="activeTab = 'soft'"><Lightbulb class="h-3.5 w-3.5" />软反馈 <span class="ml-1 rounded-full bg-amber-100 px-1.5 text-[10px] text-amber-700">{{ softStats.pending }}</span></button>
    </div>

    <!-- Hard Feedback Tab -->
    <template v-if="activeTab === 'hard'">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <div class="relative flex-1 max-w-xs"><Search class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" /><input v-model="searchQuery" type="text" placeholder="搜索提交人或方案..." class="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-4 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-blue-300 focus:outline-none" /></div>
        <button :class="filterType === 'all' ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-600 border border-zinc-200'" class="rounded-full px-3 py-1.5 text-xs font-medium" @click="filterType = 'all'">全部</button>
        <button :class="filterType === 'like' ? 'bg-emerald-600 text-white' : 'bg-white text-zinc-600 border border-zinc-200'" class="rounded-full px-3 py-1.5 text-xs font-medium" @click="filterType = 'like'">👍 有用</button>
        <button :class="filterType === 'dislike' ? 'bg-rose-600 text-white' : 'bg-white text-zinc-600 border border-zinc-200'" class="rounded-full px-3 py-1.5 text-xs font-medium" @click="filterType = 'dislike'">👎 不合适</button>
      </div>

      <div class="space-y-2">
        <div v-for="fb in filteredHard" :key="fb.id" class="rounded-xl border bg-white p-4 transition hover:border-zinc-300 cursor-pointer" :class="fb.type === 'dislike' ? 'border-rose-100' : 'border-zinc-100'" @click="detailItem = fb">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <ThumbsUp v-if="fb.type === 'like'" class="h-4 w-4 text-emerald-500 shrink-0" />
                <ThumbsDown v-else class="h-4 w-4 text-rose-500 shrink-0" />
                <span class="text-sm font-semibold text-zinc-900">{{ fb.userName }}</span>
                <span class="text-xs text-zinc-400">{{ fb.department }}</span>
                <span class="text-xs text-zinc-300">·</span>
                <span class="text-xs text-zinc-500">{{ fb.solutionName }}</span>
              </div>
              <div v-if="fb.reasons.length" class="flex flex-wrap gap-1 mb-1"><span v-for="r in fb.reasons" :key="r" class="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600">{{ r }}</span></div>
              <p v-if="fb.comment" class="text-xs text-zinc-500 line-clamp-2">{{ fb.comment }}</p>
              <p v-else class="text-xs text-zinc-300 italic">无文字备注</p>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <span class="text-xs text-zinc-400">{{ fmt(fb.timestamp) }}</span>
              <Eye class="h-3.5 w-3.5 text-zinc-300" />
            </div>
          </div>
        </div>
      </div>
      <div v-if="filteredHard.length === 0" class="py-20 text-center"><p class="text-sm text-zinc-400">暂无反馈记录</p></div>
    </template>

    <!-- Soft Feedback Tab -->
    <template v-if="activeTab === 'soft'">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-700"><AlertTriangle class="h-3 w-3" /> {{ softStats.high }} 条高优先级 · {{ softStats.pending }} 条待处理</div>
        <button :class="softTypeFilter === 'all' ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-600 border border-zinc-200'" class="rounded-full px-3 py-1.5 text-xs font-medium" @click="softTypeFilter = 'all'">全部类型</button>
        <button :class="softTypeFilter === '功能需求' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-600 border border-zinc-200'" class="rounded-full px-3 py-1.5 text-xs font-medium" @click="softTypeFilter = softTypeFilter === '功能需求' ? 'all' : '功能需求'">功能需求</button>
        <button :class="softTypeFilter === '优化建议' ? 'bg-violet-600 text-white' : 'bg-white text-zinc-600 border border-zinc-200'" class="rounded-full px-3 py-1.5 text-xs font-medium" @click="softTypeFilter = softTypeFilter === '优化建议' ? 'all' : '优化建议'">优化建议</button>
        <button :class="softTypeFilter === '吐槽抱怨' ? 'bg-rose-600 text-white' : 'bg-white text-zinc-600 border border-zinc-200'" class="rounded-full px-3 py-1.5 text-xs font-medium" @click="softTypeFilter = softTypeFilter === '吐槽抱怨' ? 'all' : '吐槽抱怨'">吐槽抱怨</button>
        <button :class="softTypeFilter === '使用困惑' ? 'bg-amber-600 text-white' : 'bg-white text-zinc-600 border border-zinc-200'" class="rounded-full px-3 py-1.5 text-xs font-medium" @click="softTypeFilter = softTypeFilter === '使用困惑' ? 'all' : '使用困惑'">使用困惑</button>
        <div class="ml-auto">
          <select v-model="softStatusFilter" class="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600">
            <option value="all">全部状态</option><option value="pending">待评估</option><option value="evaluated">已评估</option><option value="adopted">已采纳</option><option value="ignored">已忽略</option>
          </select>
        </div>
      </div>

      <div class="space-y-2">
        <div v-for="sf in filteredSoft" :key="sf.id" class="rounded-xl border border-zinc-100 bg-white p-4 transition hover:border-zinc-300">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1.5">
                <span class="rounded-full px-2 py-0.5 text-[10px] font-medium" :class="sf.type === '功能需求' ? 'bg-blue-50 text-blue-700' : sf.type === '优化建议' ? 'bg-violet-50 text-violet-700' : sf.type === '吐槽抱怨' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'">{{ sf.type }}</span>
                <span class="rounded-full px-2 py-0.5 text-[10px] font-medium" :class="severityClass(sf.severity)">{{ sf.severity === 'high' ? '高' : sf.severity === 'medium' ? '中' : '低' }}</span>
                <span class="text-xs text-zinc-400">{{ sf.relatedModule }}</span>
                <span class="text-xs text-zinc-300">·</span>
                <span class="text-xs text-zinc-400">提及 {{ sf.mentionCount }} 次</span>
              </div>
              <p class="text-sm text-zinc-800 mb-2">{{ sf.summary }}</p>
              <div class="rounded-lg bg-zinc-50 p-2.5">
                <div class="flex items-center gap-1.5 text-[11px] text-zinc-400 mb-1"><User class="h-3 w-3" /> 用户原话</div>
                <p class="text-xs text-zinc-600 italic">"{{ sf.originalMessages[0]?.content }}"<span class="text-zinc-400 not-italic ml-1">— {{ sf.originalMessages[0]?.userName }}</span></p>
              </div>
            </div>
            <div class="flex flex-col items-end gap-2 shrink-0">
              <span class="text-xs text-zinc-400"><Clock class="h-3 w-3 inline" /> {{ fmt(sf.lastSeen) }}</span>
              <span class="rounded-full px-2 py-0.5 text-[10px] font-medium" :class="statusClass(sf.status)">{{ statusLabel(sf.status) }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-if="filteredSoft.length === 0" class="py-20 text-center"><p class="text-sm text-zinc-400">暂无软反馈</p></div>
    </template>

    <!-- Detail modal -->
    <Teleport to="body">
      <div v-if="detailItem" class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4 py-8" @click.self="detailItem = null">
        <div class="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-zinc-200 flex flex-col">
          <div class="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4 shrink-0">
            <div>
              <div class="text-base font-semibold text-zinc-950">反馈详情</div>
              <p class="mt-1 text-xs text-zinc-500">{{ detailItem.userName }} · {{ detailItem.department }} · {{ fmt(detailItem.timestamp) }}</p>
            </div>
            <button type="button" class="rounded-full p-2 text-zinc-500 hover:bg-zinc-100" @click="detailItem = null"><X class="h-4 w-4" /></button>
          </div>
          <div class="overflow-y-auto p-6 space-y-4">
            <div>
              <div class="text-xs font-medium text-zinc-500 mb-2">关联方案</div>
              <div class="rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">{{ detailItem.solutionName }}</div>
            </div>
            <div>
              <div class="text-xs font-medium text-zinc-500 mb-2">反馈类型</div>
              <div class="flex items-center gap-2">
                <span v-if="detailItem.type === 'like'" class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"><ThumbsUp class="h-3 w-3 inline mr-1" />有用</span>
                <span v-else class="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700"><ThumbsDown class="h-3 w-3 inline mr-1" />不合适</span>
                <span v-for="r in detailItem.reasons" :key="r" class="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] text-rose-600">{{ r }}</span>
              </div>
            </div>
            <div v-if="detailItem.comment">
              <div class="text-xs font-medium text-zinc-500 mb-2">文字备注</div>
              <p class="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">{{ detailItem.comment }}</p>
            </div>
            <div>
              <div class="text-xs font-medium text-zinc-500 mb-2">对话上下文</div>
              <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600 leading-relaxed whitespace-pre-wrap">{{ detailItem.conversationPreview }}</div>
            </div>
          </div>
          <div class="flex items-center justify-end gap-2 border-t border-zinc-200 px-6 py-4 shrink-0">
            <button class="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50" @click="detailItem = null">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
