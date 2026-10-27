<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, Download, FolderSearch, LayoutGrid, List, Pencil, Plus, Trash2, X } from 'lucide-vue-next'
import ExtractionTaskForm from './ExtractionTaskForm.vue'
import MaterialImagePreview from './MaterialImagePreview.vue'
import { MATERIAL_STATUSES, MATERIAL_TYPES, useMaterialTasks, type MaterialInput, type MaterialStatus, type MaterialTask, type MaterialType } from './useMaterialTasks'

const emit = defineEmits<{ back: [] }>()
const route = useRoute()
const router = useRouter()
const { tasks, error, create, remove } = useMaterialTasks()
const isForm = ref(route.query.view === 'config')
const initialName = typeof route.query.name === 'string' ? route.query.name : ''
const editing = ref<MaterialTask | null>(null)
const mode = ref<'list' | 'card'>('list')
const previewTask = ref<MaterialTask | null>(null)
const deleteTask = ref<MaterialTask | null>(null)
const page = ref(1)
const status = ref<'' | MaterialStatus>('')
const notification = ref('')
const menu = ref<{ task: MaterialTask; x: number; y: number } | null>(null)
const menuElement = ref<HTMLElement | null>(null)
const deleteDialog = ref<HTMLElement | null>(null)
const today = dateString(new Date())

function dateString(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}
function defaultRange() {
  const start = new Date()
  start.setMonth(start.getMonth() - 1)
  return { start: dateString(start), end: today }
}
const filters = reactive({ type: '' as '' | MaterialType, name: '', ...defaultRange() })
const appliedFilters = reactive({ ...filters })
const filteredTasks = computed(() => tasks.value.filter((task) => {
  const day = dateString(new Date(task.createdAt))
  return (!appliedFilters.type || task.materialType === appliedFilters.type) &&
    (!appliedFilters.name || task.materialName.toLocaleLowerCase().includes(appliedFilters.name.toLocaleLowerCase())) &&
    (!status.value || task.status === status.value) &&
    (!appliedFilters.start || day >= appliedFilters.start) && (!appliedFilters.end || day <= appliedFilters.end)
}))
const pages = computed(() => Math.max(1, Math.ceil(filteredTasks.value.length / 10)))
const visibleTasks = computed(() => filteredTasks.value.slice((Math.min(page.value, pages.value) - 1) * 10, Math.min(page.value, pages.value) * 10))

