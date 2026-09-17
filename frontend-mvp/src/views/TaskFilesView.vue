<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SourceChatSidebar from '@/components/chat/source-clone/SourceChatSidebar.vue'
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Folder,
  PanelLeftOpen,
  Search,
  X,
} from 'lucide-vue-next'

type FileKind = 'HTML' | 'XLSX' | 'PPTX' | 'PDF'

interface TaskFile {
  id: string
  name: string
  size: string
  generatedAt: string
  kind: FileKind
}

interface TaskGroup {
  id: string
  name: string
  size: string
  generatedAt: string
  files: TaskFile[]
}

const groups: TaskGroup[] = [
  {
    id: 'top-products',
    name: '分析下耶运动旗舰店的TOP款现状',
    size: '335.6 KB',
    generatedAt: '2026-08-26 11:13:46',
    files: [
      { id: 'top-xlsx', name: '天猫耶运动旗舰店_重点货号_20260819-20260825.xlsx', size: '42.0 KB', generatedAt: '2026-08-26 11:13:46', kind: 'XLSX' },
      { id: 'top-html', name: '天猫耶运动旗舰店_重点货号_20260819-20260825.html', size: '293.6 KB', generatedAt: '2026-08-26 11:13:46', kind: 'HTML' },
    ],
  },
  {
    id: 'profit',
    name: '看下这个店铺的利润情况，进行分析，并给出整改建议',
    size: '762.0 KB',
    generatedAt: '2026-08-25 18:22:08',
    files: [
      { id: 'profit-xlsx', name: '店铺利润情况分析_20260825.xlsx', size: '186.4 KB', generatedAt: '2026-08-25 18:22:08', kind: 'XLSX' },
      { id: 'profit-pdf', name: '店铺利润诊断报告_20260825.pdf', size: '575.6 KB', generatedAt: '2026-08-25 18:22:08', kind: 'PDF' },
    ],
  },
  {
    id: 'kb-price',
    name: '查一下KB2466全网的价格',
    size: '36.6 KB',
    generatedAt: '2026-08-25 14:32:47',
    files: [
      { id: 'kb-price-html', name: 'KB2466全网价格对比_20260825.html', size: '36.6 KB', generatedAt: '2026-08-25 14:32:47', kind: 'HTML' },
    ],
  },
]

const router = useRouter()
const query = ref('')
const railOpen = ref(true)
const sessionSearchOpen = ref(false)
const expanded = ref(new Set<string>())
const preview = ref<TaskFile | null>(null)

const filteredGroups = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return groups
  return groups.filter((group) =>
    group.name.toLowerCase().includes(needle)
    || group.files.some((file) => file.name.toLowerCase().includes(needle)),
  )
})

function toggle(group: TaskGroup) {
  const next = new Set(expanded.value)
  if (next.has(group.id)) next.delete(group.id)
  else next.add(group.id)
  expanded.value = next
}

function openPreview(file: TaskFile) {
  preview.value = file
}

function fileHref(file: TaskFile) {
  const content = file.kind === 'HTML'
    ? '<!doctype html><meta charset="utf-8"><title>TOP款经营分析</title><h1>TOP款经营分析</h1><p>本地原型预览文件</p>'
    : `${file.name}\n本地原型预览文件`
  return `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`
}

function fileIcon(kind: FileKind) {
  if (kind === 'XLSX') return FileSpreadsheet
  if (kind === 'HTML') return FileCode2
  return FileText
}
</script>

<template>
  <div class="task-files-page">
    <SourceChatSidebar v-if="railOpen" @collapse="railOpen = false" @search="sessionSearchOpen = true" @new-chat="router.push('/chat')" @open-session="(id) => router.push(`/chat/${id}`)" @open-files="() => undefined" />
    <button v-else class="open-files-rail" type="button" aria-label="展开侧边栏" title="展开侧边栏" @click="railOpen = true"><PanelLeftOpen :size="18" /></button>

    <main class="files-main" :class="{ 'files-main--preview': preview }">
      <div class="files-content">
        <header class="page-heading">
          <h1>任务文件</h1>
          <p>本页面展示所有任务中系统产生的文件，已按任务分组，如需纳入个人知识库可操作保存</p>
        </header>

        <label class="file-search">
          <Search :size="17" />
          <input v-model="query" type="search" placeholder="搜索文件夹/文件名..." aria-label="搜索文件夹/文件名" />
        </label>

        <div class="file-table" role="table" aria-label="任务文件列表">
          <div class="table-head" role="row">
            <span role="columnheader">任务/文件</span>
            <span role="columnheader">文件大小</span>
            <span role="columnheader">生成时间</span>
            <span role="columnheader">操作</span>
          </div>

          <template v-for="(group, index) in filteredGroups" :key="group.id">
            <button
              class="table-row group-row"
              type="button"
              role="row"
              :data-testid="`task-group-${groups.indexOf(group)}`"
              :aria-expanded="expanded.has(group.id)"
              @click="toggle(group)"
            >
              <span class="name-cell" role="cell">
                <ChevronDown v-if="expanded.has(group.id)" :size="15" />
                <ChevronRight v-else :size="15" />
                <Folder :size="17" fill="#36c4df" color="#36c4df" />
                <span class="ellipsis">{{ group.name }}</span>
              </span>
              <span role="cell">{{ group.size }}</span>
              <span role="cell">{{ group.generatedAt }}</span>
              <span class="operation-cell" role="cell"></span>
            </button>

            <div v-if="expanded.has(group.id)" class="child-rows">
              <button
                v-for="file in group.files"
                :key="file.id"
                class="table-row child-row"
                type="button"
                role="row"
                :data-testid="file.id === 'top-html' ? 'task-file-html' : undefined"
                @click="openPreview(file)"
              >
                <span class="name-cell child-name" role="cell">
                  <component :is="fileIcon(file.kind)" :size="16" :class="`file-kind file-kind--${file.kind.toLowerCase()}`" />
                  <span class="ellipsis">{{ file.name }}</span>
                </span>
                <span role="cell">{{ file.size }}</span>
                <span role="cell">{{ file.generatedAt }}</span>
                <span class="operation-cell" role="cell">
                  <a :href="fileHref(file)" :download="file.name" aria-label="下载文件" title="下载" @click.stop><Download :size="16" /></a>
                </span>
              </button>
            </div>
          </template>

          <p v-if="!filteredGroups.length" class="no-results">未找到相关任务文件</p>
        </div>
      </div>

      <aside v-if="preview" data-testid="file-preview-drawer" class="preview-drawer">
        <header class="preview-header">
          <component :is="fileIcon(preview.kind)" :size="20" />
          <div>
            <strong :title="preview.name">{{ preview.name }}</strong>
            <span>{{ preview.kind }}</span>
          </div>
          <a :href="fileHref(preview)" :download="preview.name" aria-label="下载预览文件" title="下载"><Download :size="17" /></a>
          <button type="button" aria-label="关闭文件预览" title="关闭" @click="preview = null"><X :size="18" /></button>
        </header>

        <div data-testid="file-preview-content" class="preview-content">
          <template v-if="preview.kind === 'HTML'">
            <article class="report-preview">
              <div class="report-banner">
                <small>TMALL STORE PERFORMANCE</small>
                <h2>TOP款经营分析</h2>
                <p>天猫耶运动旗舰店 · 2026.08.19—2026.08.25</p>
              </div>
              <div class="report-summary">
                <div><small>重点货号</small><strong>12</strong></div>
                <div><small>销售件数</small><strong>2,846</strong></div>
                <div><small>销售金额</small><strong>¥ 186.4万</strong></div>
              </div>
              <section>
                <h3>TOP款表现概览</h3>
                <table>
                  <thead><tr><th>商品</th><th>销量</th><th>销售额</th><th>趋势</th></tr></thead>
                  <tbody>
                    <tr><td>轻量跑步鞋 KB2466</td><td>826</td><td>52.8万</td><td class="trend-up">+18.6%</td></tr>
                    <tr><td>夏季透气运动T恤</td><td>641</td><td>31.2万</td><td class="trend-up">+12.3%</td></tr>
                    <tr><td>专业缓震训练鞋</td><td>438</td><td>28.7万</td><td>+4.5%</td></tr>
                  </tbody>
                </table>
              </section>
              <section>
                <h3>经营建议</h3>
                <p>重点补充高转化尺码库存，并围绕核心货号同步优化搜索投放与关联搭配。</p>
              </section>
            </article>
          </template>
          <div v-else class="unsupported-preview">
            <component :is="fileIcon(preview.kind)" :size="48" />
            <strong>{{ preview.name }}</strong>
            <span>{{ preview.kind }} 文件暂不支持在线预览</span>
            <a :href="fileHref(preview)" :download="preview.name">下载文件</a>
          </div>
        </div>
      </aside>
    </main>
    <Teleport to="body"><div v-if="sessionSearchOpen" class="files-search-overlay" @mousedown.self="sessionSearchOpen = false"><section role="dialog" aria-modal="true" aria-label="搜索会话"><header><Search :size="18" /><input autofocus placeholder="搜索会话" /><button type="button" aria-label="关闭搜索" title="关闭" @click="sessionSearchOpen = false"><X :size="18" /></button></header><button type="button" @click="router.push('/chat/daily-auth')">获取下我钉钉上相关信息</button><button type="button" @click="router.push('/chat/expert-capability')">你能做什么</button></section></div></Teleport>
  </div>