function query() {
  if (filters.start && filters.end && filters.start > filters.end) { notification.value = '开始日期须早于或等于结束日期'; return }
  Object.assign(appliedFilters, { ...filters, name: filters.name.trim() })
  page.value = 1
  notification.value = ''
}
function reset() {
  Object.assign(filters, { type: '', name: '', ...defaultRange() })
  status.value = ''
  query()
}
function square() { emit('back'); void router.push('/video-gen/capability-square') }
function newTask() { editing.value = null; isForm.value = true }
function cancelForm() { isForm.value = false; editing.value = null; if (route.query.view) void router.replace({ path: route.path }) }
function submit(input: MaterialInput) {
  if (create(input)) { cancelForm(); reset(); notification.value = '已创建原型演示任务' }
}
function edit(task: MaterialTask) { editing.value = task; menu.value = null; isForm.value = true }
function label(type: MaterialType) { return MATERIAL_TYPES.find((item) => item.value === type)?.label ?? type }
function statusLabel(value: MaterialStatus) { return MATERIAL_STATUSES.find((item) => item.value === value)?.label ?? value }
function formattedDate(value: string) { return `${dateString(new Date(value))} ${new Date(value).toLocaleTimeString('zh-CN', { hour12: false })}` }
function download(task: MaterialTask) {
  if (!task.resultImage || task.status !== 'completed') return
  const anchor = document.createElement('a')
  anchor.href = task.resultImage
  anchor.download = `${task.materialName}-原型演示.${task.resultImage.startsWith('data:image/svg') ? 'svg' : 'png'}`
  anchor.click()
  menu.value = null
}
function openMenu(event: MouseEvent, task: MaterialTask) {
  menu.value = { task, x: Math.max(8, Math.min(event.clientX, window.innerWidth - 170)), y: Math.max(8, Math.min(event.clientY, window.innerHeight - 145)) }
  void nextTick(() => menuElement.value?.querySelector<HTMLButtonElement>('button')?.focus())
}
async function copyLink() {
  if (!menu.value?.task.resultImage) return
  try { await navigator.clipboard.writeText(menu.value.task.resultImage); notification.value = '图片链接已复制' }
  catch { notification.value = '当前浏览器无法复制链接，可下载图片' }
  menu.value = null
}
async function copyImage() {
  const image = menu.value?.task.resultImage
  if (!image) return
  try {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) throw new Error('unsupported')
    const source = new Image()
    source.src = image
    await source.decode()
    const canvas = document.createElement('canvas')
    canvas.width = source.naturalWidth; canvas.height = source.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('unsupported')
    context.drawImage(source, 0, 0)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('unsupported')), 'image/png'))
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    notification.value = '图片已复制'
  } catch { notification.value = '当前浏览器无法复制图片，可下载图片' }
  menu.value = null
}
async function askDelete(task: MaterialTask) {
  menu.value = null
  deleteTask.value = task
  await nextTick()
  deleteDialog.value?.querySelector<HTMLButtonElement>('button')?.focus()
}
function confirmDelete() {
  if (!deleteTask.value) return
  remove(deleteTask.value.id)
  deleteTask.value = null
  page.value = Math.min(page.value, pages.value)
  notification.value = '删除成功'
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { menu.value = null; deleteTask.value = null }
  if (event.key === 'Tab' && deleteTask.value && deleteDialog.value) {
    const buttons = deleteDialog.value.querySelectorAll<HTMLButtonElement>('button')
    const first = buttons[0]; const last = buttons[buttons.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }
}
function outsideMenu(event: PointerEvent) { if (menu.value && !menuElement.value?.contains(event.target as Node)) menu.value = null }
onMounted(() => { window.addEventListener('keydown', keydown); window.addEventListener('pointerdown', outsideMenu) })
onBeforeUnmount(() => { window.removeEventListener('keydown', keydown); window.removeEventListener('pointerdown', outsideMenu) })
</script>

<template>
  <section class="image-materials">
    <ExtractionTaskForm v-if="isForm" :key="editing?.id ?? 'new'" :task="editing" :initial-name="initialName" @submit="submit" @cancel="cancelForm" @square="square" />
    <div v-else class="materials-list">
      <nav class="breadcrumb" aria-label="面包屑"><button type="button" @click="square">能力广场</button><ChevronRight :size="12" /><span>素材提取列表</span><button type="button" class="dark new-task" data-testid="new-extraction" @click="newTask"><Plus :size="16" />新增提取任务</button></nav>
      <form class="filters" @submit.prevent="query">
        <label class="filter-field"><span>素材类型</span><select v-model="filters.type" aria-label="素材类型"><option value="">选择素材类型</option><option v-for="type in MATERIAL_TYPES" :key="type.value" :value="type.value">{{ type.label }}</option></select></label>
        <label class="filter-field"><span>素材名称</span><input v-model="filters.name" placeholder="请输入素材名称" aria-label="素材名称" autocomplete="off" /></label>
        <div class="filter-field"><span>创建时间</span><div class="date-range"><input v-model="filters.start" type="date" aria-label="创建开始日期" :max="filters.end || today" /><span>→</span><input v-model="filters.end" type="date" aria-label="创建结束日期" :min="filters.start || undefined" :max="today" /><button v-if="filters.start || filters.end" type="button" aria-label="清空创建时间" @click="filters.start = ''; filters.end = ''"><X :size="12" /></button></div></div>
        <div class="filter-actions"><button type="button" data-testid="reset-materials" @click="reset">重置</button><button type="submit" class="dark" data-testid="query-materials">查询</button></div>
      </form>
      <div class="list-toolbar"><div class="status-tabs" role="tablist" aria-label="提取状态"><button v-for="item in MATERIAL_STATUSES" :key="item.value" type="button" role="tab" :data-status="item.value" :aria-selected="status === item.value" :class="{ active: status === item.value }" @click="status = item.value; page = 1">{{ item.label }}</button></div><div v-if="tasks.length" class="view-switch"><button type="button" aria-label="列表视图" :aria-pressed="mode === 'list'" @click="mode = 'list'"><List :size="16" /></button><button type="button" aria-label="卡片视图" :aria-pressed="mode === 'card'" @click="mode = 'card'"><LayoutGrid :size="15" /></button></div></div>
      <div class="results-area" :class="{ 'card-mode': mode === 'card' && visibleTasks.length }">
        <table v-if="mode === 'list' || !visibleTasks.length" class="materials-table"><colgroup><col class="type-col" /><col class="name-col" /><col class="status-col" /><col class="date-col" /><col /><col class="actions-col" /></colgroup><thead><tr><th>素材类型</th><th>素材名称</th><th>状态</th><th>创建时间</th><th>提取结果</th><th>操作</th></tr></thead><tbody><tr v-for="task in visibleTasks" :key="task.id" data-testid="material-row"><td>{{ label(task.materialType) }}</td><td><span class="material-name" :title="task.materialName">{{ task.materialName }}</span><small class="demo-tag">原型演示</small></td><td><span class="status-pill" :class="task.status">{{ statusLabel(task.status) }}</span></td><td class="created-time">{{ formattedDate(task.createdAt) }}</td><td><button v-if="task.resultImage" type="button" class="result-thumb" aria-label="预览提取结果" @click="previewTask = task" @contextmenu.prevent="openMenu($event, task)"><img :src="task.resultImage" :alt="`${task.materialName} 提取结果`" loading="lazy" /></button><span v-else>—</span></td><td><div class="row-actions"><button type="button" @click="edit(task)"><Pencil :size="14" />重新编辑</button><button type="button" :disabled="task.status !== 'completed' || !task.resultImage" :title="task.status !== 'completed' ? '仅已完成的提取结果可下载' : undefined" @click="download(task)"><Download :size="14" />下载</button><button type="button" class="danger" data-testid="delete-material" :disabled="task.status === 'processing'" @click="askDelete(task)"><Trash2 :size="14" />删除</button></div></td></tr></tbody></table>
        <div v-else class="material-cards"><article v-for="task in visibleTasks" :key="task.id" class="material-card" data-testid="material-row"><button v-if="task.resultImage" type="button" class="card-image" aria-label="预览提取结果" @click="previewTask = task" @contextmenu.prevent="openMenu($event, task)"><img :src="task.resultImage" :alt="task.materialName" /></button><div v-else class="card-placeholder"><FolderSearch :size="34" :stroke-width="1" /><span>{{ statusLabel(task.status) }}</span></div><div class="card-body"><div><strong :title="task.materialName">{{ task.materialName }}</strong><span class="status-pill" :class="task.status">{{ statusLabel(task.status) }}</span></div><p>{{ label(task.materialType) }} <span class="demo-tag">原型演示</span></p><time>{{ formattedDate(task.createdAt) }}</time><div class="row-actions"><button type="button" @click="edit(task)">重新编辑</button><button type="button" :disabled="!task.resultImage" @click="download(task)">下载</button><button type="button" class="danger" data-testid="delete-material" :disabled="task.status === 'processing'" @click="askDelete(task)">删除</button></div></div></article></div>
        <div v-if="!visibleTasks.length" class="empty-state"><FolderSearch :size="50" :stroke-width=".8" /><span>{{ tasks.length ? '暂无符合条件的素材提取任务' : '暂无素材提取任务' }}</span></div>
      </div>
      <footer class="list-footer"><span>共 {{ filteredTasks.length }} 项，{{ Math.min(page, pages) }}/{{ pages }}</span><div v-if="pages > 1" class="pagination"><button type="button" aria-label="上一页" :disabled="page <= 1" @click="page--"><ChevronLeft :size="14" /></button><span>{{ page }}</span><button type="button" aria-label="下一页" :disabled="page >= pages" @click="page++"><ChevronRight :size="14" /></button></div></footer>
    </div>
    <div v-if="notification || error" class="notice-toast" role="status"><span>{{ error || notification }}</span><button type="button" aria-label="关闭提示" @click="notification = ''; error = ''"><X :size="14" /></button></div>
    <div v-if="menu" ref="menuElement" class="image-context" role="menu" aria-label="图片操作" :style="{ left: `${menu.x}px`, top: `${menu.y}px` }"><button type="button" role="menuitem" @click="copyImage">复制图片</button><button type="button" role="menuitem" @click="copyLink">复制链接</button><button type="button" role="menuitem" @click="download(menu.task)">下载图片</button></div>
    <MaterialImagePreview v-if="previewTask" :task="previewTask" @close="previewTask = null" />
    <div v-if="deleteTask" class="modal-backdrop" @click.self="deleteTask = null"><div ref="deleteDialog" class="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="material-delete-title"><h2 id="material-delete-title">确认删除</h2><p>确定要删除素材「{{ deleteTask.materialName }}」的提取任务吗？</p><div><button type="button" @click="deleteTask = null">取消</button><button type="button" class="delete-confirm" data-testid="confirm-delete-material" @click="confirmDelete">删除</button></div></div></div>
  </section>
</template>

<style scoped>
.image-materials{height:100%;min-height:0;min-width:0;position:relative;font-family:inherit;font-size:14px;color:#111;background:#fff;border-radius:14px}
.materials-list{height:100%;display:flex;flex-direction:column;padding:16px 32px 20px;box-sizing:border-box;min-height:0}
.breadcrumb{display:flex;align-items:center;gap:4px;min-height:32px;margin-bottom:24px;color:#999}.breadcrumb>button:first-child{padding:0;border:0;background:none;color:#999;font:inherit;cursor:pointer}.breadcrumb>span{font-weight:500;color:#111}
.dark{height:32px;border:0!important;border-radius:6px;padding:5px 14px;background:#111!important;color:white!important;font:inherit;cursor:pointer}.new-task{display:flex;align-items:center;gap:6px;margin-left:auto}
.filters{display:flex;align-items:flex-end;flex-wrap:wrap;gap:12px;margin-bottom:12px}.filter-field{display:flex;flex-direction:column;gap:8px}.filter-field>span{line-height:22px}.filter-field>input,.filter-field>select{width:216px;height:32px;padding:5px 12px;border:1px solid #dce0e5;border-radius:6px;font:inherit;background:#fff;color:#111;outline:none;box-sizing:border-box}.filter-field>select:has(option[value='']:checked){color:#b2b2b2}.filter-field>input::placeholder{color:#b2b2b2}.filter-field>input:focus,.filter-field>select:focus,.date-range:focus-within{border-color:#111}
.date-range{height:32px;padding:0 8px;display:flex;align-items:center;gap:3px;border:1px solid #dce0e5;border-radius:6px;box-sizing:border-box}.date-range input{width:115px;min-width:0;padding:0;border:0;background:none;font:inherit;font-size:12px;color:#111;outline:none}.date-range input::-webkit-calendar-picker-indicator{width:10px;margin-left:-5px;opacity:.45}.date-range>span{font-size:12px;color:#666}.date-range button{padding:0;border:0;border-radius:50%;display:flex;background:#999;color:white;cursor:pointer}.filter-actions{display:flex;gap:12px}.filter-actions>button{height:32px;min-width:54px;padding:5px 12px;border:1px solid #dce0e5;border-radius:6px;background:#fff;font:inherit;cursor:pointer}
.list-toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;min-height:28px}.status-tabs{display:flex;align-items:center;gap:8px}.status-tabs>button{height:28px;padding:3px 12px;border:0;border-radius:6px;background:none;color:#666;font:inherit;cursor:pointer}.status-tabs>button.active{background:#f5f5f5;color:#111;font-weight:500}.view-switch{display:flex;gap:4px}.view-switch button{display:flex;padding:5px;border:0;border-radius:5px;background:none;color:#999;cursor:pointer}.view-switch button[aria-pressed=true]{color:#111;background:#f5f5f5}
.results-area{flex:1;min-height:260px;overflow:auto;border:1px solid #eaeaea;border-radius:8px;position:relative}.materials-table{width:100%;border-spacing:0;table-layout:fixed;text-align:left}.type-col{width:9%}.name-col{width:18%}.status-col{width:9%}.date-col{width:15%}.actions-col{width:246px}.materials-table th{height:38px;padding:0 16px;background:#f7f7f9;border-bottom:1px solid #eaeaea;color:#666;font-weight:400;font-size:13px;white-space:nowrap}.materials-table td{height:76px;padding:10px 16px;border-bottom:1px solid #f0f0f0;color:#666;vertical-align:middle;font-size:13px}.material-name{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:500;color:#111}.demo-tag{display:inline-block;margin-top:3px;color:#999;font-size:11px;font-weight:400}
.status-pill{display:inline-flex;align-items:center;padding:2px 7px;border-radius:4px;font-size:12px;white-space:nowrap}.status-pill.processing{color:#4276ba;background:#edf4fc}.status-pill.completed{color:#27966c;background:#edf8f2}.status-pill.failed{color:#d35656;background:#fff0f0}.created-time{font-size:12px!important;white-space:nowrap;font-variant-numeric:tabular-nums}.result-thumb{display:flex;width:44px;height:44px;padding:0;border:1px solid #dce0e5;border-radius:4px;overflow:hidden;background:#f6f6f6;cursor:pointer}.result-thumb img{width:100%;height:100%;object-fit:cover}
.row-actions{display:flex;align-items:center;gap:14px;white-space:nowrap}.row-actions button{display:flex;align-items:center;gap:4px;padding:0;border:0;background:none;color:#111;font:inherit;font-size:12px;cursor:pointer}.row-actions button:hover{color:#0066ff}.row-actions button.danger{color:#e45454}.row-actions button:disabled{color:#b7b7b7;cursor:not-allowed}.empty-state{position:absolute;left:0;right:0;top:38px;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;color:#999;font-size:13px;pointer-events:none}.empty-state svg{color:#111}.list-footer{display:flex;align-items:center;justify-content:space-between;padding-top:16px;min-height:22px;color:#999;font-size:13px}.pagination{display:flex;align-items:center;gap:10px}.pagination button{border:1px solid #eaeaea;border-radius:4px;display:flex;padding:4px;background:#fff;cursor:pointer;color:#666}.pagination button:disabled{opacity:.35;cursor:not-allowed}
.card-mode{border:0}.material-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:18px;padding-bottom:20px}.material-card{border:1px solid #eaeaea;border-radius:8px;overflow:hidden;align-self:start}.card-image{display:block;padding:0;width:100%;height:180px;border:0;background:#f5f5f5;cursor:pointer}.card-image img{width:100%;height:100%;object-fit:contain}.card-placeholder{height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#999;background:#fafafa}.card-body{padding:12px}.card-body>div:first-child{display:flex;justify-content:space-between;gap:6px}.card-body strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:500}.card-body p{margin:5px 0;font-size:12px;color:#666}.card-body p .demo-tag{margin-left:8px}.card-body time{font-size:11px;color:#999}.card-body .row-actions{border-top:1px solid #f0f0f0;margin-top:10px;padding-top:10px}
.notice-toast{position:absolute;left:50%;top:15px;transform:translateX(-50%);display:flex;align-items:center;gap:12px;max-width:80%;padding:10px 14px;border:1px solid #eaeaea;border-radius:7px;box-shadow:0 5px 20px #0000000c;background:#fff;color:#666;font-size:12px;z-index:50}.notice-toast button{display:flex;padding:0;border:0;background:none;color:#999;cursor:pointer}.image-context{position:fixed;z-index:1200;min-width:156px;padding:4px 0;border:1px solid #eaeaea;border-radius:8px;box-shadow:0 6px 24px #00000014;background:white}.image-context button{display:block;width:100%;padding:8px 12px;border:0;background:none;font:inherit;text-align:left;cursor:pointer}.image-context button:hover{background:#f6f6f6}
.modal-backdrop{position:fixed;inset:0;z-index:1300;background:#0005;display:flex;align-items:center;justify-content:center}.delete-dialog{width:400px;max-width:calc(100% - 32px);padding:24px;border-radius:12px;background:white;box-shadow:0 20px 60px #0002}.delete-dialog h2{margin:0 0 16px;font-size:17px;font-weight:600}.delete-dialog p{margin:0 0 24px;font-size:14px;color:#666;line-height:1.6;overflow-wrap:anywhere}.delete-dialog>div{display:flex;justify-content:flex-end;gap:12px}.delete-dialog button{padding:6px 18px;border:1px solid #dce0e5;border-radius:6px;background:#fff;font:inherit;cursor:pointer}.delete-dialog button.delete-confirm{background:#e45454;border-color:#e45454;color:white}
@media(max-width:1200px){.materials-list{padding:16px 24px 20px}.materials-table{min-width:990px}.filters{gap:10px}.filter-field>input,.filter-field>select{width:185px}}
@media(max-width:680px){.materials-list{padding:16px}.breadcrumb{font-size:12px;gap:3px;margin-bottom:20px}.new-task{font-size:12px;gap:3px;padding:5px 9px}.filter-field{flex:1;min-width:135px}.filter-field>input,.filter-field>select{width:100%}.filters{gap:12px}.date-range{width:100%;justify-content:space-between}.date-range input{width:105px}.filter-actions{margin-left:auto}.status-tabs{gap:1px}.status-tabs>button{padding:3px 9px;font-size:13px}.results-area{min-height:300px}.material-cards{grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}}
</style>