</template>

<style scoped>
.task-files-page{display:flex;height:calc(100vh - 56px);min-height:620px;overflow:hidden;background:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#151515}.files-main{display:flex;min-width:0;flex:1}.files-content{min-width:0;flex:1;overflow:auto;padding:26px 24px 60px}.page-heading{display:flex;align-items:baseline;gap:12px}.page-heading h1{margin:0;font-size:17px;font-weight:500}.page-heading p{margin:0;color:#999;font-size:13px}.file-search{display:flex;width:248px;height:32px;margin-top:17px;align-items:center;gap:8px;border:1px solid #ddd;border-radius:7px;padding:0 11px;color:#aaa}.file-search:focus-within{border-color:#888}.file-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;font-size:13px;color:#222}.file-search input::placeholder{color:#bbb}.file-table{margin-top:17px;min-width:560px}.table-head,.table-row{display:grid;grid-template-columns:minmax(220px,1fr) 120px 190px 50px;align-items:center}.table-head{height:38px;border-bottom:1px solid #e7e7e7;padding:0 12px;color:#555;font-size:14px;font-weight:600}.table-row{width:100%;height:48px;border:0;border-bottom:1px solid #e8e8e8;background:#fff;padding:0 12px;color:#555;text-align:left;font:14px/22px inherit;cursor:pointer}.table-row:hover{background:#f8f8f9}.name-cell{display:flex;min-width:0;align-items:center;gap:9px;color:#272727}.name-cell>svg:first-child{min-width:15px}.ellipsis{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.group-row[aria-expanded="true"]{background:#f7f7f9}.child-row{border-bottom:0;background:#fafafa}.child-row:last-child{border-bottom:1px solid #e8e8e8}.child-name{padding-left:28px}.file-kind--xlsx{color:#1fbe62}.file-kind--html{color:#8d98a5}.file-kind--pptx{color:#ed7b44}.file-kind--pdf{color:#df4a4a}.operation-cell{display:flex;justify-content:center}.operation-cell a,.preview-header a{display:grid;width:30px;height:30px;place-items:center;border-radius:6px;color:#999}.operation-cell a:hover,.preview-header a:hover{background:#eee;color:#222}.no-results{padding:60px 0;text-align:center;color:#999;font-size:14px}.preview-drawer{width:376px;min-width:376px;border-left:1px solid #e8e8e8;background:#fff;box-shadow:-2px 0 10px rgba(0,0,0,.025)}.preview-header{display:grid;height:70px;grid-template-columns:20px minmax(0,1fr) 30px 30px;align-items:center;gap:8px;border-bottom:1px solid #eee;padding:0 18px;color:#777}.preview-header>div{min-width:0}.preview-header strong,.preview-header span{display:block}.preview-header strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#222;font-size:14px}.preview-header span{margin-top:3px;color:#aaa;font-size:12px}.preview-content{height:calc(100% - 70px);overflow:auto;background:#f6f7f8;padding:20px}.report-preview{overflow:hidden;border-radius:3px;background:#fff;box-shadow:0 3px 18px rgba(0,0,0,.08);color:#253047}.report-banner{background:linear-gradient(135deg,#112746,#1f5175);padding:28px 24px;color:#fff}.report-banner small{font-size:8px;letter-spacing:1.5px;opacity:.7}.report-banner h2{margin:7px 0 5px;font-size:22px}.report-banner p{margin:0;font-size:10px;opacity:.75}.report-summary{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid #e9edf2;padding:16px 8px}.report-summary div{text-align:center}.report-summary small,.report-summary strong{display:block}.report-summary small{color:#8d96a3;font-size:9px}.report-summary strong{margin-top:5px;font-size:14px}.report-preview section{padding:17px 20px}.report-preview section+section{padding-top:0}.report-preview h3{margin:0 0 10px;font-size:13px}.report-preview table{width:100%;border-collapse:collapse;font-size:9px}.report-preview th,.report-preview td{border-bottom:1px solid #edf0f3;padding:7px 4px;text-align:left}.report-preview th{background:#f6f8fa;color:#7b8492;font-weight:500}.trend-up{color:#16a05d}.report-preview section p{margin:0;color:#6b7581;font-size:10px;line-height:1.7}.unsupported-preview{display:flex;height:100%;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#a0a0a0;text-align:center}.unsupported-preview strong{max-width:260px;color:#444;font-size:13px}.unsupported-preview span{font-size:12px}.unsupported-preview a{border-radius:7px;background:#111;padding:8px 18px;color:#fff;font-size:13px}@media(max-width:900px){.source-chat-sidebar{display:none}.files-content{padding:22px 16px}.page-heading{display:block}.page-heading p{margin-top:6px;line-height:20px}.preview-drawer{position:fixed;inset:56px 0 0 auto;z-index:250;width:min(376px,100vw);min-width:0;box-shadow:-8px 0 26px rgba(0,0,0,.12)}}@media(max-width:640px){.task-files-page{height:calc(100vh - 56px);min-height:0}.files-content{padding:18px 12px}.file-search{width:100%}.file-table{min-width:560px}.table-head,.table-row{grid-template-columns:minmax(220px,1fr) 100px 185px 55px}.preview-drawer{width:100vw}.preview-content{padding:14px}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
.name-cell{padding-right:18px}.files-main--preview .file-table{min-width:0}.files-main--preview .table-head,.files-main--preview .table-row{grid-template-columns:minmax(160px,1fr) 85px}.files-main--preview .table-head>:nth-child(n+3),.files-main--preview .table-row>:nth-child(n+3){display:none}.files-main--preview .files-content{overflow-x:hidden}
.open-files-rail{position:absolute;z-index:20;top:70px;left:16px;display:grid;width:32px;height:32px;place-items:center;border:0;border-radius:8px;background:#fff}.open-files-rail:hover{background:#f5f5f5}.files-search-overlay{position:fixed;z-index:700;inset:0;display:flex;align-items:flex-start;justify-content:center;padding-top:14vh;background:rgba(0,0,0,.28)}.files-search-overlay section{width:min(520px,calc(100vw - 24px));border-radius:12px;background:#fff;padding:14px;box-shadow:0 18px 55px rgba(0,0,0,.2)}.files-search-overlay header{display:flex;height:42px;align-items:center;gap:10px;border-bottom:1px solid #eee}.files-search-overlay input{min-width:0;flex:1;border:0;outline:0}.files-search-overlay header button{display:grid;width:30px;height:30px;place-items:center;border:0;background:transparent}.files-search-overlay section>button{display:block;width:100%;height:42px;border:0;border-radius:7px;background:#fff;padding:0 10px;text-align:left}.files-search-overlay section>button:hover{background:#f6f6f6}
 </style>
